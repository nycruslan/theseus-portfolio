# B4d contract: the hull on `/crew`, one mark per moment

Quill, 2026-10-31, during sprint 36, for the run that builds it (PR #91). It is the plan's B4.4
(`.crew/sprint/28/b4-plan.md`), drawn to `crew-1440.webp` and `crew-390.webp`
(`.crew/sprint/17/design/`). It reuses, by reference:
- the model, the modes and the control as sprints 25 to 27 shipped them;
- B5c's second-route mount (`.crew/sprint/33/contract.md`, calls 2, 3 and 6, "Calm", "Off");
- B4b's pencil plank, tip and hull (`.crew/sprint/34/contract.md`, "The drawing" and "The hull");
- B4c's poller and its rules (`.crew/sprint/35/contract.md`).

Their data rules hold word for word except where this one changes them. Numbers come from three
sources, each cited where it's used:
- this branch (`1294677`);
- a scratch build of it with `<Model>` and `<MotionControl>` on `/crew`, plus a sketch of the abort
  and the marks (thrown away; see "Measured");
- the sprints that measured them.

Iris's calls (her message to Quill this sprint) are written in and marked "Iris". One is still
open, the 3D pose numbers, marked **[Iris pending]**.

## Outcome

A visitor on `/crew` sees the crew's run as a detail drawing of the hull, close on the plank the
crew is drawing now:
- That plank is in pencil, with the copper tip while the crew is live.
- It carries a tally: the sprint's number, then one graphite tick for each moment the panel lists,
  then the copper pen. A tick is added when the poll brings a moment, without motion.
- At rest, the detail is centred on the newest seat, with no pencil and no ticks.

Full lifts the card model off that detail in one move when the page opens. Calm opens settled. Off
is the same detail in 2D, with the same pencil, tip and ticks, and downloads no 3D. The choice is
the one the visitor made on `/` and `/log`, and Full/Calm/Off now sits in `/crew`'s bar.

## The calls I made

1. **Marks are pencil, so they live only on the pencil plank** (Iris agrees). In `live` and `open`
   with a sprint number, the ticks equal the moments shown (at most 10, B4c). At rest and in `down`
   there are none.
   - Pencil is the drawing's word for "in progress" (B4b). A merged plank is inked, so its marks go
     with the pencil.
   - This is also the only rule that keeps "marks = moments shown" true in every state without a
     plank to put a resting run's marks on.
2. **The focus plank is fixed at first paint, and no poll moves it.** `[data-plan]` carries
   `data-focus`:
   - in `live` and `open`, the pencil seat, by B4b's rule;
   - otherwise, the newest retro's seat (the revision block's top sprint, `readSprintLog()[0]`).

   Today these are 6.1 for sprint 36 (k = 34, `ORDER[12]`) and 0.2 for 35. The fixtures' 31 is on
   3.0. The crop is server-rendered around it (Iris, below). Moving the crop or the camera on a poll
   would be motion on an update, which B4c ruled out in every mode.
3. **The drawing follows the poll for its own sprint, and claims nothing for any other.** The
   server draws the page's state. The drawing has no client geometry, so it can't seat a new plank.
   Each told answer sets `data-run`:

   | The answer tells | `data-run` | The drawing shows |
   |---|---|---|
   | `live`, the drawing's sprint | `live` | the pencil, the tip, and ticks = moments shown |
   | `open`, the drawing's sprint | `open` | the pencil, no tip, and ticks = moments shown |
   | `resting`, with `last.sprint` the drawing's sprint | `inked` | the plank seated (card fill, solid ink edge), number n in ink 700 with no chip, no tip, no ticks. The merge took the seat |
   | anything else: another sprint, a run with no number, or `down` once B4c's 10 minutes are up | `record` | every plank as the down page seats it (`data-sprint` and fill), the focus plank's number its holder's in ink 700, and no pencil, tip or tick |

   So a run that starts while the visitor watches gets its pencil on the next load. The panel tells
   it at once. Copper stays only while the poll says live (B4b's rule, now on `/crew`).
4. **The loader doesn't change.** `components/model.tsx` stays byte for byte as it is (B2.10
   leaves `/` 9 B). The chunk reads everything off the drawing:
   - which detail drawing is shown;
   - `data-focus`;
   - the pencil's `data-pencil`, `data-sprint` and `data-live`;
   - `data-run`;
   - the shown `[data-mark]`s.

   It redraws on a `MutationObserver`, which is the interface sprints 33 and 34 set between Forge
   and Pixel.
