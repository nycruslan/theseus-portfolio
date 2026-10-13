// SubagentStart and SubagentStop hook for the reviewers: Lens, Probe and Iris (see
// .claude/settings.json). It notes the commit each reviewer starts (or is resumed) on, and requires
// their report to open with its verdict. The verdict is recorded against that commit twice:
// - as a GitHub commit status (theseus/lens, theseus/probe, theseus/iris), which the merge gate and
//   branch protection read. It lives on GitHub, so it survives resumed sessions, cloud VMs and
//   routines. This hook runs outside the agents' permission rules, which is why it may call
//   `gh api` while the agents may not;
// - in this session's ledger, the fallback for when GitHub can't be reached or the commit was never
//   pushed, and the record of review rounds that the watchdog's fix-round cap counts.
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
  return readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
}

/** Each reviewer's latest verdict among these entries. */
export function latestPerReviewer(entries) {
  return [
    ...new Map(
      entries
        .filter((entry) => "verdict" in entry)
        .map((entry) => [entry.agentId, entry]),
    ).values(),
  ];
}

/** A status description: one line, short enough for GitHub. */
export function statusText(text) {
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
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hook = JSON.parse(readFileSync(0, "utf8"));
  const { agent_type: role, agent_id: agentId, session_id: session } = hook;
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
        "Start your report with `Verdict: ship`, `Verdict: changes` or `Verdict: blocked` on its own line.",
      );
      process.exit(2);
    }
    // Asked once already: record the missing verdict rather than loop. Without a recorded start
    // the head is unknown, and the gate treats the verdict as stale.
    const ledger = readLedger(session);
    const start = ledger.findLast(
      (entry) => entry.agentId === agentId && "started" in entry,
    );
    const given = {
      ...(found ?? {
        verdict: "none",
        line: "Verdict: none (the report gave none)",
      }),
      head: start?.started ?? null,
    };
    record({ ...given, status: postStatus(hook, ledger, given) });
  }
}

// One status per reviewer role and commit, so several reviewers in one role (say, Lens on
// performance and Lens on security) share it: it fails while any of them still says no, and its
// description is the line of the verdict that decides it.
function postStatus(hook, ledger, given) {
  if (!given.head) return "not posted: the reviewed commit is unknown";
  const onHead = ledger.filter(
    (entry) => entry.role === hook.agent_type && entry.head === given.head,
  );
  const latest = latestPerReviewer([
    ...onHead,
    { ...given, agentId: hook.agent_id },
  ]);
  const open = latest.filter((entry) => entry.verdict !== "ship");
  const decisive = open.at(-1) ?? given;
  try {
    execFileSync(
      "gh",
      [
        "api",
        "--method",
        "POST",
        `repos/{owner}/{repo}/statuses/${given.head}`,
        "-f",
        `state=${open.length ? "failure" : "success"}`,
        "-f",
        `context=${CONTEXTS[hook.agent_type]}`,
        "-f",
        `description=${statusText(decisive.line ?? `Verdict: ${decisive.verdict}`)}`,
      ],
      {
        cwd: hook.cwd,
        stdio: ["ignore", "ignore", "pipe"],
        timeout: 15_000,
      },
    );
    return "posted";
  } catch (error) {
    return `not posted: ${statusText(error.stderr?.toString() || error.message)}`;
  }
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
