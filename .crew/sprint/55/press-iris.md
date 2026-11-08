# Sprint 55: the press, my calls (Iris)

These calls are for Pixel's flight. I read production's `/log/13`, `/log/40` and `/` at 1440 × 900
and 390 × 844, in light and dark, against the contract, my direction (`.crew/sprint/52/direction-iris.md`,
storyboard frame 2) and Pixel's spike. Px are CSS px at the settled scale. A value given at 1440
and 390 scales with the drawing's width in between.

## 0. The stage the calls assume

- **Twins.** Both hulls settle to the ghost's turn (`SETTLE_GHOST`: yaw −20°, pitch 12°, lift 90)
  in one 1800 ms move on the loft's `ease`. Each holds its own drawing's framed length, centred
  on its own box, with the same apparent turn from its own line of sight. Seat then stands over
  seat, 234 px apart at 1440 and 115 px at 390, and the carry drops without turning. My sprint 52
  frame staggered the Theseus at `/`'s −30°/15°, but Ya stacked the two drawings at one x, and
  twins read as two ships trading planks.
- **No shadow for the Theseus on the Log.** In Ya's stack its lobe would cross "The Theseus after
  sprint n" and reach into the ghost's box. That would darken the vellum and move B5.19's band
  and the numbers' contrast. Material already tells the two hulls apart: lit opaque card with an
  ink outline, against vellum. It also saves a draw (6 at rest from 768, 7 on a record, 6 flying)
  and the bake. `/` keeps its shadow.

## 1. Steps 24 to 51: keep the default, refined

- The Theseus's leaving card plank **lifts exactly as an original does**: the same 140 ms, the same
  distance. It holds that lifted place and **fades out there** (α 1 → 0, 200 ms, linear), with no
  drift toward the ghost or anywhere else. Its number rides it and fades with it. The new card
  plank then knocks in.
- **The ghost's planks don't move.** Both ships' ink marks land on the seat at the knock. The
  ghost's mark names the original that seat once held, as production's `/log/40` already marks
  the ghost's 18.
