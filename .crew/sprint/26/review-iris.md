# Sprint 26 review (Iris): the hull on phones and tablets

**Verdict: ship, 8.8/10.** Better than production at 390 and 320, pixel-identical at 1440 and
1024; every hard gate passes; my early-look change (the phone's growth on e², decision 9) landed
and the swell is gone; no musts and no cheap change to the sprint's code. Two faults I found are
production's today and untouched by this sprint (the fallback face at 320 and 390); they go to the
roadmap below, with the one composition note on the narrow sheet.

Reviewed on `cb99e36` (`origin/sprint/26-phones`, the final head Atlas named), built in my worktree
`/home/user/wt-iris-26` and served at http://localhost:4720/. Playwright's Chromium (`@playwright/test`
1.64, SwiftShader) with the viewport, DPR, scheme, reduced motion and forced colours emulated:
390 × 844 and 320 × 568 at DPR 2 with touch, 768 × 1024 at DPR 2, 1440 × 900 and 1024 × 768 at DPR 1,
light and dark, beside production (https://theseus-portfolio.vercel.app) at the same viewports,
against `rest-390.webp` and `hero-390.webp` (`.crew/sprint/17/design/`), `s5-loft-390.webp`
(`.crew/sprint/24/spike/frames/`), my call (`notes-iris.md`), the contract, `design/rubric.md` and
the owner's calibration. Motion was judged from frames at true times on Playwright's clock (each u
is the frame drawn at `begin + u × 2,400 ms`, within one 16 ms tick) and the reduced-motion fade by
holding its transitions and seeking them, since a still can't show either. The chrome-devtools MCP
can't start Chrome as root in this session, so every capture is Playwright's.

Evidence: `.crew/screenshots/sprint-26/final/` (git-ignored); the early look's frames on the
previous head are in `.crew/screenshots/sprint-26/`. The scripts (`look.mjs`, `gates.mjs`,
`font320.mjs`, `tr320.mjs`, `sim/`) are in my scratchpad,
`/tmp/claude-0/-home-user-theseus-portfolio/8b425e9a-9c7f-5062-b9c7-234de1940257/scratchpad/`.

## First verdict: compared with production

**Better** at 390 and 320; **the same** at 1024 and 1440.

- **390 and 320.** Production is the narrow sheet, the profile and the half-breadth plan, with no
  model (`phone-light-prod.png`). The build lands the card model on that profile so nothing seems
  to change (the Off sheet against frame 1: only the hull's own lines differ, by antialiasing;
  `diff-phone-light-handoff.png`), lifts it in one move and settles it at three-quarters over the
  hollow profile, its shadow on the half-breadth plan: the desktop's picture at the phone's scale,
  the hull as long as the drawing it left (`strip-phone-light-b.png`, `phone-light-settled.png`,
  `strip-small.png`). The Off page (WebGL refused) is production's: 0 pixels differ over the sheet
  in either scheme with the font warm.
- **1024 and 1440.** 0 pixels differ from production, settled, over the sheet and over the whole
  viewport (`early-….json`, `diff`: 1440 × 900 and 1024 × 768, light); the model's coverage boxes
  are the same to the pixel in both schemes (hull 117,119 to 815,288 at 1440; 73,84 to 576,204 at
  1024). `strip-desk-light.png`, `strip-desk-dark.png`, `strip-laptop.png`.
- **768** is new (production shows the three views without a model): the 1440 composition at
  0.545, bow at station 9.1, the shadow on the half-breadth plan, the body plan untouched
  (`strip-tablet.png`).

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | None: the diff adds no `TODO(owner)` or stand-in (`git diff main...cb99e36 -- app components content lib`). |
| axe, no serious or critical | 0 violations of any impact at 390 and 1440, light and dark, with the model at rest (tags wcag2a/aa, 2.1, 2.2aa, best-practice; 1 "incomplete" each, as before) (`gates.json`). |
| impeccable detector, nothing at error | `[]` over `app/globals.css`, `components/model.tsx`, `app/page.tsx`, `app/read/page.tsx`, `components/title-block.tsx`, `components/revisions.tsx`. |
| Reduced motion | Opens `settled` at 390 in both schemes; the only motion is the 240 ms crossfade, the canvas in and the fills out together, so the hull never empties; nothing is lost (`strip-reduce-light.png`, `strip-reduce-dark.png`). |
| Reflows at 320, no horizontal scroll | `scrollWidth` 320 at 320 × 568, settled (`gate-320-settled-view.png`). See the fallback-face note below. |
| Phone budget | At 390 × 844, 4× CPU and 400 kbps: LCP is the bio paragraph (text) at 1,712 ms light and 1,640 ms dark; CLS 0 with no shift entry over load + 2.5 s and through the loft to rest (`gates.json`). |

No console errors or page errors across the gate loads. Forced colours at 390: `[data-model]` has
no box (`display: none`), no canvas, and all 22 planks are filled in the system's colours
(`gate-forced-390.png`).

**The fallback face at 320 and 390, production's today.** On a cold cache the `display: optional`
text face isn't used on the first load, and in the fallback metrics the page scrolls 21 px
sideways at 320 (`scrollWidth` 341) and the nav's "Read as page" wraps to two lines at 390. The
build and production measure the same to the pixel in both states (`font320.mjs`: fonts blocked or
warm, 320 and 390, build and production), and the sprint's diff doesn't touch the rows involved
(`.rev` and the bar). I'm not holding it against this sprint, as the owner's placeholder rule
treats what production already has, but it fails the 320 gate's letter on a cold cache and it
should be the next layout fix: the only boxes past the viewport are inside the visually hidden
`.rev thead` (clipped), so the scrollable overflow is most likely the `td[data-label]::before`
nowrap labels in the two-column fold (`app/globals.css`, the `(width < 40rem)` rules).

## Score

| | Design quality ×2 | Originality ×2 | Craft | Functionality | Weighted |
|---|---|---|---|---|---|
| Production (sprint 25's review) | 9 | 9 | 8 | 9 | **8.8** |
| This build | 9 | 9 | 8 | 9 | **8.8** |

Calibration as in sprint 25: the owner's 04 (Lusion) 8.5, 02 (Messenger) 8.8, 03 (Oryzo) 9.0,
08 (the old site) 6.5. **Design quality 9:** on a phone the sheet and the model are the same
material and world as on the desktop, now at the width most of the board will open first: the card
lit on drafting film, its shadow on the plan, the drawing hollow under it, in the dark scheme the
grey card under the warm lamp with the black shadow dimming the plan's lines through it
(`zoom-phone-dark-settled.png`). **Originality 9:** the drawing becoming the thing it describes,
registered and lifted in one camera move, carried to every width without a phone-sized
compromise; the phone's own pose and growth keep the story (the model settles as long as the
drawing it left) rather than shrinking it. **Craft 8:** registration shown by the hand-off diff
(only the hull's lines differ); the hull's length within 5 px of its drawing at every held frame
of the phone move; the settled frame 20 px inside the canvas at 390 and 320 with no coverage on an
edge row or column; the seams at 0.9 px crisp at DPR 2; pixel-identical at 1440 and 1024. The
point withheld as in sprint 25 (the light hull's strakes against the canvas), and for the narrow
sheet's composition note below: the shadow's tail passing under "Base" and "10". **Functionality
9:** every fact reads without WebGL, scripts or motion at every width; the loft ends on any input;
reduced motion opens settled; LCP text within budget on the slow profile; CLS 0; axe clean; no new
Tab stop; forced colours and the Off paths intact.

## My early-look change, confirmed: the growth on e²

The hull's screen length through the phone move at 390 (the canvas alone, alpha ≥ 240, CSS px;
the solve's numbers run about 1.5 px inside these at each end, the outline's share):

| u | early look (`378e5d9`) | final (`cb99e36`) |
|---|---|---|
| frame 1 | 313 (19.5 to 332.5), 60 tall | 313 (19.5 to 332.5), 60 tall |
| 0.04 | | 315 (17.5 to 332.5), 60 |
| 0.08 | | 316.5 (16.5 to 333), 61 |
| 0.12 | 336 (6.5 to 342.5), 66 | 317.5 (15.5 to 333), 62.5 |
| 0.15 | solve: 335.6 (6.6 to 342.1) | 317.5 (15.5 to 333), 63.5 |
| 0.18 | | 317.5 (15.5 to 333), 64.5 |
| 0.25 | 332 (8.5 to 340.5), 70 | 317.5 (15.5 to 333), 67.5 |
| 0.35 | | 315.5 (17 to 332.5), 69.5 |
| 0.5 | | 313 (18.5 to 331.5), 72 |
| 0.75 | | 311.5 (19.5 to 331), 74 |
| settled | 311 (20 to 331), 74.5 | 311 (20 to 331), 74.5 |

The stern never goes left of 15.5 (it reached 6.5, inside the page's 16 px gutter) and the bow
never more than 1 px past the stem (it reached 342.5, 7 px from "DWL"); the tail of the move
shortens the hull 6 px, not 21. Frame 1 and the settled frame are the early look's to the pixel, so
decision 7's numbers stand. `zoom-phone-light-u015.png` is the former peak: the hull inside its
drawing, lifting and turning, the station numbers 3 to 8 still showing under the keel. Pixel's sim
said 309.9 to 317.1 px; the screenshots agree once the outline is allowed for.

## Musts

None.

## Cheap changes

None to the sprint's code: the four things the early look was to check (the far-side sliver, the
dark hull and shadow, the labels under the tail, the hand-off) need no change, and the constants
stay as called (`G_NARROW` 0.25, `SETTLE_NARROW` dx 0 dy 26 yaw −36 pitch 16, `SHADOW_BLUR` 2,
`SHADOW_DARK` 0.6, `DARK_LIGHT`).

## For the roadmap (not this sprint's)

1. **The fallback face at 320 and 390** (above): the 21 px sideways scroll at 320 and the nav's
   wrap at 390 on a cold cache, on production today. The next layout sprint.
2. **"Base" and "10" under the shadow's tail on the narrow sheet.** At 390 the tail's hard edge
   reaches x 362.6 and its blur 365.5, under "10" and the first half of "Base" (x 349 on); the
   lettering stays crisp above the canvas and reads as a shadow on the sheet, but the label
   straddling the shadow's edge is the one thing on the phone's settled frame I'd still compose
   away (`zoom-phone-light-settled.png`). dx −4 doesn't clear it (it would take −14, the stern off
   station 0), so it's the sheet's call, not the model's: the DWL and Base labels could sit 8 px
   higher on the narrow layout, or the tail could be clipped at the Base line. For the narrow
   sheet's next pass, with the owner, since the sheet is theirs (#62).

## What the frames show (`.crew/screenshots/sprint-26/final/`)

- `strip-phone-light-a.png`: production at 390 | the build with WebGL refused | frame 1 | u 0.04 |
  u 0.08. The sheet unchanged across the hand-off; the lift beginning inside the drawing.
- `strip-phone-light-b.png`: u 0.12, 0.15, 0.18, 0.25, 0.5, settled. The hull turns and grows in
  height while its ends stay on station 0 and the stem.
- `diff-phone-light-handoff.png`: the Off sheet against frame 1, amplified ×12: only the hull's
  lines.
- `phone-light-settled.png`, `zoom-phone-light-settled.png`: the settled frame at 390 light and its
  hull and shadow at 2×.
- `zoom-phone-light-u015.png`: the move's widest frame, the hull inside its drawing.
- `strip-phone-dark.png`, `phone-dark-settled.png`, `zoom-phone-dark-settled.png`: frame 1, u 0.12,
  u 0.25 and settled in dark; the grey card under the lamp, the black shadow over the plan.
- `strip-small.png`: 320: frame 1, settled light, settled dark (hull 253.5 × 61 at x 19 to 272.5,
  rows 57 to 118; shadow to 297.5, 20 px clear).
- `strip-tablet.png`: 768 settled, light and dark, at half scale.
- `strip-desk-light.png`, `strip-desk-dark.png`, `strip-laptop.png`: the build over production at
  1440 light, 1440 dark and 1024 light, settled: the same.
- `strip-reduce-light.png`, `strip-reduce-dark.png`: the fade held at 0, 120 and 240 ms, then
  released.
- `gate-forced-390.png`: forced colours at 390: the whole drawing in system colours, no model.
- `gate-320-settled-view.png`: the 320 × 568 viewport settled.
- `phone-light-settled-view.png`: the 390 × 844 viewport settled.
- `gates.json`, `early-….json`: the gate numbers; every coverage box, state and diff count.

## The guidelines pass (`web-design-guidelines`) over the files the sprint changed

No findings. `components/model.tsx:52`: the layer is `aria-hidden` and `pointer-events: none`,
adds no Tab stop and no handler. `app/globals.css`, "The model": the transitions list their
properties (opacity, visibility, fill), run under `prefers-reduced-motion` only and on screen
without forced colours; the 2.4 s loft is under the 5 s autoplay bar and ends on any input; the
layer is `display: none` for print and forced colours. `app/page.tsx` and `app/read/page.tsx`
change an import; `title-block.tsx` and `revisions.tsx` carry sprint 25's margins.

## What I couldn't verify

- Frame rate, the DPR ladder and the still frame on a GPU or a phone: SwiftShader here. The
  stepping rule did show itself: with my captures and the gate runs sharing the CPU, the loft at
  390 and 1440 ended `still` in the axe runs and `settled` when run alone (`gates.json`,
  `early-….json`), which is the rule as designed; the B3 demo on the owner's phone is the test.
- The feel of the e² growth in motion at 60 fps: inferred from eleven held frames and the solve.
- The exact box behind the 320 fallback-face scroll (the nowrap labels are the likely one; the
  measurement is certain, the cause is not).
