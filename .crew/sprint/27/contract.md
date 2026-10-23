# Sprint 27 contract: Full, Calm, Off

Atlas, 2026-10-23. B3's last build sprint, as Quill planned it (`.crew/sprint/24/b3-plan.md`,
"Sprint 27"), on the model as shipped by sprints 25 and 26 (`.crew/sprint/25/contract.md` and
`.crew/sprint/26/contract.md`, their data rules and decisions; PRs #72 and #73). The control is the
one the owner approved on sprint 17's canvas (`.crew/sprint/17/design/motion-control.webp`; Iris's
sprint 22 notes, section 9, give its look). Sprints 25 and 26's data rules hold word for word except
where this contract changes them below. **Amendment 1** (Atlas, after Iris's part 1): the group's
place below 768 px is the drawing's foot in `main`, not the bar, with two sized slots; "The
control", B3.16 and the B2.3 rewrite say so. Every GPU number is still SwiftShader's floor; the 30 fps
budget and the loft's feel are checked on the owner's phone at the B3 demo, on this PR's preview.

## Outcome

A hiring executive opens `/`. The loft plays once, as today. In the bar, after Read as page, a small
labelled control reads Full, Calm, Off, with Full pressed. Calm opens the model settled and never
moves it; Off is the drawing alone, and the page downloads no 3D. Whatever they press is what the
page does, at once and on every later visit from that device. Someone whose system asks for
reduced motion finds Calm pressed. Nothing they read moves when the control arrives, and the page
without scripts is the sheet it is today, with the control's place kept.

## The calls I made

- **The choice is a mode, and the device's hints only set its default.** The mode is `full`, `calm`
  or `off`. With nothing stored it is `off` under Save-Data, else `calm` under
  `prefers-reduced-motion: reduce`, else `full`; and while nothing is stored it follows those
  hints live. A press stores the choice, and from then on the choice wins: a visitor with reduced
  motion who presses Full asked for the loft and gets it. B3.4 reads the default and stays unedited.
- **A press of Full plays the loft.** "Once a visit" guards against repetition on loads; a press is
  a request. Pressing Full from Calm or Off tears the model down and builds it again with the
  once-a-visit flag ignored, so the drawing returns whole and lifts off again, which is the replay
  a visitor expects. Pressing the mode already pressed does nothing.
- **Calm is the rest the model already has.** It opens settled and draws only on a resize or a
  scheme change: sprint 25's "on demand" rules, with no landed or lofting frame ever.
- **Off tears down and releases.** Off pressed mid-visit stops the model (sprint 25's teardown:
  the canvas goes, `data-state` goes, the whole drawing returns, `forceContextLoss` frees the
  context). Off at load runs no probe and imports no chunk. The loader keeps its own refusals
  (forced colours, no `webgl2`): in forced colours the layer is hidden anyway (B3.14); with no
  WebGL 2 the control shows Off pressed with Full and Calm `disabled`, since neither could change
  anything, and nothing is stored for it.
- **The control exists only where scripts run, in a slot the bar keeps.** The slot is in the
  server's HTML at the group's size at every width, so the buttons' arrival moves nothing (CLS 0),
  as Print's slot on `/read`. The page without scripts shows the slot empty, so its emptiness has
  to look intended (Iris).
- **Desktop placement is the approved frame's; the phone's is Iris's call, taken** (amendment 1,
  `.crew/sprint/27/notes-iris.md`). From 768 px the group sits in the bar after Read as page
  (`main.webp`): 44 px tall to 1023, 32 from 1024. Below 768 px the bar is full (42 px of air at
  390, 9 at 320, against a group of 183), a second sticky row would be 97 px of chrome at every
  scroll position and a strip fixed to the viewport's bottom would cover the bio at 320 × 568, so
  the group sits at the drawing's foot: a 44 px row of `main`'s grid after `[data-model]` and
  before the title block, right-aligned 16 px in, 12 px above the title block's rule. It costs the
  first screen 44 px at 390 × 844 (B1.1 holds with 215 px to spare on her mock) and departs
  visibly from `hero-390.webp`, whose bottom strip held Read as page too; her paragraph for the
  owner (notes, section 7) goes on the PR with the preview, as sprint 26's rest pose did. The Tab
  order is the plan's at every width: skip, Work, Log, Contact, Read as page, Full, Calm, Off, then
  the title block's links (below 768 the group is `main`'s first focusable), so Contact's first
  link is the 15th stop either way.
