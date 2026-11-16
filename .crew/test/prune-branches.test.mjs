import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;
const branches = (...names) =>
  names.map((name) => ({ name, commit: { sha: `tip-of-${name}` } }));

function prune(arg, table) {
  const log = ghLog();
  const result = runHook("prune-branches.mjs", "", {
    cwd: repo,
    args: [arg],
    env: {
      GH_ROUTES: routes({ [`DELETE ${R}/git/refs/heads/*/*`]: "", ...table }),
      GH_LOG: log.file,
      GH_STATE: tempDir(),
    },
  });
  const deleted = log
    .calls()
    .filter((call) => call.includes("DELETE"))
    .map((call) => call.find((part) => part.includes("/git/refs/heads/")))
    .map((path) => path.split("/git/refs/heads/")[1]);
  return { ...result, deleted };
}

test("deletes the merged sprint's role branches and earlier ones', and nothing else", () => {
  const { code, deleted, stdout } = prune("sprint/36-the-hull", {
    [`${R}/branches`]: branches(
      "main",
      "sprint/36-the-hull",
      "forge/36",
      "probe/36-r2",
      // Suffixes roles push (pixel/64-fix, probe/72-t33), and a role under the sprint's prefix.
      "pixel/36-fix",
      "probe/36-t33",
      "sprint/36-forge",
      "iris/34",
      "merge/31",
      "quill/30",
      "pixel/25",
      // Later sprints, other names, and shapes a role's never takes.
      "forge/37",
      "sprint/37-probe",
      "crew/leftovers",
      "fix/36",
      "forge/x36",
      "archive/forge/36",
      "sprint/36-forger",
    ),
  });
  assert.equal(code, 0);
  assert.deepEqual(deleted.toSorted(), [
    "forge/36",
    "iris/34",
    "merge/31",
    "pixel/25",
    "pixel/36-fix",
    "probe/36-r2",
    "probe/36-t33",
    "quill/30",
    "sprint/36-forge",
  ]);
  assert.match(stdout, /9 role branches up to sprint 36 pruned/);
  // Each tip is logged, so a deleted branch can be restored.
  assert.match(stdout, /Deleted forge\/36, at tip-of-forge\/36\./);
});

test("leaves the role branches of an earlier sprint that is still open", () => {
  const { deleted } = prune("sprint/33-ghost", {
    [`${R}/branches`]: branches(
      "sprint/31-crew",
      "sprint/33-ghost",
      "forge/31",
      "probe/31-r2",
      "forge/33",
      "forge/32",
    ),
  });
  assert.deepEqual(deleted.toSorted(), ["forge/32", "forge/33"]);
});

test("a role's branch under a sprint's prefix doesn't hold that sprint open", () => {
  // sprint/66-forge and sprint/66-probe once kept every branch of sprint 66 forever.
  const { deleted } = prune("sprint/68-bar-wraps", {
    [`${R}/branches`]: branches(
      "sprint/66-forge",
      "sprint/66-probe",
      "pixel/64-fix",
      "probe/64-fix2",
      "forge/66",
    ),
  });
  assert.deepEqual(deleted.toSorted(), [
    "forge/66",
    "pixel/64-fix",
    "probe/64-fix2",
    "sprint/66-forge",
    "sprint/66-probe",
  ]);
});

test("takes a branch already gone as done, and reports any other failure", () => {
  const listing = { [`${R}/branches`]: branches("forge/36") };
  const gone = prune("sprint/36-x", {
    ...listing,
    [`DELETE ${R}/git/refs/heads/*/*`]: {
      $error: 422,
      message: "Reference does not exist",
    },
  });
  assert.equal(gone.code, 0);
  const denied = prune("sprint/36-x", {
    ...listing,
    [`DELETE ${R}/git/refs/heads/*/*`]: { $error: 403, message: "Forbidden" },
  });
  assert.equal(denied.code, 1);
  assert.match(denied.stderr, /Couldn't prune: Forbidden/);
});

test("refuses anything but a sprint's branch, and has nothing to do for an unnumbered one", () => {
  const listing = { [`${R}/branches`]: branches("forge/36") };
  for (const arg of ["crew/leftovers", "main", "sprints/36"]) {
    const { code, deleted } = prune(arg, listing);
    assert.equal(code, 2, arg);
    assert.deepEqual(deleted, [], arg);
  }
  const { code, deleted, stdout } = prune("sprint/b6-foo", listing);
  assert.equal(code, 0);
  assert.deepEqual(deleted, []);
  assert.match(stdout, /nothing to prune/);
});
