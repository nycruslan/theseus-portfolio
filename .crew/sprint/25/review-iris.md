# Sprint 25 review (Iris): B3's first build, the hull lifts off the drawing

**Verdict: ship, 8.8/10.** Better than production at 1440 and 1024 and pixel-identical at 390 and
320; every hard gate passes; my three early-look changes landed as called; no musts. One cheap
change below (the dark hull's tint), which I'd take before the owner sees the preview, and one
watch item for Pixel and Probe. The owner's two decisions on the PR (the stack, batch E) are
theirs; this verdict is on the build.

Reviewed on Pixel's served production build at http://localhost:4620/, which Atlas says is a copy of
`sprint/25-the-loft` at `878d172`; the three constants my early look changed are all in it (the
stern clear of the sheet, the bow at station 9.1, the fills fading under reduce), so it is the
final code. Playwright's Chromium (SwiftShader, DPR 1 unless said) at 1440 × 900 and 1024 × 768,
light and dark, with reduced motion, with WebGL refused (the Off page), at DPR 2, and at 390 and
320, beside production (https://theseus-portfolio.vercel.app, the Off sheet without the model) at
the same viewports, against `loft.webp`, `main.webp`, `night-1440.webp` and `motion-off.webp`
(`.crew/sprint/17/design/`), the contract, `design/rubric.md` and the owner's calibration. Motion
was judged from frames at true times on Playwright's clock, as Probe's harness drives it, and the
reduced-motion fade by pausing its transitions and seeking them: a still can't show either.

Evidence: `.crew/screenshots/sprint-25/iris/` (git-ignored; what each file shows is beside the
claim it supports). The full frame sets, the measurements and the scripts (`look.mjs`,
`measure.mjs`, `bow.mjs`, `site.mjs`, `axe.mjs`, `perf.mjs`, `diff.mjs`, `probe-remove.mjs`,
`extra-review.mjs`, `review-fanout.sh`) are in my scratchpad,
`/tmp/claude-0/-home-user-theseus-portfolio/00f4ff90-54c6-5bf0-a38a-38f63511c33a/scratchpad/iris/`
and its `review/` folder.

## First verdict: compared with production

**Better** at 1440 and 1024; **the same** at 390 and 320.

- **1440.** Production is the sheet with the inked profile (`prod/1440-light.png`). The build lands
  the white card model on that profile so nothing seems to change, lifts it in one move and settles
  it at three-quarters with its shadow on the half-breadth plan, the drawing hollow behind it
  (`build/1440-light-settled.png`, `build/1440-dark.png`, `1440-light/loft-strip.png`): the
  direction's signature moment, as `main.webp` and `loft.webp` draw it.
- **1024.** The same, and the bottom row now fits the fold: production's Contact links end at 914
  px in a 768 px viewport, the build's at 729 (`prod/results.json`, `build/results.json`; call 9
  and batch E). `build/1024-light.png`, `build/1024-dark.png`.
- **390 and 320.** 0 px differ from production, over the viewport and the full page
  (`diff.mjs` on `prod/` and `build/`: 390 light full page, 320 light full page, 390 dark).
- **The Off page** (WebGL refused) differs from production only in the bottom row, where batch E's
  one-line descriptions and the row's minimum height move things (`build/diff-off-1440-light.png`,
  `build/diff-off-1024-light.png`). The 1440 light capture also differs in the bar and the name,
  where production rendered the condensed face's fallback (`build/bar-diff.png`): the optional font
  on a slow first load through this machine's proxy, which the dark capture a moment later didn't
  show. Not the sprint's.

## Score

