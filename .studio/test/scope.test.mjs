import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { codeowners, ownersIn, scopeNotes } from "../scope.mjs";
import { STUDIO } from "./kit.mjs";

// The repository's own .github/CODEOWNERS, as the gate and the guard read it.
const isOwnerPath = ownersIn(join(STUDIO, ".."));
const notesOf = (files, scripts = []) =>
  scopeNotes(files, scripts, isOwnerPath);

// Entries shaped like GitHub's "List pull request files" response
// (https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files).
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  additions: 0,
  deletions: 0,
  patch: "",
  ...extra,
});
// A unified-diff patch from lines that start with "+", "-" or " ".
const patch = (...lines) => ["@@ -1,3 +1,3 @@", ...lines].join("\n");

test("reads CODEOWNERS: the last match wins, and a line without an owner gives a path back", () => {
  const owned = codeowners(
    [
      "# comment",
      "/docs/ @a",
      "/docs/public/",
      "**/logs @b",
      "*.lock @c # inline",
      "notes/* @d",
    ].join("\n"),
  );
  assert.ok(owned("docs/x.md") && owned("Docs/x.md"));
  assert.ok(!owned("docs/public/x.md") && !owned("docs"));
  assert.ok(owned("logs/a") && owned("deep/nested/logs/a"));
  assert.ok(owned("pnpm.lock") && owned("app/pnpm.lock"));
  assert.ok(
    owned("notes/a.md") &&
      !owned("notes/deep/a.md") &&
      !owned("app/notes/a.md"),
  );
  assert.ok(!owned("README.md"));
});

test("knows the owner's paths", () => {
  for (const path of [
    "content/profile.ts",
    ".claude/settings.json",
    ".claude/agents/engineer.md",
    ".claude/skills/sprint/SKILL.md",
    ".studio/gate.mjs",
    ".studio/merge.mjs",
    ".studio/scope.mjs",
    ".studio/install.sh",
    ".studio/test/merge.test.mjs",
    ".github/workflows/ci.yml",
    "CLAUDE.md",
    "AGENTS.md",
    "app/CLAUDE.md",
    ".mcp.json",
    ".gitattributes",
    "app/.gitattributes",
    "design/rubric.md",
    "design/calibration/home-7.png",
    "skills-lock.json",
    ".Claude/Settings.json",
    "biome.json",
    "tsconfig.json",
    "knip.json",
    "pnpm-workspace.yaml",
    "renovate.json",
    "playwright.config.ts",
    "Playwright.config.mjs",
  ]) {
    assert.equal(isOwnerPath(path), true, path);
  }
  for (const path of [
    "content/drafts/bio.md",
    ".claude/agent-memory/engineer/MEMORY.md",
    ".studio/STATE.md",
    ".studio/sprint/3/retro.json",
    "app/page.tsx",
    "design/tokens.md",
    "e2e/home.spec.ts",
    "package.json",
    "ROADMAP.md",
  ]) {
    assert.equal(isOwnerPath(path), false, path);
  }
});

test("lets a PR that stays on the team's side through", () => {
  const files = [
    changed("app/page.tsx", { deletions: 12, patch: patch("-old", "+new") }),
    changed("e2e/nav.spec.ts", {
      status: "added",
      additions: 2,
      patch: patch('+test("nav", async () => {', "+});"),
    }),
    changed("e2e/home.spec.ts", {
      additions: 1,
      patch: patch("+  await expect(x).toBeVisible();"),
    }),
    changed(".studio/sprint/3/retro.json", { status: "added" }),
    changed("content/drafts/bio.md", { status: "added" }),
    changed("package.json", { additions: 1, deletions: 1 }),
  ];
  assert.deepEqual(notesOf(files), []);
});

test("turning a fixme or skip back on strengthens the suite, and comments may go", () => {
  const files = [
    changed("e2e/content.spec.ts", {
      additions: 1,
      deletions: 4,
      patch: patch(
        "-// fixme until the owner's content lands: the seed profile still renders",
        "-// the stand-ins it marks TODO(owner).",
        "-",
        '-test.fixme("no value the owner marked TODO(owner) renders", async ({',
        '+test("no value the owner marked TODO(owner) renders", async ({',
      ),
    }),
  ];
  assert.deepEqual(notesOf(files), []);
});

