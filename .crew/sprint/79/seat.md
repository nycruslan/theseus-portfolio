# Sprint 79: the seats (Iris, for Forge)

I prototyped this on production's /trials and ran it through T39a, T39b and T38a's clauses (Probe's
geometry from 175fffb). The windows were T39's 31, 2560 × 1440, and 1536 to 2048 wide, on both
routes at 16, 20, 24 and 28 px. Production fails 1,467 reads and this prototype fails none. The
nearest any crew dot comes to lettering is 1.3 px, and the leader stays at least 3.0 px off every
dot.

## 1. "−6.2" sits on its dot, or in the pocket with a leader

The label sits above its dot, in the soundings' own grammar, so it reads as the gap's own. It only
fits where 390 × 664 is clear of it. Where the plot is too narrow for that (from 1024), the label
moves to the empty pocket right of 390 × 664 and 393 × 659, joined to its dot by a leader.

Markup (`.trials-gap`): first the leader, then a seat group holding the pad and the text.

```tsx
<line className="trials-gap-leader" x1="0" y1="0" x2="5.941%" y2="-10.853%" />
<g className="trials-gap-seat"><rect /><text x="0">−6.2</text></g>
```

Derive the percentages from a named window, `POCKET: Win = [416, 638]`:
- x2 = (416 − 320) / 1616
- y2 = −(638 − 568) / 645

The axis inset below is (320 − 312) / 1616 = 0.495%. Every percentage here resolves against the plot.

```css
/* On its dot: text from the dot's centre, pad 3 px above its point, never across the axis. */
.trials-gap rect {
  x: max(-2px, -0.495%);
  y: calc(-3px - max(15px, 1.2em));
  width: max(28px, 2.125em + 4px);
  height: max(15px, 1.2em);
}
.trials-gap text { translate: 0 calc(-3px - max(7.5px, 0.6em)); } /* no underline, so translate is safe */
.trials-gap-leader { display: none; stroke: var(--foreground); stroke-width: 1px; } /* CanvasText in forced colours */

/* The pocket: from 64rem, while the plot can't hold the label left of 390 × 664 with 2 px clear
   (plot ≥ 23.09 × (label width + 2.5px), and the chart is the plot plus 109 px). */
@media (width >= 64rem) {
  @container trials-chart (width < max(813px, 259px + 33.73rem)) {
    .trials-gap-seat { transform-box: view-box; translate: 5.941% -10.853%; }
    .trials-gap rect { x: 0; y: calc(max(15px, 1.2em) / -2); }
    .trials-gap text { translate: 2px 0; }
    .trials-gap-leader { display: inline; }
  }
}
```

The pocket shows at 1024 to 1344 wide at 16 px, at every desktop width up to 1440 at 20 px, and
near the 64rem switch at 24 and 28 px. The `view-box` percentage translate is needed because
Chromium 156 ignores CSS `x`/`y` on a nested `<svg>`; I tested both.

## 2. The soundings: em pads (ride-along) and two new seats

Below, `--sw` and `--sh` are the pad's width and height; the em sizes take over from about 20 px.
At 16 px, `--lift` is 0 and every pad, ring and number keeps its current geometry.

```css
.trials-sounding {
  --sw: max(28px, 2.125em + 4px);
  --sh: max(15px, 1.2em);
  --lift: round(nearest, calc(7.5px - var(--sh) / 2), 1px);
}
/* above (456, 792) */
pad:    x: calc(var(--sw) / -2); y: calc(-3px - var(--sh)); width: var(--sw); height: var(--sh)
ring:   x: calc(var(--sw) / -2 - 3px); y: calc(-6px - var(--sh)); width/height: +6px
number: translate: 0 var(--lift)
/* right (1366 × 595): number attributes x="6" y="-6.5" (were 3 and -10.5) */
pad: x: 4px; y: calc(1px - var(--sh))          ring: x: 1px; y: calc(-2px - var(--sh))
/* below (1160 × 635, new data-side="below"): number attribute y="10.5" */
pad: y: 3px    ring: y: 0    number: translate: 0 calc(-1 * var(--lift))
hit: y: -6.25px below 64rem, -2.25px from 64rem (the above seat's target, mirrored)
```

