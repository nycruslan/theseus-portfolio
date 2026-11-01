# Wa's contract: the sheet fits a laptop window (Quill, sprint 42)

**The outcome.** A hiring executive who opens `/` on a laptop sees, in the first window, Ruslan's
name, his role, his own lead, the four particulars, his contact links, and the caption saying a
team of AI agents builds the site, whatever the window's height between 620 and 950. When the
window is short, the drawing gives up the height. Today, on the commonest Windows laptop window
(1536 × 715), the name sits on the fold and the role (737), the bio and the links (907) are below
it. At 1366 × 625 the name is cut (`close.md`). At 1440 × 900 nothing changes.

## The windows (brief Forge, Pixel and Probe's oracle with this list)

- **The set, from 1280 wide:** 1280 × 680, 1280 × 800, 1366 × 625, 1440 × 790, 1470 × 840,
  1512 × 865, 1536 × 715, 1920 × 950. These are common laptop screens less the browser's and
  system's bars (my estimates, `close.md`).
- **Unchanged:** 1440 × 900. 1920 × 1080 is reported.
- The rule may apply from 1024. Wa's checks start at 1280, and Wc's cover 1024 to 1279.

## What must be in the first window (one list, for the page and the oracle alike)

1. B1.1's items, read by `first-screen.ts`'s `firstScreen`: the `h1`, the headline, the bio's lead
   and the title block's three contact links.
2. `dl[data-particulars]`, whole.
3. The revisions' caption: the `p` after `section[aria-labelledby="revisions"]`'s `h2`, whose text
   is the bio's last part (B1.2's caption).
