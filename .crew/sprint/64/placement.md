# Sprint 64 placement (Iris): the corner, the drag, Copy link and the card

Where Tb's parts sit and how they behave. The words are `words.md`. Ta's placement
(`.crew/sprint/63/placement.md`) and its review's two changes (`--gr: 68px` below 1024, `text-wrap:
pretty`) all stand. **Without script nothing here shows**: every rule below is either
`@media (scripting: enabled)` or set by the controller, so the scripts-off page is Ta's exactly.

**How I measured.** I used production's Ta page (`theseus-portfolio.vercel.app/trials`, scripts off) in
CI's Chromium 156 headless shell, with this file's CSS and markup injected. For the mid-drag mocks I
resized the real frame's document to the hand's window at the grab's scale and measured the links
by Ta's rule. Numbers are CSS px from the viewport's top left. The scripts and shots are in
`/tmp/claude-0/-home-user-theseus-portfolio/1a14bee8-0077-580e-8871-d73ed69f954d/scratchpad/iris/`:
`proto.mjs` took `shots/` (the first try, a square grip) and `proto2.mjs` took `shots2/` (the
bracket and the mid-drag mocks).

## 1. The corner: a crop bracket inside the frame's corner

The window crops his page, so the corner is drawn as a crop handle: an ink L inside the frame's
bottom-right corner. Its outer edges lie on the frame's edges. It never covers anything outside the
frame.

I tried a CAD grip first, a filled square centred on the corner. At 320 × 568 it sat on the 6.2 px
freeboard dimension, the one mark the page exists to show (`shots/…320x568-corner.png` against
`shots2/…320x568-corner.png`). The bracket leaves the dimension, its ticks and its label wholly
clear at every window.

```css
.trials-corner {                      /* a <button>, the drawing's last child, so it paints on top */
  position: absolute; z-index: 1;
  left: calc(var(--gl) + var(--fw) - 22px);   /* the 44 px box centred on the corner */
  top: calc(var(--gt) + var(--fh) - 22px);
  width: 44px; height: 44px; padding: 0;
  border: 0; background: transparent;
  touch-action: none;                         /* here only: the page still scrolls by touch elsewhere */
  cursor: nwse-resize;
}
.trials-corner > span {               /* the bracket, aria-hidden */
  position: absolute; right: 22px; bottom: 22px; box-sizing: border-box;
  width: 20px; height: 20px;
  border-right: 3px solid var(--foreground);
  border-bottom: 3px solid var(--foreground);
}
@media (hover: hover) { .trials-corner:hover > span { width: 28px; height: 28px; } }
.trials-corner[data-held] > span { width: 28px; height: 28px; }   /* while a pointer holds it */
.trials-corner:focus-visible { outline: none; }
.trials-corner:focus-visible > span { outline: 2px solid var(--foreground); outline-offset: 2px; }
@media (scripting: none) { .trials-corner { display: none; } }
@media print { .trials-corner { display: none; } }
```

- **Ink, never copper.** The bracket is drawn with borders, so it holds in forced colours as
  CanvasText. There's no transition on its size: it changes state, it doesn't animate.
- **The ring goes round the bracket, not the 44 px box.** The site's ring (2 px ink at 2 px out)
  around the whole box would strike the freeboard label and the dimension. Around the bracket it is
  a 28 px square that touches only the dimension's first 4 px of tick while focused (`shots2/…-focus.png`).
- **Tab order.** The bracket is in the figure, so it is main's first Tab stop below 1024 and the
  figure's only one from 1024. The frame stays inert.
- **While the controller loads,** the button already exists in the server HTML, shown with script.
  The first pointerdown or focus fetches the chunk (T10). Nothing visible waits on it.

**Where it sits** (the corner is the frame's bottom-right, `--gl + --fw`, `--gt + --fh`):

| Viewport, page | Corner | Bracket | 44 px box | Clear of |
|---|---|---|---|---|
| 1440 × 900, `/trials` | 860, 627 | 840–860 × 607–627 | 838–882 × 605–649 | the readout column (x ≥ 1004). The box overlaps the freeboard label (878–911 × 610–623) by 4 px, which is harmless because the box is transparent. Inside the frame the bracket starts about 5 px right of GitHub's last letter. |
| 1440 × 900, `/trials/320x568` | 388, 700 | 368–388 × 680–700 | 366–410 × 678–722 | the −6.2 dimension (388–402 × 700–706), whole |
| 390 × 664, `/trials` | 306, 549.1 | 286–306 × 529–549 | 284–328 × 527–571 | the text edge (374) |
| 390 × 664, `/trials/320x568` | 193.7, 660.4 | 174–194 × 640–660 | 172–216 × 638–682 | in view: its bracket ends 3.6 px above the fold |
| 320 × 568, `/trials` | 236, 530.2 | 216–236 × 510–530 | 214–258 × 508–552 | the text edge (304) |
| 320 × 568, `/trials/320x568` | 193.7, 685.2 | — | — | below the fold, as the frame's foot is in Ta (T7 reports it); the visitor scrolls to it |

Nothing scrolled sideways at any of these. The box sits on the frame's corner at every width from
320, since the frame is at least 20 px from the column's left and 68 px from its right (28 and 80 from
1024).

## 2. The field at 1440: phone windows stand on the waterline

My open item from Ta was the phone windows at 1440. A 320 × 568 window drawn 1:1 leaves 472 px of
empty column beside it.

**Don't centre it.** The drawing stays anchored top left, because the corner drags into that room.
The fix is one line: **with script, the drawing takes its column's full width**, so the waterline
runs the whole field at the window's foot, `Waterline` sits at the field's right end, and the
phone window stands on it at the left (`shots/1440x900_trials_320x568.png`). The empty column now
reads as sea and sky beside a hull, not as a gap.

```css
@media (scripting: enabled) {
  .trials-drawing { width: 100cqi; }   /* was gl + fw + gr: the waterline now spans the field */
}
```

- For wide windows this changes nothing, since the frame already fills the column (1440 × 900: the
  drawing was 900, and is 900).
- The freeboard dimension and its label stay at the frame's right edge.
- The rule is CSS from the first paint, so nothing shifts (CLS 0). The frame's box and its scale
  are Ta's.

**The field** is the area the corner travels without the page zooming. Its width is the column less
the gutters (`100cqi − gl − gr`) and its height is Ta's height budget (`--frame-max`):

| Viewport | Field (w × h) | The grab's scale at `/trials` (1440 × 900) |
|---|---|---|
| 1440 × 900 | 792 × 696 | 0.55 |
| 390 × 664 | 270 × 280 | 0.1875 |
| 320 × 568 | 200 × 280 | 0.139 |

## 3. The drag: what moves and what doesn't

**The scale is the grab's.** At pointerdown the frame keeps the scale it's drawn at (`fw / w`, the
grab's scale `s0`). The drag never re-fits under the hand: a re-fit would move the corner away from
the finger. I tried two alternatives and rejected both:

- Zooming the whole sheet out on grab: the corner ran 198 px from the hand at 1440.
- One scale for the whole range: 320 × 568 drew 45 px wide on a phone.

1. **The hand's window** is the grab's window plus the pointer's travel divided by `s0`, on each
   axis. It is rounded to whole px and held to the grid's range (320 to 1920, 460 to 1100). At the
   range's floor the corner stops.
2. **The frame is drawn at `min(s0, fieldW / w, fieldH / h)`.** While the window fits the field at
   `s0`, the corner is under the hand to the pixel. Past the field's right or bottom edge, the frame
   holds that edge, and the page inside draws smaller as the window keeps growing. Pointer capture
   lets the hand leave the column, so one gesture reaches 1920 wide from `/trials` at 1440. On a
   phone it reaches less, and the keys and the inputs reach the rest.
3. **Release settles** on the swept window by Atlas's rule. The drawing then re-fits to Ta's own fit
   for that window (drop the drag's inline `--fw`, and the CSS takes over). Ta's fit is never smaller
   than the drag's scale, so the re-fit only ever zooms in or holds. For example, a drag from
   1440 × 900 to 400 × 610 at 1440 is drawn 220 × 336 under the hand, and lands at 400 × 610, 1:1.

**During a drag, every frame, with no easing in any mode, these follow the hand:**

- the frame's box and the iframe's size (the page reflows)
- the width and height dimensions, their lines and labels (whole numbers)
- the waterline, at the frame's foot
- the sea
- the freeboard dimension and its label (the live measure)
- `Waterline`'s height
- the bracket
- `[data-size]` and `[data-freeboard]` in the readout
- the caption's `{size}`
- the Width and Height inputs' values

**Once, at the grab:**

- The verdict's slot shows the marker, in graphite at weight 400, at the verdict's size and line, so
  the readout keeps its height.
- The answer shows its mid-drag line in graphite. The answer can change height here, which moves
  only what is below it. Shifts while a pointer is held are credited to the input, so CLS stays 0.
- The bracket goes to its held size.
- The root takes `cursor: nwse-resize` and `user-select: none`, so the cursor doesn't flicker over
  text and nothing gets selected.

**Never during a drag:**

- the frame's top-left origin
- the dimensions' left and top extension lines
- anything above the drawing: below 1024 that is the h1, the dare, the lead and the readout's box,
  which holds its height so the frame never moves under the finger
- the right column's position from 1024 (the figure is sticky in its own column)
- the page's scroll
- the verdict, the answer's words, the record and the title, which change only at a settle

**Once, at a settle:**

- the verdict, in ink and bold again
- the answer's words
- the record's rules
- the shown window's link (`aria-current`)
- the title, the canonical link and the address (replaced)
- the iframe's title
- the bracket's name
- the live region, which speaks once
- the Copy link line, which clears

**Motion.** Only the release's re-fit may ease: at most 180 ms, `cubic-bezier(0.2, 0, 0, 1)`, from the
frame's top left, and only in Full (the site's stored choice from `/`'s control, `components/model.tsx`,
else the system). Calm, Off and `prefers-reduced-motion: reduce` snap. Keys and edited inputs always
snap. The frame follows the hand in every mode, since that is the input, not an animation. No
number counts up and nothing fades. Rest requests no frames (T14).

**Keys** (Atlas's call 1) move the corner the way they point. Right is wider and Down is taller.
Each key settles at once, focus stays on the bracket, and the marker never shows. The Width and
Height inputs keep `step="1"` for the scripts-off form. With script, their own arrow keys must
reach the next swept window, or a 1 px step from 1440 snaps straight back to 1440 (Pixel's
controller).

## 4. The readout mid-drag

`dl` and the verdict as in Ta. Mid-drag:

```css
.trials-verdict[data-measuring] { color: var(--muted); font-weight: 400; }
.trials-answer[data-measuring]  { color: var(--muted); }
```

Graphite is guidance and ink binds (memory, sprint 47). While the hand moves, nothing in the record
binds. The verdict returns in ink and bold at the settle.

**Hook for Probe (a suggestion):** while held, `[data-freeboard]` could carry the live value in its
attribute and a `data-measure="live"` that the settle removes, so T11 can tell the two numbers apart.

## 5. Copy link: after the answer

Copy link goes **in the answer's row**, never in the readout. A row above the frame would push a
phone's frame down 58 px, and at 390 × 664 a tall window's waterline would fall below the fold, where
Ta pinned it in view. It uses the button grammar of `/read`'s Print (`.print-button`): ink outline,
transparent, ink fill on hover, never copper.

```css
.trials-share { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.trials-copy {
  flex: none; height: 44px; padding: 0 14px;
  border: 1px solid var(--foreground); background: transparent; color: var(--foreground);
  font: 600 var(--step-base) / 1 var(--font-sans); cursor: pointer;
}
@media (hover: hover) { .trials-copy:hover { background: var(--foreground); color: var(--background); } }
.trials-copied {                        /* hidden by visibility until a copy, so it holds its box */
  max-width: 40ch; color: var(--muted);
  font-size: var(--step-sm); line-height: 1.5; text-wrap: pretty;
}
@media (scripting: none) { .trials-share { display: none; } }
@media print { .trials-share { display: none; } }
```

**Measured:**

- The row is 44 px at every width.
- The copied line's longest form, at 1920 × 1100, sets in 2 lines (39 px) beside the button at
  1440, 390 and 320, so it fits the button's height.
- The failure line takes 1 line at 1440 and 390, and 2 at 320.
- On `/trials` at 1440 × 900 the row sits at 542–586, and the form's Try it stays in the first
  screen (about 763–812).
- Below 1024 the row is below the fold, after the answer, which is where a visitor ends up after
  reading it.

## 6. The card (1200 × 630)

The site's step-card grammar (`app/log/[n]/opengraph-image.tsx`) in the light tokens and the cards'
three faces (`lib/card-fonts.ts`). The words are `words.md`, section 6.

```
padding 48 56 40, LIGHT.background, LIGHT.foreground, Sofia Sans
┌───────────────────────────────────────────────────────────────────────┐
│  ├──── 1440 ────┤               Sea trials                (24, muted) │
│  ┌──────────────┐               1440 × 900      (display 700, 60)     │
│ 9│              │               Clear by 37.0 px.  (display 700, 96)  │
│ 0│    paper     │               Held by the crew's checks. (700, 36)  │
│ 0│              │┬ +37.0        Try to sink Ruslan's contact links.   │
│  └──────────────┘┴──────        (400, 26, muted)                      │
│  ////////////////   Waterline                                         │
├───────────────────────────────────────────────────────────────────────┤ 2 px ink
│  Ruslan Shulga  VP Engineering, AI Platform …     host/trials (muted) │
└───────────────────────────────────────────────────────────────────────┘
```

- **The drawing, left, 480 wide,** is Ta's drawing redrawn in card weights (my rule: card lines about
  1.5x the page's).
  - The window's frame is a 2 px ink outline filled with `LIGHT_LINES.card` (paper: the page is
    there, and the card doesn't pretend to render it). It is fitted by its ratio into at most
    340 × 340.
  - The width dimension goes over it and the height dimension beside it: 2 px graphite lines with
    extension ticks, labels 22 px graphite and tabular. The height label is turned −90°.
  - The waterline is 3 px ink across the drawing's whole width, at the frame's foot.
  - The sea is 16 px of `LIGHT_LINES.pencil` hatching at 135° under the frame only.
  - The freeboard dimension sits at the frame's right edge, drawn to scale: 2 px ink, ticks 18 px,
    the line 13 px out. When the window sinks it runs down into the sea. Its signed label is 30 px,
    weight 700, ink, its foot 6 px above the waterline. `Waterline` is 22 px graphite under the line
    at the right end.
  - A 6.2 px gap is about 4 px on the card. That's the truth, and the label and the headline carry
    the number.
- **The words, right,** are vertically centred on the frame.
  - The headline is one line, at the largest of 96, 84 and 72 px that fits the column.
  - It is set in Sofia Sans Extra Condensed 700 at −0.01em, never the text face's bold (memory,
    sprint 41).
  - Every multi-line string takes `textWrap: "balance"` (memory, sprint 54).
- **The foot** is the step card's `Foot` as it is: a 2 px ink rule, the name in display 48, the role
  at 28, and the address at 22, graphite, right-aligned.
- **Seen at 0.3 to 0.46** (phone feeds about 360 px, X and LinkedIn 506 to 552). The headline is
  29 to 44 px there and the verdict 11 to 17 px, so the dare is the one line a phone feed loses.
  That's acceptable: the title says it too.

**No copper on the card.** Copper means "live now" (the owner's call, sprint 17). A card is a still
of the sweep taken at merge and is never live. The page it unfurls never paints `--accent` (T8), and
none of the site's eight cards uses it today (`grep accent app/**/opengraph-image.tsx`: nothing).
`LIGHT.accent` stays out.

## What I steered away from

- **A CAD grip or an OS resize grip.** The square sat on the measure (above). The OS grip is window
  chrome, which Ta ruled out for the frame.
- **Zoom on grab, or one scale for all windows** (section 3).
- **Centring phone windows at 1440.** The drag needs the anchor; the waterline makes the room read.
- **A visible field box** (a dashed reach outline). It would cross the caption under wide windows and
  add a line that measures nothing.
- **Copy link in the readout,** where it would push a phone's frame down (section 5).
- **A tooltip, a "drag me" pulse, or a coach mark.** The bracket, the cursor and one caption sentence
  teach it. Hints only when a visitor seems stuck (brief) is a later call, if the demo shows people
  missing the corner.
- **A rendered page on the card.** Satori has no browser, and a schematic of `/` invented from no
  measure would draw boxes nobody measured. The card draws the two things the sweep measured: the
  window and the freeboard.
