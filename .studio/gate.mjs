// The merge gate's roll call: whether a sprint PR may merge, item by item, read from GitHub alone.
// merge.mjs runs it before and after waiting for CI; nothing else merges (see guard.mjs). A PR
// may merge only when:
// - GitHub can merge it: open, not a draft, no conflicts;
// - CI passed on the PR head;
// - the PR stays on the team's side: no owner paths, scripts or weakened tests (scope.mjs);
// - nothing waits for the owner: the PR never carried needs-owner;
// - the reviewers it needs said ship about the code being merged: Lens always, Probe when the e2e
//   checks changed, and Iris or Probe whenever they weighed in on the PR (Iris is advisory until
//   calibrated, so she isn't required otherwise). A verdict counts only as its theseus/<role>
//   status on GitHub (verdict.mjs posts them). One given on an earlier commit of the PR carries
//   to the head only when every commit since touched notes alone.
// It never says go from local state: a ledger in tmpdir can be written by anyone on the machine.
// Layered defence, not a security boundary: the team acts as the owner's GitHub identity, so it
// could post these statuses itself. What makes CI and scope binding is branch protection that
// requires those checks from GitHub Actions; the theseus/* statuses rely on the hooks.

import { spawnSync } from "node:child_process";
import { list } from "./github.mjs";
import { checkScope } from "./scope.mjs";
import { CONTEXTS } from "./verdict.mjs";

const NAMES = {
  "code-reviewer": "Lens",
  "qa-engineer": "Probe",
  "design-director": "Iris",
};
const E2E = /^e2e(\/|$)/iu;
// Commits that only touch the team's notes, memory or roadmap don't make a review stale. The
// pathspecs are anchored at the top of the checkout, so they mean the same from any directory.
const PRODUCT = [
  "--",
  ":(top)",
  ":(top,exclude).studio/sprint",
  ":(top,exclude).studio/STATE.md",
  ":(top,exclude).claude/agent-memory",
  ":(top,exclude)ROADMAP.md",
];
const PASSED = new Set(["success", "neutral", "skipped"]);
const RUNNING = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending",
]);

/** GitHub's own view: whether the PR can merge at all. */
export function prState(pr) {
  if (pr.merged)
    return [nogo("GitHub", "check", `PR #${pr.number} is already merged.`)];
  if (pr.state !== "open") {
    return [nogo("GitHub", "check", `PR #${pr.number} is ${pr.state}.`)];
  }
  if (pr.draft) {
    return [
      nogo(
        "GitHub",
        "check",
        `PR #${pr.number} is a draft, and REST can't mark it ready: ask the owner to, or open it again as a normal PR that says "work in progress" in its body.`,
      ),
    ];
  }
  if (pr.mergeable === false || pr.mergeable_state === "dirty") {
    return [
      nogo(
        "GitHub",
        "check",
        `PR #${pr.number} conflicts with ${pr.base?.ref ?? "its base"}: merge it into the branch, push, review the result, and run again.`,
      ),
    ];
  }
  return [];
}

/**
 * CI on the head: every check run and commit status except the reviewers' verdicts. Pending while
 * anything runs or nothing has reported yet.
 */
export function ciItems({ repo, head, cwd }) {
  const runs = list(`repos/${repo}/commits/${head}/check-runs?per_page=100`, {
    key: "check_runs",
    cwd,
  });
  const statuses = list(`repos/${repo}/commits/${head}/status?per_page=100`, {
    key: "statuses",
    cwd,
  }).filter(({ context }) => !isVerdict(context));
  const items = [
    ...runs.map(({ name, status, conclusion }) =>
      RUNNING.has(status)
        ? pending(name, `${name} is still running.`)
        : PASSED.has(conclusion)
          ? go(name, "check")
          : nogo(
              name,
              "check",
              `${name} failed (${conclusion}): fix it on the branch.`,
            ),
    ),
    ...statuses.map(({ context, state }) =>
      state === "pending"
        ? pending(context, `${context} is still running.`)
        : state === "success"
          ? go(context, "check")
          : nogo(
              context,
              "check",
              `${context} failed (${state}): fix it on the branch.`,
            ),
    ),
  ];
  return items.length
    ? items
    : [pending("CI", "CI hasn't reported on this commit yet.")];
}

/** Everything but CI: scope, the owner's hold and the verdicts. */
export function reviewItems({ pr, repo, cwd }) {
  const { files, notes } = checkScope({
    repo,
    number: pr.number,
    base: pr.base.sha,
    head: pr.head.sha,
    cwd,
  });
  return [
    ...notes.map((note) => nogo("owner", "decision", note)),
    ...ownerHold({ pr, repo, cwd }),
    ...verdicts({ pr, repo, files, cwd }),
  ];
}

