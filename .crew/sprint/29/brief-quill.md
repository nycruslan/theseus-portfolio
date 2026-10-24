# Brief for Quill (sprint 29): B5 as a sequence of sprints, and the first one's contract

**For:** the roadmap. The milestone's next item, B4, waits for the owner: PR #75 (sprint 28, your
`b4-plan.md` and `feed-contract.md`) asks them to build the Studio's feed, and every B4 sprint
builds on that feed, so none can start (`.crew/sprint/28/decisions.md`, 4 and 7). The sprint skill
lets the crew take the next item that neither repeats nor builds on a waiting PR, and B5 ("`/log`
and the ghost hull", `ROADMAP.md`) is that item: it is built from the retros on main, which the site
already reads, not from the Studio. You turn B5 into sprints, as you did B3 (`.crew/sprint/24/b3-plan.md`)
and B4 (`.crew/sprint/28/b4-plan.md`), and you draft the first one's contract so the next run can
start its checks and build at once (`.crew/STATE.md`, "A resumed sprint starts the build at once").

Read first: `ROADMAP.md` (B5, the riders, and the done list's `/sprints` items), `PRODUCT.md`,
`design/brief.md` ("The planks the crew replaced form a ghost hull: the archive, one click deep";
the wayfinding and novelty guardrails), `.crew/STATE.md`, `.crew/sprint/17/direction-iris.md` (the
four material states: vellum = removed; "the ghost hull at `/log`"; the build order), the approved
frames `.crew/sprint/17/design/log-1440.webp` ("The archive: ghost hull and revisions, /log/13")
and `log-390.webp` (the Read tool shows them; `frames.json` has their titles), `.crew/sprint/22/notes-iris.md`
section 5 (the shipwright's order, the plank states, "B5's ghost hull keeps the older one"), 6
(Log → `/sprints`; "B5 moves it to `/log`") and 8 (the Date column: "not in B1"; "B5's Log brings
dates once a crew script records `mergedAt`"; the rule for restoring it), `.crew/sprint/28/b4-plan.md`
("The Date column stays out of B4", "Not in B4": the Date column is B5's with a recorded
`mergedAt`, an owner path; the Crew link and the live row on `/` are B4's), the current build log
`app/sprints/page.tsx`, `components/sprint-entry.tsx`, `lib/sprint-log.ts` (what a retro gives the
page today, and the data rules it enforces), `lib/lines-plan.ts` (`ORDER` and how the planks are
assigned), `components/lines-plan.tsx`, `components/revisions.tsx` and `components/plank-key.tsx`
(the sheet's revision block and legend), `components/bar.tsx` (the Log link today), the live checks
`e2e/sprints.spec.ts` (C1 to C12, 50 tests on `/sprints`), `e2e/sprints-entry.spec.ts`,
`e2e/retros.ts` (the oracle), `e2e/sheet.spec.ts` (B1.5 the revision block, B2.3 the bar),
`e2e/helpers.ts` (`ROUTES`), `e2e/invariants.spec.ts`, `e2e/keyboard.spec.ts` (`tabUntil`'s
bound), `.claude/skills/sprint/retro.md` (what a retro holds and which fields are public), and your
memory.

What is settled, and what is yours to settle from the visitor's side:
- **`/log` replaces `/sprints`.** The direction and Iris's notes say so, and the frames draw it: the
  bar's Log link goes to `/log`, the page is the sheet's own (the bar, the ghost hull, the Log
  heading and its count, "70 of 2,027 lines", "Every revision" as a full revision table, newest
  first, and a record per revision at `/log/<n>`). Say what happens to `/sprints` (a redirect, since
  the share card and the home page's old build-log line pointed there; or kept) and to its
  checks: sort C1 to C12 and `sprints-entry.spec.ts` into keep, rewrite with the same assertions
  on `/log`, and retire, for the owner to approve in that PR, as B1's contract did
  (`.crew/sprint/22/contract.md`). The reader (`lib/sprint-log.ts`, C12) keeps its rules.
- **The ghost hull.** The frame's words: "every plank the crew has taken out, numbered by the sprint
  that replaced it"; "15 of 22 planks are out. The gaps are the 6 originals still sailing, and
  sprint 17's plank, still in pencil." Define it as a data rule from `ORDER` and the retros, word
  for word, since the page and Probe's oracle both implement it: which planks show, in which
  material (vellum, `.crew/sprint/22/notes-iris.md`'s table), what number each carries, and what
  the count line says now (today's record is 1 to 15 and 17 to 28 merged, so k passes 22 at sprint
  24: say what the ghost hull shows for a seat replaced twice, since the direction says it "keeps
  the older one"). Say whether B5's first sprint draws it in 2D only (the sheet's Off path, which
  every visitor gets without WebGL) and which later sprint, if any, gives `/log` the 3D hull under
  Full/Calm/Off, with Pixel. B4.4 puts the hull on `/crew`; don't make B5 wait on it, and don't
  build what B4.4 would rebuild.
- **The Merged column, and `/log/<n>`'s merge time.** Retros hold no dates (your memory, sprint
  22). The sources on offer: a recorded `mergedAt` in each retro, written by a crew script at the
  merge (an owner path: `.crew/*.mjs`, so a proposal in the retro, and the next sprint that waits
  for the owner can carry it); GitHub's public API at build time (`merged_at` on each PR; weigh
  rate limits and a build that must be right for every row every time); or the column left out until
  a source exists, as B1 did. Recommend one, and say what the first sprint ships without it.
- **`/log/<n>`.** The frame shows Drawn, Checked, Tested, Design (Iris's score), Approved, Merged
  with the pull request link, Plank (its seat, and that the original it replaced is in the ghost
  hull), and "What went wrong, in the crew's words". Say which of those the retros can give today
  (`retro.md`: `goal`, `size`, `pr` and `wentWrong.what` are public; Iris's score is in no retro
  field; `outcome` is never shown as status) and which wait for a new retro field (an owner path).
  Say whether `/log/<n>` is a route per sprint (static params from the retros) or the page's own
  panel, and what Back does (the brief: "Back closes what opened").
- **The phone.** `log-390.webp` lists revisions newest first with "Revisions 7 to 1" at the foot.
  The roadmap's rider "group the build log past about 30 entries (Quill)" is yours: say how the
  list pages or groups at 28 sprints and at 60.
- **What is B4's, not B5's.** The pencil row with "Drawing now" in copper, the rest line and the
  Crew link in the bar are B4's (`b4-plan.md`). The first B5 sprint ships without them and without
  a fifth bar link, so it neither repeats nor builds on #75. Say which B5 sprint, if any, must wait
  for B4 to merge, and why.
- **Budgets.** `/log` is a new route, so it takes the route sweeps (axe, tokens, targets, overflow
  at 320, one `main`, no-JS paint, forced colours), LCP as text, and B2.10's script budget (the
  2,048 B `/sprints` meets today). The ghost hull in 2D is SVG in the HTML, like the lines plan.

## Files you own

- `.crew/sprint/29/b5-plan.md`: B5 as S and M sprints in order, each with its outcome in a
  sentence, its size, the visitor-visible checks it adds and the live checks it must keep, rewrite
  or retire, who builds it (Forge; Pixel only for 3D), what the owner decides on its PR, and what
  the owner sees at the demo. Open with what the visitor gets (the executive and the engineer, as
  in `b4-plan.md`), then the data rules (the ghost hull, the record, the dates), then the sprints,
  then what is not in B5 and the riders B5 carries.
- `.crew/sprint/29/b5-first-contract.md`: the first sprint's contract, in the form of
  `.crew/sprint/27/contract.md` or `.crew/sprint/24/b3-first-contract.md`: the outcome in a
  sentence or two, numbered checks a visitor would notice (B5.1, B5.2, …), each grounded in the
  current page or a measurement, the budgets, the live checks it keeps, rewrites or retires, the
  data rules word for word for the page and the oracle, and what's out of scope. The next run
  hands it to Probe and Forge as it stands, so make it buildable in one PR that Lens can review in
  one lane (`.crew/STATE.md`, "Review": split work that would outgrow it).

Don't commit: write the files and report, and Atlas commits them on the sprint branch. The
roadmap is edited at the close-out by Atlas from your plan.

## Report

First line the outcome. Then the two files' paths, the sprint sequence in a few lines, your
recommendation on the dates' source, the decisions you need and from whom, what you couldn't
verify, and your memory lines (at most three, citing `.crew/sprint/29/`) for Atlas to commit. Reply
to Atlas with that; don't paste the files.
