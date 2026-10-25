// What a PR changes that someone besides its builders must accept.
// The owner (scopeNotes, held by the `gate` check, gate.mjs, and locally by the file guard, guard.mjs):
// - owner paths: those .github/CODEOWNERS gives an owner, the crew's own rails and the owner's facts.
//   They match without regard to case, as the macOS file system does, so `.Claude/settings.json`
//   from a PR can't slip past;
// - package.json's scripts: they decide what `pnpm verify`, CI and the e2e run check. Its
//   dependencies stay the team's.
// Lens (testNotes, in the review's context, lens.mjs): weakened tests, meaning a test file deleted or
// moved out of the suite, an e2e spec ending with fewer `expect(` calls, or added lines that skip,
// focus or retry checks. Lens accepts each one only when the PR names it and why the behaviour it
// checked is gone. Rewriting a check that keeps its assertions is the team's, and so is adding tests.
// It reads the PR through GitHub's REST API and never checks out or runs the PR's code.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { api, list } from "./github.mjs";

const E2E = /^e2e\//iu;
// The names test runners pick up (Playwright's default testMatch, node --test's *.test.mjs): a test
// renamed out of this pattern stops running wherever it sits.
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/iu;
// Added lines that skip, focus, expect to fail or retry tests, or tell Playwright to ignore some:
// the calls and config keys themselves, so a `.skip-link` selector or a comment doesn't count.
const WEAKENS = [
  /\b(test|it|describe)(\.\w+)*\.(skip|fixme|fail)\s*\(/u,
  /\.only\s*\(/u,
  /\bdescribe\.configure\s*\([^)]*\bretries\b/u,
  /\b(testIgnore|grepInvert|retries)\s*:/u,
];
const COMMENT = /^\s*(\/\/|\/\*|\*)/u;
const EXPECT = /\bexpect(\.\w+)*\s*\(/gu;
// GitHub lists at most this many files for a PR, so a list this long may hide one.
const MAX_FILES = 3000;
const SHOWN = 10;

/**
 * A test for owner paths, from CODEOWNERS text: the last matching line wins, and a line without
 * an owner gives its paths back. Patterns follow the gitignore subset CODEOWNERS supports.
 */
export function codeowners(text) {
  const rules = text
    .split("\n")
    .map((line) => line.replace(/\s#.*$/u, "").trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [pattern, ...owners] = line.split(/\s+/u);
      return { match: matcher(pattern), owned: owners.length > 0 };
    });
  return (path) =>
    rules.findLast(({ match }) => match.test(path))?.owned ?? false;
}

function matcher(pattern) {
  const directory = pattern.endsWith("/");
  const body = pattern.replace(/^\/|\/$/gu, "");
  // A slash before the end anchors the pattern at the root; otherwise it matches at any depth.
  const anchored = pattern.slice(0, -1).includes("/");
  const glob = body
    .split("/")
    .map((part) =>
      part === "**"
        ? ".*"
        : part
            .replace(/[.+^${}()|\\]/gu, "\\$&")
            .replace(/\*/gu, "[^/]*")
            .replace(/\?/gu, "[^/]"),
    )
    .join("/")
    // `**/` matches zero or more folders, first or in the middle, as GitHub reads it.
    .replace(/^\.\*\//u, "(.*/)?")
    .replace(/\/\.\*\//gu, "/(.*/)?");
  const start = anchored ? "^" : "(^|/)";
  // `docs/` owns everything below it, `docs/*` only the files directly in it, and a name either
  // the file or everything below the directory of that name.
  const end = directory ? "/" : body.endsWith("*") ? "$" : "(/|$)";
  return new RegExp(`${start}${glob}${end}`, "iu");
}

/** The owner-path test for a checkout, from its .github/CODEOWNERS. */
export function ownersIn(root) {
  return codeowners(readFileSync(join(root, ".github", "CODEOWNERS"), "utf8"));
}

/**
 * Why these changed files need the owner, one note each; empty when they don't.
 * @param files GitHub's list: { filename, status, previous_filename, patch, additions, deletions }.
 * @param scripts the names of package.json scripts the PR changes.
 * @param isOwned the owner-path test (codeowners).
 */
export function scopeNotes(files, scripts, isOwned) {
  if (files.length >= MAX_FILES) {
    return [
      `The PR changes ${files.length} or more files, more than GitHub lists, so its scope can't be checked.`,
    ];
  }
  const notes = files.flatMap(({ filename, previous_filename: from }) =>
    [filename, from]
      .filter((path) => path && isOwned(path))
      .map((owned) => `${owned} is the owner's: the owner approves it.`),
  );
  if (scripts.length) {
    notes.push(
      `package.json changes its scripts (${scripts.join(", ")}): they decide what verify, CI and the e2e run check, so they're the owner's. Dependency changes are fine.`,
    );
  }
  return shown(notes);
}

/**
 * The checks these changed files weaken, one note each and every one, since Lens judges each; empty
 * when they weaken none. Same files as scopeNotes.
 */
export function testNotes(files) {
  return [...new Set(files.flatMap(fileTestNotes))];
}

function shown(notes) {
  const unique = [...new Set(notes)];
  return unique.length > SHOWN
    ? [...unique.slice(0, SHOWN), `…and ${unique.length - SHOWN} more.`]
    : unique;
}

function fileTestNotes(file) {
  const { filename: path, status, previous_filename: from } = file;
  if (status === "removed" && TEST_FILE.test(path)) {
    return [`${path} is a test, and the PR deletes it.`];
  }
  if (status === "renamed" && TEST_FILE.test(from) && !TEST_FILE.test(path)) {
    return [`${from} moves out of the test suite to ${path}.`];
  }
  if (status === "renamed" && E2E.test(from) && !E2E.test(path)) {
    return [`${from} moves out of e2e/, where Playwright runs it.`];
  }
  return E2E.test(path) ? weakening(file) : [];
}

// Read from the patch: fewer assertions than before, or added lines that switch checks off.
// Without a patch (GitHub leaves it out of very large diffs) any change could do either.
// Counting `expect(` calls is a trade-off: it lets the team rewrite a check freely, but a weaker
// assertion swapped in for a stronger one keeps the count. Lens reviews every e2e change for that
// too; a stricter rule would make Lens judge every test edit as a retirement.
function weakening({
  filename: path,
  status,
  patch,
  additions = 0,
  deletions = 0,
}) {
  if (patch === undefined) {
    return status === "removed" || additions || deletions
      ? [
          `${path} changed, and GitHub shows no diff for it, so whether it weakens a check can't be read from the diff.`,
        ]
      : [];
  }
  const lines = patch.split("\n");
  const code = (sign) =>
    lines
      .filter((line) => line.startsWith(sign) && !COMMENT.test(line.slice(1)))
      .map((line) => line.slice(1));
  const expects = (sign) => code(sign).join("\n").match(EXPECT)?.length ?? 0;
  const lost = expects("-") - expects("+");
  const notes =
    lost > 0
      ? [
          `${path} ends with ${lost} fewer \`expect(\` call${lost === 1 ? "" : "s"}.`,
        ]
      : [];
  for (const line of code("+").filter((line) =>
    WEAKENS.some((rule) => rule.test(line)),
  )) {
    notes.push(
      `${path} adds \`${line.trim().slice(0, 80)}\`, which skips, focuses or retries checks.`,
    );
  }
  return notes;
}

/** The PR's changed files from GitHub's REST API, every page, with their patches. */
export function changedFiles({ repo, number, cwd }) {
  return list(`repos/${repo}/pulls/${number}/files?per_page=100`, { cwd });
}

/**
 * The package.json scripts a PR adds, removes or changes, compared where it branched and at its
 * head, through the contents API. Empty when package.json didn't change.
 */
function changedScripts({ repo, base, head, files, cwd }) {
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

/** Everything about the PR's changes that needs the owner, read from GitHub. */
export function checkScope({ repo, number, base, head, isOwned, cwd }) {
  const files = changedFiles({ repo, number, cwd });
  const scripts = changedScripts({ repo, base, head, files, cwd });
  return scopeNotes(files, scripts, isOwned);
}
