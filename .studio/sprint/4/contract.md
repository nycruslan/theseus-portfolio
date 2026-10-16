# Sprint 4 contract

Size: M. One PR, one builder (Pixel: it is CSS, a small component and a focus look), Probe for e2e, Lens
review, Iris advisory (`design/calibration/` is still empty). Branch: `sprint/4-a11y-pass`. No direction
document is needed: the look is "the focus ring the cards already have, everywhere", so Pixel reuses
the 2 px `--accent` ring and the sprint adds no new visual idea.

## Goal

Roadmap item 6: **Accessibility pass: landmarks, focus styles, skip link, and zero axe violations.**

Why this over scroll reveal (item 4): a keyboard or screen-reader visitor today tabs through every
project before reaching anything else, with no skip link; the Contact links, the one thing a recruiter
came to use, show only the browser's default ring; and the sprint 3 card has two known gaps (arrow
stays grey on keyboard focus; in forced colors the link and the card both draw a ring). Axe is already
clean, so this sprint is about what axe cannot see. Reveal motion is decoration, needs script or
scroll-driven CSS, and would hide content before it is seen, which collides with the no-script,
no-flash and no-`useEffect` guards; it goes next, on top of rules this sprint settles.

## Outcome

A keyboard user lands first on a "Skip to content" link that appears on focus and moves them to the
main content. Every focusable thing on the page, skip link, project cards and Contact links alike,
shows the same obvious ring, in both schemes and in forced colors, with one ring and not two. The
card's arrow turns copper when its link has keyboard focus, as it does on hover. Axe reports nothing.
At rest, the page looks exactly as it does now.

## Where existing checks already cover this (keep green, unedited, except as marked)

- `e2e/invariants.spec.ts`, per scheme: axe on `/` with no violation of any impact; every visible text
  element uses a color token and a `--step-*` size (this binds the skip link even while hidden, since a
  clipped link still has a box); contrast thresholds; 320 px no horizontal overflow; JS-off first
  paint; the five color and five step tokens are set.
- `e2e/project-cards.spec.ts`: C1 to C9 stay green. Three bind this sprint especially:
  - C2 compares all text outside the cards with the profile. The skip link adds the text "Skip to
    content" first in the DOM. Probe makes the one change this needs: insert the line
    `"Skip to content",` at the head of C2's `expected` array. That adds a line and removes none, so it
    is not a weakening under `.studio/scope.mjs`; Probe says so in her report. If she judges otherwise,
    stop and report "Needs decision (Atlas)" rather than skipping anything.
  - C6 (card ring: 2 px or more, token color, contains the card's center) and C7 (reduced motion: no
    animation, no transition on the card, no `"use client"`, `useEffect`, `matchMedia` or `dark:` in
    `app/` or `components/`).
  - C8 (no color literal or palette utility; `app/globals.css` declares exactly the custom properties it
    declares today, in order). So no new token, and any new rule uses `var(--accent)` and the like.
- `e2e/smoke.spec.ts`: h1 is the owner's name; reduced motion loads with every h2 visible; head, 404.
- `e2e/content.spec.ts`: the `TODO(owner)` test stays `test.fixme`, untouched.

## Checks

New tests go in `e2e/a11y.spec.ts` (Probe), one test per check, named by its number, reading projects
and links from `content/profile.ts`. "Both schemes" means `colorScheme` `light` and `dark`. No check
uses `test.skip`, `test.fixme` or `test.fail`. "A token color" means a color equal to one of the five
resolved tokens (`resolveColors` in `e2e/helpers.ts`).

**C1. A skip link is the first stop and is hidden until focused.** On a fresh load of `/`, the first
`Tab` focuses an `a[href="#main"]` whose accessible name is exactly `Skip to content`, and it is the
first `a` in DOM order. Before focus, it is not perceivable: its box is at most 1 x 1 px, or lies wholly
outside the viewport (right or bottom edge at or below 0). After focus, at 320 and 1440 px wide, in both
schemes: its box lies wholly inside the viewport, is at least 24 x 24 px, and starts within the top 100
px; its text color is a token color; its computed `background-color` is opaque and a token color; the
contrast of the two is at least 4.5:1 (`contrast` and `composite` in `e2e/helpers.ts`); its font size is
one of the `--step-*` sizes; its `transition-duration` is `0s`.

**C2. The skip link works.** With the skip link focused, pressing `Enter` makes `new URL(page.url()).hash`
equal `#main` and `document.activeElement` the one `main` element, which has `id="main"` and
`tabindex="-1"`. The main element shows no outline while so focused (`outline-style` is `none` or
`outline-width` is `0px`). The next `Tab` lands on the first link inside `main` (the first project's
link when it has an `href`, otherwise the first Contact link), not on the skip link. The skip link is not
rendered on `/no-such-page` (the 404 has no `main` to point at): `request.get` its HTML and expect no
`href="#main"`.

**C3. Landmarks and headings.** `getByRole("main")` has count 1. Each of the three sections
(`section[aria-labelledby]` in `main`) has role `region` whose accessible name equals the text of its
`h2` (Experience, Projects, Contact). There is exactly one `h1`; walking `h1, h2, h3` in DOM order, no
heading is more than one level deeper than the one before it. `html` has `lang="en"` and `document.title`
is not empty. Every element with text (outside the skip link) is inside `main`: expected, since the
header stays in `main` this sprint.

