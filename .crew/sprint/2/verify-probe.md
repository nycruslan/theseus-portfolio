# Sprint 2 verification (Probe, probe-2)

Verdict: ship, for head `2a33b4889b9639ca98e6553bc5c171ddad4dae01` (`sprint/2-dark-mode`, PR #12).
`git rev-parse HEAD` confirmed that SHA after `git checkout --detach`.

## Contract, by number

| # | Result | Evidence |
|---|---|---|
| C1 | pass | `dark-mode.spec.ts` C1 (browser) and C1 (grep) pass. By hand: `:root` `colorScheme` is `light dark` in both schemes at 320, 390, 1440; served head has `<meta name="color-scheme" content="light dark">`; `color-scheme: light dark` sits in the base `:root` rule in `app/globals.css`, outside the dark block. |
| C2 | pass | Test passes. Served HTML (production build) has exactly two `theme-color` metas: `#e6f3f1` for `(prefers-color-scheme: light)`, `#091413` for dark. They equal each scheme's `--background` (body resolved `rgb(230, 243, 241)` and `rgb(9, 20, 19)`). |
| C3 | pass | Both per-scheme tests pass. Ratios (builder's table, matching Iris's): fg 14.53 light / 15.30 dark, accent dark 7.45, fg on rule 10.88 / 8.39. |
| C4 | pass | axe, any impact, light and dark, `color-contrast` included: both pass. |
| C5 | pass | JS-off first paint matches each scheme, served-HTML scan (as restated in `decisions.md` 2), and grep assertion all pass. By hand: `no-preference` paints light; dark with JS on and the page had no console errors, page errors or failed requests in any of 6 runs. |
| C6 | pass | Grep assertion passes. |
| C7 | pass | Test with literal sprint 1 values passes. By hand, at 320/390/1440 light body is `rgb(230, 243, 241)` on `rgb(15, 34, 32)`, `--accent` `#944126`, `--rule` `#c5d5d2`; `git diff` of `app/globals.css` shows no light value or `--step-*` line changed. I did not redo the builder's light pixel diff against `origin/main`; the visual half is Iris's. |
| C8 | pass | `pnpm verify` exit 0. `PLAYWRIGHT_PORT=3641 pnpm test:e2e`: 29 passed, 1 skipped (the sprint 0 `test.fixme` in `content.spec.ts`), exit 0. `git diff origin/main...HEAD --name-status -- e2e/` is exactly `A e2e/dark-mode.spec.ts`; no existing spec edited. CI on the head: `check` success, `scope` success, Vercel success (read at the end of my run; `check` was `in_progress` earlier). |

## By hand, in a real browser (Chromium 1194 through the scratchpad shim, production build on port 3642, PID 19075, stopped)

- Served head metas: viewport, two `theme-color` with media, `color-scheme`, title, description. All as above.
- Dark page at 320, 390, 1440: no horizontal overflow (`scrollWidth == clientWidth`), no console errors or warnings. Hull-dark ground, tinted off-white text, copper links, no gray-on-gray. Screenshots in the scratchpad `p2shots/` (`dark-320.png`, `dark-390.png`, `dark-1440.png`); the builder's are in `shots/`.
- Selection (select all, 390 dark): `::selection` computes `rgb(45, 69, 67)` background with `rgb(225, 234, 233)` text; the verdigris band shows on every block and on the link text.
- Keyboard focus, dark and light (Tab from the top): three stops, "Theseus", "GitHub", "LinkedIn", each `:focus-visible` with the browser's default `outline: auto`. In dark the ring paints white and is clearly visible against the hull. The page has no custom focus style; that is item 6's.
- Tried to break it: `colorScheme: no-preference` paints light; `forcedColors: active` paints system black (expected, forced colors override); `reducedMotion: reduce` leaves dark intact.

## Not checked, or not mine

- Native scrollbars and the mobile address bar in dark: headless draws neither, so they stay driven by `color-scheme` and `theme-color`, which the checks pin.
- Visual comparison of light against production: Iris's half of C7. Production is blocked by the proxy from this sandbox.
- The placeholder content gate (`decisions.md` 4) is Iris's and the owner's.

## Notes

- Nothing found. No bug test added, no test weakened, no check shown to be wrong.
- Chromium 1194 shim: no change from memory.
