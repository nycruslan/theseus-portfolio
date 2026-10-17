# Sprint 9 contract: the hero half-model, Part A

Size: M. Goal: the roadmap's open item, the 3D hero, Part A of the contract the owner accepted by
merging PR #28.

## Outcome

Right after the header, every visitor sees Iris's lift half-model as a static inline SVG: seven
matte planks in the page's tokens, one copper plank on the third lift, no client JavaScript, no
dependency, never moving text or taking focus.

## Checks

The checks are **C1 to C9 of `.studio/sprint/7/contract.md` ("Part A")**, verbatim, with its hooks
(`data-hero`, `data-hero-hull`, `data-hero-lift`, `data-hero-copper`) and its "Existing checks that
bind this" section. Probe writes them as `e2e/hero.spec.ts`, one test per check, named `C1` … `C9`.
The form is `.studio/sprint/7/direction-iris.md`; where it and the contract differ, the contract rules.

## Out of scope

Part B (the WebGL upgrade, C10 to C16, still a draft), and everything in sprint 7's "Out of scope".
No edit to an existing spec, `content/`, or any owner path.

## Carried from sprint 7 (Lens's nits on 02a7835)

Probe settles these in the spec, inside the checks' wording, and says how in the report:
- **C6:** if `next build` prints no first-load JS figure, Pixel shows the same thing another way
  (the `/` page's JS chunks listed in `.next` on both builds, or their summed bytes), and says which.
- **C7, the third lift:** count `[data-hero-lift]` in DOM order, first to seventh; the spec names
  that order and Pixel's markup keeps it (keel up, or sheer down, as Pixel draws it, stated in a
  comment on the hull group).
- **C7, copper stops:** when the copper plank's fill is a gradient, every stop is read and held to
  the copper window.
- **C5:** run the LCP check against an `origin/main` build first, so a red C5 is the hero's and not
  the throttle's.

Sprint 8 wrote this contract on `sprint/8-hero-half-model` and stopped before opening a PR; sprint 9
picks it up unchanged.