| | Design quality ×2 | Originality ×2 | Craft | Functionality | Weighted |
|---|---|---|---|---|---|
| Production (B2, sprint 23's review) | 9 | 8 | 8 | 9 | **8.5** |
| This build | 9 | 9 | 8 | 9 | **8.8** |

Calibration: the owner's 04 (Lusion, "a calm frame around one rich 3D scene") is 8.5, 02
(Messenger) 8.8, 03 (Oryzo, "one object, rendered with real weight") 9.0; 08 (the site before the
redesign) 6.5. **Design quality 9:** the sheet and the model are one material and one world, the
card lit softly on drafting film, its shadow at the canvas's darkness (−32 levels on the film, the
same as `main.webp`), the drawing going hollow under it as a lines plan does; the 10 waits for the
dark scheme to match the approved night frame (the cheap change) and for B4's states to give the
hull its meaning. **Originality 9**, up from 8: a drawing that becomes the thing it describes,
registered to the pixel and lifted in a camera move, is the direction's one idea carried through,
and nothing in it reads as a template, a three.js demo or a CAD export; a 10 is Messenger's or
Lando's world-building, which one page with one moment isn't yet. **Craft 8:** registration
within a pixel in both schemes, the grow within 0.3% at every held frame, the hand-off changing
0.4% of the drawing's pixels and no number or fill, the reduced-motion crossfade with nothing
emptying; the point withheld for the dark hull's tint against the approved frame and the light
hull's strakes running about 20 levels lighter than the canvas's. **Functionality 9:** every fact
reads as before without WebGL, scripts or motion; the loft is skippable by any input and opens
settled under reduce; LCP stays text at 212 to 372 ms at 4× CPU with the model loading; CLS 0;
axe clean; no new Tab stop.

## My three early-look changes, confirmed