- **One store, two readers.** A small module holds the mode (`localStorage` under `theseus:motion`,
  every access inside try/catch), the default from the hints, and a subscription. The control in
  the bar and the loader in `main` both read it with `useSyncExternalStore`, whose server snapshot
  is "no scripts", so the server renders the empty slot and the first client render has the stored
  mode. Storage that throws gives the default and no error; the choice then holds for the visit.
- **The bytes stay inside B2.10.** `/`'s first-load script with WebGL refused stays within 2,048 B
  of `/sprints'` as the check measures it: the sum of the decoded script bodies, not gzip (the
  loader is 961 B decoded today, 635 B gzip), so the control and the store share about 1,000 B
  decoded. Forge measures first; if it can't fit, the number goes under "Needs owner decision"
  (B2.10 is a live check, and widening it is the owner's) and nothing is widened quietly.
- **The fallback face rides.** On a cold cache production's fallback font wraps the bar's nav at
  390 and scrolls the page 21 px sideways at 320 (`.crew/sprint/26/review-iris.md`; the `.rev`
  labels, likely). The bar is this sprint's code, so both are fixed here and checked with the fonts
  refused.
- **Lens's nits on #73 ride** (`ROADMAP.md`): see "Riders".

## Data rules (the page and Probe's harness implement these word for word)

**The mode.**
- `mode = stored ?? (saveData ? "off" : reduce ? "calm" : "full")`, where `stored` is
  `localStorage["theseus:motion"]` when it is one of `full`, `calm`, `off`, read inside try/catch,
  `saveData` is `navigator.connection.saveData === true` and `reduce` is
  `matchMedia("(prefers-reduced-motion: reduce)").matches`.
- With nothing stored, a change of `reduce` changes the mode at once. A press stores the mode (a
  throwing `setItem` is swallowed) and applies it at once.
- With the `webgl2` probe refused, the control shows Off pressed, Full and Calm `disabled`, and
  stores nothing.

**The control.**
- Two slots, both in the server's HTML at every width, each `[data-motion]` and sized to the
  group at its width: one in the bar's `nav` after the four links (shown from 768 px, hidden
  below), one in `main` after `[data-model]` and before `main > header` (shown below 768 px, hidden
  from it). Exactly one is shown at any width, and only the shown one holds the group: when
  scripts run it holds `<fieldset aria-label="Motion">` (the implicit `group` role; biome refuses a `div` with the role) with three
  `<button type="button" aria-pressed>` reading Full, Calm, Off in that order, exactly one
  `aria-pressed="true"`, and that slot carries `data-mode` with the mode (the builder renders the
  group into the shown slot, or into both with the hidden one `display: none`, so its buttons are
  never Tab stops). Without scripts both slots are empty and the same size.
- Targets: at least 44 × 44 CSS px below 1024 px, at least 24 × 24 from it; every button inside
  the viewport at 320, 390, 768, 1024 and 1440; no horizontal overflow at 320. The pressed button is
  told apart without colour alone, so in forced colours its border or outline differs from the
  others'. Each focused button shows exactly one ring (B2.9's rule). The control isn't printed, as
  the bar isn't.
- The group's size, placement and styling at every width are Iris's (`notes-iris.md`, sections 2
  to 5: the slot's box per width, the buttons' borders as the 1 px dividers, pressed in ink with
  film text, hover on `--rule`, the ring over both neighbours by `z-index`, forced colours on
  `Highlight`/`HighlightText`).

**The modes and the model.**
- **Full.** As sprints 25 and 26: the loft once a visit, skippable, settled on a second load,
  Back or an unseen page. A press of Full from Calm or Off stops the model and mounts it again
  with the once-a-visit flag ignored: frame 1 lands on the drawing and the loft plays, unless the
  layer is off-screen or the tab hidden, in which case it opens settled. The flag is set either way.
