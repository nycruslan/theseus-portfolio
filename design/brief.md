# Design brief

The owner's direction for the portfolio's redesign. It changes only through the owner's PR. Who
the site is for and what it must prove are in `PRODUCT.md`; the research behind this brief, with
its sources, is `research/2027-redesign.md`; the scored references are in `calibration/`.

## The goal

A portfolio that wins a Site of the Day and convinces a board in seconds: spectacle first, yet
clean, easy to navigate and easy to understand, and new for 2027 rather than a remix of past
winners. The portfolio and the live crew are one experience.

## The direction to start from

The research recommends **draw the hull, then rebuild it at sea**:
- The first frame is a shipwright's lines plan. Its title block holds the owner's name, role and
  AI-at-scale proof as real text, readable within a second.
- The drawing lofts into a 3D hull, the one signature transition, which the live crew keeps
  rebuilding at sea, one plank per sprint.
- Work in progress is drawn in pencil and merged work in ink. A revision table records each plank:
  who drew, checked and tested it, and the owner's approval.
- The planks the crew replaced form a ghost hull: the archive, one click deep.

Iris may propose something stronger, with her reasons, on the canvas. The owner decides there.

## Guardrails

- **Novelty budget.** One signature transition, one live layer and one archive moment. Navigation,
  case studies, contact and the read view stay as familiar as any good site.
- **Facts first.** Every fact is server-rendered HTML at full opacity, readable without WebGL,
  JavaScript or motion. The 3D canvas is decorative, and the largest paint is text.
- **Wayfinding.** A labelled navigation that stays visible (five items at most), a URL for every
  view, Back closes what opened, a "Read as page" view, the camera moving between a few named
  viewpoints rather than flying free, and hints only when a visitor seems stuck.
- **Motion.** A Full / Calm / Off control and reduced motion, each with a composed still state;
  ambient motion can be paused; the signature transition plays once a visit and can be skipped.
- **The live layer.** Only real events, each with one mark; an honest rest state when the crew is
  idle; no visitor can start or steer the crew.
- **Not this:** indigo or purple gradients, glowing orbs, chat bubbles, self-typing terminals,
  anchors, ship's wheels or rope type, "Captain" copy, drivable worlds, tiny planets, and a
  preloader followed by an Enter button.
- **Budgets.** LCP within 2.5 s on a mid-range phone, INP within 200 ms, no layout shift; the 3D in
  a chunk of its own, loaded after the first paint; designed for 30 fps on phones, with quality
  that steps down by itself. The research's budget table has the detail.

## Technology (checked October 2026)

- three.js `WebGPURenderer` runs in every major engine and falls back to WebGL 2 by itself; write
  shaders in TSL, and keep the hull's planks in one instanced or batched mesh.
- React 19.3's `<ViewTransition>` is stable, with no Next.js configuration; CSS scroll-driven
  animation reaches Firefox 159 on 27 October 2026.
- GSAP is free in full; keep it to the signature transition. No Gaussian splats or physics engine
  in the first version.

## How it gets built

1. Iris puts the direction on a Design canvas: the key screens at 1440 and 390 px, the signature
   transition as a storyboard, the rest state and the read view.
2. Iris recommends one direction and the build starts on it. The owner may pick another or
   comment on the canvas, and Iris revises.
3. Quill's contract splits the build into M sprints, the hero first, and the site stays shippable
   after each. The portfolio shows the crew from the Studio's data; the Studio stays its own app.
