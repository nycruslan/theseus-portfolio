# Sprint 26 brief for Pixel: the hull on phones and tablets, at 30 fps (Atlas)

## What this sprint is for, and for whom

B3's second build sprint. A hiring executive opens `/` on a phone or a tablet: the white card model
lands on the drawing that width shows, lifts off it in one camera move and settles at
three-quarters, grown to the size Iris sets, at 30 fps or a still frame. Sprint 25's desktop loft
(your build, PR #72, merged by the owner, who approved A, `WebGLRenderer`) is the base; this sprint
takes it to every width and takes Lens's riders on #72 with it. The owner sees it on their own
phone at the B3 demo next sprint, so what you ship is what they judge.

## The spec, in this order

1. `.crew/sprint/26/contract.md`: the outcome, the calls, the data rules (word for word; Probe's
   harness implements the same rules), the riders (code), the checks and the budgets. Where it
   changes sprint 25's rules, it wins; everything else in `.crew/sprint/25/contract.md` and its
   decisions 7 to 16 still holds.
2. Your spike, `.crew/sprint/24/spike/spike.md` S2 (the phone level: 56 × 4), S4 (390 registration),
   S5 (the phone pose: yaw −36°, pitch 16°; D = 1,575 at 844), S6 (the stepping as designed).
3. Lens's nits on #72, which this sprint fixes (the contract's "Riders (code)"): read them in full
   with `gh api repos/nycruslan/theseus-portfolio/pulls/72/comments` (the lost context, `stop()`
   during `compileAsync`, the observer's root margin, the forced-colours switch, the `min-height`
   comment) and sprint 25's decision 13 (the capture teardown: act on a layout reading only when
   it still holds two frames later).
4. Probe's checks as they land on `origin/probe/26` (Atlas tells you the shas): run them, see them
   red, make them green. You don't edit `e2e/`; a check you think wrong goes to Atlas.
5. The canvas's phone frames: `.crew/sprint/17/design/rest-390.webp` and `hero-390.webp` (the
   size the owner approved at rest), `motion-control.webp`. Iris's call on the phone's settled
   pose comes through Atlas as named constants; build the contract's defaults first.

## What you build

- **`components/model.tsx`**: the width condition goes from the loader's media query; the rest
  stays. Keep it within B2.10's 2,048 B and report its bytes.
- **`lib/model/mount.ts`**: the model lays its canvas on the drawing shown (`.plan-wide` from
  768 px, `.plan-narrow` below), observes `[data-plan]` or both drawings for size, re-registers on
  a crossing of 768 px (settled, no loft, no frame before the rebuild; the two-frame guard), and
  drops the `narrowed` flag and the width Off path (a bfcache restore rebuilds settled at any
  width). The cap and the level follow the width (1.5 and the phone mesh below 768 px; 2 and the
  desktop mesh from it). The riders: `webglcontextlost` deletes `data-state` and `restored` sets
  it back after a redraw; a `stop()` during `compileAsync` defers the dispose until the compile
  settles; the IntersectionObserver gets a `rootMargin` of about one viewport.
- **`lib/model/hull.ts`**: `buildHull` takes a level (stations × rows: 120 × 8 desktop, 56 × 4
  phone, S2), both in one chunk.
- **`lib/model/loft.ts`**: `poses()` takes the layout the drawing uses (`WIDE` or `NARROW` from
  `lib/hull-layouts.ts`) and the pose for it: the desktop's as today; on the narrow drawing yaw −36°,
  pitch 16°, with `G_NARROW` and a narrow settle offset from `lib/model/calls.ts` (defaults: 0.1
  and the desktop's offset scaled by the drawing, until Iris rules). The settled model must lie
  wholly inside the canvas: say in your report how much growth the box allows at 390 and 320.
- **`lib/model/calls.ts`**: `G_NARROW`, `SETTLE_NARROW` (dx, dy, yaw, pitch) as named constants,
  so Iris's call is a one-line change.
- **`app/globals.css`, "The model"**: the layer covers `[data-plan]` at every width (drop the
  `display: none` below 64rem and the width condition on `main:has(> [data-model])`), the hollow
  rule and the reduced-motion fade apply on screen at every width and under `(forced-colors: none)`
  only, and `[data-model]` is `display: none` under `(forced-colors: active)`. One comment edit in
  "The sheet": the bottom row's `min-height` notes the 6 px a classic scrollbar takes (Lens's nit).
  Don't edit other sections.
- **Nothing else changes**: no new dependency, no `package.json` scripts, no `e2e/`, no owner path.

Keep a production build served on your own port (4700 to 4709) from your worktree and tell Atlas
the URL in your first progress note: Iris looks at it early at 390, 768 and 1440. Her calls come
through Atlas as you build, not at the end.

## Proof asked for

- B3.1 at 390 (both DPRs, both schemes) and 768; B3.2 at 390; B3.6 at 390 (draws, triangles,
  backing store at DPR 2 and 3, 0 frames at rest); B3.11 (the level by width); B3.12 (the stepping
  under a frame hog: the buffer steps to 1× and the move ends `still`); B3.8's crossings (CLS 0, no
  overflow 320 to 1920); B3.14 and B3.15 (the forced-colours switch and the lost context, in a
  browser, with what you saw). Each number against the contract's bound, marked SwiftShader where
  it is a floor.
- The 3D chunk's gzip -9 bytes (one file, both levels) and the loader's.
- `pnpm verify` passes; `PLAYWRIGHT_PORT=<yours> pnpm test:e2e` in your worktree once Probe's
  checks are in (the sprint 25 suite must stay green at 1440).

## Files you own

`lib/model/**`, `components/model.tsx`, "The model" section of `app/globals.css` and the one
comment in "The sheet". Work in your own worktree from `sprint/26-phones`:
`git worktree add -b pixel/26 /home/user/wt-pixel-26 sprint/26-phones`, then
`pnpm install --frozen-lockfile` there. Commit on `pixel/26` in small commits, each one thing, and
**push the branch to origin after every commit** (`git push -u origin pixel/26`): sprint 25 lost
its build twice with its container, and Atlas cherry-picks from `origin/pixel/26` as commits land.
Screenshots go in your scratchpad or `.crew/screenshots/`, never the sprint folder.

## Report

Outcome first. Then: what's built and what isn't; each check above with its number from your own
run against the bound; the URL of your served build and the commit shas; what you did differently
from the contract or the spike and why; the constants Iris's calls change and their values; what
you couldn't verify (a real phone's 30 fps, the DPR ladder on a GPU). Then at most three memory
lines in `.claude/agent-memory/creative-engineer/MEMORY.md` citing `.crew/sprint/26/`, corrected
where a line proved wrong, committed in the worktree, with the sha.
