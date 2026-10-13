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

test("the guard covers file tools, failing closed, and Bash", () => {
  const files = one("PreToolUse", "guard.mjs", "Edit|Write|NotebookEdit");
  assert.equal(files.onFailure, "block");
  const shell = one("PreToolUse", "guard.mjs", "Bash");
  assert.equal(shell.async, undefined);
});

test("the gate holds every merge path", () => {
  const bash = one("PreToolUse", "gate.mjs", "Bash");
  assert.equal(bash.if, "Bash(gh pr merge *)");
  assert.deepEqual(bash.args.slice(1), ["merge"]);
  assert.equal(bash.onFailure, "block");
  const connector = one(
    "PreToolUse",
    "gate.mjs",
    "mcp__github__merge_pull_request",
  );
  assert.equal(connector.onFailure, "block");
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
    [
      "PostToolUse",
      "Bash|Write|Edit|TaskUpdate|mcp__github__merge_pull_request",
    ],
  ]) {
    assert.equal(one(event, "watchdog.mjs", matcher).async, true, event);
  }
});

test("denies what agents must not do, whatever the mode", () => {
  for (const rule of [
    "Bash(gh api *)",
    "Bash(*owner-approved*)",
    "Bash(pkill *)",
    "Bash(killall *)",
    "Agent(model:*fable*)",
  ]) {
    assert.ok(settings.permissions.deny.includes(rule), rule);
  }
});
