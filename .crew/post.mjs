// Delivers the Studio broadcast. Hooks call broadcast(), which masks secrets, writes the payload to
// a temp file and starts this file as a fully detached process to POST it. The hook returns in
// milliseconds, and the POST outlives a headless session's teardown, which kills hooks still running
// (https://code.claude.com/docs/en/hooks#run-hooks-in-the-background). Delivery failures are ignored
// on purpose: the build matters more than the broadcast.

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const MAX_STRING_LENGTH = 4000;

// The Studio is public, so mask anything that looks like a credential before it leaves: the values
// of secret-named environment variables, values given to secret-named names in any case (`API_KEY=`,
// `password=`, `--token value`, `"secret": "…"`, a secret-named key's string), then common key and
// token formats. The Studio's ingest masks again with the same patterns (its lib/redact.ts). AUTH
// leaves out a whole AUTHOR word (but not AUTHORIZATION), or a GIT_AUTHOR_NAME or a commit's
// --author would blank that name in every line the Studio shows. Every quantifier is bounded, so a
// long or hostile string can't make a pattern backtrack for long.
const SECRET_NAMES =
  "TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|AUTH(?!OR(?:[^A-Z0-9]|$))|DATABASE_URL|POSTGRES";
const SECRET_ENV = new RegExp(SECRET_NAMES, "i");
const NAME = `[A-Z0-9_]{0,64}(?:${SECRET_NAMES})[A-Z0-9_]{0,64}`;
const ASSIGNED = `\\b${NAME}=`;
const SECRET_PATTERNS = [
  // `NAME="…"` and `NAME='…'` up to the closing quote, or the end when there is none.
  new RegExp(`(?<=${ASSIGNED}")[^"]{0,4096}(?="|$)`, "gi"),
  new RegExp(`(?<=${ASSIGNED}')[^']{0,4096}(?='|$)`, "gi"),
  // `NAME=value`, `--name=value` and `--name value`, up to a space or shell separator.
  new RegExp(`(?<=${ASSIGNED})[^\\s"';&|]{1,4096}`, "gi"),
  new RegExp(
    `(?<=--[\\w-]{0,64}(?:${SECRET_NAMES})[\\w-]{0,64} )[^\\s"';&|-][^\\s"';&|]{0,4096}`,
    "gi",
  ),
  // JSON's `"name": "…"`, escaped characters included.
  new RegExp(
    `(?<="[\\w-]{0,64}(?:${SECRET_NAMES})[\\w-]{0,64}"\\s{0,8}:\\s{0,8}")(?:[^"\\\\]|\\\\.){1,4096}`,
    "gi",
  ),
  // An Authorization header's scheme and credentials, whatever the scheme.
  /(?<=\bauthorization\s{0,8}:\s{0,8})(?:\w{1,16}\s{1,8})?[^\s"']{1,4096}/gi,
  /\b(?:Bearer|Basic)\s{1,8}[\w.~+/-]{16,4096}=*/gi,
  /\b(?:sk|pk|rk)(?:-|_live_|_test_)[\w-]{16,512}/g,
  /\bgh[pousr]_\w{20,512}/g,
  /\bgithub_pat_\w{20,512}/g,
  /\bglpat-[\w-]{20,512}/g,
  /\bxox[abprs]-[\w-]{10,512}/g,
  /\bAIza[\w-]{30,512}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  // Credentials in a URL (`user:password@`, `token@`), up to the last `@` before the host.
  /\b[a-z][\w+.-]{0,30}:\/\/[^\s/]{1,256}@/gi,
  /-----BEGIN [A-Z ]{0,32}PRIVATE KEY-----[\s\S]{0,8192}?-----END [A-Z ]{0,32}PRIVATE KEY-----/g,
];
const secretValues = Object.entries(process.env)
  .filter(
    ([name, value]) => SECRET_ENV.test(name) && value && value.length >= 8,
  )
  .map(([, value]) => value);

/** Sends a payload to the Studio; with a transcript, its token usage follows as a second event. */
export function broadcast(payload, transcript) {
  if (!process.env.STUDIO_INGEST_URL) return;
  try {
    const file = join(tmpdir(), `theseus-post-${randomUUID()}.json`);
    const stamped = sanitize({ ...payload, at: Date.now() });
    writeFileSync(file, JSON.stringify({ payload: stamped, transcript }), {
      mode: 0o600,
    });
    spawn(process.execPath, [SELF, file], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {
    // Ignored: see the header comment.
  }
}

if (process.argv[1] === SELF) {
  try {
    await deliver(process.argv[2]);
  } catch {
    // Ignored: see the header comment.
  }
}

async function deliver(file) {
  const { payload, transcript } = JSON.parse(readFileSync(file, "utf8"));
  rmSync(file);
  payload.repo = repoName(payload.cwd);
  // The event goes first, so a slow or broken transcript can't cost it.
  await post(payload);
  if (!transcript) return;
  const { session_id, agent_id, agent_type, cwd, at, repo } = payload;
  await post({
    session_id,
    hook_event_name: "StudioUsage",
    agent_id,
    agent_type,
    cwd,
    at,
    repo,
    usage: usageOf(transcript),
  });
}

async function post(payload) {
  // In cloud sessions a network secret injects the Authorization header instead.
  const token = process.env.STUDIO_INGEST_TOKEN;
  await fetch(process.env.STUDIO_INGEST_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
}

// The repository's name tells portfolio and Studio sprints apart, whatever the checkout is called.
function repoName(cwd) {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return basename(remote.trim(), ".git");
  } catch {
    return basename(process.env.CLAUDE_PROJECT_DIR ?? cwd ?? "");
  }
}

// Hooks don't report token usage, so total it from the transcript. A message can appear on several
// lines, and the last one has its final usage.
function usageOf(transcript) {
  const messages = new Map();
  for (const line of readFileSync(transcript, "utf8").split("\n")) {
    if (!line.includes('"usage"')) continue;
    try {
      const { message } = JSON.parse(line);
      if (message?.usage) messages.set(message.id, message);
    } catch {
      // A line still being written: the transcript is written asynchronously.
    }
  }

  let outputTokens = 0;
  let processedTokens = 0;
  let model;
  for (const { usage, model: messageModel } of messages.values()) {
    outputTokens += usage.output_tokens ?? 0;
    // Everything the model read and wrote, so cache re-reads dominate it: context, not work.
    processedTokens +=
      (usage.input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.output_tokens ?? 0);
    model = messageModel;
  }
  return { outputTokens, processedTokens, model };
}

function redact(text) {
  let clean = text;
  for (const value of secretValues)
    clean = clean.split(value).join("[redacted]");
  for (const pattern of SECRET_PATTERNS)
    clean = clean.replace(pattern, "[redacted]");
  return clean;
}

// Hook payloads can carry whole files; the Studio only needs a redacted preview. A string is cut
// to twice the preview before it's masked, which bounds the work, and to the preview after, so a
// secret the first cut split stays out of what's sent.
function sanitize(value) {
  if (typeof value === "string")
    return redact(value.slice(0, 2 * MAX_STRING_LENGTH)).slice(
      0,
      MAX_STRING_LENGTH,
    );
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        typeof inner === "string" && SECRET_ENV.test(key)
          ? "[redacted]"
          : sanitize(inner),
      ]),
    );
  }
  return value;
}
