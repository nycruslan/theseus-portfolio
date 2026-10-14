# Sprint 2 contract

Size: M. One PR, one builder (Forge or Pixel), Probe for e2e, Lens and Iris review. Iris sets the dark
values in `.studio/sprint/2/direction.md`; this contract sets the thresholds those values must meet,
not the hex values.

## Goal

Roadmap item 2: **Dark mode that follows the system preference, with accessible contrast in both
themes.**

Why now: sprint 1 left a dark block "for parity only" (copied values nobody designed), and Iris's
sprint 1 review found the dark accent reads apricot rather than copper (`review-iris.md` finding 3, and
the retro follow-up). Every later item (project cards, reveal motion, the OG image) will be drawn on
both backgrounds, so the dark theme has to be a real one before more surface is built on it. The tokens
it needs are already in place, so this sprint is small: tune five values, tell the browser about the
two schemes, prove nothing flashes.

## Outcome

A visitor whose system is set to dark gets a considered dark theme from the first paint: the same
page and words, the same copper-on-patina mood, readable at a glance, with the browser's own scrollbars,
form controls and mobile address bar in the matching dark. A visitor on light sees exactly the page they
saw before. Nobody sees a flash of the wrong theme, because the switch is CSS only.

## No toggle (one line)

System preference only. A toggle needs JavaScript, stored state and a pre-paint script to avoid a flash,
which gives up the CSS-only guarantee C5 proves; the roadmap item says "follows the system preference",
and a toggle can be its own item if the owner wants one.

## Design intent (for Iris's review, not a Playwright check)

The dark `--accent` moves toward hue 40 to 45 so it reads as copper, not peach, and stays at 7:1 or more
(C3). The five token names stay: `--background`, `--foreground`, `--muted`, `--accent`, `--rule`. No new
colors, no new type steps.

## Where the existing e2e checks already cover this

Probe: do not duplicate these. Reuse their helpers (or lift them to a shared file, additions only) and
write the new checks in `e2e/dark-mode.spec.ts`.
- `e2e/tokens.spec.ts` C1: the 5 color tokens and 5 step tokens exist. Covers token names.
- `e2e/tokens.spec.ts` C4: `--foreground`, `--muted` and `--accent` reach 4.5:1 on `--background`, in
  light and in dark. Covers the AA floor; C3 below only raises thresholds above it.
- `e2e/tokens.spec.ts` C5, grep half: exactly one `prefers-color-scheme: dark` block, on `:root`, that
  sets the 5 color tokens and nothing else, and no `.dark` selector. **This stays green and unedited.**
  It forces `color-scheme` to be declared in the base `:root` rule, outside the dark block (C1 below),
  and it is half the proof of no toggle and no flash.
- `e2e/tokens.spec.ts` C5, browser half: dark `--background` and `--foreground` differ from light, and
  `body` follows `--background`. Covers "dark actually changes".
- `e2e/tokens.spec.ts` C3 and C2: the page uses the tokens, the type scale is fluid. Covers type
  staying put.
- `e2e/tokens.spec.ts` C6 (320 px) and `e2e/smoke.spec.ts` (390 px overflow, reduced motion): no
  regression.
- `e2e/smoke.spec.ts`: axe with serious or critical violations fails, in both schemes. C4 below is the
  stricter version (any impact).

## Checks

Probe turns each into one Playwright check (a grep half and a browser half are two tests with the same
id, as in sprint 1). "In both schemes" means `colorScheme` set to `light` and to `dark`.

**C1. The browser knows the page has two themes.** In both schemes:
- `getComputedStyle(document.documentElement).colorScheme` contains both `light` and `dark`;
- `<meta name="color-scheme">` has content `light dark`;
- a probe `<input>` appended to the page has a different computed `background-color` in dark than in
  light (native controls follow the scheme).

By grep: the `color-scheme` declaration is in `app/globals.css` and not inside the
`prefers-color-scheme: dark` block (that block stays 5 tokens, tokens C5). Shown by one browser test
and one grep assertion.

**C2. The address bar matches, per scheme.** The document has exactly two `<meta name="theme-color">`
tags, one with `media="(prefers-color-scheme: light)"` and one with
`media="(prefers-color-scheme: dark)"`. Each `content`, resolved to a color, equals the resolved
`--background` of its own scheme (read with the scheme emulated). This is worth doing: the pale
sea-glass and the hull-dark backgrounds are both far from the browser's default white or black, and a
mismatched address bar on a phone is the most visible seam in a themed site. It is also cheap, a
`viewport` export in `app/layout.tsx`. Shown by a Playwright test that parses the two tags.

