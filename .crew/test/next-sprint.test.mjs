import assert from "node:assert/strict";
import { test } from "node:test";
import { ownerPicks, unbuilt } from "../picks.mjs";
import { ghLog, gitRepo, REPO, routes, runHook } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;

// An open PR as REST lists it, on the head `shaOf(number)`.
const shaOf = (number) => `${number}`.padStart(40, "0");
const pr = (number, branch, labels = [], from = {}) => ({
  number,
  title: `PR ${number}`,
  author_association: from.association ?? "OWNER",
  user: { login: from.author ?? "nycruslan" },
  head: {
    ref: branch,
    sha: shaOf(number),
    repo: { full_name: from.repo ?? REPO },
  },
  labels: labels.map((name) => ({ name })),
  draft: from.draft ?? false,
  html_url: `https://github.com/${REPO}/pull/${number}`,
  updated_at:
    from.updatedAt ?? new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
});
const folder = (name) => ({ name, type: "dir" });
// A sprint PR merged into main `hours` ago, as REST lists the closed PRs.
const merged = (number, hours, from = {}) => ({
  ...pr(number, from.branch ?? `sprint/${number}-done`, [], from),
  base: { ref: from.base ?? "main" },
  merged_at: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
});

const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();
// A branch as REST lists it, with its head commit.
const branch = (name, sha = "a".repeat(40)) => ({ name, commit: { sha } });

/**
 * The GitHub side, as REST serves it: open PRs, the sprint folders on main, the branches, and when
 * each head commit was made (`commits`, by sha; any other is three hours old).
 */
function github({
  pulls = [],
  folders = [folder("1")],
  branches = [branch("main")],
  commits = {},
  events = {},
  closed = [],
  conflicts = [],
  comments = {},
  gates = {},
} = {}) {
  // The fake gh takes the first route that matches, so each PR's own events come before the rest,
  // and the closed PRs before the open ones.
  const table = Object.fromEntries([
    [`${R}/pulls?state=closed`, closed],
    ...Object.entries(commits).map(([sha, date]) => [
      `${R}/commits/${sha}`,
      { commit: { committer: { date } } },
    ]),
    ...Object.entries(events).map(([n, list]) => [
      `${R}/issues/${n}/events`,
      list,
    ]),
    ...conflicts.map((n) => [`${R}/pulls/${n}`, { mergeable_state: "dirty" }]),
    ...Object.entries(comments).map(([n, list]) => [
      `${R}/issues/${n}/comments`,
      list,
    ]),
    ...Object.entries(gates).map(([sha, runs]) => [
      `${R}/commits/${sha}/check-runs`,
      { check_runs: runs },
    ]),
  ]);
  Object.assign(table, {
    [R]: { default_branch: "main", owner: { login: "nycruslan" } },
    [`${R}/pulls`]: pulls,
    [`${R}/contents/.crew/sprint`]: folders,
    [`${R}/branches`]: branches,
    [`${R}/issues/*/events`]: [],
    [`${R}/issues/*/comments`]: [],
    [`${R}/pulls/*`]: { mergeable_state: "clean" },
    [`${R}/commits/*`]: { commit: { committer: { date: minutesAgo(180) } } },
    [`${R}/commits/*/check-runs`]: { check_runs: [] },
    user: { login: "nycruslan" },
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
      ...env,
    },
  });
  return {
    ...result,
    state: result.stdout.trim() ? JSON.parse(result.stdout) : null,
    calls: log.calls(),
  };
}

// The pre-flight of a run the owner gave a goal.
function runWithGoal(table, env = {}) {
  const result = runHook("next-sprint.mjs", "", {
    cwd: repo,
    args: ["--owner-goal"],
    env: { GH_ROUTES: routes(table), ...env },
  });
  return { ...result, state: JSON.parse(result.stdout) };
}

