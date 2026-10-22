# Brief for Quill (sprint 24): B3 as a sequence of sprints

**For:** the roadmap. B3 ("the 3D card model and the registered loft") is one line in `ROADMAP.md`
and several sprints of work. Sprint 24 is Pixel's spike (`.crew/sprint/24/contract.md`), running
beside you. You turn the direction into the build sprints that follow it, as the roadmap's method
says you do, so sprint 25 starts from a contract and not from a line.

Read first: `ROADMAP.md`, `PRODUCT.md`, `.crew/STATE.md`, `.crew/sprint/17/direction-iris.md`
(the loft, the card model, the four material states, the budgets table, the Full/Calm/Off control),
`design/research/2026-ui-ux-and-3d.md` sections B3 and D, the contracts of sprints 22 and 23 for
the form, `e2e/sheet.spec.ts` for the live guards the 3D must keep green (B1.1 the fold, B1.9 LCP
as text, B1.10 the script bytes, the no-JS and print checks), and your memory.

## Files you own

- `.crew/sprint/24/b3-plan.md`: B3 as S and M sprints in order, each with its outcome in a
  sentence, its size, the visitor-visible checks it adds and the live checks it must keep, and what
  the owner sees at the demo. Say which sprint the owner's stack call must precede, if any: the
  research proposes option A (WebGL, about 140 KiB gzip) against the direction's own stack (WebGPU
  with the WebGL 2 fallback, which doesn't fit the 250 KB gzip budget as gzip), and the roadmap
  says the choice goes to the owner with the B3 demo.
- `.crew/sprint/24/b3-first-contract.md`: the first build sprint's contract, in the sprint 22 and 23
  form (outcome, data rules, numbered checks, budgets, out of scope, the live specs it touches).
  Every number the spike will supply is marked `[spike: …]`; Atlas sends you the spike's results
  and you fill them in.

Don't commit: write the files and report, and Atlas commits them on the sprint branch. The
roadmap itself is edited at the close-out by Atlas from your plan.

## One more question, in a paragraph of your report

The revision block (`components/revisions.tsx`) is capped at five rows, so it doesn't grow a row a
sprint as the roadmap says; its height moves only when a goal wraps to two lines at 1440 (four of
today's five do, and the title block's contact links end 7 px above the 900 px fold). Iris's canvas
notes specified one-line descriptions with an ellipsis and the full goal in the Log
(`.crew/sprint/22/notes-iris.md`, section 8); sprint 22's contract ruled "never truncated"
(`.crew/sprint/22/decisions.md`, 3.6), and B1.5 guards it. From the visitor's side: does a one-line
description cost them anything the Log doesn't give back, and would you now take Iris's one-liner
(it needs the owner, since B1.5's check changes) or keep the full text and a one-line goal as the
retro's rule? One paragraph; Atlas decides and records it.

## Report

First line the outcome. Then the two files' paths, the sprint sequence in a few lines, the
decisions you need and from whom, what you couldn't verify, and your memory lines (at most three,
citing `.crew/sprint/24/`) for Atlas to commit. Reply to Atlas with that; don't paste the files.
