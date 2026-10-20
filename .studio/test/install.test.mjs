import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STUDIO, tempDir } from "./kit.mjs";

// Playwright's folder name for the headless shell on this machine's CPU, as install.sh picks it.
const PLATFORM = ["arm64", "aarch64"].includes(
  execFileSync("uname", ["-m"], { encoding: "utf8" }).trim(),
)
  ? "chrome-headless-shell-linux-arm64"
  : "chrome-headless-shell-linux64";

function file(path, content = "", mode = 0o644) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  chmodSync(path, mode);
}

/** A cloud image's /opt/pw-browsers, with the headless shell at `build`, in the old layout. */
function image(build = "1194") {
  const dir = join(tempDir(), "pw-browsers");
  file(
    join(dir, `chromium_headless_shell-${build}/chrome-linux/headless_shell`),
    "",
    0o755,
  );
  file(
    join(dir, `chromium_headless_shell-${build}/chrome-linux/resources.pak`),
  );
  file(join(dir, `chromium-${build}/chrome-linux/chrome`), "", 0o755);
  file(join(dir, "ffmpeg-1011/ffmpeg-linux"), "", 0o755);
  return dir;
}

function listing(dir) {
  return readdirSync(dir, { recursive: true }).sort();
}

// A stand-in for pnpm that logs its calls. The dry run answers as Playwright 1.64 does (it wants
// build 1248); `fail` names calls that fail, as the cloud's proxy makes downloads fail.
function pnpm(fail = []) {
  const bin = tempDir();
  const log = join(bin, "calls.log");
  file(
    join(bin, "pnpm"),
    `#!/bin/bash
echo "$*" >> "${log}"
case "$*" in
  "exec playwright install --dry-run --only-shell chromium")
    echo "Chrome Headless Shell 156.0.8078.4 (playwright chromium-headless-shell v1248)"
    echo "  Install location:    \${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}/chromium_headless_shell-1248"
    echo "  Download url:        https://cdn.playwright.dev/x.zip"
    exit 0 ;;
${fail.map((call) => `  "${call}") exit 1 ;;`).join("\n")}
esac
exit 0
`,
    0o755,
  );
  return {
    bin,
    calls: () =>
      existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [],
  };
}

function install({
  remote = true,
  images,
  fail,
  env = {},
  repo = false,
  home = tempDir(),
} = {}) {
  const project = tempDir();
  if (repo) execFileSync("git", ["init", "--quiet", project]);
  const shim = join(tempDir(), "shim");
  const envFile = join(project, "env.sh");
  const fake = pnpm(fail);
  const result = spawnSync("bash", [join(STUDIO, "install.sh")], {
    encoding: "utf8",
    env: {
      HOME: home,
      PATH: `${fake.bin}:${process.env.PATH}`,
      CLAUDE_PROJECT_DIR: project,
      CLAUDE_ENV_FILE: envFile,
      THESEUS_BROWSERS_IMAGE: images ?? join(tempDir(), "none"),
      THESEUS_BROWSERS_SHIM: shim,
      ...(remote && { CLAUDE_CODE_REMOTE: "true" }),
      ...env,
    },
  });
  // What a later command in the session sees.
  const seen = existsSync(envFile)
    ? spawnSync(
        "bash",
        [
          "-c",
          `source "${envFile}"; echo "$PLAYWRIGHT_BROWSERS_PATH"; echo "$AGENT_BROWSER_EXECUTABLE_PATH"; echo "$PATH"`,
        ],
        { encoding: "utf8" },
      ).stdout.split("\n")
    : [];
  return {
    code: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    calls: fake.calls(),
    shim,
    browsers: seen[0] ?? "",
    chrome: seen[1] ?? "",
    path: seen[2] ?? "",
    hooks: repo
      ? spawnSync("git", ["-C", project, "config", "core.hooksPath"], {
          encoding: "utf8",
        }).stdout.trim()
      : undefined,
    project,
  };
}

