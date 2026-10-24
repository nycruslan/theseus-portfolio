# Sprint 28 decisions (Atlas)

1. **Sprint 28 is the roadmap's next sprint, started by #74's merge.** The pre-flight
   (`node .crew/next-sprint.mjs`) found nothing open, next 28, four of the day's six merged; no
   owner goal came with the run. The milestone's next item is B4, "`/crew`, the crew at work, from
   the Studio's data".

2. **B4 can't start as a build: the Studio has no feed for it.** The portfolio's hooks post to the
   Studio's `/api/ingest`, and the Studio's only public read is `/api/runs/<id>/stream`, a
   Server-Sent Events feed of one run by its id; nothing public says which run is live, lists the
   runs or sums a run up, and the Studio can't be framed (`frame-ancestors 'none'`). The Studio's
   own `ROADMAP.md` lists "Serve the portfolio's `/crew` (redesign B4)" as unbuilt, "a small cached
   read-only API" that gives the portfolio "what it needs", and nothing yet says what it needs.
   Read from a read-only clone of nycruslan/theseus-studio at `64347d6`, attached to this session
   for reading (the crew doesn't work on the Studio, so nothing there is edited): its
   `README.md`, `app/api/`, `lib/runs.ts`, `lib/run-summary.ts`, `lib/health.ts`, `lib/team.ts`,
   `next.config.ts`, `ROADMAP.md`. The cloud's proxy allows the crew `/api/ingest` on the Studio
   and nothing else, so no session can read a feed either way; the checks will run on a fixture of
   the contract's shape and the owner sees the live page on a preview.

3. **So sprint 28 is B4's plan and the feed's contract, not a page.** Sized M by the decision it
   carries (what `/crew` is, what `/` shows of the crew, what the Studio must serve), with no
   product code: Quill writes `b4-plan.md` (B4 as S and M sprints, as `.crew/sprint/24/b3-plan.md`
   did for B3) and `feed-contract.md` (the read-only API, field by field, each field traced to the
   Studio derivation it comes from, for the owner to build). The alternatives: standing down
   (nothing moves, and the owner's Studio item stays unspecified) or building a `/crew` that can't
   be live (a stand-in, which sprint 22's rule forbids, and a page that would be rebuilt to the
   feed's real shape). A plan the owner can build against moves the milestone; the rest waits on
   them either way. There is no `contract.md`: the sprint is a plan with no product code and no
   visitor-visible check, so it is judged against `brief-quill.md`, as Lens did.

4. **The PR waits for the owner, under `needs-owner`.** The contract asks for the owner's work in
   the Studio, and every B4 sprint builds on it, so the crew takes no next sprint while it waits
   (the sprint skill's rule). Their approval of the head is their "build this"; a comment is a
   revision. Nothing in it retires a check or touches an owner path.

5. **Quill alone.** The frames are approved (`crew-1440.webp`, `crew-390.webp`, the rest frames),
   so there is no direction to open; Iris reviews the build sprints. Forge and Pixel aren't
   needed to read the Studio's types, which Atlas read first and Quill reads for the contract.

6. **Quill's plan and contract are taken as written, with one correction.** `b4-plan.md` makes
   B4 five M sprints after the feed (B4.1 `/crew` and the Crew link; B4.2 the live layer on `/`;
   B4.3 `/crew` live in the browser through the portfolio's own `/api/crew`; B4.4 the hull on
   `/crew` with one mark per moment; B4.5 Replay), and `feed-contract.md` asks for one endpoint,
   `GET /api/crew`, every field traced to a Studio derivation (checked against the clone: `liveRun`,
   `sprintIndex`, `tellRun`, `agentProfiles`, `agentLine`, `health`, `present`, `momentText`,
   `PullState.mergedAt`, the `Moment` kinds). The correction is the portfolio's cache note: a
   `cacheLife` of `stale` 30 is included in a prerender but kept out of the route's App Shell, not
   "prerendered into the shell"; the first build measures that `/` stays static. Quill's claim that
   production has no rest line holds: production's HTML has no "plank seated" or "resting" text
   (sprint 22's contract dropped it), so B4.2 adds it from the feed.

7. **Nothing of B4 ships before the feed, and B4.1 starts on the contract's approval.** Quill
   looked for a visitor's gain in a `/crew` from the retros, the phone re-lay, a rest line without
   a time or a link out to the Studio, and found none (plan, "Before the feed"); the provisional
   call in 3 stands. The owner's approval of this PR's head freezes the feed's shape, so the next
   run may start B4.1 against the contract's fixtures without waiting for the Studio's deploy;
   B4.1's PR waits for the owner anyway (Read as page moves on phones, `CREW_FEED_URL` on Vercel)
   and merges only once the real feed answers on its preview. If the owner changes the contract
   in a comment instead, the next run revises it here first.

8. **Lens's two nits, taken as notes.** The contract's example gave `last` an empty roster against
   the type's seven roles: the example now carries the seven, and the type says `last` has them
   too (`done` or `not-called`), so Probe's fixtures and B4.1's shape check agree. And decision 3
   now says why the sprint has no `contract.md`.
