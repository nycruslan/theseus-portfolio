# Sprint 55 decisions (Atlas)

1. **M, Yc, as the plan staffs it:** Pixel leads the 3D, Forge builds the controller, Probe writes
   Y12 to Y18 red first with a contract mutant, Iris calls the looks before the flight and reviews
   the build. The contract is Atlas's, since the plan and Pixel's spike already made the product
   calls; it settles the plan's four questions (`contract.md`).
2. **The step's words come from the server's prerendered page for that step,** fetched and swapped,
   not from the table already on the page: the table holds each step's line but not the record's
   body, and a fetch makes "the server's words for that step" true by construction.
3. **The 3D and the controller meet at one written interface** (`Press`, `MakePress`, `startYard` in
   `lib/model/yard.ts`), so Pixel and Forge build in parallel on disjoint files; each keeps a
   stand-in for the other's side until Atlas integrates.
4. **Iris's calls are built as she wrote them** (`press-iris.md`), including her two departures:
   the Theseus on the Log settles at the ghost's turn with no shadow, and the knock follows the
   landing instead of overlapping it. Her three asks of the controller are accepted: the motion
   starts within a frame and never waits for the step's HTML, Hobbes's question arrives with the
   landing, and focus stays on the pressed step link.
5. **Y12 reads Calm as a fit, not a frame-1 registration** (Probe's question): Calm's first frame
   is its settled one, so there is no frame 1 to register.
6. **The contract mutant's kept reds, named before the build** (Probe, `8747d10`): a bare two-hull
   canvas turns 11 kept tests red, all by design, because the canvas now spans both drawings.
   Rewrites for Lens: B5.18's fit holds both drawings' boxes (its edge clause kept); B5.19's band
   and record reads, and B5.20's and B5.23's plank helpers, read over `[data-ghost]`'s box (B5.23's
   ≤ 8 draws unedited). Retired: Y6's "the Theseus's planks still painted" in Full and Calm,
   because the 2D Theseus beside a 3D ghost is gone; Y12 checks the Theseus where it is now drawn.
7. **Integrated at 87fce76** (Pixel's `pixel/55` merged, carrying Forge's controller and Probe's
   rewrites): `pnpm verify` passes. Pixel's suite on his head: 126 of 127 Log and model checks,
   every Y12 to Y18 among them; the one red is B5.19's stray clause on `/log/13` at 1440, 2 edge
   pixels, which Probe settles (a named rewrite only if variant B still fails with it).
8. **The chunk grew 9,585 B gzip, over the plan's 4 to 7 KB estimate** and far under the
   250,000 B cap (164,556 B). Accepted: the estimate predates the per-ship lines of sight, the
   device-pixel snapping Y12 needed and the stable number placement; the loader adds 0 B.
9. **Number placement depends only on each number's own plank and the pose** (Iris's call, built
   by Pixel). Production already moved untouched numbers between cold loads of neighbouring steps
   (the ghost's 6, x 504 on `/log/13` against 414 on `/log/14`); here they hold, so numbers sit a
   little differently from production.
10. **B5.19's two named loosenings are kept, for Lens to accept** (Probe, `36c918e`, `65a5002`):
    - The record's mark is hovered within 5 px, not 4: the Log's pick hull moved 0.25 px with the
      two-hull canvas, which put the mark's bow-end pixel one step out of reach.
    - A pixel counts as changed by the mark beyond 32 levels, not 24: at (387, 416) a far-side gap
      shows through the translucent vellum, changing the pixel 26 levels here and 18 on main, and
      `data-pick` names a seat but never a side, so the method can't attribute it.
    - Both are proven: main and the build pass with 0 strays; variant B (mark on 3.0, GHOST_LIT 0.8)
      stays red on the band, and on the mark clause with 134 pixels away from 6.1 at 1440 (proved
      with a 3,600 s limit; the committed test reaches its 900 s limit first, still red).
11. **Y13 to Y15 are tightened on the real flight**: a press may change at most 1.75 plank areas
    outside where the step changes, which turns a two-plank press red (the earlier bound let it
    through), and the landed canvas must match a cold load to 0.01% of pixels.
12. **Iris's two musts are checks**: Y16 asserts no layout shift without recent input on 22→23 in
    Full (Forge's fix, `cad6134`, measured 0), and Y19 holds the Theseus's numbers at 4.5:1 in dark
    on `/log/13`, `/log/23` and `/log/40` at 1440 and 1024 (Pixel's fix in progress).
13. **The Log's Theseus gets its own dark light** (Pixel, `5fd7621`, Iris's must 2): a lit mix of
    0.8 and a lamp gain of 1.4 in place of `/`'s ×4, so every number reads at least 4.88:1 where
    the worst read 2.07:1. Light is bit-identical, and `/` is untouched. +50 B gzip.
14. **Y19 reads each number against the plank's fill it sits on**, leaving out the record's mark
    and seam lines inside its box (Atlas). The record's 13 on `/log/13` at 1024 read 4.45:1 only
    because its 12-row box at DPR 1 is half over the record's 2 px mark on a thin keel strake; the
    card under its digits reads about 8.6:1. Y19 is new this sprint, so this refines its read, and
    it must still fail the ×4 lamp. Iris rules on that number's placement as taste.
