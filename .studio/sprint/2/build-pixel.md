# Sprint 2 build notes (Pixel)

Dark mode that follows the system preference, built to `contract.md` (C1-C8) with Iris's values from
`direction.md`. CSS only: no client theme code, no new dependency.

## What changed

- `app/globals.css`
  - Dark block: `--accent` `#e79d73` -> `#eb8a64` (oklch 73% 0.13 42, copper), `--rule` `#283635` ->
    `#2d4543` (oklch 37% 0.03 189, deep verdigris). The other three dark values are unchanged; each line
    keeps its oklch intent in a comment, and the comment above the block no longer says "parity only".
    The block still sets exactly the 5 color tokens (tokens C5).
  - `color-scheme: light dark` in the base `:root` rule, outside the dark block (C1).
  - Housekeeping: the top comment now tells builders that a new folder holding class names needs its own
    `@source` line. It names no utility class, so tokens C3's grep stays clean.
  - Light values and the 5 `--step-*` declarations are untouched.
- `app/layout.tsx`: a `viewport` export (`Viewport` type, Next 16 docs
  `01-app/03-api-reference/04-functions/generate-viewport.md`) with `colorScheme: "light dark"` and two
  media-scoped `themeColor` entries, `#e6f3f1` (light) and `#091413` (dark), each equal to its scheme's
  `--background`. A comment says why they are literals and that they change with the tokens.

## Evidence

- `pnpm verify`: exit 0 (lint, typecheck, knip, build; biome prints only info-level notes on
  `.studio/guard.mjs`).
- `PLAYWRIGHT_PORT=3517 pnpm test:e2e` (Chromium 1194 through a `PLAYWRIGHT_BROWSERS_PATH` shim in my
  scratchpad, config untouched): 29 passed, 1 skipped (the sprint 0 `test.fixme` in `content.spec.ts`).
  `dark-mode.spec.ts` C1 (browser and grep) and C2, which failed at `f45b7f7`, now pass; every other check
  stays green.
- Resolved in the browser (production build, canvas-converted sRGB), WCAG 2.x ratios:

  | Pair | Light | Dark |
  |---|---|---|
  | foreground / background | 14.53 | 15.30 |
  | muted / background | 6.15 | 7.60 |
  | accent / background | 6.06 | 7.45 |
  | foreground / rule (selection) | 10.88 | 8.39 |

  Identical to Iris's table. `colorScheme` on `:root` is `light dark` in both schemes. Served head:
  `<meta name="theme-color" content="#e6f3f1" media="(prefers-color-scheme: light)">`,
  `<meta name="theme-color" content="#091413" media="(prefers-color-scheme: dark)">`,
  `<meta name="color-scheme" content="light dark">`.
- Light unchanged, pixel for pixel: `origin/main` (`03cff89`) built in a scratch copy and served next to
  this branch, full-page screenshots compared by canvas: light 390 px and 1440 px, **0 differing pixels**.
  Dark differs only where the copper is (1354 px at 390, 1766 px at 1440: the link and project-title
  glyphs and underlines).
- Weight: CSS 10298 -> 10424 bytes raw (+126), 3142 -> 3179 gzip (+37). HTML 12108 -> 12632 bytes
  (+524: the three meta tags, in the head and in the flight data). No JavaScript added.
- Screenshots (headless Chromium, `deviceScaleFactor` 1, full page):
  `shots/pixel-390-light.png`, `shots/pixel-390-dark.png`, `shots/pixel-1440-light.png`,
  `shots/pixel-1440-dark.png`, and `shots/pixel-390-{light,dark}-selection.png` with the Contact section
  selected, showing the verdigris selection across the links.

## Not verified here

- Native scrollbars and the mobile address bar rendering dark: headless screenshots draw neither. Both are
  driven by the values above (`color-scheme`, `theme-color`), which the checks pin.
- 1024 px and production itself: the proxy blocks production, so `origin/main` built locally stood in.
- agent-browser and `/_next/mcp` (next-dev-loop): agent-browser isn't installed in this sandbox (engineer
  memory), so I checked the page with Playwright against a production build instead of `next dev`.
