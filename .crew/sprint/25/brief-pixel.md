# Sprint 25 brief for Pixel: build the registered loft at 1024 px and up (Atlas)

## What this sprint is for, and for whom

B3's first build sprint, the site's signature moment. A hiring executive opens `/` on a laptop:
the name, the role and the drawing paint first, as today; then the white card model lands on the
inked profile so exactly that nothing seems to change, lifts off the paper in one camera move and
settles at three-quarters, its shadow on its own half-breadth plan. Once a visit, skipped by any
input, settled under reduced motion, 0 frames at rest. Below 1024 px, without WebGL, in print, in
forced colours, with Save-Data or with scripts off, the visitor gets today's sheet and downloads no
3D. The owner takes the stack call (A or B) on this PR's preview, so what you ship is what they see.

## The spec, in this order

1. `.crew/sprint/25/contract.md`: the outcome, the data rules (word for word; Probe's harness
   implements the same rules), the build notes 1 to 9, checks B3.1 to B3.9 and the budgets. It is
   the spec. Its header has four amendments that bind: the layouts module is `lib/hull-layouts.ts`
   (Forge writes it; see "Interfaces"), Iris's calls are named constants, the seam weights are
   Iris's call with the model's side as the default, and the 3D lives in `lib/model/` and
   `components/model.tsx`.
2. Your spike, `.crew/sprint/24/spike/spike.md` S2 to S7 and its scene in
   `.crew/sprint/24/spike/scene/` (the reference implementation: port it to TypeScript strict,
   `WebGLRenderer`, taking the build notes), with `.crew/sprint/24/decisions.md` items 6 to 9.
3. Probe's checks in `e2e/` as they land on the branch (Atlas tells you the shas): run them, see
   them red, make them green. You don't edit `e2e/`; a check you think wrong goes to Atlas.
4. The direction and frames: `.crew/sprint/17/direction-iris.md` (the loft, the card model, the
   budgets), `.crew/sprint/17/design/loft.webp`, `main.webp`, `night-1440.webp`, `motion-off.webp`.
5. The page as shipped: `app/page.tsx`, `app/globals.css` ("The lines plan"), `components/lines-plan.tsx`,
   `lib/lines-plan.ts`, `lib/half-model.ts`. Your memory. three.js docs through the `threejs-*`
   skills and context7 (`three@0.186.1`); Next's dynamic import and client component docs in
   `node_modules/next/dist/docs/`.

## What you build

- **`components/model.tsx`**, the loader (`"use client"`): renders `[data-model]` as
  `[data-plan]`'s next sibling in `main`, decides Off by the contract's "Where" rules (the one
  `webgl2` probe last, only once the other conditions hold), and dynamic-imports the scene after
  `load` on `requestIdleCallback` with a 2,000 ms timeout. It is the only client code `/` ships
  with WebGL refused, so keep it small: B2.10 allows 2,048 B over `/sprints'` scripts. Measure the
  loader's gzip bytes and report them; above 2,048 B the number goes to the owner (contract, Needs
  owner decision 2), so tell Atlas before you accept it.
