# Sprint 32 contract: B5b, the merge record (Atlas)

Atlas, 2026-10-25, from Quill's plan (`.crew/sprint/29/b5-plan.md`, "B5b" and "The dates", "The
lines") and B5a's contract (`.crew/sprint/29/b5-first-contract.md`), as amended by
`decisions.md` here. Size **M**. Checks B5.12 to B5.17, numbered after B5a's.

## The outcome

A visitor on `/log` reads the crew's cadence and the ship of Theseus as two facts: "Every
revision" is grouped by the UTC day each sprint merged, with a Date on each row, and the Log's
header says how many lines of the site's code are still original. Each record at `/log/<n>` says
when it merged. Every date comes from a record the crew writes after the merge
(`.crew/sprint/<n>/merge.json`), read when the site is built, with no network.

## The merge record

`.crew/sprint/<n>/merge.json`, one per merged sprint:
`{ "pr": 74, "mergedAt": "2026-10-24T03:36:27Z", "commit": "0fcb84f…(40 hex)", "lines": { "original": 64, "total": 5288 } }`.
- **Written by** `.crew/sprint/32/merge-record.mjs` (decision 3), run from the repository root:
  it deepens a shallow clone, then for every valid retro on `origin/main` with a `pr` and no
  `merge.json`, finds the commit on `origin/main` whose subject ends in `(#<pr>)` (keyed on the
  retro's `pr`, never the subject's sprint: sprint 14 has #43 and #44), and writes its committer
  date in UTC with a `Z`, its full hash, and the lines figure at that commit. It never rewrites an
  existing record, and with no matching commit it writes nothing for that sprint and says so.
- **The lines figure** at a commit: the lines of the files git tracks under `app/`, `components/`
  and `lib/` at that commit, by `git blame`; a line is original when blame dates it strictly before
  sprint 1's merge (46ed7ee, 2026-10-13T23:10:36Z). It must reproduce Quill's measurements:
  **70 of 2,027 at e6551d3** and **64 of 5,288 at 0fcb84f**.
- **This sprint backfills** every merged sprint, 1 to 15 and 17 to 30, and commits the records.

## What the page shows

- **Date** (the frame's own head, `log-1440.webp`), a seventh column after Description: the
  merge's UTC day as "24 Oct", with " 2025" added only when the year isn't the newest record's
  year. A merged row with no record shows an empty cell, never "—". Below 1024 the cell folds
  under the row's number like the others, labelled "Date".
- **Day groups:** the rows stay newest first, in a `tbody` per UTC merge day, each opened by one
  row header, `th[scope="rowgroup"]` across the row: "Sat 24 Oct · 4 revisions" ("1 revision" in
  the singular). Rows without a record go in a first group headed "Undated" (decision 9). Sprint order within a
  group is the table's order (sprint number, descending): seats and rows still follow sprint
  number, not merge time (the plan's "Order").
- **The lines figure**, a line in the Log's header after the count line, from the newest record
  (the highest sprint number that has one): "{original} of {total} lines of the site's code are
  still original: {original ÷ total × 100, one decimal}%, by git blame on app, components and lib
  at {commit, 7 characters}." Numbers with a comma for thousands ("5,288"). With no record, the
  line is absent.
- **The record** gains a `dl` pair before "Pull request": `Date`, "24 Oct 2026, 03:36 UTC"
  (the year always). No record, no pair.
- Description stays whole on as many lines as it takes; at 1440 its measure stays near 66ch
  (Iris's rider on #77), and the record's `h2` takes `text-wrap: pretty`.

## The checks (Probe writes them red first, the oracle reading `merge.json` itself)

**B5.12 The Date column.** On `/log` with scripts on and off, at 390, 1024 and 1440: the heads
are Rev, Description, Date, Drawn, Checked, Tested, Approved; each row's Date equals the oracle's
from its `merge.json`, or is empty when it has none; no cell reads "—".
**B5.13 The day groups.** Every row is in exactly one group; groups are in descending day order
with "Undated" first; each header's day, weekday and count equal the oracle's; every row's Date
equals its group's day.
**B5.14 The lines figure.** The header's line reads exactly as the oracle builds it from the
newest record, and is the only one; it is in the first screen at 1440 × 900.
**B5.15 The record's date.** On the newest record, `/log/13`, `/log/1` and `/log/24`, the Date pair
reads as the oracle says, before Pull request; a sprint without a record has no Date pair.
**B5.16 The records themselves.** Every merged sprint on main from 1 to 30 has a `merge.json`
whose `pr` equals its retro's, `mergedAt` is an ISO UTC instant ending in `Z` and at or after
2026-10-13 (not ascending: sprint 28 merged after 29), `commit` is 40 hex characters, and `lines.original` ≤
`lines.total`. Sprint 13's `mergedAt` is 2026-10-20T00:42:46Z and sprint 27's
2026-10-24T03:36:27Z (git, measured).
**B5.17 Nothing else moves.** The B5a checks pass with only these rewrites, each keeping its
assertions: B5.5's "six heads" become the seven above; the table and record sweeps (B5.3, B5.9,
B5.10) cover the new line, column and headers. C4.4's status-word rule is unchanged: the page
uses "Date", not "Merged".

## Budgets

B5.10's as on main: `/log` and its records load the framework's script alone, no client code;
CLS 0; nothing sideways at 320; 0 axe violations in both schemes.

## Out of scope

- A `.crew/` script, its harness test and the sprint skill's step: owner paths, proposed in the
  retro (decision 3).
- Closed sprints' rows (the frame's struck-through 16) and Iris's Design row: owner calls.
- Filling the newest sprint's date at build from `HEAD` (decision 4).
- The pencil row and anything live: B4's (#78).
