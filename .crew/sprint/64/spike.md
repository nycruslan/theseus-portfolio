# Sprint 64 spike (Pixel): live reflow, the first touch, and the frame's scripts

Taken on 10 Nov in this cloud's 4-vCPU box, which renders in software. Each run is a production
build served by `next start`. The scripts are in Pixel's scratchpad (`spike-resize.mjs`,
`bytes.mjs`, `loaf.mjs`, `trace.mjs`, `layout-cost.mjs`, `cv-test.mjs`). The box was shared with
the other roles' builds and suites, at a load average of 14 to 19 for the later runs, so the 4x
numbers are an upper end. Only a real GPU and phone can say how it feels.

## 1. Resizing and measuring the frame every animation frame

The spike sized the sandboxed frame on every `requestAnimationFrame`, sweeping from 1440 × 900 to
320 × 460 and back in 90 frames. Each frame it read the contact links' foot by Ta's rule through
`contentDocument`. That's a Range's client rects in `main > header`, which forces the frame's
layout.

| Engine, viewport | CPU | JS a frame (median / p95 / max) | Frame (median / p95 / max) | Document = window |
|---|---|---|---|---|
| Chromium 156, 1440 × 900 | 1x | 13.6 / 22.7 / 25.8 ms | 16.7 / 33.3 / 33.4 ms | 90 of 90 |
| Chromium 156, 1440 × 900 | 4x | 62.9 / 90.0 / 102.5 ms | 83.3 / 100.0 / 116.7 ms | 90 of 90 |
| Chromium 156, 390 × 844 | 1x | 13.5 / 17.4 / 22.3 ms | 16.7 / 16.8 / 33.4 ms | 90 of 90 |
| Chromium 156, 390 × 844 | 4x | 63.1 / 88.3 / 124.1 ms | 83.3 / 100.1 / 166.7 ms | 90 of 90 |
| Playwright WebKit 2370, 1440 × 900 | 1x | 20 / 25 / 31 ms | 38 / 56 / 146 ms | 90 of 90 |
| Playwright WebKit 2370, 390 × 844 | 1x | 18 / 23 / 29 ms | 31 / 41 / 107 ms | 90 of 90 |

- **WebKit runs here** once `playwright install webkit` and `install-deps webkit` are done (CI has
  Chromium only). It resizes and measures the scriptless same-origin frame live, and its document
  is the window every frame. Its measure differs from Chromium's by tenths: 66.6 against 66.3 px
  at 1415 × 890. That is call 2's point, that the number in motion is the visitor's browser. CDP's
  CPU throttling is Chromium's, so WebKit has no 4x row.
- **The cost is `/`'s own relayout.** In a trace of the drag at 4x, the framed document's layout
  took 50 ms on average and 86 at most (582 layout objects, all dirty on a width change). Its style
  recalc took 18 on average and 41 at most. The trials page's own layout and paint came to under
  20 ms a frame. Hiding `/`'s facts (`main > .facts`, below the fold in every window the frame
  draws) halved the relayout, 76 to 35 ms. `content-visibility: auto` on them, though, gained
  nothing measurable, and the freeboard stayed equal at all 220 windows tried, so the frame's page
  is unchanged.
- **So the live reflow stays (the contract's plan, not the fallback).** At 1x it holds 60 fps at
  both widths. At 4x it runs at about 10 to 12 fps, and `pointermove` is rAF-aligned, so moves
  never queue behind it.

## 2. INP of the drag at 4x

This is T14's drag (40 mouse steps from the corner toward the frame's top left, at 1440 × 900),
measured on the built controller at 4x and a load of 15.

- **Event Timing:** the longest pointer entry was `pointerdown` at 56 ms (1 ms delay, 11 ms
  processing). Next came `pointerup`, `lostpointercapture` and `click` at 48 ms. Chromium gives
  `pointermove` no entry. So the drag's INP is 56 ms, well inside 200.
- **The settle never runs in pointerup's handler.** The release paints first (a rAF, then a task),
  and only then lays the frame out at the settled window. A key settles at once, as T12 asks:
  about one relayout, 60 to 100 ms at 4x.
- **Long animation frames,** which Probe's T14 also gates at 200 ms: 31 frames over 50 ms, median
  95 ms, longest 268 ms. Each frame's script is the resize-and-measure callback, almost all forced
  layout. At this box's load, a few frames go over 200 ms, and that clause can fail here while
  INP holds. On a quiet run (section 1) the longest 4x frame was 167 ms.

## 3. The first touch for at most 1,024 B

What worked under Next 16.4 and Turbopack is a client component that renders nothing
(`components/trials-corner.tsx`, `"use no memo"` so the React Compiler adds no cache). On mount it
listens on `main` for the first `pointerdown` or `focusin` on the corner or a size input, then
`import()`s `lib/trials-live.ts`. Turbopack splits that into its own async chunk, fetched only
then. A pointer on the corner is captured in that first handler, so the drag holds while the
chunk loads, and the controller takes it over with the same event. The server hands the listener
what the controller can't import: the name, the links, each rule's link and Copy link's words, in
the RSC payload, not script. Copy link lives in the listener, so its clipboard write runs inside
the click, as Safari requires.

Gzip -9 bodies the page's own frame fetches, against the 404's (B2.10's method), at 1440 × 900:

| | Decoded | Gzip |
|---|---|---|
| Ta at load, and after a touch | 0 B | 0 B |
| Tb at load (the listener's chunk) | 1,288 B | 713 B |
| Tb after the first touch (the controller's chunk) | +19,128 B | +7,359 B |
| Tb in all | 20,416 B | 8,072 B |

- Probe's T10 on the tree integrated with Forge's card (sprint/64-drag-it at 20fe541): 712 B
  beyond the 404's at load, and 8,083 B in all after a pointerdown on the corner or a focus on
  Width.
- No `requestAnimationFrame` call from load to the first touch, or from 1 s after a settle.
- In the controller's chunk, the sweep's columns are about 1,230 B gzip, the record's sentences
  about 490, the answers' words about 230, and the specs' names and titles (server-only, but in
  `lib/trials.ts`'s table) about 160. Call 3 puts the sweep and the record on the client, so
  that is most of it. Turbopack drops unused exports, so the server's messages and words stay
  out.
- **For Tc:** 8,072 of 8,192 B leaves Tc's chart about 120 B. The lever is the route's budget or
  `lib/trials.ts`'s server-only fields. The controller's own code is about 2.5 KB of it.

## 4. The frame's 465 KB of `/`'s scripts

In Chromium the frame fetches `/`'s 8 script files, 464,751 B decoded. The sandbox stops them
running, not fetching: the preload scanner requests every `<script async src>`. Playwright's
WebKit fetched none at 1440 × 900.

The frame can't stop fetching them in this sprint while T2 and T9 hold:

- A `script-src 'none'` policy, by header, `<meta>` or the frame's `csp` attribute (Chromium only),
  blocks the fetches but logs a refusal for each, and T9 asks for none. A header also changes the
  frame's CSP, which T9 keeps as the site's.
- A route that renders `/` and strips the scripts would be a second render path for `/`, which is
  out of Tb's scope.

It stays a follow-up, as the contract allows: name it in the PR. A visitor who arrives from `/`
already has those files cached.
