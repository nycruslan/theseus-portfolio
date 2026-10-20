// The sprint pre-flight: `node .studio/next-sprint.mjs`, run by Atlas before sizing anything (see
// the sprint skill). It prints, as JSON, what's already in flight on GitHub and the next sprint's
// number, so a run continues an open sprint instead of starting a duplicate one. Two cloud runs on
// 2026-10-13 showed why: a sprint's folder only reaches main when its PR merges, so a run that
// looked at main alone started sprint 1 again while sprint 1's PR was open.
// - actingAs: who GitHub thinks is calling. In a cloud session that is always the owner: the
//   cloud's GitHub proxy swaps any token a request carries, the team's own included, for the
//   owner's connection (tested 2026-10-17). So the rules hold through gate, Lens, merge.mjs and
//   the guard, not through a separate account.
// - open: the open PRs whose branch is a sprint's (sprint/<n>-<slug>), oldest first, each with
//   whether it waits for the owner: it carries needs-owner now or ever did. It waits until the
//   owner merges or closes it, approved or not, since merge.mjs leaves a PR the owner's approval
//   released to the owner.
// - highest: the highest sprint number among the folders under .studio/sprint/ on main, the names
//   of the open sprint PRs' branches, and the names of the remote sprint branches (the number in
//   sprint/<n>-…). next is one past the highest of them.
// - daily: the team's sprint PRs merged into the base in the last 24 hours, and the cap on them,
//   THESEUS_DAILY_SPRINTS (a positive integer; anything else means the default, 6). A merged
//   sprint starts the next one (the routine's GitHub trigger), so the cap is what stops a chain.
// - unopened: the sprint branches no PR was opened from yet whose last commit is from the last 45
//   minutes. A run pushes its branch before it opens the PR, sometimes an hour before: on
//   2026-10-17 the heartbeat saw no PR for sprint 8's fresh branch and started sprint 9 on the
//   same work. A branch whose head a closed PR ended on is that PR's, merged or not, so the run
//   its own merge starts isn't held up by it. Freshness is the commit's time, not the push's: a
//   run pushes as it commits, but one that held commits back for 45 minutes would look quiet.
// - remind: the PRs waiting for the owner a day past their last commit and the team's last comment
//   on them. The run that reminds the owner comments on each, which restarts its day, so the owner
//   hears once a day while it waits. The owner was told about #35 once and it waited two days.
// - action: continue the oldest open sprint PR that doesn't wait for the owner, stand down when
//   the day's cap is reached, or start the next sprint, with its branch name. While one PR waits
//   for the owner the team keeps working, on something that doesn't build on it, as a team does
//   while a review is pending (it stood idle for two days behind #35); a second waiting PR stops
//   new work. An open sprint PR is continued even at the cap: finishing work isn't starting it.
// - update: the PRs waiting for the owner that conflict with the base, as other sprints' close-outs
//   edit the same notes, and that no run is on (quiet for 45 minutes). The run brings each up to
//   date beside its action; one it can't (product code conflicts) it flags in a comment ending
//   `theseus:conflict <head>`, and that head isn't listed again. Both lists read only the team's
//   and the owner's comments (ownerQueue).
//   One that changed in the last 45 minutes is left alone, since another run is most likely still
//   on it: the 3-hourly heartbeat lands mid-sprint, and two runs on one branch collide. So is
//   everything while an unopened sprint branch is that fresh.
// It reads GitHub through REST alone (github.mjs), so it works the same in a cloud session. It
// fails closed: when GitHub can't be read it exits 1, since a sprint started blind may duplicate one.

import { carriedNeedsOwner } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";

const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
// The checks app opens the team's PRs (.github/workflows/open-pr.yml). GitHub calls it no
// association at all, and a bot's login, with its [bot], is one no person can take.
const CHECKS_APP = "theseus-checks[bot]";
const SPRINT_BRANCH = /^sprint[/-](\d+)(?:-|$)/;
const FOLDER = /^\d+$/;
const DAY = 24 * 60 * 60 * 1000;
const DAILY_DEFAULT = 6;
const ACTIVE_MS = 45 * 60 * 1000;
const WAITING_CAP = 1;
configure({ timeout: 20_000 });

