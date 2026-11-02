# Sprint 48: Kb, the ways in and the record behind it (Atlas)

Branch `sprint/48-keel-ways-in`, from `origin/main` at 2d3aab0. The plan is
`.crew/sprint/46/plan.md`'s Kb section; Ka's keel is `components/keel.tsx`, anchored at
`h2#keel` in `section[aria-labelledby="keel"]`.

## The outcome

A hiring executive who reads "his rules" on `/`, or "Ruslan Shulga's rules" in `/crew`'s Approval
line, follows it to the keel in one click and lands with the heading in view. Beside the rules, one
line says how the crew's merged sprints were approved, the same counts `/log` shows.

Size: S in the plan, run as M because kept checks need rewrites (Probe writes them first).

## Checks

- **K9 From `/`:** in the key's second sentence (`components/revisions.tsx`, `CREW_APPROVED`),
  "his rules" is a link to `/crew#keel`, server HTML, with scripts on and off. Wherever else the
  key's second sentence renders, the same. Rewritten with the same strength, named in the PR:
  - P8 (`plain-words.spec.ts:212`): "no a, button or [tabindex]" becomes "exactly one a, to
    `/crew#keel`, reading `his rules`, and no button or [tabindex]".
  - B2.3 (`keyboard.spec.ts:491`): 24 stops become 25, `/crew#keel` after the title block's three
    links and before the revisions' Log link (Probe reads the DOM order and fixes the list to it).
  - `live-layer.spec.ts:1628–1655`: the Log link and the live `/crew` link keep their exact places,
    counted with `/crew#keel` in its one exact place.
  - P10 runs unedited.
- **K10 From `/crew`'s panel:** Approval's "Ruslan Shulga's rules" (each state that says it, in
  `components/crew.tsx`'s `approval`) is a link to `#keel`, styled as the panel's other links.
  B4.8's allowlist already allows `#…`; it runs unedited. `/crew`'s script budgets
  (`crew.spec.ts` near `:1396`, `:1402`) run unedited; bytes before and after are reported.
- **K11 It lands:** following the link from `/` to `/crew#keel` at 1440 × 900, 1536 × 715 and
  390 × 664 puts the keel's `h2` wholly in view, below the bar, with scripts on and off, CLS 0.
  The same from the Approval link on `/crew`, scripts on.
- **K12 The record behind the rules:** one line in the keel, after its lead and before the rules:
  "N sprints merged: G on the checks alone, O on Ruslan's own call." N = G + O, from the retros by
  `lib/sprint-log.ts`'s `ownersCall` (O counts it true), equal to `/log`'s Gate and Owner counts.
  Server HTML in every feed state, full opacity, nothing copper. Counts in numerals; singular
  "sprint" when N is 1 is out of scope (it isn't).

## Riding along (Lens's nits on #110)

- `LINK` moves out of `components/crew.tsx` into its own small module that `crew.tsx` and
  `keel.tsx` import, so the panel module stays client-only.
- `app/globals.css` near 3559: the comment says by spec a sticky grid item's range is its grid
  area, Chromium uses the grid container, so K7 can't tell the two-row span from one row.

## Budgets

| Budget | Check |
|---|---|
| 0 B of new script on `/` | B2.10, unedited |
| `/crew` within its script budgets | `crew.spec.ts`, `crew-replay.spec.ts`, `crew-live.spec.ts` budgets, unedited |
| `/`'s first window unchanged | W1 to W17, B4.22, P8's first-screen pass, unedited |
| Nothing new is copper | B1.6, K6, P8's paint pass |
| CI under 35 minutes | reported |

## Out of scope

Changing any rule or owner path; `content/`; the keel in `/llms.txt`, `/api/me.json` or the card;
moving the key's line (if it must move, stop: it becomes Iris's call).
