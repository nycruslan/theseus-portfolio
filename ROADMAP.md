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
- [x] B3: the 3D card model and the registered loft, as Quill planned it in
  `.crew/sprint/24/b3-plan.md`. Once the 3D exists, Full is the default (the canvas's
  `Motion-Control.html`), and reduced motion starts at Calm.
  - [x] Sprint 24 (M): Pixel's spike. The stack measured in Turbopack (A, WebGL, against B, WebGPU
    with the WebGL 2 fallback), the hull's triangles and draws, the registered loft prototyped, CPU
    frame time as a floor, and a recommendation (`.crew/sprint/24/contract.md`, S1 to S7). The
    30 fps phone budget is checked on the owner's phone at the demos; the cloud has none.
    (PR #71, merged 2026-10-23: Lens ship after one fix round; Pixel recommends A, WebGL, and the
    report is `.crew/sprint/24/spike/spike.md`. Left open: the owner's stack call, on sprint 25's
    PR.)
  - [x] Sprint 25 (M): the hull lifts off the drawing at 1024 px and up, once a visit, skippable,
    settled under reduced motion, 0 frames at rest, with no control yet. (PR #72, built over three
    runs on 2026-10-23: Lens ship after one fix round, Iris ship at 8.8/10, 152 of 152 checks; the
    contract is `.crew/sprint/25/contract.md` with decisions 7 to 16 in `decisions.md`.) **Its PR waits for the
    owner**, with the loft on its preview: the stack call, A (`WebGLRenderer`, built, 144,516 B gzip
    against the 250 kB budget; it departs from `design/brief.md`'s Technology section) or B
    (`three/webgpu`, 280,606 B in the spike, over the budget on Vercel's wire), and batch E, Iris's
    one-line revision descriptions at 1024 px and up (B1.5's check changed). Riding with sprint 26,
    which touches the same code: Lens's six nits on #72 (a lost WebGL context should return the Off
    sheet rather than leave the drawing hollow; `stop()` during `compileAsync`; a redraw before the
    model scrolls back into view after an off-screen resize or scheme change; B3.7's redraw count
    `toBe(1)`; B3.6's off-screen and hidden windows proven with a scheme switch; the bottom row's
    `min-height` under a classic scrollbar), Lens's nit on #72's fixed head (forced colours switched
    on mid-visit keep the lit canvas and hollow the forced-colours drawing: hide `[data-model]` under
    `(forced-colors: active)` and add it to the hollow and fade queries, or a change listener that
    stops the model as a narrowing does), and the full-page-capture teardown (decision 13).
  - [x] Sprint 26 (M): phones and tablets at 30 fps: DPR ≤ 1.5, ≤ 12k triangles, quality stepping,
    a still frame under 30 fps, scrolling through the canvas, the model on the drawing the page
    shows at every width. (PR #73, built over two runs on 2026-10-23: Lens ship with no fix round, Iris ship at
    8.8/10, 158 of 158 checks; the contract is `.crew/sprint/26/contract.md` with decisions 1 to 9
    in `decisions.md`.) Iris's call: `G_NARROW` 0.25 and `SETTLE_NARROW { dx: 0, dy: 26 }`, the
    settled hull its drawing's own length, and the phone's growth on e² so it arrives with the
    turn (decision 9). Sprint 25's riders are taken. Left open, for the sheet with the owner: the
    "Base" label straddling the shadow's tail on the narrow sheet (Iris's review); and the cold-
    cache fallback face, which scrolls the page 21 px sideways at 320 and wraps the nav at 390 on
    production today (`.rev`'s `td[data-label]::before` labels, likely), the next layout fix.
    Riding with sprint 27, which touches the model: Lens's four nits on #73 (a 768 px crossing
    during the build keeps the old cap, so `cross()` resets it before its early return; the canvas
    keeps the old drawing's size for the two guarded frames and after a lost context, so
    `[data-model]` gets `overflow: clip`; a phone's toolbar show/hide re-solves the loft at rest,
    to check at the demo and, if it shows, refit only on width or box changes; a stray JSDoc above
    `cardGeometry` in `lib/model/stage.ts`).
  - [x] Sprint 27 (M): the Full/Calm/Off control, remembered on the device; B2.3 and the keyboard
    Tab bound rewritten with the same assertions. (PR #74, built in one run on 2026-10-23: Lens ship with no fix round, after its first run died and CI's cap cancelled the suite until the owner re-ran both,
    Iris ship at 9.0/10, 166 of 166 checks; the contract is `.crew/sprint/27/contract.md` with
    amendments 1 to 3 and decisions 1 to 13 in `decisions.md`.) The hints set the default (`off`
    under Save-Data, `calm` under reduced motion, else `full`) and a press wins (decision 3); a
    press of Full replays the loft (decision 4). Iris's call: below 768 px the control sits at the
    drawing's foot, not the canvas's bottom strip, which the sheet no longer has (decision 8; her
    paragraph for the owner is on the PR). Riders taken: Lens's three code nits on #73, the two
    comment nits on #67, and the cold-cache fallback face at its cause (next/font's one-source
    fallback; decision 13). **The B3 demo is the owner's**, on #74's preview and then production:
    30 fps, the DPR ladder and the still frame on a GPU, the e² loft's feel, the dark hull under the
    warm lamp, the control, the toolbar show/hide at rest (Lens's nit on #73), the control's place
    against `hero-390.webp`, and the "Base" label under the shadow's tail on the narrow sheet.
    Riding with the next sprint that touches the loader (`components/model.tsx`): Lens's nit on
    #74 (with the WebGL 2 probe refused, pressing the already-pressed Off stores `off`, so a device
    that gains WebGL later stays Off unasked; `onClick={() => refused || press(value)}`, about
    3 B). Left open: the text face's fallback has the same one `local(Arial)` source (Forge, with
    the next sprint that touches the fonts); in forced colours with the model refused the control shows Full
    or Calm pressed while nothing can play (Iris); B2.10 has 10 B of headroom on `/`, so B4's client
    code reopens the script budget with the owner.
