Outcome: option A (WebGLRenderer) meets every budget the cloud can measure, and option B (three/webgpu) misses two. A's 3D chunk is 178.9 kB gzip in Turbopack, the hull is 20.3k triangles on desktop and 5.4k on phones, a frame takes 4 to 5 draws, the first frame lands within 1 CSS px of the inked profile, and the loft holds the framed height within 0.8%. B's chunk is 280.6 kB gzip, and a frame takes 26 draws on its WebGPU backend. My provisional pick for B3's first build sprint is A. The owner makes the final call at the B3 demo.

(Atlas, after the report: decision 6 in `.crew/sprint/24/decisions.md` moves the owner's call to sprint 25's PR, before it merges, with the loft on its preview. Where this report says "at the B3 demo", read that.)

# B3 spike (sprint 24): the measurements

Pixel, for Atlas, Quill and Iris. Contract: `.crew/sprint/24/contract.md`. The direction: `.crew/sprint/17/direction-iris.md`.

The prototype is one scene (`scene/stage.js`) that both options share. Each option passes in its own three.js classes, so neither bundle pulls in the other's renderer. That scene has:

- 22 planks in one `BatchedMesh`, each with a per-plank state colour. Its alpha flags the pencil hatch, so one per-instance colour carries the whole state.
- The seams as one fat-line batch, and the outline as a second, heavier one.
- The deck and transom as one mesh.
- A contact shadow, baked once on the CPU.
- A loft in plain maths and a hand-written tween with quality stepping (`scene/loft.js`), no GSAP.

Every number below comes from this repository's toolchain in this session: Next 16.4.2 with Turbopack, three@0.186.1, and Playwright 1.64's headless Chromium. Headless Chromium here draws WebGL with SwiftShader, and WebGPU with Dawn's SwiftShader adapter, both on the CPU. So every frame below was drawn in software, and the tables mark the numbers that depend on the GPU.

## S1: the chunk's size, in Turbopack

The method: three routes in a worktree that has `three@0.186.1` (`next/app/`).

- `/spike-a` and `/spike-b` dynamic-import their scene on idle after first paint, mount it, and draw.
- `/spike-0` has the same loader without the import.

The worktree is built with `next build` and served with `next start`. The 3D chunk is the set of scripts the browser fetched on `/spike-a` or `/spike-b` that `/spike-0` didn't fetch, taken as each file's own compressed size.

| Option | Files | Minified | gzip -9 | gzip -6 | brotli 11 | brotli 5 | Budget (250 kB gzip) |
|---|---|---|---|---|---|---|---|
| A, `WebGLRenderer` | 5 | 703,099 B | **178,873 B** (174.7 KiB) | 179,519 | 148,310 | 167,009 | fits, 71 kB to spare |
| B, `three/webgpu` | 5 | 1,022,038 B | **280,606 B** (274.0 KiB) | 281,517 | 227,748 | 258,012 | over by 30.6 kB |

- **The files:** the two options share one chunk, 326,660 B (86,981 gzip), which holds three's core and the spike's own code. A adds the WebGL renderer, 372,211 B (89,367 gzip). B adds 691,150 B (191,102 gzip), which holds the WebGPU backend and its WebGL 2 fallback. B's files don't contain `WebGLRenderer`: Turbopack shook out the `three` import that the fat-line addon brings in. Three small loader chunks make up the rest, 4.2 kB.
- **Against the page:** the page's own scripts (`/spike-0`) total 459,567 B, 136,176 gzip. The 3D chunk comes on top of them, after first paint.
- **Against the research's esbuild numbers:** esbuild 0.25.12 bundled the same entries, as a control, to 151,791 B gzip for A and 290,657 B gzip for B. Turbopack is therefore 17.8% bigger than esbuild for A and 3.5% smaller for B. B is the exception because esbuild's B carries 161,510 B of `three.module.js`, which the fat-line addon's `three` import pulls in and Turbopack shakes out (esbuild's metafile). The research measured 136 KiB for A and 245 KiB for B (139 and 251 kB), in builds with no fat lines and no scene. For A, the fat lines, the scene, the loft and the shadow bake add about 12 KiB gzip to that figure.
- **On the wire, Vercel's brotli is no smaller than gzip.** I fetched production's three largest scripts and compared what Vercel serves with local compression of the same files:

  | File | Vercel brotli | Vercel gzip | Local gzip -9 | Local brotli 4 | Local brotli 11 |
  |---|---|---|---|---|---|
  | 230,308 B | 73,426 | 72,829 | 72,051 | 71,922 | 61,663 |
  | 186,644 B | 50,638 | 50,527 | 49,837 | 49,505 | 42,083 |
  | 112,594 B | 41,343 | 39,797 | 39,520 | 40,495 | 35,158 |

  The research costed B as "brotli on the wire (about 200 KiB)". That assumes quality 11, and Vercel served about quality 4, so the budget should be read as gzip. Vercel's brotli came out 1.6% to 4.6% above local gzip -9, so on the wire A is about 182 to 187 kB and B about 285 to 294 kB.
