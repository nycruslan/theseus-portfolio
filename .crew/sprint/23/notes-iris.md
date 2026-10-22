# Sprint 23, notes from Iris: B2, the facts and `/read`

The values for Forge, under Quill's contract (`.crew/sprint/23/contract.md`, the spec; where these
notes and it differ, the contract wins and I've said so to Atlas in my report). Sources: the frames
`.crew/sprint/17/design/work-1440.webp`, `work-390.webp`, `read-1440.webp`, `read-390.webp`; the
canvas's artboards behind them (`.crew/sprint/22/canvas-extract/Work-1440.html`, `Work-390.html`;
the Read artboards read from the canvas this session, `project/Read-1440.dc.html` and
`Read-390.dc.html`); the sheet as B1 shipped it (production, `app/`, `components/`); and widths
measured on production with the real faces (Sofia Sans 600 and Sofia Sans Extra Condensed 700, a
scratch Playwright script; the numbers quoted below are those measurements, rounded to the px).

Every text size below is a step token and every colour a token. Tailwind utilities are fine where
they resolve to the same values (`text-step-sm`, `text-muted`); the CSS is written long-hand here
so there is one reading.

## New tokens

Two steps, on `:root` beside the others, fluid from 390 to 1440 px like them. Probe adds both to
`STEP_TOKENS` in `e2e/helpers.ts`. No new colour token.

| Token | Value | 390 → 1440 | Carries |
|---|---|---|---|
| `--step-entry` | `clamp(1.875rem, 1.7357rem + 0.5714vw, 2.25rem)` | 30 → 36 px | the entry heads on `/` (company, project name), the h2s on `/read` |
| `--step-display` | `clamp(2.375rem, 2.05rem + 1.3333vw, 3.25rem)` | 38 → 52 px | the Contact section's three links on `/` |

