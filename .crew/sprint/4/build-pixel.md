# Sprint 4: Pixel's build

Built: the skip link, one shared focus ring, the card arrow on keyboard focus, one ring in forced
colors, Contact link targets. `e2e/a11y.spec.ts` C1 to C8 and the whole existing suite pass, unedited.

## What changed

- `components/skip-link.tsx` (new, Server Component): `<a href="#main">Skip to content</a>`, `sr-only`
  until focused, then `fixed` at `top-2 left-2` on `bg-background` with `px-4 py-2`. On phones that puts
  its text on the column's 24 px edge. It looks like the card links: `text-foreground` with a copper
  underline, `text-step-base`. It has no transition. Imported by `app/page.tsx`, so knip is satisfied.
- `app/page.tsx`: returns a fragment with `<SkipLink />` first, then `main id="main" tabIndex={-1}`.
  The Contact links gain `inline-block` (decision 4), so each box is its full 1.6 line box: 25.8 px
  tall at 390 px instead of 21. Most of the diff is indentation from the fragment.
- `app/globals.css`: one `@layer base` block. `:focus-visible { outline: 2px solid var(--accent);
  outline-offset: 2px }` plus `[tabindex="-1"]:focus { outline: none }`, so `main` shows no ring after
  the skip link; without that, Chrome draws its own `auto 1px` ring. A comment explains the layer: an
  unlayered rule would beat the card link's utility and give the card two rings. No new custom
  property (project-cards C8 is green).
- `components/project-card.tsx`: the link is `focus-visible:outline-none` (was `outline-hidden`, which
  Tailwind turns into a transparent ring that forced colors paints). The arrow span adds
  `group-has-[a:focus-visible]:text-accent`. I updated the comment that explained the old choice.

## Evidence

- `pnpm verify`: exit 0 (biome ci with no fixes, typecheck, knip, build).
- `PLAYWRIGHT_PORT=3321 pnpm test:e2e`: 38 passed, 1 skipped (the `TODO(owner)` fixme), run twice: once
  before and once after the final skip-link position change.
- At rest, the branch build and an `origin/main` build were compared with full-page screenshots, pixel
  by pixel, in light and dark at 390 and 1440 px: **0 differing pixels** in all four. The `main` and
  `h1` boxes are identical:
  - 390 px: main 0,0 390 x 1186.84; h1 24,96 342 x 49.75
  - 1440 px: main 384,0 672 x 1188.41; h1 408,96 624 x 76
  - Script: `scratchpad/s4/rest-diff.mjs`. Probe still owns C9 against production.
- agent-browser `--session pixel` on the production build:
  - Skip link focused: box 8,8 145 x 42 at 390 px and 158 x 45 at 1440 px.
  - Enter sets the hash to `#main`, focus to `MAIN` with `outline: none`, and the next Tab goes to the
    Theseus link.
  - Card arrow on focus: `rgb(148, 65, 38)` in light, `rgb(235, 138, 100)` in dark (the accent tokens).
  - Contact links at 390 px: GitHub 50.4 x 25.8, LinkedIn 62.5 x 25.8.
- With JavaScript off (Playwright, `javaScriptEnabled: false`), Tab then Enter: the hash is `#main`,
  focus is on `MAIN` and the next Tab is Theseus. `/no-such-page` contains no `href="#main"`.
- Screenshots (not in git) are in
  `/tmp/claude-0/-home-user-theseus-portfolio/d0d1e768-e1be-5dc2-8708-509314b09678/scratchpad/s4/`:
  - `skip-{light,dark}-{390,1440}.png`
  - `card-{light,dark}-{390,1440}.png`
  - `contact-{light,dark}-{390,1440}.png`
  - `after-skip-light-390.png`

## For Iris (advisory)

- I placed the skip link at `top-2 left-2` rather than the more usual `top-4 left-4`, so its text lines
  up with the column's 24 px edge on phones. At 1440 px it sits in the viewport corner, away from the
  column.
- On a Contact link, the 2 px ring at a 2 px offset hugs the line box, so the underline sits close to
  the ring's bottom edge. Giving it more room needs padding, which changes the layout at rest. I left
  it alone.

## Out of scope, untouched

`e2e/`, `content/`, `app/layout.tsx`, `lib/site.ts`, `package.json` and every owner path.
