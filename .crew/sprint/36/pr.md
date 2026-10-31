# Sprint 36: the hull on /crew (B4d)

**Goal:** the roadmap's next sprint, B4d (not an owner goal). On `/crew` the card model sits on a
detail drawing of the hull, close on the plank the crew is drawing now, with one graphite tick per
moment the panel lists, under Full/Calm/Off, and the control joins `/crew`'s bar.
**Size:** M. Contract: `.crew/sprint/36/contract.md` (Quill, B4.33 to B4.42), with Iris's calls
(`notes-iris.md`) and decisions 1 to 8 (`decisions.md`).

## What a visitor sees

- `/crew`'s drawing becomes a server-drawn detail, 480 hull units across from 768 and 320 below,
  centred on the pencil plank (or the newest seat at rest). The plank carries its number, one tick
  per moment hanging from its lower edge (at most 10, never moving), and the copper tip while live.
- The poll adds a tick, drops copper when the run opens, inks the plank when the same sprint
  merges, and returns to the record otherwise: all without motion, 1 frame per change, 0 at rest.
- Full lifts the hull off the detail in one 1.8 s move, once a visit, holding the focus point within
  1 px; Calm opens settled; reduced motion gets `/`'s 240 ms fade; Off, Save-Data, forced colours,
  print, scripts off and refused WebGL download no 3D and show the same pencil, tip and ticks.
- The pose turns toward the focus plank's end: bow toward the visitor forward of midship, stern
  toward aft of it (yaw ±35°, pitch 6°).
- Full/Calm/Off in `/crew`'s bar from 768, and at the drawing's foot beside Read as page below.
- Rider: a poll that never settles is aborted at 30 s (Lens's nit on #90, B4.42).

## Results

- `pnpm verify` passes on the head (Atlas, after Probe's knip fix).
- Probe: B4.33 to B4.42 red first on 36360de for the right reasons; the full suite 240 of 240 on
  bff71c5 at CI's 2 workers. The new checks add about 374 test-seconds, about 1.8 min on CI by
  Probe's ratio, so #90's 22.2 min becomes about 24.0 of the 25-minute cap. The next sprint that
  adds 3D checks will need a `.github/` change (the owner's).
- Cost (Pixel, SwiftShader): at most 7 draws of 8; 25,329 triangles at 1440 and 7,935 at 390 with
  10 ticks; the 3D chunk 154,476 B gzip, the same file `/` requests; 0 frames at rest.
- Script (Forge, B2.10's method): `/crew` 17,088 B over the 404's, under the new 18,432 B budget;
  `/` unchanged at 2,039 B. `/`, `/read` and the Log's drawings are byte-identical (JSON diff).
- Iris's early look: on track; two CSS changes taken (the detail at the content width below 1024;
  the foot off the canvas below 768).

## For Lens: loosened bounds and rewrites (no check retired)

- `crew.spec.ts`, `crew-bar.spec.ts` and `crew-live.spec.ts` now run with WebGL refused, as
  sprint 33 did for `/log`, since `/crew` now loads the model.
- B4.14 and B4.31: `/crew`'s script budget goes from the 404's + 16,384 B to + 18,432 B. Reason
  (contract call 7, decision 3): `/crew` now carries B2.10's model loader (Turbopack folds it into
  the route's own chunk, +1,891 B) beside B4c's poller, both allowances in plans the owner merged.
- B4.14's "within 2,048 B of `/log`" goes to 16,384 B: the old bound was vacuous, since its `/log`
  measurement included the 3D chunk (contract call 7).
- B4.1, B4.6, B4.9 (B2.3's assertions for `/crew`'s bar), B4.13 are rewritten with the same
  `expect(` count, as the contract lists.
- B4.38's reduced-motion fade allows opacity, fill and visibility, never movement (decision 7);
  B4.36's depth floor is read as painted pixels, 15 px and 13 px (decision 8).

## Departures, for the owner to see on the preview (nothing waits)

- `/crew`'s hull turns its stern to the visitor when the plank is aft of midship; `/` always shows
  the bow. Sprint 37's seat (2.1) will be the first.
- `/crew`'s drawing is a detail of half to three-quarters of the ship, where `crew-1440.webp` drew a
  close model over the whole sheet.
- On `/crew` only, the shadow fades over the last 40 px inside the canvas (Iris approved).

## Not verified

- The move's feel and frame rate on a GPU and a phone (the cloud renders with SwiftShader).
- At 320 on seat 3.0, two ticks graze the pencil number's chip by up to about 2 px (Iris accepted;
  320 isn't a checked width).
- In live and open, the 3D focus point's hold through the move is checked only in record.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdJC9qJR4aHc8kQPQC
