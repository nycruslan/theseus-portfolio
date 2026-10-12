import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { gitRepo, runHook, STUDIO, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const git = (...args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

// A SubagentStart payload, shaped like https://code.claude.com/docs/en/hooks#subagentstart-input.
function start(agent) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: repo,
    hook_event_name: "SubagentStart",
    agent_id: "def456",
    agent_type: agent,
  };
}

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

/** One session: run the hook on payloads in turn, then read its ledger. */
function session() {
  const tmp = tempDir();
  return {
    run: (payload, script = "verdict.mjs") =>
      runHook(script, payload, { env: { TMPDIR: tmp } }),
    entries() {
      const ledger = join(tmp, "theseus-verdicts-abc123.jsonl");
      return existsSync(ledger)
        ? readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse)
        : [];
    },
  };
}

function verdict(payload, script) {
  const one = session();
  return { ...one.run(payload, script), entries: one.entries() };
}

const commit = (message) =>
  git("commit", "--allow-empty", "--quiet", "--message", message);

test("records a verdict against the commit the review started on", () => {
  const reviewed = git("rev-parse", "HEAD");
  const review = session();
  assert.equal(review.run(start("code-reviewer")).stderr, "");
  commit("a fix lands while the review runs");
  const { code } = review.run(
    stop("code-reviewer", "Verdict: ship\n\nNo findings."),
  );
  assert.equal(code, 0);
  const [started, given] = review.entries();
  assert.equal(started.started, reviewed);
  assert.equal(given.role, "code-reviewer");
  assert.equal(given.agentId, "def456");
  assert.equal(given.verdict, "ship");
  assert.equal(given.head, reviewed);
});

test("a resumed review covers the commit it resumed on", () => {
  const review = session();
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", "Verdict: changes"));
  commit("the fix");
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", "Verdict: ship"));
  assert.equal(review.entries().at(-1).head, git("rev-parse", "HEAD"));
});

test("records no head when the review's start wasn't recorded", () => {
  const { entries } = verdict(stop("code-reviewer", "Verdict: ship"));
  assert.equal(entries[0].head, null);
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
  for (const closing of ["Handed back.", null]) {
    const { code, entries } = verdict(
      stop("qa-engineer", closing, { agent_transcript_path: transcript }),
    );
    assert.equal(code, 0);
    assert.equal(entries[0].verdict, "blocked");
  }
});

test("records a still-missing verdict as none instead of looping", () => {
  const { code, entries } = verdict(
    stop("code-reviewer", "Looks fine.", { stop_hook_active: true }),
  );
  assert.equal(code, 0);
  assert.equal(entries[0].verdict, "none");
});

test("runs when the project path goes through a symlink", () => {
  const link = join(tempDir(), "project");
  symlinkSync(STUDIO, link);
  const { entries } = verdict(
    stop("code-reviewer", "Verdict: ship"),
    join(link, "verdict.mjs"),
  );
  assert.equal(entries[0]?.verdict, "ship");
});
