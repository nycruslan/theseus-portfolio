# Sprint 25 contract (draft): B3, the hull lifts off the drawing

Quill, 2026-10-22, drafted during sprint 24 from the spike's contract. This is the first build
sprint of B3 (`.crew/sprint/24/b3-plan.md`), on the approved direction
(`.crew/sprint/17/direction-iris.md`) and its frames `main.webp`, `loft.webp`, `night-1440.webp` and
`motion-off.webp` in `.crew/sprint/17/design/`. Every number the spike supplies is marked
`[spike: …]`. Atlas sends me `.crew/sprint/24/spike/spike.md`, and I fill them in before Probe
writes a line. One PR from `main`. **The PR waits for the owner** for the stack call (Needs owner
decision, 1).

## Outcome

A hiring executive opens `/` on a laptop. The name, the role and the drawing paint first, as today.
Shortly after, the white card model lands on the inked profile so exactly that nothing seems to
change. Then it lifts off the paper in one camera move and settles at three-quarters, its shadow on
its own half-breadth plan. The model is not a picture: its seated planks are the sprints the
revision block lists beside it. This happens once a visit, and any key, click, tap or scroll ends
it at the settled pose. Under reduced motion it opens settled. Once settled it is still and draws
nothing. The title block, the revisions and every word never move. Below 1024 px, without WebGL, in
print, in forced colours, with Save-Data or with scripts off, the visitor gets today's sheet and
downloads no 3D.

## The calls I made

- **1024 px and up only.** That's the three-view sheet that `main.webp` and `loft.webp` draw, where
  registration is exact and weak GPUs are rare. Phones and tablets are sprint 26, with quality
  stepping and Iris's call on what the phone loft lands on. Below 1024 the page is today's, which is
  the Off state the canvas defines, not a broken one.
- **No control yet, and Full is the default.** The canvas makes Full the default
  (`Motion-Control.html`) and reduced motion Calm. The loft lasts under five seconds and any input
  skips it, so it needs no pause control (WCAG 2.2.2). The control comes in sprint 27, when it
  controls something at every width.
- **The DOM drawing never changes.** The model is a separate layer, `[data-model]`, over the drawing.
  `[data-plan]`'s markup stays byte-identical to the HTML response, so B1.4, C6, B2.5 and the print
  and forced-colours guards read the same drawing, unedited. What the profile looks like under the
  lifted model is the canvas's job (Needs decision, Iris 1).
- **Forced colours and Save-Data mean Off.** In forced colours the visitor asked for system colours,
  which the drawing honours and a lit canvas can't. With Save-Data they asked for fewer bytes, and
  the chunk is the page's largest download.
- **No GSAP in either option.** Both of the spike's stacks use the same custom tween (spike S1). The
  brief permits GSAP but doesn't require it, and 27 KiB for one ease isn't worth it.
- **A still-frame net, not quality stepping.** If the loft can't hold its frame rate it jumps to the
  settled pose. Stepping levels are sprint 26's, where phones need them.

## Data rules (the page and Probe's harness implement these word for word)

- **Where.** On `/` only, never on `/read`, `/sprints` or the 404. It runs when all of these hold at
  load:
  - scripts run;
  - the viewport is at least 1024 CSS px wide;
  - the renderer `[spike: S7, the stack the owner approves]` gets a context;
  - `forced-colors: active` doesn't match;
  - `navigator.connection?.saveData` isn't true;
  - the media isn't print.

  Otherwise it is **Off**: no 3D chunk is requested, no WebGL or WebGPU context is requested, and
  the page is main's.
- **When.**
  - The 3D chunk is a dynamic import, requested after the `load` event, on idle
    (`requestIdleCallback`, timeout `[spike: S6, ms]`).
  - The scene renders one hidden frame, then shows the canvas at frame 1.
  - Neither the canvas's appearance nor anything else in the 3D is a CSS animation or transition:
    B1.8 counts them.
- **`[data-model]`.**
  - One element in `main`, the next sibling of `[data-plan]`, `aria-hidden="true"`,
    `pointer-events: none`.
  - It is positioned over the wide plan's box (`.plan-wide`) and sized to that box, never to the
    viewport. It takes no layout space.
  - It holds one `<canvas>` at a pixel ratio of min(devicePixelRatio, 2).
  - It carries `data-state`, one of:
    - `landed`: frame 1 shown, not yet moving;
    - `lofting`;
    - `settled`;
    - `still`: the net fired.
  - Under Off it isn't rendered, or it is empty with no canvas.
  - It is `display: none` in print.
