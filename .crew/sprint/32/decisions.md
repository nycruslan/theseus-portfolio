# Sprint 32 decisions (Atlas)

1. **Sprint 32 starts beside #78.** The pre-flight found #78 (sprint 31, B4a, `/crew`) waiting
   for the owner, next 32, four of the day's six merged, nothing to update or remind; the run
   came with no owner goal. Every B4 sprint builds on #78, so sprint 32 is **B5b**, as sprint 29
   planned it: B5 reads the retros on main, not the Studio, and B5b neither repeats nor builds on
   #78. Both touch `/log` (#78 its bar, this its table and header), so whichever merges second
   merges main and keeps both sides. Branch `sprint/32-b5b-merge-record`.

2. **The column is "Date", not "Merged".** The plan named it Merged, and so does the approved
   frame `log-1440.webp` (Forge read it: "Merged" last, after Approved, and the record's "Merged"
   row). "Merged" needs B5.6's status-word rule (C4.4) loosened, a weakened test that is the
   owner's to approve. "Date", the word a drawing's revision table uses, keeps C4.4 unedited; it is
   a one-word departure from the frame, listed in the PR for the owner, who can ask for "Merged"
   with the C4.4 change in a later PR. The column keeps the frame's place, last. (Corrected: this
   decision first said the frame heads it Date.)

3. **The writer lives in the sprint folder until the owner moves it.** `.crew/*.mjs`, its harness
   test and the sprint skill's step are owner paths, which the file guard keeps from every role.
   So `.crew/sprint/32/merge-record.mjs` writes the records (the sprint folders are the team's and
   knip skips them), Atlas runs it at the start of each run (a line in `.crew/STATE.md`), and the
   retro proposes that the owner move it to `.crew/merge-record.mjs` with a test and a pre-flight
   step. This PR touches no owner path.

4. **No `HEAD` fill.** The plan filled the newest sprint's date at build from `HEAD` if Vercel's
   build has `.git`. That can't be measured from here (the cloud can't reach a preview, and a
   preview's `HEAD` is a branch commit anyway), and an empty cell until the next sprint's PR
   carries the record is true. Cut; nothing reads git at build.

5. **Undated rows.** A merged sprint with no record yet (the newest, between its merge and the
   next run) sits in a group of its own, "Undated" (first, by decision 9), so the day groups never claim a day they don't
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

8. **"Strictly before" sprint 1's merge.** Forge measured that only a strict rule reproduces
   Quill's figures (70 of 2,027 at e6551d3, 64 of 5,288 at 0fcb84f); "at or before" gives 114 and
   90, counting sprint 1's own lines as original. Sprint 1's lines are the first plank replaced.
   The contract is amended.

9. **"Undated" is the first group, not the last.** Probe found that once this PR's own retro lands,
   sprint 32 is merged with no record, and "Undated last" would put it below revision 1, turning
   C3.1 (newest first) and C3.2 (1 last) red, or needing them loosened by the owner. The rows
   without a record are always the newest (merged after the last writer run), so leading with
   them keeps both assertions as they are, and the groups still never claim a day they don't know.

10. **Iris's notes taken** (`notes-iris.md`): below 640, where rows fold, the Date cell is visually
    hidden and kept for assistive tech, since the group header above already names the day (a
    visible one under the number adds 10 px a row and repeats the day up to six times); the 66ch
    cap on Description is dropped, since in her mock-up it wrapped 12 of 29 goals beside 506 px of
    empty column; "Date" stays. Both are new checks' words, changed before Probe finished them, so
    no test is loosened. Known cost (Iris): a sprint's record lands with the next sprint's PR, so
    production's newest revision sits under "Undated" from each merge until the next. A writer run
    after each merge on main would close that gap; it is the owner's (a workflow, `.github/`), and
    goes in the retro's proposals.

11. **Groups are runs of rows, and the figure follows the latest merge** (Lens's important
    finding on c07c6fa). Sorting groups by day with Undated first keeps the table in sprint order
    only while sprints merge in number order. They don't always: sprint 28 merged after 29, and
    #78 (sprint 31) may merge after this sprint on a later day. The rows would then read 31, 32,
    30 and C3.1 would go red. So a group is now a run of consecutive rows in table order with the
    same day (or no record), as Lens proposed: C3.1 stays untouched, and B5.13, new in this PR, is
    reworded with its oracle. A day shows twice only after an out-of-order merge. The lines figure
    comes from the record merged last, not the highest sprint number, so it describes the newest
    code. This supersedes decision 9's "Undated first", which now holds only for the newest rows.
