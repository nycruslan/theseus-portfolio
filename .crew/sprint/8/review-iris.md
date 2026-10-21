Verdict: ship 7.8/10 (DQ 8, Orig 8, Craft 7, Func 8). Better than production.

# Sprint 8: Iris's review of the hero half-model, Part A (PR #31 at 55f86c3)

## Setup

- I built two production builds in scratch worktrees: the PR head 55f86c3 on :3361, and
  origin/main 31daf2c on :3362. Main stands in for production, because the sandbox proxy blocks
  production (curl returns 000).
- I captured both with Playwright (Chromium only) at 320, 390, 1024 and 1440, in light and dark.
  I also took the box alone at 2x at 390 and 1440, and rendered the deck and copper variants by
  injecting CSS into the running PR build. No files were edited.
- Screenshots are in
  /tmp/claude-0/-home-user-theseus-portfolio/9e9cb87a-0571-5c42-a3d1-ad7bed529766/scratchpad/iris/shots/:
  `pr-*` and `main-*` are pages, `box-*@2x` is the box alone, and `board-1440-{light,dark}.png` is
  the variant board. Its rows, top to bottom, are: as built, deck at λ .5, deck at λ .92, and dark
  copper at a 90% mix. The scripts are `shots.cjs`, `gates.cjs`, `variants.cjs` and `lcp.cjs` one
  level up.

## Compared with production: better

