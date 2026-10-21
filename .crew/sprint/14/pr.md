## Goal

"Watch the team build", PR B: the copper "Build log · N sprints" line under the bio on `/`, linking to
`/sprints` (from the roadmap). **Size: S.** The owner accepted the location (under the bio, not a
footer) by merging #37.

## Contract

`.crew/sprint/12/contract.md`, "PR B: the way in" (C14.1–C14.6, C15). Brief: `.crew/sprint/14/brief.md`.

## Results

- Probe's `e2e/sprints-entry.spec.ts` (10 tests) was pushed first, red on 1ede503 (no home line); 10
  mutants against a reference build, all caught (`.crew/sprint/14/specs-probe.md`).
- Forge's build (4eb83e7): `pnpm verify` passes; `pnpm test:e2e` 130 passed, 1 skipped (the existing
  `content.spec.ts` fixme), in the cloud's Chromium 141. CI's 156 is the real readout.
- At 390 x 844 the hull's top moves from 537.98 px to about 581, still above the fold (C14.4).
- Riders from sprint 13: the meta line's dots have their own `mx-1`, so the PR link's ring clears them
  (Iris item 1); `lib/sprint-log.ts`'s comment now says only `readdirSync` carries `turbopackIgnore`;
  repeated "What went wrong" items no longer share a key.

## Review

- Lens: ship on 04b5cdb (one nit, the `lib/sprint-log.ts` comment, fixed) and ship on 9f5ee4c (one nit:
  the spec's raw U+00A0, a follow-up for Probe).
- Iris (advice): changes at 7.5, better than production. Her finding 1, that the home link's ring touched
  its dot, was fixed in 1c9d506 with the same `mx-1` span (`.crew/sprint/14/review-iris.md`).
- One fix round. Retro: `.crew/sprint/14/retro.json`.

## Not verified

The `1 sprint` and no-retro branches of the home line: the checkout has 13 retros and no spec rebuilds
the site (the reader is covered on fixtures by C12).

Production itself (the sandbox can't reach it; a build of `origin/main` stood in for Iris).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01R8SVKwperPfaifwNv2zP75
