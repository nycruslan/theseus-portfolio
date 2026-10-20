// `node .studio/ready-pr.mjs <number>`: marks a sprint's draft PR ready for review once its
// close-out is pushed, then waits until GitHub says it is. The team's PRs open as drafts
// (open-pr.mjs), so nobody merges one while the team still works on it. REST can't mark a draft
// ready and cloud sessions can't reach GraphQL, so it asks .github/workflows/ready-pr.yml, which
// can, and polls every 5 s for up to 3 minutes. Run it with the Bash tool's timeout at 5 minutes.

import { setTimeout as sleep } from "node:timers/promises";
import { api, configure, repoOf, toplevel } from "./github.mjs";

const POLL_MS = Number(process.env.THESEUS_READY_PR_POLL_MS || 5_000);
const BUDGET_MS = Number(process.env.THESEUS_READY_PR_WAIT_MS || 180_000);
const WORKFLOW = "ready-pr.yml";
configure({ timeout: 15_000 });

const number = Number(process.argv[2]);
if (!Number.isInteger(number) || number < 1 || process.argv.length !== 3) {
  console.error(
    "Usage: node .studio/ready-pr.mjs <number>, with the bare PR number.",
  );
  process.exit(2);
}
const cwd = toplevel(process.cwd());
const repo = repoOf(cwd);
const read = () => api(`repos/${repo}/pulls/${number}`, { cwd });

try {
  let pr = read();
  if (pr.draft) {
    const { default_branch: base } = api(`repos/${repo}`, { cwd });
    api(`repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      cwd,
      body: { ref: base, inputs: { number: String(number) } },
    });
    const started = Date.now();
    while (pr.draft && Date.now() - started < BUDGET_MS) {
      await sleep(POLL_MS);
      pr = read();
    }
  }
  if (pr.draft) {
    const minutes = Math.round(BUDGET_MS / 60_000);
    console.error(
      `PR #${number} is still a draft after ${minutes} min: see ${WORKFLOW}'s runs. The owner can press "Ready for review".`,
    );
    process.exit(1);
  }
  console.log(`PR #${number} is ready for review: ${pr.html_url}`);
} catch (error) {
  console.error(`Couldn't mark PR #${number} ready: ${error.message}`);
  process.exit(1);
}
