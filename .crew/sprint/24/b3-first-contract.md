# Sprint 25 contract: B3, the hull lifts off the drawing

Quill, 2026-10-23. This is the first build sprint of B3 (`.crew/sprint/24/b3-plan.md`; Atlas's
decisions 6 to 9 in `.crew/sprint/24/decisions.md`). It builds on the approved direction
(`.crew/sprint/17/direction-iris.md`) and its frames `main.webp`, `loft.webp`, `night-1440.webp` and
`motion-off.webp` in `.crew/sprint/17/design/`.

Every number here cites Pixel's spike, `.crew/sprint/24/spike/spike.md` (S1 to S7), or says it is
mine. The spike's prototype (`.crew/sprint/24/spike/scene/`) is the reference implementation. Its
recipe reruns every measurement from a fresh checkout.

One PR from `main`. **The PR waits for the owner** for the stack call and batch E (Needs owner
decision).

## Outcome

A hiring executive opens `/` on a laptop. The name, the role and the drawing paint first, as today.
Shortly after, the white card model lands on the inked profile so exactly that nothing seems to
change. Then it lifts off the paper in one camera move and settles at three-quarters, its shadow on
its own half-breadth plan.

The model is not a picture: its seated planks are the sprints the revision block lists beside it.
This happens once a visit, and any key, click, tap or scroll ends it at the settled pose. Under
reduced motion it opens settled. Once settled, it is still and draws nothing. The title block, the
revisions and every word never move.

Below 1024 px, without WebGL, in print, in forced colours, with Save-Data or with scripts off, the
visitor gets today's sheet and downloads no 3D.

## The calls I made

