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
