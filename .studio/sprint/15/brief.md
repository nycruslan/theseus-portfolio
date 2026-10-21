# Sprint 15: the redesign's direction

**Lead:** Atlas. **Goal:** the roadmap's top open item, "Redesign" (the owner's goal of 2026-10-20,
written into `ROADMAP.md` and `design/brief.md`): an impressive portfolio on the direction in
`design/brief.md`, measured against `design/calibration/`. **Size:** L, direction step. No product
code, no `e2e/` change.

`design/brief.md` ("How it gets built") says Iris's direction comes first, as its own PR the owner
approves, with the concept, the key screens at 1440 and 390 px, a storyboard of the motion and the
budgets. Then M sprints build it a section at a time, the hero first, and the site stays shippable
after each. This sprint is that PR.

## Steps

1. **Iris (`iris`): direction.** `.studio/sprint/15/direction-iris.md`, with:
   - the concept: weigh the brief's candidates (the ship of Theseus, the platform as a living
     system, her own) and recommend one, with what she rejected and why;
   - type (a display face and a text face, with their licence and byte cost), palette (kept or
     moved from today's tokens), layout system;
   - the key screens at 1440 and 390 px: a static prototype in `.studio/sprint/15/prototype/`
     (self-contained HTML/CSS, fed by the real `content/profile.ts` facts, never edited), with
     screenshots in the scratchpad or `.studio/screenshots/` (never in git), each named in the
     direction with what it shows;
   - the motion storyboard: scene by scene on scroll, what the camera and type do, and what
     reduced motion and no-WebGL show instead;
   - budgets: LCP, CLS, INP, the 3D chunk's bytes, fonts' bytes, draw calls, a mid-range phone's
     scene;
   - the order of the build in sections, hero first, each leaving the site shippable;
   - what it must never look like (the rubric's fails-on-sight list, applied).
2. **Quill (`quill`): the contract.** `.studio/sprint/15/contract.md` on Iris's direction: the outcome,
   the build split into M (or S) sprints in order, and for the first one (the hero) numbered checks a
   browser can show, each groundable in the prototype or the current page; out of scope; risks; and
   "Needs owner decision".
3. **Lens in CI** on the PR, labelled `needs-owner` and `review`. Two fix rounds at most.
4. The owner accepts the direction and contract by merging. The build is later sprints'.

## Rules

- `content/` is the owner's: the prototype shows its facts as they are. Team copy (ledes, labels)
  is marked as such for the owner.
- The prototype is a design artifact in the sprint folder, not product code: no import from it into
  `app/` or `components/`.
