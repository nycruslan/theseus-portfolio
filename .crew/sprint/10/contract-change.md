# Sprint 10: contract change (for the owner)

**What CI showed.** The first CI run of Probe's specs (d5c2a06, Chromium 156, PR #35) failed C17 on its
first clause: `getContext(type, { failIfMajorPerformanceCaveat: true })` returned a context for `webgl`,
`webgl2` and `experimental-webgl` alike (`refused` = `[false, false, false]`). The spike measured refusal
on the sandbox's Chromium 141 (`.crew/sprint/9/spike-probe.md` §1), and the contract's harness, C14's
"caveat flag refused" case and C17 rest on it. The contract's Risks call a failed premise a contract
change for the owner, so it is recorded here, not widened quietly.

**What changes** (Probe's amendment, no threshold moves):
- **C17:** the browser's own answer to the caveat flag is reported (as a test annotation), not asserted.
  What C17 asserts instead is the harness's refusal: an init script that returns `null` for any WebGL
  `getContext` carrying `failIfMajorPerformanceCaveat: true` gives `null` for all three types; every
  other C17 clause (the strip grants a context, the recorder sees `true`, the draw is counted, the
  screenshot shows the colour) stands.
- **C14, the caveat case:** the refusal comes from that init script instead of the browser, so it still
  proves the gate passes the flag and falls back when refused (one recorded request with the flag `true`,
  no other context request, no chunk, the SVG visible).

**What it means for the product:** nothing in the gate changes. On CI's browser (and so, likely, on
visitors' recent Chrome without a GPU) the caveat probe passes, so the WebGL hull loads in a software
renderer, where the slow-frame rule (three frames over 50 ms in a row freeze it) is the guard. The gate's
caveat clause still turns away browsers that do refuse.

**Needs owner decision:** accept this amendment by merging the build PR, or say the caveat clause must
keep software renderers out (which would need a different signal than the flag on Chromium 156).