test("with nothing open, the next sprint is one past the highest anywhere", () => {
  const { code, state } = preflight(
    github({
      folders: [folder("1"), folder("2"), { name: "README.md", type: "file" }],
      branches: [
        branch("main"),
        branch("sprint/1-design-tokens"),
        branch("sprint/4-dark-mode"),
        branch("team/v4.1"),
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
      branches: [branch("sprint/1-design-tokens")],
    }),
  );
  assert.deepEqual(
    state.open.map(({ number, branch, waitsForOwner }) => [
      number,
      branch,
      waitsForOwner,
    ]),
    [[9, "sprint/1-design-tokens", false]],
  );
  assert.deepEqual(state.highest, { main: 0, prs: 1, branches: 1 });
  assert.equal(state.next, 2);
  assert.equal(state.action.do, "continue");
  assert.equal(state.action.pr, 9);
  assert.match(state.action.say, /node \.crew\/merge\.mjs 9/);
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
        // A person can't take a bot's login, but another app's bot is still a stranger.
        pr(23, "sprint/10-takeover", [], {
          association: "NONE",
          author: "other-app[bot]",
        }),
      ],
    }),
  );
  assert.deepEqual(state.open, []);
  assert.equal(state.highest.prs, 0);
  assert.equal(state.next, 2);
  assert.equal(state.action.do, "start");
  assert.doesNotMatch(JSON.stringify(state), /PR 2[0-3]/);
});

