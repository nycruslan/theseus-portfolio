# Sprint 1 contract: design tokens

Lane: M. Roadmap item: "Design tokens: a color palette and a fluid typography scale in
`app/globals.css`, used across the page."

## Why this, why now

Every later item (dark mode, cards, motion, OG image) needs a palette and a type scale to build on,
and today the page has neither: two colors, and gray text made with `text-foreground/60` opacity,
which is the "low-contrast gray on gray" the rubric fails on sight. A visitor opening the site now
sees a default Tailwind page that could belong to anyone. This sprint gives it a mood of its own and
a readable hierarchy on a phone and on a wide monitor, with no new content and no new components.

## Goal

`app/globals.css` defines one small, deliberate light palette and one fluid type scale. Every color
and every font size on the page comes from them. The page reads as a designed thing with a distinct
mood (not zinc/gray, not a purple-to-blue gradient), with a clear heading hierarchy that scales
smoothly between 320 and 1440 px.

## Scope and caps (keep it small)

- Palette: at most 8 color tokens, defined in `@theme` in `app/globals.css`. Body text on the
  background must be at least 7:1; muted text and the link/accent color at least 4.5:1.
- Type scale: at most 6 fluid steps, each a `clamp()` of a rem minimum and a preferred value that
  includes `vw`, defined as `--text-*` tokens in `@theme`.
- Fonts: next/font only (self-hosted, no layout shift), at most 2 families. Swapping the seed's
  Geist is allowed if it serves the mood.
- Files expected to change: `app/globals.css`, `app/page.tsx`, `components/section.tsx`,
  `app/layout.tsx` (fonts only). Markup and class changes only; no new sections.

## Out of scope

- **Dark mode.** The seed's `@media (prefers-color-scheme: dark)` block is removed, and the page
  declares `color-scheme: light`, so the site is light-only this sprint. This is a deliberate,
  temporary regression for visitors on a dark system theme: their page turns light rather than
  keeping an untested dark theme with seed colors that don't match the new palette. The roadmap's
  dark mode item is the next sprint and must not be started here (no dark token values, no dark
  variants).
- Project cards, scroll reveal or any motion, OG image, 3D, skip link and landmark work (a11y pass),
  new copy.
- Anything in `content/`. The owner's facts are unchanged; the seed's stand-ins ("Company name" and
  the like) still render, because only the owner can replace them (see hard gates).
- `e2e/` edits by builders. Probe owns the new tests that prove the checks below.

## Checks

Each is provable in a Playwright test (grep-able file check or browser observation).

1. **Palette tokens exist and are capped.** `app/globals.css` declares between 4 and 8
   `--color-*` custom properties in `@theme`, and at least `--color-background`/`--color-foreground`
   style roles for page and text, plus a muted-text role and an accent role. Shown by: a test reads
   the file and counts them.
2. **Fluid type scale exists and is capped.** `app/globals.css` declares between 4 and 6 `--text-*`
   tokens, each using `clamp(` with a `rem` bound and a `vw` term. Shown by: file read and regex.
3. **The page actually uses them, with no leftovers.** `app/page.tsx`, `components/` and
   `app/layout.tsx` contain no hex/rgb/hsl color literals, no Tailwind arbitrary color values, no
   opacity-modified text colors (`text-foreground/NN`), and no stock size utilities
   (`text-sm`, `text-xl`, `text-4xl` and so on); sizes come from the `--text-*` tokens. Shown by: a
   test greps those files.
4. **Hierarchy scales with the viewport.** In a browser, the h1's computed font size at 1440 px
   wide is strictly greater than at 390 px; at both widths h1 > h2 and h1 > body paragraph; and
   body paragraph text is at least 16 px at 320 px wide. Shown by: Playwright measures
   `getComputedStyle` at three viewports.
5. **Light-only, dark block gone.** `app/globals.css` contains no `prefers-color-scheme`, and
   declares `color-scheme: light`. With `colorScheme: "dark"` emulated, the body's computed
   background and text colors equal those under `colorScheme: "light"`. The existing axe tests in
   `e2e/smoke.spec.ts` (light and dark) still pass with no serious or critical violations. Shown
   by: grep plus a computed-style comparison, plus the existing suite.
6. **Reflows at 320 px.** At a 320 px viewport, after `document.fonts.ready`, `scrollWidth` is at
   most `clientWidth`, and the h1 text (the owner's name, unchanged) is fully visible. The existing
   390 px overflow test still passes. Shown by: Playwright.

Also unchanged and must stay green: `e2e/content.spec.ts`, the reduced-motion test, `pnpm verify`.

## Rubric hard gates that apply

- **axe: serious/critical.** Yes (check 5). Contrast is where this sprint can break it.
- **Reflow at 320 px.** Yes (check 6). Fluid type is the risk.
- **Phone budget (LCP 2.5 s, no shift).** Yes. Fonts via next/font only; font choice must not add
  layout shift. Iris or Probe confirms.
- **impeccable detector: no error level.** Yes.
- **Reduced motion.** Applies trivially: this sprint adds no motion, so nothing may be added.
- **No placeholder renders.** Applies to the product, but is not this sprint's to fix: the seed
  `content/profile.ts` still renders stand-ins and `e2e/content.spec.ts` is `test.fixme` until the
  owner's content lands. Reviewers should not mark this sprint `changes` for those strings, but
  must fail it if the sprint adds any new placeholder text.
- Also reviewed against "first verdict: compared with production" (better/same/worse at 390, 1024,
  1440 px). Dark-scheme visitors going light is the one accepted difference, recorded above. Rubric
  "fails on sight" list applies to the palette (no purple-to-blue gradient, no glow, no gray on
  gray).

## Done means

All six checks pass in `pnpm test:e2e`, `pnpm verify` is green, and the change is seen working in a
browser at 320, 390, 1024 and 1440 px.