// Every gh call runs as the owner, so removing the label can't be told apart from the owner's own
// decision. Once a PR has carried needs-owner, only the owner merges it.
function ownerHold({ pr, repo, cwd }) {
  const events = list(`repos/${repo}/issues/${pr.number}/events?per_page=100`, {
    cwd,
  });
  const held = [
    ...pr.labels.map(({ name }) => name),
    ...events
      .filter(({ event }) => event === "labeled")
      .map(({ label }) => label?.name),
  ];
  return held.includes("needs-owner")
    ? [
        nogo(
          "owner",
          "decision",
          "The PR has carried needs-owner, so the owner decides and merges it.",
        ),
      ]
    : [];
}

// The reviewers' statuses on each of the PR's commits, oldest first, the head last.
function verdicts({ pr, repo, files, cwd }) {
  const commits = list(
    `repos/${repo}/pulls/${pr.number}/commits?per_page=100`,
    {
      cwd,
    },
  ).map(({ sha }) => sha);
  if (commits.at(-1) !== pr.head.sha) commits.push(pr.head.sha);
  const history = commits.map((sha) => ({
    sha,
    statuses: new Map(
      list(`repos/${repo}/commits/${sha}/status?per_page=100`, {
        key: "statuses",
        cwd,
      })
        .filter(({ context }) => isVerdict(context))
        .map((status) => [status.context, status]),
    ),
  }));
  const e2e = files.some(
    ({ filename, previous_filename: from }) =>
      E2E.test(filename) || (from && E2E.test(from)),
  );
  return Object.keys(CONTEXTS).flatMap((role) => {
    const context = CONTEXTS[role];
    const weighedIn = history.some(({ statuses }) => statuses.has(context));
    const needed =
      role === "code-reviewer" || weighedIn || (role === "qa-engineer" && e2e);
    return needed ? [verdict(role, history, cwd)] : [];
  });
}

// A review of older code no longer stands once the product changed: the final verdict after a fix
// comes from a fresh review of the code being merged.
function verdict(role, history, cwd) {
  const who = NAMES[role];
  const context = CONTEXTS[role];
  const head = history.at(-1);
  const latest = history.findLast(({ statuses }) => statuses.has(context));
  if (!latest) {
    return nogo(
      who,
      "verdict",
      `${who}: no verdict on GitHub for this PR. Push the branch, then ask ${role} to review the pushed head.`,
    );
  }
  const status = latest.statuses.get(context);
  const short = latest.sha.slice(0, 7);
  if (status.state === "pending") {
    return pending(
      who,
      `${who} is still reviewing: wait for the verdict.`,
      "verdict",
    );
  }
  if (status.state !== "success") {
    return nogo(
      who,
      "verdict",
      `${who} said "${status.description}" on ${latest === head ? "this commit" : short}: resolve it and send it back for review.`,
    );
  }
  const score = scoreIn(status);
  if (latest === head) return { ...go(who, "verdict"), score };
  const since = changedSince(latest.sha, head.sha, cwd);
  if (since !== "notes") {
    return nogo(
      who,
      "verdict",
      since === "product"
        ? `${who} said ship on ${short}, and the product changed since: ask a fresh ${role} to review the head.`
        : `${who} said ship on ${short}, and git can't compare it with the head here: fetch the branch and run again.`,
    );
  }
  // GitHub requires the status on the head itself, so merge.mjs posts the carried verdict there.
  const carried = {
    context,
    from: latest.sha,
    description: `${status.description ?? "Verdict: ship"} (from ${short}; only notes changed since)`,
  };
  return { ...go(who, "verdict"), score, carried };
}

/** What changed from `from` to `head`, judged by git in the checkout: notes, product, or unknown. */
function changedSince(from, head, cwd) {
  const diff = spawnSync("git", ["diff", "--quiet", from, head, ...PRODUCT], {
    cwd,
    stdio: "ignore",
  });
  return { 0: "notes", 1: "product" }[diff.status] ?? "unknown";
}

function isVerdict(context) {
  return Object.values(CONTEXTS).includes(context);
}

function scoreIn({ description = "" }) {
  const score = String(description).match(/(\d+(?:\.\d+)?)\s*\/\s*10\b/)?.[1];
  return score ? Number(score) : undefined;
}

function go(who, kind) {
  return { who, kind, state: "go" };
}

function pending(who, note, kind = "check") {
  return { who, kind, state: "pending", note };
}

export function nogo(who, kind, note) {
  return { who, kind, state: "nogo", note };
}
