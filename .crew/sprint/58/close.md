# The yard's demo (Quill, sprint 58)

**Verdict: the yard works, and it tells the truth at every step I read. But a visitor has to find
it, and on a phone they can't press it.** Every step is a page, the press and the hold play as
built in Full, Calm and Off, the riffle stops at 23, 45 and the newest step, and the question at 23
lands, on the page and on its card. Nothing on `/`'s first screen changed. Four things stop it from
being the toy the owner asked for (sprint 52's goal: "something genuinely cool visitors want to
play with and share"):

1. **On a phone the press is out of reach.** In Safari's 390 × 664 window, the step link is cut by
   the fold on every step page, and on 23 it is wholly below it. In a 360 × 640 or 320 × 568
   window it is below the fold on every step. This holds with scripts on and off. The shared card
   is the yard's way in, and it is mostly opened on a phone. That visitor lands on the question with
   nothing to press.
2. **`/log` doesn't say it can be played.** Its only invitation is "Start again from sprint 1",
   which assumes the visitor has already started.
3. **Nothing says a step can be held,** so the riffle, the moment worth recording, is found only
   by accident. This is Yd's open item, "a hint that a step can be held (Quill's copy)".
4. **The riffle stops at 45 and says nothing about why.** The count line reads "… replaced 22
   planks of its own", and the visitor is left to work out what that means.

None of these makes the site say something false. The first one hides the yard's one control from
its likeliest visitor. That is the next milestone's first sprint (`plan.md`).

## How I measured

- **Where:** https://theseus-portfolio.vercel.app, 2026-11-09 from about 00:10 to 01:00 UTC.
  Production's newest step was 57, and its lines figure names 2993815. Sprint 58 was live: `/`'s
  pencil row read "The yard's demo, and the next milestone's plan · drawing now".
  https://portfolio.ruslanshulga.com answered 403 to CONNECT through this sandbox's proxy, so I
  didn't read it.
- **With what:** my own scripts in the session's scratchpad, run on Playwright 1.64.0's Chromium
  headless shell (1248) with SwiftShader WebGL at DPR 1:
  - `survey.js`: 9 pages at 1440 × 900 and 390 × 844, reading words and boxes;
  - `play.js`: a press, ← and →, and Back in Full, Calm, reduced motion and Off; holds from 13, 30
    and 50 in Full and from 13 in Calm; End and Home, and a held →;
  - `walk.js`: Y4's walk with scripts off, the six cards, a tap at 390, and 320 × 568;
  - `fold.js`: the step links against six phone windows, scripts on and off;
  - `stack.js`: each block's box on phone step pages;
  - `face.js`: which face painted, read through CDP's `CSS.getPlatformFontsForNode`;
  - `ghost1.js`: step 1's ghost in each mode.

  The screenshots are in the scratchpad's `shots/`, not in git (`.crew/screenshots/` is ignored).
- **The yard's own specs, unedited, against production:**
  `PLAYWRIGHT_BASE_URL=https://theseus-portfolio.vercel.app pnpm exec playwright test
  e2e/log-yard.spec.ts e2e/log-cards.spec.ts e2e/log-press.spec.ts e2e/log-riffle.spec.ts
  --workers=2`. The result is below, under "Y1 to Y24".

## The plan's demo questions

| The plan asks (`.crew/sprint/52/plan.md`, "The demo") | What production showed | Holds? |
|---|---|---|
| Can they tell in five seconds on `/log` that the ship can be rebuilt? | At 1440 × 900 the first screen holds both ships, "Log", the ghost's caption, the count line, the lines figure, and two links under the ghost: "Start again from sprint 1" (y 533) and "Watch the crew build the next one on Crew". Nothing on it says the visitor can rebuild the ship. "Start again" reads as a reset of something already playing. On a step page it's clear: "Seat sprint 2's plank →" is a verb with an object. | **No** |
| Do they reach 23? | With scripts off at 390 × 844: Start again, then 21 presses of next (the path runs 15 → 17), lands on `/log/23` with the question; Back returns to `/log/22`. Holding Next in Full from 13 reaches 23 in 3.2 s, and in Calm in 4.2 s. A held → from step 1 stops at 23. But no visitor is told they can hold, and without the hold it takes 21 presses. | Yes, for one who knows to hold |
| Does the question land? | Yes. "The ghost hull is whole again. Which one is the Theseus?" sits in the display weight beside two drawings whose plank numbers now match seat for seat. It is wholly in the first screen at 1440 × 900, at 390 × 844 (506–553), at 390 × 664 and at 320 × 568 (bottom 548). | **Yes**, the best moment on the site for the second reader |
| Does the card make someone want to open it? | `/log/23`'s card (1200 × 630, 78,010 B) leads with "Which one is the Theseus?" in the display face, both ships, "Sprint 23 · 22 Oct 2026", and the owner's name and role in the foot. Other steps lead with their sprint's goal, such as 45's "Fit the name, facts and contact links into a tablet's first window", which is a record and not a hook. That's fine, since only 23 is the one to send. | Yes for 23 |

