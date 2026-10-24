# Sprint 27 review, Iris: Full, Calm, Off

**Verdict: ship, 9.0/10.** Better than production at 390, 1024 and 1440; the sheet is
pixel-identical to production at every width in both schemes with the control and the fallback
face apart (0 differing pixels in 46 captures); every hard gate passes; my early-look must (the
pressed label in forced colours) landed as written (`f9a1b6c`); no musts and no cheap changes
left. Two notes for the roadmap at the end, and a correction to my own notes.

Reviewed on `098d731`'s product code (the sprint head `1aa11d3` adds Probe's memory and
decisions), served by Forge at http://localhost:4731/, in Playwright's Chromium 1.64 (SwiftShader):
320 × 568 and 390 × 844 at DPR 2 with touch, 768 × 1024 at DPR 2, 1024 × 768 and 1440 × 900 at
DPR 1, light and dark, beside production (https://theseus-portfolio.vercel.app) at the same
viewports, against `main.webp` and `motion-control.webp` (`.crew/sprint/17/design/`), my call
(`notes-iris.md`), the contract with its amendments, `design/rubric.md` and the owner's calibration.
The chrome-devtools MCP can't start Chrome as root here, so the gates ran through Playwright and
axe-core 4.13 injected into the page, as in sprints 25 and 26. The switches and the phone loft
were judged in the early look on the same code (`components/model.tsx` and `lib/model/` are
unchanged since, comments apart) and are summarised below; the frames are in
`.crew/screenshots/sprint-27/` (`part1/`, `early/`, `review/`; git ignores the folder).

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | The control's three words are the owner's approved labels; no `TODO(owner)`, no stand-in. Production's pending content is unchanged. |
| axe, no serious or critical | 0 violations of any impact at 390 and 1440, light and dark, model at rest (tags wcag2a/aa, 2.1, 2.2aa, best-practice; the same `color-contrast` incompletes as before: 15 at 390, 22 at 1440) (`review/gates.json`). |
| impeccable detector, nothing at error | `[]` over `components/model.tsx`, `components/bar.tsx`, `app/globals.css`, `app/page.tsx`, `app/fonts.ts`, `app/layout.tsx`. |
| Reduced motion | Calm pressed at 390 and 1440 in both schemes; the model's only state over 2.8 s is `settled`; nothing is stored, so a later press still wins (`review/reduce-390-light.png`). |
| Reflows at 320, no horizontal scroll | `scrollWidth` 320 with the real face and with the woff2 refused; at 390 with the fonts refused, 390. The only boxes past the edge are the off-screen skip link and the clipped `thead`, as on production (`review/reflow-320-real.png`, `reflow-320-fallback.png`, `reflow-390-fallback.png`). |
| Phone budget | 390 × 844, 4× CPU, 400 kbps with 150 ms latency: LCP is the bio paragraph at 1,684 ms light and 1,756 ms dark; 0 layout-shift entries over load + 2.5 s and through the loft to rest (CLS 0). The 3D chunk is still downloading at +2.5 s and the slots hold its place. |

No console errors or page errors in any gate load (`gates.json`, `errors: []`).

## First verdict: better than production

Side by side, warm face, model settled, light and dark, at 320, 390, 768, 1024 and 1440, four
captures each (the first screen and three scrolled by a viewport), plus `/read` and the 404 at
390 and 1440 (`review/compare.json`, `cmp-*.png`):

- **From 768:** 0 differing pixels in every capture with only the bar's nav band masked. Inside
  that band the wordmark and Work, Log and Contact are where they were (Work at 156, Log 222,
  Contact 276 at 1440) and Read as page has moved left to end 24 px before the group (1234 at
  1440, 818 at 1024, 548 at 768), as `main.webp` draws it.
- **390 and 320:** 0 differing pixels above the slot, and 0 below it with the sheet's offset
  applied (44 px at 390, 56 at 320, where the slot drops its negative margin), in the first screen
  and at three scroll positions. The slot band is the only new thing on the page.
- **`/read` and the 404:** 0 differing pixels at both widths. The bar isn't on them.

What production lacks and this has: a way to stop the loft or never download the 3D at all; a
reduced-motion default the visitor can override; and a first paint that holds its lines on a
device without Arial, where production's cold-cache bar wrapped at 390 and scrolled 21 px at 320
(the cause is under "Correction" below). What it costs: 44 px of the first screen at 390 × 844,
with the name, role, bio and links still inside it by 215 px (B1.1), and 56 at 320.

## The control, as built

- **Place and size, measured on the build:** 1440, 142 × 32 at x 1258 to 1400, y 27.5 to 59.5
  (centred in the 56 px row); 1024, the same at 842 to 984; 768, 184 × 44 at 568 to 752 in the
  52 px row; 390, 183 × 44 at x 191 to 374, y 300 to 344, the title block from 356; 320, 159 × 44
  at 145 to 304, y 265.3 to 309.3, the title block from 321.3. Labels at `--step-sm`/600 from
  1024 and `--step-base`/600 below; padding 0 12 and 0 16 (0 12 below 360); 1 px ink frames with
  shared dividers; no radius, no transition. Every number is the one in `notes-iris.md`.
- **States** (`review/control-1440-*.png`, `early/foot-390-light.png`): pressed is ink with film
  text, film with ink text in dark; hover takes the `--rule` tint; the focused button wears the
  site's one ring, drawn over both neighbours' borders; Off leaves the drawing whole, the layer
  empty. The hover tint only exists where `(hover: hover)`, so a phone never sticks on it.
- **Forced colours** (`review/forced-390-dark-*.png`, `forced-390-light-rest.png`,
  `forced-1440-light-calm-pressed.png`): the pressed cell is Highlight with its label in
  HighlightText and its frame in Highlight; the focused pressed cell keeps a Highlight ring with a
  Canvas gap; Enter on Calm moves the cell. The build before `f9a1b6c` lost the label under
  Chromium's Canvas backplate; `forced-color-adjust: none` with `outline-color: Highlight` is the
  fix, in as I wrote it.
- **No WebGL 2** (`review/nogl-390-light.png`, `nogl-1440-dark.png`): Off pressed, Full and Calm
  `disabled` with graphite labels in their ink frames, nothing stored. Truthful: neither could
  change anything.
- **Scripts off** (`review/noscript-390.png`, `noscript-1440.png`): both slots empty at their
  size, the title block at 356 and Read as page at 1234 either way. The empty foot at 390 reads
  as the drawing's bottom margin.
- **The switches** (early look, same code): Off pressed mid-loft tears the model down at once
  (canvas and `data-state` gone, all 22 planks back) and stores `off`; a reload stays Off with no
  canvas. Calm settles and stores `calm`. Full from Calm puts the whole drawing back and lofts from
  frame 1, 413 ms after the press on SwiftShader, and frame 1 is the drawing itself, so no blank
  frame shows. A reload after Calm opens on Calm, settled.
- **The phone loft against the slot's 12 px overlap:** on a paused clock stepped 16 ms a frame, the
  lowest model pixel over the whole loft is y 251 (light) and 252.5 (dark) at 390 against the
  slot's top at 300, and 214.5 and 215.5 at 320 against 265.3: 47 px clear, never in the band
  (`early/L-390-light-*.png`, `L-320-dark-*.png`).
- **Tab order** at 390 and 1440: skip, Work, Log, Contact, Read as page, Full, Calm, Off, GitHub,
  LinkedIn, ruslanshulga.com.
- **The DOM:** a `fieldset aria-label="Motion"` of three `button aria-pressed`, rendered in both
  slots with one shown; the hidden one's buttons are `display: none` and no Tab stops. Both slots
  are in the server HTML at the group's size. Accepted, as in my early look.

## Score

| | Design quality ×2 | Originality ×2 | Craft | Functionality | Weighted |
|---|---|---|---|---|---|
| Production (sprint 26's review) | 9 | 9 | 8 | 9 | **8.8** |
| This build | 9 | 9 | 9 | 9 | **9.0** |

Calibration as before: the owner's 04 (Lusion) 8.5, 02 (Messenger) 8.8, 03 (Oryzo) 9.0, 08 (the
old site) 6.5. **Design quality 9:** the control is a drafting cell on the sheet, ink frames and
an ink-filled pressed cell, the same material as the title block's rules and the legend's chips;
at the bar's right end it completes the approved frame, and at the drawing's foot on a phone it
reads as the figure's own cell above the rule that opens the name (`review/first-390-dark.png`,
`first-1440-light.png`). Not 10: the empty slot without scripts is 44 px of film that only the
sheet metaphor explains, and the 768 cell sits 4 px above the bar's rule, which I accept but
wouldn't draw. **Originality 9:** a motion control that is three words in a sheet's cell, not a
toggle switch, a gear or a pill, and that keeps the drawing-sheet idea whole; the originality is
still the sheet's and the model's, and this adds to it without diluting it. **Craft 9** (from 8):
the sprint removed the fault that held production at 8, the cold-cache bar, and it fixed it at
the cause (an explicit fallback face over Arial's metric twins and Roboto, `624a149`); the control
is pixel-precise at every width, the slots hold CLS 0, the fallback-face group hangs 7 px into
its gap and moves nothing, and forced colours and no-WebGL have real states. Not 10: the one
composition note from sprint 26 still stands, "Base" and "10" under the shadow's tail on the
narrow sheet, and it is the sheet's, not this sprint's. **Functionality 9:** the visitor can stop
the motion, avoid the 3D entirely, and the choice holds across visits; reduced motion is honoured
and can be overridden; keyboard, forced colours and no-WebGL all have truthful states. Not 10:
Full, Calm and Off carry no visible noun, and a first-time visitor may need one press to learn
what they rule (the owner approved the three words alone; see the roadmap).

Pass bar: every criterion at least 6, weighted 9.0 of the 7 a sprint that owns the layout needs.

## Musts

None.

## Cheap changes

None. Everything from the early look is in.

## For the roadmap (not this sprint's)

1. **Forced colours with the model refused.** The loader won't mount under forced colours (B3.14),
   but the control still shows the stored or default mode pressed, so Full or Calm says something
   the page can't do until forced colours turn off. The no-WebGL state (Off pressed, the others
   disabled) is the truthful one; the counter-argument is that the choice should survive for when
   forced colours end. The contract chose persistence; a `disabled` pair with the choice kept in
   storage would give both. A later sprint, with Probe's forced-colours check rewritten for it.
