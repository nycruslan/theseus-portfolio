# B5a contract: `/log` in 2D, a record per revision, `/sprints` redirected

Quill, 2026-10-24, during sprint 29, for the run that builds it. B5's first sprint, B5a, as planned in
`.crew/sprint/29/b5-plan.md`, to the owner-approved frames `log-1440.webp` and `log-390.webp`
(`.crew/sprint/17/design/`) on the direction `.crew/sprint/17/direction-iris.md`. It neither
repeats nor builds on #75: nothing here reads the Studio, and the frames' B4 parts (the pencil row,
"Drawing now", the rest line, the Crew link) stay B4's. Every number below was measured on today's
main (`0fcb84f`), on production, or in a scratch build of main, as cited.

## Outcome

A hiring executive who follows Log, or an old `/sprints` link, lands on `/log` and sees in the
first screen what the site's crew has done: "Log", a drawing of the ship's 22 original planks in
vellum, each numbered by the sprint that took it out, the line "All 22 original planks are out:
the last went with sprint 23. Since then the crew has replaced 4 planks of its own.", and the
newest revisions as a table of who drew, checked, tested and approved each. An engineer opens any
revision's number and gets `/log/<n>`, a page of its own: the pull request, the plank it seated and
what it replaced, and what went wrong in the crew's words. Back, or Close, returns to the Log. All
of it reads without JavaScript or WebGL, and nothing moves.

## The calls I made

- **`/log` replaces `/sprints`; `/sprints` answers 308 to `/log`.** Old links and the share card
  keep working. In a scratch build of main, `redirects()` in `next.config.ts` (a team path) answered
  `/sprints` with 308 and `Location: /log`. `app/sprints/` goes.