Every word on the page is the same as on main (I diffed the HTML text, and it's identical). The
one change is the object between the bio and Experience. With it, the page has a picture of its
own idea: until now the Ship of Theseus lived only in the palette and the plank cards, and now
there's a thing you see. It stays quieter than the text. At 1440 the first Experience summary
moves below the fold, which is the price of a hero, and I accept it.

## Hard gates: all pass

- **Placeholder:** none added. No `TODO(owner)` and no "Company name" in either build's HTML, and
  the rendered text is the same as main's.
- **axe:** 0 violations of any impact at 320, 390, 1024 and 1440, in both schemes.
- **Detector:** `[]` on the URL at 1440x900 and 390x844 (main also gives `[]`), and `[]` on
  `components/hero.tsx`, `app/globals.css` and `app/page.tsx`. The overused-font warning I'd noted
  since sprint 6 no longer fires on either build.
- **Reduced motion:** `getAnimations()` returns 0, and the box's pixels are byte-equal before and
  after a scroll.
- **320 reflow:** `scrollWidth === clientWidth` in both schemes. The box is 320 x 110, and the
  stern crops cleanly off the left edge.
- **Phone budget:** CLS is 0.0000 at every width in both schemes. LCP at 390 with 4x CPU is the
  bio `<p>` at 132 and 144 ms, against 144 and 124 ms on main, and never anything in the hero.

## The object, measured against my direction and C1 to C9

- **Placement and alignment are exact.** At 1440 the box is 688 x 172, and the hull runs from 408
  to 1032, on the text's edges. At 390 the bow is at 366 (the viewport minus 24) and the stern at
  -71. At 320 it's 296 and -62. The bow lands on the column's right edge at every width, which is
  what makes it look hung rather than placed.
- **The form reads at a glance as a carved hull, not a boat icon.** It has a raked stem, a sheer
  that rises to the bow, a full belly, a counter tucked under a transom, and staggered butts that
  never line up between neighbors. The 1.12 crop on phones works: at 390 it's an object beside
  you, not a sticker.
- **Tones** (canvas-resolved, against the ground). Light: lifts 1.21 to 2.35, deck 2.22, copper
  6.06, and muted for reference 6.15. Dark: lifts 1.28 to 2.75, deck 1.35, copper 7.45, and muted
  7.60. Every non-copper tone sits under the muted text in both schemes, as directed.

### Pixel's question 1: the dark deck strip. Yes, keep it.

It isn't what I wrote: my "light from the upper left" would light the top face. But I rendered
the alternatives, and the dark deck is better:
- **Deck at λ .92 (lit):** in light the top face drops to about 1.2:1, the sheer line dissolves
  into the ground, and the hull loses its top edge. In dark the deck reads as an eighth lift, not a
  face.
- **Deck at λ .5:** it's mush in both schemes, close enough to lift 1 that the seam does all the
  work.
- **As built:** the dark band gives a crisp sheer line in both schemes and reads as a separate,
  upward-facing plane. That plane is what sells the 13° view from above. A model in a museum case
  reads the same way under frontal light.

The object you built is better than the sentence I wrote. Accepted as built.

### Pixel's question 2: the flat copper. Yes in light. In dark it's one notch hot.

Flat `var(--accent)` is what I directed ("copper keeps `--accent`'s hue and chroma"). In light it's
right: a brick-copper plank at 6.06:1 that reads as fresh wood among weathered lifts. In dark,
7.45:1 next to neighbors at about 2.15 reads as emitted light, not reflected light. A saturated,
bright bar on near-black looks lit from inside, and at 390 (131 x 10 px) it starts to look like a
progress bar. That nudges against the rubric's "glow without a reason". On the board, a 90% mix
with the ground (L 0.674 against the token's 0.729, chroma 0.116 against 0.130, hue unchanged)
reads as metal rather than salmon and is still unmistakably the accent. That's the same call I made
on the token itself in sprint 2: "more metal, less fruit".

It's loud on purpose: it's the one new plank. I'm asking for one notch down in dark, not for it to
go quiet.

## Suggestions, cheapest first

1. **Dark copper one notch down (one rule, inside C7).** Add this, and leave light unchanged:
   ```css
   @media (prefers-color-scheme: dark) {
     .hero-copper { fill: color-mix(in oklab, var(--accent) 92%, var(--background)); }
   }
   ```
   I measured 90% at L −0.055, which is too close to C7's ±0.06 window. 92% should land near
   −0.044 with a chroma drop of about 0.011, leaving margin. Probe's C7 resolves fills through a
   canvas, so it checks the real value. This is advice, not a blocker. If Pixel would rather not
   touch a green PR, carry it into Part B, where the canvas reads its tones from the SVG anyway.
2. **Harden the `@supports` fallback to test the form you actually use.** The stops use `calc()`
   inside a `color-mix()` percentage. A browser that parses `color-mix` but not a `calc()`
   percentage passes the current `@supports not (color: color-mix(in oklab, currentcolor,
   transparent))` guard. Its stops then go invalid at computed-value time, and `stop-color`'s
   initial value is **black**: a black hull. Testing
   `color-mix(in oklab, currentcolor calc(10% + 10%), transparent)` covers the parse case. (`var()`
   can't be tested in `@supports`, but the `calc` form is what older engines lack.) I couldn't
   check Safari or Firefox (only Chromium is installed), so this is a cheap guard against an
   unverified failure that would look terrible.
3. **Part B, not now: size the box to the pose envelope.** At rest the hull is 118 px tall in a
   172 px box, which leaves 27 px of empty box above and below it. On top of main's 64 px gaps,
   that's about 91 px of air on each side, against the page's 64 px rhythm everywhere else. At 390
   it's about 90 px for an 82 px object. That headroom is reserved for the ±0.24 turn, so it's
   right for now. Once Part B measures the real silhouette at +0.24 and −0.24, propose trimming the
   box to that envelope plus 4 px in Part B's contract rewrite. It's C2's number, so it's a
   contract change, not a fix here.
4. **For the owner, no action this sprint.** If the owner finds this too quiet, my next step is
   still the left-edge variant from the direction, not more contrast in the lifts. The lifts at
   1.2 to 2.8:1 are the right register for a backboard object.

## Scores

- **Design quality 8:** the page now has one object, made from its own tokens, that states the
  site's idea in both schemes. The dark copper keeps it from 9.
- **Originality 8:** a lift half-model with one fresh plank isn't in any template or 3D-hero
  library. The dark deck and the stern crop on phones are choices, not defaults.
- **Craft 7:** the alignment is to the pixel, CLS is 0, the seams are 1 px at any size, and the
  tones are in range. It's held down by the dark copper reading as emitted light, the loose
  vertical air at rest (deferred to Part B), and an unguarded failure mode in non-Chromium engines
  that nobody has checked.
- **Functionality 8:** unchanged from main. It's decoration only: aria-hidden, no hit or focus, no
  motion, and it pushes the first Experience summary below the fold at 1440.

Weighted: (16 + 16 + 7 + 8) / 6 = 7.8. This clears the 7.0 bar on its own; the scoped-sprint
exception isn't needed.

## Not verified

- Production itself (proxy 403). origin/main stood in.
- Safari and Firefox, and Windows with a classic scrollbar between 672 and 768 px. Pixel flagged
  the same.
- The exact numbers for the 92% mix. I rendered 90%; 92% is interpolated.

## Proposed memory lines (not committed)

- Sprint 8 review (.crew/sprint/8/review-iris.md): ship 7.8/10 at 55f86c3, better than prod.
  I accepted Pixel's dark deck (λ .08) over my own lit top face: a lit deck dissolves the sheer
  line in light and reads as an eighth lift in dark. Asked for dark copper at a 92% mix with the
  ground (flat 7.45:1 reads emissive next to lifts at about 2.1).
- Bright saturated accent on near-black reads as emitted light, not reflected. For a filled shape
  (not text), take the dark accent toward the ground by about 0.04 to 0.05 L and keep hue and
  chroma.
- When CSS feeds `calc(var())` into `color-mix()` percentages for SVG stops, an engine that can't
  parse it gives black stops (stop-color's initial value). Ask for an `@supports` guard that tests
  the `calc` form, not plain `color-mix`.
