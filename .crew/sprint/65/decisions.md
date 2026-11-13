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
