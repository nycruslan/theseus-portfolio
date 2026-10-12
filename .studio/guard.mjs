// PreToolUse guard for Edit, Write and NotebookEdit (see .claude/settings.json).
// - Protected files: the owner's facts and the team's own setup stay out of every agent's reach,
//   in the main checkout and in worktrees alike.
// - Writers: only the lead (the main session, which has no agent_type) and the engineers change
//   the repository; every other role may only write to its own memory directory.
// It fails closed: a write it can't verify is blocked. Roles with Bash could still write through
// the shell; their prompts, not this hook, keep them from it.

import { relative, resolve } from "node:path";

const WRITERS = new Set(["engineer", "creative-engineer"]);
const PROTECTED = [
  /^content\//,
  /^\.claude\/(settings\.json$|agents\/|skills\/)/,
  /^\.studio\/[^/]+\.(mjs|sh)$/,
  /^\.github\//,
  /^design\/rubric\.md$/,
];

try {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const { agent_type: agent, tool_input: toolInput, cwd } = JSON.parse(input);

  const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;
  const target = resolve(
    cwd ?? root,
    toolInput.file_path ?? toolInput.notebook_path,
  );
  // Worktrees live under .claude/worktrees/<name>/, so judge paths as they are inside a checkout.
  const path = relative(root, target).replace(
    /^\.claude\/worktrees\/[^/]+\//,
    "",
  );

  if (path.startsWith("..") || PROTECTED.some((rule) => rule.test(path))) {
    block(`${path} is protected: only the owner changes it.`);
  }
  if (
    agent &&
    !WRITERS.has(agent) &&
    !path.startsWith(`.claude/agent-memory/${agent}/`)
  ) {
    block(
      `${agent} doesn't edit files: return your work to the lead instead of writing ${path}.`,
    );
  }
} catch {
  block("This write couldn't be verified, so it was blocked.");
}

function block(reason) {
  console.error(reason);
  process.exit(2);
}
