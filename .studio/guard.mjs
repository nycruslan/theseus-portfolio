// PreToolUse guard for Edit, Write, NotebookEdit, Bash and every MCP tool (see .claude/settings.json).
// - Owner paths (scope.mjs's isOwnerPath): the owner's facts, the team's own setup and the
//   toolchain's settings stay out of every agent's reach, in the main checkout and in worktrees
//   alike. content/drafts/ is the team's, for the owner to approve.
// - e2e/: the end-to-end checks are Probe's (qa-engineer). Builders can't rewrite the checks
//   their work is judged by, and neither can the lead.
// - Writers: the lead (the main session, which has no agent_type) and the engineers change the
//   repository. Every agent may write in the sprint folder and in its own memory; Quill also owns
//   ROADMAP.md and the content drafts. A memory directory belongs to its role alone.
// - Outside the project only the temp directories may be written, never the hooks' ledgers, and
//   the main session may also write this project's auto-memory and the saved plans.
// It checks the file a write would really reach: symlinks are followed, and paths match without
// regard to case, as the macOS file system does. For file and MCP tools it fails closed: a call it
// can't verify is blocked, and settings.json blocks if it crashes.
// For Bash it applies the same rules to the files a command writes, read best-effort by shell.mjs:
// a target it can't resolve, or a command whose writes it can't read, is refused when the command
// mentions a path the agent may not write. Script files a line runs (sh, bash, source, node,
// python) are read with the same rules. It refuses process kills that can't name a PID, and what
// remote.mjs refuses on GitHub and in git push. For MCP tools it lets through only the ones whose
// name says they read (get, list, search…). Blocks are broadcast so they show on air.
// All of it is layered defence against shortcuts, not a security boundary: an agent runs as the
// owner, and a program that writes files itself, text encoded past the rules, or an older
// checkout of the harness still gets through.

