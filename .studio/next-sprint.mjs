// The sprint pre-flight: `node .studio/next-sprint.mjs`, run by Atlas before sizing anything (see
// the sprint skill). It prints, as JSON, what's already in flight on GitHub and the next sprint's
// number, so a run continues an open sprint instead of starting a duplicate one. Two cloud runs on
// 2026-10-13 showed why: a sprint's folder only reaches main when its PR merges, so a run that
// looked at main alone started sprint 1 again while sprint 1's PR was open.
// - open: the open PRs whose branch is a sprint's (sprint/<n>-<slug>), oldest first, each with
//   whether it waits for the owner: as the gate holds it, it carries needs-owner now or ever did,
//   and the owner hasn't approved its head.
// - highest: the highest sprint number among the folders under .studio/sprint/ on main, the names
//   of the open sprint PRs' branches, and the names of the remote sprint branches (the number in
//   sprint/<n>-…). next is one past the highest of them.
// - daily: the team's sprint PRs merged into the base in the last 24 hours, and the cap on them,
//   THESEUS_DAILY_SPRINTS (a positive integer; anything else means the default, 6). A merged
//   sprint starts the next one (the routine's GitHub trigger), so the cap is what stops a chain.
// - action: continue the oldest open sprint PR that doesn't wait for the owner, stand down when
//   every open one does or when the day's cap is reached, or start the next sprint, with its
//   branch name. An open sprint PR is continued even at the cap: finishing work isn't starting it.
// It reads GitHub through REST alone (github.mjs), so it works the same in a cloud session. It
// fails closed: when GitHub can't be read it exits 1, since a sprint started blind may duplicate one.
// First it checks who GitHub thinks is calling. The team works as its own account, named in
// THESEUS_BOT; a session that reaches GitHub as anyone else (the owner, through the cloud proxy)
// must not run a sprint, so it stops there.

import { approvedByOwner, carriedNeedsOwner } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";

const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const SPRINT_BRANCH = /^sprint[/-](\d+)(?:-|$)/;
const FOLDER = /^\d+$/;
const DAY = 24 * 60 * 60 * 1000;
const DAILY_DEFAULT = 6;
configure({ timeout: 20_000 });

let repo;
try {
  const bot = process.env.THESEUS_BOT;
  const login = api("user").login;
  if (!bot || login.toLowerCase() !== bot.toLowerCase()) {
    console.error(
      `GitHub calls here act as ${login}, not the team's account (THESEUS_BOT=${bot ?? "unset"}). Don't start a sprint: report that the environment needs the team's GH_TOKEN and THESEUS_BOT, and stop.`,
    );
    process.exit(1);
  }
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
  const { default_branch: base = "main", owner } = api(`repos/${repo}`);
  // The repository is public, so anyone can open a PR from a fork with a branch named sprint/<n>.
  // Only the team's own PRs count: a branch in this repository, opened by the owner, a member or a
  // collaborator. GitHub treats repository names as case-insensitive, so they're compared that way.
  // Otherwise a stranger's PR could have Atlas check out its code, stand down, or skip numbers.
  // The title is free text a visitor can write, so it stays out of what Atlas is told.
  const open = list(`repos/${repo}/pulls?state=open&per_page=100`)
    .filter(ours(repo))
    .sort((a, b) => a.number - b.number)
    .map((pr) => {
      const labels = pr.labels.map(({ name }) => name);
      return {
        number: pr.number,
        branch: pr.head.ref,
        head: pr.head.sha,
        needsOwner:
          carriedNeedsOwner({ repo, number: pr.number, labels }) &&
          !approvedByOwner({
            repo,
            number: pr.number,
            owner: owner.login,
            head: pr.head.sha,
          }),
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
  const daily = mergedToday(repo, base);
  return {
    repo,
    base,
    open,
    highest,
    next,
    daily: { merged: daily.merged, cap: daily.cap },
    action: action(open, next, daily),
  };
}

// The team's own sprint PRs, as GitHub lists them.
function ours(repo) {
  return ({ head, author_association: association }) =>
    head?.repo?.full_name?.toLowerCase() === repo.toLowerCase() &&
    TRUSTED.has(association) &&
    SPRINT_BRANCH.test(head?.ref ?? "");
}

// The team's sprint PRs merged into the base in the last 24 hours. One page of the closed PRs, most
// recently updated first: a merge updates a PR, so every one merged today is among them unless more
// than 100 closed PRs changed since, far past any cap.
function mergedToday(repo, base) {
  const since = Date.now() - DAY;
  const times = api(
    `repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
  )
    .filter(ours(repo))
    .filter((pr) => pr.base?.ref === base && pr.merged_at)
    .map((pr) => Date.parse(pr.merged_at))
    .filter((time) => time > since)
    .sort((a, b) => a - b);
  const cap = dailyCap(process.env.THESEUS_DAILY_SPRINTS);
  // At the cap, a new sprint may start once enough of today's merges are a day old.
  const reopens =
    times.length >= cap
      ? new Date(times[times.length - cap] + DAY).toISOString()
      : null;
  return { merged: times.length, cap, reopens };
}

function dailyCap(value) {
  const text = String(value ?? "").trim();
  return /^[1-9]\d*$/.test(text) ? Number(text) : DAILY_DEFAULT;
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
function action(open, next, daily) {
  if (!open.length && daily.merged >= daily.cap) {
    const sprints = daily.merged === 1 ? "sprint" : "sprints";
    return {
      do: "stand down",
      say: `${daily.merged} ${sprints} merged in the last 24 hours, the daily cap (${daily.cap}); the next run picks up after ${daily.reopens}. Don't start a new sprint: stand down with a short report.`,
    };
  }
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