## Y1 to Y24, on production

Read by my scripts. The spec run is in its own section below.

- **Y1 to Y3, the drawings and words:** the count line matches the rule on every step I read:
  - 1: "1 of 22 original planks is out. The gaps are the 21 still sailing.";
  - 13: "13 of 22 … the 9 still sailing.";
  - 22: "21 of 22 … The gap is the 1 still sailing.";
  - 23: "All 22 original planks are out: the last went with sprint 23.";
  - 24: "… replaced 1 plank of its own.";
  - 45: "… 22 planks";
  - 57 and `/log`: "… 34 planks".

  Each step's Theseus caption names its sprint, and `/log`'s reads "The Theseus today, after sprint
  57". The question is on 23 alone. In the 45 screenshot, no Theseus plank is numbered 23 or lower.
- **Y4 and Y5, the links and the first screen:** previous and next are in the record's head, and
  the newest step has no next. Every step link starts inside 1440 × 900 and 390 × 844, which are
  the sizes Y5 pins. Phone windows are another matter (below).
- **Y6, every mode:** one canvas on every page with scripts on, and no console error from the site
  over 18 loads and every play script. The one `SecurityError` logged came from my own init script
  writing `localStorage` on `about:blank`. In Full, step 1's 3D ghost also shows plank 1's far side through the
  translucent hull (`ghost1-full.png`). Off draws the 2D plank alone. This is the 3D being a
  hull, not a defect.
- **Y9 to Y11, the cards:** every card I fetched answered 200 as `image/png`: `/`, `/log`, 1, 23,
  45 and 57. `/log`'s bytes equal `/`'s (79,054 B), as Yb planned. 57's alt reads "Sprint 57:
  Measured …" with no date, because its merge record is written by this run and isn't on main yet.
  The newest step is always undated until the next sprint merges (memory: sprint 29).
- **Y12 to Y18, the press:**
  - Full: a press from 22 replaces the URL, and `history.length` stays 2. The live region names
    "Revision 23: …", and the question appears. ← and → step. In Full, Back leaves the yard
    altogether, since history never grew (Y16 as designed).
  - Calm and reduced motion: `data-state` stays `settled`, so the step fades with no flight.
  - Off: a press is a navigation (`history.length` 2 → 3), ← and → do nothing, and Back returns
    to 22.
  - The press keeps the display face: warm, 3 of 3 runs painted Sofia Sans Extra Condensed before
    and after.
- **Y20 to Y24, the riffle:**
  - Held Next in Full: from 13 it stopped at 23, from 30 at 45, and from 50 at 57, each while still
    held. The hand-off link was there at 57.
  - From 13 in Full, the Theseus caption changed at 0.88 s (14, once the first press's flight
    landed), then every 188 to 318 ms, and 625 ms later into 23. The step onto a chapter plays the
    whole press, by Iris's call. In Calm the caption changed every 379 to 538 ms. These times are
    when the words changed, polled every 20 ms or so in real time, not when steps started. Y20
    checks the pace itself on `page.clock`.
  - End on a focused step link went to 57 and Home to 1, each with the URL replaced.

### The spec run

The four yard specs, unedited, against production with 2 workers: **37 passed and 1 failed, in
8.5 minutes.** They cover Y1 to Y8, Y9 to Y11, Y12 to Y19 and Y20 to Y24.

- **The one red is Y10 on `/log/57`.** Its alt reads "Sprint 57: Measured …", and the oracle wants
  "Sprint 57 · 8 Nov 2026: …".
- **The oracle reads this branch,** which carries sprint 57's merge record (d989a0c, written by
  this run's merge-record step). Production was built before that record existed. So it's the
  newest-step gap noted under Y9 to Y11, not a defect, and it closes when #124 merges.
- **Y24's INP readout** (reported, not gated), at 4x CPU on SwiftShader, 1440 × 900 in Full:
  - INP was 456 ms over 6 interactions, each between 192 and 456 ms;
  - a 3 s hold of Next made 8 steps, and a 2 s hold of → made 7.

  This is under Yd's 712 to 1,344 ms, but it's a floor, not a GPU's number.
- **The "[failed fetch] requests for /log/14 aborted: 2" line** is the harness's own note about
  aborted prefetches, not a failure.

## The phone windows (the defect)

`fold.js`: the step link a visitor presses (next, or previous on the newest step, or Start again on
`/log`), and its top and bottom in CSS px. These are the same with scripts on and off, since nothing
script-driven sits above it.

