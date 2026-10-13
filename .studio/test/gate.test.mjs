import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ghLog, gitRepo, ingest, runHook, tempDir } from "./kit.mjs";

// Reviewed at `reviewed`; then one commit touching only the team's notes, then one changing code.
const { dir: repo, shas } = gitRepo(
  { "lib/data.ts": "v1", "app/page.tsx": "page" },
  { ".studio/STATE.md": "lesson", ".claude/agent-memory/forge/MEMORY.md": "x" },
  { "lib/data.ts": "v2" },
);
const [reviewed, notesOnly, codeChange] = shas;

const GREEN = {
  __typename: "CheckRun",
  name: "check",
  status: "COMPLETED",
  conclusion: "SUCCESS",
};
const VERCEL = {
  __typename: "StatusContext",
  context: "Vercel",
  state: "SUCCESS",
};
// A reviewer's verdict as verdict.mjs posts it, as gh pr view lists it.
const status = (context, state, description) => ({
  __typename: "StatusContext",
  context,
  state,
  description,
});

// A PreToolUse payload for Bash, shaped like https://code.claude.com/docs/en/hooks#pretooluse-input.
function bash(command) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: repo,
    permission_mode: "default",
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command, description: "Merge the sprint PR" },
    tool_use_id: "toolu_01ABC123",
  };
}

// A changed file as GitHub's REST API lists it.
const changed = (filename, extra = {}) => ({
  filename,
  status: "modified",
  deletions: 0,
  ...extra,
});

function gate({
  ledger = [],
  head = reviewed,
  files = [changed("lib/data.ts")],
  checks = [GREEN, VERCEL],
  mergeState = "CLEAN",
  labels = [],
  labeled = [],
  payload = bash("gh pr merge 12 --squash --delete-branch"),
  target = "merge",
  env = {},
}) {
  const tmp = tempDir();
  if (ledger) {
    const lines = ledger.map((entry) => `${JSON.stringify(entry)}\n`);
    writeFileSync(join(tmp, "theseus-verdicts-abc123.jsonl"), lines.join(""));
  }
  const pr = {
    number: 12,
    headRefOid: head,
    labels: labels.map((name) => ({ name })),
    statusCheckRollup: checks,
    mergeStateStatus: mergeState,
  };
  const log = ghLog();
  const result = runHook("gate.mjs", payload, {
    args: target ? [target] : [],
    env: {
      TMPDIR: tmp,
      GH_PR: JSON.stringify(pr),
      GH_FILES: files.map((file) => JSON.stringify(file)).join("\n"),
      GH_LABELED: labeled.join("\n"),
      GH_LOG: log.file,
      ...env,
    },
  });
  const calls = log.calls();
  return {
    ...result,
    gh: calls.find((args) => args[0] === "pr") ?? false,
    posted: calls.filter((args) => args.includes("POST")),
  };
}

const ship = (role, extra = {}) => ({
  role,
  agentId: `${role}-1`,
  verdict: "ship",
  line: "Verdict: ship",
  head: reviewed,
  ...extra,
});
// verdict.mjs also notes when each reviewer started; the gate reads only the verdicts.
const started = { role: "code-reviewer", agentId: "lens-2", started: reviewed };
const BOTH = [started, ship("code-reviewer"), ship("qa-engineer")];
const LENS = [ship("code-reviewer")];

test("GO on fresh ships and green CI", () => {
  const { code, gh } = gate({ ledger: BOTH });
  assert.equal(code, 0);
  assert.deepEqual(gh.slice(0, 3), ["pr", "view", "12"]);
});

test("a commit that only touches notes and memory keeps the reviews fresh", () => {
  assert.equal(gate({ ledger: BOTH, head: notesOnly }).code, 0);
});

test("NO-GO when the code changed after the review", () => {
  const { code, stderr } = gate({ ledger: BOTH, head: codeChange });
  assert.equal(code, 2);
  assert.match(
    stderr,
    /Lens: no ship on the current code; ask a fresh code-reviewer to review it/,
  );
  assert.match(stderr, /Probe: no ship on the current code/);
  const unknown = [ship("code-reviewer", { head: null }), ship("qa-engineer")];
  assert.match(
    gate({ ledger: unknown }).stderr,
    /Lens: no ship on the current code/,
  );
});

test("each reviewer's latest verdict counts", () => {
  const ledger = [...BOTH, ship("code-reviewer", { verdict: "changes" })];
  const { code, stderr } = gate({ ledger });
  assert.equal(code, 2);
  assert.match(stderr, /Lens \(agent code-reviewer-1\) said "changes"/);
  const resolved = [...ledger, ship("code-reviewer")];
  assert.equal(gate({ ledger: resolved }).code, 0);
});