4. The `h1` stays the largest text (B1.1's `textSizes`).

The five revision rows and the key need to be inside only where B1.1 and P8 already require them
(1440 × 900). Elsewhere they're reported.

## Placement is Iris's call, made first

The three options and the height each window lacks are in `plan.md`, Wa: (a) the band gives way,
(b) the title block rises beside the drawing, or (c) the drawing drops its half-breadth plan. Iris
picks and states the smallest drawing height she accepts. Pixel joins for any option, since the
model registers to the drawing's box. Forge builds the 2D. The DOM order doesn't change.

## Checks (Probe writes them red first, in a new `e2e/window.spec.ts`)

- **W1 The first window holds the facts.** At every window in the set, in light and dark, on the
  default server and the live, open and resting fixtures (B4.22's harness, WebGL refused), items 1
  to 4 are wholly inside the viewport. Red on main: at 1366 × 625 the links end at 823 and the
  role at 676.
- **W2 Nothing moves at 1440 × 900.** On the default server and the live fixture, the boxes of the
  `h1`, the `dl`, the contact links, the five rows, `p[data-crew-key]` and `[data-plan]` equal
  main's within 0.5 px. Probe records main's boxes in the spec, from a run on main, and names the
  commit. 1920 × 1080's boxes are reported.
- **W3 The drawing stays whole and clear.** At every window in the set, with WebGL refused:
  - every `[data-plan] [data-plank]` box and every `[data-plan] .plan-view > span` lies inside
    `[data-plan]`'s box and the viewport, with nothing clipped by an `overflow`;
  - the `dl` meets no plank box grown by 24 px and no lettering box (P4's rule, at these windows);
  - the drawing's height is at least Iris's floor, and each window's value is reported.
- **W4 The model lands on it.** On Full, at 1366 × 625 and 1536 × 715 at DPR 1 and 2, frame 1
  registers on the shown drawing within B3.1's bounds (1.5 CSS px at DPR 1, 1.0 at DPR 2), using
  `model.ts`'s helpers. The canvas is whole-pixel on the shown drawing's box, as B3.1 reads it at
  1366 × 768.
- **W5 A resize refits it.** Load at 1440 × 900, resize to 1440 × 700, then back:
  - at 700, items 1 to 4 are inside;
  - at 900, W2's boxes are back within 0.5 px;
  - on Full, the model re-registers within B3.1's bounds after each step;
  - no reload, and no CLS entry without input.
- **W6 Still, and the name first.** At 1366 × 625 and 1536 × 715:
  - B1.8's CLS read is 0 at load;
  - nothing in the sheet animates at load or 2 s later, outside the model's own loft;
  - by B1.9's measurement at 4× CPU, the LCP element is the `h1` (on production today, unthrottled, it is at 1366 × 768 and
    1536 × 864).
- **W7 The sweeps at the new windows.** At 1366 × 625 and 1536 × 715, in both schemes:
  - axe with B4.24's strict tags is clean;
  - nothing overflows sideways;
  - in forced colours and in print the sheet keeps the drawing and every fact (B1.8's clauses);
  - Calm and Off give the same layout as Full (boxes within 0.5 px, the canvas aside).

Probe reports `window.spec.ts`'s time and the full suite's at CI's worker count.

## Live checks: kept unedited

The viewports kept checks pin near the title block (`grep -n setViewportSize e2e/` and each spec's
size lists):

| Viewport | Kept checks that read the first screen or the drawing there |
|---|---|
| 1440 × 900 | B1.1, P3, P8, B4.22 (five rows), B4.49, B3.1 (asserted), B1.9, P4, B3.16 |
| 390 × 844 | B1.1, P3, B4.22, B3.1 (asserted), B1.9 |
| 1280 × 800 | B4.49 (Contact in view, resting); `log-model.spec.ts`'s numbers (on `/log`, not this sheet) |
| 1024 × 768 | B4.22 (resting contact links), B4.49, B3.1 (reported), `plan.spec.ts` and `read.spec.ts` sizes, `sheet.spec.ts`'s hover-under-the-bar |
| 1366 × 768, 1920 × 1080, 820 × 1180, 768 × 1024, 320 × 568 | B3.1's whole-pixel canvas |
| 768, 1024, 1280 and 1440 × 900 | P4 |
| 1100 × 900 | `model-teardown.spec.ts` |

Every one runs unedited. B4.22's and B4.49's 1024 × 768 and 1280 × 800 clauses only assert
"inside", so a sheet that fits better keeps them green. Also unedited: B1.2, B1.5, B1.6, B1.10,
B2.9, B2.10, P1, P5, P6, P7, `keyboard.spec.ts` (Contact's first link the 16th stop),
`invariants.spec.ts`, `model-cost.spec.ts`, and `profile-sections.spec.ts`.

Nothing is rewritten or retired. A red kept check is a stop for Quill, not an edit. The one
exception: if Iris picks (b) and a kept check pins the old arrangement at a window in the set, the
contract comes back to me before the build.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| LCP the `h1` from 1024, ≤ 2,500 ms at 4× CPU | B1.9, unedited; W6 |
| CLS 0, at load and through a resize | B1.8, unedited; W5, W6 |
| 1440 × 900 unchanged | W2, and the kept checks above |
| The drawing never cropped, never below Iris's floor | W3 |
| The 3D costs no more: draws and triangles | `model-cost.spec.ts`, unedited |
| Nothing new is copper | B1.6 and B4.17, unedited |
| CI under `check`'s 35 minutes (#100: 28.8) | reported in the PR |

## Riders

- **The led-out "42" on seat 5.0** sits on the Base line at 1440 to 1536 (sprint 41's follow-up,
  visible on production in `close.md`). Iris says whether it moves. If it does, Pixel or Forge
  moves it, with a check in W3's style that its box meets no `[data-plan]` line label. Nothing
  else open touches this code.

## Out of scope

- Phones (Wb), and 1024 to 1279 with the key from 1024 to 1439 (Wc).
- The loft's motion and feel, the hull's look, the live marks and the replay: the model only
  follows the drawing.
- `/crew`, `/log` and `/read`, the social card, and any change to what the facts say.
- The display face on slow first visits (Iris's to weigh, `close.md`).

Nothing here touches an owner path or `content/`, so nothing waits for the owner. Iris's
composition on short windows is hers. He may overrule it after the merge, and it can be undone.
