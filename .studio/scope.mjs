// What a sprint PR may not change without the owner, shared by the merge gate (gate.mjs), the guard
// (guard.mjs, through isOwnerPath) and the CI scope check (.github/workflows/scope.yml):
// - owner paths: the owner's facts and the files that steer or score the team, the toolchain's
//   settings included;
// - package.json's scripts: they decide what `pnpm verify`, CI and the e2e run actually check.
//   Dependency changes stay the team's;
// - weakened tests: deleting a test file, moving one out of the suite, removing lines from the
//   end-to-end checks, or adding lines that skip, focus or retry them. Adding tests is always
//   fine, and so is turning a skipped or fixme test back on.
// The team can't edit its own scorer this way. In CI this file runs from the base branch on
// pull_request_target, so a PR can't change the rule that judges it. It reads the PR through
// GitHub's REST API and never checks out or runs the PR's code.

import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { api, list } from "./github.mjs";

// Paths match without regard to case, as the macOS file system does: `.Claude/settings.json` from a
// PR would overwrite `.claude/settings.json` in the owner's checkout.
const OWNER_PATHS = [
  /^content\/(?!drafts(\/|$))/iu,
  /^\.claude\/(?!agent-memory(\/|$))/iu,
  // The harness: its scripts and their tests. STATE.md and the sprint folder are the team's notes.
  /^\.studio\/(?!sprint(\/|$)|STATE\.md$)/iu,
  /^\.github\//iu,
  // Instruction files load wherever they are, and .mcp.json starts servers: the guard keeps both.
  /(^|\/)(CLAUDE|AGENTS)(\.local)?\.md$/iu,
  /^\.mcp\.json$/iu,
  /^design\/(rubric\.md$|calibration\/)/iu,
  /^skills-lock\.json$/iu,
  // The toolchain's settings decide what lint, typecheck, knip and the e2e run check, and which
  // dependencies may arrive.
  /^(biome\.jsonc?|tsconfig\.json|knip\.jsonc?|pnpm-workspace\.yaml|renovate\.json5?)$/iu,
  /^playwright\.config\./iu,
];
// The checks the team is scored by: lines removed here, or lines added that turn checks off,
// weaken them.
const SUITES = /^(e2e\/|\.studio\/test\/|playwright\.config\.)/iu;
const E2E = /^e2e\//iu;
// The names test runners pick up (Playwright's default testMatch, node --test's *.test.mjs): a test
// renamed out of this pattern stops running wherever it sits.
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/iu;
// Added lines that skip, focus, expect to fail or retry tests, or tell Playwright to ignore some.
const WEAKENS =
  /\.(skip|fixme|only|fail)\b|\b(testIgnore|grepInvert|retries)\b|\bdescribe\.configure\b/u;
// Removed lines that can't weaken a check: blank lines, comments, and a skip or fixme taken away.
const HARMLESS_REMOVAL = /^\s*(\/\/.*)?$|\.(skip|fixme)\b/u;
// GitHub lists at most this many files for a PR, so a list this long may hide one.
const MAX_FILES = 3000;
const SHOWN = 10;
export const APPROVAL_LABEL = "owner-approved";

export function isOwnerPath(path) {
  return OWNER_PATHS.some((rule) => rule.test(path));
}

/**
 * Why these changed files need the owner, one note each; empty when they don't.
 * @param files GitHub's list: { filename, status, deletions, additions, previous_filename, patch }.
 * @param scripts the names of package.json scripts the PR changes, when it changes any.
 */
export function scopeNotes(files, scripts = []) {
  if (files.length >= MAX_FILES) {
    return [
      `The PR changes ${files.length} or more files, more than GitHub lists, so its scope can't be checked.`,
    ];
  }
  const notes = files.flatMap(fileNotes);
  if (scripts.length) {
    notes.push(
      `package.json changes its scripts (${scripts.join(", ")}): they decide what verify, CI and the e2e run check, so they're the owner's. Dependency changes are fine.`,
    );
  }
  const unique = [...new Set(notes)];
  return unique.length > SHOWN
    ? [...unique.slice(0, SHOWN), `…and ${unique.length - SHOWN} more.`]
    : unique;
}

