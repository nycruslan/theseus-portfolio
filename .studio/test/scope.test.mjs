import assert from "node:assert/strict";
import { test } from "node:test";
import { isOwnerPath, scopeNotes } from "../scope.mjs";

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
    "content/drafts",
    ".claude/agent-memory/engineer/MEMORY.md",
    ".claude/agent-memory",
    ".studio/STATE.md",
    ".studio/sprint/3/retro.json",
    ".studio/sprint",
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
  assert.deepEqual(scopeNotes(files), []);
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
  assert.deepEqual(scopeNotes(files), []);
});

test("names each owner path", () => {
  const notes = scopeNotes([
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
    "content/profile.ts is the owner's: take it out of this PR, or leave the PR for the owner.",
    ".studio/gate.mjs is the owner's: take it out of this PR, or leave the PR for the owner.",
    "CLAUDE.md is the owner's: take it out of this PR, or leave the PR for the owner.",
    "biome.json is the owner's: take it out of this PR, or leave the PR for the owner.",
    "playwright.config.ts is the owner's: take it out of this PR, or leave the PR for the owner.",
  ]);
});

test("refuses deleted, moved or weakened tests", () => {
  const notes = scopeNotes([
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
    "e2e/smoke.spec.ts moves out of e2e/, where Playwright runs it, to lib/smoke.spec.ts: only the owner removes tests.",
    "e2e/nav.spec.ts loses 1 line: weakening a check needs the owner. Add tests rather than edit them.",
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
    const notes = scopeNotes([
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
  assert.deepEqual(scopeNotes(files), []);
});

test("holds a check whose diff GitHub didn't show", () => {
  const [note] = scopeNotes([
    changed("e2e/smoke.spec.ts", { additions: 900, patch: undefined }),
  ]);
  assert.match(note, /GitHub shows no diff for it/);
});

test("names the package.json scripts a PR changes", () => {
  const [note] = scopeNotes([changed("package.json")], ["test:e2e", "verify"]);
  assert.match(note, /^package\.json changes its scripts \(test:e2e, verify\)/);
});

test("refuses a PR too large for GitHub to list", () => {
  const files = Array.from({ length: 3000 }, (_, i) => changed(`app/${i}.ts`));
  assert.match(scopeNotes(files)[0], /can't be checked/);
});
