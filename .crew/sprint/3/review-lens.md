Verdict: ship

# Sprint 3: Lens review of PR #16 at 57999ec

I reviewed `git diff origin/main...57999ec` against the contract, `decisions.md` and `direction.md`.
The product change is `components/project-card.tsx` (new) and the Projects block of `app/page.tsx`.
I read the rest of the diff too: Probe's `e2e/project-cards.spec.ts`, the sprint docs, the roadmap
and the memory files. I found no Important issues and no Nits that need a change.

## Evidence

- `pnpm verify`: exit 0. Biome ran clean, then typecheck, knip and build.
- `PLAYWRIGHT_PORT=3337 pnpm test:e2e`: exit 0. 31 passed and 1 skipped (the owner's `fixme` in
  `content.spec.ts`). That includes C1 to C10 and every existing file, none of them edited.
- Scope: the diff touches no file under `content/`, `app/globals.css`, `.github/`, the owner's
  toolchain or `package.json`. The only `e2e/` change is the new spec, so no existing test is
  weakened.
- Compiled CSS (`.next/static/chunks/*.css`):
  - `md:px-[calc(--spacing(8)-1px)]` compiles to `padding-inline:calc(calc(var(--spacing) * 8) - 1px)`.
    The operator has its spaces, so the `calc` is valid.
  - The `hover:*` rules sit inside `@media (hover:hover)`, so a tap leaves no hover stuck on.
  - `focus-visible:outline-hidden` adds the `@media (forced-colors:active)` 2 px transparent
    outline, so forced-colours mode still draws a ring.
- Geometry, measured with Playwright on the production build in both schemes at 320, 390, 767, 768,
  1024 and 1440 px:
  - The title, the description, the `PROJECTS` label and the Experience titles share one left edge
    at every width (24, 71.5, 72, 200 and 408 px).
  - The arrow's right edge sits on the column's content edge.
  - At md and up the frame hangs exactly 32 px.
  - Nothing overflows: `scrollWidth` equals `clientWidth`.

## Decisions item 4: the no-`href` branch

I read it in the source and also rendered it. I transpiled the component with `typescript`,
rendered it with `react-dom/server` for three projects (linked, no `href`, `href: ""`), then put
that markup into the real page and its real CSS.

- With no `href` the card keeps the same `plank` frame and padding. The `h3` holds the plain name in
  `--foreground`, inherited from `body`. It has no `a`, no underline, no arrow, no `group`, no
  `hover:` and no `has-[…]` focus classes, as the direction asks.
- With no arrow in the second grid column, both the `h3` and the `p` take `col-span-2`, so the
  name gets the full measure.
- `href: ""` takes the same branch (`!project.href`), as `main` did. That's right: an empty
  `href` would be a link back to the page itself.
- In a stack of a linked and an unlinked card, they share one 1 px seam. The hovered linked card
  paints its copper over that seam, and the unlinked card never changes.

## Pixel's two deviations from direction

**`md:px-[calc(--spacing(8)-1px)]` instead of `md:p-8`: correct, keep it.** The direction says the
padding equals the hang so the text keeps the column's edge. From md the plank also gets side
borders (`md:border`), so with `md:p-8` the content would start at −32 + 1 + 32 = +1 px. That
puts it 1 px off the label and the Experience titles, and pushes the arrow 1 px inside the
right edge. With 31 px of inline padding the edges match exactly at 768, 1024 and 1440, which I
measured. Below md there are no side borders, so `px-6` against `-mx-6` is already exact.
Tying the 1 px to `--spacing(8)` keeps the hang and the padding moving together. A bare
`md:px-[31px]` would let them drift apart.

**`has-[a:focus-visible]:z-10`: correct and needed.** Each card after the first pulls up 1 px
(`not-first:-mt-px`), and all cards are `relative` with `z-index: auto`, so the next card paints
over the one before it. The focus ring is 2 px drawn inward (`-outline-offset-2`), so its bottom
1 px row is the shared seam. I captured the seam at 4x scale on a stack of three cards at 1024 px
and read the pixel column, by drawing each capture to a canvas in Chromium:

| | with `z-10` | `z-index: auto` |
|---|---|---|
| light | copper 8 px (2 CSS px) | copper 4 px, then `--rule` 4 px |
| dark | copper 8 px | copper 4 px, then `--rule` 4 px |

Without it, the focused card's bottom edge is 1 px of copper, which reads as hover rather than
focus. The direction gave `z-10` to hover for exactly this reason and missed the same case for
focus. With one project today nothing differs on screen, but the ring breaks as soon as the owner
adds a second project.

## Other things I checked and found sound

- The stretched link: the `li` is the only positioned ancestor, so the `a::after` covers its
  padding box. The arrow and the description aren't positioned, so the `::after` paints over them,
  and a click anywhere on the plank (inset 8 px) goes to the link (C3). The link's accessible name
  is the project name alone. The arrow sits outside the link, and its SVG is `aria-hidden`.
- No `"use client"`, no effect, no transition, no shadow, no radius and no literal colour. Every
  colour is a token utility.
- `h-[1lh]` with `text-step-lg` on the arrow box uses the title's own line height, so the arrow
  centres on the title's first line.
- The `md:-mx-8` hang never overflows. md is 48rem and `main` is `max-w-2xl` (42rem), so at md
  `main` has 3rem of margin on each side, and the frame needs only 0.5rem beyond `main`'s padding.

## For the retro (not blocking)

- **Probe:** C6 checks the ring's computed width, not what paints. So the `has-[…]:z-10` above is
  load-bearing but untested: deleting it keeps every check green. A check with two cards, one
  focused, that reads the stacking order or the pixels at the seam would hold it. Today's content
  has one project, so the check would have to inject a second card the way the C3 script does.
- **Iris (observation, as directed):** between 672 and 767 px the phone plank's top and bottom
  rules end at `main`'s box, about 48 px in from the viewport edges, not at the screen edge. That
  matches the direction (`-mx-6` against `main`'s `px-6`). Whether open-ended rules at that width
  read as intended is your call.
