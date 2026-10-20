# Sprint 13 contract: the build log's route (PR A)

Size: M. The contract is sprint 12's, accepted by the owner when they merged #37:
`.studio/sprint/12/contract.md`, section "PR A: the route" (C1 to C13), with its data rules, out of
scope list and existing-guards table. Iris's direction is `.studio/sprint/12/direction-iris.md`.
Nothing in it is changed here.

## Outcome

`/sprints` is a static page, one entry per `.studio/sprint/<n>/retro.json`, newest first, read at build
time by `readSprintLog(dir)` in `lib/`. It is reachable by URL and the sitemap only; the home line is
PR B (sprint 14).

## Checks

C1 to C12 in `e2e/sprints.spec.ts`, written by Probe first and red on CI before Forge's first push.
C13 is shown in the PR (scope diff, `pnpm verify`, `pnpm test:e2e`, the route table with `/sprints`
static).

## Out of scope

Everything sprint 12's contract puts out of scope, plus all of PR B: `/` is not touched.

## The owner's decisions, as recorded in #37

Merging #37 accepted the contract's recommendations: the name "Build log" and Iris's lede as written,
the line under the bio (PR B), every `what` published verbatim, a malformed retro failing the build,
and "Owner's call" from `needs-owner` in `outcome`.
