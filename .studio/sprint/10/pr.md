**Work in progress.**

## Sprint 10: the hero's Part B, the WebGL upgrade

**Goal:** the roadmap's top open item, the subtle 3D hero, Part B: build the WebGL upgrade the owner
accepted by merging #32 (chosen from the roadmap). **Size:** M, the build step of an L item.

**Contract:** `.studio/sprint/9/contract.md` (C10 to C17, the C2 trim to 138 px, the `e2e/hero.spec.ts`
tightenings), amended for the owner: see `.studio/sprint/10/contract-change.md` and "Needs owner decision". Brief: `.studio/sprint/10/brief.md`.

## What shipped

- **The gate** (`components/hero-upgrade.tsx`, first-load, no shader code): after `load`, in idle time,
  with the box within one viewport height, no reduced motion, no Save-Data, cores and memory unknown or
  at least 4, and a throwaway `failIfMajorPerformanceCaveat: true` context granted.
- **The renderer** (`components/hero-gl.ts`, its own chunk, hand-written WebGL, no dependency): the same
  hull from `lib/half-model.ts`, seams and butts as 1 px strokes, shear tied to scroll and clamped to
  ±0.24, one 200 ms fade in, draws only when the pose changes, freezes after three slow frames, falls back
  to the SVG on context loss. SVG path code split into `lib/half-model-svg.ts` (identical output).
- **The box:** 688 x 138 from `@container (width >= 48rem)`, `8 + 130 s` below, hull centred.

## Contract results

- Probe's specs failed first on the unbuilt page (d5c2a06), then pass on the build: CI `check` green on
  c2829a1 on Chromium 156, 63 passed, 1 skipped (content.spec's existing owner TODO).
- C17's first CI run showed Chromium 156 grants the caveat flag the spike saw 141 refuse; see the
  amendment. C17 then passed on 156 (00d63b8): the stripped context draws.
- Weight (Pixel, measured on 141): chunk 3,491 B gzip (cap 15,360), first-load delta 840 B (cap 2,048),
  CLS 0, chunk requested 43 ms after load (210 ms at 4x CPU).
- Near a threshold: C14.1 draw growth +15 against a floor of 10 (draws once per wheel event); C11.2 and
  C13.1 at 1 px on one edge, at their 1 px limit. All green on CI.

## Decisions

- Pixel split the SVG path builders into `lib/half-model-svg.ts` to keep ~0.8 KB of dead code out of the
  chunk.
- If a frozen canvas meets a resize or a scheme change, the SVG comes back (a frozen canvas can't redraw);
  see owner item 2.

## Needs owner decision

1. **The caveat premise** (`.studio/sprint/10/contract-change.md`): CI's Chromium 156 grants
   `failIfMajorPerformanceCaveat: true` in its software renderer, which the contract's harness assumed it
   refused. C17 now asserts the harness's own refusal script and reports the browser's answer; C14's
   caveat case uses that script. No threshold moved, and the gate is unchanged. In practice the WebGL hull
   loads in software renderers on recent Chrome, guarded by the slow-frame rule. Merge to accept, or say
   the gate must keep software renderers out.
2. **A frozen canvas on resize or a scheme change** (Lens's nit, `components/hero-gl.ts`): the contract says
   that after three slow frames "the canvas stays, frozen at its last pose". It does, until the window
   resizes or the scheme flips; then it would stretch or show the old colours, so the SVG comes back at its
   rest pose. That is the jump your decision 2 wanted to avoid, but only on those two events. Merge to
   accept, or say a frozen canvas must stay through them (stretched or off-colour).

## Not verified

A GPU-backed context, Safari, Firefox, a real phone; retina rests on one devicePixelRatio 2 screenshot.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01J3U5NR7ixTVsyovL18Jb1i
