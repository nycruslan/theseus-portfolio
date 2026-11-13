# Sprint 64 words (Iris): drag it, and send it

Every new string Tb shows or speaks, word for word. Pixel's controller, Forge's card and Probe's checks
quote them from here. Where they go and how they're set is in `placement.md`. Ta's words
(`.crew/sprint/63/words.md`) all stand. Nothing here changes a string the page shows without script.

**Characters.** These are Ta's rules. Straight apostrophes. The visible size is `{w} × {h}`, with
U+00D7 between spaces. The minus is U+2212. A number and its unit share one `white-space: nowrap`
span.

**Spoken strings say "by" and "pixels".** The corner's name, its description and the live region
are heard, never seen, so they read `1440 by 900` and `6.2 pixels`. Screen readers say "×" as
"times" and "px" as "p x". Every string a visitor sees keeps `×` and `px`.

**Slots** (as in Ta). `{w}`, `{h}` and `{size}` are the window. `{f}` is the absolute freeboard to
one decimal. `{signed}` is Ta's signed value without a unit (`+37.0`, `−6.2`). `{verdict}` is Ta's
verdict, verbatim and in the same case. `{side}` is `above` when the window floats and `under` when
it sinks. The kind decides the side, as Ta's sign rule does.

**No check code and no path** in anything a visitor sees or hears.

---

## 1. The corner (the handle)

| What | Exact string |
|---|---|
| Accessible name (`aria-label`), at rest and after every settle | `Window corner, {w} by {h}` (`Window corner, 1440 by 900`) |
| Its description (`aria-describedby`, a visually hidden element) | `Drag it, or use the arrow keys: left and right change the width by 16 pixels, up and down move the foot by 5 pixels, Page Up and Page Down by 50 pixels, Home goes to the smallest window and End to the largest.` |

- The name updates on each settle, never during a drag. The live region speaks the settle (section
  4), so a focused handle isn't announced twice.
