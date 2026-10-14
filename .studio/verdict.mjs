// SubagentStart and SubagentStop hook for the reviewers: Lens, Probe and Iris (see
// .claude/settings.json). It notes the commit each reviewer starts (or is resumed) on, and records
// the verdict their report opens with against that commit:
// - as a comment on the pull request whose head it reviewed, with a machine-readable marker
//   (verdictComment). That's what the merge gate (gate.mjs) reads. It lives on GitHub, so it
//   survives resumed sessions, cloud VMs and routines, and comments are a write the cloud's GitHub
//   proxy allows. This hook is the harness's own process, not an agent's Bash call, which is why it
//   may post the marker while the guard refuses agents that try;
// - as a GitHub commit status (theseus/lens, theseus/probe, theseus/iris), best effort: it shows
//   on the commit in GitHub's UI and the gate counts it when a role has no comment, but the cloud
//   proxy refuses commit statuses, so a refusal is only noted;
// - in this session's ledger, written first, which the watchdog's fix-round cap counts and which
//   is never evidence for a merge.
// Only an explicit `Verdict: ship|changes|blocked` line is posted. Lens always reviews, so a Lens
// report without one is sent back once. Probe and Iris also write contracts and give direction, so
// they are reminded once and may then stop without a verdict, which posts nothing. A verdict needs
// an open PR to land on: when there's none, the reviewer is told at the start so its report can say
// so, and the stop notes it for the owner.
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
/** The reviewers by name, as the team and the comments call them. */
export const NAMES = {
  "code-reviewer": "Lens",
  "qa-engineer": "Probe",
  "design-director": "Iris",
};
const VERDICT = /^verdict:\s*(ship|changes|blocked)\b(.*)/i;
const SCORE = /(\d+(?:\.\d+)?)\s*\/\s*10\b/;
// GitHub refuses a status description longer than this.
const DESCRIPTION_LENGTH = 140;
// A verdict comment's human line stays one readable line.
const LINE_LENGTH = 300;
// The marker the gate reads: one HTML comment, invisible on GitHub, with the role, the verdict and
// the full commit it is about. The guard refuses agent commands that carry this word.
const MARKER = /<!--\s*theseus-verdict\s+v1\s+([^>]*?)\s*-->/;
const SHA = /^[0-9a-f]{40}$/;

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

/**
 * A verdict comment's body: a line people read, then the marker the gate reads.
 * @param verdict the role's verdict on `head`: ship, changes or blocked.
 * @param line the verdict line of the report that decides it.
 */
export function verdictComment({ role, verdict, head, line, score }) {
  // The quoted line is the reviewer's own text: it may not open or close an HTML comment, or it
  // could carry a marker of its own. Angle brackets go entirely, since stripping `<!--` once
  // leaves `<!-<!---` as a fresh one.
  const said = oneLine(String(line).replace(/[<>]/g, ""), LINE_LENGTH);
  const fields = [
    `role=${role}`,
    `verdict=${verdict}`,
    `head=${head}`,
    ...(score === undefined ? [] : [`score=${score}`]),
  ];
  return `${NAMES[role]}: ${verdict} on ${head.slice(0, 7)} — ${said}\n\n<!-- theseus-verdict v1 ${fields.join(" ")} -->`;
}

/**
 * The verdict a comment carries, or null when it has no well-formed marker: { role, verdict, head,
 * line, score }, where line is the verdict line it quotes.
 */
export function readVerdictComment(body) {
  const text = String(body ?? "");
  // The hook writes the marker last, after the quoted line, so the last one is the hook's.
  const found = [...text.matchAll(new RegExp(MARKER, "g"))].at(-1);
  if (!found) return null;
  const fields = Object.fromEntries(
    [...found[1].matchAll(/(\w+)=(\S+)/g)].map(([, key, value]) => [
      key,
      value,
    ]),
  );
  const { role, verdict, head } = fields;
  if (
    !CONTEXTS[role] ||
    !["ship", "changes", "blocked"].includes(verdict) ||
    !SHA.test(head ?? "")
  ) {
    return null;
  }
  const first = text.split("\n")[0];
  const quoted = first.split(" — ").slice(1).join(" — ").trim();
  const score = Number(fields.score);
  return {
    role,
    verdict,
    head,
    line: quoted || `Verdict: ${verdict}`,
    ...(Number.isFinite(score) && { score }),
  };
}

/** A status description: one line, short enough for GitHub. */
function statusText(text) {
  return oneLine(text, DESCRIPTION_LENGTH);
}

function oneLine(text, length) {
  const line = String(text).split("\n")[0].trim();
  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
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
  // A stop makes four calls at most (find the PR, then the comment and the status), so each is
  // capped well inside the hook's own 45 s and a slow GitHub can't get the hook killed first.
  configure({ timeout: 9_000 });
  const record = (fields) => {
    const entry = { role, agentId, ...fields, at: Date.now() };
    appendFileSync(ledgerPath(session), `${JSON.stringify(entry)}\n`);
  };
  if (hook.hook_event_name === "SubagentStart") {
    const head = headOf(hook.cwd);
    record({ started: head });
    warnWithoutPr(hook, head);
  } else {
    stop(hook, record);
  }
}

