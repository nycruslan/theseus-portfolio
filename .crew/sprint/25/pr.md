## Sprint 25: B3, the hull lifts off the drawing at 1024 px and up

**Goal (roadmap):** on `/` at 1024 px and wider, after the name has painted, the white card model
lands on the inked profile within 1 CSS px, lifts off in one dolly-zoom to the settled
three-quarter pose, once a visit, skipped by any input, settled under reduced motion and still at
rest. The page and every word stay still. Below 1024 px, without WebGL, in print, in forced
colours, with Save-Data or with scripts off, the page is today's sheet and loads no 3D.

**Size:** M, by the decision it carries: the renderer-specific code B3 is built on.

**This PR waits for the owner** (`needs-owner`): see "Needs owner decision". The loft runs on the
Vercel preview at 1024 px and up.

## What's in it

- **The model** (Pixel): `lib/model/` (the merged card mesh with a per-vertex plank slot, the fat-line
  seams and outline, the CPU-baked shadow, the loft maths, the stage on `WebGLRenderer`, and the
  mount: states, once a visit, skip, reduced motion, quality stepping, the observers, the scheme
  redraw, teardown), the loader `components/model.tsx` (648 B gzip, the only script `/` adds with
  WebGL refused), one line in `app/page.tsx`, and "The model" in `app/globals.css`. `three@0.186.1`
  is the one new dependency.
