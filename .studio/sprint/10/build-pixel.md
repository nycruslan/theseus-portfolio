# Sprint 10, step 2: Pixel's build of the hero's Part B

**All of `e2e/` passes on the sandbox's Chromium 141 (63 passed, 1 skipped, the pre-existing
`TODO(owner)` skip), and `pnpm verify` is green.** The WebGL hull is a hand-written renderer (no
dependency) built from the same geometry as the SVG, butt joints included. Contract:
`.studio/sprint/9/contract.md`; the specs' hooks: `.studio/sprint/10/probe-checks.md`.

## What changed

- `components/hero-upgrade.tsx` (client, first load): the box (`[data-hero]`) and the gate. After
  `load`, once the box is within one viewport height (`IntersectionObserver`, `rootMargin
  innerHeight px 0px`), in idle time (`requestIdleCallback`, 2 s timeout, `setTimeout` without it),
  and only with no reduced motion, no Save-Data, `hardwareConcurrency` and `deviceMemory` each
  undefined or at least 4, and a throwaway `getContext("webgl", { failIfMajorPerformanceCaveat:
  true })` that is granted (then freed with `WEBGL_lose_context`), it `import()`s the renderer. No
  shader code; a failed chunk load leaves the SVG.
- `components/hero-gl.ts` (the chunk): `mountHull(box)`. One `webgl` context (the caveat flag again,
  `OES_standard_derivatives`), one `drawArrays` per drawn frame, no depth buffer.
  - **Mesh:** each lift is a strip of quads between its seams in board space (x, depth), 96
    cosine-spaced columns plus the gradient stations, butts and corners, z from `halfBreadth`; the deck
    is a strip from the board to the gunwale. The vertex shader does the SVG's projection with the
    shear as a uniform (`y + shear * z`). Seen from below (shear 0 or less) the deck is behind the
    hull, so only the lifts are drawn and nothing overlaps: no depth test needed.
  - **Tones:** read from the SVG itself: each lift's computed `stop-color`s at its path's `getBBox()`
    span, the deck's and the copper plank's `fill`, resolved to sRGB through a 1 px 2D canvas, baked
    per vertex (columns at every station, so the sRGB interpolation is the SVG gradient's exactly).
    A `prefers-color-scheme` change rebuilds them.
  - **Seams and butts:** the SVG's 1 px ground-coloured stroke as alpha: each band carries `v` (0 to 1
    across) and `e` (distance to its nearest butt or the transom at x = 0), and the fragment shader
    fades within half a CSS pixel of either via screen derivatives (`clamp(d - (0.5 dpr - 0.5))`).
  - **Shear:** `0.24 - 0.48 * clamp(scrollY / box bottom)`; `data-hero-shear` holds it to 3 decimals
    (rounded first, so the middle reads `0.000`).
  - **Loop:** a scroll wakes a rAF loop that draws only when the pose (or size or placement) changed
    and rests after 30 frames with nothing new; back-to-back frames more than 50 ms apart three times
    in a row freeze it for the page's life. A later resize or scheme change on a frozen canvas puts the
    SVG back (a frozen canvas can't be redrawn).
  - **Swap:** the canvas covers the box (`position: absolute; inset: 0`), is drawn before its first
    paint, fades in by CSS (`transition: opacity 200ms` with `@starting-style`), then the SVG is
    hidden (`transitionend`, 400 ms fallback). `webglcontextlost` removes the canvas and the
    attribute and shows the SVG.
- `lib/half-model.ts` now holds only the hull's geometry (exports added); the SVG's path builders and
  light moved, byte for byte, to `lib/half-model-svg.ts`. Checked: `halfModel` is identical
  (5,648 chars of JSON) before and after. Why: Turbopack kept the old module's top-level path work,
  and the chunk was 4,192 B gzip with it, 3,387 B without.
- `app/globals.css`: the box is `8 + 130 s` px below the breakpoint (`--hero-length` is the hull's
  length, shared with `.hero-model`), 688 x 138 from `@container (width >= 48rem)` (built as
  `@container (min-width:48rem)`), `position: relative`, and the canvas rules.

## Measured (sandbox Chromium 141, production build, devicePixelRatio 1)

| | value | check |
|---|---|---|
| chunk, the one script after load | 6,968 B raw, **3,491 B gzip** | C15.1: at most 15,360 |
| first load `/` minus `/_not-found` | 136,730 - 135,890 = **840 B gzip** | C15.2: at most 2,048 |
| first load `/`, raw (`route-bundle-stats.json`) | 460,063 against main's 458,689: +1,374 B | none |
| chunk request after `loadEventEnd` | +43 ms (1x), +210 ms (4x CPU) | C10.1: 0 to 5,000 |
| canvas after the chunk request | +37 ms (1x), +171 ms (4x) | C10.1: at most 5,000 |
| CLS, rect before and after the swap | 0, identical | C10.2 |
| `[data-hero]` outerHTML with the canvas up | 6,600 B | C15.3: 8,192 |
| draw cost while scrolling (1440, SwiftShader) | median under 0.1 ms; frames 16.7 ms, max 16.8 | none |

C13, canvas at rest against the JS-off SVG (`scratchpad/px/m/measure.spec.ts`; the spec runs 1440 and
390, I added 768, 600 and 320):

| scheme, width | edges (canvas minus SVG, l t r b) | stray px (limit) | mean diff | copper median | loud |
|---|---|---|---|---|---|
| light 1440 / 768 | 0 0 0 0 | 0 (94) | 1.38 | 0 0 0 | 0 (max 2.35) |
| light 600 | 0 0 1 0 | 0 (72) | 2.93 | 0 0 0 | 0 |
| light 390 | 0 0 1 1 | 1 (38) | 3.61 | 0 0 0 | 0 |
| light 320 | 0 0 0 -1 | 0 (26) | 4.68 | 0 0 0 | 0 |
| dark 1440 / 768 | 0 0 0 1 | 0 (94) | 1.05 | 0 0 0 | 0 (max 2.80) |
| dark 600 | 0 0 0 -1 | 0 (72) | 2.00 | 0 0 0 | 0 |
| dark 390 | 0 0 0 0 | 2 (38) | 2.50 | 0 0 0 | 0 |
| dark 320 | 0 -1 0 0 | 5 (26) | 3.47 | 0 0 0 | 0 |

The butt joints cost nothing measurable in C13.2 (0 to 2 stray pixels at the spec's widths).

C11 (lit rows in the box, `fullPage` clip): at -0.24 the top air is **5 px** at 320, 390, 600, 768 and
1440 (2 to 7); at rest top and bottom air are 10/10 (1440, 768), 9/10 (600), 9/8 (390), 8/8 (320).
Lit x extent at +0.24, 0, -0.24: 32 to 654, 655, 655 at 1440.

C14.1: **+15 draws** in 0.5 s of wheel with the clock normal (at least 10), then +0 or +1 after the
slow clock, flat across four samples.

## Near a threshold, for CI's Chromium 156

- **C14.1's growth: 15 against at least 10** (the spike's reference got 24). This loop draws only when
  the pose changed, so it draws once per wheel event, about every 33 ms here (25 ms sleep plus the
  round trip). A slower runner sends fewer events in 0.5 s; 10 needs the round trip under 25 ms.
  Drawing every frame of a running loop would raise it but repaint identical frames, so I didn't.
- **C11.2's right edge: 654 at rest, 655 turned, against a spread of at most 1.** The SVG's own rest
  edge is 654 too (C13.1 right edge 0 at 1440): at rest the deck and top lift are each under a pixel
  thick at the bow tip, and both fade by the stroke. A 2 px spread would need pixel 656 lit, past the
  bow tip's geometry (x = 656.0).
- **C13.1: 1 px off at one edge** at 390 (light), 1440 and 768 (dark), against at most 1.

## Checked in a real browser (agent-browser, `--use-angle=swiftshader` so the canvas comes up)

1440 light at rest and mid-turn, 390 dark at rest and turned, a live switch dark to light with the
canvas up (it recolours), reduced motion at 1440 light and dark scrolled to 300 (SVG, no canvas, no
chunk). `next dev` (StrictMode): one canvas, `get_compilation_issues` and `get_errors` empty.
Screenshots in `scratchpad/px/shots/` (`ab-*.png`, `pose-*.png`, `c13-*.png`, `dpr2-*.png`), not in git.

## For Atlas, the retro and Iris

- **A CI-like local run.** Chromium 141 grants `failIfMajorPerformanceCaveat` with the launch flag
  `--use-angle=swiftshader`, so a scratch config with that in `launchOptions.args` runs the whole suite
  with the canvas up in every spec, as CI's 156 will: 63 passed, three times. Under that flag, with 4
  workers, `hero.spec.ts` C4's "pixels after a full scroll and back" fails 8 of 12 repeats, and fails
  9 of 12 on a build of `origin/main` too (no WebGL there): a raster artifact of the flag under load,
  not this change. One worker: 6 of 6 pass. Without the flag: 12 of 12.
- **Not verified:** CI's 156 itself, retina beyond a dpr 2 screenshot (`dpr2-gl.png`, which looks right;
  no spec), a GPU-backed context, Safari, Firefox, a real phone.