5. **"Hidden" is about frames, not the request** (sprint 33, call 6). The paths that never request
   the chunk are B3.5's Off paths:
   - `off` stored, or Off pressed;
   - WebGL refused;
   - forced colours;
   - Save-Data with nothing stored;
   - print;
   - scripts off.

   A tab hidden at load may still fetch the chunk on idle, as `/` and `/log` do. It draws 0 frames
   while hidden.
6. **One storage key, `theseus:motion`, and the move plays once a visit on its own flag.** The flag
   is `theseus:crew` in sessionStorage. This follows `/log`'s precedent (sprint 33, calls 2 and 3):
   - a reload or a Back opens settled;
   - a new tab plays the move;
   - a press of Full replays it.
7. **`/crew`'s script budget becomes the sum of two allowances already granted.** The two are B4c's
   poller (16,384 B) and B2.10's model loader (2,048 B), so 18,432 B beyond the 404's.
   - Measured: the model and control alone take `/crew` from 13,659 B to 15,550 B. The sketch with
     the abort and the marks reaches 16,171 B. That leaves 213 B under today's 16,384 B, which is
     no margin for a real build.
   - Turbopack folds `model.tsx` into `/crew`'s own chunk (+1,891 B), so it isn't `/`'s 2,039 B
     file.
   - This loosens a live bound, so Lens accepts it with this reason in the PR.
8. **`/` doesn't change.** Iris's #87 rider (the chip over the copper dot on a short seat) is
   settled on `/crew` by design, since the number sits at the tally's stern end. On `/` it stays
   open, because B4d doesn't touch `/`'s layer.

## Data rules (the page, the chunk and Probe's oracle implement these word for word)

**The page.** `/crew`'s `main` holds, in this order:
1. `[data-plan]`;
2. `<Model>` as `[data-model]`, the element right after `[data-plan]`;
3. the foot;
4. the panel.

