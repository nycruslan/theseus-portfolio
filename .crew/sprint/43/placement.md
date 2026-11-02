# Sprint 43: how the sheet fits a laptop window (Iris)

**Call: (a), the band gives way, and the drawing keeps its stern on the frame.** From 1280 px wide,
the drawing scales down from the band's left edge until the window has room for the title block.
Two refinements make it hold at 1366 × 625. On a window that can't show the whole sheet, the
contact row follows the bio instead of waiting at the revisions' foot. Below 690 px tall, the
particulars stand beside the drawing instead of under the body plan. At 1440 × 900 nothing moves:
every rule below resolves to today's values there.

## Why (a), and not (b) or (c)

1. **(a) keeps the sheet the owner approved, at every laptop window.** Only the drawing's scale
   changes, and it changes continuously with the window's height: nothing flips at a breakpoint.
   On the owner's own MacBook (1440 × 790) he sees the canvas's composition at 0.87 of its size,
   not a new layout.
2. **(b) recomposes the sheet and demotes the drawing to a column.** That is the trade the owner
   rejected (clarity by hierarchy, never by demoting the 3D). It also flips at an aspect
   threshold, so a resized window jumps between two compositions. It doesn't fix 1280 × 800
   (16:10, 25 px short) without (a) as well. No kept check pins the old arrangement at a window in
   the set (1280 × 800's B4.49 asserts only "inside"), so the cost was the composition, not the
   contract.
3. **(c) cuts a view.** A lines plan is three views, and the half-breadth plan is the ground the
   hull's shadow falls on. It also saves about a third of the band at most, which isn't enough at
   1366 × 625, 1536 × 715 or 1280 × 680 without (a).

**Defaults I steered away from:**

- Centring the shrunk drawing. It floats, and it lands the body plan on the particulars.
- Scaling the type with the window. The name would shrink, and the lettering is fixed px by
  design.
- Hiding or cropping the drawing on short windows.
- A hero with the name on top.

**Why the contact row stops waiting at the foot.** At 1440 to 1536 in the live state, the revision
block is 344 px tall and the title block 306 px. Today the contact row is pushed to the row's foot
(`lg:mt-auto`), so the revisions' height decides where the links land. On a window too short for
the whole sheet, that foot is below the fold anyway, and its alignment with "All 41 revisions in
the Log" can't be seen. Letting the row follow the bio (by the bio's own 12 px margin and the
row's rule) gives the drawing 37 px at every height-bound window. At 1366 × 625 that is the
difference between planks that hold an 11 px number (0.52 scale) and planks that can't (0.45).

## The rule (from 1280 px; Forge builds it, the CSS is a sketch)

The constants:

| Name | Value | What it is |
|---|---|---|
| `--sheet-foot` | `23.5rem` (376 px) | What the window keeps below the drawing: the bar (72) and the title block down to its contact row's bottom (its natural height less its 17 px foot: 289 px at 1440 to 1920, 285.5 at 1366, 281.7 at 1280), with about 15 px of film under the links. In rem, so a larger default font size grows it with the text. |
| `--plan-floor` | `15rem` (240 px) | The floor (below). |
| 0.33807 | 476 / 1408 | The wide drawing's height over its width (`WIDE.box`). |
| 0.66151 | 931.4 / 1408 | The DWL and Base lettering's left edge, the particulars' line since sprint 39. |
| 0.91567 | 1289.2 / 1408 | The drawing's rightmost ink once the station numbers are off: the body plan's centreline. |
| 56.25rem, 13/8 | 900 px tall, aspect 1.625 | Where the contact row stops waiting at the foot. |
| 43.125rem | 690 px tall | The short regime: the drawing under 0.66 of its 1440 size. |

```css
@media (width >= 80rem) {
  main {
    --sheet-foot: 23.5rem;
    --plan-floor: 15rem;
  }

  /* The band gives way: the drawing is the band's width, or the height the window leaves above
     the title block, whichever is less, and never under the floor. Its left edge stays on the
     frame, so the room it frees opens at the right, over the title block. Scoped to /'s sheet:
     /crew's detail drawing is .plan-wide too. */
  main > [data-plan] > .plan-wide {
    width: min(100%, calc(max(var(--plan-floor), 100svh - var(--sheet-foot)) / 0.33807));
  }

  /* The particulars keep their left edge on the drawing's DWL and Base lettering: the drawing's
     own width now, which is the band's (100% - 2px) wherever the drawing doesn't give way. */
  .particulars {
    margin-left: calc(
      1px + min(100% - 2px, calc(max(var(--plan-floor), 100svh - var(--sheet-foot)) / 0.33807)) *
        0.66151
    );
  }
}

/* Wherever the sheet can be taller than the window (shorter than 900, or wider than 13:8), the
   contact row follows the bio. Not at 1440 x 900 (16:10, 900 tall): W2 pins it. */
@media (width >= 80rem) and (height < 56.25rem), (width >= 80rem) and (min-aspect-ratio: 13/8) {
  /* the title block's contact row */
  .title-contact {
    margin-top: 0;
  }
}

/* Below 690 tall the drawing is under 0.66 of its 1440 size: the lettering takes the rules it has
   from 768 to 1023 today, and the particulars stand beside the drawing. */
@media (width >= 80rem) and (height < 43.125rem) {
  main > [data-plan] .plan-view > .plan-plank {
    font-size: var(--step-xs);
  }

  main > [data-plan] .plan-wide-only {
    display: none;
  }

  /* The left edge on the title block's text edge (col 2 at 4/7, its 28 px padding), or 24 px
     clear of the drawing's rightmost line, whichever is further right. */
  .particulars {
    margin-left: max(
      calc(100% * 4 / 7 + 28px),
      calc(1px + max(var(--plan-floor), 100svh - var(--sheet-foot)) / 0.33807 * 0.91567 + 24px)
    );
  }
}
```

**Builder's notes:**

- `.title-contact` is a stand-in. The prototype used `main > header.sheet-row > p:last-child`, so
  give the row a class or a data attribute of your choosing. The row keeps `lg:mt-auto`
  everywhere else.
- Unlayered CSS in `globals.css` beats Tailwind's utilities layer, so the override needs no
  `!important`.
- **Leave `.sheet-row`'s min-height as it is.** Where the drawing gives way, the formula's value
  falls under both blocks' content, so it never binds, and wherever the drawing doesn't, it is
  today's.
- Nothing else changes: the 1024 to 1279 rules (Wc's), the narrow drawing, the DOM order, the
  markup, the model's layer.
- **Don't key the lettering to the drawing with a container query.** By the containment spec,
  `container-type` applies layout containment, which makes `.plan-wide` a stacking context. That
  would trap the plank numbers' `z-index: 1` under the model's canvas. I reasoned this from the
  spec and didn't try it. The height query is exact here anyway: with `--sheet-foot` fixed, the
  drawing is under 0.66 scale exactly when the window is under 690 tall.
- The thresholds are tied to `--sheet-foot`. If it changes, 690 becomes `--sheet-foot` + 314
  (0.66 × 476), and the 13/8 bound needs the sweep again: every window from 900 tall where the
  drawing gives way must fall under the contact row's rule.
- Print and forced colours are untouched. A printed page is under 1280 wide, and in forced
  colours the model's layer is off while the drawing scales the same way.

## The floor: 240 px of `[data-plan]`'s box

The floor is a drawing 710 px wide, 0.504 of its 1440 size. Its lift is 9.8 px deep, which holds
an 11 px plank number (digits about 7.7 px tall) the way the 768 drawing does at 10.4 to 10.6 px.
The smallest in the set is 249 px, at 1366 × 625 (`hull-1366x625-light.png`: every number is
inside its plank).

From 1280 wide, below 616 px tall, the drawing holds 240 px and the page scrolls to the contact
row. The contract's range starts at 620, so this never applies in the set. In the sweep, the only
failures between 600 and 1000 tall were at 600: at 1440 wide and wider, the links end 1.2 px under
the fold.

W3 reports each window's value against 240.

## The particulars in the corner, and where they go when it can't hold them

There are two places, never a third, and the DOM order doesn't change.

- **690 px tall and up: the corner under the body plan, as now.**
  - Left edge on the drawing's DWL and Base lettering line, which is 931.4 of 1408 of the
    *drawing's* width. That is sprint 39's rule, since today the drawing is the band.
  - Right edge on the title block's text, 16 px above the frame's line.
  - As the drawing narrows, the table widens to the left. Past 458 px its Reach row unwraps, so it
    needs 106 px instead of 124 to 141, and the corner keeps at least 23 px under "Base" (1536 ×
    715, the tightest in the set).
- **Below 690 px tall: beside the drawing, standing at the band's foot.**
  - Right edge on the title block's text.
  - Left edge on the title block's text edge (the name's left), or 24 px clear of the drawing's
    rightmost line, whichever is further right.
  - At 1366 × 625 it sits exactly over the title block's column (x 806 to 1321, the name's edges),
    so the sheet reads drawing beside particulars, over revisions beside title block. At 1280 ×
    680 the drawing reaches past that column, so the table stands 24 px clear of the body plan
    (x 864 to 1235). Its rows wrap to two lines (y 201 to 360, 159 px), with 129 px of film above
    them in the band.
