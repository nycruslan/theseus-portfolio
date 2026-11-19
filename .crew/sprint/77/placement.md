# Sprint 77: Iris's placement (a record's heading in a short window)

Advice for Forge's build, before it starts. Measured on production (theseus-portfolio.vercel.app,
2026-11-19, newest step 76) with the CSS below injected into every one of the 75 records, scripts
off, webfont warm, in this machine's headless shell (Chrome for Testing 157, the build CI's
family) and again in Chrome 153: both gave the same numbers at every phone and tablet window.
Full mode was checked with the CSS in place before first paint. Scripts and screenshots are in my
scratchpad (`iris77/`), not in git.

## The call

**On a record below 1024 wide, in a window shorter than 60rem (960 px), the record follows the
yard.** Today the ghost's caption and the count line stand between the drawings and the record;
they move after the record, ahead of the lines figure. That puts the Log's whole header block (the
ghost's caption, the count line, the rule, the lines figure) under the record, where sprint 76
already put the figure. Three smaller moves finish the job:

- From 768 to 1023, the drawings take the width the window's height allows: never narrower than
  their 768 size, and never wider than the column.
- Below 22.5rem, the goal is set a step smaller.
- Below 768, the record's number line is trimmed to its text.

Nothing above the ghost moves at any phone width. The question and the chapter line keep their
slot under the drawings, and windows 960 px or taller keep today's page exactly.

**What the visitor sees first** (`/log/40`, at 375 × 667):

1. The bar, then the h1 "Log".
2. Read as page with Full, Calm and Off.
3. The Theseus, captioned "The Theseus after sprint 40".
4. The ghost.
5. ← Sprint 39 and Seat sprint 41's plank →, with the hint under them while the yard plays.
6. The record box: `Rev 40`, the whole goal at 483–546, and the first four facts.

At 1023 × 768 the visitor sees:

1. "Log".
2. Both ships, 800 px wide (991 today) with their numbers.
3. The record: Rev 40 with the steps at the right, the hint, the goal at 619–654, and Drawn,
   Checked and Tested.

The record page now opens on its record. The yard stays above it, the same on every step, and
nothing moves while you press.

## Measured: every record's h2, today and placed (scroll 0, CSS px)

