# Sprint 81: decisions

1. **T41b counts the focus ring, including at a 16 px default font** (Atlas, on Probe's finding).
   On main, Shift+Tab scrolls a link's border box to the 56 px padding, so its ring (2 px outline,
   2 px offset) starts at 52 px, 3.1 to 4.5 px under the bar (/log's Revision links, /'s case-study
   links, /crew's Pause updates, at 1440 × 900 and 1920 × 1080). A ring under the bar is the defect
   itself (WCAG 2.4.11), so the check keeps the contract's words. T41c pins only the computed
   padding and the fragment landings at 16 px, so where Tab scrolls at 16 px may change. Forge
   adds a focus-only `scroll-margin-top` the size of the ring, which Probe found clears every case
   as injected CSS on a main build.
