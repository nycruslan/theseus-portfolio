# Sprint 9 contract: the hero's Part B (the WebGL upgrade)

Size: a contract sprint, no product code. The owner accepts it by merging this PR (`needs-owner`). The
build is the next sprint's. This replaces C10 to C16 of `.crew/sprint/7/contract.md` and amends its
C2. C1 to C9 of that contract stand as merged, apart from C2's box height (below). Every number here
stands on `.crew/sprint/9/spike-probe.md` (cited as "spike §n"); where one doesn't, it says so.

## Outcome

On a device that can take it, with motion allowed, the hero SVG is replaced after the page has loaded by
a WebGL canvas of the same seven-plank hull, which turns from +0.24 to -0.24 as the visitor scrolls past
and does nothing else. Everyone else, and anyone whose device struggles after the swap, keeps the SVG,
and the box around both is trimmed from 172 to 138 px so that the turn fits in it with 4 px to spare.

## Who does what

- **Probe** writes `e2e/hero-3d.spec.ts` (C10 to C15 and C17, one test per check, named by number) and
  the `e2e/hero.spec.ts` edits below, first, before Pixel starts. No `test.skip`, `fixme` or `fail`.
- **Pixel** builds: the gate, the chunk, the box's new height and the `@container` breakpoint. Hand-written
  WebGL, no dependency expected (the spike's renderer is 2.7 KB gzip).
- **Iris** advises on the box (decision below) and on canvas against SVG. **Lens** reviews in CI. Quill and
  Atlas write no product code.

## Out of scope

Carried from sprint 7: any idle loop, sway, spin, pointer or tilt response, load-in animation, glow,
specular, environment map, bloom, fog, shadow or texture; a full ship, a globe, or the hull above the name
or behind text; a plank that animates its own replacement, and any count or order that says which plank is
copper; new color or type tokens; changes to `content/`; the left-edge bolder variant. Added here: an
`OffscreenCanvas` or worker renderer (the init script does not cover it, spike §1), retina rendering beyond
`min(devicePixelRatio, 2)`, and reacting to a change of reduced motion after load.

## The harness and the gate (shared by the checks)

**Harness** (Probe, spike §1). One init script records every `getContext` request's type and attributes
and counts `drawArrays`/`drawElements` (and the instanced forms) on both context classes; another strips
`failIfMajorPerformanceCaveat: true` where a test needs a context (the browser refuses it: software
renderer). Add the null-returning or stripping script first and the recorder last, or the recorder misses
requests. Refusing means `null` for `webgl`, `webgl2` and `experimental-webgl` alike. Pixels are read from
`page.screenshot` only: `readPixels` and `toDataURL` return blank outside the frame that drew. Tests run at
devicePixelRatio 1. Counts are asserted as "changed" or "did not change", never as a number.

**The chunk** is found by comparison. In the control run (1440 x 900, `hardwareConcurrency` and
`deviceMemory` 8, motion allowed, context granted), exactly one JS response first requested after `load`
contains `createShader` (case-sensitive); its URL is the one no refusal run may request. The name changes
every build (spike §4).

**The gate** (what Pixel builds, so tests and product agree). The chunk is requested only when all hold:
no reduced motion; `navigator.connection.saveData` is not true; `hardwareConcurrency` and `deviceMemory`
are each undefined or at least 4 (undefined passes, since the other gates catch a weak machine; tests
cover 2 and 8 only); a throwaway canvas gives a context for `failIfMajorPerformanceCaveat: true`; the
box is within one viewport height of the viewport (`IntersectionObserver`, `rootMargin = innerHeight`);
the `load` event has fired, in idle time. The first-load code holds this gate and no shader code.

**A slow frame** is a frame whose `requestAnimationFrame` timestamp is more than 50 ms after the previous
one's, counted only between back-to-back frames of a running loop (a loop that stopped at rest and resumes
on a scroll has no gap to count). Three slow frames in a row stop all drawing for the life of the page; the
canvas stays, frozen at its last pose. That is the reference's rule (spike §5), now the contract's.

## Checks

Viewport 1440 x 900 and motion allowed unless said otherwise.

**C10. The upgrade.** Control run.
1. Requested after load: the chunk's resource `startTime` is at or after `loadEventEnd` and at most
   `loadEventEnd + 5000` ms. A `canvas` is in `[data-hero]` within 5 s of that request. (Measured: +35 to
   +66 ms, canvas 40 to 170 ms later; at 4x CPU +184 to +225 ms. The 5 s is deliberately loose.) Also
   run once at 4x CPU.
