# B4e contract: Replay of the last merged sprint on `/crew`

Quill, 2026-10-31, during sprint 37, for the run that builds it (PR #95). It is the plan's B4.5
(`.crew/sprint/28/b4-plan.md`), read against the feed's `last.replay` as the Studio ships it
(nycruslan/theseus-studio#49, `lib/crew.ts`: the sprint's moments, oldest first, at most 60, ending
as `moments` begins). It reuses these by reference, and their data rules hold word for word except
where this contract changes them:
- B4a's moment rules (`.crew/sprint/31/contract.md`);
- B4c's poller (`.crew/sprint/35/contract.md`);
- B4d's detail drawing, tally and `data-run` table (`.crew/sprint/36/contract.md`, calls 1 to 4).

Numbers come from this branch (`c24f1db`), from a scratch build of it with a sketch of the replay
(thrown away; see "Measured"), and from the Studio's live answer as Iris read it today. Iris's
calls 1 to 4 (her two messages to Quill this sprint) are written in and marked "Iris". Her
corrections after measuring on the page are amendment 1, and nothing is pending.

Iris's principle settles most of the look. The panel's head always tells the present: the chip,
the status, the table and Pause updates. Only the Activity block and the drawing play the replay,
and each carries its own label. So through a replay the status keeps saying "Crew resting. Sprint
N merged…", and the chip stays seated.

## Amendment 1 (Iris's corrections to 043dd18, accepted by Atlas)

Iris measured these on a scratch build with the real sprint 36 feed
(`.crew/sprint/37/decisions.md`). The rules and checks below are amended in place, each marked
"(amendment 1)". Where 043dd18 and this section disagree, this section holds.
1. **The stamp's size.** The stamp takes the plank numbers' size on `/crew`: 11 px, and 13 px from
   1280 px.
2. **`/`'s rest line costs nothing from 1024.** The link gets `margin-block: -2.25px`, and
   `p[data-rest]`'s flex row gets `row-gap: 6px`. Without them the 24 px target took 4.5 px at
   1280 × 800 and 1024 × 768, and at 1280 × 800 it pushed the title block's links below the fold.
3. **`/crew`'s entry moves into the status, because Activity's head is out of sight.**
   - At rest, the Done rows' long lines put Activity's head at y 977 at 1440 × 900 and at y 1289
     at 390 × 844, so a toggle there is unseen. A control the visitor can't see is no feature, so I
     agree.
   - The entry is now a link in the resting status, "Replay sprint N", which starts the replay.
   - Activity's head keeps one toggle, "Pause replay", that pauses and resumes it.
   - The rules are "The entry" and "The pause" below, and call 2 is restated to match.

## Outcome

A visitor who arrives while the crew is at rest can watch the last merged sprint unfold:
- They press "Replay sprint N" on `/crew`, or follow it from the rest line on `/`.
- The sprint's moments arrive one every 1.5 s, newest on top, each with its real UTC time.
- The plank that sprint built goes back to pencil and takes a tick per moment. On the merge it
  inks again.

The list is headed Replay, nothing in it is copper, and it never claims to be now. Nothing plays
until the visitor asks.

Sprint 36 has 48 moments (08:44 to 15:51 UTC, a 7-hour sprint), so its replay takes 70.5 s.

## The calls I made

1. **The pace is fixed, not proportional** (Iris, call 1). Play shows moment 1 at once, then one
   moment every 1,500 ms. The original times carry the real clock, including sprint 36's 77-minute
   wait. The frames' "4×" goes: at 4× sprint 36 takes 1 h 47 min.
2. **Two controls, each named for what it does, with names that never change** (amendment 1).
   - The entry, `a[data-replay]` "Replay sprint N" in the resting status, starts the replay from
     moment 1, every time it is pressed.
   - The pause, `button[data-replay-pause]` "Pause replay" in Activity's head, takes Pause
     updates' grammar (Iris, `.crew/sprint/35/notes-iris.md`, 1.7): `aria-pressed` is true while
     paused.
   - A resume waits the full 1,500 ms before the next moment, not the remainder (Iris).
   - At the end the pause hides, and the entry replays.
   - There is no Leave control. The end state is the rest panel's own sprint told in full, so
     nothing needs undoing.
3. **Nothing starts it but the visitor.** Two things start it:
   - a press;
   - arriving at `/crew#replay`, the link on `/`, which is the visitor's press made one page
     earlier. It then drops the hash with `history.replaceState` (Iris), so a reload, Back or
     Forward, or a copied address never replays on its own.

   A load without that hash, a poll, a mode change or Space never starts it.
4. **It plays the same in every mode** (Iris, against the plan's "Off fills the list"). Nothing in
   a replay moves: a row and a tick appear with no transition, as they do on a poll. So Full, Calm,
   Off and reduced motion differ only in the drawing's 3D, as they do live.
   - Off is "the still 2D drawing with no WebGL", not "no updates".
   - With WebGL refused the mode reads `off` (`components/model.tsx`), so the plan's rule would
     never let a visitor on a locked-down laptop see it play.
   - Without scripts there is no replay. `/crew`'s rest list is the sprint's newest 10 moments,
     ending at the merge, which is the replay's end anyway.
5. **The poll keeps running, and the replay lives only while the crew is at rest on that sprint.**
   Polls keep B4c's schedule during a replay, so the panel above it never goes stale.
   - A told answer that is still `resting` with the replay's sprint changes nothing in the replay
     or in `[data-plan]`.
   - Any other told answer closes the replay at once. That covers live, open, resting on another
     sprint, a run with no number, and down past B4c's 10 minutes. The entry and the pause go, the
     list is
     the told panel's, and the drawing takes call 3's value for that answer.

   Live beats replay: a visitor who sees the crew start mid-replay has the better proof. Live and a
   replay never share the panel. B4c's announcement says what the poll told. Pause updates keeps
   its meaning: it pauses polls, not the replay (Iris agrees).
6. **The replay rides `/api/crew`'s resting answer, so the offer follows the poll like the rest of
   the panel.** I first had it come from the page's render alone. Iris flagged the case that
   overturns that: after a quiet spell, Vercel serves the build's page (`UNREAD`, which says
   nothing of the crew; `lib/crew-feed.ts`). Only the poll at hydration then tells "resting", so
   the typical first visitor would never be offered a replay.
   - So a resting answer carries `run.replay` when a replay is offered, and the browser applies
     the same rules.
   - The key is absent otherwise, so every answer B4.25 checks today keeps its exact keys.
   - The cost is at most 60 short moments on a resting poll. The Studio's whole answer, replay
     included, stays under 8 KB by its own test.
   - The drawing can't follow a poll (it has no client geometry), so a replay offered only by a
     poll plays in the panel alone (call 7).
7. **The drawing replays the plank with B4d's states, so `lib/model/*` needn't change** (Iris
   agrees, the rest crop on the tally included). This follows call 3's rule (claim nothing for
   another sprint). At rest with a replay offered by the page's render, if the build seats the
   replay's sprint, the focus is that sprint's seat. The server draws it as `inked`:
   - the tally's crop;
   - n in ink 700 at the tally's stern end;
   - the ten slots, none shown;
   - no tip.

   While it plays, `data-run` is `open` (the pencil with no tip) and the shown ticks are the moments
   played, up to 10. From the `merge` moment (or after the last moment, if there is none) it is
   `inked` again, and the ticks go, as the merge inks the plank: a cut with no transition, which
   is the replay's payoff (Iris). While the plank is in pencil, the drawing carries its own Replay
   stamp, so at 390, where the list is below, a pencil plank with no copper can't be read as open
   (Iris). The camera never moves for a replay: not on Play, not on a tick, and not at the merge
   (Iris). The chunk already reads all of
   this (`lib/model/crew.ts`, `mount.ts`'s observer, and `createStage(…, tally)` built with the tip
   parts on `/crew` in every state).
   - **Pixel is not needed**, unless B4.47 is red on Forge's build. A pencil that appears after
     mount is the one path the chunk has never run. If it fails, Atlas briefs Pixel with B4.47's
     failure.