import { spawnSync } from "node:child_process";
import {
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { repoOf, toplevel } from "./github.mjs";
import { broadcast } from "./post.mjs";
import { remoteRefusal } from "./remote.mjs";
import { isOwnerPath } from "./scope.mjs";
import { readCommand, scriptsRun } from "./shell.mjs";

const WRITERS = new Set(["engineer", "creative-engineer"]);
const MEMORY = /^\.claude\/agent-memory\/([^/]+)\//iu;
const E2E = /^e2e(\/|$)/iu;
const DRAFTS = /^content\/drafts\//iu;
// Claude Code's own notes outside the project: this project's auto-memory and the saved plans.
// MEMORY.md loads into every session in this repository, as CLAUDE.md does, so only the main
// session (the lead, or the owner's own session) writes them, and only this project's folder:
// Claude Code keys it to the git repository, by its path with every other character than a
// letter or digit turned into "-", shared across worktrees.
const CLAUDE_HOME = realOrSame(
  process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"),
);

// The hooks' own records in tmpdir: verdicts for the watchdog, rounds for its fix-round cap.
const LEDGER = /^theseus-(verdicts|watchdog)-/;
// Outside the project, what a target built at run time must not be able to reach.
const SENSITIVE =
  /\.claude\b|\.config\/gh\b|\.gitconfig\b|theseus-(verdicts|watchdog)/i;
// MCP tools are judged by the verb in their own name: one that only reads passes, everything else
// (create, update, merge, push, label, run…) could act on GitHub or elsewhere as the owner.
const MCP_READS = new Set([
  "get",
  "list",
  "search",
  "read",
  "query",
  "fetch",
  "resolve",
  "guide",
  "view",
  "find",
  "describe",
]);
const MCP_ACTS =
  /^(create|update|delete|remove|add|set|put|post|patch|push|merge|write|edit|run|execute|dispatch|trigger|approve|close|reopen|lock|transfer|fork|upload|send|cancel|rerun|enable|disable|apply|import|accept|assign|buy|pause|unpause|stage|restore|invalidate|kill|stop|start|complete|activate|revoke|record|mark|trash|untrash|forward|reply|follow|unfollow)$/;
const GLOB = /[*?[]/;
const MAX_MATCHES = 1000;
const SCRIPT_BYTES = 64 * 1024;
const MAX_SCRIPT_DEPTH = 2;

let hook;
try {
  hook = JSON.parse(readFileSync(0, "utf8"));
} catch {
  block("This call couldn't be verified, so it was blocked.");
}
const project = projectRoot();
if (hook.tool_name === "Bash") checkShell();
else if (String(hook.tool_name).startsWith("mcp__")) checkMcp();
else checkFile();

function checkFile() {
  let reason;
  let path;
  try {
    const target = resolve(
      hook.cwd ?? project,
      hook.tool_input.file_path ?? hook.tool_input.notebook_path,
    );
    const where = locate(target);
    path = where.rel ?? target;
    reason =
      where.rel === undefined ? outsideRefusal(where.real) : refusal(where.rel);
  } catch {
    block("This write couldn't be verified, so it was blocked.");
  }
  if (reason) refuse("StudioWriteBlocked", reason, path);
}

function checkMcp() {
  const tool = String(hook.tool_name);
  const words = tool
    .split("__")
    .at(-1)
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[_-]+/);
  if (
    words.some((word) => MCP_READS.has(word)) &&
    !words.some((word) => MCP_ACTS.test(word))
  ) {
    return;
  }
  refuse(
    "StudioCommandBlocked",
    `${tool} isn't a read, so it could merge, push or change files, branches, labels or statuses on GitHub as the owner, around the merge gate. MCP tools that get, list, search or read pass; use the REST calls in the sprint skill to write, and \`node .studio/merge.mjs <number>\` to merge.`,
  );
}

function checkShell() {
  const found = lineRefusal(
    String(hook.tool_input?.command ?? ""),
    hook.cwd,
    0,
  );
  if (found) refuse(found.event, found.reason, found.path);
}

// The rules for one line of shell, and again for each script file it runs.
function lineRefusal(command, cwd, depth) {
  let read = null;
  try {
    read = readCommand(command, cwd);
  } catch {
    // Read best-effort: the remote rules still apply to the text.
  }
  const scripts = read ? scriptRefusal(read, depth) : { unreadable: false };
  if (scripts.found) return scripts.found;
  const remote = remoteRefusal(command, read, {
    project,
    repo: repoOf(project ?? cwd),
    unreadable: scripts.unreadable,
  });
  if (remote) return { event: "StudioCommandBlocked", reason: remote };
  if (!read) return null;
  if (read.kill) {
    return {
      event: "StudioCommandBlocked",
      reason: `\`${read.kill}\` can stop processes nobody here started, such as the owner's own dev server: \`pkill -f next-server\` once stopped every Next.js server on this machine. Stop only processes you started, by PID: note it when you start one (\`echo $!\`), then run \`kill <pid>\`.`,
    };
  }
  const found = writeRefusal(command, read);
  return found && { event: "StudioWriteBlocked", ...found };
}

// Script files the line runs are read with the same rules: a shell script line by line, other
// code (node, python) for the words remote.mjs refuses. The owner's own scripts (the harness and
// its tests) are trusted, since no agent can change them. A script the guard can't read (missing,
// over 64 KB, or named at run time) makes the line opaque, and is refused when the line also
// writes, since it may be writing that very script.
function scriptRefusal(read, depth) {
  let unreadable = false;
  for (const command of read.commands) {
    for (const { word, kind } of scriptsRun(command)) {
      const path =
        word.dynamic || !command.dir ? null : resolve(command.dir, word.text);
      const files = path && GLOB.test(path) ? glob(path) : path ? [path] : [];
      if (!files.length) unreadable = true;
      for (const file of files) {
        const where = safeLocate(file);
        if (where?.rel !== undefined && isOwnerPath(where.rel)) continue;
        const size = statSync(file, { throwIfNoEntry: false });
        if (
          !size?.isFile() ||
          size.size > SCRIPT_BYTES ||
          depth >= MAX_SCRIPT_DEPTH
        ) {
          unreadable = true;
          continue;
        }
        const text = readFileSync(file, "utf8");
        const found =
          kind === "shell"
            ? lineRefusal(text, dirname(file), depth + 1)
            : codeRefusal(text);
        if (found) {
          return {
            found: {
              ...found,
              reason: `${word.text} runs as part of this command, and the guard read it: ${found.reason}`,
            },
          };
        }
      }
    }
  }
  if (unreadable && read.writes.length) {
    return {
      found: {
        event: "StudioCommandBlocked",
        reason:
          "This line runs a script the guard can't read (missing, too large, or named at run time) and also writes files, so it may be writing that very script. Write the script first, in its own step, then run it.",
      },
    };
  }
  return { unreadable };
}

// Code the guard can't parse is held to remote.mjs's text rules, as an unreadable line is.
function codeRefusal(text) {
  const reason = remoteRefusal(text, null, { project, repo: repoOf(project) });
  return reason && { event: "StudioCommandBlocked", reason };
}

function safeLocate(path) {
  try {
    return locate(path);
  } catch {
    return null;
  }
}

function writeRefusal(command, { writes, unsure }) {
  for (const write of writes) {
    if (write.dynamic) {
      const named = mentioned(command);
      if (named) {
        return {
          reason: `This command writes to \`${write.text}\`, a path it builds at run time, and it mentions ${named.token}: ${named.reason} Write to a literal path.`,
          path: named.token,
        };
      }
      continue;
    }
    let reached;
    try {
      reached = reach(write.path, write.tree);
    } catch {
      return {
        reason: `${write.path} couldn't be verified, so this command was blocked.`,
        path: write.path,
      };
    }
    for (const { rel, outside } of reached) {
      const reason = outside ? outsideRefusal(outside) : refusal(rel);
      if (reason)
        return {
          reason: `${reason} (This command writes it.)`,
          path: rel ?? outside,
        };
    }
  }
  if (unsure.length) {
    const named = mentioned(command);
    if (named) {
      return {
        reason: `The guard can't tell what \`${unsure[0]}\` writes, and this command mentions ${named.token}: ${named.reason} Use a command that names the files it writes.`,
        path: named.token,
      };
    }
  }
  return null;
}

// The paths a shell write reaches, inside the project ({ rel }) or outside it ({ outside }). A glob
// reaches what it matches. A tree (a removal, a sync, a restore) also reaches every tracked file
// under a directory, and the directory itself as `dir/`.
function reach(path, tree) {
  const matches = GLOB.test(path) ? glob(path) : [];
  const paths = matches.length ? matches : [path];
  return paths.flatMap((one) => {
    const where = locate(one);
    if (where.rel === undefined) return [{ outside: where.real }];
    const directory = statSync(one, { throwIfNoEntry: false })?.isDirectory();
    if (!tree) return [{ rel: where.rel }];
    const under = where.rel ? [{ rel: `${where.rel}/` }] : [];
    if (!directory) return [{ rel: where.rel }, ...under];
    const listed = spawnSync(
      "git",
      ["ls-files", "--full-name", "-z", "--", "."],
      {
        cwd: one,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const files =
      listed.status === 0 ? listed.stdout.split("\0").filter(Boolean) : [];
    return [
      { rel: where.rel },
      ...under,
      ...files.map((file) => ({ rel: inProject(file) })),
    ];
  });
}

// The paths a glob matches, segment by segment as the shell does: * and ? don't match a leading dot.
function glob(pattern) {
  const parts = pattern.split("/");
  let found = [parts[0] === "" ? "/" : "."];
  for (const part of parts.slice(parts[0] === "" ? 1 : 0)) {
    if (!part) continue;
    if (!GLOB.test(part)) {
      found = found.map((dir) => join(dir, part));
      continue;
    }
    const matcher = segment(part);
    found = found.flatMap((dir) => {
      try {
        return readdirSync(dir)
          .filter((name) => matcher.test(name))
          .map((name) => join(dir, name));
      } catch {
        return [];
      }
    });
    if (found.length > MAX_MATCHES) found = found.slice(0, MAX_MATCHES);
  }
  return found.filter((path) => lstatSync(path, { throwIfNoEntry: false }));
}

function segment(part) {
  let source = part.startsWith(".") ? "" : "(?!\\.)";
  for (let i = 0; i < part.length; i++) {
    const c = part[i];
    if (c === "*") source += "[^/]*";
    else if (c === "?") source += "[^/]";
    else if (c === "[") {
      const close = part.indexOf("]", i + 2);
      if (close < 0) source += "\\[";
      else {
        source += `[${part
          .slice(i + 1, close)
          .replace(/^!/, "^")
          .replace(/\\/g, "\\\\")}]`;
        i = close;
      }
    } else source += c.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

// Where a path lands: its project-relative path, or undefined outside the project, and its real path.
function locate(path) {
  const realPath = real(path);
  const rel = relative(real(project), realPath);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) {
    return { rel: undefined, real: realPath };
  }
  return { rel: inProject(rel), real: realPath };
}

// The path as it is inside a checkout: worktrees live under .claude/worktrees/<name>/.
function inProject(rel) {
  return rel.replace(/^\.claude\/worktrees\/[^/]+\/?/, "");
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

function projectRoot() {
  const base = process.env.CLAUDE_PROJECT_DIR ?? hook.cwd;
  try {
    return process.env.CLAUDE_PROJECT_DIR ?? toplevel(base);
  } catch {
    return base;
  }
}

// This project's auto-memory folder or the saved plans, by real path.
function claudeNotes(path) {
  const under = (dir) =>
    path.startsWith(`${dir}/`) && path.length > dir.length + 1;
  if (under(join(CLAUDE_HOME, "plans"))) return true;
  return projectSlugs().some((slug) =>
    under(join(CLAUDE_HOME, "projects", slug, "memory")),
  );
}

// The names Claude Code gives this project's folder: from the git repository (the main checkout,
// which worktrees share) and from the project directory itself, as given and as its real path.
function projectSlugs() {
  const roots = [project, realOrSame(project)];
  const common = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: project, encoding: "utf8" },
  );
  if (common.status === 0) {
    const main = dirname(common.stdout.trim());
    roots.push(main, realOrSame(main));
  }
  return [
    ...new Set(
      roots.filter(Boolean).map((root) => root.replace(/[^a-zA-Z0-9]/g, "-")),
    ),
  ];
}

function realOrSame(path) {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

function outsideRefusal(path) {
  const temps = [tmpdir(), process.env.TMPDIR, "/tmp", "/private/tmp"]
    .filter(Boolean)
    .map((dir) => {
      try {
        return realpathSync.native(dir);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const inside = (dir) => path === dir || path.startsWith(`${dir}/`);
  if (path.startsWith("/dev/")) return null;
  if (claudeNotes(path)) {
    return hook.agent_type
      ? `${path} is Claude Code's memory or plans, which load into the lead's sessions: only the main session writes them. Report what you learned instead.`
      : null;
  }
  if (temps.some(inside)) {
    return LEDGER.test(basename(path))
      ? `${basename(path)} is written by the hooks alone.`
      : null;
  }
  return `${path} is outside the project: write only inside it, or in the temp directory ($TMPDIR or /tmp).`;
}

// What keeps a path from this agent whatever its role: the owner's paths, another role's memory,
// and Probe's checks.
function protection(path) {
  const agent = hook.agent_type;
  if (isOwnerPath(path)) {
    return `${path} is protected: only the owner changes it. Propose the change in the PR instead.`;
  }
  const owner = path.match(MEMORY)?.[1];
  if (owner && owner !== agent) {
    return `${path} is ${owner}'s memory: only ${owner} writes it.`;
  }
  if (E2E.test(path) && agent !== "qa-engineer") {
    return `${path} belongs to Probe: only qa-engineer writes the end-to-end checks. Send the change to Probe, or propose it in the PR.`;
  }
  return null;
}

function refusal(path) {
  const agent = hook.agent_type;
  const reason = protection(path);
  if (reason) return reason;
  if (
    !agent ||
    WRITERS.has(agent) ||
    MEMORY.test(path) ||
    E2E.test(path) ||
    path.startsWith(".studio/sprint/") ||
    (agent === "product-owner" && (path === "ROADMAP.md" || DRAFTS.test(path)))
  ) {
    return null;
  }
  return `${agent} doesn't edit ${path}: write your work under .studio/sprint/<n>/ and hand over the path, or send the change to the builder who owns it.`;
}

// The first path in the command's text this agent may not write, for writes the guard can't
// resolve. Words are read as paths: inside the project each tail of the path counts (`$ROOT/e2e/x`
// mentions e2e/x), and outside it the agent's and gh's settings and the hooks' ledgers do.
function mentioned(command) {
  for (const token of command.split(/[\s"'`=(){};|&<>,]+/)) {
    if (!token || /^-/.test(token)) continue;
    if (SENSITIVE.test(token)) {
      return {
        token,
        reason: "those are the owner's settings or the hooks' records.",
      };
    }
    const parts = token.replace(/^\.\//, "").split("/");
    for (let i = 0; i < parts.length; i++) {
      const rel = parts.slice(i).join("/");
      if (!rel || rel === ".") continue;
      const reason = protection(rel) ?? protection(`${rel}/`);
      if (reason) return { token, reason };
    }
  }
  return null;
}

function refuse(event, reason, path) {
  broadcast({ ...hook, hook_event_name: event, ...(path && { path }), reason });
  block(reason);
}

function block(reason) {
  console.error(reason);
  process.exit(2);
}
