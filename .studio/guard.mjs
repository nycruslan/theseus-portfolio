// PreToolUse guard for Edit, Write and NotebookEdit (see .claude/settings.json). It enforces the
// single-writer rule: only the Lead (the main session, which has no agent_type) and the engineer
// change the repository. Every other role returns its work to the Lead and may only write inside
// its own memory directory. It fails closed: a write it can't verify is blocked.
//
// QA and design have Bash for agent-browser, so they could still write through the shell. Their
// prompts keep them from it, not this hook.

import { resolve, sep } from "node:path";

const WRITERS = new Set(["engineer"]);

try {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  const { agent_type: agent, tool_input: toolInput, cwd } = JSON.parse(input);
  if (!agent || WRITERS.has(agent)) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR ?? cwd;
  const target = resolve(root, toolInput.file_path ?? toolInput.notebook_path);
  const ownMemory = resolve(root, ".claude/agent-memory", agent) + sep;

  if (!target.startsWith(ownMemory)) {
    block(
      `${agent} is read-only: return your output to the Lead instead of writing ${target}.`,
    );
  }
} catch {
  block("This write couldn't be verified, so it was blocked.");
}

function block(reason) {
  console.error(reason);
  process.exit(2);
}
