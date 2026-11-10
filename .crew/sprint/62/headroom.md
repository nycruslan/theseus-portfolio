# Sprint 62: the headroom after the yard

Pixel, 2026-11-10, on main's code at 682335a (this branch's 896d744 adds only notes; a52edfc, which
landed on main since, changes only what the build type-checks, not what it bundles). It updates
the numbers in `.crew/sprint/52/headroom.md`, whose prose about the stack, the kept checks and the
cost classes still holds and isn't repeated here. It doesn't choose a direction.

**Outcome:** there's room for a new piece if it doesn't bring a second copy of three.js into the
build. A canvas 2D, CSS or Web Audio piece on a route of its own costs `/` 0 B and keeps every kept
check. A second WebGL scene fits only inside the model's own chunk, which has 82,756 B of its
250,000 B left. Any other import of three splits that chunk. Then `/`, `/log` and `/crew` fetch 2 or
3 files, which fails five checks that pin one, and `/`'s loader grows 33 to 66 B, past the 11 B
that B2.10 leaves. WebGPU/TSL still doesn't fit: the route alone is 271,963 B, and having it in the
build makes `/`'s 3D 200,997 B in 2 files and puts the loader 22 B over budget.

Every number is **measured** on production builds (`next build`, then `next start`), with
Playwright 1.64's HeadlessChrome 156 in this 4-vCPU cloud, unless it says *estimated*. WebGL runs
on SwiftShader on the CPU, so a WebGL frame time is a floor and a ranking, not a device's.
`navigator.gpu` exists, but `requestAdapter()` returns null, so WebGPU itself still can't be
measured here.

## 1. What changed since sprint 52

- The 3D chunk grew from 154,935 to **167,244 B** gzip -9 (+12,309), all of it the yard: sprint
  55's press added +9,656 (164,627), sprint 56's riffle +2,611 (167,238), and the rest is a few
  bytes. It is still one file, `0tejqt78_si1v.js` (brotli 11: 137,834; raw 638,160).
- `/log` and `/log/[n]` now draw two hulls on one canvas (`lib/model/ships.ts`): 5 draws at rest
  and 6 in a flight or a riffle, against `/`'s 4.
- Five kept checks now pin the chunk to **one file**: B5.23 (`log-model-cost.spec.ts`, a hard
  `toBe(1)`), B4.40 (`crew-model.spec.ts`, hard), and H7, Y18 and Y24 (soft). Sprint 52's class D
  assumed a second WebGL route could split three into a shared chunk. These checks now fail it
  (section 3).
- The loader didn't change: `/`, `/log` and `/log/13` are still 2,037 B over the 404, to the byte.

## 2. The budgets that bind, measured

