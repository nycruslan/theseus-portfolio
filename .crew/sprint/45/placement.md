# Sprint 45: how the sheet fits a tablet window, and where the key goes (Iris)

**Call 1: from 1024 to 1279, the short regime of Wa reaches down to 1024.** Under 960 px tall:

- The drawing gives way from the frame's left.
- The particulars stand beside it at the band's foot, as they do from 1280 under 712 tall.
- The contact row follows the bio.
- The drawing is the smaller of two widths: the height the window leaves above the title block,
  or the width that keeps the particulars an 18rem column beside the drawing's rightmost line. It
  never goes under the floor.
- **The floor stays Wa's: 240 px tall (15rem), a drawing 710 px wide at 0.505 of its 1440 size.**
- Two small changes make 1024 × 640 reach the floor:
  - The title block's column is never narrower than 27.5rem, so the bio's lead sets on 4 lines.
  - The contact row's two lines split between its two groups.
- From 960 tall the sheet is today's: the drawing the band's width, the particulars a strip row
  under it.

**Call 2: the key goes under the table at every width,** as it already does at 1440 and below 1024.
`lg:max-[90rem]:hidden` goes. From 1024 to 1247 the key takes two lines, split between its
sentences: the claim in ink, then what Approved means. From 1248 it is one line. B4.22 and B4.49
hold because the links no longer wait at the revisions' foot (call 1; Wa did the same from 1280).

At 1440 × 900 nothing moves. The first window is identical byte for byte at 1440 × 900, 1536 × 715
and 1920 × 1080 (light and dark), at 390 × 664, 768 × 1024 and 1023 × 768, and on /crew, /log and
/read at 1024 to 1366. The DOM order doesn't change.

## What I measured first