let repo;
try {
  const actingAs = api("user").login;
  repo = repoOf(toplevel(process.cwd()));
  if (!repo) throw new Error("this checkout has no GitHub origin remote");
  console.log(JSON.stringify({ actingAs, ...preflight(repo) }, null, 2));
} catch (error) {
  console.error(
    `The pre-flight couldn't read GitHub (${String(error.message).trim()}). Don't start a sprint blind: report it and stop.`,
  );
  process.exitCode = 1;
}

function preflight(repo) {
  const { default_branch: base = "main" } = api(`repos/${repo}`);
  // The repository is public, so anyone can open a PR from a fork with a branch named sprint/<n>.
  // Only the team's own PRs count: a branch in this repository, opened by the owner, a member, a
  // collaborator or the team's checks app (open-pr.mjs). GitHub treats repository names as
  // case-insensitive, so they're compared that way.
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
        updatedAt: pr.updated_at,
        needsOwner: carriedNeedsOwner({ repo, number: pr.number, labels }),
        url: pr.html_url,
      };
    });
  const branches = list(`repos/${repo}/branches?per_page=100`);
  const highest = {
    main: highestOf(sprintFolders(repo, base)),
    prs: highestOf(open.map(({ branch }) => sprintOf(branch))),
    branches: highestOf(branches.map(({ name }) => sprintOf(name))),
  };
  const next = Math.max(...Object.values(highest)) + 1;
  // One page of the team's closed sprint PRs, most recently updated first: what merged today, and
  // the heads the branches of recently closed ones are still on.
  const closed = api(
    `repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
  ).filter(ours(repo));
  const unopened = freshBranches(repo, branches, open, closed);
  const daily = mergedToday(closed, base);
  return {
    repo,
    base,
    open,
    unopened,
    highest,
    next,
    daily: { merged: daily.merged, cap: daily.cap },
    ...ownerQueue(repo, open),
    action: action(open, unopened, next, daily),
  };
}

// The sprint branches with no PR yet, whose last commit is under 45 minutes old, newest first: not
// an open PR's branch, nor still on the head a closed PR ended on. Only the repository's own
// branches are listed, and only collaborators can push one.
function freshBranches(repo, branches, open, closed) {
  const opened = new Set(open.map(({ branch }) => branch));
  const ended = new Set(closed.map(({ head }) => head.sha));
  return branches
    .filter(
      ({ name, commit }) =>
        sprintOf(name) &&
        commit?.sha &&
        !opened.has(name) &&
        !ended.has(commit.sha),
    )
    .map(({ name, commit }) => ({
      branch: name,
      committedAt: api(`repos/${repo}/commits/${commit.sha}`).commit.committer
        .date,
    }))
    .filter(
      ({ committedAt }) => Date.now() - Date.parse(committedAt) < ACTIVE_MS,
    )
    .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt));
}

// The team's own sprint PRs, as GitHub lists them.
function ours(repo) {
  return ({ head, author_association: association, user }) =>
    head?.repo?.full_name?.toLowerCase() === repo.toLowerCase() &&
    (TRUSTED.has(association) || user?.login === CHECKS_APP) &&
    SPRINT_BRANCH.test(head?.ref ?? "");
}

// The team's sprint PRs merged into the base in the last 24 hours, from one page of the closed
// ones, most recently updated first: a merge updates a PR, so every one merged today is among them
// unless more than 100 closed PRs changed since, far past any cap.
function mergedToday(closed, base) {
  const since = Date.now() - DAY;
  const times = closed
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

// What the team owes the PRs waiting for the owner, read only from the team's and the owner's own
// comments: the repository is public, and a stranger's comment must neither silence a reminder
// nor mark a conflict as dealt with.
// - remind: the PRs a day past their last commit and their last such comment. The run that
//   reminds the owner comments on each, which restarts the day.
// - update: the PRs that conflict with the base, that no run is on (quiet for 45 minutes), and
//   whose head no such comment flagged as beyond the team (`theseus:conflict <head>`). GitHub
//   reports a conflict only on the PR itself; "unknown", while it works one out, counts as none,
//   so a later run sees it.
function ownerQueue(repo, open) {
  const remind = [];
  const update = [];
  for (const pr of open.filter(({ needsOwner }) => needsOwner)) {
    const comments = list(
      `repos/${repo}/issues/${pr.number}/comments?per_page=100`,
    ).filter(
      ({ author_association: association, user }) =>
        TRUSTED.has(association) || user?.login === CHECKS_APP,
    );
    const committed = api(`repos/${repo}/commits/${pr.head}`).commit.committer
      .date;
    const lastSeen = Math.max(
      Date.parse(committed),
      ...comments.map(({ created_at: at }) => Date.parse(at)),
    );
    if (Date.now() - lastSeen >= DAY) {
      remind.push({ number: pr.number, url: pr.url });
    }
    const quiet = Date.now() - Date.parse(pr.updatedAt) >= ACTIVE_MS;
    if (
      quiet &&
      !comments.some(({ body }) =>
        body?.includes(`theseus:conflict ${pr.head}`),
      ) &&
      api(`repos/${repo}/pulls/${pr.number}`).mergeable_state === "dirty"
    ) {
      update.push({ number: pr.number, branch: pr.branch });
    }
  }
  return { remind, update };
}

// One open sprint PR at a time is worked on: the oldest one that doesn't wait for the owner.
function action(open, unopened, next, daily) {
  const [busy] = unopened;
  if (busy) {
    const minutes = minutesSince(busy.committedAt);
    return {
      do: "stand down",
      branch: busy.branch,
      say: `Branch ${busy.branch} has no PR yet and was committed to ${minutes} min ago, so another run is most likely working on it. Don't touch it or start a new sprint: stand down with a short report.`,
    };
  }
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
    if (open.length <= WAITING_CAP && daily.merged >= daily.cap) {
      return {
        do: "stand down",
        pr: first.number,
        say: `PR #${first.number} (${first.branch}) waits for the owner, and ${daily.merged} ${daily.merged === 1 ? "sprint" : "sprints"} merged in the last 24 hours, the daily cap (${daily.cap}); the next run picks up after ${daily.reopens}. Don't start a new sprint: stand down with a short report.`,
      };
    }
    if (open.length <= WAITING_CAP) {
      return {
        do: "start",
        sprint: next,
        waiting: first.number,
        say: `PR #${first.number} (${first.branch}) waits for the owner. Start sprint ${next} on a branch named sprint/${next}-<slug>, on work that neither repeats nor builds on #${first.number}; if every candidate does, stand down with a short report.`,
      };
    }
    return {
      do: "stand down",
      pr: first.number,
      say: `PR #${first.number} (${first.branch}) waits for the owner (needs-owner)${others(first)}. Don't start a new sprint: stand down with a short report.`,
    };
  }
  if (Date.now() - Date.parse(current.updatedAt) < ACTIVE_MS) {
    const minutes = minutesSince(current.updatedAt);
    return {
      do: "stand down",
      pr: current.number,
      say: `PR #${current.number} (${current.branch}) changed ${minutes} min ago, so another run is most likely still working on it${others(current)}. Don't touch it or start a new sprint: stand down with a short report. A later run continues it once it has been quiet for 45 minutes.`,
    };
  }
  return {
    do: "continue",
    pr: current.number,
    say: `PR #${current.number} (${current.branch}) is open${others(current)}. Continue it rather than starting a new sprint: run what's missing, then node .studio/merge.mjs ${current.number}.`,
  };
}

function minutesSince(time) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(time)) / 60_000));
}

function sprintOf(name) {
  const found = String(name ?? "").match(SPRINT_BRANCH);
  return found ? Number(found[1]) : 0;
}

function highestOf(numbers) {
  return Math.max(0, ...numbers);
}