1. **`LIFT 90`, `SHADOW_BLUR 2`, the shadow drawn first in the opaque pass.**
   `1440-light/ends-3x.png` (the build's stern at 3× beside the canvas's): the stern's keel stands
   clear of the sheet, the lobe lies below and to the right of it, and nothing on the hull is tinted
   or haloed; `1440-light/settled-alpha-x4.png` and `1440-dark/settled-alpha-x4.png` show the
   footprint (the canvas's alpha × 4, the hull in red) with the lobe's edge soft and separate.
2. **`SETTLE.dx −30`.** The settled bow is at station **9.11** at 1440 (x 831 against the drawing's
   bow at 902.9: 72 px clear) and 9.14 at 1024, the stern at station 0.51 (`bow.mjs` on the
   canvas-only frames at three alpha thresholds). My note said 9.2; 9.1 is what −30 gives, and it
   is `main.webp`'s: the settled hull is 0.863 of the drawing's length (the canvas 0.86) and 1.116 of
   its height (1.10).
3. **The dark reduce crossfade.** `reduce/fade-strip-dark.png`: at 120 ms the canvas is at 0.5, the
   numbers at 0.5 and the fills at 50% alpha; at 240 the fills are `transparent`, the numbers
   hidden and the model whole. The hull never empties. Under reduce the page fires 67
   `transitionrun`s (the canvas, 22 numbers × opacity and visibility, 22 fills), all 240 ms linear;
   under no-preference `document.getAnimations()` is 0 once settled. `reduce/fade-strip-light.png`
   is the light scheme's.

## The two watch items from the early look

- **The dark hull's tint.** Measured: the upper strake 159,177,186, the mid 137,153,161, the lower
  102,113,119 (`1440-dark/measure.json`, `card`); the approved `night-1440.webp` hull is 123,131,131
  and 128,135,136. The build keeps the dark `--card` token's hue (#58646a, itself blue-grey) and
  the ×4 gain lifts its chroma with its lightness, so the hull reads as blue steel on black
  (`1440-dark/settled-vs-canvas.png`, the three panels). That is a cheap change below, not a must:
  one constant.
- **The shadow's edge at `BLUR 2` at 1024.** `1024-light/settled.png`: one soft lobe, its edge
  about 14 px at 1024 (texel 2.29) against about 20 at 1440 (texel 3.25), no banding, inside the
  half-breadth plan and clear of the body plan. Fine.

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | None: the diff of `app/`, `components/`, `lib/` and `content/` against `main` has no `TODO(owner)`, stand-in or lorem; the sprint adds no text but its CSS comments. |
| axe | 0 violations in 8 runs with the model at rest: 1440, 1024 and 390, light and dark, and 1440 light and dark under reduced motion, C9's tags (`gates/axe.json`; `color-contrast` is incomplete, axe's usual on text over the drawing, as on C9). |
| impeccable detector | `[]` over the 14 files the sprint changed in `app/`, `components/` and `lib/`. |
| Reduced motion | Opens `settled` with no `landed` or `lofting` state (`reduce/`'s `report.json`: `settled@663`); the only transitions are the 240 ms fade under `reduce`, and nothing is lost: the model shows the same planks the numbers named, as a Full visitor sees them after 2.4 s, and the Off page, print and `/read` keep the numbers. |
| 320 px | `scrollWidth` 320 = `clientWidth`; identical to production (`build/320-light.png`). |
| Phone budget | At 4× CPU: LCP 372 ms light and 288 dark at 390 × 844 (the bio paragraph, text, in `main > header`); 212 and 268 at 1440 (the h1), the model loading; CLS 0 over load + 3 s in all four (`gates/perf.json`). |

## Against the contract and the frames (what I judged)

- **Frame 1 (B3.1).** The landed hull's box is 92 to 903 by 167 to 321 against the drawing's 92.9
  to 902.9 by 167.9 to 321.1, in both schemes, at every alpha threshold: within a pixel at DPR 1
  (`1440-light/measure.json` and `1440-dark/measure.json`, `framed.landed`; `bow.mjs`: the bow at
  station 10.00). At DPR 2 the box is the same and the model's seam is drawn at 1.8 device px: 4
  rows peaking at L53 against the drawing's 3 rows peaking at 26, 12% less ink
  (`1440-light/seams-dpr2.png`, the two at device pixels).
- **The hand-off.** 2,884 of 669,256 pixels in the drawing's box change by more than 48 levels in
  light (0.43%) and 524 in dark, against S4's 4,891: `1440-light/handoff-diff.png` has them all on
  the outline's and seams' anti-aliased rows, no number and no fill. At 1024: 2,194 and 1,050 of
  331,650.
- **The loft (B3.2).** On the clock: `landed@48 > lofting@64 > settled@2448`, 2,400 ms from the
  landed frame. The framed height follows (1 + 0.1e) × frame 1's within 0.3% at 600, 1,200, 1,800
  and 2,400 ms at 1440 and within 1.1% at 1024 (`measure.json`, `framed`). `1440-light/loft-strip.png`
  and `1024-light/loft-strip.png`: the first lofting frame is the registered drawing to the eye,
  the lift reads from 67 ms as a doubled sheer, the turn from 170, three-quarters by 430, 87% by
  1,000, and the last 400 ms are a settle. No pop at the start, no creep at the end.
- **Under the model.** Hollow from the first lofting frame: fills transparent, numbers and leaders
  hidden, as `loft.webp`'s frames 2 to 5; the 22 labels go under the model's face (it has moved 0.2
  px), as call 5 accepted.
- **The light hull against `main.webp`.** Strakes 227 / 218 / 180 against the canvas's 205 / 189 /
  160, the deck 227 against 239, the bow 215 against 224 (`1440-light/measure.json`, `card` and
  `reference`; `extra-review.mjs` hand samples). The shadow's lobe averages −32 levels on a 233 film
  (the canvas: −32 on 239), its darkest tenth −39. The spike's rig as call 6 kept it: lighter than
  the canvas by about 20 levels on the strakes, which reads as card on film and clips nothing.
- **The dark hull against `night-1440.webp`.** The lightness is the call's (gain 4); the hue isn't:
  the cheap change.
- **1024 (call 7).** The 1440 pose scaled by the drawing: the hull 503 × 120 px, bow at 9.14, the
  shadow inside the half-breadth plan, the body plan clear, the "Profile" caption clear of the deck
  (`1024-light/settled.png`, `1024-dark/settled.png`). The bottom row fits the 768 fold.
- **The bar, the title block and the revisions** never change a pixel from frame 1 to settled
  (`loft-strip.png` crops the sheet; the full frames in `1440-light/`).
- **Console.** No error in any run; three's warnings are SwiftShader's (`KHR_parallel_shader_compile`,
  `ReadPixels` stalls).

## Changes

### Must

None.

### Cheap

1. **Dark scheme: warm the rig, so the lifted hull is card under a lamp, not blue steel.**
   `DARK_LIGHT = "#fff4e7"` in `lib/model/calls.ts` beside `DARK_GAIN`, and in `lib/model/stage.ts`
   `paint()`: `sky.color.set(palette.dark ? DARK_LIGHT : 0xffffff)`, the same on `fill.color` and
   `sun.color` (the hemisphere's ground colour stays `--background`). Why: the lifted hull in dark
   is the `--card` token's blue-grey lit ×4, so its chroma comes up with its lightness: the upper
   strake is 159,177,186 (blue − red 27) where the approved night frame's is 123,131,131 (8), and
   on black it reads as the lit blue-grey hull of every CAD viewer rather than the direction's
   white card (`1440-dark/settled-vs-canvas.png`). With the warm light the same strake comes to
   about 159,169,168 (the gain-4 lightness kept; the light is the canvas's hue ratio applied to the
   build's), the mid to about 137,146,144. The flat-to-lit mix is 0 at frame 1, so the hand-off and
   B3.7's frame-1 check don't move; B3.7's copper check doesn't either (ΔE from #ee8f63 stays far
   above 10). I'd take it in this PR if Pixel is in the file: it is the first time the owner sees
   the model in dark. Otherwise sprint 26, with the phone's model.

### Watch (no change asked)

- **Once in seven headless loads at 1440 dark, the model tore itself down between a viewport
  screenshot and a full-page one.** `site.mjs`'s first run: `build/1440-dark.png` shows the model
  at rest, the full-page frame taken a moment later shows the complete Off sheet with its fills and
  numbers (`review/build/1440-dark-full-top.png` in the scratchpad), and `build/results.json`'s
  `canvas: false`. `stop()` is the only path that removes the canvas, and it also deletes
  `data-state`, so the hollow rule stopped matching and the visitor's page was the drawing, whole:
  a safe failure. Six repeats of the same sequence and `probe-remove.mjs` (which logs every resize
  and `[data-model]` mutation across the capture) didn't reproduce it; the one resize a full-page
  capture fires reports 1440 × 900 with the wide query matching. B3.8's resize checks hold in the
  suite. For Pixel and Probe: which caller of `stop()` can fire at rest with no narrow resize
  (`refit`'s media query, `pagehide`, the effect's cleanup, `build().catch`), and a reason written
  on the host when `stop()` runs would make the next one explainable.

## Web Interface Guidelines audit (the sprint's files)

- `components/model.tsx:52` - the layer is `aria-hidden="true"` with `pointer-events: none`; the
  canvas is decorative media hidden from assistive tech and adds no Tab stop. Pass.
- `components/model.tsx:20-36` - the `matchMedia` and the probe run in an idle callback after
  `load`, not in render; no layout read in render. Pass.
- `lib/model/mount.ts:122-140` - `measure` reads both rects before `apply` writes the canvas's
  style, inside observers and `requestAnimationFrame`: reads and writes batched. Pass.
- `lib/model/mount.ts:168-176` - the skip listeners are passive and capture, none calls
  `preventDefault`: the key, the click and the scroll keep their work, and the move is
  interruptible. Pass.
- `app/globals.css`, "The model" - the only transitions name their properties (`opacity`,
  `visibility`, `fill`, 240 ms linear) and exist under `prefers-reduced-motion: reduce` alone; no
  `transition: all`; the loft itself honours reduce by not running. Pass.
- `app/globals.css`, `.rev tbody td:not([data-label])` from 64rem - `text-overflow: ellipsis` (the
  real `…`) with `max-width: 0`, so the column keeps its width and the full goal stays in the DOM.
  Pass.
- `components/revisions.tsx`, `components/title-block.tsx` - class and margin changes only;
  headings, links and the table's semantics unchanged. Pass.
- Not applicable: forms, images, locale, hover states (no new control this sprint).

No findings.

## What waits for later sprints

- Phones and the model's scale on the narrow sheet (sprint 26); the Full/Calm/Off control (27);
  the graphite, copper and vellum states (B4), which give the hull its meaning and will bring the
  light hull's lightness back into question where card meets copper.
- The title block's empty film at 1024 to 1279 (sprint 22's note) is gone: the five-line bio and
  the Contact row fill it (`build/1024-light.png`).

## What I couldn't see without a GPU

- **The feel of the move in real time.** Every frame is SwiftShader at its true clock time; the
  ease and the 2.4 s are what the owner judges on the preview.
- **The DPR ladder and the `still` net on real hardware.** On the clock no frame is slow, so
  nothing stepped; in real time at 4× CPU SwiftShader every loft ended `still` at about 600 ms (the
  contract's net), which a GPU won't do.
- **The fat lines' antialiasing** (SwiftShader's MSAA is software; the seams' edge may differ on a
  GPU), the dark gain and the warm light on a real display.
- **INP for a key press mid-loft** (B3.9 reports it). The long tasks at 4× were 254, 180 and 113
  ms from 1.3 s (the scene's build and first frames under SwiftShader), after the page's own 356 ms
  hydration task, which the 390 page has too at 233 to 259 ms without the model (`gates/perf.json`).
