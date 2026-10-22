# Sprint 24 contract: B3's spike (Atlas)

**Size:** M, by the decision it carries: the stack B3 is built on, and whether the registered loft
works as the direction describes.

## Outcome

Before anyone builds the 3D card model, the crew knows from measurements in this repository's own
toolchain which three.js stack fits the direction's budgets, how many triangles and draws the hull
costs, and that the model can land on the inked profile and lift off it the way
`.crew/sprint/17/direction-iris.md` describes. The first build sprint then starts from numbers, as
sprints 8 and 10 did from the spikes of 7 and 9. Nothing a visitor sees changes in this sprint.

## The measurements (each cited in `.crew/sprint/24/spike/spike.md`)

- **S1 Chunk size, in Turbopack.** For option A (`WebGLRenderer`, `MeshStandardMaterial`,
  `BatchedMesh`, fat lines, a custom tween) and option B (`three/webgpu`, node materials,
  `BatchedMesh`, fat lines, the same tween), the production chunks a dynamic import of the scene
  loads after first paint, measured as `next build` emits them: minified, gzip and brotli bytes.
  Compared with the direction's budget (3D chunk ≤ 250 KB gzip after first paint) and with the
  research's esbuild numbers (`design/research/2026-ui-ux-and-3d.md`, section D: 136 and 245 KiB
  gzip). Vercel serves brotli to browsers that accept it.
- **S2 Geometry.** Triangles for the full hull (both halves of `lib/half-model.ts`, 22 planks, deck,
  shadow plane) at the desktop and phone quality levels, against ≤ 30k and ≤ 12k.
- **S3 Draws.** `renderer.info.render.calls` per frame ≤ 8, with every plank in one `BatchedMesh`
  carrying a per-plank state attribute (ink and card / original card / graphite / copper / vellum),
  the seams as one line batch, the deck and the contact shadow.
- **S4 Registration.** The first frame, orthographic, lands on the inked profile of
  `components/lines-plan.tsx` as the page draws it: at 1440 and 390, the model's outline differs
  from the SVG's by at most 1 CSS px, shown by a pixel diff of the two renders.
- **S5 The loft.** One camera move from orthographic to a 30° lens that holds the hull's framed
  size (the dolly-zoom in research B3), ending at the settled three-quarter pose: the hull's framed
  height stays within 2% through the move, shown by frames at 0, 0.25, 0.5, 0.75 and 1 at 1440 and
  390. The direction says 2.4 s with an exponential ease-out; the research proposes trying 1.2 to
  1.8 s. Record what each duration feels like in the frames and in the headless timing.
- **S6 Frame time.** CPU time per frame in headless Chromium at 4× CPU throttle for the loft and
  for a resting frame, with the caveat that its GPU is SwiftShader, so the number is a floor, not
  the phone's; and the quality-stepping design (DPR ≤ 1.5 on phones, 2 on desktop; triangle level;
  what steps down above 22 ms and up below 12 ms; the still frame under 30 fps).
- **S7 The recommendation.** A or B, in one paragraph for the owner, with what each costs the
  visitor (bytes on the wire, reach, the manual's "experimental" caveat on WebGPU) and a provisional
  choice for the first build sprint. The owner takes the final call at the B3 demo
  (`ROADMAP.md`).

## Budgets that apply

The direction's table: 3D chunk ≤ 250 KB gzip after first paint; ≤ 8 draws; ≤ 30k triangles
desktop, ≤ 12k phones; designed for 30 fps on phones; Off never loads WebGL; the page, the title
block and every word never move.

## Out of scope

Product code in `app/`, `components/` and `lib/`; the Full/Calm/Off control; Off's static render;
the material states' live data; `/crew` and `/log`; the Studio. A phone measurement: the cloud has
no phone, so the 30 fps budget is checked on the owner's at the demo, with quality stepping as the
net.