- **Why the switch is at 690.** At 0.66 scale, "Base" to the frame's line is 0.66 × 207 = 137 px.
  Four one-line rows, the 16 px foot and a 12 px gap need 134. Under that the table would touch
  "Base". Above 690 at 1280 wide, a table beside the drawing would be squeezed under 300 px (at
  0.70 scale the body plan ends at 919, which leaves 292 px). One switch serves every width, so the
  corner takes over there.
- **The film fill stays.** P4's pixel clause, run on Full at rest at 1536 × 715, 1440 × 790,
  1280 × 800 and 1920 × 950 (the dl hidden, with and without the canvas), matched 100.000% of
  the dl's box at every window. The hull and its shadow never reach the table.

## Rider: the led-out "42" on seat 5.0

**It moves.** The seated "42" in the 2D drawing is already clear of every line: no path of the
drawing crosses its box at 1280 to 1920 (measured on production; `rider42-*.png`). The fault is
the 3D rider of a *pencil* on 5.0. I put the live pencil on 5.0 on production (moved
`data-pencil` and the `.plan-pencil` class, then Off and Full to remount), and on Full at rest:

- at 1440 × 900 the rider's box is y 322.8 to 335.8 and the Base line is at 334;
- at 1536 × 864 it is y 339.8 to 352.8, with the line at 351.9.

