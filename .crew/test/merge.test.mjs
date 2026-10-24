import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
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
// Check runs from the checks app, the one the rules name (integration_id 1).
const APP = { id: 1, slug: "theseus-checks" };
const done = (name, conclusion = "success", id = 1, app = APP) => ({
  id,
  name,
  status: "completed",
  conclusion,
  app,
});
const RUNNING = {
  id: 9,
  name: "lens",
  status: "in_progress",
  conclusion: null,
  app: APP,
};
const GREEN = [done("check"), done("gate"), done("lens")];
/** The base branch's active rules, as GitHub lists them, requiring these checks. */
const rules = (...names) => [
  { type: "pull_request", parameters: { require_code_owner_review: true } },
  {
    type: "required_status_checks",
    parameters: {
      required_status_checks: names.map((context) => ({
        context,
        integration_id: APP.id,
      })),
    },
  },
];
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
  required = rules("check", "gate", "lens"),
  checks = GREEN,
  statuses = [],
  merge = { sha: "5a1e5a1e5a1e", merged: true },
} = {}) {
  return {
    [`${R}/pulls/12`]: pulls,
    [`${R}/rules/branches/main`]: required,
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
      // Each fake gh call is a Node process, slow on a busy machine, and a passing run returns as
      // soon as the checks settle: only the tests of running out of time set a short budget.
      THESEUS_MERGE_WAIT_MS: "10000",
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

test("waits while no check has reported, then while one runs, then merges", () => {
  const { code, stdout, merges } = merge(
    github({
      checks: { $seq: [[], [done("check"), done("gate"), RUNNING], GREEN] },
    }),
  );
  assert.equal(code, 0);
  assert.equal(merges.length, 1);
  assert.match(
    stdout,
    /Waiting on PR #12 at 4ead4ea: check not reported, gate not reported, lens not reported\./,
  );
  assert.match(stdout, /check go, gate go, lens pending/);
});

test("refuses without asking GitHub when a required check never reports, and says why for lens", () => {
  const short = { env: { THESEUS_MERGE_WAIT_MS: "300" } };
  const unlabelled = merge(
    github({ checks: [done("check"), done("gate")] }),
    short,
  );
  assert.equal(unlabelled.code, 1);
  assert.equal(unlabelled.merges.length, 0);
  assert.match(
    unlabelled.stderr,
    /NO-GO for PR #12: lens never reported on 4ead4ea; label the PR `review`\./,
  );
  const labelled = merge(
    github({
      pulls: pr({ labels: [{ name: "review" }] }),
      checks: [done("check"), done("gate")],
    }),
    short,
  );
  assert.match(
    labelled.stderr,
    /lens never reported on 4ead4ea; Lens hasn't finished yet\./,
  );
});

test("leaves a PR that gate passed on the owner's approval to the owner", () => {
  // A session acts as the owner, so it could have posted that approval itself.
  const released = { ...done("gate"), external_id: "owner-approved" };
  const { code, stderr, merges } = merge(
    github({ checks: [done("check"), released, done("lens")] }),
  );
  assert.equal(code, 1);
  assert.equal(merges.length, 0);
  assert.match(
    stderr,
    /NO-GO for PR #12: gate passed on the owner's approval, so the owner merges it\./,
  );
  // A later gate run from another app doesn't hide the checks app's.
  const other = done("gate", "success", 5, { id: 99, slug: "someone" });
  const hidden = merge(
    github({ checks: [done("check"), released, other, done("lens")] }),
  );
  assert.equal(hidden.code, 1);
  assert.equal(hidden.merges.length, 0);
});

test("waits for the checks the base branch's rules require, not a fixed list", () => {
  const { code } = merge(
    github({ required: rules("check"), checks: [done("check")] }),
  );
  assert.equal(code, 0);
  const strict = merge(
    github({ required: rules("check", "preview"), checks: [done("check")] }),
    { env: { THESEUS_MERGE_WAIT_MS: "300" } },
  );
  assert.match(strict.stderr, /preview never reported on 4ead4ea\./);
});

test("fails closed when the rules can't be read or require no check", () => {
  for (const [required, reason] of [
    [{ $error: 404, message: "Not Found" }, /couldn't be read .*: Not Found/],
    [
      rules().slice(0, 1),
      /NO-GO for PR #12: the main rules require no checks\./,
    ],
  ]) {
    const { code, stderr, merges } = merge(github({ required }));
    assert.equal(code, 1);
    assert.equal(merges.length, 0);
    assert.match(stderr, reason);
  }
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

test("asks GitHub once the checks have settled, whatever the checks it doesn't require say", () => {
  const unstable = merge(
    github({
      pulls: pr({ mergeable_state: "unstable" }),
      statuses: [{ context: "Vercel", state: "failure" }],
    }),
  );
  assert.equal(unstable.code, 0);
  // Anything else is GitHub's to answer, such as a code owner's review it still waits for.
  const refused = merge(
    github({
      pulls: pr({ mergeable_state: "blocked" }),
      merge: {
        $error: 405,
        message: "Waiting on code owner review from nycruslan.",
      },
    }),
  );
  assert.equal(refused.code, 1);
  assert.equal(refused.merges.length, 1);
  assert.match(
    refused.stderr,
    /refused the merge: Waiting on code owner review from nycruslan\./,
  );
});

test("refuses a failed or still-running required check by name, without asking GitHub", () => {
  const failed = merge(
    github({
      pulls: pr({ mergeable_state: "blocked" }),
      checks: [done("check"), done("gate"), done("lens", "failure")],
    }),
  );
  assert.equal(failed.code, 1);
  assert.equal(failed.merges.length, 0);
  assert.match(failed.stderr, /lens didn't pass on/);
  const running = merge(
    github({
      pulls: pr({ mergeable_state: "blocked" }),
      checks: [
        done("check"),
        done("gate"),
        { ...done("lens"), status: "in_progress", conclusion: null },
      ],
    }),
    { env: { THESEUS_MERGE_WAIT_MS: "300" } },
  );
  assert.equal(running.code, 1);
  assert.equal(running.merges.length, 0);
  assert.match(
    running.stderr,
    /lens still running on .+: run node \.crew\/merge\.mjs \d+ again/,
  );
});

test("doesn't ask when GitHub says no or can't yet tell: a conflict, a branch behind, unknown", () => {
  for (const state of ["dirty", "behind", "unknown"]) {
    const { code, merges, stderr } = merge(
      github({ pulls: pr({ mergeable_state: state }) }),
      { env: { THESEUS_MERGE_WAIT_MS: "300" } },
    );
    assert.equal(code, 1, state);
    assert.equal(merges.length, 0, state);
    assert.match(stderr, new RegExp(`GitHub says "${state}"`));
  }
});

test("refuses a draft and says how to mark it ready", () => {
  const { code, stderr, merges } = merge(
    github({ pulls: pr({ draft: true, mergeable_state: "draft" }) }),
  );
  assert.equal(code, 1);
  assert.equal(merges.length, 0);
  assert.match(
    stderr,
    /NO-GO for PR #12: it's still a draft: mark it ready with node \.crew\/ready-pr\.mjs 12\./,
  );
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
  // A closed PR whose checks never settled, as an old sprint's PR under a mistaken number, is
  // refused on the first read: there is nothing to wait for.
  const stale = merge(
    github({
      pulls: pr({ state: "closed", mergeable_state: "unknown" }),
      checks: [done("check", "failure"), done("gate")],
    }),
  );
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /the PR is closed/);
  assert.equal(
    stale.calls.filter((call) => call.includes(`${R}/pulls/12`)).length,
    1,
  );
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

test("puts the checks on air, and then the merged PR", async () => {
  const studio = await ingest();
  try {
    merge(github(), {
      env: { STUDIO_INGEST_URL: studio.url, CLAUDE_CODE_SESSION_ID: "abc123" },
    });
    const posts = await studio.until(2);
    const [gate, merged] = ["StudioGateChecked", "StudioPullRequest"].map(
      (name) => posts.find(({ body }) => body.hook_event_name === name).body,
    );
    assert.equal(gate.session_id, "abc123");
    assert.deepEqual(
      {
        ...gate.gate,
        items: gate.gate.items.map(({ who, state }) => `${who} ${state}`),
      },
      {
        target: "merge",
        pr: 12,
        head: HEAD,
        pass: true,
        items: ["check go", "gate go", "lens go"],
      },
    );
    assert.equal(merged.session_id, "abc123");
    assert.equal(merged.repo, "theseus-portfolio");
    assert.deepEqual(merged.pr, {
      action: "merged",
      number: 12,
      url: `https://github.com/${REPO}/pull/12`,
      head: HEAD,
      merged: "5a1e5a1e5a1e",
    });
  } finally {
    studio.close();
  }
});

test("puts only the checks on air when it doesn't merge", async () => {
  const studio = await ingest();
  try {
    merge(github({ pulls: pr({ draft: true, mergeable_state: "draft" }) }), {
      env: { STUDIO_INGEST_URL: studio.url },
    });
    await studio.until(1);
    await sleep(300);
    assert.deepEqual(
      studio.received.map(({ body }) => [
        body.hook_event_name,
        body.gate?.pass,
        "session_id" in body,
      ]),
      [["StudioGateChecked", false, false]],
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