- **Frame 1: registration.**
  - An orthographic camera whose frustum maps the wide SVG's `viewBox` onto its CSS box.
  - The full hull (both halves of `lib/half-model.ts`'s geometry, mirrored), seen side-on.
  - Its outline lies on the profile's inked outline (`ln-outline` in `components/lines-plan.tsx`)
    within 1 CSS px at every width from 1024 to 1920 `[spike: S4, measured offset at 1440 and the
    method]`.
- **The loft.**
  - One camera move: from orthographic to a 30° perspective lens, holding the hull's framed height
    within 2% throughout (the dolly-zoom of research B3).
  - It ends at the settled pose `[spike: S5, the pose: yaw and deck tilt; the direction draws 30°
    toward the bow and the deck tipped 15° toward the viewer]`.
  - Duration `[spike: S5, the recommended duration between 1.2 and 2.4 s, with Iris's word on its
    feel]`, eased 1 − 2^(−10t).
  - The model's shadow lands on the half-breadth plan as one pre-blurred plane.
- **Once a visit.**
  - A flag in `sessionStorage`, read and written inside try/catch. If storage throws, the loft
    plays and nothing errors.
  - A reload, or Back from another route, in the same tab session opens at `settled`.
- **Skip.**
  - Any `keydown`, `pointerdown`, `wheel`, `touchstart` or `scroll`, and any resize, during
    `landed` or `lofting` sets `settled` on the next frame.
  - Listeners are passive, and none calls `preventDefault`: the key, the click and the scroll still
    do what they do.
- **Reduced motion.**
  - With `prefers-reduced-motion: reduce` at load, the model opens at `settled`, and no `lofting`
    frame is drawn.
  - A change to `reduce` during the loft settles it at once.
- **On demand.**
  - Frames are drawn only during `landed` → `settled`, on a resize, or on a scheme change.
  - Otherwise the scene draws 0 frames: at rest, with `[data-model]` off-screen, and with the tab
    hidden.
  - A resize below 1024 px removes the model (Off for the rest of the visit).
- **The net.** If the median frame of the loft's first `[spike: S6, n]` frames exceeds
  `[spike: S6, ms; the direction designs for 30 fps, so 33 ms]`, the model jumps to the settled
  pose and stops, with `data-state="still"`.
- **The planks are the record.**
  - The model's planks are `PLANKS` from `lib/lines-plan.ts`, seated by the same `seatPlanks` call
    the page makes. A plank is seated in the model exactly when its `[data-plank]` carries
    `data-sprint`.
  - One `BatchedMesh` holds every plank, with a per-plank state attribute that has the direction's
    five slots (ink and card, original card, graphite, copper, vellum). B3 uses only the first two:
    nothing is live (B4) and nothing is removed (B5).
- **Colours come from the tokens.**
  - Seated card is `--card`, original card `--card-old`, and seams and outline `--foreground`. They
    are read from the computed style at init and again when the colour scheme changes.
  - There are no colour literals in `app/` or `components/` (the invariant).
  - Nothing in the scene is `--accent`.
- **Teardown.** On `pagehide` the loop stops and the renderer and its geometry are disposed. A page
  restored from the back/forward cache shows `settled`.
- **Stack.** three.js `0.186.1` `[spike: S7, option A (WebGLRenderer) or B (three/webgpu), as the
  owner approves]`. No React Three Fiber, no GSAP.

## Checks

Each check is shown in a browser against the preview, or by `pnpm test:e2e` (Probe's specs).

**The harness.**
- Probe's harness wraps the context and counts draw calls and their triangles there. It refuses
  WebGL with an init script, as sprint 9's `e2e/webgl.ts` did (retired in sprint 22, in git at
  `7b4b48b^`). It drives the loft's time with Playwright's clock.
- No hook is added to product code beyond `[data-model]` and its `data-state`.
- Under option B, headless Chromium's WebGPU state decides which backend the harness measures
  `[spike: S1/S3, which backend CI's Chromium runs]`, and the report says which.
- SwiftShader draws every frame here: every GPU number is a floor, and the report says so.

I judge B3.1 to B3.3 first at the demo.

**B3.1 The first frame lands on the drawing.**
- At 1440 × 900 and 1024 × 768, in both schemes, compare the canvas's frame 1 (`data-state` is
  `landed`, held by the clock) with the same view with WebGL refused. The model's outline is within
  1 CSS px of the SVG's inked profile at every station `[spike: S4, the diff method]`.
