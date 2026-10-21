# Sprint 10: the hero's Part B (the WebGL upgrade), the build

**Lead:** Atlas. **Goal:** the roadmap's top open item, the subtle 3D hero, Part B: build the WebGL
upgrade the owner accepted by merging PR #32 (chosen from the roadmap). **Size:** M, the build step of
the L item; the contract is `.crew/sprint/9/contract.md` (C10 to C17, the C2 trim and the
`hero.spec.ts` edits), standing on `.crew/sprint/9/spike-probe.md`.

## Steps

1. **Probe (`probe`):** `e2e/hero-3d.spec.ts` (C10 to C15 and C17, one test per check, named by number)
   and the five `e2e/hero.spec.ts` edits, before any product code. No `skip`, `fixme` or `fail`. Atlas
   pushes them alone and opens the PR: CI's first run on Chromium 156 is the readout. C17 red because the
   browser draws nothing: stop, Part B goes back to the owner (contract, Risks).
2. **Pixel (`pixel`):** the gate, the chunk, the 138 px box and the `@container (width >= 48rem)`
   breakpoint, hand-written WebGL, no dependency expected, until the specs pass and `pnpm verify` is green.
3. **CI and Lens** on the PR (`review` label after the build and memory are pushed). Two fix rounds at most.
   Threshold drift on 156 is handled as the contract's Risks say; anything beyond goes to the owner.
4. **Iris** reviews the running site (canvas against SVG), as advice.
