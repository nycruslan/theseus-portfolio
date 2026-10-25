# Sprint 33, notes from Iris: the ghost hull's five calls (B5c)

The five "Iris's call" items in `contract.md`, as numbers Pixel and Forge can type and Probe can
check. Each is inside the approved direction (`.crew/sprint/17/direction-iris.md`, `log-1440.webp`,
`log-390.webp`); the departures from the frames are listed at the end, for the owner.

**What I judged on.** Production is still B5a: Vercel refused #82's deploy ("Deployment rate limited
— retry in 24 hours", the `Vercel` status on 4070914), so it has no Date column and no lines figure.
So I judged main's build at a0f3efe (`next start` on 4820) and `/` on production, at 320, 390, 768,
1024 and 1440 in both schemes. Then I built a prototype of the ghost in three.js 0.186.1 over main's
`/log`. It uses the real geometry from `lib/half-model.ts` and `lib/hull-layouts.ts` and the page's
own tokens and spans, and every number below was measured on its SwiftShader frames. The frames
and the prototype's code are in `.crew/screenshots/33-iris/` (`final-*`, `move*`, `record-*`,
`oneside-*`, `ctl-*`; `proto/ghost.js`). The prototype is a reference for the look. It isn't the
build: its stem has a dark notch that `lib/model/hull.ts`'s closed bands don't have.

**One correction to the contract's reading of the frame.** `log-1440.webp`'s planks don't "stand
slightly apart". Its gaps are the 7 originals that were still sailing when it was drawn (15 of 22 out
on 21 Oct). Today all 22 are out, so the hull is whole. A gap shows only on a fixture with fewer than
22 merged sprints, and then it is nothing, on both sides.

## 1. The vellum in 3D

**What it is.** The ghost is the 22 original seats on both sides of the hull, since a seat is port
and starboard. It has no deck and no transom face, because neither was a plank, and it casts no
shadow. So it is the original ship reassembled from what the crew took out, and it is hollow: from
the settled view you see into it.

**The material.** It is the card's lit standard material, made translucent:
- **α 0.7 settled, in both schemes.** At each frame the colour is solved from the tokens the page
  computes, per sRGB channel: `C = (V − (1 − α) · B) / α`, where V is `--vellum` and B is
  `--background`. So the unlit composite over the film is `--vellum` exactly at every α. That gives
  light ≈ `#cfdcdc` (the token's own recipe) and dark `#536369`. Never hard-code either.
- **Frame 1 is α 1 and uLit 0,** which is the 2D fill exactly, so the 3D's arrival changes no pixel.
  During the move α runs to 0.7 and uLit to 0.5 on the eased progress (`min(1, 1.25e) × 0.5`).
- **Two passes:** the far side (back faces), then the near side (front faces), with depthWrite off
  and the lines drawn first. Through the near planks you then see the far side's seams faintly, as
  vellum shows the lines under it. That's the material's own look and nothing else does it.
  Draws: far, near, seams, outline, marks, so 5 of the 8.
- **The light** is the card's rig unchanged in direction (sky, a frontal fill, the sun from the
  upper left), at half the card's lit mix (uLit 0.5). The rig runs × 1.35 in light. In dark it is the
  warm lamp at `DARK_GAIN` × 0.4 (1.6 in all).

Settled composites I measured at 1440, clear of lines and numbers:

| | Upper strakes | Bilge | Token | Bound |
|---|---|---|---|---|
| Light | `#dbeae8`, OKLab L 0.925 | `#c5d4d2`, L 0.858 | `--vellum` L 0.904 | never lighter than the film (L 0.952) |
| Dark | `#576568`, L 0.496 | `#485557`, L 0.439 | `--vellum` L 0.410 | never lighter than `--card` (L 0.495) |

The inside of the hull, seen above the near sheer, is a single layer facing the sky. In light it
reaches about L 0.94, which is still under the film.

**Lines.**

