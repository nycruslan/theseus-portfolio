// The merge gate's roll call: whether a sprint PR may merge, item by item, read from GitHub alone.
// merge.mjs runs it before and after waiting for CI; nothing else merges (see guard.mjs). A PR
// may merge only when:
// - GitHub can merge it: open, not a draft, no conflicts;
// - CI passed on the PR head: every check that reported passed, and every check the base branch
//   requires, plus CI's `check` and `scope`, reported;
// - the PR stays on the team's side: no owner paths, scripts or weakened tests (scope.mjs);
// - nothing waits for the owner: the PR never carried needs-owner;
// - the reviewers it needs said ship about the code being merged: Lens always, Probe when the e2e
//   checks changed, and Iris or Probe whenever they weighed in on the PR (Iris is advisory until
//   calibrated, so she isn't required otherwise). A verdict counts as the verdict comment
//   verdict.mjs posts on the PR, from the repository's own people; the latest one per role and
//   commit stands. A role with no such comment on the PR falls back to its theseus/<role> commit
//   status, which local sessions can still post and the cloud's proxy refuses. One given on an
//   earlier commit of the PR carries to the head only when every commit since touched notes alone.
// It never says go from local state: a ledger in tmpdir can be written by anyone on the machine.
// Layered defence, not a security boundary: the team acts as the owner's GitHub identity, so it
// could post these comments or statuses itself, and the guard refuses the commands that try. A
// check is binding once the base branch's ruleset requires it from GitHub Actions (today `check`;
// `scope` once the owner adds it); the verdicts rely on the hooks.

import { spawnSync } from "node:child_process";
import { list } from "./github.mjs";
import { checkScope } from "./scope.mjs";
import { CONTEXTS, NAMES, readVerdictComment } from "./verdict.mjs";

// Anyone can comment on a public repository, so only the repository's own people speak for a
// reviewer: the owner, whose identity the team acts as, and members and collaborators.
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
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

// Checks this repository's own workflows report, required whatever the rules say: CI's job and
// the scope check.
const OWN_CHECKS = ["check", "scope"];

/**
 * The checks the base branch requires (its rulesets' required status checks), plus this
 * repository's own. A failure to read them throws: the gate fails closed.
 */
export function requiredChecks({ repo, base, cwd }) {
  const rules = list(
    `repos/${repo}/rules/branches/${encodeURIComponent(base)}`,
    {
      cwd,
    },
  );
  const named = rules
    .filter(({ type }) => type === "required_status_checks")
    .flatMap(({ parameters }) => parameters?.required_status_checks ?? [])
    .map(({ context }) => context);
  return [...new Set([...OWN_CHECKS, ...named])];
}

/**
 * CI on the head: every check run and commit status except the reviewers' verdicts. Pending while
 * anything runs, and while a required check hasn't reported at all: a check that never ran hasn't
 * passed. A cancelled run is pending while a newer run is queued, and a NO-GO otherwise.
 */
