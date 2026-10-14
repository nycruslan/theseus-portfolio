import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ingest, runHook, tempDir } from "./kit.mjs";

const ROOT = tempDir();

// A PreToolUse payload for Write, shaped like https://code.claude.com/docs/en/hooks#pretooluse-input.
function write(path, agent) {
  return {
    session_id: "abc123",
    cwd: ROOT,
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: {
      file_path: path.startsWith("/") ? path : join(ROOT, path),
      content: "x",
    },
    ...(agent && { agent_id: "a1b2c3", agent_type: agent }),
  };
}

function guard(path, agent, env = {}) {
  return runHook("guard.mjs", write(path, agent), {
    env: { CLAUDE_PROJECT_DIR: ROOT, ...env },
  });
}

test("protects the owner's files from everyone, the lead included, in any case", () => {
  for (const path of [
    "CLAUDE.md",
    "app/AGENTS.md",
    ".claude/settings.json",
    ".claude/agents/engineer.md",
    ".studio/merge.mjs",
    ".github/workflows/lens.yml",
    "content/profile.ts",
    "design/rubric.md",
    "biome.json",
    ".STUDIO/guard.mjs",
    ".Claude/Settings.json",
  ]) {
    for (const agent of [undefined, "engineer", "qa-engineer"]) {
      const { code, stderr } = guard(path, agent);
      assert.equal(code, 2, `${path} by ${agent ?? "the lead"}`);
      assert.match(stderr, /protected: only the owner changes it/);
    }
  }
});

test("e2e/ is Probe's alone", () => {
  assert.equal(guard("e2e/home.spec.ts", "qa-engineer").code, 0);
  for (const agent of [undefined, "engineer", "creative-engineer"]) {
    const { code, stderr } = guard("e2e/home.spec.ts", agent);
    assert.equal(code, 2, agent ?? "the lead");
    assert.match(stderr, /belongs to Probe/);
  }
});

test("keeps each memory folder to its own role, in a worktree too", () => {
  const memory = ".claude/agent-memory/code-reviewer/MEMORY.md";
  assert.equal(guard(memory, "code-reviewer").code, 0);
  assert.equal(guard(memory, "engineer").code, 2);
  assert.equal(guard(memory).code, 2);
  assert.equal(
    guard(`.claude/worktrees/lens/${memory}`, "code-reviewer").code,
    0,
  );
  const { stderr } = guard(
    ".claude/worktrees/lens/.claude/agent-memory/engineer/MEMORY.md",
    "code-reviewer",
  );
  assert.match(stderr, /engineer's memory: only engineer writes it/);
});

test("the lead and the builders write the product; other roles write their notes", () => {
  for (const agent of [undefined, "engineer", "creative-engineer"]) {
    assert.equal(guard("app/page.tsx", agent).code, 0, agent ?? "the lead");
  }
  for (const agent of ["code-reviewer", "design-director", "product-owner"]) {
    assert.equal(guard("app/page.tsx", agent).code, 2, agent);
    assert.equal(guard(".studio/sprint/3/review.md", agent).code, 0, agent);
  }
  assert.equal(guard("ROADMAP.md", "product-owner").code, 0);
  assert.equal(guard("content/drafts/bio.md", "product-owner").code, 0);
  assert.equal(guard("ROADMAP.md", "code-reviewer").code, 2);
});

test("follows a symlink to the file it would really write", () => {
  mkdirSync(join(ROOT, ".studio/sprint/9"), { recursive: true });
  symlinkSync("../../../CLAUDE.md", join(ROOT, ".studio/sprint/9/notes.md"));
  assert.equal(guard(".studio/sprint/9/notes.md", "engineer").code, 2);
});

test("leaves writes outside the project to Claude Code's own permissions", () => {
  assert.equal(guard(join(tempDir(), "scratch.md"), "code-reviewer").code, 0);
});

test("fails closed on a payload it can't read", () => {
  const { code } = runHook("guard.mjs", "not json", {
    env: { CLAUDE_PROJECT_DIR: ROOT },
  });
  assert.equal(code, 2);
});

test("puts a block on air", async () => {
  const studio = await ingest();
  try {
    guard("CLAUDE.md", "engineer", { STUDIO_INGEST_URL: studio.url });
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioWriteBlocked");
    assert.equal(body.path, "CLAUDE.md");
  } finally {
    studio.close();
  }
});
