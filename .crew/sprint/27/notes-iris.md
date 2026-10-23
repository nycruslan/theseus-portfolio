# Sprint 27, Iris: where Full / Calm / Off sits, and its sizes at every width (Part 1)

**The call.** The control lives in the bar wherever the bar has room for it, which is from 768 px;
on phones (320 to 767) it sits at the drawing's foot: a 44 px row of main's grid under the drawing,
the group right-aligned 16 px in, 12 px above the title block's 2 px rule. Nothing is fixed to the
viewport and nothing joins the sticky bar below 768. Desktop is the approved frame (`main.webp`):
the bar's right end after Read as page, 32 px tall, a 24 px gap, confirmed below. It costs the
first screen at 390 × 844 exactly 44 px and B1.1 passes with 215 px to spare. It departs visibly
from `hero-390.webp`, so section 7 has the paragraph for the owner. The DOM differs from Quill's
plan below 768 (one group, in the bar's `nav` from 768 and in `main` below it; the Tab order is the
plan's at every width), so section 6 is for Probe.

Judged on production (https://theseus-portfolio.vercel.app, the deploy of 2026-10-23) in
Playwright's Chromium 1.64 at 320 × 568 and 390 × 844 (DPR 2, touch), 768 × 1024 (DPR 2),
1024 × 768 and 1440 × 900 (DPR 1), light and dark, the optional font warm (one reload before
measuring) and, for section 8, blocked. The call was then mocked on production itself (the slots
and the group injected with the numbers below) and shot at every width, so the numbers here are
measured, not computed: frames in `.crew/screenshots/sprint-27/part1/` (git ignores it), listed at
the end. The chrome-devtools MCP can't start Chrome as root on this machine (my sprint 4 memory
line), hence Playwright.

## 1. Production today, measured (both schemes measure the same)

| Width | Bar row | Wordmark ends | Links (boxes) | Read as page ends | Drawing | Title block top | Contact links bottom |
|---|---|---|---|---|---|---|---|
| 320 × 568 | 52 | 78 | 87 to 310, 13/600, 44 tall; 9 px after the mark | 310 | 52 to 265.3 | 265.3 | 624.4 (past 568; B1.1 doesn't measure 320) |
| 390 × 844 | 52 | 78 | 120 to 380, 16/600, 44 tall; 42 px after the mark | 380 | 52 to 312 | 312 | 585.3 (258.8 px of room) |
| 768 × 1024 | 52 | 83 | 493 to 758, 16.4/600, 44 tall; 410 px after the mark | 758 | 52 to 311.6 | 311.6 | 577.9 |
| 1024 × 768 | 56 (16 to 1008) | 111 | 151 to 332, 17/600, 37.7 tall | 984 (24 in from 1008) | 72 to 406.7 | 406.7 | 728.6 |
| 1440 × 900 | 56 (16 to 1424) | 116 | 156 to 339, 17/600, 38.3 tall | 1400 (24 in from 1424) | 72 to 547.3 | 547.3 | 866.3 |

So the phone bar is full (9 px of air at 320, 42 at 390: a group needs 183), the tablet bar has
410 px to spare, and the desktop bar has the right end the frame drew for the control.

The labels in Sofia Sans 600, measured in the page: at `--step-base` (16 px at 390) Full 25,
Calm 36, Off 22; at 768 (16.4 px) 25 / 36 / 23; at `--step-sm` (13 px) Full 19, Calm 29, Off 18.
The canvas said 14/600 for the desktop group; the scale has no 14, and 13 (`--step-sm`, the
revision table's size) against the links' 17 is the same one-step drop the canvas drew. Use the
scale.

## 2. Desktop, from 1024 (`width >= 64rem`): confirmed against `main.webp`

- **Place:** the bar's `nav`, after the `ul`, as `main.webp` draws it: `nav` becomes
  `display: flex; align-items: center; gap: 24px`, the `ul` keeps `flex: 1` with Read as page's
  `margin-left: auto`, then the slot. The slot ends where Read as page ends today: 24 px in from
  the frame line (x 1400 at 1440, 984 at 1024).
- **Slot:** `width: 142px; height: 32px; display: flex; justify-content: flex-end`, fixed width,
  overflow visible: it holds the group's size before the buttons arrive (CLS 0), as
  `.strip-print` does on `/read`. In the fallback face the group is 150 wide and hangs 8 px into
  the gap; nothing moves.
- **Group:** 142 × 32 (Full 45, Calm 55, Off 44, with shared 1 px dividers), `--step-sm`/600,
  padding 0 12. Vertically centred in the 56 px row: 12 px above and below (measured 27.5 to 59.5
  with the row at 16 to 72).
- **Gap:** 24 px from the end of "page" to the group's border. Read as page's box then ends at
  1234 at 1440 (1128 to 1226 in the mock with a 150 slot; 142 gives 1136 to 1234) and at 818 at
  1024. `main.webp` has Read as page ending about 1228 and the group 1250 to 1400: this is it.
- Targets: 44 to 55 × 32, above B2.9's 24 from 1024. The links stay 37.7 tall.

## 3. Tablets, 768 to 1023 (`48rem <= width < 64rem`): in the bar, at phone size

- Same slot in the `nav`, after the `ul`; the `ul` drops its `-mr-1.5` here (`md:mr-0`), since
  Read as page no longer sits on the edge. The `nav` is content-sized at the row's right (it is
  `flex-1` only from 1024), so the row reads: wordmark, air, Work Log Contact Read as page, gap,
  group, 16 px in from the edge (the group's right edge at 752 at 768).
- **Slot:** `width: 186px; height: 44px` (the group is 184 at 768 and 185 at 1023 on the fluid
  step; right-aligned inside, the slack is on its left).
- **Group:** 44 tall, `--step-base`/600, padding 0 16: Full 59, Calm 70, Off 57 at 768.
- **Gap:** `gap: 18px` box to box, which is 24 from the letters, since the links keep their 6 px
  side padding below 1024. 44 px targets (B2.9).
- The bar row stays 52: the group sits 3.5 px under the row's top and 4 px above its rule, a cell
  spanning the row (`mock-bar-768-light.png`). I looked at this twice; it reads as a title-block
  cell, not as a crowded button, and it keeps the approved phone bar untouched. If the build shows
  it tighter than the frame does, the one alternative is the row at 56 from 768 (6 px each side);
  I don't ask for it.
- On the fallback face the bar at 768 has 351 px after the mark, the group needs 193 + 18: it
  fits with 140 to spare.

## 4. Phones, 320 to 767 (`width < 48rem`): the drawing's foot

- **Place:** a row of `main`'s one-column grid directly after `<Model>` and before `<TitleBlock>`
  (after the model, not between the drawing and the model: `[data-plan]:has(+ [data-model])` in
  `app/globals.css` keys the plank fills on that adjacency).
- **Slot:** `display: flex; justify-content: flex-end; height: 44px; margin: -12px 0 12px;
  padding: 0 16px; position: relative`. The negative margin lets the row borrow 12 px of the
  drawing's own foot: at 390 the drawing's lowest ink (the half-breadth centreline) is at y 263
  and the "Half-breadth plan" label's bottom at 279.5, so the slot's top at 300 clears the ink by
  37 and the label by 20.5, and its bottom at 344 sits 12 above the 2 px rule at 356. `position:
  relative` keeps the buttons painted over the model layer, which is absolutely positioned on the
  drawing's box (52 to 312) and would otherwise paint over the slot's top 12 px (the canvas is
  transparent there: the settled hull's shadow ends near y 245, and the loft lifts the hull up,
  not down). `print:hidden`, like the bar: on paper it is an empty band.
- **Group:** 44 tall, `--step-base`/600, padding 0 16: 183 wide at 390 (Full 59, Calm 70,
  Off 56), x 191 to 374, y 300 to 344. Right edge 16 px in, the title block's text inset and the
  bar's padding.
- **Below 360 (`width < 22.5rem`):** `margin-top: 0` on the slot and `padding: 0 12px` on the
  buttons. At 320 the drawing's foot is shallower (its lowest ink at 225, the label's bottom at
  239.8, the box's end at 265.3) and the label's right end is at x 120.4, so a 183 px group would
  start at 121, beside it; at 12 px padding the group is 159 wide (Full 51, Calm 62, Off 48),
  x 145 to 304, y 265.3 to 309.3: 25 px clear of the label both ways, the rule at 321.3. The bar
  already changes under 360 (its small step), so this is the same breakpoint, not a new one.
- **Measured in the mock, 390 × 844:** group 191 to 374 × 300 to 344; title block top 356 (312
  today); h1 top 372; Contact links' bottom 629.25, 214.75 px inside the first viewport;
  Revisions top 653.25, so the head and the first revision row are still on the first screen.
  `scrollWidth` 390. **320 × 568:** group 145 to 304 × 265.3 to 309.3; title block top 321.3
  (265.3 today); `scrollWidth` 320. Same geometry in dark (`mock-foot-390-dark.png`).
- **Scripts off:** the slot keeps its 44 px and margins, so the title block is at 356 either way
  (`mock-empty-390.png`: title top 356 with no buttons); the buttons arrive into it, CLS 0. The
  empty slot is 44 px more film under the drawing's caption before the rule: it reads as the
  drawing's bottom margin, nothing in it, no rule or box of its own. That is the price of a slot on
  a phone and I accept it; it is the state nobody sees twice.

Why here and not the canvas's strip: section 7. Why not in the bar: the phone bar is full (42 px
of air at 390, 9 at 320), and the two ways to keep the group in the bar's DOM below 768 are a
second sticky row (97 px of chrome on an 844 px screen, 11.5%, at every scroll position, for a
control used once) or a strip fixed to the viewport's bottom (covers the bio at 320 × 568, where
the title block runs to 648; an app tab bar on a drawing sheet). Both read as templates. A row
under the drawing is the drawing's own cell: above the rule that opens the title block, so it
belongs to the figure it controls, and it scrolls away with the sheet.

## 5. The group itself, every width

- `div role="group" aria-label="Motion"`, `display: inline-flex`, no border of its own, square
  corners, no radius anywhere.
- Each `button type="button" aria-pressed`: `display: inline-flex; align-items: center;
  justify-content: center; border: 1px solid var(--foreground); background: transparent; color:
  var(--foreground); font: 600 <step>/1 inherit; cursor: pointer; appearance: none`. The second and
  third take `margin-left: -1px`, so dividers are 1 px, and the target is the button's box with its
  border: 44 tall below 1024, 32 from it, so B2.9 measures the border box.
- Pressed (`aria-pressed="true"`): `background: var(--foreground); color: var(--background);
  position: relative; z-index: 1` (its ink edges cover the neighbours' borders). Light: ink on
  film; dark: film on ink, as `mock-foot-390-dark.png` shows. No transition: the cell changes
  state, it doesn't animate, in any motion mode.
- Hover, not pressed: `background: var(--rule)` (the selection tint: #bfcac7 light, #323d40
  dark), text unchanged, no underline (an underline would say link). `.print-button`'s hover is
  the full ink fill, which here would look pressed.
- Focus: the site's one ring (`:focus-visible` in `@layer base`, 2 px ink, offset 2) plus
  `position: relative; z-index: 2` on the focused button, so the ring paints over both neighbours'
  borders: one ring per button.
- Forced colours: `[aria-pressed="true"] { background: Highlight; background: SelectedItem; color:
  HighlightText; color: SelectedItemText; }` inside `@media (forced-colors: active)`, since the
  system otherwise repaints the ink fill as ButtonFace and pressed looks unpressed. Borders and the
  ring take the system's colours on their own.
- Labels are the owner's three words, no visible "Motion" label, no icons.

## 6. The DOM and the Tab order (for Probe; this changes the rewrites)

- One group in the DOM at a time, two slots in the server HTML: `header nav > ul + div[data-slot]`
  (`hidden md:flex`, 186 × 44 then 142 × 32) and `main > div[data-slot]` after `[data-model]`,
  before `main > header` (`md:hidden`, the 44 px row). The client component (scripted only, as
  `PrintButton`) renders the group into the slot that matches `(width >= 48rem)` (a portal keyed
  on `matchMedia`, re-homed on change); the server and the first hydrating render draw nothing.
  Forge may prefer rendering it twice with one slot `display: none`; I'd rather one instance, so
  the DOM tells the truth at each width, but either keeps every assertion below.
- Tab order at every width: skip, Work, Log, Contact, Read as page, Full, Calm, Off, GitHub,
  LinkedIn, ruslanshulga.com, the Log link, ... Below 768 the group is `main`'s first focusable
  (the drawing and the model layer hold none), so the sequence is the plan's: Contact's first
  link stays the 15th stop.
- B2.3 as planned holds from 768 (the bar's controls: four links then three buttons, Read as page
  the right-most link). Below 768 the bar has its four links and the group is `main > [role=group]`
  between `[data-plan]` and `main > header`.
- `e2e/keyboard.spec.ts`'s "Tab visits every link" walks `a[href]` and breaks on the first stop
  that isn't an `A` (`if (el?.tagName !== "A") return null; ... if (!stop) break;`): with buttons
  in the order it stops at Full at every width, whatever the placement. Its `expectedStops` and
  the walk need buttons, and `tabUntil`'s bound rises from 12.
- B1.1 at 390 × 844 passes as measured above; the slot doesn't change what it measures, only where
  (title block from 356).

## 7. The departure from `hero-390.webp`, and the paragraph for the owner

It departs. The canvas put the control in a strip at the first screen's foot beside Read as page.
Since #62 (sprint 22) Read as page is in the phone bar and the strip no longer exists, and the
first screen is the sheet: drawing, title block, revisions, with no foot to pin a strip to short
of making the first screen a full-height frame. For the PR:

> On phones the Full / Calm / Off control sits under the drawing, at the right, just above the
> rule that opens your name, not in the bottom strip the canvas drew. That strip held Read as page
> and the control together; since the phone bar you approved in sprint 22 took Read as page, the
> strip had nothing else in it, and the only ways to keep a control at the screen's foot were to
> pin it over the page (it would cover your bio on a small phone) or to lengthen the first screen
> to a full frame. Under the drawing it belongs to the thing it controls, costs the first screen
> 44 px (your name, role, bio and links still sit inside it with 215 px to spare at 390 × 844), and
> scrolls away with the sheet. From 768 px, and on the desktop, it is in the bar at the right end
> exactly as the frame draws it. The preview shows it at 390; say if you'd rather see the strip.

## 8. The bar on the fallback face (for Forge, in passing)

My placement doesn't touch the bar below 768, so the cold-cache fault is production's as I
reported in sprint 26, now with its cause measured. With the woff2 files blocked at 390 the four
links are 51.7 + 41.3 + 71.6 + 102 = 266.6 px wide, only 7 more than warm (260): the fitted text
fallback holds. The wordmark is the problem: 113.4 px against 78 (its box), 35 px wider, because
the Extra Condensed face's fallback is fitted to an average character width that "Theseus" in a
condensed bold doesn't follow. That eats the 42 px gap and Read as page wraps (its box 49.6 tall
in a 44 px row). At 320 the same mark pushes the `ul` to 113.4 and the page scrolls 21 px
(`scrollWidth` 341), Read as page 58.5 tall. What the bar should do: stay one row of 52 at 320
and 390 in either face, which means the condensed wordmark's fallback fitted to its real width
(62 px at 24 px: a `size-adjust` on `next/font`'s fallback for `sofiaCondensed`, or an explicit
fallback face) and `white-space: nowrap` on the links so a link never breaks into two lines
whatever the face. The group's slots are unaffected: below 768 the group isn't in the bar; from
768 the fallback has 140 px to spare (section 3).

## 9. Constraints, checked on the mock

- No horizontal scroll at 320: `scrollWidth` 320 with the group in place (159 wide, 16 in).
- All four links on one line at 320: the bar is unchanged below 768.
- Targets: 44 tall at every width below 1024 (buttons 48 to 70 wide), 32 tall from 1024 (44 to
  55 wide), both over B2.9's bar.
- One ring per focused button: `z-index` on `:focus-visible` (section 5); Probe's forced-colours
  check sees the ring on the focused box only.
- CLS 0: both slots are sized in the server HTML (142 × 32, 186 × 44, the 44 px row) and the
  group arrives inside them; the mock with no buttons has the title block at the same 356.
- The 404 and `/read` don't change: the bar and the sheet slot are on `/` only.
- Pixel-identical sheet apart from the group: the only layout change below 768 is the 44 px row
  (title block, revisions and facts 44 px lower at 390, 56 at 320); from 768 nothing in `main`
  moves, and in the bar only Read as page moves left (by 168 at 1440, 204 at 768), as the frame
  draws.

## 10. The defaults I steered away from

A strip fixed to the viewport's bottom (an app tab bar; covers the bio at 320 × 568). A second
sticky row on the bar (97 px of chrome at every scroll position). A gear, a hamburger or a
disclosure hiding the three approved words. A rounded pill segmented control. Icon toggles. A
colour transition on the pressed state. A visible "Motion" label beside the group.

## 11. What I couldn't verify

- The loft on the phone against the slot's 12 px overlap of the model's box: from sprint 26's
  settled numbers the hull never reaches below y 250 at 390, but the frame sequence on the build
  is the test (Part 2).
- The control's forced-colours and reduced-motion states: on the build, not a mock.
- The 768 bar's 4 px of air under the group on a real tablet; SwiftShader frames only.
- The wordmark fallback's fitted width: measured (113 against 78), the fix untested.
- Hover's `--rule` ground in dark on a real display: tokens only (#e2eae9 on #323d40 is over
  9:1 by arithmetic).

## Frames (`.crew/screenshots/sprint-27/part1/`, copies of my scratchpad's)

- `prod/390-light.png`, `prod/320-light.png`, `prod/768-light.png`, `prod/1024-light.png`,
  `prod/1440-dark.png`: production's first screen today at each width.
- `prod/fallback-bar-390.png`, `prod/fallback-bar-320.png`: the bar on the fallback face, the
  wide wordmark and the wrapped Read as page.
- `mock/mock-390-light.png`: the call at 390 × 844, light: drawing, the group at its foot, the
  rule, the name.
- `mock/mock-foot-390-dark.png`, `mock/mock-foot-320-light.png`: the drawing's foot with the
  group, dark at 390 and light at 320 (12 px padding).
- `mock/mock-bar-768-light.png`, `mock/mock-bar-1440-light.png`: the bar's right end with the
  group at 44 and at 32.
- `mock/mock-empty-390.png`: the slot with no buttons (scripts off), title block at 356.
