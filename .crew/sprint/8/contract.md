# Sprint 8 contract: the hero half-model, Part A

Size: M. Goal: the roadmap's open item, the 3D hero, Part A of the contract the owner accepted by
merging PR #28.

## Outcome

Right after the header, every visitor sees Iris's lift half-model as a static inline SVG: seven
matte planks in the page's tokens, one copper plank on the third lift, no client JavaScript, no
dependency, never moving text or taking focus.

## Checks

The checks are **C1 to C9 of `.crew/sprint/7/contract.md` ("Part A")**, verbatim, with its hooks
(`data-hero`, `data-hero-hull`, `data-hero-lift`, `data-hero-copper`) and its "Existing checks that
bind this" section. Probe writes them as `e2e/hero.spec.ts`, one test per check, named `C1` … `C9`.
The form is `.crew/sprint/7/direction-iris.md`; where it and the contract differ, the contract rules.

## Out of scope

Part B (the WebGL upgrade, C10 to C16, still a draft), and everything in sprint 7's "Out of scope".
No edit to an existing spec, `content/`, or any owner path.
