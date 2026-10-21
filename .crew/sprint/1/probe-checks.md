# Probe: contract checks as tests (Sprint 1)

All in `e2e/tokens.spec.ts`. Test titles start with the check id. A check with a grep half and a
browser half is two tests with the same id, so a failure says which half broke.

| Check | Test title | Kind |
|---|---|---|
| C1 | C1 the 5 color tokens and 5 type-step tokens exist on :root | browser |
| C2 | C2 h1 grows with the viewport and the bio stays readable | browser (320, 768, 1440) |
| C2 | C2 (grep) every step token is a clamp() of rem with a vw term | grep |
| C3 | C3 headings, body and links resolve to the tokens | browser (320, 768, 1440) |
| C3 | C3 (grep) no Tailwind size or foreground-opacity utility is left in app/ or components/ | grep |
| C4 | C4 foreground, muted and accent reach 4.5:1 on the background (light / dark) | browser, 2 tests |
| C5 | C5 (grep) one dark block that sets the 5 color tokens and nothing else, no .dark class | grep |
| C5 | C5 dark values differ from light and the body follows --background | browser |
| C6 | C6 nothing overflows horizontally at 320 px (new) | browser |
| C6 | existing `smoke.spec.ts` (axe light and dark, 390 px, reduced motion), unchanged | browser |

## How the checks read the page

- "Resolved" values come from a probe `<div>` with `font-size|color|background-color: var(--token)`
  appended to `<body>` at the same viewport, so `clamp()`/`vw` resolve the way they do on the element.
- Contrast: each color token is converted to sRGB through a canvas (works for hex, rgb, hsl, oklch),
  alpha is composited over `--background`, then the WCAG ratio is computed.
- Grep checks strip CSS comments first, so a comment that mentions `.dark` or `clamp(` neither
  satisfies nor trips a check.

## Interpretations (contract wording that needed a decision)

- C2 grep: the contract says `clamp(` per step token. The test also requires `rem` and `vw` in each
  declaration, from the "Token budget" paragraph (rem min and max with a vw term).
- C3 grep scans every `.ts/.tsx/.js/.jsx/.css/.md(x)` file in `app/` and `components/` with the
  contract's regex, so `globals.css` counts too (no `text-xl` in a comment there).
- C3 checks all `<h2>` and all links inside the Contact section (`section:has(h2#contact) a`).
- C5 grep: "sets all 5 color tokens and nothing else" is read as the dark block holding exactly one
  rule, `:root`, whose declared properties are exactly the 5 color tokens.

## Environment note

The sandbox ships Chromium build 1194, Playwright 1.64 wants 1248, and the CDN is blocked. To run
locally without touching `playwright.config.ts`, point `PLAYWRIGHT_BROWSERS_PATH` at a directory with
`chromium_headless_shell-1248/chrome-headless-shell-linux64/` symlinked to the 1194 files. CI is
unaffected.

## Verified

- Against the pre-sprint code: C1, C2 (both), C3 (both), C4 (both schemes) and C5 (grep) fail for the
  expected reasons; C5 (browser), C6 (320) and the existing smoke checks pass.
- Against a scratch reference implementation (outside the repo) the whole file passes, and with a
  `--muted` of 2.36:1 contrast C4 fails, so the checks can pass and can catch a regression.
