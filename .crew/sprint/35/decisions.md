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
7. **B4.31's fixture** (Atlas, on Forge's finding): the live and resting answers were different
   runs with goals of different lengths, so the chip moved Pause's row by 25 px. The resting answer
   now keeps the live run's sprint and goal, as a run that ends while a visitor watches does
   (Probe's bad213c, which also pins Pause's top to its row's top).
8. **Iris's two calls go to follow-ups, not this PR** (Atlas): the first visit after a quiet spell
   gets #88's stale prerender, and its first poll replaces the panel (CLS 0.115 to 0.128 at 1440):
   a later sprint gives `/crew` alone a long cache `expire`, since its poll now corrects a stale page.
   The Studio's role lines (about 140 characters) reflow the table on about half the polls: a short
   line is the Studio's to send, so it goes on the roadmap as an open item for the owner; clamping
   it here would change B4a's "the line whole".
9. **Unverified for want of access:** the preview's CDN behaviour for `/api/crew` (the proxy refuses
   preview hosts) and a real screen reader; both named in the PR.
