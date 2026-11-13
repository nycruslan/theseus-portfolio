## Sprint 65: a chart of every window, and the crew's seven fits to find

**Goal (from the roadmap, milestone "Try to sink it", sprint Tc):** under the trials frame, every window the crew swept drawn as a chart, width across and height up: the windows where the contact links sink hatched as one band, the crew's windows pinned with their freeboard, soundings to try, and a ring where the frame is. Without script the soundings are links; with script a tap anywhere tries that window in place. The seven fits the crew wrote into the stylesheet to keep `/`'s first screen whole are there to find, each stamp quoting its sprint's retro.

**Size:** M. Contract: `.crew/sprint/65/contract.md` (Quill; T16 to T21, seven calls). Decisions: `decisions.md` (1 to 10). Iris's placement and words: `placement.md`, `words.md`, frames in `design/`. Probe's mutant: `mutant.md`.

### What a visitor gets
- **The chart** (`components/trials-chart.tsx`): an `svg` figure whose plot is in window px. The band is drawn from the committed sweep already in the bundle, so nothing is fetched (call 1). The caption gives the sinking count and the total, computed from the sweep, never typed.
- **Pins, soundings, the ring:** the crew's windows as px dots (H10's run as one bar), soundings as 44 px links carrying their signed freeboard, the four named near misses among them, and the ring at the shown window. At 320 the two laptop soundings' targets shift 4 px apart and keep their dots on their points (decision 5).
- **Tap to try** (`lib/trials-live.ts`): a tap on the plot settles by Tb's rule; a tap on a crew's dot settles on that window (decisions 9, 10); a sounding's tap tries it in place, and Ctrl/Meta-click opens it.
- **The seven fits** (`lib/trials-fits.ts`): each stamp carries its query verbatim and links to its line, names who drew, checked and tested it, and quotes its retro's first "went wrong". Found fits count for the visit only, in `sessionStorage`.
- **Placement** (decision 7): the stamps go last on the page; from 1024 the frame gives the chart its block, so the chart is in the first screen beside the frame.

### Checks
T16 to T21 in `e2e/trials-chart.spec.ts`, two tests so shard 2 keeps its set. The contract mutant ran the unedited suite green, 418 of 418 (`mutant.md`).

**Named rewrite:** T10 (`trials-drag.spec.ts`), "after the touch, at most 8,192 B gzip" becomes 10,240 B: Tb's 8,192 plus Tc's own 2,048 (contract; sprint 64's decision 6). Nothing else in T10 changed. No check is retired.

### Fix on this run
CI's only red on e21ceb3 was T18: a click on 1024 × 640's dot settled at 1024 × 645 (16.7 px, not 11.7), because from 1024 wide a grid row is under a screen px and decision 9 hadn't been built. Pixel's 61ee0b9 hit-tests the crew's marks in screen px before the plot's rounding; T18 fails on e21ceb3 and passes with it in Pixel's worktree. Decision 10: a drawn dot wins a tap over a sounding's unpainted target that covers it.

### Budgets
- Trials script at load beyond the 404's: 1,008 B gzip (≤ 1,024).
- After the first touch: 9,410 B gzip (≤ 10,240). The controller chunk is 8,313 B.
- The chart's data: the sweep in the bundle, no request.
- The sweep was re-taken after the retro (call 2): `lib/trials-sweep.json` changed (the script: 13,103 windows with the off-grid ones, 2,251 sink; 2,249 before).

### Not verified
Real Safari, iOS and Firefox; a real finger near a dot under a sounding's target; what screen readers announce (DOM text only). The first run's agent tokens aren't in the retro.

No owner path is touched and no Owner's pick is asked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdBRr7qjE7pMAbaZje
