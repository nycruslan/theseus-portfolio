## Sprint 26: B3, the hull on phones and tablets, at 30 fps

**Goal (roadmap):** on `/` at every width, the white card model lands on the drawing the page
shows (the three-view sheet from 768 px, the profile and half-breadth plan below), lifts off in one
camera move and settles at three-quarters, grown on phones to the size Iris sets. Quality steps
itself: a 1.5 pixel ratio and a phone-sized mesh below 768 px, a lower ratio when frames run slow,
a still frame if the move can't hold 30 fps. The page scrolls through the canvas. Once a visit,
settled under reduced motion, 0 frames at rest; the Off paths download no 3D. Sprint 25's riders
(Lens's nits on #72) ride along.

**Size:** M. Pixel built, Probe wrote the checks first, Iris set the phone's pose and reviewed.

## What changed, for a visitor

- **Every width runs the model.** The loader's "1024 px and up" goes (`components/model.tsx`); the
  viewport-narrowing Off path and its `narrowed` flag go with it. The Off paths (WebGL refused,
  forced colours, Save-Data, print, scripts off) are as before.
- **The model lands on the drawing the page shows** (`lib/model/mount.ts`): `.plan-wide` from
  768 px, `.plan-narrow` below, registered on its `.ln-outline`. A resize across 768 px
  re-registers the model on the other drawing, settled, with no loft, no early frame and CLS 0.
- **The phone's loft** (`lib/model/loft.ts`, `lib/model/calls.ts`): Iris's pose, yaw −36° and
  pitch 16°, `G_NARROW` 0.25 and `SETTLE_NARROW { dx: 0, dy: 26 }` (decision 7), the growth on e²
  so it arrives with the turn's foreshortening (decision 9, her early look): the settled hull is
  as long as the drawing it left (310 px at 390), its shadow on the half-breadth plan.
- **Quality follows the drawing, not the device** (`lib/model/hull.ts`, `lib/model/stage.ts`):
  the phone level (56 stations × 4 rows) and a 1.5 ratio cap below 768 px, the desktop level and a
  cap of 2 from it, both levels in one 3D chunk; the stepping rule of sprint 25 unchanged.
- **Lens's riders on #72:** a lost WebGL context returns the Off drawing and a restore the model;
  `stop()` during `compileAsync` defers the dispose; a redraw pending off-screen draws before the
  model scrolls into view (root margin one viewport); forced colours switched on mid-visit hide
  the layer and keep the system-colour drawing whole; the bottom row's `min-height` comment notes
  the classic scrollbar's 6 px.

## The contract and its results

`.crew/sprint/26/contract.md`; decisions in `.crew/sprint/26/decisions.md`; Iris's call in
`.crew/sprint/26/notes-iris.md`, her review in `.crew/sprint/26/review-iris.md`.

<!-- RESULTS -->

## For the owner: the phone's rest pose against `rest-390.webp`

Iris, on whether the phone's settled pose departs from the frame you approved on sprint 17's
canvas: the hull is the approved one, the card model at three-quarters, most of the sheet's width
(310 of 390 px, where `rest-390.webp` shows about 297), its shadow on the sheet, over a hollow
drawing. What changes is the drawing under it. `rest-390.webp` was drawn over the body plan, which
the phone sheet hasn't carried since sprint 22 (you approved the profile-and-half-breadth sheet in
#62, because a body plan has no planks and the planks are the record). So on a phone the model
lands on the profile it draws, lifts off it and settles over that profile with its shadow on the
half-breadth plan below, the same picture as the desktop's at 1440 scaled to the phone's sheet.
No decision is needed to merge: the sheet is yours already, and the pose is the canvas's.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_016981j6vmbcBMSgT47eyFWp
