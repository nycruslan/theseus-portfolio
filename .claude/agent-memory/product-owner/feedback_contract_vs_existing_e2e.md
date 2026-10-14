---
name: contract-vs-existing-e2e
description: Before writing checks, read the earlier sprint's e2e spec; a new contract must not contradict its guards and should say which checks already cover what
metadata:
  type: feedback
---

Sprint 1's `e2e/tokens.spec.ts` C5 greps that `globals.css` has exactly one dark block that sets only the 5 color tokens. A natural sprint 2 move (putting `color-scheme: dark` inside that block) would break it.

**Why:** Probe can't weaken a test and builders can't edit `e2e/`, so a contract that collides with a live guard stalls the sprint. Conversely a guard that already matches the sprint's intent (here: no toggle, no flash) is free proof.

**How to apply:** open the existing specs first, list in the contract "where existing checks already cover this" by file and id, and place new requirements (e.g. `color-scheme` in base `:root`) so the old guards stay green unedited. I have no shell in this role, so don't promise numeric contrast ratios I can't compute; set thresholds and let the builder and Probe measure.
