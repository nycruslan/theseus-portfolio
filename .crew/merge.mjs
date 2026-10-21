// `node .crew/merge.mjs <number>`: waits until GitHub says the sprint PR can merge, then
// squash-merges the head it checked. It refuses itself when a required check failed: in the cloud
// GitHub calls act as the owner, whose admin bypass would let GitHub merge it anyway. For the same
// reason it leaves a PR that gate passed only on the owner's approval to the owner. It
// exists because the cloud's proxy refuses GraphQL, and with it `gh pr merge` and auto-merge, so
// it's REST only (github.mjs).
// It reads the checks to wait for from the base branch's active rules (protect-main requires
// `check`, `gate` and `lens`, each from a named app), so the list can't drift from GitHub's; rules
// it can't read, or that require no check, are a NO-GO. It polls every 15 s, for up to 8 minutes,
// until each required check has reported, every check on the head has finished, and GitHub knows
// the PR's mergeable_state. Then it asks GitHub to squash-merge, with `sha` set so a push in
// between makes GitHub refuse, unless a required check never reported, is still running or failed,
// or the state already rules a merge out (a conflict, a draft, a branch behind its base).
// "unstable" or "blocked" may come from a check the ruleset doesn't require, so GitHub's answer
// decides those, and its message is the reason given. Either way the checks go on air as StudioGateChecked. Run it with the Bash
// tool's timeout at 10 minutes.

import { setTimeout as sleep } from "node:timers/promises";
import { OWNER_APPROVED } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";
import { broadcast } from "./post.mjs";

const POLL_MS = Number(process.env.THESEUS_MERGE_POLL_MS || 15_000);
const BUDGET_MS = Number(process.env.THESEUS_MERGE_WAIT_MS || 480_000);
const PASSED = ["success", "neutral", "skipped"];
configure({ timeout: 15_000 });

const number = Number(process.argv[2]);
if (!Number.isInteger(number) || number < 1 || process.argv.length !== 3) {
  console.error(
    "Usage: node .crew/merge.mjs <number>, with the bare PR number.",
  );
  process.exit(2);
}
const cwd = toplevel(process.cwd());
const repo = repoOf(cwd);
const started = Date.now();
let pr;
let head;
let required = [];
let checks = [];
let merged;
let why;
try {
  pr = api(`repos/${repo}/pulls/${number}`, { cwd });
  head = pr.head.sha;
  required = requiredChecks(pr.base.ref);
  checks = checksOn(head);
  while (!settled() && Date.now() - started + POLL_MS < BUDGET_MS) {
    console.log(`Waiting on PR #${number} at ${head.slice(0, 7)}: ${line()}.`);
    await sleep(POLL_MS);
    pr = api(`repos/${repo}/pulls/${number}`, { cwd });
    checks = checksOn(head);
  }
  why = refusal();
  if (!why) {
    const body = { merge_method: "squash", sha: head };
    merged = api(`repos/${repo}/pulls/${number}/merge`, {
      method: "PUT",
      body,
      cwd,
    }).sha;
  }
} catch (error) {
  why = `GitHub couldn't be read or refused the merge: ${String(error.message).trim()}`;
}

const session = process.env.CLAUDE_CODE_SESSION_ID;
broadcast({
  ...(session && { session_id: session }),
  cwd,
  hook_event_name: "StudioGateChecked",
  gate: {
    target: "merge",
    pr: number,
    head,
    items: checks.map(({ app, released, ...check }) => check),
    pass: Boolean(merged),
  },
});
if (merged) {
  console.log(
    `Merged PR #${number} (${head.slice(0, 7)}) as ${merged.slice(0, 7)}: ${pr.html_url}`,
  );
} else {
  console.error(`NO-GO for PR #${number}: ${why}.`);
  process.exitCode = 1;
}

// Done once the branch moved, or every required check reported, every check finished and GitHub
// knows if the PR merges cleanly. Rules that require nothing leave nothing to wait for.
function settled() {
  const known = pr.mergeable_state && pr.mergeable_state !== "unknown";
  return (
    !required.length ||
    pr.head.sha !== head ||
    (known &&
      !unreported().length &&
      checks.every(({ state }) => state !== "pending"))
  );
}

