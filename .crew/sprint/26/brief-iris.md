# Sprint 26 brief for Iris: the phone's settled pose, then beside the build, then the review (Atlas)

## What this sprint is for

B3's second build sprint: your registered loft at every width. On a phone the model lands on the
profile the narrow sheet draws (the three-view sheet from 768 px, the profile and half-breadth plan
below it, as the owner approved in sprint 22's B1), lifts and settles at three-quarters; quality
steps itself, with a still frame under 30 fps. The contract is `.crew/sprint/26/contract.md`; its
"Needs decision (Iris)" has two items, the first of which the build needs early.

## Part 1: the phone's settled pose, first, within the hour

The facts: the narrow drawing (`lib/hull-layouts.ts`, `NARROW`) is a 390 × 260 box at 390 px with
the profile at scale 0.5 (the hull 59 px tall, 312 px long, at y 40 to 99) and the half-breadth
plan's centreline at y 190. The canvas is that box, so the settled model must fit inside it. The
spike's phone loft held the height: `.crew/sprint/24/spike/frames/s5-loft-390.webp` shows the
settled hull at 61 px, the same as its drawing. The owner approved `rest-390.webp` and
`hero-390.webp` (`.crew/sprint/17/design/`), where the rest pose is a hull most of the drawing's
width over the body plan, which the narrow sheet no longer has. The phone pose is yaw −36°, pitch
16° (spike S5). Production at 390 (https://theseus-portfolio.vercel.app) shows the drawing the
model lands on; the model itself runs there from 1024 px only, so judge the desktop loft at 1440
for the move's feel and the narrow sheet for the landing.

Decide, with values a builder can type, and the reason:

1. `G_NARROW`: how much the framed height grows from frame 1 to settled on the narrow drawing
   (0.1 is the desktop's; the box allows more: say what it should be and what the settled hull's
   height is at 390 and 320);
2. the settled offset on the narrow drawing (dx, dy in drawing units from the registered pose), so
   the settled hull and its shadow sit where you want them against the half-breadth plan;
3. whether this departs visibly from `rest-390.webp` as the owner approved it: if it does, say so
   in one paragraph Atlas can put to the owner on the PR with the preview.

Write them as `.crew/sprint/26/notes-iris.md`, in this checkout on `sprint/26-phones` (commit,
don't push), and report them to Atlas as soon as they're written: Atlas relays them to Pixel
mid-build, and Probe copies `G_NARROW` into the checks.

## Part 2: beside the build, then the review

Atlas messages you when Pixel has a build running, with its URL. Look at it early at 390 and 320
(DPR 2), 768 and 1440, both schemes, with reduced motion, against your call, `rest-390.webp` and
the rubric, and say exactly what to change while it's cheap: the growth, the offset, the shadow and
the dark scheme on the small hull, the hollow drawing under it, and the hand-off at 390. When the
build is done, review it against `design/rubric.md` and production (pixel-identical at 1440 and
1024 is the expectation; 390 and 320 are what changes), score it, and write
`.crew/sprint/26/review-iris.md` with `Verdict: ship`, `changes` or `blocked` on the first line,
your musts and your cheap changes apart, with frames in your scratchpad or `.crew/screenshots/`
(git ignores it) and a line saying what each shows. Then at most three memory lines citing
`.crew/sprint/26/`. Your ports, if you serve anything: 4720 to 4729.

## Resumed, run 2 (Atlas, 2026-10-23): part 2, the early look, on your own served build

Part 1 is done and taken (decision 7; `lib/model/calls.ts` carries your constants). The first run's
container is gone with Pixel's served build, so serve your own: `git worktree add
/home/user/wt-iris-26 origin/sprint/26-phones` (head `63956d8`, Pixel's whole build), `pnpm install
--frozen-lockfile`, `pnpm build`, then `node node_modules/next/dist/bin/next start --port 4720 &`
and note `$!` to kill it when you're done. Chromium's WebGL there is SwiftShader: what you see is
the geometry, the shading and the composition, not a phone's frame rate.

Do the early look now against the four items in your notes' "What the early look should check",
at 390 and 320 (DPR 2), 768 and 1440, both schemes, reduced motion, against `rest-390.webp` and
the rubric, and report what Pixel should change while it's cheap, each as a value or a file and
line. Pixel starts after Probe reports and takes your list with Probe's checks. Keep the review
(the verdict, `review-iris.md`, the score, the memory lines) for when Atlas messages you that the
build is final; if the early look finds nothing to change, say so and the review follows on the
same head.