- **Iris (advice):** on a phone the turn runs while the hull is on screen (390 x 844: the box is at
  538 to 637, the turn ends at scroll 637), so most of it is seen; on a desktop the second half happens
  as the box leaves the top. That's the contract's mapping, not a choice I made.
- Lint: biome reads `gl.useProgram(...)` as a React hook (`useHookAtTopLevel`), so it's called through
  `.call`. `invariants.spec.ts` scans `components/` for `rgb(`, so no function may be named `rgb`.

## Fix round 1 (Lens's nit, Iris's items 1 and 2)

- **Colour reads (Lens):** `colourReader` reads each computed colour twice, over the fill styles
  `black` and `white`. If the two reads differ, or the colour isn't opaque, the colour didn't parse and
  the read gives null. `buildMesh` then returns null, so the page keeps the SVG (on a scheme change it
  comes back). No colour is reused from a previous read. Only the success path is exercised (C13 and the
  live scheme switch); I found no computed stop colour Chromium can't parse.
- **Print (Iris 1):** the SVG under the canvas now hides by a class (`hero-covered`), not an inline
  style, so `@media print` can hide the canvas and show the SVG without `!important` (biome's
  `noImportantStyles`). Emulated print with the canvas up at scroll 450 (shear -0.086): the canvas is
  `display: none` and the SVG `visible`, at rest (`scratchpad/px/shots/fix1-print-hero.png`).
- **Dither (Iris 2):** the fragment shader adds ±0.5/255 of interleaved-gradient noise per pixel
  before premultiplying. Run lengths along row 120 of the 1440 box at dpr 2: the canvas's median run
  is now **1 px** (SVG 1; Iris measured 8 to 9 before), and its longest is 19 light and 28 dark (SVG
  13 and 11; before: 153).
- **C13 again** (light / dark): mean difference 1.43 / 1.10 at 1440, 3.66 / 2.55 at 390 (was 1.38 /
  1.05 and 3.61 / 2.50; limit 8). Edges, stray pixels (0 to 5), copper medians (0) and loudest pixel
  (2.80) are unchanged at all five widths.
- **Weight:** the chunk is 3,648 B gzip by the spec's measure (was 3,491) and first load is +842 B
  against `/_not-found`. C14.1 is still +15 draws, C11 is unchanged.
- `pnpm verify` green; `PLAYWRIGHT_PORT=3377 pnpm test:e2e`: 63 passed, 1 skipped (the `TODO(owner)` one).
- Left as they are, per Atlas: the retina comb at the bow tip (Iris 3) and a frozen canvas going back
  to the SVG on resize.