| Line | Weight | Light | Dark | Why |
|---|---|---|---|---|
| Seams and butts | 0.75 px | `--pencil` | `--muted` | pencil reads 2.2 to 2.7:1 on the lit vellum in light, but 1.2:1 at night; graphite reads 2.5 to 3.4 |
| Outline: both sheers, the stem and keel, the transom's edges | 1.4 px | `--muted` | `--muted` | as the 2D ghost draws it |
| Plank 5.0's leader | 0.75 px | `--muted` | `--muted` | |

**Against the sheet.** In light the ghost is always a shade darker than the film it stands on (1.07
to 1.33:1): film on film, never white, and the graphite outline carries the shape, as in 2D. In dark
the lamp lifts it off the night film (2.3:1 and more), but never past the seated card's lightness.

**Against `/`'s white card.** The card is opaque, lit lighter than the film, decked, and it throws a
shadow on its plan. The ghost is translucent, darker than the film, open, and it throws no shadow. It
is the same ship, turned the same way, under the same camera, so the visitor reads it in a second as
the same ship, made of what was taken out. The two never share a page.

**For B5.18.** "Within 8 levels of `--vellum`" fails the lit bilge (about 15 levels). Check the
bands instead, sampling each plank clear of its lines and number:
- light: OKLab L from 0.85 to 0.935, and under the film's;
- dark: from 0.42 to 0.50, and at most `--card`'s + 0.005;
- in both schemes, a and b within 0.01 of `--vellum`'s;
- frame 1 equals the 2D fill within B3.1's bound.

## 2. The numbers: on the planks, as HTML

**They are the 2D drawing's own spans, moved.** At rest each `[data-ghost] .plan-plank` span carries a
`transform: translate()` from its 2D anchor to its plank's point projected through the settled pose.
The point is the hull point that the 2D anchor names (the same x and y in hull units), on the near
side, 1 unit off the surface. So the 22 numbers are `GHOST[seat]` by construction, and the 2D and the
3D can't disagree. The harness reads their boxes directly, so nothing needs publishing. They paint
above the canvas (`[data-ghost]:has(+ [data-model]) .plan-plank { z-index: 1 }`, as `/` does) with
`pointer-events: none`, so a click on a number picks its plank. All transforms are cleared whenever
`data-state` goes (Off, a lost context, teardown).

**Face and size: unchanged from B5a.**
- Sofia Sans 600, tabular, `--foreground`.
- 13 px from 768 to 1023 and from 1280; 11 px from 1024 to 1279; hidden below 768 with the leader. A
  lift there is 8.5 px deep at 390, in 3D as in 2D.
- On a record, the record's number is 700. A hover doesn't change any number's weight.
- Contrast I measured on what each number sits on: light 11:1 and up, dark 4.8:1 at the worst.
  The worst is sprint 15's, on the upper strakes, read at the 80th percentile of its box, which
  takes in its graphite seams' edges. That's why dark stops at `--card`'s lightness.

**The stagger rule.** A number whose box would come within 2 px of one already set slides along its
own plank, to the nearest point (either way) where the band is at least 6 units deep and the box is 2
px clear. Set them in seat order, "0.0" to "6.1". With the settled view in section 3, it clears
three pairs at 1024 (22/23, 17/11 and 1/4 came within 1 px), and nothing at 768, 1280, 1440 or 1920.
None leaves its plank.

**Plank 5.0** keeps the 2D's leader. Its two points are lifted onto the near side's surface at the
stern and drawn in the outline's batch. The number sits at the leader's outer end.

## 3. The view, Full's one move, and Calm

**One settled view at every width: yaw −20°, pitch 12°,** the frame's own desktop pose, with the bow
toward the visitor as on `/`.
- **Why not stronger.** −24/16, −28/18 and −30/15 read more as objects, but at 1024 they crowd the
  stern's numbers: 22/23, 7/8 and 17/11 overlap by 1 to 3 px. With the stagger at −28/18, "23" and
  "8" end on the outline or past it.
