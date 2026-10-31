# Sprint 37 (B4e): decisions

1. **The work** (Atlas): the roadmap's next sprint is B4e, Replay of the last merged sprint on
   `/crew` (`.crew/sprint/28/b4-plan.md`, B4.5). No owner goal, no PR open or waiting. It was
   waiting on the feed's later field `last.replay`; the Studio ships it as of
   nycruslan/theseus-studio#49 (`lib/crew.ts`: the last sprint's moments, oldest first, at most
   60), so the milestone moves. M: Quill's contract with Iris's calls (the pace first), Probe's
   checks red first, Forge builds the transport and the list, Pixel only if the 3D needs more than
   the drawing's existing interface. Riders that touch `/crew`: Lens's nit on #91 (the poller's
   "outside React's tree" comment and Forge's memory line), Lens's nit on 2feab08 (the 3D ticks'
   weight from `MARKS.width`, `lib/model/stage.ts`), Iris's key for the ticks.
2. **The contract** (Quill, with Iris's calls 1 to 4): `.crew/sprint/37/contract.md`, checks B4.43
   to B4.51.
   - The pace is a fixed 1,500 ms a moment.
   - The control is one toggle, "Replay sprint N", started by a press or by `/`'s `/crew#replay`.
   - The replay plays the same in every mode, against the plan's "Off fills the list", since
     WebGL refused reads as Off.
   - The poll keeps running, and any answer but resting on the replayed sprint ends the replay.
   - `run.replay` rides `/api/crew`'s resting answer, so the build's unread page still offers it.
   - The drawing replays the plank with B4d's `open` and `inked`, so `lib/model/*` doesn't change
     and Pixel is needed only if B4.47 is red.
   - `/crew`'s script budget grows from 18,432 to 20,480 B, measured by a sketch at +2,259 B. That
     is for Lens to accept.
3. **Quill's contract is accepted** (Atlas; `contract.md`, B4.43 to B4.51, with Iris's calls 1 to 4).
   `/crew`'s 20,480 B script limit needs no Owner's pick: it is measured, `/` is untouched, and a
   loosened bound is Lens's to accept with call 8's reason in the PR. Lens's nit on 2feab08 rides
   with Forge now (one line in `lib/model/stage.ts`, both values 1.4). Probe writes B4.43 to B4.51
   red first while Forge builds from the contract, each in their own worktree; Pixel comes in only
   if B4.47 is red on Forge's build.
4. **Amendment 1** (Iris's corrections to 043dd18, accepted by Atlas; written by Quill into
   `contract.md`, "Amendment 1").
   - The stamp takes the plank numbers' size (11 px, 13 px from 1280).
   - `/`'s link gets `margin-block: -2.25px`, and the rest line gets `row-gap: 6px`, so it adds 0
     px from 1024.
   - `/crew`'s entry moves into the resting status as a link, "Replay sprint N" (`#replay`): at
     rest Activity's head is at y 977 at 1440 × 900, out of sight.
   - Activity's head keeps one "Pause replay" toggle (pressed = paused), shown only while a replay
     plays or is paused. Its box is reserved, and focus moves to the entry if the toggle hides
     while focused.
   - Checks B4.43, B4.44, B4.45, B4.46, B4.48, B4.49 and B4.51 are amended to match.
5. **Three of Probe's checks read the viewport across the contract's own jump** (Quill, on Forge's
   finding; accepted by Atlas). B4.46's "the box never moves", B4.45's "no shift" and B4.45's Tab
   walk compared viewport positions, which amendment 1's jump to `#replay` moves on purpose. Each
   keeps its assertion and is read in page coordinates or the drawing's own geometry; the Tab walk
   starts from `main#main`. The contract's two clauses now say so. Lens: these checks show as
   edited for this reason, not loosened.
6. **The script budget holds at call 8's figures** (Atlas): Forge's first build read 21,277 B
   beyond the 404's (797 over). He trims rather than raising it, first with `"use no memo"` on
   `components/crew.tsx` (the React Compiler's caches), then by cutting code.
7. **Iris's early look on da76dd0** (her two musts and three shoulds, accepted by Atlas). The focus
   rule changes: at the end, a focused "Pause replay" hands focus to `#replay` with `preventScroll`,
   not to the entry, since focusing the entry scrolled the page 530 px at 320 × 640 against the
   contract's "the scroll position doesn't change" (B4.45 checks it). The stamp moves onto the text
   edge below 1024; its tracking is 0.04em; the key's symbol becomes a small hatched plank with
   ticks; the time column widens by subgrid when a day shows, since sprint 37's own replay may
   cross midnight UTC. Each replay step's layout shift (0.004 at 1440, 0.043 at 320) is known and
   stays: a row arriving is the content.
