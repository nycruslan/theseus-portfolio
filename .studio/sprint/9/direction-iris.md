Verdict: ship. Box A: 138 px, with the hull centred at rest. The below-768 formula `8 + 130 s` reads right.

# Sprint 9: Iris on the C2 trim

## How I checked

I built this branch at 4a5cd8a (`next build`, then `next start` on :3371, in a scratch worktree I've since
removed). I injected today's box, A and B as CSS and took screenshots in Chromium at 320, 390, 600, 767 and
1440, in light and dark. Shots and boards are in
`/tmp/claude-0/-home-user-theseus-portfolio/27188b3c-46c9-5256-999f-d684a5369382/scratchpad/iris-shots/`
(`board-{light,dark}-{390,1440}.png`). The scripts are `iris-ab.cjs` and `iris-ink.cjs` one level up.

Ink gaps are measured from the last row of bio text above the hull to its first lit row, and from the keel
to the first ink row of the "Experience" label below. Light, in px:

| | 320 | 390 | 1440 |
|---|---|---|---|
| today | 92 / 90 | 95 / 94 | 97 / 96 |
| **A** | 78 / 75 | 77 / 77 | 80 / 79 |
| B | 78 / 72 | 77 / 73 | 80 / 73 |

Dark is within 1 px of these. The box heights I got match the contract's table: A is 82.7, 99, 120.7,
137.9 and 138. B is 79, 94.6, 115.2, 131.6 and 132.

## A, for three reasons

1. **Nobody sees B's saving.** By C11.1, shear runs with scroll / box bottom, so the full -0.24 only
   arrives once the box has scrolled off the top. At 1440 the box top reaches the viewport top at f = 0.79,
   which is a shear of about -0.14 and a lift under 1 px. At 390 it's f = 0.85, a lift of about 1 px. The
   5.7 px lift happens above the fold line. B spends the rest pose, which every first paint shows (the SVG,
   reduced motion, scripts off, every fallback), to buy headroom for a pose that's never fully on screen.
2. **A is balanced and B looks dropped.** With A, the ink gaps above and below match within 3 px at every
   width. B is 6 to 7 px heavier on top. At this scale that doesn't read as a deliberate offset; it reads
   as a hull that slipped in its case. The hull is top-heavy too (a long straight sheer over a belly that
   tapers to the keel), so it needs more air under it, not less.
3. **A is less code.** The box keeps `align-items: center`, and the SVG and canvas need no offset rule.

A also fixes two things today's box gets wrong. The air around the hull drops from about 96 px of ink gap
to about 79, against the page's 64 px section rhythm. And the 600 px bulge goes away: today the box is
172 high with 35 px of air on each side, and A gives 121 with 9.

## Below 768

`8 + 130 s` is the right rule. It gives a constant 4 px over the envelope plus 6 s of centring on each side,
so at -0.24 the top air is 4 + 0.3 s, which matches C11.3. It's continuous at the breakpoint (137.9 at 767
against 138). At 320 the air is 7.4 px on each side, which looks tight in the box, but the ink gap to the
text is still 78 / 75, the same rhythm as desktop. For the build, one note to Pixel: compute the box height
from the same `min()` expression as the hull's width, through one custom property, so the box and the hull
can't drift apart. Drop `aspect-ratio` and `max-height` instead of re-tuning them.

## The rest of the contract's visual parts

They're sound as written:

- **The swap.** It's a 200 ms opacity change, and C13 keeps the two renders indistinguishable.
- **Three slow frames.** Freezing at the last pose is right; a snap back to rest would be the only jump on
  the page.
- **Butts, retina and non-Chromium engines.** They aren't gated, and I'll review them on the build PR.
- **The canvas reads its tones from the SVG's resolved fills,** so the dark copper at 92% carries over.

## For the owner's summary

"Moves up 34 px on a desktop" is right. On a phone it's about 35 px at 390 and 51 px at 600. That's
worth a line in the summary, but nothing in the contract needs to change.

## Memory lines for the build sprint (Iris's, held by Atlas)

Pushed after Lens's ship, memory would cost a second review, so these go in with the build:
- Sprint 9 C2 trim (.studio/sprint/9/direction-iris.md): chose A (138 px, hull centred at rest) over B (132 px, hull low). A scroll-linked pose's extreme often happens only once the box is off screen, so size headroom for it but compose for the rest pose. B's 6 px offset read as a slipped hull, not a choice.
- Measure balance as gaps between visible text and the object's edges (from screenshots), not as box padding. The half-model is top-heavy (a straight sheer over a tapering belly), so it never wants less air below than above.
