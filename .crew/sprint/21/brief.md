# Sprint 21: the forced-colors checks cover what sprint 20 shipped (S)

Goal (roadmap, "Small follow-ups"): the two coverage gaps Lens named on sprint 20's PR (#54) get
checks, so the drawn dots and the sideways-only clip can't regress quietly.

The redesign (top item) still waits: its canvas has no owner comments
(https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5, read this run).

Test-only: no product code changes, so Probe is the only writer. The product already behaves; each
new assertion must instead be shown to fail on a mutated product (a scratchpad copy).

## Probe (in `e2e/` only)

1. `e2e/profile-sections.spec.ts` C8: its title says the list "clips only sideways", but it asserts
   only `overflow-y: visible`. Also assert the Stack `ul`'s computed `overflow-x` is `clip` (or, if
   you judge a property worth more, that nothing scrolls sideways at 320 and the leading dot of a
   row stays clipped). Mutant: `overflow-x-clip` → `overflow-visible` must turn C8 red.
2. `e2e/sprints.spec.ts`: a forced-colors check for the "What went wrong" bullets
   (`components/sprint-entry.tsx:75`, a `before:` dot). With `forcedColors: "active"` emulated, at
   390 and 1440, each bullet's `::before` background is neither transparent nor equal to
   `getComputedStyle(document.body).backgroundColor` (sprint 20's lesson: Chromium repaints a
   background-only dot to opaque Canvas). First assert there are bullets at all. Place it where it
   reads naturally (beside C7 colour, or as C9 accessibility's), with a number that fits the file.
   Mutant: drop `forced-colors:before:bg-[CanvasText]` from the bullet must turn it red.
3. Nothing else changes; no existing assertion is weakened.

Done: both mutants red, the real product green; `pnpm verify` and the two spec files pass
(`PLAYWRIGHT_PORT=<free> pnpm test:e2e e2e/profile-sections.spec.ts e2e/sprints.spec.ts`, or the
whole suite). Up to three memory lines in `.claude/agent-memory/qa-engineer/MEMORY.md`, citing
`.crew/sprint/21/`. Commit on the branch `sprint/21-forced-colors-checks` (don't push); report the
commit and the mutant results.
