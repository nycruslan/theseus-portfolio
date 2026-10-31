# B4b contract: the live layer on `/`

Quill, 2026-10-31, during sprint 34, for the run that builds it (PR #87). The plan's B4.2
(`.crew/sprint/28/b4-plan.md`), to the owner-approved frames `main.webp` and `rest-1440.webp`
(`.crew/sprint/17/design/`). It reuses B4a's read, states and harness (`.crew/sprint/31/contract.md`)
by reference and changes nothing on `/crew` but its chip's edge (the pencil mark is one across the
site). Numbers were measured on this branch (`94db46b`) or on
production (`https://theseus-portfolio.vercel.app`, 2026-10-31), as cited. Iris's calls 1 to 4
(`.crew/sprint/34/notes-iris.md`, the sprint branch's `e6351de`) are written in where they apply.

## Outcome

A hiring executive who lands on `/` sees, on the drawing they already look at, that this site is
being rebuilt right now: one plank in pencil carrying the sprint's number, and, only while the crew
is working this minute, a copper tip on it and "drawing now" on its row, which leads the revision
block and links to `/crew`. When nothing is in progress, one line says the crew is resting and when
the last sprint merged. When the feed is down, `/` is today's sheet exactly. All of it is
server-rendered from the read `/crew` already makes: `/` loads no new client code, and nothing
moves.

## The calls I made

- **The rest line states a merge, not a seat.** The plan's "Last plank seated: sprint N" would be
  false today: production's revision block is topped by 33 (#83), while the last merge is 31 (#78,
  31 Oct 01:50 UTC), so the newest seat and the newest merge name different sprints. B4a settled
  `/crew`'s line on the merge; `/` says the same thing in the same words, so a visitor who clicks
  through reads no contradiction.
- **The pencil seat is the sprint's own when the build already holds its retro.** The plan's
  `ORDER[k mod 22]` is right for production during a run (main has no retro for the sprint in
  progress), but wrong on the PR's own preview once its retro lands, and for the fixtures, whose
  sprint (31) is merged. Dropping that sprint from the count instead would reshuffle every later
  seat, so the drawing would move under the visitor. The rule below keeps every other plank where it
  is in every state.
- **The count line and the Log link don't change.** The frame's "1 in pencil" needs arithmetic that
  is wrong once all 22 are replaced (the pencil re-replaces a seated plank). The pencil is told by
  the plank, its row and the legend.
- **The pencil row's signatures come from the feed's roles,** by the retro's own rule, so the row
  reads like the four below it and every name in it is someone the feed says took part.
- **`/` tells the state; only `/crew` tells the story** (the plan): no now line, role line, moment
  or health line from the feed appears on `/`. The goal is the only feed text on it.
- **`/read` and `/crew`'s drawing stay as they are.** `/read` reads no feed; the hull on `/crew`
  with its pencil and marks is B4d. Putting a copper tip on `/crew`'s drawing now would break
  B4.6, which allows copper there only on Working and the now line.

## Data rules (the page and Probe's oracle implement these word for word)

**The read and the state.** `/` calls B4a's `readCrew()` (`lib/crew-feed.ts`) unchanged: B4a's
"The read" (timeout, cache life, the kept answer, staleness, the shape) and "The state" table
(`live`, `open`, `resting`, `down`) hold as written. `/` takes from it only the state and the told
run's `sprint`, `goal`, `health.state`, `roles` and `mergedAt`. `/` carries no `[data-crew-state]`.

**The layer.** From the state:
| State | `/` shows |
|---|---|
| `live`, `run.sprint` set | the pencil plank with the copper tip; the pencil row, with "drawing now"; the legend's pencil and copper items |
| `open`, `run.sprint` set | the pencil plank, no tip; the pencil row, no "drawing now"; the legend's pencil item |
| `resting` | the rest line; no pencil, no copper |
| `down`, or `live`/`open` with `run.sprint` `null` | today's sheet exactly |

A run with no number can't name its plank, so `/` claims nothing for it.

**The pencil seat.** Let R be the build's retro numbers in ascending order (`readSprintLog()`,
reversed, as `app/page.tsx` seats them), k = |R|, n = `run.sprint`, and `ORDER` the shipwright's
order in `lib/lines-plan.ts`. If n is in R, at index i (from 0), the pencil seat is `ORDER[i mod
22]`, the seat n's retro holds; otherwise it is `ORDER[k mod 22]`, the next seat. Every other plank
is seated by `seatPlanks(R)` exactly as in `down`. The pencil plank's number is n, in place of its
seat's holder's.

