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
- The `width < 20rem` block loses the wrap rules the base rules now carry; its layout is the same.
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
- `pnpm verify` exits 0 on the integrated head (Atlas). Forge ran every `log*`, `large-font*` and
  `sheet` spec on the fix: 176 passed. CI runs the whole suite.

## Decisions

1. Steps stay right-aligned when they stack (Forge): the record from 768 keeps them at its right,
   and a left-aligned ← Sprint p read as one group with Rev.
2. The column keeps its fixed width rather than growing with the font: that would shrink the
   drawings, a design call outside this scope (follow-up).

## Left open

- Iris's look at the stacked head: Rev's row meets ← Sprint p's with no gap, and the wrap follows
  the digit count (at 1536 × 24 Next sits on Rev's row on /log/1, a row down on 2 to 8, two from 9).
- The yard's hint over the hand-off link with WebGL on; /crew's table at 320 × 28; "answering."
  splitting mid-word (sprint 70's follow-ups).
- Safari, Firefox and the Vercel preview were not measured by the builders.
