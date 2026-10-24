# Brief for Quill (sprint 28): B4 as a sequence of sprints, and the feed it needs

**For:** the roadmap. B4 ("`/crew`, the crew at work, from the Studio's data") is one line in
`ROADMAP.md` and several sprints of work, and it can't start as a build: the Studio exposes no
read API a third party can use (Atlas's read of its code, `.crew/sprint/28/decisions.md`, 2), and
the Studio's own roadmap lists one as unbuilt, worded "give it what it needs, the live run's state
and recent moments, as a small cached read-only API". Nobody has yet said what "it needs" is. You
say it, from the visitor's side, so the owner can build the feed once and the build sprints can
start from a contract. The crew doesn't work on the Studio (`CLAUDE.md`): you read its code, you
never edit it, and the feed is a proposal to the owner, not a change you make.

Read first: `ROADMAP.md` (B4, B5 and the riders), `PRODUCT.md`, `.crew/STATE.md`,
`.crew/sprint/17/direction-iris.md` (the four material states, "the revision block as the live
layer", the build order), the approved frames `.crew/sprint/17/design/crew-1440.webp`,
`crew-390.webp`, `rest-1440.webp`, `rest-390.webp` and `main.webp` (the Read tool shows them;
`frames.json` has their titles), `design/research/2026-ui-ux-and-3d.md` section B4 and section C
(the Studio's own glance test), `design/research/2027-redesign.md` from "The portfolio and the
Studio become one experience" to the novelty budget, `.crew/sprint/22/notes-iris.md` sections 5
and 8 (the pencil plank is a folder without a retro; production shows no pencil until B4; the
rest line and "Replay" are B4's; the Date column waits on a source that is right at every build),
`.crew/sprint/24/b3-plan.md` for the form of a plan, `.crew/sprint/27/decisions.md` 9 (B2.10's
script budget on `/` has 10 B left), `e2e/sheet.spec.ts`, `e2e/keyboard.spec.ts` and
`e2e/invariants.spec.ts` for the live guards a fifth bar link and a new route meet, and your memory.

The Studio's code is cloned read-only at `/home/user/theseus-studio` (its `README.md` maps it).
What the portfolio could read from today, and the derivations the feed can be built from:
- `app/api/runs/[runId]/stream/route.ts`: the only public read, an SSE feed of one run by its id;
  nothing public says which run is live. `app/api/site/route.ts` answers only about one run.
- `lib/runs.ts`: `liveRun()` (the run live now, by health), `sprintIndex()` / `listSprints()`
  (one row per sprint), `summaryAt()`; `lib/run-summary.ts`: `RunSummary` and `runStatus()`.
- `lib/health.ts`: `Health` (state, `live`, `label`, `line`, the PR), the one answer to "is it
  working"; `lib/health/doing.ts`: the "now" line in words ("Probe is writing the tests").
- `lib/run-state.ts`: `agentStates()` (working / idle / done per role), `tasks()`.
- `lib/story.ts` and `lib/story/types.ts`: the run told from its events (the moments, the
  contract, the outcome); `lib/sprints.ts`: `SprintRow` (goal, health, times, agents).
- `lib/team.ts`: the personas (name, role, short, charter), keyed by the portfolio's agent types.
- `next.config.ts`: `frame-ancestors 'none'`, so nothing of the Studio can be framed.
- The portfolio's cloud sessions can reach only `/api/ingest` on the Studio (the proxy's rule), so
  the crew can never read the feed from a session: say what the checks use instead (a fixture of
  the contract's shape, and the rest state), and what only the owner can see on the preview.

## Files you own

- `.crew/sprint/28/b4-plan.md`: B4 as S and M sprints in order, each with its outcome in a
  sentence, its size, the visitor-visible checks it adds and the live checks it must keep or
  rewrite, who builds it (Forge; Pixel for the marks on the hull, which are 3D under the
  Full/Calm/Off rules), and what the owner sees at the demo. Settle, from the visitor's side:
  what `/crew` is for a hiring executive and for an engineer; what `/` shows of the crew (the
  pencil plank, the copper tip, the rest line and Replay of `rest-1440.webp`) and what only
  `/crew` does; the honest rest state, since the crew is idle most of the day and a visitor
  mostly arrives then; the Crew link in the bar and the phone bar's fifth link (Iris, sprint 23:
  five don't fit the row at 16 px); the script budget (`/` has 10 B of B2.10 left, so anything
  live on `/` reopens it with the owner; `/crew` is a new route and gets its own budget); whether
  the page updates live in the browser and, if so, how (it needs either CORS on the Studio or a
  route of the portfolio's own) and what WCAG 2.2.2 asks of updates that run past 5 s. Say which
  sprint can start the day the feed exists, and whether anything of B4 can honestly ship before it
  (Atlas's provisional call is no: a `/crew` that can't be live is a stand-in, as the sprint 22
  rule says; argue the other way if the visitor gains).
- `.crew/sprint/28/feed-contract.md`: the read-only API the portfolio asks the Studio for, written
  for the owner to build. One or two endpoints at most, each with its URL, its JSON shape field by
  field, and for every field the Studio derivation it comes from (file and export), so the owner's
  work is plumbing rather than design. Cover: the live run (or none) and its sprint number, goal
  and PR; the health line and the "now" line as the Studio already words them; each role's state;
  the recent moments with their times (how many, which kinds; the direction says each event gets
  one mark, and the research says no raw logs); the last finished run for the rest state, with its
  end and merge times (the Date column's source, sprint 22 notes section 8); the personas if the
  portfolio shouldn't hard-code them. Then: no secrets and nothing that isn't already public on
  the Studio's pages; caching (what `Cache-Control` the Studio sends, how often the portfolio
  reads it on the server and how stale `/crew` may be); errors and absence (what the portfolio
  shows when the feed is down or not yet built: the honest rest state from the retros, as today's
  "Last plank seated" line); and what the owner has to decide (the URL, CORS if the browser polls,
  an env var on Vercel). Keep it to what the first build sprint reads, with the later sprints'
  fields marked as later.

Don't commit: write the files and report, and Atlas commits them on the sprint branch. The
roadmap is edited at the close-out by Atlas from your plan.

## Report

First line the outcome. Then the two files' paths, the sprint sequence in a few lines, your answer
on shipping anything before the feed, the decisions you need and from whom, what you couldn't
verify, and your memory lines (at most three, citing `.crew/sprint/28/`) for Atlas to commit. Reply
to Atlas with that; don't paste the files.
