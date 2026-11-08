# Sprint 56: the riffle, my calls (Iris)

These calls are for Pixel (sections 1 and 2) and Forge (3 to 5). I read the contract, the decisions,
my direction (`.crew/sprint/52/direction-iris.md`, "The loop" 3 and 6, "Keyboard and touch") and
Yc's press as built (`lib/model/press.ts`, `mount.ts`, `yard.ts`). I measured on production with no
script at 320, 390, 768, 1024 and 1440, and prototyped the hand-off there. Scripts and shots are in
my scratchpad (`iris56/`).

**In short.**
- The gap shrinks by a constant ratio, from 400 ms to 80 ms by the sixth gap.
- A paced step plays Yc's press on a faster clock while there's time to follow it. Below 150 ms it
  plays only the knock, and holds still for the rest of the step. Each step reads as a page, not a
  smear.
- The step that lands on a chapter plays Yc's whole press, at full length.
- The hand-off joins the page's step links: beside Start again on `/log`, and on its own row under
  ← Sprint n in the newest record.
- Decisions 3 and 4 stand, with five additions in section 5.

## 1. The pace (Full)

The gap between the starts of step k and step k + 1 is

    gap(k) = max(80, round(400 × 0.725^(k − 1)))   →   400, 290, 210, 152, 111, 80, 80, …

It reaches 80 on the sixth gap, 1,163 ms into the hold, and then holds at 80. Step 1 is the press
itself.

- **Why a ratio.** A ratio speeds the riffle up by the same felt amount every step, since tempo is
  heard in ratios. A linear ease in ms creeps at the start and lurches at the end. It's also the
  shape of a thumb letting pages go.
- **A typical riffle, 13 to 23 in Full at 1440.**

  | Step | Starts at (ms) | How it plays |
  |---|---|---|
  | 14 | 0 | The press |
  | 15 | 400 | Flies |
  | 16 | 690 | Flies |
  | 17 | 900 | Flies |
  | 18 | 1,052 | The knock alone |
  | 19 to 22 | 1,163, then every 80 | The knock alone |
  | 23 | 1,483 | The chapter: the whole press, landing at 2,243 (2,163 below 768) |

  The whole replay, 1 to the newest, is three holds and about 8 s. That's a riffle worth
  recording.
- **Calm, and reduced motion with no mode stored:** 400 ms flat, with no ease.
- **Keys use the controller's clock, never the OS's auto-repeat.** Repeated keydowns are ignored:
  repeat delays run from 250 to 600 ms and differ by OS.

## 2. Inside a step: Full's plank

One rule throughout: **every frame of a riffle is a frame of Yc's press**, as a step back already
is. The path never changes, only the clock. When there's no time to follow the path, a step keeps
only its last beat.

| The step's pace | What plays |
|---|---|
| No pace (the first press; the step onto a chapter) | Yc's press, whole: 760 / 680 / 480 ms |
| 150 ms or more (290, 210, 152) | **Flies:** Yc's press, every beat scaled to fit in 80% of the pace, then still |
| Under 150 ms (111, 80) | **The knock alone:** a cut, then a 32 ms knock, then still |

- **Flies.** Every beat is scaled to 80% of the pace: lift, carry, arc, sway, roll, the morph to
  vellum, the far side's fade and the knock. At 290 the flight is 232 ms; at 152 it's 122 ms.
  - The last 20% of the pace, at least two frames, holds the landed step still. The eye needs a
    clean frame to read each page, so never stretch the motion over the whole gap.
  - Numbers and marks land on the knock frame, as in Yc.
