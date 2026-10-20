# Probe: the specs for sprint 14 (PR B, the home line)

`e2e/sprints-entry.spec.ts`: one test per check of `.studio/sprint/12/contract.md`, "PR B: the way in".
Written before the build; red on the branch as it stands (no home line): 10 of 10 tests fail, all on
the missing `main > header a[href="/sprints"]`.

## How each is read

| Check | Test | What it holds |
|---|---|---|
| C14.1 | one test | header's last child is `p.text-step-base` with children `A`, `SPAN`; link text `Build log`; span text is ` · ${n} sprints` (or `1 sprint`); first char U+00A0; with scripts on and off. `n` is the count of valid retro files (the spec's own oracle), and equals the entries `/sprints` renders. Floor: sprints 1 to 11 are all valid. No literal count. |
| C14.2 | per scheme | link colour is `--accent`, underlined, span `--muted`, link at least 24 px tall at 320 and 390, and the link's `color`, `text-decoration-line`, `text-underline-offset`, `display` equal a Contact link's. |
| C14.3 | one test | header children are `H1, P, P, P, P` (the new line is the fifth, after the bio), the first four texts equal `profile`'s, `[data-hero]` is the header's next sibling, the project cards' hrefs equal `withLink`'s. |
| C14.4 | one test | at 320, 390, 1440: hull box 64 px below the header's bottom, the line inside the header and 16 px below the bio, on one line. At 390 x 844: hull top above the fold, and within (line + gap) of the measured value below. |
| C14.5 | per scheme | Tab 1 skip link, Tab 2 `/sprints`, Tab 3 the first project link; one element with an outline at each stop; the home link's ring is at least 2 px, a token colour, contrast 3, offset 0 or more. |
| C14.6 | one test | `main section` ids are exactly the five in order; exactly one `a[href^="/sprints"]` on `/`, inside the header. |
| C15 | at 390 and 1440 | click the home link, land on `/sprints` (h1 "Build log"), the count on `/` equals the entries there and the valid files, click the back link, land on `/` (h1 is the owner's name). |

## C14.4's measurement (the contract asked for it)

On the build before this sprint, headless Chromium 141 (the cloud's; CI's is 156), 390 x 844: header
y 96, bottom 473.98; `[data-hero]` top 537.98, 99 px tall (bottom 636.98). At 320 and 1440 the hull is
64 px below the header. The spec quotes 537.98 and expects the new top near 537.98 + 27 + 16 = 580.98
(upper bound +3 px for font differences), well above the 844 fold. On my reference (below) the box
top reads about 581.

## Proof the spec works

- **Reference:** a scratch copy (`pnpm build`, `next start`) with a minimal home line using the real
  `readSprintLog`, placed after the bio in the header. All 10 tests pass, and the whole suite passes
  on it: 130 passed, 1 skipped (`content.spec.ts` fixme). So the contract has no conflict with an
  existing spec.
- **On this branch:** the existing 119 tests pass, 1 skipped; the 10 new ones fail.
- **Mutants (10, one run each, each killed):** regular space for the no-break space (C14.1, C15);
  count off by one (C14.1, C15); no underline (C14.2); span in accent (C14.2); line outside the header
  (C14.1 to C14.4, C14.6, C15); a second `/sprints` link elsewhere (C14.6); link `inline` not
  `inline-block` (C14.2); line before the bio (C14.1, C14.3, C14.4); wrong href `/sprint` (all but
  C14.3); `focus-visible:outline-none` on the link (C14.5).

## What is not covered, and why

- `n` of 0 (line left out, `/sprints` unlinked) and `1 sprint`: the checkout has 11 or more retros, and
  no spec rebuilds the site (contract C15). C12 of `sprints.spec.ts` shows the reader on fixtures. The
  singular is not testable here and no check pretends to.
- Axe, contrast, 24 px targets, overflow at 320 and the keyboard order on `/` stay with the existing
  `invariants.spec.ts` and `keyboard.spec.ts`, which read the DOM and so pick the new line up unedited
  (run green on the reference).
- Hover colour of the link is not asserted (cloud Chromium; the Contact links' hover class is the
  copy to make).

## For Forge

- The hull box is `[data-hero]`; the 64 px gap is `main`'s `gap-16`, so the line must be inside
  `header` (the header's `gap-4` gives the 16 px).
- The span's text starts with U+00A0: write `{" "}` or a template, not `&nbsp;` followed by an
  ordinary space inside JSX text that the compiler trims.
- The reference markup that passed: `<p className="text-step-base"><a href="/sprints" className="inline-block text-step-base text-accent underline underline-offset-4 hover:text-foreground">Build log</a><span className="text-muted">...</span></p>`.
