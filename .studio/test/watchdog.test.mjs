import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { answer, ingest, runHook, tempDir } from "./kit.mjs";

// Payloads are shaped like the examples in https://code.claude.com/docs/en/hooks.
const common = {
  session_id: "abc123",
  transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
  cwd: "/repo",
  permission_mode: "auto",
};
const agent = (subagent_type, name) => ({
  ...common,
  hook_event_name: "PreToolUse",
  tool_name: "Agent",
  tool_input: {
    description: `Brief ${subagent_type}`,
    prompt: "Sprint 3: …",
    subagent_type,
    ...(name && { name }),
  },
  tool_use_id: "toolu_01",
});
const send = (to) => ({
  ...common,
  hook_event_name: "PreToolUse",
  tool_name: "SendMessage",
  tool_input: { to, message: "Lens asked for changes: …", summary: "Fix" },
  tool_use_id: "toolu_02",
});
const started = (agent_type, agent_id) => ({
  ...common,
  hook_event_name: "SubagentStart",
  agent_type,
  agent_id,
});
const created = (task_id, task_subject) => ({
  ...common,
  hook_event_name: "TaskCreated",
  task_id,
  task_subject,
});
const completed = (task_id) => ({
  ...common,
  hook_event_name: "TaskCompleted",
  task_id,
  task_subject: "",
});
const used = (tool_name, tool_input) => ({
  ...common,
  hook_event_name: "PostToolUse",
  tool_name,
  tool_input,
  tool_response: {},
  tool_use_id: "toolu_03",
});
const stop = (extra = {}) => ({
  ...common,
  hook_event_name: "Stop",
  stop_hook_active: false,
  last_assistant_message: "Waiting for Forge's revised contract.",
  background_tasks: [],
  session_crons: [],
  ...extra,
});

/** One session: the watchdog's runs share its tmpdir, where the verdict ledger can be seeded. */
function session(verdicts = [], env = {}) {
  const tmp = tempDir();
  const lines = verdicts.map((entry) => `${JSON.stringify(entry)}\n`);
  writeFileSync(join(tmp, "theseus-verdicts-abc123.jsonl"), lines.join(""));
  const run = (payload) => {
    const result = runHook("watchdog.mjs", payload, {
      env: { TMPDIR: tmp, ...env },
    });
    return { ...result, answer: answer(result) };
  };
  return { run, all: (...payloads) => payloads.map(run).at(-1) };
}

// Sprint 01 up to its end: tasks 4 and 5 still open, the lead waiting on Forge.
const SPRINT_01 = [
  created("1", "[lead] Boot sprint 1: design tokens"),
  completed("1"),
  created("2", "[product-owner] Write ticket for design tokens"),
  agent("product-owner", "quill"),
  completed("2"),
  created("3", "[engineer] Propose contract for design tokens"),
  agent("engineer", "forge"),
  completed("3"),
  created("4", "[qa-engineer] Review the design tokens contract"),
  agent("qa-engineer", "probe"),
  created("5", "[engineer] Revise contract per QA (round 1)"),
];

