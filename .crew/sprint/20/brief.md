# Sprint 20: the drawn dots survive forced colors (S)

Goal (roadmap, "Small follow-ups"): the 3 px dots the site draws with `before:` (the Stack's separators
in `app/page.tsx`, the build log's "What went wrong" bullets in `components/sprint-entry.tsx`) show in
forced colors (Windows High Contrast), and the Stack list clips only sideways, not every side.

The redesign (top item) still waits: its canvas has no owner comments.

## Forge (product code)

1. Both dots: add `forced-colors:before:bg-[CanvasText]`. In forced colors the browser drops
   `background-color` to the system's, so a background-only dot disappears.
2. The Stack `ul`: replace `overflow-hidden` with a horizontal-only clip (`overflow-x-clip`, which
   leaves y visible, unlike `overflow-x-hidden`). Check nothing scrolls sideways at 320 and no row's
   leading dot shows. Update the comment above it if the wording changes.
3. Nothing else moves: same layout, same `innerText`, same light/dark colours.

## Probe (e2e, in `e2e/`)

1. One new check in `e2e/profile-sections.spec.ts`: with `forcedColors: "active"` emulated, each Stack
   item after the first in its row has a `::before` whose computed `background-color` is not
   transparent; and the Stack `ul`'s computed `overflow-y` is `visible`. Red on main first.
2. Riders: move the `C4b` describe block above the `// C5` banner in `e2e/sprints.spec.ts` (Lens's
   nit, sprint 19); write the raw U+00A0 characters in `e2e/sprints.spec.ts` (~line 614) and
   `e2e/sprints-entry.spec.ts` (~line 33) as ` ` escapes. No behaviour change.

Disjoint files: Forge touches only `app/page.tsx` and `components/sprint-entry.tsx`; Probe only `e2e/`.
