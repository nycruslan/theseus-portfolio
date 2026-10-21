## Goal

"Watch the team build": a log of the team's sprints at `/sprints`, built at build time from
`.crew/sprint/*/retro.json`, so visitors see the process and not only the result. Chosen from the
roadmap (its top open item, which Quill named next in sprint 11).

## Size

L, contract step. No product code, no `e2e/` change. The owner accepts the contract by merging this
PR; the build is sprints 13 (PR A, M: reader, route, sitemap) and 14 (PR B, S: the way in from `/`).

## What's here

- `.crew/sprint/12/brief.md`: the plan.
- `.crew/sprint/12/direction-iris.md`: Iris's direction, prototyped on a build fed by all eleven
  real retros at 1440/1024/390/320 in both schemes (no horizontal scroll, 24 px PR links). Own route
  `/sprints`, newest first by the numeric `sprint` field, each entry shaped like an Experience entry:
  goal as heading, sprint number hung in the margin from 768 px, size, "Owner's call" mark, PR link,
  every "what went wrong" item with the Stack's 3 px dot. Never a dashboard.
- `.crew/sprint/12/contract.md`: Quill's contract, C1–C15, data rules for both retro shapes, the
  existing guards and what they don't cover on a new route, the PR split, risks.

## Decisions

- **No status word.** A retro's `outcome` is written before its PR merges and is false for sprints 1–2
  (they say "not merged"; both are on main). Iris found it; the page never prints `outcome`.
- **"Owner's call" from data**, not a list of numbers: `outcome` matches `/\bneeds-owner\b/i`. Atlas
  checked it against all eleven retros: true for 1, 2, 7, 9, 10, false for the rest, as the direction
  wants.
- **Counts come from the files.** No check hard-codes 11; the page's count and the files must agree.
- **A malformed retro fails the build** (Quill, against Iris's "skip it"): CI builds every PR, so a bad
  retro is caught before it merges instead of silently shrinking the public count.

## Needs owner decision

Merging accepts the contract's "Needs owner decision" section (`contract.md`, last section):
1. The name "Build log" and Iris's lede (team copy on a public page that names you).
2. The way in: a copper "Build log · N sprints" line under your bio (recommended), or a footer line.
3. What gets published: every retro's `wentWrong` text verbatim, past and future, with no review of
   that text (close-out pushes are notes-only, so Lens keeps its last ship). Sprints 1–2 mention your
   placeholder content holding the team back. A proposal for `lens.yml` to review retro diffs as copy
   is in the retro, since that file is yours.
4. A malformed retro fails the build rather than being skipped.
5. The "Owner's call" rule above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Ka3GfgcEYhwGnhffZKWj4C
