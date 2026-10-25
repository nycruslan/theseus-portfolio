# Sprint 31 decisions (Atlas)

1. **Sprint 31 starts beside a waiting PR, on B4's first build.** The pre-flight
   (`node .crew/next-sprint.mjs`) found #77 (sprint 30, `sprint/30-b5a-log`, B5a) waiting for the
   owner, next 31, four of the day's six merged; no owner goal came with the run, which #75's merge
   started. Its `update` list named #77, but GitHub had `mergeable: null` at that moment and now
   reports `mergeable: true` (#77's merge-base with main is main's own head, `7d23043`), so there
   was nothing to merge and nothing was pushed to #77. Nothing to remind.

2. **#75's merge is the owner's "build the feed to this contract".** Sprint 28's decision 7 said
   B4.1 starts on that approval, against the contract's fixtures, and merges only once the real
   feed answers on its preview. The owner left no comment on #75 (the issue comments carry only
   Vercel's and Atlas's), so the contract's seven recommendations stand as written
   (`.crew/sprint/28/feed-contract.md`, "What the owner decides"): the URL, `CREW_FEED_URL`, no
   CORS, quotes shown and marked, the Rules copy made true, the proxy rule (optional), the Studio
   link. The owner sees each on this sprint's preview and PR.

3. **Sprint 31 is B4a: `/crew` from the feed, and the Crew link.** B4's sprints take letters, as
   B5's do (B4a to B4e), so that the checks can be numbered B4.1, B4.2… without naming a sprint;
   the roadmap's tick records the rename. It neither repeats nor builds on #77: `/crew` reads the
   feed and the retros, nothing of `/log` (`.crew/sprint/29/b5-plan.md`, "Which B5 sprint waits
   for B4": none, "whichever merges second rebases"). Size M, at the top of M, like sprint 30: a
   route, a feed reader with four states, a bar change on every page, a fixture harness, and the
   rewrites of B2.3, the Tab-stop count, `ROUTES` and B2.10. Branch `sprint/31-b4a-crew`.

4. **The shared files with #77, and how the second merge stays cheap.** #77 edits
   `components/bar.tsx` (the control becomes a slot the sheet passes in, Log's `href`),
   `app/page.tsx`, `app/sitemap.ts`, and the specs B4a rewrites (`sheet.spec.ts` B2.3,
   `keyboard.spec.ts`, `helpers.ts` `ROUTES`, `read.spec.ts` B2.10, `invariants.spec.ts`,
   `content.spec.ts`). Forge takes #77's slot change verbatim first (`git show
   origin/sprint/30-b5a-log -- components/bar.tsx app/page.tsx`) and adds Crew on top: `/crew`
   needs it anyway (the control's chunk must not reach `/crew`, which has no model until B4d), and
   an identical hunk on both sides merges without a conflict. Probe keeps the spec edits additive
   (new entries, new tests, the same assertions) and reads #77's versions of the same tests so the
   merge target is known. If #77 merges during this run, Atlas merges `origin/main` into the sprint
   branch and Forge and Probe resolve their files. If it merges after this PR waits for the owner,
   the next run's pre-flight `update` rule applies; the PR body names the files and says the
   resolution is "both sides".

5. **Four roles from the first minute.** Quill writes `contract.md` (the checks, grounded in
   measurements on production and in Forge's cache measurement), Iris her notes, Probe the
   fixtures, the fixture server and the checks, Forge the feed reader and the page, all from the
   feed contract, the plan and the frames, as sprint 30 ran (`.crew/STATE.md`, "A resumed sprint
   starts the build at once"). The contract lands within about ninety minutes and Probe's checks
   and Forge's build take it as it lands; until then both build to the plan's B4.1 section and the
   data rules in the briefs.

6. **The first thing to settle: how a fixture state reaches a server built without a feed.** CI
   builds once with no `CREW_FEED_URL`, so the prerender holds the down state, and the read's
   `cacheLife({ stale: 30, revalidate: 30, expire: 300 })` decides when a `next start` with the
   variable set shows the fixture (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md`,
   "Prerendering behavior": at 30 s to 5 minutes the read is prerendered but out of the App Shell).
   Forge measures it first (the build stays static under `ensureStatic`; a start with the variable
   set after a build without it; a fixture that changes its answer; two starts on one build) and
   reports within the hour; Atlas relays to Probe and Quill, and the contract names the mechanism.

7. **The script budget is counted against `/sprints'`,** as B2.10 does on main. If #77 merges
   first, the baseline becomes `/log` (`b5-plan.md`'s amendment), which Probe takes at the merge.

8. **Ports and worktrees, as sprint 30.** Probe 4710 to 4719 in `/home/user/wt-probe-31` on
   `probe/31`; Iris 4720 to 4729 in `/home/user/wt-iris-31`; Forge 4730 to 4739 in
   `/home/user/wt-forge-31` on `forge/31`; Quill 4740 to 4749 in `/home/user/wt-quill-31` on
   `quill/31`. Roles push after every commit; Atlas cherry-picks onto `sprint/31-b4a-crew` as
   commits land and pushes.

## The second run (Atlas, from 22:26 UTC)

9. **The first run stopped after the build.** At 22:26 the pre-flight said `continue` on #78: its
   last commit was 20:02, past the two-hour rule. Forge's build (`forge/31`, to c127eb2) and
   Probe's checks (`probe/31`, to 6aafbf8) were done on their branches but not on the sprint
   branch, and Iris's Part 1 notes never reached git (Forge's 680d11c took them). Atlas merged
   both branches (Probe's side for the e2e files both had, as his were newer) as 6c749db.

10. **#77 merged first, so this branch merged main** (decision 4's plan): Forge resolved the
    product files (both sides; Crew on #77's slot bar, Log's href `/log`) and added Read as page's
    foot to `/log` and `/log/<n>`, since below 768 the bar no longer shows it; Probe resolved the
    specs (both sides, `ROUTES` with `/crew`, `/log`, `/log/13`), pinned Log to `/log`, moved
    B2.10's and B4.14's baseline to `/log` (decision 7), and gave #77's Log checks the Crew link,
    rewriting two that the new bar made vacuous or wrong (`expectSkeleton`'s Crew count, C9.4's
    hidden link), none weaker. 74dd3fd; `pnpm verify` and 180 of 180 e2e passed on it.

11. **Iris ran on Opus,** as main's `design-director.md` sets it since #81: her first start on this
    branch's older file hit the weekly Fable limit. Her verdict was `changes` (7.0): two musts in
    `app/globals.css` (mid-word breaks in the crew table, Evidence's target over Approval below
    1024), two cheap CSS changes and two sentences tightened, all taken in one fix round. She
    keeps the Log's foot where Forge put it. Her answers to the contract's four calls are in
    `review-iris.md`.

12. **Main's sprint 33 merged in (third run, 2026-10-25),** as the owner asked on #78: below 768
    the Log's header ends in one row, `<Foot control={<MotionControl />} />`, holding Read as page
    and the motion control; the bar's `at` keeps `"crew"`, and `/crew` has no control until B4d.
    Forge resolved the product code (B5c's interim `.log > [data-motion]` rule is gone; script
    bytes unchanged, `/crew` 0 B over the 404). Probe resolved the specs with every assertion from
    both sides and added the combined row's check (one row after `.log-head`, Read as page then
    Full, Calm, Off in DOM and visual order, 44 px targets, the Tab path from Contact); the bar
    names Crew once, so main's `crew: false` became `1`.

13. **A failed feed read keeps the last good answer** (the owner's measurement on #78): a non-200,
    the 2 s timeout, a network error or a non-JSON body shows the last good answer while its
    `asOf` is within `STALE_MS`, instead of caching `down` for 30 s; an answer the data rules
    refuse still reads down and drops the kept one (`lib/crew-feed.ts`). The new check "B4.2 kept"
    (503, non-JSON, late) was red on 91d7d64. B4.2's down-503, down-json and down-late now start
    from a live answer 9 min 50 s old, so they still assert down: the contract's down rule moved,
    and the assertion is unchanged. Limits, for a later sprint if the preview shows them: the kept
    answer lives in one server instance's memory, and after more than 10 idle minutes the first
    read still reads down on a timeout. 209 of 210 e2e passed on the full run; the one failure was
    the new row check's own overlap rule (the control's buttons share a 1 px border since sprint
    27), fixed and passing on rerun.