I measured the branch (dbbddb0 = main c387811 plus notes) with `next start`, in the headless shell
that `@playwright/test` 1.64.0 launches (Chromium 156.0.8078.4, CI's). WebGL was refused and the
fonts were warm. I cross-checked in Chrome 153, which sets glyphs at fractional widths. The default
server and the live, open and resting fixtures all matched the contract's table. For example, the
resting links at 1024 × 768 end at 758.1.

The title block is what stops 1024 × 640, more than the drawing.

| Width | Title block's column | Measure | Bio | Contact row | Top of title block to bottom of links |
|---|---|---|---|---|---|
| 1024 | 425 | 369 | **5 lines** ("day." alone) | 2 lines, Email cut off from LinkedIn and GitHub | 344 |
| 1180 | 492 | 436 | 4 | 2 | 327.6 |
| 1279 | 535 | 479 | 3 | 1 | 281.6 |

- **The near-wraps, measured over measures 340 to 560 in both engines:**
  - The bio's lead takes 5 lines under a 373 px measure, 4 lines from 373, and 3 from 469 (shell)
    or 473 (Chrome). At 1024 the measure is 369, so 1024 to 1032 are the only widths with a
    five-line bio.
  - The six links need 454 px in the shell and 450 in Chrome (18 px gaps). They fit one line from
    about 1231 wide.
  - The key needs 639 px in the shell and 618.6 in Chrome. Its first sentence is 236 px.
  - The particulars' phrases are Leads 309, Reach 380, Gateway 225 and Impact 356 px in the shell.
    In Chrome they are 294, 369, 214 and 345.
- **The budget at 1024 × 640:** the bar (72) plus the title block (344) leaves 224 px for the band,
  with no film under the links. Wherever the particulars go, the drawing can't reach 240 unless the
  title block gives up a line.

## Why this, and not the others

Options 1 and 2 are arithmetic from the measured parts, not prototypes. Option 3 was rendered.

1. **Wa's rule alone, with the drawing giving way and the particulars still a strip under the
   sheet.** At 1024 × 640 the drawing would have to fall to 128 px (0.27). It can't hold.
2. **The particulars at the head of the revision column (row 2, column 1).** That costs 140 px under
   the band, and the title block still needs its 344. So the drawing is 216 px at 1024 × 640, and
   350 px of empty band sits beside it. At 1024 × 768 it pushes the key out unless the drawing falls
   to 209.
3. **The particulars on the title block's own text column** (the 1366 × 625 look). It is the
   tidiest alignment, but at 1024 it caps the drawing at 622 × 210 (0.44), and there the plank
   numbers touch their seams (`scales/scale-0.443.png`).
4. **Chosen: beside, with the column the particulars need set in rem and the floor kept.**
   - At 1024 the 18rem column and the 240 floor coincide by construction: (990 − 52 − 288) /
     0.91567 = 709.9 px wide = 240 tall.
   - From 1060 the drawing grows with the width (0.505 at 1024, 0.626 at 1180, up to 0.70 at 1279).
     Under about 705 tall it is the height that limits it instead.
   - The particulars' right edge is on the title block's text. Their left edge is 24 px clear of
     the drawing, or on the title block's text edge where that is further right.
   - The sheet reads: drawing beside particulars, over revisions beside title block. That is Wa's
     short composition.

**Defaults I steered away from:**

- shrinking the name or the title block's type at tablet widths;
- hiding Live Studio, as a phone does, to get the contact row on one line;
- going under the floor (`scales/`: at 0.47 and 0.443 the 11 px numbers touch their seams, and at
  0.505 they clear them);
- a tablet layout with the title block beside the drawing (it demotes the drawing to a column, the
  trade the owner rejected);
- moving the key above the table or into the foot row, which puts its place on screen out of step
  with the DOM and makes it read as the caption of something else.

**Why there is a switch at 960, and today's sheet above it.** Beside, the drawing is capped by the
width the particulars need, not by the height. At 1024 it is 240 at every height. On a tall window
(iPad Pro 12.9 in portrait, 1024 × 1366) that would throw away a 335 px drawing that fits. Today's
sheet, with the key shown, holds everything in the first window from 953 px tall, in every state:
- the live state's particulars end at 944.6 at 1240 × 960;
- the resting state's end at 899.8 at 1024 and 929.9 at 1180.

So the switch is `60rem`. Crossing it swaps the two compositions, but only on a resize: a tablet
holds its `svh`. No window in the contract crosses it, and W17's 768 → 640 → 768 stays below it.

## The rule (Forge builds it; this CSS was built and measured, see "Each window")

**The constants:**

| Name | Value | What it is |
|---|---|---|
| `--sheet-foot` (1024 to 1279) | `calc(25rem + (100vw - 64rem) * 0.05)` (400 at 1024, 412.7 at 1279) | The bar (72), the title block to its links' foot with a 4-line bio and 2 link rows (319.5 at 1024, 327.6 at 1180, about 330.6 at 1247), and 8 px of film. It equals Wa's 25rem at 1280. |
| `--plan-floor` | `15rem` (240) | Wa's floor, unchanged. |
| 18rem | 288 px | The particulars' column at the cap: phrases take at most two lines (phrase column 216 px, Reach's 380 px in two). |
| 52px, 54px | 28 + 24, and the same less 2 | The title block's padding plus the 24 px gap, in the band's inner box (`.plan-wide`'s %) and in main's (the `dl`'s %). |
| 0.91567, 0.33807 | 1289.2 / 1408, 476 / 1408 | Wa's: the drawing's rightmost line once the station numbers are off, and its height over its width. |
| 27.5rem | 440 px | The title block's column floor: a 384 px measure, 11 px over the bio's 4-line wrap at 373 in both engines. It binds only from 1024 to 1058, where 3/7 of the frame is under 440. |
| `60rem` | 960 px tall | The switch: today's sheet holds the facts, the particulars and the key from 953 in every state. |
| `78rem` | 1248 px wide | Below it the key's two sentences and the contact row's two groups take a line each. From 1248, measured in both engines, the key and the six links each hold one line (the key with 8 px of slack in the shell and 28 in Chrome). |

**`app/page.tsx`, main's grid:** `lg:grid-cols-[minmax(0,4fr)_minmax(27.5rem,3fr)]`, in place of
`minmax(0,3fr)`. Where 3/7 of the frame is over 440 px (from 1059 wide) the tracks are the same as
today. The 1440 to 1920 screenshots are identical byte for byte.

**`components/revisions.tsx`:**
- Remove `lg:max-[90rem]:hidden` from the key's class.
- Update the comment above it (lines 228 to 234), which says nothing fits there.

**`app/globals.css`:**

1. **The strip rule** at line 1348 keeps its body, under a new query:

   ```css
   @media (64rem <= width < 80rem) and (height >= 60rem), print and (64rem <= width < 80rem) {
   ```

2. **The tablet rule,** after Wa's block (after line 1463):

```css
@media screen and (64rem <= width < 80rem) and (height < 60rem) {
  main {
    --sheet-foot: calc(25rem + (100vw - 64rem) * 0.05);
    --plan-floor: 15rem;
    --plan-fit: calc(
      max(var(--plan-floor), 100svh - var(--sheet-foot)) / 0.33807
    );
  }

  /* The height's fit, or the width that leaves the particulars 18rem beside the drawing's
     rightmost line, whichever is less; never under the floor (at 1024 the cap is the floor). */
  main > [data-plan] > .plan-wide {
    width: min(
      100%,
      var(--plan-fit),
      max(var(--plan-floor) / 0.33807, (100% - 52px - 18rem) / 0.91567)
    );
  }

  main > [data-plan] > .plan-wide > .plan-plank {
    font-size: var(--step-xs);
  }

  main > [data-plan] > .plan-wide > .plan-wide-only {
    display: none;
  }

  .title-contact {
    margin-top: 0;
  }

  /* Right edge on the title block's text; left edge on its text edge (column 1 is 4/7 of the
     frame, or what the title block's 27.5rem leaves), or 24 px clear of the drawing's rightmost
     line, whichever is further right. */
  .particulars {
    grid-column: 1 / -1;
    grid-row: 1;
    align-self: end;
    margin: 0 29px 16px
      max(
        min(100% * 4 / 7, 100% - 27.5rem) + 28px,
        1px +
          min(
            100% - 2px,
            var(--plan-fit),
            max(var(--plan-floor) / 0.33807, (100% - 54px - 18rem) / 0.91567)
          ) *
          0.91567 + 24px
      );
    padding: 0;
    background: var(--background);
  }
}

/* 1024 to 1247: the contact row and the key each take two lines, split where they read: the
   site's three links, then the three contact links (after the Contact label read aloud); the
   key's claim, then what Approved means. */
@media (64rem <= width < 78rem) {
  .title-contact::after {
    content: "";
    order: 1;
    flex-basis: 100%;
  }

  .title-contact > .sr-only ~ a {
    order: 2;
  }

  .rev-key > .crew-key-who {
    display: block;
  }
}
```

**Builder's notes:**

- **This is the CSS I built and measured,** not a sketch. I applied it to a `git archive` of dbbddb0
  in my scratchpad, built it and served it on the four states. It is also in
  `.crew/screenshots/45-iris/wc-build.css`. Rename hooks as you like.
- **The scope is `/` only:**
  - `main > [data-plan] > .plan-wide` is `/`'s drawing. `.title-contact`, `.particulars` and
    `.rev-key` exist only on `/`; /log's key is `.log-key`.
  - The grid class is `/`'s main.
  - /crew, /log and /read measured identical at 1024 × 768, 1180 × 740 and 1366 × 625.
- **The cascade:**
  - Unlayered CSS beats Tailwind's utilities (`lg:mt-auto`), so nothing needs `!important`.
  - With the strip rule under its new query, the base `.particulars` rule (the two-column rows)
    applies in the tablet rule untouched.
  - The base rule's `padding: 0 16px` needs the `padding: 0` above.
- **`screen` keeps print as it is.** An A4 landscape page is about 1045 px wide, so it falls in this
  range, and it keeps the strip.
- **The contact row's break is generated content plus `order`.**
  - The visual order of the six links stays the DOM's, so Tab is unchanged (Contact's first link is
    still the 16th stop).
  - The `.sr-only` span is absolutely positioned, so it is not a flex item.
  - The second line's group hangs from the right edge, as it does on one line (`lg:ml-auto` on
    Email), under the location's right edge.
  - Today at 1024, Email sits alone at the right of the first line, with LinkedIn and GitHub on the
    second. Under the column floor alone, GitHub would wrap alone.
