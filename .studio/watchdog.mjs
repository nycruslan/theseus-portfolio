// The team's watchdog: deterministic rules on the hook stream, no model calls (see
// .claude/settings.json). It keeps a per-session ledger in tmpdir, beside the verdicts, and puts
// every fire on air as StudioWatchdog.
// - W1, stalled stop (Stop): a sprint session that is about to end with tasks still open, nothing
//   merged, and no STATE.md entry is held once with guidance; a second stall in the session gets
//   the escalation. It never holds a session that is waiting on background work or a scheduled
//   wake-up, or one Claude Code is already continuing (stop_hook_active). Only the lead's own
//   tasks count: those a subagent creates (TaskCreated with agent_id) aren't the lead's to close.
// - W2, fix-round cap (PreToolUse on Agent and SendMessage): two fix rounds at most, so a PR gets
//   three builder dispatches, and a fourth is refused after three review rounds that said no. A
//   round is the reviews between one builder dispatch and the next: however many commits they
//   looked at (a notes commit pushed between two reviews included), it counts once if any of them
//   gave an explicit `changes` or `blocked`. Reviews before the first dispatch (Probe writing the
//   contract, Iris giving direction) and reports without a verdict don't count. A later
//   `Verdict: ship` from Lens on the latest reviewed commit lifts the refusal, so the lead can
//   still send a builder to, say, resolve a merge conflict.
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
// merge.mjs exits non-zero unless it merged, and a failed command reaches PostToolUseFailure
// instead, so a PostToolUse for it means the PR merged.
const SHIPPED = /(^|[;&|\n]\s*)node\s+(\S*\/)?\.studio\/merge\.mjs\s+\d+/;
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
      if (event.agent_id) return;
      return note({ task: String(event.task_id), subject: event.task_subject });
    case "TaskCompleted":
      if (event.agent_id) return;
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
  } else if (tool.startsWith("mcp__") && /merge/i.test(tool)) {
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

// W2. Two fix rounds at most: the third round that says no means cut scope or stop.
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
  const verdicts = readLedger(hook.session_id).filter((entry) =>
    ["ship", "changes", "blocked"].includes(entry.verdict),
  );
  const rounds = roundsWithoutShip(verdicts);
  if (rounds.length <= FIX_ROUNDS || lensShipsNow(verdicts)) {
    note({ dispatch: true });
    return;
  }
  const fire = fires("W2") + 1;
  const reason = [
    `Watchdog: two fix rounds are used and review still says no (${rounds.length} review rounds without a ship, on ${rounds.join("; ")}).`,
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

// The review rounds that said no: between each builder dispatch and the next (the last one
// running to now), the commits that got `changes` or `blocked`. A verdict with no recorded commit
// names its reviewer instead.
function roundsWithoutShip(verdicts) {
  const dispatches = readWatch()
    .filter((entry) => entry.dispatch)
    .map((entry) => entry.at)
    .sort((a, b) => a - b);
  return dispatches.flatMap((from, i) => {
    const to = dispatches[i + 1] ?? Number.POSITIVE_INFINITY;
    const said = verdicts.filter(
      (entry) => entry.verdict !== "ship" && entry.at >= from && entry.at < to,
    );
    const heads = new Set(
      said.map(
        (entry) => entry.head?.slice(0, 7) ?? `a review by ${entry.agentId}`,
      ),
    );
    return heads.size ? [[...heads].join(", ")] : [];
  });
}

// Lens said ship on the latest reviewed commit, after the last review that said no.
function lensShipsNow(verdicts) {
  const latest = verdicts.at(-1);
  const lastNo = verdicts.findLast((entry) => entry.verdict !== "ship");
  const ship = verdicts.findLast(
    (entry) => entry.role === "code-reviewer" && entry.verdict === "ship",
  );
  return Boolean(
    ship &&
      latest &&
      ship.head === latest.head &&
      (!lastNo || ship.at > lastNo.at),
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