- From before `[data-model]` exists to frame 1, these regions' pixels are identical:
  - `main > header`;
  - the revision block;
  - the bar;
  - the drawing outside the profile's box.
- Every text node's box is unchanged.
- The canvas's appearance fires no `animationstart` or `transitionrun`.
- Shown by: the diff image at both widths, beside `loft.webp` frames 0 and 1.

**B3.2 The loft holds the hull's size and ends at the settled pose.**
- With the clock at 0, 0.25, 0.5, 0.75 and 1 of the duration: the hull's framed height (its
  silhouette's bounding box in the canvas screenshot) stays within 2% of frame 1's, at 1440 and 1024.
- At 1, `data-state` is `settled`, and the frame matches the approved settled pose
  `[spike: S5, the reference frame]` within Iris's tolerance.
- The time from the first moving frame to `settled` is the duration, ± one frame.
- Throughout, the pixels of the title block, the revision block and the bar don't change.
- Shown by: the five frames at 1440, beside `loft.webp`.

**B3.3 Once a visit, and any input ends it.**
- A second load in the same context opens with `data-state="settled"`, with no `lofting` frame drawn
  (the harness counts draws between load and settle).
- During `lofting`, each of these sets `settled` within 2 frames:
  - a key press;
  - a click on the title block's text;
  - a wheel;
  - a touch (emulated);
  - a scroll.
- The input still does its own work:
  - Tab during the loft focuses the skip link;
  - the wheel scrolls the page;
  - a click on a bar link during the loft lands on its target.
- With `sessionStorage` throwing (init script), the loft plays, and no console error appears.
- Shown by: a recording of a key press at mid-loft.

**B3.4 Reduced motion opens settled.**
- Under `reducedMotion: "reduce"`, the first visible frame is `settled`, and no `landed` or
  `lofting` state is ever set (a MutationObserver records `data-state`).
- Switching the emulation to `reduce` during `lofting` sets `settled` within 2 frames (the sprint 22
  rider).

**B3.5 The Off paths download nothing.**
- In each case below, no script beyond the first load's is requested, no `getContext` for
  `webgl`, `webgl2` or `webgpu` is called, and no `[data-model] canvas` exists:
  - WebGL refused;
  - a 1023 px viewport;
  - forced colours;
  - Save-Data (an init script setting `navigator.connection.saveData`);
  - print media at load;
  - scripts off.
- In each, B1.4's 22 planks and the title block are as on main.
- Printing after the model settled:
  - `[data-model]` isn't displayed;
  - B1.8's print assertions (the drawing, the planks, every fact) hold;
  - the PDF shows no canvas.

**B3.6 It is cheap, and still at rest.**
- Over the loft and at rest, at 1440, in both schemes:
  - at most 8 draw calls per frame `[spike: S3, measured]`;
  - at most 30,000 triangles per frame `[spike: S2, measured at desktop quality]`;
  - the canvas's backing store is at most 2× its CSS size.
- After `settled`, for 3 s: 0 frames. Also 0 frames with the page scrolled so that `[data-model]` is
  off-screen, and 0 with the tab hidden (`visibilitychange` emulated), each over 3 s.
- The 3D chunk: the scripts requested after the dynamic import starts, as Vercel serves them.
  - Gzip and brotli each, computed with Node's zlib from the bodies by S1's method
    `[spike: S1, levels]`.
  - At most 250 KB gzip, or the owner's restated budget (Needs owner decision, 2)
    `[spike: S1, measured, A and B]`.
- Its first request starts after `loadEventEnd`.
- Frame time at 4× CPU: the loft's median and 95th percentile and the resting cost are reported, not
  gated (SwiftShader) `[spike: S6, the baseline]`.
- This carries sprint 22's dropped rider, C14's draw count under load.

**B3.7 The model shows the record, in the card colours, and nothing copper.**
- At frame 1, which is registered so each plank lies on its `[data-plank]` box, sample the canvas
  at each plank box's centre. In both schemes, every seated plank reads lighter than every original
  plank by at least `[spike: S4 frames, measured; Iris sets the floor]` in relative luminance.