Today on this branch R is 1 to 15 and 17 to 33, k = 32 (sprint 16 has no retro): the next seat is
`ORDER[10]` = 4.0, held by 11 on production; the fixtures' 31 is R[29], seat `ORDER[7]` = 3.0
(holders 8 and 31). Production's 1.3 holds 33 (`ORDER[31 mod 22]`), which confirms the indexing.
So during this sprint, production's `/` draws 34 in pencil on 4.0; and once 34's retro is on the
branch, the preview draws it on the same seat.

**The drawing.** In each of the sheet's two drawings (`.plan-wide`, `.plan-narrow`, both in the
HTML) the pencil plank is the seat's `path[data-plank]` with `data-pencil`, `data-sprint` = n, and
`data-live` in `live` (decisions 4). In `live` each drawing holds one `[data-tip]` inside its `svg`,
the copper tip, on the pencil plank; never in any other state. The wide drawing's number on the
pencil plank reads n; every other plank's id, `data-sprint`, class and number are as in `down`. The
narrow drawing carries no numbers, as today. The look (Iris's call 3, `notes-iris.md` 3.1 to 3.4),
its numbers in one `PENCIL` constant in `lib/hull-layouts.ts`, shared with the hull:

```ts
hatch: { period: 6, width: 1.4 },   // viewBox units
dash: [4, 3],                       // CSS px
tip: { from: 1 / 3, to: 3 / 4, inset: 0, width: 2, dot: 7 },  // width and dot in CSS px
```

- **Hatch:** 45°, rising to the bow ("/"), one 1.4-unit `--pencil` line every 6 units across, tiled
  from the viewBox origin, on the film (`--background`). It scales with the drawing (6 px at 1440
  and 390).
- **Edge:** graphite, `--muted`, 1 px, dash `4 3`, non-scaling, on the pencil `path` itself, painted
  last. Just before it, one path with the same `d`, no fill, a 2.4 px `--card` stroke and no
  `data-plank`, erases the neighbours' seams under the dash; the hollow rule hides it with the fills.
  Forced colours: erase `Canvas`, edge `CanvasText`, dash kept.
- **Number** (wide drawing only): n in `--muted` at weight 600 on a film chip (`--background`,
  padding 1 px 3 px), so the hatch never crosses the digits. Forced colours: `Canvas` chip,
  `CanvasText` digits.
- **Tip,** `live` only: a 2 px copper (`--accent`) run with round caps on the plank's visible lower
  edge (`bandAt`'s bottom), from 1/3 to 3/4 of its body's stretch, then a 7 px copper dot at its
  forward end (a zero-length subpath with a round cap, non-scaling). Both are drawn after the
  outline, outside the hull's clip. The hollow rule hides it; under reduced motion it fades with the
  numbers (240 ms). Forced colours: `Highlight`.

**The hull** (Iris's call 4, `notes-iris.md` 4). Pixel reads the drawing's `[data-pencil]`,
`data-sprint` and `data-live` (decisions 4), and changes no loader code:
- **Hatch:** the stage's existing slot (a state alpha below 1), film ground and `--pencil` strokes at
  `PENCIL.hatch` in hull units per layout, phased from the drawing's origin, so at frame 1 it lies
  on the 2D's hatch.
- **Edge:** graphite on the pencil plank's seams and butts, solid, as colours in the seams' existing
  batch (no draw).
- **Tip,** `live` only: the 2D's run and 7 px dot in the same CSS px, unlit, exactly `--accent` in
  both schemes, depth-tested with the seams' offset; at most two draws.
- **Number,** from 768 only: the pencil plank's number (its film chip) rides the hull at the plank
  body's projected middle, every frame of the loft and at rest, as `/log`'s numbers ride.
- **The modes:** Full lofts as today; Calm opens settled; Off never loads WebGL and shows the 2D.
  Forced colours hide the canvas, as today. 0 frames at rest. If the budget forces a cut, keep, in
  order: the tip's dot, the number, the hatch, the edge, the tip's run.

At rest the turn shows 4.0 as a sliver (Iris measured about 80 × 8 px at 1440, 3 px deep at 390),
so on the hull the pencil reads by its number and its tip, and the hatch as a tone.

**The pencil row,** `tr[data-pencil]` (plus `data-live` in `live`), the first row of the revision
block's `tbody`. The block stays five rows: the pencil row, then the four newest entries of
`readSprintLog()` whose sprint isn't n. Its cells are the other rows' (`th[scope="row"]`, then
Description, then four `td[data-label]` with Drawn, Checked and Tested `translate="no"`), so it folds
at 390 as they do and, from 1024, its description is one line with an ellipsis and the whole text
inside, as B1.5 holds the others. Feed text is text (B4a's "Text"). The look is Iris's call 3.5:
- **Rev:** n, ink, weight 700, in a hatched chip (135°, 1 px in 4) with a `1px dashed var(--muted)`
  edge in every mode; the row stays 32 px at 1440. `/crew`'s `.crew-chip-number` takes the same
  dashed `--muted` edge in `live` and `open`, so the pencil mark is one across the site. Forced
  colours drop the hatch and keep the dashed edge.
- **Description:** one `a[href="/crew"]` whose text is `run.goal` whole, or "In progress" when it is
  `null`, in ink with the site's underline, at least 24 px tall. In `live`, `[data-drawing]` "drawing
  now" follows it 8 px after: copper, weight 600, with a 7 px copper dot, `nowrap`, shown whole and
  never cut by the ellipsis (from 1024 the goal takes the ellipsis; below, it follows the goal inline
  and wraps as a unit).
- **Drawn, Checked, Tested and Approved** are graphite (`--muted`), pencil entries inked when the
  sprint merges:
  - **Drawn:** "Forge", "Pixel" for `engineer`, `creative-engineer` whose feed state is `working`,
    `waiting` or `done`; when neither is, "Iris", "Quill" for `design-director`, `product-owner` on
    the same test; joined with ", ", in that order; none, "—".
  - **Checked:** "Lens" when `code-reviewer`'s state is `done`, else "—".
  - **Tested:** "Probe" when `qa-engineer`'s state is `done`, else "—".
  - **Approved:** in `open` with `health.state` `"waiting"`, "Waiting for owner" (the frame's words,
    a cell's value like "Owner" and "Gate"; "Waiting on the owner" stays `/crew`'s sentence);
    otherwise "—". The cell is `white-space: nowrap` from 640 px, so the row stays one line (the
    description's ellipsis takes the 40 px); below 640 it wraps inside its folded cell.

The fixtures give: live, Forge / — / — / —, with "drawing now"; open, Forge / Lens / Probe /
"Waiting for owner".

**The rest line,** `p[data-rest]`, in `resting` only, exact copy: `/crew`'s resting `[data-status]`
word for word (Iris's call 2, `notes-iris.md`), one fact in one sentence on both pages:
- "Crew resting. Sprint {last.sprint} merged {d Mon}, {HH:MM} UTC." Production's `/crew` read at this run's
  start "Crew resting. Sprint 31 merged 31 Oct, 01:50 UTC." (Iris's example names 33; the rule governs.)
- `mergedAt` `null` or unparseable: "Crew resting. Sprint {last.sprint} merged."
- `last.sprint` `null`: "Crew resting."

Times are UTC as B4a's "Times" says. It names no seat. "Sprint {n}" and "{d Mon}, {HH:MM} UTC" are
each in a `white-space: nowrap` span (spans, not no-break spaces, so `textContent` keeps plain
spaces); the date and time may be a `time[datetime]` with `mergedAt` as `toISOString()`. Its look
(Iris's call 1): `--step-sm` (13 px), line-height 1.5, ink; "Crew resting." at weight 600, the rest
at 400; no rule, box or icon; nothing copper; not a link (its action is B4e's Replay).

**Its place (Iris's call 1, the fold): no trade.** At every width the rest line is the revision
block's first line after the heading and caption, before the table, in the DOM and on screen. The
block keeps five rows in every state, so B1.5 stands as written. Iris measured it injected into
production: from 1024 px `.sheet-row`'s minimum height (336 px at 1440 × 900) leaves 41 px of slack
under the table, and the line costs 29.5 px (19.5 px and the block's 10 px gap), so at 1440 × 900
the contact links stay at 866.3 px (33.7 px above the fold), the fifth row ends at 820.2 and the
row stays 336 px. At 1024 × 768 the links move from 728.6 to 758.1 (9.9 px inside), at 1280 × 800
from 776.9 to 799.6 (0.4 px inside); at 390 × 844 the line sits at 750 to 770 px, inside the first
viewport; at 320 it wraps to two lines.

**The legend** (`components/plank-key.tsx`'s list in the revision block's foot) keeps "Seated by a
sprint" and "Original", then adds `li[data-key="pencil"]` with a pencil swatch (the plank's hatch
and dashed edge) in `live` and `open`, and `li[data-key="copper"]` with a copper swatch in `live`
only. Their words and swatches (Iris's call 3.6):
- `[data-key="pencil"]` "In progress": a 28 × 12 swatch, hatch 135° 1 px in 4 on the film, a 1 px
  dashed `--muted` edge. Forced colours: a `CanvasText` hatch on `Canvas`, dashed `CanvasText`.
- `[data-key="copper"]` "Drawing now", the row's words, so copper says one thing on `/`: the swatch
  is the tip itself, a 2 px copper run across the 28 × 12 slot ending in a 7 px copper dot, no frame
  and no fill. Forced colours: `Highlight`, with `forced-color-adjust: none`.

The frame's "the sprint running now" would be false in `open`. With these words, live at 1440 × 900
puts the count and all four items on the foot's first line and the Log link under them at the left,
as 1024 already does in every state; the foot is 48 px and the contact links stay at 866.3 (Iris).
The DOM order (count, legend, link) stays. `/read`'s legend doesn't change.

**Copper on `/`** (`--accent` as text, fill, stroke, border, background, outline or decoration):
only in `live`, and only on `[data-drawing]` and its dot, the `[data-tip]`s, and the copper swatch.
In every other state, nothing on `/` resolves to `--accent`, at rest, hovered or focused (B1.6's
rule, which holds on the default server unedited).

**Down leaves everything unchanged:** no `[data-pencil]`, `[data-live]`, `[data-tip]`,
`[data-drawing]`, `[data-rest]` or `[data-key]`; the five newest retros; the legend's two items;
nothing copper; and `main`'s HTML equal to the default server's `/`.

**Still,** in every state: no animation, transition on load, or frame of the 3D at rest. Nothing
pulses.

## Checks

Probe writes these first, from an oracle that implements the data rules over the fixtures, the
build's retros and `ORDER`, on B4a's harness: the fixture server (`e2e/crew-feed.ts`) and a site per
fixture, with the server at UTC+14 and the browser in Los Angeles. B4a's polling rule holds, read
on `/` itself: after every switch, request `/` until the expected hooks are there (`live`:
`tr[data-pencil][data-live]`; `open`: `tr[data-pencil]` without it; `resting`: `p[data-rest]`;
`down`: none of them, after first showing `live`), within a named deadline. No check asserts on a
first response. Each title carries its number; "in both drawings" means `.plan-wide` and
`.plan-narrow`.

**B4.15 The pencil plank.** On the live fixture (n = 31, in the retros), on the same fixture with
`sprint` patched to 999 (not in them), and on the open fixture: each drawing has exactly one
`path[data-plank][data-pencil]`, its id the oracle's seat (today 3.0 for 31, 4.0 for 999), its
`data-sprint` n; `data-live` on it in live only; the wide drawing's number on it reads n; every
other plank's id, `data-sprint`, class and number equal the default server's. Its stroke resolves to
`--muted` with a dash, and its fill is a hatch, not a flat card, in both schemes; in forced
colours the dash stays. The wide drawing's pencil number is `--muted` on a `--background` chip. `[data-plan]` stays within 32,768 B (C6's measure).

**B4.16 The pencil row.** On the live and open fixtures, at 1440 and 390: the first `tbody` row is
`tr[data-pencil]` with Rev n, the description's one link to `/crew` holding the goal whole, and the
Drawn, Checked, Tested and Approved cells the oracle's; five rows, the other four the oracle's
newest retros without n; at 1440 its description is one line, as B1.5 holds the others; at 390 it
folds with its labels shown (B2.9's rider). Following the link lands on `/crew`'s `h1`. In live,
"drawing now" is shown whole inside the row, within the viewport's width and not cut by the
ellipsis; in open, absent, and Approved reads
"Waiting for owner"; with `health.state` patched to `quiet`, Approved reads "—". On the live site's
`/`, none of the fixture's now line, role lines, health line or moments appears (B4.3's rewritten
assertion).

**B4.17 Copper only while live.** On each fixture and after a switch to down, in both schemes, at
rest, with each link hovered and with each link focused: every element on `/` whose paint resolves
to `--accent` is `[data-drawing]` or its dot, a `[data-tip]`, or the copper swatch, and only in
live. In live, the shown drawing's tip, "drawing now" and the swatch are copper, and "drawing now"
meets 4.5:1 on its background in both schemes.

**B4.18 The rest line.** On the resting fixture: `p[data-rest]` reads the oracle's line with the
merge's UTC day and time (the server at UTC+14, the browser in Los Angeles); with `mergedAt: null`
it drops the time; with `last.sprint: null` it reads "Crew resting."; with `last.sprint` 999 it
reads the same pattern (it names no seat). It is the revision block's first element after the
heading and caption, before the table, at 1440 and 390, and nothing in it is copper or a link. No
pencil, tip or "drawing now"; the drawing, the five rows and the legend equal the default server's.

**B4.19 The legend follows the drawing.** Live: Seated, Original, then the pencil and copper items
with their swatches; open: the pencil item only; resting and down: the two items, as the default
server shows them (B1.4's "names no state B1 doesn't have" holds there). The pencil swatch is
hatched with a dashed edge, and the copper swatch paints `--accent`. Their words are "In progress"
and "Drawing now".

**B4.20 Down is today's sheet.** After showing live, with the fixture switched to 503 and, on its
own site, to an `asOf` 11 minutes old (the kept answer must age out, B4a's `decisions.md` 13); and
on the live fixture with `sprint: null`: no hook of the layer, nothing copper, and `main`'s
`outerHTML` equals the default server's `/`. If the two differ only in framework-generated ids,
Probe masks those and says so.

**B4.21 The hull agrees, and stays cheap and still.** With WebGL on (the B3 harness), at 1440 × 900
and 390 × 844, on the live and open fixtures, at rest: the canvas differs from the default server's
at the same pose only inside the pencil seat's projected plank and a band around its outline (at
least 4 CSS px, since the tip's dot sits 3.5 px past the seam by design; Probe tunes it on
SwiftShader and reports it), and does differ there (the hatch); pixels
within ΔE 10 of `--accent` (B3.7's test) appear only there in live, and nowhere in open. From 768, at rest, the pencil number's chip is centred inside the plank's projected box. Draws at
most 8 a frame (Iris: 7 with the tip) and triangles at most the default server's at the same width
plus the tip's segments, within 30,000 / 12,000 (B3.6's counter), over the loft and at rest; 0 frames in the 2 s after rest, in live and open.

**B4.22 The first screen in every state.** B1.1's assertions on the live, open and resting fixtures
at 1440 × 900 (the name, role, bio, contact links and every revision row wholly inside the
viewport, the name the largest text, five rows) and at 390 × 844; on the resting fixture at 1024 ×
768, the contact links wholly inside the viewport too (Iris measured 9.9 px to spare); and at 1440 × 900 the pencil row in live and open, and the rest line in resting, wholly
inside the viewport. Both schemes.

**B4.23 Server-rendered, no new client code.** On the live fixture, with scripts off, the HTML holds
the pencil row, the pencil planks and the tip as with them on (and the rest line on the resting
fixture). With WebGL refused, `/` requests exactly the default server's script files by path, with
the same decoded bytes (B2.10's method); with WebGL on, the same 3D chunk file.

**B4.24 The sweeps, on the layer.** On the live and resting fixtures, both schemes: axe with B4a's
strict tags; every text colour and size a token; text contrast (B4.13's method); nothing overflows
at 320 or 390; the `/crew` link at least 24 × 24; Tab reaches it after the title block's Contact
links and before the Log link, with one ring of 2 px ink 2 px out; nothing animates at load, 2 s
later, or after a scroll to the bottom and back.

## The live checks: keep, rewrite, retire

The default e2e server has no `CREW_FEED_URL`, so `/` there is `down`, today's sheet: every check
on `/` keeps passing unedited.

| Check | Disposition |
|---|---|
| Every spec on the default server: B1.1 to B1.11 (B1.5's five rows, B1.6 "nothing is copper"), B2 and B3 suites, `model-*`, `motion`, `keyboard`, `invariants`, `read` (B2.10 at 2,048 B with WebGL refused, 9 B left), `plan` (C6, 22,427 B on production today), `crew-bar` (B4.9 to B4.11), `log*`, `content`, `facts`, `cards`, `smoke`, `not-found` | **keep**, unedited |
| B3.6, B3.11 (at most 8 draws, triangles within the level, 0 frames at rest) | **keep**, unedited on the default server; B4.21 holds the same on the fixtures |
| `crew.spec.ts`: B4 harness, B4.1, B4.2, B4.4 to B4.8, B4.12 to B4.14 | **keep**, unedited: `/crew` doesn't change |
| `crew.spec.ts`: B4.3's `/` block, "the feed's words on / of the live site" (`toEqual([])` over four strings) | **rewrite**, same assertion: the list drops the goal ("The crew's page, /crew, from the Studio's feed"), which the pencil row now shows; the now line, the moment and the role line stay absent |
| `crew.spec.ts`: B4.3's "copper on / of the live site" (`toEqual([])`) | **rewrite**, same assertion: the hits not on `[data-drawing]`, its dot, a `[data-tip]` or the copper swatch equal `[]` |
| `crew.spec.ts`: B4.3's "[data-crew-state] on / of the live site" is 0 | **keep** |
| B1.5 | **keep**, unedited: Iris trades no row, so five rows hold in every state (B4.16, B4.18) |

Nothing retires, and `crew.spec.ts` keeps its `expect(` count. B4.3's title loses "with none of
the feed's words and no copper" and says "with only the pencil row's goal, and copper only on the
layer".

## Budgets

| Measure | Budget | Check | Today |
|---|---|---|---|
| `/`'s script | B2.10: 2,048 B of `/log`'s with WebGL refused; the same files and bytes in every state | B2.10, B4.23 | 9 B left (brief); B4b adds 0 B |
| 3D chunk | 250 kB gzip; the same file in every state | B3.6, B4.23 | about 147 kB (sprint 33's PR) |
| Draws | at most 8 a frame | B3.6, B4.21 | 5 settled on `/` (Iris's S3), 7 with the tip; 5 on `/log` (sprint 33's PR) |
| Triangles | the default server's at the same width plus the tip's segments, within 30,000 / 12,000 | B3.6, B3.11, B4.21 | sprint 33: `/`'s hull unchanged |
| Frames at rest | 0 | B3.6, B4.21 | 0 |
| Drawing | 32,768 B in every state | C6, B4.15 | 22,427 B on production |
| First screen | B1.1 in every state at 1440 × 900; the contact links inside at 1024 × 768 at rest | B1.1, B4.22 | with the rest line, 33.7 px left at 1440 × 900 and 9.9 px at 1024 × 768 (Iris, on production) |
| Feed read and freshness | B4a's: 2,000 ms, the kept answer within 10 minutes, the page at most about 5 minutes old | B4.2, B4.20 | production `/crew` reads it: sprint 34, "Live" |
| Targets, overflow | 24 × 24; 0 from 320 | B4.24 | B2.9 |

## Build notes

- `/` reading `readCrew()` turns its route from static to static-with-revalidation (`/crew`'s
  `○ /crew 30s 5m`); the shared cache entry means `/` and `/crew` tell the same answer within a
  regeneration of each other. A first response is the build's (`down` on CI), never the feed's.
- B2.10 has 9 B: nothing the layer adds may hydrate. The 3D reads the drawing's attributes inside
  its own chunk (decisions 4), so `components/model.tsx` isn't touched and Lens's #74 nit doesn't
  ride.
- One function for the pencil seat, used by the page; Probe's oracle implements the rule above
  independently (not by importing it).

## Out of scope

- Replay and its link in the rest line (B4e); `/crew` live in the browser (B4c); the hull and marks
  on `/crew`, and any pencil on `/crew`'s drawing (B4d).
- `/read` reading the feed; the count line's "1 in pencil"; the Date column (B5's); the frame's
  closed-unmerged row.
- Any change to `content/`, `/crew` (but its chip's dashed `--muted` edge), or an owner path.

## Needs decision

- **Iris:** none open. Her calls 1 to 4 are written in; her three changes to the checks (B4.15's
  edge `--muted`, B4.19's swatch paints `--accent`, B4.21's band and triangles) are taken, Atlas
  accepting the triangle bound, which loosens only a new check.
- **Owner:** none to merge. The first change to the visitor's first screen since B3 is the plan's
  B4 demo; whether it is an Owner's pick is Atlas's call.
