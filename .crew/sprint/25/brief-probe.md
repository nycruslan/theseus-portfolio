# Sprint 25 brief for Probe: B3's checks, failing first (Atlas)

## What this sprint is for

B3's first build sprint: on `/` at 1024 px and up, the white card model lands on the inked profile,
lifts off it once a visit, is skipped by any input, opens settled under reduced motion and draws
nothing at rest. The contract is `.crew/sprint/25/contract.md` (Quill's draft adopted, with four
amendments in its header): its data rules are what the page and your harness implement word for
word, and its checks B3.1 to B3.10 are yours. Pixel builds in parallel from the first minute, so
your harness and checks come first on the branch and fail on today's page.

Read before you write: the contract whole; `.crew/sprint/24/spike/spike.md` S4 to S6 for the methods
your checks reuse (`.crew/sprint/24/spike/measure/s4-register.mjs`, `s4-centroid.mjs`,
`s4-handoff.mjs`, `s5-loft.mjs`, `s6-frames.mjs`); your memory; `e2e/plan.spec.ts`, `e2e/read.spec.ts`
and `e2e/sheet.spec.ts` for the three rewrites; and sprint 9's retired harness in git at
`7b4b48b^` (`e2e/webgl.ts`, `e2e/pixels.ts`, the `openRun` ordering of init scripts).

## The work, in this order

1. **The harness, pushed alone first (B3.10).** The WebGL context wrapper that counts draw calls
   and submitted triangles (instanced line quads included), the WebGL refusal init script, the
   clock driving `requestAnimationFrame`, screenshot-based pixel reads, and the four self-checks
   the contract lists. Commit it on its own and tell Atlas the sha as soon as it's there: it's
   cherry-picked onto the sprint branch so CI runs it before the build lands.
2. **B3.1 to B3.9** as Playwright tests, one per check, titled by its number and what it asserts,
   in new spec files named for the feature (`e2e/model.spec.ts`, or the split you prefer; never
   the sprint). Every GPU-dependent number is reported beside its floor, as the contract says.
   Where a check says "reported, not asserted" (1024 and 1920 registration, frame time, INP), the
   test records the number in its output and asserts nothing on it.
3. **The three rewrites, same assertions:** B1.8 in `plan.spec.ts` (its pixel comparisons on the
   Off path with WebGL refused), B2.10 in `read.spec.ts` (`/` measured with WebGL refused, same
   2,048 B), and B1.5 in `sheet.spec.ts` (batch E: one line with an ellipsis from 1024 px, the full
   goal in the cell's DOM text, the full text at 390). Batch E changes an assertion, so name it in
   your report: `gate` holds the PR for the owner because of it, as planned.
4. **Which checks are red on main.** All the new ones should be. Say which pass on main without
   the build and why; a check that can pass without the change needs a mutant later, and only then.

Hooks you may rely on, and nothing else: `[data-model]` as `[data-plan]`'s next sibling in `main`,
its `data-state` (`landed`, `lofting`, `settled`, `still`), its one `canvas`, and the drawing's
existing `[data-plank]`, `data-sprint`, `.ln-outline` and `.plan-wide`. The 3D chunk is a dynamic
import after `load` on `requestIdleCallback`, so a check that waits for the model waits for
`data-state`, never a fixed time. The `sessionStorage` flag's key is Pixel's; test through behaviour
(reload, second `goto`), never the key.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/25-the-loft`:
`git worktree add -b probe/25 /home/user/wt-probe-25 sprint/25-the-loft`, then
`pnpm install --frozen-lockfile` there. Use your own port (`PLAYWRIGHT_PORT=<free>`, not 3000, 3352
or 4534) and serve your own build for fast iteration (your memory). Commit on `probe/25` in small
commits; Atlas cherry-picks them onto the sprint branch. Don't touch `app/`, `components/`, `lib/`
or the notes, and don't add `three`: until Pixel's build lands, your checks run against today's
page and go red.

## Report

Outcome first. Then the list of tests by file, with the red run's output on today's page, which
pass on main and why, the commit shas for Atlas (the harness's first), what you did differently
from the contract and why, and what you couldn't check (SwiftShader's numbers are floors; say so).
Then at most three memory lines in `.claude/agent-memory/qa-engineer/MEMORY.md` citing
`.crew/sprint/25/`, committed in the worktree, and the commit's sha.
