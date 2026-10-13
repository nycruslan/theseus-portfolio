// What a sprint PR may not change without the owner, shared by the merge gate (gate.mjs) and the CI
// scope check (.github/workflows/scope.yml):
// - owner paths: the owner's facts and the files that steer or score the team;
// - weakened tests: deleting a test file, moving one out of the suite, or removing lines from the
//   end-to-end checks or the harness tests. Adding tests is always fine.
// The team can't edit its own scorer this way. In CI this file runs from the base branch on
// pull_request_target, so a PR can't change the rule that judges it. It reads only the list of
// changed files through GitHub's API and never checks out or runs the PR's code.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Paths match without regard to case, as the macOS file system does: `.Claude/settings.json` from a
// PR would overwrite `.claude/settings.json` in the owner's checkout.
const OWNER_PATHS = [
  /^content\/(?!drafts\/)/iu,
  /^\.claude\/(?!agent-memory\/)/iu,
  // The harness: its scripts and their tests. STATE.md and the sprint folder are the team's notes.
  /^\.studio\/(?!sprint\/|STATE\.md$)/iu,
  /^\.github\//iu,
  // Instruction files load wherever they are, and .mcp.json starts servers: the guard keeps both.
  /(^|\/)(CLAUDE|AGENTS)(\.local)?\.md$/iu,
  /^\.mcp\.json$/iu,
  /^design\/(rubric\.md$|calibration\/)/iu,
  /^skills-lock\.json$/iu,
];
// The checks the team is scored by: lines removed here weaken them. The Playwright config decides
// which of them run, so it counts too.
const SUITES = /^(e2e\/|\.studio\/test\/|playwright\.config\.)/iu;
// The names test runners pick up (Playwright's default testMatch, node --test's *.test.mjs): a test
// renamed out of this pattern stops running wherever it sits.
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/iu;
// GitHub lists at most this many files for a PR, so a list this long may hide one.
const MAX_FILES = 3000;
const SHOWN = 10;
export const APPROVAL_LABEL = "owner-approved";

export function isOwnerPath(path) {
  return OWNER_PATHS.some((rule) => rule.test(path));
}

/**
 * Why these changed files need the owner, one note each; empty when they don't.
 * @param files GitHub's list: { filename, status, deletions, previous_filename }.
 */
export function scopeNotes(files) {
  if (files.length >= MAX_FILES) {
    return [
      `The PR changes ${files.length} or more files, more than GitHub lists, so its scope can't be checked.`,
    ];
  }
  const notes = [];
  for (const {
    filename: path,
    status,
    deletions,
    previous_filename: from,
  } of files) {
    for (const owned of [path, from].filter((p) => p && isOwnerPath(p))) {
      notes.push(
        `${owned} is the owner's: take it out of this PR, or leave the PR for the owner.`,
      );
    }
    if (status === "removed" && TEST_FILE.test(path)) {
      notes.push(
        `${path} is a test, and the PR deletes it: only the owner removes tests.`,
      );
    } else if (
      status === "renamed" &&
      TEST_FILE.test(from) &&
      !TEST_FILE.test(path)
    ) {
      notes.push(
        `${from} moves out of the test suite to ${path}: only the owner removes tests.`,
      );
    } else if (deletions > 0 && SUITES.test(path)) {
      notes.push(
        `${path} loses ${deletions} line${deletions === 1 ? "" : "s"}: weakening a check needs the owner. Add tests rather than edit them.`,
      );
    }
  }
  const unique = [...new Set(notes)];
  return unique.length > SHOWN
    ? [...unique.slice(0, SHOWN), `…and ${unique.length - SHOWN} more.`]
    : unique;
}

/** The PR's changed files from GitHub's REST API, every page. `repo` defaults to the checkout's. */
export function changedFiles({ number, repo, cwd }) {
  const out = execFileSync(
    "gh",
    [
      "api",
      `repos/${repo ?? "{owner}/{repo}"}/pulls/${number}/files`,
      "--paginate",
      "--jq",
      ".[] | {filename, status, deletions, previous_filename} | @json",
    ],
    { cwd, encoding: "utf8", timeout: 30_000 },
  );
  return out.split("\n").filter(Boolean).map(JSON.parse);
}

// Run by the scope workflow, with the pull_request_target event GitHub saved for the job.
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  const notes = scopeNotes(
    changedFiles({ number: pr.number, repo: event.repository.full_name }),
  );
  const approved = pr.labels.some(({ name }) => name === APPROVAL_LABEL);
  const verdict = !notes.length
    ? "Scope: the PR stays on the team's side."
    : approved
      ? `Scope: the owner approved these changes with the ${APPROVAL_LABEL} label.`
      : `Scope: this PR needs the owner. Only the owner adds the ${APPROVAL_LABEL} label.`;
  const level = notes.length && !approved ? "error" : "notice";
  for (const note of notes) console.log(`::${level}::${note}`);
  console.log(verdict);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [verdict, ...notes.map((note) => `- ${note}`)].join("\n");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  process.exit(level === "error" ? 1 : 0);
}