The bar gets `control={<MotionControl />}`, in the slot `/` and `/log` use, after Read as page from
768 px (Iris: 186 × 44 from 768 to 1023, 142 × 32 from 1024, at the bar's right end). Below 768 it
is `<Foot control={<MotionControl />} />`: Read as page at the left and the control at the right,
in one 44 px row, as on `/` (Iris confirms). The mode rules are sprint 27's, unchanged.

**The detail drawing** (Iris). `/crew` no longer draws `PAGE` (`/read` keeps it). It draws two
detail layouts in `lib/hull-layouts.ts`, one shown per width, as the sheet's `.plan-wide` and
`.plan-narrow` are:
- **The layouts.** Each shows 320 hull units across, in a 16:9 box:
  - `CREW_WIDE` from 768: box `[0, 0, 808, 454.5]`, s = 2.525;
  - `CREW_NARROW` below 768: box `[0, 0, 390, 219.4]`, s = 1.21875.
- **The crop.** oy = 24·s. ox puts the crop's centre xc (hull units) on the box's centre:
  - in `live` and `open`, xc = tip − 26·f, the tally's middle;
  - at rest and in `down`, xc is the focus seat's body middle;
  - xc is clamped to [140, 484].
- **Every plank's path stays in the drawing,** clipped by the box, with its `data-plank`,
  `data-sprint` and class as B4b draws them. So B4.1's plank list still matches `/`'s.
- **The sizes this gives** (Iris's table): 808 × 454.5 at 1440 (a lift 37.9 px deep), 553 × 311
  at 1024, at most 600 wide from 768 to 1023, 358 × 201 at 390 (16.8 px), and 288 × 162 at 320
  (13.5 px). At 390 the drawing is 38 px shorter than today's, so the panel rises. The hatch
  period stays `PENCIL`'s 6 viewBox units.
- **The pencil**, in `live` and `open` with `run.sprint` set, follows B4b's "The drawing":
  - the seat comes from B4b's "The pencil seat";
  - the plank carries `data-pencil`, `data-sprint` = n and, in `live`, `data-live`;
  - it has the hatch and the dashed `--muted` edge;
  - in `live` it gets one `[data-tip]`, from 1/2 to 7/8 of the body as on `/`.
- **Lettering.** Exactly one number is lettered on the focus plank, at every width:
  - in `live` and `open`, n at the tally's stern end, x = tip − 52·f, at the band's mid-depth, on
    B4b's film chip in graphite 600;
  - at rest, `down`, `inked` and `record`, the seat's holder (n when inked), in ink 700 with no
    chip.

  The other planks' numbers show in 2D from 768, as `PAGE` draws them today. A number whose anchor
  falls outside the box isn't lettered. 5.0's leader is drawn as every drawing draws it.
- **Paint order:** plank, edge, ticks, then the tip, so the copper dot covers nothing and nothing
  covers it.
- **The attributes.** `[data-plan]` carries `data-focus` (call 2) and
  `data-run="live" | "open" | "inked" | "record"` (call 3). The server's value is the page's state:
  `live`, `open`, or `record` at rest and in `down`. The browser updates it on each told answer, by
  call 3's table. An answer that changes neither `data-run` nor the tick count changes no node in
  `[data-plan]`.

**A tick** (Iris): one short straight stroke per moment, the same for every kind. Kind is told by
the list's words.
- **Its numbers** live in one `MARKS` constant in `lib/hull-layouts.ts`, beside `PENCIL`, shared
  by the 2D and the 3D.
- **Where.** It stands on the pencil plank's lower edge (the tip's edge: the seam, or the keel's
  outline on lift 6) and rises h = 3.5 hull units into the plank: vertical in 2D, and from
  nearSide(x, bottom) to nearSide(x, bottom − h) in 3D.
- **Spacing,** by order, never by time. Tick i (0 is the newest, up to 9) sits at
  x_i = tip − (6 + 4i)·f, where tip is the dot's x (`PENCIL.tip.to`).
  - f = min(1, (tip − xs) / 54), with xs the sternmost x on the plank whose band is at least 6
    units deep.
  - f depends on the seat, never on the count. It is 1 on every seat but the short stern ones
    (3.0 and 5.0; Forge lists the rest).
- **How it changes.** A new moment fills the next slot aft, and no shown tick moves. Past 10 the
  ten slots stay as they are.
- **Its look.** Graphite, `--muted`, 1.4 px, non-scaling, never copper. Forced colours paint it
  `CanvasText`.
- **Its hook.** Each shown tick is a `[data-mark]` in the shown drawing's `svg`. A tick that isn't
  shown is absent or `display: none`. A tick has no transition or animation, in any mode.

**The hull on `/crew`** (Pixel):
- **What it shows.** It is `/`'s card model, seated by the drawing's planks, registered on the
  shown detail drawing. It has B4b's hull pencil: the hatch, the edge, and the tip only while
  `data-run` is `live`.
- **The ticks** come from `MARKS`, in the stage's existing `marks` batch, recoloured graphite at
  1.4 px: one draw (Iris).
- **The focus plank's number** rides it at every width, as `/`'s pencil number rides. No other
  number shows on the hull.
- **`inked` and `record`** draw the plank as seated card with no hatch, edge, tip or ticks.
- **The levels.** The desktop level and the 2× cap apply from 768 px, and the phone's level and the
  1.5× cap below.
- **Frame 1** lands on the 2D detail within B3.1's bound (1.0 CSS px at DPR 2, 1.5 at DPR 1).
- **Full** turns and lifts as `/`'s loft, with no growth, over 1.8 s on the loft's ease, once a
  visit. The focus point stays on its frame-1 screen point within 1 px through the move. That
  point is the tally's middle on the lower edge in `live` and `open`, or the body middle
  otherwise. The canvas lies on the drawing's box and clips the hull. B5c's inputs (key, pointer,
  wheel, touch, scroll) settle the move within 2 frames. **[Iris pending]**: the yaw, pitch and
  lift numbers.
- **Calm** opens settled. Under reduced motion with nothing stored, `/`'s 240 ms fade applies.
- **At rest** it draws 0 frames, and exactly 1 when `data-run` or the shown ticks change, on a
  scheme change, or on a refit. `[data-model]` carries `data-marks`, the count of ticks the last
  frame drew. That is the one test hook beside `data-state`, and nothing goes on `window`.
- **The trap.** `.crew-page > [data-plan]` sets `order` below 1024 px, so the layer needs the
  matching rule, or it paints under the drawing (sprint 33's trap on the Log).

**Off** is the detail drawing as the server and the poll leave it:
- no probe with `off` stored;
- no chunk and no canvas;
- ticks as strokes, and the tip in `live`.

## Checks

Probe writes these first:
- 2D checks run on the Off path (WebGL refused).
- 3D checks run on B3's harness (CI's SwiftShader), with `openModel` pointed at `/crew`.
- Feed states come from B4a's kept fixture sites, or from `page.route` answering `/api/crew` with
  the oracle's `toAnswer(fixture)` and `page.clock` installed before `goto` (B4c's method). No
  check waits in real time for a schedule.