export function ciItems({ repo, head, required = [], cwd }) {
  const runs = list(`repos/${repo}/commits/${head}/check-runs?per_page=100`, {
    key: "check_runs",
    cwd,
  });
  const statuses = list(`repos/${repo}/commits/${head}/status?per_page=100`, {
    key: "statuses",
    cwd,
  }).filter(({ context }) => !isVerdict(context));
  const requeued =
    runs.some(({ conclusion }) => conclusion === "cancelled") &&
    list(`repos/${repo}/actions/runs?head_sha=${head}&per_page=100`, {
      key: "workflow_runs",
      cwd,
    }).some(({ status }) => RUNNING.has(status));
  const items = [
    ...runs.map(({ name, status, conclusion }) => {
      if (RUNNING.has(status))
        return pending(name, `${name} is still running.`);
      if (PASSED.has(conclusion)) return go(name, "check");
      if (conclusion === "cancelled") {
        return requeued
          ? pending(name, `${name} was cancelled, and a newer run is queued.`)
          : nogo(
              name,
              "check",
              `${name} was cancelled, and no newer run is queued: re-run it (push to re-run CI, or edit the PR's body to re-run scope), then run this again.`,
            );
      }
      return nogo(
        name,
        "check",
        `${name} failed (${conclusion}): fix it on the branch.`,
      );
    }),
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
  const reported = new Set(items.map(({ who }) => who));
  const missing = required
    .filter((name) => !reported.has(name))
    .map((name) =>
      pending(name, `${name} hasn't reported on this commit yet.`),
    );
  const all = [...items, ...missing];
  return all.length
    ? all
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

// The reviewers' verdicts on each of the PR's commits, oldest first, the head last: from the
// verdict comments, and from the theseus/* statuses for a role that has no comment.
function verdicts({ pr, repo, files, cwd }) {
  const commits = list(
    `repos/${repo}/pulls/${pr.number}/commits?per_page=100`,
    {
      cwd,
    },
  ).map(({ sha }) => sha);
  if (commits.at(-1) !== pr.head.sha) commits.push(pr.head.sha);
  const comments = commentVerdicts({ pr, repo, cwd });
  const history = commits.map((sha) => ({
    sha,
    comments: comments.get(sha) ?? new Map(),
    statuses: statusVerdicts({ repo, sha, cwd }),
  }));
  const commented = new Set(
    history.flatMap(({ comments: byRole }) => [...byRole.keys()]),
  );
  const e2e = files.some(
    ({ filename, previous_filename: from }) =>
      E2E.test(filename) || (from && E2E.test(from)),
  );
  return Object.keys(CONTEXTS).flatMap((role) => {
    const source = commented.has(role) ? "comments" : "statuses";
    const said = history.map((entry) => ({
      sha: entry.sha,
      verdict: entry[source].get(role),
    }));
    const weighedIn = said.some(({ verdict: one }) => one);
    const needed =
      role === "code-reviewer" || weighedIn || (role === "qa-engineer" && e2e);
    return needed ? [verdict(role, said, cwd)] : [];
  });
}

// The latest verdict comment per commit and role, from the repository's own people. Comments come
// oldest first, so a later one replaces an earlier one about the same commit.
function commentVerdicts({ pr, repo, cwd }) {
  const bySha = new Map();
  const comments = list(
    `repos/${repo}/issues/${pr.number}/comments?per_page=100`,
    { cwd },
  );
  for (const { body, author_association: association } of comments) {
    if (!TRUSTED.has(association)) continue;
    const found = readVerdictComment(body);
    if (!found) continue;
    if (!bySha.has(found.head)) bySha.set(found.head, new Map());
    bySha.get(found.head).set(found.role, {
      state: found.verdict === "ship" ? "success" : "failure",
      description: found.line,
      score: found.score,
    });
  }
  return bySha;
}

// The theseus/* statuses on one commit, by role.
function statusVerdicts({ repo, sha, cwd }) {
  const roles = Object.fromEntries(
    Object.entries(CONTEXTS).map(([role, context]) => [context, role]),
  );
  return new Map(
    list(`repos/${repo}/commits/${sha}/status?per_page=100`, {
      key: "statuses",
      cwd,
    })
      .filter(({ context }) => isVerdict(context))
      .map(({ context, state, description }) => [
        roles[context],
        { state, description, score: scoreIn(description) },
      ]),
  );
}

// A review of older code no longer stands once the product changed: the final verdict after a fix
// comes from a fresh review of the code being merged.
function verdict(role, said, cwd) {
  const who = NAMES[role];
  const context = CONTEXTS[role];
  const head = said.at(-1);
  const latest = said.findLast(({ verdict: one }) => one);
  if (!latest) {
    return nogo(
      who,
      "verdict",
      `${who}: no verdict on GitHub for this PR. Open the PR and push the branch, then ask ${role} to review the pushed head.`,
    );
  }
  const given = latest.verdict;
  const short = latest.sha.slice(0, 7);
  if (given.state === "pending") {
    return pending(
      who,
      `${who} is still reviewing: wait for the verdict.`,
      "verdict",
    );
  }
  if (given.state !== "success") {
    return nogo(
      who,
      "verdict",
      `${who} said "${given.description}" on ${latest === head ? "this commit" : short}: resolve it and send it back for review.`,
    );
  }
  const { score } = given;
  if (latest === head) return { ...go(who, "verdict"), score };
  const covered = covers(latest.sha, head.sha, cwd);
  if (covered !== true) {
    return nogo(
      who,
      "verdict",
      covered === false
        ? `${who} said ship on ${short}, and the product changed since: ask a fresh ${role} to review the head.`
        : `${who} said ship on ${short}, and git can't compare it with the head here: fetch the branch and run again.`,
    );
  }
  // merge.mjs puts the carried verdict on the head as a status too, best effort, so GitHub's UI
  // shows it there.
  const carried = {
    context,
    from: latest.sha,
    description: `${given.description ?? "Verdict: ship"} (from ${short}; only notes changed since)`,
  };
  return { ...go(who, "verdict"), score, carried };
}

/**
 * Whether a review of `from` still covers `head`: true when every commit since touched notes alone,
 * false when the product changed, null when git can't compare them here. The pathspecs are
 * anchored at the top, so the answer is the same from any directory of the checkout.
 */
export function covers(from, head, cwd) {
  const diff = spawnSync("git", ["diff", "--quiet", from, head, ...PRODUCT], {
    cwd,
    stdio: "ignore",
  });
  return { 0: true, 1: false }[diff.status] ?? null;
}

function isVerdict(context) {
  return Object.values(CONTEXTS).includes(context);
}

function scoreIn(description = "") {
  const score = String(description ?? "").match(
    /(\d+(?:\.\d+)?)\s*\/\s*10\b/,
  )?.[1];
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