function fileNotes(file) {
  const { filename: path, status, previous_filename: from } = file;
  const notes = [path, from]
    .filter((p) => p && isOwnerPath(p))
    .map(
      (owned) =>
        `${owned} is the owner's: take it out of this PR, or leave the PR for the owner.`,
    );
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
  } else if (status === "renamed" && E2E.test(from) && !E2E.test(path)) {
    notes.push(
      `${from} moves out of e2e/, where Playwright runs it, to ${path}: only the owner removes tests.`,
    );
  } else if (SUITES.test(path)) {
    notes.push(...weakening(file));
  }
  return notes;
}

// Read from the patch: removed lines that held a check, and added lines that switch checks off.
// Without a patch (GitHub leaves it out of very large diffs) any change could do either.
function weakening({
  filename: path,
  status,
  deletions = 0,
  additions = 0,
  patch,
}) {
  if (patch === undefined) {
    if (status === "removed" || deletions > 0 || additions > 0) {
      return [
        `${path} changed, and GitHub shows no diff for it, so the scope check can't tell whether it weakens a check: leave it for the owner.`,
      ];
    }
    return [];
  }
  const lines = patch.split("\n");
  const removed = lines.filter(
    (line) => line.startsWith("-") && !HARMLESS_REMOVAL.test(line.slice(1)),
  ).length;
  const switchedOff = lines
    .filter((line) => line.startsWith("+") && WEAKENS.test(line.slice(1)))
    .map((line) => line.slice(1).trim());
  const notes = [];
  if (removed) {
    notes.push(
      `${path} loses ${removed} line${removed === 1 ? "" : "s"}: weakening a check needs the owner. Add tests rather than edit them.`,
    );
  }
  for (const line of switchedOff) {
    notes.push(
      `${path} adds \`${line.slice(0, 80)}\`: skipping, focusing or retrying checks needs the owner.`,
    );
  }
  return notes;
}

/** The PR's changed files from GitHub's REST API, every page, with their patches. */
export function changedFiles({ number, repo, cwd }) {
  return list(`repos/${repo}/pulls/${number}/files?per_page=100`, { cwd }).map(
    ({ filename, status, additions, deletions, previous_filename, patch }) => ({
      filename,
      status,
      additions,
      deletions,
      previous_filename,
      patch,
    }),
  );
}

/**
 * The package.json scripts a PR adds, removes or changes, compared at the point it branched from
 * and at its head, through the contents API. Empty when package.json didn't change.
 */
export function changedScripts({ repo, base, head, files, cwd }) {
  if (!files.some(({ filename }) => filename === "package.json")) return [];
  const { merge_base_commit: fork } = api(
    `repos/${repo}/compare/${base}...${head}`,
    { cwd },
  );
  const before = scriptsAt(repo, fork.sha, cwd);
  const after = scriptsAt(repo, head, cwd);
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...names].filter((name) => before[name] !== after[name]).sort();
}

function scriptsAt(repo, ref, cwd) {
  let file;
  try {
    file = api(`repos/${repo}/contents/package.json?ref=${ref}`, { cwd });
  } catch (error) {
    // No package.json at that commit: no scripts either.
    if (error.status === 404) return {};
    throw error;
  }
  const text = Buffer.from(file.content, file.encoding ?? "base64").toString(
    "utf8",
  );
  return JSON.parse(text).scripts ?? {};
}

/** Everything that keeps this PR on the owner's side, read from GitHub. */
export function checkScope({ repo, number, base, head, cwd }) {
  const files = changedFiles({ number, repo, cwd });
  const scripts = changedScripts({ repo, base, head, files, cwd });
  return { files, notes: scopeNotes(files, scripts) };
}

// Run by the scope workflow, with the pull_request_target event GitHub saved for the job.
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  const { notes } = checkScope({
    repo: event.repository.full_name,
    number: pr.number,
    base: pr.base.sha,
    head: pr.head.sha,
  });
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