| Window | Today: h2 bottoms, out of 75 | Placed: h2 bottoms, out of 75 | Freed above the h2 | Least spare |
|---|---|---|---|---|
| 320 × 568 | 702–801, 75 out | 512–600, **1 out (/log/23, 599.7)** | 173–222 | 5.9 (/log/3, 4, 7, 9) |
| 360 × 640 | 695–789, 75 out | 540–635, 0 out | 150–178 | **5.1 (/log/4); 5.4 (/log/23)** |
| 375 × 667 | 701–791, 75 out | 546–641, 0 out | 150–178 | 26.4 (/log/23) |
| 390 × 664 (H1's) | 707–797, 75 out | 552–647, 0 out | 150–178 | 17.4 (/log/23) |
| 390 × 844 | 707–797, 0 out | 552–647, 0 out | 150–178 | 197 |
| 900 × 700 | 772–840, 75 out | 626–670, 0 out | 146–176 | 30.5 (/log/76, newest) |
| 1023 × 768 | 825–893, 75 out | 654–698, 0 out | 170–201 | 69.8 (/log/76) |
| 768 × 1024, 820 × 1180, 1023 × 960, 390 × 1000 | 0 out | 0 out, **0 boxes moved** | 0 | as today |
| 1024 × 768, 1440 × 900 | 0 out | 0 out, **0 boxes moved** | 0 | as today |

- **Below 768**, the h1, the control row, both drawings, the step row and the hint are unchanged on
  all 75 records, and only boxes from the band's foot down move.
  - The question on /log/23 now sits at 427.4–474.2 (320), 443.4–490.2 (360) and 449.3–496.1
    (390).
  - The chapter line on /log/45 and /log/67 sits right under the band.
- **At 900 × 700** the drawings are 736 px wide (868 today), 146.7 tall. **At 1023 × 768** they
  are 800 wide (991), 159.5 tall.
- **Overflow** is 0 on every record at every window in the table.
- **`/log` doesn't move.** Every rule below is scoped to `.log-open`, so this holds by
  construction.
- **Full mode** (SwiftShader), with the CSS in place before first paint:
  - CLS is 0 from load to rest on /log/40 (375 × 667, 1023 × 768), /log/23 (320 × 568) and
    /log/45 (900 × 700).
  - The canvas lies on the capped drawings' union: 16–752 × 146.6–483.6 at 900 × 700.
  - One press of next lands with scroll 0, CLS still 0, and the h2 in view after landing. Tried
    at 40→41, 23→24, 45→46, 22→23 (the question appears), 44→45 and 66→67 (the chapter line
    appears).

## The options, and why this one

| Option | What it does | Verdict |
|---|---|---|
| (a) The ghost's caption and the count line after the record | It frees 144–171 px on phones and 94–124 at tablets. Alone, it leaves 18 records out at 320 × 568 (up to 89 px past), 2 at 360 × 640 (by 1.1 and 1.4 px), 17 at 900 × 700 (two-line goals, the chapter steps and the newest, up to 22 px past) and 1 at 1023 × 768 (the newest, 6 px). It holds all 75 at 375 × 667. | **Taken** as the spine. The caption is the whole Log's, the same on every step, which is sprint 76's reason for moving the figure. The count line is the caption's tally and can't stay alone: with a 3-line count and a 4-line goal at 375 × 667 the h2 ends at 709. |
| (b) Drawings side by side, 768–1023 | Each would be 480 px wide at 1023 and 418 at 900. Lifts would be 11.4 and 9.9 px, where the 13 px numbers need about 17. | **Rejected.** The numbers can't sit, and the yard's reading is lost: the Theseus over its ghost, seat over seat, one text edge. The press would fly sideways, a 3D composition change that's Pixel's and the drawings' art, which is out of scope. |
| (b′) Drawings shrink, 768–1023 | `clamp(46rem, (100svh − 28rem) × 2.5, 100%)`. They never go narrower than at 768, so the 13 px numbers keep the lifts they have at 768. | **Taken.** At 900 × 700, with full-width drawings (173 px each) and (a), 17 records still end 1–22 px past the fold. The cap gives 53 px more (2 × 26.3), and the shrink costs no lettering. |
| (c) Height gate | Applies everything only below 60rem tall. | **Taken.** Every phone in a browser is under it (390 × 664 in Safari, 430 × 932 at its largest). Tall tablets (768 × 1024, 820 × 1180, an iPad portrait in Safari at about 810 × 1010) keep today's page, which shows the ghost explained *and* the goal: I shot 768 × 1024 both ways, and today's is the better page there. A lower gate for phones only, such as 50rem so 390 × 844 kept today's, would serve lab windows, since phones in a browser are 630–780 tall. Today 390 × 844 holds /log/23 by just 47 px, and a newest step that is also a chapter step, with a four-line goal, would end it. So every phone gets one order. |
| (d) The goal a step smaller below 22.5rem | `--step-xl`, 24 px, instead of `--step-entry`, 30, at 320 to 359. | **Taken.** At 30 px in a 254 px measure the goal sets 15–18 characters a line: five goals run 5 lines, a wall (/log/3 and /log/4, shot). At 320 × 568: 30 px leaves 17 out, 26 px leaves 14, and 24 px leaves only /log/23. At 24 px the goal reads about 25 characters a line, the lines figure's size. |
| (e) Squeeze the yard band (h1, row, drawing margins) | It gives at most about 18 px. Every term is in `--yard-row`, and H1, B5.1 and B5.25 pin the row. | **Rejected**: too little, for too much. |

The defaults I steered away from:

- a "show more" fold on the ghost's caption, which is app chrome on a drawing sheet;
- a sticky record head;
- shrinking the yard to a thumbnail, or hiding the ghost on phones, which demotes the toy the
  owner wants as spectacle.

## The recipe for Forge (`app/globals.css`)

Put these after the `@media screen and (20rem <= width < 48rem)` block that places the step row
(about line 2670). They win over it by order: `.log-open [data-ghost-caption]` there has the same
specificity. One gate, `(height < 60rem)`, on every block, so a window 960 px or taller is
today's page.

```css
/* Sprint 77 (.crew/sprint/77/placement.md): on a record below 1024 px in a window under 60rem, the
   record follows the yard. The ghost's caption and the count line, the Log's block, go after it
   with the lines figure, which takes back /log's rule and 16 px. The question and the chapter
   line, the step's payoff, keep their slot under the drawings. 60rem tall and up keeps the page
   above, which there shows both the ghost's caption and the goal. */
@media (width < 64rem) and (height < 60rem) {
  .log-open :is([data-ghost-caption], [data-ghost-count]) {
    order: 9;
  }

  .log-open [data-ghost-caption] {
    margin-top: 24px;
  }

  .log-open .log-lines {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--foreground);
  }

  /* First under the ghost from 768 (and below 20rem): the ghost's caption's old 14 px. */
  .log-open .log-head :is(.log-question, .log-chapter) {
    margin-top: 14px;
  }

  .log-open:has(.log-head :is(.log-question, .log-chapter)) .record {
    margin-top: 16px;
  }
}

/* Below 768 the first thing under the ghost clears the step row and the hint as the ghost's
   caption did: 4, the row's 44, 4, the hint's line, 10. */
@media screen and (20rem <= width < 48rem) and (height < 60rem) {
  .log-open [data-ghost-caption] {
    margin-top: 24px;
  }

  .log-open .log-head :is(.log-question, .log-chapter) {
    margin-top: calc(62px + var(--hint-line));
  }

  .log-open:not(:has(.log-head :is(.log-question, .log-chapter))) .record {
    margin-top: calc(62px + var(--hint-line));
  }
}

/* Below 768 the number line holds Rev n alone (the steps stand under the ghost): its text's own
   height, 6.5 px back, which a five-line goal at 360 x 640 needs. */
@media (width < 48rem) and (height < 60rem) {
  .log-open .record-rev {
    line-height: 1;
  }
}

/* 768 to 1023: the drawings as wide as the window's height lets the record's head open in view,
   never narrower than at 768 (46rem: the 13 px numbers' lifts) nor wider than the column. svh:
   a toolbar sliding away never resizes them. The 3D lays itself on the drawings' boxes. */
@media (48rem <= width < 64rem) and (height < 60rem) {
  .log-open :is(.log-theseus-drawing, .log-ghost) {
    max-width: clamp(46rem, (100vh - 28rem) * 2.5, 100%);
    max-width: clamp(46rem, (100svh - 28rem) * 2.5, 100%);
  }
}

/* Below 22.5rem the goal a step smaller: 30 px in a 254 px measure set five goals on five lines. */
@media (width < 22.5rem) and (height < 60rem) {
  .log-open .record h2 {
    font-size: var(--step-xl);
  }
}
```

- **Fold sprint 76's rule in.** `.log-open .log-lines` below 1024 (order 9, 24 px, no rule) stays
  as it is for windows 60rem and taller, where the figure still follows the record box directly.
  Under the gate the figure follows the count line again, so its rule comes back: the doubled-edge
  reason doesn't apply there.
- **One name for the band, if you like.** The ghost's caption's
  `calc(62px + var(--hint-line))` and the two above are the same band. A
  `--yard-band` beside `--yard-row` keeps them one number.
- **Comments to update:**
  - the Log's opening comment (about line 1944), which lists the column;
  - the order comment above `.log-theseus` (about 1977);
  - sprint 76's comment on `.log-open .log-lines`;
  - the ghost's caption's comment in the step-row block ("the gap (4), the row (44)…"): under the
    gate the band's margin moves to the question or the record.
- **No DOM change.** No component file changes. The reading and Tab order are the DOM's, as
  today, and nothing focusable moves out of order.

## Kept checks: none retired

| Check | Why it stays green unedited |
|---|---|
| **H1** | The step row, the drawings and the hint don't move below 768. Next at 377.4 (375), 355.4 (320). The question is wholly in view at 360 × 640 (443–490) and 390 × 664, and starts in view at 320 (427). |
| **H1's placement guard** (log-hand.spec.ts:519) | Unchanged: the row is still 4 px under the ghost at 320–767 × 664, and the hint's bottom is above the ghost's caption's top, which is now under the record. |
| **B5.1, B5.25** | The row's DOM spot, band and Tab order are untouched. |
| **B5.18** | The canvas follows the drawings' boxes. At its widths (320, 390, 768, 1024, 1440) the cap never binds: at 768 the clamp's floor is the column. |
| **H5, T33, the ≥1024 checks** | 0 boxes move at 1024 × 768 and 1440 × 900. |
| **B5.3, B5.7, Y5** | At 390 × 844 the step links are unchanged, and the h2 rises (worst 646.6, from 797). |
| **Y3, Y4, B5.6 (C4.2), B5.14** | DOM order only, unchanged. |
| **B5.4, B5.26 (b)** | `/log` only. |
| **B5.9 (C8.1)** | Overflow 0 measured. |
| **Y8 and CLS** | 0 measured in Full. |
| **T34** (the hint at large fonts) | It reads the hint against its neighbours at 16 px at the same width, and the placement applies at 16 px too. Its neighbour below is now the question or the record box, 10 px under its line. Forge should run it, since I didn't. |

**Needs decision (Atlas): T37 at 320 × 568 on the question's step.** /log/23's h2 can't lie wholly
in a 320 × 568 window while H1 keeps the question above the record there:

- The question spans 427.4–474.2.
- The goal starts at 524.2 and, even at 24 px, ends at 599.7: 32 px past the fold.
- Nothing under the drawings is left to move. The band above is pinned by H1, B5.1 and B5.25.

I suggest T37 at 320 × 568 reads "starts in view" for the step where the question is shown
(H1's own word for the question at 320). The h2 starts at 524.2 there, and every other record is
wholly in view. Otherwise T37 stays red on one record, or the question has to leave the first
screen, which H1 forbids.

**For Probe: one number to reconcile.** You read the h2 as tall as 189 px at 320. In both
browsers here the tallest is 157.5 (/log/3, 4, 9, 13 and 15, five lines at 30 px), and the
`display: optional` fallback (woff2 blocked) gave the same. If 189 is a record I can name, its goal
at 24 px could run five lines (126) and end near 587 at 320 × 568. Please send the record number.

## Not measured, and the risks

- **The spare at 360 × 640 is 5 px** (/log/4's five-line goal, /log/23's question). It holds in
  both browsers here. A goal one line longer at 360 would go out, and the next fix there would be
  the 24 px step widened to 360. I didn't take it, since 360 is the commonest Android width and
  30 px reads well there on four lines.
- **Future steps:**
  - A newest step whose goal runs two lines at 900 would end about 4 px past 900 × 700. The cap's
    46rem floor binds there, and a lower floor would squeeze the 13 px numbers.
  - The first chapter step that is also the newest (k = 88) adds the hand-off's 44 and the
    chapter's line together. At 1023 × 768 that holds by about 38 px with a one-line goal and
    3 px with a two-line one.
- **Safari, Firefox and a real phone.** The gate reads the window's height, and on iPadOS a
  toolbar collapsing shouldn't flip it, since no common tablet in 768–1023 sits near 960 tall. That
  is unverified. `svh` keeps the drawings still while scrolling.
- **The build itself.** This is CSS injected into production's DOM. Forge's build is the proof,
  and I'll look at it running.

## For the owner (undoable, nothing waits)

On a phone, and on a short tablet window, a record now opens on its goal: the ghost's caption and
the count line follow the record instead of preceding it. The cost is that the ghost has no caption
in the first screen there, though the Theseus's caption between the ships names the other one, and
the question names the ghost on its step. On tablet windows under 960 px tall the ships draw
narrower (736–991 px). At 320 to 359 px the goal is 24 px, not 30. The PR's retro should say so.
