import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { gitRepo, STUDIO, tempDir } from "./kit.mjs";

// The repository's own attributes, as a sprint branch carries them.
const ATTRIBUTES = readFileSync(join(STUDIO, "..", ".gitattributes"), "utf8");
const MEMORY = ".claude/agent-memory/code-reviewer/MEMORY.md";

/**
 * A fix round with two fresh Lens reviews, each in its own worktree on a different base, both
 * writing memory there, as the agent files say. Then Atlas brings their commits to the sprint
 * branch the way the sprint skill's close-out says, oldest first. Returns the branch's checkout,
 * the memory commits in order, and how each step went.
 */
function fixRound({ attributes }) {
  const { dir } = gitRepo({
    ...(attributes && { ".gitattributes": attributes }),
    [MEMORY]: "- Lens memory\n- an old lesson\n",
    "app/page.tsx": "v1",
  });
  const git = (cwd, ...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git(dir, "checkout", "--quiet", "-b", "sprint/2-cards");
  const remember = (base, line) => {
    const tree = join(tempDir(), "lens");
    git(dir, "worktree", "add", "--quiet", "--detach", tree, base);
    appendFileSync(join(tree, MEMORY), `${line}\n`);
    git(tree, "add", MEMORY);
    git(tree, "commit", "--quiet", "--message", "Lens memory");
    return git(tree, "rev-parse", "HEAD");
  };
  const first = remember(
    "HEAD",
    "- lens-1: check the dark block (.studio/sprint/2/review-lens.md)",
  );
  // The builder's fix lands on the branch, and its own memory commit with it.
  execFileSync("sh", ["-c", "echo v2 > app/page.tsx"], { cwd: dir });
  git(dir, "commit", "--quiet", "--all", "--message", "Fix round 1");
  const onBranch = remember("HEAD", "- lens: already on the branch");
  git(dir, "cherry-pick", onBranch);
  const pushed = git(dir, "rev-parse", "HEAD");
  const second = remember(
    "HEAD",
    "- lens-2: fresh review after the fix (.studio/sprint/2/review-lens-2.md)",
  );
  const steps = [];
  for (const sha of [pushed, first, second]) {
    // The skill: skip a commit already on the branch, otherwise cherry-pick it.
    const there = spawnSync(
      "git",
      ["merge-base", "--is-ancestor", sha, "HEAD"],
      { cwd: dir },
    );
    if (there.status === 0) {
      steps.push("skipped");
      continue;
    }
    const picked = spawnSync("git", ["cherry-pick", sha], {
      cwd: dir,
      encoding: "utf8",
    });
    steps.push(picked.status === 0 ? "picked" : "stopped");
    if (picked.status !== 0) break;
  }
  return { dir, steps, git };
}

test("a fix round's two Lens memory commits cherry-pick cleanly, keeping both reviews' lines", () => {
  const { dir, steps, git } = fixRound({ attributes: ATTRIBUTES });
  assert.deepEqual(steps, ["skipped", "picked", "picked"]);
  assert.equal(git(dir, "status", "--porcelain"), "");
  const memory = readFileSync(join(dir, MEMORY), "utf8");
  for (const line of [
    "lens-1: check the dark block",
    "lens-2: fresh review",
    "already on the branch",
    "an old lesson",
  ]) {
    assert.ok(memory.includes(line), line);
  }
});

test("without the union attribute the second cherry-pick stops on a conflict the lead can't resolve", () => {
  const { dir, steps } = fixRound({ attributes: null });
  // Every memory commit after the first one on the branch appends at the same place, so the next
  // pick already stops.
  assert.deepEqual(steps, ["skipped", "stopped"]);
  spawnSync("git", ["cherry-pick", "--abort"], { cwd: dir });
  rmSync(dir, { recursive: true, force: true });
});

test("a memory commit whose lines already arrived under another sha is skipped with --skip", () => {
  const { dir, git } = fixRound({ attributes: ATTRIBUTES });
  // Its change is on the branch already, so the cherry-pick stops as empty.
  const again = git(dir, "rev-parse", "HEAD~1");
  git(dir, "checkout", "--quiet", "-b", "replay", "HEAD");
  const picked = spawnSync("git", ["cherry-pick", again], {
    cwd: dir,
    encoding: "utf8",
  });
  assert.notEqual(picked.status, 0);
  assert.match(`${picked.stdout}${picked.stderr}`, /empty/);
  assert.equal(
    spawnSync("git", ["cherry-pick", "--skip"], { cwd: dir }).status,
    0,
  );
  assert.equal(git(dir, "status", "--porcelain"), "");
});