**C3. Contrast thresholds, in both schemes.** Measured from resolved values in the browser against the
rendered `--background`, by the same luminance function as tokens C4:
- `--foreground` at least 7:1 in light and in dark (body text at AAA);
- `--accent` at least 7:1 in dark (the sprint 1 follow-up: links are 16 to 18 px text);
- `--foreground` on `--rule` at least 4.5:1 in both schemes, because `::selection` draws
  `--foreground` text on a `--rule` background;
- `--muted` and light `--accent` stay at the tokens C4 floor of 4.5:1 (not re-tested here).

`--rule` as a line has no ratio requirement. Shown by one Playwright test per scheme.

**C4. Zero axe violations in both schemes.** axe-core on `/` reports no violation of any impact
(not only serious and critical), in light and in dark, with the `color-contrast` rule included. Shown by
one Playwright test per scheme.

**C5. No flash of the wrong theme, and no toggle.** The switch is CSS only, so this is provable:
- Browser: with `javaScriptEnabled: false` and `colorScheme: dark`, `body` computed `background-color`
  equals the dark `--background` on first load; with `colorScheme: light` it equals the light one. A
  page that is correct with no script cannot be corrected by a script after paint.
- Served HTML: fetched with `request.get("/")`, no `<script>` text contains `prefers-color-scheme`,
  `localStorage` or `data-theme`.
- Grep, `app/` and `components/` (all files) and `package.json`: no `localStorage`, `sessionStorage`,
  `data-theme`, `dangerouslySetInnerHTML`, `next-themes` or `matchMedia`, and no Tailwind `dark:`
  variant. (A `dark:` utility would compile to a second dark media rule that tokens C5 cannot see.)
- Together with tokens C5 (one dark block in `globals.css`, no `.dark`), that is the whole proof.

Shown by two browser tests and one grep assertion.

**C6. The dark theme has one source, the tokens.** By grep, in `app/` and `components/` (except
`app/layout.tsx`, whose `viewport` export holds the two theme-color values that C2 pins to the tokens):
no hex, `rgb(`, `hsl(` or `oklch(` color literal, and no Tailwind palette-color utility
(`bg|text|border|ring|fill|stroke` followed by `black`, `white` or `slate|gray|zinc|neutral|stone-<n>`).
In `app/globals.css`, outside the two token blocks, the same: colors come from `var(--token)`. Shown by
one grep assertion.

**C7. Light is unchanged.** With `colorScheme: light`, the computed values of the 5 color tokens on
`:root` equal sprint 1's: `#e6f3f1`, `#0f2220`, `#455e5a`, `#944126`, `#c5d5d2` (as `rgb()`), the 5
`--step-*` declarations in `app/globals.css` are byte-identical to `main`'s, and `body` color and
background equal `--foreground` and `--background`. Shown by one Playwright test holding those values
as literals. Visual half, not pass/fail: Iris compares 390 px and 1440 px light screenshots of the PR
against production and reports any pixel-level change as a finding.

**C8. Nothing else regressed.** `pnpm verify` and `PLAYWRIGHT_PORT=<free port> pnpm test:e2e` pass; all
existing e2e files pass unedited (Probe may add `e2e/dark-mode.spec.ts` and lift helpers, no
weakening). Shown by the CI run and Probe's report.

**Visual evidence (not pass/fail):** Iris receives 390 px and 1440 px screenshots in dark and light,
next to production, per the rubric's first verdict. Design bar for dark: a hull-dark that is not pure
black, text that is bright but not glaring, copper that reads as copper, no gray-on-gray, accent for
links only.

## Out of scope

- A theme toggle, a stored preference or any client-side theme code (see "No toggle").
- New colors beyond the 5 tokens, new type steps, spacing or radius tokens.
- Project cards, new components or layout changes (item 3); scroll motion (item 4); OG image (item 5);
  skip link, focus styles and the full accessibility pass (item 6), which still owns landmarks and focus
  work. Item 6 keeps the axe goal for the page as it grows; C4 here only covers the page as it is.
- A dark favicon or dark OG variant.
- Any edit to `content/` or to what the page says. Fonts stay Geist.

## Housekeeping (not a check)

`app/globals.css` is edited this sprint, so the builder adds the comment sprint 1's review asked for
(`review-lens-2.md` Nit 2): a line telling builders to add an `@source` for any new folder that holds
class names.

## Constraints

- `content/` does not change; rendered text is identical before and after.
- Existing e2e checks stay green and unedited by the builder; Probe owns `e2e/`.
- The owner's setup files (`biome.json`, `package.json` scripts, `.claude/`, `.github/`, and the like)
  are not touched. The builder adds no dependency for theming (C5 would fail on `next-themes`).