test("names each owner path", () => {
  const notes = notesOf([
    changed("content/profile.ts"),
    changed(".studio/gate.mjs"),
    changed("lib/x.ts", { status: "renamed", previous_filename: "CLAUDE.md" }),
    changed("biome.json"),
    changed("playwright.config.ts", {
      additions: 1,
      patch: patch("+  testIgnore: /.*/,"),
    }),
  ]);
  assert.deepEqual(notes.slice(0, 5), [
    "content/profile.ts is the owner's: the owner approves it.",
    ".studio/gate.mjs is the owner's: the owner approves it.",
    "CLAUDE.md is the owner's: the owner approves it.",
    "biome.json is the owner's: the owner approves it.",
    "playwright.config.ts is the owner's: the owner approves it.",
  ]);
});

test("refuses deleted, moved or weakened tests", () => {
  const notes = notesOf([
    changed("e2e/smoke.spec.ts", { status: "removed", deletions: 40 }),
    changed("lib/format.test.ts", { status: "removed" }),
    changed("e2e/old.ts", {
      status: "renamed",
      previous_filename: "e2e/content.spec.ts",
    }),
    changed("lib/smoke.spec.ts", {
      status: "renamed",
      previous_filename: "e2e/smoke.spec.ts",
    }),
    changed("e2e/nav.spec.ts", {
      deletions: 1,
      patch: patch("-  await expect(page).toHaveTitle(/Ruslan/);"),
    }),
  ]);
  assert.deepEqual(notes, [
    "e2e/smoke.spec.ts is a test, and the PR deletes it: only the owner removes tests.",
    "lib/format.test.ts is a test, and the PR deletes it: only the owner removes tests.",
    "e2e/content.spec.ts moves out of the test suite to e2e/old.ts: only the owner removes tests.",
    "e2e/smoke.spec.ts moves out of e2e/, where Playwright runs it: only the owner removes tests.",
    "e2e/nav.spec.ts ends with 1 fewer `expect(` call: weakening a check needs the owner.",
  ]);
});

test("refuses added lines that skip, focus or retry checks", () => {
  for (const line of [
    "test.skip();",
    '  test.fixme("later", async () => {});',
    'test.only("this one", async () => {});',
    'test.describe.only("these", () => {});',
    'test.describe.skip("these", () => {});',
    'test.describe.configure({ mode: "serial", retries: 2 });',
    "test.fail();",
    "  retries: 3,",
    "  testIgnore: /.*/,",
    "  grepInvert: /axe/,",
  ]) {
    const notes = notesOf([
      changed("e2e/smoke.spec.ts", { additions: 1, patch: patch(`+${line}`) }),
    ]);
    assert.equal(notes.length, 1, line);
    assert.match(
      notes[0],
      /^e2e\/smoke\.spec\.ts adds `.+`: skipping, focusing or retrying checks needs the owner\.$/,
      line,
    );
  }
});

test("reads calls, not words: a skip-link selector, a serial suite or a comment about retries is fine", () => {
  const files = [
    changed("e2e/a11y.spec.ts", {
      status: "added",
      additions: 4,
      patch: patch(
        "+test('a skip link leads to main', async ({ page }) => {",
        "+  await page.keyboard.press('Tab');",
        "+  await expect(page.locator('.skip-link')).toBeFocused();",
        "+});",
      ),
    }),
    changed("e2e/order.spec.ts", {
      status: "added",
      additions: 1,
      patch: patch("+test.describe.configure({ mode: 'serial' });"),
    }),
    changed("e2e/note.spec.ts", {
      status: "added",
      additions: 2,
      patch: patch(
        "+// Runs once, with no retries, so a flake shows.",
        "+ * test.skip() would hide it; don't.",
      ),
    }),
  ];
  assert.deepEqual(notesOf(files), []);
});

test("rewriting a check that keeps its assertions is the team's", () => {
  const files = [
    changed("e2e/nav.spec.ts", {
      additions: 2,
      deletions: 3,
      patch: patch(
        "-  const link = page.getByRole('link', { name: 'Work' });",
        "-  await link.click();",
        "-  await expect(page).toHaveURL(/#work/);",
        "+  await page.getByRole('link', { name: 'Work' }).click();",
        "+  await expect(page).toHaveURL(/#work/);",
      ),
    }),
  ];
  assert.deepEqual(notesOf(files), []);
});

test("holds a check whose diff GitHub didn't show", () => {
  const [note] = notesOf([
    changed("e2e/smoke.spec.ts", { additions: 900, patch: undefined }),
  ]);
  assert.match(note, /GitHub shows no diff for it/);
});

test("names the package.json scripts a PR changes", () => {
  const [note] = notesOf([changed("package.json")], ["test:e2e", "verify"]);
  assert.match(note, /^package\.json changes its scripts \(test:e2e, verify\)/);
});

test("refuses a PR too large for GitHub to list", () => {
  const files = Array.from({ length: 3000 }, (_, i) => changed(`app/${i}.ts`));
  assert.match(notesOf(files)[0], /can't be checked/);
});
