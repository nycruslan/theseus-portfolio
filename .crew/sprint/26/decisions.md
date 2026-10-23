# Sprint 26 decisions (Atlas)

1. **Sprint 26 is the roadmap's next sprint, M, started by #72's merge.** The pre-flight
   (`node .crew/next-sprint.mjs`) found nothing open, next 26, three of the day's six merged; #72
   merged at 18:28 UTC with `gate` reading "The owner approved this head", so the owner's two
   decisions on it are taken as made: **the stack is A (`WebGLRenderer`)**, which they approved as
   built, and **batch E** stands. The brief's Technology section is now stale on the stack; the
   retro proposes its edit (an owner path).

2. **Atlas wrote the contract from Quill's plan** (`.crew/sprint/24/b3-plan.md`, "Sprint 26"): its
   product calls were made there and in sprint 25's data rules, and the one open call (the phone's
   settled pose) is Iris's. Quill isn't brought in; the roles are Pixel (the build), Probe (the
   checks) and Iris (the call, the early look, the review).

3. **Every width runs the model, and the level and cap follow the drawing, not the device.** The
   contract's "The calls I made" has the reasons: the canvas approved Full as the phone's default;
   the phone lands on the profile it draws (the body plan went in sprint 22); device hints would
   facet a four-core laptop's hull at 1440 for a cost the stepping rule already meets on the frames.

4. **Stepping up stays at rest** (sprint 25's decision 11), against Quill's plan's "up below
   12 ms": a resolution change mid-move shows, and the rest frame at the cap is the step up.

5. **The page scrolls through the canvas by `pointer-events: none`,** sprint 25's rule, not by
   `touch-action: pan-y`, which would change nothing a visitor could notice; B3.13 checks the
   behaviour.

6. **Role branches are pushed to origin after every commit** (sprint 25's retro proposal, applied
   as a brief rule without a skill change): Atlas cherry-picks from `origin/pixel/26` and
   `origin/probe/26`, so a lost container loses nothing.

7. **Iris's call on the phone's settled pose, taken** (`.crew/sprint/26/notes-iris.md`): `G_NARROW`
   0.25 and `SETTLE_NARROW { dx: 0, dy: 26, yaw: −36, pitch: 16 }`, in place of the contract's
   defaults (0.1 and the desktop's offset scaled). The turn to −36° foreshortens the hull to 0.80 of
   its length, so at 0.1 the settled hull sat 30 px short of the hollow profile's bow and read as
   having moved away; at 0.25 the growth pays back what the turn took, and the model settles as long
   as the drawing it left (310 px at 390, 253 at 320; the framed height 73.7 and 60.5 px). dy 26
   puts the deck 15 px below the sheer and the shadow on the half-breadth crown; the shadow and the
   hull stay inside the canvas at both widths (Pixel's ceiling with the shadow whole is about 0.3).
   B3.2's formula at 390 uses 0.25, word for word in `e2e/model.ts`. Against `rest-390.webp` the
   hull has the same presence (79% of the width against 76%); what differs is the drawing under it,
   the profile in place of the body plan the phone sheet hasn't carried since sprint 22 (#62,
   owner-approved), so the PR says so without waiting for the owner.

8. **Run 2 resumed the sprint from the branch, not the briefs** (STATE.md's lesson from sprint
   23). The first run's container went with Pixel's served build and the roles' worktrees after
   Pixel's last three commits (`1eed4c3`, `7b6fbba`, `1b36b0e` on `origin/pixel/26`: the model at
   every width, Lens's riders, Iris's pose) had reached origin but not the sprint branch. Atlas
   cherry-picked them (`5614367`, `f2e1a35`, `63956d8`), found `pnpm verify` red on knip alone
   (two helpers Probe exported ahead of their checks), and started Probe (steps 2 to 5) and Iris
   (the early look, on a build she serves herself) in parallel on that head; Pixel follows with
   both reports, so one fix round covers the checks and the taste. Nothing was rebuilt.

9. **On the narrow drawing the growth follows e², the turn e** (Iris's early look, run 2). As
   built, `(1 + G_NARROW × e)` against a turn whose foreshortening is flat near 0° made the hull
   swell to 336 px at u 0.15 (the stern 6.6 px from the screen's edge, both ends past its drawing)
   and then shrink 21 px over the last 1.8 s: the "moved away" read decision 7 avoided at rest,
   in motion instead. With the growth on e² the length stays within 312 to 317 px through the move
   and frames 0 and 1 and the settled frame are the same to the pixel, so decision 7's constants
   and every settled number stand; the desktop keeps e, so 1440 and 1024 stay pixel-identical to
   production. The turn leading the growth instead (yaw on 2e − e²) dips the hull 6 px short of
   its drawing and re-grows, a wobble, so no. The contract's "The phone's loft", B3.2 and the
   budget table carry the square; Probe's `e2e/model.ts` and Pixel's `lib/model/loft.ts` implement
   it word for word. Evidence: `.crew/screenshots/sprint-26/strip-phone-light-b.png` and
   `zoom-phone-light-u012.png` (not in git), Iris's sim table in her report.
