# Sprint 44: how the sheet fits a phone window (Iris)

**Call: the foot's row goes up to the band's head, and the drawing gives way below it.** Below
768 px, Read as page and the motion control stay one row. The row moves from the drawing's foot to
the band's head, right-aligned and hanging from the bar's rule, where the bar keeps the same pair
from 768. The drawing scales with the window's height (`svh`) from its left edge, down to a floor of
224 × 149 px. Three small tightenings of the facts pay for the rest: the particulars' term column
fits its longest term, the contact row sits closer under the bio, and the title block's foot is
12 px. At 390 × 664 the name, role, lead, contact links and all four particulars are in the first
window, 3.9 px inside the margin. Nothing from 768 up changes, and the DOM order doesn't change.

## What I measured first (the room is bigger than the plan says)

The plan's numbers are stale. Since they were taken, #98, #104 and #105 changed the title block.
This is the current branch (= main + notes), `next start` on port 3471, Chromium at DPR 1 with
WebGL refused, the fonts warm. Real Chrome 153 (fractional glyph widths) gave the same geometry to
0.1 px.

| Window | Drawing | Foot row | h1 | Links end | Particulars | Fold − 8 | To find |
|---|---|---|---|---|---|---|---|
| 390 × 664 | 52–312 | 300–344 | 372–426 | 652.4 | 676.4–835.3 | 656 | **179.3** (plan: 156) |
| 393 × 659 | 52–314 | 302–346 | 374–428 | 631.4 | 655.4–814.2 | 651 | 163.2 |
| 412 × 780 | 52–326.7 | 314.7–358.7 | 386.7–441.5 | 644.9 | 668.9–810.1 | 772 | 38.1 |
| 430 × 746 | 52–338.7 | 326.7–370.7 | 398.7–454.2 | 657.6 | 681.6–822.9 | 738 | 84.9 |
| 375 × 548 | 52–302 | 290–334 | 362–416 | **686.4** | 710.4–869.3 | 540 | **146.4** for the links (plan: 102) |
| 360 × 560 | 52–292 | 280–324 | 352–406 | 676.4 | 700.4–859.3 | 552 | 124.4 for the links |
| 390 × 844 | 52–312 | 300–344 | 372–426 | 652.4 | 676.4–835.3 | 836 | 0 (the dl has **0.7 px** to spare) |
| 320 × 568 | 52–265.3 | 265.3–309.3 | 337.3–391.3 | 680.4 | 704.4–863.2 | 560 | not in the hold set |

Production measured the same at 390 × 664 and 375 × 548.

The phone's first window hinges on three near-wraps. I measured each across widths 320 to 440:

- **The bio's lead is five lines at 390** ("day." alone) and four from 392. It misses by about
  3 px. That fifth line, 23.2 px, is most of the gap between my numbers and the plan's.
- **The contact row overflows 375 by 0.5 px,** so GitHub wraps to a second 44 px row (`linkSum`
  271.5 + 4 × 18 = 343.5 against 343). The same happens at 360.
- **The particulars' Leads phrase is 293.9 px** wide in a 286 px column at 390, so it takes two
  lines. Reach (369.4) and Impact (344.6) take two lines at every phone width under 436.

## Why this option, and not the others

1. **A shorter drawing alone (the band gives way, the foot row stays where it is) can't reach 390 ×
   664.** The row costs 44 px wherever the drawing is, so the drawing would have to fall to 0.44 of
   its size. The scale shots (`scales/scale-0.5.png`, `scale-0.55.png`) show the floor: at 0.5 the
   station figures sit on the Base line and "10" touches "Base".
