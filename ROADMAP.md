# Roadmap

Quill keeps this roadmap in milestones: an outcome the owner can see, built as a sequence of
sprints, each one pull request that leaves the site whole. Atlas takes the current milestone's next
sprint, unless the owner set the goal, and at the close-out ticks it with its sprint and PR. Small
fixes and follow-ups ride along with the sprint that touches the same code.

## Now: the redesign

The site in `PRODUCT.md` and `design/brief.md`, built to the direction the owner approved on sprint
17's canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5) on 2026-10-21, with their four calls:
1. the model is white card;
2. copper means "live now" and nothing else, so links become ink;
3. the revision block's Approved column says what really happened: Owner or Gate;
4. Detail A stays.

The direction, its budgets and the build order are in `.crew/sprint/17/direction-iris.md`. Quill
writes each sprint's contract from them. Current UI/UX and 3D practice, with sources, is in
`design/research/2026-ui-ux-and-3d.md`. Its section B goes sprint by sprint, as input to weigh,
not a spec: the direction decides, and a visible change to it still needs the owner. The
owner sees the milestone at two demos, on the PR's Vercel preview: B1, which replaces today's
page, and B3, the signature moment.

- [ ] B1: the sheet in 2D. The labelled bar, the lines plan, the title block, and the revision
  block from the retros, with Off as everyone's default. It replaces today's home page, so its
  contract lists which live checks it keeps, rewrites or retires, and the owner approves the
  retirements in that PR.
- [ ] B2: the facts and `/read` ("Read as page"), and a not-found page in the site's style.
- [ ] B3: the 3D card model and the registered loft. It starts with Pixel's spike of the 30 fps
  phone budget, and Iris works beside Pixel on the loft's feel. Open decision for the spike:
  a three.js r186 WebGPU build with the scene's materials, batched mesh and lights is about 245 KiB
  gzip (about 251 kB, already at the limit), about 272 KiB with GSAP, so the brief's stack (WebGPU,
  TSL, GSAP) can't meet the 250 KB gzip budget. Measure the options in research section D (WebGL at
  about 140 KiB, or WebGPU counted as brotli at about 200 KiB) and take the choice to the owner
  with the B3 demo.
- [ ] B4: `/crew`, the crew at work, from the Studio's data.
- [ ] B5: `/log` and the ghost hull.

Riding along with the sprints that touch the same code:
- When B1 replaces the hull, check these and drop the ones it settles: `mountHull`'s teardown and a
  reduced-motion change mid-visit (`components/hero-gl.ts`), retina ticks at the bow tip
  (`.crew/sprint/10/review-iris.md` item 3), the font-swap CLS on `/`, and C14's draw-count check
  under load (`e2e/hero-3d.spec.ts`).
- The skip link: B1's labelled bar decides whether it stays, moves or goes (removing it weakens
  `keyboard.spec.ts`, which is the owner's call).
- On `/sprints`: group the build log past about 30 entries (Quill), and take C9.5's selector from
  `ENTRIES` in `e2e/sprints.spec.ts` (Lens's nit on sprint 21).

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
- [x] Share card for `/sprints`, and the placeholder guard re-armed. (Sprint 18, PR #52: `app/sprints/opengraph-image.tsx`, `e2e/sprints.spec.ts` C2.3, `e2e/content.spec.ts`.)
  - The layout's comment was fixed as a rider in sprint 19.
- [x] The build log's goals as copy: a trailing size tag such as "(L)" no longer prints. (Sprint 19, PR #53: `lib/sprint-log.ts`, `e2e/sprints.spec.ts` C4b and C12.7.)
  - The C4b block moved above the C5 banner as a rider in sprint 20.
- [x] The drawn dots show in forced colors, and the Stack list clips only sideways; the build-log
  specs' raw U+00A0 as escapes. (Sprint 20, PR #54: `app/page.tsx`, `components/sprint-entry.tsx`,
  `e2e/profile-sections.spec.ts` C8.)
- [x] The forced-colors checks cover what sprint 20 shipped: C8 asserts the Stack list clips
  sideways, and C9.5 checks the build log's bullets in forced colors. (Sprint 21, PR #55:
  `e2e/profile-sections.spec.ts` C8, `e2e/sprints.spec.ts` C9.5.)
