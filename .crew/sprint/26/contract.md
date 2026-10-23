# Sprint 26 contract: the hull on phones and tablets, at 30 fps

Atlas, 2026-10-23. B3's second build sprint, as Quill planned it (`.crew/sprint/24/b3-plan.md`,
"Sprint 26"), on sprint 25's model as shipped (`.crew/sprint/25/contract.md`, its data rules and
decisions 7 to 16; PR #72, merged by the owner, who approved the head built on A, `WebGLRenderer`).
Sprint 25's data rules hold word for word except where this contract changes them below. Every GPU
number measured here is headless Chromium's SwiftShader, so a floor; the 30 fps budget is checked on
the owner's phone at the B3 demo (sprint 27).

## Outcome

A hiring executive opens `/` on a phone. The name and the drawing paint first, as today. The white
card model lands on the profile the phone draws, so exactly that nothing seems to change, lifts off
it in one camera move and settles at three-quarters, grown to the size Iris sets, its shadow on the
half-breadth plan below. On a tablet it lands on the three-view sheet, as a laptop's does. Quality
steps itself: a 1.5 pixel ratio at most on phones, a phone-sized mesh, a lower ratio when frames run
slow, and a still frame if the move can't hold 30 fps. The page scrolls through the canvas, and a
touch or a scroll ends the move. Once a visit, settled under reduced motion, 0 frames at rest, and
the Off paths (WebGL refused, forced colours, Save-Data, print, scripts off) download no 3D, as
before. A viewport's width is no longer an Off path.

## The calls I made

- **Every width runs the model.** Sprint 25's "1024 px and up" was the lane, not the design: the
  canvas approved Full as the default on phones (`motion-control.webp`, decision 8 of sprint 24).
  The loader's width test goes; the viewport-narrowing Off path and its `narrowed` flag go with it.
- **The model registers on the drawing the page shows at that width:** `.plan-wide` (the
  three-view sheet, `WIDE` in `lib/hull-layouts.ts`) from 768 px, `.plan-narrow` (the profile and
  half-breadth plan, `NARROW`, scale 0.5) below it. The canvas's phone frames (`loft-390.webp`)
  landed on a body plan the narrow sheet hasn't had since sprint 22 (the owner approved that sheet
  in #62), so the phone lands on the profile it draws (spike S4: 1.0 CSS px at 390, DPR 1; 0.5 at
  DPR 2 with the 1.5 cap).