2. **Taking the control out of the prime space.** Every move I tried failed one of four ways:
   - Below the facts, the control would come before the name in Tab order but after it on screen.
   - The bar has no room for it at 390.
   - A disclosure would hide the three 44 px buttons that W10 requires.
   - Splitting the pair fits, but breaks a kept check. My first prototype (S,
     `screenshots/44-iris/proto1/`) put Read as page in the top right corner and the control at the
     drawing's foot, on the half-breadth caption's line. It fit 390 × 664 with 2.3 px to spare.
     But B2.3 (`e2e/sheet.spec.ts:246`, the owner's sprint 31 arrangement) pins Read as page in the
     control's row, left of it, as a 44 px target, at 320 and 390. The contract allows one rewrite,
     B3.16's. I found the clause after the first sweep, and it decided the call.
3. **Changing the particulars' form saves nothing.** In a 2 × 2 grid or with run-in terms, the
   phrases (214 to 369 px) take as many lines as now or more. The one real saving is the term column
   fitted to "Gateway" (48.7 px) instead of 60. Leads then fits on one line from 385 px wide, which
   saves 17.6 px.
4. **Chosen: the row at the band's head.** It keeps the pair together as B2.3 and the owner have
   it, and on a phone it echoes the bar from 768, which ends in Read as page and then Full, Calm,
   Off. The drawing now meets its own title block directly, as a lines plan sheet does, with no
   row of buttons between the drawing and the name. Read as page, the way straight to the facts, is
   in the first 100 px at every height.

**Defaults I steered away from:**
- hiding a view or cropping the drawing;
- shrinking the name or the facts' type;
- a floating or sticky control;
- a menu or disclosure for the setting;
- centring the shrunk drawing, which floats;
- a second phone layout for tall windows.

## The rule (below 768 px, `/` only; Forge builds it, the CSS is the prototype)

The constants:

| Name | Value | What it is |
|---|---|---|
| `--phone-foot` | `28rem` (448) below 392 px, `26.375rem` (422) from `24.5rem` | What the window keeps under the band: the title block and the particulars, tightened. Measured at 439.8 from 385 to 391 px (five-line bio, Leads on one line) and 416.6 to 418.5 from 392 to 435. The first step is 8 px over, so 390 × 664 sits on the floor, not on a 2 px fit. In rem, so a larger default font grows it with the text. |
| `--narrow-floor` | `14rem` (224 px wide) | The floor: 224 × 149.3 px, 0.574 of the 390 drawing. |
| 60px | the bar (52) and W8's margin (8) | |
| 38px, +12px | the drawing's drop under the row | Read as page's underline ends 34 px below the bar, so the stations' tops (41 of 260 down the box) stay 4 px clear of it. Where the drawing reaches under the control, 12 px more, so the control's frame (44) clears them by 4. |
| 0.105128 | 41 / 390 | The stations' tops below the box's top, per px of width. |
| 0.666667 | 260 / 390 | The narrow box's height over its width (`NARROW.box`). |
| 0.1, 19px | 39 / 390, 12 + 7 | The empty foot under the half-breadth caption (its line is 221 of 260 down, its glyphs end 7 px under it), trimmed to 12 px. |
| 0.051282 | 20 / 390 | The left shift that keeps station 0 and the captions at x 20, where they are today. |
| 57px, 69px; 2.166667 | 38 + 19, the same + 12; 390 / 180 | The band is 57 + 180 s (beside) or 69 + 180 s (over), where s is the width / 390. |
| 1.25, 188px | 390 / 312; 16 + 148 + 4 + 20 | The width at which the drawing's bow (station 10, x 20 + 312 s) comes within 4 px of the control's slot (148 px, 16 px in from the right). |
| `20.6875rem` | 331 px | Below it the row reaches the Profile caption's column (x 20–60), so the caption drops under the row. |

```css
@media screen and (width < 48rem) {
  main {
    --phone-foot: 28rem;
    --narrow-floor: 14rem;
    --narrow-room: calc(100svh - 60px - var(--phone-foot));
    --narrow-cap: calc((100% - 188px) * 1.25);
    /* The drawing's width: the larger of the fit with the control over the drawing and the fit
       with it beside (capped where the bow reaches the control), never under the floor or past
       the band. */
    --narrow-w: clamp(
      var(--narrow-floor),
      max(
        calc((var(--narrow-room) - 69px) * 2.166667),
        min(calc((var(--narrow-room) - 57px) * 2.166667), var(--narrow-cap))
      ),
      100%
    );
    /* The drop under the row: 38 - 41 s, plus 12 px once the bow reaches under the control (a
       step written as a clamp, since CSS has no conditional). */
    --narrow-drop: calc(
      38px - var(--narrow-w) * 0.105128 +
        clamp(0px, (var(--narrow-w) - var(--narrow-cap)) * 1000, 12px)
    );
  }

  @media (width < 20.6875rem) {
    main {
      --narrow-drop: max(
        calc(55px - var(--narrow-w) * 0.064103),
        calc(48px - var(--narrow-w) * 0.105128)
      );
    }
  }

  @media (width >= 24.5rem) {
    main {
      --phone-foot: 26.375rem;
    }
  }

  main > [data-plan] > .plan-narrow {
    width: var(--narrow-w);
    margin-top: var(--narrow-drop);
    margin-bottom: min(0px, 19px - var(--narrow-w) * 0.1);
    margin-left: clamp(0px, 20px - var(--narrow-w) * 0.051282, 100% - var(--narrow-w));
  }

  /* The row at the band's head; its negative margin makes its grid row 0 tall. */
  main > [data-model] + .foot {
    justify-content: flex-end;
    column-gap: 16px;
    margin: calc(
        -1 * (var(--narrow-drop) + var(--narrow-w) * 0.666667 +
              min(0px, 19px - var(--narrow-w) * 0.1))
      )
      0 0;
  }

  main > [data-model] + .foot > a {
    margin-left: auto;
  }

  /* A fixed width before the buttons arrive: content-sized, their arrival pushed Read as page
     left (CLS 0.0066 at 390 x 664 in the prototype). The group is 142.5 px. */
  main > [data-model] + .foot > [data-motion] {
    flex: none;
    width: 148px;
  }

  /* The approved frame's group (a step smaller than the links) at the phone's 44 px. The bar's
     rule is its top edge. */
  main > [data-model] + .foot [data-motion] button {
    min-width: 44px;
    padding: 0 12px;
    border-top-width: 0;
    font-size: var(--step-sm);
  }

  /* The facts, a step tighter. */
  main > header.sheet-row {
    padding-bottom: 12px;
  }

  main > header .title-contact {
    margin-top: 8px;
    padding-top: 0;
    column-gap: clamp(12px, calc((100vw - 312px) / 4), 18px);
  }

  .particulars {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
  }

  .particulars > div {
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    column-gap: 10px;
  }
}
```

**Builder's notes (Forge):**

- **The scope is `/` only.**
  - `main > [data-plan] > .plan-narrow` is `/`'s drawing; /crew's sits inside `.crew-drawing`.
  - `main > [data-model] + .foot` is `/`'s row. /crew's foot follows `.crew-drawing`, /read's
    has no model, and /log's is `.log > .foot`. B4.41 and B5.25 don't move.
  - `.title-contact` and `.particulars` exist only on `/`.
  - Name the selectors as you like.
- **Unlayered CSS beats Tailwind's utilities** (`pb-6`, `mt-3.5`, `pt-1`, `gap-x-[18px]`), so no
  `!important`.
- **The row's offset is a margin, never `top`.** A percentage in `margin-top` reads the width,
  which `--narrow-w`'s `100%` needs. In `top` it would read the foot's 44 px height.
- **The contact row's gap is 18 px from 390 and 12 px by 360,** so GitHub stays on the first row
  at 375 and 360 (16 and 8.5 px of slack). 320 still wraps, as today.
- **The drawing's geometry doesn't change:** `NARROW`, the lettering and `lib/` are untouched.
  Only the box's width and margins move.
- **`svh` only.** `screen` keeps print untouched. From 768 nothing applies.
- **Focus rings keep the site's ring.** Its top edge tucks under the sticky bar, so a focused
  button or Read as page hangs from the rule like the row. I tried an inset ring, and it cut
  through "Read as page".
- **Forced colours need nothing new:** the group's top edge is the bar's rule, in CanvasText.

## Where the control sits (for Probe: B3.16, W10, B2.3)

- **The DOM is unchanged:** `[data-model]`, then `.foot` (Read as page, then `[data-motion]`), then
  `main > header`. B3.16's place clause ("below 768 in main between `[data-model]` and the title
  block") reads DOM order, so **it holds as written and needs no rewrite.** B2.3's row clause also
  holds (Read as page in the group's row, left of it, 89.9 × 44).
- **The row on screen:**
  - It runs from the bar's bottom (y 52) to y 96, right-aligned.
  - The slot is 148 px with its right edge 16 px from the viewport's right. The group is
    142.5 px at its right end: 45.8, 54.7 and 44.1 px buttons.
  - Read as page's right edge is 16 px left of the slot (x = width − 180).
  - Above `main > header`'s top at every window.
- **If W10 wants a visual place clause:** below 768 on `/`, the group's top within 0.5 px of
  `[data-plan]`'s top, its right edge 16 px from the viewport's right, and Read as page in its row,
  left of it.
- **Tab order is unchanged:** the bar's links, Read as page, the group, then Case studies (checked
  at 390 × 664, 390 × 844 and 360 × 740).

## The floor: the narrow drawing 224 × 149.3 px (14rem wide, 0.574 of its 390 size)

- At 0.574 nothing touches, and the closest clearances are about 2 px: the half-breadth caption
  under the stations' feet, and the station figures under the Base line. At 0.55 they nearly
  touch, and at 0.5 the figures sit on the Base line and "10" touches "Base".
- **W9 reads `[data-plan] .plan-narrow`'s height ≥ 149 px.** `[data-plan]`'s own box is then
  ≥ 160.4 px: the drop, plus the box, less the trim.
- **The floor binds at** 390 × 664, 375 × 548, 360 × 560 and 320 × 568.
- **On Full the hull settles on it whole** (`final/full-390x664-*.png`). The canvas measured 224 ×
  149.33 at (8.5, 66.44), on the box exactly.

## Each window under the prototype

The prototype is `proto-final.css`, injected into the branch's build (DPR 1, WebGL refused).
Light and dark gave the same boxes. "Room left" is fold − 8 less the item's bottom.

| Window | Drawing (.plan-narrow): x, y, w × h, scale | [data-plan] y | The row: Read as page x; group x (y 52–96) | h1 y | Contact links end (today) | Particulars y (today) | Fold − 8 | Room left |
|---|---|---|---|---|---|---|---|---|
| 390 × 664 | 8.5, 66.4, 224 × 149.3, 0.574 | 52–212.4 (160.4) | 120.1–210; 231.5–374 | 228.4–282.4 | 498.8 (652.4) | 510.8–652.1 (676.4–835.3) | 656 | links 157.2, dl 3.9 |
| 393 × 659 | 6.8, 63, 256.3 × 170.8, 0.657 | 52–227.3 (175.3) | 123.1–213; 234.5–377 | 243.3–297.4 | 490.6 (631.4) | 502.6–643.9 (655.4–814.2) | 651 | links 160.4, dl 7.1 |
| 412 × 780 | 0, 58.7, 412 × 274.7, 1.056 (full) | 52–311.1 (259.1) | 142–232; 253.5–396 | 327.1–382 | 575.3 (644.9) | 587.3–728.6 (668.9–810.1) | 772 | links 196.7, dl 43.4 |
| 430 × 746 | 0, 57.6, 422.5 × 281.7, 1.083 | 52–316 (264) | 160–250; 271.5–414 | 332–387.5 | 580.9 (657.6) | 592.9–734.2 (681.6–822.9) | 738 | links 157.1, dl 3.8 |
| 375 × 548 | 8.5, 66.4, 224 × 149.3, 0.574 | 52–212.4 (160.4) | 105.1–195; 216.5–359 | 228.4–282.4 | 498.8 (686.4) | 510.8–669.6 (710.4–869.3) | 540 | links 41.2 |
| 360 × 560 | 8.5, 78.4, 224 × 149.3, 0.574 | 52–224.4 (172.4) | 90.1–180; 201.5–344 | 240.4–294.4 | 510.8 (676.4) | 522.8–681.6 (700.4–859.3) | 552 | links 41.2 |
| 390 × 844 | 0, 61, 390 × 260, 1.000 (full) | 52–301 (249) | 120.1–210; 231.5–374 | 317–371 | 587.4 (652.4) | 599.4–740.7 (676.4–835.3) | 836 | links 248.6, dl 95.3 |
| 320 × 568 | 8.5, 92.6, 224 × 149.3, 0.574 | 52–238.6 (186.6) | 66.9–140; 161.5–304 | 254.6–308.6 | 587.6 (680.4) | 599.6–758.4 (704.4–863.2) | 560 | links −27.6 (not held, as today) |

At every window:
- the `h1` stays the largest text;
- no lettering span lies outside `[data-plan]`, and nothing scrolls sideways;
- the half-breadth caption ends 12.5 px above the title block's rule;
- Read as page's underline is at least 4.4 px clear of the stations' tops, and the group at least
  6 px clear of the drawing.

**390 × 844 moves, and I call it needed.** One phone composition at every height is the point; the
alternative is a second layout that flips at a height. What moves there:
- the row, from the drawing's foot (300–344, full width) to its head (52–96, right-aligned);
- the drawing, 9 px down (box 61–321), with its empty foot trimmed by 20 px;
- the control, from 182 to 142.5 px at 13 px type;
- the `h1`, from 372 to 317;
- the particulars, which end at 740.7 instead of 835.3. Today they have 0.7 px to spare.
- The Revisions heading now enters the first window.

The drawing's size and the hull's pose are unchanged there; the canvas measured 390 × 260 at
y 61. Kept checks at 390 × 844 read "inside", DOM order or sizes, not these y values, as far as I
read them (B1.1, B3.16, B3.23, B2.3 at 390 × 900, the registration's whole-pixel canvas). Probe's
run of the kept suite is the check.

**The sweep.** Every 10 px of height from 500 to 940, at widths 320, 360, 375, 390, 393, 412 and
430 (315 windows). Each window was checked for:
- the facts in view from 548 px tall;
- the particulars from 659 at 390 and wider;
- the floor and the row's clearances (above);
- B2.3's row and 44 px targets;
- no sideways scroll.

310 passed. The 5 failures are at 320 × 548 to 590, where the facts end under the fold, which
nothing requires; 320 holds them from 600. A second sweep, every 2 px from 600 to 900 at 390 (151
windows), had none. The particulars hold:
- at 390 from 660 px tall;
- from 393 to 430 wide, from 640;
- at 375 and 360, from 760 (not required there).

**Still (W11).** With the CSS in the served HTML, CLS at load was 0 at 390 × 664, 375 × 548 and
430 × 746. The resize from 390 × 664 to 390 × 844 and back produced two layout-shift entries. Both
had `hadRecentInput: true`, which `e2e/helpers.ts:358` skips, so the CLS is 0. A read that sums
raw entries would see 0.34.

## For Pixel (registration)

- **The canvas already follows the box.** With the CSS served, the canvas laid itself on
  `.plan-narrow` at every size I shot:

  | Window | Canvas | Box |
  |---|---|---|
  | 390 × 664 | 224 × 149.33 at (8.5, 66.44) | the same |
  | 430 × 746 | 422.66 × 281.33 | 422.5 × 281.66 |
  | 390 × 844 | 390 × 260 at y 61 | the same |

- **Height-only resizes now re-size and move the box** (the drop and the left shift change with
  it). W11's 664 to 844 to 664 needs the re-register that W5 needed on wide.
- **The trim clips the canvas's foot.** `[data-plan]` ends up to 20 px above `.plan-narrow`'s
  bottom, so `[data-model]`'s `overflow: clip` cuts the canvas's last 3 to 20 px. Only film is
  there: the settled shadow ends about 55 px higher at 390 × 844. Please confirm on Full, at rest
  and through the loft.
- **The row sits above the stations' tops,** and frame 1 lies on the sheer below them. I saw only
  frame 1 and rest on real-time SwiftShader. Please confirm on clock frames that no loft frame
  reaches the row (y < 96).
- **B3.1 at 390 × 664** registers on a 224 px drawing at a fractional offset (8.5, 66.44).

## Not verified

- **Safari and WebKit:** none are installed here. If Safari sets the bio on four lines at 390, as
  the plan's numbers suggest, its window has 23 px more, not less.
- **The live, open and resting fixtures.** I measured the default server only. Below 1024 the
  revisions come after the particulars, and the feed changes only the drawing's pencil, inside the
  same box, so no position here depends on the feed state.
- **The fallback face** (B3.23 at 390 × 844, B1.1 in view): not measured. There are 248 px of room
  for the links there.
- **Real devices and GPUs.** The hull is SwiftShader's.

## Evidence (git-ignored, `.crew/screenshots/44-iris/`)

- `today/`: the branch as it is, at the set, both schemes, DPR 2, plus `full-390x664-light.png`.
- `scales/`: the narrow drawing at 1, 0.8, 0.7, 0.65, 0.6, 0.55 and 0.5, DPR 3. These set the floor.
- `proto1/`, `proto2/`: option S, split. `T/`, `T2/`: the row at the head, with and without the
  top border.
- `final/`:
  - `<window>-light.png` and `<window>-dark.png`: the call at the set;
  - `full-390x664-{light,dark}.png` and `full-375x548-*.png`: Full, settled;
  - `focus-read-*.png` and `focus-Off-*.png`: the rings.

Scripts are in my scratchpad, not the repo: `measure.mjs`, `factsweep.mjs`, `sweep-t.mjs`,
`still.mjs`, `focus.mjs`, `scales.mjs` and `proto-final.css`.