- [ ] B4: `/crew`, the crew at work, from the Studio's data.
- [ ] B5: `/log` and the ghost hull.
  - [x] Sprint 29 (M, notes only): Quill's plan, B5 as three M sprints
    (`.crew/sprint/29/b5-plan.md`), and B5a's contract ready for Probe and Forge
    (`.crew/sprint/29/b5-first-contract.md`). Taken beside B4 while #75 waits for the owner, since
    B5 reads the retros on main, not the Studio, and no B5 sprint waits for B4
    (`.crew/sprint/29/decisions.md`, 2). (PR #76, built in one run on 2026-10-24.) Answered here:
    the "group the build log past about 30 entries" rider (one table, 89 px a row at 390, no
    paging; day groups with B5b) and Lens's C9.5 selector nit (rides B5a).
  - [x] B5a (M): `/log` in 2D: the ghost hull in vellum (the 22 originals, each numbered by the
    first sprint that took it out), "Every revision" as a table of every merged sprint, a record
    per revision at `/log/<n>`, `/sprints` answering 308 to `/log`. (Sprint 30, PR #77, built in
    one run on 2026-10-24: Iris's three calls first (`.crew/sprint/30/notes-iris.md`: the profile
    alone, `--vellum` light `#d7e2e1` and dark `#3f4d52`, the record beside the table from 1024),
    Probe's B5.1 to B5.11 red first, Forge's build with one early-look round from Iris; Iris
    ship at 8.2/10, 157 of 157 checks; decisions 1 to 6 in `decisions.md`.) **Its PR waits for
    the owner:** batch F retires 23 tests and two assertions about `/sprints`' old column
    (`gate` reports `e2e/sprints.spec.ts` deleted: git doesn't see the rewrite as a rename).
    Riding with the next sprint that touches `/log`: Lens's two nits on #77 (three comments in
    `next.config.ts`, `lib/sprint-log.ts` and `app/layout.tsx` still say nothing reads the sprint
    folders at request time, while an unknown record address now runs `readSprintLog()` on the
    server, so the retros must stay traced; two stale memory lines, Iris's on the 404's face and
    Forge's citing `components/sprint-entry.tsx`); Iris's two cheap changes (the record's
    `h2` `text-wrap: pretty`; with B5b's Merged column, cap Description near 66ch or keep the
    table in the left column at 1440), and the unknown-record 404's scripts-off blank (Next's
    error shell; status and `noindex` are right). Left open: a Design row needs a public retro
    field (owner path, proposed in sprint 29's retro).
  - [ ] B5b (M): the merge record, `.crew/sprint/<n>/merge.json`, written by a crew script after
    each merge (owner path, with the skill's step, so its PR waits for the owner): the Merged
    column grouped by day, the time on each record, the lines figure. Opens by measuring whether
    Vercel's build has `.git`. Owner calls: closed sprints' rows; a public `design` retro field
    for Iris's score.
  - [ ] B5c (M): the ghost hull in 3D on `/log` under Full/Calm/Off, the control in `/log`'s bar,
    a plank opening its record (Pixel). Whichever of B4.4 and B5c comes first mounts the model on a
    second route. Lens's nit on #74 rides here if B4.4 hasn't taken it.

Riding along with the sprints that touch the same code:
- With the next sprint that touches the facts or the fonts: the text face's fallback over Arial's metric twins (sprint 27); Iris's cheap changes (the dark scheme's
  Detail A boxes on `--background`, after a look on a real phone; the project link's gap above the
  rule below 1024; the figcaption's gap at 390); the 404's first-visit paint in the fallback face
  (the prerendered 404 sends no font preload); the social card's typeface (a vendored TTF).
- B4's contract re-lays the phone bar: a fifth link (Crew) doesn't fit the row at 16 px (Iris,
  sprint 23).

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
