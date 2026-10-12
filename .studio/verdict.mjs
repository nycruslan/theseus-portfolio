// SubagentStop hook for the reviewers: Lens, Probe and Iris (see .claude/settings.json). Their report
// must open with its verdict, which is recorded against the commit under review, so the merge gate
// (gate.mjs) can tell whether it still covers the code being handed on.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const VERDICT = /^verdict:\s*(ship|changes|blocked)\b(.*)/i;
const SCORE = /(\d+(?:\.\d+)?)\s*\/\s*10\b/;

/** Where this session's verdicts are kept, outside the repository and the team's reach. */
export function ledgerPath(sessionId) {
  const id = String(sessionId).replace(/[^\w-]/g, "");
  return join(tmpdir(), `theseus-verdicts-${id}.jsonl`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hook = JSON.parse(readFileSync(0, "utf8"));
  const found =
    verdictIn(hook.last_assistant_message) ??
    verdictIn(handback(hook.agent_transcript_path));
  if (!found && !hook.stop_hook_active) {
    console.error(
      "Start your report with `Verdict: ship`, `Verdict: changes` or `Verdict: blocked` on its own line.",
    );
    process.exit(2);
  }
  // Asked once already: record the missing verdict rather than loop.
  const entry = {
    role: hook.agent_type,
    agentId: hook.agent_id,
    ...(found ?? { verdict: "none" }),
    head: headOf(hook.cwd),
    at: Date.now(),
  };
  appendFileSync(ledgerPath(hook.session_id), `${JSON.stringify(entry)}\n`);
}

// The verdict line is one of the report's first three lines; markdown around it is fine.
function verdictIn(report = "") {
  const lines = report.split("\n").filter((line) => line.trim());
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
