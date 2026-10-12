// Shared test helpers: run a hook script the way Claude Code does, stand in for the Studio's
// ingest, and build throwaway git repositories.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = dirname(dirname(fileURLToPath(import.meta.url)));

/** Runs `.studio/<script>` with the hook payload on stdin, as Claude Code does. */
export function runHook(script, payload, { env = {}, cwd, args = [] } = {}) {
  const result = spawnSync(process.execPath, [join(STUDIO, script), ...args], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    cwd,
    encoding: "utf8",
    // Isolate the run from the developer's own Studio settings.
    env: {
      HOME: process.env.HOME,
      PATH: process.env.PATH,
      TMPDIR: tempDir(),
      ...env,
    },
  });
  return { code: result.status, stderr: result.stderr };
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
