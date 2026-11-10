# Sprint 62 direction (Iris): Try to sink it

**Canvas (the owner picks or comments there):** https://claude.ai/artifact/MicDUbCifCHvCBsEfqZQS4
Private until the owner shares it. Eight artboards in three titled rows, the recommendation first,
with a working prototype on production's measured windows ("A. Play it") and two notes (my call;
the defaults I steered away from). The Studio shows the artboards from `design/`, listed in
`design/frames.json`. Research: `research.md`. Costs are in Pixel's measured terms:
`headroom.md` (sprint 62's, read before sizing anything below).

## My call: A, Try to sink it

The yard lets a visitor handle **what** the crew built. Trials lets them push on **how it proved
it**. `/trials` frames the real first page in a window the visitor chooses, anywhere from 320 to
1920 wide and 460 to 1100 tall. They drag its corner (or set Width and Height, or tap a window on a
chart) and the page reflows under their hand. The frame's foot is drawn as the hull's waterline
(the DWL the lines plan already letters), and the height of Ruslan's contact links above it is
their **freeboard**, measured live in px. The dare is in the page's first line: *try to sink them*.

**The loop, in one line:** drag the window; the page reflows; the freeboard answers; every fit the
crew built and every check that pins the window name themselves, with their sprint; sink the links
and the record tells you whether the crew already knew.

**Why a visitor sends it.** It's a dare with a true answer. The peers `PRODUCT.md` names second
resize every award site anyway (Lynn Fisher built her yearly site on that habit); here the page
answers with its own measurements and the names of who made them true. The near misses are a
pixel wide (0.7 px at 1366 × 595), and the one real gap is a brag: at 320 × 568 the last contact
link is 6.2 px under, and the record already says so. Every window is an address and a card
(`/trials/320x568`: "Under by 6.2 px. The crew's own gap").

**How it tells the crew's story.** The five-second read is the owner's hardest requirement, and the
crew spent sprints 39 and 43 to 45 fitting the name, facts and contact links into every window's
first screen, then 51, 57 and 60 defending it. Checks pin at least twenty windows of `/` (B1.1,
W1, W3, W8, W9, W13, W16, H9). None of that is visible today. Trials makes it the toy: each of the seven
fits stamps itself as the frame enters it (Wa, sprint 43: "the drawing gives way, so the links stay
up"; Wb, 44; Wc, 45), with who drew, checked and tested it and the first thing that went wrong
building it ("the first fit held at 1280 wide by less than a pixel"). It shows the crew honestly
(principle 3): where it accepted a gap, the page says so in the crew's own words. Every motion is
the real page's own layout (principle 2), since nothing in the frame is animated by the toy.

**Where it lives.** `/trials` and `/trials/[w]x[h]`, a route of its own. Not in the bar (its four
links share a row at 320 and 390, B3.23). Doors from `/crew`'s keel, under rule 1 ("Nothing merges
until three checks pass"), and from `/log`'s foot. **`/` doesn't change**: its first screen keeps
its five-second read, and the toy frames it rather than touching it.

**Compared with production: better.** Nothing on production lets a visitor test the site's claims,
and the toy changes no existing page beyond two links. My estimate as drawn: design 8, originality
9, craft 8, functionality 8, **8.3/10**. Discount it: it's my own work, before the build.

### The measurements behind it (production, 10 Nov 2026)

I swept production's `/` with scripts off (deterministic, and the same geometry as the scripted page
by the crew's design) in CI's pinned Chromium 156 headless shell: **28,633 windows**, 320 to 1920
wide by 8 px and 460 to 1100 tall by 5 px, plus every pinned window, in 131 s. The freeboard is the
window's height minus the bottom of the contact links' text (the words a visitor must see, not the
44 px targets).

- **4,871 windows sink**, all in one band along the bottom: below about 570 px tall at 320 wide;
  never from 472 to 760 wide down to 460 tall; below 565 to 660 px tall from 768 wide; below 590 to
  595 px tall from 1280. No window floats below one that sinks: the edge is one clean curve.
- **The crew's pins all float but one:** 1440 × 900 at 29.2 px; laptops 1440 × 790 to 1920 × 950 at
  18.2 (the drawing gives way and the links hold still: Wa); 1366 × 625 at 21.7; 1280 × 680 at
  49.4; tablets 1024 × 640 at 11.7 and 1180 × 740 at 46.8; phones 62.6 to 293.2. **320 × 568 is
  under by 6.2 px**: it's outside sprint 44's phone set, and `e2e/phone-window.spec.ts` reports it
  rather than asserting it ("Atlas's ruling, sprint 44").
- **Near misses** between the pins: 0.0 px at 456 × 465, 0.1 at 792 × 575, 0.2 at 1056 × 630 and
  1160 × 635, 0.7 at 1366 × 595. From 1024 wide the drawing is already at its 240 px floor there (W3,
  W16), so nothing else can give way; from 768 to 1023 no fit gives way at all (the drawing holds
  at 267.8 px), and on phones the narrow drawing holds at 145.9 px.
- **Nothing scrolls sideways** in any of the 28,633 windows.

The prototype on the canvas ("A. Play it") runs on these numbers: drag the corner, use the sliders
or the arrow keys on the corner, tap the chart, or press a crew window; the rules, the record's
answer and the fits update. It draws the page from its measured boxes and snaps to the measured
grid (16 × 5 px); the build frames the real page and measures it live.

### What it must never break

- **The five-second read.** `/` is untouched. The trial page's own words (the h1, the dare, the
  freeboard, the rules, the answer) are server HTML at full opacity, and the largest paint is text.
- **The truth.** Every freeboard is measured, every rule names the check that pins it or says no
  check pins this window, every fit names the sprint its media query was blamed to (I checked:
  Wa's queries are sprint 43's #102, Wb's sprint 44's #107, Wc's sprint 45's #108), and the "what
  went wrong" lines are the retros' own `wentWrong[0]`. A window the crew doesn't pin says so; the
  toy never claims a check where there isn't one.
- **Copper means live.** Trials draws in ink, graphite and pencil. It is never live.
- **Motion.** The toy moves nothing of its own: the frame changes size and the page inside reflows.
  Calm and reduced motion snap between windows (no tween) and show a found fit in place. The
  signature transition (the loft) is `/`'s, and it doesn't replay in the frame.
- **Every fallback plays.** Without script, `/trials/[w]x[h]` is a server page: the frame at that
  window, its freeboard, rules, fits and answer (from the sweep committed at merge), and the crew's
  windows and the chart's soundings as links. Off and no WebGL: the frame shows the page without
  script, the drawing in 2D, which is also the toy's default (below).
- **Keyboard and touch.** Width and Height are native range inputs (arrows 1 px; Page keys 10;
  Home and End). The corner is a button that takes the arrows. The crew's windows are links. The
  framed page is `inert` and titled, so Tab never falls into it, and a polite live region reads the
  freeboard when a drag or key settles. On phones the chart is the main control (tap a window), the
  corner drags with a finger (`touch-action: none` on the handle only), targets are 44 px, and the
  frame fits the column.

### Costs, against Pixel's headroom (`headroom.md`, measured on 682335a)

- **`/`, `/log`, `/crew`: 0 B.** Nothing they load changes. No new import of three anywhere, so the
  model's chunk stays one file (B5.23, B4.40, H7, Y18, Y24) and the loader stays at 2,037 B
  (B2.10's 11 B untouched).
- **The route.** A server page first (0 B beyond the 404, Pixel's `empty` variant). The controller
  (handle, sliders, live measure of the frame, the chart's ring and track, the stamps) loads on the
  first touch, as Pixel advises for any chunk that isn't gated on WebGL; estimated 4 to 8 KB gzip,
  canvas-free (SVG and DOM). Its contract gives `/trials` its own number, as B2.10 does for `/read`.
- **The frame.** A same-origin `<iframe sandbox="allow-same-origin">`: scripts off by default, so
  the frame is the server's page with no model, no feed poll and no 3D chunk, and the parent can
  still measure its document. "With script" (T4) reloads it with scripts on, and then the frame
  fetches `/`'s own cached chunk; it only offers that in Full and Calm.
- **One header changes.** `next.config.ts` sends `frame-ancestors 'none'` on every page, which
  forbids the site framing itself. The framed route needs `'self'`: other origins still can't frame
  it, so clickjacking stays shut. It isn't an owner path, but it is a security header, so the T1
  contract names it and Lens accepts it with the reason in the PR.
- **Data.** A sweep of `/` committed with the code (about 13,000 windows at 16 × 5 px, about 60 KB
  raw, fetched only by the chart), written by a sprint-folder script the way the merge records are,
  plus a check that the sweep's pinned windows equal a fresh measure of the built page, so a stale
  chart fails CI the day `/` changes.
- **Performance.** LCP is the trial page's text. CLS 0: the frame's box is sized from the URL on the
  server. INP during a drag: the framed page's layout (no script in it) on each animation frame;
  T2 measures it at 4x CPU and gates it at 200 ms. No new face (fonts are full, 5,160 B left).

### The milestone: Trials, in four sprints (a proposal for Quill)

Each sprint leaves the site whole. None needs an owner answer to start, touches an owner path or
edits `content/`. Checks numbered T1 onward across the milestone.

| Slice | What a visitor gets | Notes |
|---|---|---|
| **T1 (M): any window, without script** | `/trials` (1440 × 900) and `/trials/[w]x[h]`: the real `/` framed at that window, scaled to the column, its dimensions, the DWL and the freeboard; the sheet of rules for that window with their checks; the record's answer (the gap, below the floor, a near miss, a pinned window); the crew's windows as links; a card per window. Whole with no script | The sweep script and its staleness check; `frame-ancestors 'self'`. Probe: the frame's document is exactly W × H; the freeboard equals a direct measure within 0.5 px; axe, 320 reflow, CLS 0, LCP text; `/` byte-identical |
| **T2 (M): drag it** | The corner, the sliders, the chart of every window with the visitor's ring and track, tap-to-try; the URL replaced on release, never pushed; a polite live region | Controller loaded on first touch; INP at 4x gated at 200 ms during a drag; keyboard and touch as above |
| **T3 (M): the fits and the record** | The seven fits stamp as the frame enters them, each with its sprint, who drew, checked and tested it, and what went wrong first; "n of 7 found" for the visit (sessionStorage, nothing written anywhere) | The fit table maps each to its media query in `app/globals.css` and its sprint; Probe checks each query still exists and each sprint is a merged retro |
| **T4 (S): with script, and the doors** | "With script": the real page with the hull in 3D, re-posing at 768 as you drag (Full and Calm only); the doors from `/crew`'s keel and `/log`'s foot | The frame's script mode throttled to animation frames; Off hides the toggle; the doors fit-measured at their worst widths first |
| T5 (S, optional) | The yard in trials: `/trials/log/23`, the step link above the waterline on a phone (Ha's claim, H1 to H7) | Ties the two toys; only if T1 to T4 land clean |

## Needs decision (owner), on the canvas or the PR; none blocks T1

1. **The direction.** I recommend A. He may pick B or C (below), or none.
2. **The brief's novelty budget.** `design/brief.md` allows one signature transition, one live
   layer and one archive moment, and the yard is that archive moment. Trials is a fourth moment, on
   its own route, so it changes no familiar part (navigation, case studies, contact, the read view)
   and nothing on `/`. Options:
   - *Add one line* (recommended): "One proving ground, on its own route, off the first screen."
     His goal for this sprint asks for exactly this, and the route can be taken out.
   - *Widen the archive moment* to "the record you can play" (the yard and the trials together).
   - *Keep the budget*: then no new toy, and the crew stands down again.

   It can be undone either way, so the work goes on with the first option.

## The other two directions

**B. Send it back** (`/checked`). Each case is a real build that passed its checks, which someone
on the crew still sent back. The visitor clouds what they would send back (a revision cloud, the
drafting mark for "this changed"), then the crew's cloud appears with its revision triangle, the
finding in the reviewer's words, the fix beside it, and the check that guards it now. On the canvas:
sprint 59's `/log/23` at 390 × 664 built from 9a3d6a1, where a focused step link's ring sat 2 to 3
px over the ghost's keel; Iris's review caught it, sprint 61 lowered the row 4 px, and H1 holds it.
Nine cases from the record (sprints 22, 31, 34, 36, 43, 44, 55, 57, 59).
*Strongest case:* the most sendable shape of all (you against an AI crew's eye, playable on any
phone), and it argues belief 3 directly. *Cost:* a 2D route, a few KB; each case's "before" is a
build of the commit before its fix (a few minutes each here: install, build, serve, shoot). *Why it loses:* spot-the-difference
is an old genre and the design version is taken (Can't Unsee); its subject is the crew's mistakes,
a peer's pleasure more than a board's; it's finite (nine stills don't grow as the crew works);
several defects were CI-engine-only or motion and can't be shown in a still; and it doesn't touch
the ship at all. Its best part survives in A: each fit's stamp says what went wrong building it.

**C. The plane** (`/plane/[n]`). Pick a sprint's plank and plane it: each stroke takes off the
lines one later sprint rewrote, in merge order, and the shaving curls away with that sprint's
number, down to what still stands. Sprint 22 laid 1,163 lines; 13 later sprints took 350 (sprint
23 81, 25 77, 30 67, 36 67); 813 stand. The site's 19,689 lines today: 17,753 laid by the crew's
sprints, 1,895 by changes outside them, 41 from the site the crew found, 22 of those blank lines and
closing brackets (my blame of every merge, scratchpad).
*Strongest case:* the most literal ship of Theseus, the real timber, not a metaphor; planing is a
satisfying gesture, and Pixel's 2D spring spike (864 strokes, 1,292 B, 60 fps) is the shaving
engine already. *Why it loses:* Git of Theseus has owned the idea and the name since 2016; it's
code, which a board can't read and the brief keeps quiet; lines of code invite the wrong measure;
it plays on the yard's own object, the plank, and its loop is a replay at your own pace, the yard's
loop again; and its data needs full git history, which a Vercel build's shallow clone doesn't have,
so it would be one more record written at merge.

## Defaults I steered away from

Agents as pixel characters in an office (Pixel Agents); a crew-wrapped page of tokens and days
(Cursor's Year in Code, GitHub Wrapped); code survival as strata (Git of Theseus); a data city of
commits (Git City); a chat with the crew or an AI twin (banned; `/ask` exists); device mockups for
the frame (the window is drawn, not an iPhone); a layout that squashes for fun as you resize (Lynn
Fisher's); a quiz with a coloured share grid; visitor bets on the live crew's verdicts (it reads as
steering); a curved carousel or a barrel gallery for the case studies; and the yard's own next steps
(the fleet, fix rounds as bounces, sound), which the ask keeps out.

## How the canvas was made

Everything on it is real. The frames inside the drawings are production's own `/` and `/log/23`,
shot in CI's Chromium 156 shell at DPR 2 or 3 with reduced motion, so the 3D lands settled; sprint
59's "before" is a build of 9a3d6a1 served from my scratchpad. The chart, the prototype and every
freeboard come from the sweep above. The plank's numbers come from blaming `app/`, `components/`
and `lib/` at every merge commit with merge-record.mjs's rule. Scripts: my scratchpad, not the
repository (`sweep.mjs`, `prep-proto.mjs`, `chart-svg.mjs`, `cohorts.mjs`, `shoot-frames.mjs`,
`stub.mjs`).

## What I couldn't verify

- **The canvas in the owner's browser.** I rendered every artboard in my own stub of the canvas
  runtime (holes, `sc-for`, `sc-if`, events, `setState`): axe found nothing on all eight, nothing
  overflows, and the prototype's chip, chart tap and corner keys drove it as written. The real
  runtime's events and its fetch of the sweep (`/_blob/…`) ran only in the stub.
- **Live measuring inside a frame.** The sweep is a script in Playwright, not a page measuring its
  own iframe. That a sandboxed same-origin frame can be measured, resized at 60 Hz and kept inert is
  standard platform behaviour, but T1 should spike it first, on Safari too.
- **Scripts on.** The sweep read the page with scripts off. The live feed's states move the contact
  links by up to 14 px (sprint 60's `fit.md`), so a scripted frame's freeboard can differ from the
  chart by that much; T1 states which state the sweep measured.
- **The award sites themselves.** awwwards.com, thefwa.com, cssdesignawards.com and tympanus.net
  don't resolve from this session; `research.md` cites their listings and secondary write-ups.
- **impeccable's detector** wasn't run: this sprint ships no product UI, and the canvas isn't the
  site.
