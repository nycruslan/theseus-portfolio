# Sprint 5: Pixel's build

Built: the section reveal on scroll, CSS only. As of fix round 2, each section's heading rises 16 px
into place as the section scrolls in, and nothing fades. `e2e/reveal.spec.ts` C1 to C8 and the
whole existing suite pass, and nothing in `e2e/` was edited. At rest the page is pixel-identical to `origin/main`
in light and dark at 1440 and 390.

## What changed

One file, `app/globals.css`: a block at the end, unlayered, no new tokens, no client JS.

- `@supports (animation-timeline: view())` wraps `@media (prefers-reduced-motion: no-preference)`,
  which holds both the keyframes and the rule, so reduced motion and browsers without view timelines
  get no animation at all (C5, C6, and `cards.spec`'s `getAnimations()` count).
- Final state, after fix round 2:
  - `@keyframes section-rise` has only a `from { translate: 0 16px }`, so the end is the heading's
    own style.
  - `main > section` has only `view-timeline: --section block`.
  - `main > section > h2` has `animation: section-rise cubic-bezier(0.33, 1, 0.68, 1) backwards`,
    then `animation-timeline: --section`, `animation-range: entry 0% entry 64px` and
    `will-change: contents`.
  - `main > section` never matches the header (C3).
- History:
  - cd26f19 faded and raised the whole section.
  - Fix round 1 (8d87127) faded the section and raised only the heading.
  - Fix round 2 removed the fade. See the two sections below.
  - The notes on the range, `backwards` and the ease below still hold. They now apply to the
    heading.

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
- **Ease.** An ease-out cubic over the range, so most of the rise happens as the section's
  top edge clears the bottom of the screen, and the last few pixels settle slowly. At +20 px of the
  range Contact's heading is at translate 5.4 px; at +40 px, 0.9 px. (The opacity figures elsewhere in
  this note describe cd26f19 and 8d87127; the final build fades nothing.)

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

## Fix round 1: CI `check` failed on cd26f19 (cards.spec "the whole of a linked card is its link")

**Root cause.** A view timeline's value is sampled once per frame, during the rendering update. A
script that jumps the scroll and then reads layout in the same task gets the old timeline value. So
for one frame after `scrollIntoViewIfNeeded`, a section that was below the fold is still in its start
state, even though it is now well inside the viewport.

At 1280 x 720, Projects is below the fold at load (opacity 0, translate 16 px). The test scrolls the
card into view, measures its rect, and then clicks the corner 8 px in from the bottom. The rect was
measured 16 px low, and by the click the card had risen. The point landed 8 px below the card, so no
navigation happened. 390 x 844 is unaffected because Projects is already at rest at load there.
Whether a run fails depends on whether a frame falls between the measure and the click, which is why
it passed locally and failed in CI.

**Evidence.** `cardrace.mjs` in the scratchpad replays the test's measure-then-click and logs the
state at each step. On cd26f19:
- CPU 1x: 10 misses in 20.
- CPU 4x: 2 misses in 20.

Every miss looks the same: when the test measures, `scrollY` is 455 but the section still reads
`opacity 0, translate 0px 16px` and the card's bottom is 503.44. At the click it is `translate none`
and the bottom is 487.44, while the corner is at y 495.44.

**Fix (product code only).** The section now only fades: opacity moves no box and does not change
hit-testing. The 16 px rise moved to the section's `h2`, which is never a target, on the section's
named view timeline. A stale frame can now change only how faint the section looks, not where
anything is. After the fix, the replay had 0 misses in 40 at CPU 1x and 0 in 40 at 4x, and the
card's bottom is 487.44 both when measured and when clicked.

Lens's nit: the `will-change` comment is re-wrapped.

Evidence after the fix:
- `pnpm verify`: exit 0.
- `PLAYWRIGHT_PORT=3363 pnpm test:e2e`: 41 passed, 1 skipped.
- `cards.spec.ts --repeat-each 30 --workers 8`: 150 passed.
- `reveal.spec.ts` and `keyboard.spec.ts --repeat-each 5 --workers 8`: 65 passed.
- Pixel diff against `origin/main`: 0 differing pixels in all 28 shots (light and dark, 1440 and
  390, every scroll stop plus the full page).
- agent-browser `--session pixel5`, at 1440 x 900 and 390 x 844 in both schemes: Contact's opacity
  is 0, 0.67, 0.94 and 1 at +0, +20, +40 and +64 px. The `h2` translate is 16, 5.4, 0.9 and 0 px, and
  the links' translate stays `none`.
- Perf, measured as before: frames p50 and p95 are 16.7 ms on both builds, with 0 long animation
  frames and 0 layouts. Style recalc is 44 to 51 ms over 173 recalcs (about 0.3 ms each at 4x
  throttle). Task time over about 345 frames was 682 to 754 ms on main and 797 to 913 ms on the
  branch.
