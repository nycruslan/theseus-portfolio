# Ye: the door's fit on `/` (Iris, sprint 57)

**Call: it doesn't fit. Ye waits, and the milestone closes without it.**

## How I measured

I injected the door into production's DOM (https://theseus-portfolio.vercel.app/, 2026-11-08) in
CI's renderer: `@playwright/test` 1.64.0, headless shell 156.0.8078.4, WebGL refused, webfont warm.
Production was **live**: the pencil row was 57, "drawing now", and the legend had four items. I set
the other states by giving the block the markup the server renders for them
(`components/revisions.tsx`):

- open: no copper, Approved "Waiting for owner", three legend items;
- default: no feed, so the pencil is gone, the fifth row is sprint 52, and the legend has two items;
- resting: default plus `RestLine`;
- replay: resting plus "Replay sprint 56".

The door markup was the Log link's own classes, `href="/log/1"`, with the words "Rebuild it
yourself" (105 px at 13 px). It sat after the Log link, both in a
`flex flex-wrap items-center gap-x-6 gap-y-1` group, so it needs 129 px of room. I cross-checked in
Chrome 153 and with the webfonts blocked (the `display: optional` fallback). One run caught
production serving a stale page with no pencil, so every later row checks that the served state was
live. My scripts are in my scratchpad, and the screenshots are in `.crew/screenshots/57-iris/`.

## The measurements

The cells give the count line's lines today → with the door, and how much the block grows.

| Window | live | open | default | resting / replay | First screen |
|---|---|---|---|---|---|
| 320 × 568 | 4 → 4 | 4 → 4 | 3 → 3 | 3 → 3 | Nothing moves; no sideways overflow; the door sits beside the Log link (184–289) |
| 390 × 844 | 4 → 4 | 3 → 3 | 3 → 3 | 3 → 3 | Nothing moves; contact bottom 564.3 in every state |
| 768 × 1024 | 2 → 2 | 1 → 2, +23.5 | 1 → 2, +23.5 | 1 → 2, +23.5 | Only the block and what follows it move; contact unmoved |
| 1024 × 768 | 3 → 3 | 3 → 3 | 2 → 2 | 2 → 2 | Nothing moves |
| 1280 × 800 | 3 → 3 | 2 → 2 | 1 → 2, +23.5 | 1 → 2, +23.5 | The bottom row grows; contact unmoved (it follows the bio here) |
| 1440 × 900 | 2 → 2 | **1 → 2, +7.9** | 1 → 1 | 1 → 1 | W2's boxes unmoved in default and live; in **open** the bottom row moves 7.86 px (contact bottom 858.5 → 874.2, the live state's place) |

Where the contact row waits at the block's foot (at least 900 tall from 1280 wide, at least 960 tall
from 1024 to 1279), the added line pushes it down. 1 px width sweeps:

| Renderer, face | Contact moves (px, widths) | Lowest contact bottom at 900 tall |
|---|---|---|
| CI shell, webfont | default, resting and replay 6.8–23.5 at 1203–1428; open 7.2–7.9 at 1408–1440 | resting **899.05 at 1428 × 900: 0.95 px above the fold** (today 875.5); replay 899.3, 0.7 px |
| CI shell, fallback face | the same, to 1440 | resting and replay **below the fold at 1432–1440 × 900** (903.7 / 903.9 at 1440) |
| Chrome 153, either face | resting and default at 1380–1398 | resting 888.7 at 1398, 11 px above the fold |

The count line runs full in every state at some width. The room beside the Log link falls to about
0 px at 892 (live), at 768 and 1408 (open), and at 651 and 1203 (default and resting). So any door
adds a line somewhere. At 1440 × 900 in default and resting it has 135.6 px of room, which leaves
the door 6.6 px to spare. From about 1380 to 1440 × 900, the resting block already fills its row,
so an added line there costs the contact links their margin.

The kept checks (W1–W17, B4.22, P3, P8) would pass unedited in CI's renderer with the webfont: W2's
two states don't move, and the contact links stay inside at every pinned window in every state. The
failure is real visitors' first screen. The links move, and on the shell's fallback face they leave
it at 1440 × 900 at rest.

## The call

- **Beside the Log link: no.** On the evidence above, the first screen changes. The contact row,
  the hiring executive's one-click action, moves by up to 23.5 px in ordinary windows (1280 × 900,
  1366 × 1024, 1420 × 900). At 1440 × 900 at rest the fit depends on 6.6 px of room, and at
  1428 × 900 on 0.95 px of fold (0.7 at replay). I reserve for the tallest wrap across engines and
  faces, not one engine's wrap (sprint 44's lesson), and on that standard it doesn't fit.
- **In place of the Log link: no.** It fits: no line is added anywhere, and at 1340–1421 in open the
  block gets shorter. But it removes the record's way in from the block, along with "55 revisions",
  the crew's scale on the first screen. It hands the first reader's link to the second reader, and
  B5.5 (C14), B1.5 and B2.3 would all be rewritten.
- **Shorter words: no.** "Rebuild it" (54 px) fits with at least 19.6 px of fold in both faces, but
  alone it reads as a command to rebuild the site, which is steering the crew (PRODUCT.md: visitors
  never start or steer it). "yourself" is what makes it the visitor's toy.

## If it ships later: what makes room, and the exact markup

- **The room is on the line itself.** The legend keys "Original", but `/`'s drawing has no original
  plank: the count reads "0 original", and production draws 42 seated and 2 pencil paths, none
  original. Without that item, the same door never moves the contact row in default, resting or
  replay (1280–1440 × 900, both faces). Open moves at 1408–1440, but only to the live state's place,
  and the lowest bottoms equal today's (resting 880.2, 19.8 px above the fold). That's a legend
  change: B4.19 pins Seated and Original in every state, B2.9's forced-colours rider reads an
  original swatch on `/`, and `PlankLegend` is shared with `/read`. It needs its own contract
  (Quill), not this slice.
- **The markup:**
  - The foot row's second child becomes `<div class="flex flex-wrap items-center gap-x-6 gap-y-1">`
    holding the Log link, then `<a href="/log/{first merged}">Rebuild it yourself</a>`.
  - The door takes the Log link's classes word for word: ink, semibold, 1 px underline at 3 px,
    `min-h-6`, 2 px on hover. No arrow, no copper.
  - Tab order: his rules, then the Log, then the door. B4.49's "then the Log link" holds.
  - B2.3 becomes 26 stops, so its bound rises. **B1.5's list of the block's links** gains the door.
    Quill's plan didn't name B1.5.
- **The words are "Rebuild it yourself".** "Rebuild" is the yard's act and "yourself" is the
  visitor's part. "it" is the ship the line counts ("22 planks: 22 replaced, 0 original").

## What to watch at review, if it's ever built

- The resting state with the rest line at 1380–1440 × 900, in the shell and with fonts blocked:
  - the contact links' bottom against today's 880.2;
  - a 1 px sweep, not only the window set.
- The count line at 768 and at 1203–1279: the pair drops to its own line.
- Whether "55 revisions" stays in the first screen at 1440 × 900.