test("counts a sprint PR the team's checks app opened", () => {
  // open-pr.mjs has the app open the team's PRs; GitHub gives the app no association.
  const { state } = preflight(
    github({
      pulls: [
        pr(9, "sprint/1-tokens", [], {
          association: "NONE",
          author: "theseus-checks[bot]",
        }),
      ],
    }),
  );
  assert.deepEqual(
    state.open.map(({ number }) => number),
    [9],
  );
  assert.equal(state.action.do, "continue");
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

test("keeps working beside one PR that waits for the owner, stands down at two, and otherwise continues one that doesn't", () => {
  const waiting = pr(12, "sprint/2-dark-mode", ["needs-owner"]);
  // One waiting PR: a team keeps working while a review is pending, on something else.
  const beside = preflight(github({ pulls: [waiting] })).state;
  assert.equal(beside.action.do, "start");
  assert.equal(beside.action.sprint, 3);
  assert.equal(beside.action.waiting, 12);
  assert.match(
    beside.action.say,
    /work that neither repeats nor builds on #12/,
  );
  // Two waiting PRs: the owner's queue is full, so nothing new starts.
  const second = pr(13, "sprint/3-cards", ["needs-owner"]);
  const held = preflight(github({ pulls: [waiting, second] })).state;
  assert.equal(held.action.do, "stand down");
  assert.equal(held.action.pr, 12);
  assert.match(
    held.action.say,
    /PR #12 \(sprint\/2-dark-mode\) waits for the owner \(also open: #13\)\. Don't start a new sprint/,
  );
  assert.equal(held.next, 4);
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
    calls.some((args) => args.includes(`${R}/contents/.crew/sprint?ref=main`)),
  );
  assert.ok(calls.every((args) => args[0] === "api"));
});

test("treats a missing sprint folder on main as no sprints yet", () => {
  const table = github();
  table[`${R}/contents/.crew/sprint`] = { $error: 404, message: "Not Found" };
  const { code, state } = preflight(table);
  assert.equal(code, 0);
  assert.equal(state.highest.main, 0);
  assert.equal(state.next, 1);
});

test("says which account GitHub calls act as, and runs as that account", () => {
  // In the cloud that is the owner: the proxy swaps any token for the owner's connection.
  const { code, state } = preflight(github());
  assert.equal(code, 0);
  assert.equal(state.actingAs, "nycruslan");
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
  assert.equal(state.open[0].waitsForOwner, true);
  assert.equal(state.action.do, "start");
  assert.equal(state.action.waiting, 9);
});

test("a draft is still being built, whatever its labels: it's continued, or left to the run on it", () => {
  const draft = pr(12, "sprint/2-direction", ["needs-owner"], { draft: true });
  const quiet = preflight(github({ pulls: [draft] })).state;
  assert.equal(quiet.open[0].draft, true);
  assert.equal(quiet.open[0].waitsForOwner, false);
  assert.equal(quiet.action.do, "continue");
  assert.equal(quiet.action.pr, 12);
  assert.deepEqual([quiet.remind, quiet.update], [[], []]);
  const active = preflight(
    github({ pulls: [draft], commits: { [shaOf(12)]: minutesAgo(10) } }),
  ).state;
  assert.equal(active.action.do, "stand down");
  assert.equal(active.action.pr, 12);
  assert.match(active.action.say, /another run is most likely still working/);
});

test("a ready PR that gate leaves to the owner waits for them, held or approved, labelled or not", () => {
  const head = "12".padStart(40, "0");
  const app = { slug: "theseus-checks" };
  const gate = (conclusion, extra = {}) => ({
    id: 2,
    name: "gate",
    status: "completed",
    conclusion,
    app,
    ...extra,
  });
  const waits = (runs) =>
    preflight(
      github({
        pulls: [pr(12, "sprint/2-retire-specs")],
        gates: { [head]: runs },
      }),
    ).state;
  // Held for the owner's approval: an owner path, package.json's scripts, needs-owner.
  const held = waits([gate("success", { id: 1 }), gate("failure")]);
  assert.equal(held.open[0].waitsForOwner, true);
  assert.equal(held.action.do, "start");
  assert.equal(held.action.waiting, 12);
  // Passed only on that approval: merge.mjs leaves it to the owner.
  const released = waits([gate("success", { external_id: "owner-approved" })]);
  assert.equal(released.open[0].waitsForOwner, true);
  // Passed on its own, still running, cancelled, or another app's: the team's to finish.
  for (const runs of [
    [gate("success")],
    [gate("cancelled")],
    [{ ...gate(null), status: "in_progress" }],
    [gate("failure", { app: { slug: "someone" } })],
  ]) {
    const state = waits(runs);
    assert.equal(state.open[0].waitsForOwner, false);
    assert.equal(state.action.do, "continue");
    assert.match(
      state.action.say,
      /mark it ready with node \.crew\/ready-pr\.mjs 12 if it's still a draft, then node \.crew\/merge\.mjs 12\./,
    );
  }
});

test("reminds the owner about a PR a day past its last commit and the team's last comment", () => {
  const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60_000).toISOString();
  const head = "12".padStart(40, "0");
  const remind = ({ committed, comments = [] }) =>
    preflight(
      github({
        pulls: [pr(12, "sprint/2-dark-mode", ["needs-owner"])],
        commits: { [head]: hoursAgo(committed) },
        comments: { 12: comments },
      }),
    ).state.remind;
  assert.deepEqual(remind({ committed: 2 }), []);
  assert.deepEqual(remind({ committed: 25 }), [
    { number: 12, url: `https://github.com/${REPO}/pull/12` },
  ]);
  // The run's own reminder comment restarts the day.
  const team = {
    author_association: "OWNER",
    created_at: hoursAgo(1),
    body: "Reminded the owner.",
  };
  assert.deepEqual(remind({ committed: 25, comments: [team] }), []);
  // A stranger's comment on the public PR doesn't.
  const stranger = {
    ...team,
    author_association: "NONE",
    user: { login: "someone" },
  };
  assert.equal(remind({ committed: 25, comments: [stranger] }).length, 1);
  // A PR that doesn't wait for the owner is never a reminder.
  const quiet = preflight(
    github({
      pulls: [pr(14, "sprint/3-cards")],
      commits: { ["14".padStart(40, "0")]: hoursAgo(25) },
    }),
  ).state;
  assert.deepEqual(quiet.remind, []);
});

test("lists a waiting PR that conflicts with main to bring up to date, beside the run's own work", () => {
  const waiting = () => pr(12, "sprint/2-dark-mode", ["needs-owner"]);
  const listed = preflight(
    github({ pulls: [waiting()], conflicts: [12] }),
  ).state;
  assert.deepEqual(listed.update, [
    { number: 12, branch: "sprint/2-dark-mode" },
  ]);
  // It never blocks the run: the team still starts work beside it.
  assert.equal(listed.action.do, "start");
  // A run is on it: left alone.
  const busy = preflight(
    github({
      pulls: [waiting()],
      conflicts: [12],
      commits: { [shaOf(12)]: minutesAgo(10) },
    }),
  ).state;
  assert.deepEqual(busy.update, []);
  // A run already found this head's conflict beyond it and said so: not listed again.
  const head = shaOf(12);
  const flagged = preflight(
    github({
      pulls: [waiting()],
      conflicts: [12],
      comments: {
        12: [
          {
            author_association: "OWNER",
            created_at: minutesAgo(120),
            body: `Product code conflicts.\n\ntheseus:conflict ${head}`,
          },
        ],
      },
    }),
  ).state;
  assert.deepEqual(flagged.update, []);
  // The same marker from a stranger on the public repository doesn't count.
  const forged = preflight(
    github({
      pulls: [waiting()],
      conflicts: [12],
      comments: {
        12: [
          {
            author_association: "NONE",
            user: { login: "someone" },
            created_at: minutesAgo(120),
            body: `theseus:conflict ${head}`,
          },
        ],
      },
    }),
  ).state;
  assert.equal(forged.update.length, 1);
  // No conflict, nothing to do.
  assert.deepEqual(preflight(github({ pulls: [waiting()] })).state.update, []);
});

