# Sprint 65 contract: Tc, the chart and the fits

Quill wrote this from the plan (`.crew/sprint/62/plan.md`, "Tc") and the code at d6b9fbf. Iris's
`placement.md` and `words.md` beside it settle the look and the words. Changes made during the build
go in `decisions.md`.

**The outcome.** Under the frame, the trials page draws every window the crew swept as a chart, with
width across and height up. The windows where the contact links sink are hatched as one band along
the foot, the crew's windows are pinned with their freeboard, soundings invite a try, and a ring
marks where the frame is. Without script the soundings are links. With script, a tap anywhere on the
chart tries that window in place. The seven fits the crew wrote into the stylesheet to keep the name,
facts and contact links on the first screen are there to find. When the frame's window falls inside
one, its stamp says what the fit does and which sprint built it, names who drew, checked and tested
it, and quotes the first thing that went wrong, in the retro's own words. "3 of 7 found" counts for
this visit only.

Goal, as `/` prints it: "A chart of every window, and the crew's seven fits to find" (58).

## The seven fits

A fit is a media query that one of the window-fit sprints (Wa 43, Wb 44, Wc 45) wrote into
`app/globals.css` to lay out `/`'s first screen for a range of windows, and that the file still
holds verbatim. Sources: `git blame` on every `@media` line of `app/globals.css`,
`git show <sha> -- app/globals.css` for the queries each sprint added or removed, and
`.crew/sprint/<n>/retro.json`. Window counts are from the committed sweep (10e9409), decoded in my
scratchpad: they change when the sweep is retaken, so the page computes nothing from them.

| # | The fit (working words; Iris's `words.md` decides) | Its query, verbatim (line at d6b9fbf) | Windows it covers (grid windows, sinking) | Sprint, PR | Drawn / Checked / Tested | `wentWrong[0].what`, verbatim |
|---|---|---|---|---|---|---|
| 1 | The drawing gives way, and the contact links follow the bio | `(width >= 80rem) and (height < 56.25rem), (width >= 80rem) and (aspect-ratio >= 13 / 8)` (1512); the drawing's scale is under `(width >= 80rem)` (1491) | 1280 wide and up, under 900 tall or wider than 13:8 (4,383; 1,141) | 43, #102 | Forge, Pixel / Lens / Probe | "Three changes to the same title block landed on main while this sprint built, and one put the contact links back under the fold" |
| 2 | The facts stand beside the drawing | `(width >= 80rem) and (height < 44.5rem)` (1528) | 1280 and up, under 712 tall (2,091; 1,141) | 43, #102 | the same | the same |
| 3 | A phone's drawing shrinks with the window, and its controls go to the top | `screen and (width < 48rem)` (1699) | under 768 wide (3,612; 61) | 44, #107 | Forge, Pixel / Lens / Probe | "The first layout was measured in a different browser build than the tests use, and one phone size didn't fit there" |
| 4 | On the narrowest phones the drawing drops clear of the controls | `screen and (width < 20.6875rem)` (1820) | under 331 wide (129, the 320 column; 23, 320 × 568 among them) | 44, #107 | the same | the same |
| 5 | A tablet's drawing gives way, and the facts stand beside it | `screen and (64rem <= width < 80rem) and (height < 60rem)` (1574) | 1024 to 1279, under 960 tall (1,600; 554) | 45, #108 | Forge / Lens / Probe | "The plan asked two checks to run against a deployed site, but they only hold without a live feed" |
| 6 | The contact links and the key break into two lines where they read | `(64rem <= width < 78rem)` (1646) | 1024 to 1247 (1,806; 492) | 45, #108 | the same | the same |
| 7 | A tall tablet keeps the whole sheet, with the facts in a row of four | `(64rem <= width < 80rem) and (height >= 60rem), print and (64rem <= width < 80rem)` (1427) | 1024 to 1279, 960 tall and up (464; 0) | 45, #108 | the same | the same |

"Drawn / Checked / Tested" follows the rules of `/`'s revision table (`lib/sprint-log.ts`:
`drawnBy`, `checkedByLens` and the `tested` field). Like the sweep, the three retros are read into
the bundle, never at render, because window pages render on demand (memory, sprint 46). This way a stamp and the sprint's row on the Log always agree. Each
query appears once in the file (`grep -nF`).