2. The box does not move: its rect before and after the swap is the same (within 0.5), and CLS over load
   plus 3 s is 0 (spike §3: identical rects, 0).
3. The canvas is `aria-hidden`; C1's role clauses still hold with it up: no text node, nothing focusable,
   no `tabindex`, `pointer-events: none` on every descendant.
4. The only animation in the box over the swap is one `CSSTransition` on `opacity` of at most 200 ms.
   Sampled every 20 ms with `getAnimations({ subtree: true })` from an init script, because it lives about
   200 ms and starts a frame after insertion.
5. Proximity (resolves Lens's finding: at 320 x 640 the box is 0.04 viewport heights below the fold, so
   that test passed at load). At 1440 x 900 an init script adds, on `DOMContentLoaded`,
   `<style>main > header { margin-bottom: 200vh }</style>` to `<head>` (injecting at document start fails:
   `head` is null). First assert the premise: box top (document y) minus `innerHeight` is more than
   `innerHeight` (measured 2325 against 900). Then: 3 s after load, no canvas and no chunk request; scrolled
   so the box top sits 2.2 viewport heights below the viewport top, still neither after 1.5 s; scrolled to
   1.8, the chunk is requested and the canvas is present within 5 s (spike §5).

**C11. The pose.** Canvas up. `data-hero-shear` on the box holds the current shear to 3 decimals and is
removed when the canvas goes.
1. At scroll `f x` (the box's bottom edge, document y), for f = 0, 0.25, 0.5, 0.75, 1 the value is 0.240,
   0.120, 0.000, -0.120, -0.240, each within 0.005 (the reference hit all five; Sprint 7's looser 0.02 and
   0.01 go). Scrolled to 3000 px it is still -0.240 within 0.005: the turn never passes the envelope the
   box is sized to. (A requirement; the clamp was not measured.)
2. Read the silhouette from `page.screenshot({ fullPage: true, clip })` in document coordinates (at -0.24
   the box is above the viewport). Lit means more than 8 per channel from `--background`. The left and
   right lit extents at +0.24, 0 and -0.24 are the same within 1 px (measured identical: x 32 to 655 of the
   688 box).
3. Nothing is clipped, and the box is the envelope plus 4 px (see C2): at -0.24 the top lit row is 2 to 7
   px below the box's top row, at 320, 390, 600, 768 and 1440 (derived: air is `4 + 0.3 s` px, s the scale
   of C2, so 4.3 at most; 2 to 7 allows antialiasing and the unmeasured narrow widths); at every shear the
   keel's lit row is at least 2 px above the bottom row; at +0.24 the top and bottom air differ by at most
   1.5 px (centred).
4. The box's page position does not change with the canvas up (within 0.5).

**C12. Nothing moves at rest.** From 1 s after the swap, with no scroll for 2 s, the draw count is
unchanged. After one `mouse.wheel` it has changed (reference: 2 to 2, then 4), so the zero is not a dead
canvas.

**C13. The same object.** Compare the canvas at scroll 0 with the SVG's `javaScriptEnabled: false`
screenshot, same scheme; read the rect by `page.evaluate` (with scripts off `boundingBox()` hangs). Light
and dark, at 1440 and 390.
1. The two lit masks' bounding boxes agree within 1 px at every edge (measured: 1 px at 768 and 1440; at
   320 and 390 one edge was 1 px off, once 2 px).
2. Pixels lit in one mask with no lit pixel of the other within a Chebyshev radius of 1 are at most 0.1% of
   the box (measured at most 4 px, 0.008%, 0 for silhouettes). **Replaces** "differ by at most 1 px over 99.5%
   of the box", which a hairline stroke against a shader seam cannot meet (raw mismatch 1.6% to 2.7%).
3. Mean absolute channel difference over pixels lit in both is at most 8 (measured 1.9 to 5.5). The
   copper plank's interior (its rect inset 2 px) has a median colour within 6 per channel of the SVG's
   (not measured separately).
4. No non-copper pixel outside the copper plank's rect plus 2 px is above 3.05 : 1 against `--background`
   (unchanged from sprint 7; not measured separately).

The spike drew no butt joints; they are a reason 2 may be tight, not one to widen it (see Risks).