- Each check runs at 1440 × 900 and 390 × 844 unless it says otherwise.
- Each title carries its number.

- **B4.33 The detail and the pencil.**
  - On the live, open and resting fixtures, the live fixture patched to sprint 999, and the default
    server:
    - `data-focus` is the oracle's seat: 3.0 for 31, 6.1 for 999, and the newest retro's at rest
      and in down;
    - `data-run` is `live`, `open` or `record`.
  - The shown drawing's box matches Iris's sizes within 1 px, at 320, 390, 768, 1024 and 1440.
  - The focus number is wholly inside the box at each width, and it is the only number on the
    focus plank.
  - In live and open:
    - exactly one `path[data-plank][data-pencil]` sits on the oracle's seat with `data-sprint` n,
      and `data-live` only in live;
    - it has a hatched fill and a dashed `--muted` edge in both schemes;
    - n is on its chip at the tally's stern end;
    - live alone has one `[data-tip]`.
  - Every plank's `data-plank`, `data-sprint` and class equal the default server's, the pencil
    aside.
- **B4.34 One tick per moment, in 2D.**
  - The shown `[data-mark]`s number exactly the panel's `ol[data-moments] li`: in live and open,
    with scripts on and off; 0 at rest and in down.
  - Each is inside the pencil plank's box (outset by its stroke), at the oracle's x_i within 1 px.
  - Each resolves to `--muted` in both schemes, never within ΔE 10 of `--accent`, and to
    `CanvasText` in forced colours.
  - No tick is within 4 px of the dot's ring or under the number's chip, which also settles rider
    (b) on `/crew`.
- **B4.35 The drawing follows the poll** (`page.route` and `page.clock`, on the default server and
  the kept live site):
  - A told answer that adds one moment shows exactly one more tick, and every earlier tick keeps
    its box. Once 10 are shown, a new moment changes no tick's box.
  - The same answer makes no mutation in `[data-plan]` (a `MutationObserver`, as in B4.30).
  - Live to open of the same sprint: the tip goes and the ticks stay.
  - Live to resting with `last.sprint` n: `inked`. There is no hatch or dash, the edge is solid ink,
    n is in ink 700 with no chip, and there is no tip or tick.
  - Live to another sprint, to a run with no number, and to down past 10 minutes: `record`. Every
    plank's `data-sprint` and fill class equal the default server's, and no pencil, tip or tick is
    shown.
  - In every case the box and the crop don't move. Paused, nothing changes. Nothing in
    `[data-plan]` animates.
- **B4.36 It stands on `/crew`.**
  - `[data-model]` follows `[data-plan]` and reaches a rest state.
  - Frame 1 is registered on the shown detail within B3.1's bound, and its fills match the Off
    page's within 8 levels.
  - The canvas lies on the drawing's box in whole buffer pixels at 320, 390, 768, 1024 and 1440.
  - Through the move, the focus point stays within 1 px of its frame-1 point.
  - With WebGL on, `/crew` requests the same 3D chunk file that `/` requests.