The line runs through the digits' feet (`p50prod-1440x900-light.png`).

Under the prototype the rider crosses the line at every scale. At 1366 × 625 it is y 202.1 to
213.1 against the line at 209.3; at 1536 × 715, 249.3 to 262.3 against 258.9. At 0.52 scale it
also sits on the station figure "2" (`p50v3-1366x625-light.png`). Raising it above the line
doesn't hold: at 1366 × 625 the hull's lower edge leaves about 12 px between it and the line, and
an 11 px box needs that with no clearance.

**Where it goes: onto its plank, on its film chip, like every other pencil seat.** Sprint 34 set
the pencil's number on the hull "centred on the plank even where the plank is a sliver (the chip
may overlap its neighbours: it is the hull's only label, so nothing clashes; no leader)"
(`.crew/sprint/34/notes-iris.md`, 4.4). 5.0 was left out only because its 2D anchor is led out,
and a led-out number has no chip. Concretely:

- the 2D drawing keeps leading 5.0's number out;
- on the hull, the number rides from that led-out place onto the plank's body middle through the
  loft, as the Log's led-out numbers ride (`lib/model/ghost.ts`'s `out` and `into`), and settles
  there with the chip;
- the chip is HTML above the canvas, so it would hide the 3D copper dot: where it would cover the
  dot's centre, it slides toward the plank's stern end until the dot clears its edge by 2 px;
- the Base line may pass under the chip, which masks it, as a callout breaks the line it sits on.

This is Pixel's (`pencilLabel`, `riderLabel` and `riders` in `lib/model/ghost.ts`). Nothing in the
2D changes.

**The check, in W3's style, with the pencil on 5.0** (the fixtures' sprint 999 seats there when
the record's count is 18 mod 22, as in sprint 41), on Full at rest at 1440 × 900, 1536 × 715 and
1366 × 625:

- the number's computed background is the film (the chip);
- its box meets no `[data-plan] .plan-view > span` (the line labels and station figures);
- its box doesn't contain the copper dot's projected centre;
- its centre lies on the hull's silhouette.

Seat 5.0 comes up in pencil again when the record holds 62 merged sprints.

## For Pixel: the model's registration

- **The model already follows the drawing.** The canvas lays itself on `.plan-wide`'s box through
  the ResizeObserver. On the prototype, on Full, the canvas against the drawing was:

  | Window | Canvas | Drawing |
  |---|---|---|
  | 1366 × 625 | 737 × 249 | 736.53 × 248.98 |
  | 1536 × 715 | 1003 × 339 | 1002.75 × 338.98 |
  | 1280 × 680 | 899 × 304 | 899.22 × 303.98 |

  All three are within the whole-pixel rule's 1/ratio px. When the drawing gives way, its width
  is fractional ((100svh − 376) / 0.33807), and the canvas rounds within the rule. No `round()`
  is needed.