- **The knock alone.** Under 150 ms, a carry would cross 234 px in about three frames: a smear, not
  a page.
  - **Frame 1** is Yc's knock beat. On steps 1 to 23, the original is already seated in the ghost
    (Yc's `down`, near and far). The new card plank stands L proud of its seat at α 1, with no
    60 ms fade-in.
  - It **drives home over 32 ms** on the knock's cubic ease-in and stops dead. The seat's numbers
    land on that frame.
  - Then it **holds still** to the next step: 48 ms of a clean frame at 80, and 79 ms at 111.
  - On steps 24 to 51 the leaving card plank is simply gone on frame 1. The knock is all that
    shows.
  - The knock gives the riffle its tick, the page under the thumb: L is 14 px at 1440, and at 390
    it's a 6 px twitch, which is enough.
- **The first plank hurries; nothing ever teleports.** The hold is only known at 400 ms. By then
  the first press's plank is mid-carry on steps 1 to 23 (or 60 ms into the knock on 24 to 51).
  - Don't land it in one frame. A jump from mid-air at the moment the riffle begins would be its
    first impression.
  - Play its remaining beat in at most 80 ms (Pixel's call how), then fit step 2's flight into the
    80% of its pace that's left.
  - One plank moves at a time, as in Yc.
- **A release, keyup or Escape lands the moving plank at once:** Yc's `land()`, one knock frame,
  then 0 frames. This holds for the chapter step too, as Y23 reads. Any input lands a moving plank
  at once; that's the yard's grammar since sprint 52.
- **Calm.** Each step is Calm's 240 ms linear fade in place, then 160 ms still. The step onto a
  chapter is the same fade.
- **Numbers.** The numbers on the hulls are the riffle's page numbers, filling the ghost, so let
  them ride: each seat's number lands with its plank on the knock frame.
  - If a step's drawing hasn't arrived, its changed seats show no number. They never show a stale
    one: on steps 24 to 51 the old drawing would put 19 on the seat that 41 now holds.
- **Marks and copper.** The record's ink marks leave at the first press's start, as in Yc, and come
  back with the record at the stop. The pencil plank's copper comes back only on the knock of a
  step that lands on today.
- **Flashes.** A step changes one seat on each ship, roughly 245 × 15 px at 1440 (my estimate, not
  measured), and each change runs
  one way (grey to card), never back. That's far under WCAG 2.3.1's area threshold of 21,824 px² at
  12.5 Hz, so there's no flash risk.

## 3. The stops

**The step onto a chapter plays Yc's whole press:** `go(from, to)` with no pace. It starts on the
curve's schedule, so no gap ever grows (Y20). It runs at full length: 760 ms from 768 px, 680 below,
and 480 on steps 24 to 51.

- After a blur of pages, the last plank you can actually follow tells you the stop is meant. A
  hard stop at 80 ms reads as a wall, or as a fault.
- Easing down into the chapter would break "gaps never grow". It would also tell the visitor the
  stop is coming.
- "The stop" in Y23 is that press's landing: 0 frames after it.

What each stop shows:

- **At 23 (forward from below, or backward from 24 to 45).** The last original arcs whole into the
  ghost, and Hobbes's question lands with its knock. This is Yc's press as built: the question's
  space is taken at the step's start, hidden, and it shows on the knock.
- **At 45.** The full press is the whole beat; the second ghost is Y3's. The count line at 45 is
  its own small payoff: "Since then the crew has replaced 22 planks of its own." That's as many as
  the originals. Nothing to add.
- **At the newest.** The crew plank lifts and fades in place for 480 ms. The new plank knocks in,
  the pencil plank and its copper come back if the crew is live, and the hand-off is there with the
  record.
- **At the first (backward).** The reversed press. Start again stays a `/log` link.
- **A hold whose first press lands on a chapter never riffles.** Example: a hold on 22's Next.
  That press plays whole, and the 400 ms mark starts nothing.
- **Holding past a stop does nothing.** Going on takes a new press, and that press's first step
  plays at once, as any press does.

**The words during a riffle.** The visitor can't read them at 12.5 Hz, so only the frame's own
caption follows the hulls.

- **The Theseus caption follows** ("The Theseus after sprint n"), set on each knock frame from the
  step's page once it has come. It's one line held whole, so it can't shift anything. It's the
  flip book's page number.
- **The count line may follow too.** I measured `[data-ghost-count]`, together with the question
  above the lines rule, on every step at 320, 390, 768, 1024 and 1440. It holds one height from 1
  to 22 and another from 24 to 55 at every width; only 23 differs, by +59 px at 390 and +67 at
  1440. So within a riffle it never moves the page.
- **The record holds until the stop or release, then changes once.** Swapping it every 80 ms would
  do three kinds of harm:
  - It would strobe a text block.
  - It would replace the held link under the pointer twelve times a second.
  - It would move focus each time, so a screen reader would read out every step. Contract 7 has
    the live region speak once; focus moves would speak on every step.
- **The URL, title and live region change at the stop or release, never per step.** Safari throws
  after 100 `replaceState` calls in 30 s, and the replay there and back is over 100 steps.

**Measured, for Forge and Probe.** A held press's layout shifts are safe in Chromium only while
the controller listens for `pointerdown`.
- With a `pointerdown` listener on the link, Chromium buffers shifts made while a mouse or a touch
  is held. It reports them at the release, credited to the input (`hadRecentInput: true`).
- Without that listener, a shift 200 ms or 1.2 s into a touch hold counts against CLS.
- After keyup, a shift counts unless an auto-repeat keydown came within 500 ms.
- So Y23's CLS read must collect entries **after** the release, since that's when they arrive.

## 4. The hand-off: it joins the page's step links

The words are "Watch the crew build the next one on Crew", to `/crew`. It's a plain link: ink, an
underline at 1 px with a 6 px offset, 2 px on hover, 600 weight, the site's ring. No arrow, since
it leaves the yard rather than stepping it. Never copper.

- **On `/log`: in `.log-start`, after Start again.**
  - From 768 the two links share one row, 32 px apart (`flex-wrap: wrap; column-gap: 32px`). That
    puts the two ways out of today side by side: back to the first plank, or on to the live crew.
    At 1440 the hand-off sits at x 259 to 580 under the ghost and adds no height.
  - Below that each link takes its own 44 px row, Start again first. That adds 44 px at 390.
  - At 320 the hand-off wraps to two lines (288 px). Let it wrap with `text-wrap: balance`, not
    `.log-start a`'s `nowrap`, since nowrap would overflow there.
- **On the newest `/log/n`: in the record, on its own row right under the head row, end-aligned
  under ← Sprint n.**
  - Prototyped on production: one line at every width from 320 to 1440, even in 320's 254 px
    column.
  - Use the step links' type: `--step-sm`, 600, 44 px tall below 1024 and 24 from it.
  - Make it a `<p>` after `.record-top`, so the link's box is its words' width. My first try put it
    in the steps' flex row with `flex-basis: 100%`. That squeezed "Rev 55" onto two lines at 390,
    and the link's box ran across the empty left of the row.
  - It reads as the steps' column: past the last step, the way on is the live crew.
- **Why not Next's slot:** it doesn't fit. Rev, ← Sprint 54 and the hand-off need about 400 px,
  and the head row has 394 at 1440 and 324 at 390.
  - It would also put a link out of the yard under a finger still tapping Next. One row lower, a
    rapid tapper lands on empty space or on ← Sprint 54.
- **Why not after the count line, where Hobbes's question sits:** the copy would sing there ("…32
  planks of its own. / Watch the crew build the next one"). But it would grow the count block at
  the newest step, the stop that every forward riffle from 45 ends on. That moves the record under
  the held pointer.
- **Why not the record's foot:** it's below the fold at both sizes (y 1186 at 1440, y 1329 at
  390), so it would be out of sight at the moment of arrival.
- **Focus never lands on the hand-off from a press, a riffle, Home or End.** At the newest step,
  focus goes to ← Sprint n, as Yc does. This matters for a held Enter: an auto-repeat keydown on a
  focused link out would leave the page.

## 5. Decisions 3 and 4: I agree with both; five additions

- **Decision 3, Home and End only on a step link: right.** The revision table is the page's
  longest part, and a keyboard reader needs Home and End there. Home and End act on the thing that
  steps, which is predictable.
  - The jump is Yc's cut in every mode. Animating 30 planks would read as a riffle that ignored
    its chapters.
  - Focus then goes to the step link that still exists at that end: Next at the first step, ←
    Sprint n at the newest.
- **Decision 4, backward stops mirror forward: right.** Backward, 23 is the ghost whole and the
  Theseus without an original, so the question returns. Two clarifications:
  - "Reaching" means landing on the chapter. A hold that starts on 23 and goes back runs to the
    first step.
  - A hold whose first press lands on a chapter never riffles (section 3).
- **Addition 1 (must, Forge): on touch, never step at `pointerdown`.** A scroll that starts on a
  step link would step the yard.
  - At 390 the record's head sits at y 639 to 662, mid-screen, right where a thumb starts a
    scroll.
  - On touch and pen, a tap steps at its release, as Yc's click does today. A hold steps once the
    finger has stayed still for 400 ms with no `pointercancel`, and the riffle runs from there:
    step 2 comes 400 ms later.
  - Mouse and keys step at once, as the contract says.
  - So under touch, Y20's "steps once at once" reads "at the tap's release, or at 400 ms held".
    Atlas to accept.
- **Addition 2 (must, Forge): more things end a riffle.** Beyond release, keyup and Escape:
  `pointercancel`, the pointer leaving the held link (a mouse dragged off it, as a pressed button
  does), the window's `blur`, and `visibilitychange` to hidden.
  - Without `blur`, Alt-Tab during a held → never delivers the keyup, and the riffle runs to its
    chapter unattended.
- **Addition 3 (must, Forge): a held Enter never repeats.** Ignore `event.repeat` Enter keydowns
  on step links. The contract lists Enter only as a quick press; repeats would step at the OS rate
  with no stops.
- **Addition 4 (should, Forge): show which link is being held.** While a riffle runs, the held
  step link takes its hover state (the 2 px underline). Hold → and Next takes it too, which teaches
  the key map. Touch has no hover otherwise.
- **Addition 5 (should, Forge): no text selection or drag image from a hold.** Use
  `user-select: none` and `-webkit-touch-callout: none` on the step links while the model plays
  them, and cancel `dragstart`. A mouse hold that drifts would otherwise pick up the link's drag
  image.
