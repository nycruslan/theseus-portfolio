import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { isOwnerPath, scopeNotes } from "../scope.mjs";
import { ghLog, runHook, tempDir } from "./kit.mjs";

// Entries shaped like GitHub's "List pull request files" response
// (https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files).
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  deletions: 0,
  ...extra,
});

test("knows the owner's paths", () => {
  for (const path of [
    "content/profile.ts",
    ".claude/settings.json",
    ".claude/agents/engineer.md",
    ".claude/skills/sprint/SKILL.md",
    ".studio/gate.mjs",
    ".studio/scope.mjs",
    ".studio/install.sh",
    ".studio/test/gate.test.mjs",
    ".github/workflows/ci.yml",
    "CLAUDE.md",
    "AGENTS.md",
    "app/CLAUDE.md",
    ".mcp.json",
    "design/rubric.md",
    "design/calibration/home-7.png",
    "skills-lock.json",
    ".Claude/Settings.json",
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
    "ROADMAP.md",
  ]) {
    assert.equal(isOwnerPath(path), false, path);
  }
});

test("lets a PR that stays on the team's side through", () => {
  const files = [
    changed("app/page.tsx", { deletions: 12 }),
    changed("e2e/nav.spec.ts", { status: "added" }),
    changed("e2e/home.spec.ts"),
    changed(".studio/sprint/3/retro.json", { status: "added" }),
    changed("content/drafts/bio.md", { status: "added" }),
  ];
  assert.deepEqual(scopeNotes(files), []);
});

test("names each owner path", () => {
  const notes = scopeNotes([
    changed("content/profile.ts"),
    changed(".studio/gate.mjs"),
    changed("lib/x.ts", { status: "renamed", previous_filename: "CLAUDE.md" }),
  ]);
  assert.deepEqual(notes, [
    "content/profile.ts is the owner's: take it out of this PR, or leave the PR for the owner.",
    ".studio/gate.mjs is the owner's: take it out of this PR, or leave the PR for the owner.",
    "CLAUDE.md is the owner's: take it out of this PR, or leave the PR for the owner.",
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
    changed("e2e/nav.spec.ts", { deletions: 1 }),
    changed("playwright.config.ts", { deletions: 3 }),
  ]);
  assert.deepEqual(notes, [
    "e2e/smoke.spec.ts is a test, and the PR deletes it: only the owner removes tests.",
    "lib/format.test.ts is a test, and the PR deletes it: only the owner removes tests.",
    "e2e/content.spec.ts moves out of the test suite to e2e/old.ts: only the owner removes tests.",
    "e2e/nav.spec.ts loses 1 line: weakening a check needs the owner. Add tests rather than edit them.",
    "playwright.config.ts loses 3 lines: weakening a check needs the owner. Add tests rather than edit them.",
  ]);
});

test("refuses a PR too large for GitHub to list", () => {
  const files = Array.from({ length: 3000 }, (_, i) => changed(`app/${i}.ts`));
  assert.match(scopeNotes(files)[0], /can't be checked/);
});

/** Runs the checker as the workflow does, on a pull_request_target event. */
function scopeCheck(files, labels = []) {
  const dir = tempDir();
  const event = join(dir, "event.json");
  const summary = join(dir, "summary.md");
  writeFileSync(
    event,
    JSON.stringify({
      pull_request: { number: 12, labels: labels.map((name) => ({ name })) },
      repository: { full_name: "nycruslan/theseus-portfolio" },
    }),
  );
  writeFileSync(summary, "");
  const gh = ghLog();
  const result = runHook("scope.mjs", "", {
    env: {
      GITHUB_EVENT_PATH: event,
      GITHUB_STEP_SUMMARY: summary,
      GH_FILES: files.map((file) => JSON.stringify(file)).join("\n"),
      GH_LOG: gh.file,
    },
  });
  return { ...result, gh: gh.calls(), summary: readFileSync(summary, "utf8") };
}

test("the scope check reads the PR's files through the API, never its code", () => {
  const { code, stdout, gh } = scopeCheck([changed("app/page.tsx")]);
  assert.equal(code, 0);
  assert.match(stdout, /stays on the team's side/);
  assert.deepEqual(gh, [
    [
      "api",
      "repos/nycruslan/theseus-portfolio/pulls/12/files",
      "--paginate",
      "--jq",
      ".[] | {filename, status, deletions, previous_filename} | @json",
    ],
  ]);
});

test("the scope check fails on owner paths unless the owner approved", () => {
  const files = [changed(".claude/settings.json")];
  const refused = scopeCheck(files);
  assert.equal(refused.code, 1);
  assert.match(
    refused.stdout,
    /::error::\.claude\/settings\.json is the owner's/,
  );
  assert.match(refused.summary, /needs the owner/);
  const approved = scopeCheck(files, ["sprint", "owner-approved"]);
  assert.equal(approved.code, 0);
  assert.match(approved.stdout, /::notice::/);
});

test("the scope check fails closed when it can't list the files", () => {
  const dir = tempDir();
  const event = join(dir, "event.json");
  writeFileSync(
    event,
    JSON.stringify({
      pull_request: { number: 12, labels: [] },
      repository: { full_name: "nycruslan/theseus-portfolio" },
    }),
  );
  const { code } = runHook("scope.mjs", "", {
    env: { GITHUB_EVENT_PATH: event, GH_FAIL: "HTTP 502" },
  });
  assert.notEqual(code, 0);
});
