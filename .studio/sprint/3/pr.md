# Sprint 3: project cards

- **Goal:** roadmap item 3. Each project becomes a card with its name, description and link. The whole card is the link target, and the title moves to the foreground colour with a copper underline.
- **Size:** M. Quill wrote the contract, Iris the direction (`direction.md`, "planks, not tiles"), Probe the checks first (`e2e/project-cards.spec.ts`), Pixel built `components/project-card.tsx`, no fix rounds.
- **Contract:** `.studio/sprint/3/contract.md`, C1–C10, all passing on 57999ec (`pnpm verify` clean; e2e 31 passed, 1 skipped, the owner's `fixme`). Decisions: `.studio/sprint/3/decisions.md`.
- Also ticks roadmap items 2 (dark mode, merged in #12) and 5 (Open Graph image, already on main).

## Verdicts (on 57999ec)

- **Lens:** ship, no Important findings. Both of Pixel's deviations from the direction (`has-[a:focus-visible]:z-10`, the 1 px md padding) are correct (`review-lens.md`).
- **Probe:** ship, with every check passing in the browser (`review-probe.md`). Her C4 spec fix for a project without an `href` is held for a follow-up, so the verdicts stay on the reviewed code.
- **Iris (advisory):** ship, 7.3/10, better than main (`review-iris.md`).

## Not verified

Safari and Firefox (`:has`, `lh`), a real touch device, a screen reader, Windows High Contrast (only the compiled CSS), and production side by side (the proxy returns 403, so `origin/main` built locally stood in).

## For the owner (not blocking)

The Theseus link points at `https://github.com/nycruslan`, marked `TODO(owner)` in `content/profile.ts`. The card now makes it the largest target in Projects. Pointing it at the repo or a write-up would make the arrow's promise true.

Retro: `.studio/sprint/3/retro.json`.
