# Sprint 53 decisions (Atlas)

1. **M, Ya, from Quill's contract** (`.crew/sprint/52/first-contract.md`), amended so every count
   comes from the record (`contract.md`; Lens's nit on #118). Four roles in parallel: Iris's call
   first, Probe's checks and mutant, Forge's build, Pixel's 3D and Yc's spike.
2. **The 3D chunk needed no code.** Pixel showed it already draws a partial ghost exactly, gaps at 0
   alpha, and never reads the Theseus, because it reads only `[data-model]`'s previous sibling. That
   sibling stays `[data-ghost]`, and the chunk's bytes are identical.
3. **The record's column holds still from 1024** (Forge's `.log-side`), not Iris's grid, which moved
   the record 86 px down at 1440. The contract asks for the first, and Forge measured that it keeps
   Iris's flip-book rule: both drawings have the same box on every step.
4. **B5.25's 320 × 568 clause stays, and the placement moved instead.** Probe's contract mutant found
   it red: there were 29 px of room above the motion control on a small phone. That is a real
   visitor property. Iris moved the Log's phone row under the h1, as on `/` since Wb, and put Start
   again after the Foot. This needs one more named rewrite: B5.1's header-end row clause.
5. **B5.18's registration clause is rewritten to register on the drawn planks (option b).** The
   plan wants the 3D ghost to follow its step's drawing, gaps included. The 2D silhouette is the
   whole hull's outline, while frame 1's coverage has the gaps.
6. **B1.6 is kept:** Start again keeps its underline.
7. **B5.19: plank 5.0's light floor is 0.84, and GHOST_LIT stays at 0.4** (Iris). The red is a
   whole-pixel row shift after the ghost moved down: the settled pose is identical when shifted by
   a row, 0 of 161,100 pixels differ (Pixel). On main, 16 of 5.0's roughly 46 pixels already sit
   under 0.85. Lowering the lit mix would flatten all 22 planks to win 0.003 L on one cell.
8. **Yc's spike** (`spike-pixel.md`): two hulls fit at 7 to 8 draws with merged batches and lower
   levels, for about +1.6 KB of chunk. Yc's contract starts from it.
9. **Pixel trims the 3D seams at a gap (fix round 1).** The rewritten B5.18 found seams running 2
   to 3 px into a gap on partial steps, a real defect. `seamLines()` now runs each seam from butt to
   butt of the seated planks beside it. It is bit-identical on /log and `/`, for +36 B gzip of chunk.
10. **Two of B5.18's and B5.19's measures are made like for like.** These are Probe's clause changes,
    on Pixel's evidence that the geometry agrees:
    - B5.18 rounds the 2D silhouette's coverage to MSAA's quarter steps before the 50% cut. It still
      fails the untrimmed build.
    - B5.19's hover accepts a stray on a step's gap seat, and widens to 4 px for the mark's round
      cap.
    - Moving the 3D lines to suit the measure was refused.
