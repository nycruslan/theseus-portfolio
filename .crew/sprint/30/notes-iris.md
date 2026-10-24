# Sprint 30, notes from Iris: the ghost hull's three calls (B5a)

The contract's three "Needs decision (Iris)" items, as numbers Forge can type. Measured on production
(`/` at 1440, 1024, 768 and 390, both schemes; `/sprints` at 1440 and 390) and in `app/globals.css`'s
tokens, with the approved frames `.crew/sprint/17/design/log-1440.webp` and `log-390.webp` sampled
for the vellum and the record box. Production today has **27** merged sprints (sprint 29 landed with
#76 after the contract was written), so the count line reads "…replaced 5 planks of its own." on
this sprint's preview; the data rules already cover it.

The sheet's facts I build on (production, 2026-10-24): the bar's inner box is 16 px in and 56 px
tall from 1024 (its rule at y = 72, the wordmark at x = 40), 52 px edge to edge below; the facts'
sections are 16 px in with 24 px of padding, so every text edge from 1024 is 40 px and the rules run
16 to 1424 at 1440; a lift of the wide drawing is 19.5 px deep at 1440, 13.7 at 1024, 10.6 at 768,
7.5 at 390; plank numbers are 13 px 600 ink from 1024, 11 px at 768, hidden below; `.rev` rows are
31.9 px at 768 and up, 88.6 px folded at 390; "Revisions" is `--step-xl` (30 px) and the facts' heads
`--step-2xl` (72 px) in the display face. `/sprints` is 11,570 px tall at 390 today.

## 1. The ghost hull

### 1.1 Which views: the profile alone, at every width

The ghost is the original ship, not a lines plan: only the profile carries planks, and the frame draws
the profile alone at 1440 and at 390. So the ghost pass draws **the hull's outline, the planks, the
led-out leader (5.0) and the plank numbers, and nothing else**: no stations, no waterlines, no DWL or
base line, no "Profile" caption, no half-breadth plan, no body plan. That keeps it a figure beside a
heading rather than the sheet's drawing repeated, keeps `[data-ghost]` far under 32,768 B (about 5 KB:
one outline, 22 plank paths, one leader, 22 spans) and keeps the first row inside 900 px at 1440.

A third layout in `lib/hull-layouts.ts`, the hull at unit scale with 4 units of margin for the
non-scaling strokes:

```
GHOST: { box: [0, 0, 632, 126], ox: 4, oy: 4, s: 1, hbY: 0, numbers: true }
```

`hbY` and `body` are unused by the ghost pass. The SVG is `width: 100%; height: auto` (the box's
aspect, 126/632, holds the space before paint: CLS 0). The lettering is the lines plan's (`.plan-plank`
spans in % of the box); 5.0 is led out exactly as on `/` and its number lands inside the box at
x ≈ 119, under the counter.

What that gives at each width (the hull is 624 × 118 units; a lift is 15 units):

| Width | Drawing box (px) | Hull (px) | Lift (px) | Numbers |
|---|---|---|---|---|
| 320 | 288 × 57 | 284 × 54 | 6.8 | hidden |
| 390 | 358 × 71 | 353 × 67 | 8.5 | hidden |
| 640 | 608 × 121 | 600 × 114 | 14.4 | hidden (below 768, as `/`) |
| 768 | 736 × 147 | 727 × 137 | 17.5 | 11 px (`--step-xs`) |
| 1024 | 568 × 113 | 561 × 106 | 13.5 | 11 px |
| 1280 | 740 × 148 | 731 × 138 | 17.6 | 13 px (`--step-sm`) |
| 1440 | 900 × 179 | 889 × 168 | 21.4 | 13 px |
| 1920 | 1380 × 275 | 1363 × 258 | 32.8 | 13 px |

Numbers: `--step-xs` (11 px) from 768 to 1279, `--step-sm` (13 px) from 1280; 600 ink; hidden below
768 with the leader (`[data-ghost] .plan-plank, [data-ghost] .ln-leader { display: none }` under
48rem, as `.plan-page` does). The contract's 10 px floor holds everywhere they show. The drawing is
`aria-hidden`, `pointer-events: none`, never focusable, as `[data-plan]`.

