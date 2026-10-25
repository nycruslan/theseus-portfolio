## Sprint 31: `/crew` from the feed, and the Crew link (B4a)

**Goal (roadmap):** B4a, the first build sprint of B4 "`/crew`, the crew at work, from the Studio's
data", as sprint 28 planned it (`.crew/sprint/28/b4-plan.md`, B4.1; B4's sprints now take letters,
B4a to B4e, like B5's). The owner approved the feed's contract by merging #75. This sprint is built
against fixtures of the contract's shape, and it merges only once the real feed answers on its
preview.

**Size:** M, at the top of M. Contract: `.crew/sprint/31/contract.md` (Quill). Decisions:
`.crew/sprint/31/decisions.md`. Iris's review: `.crew/sprint/31/review-iris.md`.

### What a visitor gets

- **`/crew`**, server-rendered from `CREW_FEED_URL` with no client code. At the left is the
  sheet's 2D lines plan. At the right is the panel: "Crew", a Close link, the sprint chip and goal,
  the status line, the seven roles with their state words, the now line, up to ten moments with UTC
  times, and Evidence, Approval and Rules.
- **Four states from one cached read** (30 s): live, open, resting and down. With no feed, a bad
  answer or one more than 10 minutes stale, the page says "The live feed isn't answering" and shows
  the record from the retros. It never pretends to be live.
- **Crew in the bar on every page.** Below 768, Read as page moves from the bar to the drawing's
  foot: on `/` beside the control, on `/crew` alone, and on `/log` after the count line.

### The checks

B4.1 to B4.14, which Probe wrote first and which failed on main, now pass. #77's checks have been
rewritten for the new bar. After the merge with main, `pnpm verify` passes and the full e2e suite
passes 180 of 180 (74dd3fd). After the fix round, verify passes and the suite passes 180 of 180 again (e389e1a, with only notes after it).

### Merged with #77

#77 (`/log`) merged during this sprint, so this branch merged main, resolved the conflicts keeping
both sides, and pinned Log's link to `/log`. The script budget's baseline is now `/log`, as
decision 7 planned. Two of #77's Log checks that the new bar made vacuous or wrong were rewritten,
neither of them weaker: `expectSkeleton`'s Crew count and C9.4's hidden link
(`decisions.md` 10).

### Iris

Her verdict was `changes` (7.0). The fix round took her two musts (crew-table names breaking
mid-word, and Evidence's target overlapping Approval below 1024), her two cheap CSS changes and her
two tightened sentences. With both musts fixed she would say ship (7.9). Forge also dropped
Evidence's 24 px row gap, which only offset the negative margins Must 2 removed; without that
change, a wrapped Evidence read as two groups at 320. Atlas took this as part of the must. The axe scan found 0
violations, CLS is 0, nothing moves, nothing scrolls sideways at 320, and phone LCP is 1.6 s.

What departs from the approved frames:
- **The drawing.** It is the 2D lines plan, not the 3D hull, so there is no pencil plank or copper
  tip yet; those come with B4b and B4d.
- **No motion control on `/crew`.**
- **Read as page moves below 768.** On phones it sits at the drawing's foot instead of in the bar.
- **The Rules line is new copy,** written to be true of the Studio.
- **Additions the frames don't draw:** a status line, the state word Done, the plank-number chip,
  dated moments, all three facts (Evidence, Approval and Rules) on phones, and "This run on the
  Studio".

### Merged with #83, and the feed's kept answer

Sprint 33 (#83, the 3D ghost hull on `/log`) merged, so this branch merged main again, as the owner
asked on this PR: below 768 the Log's header ends in one row, `<Foot control={<MotionControl />} />`,
with Read as page and then Full, Calm and Off; `/crew` keeps its bar with Crew current and no
control until B4d. Probe's checks keep every assertion from both sides and add the combined row's
(order, 44 px targets, inside the viewport at 320 and 390, the Tab path from Contact); the bar names
Crew once on every page, so main's `crew: false` is now `1` (`decisions.md` 12).

From the owner's measurement of the feed: a failed read (non-200, the 2 s timeout, a network error,
a non-JSON body) now keeps the last good answer while its `asOf` is under 10 minutes old, instead
of caching `down` for 30 s (`lib/crew-feed.ts`). The new check "B4.2 kept" was red on 91d7d64.
**Changed check, for Lens:** B4.2's down-503, down-json and down-late now start from a live answer
9 min 50 s old, since a fresh one is now kept by design; each still asserts down and the default
panel (`decisions.md` 13). The full suite passed 209 of 210 on 2596594's tree; the one failure was
the new row check's own overlap rule (the control's buttons share a 1 px border), fixed and passing
on rerun.

### Needs owner decision

`needs-owner`: the PR waits for you. Answered on this PR on 2026-10-25: Read as page below 768
stands as Iris drew it; `CREW_FEED_URL` is set for Production and Preview; the now line's quotes,
the Rules copy and the Studio link are accepted as on #75. What remains is the owner's approval:
this PR merges only once the real feed answers on its preview, with `/crew` showing `live` or
`open` for a real run and the checks passing on the head. You merge it.
