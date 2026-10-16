# Sprint 3: project cards

- **Goal:** roadmap item 3. Each project becomes a card with its name, description and link. The whole card is the link target, and the title moves to the foreground colour with a copper underline.
- **Size:** M. Quill wrote the contract, Iris the direction (`direction.md`, "planks, not tiles"), Probe the checks first (`e2e/project-cards.spec.ts`), Pixel built `components/project-card.tsx`, no fix rounds.
- **Contract:** `.studio/sprint/3/contract.md`, C1–C9 are Playwright tests, all passing on a10d633 (`pnpm verify` clean; e2e 30 passed, 1 skipped, the owner's `fixme`). C10 is shown by CI and by scope.mjs's `content/` rule. Its test was dropped because its `test.skip(` tripped the scope check. Decisions: `.studio/sprint/3/decisions.md`.
- Also ticks roadmap items 2 (dark mode, merged in #12) and 5 (Open Graph image, already on main).

## Verdicts

- **Lens, on 57999ec:** ship, no Important findings. Both of Pixel's deviations from the direction (`has-[a:focus-visible]:z-10`, the 1 px md padding) are correct (`review-lens.md`).
- **Probe, on 57999ec:** ship, with every check passing in the browser (`review-probe.md`).
- **Fresh Lens and Probe, on a10d633:** ship (`review-lens-2.md`, `review-probe-2.md`). That commit only changes the spec: it drops C10's `test.skip` and fixes C4 for a project without an `href`. Probe's mutation tests show C1–C9 catch a bad card.
- **Iris (advisory), on 57999ec:** ship, 7.3/10, better than main. The product code hasn't changed since (`review-iris.md`).

## Not verified

Safari and Firefox (`:has`, `lh`), a real touch device, a screen reader, Windows High Contrast (only the compiled CSS), and production side by side (the proxy returns 403, so `origin/main` built locally stood in).

## For the owner (not blocking)

The Theseus link points at `https://github.com/nycruslan`, marked `TODO(owner)` in `content/profile.ts`. The card now makes it the largest target in Projects. Pointing it at the repo or a write-up would make the arrow's promise true.

Retro: `.studio/sprint/3/retro.json`.
