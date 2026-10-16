# Sprint 4: accessibility pass

- **Goal:** roadmap item 6: a skip link, one focus ring everywhere, the card arrow follows keyboard focus, one ring in forced colors, strict axe, 24 px targets.
- **Size:** M, no fix rounds.
- **Contract:** `.studio/sprint/4/contract.md` (C1 to C10). Decisions: `.studio/sprint/4/decisions.md` (C9 as evidence, not a suite test; Contact links may change for C8).

## What changed
- `components/skip-link.tsx` (new): "Skip to content", `sr-only` until focused, token colors, works with JS off; rendered from `app/page.tsx`, so the 404 has none.
- `app/page.tsx`: `main id="main" tabIndex={-1}`; Contact links `inline-block` (21 px to 25.8 px tall).
- `app/globals.css`: one `@layer base` block with a shared `:focus-visible` ring (2 px `--accent`, offset 2) and no ring on the programmatically focused `main`. No new custom property.
- `components/project-card.tsx`: arrow copper on keyboard focus; link uses `outline-none` so forced colors show one ring.
- `e2e/a11y.spec.ts` (new, Probe), plus one added line in `project-cards.spec.ts` C2.

## Results
- C1 to C8: `e2e/a11y.spec.ts` green; full suite 38 passed, 1 skipped (the owner's `TODO(owner)` fixme).
- C9: `main` and `h1` boxes identical to an origin/main build (0.00 px) in both schemes at 390 and 1440; production unreachable from the sandbox. No `content/` diff.
- C10: `pnpm verify` passes; CI `check` and `scope` green; scope rules report no notes.

## Verdicts (on 863efa2)
- Lens: ship (two nits, logged as follow-ups): `.studio/sprint/4/review-lens.md`
- Probe: ship: `.studio/sprint/4/review-probe.md`
- Iris: ship, 7.5/10, advisory: `.studio/sprint/4/review-iris.md`

## Follow-ups
See `.studio/sprint/4/retro.json`. Notably: the skip link skips nothing yet, since `main` wraps the whole page (a layout question for Quill).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01RUYMUsBoYd17rKrkhP4ssU
