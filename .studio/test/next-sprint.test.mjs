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
  user: { login: from.author ?? "nycruslan" },
  head: {
    ref: branch,
    sha: `${number}`.padStart(40, "0"),
    repo: { full_name: from.repo ?? REPO },
  },
  labels: labels.map((name) => ({ name })),
  html_url: `https://github.com/${REPO}/pull/${number}`,
  updated_at:
    from.updatedAt ?? new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
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
 * each head commit was made (`commits`, by sha; any other is two hours old).
 */
function github({
  pulls = [],
  folders = [folder("1")],
  branches = [{ name: "main" }],
  commits = {},
  events = {},
  reviews = {},
  closed = [],
  conflicts = [],
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
    ...Object.entries(reviews).map(([n, list]) => [
      `${R}/pulls/${n}/reviews`,
      list,
    ]),
    ...conflicts.map((n) => [`${R}/pulls/${n}`, { mergeable_state: "dirty" }]),
  ]);
  Object.assign(table, {
    [R]: { default_branch: "main", owner: { login: "nycruslan" } },
    [`${R}/pulls`]: pulls,
    [`${R}/contents/.studio/sprint`]: folders,
    [`${R}/branches`]: branches,
    [`${R}/issues/*/events`]: [],
    [`${R}/pulls/*/reviews`]: [],
    [`${R}/pulls/*`]: { mergeable_state: "clean" },
    [`${R}/commits/*`]: { commit: { committer: { date: minutesAgo(120) } } },
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
  assert.match(beside.action.say, /work that doesn't build on #12/);
  // Two waiting PRs: the owner's queue is full, so nothing new starts.
  const second = pr(13, "sprint/3-cards", ["needs-owner"]);
  const held = preflight(github({ pulls: [waiting, second] })).state;
  assert.equal(held.action.do, "stand down");
  assert.equal(held.action.pr, 12);
  assert.match(
    held.action.say,
    /PR #12 \(sprint\/2-dark-mode\) waits for the owner \(needs-owner\) \(also open: #13\)\. Don't start a new sprint/,
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
  assert.equal(state.open[0].needsOwner, true);
  assert.equal(state.action.do, "start");
  assert.equal(state.action.waiting, 9);
});

test("a held PR waits for the owner even once they approved its head: they merge it", () => {
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
  assert.equal(state.open[0].needsOwner, true);
  assert.equal(state.action.do, "start");
  assert.equal(state.action.waiting, 9);
});

test("reminds the owner about a PR that has waited a day since its last change", () => {
  const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60_000).toISOString();
  const waitingFor = (hours) =>
    preflight(
      github({
        pulls: [
          pr(12, "sprint/2-dark-mode", ["needs-owner"], {
            updatedAt: hoursAgo(hours),
          }),
        ],
      }),
    ).state.remind;
  assert.deepEqual(waitingFor(2), []);
  // The reminder's own comment changes the PR, so the next one comes a day later.
  assert.deepEqual(waitingFor(25), [
    { number: 12, url: `https://github.com/${REPO}/pull/12` },
  ]);
  // A PR that doesn't wait for the owner is never a reminder.
  const quiet = preflight(
    github({
      pulls: [pr(14, "sprint/3-cards", [], { updatedAt: hoursAgo(25) })],
    }),
  ).state;
  assert.deepEqual(quiet.remind, []);
});

test("brings a waiting PR that conflicts with main up to date before anything else", () => {
  const { state } = preflight(
    github({
      pulls: [
        pr(12, "sprint/2-dark-mode", ["needs-owner"]),
        pr(14, "sprint/3-cards"),
      ],
      conflicts: [12],
    }),
  );
  assert.equal(state.open[0].conflicts, true);
  assert.equal(state.open[1].conflicts, false);
  assert.equal(state.action.do, "update");
  assert.equal(state.action.pr, 12);
  assert.match(state.action.say, /merge origin\/main into its branch/);
  assert.match(state.action.say, /needs their approval again/);
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

// Five sprints merged today, and older or foreign merges that don't count toward the cap.
const today = [
  ...[1, 3, 5, 8, 20].map((hours, i) => merged(30 + i, hours)),
  merged(40, 25),
  merged(41, 2, { base: "team/v5" }),
  merged(42, 2, { repo: "stranger/theseus-portfolio" }),
  merged(43, 2, { association: "CONTRIBUTOR" }),
  { ...pr(44, "sprint/44-closed"), base: { ref: "main" }, merged_at: null },
  merged(45, 2, { branch: "team/v6" }),
];

test("under the daily cap, the next sprint starts", () => {
  const { code, state } = preflight(github({ closed: today }));
  assert.equal(code, 0);
  assert.deepEqual(state.daily, { merged: 5, cap: 6 });
  assert.equal(state.action.do, "start");
});

test("at the daily cap, the run stands down until a day's merges age out", () => {
  const { state } = preflight(github({ closed: [...today, merged(46, 0.5)] }));
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
  const { state } = preflight(github({ closed: today }), {
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
      closed: today,
    }),
    { THESEUS_DAILY_SPRINTS: "5" },
  );
  assert.equal(state.action.do, "stand down");
  assert.equal(state.action.pr, 12);
  assert.match(state.action.say, /waits for the owner, and 5 sprints merged/);
  assert.match(state.action.say, /the daily cap \(5\)/);
});

test("leaves an open sprint PR that changed in the last 45 minutes to the run working on it", () => {
  const busy = preflight(
    github({
      pulls: [pr(9, "sprint/5-print", [], { updatedAt: minutesAgo(10) })],
    }),
  ).state;
  assert.equal(busy.action.do, "stand down");
  assert.equal(busy.action.pr, 9);
  assert.match(busy.action.say, /changed 10 min ago/);
  const quiet = preflight(
    github({
      pulls: [pr(9, "sprint/5-print", [], { updatedAt: minutesAgo(50) })],
    }),
  ).state;
  assert.equal(quiet.action.do, "continue");
});

test("an open sprint PR is continued even at the daily cap: finishing work isn't starting it", () => {
  const { state } = preflight(
    github({ closed: today, pulls: [pr(50, "sprint/50-finish")] }),
    { THESEUS_DAILY_SPRINTS: "2" },
  );
  assert.deepEqual(state.daily, { merged: 5, cap: 2 });
  assert.equal(state.action.do, "continue");
  assert.equal(state.action.pr, 50);
});

test("an invalid THESEUS_DAILY_SPRINTS means the default cap of 6", () => {
  for (const value of ["0", "-3", "2.5", "three", "", " "]) {
    const { state } = preflight(github({ closed: today }), {
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

test("stands down while a sprint branch with no PR yet was committed to in the last 45 minutes", () => {
  // 2026-10-17: sprint 8 pushed its branch at once and opened its PR an hour later; the heartbeat
  // in between saw no open PR and started sprint 9 on the same work.
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

test("a sprint branch with no PR, quiet for more than 45 minutes, holds nothing up", () => {
  const stale = "7".repeat(40);
  const { state } = preflight(
    github({
      branches: [branch("main"), branch("sprint/8-abandoned", stale)],
      commits: { [stale]: minutesAgo(50) },
    }),
  );
  assert.deepEqual(state.unopened, []);
  assert.equal(state.action.do, "start");
  assert.equal(state.next, 9);
});

test("an open PR's own branch is its PR's to judge, so its commit isn't read", () => {
  const { state, calls } = preflight(
    github({
      branches: [branch("main"), branch("sprint/5-print")],
      commits: { ["a".repeat(40)]: minutesAgo(5) },
      pulls: [pr(9, "sprint/5-print")],
    }),
  );
  assert.deepEqual(state.unopened, []);
  assert.equal(state.action.do, "continue");
  assert.ok(
    !calls.some((args) => args.some((arg) => arg.includes("/commits/"))),
  );
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
