# Sprint 23 review (Iris): B2, the facts and `/read`

**Verdict: ship, 8.5/10.** Better than production at every width and in both schemes; every hard
gate passes; no musts. Three cheap changes below, none of which holds the PR.

Reviewed at Forge's final tree b54e729, served as a production build on port 3419, in a real
Chromium at 1440, 1024, 390 and 320, light, dark, forced colours and print, beside production
(https://theseus-portfolio.vercel.app, B1 as shipped) at the same viewports, against the frames
`work-1440.webp`, `work-390.webp`, `read-1440.webp` and `read-390.webp`, `design/rubric.md` and the
owner's calibration. My notes for the build: `.crew/sprint/23/notes-iris.md`; the early look's
four changes (sections padded 28/24/40, the 66ch cap at every width, the 404 head at
`--step-entry`, the 66ch meta line on `/read`) are in this tree.

## First verdict: compared with production

**Better.** Production ends the sheet with the template column: 13 px uppercase labels, the role
and company run together as one heading, project cards with arrows, a narrow `max-w-2xl` column
floating under a full-width drawing (`review/prod-1440-light-facts.png`, `prod-390-light-facts.png`).
The build continues the sheet: a 2 px rule, a 72 px condensed head on the left, the schedule's
entries on the right with the dates in their own column, the company in large type, Detail A drawn
from the summary's own words, projects as rows with one labelled link, and Contact as three
display links (`build-1440-light-facts.png`, `build-1440-light-projects.png`). The same holds at
1024 and at 390, where production's "WORK" label is replaced by the 52 px head and the stacked
entries. `/read` and the 404 have no counterpart on production: `/read` is 404 there.

## Score

| | Design quality ×2 | Originality ×2 | Craft | Functionality | Weighted |
|---|---|---|---|---|---|
| Production (B1, sprint 22's review) | 8 | 8 | 8 | 9 | **8.2** |
| This build | 9 | 8 | 8 | 9 | **8.5** |

Calibration: the owner's 04 (Lusion) is 8.5 and 06 (By Kin) 8.7; 08 (the site before the
redesign) 6.5. This page is a coherent sheet from the bar to Contact, in one type system and one
material, which earns design quality 9 (the 10 would need the signature moment, B3). Originality
stays 8: the schedule layout and the drawn detail are deliberate and nothing reads as a template,
but the page is still the lines plan without its loft, as it was in B1. Craft 8: alignment is now
one edge, the measure is capped everywhere, the type scale is complete and the details survive
forced colours and print; the point not given is the title block's empty film at 1024 to 1279
(B1's, untouched by contract) and the dark scheme's Detail A boxes, which are heavier than the
light scheme's (below). Functionality 9: every fact reads with scripts off, `/read` prints as a
document, the 404 has a way back, Tab order and targets are right, LCP is 224 ms on the slow
profile.

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | None on `/`, `/read` or the 404 (`results.json` → `gates.placeholder*`). Every word is `content/profile.ts`, a retro, or the notes' own copy (the caption, the 404 line). |
| axe | Clean on `/`, `/read` and `/no-such-page` at 1440 and 390, light and dark, with and without the skip link showing: 24 runs, 0 violations (`results.json` → `axe`). |
| impeccable detector | `[]` over the 24 files the sprint changed in `app/`, `components/` and `lib/` (the only warning is the deleted `project-card.tsx`). |
| Reduced motion | `document.getAnimations()` is 0 at load, after 2 s and after scrolling to the foot and back, on all three routes. No transition or animation in the CSS. |
| 320 px | `scrollWidth − clientWidth` is 0 on all three routes at 320. The bar's four links fit at 13 px (`build-320-bar.png` shows the 404 at 320; the bar at 320 is `early/home-320-light-bar.png`). |
| Phone budget | At 4× CPU: LCP 224 ms at 390 × 844 on `/` (the bio paragraph, text) and 264 ms at 1440 (the h1); 292 ms at 390 and 164 ms at 1440 on `/read` (the JPMorgan summary, text, in `main`). CLS 0 on both routes at both widths over load + 2 s, both faces loaded (`results.json` → `perf`). |

## Also checked

- **Fonts and metadata on `/read`:** two woff2, 40,520 + 40,336 = 80,856 B, both preloaded;
  `/sprints` preloads the text face alone, so it stays one family. Canonical and og:url
  `https://theseus-portfolio.vercel.app/read`, og:image served, description the bio, title "Read
  as page — Ruslan Shulga".
- **Riders:** `icon.svg` has no copper and carries the ink hexes; `/favicon.ico` answers 200
  `image/png`; the social card answers 200. In forced colours the original plank and its swatch
  fill GrayText while the seated ones fill Canvas with a CanvasText rule, so the legend names two
  different boxes (`build-1440-forced-focus.png`).
- **Forced colours:** the facts are line art in CanvasText; Detail A's boxes keep their rules and
  the gateway shows its second rule; the connectors follow `currentColor`; a focused bar link shows
  one ring (`build-1440-forced-facts.png`, `build-1440-forced-focus.png`).
- **Print, dark scheme emulated:** `/` prints ink on white with the bar gone, the sheet as drawn,
  Detail A with its gateway filled (`build-1440-home-print.png`); `/read` prints as one document
  with the address line at the top, Back and Print gone, the column at full width and the drawing
  with its numbers (`build-1440-read-print.png`). Page count not measured (not gated).
- **Geometry against the notes** (the early look's `early/results.json`, unchanged by the four
  edits except as intended): h2s at 40 px like the wordmark and "Revisions", lists ending at
  1400 like Read as page; the period's top inside the h3's first line box; the project link
  39 × 24 at 1440 and 44 tall at 390, named "Theseus GitHub"; Detail A 1,017 B with the row from
  a 640 px container and the three providers in one row at 320; `/read`'s column 760 px at 200,
  text at 594 px (66ch), the meta line now capped and wrapping to two lines; the page view of the
  drawing with 11 px numbers from 768 and none at 390; 22 planks, 10,004 B.
- **Against the frames:** `work-1440.webp` and the build differ in the rules' inset (16 px, with
  the sheet's frame, instead of full bleed), the head's left edge (40 px instead of 56, so it
  aligns with the sheet) and the date column at 13 px instead of 14. `read-1440.webp` and the
  build differ in the text measure (66ch instead of the frame's 100 characters). Each is a call I
  made in the notes or the early look, not a slip.

## Changes

### Must

None.

### Cheap

1. **Dark scheme, Detail A's unfilled boxes.** The four `--card` boxes are `#58646a` on the night
   film, the heaviest things on the page below the sheet (`build-1440-dark-facts.png`). They
   read as plank material, which is coherent, but on the light sheet the same boxes are near-white
   on film, a whisper. If the owner finds the night version heavy, `.da-box { background:
   var(--background) }` under `prefers-color-scheme: dark` (ink rule on film, the gateway unchanged)
   is one line; I'd look at it on a real OLED phone first. Not for this PR unless Forge is in the
   file anyway.
2. **The project link below 1024.** Its 44 px box leaves the row's rule 32 px under the link's
   text against 18 px under every other entry (`early/home-390-light-projects.png`). `margin-bottom:
   -10px` on the link's paragraph (my notes, section 3) closes it. One value.
3. **`/read`'s figcaption at 390.** The count line, the legend and the sentence stack as three
   lines with a 4 px gap; `gap: 6px 24px` on the row reads a touch better. Cosmetic.

## What waits for later sprints

- The title block's empty film at 1024 to 1279 (sprint 22's note) is still there; B3 or B4, when
  the block gains the live layer.
- The social card still sets the name in Geist (follow-up, with a vendored TTF); its copper bar is
  now an ink rule.
- B4's fifth bar link (Crew) will not fit the phone row at 16 px (notes, section 5).

## Web Interface Guidelines audit

- `components/print-button.tsx` - a `<button>` that exists only when scripts run, in a reserved
  slot, named "Print"; pass.
- `app/read/page.tsx`, `components/schedule.tsx`, `components/project-row.tsx`,
  `components/detail-a.tsx`, `components/bar.tsx`, `app/not-found.tsx` - headings in order, one
  `h1` per route, sections as named regions, links underlined and ink, 24 px targets, `aria-hidden`
  on the connectors and the drawing, `tabular-nums` on dates, `scroll-padding-top` under the sticky
  bar; pass.
- `app/globals.css` - print tokens redeclared under `@media print` after the dark block; the
  address shown and the controls hidden under print; `break-inside: avoid` on entries, the figure
  and the ship; pass.

## Evidence

- Full review, this session: `/tmp/claude-0/-home-user-theseus-portfolio/8e87b46e-ebba-529f-b47e-1307d6c04bc3/scratchpad/review/`
  (`results.json`: axe, gates, perf, assets, metadata; `build-{1440,1024,390}-{light,dark}-facts.png`
  and `-projects.png` beside `prod-*`; `build-*-read.png`, `build-*-404.png`,
  `build-1440-light-read-top.png`, `build-1440-home-print.png`, `build-1440-read-print.png`,
  `build-1440-forced-facts.png`, `build-1440-forced-focus.png`, `build-320-bar.png`;
  `build-1440-light-full.png` is the whole page at 1440), made by `../review.mjs` and
  `../readcol.mjs`.
- Early look (b54e729's parent tree on port 3417): `../early/` (`results.json` with every rect and
  computed style quoted above; `home-*`, `read-*`, `404-*`, `forced-*`, `print-*`, `hover-*`,
  `focus-*`), made by `../early.mjs`.
- Font measurements on production for the notes: `../shots/measure.json`.
