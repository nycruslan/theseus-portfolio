# Probe review 2, sprint 3 (PR #16), head a10d633

Verdict: ship

Fresh checkout of a10d633 (`git rev-parse HEAD` = a10d633b48f3699ec8e458462327b1c4028a3110) in my own
worktree, `pnpm install --frozen-lockfile`, then the commands below. This is about a10d633 only.

## What changed since 57999ec (the head Probe verified in review-probe.md)

`git diff --stat 57999ec a10d633 -- app components lib content package.json` is empty: product code,
content and scripts are unchanged. The only code-side change is `e2e/project-cards.spec.ts`:

- C10 test removed (and the now-unused `execFileSync` import).
- C4 split by `project.href`: with an href, ink title plus copper underline (as before); without one, the
  title is ink and its `text-decoration-line` must not contain `underline`.

## Spec hygiene

- Added `test.skip` / `fixme` / `fail` / `only` / `retries` / `testIgnore` / `grepInvert`: none. Checked two ways:
  `git diff origin/main a10d633 -- e2e` has no added line matching `.skip(`, `.fixme(`, `.fail(`, `.only(`,
  `retries:`, `testIgnore`, `grepInvert`; and no removed line at all. Against `origin/main` the PR's e2e change
  is one new file (`e2e/project-cards.spec.ts`, 745 added, 0 removed), so `.studio/scope.mjs` has nothing to flag
  (its `WEAKENS` and removed-line rules are what I mirrored by hand; I did not run the script, it reads the PR
  over the GitHub API).
- `playwright.config.ts` untouched, `retries: 0` stands.
- Dropping C10: the part it tested (no diff under `content/` against `origin/main`) is `.studio/scope.mjs`'s job
  in CI, and I confirmed `git diff --name-only origin/main a10d633 -- content` is empty. Contract C10 also says
  "verify and e2e pass", which they do. Nothing in the other 9 checks moved. I judge this fine, not a weakening:
  the test was new in this PR and its skip was the thing the scope rule rejects.

## Gates

- `pnpm verify`: exit 0 (lint, typecheck, knip, build).
- `PLAYWRIGHT_PORT=3387 pnpm test:e2e`: exit 0, 30 passed, 1 skipped (the `TODO(owner)` fixme in
  `content.spec.ts`, untouched). 57999ec had 31 passed: the difference is C10.

## Checks, by number

| # | Result | Evidence |
|---|---|---|
| C1 | pass | spec C1 passes; fails when a mutant adds text to the link name (m12, m16). |
| C2 | pass | spec C2 passes; fails when the arrow loses `aria-hidden` (m09) and when the name gains words (m12, m16). |
| C3 | pass | spec C3 passes; fails when the `::after` overlay is removed (m01) and on a 700 px wide card (m08). |
| C4 | pass | spec C4 passes on the real content and on a 3-project scratch profile (linked, no-href, linked). Fails when the link is copper (m02), when the underline is gone (m10), and when a no-href title gets an underline (m17). |
| C5 | pass | spec C5 passes; fails on `rounded-xl shadow-lg` (m04). |
| C6 | pass | spec C6 passes; fails when the focus ring is removed (m03). By hand, below. |
| C7 | pass | both C7 tests pass; fail on a hover translate transition (m07) and on `"use client"` (m11). |
| C8 | pass | spec C8 passes; fails on `text-gray-500` (m05) and `text-[#123456]` (m06). |
| C9 | pass | spec C9 passes; fails on a 700 px wide card (m08) and a wrapped extra span (m16). |
| C10 | pass, by hand | verify and e2e above; `content/` has no diff against `origin/main` (no test for it any more). |

## Mutation run (scratch copy, not the PR)

Scratchpad copy of the repo, one edit to `components/project-card.tsx` per run, `next build`, `next start` on
3391, the project-cards spec against it. Baseline (m00, unmodified card) 10 passed. 14 of 17 mutants were
caught by the check named above, each by exactly the expected check (m08 and m16 by two or three). Three
survive, none against C1-C9 as written:

- m13 removes `hover:border-accent`, m15 removes `group-hover:text-accent` (arrow), m14 removes the
  `not-first:-mt-px` seam pull. The contract fixes hover only as "color only, no motion" and one card has no
  neighbour to share a seam with, so nothing in C1-C9 demands these. Not a failure; a candidate for a later
  check if Iris wants the hover state or the 1 px seam pinned (seam needs 2+ projects).

## Browser look (production build of a10d633 on 3392, Playwright Chromium, 390 and 1440, both schemes)

- Tab once: the Theseus link is focused, `:focus-visible` true, the card draws a 2 px solid outline, copper
  `rgb(148,65,38)` light and `rgb(235,138,100)` dark, at both widths.
- `scrollWidth - clientWidth` is 0 at all four combinations. No console errors or warnings, no page errors.
- Screenshots read as before: hairline planks, ink title with copper underline, small arrow top right, text on
  the column edge. At 390 the planks are two full-bleed rules; at 1440 they gain side rules. Both schemes read
  cleanly. Files (not in git): `scratchpad/p2-{light,dark}-{390,1440}.png`, `p2-focus-*.png`.

## Not checked

- `.studio/scope.mjs` itself against the PR (needs the GitHub API); I checked its rules by hand on the diff.
- Hover in a real pointer-capable browser beyond what C7 does in Playwright; agent-browser headless reports no
  hover support, so I did not use it for hover.
- Touch on a phone; C3 is checked with mouse clicks at corners.

## Process note

The guard refuses a shell line that both writes a protected-looking path and is built at run time, and also
refuses `kill $pid`. Variants of the card were generated by one script into the scratchpad, a second script
copied a variant by literal path and ran build/serve/test with `kill $!`, a third looped. The scratch profile was
edited with the Edit tool, not perl/sed.