- At frame 1 and at `settled`, in both schemes, no canvas pixel is within ΔE 10 of `--accent`.
- With the scheme switched while settled, one frame redraws in the other scheme's card colours, and
  the scene then stops again.

**B3.8 It cleans up, and the page around it holds.**
- C9 stays unedited: axe is clean, nothing in the drawing is hit, and there's no console error, now
  with the model loading. Nothing in `[data-model]` is hit by `elementFromPoint` either.
- Following Read as page from a settled `/`, then going Back:
  - `/read` creates no context and draws no frame;
  - `/` opens at `settled`;
  - only one context is alive.
- Resizing from 1440 to 1100 after settling:
  - the model re-fits the drawing's box;
  - nothing overflows at any width from 1024 to 1920;
  - CLS stays 0.
- Resizing to 1000 removes the canvas with CLS 0.

**B3.9 The first paint is untouched.**
- B1.9 (LCP is text in the title block, ≤ 2,500 ms at 4× CPU) and B1.8's CLS 0 over load plus 2 s
  run unedited, now with the model loading.
- INP for a key press during the loft at 4× CPU is reported against the 200 ms budget, not gated
  (SwiftShader) `[spike: S6, the init's longest task]`.

**B3.10 The harness checks itself first.**
- Pushed alone, before the build:
  - the context wrapper counts a known two-draw scene correctly;
  - the WebGL refusal makes `getContext` return null;
  - the clock moves a test page's `requestAnimationFrame` time.
- CI's Chromium version is compared with the cloud's, and both are reported (`.crew/STATE.md`).

## Budgets that apply to sprint 25

| Measure | Sprint 25 budget | Ground |
|---|---|---|
| LCP | ≤ 2,500 ms at 4× CPU, text in `main > header` (1.5 s reported) | B1.9, unedited |
| CLS | 0 over load + 2 s, and on resize across 1024 | B1.8; B3.8 |
| INP | ≤ 200 ms, reported (SwiftShader inflates it) | direction |
| First-load script on `/` | with WebGL refused, within 2,048 B of `/sprints'` `[spike: the loader island's bytes; above 2,048 B the number goes to the owner]` | B2.10, rewritten |
| 3D chunk | ≤ 250 KB gzip after first paint `[spike: S1: A ≈ …, B ≈ …]`, or the owner's restated budget | direction; research D |
| Draws | ≤ 8 per frame `[spike: S3]` | direction |
| Triangles | ≤ 30,000 at 1024 and up `[spike: S2]` | direction |
| DPR | ≤ 2 | direction |
| Frame time | the still-frame net at `[spike: S6]`; loft median and p95 at 4× CPU reported | direction; spike S6 |
| Rendering | 0 frames at rest, off-screen and with the tab hidden | direction |
| Loft | once a visit, `[spike: S5]` s, skippable by any input; reduced motion opens settled | direction; research B3 |
| Fonts | unchanged: two woff2, ≤ 86,016 B; the model draws no text | B1.10, unedited |
| Phones (≤ 12k triangles, DPR 1.5, 30 fps) | not sprint 25 (sprint 26) | — |

## Riders

| Rider | Disposition |
|---|---|
| The 3D's teardown, and a reduced-motion change mid-visit (sprint 22's dropped riders) | **Ride,** as B3.8 and B3.4 |
| C14's draw count under load (sprint 22) | **Rides,** as B3.6 |
| Iris's one-line revision descriptions (`.crew/sprint/24/decisions.md`, 3) | **Rides if Atlas takes it.** This PR waits for the owner anyway. It is one CSS rule, and B1.5's "truncated cells" assertion is rewritten: one line from 1024 px, with the full goal in the DOM and on phones. It is batch E below |
| The roadmap's font and facts riders | **Don't ride:** this sprint touches neither |

## Check disposition

There are 106 tests in `e2e/*.spec.ts`, counted by `test(`, with a per-scheme or per-route template
counted once. **104 keep, 2 rewrite, 0 retire**, plus B1.5 if batch E rides. Full is now the default
on `/` at 1024 and up, so every spec that opens `/` at that width loads the model. Each one below
was read against that.