- **The commands:**
  - `node .crew/sprint/24/spike/measure/s1-chunks.mjs <worktree> 3342 s1.json`
  - `node .crew/sprint/24/spike/measure/s1-esbuild.mjs <esbuild dir> <worktree> s1-esbuild.json`
  - `node .crew/sprint/24/spike/measure/s1-vercel-brotli.mjs`

## S2: the geometry

The whole hull is both halves of `lib/half-model.ts`'s 22 planks, plus the deck, the transom and the shadow plane. Each plank is meshed on cosine-spaced stations along the hull. Every lift's ends are added to those stations, with rows across each lift (`scene/hull-mesh.js`, `LEVELS`).

| Level | Stations × rows | Planks | Deck and transom | Shadow | **Mesh triangles** | Budget | Vertices | Fat-line segments |
|---|---|---|---|---|---|---|---|---|
| Desktop | 120 × 8 | 20,000 | 297 | 2 | **20,299** | ≤ 30k (68%) | 11,946 | 1,628 |
| Phone | 56 × 4 | 5,200 | 153 | 2 | **5,355** | ≤ 12k (45%) | 3,626 | 828 |

`renderer.info` also counts each fat-line segment as 6 triangles (its instanced quad with round caps), for frame totals of 30,067 and 10,323. If the build holds the budget against that count, desktop is 67 over. Two fixes would each restore the margin: 100 stations instead of 120, or two-triangle line quads.

Command: `node .crew/sprint/24/spike/measure/s2s3-count.mjs s2s3.json`.

## S3: the draws

The count is `renderer.info` for the whole frame: `autoReset` off, reset before each frame. WebGL reads `render.calls` and WebGPU reads `render.drawCalls`.

