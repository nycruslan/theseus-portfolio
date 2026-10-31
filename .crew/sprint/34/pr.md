## Sprint 34: the live layer on `/` (B4b)

**Goal (roadmap):** B4b, the second build sprint of B4, as sprint 28 planned it
(`.crew/sprint/28/b4-plan.md`, B4.2): on `/`, the crew's state is on the drawing. This is the B4
demo: the first change to the visitor's first screen since B3.

**Size:** M. Contract: `.crew/sprint/34/contract.md` (Quill, B4.15 to B4.24, with amendment 1).
Decisions: `.crew/sprint/34/decisions.md`. Iris's calls: `.crew/sprint/34/notes-iris.md`; her
review: `.crew/sprint/34/review-iris.md`.

### What a visitor gets

The same cached feed read as `/crew` (30 s), with `/` still prerendered (`○ / 30s 5m`) and 0 B of
new client script:
- **In progress** (`live` or `open`): the next seat in the shipwright's order is a pencil plank, in
  the 2D drawing and on the 3D hull: hatch, graphite dashed edge, and the sprint's number on a
  film chip. Its row leads the revision block, linking to `/crew`, and the block keeps five rows.
- **Live only:** a copper tip on the plank (a 2 px run ending in an 8 px dot), and "drawing now" in
  copper beside the row's goal.
- **Open:** no copper; Approved reads "Waiting for owner" when the run waits on the owner.
- **Resting:** the revision block's first line is `/crew`'s resting line word for word, e.g. "Crew
  resting. Sprint 31 merged 31 Oct, 01:50 UTC."
- **The legend** gains "In progress" and "Drawing now" only while they're on the drawing.
- **Down** (no feed, a bad answer or a stale one): `/` is today's sheet exactly (B4.20 compares
  `main`'s HTML byte for byte).

### Calls made along the way

- **The pencil seat** (Quill): a sprint already in the build's retros keeps its own seat; otherwise
  the next seat, `ORDER[k mod 22]`. The plan's bare rule would move sprints 32 and 33 on this PR's
  preview once sprint 34's retro lands. Production's `/` will draw 34 in pencil on 4.0.
- **No row traded for the rest line** (Iris): sprint 25's `.sheet-row` min-height leaves 41 px of
  slack at 1440 × 900, so the contact links stay at 866.3 in all four states and B1.5 stands.
- **The rest line names a merge, not a seat** (Iris, Quill): the newest seat and the last merge can
  name different sprints (today 33 and 31).
- **The hull's tip costs 2 draws and 18 triangles while live** (4 → 6 draws, under 8; 25,285 against
  25,267 at 1440), accepted by Atlas as Iris's call. 0 frames at rest in every state.

### The checks

B4.15 to B4.24 plus a harness check (`e2e/live-layer.spec.ts`, oracle in `e2e/live-layer.ts`):
red before the build on abc2266 (1 passed, 10 failed: `/` stayed down), green after. Full suite:
220 of 221 on Forge's run at e920318 and on Probe's (one load timeout each, B3.16 and B2.9's light
axe, both green when rerun), then 20 of 20 of the model and axe checks on 6660779, 13 of 13 of B4.21
and the Log's model checks after Pixel's rounding, and `pnpm verify` green on 95223d2.

**Kept and edited:** only B4.3's `/` block in `crew.spec.ts`, two assertions rewritten with the same
`expect(`s, since `/` now carries the goal and copper by design: the goal leaves the list of feed
words `/` mustn't show, and the copper scan excludes the layer's own parts. Its "no
`[data-crew-state]` on `/`" assertion stays. **No check retires.** Moved code with assertions
unchanged: `readPlan` to `e2e/plan.ts`, B1.1's reads to `e2e/first-screen.ts`, `crewTest` to
`e2e/crew-feed.ts`.

**Skips and departures, at Lens's ask:** `e2e/live-layer.spec.ts` skips under
`PLAYWRIGHT_BASE_URL`, as `crew.spec.ts` does (a deployed site has a feed, so it isn't the down
reference, and the fixture sites copy this checkout's `.next`; CI never sets it). B4.21 judges where
the canvas changes, and where copper lands, at frame 1, where the model lies on the drawing, not at
rest: `/` has no seat pick to find the plank at rest (`decisions.md` 7).

### Lens

**Ship on b2b87d7**, no Important, three nits: the two above, now recorded, and a blank feed goal
rendering an empty link to `/crew`, which rides the next sprint that touches the layer.

**Fix round: CI's 25-minute cap.** `check` was cancelled in `pnpm test:e2e` on 316a660. Probe's
415b4c0 starts each feed spec's sites together (7.4 to 3.5 min, no assertion changed); `check`
passed in 20.3 min and Lens shipped 415b4c0 again, with three test nits riding (`decisions.md` 9).

### Iris

**Verdict: ship, 8.7/10**, no musts. axe `[]` on 56 runs, overflow 0 at 320, LCP text 1.86 to
2.31 s at 390 on 4× CPU, CLS 0, reduced motion opens settled. One cheap change taken: the riding
numbers' offsets are whole device pixels at rest (6660779, on `/` and the Log). One left for a later
sprint: on a short seat (3.0) at 1024 and below the number's chip covers the copper dot; today's
seat 4.0 is clean.

### Riders taken

- Lens's two comment nits on #78 (`lib/sprint-log.ts`, `next.config.ts`).
- Lens's three test nits on #78 (`crew.spec.ts` in order on one worker, its 40 s deadline, its skip
  under `PLAYWRIGHT_BASE_URL`).
- Lens's two nits on 9b8743a (a restored context drops the hovered mark; a tap keeps its mark until
  the page goes).

### Not verified

A GPU and a real phone (every 3D frame here is SwiftShader), browsers other than Chromium, and the
real feed on this PR's preview, which the cloud can't read (the checks run on fixtures). The owner
sees the pencil and copper on the preview while a run is live, and the rest line after.

No owner path is touched, and nothing here waits for the owner.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdBTafidrmU5SbRjj3
