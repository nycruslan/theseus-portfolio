## Sprint 72 (S): a Log record's step links stay inside the window at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on
every Log record, from 1536 px wide at a 24 or 28 px default font, the next step link "Seat sprint
n's plank →" ran 23 to 78 px past the window and the page scrolled sideways. Named in sprints 70
and 71, confirmed by Atlas's sweep of production on 2026-11-16.

**Size:** S. Contract: `.crew/sprint/72/contract.md`.

## What changed for a visitor

- **The record's head wraps (`app/globals.css`, `.record-top` and `.record-steps`).** From 64rem
  the record's column is a fixed 360 px (444 from 80rem) while Rev and the step links are in rem,
  and the head was a flex row that couldn't wrap, so at a large font the steps ran out of the
  column and, from 1536 × 24 and 1792 × 28, out of the window (Forge's root cause). Now, when Rev
  and the steps don't share a row, the steps take the row under Rev, at its right; when the two
  links don't fit side by side, Next stands under ← Sprint p, 4 px apart. At 20 px Rev no longer
  splits onto two lines.
- **Fix round 1 (Iris):** stacked, ← Sprint p stands at the start under the number and Next at the
  end, as on phones (`justify-content: space-between`, Next `margin-left: auto`). The first build
  stacked both at the right, and a click repeated on Next went back a record at 1536 × 24 (Next's
  point on /log/10 hit ← Sprint 10 on /log/11). Rev's row and the steps keep no gap (Iris).
- The `width < 20rem` block loses the rules the base rules now carry; its layout is the same.
- CSS only: no markup, no script.

## Evidence

- **Production, before** (Atlas, `/log/1`, `/log/23`, `/log/45`, `/log/70`, 1280 to 1920, 16 to 28
  px, real webfont): sideways scroll of 23 px at 1536, 1600, 1792 × 24 and 69 to 78 px at 1792,
  1920 × 28, the next link's arrow out of the window.
- **After (Forge, local production build, webfont blocked, WebGL off and on):** 0 of 80 cases bad on
  /log/23, /log/45, /log/70 and /log/71 (the newest) at 1280, 1536, 1600, 1792, 1920 × 16 to 28 px;
  also 0 on /log/1, 2, 3, 5, 8, 9, 10, 11. The riffle still runs (a held Next on /log/5 at
  1536 × 24 with WebGL on).
- **Nothing moves at 16 px:** 0 of 47,943 boxes (scripts on and off) on /log/23, /log/70 and /log/71
  at 390, 768, 1024, 1280, 1440, 1536 and 1920; 0 of 67,194 with the webfont; 0 of 20,127 at 300 to
  320. Main against itself read 0.
- **T33** (`e2e/large-font-steps.spec.ts`, new; Probe): three tests, one per record (/log/23, 45,
  70), 1280 to 1920 × 16 to 28 px, webfont blocked: both links whole, unclipped and inside the
  window, no clipping ancestor, no overlap with each other or Rev, no sideways scroll. Red on main
  in all three at the contract's five cases (24 px of scroll at 1536 to 1792 × 24, 66 at 1792 and
  1920 × 28); an `overflow: hidden` mutant on `.record-steps` stays red (the link is cut). Green on
  the fix, 7 of 7 with T32 (Probe and Forge, each on their own build). Sorts into shard 1; shard 2
  gets about 70 test-s lighter.
- **T32** (`e2e/large-font-bar.spec.ts`): its `.record-steps` exclusion is gone, so its sideways
  read covers the whole page again; red on main at /log/23 1920 × 28, green on the fix.
- **T33b** (same spec; Probe, on Iris's finding): at 1536 × 24 and 1792 × 28, webfont blocked and
  loaded, across /log/8 to 11 and 23 to 24, Next's centre and arrow point on record n never hit ← Sprint
  p on record n + 1. Red on the first build (85b57b5) at /log/8→9 and /log/10→11; green on the fix
  round, 8 of 8 with T33 and T32 (Probe and Forge). Forge's own read: 37 of 648 repeated clicks
  landed on the opposite step before, 8 after, all 8 at 16 px on /log/70→71 and the same on main.
- After the fix round, nothing moves at 16 px still: 0 of 47,943 boxes, 0 of 20,127 at 300 to 320.
- `pnpm verify` exits 0 on the integrated head (Atlas, on 44fa37e's tree). Forge ran every `log*`, `large-font*` and
  `sheet` spec on the fix: 176 passed. CI runs the whole suite.

## Decisions

1. When the steps stack, ← Sprint p stands at the start under the number and Next at the end, as on
   phones (Iris's fix round). It replaced the first build's right-aligned stack, after which a
   repeated click on Next went back a record.
2. The column keeps its fixed width rather than growing with the font: that would shrink the
   drawings, a design call outside this scope (follow-up).

3. Rev's row meets the steps with no gap, and the wrap follows the digit count (Iris: the three
   lines are evenly spaced at 0, and once each direction keeps its edge the count only changes the
   head's height, as the Log column above already does).
4. The 16 px bounce between /log/70's Next and the newest record's ← Sprint 70 is older than this
   sprint (main does it too) and fixing it moves boxes at 16 px, so it is a follow-up (Atlas).

## Review

`lens` and `gate` ended in `startup_failure`, with no jobs, from 16:15 to 21:09 UTC (Owner chores
#144), while CI passed. They started again when the `review` label was re-added at 21:09:
`gate` passed, and Lens said ship on 38188f5 with two nits on these notes, both fixed in the
close-out (Decision 1, and the retro's and roadmap's records of the review).

## Left open

- At 16 px, a repeated click on /log/70's Next lands on the newest record's ← Sprint 70 (on main too).
- At 1536 × 24 and 1792 × 28, /log/70's Next lands on the newest record's hand-off link, and the
  step links sit at or under the fold (Iris).
- The yard block below 48rem repeats the base rules' `space-between` and Next's margin (Forge).
- The yard's hint over the hand-off link with WebGL on; /crew's table at 320 × 28; "answering."
  splitting mid-word (sprint 70's follow-ups).
- Safari, Firefox and the Vercel preview were not measured by the builders.
