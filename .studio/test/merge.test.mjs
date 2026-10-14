import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { covers } from "../gate.mjs";
import { repoFromRemote } from "../github.mjs";
import { verdictComment } from "../verdict.mjs";
import {
  ghLog,
  gitRepo,
  ingest,
  REPO,
  routes,
  runHook,
  tempDir,
} from "./kit.mjs";

// Reviewed at `reviewed`; then one commit touching only the team's notes, then one changing code.
const { dir: repo, shas } = gitRepo(
  {
    "lib/data.ts": "v1",
    "app/page.tsx": "page",
    ".studio/sprint/1/plan.md": "p",
  },
  {
    ".studio/STATE.md": "lesson",
    ".claude/agent-memory/forge/MEMORY.md": "x",
    ".studio/sprint/1/notes.md": "n",
  },
  { "lib/data.ts": "v2" },
);
const [reviewed, notesOnly, codeChange] = shas;
const R = `repos/${REPO}`;
const URL = `https://github.com/${REPO}/pull/12`;

const GREEN = { name: "check", status: "completed", conclusion: "success" };
const RUNNING = { name: "check", status: "in_progress", conclusion: null };
const RED = { name: "check", status: "completed", conclusion: "failure" };
const SCOPE = { name: "scope", status: "completed", conclusion: "success" };
// The base branch's rules as GitHub's REST API lists them: the protect-main ruleset requires `check`.
const RULES = [
  { type: "pull_request", parameters: { required_approving_review_count: 0 } },
  {
    type: "required_status_checks",
    parameters: {
      required_status_checks: [{ context: "check", integration_id: 15368 }],
    },
  },
];
const verdict = (who, state = "success", description = undefined) => ({
  context: `theseus/${who}`,
  state,
  description:
    description ?? (state === "success" ? "Verdict: ship" : "Verdict: changes"),
});
const LENS = verdict("lens");
// A changed file as GitHub's REST API lists it.
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
  ...extra,
});

// A verdict comment as REST lists it, with the body verdict.mjs writes.
let commentId = 100;
const said = (
  role,
  verdict,
  head,
  { line = `Verdict: ${verdict}`, score, association = "OWNER" } = {},
) => ({
  id: commentId++,
  author_association: association,
  user: { login: association === "OWNER" ? "nycruslan" : "someone" },
  body: verdictComment({ role, verdict, head, line, score }),
});

/**
 * The GitHub side of PR #12, as REST serves it.
 * @param statuses commit statuses by sha; CI statuses and the reviewers' verdicts alike.
 * @param comments the PR's comments, oldest first.
 */
function github({
  head = reviewed,
  commits = [head],
  files = [changed("lib/data.ts")],
  checks = [GREEN, SCOPE],
  rules = RULES,
  workflowRuns = [],
  statuses = { [head]: [LENS] },
  comments = [],
  labels = [],
  events = [],
  pr = {},
  merge = {
    sha: "5a1e5a1e5a1e",
    merged: true,
    message: "Pull Request successfully merged",
  },
  extra = {},
} = {}) {
  const table = {
    [`${R}/pulls/12`]: {
      number: 12,
      state: "open",
      draft: false,
      merged: false,
      mergeable: true,
      mergeable_state: "clean",
      head: { sha: head },
      base: { sha: "ba5e", ref: "main" },
      labels: labels.map((name) => ({ name })),
      html_url: URL,
      ...pr,
    },
    [`${R}/pulls/12/files`]: files,
    [`${R}/pulls/12/commits`]: commits.map((sha) => ({ sha })),
    [`${R}/issues/12/events`]: events,
    [`${R}/issues/12/comments`]: comments,
    [`${R}/commits/*/check-runs`]: { check_runs: checks },
    [`${R}/rules/branches/main`]: rules,
    [`${R}/actions/runs`]: { workflow_runs: workflowRuns },
    [`PUT ${R}/pulls/12/merge`]: merge,
    [`POST ${R}/statuses/*`]: { state: "success" },
    ...extra,
  };
  for (const sha of new Set([...commits, head])) {
    table[`${R}/commits/${sha}/status`] = { statuses: statuses[sha] ?? [] };
  }
  return table;
}

