# Sprint 66: doors into the trials from Crew and the Log

**Goal:** the roadmap's next sprint, Td (`ROADMAP.md`, "Now: try to sink it"): two plain links
into the trials page, from the keel's first rule on `/crew` and from the foot of the Log's table.
Chosen from the roadmap.

**Size:** S by its decision, with checks T22 to T24 since it rewrites kept checks. Contract:
`.crew/sprint/66/contract.md`. Iris's placement and fit, measured on production:
`.crew/sprint/66/placement.md`. Probe's contract mutant: `.crew/sprint/66/mutant.md`.

## What a visitor sees

- **On `/crew`**, under the keel's rule 1 ("Nothing merges until three checks pass…"), after its
  source line: **"Try to sink Ruslan's contact links"**, to `/trials`, in the source link's own
  style. Tab goes rule 1's source, the door, rule 2's source.
- **On `/log`**, after the Every revision table, the same words to `/trials`, styled as "Rebuild it
  yourself". It is the page's last Tab stop. Not on the records (`/log/N`).
- The words are `/trials`'s own dare without its full stop, so the visitor lands on the sentence
  they clicked. No window is named: naming 320 × 568 would give the answer away (Iris).
- Nothing above either door moves (0.00 px, a 1 px sweep 320 to 1600, both font faces); neither is
  in the first screen at 320 × 568, 390 × 844 or 1440 × 900. Server HTML, 0 B of script.
- `/` doesn't change.

## The contract's checks

| Check | Where | Result |
|---|---|---|
| T22 the doors: place, words, href, class, Tab neighbours, ring, landing | `e2e/trials-doors.spec.ts` | red on main; red on 5 named mutants; green on the build |
| T22 nowhere else: `/`, `/read`, `/log/1`, `/log/34`, `/log/65`, the bar | same | green on main by design; catches the door-on-records mutant |
| T23 the fit: one line, 44 / 24 px targets, no overflow, nothing before it moves, below the fold | same | red on main; green on the build |
| T24 named rewrites | K1 and K6's `KEEL_LINKS` (`e2e/keel.spec.ts`), B5.6 (C5.3) (`e2e/log-record.spec.ts`) | each pins the door exactly where the old check pinned its absence |

The contract mutant (the bare change on the whole unedited suite, 420 tests) turned exactly K1, K6
and B5.6 (C5.3) red, the three named above; B4.51 failed once under load (the fake clock) and passed
alone. No Tab bound and no script-byte budget (B4.14, B5.10) went red, so none is edited. No check is
retired. On the integrated tree: `pnpm verify` exit 0; `trials-doors`, `keel` and `log-record`
specs 30 of 30.

## Decisions

- **The Log door's look (Iris, Atlas):** it joins `.log-start a`'s rules, so the Log's ways out look
  alike, rather than `LINK`'s plain 400 weight.
- **`/log` only, not the records (Iris, Atlas):** a door on every record would change 64 pages.
- **Accepted, not pinned (Iris):** what follows each door moves (rules 2–6 by 44 px below 1024, 32
  from it; `/log` grows 48–68 px); `/crew`'s first screen changes only in windows taller than about
  1,160 px; the Log door is 24.9–25.5 px tall from 1024.

## Not verified

- Forced colours and print on the doors (K6 and B2.9 cover the keel's and the Log's print).
- T23's first-screen read on the live, open and resting fixtures (run on the default server).
- Real Safari and iOS.

## Follow-ups

- The dare is now written in four places (`components/trials.tsx`, `lib/trials-card.ts`, the two
  doors); a shared constant would keep them one (Forge).
- `Log()` reaches Biome's cognitive complexity 16 of 15 (info level) with the door's ternary (Forge).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdUZUy2MFQ5oyR7QYd
