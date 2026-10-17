# Sprint 9, step 1: Probe's WebGL spike

**The browser draws WebGL, in software. Part B is possible.** A hand-written WebGL program draws the
seven-plank sheared hull in headless Chromium, readable in screenshots, with no pixel differing between
two runs, and its silhouette matches the Part A SVG to within 1 px. Nothing here needed a library: the
whole renderer is 2.7 KB gzip. `failIfMajorPerformanceCaveat: true` is refused (software renderer),
exactly as sprint 7 assumed, so every check needs the init script below.

**What I could not verify: the CI browser itself.** This sandbox's "chromium_headless_shell-1248" is a
symlink to build 1194, Chromium **141.0.7390.37**. `@playwright/test` 1.64.0 pins revision 1248, Chromium
**156.0.8078.4** (`node_modules/.pnpm/playwright-core@1.64.0/.../browsers.json`), which is what CI's
`playwright install --only-shell chromium` fetches. Everything below ran on 141 (same engine family, same
headless shell, same SwiftShader/ANGLE path, but not the same build). The first CI run of Part B's
specs is the real test. That is a setup problem for the retro, not memory. It is why C13 below uses a
1 px tolerance and no exact pixel values.

All numbers are from `next build` + `next start` of this branch (port 3351, the Part A site) and of a
scratch copy with a reference Part B (port 3352). Both servers were stopped with `kill`.

## 1. Context creation, renderer, init script

Script: `/tmp/claude-0/-home-user-theseus-portfolio/27188b3c-46c9-5256-999f-d684a5369382/scratchpad/spike/q1.cjs` and `q1b.cjs`.

| request | result |
|---|---|
| `getContext('webgl')`, `'webgl2'`, `'experimental-webgl'` | all succeed (WebGL 1.0 / 2.0 ES) |
| same with `failIfMajorPerformanceCaveat: true` | **`null`**, all three |
| `UNMASKED_RENDERER_WEBGL` | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` |
| vendor | `Google Inc. (Google)` |

The init script works: it records every requested `(type, attrs)`, rewrites
`failIfMajorPerformanceCaveat: true` to `false` before the real call, and the page then gets a context
whose `getContextAttributes().failIfMajorPerformanceCaveat` is `false`. The recorded request still says
`true`, which is what C14 needs to prove "the flag is passed". `readPixels` on a cleared/drawn canvas
returned the drawn colour (0,255,0,255).

```js
// addInitScript: record attributes, strip the caveat flag, count draws (copy of spike/init.js)
(() => {
  const w = window;
  w.__ctxReqs = []; w.__draws = { arrays: 0, elements: 0, total: 0 };
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (/webgl/.test(type)) {
      w.__ctxReqs.push({ type, attrs: attrs ? JSON.parse(JSON.stringify(attrs)) : null });
      if (w.__stripCaveat !== false && attrs && attrs.failIfMajorPerformanceCaveat)
        attrs = { ...attrs, failIfMajorPerformanceCaveat: false };
    }
    return origGet.call(this, type, attrs);
  };
  for (const Ctx of [w.WebGLRenderingContext, w.WebGL2RenderingContext]) {
    if (!Ctx) continue;
    for (const [fn, key] of [['drawArrays','arrays'],['drawElements','elements'],
                             ['drawArraysInstanced','arrays'],['drawElementsInstanced','elements']]) {
      const o = Ctx.prototype[fn]; if (!o) continue;
      Ctx.prototype[fn] = function (...a) { w.__draws[key]++; w.__draws.total++; return o.apply(this, a); };
    }
  }
})();
```

Gotchas found:
- **Wrapper order.** Init scripts nest: the one added last is outermost. A "getContext returns null" script
  added after the recorder hides the request from the recorder. Add the null/strip case first and the
  recorder last.
- It patches `HTMLCanvasElement.getContext` only. `OffscreenCanvas.getContext` is not covered (the contract
  should say the chunk uses an on-page canvas, which Part B does anyway).
- `navigator.deviceMemory` is `undefined` on `about:blank` (insecure) and `8` on `http://localhost`. CI
  serves from localhost, so it is defined; the product must still define what undefined means. Tests set
  it with `Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })`, which the page sees.
  `hardwareConcurrency` is 4 here.
