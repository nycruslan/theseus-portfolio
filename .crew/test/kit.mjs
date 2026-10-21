// Shared test helpers: run a hook script the way Claude Code does, stand in for the Studio's
// ingest and for gh's REST calls, and build throwaway git repositories.

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

export const CREW = dirname(dirname(fileURLToPath(import.meta.url)));

/** Runs a script in `.crew/` (or at an absolute path) with the hook payload on stdin, as Claude Code does. */
export function runHook(script, payload, { env = {}, cwd, args = [] } = {}) {
  const result = spawnSync(process.execPath, [resolve(CREW, script), ...args], {
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
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** The hook's JSON answer on stdout, or null when it printed none. */
export function answer({ stdout }) {
  return stdout.trim() ? JSON.parse(stdout) : null;
}

// fake-gh.cjs stands in for gh, first on every hook's PATH: no test may reach GitHub. It answers
// `gh api` from GH_ROUTES (see that file).
const GH = mkdtempSync(join(tmpdir(), "theseus-gh-"));
writeFileSync(
  join(GH, "gh"),
  `#!/bin/sh\nexec "${process.execPath}" "${join(dirname(fileURLToPath(import.meta.url)), "fake-gh.cjs")}" "$@"\n`,
);
chmodSync(join(GH, "gh"), 0o755);

/** GH_ROUTES for the fake gh, from an object of routes. */
export function routes(table) {
  return JSON.stringify(table);
}

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

/** The repository test checkouts claim as their origin, and the URL they claim it from. */
export const REPO = "nycruslan/theseus-portfolio";
export const ORIGIN = `https://github.com/${REPO}.git`;

/** A git repository with one commit per entry: each maps paths to contents. Its origin is ORIGIN. */
export function gitRepo(...commits) {
  const dir = tempDir();
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  git("init", "--quiet", "--initial-branch", "main");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  git("remote", "add", "origin", ORIGIN);
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
