# Sprint 35 (B4c): decisions

1. **The work** (Atlas): the roadmap's next sprint is B4c (`ROADMAP.md`, B4), no owner goal, no PR
   waiting. M: Quill's contract, Probe's checks red first, Forge builds, Iris calls the toggle.
2. **`/crew`'s script budget needs no Owner's pick** (Atlas, on Quill's ask): the plan the owner
   merged in #75 (`.crew/sprint/28/b4-plan.md`, B4.3) says this sprint sets `/crew`'s own budget
   from a measurement, and `/`'s B2.10 is untouched. B4.14 loosens from "the 404's scripts" to "the
   404's files plus at most 16,384 B" (contract), and the PR names it for Lens with that reason.
3. **"Never the Studio URL" means never the feed's address** (Quill, accepted): the run page's
   `url` already appears in `/crew`'s HTML, so `/api/crew` may carry it; `CREW_FEED_URL` never.
4. **Iris's calls** (`notes-iris.md`, written into the contract): Pause is a status-row button
   aligned with Close, "Pause updates" in both states with `aria-pressed`, hidden until the poller
   starts, no motion on updates; the open state's "Paused" becomes "Between sessions".
5. **Lens's four nits on #78 are already done on main** (Quill: `lib/sprint-log.ts` lines 9 to 11,
   `next.config.ts`'s comment, `crew.spec.ts` lines 56 to 65, `STATE_WAIT = 40_000`), so the
   roadmap's rider line is stale and comes off at the close-out.
6. **Probe and Forge build in parallel** in their own worktrees from 6e21330: `e2e/` is Probe's;
   `app/api/crew/`, `app/crew/`, `components/crew*.tsx`, `lib/crew-feed.ts`, `lib/live-layer.ts`
   are Forge's.
