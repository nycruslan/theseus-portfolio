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
