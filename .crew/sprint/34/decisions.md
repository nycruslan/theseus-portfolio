# Sprint 34 decisions (Atlas)

1. **Sprint 34 is B4b, the live layer on `/`.** The pre-flight (2026-10-31) found nothing open,
   next 34, one of the day's six merged, no owner goal; #78 (B4a) merged at 01:50 UTC and started
   this run. Production's `/crew` reads the real feed (`data-crew-state="resting"`, "Crew resting.
   Sprint 31 merged 31 Oct, 01:50 UTC."), so B4b has a feed to build on. The merge record for
   sprint 31 was written first (`.crew/sprint/31/merge.json`). Branch `sprint/34-b4b-live-layer`.

2. **Size M,** at the plan's B4.2 (`.crew/sprint/28/b4-plan.md`). Its checks are numbered from
   B4.15 on, after B4a's B4.1 to B4.14.

3. **Five roles from the first minute,** as `.crew/STATE.md` says a sprint starts: Iris makes the
   fold call at 1440 × 900 and the pencil and copper look; Quill writes `contract.md`; Probe the
   checks from the plan and the contract as it lands; Forge the feed's state on `/` (the 2D pencil
   plank, the pencil row, the rest line, the legend); Pixel the hatch and copper tip on the hull.

4. **The interface between Forge and Pixel is the 2D drawing,** as B5c made it (the 3D chunk reads
   the drawing's seats and numbers): the pencil plank is the drawing's `path[data-plank]` with
   `data-pencil` and `data-sprint` set to the in-progress sprint's number, plus `data-live` while
   the crew is live (the copper tip). Pixel reads those attributes and changes no loader code, so
   B2.10's budget on `/` (2,048 B with WebGL refused) stays where it is, and `/` gains 0 B of
   script. Forge owns `app/`, `components/` (but `model.tsx`), `lib/` (but `lib/model/`) and
   `app/globals.css`; Pixel owns `lib/model/`. If either needs the other's files, it says so to
   Atlas first.

5. **Ports and worktrees.** Probe 4710 to 4719 in `/home/user/wt-probe-34` on `probe/34`; Iris
   4720 to 4729 in `/home/user/wt-iris-34`; Forge 4730 to 4739 in `/home/user/wt-forge-34` on
   `forge/34`; Quill 4740 to 4749 in `/home/user/wt-quill-34` on `quill/34`; Pixel 4750 to 4759 in
   `/home/user/wt-pixel-34` on `pixel/34`. Roles push after every commit; Atlas cherry-picks onto
   the sprint branch as commits land.