- **A record is a route, `/log/<n>`, one per merged sprint.** In the same scratch build,
  `generateStaticParams` from `readSprintLog()` prerendered all 26 under `cacheComponents` and the
  layout's `ensureStatic = "navigation"`, and `/log/16`, `/log/29`, `/log/999`, `/log/abc` and
  `/log/013` answered 404 with the site's not-found page (`noindex`), through the route's fallback
  calling `notFound()` (`dynamicParams` isn't available under `cacheComponents`). A record is the
  whole Log page with the record open, so Back is the browser's and needs no script.
- **The ghost hull keeps each seat's first number.** It is the original ship reassembled from what
  the crew removed (Iris, sprint 22 notes, section 5: "B5's ghost hull keeps the older one"). It has
  been complete since sprint 23, so the frame's caption, written at 15 of 22, is reworded below for
  a hull with no gaps. 2D only: the B1 drawing's own maths, in vellum.
- **The bar on `/log` is the sheet's, minus what can't act there.** The wordmark becomes the way
  home (Iris, sprint 22 notes, section 6); Work and Contact point at `/`'s sections; no motion
  control (there is no model on `/log` until B5c, and a control that changes nothing is a stand-in,
  sprint 22's rule); no Crew (B4.1's).
- **What went wrong moves to the records; the table carries the rest.** On production `/sprints`
  is 11,665 px tall at 390 (26 entries, 397 px each on average). A folded revision row is 89 px at
  390 (`/`'s revision block on production), so the table is about 2,300 px. Every row is in the
  HTML, no paging and no grouping (the plan's answer to the "about 30 entries" rider; day groups
  come with the dates in B5b). The phone frame's foot link "Revisions 7 to 1" isn't built.
- **No dates, no lines figure, no Design row, no pencil or closed rows.** Retros hold no dates and
  no score (the plan's "The data rules"); B5b brings the merge record. A record shows only the
  public retro fields and the cells `/` already publishes.
- **No client code.** `/log` and the records load the framework's scripts and nothing else, the
  same files the 404 loads. That keeps B2.10's baseline honest when it moves from `/sprints` to
  `/log` (production today: `/sprints` and the 404 load the same 5 files, 459,340 B decoded).

## Data rules (the page and Probe's oracle implement these word for word)

**The record set.** The merged sprints are the valid retros on main, ascending by `sprint`, exactly
as `readSprintLog()` accepts them and `e2e/retros.ts`'s `MERGED` reads them (today 1 to 15 and 17 to
27; k = 26). The reader's rules (C12) don't change. A folder without `retro.json` is not in the
Log.

**The seat.** The i-th merged sprint (i from 0) seats `ORDER[i mod 22]` (`lib/lines-plan.ts`;
`e2e/retros.ts` copies it). A seat's holders are the merged sprints that seated it, ascending.

**The ghost hull.**
- One drawing, in the server's HTML, inside `[data-ghost]` with `aria-hidden="true"`; nothing in it
  is focusable or hit (`pointer-events: none`), as the lines plan on `/`.
- For each seat with at least one holder: one `path[data-plank="<k.j>"][data-sprint="<first
  holder>"]` with the class `plank-ghost`, filled with `var(--vellum)`, a new token on `:root` in
  both schemes (Iris sets the values; her sprint 22 notes give light `#cfdcdc` at 0.7).
- A seat with no holder draws no plank (a gap). Nothing in `[data-ghost]` has the class
  `plank-seated` or `plank-original`, and nothing is hatched or copper.
- Numbers: from 768 px each ghost plank's first holder is set as HTML lettering (`.plan-plank`, as
  the lines plan), inside its plank or led out as the lines plan leads out 5.0; below 768 the
  numbers may be hidden (the table carries them).
- The hull's outline is drawn; which other views (half-breadth plan, stations) appear is Iris's.
- On `/log/<n>`, the ghost plank at n's seat also carries `data-current` (Iris styles it); on
  `/log` none does.
- Today's ghost: 5.1=1 3.2=2 1.1=3 6.0=4 4.2=5 0.1=6 2.0=7 3.0=8 5.2=9 1.3=10 4.0=11 0.2=12 6.1=13
  2.1=14 1.2=15 3.1=17 4.1=18 2.2=19 5.0=20 3.3=21 0.0=22 1.0=23 (22 planks, no gaps).

**The Log's header.** In `main`, first: `h1` "Log"; then `p[data-ghost-caption]` "The ghost hull:
the original planks the crew has taken out, each numbered by the sprint that replaced it."; then
`p[data-ghost-count]`:
- k ≥ 22: "All 22 original planks are out: the last went with sprint {the 22nd merged sprint}."
  followed, when k > 22, by " Since then the crew has replaced {k − 22} planks of its own." Today:
  "All 22 original planks are out: the last went with sprint 23. Since then the crew has replaced 4
  planks of its own."
- k < 22 (fixtures only): "{k} of 22 original planks are out. The gaps are the {22 − k} still
  sailing."

**Every revision.** `section[aria-labelledby="every-revision"]` with `h2#every-revision` "Every
revision", then a `p`: "A crew of AI agents rebuilds this site one sprint at a time. {k} revisions,
newest first: choose one to open its record." (Iris may reword the first sentence before Probe
writes; the second is fixed.) Then one `table`:
- `thead`: Rev, Description, Drawn, Checked, Tested, Approved.
- `tbody`: one `tr` per merged sprint, newest first. Its `th[scope="row"]` holds one link,
  `a[href="/log/<n>"]`, whose text is "Revision {n}" with "Revision " visually hidden (the eyes see
  the number; the name is "Revision 13", one real space).
- The cells, as the revision block on `/` gives them (`.crew/sprint/22/contract.md`, "Data rules"):
  Description is the goal as `presentGoal` gives it, whole (never cut, no ellipsis: the Log is
  where the full text lives); Drawn the names or "—"; Checked "Lens" or "—"; Tested "Probe" or
  "—"; Approved "Owner" or "Gate".
- On `/log/<n>`, row n's link has `aria-current="page"`.

