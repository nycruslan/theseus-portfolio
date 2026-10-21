# Sprint 1 contract

Size: M. One PR, one builder (Forge or Pixel), Probe for e2e, Lens and Iris review.

## Goal

Roadmap item 1: **Design tokens: a color palette and a fluid typography scale in `app/globals.css`,
used across the page.**

Why now: every later item (dark mode, project cards, reveal motion, OG image) needs a palette and a
type scale to build on, and today the page has neither. Colors are two variables plus gray
`text-foreground/60` opacity hacks, and type sizes are Tailwind defaults (`text-4xl`, `text-xl`,
`text-sm`). Doing this first means the next sprints add features instead of re-deciding colors.

## Outcome

A visitor sees the same page and the same words, but with a deliberate palette (a distinct mood and
one accent, not the template gray) and headings and body text that scale smoothly from a 320 px phone
to a 1440 px desktop. All of it comes from named tokens in `app/globals.css`, so no component
hard-codes a size or a gray.

## Fate of the existing `prefers-color-scheme: dark` block

**Kept, as parity only.** Removing it would regress visitors who browse in dark mode, and the old
axe dark check would then be testing a light page. But this sprint does not grow it: the block stays
a single `@media (prefers-color-scheme: dark)` rule on `:root` that gives each color token a dark
value, so that no text is unreadable in dark. Designing the dark theme properly (palette tuning,
`color-scheme` and meta, any toggle, a full contrast pass) stays roadmap item 2, which remains
unchecked.

## Token budget (cap, so the sprint stays small)

Names are fixed so Probe can test them.
- Color, 5 tokens: `--background`, `--foreground`, `--muted`, `--accent`, `--rule`.
- Type, 5 fluid steps: `--step-sm`, `--step-base`, `--step-lg`, `--step-xl`, `--step-2xl`, each a
  `clamp()` between a rem minimum and maximum with a `vw` term.
- Tokens are exposed to Tailwind through `@theme inline` (the existing pattern), so utilities such as
  `text-muted` and `text-accent` work.

## Checks

Probe turns each into one Playwright check in `e2e/`. Where a check says "in both schemes", it runs
with `colorScheme` set to `light` and to `dark`.

**C1. The tokens exist.** In a browser, on `:root`, `getComputedStyle` returns a non-empty value for
all 5 color tokens and all 5 type-step tokens. Shown by one Playwright test that reads the 10
properties.

**C2. The type scale is fluid.** The `<h1>` computed `font-size` at viewport widths 320, 768 and
1440 px is strictly increasing, and the 1440 value is at least 1.4 times the 320 value. The body
paragraph size (the bio) is at least 16 px at 320 px. Shown by a Playwright test that resizes the
viewport and reads computed sizes. Also by grep: `app/globals.css` contains `clamp(` for each of the
5 step tokens.

**C3. The page actually uses the tokens.** In a browser:
- the `<h1>` computed `font-size` equals the resolved value of `--step-2xl` (measured by applying
  `font-size: var(--step-2xl)` to a probe element at the same viewport), and each `<h2>` equals
  `--step-sm`;
- `body` computed `color` and `background-color` equal the resolved `--foreground` and
  `--background`;
- the Contact links' computed `color` equals the resolved `--accent`.

By grep: no match of `text-(xs|sm|base|lg|xl|[2-9]xl)\b` or `foreground/[0-9]` in `app/` or
`components/` (only token-backed utilities remain). Shown by one Playwright test plus one grep
assertion in the same spec.

**C4. Contrast, in both schemes.** The computed WCAG contrast ratio against the rendered
`--background` is at least 4.5:1 for `--foreground`, `--muted` and `--accent`. It is measured from the
resolved color values in the browser, once in light and once in dark. Shown by a Playwright test that
computes relative luminance. `--rule` is decorative and has no ratio requirement.

**C5. The dark block stays parity-only.** Grep: `app/globals.css` has exactly one
`prefers-color-scheme: dark` block, it sets all 5 color tokens and nothing else, and the file has no
`.dark` class selector. In a browser: with `colorScheme: dark`, `--background` and `--foreground` each
differ from their light values, and `body` computed `background-color` equals the dark `--background`.
Shown by a grep assertion plus a Playwright test.

**C6. Nothing regressed.** The existing e2e checks pass unchanged: axe has no serious or critical
violations in light and dark, there is no horizontal overflow at 390 px, and the reduced-motion test
passes. Plus a new check that nothing overflows horizontally at 320 px (the rubric gate). `pnpm
verify` and `PLAYWRIGHT_PORT=<free port> pnpm test:e2e` pass. Shown by the CI run and the Probe report.

**Visual evidence (not a pass/fail check):** Iris receives 390 px and 1440 px screenshots in light and
dark, next to production, per the rubric's "first verdict". The design bar here is a distinct mood: no
purple-to-blue gradient, no gray-on-gray, and the accent used for links only, sparingly.

## Out of scope

- A dark theme redesign, a theme toggle, `color-scheme` or meta theme-color work (item 2).
- Project cards, new components or layout changes (item 3). Spacing and the `max-w-2xl` column stay.
- Scroll reveal or any motion (item 4), OG image (item 5), skip link and focus-style work (item 6), 3D
  (item 7).
- More than 5 colors or 5 type steps; spacing or radius tokens.
- Any edit to `content/` or to what the page says. Fonts stay as they are (Geist).

## Constraints

- `content/` is the owner's facts and does not change. The rendered text is identical before and
  after.
- The existing e2e checks stay green and stay unedited by the builder. Probe owns `e2e/`.
- The owner's setup files (`biome.json`, `package.json` scripts, `.claude/`, `.github/`, and the like)
  are not touched.
