# Probe review, sprint 3 (PR #16), head 57999ec

Verdict: ship

Checked at 57999ec in a fresh worktree (`pnpm install --frozen-lockfile`, then the commands below).

## Gates

- `pnpm verify`: exit 0 (lint, typecheck, knip, build).
- `PLAYWRIGHT_PORT=3347 pnpm test:e2e`: 31 passed, 1 skipped (the `TODO(owner)` fixme in `content.spec.ts`,
  untouched). Existing e2e files unedited.
- The same 31 passed, 1 skipped, again against a build of this head with my held C4 fix applied (below).

## Checks, by number

| # | Result | Evidence |
|---|---|---|
| C1 | pass | `project-cards.spec.ts` C1. By hand: 1 `li` for 1 project, `h3` "Theseus", link `https://github.com/nycruslan`, name "Theseus". A throwaway 4-project profile gave 4 cards; the no-href card has an `h3` and `p` and no link. |
| C2 | pass | C2. Card text is name then description; the arrow is an `aria-hidden` SVG. |
| C3 | pass | C3. By hand at 1440: a real mouse click at 3 px inside the top-left and bottom-right corners both went to `https://github.com/nycruslan`; pointer cursor on the link and its `::after`. |
| C4 | pass | C4 as it stands at 57999ec. Title ink, underline copper, both schemes, Contact links stay copper. A latent gap in the check is in "Held for a follow-up". |
| C5 | pass | C5. 1 px `--rule` frame; screenshots 320/390/1024/1440 in both schemes. |
| C6 | pass | C6. By hand: the first Tab lands on the Theseus link, `:focus-visible` true, the card (not the link) draws a 2 px solid outline, offset -2 px, `rgb(148,65,38)` light and `rgb(235,138,100)` dark, at 390 and 1440. |
| C7 | pass | C7 (both). Reduced motion: 0 animations, `transition-duration` 0s. Hover changes border and arrow color only (verified in Playwright's Chromium, 4 runs: 2 schemes x motion on/off). No console errors or warnings in any run. |
| C8 | pass | C8 (grep). |
| C9 | pass | C9. By hand: `scrollWidth == clientWidth` at 320, 360, 640, 767, 768, 800, 1024, 1440, 2200; card never wider than the viewport; no title or description clipped. |
| C10 | pass | verify and e2e above; `content/` has no diff against `origin/main` (C10 test). |

Visual: the card is a hairline frame hung 24/32 px into the gutter so the text keeps the column edge; at
phone width it is two full-bleed rules. It reads as a deliberate plank, not a rounded-card grid, in both
schemes. Screenshots are in the scratchpad (`card-{light,dark}-{320,390,1024,1440}.png`,
`focus-*.png`, `hover*.png`), not in git.

## Held for a follow-up: C4 in `e2e/project-cards.spec.ts` (not in this PR)

This verdict is about 57999ec. A commit that changes `e2e/` after review would not carry it, so Atlas
keeps this fix out of the PR and it goes to the retro as a follow-up for Probe. The spec in the PR is
unchanged.

The gap: C4 asserts a copper underline for every project. It passes today because the only project has an
`href`. With a throwaway profile that adds a project with no `href`, C4 fails on the plain-name card, which
is the right design (direction.md: no underline where there is no link). The check is wrong for that case,
not the card, and it would fail the owner's first no-link project.

The fix (written, validated, held): require the underline and copper only for projects with an `href`, and
require no underline on a project without one. The linked case is unchanged and the no-`href` case gains an
assertion, so nothing is weakened. With it applied, C4 passes on the real content and on the four-project
throwaway profile; the full suite is 31 passed, 1 skipped. Nothing in the product needs to change for it.

## Break attempts

- Throwaway 4-project profile (scratchpad copy, not in the PR): a 90-character hyphenated name wraps and the
  arrow stays on its first line; a no-href card is a plain plank; seams stay 1 px; Tab order follows the
  links; the focused plank's ring paints over its neighbours. C1-C8 pass on it.
- Forced colors (`forcedColors: "active"`, 1024 px): the card shows its 2 px ring and the link also shows a
  second ring tight around the title (the `outline-hidden` fallback). Two rings, no loss of visibility.
  Item 6 can decide whether to hide the inner one.

## Observations, not blockers

1. An unbroken token longer than the column in a description (a 100-character run in my throwaway profile)
   overflows the card and the page at 320 to 768 px. `main`'s plain `<p>` did the same, so this is not a
   regression, and the real description wraps. If the owner may paste long URLs into descriptions,
   `overflow-wrap: anywhere` on the card's text would close it. C9 fails on that throwaway content, which
   is why I did not add a test for it: no contract item asks for it.
2. agent-browser's headless Chrome reports `(hover: hover)` false, so Tailwind's `hover:` rules never fire
   there (`:hover` still matches). Hover was verified in Playwright's Chromium, where it does fire.
3. The PR carries other roles' agent-memory files (creative-engineer, design-director, product-owner);
   expected from this team's flow, not mine to judge.

## Not checked

- Safari and Firefox rendering of `has-[a:focus-visible]` and `lh` units: only Chromium was available.
- A real touch device; the 44 px target is verified by geometry (C3), not by thumb.
