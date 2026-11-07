# Sprint 52: the headroom for a playable layer

Pixel, 2026-11-07, on `sprint/52-play` at 47958ff. This is ground truth for Iris's directions and
Quill's milestone plan. It doesn't choose a direction.

**Outcome:** a playable layer fits, if it lives inside the 3D chunk on WebGLRenderer. `/`'s script
budget has 11 B left, so nothing can grow in the loader. The 3D chunk has 95,065 B of its 250,000 B
left. A toy that draws only while it is touched keeps every kept check of frames and draws. Moving
to three/webgpu (TSL) doesn't fit: one full-screen TSL piece is 272,011 B on its own, and having it
in the build grows `/`'s own 3D download by 34,105 B.

Every number below is **measured** on a production build of 47958ff (`next build`, then
`next start`), with Playwright 1.64's headless Chromium in this 4-vCPU cloud, unless it is marked
*estimated*. Headless Chromium draws WebGL with SwiftShader on the CPU, so frame times are a floor
and a ranking, not a phone's or a laptop's numbers. WebGPU never ran here: `navigator.gpu` exists,
but there is no adapter, and three/webgpu fell back to its WebGL 2 backend.

## 1. The 3D stack as it is

- **Renderer:** `WebGLRenderer` from `three` 0.186.1 (`lib/model/stage.ts`), with `antialias` and
  `alpha`, driven at pixel ratio 1 in whole buffer pixels. There is no WebGPU path. Sprint 24 chose
  WebGL because three/webgpu's chunk was 280.6 kB gzip, over budget, and its WebGPU backend draws a
  `BatchedMesh` once per instance (26 draws; `.crew/sprint/24/spike/spike.md`). The loader probes a
  throwaway WebGL 2 context first. Without one, the mode is Off.
