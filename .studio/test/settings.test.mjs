import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STUDIO } from "./kit.mjs";

// The harness only works as wired in .claude/settings.json, so the wiring is checked too.
const settings = JSON.parse(
  readFileSync(join(STUDIO, "..", ".claude", "settings.json"), "utf8"),
);

/** Every handler for an event, with its matcher, keyed by the script it runs. */
function handlers(event) {
  return (settings.hooks[event] ?? []).flatMap(({ matcher, hooks }) =>
    hooks.map((hook) => ({
      matcher,
      script: hook.args?.[0]?.replace(/^.*\/\.studio\//, ""),
      ...hook,
    })),
  );
}
const one = (event, script, matcher) => {
  const found = handlers(event).filter(
    (hook) => hook.script === script && (!matcher || hook.matcher === matcher),
  );
  assert.equal(found.length, 1, `${event} ${script} ${matcher ?? ""}`);
  return found[0];
};

test("every hook runs a script that exists", () => {
  for (const event of Object.keys(settings.hooks)) {
    for (const { script, command } of handlers(event)) {
      if (command !== "node") continue;
      assert.ok(existsSync(join(STUDIO, script)), `${event}: ${script}`);
    }
  }
});

test("keeps the broadcast as it was", () => {
  const broadcast = Object.fromEntries(
    Object.keys(settings.hooks).map((event) => [
      event,
      handlers(event)
        .filter(({ script }) => script === "emit.mjs")
        .map(({ matcher, async, timeout }) => [
          matcher ?? "",
          async ?? false,
          timeout,
        ]),
    ]),
  );
  const tools =
    "Edit|Write|Bash|Agent|Workflow|SendMessage|SubagentHandback|WebSearch|WebFetch|TaskCreate|TaskUpdate";
  assert.deepEqual(broadcast, {
    SessionStart: [["", true, undefined]],
    UserPromptSubmit: [["", true, undefined]],
    PreToolUse: [["Agent|Workflow", true, undefined]],
    PostToolUse: [[tools, true, undefined]],
    PostToolUseFailure: [["Bash|Agent|Edit|Write", true, undefined]],
    PostToolBatch: [["", true, undefined]],
    PermissionDenied: [["", true, undefined]],
    MessageDisplay: [["", false, 5]],
    SubagentStart: [["", true, undefined]],
    SubagentStop: [["", true, undefined]],
    TaskCreated: [["", true, undefined]],
    TaskCompleted: [["", true, undefined]],
    TeammateIdle: [["", true, undefined]],
    Stop: [["", false, 5]],
    StopFailure: [["", false, 5]],
    // Raised from the 1.5 s default budget so the last broadcast leaves.
    SessionEnd: [["", false, 5]],
  });
});

test("the guard covers file tools and every MCP tool, failing closed, and Bash", () => {
  for (const matcher of ["Edit|Write|NotebookEdit", "mcp__.*", "Bash"]) {
    const guard = one("PreToolUse", "guard.mjs", matcher);
    assert.equal(guard.onFailure, "block", matcher);
    assert.equal(guard.async, undefined, matcher);
    // A Bash hook with `if` runs only for commands Claude Code reads as matching: every spelling
    // must reach the guard.
    assert.equal(guard.if, undefined, matcher);
  }
  // Claude Code reads a matcher with other characters than letters, digits and | as a regular
  // expression, so this one reaches every server's tools, connectors and plugins included.
  const mcp = new RegExp(one("PreToolUse", "guard.mjs", "mcp__.*").matcher);
  for (const tool of [
    "mcp__github__merge_pull_request",
    "mcp__claude_ai_GitHub__push_files",
    "mcp__plugin_tools_github__create_or_update_file",
  ]) {
    assert.match(tool, mcp);
  }
  assert.doesNotMatch("Bash", mcp);
});

test("merging goes through merge.mjs alone: no hook gates another way", () => {
  for (const event of Object.keys(settings.hooks)) {
    assert.ok(
      handlers(event).every(({ script }) => script !== "gate.mjs"),
      event,
    );
  }
  assert.ok(
    settings.permissions.allow.includes("Bash(node .studio/merge.mjs *)"),
  );
  assert.ok(
    settings.permissions.allow.every((rule) => !rule.startsWith("Bash(gh pr")),
  );
});

test("reviewers' verdicts are recorded and posted, with time for GitHub", () => {
  for (const event of ["SubagentStart", "SubagentStop"]) {
    const verdict = one(
      event,
      "verdict.mjs",
      "code-reviewer|qa-engineer|design-director",
    );
    assert.ok(verdict.timeout >= 20 && !verdict.async, event);
  }
});

test("builders stop only after pnpm verify, inside the hook's timeout", () => {
  const verify = one(
    "SubagentStop",
    "verify-stop.mjs",
    "engineer|creative-engineer",
  );
  const [, limit] = verify.args;
  assert.ok(Number(limit) > 0 && Number(limit) + 15 <= verify.timeout);
  assert.equal(verify.async, undefined);
});

test("the watchdog sees what its rules need, and decides in sync", () => {
  assert.equal(one("Stop", "watchdog.mjs").async, undefined);
  assert.equal(
    one("PreToolUse", "watchdog.mjs", "Agent|SendMessage").async,
    undefined,
  );
  for (const [event, matcher] of [
    ["TaskCreated"],
    ["TaskCompleted"],
    ["SubagentStart", "engineer|creative-engineer"],
    ["PostToolUse", "^(Bash|Write|Edit|TaskUpdate|mcp__.*)$"],
  ]) {
    assert.equal(one(event, "watchdog.mjs", matcher).async, true, event);
  }
});

test("denies what agents must not do, whatever the mode", () => {
  for (const rule of [
    "Bash(gh pr merge *)",
    "Bash(gh alias *)",
    "Bash(gh auth *)",
    "Bash(gh config *)",
    "Bash(*owner-approved*)",
    "Bash(pkill *)",
    "Bash(killall *)",
    "mcp__github",
    "Edit(~/.claude.json)",
    "Edit(~/.claude/settings*.json)",
    "Edit(~/.claude/agents/**)",
    "Edit(~/.claude/skills/**)",
    "Edit(~/.claude/hooks/**)",
    "Edit(~/.config/gh/**)",
    "Edit(~/.gitconfig)",
    "Agent(model:*fable*)",
  ]) {
    assert.ok(settings.permissions.deny.includes(rule), rule);
  }
  // Claude Code's own auto-memory and plans stay writable, for the owner's sessions too.
  assert.ok(!settings.permissions.deny.includes("Edit(~/.claude/**)"));
  // REST through gh api is how the team works with GitHub; the guard decides which calls write.
  assert.ok(!settings.permissions.deny.includes("Bash(gh api *)"));
  assert.ok(settings.permissions.allow.includes("Bash(gh api *)"));
});