- **Why not the frame's phone pose (−26/14).** It overflows the drawing's box by 1.5 px at 390 and
  2.5 at 640. −20/12 fits the 2D ghost's own box at every width (table below), so **the canvas lies on
  `[data-ghost]`'s box** in whole buffer pixels, exactly B3.1's fit, with no layout change and no
  reserved space.

**Full: what the move shows.** Frame 1 is the 2D ghost, exactly. Then the hull stands up off the
sheet: it turns 20° and tips 12° toward the visitor while the lens opens from orthographic to 30°.
The far side and the hull's inside appear through the vellum, and every number rides on its plank.
Then it stops.
- **Duration and ease:** 1.8 s, on the loft's own ease (`ease()` in `lib/model/calls.ts`, `EASE_K`
  7, the 5% ease-in). It is shorter than `/`'s 2.4 s on purpose: the loft is the site's one
  signature, and this is the archive's quieter echo of it. 90% of it is done by 0.85 s.
- **Holding the shape:** the hull's framed length is held at its drawing's length, within ±1%,
  through the whole move (`HOLD` width). There's no growth, and it stays centred on the drawing's
  box. The lift and the lens are `/`'s. Measured at 1440 for e = 0, 0.15, 0.4, 0.75 and 1: the length
  held at 888.6 px, and the height went from 168 to 178 px, inside the 179.4 px box at every frame.
- **The 2D drawing:** its `svg` is hidden from the first lofting frame. Nothing of the 2D is left
  under the ghost, unlike `/`'s sheet, because the ghost has no construction lines to keep.
- **The numbers** ride: each frame sets the 22 transforms (no layout), the target point interpolated
  along its plank with e where the stagger moved it.

**Calm** opens on the settled frame at once: the svg is hidden and the numbers set at once.

**Reduced motion** (Calm by default) fades the canvas in and the svg out over 240 ms, linear, as on
`/`. The numbers take their places at the fade's first frame: a cut, not a move.

| Width | Ghost box (px) | Settled hull (px) | Numbers |
|---|---|---|---|
| 320 | 288 × 57.4 | 284.4 × 56.7 | hidden |
| 390 | 358 × 71.4 | 353.5 × 70.5 | hidden |
| 768 | 736 × 146.7 | 726.7 × 145.2 | 13 px |
| 1024 | 568 × 113.2 | 560.8 × 111.9 | 11 px, staggered |
| 1440 | 900 × 179.4 | 888.6 × 178.1 | 13 px |

## 4. The pick

**With a mouse or pen, at rest.**
- **Hover:** the plank under the pointer gets its four edges in ink at 1.4 px, on the side the pointer
  is over: the near side, or the far side's inside above the near sheer. That's the record mark's
  look (`path[data-current]`). The cursor is `pointer`, and `data-pick` is the seat, as the contract
  has it.
- There's no fill change, no tooltip and no copper. One frame is drawn when the hovered plank changes,
  and none while the pointer moves within it.
- On a record, the record's own plank keeps its ink edges and its 700 number. A hover inks a second
  plank, the same way and only while the pointer is on it.
- A click navigates. Cmd/Ctrl-click and the middle button open the record in a new tab, as the
  table's links do. That code lives in the chunk, not the loader.
- Plank 5.0's number sits off the hull, at its leader's end, so the pick tests that number's box,
  and 4 px around its leader, before the raycast. Otherwise B5.23's aim at "20" would find no plank.

**Touch, at every width, numbers or not:**
- a tap opens the record: the finger lifts within 10 CSS px of where it landed and the browser
  started no scroll (no `pointercancel`);
- from `pointerdown` the plank shows its ink edges as press feedback, until the navigation or a
  cancel;
- a drag scrolls the page: the canvas takes pointer events only at rest, with
  `touch-action: manipulation`, which also drops the double-tap delay;
- a tap during the move settles it and opens nothing.

On a phone the numbers are hidden, so a tap is a discovery. The record it opens marks that plank in
the hull, which closes the loop.

