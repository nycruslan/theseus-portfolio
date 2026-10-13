import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { ghLog, gitRepo, runHook, STUDIO, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const git = (...args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();

// A SubagentStart payload, shaped like https://code.claude.com/docs/en/hooks#subagentstart-input.
function start(agent) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: repo,
    hook_event_name: "SubagentStart",
    agent_id: "def456",
    agent_type: agent,
  };
}

// A SubagentStop payload, shaped like https://code.claude.com/docs/en/hooks#subagentstop-input.
function stop(agent, message, extra = {}) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd: repo,
    permission_mode: "default",
    hook_event_name: "SubagentStop",
    stop_hook_active: false,
    agent_id: "def456",
    agent_type: agent,
    agent_transcript_path: "/missing/agent-def456.jsonl",
    last_assistant_message: message,
    background_tasks: [],
    session_crons: [],
    ...extra,
  };
}

/** One session: run the hook on payloads in turn, then read its ledger and what it posted. */
function session(env = {}) {
  const tmp = tempDir();
  const gh = ghLog();
  return {
    run: (payload, script = "verdict.mjs") =>
      runHook(script, payload, {
        env: { TMPDIR: tmp, GH_LOG: gh.file, ...env },
      }),
    /** The commit statuses posted, as { sha, state, context, description }. */
    statuses: () =>
      gh.calls().map((args) => ({
        sha: args
          .find((arg) => arg.startsWith("repos/"))
          .split("/")
          .at(-1),
        ...Object.fromEntries(
          args
            .filter((_, i) => args[i - 1] === "-f")
            .map((field) => field.split(/=(.*)/s).slice(0, 2)),
        ),
      })),
    entries() {
      const ledger = join(tmp, "theseus-verdicts-abc123.jsonl");
      return existsSync(ledger)
        ? readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse)
        : [];
    },
  };
}

function verdict(payload, script) {
  const one = session();
  return { ...one.run(payload, script), entries: one.entries() };
}

const commit = (message) =>
  git("commit", "--allow-empty", "--quiet", "--message", message);

test("records a verdict against the commit the review started on", () => {
  const reviewed = git("rev-parse", "HEAD");
  const review = session();
  assert.equal(review.run(start("code-reviewer")).stderr, "");
  commit("a fix lands while the review runs");
  const { code } = review.run(
    stop("code-reviewer", "Verdict: ship\n\nNo findings."),
  );
  assert.equal(code, 0);
  const [started, given] = review.entries();
  assert.equal(started.started, reviewed);
  assert.equal(given.role, "code-reviewer");
  assert.equal(given.agentId, "def456");
  assert.equal(given.verdict, "ship");
  assert.equal(given.head, reviewed);
});

test("a resumed review covers the commit it resumed on", () => {
  const review = session();
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", "Verdict: changes"));
  commit("the fix");
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", "Verdict: ship"));
  assert.equal(review.entries().at(-1).head, git("rev-parse", "HEAD"));
});

test("records no head when the review's start wasn't recorded", () => {
  const { entries } = verdict(stop("code-reviewer", "Verdict: ship"));
  assert.equal(entries[0].head, null);
});

test("reads markdown around the verdict and Iris's score", () => {
  const { entries } = verdict(
    stop("design-director", "## Critique\n**Verdict: Changes** · 6.8/10\n…"),
  );
  assert.equal(entries[0].verdict, "changes");
  assert.equal(entries[0].score, 6.8);
});

test("sends a report without a verdict back", () => {
  const { code, stderr, entries } = verdict(
    stop(
      "qa-engineer",
      "All checks pass.\n\n1. pass\n2. pass\n\nVerdict: ship",
    ),
  );
  assert.equal(code, 2);
  assert.match(stderr, /Start your report with `Verdict: ship`/);
  assert.equal(entries.length, 0);
});

test("reads the report a background reviewer handed back", () => {
  const transcript = join(tempDir(), "agent-def456.jsonl");
  // A transcript line as Claude Code writes it, with the report in SubagentHandback's input.
  const handback = {
    isSidechain: true,
    agentId: "def456",
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "toolu_01",
          name: "SubagentHandback",
          input: { message: "Verdict: blocked\n\nContract check 2 fails." },
        },
      ],
    },
  };
  writeFileSync(transcript, `${JSON.stringify(handback)}\n{"partial`);
  for (const closing of ["Handed back.", null]) {
    const { code, entries } = verdict(
      stop("qa-engineer", closing, { agent_transcript_path: transcript }),
    );
    assert.equal(code, 0);
    assert.equal(entries[0].verdict, "blocked");
  }
});