### 1.2 Where it sits: the frame's two columns from 1024, stacked below

`main` on `/log` is the sheet's inset box: `margin: 0 16px` from 1024, `padding: 0 16px` below. From
1024 it is a two-column grid, the right column the frame's header-and-record column:

```
@media (width >= 64rem)  main.log { margin: 0 16px; display: grid;
                                    grid-template-columns: minmax(0, 1fr) 360px; column-gap: 40px; }
@media (width >= 80rem)  main.log { grid-template-columns: minmax(0, 1fr) 444px; }
```

At 1440 the right column is 980 to 1424 (the frame's record box is 983 to 1423) and the left column
16 to 940. Row 1 (the Log's header):

- `[data-ghost]`: `grid-column: 1; grid-row: 1; align-self: center; margin: 32px 0 0 24px` → the
  drawing is 40 to 940 wide at 1440 (900 px) and centred on the header column's height, as the frame
  floats the hull beside the text. The hull's transom stands on the 40 px text edge.
- The header text (`h1`, caption, count line): `grid-column: 2; grid-row: 1; padding: 32px 24px 0`
  → its text edge is 1004 at 1440, the same edge the record box's text has below it (one seam, not
  the frame's two). A wrapper `div` around the three is fine if Probe's selectors allow it; otherwise
  place the three elements in the cell by `grid-area` each. The `h1` top lands at y = 104 (bar 72 +
  32); the frame's is 118.
- Row 1's height is the text's (about 211 px at 1440: h1 68, caption 2 lines, count 3 lines in 396 px);
  the drawing, 179 px tall, centres in it.

Row 2 (the table and the record) is in section 2. Between the rows, 40 px.

Below 1024, one column in this visual order: `h1`, the drawing, the caption, the count line, the
record (on `/log/<n>`), Every revision. The drawing sits **after the count line in the DOM** (it is
`aria-hidden`; the contract's `main` order, h1 then caption then count, holds) and is placed by CSS
(`order` or grid rows). Numbers at 390: `h1` margin-top 20 (52 px, line 0.95); drawing margin-top 16
(358 × 71); caption margin-top 14; count margin-top 8; both `max-width: 66ch`. The first row of Every
revision then starts at about 536 px, under the frame's 545 and B5.3's 844.

### 1.3 Lines and fills: a ghost is drawn lighter than the sheet

The frame's ghost edges sample at `--rule` and its outline at a mid grey, not ink. So:

| Part | Stroke | Colour |
|---|---|---|
| Hull outline (`ln-outline`) | 1.4 px, round joins | `--muted` (graphite) |
| Plank edge (`.plank-ghost`) | 0.75 px | `--pencil` |
| Leader (`ln-leader`) | 0.75 px | `--muted` |
| Plank fill | — | `--vellum` |
| Number | — | `--foreground`, 600 |

All strokes `vector-effect: non-scaling-stroke`, as `.plan path`. The numbers are the only ink in the
drawing, so the record (the numbers) reads first and the hull second: it is a ghost.

### 1.4 `--vellum`

A new token on `:root` in both schemes, hex so computed styles compare, and in the print block:

```
:root               --vellum: #d7e2e1;   /* #cfdcdc at 0.7 over the film; the frame's planks sample #d6e2e0 */
dark                --vellum: #3f4d52;   /* the night sheet lit: between the old card and the seated card */
print               --vellum: #d7e2e1;
```

Light: ink on vellum 13.1:1; vellum against the film 1.16, `--card-old` 1.01 (one step apart; the
ghost planks are the originals, so near their colour is right, and the two never share a page),
`--card` 1.27. Dark: ink on vellum 7.2:1 (B5.4's 4.5 holds with room); against the film 2.0, `--card-old`
1.6, `--card` 1.44, `--rule` 1.28 (`#3a474c`, the nearer candidate, sat at 1.16 from the night
hairline, so not that). "The same way" (`#cfdcdc` at 0.7 over the night film) gives `#96a2a2`, 2.15:1
under the light ink: a translucent sheet reads darker on a dark ground, not lighter, hence the value
above. Edges: pencil on vellum 2.5:1 light, 1.8 dark; they are seams, not text, and the outline in
graphite carries the shape (5.1 light, 3.8 dark on vellum).

### 1.5 `data-current`

On `/log/<n>`, the ghost plank at n's seat: **an ink edge and a bolder number, no fill change**
(B5.4 reads every ghost plank's fill as `--vellum`, so the fill stays):

```
[data-ghost] path[data-current] { stroke: var(--foreground); stroke-width: 1.4px; }
```

and its number 700 (give the span `data-current` too, or a class). Forge draws that plank **last** in
the clip group so its ink edge isn't half covered by the neighbours' fills and pencil seams; the planks'
order in the HTML is otherwise free. No copper, no hatch (hatch means pencil, in progress, on `/`).

### 1.6 Forced colours and print

As `.plan`: `[data-ghost] { forced-color-adjust: none }`, every path `stroke: CanvasText`,
`.plank-ghost { fill: Canvas; stroke-width: 1px }` (0.75 is too faint for a high-contrast user; the
edge must show), `[data-current] { stroke-width: 2.5px }`, the spans `CanvasText`. Print: the same
drawing with the light tokens (the print block already resets them; add `--vellum`).

## 2. The record's place, its box, and the table

### 2.1 From 1024: beside the table, in the right column

Row 2 of the same grid. The record (first in the DOM after the header) goes to the right column; Every
revision to the left; both start at the same y and the box is content-sized, as the frame draws it
ending at 1100 while the table runs on:

```
section[aria-labelledby="record"]         { grid-column: 2; grid-row: 2; align-self: start; margin-top: 40px; }
section[aria-labelledby="every-revision"] { grid-column: 1; grid-row: 2; margin-top: 40px;
                                            padding: 18px 0 40px 24px; border-top: 2px solid var(--foreground); }
```

On `/log` (no record) Every revision spans both columns (`grid-column: 1 / -1; padding-right: 24px`),
so its 2 px rule runs 16 to 1424 like the facts' and the table 40 to 1400. On a record the rule runs
16 to 940 and the table is 900 px wide (the frame's 40 to 940); at 1024, 568 px, where the longest goal
wraps to two lines (it is whole, never cut). Each page is its own document, so nothing moves on either.

The first-screen check at 1440 × 900: the rule at 355, "Every revision" 375, the lede 421, the key 450,
the head row 489, the **first row at 512** with eleven more rows showing. On `/log/13`: the box's top
at 355, "Rev 13" at 376, the **`h2` at 408**.

### 2.2 Below 1024: after the Log's header, before Every revision

The record follows the count line (after the drawing, so the frame's header stays one unit and the
record sits next to the table it belongs to), full width, `margin-top: 24px`; Every revision follows
with `margin-top: 24px` and its 2 px rule edge to edge (`margin: 24px -16px 0; padding: 14px 16px 32px`),
as the facts' rules are on phones. At 390 on `/log/13`: the box's top at 395, "Rev 13" on a 44 px row
from 412, the **`h2` at about 460**, inside 844.

### 2.3 The box

The frame draws it on the white card with a 1 px ink rule. On the night sheet `--card` (#58646a) fails
for graphite text (2.6:1), so the box is **film ground, 1 px ink border, in both schemes**; the rule
alone says "open":

```
.record { border: 1px solid var(--foreground); padding: 16px; }
@media (width >= 64rem) { .record { padding: 20px 24px 24px; } }
```

Inside, in DOM order:

1. **Top row**: `display: flex; justify-content: space-between; align-items: center`. Left, `p` "Rev
   13", `--step-sm` 700 tabular. Right, **Close as a plain link**: "Close" visible, " revision 13"
   visually hidden (the name "Close revision 13"), `--step-sm` 600 ink, underlined 1 px at 3 px
   offset, 2 px on hover; `inline-flex; align-items: center; min-height: 44px` below 1024, 24 px from it.
   The row is 44 px tall on phones and 24 from 1024.
2. **`h2`** (the goal): margin-top 4 (8 from 1024), display face (`--step-entry`, 36 px at 1440, 30 at
   390), 700, line 1.05, `text-wrap: balance`.
3. **`dl`**: margin-top 14; `display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 6px 12px`;
   `dt` `--step-base` graphite 400, `dd` `--step-base` ink, line 1.45. "Pull request" measures 78 px
   at 16 px, so 88 holds it; at 320 the `dd` is 146 px and "Pull request #39" (111 px) stays on one
   line (C8.2). The PR link: ink, underlined, `inline-flex; min-height: 24px`.
4. **`h3`** "What went wrong, in the crew's words": margin-top 18, padding-top 14, border-top 1 px
   `--rule`, `--step-base` 700, line 1.3. **`ul`**: margin-top 8, gap 8, `--step-base` line 1.5, each
   `li` with the drawn dot `/sprints` has today (3 × 3 graphite, `CanvasText` in forced colours; C9.5).
5. **Foot**: margin-top 20, padding-top 12, border-top 1 px `--rule`, `display: flex;
   justify-content: space-between`: "Rev 12" at the left, "Rev 14" at the right (`margin-left: auto`
   when it is alone, as on sprint 1), `--step-base` 600 ink underlined, 44 px targets below 1024 and 24
   from it. Plain links, no arrows, no boxes: left is earlier, right is later.

Nothing in the box sticks, floats or transitions.

### 2.4 The table: the same fold as `/`, taller rows for touch, a boxed current row

**Fold the Log's rows as `/`'s `.rev` does**, not as `log-390.webp` draws them: `/` folds below 640
(not 1024: the `.rev` rules fold at `width < 40rem`, and six columns fit from there), each row the
number beside the whole goal with the four signatures under it, each under its head, 88.6 px at 390.
The frame's muted line ("Forge. Lens, Probe. Gate") drops the heads, and "Gate" without "Approved"
above it is a cipher on a phone; `/`'s fold explains itself and one fold means `/` and `/log` show the
same row. 27 rows × 89 ≈ 2,400 px at 390, the plan's budget. No foot link, no chevron: the number is
the link.

- **Rev link** (`th[scope=row] > a`): 700 ink, underlined 1 px at 3 px offset (every link outside the
  bar is), tabular. Below 640 (folded): `display: flex; min-width: 36px; min-height: 44px` (the `th`
  already spans two grid rows). From 640 to 1023: the cells' vertical padding goes 7 → 13 px so each
  row is 44 px and the link's box is the row (`display: block; margin-block: -13px; padding-block:
  13px`), no overlapping targets. From 1024: `/`'s 31.9 px rows, the link `inline-block; min-width:
  24px; margin-block: -4px; padding-block: 4px` (a 25 px target in the row).
- **Heads and cells**: `.rev`'s (13 px, head 13/600 graphite with a 1 px ink rule, cells 7 10 7 0 with
  `--rule` hairlines), column widths Rev 34, Drawn 80, Checked 58, Tested 52, Approved 64, Description
  the rest, **wrapping** (no `max-width: 0`, no ellipsis, no `nowrap`). B5b's Merged takes 54.
- **The current row** (`tr:has(a[aria-current="page"])`): a 1 px ink box as the frame draws it, no
  fill (the frame's white card fails on the night sheet): from 640, its cells get `box-shadow: inset
  0 1px 0 var(--foreground), inset 0 -1px 0 var(--foreground)` with the first cell `inset 1px 0 0` and
  the last `inset -1px 0 0` added, so no row height changes; below 640 the `tr` is a grid box, so
  `outline: 1px solid var(--foreground); outline-offset: -1px`. The link keeps its underline.
- No sticky head; 27 rows is one scroll and the cells say Lens, Probe, Gate by themselves.

## 3. The words and the heads

### 3.1 The lede's first sentence: keep the contract's

"A crew of AI agents rebuilds this site one sprint at a time." stays. It is the share card's own line,
it tells the visitor who landed from a link what they are looking at, and every alternative I tried
either repeated the heads or needed "merged", which C4.4 forbids in any case. So the `p` reads exactly:
"A crew of AI agents rebuilds this site one sprint at a time. 27 revisions, newest first: choose one
to open its record." Set it **under** the `h2`, not beside it as the frame's shorter line sits: at
13 px it is 664 px wide, one line in either table column from 1024, two lines at 390. `--step-sm`,
graphite, line 1.5, margin-top 8.

### 3.2 Approved gets a key: yes, one line, a second `p`

The column is the governance a board asks about, and "Gate" alone doesn't say what the gate is. A
**second `p` right after the lede** (so the lede's `p` stays exactly the data rules' for B5.5):

> Under Approved, Gate is CI, the owner's rules and Lens's review; Owner is the owner's own decision.

98 characters, 646 px at 13 px: one line from 1024, two at 390. Plain text, no link, none of C4.4's
words. Same style as the lede, margin-top 4; the table follows at margin-top 14. On the record the
`dd` stays "Owner" or "Gate" exactly, as the contract says; the key beside the table serves both.

### 3.3 The heads, against `/`'s steps

| Head | Face | Step | Line | Notes |
|---|---|---|---|---|
| `h1` "Log" | Sofia Sans Extra Condensed 700 | `--step-2xl` (72 / 52) | 0.95 | `letter-spacing: -0.01em`, as the name. The frame's "Log" caps measure 50 px at 1440 and 47 at 390: this step. |
| `h2` "Every revision" | display 700 | `--step-entry` (36 / 30) | 1.05 | The frame's caps are 25 px at 1440: this step, not `/`'s "Revisions" at `--step-xl`. "Every revision" is 221 px wide at 36. |
| `h2` the record's goal | display 700 | `--step-entry` | 1.05 | `text-wrap: balance`; sprint 4's 139-character goal runs to five lines at 1440 and that is the one outlier. |
| `h3` "What went wrong…" | text 700 | `--step-base` | 1.3 | |

The display face on `/log` is therefore the `h1` and the two `h2`s only; everything else is the text
face, so `/log` loads the sheet's two woff2 files and no more (B5.10). `.read h1`'s rule is the model
for the `h1`.

### 3.4 The caption, the count line, the bar

- Caption `p[data-ghost-caption]`: `--step-base`, ink 400, line 1.45. Count `p[data-ghost-count]`:
  `--step-base`, graphite, line 1.45, margin-top 8. The frame's hierarchy: the caption explains the
  picture, the count is the note under it; B5b's lines figure slots under both without a change.
- The bar: `/`'s component minus the control, nothing else changed (`lg:mt-4`, `lg:mx-4`, 56 px from
  1024, 52 below). The wordmark becomes `a[href="/"]`, looking exactly as the `p` does (display 700
  `--step-xl`, no underline, as the bar's links), underline 2 px at 6 px offset on hover like the nav
  links, `flex; align-items: center; min-height: 44px` below 1024 (its 30 px text box is the target
  from 1024). Nothing on `/` is current today, so the look is new: Log with `aria-current` wears the
  frame's rule under the word, which is the nav's hover underline held at rest (`text-decoration:
  underline 2px; text-underline-offset: 6px`), at 1440 and 390 alike, for `"page"` and `"true"`
  both. "Read as page" ends the row at 1400 with no empty slot, since the Log's bar omits the control
  rather than hiding it.

## 4. Departures from the approved frames that these calls add

For the PR paragraph, beside the contract's own (no lines figure or Merged column, 2D, the caption
reworded, no foot link): the ghost without stations, waterlines or captions (the frame has none
either, but `/`'s drawing does); the lede under the heading rather than on its row; Close and the Rev
links as plain underlined words, not boxed buttons; the record box and the current row on the film
with an ink rule, not on the white card; the numbers hidden below 768.

## 5. What I'll look at early

The hull's transom on the 40 px edge and the drawing centred on the header column at 1440; the
numbers at 1024 (13.5 px lifts, 11 px type) and 768; the night ghost against the night table; the
record box at 320 (the `dd` at 146 px, the PR link on one line); the current row's box in forced
colours; the first row at 1440 × 900 and 390 × 844 with and without a record; Back from a record
landing on its row.
