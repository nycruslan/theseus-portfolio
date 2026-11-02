# Sprint 44: decisions (Atlas)

1. **Wb, as the roadmap orders.** The pre-flight said start sprint 44, nothing open, no owner goal,
   5 of 6 sprints merged today. Wb is the milestone's next sprint and needs no owner answer.
2. **Atlas wrote the contract from Quill's plan** (`.crew/sprint/42/plan.md`, Wb, W8 to W12)
   rather than asking Quill: the plan already fixes the windows, the checks and the budgets, and no
   product call is open.
3. **Iris's placement call and Probe's red checks run in parallel,** as in sprint 43: W8 to W12
   hold whatever the option; W9's floor and W10's place wait on Iris, so Probe keeps each in one
   constant.
4. **Iris's call taken** (`placement.md`): below 768 the Read-as-page and Motion row hangs from
   the bar at the drawing area's top right; the narrow drawing scales with `100svh` from its left
   edge to a floor of 224 × 149.3; three small phone-only tightenings of the title block and
   particulars. The DOM order doesn't change, so B3.16 and B2.3 hold unedited and W10 needs no
   rewrite. Built on her call without waiting; it can be undone.
5. **390 × 844 changes, accepted.** The contract said kept checks there must stay green, not that
   the layout must stay put. One phone layout at every height beats a second one that switches at
   some height, and at 390 × 844 the particulars move from 0.7 px of slack to about 95.
6. **The margins at 390 × 664 and 430 × 746 are about 12 px from the fold** (3.9 and 3.8 inside
   W8's 8 px). Sprint 43 lost a fit to fractional glyph widths, so Forge measures them in Chrome
   153 too, and the bio's line count at 390 is reported.
7. **Pixel's chip hole for W12 accepted** (Iris agreed): the dot paints through the 3D chip as the
   2D pen does on Off; sliding the number would push it off the short seat's wedge.
8. **One phone foot, 28rem, instead of a step at 392.** Forge measured Iris's step in CI's
   Chromium (Playwright 1.64's headless shell): at 393 × 659 the Leads phrase takes two lines
   (309 px in a 300 px column) and the particulars end 10 px under W8's margin; in Chrome 153 the
   step hinges on the bio's 0.5 px wrap at 392. A flat 28rem foot puts 393 × 659 on the floor and
   gives 430 × 746 a smaller drawing (366 wide) with about 30 px of room. Atlas took it, with Iris
   asked; one constant, easy to undo.
9. **Iris amended her call to the flat foot** (7394c85, `placement.md`, "Amendment"), measured in
   the renderer `@playwright/test` pins (Chromium 156), and ruled W10's clearance reads Read as
   page's visible ink (4 px from the drawing), not its 44 px hit area; Probe revised W10 to match,
   adding that no target in the drawing meets a foot target. The focus ring crossing the hull's top
   at the floor windows is accepted (Iris).
10. **C9 kept unedited; the drop moves out of the drawing's box** (Forge's option 1). C9
    (`e2e/plan.spec.ts:688`) hit-tests `[data-plan]`'s box at 390 × 900, whose top 44 px held the
    foot row. Moving the drop from `.plan-narrow`'s margin to `[data-plan]`'s puts the box where
    the drawing starts; nothing on screen moves.
