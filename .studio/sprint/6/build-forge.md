# Sprint 6: Forge's build

## What I built

Two sections in `app/page.tsx`, between Projects and Contact, both on `Section` (so they get the
sprint 5 heading rise). No new component, no CSS, no new tokens.

- **Stack** (`#stack`): one `ul`, `flex flex-wrap gap-x-6 gap-y-2`, each `li` the tool alone in
  `text-step-base`. Gaps separate the words; no separator text, no borders, no chips.
- **Education** (`#education`): one `ol`, `flex flex-col gap-8`, each `li` shaped like an Experience
  entry: `h3` (`text-balance text-step-lg font-medium`) with the school, the period beneath in
  `text-step-sm text-muted`, the credential in `mt-2 text-step-base`.
- Nothing interactive; no `content/`, `e2e/` or owner path touched.

## Evidence

- `pnpm verify`: exit 0 (lint, typecheck, knip, build).
- `PLAYWRIGHT_PORT=3318 pnpm test:e2e`: 47 passed, 1 skipped (the existing `content.spec.ts` fixme).
  `profile-sections.spec.ts` C1-C6 all pass; `reveal.spec.ts` C1-C8 pass with the new sections.
- Browser: production build on port 3319, screenshots at 390 and 1440 px, light and dark, scrolled
  to the Stack heading. Wraps to 5 rows at 390 px and 4 rows at 1440 px for 18 tools.

Screenshots (scratchpad, not in git), all in
/tmp/claude-0/-home-user-theseus-portfolio/93d5a88d-d017-55ed-ab03-1992ece69f4e/scratchpad/:
- `forge-390-light.png`: Stack, Education and Contact on a phone, light.
- `forge-390-dark.png`: the same, dark.
- `forge-1440-light.png`: desktop, light; Stack wraps in the 2xl column, Education entries match Experience.
- `forge-1440-dark.png`: desktop, dark.

## Differences from the brief

- `agent-browser` is not installed in this environment (`command not found`), so the browser pass
  used a Playwright script (`shots.mjs` in the scratchpad) against `next start` instead of
  `agent-browser --session forge`. Setup bug for the retro.
- I read only the first and fourth screenshots visually (390 light, 1440 dark); the other two were
  produced by the same script and covered by C6's dark/light overflow checks.

## Fix round 1

Fix round 1 (Atlas, from `review-iris.md` items 1 and 3): Stack `ul` `gap-y-2` to `gap-y-1`; `text-pretty` on the Education credential `p`. Item 2 (drawn dots) skipped. `pnpm verify` exit 0; `PLAYWRIGHT_PORT=3318 pnpm test:e2e` full suite re-run.