test("records a still-missing verdict as none instead of looping", () => {
  const { code, entries } = verdict(
    stop("code-reviewer", "Looks fine.", { stop_hook_active: true }),
  );
  assert.equal(code, 0);
  assert.equal(entries[0].verdict, "none");
});

test("runs when the project path goes through a symlink", () => {
  const link = join(tempDir(), "project");
  symlinkSync(STUDIO, link);
  const { entries } = verdict(
    stop("code-reviewer", "Verdict: ship"),
    join(link, "verdict.mjs"),
  );
  assert.equal(entries[0]?.verdict, "ship");
});

test("posts the verdict as a commit status on the commit the review started on", () => {
  const reviewed = git("rev-parse", "HEAD");
  const review = session();
  review.run(start("code-reviewer"));
  commit("a fix lands while the review runs");
  review.run(
    stop("code-reviewer", "**Verdict: ship** - no Important findings"),
  );
  assert.deepEqual(review.statuses(), [
    {
      sha: reviewed,
      state: "success",
      context: "theseus/lens",
      description: "Verdict: ship - no Important findings",
    },
  ]);
  assert.equal(review.entries().at(-1).status, "posted");
});

test("posts changes and blocked as failures, under each reviewer's context", () => {
  const review = session();
  review.run(start("design-director"));
  review.run(stop("design-director", "Verdict: changes · 6.8/10"));
  review.run(start("qa-engineer"));
  review.run(stop("qa-engineer", "Verdict: blocked: the build fails"));
  assert.deepEqual(
    review
      .statuses()
      .map(({ state, context, description }) => [state, context, description]),
    [
      ["failure", "theseus/iris", "Verdict: changes · 6.8/10"],
      ["failure", "theseus/probe", "Verdict: blocked: the build fails"],
    ],
  );
});

test("a second reviewer's ship on the same commit doesn't hide the first one's changes", () => {
  const review = session();
  const lens = (id) => ({ agent_id: id });
  review.run({ ...start("code-reviewer"), ...lens("lens-perf") });
  review.run({
    ...stop("code-reviewer", "Verdict: changes - an N+1 fetch"),
    ...lens("lens-perf"),
  });
  review.run({ ...start("code-reviewer"), ...lens("lens-security") });
  review.run({
    ...stop("code-reviewer", "Verdict: ship"),
    ...lens("lens-security"),
  });
  const [, second] = review.statuses();
  assert.equal(second.state, "failure");
  assert.equal(second.description, "Verdict: changes - an N+1 fetch");
  // The same reviewer clearing its own finding turns the status green.
  review.run({ ...start("code-reviewer"), ...lens("lens-perf") });
  review.run({
    ...stop("code-reviewer", "Verdict: ship"),
    ...lens("lens-perf"),
  });
  assert.equal(review.statuses().at(-1).state, "success");
});

test("posts a missing verdict as a failure", () => {
  const review = session();
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", "Looks fine.", { stop_hook_active: true }));
  const [status] = review.statuses();
  assert.equal(status.state, "failure");
  assert.match(status.description, /^Verdict: none/);
});

test("keeps the description to GitHub's 140 characters", () => {
  const review = session();
  review.run(start("code-reviewer"));
  review.run(stop("code-reviewer", `Verdict: ship ${"x".repeat(200)}`));
  const [status] = review.statuses();
  assert.equal(status.description.length, 140);
  assert.match(status.description, /…$/);
});

test("posts nothing when it doesn't know the reviewed commit", () => {
  const review = session();
  review.run(stop("code-reviewer", "Verdict: ship"));
  assert.deepEqual(review.statuses(), []);
  assert.match(review.entries()[0].status, /commit is unknown/);
});

test("fails open when GitHub can't take the status: the ledger still has it", () => {
  const review = session({ GH_FAIL: "HTTP 422: No commit found for SHA" });
  review.run(start("code-reviewer"));
  const { code } = review.run(stop("code-reviewer", "Verdict: ship"));
  assert.equal(code, 0);
  const given = review.entries().at(-1);
  assert.equal(given.verdict, "ship");
  assert.equal(given.status, "not posted: HTTP 422: No commit found for SHA");
});