**The record, on `/log/<n>`.** `section[aria-labelledby="record"]`, after the Log's header and
before Every revision in the DOM. In it:
- `p` "Rev {n}"; `h2#record`, the goal as `presentGoal` gives it;
- a `dl` whose `dt`s are, in this order: Drawn, Checked, Tested, Approved (the row's own cells),
  Size ("Small", "Medium", "Large"; the pair is left out when `size` is absent), Pull request
  ("Pull request #{pr}", linked to `https://github.com/nycruslan/theseus-portfolio/pull/{pr}`; left
  out when `pr` is absent), Plank (below);
- when the entry has items: `h3` "What went wrong, in the crew's words" and a `ul` with the reader's
  `wentWrong`, up to three, in the file's order, whole;
- three links: Close, `a[href="/log"]` named "Close revision {n}"; and, by merged order, "Rev
  {previous}" to `/log/{previous}` and "Rev {next}" to `/log/{next}`, each left out at its end
  (sprint 1 has no previous; 15's next is 17).

**The plank's words.** For seat `k.j`: "Lift {k + 1} of 7 from the deck, plank {j + 1} of {the
number of seats in lift k} from the stern." Then, for the seat's first holder: "It replaced an
original plank, now in the ghost hull."; for any later holder: "It replaced sprint {the holder
before it}'s plank. The original is in the ghost hull, numbered {the first holder}." Then, when a
later holder exists: "Sprint {the next holder} has since replaced it." The seats per lift are 3, 4,
3, 4, 3, 3, 2 (`PLANK_IDS`). Today: sprint 1, "Lift 6 of 7 from the deck, plank 2 of 3 from the
stern. It replaced an original plank, now in the ghost hull. Sprint 24 has since replaced it.";
sprint 13, "Lift 7 of 7 from the deck, plank 2 of 2 from the stern. It replaced an original plank,
now in the ghost hull."; sprint 24, "Lift 6 of 7 from the deck, plank 2 of 3 from the stern. It
replaced sprint 1's plank. The original is in the ghost hull, numbered 1."

**The bar on `/log` and every record.** A `header` before `main`: the wordmark "Theseus" as
`a[href="/"]`, then `nav[aria-label="Main"]` with Work `/#work`, Log `/log`, Contact `/#contact`,
Read as page `/read`, in that order. Log has `aria-current="page"` on `/log` and `"true"` on a
record. No `button` and no `[data-motion]` in the header, and no Crew. Targets as on `/`: 44 px tall
below 1024, at least 24 from it. On `/` the bar is unchanged except Log's `href`.

**The site's links.** Every `a[href="/sprints"]` becomes `/log`: the bar's Log, the revision
block's "All {k} revisions in the Log" on `/`, and `/read`'s "the Log". The sitemap lists `/`,
`/read`, `/log` and each `/log/<n>`, and not `/sprints`.

**Metadata.** `/log`: title "Log — {profile.name}", description "A crew of AI agents rebuilds this
site one sprint at a time. The Log keeps every revision: who drew, checked, tested and approved
it, and what went wrong.", canonical and `og:url` `/log`. `/log/<n>`: title "Revision {n} — Log —
{profile.name}", description the goal, canonical and `og:url` `/log/<n>`. Each has one `og:image`
and one `twitter:image`, served as `image/png` (the site's card). The pages use `profile.name` and
no other part of `content/`.

## Checks

Probe writes these first, in `e2e/`, from the oracle; each title carries its number, and each
rewritten `/sprints` test keeps its old C-number in its title so the owner can trace it.

**B5.1 The route and the bar.** `/log` is 200 with scripts on and off: one `main#main[tabindex="-1"]`,
the first `a` in the DOM is the skip link to `#main`, one `h1` "Log". The bar holds exactly the
data rules' wordmark and four links, with Log current, and no button. At 320, 390, 768, 1024 and
1440 each is a target inside the viewport, the bar is one line, and from it: the wordmark lands on
`/` (h1 the owner's name), Work and Contact land on `/` with `#work` and `#contact` in view and
clear of the bar, Read as page on `/read`. (Rewrites C1.1.)

**B5.2 `/sprints` is gone, and nothing points at it.** `GET /sprints` (no redirect followed) answers
308 with `Location` ending in `/log`; followed, it lands on `/log`'s h1. The server HTML of `/`,
`/read`, `/log`, `/log/13` and the 404 holds no `href="/sprints"`. The sitemap lists `/log` and
every merged `/log/<n>`, and not `/sprints`; `robots.txt` disallows neither. (Rewrites C2.2.)

**B5.3 The first screen.** At 1440 × 900 and 390 × 844, both schemes, on `/log`: the `h1`, the
count line and the first row of Every revision each start inside the viewport. On `/log/13` and
on the newest record: the record's `h2` starts inside the viewport.

**B5.4 The ghost hull.** On `/log` with scripts off and on: `[data-ghost]` is in the HTML, hidden
from assistive tech, nothing in it focusable or the element at any of its points; its planks are
exactly the data rules' (ids and numbers against the oracle, today's list above), none seated,
original, hatched or copper. From 768 px each ghost plank's number is shown, at least 10 px, inside
its plank or led out; at 320 to 1440 the drawing is inside the viewport's width and uncropped.
Its fill resolves to `--vellum`, which is set on `:root` in both schemes and differs from
`--card`, `--card-old` and `--background`; the numbers' ink on vellum (composited over the
background) is at least 4.5:1 in both schemes; in forced colours each ghost plank's edge shows
(unlike Canvas). `[data-ghost]` is at most 32,768 B of HTML. The caption and the count line read
as the data rules say, against the oracle. On `/log/<n>` exactly one ghost plank has
`data-current`, at n's seat; on `/log`, none.

**B5.5 Every revision.** The rows are the merged sprints, newest first, one each, with the anchors
10 before 9, 2 before 1, 1 last (C3.1, C3.2). Each row's cells equal the oracle's; each
Description is the whole goal on as many lines as it takes, no ellipsis and nothing clipped, and
none ends in a bare size tag while sprint 15 keeps its words (C4.5, C5.2). Each Rev link's name is
"Revision {n}" with a real space and its `href` is `/log/{n}` (C4.1). The lede reads as the data
rules say. On `/`, the revision block's link reads "All {k} revisions in the Log", points at
`/log`, and k equals `/log`'s rows (C14.1, C15). (Rewrites C3.1, C3.2, C4.1, C4.5, C14.1, C15.)

**B5.6 A record per revision.** Every merged n answers 200 at `/log/<n>`; `/log/16`, `/log/0`,
`/log/999`, `/log/abc` and `/log/013` answer 404 with the site's not-found page (`h1` "Page not
found", `noindex`), as does a folder with no retro (on a sprint's own preview, its number). On the
newest record, `/log/13`, `/log/1` (the old retro shape) and `/log/24` (a second holder): the
`h2` is the goal; the `dl` pairs are the data rules', in order, against the oracle; the PR link
reads "Pull request #{pr}", points at the repository's pull, is at least 24 px tall and in
`--foreground` (C4.3), and at 320 stays on one line (C8.2); Size reads the size in words and
Approved "Owner" exactly for `needs-owner` (C4.2); the Plank words are the data rules' (today's
three examples verbatim); "What went wrong, in the crew's words" and its list appear exactly when
the entry has items, up to three, in the file's order, untruncated and unhidden (C5.1, C5.2); no
`outcome`, no `evidence`, no backtick and no link but the bar's, the record's and the table's
(C5.3); no status word ("Merged", "Shipped", "Failed") outside the crew's own words, on `/log` and
the records (C4.4). Close, the previous and the next link follow the data rules, and row n's link
is `aria-current="page"`. (Rewrites C4.2, C4.3, C4.4, C5.1 to C5.3, C8.2.)

