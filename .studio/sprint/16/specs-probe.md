# Sprint 16 specs (Probe): B1, the hero, red first

The checks are `.studio/sprint/15/contract.md`, "B1 checks" 1 to 11, unchanged. This page says where each
one lives, what Forge and Pixel must build to (module, data attributes, tokens, traps), how it was
proved, and every assertion retired or retargeted, for the owner's decision 7. Spike:
`spike-probe.md`.

## 1. Where each check lives

| B1 | Test (file, title) | Today's main |
|---|---|---|
| 1 Faces | `hero-b1.spec.ts` B1.1 | red |
| 2 The name | `hero-b1.spec.ts` B1.2 | red |
| 3 The band | `hero-b1.spec.ts` B1.3; `sprints-entry.spec.ts` C14.1, C14.3, C14.4 (rewritten), C14.2 (unedited, selector still matches) | red |
| 4 The planks | `hero-b1.spec.ts` B1.4 (page) and B1.4 fixtures (page-less); `hero.spec.ts` C7 (tones, copper tolerances) | red |
| 5 Newest plank seen | `hero-b1.spec.ts` B1.5 | red |
| 6 Footprint | `hero.spec.ts` C3 (bow, length, crop, 767 to 768), C2 (overflow at 320/390/1440, half the box on screen), C8 (same length with scripts off, reduced motion, Save-Data) | red |
| 7 Order | `hero.spec.ts` C2 | red |
| 8 Decoration | `hero.spec.ts` C1 (rewritten placement), C9 (unedited) | C1 red, C9 green |
| 9 Paint, stability | `hero.spec.ts` C4 (unedited), C5 (header and tag added) | green: they hold today and must keep holding |
| 10 Canvas | `hero-3d.spec.ts` C10, C14 (unedited), C11, C12, C13, C15 (edited); `webgl.ts` spacer | C13 red; the rest green |
| 11 Hard gates | `hero-b1.spec.ts` B1.11 | green: a regression gate that must stay green |

