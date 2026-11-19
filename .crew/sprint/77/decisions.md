# Sprint 77 decisions

1. **The placement is Iris's** (`placement.md`): on a record, below 1024 wide and under 60rem tall,
   the ghost's caption and the count line follow the record; the drawings cap their width from 768
   to 1023; the goal is `--step-xl` below 22.5rem; the rev line's line-height is 1 below 768.
   Reordering alone left 38 record-windows out; side by side was rejected (the plank numbers can't
   sit). Tall windows (60rem and up) keep today's page. No kept check is retired.
2. **T37 at 320 × 568 on the question's step reads "starts in view"** (Atlas, before the build).
   On `/log/23`, H1 keeps the question above the record in the first screen at 320, so the goal
   starts at 524 and ends near 600 even at 24 px, past the 568 fold, and nothing else is left to
   move (Iris measured). H1 asks the question to start in view there; T37 asks the same of the
   heading under it, so the visitor sees the goal begin. Every other record and window keeps
   "wholly in view". This is a contract change made before the build, not a check eased to pass
   it: the contract's line for 320 × 568 now names it.
3. **Decision 2 covers the chapter steps too** (Atlas, after Forge's first build). In the headless
   shell the suite and CI run (156), glyphs set 1 to 5% wider than in Chrome 153, so at 320 × 568
   the chapter line "Every plank up to sprint 23 is out too." takes two lines (290 px in a 288 px
   column) and the chapter steps' goals end past the fold: `/log/45` 6.5 px, `/log/67` 31.7 px,
   the same box as `/log/23`'s. The chapter line stands in the question's slot, which H1, B5.1 and
   B5.25 pin, and gives the reason the yard stops there. So at 320 × 568, on the question's step
   and each chapter step, the h2 needs only to start in view; it starts at 524. Making the chapter
   line smaller still left `/log/67` 8 px out, and moving it after the record takes the stop's
   reason off the first screen (Forge's options b). Every other record and window keeps "wholly in
   view".
