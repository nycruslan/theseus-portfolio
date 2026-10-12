import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { gitRepo, runHook, tempDir } from "./kit.mjs";

const { dir: repo, shas } = gitRepo({ "app/page.tsx": "page" });

// A SubagentStop payload, shaped like https://code.claude.com/docs/en/hooks#subagentstop-input.
function stop(agent, message, extra = {}) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: repo,
    permission_mode: "default",
    hook_event_name: "SubagentStop",
    stop_hook_active: false,
    agent_id: "def456",
    agent_type: agent,
    agent_transcript_path: "/missing/agent-def456.jsonl",
    last_assistant_message: message,
    background_tasks: [],
    session_crons: [],
    ...extra,
  };
}

function verdict(payload) {
  const tmp = tempDir();
  const result = runHook("verdict.mjs", payload, { env: { TMPDIR: tmp } });
  const ledger = join(tmp, "theseus-verdicts-abc123.jsonl");
  const entries = existsSync(ledger)
    ? readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse)
    : [];
  return { ...result, entries };
}

test("records a verdict against the reviewed commit", () => {
  const { code, entries } = verdict(
    stop("code-reviewer", "Verdict: ship\n\nNo findings."),
  );
  assert.equal(code, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].role, "code-reviewer");
  assert.equal(entries[0].agentId, "def456");
  assert.equal(entries[0].verdict, "ship");
  assert.equal(entries[0].head, shas[0]);
});

test("reads markdown around the verdict and Iris's score", () => {
  const { entries } = verdict(
    stop("design-director", "## Critique\n**Verdict: Changes** · 6.8/10\n…"),
  );
  assert.equal(entries[0].verdict, "changes");
  assert.equal(entries[0].score, 6.8);
});

test("sends a report without a verdict back", () => {
  const { code, stderr, entries } = verdict(
    stop(
      "qa-engineer",
      "All checks pass.\n\n1. pass\n2. pass\n\nVerdict: ship",
    ),
  );
  assert.equal(code, 2);
  assert.match(stderr, /Start your report with `Verdict: ship`/);
  assert.equal(entries.length, 0);
});

test("reads the report a background reviewer handed back", () => {
  const transcript = join(tempDir(), "agent-def456.jsonl");
  // A transcript line as Claude Code writes it, with the report in SubagentHandback's input.
  const handback = {
    isSidechain: true,
    agentId: "def456",
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "toolu_01",
          name: "SubagentHandback",
          input: { message: "Verdict: blocked\n\nContract check 2 fails." },
        },
      ],
    },
  };
  writeFileSync(transcript, `${JSON.stringify(handback)}\n{"partial`);
  const { code, entries } = verdict(
    stop("qa-engineer", "Handed back.", { agent_transcript_path: transcript }),
  );
  assert.equal(code, 0);
  assert.equal(entries[0].verdict, "blocked");
});

test("records a still-missing verdict as none instead of looping", () => {
  const { code, entries } = verdict(
    stop("code-reviewer", "Looks fine.", { stop_hook_active: true }),
  );
  assert.equal(code, 0);
  assert.equal(entries[0].verdict, "none");
});
