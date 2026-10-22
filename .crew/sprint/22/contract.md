# Sprint 22 contract: B1, the sheet in 2D

Quill, 2026-10-22. Milestone B1 of the redesign (`ROADMAP.md`), on the direction the owner approved
(`.crew/sprint/17/direction-iris.md`, frames in `.crew/sprint/17/design/`). This is the first of the
two owner demos, so the owner sees it on this PR's Vercel preview and approves the retirements below
in this PR.

## Outcome

A visitor who opens `/` sees a drawing sheet. At the top is a labelled bar, then the hull's lines plan
with every plank the crew has replaced drawn and numbered. Below it are the title block and the
revision block. The title block carries the owner's name as the largest text on the page, his role,
the first two sentences of his bio and his contact links. The revision block shows who drew, checked,
tested and approved the latest sprints, read from their retros. Everything today's page says is still
on it, as server-rendered HTML that needs no JavaScript and never moves. Nothing is copper, because
nothing on the site is live yet.

## The calls I made

- **No motion control in B1.** The bar has no Full/Calm/Off control. B1 has no 3D and no live layer,
  so Full and Calm would look exactly like Off, and a control that changes nothing is a broken promise
  to a visitor. Everyone gets Off, the state the `motion-off.webp` frame shows. The control comes in
  B3 together with the 3D it controls. The owner can overrule this at the demo.
- **Links to routes not yet built are left out.** The bar is the wordmark "Theseus" (plain text, since
  it would link to the page you're on), then **Work** (`#work`), **Log** (`/sprints`, which already
  exists; B5 moves it to `/log`) and **Contact** (`#contact`). Crew (B4) and Read as page (B2) are
  omitted, not stubbed: a hiring executive who clicks into a 404 leaves. Each arrives with its route.
- **The bar is on `/` only.** `/sprints` keeps its own header and back link until B5 rebuilds it as
  `/log`. It takes the new fonts, tokens and ink links, and nothing else changes there.
- **The facts stay as they are, restyled only.** Work (today's Experience, renamed so the bar's label
  lands on a heading that says the same thing), Projects (still the cards), Stack, Education and
  Contact keep today's markup and order below the sheet. They change only through the new tokens,
  fonts and ink links. B2 lays them out as the `work-*.webp` frames show, with Detail A.
- **The whole bio stays on the page.** Its first two sentences go in the title block, and its third
  ("This site is where a team of AI agents shows what it can ship on its own.") is the revision
  block's caption, as in `main.webp`. The home line "Build log · N sprints" becomes the revision
  block's "All N revisions in the Log" link, so the count stays.
- **The revision block has no Date column.** No retro holds a date: the frames used GitHub's merge
  times, which were looked up by hand. See "Needs owner decision".
- **On phones the planks are drawn but not numbered.** No frame shows Off at 390: `hero-390.webp`
  draws only the body plan, which has no planks. At a 358 px column a lift is about 8 px tall, which is
  too small for an 11 px number. So below 768 px the profile is drawn whole, with every plank's state
  shown by its fill, and the revision block carries the numbers.
- **The skip link stays.** It is the first stop and jumps past the bar to `main`. With a bar in front,
  it's worth more than it was.

## Data rules (the page and Probe's oracle implement these word for word)

- **Planks.** The 22 planks are `planks()` from `.crew/sprint/17/render/hull.mjs`, ported to `lib/`
  next to `lib/half-model.ts`'s geometry, with the same ids `"k.j"`. `k` is the lift, counted from the
  deck (0) to the keel (6). `j` is the plank within the lift, counted from the stern (0). Lift `k` has
  `BUTTS[k].length + 1` planks. The merged sprints are the valid retros (`readSprintLog()`), in
  ascending sprint number. The k-th of them seats plank `ORDER[(k-1) mod 22]`, where `ORDER` is
  `5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.2 3.1 4.1 2.2 5.0 3.3 0.0 1.0`
  (hull.mjs line 117). A plank is labelled with the last sprint to seat it. A plank no sprint has
  seated is original. "Replaced" is min(n, 22) and "original" is 22 minus that.
