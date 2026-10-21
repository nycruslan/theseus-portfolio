// Forwards Claude Code hook events to the Theseus Studio so visitors can watch the team work.
// It stays dumb on purpose: the Studio owns the mapping (lib/events.ts), so emit only trims each
// payload to what the Studio reads, with whitelisted tool results and digests instead of dumps,
// and hands it to post.mjs. Registered in .claude/settings.json; it never blocks or decides.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { broadcast } from "./post.mjs";

// The parts of a tool's result the Studio joins and captions events on; raw output stays local.
const RESULT_FIELDS = {
  Agent: [
    "agentId",
    "status",
    "agentType",
    "resolvedModel",
    "worktreeBranch",
    "totalDurationMs",
    "totalToolUseCount",
  ],
  Workflow: ["runId", "workflowName", "summary", "error"],
  TaskCreate: ["task"],
  // Claude Code's own reading of git and gh commands: commits, pushes, and the PR's number, URL
  // and action (created, ready, merged).
  Bash: ["gitOperation"],
};
// A PR opened through REST or open-pr.mjs, marked ready by ready-pr.mjs, or merged by merge.mjs:
// the Studio shows its number, which only the command's output has. Only the PR's URL leaves; the
// rest of stdout stays local. The scripts' URLs come only from the lines they print once it
// happened ("Opened PR #<n> …", "PR #<n> is ready for review: …", "Merged PR #<n> …"), since a
// command that runs one can succeed without any (`… || true`).
const OPENS_PR =
  /\bgh\s+api\b(?=[^;&|\n]*\brepos\/[\w.-]+\/[\w.-]+\/pulls(?![\w/]))(?=[^;&|\n]*\s(-f|-F|--field|--raw-field)\s)/;
const RUNS_OPEN_PR = /(^|[;&|\n]\s*)node\s+(\S*\/)?\.crew\/open-pr\.mjs\s/;
const RUNS_READY_PR =
  /(^|[;&|\n]\s*)node\s+(\S*\/)?\.crew\/ready-pr\.mjs\s+\d+/;
const RUNS_MERGE = /(^|[;&|\n]\s*)node\s+(\S*\/)?\.crew\/merge\.mjs\s+\d+/;
const PR_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;
const OPENED_URL =
  /^Opened PR #\d+ .*?(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)/m;
const READY_URL =
  /^PR #\d+ is ready for review: (https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)/m;
const MERGED_URL =
  /^Merged PR #\d+ .*?(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+)/m;
const NARRATION_LENGTH = 1200;
const PROMPT_LENGTH = 1000;
const ERROR_LINES = 3;

if (!process.env.STUDIO_INGEST_URL) process.exit(0);

try {
  const hook = JSON.parse(readFileSync(0, "utf8"));
  const payload = trim(hook);
  if (payload) broadcast(payload, transcriptToMeasure(hook));
} catch {
  // Ignored: the build matters more than the broadcast.
}

function trim({ tool_response: result, tool_calls: calls, ...hook }) {
  const kept = (RESULT_FIELDS[hook.tool_name] ?? []).filter(
    (key) => result?.[key] !== undefined,
  );
  const prUrl = pullRequestUrl(hook, result);
  if (kept.length || prUrl) {
    hook.tool_response = {
      ...Object.fromEntries(kept.map((key) => [key, result[key]])),
      ...(prUrl && { prUrl }),
    };
  }
  // Only text that goes public with the code anyway: a file git ignores (.env.local, build output)
  // or one outside the repository shows by its path alone.
  const file = hook.tool_input?.file_path;
  if (file && !published(file)) {
    const { content, old_string, new_string, ...input } = hook.tool_input;
    hook.tool_input = input;
  }

  switch (hook.hook_event_name) {
    case "PostToolBatch":
      return { ...hook, batch: digest(calls ?? [], hook.cwd) };
    case "PostToolUseFailure":
      // The first line is "Exit code N" for commands; the rest is raw output.
      return {
        ...hook,
        error: String(hook.error ?? "")
          .split("\n")
          .slice(0, ERROR_LINES)
          .join("\n"),
      };
    case "UserPromptSubmit":
      return hook.agent_id
        ? null
        : { ...hook, prompt: hook.prompt?.slice(0, PROMPT_LENGTH) };
    case "MessageDisplay":
      return narration(hook);
    default:
      return hook;
  }
}

function pullRequestUrl({ tool_name: tool, tool_input: input }, result) {
  if (tool !== "Bash") return undefined;
  const command = String(input?.command ?? "");
  const stdout = String(result?.stdout ?? "");
  if (OPENS_PR.test(command)) return stdout.match(PR_URL)?.[0];
  if (RUNS_OPEN_PR.test(command)) return stdout.match(OPENED_URL)?.[1];
  if (RUNS_READY_PR.test(command)) return stdout.match(READY_URL)?.[1];
  if (RUNS_MERGE.test(command)) return stdout.match(MERGED_URL)?.[1];
  return undefined;
}

// check-ignore exits 1 for a file git would track, 0 for an ignored one and 128 outside a repository.
function published(file) {
  const check = spawnSync("git", ["check-ignore", "--quiet", file], {
    cwd: dirname(file),
  });
  return check.status === 1;
}

// A batch can carry whole files. The Studio needs who was convened together and what was read.
function digest(calls, cwd = "") {
  const counts = {};
  const dirs = {};
  const agentCalls = [];
  for (const { tool_name: tool, tool_input: input = {} } of calls) {
    counts[tool] = (counts[tool] ?? 0) + 1;
    if (tool === "Agent") {
      const { name, subagent_type, description } = input;
      agentCalls.push({ name, subagent_type, description });
    }
    const target = input.file_path ? dirname(input.file_path) : input.path;
    if (typeof target === "string") {
      const dir = relative(cwd, target) || ".";
      dirs[dir] = (dirs[dir] ?? 0) + 1;
    }
  }
  const busiest = Object.entries(dirs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([dir]) => dir);
  return { agentCalls, counts, dirs: busiest };
}

// Atlas's own words between tool calls. Headless runs send each message whole; interactive ones
// stream it in batches, which are collected here until the final one (the hook runs in sync, so
// batches arrive in order).
function narration(hook) {
  if (hook.agent_id || process.env.STUDIO_NARRATION === "0") return null;
  const id = String(hook.message_id).replace(/\W/g, "");
  const file = join(tmpdir(), `theseus-message-${id}.txt`);
  if (!hook.final) {
    appendFileSync(file, hook.delta ?? "", { mode: 0o600 });
    return null;
  }
  const earlier = existsSync(file) ? readFileSync(file, "utf8") : "";
  rmSync(file, { force: true });
  const text = earlier + (hook.delta ?? "");
  return { ...hook, delta: text.slice(0, NARRATION_LENGTH) };
}

function transcriptToMeasure(hook) {
  if (hook.hook_event_name === "SubagentStop")
    return hook.agent_transcript_path;
  if (hook.hook_event_name === "SessionEnd") return hook.transcript_path;
}
