# Sprint 16: B1, the hero

**Lead:** Atlas. **Goal:** the roadmap's top item, the redesign, its first build step B1 (the owner
accepted the direction and contract by merging #47). **Size:** M. Contract: `contract.md` here, checks in
`.studio/sprint/15/contract.md`.

## Steps, in order

1. **Probe (`probe`):** spike, then the B1 checks red in `e2e/` and the listed rewrites of `hero.spec`,
   `hero-3d.spec`, `sprints-entry.spec` and `invariants.spec`. Notes in `spike-probe.md` and
   `specs-probe.md`, including every assertion retired and why (for the owner's decision 7).
2. **Forge (`forge`):** fonts, tokens, title block, band, the 22-plank SVG hull and ORDER in `lib/`,
   layout. Checks 1 to 9 and 11 green.
3. **Pixel (`pixel`):** the WebGL renderer on the new hull with per-plank tones, at rest only. Check 10
   green.
4. **Iris (`iris`):** the running site against her direction and the prototype; advice.
5. **Lens** in CI on the `review` label. Two fix rounds at most.