- **Why not fly it.** The ghost is the originals, and it's already whole. A crew plank landing
  there would contradict its numbers (each seat's first holder). Nothing on the page can receive
  it until the fleet (Y3). The lift is shared, so Y3's second ghost adds only the carry.
- **Sides.** The near side (the camera's) flies on every step. The far side never flies, since it
  would pass through its own hull. It changes in place instead:
  - on the Theseus, at the knock frame, hidden behind the new near plank;
  - on the ghost (steps 1 to 23), fading in over the carry's last 240 ms (linear) and ending at
    touchdown, so the near plank brings its twin.

## 2. Light: its own gain; don't accept the ghost's

The rig stays at `/`'s values: × 1 in light, `DARK_GAIN` 4 under the warm lamp in dark. The ghost's
card takes a gain uniform on its lit term: `GHOST_GAIN` (1.35) in light and `GHOST_DARK_GAIN /
DARK_GAIN` (0.4) in dark.

Accepting the shared gain would push the light card toward paper, flattening its strakes. In dark
it would light the Theseus at 1.6, not 4, and the card would read darker than its own token, the
failure `DARK_GAIN` exists to prevent. The Theseus must look like itself on every page.

**Check:** at one level, the ghost with the uniform equals the ghost lit by today's rig gain, with
no pixel more than 1 level apart. Sprint 33's contrast calls and B5.19 then carry over unchanged.

## 3. Levels (72 × 6 from 768, 40 × 3 below): pass, on Pixel's measurements

The outline error is 0.21 px and 0.08 px at 72 × 6, and 0.38 px and 0.15 px at 40 × 3. Frame 1's
Hausdorff is 1.000 px at both levels. The normals are analytic, so only the silhouette can facet.
I couldn't render the lower levels this pass. On the preview I'll check:

- the stem and the stern's tuck on both hulls at DPR 1 and 2;
- the lowest strakes and seat 5.0 at 390, DPR 3: seams stay smooth curves with no zigzag;
- B5.19's band (5.0 at its 0.84 floor);
- numbers riding within 1 px of today's.

If the stem shows a corner at 1440, the fallback is 80 × 6: 29,227 triangles at worst, plus a
flight's 468, is 29,695. Below 768 there's no room, so 40 × 3 has to hold.

## 4. The press in Full, beat by beat

| Beat | Steps 1 to 23 | Steps 24 to 51 | Curve |
|---|---|---|---|
| Lift | 0–140 ms: the original rises L along its seat's outward normal. L is 14 px at 1440 and 6 px at 390. | The same, for the card plank | the site's `ease` (out) |
| Carry | 140–620 ms (140–540 below 768): to the ghost's seat on one path, arriving along that seat's normal | — | cubic in-out |
| Fade | — | 140–340 ms, in place | linear |
| Knock | 620–760 ms (540–680 below 768) | 340–480 ms | see the knock below |

- **Arc.** It rises at most 16 px above the lift point at 1440 (6 px at 390), and never above the
  Theseus's drawing box, so top strakes go straight out and down. It bows toward the camera and
  passes in front of both hulls the whole way. At mid-carry it grows to at most 1.06× its seated
  length. It rolls about its long axis, peaking at 6° mid-carry (a sin envelope), outer
  face up to the light. No yaw and no spin.
- **Material.** The plank leaves as the Theseus's own original: opaque grey card under its own
  light. It lands as the ghost's vellum: α 0.7, the solved colour, `GHOST_LIT`, the ghost's gain.
  - Colour, α, lit mix, gain and its edges (ink at 0.9 px → pencil at 0.75 px, muted in dark)
    morph together over carry progress 0.4 → 0.9 (smoothstep).
  - Touchdown is then a handover with 0 pixels changing. The spike flew vellum from lift-off;
    don't, because the grey is how a visitor knows it's an original.
  - Only one plank moves at a time, so one set of flight uniforms is enough: seat, transform,
    morph and far α.
- **The knock.** The new card plank appears L proud of its gap. It fades α 0 → 1 over its first
  60 ms, then drives in on a cubic ease-in and stops dead. On the knock frame, one frame:
  - its number lands on both ships (steps 1 to 23) or on the Theseus;
  - both ink marks land;
  - `go` resolves;
  - the frame equals a cold load of the step, settled. After it, 0 frames.
- **No bounce, overshoot, spring or recoil anywhere.** In the yard's grammar a bounce is a fix
  round (Y2).
- **Previous and ← play the same press backwards**, so every frame of a step back is a frame of
  the step forward. Reversed, the lift lands with a knock of its own.

## 5. Calm and reduced motion: the 240 ms linear fade, nothing leaves its box

- The Theseus's seat cross-fades in place: grey → card on steps 1 to 23, card → card on 24 to 51.
  A leaving number fades out with it.
- On steps 1 to 23, the ghost's near and far planks and seams fade in, α 0 → 0.7.
- The new numbers and both marks appear on the last frame, with the swap. Previous is the same
  fade, reversed.

## 6. What must not go wrong

- **Numbers never hang over an empty seat or arrive before their plank.**
  - The record's marks leave both ships at press start, with the words.
  - Hover is off during a press.
  - The new numbers and marks arrive only on the knock frame.
- **A gap reads as a hole in a card model.** Through it shows the far side's inside face, lit as
  card. Never black, never the sheet, never the ghost behind.
- **The flight stays in front and in frame.** No hull's depth clips the plank, no neighbour cuts
  it, and the canvas edge never cuts it.
- **`land()` draws the knock frame once.** No fast-forward, and no plank left mid-air or
  half-faded.
- **Copper never moves.** The replay is ink and graphite (sprint 37's rule). The pencil plank and
  its copper belong to today only: a press away from today takes them off at press start, and a
  press arriving at today restores them at the knock.
- **For Forge, Atlas to rule:**
  - The motion starts within a frame of the press, never waiting on the step's HTML.
  - Focus stays on the step link that was pressed after the swap.
  - On 22 → 23, Hobbes's question should arrive with the knock, not at press start. It's the
    payoff, and it must land with the last original. Y16 checks only the end state, so this
    changes no check.

## 7. Early look at Pixel's build (`origin/pixel/55` at e209b03, his frames on Playwright's clock)

These are from Pixel's frames: 1440, /log/13 → 14 at seat 2.1, /log/40 → 41, Previous, Calm and 390.

**Holding:**
- The twins and the reversal.
- Calm's in-place fade.
- The grey-to-vellum handover at touchdown.
- The knock frame's marks on both ships.

**Five changes:**

1. **The gap reads white, not as a hole.** On the frame where the lift ends, the inside measures
   Y 0.66, as bright as a lit card plank. Its neighbours measure Y 0.44 to 0.59. The hull is
   closed, so its inside is in shadow.
   - Draw the Theseus card's inside faces without the sun and fill: about Y 0.25 to 0.30 in light
     (around rgb 140, 148, 145), and in dark a step below the darkest plank, above the ground.
   - Inside faces never show at rest, so `/` and the settled Log don't change.
2. **An arc, not a drop.** On low seats the lift points down, so lift and carry fall on one line.
   - Don't add a minimum rise. Bow the carry toward the bow (screen right, the way Next's →
     points) by 0.03 × the drawing's width at mid-carry: 27 px at 1440, 11 px at 390. Use a sin
     envelope, clamped inside the canvas.
   - Previous, being the reversal, comes back the same way.
3. **Growth.** At mid-carry the plank measures 268 px against its 245 px gap, 1.09×. Ease the bow
   toward the camera to at most 1.06×.
4. **On steps 24 to 51 the ghost's number for the seat vanished.** In the /log/40 → 41 frames, 19
   is gone from the ghost from the lift onward. The ghost changes nothing on 24 to 51. Only the
   Theseus's leaving number rides and fades.
5. **Numbers under the flying plank.** Hide any of the drawing's numbers and leaders while its
   anchor is inside the plank's projected outline: a hard cut, as occlusion is. The caption and
   page text stay on top.

**To verify on a production build:** the 41 → knock frame showed no new number. The caption was
still 40, so the swap hadn't landed on the slow dev server. With prefetch, the number has to
arrive on the knock frame.

**Second look (16b9121, frames h-* and g-*):**

All five changes hold.
- **The gap.** Its inside measures Y 0.288 (rgb 140, 148, 145) against neighbours at 0.43 to
  0.53. The far side's seams show through it, which reads as a real hole.
- **The arc.** It sways 19 px right of the seat at mid-carry: 27 px of sway less the shear.
- **Growth** measures 1.05×.
- **Numbers under the plank** are hidden while it passes.
- **The twins** now hold one length, seat over seat at the same x.

One left, and it's mine to keep: **the ghost's 6 jumps 48 px at the knock** (h-560 → h-after), on
a seat the press didn't touch. The 2D sets it at 48.52% on both /log/13 and /log/14, so it's the
3D placement reacting to the newly filled seat.
- A step is a flip-book frame: only the pressed seat's numbers may change.
- Make each number's place depend only on its own plank and the pose, so cold loads of
  neighbouring steps agree too.
