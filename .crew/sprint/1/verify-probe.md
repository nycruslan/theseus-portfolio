# Probe: verification of Sprint 1 at 4a28975

Verdict: ship

Head verified: `4a28975aae6f6ce7e3849d1b025842840be3e99f` on `sprint/1`, clean tree before my screenshots.
Chromium: build 1194 via a `PLAYWRIGHT_BROWSERS_PATH` directory whose `chromium_headless_shell-1248/chrome-headless-shell-linux64` symlinks to the 1194 files (config untouched).

## Commands

- `pnpm verify`: exit 0 (lint, typecheck, knip, build all ran; build lists `/` and `/_not-found` static).
- `PLAYWRIGHT_PORT=3317 pnpm test:e2e`: exit 0, 15 passed, 1 skipped. The skip is `content.spec.ts` "no value the owner marked TODO(owner) renders", a `test.fixme` that predates this sprint (`git diff main...HEAD` shows `smoke.spec.ts` and `content.spec.ts` untouched).

## Checks

| Check | Result | Evidence |
|---|---|---|
| C1 tokens exist | pass | `tokens.spec.ts` C1 passes: 5 color + 5 step tokens non-empty on `:root`. |
| C2 fluid scale | pass | Test passes (grep half and browser half). My own run: h1 is 48px at 320, 49.75px at 390, 76px at 1440 (1.58x, over the 1.4x bar); bio 19.2px at 320 (over 16px). Every step token is `clamp(<rem>, <rem> + <n>vw, <rem>)`. |
| C3 uses the tokens | pass | Browser test passes at 320/768/1440 (h1 = `--step-2xl`, h2 = `--step-sm`, body color/background, Contact links = `--accent`). My own grep: no `text-(xs|sm|base|lg|xl|[2-9]xl)\b` or `foreground/[0-9]` in `app/` or `components/` (no output). |
| C4 contrast, both schemes | pass | Test passes in light and dark. My independent WCAG calc from the hex tokens: light fg 14.53, muted 6.15, accent 6.06; dark fg 15.30, muted 7.60, accent 8.45 (all over 4.5). |
| C5 dark block parity-only | pass | Grep test passes. By hand: one `prefers-color-scheme` mention in `app/globals.css`, no `.dark`. In the browser, body background is rgb(230,243,241) in light and rgb(9,20,19) in dark; foreground rgb(15,34,32) vs rgb(225,234,233). |
| C6 nothing regressed | pass | Existing smoke checks (axe light and dark, 390 px overflow, reduced motion) pass unchanged; new 320 px overflow check passes. Own run: `scrollWidth == clientWidth` at 320, 390 and 1440 in both schemes. |

## Real-browser pass (by hand, headless Chromium against `next start` on 3318, now stopped)

- 320 / 390 / 1440 px x light / dark: no horizontal overflow, console clean (no errors or warnings, no page errors), Geist still loads.
- Keyboard: Tab order is Theseus (project link), GitHub, LinkedIn, no traps. Focus ring is visible in both schemes (browser default auto ring: dark ring on light, white ring on dark; seen in `probe-390-*-focus.png`). Focus work is roadmap item 6, so this is a note, not a finding.
- Reduced motion: `prefers-reduced-motion: reduce` matches, 0 running animations, page renders fully.
- Rendered text and `content/` are unchanged (`git diff main -- content` is empty; `page.tsx` changes are class names only).

## Notes for Iris and Atlas (not failures)

- The `<h2>` section labels are `--step-sm` (about 13 px, uppercase) and are smaller than the `<h3>` role and project titles (`--step-lg`). The contract fixes this (C3), so it is by design; Iris may judge the hierarchy.
- The "Theseus" project name and the Contact links are the only accent uses (one accent, used for links), which matches the visual-evidence brief.
- Dark values are only axe/contrast-checked here; the real dark theme stays item 2.

## Screenshots (`.crew/sprint/1/shots/`)

`probe-320-light.png`, `probe-320-dark.png`, `probe-390-light.png`, `probe-390-dark.png`, `probe-1440-light.png`, `probe-1440-dark.png` (full page), `probe-390-light-focus.png`, `probe-390-dark-focus.png` (keyboard focus on GitHub), `probe-1440-light-reduced-motion.png`. Not captured: a side-by-side with production (production is not reachable for comparison from this sandbox run; I did not try).

## Not checked

- Production comparison shots (above).
- Browsers other than Chromium.
