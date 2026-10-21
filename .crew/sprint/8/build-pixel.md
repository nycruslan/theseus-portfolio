# Sprint 8: build notes (Pixel), the hero half-model, Part A

Outcome: built. `pnpm verify` passes and the whole suite passes (`PLAYWRIGHT_PORT=3327 pnpm test:e2e`:
56 passed, 1 skipped, the existing `content.spec.ts` fixme), with `e2e/hero.spec.ts` C1 to C9 green
and no spec edited.

## What I built

- **`lib/half-model.ts`**: the hull as a small parametric solid, computed once at build time on the
  server. It has a sheer (high at the bow, lowest just aft of midships), a profile drawn as a
  monotone cubic through twelve control points (transom foot, counter, run, a keel with a little
  rocker, a round forefoot, a stem raked about 25 degrees), a waterplane (fine bow, full quarter, a
  transom with breadth) and a rounded section (1 - u²). The rest pose is the contract's oblique
  view, shear +0.24: a point moves down the page by 0.24 × its half-breadth, so the board plane
  stays put. It projects seven lifts at equal board depths (the sheer cuts the first, the keel the
  last), a deck strip (the top face the view from above shows), staggered butts, and the copper
  plank (one butt-to-butt length of the third lift, 30% of the hull). Each lift's light is Lambert
  from the upper left and in front, sampled at seven stations along it, with alternate lifts ±0.04
  apart (alternating woods). Part B can build its mesh from the same functions, so the canvas and
  the SVG are one object by construction.
- **`components/hero.tsx`**: a Server Component that prints the model: `div[data-hero]`
  (aria-hidden) > `svg` (aria-hidden, `focusable="false"`) > `defs` (seven horizontal gradients) +
  `g[data-hero-hull]` > deck, seven `path[data-hero-lift]` (top to bottom, in DOM order),
  `path[data-hero-copper]` and one butts path. It has no text node, no ids that read as hex
  (`hero-lift-N`), no client code and no dependency.
- **`app/globals.css`, "The hero half-model"**:
  - The box is full-bleed at 2.9 : 1 and at most 172 px tall below 768, and 688 × 172 hanging 32 px
    into the gutters from 768.
  - The model's width is `min(112cqw, 436.8px + (100cqw - 390px) × 0.495238, 624px)`, its bow at
    `max(24px, 50cqw - 312px)` from the right, and 624 at 32 px from 768. That is C3's curve
    exactly, so 767 and 768 differ by 0.5 px.
  - Tones (below). Seams are a 1 px `--background` hairline (`vector-effect: non-scaling-stroke`).
  - `display: none` under `forced-colors: active`, and where `color-mix()` isn't supported.
- **`app/page.tsx`**: `<Hero />` right after the header, and a wrapper `div.@container` around `main`
  (see Decisions).

## Decisions

