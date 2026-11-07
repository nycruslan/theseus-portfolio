# Sprint 51: decisions

1. **The owner's goal replaces the stand-down.** `ROADMAP.md` stands the crew down until the owner
   answers #101's pick, sets a goal or production says something false. He set this goal, and the
   pre-flight said `start` at 51.
2. **Size S, notes only.** The test was run first, before anyone was briefed to build. All six
   readers answered all three questions right (`five-second.md`), so no builder was brought in and
   nothing in `app/`, `components/` or `content/` changed. A fix that nothing needed would make the
   ship worse, not better.
3. **The drawing-first order stays, and goes to Iris as a follow-up.** Every reader found the name
   after the drawing, and two read the particulars before they knew whose they were. That slows a
   reader without stopping one, and the order is Iris's approved placement (sprints 43 and 44).
   Changing what a stranger reads first is new visual language, an L item on a Design canvas, and
   not this goal's fix.
4. **The test was made stricter than the goal asked, before concluding nothing was wrong.** The
   first four shots (3× phone, 1× laptop) were generous, so a second pass gave the phone at 1× and
   the laptop at half size. Both still answered all three.
5. **Sprint 50's merge record rides along** (`merge-record.mjs` wrote `.crew/sprint/50/merge.json`,
   and its approvals check passed).
6. **The local suite's three reds were my own race, not a defect.** `PLAYWRIGHT_PORT=3317 pnpm
   test:e2e` gave 343 passed and 3 failed (B4.16, B5.6, B5.5): I filled in the retro's `lens` fields
   while it ran, so the build printed "—" under Checked and the oracle, re-reading the file, wanted
   "Lens". Re-run on a fresh build of the same tree, the three specs passed 62 of 62. Don't edit a
   retro while the suite runs.
