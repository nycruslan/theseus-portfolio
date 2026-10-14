import assert from "node:assert/strict";
import { test } from "node:test";
import { repoFromRemote } from "../github.mjs";
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
const done = (name, conclusion = "success", id = 1) => ({
  id,
  name,
  status: "completed",
  conclusion,
});
const RUNNING = {
  id: 9,
  name: "lens",
  status: "in_progress",
  conclusion: null,
};
const GREEN = [done("check"), done("gate"), done("lens")];
const pr = (extra = {}) => ({
  number: 12,
  state: "open",
  merged: false,
  mergeable_state: "clean",
  head: { sha: HEAD },
  base: { ref: "main" },
  html_url: `https://github.com/${REPO}/pull/12`,
  ...extra,
});

/** The GitHub side of PR #12. `pulls` and `checks` may be {$seq: […]} to change between polls. */
function github({
  pulls = pr(),
  checks = GREEN,
  statuses = [],
  merge = { sha: "5a1e5a1e5a1e", merged: true },
} = {}) {
  return {
    [`${R}/pulls/12`]: pulls,
    [`${R}/commits/${HEAD}/check-runs`]: checks.$seq
      ? { $seq: checks.$seq.map((runs) => ({ check_runs: runs })) }
      : { check_runs: checks },
    [`${R}/commits/${HEAD}/status`]: { statuses },
    [`PUT ${R}/pulls/12/merge`]: merge,
  };
}

function merge(table, { env = {}, args = ["12"] } = {}) {
  const log = ghLog();
  const result = runHook("merge.mjs", "", {
    cwd: repo,
    args,
    env: {
      GH_ROUTES: routes(table),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
      THESEUS_MERGE_POLL_MS: "10",
      THESEUS_MERGE_WAIT_MS: "2000",
      ...env,
    },
  });
  const calls = log.calls();
  return {
    ...result,
    calls,
    merges: calls.filter((call) => call.includes("PUT")),
  };
}

test("squash-merges the head it checked once GitHub says clean", () => {
  const { code, stdout, merges } = merge(github());
  assert.equal(code, 0);
  assert.match(stdout, /Merged PR #12 \(4ead4ea\) as 5a1e5a1/);
  assert.equal(merges.length, 1);
  assert.deepEqual(JSON.parse(merges[0].at(-1)), {
    merge_method: "squash",
    sha: HEAD,
  });
});

test("waits while a check runs, then merges", () => {
  const { code, stdout } = merge(
    github({
      pulls: { $seq: [pr({ mergeable_state: "blocked" }), pr()] },
      checks: { $seq: [[done("check"), done("gate"), RUNNING], GREEN] },
    }),
  );
  assert.equal(code, 0);
  assert.match(
    stdout,
    /Waiting on PR #12 at 4ead4ea: check go, gate go, lens pending/,
  );
});

test("counts only the latest run of a check, so a superseded cancelled run doesn't hold the PR", () => {
  const { code } = merge(
    github({
      checks: [
        done("gate", "cancelled", 1),
        done("gate", "success", 2),
        done("check"),
        done("lens"),
      ],
    }),
  );
  assert.equal(code, 0);
});

test("asks GitHub whatever a check it doesn't require says, and reports GitHub's answer", () => {
  const unstable = merge(
    github({
      pulls: pr({ mergeable_state: "unstable" }),
      statuses: [{ context: "Vercel", state: "failure" }],
    }),
  );
  assert.equal(unstable.code, 0);
  const refused = merge(
    github({
      pulls: pr({ mergeable_state: "blocked" }),
      checks: [done("check"), done("gate", "failure")],
      merge: {
        $error: 405,
        message: 'Required status check "lens" is expected.',
      },
    }),
  );
  assert.equal(refused.code, 1);
  assert.match(
    refused.stderr,
    /refused the merge: Required status check "lens" is expected\./,
  );
  assert.match(refused.stderr, /lens hasn't run: label the PR `review`/);
});

test("doesn't ask when GitHub already says no: a conflict, a draft or a branch behind", () => {
  for (const state of ["dirty", "draft", "behind"]) {
    const { code, merges, stderr } = merge(
      github({ pulls: pr({ mergeable_state: state }) }),
    );
    assert.equal(code, 1, state);
    assert.equal(merges.length, 0, state);
    assert.match(stderr, new RegExp(`GitHub says "${state}"`));
  }
});

test("refuses when the branch moves or the PR isn't open", () => {
  const moved = merge(
    github({
      pulls: {
        $seq: [
          pr({ mergeable_state: "unknown" }),
          pr({ head: { sha: "beef" } }),
        ],
      },
    }),
  );
  assert.equal(moved.code, 1);
  assert.match(moved.stderr, /branch moved to beef/);
  const closed = merge(
    github({ pulls: pr({ state: "closed", merged: true }) }),
  );
  assert.match(closed.stderr, /already merged/);
});

test("fails closed, with the reason, when GitHub can't be read", () => {
  const { code, stderr } = merge({}, { env: { GH_FAIL: "HTTP 502" } });
  assert.equal(code, 1);
  assert.match(stderr, /NO-GO for PR #12: GitHub couldn't be read/);
});

test("takes only a bare PR number", () => {
  for (const args of [
    [],
    ["#12"],
    ["12", "--admin"],
    ["https://github.com/x/y/pull/12"],
  ]) {
    assert.equal(merge(github(), { args }).code, 2, args.join(" "));
  }
});

test("puts the checks on air, merged or not", async () => {
  const studio = await ingest();
  try {
    merge(github(), {
      env: { STUDIO_INGEST_URL: studio.url, CLAUDE_CODE_SESSION_ID: "abc123" },
    });
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioGateChecked");
    assert.equal(body.session_id, "abc123");
    assert.deepEqual(
      {
        ...body.gate,
        items: body.gate.items.map(({ who, state }) => `${who} ${state}`),
      },
      {
        target: "merge",
        pr: 12,
        head: HEAD,
        pass: true,
        items: ["check go", "gate go", "lens go"],
      },
    );
  } finally {
    studio.close();
  }
});

test("knows owner/repo from every kind of remote", () => {
  for (const url of [
    "https://github.com/nycruslan/theseus-portfolio.git",
    "git@github.com:nycruslan/theseus-portfolio.git",
    "ssh://git@github.com/nycruslan/theseus-portfolio.git",
    "http://local_proxy@127.0.0.1:40123/git/nycruslan/theseus-portfolio/",
  ]) {
    assert.equal(repoFromRemote(url), REPO, url);
  }
});
