# Sprint 55's contract: Yc, the press in 3D (Atlas)

**The outcome.** On `/log` and `/log/n`, in Full and Calm, the Theseus joins the ghost in one canvas,
and a press of a step link (or ← and →) moves one plank, the real merge that step is: in Full the
plank that leaves lifts, arcs and lands on the ghost's seat while the sprint's card plank presses
into the gap; in Calm the same change is the site's 240 ms linear fade. The page's words become the
next step's, from the server, the URL is replaced (history never grows), and a live region names the
step once the plank lands. Any key, press or scroll lands a moving plank at once. Off and no script
stay exactly Ya's and Yb's pages.

It is Quill's Yc (`.crew/sprint/52/plan.md`, "Yc (M): the press, in 3D"), started from Pixel's spike
(`.crew/sprint/53/spike-pixel.md`), on Iris's direction (`.crew/sprint/52/direction-iris.md`, "The
loop" and "What it must never break").

## What this contract settles (the plan's four questions)

1. **Draws: at most 8 on /log, flying included.** Merge the two hulls' seams and outlines (the
   spike's recommendation 1); merging the ghost's marks and leaders too, for 7, is Pixel's call.
2. **Levels: 72 × 6 from 768 and 40 × 3 below, for both hulls, on the Log only,** if Iris passes the
   look (spike 2). `/` keeps its level. Triangles stay ≤ 30,000 from 768 and ≤ 12,000 below.
3. **The step's words come from the server's own page for that step.** The controller fetches
   `/log/<n>`'s prerendered HTML (prefetching the neighbours once the model is settled or still),
   parses it, and swaps in the step's regions: the record, the captions and counts, the question,
   the step links, the revision table's open row and `document.title`. That makes Y16 true by
   construction, at about 17 KB gzip a step, cached. If the fetch fails, the link navigates as in Off.
4. **What leaves at steps 24 to 51 is Iris's and Pixel's call**, written in
   `.crew/sprint/55/press-iris.md` before the flight is finished. The contract's default, if they
   don't call it: from step 24 the Theseus's leaving card plank lifts and fades off the Theseus,
   and the ghost, already whole, doesn't change. On 1 to 23 the leaving original lands on its
   ghost seat. Either way the drawing after the press is the server's drawing for that step.
5. **One rig, two materials.** Whether the Theseus on the Log takes its own light gain (spike 3)
   is Iris's call, in the same file.

## The interface between the 3D and the controller (written down before the build)

Forge owns `lib/model/yard.ts`, the controller. Pixel owns the 3D (`lib/model/*` apart from
`yard.ts`), and wires the controller into the Log's mount.

```ts
// lib/model/yard.ts
/** Moves the hulls between two steps; `from` and `to` index the steps (merged sprints, ascending). */
export type Press = {
  /** Full flies one plank, Calm fades; resolves once the plank has landed. Never called when Off. */
  go(from: number, to: number): Promise<void>;
  /** Lands a moving plank at once; `go`'s promise then resolves. */
  land(): void;
};
export type MakePress = (steps: readonly number[]) => Press;
/** Takes the Log's step links and keys over; returns the teardown. */
export function startYard(doc: Document, makePress: MakePress): () => void;
```

- The controller reads the steps from the page (the revision table's merged rows), finds the open
  one from the URL, swaps the words when a press starts, calls `go`, swaps both drawings' markup
  for the server's once `go` resolves (so the page under the canvas is the step's), replaces the
  URL, and then writes the live region. A press while one is moving calls `land()` first.
- Until Pixel's press lands, Forge's mount call passes a press that resolves at once, so each
  worktree stays green alone. Atlas integrates the two.

## Checks (Probe, `e2e/log-press.spec.ts`, red on main first)

- **Y12:** in Full and Calm on `/log/13`, `/log/23` and `/log/40`, at 1440 × 900 and 390 × 844, one
  canvas registers both hulls on their two drawings at frame 1 (as B5.18 registers the ghost).
- **Y13:** a press of Next in Full moves exactly one plank of the Theseus (and, on 1 to 23, the
  same seat of the ghost), and frames are drawn only while it moves: 0 frames once it has landed.
- **Y14:** in Calm, and under reduced motion with no mode stored, a press never flies: no plank
  leaves its seat's box; the change is a fade of at most 240 ms.
- **Y15:** a key, a pointer press or a scroll during a flight lands the plank within one frame,
  and the settled canvas matches the step's.
- **Y16:** after presses from `/log/13` to `/log/14` and back, `location.pathname` is the step's,
  `history.length` hasn't grown, and the record, captions, counts, question, step links and title
  equal the server's HTML for that step. On 22→23 the question appears; on 23→24 it goes.
- **Y17:** ← and → step like Previous and Next (not while focus is in a form field, and not at the
  first or the newest step); a polite live region, present in the server HTML and empty at load,
  names the step once the plank lands, and only then.
- **Y18:** budgets. The loader script adds 0 B (B2.10 and B5.10 unedited). The 3D chunk stays under
  B3.6's and B5.23's limits, and the delta is reported against the plan's 4 to 7 KB. Draws ≤ 8 and
  triangles within budget while flying, 0 frames at rest, off-screen or hidden.
- **Kept:** every check that runs today stays green unedited, unless Probe's contract mutant (a bare
  two-hull canvas on the Log) finds one red; each such red is named here before the build, with
  its rewrite or retirement for Lens to accept.

## Budgets

`plan.md`'s table, unchanged: 0 B of loader, chunk ≤ 250,000 B gzip -9, ≤ 8 draws, the triangle
caps, 0 frames at rest, LCP text, CLS 0, WebGLRenderer and GLSL only, each CI shard under 20
minutes.

## Out of scope

Hold to riffle, Home, End, Escape and the hand-off to Crew (Yd); anything on `/` (Ye); the record in
the motion (bounces, sprint 16 struck) and the second ghost; sound; owner paths and `content/`.
