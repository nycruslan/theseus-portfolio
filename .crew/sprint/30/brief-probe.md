# Sprint 30 brief for Probe: the Log's checks, failing first (Atlas)

## What this sprint is for

B5a: `/log` replaces `/sprints`. The ghost hull in 2D vellum (the 22 original planks, each
numbered by the first sprint that took it out), "Every revision" as a table of every merged
sprint, a record per revision at `/log/<n>`, `/sprints` answering 308 to `/log`. The contract is
`.crew/sprint/29/b5-first-contract.md`: its data rules are what the page and your oracle implement
word for word, its checks B5.1 to B5.11 are yours, and its disposition table sorts every live
check (7 keep, 35 rewrite with the same assertions, 23 retire as batch F for the owner, plus the
rewrites in other specs). Forge builds in parallel from the first minute, so your checks come first
and fail on today's page. The plan behind the contract is `.crew/sprint/29/b5-plan.md`.

Read before you write: the contract whole; `e2e/retros.ts` (the oracle: valid retros, `MERGED`,
`ORDER`, the revision cells), `e2e/sprints.spec.ts` and `e2e/sprints-entry.spec.ts` whole,
`e2e/helpers.ts` (`ROUTES`, `STATUS`), the named tests in `sheet.spec.ts`, `keyboard.spec.ts`,
`invariants.spec.ts`, `content.spec.ts`, `read.spec.ts` and `plan.spec.ts`; `lib/lines-plan.ts`
(`ORDER`, `seatPlanks`) and `lib/hull-layouts.ts` (`PLANK_IDS`: the seats per lift are 3, 4, 3,
4, 3, 3, 2); `.crew/scope.mjs` (a rewrite ends with at least as many `expect(` calls per file; a
rename inside `e2e/` is counted across the rename); your memory.

## The work, in this order

1. **The oracle first.** Extend `e2e/retros.ts` from the contract's data rules with its own lines,
   never importing the page's code: the ghost seats (each seat's first holder; a seat with no
   holder is a gap), the record's fields (`size` as "Small", "Medium", "Large"; `pr`; the first
   three `wentWrong[].what`, whole, backticks off, as the reader gives them), the plank's words for
   a seat and its holder (the contract's three examples verbatim), the previous and next merged
   sprint, the count line and the caption, and the lede as **one constant** (`LEDE`), so a
   reword from Iris is one line. Today's expected ghost list is in the contract ("Today's ghost")
   and must come out of the oracle, not be typed in.
2. **The moves, pushed as soon as they're red:** `git mv e2e/sprints.spec.ts e2e/log.spec.ts` and
   `git mv e2e/sprints-entry.spec.ts e2e/log-entry.spec.ts` (decision 5 in
   `.crew/sprint/30/decisions.md`), then the rewrites with the same assertions on `/log` and the
   records, each keeping its C-number in its title beside its B5 number; the 7 C12 tests
   unedited; the 23 retirements removed (list them in your report by C-number and count, so the PR
   body's batch F matches); and the rewrites in `sheet.spec.ts` (B2.3 both, B1.5, B1.6 on `/log`,
   B1.10 with its `/sprints` assertion retired), `keyboard.spec.ts` (B2.3's 15th stop, B2.9 with
   `/log` and `/log/13`), `invariants.spec.ts` and `content.spec.ts` (`ROUTES` gains `/log` and
   `/log/13`, 200 each, titles naming them), `read.spec.ts` (B2.10's baseline is `/log`),
   `plan.spec.ts` (B2.5: `/read`'s ship links to `/log`).
3. **B5.1 to B5.11** in `e2e/log.spec.ts` (the records' checks may take `e2e/log-record.spec.ts`
   if the file grows past about 1,200 lines). B5.4's ghost and B5.6's records against the oracle;
   B5.7 at both viewports; B5.10 with the method `read.spec.ts`'s B2.10 uses (decoded bodies,
   `response.body()`, the 404 in the same build) and `sheet.spec.ts`'s B1.10 for the fonts;
   B5.9's sweeps with the same assertions and titles that name the routes.
4. **The hooks you may rely on**, and no other: `[data-ghost]` with `path[data-plank][data-sprint]`
   of class `plank-ghost` and `.plan-plank` lettering, `[data-current]` on a record's plank,
   `p[data-ghost-caption]`, `p[data-ghost-count]`, `section[aria-labelledby="every-revision"]`
   with its `table`, `th[scope="row"] a[href="/log/<n>"]`, `section[aria-labelledby="record"]`
   with its `p`, `h2#record`, `dl`, `h3`, `ul` and its three links, `header` with `a[href="/"]`
   and `nav[aria-label="Main"]`, and the token `--vellum` on `:root`. Nothing else is promised.
5. **Which checks are red on main.** Every B5 check should be red on today's page (`/log` is a
   404 there). Say which of the rewrites could pass on main by accident (a `/` assertion that
   doesn't touch `/log`), and which assertion is red where it isn't. A check that can pass without
   the change needs a mutant once the build exists, and only then.

What Iris decides mid-sprint (the ghost's views and the numbers below 768, the record's place
below 1024, the lede's first sentence, an Approved key): write against the contract's words and
the fixed sentences; Atlas sends you her words if a check needs them. An Approved key, if it
comes, is plain text without C4.4's status words, so B5.6's rule holds.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/30-b5a-log`:
`git worktree add -b probe/30 /home/user/wt-probe-30 sprint/30-b5a-log`, then
`pnpm install --frozen-lockfile` there. Your ports: 4710 to 4719 (`PLAYWRIGHT_PORT=<yours>`; serve
your own build for fast iteration, your memory's method; before Forge's build exists, a
scratchpad mock of the data rules is the way to see a check bite, your sprint 23 lesson). Commit
on `probe/30` in small commits and **push the branch to origin after every commit**
(`git push -u origin probe/30`): Atlas cherry-picks from `origin/probe/30` as commits land. Don't
touch `app/`, `components/`, `lib/` or the notes. `pnpm verify` must pass on what you push (knip
counts exports nothing uses yet).

## Report

Outcome first. Then the list of tests by file with the red run's output on today's page, which
pass on main and why, the `expect(` count per rewritten or renamed file before and after, the 23
retired tests by C-number, the commit shas (the moves' first), what you did differently from the
contract and why, and what you couldn't check. Then at most three memory lines in
`.claude/agent-memory/qa-engineer/MEMORY.md` citing `.crew/sprint/30/`, committed in the
worktree, and the commit's sha.
