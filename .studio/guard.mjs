// PreToolUse guard for Edit, Write and NotebookEdit (see .claude/settings.json).
// - Protected: the owner's facts and the team's own setup stay out of every agent's reach, in the
//   main checkout and in worktrees alike.
// - Writers: the lead (the main session, which has no agent_type) and the engineers change the
//   repository. Every agent may write in the sprint folder and in its own memory, and Quill also
//   owns ROADMAP.md. A memory directory belongs to its role alone.
// It fails closed: a write it can't verify is blocked, and settings.json blocks if it crashes.
// Blocks are broadcast so they show on air. Roles with Bash could still write through the shell;
// their prompts, not this hook, keep them from it.

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { broadcast } from "./post.mjs";

const WRITERS = new Set(["engineer", "creative-engineer"]);
const PROTECTED = [
  /^content\//,
  /^(CLAUDE|AGENTS)\.md$/,
  /^\.mcp\.json$/,
  /^\.claude\/(settings(\.local)?\.json$|agents\/|skills\/)/,
  // The harness is the owner's; the team's state (STATE.md and the sprint folder) is the team's.
  /^\.studio\/(?!sprint\/|STATE\.md$)/,
  /^\.github\//,
  /^design\/rubric\.md$/,
];
const MEMORY = /^\.claude\/agent-memory\/([^/]+)\//;

let hook;
let path;
try {
  hook = JSON.parse(readFileSync(0, "utf8"));
  path = targetOf(hook);
} catch {
  block("This write couldn't be verified, so it was blocked.");
}
const reason = refusal(path, hook.agent_type);
if (reason) {
  broadcast({ ...hook, hook_event_name: "StudioWriteBlocked", path, reason });
  block(reason);
}

// The path as it is inside a checkout: worktrees live under .claude/worktrees/<name>/.
function targetOf({ tool_input: input, cwd }) {
  const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;
  const target = resolve(cwd ?? root, input.file_path ?? input.notebook_path);
  return relative(root, target).replace(/^\.claude\/worktrees\/[^/]+\//, "");
}

function refusal(path, agent) {
  if (path.startsWith("..") || PROTECTED.some((rule) => rule.test(path))) {
    return `${path} is protected: only the owner changes it. Propose the change in the PR instead.`;
  }
  const owner = path.match(MEMORY)?.[1];
  if (owner) {
    return owner === agent
      ? null
      : `${path} is ${owner}'s memory: only ${owner} writes it.`;
  }
  if (
    !agent ||
    WRITERS.has(agent) ||
    path.startsWith(".studio/sprint/") ||
    (agent === "product-owner" && path === "ROADMAP.md")
  ) {
    return null;
  }
  return `${agent} doesn't edit ${path}: write your work under .studio/sprint/<n>/ and hand over the path, or send the change to the builder who owns it.`;
}

function block(reason) {
  console.error(reason);
  process.exit(2);
}
