# The yard (Quill, sprint 52)

## The outcome

On the Log, a visitor rebuilds the Theseus themself, one real sprint's plank at a time, and watches
each plank it replaces land in the ghost hull beside it. At sprint 23 the last original leaves, and
they hold Hobbes's question with a real ship: which one is the Theseus? Every step has its own
address and card, so the moment they send is the record itself.

This is the owner's goal for sprint 52 ("something genuinely cool visitors want to play with and
share"), built on Iris's direction A (`direction-iris.md`, canvas linked at its top) and Pixel's
measurements (`headroom.md`). Nothing on `/` changes until the milestone's last sprint, Ye.

## Why this serves `PRODUCT.md`

- **Belief 2 (he can run an AI org).** The toy is the crew's record. Each press is one merged
  sprint, and its record says who drew, checked, tested and approved it, and what went wrong. A
  visitor who plays it has read the proof without being asked to. Nobody else can copy a toy built
  from 50 real sprints (`research.md`, section 4).
- **Belief 3 (taste).** It answers the brief's own idea, the ship of Theseus, with the famous
  paradox made literal. One gesture from the subject's own world, a short loop and a reveal against
  the truth are what made 2026's shared toys spread (`research.md`, section 2).
- **Principle 2 (every visible change maps to real work).** The visitor only sets the pace. Every
  plank that moves is a real merge, in the seat order the site already keeps
  (`lib/lines-plan.ts`'s `ORDER`). Nothing is invented.
- **Principle 4 and the brief's novelty budget.** The yard lives in the archive moment the brief
  already budgets (`design/brief.md`: "the archive, one click deep"). It spends no novelty on `/`.

**The visitor, plainly.** A hiring executive won't spend a minute pressing planks, and the plan
doesn't ask them to. `/`'s first screen (name, role, scale, contact) never moves for this milestone
(`.crew/sprint/51/five-second.md`). The yard is for the second reader, the engineer or peer who
stays and sends the link. What they send lands on `/log/23`, with the owner's name and role on its
card. If the yard can't be played and shared without script, it isn't done: Off is a first-class
mode, not a fallback.

## Facts this plan rests on

These were measured on production (theseus-portfolio.vercel.app, 2026-11-07, scripts off), read
from the code, or taken from `headroom.md`:

- **The record.** 50 merged sprints: 1 to 15 and 17 to 51. Sprint 16 closed without a retro and
  isn't on the Log. The 22nd merged sprint is 23, so the last original leaves at step 23. The 44th
  is 45. Steps follow the Log's seat order, by sprint number. That isn't always merge order (#75
  merged after #76), so no copy says one step merged after another.
- **/log today, 1440 × 900.** The ghost drawing sits at y 178 to 357, 900 px wide. Every
  revision's h2 is at 491 and the first row at 650, 250 px inside B5.3's fold.
- **/log today, 390 × 844.** The ghost drawing is at 137, 71 px tall, and the count line at 277. The
  foot row (Read as page and the motion control) runs from 462 to 506, Every revision's h2 is at
  546 and the first row at 717, 127 px inside the fold.
- **The record's own previous and next are below the fold on every record.** On /log/13 they're at
  y 1208 at 1440 × 900 and 1290 at 390 × 844. On the newest record (51) they're at 1030 and 1071.
  The record's h2 is at 524 and 595. A step control has to move to the record's head to be pressed
  without scrolling.
- **The 3D ghost has never drawn gaps on production.** B5c (sprint 33) shipped after sprint 23
  merged. `lib/model/hull.ts` does handle a missing seat ("a gap leaves none"), and the chunk reads
  its seats off the drawing (`lib/model/ghost.ts`). So a step page's 3D ghost follows its drawing,
  but nobody has watched it do so.
- **A wording defect a step page would show.** `countLine` (`components/log.tsx:42`) and Probe's
  `GHOST_COUNT` (`e2e/retros.ts:335`) read "replaced 1 planks" one step after 23, and "1 of 22
  original planks are out" at step 1. Today's 50 merges hide both.
- **Budgets** (`headroom.md`, section 2). The loader has 11 B left of B2.10's 2,048 B, so all play
  code rides the lazily loaded 3D chunk, which has 95,065 B left of 250,000. Draws: 5 for the ghost
  on /log against 8. Triangles: about 25,000 for the ghost from 768 px against 30,000.
  WebGLRenderer and GLSL only. three/webgpu alone is 272,011 B.
- **A contradiction in the direction's numbers.** Iris counts two hulls on /log as 5 + 3 = 8 draws.
  Pixel measured `/`'s card hull at 4 draws (card, seams, outline, shadow), which makes 9 unless the
  Theseus drops or batches one. Two desktop hulls are about 50,000 triangles against 30,000, so
  each needs a lower level (Iris estimates about 14,000 each). Yc's spike settles both before its
  contract.

## The sprints

Iris's slice 1 (L) becomes four sprints, Ya to Yd, each a PR that leaves the site whole. Her slice
4 (the door) is Ye. The checks are numbered across the milestone, Y1 onward, as the keel's were
(K1 to K12). A check's number is fixed when its sprint's contract is written. The ranges for Yb to
Ye below are the plan.

### Ya (M): every step is a page

The contract is `first-contract.md`, with checks Y1 to Y8.

`/log/n` draws the Theseus and the ghost hull as they stood after sprint n, server-rendered, from
the rule the site already keeps. `/log` draws them as they stand today. The record's previous and
next become the step links, moved into the record's head, where they're in the first screen. `/log`
gets "Start again", to the first step. At the step where the last original leaves (sprint 23), a
line asks which one is the Theseus. The count line describes the step, and its two wording defects
are fixed.

No script is added. Every mode plays it, each step a document navigation, and Back walks back
through the steps. In Full and Calm the 3D ghost follows its step's drawing, gaps included. The
Theseus stays a drawing until Yc.

- **Why it's first, and worth playing.** It's the whole yard with nothing loaded. Press "Seat sprint
  14's plank" and both ships change. "Start again", then 21 presses (1 to 15, then 17 to 23), and the
  question lands. Every
  step is a URL that reproduces the moment, so it can already be sent. It's the composed Off state
  Yc and Yd build on, and it settles the record's truth at all 50 steps before anything flies.
- **Who builds it.**
  - Iris first: the placement call.
  - Forge: the Theseus drawing, the step pages, the links and the CSS.
  - Pixel: the 3D ghost on partial steps, and making sure the chunk never reads the Theseus. In
    parallel, in a scratch worktree, Pixel runs Yc's spike (two hulls' draws, triangles and frame
    times, and the per-plank transform's bytes) and writes it up for Yc's contract.
  - Probe: Y1 to Y8 red first, the contract mutant, and the rewrites the contract names.
- **Checks Y1 to Y8:**
  - Y1: each step's drawings.
  - Y2: the plank that just went in.
  - Y3: the words.
  - Y4: the links and the walk to 23.
  - Y5: the first screen.
  - Y6: whole in every mode.
  - Y7: accessible.
  - Y8: budgets.

### Yb (S): a card for every step

Each `/log/n` gets its own social card and title.

- The card shows both ships as they stood after n, drawn by Ya's rule.
- It carries the sprint's line and the owner's name and role, quoted from `content/profile.ts`.
- At step 23 it carries the question.
- `/log` and `/`'s cards don't change.

It comes second because the card is the share, and Ya's rule must exist first.

- **Who builds it.** Forge builds it, and Probe checks it. Iris judges the card at 1200 × 630 and
  its preview at the sizes the big networks crop to.
- **Checks Y9 to Y11:**
  - Y9: one card per step, served as `image/png`. /log/13's differs from /log/23's.
  - Y10: its words come from the record and `profile`, with no figure the crew wrote. Iris's frame
    says "replaced every original plank of this site in 23 sprints" and "Sprint 23 of 51". Both get
    checked against the record before the build: 22 merges, and 50 merged sprints numbered up to 51
    (memory: sprint 28's honesty check).
  - Y11: each step's title and description. B5.8's "own card" passes are kept.

### Yc (M): the press, in 3D

Pixel leads this sprint, and Forge builds the controller's page side.

- In Full and Calm the Theseus joins the ghost in one canvas.
- In Full, a press of a step link lifts the plank that leaves, arcs it to the ghost's seat and
  seats the new card plank. Calm uses the site's 240 ms linear fade instead.
- The page's words become the next step's, and the URL is replaced, not pushed.
- ← and → step. A live region names the step when the press is released.
- Any key, press or scroll lands a moving plank at once.
- Off and no script stay exactly Ya's.

It starts from Pixel's spike, run during Ya.

**What Yc's contract must settle first:**

- Draws: 9 or 8.
- Each hull's level against 30,000 and 12,000 triangles.
- Where the step's words come from without a navigation. Either the chunk reads the table already
  on the page (as it reads the drawing), or it fetches the next step's prerendered HTML. One of
  them, measured.
- What leaves at steps 24 to 51. There the plank going out is a crew plank whose seat the ghost
  already holds. Iris's storyboard draws only originals leaving, and the second ghost comes later.
  Iris and Pixel's call.

**Checks Y12 to Y18:**

- Y12: two hulls registered on their two drawings at frame 1.
- Y13: a press in Full: one plank moves, and only while it moves are frames drawn.
- Y14: Calm and reduced motion never fly.
- Y15: any input lands the plank.
- Y16: the URL is replaced and history doesn't grow, and the step's words and record are the
  server's for that step.
- Y17: ← and →, and the live region.
- Y18: budgets. 0 B on the loader. The chunk delta is reported, against an estimate of 4 to 7 KB.
  Draws ≤ 8, triangles at or under budget, 0 frames at rest.

### Yd (M): hold to riffle

Pixel leads this sprint, and Forge builds the controller's page side.

- A held press or key riffles: 400 ms easing to 80 ms a step, two ships trading planks.
- The riffle stops itself at the chapter steps: the 22nd merge (23), the 44th (45) and the newest.
- Home and End go to the first and newest steps. Keyup, a release or Escape stops the riffle.
- At the newest step, a plain link hands off to the live crew ("Watch the crew build the next one
  on Crew"). The link is also in 2D on `/log` and the newest record.
- Calm holds a step every 400 ms, never faster.

**Checks Y19 to Y23:**

- Y19: the riffle's timing on the clock (`page.clock`), and its stops.
- Y20: Home, End, Escape and keyup.
- Y21: the hand-off link, in 2D and 3D.
- Y22: frames only while moving, and the riffle never queues past a stop.
- Y23: INP during a riffle, reported (not gated, as B3.9's isn't).

### Ye (S): the door from `/`

One plain link on `/`'s revision block count line ("Rebuild it yourself", Iris's words) opens the
yard at its first step. It's server HTML, 0 B of script.

- Its fit is measured from 320 to 1440 before the contract, by injecting it into production's DOM
  (memory: sprint 38). If it doesn't fit, it waits, and the milestone closes without it.
- It's the one sprint that touches `/`. It adds a Tab stop before Contact, so B2.3's bound of 25
  becomes a named rewrite for Lens, unless the link takes the place of the block's existing Log
  link.

**Checks Y24 to Y26:**

- Y24: the link, its target and its words.
- Y25: the first screen unchanged. W1 to W17, B1.1, B4.22, P3 and P8 stay unedited.
- Y26: the Tab order on `/`, rewritten with its strength.

### After the milestone's demo, if the yard earns it

These are Iris's slices 2, 3, 5 and 6. Each has a question to answer before it can be a contract,
so they aren't scheduled:

- **The record in the motion (M).**
  - A fix round is a bounce. That publishes retros' `fixRounds`, which is written before the merge,
    so check that it stays true after the merge (`.crew/STATE.md`, "Publishing team files").
  - Sprint 16 is a struck pencil plank. It has no retro, and the site reads nothing about closed
    sprints, so this needs a public record of closed sprints that doesn't exist yet.
  - The hand-off has moved into Yd.
- **The fleet (M).** The crew's first ship joins the yard at 45 as a second ghost, plus two named
  viewpoints on phones. Three hulls need lower levels, measured.
- **The visitor tally at 23 (S).** Only if the owner wants it (see below).
- **Sound (S, optional).** One knock per seated plank, off by default, ≤ 10 KB, by the brief's sound
  rule.

## Budgets (every sprint)

| Budget | Limit | Now | Check |
|---|---|---|---|
| Loader script on `/`, `/log` and records, WebGL refused | within 2,048 B of the 404's | 2,037 B (11 B left) | B2.10 and B5.10, unedited: every sprint adds 0 B |
| The 3D chunk | ≤ 250,000 B gzip -9 | 154,935 B | B3.6 and B5.23, unedited; each sprint reports its delta |
| Draws a frame on /log | ≤ 8 | 5 (the ghost) | B5.23; Yc's spike decides how two hulls fit |
| Triangles a frame | ≤ 30,000 from 768, ≤ 12,000 below | about 25,000 (the ghost, from 768) | B5.23; two hulls need lower levels |
| Frames at rest, off-screen, hidden | 0 | 0 | B5.23, unedited: frames only while a plank moves |
| LCP | text in main, ≤ 2,500 ms at 4x CPU | text | B5.10, plus Ya's Y8 for the Theseus drawing |
| CLS | 0 | 0 | B5.25, plus Ya's Y8 on more steps |
| `/`'s first screen | unchanged | — | W1 to W17, B1.1, B4.22, P3 and P8, unedited through Ye |
| Stack | WebGLRenderer and GLSL | — | No three/webgpu: 272,011 B alone (`headroom.md`) |
| Motion | Full flies; Calm and reduced motion fade in 240 ms; Off loads no WebGL | — | B3.17 to B3.21, B5.21 and B5.22, unedited |
| CI | each shard under its 20-minute cap | — | reported; Ya adds a 50-step walk, so Probe reads its shard's time before the label |

## Out of scope for the milestone

- **Anything on `/` before Ye,** and the loft, the live layer and the sheet's hull.
- **New public retro fields** (`fixRounds`, `minutes`) and a record of closed sprints. Both are
  after the demo, each with its own check that what it publishes stays true.
- **A step 0 page.** `/log/0` stays a 404 (B5.6). "Start again" goes to the first merged sprint, so
  every step is a real merge. Yc may show the empty yard for a moment in 3D, with no URL.
- **The pencil and the live feed on /log.** /log stays static. The hand-off links to Crew instead
  (Yd).
- **Visitor input that writes anything,** unless the owner picks the tally.
- **A timeline slider, drag, a free camera or a physics engine** (`direction-iris.md`, "Defaults I
  steered away from"; the brief's named viewpoints).
- **The lines figure as of each step.** Each merge record holds its own figure, but the figure names
  its commit, so today's stays true on every step. It's a follow-up, since B5.14 pins the newest
  record's figure on /log and /log/13.
- **Owner paths and `content/`.** No sprint here touches either.

## The owner's calls: none blocks the work

1. **The direction.** Iris recommends A, the yard, on the canvas
   (https://claude.ai/artifact/LwQHtrkAkhMAmC4aJH1rEE). A fits `design/brief.md` as it stands. If he
   prefers B (pull a plank, on `/`) or C (draw your own, `/draw`), that's his change to the brief's
   novelty budget, an owner path. Ya's step pages are worth having under any of the three, so the
   build starts on A.
2. **A visitor tally at sprint 23** ("Same ship" / "New ship"): the first time a visitor would
   write anything to the site. Recommended: **no tally**, so the question stands unanswered on the
   page and the card. The other options are an anonymous two-button tally (rate-limited like
   `/ask`), or deciding after the fleet. It can be undone either way, so nothing waits on it.
3. **Still open from #101,** unchanged: which proof comes after the first window (`ROADMAP.md`,
   "Finished: the record you can check").

## The demo

Quill judges the milestone at Yd's preview, and again at Ye's merge on production, as the second
reader would:

- Can they tell in five seconds on /log that the ship can be rebuilt?
- Do they reach 23?
- Does the question land?
- Does the card make someone want to open it?

The owner judges the feel on a GPU and a phone, which the cloud can't: SwiftShader frame times only
rank (`headroom.md`).
