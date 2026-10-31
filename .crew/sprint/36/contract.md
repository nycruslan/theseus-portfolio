# B4d contract: the hull on `/crew`, one mark per moment

Quill, 2026-10-31, during sprint 36, for the run that builds it (PR #91). It is the plan's B4.4
(`.crew/sprint/28/b4-plan.md`), drawn to `crew-1440.webp` (`.crew/sprint/17/design/`). It reuses,
by reference:
- the model, the modes and the control as sprints 25 to 27 shipped them;
- B5c's second-route mount (`.crew/sprint/33/contract.md`, calls 2, 3 and 6, "The view", "Calm",
  "Off");
- B4b's pencil plank, tip and hull (`.crew/sprint/34/contract.md`, "The drawing" and "The hull");
- B4c's poller and its rules (`.crew/sprint/35/contract.md`).

Their data rules hold word for word except where this one changes them. Numbers come from three
sources, each cited where it's used:
- this branch (`1294677`);
- a scratch build of it with `<Model>` and `<MotionControl>` on `/crew`, plus a sketch of the abort
  and the marks (thrown away; see "Measured");
- the sprints that measured them.

Iris's calls are written in where she has made them. Where her call is still pending, the text says
**[Iris pending]** and gives my default.

## Outcome

A visitor on `/crew` sees the crew's run on the drawing, as a card model:
- The hull stands up off the sheet, close on the plank the crew is drawing now. That plank is in
  pencil, with the copper tip while the crew is live.
- It carries one pencil mark for each moment the panel lists. When the poll brings a new moment, a
  new mark appears, without motion.
- At rest, the hull is close on the newest seat, with no pencil and no marks.

Full plays one camera move on opening. Calm opens settled. Off is the 2D drawing with the same
pencil, tip and marks, and downloads no 3D. The choice is the one the visitor made on `/` and
`/log`, and Full/Calm/Off now sits in `/crew`'s bar.

## The calls I made

1. **Marks are pencil, so they live only on the pencil plank.** In `live` and `open` with a sprint
   number, the marks count equals the moments shown (at most 10, B4c). At rest and in `down`
   there are none.
   - Pencil is the drawing's word for "in progress" (B4b). A merged plank is inked, so its marks go
     with the pencil.
   - This is also the only rule that keeps "marks = moments shown" true in every state without a
     plank to put a resting run's marks on.
2. **The camera's plank is fixed at first paint, and no poll moves it.** `[data-plan]` carries
   `data-focus`:
   - in `live` and `open`, the pencil seat, by B4b's rule;
   - otherwise, the newest retro's seat (the revision block's top sprint, `readSprintLog()[0]`).

   Today these are 6.1 for sprint 36 (k = 34, `ORDER[12]`) and 0.2 for 35. The fixtures' 31 is on
   3.0. A camera move on a poll would be motion on an update, which B4c ruled out in every mode
   (Iris, `.crew/sprint/35/notes-iris.md`).
3. **The drawing follows the poll for its own sprint, and claims nothing for any other.** The
   server draws the page's state, as B4b's data rules do (pencil, number, tip and marks). The
   drawing has no client geometry, so it can't seat a new plank. Each told answer then sets the
   drawing to one of four states:

   | The answer tells | The drawing shows |
   |---|---|
   | `live`, the drawing's sprint | the pencil, the tip, and marks = moments shown |
   | `open`, the drawing's sprint | the pencil, no tip, and marks = moments shown |
   | `resting`, with `last.sprint` the drawing's sprint | **inked**: the plank seated (card fill, solid ink edge, number n kept), no tip, no marks. The merge took the seat |
   | anything else: another sprint, a run with no number, or `down` once B4c's 10 minutes are up | **the record**: the drawing exactly as the default (down) server draws it, with no pencil, tip or mark |

   So a run that starts while the visitor watches gets its pencil on the next load. The panel tells
   it at once. Copper stays only while the poll says live (B4b's rule, now on `/crew`).
4. **The loader doesn't change.** `components/model.tsx` stays byte for byte as it is (B2.10
   leaves `/` 9 B). The chunk reads everything off the drawing:
   - `data-focus`;
   - the pencil's `data-pencil`, `data-sprint` and `data-live`;
   - the run state, `data-run`;
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

## Data rules (the page, the chunk and Probe's oracle implement these word for word)

