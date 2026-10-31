// The sprint pre-flight: `node .crew/next-sprint.mjs [--owner-goal]`, run by Atlas before anything
// else (the sprint skill). A sprint's folder reaches main only when its PR merges, so main alone
// can't tell what's in flight. This reads GitHub, through REST alone (github.mjs), and prints JSON:
// - actingAs: who GitHub thinks is calling. In a cloud session that's always the owner, since the
//   cloud's GitHub proxy swaps any token for the owner's connection, so the rules hold through gate,
//   Lens, merge.mjs and the guard rather than a separate account.
// - open: the team's open sprint PRs (branch sprint/<n>-<slug>), oldest first. One waits for the
//   owner when it's marked ready and carries or once carried needs-owner, or when `gate` holds its
//   head for the owner's approval or passed it only on that approval. A draft is still being built,
//   whatever its labels.
// - unopened: sprint branches with no PR yet whose last commit is recent. A run pushes before it
//   opens its PR, so such a branch may be a live sprint.
// - highest and next: the highest sprint number among main's sprint folders, the open PRs and the
//   branches, and one past it.
// - daily: the team's sprint PRs merged in the last 24 hours and the cap on them,
//   THESEUS_DAILY_SPRINTS (default 6). A merge starts the next run, so the cap is what ends a chain
//   of the crew's own making. A run with the owner's goal (--owner-goal) isn't held by it. The flag
//   is Atlas's word, which is enough for a guard on churn: the cap was never a boundary, GitHub's
//   required checks are.
// - remind and update: what the team owes the PRs waiting for the owner (ownerQueue).
// - picks: the owner's answers to the questions the team asked in its PRs (an "Owner's pick", the
//   sprint skill) that change what it built, not yet marked applied: in an open sprint PR, or a
//   merged one however long ago, since ticking edits the body and brings it to the top of the
//   closed list. Ticking the recommended option changes nothing, unless the pick waits.
// - action: continue the oldest open sprint PR that doesn't wait for the owner, stand down, or
//   start the next sprint. A PR or branch a run worked on in the last ACTIVE_HOURS (a commit, or a
//   PR marked ready or for review) is left to the run most likely still on it, since two runs on
//   one branch collide. While one PR waits for the owner a new sprint may start beside it; a second
//   waiting PR stops new work.
// It fails closed: when GitHub can't be read it exits 1, since a sprint started blind may duplicate
// one.

import { carriedNeedsOwner, OWNER_APPROVED } from "./gate.mjs";
import { api, configure, list, repoOf, toplevel } from "./github.mjs";
import { ownerPicks, unbuilt } from "./picks.mjs";

const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
// The checks app opens the team's PRs (.github/workflows/open-pr.yml). GitHub calls it no
// association at all, and a bot's login, with its [bot], is one no person can take.
const CHECKS_APP = "theseus-checks[bot]";
const SPRINT_BRANCH = /^sprint[/-](\d+)(?:-|$)/;
const FOLDER = /^\d+$/;
const DAY = 24 * 60 * 60 * 1000;
const DAILY_DEFAULT = 6;
// How long a PR or branch stays the run's that last worked on it (workedOn): builders can work in
// their own worktrees for an hour or more before anything reaches GitHub. A run that died is
// picked up once the window has passed. A commit's time is when it was made, not pushed, so a
// commit pushed hours later doesn't hold a branch.
const ACTIVE_HOURS = 2;
const ACTIVE_MS = ACTIVE_HOURS * 60 * 60 * 1000;
const WAITING_CAP = 1;
configure({ timeout: 20_000 });

