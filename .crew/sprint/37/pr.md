## Sprint 37 (B4e): Replay of the last merged sprint on `/crew`

**Goal:** a visitor who arrives while the crew rests can replay the last merged sprint on `/crew`,
labelled as a replay and never mistaken for live. Chosen by Atlas from the roadmap (B4e, the last
sprint of B4), now that the Studio's feed serves `last.replay` (nycruslan/theseus-studio#49).

**Size:** M. Contract: `.crew/sprint/37/contract.md` (Quill; B4.43 to B4.51, Iris's calls 1 to 4,
amendment 1). Decisions: `.crew/sprint/37/decisions.md` (1 to 10).

### What a visitor gets
- At rest, "▶ Replay sprint N" under `/crew`'s status, and the same link at the end of `/`'s rest
  line (server HTML, 0 B of new script on `/`).
- A press (or arriving at `/crew#replay`) plays the sprint's moments one every 1.5 s, newest on
  top, each with its real UTC time, under the heading "Replay, {day} (UTC)". "Pause replay" (Space)
  pauses and resumes. Same pace in Full, Calm, Off and reduced motion; nothing in it moves.
- The drawing stamps REPLAY; the sprint's plank goes back to pencil and ticks once per moment, then
  inks at the merge. Nothing is copper. The panel's head (chip, status, table) keeps telling the
  present, and any poll that isn't "resting on that sprint" ends the replay.
- `/api/crew`'s resting answer carries `run.replay` (call 6), so a stale page still offers it.

### Checks
- New: B4.43 to B4.51 (Probe), red first on the head, all 9 green on the build.
- **Loosened, for Lens to accept (call 8, decision 9):** B4.14 and B4.31, `/crew`'s script beyond
  the 404's from 18,432 to 20,480 B and beyond `/log`'s from 16,384 to 18,432 B. Measured on
  fb5274d: 18,508 B and 16,469 B (76 B and 85 B over main's figures after the panel was unmemoised,
  saving 3,049 B; fitting main's would leave under 30 B). `/`'s script is unchanged.
- **Rewritten, same assertion (decision 10):** B4.26 compares the panel's text without
  `p[data-tick-key]`: the tick key (rider 3, checked by B4.50) follows the drawing's state, not the
  told answer.
- Retired: none.

### Riders
- Lens's nit on #91: the poller's "outside React's tree" comment and Forge's memory line corrected.
- Lens's nit on 2feab08: the 3D ticks' weight reads `MARKS.width` (`lib/model/stage.ts`).
- Iris's key for the ticks (B4.50).

### For the owner
Nothing to decide. The preview won't offer a replay while this PR's own run is live; after the
merge, production at rest offers "Replay sprint 37". Not verified from the cloud: Safari, Firefox,
iOS, a real GPU, and a screen reader.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaPfxrpoQ2v9m6WTh1
