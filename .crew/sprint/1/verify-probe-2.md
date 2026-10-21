# Probe: verification of Sprint 1 at 9461555 (second pass)

Verdict: ship

Head verified: `9461555f9ae70d47c43695f22d2e0903a1491e9d` on `sprint/1` (PR #9). Tree clean before my screenshots.
Chromium: build 1194 via `PLAYWRIGHT_BROWSERS_PATH` (scratchpad `pwb`), config untouched.
Since my first pass (4a28975) the head changed `app/globals.css` (`@import "tailwindcss" source(none)` plus `@source` for `app` and `components`) and `app/page.tsx` (`text-balance` on the two `<h3>`s, `leading-7` dropped from the two body paragraphs). `e2e/` is unchanged by the builder.

## Commands

- `pnpm verify`: exit 0 (lint, typecheck, knip, build; `/` and `/_not-found` static).
- `PLAYWRIGHT_PORT=3317 pnpm test:e2e`: exit 0, 15 passed, 1 skipped. The skip is the `test.fixme` "no value the owner marked TODO(owner) renders" in `content.spec.ts`, which predates this sprint.

## Checks

| Check | Result | Evidence |
|---|---|---|
| C1 tokens exist | pass | `tokens.spec.ts` C1 passes (5 color + 5 step tokens non-empty on `:root`). |
| C2 fluid scale | pass | Both tests pass. My own run: h1 48px at 320, 49.75px at 390, 76px at 1440 (1.58x, over 1.4x); bio over 16px. Every step token is a `clamp(rem, rem + vw, rem)`. |
| C3 uses the tokens | pass | Browser and grep tests pass. By hand: `grep -rEn "text-(xs\|sm\|base\|lg\|xl\|[2-9]xl)\b\|foreground/[0-9]" app components` has no output. h2 is 13.33 to 13.50px (`--step-sm`); body is rgb(15,34,32) on rgb(230,243,241) in light, rgb(225,234,233) on rgb(9,20,19) in dark; all three links resolve to the accent (rgb(148,65,38) light, rgb(231,157,115) dark). |
| C4 contrast, both schemes | pass | Test passes in light and dark. Tokens are unchanged since my first pass (fg 14.53, muted 6.15, accent 6.06 light; 15.30, 7.60, 8.45 dark). |
| C5 dark block parity-only | pass | Grep test passes. By hand: 1 `prefers-color-scheme` match in `app/globals.css`, 0 `.dark`. Browser: body background differs light vs dark and equals `--background` in each. |
| C6 nothing regressed | pass | Existing smoke checks (axe light and dark, 390 px overflow, reduced motion) pass unchanged, plus the 320 px overflow test. By hand: `scrollWidth == clientWidth` at 320, 390 and 1440 in both schemes. |

New this head, checked because the fix round touched Tailwind scanning: the built CSS (`.next/static/chunks/*.css`) still contains `text-step-sm`, `-base`, `-lg`, `-xl`, `-2xl`, `text-muted`, `text-accent` and `text-balance`, so `source(none)` plus `@source` did not drop a utility the page uses. `git diff main -- content` is empty.

## Real-browser pass (by hand, headless Chromium against `next start` on 3318, now stopped)

- 320 / 390 / 1440 px x light / dark: no horizontal overflow; console clean (no errors, warnings, page errors or failed requests); Geist loads (`font-family: Geist`, one font face loaded).
- Keyboard: Tab order is Theseus, GitHub, LinkedIn, then leaves the page. No traps. The browser's auto focus ring is visible in both schemes (`probe-390-dark-focus.png` shows the ring on LinkedIn). Focus styling is roadmap item 6, so this is a note.
- Reduced motion: `prefers-reduced-motion: reduce` matches, 0 running animations, page renders fully.

## Observation (not a contract failure)

- `text-balance` on the experience `<h3>`s (the fix round) makes "Senior Software Engineer · Company name" break before the middle dot at 320 and 390 px, so the second line starts with "· Company name" (see `probe-320-light.png`, `probe-390-dark-focus.png`). It reads as a stray separator. At 1440 px the title stays on one line. Iris may want to judge it; the content is the owner's, so the fix would be in presentation (for example a non-breaking space before the dot), not in the words.
- Same as before: `<h2>` labels (`--step-sm`) are smaller than the `<h3>` titles by contract design; dark values are only contrast and axe checked until item 2.

## Screenshots (`.crew/sprint/1/shots/`, overwritten at this head)

`probe-320-light.png`, `probe-320-dark.png`, `probe-390-light.png`, `probe-390-dark.png`, `probe-1440-light.png`, `probe-1440-dark.png` (full page), `probe-390-light-focus.png`, `probe-390-dark-focus.png`, `probe-1440-light-reduced-motion.png`.

## Not checked

- Side-by-side with production (Iris has `iris-main-vs-pr-*.png`).
- Browsers other than Chromium.