- The keys move the corner the way they point: Up raises the foot (shorter), Down lowers it (taller).
  Page Up and Page Down move it ten height steps. Home goes to 320 × 460 and End to 1920 × 1100
  (Atlas's call 1).

## 2. The caption's added sentence (with script only)

With script, the figure's caption gains a second sentence. The first sentence is Ta's, unchanged:

`His first page as the site builds it, without the crew's live updates, in a {size} window. Drag the frame's corner to try another window; it takes the arrow keys too.`

- The second sentence is the only visible instruction for the drag. It's a span hidden by
  `@media (scripting: none)`, so the page without script reads exactly as Ta.
- The `{size}` in the first sentence follows the hand during a drag (`placement.md`, 3).

## 3. While a drag is held

| What | Exact string |
|---|---|
| `[data-freeboard]`'s text, mid-drag | the live measure in Ta's format: `+12.4 px`, `−3.1 px` |
| `[data-size]`'s text, mid-drag | the hand's window: `403 × 611` |
| The verdict's slot, mid-drag (the marker) | `Measured live in your browser` |
| The answer's slot, mid-drag | `Let go and it settles on the nearest window the crew measured, with its answer.` |

- **The marker replaces the verdict** for as long as the hand holds the corner, set in graphite
  (`placement.md`, 4). Mid-drag there is no settled window, so no verdict, answer or rule may claim
  one. A live −3.1 beside "Held by the crew's checks" would be a lie.
- The answer's mid-drag line says why the number may move by a few tenths at release: the settled
  number is the crew's measure, and the moving one is the visitor's browser (Atlas's call 2).
- **The live sign follows Ta's rule.** A value under zero shows `−` and at least `0.1`, so
  `−0.04` reads `−0.1 px`. Zero or more shows `+`.
- **Measured: one line at every width.** In CI's Chromium 156 shell with the text face loaded, the
  marker sets 232 px wide in a 288 px verdict line at 320 × 568, and 267 of 396 px at 1440. Every
  verdict fits one line too: the widest, "Held by the crew's checks", is 208 of 288 px at 320. So the
  readout never changes height in a drag, and on a phone the frame below it never moves under the
  finger.
- A key press settles at once, so keys never show the marker.

## 4. The live region (polite, visually hidden, one element)

| When | Exact string |
|---|---|
| Each settle (pointer release, a key, an edited input) | `{w} by {h}: {verdict}, {f} pixels {side} the waterline.` |
| Copy link worked | `Link to {w} by {h} copied.` |
| Copy link failed | `Couldn't copy the link. It's in the address bar.` |

Examples:

- `320 by 568: The crew's own gap, 6.2 pixels under the waterline.`
- `1440 by 900: Held by the crew's checks, 37.0 pixels above the waterline.`
- `1366 by 595: A near miss, 0.7 pixels above the waterline.`
- `320 by 460: Sunk, 114.2 pixels under the waterline.`

It never speaks during a drag. A press with no movement isn't a settle, so it says nothing (nothing
changed).

## 5. Copy link

| What | Exact string |
|---|---|
| The button (`button`, its visible text is its name) | `Copy link` |
| The line beside it once copied (`aria-hidden="true"`: the live region speaks it) | `Copied. It opens at {size}, with this answer.` |
| The line beside it if the clipboard refuses | `Couldn't copy. The address bar has the link.` |

- What it copies is the settled window's absolute address (T13): `/trials` for 1440 × 900,
  `/trials/{w}x{h}` otherwise.
- The line clears at the next settle, because it then names a window no longer shown. A second copy
  rewrites it.
- The failure line is true: the address is always replaced on settle (T13), so the address bar
  holds the same link.

## 6. The card (`og:image` and `twitter:image`, 1200 × 630, one per swept window)

**The drawn words, top to bottom** (layout in `placement.md`, 6):

| What | Exact string |
|---|---|
| Head | `Sea trials` |
| The window | `{size}` |
| The headline | sinks: `Under by {f} px.` floats: `Clear by {f} px.` |
| The verdict | `{verdict}.` (Ta's verdict with a full stop) |
| The dare | `Try to sink Ruslan's contact links.` |
| In the drawing: width, height, freeboard, line | `{w}`, `{h}`, `{signed}`, `Waterline` (Ta's drawing labels) |
| The foot | `profile.name`, then the role and the address exactly as the step cards set them (`app/log/[n]/opengraph-image.tsx`, `Foot`), the address being `{host}/trials` or `{host}/trials/{w}x{h}` |

**Per kind** (the headline and the verdict, as drawn):

| Kind | Example | Headline | Verdict |
|---|---|---|---|
| The crew's own gap | 320 × 568 | `Under by 6.2 px.` | `The crew's own gap.` |
| Held | 1440 × 900 (`/trials`) | `Clear by 37.0 px.` | `Held by the crew's checks.` |
| A near miss | 1366 × 595 | `Clear by 0.7 px.` | `A near miss.` |
| Sunk | 320 × 460 | `Under by 114.2 px.` | `Sunk.` |
| Afloat | 1920 × 1100 | `Clear by {f} px.` | `Afloat.` |

"Clear" and "under" are the words the titles already use (`320 × 568: The crew's own gap, 6.2 px
under — …`), so a link's card and its title tab agree.

**The card's alt text** (the page's `og:image:alt` and `twitter:image:alt`, one string per window):

`Sea trials: a {size} window drawn to its waterline, {name}'s contact links {under|clear} by {f} px (freeboard {signed} px). {verdict}.`

- `Sea trials: a 320 × 568 window drawn to its waterline, Ruslan Shulga's contact links under by 6.2 px (freeboard −6.2 px). The crew's own gap.`
- `Sea trials: a 1440 × 900 window drawn to its waterline, Ruslan Shulga's contact links clear by 37.0 px (freeboard +37.0 px). Held by the crew's checks.`

The alt carries the size, the signed freeboard from the sweep and the verdict (T15). `{name}` is
`profile.name`, never typed. Alt text is heard, but it is also shown when an image fails, so it keeps
the visible `×` and `px` rather than the spoken forms.

## What I steered away from

- **"Live" alone as the marker** ("Live", "Live measure"). On this site "live" is the crew's feed and
  copper's one meaning. "Measured live in your browser" says whose measure it is.
- **A verdict that follows the hand.** The nearest swept window's verdict beside the visitor's live
  number contradicts itself near zero: a live −0.3 beside "A near miss, +0.7". The marker holds the
  verdict's place until a window has one.
- **Spoken `×` and `px`.**
- **A "Copied!" swap on the button.** It renames the control under the pointer and has no room for
  what the link opens. The button's name never changes. The line beside it says what was copied.
- **A share sheet or platform icons.** One plain button, the site's.