1. **The full-bleed width comes from container units, not `100vw`.** `100vw` counts a classic
   scrollbar, so between 672 and 768 px the box would overhang the page by half a scrollbar and
   scroll sideways (Windows desktops). Container units on an ancestor give the page's own width
   exactly. I tested `container-type` on `body` and on `html` in Chrome, and both stop the body's
   background from reaching the canvas: below a short body the canvas went white. So the container
   is a plain wrapper `div` around `main`, which no spec depends on (I checked for `body > main` and
   ancestor walks; reveal's walk up from the h1 passes). It is the one change outside the hero's
   own files.
2. **Tones: one light value per place, two numbers per scheme.** Each gradient stop and the deck
   carry `--l` (0 to 1, how lit, from the model). CSS turns it into
   `color-mix(in oklab, var(--muted) calc(var(--hero-shade) + var(--hero-span) * var(--l)), var(--background))`.
   Light: 52% to 12% muted (lit is paler), 2.35 to 1.20 : 1. Dark: 18% to 54% (lit is brighter),
   1.28 to 2.79 : 1. So the light comes from the same side in both schemes, the hue is the
   ground's, and nothing passes 2.8 : 1. These are scoped custom properties on `.hero`, mixes of
   the five tokens, not new tokens.
3. **The top face is dark, not exempted** (the contract's C7 settlement). The deck faces up, and
   the light is mostly frontal, so it takes λ 0.08: about 2.2 : 1 in light and 1.34 : 1 in dark.
   It reads as a cap rail, a crisp sheer line in both schemes.
4. **Copper is flat `var(--accent)`.** The plank sits midships, where the side faces the viewer
   and the light barely changes along it, so a gradient there would be invisible. Flat is also
   the token exactly, well inside C7's copper window.
5. **Gradients in bounding-box units.** A lift's box spans exactly its top seam (its stem and
   stern faces run inward), so all seven gradients share the same offsets, and the markup fell
   from 8177 to 6487 bytes. Path data uses Catmull-Rom as `C` then `S` segments (the tangents are
   symmetric, so every joint after the first is an `S`), at one decimal.
6. **`aria-hidden` on the svg as well as the box.** Biome's `noSvgWithoutTitle` asks for it, a
   `<title>` would be a text node (C1), and suppressions are off the table. It is redundant and
   harmless.

## Evidence

| What | Result |
| --- | --- |
| `pnpm verify` | pass (lint, 14 infos all in `e2e/`, none in my files; typecheck; knip; build, `/` static) |
| `PLAYWRIGHT_PORT=3327 pnpm test:e2e` | 56 passed, 1 skipped (existing fixme), on the final tree |
| `[data-hero]` outerHTML | 6487 bytes (C6 cap 8192) |
| First-load JS for `/` (gzip of the six `<script src>` chunks in `.next/server/app/index.html`) | 175,517 bytes here, 175,517 on `origin/main`: equal (C6). Next 16's `next build` no longer prints a size column, so I measured it this way. |
| HTML document `/` | 32,541 → 47,988 bytes raw, 6,146 → 9,328 gzip: the SVG is in the markup and again in the RSC flight data |
| LCP, 4x CPU, branch vs `origin/main` (C5 annotation, three runs) | 390: 200/136, 160/160, 156/160 ms. 1024: 160/132, 124/152, 164/176. 1440: 212/164, 164/152, 188/148. The same `<p>` both sides, all within 100 ms. |
| Geometry (dev build, Chrome) | 320: box 320 × 110.3, hull −62.4 to 296 (header right 296). 390: 390 × 134.5, hull −70.8 to 366. 700: 700 × 172, hull 71.7 to 662 (590.3 wide). 1440: 688 × 172 at 376, hull 408 to 1032. Gap to header 64. |
| Impeccable detector on the changed files | `[]` |

Screenshots, production build, in `.crew/screenshots/sprint-8/` (gitignored):
- `hero-1440-light.png`, `hero-1440-dark.png`: the first viewport at 1440 × 900. The model sits on
  the column's edges under the bio, quieter than the text, with copper the one accent.
- `hero-390-light.png`, `hero-390-dark.png`: 390 × 844. The bow is on the text edge and the stern
  runs off the left, cropped.
- `hero-box-1440-light@2x.png`, `hero-box-1440-dark@2x.png`: the box alone at 2x. Seams, butts,
  the dark deck strip, the lifts darkening toward the keel, and the copper plank on the third lift.

## Not verified

- Only Chromium (Playwright and agent-browser). Safari and Firefox are unchecked: `vector-effect`
  set in CSS, `calc()` with `var()` inside `color-mix()` percentages, and container units on a
  wrapper all need checking there.
- A classic-scrollbar browser between 672 and 768 px: headless Chrome hides scrollbars, so the
  reason for decision 1 is reasoned and tested on `html`/`body`, not seen with a real scrollbar.
- Real phones, and print.

## Needs decision (Iris)

- Is the dark deck strip (decision 3) and the flat copper (decision 4) the object you directed?
  In dark mode the copper plank is the brightest thing in the box at 7.45 : 1, the accent as the
  links use it. It is the contract's "one part freshly fitted", but it is the one place the hero
  is loud.

## Fix round 1 (Iris's two cheap items, `review-iris.md`)

Dark copper is now `color-mix(in oklab, var(--accent) 92%, var(--background))` (light unchanged): measured in Chrome rgb(215,128,93) vs the accent's rgb(235,138,100), dL −0.043, dC −0.011, dh +0.53° against C7's 0.06 / 0.03 / 3°. The `@supports` guard now tests `color-mix(in oklab, currentcolor calc(10% + 10%), transparent)`, the form the tones use. Chromium still draws the box. `pnpm verify` passes, and the suite is 56 passed with 1 skipped. Screenshot: `.crew/screenshots/sprint-8/hero-box-1440-dark@2x-fix1.png`.
