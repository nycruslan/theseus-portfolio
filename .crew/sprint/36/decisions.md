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
