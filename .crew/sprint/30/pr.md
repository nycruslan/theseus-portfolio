## Sprint 30: `/log` in 2D, the ghost hull, and a record per revision (B5a)

**Goal (roadmap):** B5a, the first sprint of B5 "`/log` and the ghost hull", as sprint 29 planned
it (`.crew/sprint/29/b5-plan.md`). `/log` replaces `/sprints`: the ghost hull in 2D vellum (the 22
original planks, each numbered by the first sprint that took it out), "Every revision" as a table
of every merged sprint, a record per revision at `/log/<n>`, and `/sprints` answering 308 to
`/log`. Taken beside #75 (B4's plan, waiting for the owner), since B5 reads the retros on main and
nothing in the Studio (`.crew/sprint/30/decisions.md`, 1 and 2).

**Size:** M, at the top of M. The contract is `.crew/sprint/29/b5-first-contract.md`, checks B5.1 to
B5.11, built to the owner-approved frames `log-1440.webp` and `log-390.webp` and Iris's calls
(`.crew/sprint/30/notes-iris.md`). Iris, Probe and Forge ran from the first minute (decision 3).

## What's in it

- **`/log`** (`app/log/page.tsx`, `components/log.tsx`): the bar (the wordmark as the way home,
  Work and Contact to the sheet's sections, Log current, Read as page; no control, so the motion
  control is now a slot the sheet passes into `components/bar.tsx` and its client chunk never
  reaches `/log`), "Log", the ghost hull, its caption and count line ("All 22 original planks are
  out: the last went with sprint 23. Since then the crew has replaced 5 planks of its own."), and
  "Every revision": the lede, Iris's one-line Approved key, and a table of all 27 merged sprints,
  newest first, with the revision block's own cells (`signatures`, shared from
  `components/revisions.tsx`, so `/` and `/log` can't disagree). Below 640 px the rows fold under
  their number as `/`'s do.
- **The ghost hull** (`lib/lines-plan.ts`'s ghost pass, `lib/hull-layouts.ts`'s `GHOST` layout,
  `components/lines-plan.tsx`): the profile alone at every width, one `path.plank-ghost` per seat
  with a holder, filled with the new `--vellum` token (light `#d7e2e1`, dark `#3f4d52`; set in the
  forced-colours and print blocks too), numbered by the seat's first holder from 768 px, led out
  for 5.0 as on `/`; 5,665 B of HTML; nothing in it focusable or hit. On a record the plank at its
  seat carries `data-current` (an ink edge and a bolder number). Nothing on `/` or `/read`
  changes: their drawings are byte-identical to production's.
- **A record per revision** (`app/log/[n]/page.tsx`, `components/log-record.tsx`): the same page
  with the record open, first in the DOM after the header and beside the table from 1024 px:
  "Rev {n}", the goal, the pairs Drawn, Checked, Tested, Approved, Size, Pull request (linked)
  and Plank ("Lift 6 of 7 from the deck, plank 2 of 3 from the stern. It replaced an original
  plank, now in the ghost hull. Sprint 24 has since replaced it." for sprint 1), "What went wrong,
  in the crew's words" when there are items, and Close, Rev previous and Rev next as plain links.
  Back is the browser's: every page is plain links, no script. Each merged `n` is prerendered;
  `/log/16`, `/log/0`, `/log/999`, `/log/abc` and `/log/013` answer 404 with `noindex` and the
  not-found title.
- **`/sprints` answers 308 to `/log`** (`next.config.ts`); every link on the site points at `/log`
  (the bar, the revision block's "All 27 revisions in the Log", `/read`'s "the Log"); the sitemap
  lists `/`, `/read`, `/log` and the 27 records. `app/sprints/`, `components/sprint-entry.tsx` and
  `components/section.tsx` (only `/sprints` used it) go.
- **Metadata:** `/log` "Log — Ruslan Shulga" with the contract's description; `/log/<n>`
  "Revision {n} — Log — Ruslan Shulga" with the goal; canonical and `og:url`; one `og:image` and
  one `twitter:image` each, the site's card re-exported per segment.
- **Riders:** Lens's sprint 21 nit (C9.5's selector from the spec's own constant) and Lens's nit
  on #67 (the focus-ring comment in `app/globals.css`); the comments naming `/sprints` now say
  `/log`. The roadmap's "group the build log past about 30 entries" is answered by the table
  (about 89 px a row at 390); day groups come with B5b's dates.

**Budgets, measured on Forge's build** (B2.10's method, decoded bytes): `/log`, `/log/13` and the
newest record each load exactly the 404's 5 script files, 458,882 B, +0; `/` with WebGL refused
stays +2,038 B over `/log`, unchanged from sprint 27. First screen: the first row at 504 of 900
at 1440 and 522 of 844 at 390; a record's `h2` at 411 and 436. Two woff2 files on `/log`, Sofia
Sans and Sofia Sans Extra Condensed only.

## Checks

Probe wrote B5.1 to B5.11 first (`e2e/log.spec.ts`, `e2e/log-record.spec.ts`, `e2e/log.ts`, the
oracle in `e2e/retros.ts`), red on today's page (46 of 54 red, the 8 green being C12's seven and
one LCP check that then got its preconditions), and the rewrites with the same assertions:
`log-entry.spec.ts` (C14.1, C14.2, C15), `sheet.spec.ts` (B2.3 both, B1.5, B1.6, B1.10),
`keyboard.spec.ts` (B2.3's 15th stop, B2.9), `invariants.spec.ts` and `content.spec.ts`
(`ROUTES` gains `/log` and `/log/13`), `read.spec.ts` (B2.10's baseline is `/log`),
`plan.spec.ts` (B2.5). Five sweeps that passed on main by accident (a missing `/log` is the 404
page) now assert the route's status first. Forge's first run against them had five reds, all
in the build and fixed (an inherited `text-overflow`, the deck planks' box above the ghost's
viewBox, the folded heads' width); then **157 of 157** on Forge's build (`pnpm test:e2e`) and on
Probe's scratch build of it, and `pnpm verify` green on the integrated head.

## Needs owner decision

**Batch F: 23 tests and two assertions about `/sprints`' old column retire.** C1.2 (no svg,
table, button or details), C6.1 to C6.4 at five widths (15: the hanging number and the column's
rhythm), C7.1 to C7.3 in both schemes (6: the old column's steps, weights and one font; B1.6
holds the link rule on `/log`; C7.3 forbade the frame's drawn record box), C11.2 "only the h2s
rise" (nothing rises on `/log`; B5.9's "nothing animates" is stricter), and the assertions
B1.10's "`/sprints`: Sofia Sans only" and C8.2's "never wraps before a dot". The contract's table
gives each one's reason. Git lists `e2e/sprints.spec.ts` as deleted and `e2e/log.spec.ts` as new
(the rewrite is under git's similarity threshold), which is what `gate` reports; the kept C12
tests and the 30 rewrites are in `log.spec.ts` and `log-record.spec.ts` with their C-numbers in
their titles. Without F, `/sprints` would have to stay beside `/log`.

**On the preview, against the approved frames:** `/log` and a record at 390 and 1440 in both
schemes, Back from a record, and an old `/sprints` link landing on `/log`. Visible departures,
all planned: no lines figure or Merged column yet (B5b's merge record), the ghost in 2D (B5c's
3D), the ghost's caption and count reworded for a hull with no gaps (complete since sprint 23),
no "Revisions 7 to 1" foot link on the phone (every row is in the HTML), and no pencil row, rest
line or Crew link (B4's). One edge: an unknown record's 404 is this Next version's error shell
filled in by the browser, so with scripts off `/log/999` is blank (status 404 and `noindex` are
right, and `/log` itself renders whole without scripts).

## Lens

**Ship** on a8aba55, no fix round, two nits riding with the next sprint that touches `/log`: three
comments (`next.config.ts`, `lib/sprint-log.ts`, `app/layout.tsx`) still say nothing reads the
sprint folders at request time, while an unknown record address now runs `readSprintLog()` on the
server, so the retros must stay traced into the function; and two stale memory lines. Iris:
**ship, 8.2/10** (`.crew/sprint/30/review-iris.md`; her paragraph for the owner is in it under
"For the owner"). The close-out after Lens's ship touches notes only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01KCWSxukjp84wYxdBC9p25s
