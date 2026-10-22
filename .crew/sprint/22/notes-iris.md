# Sprint 22, notes from Iris: B1, the sheet in 2D

The build spec for Forge. Source of truth: the canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5),
approved by the owner on 2026-10-21 with four calls (white card; copper = live now only, links are ink;
Approved says Owner or Gate; Detail A stays). Its artboards B1 draws from are copied verbatim to
`canvas-extract/` in this folder: `Main.html` (1440), `Hero-390.html`, `Night-1440.html` (dark),
`Rest-1440.html` and `Rest-390.html` (no sprint running), `Tokens.html` (type, colour, lines),
`Work-1440.html` and `Work-390.html` (the facts), `Motion-Control.html` (B3's control, for reference).
Their `/_blob/` images are the canvas's private renders; the same frames are
`.crew/sprint/17/design/*.webp`. The drawing's maths is `.crew/sprint/17/render/hull.mjs` and
`drawing.mjs` (a scratch port of `lib/half-model.ts`; port the drawing into `lib/`, don't import from
`.crew/`).

**B1 is:** the labelled bar, the lines plan with the planks drawn in 2D, the title block, the revision
block from the retros, the facts below the first frame, both colour schemes, the new type. No motion of
any kind. **B1 is not:** 3D, the loft, the Full/Calm/Off control (see 9), `/read`, `/crew`, `/log`,
the live layer, Detail A. Where this note says "decided", the canvas was silent and I chose; the list
is in 13.

## 1. Colour tokens (canvas: `Tokens.html`, "Day: drafting film" and "Night watch")

Both schemes ship in B1: production has dark mode, and B1 may not be worse than production anywhere.
Hex values, as today's `globals.css` does (computed styles come back as rgb()).

| Token | Light | Dark | Job |
|---|---|---|---|
| `--film` | `#eaf1ee` | `#10191c` | The ground. body background, bar, blocks. |
| `--ink` | `#111c22` | `#e2eae9` | Text, links, outlines, seams, frames, rules that structure. 15.1:1 / 14.6:1 on film. |
| `--graphite` | `#555c61` | `#a3adb1` | Secondary text, the pencil state's text, DWL and base lines. 5.9:1 / 7.8:1. |
| `--pencil` | `#878d91` | `#6a7377` | Construction lines and the hatch strokes only. Never text. 2.9:1 / 3.7:1. |
| `--rule` | `#bfcac7` | `#323d40` | Row hairlines and the contact line's rule. Never text. Selection ground. |
| `--copper` | `#9e441d` | `#ee8f63` | Live, this minute. **Unused in B1** (there is no live layer yet); define it, paint nothing with it. |
| `--card` | `#fbfaf7` | `#dfe4e2` | A seated plank (merged sprint). |
| `--card-old` | `#d9e0dc` | `#a9b2b0` | An original plank, not replaced yet. |

Two hatches, both at −50°: the drawing's pencil plank is an SVG pattern, 5 px period, a 1.1 px
`--pencil` line on `--film` (`drawing.mjs` line 170); text that sits on a hatch (the Rev cell, the
phone strip's chip, the legend swatch) uses the CSS one,
`repeating-linear-gradient(-50deg, var(--film) 0 3px, <stripe> 3px 4px)` with stripe `#aab0b3`
light / `#3d474b` dark (ink on the stripe stays 7.9:1). Vellum (`#cfdcdc` at 0.7 light) is B5's; don't
define it yet.

Token parity: `lib/site.ts` LIGHT/DARK (background → film, foreground → ink, muted → graphite,
accent → copper, rule → rule), the address-bar colours, both `opengraph-image.tsx` files and
`app/icon.svg` change in the same PR, as `e2e/invariants.spec.ts` demands. The icon: an ink mark on
film, `rx` 0 (a sheet has square corners). The OG cards: film ground, ink text, the 8 px copper bar
becomes a 2 px ink rule (copper means live now); their typeface stays next/og's Geist until B2
(satori can't read woff2, so Sofia Sans there needs a vendored TTF: B2, with `/read`).

Focus ring: `2px solid var(--ink)`, `outline-offset: 2px`, on everything focusable (today's rule, in
ink instead of copper). `::selection`: `--rule` ground, `--ink` text. Links: ink, `text-decoration:
underline 1px`, `text-underline-offset: 3px`; hover thickness 2 px, no colour change, no transition.
No radii, no shadows anywhere in B1.

## 2. Type (canvas: `Tokens.html`, "Type: one family, two widths")

Two Google variable fonts, OFL, self-hosted by `next/font/google` at build (the docs in
`node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`): `Sofia_Sans` (text) and
`Sofia_Sans_Extra_Condensed` (display). Google serves each as one latin variable woff2, `wght 1 1000`:
40,372 B and 40,520 B (measured today). Settings for both:

- `subsets: ['latin']`, weight `variable` (the default), no italic.
- `display: 'optional'`: the font is used only if it is there by first render, else the fitted fallback
  stays for that page view. That is what makes CLS 0 *including* the font swap (the direction's budget;
  sprint 17's follow-up). Chrome holds first paint for a preloaded optional font, so on a normal line the
  real face paints first; on the slow phone profile the name paints in the fallback, honest and on time.
- `preload: true` (the default) for both: both faces are in the first frame.
- `adjustFontFallback: true` (the default; it writes the `size-adjust` fallback). `fallback:
  ['Arial Narrow', 'Arial', 'sans-serif']` for the condensed face, `['Arial', 'sans-serif']` for the text face.
- `variable: '--font-sans'` and `'--font-cond'`; drop Geist from `layout.tsx`.

Weights used: 400, 500, 600, 650 (the role), 700. No lighter than 400. Tabular figures
(`font-variant-numeric: tabular-nums`) everywhere a column is read: the table, the strip, dates, counts,
station numbers. Sizes, px; the three display sizes are fluid, the rest step at 1024:

| Role | 1440 | 390 | Face, weight | Line | Note |
|---|---|---|---|---|---|
| Name, h1 | 104 | 60 | Cond 700 | 0.86 / 0.9 at 390 | `letter-spacing: -0.01em`; `clamp(60px, 43.66px + 4.19vw, 104px)` |
| Section h2 (Work…) | 72 | 52 | Cond 700 | 0.9 / 0.95 | `clamp(52px, 44.57px + 1.905vw, 72px)` |
| Company h3 | 36 | 30 | Cond 700 | 1.05 | `clamp(30px, 27.77px + 0.571vw, 36px)`; Education 30 / 26 |
| Revisions h2 | 30 | — | Cond 700 | 1 | |
| Mark "Theseus" | 28 | 24 | Cond 700 | 1 | |
| Contact section links | 52 | 38 | Cond 700 | 1.1 / 1.25 | row at 1440, gap 48; stacked at 390 |
| Role | 21 | 18 | Sans 650 | 1.2 / 1.35 | |
| Text (bio, summaries) | 17 | 16 | Sans 400 | 1.55; 1.45 in the title block | measure ≤ 66ch |
| Bar links | 16 | 15 | Sans 600 | | |
| Secondary (location, contact line, Revisions subtitle) | 15 | 14 | Sans 400, graphite where secondary | 1.35 | |
| Table cells / th | 14 / 13 | — | Sans 400 / 600 graphite | 1.3 | |
| Captions ("Profile", "DWL") | 12 | 12 | Sans 600 ink; 600 graphite for DWL/Base | | never essential |
| Station numbers | 11 | 11 | Sans 500 graphite | | never essential |
| Plank numbers | 10 | hidden | Sans 600 ink | | ≥ 1024 only |

## 3. The sheet's grid

**At 1440 (canvas: `Main.html`; every number is from it).** The sheet is the first screen, full
viewport width, no max-width:

- **Frame:** a 1 px ink border 16 px in from every edge of the sheet. Inner box 1408 wide.
- **Bar:** the inner box's first row, 56 px tall, padding 0 24, border-bottom 1 px ink, film ground.
  Mark at the left; 40 px to the links, 28 px between links; the right-hand group has `margin-left:
  auto`, gap 24 (empty in B1: see 6 and 9).
- **Drawing:** the next row, 476 px tall at 1440 (aspect-locked to the inner width: 476/1408 = 33.8%).
  The lines plan fills it (4).
- **Bottom block:** border-top 2 px ink; a grid `4fr 3fr` (804 / 604 px at 1440). Left: Revisions,
  padding 18 24 16, border-right 1 px ink. Right: the title block, padding 18 28 16. Content-sized, 336
  px at 1440; never shorter than its content.
- The sheet's natural height is 900 at 1440. On a shorter window (1440×760 is common) it scrolls: the
  name's top is at 566 px, so name and role are in the first paint; that is what the second rule asks.
- **Below the sheet:** 40 px of film, then the facts (10).

**At 390 (canvas: `Hero-390.html`, `Work-390.html`).** No frame. Bar 52 px, edge to edge, padding 0 16,
border-bottom 1 px ink; mark 24; links 15/600 with 44 px tall targets, 8 px side padding (6 px at 320
so the bar still fits one line: nothing may wrap or scroll sideways at 320). Drawing: 260 px tall
(decided: the canvas's 298 holds a model B1 doesn't have), the phone plan centred in it. Then the
block: border-top 2 px ink, padding 14 16 24: name, the role row (role 18/650 left, location 14
graphite right, baseline-aligned, border-top 1 px ink, margin-top 10, padding-top 6), bio 16/1.45
(margin-top 8), the revision strip (8), the contact line (15 px, gap 18, "Contact" in graphite, links
with 44 px tall targets). Nothing after it in B1: "Read as page" is B2's and the control is B3's. The
first "Work" rule lands near the fold on an 844-tall phone, which is right: the facts peek in.

**Between.** Breakpoint 1024: at ≥ 1024 the frame, the 56 px bar, the three-view plan, the two-column
block and the table; below it the phone layout (edge-to-edge 52 px bar, the two-view plan, the stacked
block: title block first, then the strip). At 1024 the block's title column is 425 − 56 = 369 px and the
fluid name is 87 px (≈ 342 px wide): it fits; check it. Beyond 1440 everything keeps growing with the
viewport (the drawing scales, the name caps at 104, the bio at 548 px / 66ch); nothing letterboxes.

## 4. The lines plan (canvas: `Main.html`, `Motion-Off.html`; maths: `render/drawing.mjs`)

Server-rendered inline SVG, in the HTML response, no script. Two SVGs, one shown per breakpoint:

- **Desktop plan (≥ 1024):** `viewBox="0 0 1408 476"`, `width: 100%`, three views placed exactly as
  the canvas (its numbers less the frame's 16 px and the bar's 72 px): profile origin `ox 76, oy 96,
  s 1.3`; half-breadth centreline `hbY 406`; body plan centre `bx 1180, by 96, bs 1.3`. That is `D` in
  `render/shots.mjs` shifted by (−16, −72). Captions: "Profile" at (76, 70), "Half-breadth plan" at
  (76, 426), "Body plan" centred at (1180, 70); "DWL" and "Base" to the right of the profile.
- **Phone plan (< 1024):** `viewBox="0 0 390 230"`, `width: 100%`: the profile with the planks, `ox 20,
  oy 40, s 0.5`, and the half-breadth plan under it, `hbY 190`. No body plan (decided: a body plan has
  no planks, and the planks are the record; B3 decides whether the phone loft registers on this profile
  or brings the body plan back under the model).
- Strokes carry `vector-effect: non-scaling-stroke`, so the weights below hold at every width.
- **Lettering is HTML, not SVG text** (decided): captions, station numbers, DWL/Base and the plank
  numbers are `<span>`s positioned in % of the drawing box, over the SVG. A drawing's lettering keeps
  its height whatever the scale, and SVG text would shrink to 7 px at 1024. Compute the % positions in
  the same server function that draws the lines. The whole drawing (SVG and lettering) is
  `aria-hidden="true"`: the record is in the revision block.

Stroke weights and colours (Tokens, "Lines and layout"; `drawing.mjs`):

| Line | Weight | Colour | |
|---|---|---|---|
| Hull outline (sheer, transom, profile), midship section | 1.6 | ink | `stroke-linejoin: round` |
| Plank edges, seams, butts, body-plan sections | 0.9 | ink | |
| Half-breadth deck line | 1.4 | ink | |
| Stations (0 to 10, through all views), waterlines | 0.6 / 0.5 | pencil | construction: decorative, 2.9:1 is by design |
| Base line | 0.75 | graphite | |
| DWL, centrelines | 0.75 | graphite | `stroke-dasharray: 14 3 2 3` |
| Pencil plank's edge | 1 | graphite | `stroke-dasharray: 4 2`, over the hatch |
| Section rule (the facts) | 2 | ink | HTML border |

Everything that means something (outline, seams, DWL, base, the hatch's edge) is ink or graphite,
≥ 5.9:1. Only construction lines are pencil. Forced colours: strokes survive, fills drop; check that
the outline, seams and the pencil plank's dashed edge still read, and that nothing else is lost (the
counts are HTML). Print: the same SVG. Markup budget: both SVGs together ≤ 24 KB raw in the HTML
(coordinates to one decimal, fewer samples than `drawing.mjs` uses: about 12 points per plank edge, 40
per waterline, 30 per section, checked fair at 2x DPR).

## 5. The planks in 2D (canvas: `Motion-Off.html`, the Off frame; maths: `hull.mjs`, `drawing.mjs`)

22 planks on 7 lifts (`BUTTS` in `lib/half-model.ts`; `planks()` and `bandAt()` in `hull.mjs`). The
shipwright's order, verbatim from `hull.mjs`:

```
ORDER = 5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.2 3.1 4.1 2.2 5.0 3.3 0.0 1.0
```

- The k-th **merged** sprint, counted in sprint-number order, takes `ORDER[(k − 1) mod 22]`. A sprint
  without a retro on main (16) is closed and takes no plank and no k. When k passes 22 the plank is
  replaced again and shows the newer sprint's number (B5's ghost hull keeps the older one).
- **Seated** (merged): `--card` fill, 0.9 ink edge, the sprint number centred in the band at the
  plank's mid-length, 10 px 600 ink (≥ 1024 only; the band is 19.5 px at 1440, 13.7 at 1024, 7.7 on a
  phone).
- **In pencil** (the sprint in progress): the hatch fill, 1 px graphite dashed edge, its number in
  graphite 700. In B1 nothing is copper: the pencil plank has no copper tip (that is a live event, B4).
- **Original** (no sprint yet): `--card-old` fill, 0.9 ink edge, no number.
- The sprint in progress = a `.crew/sprint/<n>/` folder with no `retro.json` (how `lib/sprint-log.ts`
  already reads it). On a PR preview that is the sprint itself (this PR shows 22 in pencil); on
  production every folder has its retro, so production shows no pencil until B4 brings the Studio's
  data. Honest, and what the brief asks: no invented live state.

Today's record, to check the build against (`merged` = 1–15, 17–21; 22 in progress):
sprint 1 → 5.1, 2 → 3.2, 3 → 1.1, 4 → 6.0, 5 → 4.2, 6 → 0.1, 7 → 2.0, 8 → 3.0, 9 → 5.2, 10 → 1.3,
11 → 4.0, 12 → 0.2, 13 → 6.1, 14 → 2.1, 15 → 1.2, 17 → 3.1, 18 → 4.1, 19 → 2.2, 20 → 5.0, 21 → 3.3;
22 in pencil on 0.0; 1.0 original. The count line reads "22 planks: 20 seated, 1 in pencil, 1 original"
on this PR's preview and "22 planks: 21 seated, 1 original" once it merges.

## 6. The labelled bar (canvas: `Main.html` `.nav`, `Hero-390.html` `.pnav`)

- `<header>` with the mark "Theseus" (a link to `/`) and `<nav aria-label="Main">`. In B1 the nav has
  three items, each to a place that exists: **Work** → `#work`, **Log** → `/sprints` (it is the log;
  B5 moves it to `/log`), **Contact** → `#contact` (the Contact section at the foot of the facts, not
  the title block's line: on a phone that line is one screen away, the section is the real
  destination). **Crew** arrives with `/crew` in B4, **Read as page** with `/read` in B2. A nav item
  to nowhere is a placeholder; the bar grows as its routes land.
- Current page: `aria-current="page"` and a 2 px ink bottom border (on `/sprints`, Log is current). Nav
  links have no underline; padding 6 0 at 1440.
- Sticky: `position: sticky; top: 0`, film ground, z-index above the drawing, on every route. No
  ancestor may clip overflow, or sticky breaks. Give section ids `scroll-margin-top` of the bar's height.
- The skip link stays (decided; `components/skip-link.tsx`, first Tab stop, lands on `#main`). Restyle it
  to the sheet when shown: ink text on film, a 1 px ink border, 15/600, padding 8 16, at (16, 16).
- `/sprints` gets this bar, the tokens and the fonts in B1, keeping its own list layout (B5 replaces
  it). Otherwise B1 ships two visual worlds one click apart. Its "Ruslan Shulga" back-link goes; the
  mark is the way home.

## 7. The title block (canvas: `Main.html`, "Title block" section)

Right column of the bottom block. In order, exact values at 1440:

1. `<h1>` `profile.name`, 104/0.86, −0.01em, margin 0. The largest paint: LCP is this text.
2. Role row: `margin-top 14; padding-top 8; border-top 1px ink`, flex space-between, baseline-aligned:
   `profile.headline` 21/650/1.2, `profile.location` 15 graphite.
3. The bio, 17/1.45, `margin-top 10`, `max-width 548px`: every sentence of `profile.bio` **except the
   last**. The last sentence ("This site is where a team of AI agents shows what it can ship on its
   own.") is the Revisions subtitle (8). Split on sentence ends; if the bio has one sentence, show it
   whole here and leave the subtitle empty. The words are the owner's, shown in two places; none change.
4. Contact line, pushed to the bottom (`margin-top: auto`): `padding-top 8; border-top 1px rule`, 15 px,
   gap 22: "Contact" in graphite, then `profile.links` in ink. No id here (`#contact` is the section).

## 8. The revision block (canvas: `Main.html` "Revisions", `Rest-1440.html`, `Hero-390.html`, `Rest-390.html`)

Left column at ≥ 1024, `<section aria-labelledby="rev-h">`, from `.crew/sprint/*/retro.json` at build
through `lib/sprint-log.ts` (extend it; don't fork it):

- Heading row, baseline-aligned, gap 20: `<h2 id="rev-h">Revisions</h2>` 30 cond 700, then the bio's
  last sentence, 15 graphite.
- **Rest line** (when no sprint is in progress, i.e. production): `padding 8 0 10; border-bottom 1px
  ink`, 15 px: "**Last plank seated:** sprint 21." Not "Crew resting": B1 can't know whether the crew is
  working, so it states only the record. No Replay button (B4).
- **Table** `.rev`: 14/1.3, `border-collapse: collapse`; `th` 13/600 graphite, left, `padding 0 10 6 0`,
  border-bottom 1 px ink; `td` `padding 7 10 7 0`, border-bottom 1 px rule, `vertical-align: top`.
  Columns and widths: Rev 34 · Description (the rest) · Drawn 80 · Checked 58 · Tested 52 · Approved
  128. Description is one line, `overflow: hidden; text-overflow: ellipsis` (the Log has the full text).
- **Rows:** the sprint in progress first (if any), then the newest sprints on record, **5 rows in all**.
  Then a footer row, flex space-between, 14 px: left the count line with the legend's swatches (decided:
  the canvas's legend under the body plan moves here, one line, because a fixed-size legend over a
  scaling drawing collides at 1024; the swatches are 28×12 with a 1 px ink border, card / old card /
  hatch): "22 planks: 20 seated, 1 in pencil, 1 original"; right, 600: "All 20 revisions in the Log" →
  `/sprints` (N = sprints on record, in progress included).
- **Cells, from the retro:**
  - Rev: `sprint`, 700 ink. The pencil row's number sits on a hatch chip (`padding 0 4`), its other
    cells graphite.
  - Description: the goal as `presentGoal` already presents it.
  - Drawn: `engineer` → Forge, `creative-engineer` → Pixel; when neither is in `agents`, the others:
    `design-director` → Iris, `product-owner` → Quill, in retro order, joined with ", " (so 13 and 14
    read Forge; 15 "Iris, Quill"; 17 Iris). Sprints 1–4 (old shape, no `agents`) show "–".
  - Checked: "Lens" when `lens.runs ≥ 1`, or any `lens_*` key in the old shape; else "–".
  - Tested: "Probe" when `qa-engineer` is in `agents`; else "–".
  - Approved: "Owner" when the outcome says `needs-owner` (`ownersCall`, the field that exists: sprints
    1, 2, 7, 9, 10, 12, 15), else "Gate". The pencil row: "Not yet".
  - **Date: not in B1** (decided, reluctantly). The merge time isn't in the record the build can read:
    retros are written before the merge, and GitHub at build time is a rate-limited guess. Rather than
    a column of dashes, drop it; B5's Log brings dates once a crew script records `mergedAt`
    (proposed in the retro: `next-sprint.mjs` already reads `merged_at`). The rest line therefore has
    no date either. If Quill's contract finds a source that is right for every row at every build,
    restore the column at 54 px, "21 Oct", with the year only when it isn't the current one.
- **At < 1024, the strip** (canvas `Hero-390.html`'s `<a href="#log">`): one `<a>` to `/sprints`,
  `grid-template-columns: 40px 1fr; gap 0 8`, 14/1.35, `padding 10 0; border-top 1px ink; border-bottom
  1px rule`, `margin-top 14`. Column 1: the sprint number, 700, on a hatch chip when in pencil, plain
  when seated. Column 2, line 1 (650 ink): "Sprint 22 in pencil" or "Last plank seated: sprint 21";
  line 2 (graphite): the goal, clamped to two lines, ending with "Revisions" and the canvas's 14×10
  arrow. The count line is not on the phone.

## 9. Full / Calm / Off: not in B1 (decided)

With no 3D there is nothing Full or Calm can visibly do, and a control whose three buttons change
nothing is a stand-in, which the hard gate forbids. The page in B1 *is* the Off state ("Off as
everyone's default" in the roadmap is satisfied by that), so the control ships with B3, which is what
it controls. The bar's right-hand group stays empty in B1. For B3, the look is on `Motion-Control.html`:
an `inline-flex` group with a 1 px ink border, `role="group" aria-label="Motion"`, three `<button
aria-pressed>` 32 px tall (44 on phones), padding 0 12 (0 16 on phones), 14/600, 1 px ink dividers;
pressed = ink ground, film text; the choice stored on the device inside try/catch; reduced motion
starts at Calm; Off never loads WebGL. If Quill's contract keeps the control in B1 anyway, Off must
be pressed and Full and Calm must not pretend: I'd score that down.

## 10. The facts below the first frame (canvas: `Work-1440.html`, `Work-390.html`)

The same facts as production, restyled; this is `content/profile.ts` presented, never changed.

- Order and ids: **Work** (`#work`, was "Experience"), Projects, Stack, Education, Contact
  (`#contact`). Each a `<section aria-labelledby>` with `border-top 2px ink`.
- ≥ 1024: 12 columns, 24 px gutters, `padding 28 56 40` (Contact 64 at the bottom). `h2` in columns
  1–3 (72 cond 700, line 0.9); the list in 4–12. Each entry `grid-template-columns: 168px 1fr`, gap 24,
  `padding 18 0 22`, `border-bottom 1px rule` (none on the last); the first entry `padding-top 6`.
  Date column 14 graphite tabular, `padding-top 10`; company 36 cond 700/1.05; role 17/650/1.35,
  `margin 2 0 8`; summary 17/1.55, `max-width 66ch`.
- Projects: no cards (the direction dropped them). The date column holds the link ("GitHub",
  "ruslanshulga.com", underlined); name as the company style; description as the summary.
- Stack: the wrapping list with drawn dots (sprint 20's `::before` dot, `CanvasText` in forced
  colours, clipped only sideways), 18 px at 1440, 16 at 390; dots `3×3` graphite, 12 px either side.
- Education: company style at 30 (26 at 390), credential as the role style at 500.
- Contact: the three links in the condensed display size (52 in a row at 1440, 38 stacked at 390).
- < 1024: `padding 18 16 28`, `h2` 52/0.95 above the list, entries stacked with `padding 14 0 18`.
- **Detail A** (the gateway schematic the owner kept) is B2's, with `/read`: it is a drawn figure that
  deserves its own review round, and B1 is already the whole sheet. B1 shows the JPMorgan summary as
  text, as production does.
- The sprint-5 section reveal goes: on the sheet nothing the visitor reads ever moves, in any mode
  (canvas, `Motion-Control.html`'s last line). `reveal.spec.ts` retires with it (owner's approval in
  the PR, per the roadmap).

## 11. Motion, schemes, print

B1 has no animation and no transition at all: not the hover underline, not the bar, not the sections.
`prefers-reduced-motion` therefore changes nothing, which is the hard gate passing by construction.
Dark follows the system as today (`color-scheme: light dark`). Print: the sheet as drawn, the bar
unstuck, the facts after it. No client component is needed anywhere in B1.

## 12. What the design implies for the live checks (for Quill's list)

Retire: `hero.spec.ts` and `hero-3d.spec.ts` (the half-model box and its WebGL upgrade are replaced by
the lines plan; B3 writes the 3D's own), `reveal.spec.ts` (11), `cards.spec.ts` (no cards). Rewrite:
`profile-sections.spec.ts` (C1's order starts with Work; C8's forced-colour dots stay),
`keyboard.spec.ts` (the ring is ink; the skip link's new look), `invariants.spec.ts` (the new tokens,
both schemes, the icon's hexes). Keep: `smoke`, `content` (the placeholder guard), `sprints*` (plus the
bar on `/sprints`). New ground to cover: the sheet's first paint is the name (LCP text, ≤ 2.5 s at 4x
CPU / 400 kbps), CLS 0 with the fonts, the drawing in the HTML with no script, the planks' numbers
against the retros (the table in 5), the revision rows against the retros, 320 px with no sideways
scroll, axe clean in both schemes, the bar sticky on both routes.

## 13. Decided beyond the canvas

1. The legend sits in the revision block's footer line, not under the body plan (8).
2. The phone plan is profile + half-breadth with the planks, 260 px tall, not the body plan (4).
3. The drawing's lettering is HTML at fixed sizes over a scaling SVG; plank numbers only at ≥ 1024 (4).
4. Nothing is copper in B1; the pencil plank's number is graphite; no "Crew resting" claim (5, 8).
5. The sprint in progress is the folder without a retro; production shows the rest state (5).
6. The bar has three items in B1; Crew and Read as page arrive with their routes; the skip link stays (6).
7. The control is B3's (9).
8. The Date column is out of B1; the rest line carries no date (8).
9. Detail A and the OG cards' typeface are B2's (1, 10).
10. The bio's last sentence is the Revisions subtitle; the title block shows the rest (7).
11. The section reveal retires (10). `/sprints` takes the bar, tokens and type (6).
12. Breakpoint 1024 for the sheet's two layouts; the block is `4fr 3fr`; nothing has a max-width (3).

**Needs decision (owner), in the PR:** the retirements in 12 (`reveal`, `cards`, `hero`, `hero-3d`),
as the roadmap says. Nothing else in B1 needs the owner: the four calls are applied as approved.
**Needs decision (Quill):** whether a reliable merge-date source exists for the Date column (8); the
control's absence from B1 (9) if the contract assumed it.

## 14. What I'll look at in review

Side by side with production at 390, 1024 and 1440, both schemes: the name is the first thing and the
largest paint; the drawing is a drawing (fair curves at 2x, weights as in 4, lettering 11–12 px and
never essential); the planks match the table in 5; the five rows match the retros; the bar fits at 320;
nothing moves; axe and impeccable's detector clean; LCP and CLS on the slow profile; `/sprints` wears
the same clothes. I'll look at the running build early: ask me in the sprint thread, with a preview or
a screenshot, before the first full round.
