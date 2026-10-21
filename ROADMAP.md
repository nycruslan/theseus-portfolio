# Roadmap

Quill owns this list. Atlas takes the top open item under Next, unless the owner set the goal, and
at the close-out ticks what shipped, with its sprint and PR. Keep items small enough for one sprint.

## Done

- [x] Design tokens: a color palette and a fluid typography scale in `app/globals.css`.
- [x] Dark mode that follows the system preference, with accessible contrast in both themes. (Sprint 2, PR #12.)
- [x] Project cards. (Sprint 3, PR #16: `components/project-card.tsx`, `e2e/cards.spec.ts`.)
- [x] Accessibility pass: landmarks, focus styles, skip link, zero axe violations. (Sprint 4, PR #17: `e2e/keyboard.spec.ts`, `e2e/invariants.spec.ts`.)
- [x] Section reveal motion on scroll, off under reduced motion. (Sprint 5, PR #22: `e2e/reveal.spec.ts`.)
- [x] Open Graph image from the profile. (`app/opengraph-image.tsx`, `e2e/smoke.spec.ts`.)
- [x] Education and stack. (Sprint 6, PR #27: `e2e/profile-sections.spec.ts`.)
- [x] The 3D hero: a static SVG half-model (sprint 8, PR #31) and its WebGL upgrade (sprint 10, PR #35), on the contracts of sprints 7 and 9. (`e2e/hero.spec.ts`, `e2e/hero-3d.spec.ts`.)
- [x] Stack separators. (Sprint 11, PR #36.)
- [x] Watch the team build: `/sprints` (sprint 13, PR #39) and the home page's build-log line (sprint 14, PR #43), on sprint 12's contract. (`e2e/sprints.spec.ts`, `e2e/sprints-entry.spec.ts`.)

## Next (highest first)

- [ ] Redesign (L, the owner's goal, 2026-10-20): an impressive portfolio on the direction in
  `design/brief.md`, measured against the references in `design/calibration/`. Iris's direction
  comes first, in a PR of its own the owner approves (concept, key screens at 1440 and 390 px, a
  motion storyboard, budgets); then M sprints build it a section at a time, the hero first.
  - Direction and contract: sprint 15, PR #47 (`.crew/sprint/15/direction-iris.md`, prototype in
    `prototype/`, Quill's `contract.md`): "the log of the Theseus", a ruled ship's log with the hull of 22
    planks, one replaced per sprint, copper the newest; Besley and Libre Franklin. Build B1-B5, the hero (B1, M)
    first with Probe's checks 1-11 red first. Waits for the owner to accept it by merging #47 (11 decisions).
    Follow-up: Iris's environment line in memory (Lens nit).

- [ ] A share card for `/sprints` (S): the page sets its own `openGraph` and `twitter` metadata, which
  drops the inherited `opengraph-image`, so a shared link shows no image while it declares
  `summary_large_image`. Give the route an `opengraph-image` (the root's, or its own) and check
  `og:image` beside the page's other metadata checks.
- [ ] Re-arm the placeholder guard (S, Probe only): `e2e/content.spec.ts`'s `test.fixme` becomes
  `test` again; content has had no `TODO(owner)` since the 2026 facts landed. A tightening; run
  scope.mjs's weakening rules on it first. Fits as a rider in any sprint that has Probe.
- [ ] A not-found page in the site's style (S, after B1 sets the type): today Next's default 404
  ignores the tokens and fonts, has two titles and no way home. Fits with the redesign's B-sprints.
- [ ] The build log's goals as copy (S): entries print internal shorthand, such as size tags that
  repeat the size line ("(L)"), contract numbers and file paths. Strip a trailing size tag in
  `lib/sprint-log.ts`, and write future `goal` fields for visitors (the sprint skill's Close).
- [ ] Leftovers to check once B1 replaces the hull, and drop if it settles them: `mountHull`'s
  teardown and a reduced-motion change mid-visit (`components/hero-gl.ts`); retina ticks at the bow
  tip (`.crew/sprint/10/review-iris.md` item 3); the font-swap CLS on `/`; C14's draw-count check
  under load (`e2e/hero-3d.spec.ts`).
- [ ] Small follow-ups (S, as riders): the stack dot vanishes in forced colors
  (`forced-colors:before:bg-[CanvasText]`) and `overflow-hidden` clips every side (Lens, sprint 11);
  the build-log spec's raw U+00A0 as an escape (Probe); grouping the build log past about 30 entries
  (Quill).
- [ ] Skip link decision (S): nothing focusable comes before the first project card, so the link
  can't save a Tab however `main` is cut. B2's navigation may answer it; otherwise keep it as
  convention and close this, or retarget it. Removing it would weaken `keyboard.spec.ts`, which is
  the owner's call.
