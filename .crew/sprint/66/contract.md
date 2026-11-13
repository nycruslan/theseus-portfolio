# Sprint 66 contract: Td, the doors into the trials (Atlas)

**The outcome.** A visitor who has just read the crew's first rule on `/crew` ("Nothing merges
until three checks pass…"), or who reaches the foot of the Log's table, finds one plain link that
dares them to test the site themselves: "Try to sink Ruslan's contact links", to `/trials`. Nothing
above either door moves, and `/` doesn't change.

The plan's Td (`.crew/sprint/62/plan.md`). Size **S** by its decision, with checks **T22 to T24**
because it rewrites kept checks. Iris's `placement.md` beside this file settles the place, words,
classes and fit; the numbers below are hers, measured on production at 530a8e6. No owner path, no
`content/`, no owner answer needed.

Goal, as `/` prints it: "Doors into the trials from Crew and the Log" (43).

## The rule, word for word (to Forge and Probe alike)

- **Words, both doors:** `` `Try to sink ${FIRST_NAME}'s contact links` `` (`lib/crew-key.ts`),
  `/trials`'s own dare (`p.trials-dare`) without its full stop. **href, both:** `/trials`.
- **/crew:** the last child of `li[data-rule="1"]`, after `p.keel-source`, rendered only when
  `rule.n === 1`: `<p data-trials-door="" className="keel-door"><a href="/trials" className={LINK}>`,
  `LINK` from `components/crew-link.ts` word for word. `.keel-door` in `app/globals.css`:
  `.keel-source`'s type without its indent, 8 px top margin from 1024 (`placement.md`).
- **/log:** the last child of `section.log-revs`, after `table.rev-log`, on `/log` only (not on
  `/log/N`, as `.log-start`'s `record ? null : …`): `<p data-trials-door="" className="log-door"><a
  href="/trials">`. `.log-door a` joins the selector lists of `.log-start a`'s rules, so it looks as
  "Rebuild it yourself" does; `.log-door { margin-top: 24px }`.
- Server HTML only: no `"use client"`, no script.

## The checks

- **T22 The doors.** On `/crew` and `/log`, at 320, 390, 768, 1024 and 1440, both schemes:
  exactly one `[data-trials-door] a` per page, reading exactly "Try to sink Ruslan's contact
  links", href exactly `/trials`; on `/crew` inside `li[data-rule="1"]` after its source link, and
  its class attribute equal to that source link's; on `/log` after `table.rev-log` inside
  `section.log-revs`. No such door on `/`, `/read`, any `/log/N` sampled (first, a middle one,
  last), or in the bar. Following each lands on `/trials` with a 200 and its h1. Tab reaches the
  `/crew` door right after rule 1's source link and right before rule 2's; on `/log` right after
  the last Rev link, as the last stop in `main`. One 2 px ink focus ring, never `--accent`.
- **T23 The fit.** At the widths above, webfont and fonts blocked: each door one line; at least
  44 px tall below 1024 and 24 × 24 from it; no horizontal overflow on either page; every element
  before the door in DOM order within 0.5 px of where it sits with the door removed; neither door
  inside the first screen at 320 × 568, 390 × 844 or 1440 × 900.
- **T24 The named rewrites, at their strength, and the budgets.** Each rewrite says what it pinned
  and pins the new truth as tightly; Probe names them from the contract mutant below. Iris expects:
  K1 (rule 1 now holds its source and then the door), K6's `KEEL_LINKS` (an entry for the door),
  B5.6 (C5.3) (`/trials` allowed on `/log` only, exactly once), and any Tab bound on `/crew` or
  `/log` the door lengthens. B4.8 should need none (it allows site paths). `/crew`'s and `/log`'s
  script bytes unchanged (the existing budget checks, unedited).

  Before the build, Probe runs the unedited suite's `/crew`, `/log` and keel specs on a scratch build
  with a bare version of the change and names every red in `mutant.md`. A red not named there is a
  contract change, recorded in `decisions.md`. The new checks are proven red on main, and against
  mutants that put the door under rule 2, on a record, to `/trials/320x568`, with the full stop,
  or before the source.

## Budgets

| Budget | Limit | Check |
|---|---|---|
| Script on `/crew`, `/log` | 0 B added | the existing byte checks, unedited |
| CLS | 0 | the existing checks; the doors are in the first paint |
| Above each door | 0.5 px | T23 |
| CI | each shard inside its 30 minutes | Probe reads the slowest shard |

## Out of scope, and accepted

- Accepted (Iris): everything after each door moves (rules 2–6 by 44 px below 1024, 32 from it;
  `/log` grows 68 / 48–50 px); `/crew`'s first screen changes only in windows taller than about
  1,160 px; the Log door is 24.9–25.5 px tall from 1024.
- A door on `/`, `/read`, the records or the bar; the trials page itself; Tc's and Tb's open items
  (they ride with the next sprint on the trials' code); owner paths and `content/`.
