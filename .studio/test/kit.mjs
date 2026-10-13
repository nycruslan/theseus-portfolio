// Shared test helpers: run a hook script the way Claude Code does, stand in for the Studio's
// ingest and for gh, and build throwaway git repositories.

import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STUDIO = dirname(dirname(fileURLToPath(import.meta.url)));

/** Runs a script in `.studio/` (or at an absolute path) with the hook payload on stdin, as Claude Code does. */
export function runHook(script, payload, { env = {}, cwd, args = [] } = {}) {
  const result = spawnSync(
    process.execPath,
    [resolve(STUDIO, script), ...args],
    {
      input: typeof payload === "string" ? payload : JSON.stringify(payload),
      cwd,
      encoding: "utf8",
      // Isolate the run from the developer's own Studio settings, and from the real gh: no test
      // may post to GitHub.
      env: {
        HOME: process.env.HOME,
        PATH: `${GH}:${process.env.PATH}`,
        TMPDIR: tempDir(),
        ...env,
      },
    },
  );
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** The hook's JSON answer on stdout, or null when it printed none. */
export function answer({ stdout }) {
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// A stand-in for gh, first on every hook's PATH. It answers from the environment: `gh pr view`
// prints GH_PR, the PR's files GH_FILES and its label history GH_LABELED (each already shaped by
// the caller's --jq). It fails with GH_FAIL when set, and logs each call's arguments to GH_LOG.
const GH = mkdtempSync(join(tmpdir(), "theseus-gh-"));
writeFileSync(
  join(GH, "gh"),
  `#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const args = process.argv.slice(2);
const env = process.env;
if (env.GH_LOG) appendFileSync(env.GH_LOG, JSON.stringify(args) + "\\n");
if (env.GH_FAIL) {
  process.stderr.write(env.GH_FAIL + "\\n");
  process.exit(1);
}
const path = args.find((arg) => arg.startsWith("repos/")) ?? "";
if (args[0] === "pr") process.stdout.write(env.GH_PR ?? "");
else if (path.endsWith("/events")) process.stdout.write(env.GH_LABELED ?? "");
else if (path.endsWith("/files")) process.stdout.write(env.GH_FILES ?? "");
`,
);
chmodSync(join(GH, "gh"), 0o755);

/** A log for the fake gh, and a reader for the calls it saw. */
export function ghLog() {
  const file = join(tempDir(), "gh.jsonl");
  return {
    file,
    calls: () =>
      existsSync(file)
        ? readFileSync(file, "utf8").trim().split("\n").map(JSON.parse)
        : [],
  };
}

export function tempDir() {
  return mkdtempSync(join(tmpdir(), "theseus-test-"));
}

/** A stand-in for the Studio's ingest that collects what the hooks post. */
export async function ingest() {
  const received = [];
  let notify = () => {};
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      received.push({
        headers: request.headers,
        raw: body,
        body: JSON.parse(body),
      });
      response.writeHead(204).end();
      notify();
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/api/ingest`,
    received,
    /** Resolves once `count` posts have arrived, or rejects after a few seconds. */
    until(count) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`got ${received.length} of ${count} posts`)),
          5000,
        );
        notify = () => {
          if (received.length < count) return;
          clearTimeout(timer);
          resolve(received);
        };
        notify();
      });
    },
    close: () => server.close(),
  };
}

/** A git repository with one commit per entry: each maps paths to contents. */
export function gitRepo(...commits) {
  const dir = tempDir();
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  const shas = commits.map((files, index) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    git("add", "--all");
    git("commit", "--quiet", "--message", `commit ${index}`);
    return git("rev-parse", "HEAD");
  });
  return { dir, shas };
}