function merge(table = github(), { args = ["12"], cwd = repo, env = {} } = {}) {
  const log = ghLog();
  const result = runHook("merge.mjs", "", {
    args,
    cwd,
    env: {
      GH_ROUTES: routes(table),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
      THESEUS_MERGE_POLL_MS: "20",
      THESEUS_MERGE_WAIT_MS: "400",
      ...env,
    },
  });
  const calls = log.calls();
  const fields = (call) =>
    Object.fromEntries(
      call
        .filter((_, i) => call[i - 1] === "-f")
        .map((field) => field.split(/=(.*)/s).slice(0, 2)),
    );
  return {
    ...result,
    calls,
    merged: calls.filter((call) => call.includes("PUT")).map(fields),
    posted: calls
      .filter((call) => call.includes("POST"))
      .map((call) => ({ path: call[3], ...fields(call) })),
  };
}

test("merges a green, reviewed PR through REST, pinned to the head it checked", () => {
  const { code, stdout, merged } = merge();
  assert.equal(code, 0);
  assert.deepEqual(merged, [{ merge_method: "squash", sha: reviewed }]);
  assert.match(
    stdout,
    new RegExp(
      `Merged PR #12 \\(${reviewed.slice(0, 7)}\\) as 5a1e5a1: ${URL}`,
    ),
  );
});

test("an S-sized change to app/ needs only Lens", () => {
  const files = [changed("app/page.tsx"), changed("components/section.tsx")];
  assert.equal(merge(github({ files })).code, 0);
});

test("e2e changes need Probe too", () => {
  const files = [
    changed("app/page.tsx"),
    changed("e2e/nav.spec.ts", { status: "added" }),
  ];
  const { code, stderr } = merge(github({ files }));
  assert.equal(code, 1);
  assert.match(stderr, /Probe: no verdict on GitHub for this PR/);
  const statuses = { [reviewed]: [LENS, verdict("probe")] };
  assert.equal(merge(github({ files, statuses })).code, 0);
});

test("Iris is needed only once she weighed in, and then her latest verdict must be ship", () => {
  const files = [changed("app/globals.css")];
  assert.equal(merge(github({ files })).code, 0);
  const commits = [reviewed, notesOnly];
  const said = (iris) => ({ [reviewed]: [LENS, iris], [notesOnly]: [LENS] });
  const changes = merge(
    github({
      files,
      commits,
      head: notesOnly,
      statuses: said(verdict("iris", "failure", "Verdict: changes · 6.1/10")),
    }),
  );
  assert.equal(changes.code, 1);
  assert.match(
    changes.stderr,
    new RegExp(
      `Iris said "Verdict: changes · 6.1/10" on ${reviewed.slice(0, 7)}`,
    ),
  );
  const ship = merge(
    github({
      files,
      commits,
      head: notesOnly,
      statuses: said(verdict("iris", "success", "Verdict: ship · 7.4/10")),
    }),
  );
  assert.equal(ship.code, 0);
});

test("a reviewer's failing status on the head holds the merge, quoting its line", () => {
  const statuses = {
    [reviewed]: [verdict("lens", "failure", "Verdict: changes - an N+1 fetch")],
  };
  const { code, stderr, merged } = merge(github({ statuses }));
  assert.equal(code, 1);
  assert.match(
    stderr,
    /Lens said "Verdict: changes - an N\+1 fetch" on this commit/,
  );
  assert.deepEqual(merged, []);
});

test("never says go from the local ledger: a forged ship there changes nothing", () => {
  const tmp = tempDir();
  const forged = {
    role: "code-reviewer",
    agentId: "forged",
    verdict: "ship",
    line: "Verdict: ship",
    head: reviewed,
  };
  writeFileSync(
    join(tmp, "theseus-verdicts-abc123.jsonl"),
    `${JSON.stringify(forged)}\n`,
  );
  const { code, stderr, posted, merged } = merge(github({ statuses: {} }), {
    env: { TMPDIR: tmp, CLAUDE_CODE_SESSION_ID: "abc123" },
  });
  assert.equal(code, 1);
  assert.match(stderr, /Lens: no verdict on GitHub for this PR/);
  assert.deepEqual(posted, []);
  assert.deepEqual(merged, []);
});

