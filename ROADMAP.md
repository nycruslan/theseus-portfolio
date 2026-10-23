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

- [x] B1: the sheet in 2D. The labelled bar, the lines plan, the title block, and the revision
  block from the retros, with Off as everyone's default. It replaces today's home page, so its
  contract lists which live checks it keeps, rewrites or retires, and the owner approves the
  retirements in that PR. (Sprint 22, PR #62, merged 2026-10-22 with batches A, B and C approved.)
- [x] B2: the facts and `/read` ("Read as page"), and a not-found page in the site's style.
  - Sprint 23, PR #67, merged 2026-10-22 with batch D (the cards' whole-surface link) approved by
    the owner: Lens ship, Iris ship at 8.5/10, 141 of 141 checks. Its B2.10 is amended for `/read`
    (`.crew/sprint/23/decisions.md`, item 7).
- [x] Next upgrade: 16.4.0 to 16.4.2, for three advisories (two critical RCEs and a DoS). Done by
  the owner outside a sprint (PR #69, merged 2026-10-22), so it added no revision row. The revision
  block's height, which this item said had to be settled first, turned out not to block it: the
  block is capped at five rows and only a goal that wraps to two lines at 1440 adds height
  (`.crew/sprint/24/decisions.md`, items 2 and 3). The rule is a one-line goal, at most 78
  characters, in every retro; Iris's one-line descriptions with an ellipsis (her sprint 22 notes,
  section 8) stay a proposal for the next PR that waits for the owner, since B1.5's check changes.
- [ ] B3: the 3D card model and the registered loft, as Quill planned it in
  `.crew/sprint/24/b3-plan.md`. Once the 3D exists, Full is the default (the canvas's
  `Motion-Control.html`), and reduced motion starts at Calm.
  - [ ] Sprint 24 (M): Pixel's spike. The stack measured in Turbopack (A, WebGL, against B, WebGPU
    with the WebGL 2 fallback), the hull's triangles and draws, the registered loft prototyped, CPU
    frame time as a floor, and a recommendation (`.crew/sprint/24/contract.md`, S1 to S7). The
    30 fps phone budget is checked on the owner's phone at the demos; the cloud has none.
  - [ ] Sprint 25 (M): the hull lifts off the drawing at 1024 px and up, once a visit, skippable,
    settled under reduced motion, 0 frames at rest, with no control yet (contract draft:
    `.crew/sprint/24/b3-first-contract.md`). **Its PR waits for the owner's stack call**, with the
    loft on its preview: A departs from `design/brief.md`'s Technology section (the owner's file);
    B misses the 250 KB budget in either encoding on Vercel's wire (spike S1: Vercel's brotli is
    about gzip's size), fitting only at brotli 11, which Vercel doesn't serve. It also carries batch E, Iris's one-line
    revision descriptions at 1024 px and up (B1.5's check changes), for the owner to approve.
  - [ ] Sprint 26 (M): phones and tablets at 30 fps: DPR ≤ 1.5, ≤ 12k triangles, quality stepping,
    a still frame under 30 fps, scrolling through the canvas. The phone registers on the narrow
    profile phones already draw (the narrow sheet has had no body plan since sprint 22, so the
    canvas's `loft-390.webp` hand-off no longer applies); it opens with Iris's call on whether the
    settled pose grows the model beyond its 59 px drawing (spike S4).
  - [ ] Sprint 27 (S, or M if the phone strip moves): the Full/Calm/Off control, remembered on the
    device; rewrites B2.3 and the keyboard Tab bound with the same assertions. **The B3 demo.**
- [ ] B4: `/crew`, the crew at work, from the Studio's data.
- [ ] B5: `/log` and the ghost hull.

Riding along with the sprints that touch the same code:
- With the next sprint that touches the facts or the fonts: Lens's two nits on PR #67 (the stale
  font comments in `app/fonts.ts` and `app/layout.tsx`, and the focus-ring comment in
  `app/globals.css` that cites the deleted card link); Iris's cheap changes (the dark scheme's
  Detail A boxes on `--background`, after a look on a real phone; the project link's gap above the
  rule below 1024; the figcaption's gap at 390); the 404's first-visit paint in the fallback face
  (the prerendered 404 sends no font preload); the social card's typeface (a vendored TTF).
- B4's contract re-lays the phone bar: a fifth link (Crew) doesn't fit the row at 16 px (Iris,
  sprint 23).
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
