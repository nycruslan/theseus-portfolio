## Sprint 32: `/log`'s dates, day groups and the lines figure (B5b)

**Goal (roadmap):** B5b, the merge record, as sprint 29 planned it (`.crew/sprint/29/b5-plan.md`).
Taken beside #78 (B4a), which waits for the owner. B5 reads the retros on main, not the Studio, so
this sprint neither repeats nor builds on #78. Both touch `/log`: #78 changes the bar, this sprint
the table and header. Whichever merges second merges main and keeps both sides.

**Size:** M. Contract: `.crew/sprint/32/contract.md` (Atlas, amended by decisions 8 to 10).
Decisions: `.crew/sprint/32/decisions.md`. Iris's notes: `notes-iris.md`.

### What a visitor gets

- **The lines figure** in the Log's header, from the newest merge record: "44 of 6,170 lines of
  the site's code are still original: 0.7%, by git blame on app, components and lib at d7367ca."
  It is the ship of Theseus in one number, in the first screen at 1440 × 900.
- **Every revision grouped by the UTC day it merged,** each group opened by a row header such as
  "Sat 24 Oct · 4 revisions". A **Date** column sits last, after Approved. Below 640 px, where rows
  fold, the Date cell is kept for screen readers only, because the group header already names the
  day. A merged sprint with no record yet sits in a first group, "Undated".
- **Each record** at `/log/<n>` gains "Date: 20 Oct 2026, 00:42 UTC" before its pull request.

### The merge record

`.crew/sprint/<n>/merge.json` holds `{ pr, mergedAt, commit, lines: { original, total } }`. The
writer, `.crew/sprint/32/merge-record.mjs`, keys on the retro's `pr` against `(#<pr>)` on main's
first-parent line. It uses the squash commit's committer time in UTC, never rewrites a record,
deepens a shallow clone first, and checks Quill's two calibration figures before writing anything:
70 of 2,027 at e6551d3, and 64 of 5,288 at 0fcb84f. Both reproduce exactly when a line counts as
original only if blame dates it **strictly before** sprint 1's merge (decision 8). This sprint
backfills 29 records (sprints 1 to 15 and 17 to 30). A second run writes none.

The site reads the records at build time, with no network and no `HEAD` read (decision 4). A
missing or malformed record is ignored, never shown.

### The checks

Probe wrote B5.12 to B5.16 (`e2e/log-dates.spec.ts`, with the oracle in `e2e/retros.ts` reading
`merge.json` itself) red first: 6 failed on the branch before the build. B5.17's rewrites keep every
assertion:
- The Log's row selectors count revision rows only.
- B5.5 (C3.1) expects seven heads.
- The record's pairs gain Date.

No `expect(` is removed, nothing is retired, and C4.4's status-word rule is unedited. `pnpm verify`
passes, and the full e2e suite passes 162 of 162 (Forge, on a tree identical to this head's).

### Departures from the frame

- **The column is "Date", not the frame's "Merged"** (decision 2). "Merged" would need C4.4, the rule
  against status words, loosened, a weakened test. "Date" is the word a drawing's revision table
  uses. If the owner prefers "Merged", it can follow in a PR with the C4.4 change.
- **Phones show the day in the group header, not in each row** (decision 10).
- **No 66ch cap on Description at 1440:** in Iris's mock-up the cap wrapped 12 of 29 goals.

### Proposals for the owner (no owner path is touched here)

- Move the writer to `.crew/merge-record.mjs` with a harness test and a pre-flight step in the
  sprint skill. Until then Atlas runs it from the sprint folder at the start of each run
  (`.crew/STATE.md`).
- Better still, a workflow that writes the record after each merge on main (`.github/`). Today a
  sprint's record lands with the next sprint's PR, so production's newest revision sits under
  "Undated" from its merge until the next.
- Whether closed sprints get a row, and a public `design` retro field for Iris's score
  (unchanged from sprints 29 and 30).

### Not verified

- The Vercel preview, which the cloud can't reach.
- The "Undated" group on a real build: every merged sprint has a record here. Probe's checks
  cover it on a mock with one record removed, and they will run for real in this PR's own CI,
  where sprint 32 is merged but has no record.
