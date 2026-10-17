# Sprint 6 contract

Size: M. One PR, one builder (Forge), Probe writes the checks first, Lens reviews in CI, Iris
reviews the running site as advice. Branch: `sprint/6-education-stack`.

## Goal

Roadmap item "Education and stack": show `profile.education` and `profile.stack` (the owner's 2026
facts in `content/profile.ts`) on the page. Picked over the 3D hero, which sits above it, because
that item is L (new visual language, a contract the owner approves first) and this one shows facts
the owner just added and nothing renders yet (see `decisions.md`).

## Outcome

Two new sections join the page, in the same plain register as the rest: **Stack**, the tools the
owner lists, as a compact wrapping list of plain words; and **Education**, each school with its
credential and period, laid out like an Experience entry. Section order becomes Experience,
Projects, Stack, Education, Contact. The facts appear verbatim and nothing is added to them. Both
use `components/section.tsx`, so they get the sprint 5 heading rise for free. Nothing in them is
interactive.

## Existing checks that bind this (keep green, unedited)

- `e2e/invariants.spec.ts`: every section a region named by its h2, no skipped heading level, text
  colors and sizes from tokens (body text at least 16 px), contrast, strict axe per scheme, no
  horizontal overflow, no color literal or palette utility in `app/` and `components/`.
- `e2e/reveal.spec.ts`: every section below the fold rises and comes to rest where it would sit
  under reduced motion; reduced motion is still.
- `e2e/keyboard.spec.ts`: Tab order and rings (the new sections add no Tab stop).
- `e2e/cards.spec.ts`, `e2e/smoke.spec.ts`.

## Checks

New tests go in `e2e/profile-sections.spec.ts` (Probe), one per check, named by number. Facts are
read from `content/profile.ts` (import it, never copy strings). A section is found by its label:
`section[aria-labelledby="stack"]` and `section[aria-labelledby="education"]`. "Normalized" text
collapses whitespace runs to one space and trims. No check uses `test.skip`, `test.fixme` or
`test.fail`.

**C1. Section order.** The ids of the h2s in `main`, in DOM order, are exactly `experience`,
`projects`, `stack`, `education`, `contact`. The new h2s read "Stack" and "Education"
(textContent).

**C2. Stack lists every tool, in order.** The Stack section holds one list whose `li` count equals
`profile.stack.length`, and the normalized text of item *i* is exactly `profile.stack[i]`.

**C3. Education lists every entry, in order.** The Education section holds one list with one `li`
per `profile.education` entry, in order. Each `li` holds exactly one `h3`, whose normalized text
contains the entry's `school`, and the `li`'s visible text contains the `school`, the
`credential` and the `period`, each verbatim.

**C4. Nothing added.** In each new section, take the visible text (`innerText`) without the h2,
remove every fact the section shows (each stack item; each entry's school, credential and period).
What is left is only whitespace and the separators `·`, `—`, `–`, `,` and `|`. The sections contain
no `::before`/`::after` generated text other than empty strings.

**C5. Nothing interactive.** The new sections contain no `a`, `button`, `input` or element with a
`tabindex`, so they add no Tab stop.

**C6. They reflow.** At 320 x 800 and at 390 x 844, in light and in dark: the page has no
horizontal overflow and every Stack item's box lies inside the Stack section's box
horizontally. At 390 x 844 and at 1440 x 900 the Stack items sit on fewer distinct rows (item tops)
than there are items (it is not one tool per line).

**C7. Gate.** `pnpm verify` passes, the whole suite passes, and the diff touches no owner path and
nothing in `content/`.

## Out of scope

- Grouping or categorising the stack (the owner lists it flat; adding categories adds facts).
- Links on schools or tools, logos, icons, badges with color fills beyond the existing tokens.
- New color or type tokens; any change to `app/globals.css` custom properties.
- The skip-link open question and the 3D hero (later sprints).
- Turning `e2e/content.spec.ts`'s `test.fixme` back into `test` (content no longer carries
  `TODO(owner)`; a follow-up for Probe, kept out so the only existing test line this PR changes is the one decisions.md #4 records).

## Notes for the builder

- `app/page.tsx` is the expected place; a small component per section is fine. A guide, not a fence.
- The stack may read as a line of words with separators, or as quiet chips drawn with `--rule`; Iris
  judges taste afterwards. Keep it calm: this page's register is typographic.
- Reuse the Experience entry's classes for Education so the two read as one family.