**Why seven, and not eight or nine.**
- Wa, Wb and Wc wrote eight queries. The eighth, Wa's `(width >= 80rem)` at line 1491, sets the
  drawing's scale for every laptop width and resolves to 1440 × 900's own values (W2). By its own
  numbers the drawing gives way only inside fit 1's region: below 821 px tall at 1280, 851 at 1440
  and 1,014 at 1920. So it belongs to fit 1. Counted on its own, a visitor would "find" it just by
  arriving at `/trials`.
- Sprint 39 (Pa, #97) placed the facts at every width from 1024 (`(width >= 80rem)` at 1459, and a
  tablet strip that sprint 45 later bounded into fit 7's query). That's a placement for every laptop
  and tablet, with no window to find.
- Sprints 51, 57 and 60 defended the fits with checks and a door, and wrote no media query
  (`git log -- app/globals.css`).
- No fit covers 768 to 1023, where the drawing holds its size: 493 of the 2,249 sinking windows are
  there. The chart shows this, and Iris's words may say so.

The seven fits come from three sprints, so three retros supply their quotes: two stamps quote sprint
43, two quote 44 and three quote 45. That is the sprint's first line, as the plan asked (already
public on `/log/43` to `/log/45`). Iris may group the stamps by sprint so each line reads once. The
check still reads every stamp.

**When a fit is entered.** A fit is entered when the frame's own document matches its whole query:
`iframe.contentWindow.matchMedia(query).matches`. The server states the same for its window,
treating a rem as 16 px, and T19 holds the two equal. 1440 × 900 enters none. If a visitor's default
font size isn't 16 px, the rem boundaries move. With script, the frame's document is the truth.

## The calls

1. **The chart's data is the committed sweep, which is already in the bundle.**
   `lib/trials-sweep.json` holds the whole grid (101 widths × 129 heights = 13,029 windows),
   delta-coded in 6,124 B raw (1,683 B gzip). The plan's "about 60 KB, fetched only by the chart"
   assumed a raw grid. The server draws the band from this file, and the controller already carries
   it (sprint 64, `decisions.md` 6). Nothing is fetched, so the planned check "the sweep is fetched
   only by the chart" becomes "the trials page fetches no data", inside T16. In every column the
   sinking windows form one run up from 460: no window sinks above one that floats. So the band has
   one edge per width.
2. **No new sweep, apart from the standing step.** Tc changes nothing on `/`. But this sprint's retro
   adds a goal row to `/`'s revision block, which moves the links from 1024 wide. Once the retro is
   final, run `pnpm build && node .crew/sprint/63/trials-sweep.mjs`, commit the file if it changed,
   and then add the label (plan, risk 4). T4 and T16's edge clause are the gates.
3. **The words and the queries ride in the HTML, not the script.** All seven stamps and their
   regions on the chart are rendered by the server, with the unfound ones hidden. The controller
   reads each query from its stamp and listens with `matchMedia` on the frame's window, with no
   per-frame polling. That's how Tc fits its number.
4. **Pins are drawn, and soundings are the chart's links.** On a phone the crew's eight phone windows
   (320 to 430 wide) share about 20 to 25 px of the chart's width, so they can't be 44 px targets (T8). The crew's windows
   stay links in their list (T6). The chart's links are soundings, placed by Iris so they never
   overlap at 44 px below 1024 or at 24 px from 1024. The four named near misses are among them.
   The chart contains links, so its `svg` isn't `role="img"`: the chart is a figure, and its words
   are its caption.
5. **The track is cut.** The ring shows where the frame is, and the visit's record is the found
   count. A drawn path costs bytes the loader doesn't have, so it's a follow-up if the demo asks for
   it.
6. **Found fits come back at load, or the count waits for the touch.** Before the first touch the
   loader has 311 B left of 1,024 (713 B used). Restoring the visit's found fits at load must fit in
   that space without moving anything. If it doesn't fit, cut it: the count comes back on the first
   touch, Iris's words say so, and the budget doesn't grow.
7. **If the sprint runs long, cut in this order:** the found fits' regions on the chart first, then
   every sounding except the four named windows. The band, the pins, the ring, tap-to-try and the
   stamps stay.

## Checks (T16 to T21)