test("fails closed when main's sprint folders can't be read for another reason than a 404", () => {
  const table = github();
  table[`${R}/contents/.crew/sprint`] = {
    $error: 502,
    message: "Bad Gateway",
  };
  const { code, stderr, state } = preflight(table);
  assert.equal(code, 1);
  assert.equal(state, null);
  assert.match(stderr, /Bad Gateway.*Don't start a sprint blind/);
});

// Five sprints merged today, and older or foreign merges that don't count toward the cap. Built per
// test, so their times are as old as the test says however long the suite has run.
const today = () => [
  ...[1, 3, 5, 8, 20].map((hours, i) => merged(30 + i, hours)),
  merged(40, 25),
  merged(41, 2, { base: "team/v5" }),
  merged(42, 2, { repo: "stranger/theseus-portfolio" }),
  merged(43, 2, { association: "CONTRIBUTOR" }),
  { ...pr(44, "sprint/44-closed"), base: { ref: "main" }, merged_at: null },
  merged(45, 2, { branch: "team/v6" }),
];

test("under the daily cap, the next sprint starts", () => {
  const { code, state } = preflight(github({ closed: today() }));
  assert.equal(code, 0);
  assert.deepEqual(state.daily, { merged: 5, cap: 6 });
  assert.equal(state.action.do, "start");
});

test("at the daily cap, the run stands down until a day's merges age out", () => {
  const { state } = preflight(
    github({ closed: [...today(), merged(46, 0.5)] }),
  );
  assert.deepEqual(state.daily, { merged: 6, cap: 6 });
  assert.equal(state.action.do, "stand down");
  assert.match(
    state.action.say,
    /^6 sprints merged in the last 24 hours, the daily cap \(6\); the next run picks up after .+Z\. Don't start a new sprint/,
  );
  // The oldest of today's six, merged 20 hours ago, is a day old in 4 hours.
  const after = Date.parse(state.action.say.match(/after (\S+Z)\./)[1]);
  const inFour = Date.now() + 4 * 60 * 60 * 1000;
  assert.ok(Math.abs(after - inFour) < 60_000);
});

test("THESEUS_DAILY_SPRINTS sets the cap", () => {
  const { state } = preflight(github({ closed: today() }), {
    THESEUS_DAILY_SPRINTS: "5",
  });
  assert.deepEqual(state.daily, { merged: 5, cap: 5 });
  assert.equal(state.action.do, "stand down");
  assert.match(state.action.say, /the daily cap \(5\)/);
});

test("starts nothing beside a waiting PR once the day's cap is reached", () => {
  const { state } = preflight(
    github({
      pulls: [pr(12, "sprint/2-dark-mode", ["needs-owner"])],
      closed: today(),
    }),
    { THESEUS_DAILY_SPRINTS: "5" },
  );
  assert.equal(state.action.do, "stand down");
  assert.equal(state.action.pr, 12);
  assert.match(state.action.say, /waits for the owner, and 5 sprints merged/);
  assert.match(state.action.say, /the daily cap \(5\)/);
});

test("leaves an open sprint PR committed to in the last two hours to the run working on it", () => {
  const print = pr(9, "sprint/5-print");
  const busy = preflight(
    github({ pulls: [print], commits: { [shaOf(9)]: minutesAgo(10) } }),
  ).state;
  assert.equal(busy.action.do, "stand down");
  assert.equal(busy.action.pr, 9);
  assert.match(busy.action.say, /was last worked on 10 min ago/);
  const quiet = preflight(
    github({ pulls: [print], commits: { [shaOf(9)]: minutesAgo(130) } }),
  ).state;
  assert.equal(quiet.action.do, "continue");
});

test("only a run's marks hold a PR whose head is old: marked ready or labelled review, not a review or comment", () => {
  // The head was committed three hours ago (the default), so only the events can hold the PR.
  const event = (minutes, name, label) => ({
    event: name,
    created_at: minutesAgo(minutes),
    ...(label && { label: { name: label } }),
  });
  const action = (events, from = {}) =>
    preflight(
      github({
        pulls: [pr(9, "sprint/5-print", [], from)],
        events: { 9: events },
      }),
    ).state.action.do;
  // Lens's review updated the PR ten minutes ago: that's no run.
  assert.equal(action([], { updatedAt: minutesAgo(10) }), "continue");
  // needs-owner says the PR waits, not that a run is on it.
  assert.equal(
    action([event(10, "labeled", "needs-owner")], { draft: true }),
    "continue",
  );
  // A run waiting on Lens or merge.mjs pushes nothing, but it marked the PR.
  assert.equal(action([event(10, "labeled", "review")]), "stand down");
  assert.equal(action([event(10, "ready_for_review")]), "stand down");
  assert.equal(action([event(130, "labeled", "review")]), "continue");
});

test("an open sprint PR is continued even at the daily cap: finishing work isn't starting it", () => {
  const { state } = preflight(
    github({ closed: today(), pulls: [pr(50, "sprint/50-finish")] }),
    { THESEUS_DAILY_SPRINTS: "2" },
  );
  assert.deepEqual(state.daily, { merged: 5, cap: 2 });
  assert.equal(state.action.do, "continue");
  assert.equal(state.action.pr, 50);
});

test("the owner's goal starts a sprint at the daily cap, which only holds the crew's own chain", () => {
  const capped = github({ closed: [...today(), merged(46, 0.5)] });
  assert.equal(preflight(capped).state.action.do, "stand down");
  const { state } = runWithGoal(capped);
  assert.deepEqual(state.daily, { merged: 6, cap: 6 });
  assert.equal(state.action.do, "start");
  assert.equal(state.action.sprint, state.next);
});

test("the owner's goal starts beside a waiting PR at the cap, but never on a live run's work", () => {
  const waiting = github({
    pulls: [pr(12, "sprint/2-dark-mode", ["needs-owner"])],
    closed: today(),
  });
  const beside = runWithGoal(waiting, { THESEUS_DAILY_SPRINTS: "5" }).state;
  assert.equal(beside.action.do, "start");
  assert.equal(beside.action.waiting, 12);
  const live = runWithGoal(
    github({
      pulls: [pr(9, "sprint/5-print")],
      commits: { [shaOf(9)]: minutesAgo(10) },
    }),
  ).state;
  assert.equal(live.action.do, "stand down");
  assert.equal(live.action.pr, 9);
});

test("an invalid THESEUS_DAILY_SPRINTS means the default cap of 6", () => {
  for (const value of ["0", "-3", "2.5", "three", "", " "]) {
    const { state } = preflight(github({ closed: today() }), {
      THESEUS_DAILY_SPRINTS: value,
    });
    assert.equal(state.daily.cap, 6, `for ${JSON.stringify(value)}`);
    assert.equal(state.action.do, "start");
  }
});

test("reads today's merges from one page of the closed PRs, most recently updated first", () => {
  const { calls } = preflight(github());
  const closed = calls.filter((args) =>
    args.some((arg) => /\/pulls\?state=closed/.test(arg)),
  );
  assert.equal(closed.length, 1);
  assert.match(closed[0].join(" "), /sort=updated&direction=desc&per_page=100/);
  assert.ok(!closed[0].includes("--paginate"));
});

test("stands down while a sprint branch with no PR yet was committed to in the last two hours", () => {
  // A run pushes its branch before it opens its PR: a heartbeat in between mustn't start the same
  // work again.
  const fresh = "8".repeat(40);
  const committedAt = minutesAgo(20);
  const { state } = preflight(
    github({
      branches: [branch("main"), branch("sprint/8-hero-half-model", fresh)],
      commits: { [fresh]: committedAt },
      pulls: [pr(14, "sprint/3-cards")],
    }),
  );
  assert.deepEqual(state.unopened, [
    { branch: "sprint/8-hero-half-model", committedAt },
  ]);
  assert.equal(state.action.do, "stand down");
  assert.equal(state.action.branch, "sprint/8-hero-half-model");
  assert.match(
    state.action.say,
    /^Branch sprint\/8-hero-half-model has no PR yet and was committed to 20 min ago, so another run is most likely working on it\. Don't touch it or start a new sprint/,
  );
  assert.equal(state.next, 9);
});

test("a sprint branch with no PR, quiet for more than two hours, holds nothing up", () => {
  const stale = "7".repeat(40);
  const { state } = preflight(
    github({
      branches: [branch("main"), branch("sprint/8-abandoned", stale)],
      commits: { [stale]: minutesAgo(130) },
    }),
  );
  assert.deepEqual(state.unopened, []);
  assert.equal(state.action.do, "start");
  assert.equal(state.next, 9);
});

test("an open PR's own branch is its PR's to judge, so the branch's commit isn't read", () => {
  const { state, calls } = preflight(
    github({
      branches: [branch("main"), branch("sprint/5-print")],
      commits: { ["a".repeat(40)]: minutesAgo(5) },
      pulls: [pr(9, "sprint/5-print")],
    }),
  );
  assert.deepEqual(state.unopened, []);
  assert.equal(state.action.do, "continue");
  // The PR's head commit is read (and its gate, `commits/<sha>/check-runs`), the branch's isn't.
  const commits = calls.flat().filter((arg) => /\/commits\/[^/]+$/.test(arg));
  assert.deepEqual(commits, [`${R}/commits/${shaOf(9)}`]);
});

test("a just-merged sprint's branch, still listed, doesn't hold up the run its merge starts", () => {
  // The chain's run starts the moment the PR merges, with the close-out commits minutes old. If
  // the branch outlives the merge (delete_branch_on_merge off), it's still that PR's, not new work.
  const head = "6".repeat(40);
  const done = {
    ...merged(31, 0.05, { branch: "sprint/8-hero-half-model" }),
    head: {
      ref: "sprint/8-hero-half-model",
      sha: head,
      repo: { full_name: REPO },
    },
  };
  const { state } = preflight(
    github({
      closed: [done],
      branches: [branch("main"), branch("sprint/8-hero-half-model", head)],
      commits: { [head]: minutesAgo(5) },
    }),
  );
  assert.deepEqual(state.unopened, []);
  assert.equal(state.action.do, "start");
  assert.equal(state.next, 9);
  // A commit pushed after the PR closed is new work, and holds the run up again.
  const later = "5".repeat(40);
  const reopened = preflight(
    github({
      closed: [done],
      branches: [branch("main"), branch("sprint/8-hero-half-model", later)],
      commits: { [later]: minutesAgo(5) },
    }),
  ).state;
  assert.equal(reopened.action.do, "stand down");
});

// A PR body with the sprint skill's "Owner's pick" blocks.
const picksBody = [
  "## Decisions",
  "",
  "### Owner's pick: The bar on phones",
  "- [ ] Keep Read as page in the bar (Recommended)",
  "- [x] Move it to the drawing's foot",
  "",
  "### Owner's pick: The tagline",
  "- [x] As drafted (Recommended)",
  "- [ ] Shorter",
  "",
  "### Owner's pick (waits): Spend $20 a month on fonts",
  "- [ ] No (Recommended)",
  "- [ ] Yes",
  "",
  "### Owner's pick: The footer",
  "- [ ] Two columns (Recommended)",
  "- [x] One column",
  "Applied: One column, in #41.",
].join("\n");

test("reads the owner's picks from a PR's body: each question, its options, which is recommended and what's ticked", () => {
  const picks = ownerPicks(picksBody);
  assert.deepEqual(
    picks.map(({ question, waits, applied }) => [question, waits, applied]),
    [
      ["The bar on phones", false, null],
      ["The tagline", false, null],
      ["Spend $20 a month on fonts", true, null],
      ["The footer", false, "One column"],
    ],
  );
  assert.deepEqual(picks[0].options, [
    {
      text: "Keep Read as page in the bar (Recommended)",
      ticked: false,
      recommended: true,
    },
    { text: "Move it to the drawing's foot", ticked: true, recommended: false },
  ]);
  assert.deepEqual(ownerPicks(null), []);
});

test("a pick is unbuilt while the owner's tick differs from what the team built, the last applied or else the recommended", () => {
  const pick = (lines) =>
    ownerPicks(["### Owner's pick: Q", ...lines].join("\n"))[0];
  const cases = [
    [["- [ ] A (Recommended)", "- [ ] B"], []],
    [["- [x] A (Recommended)", "- [ ] B"], []],
    [["- [ ] A (Recommended)", "- [x] B"], ["B"]],
    [["- [ ] A (Recommended)", "- [x] B", "Applied: B, in #41."], []],
    // The owner changed their mind after it was applied, back to the recommended one or to another.
    [
      ["- [x] A (Recommended)", "- [ ] B", "Applied: B, in #41."],
      ["A (Recommended)"],
    ],
    [
      ["- [ ] A (Recommended)", "- [ ] B", "- [x] C", "Applied: B, in #41."],
      ["C"],
    ],
    // The last Applied line counts, and it names the option in the team's words.
    [
      [
        "- [x] A (Recommended)",
        "- [ ] B",
        "Applied: B, in #41.",
        "Applied: a, in #42.",
      ],
      [],
    ],
  ];
  for (const [lines, chose] of cases) {
    assert.deepEqual(unbuilt(pick(lines)), chose, lines.join(" | "));
  }
  const waits = ownerPicks(
    "### Owner's pick (waits): Q\n- [x] A (Recommended)\n- [ ] B",
  )[0];
  assert.deepEqual(unbuilt(waits), ["A (Recommended)"]);
  assert.deepEqual(unbuilt({ ...waits, applied: "A" }), []);
});

test("lists the owner's answers the team still has to act on: an override, any tick on a pick that waits, in open PRs and merged ones however old", () => {
  const body = (text) => ({ body: text });
  const { state } = preflight(
    github({
      pulls: [
        { ...pr(43, "sprint/43-bar"), ...body(picksBody) },
        {
          ...pr(44, "sprint/44-fonts"),
          ...body(
            "### Owner's pick (waits): Fonts\n- [x] No (Recommended)\n- [ ] Yes",
          ),
        },
      ],
      closed: [
        {
          ...merged(41, 3),
          ...body(
            "### Owner's pick: Footer\n- [ ] Two (Recommended)\n- [x] One",
          ),
        },
        {
          ...merged(40, 30),
          ...body("### Owner's pick: Old\n- [ ] A (Recommended)\n- [x] B"),
        },
        {
          ...merged(39, 50),
          merged_at: null,
          ...body("### Owner's pick: Closed\n- [ ] A (Recommended)\n- [x] B"),
        },
      ],
    }),
  );
  assert.deepEqual(
    state.picks.map(({ pr, merged, question, chose, waits }) => [
      pr,
      merged,
      question,
      chose,
      waits,
    ]),
    [
      [
        43,
        false,
        "The bar on phones",
        ["Move it to the drawing's foot"],
        false,
      ],
      [44, false, "Fonts", ["No (Recommended)"], true],
      [41, true, "Footer", ["One"], false],
      [40, true, "Old", ["B"], false],
    ],
  );
  assert.equal(
    state.picks[0].recommended,
    "Keep Read as page in the bar (Recommended)",
  );
});

test("leaves the picks on an open PR a run worked on within ACTIVE_HOURS to that run", () => {
  const ticked = {
    body: "### Owner's pick: Footer\n- [ ] Two (Recommended)\n- [x] One",
  };
  const { state } = preflight(
    github({
      pulls: [
        { ...pr(45, "sprint/45-busy"), ...ticked },
        { ...pr(46, "sprint/46-quiet"), ...ticked },
      ],
      commits: { [shaOf(45)]: minutesAgo(10) },
    }),
  );
  assert.deepEqual(
    state.picks.map(({ pr }) => pr),
    [46],
  );
});
