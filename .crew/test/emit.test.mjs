import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { connect } from "node:net";
import { join } from "node:path";
import { after, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { CREW, gitRepo, ingest, runHook, tempDir } from "./kit.mjs";

const studio = await ingest();
after(() => studio.close());

// Its origin is https://github.com/nycruslan/theseus-portfolio.git.
const { dir: repo } = gitRepo({ "README.md": "hi", ".gitignore": ".env*\n" });

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
    {
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "pnpm lint" },
      tool_response: {
        stdout: "Checked 22 files",
        stderr: "",
        interrupted: false,
      },
      tool_use_id: "toolu_04",
    },
  ]);
  const byId = Object.fromEntries(
    posts.map((post) => [post.tool_use_id, post]),
  );
  assert.deepEqual(byId.toolu_01.tool_response, {
    agentId: "a4d2c8f1e0b3a297",
    status: "completed",
    resolvedModel: "claude-opus-5-5",
    totalDurationMs: 48211,
    totalToolUseCount: 7,
  });
  assert.deepEqual(Object.keys(byId.toolu_02.tool_response), ["gitOperation"]);
  assert.equal(byId.toolu_03.tool_response, undefined);
  assert.equal(byId.toolu_04.tool_response, undefined);
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

test("shows a file git won't publish by its path alone", async () => {
  const outside = join(tempDir(), "notes.md");
  writeFileSync(outside, "x");
  const { posts } = await emit([
    {
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: `${repo}/.env.local`, content: "A=1" },
      tool_use_id: "toolu_ignored",
    },
    {
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: { file_path: outside, old_string: "x", new_string: "y" },
      tool_use_id: "toolu_outside",
    },
    {
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: `${repo}/README.md`, content: "hello" },
      tool_use_id: "toolu_tracked",
    },
  ]);
  const byId = Object.fromEntries(
    posts.map((post) => [post.tool_use_id, post.tool_input]),
  );
  assert.deepEqual(byId.toolu_ignored, { file_path: `${repo}/.env.local` });
  assert.deepEqual(byId.toolu_outside, { file_path: outside });
  assert.equal(byId.toolu_tracked.content, "hello");
});

test("masks secrets, stamps time and repository, and leaves no temp files", async () => {
  const before = Date.now();
  // Built here so the file itself holds nothing a secret scanner flags.
  const fake = (prefix) => `${prefix}${"0123456789abcdefghij".repeat(2)}`;
  const tokens = [
    fake("ghp_"),
    fake("github_pat_"),
    fake("glpat-"),
    fake("xoxb-"),
    fake("AIza"),
    fake("sk_live_"),
  ];
  const { tmp } = await emit(
    [
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: {
          command: [
            "curl -H 'x: supersecretvalue123' https://x.dev",
            ...tokens,
            `git push https://${fake("github_pat_")}@github.com/o/r.git`,
            "VERCEL_TOKEN=plain-value-1 vercel",
          ].join(" "),
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
  assert.doesNotMatch(
    raw,
    /supersecretvalue123|ingest-token|0123456789abcdefghij|plain-value/,
  );
  assert.equal(
    body.tool_input.command,
    [
      "curl -H 'x: [redacted]' https://x.dev",
      ...tokens.map(() => "[redacted]"),
      "git push [redacted]github.com/o/r.git",
      "VERCEL_TOKEN=[redacted] vercel",
    ].join(" "),
  );
  assert.ok(body.at >= before && body.at <= Date.now());
  assert.equal(body.repo, "theseus-portfolio");
  assert.deepEqual(readdirSync(tmp), []);
});

test("masks OAuth and authorization values, but not an author's name", async () => {
  await emit(
    [
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: {
          command:
            "echo oauth-value-0123 header-value-4567 by Theseus Team; HTTP_AUTHORIZATION=inline-value-89 x",
        },
        tool_use_id: "toolu_06",
      },
    ],
    {
      env: {
        CLAUDE_CODE_OAUTH_TOKEN: "oauth-value-0123",
        HTTP_AUTHORIZATION: "header-value-4567",
        GIT_AUTHOR_NAME: "Theseus Team",
      },
    },
  );
  const [{ body }] = studio.received;
  assert.equal(
    body.tool_input.command,
    "echo [redacted] [redacted] by Theseus Team; HTTP_AUTHORIZATION=[redacted] x",
  );
});

test("masks secret-named values in any case, in flags and in JSON, but not an author", async () => {
  await emit([
    {
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: {
        command: [
          "psql password=hunter22 db_password=hunter33",
          `export PASSWORD="two words" SECRET='three more words'`,
          "curl --token=abc12345 --api-key def67890 -H 'Authorization: token jkl13579'",
          `echo '{"client_secret": "ghi24680", "author": "Theseus"}'`,
          'git commit --author="Theseus Team" -m x',
          "<li key={item.id}> API_KEY={abc123} --token {def456}",
          'echo TOKEN="unterminated value',
        ].join("; "),
        api_key: "plain-key-value",
      },
      tool_use_id: "toolu_07",
    },
  ]);
  const [{ raw, body }] = studio.received;
  assert.doesNotMatch(
    raw,
    /hunter22|hunter33|words|abc12345|abc123}|def456|def67890|ghi24680|jkl13579|unterminated|plain-key/,
  );
  assert.equal(
    body.tool_input.command,
    [
      "psql password=[redacted] db_password=[redacted]",
      `export PASSWORD="[redacted]" SECRET='[redacted]'`,
      "curl --token=[redacted] --api-key [redacted] -H 'Authorization: [redacted]'",
      `echo '{"client_secret": "[redacted]", "author": "Theseus"}'`,
      'git commit --author="Theseus Team" -m x',
      "<li key={item.id}> API_KEY=[redacted] --token [redacted]",
      'echo TOKEN="[redacted]',
    ].join("; "),
  );
  assert.equal(body.tool_input.api_key, "[redacted]");
});

// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set, and cloud sessions reach the
// internet only through their proxy, so settings.json sets it for every hook. Older Node versions
// don't know it, and the test is skipped there.
test("reaches the Studio through the environment's proxy with settings.json's NODE_USE_ENV_PROXY", {
  skip:
    !process.allowedNodeEnvironmentFlags.has("--use-env-proxy") &&
    "this Node has no environment proxy support",
}, async () => {
  const settings = JSON.parse(
    readFileSync(join(CREW, "..", ".claude", "settings.json"), "utf8"),
  );
  // A stand-in proxy that tunnels every CONNECT, as Node's proxy client sends even for http, to
  // the stand-in Studio, and notes where each was headed.
  const tunnelled = [];
  const proxy = createServer();
  proxy.on("connect", (request, client, head) => {
    tunnelled.push(request.url);
    const { port } = new URL(studio.url);
    const upstream = connect(Number(port), "127.0.0.1", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on("error", () => client.destroy());
  });
  await new Promise((done) => proxy.listen(0, "127.0.0.1", done));
  let posts;
  try {
    ({ posts } = await emit([{ hook_event_name: "Stop" }], {
      env: {
        STUDIO_INGEST_URL: "http://studio.invalid/api/ingest",
        HTTP_PROXY: `http://127.0.0.1:${proxy.address().port}`,
        NODE_USE_ENV_PROXY: settings.env.NODE_USE_ENV_PROXY,
      },
    }));
  } finally {
    proxy.close();
  }
  assert.deepEqual(tunnelled, ["studio.invalid:80"]);
  assert.equal(posts[0].hook_event_name, "Stop");
});
