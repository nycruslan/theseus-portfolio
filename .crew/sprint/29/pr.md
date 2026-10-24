## Sprint 29: B5's plan, and its first sprint's contract

**Goal (roadmap):** B5, "`/log` and the ghost hull". B4 waits for the owner on #75 (the Studio's
feed), and every B4 sprint builds on that feed, so this run takes the milestone's next item that
doesn't: B5 is built from the retros on main, which the site already reads, not from the Studio.
This sprint turns B5 into sprints and drafts the first one's contract, so the next run starts its
checks and build at once.

**Size:** M by the decisions it carries, with no product code. Quill wrote the plan and the
contract; Atlas checked them against the repository (`.crew/sprint/29/decisions.md`, 5).

## What's in it

- `.crew/sprint/29/b5-plan.md`: **B5 as three M sprints**, each one PR that leaves the site whole:
  - **B5a** `/log` in 2D: the ghost hull in vellum (the 22 original planks, each numbered by the
    first sprint that took it out; complete since sprint 23), "Every revision" as a table of
    every merged sprint, a record per revision at `/log/<n>` (the pull request, the plank it
    seated and what it replaced, what went wrong), and `/sprints` answering 308 to `/log`;
  - **B5b** the merge record: a crew script writes `.crew/sprint/<n>/merge.json` after each merge
    (the time from the squash commit, which equals GitHub's `merged_at`, and the original-lines
    count), and the page gains the Merged column grouped by day, the time on each record, and the
    lines figure ("64 of 5,288 lines" on today's main). The script and the skill's step are owner
    paths, so B5b's PR waits for the owner;
  - **B5c** the ghost hull in 3D on `/log` under Full/Calm/Off, with the control in `/log`'s bar
    and a plank opening its record (Pixel).
  - None waits for B4: the pencil row on `/log` rides B4.2, and whichever of B4.4 and B5c comes
    first mounts the model on a second route.
- `.crew/sprint/29/b5-first-contract.md`: **B5a's contract**, checks B5.1 to B5.11, the data rules
  word for word for the page and Probe's oracle (the seat, the ghost hull, the record, the plank's
  words, the bar, the metadata), the budgets, and the live checks sorted: of `e2e/sprints.spec.ts`'s
  60 tests and `sprints-entry.spec.ts`'s 5, 7 keep, 35 are rewritten with the same assertions on
  `/log`, and 23 retire with two assertions, as **batch F** for the owner on B5a's PR. Iris's three
  calls come before the build (the 2D ghost's composition and `--vellum`, the record's place, the
  lede).
- `.crew/sprint/29/decisions.md`: why B5 beside a waiting B4 (2), why a plan and not a page (3),
  what was checked (5), the dates' source (6), and that B5a's PR waits for the owner anyway (7).
  Quill's brief in `brief-quill.md`.
- Quill's three memory lines (one replaces the sprint 22 line on dates).

**Measured, not assumed** (Quill, in a scratch build of today's main and on production): the
records prerender as static pages under `cacheComponents` and unknown numbers answer 404;
`redirects()` in `next.config.ts` (a team path) answers `/sprints` with 308; `/sprints` is
11,665 px tall at 390 and a folded revision row is 89 px, so the table on `/log` is about
2,300 px, which answers the roadmap's "group past about 30 entries" rider without paging; the
frame's "70 of 2,027 lines" at e6551d3 reproduces by git blame, and today's main has 64 of 5,288.

## Checks

There is no `contract.md`: a plan with no product code and no visitor-visible check is judged
against `brief-quill.md` (decision 3). No product code changes: `pnpm verify` and the suite run as
on main (the only files are `.crew/sprint/29/*` and Quill's memory).

## Next

The next run starts B5a from `b5-first-contract.md`: Iris's notes and Probe's checks first, then
Forge. Its PR waits for the owner for batch F, with `/log` on its preview.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01JrvDFF8rwDCm4frCDFU4gQ
