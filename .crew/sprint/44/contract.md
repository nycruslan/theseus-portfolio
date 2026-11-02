# Sprint 44 contract: the sheet fits a phone window (Wb; Atlas, from Quill's plan)

**The outcome.** A hiring executive who opens `/` on a phone, in Safari or Chrome with the toolbars
showing, sees in the first window Ruslan's name, his role, his own lead, his contact links and the
four particulars. Today, at 390 × 664 (an iPhone 14 in Safari) the particulars sit at 653 to 812,
below the fold, and on an iPhone SE (375 × 548) so are the contact links (642). The drawing and
the motion control fill y 50 to 345 before the name starts (`.crew/sprint/42/plan.md`, Wb). At
390 × 844 and from 768 wide nothing a kept check pins moves.

## The windows (brief Iris, Forge, Pixel and Probe's oracle with this list)

- **Hold the facts and the particulars:** 390 × 664, 393 × 659, 412 × 780, 430 × 746.
- **Hold the facts (the particulars may follow):** 375 × 548, 360 × 560.
- **Unchanged where kept checks pin them:** 390 × 844, 320 × 568, and every width from 768.

## What must be in the first window (one list, for the page and the oracle alike)

1. B1.1's items, read by `e2e/first-screen.ts`'s `firstScreen`: the `h1`, the headline, the bio's
   lead and the title block's contact links.
2. At the first four windows, `dl[data-particulars]`, whole.
3. The `h1` stays the largest text (B1.1's `textSizes`).

The margin is 8 px above the fold. The room to find is 156 px at 390 × 664 and 102 px at
375 × 548 (plan.md).

## Placement is Iris's call, made first

Her options include a shorter narrow drawing, the motion control's row (it holds y 295 to 345, the
first window's prime space, for a setting), or the particulars' form, or better. She states the
smallest narrow drawing height she accepts. The DOM order doesn't change (P1's order, Contact's
first link the 16th Tab stop), and every fact stays server HTML at full opacity.

## Checks (Probe writes them red first, in a new `e2e/phone-window.spec.ts`)

- **W8 The phone window holds the facts.** At every window above, in light and dark, on the
  default server and the live, open and resting fixtures (B4.22's harness, WebGL refused), items 1
  to 3 are wholly inside the viewport less 8 px (item 2 only at the first four windows).
- **W9 The narrow drawing is whole.** At every window above, WebGL refused: every
  `[data-plan] [data-plank]` box and every `[data-plan] .plan-view > span` lies inside
  `[data-plan]`'s box and the viewport, nothing clipped by an `overflow`, and the drawing is at
  least Iris's floor tall (reported per window). On Full at 390 × 664, DPR 1 and 3, frame 1
  registers on the shown drawing within B3.1's bounds.
- **W10 The control.** On `/` below 768: one group named Motion with Full, Calm and Off, 44 px
  targets, inside the viewport wherever it sits, no Tab stop on the hidden slot. If it moves,
  B3.16's place clause (`e2e/motion.spec.ts:431`, "below 768 in main between [data-model] and the
  title block") is the only rewrite: the assertion changes place, not strength, and the PR names
  it for Lens. `/crew`'s and `/log`'s controls (B4.41, B5.25) don't move.
- **W11 Still.** CLS 0 at load (B1.8's read) at 390 × 664 and 375 × 548, and through a resize from
  390 × 664 to 390 × 844 and back without input. The phone layout sizes from `svh`, never `vh` or
  `dvh`, in the rules that place the narrow sheet (a source check: Chromium can't emulate Safari's
  toolbar).
- **W12 Rider (Pixel): the 3D label over the copper dot.** At 1024 and every width below it where
  P13 (`e2e/plain-words.spec.ts:1122`) finds the chip meeting the dot, on Full, the model's 3D
  number label leaves the dot's centre showing as P13's 2D chip does (Pb's left-open, the 3D half
  of P13). Probe writes it from Pixel's read of where the 3D label paints.

Probe reports the new spec's time and the full suite's at CI's worker count.

## Kept checks, unedited (except W10's named clause)

B1.1, B1.8, B1.9, B2.10, B3.1, B3.16 (but its place clause), B4.22, B4.49, P1, P3, P4, P8, P13,
W1 to W7, `keyboard.spec.ts`, `invariants.spec.ts`, `model-cost.spec.ts`. A red kept check is a
stop for Atlas, not an edit.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| LCP the `h1` or the bio on phones | B1.9, unedited |
| CLS 0 | B1.8, W11 |
| From 768 wide, unchanged | W1, W2, B4.22, P4, unedited |
| The drawing never cropped, never below Iris's floor | W9 |
| The 3D costs no more | `model-cost.spec.ts`, unedited |
| Nothing new is copper | B1.6, B4.17 |
| CI under `check`'s 35 minutes | reported in the PR |

## Riders (grepped on 2026-11-02)

- Lens's nits on #102: the led-out chip rule also reaches `/crew` (`app/globals.css:826`) and
  `lib/model/ghost.ts:388`'s 690 comment (712). Pixel.
- Iris's memory lines 66 and 67 (712 px and the ramped foot). Iris.

## Out of scope

- What the facts say, the hull's look, the loft, the live marks and the replay.
- Tablets and the key from 1024 to 1439 (Wc).
- A line about the crew in a phone's first window (plan.md).
- `/crew`, `/log` and `/read` at phone windows.

Nothing here touches an owner path or `content/`, so nothing waits for the owner.
