## Sprint 8: the hero half-model, Part A

**Goal:** the roadmap's open item, the subtle 3D hero, Part A of the contract the owner accepted by merging #28. **Size:** M.

**Contract:** `.studio/sprint/8/contract.md` → C1–C9 of `.studio/sprint/7/contract.md`, written by Probe as `e2e/hero.spec.ts` (`.studio/sprint/8/probe-checks.md`: all nine failed before the build; 29 mutants each fail their check).

**Build (Pixel, `.studio/sprint/8/build-pixel.md`):** `components/hero.tsx` renders a static inline SVG lift half-model after the header: seven lifts, a deck strip, staggered butts, one copper plank on the third lift. The geometry comes from `lib/half-model.ts` at build time, and the tones are `color-mix` of the tokens in `app/globals.css`. No client JS, no dependency.

**Results:**
- `pnpm verify` passes.
- `pnpm test:e2e`: 56 passed, 1 skipped (the existing `content.spec` fixme).
- First-load JS for `/`: 175,517 B gzip, the same as origin/main.
- Hero markup: 6,487 B (cap 8,192).
- LCP: the same `<p>` as main, within 100 ms at 4x CPU.

**Decisions:**
- A plain `div.@container` wraps `main` in `page.tsx`, so the full-bleed box uses the page's own width rather than `100vw`, which counts a classic scrollbar.
- The box is hidden under forced colors and where `color-mix()` isn't supported.

**Not verified:**
- Safari and Firefox.
- A real classic scrollbar between 672 and 768 px.
- Real phones.

**Review:**
- Lens: ship on 55f86c3 and on 75d4653, with no Important findings. The two nits (a memory line, and the 768 breakpoint under a classic scrollbar) are follow-ups in `retro.json`.
- Iris: ship 7.8/10 (`.studio/sprint/8/review-iris.md`).

**Fix round 1:** Iris's dark copper (92% mix, ΔL −0.043 against C7's 0.06) and an `@supports` guard for the `calc()`-in-`color-mix` form.

Screenshots, kept out of git, are in the build session's `.studio/screenshots/sprint-8/`: 1440 and 390 in light and dark, and the box at 2x.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01F6KoJJcMuhoXifK2BWnnwq
