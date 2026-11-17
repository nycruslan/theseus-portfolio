## Sprint 74 (S): /crew's panel keeps whole words at a large font on a phone

**Goal** (the roadmap's stand-down rule: a defect on production that hides a fact): on `/crew`, on a
phone with a 20 to 28 px default font, the live panel's status, its "Replay sprint n" entry and the
Activity heading read as whole words, and the page never scrolls sideways, feed live or down.

**Size:** S. Contract: `.crew/sprint/74/contract.md`. Decisions: `.crew/sprint/74/decisions.md`.

### The defect, on production

At 320 × 28 (CDP `Page.setFontSizes`), "Pause updates" kept its whole width in the status row's
`auto` column and left the status 62 px: "Crew resting. Sprint 73 merged." printed as "Cre / w /
resti / ng. / Spri / nt / 73 / mer / ged.", the entry as "Rep / lay / spri / nt", the heading as
"Activi / ty". With the feed down, "answering." split from 320 × 24 to 390 × 28 and the table
scrolled the page 18 px at 320 × 28.

### The fix (`app/globals.css`)

- The status row and the Activity head (with a replay offered) are flex rows that wrap: the button
  keeps the row's top right; the text breaks only between words, and where its longest word doesn't
  fit beside the button it takes its own lines under it. The entry stays the status's next line.
- Below 20rem, the table's role words ("Roadmap, AI agent") wrap between words; never at 16 px.
- Ride-alongs: Lens's sprint 73 nits (T34's header and shard comment, the `.record-hint` comment).

### Checks and evidence

- **T35** (`e2e/large-font-crew.spec.ts`, new; three tests: resting with a replay, feed down,
  mid-replay; 320, 360, 390 × 16, 20, 24, 28 px, webfont blocked): no word of the status, entry or
  heading breaks, no word overlaps its button, no sideways scroll. Red on main's CSS (3 failed, 11
  cases), green with the fix (Probe, Forge). About 11 s; it lands in shard 1.
- **Nothing moves at 16 px:** 0 of 14,100 boxes on `/crew` in 8 states at 320, 390, 768, 1024, 1440
  and 1920 (Forge's box diff against main's CSS; the control diff of main against itself had 8
  unmatched boxes, from the motion control mounting).
- Forge's word sweep, 320 to 1920 × 16 to 28, 7 states: no broken word, no overlap, no sideways
  scroll with the fix.
- `pnpm verify` passes on the integrated head (Atlas). The whole suite passed on Forge's build, 467
  of 467; every `e2e/crew*.spec.ts` unedited.
- Screenshots (Atlas's scratchpad, not committed): main at 320 × 28 shows the broken status;
  the fix at 320 × 28 shows "Pause updates" top right with the status whole under it, and at
  320 × 24 the status whole beside it in eight short lines.

### Retired checks

None.

### Not verified

Safari and Firefox; production after the merge.
