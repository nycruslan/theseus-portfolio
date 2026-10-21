## Sprint 21: the forced-colors checks cover what sprint 20 shipped

**Goal** (roadmap, "Small follow-ups"): the two gaps Lens named on #54 get checks: C8 asserts the Stack list clips sideways as well as staying open vertically, and the build log's "What went wrong" bullets get a forced-colors check.

**Size:** S, test-only. Probe is the only writer; each new assertion is proven against a mutated product. Brief: `.crew/sprint/21/brief.md`.

The redesign still waits for the owner's comments on the canvas: https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5 (none as of this run).

## Results

- **C8** (`e2e/profile-sections.spec.ts`) also asserts the Stack `ul`'s `overflow-x` is `clip`. Mutant `overflow-x-clip` → `overflow-visible`: red (`Expected "clip", Received "visible"`).
- **C9.5** (`e2e/sprints.spec.ts`, new): in forced colors at 390 and 1440, the What-went-wrong bullets exist, and none has a transparent dot or one the page's colour. Mutant without `forced-colors:before:bg-[CanvasText]`: red (every dot `rgb(255, 255, 255)`, the body's).
- Real product: 68 passed across the two spec files; `pnpm verify` green; CI `check` green.
- Lens: ship on the first run, one nit (C9.5's selector should come from `ENTRIES`), left as a rider on the roadmap.

**Not verified:** Probe ran only the two touched spec files locally; CI ran the whole suite.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01EE3G12EPLeD2ncqS5UqPt2