- **The layouts module** (Forge): `lib/hull-layouts.ts`, which the 3D chunk imports without the SVG
  drawing (proof: the shipped chunk holds 0 of 9 of the drawing's fingerprints and all of the
  layouts'; `.crew/sprint/25/decisions.md`).
- **Batch E and the frame** (Forge, Iris's calls): from 1024 px each revision's description is one
  line with an ellipsis, the full goal in the cell's DOM text; the bottom row's `min-height` keeps the
  sheet's bottom edge at 883 px in the 1440 × 900 frame as `main.webp` draws it.
- **The checks** (Probe): the harness (`e2e/webgl.ts`, `e2e/pixels.ts`, `e2e/model.ts`), B3.1 to
  B3.10 in `e2e/model-*.spec.ts`, and the three rewrites with the same assertions (B1.8, B2.10,
  B1.5).
- **Iris's nine calls** on the loft, decided on the prototype and taken in the build
  (`.crew/sprint/25/notes-iris.md`), her early look's three changes (decision 10), and her review's
  one: a warm lamp on the dark hull (decision 13). **Iris's verdict: ship, 8.8/10**, no musts
  (`.crew/sprint/25/review-iris.md`): better than production at 1440 and 1024, pixel-identical at
  390 and 320.

## The contract and its results

`.crew/sprint/25/contract.md` (Quill's sprint 24 draft, adopted with four amendments in its
header). Every GPU number is from headless Chromium's SwiftShader, so a floor.

| Check | Result |
|---|---|
| B3.1 the first frame lands on the drawing | Registration at 1440: 1.00 CSS px at DPR 1 (bound 1.5), 0.71 at DPR 2 (bound 1.0), both schemes; 1024 and 1920 read the same. Whole-pixel canvas at 1024, 1366, 1440 and 1920 × DPR 1 and 2. Hand-off: 2,884 of 669,256 px change by more than 48 levels (S4: 4,891); title block, revisions, bar, numbers and text boxes unchanged; no transition |
| B3.2 the loft holds the hull's size | Framed height within 1.09% of (1 + 0.10·e) × frame 1's at every step at 1440 and 1024 (bound 2%); first moving frame to `settled` 2,384 ms on the clock against 2,400 |
| B3.3 once a visit, any input ends it | Pass: reload and second goto open settled with no lofting frame, a new tab plays again; key, click, wheel, tap and scroll settle within 2 frames and do their own work; storage throwing plays the loft with no error |
| B3.4 reduced motion opens settled | Pass, and a switch to `reduce` mid-loft settles within 2 frames |
| B3.5 the Off paths download nothing | Pass on all six: no extra script, one `webgl2` probe at most, no canvas, the sheet as on main; print hides the model |
| B3.6 cheap and still | At most 4 draws (3 at frame 1, 4 settled; bound 8); 25,267 triangles (bound 30,000; two-triangle seam quads); backing store 2× at DPR 3; 0 frames at rest, off-screen and hidden. 3D chunk 144,516 B gzip -9 (gzip -6 145,091; brotli 11 118,337; brotli 5 133,963; Forge's independent read before the warm lamp: 144,497), one file, requested after `loadEventEnd`. Frame JS at 4× CPU: median 7.9 ms, p95 134.8 ms; the settled frame 0.6 ms |
| B3.7 the record in the drawing's colours | Plank fills within 8 levels of the drawing's in both schemes; no pixel within ΔE 10 of `--accent`; a scheme switch draws 1 frame, then 0 |
| B3.8 cleanup and the page around it | Pass: nothing in `[data-model]` is hit; Read as page and Back leave one context and a settled model; 1440 → 1100 refits with CLS 0; 1000 removes the canvas |
| B3.9 the first paint is untouched | B1.9 and B1.8's CLS hold with the model loading. Reported: the scene build's own steps 62 to 172 ms at 4× CPU; the longest task (334 to 385 ms alone) is frame 1's rendering update, headless Chromium reading the canvas back for software compositing; INP for a key press that landed in the loft 272 ms beside B3.6's worker (decision 9) |
| B3.10 the harness checks itself | Pass |
| Loader bytes | 984 B raw, 648 B gzip -9 over `/sprints'` scripts with WebGL refused, within B2.10's 2,048 B: no owner decision needed |

Whole suite: 151 of 151 in Pixel's worktree, and 151 of 151 on this branch (`PLAYWRIGHT_PORT=4660 pnpm test:e2e`, 5.2 min) after B1.4 moved to the Off path (decision 12), and again on the final head with the warm lamp; the first integrated run was 150 of 151, B1.4 losing the race decision 12 describes.

## Decisions

`.crew/sprint/25/decisions.md`, 1 to 13: the stack built on A; Iris's calls that change the
contract's numbers (7: the ease, the 10% grow, the hollow drawing, the reduced-motion fade, the
bottom row); B3.9's precondition reported, not gated (9); Iris's early look (10); where the build
departs from the spike (11: one camera with a hand-set projection, still frames at the full ratio,
line weights in buffer pixels, the hollow rule off print, two-triangle seam quads); B1.4 on the Off
path with the same assertions (12); Iris's review and the full-page-capture teardown, a safe
artefact left as a follow-up (13).

## Needs owner decision

1. **The stack: A (`WebGLRenderer`, built here, Pixel's recommendation) or B (`three/webgpu`).**
   A's chunk is 144,516 B gzip against the 250,000 B budget; B measured 280,606 B in the spike and
   misses the budget on Vercel's wire in either encoding. A departs from `design/brief.md`'s
   Technology section (the owner's file); the retro proposes that section's edit. Picking B means
   raising the budget to about 295 kB and porting the spike's TSL twin here before the merge.
2. **Batch E:** from 1024 px the revision block's descriptions are one line with an ellipsis, the
   full goal in the DOM, on phones and in the Log. B1.5's assertion changed to this.

The loader is within 2,048 B, so the contract's second question doesn't arise.

## Evidence

- Pixel's run in its worktree: `pnpm verify` passes; `PLAYWRIGHT_PORT=4621 pnpm test:e2e` 151 of
  151. On this branch: `pnpm verify` passes (lint, typecheck, knip, build) and the whole suite is
  151 of 151.
- Forge's chunk read: `next analyze` lists the 3D chunk's 13 sources (`lib/model/*`,
  `lib/half-model.ts`, `lib/hull-layouts.ts`, five three.js modules), and the shipped file carries
  none of the drawing's text; `/`'s six first-load chunks carry no three.js.
- Iris's early look and review: `.crew/sprint/25/notes-iris.md`, `.crew/sprint/25/review-iris.md`,
  frames in her scratchpad (registration, the hand-off diff, the loft strip at true times, the
  settled pose beside `main.webp` and the spike's last frame, the reduce fade stepped).
- CI's Chromium against the cloud's: both headless SwiftShader; the harness reports the versions.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01HhnH88cTV2QRdADSzpne7s
