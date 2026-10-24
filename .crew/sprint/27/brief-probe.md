# Sprint 27 brief for Probe: the control's checks, failing first (Atlas)

## What this sprint is for

B3's last build sprint: the Full/Calm/Off control in the bar, remembered on the device, with
Calm's settled rest, Off's no-3D guarantee and the hints setting the default. The contract is
`.crew/sprint/27/contract.md`; its data rules are what the page and your checks implement word for
word, and its checks are yours: B3.16 to B3.23 new, B2.3 and the keyboard's 12th stop rewritten
with the same assertions. Forge builds in parallel from the first minute, so your checks come
first and fail on today's page.

Read before you write: the contract whole; your B3 specs and harness (`e2e/webgl.ts`: `openModel`,
`live()`, the frame recorder, the clock, `blockStorage`-style init scripts; `e2e/model.ts`;
`e2e/pixels.ts`); `e2e/sheet.spec.ts`'s two B2.3 tests and B1.1; `e2e/keyboard.spec.ts` whole;
`e2e/model-off.spec.ts` (B3.5's Off baseline is the WebGL-refused page) and
`e2e/model-fallback.spec.ts` (B3.15's live-context count); `.crew/scope.mjs` (a rewrite ends with
at least as many `expect(` calls per file); your memory.

## The work, in this order

1. **B2.3 and the keyboard rewrites first**, pushed as soon as they're red: the three buttons after
   the four links in the bar's `nav`, Contact's first link the 15th stop, `tabUntil`'s bound 15,
   the group right of Read as page at 1440. Same assertions, plus the group.
2. **B3.16 and B3.19** (the control's presence, size and slot; Off's guarantees), then **B3.17,
   B3.18, B3.20, B3.21** (the modes, storage, the hints), then **B3.22 and B3.23** (forced colours
   and the keyboard; the fallback face with `.woff2` aborted via `page.route`). Each in
   `e2e/motion.spec.ts` unless it is a case of an existing B3 test.
3. **The hooks you may rely on**, and no other: `[data-motion]` in the bar's `nav` with `data-mode`,
   its `[role="group"][aria-label="Motion"]`, its three `button[aria-pressed]` reading Full, Calm,
   Off (`disabled` with WebGL refused), `localStorage["theseus:motion"]` (`full`, `calm`, `off`),
   `sessionStorage["theseus:model"]` (the once-a-visit flag, as today), `[data-model]` and its
   `data-state`, the Off page's `[data-plank]` fills and `.plan-plank` numbers. A press is a real
   click or a key on the button; never set the mode by script except through `localStorage` before
   a load.
4. **Which checks are red on main.** Every B3.16 to B3.22 check is red on today's page (no control).
   B3.23 (the fallback face) could pass on main by accident at one width: say whether it does, and
   which assertion is red where it isn't. A check that can pass without the change needs a mutant
   once the build exists, and only then.

What Iris decides mid-sprint: the group's placement below 1024 px (a second row of the bar until
she rules) and its sizes. Write B3.16's phone cases against the contract's defaults and the
44 px rule; Atlas sends you her numbers if a check needs them.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/27-motion-control`:
`git worktree add -b probe/27 /home/user/wt-probe-27 sprint/27-motion-control`, then
`pnpm install --frozen-lockfile` there. Your ports: 4710 to 4719 (`PLAYWRIGHT_PORT=<yours>`; serve
your own build for fast iteration, your memory's method). Commit on `probe/27` in small commits and
**push the branch to origin after every commit** (`git push -u origin probe/27`): Atlas cherry-picks
from `origin/probe/27` as commits land. Don't touch `app/`, `components/`, `lib/` or the notes.
`pnpm verify` must pass on what you push (knip counts exports nothing uses yet).

## Report

Outcome first. Then the list of tests by file with the red run's output on today's page, which
pass on main and why, the `expect(` count per rewritten file before and after, the commit shas
(the rewrites' first), what you did differently from the contract and why, and what you couldn't
check. Then at most three memory lines in `.claude/agent-memory/qa-engineer/MEMORY.md` citing
`.crew/sprint/27/`, committed in the worktree, and the commit's sha.