- **`lib/model/`**, the scene in TypeScript: the merged plank mesh with a per-vertex plank index
  and a 22-entry state lookup (note 1), the fat-line seams and outline, deck and transom, the
  CPU-baked shadow plane, the whole-pixel canvas (note 2), shared lift ends (note 3), no side-view
  offsets (note 4), `compileAsync` before frame 1 (note 5), the loft with its quality stepping
  (the DPR ladder rounding a fractional ratio down, Lens's nit), the once-a-visit flag, the skip
  listeners (passive, no `preventDefault`), reduced motion, the IntersectionObserver and
  visibility gates, the scheme change redraw from the computed tokens, and teardown on `pagehide`.
  One module holds Iris's constants: duration, ease (with an ease-in slot), hold height or width,
  the shadow's darkness per scheme, the seam weight, the 1024 framing, the reduced-motion
  appearance. Build the contract's values; Atlas relays her calls as she makes them, each a
  one-line change.
- **The mount** in `app/page.tsx`: one `<Model …>` after `<LinesPlan …>`, with the seats it needs
  as plain data (an array, never the Map). Don't change the page's other lines; Forge edits its
  import line for `lib/hull-layouts.ts`.
- **`app/globals.css`**: a new section, "The model", after "The lines plan": `[data-model]` over
  `.plan-wide`'s box, taking no layout space, `pointer-events: none`, `display: none` in print, and
  the stacking rule that keeps the plank numbers (the `.plan-plank` spans) above the canvas (note
  6). No CSS animation or transition anywhere in it: B1.8 counts them. Don't edit the file's other
  sections; Forge edits "The revision table".
- **`package.json`**: `three@0.186.1` as a dependency and `@types/three@0.186.0` as a dev
  dependency, with the lockfile. Nothing else in `package.json` (its scripts are the owner's), and
  `knip.json` is the owner's too: if knip flags something, solve it in your code or tell Atlas.
- **The triangle budget**: take one of S2's two fixes so a frame submits at most 30,000 triangles
  with the line quads counted (100 stations, or two-triangle quads), and say which.

Iris looks at your running build early. Keep a production build served on your own port (not 3000,
3352 or 4534) and tell Atlas the URL in your first progress note; she reaches it from this machine.
Her calls on the loft's feel come through Atlas; take them as they come, not at the end.

## Interfaces

- **`lib/hull-layouts.ts`** (Forge, pushed within the hour): `export type Layout`, `export const
  WIDE`, `export const NARROW`, `export type Plank`, `export const PLANKS`, exactly the objects
  `lib/lines-plan.ts` holds today (lines 160 to 215 and 25 to 55), unchanged. Until Atlas sends you
  its sha, write your imports against those names and build against the spike's copies if you
  must; then cherry-pick Forge's commit into your worktree and drop the copies.
- **Seats**: the page gives the model which planks carry a sprint; a plank is seated in the model
  exactly when its `[data-plank]` carries `data-sprint` (the same `seatPlanks` call).
- **Hooks Probe tests:** `[data-model]`, its `data-state` (`landed`, `lofting`, `settled`, `still`),
  its one `canvas`; nothing else, and no `window` globals for tests.

## Files you own

`lib/model/**`, `components/model.tsx`, the mount in `app/page.tsx`, "The model" section of
`app/globals.css`, `package.json`'s dependencies and `pnpm-lock.yaml`. Work in your own worktree
from `sprint/25-the-loft`: `git worktree add -b pixel/25 /home/user/wt-pixel-25 sprint/25-the-loft`,
then `pnpm install --frozen-lockfile` there (a fresh worktree has no `node_modules`). Commit on
`pixel/25` in small commits, each one thing, so Atlas can cherry-pick them onto the sprint branch
as they land. `pnpm verify` must pass before you stop; run `PLAYWRIGHT_PORT=<free> pnpm test:e2e` in
your worktree once Probe's checks are in. Screenshots and frames go in your scratchpad or
`.crew/screenshots/` (git ignores it), never the sprint folder, except what Atlas asks for the PR.

## Report

Outcome first. Then: what's built and what isn't; each check B3.1 to B3.9 with its number from
your own run against the contract's bound (registration at 1440 both DPRs, framed height at the
five steps, draws, triangles with the fix you took, the 3D chunk's gzip -9 with gzip -6 and brotli
beside it, the loader's bytes against 2,048, frames at rest, the scene build's longest task, frame
time at 4× CPU), each marked SwiftShader where it is a floor; the URL of your served build and the
commit shas for Atlas; what you did differently from the contract or the spike and why; the
constants Iris's calls change and their current values; what you couldn't verify. Then at most
three memory lines in `.claude/agent-memory/creative-engineer/MEMORY.md` citing `.crew/sprint/25/`,
corrected where a line proved wrong, committed in the worktree, with the sha.