- **The phone's settled pose is Iris's call** (spike S7's note; `ROADMAP.md`): at scale 0.5 the
  registered hull is 59 px tall at 390, and the approved `rest-390.webp` shows a hull most of the
  drawing's width. She sets how much the model grows as it lifts on the narrow drawing, and where it
  settles, as named constants; the canvas stays the drawing's box, so the settled model fits inside
  it. Her reference: `rest-390.webp` and `hero-390.webp` for the size, `s5-loft-390.webp` for today's.
- **The level and the cap follow the drawing, not the device.** Below 768 px the phone level (spike
  S2: 56 stations × 4 rows, 5,355 mesh triangles) and a 1.5 ratio cap; from 768 px the desktop level
  and the cap of 2, as sprint 25. The spike's `hardwareConcurrency`/`deviceMemory` hints are out: a
  four-core laptop at 1440 would get a faceted silhouette for a cost the stepping rule already
  handles in real time, on the frames themselves.
- **Stepping up stays at rest** (sprint 25's decision 11): a change of resolution mid-move shows,
  and the rest frame returns to the cap, which is the step up. The direction's "up below 12 ms" is
  met by that frame.
- **The page scrolls through the canvas because nothing in `[data-model]` is hit:** the layer is
  `pointer-events: none` (sprint 25's rule), so a touch drag over the canvas scrolls the page and,
  as a scroll, settles the loft. The canvas's `touch-action: pan-y` would add nothing a visitor
  could notice; the check is the behaviour.
- **Sprint 25's riders ride here** (`ROADMAP.md`, Lens's nits on #72): see "Riders".

## Data rules (the page and Probe's harness implement these word for word)

Sprint 25's rules stand except these.

**Where.** The model runs when scripts run, a `webgl2` probe is granted, `forced-colors: active`
doesn't match, Save-Data isn't on and the media is screen. There is no width condition. Otherwise
Off, as before: no chunk, no context but the one refused probe, the page is main's.

**Which drawing.**
- `[data-model]` lies over `[data-plan]`'s box at every width and takes no layout space. The canvas
  is laid on the box of the drawing shown: `.plan-wide` from 768 px (`WIDE`), `.plan-narrow` below
  (`NARROW`), in whole buffer pixels as before.
- Frame 1 maps that drawing's `viewBox` onto the canvas orthographically, so the hull lies on its
  `.ln-outline` within the same bounds as sprint 25 (1.5 CSS px at DPR 1; 1.0 at DPR 2, where the
  phone's canvas is at 1.5).
- The narrow drawing has no numbers or leaders; the hollow rule hides what it has (the fills) from
  the first lofting frame, on screen at every width, never in print or forced colours.
- **A resize across 768 px** re-registers the model on the drawing now shown, at that drawing's
  level and cap, settled: no loft plays again, no frame is drawn before the rebuild is ready, CLS is
  0, and nothing overflows. A reading that doesn't hold two animation frames later is ignored (a
  full-page capture gives the page a 1 × 1 viewport for about 14 ms: sprint 25's decision 13).
  Within one drawing a resize refits as before.

**The phone's loft** (below 768 px).
- The camera as before: straight down, a dolly-zoom from orthographic to a 30° lens over the
  viewport's height (D = 1,575 px at 844).
- The settled pose is yaw −36° and pitch 16° (spike S5's phone pose), with Iris's offset and
  growth: the framed height follows `(1 + G_NARROW × e(u)²) × frame 1's` (the growth on e², so it
  arrives with the turn's foreshortening rather than before it; decision 9), `G_NARROW` and the
  settled offset named constants in `lib/model/calls.ts` beside `GROW` and `SETTLE`: `G_NARROW`
  0.25 and `{ dx: 0, dy: 26 }` (decision 7). The desktop's growth stays on e. The settled model
  lies wholly inside the canvas, and so does every moving frame.
- The duration, ease, once-a-visit flag, skip inputs (`touchstart` and `scroll` included), reduced
  motion (settled, with the 240 ms fade on screen at every width) and teardown are sprint 25's.

**Quality.**
- The cap: `min(devicePixelRatio, 1.5)` below 768 px, `min(devicePixelRatio, 2)` from 768 px.
- The level: below 768 px the phone mesh (at most 12,000 triangles submitted a frame, line quads
  included); from 768 px the desktop mesh (at most 30,000, as before). One 3D chunk carries both.
- The stepping rule is sprint 25's: three frames in a row above 22 ms step the ratio down a rung on
  the ladder 2, 1.5, 1 (a ratio between rungs rounds down); at 1, six frames in a row above 33.4 ms
  end the move at the settled pose with `data-state="still"`. Nothing steps up mid-move; the rest
  frame is drawn at the cap.

**Riders (code).**
- A lost WebGL context deletes `data-state`, so the Off sheet returns (the whole drawing); a restore
  sets the state back after one redraw.
- `stop()` while `compileAsync` is pending defers the dispose until the compile settles.
- A redraw pending while the model is off-screen is drawn before the model scrolls into view (the
  observer's root margin about one viewport).
- Forced colours switched on mid-visit: `[data-model]` is `display: none` under
  `(forced-colors: active)`, and the hollow and fade rules apply under `(forced-colors: none)` only,
  so the system-colour drawing is whole.
- The bottom row's `min-height` comment notes the 6 px a classic scrollbar takes (Lens's nit; no
  rule change).

## Checks

Sprint 25's B3.1 to B3.10 stay, their width cases widened as each says; the new numbers continue
from B3.11. Each is a Playwright test in `e2e/model-*.spec.ts`, or a case added to one. Every
GPU-dependent number is reported beside its floor note.

**B3.1 at 390 × 844 and 768 × 1024.** Registration asserted at 390, DPR 1 (≤ 1.5 CSS px) and DPR 2
(≤ 1.0 CSS px; the canvas at 1.5), both schemes, by the same method on `.plan-narrow`'s
`.ln-outline`; 768 × 1024 and 320 × 568 measured and reported. The whole-pixel canvas asserted at
320, 390, 768 and 820 at DPR 1 and 2 (the buffer is the CSS size × the ratio, integers; the CSS
size within 1/ratio px of the shown drawing's box). The hand-off at 390, DPR 2: `main > header`,
the revision block, the bar and the drawing outside the profile pixel-identical, every text node's
box unchanged, no transition.

**B3.2 at 390 × 844.** The framed height within 2% of `(1 + G_NARROW × e(u)²) × frame 1's` at u = 0,
0.25, 0.5, 0.75 and 1; `settled` at u = 1, the pose yaw −36° pitch 16° within Iris's tolerance,
the settled frame wholly inside the canvas (no coverage on its edge rows or columns); the title
block, revisions and bar unchanged throughout. The duration ± one frame.

**B3.3 at 390 × 844, touch emulated.** Once a visit (reload, second goto); a tap, a touch scroll
and a key each settle within 2 frames and do their own work; storage throwing plays it.

**B3.4 at 390.** Reduced motion opens settled; a switch mid-loft settles within 2 frames.

**B3.5 rewritten.** The width case goes: the Off cases are WebGL refused, forced colours,
Save-Data, print and scripts off, each with the same assertions. The narrowing check becomes: the
chunk held, the viewport taken from 1440 to 700, released: the model lands on `.plan-narrow`,
`data-state` reaches a rest state, the canvas's CSS size is `.plan-narrow`'s box, and the Off
page's planks at 700 keep their fills until the first lofting frame. The spec ends with at least
as many `expect(` calls as it has today (`.crew/scope.mjs`).

**B3.6 at 390 × 844.** At most 8 draws and 12,000 submitted triangles a frame over the loft and
at rest, both schemes; the backing store at most 1.5× the CSS size at DPR 2 and at DPR 3; 0 frames
at rest, off-screen and hidden, each proven with a scheme switch inside the window (0 frames while
off-screen or hidden, 1 once back; Lens's nit); the 3D chunk is the same file as at 1440, within
250,000 B gzip -9, requested after `loadEventEnd`. Frame time at 4× CPU reported against S6's
0.9 / 3.0 / 12.6 ms.

**B3.7 at 390.** Plank fills at frame 1 within 8 levels of the Off page's at each plank's centre,
both schemes; nothing within ΔE 10 of `--accent`; a scheme switch while settled draws exactly 1
frame (`toBe(1)`, at 1440 too; Lens's nit).

**B3.8 widened.** Read as page and Back at 390 leave one context and a settled model. Resizing
1440 → 1000 refits the wide drawing (CLS 0); 1000 → 700 re-registers on the narrow drawing, settled,
no loft, CLS 0, the canvas's box `.plan-narrow`'s; 700 → 1000 back onto the wide one; nothing
overflows at any width from 320 to 1920. Nothing in `[data-model]` is hit at 390.

**B3.9 at 390.** B1.9's LCP (text, ≤ 2,500 ms at 4× CPU) and B1.8's CLS 0 hold with the model
loading at 390 × 844; the scene build's longest task and INP for a tap mid-loft reported.

**B3.11 The phone level and the cap.** At 390 × 844, DPR 2: the hull is the phone mesh (the most
triangles in a frame ≤ 12,000; reported beside S2's 5,355 + lines), and the canvas's ratio is 1.5.
At 768 × 1024, DPR 2: the desktop mesh (> 12,000 and ≤ 30,000) at ratio 2. A mutant that keeps
the desktop level below 768 px fails it.

**B3.12 The stepping rule, driven.** At 390 × 844, DPR 2, with an init script whose own
`requestAnimationFrame` loop spins for 40 ms a frame from the first `landed` frame: the canvas's
buffer steps from 1.5× to 1× its CSS size within 3 moving frames, the move ends `still` within 12,
and the still frame is drawn at the cap (1.5×). With a 26 ms hog the buffer steps to 1× and the
move ends `settled`, reported, not asserted (SwiftShader's own frame cost can turn it into a stall).
A mutant with the step removed never reaches 1×.

**B3.13 The page scrolls through the canvas.** At 390 × 844 with touch, during `lofting`: a touch
drag over the canvas scrolls the page by its distance and settles the loft within 2 frames; after
settling, a second drag over the canvas scrolls the page; `elementFromPoint` on the canvas's
centre is never in `[data-model]`.

**B3.14 Forced colours mid-visit.** At 1440 and 390, settled: emulating `forced-colors: active`
hides `[data-model]` (no box, no hit), and the drawing is whole: every plank filled (its fill not
transparent), the wide drawing's numbers and leaders visible. Switching back shows the model
again with no loft.

**B3.15 A lost context.** At 1440 and 390, settled: `WEBGL_lose_context`'s `loseContext()` on the
model's context (the harness keeps the handle) removes `data-state` within 2 frames, so the planks
are filled and the numbers shown as on the Off page; `restoreContext()` returns the state at rest
with 1 frame drawn and the drawing hollow again.

**B3.10** stays (the harness checks itself); add a self-check for the frame hog if one is written.

## Budgets that apply to sprint 26

| Measure | Budget | Measured in the spike |
|---|---|---|
| Triangles, below 768 px | ≤ 12,000 submitted, line quads included | 5,355 mesh + 828 segments (S2) |
| Triangles, from 768 px | ≤ 30,000 | 25,267 in sprint 25 |
| DPR | ≤ 1.5 below 768 px, ≤ 2 from 768; stepping 2, 1.5, 1 | S6 |
| Frame time | still frame after 6 frames above 33.4 ms at ratio 1; 390 at 4× CPU reported | A at 390: 0.9 / 3.0 / 12.6 ms (S6) |
| Draws | ≤ 8 a frame | 4 and 5 (S3) |
| Registration | ≤ 1.0 CSS px at 390, DPR 2 (canvas 1.5); ≤ 1.5 at DPR 1; 320 and 768 reported | 0.5 and 1.0 (S4) |
| Loft at 390 | framed height within 2% of `(1 + G_NARROW × e²)` × frame 1's; once a visit; skippable | 0.82% drift at 390 (S5) |
| LCP at 390 | ≤ 2,500 ms at 4× CPU, text | 372 ms light, 288 dark (Iris, sprint 25) |
| CLS | 0 over load + 2 s, on resize across 768 and 1024 | B1.8; B3.8 |
| 3D chunk | ≤ 250,000 B gzip -9, one file for both levels | 144,516 B (sprint 25) |
| Rendering | 0 frames at rest, off-screen, hidden | sprint 25 |
| First-load script on `/` with WebGL refused | within 2,048 B of `/sprints'` (B2.10, unedited) | 648 B gzip loader |

## Riders

| Rider | Disposition |
|---|---|
| Lens's six nits on #72's `f6a5ff0` and the forced-colours nit on `515b7c3` (`ROADMAP.md`) | **Ride**: the code ones as "Riders (code)" above, the check ones in B3.6, B3.7, B3.14, B3.15 |
| The full-page-capture teardown (sprint 25, decision 13) | **Rides** as the two-frame guard on a layout change |
| Quill's follow-up: propose `design/brief.md`'s Technology edit now that the owner picked A | **Rides** in this sprint's retro proposals (an owner path; never edited here) |
| The roadmap's font and facts riders | **Don't ride**: untouched |

## Check disposition

152 tests today. **Keep every live check unedited** apart from these, all in sprint 25's own
specs: B3.5's Off cases and narrowing check (rewrite, at least as many `expect(` calls), B3.8's
1000 px case (rewrite as above), B3.1 to B3.4, B3.6, B3.7 and B3.9 (cases added). Nothing retires,
no owner path changes, so the PR doesn't wait for the owner. Live checks the build must keep:
B1.1 at 390 (the fold), B1.4 (the phone plan, read on the Off path), the invariants at 320 (no
overflow; the canvas sized to its container), B1.8 and B1.9 at 390, B2.3 and the keyboard at 320
and 390 (no new Tab stop), and everything sprint 25 kept.

## Out of scope

- Sprint 27: the Full/Calm/Off control and its storage; the B3 demo on the owner's phone.
- Device hints (`hardwareConcurrency`, `deviceMemory`); a second chunk per level.
- B4 and B5 states; the model on `/read`; GSAP; WebGPU; any change to `content/` or an owner path.

## Needs decision (Iris)

1. **The phone's settled pose:** the growth `G_NARROW` (the framed height at u = 1 as a multiple of
   frame 1's 59 px at 390) and the settled offset on the narrow drawing, inside the canvas's box
   (390 × 260 drawing units at 390 px: the profile at y 40 to 99, the half-breadth plan's centreline
   at y 190). `rest-390.webp` is what the owner approved for the phone's rest pose: say whether
   your call departs from it visibly, so Atlas can put it to the owner with the preview if it does.
2. **The dark scheme and the shadow at 390,** on the running build: anything the phone changes.
