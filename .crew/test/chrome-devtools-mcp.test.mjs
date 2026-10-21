import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CREW, tempDir } from "./kit.mjs";

// A stand-in npx that prints the arguments the wrapper would start Chrome DevTools MCP with.
function bin() {
  const dir = tempDir();
  const npx = join(dir, "npx");
  writeFileSync(npx, '#!/bin/sh\nprintf "%s\\n" "$@"\n');
  chmodSync(npx, 0o755);
  return dir;
}

function start(env) {
  const run = spawnSync("bash", [join(CREW, "chrome-devtools-mcp.sh")], {
    encoding: "utf8",
    env: { PATH: `${bin()}:${process.env.PATH}`, ...env },
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout.trim().split("\n");
}

test("starts the pinned server headless, in a throwaway profile, sending nothing to Google", () => {
  const args = start({});
  assert.deepEqual(args.slice(0, 2), ["-y", "chrome-devtools-mcp@1.11.0"]);
  for (const flag of [
    "--headless",
    "--isolated",
    "--no-usage-statistics",
    "--performanceCrux=false",
  ]) {
    assert.ok(args.includes(flag), flag);
  }
  // Locally it drives the installed Chrome.
  assert.ok(!args.includes("--executablePath"));
});

test("drives the image's newest Chromium in a cloud session", () => {
  const image = tempDir();
  for (const build of ["1180", "1194"]) {
    const dir = join(image, `chromium-${build}/chrome-linux`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "chrome"), "");
  }
  const args = start({
    CLAUDE_CODE_REMOTE: "true",
    THESEUS_BROWSERS_IMAGE: image,
  });
  const path = args[args.indexOf("--executablePath") + 1];
  assert.equal(path, join(image, "chromium-1194/chrome-linux/chrome"));
});
