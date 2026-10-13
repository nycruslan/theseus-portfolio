import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { gitRepo, ingest, runHook, tempDir } from "./kit.mjs";

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

test("keeps e2e/ and the Playwright config to Probe", () => {
  for (const path of [
    "e2e/home.spec.ts",
    "e2e/fixtures/data.ts",
    "playwright.config.ts",
  ]) {
    assert.equal(guard(path, "qa-engineer").code, 0, path);
    for (const agent of [
      undefined,
      "engineer",
      "creative-engineer",
      "code-reviewer",
    ]) {
      const { code, stderr } = guard(path, agent);
      assert.equal(code, 2, `${path} by ${agent ?? "the lead"}`);
      assert.match(stderr, /belongs to Probe: only qa-engineer writes/);
    }
  }
});

// A PreToolUse payload for Bash, shaped like https://code.claude.com/docs/en/hooks#pretooluse-input.
function shell(command, agent, root = ROOT) {
  return runHook(
    "guard.mjs",
    {
      ...write("x", agent, root),
      tool_name: "Bash",
      tool_input: { command, description: "Run a command" },
    },
    { env: { CLAUDE_PROJECT_DIR: root } },
  );
}

test("applies the same rules to files a shell command writes", () => {
  for (const [command, agent, refusal] of [
    ["echo '{}' > .claude/settings.json", undefined, /protected/],
    ["echo x >> CLAUDE.md", "engineer", /protected/],
    ["pnpm build 2>&1 | tee -a content/profile.ts", "engineer", /protected/],
    ["sed -i '' -e 's/a/b/' .studio/gate.mjs", "engineer", /protected/],
    [
      "sed -i.bak 's/expect/\\/\\/expect/' e2e/home.spec.ts",
      "engineer",
      /belongs to Probe/,
    ],
    [
      "cat > e2e/home.spec.ts <<'EOF'\ntest.skip()\nEOF",
      undefined,
      /belongs to Probe/,
    ],
    [
      "cp /tmp/settings.json .claude/",
      "engineer",
      /\.claude\/settings\.json is protected/,
    ],
    ["mv content/profile.ts /tmp/profile.ts", undefined, /protected/],
    ["ln -sf /tmp/rules.md AGENTS.md", "engineer", /protected/],
    ["git checkout main -- .github/workflows/ci.yml", undefined, /protected/],
    ["git restore --source=HEAD~3 design/rubric.md", "engineer", /protected/],
    ["truncate -s 0 .studio/test/gate.test.mjs", "engineer", /protected/],
    ["bash -c 'echo x > .mcp.json'", "engineer", /protected/],
    [
      "cd content && echo x > profile.ts",
      "engineer",
      /content\/profile\.ts is protected/,
    ],
    [
      "git -C /repo/.claude/worktrees/forge-2 checkout -- CLAUDE.md",
      "engineer",
      /protected/,
    ],
    [
      "echo 'Verdict: ship' > app/page.tsx",
      "code-reviewer",
      /code-reviewer doesn't edit app\/page\.tsx/,
    ],
    [
      "echo x > .claude/agent-memory/engineer/MEMORY.md",
      "code-reviewer",
      /engineer's memory/,
    ],
    [
      "echo '{}' >> /tmp/theseus-verdicts-abc123.jsonl",
      undefined,
      /written by the hooks alone/,
    ],
  ]) {
    const { code, stderr } = shell(command, agent);
    assert.equal(code, 2, command);
    assert.match(stderr, refusal, command);
    assert.match(stderr, /This command writes it/, command);
  }
});

