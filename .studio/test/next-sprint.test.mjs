import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;

// An open PR as REST lists it.
const pr = (number, branch, labels = [], from = {}) => ({
  number,
  title: `PR ${number}`,
  author_association: from.association ?? "OWNER",
  head: {
    ref: branch,
    sha: `${number}`.padStart(40, "0"),
    repo: { full_name: from.repo ?? REPO },
  },
  labels: labels.map((name) => ({ name })),
  html_url: `https://github.com/${REPO}/pull/${number}`,
});
const folder = (name) => ({ name, type: "dir" });

/** The GitHub side, as REST serves it: open PRs, the sprint folders on main and the branches. */
function github({
  pulls = [],
  folders = [folder("1")],
  branches = [{ name: "main" }],
  events = {},
  reviews = {},
} = {}) {
  // The fake gh takes the first route that matches, so each PR's own events come before the rest.
  const table = Object.fromEntries([
    ...Object.entries(events).map(([n, list]) => [
      `${R}/issues/${n}/events`,
      list,
    ]),
    ...Object.entries(reviews).map(([n, list]) => [
      `${R}/pulls/${n}/reviews`,
      list,
    ]),
  ]);
  Object.assign(table, {
    [R]: { default_branch: "main", owner: { login: "nycruslan" } },
    [`${R}/pulls`]: pulls,
    [`${R}/contents/.studio/sprint`]: folders,
    [`${R}/branches`]: branches,
    [`${R}/issues/*/events`]: [],
    [`${R}/pulls/*/reviews`]: [],
    user: { login: "theseus-team" },
  });
  return table;
}

function preflight(table, env = {}) {
  const log = ghLog();
  const result = runHook("next-sprint.mjs", "", {
    cwd: repo,
    env: {
      GH_ROUTES: routes(table),
      GH_LOG: log.file,
      THESEUS_BOT: "theseus-team",
      ...env,
    },
  });
  return {
    ...result,
    state: result.stdout.trim() ? JSON.parse(result.stdout) : null,
    calls: log.calls(),
  };
}

test("with nothing open, the next sprint is one past the highest anywhere", () => {
  const { code, state } = preflight(
    github({
      folders: [folder("1"), folder("2"), { name: "README.md", type: "file" }],
      branches: [
        { name: "main" },
        { name: "sprint/1-design-tokens" },
        { name: "sprint/4-dark-mode" },
        { name: "team/v4.1" },
      ],
      pulls: [pr(11, "team/v4.1")],
    }),
  );
  assert.equal(code, 0);
  assert.deepEqual(state.open, []);
  assert.deepEqual(state.highest, { main: 2, prs: 0, branches: 4 });
  assert.equal(state.next, 5);
  assert.equal(state.action.do, "start");
  assert.match(
    state.action.say,
    /Start sprint 5 on a branch named sprint\/5-<slug>/,
  );
});

test("an open sprint PR is continued, not started again", () => {
  // Sprint 1's folder isn't on main until its PR merges: the PR's branch still counts.
  const { state } = preflight(
    github({
      folders: [],
      pulls: [pr(9, "sprint/1-design-tokens")],
      branches: [{ name: "sprint/1-design-tokens" }],
    }),
  );
  assert.deepEqual(
    state.open.map(({ number, branch, needsOwner }) => [
      number,
      branch,
      needsOwner,
    ]),
    [[9, "sprint/1-design-tokens", false]],
  );
  assert.deepEqual(state.highest, { main: 0, prs: 1, branches: 1 });
  assert.equal(state.next, 2);
  assert.equal(state.action.do, "continue");
  assert.equal(state.action.pr, 9);
  assert.match(state.action.say, /node \.studio\/merge\.mjs 9/);
});

test("ignores sprint-named PRs from forks and strangers, and never repeats a PR's title", () => {
  // The repository is public: anyone can open a PR whose branch is called sprint/<n>.
  const { state } = preflight(
    github({
      folders: [folder("1")],
      pulls: [
        pr(20, "sprint/7-takeover", [], { repo: "stranger/theseus-portfolio" }),
        pr(21, "sprint/8-takeover", [], { association: "NONE" }),
        pr(22, "sprint/9-takeover", [], { association: "CONTRIBUTOR" }),
      ],
    }),
  );
  assert.deepEqual(state.open, []);
  assert.equal(state.highest.prs, 0);
  assert.equal(state.next, 2);
  assert.equal(state.action.do, "start");
  assert.doesNotMatch(JSON.stringify(state), /PR 2[0-2]/);
});

