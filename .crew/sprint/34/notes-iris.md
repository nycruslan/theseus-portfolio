# Sprint 34 (B4b): Iris's calls on the fold, the rest line, the pencil and the copper

Iris, 2026-10-31, for Quill's contract and Forge's and Pixel's build. Measured on production
(https://theseus-portfolio.vercel.app, main at `0c033a8`), fonts warm, by injecting the markup
below into the live page with Playwright (scripts and screenshots in my scratchpad, not git).
Production today: 32 merged sprints, every one of the 22 planks seated ("22 planks: 22 replaced,
0 original"), so sprint 34's pencil plank is `ORDER[32 mod 22]` = **4.0**, a seat sprint 11
holds today: the pencil plank is a plank being replaced a second time.

## 1. The fold at 1440 × 900: no trade. The rest line goes above the table, five rows stand

**The call.** At rest the rest line is the revision block's first line under the heading and
caption, before the table, as `rest-1440.webp` places it; the block keeps five rows in every
state; nothing goes in the footer row. B1.5 stands as written, and B1.1 holds in the rest fixture
at 1440 × 900 with no rewrite.

**Why it costs nothing at 1440 × 900.** The plan's premise ("the rest line does cost height") misses
sprint 25's `.sheet-row` minimum height: from 1024 px the bottom row is held at
`min(21rem, 100svh − 88px − (100vw − 34px) × 0.3381)`, 336 px at 1440 × 900, and the revision block's
own content is 295 px of it. The table ends at 791 and the foot (count, legend, Log link) is pushed
to 842 by `mt-auto`: **41 px of slack**. The rest line is one 13 px line (19.5 px) plus the block's
10 px gap: 29.5 px, inside the slack.

Measured, production with the rest line injected above the table:

| Viewport | Contact links' bottom, before → after | Fifth row's bottom, after | Row height |
|---|---|---|---|
| **1440 × 900** | **866.3 → 866.3** (33.7 px above the fold) | **820.2** | 336 → 336 |
| 1920 × 1080 | 1028.6 → 1028.6 | 982.4 | 336 → 336 |
| 1024 × 768 | 728.6 → 758.1 (9.9 px inside) | 700.1 | 339 → 368.5 |
| 1280 × 800 | 776.9 → 799.6 (0.4 px inside) | 765.1 | 300.7 → 323.3 |
| 1366 × 768, 1440 × 800, 1536 × 864 | already below the fold today (809.8, 838.5, 871.0); +16 to +19 px | inside | content-tall |

Where the block is content-tall (shorter windows, and 1024) the row grows by the line; where the
viewport sets the row (1440 × 900 and taller) nothing moves. The windows already failing are
production's, not this sprint's: the drawing is 475 to 508 px tall there.

**Why not trade a row.** Trading one row at rest would buy 2.4 px everywhere, and the rest state is
the one most visitors see: they'd lose a fifth of the record to gain margin only at window sizes
the contract doesn't name. The row is the sheet's evidence; the line is one fact. Keep both.

**Below 768.** The same place, in the DOM and on screen: the revision block's first line after the
caption, before the folded rows. At 390 × 844 it sits at 750 to 770 px, inside the first viewport
(the title block's links don't move: they're above it). At 320 it wraps to two lines, which is
fine with the nowrap spans in call 2.

**Its look.** `p[data-rest]` at `--step-sm` (13 px, the table's size), line-height 1.5, ink; "Crew
resting." at weight 600, the rest at 400. No rule, no box, no icon, nothing copper (resting is not
live). Not a link: the line's action is B4e's Replay, and the bar's Crew is one glance up.

**Riders for later sprints.** B4e's Replay beside this line must stay a 24 px target on the same
line (a 32 px button, as the frame draws it, takes the last 11.6 px of slack and 1 px more).

## 2. The rest line's copy: state the merge, word for word as `/crew` does

**The call.** B4a's wording, not the plan's "Last plank seated": the feed's `last` is the newest
merge, and the newest seat on the drawing is the highest-numbered retro; the two can name different
sprints (#75, sprint 28, merged after #76, sprint 29), and a preview behind main has no seat for
`last` at all. "Merged" is true in every one of those cases; "seated" isn't. One fact, one
sentence on both pages: `/`'s rest line is `/crew`'s `[data-status]` text exactly.

Exact copy (B4a's contract, "The status line", `resting`):
- "Crew resting. Sprint {last.sprint} merged {d Mon}, {HH:MM} UTC." — today "Crew resting. Sprint
  33 merged 31 Oct, 01:50 UTC."
- `mergedAt` null or unparseable: "Crew resting. Sprint {last.sprint} merged."
- `last.sprint` null: "Crew resting."

`{d Mon}` and `{HH:MM}` as `/crew` formats them (UTC, no leading zero on the day, 24-hour, zero
padded). Two `white-space: nowrap` spans keep the pairs whole when the line wraps at 320:
"Sprint {n}" and "{d Mon}, {HH:MM} UTC" (spans, not NBSPs, so the textContent keeps real spaces).
The `time` element is welcome on the date and time (`datetime` = `mergedAt` as `toISOString()`),
if Forge wants it; the visible text is the same.

## 3. The pencil and the copper in 2D: the plank, the row, the legend

Prototyped by injection on production (plank 4.0 as 34, Off) at 1440, 1024, 768, 390 and 320, light,
dark and forced colours; then read against Forge's build (`9c6dfee`). Tokens only: film
`--background`, graphite `--muted`, pencil `--pencil`, card `--card`, copper `--accent`. Copper is
the tip, "drawing now" with its dot, and the copper swatch, in `live` only.

**`PENCIL` (`lib/hull-layouts.ts`), my numbers:**

```ts
hatch: { period: 6, width: 1.4 },   // viewBox units: 6 px across the lines at 1440 (wide) and 390 (narrow)
dash: [4, 3],                       // CSS px, a line weight
tip: { from: 1 / 2, to: 7 / 8, inset: 0, width: 2, dot: 8 },  // width and dot are CSS px line weights
```

3.1 **The hatch.** 45°, rising to the bow ("/", Forge's `rotate(45)` of vertical lines is right),
one 1.4-unit line every 6 units across, tiled from the viewBox origin, on the film (`--background`,
Forge's `.hatch-ground`), lines `--pencil`. It scales with the drawing, as a fill does: 6 px at
1440, 4.2 at 1024, 3.3 at 768; 6 px at 390, 4.9 at 320. Measured: 6.4/1.5 at 1440 and 5/1.2 at 390
read as hatching, not as a grey tone; Forge's 5/1.1 is a little fine at 768 (2.7 px). Same angle
and duty (23 to 25%) as `/crew`'s chip and the legend swatch, which keep their 1 px in 4: a swatch
is a symbol, not a sample at the drawing's scale.

3.2 **The edge: graphite, not pencil, and erased under the dash.** Stroke `--muted`, 1 px, dash
`4 3`, non-scaling, on the `path[data-plank][data-pencil]` itself, painted last (as Forge has).
Graphite because the plan and the direction say graphite (`--muted` is the graphite token; `--pencil`
is construction) and because it carries "in progress" at 5.9:1 light, 7.8:1 dark, where `--pencil`
on the film is 2.9:1 (under 1.4.11's 3:1). **Forge's (c), the shared seams:** draw one more path
just before the pencil plank, the same `d`, `fill: none`, stroke `--card` at 2.4 px, non-scaling (no
`data-plank`). It covers the neighbours' 0.9 px ink seams under the dash, so the gaps show nothing
(every neighbour is a seated card now: all 22 seats have been replaced once). Hide it with the hollow
rule (with the fills): left on the hollow drawing in the dark scheme it draws a grey ring. Forced
colours: erase `Canvas`, edge `CanvasText`, dash kept. Quill: B4.15's "stroke resolves to
`--pencil`" becomes `--muted`.

3.3 **The number** (wide drawing, from 768; the narrow numbers nothing, as today): n in graphite
(`--muted`) at the plank numbers' weight 600 (not 700), on a film chip: `background:
var(--background); padding: 0 2px` (the digits' own line box, no taller, so it covers as little of
the tip as it can). Graphite where it crosses the hatch's pencil lines is 2.0:1, so the chip keeps the
hatch off the digits (5.9:1 light, 7.8:1 dark), as a draughtsman breaks the hatching round a figure. The chip rides with the number on
the hull (call 4). Forced colours: `Canvas` chip, `CanvasText` digits. A led-out seat (5.0) needs no
chip: its number is outside the hull.

3.4 **The copper tip.** On the plank's visible lower edge (`bandAt`'s bottom: the seam, or the keel's
outline on lift 6), **inset 0**: the pen is on the line, as both frames draw it, not beside it. A
2 px run, round caps, from 1/2 to 7/8 of the plank's body stretch: it leaves from under the number
and ends to the bow, the pen's stroke so far; then an **8 px dot** at its forward end (8 px, the same
dot as "drawing now"'s and `/crew`'s Working). Both are line weights and hold at every width, as the
pen's do: draw the dot as a zero-length subpath (`M x y h0`) with a round cap at 8 px, non-scaling,
not a `circle` in viewBox units (which shrinks to 4.4 px at 768 and wouldn't meet the hull's 8 px at
frame 1). **Why 7/8, not the frame's middle third:** on Forge's build the fixtures' seat is 3.0, a
stern plank the outline cuts to a body of about 32 px at 1440; there a tip from 1/3 to 2/3 is a 13 px
dash under the number, which the number's chip covers. At 7/8 the dot's centre is 12 px bow-ward of
the number's on 3.0 (it touches the tight chip's corner, the shortest case) and 54 px on 4.0, this
sprint's real seat. Below 1024 a short seat's chip can still cover the dot's upper half: accepted,
the run and the dot's lower half show, and the row says "drawing now". Draw `[data-tip]` after the outline, outside the hull's clip, so it lies on
every line and the keel lift's dot isn't halved. Hidden by the hollow rule (Forge has it); under
reduced motion give it the numbers' 240 ms opacity and visibility transition, so it crossfades with
the hull's tip instead of blinking off first. Forced colours: `Highlight`, stroke and cap (the one
mark on the drawing that isn't text-coloured, as copper is the one that isn't ink).

3.5 **The pencil row** (Forge's structure stands):
- **Rev:** Forge's `.rev-chip` (hatch 135°, 1 px in 4, the digits ink 700 over it, the row kept at
  31.9 px at 1440) with its edge **`1px dashed var(--muted)` in every mode**, not solid pencil: one
  pencil mark across the site (plank edge, swatch, chip). `/crew`'s `.crew-chip-number` in live and
  open takes the same edge. Forced colours: the system drops the hatch, the dashed edge stays.
- **Description:** as built: the goal, the one link to `/crew`, ink with the site's underline; in
  `live`, `[data-drawing]` 8 px after it: copper, weight 600, nowrap, never cut. Its dot **8 px with a
  4 px border, as `/crew`'s Working dot**, not 7 with 3.5: on Forge's build the half-pixel border
  rasterises as a ring with a pale centre in both schemes
  (the goal takes the ellipsis from 1024; below, it follows the goal inline and wraps as a unit).
  "In progress" when the goal is null.
- **Drawn, Checked, Tested, Approved in graphite** (`--muted`): pencil entries, inked when the sprint
  merges. The Rev number and the goal stay ink, "drawing now" copper.
- **Approved: "Waiting for owner"** (the frame's words: terse, a cell's value like "Owner" and
  "Gate"; "Waiting on the owner" stays `/crew`'s status sentence) in `open` with health `waiting`;
  "—" in `live` (nothing is asked yet) and in any other `open`. **`white-space: nowrap` on that cell
  from 640 px:** the row stays one line (Forge measured 48.8 px with the wrap); the column widens by
  about 40 px and the description takes it in its ellipsis. Below 640 it wraps inside its folded cell
  (the row 105.5 px at 390, +17; the 320 two-up grid holds it on one line).

3.6 **The legend's two items, words and swatches:**
- `[data-key="pencil"]` **"In progress"**: Forge's swatch (28 × 12, hatch 135° 1 px in 4 on the film,
  1 px dashed graphite edge). Forced: `CanvasText` hatch on `Canvas`, dashed `CanvasText` (as built).
- `[data-key="copper"]` **"Drawing now"**, the row's words, so copper says one thing on `/`: the
  swatch is **the tip itself**, a 2 px copper run from the slot's left to an 8 px copper dot at its
  right end, no frame, no fill, in the 28 × 12 slot (e.g. `::before` a 2 px top border from 2 px to
  6 px short of the right, `::after` the 8 px dot, a 4 px border, so forced colours keep it). A
  filled copper box keys a copper fill the drawing doesn't have. Forced: `Highlight`, with
  `forced-color-adjust: none`. Quill: B4.19's "fills `--accent`" becomes "paints `--accent`".
- **The fit (Forge's (b)):** with these words, live at 1440 × 900 sets the count and all four items
  on the foot's first line and wraps only the Log link under them at the left, as it already does at
  1024 in every state; the foot is 48 px, the contact links stay at 866.3. Open fits on one line with
  the Log link at the right. Live at 1024 × 768: three lines, the links at 752.3 (15.7 px inside).
  No reordering: the DOM's order (count, legend, link) stays the reading order.

## 4. The pencil and the copper on the hull (Pixel)

Measured on production's hull at rest, Calm, with plank 4.0's slot flagged (I intercepted the
`uStates` upload and set slot 14's alpha to 0.5, ground the film), 1440 and 390, both schemes: **4.0
sits at the stern under the turn of the bilge, and the settled turn foreshortens it to a sliver
(about 80 × 8 px at 1440, 3 px deep at 390); there the hatch reads as a grey tone, not as hatching.**
The seat is the shipwright's order and stays. So on the hull the pencil is carried by its number and,
while live, its tip; the hatch is the material, and reads on the seats the turn shows whole.

4.1 **Hatch:** the stage's existing slot (alpha below 1), its rgb the film token (as the 2D's ground),
its strokes `--pencil`, with `PENCIL.hatch` in hull units per layout (period and width ÷ the layout's
`s`: wide 4.6 and 1.08 across the lines, narrow 12 and 2.8) and its phase from the drawing's origin,
so at `uLit` 0 frame 1 is the 2D's hatch exactly. Today's fixed `7.0` along x + y becomes those
uniforms. In the dark scheme the film ground lit under `DARK_GAIN` reads as a dark plank with lighter
strokes (measured), as the 2D's dark plank does.

4.2 **Edge:** graphite on the pencil plank's seams and butts, as per-segment colours in the seams'
existing batch (no draw), **solid**: a 4/3 px dash doesn't hold under the turn's foreshortening. At
frame 1 the hull's solid graphite lies on the 2D's dashed graphite; the gaps filling is the only
change.

4.3 **Copper tip, live only:** the 2D's run and dot in the same CSS px: a 2 px run along the plank's
lower edge from 1/2 to 7/8 of its body, an 8 px round dot at its forward end, **unlit, exactly
`--accent`** in both schemes (fat lines, as the seams are: the dot a zero-length segment with round
caps at 8 px, so it stays round and 8 px on a sliver), depth-tested with the seams' offset so it
never shows through the hull. Up to two draws (S3: 5 settled, so 7 of 8). At frame 1 it lies on the
2D's tip exactly. Quill: B4.21 needs (a) the band around the plank ≥ 5 px, since the dot sits 4 px
past the seam by design, and (b) triangles "at most the default's plus the tip's segments, within
30k / 12k", not "equal".

4.4 **Number:** from 768, Forge's `.plan-pencil` with its film chip, on `--ghost-x` / `--ghost-y` set
by the chunk from the plank's body middle (the 2D number's anchor) projected, every frame of the loft
and at rest, as `/log`'s numbers ride. Centred on the plank even where the plank is a sliver (the chip
may overlap its neighbours: it is the hull's only label, so nothing clashes; no leader). Below 768,
none, in 2D or 3D: the pencil row carries the number, inside the first viewport at 390 × 844 (it
starts at 750 px).

4.5 **The modes.** Full: the loft as today; the label rides; the hull's tip from frame 1 while the
2D's hides with the hollow rule. Calm: opens settled with the hatch, edge, tip and label at rest.
Reduced motion: as Calm with the 240 ms fade, the 2D tip fading with the numbers as the canvas fades
in, the label cutting to its place. Off: never loads WebGL; the 2D plank, its number from 768 and its
tip. Nothing moves at rest, nothing pulses, 0 frames at rest. Forced colours hide the layer (as today),
so the 2D's forced look is the one shown.

4.6 **If the budget forces a cut,** keep in this order: the tip's dot, the number, the hatch (free),
the graphite edge (free), the tip's run.

## 5. Checked on Forge's build (`9c6dfee`), from the fixture harness

`e2e/crew-feed.ts`'s `startFeed` and `startSite`, one site per fixture (the harness picks its own free
ports), Off, fonts warm. The fixtures' sprint is 31, so the seat is 3.0. With Forge's build as it is,
then with calls 3.2, 3.3 (graphite 600 and the chip), 3.5 (the dashed `--muted` chip edge, graphite
signatures, Approved nowrap) and 3.6 (the words and the copper swatch) injected as CSS:

| 1440 × 900 | Contact links' bottom | Pencil row | Foot (top, height) |
|---|---|---|---|
| live, as built | 872.2 | 31.9 | 801.2, 71 (three lines) |
| live, with the calls | **866.3** | 31.9 | 818.8, 47.5 (two lines) |
| open, as built | 866.3 | 48.8 (Approved wraps) | 818.8, 47.5 |
| open, with the calls | **866.3** | **31.9** | 842.3, 24 (one line) |
| resting, as built | 866.3 | (rest line 607.8 to 627.3; fifth row ends 820.2) | 842.3, 24 |

At 1024 × 768 with the calls: links 752.2 in live and open. At 390 × 844: the pencil row starts at
757, the rest line at 750.3 to 769.8, both inside the first viewport. Forced colours: the Rev box
loses its hatch and keeps its dashed edge, "drawing now" and its dot are `CanvasText`, the copper
swatch `Highlight`. Not yet seen: the tip with call 3.4's geometry and the erase path (both
need Forge's code), and Pixel's hull.
