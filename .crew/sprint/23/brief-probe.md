# Sprint 23 brief for Probe: B2's checks, failing first (Atlas)

## What this sprint is for

B2 of the redesign: the facts laid out as the frames show, with Detail A; `/read`; a not-found
page. The contract is `.crew/sprint/23/contract.md` (Quill), and its data rules are what the pages
and your oracle implement word for word. The frames are `.crew/sprint/17/design/work-1440.webp`,
`work-390.webp`, `read-1440.webp` and `read-390.webp`. Forge builds once your checks are on the
branch, so they come first and they fail on today's page.

## The work

- Checks B2.1 to B2.11 as Playwright tests in `e2e/`, each titled by its number and what it
  asserts, in new files for the new objects (`e2e/facts.spec.ts`, `e2e/read.spec.ts`,
  `e2e/not-found.spec.ts`, or the split you prefer) and in the existing files where the contract's
  disposition says "rewrite". A rewrite keeps every assertion on the new object or route.
- The one retirement, batch D (`cards.spec.ts` "the whole of a linked card is its link"), is deleted
  in your commit and named in your report: `gate` holds the PR for the owner because of it, as
  planned.
- The oracle for the facts reads `content/profile.ts` through imports, never copies; the project
  link's label rule and Detail A's five-label rule are in the data rules. Extend `e2e/retros.ts`
  only if `/read`'s drawing checks need it (B2.5 compares `/read`'s plank map with `/`'s).
- B2.10's script-bytes check is new: sum the bodies of the script files a route requests and
  compare with `/sprints`' in the same run. Your memory has the method (sprint 9), and the quirk of
  memory-cached responses after a navigation (Forge's sprint 22 lesson: open each route in a fresh
  context so every response has a body).
- `STEP_TOKENS` in `e2e/helpers.ts`: Iris's notes (`.crew/sprint/23/notes-iris.md`, written in
  parallel with your work) name any new step tokens. Atlas messages you when they land; add them
  then, as the last thing. Until then write the checks against the token names the contract uses.
- B2.3's Tab count: Contact's first link is the 12th stop, exactly `tabUntil`'s bound. If the build
  adds a stop before it you raise the bound and say so; that's a harness change, not a weaker test.
- Which checks are red on main: all the new ones should be. Say which pass on main without the
  build (a check that can pass without the change needs a mutant later) and why.

## Files you own

`e2e/**` only. Work in your own worktree from `sprint/23-the-facts`:
`git worktree add -b probe/23 /home/user/wt-probe-23 sprint/23-the-facts`, then
`pnpm install --frozen-lockfile` there. Use your own port (`PLAYWRIGHT_PORT=<free>`), and serve your
own build for fast iteration (your memory). Commit on `probe/23` in the worktree, in small commits;
Atlas cherry-picks them onto the sprint branch. Don't touch `app/`, `components/`, `lib/` or the
notes.

## Report

Outcome first. Then the list of tests by file, with the red run's output on today's page (`pnpm
test:e2e` or the per-file runs), which pass on main and why, the commit shas for Atlas, what you
did differently from the contract and why, and what you couldn't check. Then at most three memory
lines in `.claude/agent-memory/qa-engineer/MEMORY.md` citing `.crew/sprint/23/`, committed in the
worktree.
