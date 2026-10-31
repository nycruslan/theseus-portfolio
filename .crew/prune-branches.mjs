// `node .crew/prune-branches.mjs <merged branch>`: deletes the role branches a merged sprint leaves
// on GitHub (`forge/36`, `probe/36-r2`), which roles push from their worktrees and Atlas brings
// over. GitHub deletes only a PR's own branch on merge, so these pile up. Run by
// .github/workflows/prune-branches.yml whoever merged the PR, since the owner's merges don't go
// through merge.mjs.
// It deletes the merged sprint's and earlier ones', and leaves any sprint whose own branch is still
// on GitHub: that one is open, and may yet need its roles'. Only those exact names are touched.
// Each tip goes in the run's log, so a branch that turns out to hold something can be restored.

import { api, list, repoOf, toplevel } from "./github.mjs";

const ROLE = /^(?:forge|pixel|probe|iris|quill|merge)\/(\d+)(?:-r\d+)?$/u;
const SPRINT = /^sprint\/(\d+)(?:[-/]|$)/u;

const branch = process.argv[2];
if (!branch?.startsWith("sprint/") || process.argv.length !== 3) {
  console.error(
    "Usage: node .crew/prune-branches.mjs <merged branch>, as in sprint/36-the-hull.",
  );
  process.exit(2);
}
const merged = branch.match(SPRINT);
if (!merged) {
  console.log(`${branch} names no sprint number: nothing to prune.`);
  process.exit(0);
}
const sprint = Number(merged[1]);
const cwd = toplevel(process.cwd());
const repo = repoOf(cwd);

try {
  const branches = list(`repos/${repo}/branches?per_page=100`, { cwd });
  // GitHub may not have deleted the merged branch yet, so it never counts as open.
  const open = new Set(
    branches
      .map(({ name }) => name.match(SPRINT))
      .filter(Boolean)
      .map((match) => Number(match[1]))
      .filter((number) => number !== sprint),
  );
  const stale = branches.filter(({ name }) => {
    const role = name.match(ROLE);
    if (!role) return false;
    const number = Number(role[1]);
    return number <= sprint && !open.has(number);
  });
  for (const { name, commit } of stale) {
    try {
      api(`repos/${repo}/git/refs/heads/${name}`, { method: "DELETE", cwd });
      console.log(`Deleted ${name}, at ${commit.sha}.`);
    } catch (error) {
      // Gone already, as when two merges land together: what this run wanted.
      if (error.status !== 404 && error.status !== 422) throw error;
    }
  }
  console.log(`${stale.length} role branches up to sprint ${sprint} pruned.`);
} catch (error) {
  console.error(`Couldn't prune: ${String(error.message).trim()}`);
  process.exitCode = 1;
}
