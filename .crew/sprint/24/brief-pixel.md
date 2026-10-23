# Brief for Pixel (sprint 24): B3's spike

**For:** the crew, so B3's first build sprint starts from numbers. **Who it serves:** the visitor on
a mid phone who should see the hull lift off the drawing within budget, and the owner, who takes
the stack call at the B3 demo.

**The work:** the seven measurements in `.crew/sprint/24/contract.md` (S1 to S7), reported in
`.crew/sprint/24/spike/spike.md`. Read first: `.crew/sprint/17/direction-iris.md` (the loft, the
card model, the budgets), `design/research/2026-ui-ux-and-3d.md` sections B3 and D, your memory,
`lib/half-model.ts` and `lib/half-model-svg.ts` (the hull's geometry and how the page draws it),
`components/lines-plan.tsx` (the inked profile the model must land on), and sprint 17's render
sources in `.crew/sprint/17/render/` (a three.js render of the full hull from the same geometry,
with a recipe; reuse what fits).

## Files you own

- `.crew/sprint/24/spike/**`: the report `spike.md`, your sources (scene, loft, measurement
  scripts), a recipe that runs from a fresh checkout, and at most six webp frames under 60 KB each
  (the registration diff and the loft at its key frames). Other screenshots stay in your scratchpad.
- A worktree for S1 only: add `three@0.186.1` there, build with `next build`, read the chunks the
  dynamic import loads, and don't commit `package.json`, the lockfile or any app code. Run the
  worktree's install with `pnpm install --frozen-lockfile` first (it starts without `node_modules`).
  Remove the worktree when done.

Don't commit: write your files and report, and Atlas commits them on the sprint branch. Nothing in
`app/`, `components/`, `lib/` or `e2e/` changes this sprint.

## How to measure

- S1: a client component that dynamic-imports the scene module after first paint, built in
  production mode. Sum the script bytes the browser fetches for that import (your memory's method:
  what the browser fetched before `load`, minus `/_not-found` in the same build, here minus the page
  without the import), gzip and brotli each. Use the same scene code in both options as far as the
  two renderers allow, so the sizes compare.
- S4: render the SVG profile from `lib/half-model-svg.ts` and the three.js first frame at the same
  CSS size, both at 1440 and 390 (DPR 1 and 2 at 390), and diff them: report the largest offset of
  the outline in CSS px, and keep the diff image as a frame. Read WebGL pixels from screenshots,
  never `readPixels` (memory).
- S5: frames from the prototype page served from your scratchpad on a free port (not 3000), with
  the hull's framed height measured on each frame.
- S6: CDP `Emulation.setCPUThrottlingRate` 4 in Playwright's Chromium; report the median and the
  95th percentile frame over the loft, and the resting frame's cost (should be 0 frames at rest).
- Headless Chromium here draws with SwiftShader: say so beside every GPU-dependent number.

## Report

`spike.md`, first line the outcome. Then S1 to S7 each with its number, the command that produced
it and the file. Then the recommendation (S7) in one paragraph the owner can read. Then what you
couldn't verify, and your three memory lines (at most) for Atlas to commit, each citing
`.crew/sprint/24/`. Reply to Atlas with the path and the outcome line; don't paste the report.
