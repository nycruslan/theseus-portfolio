# Sprint 15 contract: the redesign ("the log of the Theseus")

Size: L, direction step, no product code. The owner accepts it by merging this PR (`needs-owner`). It
stands on Iris's `direction-iris.md` (cited "dir §n") and her prototype. Nothing was built or run for it
(Quill has no shell): numbers come from the direction, the prototype's source or the existing specs, and
anything I only saw by inspection says so.

## Outcome

A visitor lands on a page that is plainly one idea: the ship's log of the Theseus. The name, the title
band, the owner's bio and a cropped hull of 22 planks (one per merged sprint, copper for the newest,
bronze fading to the original tone) are readable and visible in the first viewport at 390 and 1440 px,
in real HTML, before any script. Later sections turn into ruled ledger rows and a ship scene, one
shippable sprint at a time. Every fact in `content/` stays word for word.

## The build, in order (Iris's B1 to B5, adjusted)

| # | Size | Builds | What I changed, and why |
|---|---|---|---|
| B1 | M, Probe's spike first | The hero (checks below): Libre Franklin as the body face, Besley on the `/` h1 only, derived tokens, title band, 22-plank SVG from `readSprintLog()` and the ORDER table, canvas parity at rest on the new hull. | Besley stays off `/sprints` until B2, so `sprints.spec` C7.1 ("one font") stands. The nav moves to B2 (below). The 3/4-bow yaw and the plank seating move to B5: both are unspiked camera work and they would break hero C4/C12 at rest. The canvas keeps today's +/-0.24 shear turn. |
| B2 | M | Ledger: rule, log rows (Experience, ruslanshulga.com, Education), Stack register, Contact, footer, `/sprints` in the ledger style, Besley everywhere it belongs, the nav. | Takes the nav from B1: four new links change the Tab order that `keyboard.spec` and sprints-entry C14.5 pin, which is a Probe-sized edit of its own. |
| B3 | M | Static ship scene: dark band, Theseus row, sprint rows, SVG stage with `:has()` highlight. | As Iris. Replaces project cards (see "Owner decisions" 8). |
| B4 | spike, then M | Sticky 3D stage, camera frames A to C. | As Iris; Probe's spike before its contract (sprint 9's lesson). |
| B5 | M | h2 "sets", plank seating, hero yaw, view transition to `/sprints`. | Grew from S: it now holds the hero motion. |

If B1's spike shows the canvas cannot reach parity on the cropped hull within budget, Atlas cuts the
canvas out of B1 only with the owner's yes (it would retire hero-3d C10 to C15 for a sprint). That is
the one path to a weakened test, so decide it early.

## B1 checks (Probe writes them red first; each is read in a browser)

The oracle is C14's: `N` is the count of valid `retro.json` files, never a literal; `lift.plank` for
sprint `n` is `ORDER[(n-1) mod 22]`, the 22 values copied from dir §4 into the spec.

1. **Faces.** `/` h1 computed `font-family` starts `Besley`, weight 800; body text on `/` and `/sprints`
   starts `Libre Franklin`; `/sprints` still shows one family. No request URL contains `geist`. The page
   fetches two woff2 files totalling at most 71,680 B and has two `rel=preload` links for them (prototype:
   36,592 + 29,292 B). Shown by: resource timing, computed style.
2. **The name.** h1 text is `profile.name`; computed size 136 px +/-1 at 1440 and 64 px +/-1 at 390, from
   a new `--step-display` token; one line at 1440, two at 390 (height over line height).
3. **The band.** Inside `main > header` after the h1, a full-width block with a 3 px rule, a 1 px gap,
   then a 1 px rule on top (prototype `.band`); three cells in order: `profile.headline`,
   `profile.location`, then `Build log` plus C14's unchanged span (`lineSpan(N)`). That line is one line
   at 320 and 390 and the link is at least 24 px tall, accent, underlined (C14.1 and C14.2 retargeted).
4. **The planks.** 22 `[data-hero-plank]`; exactly `min(N, 22)` carry `data-sprint`, numbers distinct.
   `[data-hero-copper]` is the plank of the highest sprint and sits where ORDER says. It paints within
   hero C7's existing copper tolerances in both schemes. Unreplaced planks paint
   `color-mix(muted 46%, ground)` in light and 30% in dark. Replaced planks lighten toward the original
   with age, strictly (dir §2 formula). The copper plank has the highest contrast against the ground of
   all 22, by a margin Probe reads off the prototype first (a prototype that fails this is Iris's to fix,
   not a reason to loosen the check). For `N > 22` the reader gives each plank the newest sprint that
   replaced it; a page-less test feeds it fixtures, as `sprints.spec` C12 does.
5. **The newest plank can be seen.** At scroll 0 the copper plank lies inside the viewport horizontally,
   and at least 70% of it vertically, at 390 x 844 and at 1440 x 900. This fails today's ORDER at sprint
   17 (see Risks): Iris fixes the order, not the check.
6. **The hull's footprint.** Bow within 1 px of the header's right content edge; stern clipped by the
   viewport (`left < 0`) at 390, 1024 and 1440; length `min(118vw, 1460)` +/-3 from 1024 and 135vw below;
   `scrollWidth - clientWidth` is 0 at 320, 390 and 1440. At least half of the hull is inside the first
   viewport at 390 x 844, 1024 x 768 and 1440 x 900 (kept from hero C2).
7. **Order on the page.** At 390 the hull's top is above the bio's top and the bio's top is above 844.
   At 1024 and 1440 the bio starts at column 7 (left edge +/-2 px of the 12-column grid) and its bottom is
   above the hull's top. Name, headline and the start of the bio are inside the first viewport at 1440 x 900.