- **B4.37 The ticks in 3D, and copper only while live.**
  - At rest on the live and open fixtures, `data-marks` equals B4.34's count.
  - A poll adding a moment raises it by 1 (up to 10) and draws exactly 1 frame. A poll that
    changes nothing draws 0.
  - The canvas changes only inside the pencil plank's projected box and a 5 px band (B4.21's).
  - Pixels within ΔE 10 of `--accent` appear only in live, only there, and go within 1 frame after
    a poll turns the run open or resting.
  - In `inked` and `record`, `data-marks` is 0.
  - The only number on the hull is the focus plank's.
- **B4.38 Full, Calm and reduced motion, once a visit.**
  - Full: moving frames from frame 1, then settled after 1.8 s ± one frame, read on Playwright's
    clock as B3's checks are. A reload, and a Back from `/`, open settled with one live context. A
    new tab plays the move again.
  - A key, a click, a wheel, a tap and a scroll each settle the move within 2 frames.
  - Full pressed from Calm or Off replays the move.
  - Calm, or reduce with nothing stored: no landed or moving state is ever set. Calm pressed
    mid-move settles within 2 frames and stores `calm`. Under reduce, the fade is opacity only and
    ends within 300 ms.
- **B4.39 Off downloads nothing on `/crew`.**
  - Paths: `off` stored, Off pressed at rest and mid-move, WebGL refused, forced colours, Save-Data,
    print, and scripts off.
  - On each: no script beyond the WebGL-refused page's, no context but the one probe (none with
    `off` stored), and no canvas. The detail's pencil, tip and ticks match the Off page's.
  - Pressed mid-visit, `data-state` is gone within 2 frames and 0 contexts are live.
  - One key: Off pressed on `/` opens `/crew` in Off with no chunk, and Calm pressed on `/crew`
    opens `/log` in Calm.
- **B4.40 Cheap and still.**
  - On the live fixture, with 10 ticks shown, in both schemes, over the move and at rest:
    - at most 8 draws a frame;
    - at most 30,000 triangles from 768 px and 12,000 below;
    - a backing store at most the cap, at DPR 2 and 3.
  - 0 frames at rest, off-screen and hidden, in B3.6's windows. A scheme switch inside a window
    draws 1 frame once the page is back.
  - After a tick, 1 frame, then 0 over 2 s.
  - One 3D chunk of at most 250,000 B gzip -9, requested after load.
- **B4.41 The control on `/crew`.**
  - With scripts on, the group Motion holds Full, Calm and Off, in that order, with one slot shown.
  - From 768 it is in the bar, right of Read as page. Below 768 it is in the foot, right of Read
    as page, in one 44 px row.
  - Targets are 44 × 44 below 1024 and 24 × 24 from it, inside the viewport at 320, 390, 768, 1024
    and 1440, and the bar is one line.
  - At 390 × 844, B4.12's first screen holds.
  - Without scripts, the slot is empty and at the group's size (CLS 0).
- **B4.42 Lens's rider on #90.**
  - A poll held unanswered is aborted 30,000 ms after it starts, on `page.clock`, and counts as
    failed: the next poll comes at 30 s while live.
  - With every poll held from the first, the live panel turns into B4.2's down panel at the first
    abort more than 10 minutes after the last told answer, and not before.

## The live checks: keep, rewrite, retire

The default e2e server has no feed, so `/crew` there is `down`.