**How a visitor learns the planks open records:** by the site's link grammar. On this site ink is a
link, and hover makes its line heavier. A plank behaves exactly so, with a hand cursor, and the record
it opens shows the same mark. The table's lede already says "choose one to open its record".

**What I didn't add.** The frame's lede words "or a plank in the hull" would be false on Off, with
WebGL refused and in print. A hint shown on load breaks the brief's "hints only when a visitor seems
stuck".

## 5. The control's place

**From 768: in the bar,** after Read as page, exactly as on `/`, in the same slot:
- 768 to 1023: 186 × 44;
- from 1024: 142 × 32, at the bar's right end;
- the bar is one line (#78 measured five links and the control at 768: links 234 to 548, control 566
  to 752);
- on every record too.

**Below 768: the contract's call 7, which I endorse.** The slot is right after `.log-head`, so it
follows the lines figure and precedes the record and the drawing. It is a 44 px row, 12 px under the
lines figure's last line, with the group at its right end. Once #78 is in, Read as page sits at the
row's left, its text centred on the row. That is `/`'s foot row on `/log`, and `rest-390.webp`'s.

| Which merges second | What it does |
|---|---|
| #78 | It wraps the slot in `<Foot control={<MotionControl />} />`. `.log > .foot` takes `margin: 12px 0 0` (#78's 4 px suits a lone text link, but puts the buttons' frames 4 px under the figure's text) and drops B5c's `.log > [data-motion]` rule. |
| This PR | It passes the control to #78's `Foot` and sets the same 12 px. |

Until then, this PR's slot needs `.log > [data-motion] { order: 4; margin: 12px 0 0; padding: 0;
justify-content: flex-end }`. Without it, `/`'s `main > [data-motion]` rule (−12 px margins and 16 px
of padding) would double `/log`'s 16 px gutter.

Measured with the group in place:
- at 390 the row is at 462 to 506, so everything through Every revision's head is in the first
  screen (`ctl-A-390-light.png`; with Read as page, `ctl-A2-390-light.png`);
- at 320 both are on one line.

The Tab order is the eye's: the bar's links, the control, then (after #78) Read as page, the record,
and the table. **Quill:** that's three more stops on `/log` at every width, for B5.9's loop.

**Considered and not taken:**
- **The `h1`'s row, at its right** (`ctl-C-390-light.png`). It's handsome and adds no height, but it
  splits the two view preferences that `/` keeps in one row.
- **The drawing's foot** (`ctl-B-390-light.png`). It parts the hull from its caption by 40 px,
  which #78 rejected for Read as page for the same reason.

## Defaults I'm steering away from

- A turntable: the ghost moves once, then it is still.
- An x-ray or hologram ghost: no cyan, no additive blending, no glow, no blur. The translucency is
  drafting film's, in the tokens' colours, with normal blending.
- Tooltip cards on hover.
- An accent hover.
- Numbers that fade or cascade in.
- `/`'s 2.4 s loft replayed at full length on a second page.

## The frames' departures, for the owner (they see them on the preview)

1. **Both sides of the hull, translucent.** `log-1440.webp` drew the near side only, with the far
   sheer as a line. With both sides, the hull reads as a ship at a glance. With one side, it reads as
   the drawing shaded (`final-1440-light.png` against `oneside-1440-light.png`). This is my call
   inside "vellum = removed". It is still a visible change from the frame, so the PR body shows both
   frames. If the owner prefers the frame, it's one constant: one side, one pass, 4 draws.
2. **No "or a plank in the hull" in the lede** (section 4).
3. **No numbers below 768** (`log-390.webp` drew them). That's B5a's shipped rule: a lift there is too
   shallow.

## What I couldn't verify

- Everything above is SwiftShader in headless Chromium. The move's feel and 30 fps on a phone wait
  for a GPU and the owner's phone at the demo.
- Pixel's spike hadn't landed when I wrote this, so the costs are his to confirm: 5 draws, and two
  sides without a deck within 30k and 12k triangles.
- Production can't show B5b until Vercel's limit resets, and a preview may hit the same limit. The
  owner's demo needs one that deploys.