**The page.** `/crew`'s `main` holds, in this order:
1. `[data-plan]`;
2. `<Model>` as `[data-model]`, the element right after `[data-plan]`;
3. the foot;
4. the panel.

The bar gets `control={<MotionControl />}`, and the foot gets `<Foot control={<MotionControl />}
/>`: from 768 px the control sits in the bar's nav after Read as page, in the slot `/` and `/log`
use, and below 768 it sits in the foot to the right of Read as page, in one 44 px row (**[Iris
pending]**; this is `/`'s place, and the default). The mode rules are sprint 27's, unchanged.

**The drawing** (`.plan-page`, one drawing at every width). In `live` and `open`, with
`run.sprint` set, its pencil plank follows B4b's "The drawing" exactly:
- the seat comes from B4b's "The pencil seat";
- the plank carries `data-pencil`, `data-sprint` = n and, in `live`, `data-live`;
- it has the hatch, the dashed `--muted` edge and the number n on its film chip;
- in `live` it gets one `[data-tip]`.

Every other plank is as in `down`. `[data-plan]` carries `data-focus` (call 2) and
`data-run="live" | "open" | "inked" | "record"` (call 3). The server's value is the page's state:
`live`, `open`, or `record` at rest and in `down`. The browser updates it on each told answer, by
the table in call 3. An answer that leaves it unchanged changes no node in `[data-plan]`.

**A mark** (**[Iris pending]**: its shape, length, spacing, order and weight). It is graphite on
the pencil plank, starting at the tip and running aft, one per moment shown, the oldest nearest the
tip. Never copper. Forced colours paint it `CanvasText`. Its numbers live in one `MARKS` constant in
`lib/hull-layouts.ts`, beside `PENCIL`, shared by the 2D and the 3D. Each shown mark is a
`[data-mark]` in the drawing's `svg`, inside the pencil plank's box. A mark that isn't shown is
absent or `display: none`. A new moment shows one more mark, and every mark already shown stays
where it is. A mark has no transition or animation, in every mode.

**The hull on `/crew`** (Pixel; **[Iris pending]**: the framing):
- **What it shows.** It is `/`'s card model, seated by the drawing's own planks, with B4b's hull
  pencil: the hatch, the edge, and the tip in `live` and only while `data-run` is `live`. It adds
  the marks, from `MARKS`, on the near side of the pencil plank. From 768 px the pencil number
  rides the plank, as on `/`. `inked` draws the plank as seated card with no hatch, edge, tip or
  marks. `record` draws the default server's hull.
- **The levels.** The desktop level and the 2× cap apply from 768 px, and the phone's level and the
  1.5× cap below, as the ghost does (sprint 33).
- **Frame 1** lands on the 2D drawing within B3.1's bound (1.0 CSS px at DPR 2, 1.5 at DPR 1).
- **Full** then makes one camera move to the settled view, close on `data-focus`'s plank, and is
  still after it. My default for the settled view, as `crew-1440.webp` draws it: the focus plank
  wholly inside the drawing's box, at least half the box's width, with the hull cropped where it
  must be. B5c's inputs (key, pointer, wheel, touch, scroll) settle the move within 2 frames.
- **Calm** opens on the settled frame. Under reduced motion with nothing stored, the canvas fades in
  over 240 ms, linear, as on `/`.
- **At rest** it draws 0 frames, and exactly 1 when `data-run` or the shown marks change, on a
  scheme change, or on a refit. `[data-model]` carries `data-marks`, the count of marks the last
  frame drew. That is the one test hook beside `data-state`, and nothing goes on `window`.
- **The trap.** `.crew-page > [data-plan]` sets `order` below 1024 px, so the layer needs the
  matching rule, or it paints under the drawing (sprint 33's trap on the Log).

**Off** is the drawing above, as the server and the poll leave it:
- no probe with `off` stored;
- no chunk and no canvas;
- marks as strokes, and the tip in `live`.

## Checks

Probe writes these first:
- 2D checks run on the Off path (WebGL refused).
- 3D checks run on B3's harness (CI's SwiftShader), with `openModel` pointed at `/crew`.
- Feed states come from B4a's kept fixture sites, or from `page.route` answering `/api/crew` with
  the oracle's `toAnswer(fixture)` and `page.clock` installed before `goto` (B4c's method). No
  check waits in real time for a schedule.
