import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CREW, tempDir } from "./kit.mjs";

function file(path, content = "", mode = 0o644) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  chmodSync(path, mode);
}

/** A cloud image's /opt/pw-browsers, with Chromium and its headless shell at `build`. */
function image(build = "1194") {
  const dir = join(tempDir(), "pw-browsers");
  file(
    join(dir, `chromium_headless_shell-${build}/chrome-linux/headless_shell`),
    "",
    0o755,
  );
  file(join(dir, `chromium-${build}/chrome-linux/chrome`), "", 0o755);
  return dir;
}

function listing(dir) {
  return readdirSync(dir, { recursive: true }).sort();
}

// A stand-in for pnpm that logs its calls. The dry run answers as Playwright 1.64 does (it wants
// build 1248), and the download lands where it says; `fail` names calls that fail, as a proxy that
// blocks the download hosts makes downloads fail.
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
  "exec playwright install --only-shell chromium")
    mkdir -p "\${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}/chromium_headless_shell-1248" ;;
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
  const envFile = join(project, "env.sh");
  const fake = pnpm(fail);
  const result = spawnSync("bash", [join(CREW, "install.sh")], {
    encoding: "utf8",
    env: {
      HOME: home,
      PATH: `${fake.bin}:${process.env.PATH}`,
      CLAUDE_PROJECT_DIR: project,
      CLAUDE_ENV_FILE: envFile,
      THESEUS_BROWSERS_IMAGE: images ?? join(tempDir(), "none"),
      ...(remote && { CLAUDE_CODE_REMOTE: "true" }),
      ...env,
    },
  });
  // What a later command in the session sees: the session's environment, then the env file.
  const seen = existsSync(envFile)
    ? spawnSync(
        "bash",
        [
          "-c",
          `source "${envFile}"; echo "$PLAYWRIGHT_BROWSERS_PATH"; echo "$AGENT_BROWSER_EXECUTABLE_PATH"; echo "$PATH"`,
        ],
        { encoding: "utf8", env: { ...process.env, ...env } },
      ).stdout.split("\n")
    : [];
  return {
    code: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    calls: fake.calls(),
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

test("downloads the build CI runs into Playwright's own cache, never into the image", () => {
  const images = image("1194");
  const before = listing(images);
  const home = tempDir();
  // An image that points Playwright at itself, without the build this Playwright wants.
  const { code, browsers, chrome, stderr } = install({
    images,
    home,
    env: { PLAYWRIGHT_BROWSERS_PATH: images },
  });
  assert.equal(code, 0);
  assert.match(stderr, /Playwright downloaded the build CI runs/);
  assert.ok(
    existsSync(join(home, ".cache/ms-playwright/chromium_headless_shell-1248")),
  );
  // Later commands look where it landed, not at the image.
  assert.equal(browsers, "");
  assert.deepEqual(listing(images), before);
  assert.equal(chrome, join(images, "chromium-1194/chrome-linux/chrome"));
});

test("uses Playwright's own download of the wanted build when it's there", () => {
  const cache = tempDir();
  mkdirSync(join(cache, "chromium_headless_shell-1248"));
  const images = image("1194");
  const { code, browsers, calls, stderr } = install({
    images,
    env: { PLAYWRIGHT_BROWSERS_PATH: cache },
  });
  assert.equal(code, 0);
  assert.match(stderr, /Playwright uses its own download/);
  // Nothing overrides where Playwright already looks, and nothing is downloaded.
  assert.equal(browsers, cache);
  assert.ok(!calls.includes("exec playwright install --only-shell chromium"));
});

test("says which hosts to allow when the download is refused, and tries it once", () => {
  const download = "exec playwright install --only-shell chromium";
  const { code, calls, stderr, browsers } = install({
    images: image("1194"),
    fail: [download],
  });
  assert.equal(code, 0);
  assert.equal(calls.filter((call) => call === download).length, 1);
  assert.match(
    stderr,
    /Couldn't download Playwright's Chromium.*cdn\.playwright\.dev and playwright\.download\.prss\.microsoft\.com/,
  );
  assert.equal(browsers, "");
});

test("puts the project's own tools on PATH and points git at the repo's hooks", () => {
  const { code, path, hooks, project } = install({ repo: true });
  assert.equal(code, 0);
  assert.equal(path.split(":")[0], join(project, "node_modules/.bin"));
  assert.equal(hooks, ".githooks");
});

test("uses the image as it is when it has the build Playwright wants", () => {
  const images = image("1248");
  const { code, browsers, calls } = install({ images });
  assert.equal(code, 0);
  assert.equal(browsers, images);
  assert.ok(!calls.includes("exec playwright install --only-shell chromium"));
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
