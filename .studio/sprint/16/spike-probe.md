# Sprint 16 spike (Probe): bytes, and the renderer at a 1460 px hull

Measured on a production build of `sprint/16-redesign-hero` before any B1 code (it is today's main),
served with `next start` on 3341. Chromium 156.0.8078.4, SwiftShader (ANGLE, Vulkan), the same stack CI
uses. About 25 minutes. Scratch scripts are not committed.

## 1. First-load JS for `/` against `/_not-found` (sprint 9's method)

`.next/diagnostics/route-bundle-stats.json` lists the chunks; gzip is `gzip` level 6 of each file, which
is what `e2e/webgl.ts` computes with `gzipSync`.

| Route | First-load chunks | Raw B | gzip B |
|---|---|---|---|
| `/_not-found` | 5 shared chunks | 458,689 | 135,796 (3,634 + 6,049 + 49,720 + 71,970 + 4,423) |
| `/` | the same 5, plus `22vdpclc2hk2o.js` (the idle-load gate, `components/hero-upgrade.tsx`) | 460,063 | the 5 plus **859** |

So today `/` is **859 B gzip above `/_not-found`** (raw 1,374 B). The cap is 2,048 B (C15), so B1's gate and
anything else on the first-load path may add **at most 1,189 B gzip** to what is there today. Nothing the
SVG needs counts: it is server-rendered HTML. Fonts are not JS.

Hero chunk (`0w956154i37kd.js`, the only script containing `createShader`, fetched after load): raw 7,307 B,
**3,631 B gzip**. The cap is 12,288 B, so per-plank tones have **8,657 B gzip** to fit in. All late JS today
is that one chunk (3,631 B of the 15,360 B cap).

## 2. The renderer at a 1460 px hull, under SwiftShader

I forced the box to 1460 x 371 and the SVG to 1460 px (CSS injected on DOMContentLoaded, so the canvas
mounts at that size) at a 1460 px viewport, with the hero-3d harness's caveat strip, and wheeled for 1.5 s.

| Case | Canvas | Draws in 1.5 s of wheel | rAF interval p50 / p90 / max (ms) | Frames over 50 ms |
|---|---|---|---|---|
| 1440 viewport, today's box, dpr 1 | 688 x 138 | 45 | 16.7 / 16.7 / 16.8 | 0 |
| 1460, dpr 1 | 1460 x 371 | 45 | 16.7 / 16.7 / 33.3 | 0 |
| 1460, dpr 1.5 | 2190 x 557 | 45 | 16.7 / 16.7 / 16.8 (one run: max 33.4) | 0 |
| 1460, dpr 2 | 2920 x 742 | 33 to 40 | 16.7 / 33.3 / 33.4 | 0 |
| 390, dpr 3 (today's cap 2 applies) | 780 x 198 | 45 | 16.7 / 16.7 / 16.8 | 0 |

- **At rest the renderer draws once and stops** at 1460 px (draw count 1 at 1 s and at 3 s): C12 holds.
- The canvas shows the whole hull, tones and seams, at 1460 px (screenshot read, not just counted).
- The cost is vertex work (96 columns per band), not box area, so a 3.8x bigger box changes little. The
  only strain is at 2 x 2 density: 2.2 Mpx canvas, p90 33 ms, still short of the 50 ms `SLOW_MS` that
  freezes it. **DPR cap needed: 1.5** is clean everywhere I measured (the direction's budget says 1.5 on a
  mid phone, 2 on desktop; 2 on desktop works but is the first to show dropped frames in SwiftShader).
  The harness runs at dpr 1, so the specs do not depend on the cap.
- Not measured: a real GPU, or a phone. `gl.finish()` returns before SwiftShader is done, so the draw's own
  cost is not read; frame intervals are the evidence.

**Verdict:** the canvas at a 1460 px hull is feasible in CI's browser within C12 and C14; no reason to cut
check 10 on performance. What B1 has to rebuild is the mesh (22 planks, one patch per plank, the SVG's
solid per-plank fills read through the same two-sentinel colour reader), not the loop.

## 3. What this means for the specs

- Check 10's byte caps (12,288 B hero chunk, 15,360 B late JS, +2,048 B first load) are the contract's and
  stay; the headroom above is for Forge and Pixel to plan with.
- The 8,192 B markup cap (hero C6, hero-3d C15.3) is on the retire list: the prototype's hero SVG is
  12,599 B by itself (7 gradients, 22 rects, 7 clip paths). See `specs-probe.md`.
