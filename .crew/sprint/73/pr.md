## Sprint 73 (S): the yard's hint stays clear of the step links at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on
every Log record where the yard plays, at a 24 or 28 px default font on a phone, "Hold to flip
through the sprints" printed its two lines over each other, and from 20 px its text ran into the
newest record's hand-off link and, on other records, the goal under it. Named in sprints 70 to 72,
confirmed by Atlas's sweep of production on 2026-11-16 with WebGL on.

**Size:** S. Contract: `.crew/sprint/73/contract.md`; decisions: `.crew/sprint/73/decisions.md`.

## What changed for a visitor

- **The hint's line grows with the font (`app/globals.css`, `.record-hint`).** Its line height was a
  fixed 14 px while its type, `--step-sm`, is in rem, so its 1rem-tall text outgrew the line from a
  20 px default font (Forge's root cause). The line is now `max(14px, 1.5rem - 10px)`, set once as
  `--hint-line` on `.log-open`: exactly 14 px at 16 px, and from 20 px tall enough to hold the text.
- **Below 48rem the ghost's caption reads the same term** (`margin-top: calc(62px +
  var(--hint-line))`, was 76 px), so the row the hint holds there stays in step with it.
- **Ride-along (Lens's sprint 72 nit):** the yard block below 48rem no longer repeats
  `justify-content: space-between` and Next's `margin-left: auto`, which the base rules give.
- CSS only: no markup, no script.

## Evidence

- **Production, before** (Atlas, WebGL on through SwiftShader, `/log/72` and `/log/70`, 320 to 1920,
  16 to 28 px through CDP `Page.setFontSizes`): at 320 × 24 and 28 the hint's two lines sit 14 px
  apart with 24 and 27 px text, "Hold to flip through" printed over "the sprints". At 390 × 24 its
  descenders sat on the hand-off's underline.
- **T34** (`e2e/large-font-hint.spec.ts`, new; Probe): two tests, `/log/70` and the newest record
  (from `e2e/retros.ts`, not hard-coded), 320 to 1920 × 16 to 28 px, webfont blocked, the hint shown
  by setting `data-yard` by hand as H3 does. Red on main in 21 cases: lines over each other at 320 ×
  24 and 28 on both records; the hint's text into the hand-off at 320 × 20 to 28, 390 × 24 and 28,
  1440 × 20 and 1920 × 20 to 28; into the goal's h2 on `/log/70` at 320 and 390 × 20 to 28 and 1920
  × 24 and 28. 4.1 s for both tests. Probe diffed the shard lists: shard 2 gains two cheap tests and
  loses Y7 to shard 3.
- **On the fix** (Atlas, integrated head f22fded): T34, `log-hand.spec.ts` (H3 unedited),
  `large-font.spec.ts`, `-bar`, `-steps` and `log-yard.spec.ts`: 42 passed in 5.8 min.
- **Nothing moves at 16 px** (Atlas): 0 of 43,806 boxes in `main` on `/log/23`, `/log/70` and
  `/log/72` at 320, 390, 768, 1024, 1280, 1440 and 1920, webfont blocked, with and without
  `data-yard` set by hand. The read compares the fix's build against the same build with main's
  four rules put back, since sprint 72's merge record changes the pages' content between main and
  this branch. The plan drawing's `.plan-plank` spans are left out: they move between two reads of
  the same CSS.
- **With WebGL on, after** (Atlas, local build): 320 × 28 shows two clean lines under ← Sprint 71
  and over the hand-off, 390 × 24 one line clear of it, and 768 × 16 matches production. The sweep
  finds no line over another at any of the 24 cases.
- `pnpm verify` exits 0 on the integrated head.

## Decisions

1. T34 reads words against words, not against the links' boxes, and also holds the hint off every
   other word on the page to the 16 px read (Probe's clause, kept by Atlas). The contract's "runs
   into ← Sprint p and Next" came from measuring the hint's text against the links' 44 px boxes;
   word on word it never touches either step link, and what it runs into on `/log/70` is the goal.
2. Iris wasn't brought in: the change is a line height whose 16 px look doesn't move, and Atlas
   looked at the large-font screenshots on the fix.

## Left open

- /crew's table scrolls sideways at 320 × 28, and "answering." splits mid-word at 320 and 390 with
  24 or 28 px (sprint 70's follow-ups, the next candidates).
- At 16 px a repeated click on /log/70's Next lands on the newest record's ← Sprint 70 (sprint 72).
- `pnpm build` intermittently stops on a Next.js "SecurityFatalError" notice about 16.4.3's
  advisories, which passes on a retry; nobody ran the upgrade it suggests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvc2AiLkayyMPZKooC4
