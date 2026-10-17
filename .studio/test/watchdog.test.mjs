import assert from "node:assert/strict";
import { test } from "node:test";
import { answer, ingest, runHook, tempDir } from "./kit.mjs";

// Payloads are shaped like the examples in https://code.claude.com/docs/en/hooks.
const common = {
  session_id: "abc123",
  transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
  cwd: "/repo",
  permission_mode: "auto",
};
const agent = (agent_type) => ({
  ...common,
  hook_event_name: "SubagentStart",
  agent_type,
  agent_id: `${agent_type}-1`,
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
const used = (tool_name, tool_input, tool_response = {}) => ({
  ...common,
  hook_event_name: "PostToolUse",
  tool_name,
  tool_input,
  tool_response,
  tool_use_id: "toolu_03",
});
/** What merge.mjs prints: the merged line only once GitHub merged. */
const MERGED_OUT = {
  stdout:
    "Merged PR #14 (4ead4ea) as 5a1e5a1: https://github.com/nycruslan/theseus-portfolio/pull/14\n",
  stderr: "",
};
const REFUSED_OUT = {
  stdout: "Waiting on PR #14 at 4ead4ea: check go, gate go, lens pending.\n",
  stderr: "NO-GO for PR #14: lens never reported on 4ead4ea.\n",
};
const stop = (extra = {}) => ({
  ...common,
  hook_event_name: "Stop",
  stop_hook_active: false,
  last_assistant_message: "Waiting for Forge's revised contract.",
  background_tasks: [],
  session_crons: [],
  ...extra,
});

/** One session: the watchdog's runs share its tmpdir, where its ledger lives. */
function session(env = {}) {
  const tmp = tempDir();
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
  agent("product-owner"),
  completed("2"),
  created("3", "[engineer] Propose contract for design tokens"),
  agent("engineer"),
  completed("3"),
  created("4", "[qa-engineer] Review the design tokens contract"),
  agent("qa-engineer"),
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
    used("Bash", { command: "node .studio/merge.mjs 14" }, MERGED_OUT),
    used("Bash", { command: "node ../../.studio/merge.mjs 14" }, MERGED_OUT),
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
  // Only a merge that happened counts: not a command that mentions merge.mjs, nor one that ran it
  // and succeeded anyway (`|| true`, a pipe) when it didn't merge.
  for (const notShipped of [
    used("Bash", {
      command:
        'echo "next: node .studio/merge.mjs 14" >> .studio/sprint/1/notes.md',
    }),
    used("Bash", { command: "node .studio/merge.mjs 14 || true" }, REFUSED_OUT),
    used(
      "Bash",
      { command: "node .studio/merge.mjs 14 | tail -5" },
      REFUSED_OUT,
    ),
    used("Bash", { command: 'echo "Merged PR #14 (x)"' }, MERGED_OUT),
  ]) {
    const { all } = session();
    const { answer } = all(...SPRINT_01, notShipped, stop());
    assert.equal(answer?.decision, "block", notShipped.tool_input.command);
  }
});

test("W1 counts only the lead's own tasks, not those a subagent creates", () => {
  const { all } = session();
  const theirs = (event) => ({ ...event, agent_id: "a4d2c8f1e0b3a297" });
  const { answer } = all(
    created("1", "[lead] Run sprint 3"),
    agent("engineer"),
    theirs(created("7", "Forge: wire the hero")),
    theirs(created("8", "Forge: check the focus ring")),
    completed("1"),
    stop(),
  );
  assert.equal(answer, null);
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
    const { all, run } = session({ STUDIO_INGEST_URL: studio.url });
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

test("fails open on a payload it can't read", () => {
  const { code, stdout } = runHook("watchdog.mjs", "not json", {
    env: { TMPDIR: tempDir() },
  });
  assert.equal(code, 0);
  assert.equal(stdout, "");
});
