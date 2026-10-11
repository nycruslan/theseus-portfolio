// PreToolUse guard for Edit and Write (see .claude/settings.json). It enforces the single-writer
// rule: only the Lead (the main session, which has no agent_type) and the engineer change the
// repository. Every other role returns its work to the Lead and may only write its own memory.

const WRITERS = new Set(["engineer"]);

let input = "";
for await (const chunk of process.stdin) input += chunk;

const { agent_type: agent, tool_input: toolInput = {} } = JSON.parse(input);
const path = toolInput.file_path ?? "";

if (agent && !WRITERS.has(agent) && !path.includes("/.claude/agent-memory/")) {
  console.error(
    `${agent} is read-only: return your output to the Lead instead of writing ${path}.`,
  );
  process.exit(2);
}