- **The hull:** `lib/half-model.ts` is the parametric half-model and `lib/hull-layouts.ts` holds
  the 22 planks. `lib/model/hull.ts` builds plain arrays with no three.js: both halves, the deck and
  the transom, as **one merged card mesh** with a per-vertex `slot`. Each slot's colour comes from
  the `uStates[23]` uniform. The seams and the outline are two `LineSegments2` fat-line batches.
  The shadow is baked on the CPU at the settled pose (`shadow.ts`). The card's material is a
  `MeshStandardMaterial` patched by `onBeforeCompile` (GLSL: the slot lookup, the pencil hatch, and
  `uLit`, which blends between the drawing's flat fill and the lit card).
- **Levels:** the level follows the drawing shown, not the device. The desktop level is 120 × 8
  (11,946 card vertices, at most 25,267 triangles a frame against 30,000) from 768 px. The phone
  level is 56 × 4 (3,626 vertices, at most 7,891 triangles against 12,000) below 768. Both draw at
  most 4 times a frame against 8 (B3.6, both schemes).
- **Camera:** an `OrthographicCamera` whose projection is set by hand. The loft is a dolly-zoom from
  orthographic, and its frustum at z = 0 is the canvas, so the model registers on the 2D drawing.
  The camera never turns: the model lifts and turns to a fixed settled pose (`calls.ts`: `/` wide
  yaw −30° pitch 15°, narrow −36°/16°; the Log's ghost −20°/12°; `/crew` 35°/6°).
- **Frame loop:** frames are drawn on demand, and nothing loops at rest. The rAF loop runs only for
  the move: the loft takes 2.4 s, the ghost's move and `/crew`'s 1.8 s. After that, one frame is
  drawn for each resize, scheme change, feed change on `/crew`, or plank crossed under the pointer
  on the Log. A redraw that comes while the model is off-screen or the tab is hidden waits for an
  IntersectionObserver or `visibilitychange`. Any `keydown`, `pointerdown`, `wheel`, `touchstart` or
  `scroll` ends the loft at its settled frame.
- **Quality stepping (`mount.ts` `tick`), during the move only:** three frames in a row over 22 ms
  step the ratio down a rung (2 → 1.5 → 1). At ratio 1, six frames over 33.4 ms give up the move,
  and the model rests `still`. At rest the frame is drawn at the cap: 2 from 768 px, 1.5 below.
- **Full / Calm / Off and reduced motion (`components/model.tsx`):** with nothing pressed, the
  device's hints set the mode: Save-Data opens Off, and `prefers-reduced-motion: reduce` opens Calm,
  settled with no loft and with CSS's 240 ms linear fade. Otherwise the mode is Full, which lofts
  once a visit (`sessionStorage`). A press is kept in `localStorage`. Off never probes for WebGL or
  imports the chunk, and the drawing is the page. Forced colours and print hide the layer. A lost
  context returns the Off drawing, and a restored one comes back settled.
- **How it loads:** on the `load` event, then `requestIdleCallback` (timeout 2 s), the forced-colours
  check, the WebGL 2 probe, and `import("@/lib/model/mount")`. The build then runs in steps with a
  yield between them (hull, stage, paint and fit, shadow, `compileAsync`), and frame 1 draws on rAF.
  - At 1x the chunk is requested at 152 to 218 ms, after `loadEventEnd` at 122 to 179 ms (B3.6).
  - At 4x CPU (B3.9) it is requested at 682 to 694 ms. Frame 1 comes at 1,315 to 1,358 ms. The build
    is six long tasks, the longest 255 ms at 390 and 306 ms at 1440.

## 2. The budgets that bind, measured

| Budget (check) | Limit | Measured now | Left |
|---|---|---|---|
| `/`'s script beyond the 404's, WebGL refused (B2.10, `e2e/read.spec.ts`) | 2,048 B decoded | 464,751 − 462,714 = **2,037 B** (`/log` and `/log/13` the same) | **11 B** |
| The 3D chunk: what `/` fetches with the model beyond the Off page (B3.6, `e2e/model-cost.spec.ts`; also B4.40, B5.23) | 250,000 B gzip -9, the sum of the files | **154,935 B** in 1 file (`1zsb02clj7hnh.js`; brotli 11: 127,299; raw 603,920) | **95,065 B** |
| Draws a frame (B3.6) | 8 | 4 | 4 |
| Triangles a frame, from 768 px / below (B3.6) | 30,000 / 12,000 | 25,267 / 7,891 | 4,733 / 4,109 |
| Frames at rest, off-screen, hidden (B3.6, B4.40, B5.23) | 0 | 0 | — |
| LCP at 4x CPU, text in the title block, no url (B3.9, B1.9) | ≤ 2,500 ms | 272 ms at 390 × 844, 288 ms at 1440 (B3.9). My own trace at 390 × 844 DPR 3, 4x: 344 ms, a `<p>` | ~2.2 s |
| CLS from load to rest + 2 s (B3.9, B1.8) | 0 | 0 at both sizes, 1x and 4x | none: any shift fails |
| INP during the loft (B3.9) | 200 ms, **reported, not gated** | a tap: 48 ms; a key: 16 ms. Both landed after the move had given up (`still`), so mid-move INP isn't measured here | — |
| Longest task in the build (B3.9) | reported | 255 ms at 390, 306 ms at 1440 (4x CPU) | — |

**Frame time under SwiftShader, as a rough proxy** (rAF intervals, one timestamp per frame;
`timeFrames` JS per frame from B3.6):

| What | 390 × 844, DPR 3 (buffer 585 × 390, ratio 1.5) | 1440 × 900, DPR 2 (buffer 2812 × 951) |
|---|---|---|
| The loft, 1x CPU | 79 frames, median 33.3 ms, p95 33.4 ms: **30 fps**, ends `settled` | 12 frames, median 100 ms: steps down and ends `still` |
| The loft, 4x CPU | median 33.4 ms, p95 66.6 ms. Ended `settled` once and `still` once in two runs | median 150 ms, ends `still` |
| JS per loft frame, 4x CPU (B3.6) | median 2.1 ms, p95 33 ms, max 98.6 ms | median 5.2 ms, p95 91.2 ms |
| **The settled hull redrawn every frame** (spike), 1x | **30 fps** (33.3 ms), JS 0.4 ms | 8.6 fps (116.7 ms), JS 0.4 ms |
| The same, re-solving the pose every frame (an orbit) | 30 fps, JS 0.3 ms | 8.6 fps, JS 0.4 ms |
| The same plus a CPU displacement over every card vertex (no upload) | 30 fps, JS 0.7 ms | 7.5 fps, JS 1.4 ms |

At 1440 the cost is all raster and read-back in software, with 0.4 ms of JS. That is why a
desktop-sized canvas never finishes a loft here. Sprint 25 saw the same: headless
Chromium reads a WebGL canvas back for software compositing, at 100 to 300 ms a frame.

## 3. What a visitor can touch today, and where interaction is cheapest

**Today:**

- **`/`:** the canvas has `pointer-events: none`, so it takes no hit and a touch drag scrolls the
  page through it (B3.13). The only things to touch are the motion control (Full, Calm, Off: real
  buttons, reachable by Tab) and the inputs that end the loft. Pressing Full replays the loft.
- **`/log` and `/log/[n]` (the ghost):** at rest the canvas takes the mouse, the pen and the finger.
  Hovering over a plank inks its edges, at one frame per plank crossed. A ray on the coarse pick
  hull (24 × 2) costs about 0.1 ms. A click, or a tap that lifts within 10 px, opens that sprint's
  record, and the middle button, Cmd or Ctrl opens it in a new tab. The led-out numbers and their
  leaders pick too.
- **`/crew`:** the hull follows the live feed (ticks, the pencil, seats) through a
  MutationObserver. No pointer reaches the canvas.
- **The keyboard** reaches only the control. The canvas is `aria-hidden`, and no plank is a Tab
  stop.
- **Viewpoints:** none to choose. Each drawing has one settled pose, and the camera only dolly-zooms.

**The cheapest places to add interaction, cheapest first:**

1. **Input on the existing canvas, with its code in the 3D chunk.** B2.10 counts `/` with WebGL
   refused, so the chunk is never in it, and the layer costs it 0 B as long as
   `components/model.tsx` doesn't change. The pick already exists in `stage.ts` (the Raycaster on a
   never-drawn hull), and `/` can build the same 24 × 2 pick hull. Turning the canvas on for the
   pointer is CSS on `[data-model]` and costs no script. The chunk has 95 KB of room. Effects go into
   the card's GLSL `onBeforeCompile` as more uniforms, which is the pattern of `uStates` and the
   hatch. On WebGLRenderer that means GLSL, not TSL.
2. **A second lazy chunk, imported from `mount.ts` on the first touch.** It costs B2.10 nothing.
   B3.6 doesn't see it as written, since it sums only what `/` fetches without interacting. The
   direction's 250 KB is still the honest budget for everything `/` can pull in, so count it there.
   It only pays off if the toy's code is big, and section 4 says it won't be.
3. **A separate route on WebGLRenderer.** It has its own budget, since B2.10 lists `/`, `/log`,
   `/log/13` and `/read`. Its three chunk is shared with `/`'s (measured below).
4. **TSL effects** require `three/webgpu`, which means changing the renderer. The existing material
   is a GLSL-patched `MeshStandardMaterial` on WebGLRenderer, and TSL doesn't run there. This is the
   expensive option (section 4, class C).

**What a toy on `/` meets in the kept checks** (a guide for Quill; Probe's contract mutant finds the
rest, `.crew/STATE.md`):

- B3.13: a touch drag over the canvas must still scroll. Take a drag with `touch-action: pan-y` and
  horizontal intent only, or take only a mouse or pen.
- B3.6, B4.40 and B5.23: 0 frames at rest. A toy that draws only while touched, and settles back to
  rest, keeps them. An idle animation breaks them.
- B3.1: frame 1 is registered on the drawing within 1.0 CSS px at DPR 2 (1.5 at DPR 1). Play starts
  only from `settled` or `still`.
- B3.14 and B3.15: under forced colours and after a lost context, the drawing is whole.
- B3.17 to B3.21: Full, Calm and Off, and reduced motion. Calm needs a non-animated answer to input
  (a direct mapping with no spring or inertia). Off and missing WebGL need the composed drawing.
- STATE.md's text-over-WebGL lessons apply to any canvas that grows past the drawing.

## 4. Cost classes, roughly priced

The prices come from the measurements above and a scratch spike, described at the end. A price
marked *est.* is not measured.

| Class | Bytes | ms per frame | Draws and triangles | Risk |
|---|---|---|---|---|
| **A. Input-driven deformation of the existing hull** (push, dent or flex under the pointer, springing back) | *est.* 1.5 to 3 KB gzip in the chunk; 0 B on B2.10 | measured redraw: JS 0.4 ms, and 0.7 ms with a CPU displacement on the phone level (1.4 on desktop). On the GPU, a vertex-shader displacement costs ~0 JS. SwiftShader: 30 fps at 390, 8.6 at 1440 | unchanged: 4 and ≤ 25,267 | **Medium.** The card and both fat-line batches must deform the same way: three shader patches, and a fat line is a screen-flat quad, which loses the depth test where the
card bulges (sprint 34's clip-space lift). The shadow is baked at the settled pose: it either stays put or is re-baked on the CPU (cost not measured). Touch versus scroll (B3.13). It can never move frame 1 (B3.1). |
| **B. A physics-free toy on the planks** (planks come apart, are dragged and swapped back: a per-plank offset and turn, springs in JS) | *est.* 3 to 6 KB gzip: a per-slot transform array (23 × 2 `vec4`) in the card shader, plus a slot attribute on the seam and outline segments | 22 springs and matrices: about 0.3 ms JS (the spike's 22 instanced planks). Measured: 20 fps at 390 and 10 at 1440 for the spike's lit, MSAA-on toy (~21k triangles) under SwiftShader | the merged mesh stays one draw. A separate `InstancedMesh` would add 1, so 5 against 8 | **Medium.** The line batches have no plank index today. The seams lie between planks, so a plank pulled out needs its own edges (the Log's `plankEdges` already builds them per plank). The drawing has to agree at rest: the hollow states, the numbers riding planks. |
| **C. A full-screen shader piece** (a fragment shader over the viewport or the drawing's row) | WebGLRenderer + `ShaderMaterial`: *est.* 1 to 2 KB in the existing chunk. **TSL on three/webgpu: 272,011 B gzip -9 for the route on its own** (82,797 shared core + 189,214 WebGPU), over 250,000 | measured, the same value-noise fBm with a pointer ripple: GLSL on WebGLRenderer at 390 DPR 3 (585 × 1266) **60 fps**, at 1440 DPR 2 (2160 × 1350) **12 fps**. As TSL on three/webgpu's WebGL 2 backend: 30 fps and 7.5 fps, with JS 0.5 ms against 0.2 | 1 draw; a second canvas would be a second context | **High** on `/`. It runs every frame while shown, which breaks "0 frames at rest" unless it idles. It sits over text (the five-second read, axe contrast, LCD text). On phones, fill rate grows with the square of the ratio, so cap it at 1. The TSL route can't fit the budget, and WebGPU itself can't be measured in the cloud. |
| **D. A separate playable route** (its own page, linked from the sheet) | measured, WebGLRenderer route: **its own code 678 to 836 B gzip**, plus three's chunk (136,248 B), which a visit to `/` has already cached. `/`'s 3D goes from 154,935 to **158,217 B** (+3,282: one chunk becomes two once two routes share three). With three/webgpu in the same build: the route is 272,011 B, and **`/` grows to 189,040 B (+34,105)**, because three's core chunk is shared with WebGPU and holds what both need | that route's own: no `/` budget applies. It takes its own draw, frame and fallback budgets | its own | **Low for `/`, medium overall.** It needs a way in: the bar's four links share a row at 320 and 390 (B3.23), and B1.1 pins the title block's contacts in the first viewport. It needs its own Off, Calm and no-WebGL composed state, metadata and OG card, a place in the sitemap and in `e2e/helpers.ts`'s `ROUTES` (Probe's), and axe. Its numbers are mine to set in its contract. |

**The cheapest path to a playable layer:** class A or B on `/`'s existing canvas, with the code in
the 3D chunk, WebGLRenderer and GLSL. It costs 0 B of B2.10's 11, about 2 to 6 KB of the chunk's
95 KB, no new draws, and frames only while touched. Picking on a coarse hull is already built.

**The riskiest:** class C as TSL, or anything that adopts three/webgpu. The route alone is 22 KB
over the 250 KB budget, it grows `/`'s own 3D download by 34 KB even while `/` keeps WebGL, and
its WebGPU backend can't be measured here. A full-screen piece on `/` in any stack comes next: it
runs every frame over the five-second read.

## What only a GPU and a phone can confirm

- Frame times. SwiftShader's numbers rank the classes, but MSAA and read-back cost far more on the
  CPU than on a GPU. Whether the desktop loft and a desktop-sized toy hold 30 fps needs a real
  laptop.
- INP while the loft or a toy is moving: B3.9's inputs landed after the move had given up.
- The WebGPU backend's draws and frame cost (sprint 24: 26 draws with `BatchedMesh`, plus an sRGB
  pass every frame).
- How much a continuous full-screen loop drains a phone's battery and heats it.

## How these numbers were taken

- The kept checks, against a production build served with `next start --port 3341`:
  `PLAYWRIGHT_BASE_URL=http://localhost:3341 playwright test e2e/read.spec.ts -g B2.10` (passed, 16 s)
  and `e2e/model-cost.spec.ts -g "B3.6|B3.9" --workers=1` (both passed, 80 s and 10 s). Their
  annotations are the B2.10, B3.6 and B3.9 rows above.
- The spike, in a scratch worktree on port 3342 and never committed:
  - a route, `app/spike/page.tsx`, with `?k=quad` (WebGLRenderer + `ShaderMaterial`), `?k=inst`
    (22 instanced planks), and `?k=tsl` and `?k=tsl-gl` (WebGPURenderer + TSL, the same fBm), each in
    its own module with named imports;
  - a hook at the end of `mount.ts`'s `start` that redraws the settled hull every rAF for 3 s.
  - Then three builds: with all four modules, without the WebGPU module, and the clean tree at
    47958ff. I compared the scripts each route fetched after `load`.
- The chrome-devtools MCP couldn't start Chrome in this container, because it runs as root with no
  sandbox exemption. The trace was taken with Playwright's CDP (`browser.startTracing`,
  `Emulation.setCPUThrottlingRate` 4) in the same Chromium.
