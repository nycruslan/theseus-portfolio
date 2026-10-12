// SubagentStart and SubagentStop hook for the reviewers: Lens, Probe and Iris (see
// .claude/settings.json). It notes the commit each reviewer starts (or is resumed) on, and requires
// their report to open with its verdict, which is recorded against that commit. The merge gate
// (gate.mjs) can then tell whether a verdict still covers the code being handed on, even when a
// fix landed while the review ran.

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VERDICT = /^verdict:\s*(ship|changes|blocked)\b(.*)/i;
const SCORE = /(\d+(?:\.\d+)?)\s*\/\s*10\b/;

/** This session's ledger, kept outside the repository: reviewer starts and the verdicts given. */
export function readLedger(sessionId) {
  const path = ledgerPath(sessionId);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
}

function ledgerPath(sessionId) {
  const id = String(sessionId).replace(/[^\w-]/g, "");
  return join(tmpdir(), `theseus-verdicts-${id}.jsonl`);
}

// Run as the hook, not imported by the gate. Node reports this module by its real path, while
// argv keeps the path Claude Code called, which may go through a symlink.
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hook = JSON.parse(readFileSync(0, "utf8"));
  const record = (fields) => {
    const { agent_type: role, agent_id: agentId, session_id: session } = hook;
    const entry = { role, agentId, ...fields, at: Date.now() };
    appendFileSync(ledgerPath(session), `${JSON.stringify(entry)}\n`);
  };
  if (hook.hook_event_name === "SubagentStart") {
    record({ started: headOf(hook.cwd) });
  } else {
    const found =
      verdictIn(hook.last_assistant_message) ??
      verdictIn(handback(hook.agent_transcript_path));
    if (!found && !hook.stop_hook_active) {
      console.error(
        "Start your report with `Verdict: ship`, `Verdict: changes` or `Verdict: blocked` on its own line.",
      );
      process.exit(2);
    }
    // Asked once already: record the missing verdict rather than loop. Without a recorded start
    // the head is unknown, and the gate treats the verdict as stale.
    const start = readLedger(hook.session_id).findLast(
      (entry) => entry.agentId === hook.agent_id && "started" in entry,
    );
    record({ ...(found ?? { verdict: "none" }), head: start?.started ?? null });
  }
}

// The verdict line is one of the report's first three lines; markdown around it is fine.
function verdictIn(report) {
  const lines = String(report ?? "")
    .split("\n")
    .filter((line) => line.trim());
  for (const line of lines.slice(0, 3)) {
    const match = line
      .replace(/[*_`#>]/g, "")
      .trim()
      .match(VERDICT);
    if (!match) continue;
    const score = match[2].match(SCORE)?.[1];
    return {
      verdict: match[1].toLowerCase(),
      ...(score && { score: Number(score) }),
    };
  }
  return null;
}

// In auto mode a subagent delivers its report through SubagentHandback, and the hook's
// last_assistant_message holds only its closing text
// (https://code.claude.com/docs/en/hooks#subagentstop). The report is that call's message.
function handback(transcript) {
  let report;
  try {
    for (const line of readFileSync(transcript, "utf8").split("\n")) {
      if (!line.includes('"SubagentHandback"')) continue;
      for (const block of JSON.parse(line).message?.content ?? []) {
        if (block.name === "SubagentHandback") report = block.input?.message;
      }
    }
  } catch {
    // No transcript, or a line still being written: no handback to read.
  }
  return report;
}

function headOf(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