const ownerGoal = process.argv.slice(2).includes("--owner-goal");

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
  const { default_branch: base } = api(`repos/${repo}`);
  // The repository is public, so anyone can open a PR from a fork with a branch named sprint/<n>.
  // Only the team's own PRs count: a branch in this repository, opened by the owner, a member, a
  // collaborator or the team's checks app (open-pr.mjs). GitHub treats repository names as
  // case-insensitive, so they're compared that way.
  // Otherwise a stranger's PR could have Atlas check out its code, stand down, or skip numbers.
  // The title is free text a visitor can write, so it stays out of what Atlas is told.
  const pulls = list(`repos/${repo}/pulls?state=open&per_page=100`)
    .filter(ours(repo))
    .sort((a, b) => a.number - b.number);
  const open = pulls.map((pr) => {
    const labels = pr.labels.map(({ name }) => name);
    return {
      number: pr.number,
      branch: pr.head.ref,
      head: pr.head.sha,
      ...workedOn(repo, pr),
      draft: pr.draft === true,
      waitsForOwner:
        pr.draft !== true &&
        (carriedNeedsOwner({ repo, number: pr.number, labels }) ||
          gateWaits(repo, pr.head.sha)),
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
  // One page of the team's closed sprint PRs, most recently updated first: what merged today, the
  // heads the branches of recently closed ones are still on, and the picks the owner answered.
  const closed = api(
    `repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
  ).filter(ours(repo));
  const unopened = freshBranches(repo, branches, open, closed);
  const daily = mergedToday(closed, base);
  const merged = closed.filter((pr) => pr.base.ref === base && pr.merged_at);
  // A pick on an open PR that a run worked on within ACTIVE_HOURS is that run's to build, as
  // `update` leaves such a PR alone: two runs would build it twice.
  const quiet = new Set(
    open
      .filter(({ workedAt }) => Date.now() - Date.parse(workedAt) >= ACTIVE_MS)
      .map(({ number }) => number),
  );
  return {
    repo,
    base,
    open,
    unopened,
    highest,
    next,
    daily: { merged: daily.merged, cap: daily.cap },
    ...ownerQueue(repo, open),
    picks: answeredPicks([
      ...pulls.filter(({ number }) => quiet.has(number)),
      ...merged,
    ]),
    action: action(open, unopened, next, daily, ownerGoal),
  };
}

// The picks the owner answered that the team still has to build: open PRs first, then merged ones,
// most recently updated first.
function answeredPicks(prs) {
  return prs.flatMap((pr) =>
    ownerPicks(pr.body).flatMap((pick) => {
      const chose = unbuilt(pick);
      if (!chose.length) return [];
      return [
        {
          pr: pr.number,
          url: pr.html_url,
          merged: Boolean(pr.merged_at),
          question: pick.question,
          chose,
          recommended: pick.options.find((option) => option.recommended)?.text,
          waits: pick.waits,
        },
      ];
    }),
  );
}

// The sprint branches with no PR yet, whose last commit is within ACTIVE_MS, newest first: not
// an open PR's branch, nor still on the head a closed PR ended on. Only the repository's own
// branches are listed, and only collaborators can push one.
function freshBranches(repo, branches, open, closed) {
  const opened = new Set(open.map(({ branch }) => branch));
  const ended = new Set(closed.map(({ head }) => head.sha));
  return branches
    .filter(
      ({ name, commit }) =>
        sprintOf(name) && !opened.has(name) && !ended.has(commit.sha),
    )
    .map(({ name, commit }) => ({
      branch: name,
      committedAt: committedAt(repo, commit.sha),
    }))
    .filter(
      ({ committedAt }) => Date.now() - Date.parse(committedAt) < ACTIVE_MS,
    )
    .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt));
}

function committedAt(repo, sha) {
  return api(`repos/${repo}/commits/${sha}`).commit.committer.date;
}

// When a run last worked on an open PR: its head commit, or a later mark only a run leaves, the PR
// marked ready (ready-pr.mjs) or labelled `review` for Lens. A run that waits on Lens or merge.mjs
// pushes nothing for a while, and these keep its PR its own. Lens's reviews, gate's checks and the
// owner's comments change a PR too, but none of them is a run on it.
function workedOn(repo, pr) {
  const committed = committedAt(repo, pr.head.sha);
  const marks = list(`repos/${repo}/issues/${pr.number}/events?per_page=100`)
    .filter(
      ({ event, label }) =>
        event === "ready_for_review" ||
        (event === "labeled" && label?.name === "review"),
    )
    .map(({ created_at: at }) => Date.parse(at));
  const worked = Math.max(Date.parse(committed), ...marks);
  return { committedAt: committed, workedAt: new Date(worked).toISOString() };
}

// Whether the checks app's latest `gate` on the head leaves it to the owner: held for their
// approval, or passed only on it.
function gateWaits(repo, head) {
  const [gate] = list(
    `repos/${repo}/commits/${head}/check-runs?check_name=gate&per_page=100`,
    { key: "check_runs" },
  )
    .filter(({ app }) => `${app?.slug}[bot]` === CHECKS_APP)
    .sort((a, b) => b.id - a.id);
  return (
    gate?.status === "completed" &&
    (gate.conclusion === "failure" || gate.external_id === OWNER_APPROVED)
  );
}

// The team's own sprint PRs, as GitHub lists them.
function ours(repo) {
  return ({ head, author_association: association, user }) =>
    head.repo?.full_name.toLowerCase() === repo.toLowerCase() &&
    (TRUSTED.has(association) || user?.login === CHECKS_APP) &&
    SPRINT_BRANCH.test(head.ref);
}

// The team's sprint PRs merged into the base in the last 24 hours, from one page of the closed
// ones, most recently updated first: a merge updates a PR, so every one merged today is among them
// unless more than 100 closed PRs changed since, far past any cap.
function mergedToday(closed, base) {
  const since = Date.now() - DAY;
  const times = closed
    .filter((pr) => pr.base.ref === base && pr.merged_at)
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

// The sprint folders on the base branch; none yet when .crew/sprint/ isn't there.
function sprintFolders(repo, base) {
  try {
    return list(`repos/${repo}/contents/.crew/sprint?ref=${base}`)
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
// - update: the PRs that conflict with the base, that no run is on (quiet for ACTIVE_HOURS), and
//   whose head no such comment flagged as beyond the team (`theseus:conflict <head>`). GitHub
//   reports a conflict only on the PR itself; "unknown", while it works one out, counts as none,
//   so a later run sees it.
function ownerQueue(repo, open) {
  const remind = [];
  const update = [];
  for (const pr of open.filter(({ waitsForOwner }) => waitsForOwner)) {
    const comments = list(
      `repos/${repo}/issues/${pr.number}/comments?per_page=100`,
    ).filter(
      ({ author_association: association, user }) =>
        TRUSTED.has(association) || user?.login === CHECKS_APP,
    );
    const committed = Date.parse(pr.committedAt);
    const lastSeen = Math.max(
      committed,
      ...comments.map(({ created_at: at }) => Date.parse(at)),
    );
    if (Date.now() - lastSeen >= DAY) {
      remind.push({ number: pr.number, url: pr.url });
    }
    const quiet = Date.now() - Date.parse(pr.workedAt) >= ACTIVE_MS;
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

// One open sprint PR at a time is worked on: the oldest one that doesn't wait for the owner. The
// daily cap holds back new sprints, but never the owner's goal or the finishing of an open one.
function action(open, unopened, next, daily, ownerGoal) {
  const capped = daily.merged >= daily.cap && !ownerGoal;
  const [busy] = unopened;
  if (busy) {
    const minutes = minutesSince(busy.committedAt);
    return {
      do: "stand down",
      branch: busy.branch,
      say: `Branch ${busy.branch} has no PR yet and was committed to ${minutes} min ago, so another run is most likely working on it. Don't touch it or start a new sprint: stand down with a short report.`,
    };
  }
  if (!open.length && capped) {
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
  const current = open.find(({ waitsForOwner }) => !waitsForOwner);
  const others = (shown) => {
    const rest = open.filter((one) => one !== shown);
    return rest.length
      ? ` (also open: ${rest.map(({ number }) => `#${number}`).join(", ")})`
      : "";
  };
  if (!current) {
    const [first] = open;
    if (open.length <= WAITING_CAP && capped) {
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
      say: `PR #${first.number} (${first.branch}) waits for the owner${others(first)}. Don't start a new sprint: stand down with a short report.`,
    };
  }
  if (Date.now() - Date.parse(current.workedAt) < ACTIVE_MS) {
    const minutes = minutesSince(current.workedAt);
    return {
      do: "stand down",
      pr: current.number,
      say: `PR #${current.number} (${current.branch}) was last worked on ${minutes} min ago, so another run is most likely still working on it${others(current)}. Don't touch it or start a new sprint: stand down with a short report. A later run continues it once it has been quiet for ${ACTIVE_HOURS} hours.`,
    };
  }
  return {
    do: "continue",
    pr: current.number,
    say: `PR #${current.number} (${current.branch}) is open${others(current)}. Continue it rather than starting a new sprint: run what's missing, mark it ready with node .crew/ready-pr.mjs ${current.number} if it's still a draft, then node .crew/merge.mjs ${current.number}.`,
  };
}

function minutesSince(time) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(time)) / 60_000));
}

function sprintOf(name) {
  const found = name.match(SPRINT_BRANCH);
  return found ? Number(found[1]) : 0;
}

function highestOf(numbers) {
  return Math.max(0, ...numbers);
}
