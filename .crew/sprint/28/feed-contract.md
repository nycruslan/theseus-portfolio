# The crew feed: what the portfolio asks the Studio to serve

Quill, 2026-10-24, sprint 28. This is for the owner to build in nycruslan/theseus-studio. It is
the Studio roadmap's "Serve the portfolio's `/crew` (redesign B4)" item, with "what it needs"
written down. It was read from the Studio at `64347d6`, and every field below comes from a
derivation the Studio already has. Building the feed should mean assembling those derivations, with
nothing new to design.

The portfolio's plan for using the feed is `.crew/sprint/28/b4-plan.md`. Fields that only later
sprints read are marked **later**. B4.1 reads everything else.

## One endpoint

`GET https://theseus-studio.vercel.app/api/crew` (the path is the owner's call, decision 1).

- **Request:** no parameters, no authentication, no cookies.
- **Answer:** `200`, `application/json`, at most about 8 KB.
- **Readers:** the portfolio's server alone. The browser never calls the Studio (see CORS).

```ts
type CrewFeed = {
  version: 1;
  /** The Studio's clock when it told this answer, ISO 8601 UTC. */
  asOf: string;
  /** The sprint in progress: live now, or open and not yet merged or closed. Null when none. */
  current: CrewRun | null;
  /** The newest sprint whose pull request merged. Null only before the first. */
  last: FinishedRun | null;
};

type CrewRun = {
  sprint: number | null;
  goal: string | null;
  /** Live by the Studio's own test: not over, and heard from within the signal window. */
  live: boolean;
  startedAt: string;
  lastEventAt: string;
  pr: { number: number; url: string } | null;
  health: { state: HealthState; label: string; line: string | null; quote: boolean };
  /** What is happening now, in the status line's words. Null when nothing is. */
  now: string | null;
  /** The seven roster roles, in roster order. */
  roles: { role: RosterRole; state: AgentState; line: string | null }[];
  /** At most 10, newest first. */
  moments: { kind: MomentKind; at: string; who: RosterRole | null; text: string }[];
  /** The run's public page on the Studio. */
  url: string;
};

type FinishedRun = CrewRun & {
  /** When its last session went quiet. */
  endedAt: string;
  /** When GitHub merged its PR. */
  mergedAt: string | null;
  /** later (B4.5): every moment of the sprint for Replay, oldest first, at most 60. */
  replay?: CrewRun["moments"];
};

type HealthState =
  | "working" | "waiting" | "changes" | "quiet" | "shipped" | "not-shipped" | "ended" | "failed";
type AgentState = "working" | "waiting" | "done" | "not-called";
type RosterRole =
  | "lead" | "product-owner" | "engineer" | "creative-engineer"
  | "code-reviewer" | "qa-engineer" | "design-director";
type MomentKind =
  | "kickoff" | "ticket" | "contract" | "decision" | "report"
  | "verdict" | "gate" | "pr" | "merge" | "end";
```

## Where each field comes from

File paths are the Studio's. Two runs are told: `current` and `last`.

**Which run is `current`:**
1. `liveRun()` (`lib/runs.ts`): the run live now, by health. It is wider than the index, so it also
   catches a session that hasn't briefed anyone yet.
2. If there is no live run, the newest row of `sprintIndex()` (`lib/runs.ts`, rows from
   `lib/sprints.ts`'s `sprintRows`) whose `health.state` is `working`, `waiting`, `changes` or
   `quiet`. That is a sprint still open, such as a PR waiting for the owner.
3. Otherwise `null`.

Never a run whose id starts with `fixture-`, and never a hidden one (`liveRun` and the index
already skip `HIDDEN_RUN_IDS`).

**Which run is `last`:** the newest row of `sprintIndex()` with `health.state === "shipped"` and a
`number`. It is told from that row's `runId`, the run that carried the sprint's PR (`row()` in
`lib/sprints.ts`).

**For either run,** read what the run page reads (`app/studio/runs/[runId]/page.tsx`):

```ts
const events = await sprintEvents(runId);       // lib/runs.ts
const summary = summarize(runId, events);       // lib/run-summary.ts
const pull = await runPull(runId, summary.pr);  // lib/runs.ts
const told = tellRun(events, pull);             // lib/run-model.ts: final story and everyone
const now = Date.now();
const said = health({ ...summary.facts, github: pull ?? undefined }, { now }); // lib/health.ts
```

| Field | From |
|---|---|
| `version` | The constant `1`. A change of shape bumps it, and the portfolio treats an unknown version as down. |
| `asOf` | `new Date(now).toISOString()`: the clock `health()` judged on. |
| `sprint` | `summary.sprint.number` (`Story["sprint"]`), or the index row's `number` when it has one. |
| `goal` | As the index words it (`row()` in `lib/sprints.ts`): `prGoal(pull?.title)` (`lib/story/parse.ts`), else `summary.sprint.goal`. |
| `live` | `said.live` (`lib/health.ts`'s `Health.live`), the test `liveRun()` uses. Always `false` on `last`. |
| `startedAt` | `summary.startedAt`, as ISO. For `last`, the index row's `startedAt` (its first session). |
| `lastEventAt` | `summary.facts.lastEventAt`, as ISO. |
| `pr` | `summary.pr` (the run's portfolio PR, `runPortfolioPr` in `lib/health/facts.ts`) with `said.pr.url`, else `null`. The URL is only ever a PR page on GitHub (`pullUrl` in `lib/github.ts`), and the portfolio links it only when it is its own repository's. |
| `health.state`, `.label`, `.line`, `.quote` | `said.state`, `said.label`, `said.line ?? null`, `said.quote === true`. Pass no `overlap` or `hidden`: those are the index's notes. |
| `now` | `summary.facts.now` (`HealthFacts.now`, from `doing()` in `lib/health/doing.ts`), worded by `present()` in the same file. `null` when it's undefined or the run is over. While a run is working, it equals `health.line`. It is sent apart because a quiet run's `line` is "Nothing new for 6 min…". |
| `roles` | `told.everyone` (`agentProfiles()` in `lib/agents.ts`): the roster in order, called or not. Keep the roles in `ROSTER` (`lib/team.ts`), and drop guests. Each is `{ role: agent.who.role, state: agent.state, line: agentLine(agent) ?? null }`. `agentLine` is in `components/run/sprint-facts.ts`; move it to `lib/` if a route shouldn't import from `components/`. |
| `moments` | `told.final.moments` (`Moment` in `lib/story/types.ts`), kept to the kinds in `MomentKind`, newest 10, as `{ kind, at, who, text }`. See "Which moments", below. |
| `moments[].at` | The time of the event whose `seq` the moment carries. For a fact from GitHub (`moment.at` is set), that time is clamped between its neighbours, as `components/run/use-run-model.ts` does (lines 214 to 227). Lift that to `lib/` too. |
| `moments[].who` | `moment.who?.role` when it is in `ROSTER`, else `null`. |
| `moments[].text` | `moment.text`: `momentText()`'s words (`lib/story/wording.ts`). |
| `url` | The Studio's origin plus `/studio/runs/${runId}`. That run page is public. |
| `endedAt` (last) | The index row's `lastEventAt` (`SprintRow`): the last event of any session on the sprint. |
| `mergedAt` (last) | `pull?.mergedAt` (`PullState` in `lib/github.ts`), from `runPull(row.runId, row.health.pr.number)`. It is the rest line's time ("Last plank seated: sprint 27, 23 Oct, 21:40 UTC"). |
| `replay` (last, **later**) | The same moments as `moments`, oldest first, at most 60, for B4.5. |

**Which moments.** The sprint's milestones and hand-offs: `kickoff`, `ticket`, `contract`,
`decision`, `report`, `verdict`, `gate`, `pr`, `merge` and `end`. Four kinds are left out:
- `setback` and `guard` are a command's texture, which a visitor can't read without the command;
- `meeting` and `objection` belong to L work's threads.

The Studio shows all four in full, and the research says no raw logs.

**Not in the feed:**
- tokens and models;
- the board's rows and threads;
- briefs' and reports' bodies;
- commands and file paths, except where `agentLine`'s or the now line's own words name them, as
  the Studio's status line already does;
- the contract's checks;
- the personas.

The portfolio defines its crew (`.claude/agents/`) and words the roles as its frames do, so it
needs only the role key.

## Example (illustrative values, not a real answer)

```json
{
  "version": 1,
  "asOf": "2026-10-24T14:02:11.000Z",
  "current": {
    "sprint": 29,
    "goal": "The crew's page, /crew, from the Studio's feed",
    "live": true,
    "startedAt": "2026-10-24T12:40:03.000Z",
    "lastEventAt": "2026-10-24T14:01:58.000Z",
    "pr": { "number": 76, "url": "https://github.com/nycruslan/theseus-portfolio/pull/76" },
    "health": { "state": "working", "label": "Working", "line": "Probe is writing the tests.", "quote": false },
    "now": "Probe is writing the tests.",
    "roles": [
      { "role": "lead", "state": "working", "line": "Briefing Probe" },
      { "role": "product-owner", "state": "done", "line": "Wrote the contract: 14 checks" },
      { "role": "engineer", "state": "waiting", "line": null },
      { "role": "creative-engineer", "state": "not-called", "line": null },
      { "role": "code-reviewer", "state": "not-called", "line": null },
      { "role": "qa-engineer", "state": "working", "line": "Writing the tests" },
      { "role": "design-director", "state": "not-called", "line": null }
    ],
    "moments": [
      { "kind": "contract", "at": "2026-10-24T13:31:40.000Z", "who": "product-owner", "text": "Done means 14 checks" },
      { "kind": "kickoff", "at": "2026-10-24T12:40:03.000Z", "who": null, "text": "Sprint started" }
    ],
    "url": "https://theseus-studio.vercel.app/studio/runs/<runId>"
  },
  "last": {
    "sprint": 28,
    "goal": "B4's plan, and the feed the Studio has to serve",
    "live": false,
    "startedAt": "…", "lastEventAt": "…", "endedAt": "…", "mergedAt": "…",
    "pr": { "number": 75, "url": "https://github.com/nycruslan/theseus-portfolio/pull/75" },
    "health": { "state": "shipped", "label": "Shipped · PR #75", "line": "The owner merged PR #75 on GitHub.", "quote": false },
    "now": null,
    "roles": [],
    "moments": [],
    "url": "https://theseus-studio.vercel.app/studio/runs/<runId>"
  }
}
```

The PR numbers, times and lines above are invented for the shape. Probe's fixtures take this shape
in three states: live, open (`live: false`, `health.state: "waiting"`) and resting
(`current: null`).

## What it must not carry

- **No secrets, and nothing that isn't already public on the Studio's pages.** Every field is a
  word, time or link that the public run page or index already shows. The run page's SSE stream
  (`/api/runs/<id>/stream`) already serves each event whole, so the feed narrows what is public
  and adds nothing to it.
- **No owner-only state:** nothing from the owner's session, Start, `OWNER_*` or the routine.
- **No URLs but two kinds:** GitHub PR pages of the portfolio, and the Studio's own run pages.

## Caching

- **The Studio:**
  - The route tells its answer at most once every 15 s per instance: a `"use cache"` read with
    `cacheLife({ stale: 15, revalidate: 15, expire: 60 })`, like `runList()`'s `LIST_CACHE`.
  - It sends `Cache-Control: public, max-age=0, s-maxage=15, stale-while-revalidate=45`, so
    Vercel's CDN answers repeat reads.
  - The tellings inside can be cached for good under each run's last event, as `summaryAt()` is.
  - GitHub's word is cached as `runPull` already caches it, about a minute.
- **The portfolio:**
  - **The server read.** It reads the feed on its server through one function with
    `cacheLife({ stale: 30, revalidate: 30, expire: 300 })`. That is the shortest life Next.js
    still includes in a prerender: `stale` under 30 s or `expire` under 5 minutes would make it a
    dynamic hole resolved at request time, and at 30 s to 5 minutes it is prerendered but kept out
    of the route's App Shell (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md`,
    "Prerendering behavior"). Atlas checked the doc: the first build measures that the page is
    still static on Vercel.
  - **How stale.** `/` and `/crew` stay static, and each is regenerated in the background. A
    visitor sees state at most about 5 minutes old, usually under a minute while visitors come.
  - **The live window.** Copper's own window, the Studio's `SIGNAL_WINDOW_MS`, is 10 minutes, so
    the lag stays inside what "live" already means.
  - **The browser poll (B4.3).** `/crew`'s poll reads the portfolio's own `/api/crew`, which
    Vercel caches for 30 s (`s-maxage=30`). The Studio therefore sees about two reads a minute from
    the portfolio, however many people watch.
  - **A stale answer.** The portfolio treats an answer whose `asOf` is more than 10 minutes old at
    render as down.

## Errors and absence

- **The Studio:** when the database or the telling fails, answer `503` with
  `Cache-Control: no-store` and a short JSON `{ "error": "…" }`. Never a `200` with made-up
  nulls: `current: null` must always mean "nothing in progress".
- **The portfolio treats it as down** when:
  - `CREW_FEED_URL` is unset (the feed isn't built yet, CI, the crew's sessions);
  - the answer is not `200`, or takes more than 2,000 ms;
  - the shape doesn't check;
  - the version is unknown, or `asOf` is stale.

  Unknown moment kinds and roles are dropped, not fatal. A failed read is kept for 30 s at most,
  so the page recovers soon after the Studio does.
- **What a visitor sees when it is down:**
  - `/` is the sheet as it is today: the record from the retros, with no pencil, no copper and no
    "resting" claim, since without the feed nothing says whether the crew is working;
  - `/crew` shows "The live feed isn't answering", the last plank from the retros, and the crew's
    roles with no state words.

  Production has no "Last plank seated" line today; B4.2 adds it from this feed.

## How the crew checks it, and what only the owner sees

- **The crew can't reach the feed.** The cloud's proxy lets sessions reach `/api/ingest` on the
  Studio and nothing else, so no session can read it, and CI must not depend on a live service.
- **The checks use fixtures of this shape:**
  - served to a `next start` that Probe's spec points at them through `CREW_FEED_URL` (B4.1,
    B4.2);
  - or served on the portfolio's own `/api/crew` through `page.route` (B4.3);
  - plus the down state on the default test server, which has no feed URL.
- **Only the owner sees the real feed,** on each PR's Vercel preview and on production.

## What the owner decides

1. **The URL.** Proposed: `https://theseus-studio.vercel.app/api/crew`.
2. **The env var.** `CREW_FEED_URL` on the portfolio's Vercel project, server-side (not
   `NEXT_PUBLIC_`), for Production and Preview. Preview lets each PR show the real feed. Until it
   is set, the portfolio shows the down state and nothing breaks.
3. **CORS: none.** The portfolio reads server-side, and the browser polls the portfolio's own
   route. If the owner would rather the browser call the Studio directly, the Studio must echo an
   allowed origin, since `Access-Control-Allow-Origin` can't wildcard the preview subdomains. I
   recommend against it.
4. **The now line's quotes.** When only Atlas is at work, the Studio's now line can quote his own
   words (`quote: true`, the first sentence of what he said). They are public on the Studio
   already. I recommend the portfolio shows them, marked as a quote. The alternative is a fixed
   "Atlas is leading sprint N", which tells the visitor less.
5. **The Rules copy.** `crew-1440.webp`'s Rules row says "Never prompts or secrets". The Studio
   publishes the crew's briefs and Atlas's words (`lib/redact.ts`: "hook payloads carry the crew's
   commands, briefs and errors"), and the roles' lines can be a brief's headline. So the row as
   drawn wouldn't be true. Choose between:
   - the feed drops brief-derived lines (`agentLine` falls back to nothing for a brief);
   - the copy becomes true, for example "Never secrets: credentials are masked before anything is
     stored."
6. **The cloud proxy.** Optionally allow sessions to `GET /api/crew`. The crew could then check
   the real shape from a session, which today only the owner can.
7. **The Studio link.** `/crew`'s Evidence row links each run's page on the Studio (`url`). I
   recommend it: the Studio is the deep view, and the link is honest evidence.
