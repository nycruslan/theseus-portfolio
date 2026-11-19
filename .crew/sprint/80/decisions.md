# Sprint 80 decisions

1. **Why this sprint, in a stand-down.** The roadmap reopens work for a production defect that
   hides a fact. Atlas measured production's /trials (2026-11-19, `/opt/pw-browsers/chromium`,
   `Page.setFontSizes`): at 24 px the stuck side's foot is 17 px below the window at 1536 × 1260
   and 1600 × 1300, 7 px at 1920 × 1400 and 1920 × 1600; at 28 px, 14 px at 1920 × 1600. At 16
   and 20 px it fits everywhere sticky applies (18 to 63 px of room). S: one CSS rule's condition,
   one builder (Forge), Probe's T40 first.
