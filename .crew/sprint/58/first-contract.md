# Ha's contract: the yard plays in a phone's window, and says how (Quill, sprint 58)

**The outcome.** Someone sent `/log/23` opens it on their phone and can press on without scrolling:
the step link is in the first screen of the phone's window, on every step, in every mode. Someone
who finds `/log` reads an invitation to rebuild the ship. On a step where a hold riffles, one line
says so. When the riffle stops at 45, the page says why. Nothing on `/` changes.

It's the first sprint of `plan.md`, from the demo's findings (`close.md`). Size **M**. The checks
are **H1 to H7**. No owner path, no `content/`, no owner answer needed.

## The page today (production, 2026-11-09; `close.md`)

- **The step link a visitor presses** (CSS px, top to bottom), the same with scripts on and off:

  | Window | `/log/1`, `/log/13` | `/log/23` | `/log/45` | newest (previous) |
  |---|---|---|---|---|
  | 390 × 844 | 639–683 | 698–742 | 662–706 | 662–706 |
  | 390 × 664 | 639–683 cut | 698–742 below | 662–706 cut | 662–706 cut |
  | 360 × 640 | 650–694 below | 709–753 below | 673–717 below | 673–717 below |
  | 320 × 568 | 677–721 below | 736–780 below | 700–744 below | 700–744 below |

  `/log`'s Start again is in view at all four (519–563 at 390 × 664).
- **Above the record on `/log/23` at 390 × 664:**
  - the bar 0–52, the h1 72–121, and the foot row (Read as page, the control) 133–177;
  - the Theseus 193–265, its caption 271–294, and the ghost 308–379;
  - the ghost's caption 393–440 and the count line 448–494;
  - the question 506–553;
  - the lines figure 569–657;
  - the record from 681, with the step row (`.record-steps`, in `.record-top`) at 698–742 and its
    h2 at 746.

  At 320 × 568 the question ends at 548 and the step row is at 736–780.
- **From 1024 up** the header and the record are one column beside the drawings. At 1440 × 900, on
  `/log`, `/log/13` and `/log/23`, the Theseus is 40,104 900 × 179 and the ghost 40,338 900 × 179.
  `/log/13`'s step row is at y 467 and `/log/23`'s at 534.
- **The hooks** (`lib/model/yard.ts`):
  - while the model plays the step links, `[data-model]` carries `data-yard`, which CSS already
    reads (`.log:has(> [data-model][data-yard])`, `app/globals.css`);
  - a press swaps `.log-head`, the ghost's caption, the count line, `.record` and the drawings from
    the next step's page (`REGIONS`).
- **The riffle's chapters** are every 22nd merge (`yard.ts`, `isStop`): sprint 23 (k = 22), 45
  (k = 44), and every 22nd merge after, plus the first and newest steps.

## Iris's calls come first (before Probe's mutant)

