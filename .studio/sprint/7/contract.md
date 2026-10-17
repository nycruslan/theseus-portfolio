# Sprint 7 contract: the 3D hero

Size: L, built as two M pull requests. This sprint ships the contract only; the owner accepts it by
merging this PR (`needs-owner`). No product code changes.
- **Part A, the next sprint:** the static half-model, an inline SVG in the HTML, no client JavaScript,
  no dependency. Pixel builds, Probe writes C1 to C9 first, Lens reviews in CI, Iris reviews as advice.
- **Part B, the sprint after:** the WebGL upgrade on top of A, with C10 to C16. Same roles.

## Goal

Roadmap item 7, the only open one: **a subtle 3D hero element that degrades gracefully on low-end
devices.** The form is Iris's, in `.studio/sprint/7/direction-iris.md`; where this contract and the
direction differ, the contract rules.

## Outcome

Right after the owner's name, headline, location and bio there is a lift half-model of a ship's hull:
seven stacked planks, matte and verdigris, with one copper plank, the one part freshly fitted. Every
visitor sees it as an inline SVG. On a capable device with motion allowed, it becomes WebGL that turns
a few degrees as the visitor scrolls past, and does nothing else. On a phone, with scripts off, under
reduced motion or on a weak device, the SVG is the hero, with the same pose. It never moves text, never
takes focus, and never delays the first text.

## Existing checks that bind this (keep green, unedited)

Nothing in `e2e/` has to change. These are the lines that bind, and what they require of the hero.
- `reveal.spec.ts` C2 lists the sections as exactly `experience, projects, stack, education, contact`:
  **the hero is a `div`, not a `section`.** If it became one, that line would have to change; it must
  not. C3: no animation targets the header, inside it, or an ancestor of it (so none on `main`). C4: every
  keyframe animation on the page animates only opacity, transform or translate, and nothing in `main`
  runs a keyframe animation on the clock. C5 and `cards.spec.ts`: under reduced motion
  `document.getAnimations()` is empty. C6: a rule that names `animation-timeline` counts as a reveal and
  must sit in both gates, so the hero adds none. The only motion it may add is a 200 ms opacity
  transition (a CSSTransition, which C4 allows), and only in Part B.
- `invariants.spec.ts`:
  - The color-literal scan of `app/` and `components/` bans hex, `rgb()`, `hsl()`, `oklch()` and
    `oklab()` calls. Direction's `oklch(from var(--x) …)` is therefore out. **Tones use
    `color-mix(in oklab, var(--token) …, var(--token))` only** ("in oklab," is not a call, so it passes).
  - An id like `url(#face)` or `#bed` reads as a hex color, so SVG ids are prefixed (`hero-…`).
  - Text must be in a token: the hero holds no text node (no `<title>`, `<text>`).
  - Strict axe, 320 px with no overflow, and the JS-off first paint also run unedited on the page with
    the hero.
- `keyboard.spec.ts`: Tab visits exactly the visible `a[href]`s in DOM order, and the only `[tabindex]`
  other than 0 is `main`'s -1. The hero has no link and **no `tabindex` attribute at all**.
- `smoke.spec.ts`: reduced motion loads with no page error.
- Dependencies are the team's (Part B). `package.json` scripts and the toolchain configs are not, so
  neither part touches them.

## Hooks

So the checks are deterministic, the markup carries these attributes: `[data-hero]` on the box,
`[data-hero-hull]` on the group of all lifts, `[data-hero-lift]` on each of seven lift paths, and
`[data-hero-copper]` on the one copper plank (on the third lift). Part B adds `data-hero-shear` on the
box while the canvas is up, holding the current shear to 3 decimals.

## Checks

New tests: `e2e/hero.spec.ts` (Part A) and `e2e/hero-3d.spec.ts` (Part B), by Probe, one test per check,
named by number. Viewport 1440 x 900 and motion allowed unless said otherwise. No `test.skip`,
`test.fixme` or `test.fail`.

### Part A

**C1. Place and role.** `[data-hero]` is the only one, a `div`, a direct child of `main`, with
`main > header` as its previous sibling and the first `main > section` as its next. It has
`aria-hidden="true"`, computed `pointer-events: none`, no text node, no `img`, `image`, `video`, `canvas`
or `[tabindex]`, nothing focusable, and (computed) no background image on it or inside it.

**C2. Footprint.** The box (width x height, in px, within 1) is 688 x 172 at 1024 and 1440 (and 768).
Below 768 its width is `document.documentElement.clientWidth` and its height is
`min(clientWidth / 2.9, 172)`: 110 at 320, 134 at 390, 172 at 600 and 767. It is never taller than 172
and `scrollWidth === clientWidth` at 320. Box top minus header bottom is 64 (within 1), and so is the
first section's top minus box bottom. At 390 x 844, 1024 x 768 and 1440 x 900 at least half the box is
inside the first viewport.

