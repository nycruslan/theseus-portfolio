# Sprint 73 (S): the yard's hint stays clear of the step links at a large font

**Goal:** On every Log record where the yard plays, at a 20 to 28 px default font, "Hold to flip
through the sprints" reads as one clean line or two, and never prints over itself, the step links or
the hand-off to the live crew.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production hides
a fact; sprints 70 to 72 named this one as open. Atlas swept production on 2026-11-16 with WebGL on
(SwiftShader; the hint shows only while the model plays), `/log/72` (the newest, with the hand-off)
and `/log/70`, at 320, 390, 768, 1024, 1440 and 1920 wide, 16, 20, 24 and 28 px default font
through CDP `Page.setFontSizes`:

- The hint's line height is a fixed 14 px while its type is `--step-sm` (0.8125rem), so at a large
  font its glyphs outgrow the line. At 320 × 24 and 28 it wraps to two lines 14 px apart whose text
  is 24 and 27 px tall: the two lines print over each other, "Hold to flip through" over "the
  sprints", on every record (screenshot `hint-72-320x28.png` in Atlas's scratchpad, described in the
  PR).
- On the newest record its text runs into the hand-off link ("Watch the crew build the next one on
  Crew") and ← Sprint p: at 320 × 20 to 28, 390 × 24 and 28, and 1440 and 1920 from 20 px; on
  `/log/70` at 1920 × 24 and 28 it runs into Next.
- Nothing is wrong at 16 px. The text boxes there already touch by 1 to 2 px (the line is 14 px, the
  text box 16), which reads clean: that is the baseline the check holds to, not zero.

## Checks (Probe, T34)

- **T34.** On `/log/70` and the newest record, at 320, 390, 768, 1440 and 1920 wide, with a 16, 20,
  24 and 28 px default font (the root's computed font asserted to have taken, T27's pattern),
  webfont blocked, the hint shown by setting `data-yard` on the model by hand as H3 does (checks
  refuse WebGL): the hint's lines (its text range's client rects) don't overlap one another, and
  its text doesn't overlap the text of either step link or the hand-off link by more than it does at
  16 px at the same width (measure the 16 px overlap in the test; it is 0 to 2 px), the page doesn't
  scroll sideways, and the hint is whole inside the window horizontally. Red on main at 320 × 24
  (lines over each other). Keep the test count small (one per record, looping inside).
- The kept H3 checks (`e2e/log-hand.spec.ts`: the hint shown, wholly in the first screen at 390 ×
  664 and 1440 × 900, and its showing moves nothing) stay green unedited.

## Budgets

- **Nothing moves at 16 px.** At 320, 390, 768, 1024, 1280, 1440 and 1920 with the default font,
  webfont blocked, WebGL off and with `data-yard` set by hand, every box on `/log/23`, `/log/70` and
  the newest record is where it was on main (Forge's box diff, as sprints 68 to 72 measured).
- The hint's line is held whether it shows or not (H3: showing it moves nothing), at every font.
- No script. CSS first (`app/globals.css`, `.record-hint` and its media blocks).

## Ride-along

- Lens's sprint 72 nit: the yard block below 48rem repeats `justify-content: space-between` and
  Next's `margin-left: auto`, which the base rules now give; drop them if nothing moves.

## Out of scope

The hint's words, where it stands at 16 px, /crew's table at 320 × 28, "answering." splitting
mid-word, /log/70's Next landing on the newest record's ← Sprint 70 at 16 px, the bar, owner paths
and `content/`.