In `@theme inline`: `--text-step-entry: var(--step-entry)` with `--text-step-entry--line-height:
1.05`, and `--text-step-display: var(--step-display)` with `--text-step-display--line-height: 1.1`.
Neither shrinks from 320 to 1440, so the fluid-scale invariant holds. The frames' other sizes map
onto existing steps: h2 72 → `--step-2xl`; education's head 30/26 → `--step-xl` (24 → 30); the
date column 14 → `--step-sm` (13, the table's size); Detail A's labels 20/18 → `--step-lg` and
`--step-base`; its caption → `--step-sm`.

## The nine decisions (numbered as the contract's "Needs decision (Iris)")

1. **The bar with four nav items at 320 to 1023 px.** One row, 52 px, the mark then the four links
   right-aligned, in this order: Work, Log, Contact, Read as page. Links at `--step-base` 600 with
   6 px side padding (not 8) at every width below 1024, and at `--step-sm` below 360 px. Measured:
   at 390 the row needs 316 of 358 px; at 360, 316 of 328; at 320 with the sm step, 279 of 288.
   Nothing wraps or scrolls; the bar's height is unchanged, so B1.1 holds. Section 5.
2. **Steps.** The two new tokens above; everything else on existing steps, listed there.
3. **Detail A at 320 and 390.** The three provider boxes sit in a row at 288 px (they need 279 at
   `--step-base`, measured), and `flex-wrap: wrap` is the net under them, never used today. The
   caption is "Detail A. Drawn from the summary's own words: the gateway, who routes through it,
   and what it sits over." at every width. Forced colours: every box keeps a CanvasText border on
   Canvas with CanvasText text, the connectors follow `currentColor`, and the gateway box gets a
   second rule (an outline) in place of its fill. Print: the gateway keeps its ink fill
   (`print-color-adjust: exact`), the rest prints as drawn. In the dark scheme the gateway is the
   inverted box (`--foreground` ground, `--background` text, 14.6:1): the one lit element on the
   night sheet, as a seated plank is. Section 4.
4. **`/read`.** Column 760 px, text in it at `66ch`; left margin 16 px below 1024, and
   `max(56px, 50vw - 520px)` from 1024 (200 px at 1440, as the frame; the column sits 140 px left of
   centre on wider screens). The drawing is the profile and half-breadth plan (the narrow geometry)
   at every width, with plank numbers from 768 px at `--step-xs`, none below. The strip does not
   stick. Print's box: 36 px tall from 1024 (44 below), padding 0 14, 1 px ink border, in a slot of
   `min-width: 72px` that exists with scripts off. The count line: "22 planks: 21 replaced, 1
   original", the legend as on `/`, then "Each replaced plank is one merged sprint; all 21
   revisions are in the Log." with "the Log" → `/sprints`. Section 6.
5. **Project rows below 1024.** Name, description, then the link under the description as the frame
   draws it; the link is a 44 px tall target at `--step-base`. From 1024 the link moves to the date
   column at `--step-sm`, 24 px tall. Section 3.
6. **The not-found page.** The `/read` column, a 2 px ink rule, "Page not found" at `--step-2xl`
   condensed, one line: "Nothing is drawn at this address.", then the two links. Section 7.
7. **Print.** Under `@media print` the root redeclares the light tokens on white
   (`--background: #ffffff`) with `--muted` darkened to `#3d4549` (9.8:1 on white) so nothing
   secondary falls under 7:1; the bar, Back and Print are hidden, the address shown at every width
   in `--step-sm` graphite, left. Section 8.
8. **Forced colours.** `GrayText`: original planks and their swatch fill GrayText; seated planks and
   their swatch fill Canvas; every border and stroke CanvasText. Section 9.
9. **The riders.** The favicon's copper mark rides: ink in `app/icon.svg` and the `/favicon.ico`
   route, plus one line in the icon invariant (Probe). The social card's copper bar rides as a 2 px
   ink rule (one line). The card's typeface does not ride: satori needs a vendored TTF in both OG
   routes, a follow-up. Section 10.

## 1. What holds from sprint 22's section 10, and what changes

**Holds** (the frames are unchanged and B1 built nothing below the sheet): the order and ids, Work,
Projects, Stack, Education, Contact, each a `section[aria-labelledby]` with its h2 carrying the id
and a 2 px ink top rule; the 12-column grid at 1024 and up with 24 px gutters and `padding 28 56
40`, the h2 in columns 1 to 3 at `--step-2xl`/0.9, the list in 4 to 12; the entry as a two-column
grid with the date on the left; the company at 36/1.05 condensed; the role at 650; the summary at
`66ch`; the Stack's drawn dots (the shipped markup: keep it, only its container changes); Education
at 30/26 with the credential at 500; Contact's three links in the condensed display size; the phone
layout with `padding 18 16 28` and stacked entries.

**Changes**, because B1 is on production and these notes read the sheet as built, not the canvas:

- The facts stop being the production column (`max-w-2xl`, 13 px uppercase labels, the project
  cards, `gap-16`). The wrapper under the sheet loses its max-width and side padding: the sections
  run edge to edge like the sheet's own bottom rule, with 40 px of film between the sheet's bottom
  border and the first section's rule from 1024 (the frame's gap). Below 1024 nothing is added:
  the title block's own 24 px bottom padding is the gap, and the first rule lands near the fold
  on an 844 px phone, as sprint 22's section 3 intended.
- `components/section.tsx` becomes the schedule section (the rule, the grid, the h2 at the left);
  `components/project-card.tsx` goes. `/read` has its own plainer section head (6).
- The date column is `--step-sm` (13 px), not the frame's 14: the sheet's table and secondary
  lines are 13 and there is no 14 px step.
- The company head is the new `--step-entry`; Contact's links the new `--step-display`.
- From 1024 to 1279 the date column is 140 px, not 168, so the text column keeps 514 px at 1024
  ("Sep 2021 — Present" is 119 px at 13). 168 from 1280.
- The bar gains its fourth link (5). The 1024 to 1279 title block gap the sprint 22 review noted
  stays: B2 doesn't touch the sheet.

## 2. The facts on `/`: the schedule

**From 1024 px.**

- `section`: `border-top: 2px solid var(--foreground); display: grid; grid-template-columns:
  repeat(12, minmax(0, 1fr)); column-gap: 24px; padding: 28px 56px 40px`. Contact:
  `padding-bottom: 64px`.
- `h2`: `grid-column: 1 / span 3; margin: 0; font-family: var(--font-cond); font-weight: 700;
  font-size: var(--step-2xl); line-height: 0.9; color: var(--foreground)`. It never wraps:
  "Education" is 191 px at 1024 (the three columns are 210) and 214 at 1440 (314).