1. **Placement in phone windows.** Iris picks where the step row sits below 768 so that H1 holds,
   and writes it to `.crew/sprint/59/placement.md` (or the sprint's own number). She should weigh:
   - (a) the step row joins the h1's row. "Log" leaves 304 px free at 390, 274 at 360 and 234 at
     320 (`/log/13`), against the step row's 231 px there, plus its 16 px gap. That's two-digit
     steps; later steps are wider. So at 320 it needs two rows or shorter words;
   - (b) the row moves to right under the drawings;
   - (c) the lines figure follows the record on step pages below 768. That's 88 px at 390, and on
     its own it doesn't reach 360 × 640 or 320 × 568 on 23;
   - (d) a step bar fixed at the window's foot below 768, within thumb reach, which needs scroll
     padding so it never covers the question or the record.

   A flip book wants the row in the same place on every step (`.crew/sprint/53/placement.md`).
   Today the question pushes it down 59 px at 23.
2. **The words**, each at most 40 characters, in plain words:
   - **Start again** on `/log`. Quill proposes **"Rebuild it yourself from sprint 1"**, so `/log`
     and Hb's door say the same thing. "Start again" assumes a start the visitor never made.
   - **The hint.** Quill proposes **"Hold to flip through the sprints"**. "Riffle" is the crew's
     word, and the flip book is the visitor's.
   - **The chapter line.** The rule is fixed below; its words are Iris's within it. Quill proposes
     **"Every plank the crew laid by sprint S is gone too."**
3. **Where the hint and the chapter line sit.** The chapter line goes in `.log-head`, after the
   count line, as the question does, so a press swaps it with no new code. The hint goes wherever
   Iris places it, within H1, H3 and B5.7's room (below).

## The rules (briefed word for word to Forge and Probe)

- **The chapter step.** For a step whose merge count k is a multiple of 22 with k ≥ 44 (today only
  `/log/45`, k = 44), the page has one `p[data-yard-chapter]` whose text holds "sprint S", where
  S = the (k − 22)th merged sprint (`merged[k − 23]`, oldest first; at k = 44, S = 23).
  - It's on no other step, and not on `/log`, as Y3 keeps the question off `/log`.
  - The truth it states, which Probe's oracle checks: on that step no Theseus plank has a
    `data-sprint` of S or lower, and on the step before exactly one does.
  - Scripts on and off. Inside `.log-head`, after the count line and before the record.
- **The hint.** One `[data-yard-hint]`, on every step page `/log/n` and not on `/log`. It's shown
  (`checkVisibility()`) only while `.log:has(> [data-model][data-yard])` matches, which is Full and
  Calm with the yard playing. It's hidden in Off stored, with WebGL refused, under Save-Data, and
  with scripts off.
  - CSS keys it, with no script. Its showing moves nothing: its space is held at first paint, or it
    takes space nothing else needs.
  - It holds no link and no focusable element.

## Checks (Probe, red on main first; a new `e2e/log-hand.spec.ts`)

- **H1 The press in a phone's window.**
  - **Where:** at 390 × 664, 360 × 640 and 320 × 568, in light (and dark at 390 × 664). With scripts
    off, and in Full once `[data-model]` has `data-yard`. On `/log/1`, `/log/13`, the question's step,
    the first chapter step (`/log/45`) and the newest step.
  - **The link:** the step link to press (next; previous on the newest) is wholly in the first
    screen, top at or below the bar's bottom and bottom at or above `innerHeight`, with scroll 0.
  - **What stays in view:** the tops of both drawings start in the first screen (Y5's clause, at
    these windows). On the question's step the question is wholly in it at 390 × 664 and 360 × 640,
    and starts in it at 320 × 568. On `/log`, Start again is wholly in it.
  - **The walk:** at 390 × 664 with scripts off, from `/log/13`, each of the 10 presses to 23 finds
    next wholly in view at scroll 0 before it's pressed. In Full, from `/log/13`, after each of the
    10 presses next is still wholly in view, with no scroll in between.
- **H2 The invitation.** `/log`'s `a[data-step="start"]` reads Iris's words: the same link, target
  (`/log/<first merged>`), place and Tab order as today. The words live in `YARD_WORDS.start`
  (`e2e/log.ts`), which Y4 and B5.25 read, so Probe rewrites the constant and both keep their
  assertions.
- **H3 The hint says itself, only where true.** On `/log/13` and the newest step:
  - In Full and in Calm (stored, and under reduced motion with no mode stored), once `data-yard` is
    set, `[data-yard-hint]` is shown with Iris's words, inside the first screen at 390 × 664 and
    1440 × 900.
  - With Off stored, WebGL refused, or scripts off, it's not shown. On `/log` it isn't in the HTML.
  - CLS is 0 from load to rest + 2 s on `/log/13` in Full at 320, 390 and 1440. Y8 and B5.25 keep
    their own CLS reads.
- **H4 The chapter says why it stopped.**
  - The chapter rule above holds on every step, in the server HTML and with scripts off.
  - A press from 44 to 45 in Full shows the line, and 45 to 46 removes it (Y16's way: the words
    equal the server's for that step).
  - A held Next from 30 stops at 45 with the line shown.
  - The sentence is swept over k = 44, 66, 88 and 110 on a synthetic merged list (memory: sprint
    52, Y3's sweep): never "sprint undefined", never a figure the rule didn't give.
- **H5 What stays where it is.**
  - From 1024 up, the drawings' boxes on `/log`, `/log/13`, `/log/23` and `/log/45` equal
    production's within 1 px at 1024 × 768 and 1440 × 900. Probe reads 1024's at the mutant; 1440's
    are above.
  - At 390 × 844 every step link still sits where Y5 wants it.
  - Nothing on `/` changes: every check that loads `/` runs unedited.
- **H6 Accessible, at the new windows.**
  - Y7's invariants (axe, tokens, no overflow, 44 px targets below 1024, nothing animating with
    WebGL refused) on `/log/45` and the newest step at 390 × 664 and 320 × 568, in their own loop.
  - Tab follows what's seen: from the motion control, the step links come before anything in the
    record below them.
  - The hint and the chapter line are text in a token colour, readable in forced colours, and
    neither is focusable.
- **H7 Budgets.**
  - The loader adds 0 B: B2.10 and B5.10 unedited, with the bytes reported.
  - The 3D chunk stays within B3.6 and B5.23; its delta is reported, and 0 B is expected.
  - LCP is text (Y8 unedited).
  - Shard 2's time is read before the review label (sprint 56's 18 min 56 s against 20).

## Kept checks this touches

**The viewports they pin.** Everything is on the Log; `/` isn't touched.

| Check | Viewports |
|---|---|
| Y5, B5.3, B5.7, B5.10 | 390 × 844 and 1440 × 900 |
| B5.1, B5.25, Y8's CLS | 320, 390, 768, 1024 and 1440 (Y8: 320, 390, 1440) |
| B5.18's fit, Y12 | 320 × 568, 768 × 1024, 1024 × 768, plus the two defaults |
| Y7, B5.9 C8.1 | overflow from 320 to 1440 |
| B5.6 (C4.3) | 320, 390 and 1440 |

**What each pins, and the expected outcome:**

- **Y4** (`log-yard.spec.ts:514`): "in each record's head, before its h2", the start words, 44 px
  below 1024, and the walk at 390 × 844.
  - Expected: the words through `YARD_WORDS.start` (H2).
  - If Iris's placement takes the step row out of `.record` in the DOM, the "record's head" clause
    is a named rewrite, with the same strength, for Lens.
- **B5.25** (`log-control.spec.ts:157`): below 768 the control sits "in main right after
  `.log-head` and before the record and `[data-ghost]`", and the Tab order runs the bar, Full,
  Calm, Off, then the record.
  - Expected: unedited if the row moves only within the record or after the control.
  - If it moves above the control, it's a named rewrite of the order, with no stop dropped.
- **B5.6** (`log-record.spec.ts:453`), each record's previous and next follow the data rules: the
  same as Y4's DOM clause.
  - (C5.3)'s "no link but …" stays unedited: the hint and the chapter line hold no link.
- **B5.7** (`log-record.spec.ts:562`): the tenth row's record opens with its h2 wholly in view at
  390 × 844.
  - Today that's `/log/48`, with its h2 at 710–805: **39 px spare**.
  - Anything Ha adds above a record's h2 at 390 × 844 fits in that. The tenth row moves with every
    merge, so Probe reads it at the mutant.
- **Y3** (`log-yard.spec.ts:393`): the question after the count line and before the record. It's
  touched if the step row lands between them in `.log-head`; the chapter line is its own hook.
- **Y16 and Y20 to Y23** (`log-press.spec.ts`, `log-riffle.spec.ts`): the press's words and the
  riffle's stops.
  - Expected: unedited, since `.log-head` is already swapped and the links are found by
    `a[data-step]`.
  - If the step row leaves `.record`, `lib/model/yard.ts`'s selectors follow it (Forge, or Pixel),
    and the chunk's delta is reported under H7.
- **Y5, B5.3, B5.18, Y12, Y8, Y7**: unedited, and they must stay green.

**The contract mutant.** Before the build, Probe runs the unedited Log suite on a scratch build of
a bare version of Iris's placement, with the three lines in. That's every `e2e/log*.spec.ts`, plus
keyboard, keel-ways, one-site, plain-words, read, invariants, not-found and crew-bar. Every red is
named in `decisions.md` with its rewrite or retirement, for Lens to accept (`.crew/STATE.md`,
"Contracts").

## Budgets

`plan.md`'s table: 0 B of loader, the chunk within its limits (0 B expected), CLS 0, LCP text, ≤ 8
draws, 0 frames at rest, and each CI shard under 20 minutes.

## Out of scope

- `/` and the door (Hb), and the legend.
- Cards, the riffle's pace and stops, and the 3D's look.
- The fleet, bounces and sound.
- The display face's `display: optional`.
- Owner paths and `content/`.