- **Calm.** The model mounts and opens settled with no landed or lofting state ever set and no
  moving frame drawn; at rest it draws 0 frames, and exactly 1 on a scheme change or a refit.
  Pressed mid-loft, the loft ends at the settled frame within 2 frames (sprint 25's skip). The
  reduced-motion fade applies as today under `reduce`.
- **Off.** The loader never probes WebGL and never imports the chunk; the page's requests and its
  live contexts are the WebGL-refused page's. Pressed mid-visit (at rest or mid-loft): within 2
  frames `data-state` is gone, the canvas is removed, the planks are filled and the numbers shown
  as on the Off page, and the harness counts 0 live contexts; the chunk is not requested again
  unless Full or Calm is pressed.
- The loader passes the mount how to open: `auto` (Full's once-a-visit rule), `settled` (Calm,
  and a Back) or `loft` (a press of Full). The mount exposes `settle()`, which ends a running loft
  at the settled frame within 2 frames (today's reduced-motion listener, which moves to the
  store's reader), and `stop()` as today. The mount reads no media query for motion itself.

**Riders (code).**
- `cross()` resets the ratio cap before its mid-build early return, so a 768 px crossing during
  the build doesn't keep the old cap (Lens, #73).
- `[data-model]` gets `overflow: clip`, so the canvas keeps the old drawing's size for no visible
  frame after a crossing or a lost context (Lens, #73).
- The stray JSDoc above `cardGeometry` in `lib/model/stage.ts` goes (Lens, #73).
- A phone's toolbar show/hide re-solving the loft at rest is a demo question (Lens, #73): the
  owner looks for it on the preview; a refit only on width or box changes follows if it shows.
- The fallback face: with the woff2 files refused, the bar's four links stay on one row at 390
  and 320, and `scrollWidth` equals `clientWidth` at 320 and 390 on `/`, in both schemes. Iris
  measured the cause (notes, section 8): the wordmark's Extra Condensed fallback is 113 px against
  78 warm, which eats the bar's 42 px and wraps Read as page; the fix is the condensed fallback
  fitted to its real width (`size-adjust` on `sofiaCondensed`'s fallback in `app/fonts.ts`) and
  `white-space: nowrap` on the links, with B1.10 unedited. Lens's two comment nits on #67 (the
  stale font comments in `app/fonts.ts` and `app/layout.tsx`) ride with that edit.

## Checks

Each is a Playwright test in `e2e/`, titled by its number and what it asserts. The B3 numbers
continue from B3.15; the control's own checks go in a new `e2e/motion.spec.ts` (the harness in
`e2e/webgl.ts` and `e2e/model.ts` is reused: `openModel`, `live()`, the frame recorder, the clock).

**B3.16 The control.** At 320, 390, 768, 1024 and 1440: exactly one `[data-motion]` is shown; from
768 it is in the bar's `nav` after the four links and right of Read as page, below 768 it is in
`main` between `[data-model]` and `main > header`; it holds a group named Motion with buttons
Full, Calm, Off in order, exactly one pressed, Full by default; each a target of the width's
size (44 below 1024, 24 from it) inside the viewport; the hidden slot's buttons, if any, are not
Tab stops. With scripts off both slots are in the HTML, empty, and the boxes of the wordmark,
every bar link, the h1 and the first fact heading are the same as with scripts on, within 0.5 px;
no layout-shift entry over load + 2 s with the model loading (B3.9's method). No horizontal
overflow at 320. B1.1's fold at 390 × 844 holds (unedited; run it).

**B3.17 Full.** At 1440 and 390 × 844: Calm pressed at rest, then Full: `theseus:motion` is
`full`, the model reaches `landed` then `lofting` then `settled` from frame 1 (registered within
B3.1's bound), and the loft's duration holds; Off then Full: the chunk is requested once more (or
served from cache) and the loft plays; Full pressed while Full sets no new `landed` state.

**B3.18 Calm.** At 1440 and 390 × 844: Full mid-loft, then Calm: settled within 2 frames and
`calm` stored; a reload opens settled with no landed or lofting frame and Calm pressed; at rest 0
frames over 2 s, 1 on a scheme switch; from Off, Calm requests the chunk and opens settled.

**B3.19 Off.** At 1440 and 390 × 844: Off pressed at rest and mid-loft: within 2 frames no
`data-state`, no canvas in `[data-model]`, every plank filled and the numbers shown as on the Off
page, 0 live contexts, `off` stored; with `off` stored before load: no WebGL context requested at
all (the probe included), no script beyond the WebGL-refused page's, Off pressed, and the sheet
below the bar pixel-identical to the WebGL-refused page's in both schemes. With WebGL refused and
nothing stored: Off pressed, Full and Calm `disabled`, nothing stored.

**B3.20 Storage.** Each mode survives a reload (and a new tab, since `localStorage` is shared);
with `localStorage` throwing on `getItem` and `setItem`: the default (Full; Calm under reduce),
no console or page error, and a press still switches the mode for the visit (Off tears down, Full
plays).

**B3.21 Reduced motion and the default.** At 1440 and 390: `reduce` with nothing stored: Calm
pressed, settled (B3.4 stays unedited); `full` stored with `reduce`: the loft plays; nothing
stored and `reduce` switched on mid-loft: settled within 2 frames and Calm becomes pressed;
`reduce` switched off again with nothing stored: Full pressed, no loft (still settled). Save-Data
with nothing stored: Off pressed and nothing downloaded (B3.5's case stays unedited); Save-Data
with `full` stored: the loft plays.

**B3.22 Forced colours and the keyboard.** At 1440 and 390 in forced colours: each focused
button shows exactly one ring; the pressed button's border or outline differs from the others';
Tab reaches Full, Calm and Off in order after Read as page; Space and Enter press.

**B3.23 The fallback face.** With every `.woff2` request aborted, at 320 and 390 in both schemes:
the bar's four links share one row (equal tops), `scrollWidth` equals `clientWidth` on `/`, and
the fold (B1.1's items at 390 × 844) holds.

**B2.3 rewritten, same assertions** (`e2e/sheet.spec.ts`, the first B2.3): at 1440 the bar's
controls are the four links then the three buttons, Read as page the right-most link and the
group right of it; at 320 and 390 the bar's controls are the four links alone and the group is
`main`'s, between the drawing and the title block; each control a 24 px target inside the
viewport at 320, 390 and 1440 (44 below 1024 for the buttons); each link lands on its target. The
second B2.3 (the bar above the facts, at 1024) adds the buttons' centres to the points it
hit-tests.

**keyboard.spec.ts rewritten, same assertions:** Contact's first link is the 15th Tab stop: skip,
the 4 bar links, Full, Calm, Off, the 3 title-block links, the Log link, the project links, then
it; `tabUntil`'s bound rises to 15 (a harness change). "Tab visits every link in DOM order" takes
the three buttons as stops with one clear ring each.

**Live checks the build must keep unedited:** B1.1 (the fold at 390 and 1440, with the slot),
B1.4, B1.8 (no script, nothing moves: the slot is empty and still), B1.9, B1.10, B2.9 (24 px
targets for every link and button on a phone; one ring in forced colours), B2.10 (script bytes
with WebGL refused, within 2,048 B decoded of `/sprints'`), the invariants, B3.1 to B3.15 (the default
mode is Full, so each runs as today; B3.5's Save-Data case reads the default `off`). Nothing
retires, no owner path changes, so the PR doesn't wait for the owner unless the bytes don't fit.

## Budgets that apply to sprint 27

| Measure | Budget | Today |
|---|---|---|
| First-load script on `/` with WebGL refused | within 2,048 B decoded of `/sprints'` (B2.10 sums the bodies) | the loader, 961 B decoded (635 B gzip) |
| CLS | 0 over load + 2 s, the control's arrival included | 0 (B3.9) |
| Targets | ≥ 44 × 44 below 1024 px, ≥ 24 × 24 from it | the bar's links 44 and 24 |
| Calm at rest | 0 frames; 1 on a scheme change or refit | sprint 25's rest |
| Off | 0 WebGL contexts requested at load; 0 live after a press | B3.5, B3.15 |
| Settle on a press or a hint | within 2 frames | B3.3, B3.4 |
| Fold at 390 × 844 | B1.1's items inside the first viewport | holds today |

## Riders

| Rider | Disposition |
|---|---|
| Lens's four nits on #73 (`ROADMAP.md`) | **Ride**: three as "Riders (code)"; the toolbar refit as a demo question |
| The cold-cache fallback face at 320 and 390 (Iris, sprint 26) | **Rides**: the bar is this sprint's code; B3.23 |
| The "Base" label under the shadow's tail on the narrow sheet (Iris, sprint 26) | **Don't ride**: the sheet's composition is the owner's; on the demo list |
| The roadmap's font and facts riders; B4's phone bar re-lay | **Don't ride**, unless Iris's placement re-lays the phone bar, in which case she says what changes |

## Out of scope

- The ambient light, the camera between views and the live marks (B4 and B5: the control's rows
  for them come with them).
- The control on `/read`, `/sprints` or the 404; the model on `/read`.
- A `storage` event from another tab (the mode is read at load; a reload shows the other tab's
  choice).
- Any change to `content/` or an owner path; GSAP; WebGPU.

## Needs decision (Iris)

1. ~~Where the control sits below 1024 px, and its sizes at every width~~ **Taken** (amendment 1,
   `notes-iris.md`): the drawing's foot below 768 px, the bar from it; the sizes in her sections 2
   to 5.
2. **The pressed state in forced colours and in the dark scheme on the running build**, and how
   the empty slot reads without scripts (her part 2).

## For the owner: the B3 demo, on this PR's preview

On their phone and at 1440: 30 fps through the loft, the DPR ladder and the still frame on a real
GPU, the e² loft's feel at 390, the dark hull under the warm lamp; the control (Calm and Off, a
reload that opens settled, reduced motion starting at Calm); whether a toolbar show/hide re-solves
the loft at rest; and the "Base" label under the shadow's tail on the narrow sheet.