| Window | `/log` Start again | `/log/1`, `/log/13` next | `/log/23` next | `/log/45` next | `/log/57` previous |
|---|---|---|---|---|---|
| 390 × 844 (Y5's) | 519–563 in | 639–683 in | 698–742 in | 662–706 in | 662–706 in |
| 412 × 783 | 505–549 in | 648–692 in | 684–728 in | 648–692 in | 648–692 in |
| **390 × 664 (Safari, iPhone)** | 519–563 in | **639–683 cut** | **698–742 below** | **662–706 cut** | **662–706 cut** |
| **360 × 640** | 530–574 in | **650–694 below** | **709–753 below** | **673–717 below** | **673–717 below** |
| **320 × 568** | 515–559 in | **677–721 below** | **736–780 below** | **700–744 below** | **700–744 below** |
| 375 × 553 | 536–580 cut | 656–700 below | 715–759 below | 679–723 below | 679–723 below |

**Why** (`stack.js`, `/log/23` at 390 × 664). Everything stacks above the record:

- the bar, 0–52;
- the h1, 72–121;
- Read as page and the motion control, 133–177;
- the Theseus, 193–265, and its caption, 271–294;
- the ghost, 308–379;
- the ghost's caption, 393–440;
- the count line, 448–494;
- the question, 506–553;
- the lines figure, 569–657;

and then the record, whose step row is at 698–742. The question still fits (bottom 553 at 390 ×
664, 548 at 320 × 568), so the payoff is seen while the press that leads past it isn't. In Off,
every press is a navigation that returns to the top, so a phone visitor scrolls before every one of
21 presses.

Y5 passes because it pins 390 × 844, a screen, and reads only where the link starts. Memory line 42
names this exact trap for `/`'s first screen.

## The visitor's read

- **The hiring executive on `/`:** nothing changed, as planned. The name, the role, the four
  particulars and the contact links hold at 1440 × 900 (contact at y 848). The revision block's
  newest rows ("Hold a step and riffle through the ships, stopping at sprint 23", "Press a step and
  watch one real plank leave the Theseus for the ghost") advertise the toy in words, but none of
  them leads into it. The way in is "All 56 revisions in the Log" (y 850 at 1440, 1424 at 390) or
  the bar's Log. That's the door's job (Ye), and it waits for room.
- **The second reader on `/log`:** they see a beautiful drawing sheet, two hulls and a table. They
  can tell it's a record, but not that it's a toy. Those who open a step find a clear verb ("Seat
  sprint 14's plank →") and a satisfying press. The flight lands in under a second and the record
  turns with it. Those who reach 23 get the payoff. At 45 the riffle stops for no stated reason.
- **The person a link was sent to:** they get the best card the site has (23's), and on a desktop
  they land on the question with the press beside it. On a phone they land on the question with the
  press below the fold.
- **What would make them leave:** on a phone, nothing to press. On a desktop, "Start again" not
  reading as an invitation. Not the 3D: it was smooth and quiet, with no errors.

## Also seen, not new

- **The display face on a cold first visit.** In 1 of 3 cold contexts (`face.js`), the h1, Every
  revision and the record's h2 painted Liberation Sans. My first, cold load of `/` at 1440 did too
  (`_-1440x900.png`: the name in Liberation Sans Bold). This is `display: optional`, measured in
  sprint 42 and still "for Iris to weigh". Every visitor who opens a shared link arrives cold, so it
  now weighs more. It isn't a press defect: warm contexts painted Sofia Sans before and after a
  press, 3 of 3.
- **The `/log` card is `/`'s,** by design. A visitor who shares `/log` itself sends the owner's
  card, not the yard's.

## Left open, sorted

- **Taken by the next milestone (`plan.md`):**
  - the phone windows;
  - `/log`'s invitation;
  - the hold hint;
  - the words at 45;
  - then the door, with the legend's "Original" item, as one contract (Hb).
- **Not taken, with the reason:**
  - **The fleet at 45** (Iris's slice 3). Three hulls need lower levels, and it serves only those
    who reach 45. The words at 45 give that stop its meaning for nearly nothing. It can come back
    if the owner wants more spectacle at 45.
  - **The record in the motion** (bounces, sprint 16 struck). It publishes `fixRounds`, which is
    written before the merge, and needs a public record of closed sprints that doesn't exist. Each
    is a truth problem before it's a motion.
  - **Sound.** Optional by the brief, and off by default, so few would hear it.
- **Riders still waiting for a sprint on their code** (unchanged from `ROADMAP.md`): Yd's three INP
  cuts, Lens's nit at `yard.ts:526`, the count line into 23 on the knock, the shard split by time
  (the owner's `ci.yml`), and Yb's card nits.

## Not verified

- Safari, Firefox and a real phone. The phone windows above are Chromium at those sizes, not
  Safari's own layout.
- The feel on a GPU: SwiftShader frame times only rank. Y24's 456 ms INP is SwiftShader's number,
  not a GPU's.
- https://portfolio.ruslanshulga.com: 403 from this sandbox.
- Whether visitors play at all. Vercel Web Analytics may show views of `/log/1` to `/log/23`, but a
  press in Full replaces the URL, so it may not count each step. It's for the owner to look at, if
  he wants.
