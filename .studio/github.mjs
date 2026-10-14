// GitHub through REST alone, for the harness's own scripts (merge.mjs, next-sprint.mjs, and gate.mjs
// and lens.mjs in CI). Cloud sessions reach GitHub through a proxy that refuses GraphQL whatever the
// credentials, so `gh pr …`, `gh issue …` and auto-merge fail there, while
// `gh api repos/<owner>/<repo>/…` works (https://code.claude.com/docs/en/cloud-environments#github-proxy).
// The repository comes from the origin remote's last two path segments: in the cloud the remote
// is a proxy URL that gh can't map to github.com, so gh's {owner}/{repo} placeholders don't
// resolve there.

import { execFileSync } from "node:child_process";

// How long one gh call may take. Each script sets its own, inside its hook's or the Bash tool's
// time limit (see configure).
let timeoutMs = 30_000;

/** Sets how long each gh call may take, in milliseconds. */
export function configure({ timeout }) {
  if (timeout) timeoutMs = timeout;
}

/** owner/repo from a remote URL: https, ssh, scp-like (git@host:o/r) or the cloud's git proxy. */
export function repoFromRemote(url) {
  const match = String(url ?? "")
    .trim()
    .match(/([^/:]+)\/([^/:]+?)(?:\.git)?\/*$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

/** The checkout's owner/repo, from `git remote get-url origin`; null when it has no origin. */
export function repoOf(cwd) {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return repoFromRemote(url);
  } catch {
    return null;
  }
}

/** The top of the checkout `cwd` is in, so pathspecs and relative paths mean the same anywhere. */
export function toplevel(cwd) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/**
 * One REST call, parsed. A failure throws with GitHub's own message and the HTTP status, which
 * gh prints as the response body on stdout and as "gh: … (HTTP 405)" on stderr.
 * @param fields sent with -f, so every value goes as a string.
 */
export function api(path, { method = "GET", fields = {}, cwd } = {}) {
  const args = ["api", "--method", method, path];
  for (const [key, value] of Object.entries(fields)) {
    args.push("-f", `${key}=${value}`);
  }
  return parse(gh(args, cwd));
}

/** Every item of a paginated list: the response itself, or its `key` array (check_runs…). */
export function list(path, { key, cwd } = {}) {
  const jq = `.${key ?? ""}[] | @json`;
  const out = gh(["api", "--paginate", path, "--jq", jq], cwd);
  return out.split("\n").filter(Boolean).map(JSON.parse);
}

function gh(args, cwd) {
  try {
    return execFileSync("gh", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw failure(error);
  }
}

function failure(error) {
  const stderr = String(error.stderr ?? "").trim();
  let body = {};
  try {
    body = JSON.parse(String(error.stdout ?? "")) ?? {};
  } catch {
    // No JSON body: gh failed before GitHub answered.
  }
  const status = Number(body.status ?? stderr.match(/\(HTTP (\d+)\)/)?.[1]);
  const message = body.message ?? stderr.replace(/^gh: /, "") ?? error.message;
  const wrapped = new Error(message || error.message);
  if (status) wrapped.status = status;
  return wrapped;
}

function parse(out) {
  return out.trim() ? JSON.parse(out) : null;
}
