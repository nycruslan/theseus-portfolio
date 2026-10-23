# Sprint 27 decisions (Atlas)

1. **Sprint 27 is the roadmap's next sprint, M, started by #73's merge.** The pre-flight
   (`node .crew/next-sprint.mjs`) found nothing open, next 27, four of the day's six merged; no
   owner goal came with the run. Quill's plan sized it "S, or M if the phone strip moves"; it is M
   either way: a new component with three behaviours and storage, two live checks rewritten, and
   one open design call, which is more than one sentence.

2. **Atlas wrote the contract from Quill's plan** (`.crew/sprint/24/b3-plan.md`, "Sprint 27"), as
   in sprint 26: the product calls were made there and on the canvas, and the open call (where the
   control sits on phones) is Iris's. Quill isn't brought in. Pixel isn't either: the mount's change
   is mode plumbing (how to open, a `settle()` handle, one rider), small and guarded by B3.1 to
   B3.15, and Forge owns the control, the store, the loader and the bar. One builder keeps the
   integration to one branch.

3. **The device's hints set the default; the choice wins.** `mode = stored ?? (saveData ? "off" :
   reduce ? "calm" : "full")`, followed live while nothing is stored. The alternative, the OS
   preference as a ceiling (Full under `reduce` still settled), leaves two buttons that do the same
   thing for exactly the visitors the control is for; a visitor who presses Full asked for the
   loft. Save-Data joins the rule for the same reason: as a default it downloads nothing (B3.5's
   case holds unedited), and a press of Full overrides a hint, never a refusal. The loader keeps
   its refusals (forced colours, no `webgl2`), since those are capabilities, not preferences: with
   no WebGL 2 the control shows Off pressed and Full and Calm `disabled`, so no button pretends.

4. **A press of Full replays by a remount with the once-a-visit flag ignored,** rather than a
   `play()` on the built stage. The teardown returns the whole drawing and frame 1 is registered on
   it, so what the visitor sees is the drawing lifting off again, which is the replay they asked
   for, with no new path through the mount's state machine. Calm pressed mid-loft and `reduce`
   switching on with nothing stored use `settle()` (today's reduced-motion listener, moved behind
   the store), since a remount there would be a rebuild where B3.4 asks for two frames.

5. **The DOM is fixed; the phone's layout is Iris's.** The group follows the four links inside the
   bar's `nav` at every width (Quill's order: Contact's first link becomes the 15th stop), from
   1024 px at the bar's right end after Read as page (`main.webp`). Below 1024 px the canvas's
   bottom strip was drawn on a sheet that doesn't exist as drawn (the phone bar has carried all four
   links since #62), so Iris decides on production, with the first screen's cost at 390 × 844 and
   whether it departs visibly from `hero-390.webp`; the build starts with a second bar row as the
   default so nothing waits.

6. **The fallback face rides, the "Base" label doesn't.** The cold-cache nav wrap at 390 and the
   21 px sideways scroll at 320 are production bugs on every first visit over a slow line and the
   bar is this sprint's code (B3.23). The label under the shadow's tail is the owner's sheet (#62),
   so it goes on the demo list.

7. **Lens's four nits on #73:** three ride as code (the cap reset in `cross()`, `overflow: clip` on
   the layer, the stray JSDoc); the toolbar show/hide refit is a demo question, since only a real
   phone shows whether it re-solves the loft at rest.

8. **Iris's placement, taken as amendment 1** (`.crew/sprint/27/notes-iris.md`): below 768 px the
   group sits at the drawing's foot, a 44 px row of `main`'s grid between `[data-model]` and the
   title block; from 768 in the bar after Read as page (44 tall to 1023, 32 from 1024). Her
   measurements on production made the bar's three options one: 42 px of air at 390 against a
   group of 183, a second sticky row costing 97 px of chrome at every scroll position, a fixed
   strip covering the bio at 320 × 568. The cost is 44 px of the first screen at 390 (B1.1 holds
   with 215 px to spare on her mock). It departs from `hero-390.webp`, whose strip held Read as
   page too, so her paragraph goes to the owner on the PR with the preview, without waiting. The
   DOM changes from the plan's below 768 (two sized slots, the group in the shown one), and the
   Tab order doesn't: the group is `main`'s first focusable, so Contact's first link stays the 15th
   stop at every width.

9. **The bytes fit at 2,038 B decoded of B2.10's 2,048** (Forge): the store, the control and the
   loader are one client module (`components/model.tsx`; a module boundary costs about 165 B),
   both components `"use no memo"` (the React Compiler's memo cache and runtime were 633 B), a
   WebGL refusal read as Off. The check sums decoded bodies, not gzip, which my contract first
   said; corrected in `a80c6ab`. 10 B of headroom: any new client logic on `/` reopens the budget
   with the owner.
