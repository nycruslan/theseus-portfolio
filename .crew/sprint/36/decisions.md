# Sprint 36 (B4d): decisions

1. **The work** (Atlas): the roadmap's next sprint is B4d, the hull on `/crew` with one mark per
   moment under Full/Calm/Off and the control in `/crew`'s bar (`.crew/sprint/28/b4-plan.md`,
   B4.4). No owner goal, no PR open or waiting. M: Quill's contract with Iris's calls, Probe's
   checks red first, Pixel builds the 3D and Forge the control and the 2D marks, Iris looks early.
   Riders: Lens's nit on #90 (abort a poll that never settles), Lens's two nits on 9b8743a
   (`lib/model/mount.ts`), and Iris's chip over the copper dot on a short seat if the layer moves.
2. **Quill's contract** (`contract.md`, B4.33 to B4.42) is accepted as written. Lens's two nits on
   9b8743a were already done in sprint 34 (e770a54), so the roadmap's B5c rider line comes off at
   the close-out.
3. **`/crew`'s 18,432 B script budget needs no Owner's pick** (Atlas): it is the poller's allowance
   plus B2.10's loader allowance, both in plans the owner merged; the loosening is Lens's to accept
   with the contract's reason (call 7), named in the PR.
4. **CI's 25-minute cap:** Probe measures the full suite with the new specs at CI's worker count
   before the label; if it can't fit, the fix is in `.github/` and goes as an Owner's pick, never as
   a weaker check.
5. **Probe, Forge and Pixel build in parallel** in their own worktrees from the contract's head:
   `e2e/` is Probe's; `lib/model/*` and the model layer's CSS are Pixel's; `lib/hull-layouts.ts`,
   the 2D drawing, `app/crew/`, `components/crew*.tsx`, the poller and the rest of the CSS are
   Forge's. Nobody edits `components/model.tsx`. Forge pushes `MARKS` and the layouts first.
6. **Iris's three amendments to the contract** (her message to Atlas; `notes-iris.md`), accepted
   and relayed to Probe and Pixel (Forge had them from her): ticks hang below the pencil plank's
   lower edge (B4.34's box check becomes "top on the lower edge within 1 px, hanging down"); the
   crops are 480 hull units across from 768 and 320 below (`CREW_WIDE`, `CREW_NARROW`); the pose
   is yaw ±35° toward the focus plank's end, pitch 6°, lift 90, the focus point held within 1 px,
   with B4.36's framing bounds (8% from the sides; depth ≥ 18 px at 1440 and 1024, ≥ 16 px at 390;
   seat 5.0 exempt). B4.34's dot clearance reads as Probe checks it: no tick's box within 4 px of
   the dot's centre.
7. **B4.38's reduced-motion fade is `/`'s** (Atlas, on Pixel's and Probe's finding): the contract
   says `/crew` inherits `/`'s 240 ms fade, which also fades the planks' fill and the numbers',
   tip's and ticks' visibility, while B4.38's wording allowed opacity only. An opacity-only fade
   would leave the hull empty for an instant, which `/`'s fill fade exists to avoid, and reduced
   motion protects against movement, not a fade. B4.38 now allows opacity, fill and visibility
   transitions and still fails any transform, position, size or camera move, within 300 ms.
8. **B4.36's depth floor is painted pixels** (Iris, on Probe's and Pixel's finding): her 18 and 16
   were geometric seam-to-seam depths (Pixel's 20.4, 19.0, 18.4), and the lines' ink takes a steady
   3.0 to 3.4 px off what Probe reads between them. The pose stays; Probe's painted read holds
   at least 15 px at 1440 and 1024 and at least 13 px at 390 on 6.1 and 3.0 (5.0 exempt), which
   keeps today's 16, 17 and 15 with 1 to 2 px of margin and fails a pose about 15% shallower.
9. **Shipped on Lens's ship and Iris's ship** (Atlas): Lens ship on f9fbbc6 with two nits. The
   PLAYWRIGHT_BASE_URL skips are now named in the PR; the "outside React's tree" comment in
   `components/crew-live.tsx` (the poller edits nodes React hydrated, safe only while nothing
   re-renders `CrewPlan`) rides with the next sprint that touches `/crew`. Iris ship at 8.3/10
   (`review-iris.md`) with four follow-ups, none blocking. Editing the PR body restarted CI's
   `check` mid-run (11:46, run 41198244785), costing one CI run.
10. **CI's `check` hit its 25-minute cap on cc9e958** (job 124530973957: e2e ran 23.8 min and was
    cancelled; sprint 35's whole job took 22.2). Probe's local estimate of 1.8 min added was low.
    The merge waits; Probe cuts the suite's wall time by at least 4 min with harness changes only,
    no assertion dropped or weakened, and Lens re-reviews. Raising the cap is the owner's
    `.github/` change, proposed in the retro, and this PR doesn't wait on it.
11. **CI's cap goes to the owner as an Owner's pick (waits)** (Atlas, after two fix rounds). CI's
    `check` was cancelled at 25 minutes on cc9e958 and again on c040055, after Probe's harness cut
    (6236f32: 31.3 to 28.7 min locally, every `expect` kept). The cancel annotation's log line puts
    c040055's e2e at about 95% done when the cap hit. Pinned to 2 cores, the suite passed 240 of 240
    with no CI-only failure (Probe, dc25324, which also fixes Lens's Important on B4.36: polls
    answer the site's own state instead of being held past B4.42's 30 s abort). What's left is
    speed, so the choices are the owner's cap, cutting the contract's 3D checks, or a deeper pass
    on the existing 3D suites. This PR raises `.github/workflows/ci.yml`'s `timeout-minutes` from 25
    to 35 (the recommended option, built; the PR's own CI runs with it) and carries `needs-owner`:
    `gate` holds it until the owner approves the head, and the owner merges.
12. **With the cap at 35, CI's `check` passed on 2feab08 in 26.9 minutes** (14:56:02 to 15:22:53),
    which 25 would have cancelled. Lens ship on 2feab08 with two nits that ride: the 3D ticks'
    weight from `MARKS.width` (Pixel) and the poller's comment (Forge). The PR waits on `gate`,
    the owner's approval of the head.
