# Ha: Iris's calls (sprint 59)

**Placement: (b), the step row right under the ghost on every step page below 768.** The yard's
control sits under the two ships it moves, at the same height on every step and in every mode, so
a phone visitor's thumb never has to find it again. It moves on screen only: the links stay in the
record's head in the DOM, so no kept check needs a rewrite.

## How I measured

- **Where:** https://theseus-portfolio.vercel.app, 2026-11-09, newest step 58 (sprint 58 merged,
  tenth row on `/log` is 49).
- **With what:** the chrome-devtools tools couldn't start Chrome here ("Chrome does not start as
  root"), so I used CI's renderer instead: `@playwright/test` 1.64.0's headless shell 1248, DPR 1,
  webfont warm (one reload), plus the `display: optional` fallback with the font files blocked for
  the sweeps. Scripts and screenshots are in my scratchpad's `iris59/`, not in git.
- **The injection** (door-iris.md's method): the CSS below and the two new elements put into
  production's DOM. For scripts off, after load. For Full, by an init script with a
  MutationObserver, so the placement is there before first paint and CLS reads it as a build would
  serve it. A press swaps `.record` for the server's, so the observer put the hint back after each.
- **Bar bottom is 52 px** in every window below.

## 1. Where the step row sits below 768

### The options

| Option | The measure | Why not / why |
|---|---|---|
| (a) beside the h1 | "Log" leaves 234 px at 320. The row needs 247 (two-digit steps) to 263 (three-digit), plus 16 px of gap. | It fails at 320 without a second row or shorter words, which Y4's names pin. It also stacks a pager over the motion control: two rows of controls in the top 125 px, and the top-right corner is the hardest place for a thumb. |
| **(b) under the drawings** | Next at 379–423 (390), 367–411 (360), 351–395 (320) on every step. | **Chosen.** Everything above it (h1, control row, Theseus, its one-line caption, ghost) is the same on every page, so the row never moves. It sits under what it moves, at mid-screen for the thumb. |
| (c) the lines figure after the record | 88 px back at 390: next at 610–654 (390 × 664), 621–665 (360 × 640), 648–692 (320 × 568). | It fails two of three windows, and the row still drops 59 px at 23 behind the question. |
| (d) a step bar fixed at the foot | It is always in reach. | It is app chrome on a drawing sheet. It takes 60 of 568 px over the record and the table on every scroll, and needs scroll padding. It also lets a press fly a plank on drawings that are scrolled away. |

These are the defaults I steered away from: a sticky bottom bar (every mobile pager's habit) and a
title-bar pager (a). The flip book wants the page turn under the page.

### What the visitor sees at 390

The h1, then Read as page with Full, Calm and Off, then the Theseus and "The Theseus after sprint
n". Then the ghost, and right under its keel `← Sprint p` at the left and `Seat sprint q's plank →`
at the right. Under Next, in graphite, "Hold to flip through the sprints" (only while the yard
plays). Then the ghost's caption, the count line, the question or the chapter line, the lines
figure and the record, whose head now holds `Rev n` alone (and the hand-off on the newest step).

### Measured: the link to press, top to bottom (CSS px, scroll 0)

Scripts off on every step. Full once `data-yard` is set, the same numbers on `/log/1`, `/log/13`,
`/log/45` and `/log/58`. In Full a walk of taps from 13 to 24 read the same box before every press,
with no scroll and CLS 0, at all three phones.

| Window | `/log` Start (unchanged) | `/log/1` next | `/log/13` next | `/log/23` next | `/log/45` next | `/log/58` previous | Today, 1 / 13 → 23 → 45, 58 |
|---|---|---|---|---|---|---|---|
| 390 × 664 | 519.2–563.2 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 639–683 cut, 698–742 below, 662–706 cut |
| 390 × 664 dark | – | – | 379.3–423.3 | 379.3–423.3 | – | – | the same |
| 360 × 640 | 530.5–574.5 | 367.4–411.4 | 367.4–411.4 | 367.4–411.4 | 367.4–411.4 | 367.4–411.4 | 650–694, 709–753, 673–717, all below |
| 320 × 568 | 514.5–558.5 | 351.4–395.4 | 351.4–395.4 | 351.4–395.4 | 351.4–395.4 | 351.4–395.4 | 677–721, 736–780, 700–744, all below |
| 390 × 844 (Y5) | 519.2–563.2 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 379.3–423.3 | 639–683, 698–742, 662–706 |

What else stays in view:

- **Both drawings' tops** are unchanged:
  - the Theseus at 193.4 everywhere;
  - the ghost at 307.9 (390), 302.0 (360) and 294.0 (320).
- **The question on `/log/23`:**
  - 390 × 664: 564.0–610.8, wholly in view (today 506–553);
  - 360 × 640: 575.3–622.1, wholly in view (today 517–564);
  - 320 × 568: 559.3–606.1, so it starts 8.7 px above the fold, as H1 allows (today 501–548,
    wholly in). This is the price of the row: at the smallest window the payoff starts in view and
    the press is whole.
- **The hint:** 427.3–441.3 (390), 415.4–429.4 (360) and 399.4–413.4 (320). At 1440 × 900 it is at
  495.2–509.2 on `/log/13` and 519.9–533.9 on `/log/58`.
- **The chapter line on `/log/45`:**
  - 587.2–610.6 at 390 × 664 and 598.5–621.9 at 360 × 640, one line each;
  - 582.5–629.3 at 320 × 568, two lines, below the fold (no check asks for it there);
  - 329.6–356.9 at 1440 × 900.
- **Hits:** `elementFromPoint` meets the link at its centre with scripts off, and at its centre and
  two corners in Full at rest. The canvas ends at the ghost's foot (379.4 at 390), and the row's
  `z-index: 1` keeps any overlap the link's.
- **Overflow:** 0 at every window and step in the table, and across the 320 to 767 sweep.

From 768 up nothing moves but the record's insides:

- **Drawings:** at 1024 × 768 and 1440 × 900 the boxes differ by 0.00 px on `/log`, 1, 13, 23, 45
  and 58.
- **Step links:** they keep their places at 768 × 1024 (722.8 on 13), at 1024 (501.9 on 13) and at
  1440 (467.2 on 13, 533.8 on 23, 491.9 on 58).
- **On 45 only,** the chapter line moves the record down: 491.9 → 531.2 at 1440 and 525.9 → 563.7
  at 1024.
- **The record's h2** sits 18 px lower from 768 up, under the hint's held line (`/log/13` at 1440:
  499.2 → 517.2).

**1 px sweeps, 320 to 767, scripts off,** on `/log/23`, `/log/45` and `/log/58`:

- Run in both faces, and again with three-digit words ("Sprint 112", "Seat sprint 114's plank",
  "The Theseus after sprint 113").
- The row's top minus the ghost's bottom stays within ±0.5 px at every width (the worst is
  −0.02).
- The ghost's caption sits at least 9.94 px under the hint's line.
- The Theseus's caption stays one line, nothing overflows, and the two links never come within
  8 px of each other.

**B5.7** at 390 × 844:

- Today's tenth row, `/log/49`, has its h2 at 710.0–773.0, now 743.5–806.5: **37.5 px spare**.
- A three-line goal in the webfont, such as `/log/48`, goes from 710.0–804.5 to 743.5–838.0, with
  6 px spare.
- A four-line goal in the tenth row would go red. Today it would have passed with 8 px.

### Why it holds still

The row is absolutely placed in `main`, at the ghost's foot. Its offset is the sum of what stands
above it, every term fixed on a step page:

| Term | Value |
|---|---|
| The h1 | 20 px of margin, plus 0.95 of `--step-2xl` |
| The control row | 12 + 44 px |
| The Theseus | 16 px of margin, plus its drawing |
| The Theseus's caption | 6 px of margin, plus 1.45 of `--step-base` (one line, held) |
| The ghost | 14 px of margin, plus its drawing |

Each drawing is 126/632 of the column (both viewBoxes are `0 0 632 126`).

A percentage in a margin reads the containing block's width, so `(100% − 32px)` is the column
exactly, scrollbar or not (my recipe from sprint 44). The sweep above is the proof. The ghost's
caption takes the band's height as margin, so nothing overlaps at any width. The question, the
chapter line, the count line and the record all sit below the row, so none of them can move it.

## 2. The words

Each is under 40 characters, straight apostrophes, "sprint S" kept whole in a `whitespace-nowrap`
span.

| Hook | Words | Characters | Quill proposed |
|---|---|---|---|
| `a[data-step="start"]` on `/log` | **Rebuild it yourself** | 19 | "Rebuild it yourself from sprint 1" |
| `[data-yard-hint]` | **Hold to flip through the sprints** | 32 | kept |
| `p[data-yard-chapter]` | **Every plank up to sprint S is out too.** | 38 at S = 23, at most 40 for S under 1000 | "Every plank the crew laid by sprint S is gone too." (51) |

- **Start: "Rebuild it yourself".**
  - These are the door's words (my sprint 57 call), so `/log` and Hb's door say the same thing,
    which is Quill's reason for them.
  - "from sprint 1" adds 102 px. In the webfont it drops the hand-off under the link at 1024–1030,
    which moves Every revision 25 px at 1024 × 768. The 1 px sweep from 320 to 1440 found the
    shorter words keep the hand-off beside them at every width from 768, in both faces. Their text
    is at most 136 px wide in the webfont (128 in the fallback), against 187 (168) today.
  - The page the link opens already says sprint 1: "The Theseus after sprint 1".
  - Beside the hand-off the pair reads as one thought: "Rebuild it yourself" and "Watch the crew
    build the next one on Crew".
  - `YARD_WORDS.start` can stay a function of `first` that returns the constant, so Y4 and B5.25
    read it unedited.
- **The hint:** Quill's words. "Flip" is the visitor's word for the flip book, and "hold" is the
  gesture.
- **The chapter line: "Every plank up to sprint 23 is out too."**
  - Quill's version is 51 characters, over the 40 limit.
  - "laid by sprint 23" also reads as "the plank sprint 23 laid", which is one plank.
  - "Up to" is the rule exactly: no Theseus plank numbered 23 or lower. A visitor can check that
    against the drawing's numbers.
  - "Out" is the count line's own verb ("All 22 original planks are out"), so "too" lands: the
    originals went first, and now the crew's own first ship is gone.
  - It holds "sprint S" for Probe's oracle.

## 3. Where the hint and the chapter line sit

**The hint** is a `<p data-yard-hint="" class="record-hint">` in the record, right after
`.record-top`. It is on every step page and not on `/log`.

- **Below 768** it is placed with the row: 4 px under the links' 44 px boxes, end-aligned under
  Next. On the newest step, where Next is absent, it is start-aligned under `← Sprint p`.
- **From 768** it sits in flow at the same place: 4 px under the links in the record's head,
  end-aligned. On the newest step it sits between `← Sprint p` and the hand-off.
- **The 4 px** keep the site's ring (2 px at 2 px) off its ascenders:
  - focused at 390, Next's ring ends at 427.3, where the hint's line starts, and its glyphs start
    about 2.5 px lower;
  - the same 4 px holds at 768, 1024 and 1440, where the ring ends exactly 4 px under the link;
  - I looked at it focused in dark at 390 and in light at 1440 on the newest step. At 0 px the
    ring struck the hint at 768 to 1440.
- **Its line is held in every mode,** and it shows by `visibility`:
  - `visibility: hidden` by default, `visible` under `.log:has(> [data-model][data-yard])`;
  - the space is there at first paint, so showing it moves nothing (CLS 0 measured from load to
    rest + 2 s on `/log/13` in Full at 390, 360, 320 and 1440);
  - it is never `display: none` inside the record, because B5.6 (C5.2) fails any display-none
    element in a record;
  - Probe's `VISIBLE` options (`visibilityProperty`) read it right, but a bare `checkVisibility()`
    would call it shown in Off.
- **In Off and with scripts off** the line is blank air: 28 px between the row and the caption
  below 768, 18 px more in the record's head from 768.
- **In print** it doesn't show.

**The chapter line** is a `<p data-yard-chapter="" class="log-chapter">` in `.log-head`, right after
the count line.

- It is in the question's slot and the question's voice: `--step-lg`, 600, ink, line-height 1.3,
  balanced, 12 px above.
- Each chapter stop has one ink line in that slot. 23 asks the question, and 45 says why the riffle
  stopped there.
- Below 768 it sits below the row, so it never moves the press.

## The recipe for Forge

**`components/log-record.tsx`.** Right after the `.record-top` div and before the hand-off's `p`,
on every record:

```tsx
<p data-yard-hint="" className="record-hint">
  {"Hold to flip through the sprints"}
</p>
```

It holds no link and no `tabIndex`. Its words are one string, so the server's HTML holds them
whole.

**`components/log.tsx`:**

- **Start:** the link's words become `{"Rebuild it yourself"}`. Its href, its place and its DOM
  order stay as they are.
- **The chapter line:** after `p[data-ghost-count]` and before the question and `LinesFigure`, when
  the step's k is a chapter (the rule, `merged[k − 23]`; Probe's H4 names
  `lib/count-line.ts`'s `chapterLine`):

  ```tsx
  <p data-yard-chapter="" className="log-chapter">
    {"Every plank up to "}<span className="whitespace-nowrap">{`sprint ${s}`}</span>{" is out too."}
  </p>
  ```

**`app/globals.css`.** With the Log's rules:

```css
/* The 22nd merge's question and every chapter line: one slot, one voice. */
.log-head :is(.log-question, .log-chapter) {
  order: 5;
  margin-top: 12px;
  font-size: var(--step-lg);
  font-weight: 600;
  line-height: 1.3;
  text-wrap: balance;
}

/* The hint, under the step links: its line held in every mode, shown only while the yard plays
   them, 4 px under their boxes so a focused link's ring clears its ascenders. Visibility, never
   display: B5.6 (C5.2) holds a record to no display-none element. */
.record-hint {
  margin-top: 4px;
  font-size: var(--step-sm);
  line-height: 14px;
  color: var(--muted);
  text-align: end;
  text-wrap: balance;
  visibility: hidden;
}

.log:has(> [data-model][data-yard]) .record-hint {
  visibility: visible;
}

@media print {
  .record-hint {
    display: none;
  }
}

/* Below 768 the step row stands under the ghost, the same on every step (.crew/sprint/59/
   placement.md): absolutely in main, its offset the stack above it, every term fixed on a step
   page: the h1 (20 + 0.95 of --step-2xl), the control row (12 + 44), the Theseus (16 + its
   drawing), its one-line caption (6 + 1.45 of --step-base), the ghost (14 + its drawing). Each
   drawing is 126/632 of the column, and a margin's percentage is main's padding box's width, so
   the column is 100% - 32px. Change a term above and this changes with it (H1's sweep). */
@media screen and (width < 48rem) {
  .log-open {
    position: relative;
    --yard-row: calc(
      112px + var(--step-2xl) * 0.95 + var(--step-base) * 1.45 +
        (100% - 32px) * 252 / 632
    );
  }

  .log-open .record-steps {
    position: absolute;
    top: 0;
    right: 16px;
    left: 16px;
    z-index: 1;
    margin: var(--yard-row) 0 0;
    justify-content: space-between;
  }

  .log-open .record-steps [data-step="next"] {
    margin-left: auto;
  }

  .log-open .record-hint {
    position: absolute;
    top: 0;
    right: 16px;
    left: 16px;
    margin: calc(var(--yard-row) + 48px) 0 0;
  }

  .log-open .record:not(:has([data-step="next"])) .record-hint {
    text-align: start;
  }

  /* The row (44), 4, the hint's line (14), 10. */
  .log-open [data-ghost-caption] {
    margin-top: 72px;
  }
}
```

- **Remove the rules it replaces:**
  - `.log-head .log-question`'s own rule;
  - the `@media (width < 22.5rem)` block for `.record-top`, `.record-steps` and
    `[data-step="next"]`. Below 768 the steps are placed absolutely, and `.record-top` holds `Rev n`
    alone.
- **Update comments:** the Log's opening comment and the order comment above `.log-theseus`, which
  list the column.
- **Keep it in step:** the 112 px repeats six margins above it. Keep each in its own rule, as
  today, and change the sum with them.

**`lib/model/yard.ts` (should, a few bytes in the chunk, reported under H7).** The chapter line is
a payoff like the question, so let it land with the plank:

```ts
const QUESTION = "[data-yard-question], [data-yard-chapter]";
```

The two never share a step (k = 22 against k ≥ 44), so `querySelector` finds the one there is.
`words()` hides it with the header's swap, and `rest()` shows it on landing.

## Kept checks

**None of my placement's rewrites a kept clause.** The links never leave `.record` in the DOM, and
`.log-head`'s next element is still the Foot. These stay green as written:

- Y4, including the record's-head clause, 44 px below 1024 and the walk at 390 × 844;
- Y5, with every link 379.3 at 390 × 844;
- B5.25's slot, Tab order and CLS;
- B5.6's links and C5.2 (visibility, not display);
- B5.3, where the record's h2 starts at 720.3 on `/log/13` and 787.5 on the newest step at
  390 × 844;
- B5.7, with 37.5 px spare;
- Y3, where the chapter line has its own hook and the question is untouched;
- Y16 and Y20 to Y23, since the record is swapped whole and `.record a[data-step]` still matches;
- B5.1's row under the h1;
- B5.9's overflow, targets and Tab order;
- B5.18's canvas on the drawings' union.

The words change three constants Probe already owns (`YARD_WORDS.start`, `.hint`, `.chapter`). The
contract mutant is the proof, as ever.

**For Probe, one guard worth its seconds:** the row's place is a sum, so a later margin above it
would move the ghost and leave the row behind. One scripts-off page, `/log/23`, resized 320 to 767
in 1 px steps:

- `.record-steps`'s top within 0.5 px of `[data-ghost]`'s bottom;
- `[data-yard-hint]`'s bottom at or above `[data-ghost-caption]`'s top.

## Not measured

- **Safari, Firefox and a real phone.** Every number here is Chromium's headless shell. The sum
  uses nothing newer than `calc()` and `:has()`.
- **The build.** This is the prototype on production's DOM, with the chapter line and hint
  injected. The yard.ts selector change isn't tried.
- **Landscape phones,** such as 667 × 375: below 768 the rule applies, but the two drawings alone
  are taller than the window.
- **768 to 1023,** which keeps today's layout: next is at 722.8–766.8 on `/log/13` at 768 × 1024. A
  tablet window shorter than about 770 there would cut it. It is outside H1, and a follow-up if
  Quill wants it.
- **The chapter line at 320 × 568** starts below the fold (582.5). No check asks for it there.

## For the owner (undoable, nothing waits)

On phones the step links now stand under the ghost, outside the record's frame. The record's head
shows `Rev n` alone, and the hint's line is blank air in Off. The PR's retro should say so.
