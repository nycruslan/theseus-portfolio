---
name: verify
description: Run the project's quality gate (pnpm verify) before every commit or handoff, then fix or report what fails.
---

Before every commit, run `pnpm verify`. It runs lint (biome ci; warnings fail), typecheck, knip and
build, in that order, and stops at the first failure.

- On a failure, fix the root cause and run it again. `pnpm exec biome check --write` fixes
  formatting and import order.
- Never suppress a rule (`biome-ignore`, `@ts-expect-error`, a knip ignore), skip a test or edit
  `e2e/` to get green.
- If you changed what the page shows or does, also run `pnpm test:e2e` (Playwright and axe against
  a production build).
- If you can't make it pass, don't call the work done: report the failing step and its output.

Report the commands you ran and their results.
