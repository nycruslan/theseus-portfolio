# Sprint 65 placement (Iris): the chart of every window, and the crew's fits

Where Tc's parts sit and how they look and move. The words are `words.md`. Ta's placement
(`.crew/sprint/63/placement.md`) and Tb's (`.crew/sprint/64/placement.md`) stand except where a
section below changes them, and it says so. Ink, graphite and pencil only: nothing here is live, so
nothing is copper.

**How I measured.** I built d6b9fbf in my own scratch copy, served it with `next start` on port
3361, and injected this file's markup and CSS into the real `/trials` pages with the copy's own
`@playwright/test` 1.64.0 (CI's Chromium 156 headless shell), scripts on and off, reduced motion,
fonts ready. The chart in the prototype is HTML over an SVG, not Forge's markup, so the numbers are
the boxes the build must reproduce, not its code. Numbers are CSS px from the viewport's top left.
Scripts and shots: `/tmp/claude-0/-home-user-theseus-portfolio/23922bd1-6a2f-5534-bbed-a22354b50616/scratchpad/iris/`
(`proto.css`, `charthtml.mjs`, `final.mjs` for the tables, `still.mjs`, `sound.mjs`, `last.mjs`,
`block.mjs`; shots in `shots/p1` to `shots/p4`). The Studio's frames are in `design/`.

**The calls, in one place.**

1. The chart goes **under the frame**: in the left column from 1024, beside nothing, and after the
   answer below 1024. The answer moves **before** the drawing in the DOM, so the page reads verdict,
   answer, drawing, chart, and CSS `order` puts the drawing back above the answer on phones.
2. From 1024 the frame's height budget gives up **the chart's block**, so frame and chart are both
   in the first screen at 1440 × 900. The default frame there shrinks from 792 × 495 to 704 × 440.
3. While the left column is sticky, the drawing **holds the field's height**, so a tap never moves
   the chart. Where the page scrolls instead (phones, laptops under 840 tall), a tap keeps the plot
   where it was by scrolling.
4. The plot has a **fixed height** (176 px below 1024, 120 from) and stretches across. Every mark
   keeps its px size, and the hatching keeps its 135° and 6 px.
5. **Found fits are drawn on the chart** as thin outlines, never dashed. The count line sits in the
   chart's head, with the newest find's plank pressing in beside it.
6. **The stamps go last on the page**, grouped by sprint. That's Atlas's question 1: they sit below
   everything visible at load at every viewport I measured, so un-hiding them after hydration or on
   restore moves nothing in view, and no stamp keeps an empty box.
7. **The sea runs to the freeboard dimension's foot** on the page and the card, and a sinking frame
   shrinks so the frame and its sea fit the height budget, as the card already does.

## 1. Order: one DOM, two layouts

`main`, in DOM order (Ta's order with the answer moved up, the chart added beside the drawing, and
the stamps added at the end):

1. `header`: the h1, the dare, the lead.
2. The readout: Window, Freeboard, the verdict.
3. The answer (`[data-answer]`).
4. `div.trials-side`, the left column's box, holding:
   - the drawing's `figure` (Ta's and Tb's, unchanged inside);
   - the chart's `figure` (`svg[data-chart]`, with its head and caption; section 3).
5. Copy link's row (`.trials-share`).
6. `section` Try any window.
7. `section` The crew's windows.
8. `section` The record.
9. `section` The crew's fits (`ol.trials-stamps`; section 5).

**Why the answer moves up.** A screen reader and a page without CSS now read the verdict, then its
answer in words, then the figures. Before, the answer followed the drawing, so it would have come
after the whole chart too. Nothing focusable is in the answer, so Tab order is unchanged by the
move: the corner, then the four soundings, then Copy link, then the stamps' sprint links, then the
form. I checked this at 320, 390 and 1440 (`order.mjs`). No check pins the DOM order; I grepped
`e2e/trials*.ts` for sibling and position tests and found none.

**Below 1024** the side isn't a box (`display: contents`), and `order` gives the visual order
header, readout, drawing, answer, chart, Copy link, then the sections:

```css
@media (width < 64rem) {
  .trials-side { display: contents; }
  .trials-side > .trials-figure { order: 1; }
  .trials > .trials-answer { order: 2; }
  .trials-side > .trials-chart,
  .trials > .trials-share,
  .trials > .trials-section { order: 3; }   /* the stamps' section is a .trials-section too */
}
```

The chart follows the answer on phones, not the frame, because T7 holds the answer's first line in
the first screen at 390 × 844. With the chart above the answer, the answer started at 921 on
`/trials` and 1020 on `/trials/320x568` (prototype p1).

**From 1024** the side takes Ta's sticky figure's place, and every other child is in column 2 in
DOM order: header, readout, answer, Copy link, the three sections, then the stamps.

```css
@media (width >= 64rem) {
  .trials { grid-template-rows: repeat(8, auto) 1fr; }   /* was repeat(6, auto) 1fr: two rows more */
  .trials-side { grid-area: 1 / 1 / -1 / 2; }            /* every row, as Ta's figure */
  .trials-side > .trials-figure { margin-top: 0; }
}
/* Sticky only where it fits: below 840 tall the frame's 360 px floor binds, the side is taller
   than the window less the bar, and a sticky side would hide its own foot until the page ends. */
@media (width >= 64rem) and (height >= 52.5rem) {
  .trials-side { position: sticky; top: 88px; }
}
```

The figure's own `position: sticky` and `grid-row` go to the side. The drawing's
`container-type: inline-size` stays on the figure: the side has the same width, so `100cqi` reads
the same.

## 2. From 1024: frame and chart in one screen

**The budget.** The frame's height budget subtracts the chart's block, which runs from the drawing
caption's foot to the chart's foot, its 18 px margin included:

```css
@media (width >= 64rem) {
  .trials-side { --chart-block: 274px; }          /* 1024 to 1279: the caption takes 3 lines */
  .trials-drawing { --frame-max: max(360px, calc(100svh - 204px - var(--chart-block))); }
}
@media (width >= 80rem) {
  .trials-side { --chart-block: 256px; }          /* from 1280: 2 lines */
}
```

I measured the block in the shell at nine widths (`block.mjs`). It was 272.6 at 1024 and 273.2 at
1100, with a 3-line caption. It was 254.2 to 256.0 from 1180 to 1536 (2 lines) and 236.5 at 1920
(1 line). 1180 to 1279 holds two lines, so the 274 there leaves 20 px spare. That spare is the
reserve for an engine that wraps one line more.

**The field holds its height while the side is sticky.** Below the frame the drawing keeps the
field's full height, so a frame that changes height never moves the caption or the chart. That is
also Tb's field, the room the corner drags in:

```css
@media (width >= 64rem) and (height >= 52.5rem) and (scripting: enabled) {
  .trials-drawing { min-height: calc(var(--gt) + var(--frame-max) + 14px); }
}
```

This needs the sea to fit inside the budget too (section 7), or a deep sink would grow the drawing
past its floor. With both rules, the plot's top held at one place across ten windows. The windows
were 1440 × 900, 1366 × 625, 1920 × 950, 1280 × 460, 320 × 568, 320 × 460, 1024 × 1100,
1920 × 1100, 456 × 465 and 1024 × 600. The plot's top was 706 at 1440 × 900 and 886 at
1920 × 1080, and no sea ran past the drawing's box (`still.mjs`). Where the side scrolls instead
(at 1024 × 768 the plot's top ran from 440 to 623 across the same windows), a chart tap keeps the
plot's top within 1 px by scrolling, as on phones (section 3).

**Measured, with script, the default `/trials` and the gap:**

| Viewport | Window | Frame (top–foot, width) | Drawing caption | Chart (plot) | Answer | Copy link | Stamps' list top |
|---|---|---|---|---|---|---|---|
| 1440 × 900 | 1440 × 900 | 132–572, 704 | 594–633 | 651–889 (706–826, 792 wide) | 422–528 | 542–586 | 2047 |
| 1440 × 900 | 320 × 568 | 132–567, 245 | 594–633 | 651–889 | 422–580 | 594–638 | 1652 |
| 1024 × 768 | 1440 × 900 | 132–382, 400 | 404–443 | 461–716 (513–633, 400 wide) | 407–510 | 524–568 | 2018 |
| 1024 × 768 | 320 × 568 | 132–488, 201 | 510–549 | 567–822 | 407–562 | 576–620 | 1622 |
| 1366 × 595 | 1440 × 900 | 132–492, 576 | 514–553 | 571–808 (625–745, 718 wide) | 420–525 | 539–583 | 2042 |

- At 1440 × 900 everything above fits the first screen, and the side's foot is at 873 once stuck.
- At 1024 × 768 the chart is whole on `/trials`. On `/trials/320x568` its foot is 54 px below the
  fold. That's a short window with the 360 px floor, and the side isn't sticky there.
- At 1366 × 595 the chart is below the fold, as it must be: the frame is already at its floor.
- Without script the boxes are the same at 1440 × 900 and 1366 × 595. At 1024 × 768 the
  `/trials/320x568` caption sits 4 px higher, since the field rule is script-only.
- Nothing scrolls sideways at any of these.

**T7 still holds**, with nothing to rewrite. From 1024 the whole frame, the waterline and the
answer's first line are in view at 1440 × 900, 1366 × 595 and 1024 × 768 on both of T7's pages. The
frame is smaller, so they sit higher than in Ta.

## 3. Below 1024: the answer, then the chart

Phones are Ta's page down to the answer, unchanged to the pixel: the frame, the waterline and the
answer don't move. The chart comes after the answer, then Copy link.

| Viewport | Window | Frame | Answer | Chart (plot) | Count line | Copy link | Stamps' list top |
|---|---|---|---|---|---|---|---|
| 390 × 664 | 1440 × 900 | 380–549, 270 | 646–745 | 773–1105 (825–1001, 320 wide) | 792–811 | 1119–1163 | 2770 |
| 390 × 664 | 320 × 568 | 380–657, 156 | 754–903 | 931–1262 | 950–969 | 1276–1320 | 2500 |
| 320 × 568 | 1440 × 900 | 405–530, 200 | 646–770 | 798–1149 (850–1026, 250 wide) | 817–837 | 1163–1207 | 3062 |
| 320 × 568 | 320 × 568 | 405–682, 156 | 798–997 | 1025–1376 | 1044–1063 | 1390–1434 | 2783 |
| 390 × 844 | 1440 × 900 | 380–549 | 646–745 | 773–1105 | | | 2770 |

- **At 390 × 664 the toy fits one screen.** Scrolled to the chart, the frame and the whole chart
  are in view together (frame top 380, plot foot 1001: 621 px; frame `tc-390.webp`).
- **At 320 × 568** the frame's top scrolls off when the plot is in view: they span 621 px on
  `/trials` against a 568 px screen. The links near the frame's foot stay in view.
- Without script, the chart sits 20 px higher on phones (the caption's drag sentence isn't there).

**A tap holds the plot under the finger.** Below 1024, and from 1024 where the side isn't sticky, a
settled tap changes the frame's height and the answer's length above the chart. So the controller
records the plot's top at the tap and, after the settle's layout, scrolls by the difference: the
plot's top stays within 1 px, and the frame and the answer above it change.

In the prototype the plot's top ran from 748 to 982 at 390 × 664 across ten windows, so without
this a tap could throw the chart 234 px. Only taps on the chart do this: a drag, a key and an
edited size never scroll the page.

## 4. The chart

### The box

```
figure.trials-chart            border-top 1 px ink; margin-top 28 (18 from 1024); padding-top 10 (8)
  head (flex, wrap, baseline, column-gap 16, row-gap 2)
    h2  Every window           display 700, --step-xl (--step-lg from 1024), line 1.2
    p[data-found]  count line  text 600, --step-sm, tabular, ink (section 5)
  svg[data-chart]              margin-top 12 (10); the plot plus its gutters:
    left gutter  --yg 30 (28 from 1024: the drawing's --gl, so the plot's left is the frame's)
    right gutter --xr 8  (80 from 1024: the drawing's --gr, so the plot's right is the widest frame's)
    foot gutter  --xl 20 (18): the width labels
    plot height  176 (120 from 1024)
  figcaption                   graphite, --step-sm / 1.5; margin-top 6; 62ch below 1024, the side's width from
```

The head is a flex row. The count line follows the title, never right-aligned, so its left edge
never moves when its words change (section 5). It wraps under the title where the row is too
narrow: the no-script count at 320, for example.

**The plot.** It stretches to its width at a fixed height: x is the width from 320 to 1920, y is the
height from 460 to 1100, upward. Forge's half grid step of margin on every side is fine. Its left
and bottom edges are 1 px graphite axes, and its top and right are open.

A fixed height, not the grid's own shape scaled evenly (Forge's first draft: `aspect-ratio` 1616 /
645), because:

- at 1440 an even chart is 792 × 316, and the frame's budget would fall to 244 px;
- at 320 it is 288 × 115, and the band along the foot is 30 px deep.

At 176 and 120 the band is 31 to 55 px deep on phones and 37 at 1440, and the soundings' 44 px
targets clear each other (below).

**Marks keep their size; the plot stretches.** Because x and y scale differently and the ratio
changes with the column, nothing visible may be drawn in the plot's units with a size:

- **A circle or dot** drawn with an `r` in window px comes out as an ellipse whose size follows the
  column. Draw it as a point with a round, non-scaling stroke instead: a circle of near-zero `r`
  with `stroke-width` in px and `vector-effect: non-scaling-stroke`. That draws a true px disc at
  any scale. `circle[data-ring]` with `cx`/`cy` in window units (decision 4) can stay as it is.
- **The hatch** in a `userSpaceOnUse` pattern on a path in the plot's units comes out at a slope and
  spacing that change with the width. It must be 135° and 6 px on screen at every width. Fill the
  band in px space instead: for example, a hatched px rect clipped to the band's shape in bounding-box
  units, with `[data-band]` kept in window units as the geometry T16 reads.
- **Lettering and targets** (soundings, axis labels, the gap's label) live in px, placed by
  percentages, as Forge's soundings already do.

**Layers, bottom to top:**

1. the band's hatch;
2. the found fits' outlines;
3. the band's edge;
4. the pins and the run;
5. the gap's label;
6. the soundings' dots and numbers;
7. the ring.

The ring is last, so the frame's window is never hidden: at 1366 × 625 the 1366 × 595 sounding's
pad covered a third of the ring (prototype p4) until I moved the ring on top.

### What it draws

| Mark | Look | Notes |
|---|---|---|
| The band | 1 px `--pencil` lines at 135°, 6 px apart in screen px: the drawing's sea | The sinking windows, as T16 counts them |
| Its edge | 1.5 px ink, non-scaling, along the band's top only, stepped column by column at each width's last sinking window plus half a step | Not along the plot's floor where nothing sinks (480 to 767), and not up the plot's sides. The steps sit exactly on the crew's widths, 768, 1024, 1248 and 1280, which is the chart's story |
| A pin, one of the crew's windows | 5 px ink dot with a 1.5 px film halo, so it reads on the hatch | Unlabelled but for the gap. `data-freeboard` carries the number (T17) |
| H10's run, 1380 to 1440 at 900 | A 2 px ink bar, round caps, ending on 1440 × 900 | One mark (Forge's `RUN_MARK`) |
| The gap's label | `−6.2`, text 700, `--step-xs`, ink, on a film pad (1 px 2 px), 5 px right of 320 × 568's dot | The one pin labelled: the record's own gap. Labels on the others crowd the phone cluster (8 dots in 25 px at 320) |
| The ring, the frame's window | 16 px across: a 2 px ink ring, film inside, a 3 px ink dot at the point | Drawn last. Server-rendered at the shown window, so it reads without script. With script it follows the hand every frame of a drag and every settle, never eased |
| A found fit's outline | 1 px `--pencil`, solid, non-scaling, no fill | Hidden until found (`[data-fit-region][hidden]`) |
| An outline holding the frame's window | the same in 1 px `--muted` | Follows the fit's `matchMedia` in the frame, mid-drag too |
| A sounding | The number, text 600, `--step-xs`, tabular, ink, underlined 1 px at offset 2, on a film pad; a 3 px ink dot at its window | Section 4's soundings table |
| Width labels | 320, 768, 1024, 1280, 1920, graphite `--step-xs` tabular, under 4 px graphite ticks | 320 starts at its tick, 1920 ends at its tick, the rest centred. 1440 is left out: at 320 it sits 29 px from 1280 |
| Height labels | 460, 780, 1100, graphite `--step-xs`, right-aligned 5 px left of the axis | |

**Why outlines and not dashes.** I tried the fits' regions as 4 3 dashed graphite first. Where two
found regions share an edge (y = 960 for fits 5 and 7, x = 1024 for 5 to 7, x = 1280 for 1 and 2),
their dashes fell out of phase and printed as a solid line beside dashed ones (prototype
`shots/p2c/…_all_…png`). Solid pencil outlines coincide cleanly. The graphite one shows which fits
hold the frame's window now.

**Hover and press, with script.**

- `svg[data-chart]` takes `cursor: crosshair`, since any point tries a window.
- A sounding takes the pointer cursor, and its underline thickens to 2 px on hover (`hover: hover`).
- Without script, only the soundings respond, and the plot keeps the default cursor.

**Focus.** A sounding's ring is the site's ring (2 px ink, 2 px out) around the number's film pad,
not around the 44 px target. The target's ring would cross the band's edge and the neighbouring
sounding at 320, which is Tb's lesson for the corner.

**Forced colours.** The hatch, the edge, the pins, the run, the outlines, the ring and the soundings
draw in `CanvasText`, and the pads in `Canvas`. T16 needs the band and the ring there, so the hatch
must be a stroke that takes `CanvasText`, not a background image, which forced colours can drop.

### The soundings: the four named windows

| Window | Sweep (10e9409) | Number | Its target holds the point, and the number sits |
|---|---|---|---|
| 456 × 465 | −0.1 | `−0.1` | above the dot, centred |
| 792 × 575 | +0.1 | `+0.1` | above the dot, centred |
| 1160 × 635 | +0.2 | `+0.2` | above the dot, centred |
| 1366 × 595 | +0.7 | `+0.7` | above and to the right: its target starts 4 px left of the point |

- **Targets.** 44 × 44 below 1024, 32 × 24 from 1024. Each contains its point: it runs from 6 px
  below the point (2 px from 1024) upward.
- **The number** sits 9 px above the dot, out of the hatch, where the edge has film above it.
- **Gaps between neighbouring targets** (`sound.mjs`, all four holding their points):
  - at 320: 8.3, 13.3 and 6.1 px;
  - at 390: 23.0, 29.4 and 15.1;
  - at 1024: 51.8, 59.8 and 31.4;
  - at 1440: 134.1, 149.9 and 81.8.
- This is decision 5's option A with an offset of my own: 1366 × 595's target is offset to the
  right, so nothing else needs to move. Forge's 4 px apart below 24rem also works with it.
- **No other soundings.** I tried a 5 × 4 lattice and a row of depths in the band. At 288 px wide,
  44 px targets don't fit beside the named windows, and the lattice's labels sat on the crew's pins
  at 1440, 1280 and 1180. The named windows are also the best invitations on the chart: the
  closest calls either way.
- **456 × 465 now sinks.** It reads −0.1 in the committed sweep (10e9409), where sprint 62's sweep
  read 0.0. So the words call the four "close calls", never "near misses" (`words.md`).

## 5. The count line, and where a stamp lands in view

`p[data-found]` is the chart head's second item. A stamp is meant to land where the visitor is
looking, and that's the chart: under the frame from 1024, and with the frame on a phone's screen.

**With script it reads** `[plank] {n} of 7 fits found` (`words.md`).

- **The plank** is the newest find's sprint, in the site's plank grammar: 28 × 20, 1 px ink
  border, `--card` fill, the number 700 `--step-sm` tabular, 8 px before the words.
- **Before the visit's first find**, the plank is the unfound one, a 1 px dashed graphite box with
  nothing in it, at the same size. The words' start never moves.
- **When a fit is found**, its sprint's number replaces the plank's content and the plank presses in
  (section 6). On arrival, and on a restore, it simply shows the newest. If nothing is newest from
  this page, it shows the highest-numbered found fit's sprint.
- **Without script**, and with script until the visit's count is known, it reads
  `This window is in {k} of the crew's 7 fits`, with no plank. Show the plank's slot with
  `@media (scripting: enabled)` from the first paint if the restore runs at load. If it waits for
  the first settle, the slot comes with the visit's words (contract call 6).

**No shift.** From 1024 the line holds one line in both forms (the side is 508 px or more). Its
left edge is fixed, after the title, so a change of words only moves its end.

Below 1024 the no-script form wraps under the title at 320, and the visit's form fits beside it.
So a change there can change the head's height. At load that's below the fold on every phone I
measured: the count line's top was 792 at 390 × 664 and 817 at 320 × 568, against folds of 664 and
568. After load it only happens at a settle, which is input.

**On the chart** the found fits' outlines appear in the same frame as the count changes. They're
SVG paths un-hidden, which never shifts anything.

## 6. The stamps: last on the page, grouped by sprint

**Where.** After The record, as the page's last section: h2 `The crew's fits`, its lead, then
`ol.trials-stamps`.

**Why there** (Atlas's question 1). Found stamps are un-hidden after hydration and on restore, and
an un-hidden stamp grows the list. CLS stays 0 only if nothing visible at load sits below or inside
the list.

At the end of the page, the list's top at load was below the fold at every viewport and window I
tried (`last.mjs`). The worst window was 1920 × 1100, whose record is shortest:

| Viewport | List top (worst) |
|---|---|
| 320 × 568 | 2365 |
| 390 × 664 | 2167 |
| 390 × 844 | 2167 |
| 430 × 932 | 2109 |
| 768 × 1024 | 2176 |
| 1024 × 768 | 1426 |
| 1024 × 1366 | 1520 |
| 1280 × 800 | 1443 |
| 1366 × 768 | 1449 |
| 1440 × 900 | 1454 |
| 1536 × 864 | 1454 |
| 1920 × 1080 | 1454 |
| 1920 × 1200 | 1454 |
| 2560 × 1440 | 1579 |

**Why not hidden stamps that keep their box.** Reserving every stamp's found height leaves about
750 px of blank column at load. **Why not after Copy link**, where my first prototype put them: at
1440 × 900 the list started at 618, in view, so a restore after paint would shift it.

The moment a fit is found is shown up at the chart (section 5). The stamps are the record you read
when you scroll down.

**Grouped by sprint** (Atlas's question 4). The seven fits come from three sprints. One group per
sprint reads each sprint's people and quote once.

```
ol.trials-stamps
  li.trials-stamp-group[data-sprint="43"]          grid: 30px | 1fr, column-gap 12, padding 12 0;
                                                   a 1 px --rule line between groups
    span.trials-plank                              28 × 21; seated (ink, --card, the number) when any
                                                   fit in the group is shown, else 1 px dashed graphite
                                                   and empty
    div
      p.trials-stamp-none                          "Two fits to find among the laptops." Shown only
                                                   while no fit in the group is shown
      ul.trials-stamp-fits
        li[data-fit="1"][data-query][data-said]    the stamp: its words (the link to its query's line),
                                                   then where, in graphite
        li.trials-stamp-todo                       "Another fit to find among the laptops." Shown when
                                                   the fit before it is hidden and the group has a
                                                   shown fit
        li[data-fit="2"] …, li.trials-stamp-todo
      div[data-sprint-line]                        THE SHARED SPRINT LINE: shown when any fit in the
                                                   group is shown
        p   Sprint 43 (a, /log/43): <goal>
        p   Pull request #102 · Drawn Forge, Pixel · Checked Lens · Tested Probe
        blockquote  What went wrong first, in the crew's words / <wentWrong[0].what>
```

The states are CSS on `[hidden]`, so the server's page, a restore and the controller all use one
rule and no script:

```css
.trials-stamp-group:not(:has([data-fit]:not([hidden]))) :is([data-sprint-line], .trials-stamp-fits) { display: none; }
.trials-stamp-group:has([data-fit]:not([hidden])) .trials-stamp-none { display: none; }
.trials-stamp-todo { display: none; }
.trials-stamp-group:has([data-fit]:not([hidden])) [data-fit][hidden] + .trials-stamp-todo { display: list-item; }
```

- The found fits come first in a group, in fit order, then the sprint line, the names and the
  quote: what you found, then who built it and what went wrong.
- Without script, a fit the window doesn't enter shows nothing of its own (T20). The group's "to
  find" line names only the width group (phones, tablets, laptops), as The crew's windows do.

**Type, the site's grammar:**

| Part | Set as |
|---|---|
| A fit's words | text 600, `--step-sm` / 1.5, ink. The link to its query's line, underlined 1 px at offset 3, as the rules' links. A 44 px line target below 1024 (sprint 50's technique), 24 from 1024 |
| Where | graphite, `--step-sm` / 1.5, on its own line |
| "To find" lines | graphite, `--step-sm` |
| Gap between a group's fit items | 8 |
| The sprint line | 10 px under the fits, text 700 `--step-sm`. `Sprint 43` is a link to `/log/43` (44 px tall below 1024) |
| Pull request and names | graphite `--step-sm`. The names are the revision row's own Drawn, Checked and Tested, terms graphite, names ink, as `/log`'s record prints them |
| The quote | Margin-top 8, the keel's quote grammar (`.keel-quote`): 12 px left padding, a 1 px ink rule, `--step-sm` / 1.5. Its head line in graphite, the retro's words in ink, verbatim with no full stop added, as `/log/43` prints them |

## 7. Motion

**What moves when, with script:**

| When | What changes | Motion |
|---|---|---|
| Every frame of a drag | the ring (to the hand's window); the outlines holding the frame's window | none: it follows the input |
| A fit's query first matches in the frame (drag, key, tap, edited size, Back) | its outline appears; its stamp un-hides at the page's foot; the count's number and plank change | the plank presses in (below); nothing else moves |
| A settle | the ring lands on the settled window; the live region speaks once (`words.md`) | none |
| A chart tap below 1024, or with the side not sticky | the plot holds its place by scrolling | none: a scroll, not a tween |
| Arrival, reload, restore | the window's fits and the visit's are shown | **none**: T8 holds `/trials/320x568` still at load |

**The press-in** (Atlas's question 3) runs in Full only. Full is the site's stored choice
(`theseus:motion`) or, with none stored, no `prefers-reduced-motion: reduce`, as Tb's `full()`
reads it.

```css
@keyframes trials-press {
  0%    { scale: 1.4; opacity: 0; }
  37.5% { opacity: 1; }
  100%  { scale: 1; opacity: 1; }
}
.trials-found-plank[data-pressed] {           /* set by the controller on a find, removed on animationend */
  transform-origin: 50% 50%;
  animation: trials-press 160ms cubic-bezier(0.2, 0, 0, 1) 1;
}
```

- It runs 160 ms, once, ending at rest, with `scale` and `opacity` only, so nothing reflows. The
  frame strip is `design/tc-stamp.webp`: scale 1.157 at 40 ms, 1.049 at 80, 1.010 at 120, 1 at 160.
- It's a stamp hitting paper, with no bounce, rotation or ink spread.
- Several fits found in one frame press once, showing the last one's sprint.
- Calm, Off and reduced motion show the new plank in place. No stamp, outline, ring or number
  animates anywhere else, and the list's planks never move: they're usually off-screen.

## 8. The sea, to the dimension's foot (my follow-up from sprint 64)

**The page.** A deep sink's freeboard dimension ran down past the 12 px sea into blank film:
114 px at 320 × 460 at 1440. The sea now runs to the dimension's foot plus 4 px, under the frame
only, as before:

```css
.trials-sea { height: max(12px, calc(var(--sunk) + 4px)); }
```

The drawing's box already reserves `max(14px, --sunk + 6px)` under the waterline, so the box
doesn't change. `Waterline` still sits right of the dimension's line, clear of the hatch
(`design/tc-sea.webp`, and `shots/p2c/390x664_trials_1280x460_deep2_trialsdrawing.png`).

**The frame shrinks so its sea fits the budget**, the card's own rule (`lib/trials-card-art.tsx`,
`layoutOf`: "a sinking window's dimension can reach further down, so the frame shrinks until that
fits too"). The third term of `--fw` divides by one plus the sea's share of the window:

```css
--fw: min(
  calc(100cqi - var(--gl) - var(--gr)),
  calc(var(--w) * var(--scale, 1) * 1px),
  calc(var(--frame-max) * var(--w) / var(--h) / (1 + var(--sea, 0)))
);
```

- `--sea` is `max(0, fa + fs − 1)`, the sunk depth over the window's height. The server writes it
  beside `--fa` and `--fs`, and the controller writes it at a settle only. Mid-drag it keeps the
  grab's value, as `--scale` does, so the corner stays under the hand.
- A deep sea may then grow the drawing for the moment (input-credited), and the release's re-fit
  settles it.
- What it costs: 320 × 460 draws at 0.80 of its budget height (114.2 / 460 = 0.248). The gap
  draws 1 % smaller (6.2 / 568), which lifts its waterline 3 px at 390 × 664 and helps T7.

**The card** (1200 × 630), the same two rules in `layoutOf` and `linesOf`:

- The sea's rect runs to `max(SEA, links − foot + 6)` under the frame. Today it is a fixed
  `SEA − 1.5`.
- The scale already includes the sink (`(ROW / 2 − 2) / (h / 2 + sunk)`), so the frame, its sea
  and the dimension stay in the row.

## 9. For the builders and Probe

- **Forge:**
  - the DOM order (section 1), with the answer before the side;
  - `.trials-side` and its two rules (sticky at 52.5rem, `--chart-block`);
  - the field rule;
  - `--sea` in `--fw`, and the sea's height;
  - the chart box and marks (section 4): the fixed plot height in place of the even
    `aspect-ratio`, and the hatch and dots in px space;
  - the count line's two forms;
  - the stamps' structure and its four `:has` rules;
  - the card's sea.
- **Pixel:**
  - the ring following the hand;
  - the outlines that hold the frame's window, by `matchMedia` change events, never polled;
  - the plank's text and `data-pressed`;
  - the chart tap's scroll hold (below 1024, or where the side isn't sticky);
  - `--sea` at settles only;
  - the settle message's found sentences.
- **Probe:**
  - the default frame at 1440 × 900 is now 704 × 440 at scale 0.489, not 792 × 495 at 0.55. I
    found no check with those numbers written in (grep for 0.55, 792, 495 and 696);
  - the sticky side is a new box, with the figure inside it;
  - the four soundings' targets hold their points and never overlap (gaps above);
  - the stamps' list is below the fold at load at the viewports above;
  - nothing presses on arrival.

**Needs decision (Atlas):**

1. The default frame at 1440 × 900 gives up 11 % (792 → 704 wide) so the frame and the whole chart
   share the first screen. I recommend it: the canvas's own 1440 artboard put the chart under a
   frame drawn at 0.58. The alternative is the chart's foot 45 px under the fold, with a sticky
   side that hides it until the page ends.
2. The stamps at the page's end, not under the answer. That is my answer to your question 1; the
   cost is that the full stamp is a scroll away while playing.

## 10. What I steered away from

- **The chart beside the readout in the right column.** It was the same DOM order on every layout,
  but a 396 px chart on a 1440 page, with 212 px of empty left column under the frame.
- **The chart above the answer on phones.** It was the instruments together, but T7's answer at
  390 × 844 fell to 921 to 1020.
- **The chart as the drag field itself,** the frame's corner on its own point of a chart drawn
  behind it. It was clever, but the scale changes at every settle, and a 270 px phone field can't
  show 320 to 1920.
- **A y axis that runs down,** so the ring would move the way the corner does. The band then hangs
  from the top. Sinking reads down, and the drawing's sea is underneath, so height runs up, as on
  the canvas.
- **A lattice of soundings, or pins all labelled.** Clutter at 288 px, and the lattice landed on
  the pins.
- **Diamonds for pins.** A diamond in the plot's stretched units can't hold its shape without a mark
  per pin in px, and a small empty square reads as a plank on this site. Dots and a ring are the
  chart's own fix symbols.
- **Dashed fit regions** (above), **region fills** (they muddy the hatch), and **sprint planks on the
  chart** (three 45s in the tablets' 40 px at 320).
- **The track** (contract call 5), a **tooltip** on the chart, and a **"you found one!" toast**: the
  plank pressing in beside the count says it.
- **A rotated or inky rubber stamp.** The site's grammar is drafting, and its stamp is a seated
  plank.
