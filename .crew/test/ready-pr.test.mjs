import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import {
  ghLog,
  gitRepo,
  ingest,
  REPO,
  routes,
  runHook,
  tempDir,
} from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;
const HEAD = "4ead4ead4ead";
const pr = (draft, state = "open") => ({
  number: 7,
  draft,
  state,
  head: { sha: HEAD },
  html_url: `https://github.com/${REPO}/pull/7`,
});

function ready(table, { args = ["7"], wait = "10000", env = {} } = {}) {
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
      // Each fake gh call is a Node process, slow on a busy machine, and a passing run returns as
      // soon as GitHub answers: only the tests of running out of time set a short budget.
      THESEUS_READY_PR_WAIT_MS: wait,
      ...env,
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
  const stuck = ready({ [`${R}/pulls/7`]: pr(true) }, { wait: "300" });
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

test("refuses a PR that isn't open", () => {
  const closed = ready({
    [`${R}/pulls/7`]: { ...pr(false, "closed"), merged: true },
  });
  assert.equal(closed.code, 1);
  assert.match(closed.stderr, /PR #7 is merged: there's nothing to mark ready/);
  assert.equal(closed.dispatches.length, 0);
});

test("says how to call it", () => {
  for (const args of [[], ["seven"], ["7", "8"]]) {
    const { code, stderr } = ready({}, { args });
    assert.equal(code, 2, args.join(" "));
    assert.match(stderr, /^Usage: node \.crew\/ready-pr\.mjs <number>/);
  }
});

test("puts the PR on air once it's ready, and not while it stays a draft", async () => {
  const studio = await ingest();
  try {
    const env = { STUDIO_INGEST_URL: studio.url };
    ready({ [`${R}/pulls/7`]: pr(true) }, { wait: "300", env });
    ready({ [`${R}/pulls/7`]: { $seq: [pr(true), pr(false)] } }, { env });
    await studio.until(1);
    await sleep(300);
    assert.deepEqual(
      studio.received.map(({ body }) => [body.hook_event_name, body.pr]),
      [
        [
          "StudioPullRequest",
          {
            action: "ready",
            number: 7,
            url: `https://github.com/${REPO}/pull/7`,
            head: HEAD,
          },
        ],
      ],
    );
  } finally {
    studio.close();
  }
});
