# Sprint 72 (S): a record's step links stay in the window at a large font

**Goal:** On the Log's records, the step links ("← Sprint p" and "Seat sprint n's plank →") stay
inside the window at a large default font, so the page never scrolls sideways and Next's arrow is
never cut off.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production
hides a fact or makes the site say something false; sprints 70 and 71 named this one as the next
candidate (`.crew/sprint/71/retro.json`, followUps). Atlas swept production on 2026-11-16 (`/log`,
`/log/1`, `/log/23`, `/log/45`, `/log/71`; 1280 to 2560 wide × 900; 16, 20, 24 and 28 px default
font through CDP `Page.setFontSizes`):

- `/log/23` and `/log/45` scroll sideways by 23 px at 1536, 1600 and 1792 × 24, and by 78 px at
  1792 and 1920 × 28. What runs past the window is `.record-steps`, its Next link and its
  `.step-arrow`.
- Nothing scrolls at 16 or 20 px, at 1280 or 1440, at 2560, or on `/log`, `/log/1` and `/log/71`
  in that sweep. Forge then swept every step on a local build: every step with both links, `/log/2`
  to `/log/70` (68 pages; there's no 16), scrolls sideways at 1792 and 1920 × 28, and 61 of them at
  1536 to 1792 × 24; `/log/2` to `/log/8` don't scroll at 24 but run 34 px past the record's frame.
  `/log/1` and the newest step, with one link each, don't.
- Cut at the window's edge, Next's words and arrow can't be read whole, and the page pans under
  the reader.

## Checks (Probe, T33, in `e2e/large-font-bar.spec.ts` or a new spec, Probe's call by shard time)

- **T33.** On every step page Forge's sweep finds affected, plus `/log/1` and the newest step, at
  1536, 1600, 1792 and 1920 × 900 with a 16, 20, 24 and 28 px default font (the root's computed
  font asserted to have taken, T27's pattern), webfont blocked: both step links' boxes, their
  arrows included, are whole inside the window, their text isn't clipped (scrollWidth within
  clientWidth), and the page doesn't scroll sideways. Red on main at 24 and 28 px. Few tests,
  looping inside, so the shard doesn't grow.
- A mutant that hides the overflow (`.record-steps { overflow: hidden }` or `overflow-x: clip` on
  the page) must stay red.
- T32's sideways-scroll read leaves out `.record-steps` by name (`.crew/sprint/71/pr.md`,
  Decisions 3). Once the fix lands, drop that exclusion so T32 reads the whole page.

## Budgets

- **Nothing moves at 16 px.** At 768, 1024, 1280, 1440 and 1920 with the default font, webfont
  blocked, every box on `/log`, `/log/1`, `/log/23`, `/log/45` and the newest step is where it was
  on main (Forge's box diff, as sprints 68 to 71 measured), scripts on and off.
- The step links stay 44 px targets below 1024 and keep their words, order and arrows.
- No script. CSS first (`app/globals.css`); `components/log-record.tsx` only if CSS alone can't.

## Out of scope

The step links' words, the yard's behaviour and its 3D, the hint's placement, the other large-font
follow-ups (the yard's hint over the hand-off link with WebGL on, /crew's table at 320 × 28,
"answering." splitting mid-word), Lens's 2 px note on the motion slot, owner paths and `content/`.
