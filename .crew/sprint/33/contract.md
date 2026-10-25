# Sprint 33 contract: the ghost hull in 3D on `/log` (B5c)

Quill, 2026-10-25. The last sprint of B5, as sprint 29 planned it (`.crew/sprint/29/b5-plan.md`,
"B5c"). It builds on the model and the control as sprints 25 to 27 shipped them, and their
contracts' data rules hold word for word except where this one changes them. It builds on `/log`
as B5a and B5b shipped it (`.crew/sprint/29/b5-first-contract.md`, `.crew/sprint/32/contract.md`).
The approved frames are `log-1440.webp` and `log-390.webp` (`.crew/sprint/17/design/`): the ghost
in 3D, a three-quarter view numbered on the planks, with Full/Calm/Off in the bar at 1440. The
frame's gaps are the 7 originals that were still sailing when it was drawn. Today all 22 are out,
so the hull is whole (Iris).

Iris's calls are folded in from `.crew/sprint/33/notes-iris.md` and marked "Iris's call". Her
prototype and frames are in `.crew/screenshots/33-iris/`. Pixel's spike is folded in from
`spike-pixel.md`, and his scratch mount on `pixel/33` is the start of the build. Both notes cite
the draft's check numbers, one lower than the final ones below: their B5.18 is B5.19 here, and so
on. Every number here was measured on a build of main at a0f3efe unless it says otherwise. GPU numbers are SwiftShader's floor, and 30 fps on a phone is checked on the owner's
phone at the demo.

## Outcome

A hiring executive follows "All 30 revisions in the Log". The ghost hull stands up off the sheet in
vellum: the ship's 22 original planks, each numbered by the sprint that took it out, with one
camera move, and then it is still. A pointer or a tap on a plank opens that sprint's record, and
the table under it stays the way in for the keyboard. Calm shows the hull settled. Off is today's
drawing, with no 3D downloaded. The choice is the one they already made on `/`.

## The calls I made