- The list (`ol` for Work and Education, `ul` for the rest): `grid-column: 4 / span 9; margin: 0;
  padding: 0; list-style: none`.
- Entry `li`: `display: grid; grid-template-columns: 140px minmax(0, 1fr); column-gap: 24px;
  padding: 18px 0 22px; border-bottom: 1px solid var(--rule)`; `:last-child { border-bottom: 0 }`;
  `:first-child { padding-top: 6px }`. From 1280: `grid-template-columns: 168px minmax(0, 1fr)`.
  Everything in the `li` but the period sits in column 2 (`li > :not(.when) { grid-column: 2 }`);
  the period: `grid-column: 1; grid-row: 1`. The `h3` stays the `li`'s first child in the DOM (the
  data rule); the grid, not the order, puts the period on the left.
- Period `p.when`: `margin: 0; padding-top: 10px; font-size: var(--step-sm); line-height: 1.5;
  color: var(--muted); font-variant-numeric: tabular-nums`. Its top sits inside the h3's first
  line box (37.8 px at 1440; the period's text top is at 13 px), which is B2.1's rule.
- `h3` (company, school, project name): `margin: 0; font-family: var(--font-cond); font-weight:
  700; font-size: var(--step-entry); line-height: 1.05; color: var(--foreground)`. Education:
  `font-size: var(--step-xl)` ("Kyiv National Economic University" is 315 px at 30, in a 514 px
  column at 1024).
- Role `p`: `margin: 2px 0 8px; font-size: var(--step-base); font-weight: 650; line-height: 1.35`.
  Credential (Education): `margin: 2px 0 0; font-weight: 500`, otherwise the same.
- Summary and description `p`: `margin: 0; font-size: var(--step-base); line-height: 1.55;
  max-width: 66ch`. A project's description: `margin-top: 6px` (no role line above it).
- Stack: the shipped `ul` (wrapping, `gap: 4px 24px`, the 3 × 3 `--muted` dot drawn 12 px before
  each item, `CanvasText` in forced colours, `overflow-x: clip`) in columns 4 to 12 with
  `padding-top: 8px`; items at `--step-base`.
- Contact: the `ul` in columns 4 to 12: `display: flex; flex-wrap: wrap; gap: 8px 48px; padding-top:
  6px`. Each link: `font-family: var(--font-cond); font-weight: 700; font-size: var(--step-display);
  line-height: 1.1; color: var(--foreground); text-decoration: underline; text-decoration-thickness:
  2px; text-underline-offset: 4px`; hover `text-decoration-thickness: 3px`. The row is 610 px at
  1440 (107 + 129 + 278 and two gaps) in a 990 px column; 555 px at 1024 in 678. Targets are 57 px
  tall.

**Below 1024 px.**

- `section`: `display: block; padding: 18px 16px 28px` (Contact `padding-bottom: 40px`).
- `h2`: `margin: 0 0 6px; font-size: var(--step-2xl); line-height: 0.95`.
- Entry: `display: block; padding: 14px 0 18px; border-bottom: 1px solid var(--rule)` (none on the
  last); the first `padding-top: 8px`. Period: `padding: 0`, then the `h3` with `margin-top: 2px`;
  the role `margin: 2px 0 6px`; summary `max-width: none`. The h3 comes first in the DOM and the
  period is placed above it by `order` (the entry is a one-column grid: `display: grid;
  grid-template-columns: 1fr` with `.when { order: -1 }`): the same markup at every width.
- Contact: `flex-direction: column; gap: 6px; padding-top: 4px`; links at `--step-display` (38 at
  390), `line-height: 1.25`, 47 px tall targets, "ruslanshulga.com" 193 px wide in 358.

**Hover and focus everywhere on the facts.** Links are ink; hover thickens the underline (1 → 2 px;
2 → 3 px on the display links); focus is the shared ring (2 px `--foreground`, 2 px out); no colour
change, no transition, nothing moves, nothing copper.

## 3. Projects as rows

- The `li` is the entry of section 2. DOM order: `h3` (the name, with an id such as
  `project-theseus`), `p` (the description), then `p.when` holding the one link. A project without
  `href` has no `p.when`: the same row with column 1 empty from 1024.
- The link's text is the data rule's label ("GitHub", "ruslanshulga.com"); its accessible name is
  `aria-labelledby="<h3 id> <link id>"`, so it reads "Theseus GitHub".
- From 1024: `p.when { grid-column: 1; grid-row: 1; padding-top: 10px }`; the link `display:
  inline-flex; align-items: center; min-height: 24px; font-size: var(--step-sm); line-height: 1.5;
  color: var(--foreground); text-decoration: underline; text-decoration-thickness: 1px;
  text-underline-offset: 3px`, hover 2 px.
- Below 1024: `p.when { order: 0; margin: 6px 0 -10px }` (under the description, as `work-390.webp`
  draws it); the link `min-height: 44px; font-size: var(--step-base)`. The negative margin keeps
  the rule 18 px under the link's text, as under every other entry.
- The row draws no box: `background: transparent`, no left or right border, the hairline below only
  (B2.1). Nothing replaces the card's whole-surface link: the labelled link is the row's one target
  (24 × 24 at least at every width, 44 tall on phones), and the row has no hover state of its own.
  Keyboard focus on the link shows the ring; hover shows the thicker underline; both differ from
  rest, which is what the rewritten keyboard check asks.

## 4. Detail A

Inside the JPMorgan `li`, after the summary, in column 2. Real text, no raster, no link, button or
tabindex; the connectors are inline SVG with `aria-hidden="true"`. Drawn only when
`detailA(summary)` returns the five labels (Forge's brief). Markup, and the only classes the CSS
needs:

```html
<figure class="da">
  <div class="da-draw">
    <p class="da-box">Around 8 product teams</p>
    <svg class="da-right" aria-hidden="true" viewBox="0 0 56 12" width="56" height="12"><path d="M2 6H52M46 1l6 5-6 5"/></svg>
    <svg class="da-down" aria-hidden="true" viewBox="0 0 12 22" width="12" height="22"><path d="M6 1v19M1 15l5 5 5-5"/></svg>
    <p class="da-box da-gateway">Model-agnostic AI gateway</p>
    <svg class="da-right da-fan" aria-hidden="true" viewBox="0 0 56 98" width="56" height="98"><path d="M2 49h18M20 14v70M20 14h32M20 49h32M20 84h32M46 9l6 5-6 5M46 44l6 5-6 5M46 79l6 5-6 5"/></svg>
    <svg class="da-down" aria-hidden="true" viewBox="0 0 12 22" width="12" height="22"><path d="M6 1v19M1 15l5 5 5-5"/></svg>
    <div class="da-over">
      <p class="da-box da-small">AWS Bedrock</p>
      <p class="da-box da-small">Azure OpenAI</p>
      <p class="da-box da-small">Anthropic API</p>
    </div>
  </div>
  <figcaption>Detail A. Drawn from the summary's own words: the gateway, who routes through it, and what it sits over.</figcaption>
</figure>
```

That is about 1.2 KB, inside the 4,096 B budget. The labels come from `detailA()`'s array, never
typed again. Reading order: teams, gateway, the three providers, the caption.

```css
.da { margin: 22px 0 0; padding-top: 16px; border-top: 1px dashed var(--pencil);
      container-type: inline-size; color: var(--foreground); }
.da-draw { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.da-draw svg { display: block; flex: none; fill: none; stroke: currentColor; stroke-width: 1.2px; }
.da-right { display: none; }
.da-down { margin-left: 20px; }
.da-box { margin: 0; border: 1px solid var(--foreground); background: var(--card); padding: 6px 10px;
          font-family: var(--font-cond); font-weight: 600; font-size: var(--step-lg); line-height: 1.1; }
.da-gateway { background: var(--foreground); color: var(--background); }
.da-over { display: flex; flex-wrap: wrap; gap: 6px; }
.da-small { font-size: var(--step-base); }
.da figcaption { margin-top: 6px; font-size: var(--step-sm); line-height: 1.5; color: var(--muted); }

@container (width >= 40rem) {
  .da-draw { flex-direction: row; align-items: center; gap: 0; }
  .da-right { display: block; }
  .da-down { display: none; }
  .da-box { padding: 8px 12px; }
  .da-over { flex-direction: column; flex-wrap: nowrap; }
  .da-small { padding: 4px 12px; }
  .da figcaption { margin-top: 12px; }
}
```

- **Two layouts, chosen by the figure's own width, not the viewport.** The row (`work-1440.webp`)
  needs 621 px: 186 + 56 + 208 + 56 + 115, measured at 1440's sizes. The text column is 798 px at
  1440 and 678 at 1280, so the row shows from about 1230 px; at 1024 (514 px) and on phones the
  figure stacks as `work-390.webp` draws it. The fan's arms at y 14, 49 and 84 meet the centres of
  three provider boxes 28.7 px tall with 6 px gaps (within 1 px across the fluid range).
- **Stacked at 320:** the column is 288 px; the provider row needs 279 (91 + 87 + 89 and two gaps),
  so the three sit in one row; the gateway box is 182 px. `flex-wrap` is the net, unused today.
- **Colours.** Boxes are card on film with an ink rule, like the planks; the gateway is the inverted
  box. Label contrast: ink on `--card` 16:1 light, 4.99:1 dark (the plank fill B1 set for its
  numbers); `--background` on `--foreground` 15.1:1 light, 14.6:1 dark; caption 5.9:1 / 7.8:1. The
  dashed rule is `--pencil`, a line, never text. Both schemes come from the tokens; nothing is set
  per scheme.
- **Forced colours.** The borders and `color` are forced to CanvasText, the backgrounds to Canvas,
  and the strokes follow `currentColor`, so nothing needs a rule but the gateway, which loses its
  fill: `@media (forced-colors: active) { .da-gateway { outline: 1px solid CanvasText;
  outline-offset: 1px; } }` keeps it marked as the filled one.
- **Print.** `.da { break-inside: avoid }`; `.da-gateway { print-color-adjust: exact }`.
- Nothing in the figure is focusable or hit-tested differently from text; it has no pointer rules.

## 5. The bar: Read as page, and four items on a phone

- `LINKS` gains `{ label: "Read as page", href: "/read" }`, last. Nothing else in the nav.
- **From 1024:** the three keep their style (16/600, `gap 28`, no underline, hover a 2 px underline
  6 px under). Read as page's `li` takes `margin-left: auto`, so it ends at the bar's inner edge
  (24 px in from the frame line), as `work-1440.webp` draws it, and leaves the right-hand group's
  gap of 24 for B3's control. It is underlined at rest (`text-decoration: underline;
  text-decoration-thickness: 1px; text-underline-offset: 6px`, hover 2 px): it leaves the sheet for
  another view, and the frame draws it so. Current page: unchanged (`aria-current` on `/sprints`
  only).
- **Below 1024:** one row, 52 px; the mark at `--step-xl` (62 px wide) left, the `ul` right with
  `margin-right: -6px`; each link `display: flex; align-items: center; min-height: 44px; padding: 0
  6px; font-size: var(--step-base); font-weight: 600` (the shipped `px-2` becomes 6 px at every
  phone width; the `max-[359px]` padding rule goes). Read as page underlined as above.
  Measured at 16 px: the four words are 37 + 25 + 58 + 92 = 212 px, with padding 260, overhanging
  6: 254. With the mark, 316 px: it fits 358 at 390 (42 px between the mark and Work) and 328 at
  360 (12 px).
- **Below 360:** `nav a { font-size: var(--step-sm) }`: 29 + 21 + 48 + 77 = 175, with padding 217;
  279 px with the mark, in 288 at 320 (9 px of air). The narrowest target is Log, 33 × 44.
- The skip link is unchanged. Tab order on `/`: skip, Work, Log, Contact, Read as page, the three
  title-block links, the Log link, the two project links, then Contact's first link: the 12th
  stop, as B2.3 counts it.
- For Quill's B4 contract, not now: with Crew (37 + 12 px) the phone row needs 365 px at 390 and
  doesn't fit at `--step-base`; B4 re-lays the phone bar (the sm step at every phone width fits
  five, 308 px at 390).

## 6. `/read`

**Shared with `/`.** The tokens and steps; `app/fonts.ts` (or the name Forge picks) exporting the
one `Sofia_Sans_Extra_Condensed` call that `app/page.tsx` holds today, imported by `/`, `/read` and
the 404, its `variable` class on each route's root element as the bar and `main` carry it now; the
link style (ink, 1 px underline 3 px under, 2 px on hover); the ring; the `LinesPlan` component with
a `view` prop: `"sheet"` renders both drawings as today, `"page"` renders one drawing from a third
layout, `PAGE`, which is `NARROW`'s geometry with `numbers: true`; the `.swatch` legend markup from
the revision block's footer; `splitBio` is not used here (the bio is whole). The route is static,
both schemes, nothing moves, no bar, no revision block, no Detail A, no JSON-LD.

**The column**, class `page`, used by the strip, `main` and the 404, sets widths only: `max-width:
760px; margin-left: 16px; margin-right: 16px`. From 1024: `margin-left: max(56px, 50vw - 520px)`.
That is 200 px at 1440 (`read-1440.webp`), 56 at 1024, 440 at 1920. The page's vertical padding is
split so nothing is counted twice: the strip has `padding-top: 12px` (40 from 1024) and `main`
`padding-bottom: 48px` (72 from 1024); the 404's `main` carries both. Paragraphs in the column:
`max-width: 66ch` (617 px at 17; the 760 px column at 17 px would run to 100 characters). Heads,
rules and the drawing span the column.

**The strip**, `<header class="strip page">` before `main`: `display: grid; grid-template-columns:
auto 1fr auto; align-items: center; column-gap: 16px; min-height: 44px; padding-bottom: 14px;
border-bottom: 1px solid var(--foreground)`; from 1024 `min-height: 36px`.

- Back to the ship, `<a href="/">`: `display: inline-flex; align-items: center; min-height: 44px
  (24 from 1024); font-size: var(--step-base); color: var(--foreground)`, underlined as every link.
- The address, `<p class="strip-url">theseus-portfolio.vercel.app/read</p>` (the host of
  `SITE_URL` plus `/read`): `justify-self: center; margin: 0; font-size: var(--step-sm);
  color: var(--muted); font-variant-numeric: tabular-nums`. In the DOM at every width; `display:
  none` below 1024 (`read-390.webp` has no room: Back is 106 px and the address 196 at 13 px),
  `display: block` from 1024 and under print at every width. Not a link: it is the page's address,
  shown for the printout.
- Print's slot, `<div class="strip-print">`: `justify-self: end; min-width: 72px; display: flex;
  justify-content: flex-end`. It is rendered with or without scripts, so the row never changes
  height or width when the button arrives (CLS 0). The button, scripts only: `height: 44px (36
  from 1024); padding: 0 14px; border: 1px solid var(--foreground); background: transparent;
  color: var(--foreground); font: 600 var(--step-base)/1 var(--font-sans); cursor: pointer`;
  hover `background: var(--foreground); color: var(--background)` (the pressed look from
  `Motion-Control.html`, ink not copper); focus the shared ring; no transition. "Print" is 36 px of
  text, 66 px boxed, inside the 72 px slot. Named "Print" and nothing else.
- Not sticky. The plain page is a document: nothing on it floats, moves or covers the text, it
  reads the same with scripts off and on paper, and a 44 px sticky row on an 844 px phone would
  tax the page made for reading. The browser's Back and the Log link at the foot are the ways
  out. `html`'s `scroll-padding-top` (52/56 px) stays as it is site-wide: harmless here, and a
  fragment target lands a line below the top rather than against it.

**`main#main[tabindex="-1"]`**, class `page`, holding `main > header` then the sections:

- `h1` `profile.name`: `margin: 28px 0 0` (20 below 1024); `font-family: var(--font-cond);
  font-weight: 700; font-size: var(--step-2xl); line-height: 0.9; letter-spacing: -0.01em`. 288 px
  wide at 72, 207 at 52.
- The role line `<p>`: `margin: 10px 0 0; font-size: var(--step-lg); font-weight: 650; line-height:
  1.2`: `headline`, then `<span>` ` · location` with `font-weight: 400; color: var(--muted)`. The
  separator is the page's " · ".
- The bio `<p>`: `margin: 12px 0 0; font-size: var(--step-base); line-height: 1.55; max-width:
  66ch`. The whole bio, one paragraph.
- `<ul id="contact" aria-label="Contact">`: `display: flex; flex-wrap: wrap; gap: 0 22px (18 below
  1024); margin: 10px 0 0 (6)`; each link `display: inline-flex; align-items: center; min-height:
  44px (24 from 1024); font-size: var(--step-base)`, ink, underlined.
- Each section: `<section aria-labelledby="work">` and so on, the h2 carrying the id, as on `/` (the
  contract names the h2s and their ids; B2.9 wants named regions, so the same wrapper). `h2`:
  `margin: 36px 0 10px (28px 0 8px below 1024); padding-top: 12px; border-top: 2px solid
  var(--foreground); font-family: var(--font-cond); font-weight: 700; font-size: var(--step-entry);
  line-height: 1`.
- Entries (`ol`/`ul`, `list-style: none`, `li.entry`): `padding: 10px 0 12px; border-bottom: 1px
  solid var(--rule)`, none on the last. `h3`: `margin: 0; font-size: var(--step-lg); font-weight:
  700; line-height: 1.3` (the text face). The meta line `<p>` (`title · period`, or
  `credential · period`): `margin: 0; font-size: var(--step-base); color: var(--muted);
  line-height: 1.5; font-variant-numeric: tabular-nums`. The summary `<p>`: `margin: 4px 0 0;
  max-width: 66ch; line-height: 1.55`.
- Projects: the `h3` holds the link (`<h3><a href>name</a></h3>`), ink, underlined, 27 px tall; the
  description `margin-top: 4px`. No label link here: the name is the link, as `read-1440.webp`.
- Stack: one `<p>`, `profile.stack.join(", ")`, `margin: 0; max-width: 66ch`.
- The ship: `<figure class="ship">` with `margin: 0`:
  - `<div class="ship-plan">`: `border: 1px solid var(--rule); background: var(--background);
    padding: 12px 8px 8px` around `<LinesPlan view="page" seats={seats} />`. The drawing scales to
    the column: 744 px wide inside the box at 1440, 342 at 390. Plank numbers: `.plan-page
    .plan-plank { display: none }` below 768 px, and from 768 `font-size: var(--step-xs)` (11 px).
    The lift band is 7.5 px per 390 px of drawing width (`s` 0.5 on a 15-unit lift), so 14.2 px at
    768 and 14.6 at 1024 and up, where an 11 px number sits clear of both seams; below 768 the
    band falls under 13 px and the numbers go, as on `/` (sprint 22's lesson: fixed lettering over
    a scaling drawing is checked at the smallest width that shows it). The 5.0 wedge takes its
    leader as on `/`; the station figures, DWL, Base and the captions stay at `--step-sm`.
  - `<figcaption>`: `margin-top: 8px; font-size: var(--step-sm); line-height: 1.5; color:
    var(--foreground); font-variant-numeric: tabular-nums`. Inside: a row (`display: flex;
    flex-wrap: wrap; gap: 4px 24px; align-items: center`) of the count `<p>` "22 planks: 21
    replaced, 1 original" (the same expression as the revision block's) and the legend `<ul>`
    (`.swatch bg-card` "Seated by a sprint", `.swatch bg-card-old` "Original", the shipped
    markup); then `<p>` "Each replaced plank is one merged sprint; all N revisions are in the
    <a href="/sprints">Log</a>." with N the revision block's `entries.length`. The link is ink and
    underlined, 24 px tall.
- Metadata, for Forge and Quill rather than a design call: title `Read as page — Ruslan Shulga`
  (the pattern of `/sprints`' "Build log — Ruslan Shulga"; not the home page's), description the
  bio, canonical and og:url `/read`, the root's `opengraph-image` re-exported.

## 7. The not-found page

`app/not-found.tsx`: the skip link, then `main#main[tabindex="-1"]` with class `page` (section 6's
column and paddings, 40 px top from 1024, 12 below). No bar, no strip. Inside:

- `h1` "Page not found": `padding-top: 12px; border-top: 2px solid var(--foreground); margin: 28px 0
  0; font-family: var(--font-cond); font-weight: 700; font-size: var(--step-2xl); line-height:
  0.9` (317 px wide at 72, 233 at 52: one line at 320).
- `<p>` "Nothing is drawn at this address.": `margin: 12px 0 0; font-size: var(--step-base);
  line-height: 1.55; max-width: 66ch`.
- `<ul>` of the two links, "Back to the ship" → `/` then "Read as page" → `/read`: `display: flex;
  flex-wrap: wrap; gap: 0 22px; margin-top: 10px`; links `inline-flex; min-height: 44px (24 from
  1024); font-size: var(--step-base)`, ink, underlined.
- Title "Page not found — Ruslan Shulga". Both schemes from the tokens; nothing moves; no copper.

## 8. Print, both routes

In `app/globals.css`, after the dark block (same specificity, later, so it wins in either scheme):

```css
@page { margin: 16mm 18mm; }
@media print {
  :root {
    color-scheme: light;
    --background: #ffffff;
    --foreground: #111c22;
    --muted: #3d4549;
    --accent: #9e441d;
    --rule: #bfcac7;
    --pencil: #878d91;
    --card: #fbfaf7;
    --card-old: #d9e0dc;
  }
}
```

Ink on white is 17.3:1; the darkened graphite 9.8:1 (the screen value, 5.9:1, would fail B2.7's
7:1 wherever a check reads it as body text); the rest are the light values, so the drawing prints
as it does today. These redeclarations are the token names the colour-literal invariant already
allows. Then, under the same `@media print`:

- `/`: the bar `display: none` (today it is `print:static`; the contract hides it); the sheet as
  drawn; `.entry, .da { break-inside: avoid }`; `h2 { break-after: avoid }`; `.da-gateway, .swatch
  { print-color-adjust: exact }`.
- `/read`: `.strip-back, .strip-print { display: none }`; `.strip-url { display: block;
  justify-self: start; }` (`--muted`, `--step-sm`, left, under the page's top rule); `.page {
  margin: 0; max-width: none }` so the column fills the printable width; `.entry, .ship {
  break-inside: avoid }`; `h2 { break-after: avoid }`. Links keep their underline and print no
  URL after them (no `a[href]::after`): the address line says where the page is.
- The 404 prints as it looks.

Ctrl/Cmd+P gives the same result with or without the button.

## 9. Forced colours: the rider's values

```css
@media (forced-colors: active) {
  .plan .plank-original { fill: GrayText; }   /* seated stays Canvas */
  .swatch { forced-color-adjust: none; border-color: CanvasText; }
  .swatch.bg-card { background: Canvas; }
  .swatch.bg-card-old { background: GrayText; }
}
```

GrayText is the system's own "secondary", which is what an original plank is (the greyer card),
and in every Windows theme it differs from both Canvas and CanvasText; a hatch would take the
pencil state's meaning. The seated plank and its swatch stay Canvas with a CanvasText rule, so
both differ from the ground by their border and from each other by their fill. The lettering and
every stroke stay CanvasText as shipped. Detail A's rule is in section 4.

## 10. Riders: the social card and the favicon

- **The favicon rides.** `app/icon.svg`: `.mark { stroke: #111c22 }` and, in its dark block,
  `#e2eae9` (the ink tokens; the ground stays film); `app/favicon.ico/route.tsx`: `stroke=
  {LIGHT.foreground}`. The icon invariant (`e2e/invariants.spec.ts`, the `[palette.background,
  palette.accent]` line) then reads `palette.foreground` in place of `palette.accent`: Probe's one
  line. With that, nothing on the site is copper until something is live.
- **The card's copper bar rides.** `app/opengraph-image.tsx`: the 120 × 8 accent bar becomes
  `width: 120, height: 2, background: LIGHT.foreground`, the 2 px ink rule sprint 22's section 1
  asked for. One line; the same in `app/sprints/opengraph-image.tsx` if it draws one.
- **The card's typeface does not ride.** satori reads TTF, OTF or WOFF, not woff2, so the condensed
  name needs a vendored font file in `app/` loaded by both OG routes; a follow-up with its own
  review of the card, since the card is the first thing an executive sees when the link is shared.

## 11. What I'll look at in Part 2, and what these notes couldn't verify

Early, at 1440 and 390 in both schemes: the schedule against `work-*.webp` (the h2's weight beside
the entries, the date column's alignment with the company's first line, the rules); Detail A's two
layouts and the fan meeting its boxes; the bar at 390, 360 and 320; `/read` against `read-*.webp`,
the drawing's numbers at 768 and 1024, the strip with and without scripts; the 404; print previews
of both routes in dark mode. Not verified here: the bar's and Detail A's fits are computed from
measured glyph widths (Sofia Sans at 600, the condensed face at 700; the boxes are set at 600, which
is narrower), not rendered in a build; the dark `--card` contrast is sprint 22's measurement; no
WebKit is in reach.
