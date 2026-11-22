# Sprint 74: decisions

1. **The panel's status, not the table, was the defect to fix** (Atlas). The roadmap named "/crew's
   table at 320 × 28" as the next candidate; Atlas's sweep of production found the table holding in
   the live state and the status row breaking every word ("Cre / w / resti / ng.") beside "Pause
   updates". The contract took the status, the entry and the Activity heading, and checked the
   feed-down state where sprint 70 had seen the table scroll.
2. **T35 is red wider than the sweep** (Probe). Its fixture's status is longer than production's
   ("Sprint 29 merged 24 Oct, 02:47 UTC."), so it also fails at 320 × 24 and 360 × 28, and at 390 ×
   28 with the feed down ("answering / ."). All inside the contract's matrix; the fix clears them.
3. **The button stays on top; the text goes under it** (Forge, kept by Atlas). Where the text's
   longest word doesn't fit beside the button, "Pause updates" (or "Pause replay") keeps the row's
   top right and the text takes its own lines below. It keeps the rule that a status that changes
   never moves the button, keeps the status beside its entry, and leaves the Tab order as it was.
4. **The down table's role words wrap below 20rem** (Forge, outside the contract's named files,
   kept by Atlas). The 18 px sideways scroll at 320 × 28 came from the nowrap "Roadmap, AI agent";
   `.crew-word` wraps between words only below 20rem, never at 16 px. The table's line column is
   untouched.
5. **No Iris pass before review** (Atlas). The 16 px look doesn't move (0 of 14,100 boxes); the
   large-font look is whole words. At 320 × 24 the status sits beside the button as eight short
   lines, legible but narrow: a taste follow-up for Iris, recorded in the retro.
6. **The Next.js security notice** stopped `pnpm build` intermittently for both roles; a retry
   passed. Upgrading is a dependency call outside this sprint (sprint 73's follow-up stands).