| File | Test | Disposition | Reason |
|---|---|---|---|
| plan.spec.ts | B1.8 it needs no script and nothing moves | **rewrite** | Its pixel comparisons of `[data-plan]` at scroll 120, 400 and bottom-and-back take the 2D sheet with WebGL refused, since the canvas overlays the drawing's box and a scroll skips the loft. Every other assertion (CLS, no-script equality, markup, no animations or transition events, print, forced colours) runs as today, with the model loading. The model's own stillness is B3.6 |
| plan.spec.ts | B1.4, B1.9, C6, C9, B2.5 | keep | `[data-plan]` is unchanged and `[data-model]` is its sibling. The canvas isn't an LCP candidate, is never hit, and must log no console error |
| read.spec.ts | B2.10 script bytes on `/`, `/read` and the 404 | **rewrite** | `/` is measured with WebGL refused, so the idle import isn't counted. The chunk has its own budget in B3.6. Same 2,048 B, unless the loader doesn't fit (Needs owner decision, 3). `/read` and the 404 are unchanged |
| read.spec.ts | B2.4, B2.6, B2.7, B2.11 | keep | `/read` has no model |
| sheet.spec.ts | B1.1, B1.2, B2.3 (both), B1.5 (both), B1.6, B1.7, B1.10, B1.11, B2.9 riders | keep | No layout space, no new control and no font. B1.6 reads CSS, and B3.7 checks the canvas for copper. B1.5 becomes a rewrite only with batch E |
| invariants.spec.ts | all 14 | keep | The canvas is aria-hidden and sized to its container. The scene's colours come from tokens, so the literal scan holds |
| keyboard.spec.ts | all 7 | keep | No new Tab stop: the canvas isn't focusable. Contact's first link stays the 12th stop |
| facts, cards, profile-sections, content, smoke, not-found, sprints-entry, sprints | all | keep | Untouched routes and sections |

**For the owner to approve:** nothing retires. Batch E (B1.5's one-line descriptions) only if it
rides. B2.10's number only if the loader exceeds 2,048 B.

## Out of scope

- **Sprint 26:** below 1024 px (phones and tablets), the 12k triangle level, DPR 1.5, quality
  stepping up and down, `touch-action: pan-y`, and what the phone loft lands on.
- **Sprint 27:** the Full/Calm/Off control and its storage, Calm's events-only rendering, and the
  B2.3 and Tab-bound rewrites.
- **B4 and B5:** the graphite, copper and vellum states, labels on the model, crew events, and the
  ghost hull.
- **Also out:**
  - the ambient light;
  - a static AVIF for Off;
  - the model on `/read`;
  - View Transitions;
  - React Three Fiber;
  - GSAP;
  - any change to `content/` or to the DOM drawing.

## Needs owner decision

1. **The stack, A or B** `[spike: S7's paragraph, verbatim]`. This PR builds on the provisional
   pick and waits for the call, with the loft running on the preview. If the owner picks the other,
   it is ported here before the merge.
   - A is WebGL: about `[spike]` KiB gzip, and the widest reach. It departs from `design/brief.md`'s
     Technology section, whose edit is proposed in the retro.
   - B is WebGPU with the WebGL 2 fallback: about `[spike]` KiB brotli, with the manual's
     "experimental" caveat.
2. **If B:** the 3D chunk budget is restated as 250 KB brotli on the wire, since Vercel serves brotli
   to browsers that accept it.
3. **Only if needed:** a first-load script budget above 2,048 B on `/` for the loader
   `[spike: bytes]`.
4. **Batch E, if it rides:** B1.5's descriptions become one line from 1024 px, with an ellipsis, the
   full goal in the DOM, on phones and in the Log.

## Needs decision (Iris)

1. **What the profile shows under the lifted model.** `loft.webp`'s frames 2 to 5 draw it unfilled
   and unnumbered behind the model, while the DOM drawing keeps its fills and numbers. Either the
   canvas paints that state over the profile's box, or the filled profile stays visible behind the
   model. The DOM drawing doesn't change either way.
2. **The settled pose and its framing at 1024,** where the drawing is narrower than `loft.webp`.
   Also the shadow plane's darkness in both schemes.
3. **The loft's duration** after S5's frames: 2.4 s as approved, or the 1.2 to 1.8 s the research
   proposes. A change from 2.4 s is shown to the owner on this preview.
4. **The floor for B3.7's seated-versus-original contrast,** and the dark scheme's card colours on
   the model (`night-1440.webp`).
5. **How the settled model appears under reduced motion.** The canvas says "Open at frame 5. No
   movement at all", so it is either a cut or a short opacity fade (research A7: fades instead of
   movement). A fade runs only under `reduce`, so B1.8, which emulates `no-preference`, doesn't
   count it.