**C14. It falls back.** Each leaves the SVG visible, no canvas, and no request for the chunk's URL:
reduced motion (scroll 0 to 3000 px, then 3 s); Save-Data (set `navigator.connection` by
`Object.defineProperty`, the request header does nothing); `deviceMemory` 2; `hardwareConcurrency` 2;
`getContext` returning null; the caveat flag refused with the strip switched off, where the recorder shows
one request with `failIfMajorPerformanceCaveat: true` and no other context request (this proves the flag
is passed). Control: with the same setup but granted, the chunk is requested exactly once (so no refusal
passes empty). Then, in the control run:
1. **Slow frames** (resolves Lens's finding). An init script wraps `requestAnimationFrame` so the timestamp
   it hands back advances 60 ms a frame once `window.__slow` is set. With the clock normal and a
   `mouse.wheel` every 25 ms, the draw count grows by at least 10 in 0.5 s (measured +24). With the slow
   clock switched on and the wheel still going, the count rises by at most 8 and is then flat across
   four samples 400 ms apart over 1.6 s, while `scrollY` keeps moving and the canvas is still in the DOM
   (measured: 26, 31, 31, 31, 31).
2. **Context loss.** `canvas.getContext("webgl").getExtension("WEBGL_lose_context").loseContext()` (a real
   loss, not a dispatched event) removes the canvas within 1 s (measured under 400 ms); the SVG is
   visible, the box rect is the same (within 0.5), `data-hero-shear` is gone.

**C15. Weight.** Probe asserts from response bodies, `gzipSync` of `await response.body()` for
`resourceType() === 'script'`, split by whether it arrived before `load`. Lens reads nothing.
1. All JS first requested after `load` in the control run totals at most 15,360 B (reference: 2,711 B,
   the chunk alone), so a library split into a second file still counts. Exactly one of them contains
   `createShader`, and no script fetched before `load` does.
2. First-load `/` minus first-load `/_not-found`, in the same build and run, is at most 2,048 B (reference:
   784 B). `/_not-found` carries the framework and none of the hero, so the delta is the hero's own cost
   and nothing stored goes stale when Next or React moves. Sum what the browser fetched, not the HTML's
   `<script>` references (the `noModule` polyfill is named and never fetched: 175,517 B named against
   135,890 B fetched).
3. **C6 (Part A)** stands as merged, and the hero's `outerHTML` is at most 8192 B (6,487 today, 6,510
   with the reference's hidden gate element). Its sprint-7 tail, "first-load JS equals `origin/main`",
   is dropped as an assertion: C15.2 replaces it. Pixel may quote `.next/diagnostics/route-bundle-stats.json`
   (raw bytes, absent against a deployed URL), but no spec reads it.

**C16. Gate (process, not a spec).** C1 to C9 pass; `pnpm verify` (knip catches an unused dependency) and
`gate.yml` decide the rest. No dependency is expected; if one is added it is in `dependencies`, used, and
inside C15's total. `package.json`'s `scripts`, owner paths and `content/` are untouched.

**C17. The harness holds** (new; no product code needed, so it is the build sprint's first CI readout).
On a blank page: without the strip, `getContext("webgl", { failIfMajorPerformanceCaveat: true })` is null;
with it, the context is granted, the recorder still reports `true`, a 1-draw program is counted, and a
screenshot shows the drawn colour. Spike §1 and §3.

## C2 trim (Iris, sprint 8 item 3)

The Part A hull is 118 px tall in a 172 px box (27 px of air above and below). The turn's envelope is
123.7 px: at shear -0.24 the gunwale lifts 5.7 px above the rest top at x = 460 (-0.12: 0.5; 0: none); the
keel is at 118 at every shear; the horizontal extent doesn't change (spike §6).

| | box at 768 and up | air at rest, above / below | air at -0.24, above | below 768 (s = hull width / 624) |
|---|---|---|---|---|
| today | 172 | 27 / 27 | 21 | `min(cw / 2.9, 172)` |
| **A. centred rest (recommended)** | **138** | 10 / 10 | 4.3 | `8 + 130 s` px: 83 at 320, 99 at 390, 121 at 600, 138 at 767 |
| B. tight, hull low | 132 | 9.7 / 4.3 | 4 | `8 + 123.7 s`, hull offset `5.7 s + 4` from the top |

**Needs decision (Iris): A or B.** I recommend A. The rest pose is what almost every first paint shows (the
SVG, phones, reduced motion, scripts off), and in B the object sits visibly low in its own box; A spends
6 px for an even rest. B also needs the SVG shifted off centre, extra CSS for no gain. If Iris says B in
her review of this PR, the table's B row replaces A in C2 and C11.3 and nothing else changes. Without an
answer, A.

**Decided (Iris, `direction-iris.md`): A**, 138 px with the hull centred at rest; the `8 + 130 s` formula
below 768 stands.

The breakpoint is `@container (width >= 48rem)` on the page wrapper (`app/page.tsx`'s `@container`), as
Lens suggested, so a classic scrollbar can't step the hull's length. Width rules are unchanged: 688 px
from the breakpoint, full-bleed below; the 64 px gaps above and below stay. CI's headless browser has
overlay scrollbars, so the classic-scrollbar case can't be tested there; no spec claims it.

**Edits to `e2e/hero.spec.ts` (Probe), each a tightening:**
1. `expectedBox` returns height 138 from 768 and `8 + 130 * expectedHullWidth(cw) / 624` below it; the
   C2 title reads "688 x 138". Tolerance stays 1. C8 reads the same function, so it follows.
2. C2's "never taller than 172.5" (at 360, 480, 500, 700, 1920) becomes 138.5.
3. C2 gains: the hull's rect is centred in the box, top air and bottom air within 1.5 px, at the seven
   `FOOTPRINT_WIDTHS`.
4. An init script on every context the spec opens (`context.addInitScript` in a `beforeEach`, and on each
   `browser.newContext` in C4, C5 and C8) makes `getContext` return null for the WebGL types, so Part A's
   checks keep testing the SVG on a developer's machine with a GPU (in CI the caveat flag already refuses). It adds a
   precondition and removes nothing.
5. C3 (the hull's x geometry), C1 and C5 to C9 are unedited. C4's "same rect with and without scripts"
   follows the new box by itself.

## Risks

- **The spike ran on Chromium 141; CI installs 156** (Playwright 1.64, revision 1248). Everything in the
  checks was measured on 141 (same headless shell, SwiftShader and ANGLE path). The build sprint's first
  step is Probe's push of the specs alone, with C17; its first CI run is the readout.
  - C17 red because the browser draws nothing (screenshot blank, or the strip fails to give a context):
    stop. Atlas reports to the owner and Part B goes to the owner as is, as the brief provides.
  - C17 green, and a failing spec where the product is not yet built: expected, and the readout for the
    measured specs (C13.1 to 13.3, C14.1, C10.1) comes after Pixel's first push.
  - A threshold off by rasterisation noise on 156 (a 1 px edge, a few more fringe pixels): Probe reports
    the CI-measured value in the failure message and the number is amended in this file's note, within the
    same order (not past 2 px, 0.5%, or a mean of 12). Anything beyond that, or a premise that fails
    (timing, the draw counter, the slow clock), is a contract change that goes to the owner under "Needs
    owner decision" in the build PR. It is never widened quietly.
  - Builders can only run 141 locally, so expect one CI-only round; the sprint allows two.
- **The butt joints (vertical seams) are not in the spike**, nor retina, nor a GPU-backed context, nor
  Safari or Firefox, nor a real phone. C13.2's 0.1% of the 138 px box (about 95 px at 1440, 39 px at 390, against a measured worst case of 4 px) leaves room for the butts; if
  they overshoot it, Pixel moves them, Probe doesn't widen the check. The rest are not gated: Pixel reports
  what it tried, Iris reviews the look.
- **A module shared between the gate and the chunk** lands in a first-load chunk (spike §4). C15.1 (no
  `createShader` before `load`) and C15.2 catch it.

## Lens's three open findings, resolved

C10 proximity: C10.5 (spacer, premise asserted first). C14 slow frame: the definition above, growth shown
first, continuous scrolling after the switch, C14.1. C15 and C6: Probe asserts both from response bodies
in the spec, Lens reads no numbers.

## Needs owner decision

#28 settled the symbol, the A/B split and the 15 KB budget; none is re-asked. By merging this PR the owner
accepts:
1. **The hero box shrinks from 172 to 138 px** (Iris's A, unless she says B), so the first Experience
   summary moves up 34 px on a desktop. This amends the Part A contract the owner already merged.
2. **The fallback rules in the gate**: under 4 cores or 4 GB, Save-Data, reduced motion, no cheap GPU
   context, and three slow frames in a row, after which the hull freezes at whatever pose it had instead of
   returning to the SVG's rest pose (a swap back would jump).
3. **The spike's finding as the budget's reality:** the chunk is about 3 KB gzip and the page's first load
   grows about 0.8 KB, against 15 KB and 2 KB allowed. The caps stay; they are not targets.
4. **The stop rule:** if the CI browser draws nothing, the build does not go ahead and Part B comes back to
   the owner.