8. **The hull is still decoration.** One `[data-hero]` div, `aria-hidden`, inside `main > header` after the
   band; every role clause of hero C1 and C9 stands (no text, no focus, no pointer events, no Tab stop,
   3 x 3 hit test finds none of it).
9. **Paint and stability.** LCP element is the h1 or the bio `p`, in the header, never inside
   `[data-hero]`, no url, at most 2,500 ms at 4x CPU, at 390, 1024 and 1440 (hero C5 kept, tag added).
   Layout shift is 0 over load plus 2 s (hero C4 kept; Iris's allowance of 0.01 is not taken).
10. **Canvas parity.** With the canvas up, at 1440 and 390 in both schemes: silhouette edges within
    1 px, stray pixels at most 0.1%, mean channel difference at most 8, copper median within 6 (hero-3d
    C13 kept, tolerances unchanged). The hero chunk is at most 12,288 B gzip, all late JS at most 15,360 B,
    first load at most 2,048 B above `/_not-found` (C15 kept), at most 4 draws per frame, none at rest
    (C12 kept). Reduced motion, Save-Data, weak device and lost context still leave the SVG only (C14).
11. **Hard gates.** axe, all tags used today, finds nothing at 320, 390 and 1440 in both schemes; no
    console error; reflow at 320. The detector's errors are Iris's and Lens's to run (not Playwright).

## What the existing suite does to B1

- **Stands unedited:** `keyboard.spec`, `reveal.spec`, `profile-sections.spec`, `content.spec`,
  `smoke.spec`, `sprints.spec` (C1 to C12), sprints-entry C14.2 (retargeted selector aside), C14.5, C14.6,
  C15; hero C5, C8 (sizes aside), C9; hero-3d C12, C14, C17.
- **Rewritten, every assertion kept (Probe; Lens counts `expect(`):** hero C1 (placement: inside the
  header, not between header and section), C3 and C2 (new footprint, checks 6 and 7), C4 (same rules,
  header markup), C7 (copper found through ORDER, not "third lift"); hero-3d C11 (shear and extents kept,
  air numbers re-measured), C13, C15; sprints-entry C14.1, C14.3 (the line is in the band, before the bio),
  C14.4 (gaps go; 1 line at 320, 390 and 1440 stays).
- **Would weaken a check, so the owner's call (decision 7):** hero C2's 688 x 138 box, 138.5 cap, 64 px
  gaps and centred-hull rule; C3's length formula; C7's "non-copper tone has contrast at most 3.0 and hue
  within 10 degrees of the ground" and its copper-width share 0.2 to 0.4; hero-3d C13.4 (nothing outside
  copper above 3.05 : 1); the 8,192 B markup cap (C6, C15.3); `invariants.spec`'s literal scan, which
  would flag `--bronze` (allow its declaration, as for the five tokens), and `STEP_TOKENS` gaining
  `--step-display`.

## Out of scope for B1 (and this PR)

Any change to `content/`; the nav, h2 treatment, rows, ship scene and stage (B2 to B5); the seating, the
3/4 yaw, the view transition; WebGPU or three.js; new pages; a theme toggle; edits to `e2e/`, `.github/`
or `.claude/` (Probe edits `e2e/` in B1); the prototype imported into `app/` (its SVG is a reference).

## Risks

- **The newest plank can fall off a phone.** At 390 the stern is cropped by about 185 of the hull's 624
  units. ORDER sends sprint 15 to 1.0 (x 0 to 87) and sprint 17 to 0.0 (the stern original), both inside
  the crop by my reading of the prototype's rects. Check 5 would fail on sprint 17. Iris's call: reorder,
  or crop less on phones.
- **Bronze rivals copper.** `--bronze` is `#7a6250` on `#e6f3f1`; at 95% mix the sprint just before the
  newest is nearly as loud as the copper (Probe measures). Iris may cap the mix (for example at 70%).
- **The hero SVG is longer than 8,192 B** by inspection (7 gradients, 22 rects, 7 clip paths), against
  Iris's 3 KB gzip budget. Compact it first; a higher cap is decision 9.
- **B1 is a big M**: type, layout, SVG and a renderer change. Probe's spike (renderer at 1460 px, DPR cap,
  bytes) is its first step; cut order if it overruns: nothing from checks 1 to 9, only the canvas (decision above).
- **Besley at 800 in mixed case can read as a poster** (dir §2); Iris reviews it in the browser, Lens cannot.
- **Fonts on the LCP path** (Besley at 1440): metric-fitted fallbacks, or check 9's CLS fails.

## Needs owner decision

1. The concept: the log of the Theseus (Quill: yes) or the network (Iris rejected it).
2. Besley as the display face (Quill: yes, with check 1 and Iris's mixed-case rule).
3. The dark band in light mode for the ship scene (B3; Quill: yes).
4. The latest plank moves each sprint (Quill: yes; specs read N, so a merge never edits a spec).
5. Bold on five phrases of the JPMorgan summary: words unchanged, B2.
6. The hull above the bio on phones. Quill: yes, but it puts the hull inside `main > header`, which edits
   hero C1 and C14.3/14.4 (above); the cheaper structure keeps them and loses the phone order.
7. The spec retirements listed above ("Would weaken a check"), approved as a set or one by one.
8. Replacing the project cards (B3): `cards.spec` (sprint 3, the card is the link) becomes row checks;
   `reveal.spec`'s section list and the `invariants.spec` section check follow in B2 and B3.
9. A higher markup cap for the hero SVG, if compaction cannot reach 8,192 B.
10. Moving the nav to B2 and the yaw and seating to B5 (Quill's scope change from dir §6).
Needs decision (Iris): ORDER or the phone crop (Risks 1); a cap on the bronze mix (Risks 2).
