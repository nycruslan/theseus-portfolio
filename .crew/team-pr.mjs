// `node .crew/team-pr.mjs <number> [--comment <file>] [--label <name>] [--title "<title>"]
// [--body <file>]`: comments on a team PR, labels it, or sets its title and body, as the team's
// checks app. In the cloud every GitHub call acts as the owner, so what a session writes on a PR
// itself shows the owner's name and avatar: #55's new title and its `review` label were the
// owner's, as is every comment a session posts. Written by the app (.github/workflows/team-pr.yml),
// it shows as the team's.
// It asks for the workflow, then polls every 5 s, for up to 3 minutes, until GitHub shows every
// change: the label on the PR, the title and body as given, and a comment by the app, made since
// it asked, with the file's text. What already shows isn't asked for. What doesn't show in
// time, or all of it if the workflow can't be asked for, it makes itself, under the owner's login,
// and says so: a sprint never waits on the app. It prints one line saying what it did, with the
// comment's URL when it posted one, else the PR's. open-pr.mjs sets an open PR's title and body
// through it too. Run it with the Bash tool's timeout at 5 minutes.

import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";

const POLL_MS = Number(process.env.THESEUS_TEAM_PR_POLL_MS || 5_000);
const BUDGET_MS = Number(process.env.THESEUS_TEAM_PR_WAIT_MS || 180_000);
const WORKFLOW = "team-pr.yml";
// The login on what the app writes, which the pre-flight trusts too (next-sprint.mjs).
const CHECKS_APP = "theseus-checks[bot]";
// The changes it makes, in the order its line names them.
const CHANGES = ["title", "body", "label", "comment"];

/**
 * Has the checks app make the changes on PR `number`, and makes those that don't show in time
 * under the owner's login. `wanted` holds any of title, body, label and comment, as text. Returns
 * the PR, the comment that carries the text when one was wanted, and which changes were there
 * already, came from the app, or came from the owner's login, and why.
 */
export async function teamPr({ repo, number, cwd, wanted }) {
  const target = { repo, number, cwd };
  let seen = { pr: readPr(target) };
  // The repository is public, and the team's name on a fork's PR would vouch for a stranger's
  // code. team-pr.yml refuses one too; this saves the wait and the owner's fallback.
  if (seen.pr.head?.repo?.full_name?.toLowerCase() !== repo.toLowerCase()) {
    throw new Error(
      `it isn't from a branch of ${repo}, and the team writes only on its own PRs`,
    );
  }
  const asked = CHANGES.filter((change) => wanted[change] !== undefined);
  const already = asked.filter((change) => shows(change, seen, wanted));
  const missing = asked.filter((change) => !already.includes(change));
  let reason;
  if (missing.length) {
    const answer = await fromApp(target, wanted, missing);
    seen = answer.seen ?? seen;
    reason = answer.reason;
  }
  const own = missing.filter((change) => !shows(change, seen, wanted));
  if (own.length) seen = makeOwn(target, wanted, own, seen);
  const app = missing.filter((change) => !own.includes(change));
  return { ...seen, wanted, already, app, own, reason };
}

/** What teamPr did, in the words after "PR #<n> has": "the review label from the checks app". */
export function outcome({ wanted, already, app, own, reason }) {
  return [
    already.length && `${named(already, wanted)} already`,
    app.length && `${named(app, wanted)} from the checks app`,
    own.length &&
      `${named(own, wanted)} under the owner's login, since ${reason}`,
  ]
    .filter(Boolean)
    .join(", and ");
}