2. **The three words alone.** `motion-control.webp` has no label and the owner approved it so; if
   the B3 demo on the phone shows a moment's hesitation, a visually hidden "Motion" is already
   the group's name, and a visible one is a 40 px word before the group from 1024 only.
3. **"Base" and "10" under the shadow's tail on the narrow sheet** (sprint 26's note), unchanged.

## Correction to `notes-iris.md`, section 8

Section 8 blamed the wide cold-cache wordmark on next/font's fitted fallback being fitted to an
average character width. Wrong: next/font's fitted fallback for the condensed face had one
source, `local("Arial")`, and on a device without Arial (Android, Linux, this machine's headless
Chromium) the browser skipped it and fell to the generic sans at full size, 97 px for "Theseus"
against 62. That, not the fit, ate the phone bar's air; on a Mac, Windows or iPhone the fitted
fallback applied and the bar held. Forge's fix (`624a149`) declares the fallback face with
next/font's metrics over Arial, its metric twins Liberation Sans and Arimo, and Roboto, so every
system keeps the lines. Measured with the fonts refused: the mark 57 px at 320 and 390, all four
links 44 px tall on one line, no sideways scroll. The mark is synthetic bold from the regular, so
it reads a little light on a cold cache only; acceptable.

## What the frames show (`.crew/screenshots/sprint-27/review/`)