- **T16 The chart is the sweep.** Scripts off, on `/trials` and `/trials/320x568`, `main` holds one
  `svg[data-chart]`. Its plot (`[data-plot]`) uses window px as its user units: x is the width and
  y the height, and a transform may flip and scale them. `[data-band]` fills the point (w, h) for
  exactly the grid windows whose swept freeboard is under 0 (`isPointInFill` at all 13,029 points).
  The chart's words give the number of sinking windows and the total, both from the sweep (2,249 of
  13,029 today). The edge is current: at each of the 101 widths, take the highest sinking window and
  the window one step above it (or the 460 window where nothing sinks). Measured fresh on the build
  by T4's rule, each equals the sweep within 0.5 px. In forced colours the band and the ring show.
  With script, from load through a first touch and a drag, the page's frame receives no JSON
  response (no response with a JSON content type): the sweep it draws and tries is the bundle's.
- **T17 Pins, soundings and the ring, without script.** Each `PINS` window is marked once, at its
  point within 0.5 units, by a `[data-pin]` that lists the windows it marks (H10's run of 61 may be
  one mark). Each mark carries the sweep's freeboard in `data-freeboard`, and in its text where Iris
  labels it. Each sounding is one `a[data-sounding="<w>x<h>"]`, placed at its point and linking to
  that swept window's address (200). Its visible number is the sweep's freeboard as the page writes
  it (signed, one decimal), and its accessible name gives its size and number in Iris's words. The
  four named windows are soundings. The ring (`[data-ring]`) sits at the shown window. At 320, 390,
  1024 and 1440, no two sounding targets overlap. T6's `a[data-window]` set doesn't change. The
  walk, scripts off at 390 × 844: from `/trials`, the 1366 × 595 sounding leads to
  `/trials/1366x595`, which shows the near miss with the ring there.
- **T18 Tap to try.** With script, on a fresh `/trials` at 1440 × 900 (mouse) and at 390 × 844 (CDP
  touch), the first tap on the plot at 1024 × 640's point settles the frame there by Tb's rule
  (sprint 64, call 1). Then the frame's document is exactly 1024 × 640, `[data-freeboard]` shows the
  sweep's value, the address is replaced, `history.length` is unchanged, the live region speaks
  once and the ring is there. A tap on a sounding tries its window in place, the first tap included.
  A Ctrl- or Meta-click opens it as a link. During a corner drag the ring stays within 1 unit of the
  frame's window at each sampled frame, and comes to rest with it.
- **T19 The seven fits are the stylesheet's.** Probe's oracle holds this contract's table word for
  word: seven fits, in order, each with its query and its sprint. On the page each fit
  (`[data-fit]`) carries its query in `data-query`. That query appears verbatim as a media query in
  the build's `app/globals.css` (whitespace aside), and the fit links to that line at the build's
  commit, as the rules link to their specs. Its sprint has a merged retro whose `pr` matches the
  table. Scripts off, the stamped fits are exactly the ones whose query the frame's document matches.
  This is checked at every `PINS` window, the named windows, and the grid windows on either side of
  each boundary: widths 320/336, 752/768, 1008/1024, 1232/1248 and 1264/1280, heights 710/715 at
  1280, 895/900 at 1440 and 955/960 at 1024, and 1600 × 980/985 for 13:8. The server's HTML may be
  read by request, and the frame's queries may be read on one page of the frame's address at each
  viewport, as T3 and T4 measure. 1440 × 900 stamps no fit, 320 × 568 stamps 3 and 4, 1366 × 595
  stamps 1 and 2, and 1024 × 640 stamps 5 and 6.
