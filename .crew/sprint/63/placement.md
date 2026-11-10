# Sprint 63 placement (Iris): the trials page at 1440 × 900, 390 × 664 and 320 × 568

Iris's call 1 (`contract.md`, "Iris's calls come first"). The words are `words.md`; this file says
where they go and how they're set. I prototyped it on production's own shell (the `/log` page,
scripts off, its bar, fonts and tokens, `main` replaced by this markup and CSS, the frame stood in by
a shot of production's `/` at the window) in CI's Chromium 156 headless shell, and measured every
number below there. The stand-in only fixes the frame's box; the build frames the real page.

**Plan calls 3, 7 and 8 stand.** The frame shows `/` in the feed's down state, so no pencil row and
no copper in it; no check code or path on the page; no motion control, and nothing on the page moves.

## 1. Order (one DOM, two layouts)

`main` (the site's skip target, the display face's variable on it as on `/log`):

1. `header`: the h1, the dare, the lead.
2. The readout: a `dl` of two readings (Window, Freeboard), then the verdict `p`.
3. The `figure`: the drawing (dimensions, the frame, the waterline) and its caption.
4. The answer: one `p`, no heading.
5. `section` "Try any window": the hint and the form.
6. `section` "The crew's windows": Phones, Tablets, Laptops (and the run's `details`).
7. `section` "The record": the rules, or the one line that no check claims this window.

Below 1024 the page is one column in that order. From 1024 the figure takes the left column and
everything else the right, in the same order. The answer sits with the readout because it is the
verdict in words; the rules come last because they are its citations, and the form and the crew's
windows come before them so the next try is never below seven rules.

The bar is the site's (`at="page"`, so nothing current; the display face's variable on it, as the
reading pages pass it). From 768 it carries Read as page as everywhere; below 768 the page doesn't
add a Read as page row, as the reading pages don't. No motion control in the bar (call 3).

## 2. The page's frame and columns

- **Below 1024:** `main` padding `0 16px 48px`, a flex column. 768 to 1023 is the phone layout
  with a wider column (the drawing grows to fit, below).
- **From 1024:** `main` as the Log's: `margin-inline: 16px`, padding `32px 24px 64px`, so the text
  edge is 40 and the right edge 1400, as on `/log` (its h1 sits at x 1004 to 1400; so does this one).

```css
@media (min-width: 1024px) {
  .trials {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24.75rem;   /* the right column is the Log's 396 px */
    grid-template-rows: repeat(7, auto) 1fr;           /* the figure spans these; the 1fr takes its excess */
    column-gap: 40px;                                  /* 64px from 1280 */
    align-items: start;
    margin-inline: 16px;
    padding: 32px 24px 64px;
  }
  .trials > * { grid-column: 2; }
  .trials-figure { grid-column: 1; grid-row: 1 / -1; position: sticky; top: 88px; }
}
```

The figure is sticky from 1024 (32 px under the stuck bar, as at rest), so the frame and its
waterline stay beside the record, the form and the windows as the right column scrolls. Sticky is
position, not motion: nothing animates, nothing shifts (CLS), and the frame is `inert`. Its grid
area is every row, so Chromium's and the spec's sticky ranges agree (memory, sprint 47).

## 3. The drawing: the frame scaled to its column

The frame is never drawn larger than the window (1:1 at most), never wider than its column less its
dimension gutters, and never taller than the height budget, so the waterline is in the first screen
at every window on a laptop and at 390 × 664 and 390 × 844. All of it is CSS from two numbers the
server writes, so the box is sized in the server HTML (T2) and nothing shifts (T8):

```html
<figure class="trials-figure">
  <div class="trials-drawing" style="--w:1366;--h:625;--fa:0.96528;--fs:0.03472">
    …dimension w, dimension h, the frame (the iframe), the sea, the waterline,
      the freeboard dimension and its label, the Waterline label…
  </div>
  <figcaption>…</figcaption>
</figure>
```

`--fa` is where the links' foot sits as a fraction of the frame's height, `min(1 − f/h, 1)`; `--fs`
is the freeboard dimension's length as a fraction, `|f| / h` (unitless, four decimals or more).

```css
.trials-figure { container-type: inline-size; margin-top: 18px; }      /* 0 from 1024 */
.trials-drawing {
  --gl: 20px; --gr: 56px; --gt: 22px;                 /* from 1024: 28px, 80px, 28px */
  --frame-max: max(280px, calc(100svh - 500px));      /* from 1024: max(360px, calc(100svh - 204px)) */
  --fw: min(calc(100cqi - var(--gl) - var(--gr)),
            calc(var(--w) * 1px),
            calc(var(--frame-max) * var(--w) / var(--h)));
  --fh: calc(var(--fw) * var(--h) / var(--w));
  position: relative;
  width: calc(var(--gl) + var(--fw) + var(--gr));
  height: calc(var(--gt) + var(--fh) + 14px);
}
.trials-frame {               /* the window: absolute at (gl, gt), fw × fh, clipped */
  position: absolute; top: var(--gt); left: var(--gl);
  width: var(--fw); height: var(--fh);
  overflow: hidden; outline: 1px solid var(--foreground);
}
.trials-frame > iframe {      /* the page at its real size, scaled down to the box */
  display: block; width: calc(var(--w) * 1px); height: calc(var(--h) * 1px); border: 0;
  transform-origin: 0 0;
  scale: tan(atan2(var(--fw), calc(var(--w) * 1px)));  /* fw ÷ w px, without unit division */
}
```

`tan(atan2(a, b))` is length division without `calc()` division by a length: it computed 0.195833
for 282 / 1440 in Chromium 156 here. Whether Safari and Firefox take it is Forge's measure (plan
risk 7); a fallback must keep the box and never overflow its column. The phone budget (`100svh −
500px`, floor 280) is what sits above the frame below 1024 (bar, h1, dare, lead, readout: the frame's
top is at 378 to 402) plus the caption and the answer's first line at 390 × 844. The laptop budget
(`100svh − 204px`) is the frame's top at 132 plus 72 px under it.

