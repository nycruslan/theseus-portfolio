## Sprint 83 (S): the rest line names the sprint that merged

**Goal** (from the roadmap's stand-down defect condition): after sprint 82 merged, production's
`/` and `/crew` read "Crew resting. Sprint 32 merged." and "Replay sprint 32". The Studio's live
feed named the wrong sprint beside PR #159, and the site repeated it. The site should never state a
sprint number its own record contradicts.

**Size:** S. **Decisions:** `.crew/sprint/83/decisions.md`.

### The change

- `lib/crew-feed.ts`: `sprintOf` checks the feed's number against the build's record before the
  run's rules read it. A run whose PR the record holds is that sprint; a number the record has
  under another PR becomes none ("Crew resting.", no replay, no pencil). Only a PR the site would
  link counts. Pages and `/api/crew` both go through `readCrew`, so the browser's poll tells the
  same number.
- `/api/crew` now reads the record at request time; its traced files include the retros and merge
  records (`route.js.nft.json`: 174 → 356 files). Two "why" comments name it
  (`lib/sprint-log.ts`, `next.config.ts`).
- Riding along: sprint 82's merge record, written by this run's pre-flight; Forge's memory.

### Results

- A stub feed serving production's saved `/api/crew` answer, against `next start` builds:
  - base: `/api/crew` 32, "Crew resting. Sprint 32 merged.", "Replay sprint 32" (production's defect);
  - this branch: `/api/crew` 82, "Crew resting. Sprint 82 merged.", "Replay sprint 82" on `/` and
    `/crew`; a browser poll on `/crew` kept 82 and the replay played;
  - an unknown PR with merged number 32: "Crew resting." with no number or replay; a live run
    numbered 32 with PR #160: no pencil row.
- `pnpm verify` passes. 20 live-layer and crew specs: 138 passed. Client chunks are unchanged
  (26 files, same names and sizes).
- No check is retired or added (decisions 5). No owner path or `content/` is touched.

### Left open

- A live run before its PR opens can't be checked, so a merged number from the feed still draws a
  pencil for those minutes (decisions 4).
- The Studio's numbering itself, outside this repository (decisions 2).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaDiC1o3eqLv1b9zzU
