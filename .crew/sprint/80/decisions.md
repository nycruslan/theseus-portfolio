# Sprint 80 decisions

1. **Why this sprint, in a stand-down.** The roadmap reopens work for a production defect that
   hides a fact. Atlas measured production's /trials (2026-11-19, `/opt/pw-browsers/chromium`,
   `Page.setFontSizes`): at 24 px the stuck side's foot is 17 px below the window at 1536 × 1260
   and 1600 × 1300, 7 px at 1920 × 1400 and 1920 × 1600; at 28 px, 14 px at 1920 × 1600. At 16
   and 20 px it fits everywhere sticky applies (18 to 63 px of room). S: one CSS rule's condition,
   one builder (Forge), Probe's T40 first.
2. **The budget, not only the threshold** (Forge). A higher sticky threshold alone would have
   turned sticky off from 24 px and left the chart's foot below the first screen at load. The fix
   takes the side's rem growth out of the frame's budget, and the sticky top follows the 3.5rem
   bar, so the side sits 32 px under it at every font. Atlas accepts: it serves the contract's
   outcome and moves nothing at 16 px (0 of 6,360 boxes).
3. **T40's windows** (Probe). 1600 × 1300 at 24 px fits in the suite's browser by 12 px where
   Atlas read 17 px past in Chrome 153; 1792 × 1470 at 28 px, each font's sticky edge, is the
   worst case (47.8 px) and joins the list.
