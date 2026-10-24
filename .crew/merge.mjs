// `node .crew/merge.mjs <number>`: waits until GitHub says the sprint PR can merge, then
// squash-merges the head it checked, with `sha` set so a push in between makes GitHub refuse. It's
// REST only (github.mjs): the cloud's proxy refuses GraphQL, and with it `gh pr merge` and
// auto-merge.
// The ruleset has no bypass, so GitHub itself refuses a PR whose required checks failed or are
// still running, and checks that each came from the app it requires. This refuses failed and
// running checks too, by name, so Atlas gets a reason it can act on. It adds what the ruleset
// can't know: sessions act as the owner, so a PR that gate passed only on the owner's approval is
// left to the owner; and rules that require no check would let a PR merge on nothing, so they're
// a NO-GO.
// It waits for the checks those rules require, so the list can't drift from GitHub's: it polls
// every 15 s, for up to 8 minutes, until each has reported, every check on the head has finished
// and GitHub knows the PR's mergeable_state. A draft, a conflict, a branch behind its base, a
// state GitHub hasn't worked out in time or a check that never reported is a NO-GO without asking;
// anything else is GitHub's to answer, and its message is the reason given. The checks go on air
// as StudioGateChecked, and a merge as StudioPullRequest. Run it with the Bash tool's timeout at
// 10 minutes.

import { setTimeout as sleep } from "node:timers/promises";
import { OWNER_APPROVED } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";
import { announce } from "./post.mjs";

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
    merged = api(`repos/${repo}/pulls/${number}/merge`, {
      method: "PUT",
      body: { merge_method: "squash", sha: head },
      cwd,
    }).sha;
  }
} catch (error) {
  why = `GitHub couldn't be read or refused the merge: ${String(error.message).trim()}`;
}

announce(cwd, "StudioGateChecked", {
  gate: {
    target: "merge",
    pr: number,
    head,
    items: checks.map(({ released, ...check }) => check),
    pass: Boolean(merged),
  },
});
if (merged) {
  console.log(
    `Merged PR #${number} (${head.slice(0, 7)}) as ${merged.slice(0, 7)}: ${pr.html_url}`,
  );
  announce(cwd, "StudioPullRequest", {
    pr: { action: "merged", number, url: pr.html_url, head, merged },
  });
} else {
  console.error(`NO-GO for PR #${number}: ${why}.`);
  process.exitCode = 1;
}

// Done once the branch moved or the PR isn't open, or every required check reported, every check
// finished and GitHub knows if the PR merges cleanly. Rules that require nothing leave nothing to
// wait for, and a closed PR (a wrong number: sprint 30's run passed its sprint's) has nothing to.
function settled() {
  const known = pr.mergeable_state && pr.mergeable_state !== "unknown";
  return (
    !required.length ||
    pr.head.sha !== head ||
    pr.state !== "open" ||
    (known &&
      !unreported().length &&
      checks.every(({ state }) => state !== "pending"))
  );
}

// Why not to ask GitHub to merge now, or null to ask.
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
  // GitHub refuses these itself while the ruleset has no bypass; saying so here gives Atlas a
  // reason it can act on.
  const failed = requiredIn("nogo");
  if (failed.length) {
    return `${failed.join(", ")} didn't pass on ${head.slice(0, 7)}`;
  }
  const running = requiredIn("pending");
  if (running.length) {
    return `${running.join(", ")} still running on ${head.slice(0, 7)}: run node .crew/merge.mjs ${number} again`;
  }
  // A session acts as the owner, so it could have posted the approval gate.mjs released the PR on.
  const released = checks.find((check) => check.released);
  if (released) {
    return `${released.who} passed on the owner's approval, so the owner merges it`;
  }
  if (pr.draft) {
    return `it's still a draft: mark it ready with node .crew/ready-pr.mjs ${number}`;
  }
  if (["dirty", "behind", "unknown"].includes(pr.mergeable_state)) {
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

// The names of the checks the base branch's rules require. Rules that can't be read throw, which
// stops the merge.
function requiredChecks(base) {
  const names = list(`repos/${repo}/rules/branches/${base}?per_page=100`, {
    cwd,
  })
    .filter(({ type }) => type === "required_status_checks")
    .flatMap(({ parameters }) =>
      parameters.required_status_checks.map(({ context }) => context),
    );
  return [...new Set(names)];
}

// The required checks with no run, or status, on the head yet.
function unreported() {
  return required.filter((name) => !checks.some(({ who }) => who === name));
}

// The required checks with a run, or status, on the head in this state.
function requiredIn(state) {
  return required.filter((name) =>
    checks.some((check) => check.who === name && check.state === state),
  );
}

// The latest run of each check from each app on the commit, plus the commit statuses, such as
// Vercel's preview. An older run may be a superseded, cancelled one; another app's run of the same
// name can't hide the checks app's latest gate.
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
      ({ name, status, conclusion, external_id: external }) => ({
        ...item(name, status === "completed" ? conclusion : "pending"),
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
