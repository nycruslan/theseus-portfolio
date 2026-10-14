// The sprint pre-flight: `node .studio/next-sprint.mjs`, run by Atlas before sizing anything (see
// the sprint skill). It prints, as JSON, what's already in flight on GitHub and the next sprint's
// number, so a run continues an open sprint instead of starting a duplicate one. Two cloud runs on
// 2026-10-13 showed why: a sprint's folder only reaches main when its PR merges, so a run that
// looked at main alone started sprint 1 again while sprint 1's PR was open.
// - open: the open PRs whose branch is a sprint's (sprint/<n>-<slug>), oldest first, each with
//   whether it waits for the owner: as the gate holds it, it carries needs-owner now or ever did,
//   and the owner hasn't released it with owner-approved.
// - highest: the highest sprint number among the folders under .studio/sprint/ on main, the names
//   of the open sprint PRs' branches, and the names of the remote sprint branches (the number in
//   sprint/<n>-…). next is one past the highest of them.
// - action: continue the oldest open sprint PR that doesn't wait for the owner, stand down when
//   every open one does, or start the next sprint, with its branch name.
// It reads GitHub through REST alone (github.mjs), so it works the same in a cloud session. It
// fails closed: when GitHub can't be read it exits 1, since a sprint started blind may duplicate one.

import { carriedNeedsOwner } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";
import { APPROVAL_LABEL } from "./scope.mjs";

const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const SPRINT_BRANCH = /^sprint[/-](\d+)(?:-|$)/;
const FOLDER = /^\d+$/;
configure({ timeout: 20_000 });

let repo;
try {
  repo = repoOf(toplevel(process.cwd()));
  if (!repo) throw new Error("this checkout has no GitHub origin remote");
  console.log(JSON.stringify(preflight(repo), null, 2));
} catch (error) {
  console.error(
    `The pre-flight couldn't read GitHub (${String(error.message).trim()}). Don't start a sprint blind: report it and stop.`,
  );
  process.exitCode = 1;
}

function preflight(repo) {
  const base = api(`repos/${repo}`).default_branch ?? "main";
  // The repository is public, so anyone can open a PR from a fork with a branch named sprint/<n>.
  // Only the team's own PRs count: a branch in this repository, opened by the owner, a member or a
  // collaborator. GitHub treats repository names as case-insensitive, so they're compared that way.
  // Otherwise a stranger's PR could have Atlas check out its code, stand down, or skip numbers.
  // The title is free text a visitor can write, so it stays out of what Atlas is told.
  const open = list(`repos/${repo}/pulls?state=open&per_page=100`)
    .filter(
      ({ head, author_association: association }) =>
        head?.repo?.full_name?.toLowerCase() === repo.toLowerCase() &&
        TRUSTED.has(association) &&
        SPRINT_BRANCH.test(head?.ref ?? ""),
    )
    .sort((a, b) => a.number - b.number)
    .map((pr) => {
      const labels = pr.labels.map(({ name }) => name);
      return {
        number: pr.number,
        branch: pr.head.ref,
        head: pr.head.sha,
        needsOwner:
          !labels.includes(APPROVAL_LABEL) &&
          carriedNeedsOwner({ repo, number: pr.number, labels }),
        url: pr.html_url,
      };
    });
  const highest = {
    main: highestOf(sprintFolders(repo, base)),
    prs: highestOf(open.map(({ branch }) => sprintOf(branch))),
    branches: highestOf(
      list(`repos/${repo}/branches?per_page=100`).map(({ name }) =>
        sprintOf(name),
      ),
    ),
  };
  const next = Math.max(...Object.values(highest)) + 1;
  return { repo, base, open, highest, next, action: action(open, next) };
}

// The sprint folders on the base branch; none yet when .studio/sprint/ isn't there.
function sprintFolders(repo, base) {
  try {
    return list(`repos/${repo}/contents/.studio/sprint?ref=${base}`)
      .filter(({ type, name }) => type === "dir" && FOLDER.test(name))
      .map(({ name }) => Number(name));
  } catch (error) {
    if (error.status === 404) return [];
    throw error;
  }
}

// One open sprint PR at a time is worked on: the oldest one that doesn't wait for the owner.
function action(open, next) {
  if (!open.length) {
    return {
      do: "start",
      sprint: next,
      say: `No sprint is open. Start sprint ${next} on a branch named sprint/${next}-<slug>.`,
    };
  }
  const current = open.find(({ needsOwner }) => !needsOwner);
  const others = (shown) => {
    const rest = open.filter((one) => one !== shown);
    return rest.length
      ? ` (also open: ${rest.map(({ number }) => `#${number}`).join(", ")})`
      : "";
  };
  if (!current) {
    const [first] = open;
    return {
      do: "stand down",
      pr: first.number,
      say: `PR #${first.number} (${first.branch}) waits for the owner (needs-owner)${others(first)}. Don't start a new sprint: stand down with a short report.`,
    };
  }
  return {
    do: "continue",
    pr: current.number,
    say: `PR #${current.number} (${current.branch}) is open${others(current)}. Continue it rather than starting a new sprint: run what's missing, then node .studio/merge.mjs ${current.number}.`,
  };
}

function sprintOf(name) {
  const found = String(name ?? "").match(SPRINT_BRANCH);
  return found ? Number(found[1]) : 0;
}

function highestOf(numbers) {
  return Math.max(0, ...numbers);
}
