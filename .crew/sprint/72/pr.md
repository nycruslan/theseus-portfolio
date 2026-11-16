## Sprint 72 (S): a record's step links stay in the window at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on
`/log/23` and `/log/45`, the step links ran past the window's right edge at a 24 or 28 px default
font from 1536 px wide, so the page scrolled sideways by 23 to 78 px and Next's arrow was cut.
Named in sprints 70 and 71's follow-ups and confirmed by Atlas's sweep of production on 2026-11-16.

**Size:** S. Contract: `.crew/sprint/72/contract.md`.

Building: Forge (the fix), Probe (T33). Results follow.
