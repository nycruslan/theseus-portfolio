# Sprint 43: decisions (Atlas)

1. **Wa, as the roadmap orders.** The pre-flight said start sprint 43, with nothing open and no
   owner goal. Wa is the milestone's first sprint and needs no owner answer.
2. **The contract is Quill's sprint 42 `first-contract.md`, adopted unchanged** as `contract.md`.
   It was written against production's measurements the same day, and nothing it reads has
   changed since (sprint 42 was notes only).
3. **Iris's placement call and Probe's red checks run in parallel.** W1 to W7 hold whatever the
   option; only W3's floor depends on Iris, so Probe keeps it in one constant and takes her number
   when she reports.
4. **Iris's (a): the drawing gives way** (`placement.md`), with a 240 px floor on `[data-plan]`,
   the particulars beside the drawing below 690 tall, and the contact row following the bio on
   windows too short for the whole sheet. (b) was rejected on taste, so the contract needed no
   return to Quill. Built on her call without waiting; it can be undone.
5. **Main moved mid-sprint** (#98, 5643a54, "One site"): the title block's contact row and the
   bio's margin changed. Atlas merged main into the branch before the build, and Probe re-records
   W2's 1440 × 900 baseline on that head, so W2 compares against today's main, not 1d1ab31.
6. **The rider moves:** the live pencil's 3D number on seat 5.0 rides on its plank's chip, as
   every other pencil seat's does since sprint 34 (Iris). Pixel builds it in `lib/model/`, Forge
   the 2D sheet in parallel, on disjoint files.
7. **The 1280 wrap, fixed rather than accepted.** Forge measured the bio's three lines at 1280
   holding by 0.86 px in Playwright's Chromium, and wrapping to four under fractional glyph widths
   (Chrome 153), which put the links 2.1 px under the fold at 1280 × 680. A real visitor's browser
   is the fractional one, so Atlas asked Iris for a rule that doesn't hinge on 1 px; she set a foot
   ramp (25rem at 1280 to 23.5rem by 1366) and moved the short-window switch to 712.
8. **Pixel's 3 px keel margin accepted** for the rider: seat 5.0's body is 2.7 hull units and the
   dot sits forward of its middle, so the chip's centre stays 3 px above the plank's lower edge to
   stay on the hull. Iris weighs it at her review; it moves a pixel or two.
9. **Main moved twice** (#98, #103). Both merged cleanly into the branch; after #103, Atlas ran
   `pnpm verify` and the window, sheet and first-screen specs (28 of 28) before the review.
10. **Iris's review: changes, taken.** Main's #104 (Live Studio in the contact row, merged during
    the review) wraps the row and puts the links under the fold at 1440 × 790 and 1470 × 840. Her
    fix (the label from 1536, an 18 px gap below 1366) also un-widows "GitHub" at 1440 × 900, which
    main shows on a second line today. Atlas takes it: the contract's "1440 × 900 unchanged" was
    written against a main whose links kept to one line, and #104's own comment says they must.
    Probe re-records only W2's contact-link boxes on the fixed build and names the reason in the
    spec; every other box W2 pins stays main's. Her centreline should (the half-breadth line stops
    short of the particulars' lettering column) rides along, one number. Pixel's 3 px keel margin:
    accepted.
11. **Main's #105 superseded half of decision 10.** It landed during Forge's fix round and solved
    #104's wrap its own way: the "Contact" label is read aloud but never shown, and the links are
    pushed right by the first one's auto margin. Atlas merged it, took main's label and margin, and
    kept the sprint's `title-contact` class and its 18 px gap below 1366 (21 px of slack at 1280).
    The links sit where #98's main had them, so W2 passes unedited and Probe re-records nothing.
    After the merge: `pnpm verify` passes; window, one-site, keyboard and first-screen specs 45 of
    45.
