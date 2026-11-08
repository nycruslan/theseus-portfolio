# Sprint 57: Ye, the door from the front page

**Goal:** the roadmap's next sprint, Ye (S): one plain link on `/`'s revision block opens the yard at its first step, only if it fits from 320 to 1440 (`.crew/sprint/52/plan.md`, "Ye"). Chosen from the roadmap.

**Size:** S. **Outcome: it doesn't fit, so Ye waits and the milestone closes without it.** Notes only; no product code, spec, owner path or `content/` changes.

## What Iris measured

Iris injected "Rebuild it yourself" into production's `/` in CI's renderer (`@playwright/test` 1.64.0, Chromium 156), in the live, open, default, resting and replay states, cross-checked in Chrome 153 and on the fallback face (`.crew/sprint/57/door-iris.md`):

- The count line has about 0 px of room at some width in every state (651, 768, 892, 1203, 1408), so any door adds a line somewhere.
- Where the contact links wait at the block's foot, that line moves them 6.8 to 23.5 px: 0.95 px above the fold at 1428 × 900 at rest, and below it at 1432 to 1440 × 900 on the fallback face.
- 320, 390 × 844 and 1024 × 768 don't move. The kept checks (W1 to W17, B4.22, P3, P8) would have passed; the first screen real visitors get wouldn't have.
- In the Log link's place it fits, but it hands the first reader's link and the "55 revisions" count to the toy. "Rebuild it" alone reads as steering the crew.

## Decisions

In `.crew/sprint/57/decisions.md`. The way to make room (drop the legend's "Original" item while `/` draws no original plank; measured, the door then moves nothing at 1280 to 1440 × 900) is its own contract, so it goes to Quill with the yard's demo. `ROADMAP.md` closes the yard and has the next run start with that demo and the next milestone's plan.

## Checks

- `pnpm verify`: pass. `e2e/plain-words.spec.ts` (P11, the retro's goal): 13 passed.
- No contract, so no Y25 to Y27; no check retired.

## Files

`.crew/sprint/56/merge.json` (the merge record), `.crew/sprint/57/` (Iris's call, decisions, retro), `ROADMAP.md`, and Iris's memory (`.claude/agent-memory/design-director/`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbDiiJN1j93gxNf9Ca
