# Design brief

The owner's direction for the portfolio, written from research into the sites that won the top
awards in 2025 and 2026 (October 2026). Iris turns it into a design, Quill into contracts. It
changes only through the owner's PR. The scored references are in `calibration/`.

## The goal

An impressive portfolio, the kind that wins a Site of the Day, for an engineering leader who builds
AI platforms. It has two audiences, and both must win:
- the hiring manager or executive, who decides in the first five seconds and has the facts within
  thirty;
- the engineer, who stays, explores and judges the craft.

## What the best sites do

- **One strong idea, carried all the way**, not a stack of effects: the driver's face and helmet on
  Lando Norris (Site of the Year 2025), a walkable planet on Messenger (Developer Site of the Year
  2025), one object with real weight on Oryzo.
- **3D where it means something**: the object or world is the subject, not decoration.
- **Scroll carries the story**: scenes are sequenced by scroll, and the camera moves between them.
- **Quiet where people read**: 'kin keeps type editorial and transitions in the background, and
  kinetic type never blocks reading.
- **Performance is part of the design**: instancing, baked light, byte budgets, real HTML first,
  tested on mid-range phones.

## The concept

Iris proposes it; the owner decides. Candidates to weigh, not a decision:
1. **The ship of Theseus.** The hull the hero already shows becomes the site's world: each plank is a
   sprint, the ship assembles as you scroll, and the copper plank is the latest. One idea ties the
   3D, the site's name and the build log together.
2. **The platform as a living system.** The owner's multi-agent orchestration and retrieval work
   shown as an explorable network, each node a real capability with its numbers.
3. Iris's own concept, if it's stronger.

## Craft rules

- Every fact is real HTML, readable without WebGL, JavaScript or motion. The 3D loads after the
  main content paints, and nothing gates the content behind a loader.
- Phones are first-class: the concept works on a mid-range phone with a lighter scene, not a
  cut-down desktop.
- Reduced motion is still beautiful, and loses nothing.
- Type: a distinctive display face with a readable text face; kinetic type in headings, never in
  reading text.
- No scroll-jacking that hides where you are, no sound by default, and nothing from the rubric's
  "fails on sight" list.
- Budgets: LCP within 2.5 s on a mid-range phone, no layout shift, interactions answered within
  200 ms, and the 3D in a chunk of its own with a stated byte budget.

## Technology (checked October 2026)

- **3D:** three.js 0.186, or React Three Fiber 9.8 with drei 10.7 on React 19. `WebGPURenderer` falls
  back to WebGL 2 by itself, but runs no GLSL `ShaderMaterial`, on either backend: write its shaders
  in TSL, or stay on `WebGLRenderer`. Firefox has no WebGPU yet. Models go through gltf-transform
  (Draco or meshopt, KTX2 textures).
- **Motion:** GSAP 3.15 is free in full, ScrollTrigger and SplitText included, for choreography.
  CSS scroll-driven animation is an enhancement only (no Firefox). Same-document View Transitions
  work in every major browser since October 2025, so use them between pages.
- **Skills the team has for this:** `threejs-*`, `web-design-guidelines`, `impeccable`, and with
  Chrome DevTools, `debug-optimize-lcp` and `a11y-debugging`.

## How it gets built

An L lane: Iris's direction comes first, as its own PR the owner approves, with the concept, the key
screens at 1440 and 390 px, a storyboard of the motion, and the budgets. Then M sprints build it a
section at a time, the hero first, and the site stays shippable after each.

## Sources

- [Awwwards annual winners](https://www.awwwards.com/annual-awards/winners)
- [Best three.js websites of 2026](https://www.utsubo.com/blog/best-threejs-websites-2026), Utsubo
- [Award-winning websites of 2026, judged by a juror](https://www.hontran.dev/blog/best-award-winning-websites-2026)
- [Migrating three.js to WebGPU](https://www.utsubo.com/blog/webgpu-threejs-migration-guide), Utsubo
- [GSAP pricing](https://gsap.com/pricing/): "GSAP is now 100% free"
- Browser support: the [web-features](https://www.npmjs.com/package/web-features) dataset, 3.43.0