| Stack | Registered frame (u = 0) | Settled frame | Budget (≤ 8) |
|---|---|---|---|
| A, WebGL 2 with `WEBGL_multi_draw` (SwiftShader) | 4: planks, deck, seams, outline | 5: plus the shadow | fits |
| B on its WebGL 2 fallback (SwiftShader) | 5: plus the output pass | 6 | fits |
| B on WebGPU (SwiftShader's Vulkan adapter) | **26** | **27** | **over** |

- **B on WebGPU:** that backend issues one draw per `BatchedMesh` instance (`WebGPUBackend.js`, the `isBatchedMesh` loop), so the 22 planks cost 22 draws. B also renders into an internal target and converts it to sRGB in a full-screen pass. That pass adds a draw and a full-canvas read and write on every frame, while `outputColorSpace` differs from the working space.
- **A without `WEBGL_multi_draw`:** `WebGLRenderer.js` falls back to the same per-instance loop, which comes to 25 or 26 draws (A has no output pass). SwiftShader exposes the extension, so this run didn't take that path. Whether Safari exposes it is unverified here.
- **One draw for the planks on every stack:** merge the 22 planks into one geometry with a per-vertex plank index, and look each plank's state up in a 22-entry uniform array or data texture. A plank's state change is then a texel update, as it is now.

Command: `node .crew/sprint/24/spike/measure/s2s3-count.mjs s2s3.json`. Option B on WebGPU needs Chromium's `--enable-unsafe-webgpu` (`measure/browser.mjs`).

## S4: registration on the inked profile

The method: the prototype is the built home page served from the scratchpad, with Next's scripts replaced by the spike's driver (`proto/`). It lays the canvas over whichever drawing is showing, at the same CSS size, and draws the first frame orthographically at u = 0.

For each width and DPR there are four screenshots of the drawing's box. In each, the rest of the page is hidden so that the PNG's alpha is coverage:

- the SVG's `.ln-outline` alone;
- the model's outline lines alone;
- the SVG's hull as a solid silhouette (its planks filled, clipped by the hull);
- the model's card alone.

The table gives the largest distance from any covered pixel of one render to the nearest of the other (Hausdorff), in CSS px, at a 50% threshold. Pixels are read from screenshots, never `readPixels`.

| Option, width, DPR | Canvas DPR | Outline, max | Silhouette, max |
|---|---|---|---|
| A, 1440, 1 | 1 | **1.0** | 1.0 |
| A, 1440, 2 | 2 | **0.71** | 0.71 |
| A, 390, 1 | 1 | **1.0** | 1.0 |
| A, 390, 2 | 1.5 (the phone cap) | **0.5** | 0.5 |
| A, 390, 2 | 2 | 0.5 | 0.5 |
| B (WebGL 2), 1440, 1 | 1 | 1.0 | 1.0 |
| B (WebGL 2), 390, 2 | 1.5 | 0.5 | 0.5 |

At DPR 1, 1.0 means one device pixel, which is the method's resolution. Below the pixel, the coverage-weighted centre of each stroke gives the outline's mean offset, model minus SVG. It is 0.03 to 0.15 px on the sheer, −0.02 to 0.27 on the keel and −0.05 to 0.05 on the transom. The largest single column is 0.64 px, on the keel at 1440 and DPR 2.

The SVG's own splines contribute part of that (`measure/s4-curves.mjs`). The sheer and the profile are Catmull-Rom curves through 9 and 29 points. They stray from `lib/half-model.ts`'s true curves by at most 0.05 px on the sheer and 0.40 px on the profile near the stem, both at 1440.

Frames:

- `frames/s4-register-1440.webp` and `frames/s4-register-390.webp`: magenta is the SVG's ink alone, cyan the model's alone, blue both. Each has 4× insets of the stern, the keel and the stem.
- `frames/s4-handoff-1440.webp`: what changes on screen when the registered frame appears.

**What it took to get under 1 px.** Each of these was found by this check, and each is a rule for B3:

1. **Size the canvas in whole drawing-buffer pixels**, as `round(css × dpr) / dpr`. three.js floors the buffer but rounds the viewport. The drawing is 475.31 px tall at 1440, so the frame stretched by a row and lifted the model 0.42 px at DPR 2.
2. **Make every lift's ends stations** shared by the card and the outline. Before that, the card stopped a station short where a lift runs out against the counter, which left 2 to 3 px notches at 1440. Its corner at the stem also strayed 1.4 px from the ink at 390.
3. **No offsets in the side view.** A 0.4-unit offset kept the transom line off the card, and it drew 0.52 px aft. A lift along the normal did the same for the seams, and it moved the lower seams down. The card's polygon offset does the job instead.

**The hand-off isn't seamless yet.** At 1440 and DPR 1, 4,891 of 667,850 px change by more than 48 levels when the canvas appears (`measure/s4-handoff.mjs`):

- **The plank numbers vanish.** They are HTML under the canvas. They have to sit above it, or be DOM twins.
- **The seams lighten.** The SVG strokes every plank's rectangle, so each interior seam is inked twice and reads darker than the model's single 0.9 px line. Either the SVG draws its seams once, or the model's seams get heavier.

The fills match exactly: the flat-to-lit mix is 0 at u = 0.

The commands:

- `node .crew/sprint/24/spike/measure/s4-register.mjs <dir>`
- `node .crew/sprint/24/spike/measure/s4-centroid.mjs <dir> <name> <dpr>`
- `node .crew/sprint/24/spike/measure/s4-curves.mjs`
- `node .crew/sprint/24/spike/measure/s4-handoff.mjs <dir>`
- `node .crew/sprint/24/spike/measure/s4-frames.mjs <dir> frames`

## S5: the loft

**The move.** The camera never turns. It looks straight down at the sheet from the canvas's centre and only dolly-zooms. 1/D, the strength of the perspective, runs linearly with the eased progress, from orthographic to a 30° lens over the first viewport's height: D = 1,679 px at 1440 × 900 and 1,575 px at 390 × 844. Its frustum at z = 0 is the canvas at every frame, so the sheet, the shadow on it and the page stay registered. The model lifts off the sheet and turns to the three-quarter pose that sprint 17 approved: yaw −30° and pitch 15° on desktop, −36° and 16° on phones. Its scale is solved at 48 samples, so its framed height holds (`scene/loft.js`, `scene/poses.js`).

**The framed height** is measured on canvas-only screenshots, as the rows with alpha ≥ 0.5. It includes the 1.6 px outline:

| u (share of the duration) | e (eased) | 1440: height | 1440: length | 390 (DPR 2): height | 390: length |
|---|---|---|---|---|---|
| 0 | 0 | 155 px | 812 px | 61 px | 313.5 px |
| 0.25 | 0.823 | 155 | 698 | 60.5 | 271 |
| 0.5 | 0.969 | 155 | 653 | 61 | 253.5 |
| 0.75 | 0.994 | 155 | 644 | 60.5 | 251 |
| 1 | 1 | 155 | 643 | 61 | 250 |

The largest drift is **0.0% at 1440 and 0.82% at 390** (one device pixel), against a 2% budget. Frames: `frames/s5-loft-1440.webp` and `frames/s5-loft-390.webp`. They show a pencil plank and a copper plank (`live=1`).

**Holding the height costs length.** At the settled pose the hull is 21% shorter on screen than the drawing: the turn foreshortens it, and the visible deck adds height that the hold takes back. If the settled hull should keep the drawing's length instead, hold the framed width. That is one word in `loft.js` (`framed(...).height`).

**The durations** (`measure/s5-motion.mjs`, from the loft's own maths). The frames are the same for every duration; only their timing changes.

| Duration | Half the move | 90% | 99% | The last 1% creeps for | Travel in the first frame at 60 fps (1440 / 390) |
|---|---|---|---|---|---|
| 2.4 s (the direction's) | 240 ms | 797 ms | 1,595 ms | 805 ms | 4.1 px / 1.9 px |
| 1.8 s | 180 ms | 598 ms | 1,196 ms | 604 ms | 5.5 / 2.6 |
| 1.5 s | 150 ms | 498 ms | 997 ms | 503 ms | 6.5 / 3.1 |
| 1.2 s | 120 ms | 399 ms | 797 ms | 403 ms | 8.1 / 3.8 |

The skeleton travels at most 149 px at 1440 and 55 px at 390. What each duration feels like, from the frames and the headless timing (SwiftShader, so the pacing isn't a phone's):

- **The exponential ease-out (2^−10u) is front-loaded.** At 2.4 s, 82% of the move is done by 600 ms (the u = 0.25 frame). The u = 0.5, 0.75 and 1 frames are almost the same picture, and the last 805 ms moves the hull about 1.5 px. The eye reads roughly 0.8 s of motion, then a long settle that still costs about 50 frames of rendering. At 1.5 s the reading is about 0.5 s of motion, which is brisker, and the creep halves. At 1.2 s it becomes a flick.
- **The move starts at full speed.** Exponential ease-out is fastest at u = 0, so the frame after the registered one is the move's biggest step: 4 to 8 px at 60 fps on desktop. At 30 fps those steps double, to 8 to 16 px at 1440 and 4 to 8 px at 390. That may read as the pop the direction rules out.

Needs decision (Iris): the duration, a short ease-in at the start, and which framed size the move holds. Each is one line in `scene/loft.js`, and they are judged by feel: the running prototype shows them, and these frames can't. The recipe's prototype URL with `?option=a&play=2400` plays the move.

## S6: frame time

The method: `Emulation.setCPUThrottlingRate` at 4 over CDP, in Playwright's Chromium. Each configuration plays the loft twice, once with quality stepping off (the raw cost) and once with it on. It then benches the settled frame alone, which is a crew event's redraw, and counts the frames drawn in the two seconds after the loft. **cpu** is the JS time of one frame: pose, scene walk and draw submission. That is the throttled number and the meaningful one here. SwiftShader rasterises on the CPU in the GPU process, which the throttle doesn't slow. It lets animation frames run ahead and then stalls for up to 2.3 s, so frame intervals understate its cost. "fps" below is the number of frames drawn per second of the move. **All of it is a floor, not a phone's.**

| Stack (SwiftShader) | Width, DPR (canvas) | Duration | Frames (per s) | Longest stall | **cpu per frame, median / p95 / max** | Settled frame alone, median / p95 | Scene build / first frame |
|---|---|---|---|---|---|---|---|
| A | 1440, 1 (1) | 2.4 s | 63 (26/s) | 1.22 s | **1.1 / 5.7 / 8.8 ms** | 1.2 / 3.2 ms | 338 / 81 ms |
| A | 1440, 2 (2) | 2.4 s | 26 (10/s) | 2.27 s | **1.1 / 5.0 / 7.1** | 1.0 / 2.6 | 308 / 81 |
| A | 390, 2 (1.5) | 2.4 s | 124 (51/s) | 0.37 s | **0.9 / 3.0 / 12.6** | 0.2 / 1.3 | 258 / 78 |
| A | 390, 2 (1.5) | 1.5 s | 71 (47/s) | 0.35 s | **1.3 / 4.0 / 7.7** | 1.2 / 4.8 | 258 / 84 |
| B, WebGL 2 fallback | 1440, 1 (1) | 2.4 s | 42 (17/s) | 1.18 s | **2.3 / 5.8 / 7.0** | 2.0 / 4.9 | 543 / 50 |
| B, WebGL 2 fallback | 390, 2 (1.5) | 2.4 s | 72 (29/s) | 0.73 s | **2.1 / 6.7 / 8.9** | 1.8 / 2.6 | 409 / 74 |
| B, WebGPU (not presented) | 1440, 1 (1) | 2.4 s | 131 (54/s) | 0.23 s | **1.4 / 3.6 / 6.5** | 1.2 / 2.7 | 526 / 29 |
| B, WebGPU (not presented) | 390, 2 (1.5) | 2.4 s | 135 (56/s) | 0.17 s | **1.5 / 3.8 / 7.5** | 1.3 / 2.3 | 485 / 29 |

These are the runs with quality stepping off, from the measuring run. The recipe's own rerun is within 0.6 ms of each median. With it on, every run still finished its move. B on WebGL 2 at 390 stepped down from DPR 1.5 to 1 on SwiftShader's stalls, and A never stepped. B's WebGPU runs drew more frames per second in software, but its canvas never reached a screenshot ("Instance dropped in popErrorScope"), so I don't read that rate as speed. The scene build includes the geometry, the shadow bake and every program's compile, all at 4×.

- **At rest:** 0 frames drawn in the 2 s after every loft. The Chromium trace agrees: 0 animation frames after the loft at both widths. During the loft at 4×, the page's main thread was busy 34% of the time at 390 and 58% at 1440 (`measure/s6-trace.mjs`). The chrome-devtools MCP can't start Chrome as root in the cloud, so the trace was recorded through Playwright with the same timeline categories.
- **Compile the programs before the registered frame.** The shadow's program used to compile on the loft's first frame, as a hitch mid-move. `renderer.compileAsync` now compiles it before frame 0 (`scene/stage.js`).

**Quality stepping, as designed and built** (`scene/loft.js` `playLoft`, `scene/stage.js` `step`):

- **Before the loft:** the DPR is capped at 1.5 on phones (below 768 px) and 2 on desktop. The triangle level is chosen by width: phone below 768 px. B3 could add `navigator.hardwareConcurrency ≤ 4` or `deviceMemory ≤ 4`. Every program compiles, and the registered frame is drawn hidden.
- **During the loft:** three frames in a row above 22 ms step the DPR down (2, then 1.5, then 1). At DPR 1, six frames in a row under 30 fps (above 33.4 ms) give up the move for the settled still frame. The direction asks for that still frame under 30 fps.
- **Stepping up, below 12 ms:** never mid-move, where a change of resolution shows. It belongs at the next redraw. `stage.step("up")` exists, but the spike doesn't call it.
- **At rest:** nothing loops. A crew event draws one frame, and the tab going hidden ends the loft on its settled frame. B3 adds an IntersectionObserver so that an off-screen canvas skips its redraws, which the spike doesn't do.

The cloud can't validate the stepping, because SwiftShader's pacing (run-ahead, then stall) isn't a GPU's: it stepped option B down once at 390, to DPR 1, on a stall. It needs the owner's phone at the demo, with the hand-off and the loft on screen.

The commands:

- `node .crew/sprint/24/spike/measure/s6-frames.mjs s6.json`
- the same with `webgpu` added
- `node .crew/sprint/24/spike/measure/s6-trace.mjs <dir> 390 2 2400`

## S7: the recommendation

**I recommend A, WebGLRenderer, for B3's first build sprint.** A visitor who turns on Full downloads 180 to 190 kB on Vercel's wire after the name has painted, rather than 285 to 295 kB. Only A fits the 250 kB budget. A frame is 4 to 5 draws on any WebGL 2 browser that has multi-draw, where B on WebGPU takes 26 until the planks are merged into one mesh. In software at 4×, B took longer to build its scene than A did (410 to 540 ms against 260 to 340 ms). On its WebGL 2 fallback it also spent about twice A's JS per frame (2.1 to 2.3 ms median against 0.9 to 1.3). B buys nothing this card model needs. TSL, compute and a lower CPU cost per draw pay off with many draws or GPU simulation. At 5 draws they don't, and the three.js manual, as the research quotes it (section D), still calls WebGPURenderer "experimental", with WebGLRenderer "the recommended choice for pure WebGL 2 applications". Reach is a wash: B falls back to WebGL 2 by itself, and A runs wherever that fallback would. A's shader work is about a dozen lines of GLSL injected into `MeshStandardMaterial`: the flat-to-lit mix and the hatch. Its TSL twin already exists in this spike (`scene/scene-webgpu.js`, on the same shared scene), so moving to WebGPU later means swapping one module, if the Studio's or the owner's plans make it worth the bytes. The owner takes the final call at the B3 demo, on a real phone.

## What B3's build takes from this

These come out of the measurements above. They are the build's notes, not decisions:

- Merge the planks into one mesh with a per-vertex plank index, so a frame is one draw on every stack (S3).
- Size the canvas in whole buffer pixels (S4, rule 1).
- Mesh on shared lift ends (S4, rule 2).
- Draw nothing offset in the side view (S4, rule 3).
- Precompile every program (S6).
- Put the plank numbers above the canvas (S4).
- Weight the seams the same in the SVG and the model (S4).
- Export `lib/lines-plan.ts`'s layouts (WIDE, NARROW) and its `PLANKS`, from a module that draws no SVG. The spike had to copy them (`scene/poses.js`, `scene/hull-mesh.js`), because importing `lib/lines-plan.ts` would pull the SVG drawing into the 3D chunk.
- The contact shadow is a blurred coverage grid baked on the CPU, part of a 260 to 340 ms scene build at 4× (not timed on its own). It is one textured plane: no shadow map and no extra pass. It is right at the settled pose and fades in under the lift. It is a generated texture, not a download. The direction allows "no textures except a 64 px hatch", and the hatch here is procedural, so the shadow plane is the scene's one texture (Iris to confirm).
- The phone registers on the narrow profile at scale 0.5, because the narrow sheet has no body plan since sprint 22, and the hull is 59 px tall there. The direction's phone hand-off to the body plan no longer applies. Needs decision (Iris): whether the phone's settled pose should grow the model beyond its drawing.

## Against Quill's draft (`.crew/sprint/24/b3-first-contract.md`, as committed in 2fae937)

- **Its decision 2 doesn't rescue B.** It restates B's budget "as 250 KB brotli on the wire, since Vercel serves brotli". Vercel does serve brotli, but at about quality 4, which is no smaller than gzip (S1's table). B is about 285 to 294 kB on the wire, so it misses a 250 kB budget whichever encoding the budget names. Only quality 11 would fit, at 227.7 kB, and Vercel didn't serve that.
- **"One `BatchedMesh` holds every plank" holds the draw budget on A with multi-draw only.** On WebGPU, or on WebGL without `WEBGL_multi_draw`, it is 22 draws for the planks (S3). A merged plank mesh with a per-vertex plank index meets the same intent, a per-plank state, in one draw everywhere.
- **"Within 1 CSS px at every width from 1024 to 1920" goes beyond what I measured.** I measured 1440 and 390 only. The rule that makes other widths hold is S4's whole-pixel canvas, since every width gives the drawing a fractional height.
- **The harness that "samples the canvas" at frame 1 should read screenshots.** `.crew/STATE.md` has the lesson: `readPixels` returns zeros outside the drawing frame.

## What I couldn't verify

- **A phone or any real GPU.** Every frame and timing is SwiftShader in headless Chromium, so the 30 fps budget, the fill cost of MSAA at DPR 1.5, and the stepping thresholds need the owner's mid Android and an iPhone in Low Power Mode.
- **Whether Safari exposes `WEBGL_multi_draw`.** Without it, A's batched planks draw 22 times. The merged mesh removes the question.
- **B's WebGPU frames.** Its draws and timings were measured, but the canvas didn't present in headless screenshots (Dawn logged "Instance dropped in popErrorScope"). B's registration was checked on its WebGL 2 fallback only.
- **What each duration feels like.** These are frames and numbers, not motion. Iris wasn't on this sprint.
- **Dark mode.** The scene has the light sheet's tokens only.

## Memory lines for Atlas to commit (`.claude/agent-memory/creative-engineer/MEMORY.md`)

- B3's stack call rests on `.crew/sprint/24/spike/spike.md`: in Turbopack, WebGLRenderer's 3D chunk is 179 kB gzip and three/webgpu's is 281 kB, over the 250 kB budget. Vercel serves brotli at about gzip's size, so budget on gzip (sprint 24).
- Size a three.js canvas in whole drawing-buffer pixels (`round(css × dpr) / dpr`). three floors the buffer but rounds the viewport, and a fractional height lifted the registered hull 0.4 px at DPR 2 (`.crew/sprint/24/spike/spike.md`, S4).
- `BatchedMesh` is one draw only on WebGL with `WEBGL_multi_draw`. WebGPU, and WebGL without the extension, draw once per instance: 26 draws for the hull. One merged plank mesh with a per-vertex plank index keeps every stack within 8 (`.crew/sprint/24/spike/spike.md`, S3).

Correction to an existing line: the second line names `lib/half-model-svg.ts`, which no longer exists. The SVG drawing is `lib/lines-plan.ts` now (sprint 22).

## Files

- `scene/`: the shared scene (`stage.js`), the hull as arrays (`hull-mesh.js`), the loft (`loft.js`), the shadow bake (`shadow.js`), the poses (`poses.js`), and the two options (`scene-webgl.js`, `scene-webgpu.js`). It is plain JavaScript on purpose: `tsconfig.json` includes every `.ts` in the repository, and the app doesn't install three.
- `next/app/`: S1's three routes and loaders, copied into the worktree.
- `proto/`: builds and serves the prototype page (`build-proto.mjs`, `serve.mjs`), and its driver (`proto.js`). The driver's query is documented in its header.
- `measure/`: one script per measurement, sharing `browser.mjs`.
- `frames/`: five webp frames, each under 60 kB.
- `recipe.sh`: runs everything from a fresh checkout into a temp folder. Nothing in `app/`, `components/`, `lib/` or `e2e/` changes. It ran end to end in this session from a fresh worktree of 2fae937, with exit 0 and its worktree removed. S1 to S5 came out the same to the byte and the pixel. S6's medians moved by up to 0.6 ms between runs: A was 1.0 to 1.8 ms, B on WebGL 2 2.7 to 2.9.
- **The CI checks ignore this folder.** With it in the checkout, `pnpm lint` (`biome ci`, 91 files, none of them here) and `pnpm knip` both exit 0, and the TypeScript program (`tsc --listFilesOnly`) includes no file under `.crew/`.