8. **~~The budget grows by a measured 2,048 B.~~ Reverted (decision 8):** the real build fits main's
   18,432 B and 16,384 B, so no bound loosens.

## Data rules (the page and Probe's oracle implement these word for word)

**The replay** is read on the server from the feed's `last.replay`, in `resting` only. The same
rules apply in the browser to `/api/crew`'s `run.replay`:
- An entry is kept by B4a's moment rules: a known kind, an `at` that parses, and non-empty text.
  `who` is ignored.
- The kept entries are sorted oldest first by `at` (stable, so ties keep the feed's order), and the
  newest 60 are kept.
- A missing or non-array `replay` is no replay, and never down.
- **Offered** when the state is `resting`, `last.sprint` is a number, and at least one entry is
  kept. Otherwise nothing on `/` or `/crew` changes from today.
- **The route** (call 6). A resting answer with a replay offered carries `run.replay`: the kept
  entries, oldest first, each exactly `{ kind, at, text }`, as `run.moments`' entries are. Every
  other answer has no `replay` key.
- In the browser the offer follows the told state. A told `resting` answer with a replay offers
  that replay, and one without offers none.

**The focus and the drawing at rest** (call 7). With a replay offered:
- If `seatOf(merged, last.sprint)` exists, `data-focus` is that seat, and `[data-plan]` carries
  `data-tally` and `data-run="inked"`. The focus path is seated with `data-sprint` n, and n is
  lettered in ink 700 with no chip at the tally's stern end (`numberX(seat, true)`). The crop is
  `crewLayout(…, true)`. The hatch pattern is in `defs`, unused. The `.plank-marks` group carries
  the ten slots in `data-slots`, with no `[data-mark]`. There is no `.plank-tip` and no
  `[data-tip]`. The crop holds B4.36's margins: the pen's dot and the number's centre are at least
  8% of the box's width from each side (Iris).
- Otherwise (no seat yet: deploy lag, or merge order), the drawing is today's rest drawing,
  unchanged by the replay. The replay plays in the panel alone.

With no replay offered, the focus is B4d's call 2, unchanged.

**The anchor.** At rest, the Activity block carries `id="replay"`, with `scroll-margin-top` the
bar's height plus 16 px, so the anchor lands its head under the sticky bar (Iris).

**The entry** (amendment 1; Iris) is one link, `a[data-replay][href="#replay"]`, "Replay sprint
N".
- **Where.** It sits in the resting status cell, on its own line under the status sentence: the
  element right after `p[data-status]`, in the same cell of the status row. Pause updates stays at
  the row's right, and `p[data-status]`'s text stays word for word. It is shown whenever the told
  state offers a replay.
- **Size.** 44 px tall below 1024 and 24 px from it. It is ink, underlined like `/`'s link, with
  the same 2 px ink ring, and never copper.
- **The glyph.** Before the name is the CSS triangle, never a font character (iOS turns ▶ into an
  emoji). It is `aria-hidden`, with an 8 px gap, so the link's text is exactly "Replay sprint N".
- **Scripts off.** It is in the server's HTML, hidden by `visibility` with its box kept, until the
  poller runs (`data-ready`), so nothing shifts. With scripts off it is never shown.
- **What a press does.** A press, or arriving at `/crew#replay`, does three things:
  - starts the replay from moment 1, whether one was playing, paused, ended or never started;
  - jumps instantly (no smooth scroll) to `#replay`, under the bar by its `scroll-margin-top`;
  - drops the hash with `history.replaceState`.

  After that the replay never scrolls the page itself. Script moves no focus: the next Tab after
  the landing reaches "Pause replay".

**The pause** (amendment 1; Iris) is one `button[data-replay-pause]`, "Pause replay", in
Activity's head.
- **Pressed means paused** (`aria-pressed`, Pause updates' grammar). Space toggles it (see
  "Space"). Its glyph is the CSS two bars, 2.5 px each and 2 px apart, 8 px tall, `aria-hidden`,
  and the glyph doesn't change.
- **Placement.** It sits at the head's row end, top-aligned. The head is a two-column grid: the
  heading `minmax(0, 1fr)` and the button `auto`. The heading's first line is centred on the button
  as the status row's is. The button never moves when the heading's word changes or wraps (at 320
  it wraps).
- **Size and colour.** It takes Pause updates' sizes:
  - below 1024, 44 px tall, `--step-base`, 16 px side padding;
  - from 1024, 32 px tall, `--step-sm`, 12 px side padding.

  Pressed, it is an ink fill with film text. In forced colours it follows
  `.crew-pause[aria-pressed="true"]`.
- **When it shows.** Its box is reserved whenever a replay is offered. It is visible (and
  focusable) only while a replay plays or is paused: from moment 1 until the end. At the end it
  hides by `visibility`. If it had focus, focus moves to `#replay` (`tabindex="-1"`, no ring)
  with `preventScroll`, since focus can't stay on a hidden button and focusing the entry would
  scroll the page (530 px at 320 × 640; Iris's early look, decision 7). The next Tab reaches what
  follows the Activity block's head; Shift+Tab reaches back toward the entry.

**Playing.** Let k be the moments played (0 before the first press).
- The entry sets k to 1 at once, then adds 1 every 1,500 ms on `setTimeout`, so `page.clock`
  drives it.
- The step after the last moment ends it: the pause hides and nothing more is timed.
- Pause clears the timer. A resume waits the full 1,500 ms.
- The Activity block carries `data-replaying` while k ≥ 1.
- Its `ol[data-moments]` lists the first k moments newest on top, in Activity's `li` form (kind,
  `time` in UTC HH:MM, with the day when it differs from the heading's).
- Its `h2` reads "Replay, ‹d Mon› (UTC)": the one word swapped for "Activity", and the day of the
  replay's first moment (Iris). Each time shows its day when it differs from the heading's.
  "Activity" returns when the replay closes.
- No now line shows while the replay is listed. Nothing in `.crew` or `[data-plan]` is copper.
- `[data-announce]` gets nothing from a replay.

**Space** toggles "Pause replay" while a replay plays or is paused, when the focus is on it
(natively) or not on a link, a button or a field (Iris). Default scrolling is prevented only then.
It never starts a replay and does nothing at the end. Before a press, and at the end, Space scrolls
as always. On any other focused control it keeps that control's meaning.

**The drawing while playing** (call 7; only when the server drew the tally):
- `[data-plan]` carries `data-replay` while k ≥ 1.
- For 1 ≤ k before the merge: `data-run="open"`, and the focus path in pencil (`plank-pencil`,
  `data-pencil`, no `data-live`, the hatch, the dashed `--muted` edge). The shown `[data-mark]`s
  are min(k, 10), filled slot by slot (B4d's "How it changes": no shown tick moves).
- From the `merge` moment, or once k is the last moment if there is no merge: `data-run="inked"`,
  with 0 ticks.
- The box, the crop, `data-focus` and the camera never move (read in page coordinates or the drawing's own geometry, since the jump to `#replay` scrolls the viewport), and there is no `[data-tip]` at any
  point.

**The stamp** (Iris) is one `span[data-replay-stamp]`, "Replay", in the drawing's box: 2D DOM in
`.crew-drawing`, outside `lib/model/*`, absolutely placed.
- **When it shows.** It is in the server's HTML, hidden, whenever the server drew the tally for a
  replay. It is shown while `[data-plan]` has `data-replay` and `data-run="open"`, so from Play
  until the plank inks, paused or not. It goes at the merge, with the key, since the plank is then
  the record again.
- **Its look.**
  - `text-transform: uppercase`, `letter-spacing: 0.08em`, weight 700, ink;
  - the plank numbers' size on `/crew`: 11 px, and 13 px from 1280 px (amendment 1);
  - a 1 px ink border, `padding: 3px 6px`, background `--background`, so it reads over the lines
    and the canvas;
  - no radius, never copper; in forced colours, a `CanvasText` border and text on `Canvas`.
- **Its place.** It sits at the box's top-left, on the sheet's text edge: 24 px inside the box
  from 1024 and 16 px below it. Its top is 8 px inside the box, above the sheer and the Profile
  title. Iris checked this place on the real page (amendment 1).

**The poll during a replay** (call 5). A told answer that isn't `resting` with `run.sprint` equal
to the replay's sprint closes the replay in the same render:
- `data-replaying`, `data-replay`, the entry and the pause go;
- the list is the told panel's;
- `redraw` applies call 3's table for that answer.

A told `resting` answer for the replay's sprint changes no node in `[data-plan]` or the replay's
block.

**The rest line on `/`** (0 B of script; Iris's layout). With a replay offered in `/`'s read,
`p[data-rest]` holds two things:
- the sentence, "Crew resting. Sprint N merged ‹day›, ‹time› UTC.", in one element, flowing as
  today;
- one link, `a[href="/crew#replay"]`, "Replay sprint N".

`p[data-rest]` is a wrapping flex row (`justify-content: space-between`, `column-gap: 16px`,
`row-gap: 6px`, `align-items: baseline`). The sentence is at the left and the link at the line's
right end. Where they don't fit (390 and 320), the link wraps to the next line at the left. The
link:
- is ink, underlined like the pencil row's `/crew` link;
- is `inline-flex`, with `min-height: 24px`, `margin-block: -2.25px` (amendment 1) and one 2 px
  ink ring 2 px out;
- is never copper;
- has the same CSS triangle before it, 6 px wide and ink: the one sign on `/` that it plays rather
  than navigates.

With these, the link adds no height to `p[data-rest]` from 1024 px (Iris measured it, amendment 1).

**The tick key** (Iris's #91 follow-up; her words and look):
- `p[data-tick-key]`, the element right after `ol[data-moments]`. Its text is exactly "One tick on
  the plank in pencil for each moment above, up to ten."
- Before the text, a symbol: an inline SVG, `aria-hidden`, about 20 × 8 px. It is a 1 px `--muted`
  rule with three 1.4 px `--muted` ticks hanging 6 px from it at a 6 px pitch, the drawing's own
  mark.
- `--step-sm`, line-height 1.5, `--muted`, margin-top 8 px; symbol and text on one baseline row,
  8 px apart; at least 4.5:1.
- **When it shows:** whenever ticks are drawn, that is `[data-plan]` with `data-tally` and
  `data-run` `live` or `open`, a replay before its merge included. At rest, in `down`, on
  `record` and at a replay's merge there are no ticks, so there is no key (B4b's rule: a key names
  only what is on the drawing).

## Checks

Probe writes these first, by B4d's method:
- 2D on the Off path (WebGL refused); the 3D on B3's harness.
- `page.clock` installed before `goto`, and `page.route` on `/api/crew` with the oracle's
  `toAnswer`. No check waits in real time for a step or a poll.
- The replay fixture is `resting.json` with a `last.replay` of 14 entries. That is the 10 in
  `moments`, oldest first, behind four older ones. Two of the four are bad (an unknown kind and an
  empty text), and one entry is out of order. So 12 are kept, the merge is the 11th, and `end`
  the 12th.
  - The 60-cap variant has 65 entries.
  - The 999 variant has `last.sprint` 999 (no seat).
- 1440 × 900 and 390 × 844 unless a check says otherwise. Each title carries its number.

- **B4.43 The offer, and nothing starts** (amendment 1).
  - On the replay fixture, the entry is one `a[data-replay][href="#replay"]` whose text is exactly
    "Replay sprint 29":
    - it is the element right after `p[data-status]`, and `p[data-status]`'s text is the oracle's
      resting line;
    - it is shown after hydration and never with scripts off;
    - it is 44 px tall below 1024 and at least 24 from it;
    - it is wholly inside the first viewport at 1440 × 900 and 390 × 844, with the fixture's role
      lines lengthened to the Studio's 140 characters.
  - `button[data-replay-pause]` "Pause replay" keeps its box but is hidden and not focusable.
  - The Activity block is `#replay`, and its list is the server's 10 newest.
  - For 10 fake minutes after load, nothing changes in `.crew` or `[data-plan]` but `data-ready`
    and the poll's own updates.
  - Space on the body before a press scrolls and plays nothing.
  - Not offered (no entry or pause, today's panel and drawing) on the live, open, resting and down
    fixtures, on a replay of only bad entries, and with `last.sprint` null.
  - The oracle keeps the 60 newest of the 65.
- **B4.44 It plays in order, on the clock.**
  - A press of the entry gives k = 1 at once, then k + 1 at each 1,500 ms and not before (checked
    at 1,499 and 1,500).
  - It jumps at once to `#replay`: the Activity head is below the bar and inside the viewport,
    with no smooth scroll. Over the replay the page's scroll position doesn't change.
  - Each `li` has the oracle's time and text, newest on top, with every played moment kept.
  - The `h2` reads "Replay, ‹the first moment's d Mon› (UTC)" while listed, and the block carries
    `data-replaying`.
  - After the 12th moment the pause hides, and 10 more fake minutes change nothing.
  - No now line, nothing copper (B4.6's sweep), and `[data-announce]` stays empty.
  - From press to end, the chip, the status ("Crew resting. Sprint 29 merged…"), the table and
    Pause updates equal the resting panel's.
  - The same timings under Full, Calm, Off, reduced motion, and with WebGL refused.
- **B4.45 Pause, Space, and again** (amendment 1).
  - `button[data-replay-pause]`:
    - its text is exactly "Pause replay", and its glyph is a CSS box;
    - it is 44 px tall below 1024 and 32 from it;
    - it is visible from k = 1 to the end;
    - its box is the same before, during and after (no shift, read in page coordinates).
  - A press mid-play turns `aria-pressed` true, and 10 fake minutes change nothing. A press turns
    it false and resumes, with the next moment 1,500 ms later.
  - Space with the focus on the body or on the pause toggles it. Space before a press and at the
    end does nothing to the replay, and the page scrolls. Space on Pause updates presses Pause
    updates alone.
  - At the end the pause is hidden and not focusable. If it had focus, focus is on `#replay` and the page's scroll position is unchanged.
  - Pressing the entry, mid-play, paused or at the end, restarts at k = 1, playing.
  - After the entry's press, the next Tab reaches "Pause replay". Otherwise the order of Tab stops
    in the panel is today's, plus the entry after the status and the pause in Activity's head.
- **B4.46 The plank replays, in 2D.**
  - At rest on the replay fixture, at 320, 390, 768, 1024 and 1440:
    - `data-focus` is 29's seat, `data-run` is `inked`, and `data-tally` is set;
    - the box is B4.33's;
    - the crop is the tally's;
    - n is in ink 700 with no chip, wholly inside the box;
    - the dot's and the number's centres are at least 8% of the box's width from each side;
    - there are 10 slots, no `[data-mark]` and no `[data-tip]`;
    - `[data-replay-stamp]` is hidden.
  - Playing: `data-replay` is set; `open`, with the pencil (hatch, dashed `--muted` edge,
    `data-pencil`, no `data-live`); the shown ticks are min(k, 10) at B4.34's x within 1 px, and no
    shown tick's box moves.
  - From the merge: `inked`, 0 ticks.
  - The stamp:
    - it is shown from Play to the merge, paused or not, and hidden from the merge;
    - it reads "Replay" (uppercase), resolves to ink on `--background`, and is `CanvasText` in
      forced colours;
    - its font size is 11 px, and 13 px from 1280 (amendment 1);
    - its box is inside the drawing's box, with no plank number's box within 4 px of it;
    - read at 1440, 1024, 390 and 320, on 29's crop and on a retro sprint whose seat anchors the
      crop at the other end of the hull (the oracle picks it), patched in as `last.sprint`.
  - The box, the crop and `data-focus` never change, and nothing in `[data-plan]` animates.
  - On the 999 variant, the drawing equals the default server's at rest and has no mutation while
    the replay plays.
- **B4.47 The hull follows the replay.** At 1440, one scheme, on B3's harness:
  - at rest, `data-marks` is 0 and nothing is pencil;
  - each step that changes the ticks draws exactly 1 frame, and `data-marks` follows to 10, then 0
    at the merge;
  - 0 frames between steps;
  - no pixel within ΔE 10 of `--accent` at any point;
  - the canvas changes only inside the focus plank's projected box and B4.21's 5 px band;
  - the camera's pose is unchanged from rest to the merge.

  On B4.39's Off paths, no chunk is requested on the replay fixture.
- **B4.48 The poll and the replay.**
  - `/api/crew` on the replay fixture deep-equals the oracle's answer, whose `run.replay` is the
    12 kept entries, oldest first, each exactly `{ at, kind, text }`. On every other fixture the
    answer has no `replay` key, as B4.25 has it.
  - From the default server's page with `/api/crew` routed to the replay fixture's answer, the
    panel turns resting at the first poll and offers "Replay sprint 29". It plays in the panel,
    with no change in `[data-plan]` and no stamp.
  - Mid-replay, polls keep the 60 s schedule. A resting answer for 29 changes no node in
    `[data-plan]` or the block.
  - A live answer, an open one, resting for sprint 30, and down past 10 minutes each close the
    replay in that poll:
    - no entry or pause, no `data-replaying` and no `data-replay`;
    - the list is the oracle's for that answer;
    - `data-run` is call 3's value: `record` for another sprint and for down.
    - The stamp and the key go.
  - Resting for sprint 30 with a replay of its own closes 29's and offers "Replay sprint 30".
  - `/crew#replay` on the live fixture plays nothing.
- **B4.49 The way in from `/`.**
  - On the replay fixture, `p[data-rest]` holds the oracle's line in one element, then exactly
    one link, `a[href="/crew#replay"]`, whose text is exactly "Replay sprint 29".
  - The link's right edge is on the block's right edge at 1440. At 390 and 320 it starts a line
    of its own at the block's left.
  - It is never copper (hovered or focused), at least 24 × 24, with one 2 px ink ring 2 px out.
  - Tab reaches it after the Contact links and before the Log link.
  - B4.22's first screen holds, the rest line included.
  - From 1024, `p[data-rest]`'s height with the link equals its height on the resting fixture
    without it, within 0.5 px, at 1024 × 768, 1280 × 800 and 1440 × 900. At 1280 × 800 the title
    block's Contact links are wholly inside the viewport (amendment 1).
  - `/`'s scripts equal the default server's files and bytes, WebGL refused.
  - Following it lands on `/crew` with the Activity head below the bar and inside the viewport,
    "Pause replay" visible and unpressed, and k = 1. `location.hash` is then empty, and a reload
    plays nothing.
  - On the resting fixture (no replay), `/` has no link in `p[data-rest]`, as B4.18 has it.
- **B4.50 The tick key.**
  - One `p[data-tick-key]` right after `ol[data-moments]`, with the exact words and one
    `aria-hidden` `svg`, on the live and open fixtures and in a replay before its merge.
  - None at rest unplayed, from a replay's merge on, in down, or on the 999 variant.
  - At least 4.5:1 in both schemes.
  - B4.12's first screen still holds on live.
- **B4.51 The sweeps, replaying.**
  - At rest, mid-replay and at the end, both schemes:
    - axe with the strict tags;
    - every text in a token;
    - no overflow at 320 or 390;
    - targets at 44 below 1024 and 24 from it;
    - forced colours: the entry's and the pause's rings, the pause's pressed state, the stamp,
      and ticks in `CanvasText`.
  - B4.14 and B4.31's budget at the new figures, read on the replay fixture.

## The live checks: keep, rewrite, retire

Probe counts the tests with `playwright test --list` before he starts. Every fixture they use
carries no `replay`, and the default server is down, so the code paths they cover are today's.

| Check | Disposition |
|---|---|
| `crew.spec.ts` (B4.1 to B4.13 and the harness), `crew-bar`, `crew-live` (B4.25 to B4.30, B4.42), `crew-hull` (B4.33 to B4.35), `crew-model*`, `crew-motion`, `crew-control` | **kept unedited**: with no replay offered, every page they load is today's. B4.25's `wrongKeys` holds because a route answer carries `replay` only when one is offered (call 6) |
| `live-layer.spec.ts` B4.15 to B4.24, B4.32 (B4.18's "no link" in the rest line, B4.24's "the Log right after Contact" at rest) | **kept unedited**: their resting fixture has no replay, so no link. B4.49 checks the link's presence with their helpers, beside them |
| B4.14 and B4.31, the script | **kept unedited** at main's 18,432 B and 16,384 B (call 8, reverted: decision 8) |
| `read.spec.ts` B2.10 (`/` at 2,048 B, 9 B left), `sheet`, `keyboard`, `motion`, `model-*`, `log-*`, the `ROUTES` sweeps, `content`'s TODO sweep | **kept unedited**: `/` adds HTML only, and the default server shows no rest line |

**Retired: none.** No bound loosens (call 8 reverted, decision 8).

## Budgets

| Measure | Budget | Check | Measured |
|---|---|---|---|
| `/crew`'s script, WebGL refused | the 404's files plus at most **18,432 B** decoded; at most 16,384 B beyond `/log`'s (decision 8) | B4.14, B4.31, B4.51 | head 17,088 B in one file (1,344 B left of 18,432); the sketch 19,347 B (+2,259; 1,133 B under the new figure). The sketch lacks the browser's read of `run.replay`, the stamp's toggle, the key's `svg` and `replaceState`. If Forge's build doesn't fit, he trims or stops and tells Atlas, and the figure isn't raised again without a measurement |
| `/`'s script | B2.10 unchanged: the link is server HTML | B2.10, B4.49 | 2,039 B over the 404, head and sketch alike |
| `/api/crew` | a resting answer grows by its replay, at most 60 `{ at, kind, text }` (call 6); every other answer is unchanged | B4.25, B4.48 | the Studio's whole answer, replay included, is under 8 KB by its own test (`lib/crew.test.ts`) |
| 3D | B4.40's, unchanged: no new draw, at most 10 ticks | B4.40, B4.47 | |
| The replay's length | 1,500 ms a moment, so at most 88.5 s at the feed's 60 | B4.44 | sprint 36: 48 moments, 70.5 s (Iris, the Studio's answer at 18:2x UTC) |
| The new specs' time | at most **2 minutes** added to the suite's wall time at CI's 2 workers, with every step and poll on `page.clock`; Probe measures the full suite before the label | the run | sprint 36's `check` took 26.9 min of its 35-min cap |

## Measured

I made a scratch worktree off `c24f1db`, with its own `pnpm install`, and built it and ran
`next start` on port 4787. I read scripts by B2.10's method: a fresh Chromium context, the decoded
bodies of every script response, and 2.5 s with WebGL refused.
- **The head.** The 404 is 5 files and 458,882 B. `/crew` adds 17,088 B (`3z31c5kv3skxf.js`).
  `/` and `/log` add 2,039 B.
- **The sketch.** It added these to `CrewLive` and `CrewPanel`:
  - the toggle, the 1,500 ms step, the played list, and `redraw` for the replay's state;
  - the `#replay` start, the Space handler, and the offer's sprint test;
  - the tick key.

  `/crew` came to 19,347 B (`347ry7q7x-_0u.js`), and `/` was unchanged.
- **The chunk.** `createStage` is built with `tally` = true on `/crew` in every state, and its tip
  parts exist whenever the hull isn't the ghost. `sync` re-reads the pencil whenever `data-run` is
  `live` or `open`. So a pencil that appears after mount should draw with no change. B4.47 proves
  it (call 7).

## Who builds what

- **Forge** owns:
  - `lib/crew-feed.ts` and `lib/crew-run.ts`: the replay's read and its rules, on the server and
    in the browser;
  - `app/api/crew/route.ts`: `run.replay` in a resting answer that offers one;
  - `app/crew/page.tsx`: the focus with a replay, `drawn` at rest, and the replay prop;
  - `components/lines-plan.tsx` and `lib/lines-plan.ts`: the inked tally at rest with no tip, and
    the stamp;
  - `components/crew-live.tsx`: the transport, the steps, Space, `#replay` and `replaceState`, the
    poll's rule, the redraws, the stamp's toggle, and rider 1;
  - `components/crew.tsx`: the entry in the status, the pause in Activity's head with their
    glyphs, the heading, and the key with its symbol;
  - `components/revisions.tsx`, `app/page.tsx` and `lib/live-layer.ts`: the link on `/`;
  - the CSS, in `/crew`'s and the revision block's own blocks of `app/globals.css`;
  - rider 2's one line.
- **Pixel:** none, unless B4.47 is red (call 7).
- **Probe** owns `e2e/`, the fixture variants included.
- **Iris** sets the pending looks, then reviews.
- **Nobody** edits `components/model.tsx`, `content/`, or an owner path.

## Riders

| Rider | Disposition |
|---|---|
| 1. Lens's nit on #91: `components/crew-live.tsx`'s "The drawing is the server's HTML, outside React's tree" is wrong | **Rides (Forge).** Correct the comment, and Forge's memory line (`.claude/agent-memory/engineer/MEMORY.md`, the `/crew` detail line). The drawing is server HTML that React hydrates but never re-renders, since `CrewPlan` is a server component that takes no client state. That is why the poller and now the replay may write to it, and why a client re-render of `CrewPlan` would undo their writes. The replay makes this load-bearing, so the words must be right |
| 2. Lens's nit on 2feab08: the 3D ticks' weight reads the Log's `MARK_PX`, not `MARKS.width` (`lib/model/stage.ts:450`) | **Rides as one line (Forge, Pixel's file).** `marks.material.linewidth = (tally ? MARKS.width : MARK_PX) * ratio`. Both are 1.4 today, so no pixel changes, and B4.37 and B4.40 stay green unedited. If Atlas would rather keep `lib/model/*` Pixel's alone, it waits for Pixel's next sprint |
| 3. Iris's key for the ticks (`.crew/sprint/36/review-iris.md`, follow-up 1) | **Rides** as `p[data-tick-key]`, checked by B4.50. The words and the symbol are Iris's, trimmed from mine. The owner can reword them on the preview, and that pick can be undone |

Not riding:
- seat 5.0's comb (sprint 42);
- the second bow (the owner's, on the preview);
- `/crew`'s long cache `expire`;
- the chip over the dot on `/`.

None of them touches what this sprint builds.

## Out of scope

- Replay while a run is live or open, and replays of older sprints (the Log's records are a
  follow-up).
- A scrubber, speeds, and a Leave control.
- The drawing for a replay offered only by a poll (it plays in the panel; the next load draws it).
- Announcing replayed moments.
- Any motion in a replay.
- Any change to the Studio's feed, `components/model.tsx`, `lib/model/*` (rider 2's line aside),
  `content/`, or an owner path.

## Needs decision

- **Iris and Atlas:** settled. Iris's numbers are amendment 1, and Atlas took call 8 and rider 2
  in `decisions.md`, 3.
- **Bytes:** the entry is a second control, so watch call 8's margin. If Forge's build doesn't
  fit 18,432 B (decision 8), he trims or stops and tells Atlas.
- **Owner:** nothing to merge. On the preview the crew is live or open, so no replay is offered
  there. They see it on production after the merge, with the crew at rest. That is the milestone's
  close, and the demo is theirs. Until then they have Probe's screenshots of the fixture.