- **1366 × 595** moves 3 px right and 4 px down: pad 4 px right of the point, its bottom 1 px
  under the point. The 1366 × 625 dot clears by 1.5 px, and 1440 × 700 clears by at least 1.3 px.
- **1160 × 635** goes below its dot. 1180 × 740 sits over the above seat at every width from 1024,
  and 1280 × 680 and 1024 × 640 crowd it on phones. Below is the one seat no crew window enters at
  any width or font. A sounding written in the water is still a sounding.
- **456 × 465** loses `byGap`: delete it, `data-by-gap`, and the container block that seats it
  right. It now stays above everywhere.
- If a whole-px translate drops a number's underline row at 1x at 20 to 28 px (`trials.md`, sprint
  78), put the lift on a wrapping `<g>` instead and pixel-check it.

## 3. The plot grows with a large default font (none of this applies at 16 px)

- Below 64rem: `--plot-h: max(176px, 6.5rem + 50px)`, giving 180, 206 and 232 px at 20, 24 and
  28 px. This keeps "−6.2" under 393 × 659 and 456's number under 375 × 548 (by my numbers,
  3.8 px and about 1.2 px; every clearance measured at least 1.3 px).
- From 64rem: `--plot-h: max(120px, 5rem + 20px)`. The plot stays 120 px through a 20 px font and
  is 140 or 160 px at 24 or 28. Grow both `--chart-block` values (274 px and 256 px) by the same
  `max(0px, 5rem - 100px)`, so the frame gives that height up.

## 4. The ring: crew dots drawn above its film (my call, not accepted as is)

This page is the gap at the gap's own window, and the ring hid one of the crew's windows right
beside it. So:

- Wrap the circles in `<g id="trials-pin-dots">` inside `#trials-pins`. H10's bar stays outside
  that group.
- In the top svg, between `use.trials-ring-film` and `use.trials-ring-dot`, add
  `<use href="#trials-pin-dots">` twice: first `.trials-pins-over-halo` (stroke
  var(--background), 8px), then `.trials-pins-over` (stroke var(--foreground), 5px). Both take
  `mask="url(#trials-ring-hole)"`.
- The mask is `maskUnits="userSpaceOnUse"` over the plot's window box. It holds a `#fff` rect, and
  `<use href="#trials-ring" class="trials-ring-hole">` with stroke `#000` at 7px. Give the mask's
  content `forced-color-adjust: none`. In forced colours the copies take CanvasText and Canvas.

The hole follows the ring when the controller moves it, and it hides the copy of the dot under the
ring, so a ring on a pin looks as it does today. /trials doesn't change, because the ring there sits
on H10's bar and no circle is within 8 px of it.

**For Probe:** a dot whose disc lies outside the hole is painted above the film. That means
distance − 2.5 ≥ the `.trials-ring-hole` stroke ÷ 2 (3.5). T39a's ring clause should read paint
order in that case, not the film's radius.

## What must not move at 16 px

Must not move: the plot box (176 or 120 px), the axes, the band, every pin, the ring, 792 × 575's
pad, ring, number and target, the chart's head and caption, and everything outside the chart.

Expected in the box diff at 16 px:

| Window | What moves |
|---|---|
| 390 | gap rect and text; 1160's pad, ring, number and hit; 1366's pad, ring and number |
| 1024 | the same, plus the leader, and 456 back above (it was in the by-gap seat) |
| 1280 | the same as 1024, less 456 |
| 1440 | the gap, 1160 and 1366 |

On /trials/320x568, the new paint is the dots inside the ring at 320 to 1040 wide.