**The parts, all drawn with borders** so they show in forced colours (backgrounds go there; T8):

| Part | Where | How |
|---|---|---|
| The window's edge | the frame's box | `outline: 1px solid var(--foreground)` |
| The waterline | from the drawing's left edge to its right edge, its top at the frame's foot (within 1 px, T3) | `border-top: 2px solid var(--foreground)` |
| The sea | under the waterline, the frame's width, 12 px | `repeating-linear-gradient(135deg, var(--pencil) 0 1px, transparent 1px 6px)`; decorative, so it may vanish in forced colours |
| Width dimension | over the frame, `--gt` tall, the frame's width | 1 px `var(--muted)` extension lines at both ends, a 1 px line at mid-height, the label centred on the line with a `var(--background)` pad that breaks it |
| Height dimension | left of the frame, `--gl` wide, the frame's height | 1 px `var(--muted)` ticks at top and foot spanning the gutter, a 1 px vertical line at its centre, the label centred, set vertically (`writing-mode: vertical-rl; rotate: 180deg`) on a `var(--background)` pad |
| Freeboard dimension | at the frame's right edge, 14 px wide, from `--gt + --fh × --fa` for `--fh × --fs` | 1 px ink ticks top and foot (the top one is the extension line from the links' foot), a 1 px ink line 10 px out; when the window sinks it runs below the waterline, into the sea's gutter |
| Freeboard label | right of that dimension, its foot 4 px above the waterline, always | 700, ink |
| `Waterline` | under the line, right-aligned to the drawing's right end, 6 px down | graphite |

The freeboard label always sits just above the waterline and `Waterline` always just under it, at
the right: they can't meet whatever the freeboard, and the sea stops at the frame's edge so the label
never sits on hatching. Lettering is the text face, `--step-xs` below 1024 and `--step-sm` from 1024,
`tabular-nums`, `line-height: 1`. The caption follows the sea, `margin-top: 8px`.

**The frame in dark.** The page's `color-scheme: light dark` passes to the frame, so in a dark
system the frame draws the night sheet beside the night page. The sweep measures geometry, which the
scheme doesn't move.

## 4. Type and colour

Faces from `app/fonts.ts` and the layout only. Ink is `--foreground`, graphite `--muted`. No
`--accent` anywhere on the page: not on a link, a focus ring, a hover, the current window, or the sea.