- **T20 Each stamp is its retro.** A stamped fit shows its words, its pull request, and its sprint,
  which links to its record (`/log/<n>`, 200). It also shows the names the sprint's revision row
  shows (Drawn, Checked, Tested) and its retro's `wentWrong[0].what`, verbatim as the Log prints it.
  No visible text has a check code or a URL path (T5's patterns). Without script, a fit the window
  doesn't enter shows none of its own words.
- **T21 Found, for this visit only.** With script, arriving at a window finds its fits, and the
  count reads "n of 7" in Iris's words. In a drag, a fit is stamped the moment the frame's document
  first matches it, and its region shows on the chart. The region equals the query at the grid's
  points, checked as T16 checks the band. Nothing is spoken during a drag, and the settle's one
  message names any fit found since the last settle. A reload, and a crew window's link, keep the
  visit's found fits without a layout shift (CLS 0 at 390 and 1440, from load to rest + 2 s). A new
  context starts with only the window's own fits. "Found" lives in `sessionStorage` under one key
  and nowhere else: `localStorage`, cookies and IndexedDB stay empty, and no request carries it.
  Under reduced motion no stamp moves, and at rest + 1 s nothing animates. Without script, the page
  stamps the window's own fits and says how many of the seven it is in, with no visit count.

The plan's T21 ("the sweep is fetched only by the chart") is folded into T16 by call 1. Found for
the visit, which the plan placed in Tc's outcome without a number, takes T21.

**Two tests, one file.** Playwright 1.64 splits the shards by counted tests (`fullyParallel`;
`filterForShard`), and the suite has 418, so shard 2 runs `keel.spec.ts`'s K1 through
`log-riffle.spec.ts`'s Y23 at 1440. At 420 tests, four shards of 105 leave every shard's set as it
is. At 421 or more, shard 2 picks up log-riffle's next Y23 tests, and shard 2 ran 17:07 to 19:21
against its 20-minute cap on #131. So Probe writes T16 to T18 as one test and T19 to T21 as another,
in `e2e/trials-chart.spec.ts`. Each title names its three checks, and the bodies assert all of them
(Lens reads titles). If the owner's #132 (a 30-minute cap) merges first, Probe may split them into
six. Heavy work is shared: the 13,029 points are read in one `evaluate`, and the 202 edge measures
come from one page resized, not reloaded. Probe reports every shard's time on the PR before the
label.

## Kept checks this touches

| Check | With Tc |
|---|---|
| T10 (`trials-drag.spec.ts:541`), "after the touch, at most 8,192 B gzip … in all" | Named rewrite: 8,192 becomes 10,240 and nothing else changes. Reason: sprint 64's `decisions.md` 6 measured 8,072 B and gave Tc its own allowance, for Lens to accept. |
| T8 (`trials.spec.ts:1362`) | Unedited. The chart and stamps meet its axe, tokens, overflow from 320 to 1440, targets (`main a` matches SVG links), Tab, `--accent`, the 1,024 B at load, LCP text and CLS. "Nothing animating" includes `/trials/320x568`, which arrives inside fits 3 and 4, so a stamp never animates on arrival. |
| T6 (`trials.spec.ts:1140`), `a[data-window]` equals `PINS` | Unedited: the chart never uses `data-window`. |
| T5 (`:1016`), no check code or URL path | Unedited: the stamps follow its patterns. |
| T7 (`:1300`), the first screen | Unedited: the chart and stamps sit below everything it pins (Iris's placement). |
| T12, T13 (`trials-drag.spec.ts:750`, `:1069`) | Unedited: a tap's settle is a settle, and a found fit rides its one message. |
| T14 (`:1298`), INP during a drag | Unedited: the fits' listeners stay within its 200 ms. |
| T1 to T4, T9, T11, T15 | Unedited: no new address, header or card. T4 is the sweep's gate (call 2). |
| B2.10, B4.14, W1 to W17, B1.1, P3, P8, B4.22, H9 to H11 | Unedited: nothing changes on `/` or the other routes, and the seven queries are read, never edited. |

**Before the build,** Probe runs the unedited suite against a scratch build with a bare chart (an
`svg` holding four 44 px `a[data-sounding]`) and seven bare stamps: the contract mutant. I expect no
red. Every red goes into the PR as a named rewrite.

## Budgets

| Budget | Limit | Check |
|---|---|---|
| Trials script before the first touch | ≤ 1,024 B gzip beyond the 404's (713 B now) | T8, T10, unedited |
| Trials script after the first touch | ≤ 10,240 B gzip in all: Tb's 8,192 plus Tc's own 2,048 | T10, named rewrite |
| The chart's data | the sweep in the bundle, ≤ 64 KB raw (6,124 B), no request | T4, T16 |
| INP during a drag | ≤ 200 ms at 4x CPU, gated | T14, unedited |
| Frames at rest; CLS | 0; 0, the found restore included | T10, T14; T8, T21 |
| The trials page's HTML | reported before and after | reported |
| `/`, `/log`, `/crew`, `/read`; the seven queries | unchanged | B2.10, B4.14, W1 to W17; T19 |
| Copper | never on the trials page | T8 |
| CI | two tests added; shard 2 keeps its 105 | each shard's time reported before the label |

## Out of scope

The track (call 5). Drawing a fit before it is found. A fit for 768 to 1023, or any change to `/`'s
CSS. The doors (Td). Scripts in the frame. The cards' words. Writing "found" anywhere but
`sessionStorage`. The shard cap and weights (`ci.yml`, the owner's #132). Anything on `/`, the bar,
`/llms.txt`, owner paths and `content/`.
