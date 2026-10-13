// SubagentStart and SubagentStop hook for the reviewers: Lens, Probe and Iris (see
// .claude/settings.json). It notes the commit each reviewer starts (or is resumed) on, and records
// the verdict their report opens with against that commit:
// - as a GitHub commit status (theseus/lens, theseus/probe, theseus/iris), the only form the merge
//   gate (gate.mjs) counts. It lives on GitHub, so it survives resumed sessions, cloud VMs and
//   routines. This hook is the harness's own process, not an agent's Bash call, which is why it
//   may post statuses while the guard refuses agents that try;
// - in this session's ledger, written first, which the watchdog's fix-round cap counts and which
//   is never evidence for a merge.
// Only an explicit `Verdict: ship|changes|blocked` line is posted. Lens always reviews, so a Lens
// report without one is sent back once. Probe and Iris also write contracts and give direction, so
// they are reminded once and may then stop without a verdict, which posts nothing.
// Posting fails open: a reviewer is never held up because GitHub is.

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
import { api, configure, repoOf } from "./github.mjs";

/** The commit status each reviewer's verdict is posted as. */
export const CONTEXTS = {
  "code-reviewer": "theseus/lens",
  "qa-engineer": "theseus/probe",
  "design-director": "theseus/iris",
};
const VERDICT = /^verdict:\s*(ship|changes|blocked)\b(.*)/i;
const SCORE = /(\d+(?:\.\d+)?)\s*\/\s*10\b/;
// GitHub refuses a status description longer than this.
const DESCRIPTION_LENGTH = 140;

/** This session's ledger, kept outside the repository: reviewer starts and the verdicts given. */
export function readLedger(sessionId) {
  const path = ledgerPath(sessionId);
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

/** A status description: one line, short enough for GitHub. */
function statusText(text) {
  const line = String(text).split("\n")[0].trim();
  return line.length > DESCRIPTION_LENGTH
    ? `${line.slice(0, DESCRIPTION_LENGTH - 1)}…`
    : line;
}

function ledgerPath(sessionId) {
  const id = String(sessionId).replace(/[^\w-]/g, "");
  return join(tmpdir(), `theseus-verdicts-${id}.jsonl`);
}

// Run as the hook, not imported by the gate. Node reports this module by its real path, while
// argv keeps the path Claude Code called, which may go through a symlink.
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const hook = JSON.parse(readFileSync(0, "utf8"));
  const { agent_type: role, agent_id: agentId, session_id: session } = hook;
  // Inside the hook's own 45 s, so a slow GitHub can't get the hook killed first.
  configure({ timeout: 25_000 });
  const record = (fields) => {
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
        role === "code-reviewer"
          ? "Start your report with `Verdict: ship`, `Verdict: changes` or `Verdict: blocked` on its own line."
          : "If this was a review, end it with a report that opens with `Verdict: ship`, `Verdict: changes` or `Verdict: blocked` on its own line; otherwise stop again.",
      );
      process.exit(2);
    }
    const ledger = readLedger(session);
    const start = ledger.findLast(
      (entry) => entry.agentId === agentId && "started" in entry,
    );
    const head = start?.started ?? null;
    if (!found) {
      // Asked once already: not a review, or one without a verdict. Nothing is posted for it.
      record({ verdict: "none", head, status: "not posted: no verdict" });
    } else {
      // The verdict is on record before GitHub is asked, so the watchdog counts it even if
      // posting is slow or fails. The outcome follows as its own line.
      const given = { ...found, head };
      record(given);
      record({ statusOf: head, status: postStatus(hook, ledger, given) });
    }
  }
}

// One status per reviewer role and commit, so several reviewers in one role (say, Lens on
// performance and Lens on security) share it: it fails while any of them still says no, and its
// description is the line of the verdict that decides it.
function postStatus(hook, ledger, given) {
  if (!given.head) return "not posted: the reviewed commit is unknown";
  const repo = repoOf(hook.cwd);
  if (!repo) return "not posted: the checkout has no origin remote";
  const latest = latestPerReviewer([
    ...ledger.filter(
      (entry) =>
        entry.role === hook.agent_type &&
        entry.head === given.head &&
        entry.verdict !== "none",
    ),
    { ...given, agentId: hook.agent_id },
  ]);
  const open = latest.filter((entry) => entry.verdict !== "ship");
  const decisive = open.at(-1) ?? given;
  try {
    api(`repos/${repo}/statuses/${given.head}`, {
      method: "POST",
      fields: {
        state: open.length ? "failure" : "success",
        context: CONTEXTS[hook.agent_type],
        description: statusText(decisive.line),
      },
      cwd: hook.cwd,
    });
    return "posted";
  } catch (error) {
    return `not posted: ${statusText(error.message)}`;
  }
}

/** Each reviewer's latest verdict among these entries. */
function latestPerReviewer(entries) {
  return [
    ...new Map(
      entries
        .filter((entry) => "verdict" in entry)
        .map((entry) => [entry.agentId, entry]),
    ).values(),
  ];
}

// The verdict line is one of the report's first three lines; markdown around it is fine.
function verdictIn(report) {
  const lines = String(report ?? "")
    .split("\n")
    .filter((line) => line.trim());
  for (const line of lines.slice(0, 3)) {
    const plain = line.replace(/[*_`#>]/g, "").trim();
    const match = plain.match(VERDICT);
    if (!match) continue;
    const score = match[2].match(SCORE)?.[1];
    return {
      verdict: match[1].toLowerCase(),
      line: plain,
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
