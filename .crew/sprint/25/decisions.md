# Sprint 25 decisions (Atlas)

1. **Sprint 25 is the roadmap's next sprint, M, on Quill's draft contract.** PR #71 merged with
   nothing open (`node .crew/next-sprint.mjs`: no open PR, next 25, three of the day's six merged), so
   this run starts B3's first build sprint as `ROADMAP.md` lists it. The contract is the draft Quill
   wrote in sprint 24 with Lens's nits already folded in, adopted word for word with four amendments
   in its header (`.crew/sprint/25/contract.md`): the layouts module's name, Iris's calls as named
   constants, the seam weights as her call at her first look, and where the 3D lives.

2. **The build runs on option A, WebGLRenderer, and the PR waits for the owner's stack call.**
   Sprint 24's decision 6 stands: A is Pixel's recommendation and the only stack inside the 250 kB
   budget on Vercel's wire; B is the owner's brief's stack but misses the budget. The PR carries
   `needs-owner` from the start, with the loft on its preview, and batch E (the one-line revision
   descriptions) rides it as sprint 24's decision 7 planned, so one approval round covers both.

3. **Four roles in parallel, on files written down.** Probe writes the checks first (the harness,
   B3.10, pushed alone, then B3.1 to B3.9 and the three rewrites) in `e2e/**`. Pixel builds the 3D:
   `lib/model/**`, `components/model.tsx`, the mount in `app/page.tsx`, a new "The model" section in
   `app/globals.css`, and `three` in `package.json`. Forge builds the rest: `lib/hull-layouts.ts`
   first (Pixel's prerequisite, pushed within the hour), batch E in `components/revisions.tsx` and
   the "The revision table" section of `app/globals.css`, the import line of `app/page.tsx`, and
   `lib/lines-plan.ts` if Iris picks the SVG side of the seams. Iris decides her eight calls on the
   spike's prototype first, then looks at Pixel's running build early, then reviews. Each builder
   works in its own worktree; Atlas cherry-picks onto `sprint/25-the-loft`.

4. **Atlas starts the prototype for Iris, not Pixel.** The spike's recipe tears its prototype down
   (Lens's nit on sprint 24), so the sprint's first ten minutes went on a worktree with `three`, a
   `next build`, `build-proto.mjs` and `serve.mjs` on port 4534, with `three` copied into the
   prototype folder. Pixel builds from the first minute instead of serving a page for Iris.

5. **Iris's calls are made before the `review` label, not after.** Each of the eight (duration,
   ease-in, height or length, the shadow, the profile under the lifted model and the seams, the dark
   scheme, the framing at 1024, the reduced-motion appearance) changes one named constant or one
   rule, so Pixel takes them in the build, and the review sees the version the owner will. A call
   that moves a number the contract names is recorded here with the reason.

6. **The seam weights default to the model's side.** Until Iris rules, the model's seams are
   weighted to read like the drawing's double-inked seams and the SVG is untouched, so the Off page
   stays pixel-identical to main whatever she decides. If she prefers the drawing to ink each seam
   once, Forge changes `lib/lines-plan.ts`, and B1.4, C6 and B2.5 hold as the contract's disposition
   says.


7. **Iris's calls that change a number the contract names, taken** (`.crew/sprint/25/notes-iris.md`):
   - **The ease** (call 2): `e(u) = (1 − 2^(−7u)) / (1 − 2^−7) × smoothstep(0, 0.05, u)` replaces
     `1 − 2^(−10u)`, at the direction's 2.4 s. The first 60 fps steps are 0.2, 0.9, 2.1, 3.3, 4.2 and
     4.5 px instead of 4.1 from the first frame, so the move no longer starts with the pop the
     direction rules out, and the dead creep at the end halves (405 ms against 805). B3.2's timing
     bound (duration ± one frame) is unchanged.
   - **The hull grows 10% as it lifts** (call 3): the framed height follows `(1 + 0.10·e) ×` frame
     1's, which matches the approved `main.webp` (0.87 of the drawing's length, 1.10 of its height)
     where a pure height hold reads as the hull shrinking. B3.2's bound becomes "within 2% of
     `(1 + 0.10·e(u)) ×` frame 1's framed height" at each step; the page and Probe's check implement
     the same formula word for word.
   - **The drawing goes hollow under the lifted model** (call 5, option c): from the first lofting
     frame the planks' fills, numbers and leaders are hidden by a `:has()` rule on `[data-model]`'s
     state in "The model" CSS, so the drawing's markup and the Off page don't change. Landed keeps
     the numbers above the canvas (build note 6). The model's seams stay 0.9 px and the SVG is
     untouched: the two carry the same ink within 1%, so Forge's step 3 doesn't happen.
   - **Reduced motion fades in over 240 ms** (call 8), under `prefers-reduced-motion: reduce` only,
     as the contract's item 8 allows; B1.8 emulates `no-preference` and counts nothing.
   - **The bottom row keeps the frame** (call 9): Forge's 14 px floor under the bio stays, and both
     bottom-row cells take `min-height: min(21rem, calc(100svh - 88px - (100vw - 34px) * 0.3381))`
     from 1024 px, so the sheet ends at 883 px in the 1440 × 900 frame as `main.webp` does, and the
     facts' rule stays below the fold. Measured by Iris: 1024 × 768, 1280 × 800 and 1920 × 1080
     unchanged or fitting. B1.1 holds.