- **Leave `.sheet-row`'s min-height alone.** It assumes the natural band, so where the drawing
  gives way it falls under both blocks' content and never binds. That is what Wa found too.
- **Comments to update:**
  - `app/page.tsx` 90 to 92 ("a strip row of the frame to 1279");
  - `globals.css` 1306 to 1312 and 1346 (the particulars' homes);
  - the key's comment in `revisions.tsx`.
- **Leave `lib/` and the drawing's geometry alone.** Only the box's width, the lettering's size and
  the particulars' place change. The model's canvas follows `.plan-wide` through its
  ResizeObserver, as it does in Wa.

## The floor: 240 px of `[data-plan]`'s box, Wa's, from 1024 to 1279

- **It is 15rem, the same constant.** The renders at DPR 3 (`scales/`) show why I don't go under
  it: at 0.47 and 0.443 the 11 px numbers fill their lifts and touch the seams, and at 0.505 they
  clear them.
- **Where it binds:**
  - At 1024 it binds at every height under 960: the cap and the floor meet there.
  - Elsewhere it binds only under about 660 tall. At 640 tall the links have 8.0 px of room at
    1024, 4.0 at 1100 and 0.4 at 1180.
  - From about 1190 to 1247 at 640 tall the links end up to 2.6 px under the fold (−0.2 at 1194,
    −2.6 at 1247), as they do from 1280 under 616. From 650 tall they hold at every width: 7.4 px
    at 1247 × 650, the least.
- **`[data-plan]`'s height equals the drawing's** at these widths, as from 1280. W16 reads it
  against 240, so Probe's `DRAWING_FLOOR_PX` stays 240.
- **In W13's windows:** 240.0 at 1024 × 640, 240.0 at 1024 × 768, and 297.6 at 1180 × 740.

## The particulars at 1024 to 1279

- **Under 960 tall, beside the drawing at the band's foot.**
  - They stand 16 px above the frame's line, in the band's row.
  - Their right edge is on the title block's text.
  - Their left edge is 24 px clear of the drawing's rightmost line, or on the title block's text
    edge where that is further right.
  - They are at least 18rem wide: 288 at the cap, wider where the height limits the drawing.
  - They are filled with the film, as from 1280.
- **The rows** are the two-column table they are from 1280: an ink head rule, 3.75rem terms, and
  phrases on at most two lines (Gateway is one line in Chrome and two in the shell at 1024).
- **From 960 tall, a strip row under the sheet,** as today.

## The key

- **It sits under the table at every width,** with its 4 px tuck. One line runs from 1248 to 1439
  and at 1440 and up. From 1024 to 1247 it takes two lines, split between its sentences.
- **It never meets the table or the foot row** (the sweep). It is never clipped and never more than
  two lines.
- **Where it is in view:**
  - From 1280 to 1439, at every height from 625 in every state. The least room is 5.2 px, at
    1439 × 630 on the resting fixture.
  - From 1024 to 1279, at W14's window 1024 × 768 with 117 px of room (resting) and 146.5 (the
    other states).
  - Only the resting state's key falls under the fold at 1024 × 640, where nothing requires it.
