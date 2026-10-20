import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;
const pr = (draft) => ({
  number: 7,
  draft,
  html_url: `https://github.com/${REPO}/pull/7`,
});

function ready(table, args = ["7"]) {
  const log = ghLog();
  const result = runHook("ready-pr.mjs", "", {
    cwd: repo,
    args,
    env: {
      GH_ROUTES: routes({
        [R]: { default_branch: "main" },
        [`POST ${R}/actions/workflows/ready-pr.yml/dispatches`]: "",
        ...table,
      }),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
      THESEUS_READY_PR_POLL_MS: "10",
      THESEUS_READY_PR_WAIT_MS: "300",
    },
  });
  const dispatches = log
    .calls()
    .filter((call) => call.includes("POST"))
    .map((call) => JSON.parse(call.at(-1)));
  return { ...result, dispatches };
}

test("asks ready-pr.yml to mark the draft ready, and waits until GitHub says it is", () => {
  const { code, stdout, dispatches } = ready({
    [`${R}/pulls/7`]: { $seq: [pr(true), pr(true), pr(false)] },
  });
  assert.equal(code, 0);
  assert.match(
    stdout,
    /^PR #7 is ready for review: https:\/\/github\.com\/.*\/pull\/7$/m,
  );
  assert.deepEqual(dispatches, [{ ref: "main", inputs: { number: "7" } }]);
});

test("leaves a PR that's already ready alone", () => {
  const { code, stdout, dispatches } = ready({ [`${R}/pulls/7`]: pr(false) });
  assert.equal(code, 0);
  assert.match(stdout, /^PR #7 is ready for review/m);
  assert.equal(dispatches.length, 0);
});

test("says so when the PR stays a draft, or GitHub won't start the workflow", () => {
  const stuck = ready({ [`${R}/pulls/7`]: pr(true) });
  assert.equal(stuck.code, 1);
  assert.match(
    stuck.stderr,
    /still a draft after \d+ min: see ready-pr\.yml's runs/,
  );
  const refused = ready({
    [`${R}/pulls/7`]: pr(true),
    [`POST ${R}/actions/workflows/ready-pr.yml/dispatches`]: {
      $error: 403,
      message: "Resource not accessible",
    },
  });
  assert.equal(refused.code, 1);
  assert.match(
    refused.stderr,
    /Couldn't mark PR #7 ready: .*Resource not accessible/,
  );
});

test("says how to call it", () => {
  for (const args of [[], ["seven"], ["7", "8"]]) {
    const { code, stderr } = ready({}, args);
    assert.equal(code, 2, args.join(" "));
    assert.match(stderr, /^Usage: node \.studio\/ready-pr\.mjs <number>/);
  }
});