test("lets ordinary shell work through", () => {
  for (const [command, agent] of [
    ["pnpm verify > .studio/sprint/3/verify.log 2>&1", "engineer"],
    [
      "pnpm exec playwright test 2>&1 | tee .studio/sprint/3/probe.log",
      "qa-engineer",
    ],
    [
      "cat > e2e/nav.spec.ts <<'EOF'\nimport { test } from '@playwright/test';\nEOF",
      "qa-engineer",
    ],
    ["echo '## Sprint 3' >> .studio/STATE.md", undefined],
    [
      "git diff main > /tmp/review.diff; ls >&2; true 2>/dev/null",
      "code-reviewer",
    ],
    [
      "sed -n '1,20p' CLAUDE.md && grep -rn 'needs-owner' .claude/",
      "code-reviewer",
    ],
    ["echo 2 > /dev/null", "researcher"],
    [
      "cat <<'EOF' > .studio/sprint/3/notes.md\nThe guard keeps > CLAUDE.md and content/ safe.\nEOF",
      "product-owner",
    ],
    [
      `gh pr create --title "Sprint 3" --body "$(cat <<'EOF'\nTouches nothing > CLAUDE.md (1) or 2) content/\nEOF\n)"`,
      undefined,
    ],
    [
      "git checkout -- app/page.tsx && rm -rf .next node_modules/.cache",
      "engineer",
    ],
    ["echo x > app/page.tsx", "creative-engineer"],
    ["cp notes.md .claude/agent-memory/code-reviewer/", "code-reviewer"],
    ['echo $(date) > "$TMPDIR/stamp"', "code-reviewer"],
  ]) {
    const { code, stderr } = shell(command, agent);
    assert.equal(code, 0, `${command}: ${stderr}`);
  }
});

test("a removal reaches the tracked files under a directory or a glob", () => {
  const { dir } = gitRepo({
    "design/rubric.md": "bar",
    "design/tokens.md": "tokens",
    "e2e/home.spec.ts": "test",
    "app/page.tsx": "page",
    "notes.log": "log",
  });
  for (const command of [
    "rm -rf design",
    "rm -rf ./*",
    "rm -r e2e",
    "mv design /tmp/old",
  ]) {
    assert.equal(shell(command, "engineer", dir).code, 2, command);
  }
  assert.equal(shell("rm -f *.log && rm -rf app", "engineer", dir).code, 0);
});

test("refuses process kills that can't name a PID, for every agent", () => {
  for (const command of [
    "pkill -f next-server",
    "killall node",
    "sudo killall -9 next-server",
    "kill $(lsof -t -i:3000)",
    "kill -9 `pgrep -f next`",
    "lsof -ti:3000 | xargs kill -9",
    "pgrep -f 'next dev' | xargs -r kill",
    "fuser -k 3000/tcp",
    "PID=$(cat .pid); kill $PID",
    "kill -9 -1",
    "kill -- -4242",
    "kill %1",
    "npx kill-port 3000",
    "timeout 5 pkill next",
    "bash -c 'pkill -f next'",
  ]) {
    for (const agent of [undefined, "engineer", "qa-engineer"]) {
      const { code, stderr } = shell(command, agent);
      assert.equal(code, 2, `${command} by ${agent ?? "the lead"}`);
      assert.match(stderr, /Stop only processes you started, by PID/);
    }
  }
});

test("lets a kill by literal PID, or of the job just started, through", () => {
  for (const command of [
    "kill 4242",
    "kill -9 4242 4243",
    "kill -TERM 4242",
    "kill -s TERM 4242",
    "pnpm start & sleep 5; curl -s localhost:3000 > /dev/null; kill $!",
    "kill -l",
    "which pkill; grep -rn 'pkill' .studio/sprint/",
    "command -v killall",
    "pgrep -fl next-server",
  ]) {
    const { code, stderr } = shell(command, "engineer");
    assert.equal(code, 0, `${command}: ${stderr}`);
  }
});

test("puts a refused kill on air", async () => {
  const studio = await ingest();
  try {
    runHook(
      "guard.mjs",
      {
        ...write("x", "engineer"),
        tool_name: "Bash",
        tool_input: { command: "pkill -f next-server" },
      },
      { env: { CLAUDE_PROJECT_DIR: ROOT, STUDIO_INGEST_URL: studio.url } },
    );
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioCommandBlocked");
    assert.equal(body.agent_type, "engineer");
    assert.match(body.reason, /^`pkill`/);
  } finally {
    studio.close();
  }
});