- Save-Data: a `Save-Data` request header does not change `navigator.connection.saveData`. The test sets
  `Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true }) })`.

## 2. Counting draw calls

Yes. The prototype patch on both context classes counts `drawElements` (the reference calls it once per
frame) and would count `drawArrays`/instanced draws. In the reference: swap, 2 draws; 2 s at rest, still
2; one `mouse.wheel`, 4. Assert "changed / did not change", never an exact count (one frame may be
several calls in Pixel's design).

## 3. A sheared seven-plank hull

Reference renderer: `scratchpad/ref/components/hero-gl.ts`, `scratchpad/ref/lib/hull-geo.ts` (the
geometry copied from `lib/half-model.ts` minus the path builders), gate in `hero-upgrade.tsx`.
It builds the mesh at run time (three rows per lift, a column every ~5 units, depth-tested on z, one
`drawElements`), reads its tones from the SVG's own computed stop and fill colours (through a canvas),
shears in the vertex shader (`y' = y + shear * z`) and draws the seams in the fragment shader with
`fwidth`. Not done in the spike: the butt joints (vertical seams), `ResizeObserver`, retina scale beyond
`min(dpr, 2)`.

- **It shows.** `page.screenshot` captures it (compositor output). `readPixels` and `toDataURL` do not:
  outside the frame that drew, `readPixels` gives `[0,0,0,0]` (the buffer is presented and cleared); only
  a read in the same rAF after a forced draw gives pixels (`[219,219,213,255]`). **Specs must use
  screenshots.** `scratchpad/spike/q3c.cjs`.
- **Deterministic.** Two separate browser contexts, light and dark, 320/390/768/1440 wide:
  **0 differing pixels in all 8 pairs.** (`cmp.cjs`.) Across Chromium builds I can't say.
- **Silhouette vs the Part A SVG** (`cmp2.cjs`; lit = more than 8 per channel from `--background`; the SVG
  with its seams and butts removed for the silhouette rows). Box 688 x 172 at 1440, 390 x 134 at 390:

  | compared | raw mismatch | pixels farther than 1 px from the other mask |
  |---|---|---|
  | silhouette only, 1440, light / dark | 0.135% / 0.128% of the box (160 / 152 px) | 0 / 0 |
  | silhouette only, 390, light / dark | 0.371% / 0.348% (194 / 182 px) | 0 / 0 |
  | with seams (butts hidden in the SVG), 1440 | 1.55% / 1.68% (1829 / 1983 px) | 0 / 3 |
  | with seams, 390 | 2.62% / 2.67% | 1 / 4 |

  Bounding boxes agree to within 1 px at every edge at 768 and 1440; at 320 and 390 the top or
  bottom edge is 1 px off (2 px once, dark 320 top). 1024 was not compared (same box as 768). Mean absolute channel difference over pixels lit in
  both: 1.9 to 5.5 (max 81 to 165 at seam and edge pixels). So **a silhouette agrees to a pixel; a 99.5%
  raw mask match does not survive seams** (6 seams of ~600 px are ~1.5% of the box, drawn differently by
  a hairline stroke and a fragment shader). See C13.
- **Size.** The built chunk is **5,323 B raw / 2,711 B gzip** (`gzip -9`; `gzipSync` within a few bytes),
  Turbopack-minified, containing the geometry, mesh, shaders, tone reading, shear and frame guard.
  Butts and a resize observer will add about 0.5 KB. The 15,360 B budget is about 5 times what is needed.
  No dependency is needed.
- CLS of the canvas swap: **0** (rect before and after the swap `[376, 525.17, 688, 172]` both; opacity
  transition only).

## 4. Idle-loading the chunk

Reference gate: a client component in the first load; after `load` (and once the box is within one
viewport height, `IntersectionObserver` with `rootMargin = innerHeight`) it calls
`requestIdleCallback(() => import("./hero-gl"), { timeout: 2000 })`. `q4.cjs`, 6 runs each.

| CPU | `loadEventEnd` | GL chunk request, after `loadEventEnd` | canvas inserted, after `loadEventEnd` |
|---|---|---|---|
| 1x | 105 to 121 ms | **+35 to +66 ms** | +77 to +116 ms |
| 4x throttle | 381 to 456 ms | **+184 to +225 ms** | +330 to +396 ms |

Every run: the GL chunk's resource `startTime` is at or after `loadEventEnd` and it is the only script
requested after load. So "not before `loadEventEnd`, within 5 s after" holds with a 20x margin.

**Identifying the chunk by comparison works.** In the control run exactly one JS response contained
`createShader` (`2hybc6uov514r.js`); no other run requested it. Under `next build`, Next 16.4 / Turbopack
emits an `import()` inside a client component as its own content-hashed chunk, referenced only from the
importing component's chunk (that chunk's body holds the hashed id; the page HTML never references it, no
`<link rel=preload>`). Docs: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (`import()` of
libraries, `next/dynamic`). The name changes every build, so a name can't be hard-coded: comparison is
right. Risk: if Pixel shares a module between the gate and the chunk (for example geometry imported by
both), Turbopack puts it in a shared first-load chunk. C15's first-load delta catches that.