test("carries a ship over commits that only touched notes, posting it on the head from GitHub's record", () => {
  const commits = [reviewed, notesOnly];
  const statuses = { [reviewed]: [LENS] };
  const { code, posted, merged } = merge(
    github({ head: notesOnly, commits, statuses }),
  );
  assert.equal(code, 0);
  assert.deepEqual(posted, [
    {
      path: `${R}/statuses/${notesOnly}`,
      state: "success",
      context: "theseus/lens",
      description: `Verdict: ship (from ${reviewed.slice(0, 7)}; only notes changed since)`,
    },
  ]);
  assert.deepEqual(merged, [{ merge_method: "squash", sha: notesOnly }]);
});

test("a ship on older code doesn't cover a code change, from any directory of the checkout", () => {
  const commits = [reviewed, notesOnly, codeChange];
  const table = github({
    head: codeChange,
    commits,
    statuses: { [reviewed]: [LENS] },
  });
  for (const cwd of [repo, join(repo, ".studio/sprint/1"), join(repo, "lib")]) {
    const { code, stderr, posted } = merge(table, { cwd });
    assert.equal(code, 1, cwd);
    assert.match(
      stderr,
      /Lens said ship on [0-9a-f]{7}, and the product changed since/,
      cwd,
    );
    assert.deepEqual(posted, [], cwd);
  }
});

test("stops at once on red CI, without waiting", () => {
  const { code, stderr, calls } = merge(github({ checks: [RED, SCOPE] }));
  assert.equal(code, 1);
  assert.match(stderr, /check failed \(failure\): fix it on the branch/);
  assert.equal(
    calls.filter((call) => call[2]?.includes("check-runs")).length,
    1,
  );
});

test("waits for CI, says so, then merges", () => {
  const table = github();
  table[`${R}/commits/*/check-runs`] = {
    $seq: [
      { check_runs: [] },
      { check_runs: [RUNNING, SCOPE] },
      { check_runs: [GREEN, SCOPE] },
    ],
  };
  const { code, stdout, stderr, merged } = merge(table, {
    env: { THESEUS_MERGE_WAIT_MS: "30000" },
  });
  assert.equal(code, 0, stderr);
  assert.match(
    stdout,
    /Waiting for CI on PR #12 at [0-9a-f]{7}: check, scope still running; 0 of 2 done/,
  );
  assert.match(
    stdout,
    /Waiting for CI on PR #12 at [0-9a-f]{7}: check still running/,
  );
  assert.equal(merged.length, 1);
});

test("gives up when CI doesn't finish in time", () => {
  const { code, stderr, merged } = merge(github({ checks: [RUNNING, SCOPE] }));
  assert.equal(code, 1);
  assert.match(
    stderr,
    /check is still running\. It didn't finish within 0 minutes: run this again/,
  );
  assert.deepEqual(merged, []);
});

