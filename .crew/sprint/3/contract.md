# Sprint 3 contract

Size: M. One PR, one builder (Pixel, visual work), Probe for e2e, Lens review, Iris for direction and
review (advisory until `design/calibration/` has the owner's examples). Branch: `sprint/3-project-cards`.
Iris writes `.crew/sprint/3/direction.md` first (the card's form); this contract sets what the card
must do and the guards it must not trip, not how it looks.

## Goal

Roadmap item 3: **Project cards: give each project a card with its name, description and link.**

Why now: it is the first sprint that changes layout, which is what has held the score at 6.8 for two
sprints (Originality 6, "a résumé template"). Projects are also the part of the page a visitor most
wants to open: today the only way in is a small copper title, and the target is a line of text high.
Tokens and dark mode are done, so cards are drawn once and are right in both themes. Items 4 (motion)
and 6 (accessibility) build on the card, so it comes first. Sprint 1 and 2 follow-ups fold in here:
project titles in `--foreground` with a copper underline (`sprint/2/review-iris.md` finding 1), because
the dark accent leans coral at display size.

## Outcome

A visitor sees each project as a distinct, delimited card in the Projects section: name, description,
and one obvious link. The whole card is the target (a thumb on a phone can't miss it), the title reads
in the page's ink with a copper underline, and a keyboard user sees the whole card outlined when its
link is focused. The page says exactly what it said before. Light and dark both work from the tokens.

## Design intent (for Iris's direction and review, not Playwright checks)

- Not a uniform rounded-card grid (the rubric's "fails on sight"). With one project today the card has
  to look deliberate alone, and still hold when the owner adds more.
- Delimited by the existing tokens only (a `--rule` border or similar). No new colors, no new type
  steps, no shadows or glow.
- A visible sign that the card is a link, with no new words: CSS or an inline SVG, `aria-hidden`.
- Title in `--foreground`, underline copper (`--accent`); `--accent` stays for the contact links.
- Experience and Contact keep their present look. Only the Projects block and what it needs change.

## Where existing checks already cover this

Probe: don't duplicate these; the card must keep them green unedited.
- `e2e/invariants.spec.ts` "every text color and size comes from a token", per scheme, at 320 and 1440
  px: every visible text element in a card uses a color token and a `--step-*` size. Binds the card.
- `e2e/invariants.spec.ts` "text meets its contrast thresholds" and "axe finds no violation of any
  impact", per scheme: axe runs on the whole page, so the card must not nest interactive elements, give
  two links the same name for one target, or hide text in low contrast.
- `e2e/invariants.spec.ts` 320 px "nothing overflows horizontally": the card has to reflow.
- `e2e/invariants.spec.ts` JS-off first paint, theme-color, and tokens-vs-`lib/site.ts`: the card adds
  no script, so these hold. No client component is needed.
- `e2e/smoke.spec.ts`: h1 is the owner's name; reduced motion loads with all h2s visible; the head
  (og:image, canonical, JSON-LD) and the 404 stay as they are.
- `e2e/content.spec.ts`: the `TODO(owner)` test stays `fixme` and untouched.

## Checks

Each is one Playwright test in a new `e2e/project-cards.spec.ts` (Probe), or a grep as marked. "Both
schemes" means `colorScheme` set to `light` and `dark`. Read the project from `content/profile.ts`
(`profile.projects`) so a changed list can't break them.

**C1. One card per project, with its name, description and link.** In `#projects`, the number of cards
(list items) equals `profile.projects.length`. Each card holds an `h3` whose text is the project name,
the description text, and, for a project with an `href`, exactly one link whose `href` equals
`project.href` and whose accessible name contains the project name. A card for a project with no `href`
has no link (grep: `app/page.tsx` or the card component still branches on `project.href`).

**C2. No words added, none lost.** For each card, its visible text (`innerText`, whitespace
normalized) equals the project name followed by its description and nothing else. The affordance is
CSS or `aria-hidden` SVG, never text. The text outside `#projects` is byte-identical to what
`origin/main` renders (header, Experience, Contact): Probe records those strings from the profile, not
from a snapshot.

**C3. The whole card is the target.** For a project with a link: at the card's center, its four corners
inset by 8 px, `document.elementFromPoint` returns the link or an element inside it, or
`.closest("a")` is that link. At 390 px the card is at least 44 px tall and the link covers it.

**C4. Title in ink, underline in copper, in both schemes.** The title's computed `color` equals the
resolved `--foreground`; its `text-decoration-line` contains `underline` and its `text-decoration-color`
equals the resolved `--accent` (use `resolveColors` in `e2e/helpers.ts`). The two Contact links keep
`color` equal to `--accent`.

**C5. A card reads as a card.** The card has a border width above 0 on at least one side, or a
`background-color` different from the body's, in both schemes. Border or background colors resolve to a
token (`--rule`, `--background`, `--foreground`, `--muted` or `--accent`), not a literal. Nothing is
translucent beyond a token's own alpha, and there is no `box-shadow` other than `none`.

**C6. Keyboard.** Tabbing (`page.keyboard.press("Tab")`) until the project link has focus, with
`:focus-visible` true, the card (or the link, if it spans the card) shows an outline of at least 2 px,
style not `none`, with a color resolving to a token, and the outlined box contains the card's center.
Item 6 owns the page-wide focus pass; this covers only the new card.

**C7. No motion, no flash, no script.** With `reducedMotion: "reduce"`, `document.getAnimations()`
returns 0 and the card and its link have `transition-duration` of `0s`. Any hover change is color only,
and a transition, if one is used, is under `motion-safe:`. Grep, `app/` and `components/`: no
`"use client"` added, no `useEffect`, no `matchMedia`, no `dark:` variant.

**C8. Tokens only.** Grep, `app/` and `components/` (except `app/layout.tsx`): no hex, `rgb(`, `hsl(`
or `oklch(` color literal, and no Tailwind palette utility (`black`, `white`, or `slate|gray|zinc|
neutral|stone-<n>`). `app/globals.css` gains no new color token and no changed value; the five
`--step-*` declarations stay byte-identical to `main`.

**C9. Reflow.** At 320 and 390 px, in both schemes, the card's right edge is inside the viewport,
`scrollWidth - clientWidth <= 0`, and no card text is clipped (`scrollWidth <= clientWidth` on the
title and description). Axe is already per-scheme in invariants; no new axe test is needed.

**C10. Nothing else regressed.** `pnpm verify` and `PLAYWRIGHT_PORT=<free port> pnpm test:e2e` pass;
every existing e2e file passes unedited. Shown by CI and Probe's report. `content/` has no diff (grep
`git diff --name-only origin/main` for `content/`).

**Visual evidence (not pass/fail):** screenshots at 390, 1024 and 1440 px in light and dark next to
production, per the rubric's first verdict, for Iris. Production's stand-ins ("Company name", the
LinkedIn link) are the owner's pending content and don't fail the gate. The card must not make a
stand-in more prominent: the project's URL is not printed as text, since the Theseus `href` is itself
marked `TODO(owner)`.

## Out of scope

- Any edit to `content/` or to what the page says. No new copy: no "View project", no tags, no dates,
  no images. The card is built from `name`, `description` and `href`.
- A card for Experience or Contact, a filter, a carousel, a grid for one item, a hover lift or any
  motion (item 4), a toggle, a client component.
- The no-break space before " · " in role titles (`sprint/2/review-iris.md` finding 3): Lens-2 showed
  a proposed fix of that kind made things worse (`.crew/STATE.md`, sprint 1 lesson), so it needs
  trying in a browser first. Not here.
- `scrollbar-color` and a token-styled `app/not-found.tsx` (items 6 and later); skip link and the page
  accessibility pass (item 6); the 3D hero (item 7).
- New colors, new type steps, new tokens, spacing or radius tokens; a dark OG variant.
- Test files, `playwright.config.*`, `biome.json`, `package.json` scripts and the rest of the owner's
  setup.

## Files the builder will touch

- `app/page.tsx`: the Projects block uses the new component (and nothing else in the file).
- `components/project-card.tsx` (new): a Server Component with a named export, typed with `Project`
  from `content/profile.ts`.
- `app/globals.css` only if a utility can't express a rule (for example the stretched link), with a
  comment saying why. No token changes.

Probe adds `e2e/project-cards.spec.ts` (and additions to `e2e/helpers.ts` if needed, no weakening).
Pixel doesn't touch `e2e/`.

## Constraints

- `pnpm verify` and `pnpm test:e2e` pass; knip is clean (the new component is imported).
- Server Components only; follow the repo rules in `AGENTS.md`; read the Next docs in
  `node_modules/next/dist/docs/` before writing code.
- Rendered owner text is identical before and after. The sprint adds no placeholder and makes none more
  prominent than on production.
