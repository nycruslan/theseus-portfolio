# Sprint 25, second run (Atlas, 2026-10-23 12:10 UTC)

The first run ended at 07:01 UTC with the contract, the briefs, Forge's layouts module, Probe's
harness (B3.10) and Iris's nine calls on the branch, and Forge's batch E on `forge/25`. Its
worktrees went with its container: Pixel's build (served at :4617, whose 3D chunk answered 500) and
Probe's checks B3.1 to B3.9 never reached a branch. This run starts the build at once from what's
on `sprint/25-the-loft` (`.crew/STATE.md`: a resumed sprint starts the build at once).

## What's on the branch now

- `b00d18d` the contract, decisions 1 to 6, the four briefs.
- `2be151a` `lib/hull-layouts.ts` (Forge): `Layout`, `WIDE`, `NARROW`, `Plank`, `PLANKS`.
- `76887ca` the harness (Probe): `e2e/webgl.ts`, `e2e/pixels.ts`, `e2e/model-harness.spec.ts`.
- `e500b98`, `f5d5e45` Iris's calls (`notes-iris.md`) and decision 7, which records the ones that
  change the contract's numbers.
- `26d53d2`, `8eeb8c8`, `f58d41e` batch E, the Contact row's 14 px floor and Forge's memory,
  cherry-picked from `forge/25` this run.

## What each role does now

Each brief stands (`brief-pixel.md`, `brief-probe.md`, `brief-forge.md`, `brief-iris.md`), with
these changes:

- **Pixel** builds the whole 3D from the spike, with Iris's calls as the constants' values from the
  first line, not the contract's defaults: `DURATION 2400`, `EASE_K 7`, `EASE_IN 0.05` (the ease
  in `notes-iris.md` 2, word for word), `HOLD "height"` with `GROW 0.10` (the framed height follows
  `(1 + GROW × e) ×` frame 1's), `SHADOW_LIGHT 0.18`, `SHADOW_DARK 0.6`, `SEAM_PX 0.9`,
  `OUTLINE_PX 1.6` (the SVG untouched), the dark tokens with `DARK_GAIN 4` (call 6), the 1024 pose
  as the 1440 pose scaled by the drawing's width (call 7), and under `prefers-reduced-motion:
  reduce` only a 240 ms linear opacity fade of the canvas in and of the plank numbers out when
  `settled` is reached (call 8; the fills cut). Call 5's hollow-drawing rule goes in "The model"
  section of `app/globals.css` (the CSS in `notes-iris.md` 5, word for word). Nothing of the first
  run's build survives; start from `.crew/sprint/24/spike/scene/`.
- **Probe** writes B3.1 to B3.9 and the three rewrites. B3.2's framed-height bound is decision 7's:
  within 2% of `(1 + 0.10 × e(u)) ×` frame 1's at each step, with `e` from `notes-iris.md` 2.
  Batch E's CSS is already on the branch, so B1.5's old "truncated cells" assertion is red now and
  the rewrite makes it green. B3.6's animation count: no `animationstart` or `transitionrun` in
  Full (B1.8 emulates `no-preference`); under `reduce`, transitions only on `[data-model] canvas`
  and the `.plan-plank` spans (call 8).
- **Forge** adds Iris's call 9 (the bottom row's `min-height` on both cells from 1024 px,
  `notes-iris.md` 9, word for word) and proves the layouts module draws no SVG from the build's
  chunk graph once Pixel's code is on the branch. The seams stay on the model's side: no change to
  `lib/lines-plan.ts`.
- **Iris** looks at Pixel's build when Atlas sends its URL, then reviews.

Ports: Pixel 4620 to 4629, Probe 4630 to 4639, Forge 4640 to 4649, Iris 4650 to 4659; never
3000, 3352 or 4534. Worktrees as the briefs say (`pixel/25`, `probe/25`, `forge/25` from
`sprint/25-the-loft` at `f58d41e`; `forge/25` exists on origin, so Forge starts from the sprint
branch and names its branch `forge/25b`).
