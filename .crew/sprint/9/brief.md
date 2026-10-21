# Sprint 9: the hero's Part B contract (WebGL upgrade)

**Lead:** Atlas. **Goal:** the roadmap's top open item, the subtle 3D hero, Part B (chosen from the
roadmap). **Size:** L, contract step. No product code.

Sprint 7's contract (`.crew/sprint/7/contract.md`, "Part B" and "Contract change") left C10 to C16
as a draft: "Part B's own sprint starts with Probe's spike, then rewrites C10 to C16 against what the
CI browser really does, and puts the rewrite to Lens before anyone builds." Sprint 8 shipped Part A
(PR #31) and its retro adds Iris's item 3: trim C2's 172 px box to the measured silhouette at both
ends of the turn (`.crew/sprint/8/review-iris.md`), and Lens's nit: the 768 breakpoint as
`@container (width >= 48rem)`.

## Steps

1. **Probe (`probe`): the spike.** In the scratchpad only (no product code, no e2e/ yet), find what
   the Playwright Chromium this repo runs in CI really does with WebGL: context creation with and
   without `failIfMajorPerformanceCaveat`, whether init scripts can strip the flag and count
   `drawArrays`/`drawElements`, whether a sheared seven-plank hull drawn in a tiny hand-written
   WebGL program reads back pixels (`readPixels`/screenshot), timing of idle-loading a chunk after
   `load`, CLS of a canvas swap, and the open Lens findings on C10, C14, C15/C6. Findings in
   `.crew/sprint/9/spike-probe.md`.
2. **Quill (`quill`): the contract.** `.crew/sprint/9/contract.md`: Part B's checks C10 to C16
   rewritten against the spike, grounded in what it measured, with Lens's open findings and Iris's
   C2 trim resolved, plus a "Needs owner decision" section. If the spike shows the CI browser draws
   nothing, say so: Part B goes to the owner as is.
3. **Lens in CI** on the PR, labelled `needs-owner` and `review`. Two fix rounds at most.
4. The owner accepts the contract by merging. The build is the next sprint's.
