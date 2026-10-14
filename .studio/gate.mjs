// The `gate` check (.github/workflows/gate.yml). It holds a PR the owner has to decide:
// - it touches an owner path, changes package.json's scripts or weakens a test (scope.mjs);
// - it carries needs-owner now, or ever did.
// The owner releases it with an approving review of the PR's current head; a later push needs a
// new one. The result goes on the head as a check run from the team's checks app, the source the
// ruleset requires, so no other workflow or account can stand in for it.
// The workflow runs this from the default branch (pull_request_target, and workflow_run after the
// review relay), never the PR's code. It reads the PR live rather than from the event, so whatever
// triggered it, the newest run judges the newest state.

import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { api, list, postCheck } from "./github.mjs";
import { checkScope, ownersIn } from "./scope.mjs";

export const HOLD_LABEL = "needs-owner";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Whether the PR passes, with a one-line summary and the holds behind it. */
export function decide({ notes, everHeld, approved }) {
  const holds = everHeld
    ? [...notes, `The PR has carried ${HOLD_LABEL}, so the owner decides it.`]
    : notes;
  let summary = "The PR stays on the team's side.";
  if (holds.length) {
    summary = approved
      ? "The owner approved this head."
      : "This PR needs the owner's approving review of its head.";
  }
  return { pass: !holds.length || approved, summary, notes: holds };
}

/** Whether the owner's latest review that decided anything approves exactly this head. */
export function ownerApproved(reviews, owner, head) {
  const latest = reviews.findLast(
    ({ user, state }) =>
      user?.login?.toLowerCase() === owner.toLowerCase() &&
      !["COMMENTED", "PENDING"].includes(state),
  );
  return latest?.state === "APPROVED" && latest.commit_id === head;
}

/** Whether the owner's latest review approves the PR's head, read from GitHub. */
export function approvedByOwner({ repo, number, owner, head, cwd }) {
  const reviews = list(`repos/${repo}/pulls/${number}/reviews?per_page=100`, {
    cwd,
  });
  return ownerApproved(reviews, owner, head);
}

/** Whether the PR carries needs-owner now or ever did. The sprint pre-flight asks the same. */
export function carriedNeedsOwner({ repo, number, labels, cwd }) {
  if (labels.includes(HOLD_LABEL)) return true;
  return list(`repos/${repo}/issues/${number}/events?per_page=100`, {
    cwd,
  }).some(
    ({ event, label }) => event === "labeled" && label?.name === HOLD_LABEL,
  );
}

// The PR a run is about: the event's own, or, after the review relay, the open one at its head.
function prNumber(event, repo) {
  if (event.pull_request) return event.pull_request.number;
  const run = event.workflow_run;
  if (run?.pull_requests?.length) return run.pull_requests[0].number;
  const pulls = api(`repos/${repo}/commits/${run?.head_sha}/pulls`);
  return pulls.find(({ state }) => state === "open")?.number;
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const repo = event.repository.full_name;
  const number = prNumber(event, repo);
  const pr = number && api(`repos/${repo}/pulls/${number}`);
  if (pr?.state !== "open" || pr.base.ref !== event.repository.default_branch) {
    console.log("No open pull request into the default branch to judge.");
    return;
  }
  const head = pr.head.sha;
  const labels = pr.labels.map(({ name }) => name);
  const owner = event.repository.owner.login;
  const result = decide({
    notes: checkScope({
      repo,
      number,
      base: pr.base.sha,
      head,
      isOwned: ownersIn(ROOT),
    }),
    everHeld: carriedNeedsOwner({ repo, number, labels }),
    approved: approvedByOwner({ repo, number, owner, head }),
  });
  const summary = [
    result.summary,
    ...result.notes.map((note) => `- ${note}`),
  ].join("\n");
  postCheck({
    repo,
    name: "gate",
    head,
    pass: result.pass,
    title: result.summary,
    summary,
  });
  console.log(
    `gate on #${number} at ${head.slice(0, 7)}: ${result.pass ? "pass" : "hold"}\n${summary}`,
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