- Each check runs at 1440 × 900 and 390 × 844 unless it says otherwise.
- Each title carries its number.

- **B4.33 The pencil on `/crew`'s drawing.**
  - On the live, open and resting fixtures, the live fixture patched to sprint 999, and the default
    server:
    - `[data-plan]`'s `data-focus` is the oracle's seat: 3.0 for 31, 6.1 for 999, and the newest
      retro's at rest and in down;
    - `data-run` is `live`, `open` or `record`.
  - In live and open, exactly one `path[data-plank][data-pencil]` sits on the oracle's seat with
    `data-sprint` n, and `data-live` only in live. It has a hatched fill and a dashed `--muted`
    edge in both schemes.
  - From 768 its number reads n on a `--background` chip. Live alone has one `[data-tip]`.
  - Every other plank's id, `data-sprint` and number equal the default server's.
- **B4.34 One mark per moment, in 2D.**
  - The shown `[data-mark]`s number exactly the panel's `ol[data-moments] li`: in live and open,
    with scripts on and off; 0 at rest and in down.
  - Each lies inside the pencil plank's box (outset by its stroke). Each resolves to the
    **[Iris pending]** colour in both schemes, never within ΔE 10 of `--accent`, and to
    `CanvasText` in forced colours.
- **B4.35 The drawing follows the poll** (`page.route` and `page.clock`, on the default server and
  the kept live site):
  - A told answer that adds one moment shows exactly one more mark, and every earlier mark keeps
    its box. At 10 moments it stays at 10.
  - The same answer makes no mutation in `[data-plan]` (a `MutationObserver`, as in B4.30).
  - Live to open of the same sprint: the tip goes and the marks stay.
  - Live to resting with `last.sprint` n: `inked`. There is no hatch or dash, the edge is solid ink,
    the number n stays, and there is no tip or mark.
  - Live to another sprint, to a run with no number, and to down past 10 minutes: `record`. Every
    plank's fill and number match the default server's, and no pencil, tip or mark is shown.
  - Paused, nothing changes. Nothing in `[data-plan]` animates after any of these.
- **B4.36 It stands on `/crew`.**
  - `[data-model]` follows `[data-plan]` and reaches a rest state.
  - Frame 1 is registered on the 2D drawing within B3.1's bound, and its fills match the Off page's
    within 8 levels.
  - The canvas lies on the drawing's box in whole buffer pixels at 320, 390, 768, 1024 and 1440.
  - Settled, `data-focus`'s plank is framed as **[Iris pending]** says (my default above).
  - With WebGL on, `/crew` requests the same 3D chunk file that `/` requests.
- **B4.37 The marks in 3D, and copper only while live.**
  - At rest on the live and open fixtures, `data-marks` equals B4.34's count.
  - A poll adding a moment raises it by 1 and draws exactly 1 frame. A poll that changes nothing
    draws 0.
  - The canvas changes only inside the pencil plank's projected box and a 5 px band (B4.21's
    band).
  - Pixels within ΔE 10 of `--accent` appear only in live, only there, and go within 1 frame after
    a poll turns the run open or resting.
  - `inked` and `record` draw the plank's card with `data-marks` 0.
- **B4.38 Full, Calm and reduced motion, once a visit.**
  - Full: moving frames from frame 1, then settled. A reload, and a Back from `/`, open settled
    with one live context. A new tab plays the move again.
  - A key, a click, a wheel, a tap and a scroll each settle the move within 2 frames.
  - Full pressed from Calm or Off replays the move.
  - Calm, or reduce with nothing stored: no landed or moving state is ever set. Calm pressed
    mid-move settles within 2 frames and stores `calm`. Under reduce, the fade is opacity only and
    ends within 300 ms.
- **B4.39 Off downloads nothing on `/crew`.**
  - Paths: `off` stored, Off pressed at rest and mid-move, WebGL refused, forced colours, Save-Data,
    print, and scripts off.
  - On each: no script beyond the WebGL-refused page's, no context but the one probe (none with
    `off` stored), and no canvas. The drawing's pencil, tip and marks match the Off page's.
  - Pressed mid-visit, `data-state` is gone within 2 frames and 0 contexts are live.
  - One key: Off pressed on `/` opens `/crew` in Off with no chunk, and Calm pressed on `/crew`
    opens `/log` in Calm.