- **`[data-model]` still covers main's row 1,** the band's full width. The canvas covers only the
  drawing, at the band's left.
- **What's new is that the drawing resizes with the window's height,** not only its width. W5's
  1440 × 900 → 700 → 900 crosses from the natural drawing to 0.68 scale (the corner regime) and
  back, so the model must re-register on a height-only resize.
- **Below 690 tall the pencil's number is 11 px,** since the rider is the 2D span, moved. W4's
  1366 × 625 is in that regime, and 1536 × 715 isn't (13 px, 0.71 scale).
- **The rider rule above.**

## Each window under the prototype

The prototype is `proto-v3.css`, injected into production with Playwright at DPR 1, WebGL refused
for the boxes. Production was main at 5643a54 (#98, which merged after this sprint's branch and
deployed mid-session). The feed was live: the pencil row and the two-line legend. "Contact ends" is
the bottom of the contact row (the three links B1.1 reads, now after Case studies and Ask AI).
"Today" is production at 5643a54 measured the same way, with no CSS injected.

| Window | Band (y) | Drawing: width, scale | Plank numbers | Particulars (x; y) | Name (h1) | Contact ends (today) | Film under it |
|---|---|---|---|---|---|---|---|
| 1280 × 680 | 72–376 (304) | 899, 0.639 | 11 px | beside: 864–1235; 201–360 | 396–480 | 657.7 (817.1) | 22.3 |
| 1280 × 800 | 72–493 (421.2, unchanged) | 1246, 0.885 | 13 px | corner: 841–1235; 336–477 | 513–597 | 774.9 (817.1) | 25.1 |
| 1366 × 625 | 72–321 (249) | 736.5, 0.523 | 11 px | beside: 806–1321; 199–305 | 341–428 | 606.5 (822.7) | 18.5 |
| 1440 × 790 | 72–486 (414) | 1224.6, 0.870 | 13 px | corner: 827–1395; 364–470 | 506–595 | 775.2 (874.2) | 14.8 |
| **1440 × 900** | **72–547.3 (475.3), unchanged** | 1406, 0.999 | 13 px | **947.1–1395; 407.6–531.3, unchanged** | 567–657 | **874.2 (874.2), at the foot** | 25.8 |
| 1470 × 840 | 72–536 (464) | 1372.5, 0.975 | 13 px | corner: 925–1425; 414–520 | 556–645 | 825.2 (884.3) | 14.8 |
| 1512 × 865 | 72–561 (489) | 1446.4, 1.027 | 13 px | corner: 974–1467; 439–545 | 581–670 | 850.2 (898.5) | 14.8 |
| 1536 × 715 | 72–411 (339) | 1002.8, 0.712 | 13 px | corner: 680–1491; 289–395 | 431–520 | 700.2 (906.6) | 14.8 |
| 1920 × 950 | 72–646 (574) | 1697.9, 1.206 | 13 px | corner: 1140–1875; 524–630 | 666–755 | 935.2 (1,013) | 14.8 |
| 1920 × 1080 (reported) | 72–709.6 (637.6, unchanged) | 1886, 1.339 | 13 px | 1265–1875; 587–694 (unchanged) | 730–819 | 998.8 (1,028.6), follows the bio | 81.2 |

**At 1440 × 900 every box I read matched today's to 0.1 px:**

- the band and the drawing;
- the title block, the `h1`, the role, the contact row;
- the `dl`, the caption and the key.

At 1920 × 1080 only the contact row moved. W2's baseline must come from main at 5643a54 or later:
#98 changed the title block (the bio's bottom margin went from 14 to 12 px, and Case studies and
Ask AI joined the row).

At every window:

- the revisions' caption, the `h1` and the `dl` are inside the window, and the `h1` stays the
  largest text;
- no plank or lettering span lies outside `[data-plan]`, and the `dl` meets no plank grown by
  24 px and no lettering span;
- nothing scrolls sideways.

At 1366 × 625, which shows no key until Wc, all five revision rows and the legend are inside
too.

**The sweep.** Every 10 px of height from 600 to 1000, at widths 1280, 1320, 1366, 1400, 1440,
1470, 1512, 1536, 1600, 1680, 1800 and 1920 (492 windows), checked the facts inside, W3's
clearances and sideways scroll.

