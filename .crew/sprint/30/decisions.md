# Sprint 30 decisions (Atlas)

1. **Sprint 30 starts beside a waiting PR.** The pre-flight (`node .crew/next-sprint.mjs`) found
   #75 (sprint 28, `sprint/28-b4-plan`) waiting for the owner, next 30, four of the day's six
   merged, nothing to update or remind; no owner goal came with the run (the run was started by
   #76's merge). Its instruction: start sprint 30 on work that neither repeats nor builds on #75.

2. **Sprint 30 is B5a, as sprint 29 planned it.** `.crew/sprint/29/b5-plan.md` and
   `b5-first-contract.md` are taken as written: `/log` in 2D, a record per revision at `/log/<n>`,
   `/sprints` answering 308 to `/log`, checks B5.1 to B5.11, batch F for the owner. B5 reads the
   retros on main and nothing in the Studio, so it neither repeats nor builds on #75 (sprint 29's
   decision 2 holds). The contract is `.crew/sprint/29/b5-first-contract.md`; this folder adds no
   second copy. Size M, at the top of M, as the contract says. Branch `sprint/30-b5a-log`.

3. **Three roles from the first minute, not in sequence.** The contract says Iris's notes and
   Probe's checks first, then Forge. The run is autonomous and the owner is away, so the build
   starts at once (`.crew/STATE.md`, "A resumed sprint starts the build at once"): Forge builds the
   routes, the redirect, the bar variant, the table and the record from the data rules, which no
   note of Iris's changes, and takes her three calls (the ghost's composition and `--vellum`, the
   record's place, the lede and an Approved key) as they land, as sprint 27 took the control's
   placement mid-build. Until they land Forge uses the placeholders in the briefs (the lines plan's
   profile and half-breadth plan, Iris's sprint 22 vellum, the frame's places).

4. **The lede's first sentence is fixed unless Iris rewords it within her first hour.** Probe writes
   B5.5's lede as one constant in the oracle so a reword is one line; Atlas relays Iris's words to
   Forge and Probe together. An Approved key, if Iris adds one, is plain text with no link and
   none of C4.4's status words ("Merged", "Shipped", "Failed"), so B5.6 holds unchanged.

5. **The spec files move with the route.** Probe renames `e2e/sprints.spec.ts` to `e2e/log.spec.ts`
   and `e2e/sprints-entry.spec.ts` to `e2e/log-entry.spec.ts` with `git mv`, since
   `.crew/scope.mjs` counts `expect(` per file across a rename inside `e2e/` and the retirements
   are the owner's (batch F) whatever the file is called. Each rewritten test keeps its C-number in
   its title.

6. **Ports and worktrees, as sprint 27.** Probe 4710 to 4719 in `/home/user/wt-probe-30` on
   `probe/30`; Iris 4720 to 4729 in `/home/user/wt-iris-30`; Forge 4730 to 4739 in
   `/home/user/wt-forge-30` on `forge/30`. Roles push after every commit; Atlas cherry-picks onto
   `sprint/30-b5a-log` as commits land and pushes, so nothing is lost with the container.

7. **Main merged into the branch after the owner's approval.** #75 (sprint 28, notes only) merged
   at 19:3x UTC on 2026-10-24 and conflicted with this sprint's `ROADMAP.md` tick in the riders
   list. Resolved keeping main's B4.1 line (the newer wording) and this sprint's deletion of the
   `/sprints` rider, which B5a answered (the B5a tick records it). No product code was on either
   side, so Lens's ship and the suite's result hold; the head changed, so `gate` asks the owner
   again.