- **Why the links don't move:** from 1024 to 1279 under 960 tall (call 1), and from 1280 under 900
  (Wa), the contact row follows the bio. So the key's line can't push them.
  - **B4.22**, the resting links at 1024 × 768: they end at 632.0, 136 px inside.
  - **B4.49's 1280 × 800:** the links end at 753.7.
  - **B4.49's 1024 × 768 rest line with the replay link:** the line and the link are 414 px (401 in
    Chrome) in a 503 px measure, one line. So the line is no taller with the link.

## Each window, as built

The CSS above was built from dbbddb0 and served on the default server and the live, open and
resting fixtures. The browser was CI's headless shell (Chromium 156), with WebGL refused. Each cell
is where the item ends, then (room to the fold), in the order default / live / open / resting.
"Today" is the branch without the CSS. The prototype injected into the branch's build gave the same
numbers to 0.1 px.

| Window | Drawing: h × w, scale | `h1` | Contact links end | Particulars (y; x) | Key ends | Today: links, particulars |
|---|---|---|---|---|---|---|
| 1024 × 640 | 240.0 × 709.9, 0.505 | 332.0–406.4 | 632.0 (8.0) in every state | 119.6–296.0; 691–979 | 621.5 (18.5) ×3 / 651.0 (−11.0), not required | 751 / 758, 847 / 855 |
| 1024 × 768 | 240.0 × 709.9, 0.505 | 332.0–406.4 | 632.0 (136.0) in every state | 119.6–296.0; 691–979 | 621.5 (146.5) ×3 / 651.0 (117.0) | 751, 847: key hidden |
| 1180 × 740 | 297.6 × 880.2, 0.626 | 389.6–469.6 | 697.2 (42.8) in every state | 177.2–353.6; 847–1135 | 656.4 (83.6) ×3 / 685.9 (54.1) | 787, 884 |
| 1280 × 680 | 280.0 × 828.2, 0.589 (Wa) | 372.0–455.7 | 633.7 (46.3) | 212.3–336.0 (Wa) | 620.3 (59.7) ×3 / 649.8 (30.2) | key hidden |
| 1366 × 625 | 249.0 × 736.5, 0.524 (Wa) | 341.0–427.8 | 606.5 (18.5) | 198.8–305.0 (Wa) | 589.4 (35.6) ×3 / 618.9 (6.1) | key hidden |
| 1280 × 800 | 400.0 × 1183.2, 0.842 (Wa) | 492.0–575.7 | 753.7 (46.3) | 332.3–456.0 | 740.3 (59.7) ×3 / 769.8 (30.2) | key hidden |
| **1440 × 900** | **475.3 × 1406, unchanged** | 567.3–656.8 | 866.3 / 874.2 / 866.3 / 880.2 | 407.6–531.3 | 816.7 ×3 / 846.2 | **identical** |
| 1024 × 1000 (over the switch) | 334.7 × 990.0, 0.704 | 426.7–501.1 | 773.7 / 797.2 / 797.2 / 803.2 | 790.7–870.3, the strip | 716.2 ×3 / 745.7 | today's sheet, with the key |

