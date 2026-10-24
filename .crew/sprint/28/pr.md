## Sprint 28: B4's plan, and the feed the Studio has to serve

**Goal (roadmap):** B4, "`/crew`, the crew at work, from the Studio's data". This sprint doesn't
build it. The Studio exposes no read a third party can use (its only public read is one run's
SSE stream by id, nothing says which run is live, and it can't be framed), and the Studio's own
roadmap lists "a small cached read-only API" for `/crew` as unbuilt, to give the portfolio "what it
needs". So this sprint says what the portfolio needs, and turns B4 into the sprints that follow
once the feed exists.

**Size:** M by the decision it carries, with no product code. Quill wrote the plan and the feed's
contract; Atlas read the Studio's code first, from a read-only clone of nycruslan/theseus-studio
at `64347d6` attached to the session (the crew doesn't work on the Studio, and nothing there was
edited).

## What's in it

- `.crew/sprint/28/feed-contract.md`: **one endpoint, `GET /api/crew` on the Studio**, written
  for the owner to build. It returns `current` (the live run, or one open and not yet merged, or
  null), `last` (the newest merged sprint, with its merge time) and `asOf`. Every field is traced
  to a Studio derivation that exists (`liveRun`, `sprintIndex`, `tellRun`, `agentProfiles`,
  `health`, the now line, `momentText`, `PullState.mergedAt`), so building it is plumbing. It
  carries nothing the Studio's public pages don't already show, no secrets, no owner state. Caching
  on both sides (the Studio answers at most every 15 s; the portfolio reads it server-side under a
  30 s `cacheLife` and stays static), errors and absence (the portfolio treats a missing
  `CREW_FEED_URL`, a bad answer or a stale `asOf` as down and shows today's sheet), and how the
  crew checks it without reaching it (fixtures of the shape; only the owner sees the real feed, on
  previews and production).
- `.crew/sprint/28/b4-plan.md`: **B4 as five M sprints**, each one PR that leaves the site whole:
  - **B4.1** `/crew` from the feed, server-rendered with no client code, the four states (live,
    open, resting, feed down), the Crew link, and the phone bar re-laid as `rest-390.webp` draws it
    (Read as page moves to the drawing's foot below 768 px);
  - **B4.2** the live layer on `/`: the pencil plank and its row, the copper tip while live, the
    rest line with the merge time, 0 B of new script on `/`; the B4 demo;
  - **B4.3** `/crew` live in the browser, polling the portfolio's own `/api/crew` (no CORS on the
    Studio), with "Pause updates" for WCAG 2.2.2;
  - **B4.4** the hull on `/crew`, one mark per moment, under Full/Calm/Off;
  - **B4.5** Replay of the last merged sprint.
- `.crew/sprint/28/decisions.md`: why this is a plan and not a page (2, 3), why the PR waits (4),
  and that nothing of B4 ships before the feed (7). Quill's brief in `brief-quill.md`.
- Quill's three memory lines.

**Nothing of B4 ships before the feed** (Quill, plan "Before the feed"; decision 7): a `/crew`
from the retros can't know whether the crew is working, a rest line from the retros has no time,
and a link out to the Studio is the opposite of "one experience". B4.1 can start the day this PR's
head is approved, against the contract's fixtures, and merges only once the real feed answers on
its preview.

## Checks

There is no `contract.md`: a plan with no product code and no visitor-visible check is judged
against `brief-quill.md` (decision 3). No product code changed: `pnpm verify` and the suite run as on main (the only files are
`.crew/sprint/28/*` and Quill's memory). Everything else was read, not run: the Studio's functions
are cited from its code at `64347d6`, and the `cacheLife` prerendering rule from
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md`.

## Needs owner decision

This PR waits for you (`needs-owner`): approving its head means "build the feed to this
contract". The contract's own list, `feed-contract.md` "What the owner decides":

1. **The URL.** Proposed `https://theseus-studio.vercel.app/api/crew`.
2. **The env var.** `CREW_FEED_URL`, server-side, on the portfolio's Vercel project for
   Production and Preview. Until it is set the portfolio shows the feed-down state.
3. **CORS: none.** The portfolio reads server-side and the browser polls the portfolio's own route.
4. **The now line's quotes.** Show Atlas's quoted words when only he is at work (recommended), or a
   fixed "Atlas is leading sprint N".
5. **The Rules copy.** `crew-1440.webp` says "Never prompts or secrets", but the Studio publishes
   the crew's briefs and Atlas's words: either the feed drops brief-derived lines, or the copy
   becomes true ("Never secrets: credentials are masked before anything is stored").
6. **The cloud proxy.** Optionally let the crew's sessions `GET /api/crew`, so a session can
   check the real shape; today only you can.
7. **The Studio link.** `/crew`'s Evidence row links each run's page on the Studio (recommended).

A comment changes the contract; the next run revises it here before B4.1 starts.

**Lens: ship** on `e169cfd` with no fix round and two nits, both taken as notes in the close-out
(`decisions.md`, 8): the contract's example now gives `last` its seven roles, and decision 3 says
why the sprint has no contract.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Gnyq8SJ436jzEz7nrSBeAh
