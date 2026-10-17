**Work in progress.**

## Goal

Roadmap item "A subtle 3D hero element that degrades gracefully on low-end devices", **Part B**: the
WebGL upgrade's contract. Chosen from the roadmap. Sprint 7 left C10–C16 as a draft that this sprint
rewrites after Probe's spike, before anyone builds.

**Size:** L, contract step · Probe spiked WebGL in the test browser · Quill rewrote the checks · Lens in CI ·
the owner accepts by merging. No product code.

## Contract

- `.studio/sprint/9/spike-probe.md`: Probe's spike. The headless Chromium draws WebGL (SwiftShader), refuses
  `failIfMajorPerformanceCaveat`, and init scripts can strip that flag and count draws. A hand-written renderer
  of the real hull was 2.7 KB gzip, pixel-identical across runs, within 1 px of Part A's silhouette, CLS 0.
- `.studio/sprint/9/contract.md`: C10–C17, each standing on a measured value; Lens's three open findings
  from sprint 7 resolved; Iris's C2 trim (box 172 → 138 px) and Lens's `@container` nit folded in.

## Results

Contract written; Lens's review pending.

## Needs owner decision

See `contract.md` § "Needs owner decision". In short, merging this PR accepts:
1. The hero box shrinks from 172 to 138 px (amends Part A's merged contract; tightens `e2e/hero.spec.ts` C2–C4).
2. The fallback rules (under 4 cores or 4 GB, Save-Data, reduced motion, no cheap GPU context, three slow frames).
3. The budget as measured: ~3 KB chunk against the 15 KB cap, ~0.8 KB first-load growth against 2 KB.
4. If CI's browser (Chromium 156; the spike ran on 141) draws nothing, Part B comes back to you.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01W7r1x3iyPDVEMRiyWtMzz1
