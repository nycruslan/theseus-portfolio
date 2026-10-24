# Sprint 30 brief for Iris: the ghost hull's three calls, first; then beside the build; then the review (Atlas)

## What this sprint is for

B5a: `/log` replaces `/sprints`. A hiring executive who follows Log sees, in the first screen, the
ghost hull (the ship's 22 original planks in vellum, each numbered by the first sprint that took it
out; complete since sprint 23), its caption and count line, and "Every revision" as a table of
every merged sprint, who drew, checked, tested and approved each. An engineer opens a revision's
number and gets `/log/<n>`: the same page with the record open (the pull request, the plank it
seated and what it replaced, what went wrong). Nothing moves, nothing is copper, no script: the
3D ghost is B5c's, the pencil row and the Crew link B4's. The owner approved the frames
`.crew/sprint/17/design/log-1440.webp` and `log-390.webp`; the contract is
`.crew/sprint/29/b5-first-contract.md` (read it whole: its data rules are what Forge builds and
Probe checks word for word, and its "Needs decision (Iris)" is yours). The plan behind it is
`.crew/sprint/29/b5-plan.md`. Forge builds from the first minute and Probe writes the checks in
parallel; your notes land mid-build, as the control's placement did in sprint 27.

## Part 1: three calls, within the hour

Write them as `.crew/sprint/30/notes-iris.md` in this checkout (don't commit; Atlas commits it)
and message Atlas the moment it's written. Numbers a builder can type.

1. **The 2D ghost's composition** at 390, 768, 1024 and 1440: which views (the frame draws the
   profile alone at 1440 and 390; `/` draws three views from 768 and two below; `/read` the
   profile and half-breadth plan), the scale and the drawing's place against the "Log" heading
   and the count line (the frame: the drawing left, the header right at 1440; stacked at 390),
   and the numbers below 768 (hidden, as on `/`, or shown). The contract's hard parts: from 768 px
   each ghost plank's first holder is set as HTML lettering inside its plank or led out as 5.0 is
   on `/`, at least 10 px; the drawing is inside the viewport and uncropped from 320 to 1440;
   `[data-ghost]` at most 32,768 B of HTML; the `h1`, the count line and the first row of Every
   revision all start inside 1440 × 900 and 390 × 844 (B5.3). Reuse `lib/lines-plan.ts`'s draw
   with a ghost pass: `lib/hull-layouts.ts` has the `WIDE` and `NARROW` layouts.
   **`--vellum`** in both schemes (your sprint 22 notes give light `#cfdcdc` at 0.7; name the
   composited hex for each scheme), its edge, and how the number's ink on vellum holds 4.5:1 in
   both schemes (B5.4; the numbers are composited over the background). It must differ from
   `--card`, `--card-old` and `--background`, and in forced colours each plank's edge must show.
   **`data-current`**: on `/log/<n>` the ghost plank at n's seat carries it; say how it reads
   (an ink edge, a darker vellum, a hatch) without copper.

2. **The record's place.** At 1440 the frame puts the record in a drawn box in the right column
   beside the table, under the Log's header. Below 1024 it's open: after the Log's header, before
   or after the drawing, with B5.3's rule that the record's `h2` starts inside 390 × 844 on
   `/log/13`. It is first in the DOM after the header (`section[aria-labelledby="record"]`, before
   Every revision), so say where it lands by CSS at each width, its box (the frame's 1 px ink
   border, padding, the Close button's look as a plain link), and the Rev previous/next links.
   And the table's fold below 1024: `/`'s revision rows fold under their number (`.rev` in
   `app/globals.css`, 89 px a row at 390); say whether the Log's rows fold the same way or as
   `log-390.webp` draws them (the number, the goal, a muted line of the cells).

3. **The lede's first sentence** ("A crew of AI agents rebuilds this site one sprint at a time."
   is the contract's; the second sentence, "{k} revisions, newest first: choose one to open its
   record.", is fixed), and whether Approved gets a one-line key, as the frame's record says it
   ("Gate: CI, the owner's rules and Lens"). A key is plain text, no link, and can't use the words
   "Merged", "Shipped" or "Failed" in any case (the C4.4 rule B5.6 keeps). Also the heads: the
   contract lets the Log set its heads in the display face (Sofia Sans Extra Condensed), as the
   frame draws "Log" and "Every revision"; confirm the sizes against `/`'s steps.

Constraints that hold: no horizontal scroll at 320; 24 px targets from 1024 and 44 on phones; one
ring per focused link; CLS 0; links ink and underlined except the bar's; nothing `--accent`; the
same tokens, faces and bar as `/`. The bar on `/log` is the sheet's minus the control, with the
wordmark as the way home (your sprint 22 notes, section 6).

## Part 2: beside the build, then the review

Atlas messages you when Forge has a build running, with its URL (or serve a worktree yourself:
`git worktree add /home/user/wt-iris-30 <branch>`, `pnpm install --frozen-lockfile`,
`pnpm build`, `node node_modules/next/dist/bin/next start --port 4720 &`, note `$!` and kill the
`next-server` child by PID when done; your ports are 4720 to 4729). Look early at 320, 390, 768,
1024 and 1440, both schemes, scripts off, forced colours, a record open, and say exactly what to
change while it's cheap. When the build is done, review it against `design/rubric.md`, the two
frames and production's `/sprints`, score it, and write `.crew/sprint/30/review-iris.md` with
`Verdict: ship`, `changes` or `blocked` on the first line, your musts and your cheap changes
apart, frames in your scratchpad or `.crew/screenshots/sprint-30/` (git ignores it) with a line
saying what each shows. Name what departs from the approved frames for the owner (no lines figure
or Merged column yet, the ghost in 2D, the caption reworded for a hull with no gaps, no foot link
on the phone), in one paragraph Atlas can put on the PR. Then at most three memory lines citing
`.crew/sprint/30/`, and correct any line of yours that proved wrong.
