# Sprint 45 contract: the sheet fits a tablet window, and the key shows (Wc; Atlas, from Quill's plan)

**The outcome.** A hiring executive who opens `/` on a tablet or a narrow laptop window, 1024 to
1279 wide, sees in the first window Ruslan's name, his role, his own lead, his contact links and
the four particulars. From 1024 to 1439 the crew key ("The names are AI agents…") shows under the
revisions, as it does at 1440, so the reader can tell who signs the rows. At 1440 × 900 nothing
moves, and Wa's and Wb's windows hold.

Measured on production (c387811, Chromium, WebGL refused) on 2026-11-02:

| Window | `h1` | contact links' foot | particulars | key |
|---|---|---|---|---|
| 1024 × 640 | 427–501 | 751 | 768–847 | hidden |
| 1024 × 768 | 427–501 | 758 | 775–855 | hidden |
| 1180 × 740 | 479–559 | 763 | 806–885 | hidden |
| 1280 × 680 | 372–456 | 634 | 212–336 | hidden |
| 1366 × 625 | 341–428 | 607 | 199–305 | hidden |
| 1440 × 900 | 567–657 | 880 | 408–531 | 827–846 |

From 1024 to 1279 the drawing band is still a fixed share of the width (72 to 407 at 1024), so the
title block and the particulars wait under it. Wa's rule, which gives the drawing's height way to
the window from 1280, doesn't reach there. The key is `lg:max-[90rem]:hidden`
(`components/revisions.tsx:235`), hidden by sprint 40's decision 9 because nothing fit then.

## The windows (brief Iris, Forge and Probe's oracle with this list)

- **Hold the facts and the particulars (W13):** 1024 × 640, 1024 × 768, 1180 × 740.
- **Hold the key in the first window (W14):** 1280 × 680, 1366 × 625, 1024 × 768.
- **The key shows (W14):** every width from 1024 to 1439.
- **Unchanged:** 1440 × 900 (W2's boxes, but the key's own box only where W2 pins it), and
  everything Wa's and Wb's checks pin: W1 to W12.

## What must be in the first window (one list, for the page and the oracle alike)

1. B1.1's items, read by `e2e/first-screen.ts`'s `firstScreen`: the `h1`, the headline, the bio's
   lead and the title block's contact links.
2. `dl[data-particulars]`, whole (W13's windows).
3. `p[data-crew-key]`, whole (W14's windows).
4. The `h1` stays the largest text (B1.1's `textSizes`).

The margin is W1's (Probe states it in the spec). Sprint 44 lost a fit to the browser build: measure
in the Chromium `@playwright/test` pins, not another.

## Placement is Iris's call, made first

The obvious move is to extend Wa's rule (the drawing gives way, to a floor) down to 1024, and to
find the key a line from 1024 to 1439, whether under the table, beside the plank count, or better.
She states the floor she accepts at 1024 to 1279 and where the particulars stand there. The DOM
order doesn't change (P1's order, Contact's first link the 16th Tab stop), and every fact stays
server HTML at full opacity. Pixel joins only if the model stops landing on the drawing (W16).

## Checks (Probe writes them red first, in a new `e2e/tablet-window.spec.ts`)

- **W13 The tablet window holds the facts.** At W13's windows, in light and dark, on the default
  server and the live, open and resting fixtures (B4.22's harness, WebGL refused), items 1, 2 and 4
  are wholly inside the viewport less the margin. Red on main: the particulars end at 847 at
  1024 × 640.
- **W14 The key shows.** At 1024, 1180, 1280, 1366 and 1439 wide (any height), `p[data-crew-key]`
  is rendered, its text whole (one or two lines), not clipped by an `overflow`, and meets no other
  text box. At W14's windows, on the default server and the live, open and resting fixtures, it is
  wholly inside the viewport less the margin, with items 1 and 2 still inside too. B4.22 and B4.49
  run unedited. Red on main: hidden.
- **W15 Rider: the default-server passes run under `PLAYWRIGHT_BASE_URL`.** P3's, P8's, P9's, W1's,
  W2's and W8's default-server passes come out of the `PLAYWRIGHT_BASE_URL` skip; only the fixture
  states skip there (`particulars.spec.ts:414`, `plain-words.spec.ts:369` and `457`, and W1's and
  W8's equivalents). Probe proves it by running them against a `next start` served under
  `PLAYWRIGHT_BASE_URL` and names the count that ran.
- **W16 The drawing stays whole, and the model lands.** At W13's windows, WebGL refused, W3's rule:
  every `[data-plan] [data-plank]` box and lettering span inside `[data-plan]`'s box and the
  viewport, nothing clipped, the `dl` meets no plank box grown by 24 px or lettering box, and the
  drawing at least Iris's floor (reported per window). On Full at 1024 × 640 DPR 1 and 2, frame 1
  registers on the shown drawing within B3.1's bounds.
- **W17 Still.** CLS 0 at load (B1.8's read) at 1024 × 640 and 1180 × 740, and through a resize
  from 1024 × 768 to 1024 × 640 and back without input (stating, as W11 now should, that a
  `hadRecentInput` shift is invisible to the read, or reading raw entries).

Probe reports the new spec's time and the full suite's at CI's worker count.

## Kept checks, unedited

B1.1, B1.8, B1.9, B2.10, B3.1, B3.16, B4.22, B4.49, P1, P3, P4, P8, P13, W1 to W12 (but W15's guard
split and W11's wording, which change no assertion), `keyboard.spec.ts`, `invariants.spec.ts`,
`model-cost.spec.ts`. A check that pins the key as hidden from 1024 to 1439 is the one retirement
this contract expects; Probe finds it (`grep -rn "crew-key" e2e/`), and the PR names it for Lens with
the reason: the key now shows. Any other red kept check is a stop for Atlas, not an edit.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| LCP the `h1` from 1024 | B1.9, run at 1024 × 640 too |
| CLS 0 | B1.8, W17 |
| Nothing moves at 1440 × 900, Wa's and Wb's windows hold | W1 to W12, B4.22, P4, unedited |
| The drawing never cropped, never below Iris's floor | W16 |
| The 3D costs no more | `model-cost.spec.ts`, unedited |
| Nothing new is copper | B1.6, B4.17 |
| CI under `check`'s 35 minutes | reported in the PR |

## Riders (from sprint 44's retro, grepped on 2026-11-02)

- Forge: Lens's nit, `app/globals.css:1531`'s comment (the foot row overlaps the drawing box's empty
  head, which the comment denies).
- Probe: W11's resize clause wording (in W17's bullet), and W8's default-server pass (in W15).

## Out of scope

- What the facts say, the hull's look, the loft, the live marks and the replay.
- `/crew`'s foot row over its canvas (no check reads it; a sprint that touches `/crew` takes it).
- `/crew`, `/log` and `/read` at tablet windows.
- Safari on a real tablet or phone.

Nothing here touches an owner path or `content/`, so nothing waits for the owner.