// Asks for the workflow, then waits until every missing change shows. Returns what GitHub showed
// last, and why the rest didn't come.
async function fromApp(target, wanted, missing) {
  const { repo, number, cwd } = target;
  const { default_branch: base } = api(`repos/${repo}`, { cwd });
  // GitHub stamps a comment to the second.
  const since = Math.floor(Date.now() / 1000) * 1000;
  const inputs = Object.fromEntries(
    missing.map((change) => [change, wanted[change]]),
  );
  try {
    api(`repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      cwd,
      body: { ref: base, inputs: { number: String(number), ...inputs } },
    });
  } catch (error) {
    return { reason: `GitHub refused to start ${WORKFLOW} (${error.message})` };
  }
  const started = Date.now();
  for (;;) {
    await sleep(POLL_MS);
    const seen = {
      pr: readPr(target),
      comment: missing.includes("comment")
        ? appComment(target, since, wanted.comment)
        : undefined,
    };
    if (missing.every((change) => shows(change, seen, wanted))) return { seen };
    if (Date.now() - started >= BUDGET_MS) {
      const minutes = Math.round(BUDGET_MS / 60_000);
      return {
        seen,
        reason: `the checks app hadn't made it after ${minutes} min (see ${WORKFLOW}'s runs)`,
      };
    }
  }
}

// Makes the changes the app's run didn't, under the owner's login.
function makeOwn({ repo, number, cwd }, wanted, own, seen) {
  let { pr, comment } = seen;
  const fields = Object.fromEntries(
    own
      .filter((change) => change === "title" || change === "body")
      .map((change) => [change, wanted[change]]),
  );
  if (Object.keys(fields).length) {
    pr = api(`repos/${repo}/pulls/${number}`, {
      method: "PATCH",
      cwd,
      body: fields,
    });
  }
  if (own.includes("label")) {
    api(`repos/${repo}/issues/${number}/labels`, {
      method: "POST",
      cwd,
      body: { labels: [wanted.label] },
    });
  }
  if (own.includes("comment")) {
    comment = api(`repos/${repo}/issues/${number}/comments`, {
      method: "POST",
      cwd,
      body: { body: wanted.comment },
    });
  }
  return { pr, comment };
}

function readPr({ repo, number, cwd }) {
  return api(`repos/${repo}/pulls/${number}`, { cwd });
}

// The app's comment with the text, made since the request: not another login's, nor one from
// before, which an identical earlier comment would be.
function appComment({ repo, number, cwd }, since, text) {
  return list(`repos/${repo}/issues/${number}/comments?per_page=100`, {
    cwd,
  }).find(
    ({ user, created_at: at, body }) =>
      user?.login === CHECKS_APP &&
      Date.parse(at) >= since &&
      normal(body) === normal(text),
  );
}

// Whether GitHub shows the change: a label of that name on the PR, the title or body as asked,
// or the app's comment.
function shows(change, { pr, comment }, wanted) {
  if (change === "comment") return Boolean(comment);
  if (change === "label") {
    const label = wanted.label.toLowerCase();
    return pr.labels.some(({ name }) => name.toLowerCase() === label);
  }
  return normal(pr[change]) === normal(wanted[change]);
}

// Text as GitHub may hand it back, with CRLF line endings or without the outer whitespace.
function normal(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function named(changes, { label }) {
  const has = (change) => changes.includes(change);
  const fields = ["title", "body"].filter(has).join(" and ");
  const names = [
    fields && `the new ${fields}`,
    has("label") && `the ${label} label`,
    has("comment") && "the comment",
  ].filter(Boolean);
  const last = names.pop();
  return names.length ? `${names.join(", ")} and ${last}` : last;
}

async function main() {
  configure({ timeout: 15_000 });
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        comment: { type: "string" },
        label: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
    });
  } catch {
    // An unknown option, or one without its value: the usage line below says what's expected.
  }
  const { values: options = {}, positionals = [] } = args ?? {};
  const number = Number(positionals[0]);
  const given = Object.values(options);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    positionals.length !== 1 ||
    !given.length ||
    given.some((value) => !value.trim())
  ) {
    console.error(
      'Usage: node .crew/team-pr.mjs <number> [--comment <file>] [--label <name>] [--title "<title>"] [--body <file>], with at least one of them.',
    );
    process.exit(2);
  }
  const cwd = toplevel(process.cwd());
  const repo = repoOf(cwd);
  try {
    const file = (path) => readFileSync(resolve(cwd, path), "utf8");
    const wanted = {
      ...(options.title && { title: options.title.trim() }),
      ...(options.body && { body: file(options.body) }),
      ...(options.label && { label: options.label.trim() }),
      ...(options.comment && { comment: file(options.comment) }),
    };
    // The workflow takes an empty input for one not given, and GitHub takes no empty comment.
    for (const change of ["body", "comment"]) {
      if (wanted[change]?.trim() === "") {
        throw new Error(`${options[change]} is empty`);
      }
    }
    const result = await teamPr({ repo, number, cwd, wanted });
    console.log(
      `PR #${number} has ${outcome(result)}: ${(result.comment ?? result.pr).html_url}`,
    );
  } catch (error) {
    console.error(`Couldn't write on PR #${number}: ${error.message}`);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