function stop(hook, record) {
  const { agent_type: role, agent_id: agentId, session_id: session } = hook;
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
    return;
  }
  // The verdict is on record before GitHub is asked, so the watchdog counts it even if posting is
  // slow or fails. Each outcome follows as its own line.
  const given = { ...found, head };
  record(given);
  const decided = decide(hook, ledger, given);
  const comment = postComment(hook, decided);
  record({ commentOf: head, ...comment });
  record({ statusOf: head, status: postStatus(hook, decided) });
  if (comment.missingPr) {
    // A SubagentStop hook can't reach the lead; the reviewer was told at its start, so its report
    // carries this too. The owner sees it here.
    console.log(
      JSON.stringify({
        systemMessage: `${NAMES[role]}'s verdict on ${head.slice(0, 7)} wasn't posted: ${comment.comment.replace(/^not posted: /, "")}. Atlas: open the PR before reviews, then ask for a fresh review of its head.`,
      }),
    );
  }
}

// One verdict per reviewer role and commit, so several reviewers in one role (say, Lens on
// performance and Lens on security) share it: it says no while any of them still says no, and it
// quotes the line of the verdict that decides it. Known race, left as it is: two reviewers of one
// role stopping within a second of each other can each decide before the other's verdict reaches
// the ledger, and their comments may then land in either order, so the later ship may stand. The
// statuses had the same race. Reviewers in one role on one commit are rare, and a fresh review
// settles it.
function decide(hook, ledger, given) {
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
  return {
    role: hook.agent_type,
    head: given.head,
    verdict: decisive.verdict,
    line: decisive.line,
    score: decisive.score,
  };
}

// The comment the gate reads, on the open PR whose head was reviewed. Without a PR there's
// nowhere to put it, and the lead must open one first.
function postComment(hook, decided) {
  if (!decided.head)
    return { comment: "not posted: the reviewed commit is unknown" };
  const repo = repoOf(hook.cwd);
  if (!repo)
    return { comment: "not posted: the checkout has no origin remote" };
  try {
    const found = pullRequestFor(repo, decided.head, hook.cwd);
    if (!found.number) {
      return { comment: `not posted: ${found.none}`, missingPr: true };
    }
    api(`repos/${repo}/issues/${found.number}/comments`, {
      method: "POST",
      fields: { body: verdictComment(decided) },
      cwd: hook.cwd,
    });
    return { comment: "posted", pr: found.number };
  } catch (error) {
    return { comment: `not posted: ${statusText(error.message)}` };
  }
}

// Best effort: GitHub's UI shows it on the commit, and the gate counts it for a role that has no
// comment. The cloud proxy refuses it, which never fails the hook.
function postStatus(hook, decided) {
  if (!decided.head) return "not posted: the reviewed commit is unknown";
  const repo = repoOf(hook.cwd);
  if (!repo) return "not posted: the checkout has no origin remote";
  try {
    api(`repos/${repo}/statuses/${decided.head}`, {
      method: "POST",
      fields: {
        state: decided.verdict === "ship" ? "success" : "failure",
        context: CONTEXTS[decided.role],
        description: statusText(decided.line),
      },
      cwd: hook.cwd,
    });
    return "posted";
  } catch (error) {
    return `not posted: ${statusText(error.message)}`;
  }
}

/**
 * The open PR a verdict on `head` belongs to: { number }, or { none: why } when there's none. The
 * PR whose head it is comes first, then any open PR that contains it, then the open PR for the
 * checked-out branch when its head is this commit (GitHub can take a moment to link a commit
 * just pushed). Throws when GitHub can't be asked.
 */
export function pullRequestFor(repo, head, cwd) {
  const short = head.slice(0, 7);
  let pulls;
  try {
    pulls = api(`repos/${repo}/commits/${head}/pulls`, { cwd }) ?? [];
  } catch (error) {
    if (error.status === 404 || error.status === 422) {
      return { none: `GitHub doesn't have ${short}: push the branch` };
    }
    throw error;
  }
  const open = pulls.filter(({ state }) => state === "open");
  const pr = open.find((one) => one.head?.sha === head) ?? open[0];
  if (pr) return { number: pr.number };
  const branch = branchOf(cwd);
  if (branch) {
    const owner = repo.split("/")[0];
    const forBranch =
      api(`repos/${repo}/pulls?state=open&head=${owner}:${branch}`, { cwd }) ??
      [];
    const match = forBranch.find((one) => one.head?.sha === head);
    if (match) return { number: match.number };
  }
  return { none: `no open PR has ${short} on it yet` };
}

// Tells a reviewer at its start when its verdict will have nowhere to land, so its report says so
// and the lead opens the PR. Only what GitHub actually answered counts: when it can't be asked,
// nothing is said.
function warnWithoutPr(hook, head) {
  if (!head) return;
  const repo = repoOf(hook.cwd);
  if (!repo) return;
  let found;
  try {
    found = pullRequestFor(repo, head, hook.cwd);
  } catch {
    return;
  }
  if (found.number) return;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SubagentStart",
        additionalContext: `The merge gate reads review verdicts from comments on the pull request, and ${found.none}, so a verdict you give now can't be posted. If you give one, add this line right after it in your report: "Not posted: no open PR for ${head.slice(0, 7)}. Atlas: open the PR before review, then ask for a fresh review of its head."`,
      },
    }),
  );
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

// The verdict line is one of the report's first three lines; markdown around it is fine. A quoted
// line (`> Verdict: ship`) is someone else's verdict, not the reviewer's.
function verdictIn(report) {
  const lines = String(report ?? "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith(">"));
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
  return git(cwd, "rev-parse", "HEAD");
}

// The checked-out branch, or null when HEAD is detached.
function branchOf(cwd) {
  return git(cwd, "symbolic-ref", "--short", "-q", "HEAD");
}

function git(cwd, ...args) {
  try {
    return (
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}
