# Sprint 29 decisions (Atlas)

1. **Sprint 29 starts beside a waiting PR.** The pre-flight (`node .crew/next-sprint.mjs`) found
   #75 (sprint 28, `sprint/28-b4-plan`) waiting for the owner, next 29, four of the day's six
   merged, nothing to update or remind; no owner goal came with the run. Its instruction: start
   sprint 29 on work that neither repeats nor builds on #75, or stand down.

2. **B4 can't move; B5 can.** Every B4 sprint builds on the Studio feed that #75 asks the owner to
   build (`.crew/sprint/28/decisions.md`, 4 and 7). B5, "`/log` and the ghost hull", is the
   milestone's next item after B4, and it is built from the retros on main, which `/` and
   `/sprints` already read, not from the Studio. Its frames are approved (`log-1440.webp`,
   `log-390.webp`), so no direction is open. Taking it out of the direction's build order
   (B4 then B5, a "suggestion" in `direction-iris.md`) costs the visitor nothing: the parts of the
   log frames that are B4's (the pencil row with "Drawing now" in copper, the rest line, the Crew
   link) stay B4's, and a B5 sprint ships without them. The alternative, standing down, leaves the
   day's remaining sprints unused while the owner is away, and B5 is milestone work, not polish.

3. **Sprint 29 is B5's plan and its first contract, not a page.** Sized M by the decisions it
   carries (what `/log` is against `/sprints` and its checks, the ghost hull as a data rule, the
   merge dates' source, what `/log/<n>` shows of a retro, the phone list), with no product code,
   as sprint 28 planned B4 and sprint 24 planned B3. Quill writes `b5-plan.md` (B5 as S and M
   sprints) and `b5-first-contract.md` (the first sprint's contract, ready for Probe and Forge), so
   the next run starts the checks and the build at once (`.crew/STATE.md`, "A resumed sprint starts
   the build at once"). Building the first sprint in the same PR was weighed and dropped: a new
   route that replaces `/sprints`, with its checks sorted for the owner, is a review of its own, and
   the plan's calls should be settled before Probe writes against them. There is no `contract.md`:
   the sprint has no product code and no visitor-visible check, so it is judged against
   `brief-quill.md`, as sprint 28 was.

4. **Quill alone.** The frames are approved, so Iris isn't needed to open a direction; she reviews
   the build sprints. Forge and Pixel have nothing to build.

5. **Quill's plan and contract are taken as written.** `b5-plan.md` makes B5 three M sprints:
   B5a (`/log` in 2D with a record per revision at `/log/<n>`, `/sprints` answering 308 to
   `/log`), B5b (a merge record per sprint, `.crew/sprint/<n>/merge.json`, written by a crew
   script after the merge: the Merged column, day groups and the lines figure) and B5c (the ghost
   hull in 3D on `/log` under Full/Calm/Off, with Pixel). None waits for B4: the pencil row on
   `/log` rides B4.2, and whichever of B4.4 and B5c comes first mounts the model on a second route.
   `b5-first-contract.md` is B5a's contract, checks B5.1 to B5.11, with the live checks sorted:
   of `e2e/sprints.spec.ts`'s 60 tests and `sprints-entry.spec.ts`'s 5 (counted with
   `playwright test --list`; the brief said 50 and the first draft of these decisions 54), 7 keep,
   35 are rewritten with the same assertions on `/log`, and 23 retire with two assertions, as
   batch F for the owner. Checked against the repository: `next.config.ts` is in no CODEOWNERS
   line, so the redirect is the team's; the ghost rule's numbers follow `ORDER` in
   `lib/lines-plan.ts` with k = 26 on main (1 to 15 and 17 to 27; the brief's "17 to 28" counted
   sprint 28, which is on #75's branch); the frame's "20 Oct 2026, 00:42 UTC" for sprint 13 is the
   squash commit's date in a full clone.

6. **The dates come from a merge record, not from GitHub at build.** Quill's recommendation, taken:
   a retro can't hold its merge time (it is written in the PR, before the merge), GitHub's API at
   build would make CI's answer depend on a rate-limited call, and a token would be one more
   secret on Vercel. So B5b's opening run records the previous sprint's merge in
   `.crew/sprint/<n>/merge.json` with a crew script, which is an owner path with the sprint
   skill's step: B5b's PR waits for the owner, and B5a's retro proposes the script so they see it
   early. B5a ships with no dates.

7. **B5a's PR waits for the owner, so the next run should start it rather than hold it.** Batch F
   retires 23 tests about `/sprints`' old column, which needs the owner's approval on that PR
   whatever else happens, and the preview shows them `/log`. Two PRs waiting for the owner (#75 and
   B5a's) is the cost of taking B5 beside B4; both are one approval each, and neither blocks the
   other.

8. **Iris before B5a's build, not after.** The contract names her three calls (the 2D ghost's
   composition and `--vellum` in both schemes, the record's place at 1440 and below 1024, the
   lede and an Approved key): the next run brings her in with Probe, before Forge, as the plan
   says.