| Element | Face, weight | Size / line | Colour | Notes |
|---|---|---|---|---|
| h1 | display, 700, −0.01em | `--step-2xl` / 0.95 | ink | `.log h1`'s; `margin-top: 20px` below 1024, 0 from |
| The dare | text, 650 | `--step-lg` / 1.35 | ink | `margin-top: 10px` |
| The lead | text, 400 | `--step-base` / 1.55 | graphite | `margin-top: 4px`, max 62ch, `text-wrap: pretty` |
| The readout | — | — | — | `margin-top: 18px`, `padding-top: 8px`, `border-top: 1px solid` ink; the `dl` a flex row, `justify-content: space-between`, gap 16, the Freeboard group right-aligned |
| `dt` (Window, Freeboard) | text, 400 | `--step-sm` / 1.5 | graphite | |
| `dd` (the size, the freeboard) | display, 700 | `--step-entry` / 1.05 | ink | `tabular-nums`, `white-space: nowrap` |
| The verdict | text, 700 | `--step-lg` / 1.35 | ink | `margin-top: 4px`: binds, so ink and bold (memory, sprint 47) |
| Caption | text, 400 | `--step-sm` / 1.5 | graphite | max 62ch; the size in a nowrap span (it wrapped "1440 × / 900" without) |
| The answer | text, 400 | `--step-base` / 1.55 | ink | `margin-top: 16px` below 1024 (after the caption), 12px from 1024 (after the verdict); max 62ch |
| Section (`.trials-section`) | — | — | — | `margin-top: 32px`, `padding-top: 12px`, `border-top: 1px solid` ink |
| h2 | display, 700 | `--step-xl` / 1.2 | ink | |
| h3 (Phones, Tablets, Laptops) | text, 700 | `--step-sm` / 1.5 | ink | `margin-top: 14px` |
| Hint, section leads | text, 400 | `--step-sm` / 1.5 | graphite | `margin-top: 4px`, max 62ch |
| Labels (Width, Height) | text, 650 | `--step-sm` | ink | above the input, gap 4; `px` after the input, graphite, `aria-hidden` |
| Inputs | text, 400 | `--step-base` | ink | /ask's grammar: `--card` fill, 1 px ink border, no radius, 48 px tall, `6.5ch` wide, `tabular-nums` |
| Try it | text, 700 | `--step-base` | `--background` on `--foreground` | /ask's submit: 50 px tall, 0 20px padding; the fields row is flex, gap 12, `align-items: end`, wrapping |
| A window link | text, 400 | `--step-base` below 1024, `--step-sm` from | ink | underline 1 px, offset 3; `min-height: 44px` below 1024, 28px from; lists flex-wrap, gap `0 20px` (`0 14px` in the run) |
| The shown window | text, 700 | as above | ink | no underline; `aria-current="page"`. Never boxed or filled: a boxed number on this site is a plank (memory, sprint 47) |
| The run's `summary` | text, 400 | as a window link | ink | native disclosure marker kept (`display: list-item`), 44 px tall below 1024 |
| A rule | text, 400 | `--step-sm` / 1.5 | ink link, graphite sprint | each `li` `padding: 10px 0`, a 1 px `--rule` line between; the sentence link `display: block` (one box, one ring; 44 px tall at three lines, and `padding-block: 3px` lifts a two-line one past 44 below 1024), underline 1 px offset 3; `Sprint {n}` on its own line under it, `margin-top: 2px` |

Focus: the site's one ring, 2 px ink at 2 px out, as every link and control has it.

## 5. The first screen, measured

Production's shell with this markup and CSS, CI's Chromium 156 headless shell, scripts off, fonts
ready. Bottoms in CSS px from the viewport's top; ✓ inside the first screen, ✗ below it.

**`/trials` (1440 × 900, +37.0 px, held, seven rules):**

