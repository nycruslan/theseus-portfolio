import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({
  ".studio/sprint/3/pr.md": "**Work in progress**\n\n## Goal\nDots.\n",
});
const R = `repos/${REPO}`;
const BRANCH = "sprint/3-dots";
const ARGS = [
  "--head",
  BRANCH,
  "--title",
  "Sprint 3: dots",
  "--body",
  ".studio/sprint/3/pr.md",
];
const FIELDS = {
  title: "Sprint 3: dots",
  body: "**Work in progress**\n\n## Goal\nDots.\n",
};
const pr = (number, author = "theseus-checks[bot]") => ({
  number,
  user: { login: author },
  html_url: `https://github.com/${REPO}/pull/${number}`,
});

/** GitHub's side: the repository, the branch's open PRs (maybe {$seq: […]}), and the writes. */
function github({ open = [], dispatch = "" } = {}) {
  return {
    [R]: { default_branch: "main", owner: { login: "nycruslan" } },
    [`${R}/branches/${BRANCH}`]: { name: BRANCH },
    [`${R}/pulls?state=open`]: open,
    [`POST ${R}/actions/workflows/open-pr.yml/dispatches`]: dispatch,
    [`POST ${R}/pulls`]: pr(8, "nycruslan"),
    [`PATCH ${R}/pulls/*`]: {},
  };
}

function openPr(table, { args = ARGS, env = {} } = {}) {
  const log = ghLog();
  const result = runHook("open-pr.mjs", "", {
    cwd: repo,
    args,
    env: {
      GH_ROUTES: routes(table),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
      THESEUS_OPEN_PR_POLL_MS: "10",
      // Each fake gh call is a Node process, slow on a busy machine, and a passing run returns as
      // soon as GitHub answers: only the tests of running out of time set a short budget.
      THESEUS_OPEN_PR_WAIT_MS: "10000",
      ...env,
    },
  });
  const calls = log.calls();
  const sent = (method, path) =>
    calls
      .filter((call) => call.includes(method) && call.includes(path))
      .map((call) => JSON.parse(call.at(-1)));
  return { ...result, calls, sent };
}

test("asks the checks app for the PR, waits for it, then sets its title and body", () => {
  const { code, stdout, sent, calls } = openPr(
    github({ open: { $seq: [[], [], [pr(7)]] } }),
  );
  assert.equal(code, 0);
  assert.match(
    stdout,
    /^Opened PR #7 through the checks app, so the owner can approve it: https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/7$/m,
  );
  assert.deepEqual(
    sent("POST", `${R}/actions/workflows/open-pr.yml/dispatches`),
    [{ ref: "main", inputs: { branch: BRANCH } }],
  );
  assert.deepEqual(sent("PATCH", `${R}/pulls/7`), [FIELDS]);
  assert.equal(sent("POST", `${R}/pulls`).length, 0);
  // It asks for the branch's own open PRs, by owner:branch.
  const read = calls.find((call) => String(call[3]).startsWith(`${R}/pulls?`));
  const asked = new URLSearchParams(read[3].split("?")[1]);
  assert.equal(asked.get("head"), `nycruslan:${BRANCH}`);
  assert.equal(asked.get("state"), "open");
});

test("keeps a PR that's already open, with the new title and body, and opens nothing", () => {
  const { code, stdout, sent } = openPr(github({ open: [pr(7)] }));
  assert.equal(code, 0);
  assert.match(stdout, /^PR #7 was already open from sprint\/3-dots/m);
  assert.doesNotMatch(stdout, /^Opened/m);
  assert.deepEqual(sent("PATCH", `${R}/pulls/7`), [FIELDS]);
  assert.equal(sent("POST", "dispatches").length, 0);
});

test("opens the PR itself, under the owner's login, when the app's PR doesn't come", () => {
  const { code, stdout, sent } = openPr(github(), {
    env: { THESEUS_OPEN_PR_WAIT_MS: "300" },
  });
  assert.equal(code, 0);
  assert.match(
    stdout,
    /^Opened PR #8 under the owner's login, since the checks app hadn't opened it after \d+ min .*: https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/8$/m,
  );
  assert.deepEqual(sent("POST", `${R}/pulls`), [
    { ...FIELDS, head: BRANCH, base: "main", draft: true },
  ]);
});

test("keeps the app's PR when it lands just as the script opens its own", () => {
  // A 1 ms budget allows one poll: the first read and that poll find nothing, GitHub refuses the
  // script's own PR, and the read after that finds the app's.
  const table = github({ open: { $seq: [[], [], [pr(7)]] } });
  table[`POST ${R}/pulls`] = {
    $error: 422,
    message: "A pull request already exists for nycruslan:sprint/3-dots.",
  };
  const { code, stdout, sent } = openPr(table, {
    env: { THESEUS_OPEN_PR_WAIT_MS: "1" },
  });
  assert.equal(code, 0);
  assert.match(stdout, /^Opened PR #7 through the checks app/m);
  assert.deepEqual(sent("PATCH", `${R}/pulls/7`), [FIELDS]);
});

test("opens the PR itself when GitHub won't start the workflow", () => {
  const { code, stdout } = openPr(
    github({ dispatch: { $error: 403, message: "Resource not accessible" } }),
  );
  assert.equal(code, 0);
  assert.match(
    stdout,
    /^Opened PR #8 under the owner's login, since GitHub refused to start open-pr\.yml \(Resource not accessible/m,
  );
});

test("fails with GitHub's word when it can't open one at all", () => {
  const table = github();
  table[`POST ${R}/pulls`] = {
    $error: 422,
    message: "No commits between main and sprint/3-dots",
  };
  const { code, stderr } = openPr(table, {
    env: { THESEUS_OPEN_PR_WAIT_MS: "300" },
  });
  assert.equal(code, 1);
  assert.match(stderr, /Couldn't open a PR from sprint\/3-dots: .*No commits/);
});

test("asks for a push first when the branch isn't on GitHub", () => {
  const table = github();
  delete table[`${R}/branches/${BRANCH}`];
  const { code, stderr, calls } = openPr(table);
  assert.equal(code, 1);
  assert.match(
    stderr,
    /^sprint\/3-dots isn't on GitHub: push it, then open its PR\./m,
  );
  assert.equal(calls.filter((call) => call.includes("POST")).length, 0);
});

test("says how to call it when an argument is missing", () => {
  for (const args of [
    [],
    ["--head", BRANCH, "--body", ".studio/sprint/3/pr.md"],
    ["--head", BRANCH, "--title", " ", "--body", ".studio/sprint/3/pr.md"],
    [...ARGS, "extra"],
  ]) {
    const { code, stderr, calls } = openPr(github(), { args });
    assert.equal(code, 2, args.join(" "));
    assert.match(stderr, /^Usage: node \.studio\/open-pr\.mjs --head/);
    assert.equal(calls.length, 0);
  }
});
