// Forwards Claude Code hook events to the Theseus Studio so visitors can watch the team work.
// Registered as an async hook in .claude/settings.json: it never blocks the agents, and any
// failure is ignored because the build matters more than the broadcast.

import { readFile } from "node:fs/promises";

const MAX_STRING_LENGTH = 4000;

const url = process.env.STUDIO_INGEST_URL;
if (!url) process.exit(0);

// Hook payloads can carry whole files or command output; the Studio only needs a preview.
function truncate(value) {
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (Array.isArray(value)) return value.map(truncate);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, truncate(inner)]),
    );
  }
  return value;
}

// Hooks don't report token usage, so total it from the transcript when an agent finishes.
// A message can appear on several transcript lines; the last one has its final usage.
async function usageOf(transcriptPath) {
  const messages = new Map();
  for (const line of (await readFile(transcriptPath, "utf8")).split("\n")) {
    if (!line.includes('"usage"')) continue;
    const { message } = JSON.parse(line);
    if (message?.usage) messages.set(message.id, message);
  }

  let tokens = 0;
  let outputTokens = 0;
  let model;
  for (const { usage, model: messageModel } of messages.values()) {
    outputTokens += usage.output_tokens ?? 0;
    tokens +=
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.output_tokens ?? 0);
    model = messageModel;
  }
  return { tokens, outputTokens, model };
}

try {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const hook = JSON.parse(input);

  const transcript =
    hook.hook_event_name === "SubagentStop"
      ? hook.agent_transcript_path
      : hook.hook_event_name === "SessionEnd" && hook.transcript_path;
  if (transcript) hook.studio_usage = await usageOf(transcript);

  // In cloud sessions a network secret injects the Authorization header instead.
  const token = process.env.STUDIO_INGEST_TOKEN;
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(truncate(hook)),
    signal: AbortSignal.timeout(5000),
  });
} catch {
  // Swallowed on purpose: see the header comment.
}
