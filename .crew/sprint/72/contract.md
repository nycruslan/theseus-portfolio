# Sprint 72 (S): a Log record's step links stay inside the window at a large font

**Goal:** On every Log record, from 1536 px wide at a 24 or 28 px default font, "Seat sprint n's
plank →" stays inside the window and the page no longer scrolls sideways.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production
hides a fact; sprints 70 and 71 named this one as the next candidate. Atlas swept production on
2026-11-16 (`/log/1`, `/log/23`, `/log/45`, `/log/70`; 1280, 1440, 1536, 1600, 1792 and 1920 wide;
16, 20, 24 and 28 px default font through CDP `Page.setFontSizes`):

- On every record with a next step, `.record-steps`' right edge, and the next link's arrow with it,
  runs past the window: 23 px at 1536, 1600 and 1792 × 24; 69 to 78 px at 1792 and 1920 × 28. The
  page scrolls sideways and the link's end is out of sight until it does.
- Nothing is wrong at 16 or 20 px, nor at 1280 or 1440 at any font, nor on `/log/1`'s first read.
- The step links are how a visitor walks the yard, one record to the next.

## Checks (Probe, T33)

- **T33.** On `/log/23`, `/log/45` and `/log/70` at 1280, 1536, 1600, 1792 and 1920 × 900, with a 16,
  20, 24 and 28 px default font (the root's computed font asserted to have taken, T27's pattern),
  webfont blocked: both step links' boxes, arrows included, are whole and inside the window, their
  text unclipped (scrollWidth within clientWidth), they don't overlap each other or the record's
  Rev line, and the page doesn't scroll sideways. Red on main at 1536 × 24. Keep the test count
  small (one test per page or per width, looping inside).
- An `overflow: hidden` mutant on `.record-steps` must stay red: a clipped link isn't a fix.
- T32 (`e2e/large-font-bar.spec.ts`) drops its `.record-steps` exclusion (`ELSEWHERE`), so its
  sideways read covers the whole page again.

## Budgets

- **Nothing moves at 16 px.** At 390, 768, 1024, 1280, 1440, 1536 and 1920 with the default font,
  webfont blocked, every box on `/log/23`, `/log/70` and the newest record is where it was on main
  (Forge's box diff, as sprints 68 to 71 measured).
- The links stay 44 px tall below 1024 and 24 from it (Y4); the riffle (hold on a step link) and
  the hand-off row are unchanged.
- No script. CSS first (`app/globals.css`); markup in `components/log-record.tsx` only if CSS alone
  can't do it.

## Out of scope

The links' words and order, the bar, the yard's hint over the hand-off link, /crew's table at
320 × 28, "answering." splitting mid-word, owner paths and `content/`.
