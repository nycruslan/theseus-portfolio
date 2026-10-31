import assert from "node:assert/strict";
import { test } from "node:test";
import { ghLog, gitRepo, REPO, routes, runHook, tempDir } from "./kit.mjs";

const { dir: repo } = gitRepo({ "app/page.tsx": "page" });
const R = `repos/${REPO}`;
const branches = (...names) => names.map((name) => ({ name }));

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
      "iris/34",
      "merge/31",
      "quill/30",
      "pixel/25",
      // Later sprints, other names, and shapes a role's never takes.
      "forge/37",
      "crew/leftovers",
      "fix/36",
      "forge/36-hotfix",
      "forge/x36",
      "archive/forge/36",
    ),
  });
  assert.equal(code, 0);
  assert.deepEqual(deleted.toSorted(), [
    "forge/36",
    "iris/34",
    "merge/31",
    "pixel/25",
    "probe/36-r2",
    "quill/30",
  ]);
  assert.match(stdout, /6 role branches up to sprint 36 pruned/);
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

test("refuses anything but a sprint's branch", () => {
  for (const arg of ["crew/leftovers", "main", "sprints/36"]) {
    const { code, deleted } = prune(arg, {
      [`${R}/branches`]: branches("forge/36"),
    });
    assert.equal(code, 2, arg);
    assert.deepEqual(deleted, [], arg);
  }
});
