// The `gate` check (.github/workflows/gate.yml), which the protect-main ruleset requires. It fails a
// PR that the owner has to decide:
// - it touches an owner path, changes package.json's scripts or weakens a test (scope.mjs);
// - it carries needs-owner now, or ever did. The team acts as the owner's GitHub identity, so a
//   removed label looks the same whoever removed it.
// The owner releases a PR by adding owner-approved. GitHub can't tell who added a label either, so
// that part rests on the team keeping the rule (and a permission deny rule on the literal).
// The workflow runs this file from the default branch on pull_request_target, so a PR can't change
// the rule that judges it. Labels and their history are read live rather than from the event, so
// the newest run judges the newest state, and a cancelled or superseded run beside it can't leave a
// stale answer.

import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { api, list } from "./github.mjs";
import { APPROVAL_LABEL, checkScope } from "./scope.mjs";

export const HOLD_LABEL = "needs-owner";

/** Whether the PR passes, with a one-line summary and the notes behind it. */
export function decide({ notes, labels, everHeld }) {
  const holds = everHeld
    ? [...notes, `The PR has carried ${HOLD_LABEL}, so the owner decides it.`]
    : notes;
  const approved = labels.includes(APPROVAL_LABEL);
  let summary = "Gate: the PR stays on the team's side.";
  if (holds.length) {
    summary = approved
      ? `Gate: the owner approved this PR with the ${APPROVAL_LABEL} label.`
      : `Gate: this PR needs the owner. Only the owner adds the ${APPROVAL_LABEL} label.`;
  }
  return { pass: !holds.length || approved, summary, notes: holds };
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

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const repo = event.repository.full_name;
  // The commit this run's check lands on is the event's head; the labels are the PR's as of now.
  const { number, base, head } = event.pull_request;
  const labels = api(`repos/${repo}/issues/${number}/labels?per_page=100`).map(
    ({ name }) => name,
  );
  const { notes } = checkScope({
    repo,
    number,
    base: base.sha,
    head: head.sha,
  });
  const everHeld = carriedNeedsOwner({ repo, number, labels });
  const result = decide({ notes, labels, everHeld });
  const level = result.pass ? "notice" : "error";
  for (const note of result.notes) console.log(`::${level}::${note}`);
  console.log(result.summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [result.summary, ...result.notes.map((note) => `- ${note}`)];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  }
  process.exitCode = result.pass ? 0 : 1;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
