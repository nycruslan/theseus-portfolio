# Sprint 52 direction (Iris): the yard

**Canvas (the owner picks or comments there):** https://claude.ai/artifact/LwQHtrkAkhMAmC4aJH1rEE
Private until the owner shares it. 11 artboards, one row of titled artboards per direction (A takes
two rows), recommendation first, plus two notes (the ask and my call; the defaults I steered away
from). The Studio shows the artboards from
`design/`, listed in `design/frames.json`. Research: `research.md`. Costs are in Pixel's measured
terms: `headroom.md`.

## My call: A, the yard

The Log's ghost hull becomes a toy. A visitor rebuilds the Theseus themself, sprint by sprint, in
the order the crew did, and every plank they knock out lands in the ghost hull beside it. At sprint
23 the last original leaves and they are holding Hobbes's question with a real ship: two whole
hulls carrying the same 22 numbers (the sprint that built a plank is the sprint that took its
original out). Which one is the Theseus?

Every motion is a real merge. The visitor only sets the pace, so principle 2 holds by construction:
nothing moves that the crew didn't do. It lives on `/log` and `/log/[n]`, the brief's archive
moment, so **it fits the brief as it stands**, and nothing on `/` changes in the first slice.

Compared with production: **better**. /log today is a still ghost and a table; the yard keeps both
and makes the record something you handle. My estimate as drawn: design 8, originality 9, craft 8,
functionality 8, **8.3/10**. Discount it: it's my own work, before the build.

### The loop

1. **See.** The Log opens on the truth: the Theseus as it stands (sprint 52 in pencil, copper only
   while the crew is live), the ghost hull whole. One control invites play: *Start again from
   sprint 0*. Every plank flies home in reverse; the ghost empties to its dashed frame.
2. **Press.** *Seat sprint N's plank*: the original lifts off its seat, arcs over and lands on the
   same seat of the ghost hull; the sprint's white card plank presses into the gap with a knock.
   The record line names the sprint, its date, who drew, checked and tested it, who approved it,
   its fix rounds and minutes, and the first thing that went wrong, from its retro.
3. **Hold.** The presses accelerate like a riffled flip book (400 ms easing to 80), two ships
   trading planks, and stop themselves at the chapters: 23, 45 and today.
4. **The record shows in the motion** (slice 2): a fix round is a bounce (sprint 36 bounces twice);
   sprint 16, closed without merging, is a pencil plank struck through, and seats nothing.
5. **The payoff.** At 23: "No original plank is left, and the ghost hull is whole. Which one is the
   Theseus?" At 45 (slice 3) the crew's own first ship is gone too, and joins the yard as a second
   ghost, numbered 24 to 45. A new ship joins every 22 merges, so the toy grows as the crew works.
6. **The hand-off.** At 51 the replay meets the live layer: *Watch sprint 52 on Crew*.
7. **The share.** Every step is a URL (`/log/23`) with its own card: both ships as they stood, the
   sprint's line, and "Ruslan Shulga, VP Engineering, AI Platform" in the title block's type.

Why people send it: a famous puzzle with a real instance they just built with their own hands; the
crew's honest failures under each plank; a riffle worth recording.

The canvas has a playable prototype of all of this in the Off drawing (artboard "A. Play it"), with
the real record for all 51 sprints: press, hold, ← and →.

## What it must never break

- **The five-second read.** Nothing on `/` changes until slice 4, and then only one plain link on
  the revision block's count line, fit-measured from 320 to 1440 before it ships. The name, role,
  scale and contact never move (`.crew/sprint/51/five-second.md`).
- **The facts.** /log's heading, its lines-original count and the revision table stay server HTML
  at full opacity. The yard's rest state is today's truth, not sprint 0.
- **The record.** Every step is a real merge in order, with the shipwright's seat order; a closed
  sprint seats nothing; no invented dates, numbers or authors. Retros without fix rounds say so.