- **Chrome 153 gives the same geometry** at 1024 × 640, 1024 × 768, 1180 × 740 and 1366 × 625:
  - The links end at 632.0 (8.0) at 1024.
  - Its particulars are 17 px shorter (Gateway on one line).
  - At 1024 its revisions' caption fits beside the heading, so its key ends 23 px higher.
  - At 1280 × 680 its bio takes Wa's reserved fourth line: links 658.1 (21.9), as in sprint 43.
- **Every state** keeps the bio on 4 lines, the links on 2 lines and the key on 2 lines from 1024 to
  1247.
- **At every window:**
  - no lettering span or plank box lies outside `[data-plan]`;
  - the `dl` meets no plank box grown by 24 px and no lettering span;
  - nothing scrolls sideways;
  - the `h1` stays the largest text.

## The sweeps

All sweeps ran on the built CSS in the shell unless noted. They checked:
- the facts and the `dl` inside the viewport from 640 tall;
- the key shown, at most two lines, and meeting neither the table nor the foot row;
- the drawing at least 240;
- W3's clearances;
- sideways scroll;
- the `h1` the largest text.

The results:

- **1024 to 1439:** 17 widths × 21 heights (600 to 1000 every 20) × 4 states = 1,428 windows. Every
  finding was one of two: 1220 × 640 and 1247 × 640, where the links end 1.4 and 2.6 px under the
  fold (the floor binds).
- **Every 10 px from 600 to 1000** at 12 widths from 1024 to 1279, on the prototype: default, live
  and resting, 1,476 windows, with the same two findings. Then 1280 to 1439 on live and resting:
  468 windows, none.
- **Chrome 153 on resting:** 7 widths, every 20 px. 140 windows, with one finding, at 1247 × 640.
- **The least room from 640 tall:** the particulars 13.0 px (live). The facts' least room is in
  "The floor" above: 8.0 px at 1024 × 640, falling to 0.4 at 1180 × 640.

## Still, the name first, and clean

- **CLS** was read with the CSS served in the head and the model loading (SwiftShader):
  - 0 at load at 1024 × 640 and 1180 × 740.
  - Through 1024 × 768 → 640 → 768 there were no layout-shift entries at all, raw or filtered. At
    1024 the drawing is 240 at both heights, so nothing moves.
- **LCP**, with the CSS in the served head, is the `h1` at 1024 × 640, 1024 × 768 and 1180 × 740.
  Today the bio's paragraph is LCP at 1024 × 768 (5 lines, 41,760 px²). With 4 lines, the `h1`
  (35,568 px²) is the largest.
- **axe** with B4.24's strict tags on the live fixture at 1024 × 640, 1180 × 740 and 1366 × 625,
  light and dark: 0 violations and 0 overflow.

