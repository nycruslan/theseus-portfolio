# Sprint 63 words (Iris): the trials page, every string

Iris's call 2 (`contract.md`, "Iris's calls come first"). Every string the trials page shows, word
for word; Forge's page and Probe's oracle quote them from here. Placement is `placement.md`.

**Characters.** Straight apostrophes (`'`), as the site writes them. The size is `<w> × <h>`: the
width, a space, U+00D7 `×`, a space, the height (`1366 × 625`). The minus is U+2212 `−`, never a
hyphen. Titles join their parts with ` — ` (U+2014 between spaces), as every title on the site
does. A number and its unit share one `white-space: nowrap` span with a plain space between them
(memory, sprint 30), never an NBSP.

**Slots.** `{size}` is the size above. `{f}` is the freeboard's absolute value to one decimal
(`6.2`, `29.2`, `0.0`). `{n}` is how many of the crew's checks hold this window (below), in words
from one to ten (`one`, `seven`). `{held}` is how many windows the crew's checks hold, in digits:
the `PINS` windows less the one W8 only reports (today 320 × 568), so `PINS.length − 1`.

**The page shows no check code and no path.** Codes appear here only as keys, for mapping.

---

## 1. The head

| What | Exact string |
|---|---|
| h1 | `Sea trials` |
| The dare (the first line under the h1) | `Try to sink Ruslan's contact links.` |
| The lead (under the dare) | `Pick a window and his first page is drawn at its size. The window's foot is the waterline; how far the links stand above it is their freeboard.` |

"Sea trials" is the shipwright's word for proving a new hull against its contract before handover,
which is what the crew's checks do; it sits with the site's lines plan, waterline and keel, and it
is plain to a reader who never sailed. The canvas's "Trials" is superseded. The dare names whose
links and what to do in one line, so the demo's five-second question is answered by the h1 and
the line under it.

## 2. The readout (beside the frame)

| What | Exact string |
|---|---|
| The size | `{size}` (`1366 × 625`) |
| The freeboard's label | `Freeboard` |
| `[data-freeboard]`'s whole text | the signed value, then ` px`: `+29.2 px`, `−6.2 px`, `+0.0 px` |
| The verdict | per kind, below |

**The sign.** `+` when the window floats, `−` (U+2212) when it sinks: the sign follows the kind,
which reads the unrounded value. So a sinking window never shows `+0.0 px`; a window under by
0.04 px reads `−0.0 px`. If the sweep stores tenths, store negatives rounded away from zero (or
store the kind) so the sign survives the rounding.

## 3. The five kinds: verdict and answer

The verdict is the bold line in the readout, and it is carried verbatim, same case, into the
window's title and description (section 6). The answer is the record's paragraph under "The record"
(section 4). `{f}`, `{n}` and `{held}` as above.

| Kind | Verdict (exact) | Answer (exact, with slots) |
|---|---|---|
| **The crew's own gap** (a pinned window that sinks; today only 320 × 568) | `The crew's own gap` | `The contact links end {f} px under the waterline, and the crew knew. When it fitted phones in sprint 44, this window was outside the set, and Atlas, the crew's lead, ruled that its check would report where the links land here rather than hold them. Every phone window the crew checks keeps them at least 8 px clear.` |
| **Held** (a pinned window that floats) | `Held by the crew's checks` | `The contact links stand {f} px above the waterline, and {n} of the crew's checks hold them there. If a change sank them in this window, the tests would fail and it couldn't merge.` (with `{n}` = `one`: `…and one of the crew's checks holds them there.`) |
| **A near miss** (0 ≤ freeboard < 1, not pinned) | `A near miss` | `The contact links clear the waterline by {f} px, less than a pixel. With no check holding them here, a change could sink them, and this page would say so.` |
| **Unclaimed, under** (freeboard < 0, not pinned) | `Sunk` | `You sank them. The contact links end {f} px under the waterline, in a window the crew's checks leave alone: they hold the links up in {held} others.` |
| **Unclaimed, afloat** (freeboard ≥ 1, not pinned) | `Afloat` | `The contact links stand {f} px above the waterline. They float here on the page's own layout.` |

