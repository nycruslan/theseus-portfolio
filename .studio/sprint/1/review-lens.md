Verdict: ship

# Sprint 1, Lens code review

PR #9, branch `sprint/1`, reviewed at `4a28975aae6f6ce7e3849d1b025842840be3e99f`.
Scope: `git diff origin/main...HEAD -- app components` against `contract.md`, `direction.md` and
`decisions.md`.

(Copied by Atlas from Lens's worktree, where the review was written and not committed.)

## Findings

No Important findings. Three Minor ones, none of which blocks the merge.

1. **Minor (cause is pre-existing): production CSS still ships the utilities C3 removed.**
   `app/globals.css:1`. `@import "tailwindcss"` uses automatic source detection, so Tailwind scans
   every file that isn't gitignored, including `.claude/skills/**` and this sprint's own
   `.studio/sprint/1/*.md`. The built stylesheet (`.next/static/chunks/*.css`, 19.9 KB) contains
   `.text-4xl`, `.text-xl`, `.text-sm`, `.text-foreground/60`, `.hover:text-foreground/70`,
   `.bg-gray-200`, `.text-white`, `.animate-spin`, `.rounded-lg`, `--color-gray-200` and other
   classes that no component uses. I confirmed this by listing the selectors in the build output and
   grepping for where they come from (`contract.md`, `direction.md`, the vercel skill's docs). The
   mechanism was already on main, but every sprint's notes now add to the CSS that visitors download,
   and the gray and size utilities the contract retired keep shipping. Fix in `globals.css`:
   `@import "tailwindcss" source(none);` plus `@source "../app"; @source "../components";`, or
   keep auto detection and add `@source not "../.studio"; @source not "../.claude";`. Tailwind 4.3.3
   supports both. Could be this PR or a follow-up.

2. **Nit: the summaries' `leading-7` overrides the step's own leading.** `app/page.tsx:24` and
   `app/page.tsx:46`. `text-step-base` already carries line-height 1.6 (25.6 px at 320, 28.8 px at
   1440). `leading-7` pins it to a fixed 28 px, so these two lines are the only text whose leading
   doesn't come from a token. The direction keeps it on purpose, and the visual difference is under
   1 px at 1440, so this is only a note: dropping `leading-7` would make the type fully
   token-driven.

3. **Nit (pre-existing): the project link is set apart by color alone at rest.** `app/page.tsx:38`.
   It is underlined only on hover. Accent against foreground is 2.40:1 in light and 1.81:1 in dark.
   It is the whole content of an `<h3>` rather than a link inside running text, so WCAG 1.4.1 /
   axe `link-in-text-block` doesn't apply, and before this PR it was the same color as the text with
   no underline, so this is an improvement. Worth deciding in item 6 (focus and link affordance)
   or item 3 (cards).

## What I checked and found sound

- **Tailwind v4 `@theme inline` (4.3.3 installed).** The colors and steps are exposed as
  `--color-*` and `--text-step-*` with `--text-step-*--line-height`. The build emits
  `.text-step-2xl{font-size:var(--step-2xl);line-height:var(--tw-leading,1)}` and
  `.text-accent{color:var(--accent)}`. Because of `inline`, utilities reference the `:root`
  variables directly, so the dark media block (and a later class or attribute theme in item 2)
  switches them at runtime. `leading-7` composes correctly through `--tw-leading`.
- **Tokens are used everywhere.** `app/` and `components/` contain no `text-(xs|sm|base|lg|xl|N xl)`,
  no `foreground/N`, no hex values and no gray, zinc, neutral or slate classes. `layout.tsx` sets no
  colors or sizes. The accent appears only on the project link and the Contact links, as the
  direction says.
- **C5 holds.** There is exactly one `@media (prefers-color-scheme: dark)` block, holding one
  `:root` rule that sets exactly the 5 color tokens. The file has no `.dark` selector.
- **Values match the direction.** I recomputed the clamp slopes and intercepts from the 320 to 1440
  linear ramp, and they match. I converted each hex value to oklch, and they match their comments to
  within 0.5 L and 0.001 C. Contrast ratios: light 14.53, 6.15 and 6.06; dark 15.30, 7.60 and 8.45.
  `::selection` (foreground on rule) is 10.88 in light and 10.27 in dark.
- **In a real browser.** I ran the production build (`next start`) in Chromium 1194, light and dark,
  at 320, 390, 768 and 1440 px. h1 measures 48, 49.75, 59.2 and 76 px (76/48 = 1.58), the bio
  19.2 px at 320, and h2 13.3 to 13.5 px. Body and text colors are the token values in both
  schemes, and there is no horizontal overflow at any width.
- **Engineering standards.** No `"use client"`, no `any`, and named export for `Section`. The
  comments explain why: hex chosen for `rgb()` computed styles, per-step leading, dark kept for
  parity only.
- **Later sprints.** `--rule` is reserved for card edges, dark values sit on the same tokens, and no
  component hard-codes a color, so items 2 and 3 can build on this without rework.

## Evidence

- `git rev-parse HEAD` gives `4a28975aae6f6ce7e3849d1b025842840be3e99f`.
- `pnpm verify` exits 0: lint (17 infos, all in `e2e/`, 0 in `app`/`components`), typegen + tsc,
  knip and build (`/` static).
- `pnpm test:e2e` (port 3341) couldn't run here. Playwright 1.64 wants
  `chromium_headless_shell-1248`, the sandbox only has 1194, and `playwright install` is blocked by
  the proxy. 12 tests failed at browser launch, not on assertions. Probe's run (or CI) is the
  evidence for C1 to C6. My own browser measurements above used the 1194 build directly.

## Not verified

- The e2e suite itself, for the environment reason above.
- Production comparison: I made no request to https://theseus-portfolio.vercel.app.