1. **The model is on `/log` and on every record.** A record is the Log with the record open (B5a).
   A pick opens a record. Without the model, the record would flatten the hull and drop the control
   from the bar on the very page the pick opened. On a record, the record's own seat is marked in
   3D as the 2D drawing marks it: its four edges in ink at 1.4 px, and its number at weight 700
   (Iris's call).
2. **One storage key, `theseus:motion`, shared with `/`.** Motion is a preference about the site,
   not about one page. A visitor who pressed Off on `/` and then watches the hull move on `/log` was
   ignored, and someone who needs less motion shouldn't have to say so twice. It also costs 0 B,
   since the store is a module `/` already ships.
3. **The camera move plays once a visit, on its own flag.** It plays on the first Log page of a
   visit. The flag is in sessionStorage, kept in the chunk, separate from `/`'s `theseus:model`. So
   a visitor who saw the loft on `/` still sees the archive's move once, and every later Log page
   of the visit opens settled, including the record a pick opens. A press of Full replays the move,
   as it does on `/` (sprint 27, decision 4).
4. **The loader doesn't grow for `/log`; the seam is in the chunk.**
   - `components/model.tsx`'s module is 2,038 B decoded, and B2.10 leaves `/` 10 B of headroom
     (measured below).
   - In a scratch build, `/log` rendered the same `<Model>` and `<MotionControl>` unchanged. With
     WebGL refused, `/log` requested exactly `/`'s six files, the 2,038 B chunk among them. With
     WebGL, it requested the same 3D chunk file as `/`.
   - So `/log` renders those two components as they are. The chunk tells the sheet from the ghost
     by the drawing beside its layer (`[data-plan]` or `[data-ghost]`; `host.previousElementSibling`
     today). Pixel's spike built it that way, and `components/model.tsx` changed by 0 bytes.
   - The chunk takes the ghost's seats from the 2D drawing in the page (`[data-ghost]
     path[data-plank]` with its `data-sprint`, which B5.4 already checks against the oracle). It
     moves the drawing's own number spans. So the 3D can't disagree with the 2D.
   - The 3D chunk stays one file for both routes, so a visitor coming from `/` downloads no second
     3D.
   - Lens's nit on #74 takes about 3 B of the 10. If the seam needs more loader bytes than that
     leaves, stop and say so: it reopens B2.10 with the owner, as sprint 27 said.
5. **The pick is the pointer's and the finger's; the table is everyone's.**
   - In the 2D drawing a lift is about 10 px deep at 390, 21 at 768, 16 at 1024 and 25 at 1440: the
     ghost's box (358 × 71, 736 × 147, 568 × 113 and 900 × 179 px on main's build) over 7 lifts.
   - The canvas stays `aria-hidden` and holds no Tab stop. Every record is a Rev link at least 24 px
     tall on the same page, which is WCAG 2.5.8's equivalent, so the planks needn't be 24 px targets.
   - A click is a document navigation to `/log/<n>`, so Back returns.
   - Touch opens records at every width (Iris's call). A drag over the canvas scrolls the page, as on
     `/` (B3.13). A tap that moved more than 10 CSS px, or that the browser turned into a scroll,
     never opens a record.
6. **"Hidden" is about frames, not the request.** The plan's "Off and hidden never request the
   chunk" means B3.5's Off paths: Off stored or pressed, WebGL refused, forced colours, Save-Data
   with nothing stored, print, and scripts off. A tab hidden at load may still request the chunk on
   idle, as `/` does today, and draws 0 frames while hidden (B3.6's rule). Waiting for the tab to be
   visible would cost loader bytes past B2.10's headroom, and a background tab shows a visitor
   nothing.
7. **The control stands where #78 can keep it** (Iris endorses this; her call 5).
   - From 768 px it is in the bar's nav after Read as page, as on `/`, in the same `Bar` slot, on
     `/log` and on every record.
   - Below 768 the bar is full, so the control goes in `main`, in a slot right after `.log-head`
     (after the lines figure). In the DOM it comes before the record and the drawing. That is
     exactly where #78 puts its `<Foot />` on `/log`.
   - Whichever of #78 and this PR merges second makes it `<Foot control={<MotionControl />} />`:
     Read as page at the left and the control at the right, in one 44 px row 12 px under the lines
     figure, as #78 has it on `/`. Iris's notes, section 5, have the CSS for both orders.
   - The Tab order stays the eye's: the bar, the control, the record, the table.
8. **Nothing on `/log` is copper, still.** Hover, the record's mark and the camera move use no
   `--accent`, because copper means live (B4's).
9. **The rule rider rides; the commit link doesn't.** Iris's "link the commit hash" would add a link
   to the Log's header, which B5.6 (C5.3) forbids ("no link but the bar's, the record's and the
   table's"). Allowing it loosens a live assertion, and that is the owner's call, while nothing else
   in this sprint waits for the owner. So it waits for the next PR that waits for the owner anyway.
   Sprint 32 kept "Merged" out of the table for the same reason (decision 2). Her other rider, the
   rule's width, rides.

## Data rules (the page and Probe's harness implement these word for word)

**Where it mounts.** `<Model>` mounts on `/log` and on every `/log/<n>`, as `[data-model]`, the
element right after `[data-ghost]` in `main`. It follows sprint 27's mode rules word for word:
- the store is `theseus:motion`;
- the device's hints set the default, and a press wins;
- with the WebGL probe refused, Off is pressed and Full and Calm are `disabled`.

There is no model on `/read` or on the 404.

**What it shows** (Iris's call 1):
- The ghost hull's 22 seats on both sides of the hull, each the original plank, numbered by
  `GHOST[seat]` (`e2e/retros.ts`).
- No deck, no transom face, no shadow.
- No seated, white original, hatched, pencil or copper plank.
- The material is the card's lit material, made translucent: α 0.7 when settled, its colour solved
  per frame from `--vellum` and `--background` as the page computes them. Nothing is hard-coded.
- The lines are seams and butts at 0.75 px (`--pencil` in light, `--muted` in dark), and the outline
  and plank 5.0's leader in `--muted`.
- The light is the card's rig at half its lit mix.

**The numbers** (Iris's call 2):
- They are the 2D drawing's own `[data-ghost] .plan-plank` spans. At rest each one carries a
  `transform: translate()` onto its plank's point in the settled pose, on the near side.
- They paint above the canvas with `pointer-events: none`, so a click on a number picks its plank.
- Their face and size are B5a's: Sofia Sans 600, 13 px from 768 to 1023 px and from 1280, 11 px
  from 1024 to 1279, and hidden below 768. The record's number is 700.
- Stagger: no two boxes come within 2 px of each other, and none leaves its plank.
- Every transform clears whenever `data-state` goes (Off, a lost context, teardown).

**The view, and Full's camera move** (Iris's call 3):
- There is one settled view at every width: yaw −20°, pitch 12°, with the bow toward the visitor.
  The canvas lies on `[data-ghost]`'s box in whole buffer pixels (B3.1's fit). The settled hull
  fits inside that box at every width (Iris, section 3's table).
- Frame 1 lands on the 2D ghost (B3.1's bound: within 1.0 CSS px at DPR 2, 1.5 at DPR 1), at α 1
  and unlit. That is the 2D fill exactly, so the 3D's arrival changes nothing.
- Then comes one move. Over 1.8 s on the loft's `ease()`, the hull turns 20° and tips 12° while
  the lens opens from orthographic to 30°. Its framed length holds at the drawing's within ±1%,
  centred on the box. Then it is still.
- The 2D `svg` is hidden from the first lofting frame, and the numbers ride on their planks.
- Any of `keydown`, `pointerdown`, `wheel`, `touchstart` and `scroll` ends the move at the settled
  frame within 2 frames.
- It plays once a visit across the Log (call 3), and a press of Full replays it. A hidden tab, or
  a ghost drawing that is off-screen, opens settled. Visibility is judged on `[data-ghost]`'s box,
  not the layer's: below 1024 `main` is a flex column, so `[data-model]`'s box is all of `main`
  (Pixel measured −2,947 to +844 px at 390) and would always count as on screen.

**Calm.** It opens on the settled frame at once, with no landed or moving state ever set. At rest it
draws 0 frames, and exactly 1 on a scheme change or a refit. Under reduced motion with nothing
stored, the canvas fades in and the `svg` fades out over 240 ms, linear, as on `/`. The numbers cut
to their places.

**How it's built** (Pixel's spike, for the builders; not a visitor rule):
- Draw each side's index range once, the far pass and then the near pass: two geometries sharing
  the buffers, or groups with `BackSide` and `FrontSide` materials. Three's default two-pass
  transparent `DoubleSide` draws the card twice: 46,288 triangles from 768 and 13,632 below, over
  both budgets. Per-side ranges with the shared lift seams give 26,288 and 8,432 in 5 draws.
- Pick by raycast at rest against a coarse proxy hull (0.1 ms a move, 0.5 at 4× CPU), mapped slot
  to `PLANKS[slot].id` to the drawing's `data-sprint`. No ID buffer: a pick render is a draw at rest.
- Put the cursor on the canvas and write it only when it changes. Written on `main`, it restyles the
  whole table on every move.
- `.log-ghost + [data-model] { order: 2 }`: `.log-ghost` has `order: 2`, so without it the layer
  paints under the drawing at every width. The control's slot below 768 has the same trap.
- `HOLD` and `DURATION` become per settle (`lib/model/calls.ts`), so `/` keeps its 2.4 s and height
  hold.
- The dark scheme uses Iris's lamp gain of 1.6, not `/`'s ×4. Under ×4, Pixel measured 8 to 9 numbers
  under 4.5:1.

**Off.** B5a's drawing, exactly as today: no probe, no chunk, no canvas, and the fills and numbers
of the WebGL-refused page.

**The pick** (Iris's call 4). The canvas takes pointer events only at rest (`settled` or `still`),
with `touch-action: manipulation`.
- **Hover, with a mouse or pen.** The plank under the pointer gets the record mark's look: its four
  edges in ink at 1.4 px, on the side the pointer is over. `[data-model]` carries
  `data-pick="<seat>"`, and the canvas's cursor is `pointer`. Over nothing there is no `data-pick`
  and the default cursor. `data-pick` is the one test hook beside `data-state`, and nothing goes on
  `window`.
- **No other hover effect.** No fill change, no tooltip, no copper. Exactly one frame is drawn when
  the hovered plank changes, and none while the pointer moves within one plank.
- **A click on a plank** navigates to `/log/GHOST[seat]` as a document navigation. Cmd-click,
  Ctrl-click and the middle button open the record in a new tab, as the table's links do. A click on
  nothing opens nothing.
- **Plank 5.0's number sits off the hull,** at its leader's end. So the pick tests that number's box,
  and 4 px around its leader, before the raycast; otherwise B5.24's aim at "20" finds no plank (it
  opened nothing in Pixel's spike).
- **Touch.**
  - A tap opens the record when the finger lifts within 10 CSS px of where it landed and no
    `pointercancel` came.
  - From `pointerdown`, the plank shows its ink edges until the navigation or a cancel.
  - A drag scrolls the page.
- **During the move**, a click or a tap settles the move and opens nothing.
- **On a record**, the record's plank keeps its mark, and a hover marks a second plank only while
  the pointer is on it.

**Back.** From the record a pick opened, Back returns to `/log` with the model at rest, one live
context, and the row in view as B5.7 has it.

## The checks

B5b's checks are B5.12 to B5.16, plus B5.17, "Nothing else moves", the B5a suite rewritten in place
(`.crew/sprint/32/contract.md`; `e2e/log-dates.spec.ts`, line 36). So B5c starts at B5.18 (Pixel
caught it: `playwright test --list` shows no B5.17 title). Each check
below runs at 1440 × 900 and 390 × 844 unless it says otherwise. Each runs with WebGL (CI's
SwiftShader) unless it says the Off path, and on `/log` and `/log/13`. Every title carries its
number.

- **B5.18 It stands on the Log.**
  - `[data-model]` follows `[data-ghost]` and reaches a rest state.
  - Frame 1 is registered on the 2D ghost within B3.1's bound, and its planks' fills are the Off
    page's within 8 levels (Pixel's spike matched them exactly).
  - The canvas lies on the ghost's box in whole buffer pixels at 320, 390, 768, 1024 and 1440.
  - The settled hull is inside that box.
  - `/read` and the 404 have no `[data-model]` and request no WebGL context.
  - Shown with the harness's `openModel` pointed at `/log`.
- **B5.19 Vellum, numbered by the 2D rule, nothing copper.**
  - Settled, in both schemes, each plank is sampled clear of its lines and number (Iris's bands).
    Light: OKLab L from 0.85 to 0.935, and under the film's. Dark: L from 0.42 to 0.50, and at most
    `--card`'s plus 0.005. In both, a and b within 0.01 of `--vellum`'s.
  - The 22 number spans at rest read `GHOST` seat by seat. Each is at least 10 px from 768, at
    least 4.5:1 on what it sits on, and at least 2 px clear of every other at 768, 1024, 1280 and
    1440. Below 768 they are hidden.
  - No canvas pixel is within ΔE 10 of `--accent` at frame 1, mid-move, settled, hovered, or on a
    record's mark.
  - On `/log/13`, exactly one seat is marked (sprint 13's), and its number is 700.
- **B5.20 Full: one camera move, once a visit.**
  - Moving frames from frame 1, then settled after 1.8 s ± one frame, read with states held on
    Playwright's clock as B3's checks do (on SwiftShader at 1440 the quality net ends the move
    `still` after 6 frames, as on `/`). At 1440, at e = 0, 0.4 and 1, the framed length is within
    1% of the drawing's.
  - A reload, a record opened by a pick, and Back each open settled with no moving frame. A new tab
    plays the move again.
  - A key, a click, a wheel, a tap and a scroll each settle it within 2 frames, and none of them
    opens a record.
  - Full pressed from Calm or from Off replays it from frame 1.
- **B5.21 Calm and reduced motion.**
  - With Calm pressed, or reduce on with nothing stored, no landed or moving state is ever set.
  - At rest it draws 0 frames over 2 s, and 1 on a scheme switch.
  - Calm pressed mid-move settles within 2 frames and stores `calm`.
  - Under reduce, the fade's transitions are opacity only, and all end within 300 ms.
- **B5.22 Off downloads nothing.**
  - Paths: `off` stored before load, Off pressed at rest and mid-move, WebGL refused, forced
    colours, Save-Data, print, and scripts off.
  - On each: no script beyond the WebGL-refused page's, no WebGL context but the one probe (none
    with `off` stored), no canvas, and the ghost's fills, `svg` and numbers as the Off page has them,
    with no number transformed.
  - Pressed mid-visit, within 2 frames `data-state` is gone and 0 contexts are live.
- **B5.23 Cheap and still.**
  - At 1440 and 390, at DPR 2 and 3:
    - at most 8 draws a frame (Iris's design uses 5);
    - at most 30,000 triangles from 768 px and 12,000 below, over the move and at rest, in both
      schemes;
    - a backing store at most the cap (2×, 1.5× below 768).
  - 0 frames at rest, off-screen and hidden, in B3.6's windows, with the pointer kept off the hull.
    Each window has a scheme switch inside it, and 1 frame is drawn once back. The off-screen
    window runs at 1440 × 600, 1024 and 390: at 1440 × 900 the page is 2,036 px tall, so the
    drawing never gets a viewport away (Pixel).
  - The pointer moving within one plank draws 0 frames, and crossing to another draws exactly 1.
  - One 3D chunk of at most 250,000 B gzip -9, requested after load, and **the same file `/`
    requests**, so a visit from `/` to `/log` downloads no new 3D script.
- **B5.24 A plank opens its record.**
  - Settled at 1440, 1024 and 768, with a mouse, at each of the 22 number spans' centres:
    `data-pick` is that number's seat, the cursor is `pointer`, and a click lands on `/log/<that
    number>` with its record's h2.
  - At a point on no plank: no `data-pick`, the default cursor, and a click leaves the URL as it was.
  - Ctrl-click opens a new page and leaves this one where it was.
  - On `/log/13`, a pick on another plank opens that plank's record.
  - Back from a picked record returns to `/log`, settled, with one live context.
  - At 390 × 844 with touch, for each seat, at a point where a mouse hover in a context without
    touch reads `data-pick` as that seat. Below 768 the numbers are hidden and the settled pose
    isn't the 2D drawing's, so the point is found by a scan of the canvas on a 2 px grid. At each
    point:
    - a tap opens `/log/GHOST[seat]`;
    - a 40 px touch drag starting there scrolls the page by its distance and opens nothing (B3.13);
    - a tap during the move opens nothing.
- **B5.25 The control on the Log, the same choice as on `/`.**
  - With scripts, the group named Motion holds Full, Calm and Off, in that order, and exactly one
    slot is shown.
  - From 768 it is in the bar's nav, right of Read as page. Below 768 it is in `main`, right after
    `.log-head` and before the record and `[data-ghost]`.
  - Targets are 44 × 44 px below 1024 and 24 × 24 from it, inside the viewport at 320, 390, 768,
    1024 and 1440, and the bar is one line.
  - At 390 × 844, the row ends above Every revision's h2, in the first screen.
  - One key: Off pressed on `/` opens `/log` in Off with no chunk, and Calm pressed on `/log` opens
    `/` in Calm.
  - Lens's nit on #74: with the probe refused, pressing the already-pressed Off stores nothing, on
    `/` and on `/log`.
  - Without scripts, the slot is empty and at the group's size (CLS 0).
- **B5.26 The riders.**
  - (a) Lens on #82: every `.crew/sprint/*/merge.json` on disk parses and passes B5.16's field
    rules, not only sprints 1 to 30.
  - (b) Iris on #82: at 640, 768 and 1023 px the lines figure's rule is as wide as the header's
    column, within 1 px. At 390 and 1440 it is as it is today.

## Budgets

| Budget | Value | Check | Today (a0f3efe) |
|---|---|---|---|
| Draws a frame | ≤ 8 | B5.23 | Pixel's one-sided spike: 3. Iris's ghost: 5 |
| Triangles | ≤ 30,000 from 768 px, ≤ 12,000 below | B5.23 | Spike: 15,580 and 5,476. Iris's ghost, counted: 26,288 and 8,432 with per-side ranges (46,288 and 13,632 as three's default `DoubleSide`, over) |
| 3D chunk | ≤ 250,000 B gzip -9, one file, the one `/` requests | B5.23 | Main's built file: 144,549 B gzip -9 (579,023 B decoded, mine). With the spike's ghost code: 147,126 B, the same file on `/` and `/log` (Pixel) |
| Script with WebGL refused | ≤ 2,048 B decoded over the 404's | B2.10, rewritten | 404: 458,882 B in 5 files. `/` is +2,038 B, `/read` +732 B. `/log` and `/log/13` are +0 today, +2,038 with the loader (scratch build) |
| `/log`'s script with WebGL refused | exactly `/`'s, by path and bytes | B5.10, rewritten | 460,920 B in 6 files on both (scratch build) |
| Frames at rest, off-screen, hidden | 0 (1 per hovered-plank change) | B5.21, B5.23 | |
| LCP on `/log` and `/log/13` | text in `main`, outside the ghost, ≤ 2,500 ms at 4× CPU | B5.10, unedited (Off path) | |

How I measured the scripts: each route loaded in a fresh Chromium context against `next start`
(port 4840 for main, 4841 for the scratch build), summing the decoded bodies of every `script`
response over 2.5 s, as `scriptBytes` in `e2e/read.spec.ts` does. The chunk's gzip is `gzip -9` on
the built file.

## The live checks: kept, rewritten, retired

| Checks | Disposition | Why |
|---|---|---|
| `log.spec.ts`, `log-record.spec.ts` and `log-dates.spec.ts` (54 tests) | **kept on the Off path**: every context they open refuses WebGL (one shared init script or fixture); bodies unedited except for the rewrites below | They read the 2D ghost's fills, numbers and pixels, the first screen, Back and the framework's bytes, which the model restyles. B3's lesson: guards that read what a new state restyles run on the Off path |
| B5.1 (C1.1): "…four links with Log current and no button" | **rewrite** | With scripts, the bar also holds the group Motion (Full, Calm, Off) after Read as page; with scripts off, still no button. B5a wrote "no button" because "there is no model on `/log` until B5c" |
| B5.1: "the bar is one line of targets…" | **rewrite, same assertions** | Its targets gain Full, Calm and Off from 768, held to B2.3's sizes; the bar is still one line, inside the viewport, and each link still lands |
| B5.9 (C10), both schemes | **rewrite, same assertions** | At 1440 the Tab order gains Full, Calm and Off after the bar's links, and the loop presses three more times |
| B5.10: "…load the 404's script files and bytes" | **rewrite, same assertion** | Still an equality, by path and bytes, now against `/`'s WebGL-refused page, with WebGL refused on `/log`, `/log/13` and the newest record: the framework and the loader, nothing else |
| B2.10 (`read.spec.ts`) | **rewrite, same assertions** | The baseline moves from `/log` to the 404, asserted 404 with at least one file (the plan measured it on production). `/`, `/log` and `/log/13` with WebGL refused, and `/read`, are each within 2,048 B |
| B2.9: "nothing animates on /read, /log, /log/13 or the 404" | **rewrite, same assertions** | `/log` and `/log/13` load with WebGL refused. The 3D's own stillness is B5.20, B5.21 and B5.23, as B3 did for `/` |
| B5.9 (C11.2), reduced motion | **kept on the Off path** (first row) | Under reduce, Calm's 240 ms fade is a CSS transition this check would race. B5.21 covers it |
| B5.16 | **extended** by B5.26 (a) | More assertions, none loosened |
| The `ROUTES` sweeps (`invariants.spec.ts`: tokens, axe, first paint, overflow, targets, headings), `content.spec.ts`'s TODO sweep, `keyboard.spec.ts`'s forced-colours rings, `sheet.spec.ts`'s B1.6 on `/log` and `/log/13`, and `log-entry.spec.ts` | **kept unedited, on the default path** | They see `/log` with the model and the control, which is what a visitor gets |
| Every `model-*.spec.ts`, `motion.spec.ts`, B2.3, and keyboard's B2.3 on `/` | **kept unedited** | `/` doesn't change. B5.1 and B5.25 carry B2.3's assertions for the control onto `/log` |

**Retired: none. Weakened: none.** No test loses an assertion, and no `expect(` count falls, so
`gate` has nothing on the specs for the owner.

## Out of scope

- `/crew` (B4, on #78, waiting for the owner), the Crew link, the pencil row and plank, copper and
  "Drawing now": all B4's.
- The commit hash as a link (call 9), the phone frame's foot link "Revisions 7 to 1", closed
  sprints' rows, and a Design row.
- The frame's lede words "or a plank in the hull", which are false on Off, with WebGL refused and
  in print (Iris).
- Seating by merge order, picking in the 2D drawing (inert, as on `/`), and a keyboard path into
  the canvas (the table is that path).
- `/`'s model, loft and control, which don't change; and the unknown record's scripts-off blank 404.

## Riders

- Lens's nit on #74 (`onClick={() => refused || press(value)}`, about 3 B): rides, checked by B5.25.
- Lens's nit on #82 (B5.16 for every record on disk): rides as B5.26 (a), Probe's.
- Iris's rule from 640 to 1023 px, from her #82 review: rides as B5.26 (b). Her commit link doesn't
  (call 9).

## For the owner

Nothing to approve on the specs, so the PR merges on `gate` like sprint 27's. On the preview, at
B5's demo, the owner sees:
- the ghost standing up on `/log` on a GPU and on their phone, and the move's feel;
- the pick;
- the control on `/log`, carrying their choice from `/`;
- Iris's three departures from the frames (her notes, last section), with both frames in the PR
  body:
  - the hull's two sides, translucent, where the frame drew one (one constant reverts it);
  - no "or a plank in the hull" in the lede;
  - no numbers below 768 px, B5a's shipped rule.

Production still serves B5a: Vercel rate-limited #82's deploy (Iris, notes), so the demo needs a
preview that deploys.
