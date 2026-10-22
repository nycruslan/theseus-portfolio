// W1, the stalled-stop watchdog (see .claude/settings.json). A routine never resumes a session, so
// a lead that stops to wait for a role ("Waiting for Forge…") ends the run. A session that brought
// in the team and is about to stop with its own tasks still open, nothing merged and no STATE.md
// entry is held once with guidance, and a second stall gets the escalation. It never holds a
// session waiting on background work or a wake-up, or one Claude Code is already continuing
// (stop_hook_active). The other events only feed a per-session ledger in tmpdir. It's
// deterministic (no model calls) and fails open: a rule it can't evaluate doesn't fire. Each fire
// goes on air as StudioWatchdog.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { broadcast } from "./post.mjs";

// A merge counts when a command ran merge.mjs and its output says it merged: merge.mjs prints
// "Merged PR #<n> …" only then. Its exit code isn't enough, since `… || true` or a pipe after it
// succeeds either way.
const RUNS_MERGE = /(^|[;&|\n]\s*)node\s+(\S*\/)?\.crew\/merge\.mjs\s+\d+/;
const MERGED = /^Merged PR #\d+ /m;
const STATE_FILE = /(^|\/)\.crew\/STATE\.md$/;
// A shell append or write to it: `>> .crew/STATE.md`, `tee -a …/.crew/STATE.md`.
const STATE_WRITE = /(>|\btee(\s+-a)?)\s*\S*\.crew\/STATE\.md\b/;
const SHOWN = 3;

let hook;
try {
  hook = JSON.parse(readFileSync(0, "utf8"));
  watch(hook);
} catch {
  // Fails open: the watchdog guides, it doesn't gate.
}

function watch(event) {
  switch (event.hook_event_name) {
    case "SubagentStart":
      return note({ team: event.agent_type });
    case "TaskCreated":
      // A subagent's own tasks aren't the lead's to close.
      if (!event.agent_id)
        note({ task: String(event.task_id), subject: event.task_subject });
      return;
    case "TaskCompleted":
      if (!event.agent_id) note({ taskDone: String(event.task_id) });
      return;
    case "PostToolUse":
      return recordTool(
        event.tool_name,
        event.tool_input ?? {},
        event.tool_response ?? {},
      );
    case "Stop":
      return stalledStop(event);
  }
}

function recordTool(tool, input, result) {
  const command = String(input.command ?? "");
  if (tool === "TaskUpdate" && input.status === "deleted") {
    note({ taskDone: String(input.taskId ?? input.task_id) });
  }
  if (RUNS_MERGE.test(command) && MERGED.test(String(result.stdout ?? ""))) {
    note({ shipped: true });
  }
  if (
    STATE_FILE.test(String(input.file_path ?? "")) ||
    STATE_WRITE.test(command)
  ) {
    note({ wroteState: true });
  }
}

function stalledStop(event) {
  // Without the task registry the session may be waiting on work it can't see, so let it be.
  if (event.stop_hook_active || !Array.isArray(event.background_tasks)) return;
  if (event.background_tasks.length || event.session_crons?.length) return;
  const entries = readLedger();
  if (!entries.some((entry) => entry.team)) return;
  if (entries.some((entry) => entry.shipped || entry.wroteState)) return;
  const done = new Set(entries.map((entry) => entry.taskDone).filter(Boolean));
  const open = new Map(
    entries
      .filter((entry) => entry.task && !done.has(entry.task))
      .map((entry) => [entry.task, entry]),
  );
  if (!open.size) return;
  const fire = entries.filter((entry) => entry.fired).length + 1;
  const listed = [...open.values()]
    .slice(0, SHOWN)
    .map(({ task, subject }) => `#${task} ${subject ?? ""}`.trim())
    .join("; ");
  const tasks = `${open.size} task${open.size === 1 ? " is" : "s are"} still open (${listed}${open.size > SHOWN ? "; …" : ""})`;
  const reason =
    fire === 1
      ? `Watchdog: ${tasks}, and nothing has shipped or been written up this session. If you are waiting on someone's work, resume its owner now: nothing wakes you once you stop. Otherwise end with a not-shipped report in the PR and an entry in .crew/STATE.md.`
      : `Watchdog, stall ${fire} this session: ${tasks}, and still nothing shipped or written up. Stop waiting. Write the not-shipped report in the PR and .crew/STATE.md now, add the needs-owner label, then end.`;
  note({ fired: "W1" });
  broadcast({
    ...hook,
    hook_event_name: "StudioWatchdog",
    watchdog: { rule: "W1", fire, reason },
  });
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

function ledgerPath() {
  const id = String(hook.session_id).replace(/[^\w-]/g, "");
  return join(tmpdir(), `theseus-watchdog-${id}.jsonl`);
}

function readLedger() {
  if (!existsSync(ledgerPath())) return [];
  return readFileSync(ledgerPath(), "utf8")
    .split("\n")
    .flatMap((line) => {
      try {
        return line ? [JSON.parse(line)] : [];
      } catch {
        return [];
      }
    });
}

function note(fields) {
  appendFileSync(
    ledgerPath(),
    `${JSON.stringify({ ...fields, at: Date.now() })}\n`,
  );
}
