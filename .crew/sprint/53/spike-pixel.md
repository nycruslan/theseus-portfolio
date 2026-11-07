# Yc's spike: two hulls in one canvas (Pixel, sprint 53)

**Outcome:** two hulls fit B3's budgets in one canvas, with three changes and about 1.6 KB:

- **8 draws, not 9 or 10.** The two hulls' seams share one fat-line batch, and their outlines
  share another. A segment's hull picks its matrix, weight and colour.
- **Both hulls drop to lower levels on the Log:** 72 × 6 from 768 px and 40 × 3 below. Measured
  triangles: at most 26,359 against 30,000, and 10,273 against 12,000. At today's levels, two hulls
  are 50,267 to 51,167 and 15,627 to 16,071.
- **A press costs no draw.** A per-plank transform in the card's vertex shader flies the plank,
  and its edges ride the merged seams batch as a third hull.

The second hull, the merged batches and the flight together add 1,565 B gzip -9 to the 3D chunk:
156.5 KB of 250 KB. Frame times under SwiftShader follow the canvas's area, which two hulls more
than double, not its triangles. Only a GPU can say what a desktop flight costs.

Every number is **measured** on production builds (`next build`, then `next start`) of a scratch
copy of main at 3f9ce67, never committed, unless it is marked *node* (computed from
`lib/model/hull.ts` in node, which matches the harness exactly for the card at both shipped levels)
or *estimated*. Draws and triangles are counted by the e2e harness's context wrapper
(`e2e/webgl.ts`), line quads included. The browser is Playwright 1.64's headless Chromium, which
draws WebGL with SwiftShader on the CPU. The machine is 4 vCPU, at a load average of 7 to 19 from
other agents' builds during the frame-time runs. So frame times are a ranking, not a device's
numbers.

On the scratch copy, /log/13's ghost is whole (22 seats, as before Ya), which is the worst case for
triangles. Ya's /log/13 draws 13.

## 1. Draws

