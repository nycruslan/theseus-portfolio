# Sprint 33, Iris's early look at the ghost (Pixel, 0352b23)

Built at 0352b23 in `/home/user/wt-iris-33` (`next start` on 4822). I looked at `/log` and
`/log/13` at 390, 768, 1024 and 1440, in both schemes:
- Calm, settled;
- Full's move on Playwright's clock at 1440 and 390;
- reduced motion at 1024;
- a mouse over all 22 numbers from 768;
- a touch drag and a tap at 390.

The control's place is Forge's and isn't in yet. The frames are in
`.crew/screenshots/33-iris/early/`.

**Verdict for now: two musts, then it's the ghost I asked for.** The material, the colours, the view,
the move, the marks, the hover and the touch all match `notes-iris.md`. The two musts are both about
lines: one is drawn where it shouldn't be, and some cross the numbers.

## Must

1. **Below 768 the 5.0 leader is drawn with no number** (`c-log-390-light.png` and
   `c-log_13-390-light.png`: a 20 px graphite stub off the stern at 390, in both schemes). The
   numbers are hidden below 768, so this is a stray line. The 2D hides it there for the same reason
   (`[data-ghost] .ln-leader { display: none }` under 48rem). Draw the leader from 768 only, and drop
   it, with the drawing's level, when the page crosses 768.

2. **Numbers sit on lines at the stern and the keel, where the 2D's don't.**
   - **How I counted:** strong line pixels (seams, butts, the outline) inside each number's box, on a
     frame with the numbers hidden (`scratchpad/early/lines.mjs`):

     | Width | 3D | 2D, same count |
     |---|---|---|
     | 1440 | "23" 26, "4" 21, "8" 18, "13" 17 | none |
     | 1024 | "23" 31, "11" 19, "4" 18, "8" 17, "17" 17, "14" 15, "13" 15 | only "4", 15 |

     On `/log/13` the record mark's ink butt runs through "4" at 768 and 1024 (`z-stern-1024.png`,
     `c-log_13-768-dark.png`). "8" sits on the stern's outline at both widths (`z-stern-1440.png`).
   - **The cause** is in `riders()`: a number goes to the projection of the hull point at its band's
     middle. On the turned hull the band's projected middle isn't there, because the lower lifts face
     down and away, so the number drifts onto a seam. The stagger only tests numbers against
     numbers.
   - **The change:**
     - Centre each number between its own plank's projected top and bottom edges at its x (the
       screen midpoint).
     - Take the x, inside the stretch the 2D's `plankBody` allows, where that projected depth is
       greatest.
     - Extend the stagger's `clear()` test to the plank's own edges, the outline and the record mark,
       at 1 px.
     - Where no x clears (lifts are 11 to 13 px deep at 1024 against an 11 px box), keep the
       deepest point.
   - **Done when:** the same count is no worse than the 2D's at 768, 1024 and 1440 in both schemes,
     and no number crosses the record mark on `/log/13`.

## Recheck after must 2 (should)

- **Dark, 1024:** the median under "15" is OKLab L 0.503. That's 0.008 over `--card` (0.495), and
  my notes' band allows 0.005. The contrast holds at 4.81:1. "15" may be reading its own seam, so
  measure again after must 2. If it's still over 0.500, take `GHOST_DARK_GAIN` to 1.5.
- **Light, 1440:** under "23" it reads L 0.837, under the 0.85 floor. That's the same seam, so
  recheck after must 2.

## What's right; keep it

- **The look:** both sides in vellum, the hull's inside showing above the near sheer, the far seams
  faint through the near planks, no shadow.
  - Pencil seams in light, graphite at night.
  - Light planks L 0.84 to 0.93; dark L 0.44 to 0.49 at 1440, where the worst number is 5.0:1.
  - It matches my prototype frame for frame (`log-1440-light.png` against my `final-1440-light.png`).
- **The canvas** lies on `[data-ghost]`'s box at every width: 358 × 71, 736 × 147, 568 × 113 and
  900 × 179, with buffers equal at DPR 1. The svg is hidden once the model is up.
- **The numbers:** 13 px at 768 and 1440, 11 px at 1024, hidden at 390. The record's "13" is 700.
  No two are closer than 2 px.
- **Full on the clock:** frame 1 is registered, the svg is hidden from the first lofting frame, the
  numbers ride their planks through the move, and it settles at 1.8 s (`zm-0048`, `zm-0304`,
  `zm-0608`).
- **Reduced motion** opens settled, with the svg fading.
- **The pick:**
  - from 768, each of the 22 numbers' centres gives its own `data-pick` and a `pointer` cursor,
    "20" included; off the hull there is none and the cursor is `auto`;
  - the hover's ink box on plank 2 reads clearly in both schemes (`c-hover-1440.png`,
    `c-hover-13-1440d.png`);
  - at 390 with touch, a 120 px drag scrolled the page 132 px and a tap opened `/log/14`.

## Decision on must 2 (Iris, after Pixel's f1b9023, merged as 83f321d)

I looked at 83f321d on 4823, Calm, at 768, 1024 and 1440 on `/log` and `/log/13`
(`.crew/screenshots/33-iris/early/r2-*.png`). Pixel's placement fixed most of it: each number is
now centred in its plank's projected depth. With the eye on the digits rather than the boxes, three
things are left:
- **"8"** sits on the stern's outline at every width, half outside the hull.
- **"23"** passes its butt about 1 px clear at 1440, which is fine.
- **At 1024 only,** "4", "1" and "13" touch the keel's lines. On `/log/13` those lines include the
  record mark's ink. I also tried 10 px numbers at 1024, and it didn't help: the limit is room on
  the plank, not size.

**The call: (a) with one (c).**

1. **Pitch stays 12°.** That rejects (b). Lowering it flattens the 3D the owner keeps as the hero
   (get clarity by layering, never by demoting the 3D), and Pixel's own figures show no pitch that
   turns the hull clears 1024.
2. **"8" (seat 3.0) is led out aft, as 5.0 is,** at every width from 768. The turned stern leaves
   its plank no place where the digit clears the outline, which is the reason 5.0 is led out in 2D.
   - Its number goes at its lift's mid-depth, 22 units aft of the plank's stern end, right-aligned,
     the same rule as the 2D's 5.0.
   - Its leader is graphite at 0.75 px, from the number to the plank's body, and only from 768.
   - The number rides from its 2D anchor to that place with e, and the leader runs from the plank to
     the number at every frame. So the leader has no length at frame 1, and frame 1 is still the
     2D exactly.
   - A pick tests its box and leader first, as it does for "20".
   - In the Off drawing "8" stays on its plank; the led-out place is the 3D's.
3. **Everything else stays on its plank,** with Pixel's centred placement.
   - A line through a number's box margin but not its digits is accepted: it doesn't show.
   - From 1024 to 1279 only, "4", "1" and "13" may touch the keel's lines, the record mark's
     included. That's the band where the 2D's own "4" touches too, and it can't be cleared without
     more leaders under the keel, which would cost more than the touch does.
4. **The bar replaces my line count.** No line crosses a digit's ink at 768 and 1440, in either
   scheme, on `/log` or `/log/13`. At 1024 to 1279 the only exceptions are "4", "1" and "13".

The colour recheck passes (dark 1024 under "15" is L 0.475, light 1440 under "23" is 0.865), so
`GHOST_DARK_GAIN` stays at 1.6.
