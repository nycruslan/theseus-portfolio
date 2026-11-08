# Sprint 56's contract: Yd, hold to riffle (Atlas)

**The outcome.** On `/log/n` in Full and Calm, a visitor who holds a step link (pointer or touch) or
holds ← or → watches the two ships trade planks like a riffled flip book: the first step at once,
then steps coming faster, 400 ms easing to 80 ms apart, until the riffle stops itself at a chapter
(the 22nd merge, sprint 23; the 44th, sprint 45; the first and the newest steps) or the visitor lets
go. Home and End jump to the first and newest steps. At the newest step a plain link hands off to the
live crew. Calm never goes faster than a step every 400 ms. Off and no script stay Ya's and Yb's
pages, plus the hand-off link, which is server HTML.

It is Quill's Yd (`.crew/sprint/52/plan.md`, "Yd (M): hold to riffle") on Iris's direction
(`.crew/sprint/52/direction-iris.md`, "The loop" 3 and 6, "Keyboard and touch"), built on Yc's press
(`.crew/sprint/55/contract.md`, `lib/model/yard.ts`). Yc took Y19, so Yd's checks are **Y20 to Y24**
and Ye's become Y25 to Y27.

## What this contract settles

1. **A hold is a press kept down past 400 ms.** A quick press (pointer, touch, Enter or an arrow
   tap) stays exactly Yc's one step. A press steps once at once, as today; if it is still down 400 ms
   later the riffle starts, and the click that ends a held pointer press does nothing more. On touch
   the step links show no callout or context menu while the model plays them (Off keeps the
   browser's).
2. **The pace.** The gap between steps eases from 400 ms to 80 ms (the curve is Pixel's and Iris's
   call, written in `.crew/sprint/56/riffle-iris.md` or Pixel's report), never below 80 ms, and never
   below 400 ms in Calm or under reduced motion with no mode stored.
3. **The stops.** Riffling forward stops on reaching 23, 45 or the newest step; backward on reaching
   45, 23 or the first. A stop ends the riffle even while the press is held: going on takes a new
   press. A riffle never queues a step: a step that would start past a stop, or after a release,
   keyup or Escape, never starts.
4. **Home and End.** With focus on a step link (inside `.record`), Home goes to the first step and
   End to the newest, as one jump: the hulls show the step (the press's existing jump path in
   `mount.ts`), the URL is replaced, the live region names it. Elsewhere Home and End keep scrolling
   the page, since a keyboard visitor reading the table needs them (Atlas, decision 3). Escape stops
   a riffle anywhere on the page.
5. **The words during a riffle.** The hulls never wait on the network. The words may skip the steps
   flown past, but never show a step the hulls haven't reached, and once the riffle stops they are
   the server's for that step, as Y16 holds after a press. A riffle may prefetch ahead in its
   direction (at most the pages to the next stop).
6. **The hand-off.** On `/log` and on the newest step's `/log/n`, server HTML in every mode, one plain
   link: "Watch the crew build the next one on Crew", to `/crew` (Iris's words in the plan). When a
   press or riffle reaches the newest step, the link is there as the server's words for that step.
7. **The live region speaks once, at the stop,** naming the step the riffle stopped on; never once a
   step during the riffle.

## The interface (written down before the build)

Forge owns `lib/model/yard.ts` (the controller: holds, the pace's clock, stops, Home, End, Escape,
the prefetch) and the server markup and CSS. Pixel owns the 3D (`lib/model/*` apart from `yard.ts`).

```ts
// lib/model/yard.ts, Yc's Press with one optional argument
export type Press = {
  /**
   * Full flies one plank, Calm fades; resolves once the plank has landed. `pace`, in a riffle, is
   * the ms until the next step may start: Full fits the plank's motion into it (Pixel's call how),
   * Calm fades within it. Without `pace`, Yc's press, unchanged. Never called when Off.
   */
  go(from: number, to: number, pace?: number): Promise<void>;
  /** Lands a moving plank at once; `go`'s promise then resolves. */
  land(): void;
};
```

Until Pixel's paced flight lands, the controller's calls work with Yc's `go` (a riffle step lands the
moving plank first, as a press during a flight does today), so each worktree stays green alone.

## Checks (Probe, `e2e/log-riffle.spec.ts`, red on main first)

- **Y20: the riffle on the clock.** With `page.clock`, in Full and Calm on `/log/13`, holding Next
  steps once at once, then riffles with gaps that start at 400 ms, never grow, reach 80 ms in Full
  and never fall below it (400 ms in Calm, and under reduced motion with no mode stored); a quick
  press is exactly one step. It stops at 23 from 13, at 45 from 30, at the newest from 50, and
  backward at 23 from 30, each while still held.
- **Y21: keys.** Holding → riffles as holding Next does, and ← as Previous; keyup, a pointer release
  and Escape stop it, with no step after; Home and End on a focused step link go to the first and
  newest steps with the URL replaced and `history.length` unchanged; Home and End elsewhere scroll as
  before; none of it while focus is in a form field.
- **Y22: the hand-off.** On `/log` and the newest `/log/n`, in Off, no script, Full and Calm, the link
  "Watch the crew build the next one on Crew" goes to `/crew`, once; no other step has it; a press
  from the step before the newest brings it.
- **Y23: frames, stops and words.** During a riffle frames are drawn; within one frame of the stop
  (or a release), none, and 0 at rest after it; no step starts past a stop or after a release; once
  stopped, the record, captions, counts, question, step links, title and live region equal the
  server's for that step, and the settled canvas matches a cold load of it (Y15's tolerance); no
  layout shift without recent input during or after a riffle (B5.25's CLS 0 holds); draws ≤ 8 and
  triangles within budget while riffling.
- **Y24: INP and budgets, reported.** INP during a riffle at 4x CPU, reported in the PR, not gated
  (as B3.9's isn't). The loader adds 0 B (B2.10 and B5.10 unedited); the 3D chunk stays under B3.6's
  and B5.23's limits, and its delta is reported against what is left of the 250,000 B.
- **Kept:** every check that runs today stays green unedited, unless Probe's contract mutant (the
  hand-off link on `/log` and the newest record, and a bare hold handler) finds one red; each such red
  is named in `decisions.md` before the build, with its rewrite or retirement for Lens to accept. Grep
  first for checks that pin `/log`'s links, Tab stops or the record's height.

## Budgets

`plan.md`'s table, unchanged: 0 B of loader, chunk ≤ 250,000 B gzip -9, ≤ 8 draws, the triangle
caps, 0 frames at rest, LCP text, CLS 0, WebGLRenderer and GLSL only, each CI shard under 20 minutes.

## Riders (Lens's nits from Yc, on the same code)

- Forge: prefetch a pressed step's neighbours once its page arrives (`yard.ts:178`); the stale
  comments in `components/lines-plan.tsx:29` and `components/log.tsx:226`; the caption under the
  canvas at rest (`app/globals.css:953`).
- Pixel: on a teardown before the step's page arrives, restore the drawings' hidden numbers and remove
  the clone (`lib/model/mount.ts:1225`).

## Out of scope

Anything on `/` (Ye); the record in the motion (bounces, sprint 16 struck), the second ghost and
sound; a riffle on `/log` itself (it has no step links: Start again stays a navigation); drag, a
slider or a free camera; owner paths and `content/`.
