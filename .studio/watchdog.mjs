// The team's watchdog: deterministic rules on the hook stream, no model calls (see
// .claude/settings.json). It keeps a per-session ledger in tmpdir, beside the verdicts, and puts
// every fire on air as StudioWatchdog.
// - W1, stalled stop (Stop): a sprint session that is about to end with tasks still open, nothing
//   merged or marked ready, and no STATE.md entry is held once with guidance; a second stall in
//   the session gets the escalation. It never holds a session that is waiting on background work
//   or a scheduled wake-up, or one Claude Code is already continuing (stop_hook_active).
// - W2, fix-round cap (PreToolUse on Agent and SendMessage): once two fix rounds are used and
//   review still says no, it refuses to send the work back to a builder. A round is one reviewed
//   commit with a verdict other than ship, from the verdict ledger.
// The other events only feed the ledger. It fails open: a rule it can't evaluate doesn't fire.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { broadcast } from "./post.mjs";
import { readCommand } from "./shell.mjs";
import { readLedger } from "./verdict.mjs";

const TEAM = new Set([
  "product-owner",
  "researcher",
  "design-director",
  "engineer",
  "creative-engineer",
  "code-reviewer",
  "qa-engineer",
]);
const BUILDERS = new Set(["engineer", "creative-engineer"]);
const FIX_ROUNDS = 2;
const SHIPPED = /\bgh\s+pr\s+(merge|ready)\b(?![^;&|\n]*--(undo|disable-auto))/;
const STATE = /(^|\/)\.studio\/STATE\.md$/;
const SHOWN = 3;

let hook;
try {
  hook = JSON.parse(readFileSync(0, "utf8"));
  watch(hook);
} catch {
  // Fails open: the watchdog guides, it doesn't gate.
}

function watch(event) {
  const input = event.tool_input ?? {};
  switch (event.hook_event_name) {
    case "SubagentStart":
      if (BUILDERS.has(event.agent_type)) note({ builder: event.agent_id });
      return;
    case "TaskCreated":
      return note({ task: String(event.task_id), subject: event.task_subject });
    case "TaskCompleted":
      return note({ taskDone: String(event.task_id) });
    case "PostToolUse":
      return recordTool(event.tool_name, input, event.cwd);
    case "PreToolUse":
      return capFixRounds(event.tool_name, input);
    case "Stop":
      return stalledStop(event);
  }
}

function recordTool(tool, input, cwd) {
  if (tool === "TaskUpdate" && input.status === "deleted") {
    note({ taskDone: String(input.taskId ?? input.task_id) });
  } else if (tool === "mcp__github__merge_pull_request") {
    note({ shipped: true });
  } else if (tool === "Bash") {
    const command = String(input.command ?? "");
    if (SHIPPED.test(command)) note({ shipped: true });
    const { writes } = readCommand(command, cwd);
    if (writes.some(({ path }) => STATE.test(path))) note({ wroteState: true });
  } else if (STATE.test(String(input.file_path ?? ""))) {
    note({ wroteState: true });
  }
}

// W2. Two fix rounds at most: the third non-ship round means cut scope or stop.
function capFixRounds(tool, input) {
  const builder =
    tool === "Agent"
      ? BUILDERS.has(input.subagent_type)
      : isBuilder(String(input.to ?? ""));
  if (tool === "Agent" && TEAM.has(input.subagent_type)) {
    note({ team: input.subagent_type });
    if (builder && input.name) note({ builder: input.name });
  }
  if (!builder) return;
  const rounds = nonShipRounds();
  if (rounds.length <= FIX_ROUNDS) return;
  const fire = fires("W2") + 1;
  const reason = [
    `Watchdog: two fix rounds are used and review still says no (${rounds.length} reviewed commits without a ship: ${rounds.join(", ")}).`,
    "Cut scope, or stop and write it up: what shipped, what didn't and why, in the PR and .studio/STATE.md.",
    fire > 1
      ? `Refused ${fire} times now: don't send the work back to a builder again.`
      : "Don't send the work back to a builder again.",
  ].join(" ");
  fired("W2", fire, reason);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

// W1. Sprint 01 ended this way: the lead said "Waiting for Forge…", stopped, and nothing woke it.
function stalledStop(event) {
  const waiting = [event.background_tasks, event.session_crons];
  // Without the task registry the session may be waiting on work it can't see, so let it be.
  if (event.stop_hook_active || !Array.isArray(event.background_tasks)) return;
  if (waiting.some((list) => Array.isArray(list) && list.length)) return;
  const entries = readWatch();
  if (!entries.some((entry) => entry.team)) return;
  if (entries.some((entry) => entry.shipped || entry.wroteState)) return;
  const open = openTasks(entries);
  if (!open.length) return;
  const fire = fires("W1") + 1;
  const tasks = `${open.length} task${open.length === 1 ? " is" : "s are"} still open (${open
    .slice(0, SHOWN)
    .map(({ task, subject }) => `#${task} ${subject ?? ""}`.trim())
    .join("; ")}${open.length > SHOWN ? "; …" : ""})`;
  const reason =
    fire === 1
      ? `Watchdog: ${tasks}, and nothing has shipped or been written up this session. If you are waiting on someone's work, resume its owner now: nothing wakes you once you stop. Otherwise end with a not-shipped report in the PR and an entry in .studio/STATE.md.`
      : `Watchdog, stall ${fire} this session: ${tasks}, and still nothing shipped or written up. Stop waiting. Write the not-shipped report in the PR and .studio/STATE.md now, add the needs-owner label, then end.`;
  fired("W1", fire, reason);
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
}

function isBuilder(to) {
  const id = plain(to);
  return readWatch().some(
    (entry) => entry.builder && plain(entry.builder) === id,
  );
}

// Agent IDs appear with and without an "agent-" prefix; names are matched as given.
function plain(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/^agent-/, "");
}

// Each reviewed commit with a verdict other than ship. A verdict with no recorded commit is its own
// round.
function nonShipRounds() {
  const open = new Set();
  for (const entry of readLedger(hook.session_id)) {
    if (!("verdict" in entry) || entry.verdict === "ship") continue;
    open.add(entry.head?.slice(0, 7) ?? `a review by ${entry.agentId}`);
  }
  return [...open];
}

function openTasks(entries) {
  const done = new Set(entries.map((entry) => entry.taskDone).filter(Boolean));
  const created = new Map();
  for (const entry of entries) {
    if (entry.task && !done.has(entry.task)) created.set(entry.task, entry);
  }
  return [...created.values()];
}

function fires(rule) {
  return readWatch().filter((entry) => entry.fired === rule).length;
}

function fired(rule, fire, reason) {
  note({ fired: rule });
  broadcast({
    ...hook,
    hook_event_name: "StudioWatchdog",
    watchdog: { rule, fire, reason },
  });
}

function ledgerPath() {
  const id = String(hook.session_id).replace(/[^\w-]/g, "");
  return join(tmpdir(), `theseus-watchdog-${id}.jsonl`);
}

function readWatch() {
  const path = ledgerPath();
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
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