test("counts the team's own PR whatever the case of the repository's name", () => {
  const { state } = preflight(
    github({
      pulls: [pr(9, "sprint/1-tokens", [], { repo: REPO.toUpperCase() })],
    }),
  );
  assert.deepEqual(
    state.open.map(({ number }) => number),
    [9],
  );
  assert.equal(state.action.do, "continue");
});

test("stands down when every open sprint PR waits for the owner, and otherwise continues one that doesn't", () => {
  const waiting = pr(12, "sprint/2-dark-mode", ["needs-owner"]);
  const held = preflight(github({ pulls: [waiting] })).state;
  assert.equal(held.action.do, "stand down");
  assert.equal(held.action.pr, 12);
  assert.match(
    held.action.say,
    /PR #12 \(sprint\/2-dark-mode\) waits for the owner \(needs-owner\)\. Don't start a new sprint/,
  );
  assert.equal(held.next, 3);
  const { state } = preflight(
    github({ pulls: [waiting, pr(14, "sprint/3-cards")] }),
  );
  assert.equal(state.action.do, "continue");
  assert.equal(state.action.pr, 14);
  assert.match(state.action.say, /\(also open: #12\)/);
  assert.equal(state.next, 4);
});

test("reads main's folders through REST, on the default branch", () => {
  const { calls } = preflight(github());
  assert.ok(
    calls.some((args) =>
      args.includes(`${R}/contents/.studio/sprint?ref=main`),
    ),
  );
  assert.ok(calls.every((args) => args[0] === "api"));
});

test("treats a missing sprint folder on main as no sprints yet", () => {
  const table = github();
  table[`${R}/contents/.studio/sprint`] = { $error: 404, message: "Not Found" };
  const { code, state } = preflight(table);
  assert.equal(code, 0);
  assert.equal(state.highest.main, 0);
  assert.equal(state.next, 1);
});

test("stops unless GitHub calls act as the team's own account", () => {
  const owner = github();
  owner.user = { login: "nycruslan" };
  for (const [table, env] of [
    [owner, {}],
    [github(), { THESEUS_BOT: "" }],
  ]) {
    const { code, stderr, state } = preflight(table, env);
    assert.equal(code, 1);
    assert.equal(state, null);
    assert.match(stderr, /not the team's account/);
  }
});

test("fails closed when GitHub can't be read", () => {
  const { code, stderr, state } = preflight(github(), { GH_FAIL: "HTTP 502" });
  assert.equal(code, 1);
  assert.equal(state, null);
  assert.match(stderr, /Don't start a sprint blind/);
});

test("a PR that once carried needs-owner still waits for the owner, as the gate holds it", () => {
  // The owner took the label off; the gate still refuses to merge it, so no run may continue it.
  const { state } = preflight(
    github({
      pulls: [pr(9, "sprint/1-design-tokens")],
      events: {
        9: [
          { event: "labeled", label: { name: "needs-owner" } },
          { event: "unlabeled", label: { name: "needs-owner" } },
        ],
      },
    }),
  );
  assert.equal(state.open[0].needsOwner, true);
  assert.equal(state.action.do, "stand down");
  assert.equal(state.action.pr, 9);
});

test("a PR whose head the owner approved is continued", () => {
  const approval = {
    user: { login: "nycruslan" },
    state: "APPROVED",
    commit_id: "9".padStart(40, "0"),
  };
  const { state } = preflight(
    github({
      pulls: [pr(9, "sprint/1-design-tokens")],
      events: { 9: [{ event: "labeled", label: { name: "needs-owner" } }] },
      reviews: { 9: [approval] },
    }),
  );
  assert.equal(state.open[0].needsOwner, false);
  assert.equal(state.action.do, "continue");
});

test("fails closed when main's sprint folders can't be read for another reason than a 404", () => {
  const table = github();
  table[`${R}/contents/.studio/sprint`] = {
    $error: 502,
    message: "Bad Gateway",
  };
  const { code, stderr, state } = preflight(table);
  assert.equal(code, 1);
  assert.equal(state, null);
  assert.match(stderr, /Bad Gateway.*Don't start a sprint blind/);
});