Full suite against today's main build, `next start` of this branch before any B1 code: **121 passed, 1
skipped (content.spec's TODO(owner), as before), 16 failed**. The 16 are: hero-b1 B1.1, B1.2, B1.3, B1.4,
B1.4 fixtures, B1.5; hero C1, C2, C3, C7, C8; hero-3d C13; sprints-entry C14.1, C14.3, C14.4; invariants
"the color and type-step tokens are set on :root" (`--step-display`). Every other spec, `sprints.spec`,
`keyboard`, `reveal`, `cards`, `profile-sections`, `content`, `smoke`, and the rest of `invariants`, is
green and untouched.

### How the checks were proved to read the right thing

The prototype is the reference. A scratch server (not committed) served `.studio/sprint/15/prototype`
with the hooks below added, the planks regenerated for N = 15, the stations ruler removed (text), and
`--background` and `--foreground` aliased. Against it: **B1.2, B1.3, B1.4, C2, C3, C7 pass**; C1 passes
once it has `aria-hidden` and `pointer-events: none`; B1.5 fails only at 1024 x 768, only for planks 6.0
(0.09 of its area on screen) and 6.1 (0.04), exactly Iris's 0.07 and 0.03 (the contract's "B1 must raise
the hull"); B1.1 fails on the missing preloads and on the prototype's Besley h2s, company names and
contact links (B2's work, not B1's); C4 reads 0.026, 0.007, 0.008 of layout shift (no fallback metrics in
the prototype). The reader's own numbers on the prototype match Iris's: per-plank shares at 390 x 844 and
1440 x 900 are 1.00 except plank 0.0 (0.84) and 1.0 (0.82); the copper contrast is 6.06 (light) and 6.36
(dark) against 3.88 and 3.65 for the loudest other plank, ratios 1.56 and 1.74.

Ten mutants of that reference, all killed by the checks named: copper on the wrong plank, every bronze at
95%, a duplicated `data-sprint` (B1.4); bow 10 px inside the content edge, length factor 1.0 (C3); bio in
column 8, hull after the bio on a phone (C2); a 2 px top rule (B1.3); a 112 px name (B1.2); the hull
dropped 320 px (B1.5 and C2). The fixture tests ran against a throwaway `lib/hull-planks.ts` (deleted,
never committed), which only proves the spec's mechanics.

## 2. What Forge builds to

### The module `lib/hull-planks.ts` (loaded by `await import`, so its absence fails only B1.4 fixtures)

```ts
export const ORDER: readonly string[];            // 22 "lift.plank" strings, dir section 4, verbatim
export const PLANKS_PER_LIFT: readonly number[];  // [3, 4, 3, 4, 3, 3, 2], deck first (sums to 22)
export type PlankTone = {
  sprint: number | null; // the newest sprint that replaced this plank, null while original
  mix: number | null;    // integer percent of --bronze, null when original or copper
  copper: boolean;       // true for the plank of the highest sprint, and only that one
};
/** `sprints`: the numbers of the valid retros (distinct, positive; the specs pass 1..N).
 *  Always 22 entries, in DOM order: deck lift first, stern to bow within a lift. */
export function plankTones(sprints: readonly number[]): readonly PlankTone[];
```

Rules the fixtures pin: sprint n replaces `ORDER[(n - 1) % 22]`, and the newest sprint to reach a plank
wins it (N > 22); with L the highest sprint, the copper plank is sprint L's, the others take
`mix = Math.round(75 - 45 * (L - n) / (L - 1))`; N = 0 has no copper and nothing replaced; N = 1 has one
plank, copper, `mix: null`; `mix` never exceeds 75, and falls strictly with age. Fixtures: N = 0, 1, 2, 14,
22, 24, 36 (none puts 45 x age on a half, where `round` is ambiguous), and `readSprintLog().length` on
the page. `L` is the highest sprint number, which equals N while the log is 1..N (the page test asserts
that premise).

### Hooks in the markup (all in the server HTML, before any script)

| Hook | Where | Read by |
|---|---|---|
| `data-hero` | the one box, a `div`, `aria-hidden="true"`, inside `main > header` after the band | C1 to C9, hero-3d |
| `data-hero-hull` | the hull (the `svg` will do): must exist once and be visible | C7, C8, hero-3d |
| `data-hero-band` | the title band: after the h1, inside the header, the full content width | B1.3, C1, C2, C3, C14.x |
| `data-hero-cell` | each of the band's three cells, in DOM order: headline, location, home line | B1.3, C2, C14.x |
| `data-hero-plank` | 22 shapes inside the svg, in DOM order: deck lift first, stern to bow in each lift, as the prototype lists them | B1.4, B1.5, C7, C13 |
| `data-sprint` | on exactly `min(N, 22)` planks, the number as text | B1.4 |
| `data-hero-copper` | on the same element as `data-hero-plank` for the highest sprint, only there | B1.4, C7, C13 |
| `data-hero-shear` | on the box while the canvas is up (as today) | hero-3d |

Traps, each one a failure found on the prototype or in the old specs:

- **A plank's tone is its own computed `fill`**, a plain colour (not `url(#...)`): C7 and B1.4 read it.
  Shading goes on a separate shape over the plank. (The prototype's multiply layer darkens copper by
  0.088 of OKLCH lightness in dark, past C7's 0.06 window, so painted pixels are not what C7 reads.)
- A plank may be a clipped `rect` or a `path` of its own: B1.4 and B1.5 rebuild its shape from `d`, the
  `rect`'s attributes and every `clip-path` on it and its ancestors, so either works. They need no
  transform on a plank or on a clip path other than the svg's `viewBox`.
- **The svg is the hull's box** (`[data-hero] svg`, the first one): B1.6 (in C3) checks its right edge
  within 1 px of the band's right edge, its width `min((cw - margin) x 1.048, 1460)` +/- 3 with
  `margin = clamp(20px, 3.4vw, 48px)`, and `left < 0` at 320, 390, 1024 and 1440. The prototype passes. The
  bow *tip* sits a few units inside that edge because of the viewBox's padding; that is the prototype's
  and is what the numbers 388, 1037 and 1459 describe.
- No text and no `canvas` inside `[data-hero]` before the upgrade: the prototype's stations ruler (digits)
  must sit outside it.
- `main > header` ends before `main > section`; `header.nextElementSibling` is the first section (C1).
- Bio at column 7 from 1024: left edge of the `p` whose text is `profile.bio`, the grid being
  `margin = clamp(20px, 3.4vw, 48px)`, `gutter = clamp(16px, 1.7vw, 24px)`, 12 columns.
- Forced colours: `[data-hero]` is `display: none` (C8, as today). The prototype lacks it.
- **Colour literals**: `invariants.spec` still scans `app/` and `components/` for hex, `rgb()`, `hsl()`,
  `oklch()`; only the declarations of `--background|foreground|muted|accent|rule|bronze` are exempt. The
  prototype's `stop-color="#000"` would trip it: use a token, `black`, or a CSS variable.
- **C14.2 stands unedited**: the home link must compute the Contact links' `display` (inline-block),
  `textUnderlineOffset` (4px), colour (accent) and underline, with the span `--muted`. The prototype's
  `0.22em` offset fails it.
- **Besley on `/` is the h1, and the band's cells, only**: B1.1 fails any other text on `/` whose first
  family is not Libre Franklin (the prototype sets h2s, company names and contact links in Besley; those
  are B2's, and B2 edits this assertion). `/sprints` shows only Libre Franklin.
- next/font names faces `__Besley_<hash>` and adds `__Besley_Fallback_<hash>`: B1.1 strips the prefix, the
  hash and ` Fallback`, so those are fine. Exactly two woff2 files on `/`, together at most 71,680 B,
  exactly two `link[rel=preload][as=font]` whose hrefs are those two files; no request names Geist.
- B1.2 and B1.3 want one h1; B1.2 wants `--step-display` as a custom property on `:root`.

### Tokens the specs rely on

- `--step-display` on `:root`: the h1's `font-size` equals `var(--step-display)` (B1.2); it is in
  `STEP_TOKENS` (e2e/helpers.ts), so `invariants.spec` also requires it set, fluid, and the source of the
  h1's size.
- `--bronze` on `:root`, a colour in both schemes (B1.4 mixes it with `color-mix(in oklab, ...)`).
- `--rule-strong` on `:root` (B1.3 only checks it is set).
- Unchanged: `--background`, `--foreground`, `--muted`, `--accent`, `--rule`.

### What each B1 check expects of numbers

B1.4 tones: original plank = `color-mix(in oklab, --muted 46%, --background)` in light, 30% in dark;
replaced = `color-mix(in oklab, --bronze M%, <original>)`; both within 3 channel levels of the browser's own
mix. Copper contrast (against `--background`, from the fills) at least 1.5 x every other plank's, in both
schemes. B1.5 reads **all 22 planks**, not only the copper one, because each is the newest once in 22
sprints: every plank must keep 75% of its area on screen at 390 x 844, 1440 x 900 and 1024 x 768, so a
later merge, N = 26 for example, cannot break CI (the worst case N = 22 is plank 1.0). This is what makes
the 1024 x 768 hull rise a requirement today.

## 3. What Pixel builds to (check 10)

`hero-3d.spec.ts` keeps its harness. The canvas takes over at the same pose: C13 compares the SVG (scripts
off) and the canvas at scroll 0, light and dark, at 1440 and 390, with C13's tolerances unchanged (edges 1
px, stray 0.1%, mean 8, copper median 6), the median read at points well inside the copper plank's real
shape. New: C12 reads at most 4 draw calls in any frame (and none at rest, as before), C15 reads the shader
chunk at most 12,288 B gzip. Spike numbers (`spike-probe.md`): the chunk is 3,631 B today, first load is 859
B above `/_not-found` (cap 2,048), the loop cost does not depend on box area, a 1460 px box under SwiftShader
runs clean at DPR 1 and 1.5, and touches 33 ms frames at DPR 2 (the freeze is at 50 ms): cap the density at
1.5. The shear and the extents (C11) are kept; the box may be as tall as it likes, but the hull needs 2 px
of air under the keel in every pose and above the gunwale at -0.24.

`webgl.ts`'s spacer (C10's "far" case) moved from a margin on the header to `[data-hero] { margin-top:
200vh }`, because the box is now inside the header.

## 4. Assertions retired or retargeted, for the owner (decision 7)

Line numbers are the files at `HEAD` before this commit (`git show 39df470:e2e/<file>`). "Retired" is
gone with nothing taking its place; "replaced" has a successor named; "kept" moved or retargeted with the
same force. Nothing was loosened except where the contract says (the formula's +/- 3, check 6).

### hero.spec.ts

| Where (old) | What | Fate |
|---|---|---|
| C1 284 to 288 | `parentIsMain`, `previousIsHeader`, `nextIsFirstSection` | kept, retargeted: inside `main > header`, after the band, header followed by the first section |
| C2 313 to 324 | box 688 x 138 from 768, else full-bleed 8 + 130 s: width and height at seven widths (14 `expect`s) | **retired**; width replaced by C3's length formula and C8's, height by "the box holds the hull" (C8) |
| C2 325 to 336 | 64 px below the header and above the first section, at seven widths (14) | **retired** (the box is inside the header now) |
| C2 339 to 347 | box at most 138.5 px tall at 360, 480, 500, 700, 1920 | **retired** |
| C2 349 to 365 | the hull centred in the box (air above and below within 1.5 px) at seven widths | **retired** (the contract lists it) |
| C2 367 to 371, 373 to 389 | no overflow at 320; half the box on the first screen | kept (overflow now also at 390 and 1440) |
| C3 404 to 409 | bow within 2 px of the header's right edge | kept, tightened to 1 px against the band's right edge, now at 1920 too |
| C3 410 to 415 | bow against `expectedHullRight` (the 672 column rule) | **retired**, superseded by the line above |
| C3 416 to 419 | hull width against its formula, +/- 2 from 768, +/- 3 below | replaced by B1.6's formula, +/- 3 at every width (a 1 px loosening above 768, as the contract says) |
| C3 420 to 427 | stern on the header's left edge from 768 | **retired** (the stern is cropped at 1024 and 1440 now) |
| C3 428 to 430 | stern cropped at 390 and below | kept, now at 320, 390, 1024 and 1440 |
| C3 432 to 440 | no step between 767 and 768 | kept |
| C7 745 to 749 | seven `[data-hero-lift]` paths, one copper plank | replaced: 22 `[data-hero-plank]`, one copper |
| C7 769 to 794 | lifts are paths, in the hull, stacked in DOM order; the copper plank lies in the third lift | **retired**; replaced by B1.4 (copper where ORDER says, lift and plank order checked by geometry) |
| C7 795 to 805 | copper width 0.2 to 0.4 of the hull's | **retired** (the contract lists it; planks run 0.1 to 0.43) |
| C7 817 to 840 | tones read from every shape's fill and stroke and every gradient stop | replaced: the 22 planks' fills; seams (a stroke in `--background`) and shade stops (black at partial alpha) are no longer read, so no assertion is made about them |
| C7 854 to 867, 888 to 891 | copper hue, chroma, lightness against `--accent`; a copper tone exists | kept |
| C7 871 to 874 | every other tone at least 1.15 : 1 | kept (on plank fills) |
| C7 875 to 877 | every other tone at most 3.0 : 1 | **retired** (bronze at 72% is 3.9 : 1); replaced by B1.4's copper-at-1.5-x rule |
| C7 879 to 886 | every other tone within 10 degrees of the ground's hue | **retired** (bronze is not verdigris) |
| C8 936 to 950 | box width and height against `expectedBox` | width retargeted to B1.6's formula (+/- 3 for +/- 1); height replaced by "the box holds the hull" |
| C8 969 to 974 | Save-Data box width 688 | retargeted to the formula |
| C5 | LCP in main, not in the hero, no url, 2,500 ms | kept, **added**: in `main > header`, tag h1 or p |

### hero-3d.spec.ts

| Where (old) | What | Fate |
|---|---|---|
| C11 411 to 414 | air above the gunwale at -0.24 at most 7 px | **retired** (the new box is the hull plus a ruled band's room, not the turn plus 4 px) |
| C11 415 to 423 | the hull centred at +0.24 (air above and below within 1.5 px) | **retired** (the contract lists it) |
| C11 400 to 410 | air under the keel at least 2 px in every pose; above the gunwale at -0.24 at least 2 px | kept |
| C13 640 to 657 | copper interior median within 6 per channel | kept, read at points inside the plank's real shape (`readPlanks`' `heart`) instead of its element's box |
| C13 659 to 676 | nothing outside the copper plank above 3.05 : 1 | **retired** (the contract lists it; B1.4's 1.5 x rule covers the tones, and 13.1 to 13.3 carry parity) |
| C12, C15 | | **added**: at most 4 draws in any frame; the shader chunk at most 12,288 B gzip |
| C15 909 to 929 and hero C6 | the hero markup at most 8,192 B | **kept unedited, will be red.** The prototype's hero svg is 12,599 B. The contract says compact first; a new cap is decision 9, the owner's |

### sprints-entry.spec.ts

| Where (old) | What | Fate |
|---|---|---|
| C14.1 164 to 167 | the header's last child is a `p` with class `text-step-base` | **retired**; replaced by "the line is in the band's third cell" |
| C14.1 169 to 183 | children `A`, `SPAN`; link first, span last; texts; nbsp; whole line | kept, on the link's parent |
| C14.3 286 to 292 | the header's children are exactly `H1, P, P, P, P` | **retired** (the band is a block of cells); replaced by name, three cells, band after the name, line before the bio |
| C14.3 293 to 296, 297, 301 to 303 | the owner's text; one `[data-hero]`; the project links | kept (headline and city now read from the first two cells) |
| C14.3 298 to 300 | `[data-hero]` is the header's next sibling | replaced: inside the header, after the band |
| C14.4 356 | the hull 64 px below the header | **retired** |
| C14.4 358 | the line 16 px below the bio | **retired** |
| C14.4 359 to 362, 364 to 367 | the line inside the header; one line at 320, 390, 1440; the hull's top above the fold at 390 x 844 | kept (one line read from the cell's own boxes) |
| C14.4 368 to 375 | the hull's top within 43 px (+3) of where it was before the line, and 16 px below it | **retired** (they measure the old layout) |

### reveal.spec.ts (added after Pixel's canvas, at Atlas's call)

| Where (old) | What | Fate |
|---|---|---|
| C3, `touchesHeader` 180 to 184, asserted at 422 to 425 | no animation on the header, inside it or above it | **narrowed**: animations whose target is inside `[data-hero]` (the aria-hidden hull box) no longer count. Since owner decision 6 the box is inside `main > header`, and hero-3d C10.4's one 200 ms opacity fade on its canvas tripped C3 in 5 to 7 runs in 10. Every other clause stands: the h1, the band, the bio and the links still may not animate, and the h1 and its ancestors stay at opacity 1 with no transform. The swap is C10.4's to police (exactly one animation in the box, a CSS transition on opacity, at most 200 ms). Proved on mutants: a 60 s opacity animation on the h1, and on `[data-hero-band]`, both fail C3 at 1440 on load; one on `[data-hero] canvas` passes C3 by design. |

### hero-b1.spec.ts, B1.3 (added after Lens's round 1)

B1.3 now also runs at 768 and, below 1024, asserts the headline cell spans the band's full width (left and right within 1 px of the band's), and at every width that no cell overflows (`scrollWidth - clientWidth` is 0 for each). Nothing retired. Proved on one mutant: without `.cell:nth-child(1) { grid-column: 1 / -1 }` it fails at 768 on both clauses.

### Shared files (mine, no `expect`s): `helpers.ts` (`STEP_TOKENS` gains `--step-display`; `VALID`,
`lineSpan` moved out of `sprints-entry.spec.ts`; `resolveColors` takes token names), `pixels.ts`
(`loudestOutside` and `medianColor` removed with C13.4, `medianAt` added), `webgl.ts` (the spacer),
`hull.ts` (new: the plank reader), and `invariants.spec.ts` line 234 (the literal scan exempts the
`--bronze` declaration, as the contract says; no `expect` changes).

