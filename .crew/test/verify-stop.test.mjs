import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { answer, ingest, runHook, tempDir } from "./kit.mjs";

// A stand-in for pnpm: `pnpm verify` logs where it ran, prints FAKE_OUTPUT and exits FAKE_EXIT.
// With FAKE_HANG it starts a child of its own, notes the child's PID, and never finishes.
const bin = tempDir();
writeFileSync(
  join(bin, "pnpm"),
  `#!/usr/bin/env node
const { appendFileSync, writeFileSync } = require("node:fs");
const { spawn } = require("node:child_process");
const env = process.env;
appendFileSync(env.FAKE_LOG, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }) + "\\n");
process.stdout.write(env.FAKE_OUTPUT ?? "");
if (env.FAKE_HANG) {
  const child = spawn("sleep", ["30"], { stdio: "ignore" });
  writeFileSync(env.FAKE_HANG, String(child.pid));
  setInterval(() => {}, 1000);
} else process.exit(Number(env.FAKE_EXIT ?? 0));
`,
);
chmodSync(join(bin, "pnpm"), 0o755);

// The project's own scripts, as in package.json.
const SCRIPTS = {
  verify: "pnpm lint && pnpm typecheck && pnpm knip && pnpm build",
  lint: "biome ci --error-on-warnings",
  typecheck: "next typegen && tsc --noEmit",
  knip: "knip",
  build: "next build",
};

function project(scripts = SCRIPTS) {
  const dir = tempDir();
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts }));
  return dir;
}

// A SubagentStop payload, shaped like https://code.claude.com/docs/en/hooks#subagentstop-input.
function stop(cwd, extra = {}) {
  return {
    session_id: "abc123",
    transcript_path: "/home/user/.claude/projects/repo/abc123.jsonl",
    cwd,
    permission_mode: "auto",
    hook_event_name: "SubagentStop",
    stop_hook_active: false,
    agent_id: "forge-1",
    agent_type: "engineer",
    agent_transcript_path: "/missing/agent-forge-1.jsonl",
    last_assistant_message: "Done: the hero section is in.",
    background_tasks: [],
    session_crons: [],
    ...extra,
  };
}

function verifyStop(payload, env = {}, limit = "30") {
  const log = join(tempDir(), "pnpm.jsonl");
  const result = runHook("verify-stop.mjs", payload, {
    args: [limit],
    env: { PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: log, ...env },
  });
  const runs = existsSync(log)
    ? readFileSync(log, "utf8").trim().split("\n").map(JSON.parse)
    : [];
  return { ...result, answer: answer(result), runs };
}

// pnpm 12 prints each script's command as `$ <command>` before running it (checked with pnpm
// 12.5.1, the version packageManager pins); verify runs its steps as scripts.
const FAILED_TYPECHECK = [
  "$ pnpm lint && pnpm typecheck && pnpm knip && pnpm build",
  "$ biome ci --error-on-warnings",
  "Checked 24 files in 40ms. No fixes applied.",
  "$ next typegen && tsc --noEmit",
  "app/page.tsx(12,7): error TS2322: Type 'string' is not assignable to type 'number'.",
  "Error: ENOENT: no such file or directory, open '.next/types/routes.d.ts'",
  "[ELIFECYCLE] Command failed with exit code 2.",
  "[ELIFECYCLE] Command failed with exit code 2.",
].join("\n");

test("lets a builder stop once pnpm verify passes in its directory", () => {
  const dir = project();
  const { code, answer, runs } = verifyStop(stop(dir));
  assert.equal(code, 0);
  assert.equal(answer, null);
  assert.deepEqual(
    runs.map(({ args }) => args),
    [["verify"]],
  );
  assert.equal(runs[0].cwd, realpathSync(dir));
});

test("runs nothing for any other role, whatever the hook's matcher catches", () => {
  for (const role of ["qa-engineer", "design-director", "code-reviewer"]) {
    const { code, answer, runs } = verifyStop(
      stop(project(), { agent_type: role }),
      { FAKE_EXIT: "1" },
    );
    assert.equal(code, 0, role);
    assert.equal(answer, null, role);
    assert.deepEqual(runs, [], role);
  }
});

test("blocks with the failing step and its last lines", () => {
  const { code, answer } = verifyStop(stop(project()), {
    FAKE_OUTPUT: FAILED_TYPECHECK,
    FAKE_EXIT: "1",
  });
  assert.equal(code, 0);
  assert.equal(answer.decision, "block");
  assert.match(
    answer.reason,
    /^`pnpm verify` failed at `typecheck` \(exit 1\)\./,
  );
  assert.match(answer.reason, /report exactly what still fails/);
  assert.match(answer.reason, /error TS2322/);
  // Said in JSON, a missing-file message still blocks.
  assert.match(answer.reason, /no such file or directory/);
});

test("keeps only the tail of a long failure", () => {
  const output = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n");
  const { answer } = verifyStop(stop(project()), {
    FAKE_OUTPUT: output,
    FAKE_EXIT: "1",
  });
  assert.match(answer.reason, /line 499$/);
  assert.doesNotMatch(answer.reason, /line 459\n/);
  assert.match(answer.reason, /line 460\n/);
});

test("lets the second stop through without running verify again", () => {
  const { code, answer, runs } = verifyStop(
    stop(project(), { stop_hook_active: true }),
    { FAKE_EXIT: "1" },
  );
  assert.equal(code, 0);
  assert.equal(answer, null);
  assert.deepEqual(runs, []);
});

// Which roles it runs for is settings.json's matcher (settings.test.mjs).
test("runs only where verify exists", () => {
  const none = verifyStop(stop(project({ build: "next build" })), {
    FAKE_EXIT: "1",
  });
  assert.equal(none.answer, null);
  assert.deepEqual(none.runs, []);
});

test("time-boxes verify and stops everything it started", async () => {
  const pidFile = join(tempDir(), "child.pid");
  const started = Date.now();
  const { answer } = verifyStop(
    stop(project()),
    { FAKE_HANG: pidFile, FAKE_OUTPUT: "$ next build\n" },
    "1",
  );
  assert.ok(Date.now() - started < 10_000);
  assert.equal(answer.decision, "block");
  assert.match(answer.reason, /didn't finish within 1 s, so it was stopped/);
  // The grandchild went down with the group: probing it with signal 0 finds nothing.
  const pid = Number(readFileSync(pidFile, "utf8"));
  let alive = true;
  for (let i = 0; i < 20 && alive; i++) {
    try {
      process.kill(pid, 0);
      await sleep(100);
    } catch {
      alive = false;
    }
  }
  assert.equal(alive, false);
});

test("puts a blocked stop on air", async () => {
  const studio = await ingest();
  try {
    verifyStop(stop(project()), {
      FAKE_OUTPUT: FAILED_TYPECHECK,
      FAKE_EXIT: "1",
      STUDIO_INGEST_URL: studio.url,
    });
    const [{ body }] = await studio.until(1);
    assert.equal(body.hook_event_name, "StudioVerifyBlocked");
    assert.equal(body.agent_type, "engineer");
    assert.equal(body.verify.step, "typecheck");
    assert.equal(body.verify.timedOut, false);
  } finally {
    studio.close();
  }
});