| Budget (check) | Limit | Sprint 52 | Now | Left |
|---|---|---|---|---|
| `/`, `/log`, `/log/13`: script beyond the 404's, WebGL refused (B2.10, `read.spec.ts`) | 2,048 B decoded | 2,037 B | 464,751 − 462,714 = **2,037 B** (the loader, `3u46gfuaj_a1d.js`, 1,092 B gzip) | **11 B** |
| `/read` (B2.10) | 2,048 B decoded | — | 463,444 − 462,714 = 730 B (the print button) | 1,318 B |
| `/crew` beyond the 404's, WebGL refused (B4.14, `crew.spec.ts`) | 20,480 B decoded | — | 481,545 − 462,714 = **18,831 B** (`29dubuhra1242.js`, 7,278 B gzip) | 1,649 B |
| `/crew` beyond `/log`'s (B4.14) | 18,432 B decoded | — | 481,545 − 464,751 = 16,794 B | **1,638 B** |
| A fresh route's own script, server only (no check yet) | — | — | **0 B** beyond the 404 (`/spike/empty`; also `/work/[slug]` and `/evals` today) | — |
| The framework, on every route (the 404) | — | 462,714 B | 462,714 B decoded in 7 files, 137,543 B gzip -9 | — |
| The 3D chunk (B3.6 on `/`; B5.23 on `/log` and `/log/13`; B4.40 on `/crew`; H7, Y18, Y24) | 250,000 B gzip -9, **one file** (except B3.6) | 154,935 B | **167,244 B**, one file, the same on all four pages | **82,756 B** |
| Two woff2 within (B2.10, B4.14) | 86,016 B | — | 40,520 + 40,336 = 80,856 B | 5,160 B: no room for another face |
| Draws a frame (B3.6, B5.23, B4.40, Y18, Y23) | 8 | 4 | `/` 4; Log at rest 5; a press or a riffle **6** | 4 on `/`; **2** in a press |
| Triangles a frame from 768 px (same checks) | 30,000 | 25,267 | `/` 25,267; `/log` 26,025; `/log/13` 26,481 at rest; flight 26,433; riffle **26,533** | 4,733 on `/`; **3,467** on the Log |
| Triangles a frame below 768 px | 12,000 | 7,891 | `/` 7,891; `/log` 10,037; `/log/13` **10,337** at rest; flight 10,325; riffle 10,289 | 4,109 on `/`; **1,663** on the Log |
| Frames at rest, off-screen, hidden (B3.6, B5.23, Y18, Y23) | 0 | 0 | 0 | — |
| LCP at 4x CPU, text (B3.9 on `/`) | 2,500 ms | 272 / 288 ms | 264 ms at 390, 348 ms at 1440. My traces: `/` 284 ms (a `<p>`, 390 DPR 3) and 364 ms (`<h1>`, 1440 DPR 2); `/log/13` 296 to 336 ms and 208 to 256 ms (an `<h2>`) | ~2.1 s |
| CLS, load to rest (B3.9, B1.8) | 0 | 0 | 0 in B3.9 and in 7 of my 8 loads. One traced load of `/log/13` at 1440 DPR 2 and 4x read 0.0436; three more loads there read 0, and the source was never caught | none |
| INP (B3.9 on `/`; Y24 on the Log), **reported, not gated** | 200 ms | a tap 48, a key 16 | `/`: a tap 40 ms, a key under 16, both after the loft gave up. **The riffle at 4x, 1440: 416 ms** (inputs 160 to 416 ms, SwiftShader frames on the main thread) | none on the Log in this cloud |
| Longest task in the scene's build at 4x (B3.9) | reported | 255 / 306 ms | 268 ms at 390, 379 ms at 1440. My traces: `/log/13` up to 313 ms at 390 DPR 3, and 1,088 ms once at 1440 DPR 2 | — |

What isn't pinned: CSS. Two sheets, 68,689 B raw and 14,490 B gzip -9, load on every page, and no
check counts them.

## 3. A new piece on its own route: what the builds show

Three scratch builds of main's tree in my scratchpad (never committed), each with a route's
pages under `app/spike/`, and loaders shaped like `components/model.tsx`'s (after `load`, on idle,
then `import()`):

| Variant | The route's own first load, beyond the 404 | Its lazy chunk | What happens to `/`, `/log/13` and `/crew` |
|---|---|---|---|
| `empty`: a server page | 0 B | — | unchanged |
| `vt`: React 19.3's `<ViewTransition name>` in a Server Component | **0 B** | — | unchanged |
| `two`: canvas 2D, 864 strokes on springs, a Web Audio knock on press | loader 1,137 B decoded (774 gzip) | **1,292 B gzip** (2,436 decoded), the voice included | unchanged: one file, 167,244 B; loader 2,037 B |
| `gl`, imported by its own route: WebGLRenderer, 22 instanced planks, a lit material, an fBm `ShaderMaterial`, a ray pick | loader 1,797 B decoded | its own code 1,246 B gzip, plus three's shared 136,274 B | **2 files**: 34,013 + 136,274 = 170,287 B (+3,043). **Loader 2,070 B: 22 B over B2.10.** `/crew` 18,864 B |
| `gl`, `import()`ed from inside `mount.ts` | 1,850 B | — | **3 files**: 196 + 34,032 + 136,274 = 170,502 B. **Loader 2,103 B: 55 B over** |
| `gl`, re-exported statically from `mount.ts`, with its route importing `@/lib/model/mount` | 1,792 B decoded (976 gzip) | none of its own: it fetches the model's chunk (cached by a visit to `/`) | **one file, 168,815 B (+1,571); loader 2,037 B, unchanged** |
| `tsl`: a full-screen TSL piece on `three/webgpu` | 1,799 B | **271,963 B** (82,789 core + 189,174 WebGPU): 21,963 B over 250,000 | **2 files, 200,997 B (+33,753)**; loader 2,070 B, over B2.10 |

