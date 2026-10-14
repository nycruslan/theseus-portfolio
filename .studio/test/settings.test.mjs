import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STUDIO } from "./kit.mjs";

// The hooks only work as wired in .claude/settings.json, so the wiring is checked too.
const settings = JSON.parse(
  readFileSync(join(STUDIO, "..", ".claude", "settings.json"), "utf8"),
);

/** Every handler for an event, with its matcher and the script it runs. */
function handlers(event) {
  return (settings.hooks[event] ?? []).flatMap(({ matcher, hooks }) =>
    hooks.map((hook) => ({
      matcher,
      script: hook.args?.[0]?.replace(/^.*\/\.studio\//, ""),
      ...hook,
    })),
  );
}
const one = (event, script) => {
  const found = handlers(event).filter((hook) => hook.script === script);
  assert.equal(found.length, 1, `${event} ${script}`);
  return found[0];
};

test("every hook runs a script that exists", () => {
  for (const event of Object.keys(settings.hooks)) {
    for (const { script, command } of handlers(event)) {
      if (command === "node")
        assert.ok(existsSync(join(STUDIO, script)), `${event}: ${script}`);
    }
  }
});

test("the broadcast never holds a session up", () => {
  for (const event of Object.keys(settings.hooks)) {
    for (const hook of handlers(event).filter(
      ({ script }) => script === "emit.mjs",
    )) {
      assert.ok(hook.async || hook.timeout <= 5, event);
    }
  }
});

test("the guard covers the file tools and blocks if it crashes", () => {
  const guard = one("PreToolUse", "guard.mjs");
  assert.equal(guard.matcher, "Edit|Write|NotebookEdit");
  assert.equal(guard.onFailure, "block");
  assert.equal(guard.async, undefined);
});

test("builders stop only after pnpm verify, inside the hook's timeout", () => {
  const verify = one("SubagentStop", "verify-stop.mjs");
  const [, limit] = verify.args;
  assert.ok(Number(limit) > 0 && Number(limit) + 15 <= verify.timeout);
  assert.equal(verify.async, undefined);
});

test("the watchdog decides a stop in sync and hears the rest in the background", () => {
  assert.equal(one("Stop", "watchdog.mjs").async, undefined);
  for (const event of [
    "SubagentStart",
    "TaskCreated",
    "TaskCompleted",
    "PostToolUse",
  ]) {
    assert.equal(one(event, "watchdog.mjs").async, true, event);
  }
});

test("denies the obvious, whatever the mode", () => {
  for (const rule of [
    "Bash(gh pr merge *)",
    "Bash(gh auth *)",
    "Bash(*owner-approved*)",
    "Bash(pkill *)",
    "Bash(killall *)",
    "Bash(git push --force*)",
    "Bash(git push * -f*)",
    "mcp__github",
    "Agent(model:*fable*)",
  ]) {
    assert.ok(settings.permissions.deny.includes(rule), rule);
  }
  // REST through gh api is how the team works with GitHub, and routines run unattended.
  for (const rule of ["Bash(gh api *)", "Bash(node .studio/next-sprint.mjs)"]) {
    assert.ok(settings.permissions.allow.includes(rule), rule);
  }
});

test("hooks reach the network through the cloud's proxy: Node's fetch needs NODE_USE_ENV_PROXY", () => {
  assert.equal(settings.env.NODE_USE_ENV_PROXY, "1");
});
