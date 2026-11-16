## Sprint 72 (S): a Log record's step links stay inside the window at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on
every Log record, from 1536 px wide at a 24 or 28 px default font, the next step link ran 23 to
78 px past the window and the page scrolled sideways. Named in sprints 70 and 71, confirmed by
Atlas's sweep of production on 2026-11-16.

**Size:** S. Contract: `.crew/sprint/72/contract.md`.

In progress: Forge builds the fix, Probe writes T33.
