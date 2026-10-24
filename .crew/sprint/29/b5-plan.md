# B5 as a sequence of sprints (Quill)

Quill, 2026-10-24, during sprint 29. B5 is "`/log` and the ghost hull" (`ROADMAP.md`), built to
`.crew/sprint/17/direction-iris.md` and the owner-approved frames `log-1440.webp` ("The archive:
ghost hull and revisions, /log/13") and `log-390.webp` in `.crew/sprint/17/design/`. It is built
from the retros on main, which the site already reads, not from the Studio, so it neither repeats
nor builds on #75 (B4's plan and feed contract, waiting for the owner). Three sprints, B5a, B5b
and B5c, each one PR that leaves the site whole. Their visitor checks are numbered across the
milestone, as B3's were: B5a's are B5.1 to B5.11, and B5b's start at B5.12. The first one's
contract is `.crew/sprint/29/b5-first-contract.md`.

## What the visitor gets

**The hiring executive** follows "All 26 revisions in the Log" from `/`, or a shared `/sprints`
link, and today lands on a 11,665 px column at 390 (production, measured: 26 entries averaging
397 px, every "what went wrong" in full). Nothing on it says how the site's crew is organised; it
is a feed of paragraphs. B5 gives them, in the first screen:
- a drawing that is the claim: the ghost hull, the ship's original planks, every one of them taken
  out and numbered by the sprint that replaced it. Today all 22 are out ("All 22 original planks
  are out: the last went with sprint 23"). That is the ship of Theseus, and it is true;
- a table they can read in seconds: every revision, who drew, checked, tested and approved it.
  The column of "Lens" and "Probe" and "Owner"/"Gate" is the governance a board asks about.
- From B5b, dates: 26 revisions between 13 Oct and 24 Oct 2026 is the cadence, as a fact. And
  the line count: 64 of 5,288 lines of the site's code are still original (measured below), the
  ship of Theseus in one number.

**The engineer** stays: each revision has a record at `/log/<n>`, a URL they can share, with the
pull request, the plank it seated and what it replaced, and what went wrong in the crew's words.
`/sprints`' content moves there, so the list stays short and the detail stays one click deep
(the brief's "the archive, one click deep").

**What `/log` is not:** live. The pencil row with "Drawing now" in copper, the rest line and the
Crew link are B4's (`b4-plan.md` on #75). `/log` states only the record on main.

## Settled from the visitor's side

**`/log` replaces `/sprints`, which answers 308 to `/log`.** The share card, the home page's old
build-log line and two weeks of links point at `/sprints`; a permanent redirect keeps them working
and tells search engines the page moved. Measured in a scratch build of today's main (Next 16.4.2,
`cacheComponents`, the layout's `ensureStatic = "navigation"`): `redirects()` in `next.config.ts`
(not an owner path) answers `/sprints` with 308 and `Location: /log`. Every link the site has to
`/sprints` (the bar's Log, the revision block's "All N revisions in the Log", `/read`'s "the Log")
moves to `/log`, and the sitemap lists `/log` and each record instead. Keeping `/sprints` as a
second log would show the visitor two archives of one record.

**`/log/<n>` is a route per merged sprint, not a panel.** A URL for every view is a wayfinding
guardrail, and a record is what an engineer shares. In the same scratch build,
`generateStaticParams` from `readSprintLog()` prerendered all 26 records as static pages, and
`/log/16` (closed, no retro), `/log/29` (a folder with no retro), `/log/999`, `/log/abc` and
`/log/013` answered 404 with the site's not-found page (`noindex`). `dynamicParams` isn't available
under `cacheComponents` (Next's own docs), so an unknown number is the route's request-time
fallback calling `notFound()`; the build passed `ensureStatic` with it. Every page is plain links:
opening a record is a document navigation, so **Back closes what opened** with no script, and the
record's Close is a link to `/log`.

**The phone, and the rider "group the build log past about 30 entries".** The weight on a phone
was never the count; it was every "what went wrong" printed in full. On `/log` each revision is one
table row, folded under its number below 1024 as the revision block on `/` already is (89 px a row
at 390 on production), and what went wrong moves to the record. So:
- **at 28 revisions:** about 28 × 89 = 2,500 px at 390, one table, newest first, no grouping and
  no paging. `log-390.webp`'s foot link "Revisions 7 to 1" isn't built: every row is in the HTML,
  so find-in-page, no-JS and the `/read` habit all work. Iris may bring it back at B5a's review if
  the list reads long on a real phone.
- **at 60:** about 5,300 px at 390. From B5b the table is grouped by merge day (a row header per
  UTC day, "Fri 23 Oct · 4 revisions"), which needs the dates and shows the cadence. Still no
  paging; revisit at about 100 rows.

**The Date column is "Merged", from B5b.** See "The dates" below.

**Nothing on `/log` is copper, and nothing moves, until B5c.** B5a and B5b are the Off path that
every visitor gets without WebGL: the ghost hull in 2D, SVG in the HTML like the lines plan.

## The data rules

The page and Probe's oracle (`e2e/retros.ts`) implement these word for word. "Merged sprints" are
the valid retros on main, in ascending sprint number, as `readSprintLog()` and `MERGED` read them
today: 1 to 15 and 17 to 27, k = 26, on today's main (`node` count of `.crew/sprint/*/retro.json`;
sprint 28 is on #75's branch, not main, and sprint 29's folder has no retro).

**The seat.** The i-th merged sprint (i from 0) seats plank `ORDER[i mod 22]` (`lib/lines-plan.ts`,
unchanged). A seat's holders are the merged sprints that seated it, in ascending order.

**The ghost hull: the originals, as they came out.** For each of the 22 seats:
- if it has a holder, the ghost hull shows that seat's original plank in vellum, numbered by its
  **first** holder, the sprint that took the original out;
- if it has none, the seat is a gap: the original is still sailing, so nothing is drawn there.

A seat replaced twice keeps the older number (Iris, sprint 22 notes, section 5: "B5's ghost hull
keeps the older one"): the sheet on `/` shows the newer sprint, the ghost the first. The ghost hull
is therefore the original ship reassembled from what the crew removed, complete since the 22nd
merged sprint (sprint 23) and fixed from then on, while the sheet on `/` keeps changing. Today: the
ghost numbers seats with sprints 1 to 15 and 17 to 23; the sheet shows 24, 25, 26 and 27 at 5.1,
3.2, 1.1 and 6.0, where the ghost shows 1, 2, 3 and 4. No pencil plank and no gap marker in B5:
pencil is B4's, and at k ≥ 22 the pencil seat's original is already out.

**The words.** The caption: "The ghost hull: the original planks the crew has taken out, each
numbered by the sprint that replaced it." The count line:
- k ≥ 22: "All 22 original planks are out: the last went with sprint {the 22nd merged sprint}."
  and, when k > 22, " Since then the crew has replaced {k − 22} planks of its own." Today: "All 22
  original planks are out: the last went with sprint 23. Since then the crew has replaced 4 planks
  of its own."
- k < 22 (reachable only on fixtures): "{k} of 22 original planks are out. The gaps are the
  {22 − k} still sailing."

**The record at `/log/<n>`: what the retros give today.** From `retro.md`'s public fields and the
cells `/` already publishes:

| Frame's row | B5a | Source |
|---|---|---|
| Rev 13, `/log/13` | yes | `sprint` |
| The title | yes, the goal as `presentGoal` gives it | `goal` |
| Drawn | yes: "Forge", "Pixel", "Iris, Quill"…, as the revision block's cell | `agents` roles |
| Checked | yes: "Lens" or "—" | `lens.runs` / old `lens_*` |
| Tested | yes: "Probe" or "—" | `agents` |
| Approved | yes: "Owner" or "Gate" | `needs-owner` in `outcome`, as on `/` (owner's call 3) |
| Size | yes: "Small", "Medium" or "Large" | `size` |
| Merged, with the pull request | the link in B5a ("Pull request #39"); the time from B5b | `pr`; the merge record |
| Plank | yes, by the rule below | the seat rule |
| What went wrong, in the crew's words | yes, the first three, whole | `wentWrong[].what` |
| Design (Iris's score) | **no** | no retro field. Iris's score sits in `outcome` for 9 sprints, and `outcome` is never shown |
| "Lens: ship, on the first run", "Forge built it" | **no**, the plain names | `fixRounds` and the verbs aren't public fields |

A **Design** row needs a public retro field (`design: { score }`, written at the close-out from
Iris's review), which is `retro.md`'s list and the sprint skill: owner paths. It is proposed in
B5a's retro; once the owner adds it, the row rides the next sprint that touches the record. Sprints
without the field show no row: the record never infers a score.

**The plank's words.** For seat `k.j` (lift k from the deck, 0 to 6; plank j from the stern):
"Lift {k + 1} of 7 from the deck, plank {j + 1} of {the planks in lift k} from the stern." Then, if
it is the seat's first holder: "It replaced an original plank, now in the ghost hull."; otherwise:
"It replaced sprint {the holder before it}'s plank. The original is in the ghost hull, numbered
{the first holder}." Then, if a later holder exists: "Sprint {the next holder} has since replaced
it." Sprint 1: "Lift 6 of 7 from the deck, plank 2 of 3 from the stern. It replaced an original
plank, now in the ghost hull. Sprint 24 has since replaced it." The frame's "Lift 6, plank 1" was
the 0-based id; a visitor counts from 1.

**The dates (B5b).** My recommendation: **a merge record per sprint, written by a crew script
after the merge, read by the build as a file; no network at build.**
- **Why not "a `mergedAt` in each retro, written at the merge":** it can't be written there. The
  retro is in the sprint's PR and is written before the merge; the merge time exists only after it,
  and the crew never pushes to `main`. So the time is recorded afterward, by the next run.
- **The record:** `.crew/sprint/<n>/merge.json`, `{ "pr": 74, "mergedAt": "2026-10-24T03:36:27Z",
  "lines": { "original": 64, "total": 5288 } }`. `.crew/sprint/` is the team's path, so the data
  flows with every sprint. The script that writes it (`.crew/*.mjs`, with its test) and the sprint
  skill's step that runs it at a run's start are the owner's paths, so B5b's PR waits for the owner
  (B5a's retro proposes it, so the owner can see it early). It backfills 1 to 27 once.
- **The source is GitHub's merge, and git agrees with it.** Each sprint's squash commit on `main`
  carries GitHub's merge time as its committer date: in a full clone I listed all 26 (Sprint 13,
  #39, 2026-10-20T00:42:46Z, the frame's "20 Oct 2026, 00:42 UTC"). The script keys on the retro's
  `pr`, not the subject: sprint 14 has two PRs on `main` (#43 and its close-out notes, #44).
- **The gap:** the newest merged sprint has no record until the next sprint's PR merges. The build
  fills it from `HEAD` when `HEAD`'s subject ends in that sprint's "(#pr)" (production's build of
  that merge), with no network. Otherwise the cell is blank (not "—", which the frame uses for
  unmerged rows). Whether Vercel's build has `.git` is unverified: B5b measures it on its preview
  first, and if it hasn't, the blank holds until the next merge.
- **Rejected: GitHub's API at build.** CI and Probe's oracle need a source that is the same at
  every run; a failed or rate-limited call (60 an hour per IP unauthenticated, on shared build
  machines) would blank the column or fail a production deploy; a token is another secret on the
  owner's Vercel. **Rejected: leaving it out**, beyond B5a. The cadence is a fact the executive
  reads: 26 revisions from 13 to 24 Oct.

**The lines (B5b, same record).** "{original} of {total} lines" + "of the site's code are still
original: {original/total, one decimal}%, by git blame on app, components and lib at {the merge
commit, 7 characters}." A line is original when git blame dates it before sprint 1's merge
(46ed7ee, 2026-10-13T23:10:36Z). Measured in a full clone with that rule: **70 of 2,027 at
e6551d3** (the frame's figure, reproduced exactly) and **64 of 5,288 at 0fcb84f** (today's main,
1.2%). It needs full history: this checkout is shallow (52 commits from #19), so the script deepens
the clone first; a Vercel build couldn't compute it, which is why it is recorded, not built.

**Order.** Seats follow sprint number, not merge time, as B1.4 checks today. A sprint that merges
before a lower-numbered one moves seats when the lower one lands: if sprint 29 merges before #75
(sprint 28), 29 seats 4.2 until 28 merges, then 28 takes 4.2 and 29 moves to 0.1. The ghost hull
doesn't move (complete since sprint 23), the sheet changes two labels. Merge order would need the
merge records; not in B5.

## The sprints

### B5a (M): `/log` in 2D, a record per revision, `/sprints` redirected

- **Outcome.** A visitor who follows Log reaches `/log`: the bar (the wordmark home, Work, Log
  current, Contact, Read as page; no control and no Crew), "Log", the ghost hull in 2D vellum with
  its caption and count line, and "Every revision" as a table of every merged sprint, newest first.
  Each revision's number opens `/log/<n>`: the same page with the record beside the table (first in
  the DOM), its pull request, plank and what went wrong; Close and Back return to `/log`. `/sprints`
  answers 308 to `/log`, and every link on the site points at `/log`.
- **Size: M**, at the top of M: a route pair, one drawing variant, a bar variant, and the move of
  `/sprints`' checks. Contract: `b5-first-contract.md`.
- **Who:** Iris's short notes first (the 2D ghost's layout at 390, 1024 and 1440, `--vellum` in both
  schemes, the record's place, the folded table), while Probe writes the checks from the contract;
  then Forge builds; Iris reviews.
- **Checks it adds:** B5.1 to B5.11 in the contract: the route and the bar, the redirect and every
  link, the first screen, the ghost hull and its words, every revision, the records, Back, the
  metadata, the route sweeps on `/log` and a record, LCP text and the framework's script alone, and
  the reader's rules.
- **Live checks:** of `e2e/sprints.spec.ts`'s 60 tests, 7 keep (C12, the reader), 30 are rewritten
  with the same assertions on `/log` and the records, and 23 retire (the old column's look and the
  "no table, no svg" rule); `sprints-entry.spec.ts`'s 5 are rewritten onto `/log`; B2.3 (2), B1.5,
  B1.6 (2), keyboard's Tab-stop test, B2.10, B2.5 and the `ROUTES` sweeps are rewritten for
  `/log`; B1.10's "`/sprints`: Sofia Sans only" retires. The disposition table is in the contract.
- **What the owner decides on its PR:** the retirements (batch F). So the PR waits for the owner.
  They also see the frame's departures: no lines figure or Merged column yet (B5b), the ghost in 2D
  (B5c), no foot link on the phone, and the ghost's caption reworded for k ≥ 22.
- **What the owner sees on the preview:** `/log` at 390 and 1440 in both schemes, a record,
  Back from it, and `/sprints` landing on `/log`.

### B5b (M): the merge record: dates, the lines figure, and the day groups

- **Outcome.** "Every revision" gains the Merged column ("24 Oct", the year only when it isn't the
  current one, Iris's sprint 22 rule), grouped by UTC day with a row header per day; each record
  says "Merged: 24 Oct 2026, 03:36 UTC, pull request #74"; the Log's heading carries the lines
  figure ("64 of 5,288 lines"). The cadence and the ship of Theseus are each one fact on the page.
- **Size: M.** The crew script and its test, the skill's step, 26 backfilled records, and the page.
- **Who:** Forge (script and page), Probe (the oracle reads the merge records), Iris reviews the
  column and the figure.
- **Opens with a measurement:** whether Vercel's build has `.git` for the `HEAD` gap fill.
- **Checks it adds:** each Merged cell and record time against `merge.json` (and the `HEAD` rule);
  blank, never "—", for a merged row without one; the day groups in order with their counts; the
  lines words against the newest record; the column at 1440 keeps every description on its row
  (`/log` doesn't cut); B5a's checks unedited except two rewrites with the same assertions:
  B5.5's six columns become seven, and B5.6's status-word rule (C4.4: no "Merged", "Shipped" or
  "Failed" outside the crew's own words) allows "Merged" as the column's head and the record's
  label and nowhere else. Loosening an assertion is a weakened test under `scope.mjs`, so it is
  the owner's to approve, on a PR that waits for them anyway (Lens's nit on sprint 29).
- **What the owner decides on its PR:** the script and the skill step (owner paths); and whether
  closed sprints get a row (the frame's struck-through 16, "Closed unmerged"): the script can record
  closed sprint PRs, but showing their titles publishes team-written text, which is the owner's
  call (`.crew/sprint/12/` lesson).
- **What the owner sees:** dates and the figure on the preview, and the next sprint's opening run
  writing the previous sprint's record by itself.

### B5c (M): the ghost hull in 3D on `/log`, under Full, Calm and Off

- **Outcome.** On `/log` the card model stands in vellum: the 22 originals, numbered as the 2D
  drawing numbers them, under the motion control, which joins `/log`'s bar. Full opens it with one
  camera move, Calm settled, Off the B5a drawing with no WebGL. A pointer on a plank opens the
  record of the sprint that took it out ("or a plank in the hull", the frame's words); the table
  stays the keyboard's way in.
- **Size: M.** **Who:** Pixel builds it, Forge wires the control into `/log`'s bar, Iris reviews.
- **Shared with B4.4, built once:** B4.4 mounts the model on `/crew`. Whichever of B4.4 and B5c
  comes first writes the model's mount on a second route; the other reuses it. B5c doesn't wait
  for B4.
- **Checks it adds:** vellum planks and numbers equal the 2D rule; draws ≤ 8, triangles ≤ 30k
  desktop and 12k phones, the chunk ≤ 250 kB gzip as B3.6 measures; 0 frames at rest; Off and
  hidden never request the chunk; a pick lands on the right record.
- **Live checks:** B5a's and B5b's unedited on the Off path with WebGL refused; B2.10's baseline
  moves from `/log` to the 404, which loads the same framework files (measured on production:
  `/sprints` and the 404 load the same 5 files, 459,340 B decoded); B2.3 rewritten for the
  control in `/log`'s bar. Lens's nit on #74 rides here if B4.4 hasn't taken it.
- **What the owner sees:** the ghost on their phone and a GPU; it is the archive moment the
  direction's novelty budget allows, and the last of B5.

## Which B5 sprint waits for B4

None. B5a and B5b use the bar component B4.1 will extend: whichever merges second rebases, and if
B5a is first, B4.1's "the bar, everywhere it changes" includes `/log` and its script budget is
counted against `/log`'s, not `/sprints'` (`b4-plan.md` says `/sprints'`; Atlas amends it at
B4.1's contract). The pencil row on `/log`, with "Drawing now", rides B4.2, which builds the pencil
state, and is B4's to check.

## Not in B5

- The pencil row, the rest line, copper and the Crew link: B4's.
- Iris's Design score: waits for a public retro field (owner path), then rides.
- `/`'s revision rows linking to their records: five more Tab stops before Contact
  (`keyboard.spec.ts`'s bound of 15); Iris's call after B5a's demo.
- A share card per record: the records share `/log`'s card.
- Seating by merge order (see "Order").
- Clickable planks in the 2D drawing: the drawing is inert, as on `/` (C9's hard gate); picking is
  B5c's, in 3D.

## Riders B5 carries

- **The roadmap's "group the build log past about 30 entries":** answered above; the day groups
  ship with B5b.
- **"Take C9.5's selector from `ENTRIES`" (Lens's nit, sprint 21):** rides B5a, whose rewrite
  moves C9.5 to the record's list under the spec's own constant.
- **The comments that name `/sprints`** (`app/globals.css`, `app/fonts.ts`, `app/not-found.tsx`,
  `app/layout.tsx`, `components/model.tsx`) ride B5a, and with them Lens's open nit on #67, the
  focus-ring comment in `app/globals.css` that cites the deleted card link: one comment line in a
  file B5a edits.
- **Lens's nit on #74** (`components/model.tsx`, about 3 B): B5c if B4.4 hasn't taken it.
- The facts and fonts riders don't ride: B5 declares no font and touches no fact.