test("one reviewer's ship doesn't hide another's open changes", () => {
  const ledger = [
    ship("qa-engineer"),
    ship("code-reviewer", { agentId: "lens-perf", verdict: "changes" }),
    ship("code-reviewer", { agentId: "lens-security" }),
  ];
  const { code, stderr } = gate({ ledger });
  assert.equal(code, 2);
  assert.match(stderr, /Lens \(agent lens-perf\) said "changes"/);
});

test("a fresh ship counts even when another reviewer's ship is stale", () => {
  const ledger = [
    ship("qa-engineer", { head: codeChange }),
    ship("code-reviewer", { agentId: "lens-perf" }),
    ship("code-reviewer", { agentId: "lens-security", head: codeChange }),
  ];
  assert.equal(gate({ ledger, head: codeChange }).code, 0);
});

test("after a fix, a fresh reviewer's ship replaces the changes asked of older code", () => {
  const ledger = [
    ship("code-reviewer", { agentId: "lens-1", verdict: "changes" }),
    ship("code-reviewer", { agentId: "lens-2", head: codeChange }),
  ];
  assert.equal(gate({ ledger, head: codeChange }).code, 0);
});

test("NO-GO while CI is red or still running", () => {
  const red = { ...GREEN, conclusion: "FAILURE" };
  const running = { ...GREEN, status: "IN_PROGRESS", conclusion: null };
  assert.match(
    gate({ ledger: BOTH, checks: [red] }).stderr,
    /check failed \(FAILURE\)/,
  );
  assert.match(
    gate({ ledger: BOTH, checks: [running] }).stderr,
    /check is still running/,
  );
  assert.match(gate({ ledger: BOTH, checks: [] }).stderr, /CI hasn't reported/);
});

test("--auto may leave CI running while GitHub holds the merge for its checks", () => {
  const running = { ...GREEN, status: "IN_PROGRESS", conclusion: null };
  const auto = bash("gh pr merge 12 --squash --auto");
  for (const mergeState of ["BLOCKED", "BEHIND"]) {
    const held = { ledger: BOTH, checks: [running], payload: auto, mergeState };
    assert.equal(gate(held).code, 0, mergeState);
    assert.equal(gate({ ...held, checks: [] }).code, 0, mergeState);
  }
});

test("--auto still waits for CI when nothing holds the merge, and never passes red CI", () => {
  const running = { ...GREEN, status: "IN_PROGRESS", conclusion: null };
  const auto = bash("gh pr merge 12 --squash --auto");
  for (const mergeState of ["CLEAN", "UNSTABLE", "HAS_HOOKS", "UNKNOWN"]) {
    const { code, stderr } = gate({
      ledger: BOTH,
      checks: [running],
      payload: auto,
      mergeState,
    });
    assert.equal(code, 2, mergeState);
    assert.match(stderr, /--auto would merge it now/);
  }
  const red = { ...GREEN, conclusion: "FAILURE" };
  const blocked = { ledger: BOTH, payload: auto, mergeState: "BLOCKED" };
  assert.match(gate({ ...blocked, checks: [red] }).stderr, /check failed/);
  // Without --auto, gh merges right away, so a held PR still waits for CI.
  assert.equal(
    gate({ ledger: BOTH, checks: [running], mergeState: "BLOCKED" }).code,
    2,
  );
});

test("cancelling auto-merge goes through without a check", () => {
  const cancel = bash("gh pr merge 12 --disable-auto");
  const { code, gh } = gate({ payload: cancel, ledger: null });
  assert.equal(code, 0);
  assert.equal(gh, false);
});

test("reads the verdicts posted on the head commit", () => {
  const checks = [
    GREEN,
    status("theseus/lens", "SUCCESS", "Verdict: ship"),
    status("theseus/iris", "SUCCESS", "Verdict: ship · 7.4/10"),
  ];
  const files = [changed("app/globals.css")];
  const { code } = gate({ ledger: null, checks, files });
  assert.equal(code, 0);
});

test("NO-GO on a failing verdict status, quoting its line", () => {
  const checks = [
    GREEN,
    status("theseus/lens", "FAILURE", "Verdict: changes - an N+1 fetch"),
  ];
  const { code, stderr } = gate({ ledger: LENS, checks });
  assert.equal(code, 2);
  assert.match(
    stderr,
    /Lens said "Verdict: changes - an N\+1 fetch" on this commit/,
  );
});

test("the ledger can still hold a merge that a status passed", () => {
  const checks = [GREEN, status("theseus/lens", "SUCCESS", "Verdict: ship")];
  const ledger = [ship("code-reviewer", { verdict: "changes" })];
  assert.equal(gate({ ledger, checks }).code, 2);
});

test("an S-sized change needs only Lens; e2e changes need Probe too", () => {
  assert.equal(gate({ ledger: LENS }).code, 0);
  const files = [changed("lib/data.ts"), changed("e2e/nav.spec.ts")];
  const { code, stderr } = gate({ ledger: LENS, files });
  assert.equal(code, 2);
  assert.match(stderr, /Probe: no verdict on record/);
  assert.equal(gate({ ledger: BOTH, files }).code, 0);
});

test("a reviewer who weighed in must ship, even when not otherwise needed", () => {
  const ledger = [...LENS, ship("design-director", { verdict: "changes" })];
  const { code, stderr } = gate({ ledger });
  assert.equal(code, 2);
  assert.match(stderr, /Iris \(agent design-director-1\) said "changes"/);
});

test("Iris must ship when a visual file changed", () => {
  const visual = [changed("lib/data.ts"), changed("app/globals.css")];
  const { code, stderr } = gate({ ledger: BOTH, files: visual });
  assert.equal(code, 2);
  assert.match(stderr, /Iris: no verdict on record/);
  const withIris = [...BOTH, ship("design-director", { score: 7.4 })];
  assert.equal(gate({ ledger: withIris, files: visual }).code, 0);
});

test("NO-GO on owner paths and weakened tests", () => {
  const files = [
    changed("app/page.tsx"),
    changed("content/profile.ts"),
    changed(".studio/gate.mjs"),
    changed("e2e/smoke.spec.ts", { status: "removed", deletions: 30 }),
  ];
  const { code, stderr } = gate({ ledger: BOTH, files });
  assert.equal(code, 2);
  assert.match(stderr, /content\/profile\.ts is the owner's/);
  assert.match(stderr, /\.studio\/gate\.mjs is the owner's/);
  assert.match(stderr, /e2e\/smoke\.spec\.ts is a test, and the PR deletes it/);
});

test("the owner-approved label doesn't open the gate: the owner merges those PRs", () => {
  const files = [changed(".claude/settings.json")];
  const labels = ["owner-approved"];
  assert.equal(gate({ ledger: BOTH, files, labels }).code, 2);
});

test("lets the team's own notes, memory and drafts through", () => {
  const files = [
    changed("lib/data.ts"),
    changed(".studio/STATE.md"),
    changed(".studio/sprint/3/retro.json", { status: "added" }),
    changed(".claude/agent-memory/engineer/MEMORY.md", { deletions: 2 }),
    changed("content/drafts/bio.md", { status: "added" }),
  ];
  assert.equal(gate({ ledger: BOTH, files }).code, 0);
});

test("carries a ledger ship onto a head that only added notes, so GitHub agrees", () => {
  const { code, posted } = gate({ ledger: BOTH, head: notesOnly });
  assert.equal(code, 0);
  assert.deepEqual(
    posted.map((args) => [args[3], args[7], args[9]]),
    [
      [
        `repos/{owner}/{repo}/statuses/${notesOnly}`,
        "context=theseus/lens",
        `description=Verdict: ship (from ${reviewed.slice(0, 7)}; only notes changed since)`,
      ],
      [
        `repos/{owner}/{repo}/statuses/${notesOnly}`,
        "context=theseus/probe",
        `description=Verdict: ship (from ${reviewed.slice(0, 7)}; only notes changed since)`,
      ],
    ],
  );
  // Nothing is posted when the head already carries the statuses, or when the gate says no.
  const checks = [GREEN, status("theseus/lens", "SUCCESS", "Verdict: ship")];
  assert.deepEqual(gate({ ledger: null, checks }).posted, []);
  assert.deepEqual(gate({ ledger: BOTH, head: codeChange }).posted, []);
});

test("NO-GO without a ledger or statuses: the PR waits for the owner", () => {
  const { code, stderr } = gate({ ledger: null });
  assert.equal(code, 2);
  assert.match(stderr, /leave the PR for the owner/);
});

test("NO-GO while the PR waits for the owner's decision", () => {
  const { code, stderr } = gate({ ledger: BOTH, labels: ["needs-owner"] });
  assert.equal(code, 2);
  assert.match(stderr, /carried needs-owner/);
});

test("NO-GO after the needs-owner label was removed: the owner merges", () => {
  const labeled = ["sprint", "needs-owner"];
  const { code, stderr } = gate({ ledger: BOTH, labeled });
  assert.equal(code, 2);
  assert.match(stderr, /carried needs-owner/);
  assert.equal(gate({ ledger: BOTH, labeled: ["sprint"] }).code, 0);
});

test("NO-GO, on air too, when it can't read the PR", async () => {
  const studio = await ingest();
  try {
    const { code, stderr } = gate({
      ledger: BOTH,
      env: { GH_PR: "gh: not found", STUDIO_INGEST_URL: studio.url },
    });
    assert.equal(code, 2);
    assert.match(stderr, /couldn't check this PR/);
    const [{ body }] = await studio.until(1);
    assert.equal(body.gate.pass, false);
    assert.equal(body.gate.items[0].who, "gate");
  } finally {
    studio.close();
  }
});

test("NO-GO when it can't list the PR's files", () => {
  const { code, stderr } = gate({
    ledger: BOTH,
    env: { GH_FILES: "not json" },
  });
  assert.equal(code, 2);
  assert.match(stderr, /couldn't check this PR/);
});

test("blocks every merge when settings.json doesn't name the target", () => {
  const { code, stderr } = gate({ ledger: BOTH, target: "" });
  assert.equal(code, 2);
  assert.match(stderr, /needs "merge" or "ready"/);
});

test("lets other commands through without asking GitHub", () => {
  const { code, gh } = gate({ payload: bash("echo $(date)"), ledger: null });
  assert.equal(code, 0);
  assert.equal(gh, false);
});

test("finds the PR among the options", () => {
  const { gh } = gate({
    ledger: BOTH,
    payload: bash('git push && gh pr merge --subject "Sprint 3" 14 --squash'),
  });
  assert.deepEqual(gh.slice(0, 3), ["pr", "view", "14"]);
  const current = gate({ ledger: BOTH, payload: bash("gh pr merge --squash") });
  assert.deepEqual(current.gh.slice(0, 3), ["pr", "view", "--json"]);
});

test("NO-GO, without asking GitHub, when gh could reach another PR than the one it checks", () => {
  for (const command of [
    "gh pr merge 12 --squash --repo nycruslan/theseus-studio",
    "gh pr merge 12 --squash -R nycruslan/theseus-studio",
    "GH_REPO=nycruslan/theseus-studio gh pr merge 12 --squash",
    "cd ../studio && gh pr merge 12 --squash",
    "gh pr merge 12 --squash && gh pr merge 13 --squash",
  ]) {
    const { code, stderr, gh } = gate({ ledger: BOTH, payload: bash(command) });
    assert.equal(code, 2, command);
    assert.match(
      stderr,
      /run one `gh pr merge` per command, from this checkout/,
    );
    assert.equal(gh, false, command);
  }
});

test("reads a PR given through bash -c", () => {
  const { gh } = gate({
    ledger: BOTH,
    payload: bash('bash -c "gh pr merge 5"'),
  });
  assert.deepEqual(gh.slice(0, 3), ["pr", "view", "5"]);
});

test("gates a merge through the GitHub connector", () => {
  const payload = {
    ...bash(""),
    tool_name: "mcp__github__merge_pull_request",
    tool_input: {
      owner: "nycruslan",
      repo: "theseus-portfolio",
      pullNumber: 12,
    },
  };
  const { code, gh } = gate({ ledger: BOTH, payload });
  assert.equal(code, 0);
  assert.deepEqual(gh.slice(0, 3), ["pr", "view", "12"]);
  assert.deepEqual(gh.slice(-2), ["--repo", "nycruslan/theseus-portfolio"]);
});

test("gates marking a Studio PR ready, but not moving it back to draft", () => {
  const ready = bash("gh pr ready 12");
  assert.equal(gate({ target: "ready", payload: ready, ledger: null }).code, 2);
  const undo = bash("gh pr ready 12 --undo");
  assert.equal(gate({ target: "ready", payload: undo, ledger: null }).code, 0);
});

test("broadcasts the roll call", async () => {
  const studio = await ingest();
  try {
    gate({
      ledger: BOTH,
      head: codeChange,
      files: [changed("lib/data.ts"), changed("content/profile.ts")],
      env: { STUDIO_INGEST_URL: studio.url },
    });
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioGateChecked");
    const { gate: rollCall } = body;
    assert.equal(rollCall.target, "merge");
    assert.equal(rollCall.pr, 12);
    assert.equal(rollCall.head, codeChange);
    assert.equal(rollCall.pass, false);
    assert.deepEqual(
      rollCall.items.map(({ who, kind, state }) => [who, kind, state]),
      [
        ["check", "check", "go"],
        ["Vercel", "check", "go"],
        ["owner", "decision", "nogo"],
        ["Lens", "verdict", "nogo"],
        ["Probe", "verdict", "nogo"],
      ],
    );
  } finally {
    studio.close();
  }
});
