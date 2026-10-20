import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { STUDIO, tempDir } from "./kit.mjs";

const HOOK = join(STUDIO, "..", ".githooks", "pre-commit");

/** A repository with two committed files and a stand-in Biome that "formats" by upper-casing. */
function repo() {
  const dir = tempDir();
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  writeFileSync(join(dir, "whole.json"), "a\n");
  writeFileSync(join(dir, "partly.json"), "b\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "start");
  mkdirSync(join(dir, "node_modules/.bin"), { recursive: true });
  const biome = join(dir, "node_modules/.bin/biome");
  writeFileSync(
    biome,
    `#!/bin/sh
for arg in "$@"; do
  case "$arg" in -*|format) ;; *) tr a-z A-Z < "$arg" > "$arg.tmp" && mv "$arg.tmp" "$arg" ;; esac
done
`,
  );
  chmodSync(biome, 0o755);
  return { dir, git };
}

test("formats and re-stages files staged whole, and leaves a partly staged one as it was", () => {
  const { dir, git } = repo();
  writeFileSync(join(dir, "whole.json"), "whole\n");
  writeFileSync(join(dir, "partly.json"), "staged\n");
  git("add", "whole.json", "partly.json");
  writeFileSync(join(dir, "partly.json"), "staged\nnot staged\n");
  const run = spawnSync("sh", [HOOK], { cwd: dir, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(git("show", ":whole.json"), "WHOLE");
  // The partly staged file is committed as staged, and its unstaged hunk stays out.
  assert.equal(git("show", ":partly.json"), "staged");
  assert.equal(
    readFileSync(join(dir, "partly.json"), "utf8"),
    "staged\nnot staged\n",
  );
});

test("lets the commit through, saying so, when Biome isn't installed", () => {
  const { dir, git } = repo();
  execFileSync("rm", ["-rf", join(dir, "node_modules")]);
  writeFileSync(join(dir, "whole.json"), "whole\n");
  git("add", "whole.json");
  const run = spawnSync("sh", [HOOK], { cwd: dir, encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.match(run.stderr, /Biome isn't installed/);
  assert.equal(git("show", ":whole.json"), "whole");
});