- **B4.40 Cheap and still.**
  - On the live fixture, with 10 moments shown, in both schemes, over the move and at rest:
    - at most 8 draws a frame;
    - at most 30,000 triangles from 768 px and 12,000 below;
    - a backing store at most the cap, at DPR 2 and 3.
  - 0 frames at rest, off-screen and hidden, in B3.6's windows. A scheme switch inside a window
    draws 1 frame once the page is back.
  - After a mark, 1 frame, then 0 over 2 s.
  - One 3D chunk of at most 250,000 B gzip -9, requested after load.
- **B4.41 The control on `/crew`.**
  - With scripts on, the group Motion holds Full, Calm and Off, in that order, with one slot shown.
  - Below 768 it sits in the foot, right of Read as page, in one 44 px row (**[Iris pending]**).
  - Targets are 44 × 44 below 1024 and 24 × 24 from it, inside the viewport at 320, 390, 768, 1024
    and 1440.
  - At 390 × 844, B4.12's first screen holds.
  - Without scripts, the slot is empty and at the group's size (CLS 0).
- **B4.42 The riders.**
  - (a) **Lens on #90.** A poll held unanswered is aborted 30,000 ms after it starts, on
    `page.clock`, and counts as failed: the next poll comes at 30 s while live. With every poll
    held from the first, the live panel turns into B4.2's down panel at the first abort more than
    10 minutes after the last told answer, and not before.
  - (b) **Iris on #87.** On the live fixture (seat 3.0), at 1024 and 768, on `/` and `/crew`, Off
    path and 3D at rest: no part of the copper dot's box is under the pencil number's chip.

## The live checks: keep, rewrite, retire

The default e2e server has no feed, so `/crew` there is `down`.

| Check | Disposition |
|---|---|
| `crew.spec.ts`, `crew-bar.spec.ts`, `crew-live.spec.ts` (B4 harness, B4.1 to B4.14, B4.25 to B4.32, B4c harness) | **kept on the Off path**: every context they open refuses WebGL through one shared init script, with bodies unedited apart from the rewrites below. They read the drawing's planks, its pixels and the first screen, and the model restyles all three (sprint 33's rule). It also keeps SwiftShader builds out of these 34 tests (`playwright test --list`), under CI's cap |
| B4.1 "…nothing hatched, no canvas, model or control" | **rewrite, same `expect(`**. On the default (down) server nothing is hatched, unchanged. The `toBe(0)` over `canvas, [data-model], [data-motion]` narrows to `canvas`, with WebGL refused and with scripts off. `[data-model]` and the control are B4.36 and B4.41's |
| B4.6 copper, live | **rewrite, same assertion**: the allowed set gains `[data-tip]` in the drawing, in live only. Open, resting and down: nothing in the drawing is copper |
| B4.9 "no button or control in the header" | **rewrite, same `expect(`**, carrying B2.3's assertions for the control onto `/crew`, as B5.1 and B5.25 did for `/log`. From 768 the header's buttons are exactly Full, Calm and Off, right of Read as page, on the bar's one line. Below 768 there are none, and the control is in the foot |
| B4.13 Tab order | **rewrite, same assertions**: the order gains the control's enabled buttons after Read as page, in the bar from 768 and in the foot below it. With WebGL refused that is Off alone, since Full and Calm are disabled (sprint 33, amendment 1) |
| B4.14 and B4.31, the script | **rewrite, same `expect(`s**. `/crew` is read with WebGL refused, and `/crew` beyond the 404 goes from 16,384 to **18,432 B** (call 7). B4.14's "within 2,048 B of `/log`'s" is read with both WebGL refused and becomes **16,384 B**. It was vacuous until now, since its `/log` loaded the 3D chunk. LCP and fonts are unchanged |
| B4.28 | **extended** by B4.42 (a), with nothing loosened |
| `sheet.spec.ts` B2.3 (both), keyboard's B2.3 on `/`, `read.spec.ts` B2.10 (`/` at 2,048 B, 9 B left), every `model-*`, `motion`, `log-*` spec, `live-layer.spec.ts` B4.15 to B4.24 | **kept unedited**: `/`, `/log` and the loader don't change. B4.42 (b) adds to the layer and loosens nothing in B4.21 |
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
| Draws | at most 8 a frame | B4.40 | `/` live is 7: 5 plus the tip's 2 (sprint 34). Marks may add 1; aim for 0, in an existing line batch |
| Triangles | at most 30,000 from 768 px and 12,000 below | B4.40 | desktop card 25,267 (sprint 25), plus the tip's 18 (sprint 34), plus marks' line quads |
| Frames | 0 at rest, hidden and off-screen; 1 per mark, `data-run` change, scheme change or refit | B4.37, B4.40 | |
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
  `.plan-wide` or `.plan-ghost` on `/crew` today, so no canvas mounted. Pixel adds the page drawing.