test("W1 holds a sprint that stops with open tasks and nothing shipped", () => {
  const { all } = session();
  const { code, answer } = all(...SPRINT_01, stop());
  assert.equal(code, 0);
  assert.equal(answer.decision, "block");
  assert.match(
    answer.reason,
    /^Watchdog: 2 tasks are still open \(#4 \[qa-engineer\] Review the design tokens contract; #5 \[engineer\] Revise contract per QA \(round 1\)\)/,
  );
  assert.match(answer.reason, /resume its owner now/);
  assert.match(
    answer.reason,
    /not-shipped report in the PR and an entry in \.studio\/STATE\.md/,
  );
});

test("W1 lets Claude Code's own continuation through, so it holds only once", () => {
  const { all } = session();
  const { answer } = all(...SPRINT_01, stop({ stop_hook_active: true }));
  assert.equal(answer, null);
});

test("W1 never holds a session waiting on background work or a wake-up", () => {
  const forge = {
    id: "task-7",
    type: "subagent",
    status: "running",
    agent_type: "engineer",
  };
  const wake = {
    id: "cron-1",
    schedule: "*/5 * * * *",
    recurring: true,
    prompt: "check CI",
  };
  for (const extra of [
    { background_tasks: [forge] },
    { session_crons: [wake] },
    // No task registry: it can't tell, so it lets the session be.
    { background_tasks: undefined },
  ]) {
    const { all } = session();
    assert.equal(
      all(...SPRINT_01, stop(extra)).answer,
      null,
      JSON.stringify(extra),
    );
  }
});

test("W1 lets a sprint end once it shipped or wrote itself up", () => {
  for (const closing of [
    used("Bash", { command: "gh pr merge 14 --squash --auto" }),
    used("Bash", { command: "gh pr ready 14" }),
    used("mcp__github__merge_pull_request", {
      owner: "o",
      repo: "r",
      pullNumber: 14,
    }),
    used("Write", { file_path: "/repo/.studio/STATE.md", content: "…" }),
    used("Edit", {
      file_path: "/repo/.studio/STATE.md",
      old_string: "a",
      new_string: "b",
    }),
    used("Bash", {
      command: "cat >> .studio/STATE.md <<'EOF'\n## Sprint 1: not shipped\nEOF",
    }),
  ]) {
    const { all } = session();
    const { answer } = all(...SPRINT_01, closing, stop());
    assert.equal(answer, null, JSON.stringify(closing.tool_input));
  }
  const { all } = session();
  const undo = used("Bash", { command: "gh pr merge 14 --disable-auto" });
  assert.equal(all(...SPRINT_01, undo, stop()).answer.decision, "block");
});

test("W1 counts completed and deleted tasks as closed", () => {
  const { all } = session();
  const deleted = used("TaskUpdate", { taskId: "5", status: "deleted" });
  assert.equal(all(...SPRINT_01, completed("4"), deleted, stop()).answer, null);
});

test("W1 leaves sessions that never convened the team alone", () => {
  const { all } = session();
  const { answer } = all(created("1", "Tidy the README"), stop());
  assert.equal(answer, null);
});

test("W1 escalates a second stall and puts each fire on air", async () => {
  const studio = await ingest();
  try {
    const { all, run } = session([], { STUDIO_INGEST_URL: studio.url });
    all(...SPRINT_01, stop());
    const { answer } = run(stop());
    assert.match(
      answer.reason,
      /^Watchdog, stall 2 this session: 2 tasks are still open/,
    );
    assert.match(answer.reason, /add the needs-owner label, then end/);
    const posts = await studio.until(2);
    assert.deepEqual(
      posts.map(({ body }) => [
        body.hook_event_name,
        body.watchdog.rule,
        body.watchdog.fire,
      ]),
      [
        ["StudioWatchdog", "W1", 1],
        ["StudioWatchdog", "W1", 2],
      ],
    );
  } finally {
    studio.close();
  }
});

const verdict = (head, verdict, agentId = `lens-${head}`) => ({
  role: "code-reviewer",
  agentId,
  verdict,
  head: `${head}000000000000000000000000000000000000`.slice(0, 40),
});

test("W2 allows two fix rounds", () => {
  const { all } = session([
    verdict("aaaaaaa", "changes"),
    verdict("bbbbbbb", "blocked"),
  ]);
  const { answer } = all(agent("engineer", "forge"), send("forge"));
  assert.equal(answer, null);
});

test("W2 refuses a third fix round, by spawn or by message", () => {
  const rounds = [
    verdict("aaaaaaa", "changes"),
    verdict("bbbbbbb", "changes"),
    verdict("ccccccc", "none"),
  ];
  const { run } = session(rounds);
  for (const payload of [
    started("engineer", "agent-a4d2c8f1e0b3a297"),
    agent("engineer", "forge"),
    send("forge"),
    send("a4d2c8f1e0b3a297"),
    agent("creative-engineer"),
  ]) {
    const { answer } = run(payload);
    if (payload.hook_event_name === "SubagentStart") continue;
    const decision = answer?.hookSpecificOutput;
    assert.equal(
      decision?.permissionDecision,
      "deny",
      JSON.stringify(payload.tool_input),
    );
    assert.equal(decision.hookEventName, "PreToolUse");
    assert.match(
      decision.permissionDecisionReason,
      /^Watchdog: two fix rounds are used and review still says no \(3 reviewed commits without a ship: aaaaaaa, bbbbbbb, ccccccc\)\. Cut scope, or stop and write it up/,
    );
  }
});

test("W2 still lets the lead brief reviewers and message anyone else", () => {
  const rounds = ["aaaaaaa", "bbbbbbb", "ccccccc"].map((h) =>
    verdict(h, "changes"),
  );
  const { run } = session(rounds);
  for (const payload of [
    agent("code-reviewer", "lens-4"),
    agent("qa-engineer"),
    send("lens-4"),
    send("main"),
    send("someone-unknown"),
  ]) {
    assert.equal(run(payload).answer, null, JSON.stringify(payload.tool_input));
  }
});

test("W2 counts one round per reviewed commit, and ships don't count", () => {
  const verdicts = [
    verdict("aaaaaaa", "changes", "lens-perf"),
    verdict("aaaaaaa", "changes", "lens-security"),
    { ...verdict("aaaaaaa", "blocked"), role: "qa-engineer" },
    verdict("bbbbbbb", "changes"),
    verdict("ccccccc", "ship"),
    verdict("ddddddd", "ship"),
  ];
  const { run } = session(verdicts);
  assert.equal(run(agent("engineer", "forge")).answer, null);
});

test("W2 escalates a repeat refusal and puts it on air", async () => {
  const studio = await ingest();
  try {
    const rounds = ["aaaaaaa", "bbbbbbb", "ccccccc"].map((h) =>
      verdict(h, "changes"),
    );
    const { run } = session(rounds, { STUDIO_INGEST_URL: studio.url });
    run(agent("engineer", "forge"));
    const { answer } = run(send("forge"));
    assert.match(
      answer.hookSpecificOutput.permissionDecisionReason,
      /Refused 2 times now/,
    );
    const posts = await studio.until(2);
    assert.deepEqual(
      posts.map(({ body }) => [body.watchdog.rule, body.watchdog.fire]),
      [
        ["W2", 1],
        ["W2", 2],
      ],
    );
  } finally {
    studio.close();
  }
});

test("fails open on a payload it can't read", () => {
  const { code, stdout } = runHook("watchdog.mjs", "not json");
  assert.equal(code, 0);
  assert.equal(stdout, "");
});