| Check | Disposition |
|---|---|
| `crew.spec.ts`, `crew-bar.spec.ts`, `crew-live.spec.ts` (34 tests by `playwright test --list`: the harnesses, B4.1 to B4.14, B4.25 to B4.32) | **kept on the Off path**: every context they open refuses WebGL through one shared init script, with bodies unedited apart from the rewrites below. They read the drawing's planks, its pixels and the first screen, and the model restyles all three (sprint 33's rule). It also keeps SwiftShader builds out of 34 tests, under CI's cap |
| B4.1 "…seated as on / with nothing hatched, no canvas, model or control" | **rewrite, same `expect(`s**. The plank list still equals `/`'s, since every plank stays in the detail. On the default (down) server nothing is hatched, unchanged. The `toBe(0)` over `canvas, [data-model], [data-motion]` narrows to `canvas`, with WebGL refused and with scripts off. `[data-model]` and the control are B4.36 and B4.41's |
| B4.6 copper, live | **rewrite, same assertion**: the allowed set gains `[data-tip]` in the drawing, in live only. Open, resting and down: nothing in the drawing is copper |
| B4.9 "no button or control in the header" | **rewrite, same `expect(`**, carrying B2.3's assertions for the control onto `/crew`, as B5.1 and B5.25 did for `/log`. From 768 the header's buttons are exactly Full, Calm and Off, right of Read as page, on the bar's one line. Below 768 there are none, and the control is in the foot |
| B4.13 Tab order | **rewrite, same assertions**: the order gains the control's enabled buttons after Read as page, in the bar from 768 and in the foot below it. With WebGL refused that is Off alone, since Full and Calm are disabled (sprint 33, amendment 1) |
| B4.14 and B4.31, the script | **rewrite, same `expect(`s**. `/crew` is read with WebGL refused, and `/crew` beyond the 404 goes from 16,384 to **18,432 B** (call 7). B4.14's "within 2,048 B of `/log`'s" is read with both WebGL refused and becomes **16,384 B**. It was vacuous until now, since its `/log` loaded the 3D chunk. LCP and fonts are unchanged |
| B4.12 the first screen | **kept**: the detail is 38 px shorter at 390, so everything it checks rises |
| B4.28 | **extended** by B4.42, with nothing loosened |
| `sheet.spec.ts` B2.3 (both), keyboard's B2.3 on `/`, `read.spec.ts` B2.10 (`/` at 2,048 B, 9 B left), `/read`'s drawing checks, every `model-*`, `motion`, `log-*` spec, `live-layer.spec.ts` B4.15 to B4.24 | **kept unedited**: `/`, `/read`, `/log` and the loader don't change |
| The `ROUTES` sweeps (`invariants`: tokens, axe, first paint, overflow, targets, headings; B2.9's "nothing animates", already WebGL-refused on `/crew`), `keyboard`'s forced-colours rings, `content`'s TODO sweep | **kept unedited, on the default path**: they see `/crew` with the model and the control, which is what a visitor gets |

**Retired: none.** Three bounds change:
- two loosen: B4.14 and B4.31 at 18,432 B, and B4.14's `/log` line at 16,384 B, for Lens to
  accept with call 7's reason;
- one narrows: B4.1's fence, with no `expect(` lost.

## Budgets

| Measure | Budget | Check | Measured |
|---|---|---|---|
| `/crew`'s script, WebGL refused | the 404's files, plus at most 18,432 B decoded; at most 16,384 B beyond `/log`'s | B4.14, B4.31 | head 13,659 B (one file). With the model and control, 15,550 B. With the abort and marks sketch, 16,171 B (2,261 B under) |
| `/`'s script | B2.10 unchanged; `model.tsx` 0 B | B2.10 | 2,039 B over the 404 (head) |
| 3D chunk | at most 250,000 B gzip -9, the file `/` requests | B4.36, B4.40 | 597,347 B decoded, 152,478 B gzip -9, the same file on `/` and `/crew` (scratch) |
| Draws | at most 8 a frame | B4.40 | live is 7: card, seams, outline, shadow, tip run, tip dot, and the ticks in the stage's `marks` batch (Iris; `/` live is 6 today, `.crew/sprint/34/decisions.md` 6) |
| Triangles | at most 30,000 from 768 px and 12,000 below | B4.40 | desktop card 25,267 (sprint 25), plus the tip's 18 (sprint 34), plus 10 tick segments |
| Frames | 0 at rest, hidden and off-screen; 1 per tick, `data-run` change, scheme change or refit | B4.37, B4.40 | |
| The new specs' time | at most 2 minutes added to the suite's wall time at CI's 2 workers, measured by Probe across the full suite before the label | the run | #90's `check` took 22.2 min of 25 (run 41180761418) |

## Measured

I made a scratch worktree off `1294677`, with its own `pnpm install`, and ran `next start` on port
4761. I read scripts by B2.10's method: a fresh Chromium context, the decoded bodies of every
script response, 2.5 s with WebGL refused or 6 s with it on.
- The head: the 404 requests 5 files and 458,882 B. `/crew` adds 13,659 B, and `/` adds 2,039 B
  with WebGL refused.
- Build 2: the bar's and foot's `<MotionControl />` and `<Model>` after `[data-plan]` give 15,550 B.
- Build 3: build 2 plus the 30 s abort in `poll()` and a ten-path marks overlay fed by the poller
  give 16,171 B.
- In build 3, with WebGL on, `/crew` requested `/`'s 3D chunk file. `mount.ts` finds no
  `.plan-wide` or `.plan-ghost` on `/crew` today, so no canvas mounted. Pixel adds the detail
  drawings.

## Who builds what

The interface between the two builders is the drawing (call 4), so they build in parallel in their
own worktrees.
- **Forge** owns:
  - `lib/hull-layouts.ts`: `CREW_WIDE`, `CREW_NARROW` and `MARKS`, from Iris's numbers, in his
    first commit, pushed at once. Pixel imports them and doesn't edit them;
  - `components/lines-plan.tsx` and `lib/lines-plan.ts`: the two detail drawings, the crop, the
    pencil, tip, ticks, lettering, `data-focus` and `data-run`'s server value. Forge also lists
    each seat's f in the PR;
  - `app/crew/page.tsx`: the model and the control;
  - `components/crew-live.tsx`: B4.42's abort, and `data-run` and the shown ticks from each told
    answer;
  - `lib/live-layer.ts`, reused for `/crew`'s seat;
  - `/crew`'s drawing, foot and control CSS, in its own block of `app/globals.css`;
  - the comments in `components/foot.tsx` and `components/bar.tsx`.
- **Pixel** owns:
  - `lib/model/*`: the mount on the detail drawings, the levels, the pose (Iris's numbers), the
    move's flag, the hull's pencil, the ticks in the `marks` batch, the riding focus number,
    `data-run` and `data-marks`, and the observer;
  - the model layer's CSS on `/crew`, in its own block.
- **Probe** owns `e2e/`.
- **Nobody** edits `components/model.tsx`. If the work needs a byte of it, stop and tell Atlas: it
  reopens B2.10 on `/`.

## Riders

| Rider | Disposition |
|---|---|
| Lens's nit on #90: abort a poll that never settles | **Rides** as B4.42: `AbortController` and a 30,000 ms `setTimeout`, cleared when the poll settles, so `page.clock` drives it (Forge) |
| Lens's two nits on 9b8743a (`ROADMAP.md`, B5c bullet) | **Already done on main** in sprint 34 (e770a54, `lib/model/mount.ts`). `lost()` calls `unpick()` and then `remark()`, so a restored frame inks no plank the pointer has left. `up()` keeps an opening tap's plank inked until the page goes, and clears one that scrolled or opened a tab. The roadmap line is stale: Atlas ticks it |
| Iris's chip over the copper dot on a short seat (#87) | **Settled on `/crew` by design** (Iris: the number sits at the tally's stern end, checked by B4.34). **Stays open on `/`**, whose layer B4d doesn't touch |
| The plan's #74 nit | Already taken in sprint 33 |

## Out of scope

- Replay, and its rest-state link (B4e).
- A pencil for a run that starts while the visitor watches (it comes on the next load, call 3).
- A crop or camera move on a poll, or any motion on a tick.
- Picking planks on `/crew`.
- DOM labels on the model, beyond the one riding focus number.
- `/crew`'s long cache `expire` (Iris's B4c follow-up).
- Any change to `/`, `/read`, `/log`, `content/`, or an owner path.

## Needs decision

- **Iris:** the 3D pose numbers (yaw, pitch, lift), promised after a render check. They don't block
  the checks: B4.36 and B4.38 hold the focus point, the length and the bound whatever they are.
  She measures `/crew`'s foot at 390 and 320 on Forge's build.
- **Atlas:** whether call 7 (18,432 B) needs an Owner's pick. My view is no: it adds two
  allowances the owner already merged, and `/` is untouched.
- **Atlas and the owner:** CI's 25-minute cap. #90's run took 22.2 minutes. If the full suite with
  these specs can't stay under the cap, the fix is the owner's (`.github/`; sprints 34 and 35
  proposed it). It goes as an Owner's pick on this PR, not a weaker check.
- **Owner:** nothing to merge. On the preview they see the hull on `/crew` on a GPU and their
  phone, during this PR's own live run.