**C3. The hull's tips.** At every width tested (320, 390, 600, 767, 768, 1024, 1440),
`[data-hero-hull]`'s right edge is `main > header`'s right edge (within 2). That is `clientWidth - 24`
below 672 and `(clientWidth + 624) / 2` from there up, so the bow never jumps. Its width (`cw` is
`clientWidth`) is `1.12 x cw` up to 390 (within 3), then linear from 437 at 390 to 624 at 768 (within 3),
and 624 from 768 up (within 2). So at 768 and up its left edge is the header's (within 2), at 320 and 390
the stern is cropped (left edge negative), and between 390 and 768 it grows steadily with no step: its
left edge and width at 767 and at 768 differ by at most 2 px. This keeps Iris's 1.12 crop on phones.

**C4. Still and steady.** CLS is 0 across load plus 2 s at 390, 1024 and 1440. With scripts on and with
scripts off, the box's rect is the same (within 0.5). In Part A, `getAnimations()` has no animation,
transition included, on the box or inside it, and nothing about the hero changes when scrolled.

**C5. LCP stays text.** At 390 x 844, 1024 x 768 and 1440 x 900, with the CPU throttled 4x, the
largest-contentful-paint entry's element is in `main`, not in `[data-hero]`, has no `url`, and its time is
at most 2500 ms. On `main` the LCP is the bio or the first Experience summary, not the h1, so the hero
need not keep the same one; "text" is the line. Not a gate, and shown in Probe's report: LCP is within
100 ms of an `origin/main` build under the same throttle.

**C6. Weight.** `[data-hero]`'s `outerHTML` is at most 8192 bytes. The hull is in the HTML response itself
(a plain `request.get("/")` body contains `data-hero-hull`). Part A adds no client component and no
dependency: shown by `next build`'s first-load JS for `/` equal to `origin/main`'s, in Pixel's report.

**C7. Quiet, in tokens, in both schemes.** Probe resolves every `stop-color` and every non-`url()` `fill`
and `stroke` inside `[data-hero]` through a canvas, against the resolved `--background`.
- Each non-copper tone is `--background` exactly (the seams) or 1.15 to 3.0 : 1 against it. **This
  settles Iris's open point: the dark top face measured 3.55 : 1, so it is darkened below the ceiling
  (aim for 2.8), not exempted.** A decoration that outshines the muted text is the first thing the eye
  lands on, which is the opposite of subtle.
- Each non-copper tone has an OKLCH hue within 10 degrees of `--background`'s: shading moves lightness
  only, and nothing else carries copper.
- Exactly one `[data-hero-copper]`; its tones (or its gradient's stops) have OKLCH hue within 3 degrees
  of `--accent`'s, chroma within 0.03, lightness within 0.06; its width is 20% to 40% of the hull's.
- Seven `[data-hero-lift]` paths; the copper plank sits on the third.

**C8. It degrades to the same object.** With scripts off and with reduced motion, the box is present,
visible, and has the same rect as C2. With `forced-colors: active` the box is `display: none`. (Save-Data
and weak-device signals do nothing in Part A, which has no upgrade; C14 covers them.)

**C9. Hard gates.** The existing axe test passes with the hero. Over a 3 x 3 grid inside the box,
`elementsFromPoint`, leaving out `html`, `body` and `main` (ancestors, and `main` is only programmatically
focusable), returns nothing at or inside `[data-hero]` (it is `pointer-events: none`) and nothing matching
`a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])`: no click or focus lands on the
hero's box. No `pageerror` or console error
on load. `pnpm verify` and the whole suite pass; the diff touches no owner path and nothing in
`content/`.

### Part B

For these, Probe's init scripts stand in for the machine. The CI browser draws WebGL in software, which
`failIfMajorPerformanceCaveat` refuses, so one script records the context attributes the page asks for
and strips that flag where a test needs a context (the real-GPU path is then shown by C14 alone), and
another counts `drawArrays` and `drawElements` calls. Probe's first act is a spike of both; if the
browser draws nothing at all, Part B stops there and goes to the owner.

**The WebGL chunk,** for C10, C14 and C15, is found by comparison, not by name. The control run is 1440 x
900 with 8/8 and motion allowed, and a context granted. The chunk is every JS response first requested
after the `load` event whose text contains `createShader` (case-sensitive), and it must be exactly one
file. Its URL is then the one no other run may request. The first-load code (everything fetched before
`load`) holds the gates and a capability probe, which asks a throwaway canvas for a context with
`failIfMajorPerformanceCaveat: true` and requests the chunk only if that succeeds; it holds no shader
code. Pixel keeps `createShader`, `drawArrays` and `drawElements` in the chunk alone.

**C10. The upgrade.** With `hardwareConcurrency` and `deviceMemory` set to 8: at 1440 x 900 the WebGL
chunk is requested after the `load` event, once the page is idle: not before `loadEventEnd` and within 5 s
after it. A `canvas` is in `[data-hero]` within 5 s of that request. At 320 x 640 (hero below the fold) no canvas and no chunk request until the box is within one
viewport height of the viewport. After the swap the box's rect and CLS are unchanged, the canvas is
`aria-hidden`, and the only animation anywhere in the hero is an opacity transition of at most 200 ms.

**C11. The pose.** `data-hero-shear` is `0.240` (within 0.005) at scroll 0 and `-0.240` (within 0.02) when
the box's bottom reaches the top of the viewport, and linear between (within 0.01 at a quarter, half and
three quarters of the way). The box's page position does not change (within 0.5). The silhouette's
left and right extents are the same (within 1 px) at shear +0.24, 0 and -0.24, and no lit pixel touches the
box's top or bottom pixel row (nothing is clipped).