- The CSS is 13,755 bytes (+491 over main).

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

## Fix round 2: Iris's contrast band, and Lens's nits on 8d87127

**Cause (Iris, `.studio/sprint/5/review-iris.md`).** Any section whose top edge loads 1 to 30 px
inside the viewport sits partway through its fade until the visitor scrolls. Projects' top sits at
about 745 to 757 px, so the band covers ordinary windows. Iris counted 114 axe color-contrast
failures on `#projects` at load, at 390 x 758–788 and 1440 x 746–774, with the worst at 1.17:1.
Every fade length she tried left some band. My own "partly revealed at load" note had accepted
this, and that was wrong for a fade.

**Change.**
- I deleted `@keyframes section-fade`, and with it the section's `animation`,
  `animation-timeline` and `animation-range`.
- The section keeps `view-timeline: --section block`.
- The heading keeps its rise: 16 px over 64 px, the same curve.
- The comment header now says only the heading surfaces, and why nothing fades.
- Lens's nits:
  - The "(cards.spec did, in CI)" parenthetical is gone.
  - The range comment now names the Tab-to-Contact bound next to the page-end bound.

**`will-change: contents` stays, now on the heading.** Without it my 28-shot diff was **not 0**: the
same 10 pixels (11 in dark) of the card arrow differed at 1440, in all 7 stops, in both schemes. That
is 147 pixels in total. The animated heading's layer makes Chrome assume it may overlap what paints
after it, so the cards are lifted onto layers too. Iris's 8 shots without the hint came back 0; my
28 did not. I injected the hint on the section and, separately, on the `h2`: each gave 0. I put it on
the `h2`, the element that animates. Final diff against `origin/main`: **0 differing pixels in all
28 shots**.

**The Tab bound, measured.** In Chromium, tabbing to the first Contact link centres it, clamped at
the end of the page. That leaves Contact 166 to 169 px into its entry at 1440 x 900, 390 x 844,
1280 x 720 and 1440 x 764, and 136 px at 320 x 640. Lens's "about 70 px" matches a browser that
scrolls a focused element only just into view: then Contact is in by its own height, 70 to 73 px.
That is the tighter bound, so the comment states it that way. 64 px clears both.

**Evidence.**
- Iris's height-band scan, rewritten without CSS injection (`band.mjs` in my scratchpad):
  - axe `color-contrast` at load, after two frames, with motion allowed.
  - Widths 390, 1024 and 1440; heights 700 to 900 in 2 px steps; light and dark. That covers all
    of her bands.
  - Result: **606 loads, 0 failures, and 0 elements under a section below opacity 1.**
  - In 162 of those loads a heading was in view and partway through its rise, at most 16 px low and
    at full opacity. That is the "partly revealed at load" the contract allows.
- `pnpm verify`: exit 0.
- `PLAYWRIGHT_PORT=3363 pnpm test:e2e`: 41 passed, 1 skipped (the `TODO(owner)` fixme).
- `reveal.spec.ts`, `keyboard.spec.ts` and `cards.spec.ts`, `--repeat-each 15 --workers 8`: **270
  passed, 0 failed.** C1 to C8 all pass with a heading-only rise. C1, C7 and C8 see Contact as
  not at rest through its `h2`'s translate.
- agent-browser `--session pixel5`, 1440 x 900 and 390 x 844, light and dark:
  - Contact's `h2` translate is 16, 5.4, 0.9 and 0 px at +0, +20, +40 and +64 px.
  - The section stays at opacity 1 and the list's translate stays `none` throughout.
- Perf, measured as before (390 x 844, DPR 3, 4x CPU, three runs):
  - Frame p50 and p95 were 16.7 ms on both builds.
  - 0 long animation frames and 0 layouts.
  - Style recalc was 41 to 48 ms over 173 recalcs.
  - Task time was 973 to 1023 ms on the branch and 655 to 864 ms on main. Iris's servers were
    running at the same time, so these are noisy, and the difference is at most about 1 ms a frame
    at 4x.
- The stylesheet is 13,596 bytes, 332 more than main.

Settled by Atlas (decisions.md item 4): the contract's outcome now reads as a heading-only rise.

Needs decision (Iris): two things, both now settled by her review (16 px over 64 px is kept, and the
heading-only rise is accepted). For the record:
- Is the weight right? The motion is 16 px over 64 px of scroll, and quiet by design. At 1440 x 900
  it shows only on Contact.
- Fix round 1 changed the motion: the section now fades in place while only its heading rises. If
  the whole section should rise, it would need the contract's checks to tolerate a card moving in
  the frame after a jump scroll. As built, nothing clickable moves.
