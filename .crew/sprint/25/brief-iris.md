# Sprint 25 brief for Iris: the loft's calls, then beside the build, then the review (Atlas)

## What this sprint is for

B3's first build sprint, your signature moment from sprint 17's direction: on `/` at 1024 px and
up the white card model lands on the inked profile, lifts off in one dolly-zoom and settles at
three-quarters, once a visit. The contract is `.crew/sprint/25/contract.md` (Quill's draft adopted,
with four amendments in its header). Its "Needs decision (Iris)" section lists eight calls with
Pixel's numbers from the spike beside each; they are yours, and they are made before the review
label, not after. Pixel builds the contract's values as named constants from the first minute, so
each of your calls is a one-line change in the build.

## Part 1: the eight calls, on the running prototype, first

The spike's prototype is running on this machine at **http://localhost:4534/** (the built home page
with the spike's driver over it; Atlas started it). Its query, from `.crew/sprint/24/spike/proto/proto.js`:
`?option=a&play=2400` plays the loft (`play=<ms>` for another duration), `u=<0..1>` holds one
frame, `show=svg|canvas|both`, `live=1` shows a pencil and a copper plank, `dpr=<cap>`. Use the
chrome-devtools tools at 1440 × 900 and 1024 × 768 (frames can't carry motion, so record or step
it). The spike's own frames are `.crew/sprint/24/spike/frames/s5-loft-1440.webp` and
`s4-register-1440.webp`, and S5's tables are in `.crew/sprint/24/spike/spike.md`.

Decide, with a value a builder can type, and the reason:

1. the duration (2.4 s stands until you rule; S5's table of what each reads as);
2. a short ease-in at the start, or none (the first step is 4.1 px at 60 fps, 8 to 16 at 30);
3. hold the framed height (the settled hull 21% shorter than its drawing) or the framed width;
4. the shadow as the scene's one texture, and its darkness in each scheme;
5. what the profile shows under the lifted model, and the seam weights (build note 7): the
   model's seams heavier to match the drawing's double-inked seams (the default, the SVG
   untouched), or the SVG inking each seam once (Forge changes the drawing);
6. the dark scheme on the model (`night-1440.webp`; the prototype has the light tokens only, so
   say the values);
7. the settled framing at 1024;
8. how the settled model appears under reduced motion: a cut, or a short opacity fade.

Write them as `.crew/sprint/25/notes-iris.md`, one numbered section each, in this checkout on
`sprint/25-the-loft` (commit, don't push), and report them to Atlas as soon as they're written:
Atlas relays them to Pixel mid-build. Where you'd change the contract rather than a constant, say
so to Atlas rather than writing a different rule.

## Part 2: beside the build, then the review

Atlas messages you when Pixel has a build running, with its URL. Look at it early at 1440 and 1024,
both schemes, with reduced motion, against `loft.webp`, `main.webp` and `night-1440.webp` and the
rubric, and say exactly what to change while it's cheap. When the build is done, review it against
`design/rubric.md` and production, score it, and write `.crew/sprint/25/review-iris.md` with
`Verdict: ship`, `changes` or `blocked` on the first line, your musts and your cheap changes apart,
with screenshots or frame sequences in your scratchpad or `.crew/screenshots/` (git ignores it) and
a line saying what each shows. Then at most three memory lines citing `.crew/sprint/25/`.
