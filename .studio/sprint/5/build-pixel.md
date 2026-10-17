# Sprint 5: Pixel's build

Built: the section reveal on scroll, CSS only. `e2e/reveal.spec.ts` C1 to C8 and the whole existing
suite pass, and nothing in `e2e/` was edited. At rest the page is pixel-identical to `origin/main`
in light and dark at 1440 and 390.

## What changed

One file, `app/globals.css`: a block at the end, unlayered, no new tokens, no client JS.

- `@supports (animation-timeline: view())` wraps `@media (prefers-reduced-motion: no-preference)`,
  which holds both the keyframes and the rule, so reduced motion and browsers without view timelines
  get no animation at all (C5, C6, and `cards.spec`'s `getAnimations()` count).
- `@keyframes section-reveal` has only a `from`: `opacity: 0; translate: 0 16px`. The end is the
  section's own style.
- `main > section`: `animation: section-reveal cubic-bezier(0.33, 1, 0.68, 1) backwards`, then
  `animation-timeline: view()`, `animation-range: entry 0% entry 64px`, `will-change: contents`.
  `main > section` matches the three `Section`s and never the header (C3).

The built CSS keeps the gate intact (lightningcss writes the start as `entry`, which is `entry 0%`;
the computed `animation-range-start` in the production build reads `entry`). It adds 297 bytes to
the page's one stylesheet (13,264 to 13,561, uncompressed).

## How it differs from Probe's reference, and why

- **Range: a fixed 64 px of scroll, not `entry 30%`.** `entry` percentages are a share of the
  section's height, and the sections are short (73 to 297 px at 1440). With 30%, Contact, the only
  section below the fold at 1440 x 900, revealed over 22 px of scroll: one wheel notch, a snap
  rather than motion. 64 px is the same distance for every section and is bounded on both sides:
  - Projects is 86 px into its entry at load at 390 x 844 (155 px at 1440 x 900, 142 px at
    390 x 900), so it is already at rest when axe and the linked-card check run. Any end past
    about 80 px would catch it mid-fade.
  - At the bottom of the page the last section is fully in view plus main's 96 px bottom padding,
    so it is always past 64 px. A page too short to scroll has every section past it too.
- **`backwards`, not `both`.** With no forwards fill the animation leaves no value behind after its
  range, so a section at rest has `translate: none` and its own opacity, not the end keyframe.
- **`will-change: contents`.** Found by pixel-diffing against main. A scroll-driven animation stays
  current while the page can scroll back, so Chrome kept each section on a composited opacity layer
  for good. At rest that changed 10 pixels (11 in dark) of the Projects card arrow at 1440, by 1 to 2
  RGB levels: the layer snaps to a whole pixel while the section sits at y 744.72. On a system with
  subpixel text antialiasing the section's text would lose it too (headless Chrome has none, so this
  part is from Chrome's LCD-text rules, not measured). I proved the cause by adding
  `will-change: opacity` to main's sections: that build matched the branch exactly. The hint keeps the
  sections painted with the page. The cost is that the 64 px rise paints on the main thread, and I
  measured that cost (below).
- **Ease.** An ease-out cubic over the range, so most of the rise and fade happens as the section's
  top edge clears the bottom of the screen, and the last few pixels settle slowly. At +20 px of the
  range Contact is at opacity 0.67 and translate 5.4 px; at +40 px, 0.94 and 0.9 px.

## Evidence

- `pnpm verify`: exit 0 (biome ci "Checked 59 files, no fixes applied", 9 infos that were there
  before, in `e2e/`; typecheck; knip; build).
- `PLAYWRIGHT_PORT=3363 pnpm test:e2e`: **41 passed, 1 skipped** (the `TODO(owner)` fixme in
  `content.spec.ts`). C1 to C8 all green.
- `PLAYWRIGHT_PORT=3363 pnpm test:e2e e2e/reveal.spec.ts e2e/keyboard.spec.ts e2e/cards.spec.ts
  --repeat-each 4`: 72 passed, none flaky.
- **Pixel identity at rest.** I built `origin/main` (`git archive`) in the scratchpad and ran both
  production builds side by side. I took viewport screenshots with motion allowed at the top, with
  each section centred, at the bottom and back at the top, plus a full-page shot from the bottom.
  That was 7 shots for each of light and dark at 1440 x 900 and 390 x 844: **0 differing pixels in
  all 28**. Main against itself was also 0, so the comparison is deterministic. Reduced motion is
  the same as main by construction (no rule applies), and C2 and C5 pin it.
- **Real browser** (agent-browser 0.39, `--session pixel5`, production build). I scrolled Contact
  through its range at 1440 x 900 and 390 x 844 in light and dark: +0 px is opacity 0 and 16 px
  down, +20 px is 0.67, +40 px is 0.94, and +64 px is at rest. The header is untouched throughout.
  The screenshots are in the scratchpad only (the `shots/final-*` files).
- **Performance.** I scrolled the whole page down and up in 4 px wheel steps, one per frame, at
  390 x 844 and DPR 3 with the CPU throttled 4x. There were three runs for each build:

  | | frames p50 / p95 | long animation frames | style recalc | layouts |
  | --- | --- | --- | --- | --- |
  | main | 16.7 / 16.7 ms | 0 | 0 ms | 0 |
  | branch | 16.7 / 16.7 ms | 0 | 28 to 33 ms over 173 recalcs (about 0.2 ms each) | 0 |

  The main-thread task time went from 684 to 818 ms on main to 834 to 862 ms on the branch, over
  about 345 frames: under 0.5 ms a frame at 4x throttle. The compositor variant (before
  `will-change: contents`) measured the same within noise (845 to 904 ms, same 173 recalcs), so the
  pixel fix costs nothing measurable.

## Not done, or not verifiable here

- **"Eases in once" is per scroll position.** CSS can't latch, so this is inherent to a CSS-only
  reveal. If a visitor scrolls back up until a section is below the bottom edge again, it returns to
  its start state off-screen, and it reveals again on the way down. It is never hidden while on
  screen past the first 64 px.
- **A section already partly in view at load can be partly revealed** at some sizes. Any viewport
  where a section's top edge is 1 to 63 px above the bottom shows it mid-fade until the visitor
  scrolls. The contract allows this. At the sizes the suite uses (1440 x 900, 390 x 844, 390 x 900,
  1280 x 720, 320 x 640) every section in view at load is either at rest or wholly below the fold.
- **Safari 26 and Firefox weren't exercised.** C6 reads the gate in the CSSOM, and there is no
  WebKit or Gecko here. `will-change: contents` is a hint and is harmless where it is ignored.
- **Subpixel text antialiasing loss** without the hint is inferred, not seen. The headless
  screenshots show only the arrow.

Needs decision (Iris): is 16 px over 64 px of scroll the right weight for this site? It is quiet by
design. At 1440 x 900 it is only visible on Contact, since the other two sections are in view at
load.