What a lazily loaded chunk on its own route is allowed:

- **No check pins a new route** until its contract does. By the checks' own rules, its first
  load should stay within B2.10's 2,048 B beyond the 404. The measured loaders (1.1 to 1.8 KB)
  fit. A chunk that loads without a WebGL gate is counted too: `two`'s 3,573 B beyond the 404 is
  over 2,048 B in B2.10's method (1.5 s after `goto`), so gate it on a first touch or a motion
  mode, or give the route its own number.
- **Without three:** the brief's guardrails, not the checks, set the limit. The brief asks for a
  chunk of its own after first paint, and the research's table sets CSS first, sound off by
  default and at most 10 KB of code, a DPR of at most 1.5 on phones and 2 on desktop, rendering
  on demand, and a 30 fps floor. A 2D, CSS or audio piece of a few KB is far inside all of them.
- **With three:** only inside the model's module graph. Then its bytes come out of the 82,756 B
  that `/`, `/log` and `/crew` share, and every visitor to `/` downloads them. Any other import of
  three fails B5.23 and B4.40 outright, and H7, Y18 and Y24 softly, and pushes `/`'s loader past
  B2.10. That rules out an export the model's chunk loads lazily, too: Turbopack (Next 16.4.3)
  still splits three out. Getting around it means Probe rewriting five checks' one-file pins and
  B2.10's 2,048 B growing, which is a call about budgets, not a build detail. One shape wasn't
  built: a lazy chunk from `mount.ts` that never imports three itself and is handed three's
  classes by the model. It should leave three where it is (*estimated*), but build it before you
  count on it.
- **The art budgets that still apply** (`design/research/2027-redesign.md`, "Performance and
  motion budget"): about 2 MB of assets for a first 3D view on phones and 5 MB on desktop, under
  10 MB in all; KTX2 textures at 1K to 2K on phones; no splats and no physics engine.

## 4. Sizing a second scene or a 2D piece against the yard

- **On the yard's canvas** (`/log/[n]`): 2 draws and 3,467 triangles from 768 px, or 1,663
  below, are left in a press. Anything added there has to fit that, at 0 frames at rest. Y24's
  riffle INP is already 416 ms at 4x CPU here, so no more per-frame main-thread work fits during a
  riffle in this cloud. Only a phone can say whether a GPU has room.
- **On a canvas of its own** (its own route or page): it takes its own budgets. B3's are the
  natural ones (8 draws, 30,000 and 12,000 triangles, a cap of 2 and 1.5). The `gl` spike drew 2
  draws and 6,514 triangles.
- **Frame time, under a moving pointer, the same browser and buffers:**

| Piece | 390 × 844, DPR 3 (buffer 585 × 886) | 1440 × 900, DPR 2 (buffer 2880 × 1260) | At rest |
|---|---|---|---|
| `two`, canvas 2D | **60 fps** (16.7 ms median and p95), JS 0.1 ms median, 0.6 max | **60 fps**, JS 0.1 ms median, 1.1 max | 0 frames in 3 s |
| `gl`, WebGLRenderer | 30 fps (33.3 ms median, p95 50) | 6.7 fps (150 ms median) | 0 frames in 3 s |
| `tsl`, WebGPURenderer on its WebGL 2 fallback | not timed again (sprint 52: 30 and 7.5 fps) | — | **180 rAF callbacks in 3 s**: three/webgpu's `Renderer.init()` starts its own loop (`renderers/common/Animation.js`), which runs every frame with nothing to draw |

The contrast between the 2D and WebGL rows comes from headless Chromium reading WebGL back for
software compositing (sprint 25). It doesn't mean 2D is 9 times cheaper on a phone. Compare a 2D
piece with other 2D pieces, and WebGL with WebGL.

- **Build cost on load, 4x CPU (my traces):** after the chunk's request, `/` spends 1,383 ms in
  long tasks at 390 (the longest 226) and 3,268 ms at 1440 (the longest 502, the loft's software
  frames). `/log/13` spends 1,669 ms at 390 (the longest 313) and 3,005 ms at 1440. A second scene
  built on the same page adds its own build to these. A piece on its own route doesn't.

## 5. WebGPU/TSL, and the primitives that cost nothing to add

- **WebGPU/TSL still doesn't fit.** It is three counts over: the route (271,963 B against
  250,000), the split of `/`'s chunk (2 files, +33,753 B), and B2.10 (+33 B against 11 left). On
  top of that, its renderer loops every frame at rest, and `info.render.calls` counts every render
  since start, not the frame's (use `drawCalls`). npm lists three 0.187.0, and the site is on
  0.186.1. 0.187 isn't measured here, and a bump is a dependency change for a sprint of its own.