Examples, as the page reads today:

- 320 × 568: `−6.2 px`, **The crew's own gap**, "The contact links end 6.2 px under the waterline, and the
  crew knew. When it fitted phones in sprint 44, …"
- 1440 × 900: `+29.2 px`, **Held by the crew's checks**, "The contact links stand 29.2 px above the
  waterline, and seven of the crew's checks hold them there. …" (if `PINS` gives it seven: below)
- 1366 × 595: `+0.7 px`, **A near miss**.
- 320 × 460: `−… px`, **Sunk**, "You sank them. … they hold the links up in 80 others." (if `PINS` has 81)
- 1920 × 1100: `+… px`, **Afloat**.

**The gap's words are 320 × 568's.** They paraphrase Atlas's sprint 44 ruling as
`e2e/phone-window.spec.ts` records it (320 × 568 "is outside Wb's set, … so it is reported, not
asserted (Atlas's ruling, sprint 44)"), and the 8 px is W8's margin for every phone window it holds.
If the kind ever matches another window, the build should fail rather than print these words
under it (a server-side assertion that the gap's window is 320 × 568).

## 4. The record: the answer and the rules

| What | Exact string |
|---|---|
| The section's h2 | `The record` |
| Then | the answer, section 3 |
| Above the rules, for a `PINS` window (h3) | `The crew's checks here` |
| For any other window, the one line (no h3, no list) | `None of the crew's checks claims this window.` |
| Each rule's sprint, after its sentence | `Sprint {sprint}` (`Sprint 43`) |

**Each rule is one `li`:** the check's sentence (section 5) as **the link** to its spec file and
line at the build's commit, then `Sprint {sprint}` in graphite, unlinked. The sentence is the link
because it is what the link proves: one link per rule, each named by its own claim, so no two
links share a name and none reads "Read more". (The keel's record line links a whole sentence the
same way, `components/keel.tsx`.) Order the rules by sprint, oldest first, then by code.

## 5. Each check's sentence, keyed by code

What each check holds, read from its test, in a visitor's words. "His" is Ruslan's; "the four
facts" are Leads, Reach, Gateway and Impact beside the drawing; "his summary" is the paragraph under
his role; "whatever the crew is doing" covers the feed's down, live, open and resting states, which
those checks run on.

**The checks that assert the contact links inside the window** (my read of each test; Probe's
oracle decides `PINS`, and Forge maps file and line). The windows are where each asserts them:

| Key | Sprint | Its windows | Sentence (exact) |
|---|---|---|---|
| B1.1 | 22 | 1440 × 900, 390 × 844 | `The first screen says who and what: his name, role, summary and contact links are all in view, and his name is the largest text on the page.` |
| W1 | 43 | 1280 × 680, 1280 × 800, 1366 × 625, 1440 × 790, 1470 × 840, 1512 × 865, 1536 × 715, 1920 × 950 | `On each laptop window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.` |
| W2 | 43 | 1440 × 900 (its boxes equal main's, the links among them) | `At 1440 × 900 the laptop fit moved nothing: his name, facts, contact links, newest revisions and drawing sit where they sat before it, to half a pixel.` |
| W5 | 43 | 1440 × 700 (and 1440 × 900 by W2's boxes) | `Shrink a 1440-wide window to 700 tall and back: at 700 his name, role, summary, facts and contact links still fit the first screen; at 900 all return to place.` |
| W8 | 44 | 390 × 664, 393 × 659, 412 × 780, 430 × 746, 375 × 548, 360 × 560, 390 × 844 | `On each phone window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary and contact links fit the first screen with 8 px to spare.` |
| W8, at 320 × 568 only (reported, not held) | 44 | 320 × 568 | `Reports where his contact links land in this window and doesn't hold them: Atlas ruled it outside the phone windows the crew fitted.` |
| W13 | 45 | 1024 × 640, 1024 × 768, 1180 × 740 | `On each tablet window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.` |
| W14 | 45 | 1280 × 680, 1366 × 625, 1024 × 768 | `The key that says every name is an AI agent he directs shows whole from 1024 to 1439 wide, and at three windows the crew names it fits the first screen with his name, facts and contact links.` |
| P3 | 39 | 1440 × 900, 390 × 844 | `Whatever the crew is doing, in light and dark, the four facts fit the first screen whole with his name, role, summary and contact links, none of them as large as his name.` |
| P8 | 40 | 1440 × 900 (its first-screen test, "P8 the key in the first screen") | `The key that says every name is an AI agent he directs fits the first screen with the five newest revisions and his name, role and contact links, whatever the crew is doing.` |
| B4.22 | 34 | 1440 × 900, 390 × 844; 1024 × 768 (resting) | `While the crew works, waits or rests, the first screen keeps his name, role, summary and contact links, and at 1440 × 900 the line for what the crew is doing now.` |
| H10 | 60 | 1380 to 1440 wide, every pixel, at 900 tall | `The link to rebuild the ship moved nothing down: from 1380 to 1440 wide at 900 tall, in every state and font, the contact links sit no lower than before, in view.` |

So by my read, 1440 × 900 lists seven (B1.1, W2, W5, P3, P8, B4.22, H10), 390 × 844 four, 1024 × 768
three, and each of H10's sixty other windows one. If `PINS` leaves W2 out (it pins boxes, not "inside"),
1440 × 900 lists six and the answer's `{n}` follows: the words don't change.

**The others in the brief's list,** which by my read don't assert the contact links inside the
window, so they shouldn't appear under any window. Their sentences, should the oracle read one
differently:

| Key | Sprint | Sentence (exact) |
|---|---|---|
| W3 | 43 | `On each laptop window the crew checks, the drawing stays whole, clear of the four facts, and never shorter than 240 px.` |
| W4 | 43 | `On the two short laptop windows the crew names, the 3D hull's first frame lands on the drawing within a pixel and a half.` |
| W6 | 43 | `On the two short laptop windows nothing jumps as the page loads, nothing but the 3D hull moves, and his name is the largest thing painted.` |
| W7 | 43 | `On the two short laptop windows, in light and dark, the page passes the accessibility scan and never scrolls sideways, and forced colours and print keep the drawing and every fact.` |
| W9 | 44 | `On each phone window the crew checks, the narrow drawing stays whole and no shorter than its 149 px floor.` |
| W10 | 44 | `On each phone window the crew checks, the Full, Calm and Off switch keeps its order and its 44 px targets, in view where it sits, and the drawing keeps clear of it.` |
| W11 | 44 | `On phones nothing jumps as the page loads, or as the browser's toolbars show and hide.` |
| W12 | 44 | `On phones and tablets, the 3D hull's plank number leaves the copper dot of the plank in progress showing.` |
| W15 | 45 | `The window checks can also run against the published site, not only the crew's own build.` |
| W16 | 45 | `On each tablet window the crew checks, the drawing stays whole, clear of the four facts and no shorter than 240 px; at 1024 × 640 the 3D hull's first frame lands on it.` |
| W17 | 45 | `On tablets nothing jumps as the page loads or as the window is resized, and his name is the largest thing painted.` |
| H9 | 60 | `The link to rebuild the ship yourself follows the Log link at every width and in every state, styled like it, never in copper, and next in the Tab order.` |
| H11 | 60 | `When the link to rebuild the ship arrived, the older checks it touched were rewritten to hold the new page as tightly as the old.` |

Where I read them: B1.1 `sheet.spec.ts:134` (reads in `first-screen.ts`); W1 `window.spec.ts:284`
(the const) and :331/:348; W2 :355; W5 :793; W8 `phone-window.spec.ts:208` (the const, with
`REPORTED_ONLY` at :70 and Atlas's ruling at :64); W13 `tablet-window.spec.ts:283`; W14 :321; P3
`particulars.spec.ts:414`; P8 `plain-words.spec.ts:472` (`P8_SCREEN`); B4.22 `live-layer.spec.ts:1342`;
H10 `home-door.spec.ts:874`. Line numbers are this checkout's (eebc0f7); the page links the build's.

## 6. Titles and descriptions

Every window page, `/trials` (the 1440 × 900 window) included. `{verdict}` is section 3's,
verbatim and same case; `{depth}` is `{f} px clear` when it floats and `{f} px under` when it sinks.

| What | Pattern | Example |
|---|---|---|
| `<title>` | `{size}: {verdict}, {depth} — Sea trials — Ruslan Shulga` | `320 × 568: The crew's own gap, 6.2 px under — Sea trials — Ruslan Shulga` |
| description | `{size}: {verdict}. Ruslan Shulga's contact links end {f} px {above\|below} the foot of the first screen. Try to sink them in any window.` | `1440 × 900: Held by the crew's checks. Ruslan Shulga's contact links end 29.2 px above the foot of the first screen. Try to sink them in any window.` |
| Open Graph and X title and description | the same two strings | |

`above` when it floats, `below` when it sinks. The name is `profile.name`, never typed.

More examples: `1440 × 900: Held by the crew's checks, 29.2 px clear — Sea trials — Ruslan Shulga`;
`1366 × 595: A near miss, 0.7 px clear — …`; `320 × 460: Sunk, … px under — …`;
`1920 × 1100: Afloat, … px clear — …`.

## 7. The frame

| What | Exact string |
|---|---|
| The iframe's `title` | `Ruslan Shulga's first page in a {size} window` (from `profile.name`) |
| The figure's caption, under the waterline | `His first page as the site builds it, without the crew's live updates, in a {size} window.` |
| The width dimension's label (over the frame) | `{w}` (`1366`) |
| The height dimension's label (beside it) | `{h}` (`625`) |
| The freeboard dimension's label | the signed value without its unit: `+21.7`, `−6.2` (same sign rule as section 2) |
| The waterline's label | `Waterline` |

`/trials/frame`'s own document keeps `/`'s title and description: it is `/` as built, `noindex`,
canonical to `/` (decisions 2).

## 8. Choose a window (the form)

| What | Exact string |
|---|---|
| The section's h2 | `Try any window` |
| The hint (the inputs' `aria-describedby`) | `Widths from 320 to 1920 px, heights from 460 to 1100. A few windows are drawn exactly as typed, the crew's among them; any other snaps to the nearest 16 px of width and 5 px of height.` |
| First input's label | `Width` |
| Second input's label | `Height` |
| The unit after each input (`aria-hidden`, the hint says px) | `px` |
| The button | `Try it` |

Number inputs, `min`/`max` the grid's limits (320 and 1920, 460 and 1100), `step="1"` (so 1366 and
393 are valid; the route does the snapping), `required`, each prefilled with the shown window's
value. Native validation does the rest without script.

## 9. The crew's windows

| What | Exact string |
|---|---|
| The section's h2 | `The crew's windows` |
| The lead | `Every window where the crew's checks hold the contact links, and the one they leave out.` |
| Group h3, widths below 768 | `Phones` |
| Group h3, 768 to 1279 | `Tablets` |
| Group h3, 1280 and up | `Laptops` |
| Each window's link text (`a[data-window]`) | `{size}` |
| H10's run, if `PINS` holds it: the `summary` | `And every width from 1380 to 1439 at 900 tall` |
| Each link in the run: visible text / accessible name | `{w}` / `aria-label="{size}"` (`1380` / `1380 × 900`) |

Within a group, windows go by width, then height. 1440 × 900 is a Laptops link like the others (its
address is `/trials`), so the run holds 1380 to 1439 and every window is still exactly one link.
The run is a closed `details` at the end of Laptops: sixty one-pixel steps are the record, not
something to scan. The shown window's link is `aria-current="page"`.

## Changed from the canvas

- The h1 is "Sea trials", not "Trials".
- No codes ("W1, sprint 43", "The 320 px gate"): each rule is its sentence and its sprint (plan call 7).
- "DWL" is "Waterline" on this page: the page is read by people who don't letter plans.
- No "Copy link", no sliders, no chart, no fits, no motion control (Tb, Tc; plan call 8).
- No scale figure ("at 0.58 of its size"): without script the server can't know the column's width.
  The dimensions carry the true size, as a drawing's do.