**B5.7 Back closes what opened.** At 390 × 844 and 1440 × 900: on `/log`, scroll the tenth row into
view and open its Rev link: the URL is `/log/<n>` and the record's `h2` is in the viewport. Back:
the URL is `/log` and that row is in the viewport. From the record, Close lands on `/log`.

**B5.8 Metadata.** `/log` and `/log/13` carry the data rules' title, description, canonical and
`og:url`, and one `og:image` and one `twitter:image`, each fetched as `image/png`. (Rewrites C2.1,
C2.3.)

**B5.9 The route sweeps on `/log` and a record.** `ROUTES` (`e2e/helpers.ts`) gains `/log` and
`/log/13` (200 each), so with the same assertions and titles that name them: every text colour and
size from a token and body text at least 16 px; contrast; axe with the strict tags, with and
without the skip link showing, in both schemes; with scripts off the first paint has the scheme's
background; nothing overflows at 320; every link and button at least 24 × 24 on a phone; one
`main`, each section a region named by its heading, no skipped level; nothing animates at load,
2 s later, or after a scroll to the bottom and back; no `TODO(owner)` value renders. Also on both:
nothing overflows from 320 to 1440 in both schemes (C8.1); axe at 390 and 1440 with and without the
skip link (C9.1) and contrast (C9.2); headings are one `h1` "Log", the record's `h2` and its `h3`,
then "Every revision" (C9.3); every link but the skip link at least 24 × 24 at 390 (C9.4); in forced
colours each of the record's list dots still shows at 390 and 1440, its selector from the spec's
own record constant (C9.5); the keyboard: the skip link first, Enter lands on `main`, Tab visits the
bar's five links, then every record link, then each Rev link in DOM order, each with one clear ring
(2 px ink, 2 px out) in both schemes (C10), and in forced colours each focused link shows exactly
one ring (keyboard's B2.9); with scripts off the HTML holds every row and the record's items
(C11.1); with reduced motion nothing animates (C11.2); nothing is `--accent`, at rest, hovered or
focused, links are ink and underlined except the bar's, as on `/` (B1.6 for `/log` in both
schemes). (Rewrites C8.1, C9.1 to C9.5, C10, C11.1, C11.2 and the B2.9 sweeps.)

