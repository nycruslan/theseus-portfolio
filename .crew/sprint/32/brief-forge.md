# Brief: Forge, sprint 32 (B5b)

**What it's for.** A hiring executive on `/log` should read the crew's cadence (29 revisions in
twelve days) and the ship of Theseus in one number (how much of the site's code is still original).
An engineer opening a record should see when it merged. You build it.

**The contract:** `.crew/sprint/32/contract.md`, with `decisions.md` beside it. Quill's reasoning is
in `.crew/sprint/29/b5-plan.md` ("The dates", "The lines"). Probe writes B5.12 to B5.17 in `e2e/`
red first on `probe/32`; you make them pass and never edit `e2e/`.

**Work.**
1. `.crew/sprint/32/merge-record.mjs`: the writer the contract describes (Node built-ins only, run
   from the repo root, idempotent, never rewrites a record). First prove the lines rule against
   Quill's two measurements, 70 of 2,027 at e6551d3 and 64 of 5,288 at 0fcb84f; find which files and
   which blame date reproduce both exactly, and write the rule in the script's header. Then run it
   and commit the 29 records (`.crew/sprint/<n>/merge.json`, n = 1 to 15 and 17 to 30).
2. `lib/sprint-log.ts` reads each folder's `merge.json` (validated, as the retros are: a bad one is
   ignored rather than shown) into the entry; `components/log.tsx` and `components/log-record.tsx`
   show the Date column, the day groups, the lines figure and the record's Date pair as the
   contract's "What the page shows" words them. Below 1024 the table already folds rows under
   their number (`.rev` in `app/globals.css`): the group header and the Date cell fold with it.
3. Riders (decision 6): the three comments in `next.config.ts`, `lib/sprint-log.ts` and
   `app/layout.tsx` that say nothing reads the sprint folders at request time (an unknown record
   address runs `readSprintLog()` on the server); the record's `h2` `text-wrap: pretty`;
   Description's measure near 66ch at 1440; your stale memory line citing
   `components/sprint-entry.tsx` (in `.claude/agent-memory/engineer/`).

**Owns:** `.crew/sprint/32/merge-record.mjs`, the records, `lib/`, `components/`, `app/`,
`next.config.ts`. **Out of scope:** `.crew/*.mjs` and every other owner path (the guard blocks them;
decision 3), closed sprints' rows, a Design row, any `HEAD` read at build (decision 4), the bar
(#78 changes it).

**Setup.** Work in `/home/user/wt-forge-32` (`git worktree add -b forge/32 /home/user/wt-forge-32
origin/sprint/32-b5b-merge-record`, then `pnpm install --frozen-lockfile`); ports 4830 to 4839. The
clone was shallow: `git fetch --unshallow origin main` if history is missing. Push `forge/32` after
every commit, so nothing is lost with the container. Iris (`iris`) may send you notes mid-build on
the group header and the figure's place: take them unless they contradict the contract's words,
and tell Atlas when one changes words Probe checks.

**Report:** what's done, `pnpm verify`'s result, the e2e result with Probe's checks cherry-picked
(`PLAYWRIGHT_PORT=4831 pnpm test:e2e`), the lines rule you proved and both calibration figures as
the script prints them, screenshots of `/log` at 390 and 1440 and a record (in your scratchpad),
your commits, and up to three memory lines citing `.crew/sprint/32/`.
