// The one way the team merges a sprint PR: `node .studio/merge.mjs <number>`, from the repository.
// It works the same on a laptop and in a cloud session, because it talks to GitHub through REST
// alone (see github.mjs): the cloud's proxy refuses GraphQL, and with it `gh pr merge` and
// auto-merge. It:
// 1. runs the gate's roll call (gate.mjs) and stops at once on anything CI can't fix;
// 2. waits for CI on the head, polling its check runs and statuses every 15 s, and says what it's
//    waiting for. CI is done when every check that reported passed and every required one (the
//    base branch's, plus `check` and `scope`) reported; a check that never ran hasn't passed;
// 3. runs the roll call again on fresh data, posts any verdict carried over notes-only commits,
//    and squash-merges with `sha` set to the head it checked, so a push in between makes GitHub
//    refuse the merge rather than take unreviewed code;
// 4. puts the roll call on air as StudioGateChecked, merged or not.
// It fails closed: anything missing, red or unreadable is a NO-GO, with the reason, and exit 1.
// The guard (guard.mjs) refuses every other way to merge. Run it with the Bash tool's timeout at
// 10 minutes (600000 ms): the whole run is budgeted to 8 minutes, with each gh call capped at 15 s,
// so it reports before the Bash tool would kill it.

import { setTimeout as sleep } from "node:timers/promises";
import {
  ciItems,
  nogo,
  prState,
  requiredChecks,
  reviewItems,
} from "./gate.mjs";
import { api, configure, repoOf, toplevel } from "./github.mjs";
import { broadcast } from "./post.mjs";

const STARTED = Date.now();
const POLL_MS = Number(process.env.THESEUS_MERGE_POLL_MS || 15_000);
// The whole run, from start to the last poll: what's left of the Bash tool's 10 minutes covers the
// final roll call and the merge.
const BUDGET_MS = Number(process.env.THESEUS_MERGE_WAIT_MS || 480_000);
configure({ timeout: 15_000 });
// Print the wait at least this often, even when nothing changed.
const HEARTBEAT_MS = 60_000;

const [selector, ...extra] = process.argv.slice(2);
if (!/^[1-9]\d*$/.test(selector ?? "") || extra.length) {
  console.error(
    "Usage: node .studio/merge.mjs <number>, with the PR's bare number: no URL, no other repository, no options.",
  );
  process.exit(2);
}
const number = Number(selector);

// The checkout it runs in, from any directory inside it, and that checkout's GitHub repository.
let cwd;
let repo;
try {
  cwd = toplevel(process.cwd());
  repo = repoOf(cwd);
} catch {
  // Reported below.
}

let result;
try {
  if (!repo) throw new Error("this checkout has no GitHub origin remote");
  result = await merge();
} catch (error) {
  const note = `The gate couldn't check PR #${number} (${String(error.message).trim()}).`;
  result = { pr: number, items: [nogo("gate", "check", note)] };
}
finish(result);

async function merge() {
  let pr = api(`repos/${repo}/pulls/${number}`, { cwd });
  const head = pr.head.sha;
  const required = requiredChecks({ repo, base: pr.base.ref, cwd });
  const review = reviewItems({ pr, repo, cwd });
  const early = [...prState(pr), ...review].filter(isNogo);
  if (early.length) {
    return {
      pr: number,
      head,
      items: [...early, ...ciItems({ repo, head, required, cwd })],
    };
  }

  let said = "";
  let lastSaid = 0;
  let ci = ciItems({ repo, head, required, cwd });
  while (!settled(ci, pr) && Date.now() + POLL_MS < STARTED + BUDGET_MS) {
    const line = waiting(ci, pr);
    if (line !== said || Date.now() - lastSaid >= HEARTBEAT_MS) {
      console.log(line);
      said = line;
      lastSaid = Date.now();
    }
    await sleep(POLL_MS);
    pr = api(`repos/${repo}/pulls/${number}`, { cwd });
    if (pr.head.sha !== head) {
      const note = `The branch moved from ${head.slice(0, 7)} to ${pr.head.sha.slice(0, 7)} while CI ran: get the new head reviewed, then run this again.`;
      return { pr: number, head, items: [nogo("GitHub", "check", note)] };
    }
    ci = ciItems({ repo, head, required, cwd });
  }
  const minutes = Math.round(BUDGET_MS / 60_000);
  ci = ci.map((item) =>
    item.state === "pending"
      ? nogo(
          item.who,
          "check",
          `${item.note} It didn't finish within ${minutes} minutes: run this again once it has.`,
        )
      : item,
  );

  // Fresh data for the decision itself: labels and verdicts may have changed while CI ran.
  const items = [...prState(pr), ...ci, ...reviewItems({ pr, repo, cwd })];
  if (items.some((item) => item.state !== "go"))
    return { pr: number, head, items };

  for (const { carried } of items) {
    if (!carried) continue;
    api(`repos/${repo}/statuses/${head}`, {
      method: "POST",
      fields: {
        state: "success",
        context: carried.context,
        description: carried.description.slice(0, 140),
      },
      cwd,
    });
  }
  try {
    const merged = api(`repos/${repo}/pulls/${number}/merge`, {
      method: "PUT",
      fields: { merge_method: "squash", sha: head },
      cwd,
    });
    return { pr: number, head, items, merged: merged.sha, url: pr.html_url };
  } catch (error) {
    const note = `GitHub refused the merge: ${error.message}${error.status ? ` (HTTP ${error.status})` : ""}.`;
    return {
      pr: number,
      head,
      items: [...items, nogo("GitHub", "check", note)],
    };
  }
}

// CI is done when every required check reported and nothing still runs, or as soon as anything
// failed.
// GitHub works out whether the PR merges cleanly in the background; null means not yet.
function settled(ci, pr) {
  if (ci.some(isNogo)) return true;
  return ci.every((item) => item.state === "go") && pr.mergeable !== null;
}

function waiting(ci, pr) {
  const open = ci
    .filter((item) => item.state === "pending")
    .map((item) => item.who);
  const done = ci.length - open.length;
  const what = open.length
    ? `${open.join(", ")} still running; ${done} of ${ci.length} done`
    : "GitHub is still working out whether it merges cleanly";
  return `Waiting for CI on PR #${number} at ${pr.head.sha.slice(0, 7)}: ${what} (${clock(Date.now() - STARTED)} of ${clock(BUDGET_MS)}).`;
}

function finish({ pr, head, items, merged, url }) {
  const pass = Boolean(merged);
  broadcast({
    ...(process.env.CLAUDE_CODE_SESSION_ID && {
      session_id: process.env.CLAUDE_CODE_SESSION_ID,
    }),
    cwd: cwd ?? process.cwd(),
    hook_event_name: "StudioGateChecked",
    gate: { target: "merge", pr, head, items, pass },
  });
  if (pass) {
    console.log(
      `Merged PR #${pr} (${head.slice(0, 7)}) as ${merged.slice(0, 7)}: ${url}`,
    );
    return;
  }
  const notes = items.filter((item) => item.state !== "go");
  console.error(
    [`NO-GO for PR #${pr}:`, ...notes.map((item) => `- ${item.note}`)].join(
      "\n",
    ),
  );
  process.exitCode = 1;
}

function isNogo(item) {
  return item.state === "nogo";
}

function clock(ms) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
