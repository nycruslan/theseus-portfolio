# Brief: Probe, sprint 32 (B5b)

**What it's for.** `/log` gains dates, day groups and a lines figure from merge records the crew
writes (`.crew/sprint/<n>/merge.json`). Your checks are how anyone knows the page tells the truth
about them.

**The contract:** `.crew/sprint/32/contract.md`, checks B5.12 to B5.17, with `decisions.md`. Write
them red first, before Forge's build lands, extending the oracle in `e2e/retros.ts` with its own
reading of `merge.json` (never import the page's reader) and the contract's words for the Date
cell, the group headers ("Sat 24 Oct · 5 revisions", "1 revision", "Undated" last), the lines line
and the record's Date pair. B5.16 checks the records on disk; on main they don't exist yet, so it is
red there. Keep the oracle's rules where a reword is one line.

**Rewrites, not retirements:** B5.5's six heads become seven (B5.17). Nothing is loosened: C4.4
stands as it is ("Date", not "Merged"; decision 2). Any test whose assertions would drop needs the
owner, so if one seems to, stop and tell Atlas instead.

**Setup.** `/home/user/wt-probe-32` on `probe/32` from `origin/sprint/32-b5b-merge-record`
(`git worktree add`, then `pnpm install --frozen-lockfile`); ports 4810 to 4819. Push after every
commit. Show the new checks fail on the sprint branch as it is, and say which fail and why.

**Report:** the checks you wrote, their red run, your commits, and up to three memory lines citing
`.crew/sprint/32/`.
