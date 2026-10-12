import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { gitRepo, ingest, runHook, tempDir } from "./kit.mjs";

const studio = await ingest();
after(() => studio.close());

const { dir: repo } = gitRepo({ "README.md": "hi" });
execFileSync(
  "git",
  [
    "remote",
    "add",
    "origin",
    "https://github.com/nycruslan/theseus-portfolio.git",
  ],
  { cwd: repo },
);

// Payloads are shaped like the examples in https://code.claude.com/docs/en/hooks.
const common = {
  session_id: "abc123",
  transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
  cwd: repo,
  permission_mode: "default",
};

/** Runs emit on each payload in turn and returns what reached the Studio. */
async function emit(payloads, { env = {}, expect = payloads.length } = {}) {
  studio.received.length = 0;
  const tmp = tempDir();
  for (const payload of payloads) {
    runHook(
      "emit.mjs",
      { ...common, ...payload },
      {
        env: { STUDIO_INGEST_URL: studio.url, TMPDIR: tmp, ...env },
      },
    );
  }
  await studio.until(expect);
  // Give anything unexpected time to arrive too.
  await sleep(300);
  return { posts: studio.received.map(({ body }) => body), tmp };
}

test("ends the run first, then reports its usage, skipping a line still being written", async () => {
  const transcript = join(tempDir(), "abc123.jsonl");
  const message = (id, usage) =>
    JSON.stringify({
      type: "assistant",
      message: { id, model: "claude-opus-5-5", usage },
    });
  writeFileSync(
    transcript,
    [
      message("msg_1", {
        input_tokens: 10,
        cache_read_input_tokens: 100,
        output_tokens: 5,
      }),
      message("msg_1", {
        input_tokens: 10,
        cache_read_input_tokens: 100,
        output_tokens: 7,
      }),
      message("msg_2", {
        input_tokens: 3,
        cache_creation_input_tokens: 20,
        output_tokens: 2,
      }),
      '{"type":"assistant","message":{"id":"msg_3","usage":{"output_t',
    ].join("\n"),
  );
  const { posts } = await emit(
    [
      {
        hook_event_name: "SessionEnd",
        reason: "other",
        transcript_path: transcript,
      },
    ],
    { expect: 2 },
  );
  assert.equal(posts[0].hook_event_name, "SessionEnd");
  assert.equal(posts[0].reason, "other");
  assert.equal(posts[1].hook_event_name, "StudioUsage");
  assert.equal(posts[1].session_id, "abc123");
  assert.deepEqual(posts[1].usage, {
    outputTokens: 9,
    processedTokens: 142,
    model: "claude-opus-5-5",
  });
});

test("keeps only the whitelisted parts of a tool result", async () => {
  const { posts } = await emit([
    {
      hook_event_name: "PostToolUse",
      tool_name: "Agent",
      tool_input: {
        subagent_type: "code-reviewer",
        name: "lens",
        description: "Review",
        prompt: "…",
      },
      tool_response: {
        status: "completed",
        agentId: "a4d2c8f1e0b3a297",
        content: [{ type: "text", text: "Verdict: ship" }],
        resolvedModel: "claude-opus-5-5",
        totalTokens: 12450,
        totalDurationMs: 48211,
        totalToolUseCount: 7,
        usage: { input_tokens: 8320 },
      },
      tool_use_id: "toolu_01",
    },
    {
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "gh pr create --draft --fill" },
      tool_response: {
        stdout: "https://github.com/nycruslan/theseus-portfolio/pull/6",
        stderr: "",
        interrupted: false,
        gitOperation: {
          pr: {
            number: 6,
            url: "https://github.com/nycruslan/theseus-portfolio/pull/6",
            action: "created",
          },
        },
      },
      tool_use_id: "toolu_02",
    },
    {
      hook_event_name: "PostToolUse",
      tool_name: "Read",
      tool_input: { file_path: `${repo}/README.md` },
      tool_response: { file: { content: "hi" } },
      tool_use_id: "toolu_03",
    },
  ]);
  const byTool = Object.fromEntries(
    posts.map((post) => [post.tool_name, post]),
  );
  assert.deepEqual(byTool.Agent.tool_response, {
    agentId: "a4d2c8f1e0b3a297",
    status: "completed",
    resolvedModel: "claude-opus-5-5",
    totalDurationMs: 48211,
    totalToolUseCount: 7,
  });
  assert.deepEqual(Object.keys(byTool.Bash.tool_response), ["gitOperation"]);
  assert.equal(byTool.Read.tool_response, undefined);
});