## 5. Needs decision

- **Owner (decision 7):** the retired rows above, as a set or one by one. The ones with real weight: C7's
  3.0 ceiling and 10-degree hue (the new 1.5 x rule replaces them), C2's centred hull, C13.4's loudness
  ceiling, C14.4's two layout anchors.
- **Owner (decision 9), only if Forge cannot compact the svg under 8,192 B:** a new cap for C6 and C15.3.
- **Forge, a call between two readings:** B1.5 reads all 22 planks, a superset of the contract's "the
  copper plank, and N = 22 by fixtures". If Forge or Atlas thinks that is too strict at 1024 x 768, say so
  to the owner; it is what keeps the sprint 26 and 35 merges (planks 6.0, 6.1) from turning CI red.

## 6. Could not check

- Everything about the canvas on the new hull: C13 (parity), and C11, C12, C14, C15's numbers on the new
  mesh, wait for Pixel. The old canvas passes C10, C11, C12, C14, C15 today.
- Real next/font output (names, preload tags, fallback metrics): B1.1 and C4's layout shift are written
  from next/font's documented naming, not from a build.
- Phones and real GPUs; only Chromium 156 on SwiftShader.
- Clicks on the home link, hover and the focus ring in the new band: C14.2 and C14.5 stand unedited, and
  were not run against any build with a band.
