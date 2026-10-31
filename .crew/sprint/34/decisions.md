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

6. **Iris's corrections on the build are the contract's amendment 1** (the tip from 1/2 to 7/8, every
   copper dot 8 px, the chip's padding, B4.21's band at least 5 px), and her looser triangle bound
   for B4.21 is accepted: it loosens only a new check, and draws stay at most 8 (6 while live).

7. **Two departures in Probe's checks, recorded at Lens's ask (nits on b2b87d7).**
   - B4.21 judges "only inside the pencil plank and its band" and "copper only there" at frame 1,
     where the model lies on the drawing and the 2D plank is its projection, not at rest as the
     contract says: `/` has no seat pick to locate the plank at rest. At rest it checks that the
     canvas differs, by at most 5% of the hull, with the chip inside the changed box, and copper
     present. The hatch and tip live in the model's frame, so right at frame 1 is right at rest.
   - `e2e/live-layer.spec.ts` skips under `PLAYWRIGHT_BASE_URL`, as `crew.spec.ts` does: a deployed
     site has a feed (so it isn't the down reference) and the fixture sites copy this checkout's
     `.next`. CI never sets it. Lens accepts both.

8. **Lens ship on b2b87d7 with no fix round;** the empty-goal nit (a blank feed goal renders an empty
   link to `/crew`; `goal?.trim()` in `layerOf` and the oracle) rides the next sprint that touches
   the layer. Iris ship at 8.7; her cheap change (the riding numbers on whole device pixels) was
   taken before the label, and the chip covering the dot on a short seat rides later.
