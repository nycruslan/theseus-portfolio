Verdict: ship 7.8/10 (DQ 8, Orig 8, Craft 7, Func 8). Better than production.

# Sprint 10: Iris's review of the hero's WebGL hull (PR #35 at c2829a1)

## How I checked

- **Production is unreachable from here** (curl returns 000, as in every sprint since 4). A production
  build of `origin/main` at 10bb2e7 stood in for it, served on :3382. The PR head c2829a1 was served on
  :3381. Both builds were in scratch worktrees, and I wrote nothing in the main checkout's `.next`.
- **Browser:** Chromium 141 launched with `--use-angle=swiftshader`, so the canvas comes up as it will on
  CI's 156.
- **Poses:** at 1440, 1024 and 390, in light and dark, at dpr 1 and dpr 2, I captured five poses: rest
  (+0.240), quarter (+0.120), mid (0.000), the last pose with the box wholly on screen (-0.140 at 1440,
  -0.165 at 390) and fully turned (-0.240).
- **Other runs:** reduced motion; a live scheme switch and a resize across the breakpoint with the canvas
  up; forced colors; print (`page.pdf`); JS-off SVG against canvas at dpr 2.
- **Files:** screenshots are in
  `/tmp/claude-0/-home-user-theseus-portfolio/21556357-4b15-5921-8079-7ae4eca9d7de/scratchpad/iris/shots/`.
  The pose boards are `board-{light,dark}-{1440,390}@2x.png` (rows: the five poses, then main's SVG). The
  scripts (`shots.cjs`, `gates.cjs`, `live.cjs`, `print.cjs`, `rows.cjs`) are one level up.

## Compared with production: better

At rest the page is production's: the rendered text is identical (I diffed the HTML text) and the hull
is the same object. Two things differ.

- **The 138 px box.** Experience moves up 34 px at 1440 and the hull's air matches the page's rhythm.
  This was my sprint 9 call, and it reads right in the running build at every width.
- **The turn.** As you scroll, the deck band thins and goes at the midpoint, and the seams straighten
  and then curve the other way. The silhouette's ends stay pinned, and the tones don't change.
  - It reads as walking past a model in a case, which is the direction (`.crew/sprint/7/direction-iris.md`).
    It isn't the object performing.
  - Keeping the tones constant is physically right, not a shortcut. Lambert shading doesn't depend on
    where the viewer stands, so when only the viewer moves, the light on the wood stays put.
  - It's quiet enough that nobody will mistake it for a "3D hero".

The canvas at rest can't be told from the SVG at 1x or 2x, in either scheme, at 1440 or 390. I put
`retina-*-{svg,canvas}.png` side by side and zoomed the bow and the copper plank to 6x. The 200 ms fade
is invisible because the two renders are the same. That's the hardest part of this build, and Pixel
nailed it, butt joints included.

## Hard gates: all pass

- **Placeholder:** none added. The rendered text is identical to main's, there's no `TODO(owner)` and no
  "Company name" in either build, and there are no new placeholder strings in `components/`, `app/` or
  `lib/`.
- **axe:** 0 violations of any impact with the canvas up, at 320, 390, 1024 and 1440, in light and dark,
  both at rest and scrolled to 300 (mid-turn).
- **Detector:**
  - On the changed files (`hero-upgrade.tsx`, `hero-gl.ts`, `hero.tsx`, `globals.css`, `page.tsx`): `[]`.
  - On the URL: one warning, overused-font (Geist). Main gets the same warning. Nothing is at error level.
- **Reduced motion:** no canvas, `data-hero-shear` absent, `document.getAnimations()` is 0 at 1440 and
  390 in both schemes. The box's pixels are byte-equal before and after a scroll at 1440. At 390 the PSNR
  is 62.8 dB, which is fractional-y rasterisation in the stitched full-page shot, not motion.
- **320 reflow:** `scrollWidth - clientWidth` is 0 at 320, 390, 1024 and 1440, in both schemes, with the
  canvas up.
- **Phone budget:** CLS is 0 in every run. LCP at 4x CPU is the bio `<p>`:
  - PR: 156 and 140 ms at 390, 128 and 148 ms at 1440.
  - Main: 120 and 132 ms at 390, 120 and 136 ms at 1440.
  - That's within run-to-run noise. The hull is never the LCP.

## Also seen working

- **Live scheme switch:** light to dark with the canvas up recolours it, and the copper keeps sprint 8's
  dark mix.
- **Resize:** resizing 1440 to 390 to 1024 redraws at the new box (390 x 99, then 688 x 138), with no
  stretched frame.
- **Forced colors:** the box is hidden. `data-hero-shear` then reads -0.240 because the hidden box's rect
  is 0. That's harmless and needs no action.

## Items

1. **Print should get the SVG, as the direction says. (Cheap.)**
   - My sprint 7 direction lists print among the cases where the SVG is the hero. With the canvas up,
     print gets the canvas: a 688 x 138 screen bitmap resampled onto paper, at whatever pose the reader
     had scrolled to. I printed at scroll 450 and got shear -0.086 (`print-hero.png`: the PR above, main
     below). Main prints the vector SVG at rest.
   - The fix is one rule in `app/globals.css`:
     `@media print { .hero canvas { display: none } .hero svg { visibility: visible !important } }`.
     The `!important` beats the inline `visibility: hidden` that `hero-gl.ts` sets.
   - No spec covers print, so this is a look check. Fold it into this PR if there's another push anyway,
     or put it first in the next sprint.
2. **Dither the shader's output. (Cheap.)**
   - Chromium dithers the SVG's gradients and WebGL doesn't, so the canvas's long, low-contrast lift
     gradients come out in visible 1-level steps.
   - I counted the length of each run of equal values along a pixel row through a lift at dpr 2. The SVG's
     median run is 1 px, so its value changes almost every pixel. The canvas's median run is 8 to 9 px,
     and its longest is 153 px. That's light row 120 and dark row 120 of `retina-*-1440-*.png`, and
     `band-light.png` shows it with the contrast stretched 5x.
   - At normal contrast it's at the edge of visibility. It shows most on the dark scheme on a good panel,
     which is exactly where a reader looking closely will be.
   - The fix: add ±0.5/255 of screen-space noise (an interleaved-gradient or hash dither) to
     `gl_FragColor.rgb` before output.
   - Re-run C13 afterwards. Half a level can't move its mean (8) or copper median (6) limits.
3. **The comb at the bow tip on retina. (Not cheap. Advisory, next pass.)**
   - At dpr 2, within about 5 CSS px of the stem head, the seam between the deck and the top lift shows a
     row of short light ticks (`tip-light.png`, the canvas is the lower half). The SVG's hairline there is
     clean. At dpr 1 it's clean too (`tip1x.png`).
   - It's the derivative-based seam fade on sliver triangles, where both bands are under a device pixel
     thick. One fix is to fade the band's own alpha by its on-screen thickness near the tip.
   - It needs a dpr-2 look to verify, and no spec covers it. Not for this PR.
4. **Pixel's question about where the turn happens: keep the contract's mapping. (No change.)**
   - Desktop and phone turn alike. The box sits at almost the same height at load: document y 525 to 663
     at 1440 x 900, and 538 to 637 at 390 x 844. So the box is still wholly on screen down to shear -0.14
     at 1440 and -0.165 at 390. That's 79% and 84% of the turn.
   - The second half, from 0 to -0.24, is seen with the box whole for 58% of it at 1440 and 69% at 390.
     The desktop doesn't lose it.
   - The last stretch arriving as the box leaves is a feature. At -0.24 the sheer flattens and droops
     toward the bow and the hull reads slightly hogged (row 5 of the boards). That pose should be seen
     in passing, not composed for.
   - Ending the turn when the box top reaches the viewport would show it head-on and costs a contract
     change. I wouldn't.
5. **The owner's contract change (software renderers get the canvas): no design objection.**
   - In SwiftShader the canvas matched the SVG to within C13's limits everywhere I looked, and the
     slow-frame freeze keeps a struggling machine from stuttering.
   - It's the owner's call on the gate's intent. On the look, nothing argues for keeping software
     renderers out.

## Scores

- **Design quality 8.** It's the same coherent object and palette. The trim fixes the air, and the turn
  adds depth without adding a single new tone.
- **Originality 8.** A scroll-linked oblique projection of a half-model, with the backboard fixed, is not
  a library 3D hero. It's this site's idea made physical. It stays this subtle by contract, so it won't
  earn a 9 on its own.
- **Craft 7.** The match at rest is exact, and so are the alignment, the box and the centring. Held down
  by the banding (item 2), the retina comb (item 3) and print (item 1).
- **Functionality 8.** Every fallback holds, nothing is focusable or hit, there's no LCP or CLS cost, and
  reduced motion loses nothing.

Weighted: (2 x 8 + 2 x 8 + 7 + 8) / 6 = 7.8.

## Not verified

- A real GPU, a real phone, Safari and Firefox.
- CI's Chromium 156 by eye: I saw only CI's numbers, through the specs.
- Print in dark scheme, and print from a frozen canvas.
- My scores still have no owner calibration (`design/calibration/` has only its README), so this verdict
  is advice.
