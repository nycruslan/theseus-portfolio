# Sprint 33 spike (Pixel): the model's mount on `/log`

Pixel, 2026-10-25. A scratch mount of the ghost hull on `/log` in my worktree
(`/home/user/wt-pixel-33`, branch `pixel/33`, from c299b7d), measured with B3's own harness
(`e2e/webgl.ts`'s `openModel`, the frame and draw recorder) and B2.10's and B3.6's byte methods
against `next start` on 4850 (the base) and 4851 (the spike). The scratch ghost is one side,
opaque, cursor-only hover, built before Iris's notes landed; section 2 adds her look as counted
geometry. Every GPU number is SwiftShader's floor. The scripts are in my scratchpad (`maths/`).

## The answer

- **The seam is the DOM, and the loader doesn't change by a byte.** `components/model.tsx` renders
  on `/log` as it is (`<Model seated={[]} />` right after the ghost). The chunk tells the routes
  apart by the drawing beside its layer (`[data-ghost]`, not `[data-plan]`) and reads the ghost's
  seats and numbers off that drawing (`path[data-plank][data-sprint]`, which the server drew with
  `ghostPlanks`, B5.4's oracle). So the 3D can't disagree with the 2D, and B2.10's 10 B stays
  untouched (Lens's #74 nit is the only loader change, about 3 B).
- **One chunk, the same file on both routes:** 147,126 B gzip -9 with the spike's ghost code in it
  (`/`'s today: 145,277 B), at 1440 and 390, on `/` and `/log`. A visitor from `/` downloads no new
  3D.
- **Cheap:** 3 draws and 15,580 triangles from 768 px, 5,476 below, in the scratch ghost. Iris's
  both-sides ghost is 26,288 and 8,432 with two hover or record marks, **if** her two passes draw
  one side's index range each; as three's default two-pass `DoubleSide` it's 46,288 and 13,632,
  over both budgets (section 2).
- **0 frames at rest** with the pointer across all 22 numbers. Off-screen and hidden hold once
  visibility is judged on the drawing's box, not the layer's (section 5, item 3).
- **Pick by raycast at rest, against a coarse proxy:** 0.1 ms a move (0.5 to 0.7 ms against the
  drawn mesh, 2.9 ms at 4x CPU). The slot maps to `PLANKS[slot].id`, then to the drawing's
  `data-sprint`. In the scratch build, 21 of 22 numbers' centres opened their own record. "20"
  (seat 5.0, led out aft of the hull) opened nothing, which is why Iris tests that number's box
  first. An ID buffer is out: a pick render is a draw at rest.
- **The numbers as HTML moved by a transform** (Iris's call, and sprint 17's own render did it).
  That costs 0 draws and 0 textures, frame 1 changes no number pixel, and the browser does about
  0.7 ms of style work per moving frame at 768 on this CPU (from the trace). In dark, `/`'s ×4
  lamp puts 8 to 9 numbers under 4.5:1; Iris's 1.6 fixes the cause (section 4).

## 1. What's shared and what's per route

| | Shared, unchanged | Per route (the ghost's, in the chunk) |
|---|---|---|
| Loader, mode, control, storage | `components/model.tsx` byte for byte; `theseus:motion` | nothing |
| Lifecycle | idle import, WebGL 2 probe, stepped build, rest, 0 frames at rest, resize and 768 crossing, scheme, forced colours, bfcache, lost context, quality net | the once-a-visit flag `theseus:ghost` beside `/`'s `theseus:model` (contract call 3); visibility judged on the drawing |
| Geometry | `buildHull` at `DESKTOP` from 768, `PHONE` below; plank slots; the outline | `buildHull(level, seats)`: the ghost's seats only, no deck or transom; the ghost's own edges |
| Scene | renderer, card material and its slot lookup, fat lines, rig, the hand-set dolly-zoom camera | `createStage(canvas, hull, ghost)`: vellum tints, ghost line tokens and weights, no shadow; `pick()` and `screen()` |
| Loft | `makeLoft`, its solve, the 48-sample table, `ease()` | a `Settle` per layout: `GHOST` gets its own turn, lift, growth, and (for Iris) its `HOLD` and duration |
| Drawing | the canvas on the drawing's box in whole buffer pixels | one drawing (`.plan-ghost`, `GHOST` layout) at every width, both `Sheet`s pointing at it |

The smallest seam, as built on `pixel/33`:
- `lib/model/mount.ts` `start()` reads `host.previousElementSibling`: `[data-ghost]` sets both sheets
  to `.plan-ghost` with `GHOST`, and the level and cap still step at 768 (`DESKTOP` and 2×,
  `PHONE` and 1.5×).
- `Settle` gains `lift` (the sheet keeps `LIFT`), and `settleOn` gets a `GHOST` branch.
- `createStage` takes `ghost`.
- `buildHull` takes the seats.

`/`'s maths is unchanged bit for bit: `buildHull` at both levels and `makeLoft` at 8 drawing widths
× 101 steps equal the base's (node, the repo's own modules).

For Iris's look, the build needs two more per-route fields: `HOLD` (she holds width; `/` holds
height) and `DURATION` (1.8 s against 2.4 s), both global constants today.

## 2. Cost

| Size | Drawing (CSS px) | Buffer | Draws | Triangles | Move (SwiftShader) | At rest |
|---|---|---|---|---|---|---|
| 1440 × 900 @1 | 900 × 179.4 | 900 × 179 | 3 | 15,580 | `still` after 6 frames (the net, as on `/`) | 0 |
| 1440 × 900 @2, dark | 900 × 179.4 | 1800 × 359 | 3 | 15,580 | `still` | 0 |
| 1024 × 768 @1 | 568 × 113.2 | 568 × 113 | 3 | 15,580 | `still` | 0 |
| 768 × 1024 @2 | 736 × 146.7 | 1472 × 293 | 3 | 15,580 | `still` | 0 |
| 390 × 844 @2 | 358 × 71.4 | 537 × 107 (1.5×) | 3 | 5,476 | full, settled at 2.3 s | 0 |
| 390 × 844 @3, dark | 358 × 71.4 | 537 × 107 | 3 | 5,476 | full | 0 |
| 320 × 640 @2 | 288 × 57.4 | 432 × 86 | 3 | 5,476 | full | 0 |

- "At rest": 3 s with the pointer moved over every number and a 40 px scroll and back; the
  cursor showed `pointer`.
- `/log/13` is the same as `/log` at 1440.
- Off-screen, a scheme switch drew 0 frames and 1 once back, and hidden drew 0 and 1 once shown, at
  1024 and 390; at 1440 × 900 see section 5, item 4.
- Modes: `off` stored and Save-Data each made 0 WebGL requests and loaded `/`'s six files with no
  state; Calm and reduced motion each went straight to `settled` with one frame.
- At 4x CPU, 390 @2: JS per drawn frame was 3.1 ms median on `/log` against 2.6 on `/`. The longest
  task was 204 ms against 250, since the ghost bakes no shadow.

**Iris's ghost, counted** (both sides, no deck or transom face; from the geometry the spike builds):

| Submitted triangles, with 2 marks (hover and record) | From 768 (≤ 30,000) | Below (≤ 12,000) |
|---|---|---|
| Card once (per-side index ranges), lift seams, outline | **26,288** | **8,432** |
| Card once, each plank's own edges on both sides, outline | 29,912 | 10,328 |
| Card twice (three's default two-pass transparent `DoubleSide`) | 46,288, over | 13,632, over |

- So the far pass and the near pass must each draw one side's index range: two geometries sharing
  the buffers, or groups with a `BackSide` and a `FrontSide` material. The near side is `+z` at
  every pose of a −20° yaw and 12° pitch, so the split is static.
- That's her 5 draws (far, near, seams, outline, marks) at 26,288 triangles.
- A single `forceSinglePass` `DoubleSide` draw would make 4, but it also draws the near side's own
  back faces wherever the bilge turns under, so it isn't her look.
- Use the sheet's shared lift seams, drawing a segment only where a plank beside it exists. A gap
  (fixtures only, k < 22) then leaves no seam, without the 3,600 extra triangles that per-plank
  edges cost.

## 3. Picking

| Pick | Per pointermove, median (p95) | At 4x CPU | Notes |
|---|---|---|---|
| Raycast, the drawn mesh at `DESKTOP` (10,000 triangles a side) | 0.5 to 0.7 ms (0.7 to 1.4) | 2.7 to 2.9 ms (4.6 to 5.0) | three's `Mesh.raycast` walks every triangle |
| Raycast, the drawn mesh at `PHONE` | 0.2 ms (0.4) | | |
| Raycast, a proxy hull at 24 stations × 2 rows | **0.1 ms (0.2)** | 0.1 to 0.5 ms (1.0 to 1.4) | the same slots; plank edges exact at any level, since every level's stations include each plank's ends |
| ID buffer | not built | | a pick render is a draw (B3.6 counts it as a frame at rest), `readPixels` stalls the GPU, and in CI each readback is 100 to 300 ms |

- **Recommended:** the proxy, `DoubleSide`, so a pointer above the near sheer hits the far side's
  inside, as Iris's hover wants. Skip three's `setFromCamera` (it would treat the hand-set projection
  as orthographic) and build the ray by unprojecting NDC z −1 and 1 through
  `camera.projectionMatrixInverse`.
- **Mapping:** slot → `PLANKS[slot].id` → the drawing's `data-sprint` → `/log/<n>`. The same rule
  the 2D drawing renders, so nothing is computed twice.
- **Measured end to end:**
  - a real click on 13's number opened `/log/13`, which opened `settled` (the flag);
  - Back returned to `/log`, `settled`, from the bfcache;
  - a click off the hull opened nothing.
- **The style write is the cost, not the ray.** With `main`'s cursor written on every move, the
  handler cost 0.8 to 2.1 ms where the ray took 0.1 to 0.7, because the next rect read restyles
  `main`'s whole table. Write only when it changes. Better still, put the cursor on the canvas,
  since Iris gives the canvas pointer events at rest: that restyles only the canvas, and B5.23 can
  read the canvas's cursor as the contract says. With `pointer-events: none` it would have to read
  the computed cursor under the point instead.
- **A press during the move.** If the pick listens on the canvas, and the canvas takes events only
  at rest, a `pointerdown` that lands mid-move is on `main`. Its `click` then never reaches the
  canvas, even when the move has settled before the finger lifts, so "a pointerdown during the move
  opens nothing" comes free. A window listener (the scratch build's) would open a record there.

## 4. The numbers

| Way | Draws | Texture | Frame 1 | Cost | Verdict |
|---|---|---|---|---|---|
| HTML, the drawing's spans moved by `transform` (measured, as clones) | 0 | none | registered by construction: with the 2D numbers kept until `lofting`, 0 number pixels change | about 0.7 ms style per moving frame at 768 (trace: 0.69 median against `/`'s 0.00), 0 layout, 0.07 paint; nothing at rest | **take it** (Iris's call 2 agrees) |
| Canvas atlas on plank quads | +1 | an atlas of about 512 × 128 RGBA at the cap, after `document.fonts` loads the face | canvas text isn't DOM text, so frame 1 would move every number | glyphs foreshortened and filtered at 11 to 13 px | not built; no reason to |
| SDF text (troika) | +1 or more | a glyph atlas, a worker, a font file it can parse | the same mismatch | a dependency and kilobytes against the 250 kB | not built; no |
| Leave them to the 2D under a hollow canvas, as `/` does | 0 | | | the model turns in place over its drawing, so the 2D numbers would sit off their planks | only as "no numbers in 3D" |

- **Contrast at rest**, each number's own colour on the median of a ring 3 px round its box:
  - light: 5.98:1 at worst at 1440 and 1024;
  - dark, under `/`'s ×4 lamp: 3.18:1 at worst, with 9 numbers under 4.5:1 at 1440 and 8 at 1024.
  The lamp lifts the upper strakes to about (118, 132, 131). Iris's dark gain of 1.6 is what fixes
  it; check B5.18's 4.5:1 there.
- **The paint-order trap below.** It hid my clones at frame 1: the layer painted under the drawing.

## 5. What won't hold as written

1. **The numbering.** B5b ended at **B5.17** ("Nothing else moves", `.crew/sprint/32/contract.md`;
   `e2e/log-dates.spec.ts` line 36), not B5.16. The contract's B5.17 to B5.25 collide; B5c starts at
   B5.18.
2. **Paint order.** `.log-ghost` has `order: 2`, and flex and grid items paint in order-modified
   document order. So `[data-model]` (order 0) paints *under* the ghost at every width, though it
   follows it in the DOM.
   - It showed as 3D numbers missing over the hull at frame 1, and it would spoil the reduced-motion
     crossfade.
   - Fix: `.log-ghost + [data-model] { order: 2 }`.
   - The same trap holds for the control's slot below 768 (Iris's `order: 4`).
3. **The layer's box on `/log` below 1024 is all of `main`**, −2,947 to +844 px at 390, because
   `main` is a flex column there and `grid-area` is ignored. So `visible()`, `near()` and the
   observer always say "on screen":
   - the move would play to a visitor scrolled to the table;
   - an off-screen scheme switch drew 1 frame at 390;
   - judged on the drawing's box instead, it drew 0, and 1 once back.
   The contract's "an off-screen layer opens settled" should say the ghost's drawing.
4. **B3.6's off-screen window can't happen at 1440 × 900 on `/log`.** The page is 2,036 px tall, so
   at its bottom the drawing ends 779 px above the viewport. That's within a viewport, so the near
   rule rightly draws on a scheme switch. B5.22 needs 1440 × 600, or 1024 and 390, for that window.
5. **B3.6's rest window moves the pointer over the drawing,** from (width/4, 150) to (width/2, 200).
   On `/log` at 1440 that ends on a plank.
   - With Iris's hover, that is one frame per plank entered. On CI's SwiftShader that is a 100 to
     300 ms task each.
   - B5.22 should keep the pointer off the hull. B5.23 should count exactly one frame per hovered
     plank change and none within a plank.
6. **The default path turns two Log checks red,** run against the spike (the full list is in the
   report): B5.10's "load the 404's script files and bytes" and B5.4's "every plank filled with
   `--vellum`" (the ghost goes hollow under the model). The contract's plan, the Log specs on the
   WebGL-refused path with B5.10 rewritten against `/`'s files, covers both.
7. **The hold and the duration are global** (`HOLD`, `DURATION` in `lib/model/calls.ts`). Iris's
   width hold and 1.8 s need them per settle. That's a few lines in the chunk, and `/` is unchanged.
8. **At 1440 the move ends `still` on SwiftShader** after 6 frames, as `/`'s does. Probe's
   moving-frame checks at desktop widths must hold states on Playwright's clock, as B3's do.

## 6. On `pixel/33`

The spike is the start of the build: the seam, the hull variant, the stage flag, the settle per
layout, the numbers' projection, the raycast pick against the proxy, visibility on the drawing, and
the order fix. It is committed on `pixel/33` (the commit is named in my report).

Iris's look isn't in it yet: both sides, translucency and its colour solve, the two passes, moving
the drawing's own spans rather than clones, the canvas taking events at rest, the marks, the
stagger, 5.0's leader and box, and the hold, duration and dark gain. The CSS rules in
`app/globals.css` are marked as the spike's, for Forge and me to settle at the build.

## What I couldn't verify

- Feel and frame rate: no GPU and no phone here.
- B3.1's registration bound itself. I compared frame 1 with the Off page by pixels instead:
  - fills and numbers matched exactly;
  - lines moved by antialiasing only, at 0.95% of the box's pixels by more than 16 levels at 1440 @1
    (worst 94);
  - at 390 @2 it was 2.49%, the outline at the 1.5× cap scaled to DPR 2.
- The chrome-devtools MCP refused to start Chrome as root in this container, so the trace is
  Playwright's CDP tracing (`devtools.timeline`), read per drawn frame.