**B5.10 Text first, the framework's script alone.** On `/log` and `/log/13`, at 4× CPU, the last
largest-contentful-paint candidate is text in `main`, not inside `[data-ghost]`, with no `url`,
within 2,500 ms. `/log`, `/log/13` and the newest record request exactly the 404's script files (by
path) and the same decoded bytes. B2.10's budget for `/` (WebGL refused), `/read` and the 404 is
counted against `/log`'s bytes instead of `/sprints'`, same 2,048 B. `/log` loads two woff2 files
within 86,016 B with the display face preloaded, and its text's faces are Sofia Sans and Sofia
Sans Extra Condensed only. (Rewrites B2.10 and B1.10's `/sprints` block.)

**B5.11 The reader keeps its rules.** C12.1 to C12.7 run unedited. The reader and `app/log/` name
no `content/` path and use only `profile.name` of the owner's facts (C13.1 on `app/log/`).

## The live checks: keep, rewrite, retire

Counted from `playwright test --list` on today's main: `e2e/sprints.spec.ts` has 60 tests and
`e2e/sprints-entry.spec.ts` 5 (not 54). **7 keep, 35 rewrite, 23 retire** across the two, plus the
rewrites in other specs below. A retirement needs the owner's approval on this PR: **batch F**.

| File | Tests | Disposition | Reason |
|---|---|---|---|
| sprints.spec.ts | C12.1 to C12.7 (7) | **keep** | The reader doesn't change |
| sprints.spec.ts | C1.1, C2.1 to C2.3, C3.1, C3.2, C4.1 to C4.5, C5.1 to C5.3, C8.1 (2), C8.2 (2), C9.1 (2), C9.2 (2), C9.3 to C9.5, C10 (2), C11.1, C11.2 with reduced motion, C13.1 (30) | **rewrite** | Same assertions on `/log` and the records (B5.1 to B5.11). C1.1's back link becomes the bar's wordmark; C4.2's "Owner's call" becomes Approved "Owner"; C8.2 keeps its PR link on one line (its "never wraps before a dot" goes with the meta line, in F) |
| sprints.spec.ts | C1.2 no svg, table, button or details (1) | **retire (F)** | The Log is a table and a drawing by design |
| sprints.spec.ts | C6.1 to C6.4 at five widths (15) | **retire (F)** | The hanging number and the column's rhythm describe the old list |
| sprints.spec.ts | C7.1 (2), C7.2 (2), C7.3 (2) | **retire (F)** | C7.1's steps, weights and one font are the old column's; the token sweep (B5.9) holds the rule. C7.2 is B1.6 on `/log`. C7.3 forbids the frame's drawn record box and Close |
| sprints.spec.ts | C11.2 "with motion allowed only the h2s rise" (1) | **retire (F)** | Nothing rises on `/log`; B5.9's "nothing animates" is stricter |
| sprints-entry.spec.ts | C14.1, C14.2 (2), C15 (2) (5) | **rewrite** | Onto `/log`: the link's `href`, its count against `/log`'s rows, and home by the wordmark |
| sheet.spec.ts | B2.3 (both) | **rewrite** | Log's `href` is `/log` and it lands on `h1` "Log" |
| sheet.spec.ts | B1.5 | **rewrite** | Rows counted on `/log`; the link's `href` `/log` |
| sheet.spec.ts | B1.6 on `/sprints` (2) | **rewrite** | The route is `/log` |
| sheet.spec.ts | B1.10 | **rewrite, one assertion retired (F)** | "`/sprints`: Sofia Sans only" goes, since the Log sets its heads in the display face as the frame draws; B5.10 checks `/log`'s two faces |
| keyboard.spec.ts | B2.3 "Contact's first link is the 15th Tab stop" | **rewrite** | Its two `/sprints` stops become `/log`; still 15, `tabUntil` unchanged |
| keyboard.spec.ts | B2.9 forced colours | **rewrite** | Adds `/log` and `/log/13`, and the title names them |
| invariants.spec.ts, content.spec.ts | the 9 `ROUTES` sweeps and the TODO(owner) check | **rewrite** | Two more routes in `ROUTES`; the titles name them |
| read.spec.ts | B2.10 | **rewrite** | The baseline is `/log` |
| plan.spec.ts | B2.5 | **rewrite** | `/read`'s ship links to `/log` |

Every other live check runs unedited: `/` doesn't change but for Log's `href`, so B1.1, B1.4, B1.8,
B1.9, the B2 and B3 suites, `not-found`, `smoke` and the model specs hold as they are.

**Batch F, for the owner:** C1.2, C6.1 to C6.4 at five widths, C7.1 to C7.3 in both schemes, C11.2
"only the h2s rise", C8.2's "never wraps before a dot", and B1.10's "`/sprints`: Sofia Sans only":
23 tests and two assertions, all about `/sprints`' old column. Without F, `/sprints` would have to
stay beside `/log`.

## Budgets

| Measure | Budget | Today |
|---|---|---|
| LCP on `/log` and a record | text in `main`, not the drawing, within 2,500 ms at 4× CPU | `/`'s B1.9 holds the same |
| Script on `/log` and the records | the 404's files exactly (framework only); B2.10 counts against `/log` | production: `/sprints` and the 404 both 5 files, 459,340 B decoded |
| The ghost drawing | at most 32,768 B in the HTML | `/`'s lines plan meets the same (C6) |
| Fonts | two woff2 within 86,016 B, the display face preloaded | B1.10 on `/` |
| CLS | 0: no script, fonts fitted | B1.8 |
| Targets | 24 × 24 from 1024; the bar's links 44 px tall below it | B2.9 |
| Overflow | 0 from 320 to 1440 | B2.9 |
| First screen | header, count line and first row in 1440 × 900 and 390 × 844 | `log-390.webp` puts the first row at about 545 px |

## Build notes (Forge)

- **The drawing.** Reuse `lib/lines-plan.ts`'s `draw` with a ghost pass rather than a second
  renderer: the seats from a `ghostPlanks(merged)` beside `seatPlanks`, first holder winning. Don't
  change `seatPlanks` or anything `/` draws (B1.4 runs unedited).
- **The bar.** One component with a variant for the Log (the wordmark link, `/#work`, `/#contact`,
  `aria-current`, no control). If importing the bar pulls the motion control's client chunk into
  `/log`'s scripts, B5.10 goes red: split the control from the bar's module.