## 5. Lens's open findings

**C10 proximity (script `q5c.cjs`, `q5d.cjs`).** Box top by viewport (document y, no scripts):
320 wide 663; 390 wide 538; 600 wide 468; 1024 wide 497; 1440 wide 525. No realistic viewport has the
box more than one viewport height below the fold: 320 x 640 is 0.04 vh, 320 x 568 is 0.17 vh. Candidates
that satisfy "more than 1 vh below": 320 x 300 (1.21), 320 x 240 (1.76), 390 x 240 (1.24), 1440 x 240
(1.19), 1440 x 200 (1.63). Two ways to build the premise; I recommend the first:
1. **Spacer by CSS at 1440 x 900.** An init script adds, on `DOMContentLoaded`,
   `<style>main > header { margin-bottom: 200vh }</style>` to `<head>`: box top 2325 px (1.58 vh below).
   No hydration error or console message (document-start injection fails: `head` is null). Result: after
   3 s no canvas, no chunk request; scrolled so the box top is 2.2 vh below the viewport top, still none
   after 1.5 s; at 1.8 vh, chunk requested and canvas present.
2. A tiny viewport (390 x 240): same three outcomes.

Either way assert the premise first (`boxTop - innerHeight > innerHeight`).

**C14 frame clock (script `q5c.cjs`).** Yes. With an init script that wraps `requestAnimationFrame` so
the timestamp it hands back advances 60 ms per frame (switchable by `window.__slow`), continuous
`mouse.wheel` every 25 ms: the control grows the draw count **2 to 26 in 0.5 s** (+24); after switching
the slow clock on: **26, 31, 31, 31, 31** sampled every 400 ms across 1.6 s of continuous scrolling
(scrollY moved to 219), canvas still in the DOM. The slow clock is only caught if the product reads the
rAF timestamp (or `performance.now`, which the test would patch too); the reference guard is "rAF
timestamp gap above 50 ms on three consecutive frames of a running loop", and the contract must define
the rule so the test and the product agree. Context loss: `canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext()` (a real loss, not a dispatched event) removes the canvas within 400 ms,
the SVG is visible and the box rect is identical.

**C15 / C6: can Probe assert sizes in a spec, with Lens running nothing? Yes, from response bodies.**
(`q5e.cjs`, `q5f.cjs`.) `page.on('response')` for `resourceType() === 'script'`, `await r.body()`,
`zlib.gzipSync(body).length`, split by whether it arrived before the page's `load`. Measured:

| | first-load scripts | first-load gzip | after-load scripts |
|---|---|---|---|
| Part A site (this branch), `/` | 5 | 135,890 | 0 |
| Part A site, `/_not-found` | 5 | 135,890 | 0 |
| reference Part B, `/` | 6 | 136,674 (**+784**) | 1 (GL chunk, 2,711 gz) |
| reference Part B, `/_not-found` | 5 | 135,890 | |

- **Baseline in the same build, not `origin/main`.** `/_not-found` loads exactly the framework chunks and
  none of the hero's; `/` minus `/_not-found` is the hero's first-load cost (0 today, 784 B with the
  gate). A spec can compute that delta in one run, with no stored number to rot when Renovate bumps
  Next or React. `origin/main`'s number can't be read from a spec.