test("presents an older image Chromium under the build Playwright wants, without writing to the image", () => {
  const images = image("1194");
  const before = listing(images);
  const { code, browsers, chrome, shim, calls } = install({ images });
  assert.equal(code, 0);
  assert.equal(browsers, shim);
  const exe = join(shim, "chromium_headless_shell-1248", PLATFORM);
  assert.equal(
    realpathSync(join(exe, "chrome-headless-shell")),
    realpathSync(
      join(images, "chromium_headless_shell-1194/chrome-linux/headless_shell"),
    ),
  );
  assert.ok(existsSync(join(exe, "resources.pak")));
  assert.ok(existsSync(join(shim, "ffmpeg-1011/ffmpeg-linux")));
  assert.equal(chrome, join(images, "chromium-1194/chrome-linux/chrome"));
  assert.deepEqual(listing(images), before);
  // It tried for the exact build first; the fake proxy left no browser behind, so the shim stands.
  assert.ok(calls.includes("exec playwright install --only-shell chromium"));
  assert.ok(!calls.includes("exec agent-browser install"));
});

test("uses Playwright's own download of the wanted build when it's there", () => {
  const cache = tempDir();
  mkdirSync(join(cache, "chromium_headless_shell-1248"));
  const images = image("1194");
  const { code, browsers, shim, stderr } = install({
    images,
    env: { PLAYWRIGHT_BROWSERS_PATH: cache },
  });
  assert.equal(code, 0);
  assert.match(stderr, /Playwright uses its own download/);
  // Nothing overrides where Playwright already looks, and no shim is built.
  assert.equal(browsers, "");
  assert.equal(existsSync(shim), false);
});

test("doesn't take a resumed session's shim for Playwright's own download", () => {
  const images = image("1194");
  const shim = join(tempDir(), "shim");
  mkdirSync(join(shim, "chromium_headless_shell-1248"), { recursive: true });
  const { code, browsers, stderr } = install({
    images,
    env: { PLAYWRIGHT_BROWSERS_PATH: shim, THESEUS_BROWSERS_SHIM: shim },
  });
  assert.equal(code, 0);
  assert.doesNotMatch(stderr, /its own download/);
  assert.equal(browsers, shim);
});

test("a resumed session that finds the exact build stops pointing at its old shim", () => {
  const home = tempDir();
  mkdirSync(join(home, ".cache/ms-playwright/chromium_headless_shell-1248"), {
    recursive: true,
  });
  const shim = join(tempDir(), "shim");
  const { code, browsers, stderr } = install({
    images: image("1194"),
    home,
    env: { PLAYWRIGHT_BROWSERS_PATH: shim, THESEUS_BROWSERS_SHIM: shim },
  });
  assert.equal(code, 0);
  assert.match(stderr, /Playwright uses its own download/);
  // Later commands no longer see the shim the last start left them.
  assert.equal(browsers, "");
});

test("tries a refused download once, when the image has no headless shell to fall back on", () => {
  const images = join(tempDir(), "pw-browsers");
  file(join(images, "chromium-1194/chrome-linux/chrome"), "", 0o755);
  const download = "exec playwright install --only-shell chromium";
  const { code, calls, stderr } = install({ images, fail: [download] });
  assert.equal(code, 0);
  assert.equal(calls.filter((call) => call === download).length, 1);
  assert.match(stderr, /Couldn't download Playwright's Chromium/);
});

test("puts the project's own tools on PATH and points git at the repo's hooks", () => {
  const { code, path, hooks, project } = install({ repo: true });
  assert.equal(code, 0);
  assert.equal(path.split(":")[0], join(project, "node_modules/.bin"));
  assert.equal(hooks, ".githooks");
});

test("uses the image as it is when it has the build Playwright wants", () => {
  const images = image("1248");
  const { code, browsers, shim } = install({ images });
  assert.equal(code, 0);
  assert.equal(browsers, images);
  assert.equal(existsSync(shim), false);
});

test("a failed step doesn't stop the others, and the script still exits 0", () => {
  const { code, stderr, calls, browsers } = install({
    fail: [
      "install --frozen-lockfile --prefer-offline",
      "exec playwright install --only-shell chromium",
      "exec agent-browser install",
    ],
  });
  assert.equal(code, 0);
  assert.match(stderr, /pnpm install failed/);
  assert.match(stderr, /Couldn't download Playwright's Chromium/);
  assert.match(stderr, /Couldn't download agent-browser's Chrome/);
  assert.ok(calls.includes("exec playwright install --only-shell chromium"));
  assert.ok(calls.includes("exec agent-browser install"));
  assert.equal(browsers, "");
});

test("does nothing outside the cloud", () => {
  const { code, calls } = install({ remote: false, images: image() });
  assert.equal(code, 0);
  assert.deepEqual(calls, []);
});
