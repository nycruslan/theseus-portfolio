# Sprint 5: section reveal on scroll

- **Goal:** roadmap item 4: section reveal motion on scroll, disabled under `prefers-reduced-motion`.
- **Size:** M, two fix rounds.
- **Contract:** `.studio/sprint/5/contract.md` (C1 to C9). Decisions: `.studio/sprint/5/decisions.md` (keyboard `settled()` filter and frame wait; no new at-load check; C3 counts ancestors; the outcome amended to a heading-only rise).

## What changed
- `app/globals.css`: one gated block. Each `main > section` owns a view timeline; its `h2` rises 16 px over `entry 0% entry 64px` with an ease-out curve and a `backwards` fill. Inside `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, so reduced motion and unsupported browsers get the page on main. No JS, no new tokens, +332 bytes of CSS.
- `e2e/reveal.spec.ts` (new, Probe): C1 to C8. `e2e/keyboard.spec.ts`: `settled()` waits only for clock-timeline animations, then two frames (adds and removes no expect; `scopeNotes` reports nothing).

## Fix rounds
1. A whole-section rise failed CI's `cards.spec` link check: a view timeline is one frame stale after a jump scroll, so the card was measured 16 px low. The rise moved to the heading.
2. Iris found the section fade failed axe contrast at load at common window heights (1440 x 746 to 774, 390 x 758 to 788). The fade was removed; the band scan (606 loads) now has 0 failures.

## Results
- Full suite: 41 passed, 1 skipped (the owner's `TODO(owner)` fixme). reveal, keyboard and cards specs with `--repeat-each 15`: 270 passed.
- At rest: 0 differing pixels against an origin/main build, in 28 shots (light and dark, 1440 and 390). Production isn't reachable from the sandbox.
- CI `check`, `gate` and `lens` green on 0ae070e (the check ran on the merge ref with the owner's 2026 content from #25).

## Verdicts
- Lens: ship on 0ae070e (three documentation nits; the two notes ones are fixed in the close-out, the memory one is a follow-up).
- Probe: checks written first, with every check failing on a mutant: `.studio/sprint/5/probe-checks.md`.
- Iris: changes, 7.2/10, advisory, on 8d87127: `.studio/sprint/5/review-iris.md`. Her one ask (drop the fade) is fix round 2; she hasn't re-reviewed the final head.

## Not verified
Safari and Firefox (no WebKit or Gecko here; only the CSSOM gate, C6, covers them), a real touch fling, and production.

## Follow-ups
See `.studio/sprint/5/retro.json`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_017aitLSPChMfaaXVMZCRjQ8