- **The table and the record** reuse the revision block's cells (`components/revisions.tsx`'s
  `signatures`) and its fold below 1024, so `/` and `/log` can't disagree.
- **Metadata.** A route that sets `openGraph` needs its own image (`app/layout.tsx`'s note): `/log`
  re-exports the site's card as `/sprints` did; check that records serve one image each.
- **Comments** that name `/sprints` (`app/globals.css`, `app/fonts.ts`, `app/not-found.tsx`,
  `app/layout.tsx`, `components/model.tsx`) say `/log`, and the rider below rides.
- **Size, for Lens's one lane.** About 20 to 25 files: the two routes, a bar variant, the drawing's
  ghost pass, the record, `next.config.ts`'s redirect, the sitemap and three links, the CSS; and
  Probe's move of `sprints.spec.ts`. Push Probe's specs first, alone, with the run's red list as
  the readout, then the build.

## Riders

| Rider | Disposition |
|---|---|
| "Take C9.5's selector from `ENTRIES`" (Lens, sprint 21) | **Rides**: the C9.5 rewrite takes it from the spec's record constant |
| Lens's nit on #67: the focus-ring comment in `app/globals.css` citing the deleted card link | **Rides**: one comment line in a file this sprint edits |
| "Group the build log past about 30 entries" (Quill) | **Answered** by the table (about 89 px a row at 390); day groups with B5b |
| Lens's nit on #74 (`components/model.tsx`) | **Doesn't ride**: B5a touches only a comment there; B5c or B4.4 |
| The facts and fonts riders | **Don't ride**: B5a declares no font and touches no fact |

## Out of scope

- Dates, the Merged column, day groups and the lines figure (B5b); the Design row (a retro field
  the owner adds); closed sprints' rows (B5b's owner call).