| Page and size, settled | The ghost alone (today) | Two hulls, each with its own batches | Two hulls, lines merged |
|---|---|---|---|
| /log, 1440 × 900 | 5 | 9 | 7 |
| /log, 1440, a plank hovered | — | 10 | 8 |
| /log/13, 1440 (the record's ink mark) | 6 | 10 | 8 |
| /log, 1440, a plank in flight | — | — | 7 |
| /log, 390 × 844 | 4 | 8 | 6 |
| /log, 390, a plank hovered | — | 9 | 7 |
| /log/13, 390 | 5 | 9 | 7 |
| /log, 390, a plank in flight | — | — | 6 |

These are the most draws in any frame drawn: DPR 2 at 1440, DPR 3 at 390, light, Calm.

- **Unmerged**, the ghost draws its far side, its near side, its seams, its outline, the leaders
  (from 768) and the ink mark (a record or a hover). The Theseus draws its card, seams, outline and
  shadow. That makes 9 at rest on /log from 768, and 10 on a record or under the pointer. Iris's
  "5 + 3" left out the Theseus's shadow, and the ghost's mark, which is a sixth draw on a record
  or under the pointer.
- **Merged.** Both seams go in one `LineSegments2` and both outlines in another. Each segment
  carries an `instanceHull` attribute (0 ghost, 1 Theseus, 2 a plank in flight). The vertex shader
  replaces LineMaterial's `uniform float linewidth` with a global set from `uWidths[hull]`, and
  multiplies `instanceStart`/`instanceEnd` by `uHulls[hull]` (the hull's world matrix, copied after
  `updateMatrixWorld`). The fragment shader takes `uColors[hull]` for `diffuse`. The batch sits at
  the scene root.
  - The weights and colours stay each hull's own: the ghost's seams at 0.75 px in `--pencil`
    (`--muted` in dark), its outline at 1.4 px in `--muted`, the Theseus's at 0.9 and 1.6 px in ink.
  - The render is the unmerged one's: 11 of 1,037,532 painted pixels differ by more than 8 levels
    at 1440, and 8 of 447,953 at 390 (depth ties).
- **Spare room (estimated, not built):** the same trick takes the ghost's leaders and marks into one
  batch, which makes the worst case 7. It's about 150 B, since `perHull` already exists. The leaders
  would then carry caps, 32 more triangles.

## 2. Triangles: each hull's level

The levels that fit, measured with two hulls in the canvas, lines merged:

| | From 768 (≤ 30,000) | Below 768 (≤ 12,000) |
|---|---|---|
| Level | 72 stations × 6 rows | 40 × 3 |
| The ghost, 22 seats (*node*) | 12,772 | 4,912 |
| The Theseus with its shadow (*node*) | 12,967 | 5,031 |
| /log at rest / hovered | 25,771 / 26,083 | 9,943 / 10,123 |
| A record at rest / hovered | 26,047 / 26,359 | 10,093 / 10,273 |
| A plank in flight, /log | 25,875 | 10,003 |
| Worst case (*node*: a record's mark and a hover, both the largest plank's, and the leader) | 26,619 | 10,499 |

The ladder (*node*; worst case as above; the outline's error against a 1,200-station hull in its
side view, in CSS px on the drawing):

| Level | Ghost | Theseus | Both, worst | Outline error, 1440 (900 px) | 390 (358 px) |
|---|---|---|---|---|---|
| 120 × 8 (today, from 768) | 24,968 | 25,267 | 51,571 | 0.08 | 0.03 |
| 96 × 6 | 16,328 | 16,571 | 33,995 | 0.13 | 0.05 |
| 80 × 6 | 14,032 | 14,243 | 29,227 | 0.15 | 0.06 |
| **72 × 6** | 12,772 | 12,967 | **26,619** | 0.21 | 0.08 |
| 56 × 4 (today, below 768) | 7,736 | 7,891 | 16,339 | 0.25 | 0.10 |
| 48 × 3 | 5,616 | 5,751 | 11,995 | 0.36 | 0.14 |
| **40 × 3** | 4,912 | 5,031 | **10,499** | 0.38 | 0.15 |

- **Why 72 × 6 and 40 × 3, not 80 × 6 and 48 × 3:** those are 773 and 5 triangles under their caps
  at worst, with no room for a flight's edges (up to 468 and 306).
- **Rows:** the girth's chord error, the faceting a turned hull can show, is 0.17 CSS px at 1440 for
  6 rows and 0.26 at 390 for 3 rows (*node*). Two rows at 390 would be 0.56.
- **What it costs the look:**
  - Frame 1 on the 2D ghost (B5.18's method: the outline alone, filled, against the canvas alone):
    a Hausdorff of 1.000 CSS px at DPR 2, at today's level and at the lower one alike, at 1440 and
    390.
  - The settled canvas against today's level's: 0.91% of painted pixels differ by more than 8
    levels on `/` at 1440 and 0.77% on /log. At 390 it's 2.22% and 2.53%. The mean is 0.25 to 0.78
    levels, and the most is 104 to 112, where a seam moves by one pixel.
  - I couldn't tell the two apart by eye at either width. Iris should judge it before the contract.
  - `/` keeps 120 × 8 and 56 × 4. Only the Log's two hulls take the new levels.
- **Build time** (*node*, 1x, loaded): 72 × 6 is 8.8 ms for the ghost and 7.9 ms for the Theseus.
  Today's one 120 × 8 ghost is 27.1 ms. 40 × 3 is 3.3 and 2.7 ms. The chunk's build gets faster,
  plus one more shadow bake for the Theseus (not timed).

## 3. Frame times (SwiftShader: a ranking only)

The settled frame was redrawn every animation frame for 3 s: the median rAF interval in each of
three passes, and the median JS a frame. Light, Calm, /log.

| | 390 × 844, DPR 3 | 1440 × 900, DPR 2 |
|---|---|---|
| The ghost alone at today's levels (buffer 537 × 107 / 1800 × 359) | 50, 50, 50 ms; JS 0.5 to 0.6 | 233, 167, 167 ms; JS 1.1 to 1.5 |
| Two hulls, merged, 72 × 6 / 40 × 3 (buffer 537 × 262 / 1800 × 782) | 83, 67, 67 ms; JS 0.8 to 0.9 | 383, 217, 367 ms; JS 1.5 to 1.9 |
| The same with a plank in flight | 67, 50, 67 ms; JS 0.7 to 0.8 | 400, 200, 367 ms; JS 1.4 to 1.9 |
| Two hulls, unmerged, at today's levels (15,627 / 50,267 triangles) | 83, 67, 67 ms; JS 0.7 to 0.8 | 317, 300, 383 ms; JS 1.5 to 2.4 |

- The cost is raster and read-back, and it follows the buffer's area: the canvas that holds both
  drawings is 2.2× the ghost's. Halving the triangles made no difference here that the noise
  doesn't swamp.
- The flight's JS is under 0.2 ms a frame: two `decompose`s, a `compose`, an inverse and a
  multiply, and the uniform arrays reset.
- In the cloud a desktop-sized press steps the ratio down and ends `still`, as the loft does. Yc's
  checks must hold its frames on Playwright's clock, as B3 and B5 do.

## 4. Bytes (the 3D chunk, gzip -9 as B5.23 counts it)

| Build | Raw | gzip -9 | brotli 11 | Δ gzip |
|---|---|---|---|---|
| main, 3f9ce67 (and Ya, 03e5371: the same file) | 603,920 | 154,935 | 127,299 | |
| + the spike's hooks only (a level override, the redraw loop) | 604,420 | 155,192 | 127,729 | +257 |
| + the Theseus in the ghost's scene: its card, seams, outline and shadow | 605,452 | 155,523 | 127,920 | +331 |
| + the merged batches (`perHull`, `hullLines`) | 607,762 | 156,115 | 128,551 | +592 |
| + **the per-plank transform** and the flight | 609,605 | 156,757 | 128,949 | **+642** |

That is +1,565 B gzip in all (+1,220 brotli), without the hooks. The 4 to 7 KB that `plan.md`
estimates for Yc also covers the controller (the step's words, the URL, the keys, the live region),
which this spike didn't build.

## 5. The press: the per-plank transform

- Every (plank, side) of a card mesh gets a turn (a quaternion) and a shift (xyz, with its scale in
  w), as `uniform vec4 uTurn[46]` and `uShift[46]`. The card's vertex shader turns `objectNormal`
  after `beginnormal_vertex`, and `transformed` after `begin_vertex`:
  `transformed = turned(q, transformed) * shift.w + shift.xyz`.
- The far side's planks take `slot + 32` in `hull.ts`, so one side can move alone. The state
  lookup reads `mod(slot, 32)`, and the pick takes `% 32`.
- The card's vertex shader then holds 115 vec4 of ours, plus three's own (about 20, *estimated*).
  WebGL 2 guarantees 256.
- **The flight** (Full): the plank that flies is the ghost's own near-side slot.
  - In the ghost's frame its transform is L(t) = G⁻¹ W(t). W eases from the Theseus's world
    matrix to the ghost's: the position on an arc, the turn slerped, the scale lerped.
  - Its edges (`plankEdges` for that seat) ride the merged seams batch as hull 2, with
    `uHulls[2] = W(t)`.
  - The Theseus's new plank presses in along its side through the same shift uniform.
  - Measured: 7 draws on /log at 1440 and 6 at 390 while flying. Its edges add 104 triangles at
    1440 and 60 at 390.
- **It is a spike, not Yc's choreography:**
  - The flying plank is the ghost's material, vellum at α 0.7. Flown as the Theseus's opaque grey
    card, it needs a per-slot alpha the state's alpha (the hatch flag) doesn't give today.
  - Its seat's seams appear only once the ghost's seams are rebuilt.
  - The shift's scale is uniform only.

## 6. What Yc's contract should settle, and my recommendation

1. **Draws: 8.** Merge the two hulls' seams and outlines. Recommended: merge the ghost's marks and
   leaders too, for 7 at worst, so a later need (the pencil on /log, the fleet's second ghost)
   isn't over the cap on its first batch.
2. **Levels: 72 × 6 from 768 and 40 × 3 below, for both hulls, on the Log only,** if Iris passes
   the settled look.
   - Run B5.18 and B5.19 at the new level before the contract.
   - B5.19's stern planks (5.0, 3.0, 1.0) already sit within 0.006 of the 0.85 light floor, with
     5.0 now just under it (section 7), and a level change moves their pixels.
3. **One rig lights both hulls.** The ghost's light gain (× 1.35 light, × 1.6 dark) applies to
   the Theseus too, so its lit card would read brighter than `/`'s. It needs a gain per material
   (a uniform in the card's fragment shader, a few bytes) or Iris's acceptance.
4. **One canvas over both drawings.** Its box is the two drawings, the gap between them, and the
   Theseus's shadow, which falls toward the ghost's caption in Iris's frames.
   - The Theseus's caption then sits under or over WebGL. It paints above the canvas as the numbers
     do, and the shadow must stay clear of text (axe contrast, STATE.md's text-over-WebGL lessons).
   - Frame 1 registers each hull on its drawing if its offset is its drawing's offset in the
     canvas. Frame 1 is orthographic (1/D = 0).
   - The settled perspective is about the canvas's centre, so each hull's settled pose has to be
     solved for the shared canvas. The spike shifted the ghost and set the Theseus at its pose,
     which is enough for costs but not for registration.
5. **Gaps on steps 1 to 22 while pressing.** A landing needs its seat's geometry.
   - Build all 22 ghost seats and hide the gaps by state: a discard at alpha 0, plus a per-slot
     flag on the seams. The triangles are then the full ghost's at every step, which is the worst
     case anyway, and nothing is built mid-press.
   - A rebuild on landing costs 8.8 ms at 1x (*node*), about 35 ms at 4x CPU: a dropped frame.
6. **What leaves at steps 24 to 51, and which side flies:** Iris's and mine, as `plan.md` says.
   The transform allows either side or both.
7. **The step's words.** Not measured beyond this: /log/14's prerendered HTML is 128,448 B,
   17,378 B gzip -9 a step if fetched. The table already on the page holds each step's line, but
   not the record's body.

## 7. A watch from Ya: B5.19's stern planks at the band's floor

On 03e5371, B5.19 on /log at 1440 light is red in 3 runs of 3: "5.0 … L 0.850 outside 0.85 to
0.935". On main it passes in 2 of 2, at L 0.853.

- **It's not a shading change, and it's not flake.** The settled pose depends on the drawing's
  width and the viewport's height only (`poses` in `lib/model/loft.ts`). Ya moved the ghost from y
  177.72 to 338.06, so the same pose drew the same canvas: 0 of 161,100 pixels differ between
  main's and the branch's settled canvas, compared one row apart.
- **What moved is the one pixel B5.19 reads.** Chromium composites the canvas on whole pixels (178
  and 338). The scan's 6 px grid is laid on the layout box, so 5.0's only clean cell, at the same
  canvas point, reads canvas row 140 on main (L 0.8528) and row 141 on the branch (L 0.8497).
  Seat 5.0 is two clean rows tall there.
- **The plank straddles the floor on main too.** Of the 45 to 47 fill-level pixels 5.0's pick owns,
  16 are under 0.85, from 0.8477 to 0.8539 (median 0.8505 on main, 0.8500 on the branch).
  - 3.0 reads 0.851 to 0.854 and 1.0 0.856. The brightest plank is 0.914, against 0.935.
  - A sampling fix alone (a median over the sliver's pixels) would land at 0.850 to 0.851, still at
    the floor.
- **The option in the look:** `GHOST_LIT` from 0.4 to 0.36 (`lib/model/calls.ts`) draws the lit
  mix toward the unlit `--vellum`, the lever sprint 33 used for the keel's planks. On 03e5371,
  5.0's pixels then read 0.8528 to 0.859, none under 0.85.
- **Iris's call:** keep `GHOST_LIT` at 0.4, since 0.36 would flatten all 22 planks to win one
  cell. Instead, B5.19's light floor for 5.0 alone becomes 0.84, as a named rewrite by Probe. The
  sliver's darkest pixel, 0.8477, clears it by 0.008. The chunk doesn't change.
