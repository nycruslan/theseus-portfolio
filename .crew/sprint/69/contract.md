# Sprint 69 (S): a long word in a heading stays inside the window

Why now: the crew stood down after sprint 67 (`ROADMAP.md`, "Then the crew stands down"), and a
defect on production that hides a fact reopens work. Sprint 68 fixed a reader's large font on `/`,
`/crew`, `/log` and `/trials`; Atlas's sweep of production on 2026-11-16 (every sitemap route
family, 320 and 390 wide, 20, 24 and 28 px default fonts) found the pages it didn't visit:

| Page | Text | Right edge at 320, 20 px | 24 px |
|---|---|---|---|
| `/work/multi-agent-platform` | h1 "Multi-agent orchestration platform" ("orchestration") | 324 | 386 |
| `/evals` | h2 "Groundedness" | holds | 348 |

The page scrolls sideways and the word is cut at the window's edge: on a case study, the first
line a hiring executive reads. `/work/document-ai`'s h1 runs out only at 28 px, past Chrome's
largest preset (24), and the Log's step pages' table headers run past the window inside their own
scroller (the page holds), so neither is in this sprint.

## Outcome

At 320 × 568 and 390 × 664, with a 20 or 24 px default font (Chrome's "Large" and "Very large"),
webfont and fonts blocked, `/evals` and each of the five case studies hold inside the window: no
sideways scroll, and every heading's words inside the page and cut by nothing. At the default font,
nothing moves.

## Checks (Probe writes them red on main first)

- **T28** (new, or T27's routes widened; Probe's call): on `/evals` and every `/work/[slug]` in
  `content/work.ts`, at the sizes and windows above, webfont and fonts blocked:
  `scrollWidth <= clientWidth`, and each `h1`/`h2`'s text range is inside the page and no ancestor
  hiding overflow cuts it, so `overflow: hidden` isn't a fix. Red on main at 20 px for the case
  study and at 24 px for `/evals`.
- **A word is broken only where a reader expects it:** if the fix breaks a word, the break shows a
  hyphen (Iris's call on whether breaking is right at all; see the brief).
- **Nothing moves at 16 px:** the boxes of `/evals` and the five case studies at 320, 390, 1024 and
  1440 are the same before and after (Forge's box diff, as in sprints 67 and 68), and the existing
  suite is green.

## Contract change (Atlas, during the build)

Forge found a live defect at the default font in the same rule (`.sched h2`): at 1024 wide,
production's `/evals` prints "Groundedness" (to 311) over its own result, "Failed, 6 of 10", which
sits from 282; the heading's grid area ends at 258. A fact on the page is hidden, which is the
stand-down's condition, and the code is this sprint's, so it rides along. Added:

- **T29** (Probe): on `/evals` (report drawn as T28 draws it) and the five case studies, at the
  default font, at widths 768, 900, 1024, 1180, 1280 and 1440, each `.sched` h2's text range sits
  inside its own grid area and overlaps no other text box in its section. Red on main at 1024.
- **Nothing moves at 16 px** narrows to: nothing moves but `.sched` h2s that overran their area,
  and what they push. Forge's box diff names every box that moved.

## Budgets

No new script; CSS only. No new font file.

## Out of scope

Sizes past 24 px; the Log's step-page tables; `/`, `/crew`, `/log` and `/trials`, which T27 holds;
the headings' design at the default font; owner paths and `content/` (the titles' words don't
change).
