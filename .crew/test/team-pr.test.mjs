import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook, tempDir } from "./kit.mjs";

const ADVICE = "Iris: ship.\n\nThe dots read well.\n";
const BODY = "## Goal\nDots.\n";
const { dir: repo } = gitRepo({
  ".crew/sprint/3/advice.md": ADVICE,
  ".crew/sprint/3/pr.md": BODY,
  ".crew/sprint/3/empty.md": "\n",
});
const R = `repos/${REPO}`;
const APP = "theseus-checks[bot]";
const URL = `https://github.com/${REPO}/pull/7`;
// GitHub's clock, an hour either side of the run: comments made after it asked, and before.
const after = new Date(Date.now() + 60 * 60_000).toISOString();
const before = new Date(Date.now() - 60 * 60_000).toISOString();

const pr = (fields = {}) => ({
  number: 7,
  title: "sprint/3-dots",
  body: "The team is working on this pull request.",
  labels: [],
  head: { repo: { full_name: REPO } },
  html_url: URL,
  ...fields,
});
const comment = (id, fields = {}) => ({
  id,
  user: { login: APP },
  created_at: after,
  body: ADVICE,
  html_url: `${URL}#issuecomment-${id}`,
  ...fields,
});

/** GitHub's side: the PR and its comments (either maybe {$seq: […]}), and the writes. */
function github({ pulls = pr(), comments = [], dispatch = "" } = {}) {
  return {
    [R]: { default_branch: "main" },
    [`${R}/pulls/7`]: pulls,
    [`${R}/issues/7/comments`]: comments,
    [`POST ${R}/actions/workflows/team-pr.yml/dispatches`]: dispatch,
    [`PATCH ${R}/pulls/7`]: pr(),
    [`POST ${R}/issues/7/labels`]: [{ name: "review" }],
    [`POST ${R}/issues/7/comments`]: comment(9, {
      user: { login: "nycruslan" },
    }),
  };
}

function teamPr(table, args, { wait = "10000" } = {}) {
  const log = ghLog();
  const result = runHook("team-pr.mjs", "", {
    cwd: repo,
    args,
    env: {
      GH_ROUTES: routes(table),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
      THESEUS_TEAM_PR_POLL_MS: "10",
      // Each fake gh call is a Node process, slow on a busy machine, and a passing run returns as
      // soon as GitHub answers: only the tests of running out of time set a short budget.
      THESEUS_TEAM_PR_WAIT_MS: wait,
    },
  });
  const calls = log.calls();
  const sent = (method, path) =>
    calls
      .filter((call) => call.includes(method) && call.includes(path))
      .map((call) => JSON.parse(call.at(-1)));
  const dispatched = sent(
    "POST",
    `${R}/actions/workflows/team-pr.yml/dispatches`,
  );
  return { ...result, calls, sent, dispatched };
}

/** Whether the run wrote anything on the PR itself, under the owner's login. */
const ownWrites = ({ sent }) => [
  ...sent("PATCH", `${R}/pulls/7`),
  ...sent("POST", `${R}/issues/7/labels`),
  ...sent("POST", `${R}/issues/7/comments`),
];

test("asks team-pr.yml for the label, and waits until the PR has it", () => {
  const labelled = pr({ labels: [{ name: "Review" }] });
  const run = teamPr(github({ pulls: { $seq: [pr(), pr(), labelled] } }), [
    "7",
    "--label",
    "review",
  ]);
  assert.equal(run.code, 0, run.stderr);
  assert.equal(
    run.stdout.trim(),
    `PR #7 has the review label from the checks app: ${URL}`,
  );
  assert.deepEqual(run.dispatched, [
    { ref: "main", inputs: { number: "7", label: "review" } },
  ]);
  assert.deepEqual(ownWrites(run), []);
});

test("asks for the title and body, and waits until GitHub shows them, whatever the line endings", () => {
  const edited = pr({ title: "Sprint 3: dots", body: "## Goal\r\nDots." });
  const run = teamPr(github({ pulls: { $seq: [pr(), pr(), edited] } }), [
    "7",
    "--title",
    " Sprint 3: dots ",
    "--body",
    ".crew/sprint/3/pr.md",
  ]);
  assert.equal(run.code, 0, run.stderr);
  assert.equal(
    run.stdout.trim(),
    `PR #7 has the new title and body from the checks app: ${URL}`,
  );
  assert.deepEqual(run.dispatched, [
    {
      ref: "main",
      inputs: { number: "7", title: "Sprint 3: dots", body: BODY },
    },
  ]);
  assert.deepEqual(ownWrites(run), []);
});

test("waits for the app's own comment, made since it asked, with the file's text", () => {
  // Neither counts: the same text from another login, and the app's own from before the run.
  const others = [
    comment(1, { created_at: before }),
    comment(2, { user: { login: "nycruslan" } }),
  ];
  const fresh = comment(3, { body: "Iris: ship.\r\n\r\nThe dots read well." });
  const run = teamPr(
    github({ comments: { $seq: [others, others, [...others, fresh]] } }),
    ["7", "--comment", ".crew/sprint/3/advice.md"],
  );
  assert.equal(run.code, 0, run.stderr);
  assert.equal(
    run.stdout.trim(),
    `PR #7 has the comment from the checks app: ${URL}#issuecomment-3`,
  );
  assert.deepEqual(run.dispatched, [
    { ref: "main", inputs: { number: "7", comment: ADVICE } },
  ]);
  assert.deepEqual(ownWrites(run), []);
});

