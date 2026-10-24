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
   them either way.

4. **The PR waits for the owner, under `needs-owner`.** The contract asks for the owner's work in
   the Studio, and every B4 sprint builds on it, so the crew takes no next sprint while it waits
   (the sprint skill's rule). Their approval of the head is their "build this"; a comment is a
   revision. Nothing in it retires a check or touches an owner path.

5. **Quill alone.** The frames are approved (`crew-1440.webp`, `crew-390.webp`, the rest frames),
   so there is no direction to open; Iris reviews the build sprints. Forge and Pixel aren't
   needed to read the Studio's types, which Atlas read first and Quill reads for the contract.