| Viewport | h1 | Size | Verdict | Frame (width) | Waterline | Answer, line 1 | Form |
|---|---|---|---|---|---|---|---|
| 1440 × 900 | 172.4 ✓ | 375.5 ✓ | 407.9 ✓ | 132 to 627 (792) | 627 ✓ | 441.9 ✓ | 607 to 751 ✓ |
| 1366 × 595 | 171.1 ✓ | 373.1 ✓ | 405.2 ✓ | 132 to 523 (626) | 523 ✓ | 439.2 ✓ | 603 to 747 |
| 1024 × 768 | 164.9 ✓ | 362.1 ✓ | 392.8 ✓ | 132 to 382 (400) | 382 ✓ | 426.8 ✓ | 587 to 731 ✓ |
| 390 × 844 | 121.4 ✓ | 309.7 ✓ | 338.0 ✓ | 378 to 554 (282) | 554 ✓ | 652.2 ✓ | 805 to 969 |
| 390 × 664 | 121.4 ✓ | 309.7 ✓ | 338.0 ✓ | 378 to 554 (282) | 554 ✓ | 652.2 ✓ | 805 to 969 |
| 320 × 568 | 121.4 ✓ | 333.7 ✓ | 362.0 ✓ | 402 to 535 (212) | 535 ✓ | 632.5 ✗ | 809 to 1035 |

**`/trials/320x568` (−6.2 px, the crew's own gap, one rule):**

| Viewport | h1 | Size | Verdict | Frame (width) | Waterline | Answer, line 1 |
|---|---|---|---|---|---|---|
| 1440 × 900 | 172.4 ✓ | 375.5 ✓ | 407.9 ✓ | 132 to 700 (320, at 1:1) | 700 ✓ | 441.9 ✓ |
| 390 × 844 | 121.4 ✓ | 309.7 ✓ | 338.0 ✓ | 378 to 722 (194) | 722 ✓ | 820.0 ✓ |
| 390 × 664 | 121.4 ✓ | 309.7 ✓ | 338.0 ✓ | 378 to 658 (158) | 658 ✓ | 756.0 ✗ |
| 320 × 568 | 121.4 ✓ | 333.7 ✓ | 362.0 ✓ | 402 to 682 (158) | 682 ✗ | 780.0 ✗ |

`/trials/320x460` (sunk, −114.2 px) reads as 320 × 568 does, its frame 195 wide at 390, waterline
658 at 390 × 664 and 722 at 390 × 844. Nothing scrolled sideways at any of these, light or dark.

**What I pin, beyond T7 (it may pin more, never less):**

- At 1440 × 900, 1366 × 595 and 1024 × 768, **any window**: the h1, the size, the freeboard, the
  verdict, the whole frame, the waterline and the answer's first line in the first screen. The
  budget caps the frame at `100svh − 204px`, so its foot is at most 72 px above the fold.
- At 390 × 844, **any window**: the same (the frame capped at `100svh − 500px`).
- At 390 × 664, **any window**: the h1, size, freeboard, verdict and the waterline (the floor of
  280 px puts it at 658 at the most). The answer lands below: 652 for `/trials`, 756 for
  `/trials/320x568` (T7's report).
- At 320 × 568: T7's floor, the h1, size, freeboard and verdict, with the frame's top at 402. The
  answer lands at 632.5 on `/trials` and 780 on `/trials/320x568` (T7's report); the waterline is
  in view on `/trials` (535) and not on `/trials/320x568` (682).

If Forge's real text wraps differently (the lead and the dare decide the frame's top below 1024),
re-measure these windows before changing `--frame-max`; I'd rather lose 10 px of frame than the
waterline at 390 × 664.

## 6. What I steered away from

- **Boxed window chips** (the canvas's): a boxed number on this site is a plank. The crew's windows
  are plain ink links, the shown one bold.
- **A scale figure** ("at 0.58 of its size"): CSS scales the frame, so the server can't know the
  number. The dimensions carry the true size, as a drawing's do.
- **"DWL"**: the page is read by people who don't letter plans; the line says `Waterline`.
- **A device mockup or a browser chrome** around the frame: the window is drawn as a drawing draws a
  part, with its dimensions.
- **Copper on the frame or the waterline** to say "this is the claim": copper means live, and
  nothing here is (`direction-iris.md`).
- **A sticky readout on phones:** the figure is sticky only from 1024, where it has a column of its
  own; on a phone it would cover the answer.
