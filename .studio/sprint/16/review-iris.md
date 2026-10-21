Verdict: changes 7.7/10, better than production (6.5). One budget miss blocks it: on a slow phone the font swap shifts the page by 0.034, up from production's 0.015. It has a proven cheap fix (finding 1). Everything else is advice.

# Sprint 16 review (Iris): B1, the hero

I reviewed head `0812612` as a production build (`next start` on 3371), in Playwright's Chromium (headless
shell 1248) at 1x and 3x. I looked at `/` and `/sprints` at 1440 x 900, 1024 x 768, 390 x 844 and 320, in
both schemes, with the canvas up (the harness's caveat strip) and with WebGL refused. I set the build
beside the prototype (`.studio/sprint/15/prototype/index.html`) and production
(https://theseus-portfolio.vercel.app, HTTP 200, live). The screenshots are in `.studio/screenshots/sprint-16/`,
which is git-ignored: `b1-*`, `proto-*`, `prod-*`, `zoom-*`.

## Compared with production: better

Production is the template skeleton: one centred 672 px column with a 138 px hull (calibration 07 and 08).
B1 opens on a world. The name is set as a Clarendon nameplate on a printed form's rule. The band reads as a
form's header cells. The hull is the build log, read out in metal at full bleed: 22 planks, sprint 15 in
copper on lift 1, plank 2, exactly where ORDER puts it. The build matches the prototype almost to the pixel
at 1440 and 390. The canvas and the SVG can't be told apart at rest in either scheme (`b1-1440-dark-gl.png`
against `-nogl.png`).

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | Pass. Nothing added. The stand-ins already on production are unchanged and no more prominent. |
| axe (wcag2a/aa, 21a/aa, 22aa, best-practice) | Pass: 0 violations on `/` at 1440, 1024, 390 and 320, and on `/sprints` at 1440, 390 and 320, both schemes. |
| Detector errors | Pass: no errors. `/` gives 2 `low-contrast` **warnings**, both false positives: the band's thin rule is a background gradient, and the detector reads it as the cells' background (finding 4). `/sprints`: none. Production's `overused-font` (Geist) is gone. |
| Reduced motion | Pass. No canvas; the SVG at rest (`b1-1440-reducedMotion.png`). |
| Reflow at 320 | Pass: `scrollWidth - clientWidth` = 0 at 320, 390, 1024 and 1440, both routes. |
| Phone budget: LCP | Pass. On the slow profile (4x CPU, 1.6 Mbps, 150 ms RTT, 390 x 844), LCP is the bio `p` at **592 / 612 ms**, against production's 692 / 952 ms. Unthrottled, LCP is the h1 at 1440, 1024 and 320 and the bio at 390, so it's always text. |
| Phone budget: no shift | **Miss: CLS 0.034 at 390 on the slow profile** (production: 0.015), and 0.008 at 1440. Finding 1. Probe's check 9 can't see it: without throttling, the fonts arrive before first paint and CLS is 0. |

## Score

| Criterion | Weight | Score | Why |
|---|---|---|---|
| Design quality | x2 | 8 | One mood from type to object. The hero is a composed page, not a header. Held back by the seam into today's column (below). |
| Originality | x2 | 8 | Nobody else's hero is a data-driven patina on a half-model under a Clarendon nameplate. Nothing reads as a library default. |
| Craft | x1 | 7 | Very close to the prototype. The misses are small and specific: the descender nearly touches the rule at 1024, the headline widows at 390, a 4 px jog at 390, and the thin rule is lost in forced colours. |
| Functionality | x1 | 7 | axe-clean, keyboard focus is right (the ring clears the dot by about 6 px at 3x), and the reduced-motion and no-WebGL fallbacks match. The font-swap shift grew. |

**Weighted: (16 + 16 + 7 + 7) / 6 = 7.7/10.** With finding 1 fixed I'd score functionality 8, for 7.8.

## On the things Atlas asked me to weigh

- **Besley 800 at 136 px: no poster.** In mixed case at -0.02em it reads as a masthead nameplate. The thick
  and thin rule straight under it makes it a printed form's heading, not a wanted bill. The name ends about
  270 px short of the rule at 1440, and that asymmetry carries the page. At 64 px on a phone it's two
  confident lines. Keep the mixed-case rule forever; caps would tip it. The only craft issue is the
  descender (finding 2).
- **Experience spacing tightened (`gap-6`, `mt-1`): accepted for B2's sake.** It's needed so reveal C1 holds
  at 1440 x 900, and the 4 px between the period and the summary is tight but legible. But Education, which
  sprint 6 made a sibling of Experience, still has `gap-8` and `mt-2`, so the family now differs (finding 5).
- **`main`'s 96 px top padding kept: accepted.** With no nav, the name's cap line at about 110 px is the right
  weight, and it lifts the whole hull into the first viewport at 1440 x 900 (keel at about 862). The
  prototype's hull ran off. For B2: put the nav *inside* those 96 px, don't add to them, or the keel at
  1024 x 768 falls back below the fold (check 5's case).
- **Stations ruler not built: accepted for B1, into B2.** Without it, the hull on a phone still has honest
  air: about 14 px above the bow tip and about 38 px below the keel to the bio. The half-model is top-heavy,
  so it wants more air below than above, and it has it. The ruler is a ledger element, and it belongs with
  B2's rules and tabular figures.
- **viewBox headroom of 10 units: accepted.** Scrolled 420 px at 1440 with the canvas turning
  (`b1-1440-light-scrolled.png`), the gunwale never clips. The same air gives the bio's last line room above
  the bow (about 40 px at 1024 and 50 at 1440).
- **Today's column below the new hero: coherent enough for one sprint, not as an end state.** The faces and
  palette carry through, so it reads as a cover page and then a document (`b1-1440-light-full.png`). The
  seam is scale and axis: a 136 px slab on a 12-column grid hands off to a centred 672 px column. Its tracked
  11 px kickers ("EXPERIENCE"), which the direction bans, now look smaller than ever, and its left edge
  (x = 408 at 1440) lines up with nothing in the hero (margin 48, column 7 at 732). Ship B2 next, before
  anything else.

## Findings

1. **The font swap shifts the page on a slow phone (CLS 0.034 at 390, against production's 0.015 and the
   direction's budget of 0.01).** File: `app/globals.css:14-30`.
   - Root cause, measured: neither fallback face resolves on Linux Chromium. That's CI's browser, and it's
     also the case on Android, the budget's "mid phone". `local("Arial")` and `local("Times New Roman")`
     match nothing there, so the stack falls to plain `serif` and `sans-serif`.
   - Even where Times does resolve, `size-adjust: 123.71%` was fitted to Besley's regular width, not 800.
     The name is 808 px wide in the fallback against 1070 px in Besley at 1440, and the headline 284 px
     against 360 px.
   - At 390 that matters because the headline cell is two lines in Besley but one in the fallback. The band
     grows 28 px at the swap, pushing the hull and bio down (attribution: `P.bio 512 -> 541`, `DIV.hero
     397 -> 425`).
   - **Cheap fix, proven by injecting it into the running build:**
     - Add metric-compatible locals: `src: local("Arial"), local("Liberation Sans"), local("Arimo")` and
       `local("Times New Roman Bold"), local("Liberation Serif Bold"), local("Tinos Bold"), local("Times New Roman"), local("Liberation Serif")`.
     - Refit `size-adjust`: Libre Franklin about **104.6%**; Besley as two faces, `font-weight: 700` at about
       **127%** and `800 900` at about **132%**.
     - Result on the slow profile: CLS **0.0007** at 390, **0.0014** at 1024 and **0.0012** at 1440.
     - Forge should refit the numbers from the files rather than take mine. For Android, a second fallback
       family on `local("Roboto")` / `local("Noto Serif")`, with its own overrides, placed after the first
       in `--font-sans` and `--font-display`, is the complete fix. That can be B2 if it's too much now.
     - Probe: check 9 wants a throttled-network run so this can't come back. Network emulation plus 4x CPU,
       as I ran it (scratch script, not committed).
2. **At 1024 the descender of "Shulga"'s g sits about 3 px above the band's 3 px rule** (`zoom-1024-g.png`;
   about 7 px at 1440). It reads as a collision. Cause: `margin-top: clamp(20px, 2.4vw, 36px)`
   (`app/globals.css:241`) grows with the viewport, but the descender grows with the display size, and the
   two part ways around 1024. Fix: tie it to the face, `margin-top: calc(var(--step-display) * 0.25 + 4px)`.
   That's 20 px at 390 (unchanged), 31 at 1024 and 38 at 1440, so the hull moves down 6 px at 1024 and 3 px at
   1440. Probe should rerun checks 5 and 7 and reveal C1; I expect them to hold (the copper plank is on
   lift 1, high in the hull).
3. **The headline widows at 390: "VP Engineering, AI / Platform".** In Besley it's 354 px against a 350 px
   cell, so it breaks by 4 px. The prototype set "VP Engineering, / AI Platform". Fix: add `text-wrap:
   balance` to the headline cell (`app/page.tsx:74`, or `.cell:first-child` in `app/globals.css`). The
   guidelines ask the same of headings.
4. **The thin rule is a background gradient** (`app/globals.css:245`). That has two costs:
   - forced colours drop it, so the thick and thin becomes one rule (`b1-1440-forcedColors.png`);
   - the detector reads it as the cells' background and reports false contrast warnings of 1.0:1 and 2.4:1.

   Fix: draw it as a border on a pseudo-element, which forced colours keep as CanvasText:
   `.band { position: relative } .band::before { content: ""; position: absolute; inset-inline: 0; top: 2px; border-top: 1px solid var(--foreground) }`.
   Drop the `background`. The band's box doesn't change, so check 3 is unaffected.
5. **Education no longer matches Experience** (`app/page.tsx:148, 155`: `gap-8`, `mt-2`, against `gap-6`,
   `mt-1` at :108). Sprint 6 made them one family. Fix: the same two classes on Education. No spec pins them.
   Optional, since B2 rebuilds both as log rows; take it if Forge is in the file anyway.
6. **At 390 the hero's left edge sits 4 px left of the column below it**: `--margin` is 20 px against `main`'s
   `px-6`, 24 px. You can see it as "Ruslan" over "EXPERIENCE". This is for B2, which puts the column on the
   grid: `px-[var(--margin)]` on `main` fixes it, but it moves every section 4 px, so Probe's width checks
   are B2's to retarget.
7. **The deck's `calc()` inside `color-mix()` lost its guard** (`app/globals.css:411` against `:435`). The
   `@supports` test went back to the plain form. A browser that parses `color-mix` but not a `calc()`
   percentage paints the deck black (sprint 8's rule). Fix: precompute it as a token, `--deck: 32%` in light
   and `16%` in dark, which drops the `calc()`. Or restore the `calc` form in the `@supports` test. This is
   minor, because those engines are old.

Not findings, checked and fine:
- canvas parity at rest in both schemes;
- the scroll turn's headroom;
- the focus ring on "Build log" at 3x;
- `/sprints` in Libre Franklin: axe-clean, one family;
- two woff2 files preloaded by `Link` header;
- the dark original planks sit low against the ground, as the prototype drew them (the silhouette is
  carried by the bronze planks; revisit with the dark stage in B3).

## Web interface guidelines (pinned copy), on the files B1 touched

- `app/page.tsx:74`: the headline is a heading-like cell without `text-wrap: balance` (finding 3).
- `app/globals.css:14-30`: the fallback faces don't match on every platform (finding 1).
- `app/page.tsx:91`: "15 sprints" isn't tabular. That's fine alone; B2's log columns need
  `font-variant-numeric: tabular-nums`, as the direction says.
- No other rule applies; there are no forms, images or motion beyond what the specs cover.

## For B2

- The nav, inside `main`'s 96 px top padding (above).
- The stations ruler under the hull, with the ledger's rules.
- Tabular figures site-wide.
- The column onto the grid (finding 6).
- The thick and thin rule as the section heads, replacing the tracked kickers.
- Besley on `/sprints`, so the Build log link doesn't drop the visitor from a slab nameplate to a grotesque.
- The Android fallback faces, if they don't land in B1.
- Hold the hull's top composition when the nav arrives: check 5 at 1024 x 768 is the binding case.

## What I couldn't verify

- Real phones, Safari and Firefox: only Playwright's Chromium was used.
- Android's `local()` matching was inferred from the Linux result, not observed.
- The slow-profile numbers are from one throttled Chromium, two runs each, not Lighthouse.
- The canvas on a real GPU.