**C12. Nothing moves at rest.** From 1 s after the swap, with no scroll for 2 s, the draw count does not
change. After a scroll, it does (so the zero is not a dead canvas).

**C13. Same object.** At scroll 0, the canvas's lit pixels (those not within 8 per channel of
`--background`) and the SVG's, taken in the same scheme, differ by at most 1 px at every edge, over at
least 99.5% of the box. No non-copper pixel, outside the copper plank's box plus 2 px, is above 3.05 : 1
against `--background` in either scheme (lighting does not push past C7).

**C14. It falls back.** Each of these leaves the SVG visible, no canvas, and no request for the WebGL
chunk (the URL found in the control run): reduced motion (after scrolling the page top to bottom and
waiting 3 s); Save-Data; `deviceMemory` 2; `hardwareConcurrency` 2; `getContext("webgl")` returning
null; and a context refused when the probe passed `failIfMajorPerformanceCaveat: true` (this proves the
flag is passed). Control: with 8/8 and motion allowed, that chunk is requested (so the check is not
empty). Then, in the control run: a `webglcontextlost` event on the canvas returns the SVG with the same
rect; and with the frame clock patched so each frame reports 60 ms, the draw count stops growing after
three frames while the canvas stays put.

**C15. Weight.** The WebGL code, libraries included, is the one chunk defined above, and all JS first
requested after `load` in the control run adds up to at most 15360 bytes gzip (`gzipSync` of each response
body, summed), so a library split into a second file still counts. None of it is in `/`'s first load.
First-load JS for `/` grows by at most
2048 bytes gzip against `origin/main`; Pixel shows it from `next build` and Lens checks it. A three.js
build does not fit; the technique is Pixel's call inside the budget.

**C16. Gate.** C1 to C9 still pass; `pnpm verify` and the suite pass; nothing in `package.json`'s
`scripts` or an owner path changed. The new dependency, if any, is in `dependencies` and used (knip).

## Out of scope

- Any idle loop, sway, spin, pointer or tilt response, load-in animation, glow, specular, environment
  map, bloom, fog, shadow or texture. A full ship, a globe, or the hull above the name or behind text.
- A plank that animates its own replacement, and any count or order that says which plank is copper.
- New color or type tokens (the tones are `color-mix` of the five). Changes to `content/`.
- The left-edge bolder variant: the owner's next step if this is too quiet, not this contract's.

## Needs owner decision

The owner accepts, by merging this PR:
1. **The symbol itself:** the lift half-model, seven planks, one copper plank, after the header, matte, in
   the five tokens, moving only on scroll. It is new visual language, and taste is the owner's.
2. **The split.** Part A alone gives every visitor the hero but nothing that is 3D (shading, no motion).
   Part B is what the roadmap's word "3D" buys, and it is the costly, flaky half for a few degrees of
   turn on capable devices only. I recommend building A, then B, and ticking the roadmap item after B;
   if the owner would rather call A enough, say so and B drops.
3. **The 15 KB budget,** which rules out three.js and means hand-written or tiny WebGL.
4. **Two things I settled that are the direction's to challenge:** darkening the dark top face
   (C7, above) rather than exempting it, and capping the hero at 172 px tall below 768. The direction's
   2.9 : 1 box would reach 264 px at 767 px, against its own 180 px limit.

The contract needs nothing in `content/` or the owner's paths, and no edit to an existing check.
