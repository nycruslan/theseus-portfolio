# Sprint 26 notes (Iris): the phone's settled pose

Decided on 2026-10-23 within the hour, before Pixel's build: the brief's part 1. The method: the
repo's own loft maths (`lib/model/loft.ts`'s solve, ported to `NARROW`) and `lib/model/hull.ts` at
the phone level (56 × 4) run in Node for candidate growths and offsets, each candidate's silhouette
and cast shadow (the `LIGHT` of `lib/model/shadow.ts`) laid as an SVG over production's narrow sheet
at 390 × 844 and 320 × 568, DPR 2, both schemes, with the hollow rule applied, in Playwright's
Chromium. The numbers are the solve's, exact; the pictures are flat-shaded sketches for size and
placement, not renders: the shading, the seams and the dark hull are judged on the build. Evidence:
`.crew/screenshots/sprint-26/pose-candidates-390.png` (eight candidates at 390, light),
`pose-dy-variants-390.png` (the chosen growth at dy 22, 26 and 30, both schemes), `pose-c26-320.png`
(the call at 320); the scripts are in my scratchpad (`pose.mjs`, `overlay.mjs`).

## The call, as constants

```
G_NARROW      = 0.25
SETTLE_NARROW = { dx: 0, dy: 26, yaw: -36, pitch: 16 }   // dx, dy in NARROW's drawing units
```

`LIFT` (90) and `STANDOFF` scale with the drawing as they do today; the lens is 30° over the
viewport's height (D = 1,575 px at 844). Pose tolerance for Probe: the constants are exact; a pose
read back from a frame is within ±2° of yaw −36° and pitch 16°.

## 1. `G_NARROW = 0.25`: the settled hull is its drawing's own length

