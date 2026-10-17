# Sprint 6: Probe's checks

Spec: `e2e/profile-sections.spec.ts`, one test per check, named by number. Facts come from
`content/profile.ts`. Additive helper: `STACK` and `EDUCATION` selectors in `e2e/helpers.ts`.
One existing test line changed: `e2e/reveal.spec.ts:323` (`sectionIds` gains `stack` and `education`, decisions.md #4); no skip, fixme or fail.

Proved on this branch (sections absent): all six fail, each on the missing section or order, none
on a test bug. Proved buildable and biting: a scratch reference page (Stack as a `flex-wrap` `ul`,
Education as an `ol` of `h3` + period, reusing `Section`) passes all six; mutants fail the right
check (swapped order: C1; link in a stack item: C5; extra word in a period: C4; one tool per line
or a trailing `·` on an item: C2 and C6; items forced wide: C6).

| Check | Failure now |
| --- | --- |
| C1 | `ids of the h2s in main, in DOM order`: received `experience, projects, contact`, missing `stack`, `education` |
| C2 | `the Stack section (section[aria-labelledby="stack"])`: toHaveCount(1), received 0 |
| C3 | `the Education section (section[aria-labelledby="education"])`: toHaveCount(1), received 0 |
| C4 | same missing-section message (it asserts both sections exist before reading text) |
| C5 | same, on Stack first |
| C6 | same, on Stack (overflow at 320 px is not reached) |

C7 (gate) is CI's: `pnpm verify` passes with the spec in (lint, typecheck, knip, build), and the
diff is checked by the `gate` check, not a browser test.

## For the builder

- Find-by-label: the `<section>` must carry `aria-labelledby="stack"` / `"education"` (`Section`
  does this); the h2 id is the same string.
- C2: each Stack `li` is exactly one tool, nothing else in it (no separator characters, no icon
  text). Draw separators with borders or gaps, not text in the `li`. `innerText` is compared, so
  CSS `text-transform` on the items would break verbatim (keep the case as the owner wrote it).
- C3: each Education `li` has exactly one `h3` containing the school. The credential and period
  can sit in the `h3` or beside it, but all three must be in the `li`'s visible text verbatim.
  There must be one list (`ul` or `ol`) per new section.
- C4: allowed leftovers are whitespace and `· — – , |`. Any other word, label ("Tools",
  "Graduated") or generated `::before`/`::after` text fails. A `·` text node between items passes
  C4 but fails C2.
- C5: no `a`, `button`, `input` or `[tabindex]` in either section.
- C6: row counting groups item tops within 2 px (the contract says distinct tops; this tolerates
  sub-pixel noise and nothing else). The overflow part checks `li` boxes, so items must sit inside
  the Stack section's box at 320 px; a long unbreakable item must be allowed to shrink or wrap.
- CONTRACT CONFLICT, confirmed on the scratch reference build: `e2e/reveal.spec.ts` C2 "At rest
  nothing moved" fails with a correct implementation. Line 323 hard-codes
  `sectionIds = ["experience", "projects", "contact"]` and line 388 asserts the page's sections
  equal it (received two extra: `stack`, `education`). Everything else in the existing suite
  passes on the reference (46 passed, plus the existing `content.spec.ts` fixme). The contract says
  no existing test line changes, so the builder cannot make this green. Proposed fix, for Atlas to
  approve: Probe changes line 323 to `["experience", "projects", "stack", "education", "contact"]`
  in a separate commit (a strengthening: it then also compares the new sections' geometry with and
  without motion). The `gate` check may hold the PR for the owner since it edits a test.