test("a check that never reported hasn't passed: only Vercel reported, check and scope didn't", () => {
  const vercel = {
    context: "Vercel",
    state: "success",
    description: "Deployed",
  };
  const { code, stderr, merged } = merge(
    github({ checks: [], statuses: { [reviewed]: [LENS, vercel] } }),
  );
  assert.equal(code, 1);
  assert.match(stderr, /check hasn't reported on this commit yet/);
  assert.match(stderr, /scope hasn't reported on this commit yet/);
  assert.deepEqual(merged, []);
});

test("waits for every check the base branch's ruleset requires", () => {
  const rules = [
    ...RULES,
    {
      type: "required_status_checks",
      parameters: { required_status_checks: [{ context: "lighthouse" }] },
    },
  ];
  const { code, stderr, merged } = merge(github({ rules }));
  assert.equal(code, 1);
  assert.match(stderr, /lighthouse hasn't reported on this commit yet/);
  assert.deepEqual(merged, []);
});

test("fails closed when it can't read the base branch's required checks", () => {
  const rules = {
    $error: 403,
    message: "Resource not accessible by integration",
  };
  const { code, stderr, merged } = merge(github({ rules }));
  assert.equal(code, 1);
  assert.match(stderr, /couldn't check PR #12 \(Resource not accessible/);
  assert.deepEqual(merged, []);
});

test("a cancelled run waits for its queued replacement, and says so when there's none", () => {
  const cancelled = {
    id: 1,
    name: "scope",
    status: "completed",
    conclusion: "cancelled",
    started_at: "2026-10-13T02:09:55Z",
  };
  const replacement = {
    ...SCOPE,
    id: 2,
    started_at: "2026-10-13T02:10:08Z",
  };
  const table = github({ workflowRuns: [{ name: "scope", status: "queued" }] });
  // GitHub keeps the cancelled run on the commit beside its replacement: the replacement is a
  // new check suite, not an update of the old run.
  table[`${R}/commits/*/check-runs`] = {
    $seq: [
      { check_runs: [GREEN, cancelled] },
      { check_runs: [GREEN, replacement, cancelled] },
    ],
  };
  const requeued = merge(table, { env: { THESEUS_MERGE_WAIT_MS: "30000" } });
  assert.equal(requeued.code, 0, requeued.stderr);
  assert.match(
    requeued.stdout,
    /Waiting for CI on PR #12 at [0-9a-f]{7}: scope still running/,
  );
  const { code, stderr } = merge(github({ checks: [GREEN, cancelled] }));
  assert.equal(code, 1);
  assert.match(
    stderr,
    /scope was cancelled, and no newer run is queued: re-run it .*then run this again/,
  );
});

// Seen on PR #12's head c376048: a push, then a label seconds later, cancelled the first scope run,
// and the second passed. Both stay on the commit, so only the latest run per name may count.
test("a superseded cancelled run beside a newer green one doesn't hold the merge", () => {
  const cancelled = {
    id: 51,
    name: "scope",
    status: "completed",
    conclusion: "cancelled",
    started_at: "2026-10-13T02:09:55Z",
  };
  const passed = { ...SCOPE, id: 52, started_at: "2026-10-13T02:10:08Z" };
  for (const checks of [
    [GREEN, passed, cancelled],
    [GREEN, cancelled, passed],
  ]) {
    const { code, stderr, merged } = merge(
      github({
        checks,
        workflowRuns: [{ name: "scope", status: "completed" }],
      }),
    );
    assert.equal(code, 0, stderr);
    assert.deepEqual(merged, [{ merge_method: "squash", sha: reviewed }]);
  }
});

test("the latest run of a check decides: a newer failure beats an older pass", () => {
  const older = { ...GREEN, id: 1, started_at: "2026-10-13T02:00:00Z" };
  const newer = { ...RED, id: 2, started_at: "2026-10-13T02:05:00Z" };
  const { code, stderr } = merge(github({ checks: [older, newer, SCOPE] }));
  assert.equal(code, 1);
  assert.match(stderr, /check failed \(failure\)/);
  const rerun = merge(
    github({ checks: [{ ...RED, id: 1 }, { ...GREEN, id: 2 }, SCOPE] }),
  );
  assert.equal(rerun.code, 0, rerun.stderr);
});

test("keeps the whole run inside its budget, counted from the start", () => {
  const started = Date.now();
  const { code, stdout } = merge(github({ checks: [RUNNING, SCOPE] }), {
    env: { THESEUS_MERGE_POLL_MS: "5000", THESEUS_MERGE_WAIT_MS: "2000" },
  });
  assert.equal(code, 1);
  // No poll may start that would end past the budget, so it never sleeps its 5 s.
  assert.ok(Date.now() - started < 4500, `${Date.now() - started} ms`);
  assert.doesNotMatch(stdout, /Waiting for CI/);
});

test("covers() compares from the top of the checkout, whatever the directory", () => {
  const sub = join(repo, ".studio/sprint/1");
  assert.equal(covers(reviewed, notesOnly, sub), true);
  assert.equal(covers(reviewed, codeChange, sub), false);
  assert.equal(covers(reviewed, codeChange, join(repo, "app")), false);
  assert.equal(covers("0".repeat(40), codeChange, repo), null);
});

test("refuses when the branch moves while CI runs", () => {
  const table = github();
  table[`${R}/commits/*/check-runs`] = {
    $seq: [{ check_runs: [RUNNING, SCOPE] }, { check_runs: [GREEN, SCOPE] }],
  };
  const pr = table[`${R}/pulls/12`];
  table[`${R}/pulls/12`] = { $seq: [pr, { ...pr, head: { sha: codeChange } }] };
  const { code, stderr, merged } = merge(table, {
    env: { THESEUS_MERGE_WAIT_MS: "30000" },
  });
  assert.equal(code, 1);
  assert.match(
    stderr,
    /The branch moved from [0-9a-f]{7} to [0-9a-f]{7} while CI ran/,
  );
  assert.deepEqual(merged, []);
});

test("refuses owner paths, scripts and weakened tests without waiting for CI", () => {
  const files = [
    changed("app/page.tsx"),
    changed("content/profile.ts"),
    changed(".studio/gate.mjs"),
    changed("e2e/smoke.spec.ts", { status: "removed", deletions: 30 }),
  ];
  const { code, stderr, calls } = merge(
    github({ files, checks: [RUNNING, SCOPE] }),
  );
  assert.equal(code, 1);
  assert.match(stderr, /content\/profile\.ts is the owner's/);
  assert.match(stderr, /\.studio\/gate\.mjs is the owner's/);
  assert.match(stderr, /e2e\/smoke\.spec\.ts is a test, and the PR deletes it/);
  assert.equal(
    calls.filter((call) => call[2]?.includes("check-runs")).length,
    1,
  );
});

test("refuses a PR that changes package.json's scripts, read through the contents API", () => {
  const encode = (scripts) => ({
    content: Buffer.from(
      JSON.stringify({ scripts, dependencies: {} }),
    ).toString("base64"),
    encoding: "base64",
  });
  const table = github({ files: [changed("package.json")] });
  table[`${R}/compare/ba5e...${reviewed}`] = {
    merge_base_commit: { sha: "f0e1" },
  };
  table[`${R}/contents/package.json`] = {
    $seq: [
      encode({ verify: "pnpm lint", "test:e2e": "playwright test" }),
      encode({ verify: "true", "test:e2e": "playwright test" }),
    ],
  };
  const { code, stderr } = merge(table);
  assert.equal(code, 1);
  assert.match(stderr, /package\.json changes its scripts \(verify\)/);
});

test("the owner-approved label doesn't open the gate: the owner merges those PRs", () => {
  const files = [changed(".claude/settings.json")];
  assert.equal(merge(github({ files, labels: ["owner-approved"] })).code, 1);
});

test("refuses a PR that carries or once carried needs-owner", () => {
  assert.match(
    merge(github({ labels: ["needs-owner"] })).stderr,
    /carried needs-owner/,
  );
  const events = [
    { event: "labeled", label: { name: "needs-owner" } },
    { event: "unlabeled", label: { name: "needs-owner" } },
  ];
  assert.match(merge(github({ events })).stderr, /carried needs-owner/);
});

test("says why GitHub can't merge it: a draft, a conflict, or GitHub's own refusal", () => {
  assert.match(
    merge(github({ pr: { draft: true } })).stderr,
    /is a draft, and REST can't mark it ready/,
  );
  assert.match(
    merge(github({ pr: { mergeable: false, mergeable_state: "dirty" } }))
      .stderr,
    /conflicts with main/,
  );
  const refused = merge(
    github({
      merge: {
        $error: 405,
        message: 'Required status check "scope" is expected.',
      },
    }),
  );
  assert.equal(refused.code, 1);
  assert.match(
    refused.stderr,
    /GitHub refused the merge: Required status check "scope" is expected\. \(HTTP 405\)/,
  );
});

test("takes a bare PR number only: no URL, no other repository, no options", () => {
  for (const args of [
    ["https://github.com/nycruslan/theseus-studio/pull/5"],
    ["nycruslan/theseus-studio#5"],
    ["12", "--admin"],
    ["#12"],
    [],
  ]) {
    const { code, stderr, calls } = merge(github(), { args });
    assert.equal(code, 2, args.join(" "));
    assert.match(stderr, /Usage: node \.studio\/merge\.mjs <number>/);
    assert.deepEqual(calls, []);
  }
});

test("fails closed when it can't read the PR", () => {
  const { code, stderr } = merge(github(), { env: { GH_FAIL: "HTTP 502" } });
  assert.equal(code, 1);
  assert.match(stderr, /The gate couldn't check PR #12/);
});

test("reads the repository from a proxy remote, as in cloud sessions", () => {
  const { dir } = gitRepo({ "app/page.tsx": "page" });
  execFileSync(
    "git",
    [
      "remote",
      "set-url",
      "origin",
      "http://local_proxy@127.0.0.1:40123/git/nycruslan/theseus-portfolio",
    ],
    { cwd: dir },
  );
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: dir,
    encoding: "utf8",
  }).trim();
  const { code, calls } = merge(github({ head }), { cwd: dir });
  assert.equal(code, 0);
  assert.ok(calls.every((call) => !call.join(" ").includes("{owner}")));
  assert.ok(calls.some((call) => call.includes(`${R}/pulls/12`)));
});

test("knows owner/repo from every kind of remote", () => {
  for (const url of [
    "https://github.com/nycruslan/theseus-portfolio.git",
    "https://github.com/nycruslan/theseus-portfolio",
    "git@github.com:nycruslan/theseus-portfolio.git",
    "ssh://git@github.com/nycruslan/theseus-portfolio.git",
    "http://local_proxy@127.0.0.1:40123/git/nycruslan/theseus-portfolio",
    "http://local_proxy@127.0.0.1:40123/git/nycruslan/theseus-portfolio/",
  ]) {
    assert.equal(repoFromRemote(url), REPO, url);
  }
});

test("puts the roll call on air, merged or not", async () => {
  const studio = await ingest();
  try {
    merge(github(), {
      env: { STUDIO_INGEST_URL: studio.url, CLAUDE_CODE_SESSION_ID: "abc123" },
    });
    merge(
      github({
        head: codeChange,
        commits: [reviewed, codeChange],
        statuses: { [reviewed]: [LENS] },
        files: [changed("lib/data.ts"), changed("content/profile.ts")],
      }),
      {
        env: {
          STUDIO_INGEST_URL: studio.url,
          CLAUDE_CODE_SESSION_ID: "abc123",
        },
      },
    );
    const posts = await studio.until(2);
    const [merged, refused] = posts
      .map(({ body }) => body)
      .sort((a, b) => Number(b.gate.pass) - Number(a.gate.pass));
    assert.equal(merged.hook_event_name, "StudioGateChecked");
    assert.equal(merged.session_id, "abc123");
    assert.equal(merged.gate.target, "merge");
    assert.equal(merged.gate.pr, 12);
    assert.equal(merged.gate.head, reviewed);
    assert.equal(merged.gate.pass, true);
    assert.deepEqual(
      merged.gate.items.map(({ who, kind, state }) => [who, kind, state]),
      [
        ["check", "check", "go"],
        ["scope", "check", "go"],
        ["Lens", "verdict", "go"],
      ],
    );
    assert.equal(refused.gate.pass, false);
    assert.deepEqual(
      refused.gate.items.map(({ who, kind, state }) => [who, kind, state]),
      [
        ["owner", "decision", "nogo"],
        ["Lens", "verdict", "nogo"],
        ["check", "check", "go"],
        ["scope", "check", "go"],
      ],
    );
  } finally {
    studio.close();
  }
});

test("works from a subdirectory of the checkout", () => {
  const sub = join(repo, "app", "nested");
  mkdirSync(sub, { recursive: true });
  assert.equal(merge(github(), { cwd: sub }).code, 0);
});

test("reads the verdicts from the PR's comments, as cloud sessions post them", () => {
  const files = [changed("app/page.tsx"), changed("e2e/nav.spec.ts")];
  const comments = [
    said("code-reviewer", "ship", reviewed),
    said("qa-engineer", "ship", reviewed),
  ];
  const { code, stderr, merged } = merge(
    github({ files, statuses: {}, comments }),
  );
  assert.equal(code, 0, stderr);
  assert.deepEqual(merged, [{ merge_method: "squash", sha: reviewed }]);
});

test("the latest comment per role and commit stands, quoted when it says no", () => {
  const comments = [
    said("code-reviewer", "ship", reviewed),
    said("code-reviewer", "changes", reviewed, {
      line: "Verdict: changes - an N+1 fetch",
    }),
  ];
  const { code, stderr, merged } = merge(github({ statuses: {}, comments }));
  assert.equal(code, 1);
  assert.match(
    stderr,
    /Lens said "Verdict: changes - an N\+1 fetch" on this commit/,
  );
  assert.deepEqual(merged, []);
  const cleared = merge(
    github({
      statuses: {},
      comments: [...comments, said("code-reviewer", "ship", reviewed)],
    }),
  );
  assert.equal(cleared.code, 0, cleared.stderr);
});

test("a role's comment outranks its status; a role without one falls back to its status", () => {
  const files = [changed("app/page.tsx"), changed("e2e/nav.spec.ts")];
  // Lens's status says ship, her comment says changes: the comment decides.
  const held = merge(
    github({
      statuses: { [reviewed]: [LENS] },
      comments: [said("code-reviewer", "changes", reviewed)],
    }),
  );
  assert.equal(held.code, 1);
  assert.match(held.stderr, /Lens said "Verdict: changes"/);
  // Lens commented; Probe only has a status, posted from a laptop.
  const mixed = merge(
    github({
      files,
      statuses: { [reviewed]: [verdict("probe")] },
      comments: [said("code-reviewer", "ship", reviewed)],
    }),
  );
  assert.equal(mixed.code, 0, mixed.stderr);
});

test("Iris's comment brings her in, score and all, and her changes holds the merge", () => {
  const files = [changed("app/globals.css")];
  const comments = [
    said("code-reviewer", "ship", reviewed),
    said("design-director", "changes", reviewed, {
      line: "Verdict: changes · 6.8/10",
      score: 6.8,
    }),
  ];
  const { code, stderr } = merge(github({ files, statuses: {}, comments }));
  assert.equal(code, 1);
  assert.match(
    stderr,
    /Iris said "Verdict: changes · 6\.8\/10" on this commit/,
  );
});

test("counts only the repository's own people: anyone can comment on a public PR", () => {
  for (const association of ["NONE", "CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR"]) {
    const comments = [said("code-reviewer", "ship", reviewed, { association })];
    const { code, stderr, merged } = merge(github({ statuses: {}, comments }));
    assert.equal(code, 1, association);
    assert.match(stderr, /Lens: no verdict on GitHub for this PR/, association);
    assert.deepEqual(merged, [], association);
  }
});

test("ignores a comment without a well-formed marker, or about a commit not in the PR", () => {
  const comments = [
    {
      id: 1,
      author_association: "OWNER",
      body: "Lens: ship on abc1234 — Verdict: ship\n\n<!-- theseus-verdict v1 role=code-reviewer verdict=ship head=abc1234 -->",
    },
    {
      id: 2,
      author_association: "OWNER",
      body:
        "<!-- theseus-verdict v1 role=lead verdict=ship head=" +
        reviewed +
        " -->",
    },
    {
      id: 3,
      author_association: "OWNER",
      body:
        "<!-- theseus-verdict v2 role=code-reviewer verdict=ship head=" +
        reviewed +
        " -->",
    },
    said("code-reviewer", "ship", "f".repeat(40)),
  ];
  const { code, stderr } = merge(github({ statuses: {}, comments }));
  assert.equal(code, 1);
  assert.match(stderr, /Lens: no verdict on GitHub for this PR/);
});

test("carries a comment's ship over notes-only commits, and merges even when the status can't be posted", () => {
  const commits = [reviewed, notesOnly];
  const table = github({
    head: notesOnly,
    commits,
    statuses: {},
    comments: [said("code-reviewer", "ship", reviewed)],
  });
  // The cloud's proxy refuses commit statuses.
  table[`POST ${R}/statuses/*`] = {
    $error: 403,
    message:
      "Write access to this GitHub API path is not permitted through this proxy",
  };
  const { code, stderr, posted, merged } = merge(table);
  assert.equal(code, 0, stderr);
  assert.deepEqual(
    posted.map(({ path, context }) => [path, context]),
    [[`${R}/statuses/${notesOnly}`, "theseus/lens"]],
  );
  assert.deepEqual(merged, [{ merge_method: "squash", sha: notesOnly }]);
  const changedSince = merge(
    github({
      head: codeChange,
      commits: [reviewed, notesOnly, codeChange],
      statuses: {},
      comments: [said("code-reviewer", "ship", reviewed)],
    }),
  );
  assert.equal(changedSince.code, 1);
  assert.match(changedSince.stderr, /and the product changed since/);
});

test("fails closed when it can't read the PR's comments", () => {
  const table = github();
  table[`${R}/issues/12/comments`] = { $error: 502, message: "Bad Gateway" };
  const { code, stderr, merged } = merge(table);
  assert.equal(code, 1);
  assert.match(stderr, /couldn't check PR #12 \(Bad Gateway/);
  assert.deepEqual(merged, []);
});
