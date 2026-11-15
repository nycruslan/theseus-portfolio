# Sprint 68 (S): a reader's large font keeps Contact whole

Why now: the crew stood down after sprint 67 (`ROADMAP.md`, "Then the crew stands down"), and one
of its conditions to reopen is a defect on production that hides a fact. Sprint 67 measured one
(`.crew/sprint/67/pr.md`, `retro.json` wentWrong 3): at 320 wide, from a 21 px default font, the
bar's Contact link pushes every page sideways, and at 24 px it is cut to "Con" (right edge 373). At
24 px the Log's motion control's Off does the same (327). A visitor who reads at Chrome's "Large"
or "Very large" font on a small phone loses the one link the site exists to put in front of them.

## Outcome

At 320 × 568, with a 16, 20 or 24 px default font, webfont and fonts blocked, every page holds
inside the window: no sideways scroll, and the bar's four links and the motion control are whole
and inside the page. At the default font, nothing anywhere moves.

## Checks (Probe writes them red on main first)

- **T27**: on every route T25 visits (and `/`), at 320 × 568 with a 21 and a 24 px default font,
  webfont and fonts blocked: `scrollWidth <= clientWidth`, and each bar link's and the motion
  control's buttons' right edges are inside the page. Red on main at 24 px for Contact.
- **T25** keeps its door clauses; its page-scroll clause extends to 24 px (`PAGE_HOLDS`), since the
  finding it named is fixed. That is a check strengthened, not retired.
- **Nothing moves at 16 px**: the boxes of `/`, `/crew`, `/log` and `/trials` at 320, 390, 1024 and
  1440 are the same before and after (Forge's box diff, as in sprint 67), and the existing suite is
  green.

## Budgets

No new script; CSS only if it can be. The bar's links keep 44 px targets where they have them now.

## Out of scope

The bar's design at the default font (its four links share one row at 320 and 390); `/`'s first
screen; the trials' other open items (console errors, caption jump, T11); owner paths and
`content/`.
