// Forwards Claude Code hook events to the Theseus Studio so visitors can watch the team work.
// Registered as an async hook in .claude/settings.json: it never blocks the agents, and any
// failure is ignored because the build matters more than the broadcast.

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

try {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  // In cloud sessions a network secret injects the Authorization header instead.
  const token = process.env.STUDIO_INGEST_TOKEN;
  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(truncate(JSON.parse(input))),
    signal: AbortSignal.timeout(5000),
  });
} catch {
  // Swallowed on purpose: see the header comment.
}
