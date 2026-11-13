# Sprint 65 words (Iris): the chart and the crew's fits

Every new string Tc shows or speaks, word for word. Forge's markup, Pixel's controller and Probe's
oracle quote them from here. Where they go and how they're set is `placement.md`. Ta's and Tb's
words (`.crew/sprint/63/words.md`, `.crew/sprint/64/words.md`) all stand.

**Characters** (Ta's rules):

- Straight apostrophes.
- A size is `{w} × {h}`, with U+00D7 between spaces.
- The minus is U+2212.
- A number and its unit share one `white-space: nowrap` span.
- Counts of windows use the Log's thousands comma (`13,029`).

**Spoken strings say "by" and "pixels"** (Tb's rule): `1366 by 595`, `0.7 pixels`. Every string a
visitor sees keeps `×` and `px`.

**Slots.**

- `{n}` is the visit's found fits, `{k}` the shown window's fits, and `{N}` is `FITS.length` (7
  today). The words below write 7, and the code writes `{N}`.
- `{signed}` is Ta's signed freeboard without its unit (`+0.7`, `−0.1`).
- `{sinking}` and `{total}` are the sweep's sinking windows and all its grid windows: 2,249 and
  13,029 at 10e9409, both computed (T16).

**No check code, query or path** in anything a visitor sees or hears (T5's patterns). A fit's
words link to its query's line; they never print it.

---

## 1. The chart

| What | Exact string |
|---|---|
| Its heading (`h2`, the chart head's first item) | `Every window` |
| The `svg`'s `<title>` | `Every window the crew swept, width across and height up` |
| Its caption (`figcaption`), first part, always | `Width across, height up, hatched where the contact links sink: {sinking} of the {total} windows swept. Dots are the crew's windows, the ring is the frame's, the numbers are close calls.` |
| The caption's last sentence, without script (a span hidden by `@media (scripting: enabled)`) | `Each number opens its window.` |
| The caption's last sentence, with script (a span hidden by `@media (scripting: none)`, as Tb's `.trials-scripted`) | `Tap anywhere to try that window.` |
| The gap pin's label (visible, inside the hidden plot) | `{signed}` of 320 × 568: `−6.2` |
| A width label, a height label | the number alone: `320`, `768`, `1024`, `1280`, `1920`; `460`, `780`, `1100` |

Today's caption, without script:

`Width across, height up, hatched where the contact links sink: 2,249 of the 13,029 windows swept. Dots are the crew's windows, the ring is the frame's, the numbers are close calls. Each number opens its window.`

**Close calls, not near misses.** The four soundings were named near misses in sprint 62. At the
committed sweep 456 × 465 sinks by 0.1 px and its own page says `Sunk`, so "near miss" would
contradict it. "Close call" covers either side of the line, and it stays true if a later sweep
moves one across.

## 2. The soundings

| What | Exact string |
|---|---|
| The visible number | `{signed}`: `−0.1`, `+0.1`, `+0.2`, `+0.7` |
| Its accessible name (`aria-label`, heard) | `{signed} pixels at {w} by {h}` |

- `−0.1 pixels at 456 by 465`
- `+0.1 pixels at 792 by 575`
- `+0.2 pixels at 1160 by 635`
- `+0.7 pixels at 1366 by 595`

The name starts with the visible number, so a voice user who says the number they see reaches the
link (WCAG 2.5.3). Forge's draft (`1366 × 595, +0.7 px`) would be heard as "times" and "p x".

## 3. The count line (`p[data-found]`, in the chart's head)

| State | Exact string |
|---|---|
| With script, the visit's count, before all are found | `{n} of 7 fits found` (`0 of 7 fits found`, `3 of 7 fits found`) |
| With script, all found | `All 7 fits found` |
| Without script; and with script until the visit's count is known (if the restore waits for the first settle) | `This window is in {k} of the crew's 7 fits` (`This window is in 2 of the crew's 7 fits`) |
| The same, at a window in no fit | `This window is in none of the crew's 7 fits` |

- No full stop: it's a label, like the verdict.
- `{n}` and `{k}` are digits, and `1` too: `This window is in 1 of the crew's 7 fits`.
- With script the line starts with the plank (`placement.md`, 5), which holds the newest find's
  sprint number, or nothing in its dashed box before the first find. The plank is `aria-hidden`:
  the number on it is said in the settle's message instead (section 5).
- If the restore can't run at load (contract call 6), the window's line stays until the first
  settle and then the visit's line replaces it. It's true at every moment, so nothing else needs
  saying.

## 4. The stamps: the section, the groups, the seven fits

| What | Exact string |
|---|---|
| The section's heading (`h2`) | `The crew's fits` |
| Its lead (`.trials-note`) | `Seven layouts the crew wrote for a range of windows, so his name, facts and contact links stay on the first screen. Each shows here once the frame's window enters it, and its windows are outlined on the chart.` |

"Seven" is the word for `{N}`. If the table changes, write the number in words, as the record's
answers do (`NUMBER_WORDS`).

### A group (one per sprint)

| What | Exact string |
|---|---|
| While none of its fits is shown (`.trials-stamp-none`) | `{Count} {fit\|fits} to find among the {group}.` |
| For each hidden fit, once another in its group is shown (`.trials-stamp-todo`) | `Another fit to find among the {group}.` |
| The sprint line's first line (`div[data-sprint-line] > p`) | `Sprint {n}` (the link to `/log/{n}`), then `: {goal}`, the retro's `goal` verbatim |
| Its second line | `Pull request #{pr}`, then the revision row's three names as `/log/{n}` prints them: `Drawn` `{drawn}`, `Checked` `{checked}`, `Tested` `{tested}` |
| The quote's head | `What went wrong first, in the crew's words` |
| The quote | the retro's `wentWrong[0].what`, verbatim, with no full stop added |

- `{Count}` is a capitalised number word: `One fit`, `Two fits`, `Three fits`.
- `{group}` comes from the sprint's fits' widths, as The crew's windows group them: `phones` under
  768, `tablets` from 768 to 1279, `laptops` from 1280. Today that's 43 laptops, 44 phones and 45
  tablets.
- The second line's names are a `dl` with the terms in graphite, separated by spaces. If the Log
  writes `—` for a role, print `—` there too.

Today's three groups, unfound:

- `Two fits to find among the laptops.` (43)
- `Two fits to find among the phones.` (44)
- `Three fits to find among the tablets.` (45)

Today's sprint lines, as shown:

| Sprint | Line 1 | Line 2 | The quote |
|---|---|---|---|
| 43 | `Sprint 43: Fit the name, facts and contact links into a short laptop window` | `Pull request #102` · `Drawn Forge, Pixel` · `Checked Lens` · `Tested Probe` | `Three changes to the same title block landed on main while this sprint built, and one put the contact links back under the fold` |
| 44 | `Sprint 44: Fit the name, facts and contact links into a phone's first window` | `Pull request #107` · `Drawn Forge, Pixel` · `Checked Lens` · `Tested Probe` | `The first layout was measured in a different browser build than the tests use, and one phone size didn't fit there` |
| 45 | `Sprint 45: Fit the name, facts and contact links into a tablet's first window` | `Pull request #108` · `Drawn Forge` · `Checked Lens` · `Tested Probe` | `The plan asked two checks to run against a deployed site, but they only hold without a live feed` |

(The `·` marks the gaps between items here; it isn't a printed character.)

### The seven fits (`li[data-fit]`)

Each stamp has three strings:

- **its words**, the link to its query's line, in ink 600;
- **where**, its range in px, in graphite on the line under it;
- **`data-said`**, the sentence the settle speaks when it's found.

The wording follows what each query does to `/` in `app/globals.css` (its comment and rules at
d6b9fbf). The ranges are its query at 16 px a rem.

| # | Its words (the link) | Where | `data-said` |
|---|---|---|---|
| 1 | `The drawing gives way, and the contact links follow his summary.` | `From 1280 px wide, under 900 tall or wider than 13:8.` | `Found a fit from sprint 43: the drawing gives way, and the contact links follow his summary.` |
| 2 | `The four facts stand beside the drawing.` | `From 1280 px wide, under 712 tall.` | `Found a fit from sprint 43: the four facts stand beside the drawing.` |
| 3 | `The drawing shrinks to the window's height, with Read as page above it.` | `Under 768 px wide.` | `Found a fit from sprint 44: the drawing shrinks to the window's height, with Read as page above it.` |
| 4 | `The drawing drops a few pixels more, so its Profile label clears the row above.` | `Under 331 px wide.` | `Found a fit from sprint 44: the drawing drops a few pixels more, so its Profile label clears the row above.` |
| 5 | `The drawing gives way, and the four facts stand beside it.` | `From 1024 to 1279 px wide, under 960 tall.` | `Found a fit from sprint 45: the drawing gives way, and the four facts stand beside it.` |
| 6 | `His contact links take their own line under the site's three, and the key breaks after its first sentence.` | `From 1024 to 1247 px wide.` | `Found a fit from sprint 45: his contact links take their own line under the site's three, and the key breaks after its first sentence.` |
| 7 | `The drawing keeps its full width, and the four facts stand in a row under it.` | `From 1024 to 1279 px wide, 960 tall or more.` | `Found a fit from sprint 45: the drawing keeps its full width, and the four facts stand in a row under it.` |

**What I checked behind each:**

1. Line 1512 moves `.title-contact` up to follow the bio, and the drawing's scale under line 1491
   gives way only inside this region (contract, "Why seven"). "Summary" is the page's word for the
   bio (B1.1, W1).
2. Line 1528 sets `.particulars` beside the drawing at the band's foot. "The four facts" is W1's
   phrase.
3. Line 1699 sizes the narrow drawing from `svh`, under the row that holds Read as page and the
   motion slot. In the frame (no script) the slot is empty, so only Read as page shows: "with Read
   as page above it".
4. Line 1820's comment: below 331 the row reaches the Profile caption's column, so the drawing drops
   and the caption clears it. "Profile" is the drawing's own label.
5. Line 1574: "The drawing gives way from the frame's left and the particulars stand beside it."
6. Line 1646: the contact row splits after the site's three links (Case studies, Ask AI, Live
   Studio), and the key splits after "Every name is an AI agent Ruslan directs."
7. Line 1427: from 960 tall the drawing keeps the band's width and the facts are "a row of the
   frame, four across".

`data-said` is visible nowhere. Its words are the stamp's words with a lower-case first letter;
none of them holds `px`, so they're speakable as they are.

## 5. What the live region says (polite, the one element Tb added)

Tb's settle sentence stands: `{w} by {h}: {verdict}, {f} pixels {side} the waterline.`

**A settle that follows a find** appends to Tb's sentence, in this order:

1. each fit found since the last settle, by its `data-said`, in fit order;
2. the count, `{n} of 7 fits found.`, or `All 7 fits found.` at the last.

**Examples:**

- From 1440 × 900, a drag to 1366 × 625:
  `1366 by 625: Held by the crew's checks, 21.7 pixels above the waterline. Found a fit from sprint 43: the drawing gives way, and the contact links follow his summary. Found a fit from sprint 43: the four facts stand beside the drawing. 2 of 7 fits found.`
- A tap that finds nothing new: Tb's sentence alone.
- A drag that crossed into a fit and came back to the window it started at: Tb says nothing for an
  unmoved settle. A find still speaks: the found sentences and the count alone, with no window
  sentence before them.
- Arrival, a reload and a restore speak nothing. A window's own fits on arrival are found
  silently, as its words are already on the page.
- Nothing is spoken mid-drag (T21), though the stamps and outlines appear as the frame enters them.

## 6. Hover and press (no words)

- With script, the plot's cursor is `crosshair` (Forge's choice, kept). It means any point tries a
  window. No hover marker or readout follows the pointer: a hover readout would be a tooltip, and
  it would name a window before the visitor tries it.
- A sounding's hover thickens its underline to 2 px, and its cursor is the pointer.
- Without script the plot has no special cursor, since only the soundings respond.

## What I steered away from

- **"Near misses"** for the soundings (section 1).
- **A visible query or a check code on a stamp.** A fit's words link to the stylesheet's line, as a
  rule's sentence links to its test.
- **"Found!" or "You found a fit!" anywhere visible.** The plank pressing in and the count say it.
  The words are only for ears, in the settle.
- **Each stamp repeating its sprint's people and quote.** Three stamps quoting sprint 45's retro in a
  row read like a bug. The group says them once.
- **Counting the unfound per group in the partly found state** ("One more to find"). CSS can't count
  without script, and two "One more" lines for two hidden fits would be wrong, so each hidden fit
  holds its own "Another fit to find" line.
- **"Fits" without a gloss.** It's the crew's word, so the section's lead says what one is before
  the list uses it.
