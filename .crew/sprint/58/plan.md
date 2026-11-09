# The yard in hand (Quill, sprint 58)

## The outcome

A visitor who is sent a step of the yard can press it on their phone, and one who finds the Log can
tell it's there to be played. The step links sit in the first screen of a phone's window. `/log`
invites the visitor to rebuild the ship. A step page says that a step can be held. The riffle's
stop at 45 says why it stopped. Then `/` opens the yard with one plain link ("Rebuild it
yourself"), in room made by dropping a legend item that keys nothing on `/`'s drawing.

The demo found the yard truthful and built, but not yet in a visitor's hand (`close.md`). This
milestone finishes the owner's sprint 52 goal ("something genuinely cool visitors want to play with
and share") without adding a new thing to play.

## Why this, and not the rest

- **It serves the person the yard is for.** The plan has always said the yard is for the second
  reader, who stays and sends the link (`.crew/sprint/52/plan.md`, "The visitor, plainly"). What
  they send lands on a step page, mostly opened on a phone. Today that page shows the question and
  hides the press: 639 to 780 px down against a 664, 640 or 568 px window (`close.md`, the table).
  A toy whose one control is out of reach isn't played.
- **Belief 2 (he can run an AI org).** Every press is one merged sprint and its record. A visitor who
  plays reads the crew's record without being asked to. If they never start, the proof is never
  read.
- **Belief 3 (taste).** A signature toy whose way in is "Start again" and whose best gesture, the
  hold, is a secret reads as unfinished. Saying what can be done, once and plainly, is the craft.
- **Principle 1 (the facts first) and `/`'s five seconds.** Ha doesn't touch `/`. Hb's door changes
  `/` only where Iris measured room, and only once the room is made (`.crew/sprint/57/door-iris.md`).
  The title block's checks stay unedited.
- **What I left out, and why** (`close.md`, "Left open"):
  - the fleet at 45: three hulls and lower levels for the few who reach 45, when one line of words
    gives the stop its meaning;
  - bounces and sprint 16 struck: each publishes something that can't yet be kept true;
  - sound: optional and off by default.

  A grab-bag of these isn't a milestone (memory, sprint 49).

## The sprints

Checks are numbered across the milestone, H1 onward. The yard's Y-numbers stay with the yard. Ye's
planned Y25 to Y27 were never written, and its work moves here as Hb.

### Ha (M): the yard plays in a phone's window, and says how

The contract is `first-contract.md`, with checks H1 to H7. Iris places it first.

- On every step page, in phone windows (Safari's 390 × 664, 360 × 640 and 320 × 568), the step link
  to press is wholly in the first screen, with scripts on and off, and the question at 23 stays in
  it.
- `/log`'s Start again gets words that say the visitor rebuilds the ship (Quill proposes "Rebuild it
  yourself from sprint 1", Iris's door words, so the door and the Log say the same thing).
- A step page says, in one line and only where it's true, that a step can be held (Full and Calm
  with the yard playing). It's CSS-keyed, with no script.
- At every chapter after 23 (every 22nd merge; today only 45), one line says why the riffle
  stopped, from a rule the oracle checks: today "Every plank the crew laid by sprint 23 is gone
  too."
- **Who builds it:**
  - Iris: the placement and the words.
  - Forge: the markup and CSS. No 3D changes are expected; Pixel only if Iris's placement moves the
    drawings below 768.
  - Probe: H1 to H7 red first, then the contract mutant and its named reds.

### Hb (M): the door, with the room made first

One plain link, "Rebuild it yourself", on `/`'s revision block count line, to the first step. Iris's
markup is in `.crew/sprint/57/door-iris.md`, "If it ships later". It goes in the room the legend's
"Original" item leaves when it shows only while an original plank is on the drawing. Today none is:
"22 planks: 22 replaced, 0 original". `PlankLegend` is shared with `/read`, so the rule holds there
too.

- **It comes second** because the door sends visitors to `/log/1`, whose press is cut at 390 × 664
  until Ha lands.
- **Its contract is written after Ha merges,** from a fresh injection into production's DOM, the
  same method as `door-iris.md`, with the legend item gone. Iris's numbers say the door then moves
  nothing at 1280 to 1440 × 900 in default, resting and replay, and in open moves only to the live
  state's place.
- **Checks, planned H8 to H11:**
  - H8: the legend keys only what's drawn, on `/` and `/read`.
  - H9: the door, its target, its words and its Tab place (after the Log link).
  - H10: `/`'s first screen unchanged. W1 to W17, B1.1, B4.22, P3 and P8 stay unedited, plus a 1 px
    sweep from 1380 to 1440 × 900 in every feed state on both faces, with the contact links' bottom
    never lower than today's.
  - H11: the named rewrites with their strength: B2.3's Tab bound (26), B1.5's list of the block's
    links, B4.19's "Seated and Original", B2.9's forced-colours rider reading an original swatch on
    `/`, and `e2e/live-layer.ts`'s legend finder, which finds the list by the word "Original".
- **Waits if** the fresh measurement shows the door moving the contact links at any window W1 to
  W17 pin, or below the fold at 1380 to 1440 × 900 on either face. In that case the milestone closes
  with Ha, as Ye did.

### Then the crew stands down

After Hb, nothing left serves the beliefs enough to earn a milestone without the owner. The fleet,
the bounces and sound wait with their questions (`.crew/sprint/52/plan.md`, "After the milestone's
demo"). Work reopens if:

- the owner sets a goal or answers a pick;
- a defect on production makes something the site says false, or hides a fact;
- the owner, having played the yard on his phone, wants more of it.

## Budgets (both sprints)

| Budget | Limit | Check |
|---|---|---|
| Loader script on `/`, `/log` and records, WebGL refused | 0 B added (11 B left) | B2.10 and B5.10, unedited |
| The 3D chunk | ≤ 250,000 B gzip -9; 0 B expected | B3.6 and B5.23, unedited; the delta reported |
| CLS | 0 | Y8, B5.25 and H3's own; Hb's on `/` by B4.22's and W's |
| LCP | text in main, ≤ 2,500 ms at 4x CPU | Y8 and B5.10, unedited |
| `/`'s first screen | unchanged in Ha; in Hb, never lower than today's | W1 to W17, B1.1, B4.22, P3, P8 unedited; H10 |
| Draws, triangles, frames at rest | ≤ 8, the caps, 0 | B5.23, Y18, unedited |
| CI | each shard under 20 minutes | reported: the Log specs share shard 2 (18 min 56 s on sprint 56), so Probe reads its time before the label |

## Out of scope

- The fleet, bounces, sprint 16 struck, and sound: above.
- The card at 45, `/log`'s own card, and any change to a step's card (Yb's checks stay).
- The riffle's pace, stops and keys (Yd's, unchanged).
- The display face's `display: optional` (`close.md`, "Also seen"): Iris's to weigh, parked since
  sprint 42. It isn't the yard's.
- A tally, visitor input, a step 0, a timeline slider, drag or a free camera.
- Owner paths and `content/`. No sprint here touches either.

## The owner's calls: none blocks the work

1. **Still open from sprint 52:** the direction (A as built), and the tally at 23. No tally is still
   recommended: the question reads better unanswered.
2. **Still open from #101:** which proof comes after the first window.
3. **Optional:** after Ha, play `/log/23` on his own phone in Safari, from the card in a message.
   That's the share visitor's path, and the cloud can't open it.

## The demo

Quill judges Ha on its preview at the phone windows, and the milestone on production after Hb:

- Sent `/log/23` on a phone, can they press on without scrolling?
- On `/log`, can they tell in five seconds that the ship can be rebuilt?
- Do they find the hold without being told twice?
- At 45, do they know why it stopped?
- From `/`, do they find the door, while the hiring executive's first screen stays as it is?
