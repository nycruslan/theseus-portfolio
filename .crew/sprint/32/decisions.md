# Sprint 32 decisions (Atlas)

1. **Sprint 32 starts beside #78.** The pre-flight found #78 (sprint 31, B4a, `/crew`) waiting
   for the owner, next 32, four of the day's six merged, nothing to update or remind; the run
   came with no owner goal. Every B4 sprint builds on #78, so sprint 32 is **B5b**, as sprint 29
   planned it: B5 reads the retros on main, not the Studio, and B5b neither repeats nor builds on
   #78. Both touch `/log` (#78 its bar, this its table and header), so whichever merges second
   merges main and keeps both sides. Branch `sprint/32-b5b-merge-record`.

2. **The column is "Date", not "Merged".** The plan named it Merged, which needs B5.6's
   status-word rule (C4.4) loosened: a weakened test, the owner's to approve. The approved frame
   `log-1440.webp` heads it Date, which a drawing's revision table uses, so C4.4 stands unedited
   and the PR needn't wait for the owner on that alone.

3. **The writer lives in the sprint folder until the owner moves it.** `.crew/*.mjs`, its harness
   test and the sprint skill's step are owner paths, which the file guard keeps from every role.
   So `.crew/sprint/32/merge-record.mjs` writes the records (the sprint folders are the team's and
   knip skips them), Atlas runs it at the start of each run (a line in `.crew/STATE.md`), and the
   retro proposes that the owner move it to `.crew/merge-record.mjs` with a test and a pre-flight
   step. This PR touches no owner path.

4. **No `HEAD` fill.** The plan filled the newest sprint's date at build from `HEAD` if Vercel's
   build has `.git`. That can't be measured from here (the cloud can't reach a preview, and a
   preview's `HEAD` is a branch commit anyway), and an empty cell for a few hours until the next
   run writes the record is true. Cut; nothing reads git at build.

5. **Undated rows.** A merged sprint with no record yet (the newest, between its merge and the
   next run) sits in a last group, "Undated", so the day groups never claim a day they don't
   know.

6. **Riders taken (all in files this sprint edits):** Lens's two nits on #77 (the three comments
   in `next.config.ts`, `lib/sprint-log.ts` and `app/layout.tsx` that say nothing reads the sprint
   folders at request time, and the two stale memory lines, Iris's on the 404's face and Forge's
   citing `components/sprint-entry.tsx`); Iris's two cheap changes (the record's `h2`
   `text-wrap: pretty`, Description near 66ch at 1440). Left open: the unknown record's
   scripts-off blank 404 (Next's error shell, sprint 30's retro).

7. **Ports and worktrees.** Probe 4810 to 4819 in `/home/user/wt-probe-32` on `probe/32`; Forge
   4830 to 4839 in `/home/user/wt-forge-32` on `forge/32`; Iris 4820 to 4829 in
   `/home/user/wt-iris-32`. Roles push after every commit; Atlas cherry-picks onto the sprint
   branch as they land.
