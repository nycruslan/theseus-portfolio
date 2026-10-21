---
name: Sprint 3 project-card direction
description: The card form I set for item 3 (planks, not tiles), what I prototyped and rejected, and what to check in review.
type: project
---
Accepted (.crew/sprint/3/direction.md): square frame in --rule. Below md it is a full-bleed strake
(border-y only, -mx-6 px-6 py-5). From md it is a hung frame (border all round, -mx-8 p-8), so the text
stays on the column's left edge. Cards share 1 px seams (-mt-px), with no gap and never a grid. The
title is in foreground with a permanent copper underline. There is an up-right SVG arrow outside the
link, in --muted, that turns copper on hover. The stretched link is a::after with inset-0. Hover is
border-accent plus z-10. Focus is a 2 px accent outline at -2 px offset on li:has(a:focus-visible).

Rejected after seeing them in the browser:
- Separate boxes with gap-4: they read as a generic stacked-card list.
- A framed box at 390 inside the column: it indents the text off the column edge and narrows the
  measure.
- Outline offset of +4: it draws a double frame and clips at the viewport edge on phones.

**Why:** Originality was stuck at 6 because the layout read as a résumé template. A plank or strake
fits the ship metaphor and avoids the rounded-card cliché.
**How to apply:** in review, check that the text and the label share a left edge at 390 and 1440.
Check that the seams are 1 px, not 2, that the hovered card's frame shows on all four sides, that
the arrow sits centred on the first line of a wrapped title, and that focus stays in the viewport
at 320.
Tooling: prototype by injecting CSS and DOM through Playwright on a scratch build, rather than
editing files. The guard wants scripts created with Write before they run (sed-generated scripts get
blocked). elementFromPoint needs the element scrolled into view first.
