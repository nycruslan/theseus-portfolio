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

### Needs owner decision

`needs-owner`: the PR waits for you.

1. **Read as page moves below 768** from the bar to the drawing's foot on `/`, as `rest-390.webp`
   draws it. On `/crew` and `/log` it moves the same way.
2. **Set `CREW_FEED_URL`** on the portfolio's Vercel project, server-side, for Preview and
   Production, to the feed's URL. Until it is set, `/crew` shows the down state, which is what this
   preview shows.
3. **The now line's quotes** are shown and marked "Atlas: “…”" (feed contract, decision 4).
4. **The Rules copy**, which replaces the frame's untrue line.
5. **The link to the run's page on the Studio** in Evidence (decision 7).
6. **This PR merges only once the real feed answers on its preview,** with `/crew` showing `live`
   or `open` for this sprint's run. You merge it.
