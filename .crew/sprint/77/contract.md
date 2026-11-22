# Sprint 77 (S): a Log record opens with its heading on a short screen

Goal (from the roadmap's stand-down and sprint 76's follow-up, chosen by Atlas): a visitor who
opens a Log record on a short screen sees the sprint's goal, the record's heading, without
scrolling. Today, on production (measured 2026-11-19, direct load of `/log/1` to `/log/76`, the
record's `h2` against the window's foot), every one of the 75 records opens with its heading below
the fold at 320 × 568, 360 × 640, 375 × 667 (iPhone SE and 8), 900 × 700 and 1023 × 768. At 375 ×
667 the heading ends at 732 to 764 px; at 1023 × 768, 825 to 860 px, under two full-width
drawings. 390 × 844, 414 × 896, 768 × 1024, 820 × 1180, 1024 × 768, 1280 × 720, 1366 × 768, 1440 ×
900 and 1920 × 1080 hold all 75. Sprint 76 fixed the 390 × 844 case by moving the lines figure
after the record (`.crew/sprint/76/decisions.md` 4) and left these windows open (its retro's
follow-ups, Iris and Probe).

## Check

- **T37** For every merged record (`/log/<n>` for each merged sprint), loaded directly at 320 ×
  568, 360 × 640, 375 × 667, 390 × 844, 900 × 700, 1023 × 768, 1024 × 768 and 1440 × 900 at the
  default font: the record's `h2` lies wholly inside the window and clear of the sticky bar
  (B5.7's `inView`). It fails on main at 320 × 568, 360 × 640, 375 × 667, 900 × 700 and 1023 × 768.
  One exception, `decisions.md` 2 and 3: at 320 × 568, on the question's step (`/log/23`) and the
  chapter steps, whose question or chapter line H1 keeps above the record, the h2 needs only to
  start in view.

## Budgets

The kept checks stay green unedited, above all B5.7, the yard's step-row placement (H1, T33,
T33b, T34) and the hint's line, the Log's B-series, and CLS 0 on a record. From 1024 wide nothing
moves (0 boxes on `/log/40`, `/log/76` and `/log` at 1024 × 768 and 1440 × 900). `/log` itself (no
record open) doesn't move at any width.

## Out of scope

`/log` without a record, every other page, large default fonts (the heading's fold there is a
later sprint's, if at all), the drawings' art, owner paths and `content/`.
