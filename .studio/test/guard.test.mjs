import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ingest, runHook, tempDir } from "./kit.mjs";

const ROOT = "/repo";

// A PreToolUse payload for Write, shaped like https://code.claude.com/docs/en/hooks#pretooluse-input.
function write(path, agent, root = ROOT) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: root,
    permission_mode: "default",
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: `${root}/${path}`, content: "text" },
    tool_use_id: "toolu_01ABC123",
    ...(agent && { agent_id: "a1b2c3", agent_type: agent }),
  };
}

function guard(path, agent, env = {}) {
  return runHook("guard.mjs", write(path, agent), {
    env: { CLAUDE_PROJECT_DIR: ROOT, ...env },
  });
}

test("protects the owner's files from everyone, the lead included", () => {
  for (const path of [
    "CLAUDE.md",
    "CLAUDE.local.md",
    "AGENTS.md",
    "app/CLAUDE.md",
    ".mcp.json",
    ".claude/CLAUDE.md",
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".claude/agents/engineer.md",
    ".claude/skills/sprint/SKILL.md",
    ".claude/rules/team.md",
    ".claude/commands/ship.md",
    ".claude/hooks/check.sh",
    ".claude/workflows/review.js",
    ".studio/gate.mjs",
    ".studio/test/gate.test.mjs",
    ".github/workflows/ci.yml",
    "content/profile.ts",
    "design/rubric.md",
    "../elsewhere.txt",
  ]) {
    for (const agent of [undefined, "engineer"]) {
      const { code, stderr } = guard(path, agent);
      assert.equal(code, 2, `${path} by ${agent ?? "the lead"}`);
      assert.match(stderr, /protected: only the owner changes it/);
    }
  }
});

test("protects them whatever their case, as the macOS file system matches names", () => {
  for (const path of [
    "claude.md",
    ".STUDIO/guard.mjs",
    // A long s, which the file system folds to "s".
    ".\u017Ftudio/gate.mjs",
    ".MCP.json",
    "CONTENT/profile.ts",
    ".Claude/Settings.json",
  ]) {
    assert.equal(guard(path, "engineer").code, 2, path);
  }
});

test("follows links to the file a write would really reach", () => {
  const root = tempDir();
  const sprint = join(root, ".studio/sprint/1");
  mkdirSync(sprint, { recursive: true });
  writeFileSync(join(root, "CLAUDE.md"), "rules");
  symlinkSync("../../../CLAUDE.md", join(sprint, "notes.md"));
  symlinkSync("../../../CLAUDE.local.md", join(sprint, "new.md"));
  const at = (path, project = root) =>
    runHook("guard.mjs", write(path, "researcher", root), {
      env: { CLAUDE_PROJECT_DIR: project },
    });
  assert.match(
    at(".studio/sprint/1/notes.md").stderr,
    /^CLAUDE\.md is protected/,
  );
  assert.match(at(".studio/sprint/1/new.md").stderr, /couldn't be verified/);
  assert.equal(at(".studio/sprint/1/plan.md").code, 0);
  const link = join(tempDir(), "project");
  symlinkSync(root, link);
  assert.equal(at(".studio/sprint/1/plan.md", link).code, 0);
});

test("protects the same files inside a worktree", () => {
  assert.equal(
    guard(".claude/worktrees/forge-2/CLAUDE.md", "engineer").code,
    2,
  );
  assert.equal(
    guard(".claude/worktrees/forge-2/app/page.tsx", "engineer").code,
    0,
  );
});

test("lets the lead and the builders change the product", () => {
  for (const agent of [undefined, "engineer", "creative-engineer"]) {
    assert.equal(guard("app/page.tsx", agent).code, 0);
  }
});

test("keeps the other roles out of product files", () => {
  const { code, stderr } = guard("app/page.tsx", "qa-engineer");
  assert.equal(code, 2);
  assert.match(stderr, /qa-engineer doesn't edit app\/page\.tsx/);
});

test("lets every role write in the sprint folder", () => {
  for (const agent of [
    undefined,
    "product-owner",
    "code-reviewer",
    "Explore",
  ]) {
    assert.equal(guard(".studio/sprint/3/positions/iris.md", agent).code, 0);
  }
  assert.equal(guard(".studio/STATE.md").code, 0);
});

test("lets only Quill, besides the builders and the lead, edit the roadmap", () => {
  assert.equal(guard("ROADMAP.md", "product-owner").code, 0);
  assert.equal(guard("ROADMAP.md", "design-director").code, 2);
});

test("keeps each memory directory to its own role", () => {
  const memory = ".claude/agent-memory/code-reviewer/MEMORY.md";
  assert.equal(guard(memory, "code-reviewer").code, 0);
  assert.equal(guard(memory, "engineer").code, 2);
  assert.equal(guard(memory).code, 2);
});

test("blocks a write it can't read", () => {
  const { code, stderr } = runHook("guard.mjs", "not json");
  assert.equal(code, 2);
  assert.match(stderr, /couldn't be verified/);
});

test("puts a block on air", async () => {
  const studio = await ingest();
  try {
    guard("CLAUDE.md", "engineer", { STUDIO_INGEST_URL: studio.url });
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioWriteBlocked");
    assert.equal(body.path, "CLAUDE.md");
    assert.equal(body.agent_type, "engineer");
    assert.match(body.reason, /protected/);
  } finally {
    studio.close();
  }
});
