# Sprint 65 decisions (Atlas)

1. **M, from the roadmap: Tc, the chart and the fits.** Sprint 64 (#131) merged on 2026-11-13; no PR
   is open and no owner pick is outstanding. The canvas
   (https://claude.ai/artifact/MicDUbCifCHvCBsEfqZQS4) has no comments, so direction A stands.
2. **Quill writes the contract** (`contract.md`), because "the seven fits" is named in the plan and
   the direction but listed nowhere: which seven, their media queries and their retros are a
   product call grounded in `app/globals.css`'s blame. Iris writes the chart's placement and the
   stamp's words beside it.
3. **Quill's contract stands as written** (2c0734e): seven fits, T16 to T21, Tc's own 2,048 B after
   the first touch (T10's named rewrite), two tests in `e2e/trials-chart.spec.ts` so shard 2 keeps
   its set. Sprint 64's final head ran its shards in 9:39, 17:07 (attempt 4), 14:50 and 8:17.
4. **The builders' interface** (Forge serves the markup, Pixel drives it; both build to this):
   - `svg[data-chart]` in a `figure`; inside it `g[data-plot]` whose user units are window px
     (x = width, y = height; the flip and scale are on that `g`'s `transform`), so a tap maps by
     `getScreenCTM().inverse()`.
   - `[data-band]` (one path), `[data-pin]` marks (`data-windows`, `data-freeboard`),
     `a[data-sounding="<w>x<h>"]` (href the window's address), `circle[data-ring]` with `cx`/`cy`
     in window units at the shown window.
   - Each fit: `[data-fit="<1..7>"][data-query="<query verbatim>"]`, server-rendered, `hidden`
     when the shown window doesn't enter it; its region on the chart `[data-fit-region="<n>"]`,
     hidden until found. The count line `[data-found]`.
   - Fit table and retro words live in `lib/trials-fits.ts` (Forge), imported by both.
5. **A sounding's target may sit off its point, its dot may not** (Forge's option A). At 320 the
   named 1160 × 635 and 1366 × 595 sit 36.7 px across and 7 px down on a 288 px chart, so two
   centred 44 px targets overlap by 7.3 px at any chart height. Below 24rem each target shifts
   4 px apart and still holds its point. T17 reads: the sounding's dot is centred on its point
   within 0.5 units, and its hit rect contains the point. Rejected: a sideways-scrolling chart at
   320 (a swipe to see the laptops) and dropping a named window from the soundings (the contract).
6. **Every mark inside the plot is `pointer-events: none`, and the plot is a tap target of its own.**
   Chromium's touch adjustment moves a finger's tap to a link within its radius unless the spot is a
   responder that isn't the link's ancestor (Probe found it, Pixel measured it at 390 × 844: a tap
   at 1024 × 640's point clicked the 1160 × 635 sounding 8.2 px away). A listener on
   `svg[data-chart]` loses, since the soundings are its children. So the nested plot `svg` gets a
   hit rect over its viewBox and a `:hover` rule (Forge), at 0 B of script; the click bubbles to
   `main`, where the loader listens and maps it through `g[data-plot]`'s CTM.
7. **Iris's placement and words are final** (3336619). I take both of her calls
   (`placement.md` 9): the stamps go last on the page, after the record, so a found stamp never
   shifts anything visible at load (the list's top was below the fold at all 14 viewports she
   tried, 1,426 px at 1024 × 768 the nearest); and from 1024 the frame gives up the chart's block
   (274 px to 1279, 256 from 1280), so `/trials` at 1440 × 900 draws its frame at 704 × 440, not
   792 × 495. The chart is the sprint's point and has to be in the first screen beside the frame;
   the frame's document stays exactly the window (T2), only its drawing is smaller. T1 to T15 run on
   the integrated tree before the label to prove the kept checks hold.
8. **The count line is read as the visitor sees it.** The server writes both forms (the visit's
   and the window's) and CSS picks one by `@media (scripting)` and `:has`, since the server can't
   know whether script runs and the loader has bytes only for the digit. T21 reads the line's
   `innerText`, not `textContent`, which carries the hidden form too.
9. **A tap on a pin's dot is that window** (Pixel). From 1024 one 5 px grid row is 0.93 screen px,
   so a click on 1024 × 640's dot settled at 1024 × 645. The controller maps taps from the
   pointer's fractional position, and a tap within a pin's drawn dot settles on the pin, as a
   release within half a cell already does.