- **Revision rows.** These are the 5 newest valid retros, newest first. Each row has five cells,
  worked out as follows:
  - **Rev** is `sprint`.
  - **Description** is the `goal` as `/sprints` shows it, from `presentGoal`, never truncated.
  - **Drawn** comes from the retro's `agents[].role`. The roles map to names: `engineer` is Forge,
    `creative-engineer` is Pixel, `design-director` is Iris, `product-owner` is Quill and
    `qa-engineer` is Probe. If Forge or Pixel is present, Drawn lists whichever are, in that order.
    Otherwise it lists Iris and Quill, those present, in that order. Otherwise it is "—".
  - **Checked** is "Lens" when `lens.runs` is a positive integer, or when the legacy
    `lens_important_findings` is a number. Otherwise it is "—".
  - **Tested** is "Probe" when `qa-engineer` is among the roles. Otherwise it is "—".
  - **Approved** is "Owner" when the entry's `ownersCall` is true (`needs-owner` in `outcome`, as
    `lib/sprint-log.ts` and C12.4 already read it). Otherwise it is "Gate".

  A missing or malformed field means "—" or "Gate". It never throws.

  Today's data reproduces the owner's call 3 exactly: Owner for 1, 2, 7, 9, 10, 12 and 15, and Gate
  for every other sprint. This is a fact that holds after the merge: a retro reaches `main` only
  inside its merged PR, and a `needs-owner` PR is one only the owner could merge.

## Checks

Each check is shown in a browser against the preview or `pnpm test:e2e` (Probe's specs). Checks
B1.1 to B1.3 are what the owner judges first at the demo.

**B1.1 The first screen says who and what.**
- At 1440 × 900, the h1 (`profile.name`), the headline, the bio's two sentences, the title block's
  contact links and the revision block's rows are all wholly inside the first viewport (as in
  `main.webp`).
- At 390 × 844, the h1, the headline, the two sentences and the title block's contact links are
  wholly inside it (as in `hero-390.webp`, where contact sits at about y 680).
- The h1's computed font size is the largest of any text on `/`.
- Shown by: a screenshot at each size, and Probe's rects.

**B1.2 The title block is the owner's words, verbatim.**
- `main > header` holds:
  - the h1;
  - `profile.headline`;
  - `profile.location`;
  - `profile.bio` split after each ". ", with parts 1 and 2 joined by a space;
  - every `profile.links` item, as label and href.
- The revision block's caption is the remaining part.
- In DOM order, the h1 comes before the drawing's legend and the revision block.
- Shown by: text compared with `content/profile.ts` imports, never copies.

**B1.3 The labelled bar.**
- A `<nav>` with an accessible name sits in a `<header>` before `main`. In order it holds the wordmark
  text "Theseus" (not a link), then the links Work → `#work`, Log → `/sprints` and Contact →
  `#contact`, and no other link or button.
- Both fragment targets exist.
- Every link in the bar is at least 24 × 24 px at 390 px, and the bar doesn't overflow at 320 px.
- Following each link from the bar lands on its target.
- Shown by: clicks in the browser.

**B1.4 The lines plan, with the planks drawn.**
- One `[data-plan]` element, `aria-hidden="true"`, holds inline SVG that is in the HTML response of
  `/`. It contains no focusable element, and nothing in its SVG is hit by `elementFromPoint`.