Solved at 390 (the framed height is the skeleton's, as `HOLD` measures it; a screenshot's alpha
measure adds about 1.6 px of outline, as S5's did):

| | Frame 1 at 390 | Settled at 390 | Frame 1 at 320 | Settled at 320 |
|---|---|---|---|---|
| Framed height | 59.0 px | **73.7 px** (× 1.25) | 48.4 px | **60.5 px** |
| Length on screen | 312 px | **310 px** | 256 px | 253 px |
| Hull's box (canvas px) | | x 20.3 to 330.2, rows 70.3 to 144.1 | | x 16.6 to 271, rows 57.5 to 118 |

Why 0.25 and not the desktop's 0.1: the turn to −36° foreshortens the hull to 0.80 of its length
(S5: 250 px from 313 at G = 0), so at 0.1 the settled hull is 269 px long under a 312 px drawing and
the hollow profile's bow sticks 30 px past the model's: two hulls of different lengths, and the
model reads as having moved away (candidate A in `pose-candidates-390.png`, the contract's default).
On the desktop the drawing is 811 px long and the 10% model's shortfall hides in the sheet; at 390
the whole sheet is the model, and the shortfall is the picture. At 0.25 the settled hull is 310 px:
the stern on station 0 (x 20, the "Profile" caption's own left edge) and the bow on the drawing's
stem (x 332). The growth pays back exactly what the turn took, so the model settles as long as the
drawing it left, which is the story (the drawing lofts into the hull, not into a smaller one).

Against the owner's frames: `rest-390.webp`'s hull measures about 297 × 81 CSS px (76% of the
width); this is 310 × 74 (79%). The same presence, within 5% in length and 9% in height; the
difference in proportion is the phone pose's (−36°/16° shows less deck than the canvas's render).

What the box allows (dx 0, dy 26, at 390): 0.30 puts the stern at x 14.8, inside station 0, and the
bow at 336.5, past the stem, with the shadow's tail 11 px from the sheet's right edge and the DWL
label under it; 0.35 puts the stern 8.8 px from the left edge and the shadow 4.5 px from the right;
at about 0.38 the shadow's blur reaches the right edge, at about 0.42 the stern reaches the left.
So the box's physical limit is about 0.35 and the composition's is 0.25:
above it the model outruns its own drawing at both ends and starts crowding the DWL and Base labels
(candidates D and E).

## 2. The settled offset: dx 0, dy 26

- **dx 0.** The registered hull is already left of the sheet's centre (x 20 to 332, since the DWL
  and Base labels take the right margin at 349 to 380), and the turn keeps the settled hull's centre
  there (x 175). Any leftward dx (the desktop's −30 scales to −8) pushes the stern off station 0 for
  nothing; at dx 0 the stern sits on it. The shadow's hard edge reaches x 362.6, its blur to about
  373 at the most, 17 px short of the sheet's edge; its tail passes under the first 13 px of the
  "Base" label (x 349) and perhaps "DWL" above it, at 0.18. If that reads as a smudge on the
  lettering in the build, dx −4 takes it off (the stern then 4 px left of station 0); decide on
  the running build, not here.
- **dy 26.** The settled hull's top is 15 px below the profile's sheer at the bow (26% of the
  drawing's 59 px; the desktop's 32 px is 21% of 153), so the hollow profile's top plank shows
  above the whole deck and the model reads as lifted off it. The keel (row 144, drawing y 129) is
  25 px below the base line and 26 px above the half-breadth plan's crown (y 155); the shadow's lobe
  fills that gap and lands on the crown, its hard edge at y 180 (row 195), 10 px short of the
  centreline. Station numbers 0, 1, 2, 9 and 10 stay readable beside the hull, 3 to 8 go under it,
  as 4 to 7 do at 1440. At dy 22 the deck overlaps the drawing's top plank and half-hides the
  hollow profile (the lift reads weaker); at dy 30 the sheet's top empties and the shadow crowds
  the half-breadth caption (`pose-dy-variants-390.png`).
- **Inside the canvas**, at the settled frame: the nearest coverage to an edge is the shadow's
  blurred tail on the right, about 17 px clear at 390 and at 320 (hard edge 295 of 320, pad 8),
  the hull's stern 20 px clear on the left (the shadow's pad 10 px), the shadow's far-side sliver
  about 57 px below the top (its hard edge at row 67), the shadow's bottom 55 px above the bottom
  (any coverage, pad included). Edge rows and columns are empty, as B3.2 wants.
- **At 320** the same constants scale by 320/390: hull 253 × 60.5 px at rows 57.5 to 118 of 213,
  the shadow to x 295 and row 159 (`pose-c26-320.png`). Nothing to tune per width.

## 3. Does it depart visibly from `rest-390.webp`? Yes, in the drawing, not in the hull

For Atlas to put to the owner with the preview:

> The phone's rest pose keeps the approved hull: the card model at three-quarters, most of the
> sheet's width (310 of 390 px, where the canvas's `rest-390.webp` shows about 297), its shadow on
> the sheet, over a hollow drawing. What changes is the drawing under it. `rest-390.webp` was drawn
> over the body plan, which the phone sheet hasn't carried since sprint 22 (you approved the
> profile-and-half-breadth sheet in #62, because a body plan has no planks and the planks are the
> record). So on a phone the model now lands on the profile it draws, lifts off it and settles over
> that profile with its shadow on the half-breadth plan below, in the sheet's 390 × 260 box, the
> same picture as the desktop's at 1440 scaled to the phone's sheet. The hull itself is the
> approved size and turn (−36° and 16°, the canvas's phone pose).

## What the early look should check (part 2)

- The shadow's far-side sliver above the stern's sheer (my sketch shows a hard-edged one at both
  schemes: the baked silhouette's blur should soften it; if it reads as a dark lip on the deck,
  that's the bake, not the offset).
- The dark hull at 74 px: the warm lamp's reading (sprint 25's `DARK_LIGHT`) on a hull a fifth of
  the desktop's size, and the black shadow at 0.6 over the half-breadth plan's thin lines.
- The DWL and Base labels under the shadow's tail (dx −4 if they smudge).
- The hand-off at 390, DPR 2: frame 1 at 59 px against the drawing's outline, then the first
  moving frames, which at this growth travel further than S5's (the skeleton's travel is about
  60 px at 390).

## What I couldn't verify

Feel and shading: every picture here is a flat sketch over production, not the model. The sizes,
positions and clearances are the solve's numbers, which Pixel's build must reproduce (the maths is
the same module); whether 0.25 feels right in motion on a real phone is the demo's question.