- **1024 px and up only.** That's the three-view sheet that `main.webp` and `loft.webp` draw. The
  spike registered the phone too (S4, 390), but phones bring quality stepping by device and Iris's
  call on the phone's model scale, so they're sprint 26 (Atlas's decision 9).
- **No control yet, and Full is the default.** The canvas makes Full the default
  (`Motion-Control.html`, Atlas's decision 8) and reduced motion Calm. The loft lasts under five
  seconds and any input skips it, so it needs no pause control (WCAG 2.2.2). The control is sprint 27.
- **Option A, WebGLRenderer, is the provisional stack** (S7; Atlas's decision 6). It is the only one
  inside the 3D chunk budget: 178,873 B gzip, against 280,606 B for B (S1). The owner's call rides
  this PR.
- **The model is a layer of its own.** `[data-model]` sits over the drawing. The DOM drawing changes
  only where the hand-off needs it (build notes 6 and 7). B1.4, C6 and B2.5 read it unedited.
- **Forced colours and Save-Data mean Off.** In forced colours the visitor asked for system colours,
  which the drawing honours and a lit canvas can't. With Save-Data they asked for fewer bytes, and
  the chunk is the page's largest download.
- **No GSAP.** The spike's loft is plain maths with a hand-written tween (S5, `scene/loft.js`). That
  makes 27 KiB of GSAP pointless.
- **The triangle budget counts what the GPU draws, fat lines included.** That's 30,067 at desktop
  quality in the spike (S2), 67 over. So the build takes one of S2's two fixes: 100 stations instead
  of 120, or two-triangle line quads.
- **The 2.4 s duration stands until Iris rules.** It's the direction's figure and the owner approved
  it. S5's table is beside Iris's call below.

## Data rules (the page and Probe's harness implement these word for word)

**Where.**
- On `/` only, never on `/read`, `/sprints` or the 404.
- It runs when all of these hold at load:
  - scripts run;
  - the viewport is at least 1024 CSS px wide;
  - a WebGL 2 context is granted;
  - `forced-colors: active` doesn't match;
  - `navigator.connection?.saveData` isn't true;
  - the media isn't print.
- Otherwise it is **Off**:
  - no 3D chunk is requested;
  - no `getContext` for `webgl`, `webgl2` or `webgpu` is called by the site;
  - the page is main's.

**When.**
- The 3D chunk is a dynamic import, requested after the `load` event, on `requestIdleCallback` with
  a 2,000 ms timeout (mine: the scene build takes 258 to 338 ms at 4× CPU, S6, and shouldn't
  compete with the page's own load).
- The scene compiles every program (`compileAsync`, S6) and draws frame 1 hidden, then shows the
  canvas at frame 1.
- Neither the canvas's appearance nor anything else in the 3D is a CSS animation or transition: B1.8
  counts them.

**`[data-model]`.**
- One element in `main`, the next sibling of `[data-plan]`, `aria-hidden="true"`,
  `pointer-events: none`.
- It sits over the wide plan's box (`.plan-wide`), is sized to that box and never to the viewport,
  and takes no layout space.
- It holds one `<canvas>` at a pixel ratio of min(devicePixelRatio, 2).
- The canvas's CSS size is whole buffer pixels: `round(css × dpr) / dpr` on each axis (S4, rule 1).
- It carries `data-state`, one of:
  - `landed`: frame 1 is shown, not yet moving;
  - `lofting`;
  - `settled`;
  - `still`: the net fired.
- Under Off it isn't rendered, or it is empty with no canvas.
- It is `display: none` in print.

**Frame 1: registration.**
- An orthographic frustum maps the wide SVG's `viewBox` onto the canvas.
- The full hull is seen side-on: both halves of `lib/half-model.ts`'s geometry, mirrored.
- Its outline lies on the profile's `.ln-outline` within 1 CSS px. S4 measured 1.0 px at 1440 DPR 1
  (the method's resolution) and 0.71 px at DPR 2.
- Its plank fills equal the drawing's: the flat-to-lit mix is 0 at u = 0 (S4).

**The loft (S5, `scene/loft.js`).**
- The camera never turns. It looks straight down at the sheet from the canvas's centre and only
  dolly-zooms.
- 1/D runs linearly with the eased progress, from orthographic to a 30° lens over the first
  viewport's height (D = 1,679 px at 1440 × 900).
- Its frustum at z = 0 is the canvas at every frame, so the sheet, the shadow and the page stay
  registered.
- The model lifts off the sheet and turns to the settled pose: yaw −30° and pitch 15° on desktop,
  sprint 17's approved three-quarter view.
- Its scale is solved so its framed height holds within 2%. S5 measured 0.0% at 1440.
- Duration and ease: 2.4 s, eased 1 − 2^(−10u), until Iris rules (Needs decision, Iris 1 and 2).
- The model's shadow is one plane on the half-breadth plan, baked once on the CPU as a blurred
  coverage grid. It is no shadow map and no extra pass, and it fades in under the lift (S7's build
  notes).

**Once a visit.**
- A flag in `sessionStorage`, read and written inside try/catch. If storage throws, the loft plays
  and nothing errors.
- A reload, or Back from another route, in the same tab session opens at `settled`.

**Skip.**
- Any `keydown`, `pointerdown`, `wheel`, `touchstart` or `scroll`, and any resize, during `landed`
  or `lofting` sets `settled` on the next frame.
- Listeners are passive, and none calls `preventDefault`: the key, the click and the scroll still do
  what they do.

**Reduced motion.**
- With `prefers-reduced-motion: reduce` at load, the model opens at `settled`, with no `lofting`
  frame.
- A change to `reduce` during the loft settles it at once.

**On demand.**
- Frames are drawn only from `landed` to `settled`, on a resize, and on a scheme change.
- Otherwise the scene draws 0 frames: at rest, with `[data-model]` off-screen (an
  IntersectionObserver, which the spike lacked), and with the tab hidden. S6 counted 0 frames in the
  2 s after every loft.
- A resize below 1024 px removes the model (Off for the rest of the visit).

**Quality during the loft (S6, `scene/loft.js` `playLoft`).**
- Three frames in a row above 22 ms step the DPR down: 2, then 1.5, then 1.
- At DPR 1, six frames in a row above 33.4 ms give up the move for the settled frame, with
  `data-state="still"`.
- Nothing steps up mid-move. Stepping up below 12 ms happens only at the next redraw.

**The planks are the record.**
- The model's planks are the 22 `PLANKS`, seated by the same `seatPlanks` call the page makes. A
  plank is seated in the model exactly when its `[data-plank]` carries `data-sprint`.
- The planks are **one merged mesh with a per-vertex plank index**. Each plank's state is looked up
  in a 22-entry uniform array or data texture, so the planks are one draw on every stack, with or
  without `WEBGL_multi_draw` (S3).
- The state has the direction's five slots: ink and card, original card, graphite, copper, vellum.
  B3 uses only the first two: nothing is live (B4), and nothing is removed (B5).

**Colours come from the tokens.**
- Seated card is `--card`, original card `--card-old`, and the seams and outline `--foreground`.
- They are read from the computed style at init and again when the colour scheme changes.
- There are no colour literals in `app/` or `components/` (the invariant), and nothing in the scene
  is `--accent`.

**Teardown.**
- On `pagehide` the loop stops, and the renderer and its geometry are disposed.
- A page restored from the back/forward cache shows `settled`.

**Stack.**
- three.js `0.186.1`, `WebGLRenderer`, and `MeshStandardMaterial` with about a dozen lines of GLSL
  injected (the flat-to-lit mix and the hatch, S7).
- The fat-line addon draws the seams and the outline, with no other addon.
- No React Three Fiber and no GSAP.
- If the owner picks B, the spike's `scene/scene-webgpu.js` is the TSL twin, swapped in this PR
  before it merges.

## Build notes (what B3's build takes from the spike; S7's list)

1. **Merge the planks** into one mesh with a per-vertex plank index (S3). The data rules make it a
   rule.
2. **Size the canvas in whole buffer pixels** (S4, rule 1). three.js floors the buffer but rounds
   the viewport. The drawing's 475.31 px height lifted the model 0.42 px at DPR 2 before the fix.
3. **Mesh on shared lift ends** (S4, rule 2). Every lift's ends are stations of both the card and the
   outline. Without them, 2 to 3 px notches appear at the counter.
4. **Draw nothing offset in the side view** (S4, rule 3). Use the card's polygon offset, not a
   geometric offset of the transom or the seams.
5. **Precompile every program** before frame 1 (S6). The shadow's program compiled mid-move before
   the fix.
6. **Put the plank numbers above the canvas.** They are HTML in `[data-plan]`, and the canvas hid
   them at the hand-off (S4). The lettering paints above `[data-model]`, by a stacking rule in
   `app/globals.css` or by DOM twins. B3.1 checks them.
7. **Match the seam weights.** The SVG strokes every plank's rectangle, so each inner seam is inked
   twice and reads darker than the model's single 0.9 px line (S4). Either the SVG draws each seam
   once (a DOM drawing change; B1.4, C6 and B2.5 still hold), or the model's seams get heavier. Iris
   and Pixel choose. B3.1 measures the result.
8. **Export the layouts from a module that draws no SVG.** Export `WIDE`, `NARROW` and `PLANKS` from
   a module that `lib/lines-plan.ts` imports. The 3D chunk imports it without pulling in the SVG
   drawing: the spike had to copy them (`scene/poses.js`, `scene/hull-mesh.js`).
9. **Keep the scene build off one long task.** It is 258 to 338 ms at 4× CPU (S6): geometry, shadow
   bake and compile. It yields between those steps, so a key press during it isn't held past the
   200 ms INP budget. B3.9 reports it.

## Checks

Each check is shown in a browser against the preview, or by `pnpm test:e2e` (Probe's specs).

**The harness.**
- It wraps the WebGL context to count draw calls and the triangles they submit, instanced line quads
  included.
- It refuses WebGL with an init script, as sprint 9's `e2e/webgl.ts` did (retired in sprint 22, in
  git at `7b4b48b^`).
- It drives the loft's time with Playwright's clock.
- **It reads every pixel from screenshots, never `readPixels` or `toDataURL`** (`.crew/STATE.md`):
  - coverage is a screenshot with the rest of the page hidden, alpha as coverage, as in S4's method;
  - colours are screenshot pixels.
- No hook is added to product code beyond `[data-model]` and its `data-state`.
- Headless Chromium draws WebGL with SwiftShader. Every GPU-dependent number is a floor, and the
  report says so beside it.

I judge B3.1 to B3.3 first at the demo.

**B3.1 The first frame lands on the drawing.**
- Registration, asserted at 1440 × 900 at DPR 1 and DPR 2, in both schemes. Hold `landed` with the
  clock and compare with the same view with WebGL refused, by S4's method (`measure/s4-register.mjs`):
  the Hausdorff distance between the model's outline coverage and `.ln-outline`'s, at a 50%
  threshold, is at most 1.0 CSS px. S4 measured 1.0 at DPR 1 and 0.71 at DPR 2.
- Other widths:
  - 1024 × 768 and 1920 × 1080 are measured the same way and reported, not asserted, until a run has
    measured them;
  - the rule that holds them is the whole-pixel canvas below.
- The whole-pixel canvas. At 1024, 1366, 1440 and 1920, at DPR 1 and 2:
  - `canvas.width` and `canvas.height` equal the canvas's CSS size × DPR exactly (both integers);
  - the CSS size is within 1 / DPR px of `.plan-wide`'s box.
- The hand-off at 1440, DPR 1: from before `[data-model]` exists to frame 1, these regions are
  pixel-identical:
  - `main > header`;
  - the revision block;
  - the bar;
  - the drawing outside the profile's box.

  Also:
  - every plank number's box is pixel-identical (build note 6);
  - every text node's box is unchanged.
- The count of pixels in the drawing's box that change by more than 48 levels is reported against
  S4's 4,891 of 667,850 (that count was before the numbers and seams were fixed). I judge what's
  left with Iris, on the diff image.
- The canvas's appearance fires no `animationstart` or `transitionrun`.
- Shown by: the registration and hand-off diff images at 1440, beside
  `.crew/sprint/24/spike/frames/s4-register-1440.webp` and `s4-handoff-1440.webp`.

**B3.2 The loft holds the hull's size and ends at the settled pose.**
- With the clock at u = 0, 0.25, 0.5, 0.75 and 1 of the duration, at 1440 × 900 and 1024 × 768:
  the hull's framed height stays within 2% of frame 1's. It is measured on canvas-only screenshots
  as the rows with alpha ≥ 0.5, including the outline (S5's method). S5 measured 155 px at every
  step at 1440, a drift of 0.0%.
- At u = 1:
  - `data-state` is `settled`;
  - the frame matches `s5-loft-1440.webp`'s last frame (yaw −30°, pitch 15°) within Iris's
    tolerance.
- The time from the first moving frame to `settled` is the duration, ± one frame.
- Throughout, the pixels of the title block, the revision block and the bar don't change.
- Shown by: the five frames at 1440, beside `loft.webp` and `s5-loft-1440.webp`.

**B3.3 Once a visit, and any input ends it.**
- A second load in the same context opens with `data-state="settled"`, and no `lofting` frame is
  drawn (the harness counts draws between load and settle).
- During `lofting`, each of these sets `settled` within 2 frames:
  - a key press;
  - a click on the title block's text;
  - a wheel;
  - a touch (emulated);
  - a scroll.
- The input still does its own work:
  - Tab during the loft focuses the skip link;
  - the wheel scrolls the page;
  - a click on a bar link during the loft lands on its target.
- With `sessionStorage` throwing (init script), the loft plays, and no console error appears.
- Shown by: a recording of a key press at mid-loft.

**B3.4 Reduced motion opens settled.**
- Under `reducedMotion: "reduce"`, the first visible frame is `settled`, and no `landed` or
  `lofting` state is ever set (a MutationObserver records `data-state`).
- Switching the emulation to `reduce` during `lofting` sets `settled` within 2 frames (the sprint 22
  rider).

**B3.5 The Off paths download nothing.**
- The cases:
  - WebGL refused;
  - a 1023 px viewport;
  - forced colours;
  - Save-Data (an init script sets `navigator.connection.saveData`);
  - print media at load;
  - scripts off.
- In each case:
  - no script is requested beyond those the page fetches with WebGL refused;
  - the site calls no `getContext` for `webgl`, `webgl2` or `webgpu`;
  - no `[data-model] canvas` exists;
  - B1.4's 22 planks and the title block are as on main.
- Printing after the model settled:
  - `[data-model]` isn't displayed;
  - B1.8's print assertions hold (the drawing, the planks, every fact).

**B3.6 It is cheap, and still at rest.**
- Over the loft and at rest, at 1440 in both schemes:
  - **at most 8 draw calls per frame.** S3 measured 4 at frame 1 (planks, deck, seams, outline) and
    5 settled (plus the shadow) on A;
  - **at most 30,000 triangles per frame**, counted as submitted, line quads included. S2 measured
    20,299 mesh triangles and 1,628 fat-line segments, 30,067 by `renderer.info`'s count, so the
    build takes one of S2's two fixes;
  - the canvas's backing store is at most 2× its CSS size.
- **0 frames at rest, off-screen and hidden.**
  - After `settled`, for 3 s.
  - With the page scrolled so `[data-model]` is off-screen.
  - With the tab hidden (`visibilitychange` emulated).
  - Each over 3 s.
- **The 3D chunk.**
  - What it is: the scripts `/` fetches at 1440 with the model, minus those it fetches with WebGL
    refused (S1's method, against Off instead of `/spike-0`).
  - **At most 250,000 B gzip -9** (Node's zlib, level 9, on each file's body). S1 measured
    178,873 B for A, 71 kB to spare.
  - gzip -6, brotli 11 and brotli 5 are reported beside it. Vercel's brotli on production's scripts
    came 1.6% to 4.6% above local gzip -9 (S1), so the wire is about 182 to 187 kB.
  - Its first request starts after `loadEventEnd`.
- **Frame time at 4× CPU**, reported, not gated (SwiftShader). The JS time of a frame and its median,
  p95 and max over the loft, and the settled frame alone. The baseline is S6's A at 1440, DPR 1:
  1.1 / 5.7 / 8.8 ms per frame, and 1.2 / 3.2 ms settled.
- This carries sprint 22's dropped rider, C14's draw count under load.

**B3.7 The model shows the record, in the drawing's colours, and nothing copper.**
- At frame 1, which is registered so each plank lies on its `[data-plank]` box, compare the
  screenshot's pixel at each plank box's centre with the same point with WebGL refused. In both
  schemes, each is within 8 levels per channel. The flat-to-lit mix is 0 at u = 0, and S4 found the
  fills match exactly. Seated and original planks therefore read as they do in the drawing.
- At frame 1 and at `settled`, in both schemes, no canvas pixel is within ΔE 10 of `--accent`.
- With the scheme switched while settled, one frame redraws in the other scheme's colours, and the
  scene then stops again. The spike had the light scheme only, so this is new ground (Iris 6).

**B3.8 It cleans up, and the page around it holds.**
- C9 stays unedited: axe is clean, nothing in the drawing is hit, and there's no console error, now
  with the model loading. Nothing in `[data-model]` is hit by `elementFromPoint` either.
- Following Read as page from a settled `/`, then going Back:
  - `/read` requests no context and draws no frame;
  - `/` opens at `settled`;
  - only one context is alive.
- Resizing from 1440 to 1100 after settling:
  - the model re-fits the drawing's box, with the whole-pixel rule holding;
  - nothing overflows at any width from 1024 to 1920;
  - CLS stays 0.
- Resizing to 1000 removes the canvas, with CLS 0.

**B3.9 The first paint is untouched.**
- B1.9 (LCP is text in the title block, ≤ 2,500 ms at 4× CPU) runs unedited, now with the model
  loading. So does B1.8's CLS 0 over load plus 2 s.
- Reported, not gated, against the 200 ms INP budget:
  - the longest task the scene build causes at 4× CPU (build note 9; the spike's whole build was 308
    to 338 ms at 1440, S6);
  - INP for a key press during the loft.

**B3.10 The harness checks itself first.** These are pushed alone, before the build:
- the context wrapper counts a known two-draw test scene correctly, triangles included;
- the WebGL refusal makes `getContext` return null;
- the clock moves a test page's `requestAnimationFrame` time;
- a screenshot of a canvas that has drawn reads non-zero.

CI's Chromium version is compared with the cloud's, and both are reported (`.crew/STATE.md`).

## Budgets that apply to sprint 25

| Measure | Sprint 25 budget | Measured in the spike |
|---|---|---|
| LCP | ≤ 2,500 ms at 4× CPU, text in `main > header` (1.5 s reported) | B1.9, unedited |
| CLS | 0 over load + 2 s, and on resize across 1024 | B1.8; B3.8 |
| INP | ≤ 200 ms, reported (SwiftShader inflates it) | the scene build is 258 to 338 ms at 4× (S6), hence build note 9 |
| First-load script on `/` | with WebGL refused, within 2,048 B of `/sprints'` | the spike didn't isolate the loader. Forge measures it. Above 2,048 B the number goes to the owner |
| 3D chunk | ≤ 250,000 B gzip -9, after first paint | A 178,873 B; B 280,606 B (S1) |
| Draws | ≤ 8 per frame | A: 4 registered, 5 settled (S3) |
| Triangles | ≤ 30,000 as submitted, at 1024 px and up | 20,299 mesh; 30,067 with line quads, so a fix is needed (S2) |
| DPR | ≤ 2, stepping down to 1.5 and 1 above 22 ms | S6 |
| Frame time | still frame after 6 frames above 33.4 ms at DPR 1; loft's median and p95 at 4× CPU reported | A at 1440: 1.1 / 5.7 ms (S6) |
| Rendering | 0 frames at rest, off-screen and with the tab hidden | 0 in 2 s after every loft (S6) |
| Registration | ≤ 1.0 CSS px at 1440 (DPR 1 and 2); 1024 and 1920 reported | 1.0 and 0.71 (S4) |
| Loft | holds framed height within 2%; once a visit; 2.4 s until Iris rules; skippable; reduced motion opens settled | 0.0% at 1440 (S5) |
| Fonts | unchanged: two woff2, ≤ 86,016 B; the model draws no text | B1.10, unedited |
| Phones (≤ 12k triangles, DPR 1.5, 30 fps) | not sprint 25 (sprint 26) | 5,355 mesh triangles; 1.0 px at 390 (S2, S4) |

## Riders

| Rider | Disposition |
|---|---|
| The 3D's teardown, and a reduced-motion change mid-visit (sprint 22's dropped riders) | **Ride,** as B3.8 and B3.4 |
| C14's draw count under load (sprint 22) | **Rides,** as B3.6 |
| Batch E: Iris's one-line revision descriptions (`.crew/sprint/24/decisions.md`, 7) | **Rides.** From 1024 px, each Description cell is one line with an ellipsis, with the full goal in the DOM. Phones keep the full text. B1.5's "truncated cells" assertion is rewritten to that, and the owner approves it |
| The roadmap's font and facts riders | **Don't ride:** this sprint touches neither |

## Check disposition

There are 106 tests in `e2e/*.spec.ts`, counted by `test(`, with a per-scheme or per-route template
counted once. **103 keep, 3 rewrite, 0 retire.** Full is now the default on `/` at 1024 px and up,
so every spec that opens `/` at that width loads the model. Each one below was read against that.

| File | Test | Disposition | Reason |
|---|---|---|---|
| plan.spec.ts | B1.8 it needs no script and nothing moves | **rewrite** | Its pixel comparisons of `[data-plan]` at scroll 120, 400 and bottom-and-back take the 2D sheet with WebGL refused: the canvas overlays the drawing's box, and a scroll skips the loft. Every other assertion runs as today, with the model loading: CLS, no-script equality, markup, no animations or transition events, print, forced colours. The model's own stillness is B3.6 |
| plan.spec.ts | B1.4, B1.9, C6, C9, B2.5 | keep | `[data-model]` is `[data-plan]`'s sibling. If the SVG draws its seams once (build note 7), the drawing's markup shrinks within the same rules. The canvas isn't an LCP candidate, is never hit, and logs no console error |
| read.spec.ts | B2.10 script bytes on `/`, `/read` and the 404 | **rewrite** | `/` is measured with WebGL refused, so the idle import isn't counted. The chunk has its own budget in B3.6. The 2,048 B stays unless the loader doesn't fit (Needs owner decision, 3). `/read` and the 404 are unchanged |
| read.spec.ts | B2.4, B2.6, B2.7, B2.11 | keep | `/read` has no model |
| sheet.spec.ts | B1.5 the revision block | **rewrite (E)** | "Truncated cells" becomes one line with an ellipsis from 1024 px, the full goal in the cell's DOM text, and the full text at 390. Every other assertion stays |
| sheet.spec.ts | B1.1, B1.2, B2.3 (both), B1.5 the reader, B1.6, B1.7, B1.10, B1.11, B2.9 riders | keep | No layout space, no new control and no font. B1.6 reads CSS, and B3.7 checks the canvas for copper |
| invariants.spec.ts | all 14 | keep | The canvas is aria-hidden and sized to its container. The scene's colours come from tokens, so the literal scan holds |
| keyboard.spec.ts | all 7 | keep | No new Tab stop: the canvas isn't focusable. Contact's first link stays the 12th stop |
| facts, cards, profile-sections, content, smoke, not-found, sprints-entry, sprints | all | keep | Untouched routes and sections |

**For the owner to approve:**
- **(E)** B1.5's one-line descriptions.
- B2.10's number, only if the loader exceeds 2,048 B.

Nothing retires.

## Out of scope

- **Sprint 26:**
  - below 1024 px (phones and tablets): the 5,355-triangle phone level, DPR 1.5, `touch-action:
    pan-y`;
  - device-based stepping (`hardwareConcurrency`, `deviceMemory`);
  - the phone's model scale.
- **Sprint 27:** the Full/Calm/Off control and its storage, Calm's events-only rendering, and the
  B2.3 and Tab-bound rewrites.
- **B4 and B5:** the graphite, copper and vellum states, labels on the model, crew events, and the
  ghost hull.
- **Also out:**
  - the ambient light;
  - a static AVIF for Off;
  - the model on `/read`;
  - View Transitions;
  - React Three Fiber;
  - GSAP;
  - WebGPU, unless the owner picks B;
  - any change to `content/`.

## Needs owner decision

1. **The stack: A (WebGLRenderer) or B (three/webgpu).** This PR builds on A and waits for the call,
   with the loft running on the preview. Pixel's recommendation is S7's paragraph, which the PR body
   quotes verbatim.
   - **A:**
     - 178,873 B gzip, about 182 to 187 kB on Vercel's wire, inside the 250 kB budget;
     - 4 to 5 draws;
     - about half B's JS per frame on WebGL 2 (S1, S3, S6).
     - It departs from `design/brief.md`'s Technology section (WebGPURenderer, TSL, GSAP). The retro
       proposes that section's edit.
   - **B:**
     - 280,606 B gzip, about 285 to 294 kB on the wire. **It misses the 250 kB budget in either
       encoding:** Vercel's brotli is about gzip's size (S1), so the draft's brotli restatement is
       withdrawn.
     - Choosing B means raising the budget to about 295 kB.
     - The TSL twin is ported here before the merge.
2. **Only if needed:** a first-load script budget above 2,048 B on `/` for the loader.
3. **Batch E:** B1.5's descriptions become one line from 1024 px, with an ellipsis. The full goal
   stays in the DOM, on phones and in the Log.

## Needs decision (Iris)

Pixel's numbers are beside each call. Iris decides with the running prototype
(`.crew/sprint/24/spike/recipe.sh`; `?option=a&play=2400` plays the move), since frames can't show
feel.

1. **The duration.** It stays 2.4 s until Iris rules, and a change is shown to the owner on this
   preview. From S5, with 2^−10u:

   | Duration | 90% of the move by | The last 1% creeps for |
   |---|---|---|
   | 2.4 s | 797 ms | 805 ms |
   | 1.8 s | 598 ms | 604 ms |
   | 1.5 s | 498 ms | 503 ms |
   | 1.2 s | 399 ms | 403 ms |

   At 2.4 s the eye reads about 0.8 s of motion and then a settle of about 50 frames that moves the
   hull about 1.5 px. 1.5 s reads as about 0.5 s of motion; 1.2 s reads as a flick.
2. **A short ease-in at the start.** The exponential ease-out is fastest at u = 0. The first step
   after the registered frame is 4.1 px at 60 fps at 1440, or 8 to 16 px at 30 fps, which may read
   as the pop the direction rules out (S5).
3. **Hold the height or the length.**
   - Holding the framed height (built) leaves the settled hull 21% shorter than its drawing: 812 to
     643 px at 1440 (S5).
   - Holding the framed width keeps the drawing's length. It's one word in `scene/loft.js`.
   - My visitor's view, for Iris to weigh: a hull that visibly shrinks as it lifts reads as moving
     away. One that keeps its length reads as rising off the page, which is the direction's story.
4. **The shadow as the scene's one texture.** It's a generated, CPU-baked blurred plane, not a
   download. The direction allows "no textures except a 64 px hatch", and the hatch is procedural
   (S7's notes). Also the shadow's darkness in both schemes.
5. **What the profile shows under the lifted model, and the seam weights.**
   - `loft.webp`'s frames 2 to 5 draw the profile unfilled behind the model.
   - The spike's frames show the DOM fills and some numbers still there
     (`s5-loft-1440.webp`).
   - With build notes 6 and 7, say what stays visible and which side's seams change.
6. **The dark scheme on the model** (`night-1440.webp`). The spike had the light tokens only.
7. **The settled framing at 1024,** where the drawing is narrower than at 1440.
8. **How the settled model appears under reduced motion:** a cut, or a short opacity fade (research
   A7). A fade runs only under `reduce`, so B1.8, which emulates `no-preference`, doesn't count it.

For sprint 26 rather than here: **the phone's model scale.** On the narrow profile at scale 0.5 the
hull is 59 px tall (S7's notes). The body-plan landing of `loft-390.webp` no longer applies, since
the narrow sheet has had no body plan since sprint 22.
