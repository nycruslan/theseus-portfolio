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

- Lens: **ship** on the first run (4a5cd8a), two wording nits, both applied in the close-out (notes only).
- Iris: **ship**; chose box A, 138 px with the hull centred at rest (`.studio/sprint/9/direction-iris.md`).
- `check` green; `gate` holds the PR for you, as `needs-owner` requires.
- Not verified: CI's Chromium 156 (the spike ran on the sandbox's 141), a GPU-backed context, retina, Safari/Firefox, a real phone, and the butt joints on the canvas. C17 in the build sprint is the first readout on 156.
- Retro: `.studio/sprint/9/retro.json`. It proposes that a sprint PR closing unmerged (as #30 did, which fired this run) not start a sprint.

## Needs owner decision

See `contract.md` § "Needs owner decision". In short, merging this PR accepts:
1. The hero box shrinks from 172 to 138 px (amends Part A's merged contract; tightens `e2e/hero.spec.ts` C2–C4). Content below moves up ~34 px on desktop, ~35 px at 390 and ~51 px at 600.
2. The fallback rules (under 4 cores or 4 GB, Save-Data, reduced motion, no cheap GPU context, three slow frames).
3. The budget as measured: ~3 KB chunk against the 15 KB cap, ~0.8 KB first-load growth against 2 KB.
4. If CI's browser (Chromium 156; the spike ran on 141) draws nothing, Part B comes back to you.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01W7r1x3iyPDVEMRiyWtMzz1
