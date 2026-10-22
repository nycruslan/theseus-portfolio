# Sprint 22 review (Iris): B1, the sheet in 2D

**Verdict: changes.** Three small faults, each specified below; nothing in the direction is wrong.

Reviewed at head 75adb24 on a production build of that commit (exported with `git archive` to my
scratchpad and served with `next start` on port 3421, so Probe's `.next` in the checkout was never
touched; the Vercel preview host is outside this session's proxy allowlist). Judged in a real
Chromium at 1440, 1024, 768, 390 and 320, light, dark and forced colours, against sprint 17's
canvas (`main.webp`, `motion-off.webp`, `night-1440.webp`, `hero-390.webp`), `design/rubric.md` and
production.

## Score

| | Design quality ×2 | Originality ×2 | Craft | Functionality | Weighted |
|---|---|---|---|---|---|
| Production (owner's calibration 08) | 6 | 5 | 8 | 9 | **6.5** |
| This build, as is | 8 | 8 | 7 | 9 | **8.0** |
| With the three musts | 8 | 8 | 8 | 9 | **8.2** |

**Better than production**, at every width and in both schemes. Production is one narrow column
with a small hull under it; the build is a drawing sheet with the owner's name as the largest
thing on the page and the crew's record beside it. Nothing reads as a template above the fold.

What holds design quality and originality at 8 rather than 9: the night scheme's hull is a slate
block rather than the lit object the approved night frame shows (departure 2); the facts below the
sheet are still the template column with 13 px uppercase labels under a 104 px name (B2's, by
contract); and the 2D sheet is the drawing without its signature moment yet. Craft loses a point
to the three faults below, all visible without measuring.

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | None. Every word on the sheet is `content/profile.ts` or a retro. |
| axe | Clean at 1440 and 390, light and dark, and on `/sprints` (`shots/results.json`). |
| impeccable detector | `[]` at every level over `app/page.tsx`, `app/globals.css`, `components/{bar,lines-plan,revisions,title-block,skip-link,project-card}.tsx`. |
| Reduced motion | `document.getAnimations()` is 0 at every width, at load and after scrolling. There is no transition or animation in the CSS. |
| 320 px | `scrollWidth` 320 at 320, light and dark; the bar fits one line. |
| Phone budget | LCP 236 ms at 390 × 844 under 4× CPU (the bio paragraph, text, no url); 220 ms at 1024 (bio); 208 ms at 1440 (the h1, 52,000 px² against the bio's 41,760, so the name wins at 1440 as the direction expects). CLS 0.000 at all three over load + 2 s with both fonts loaded (`shots/perf.json`). Fonts: two woff2, 40,336 + 40,520 = 80,856 B. |

## Changes

### Must

1. **Plank 5.0's number ("20") sits on the hull outline and the butt, at every numbered width.**
   Plank 5.0 is the stern wedge of lift 5: 25.9 hull units wide, 0 deep at its stern end and 9.8
   (two thirds of a lift) at its butt. The label is 12.3 units wide at 1440 and 23 at 768, so no
   placement on the plank is clear of a line; at 1440 the number spans x 294–310 on a plank box of
   x 270–304 (`shots/build-1440-stern-2x.png`, Atlas's sighting). A draughtsman leads a part too
   small to label out of the drawing. In `lib/lines-plan.ts` `draw()`, when a seated plank's deep
   stretch (the x range where depth ≥ 0.9 × min(deepest, `LIFT_DEPTH`), as `numberAt` already finds
   it) is **under 24 hull units**, do this instead of the centred number:
   - the number at `P(x0 − 22, yMid)` with `yMid = (plank.yTop + plank.yBot) / 2`, align `"end"`,
     kind `"plank"` (for 5.0: hull (114.35, 95.5), which lands between stations 1 and 2, 13 px clear
     of station 2 at 1440 and 7 px at 768, and between the DWL and the base line);
   - a leader `M${pt(P(x0 − 20, yMid))}H${X(x1 − 2)}` in a new `lines.leaders` path drawn before the
     outline, class `ln-leader` with `stroke: var(--muted); stroke-width: 0.75px` (the base line's
     pen). It crosses the outline at x0 and ends 2 units short of the butt.
   Only 5.0 qualifies today; 0.0 and 1.0, the next two to be seated, are 169 and 88 units wide.
   Not a chip under the number: on this wedge it would mask the outline.

2. **From 768 to 1023 px every plank number is taller than its band.** The lift band is 10.4 px at
   768 and the numbers are 13 px (`--step-sm`), so all 20 cross the seams above and below
   (`shots/build-768-drawing-2x.png`; `results.json` marks every number "taller than band"). At 1024
   the band is 13.9 px and 13 px fits. Fix, keeping decision 3.7 (numbers from 768) and the
   contract's 11 px floor: `--step-xs: 0.6875rem` on `:root`, and after `.plan-view > span` in
   `app/globals.css`:
   ```css
   @media (width < 64rem) { .plan-plank { font-size: var(--step-xs); } }
   ```
   Probe adds `--step-xs` to `STEP_TOKENS` in `e2e/helpers.ts` so the "every size is a token"
   invariant keeps reading it (a harness change, not a weaker test; the fluid-scale check passes
   with a constant step). If it still looks cramped on a real iPad, the alternative is numbers from
   1024, which reopens decision 3.7 with Quill.

3. **At 320 px the folded row's Approved cell wraps into the Rev column.** `repeat(auto-fill,
   minmax(4rem, 1fr))` fits three signatures at 320, so "Approved / Gate" starts a new grid row in
   column 1, under the sprint number, 36 px wide (`shots/build-320-fold-2x.png`; measured at
   x 16, 36 × 34). In the `(width < 40rem)` block of `app/globals.css`:
   ```css
   .rev tbody tr { grid-template-columns: 2.25rem repeat(4, minmax(0, 1fr)); }
   @media (width < 24rem) {
     .rev tbody tr { grid-template-columns: 2.25rem repeat(2, minmax(0, 1fr)); }
     .rev tbody th { grid-row: span 3; }
   }
   ```
   390 keeps its four 69 px columns as now; 375 and under get the signatures two by two beside the
   number.

### Cheap

4. **Night `--card` to `#58646a`.** Ink `#e2eae9` on it is 4.99:1 (B1.4 needs 4.5), against
   `--card-old` `#222d31` 2.32:1, against film 2.93:1 (`perf.json` → `contrast.darkOptions`). The hull
   then reads as the lit object on the night sheet, nearer the approved night frame, instead of the
   slate block of `#4b5659` (6.19:1, more than the rule needs). `lib/site.ts` carries only the five
   tokens, so no parity change.

## Forge's departures, my calls

1. Six steps: accepted. 13 px serves the table, captions and the location; the drawing below 1024
   needs the 11 px step (must 2).
2. Dark fills for 4.5:1: accepted for B1, with the lift in 4. The canvas's bright night hull with
   numbers on ink chips needs B1.4 reworded (contrast against the chip, not the fill); for Quill
   when B3 or B4 touches the drawing.
3. Bar above the frame, sticky: accepted; it is what the canvas draws at 1440 and my notes asked.
   The frame's border and the bar's rule align at 16 px in from each edge.
4. Rows fold on phones: accepted (the contract's "same rows at every width"); at 390 it reads well.
   320 needs must 3.
5. No rest line: accepted. "Last plank seated" belongs with the live state in B4.
6. Legend shortened: accepted; the footer line can't hold the canvas's legend at 1024.
7. Numbers on the full-depth stretch: accepted; right for every plank but the 5.0 wedge (must 1).
8. Even station numbers on the body plan: accepted; at 13 px the odd ones would touch, and it reads
   as a draughtsman's choice.
9. `display: optional`, no fallback list: accepted. The generic sans shows only on a device without
   Arial when the face misses the first paint; honest, and no shift. Noted for later.

## What waits for later sprints

- **B2:** the facts below the sheet are the visible seam between two worlds (the old column, the
  13 px uppercase section labels, the project cards), as the contract requires.
- **1024–1279:** the description column is about 215 px, rows wrap to three lines, and the title
  block shows some 190 px of empty film between the bio and the contact line
  (`shots/build-1024-block.png`). No clean fix inside B1; B2's layout pass should look at the block
  at that width.
- **Wording:** the count line says "replaced" (decision 3.2) and the legend "Seated by a sprint":
  two words for one state on one line. Settle it when B4's legend grows.
- **Night hull with chips** (departure 2) when a contract next touches B1.4.
- **A device without Arial** on a slow line paints the name in the generic sans, two lines at 1440
  and on Android phones; a vendored condensed fallback is a B2 refinement if it shows in the field.
- **The favicon** is now the one copper thing on a site where copper means live (contract: a
  follow-up for me, with the OG cards in B2).
- **CI:** `check` on 75adb24 failed on an npm registry timeout fetching pnpm, not the code.

## Web Interface Guidelines audit

- `app/globals.css:117` - `#main:focus { outline: none }`: a landing target, not a control; justified.
- `app/layout.tsx:18` - `display: "optional"` rather than `swap`: the brief's CLS 0 wins; justified.
- `components/bar.tsx`, `components/revisions.tsx`, `components/title-block.tsx`,
  `components/lines-plan.tsx`, `components/skip-link.tsx`, `app/page.tsx` - pass (hover and focus
  states, `scroll-padding-top` under the sticky bar, `tabular-nums` on the table, `translate="no"`
  on the names and the wordmark, `aria-hidden` and `focusable="false"` on the drawing,
  `theme-color` per scheme).

## Also checked

- The 20 seated planks match the ORDER rule and the retros (1 → 5.1 … 21 → 3.3; 0.0 and 1.0
  original); the five rows match the data rules; the count reads "22 planks: 20 replaced, 2 original".
- Tab order: skip link, Work, Log, Contact, the title block's three links, "All 20 revisions in the
  Log", the project cards, Contact's links. The skip link shows as a boxed label over the bar; the
  focus ring is 2 px ink, 2 px out, on links and on the card.
- Hover: 2 px underline on the bar's links, no colour change; nothing resolves to copper anywhere.
- Print: the sheet as drawn, the bar unstuck. Forced colours: the drawing is line art in
  `CanvasText` on `Canvas`, both schemes; the lettering survives.
- `/sprints` wears the tokens and Sofia Sans with its own layout, as the contract says.

## Evidence

Forge's captures: `.crew/screenshots/22/`. Mine, this session only:
`/tmp/claude-0/-home-user-theseus-portfolio/9ea38a72-c112-5538-933c-1deef054c4a9/scratchpad/shots/`
(`build-{1440,1024,768,390,320}-{light,dark}.png`, `build-1440-forced*.png`, `build-390-forced.png`,
`build-1440-stern-2x.png`, `build-1024-drawing-2x.png`, `build-768-drawing-2x.png`,
`build-320-fold-2x.png`, `build-1024-block.png`, `build-1440-print.png`, `build-1440-skip.png`,
`build-1440-hover-bar.png`, `build-1440-card-focus.png`, `prod-{1440,1024,390}-{light,dark}.png`,
`results.json`, `perf.json`), made by `../review.mjs`, `../perf.mjs`, `../extra.mjs`,
`../fold320.mjs`; the plank geometry by `../geom.mjs` on `lib/half-model.ts`.
