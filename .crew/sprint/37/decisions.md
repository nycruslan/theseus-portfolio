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