- The 3D ghost, the motion control on `/log`, picking a plank (B5c).
- The pencil row, "Drawing now", the rest line and the Crew link (B4).
- `/`'s revision rows linking to their records (five more Tab stops before Contact).
- A share card per record; the phone's "Revisions 7 to 1" foot link; print styles for `/log`.
- Any change to `content/` or an owner path.

## Needs decision (Iris), before the build

1. The 2D ghost's composition at 390, 1024 and 1440 (which views, the scale, the numbers below 768),
   `--vellum` in the dark scheme, and how `data-current` reads.
2. The record's place at 1440 (the frame's right column beside the table) and below 1024 (after the
   Log's header, before the drawing or after it), inside B5.3's first-screen check.
3. The lede's first sentence, and whether Approved gets a one-line key ("Gate: merged behind CI,
   the owner's rules and Lens"), as the frame's record says it.

## For the owner, on this PR's preview

`/log` and a record at 390 and 1440 in both schemes, Back from a record, and an old `/sprints` link
landing on `/log`. **Approve batch F**, or keep `/sprints` beside `/log` until it's replaced. Also
visible against the approved frames: no lines figure or Merged column yet (B5b), the ghost in 2D
(B5c), the ghost's caption reworded for a hull with no gaps, and no foot link on the phone.