## Who builds what

The interface between the two builders is the drawing's attributes (call 4), so they build in
parallel in their own worktrees.
- **Pixel** owns:
  - `lib/model/*`: the mount on `.plan-page`, the levels, the framing, the move's flag, the hull's
    pencil on `/crew`, the marks in 3D, `data-run` and `data-marks`, the observer, and the 3D
    label in rider (b);
  - the model layer's CSS on `/crew`, in its own block of `app/globals.css`.
- **Forge** owns:
  - `app/crew/page.tsx`: the model and the control;
  - `components/crew-live.tsx`: rider (a), and `data-run` and the shown marks from each told
    answer;
  - `components/lines-plan.tsx` and `lib/lines-plan.ts`: the page drawing's pencil, tip, marks,
    `data-focus`, and the 2D half of rider (b);
  - `lib/live-layer.ts`, reused for `/crew`'s seat;
  - `MARKS` in `lib/hull-layouts.ts`, written in his first commit from Iris's numbers and never
    edited by Pixel;
  - `/crew`'s foot and control CSS, in its own block;
  - the comments in `components/foot.tsx` and `components/bar.tsx`.
- **Probe** owns `e2e/`.
- **Nobody** edits `components/model.tsx`. If the work needs a byte of it, stop and tell Atlas: it
  reopens B2.10 on `/`.

## Riders

| Rider | Disposition |
|---|---|
| Lens's nit on #90: abort a poll that never settles | **Rides** as B4.42 (a): `AbortController` and a 30,000 ms `setTimeout`, cleared when the poll settles, so `page.clock` drives it (Forge) |
| Lens's two nits on 9b8743a (`ROADMAP.md`, B5c bullet) | **Already done on main** in sprint 34 (e770a54, `lib/model/mount.ts`). `lost()` calls `unpick()` and then `remark()`, so a restored frame inks no plank the pointer has left. `up()` keeps an opening tap's plank inked until the page goes, and clears one that scrolled or opened a tab. The roadmap line is stale: Atlas ticks it |
| Iris's chip over the copper dot on a short seat (#87) | **Rides** as B4.42 (b), since `/crew`'s drawing now carries the layer and the fixtures' 31 sits on 3.0. The fix as Iris wrote it: the tip after the lettering, and the hull's label moved stern-ward. **[Iris pending]**: confirm or replace it |
| The plan's #74 nit | Already taken in sprint 33 |

## Out of scope

- Replay, and its rest-state link (B4e).
- A pencil for a run that starts while the visitor watches (it comes on the next load, call 3).
- A camera move on a poll, or any motion on a mark.
- Picking planks on `/crew`.
- DOM labels on the model.
- `/crew`'s long cache `expire` (Iris's B4c follow-up).
- Any change to `/`'s look or script (apart from rider b), `/log`, `content/`, or an owner path.

## Needs decision

- **Iris** (in progress, in parallel): what a mark looks like in 2D and 3D, the settled framing at
  1440, 1024 and 390, the control's place below 768, and rider (b)'s fix. My defaults are written
  in and marked.
- **Atlas:** whether call 7 (18,432 B) needs an Owner's pick. My view is no: it adds two
  allowances the owner already merged, and `/` is untouched.
- **Atlas and the owner:** CI's 25-minute cap. #90's run took 22.2 minutes. If the full suite with
  these specs can't stay under the cap, the fix is the owner's (`.github/`; sprints 34 and 35
  proposed it). It goes as an Owner's pick on this PR, not a weaker check.
- **Owner:** nothing to merge. On the preview they see the hull on `/crew` on a GPU and their
  phone, during this PR's own live run.