test("digests a batch: who was convened and what was read", async () => {
  const { posts } = await emit([
    {
      hook_event_name: "PostToolBatch",
      tool_calls: [
        {
          tool_name: "Agent",
          tool_input: {
            name: "quill",
            subagent_type: "product-owner",
            description: "Position on scope",
            prompt: "…",
          },
          tool_use_id: "t1",
          tool_response: "Recommendation: …",
        },
        {
          tool_name: "Agent",
          tool_input: {
            name: "iris",
            subagent_type: "design-director",
            description: "Position on type",
            prompt: "…",
          },
          tool_use_id: "t2",
          tool_response: "Recommendation: …",
        },
        {
          tool_name: "Read",
          tool_input: { file_path: `${repo}/app/page.tsx` },
          tool_use_id: "t3",
          tool_response: "1\tsecret file text",
        },
        {
          tool_name: "Grep",
          tool_input: { pattern: "color", path: `${repo}/app` },
          tool_use_id: "t4",
          tool_response: "app/globals.css",
        },
      ],
    },
  ]);
  assert.equal(posts[0].tool_calls, undefined);
  assert.deepEqual(posts[0].batch, {
    agentCalls: [
      {
        name: "quill",
        subagent_type: "product-owner",
        description: "Position on scope",
      },
      {
        name: "iris",
        subagent_type: "design-director",
        description: "Position on type",
      },
    ],
    counts: { Agent: 2, Read: 1, Grep: 1 },
    dirs: ["app"],
  });
});

test("forwards Atlas's narration once per message, and nobody else's", async () => {
  const display = (extra) => ({
    hook_event_name: "MessageDisplay",
    turn_id: "0c9e6a2f",
    message_id: "5b2a9c8e-1f63-4d8a",
    ...extra,
  });
  const { posts } = await emit(
    [
      display({ index: 0, final: false, delta: "Here is the plan:\n" }),
      display({
        agent_id: "def456",
        index: 0,
        final: true,
        delta: "A subagent",
      }),
      display({ index: 1, final: true, delta: "Ship it." }),
    ],
    { expect: 1 },
  );
  assert.equal(posts.length, 1);
  assert.equal(posts[0].delta, "Here is the plan:\nShip it.");

  const off = await emit(
    [
      display({ index: 0, final: true, delta: "Off air" }),
      { hook_event_name: "Stop" },
    ],
    { env: { STUDIO_NARRATION: "0" }, expect: 1 },
  );
  assert.deepEqual(
    off.posts.map((post) => post.hook_event_name),
    ["Stop"],
  );
});

test("forwards the lead's prompt clipped, not a subagent's", async () => {
  const { posts } = await emit(
    [
      {
        hook_event_name: "UserPromptSubmit",
        prompt: `/sprint ${"x".repeat(2000)}`,
      },
      {
        hook_event_name: "UserPromptSubmit",
        agent_id: "def456",
        prompt: "inner",
      },
    ],
    { expect: 1 },
  );
  assert.equal(posts.length, 1);
  assert.equal(posts[0].prompt.length, 1000);
});

test("keeps the first lines of a failure", async () => {
  const { posts } = await emit([
    {
      hook_event_name: "PostToolUseFailure",
      tool_name: "Bash",
      tool_input: { command: "pnpm build" },
      tool_use_id: "toolu_04",
      error: "Exit code 1\nType error: x\n  at page.tsx:3\nmore\nlog",
      is_interrupt: false,
    },
  ]);
  assert.equal(posts[0].error, "Exit code 1\nType error: x\n  at page.tsx:3");
});

test("masks secrets, stamps time and repository, and leaves no temp files", async () => {
  const before = Date.now();
  const { tmp } = await emit(
    [
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: {
          command:
            "curl -H 'x: supersecretvalue123' https://x.dev ghp_abcdefghijklmnopqrstuvwxyz0123",
        },
        tool_use_id: "toolu_05",
      },
    ],
    {
      env: {
        STUDIO_INGEST_TOKEN: "ingest-token-0123456789",
        MY_API_KEY: "supersecretvalue123",
      },
    },
  );
  const [{ headers, raw, body }] = studio.received;
  assert.equal(headers.authorization, "Bearer ingest-token-0123456789");
  assert.doesNotMatch(raw, /supersecretvalue123|ghp_|ingest-token/);
  assert.equal(
    body.tool_input.command,
    "curl -H 'x: [redacted]' https://x.dev [redacted]",
  );
  assert.ok(body.at >= before && body.at <= Date.now());
  assert.equal(body.repo, "theseus-portfolio");
  assert.deepEqual(readdirSync(tmp), []);
});