- `first-{320,390,768,1024,1440}-{light,dark}.png`: the first screen on the build at each width
  and scheme, model settled, Full pressed.
- `control-1440-full.png`, `-hover-off.png`, `-focus-calm.png`, `-calm.png`, `-off.png`: the bar's
  right end at 1440 light through the control's states.
- `forced-390-dark-rest.png`, `-focus-full.png`, `-calm-pressed.png`, `forced-390-light-rest.png`,
  `forced-1440-light-calm-pressed.png`, `forced-390-dark-first.png`: forced colours on the final
  build, the label reading in both system themes, the ring on the pressed cell, the cell moving.
- `nogl-390-light.png`, `nogl-1440-dark.png`: no WebGL 2, Off pressed and the others disabled.
- `noscript-390.png`, `noscript-1440.png`: scripts off, the empty slots.
- `reduce-390-light.png`: reduced motion, Calm pressed, settled.
- `reflow-320-real.png`, `reflow-320-fallback.png`, `reflow-390-fallback.png`: 320 and 390 with
  the real face and with the woff2 refused.
- `cmp-*.png`: the side-by-side diffs (red would be a differing pixel; blue the masked band):
  `cmp-390-light-top.png` and `-below.png`, `cmp-320-dark-below.png`, `cmp-768-dark-first.png`,
  `cmp-1024-light-first.png`, `cmp-1440-light-first.png`, `cmp-1440-dark-scroll900.png`,
  `cmp-read-1440.png`, `cmp-thispagedoesnotexist-390.png`.
- `gates.json`, `compare.json`: the measurements behind the tables.
- `../early/`: the early look's frames (the loft against the slot, Off mid-loft, the forced-colours
  fault and its fix tried, the fallback before Forge's fix). `../part1/`: production and my mock.

## Not verified

- The loft's feel at 60 fps and the 413 ms rebuild on a real GPU; SwiftShader frames only. The
  B3 demo on the owner's phone is the test, as the contract says.
- Flex layout on a fieldset in Safari and the control on iOS: no WebKit here.
- Disabled buttons in forced colours: needs a no-WebGL device toggling high contrast mid-visit.
- The condensed fallback on an Android device with Roboto: inferred from the declaration, measured
  only with Liberation Sans.
- The e2e suite: Atlas is running it in the main checkout; I didn't.
