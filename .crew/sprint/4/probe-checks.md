# Sprint 4: Probe's checks (written before the build)

`e2e/a11y.spec.ts` has one test per check, named by its number: C1 to C8. C9 is evidence, not a suite
test (decisions.md, item 2); C10 is CI itself. `e2e/project-cards.spec.ts` C2 gets the one inserted
line `"Skip to content",` at the head of `expected`, a pure added line (the `const expected = [` line is
untouched), so `.crew/scope.mjs` sees nothing removed.

## State against today's build (head 90bc91e, no product change)

All 8 new tests fail, and `project-cards.spec.ts` C2 fails too (it now expects "Skip to content"). None
passes by accident; every failure is "the feature is missing":

| Check | Fails today because |
|---|---|
| C1 | the first `<a>` is the GitHub project link, there is no `a[href="#main"]` |
| C2 | first Tab does not land on a skip link; `main` has no `id`/`tabindex` |
| C3 | passed everything after my own fix (see below): landmarks, regions, headings, lang, title and "text outside main" are already satisfied today. The test passes against today's markup; it fails only if a builder breaks it |
| C4 | Tab order has no skip link (`#main`), so the sequence differs; the later "ring" assertions never run until it is there (they did fail in the scratch mutation without the shared rule: Contact link default ring is 1 px `auto`) |
| C5 | the arrow stays `--muted` (rgb(69, 94, 90)) with keyboard focus |
| C6 | two rings in forced colors: `li` and `a`, both solid 2px (Tailwind's `outline-hidden` draws one in forced colors) |
| C7 | the skip link is missing, so the "skip link focused" runs fail; the strict-tag axe run without it is clean |
| C8 | skip link missing; the Contact links are 21 px tall (see "Needs decision (Atlas)") |

Correction while writing: C3 first read `h2.innerText` (CSS upper-cases the h2s, so "EXPERIENCE") and
failed on today's markup for a wrong reason. The accessible name is the text content ("Experience"), so
the check uses `textContent`. That was my test's bug, found before commit; C3 now passes on today's
build and is a guard, not a driver. Everything else about C3 in the contract was already true.

## Proved buildable (no check is unreachable)

I built a throwaway reference implementation in the scratchpad (not the product tree): skip link with
`sr-only focus:not-sr-only focus:fixed ... bg-background text-foreground`, `main id="main" tabIndex={-1}`
in a fragment, an `@layer base` rule `a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`
plus `[tabindex="-1"]:focus-visible { outline: none }`, the card link on `focus-visible:outline-none`
(not `outline-hidden`), the arrow on `group-has-[a:focus-visible]:text-accent`, and Contact links
`inline-block`. Against it the whole suite (39 tests) passes: all of a11y C1 to C8, project-cards C1 to C9
(with the inserted line), invariants, smoke. That includes C7 (strict axe incl. `wcag22aa`, with the skip
link focused: `color-contrast`, `landmark-one-main`, `region` all in `passes`).

Mutations of the reference, each caught by the right test:
- no shared focus rule: C2 (main shows `auto 1px`), C4 ("stops without a clear focus ring"), C6 (Contact
  outline width) fail.
- shared rule kept, `[tabindex="-1"]:focus-visible` removed: only C2 fails ("main shows no outline while
  focused: auto 1px"). Chrome does draw its default ring on `main` after the skip link is used, so the
  builder must suppress it.
- skip link always visible (no `sr-only`): C1 fails ("hidden before focus", 320 x 25.6 px).

## Needs decision (Atlas): C8 vs "Files the builder will touch"

C8 asks every Contact link to be at least 24 x 24 CSS px at 390 px. Today they are 21 px tall
(`getBoundingClientRect` of an inline `<a>` is its content area, not the 25.6 px line box). The only
fix is in the Contact `<a>` markup or a CSS rule that makes it a block-level box, but the contract says
`app/page.tsx` changes are "nothing else in the file" besides the skip link, `main`'s id and
`tabIndex`, and `globals.css` is limited to one `@layer base :focus-visible` rule. So as scoped the
builder cannot make C8 pass. It is buildable (`inline-block` on those links, which I validated leaves
the page layout intact for C9/the card checks), but the file list needs one more line allowed in
`app/page.tsx` (or `min-h-6`/`inline-block` via a base rule). I did not weaken C8 and did not drop it.

Not a decision, but worth passing to Pixel: it is C2 that catches Chrome's default ring on `main`
(`outline: auto 1px`), and C6 needs the card link on `outline-none` (not `outline-hidden`).

## Notes on the tests

- Scheme: `emulateMedia({ colorScheme })` before `goto` (a transition caught mid-fade otherwise);
  rings and colors are read after `document.getAnimations()` finish.
- C4 reads the focus ring while it is focused, per stop, so it measures live styles, not a snapshot. A
  project link passes if its `a` or its card `li` has the ring; the skip link and Contact links must carry
  it on themselves with a non-negative offset.
- C7 and C8 use `expect.soft` for "the skip link is focused", so the other findings still show.
- No `test.skip`, `fixme`, `fail`, `only`, retries or ignores in `e2e/a11y.spec.ts`.
- C9 is for verification: measure `main` and `h1` boxes against production and the `origin/main` build
  (both schemes, 390 and 1440 px) in one run and report the numbers; `content/` no-diff is the PR file list.