- 484 of 492 passed.
- The 8 failures are all at 600 px tall, at widths 1440 to 1920, where the floor holds and the
  contact row ends 1.2 px under the fold.
- An earlier draft with a 7/4 bound for the contact row failed at 1536 × 900 (6.6 px out) and
  1600 × 920. Those windows are 16:10-ish and the drawing doesn't give way there, but the live
  revisions push the row past the fold. Production already has that fault today. 13/8 fixes it.

## Evidence (git-ignored, `.crew/screenshots/43-iris/`)

- `v3-<window>-light.png` and `v3-<window>-dark.png`: the set at DPR 1, WebGL refused, the
  prototype on production.
- `prod-1440x900-light.png`, `prod-1366x625-light.png`, `prod-1536x715-light.png`: production
  before #98 deployed, the old title block.
- `full-1366x625-light-proto.png`, `full-1536x715-light-proto.png`,
  `full-1280x680-light-proto.png`: Full, settled, on the prototype. The hull lands on the scaled
  drawing at its left.
- `hull-1366x625-light.png` and `hull-1280x680-light.png`: the drawing at DPR 2, 11 px numbers at
  0.52 and 0.64 scale.
- `rider42-*.png`: the seated "42" in 2D, clear of every line from 1280 to 1920.
- `p50prod-1440x900-light.png`, `p50prod-1536x864-light.png`: the rider fault, reproduced.
  `p50v3-1366x625-light.png`, `p50v3-1536x715-light.png`: the same under the prototype, where at
  0.52 scale it also meets the station figure.
- `p4edge-*.png`: the dl's left edge on Full.

Scripts are in my scratchpad, not the repo: `measure.mjs`, `sweep.mjs`, `shoot.mjs`,
`p4pix.mjs`, `pencil50.mjs` and `proto-v3.css`.

## Not verified

- The open and resting fixture states. The prototype ran on production's live state only.
  `--sheet-foot` depends only on the title block, so the revisions' height in any state can't
  push the contact row once it follows the bio. The one place it still can is 1440 × 900 itself,
  where W2 and the kept checks already hold it.
- Real GPUs and real devices. The hull is SwiftShader's.
- The fallback face. The fonts-blocked run gave the same geometry to 0.1 px, which I don't trust
  as a real block; sprint 39 measured the fallback as same or fewer wraps at desktop widths.

## Amendment (Forge's build, fdfb899): the foot ramps at the narrow end

At 1280 wide the bio's three lines hold by 0.86 px in Playwright's Chromium, which draws glyphs at
whole-pixel widths. Chrome 153 draws them at fractional widths, as real Mac and Windows Chrome do,
and there "the" drops to a fourth line (+24.4 px): the contact row ends 2.1 px under the fold at
1280 × 680. A fit must not hinge on a 1 px wrap, so the foot covers a fourth bio line wherever the
bio's measure is near the wrap (under about 516 px, the 1366 column), and ramps down to 23.5rem by
1366 with no step:

```css
main {
  --sheet-foot: clamp(23.5rem, calc(25rem - (100vw - 80rem) * 0.279), 25rem); /* 400 px at 1280, 376 from 1366 */
}
```

The short regime keeps its meaning (the drawing under about 0.66 scale), so its switch moves from
690 to **712 px tall (`44.5rem`)**. At 1280 with a 400 px foot, that switch falls at 0.655 scale.
At 1366 and wider, windows 690 to 711 tall now stand the particulars beside the drawing (at 0.66
to 0.71 scale), where the table keeps 365 px or more. 1536 × 715 stays in the corner, 3 px above
the switch.

**Measured on production with the CSS injected (Chromium, whole-pixel glyphs, live state):**

- 1280 × 680:
  - band 280 at 0.588 scale, beside regime, particulars x 799–1235;
  - contact row ends at 633.7, with 46.3 px of film, which leaves 21.9 px with a fourth line.
- 1280 × 800:
  - band 400 at 0.84 scale, so the drawing now gives way by 21 px there;
  - corner regime, 33.3 px under "Base";
  - contact row ends at 753.7, which leaves 21.9 px with a fourth line.
- 1366 and wider: unchanged, and 1440 × 900 identical.
- Sweep, every 10 px of height from 600 to 1000 at 1280, 1290, 1300, 1320, 1340, 1366, 1400, 1440
  and 1536 wide: 367 of 369 pass. The two failures are at 600 tall (1440 and 1536), below the
  contract's range, as before.

The floor still holds in the set: the smallest band is 249 at 1366 × 625, and 280 at 1280 × 680.