- **Copper means live.** The replay is never mistaken for live (sprint 37's rule): it draws in ink
  and graphite; copper appears only on the real pencil plank, only while the crew works.
- **Motion modes.** Full flies; Calm and reduced motion never fly (the site's 240 ms linear fade,
  held steps every 400 ms); Off never loads WebGL. Play starts only from `settled` or `still`
  (B3.1). Any key, press or scroll lands a moving plank at once.
- **Every fallback plays.** Off and no-script are pages: `/log/[n]` draws both ships as they stood
  after n, with plain links to n−1 and n+1. Back walks back through planks there; in Full and Calm
  the chunk replaces the URL instead, so playing never floods history.
- **Keyboard and touch.** Every action is a real button (or link); no drag is needed. ← and → step,
  Home and End go to 0 and today; a held key or press riffles, keyup or Escape stops it. Targets
  44 px on phones. The canvas stays decorative; a live region names the step, quietly, on release.
- **Budgets** (`headroom.md`): 0 B of /log's 11 B of loader script; the toy's code rides the 3D
  chunk (estimated 4 to 7 KB of its 95 KB left: per-plank transforms in the card's GLSL, a second
  hull on /log, the controller); at most 8 draws of 8 (the ghost's five plus the card's three, 7 if
  the seam batches merge); two hulls share 30,000 triangles (about 14,000 each, estimated); frames
  only while a plank moves; WebGLRenderer and GLSL, no three/webgpu. LCP stays text; CLS 0.

## The first slice: the yard you can play (Y1)

The smallest version already worth sending: sprints 0 to 51, press, hold and back, the stop at 23,
and a card per step.

- `/log/[n]` (and `/log` for today) draws the Theseus and the ghost hull as they stood after sprint
  n, server-rendered, from the merged sprints and the shipwright's order the site already keeps
  (`lib/lines-plan.ts`: `seatPlanks`, `ghostPlanks`). The record line for n beside them.
  *Previous*, *Seat the next plank*, *Start again* and *Today* are links. That is Off, no WebGL and
  no script, whole.
- In Full and Calm, the 3D chunk takes those links over: the Theseus is the card model beside the
  ghost in one canvas; a press moves one plank (Full: lift, arc, seat; Calm: the fade), a hold
  riffles with the chapter stops, and the URL is replaced, not pushed.
- Each `/log/[n]` gets its share card: both ships at n and the sprint's line; at 23, "Which one is
  the Theseus?".
- Pixel leads the 3D (two hulls in one stage, the per-plank transform and the flight); Forge the
  pages, links, controller and cards; Probe the record's truth at every n, the modes and the
  budgets. Size: L, as one sprint, or two if Quill splits the 2D pages from the 3D.

## The milestone after it (a proposal for Quill)

| Slice | What a visitor gets | Notes |
|---|---|---|
| Y1 (L) | The yard you can play, above | Fits the brief |
| Y2 (M) | The record in the motion: fix rounds as bounces, sprint 16's struck pencil, the hand-off to Crew at 51 | From the retros' `fixRounds`; a sprint without the field doesn't bounce |
| Y3 (M) | The fleet: the crew's first ship joins the yard at 45; the next at the 66th merge, by itself. On phones, two named viewpoints (the Theseus, the ghosts) | Triangles: three hulls need a lower level each, measured |
| Y4 (S) | The door from `/`: "Rebuild it yourself" on the revision block's count line | Fit measured at every width first; it waits if it doesn't fit |
| Y5 (S) | Owner's pick, below: a visitor tally at 23 | Only if he wants it |
| Y6 (S, optional) | Sound: one knock per seated plank, off by default | ≤ 10 KB, the brief's sound rule |

## Needs decision (owner), on the canvas or the PR; none blocks Y1

1. **The direction.** I recommend A. He may pick B or C instead (both below); either changes the
   brief's novelty budget, so it would be his change to `design/brief.md`, and the canvas shows
   what each costs.
2. **A visitor tally at sprint 23** ("Same ship" / "New ship"), the first time a visitor would write
   anything to the site. Options:
   - *No tally* (recommended for now): the question stands unanswered on the page and the card.
   - *An anonymous two-button tally*: two counters, no free text, rate-limited like `/ask`; shown
     after you answer.
   - *Decide after Y3*, when there is a fleet to ask about.

   It can be undone either way, so the work goes on without it.

## The other two directions

**B. Pull a plank** (on `/`). The home hull becomes something you can touch: a plank under the
pointer inks its edges, pulls away on a spring, and past a stop fans out its seat's history down to
the original (seat 5.1: original, 1, 24, 46, each a line from the Log); let go and it knocks home.
*Strongest case:* the cheapest toy (Pixel's class B, about 3 to 6 KB of the chunk, 0 B on B2.10,
draws 4 or 5) and the most visible. *Why not first:* a minute of tactile fun with no ending and no
single moment to send; it spends novelty on the five-second screen (beside the loft and the live
layer, which the brief budgets, and this it doesn't); the canvas is aria-hidden, so its keyboard
twin is the revision table and the toy itself isn't keyboard-playable; touch must tap, not drag
(B3.13). A brief change if picked. It could come back later as a rider on Y4's door: a pulled
plank opens the yard at its sprint.

**C. Draw your own** (`/draw`). A lofting floor: drag the twelve lead ducks of the Theseus's real
profile, the batten re-fairs through them in all three views, *Loft her* lifts the drawing into a
card model planked in the crew's order, and the share card is your sheet, rendered from the URL with
no database. *Strongest case:* the most personal share, and the 2D floor is the toy, so every mode
loses nothing. *Why not first:* it says nothing about the crew or an AI org (belief 2), and a
hiring executive gains nothing from it; it is a fourth surface (a brief change) and needs a door,
since the bar's four links share a row at 320 and 390 (B3.23). *Cost:* class D, about 0.8 KB of its
own plus three's shared chunk; `/` grows by 3,282 B as one chunk becomes two; the editor itself,
estimated 12 to 20 KB on that route.

**Set aside: "No dry dock".** A turn-based game: rebuild a practice hull at sea without sinking
her. The most replayable, and the metaphor an executive gets at once, but its rules are invented on
a site that promises only real events, it invites the "just a game" verdict, and it is the biggest
build.

## Defaults I steered away from

A drivable or walkable ship (banned; Bruno, Messenger); an AI twin or chat with the crew (banned;
`/ask` exists); cursor toys (magnetic cursors, liquid hovers, trails); multiplayer cursors
(Cursor Camp); a timeline slider over history (a report, not a toy: the yard's unit is one press,
one real merge); a physics sandbox aimed at the hull; a daily puzzle with a coloured share grid;
achievements on a CV; a sweep-to-play sound toy (the glass xylophone); visitor-made planks on the
real ship; a full-screen shader on `/` (breaks 0 frames at rest and sits over the facts).

## How the canvas was made

Everything on it is real. The 3D images are production's own model, staged in Playwright: the
plank-state uniform overridden for the originals (grey card) and the Log's ghost drawing trimmed or
renumbered before remounting, so each render is the live code in a state the record had. The 2D
drawings are production's Log geometry, clipped per plank. The record is the Log's table and the 50
retros; the profile is `content/profile.ts` verbatim. Scripts: my scratchpad, not the repository
(`stage3d.mjs`, `draw2d.mjs`, `yard-data.mjs`, `proto-snippet.mjs`, `stub.mjs`).

## What I couldn't verify

- **The canvas in the owner's browser.** I checked every artboard in my own stub (the canvas's
  markup without its runtime, `{{holes}}` filled from each artboard's own `renderVals()`): axe found
  no violations on all 11, and nothing overflows. The prototype's buttons, hold and keys ran only
  in my stub's state renders (steps 0, 11, 16, 23 and 51), not through the canvas runtime's events.
- **The motion.** The storyboard's timings are my specification, not a measured build; SwiftShader
  frames can't judge feel. Pixel's spike on a real phone decides them.
- **The cost of two hulls on /log** (draws, triangles, the shadow): estimates from `headroom.md`'s
  classes, not a build.
- **The award sites themselves.** awwwards.com and thefwa.com didn't resolve from this session; the
  research quotes their listings and secondary write-ups, and says so.
- **impeccable's detector** wasn't run: this sprint ships no product UI, and the canvas isn't the
  site.
