# Sprint 33 decisions (Atlas)

1. **Sprint 33 is B5c, beside #78.** The pre-flight (after #82 merged) found #78 (sprint 31, B4a,
   `/crew`) waiting for the owner, next 33, five of the day's six merged, nothing to update or
   remind, and no owner goal. Every B4 sprint builds on #78. B5c, the ghost hull in 3D on `/log`,
   reads the retros on main, and sprint 29's plan says it doesn't wait for B4
   (`.crew/sprint/29/b5-plan.md`, "Which B5 sprint waits for B4"). It neither repeats nor builds on
   #78; both touch the bar (#78 re-lays it below 768, this adds the control to `/log`'s), so
   whichever merges second merges main and keeps both sides. B5c writes the model's mount on a
   second route, which B4d then reuses on `/crew`. Branch `sprint/33-b5c-ghost-3d`.

2. **Sprint 32's merge record is committed with this sprint**, as `.crew/STATE.md` says:
   `merge-record.mjs` wrote `.crew/sprint/32/merge.json` (#82, 2026-10-25T02:08:27Z, 4070914, 43
   of 6,498 lines original).

3. **The build starts from Pixel's spike** (07e2a69, cherry-picked with his memory, 82c27f8): the
   seam is in the 3D chunk, which reads the ghost's seats off `[data-ghost]`'s paths, so
   `components/model.tsx`'s loader is unchanged and `/`'s geometry and loft are identical. Pixel's
   three open items are already in the contract: per-side index ranges for Iris's two passes
   (26,288 and 8,432 triangles in 5 draws; three's default `DoubleSide` would break both budgets),
   the rest window with the pointer off the hull, and the off-screen window at 1440 × 600, 1024
   and 390.

4. **Two builders on written-down files.** Pixel owns the chunk (`lib/model/*`) and the model
   layer's CSS: Iris's look, the pick, the move, the hover and record marks, the number spans
   riding their planks. Forge owns the page side: `components/log.tsx`, `components/log-record.tsx`,
   `app/log/**`, `components/bar.tsx`, the control's place on `/log` (bar from 768, the row after
   the header below), Lens's nit on #74 in `components/model.tsx`'s `MotionControl`, and Iris's
   rule-width rider. `app/globals.css` is shared: Pixel's rules stay under the model layer's
   selectors, Forge's under the Log's header and the control's row, each in its own block.
