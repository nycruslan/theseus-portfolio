// PreToolUse guard for the file tools: Edit, Write and NotebookEdit (see .claude/settings.json). It
// keeps each role to its own files:
// - owner paths (those .github/CODEOWNERS gives an owner) are no agent's to write, the lead's
//   included;
// - e2e/ is Probe's (qa-engineer), so builders can't rewrite the checks their work is judged by;
// - a memory folder under .claude/agent-memory/ belongs to its role alone;
// - the rest of the project is for the lead (the main session) and the builders. Every role writes
//   in the sprint folder, and Quill also writes ROADMAP.md and content/drafts/.
// It's guidance, not a boundary: a shell command or a script can still write anything. The binding
// rules are GitHub's (the `gate` and `lens` checks on main). It fails closed: a call it can't read
// is blocked, and settings.json blocks if it crashes. Blocks are put on air as StudioWriteBlocked.

import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { broadcast } from "./post.mjs";
import { ownersIn } from "./scope.mjs";

const BUILDERS = new Set(["engineer", "creative-engineer"]);
const MEMORY = /^\.claude\/agent-memory\/([^/]+)\//iu;
const E2E = /^e2e(\/|$)/iu;
const QUILL = /^(ROADMAP\.md$|content\/drafts\/)/iu;

let hook;
let path;
let isOwnerPath;
try {
  isOwnerPath = ownersIn(join(dirname(fileURLToPath(import.meta.url)), ".."));
  hook = JSON.parse(readFileSync(0, "utf8"));
  const project = real(process.env.CLAUDE_PROJECT_DIR ?? hook.cwd);
  const input = hook.tool_input;
  const target = real(
    resolve(hook.cwd ?? project, input.file_path ?? input.notebook_path),
  );
  path = relative(project, target);
} catch {
  block("This write couldn't be verified, so it was blocked.");
}
// Outside the project is Claude Code's own business (permissions and deny rules).
const inside = !(path === ".." || path.startsWith("../") || isAbsolute(path));
const reason = inside && refusal(inProject(path), hook.agent_type);
if (reason) {
  broadcast({ ...hook, hook_event_name: "StudioWriteBlocked", path, reason });
  block(reason);
}

/** Why this role may not write this project path, or null when it may. */
function refusal(path, agent) {
  if (isOwnerPath(path)) {
    return `${path} is protected: only the owner changes it. Propose the change in the PR instead.`;
  }
  const memory = path.match(MEMORY)?.[1];
  if (memory) {
    return memory === agent
      ? null
      : `${path} is ${memory}'s memory: only ${memory} writes it.`;
  }
  if (E2E.test(path)) {
    return agent === "qa-engineer"
      ? null
      : `${path} belongs to Probe: only qa-engineer writes the end-to-end checks. Send the change to Probe, or propose it in the PR.`;
  }
  if (!agent || BUILDERS.has(agent) || path.startsWith(".studio/sprint/"))
    return null;
  if (agent === "product-owner" && QUILL.test(path)) return null;
  return `${agent} doesn't edit ${path}: write your work under .studio/sprint/<n>/ and hand over the path, or send the change to the builder who owns it.`;
}

// A worktree of the project (.claude/worktrees/<name>/) holds the same paths.
function inProject(rel) {
  return rel.replace(/^\.claude\/worktrees\/[^/]+\/?/, "");
}

// The real path, following symlinks (a dangling one included, since writing through it creates its
// target), so a link can't hide where a write lands.
function real(file, hops = 0) {
  if (hops > 40) throw new Error("too many links");
  try {
    return realpathSync.native(file);
  } catch {
    if (lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) {
      return real(resolve(dirname(file), readlinkSync(file)), hops + 1);
    }
    const parent = dirname(file);
    return parent === file
      ? file
      : join(real(parent, hops + 1), basename(file));
  }
}

function block(message) {
  console.error(message);
  process.exit(2);
}
