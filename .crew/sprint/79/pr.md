## Sprint 79 (S): every crew pin on the trials chart shows

**Goal** (from the roadmap's stand-down, chosen by Atlas from sprint 78's follow-ups): a visitor
sees every one of the crew's windows as a pin on the trials chart, the two beside the accepted gap
included, and still reads "−6.2" whole.

On production the crew pins at 360 × 560 and 375 × 548 sat under the gap label's film pad at every
width. Probe's T39 found more: 1366 × 625 half under 1366 × 595's pad at every window; 1440 × 700,
1180 × 740, 1280 × 680, 1024 × 640 and 375 × 548 under soundings at some widths and fonts; and, on
/trials/320x568 at 320 wide, 360 × 560 under the ring's film. Iris's sweep: 1,467 failing reads on
production.

**Size:** S. **Contract:** `.crew/sprint/79/contract.md` (T39). **Design:** Iris's
`.crew/sprint/79/seat.md`. **Decisions:** `.crew/sprint/79/decisions.md` (the widened budget is 2,
the ring 3 and 5).

### What changed (`components/trials-chart.tsx`, `app/globals.css`)

- "−6.2" sits just above its dot, as the soundings' numbers do. Where the plot is too narrow to
  clear 390 × 664 (from 64rem, 1024 to 1344 at 16 px), it takes the empty pocket right of
  390 × 664 with a 1 px leader to its dot (`.trials-gap-leader`).
- 1366 × 595's number nudges 3 px right and 4 px down; 1160 × 635's goes below its dot; 456 × 465
  drops its by-gap seat and stays above.
- The crew's dots are drawn again above the ring's film, halo and ink, masked to within 10 px of
  the ring (its reach) with a 3.5 px hole at its centre: a ring on a pin looks as before, a ring
  beside one no longer hides it, and away from the ring the paint order is main's. Lens's fix
  round: the first build masked only the hole, so the copies painted over every sounding's focus
  ring (1366 × 595's left stroke cut at every width); a keyboard-focused sounding now draws its
  ring whole at 390, 1024 and 1440 on both routes, 0 gap pixels as on main (Forge's pixel check).
  Within the reach the copies do sit above a sounding's focus ring, as on /trials/1366x595, where
  main's film already cut it.
- The soundings' pads grow in em, as the gap's did (sprint 78's nit); the plot grows only at large
  default fonts, and the frame gives that height back.

### Results

- **T39** (`e2e/chart-labels.spec.ts`, Probe): T39a, every crew dot uncovered by any label, pad,
  number or the ring (31 windows × 2 routes × 16/20/24/28 px); T39b, T38a's clauses on the same
  set plus the label tied to its dot. Red on main: 248 of 248 reads (T39a), 260 failures (T39b).
  T39a's ring clause follows paint order (decision 5), proved against mutants without the copy or
  with it under the film. Green on this head: Atlas, `chart-labels` and `trials-chart`, 6 of 6.
- **Kept suite:** Forge's full run on 969edbf, 479 of 480; the one red, the tokens invariant
  (hex in the mask), is fixed in f1792a8, byte-identical CSS. Atlas, `pnpm verify` exit 0 on
  f1792a8.
- **Fix round (71d83f4):** Forge, 51 of 51 across chart-labels, trials-chart, invariants, trials,
  trials-drag, trials-console and trials-doors; Atlas, `pnpm verify` exit 0, chart-labels and
  invariants 24 of 24.
- **Boxes at 16 px** (Forge's box diff against main at 390, 1024, 1280, 1440): only
  the gap, its leader, and 1160 × 635's, 1366 × 595's and (1024) 456 × 465's boxes; 0 on `/` and
  /crew. CSS +1,130 B (+275 B gzip), JS unchanged, /trials HTML +268 B gzip.
- Dark scheme and forced colours checked at 320 × 568 (Forge).
- **Iris:** Verdict ship, 8.3/10, on bdd44ca: 304 of 304 seat reads, axe clean, no reflow at 320,
  light, dark and forced colours read; posted below as advice.

No check retired, no owner path, nothing in `content/`, no Owner's pick.
