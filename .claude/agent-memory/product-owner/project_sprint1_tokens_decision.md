---
name: sprint1-tokens-decision
description: Sprint 1 chose design tokens, light-only, seed dark block removed; the cost and how checks were framed
metadata:
  type: project
---

Sprint 1 picked roadmap item 1 (tokens). Decision: remove the seed dark block, declare `color-scheme: light`, accept that dark-system visitors temporarily see a light page; dark mode is the next sprint.

**Why:** keeping the block means untested seed colors against a new palette; extending it steals item 2.

**How to apply:** caps in the contract (4-8 color tokens, 4-6 fluid type steps) made checks countable by file read. Taste (mood, originality) can't be a Playwright check, so it is left to Iris's rubric review. The seed's `TODO(owner)` stand-ins fail the placeholder hard gate, so name that as a known pre-existing condition in contracts until content lands, otherwise reviewers will block on it. Next sprint should be dark mode.