- **CSS scroll-driven animation:** 0 B of script. In HeadlessChrome 156, `animation-timeline:
  scroll()`, `view()` and `timeline-scope` are supported, and the brief has Firefox 159 shipping
  it on 27 October 2026. Sprint 5's lessons hold: use a fixed `entry 0% entry 64px` range, don't
  fade sections (axe contrast), never move a click target, and add `will-change: contents`
  against the composited layer's antialiasing shift.
- **View Transitions:** React 19.3's `<ViewTransition>` renders from a Server Component with no
  Next configuration (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`), and the
  `vt` spike cost **0 B** of client script. App Router navigations are same-document, and
  same-document transitions have been Baseline since Firefox 144 in October 2025
  ([web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)).
  Cross-document `@view-transition` isn't confirmed in Firefox
  ([Chrome docs](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document)).
  The snapshot is an image, so a morph across the model's canvas captures its frame, and reduced
  motion must turn it off. Only the build was checked here: no navigation ran a transition.
- **Canvas 2D:** no dependency. 1.3 KB gzip for a full toy, 60 fps here at both sizes, and 0 frames
  at rest when it draws on demand. An `OffscreenCanvas` worker is allowed by the CSP
  (`worker-src 'self' blob:`).
- **Web Audio:** no dependency, inside the 1,292 B above. An `AudioContext` starts on a gesture
  (autoplay), and the research says sound is off by default. The site's `Permissions-Policy`
  (`next.config.ts`) blocks the camera, the microphone and geolocation, so a mic- or camera-driven
  piece needs that policy changed. Device orientation isn't blocked, but iOS asks permission on a
  gesture.

## What only a GPU and a phone can confirm

- Frame time for any of these pieces. SwiftShader ranks WebGL against WebGL, and canvas 2D here
  isn't read back the way WebGL is.
- The yard's riffle INP on a real device: 416 ms here is software rendering at 4x.
- WebGPU's adapter, its draws and its idle loop's cost on a battery.
- Whether the one CLS reading of 0.0436 on `/log/13` at 1440 DPR 2 under tracing is real. It
  wasn't reproduced, and its source wasn't caught (Probe may want a look).

## How these numbers were taken

- Main's build in my worktree on port 3362: `pnpm install --frozen-lockfile`, `next build`,
  `next start`. The kept checks ran against it with `PLAYWRIGHT_BASE_URL`: B2.10 (passed, 17 s);
  B3.6, B5.23 on `/log` and `/log/13`, Y18 at both sizes, both Y23 runs, and H7 (8 passed, 3.3 min,
  2 workers); then B3.9 and Y24 alone on 1 worker (2 passed, 33 s). B4.14 and B4.40 skip under
  `PLAYWRIGHT_BASE_URL`, so `/crew`'s bytes come from my own script, which uses B4.14's method (a
  fresh context, WebGL refused, decoded bodies 1.5 s after `goto`). `/crew`'s draws weren't
  measured.
- The spike: `git archive` of this branch into my scratchpad, with `app/spike/{empty,vt,two,gl,tsl}`,
  `components/spike-*.tsx` and `lib/spike/*.ts`. I built 5 times: no three consumer; `gl` on its
  own route; `gl` imported from `mount.ts`; `gl` re-exported statically from `mount.ts`; and `tsl`
  alone. Each build was served on port 3363 and measured by the same scripts.
- Traces: chrome-devtools-mcp still can't start Chrome as root in this container. I traced with
  Playwright's `browser.startTracing` and CDP `Emulation.setCPUThrottlingRate` 4, observing
  `longtask`, `largest-contentful-paint` and `layout-shift`.
