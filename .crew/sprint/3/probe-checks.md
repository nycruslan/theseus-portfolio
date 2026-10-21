# Sprint 3: Probe's checks (written before the build)

Spec: `e2e/project-cards.spec.ts`, one test per contract check, named `C1.` to `C10.` (C7 has two
tests under one `describe`). Run against the sprint's base (9a37002), the current page:
`PLAYWRIGHT_PORT=3317 pnpm test:e2e` gives 27 passed, 4 failed, 1 skipped (the owner's `fixme`);
`pnpm verify` passes. The four failures are the card work not yet done, each for the right reason.

## State now

| Check | Now | Why |
|---|---|---|
| C1 one card, name, description, link | pass | Already true: one `li`, `h3` "Theseus", one link to `project.href` with the name as its accessible name; `app/page.tsx` still branches on `project.href`. Guards the build from losing it. |
| C2 no words added or lost | pass | Card text is exactly name + description; the text outside the cards equals the profile's strings in order. Guards the build. |
| C3 whole card is the target | FAIL | `elementFromPoint` at the center and corners (inset 8 px) lands on `<h3>`/`<p>`, not the link: the target is the title text only. |
| C4 title ink, underline copper | FAIL | Title `color` is `--accent` (should be `--foreground`) and it has no underline until hover. The Contact links already read `--accent`; that part passes. |
| C5 reads as a card | FAIL | The `li` has no border (all widths 0) and a transparent background. |
| C6 keyboard outline | FAIL | Focus shows Chrome's default ring: 1 px, `auto`, on the link only, which does not contain the card center. |
| C7 reduced motion, no script (2 tests) | pass | No animation, no transition, hover changes no geometry; no `use client`, `useEffect`, `matchMedia` or `dark:` in `app/` or `components/`. Guards the build. |
| C8 tokens only | pass | No literal in `app/`, `components/` (apart from the token declarations); `app/globals.css` declares exactly the 31 custom properties it does at 9a37002. Guards the build. |
| C9 reflow at 320 and 390 | pass | No overflow, no clipped text. Guards the build. |
| C10 | partly | No test: the `content/` diff is `.crew/scope.mjs`'s job (it fails any PR that touches `content/`, an owner path), so the C10 test was dropped (it needed `origin/main` and used `test.skip`, which scope.mjs rejects). `pnpm verify` and the full suite passing cover the rest. |

## Proof the checks are fair

The checks were also run against two throwaway builds of a card (in the scratchpad, not in the repo):
- A reference card that meets the contract (bordered `li`, stretched link with an `after:` box,
  `--foreground` title with a `decoration-accent` underline, `has-[a:focus-visible]:outline-2
  outline-accent` on the `li`, an `aria-hidden` SVG arrow, `motion-safe:transition-colors`): all of
  `e2e/` passes, 3 runs in a row, no flake (at that time 30 passed, 2 skipped; the C10 skip has since been removed with the C10 test).
- A bad card (`border-rule/50`, `shadow-sm`, un-guarded `transition-colors`, `hover:-translate-y-1`,
  a link that does not stretch, an outline on the link only, a `before:content-['→']` glyph, an SVG
  without `aria-hidden` at `opacity-50`) fails C2, C3, C5, C6 and C7 with the reason named.

## How the checks read the contract (decisions I made; tell me if wrong)

- **`#projects` is the h2**, not the section (`Section` puts the id on the heading). The tests
  scope to `section[aria-labelledby="projects"]` and take the cards as its `li`s.
- **The card's "surface"** is the `li` or any descendant whose box covers it (within 1 px), so a
  border or background on an inner wrapper or on the link counts for C5. Outline candidates for C6
  are the `li`, any descendant, and their `::before`/`::after` (a stretched link's pseudo-element
  gets its box from its containing block).
- **C2** reads the text outside the cards from `profile` in order: name, headline, location, bio,
  "Experience", each role's `title · company`, period, summary, "Projects", "Contact", the link
  labels. It also fails a `content:` glyph on any `::before`/`::after` (an arrow written as text
  is text), an `svg` without `aria-hidden="true"`, and any `img`/`canvas`/`video` in a card.
- **C5 beyond the letter:** every element in the card must have `box-shadow` and `text-shadow`
  `none` and `opacity: 1`, and SVG fill and stroke must be tokens (or `none`). A default SVG fill
  is black, which is a literal. Border and background colors must equal a token's computed
  `rgb()` exactly, which is what "no translucency beyond a token's own alpha" means in a browser
  (a `border-rule/50` computes to an `oklab(... / 0.5)`).
- **C3** has the five points on a desktop viewport (1280 px), the whole 3 x 3 grid at 390 px, a
  height of at least 44 px at 390, and a real click in the bottom-right corner (inset 8 px) that
  must navigate to `href` (the destination is stubbed with `page.route`, no network).
- **C7** also checks every element in the card for `transition-duration` and `animation-duration`
  of `0s` (not only the card and link), and compares geometry, `transform`, `box-shadow`,
  `filter`, `opacity` and border width before and after a hover. Under `reduce` a `motion-safe:`
  transition computes to `0s` and passes.
- **Transitions:** when the page switches scheme, a card with a `transition-colors` would be
  measured mid-fade, so C4, C5, C9 set the scheme first and then load; C6 waits for transitions
  to finish after the focus lands. Without that, a correct card would fail.
- **The no-`href` branch (C1)** can only be seen in source; the profile has no such project. The
  test greps `app/page.tsx` and `components/project-card.tsx` for a test on `href`. A weak check:
  Lens should read the branch.

## Needs decision (Quill)

1. **C8 as worded cannot pass.** It exempts only `app/layout.tsx` from "no hex / rgb( / hsl( /
   oklch( literal", but `app/globals.css` declares the ten color tokens in hex (and `app/icon.svg`
   and `lib/site.ts` hold the same hex; `lib/` is outside the scope). I read it as: apart from
   those ten token declarations (and `.svg`, which is not scanned). Say if you want it otherwise.
2. **C8's "byte-identical to main"** is a snapshot of the 31 custom properties at 9a37002 in the
   spec (the CI checkout has no `origin/main` to diff against). It is sprint 3's guard: a later
   sprint that retunes a token has to update or retire it, which only Probe can do. I will fold
   the lasting part into `invariants.spec.ts` after the merge; Atlas, put that on the retro.
3. **C10's `content/` diff** has no test any more. It needed `origin/main`, which CI's one-commit
   checkout lacks, so it skipped there, and `.crew/scope.mjs` rejects an added skip as weakening
   the suite. `scope.mjs` already fails a PR that touches `content/`, so that is the guard.
4. **C4 "title"**: I take the element holding the project name inside the `h3`, and look for the
   underline on it or the nearest ancestor up to the card. The link-around-heading form (`a > h3`)
   is not covered; the `h3`-holds-`a` form and a `span` inside it are.
5. **C3 click:** if the owner's `href` ever becomes a `mailto:` or other non-http link the stubbed
   click would not navigate; fine today, the content is `https:`.

## Not covered, on purpose

- Axe: `invariants.spec.ts` runs it on the whole page per scheme at the card's final state, and the
  contract says no new axe test. It is the check that the card has no nested interactive element.
- Visual evidence (390/1024/1440 px, both schemes, next to production) is Iris's, and I will
  take the screenshots after the build.
- Hover on a touch device and a focus ring against the card's rounded corners are things a person
  looks at; I will look when the build lands.