test("asks only for what doesn't show yet, and for nothing when it all does", () => {
  const labelled = pr({ labels: [{ name: "review" }] });
  const kept = teamPr(github({ pulls: labelled }), ["7", "--label", "review"]);
  assert.equal(kept.code, 0, kept.stderr);
  assert.equal(
    kept.stdout.trim(),
    `PR #7 has the review label already: ${URL}`,
  );
  assert.deepEqual(kept.dispatched, []);
  assert.deepEqual(ownWrites(kept), []);

  const mixed = teamPr(
    github({ pulls: labelled, comments: { $seq: [[], [comment(3)]] } }),
    ["7", "--label", "review", "--comment", ".crew/sprint/3/advice.md"],
  );
  assert.equal(mixed.code, 0, mixed.stderr);
  assert.equal(
    mixed.stdout.trim(),
    `PR #7 has the review label already, and the comment from the checks app: ${URL}#issuecomment-3`,
  );
  assert.deepEqual(mixed.dispatched, [
    { ref: "main", inputs: { number: "7", comment: ADVICE } },
  ]);
});

test("makes it all itself, under the owner's login, when GitHub won't start the workflow", () => {
  const run = teamPr(
    github({
      dispatch: { $error: 422, message: "inputs are too large" },
    }),
    [
      "7",
      "--title",
      "Sprint 3: dots",
      "--body",
      ".crew/sprint/3/pr.md",
      "--label",
      "review",
      "--comment",
      ".crew/sprint/3/advice.md",
    ],
  );
  assert.equal(run.code, 0, run.stderr);
  assert.equal(
    run.stdout.trim(),
    `PR #7 has the new title and body, the review label and the comment under the owner's login, since GitHub refused to start team-pr.yml (inputs are too large): ${URL}#issuecomment-9`,
  );
  assert.deepEqual(run.sent("PATCH", `${R}/pulls/7`), [
    { title: "Sprint 3: dots", body: BODY },
  ]);
  assert.deepEqual(run.sent("POST", `${R}/issues/7/labels`), [
    { labels: ["review"] },
  ]);
  assert.deepEqual(run.sent("POST", `${R}/issues/7/comments`), [
    { body: ADVICE },
  ]);
});

test("makes what the app's run hasn't shown in time itself, and keeps what it has", () => {
  // The title comes from the app; the label never does.
  const run = teamPr(
    github({ pulls: { $seq: [pr(), pr({ title: "Sprint 3: dots" })] } }),
    ["7", "--title", "Sprint 3: dots", "--label", "review"],
    { wait: "300" },
  );
  assert.equal(run.code, 0, run.stderr);
  assert.match(
    run.stdout,
    /^PR #7 has the new title from the checks app, and the review label under the owner's login, since the checks app hadn't made it after \d+ min \(see team-pr\.yml's runs\): https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/7$/m,
  );
  assert.deepEqual(run.sent("POST", `${R}/issues/7/labels`), [
    { labels: ["review"] },
  ]);
  assert.deepEqual(run.sent("PATCH", `${R}/pulls/7`), []);
});

test("posts the comment itself when only another login's or an older one shows", () => {
  const run = teamPr(
    github({
      comments: [
        comment(1, { created_at: before }),
        comment(2, { user: { login: "nycruslan" } }),
      ],
    }),
    ["7", "--comment", ".crew/sprint/3/advice.md"],
    { wait: "300" },
  );
  assert.equal(run.code, 0, run.stderr);
  assert.match(
    run.stdout,
    /^PR #7 has the comment under the owner's login, since the checks app hadn't made it after \d+ min .*: https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/7#issuecomment-9$/m,
  );
  assert.deepEqual(run.sent("POST", `${R}/issues/7/comments`), [
    { body: ADVICE },
  ]);
});

test("refuses a fork's PR and an empty comment, writing nothing", () => {
  const fork = teamPr(
    github({ pulls: pr({ head: { repo: { full_name: "someone/fork" } } }) }),
    ["7", "--label", "review"],
  );
  assert.equal(fork.code, 1);
  assert.match(
    fork.stderr,
    /^Couldn't write on PR #7: it isn't from a branch of nycruslan\/theseus-portfolio/m,
  );
  const empty = teamPr(github(), ["7", "--comment", ".crew/sprint/3/empty.md"]);
  assert.equal(empty.code, 1);
  assert.match(
    empty.stderr,
    /^Couldn't write on PR #7: \.crew\/sprint\/3\/empty\.md is empty/m,
  );
  for (const run of [fork, empty]) {
    assert.equal(run.calls.filter((call) => call.includes("POST")).length, 0);
    assert.equal(run.calls.filter((call) => call.includes("PATCH")).length, 0);
  }
});

test("says how to call it", () => {
  for (const args of [
    [],
    ["7"],
    ["--label", "review"],
    ["seven", "--label", "review"],
    ["0", "--label", "review"],
    ["7", "8", "--label", "review"],
    ["7", "--label"],
    ["7", "--label", " "],
    ["7", "--title", ""],
    ["7", "--colour", "red"],
  ]) {
    const { code, stderr, calls } = teamPr(github(), args);
    assert.equal(code, 2, args.join(" "));
    assert.match(stderr, /^Usage: node \.crew\/team-pr\.mjs <number>/);
    assert.equal(calls.length, 0);
  }
});
