// `node .crew/open-pr.mjs --head <branch> --title "<title>" --body <file>`: opens the branch's
// pull request into the default branch through the team's checks app, then sets its title and body.
// In the cloud every GitHub call acts as the owner, so a PR a session opens itself is the owner's,
// and nobody can approve their own PR: the owner could decide it only with the ruleset's bypass,
// which skips the required checks too. Opened by the app (.github/workflows/open-pr.yml), it's a PR
// the owner can approve, and then merge with every check run. Either way it opens as a draft, which
// nobody can merge until the team marks it ready at its close-out (ready-pr.mjs).
// It asks for the workflow, then polls every 5 s, for up to 3 minutes, until the PR is open. If the
// workflow can't be asked for or the PR doesn't come in time, it opens the PR itself, under the
// owner's login, and says so: a sprint never waits on the app. A branch that already has an open PR
// keeps it, with the new title and body. It prints "Opened PR #<n> …: <url>" once it opened one,
// the line emit.mjs sends the Studio. Run it with the Bash tool's timeout at 5 minutes.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { api, configure, repoOf, toplevel } from "./github.mjs";

const POLL_MS = Number(process.env.THESEUS_OPEN_PR_POLL_MS || 5_000);
const BUDGET_MS = Number(process.env.THESEUS_OPEN_PR_WAIT_MS || 180_000);
const WORKFLOW = "open-pr.yml";
configure({ timeout: 15_000 });

let options;
try {
  ({ values: options } = parseArgs({
    options: {
      head: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
    },
  }));
} catch {
  // An unknown option or a stray argument: the usage line below says what's expected.
}
if (!options?.head || !options.title?.trim() || !options.body) {
  console.error(
    'Usage: node .crew/open-pr.mjs --head <branch> --title "<title>" --body <file>',
  );
  process.exit(2);
}
const cwd = toplevel(process.cwd());
const repo = repoOf(cwd);
const { head } = options;
let fields;

try {
  fields = {
    title: options.title.trim(),
    body: readFileSync(resolve(cwd, options.body), "utf8"),
  };
  const { default_branch: base, owner } = api(`repos/${repo}`, { cwd });
  // Neither the app nor GitHub can open a PR from a branch that isn't on GitHub yet.
  if (!onGitHub()) {
    console.error(`${head} isn't on GitHub: push it, then open its PR.`);
    process.exit(1);
  }
  const query = new URLSearchParams({
    head: `${owner.login}:${head}`,
    state: "open",
  });
  const openPr = () => api(`repos/${repo}/pulls?${query}`, { cwd })[0];

  const existing = openPr();
  if (existing) {
    update(existing);
    console.log(
      `PR #${existing.number} was already open from ${head}; it has the new title and body: ${existing.html_url}`,
    );
  } else {
    const { pr: app, reason } = await fromApp(base, openPr);
    const { pr, own } = app ? { pr: app } : openOwn(base, openPr);
    if (!own) update(pr);
    console.log(
      own
        ? `Opened PR #${pr.number} under the owner's login, since ${reason}. The owner can't approve it, so if it needs them they merge it with the bypass: ${pr.html_url}`
        : `Opened PR #${pr.number} through the checks app, so the owner can approve it: ${pr.html_url}`,
    );
  }
} catch (error) {
  console.error(`Couldn't open a PR from ${head}: ${error.message}`);
  process.exit(1);
}

// Asks for the workflow, then waits for the PR it opens. Without a PR, says why.
async function fromApp(base, openPr) {
  try {
    api(`repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      cwd,
      body: { ref: base, inputs: { branch: head } },
    });
  } catch (error) {
    return { reason: `GitHub refused to start ${WORKFLOW} (${error.message})` };
  }
  const started = Date.now();
  for (;;) {
    await sleep(POLL_MS);
    const pr = openPr();
    if (pr) return { pr };
    if (Date.now() - started >= BUDGET_MS) {
      const minutes = Math.round(BUDGET_MS / 60_000);
      return {
        reason: `the checks app hadn't opened it after ${minutes} min (see ${WORKFLOW}'s runs)`,
      };
    }
  }
}

// Opens the PR under the owner's login. The app's PR may land between the last poll and this
// call: then GitHub refuses a second one, and the app's is the one to keep.
function openOwn(base, openPr) {
  try {
    const pr = api(`repos/${repo}/pulls`, {
      method: "POST",
      cwd,
      body: { ...fields, head, base, draft: true },
    });
    return { pr, own: true };
  } catch (error) {
    const late = error.status === 422 && openPr();
    if (!late) throw error;
    return { pr: late };
  }
}

function onGitHub() {
  try {
    return Boolean(api(`repos/${repo}/branches/${head}`, { cwd }));
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

function update({ number }) {
  api(`repos/${repo}/pulls/${number}`, { method: "PATCH", cwd, body: fields });
}
