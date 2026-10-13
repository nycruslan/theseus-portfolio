// PreToolUse guard for Edit, Write, NotebookEdit and Bash (see .claude/settings.json).
// - Protected: the owner's facts and the team's own setup stay out of every agent's reach, in the
//   main checkout and in worktrees alike.
// - e2e/: the end-to-end checks are Probe's (qa-engineer). Builders can't rewrite the checks
//   their work is judged by, and neither can the lead.
// - Writers: the lead (the main session, which has no agent_type) and the engineers change the
//   repository. Every agent may write in the sprint folder and in its own memory, and Quill also
//   owns ROADMAP.md. A memory directory belongs to its role alone.
// It checks the file a write would really reach: symlinks are followed, and paths match without
// regard to case, as the macOS file system does. For file tools it fails closed: a write it can't
// verify is blocked, and settings.json blocks if it crashes.
// For Bash it applies the same rules to the files a command writes, read best-effort by shell.mjs,
// and refuses process kills that can't name a PID. A command it can't read goes on to the normal
// permission flow: the shell check narrows the hole, it doesn't close it. Blocks are broadcast so
// they show on air.

import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { broadcast } from "./post.mjs";
import { readCommand } from "./shell.mjs";

const WRITERS = new Set(["engineer", "creative-engineer"]);
const PROTECTED = [
  /^content\//iu,
  // Instruction files load wherever they are: the root ones at launch, nested ones on demand.
  /(^|\/)(CLAUDE|AGENTS)(\.local)?\.md$/iu,
  /^\.mcp\.json$/iu,
  /^\.claude\/(?!agent-memory\/)/iu,
  // The harness is the owner's; the team's state (STATE.md and the sprint folder) is the team's.
  /^\.studio\/(?!sprint\/|STATE\.md$)/iu,
  /^\.github\//iu,
  /^design\/rubric\.md$/iu,
];
const MEMORY = /^\.claude\/agent-memory\/([^/]+)\//iu;
// The Playwright config decides which checks run, so it is Probe's with them.
const E2E = /^(e2e\/|playwright\.config\.)/iu;
// The hooks' own records in tmpdir: verdicts for the gate, rounds for the watchdog.
const LEDGER = /^theseus-(verdicts|watchdog)-/;

let hook;
try {
  hook = JSON.parse(readFileSync(0, "utf8"));
} catch {
  block("This write couldn't be verified, so it was blocked.");
}
if (hook.tool_name === "Bash") checkShell();
else checkFile();

function checkFile() {
  let path;
  try {
    path = inProject(target(hook));
  } catch {
    block("This write couldn't be verified, so it was blocked.");
  }
  const reason = refusal(path, hook.agent_type);
  if (reason) refuse("StudioWriteBlocked", reason, path);
}

function checkShell() {
  let found;
  try {
    found = shellRefusal();
  } catch {
    // Best-effort: a command it can't read goes on to the normal permission flow.
    return;
  }
  if (found) refuse(found.event, found.reason, found.path);
}

function shellRefusal() {
  const { writes, kill } = readCommand(hook.tool_input?.command, hook.cwd);
  if (kill) {
    return {
      event: "StudioCommandBlocked",
      reason: `\`${kill}\` can stop processes nobody here started, such as the owner's own dev server: \`pkill -f next-server\` once stopped every Next.js server on this machine. Stop only processes you started, by PID: note it when you start one (\`echo $!\`), then run \`kill <pid>\`.`,
    };
  }
  for (const { path, tree } of writes) {
    let reached;
    try {
      reached = reach(path, tree);
    } catch {
      const reason = `${path} couldn't be verified, so this command was blocked.`;
      return { event: "StudioWriteBlocked", reason, path };
    }
    for (const rel of reached) {
      const reason =
        rel === LEDGER
          ? `${basename(path)} is written by the hooks alone.`
          : refusal(rel, hook.agent_type);
      if (reason) {
        return {
          event: "StudioWriteBlocked",
          reason: `${reason} (This command writes it.)`,
          path: rel === LEDGER ? path : rel,
        };
      }
    }
  }
  return null;
}

// The project paths a shell write reaches. Outside the project only the hooks' ledgers matter. A
// removal of a directory or a glob reaches every tracked file under it.
function reach(path, tree) {
  const rel = inProject(path);
  if (rel.startsWith("..")) return LEDGER.test(basename(path)) ? [LEDGER] : [];
  const directory = statSync(path, { throwIfNoEntry: false })?.isDirectory();
  if (!tree || !(directory || /[*?[]/.test(basename(path)))) return [rel];
  const listed = spawnSync(
    "git",
    ["ls-files", "--full-name", "-z", "--", directory ? "." : basename(path)],
    {
      cwd: directory ? path : dirname(path),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const files = listed.status === 0 ? listed.stdout.split("\0") : [];
  return [rel, ...files.filter(Boolean)];
}

function target({ tool_input: input, cwd }) {
  return resolve(
    cwd ?? process.env.CLAUDE_PROJECT_DIR,
    input.file_path ?? input.notebook_path,
  );
}

// The path as it is inside a checkout: worktrees live under .claude/worktrees/<name>/.
function inProject(path) {
  const root = process.env.CLAUDE_PROJECT_DIR ?? hook.cwd;
  return relative(real(root), real(path)).replace(
    /^\.claude\/worktrees\/[^/]+\//,
    "",
  );
}

// The real path of the part that exists, plus the rest. A link to a missing file throws, since
// writing through it creates whatever it points at.
function real(path) {
  try {
    return realpathSync.native(path);
  } catch (error) {
    if (lstatSync(path, { throwIfNoEntry: false })) throw error;
    return join(real(dirname(path)), basename(path));
  }
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
  if (E2E.test(path)) {
    return agent === "qa-engineer"
      ? null
      : `${path} belongs to Probe: only qa-engineer writes the end-to-end checks. Send the change to Probe, or propose it in the PR.`;
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

function refuse(event, reason, path) {
  broadcast({ ...hook, hook_event_name: event, path, reason });
  block(reason);
}

function block(reason) {
  console.error(reason);
  process.exit(2);
}
