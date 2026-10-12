import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { gitRepo, ingest, runHook, tempDir } from "./kit.mjs";

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

// A stand-in for gh that records its arguments and prints the PR it was given.
const bin = tempDir();
writeFileSync(
  join(bin, "gh"),
  `#!/usr/bin/env node
require("node:fs").writeFileSync(process.env.GH_ARGS, JSON.stringify(process.argv.slice(2)));
process.stdout.write(process.env.GH_PR);
`,
);
chmodSync(join(bin, "gh"), 0o755);

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

function gate({
  ledger = [],
  head = reviewed,
  files = ["lib/data.ts"],
  checks = [GREEN, VERCEL],
  labels = [],
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
    files: files.map((path) => ({ path, additions: 1, deletions: 0 })),
    labels: labels.map((name) => ({ name })),
    statusCheckRollup: checks,
  };
  const ghArgs = join(tmp, "gh-args.json");
  const result = runHook("gate.mjs", payload, {
    args: target ? [target] : [],
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      TMPDIR: tmp,
      GH_PR: JSON.stringify(pr),
      GH_ARGS: ghArgs,
      ...env,
    },
  });
  const gh = existsSync(ghArgs) && JSON.parse(readFileSync(ghArgs, "utf8"));
  return { ...result, gh };
}

const ship = (role, extra = {}) => ({
  role,
  agentId: `${role}-1`,
  verdict: "ship",
  head: reviewed,
  ...extra,
});
// verdict.mjs also notes when each reviewer started; the gate reads only the verdicts.
const started = { role: "code-reviewer", agentId: "lens-2", started: reviewed };
const BOTH = [started, ship("code-reviewer"), ship("qa-engineer")];

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
    /Lens: no ship on the current code; send the change back to Lens/,
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

test("Iris must ship when a visual file changed", () => {
  const visual = ["lib/data.ts", "app/globals.css"];
  const { code, stderr } = gate({ ledger: BOTH, files: visual });
  assert.equal(code, 2);
  assert.match(stderr, /Iris: no verdict on record/);
  const withIris = [...BOTH, ship("design-director", { score: 7.4 })];
  assert.equal(gate({ ledger: withIris, files: visual }).code, 0);
});

test("NO-GO without a ledger: the PR waits for the owner", () => {
  const { code, stderr } = gate({ ledger: null });
  assert.equal(code, 2);
  assert.match(stderr, /leave the PR for the owner/);
});

test("NO-GO while the PR waits for the owner's decision", () => {
  const { code, stderr } = gate({ ledger: BOTH, labels: ["needs-owner"] });
  assert.equal(code, 2);
  assert.match(stderr, /labelled needs-owner/);
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
        ["Lens", "verdict", "nogo"],
        ["Probe", "verdict", "nogo"],
      ],
    );
  } finally {
    studio.close();
  }
});
