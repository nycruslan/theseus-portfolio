# Sprint 66: the contract mutant (Probe)

**Outcome: three kept checks go red on the bare change, all of them direct consequences of the
door: K1 (both passes), K6 (`KEEL_LINKS`, all five sizes) and B5.6 (C5.3). They are rewritten at
their strength. No Tab bound and no budget went red. No contract change is needed, so there is no
`decisions.md`.**

## The mutant

A scratch tree of 1e810db with the contract's rule added and nothing else (Probe's scratchpad,
`bare.py`):

- `components/keel.tsx`: after `p.keel-source`, `{rule.n === 1 ? <p data-trials-door=""
  className="keel-door"><a href="/trials" className={LINK}>{`Try to sink ${FIRST_NAME}'s contact
  links`}</a></p> : null}`.
- `components/log.tsx`: after `table.rev-log`, `{record ? null : <p data-trials-door=""
  className="log-door"><a href="/trials">…</a></p>}`, with `FIRST_NAME` imported.
- `app/globals.css`: `.log-door a` added to the selector lists of `.log-start a`'s three rules,
  `.log-door { margin-top: 24px }`, `.keel-door { font-size: var(--step-sm); line-height: 1.5 }`
  and `margin-top: 8px` from 64rem.

I ran the whole unedited suite on it, not just the /crew, /log, keel and keyboard specs:
`PLAYWRIGHT_PREBUILT=1 PLAYWRIGHT_PORT=3361 pnpm exec playwright test --workers=2`. Result: **420
tests, 411 passed, 9 failed, 54.2 minutes.** That's slow because five mutant builds ran beside it
on 4 cores.

## The reds

| Red | What it says | Why it is the door | Rewrite |
|---|---|---|---|
| K1 (the default server's pass), `keel.spec.ts` | `rule 1 … 's links`: 2, expected 1, in GET's HTML and at 1440 and 390, scripts off and on | Rule 1 now holds its source and then the door | Rule 1 holds exactly two links, its source and then `{ href: "/trials", text: "Try to sink Ruslan's contact links" }`; rules 2 to 6 hold one each; `links[0]` is still the source, which K2 reads (kept) |
| K1 (the live fixture's pass) | The same, on the live fixture | The same | The same function, so the same rewrite |
| K6 at 1440 x 900, 1536 x 715, 1024 x 768, 390 x 664 and 320 x 568, both schemes | `keel links …: one source link per rule, and the record line's one (8 in all)`: `keelLinks` reads the door as a second `rule 1` | The door is a link inside `li[data-rule]` | `keelLinks` names a link in `p[data-trials-door]` `the trials door in rule <n>: <href>`, and `KEEL_LINKS` gains exactly one entry for it, `the trials door in rule 1: /trials`, next to the six sources and the record line. The 24 px targets, copper, axe, forced-colours and print clauses passed unchanged |
| B5.6 (C5.3), `log-record.spec.ts` | `links on /log other than the bar's, the record's and the table's`: `["/trials"]` | The door is a /trials link on /log | /trials is allowed only as the door: its words, href exactly `/trials`, inside `p[data-trials-door]`. /log must hold exactly one and every record none. A /trials link anywhere else is still reported as a stray link |

There was one more red, and the door didn't cause it. **B4.51** (`crew-replay.spec.ts`, the replay
sweeps) failed with `clock.pauseAt: Error: Cannot fast-forward to the past`, under a load average
of about 20. Run alone on the same bare build it passed:
`PLAYWRIGHT_PREBUILT=1 PLAYWRIGHT_PORT=3369 pnpm exec playwright test e2e/crew-replay.spec.ts -g
B4.51` gave 1 passed (46.6 s). It is the fake clock under load, not a contract red.

## Expected, and green

- **B4.8** (`crew.spec.ts`) stayed green, as Iris expected. Kept, not rewritten.
- **The Tab bounds** stayed green: `keyboard.spec.ts` (7 of 7), B2.3, B4.13, B5.9 (C10), B5.25,
  H2 and H6. None of them walks as far as either door.
- **The budgets** stayed green and unedited: B4.14 (`/crew`'s script bytes), B5.10 (`/log`'s),
  and every CLS read (K7, K11, B5.9's "Nothing moves").
- **sheet B1.5** and **B1.6** stayed green. Their link lists are on `/`, which has no door.

## The rewrites at their strength

Each rewrite has a comment saying what it pinned before and what it pins now. I checked every one
three ways:

- **Red on main's build** (1e810db, served from a scratch copy): K1, K6 at 1440 and B5.6 (C5.3) all
  fail. Rule 1's second link is missing, the `the trials door in rule 1: /trials` entry is missing,
  and /log has 0 door links where it needs 1.
- **Green on the bare mutant and on Forge's build** (e36612c). On Forge's build, with
  `PLAYWRIGHT_PREBUILT=1`, `keel.spec.ts`, `log-record.spec.ts` and `trials-doors.spec.ts` all
  pass, 30 of 30, the live fixture's K1 included.
- **Red against the contract's mutants:**
  - door under rule 2: K1 and K6 fail;
  - door before the source: K1 fails (`links[0]` is `/trials`, not GitHub);
  - door on every record: B5.6 (C5.3) fails on each record (`the trials door's links … on /log/1`,
    and so on).

## T22 and T23 against the contract's mutants

`e2e/trials-doors.spec.ts` has five tests: T22 for /crew, T22 for /log, T22 "nowhere else", T23
for /crew and T23 for /log.

| Build | Red | Green |
|---|---|---|
| main (1e810db) | T22 /crew, T22 /log, T23 /crew, T23 /log (no door) | T22 nowhere else (a guard: it bites on the record mutant) |
| bare, and Forge's e36612c | none | all 5 |
| door under rule 2 | T22 /crew (its rule, its Tab stop, its focus) | rest |
| door on every record | T22 nowhere else (/log/1, /log/34, /log/65) | rest |
| href `/trials/320x568` | T22 /crew, T22 /log (href, Tab stop, landing) | rest |
| the dare's full stop kept | T22 /crew, T22 /log (words, Tab stop) | rest |
| door before the source (and before the table on /log) | T22 /crew, T22 /log (place, Tab, ring); T23 /log (in the first screen at two windows) | T23 /crew. By construction the moved source sits after the door in DOM order, so T22's placement is the check for this mutant |