- **Sum what the browser fetched, not what the HTML names.** `/`'s HTML names a 39 KB `<script
  noModule>` polyfill chunk that Chromium never requests: summing HTML references gives 175,517 B, the
  browser got 135,890 B.
- Next 16.4's build output prints no per-route sizes, but `.next/diagnostics/route-bundle-stats.json`
  has them, uncompressed (`/` first load: 458,689 B on Part A, 459,931 B with the gate: +1,242 raw) and
  the chunk list. Useful in Pixel's report; it is raw bytes, not gzip, and absent when the suite runs
  against a deployed URL (`PLAYWRIGHT_BASE_URL`), so the spec should not read it.
- C6's 8192 B: `[data-hero]` `outerHTML` is 6,487 chars today (6,510 with the reference's hidden gate
  element); the hull is in the plain `request.get("/")` body.

## 6. Iris's item 3: the silhouette in the 172 px box

Measured (`q6.cjs`, light and dark): the Part A hull is a **118 px tall** lit region (the viewBox height;
27 px empty above and below in the 172 px box) and 623 px wide, from x = 32 to 654 in the 688 px box, at
768, 1024 and 1440 (at 767, 118 tall and 623 wide in the full-width box). At 390 it is 81 px tall in a 134 px box (27 / 26 px air); at 320, 66 px in 110
(22 / 21); at 600, 101 in 172 (34 / 36).

At the pose's ends (`lib/half-model.ts` geometry with the shear varied, `env.mts`; and measured on the
canvas at scroll positions with `fullPage` screenshots, `q5a.cjs`):

| shear | silhouette top (viewBox y; 0 is the bow tip, 118 the keel) | height |
|---|---|---|
| +0.24 (rest, the SVG) | 0.0 | 118.0 |
| 0 | 0.0 | 118.0 |
| -0.12 | -0.5 | 118.5 |
| -0.24 | **-5.7** (at x = 460, the gunwale lifts) | **123.7** |

The keel is the bottom at 118 at every shear. **Horizontal extent does not change with shear** (x 32 to
655 on the canvas at +0.24, 0 and -0.24; the shear only moves y). On the canvas the top edge moves from
row 27 to row 21 at -0.24 (the 5.7 predicted, a pixel of antialiasing). Top at -0.2: -3.4; at -0.18:
-2.4; at -0.3: -9.5.

So the envelope is 123.7 viewBox units (at scale 1 on desktop: 123.7 px). Box options, desktop:
- **Tight: envelope + 4 px each side = 132 px.** Rest hull then sits with 9.7 px above and 4.3 below
  (5.7 + 4 above), so it is not centred; the box's hull offset has to be 9.7 px, not (box - 118) / 2.
- **Centred rest: 118 + 2 x 9.7 = 138 px**, 9.7 px above and below the rest hull, 4 px past the envelope's
  top at -0.24.
- Today's 172 leaves 27 / 27 px.
- If the turn were limited to -0.2 instead of -0.24, the envelope is 121.4 and a centred rest box is
  `118 + 2 x (4 + 3.4) = 133` px.

Below 768 the same rule scales with the hull: scale s = hull width / 624 (1.12 cw / 624 up to 390, 0.7
at 390, 0.574 at 320): the tight box height is `123.7 x s + 8`: 79 px at 320, 95 at 390, 115 at 600,
132 at 767 (against 110, 134, 172, 172 today), and the page's 64 px gaps stay. Part A's C2, C3 and C4
numbers (box 688 x 172, `min(cw / 2.9, 172)`) change with this; so does `hero.spec.ts`. That is a
rewrite of Part A's spec and CSS in the build sprint, and Iris's call whether 9.7 px of air above a
hull that sits low is acceptable.

## Recommendations for C10 to C16

- **C10 The upgrade: keep, rewrite how.** Chunk request is `performance` resource `startTime` at or after
  `loadEventEnd` and at most `loadEventEnd + 5000` (measured +35 to +225 ms, so 5 s stays generous);
  canvas present within 5 s of the request (measured 40 to 170 ms). Proximity: assert the premise
  (`boxTop - innerHeight > innerHeight`) and use the `header { margin-bottom: 200vh }` spacer at
  1440 x 900, not 320 x 640 (23 px below the fold). After the swap: rect identical, CLS 0, canvas
  `aria-hidden`, and the only animations in `[data-hero]` are one 200 ms opacity `CSSTransition`:
  sample `getAnimations({ subtree: true })` every 20 ms from an init script, because the transition lives
  about 200 ms and starts a frame after insertion.
- **C11 The pose: keep.** `data-hero-shear` hit 0.240 / 0.120 / 0.000 / -0.120 / -0.240 at scroll
  fractions 0 to 1 of the box's bottom edge; the tolerances (0.005 at the top, 0.02 at the bottom, 0.01
  between) can all be 0.005. Read the silhouette from `page.screenshot({ fullPage: true, clip })` in
  document coordinates, because at -0.24 the box is above the viewport; not `readPixels`. Left and right
  extents equal at the three shears (measured identical). "No lit pixel on the box's first or last row"
  is the check that bites once the box is trimmed to the envelope.
- **C12 Nothing moves at rest: keep.** Count with the init script; assert "unchanged over 2 s from 1 s
  after the swap" and "changed after a wheel". Never an exact count.
- **C13 Same object: rewrite.** Drop "differ by at most 1 px at every edge over at least 99.5% of the
  box". Replace with: (a) lit-mask bounding boxes within 1 px on each side at 1440 and 390 in both
  schemes; (b) pixels lit in one mask with no lit pixel of the other within 1 px (Chebyshev radius 1) at
  most 0.1% of the box (measured: at most 4 px, 0.008%, with naive soft seams; 0 for silhouettes); (c)
  copper plank interior colour within a few units per channel and the seam hairlines are not compared
  pixel for pixel. The 3.05 : 1 clause is unchanged (the canvas takes its tones from the SVG's resolved
  stops; I did not measure it separately). Compare against `javaScriptEnabled: false` screenshots of the
  SVG, with `page.evaluate` for the rect (`locator.boundingBox()` and `addStyleTag` hang with scripts
  off).
- **C14 It falls back: keep, rewrite details.** All six refusals leave the SVG, no canvas and no GL chunk
  request in the reference (reduced motion after scrolling 0 to 3000 px and 3 s; Save-Data;
  `deviceMemory` 2; `hardwareConcurrency` 2; `getContext('webgl')` null; the caveat flag refused with the
  strip switched off, where the recorder shows the probe asked with `failIfMajorPerformanceCaveat: true`
  and nothing else); control 8/8 requests exactly one GL chunk. Frame clock as in section 5 (growth first,
  then flat). Context loss through `WEBGL_lose_context`. The contract must define "slow frame" for the
  product. Install the recorder last (section 1).
- **C15 Weight: rewrite.** Probe asserts, from response bodies with `gzipSync`: the GL chunk and all JS
  first requested after load total at most 15,360 B (reference: 2,711); the one chunk containing
  `createShader` is the only one; first-load `/` minus first-load `/_not-found` (same build, same run)
  is at most 2,048 B (reference: 784). Lens needs to read nothing.
- **C6 Weight (Part A): keep as is** (`outerHTML` 6,487 of 8,192, hull in the body). Its "first-load JS
  equals `origin/main`" tail was Pixel's report for Part A; in Part B it is the C15 delta. Drop it from
  the lasting suite.
- **C16 Gate: keep as a process line, not a spec.** `pnpm verify` (including knip for an unused
  dependency) and `gate.yml` (owner paths, `scripts`) already decide it; Playwright can't see them. No
  dependency is needed (2.7 KB gzip hand-written), so "a dependency, if any" can say "none expected".
- **Size of C2 (Iris, item 3): tighten.** Envelope 123.7 px; 132 px box (tight) or 138 (centred rest);
  see section 6. It changes `hero.spec.ts` C2 to C4 and the CSS together with Part B.
- **Not verified:** CI's Chromium 156 (measured on 141); devicePixelRatio 2 renders; any non-Chromium
  engine; a GPU-backed context (software only); the butt joints on the canvas; one design for the frame
  guard (mine); runtime on a real phone.

Scratchpad: `/tmp/claude-0/-home-user-theseus-portfolio/27188b3c-46c9-5256-999f-d684a5369382/scratchpad/`
(`spike/` scripts, `ref/` the scratch Part B app). Nothing under `app/`, `components/`, `lib/` or `e2e/`
was changed; `.next` was built in the checkout (git-ignored).
