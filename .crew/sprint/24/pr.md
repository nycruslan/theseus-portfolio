## Sprint 24: B3's spike, the 3D stack measured and the registered loft prototyped

**Goal (roadmap):** before the crew builds the 3D card model, measure in this repository's own
toolchain which three.js stack fits the direction's budgets, what the hull costs in triangles and
draws, and whether the model can land on the inked profile and lift off it as the direction
describes. Nothing a visitor sees changes in this sprint: no file in `app/`, `components/`, `lib/`
or `e2e/` changes, and `three` is not added to the project.

**Size:** M, by the decision it carries: the stack B3 is built on.

## The contract and its results

`.crew/sprint/24/contract.md`, S1 to S7; the report is `.crew/sprint/24/spike/spike.md`, with one
script per measurement in `spike/measure/` and a recipe (`spike/recipe.sh`) that re-ran everything
from a fresh worktree with the same results. Every frame and timing is SwiftShader in headless
Chromium, so GPU-dependent numbers are floors, not a phone's.

| Measurement | Option A, `WebGLRenderer` | Option B, `three/webgpu` | Budget |
|---|---|---|---|
| S1 3D chunk, Turbopack, gzip | **178.9 kB** (182 to 187 on Vercel's wire) | **280.6 kB** (285 to 294 on the wire) | ≤ 250 kB gzip |
| S2 triangles, desktop / phone | 20,299 / 5,355 | same scene | ≤ 30k / ≤ 12k |
| S3 draws, registered / settled | 4 / 5 (WebGL 2 with multi-draw) | 5 / 6 on its WebGL 2 fallback; **26 / 27 on WebGPU** | ≤ 8 |
| S4 registration on the inked profile | ≤ 1.0 CSS px at 1440 and 390 (0.5 to 0.71 at DPR 2) | same on its WebGL 2 fallback | ≤ 1 px |
| S5 the loft's framed height | drift 0.0% at 1440, 0.82% at 390 | same scene | ≤ 2% |
| S6 JS per frame at 4× CPU, median | 0.9 to 1.3 ms; 0 frames at rest | 2.1 to 2.3 ms on WebGL 2 | 30 fps design |

- S1: Vercel serves brotli at about quality 4, which came out 1.6% to 4.6% *above* local gzip on
  production's three largest scripts, so the research's "B fits as brotli (about 200 KiB)" doesn't
  hold on the wire. The budget is read as gzip, and only A fits.
- S3: `BatchedMesh` is one draw only on WebGL with `WEBGL_multi_draw`; WebGPU and WebGL without the
  extension draw once per plank. The build merges the planks into one mesh with a per-vertex plank
  index, one draw on every stack.
- S4: under 1 px took three rules (a canvas sized in whole buffer pixels, lift ends as shared
  stations, no offsets in the side view). The hand-off isn't seamless yet: the plank numbers sit
  under the canvas and the SVG inks interior seams twice; both are build notes for sprint 25.
  Frames: `spike/frames/s4-register-1440.webp`, `s4-register-390.webp` (magenta the SVG alone, cyan
  the model alone, blue both, with 4× insets) and `s4-handoff-1440.webp`.
- S5: the camera never turns; 1/D runs with the eased progress from orthographic to a 30° lens, so
  the sheet stays registered and only the model lifts and turns. Frames: `spike/frames/s5-loft-1440.webp`
  and `s5-loft-390.webp`. Holding the framed height leaves the settled hull 21% shorter than the
  drawing; the exponential ease-out does 82% of the 2.4 s move in the first 600 ms and starts at
  full speed. Iris decides the duration, an ease-in and which size the move holds (sprint 25).

**S7, the recommendation (Pixel):** A, `WebGLRenderer`. A visitor who turns on Full downloads 180 to
190 kB after the name has painted rather than 285 to 295 kB; only A fits the budget; a frame is 4 to
5 draws; B buys nothing a five-draw card model needs, and the three.js manual still calls
WebGPURenderer experimental. Reach is a wash, since B falls back to WebGL 2 where A runs anyway. A's
TSL twin exists in the spike (`spike/scene/scene-webgpu.js`), so moving later is one module.

## Also in this PR

- **B3 as sprints 24 to 27** (`.crew/sprint/24/b3-plan.md`, Quill; `ROADMAP.md`): 25, the hull
  lifts off the drawing at 1024 px and up, once a visit, with no control; 26, phones and tablets with
  quality stepping; 27, the Full/Calm/Off control and the B3 demo. Once the 3D exists, Full is the
  default, as the approved canvas says. Sprint 25's contract is drafted from the spike's numbers in
  `.crew/sprint/24/b3-first-contract.md`.
- **The Next upgrade ticked** as PR #69 (the owner's, 2026-10-22), and B2 as merged.
- **The revision block's height, corrected** (`.crew/sprint/24/decisions.md`, items 2 and 3;
  `.crew/sprint/24/measure.md`): the block is capped at five rows, so it never grows a row a sprint.
  Its height moves 16.9 px for each of the five goals that wraps to two lines at 1440; four do today,
  and the contact links end 7.3 px above the fold. Rule: every retro's goal is one line, at most 78
  characters. Iris's one-line descriptions with an ellipsis ride with sprint 25 for the owner.

## Decisions

`.crew/sprint/24/decisions.md`, items 1 to 9. The ones that matter most: sprint 24 is a spike, not a
build (4); the stack call goes to the owner before sprint 25 merges, not at the B3 demo, since
sprint 25 writes nearly all the renderer-specific code (6); the one-line revision descriptions ride
with sprint 25 as batch E (7).

## Needs owner decision

Nothing blocks this PR. **One question for sprint 25, not blocking here:** the stack. Pixel
recommends A (`WebGLRenderer`, S7 above). A departs from `design/brief.md`'s Technology section
(WebGPURenderer, TSL, GSAP), which is yours; B fits the 250 kB budget only at brotli quality 11,
which Vercel doesn't serve. Sprint 25 builds on A unless you say otherwise, and its PR carries the
call with the loft running on its preview.

## Evidence

- `pnpm verify` and CI's `check` on the head: see the checks on this PR (the sprint adds only
  notes, scripts under `.crew/sprint/24/spike/` that biome, knip and tsc ignore, and five webp
  frames under 60 kB each, added with `git add -f` since `.gitignore` drops webp files under sprint
  folders; Lens's Important finding on the first review, fixed in round 1).
- The measurement on main for the revision block: `.crew/sprint/24/measure.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015Zyn3S4HewQzwHpoqNNqbb
