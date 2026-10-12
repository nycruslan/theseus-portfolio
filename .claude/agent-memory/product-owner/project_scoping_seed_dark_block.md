---
name: scoping-seed-dark-block
description: Seed globals.css already has a prefers-color-scheme dark block; a token contract must say what happens to it so the dark-mode item stays separate
metadata:
  type: project
---

The Sprint 0 seed `app/globals.css` ships a `@media (prefers-color-scheme: dark)` override with `--background`/`--foreground`. Roadmap item 1 (tokens) and item 2 (dark mode) are separate.

**Why:** a palette sprint that leaves the old dark block in place yields an untested, possibly low-contrast dark theme; one that silently expands it steals the next item.

**How to apply:** when writing the contract for token or theme work, state explicitly the fate of the existing dark block (light only, block removed, `color-scheme: light`) and make the checks provable with `grep` plus a browser check. Also cap the number of tokens and type steps so the sprint stays small.