- It holds exactly 22 rendered `[data-plank="k.j"]`.
  - A seated plank carries `data-sprint`, and its label follows the plank rule above (checked against
    Probe's own reading of the retro files and the ORDER copied into the spec).
  - An original plank carries no `data-sprint`.
  - Each lift has `BUTTS[k].length + 1` planks, with `BUTTS` imported from `lib/half-model.ts`.
- From 768 px up, the profile, half-breadth plan and body plan are drawn as in `motion-off.webp`, and
  every seated plank shows its number.
- At 320, 390 and 1440 px, every plank's box is wholly inside the viewport, with none cropped.
- Text in the drawing has these properties:
  - its fill is `--foreground` or `--muted`;
  - its rendered size (font size × the SVG's scale) is at least 11 px;
  - a plank number has a contrast of at least 4.5 against its plank's fill, in both schemes.
- The legend is HTML text. It names the two states the drawing shows (seated, original) and no state
  B1 doesn't have.
- The line "22 planks: R replaced, O original" is HTML text, with R and O from the rule.

**B1.5 The revision block, from the retros.**
- `section[aria-labelledby="revisions"]` has the h2 "Revisions", the caption from B1.2 and a
  `<table>` with `<th scope="col">` headers Rev, Description, Drawn, Checked, Tested and Approved.
- Its 5 body rows match the data rules above for Probe's oracle of the retro files.
- It has one link, "All N revisions in the Log" → `/sprints`. N equals the number of valid retro files
  and the number of entries `/sprints` renders.
- The same rows show at every width, and nothing overflows at 320 px.
- A reader unit check (fixtures, like C12) pins the role rule, and the Owner set {1, 2, 7, 9, 10, 12,
  15} for sprints up to 21.

**B1.6 Copper means "live now", so B1 shows none.**
- On `/` and `/sprints`, in both schemes, nothing resolves to `--accent`:
  - at rest, with each link hovered and with each link focused;
  - in `color`, `background-color`, border, outline or `text-decoration-color`;
  - in SVG `fill` or `stroke`.
- Links are `--foreground`, underlined.
- The focus ring is 2 px of `--foreground`, 2 px out (`tokens.webp`).
- The project cards' hover and focus states use ink, not copper.

**B1.7 Nothing today's page says is lost.**
- Below the sheet, the facts' h2 ids are, in order, `work`, `projects`, `stack`, `education` and
  `contact`. The first reads "Work".
- Every role's title, company, period and summary appears, as does every project, stack item,
  education entry and contact link, verbatim from `content/profile.ts`.
- The JSON-LD Person stays.
- Together with B1.2 and B1.5, this accounts for every fact `/` shows on `main` today.

**B1.8 It needs no script and nothing moves.**
- With scripts off, `/` has the same title block, revision rows, 22 planks and facts as with scripts
  on, and the `[data-plan]` rect is the same.
- With motion allowed, `document.getAnimations()` is empty at load, 2 s later, and after scrolling to
  the bottom and back.
- Layout shift is 0 over load plus 2 s, web fonts included, at 390, 1024 and 1440.
- Under print media, the drawing and every fact are visible.
- Under forced colors, the drawing still shows: its strokes differ from the page's background.
  Sprint 20's lesson applies, so compare with the background, not with "transparent".

**B1.9 LCP is text.**
- The LCP element is in `main > header` (the h1, or the bio at 390), not in `[data-plan]`, with no
  url. It lands within 2,500 ms at 4× CPU, at 390 × 844, 1024 × 768 and 1440 × 900.
- This is hero C5's harness, retargeted.
- The 1.5 s target is reported, not gated.
- The direction expects the name at 1440, but in `main.webp` the name and the bio paragraph are
  within about 10% of each other in area. Report which one wins.

**B1.10 One type family.**
- Sofia Sans sets the text and Sofia Sans Extra Condensed sets the name, both through
  `next/font/google`.
- `/` loads exactly two woff2 files, together at most 86,016 B. The display face is preloaded. Geist
  is gone.
- `/sprints` uses Sofia Sans only, so its C7.1 ("one font", weights 400/500/600, steps sm, base, lg and
  2xl) stands unedited.

**B1.11 The tokens carry the new palette.**
- The five color tokens keep their names, with the direction's values: `--background` is film,
  `--foreground` is ink, `--muted` is graphite, `--accent` is copper and `--rule` is rule, in both
  schemes.
- `lib/site.ts` and `app/icon.svg` change with them, and the invariants check that.
- The new tokens `--pencil`, `--card` and `--card-old` are for lines and fills only, never text.
- The name is set in a new step `--step-3xl`, fluid from about 60 px at 390 to 104 px at 1440. The
  other five steps may be retuned to the direction's sizes but keep their names.
- Iris owns the values. These are the names the specs read.

## Budgets that apply to B1

| Measure | B1 budget | Ground |
|---|---|---|
| LCP | ≤ 2,500 ms at 4× CPU, text, not in the drawing (target 1.5 s, reported) | direction; hero C5's harness |
| CLS | 0 over load + 2 s, fonts included | direction. next/font's fallbacks are size-adjusted: both families are in next 16.4.0's `capsize-font-metrics.json` (checked) |
| INP | n/a: B1 has no handlers of its own | — |
| JS to read the facts | 0 KB: scripts off shows everything (B1.8). `/` ships no client component: its script bytes are within 2,048 B of `/sprints'` | direction; hero-3d C15's slack over `/_not-found` |
| Fonts | 2 latin variable woff2, ≤ 86,016 B together, display face preloaded | measured this sprint: Google serves 40,372 B (Sofia Sans) + 40,520 B (Extra Condensed) = 80,892 B, matching the direction's 40.4 + 40.5 KB |
| Drawing markup | `[data-plan]` outerHTML ≤ 32,768 B at 1440 | measured this sprint from sprint 17's `linesPlan` (Off state, 21 merged): 70,314 B raw with 2-decimal polylines, 38,342 B snapped to whole pixels, 12,259 B gzip. Spline paths, as `lib/half-model-svg.ts` already writes them, get it under |
| 3D chunk, draws, geometry, frame time, loft | not B1 (B3) | — |

The fonts are sourced from `next/font/google`, which downloads the woff2 at build time and
self-hosts it, as Geist is today. No Sofia woff2 is in the repo: sprint 17's render expected them in an
uncommitted sibling `fonts/` folder, and the only woff2 files committed are sprint 15's Besley and
Libre Franklin. CI and Vercel already fetch Geist this way.

## The roadmap's riders

| Rider | Disposition |
|---|---|
| `mountHull`'s teardown and a reduced-motion change mid-visit | **Drops.** `components/hero-gl.ts` is deleted. B3's contract carries both as checks on the new 3D |
| Retina ticks at the bow tip (sprint 10 review, item 3) | **Drops.** The old hull is gone |
| Font-swap CLS on `/` | **Rides,** settled by B1.8's CLS 0 with fonts |
| C14's draw count under load (`hero-3d.spec.ts`) | **Drops** with that spec. B3's contract carries the ≤ 8 draws budget |
| The skip link | **Stays,** first stop, past the bar. `keyboard.spec.ts` is unedited |
| C9.5's selector from `ENTRIES` (Lens, sprint 21) | **Rides:** Probe is in `sprints.spec.ts` for C4.3 and C7.2 anyway |
| Group `/sprints` past about 30 entries | Stays on the roadmap: there are 21 entries now, and it's B5's route |

## Check disposition

There are 107 tests in `e2e/*.spec.ts`, counted by title, with a per-scheme or per-width template
counted once. **70 keep, 12 rewrite, 25 retire.**
- A rewrite keeps its assertions on the new object.
- A retirement or a loosened number needs the owner's approval in this PR, in the batches A, B and C
  below.
- When a spec is retired, `e2e/webgl.ts` and `e2e/pixels.ts` lose their last importers, and knip
  scans `e2e/`, so Probe deletes them too. B3 brings its own harness.

| File | Test | Disposition | Reason |
|---|---|---|---|
| cards.spec.ts | all 5 (one per project; whole card is link; tokens; reduced motion; reflow) | keep | The cards stay in B1. Their hover and focus change from copper to ink, still tokens |
| content.spec.ts | no value marked TODO(owner) renders | keep | |
| hero-3d.spec.ts | C10 upgrade, C11 pose, C12 rest, C13 same object, C14 fallbacks, C15 weight, C17 harness | **retire (A)** | The WebGL hull is removed. B3 brings a new 3D with its own contract |
| hero.spec.ts | C1 place and role, C2 footprint 688 × 138, C3 hull's tips, C7 tones and copper plank, C8 degrades and is gone in forced colors | **retire (A)** | These describe the old half-model. B1.4 and B1.8 replace them, and forced colors now keeps the drawing |
| hero.spec.ts | C4 still and steady | rewrite | On `[data-plan]`: CLS 0, same rect without scripts, nothing animates (B1.8) |
| hero.spec.ts | C5 LCP stays text | rewrite | On `[data-plan]`, as B1.9 |
| hero.spec.ts | C6 weight | rewrite, **loosened (A)** | Drawing in the HTML response stays. The byte budget goes from 8,192 B (7 lifts) to 32,768 B (the lines plan), and the owner approves the new number |
| hero.spec.ts | C9 hard gates | rewrite | On `[data-plan]`: axe clean, nothing hit or focused, no console error |
| invariants.spec.ts | tokens on :root; text from tokens, ≥ 16 px; contrast; axe; no-JS background; address bar; palette vs site.ts and icon (each per scheme); light vs dark; fluid scale; 320 overflow; 24 px links; landmarks and headings | keep | All hold on the sheet. `helpers.ts` `STEP_TOKENS` gains `--step-3xl`, so the same assertions cover the name |
| invariants.spec.ts | no color literal or palette utility | rewrite | The declaration allowance adds `--pencil`, `--card` and `--card-old`. Literals still live only in token declarations |
| keyboard.spec.ts | all 5 (skip link first; skip lands on main; Tab order and rings; card focus as hover; forced-colors ring) | keep | B1's order reaches Contact's first link on the 11th Tab, inside `tabUntil`'s 12. If the build adds a stop, raising that bound is a harness change, not a weaker test |
| profile-sections.spec.ts | C1 section order | rewrite | Ids become `work, projects, stack, education, contact` after the sheet's `revisions`. The Stack and Education text asserts stay |
| profile-sections.spec.ts | C2, C3, C4, C5, C6, C8 | keep | |
| reveal.spec.ts | C1 to C8 | **retire (B)** | The direction says "nothing the visitor reads ever moves, in any mode", and B1 is Off for everyone, so the heading rise goes. Every test here first requires the reveal to exist. B1.8 replaces them with a stricter check that nothing animates. If the owner refuses B, the reveal's CSS block stays and these specs return with `work` |
| smoke.spec.ts | all 4 | keep | |
| sprints-entry.spec.ts | C14.1 the home line's count | rewrite | Moves to "All N revisions in the Log" in the revision block. Still N = retro files = `/sprints` entries |
| sprints-entry.spec.ts | C14.2 link look | rewrite | Underlined, 24 px tall at 320 and 390, in `--foreground` (owner's call 2) |
| sprints-entry.spec.ts | C15 both ends agree | rewrite | From the revision block's link. The back link and count asserts stay |
| sprints-entry.spec.ts | C14.3 follows the bio; C14.4 hull above the fold, 64 px from the header; C14.5 Tab: skip, home link, first card; C14.6 five sections and one link to `/sprints` | **retire (C)** | The line, the hull and the single link are gone. They're covered by B1.1, B1.3, B1.5, profile-sections C1 and keyboard.spec's DOM-order test |
| sprints.spec.ts | C1.3 main opens like the home page's | **retire (C)** | `/`'s main is now the sheet, not the column. B5 designs `/log`'s frame |
| sprints.spec.ts | C4.3 the PR link | rewrite | `--foreground` instead of `--accent` (owner's call 2) |
| sprints.spec.ts | C7.2 accent on links only | rewrite | Stricter: `--accent` on nothing, since nothing on `/sprints` is live |
| sprints.spec.ts | C9.5 forced-colors bullets | rewrite | Rider: the selector is taken from `ENTRIES`, same assertion |
| sprints.spec.ts | the other 37 (C1.1, C1.2, C2.x, C3.x, C4.1, C4.2, C4.4, C4.5, C5.x, C6.x, C7.1, C7.3, C8.x, C9.1 to C9.4, C10, C11.x, C12.x, C13.1) | keep | `/sprints` keeps its structure. C7.1 holds with Sofia Sans as the one family. C12's `view()` picks fields, so extending `SprintEntry` breaks nothing |

**For the owner to approve:**
- **(A)** 12 hero checks retire, and C6's budget rises to 32,768 B.
- **(B)** reveal C1 to C8 retire.
- **(C)** sprints-entry C14.3 to C14.6 and sprints C1.3 retire.

## Out of scope

- **B2:** `/read` and "Read as page"; the facts laid out as `work-*.webp` shows, with Detail A and
  72 px section heads; the not-found page.
- **B3:** the 3D card model, the loft, the Full/Calm/Off control, and the 30 fps spike.
- **B4:** `/crew` and the Crew link; the live layer (pencil plank, copper, "drawing now", "Crew
  resting", Replay).
- **B5:** `/log`, the ghost hull, the bar on the log, and grouping the entries.
- **Also out:**
  - the social card's restyle;
  - the favicon's copper mark, which the invariants pin to `--accent` and which is a follow-up for
    Iris.

## Needs owner decision

1. **Approve the retirements, batches A, B and C, and C6's new budget.** Without them, B1 can't
   replace the page.
2. **The Date column.** No retro records a date. Two ways to add it: have the sprint skill's close-out
   write the day into `retro.json` (the skill is your path), or let the build ask GitHub for merge
   times (a network call in every build). Or leave it off. B1 ships without it.
3. **For the demo, not blocking:** the motion control waits for B3, and Crew and Read as page wait for
   their routes. Say so if you'd rather see them stubbed.

## Needs decision (Iris)

- The 390 Off layout, which no frame shows. The profile must be whole, with no plank numbers below
  768 px.
- The dark-scheme plank numbers. Ink (`#e2eae9`) on card (`#dfe4e2`) is unreadable, and B1.4 requires
  4.5:1.
- Token values for `--step-3xl`, the retuned steps, `--pencil`, `--card` and `--card-old` in both
  schemes. `tokens.webp` gives dark card as `#dfe4e2`, while sprint 17's `drawing.mjs` uses `#e0ded8`.
