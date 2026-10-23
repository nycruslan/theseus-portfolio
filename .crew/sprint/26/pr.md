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

Every check is a Playwright test in `e2e/model-*.spec.ts`; all 18 model tests pass on the head in
Probe's, Pixel's and Atlas's runs (Atlas's full-suite count is in the last section). Every GPU
number is headless Chromium's SwiftShader, a floor: 30 fps on a real phone is the B3 demo's
question (sprint 27). Mutants: the desktop level kept below 768 px turned B3.11 red (25,267
triangles against 12,000); the step removed turned B3.12 red (never 1×, ended `settled`); the
redraw gates removed turned B3.6's off-screen and hidden windows red. B3.14, B3.15 and every 390
case are red on main without a mutant.

| Check | Bound | Read (SwiftShader) |
|---|---|---|
| B3.1 registration at 390 on `.plan-narrow` | ≤ 1.5 CSS px at DPR 1, ≤ 1.0 at DPR 2 | 1.00 and 0.50, both schemes; 320 and 768 at 0.50 (reported) |
| B3.1 whole-pixel canvas at 320, 390, 768, 820 | buffer integer, CSS × ratio = buffer within layout's 1/64 px | holds; 390 DPR 2 is 585 × 390 on 390 × 260 |
| B3.1 hand-off at 390, DPR 2 | nothing outside the profile changes | holds |
| B3.2 the phone's loft | framed height within 2% of (1 + 0.25 e²) × frame 1's; yaw −36° pitch 16° ± 2°; inside the canvas; 2,400 ms ± a frame | drift ≤ 0.98% at every u; yaw −36.25°, pitch 17°; 0 edge pixels; 2,384 ms |
| B3.3, B3.4 at 390 with touch | once a visit; tap, touch scroll, key settle within 2 frames; reduced motion settled | holds |
| B3.5 the Off paths and the narrowing | no 3D on WebGL refused, forced colours, Save-Data, print, scripts off; 1440 → 700 lands on `.plan-narrow` | holds |
| B3.6 at 390 | ≤ 8 draws, ≤ 12,000 triangles, backing store ≤ 1.5×, 0 frames at rest, off-screen, hidden | 4 draws, 7,891 triangles, 1.5× at DPR 2 and 3, 0 frames (1 once back) |
| B3.6 the 3D chunk | ≤ 250,000 B gzip -9, one file for both levels, after load | 145,254 B; the loader 635 B (B2.10's 2,048 B) |
| B3.7 at 390 | plank fills within 8 levels; nothing near `--accent`; a scheme switch draws exactly 1 frame | holds at 390 and 1440 |
| B3.8 crossings | 1440 → 1000 refits; 1000 → 700 re-registers settled, no loft, CLS 0; no overflow 320 to 1920 | holds |
| B3.9 at 390, 4× CPU | LCP ≤ 2,500 ms text; CLS 0 | LCP 268 to 384 ms; CLS 0; longest build task 287 to 387 ms; tap INP 24 to 64 ms |
| B3.11 the level and the cap | phone mesh ≤ 12,000 at ratio 1.5 below 768; desktop ≤ 30,000 at 2 from it | 7,891 at 1.500; 25,267 at 2.000 |
| B3.12 the stepping rule, driven | 40 ms hog: 1.5× → 1× within 3 moving frames, `still` within 12, drawn at the cap | 1× on the 2nd moving frame, `still` after 7, the still frame at 1.5 |
| B3.13 the page scrolls through the canvas | a drag over the canvas scrolls the page, settles the loft within 2 frames | a 150 px drag scrolls 135 px (Chromium's 15 px touch slop), mid-loft and at rest |
| B3.14 forced colours mid-visit | layer hidden, every plank filled; back with no loft | holds at 390 and 1440 |
| B3.15 a lost context | `data-state` gone within 2 frames; a restore draws 1 frame | holds at 390 and 1440 |
| Frame time at 390, 4× CPU (reported) | S6: 0.9 / 3.0 / 12.6 ms | median 3.8 to 14.1 ms, p95 81.6 ms, under readback |

**Iris's review** (`.crew/sprint/26/review-iris.md`): ship at 8.8. Better than production at 390
and 320, pixel-identical at 1440 and 1024 (0 differing pixels, settled, font warm), axe 0, no
placeholder, LCP at 4× CPU and 400 kbps 1,712 ms light / 1,640 dark, no musts. Her early look
found the phone's growth arriving before the turn's foreshortening (the hull swelled past both
ends of its drawing for 600 ms); decision 9 put the narrow growth on e², and she frame-stepped the
final head: the stern never leaves station 0, the bow never passes the stem by more than 1 px.

**Riders taken:** Lens's six nits on #72 and the forced-colours nit, as "Riders (code)" in the
contract and B3.6, B3.7, B3.14, B3.15 in the checks. **Follow-ups, not this sprint's** (in
`ROADMAP.md`): on a cold cache the fallback face scrolls the page 21 px sideways at 320 and wraps
the nav at 390 (production today; the sprint's diff doesn't touch it); the "Base" label straddling
the shadow's tail on the narrow sheet, a composition call for the sheet with the owner.

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