**C4. One focus look for everything focusable, in both schemes.** Press `Tab` repeatedly from a fresh
load until focus leaves the page's links (at most 12 presses); the sequence is the skip link, then each
project link that has an `href`, then each Contact link, in that order, each exactly once. For every
stop, with any transition finished (as C6 in `project-cards.spec.ts` does), the stop or its card
(`li`) has an outline of at least 2 px, style neither `none` nor `hidden`, whose color is a token color
that is at least 3:1 against `--background`, and the outlined box contains the stop's center. For the
Contact links and the skip link the outline sits on the link itself, with a non-negative offset, so it
does not cover the text. Every `[tabindex]` in the page is `-1` or `0`: none positive, and only `main`
has `-1`.

**C5. The card's arrow follows keyboard focus.** Tab to a project link that has an `href`. The arrow
(`svg` inside the card's link-sibling `span`, in `li`) has computed `color` equal to `--accent`; with
focus elsewhere (press `Tab` once more, or `blur()`) and the mouse off the card, the same arrow's `color`
equals `--muted`. Both schemes. Hover behaviour is unchanged, and C7 of `project-cards.spec.ts` still
passes.

**C6. Forced colors keep exactly one ring.** With `page.emulateMedia({ forcedColors: "active" })`, Tab
to a project link that has an `href`: among the `li` and its descendants, exactly one element has an
`outline-style` other than `none` with a width above 0, and it is not the `a`. Tab to the first Contact
link: it has an outline of at least 2 px with a style other than `none`. Without forced colors, C6 of
`project-cards.spec.ts` stays green.

**C7. Axe, with the strict tag set, with the skip link showing.** For both schemes at 390 and 1440 px,
once with nothing focused and once with the skip link focused:
`new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])`
returns no violation of any impact (the existing invariants test runs the default rule set and stays as
it is). `passes` contains `color-contrast`, `landmark-one-main` and `region`.

**C8. Targets are big enough.** At 390 px, the skip link (focused) and each Contact link have a bounding
box at least 24 x 24 CSS px (WCAG 2.2 target size, minimum). Project links are covered by C3 of
`project-cards.spec.ts` (the card is the target).

**C9. The page at rest is unchanged.** With nothing focused, in both schemes, at 390 and 1440 px: the
`main` element's bounding box and the `h1`'s are the same as on production
(https://theseus-portfolio.vercel.app) within 1 px in x, y, width and height; Probe measures both in the
same run and reports the numbers (if production cannot be reached from CI, she reports that instead and
the check compares against the `origin/main` build, never skips). `content/` has no diff
(`git diff --name-only origin/main` has no path starting `content/`).

**C10. Nothing else regressed.** `pnpm verify` passes. `PLAYWRIGHT_PORT=<free port> pnpm test:e2e`
passes with every existing spec unedited except the one inserted line in C2 named above. Shown by CI
and Probe's report. `package.json` scripts, `biome.json`, `knip.json` and the rest of the owner's setup
have no diff. If knip fails on a new file, Pixel imports it, not Probe.

**Visual evidence (Iris, not pass/fail):** screenshots at 390 and 1440 px in light and dark of (a) the
skip link focused, (b) a Contact link focused, (c) a project card focused, next to production.

## Out of scope

- Any change to what the page says or to `content/`. The only new words are the UI label "Skip to
  content" (interface text, not an owner fact). The Theseus `href` stays `TODO(owner)` and is not
  printed.
- A `banner` landmark (moving the header out of `main`), a `footer`/`contentinfo`, a `nav`. Revisit
  when the page gains a second route.
- `app/not-found.tsx`, `scrollbar-color`, the no-break space before " · " in role titles.
- Scroll reveal and any other motion (item 4), the 3D hero (item 7), a theme toggle.
- `overflow-wrap:anywhere` for long card text (a content question; the owner's descriptions are short).
- New tokens, colors, type steps, spacing or radius tokens; changes to `lib/site.ts`.
- Test weakening of any kind; `playwright.config.*`, `biome.json`, `package.json` scripts, `.claude/`,
  `.studio/` scripts, `.github/`.

## Files the builder will touch

- `app/page.tsx`: render the skip link first, give `main` `id="main"` and `tabIndex={-1}` (return a
  fragment); nothing else in the file. The link lives in the page, not in `app/layout.tsx`, so routes
  without a `main` (the 404) get none.
- `components/skip-link.tsx` (new, optional): a Server Component with a named export, if it keeps
  `page.tsx` readable.
- `app/globals.css`: one shared `:focus-visible` rule for links, inside `@layer base` so the card's
  `focus-visible:outline-hidden` utility still wins (an unlayered rule would beat every Tailwind utility
  and give the card two rings). It uses `var(--accent)`, a 2 px width and a positive offset. A comment
  says why it is layered. No new custom property.
- `components/project-card.tsx`: the arrow turns `text-accent` when the card's link has focus-visible
  (`group-has-[a:focus-visible]:text-accent`); the link draws no outline of its own in forced colors
  either (the card keeps its ring).

Probe adds `e2e/a11y.spec.ts`, plus the one inserted line in `e2e/project-cards.spec.ts` C2. Pixel does
not touch `e2e/`.

## Constraints

- Server Components only; no `"use client"`, `useEffect` or `matchMedia` (project-cards C7 guards it).
  The skip link and its reveal are CSS only; read `node_modules/next/dist/docs/` before writing code.
- The skip link must work with JavaScript off (it is a plain fragment link).
- Rendered owner text is identical before and after.
- Run the scope rules on `e2e/a11y.spec.ts` before review (sprint 3 lesson): no added `test.skip(`,
  `test.fixme(`, `test.fail(`, retries or ignores.