// Why asking GitHub to merge is pointless now, or null to ask.
function refusal() {
  // Rules that require no check would let this merge on nothing.
  if (!required.length) return `the ${pr.base.ref} rules require no checks`;
  if (pr.head.sha !== head)
    return `the branch moved to ${pr.head.sha.slice(0, 7)} while it waited`;
  if (pr.state !== "open")
    return `the PR is ${pr.merged ? "already merged" : pr.state}`;
  const missing = unreported();
  if (missing.length) {
    return `${missing.join(", ")} never reported on ${head.slice(0, 7)}${lensHint(missing)}`;
  }
  const failed = requiredWhere(({ state }) => state === "nogo");
  if (failed.length) {
    return `${failed.join(", ")} didn't pass on ${head.slice(0, 7)}`;
  }
  // Out of time with a required check still running: the owner's bypass would merge without it.
  const running = requiredWhere(({ state }) => state === "pending");
  if (running.length) {
    return `${running.join(", ")} still running on ${head.slice(0, 7)}: run node .crew/merge.mjs ${number} again`;
  }
  // A session acts as the owner, so it could have posted the approval gate.mjs released a check
  // on: the owner merges such a PR.
  const owners = requiredWhere(({ released }) => released);
  if (owners.length) {
    return `${owners.join(", ")} passed on the owner's approval, so the owner merges it`;
  }
  if (pr.draft) {
    return `it's still a draft: mark it ready with node .crew/ready-pr.mjs ${number}`;
  }
  if (["dirty", "draft", "behind", "unknown"].includes(pr.mergeable_state)) {
    return `GitHub says "${pr.mergeable_state}" (${line()})`;
  }
  return null;
}

// Lens reviews only a PR labelled `review`, so without the label it never will.
function lensHint(missing) {
  if (!missing.includes("lens")) return "";
  const labelled = pr.labels?.some(({ name }) => name === "review");
  return labelled ? "; Lens hasn't finished yet" : "; label the PR `review`";
}

// The checks the base branch's rules require: each a context, and the app it must come from
// (integration_id) when the rules name one. Rules that can't be read throw, which stops the merge.
function requiredChecks(base) {
  return list(`repos/${repo}/rules/branches/${base}?per_page=100`, { cwd })
    .filter(({ type }) => type === "required_status_checks")
    .flatMap(({ parameters }) => parameters.required_status_checks);
}

// Whether a check on the head is the run, or status, a required check names: its context, from
// the app the rules name. A commit status doesn't say which app posted it, so it counts only for a
// rule that names none; otherwise anyone who can post a status could stand in for an app's check.
function answers({ context, integration_id: app }, check) {
  return check.who === context && (!app || check.app === app);
}

// The names of the required checks with no run from the right app, or status, on the head yet.
function unreported() {
  const missing = required.filter(
    (rule) => !checks.some((check) => answers(rule, check)),
  );
  return [...new Set(missing.map(({ context }) => context))];
}

// The names of the required checks whose run, or status, on the head is in the state `is` tests.
function requiredWhere(is) {
  const found = required.filter((rule) =>
    checks.some((check) => answers(rule, check) && is(check)),
  );
  return [...new Set(found.map(({ context }) => context))];
}

// The latest run of each check from each app on the commit (an older one may be a superseded,
// cancelled run), plus the commit statuses, such as Vercel's preview.
function checksOn(sha) {
  const latest = new Map();
  for (const run of list(
    `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
    { key: "check_runs", cwd },
  )) {
    const key = `${run.name} ${run.app?.id}`;
    if (!(latest.get(key)?.id > run.id)) latest.set(key, run);
  }
  const statuses = list(`repos/${repo}/commits/${sha}/status?per_page=100`, {
    key: "statuses",
    cwd,
  });
  return [
    ...[...latest.values()].map(
      ({ name, status, conclusion, app, external_id: external }) => ({
        ...item(name, status === "completed" ? conclusion : "pending"),
        app: app?.id,
        released: external === OWNER_APPROVED,
      }),
    ),
    ...statuses.map(({ context, state }) => item(context, state)),
  ];
}

function item(who, result) {
  if (result === "pending") return { who, kind: "check", state: "pending" };
  if (PASSED.includes(result)) return { who, kind: "check", state: "go" };
  return { who, kind: "check", state: "nogo", note: `${who}: ${result}` };
}

function line() {
  return [
    ...checks.map(({ who, state }) => `${who} ${state}`),
    ...unreported().map((name) => `${name} not reported`),
  ].join(", ");
}
