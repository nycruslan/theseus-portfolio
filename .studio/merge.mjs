// `node .studio/merge.mjs <number>`: waits until GitHub says the sprint PR can merge, then
// squash-merges the head it checked. GitHub enforces the rules (the protect-main ruleset requires
// `check`, `gate` and `lens`), so this only waits and asks. It exists because the cloud's proxy
// refuses GraphQL, and with it `gh pr merge` and auto-merge, so it's REST only (github.mjs).
// It polls every 15 s, for up to 8 minutes, until every check on the head has finished and GitHub
// knows the PR's mergeable_state. Then it asks GitHub to squash-merge, with `sha` set so a push in
// between makes GitHub refuse, unless the state already rules a merge out (a conflict, a draft, a
// branch behind its base). "unstable" or "blocked" may come from a check the ruleset doesn't
// require, so GitHub's answer decides those, and its message is the reason given. Either way the
// checks go on air as StudioGateChecked. Run it with the Bash tool's timeout at 10 minutes.

import { setTimeout as sleep } from "node:timers/promises";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";
import { broadcast } from "./post.mjs";

const POLL_MS = Number(process.env.THESEUS_MERGE_POLL_MS || 15_000);
const BUDGET_MS = Number(process.env.THESEUS_MERGE_WAIT_MS || 480_000);
const PASSED = ["success", "neutral", "skipped"];
configure({ timeout: 15_000 });

const number = Number(process.argv[2]);
if (!Number.isInteger(number) || number < 1 || process.argv.length !== 3) {
  console.error(
    "Usage: node .studio/merge.mjs <number>, with the bare PR number.",
  );
  process.exit(2);
}
const cwd = toplevel(process.cwd());
const repo = repoOf(cwd);
const started = Date.now();
let pr;
let head;
let checks = [];
let merged;
let why;
try {
  pr = api(`repos/${repo}/pulls/${number}`, { cwd });
  head = pr.head.sha;
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
  const lens = checks.some(({ who }) => who === "lens")
    ? ""
    : "; lens hasn't run: label the PR `review`";
  why = `GitHub couldn't be read or refused the merge: ${String(error.message).trim()}${lens}`;
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
    items: checks,
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

// Done once the branch moved, or every check finished and GitHub knows if the PR merges cleanly.
function settled() {
  const known = pr.mergeable_state && pr.mergeable_state !== "unknown";
  return (
    pr.head.sha !== head ||
    (known && checks.every(({ state }) => state !== "pending"))
  );
}

// Why asking GitHub to merge is pointless now, or null to ask.
function refusal() {
  if (pr.head.sha !== head)
    return `the branch moved to ${pr.head.sha.slice(0, 7)} while it waited`;
  if (pr.state !== "open")
    return `the PR is ${pr.merged ? "already merged" : pr.state}`;
  if (["dirty", "draft", "behind", "unknown"].includes(pr.mergeable_state)) {
    return `GitHub says "${pr.mergeable_state}" (${line()})`;
  }
  return null;
}

// The latest run of each check on the commit (an older one may be a superseded, cancelled run),
// plus the commit statuses, such as Vercel's preview.
function checksOn(sha) {
  const latest = new Map();
  for (const run of list(
    `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
    { key: "check_runs", cwd },
  )) {
    if (!(latest.get(run.name)?.id > run.id)) latest.set(run.name, run);
  }
  const statuses = list(`repos/${repo}/commits/${sha}/status?per_page=100`, {
    key: "statuses",
    cwd,
  });
  return [
    ...[...latest.values()].map(({ name, status, conclusion }) =>
      item(name, status === "completed" ? conclusion : "pending"),
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
  if (!checks.length) return "no checks have reported yet";
  return checks.map(({ who, state }) => `${who} ${state}`).join(", ");
}