## For Probe

- **The floor constant** is 240 px on `[data-plan]`'s box, the same as W3's `DRAWING_FLOOR_PX`.
- **W1's margin is 0** (inside to 0.5 px). The tightest items:
  - the links at 1024 × 640: 8.0 px in every state and in both engines;
  - the resting key at 1366 × 625: 6.1 px.
- **No assertion pins the key as hidden.** `grep -rn "crew-key" e2e/` finds W2's box at 1440 × 900,
  P8 at 1440 and 390, P10 on /log, and a comment in W7 (`window.spec.ts:1276`, "below 1440 the
  screen hides p[data-crew-key], Wc's to show") that goes stale. W7's print and forced-colours clause
  still holds, since the key now shows on screen and in print alike. So I expect no retirement,
  only that comment.
- **Kept checks whose geometry moves under them** (none asserts a y value that changes):
  - **P13 and W12, at 1024 × 900 on the live fixture ("1024 must be one"):** 1024 × 900 is now the
    beside regime. P13's 2D read still meets: chip 119.5–137.5 × 157.8–168.8, dot (135, 168.2)
    r 4, measured. W12's 3D half now runs on a hull at 0.505 scale. On Full at rest at DPR 2 the
    dot shows at the label chip's corner (`full-build/full-1024x900@2.png`), but please run W12 early.
  - **`model-teardown.spec.ts:189` to 208** resizes through 1100 × 900 and 1024 × 900, which are
    now the beside regime. The canvas has to refit the narrower box: Full measured 710 × 240 on a
    709.91 × 239.98 box.
  - **B3.1's whole-pixel canvas at 1024 × 768:** the box is fractional now (709.91 × 239.98), as
    Wa's are from 1280.
  - **B1.4 at 1024 × 900:** the plank numbers are 11 px, which still meets "at least 11", and the
    three captions show.
  - **B3.2 at 1024 × 768** reads the loft against frame 1 on the smaller drawing.
  - **B1.9 at 1024 × 768:** the LCP element changes from the bio to the `h1`. Both are in the title
    block.
- **The switch at 960 tall** is a composition change on a height resize at 1024 to 1279. None of
  W13 to W17's windows crosses it.

## For Pixel (only if the model stops landing)

- The canvas lays itself on `.plan-wide` through the ResizeObserver. On Full at rest it measured:
  - 1024 × 640: 710 × 240 at (17, 72), on a 709.91 × 239.98 box;
  - 1024 × 900: 710 × 240 at (17, 72), on a 709.91 × 239.98 box;
  - 1180 × 740: 880 × 297.5, on an 880.22 × 297.56 box.
- The settled hull and its shadow stay left of the particulars at 1024 × 640 and 1024 × 900.
- Frame 1 and the loft were not checked on the clock; W16 asks for that at 1024 × 640, DPR 1 and 2.

## Not verified

- Safari and a real iPad: none are installed. Safari's toolbar sizes give windows like these:
  - 1024 × ~690, 1180 × ~740 and 1133 × ~670 in landscape: the beside regime;
  - 1024 × ~1270 in portrait: today's sheet.
- Frame 1's registration on the clock at 1024 × 640 (W16). I measured only at rest.
- A larger default font size: every constant that text sets is in rem, but I didn't run one.

## Evidence (git-ignored, `.crew/screenshots/45-iris/`)

- `today/` and `final/today-resting/`: the branch as it is.
- `final/{default,live,resting}/<window>-{light,dark}.png`: the call at the set, the prototype on
  the branch's build.
- `final/chrome-resting/`: Chrome 153 at 1024 × 768 and 1180 × 740.
- `scales/`: the drawing at scales 0.42 to 0.55, DPR 3, with 11 px numbers. These set the floor.
- `full/` and `full-build/`: Full at rest at 1024 × 640, 1024 × 900 and 1180 × 740.
- `proto-v2.css` (injected) and `wc-build.css` (built).

The scripts are in my scratchpad, not the repo: `measure.mjs`, `sweep.mjs`, `table.mjs`, `textfit.mjs`,
`chipdot.mjs`, `cls.mjs`, `lcp.mjs`, `axe.mjs`, `routes.mjs`, `full.mjs`, `scales.mjs` and
`sites.mjs`.
