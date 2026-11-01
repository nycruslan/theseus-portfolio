# Sprint 40: who built it, in plain words (Pb)

**Goal** (from the roadmap, milestone "the proof in five seconds", sprint Pb): a visitor can tell
that the names in the revision block are AI agents the owner directs, on `/`, `/crew` and `/log`,
and every sprint's goal from 38 on reads in a visitor's words.

**Size:** M. Contract: `.crew/sprint/40/contract.md` (P8 to P13). Decisions:
`.crew/sprint/40/decisions.md` (1 to 9). Iris's review: `.crew/sprint/40/review-iris.md`.

## What a visitor sees

- **`/`:** one line under the revision table, "Every name is an AI agent Ruslan directs.
  Approved: Gate is CI, his rules and Lens's review; Owner is his own call.", the first sentence in
  ink at 600 (Iris). From one source, `lib/crew-key.ts`, with the first name from `profile.name`.
  It shows at 1280 and up and below 1024; from 1024 to 1279 it stays in the HTML, hidden, because
  nothing fits under the table there without pushing the contact links past a 768 fold
  (decisions 9).
- **`/log`:** the same words replace the old Approved key.
- **`/crew`:** every member's job reads `<word>, AI agent` ("Code, AI agent") in every state and
  after a poll; where the job column folds (phones, and now 1024 to 1439), the panel says "Every
  name is an AI agent Ruslan directs." under the rows (Iris).
- **Riders:** Shift+Space and Meta+Space no longer toggle the replay's pause; the unused
  `crew-block` class is gone; a `#replay` opened in a hidden tab waits until it's seen; the replay's
  transport survives a Strict Mode re-run (Forge proved it under `next dev`: main's code froze at
  moment 1, the fix advances and Pause and Space act); on `/`'s drawing the copper dot now paints
  above the plank number's chip at 1024 and below (Iris, sprint 34).

## Checks

`e2e/plain-words.spec.ts` (Probe), written red first on the contract's head:
- P8 the key on `/` in server HTML, first screen in every feed state at 1440 × 900, contrast,
  not copper, no overflow at 320.
- P9 `/crew`'s seven job cells, scripts off in four states and after a poll.
- P10 `/log`'s key is `/`'s.
- P11 the goals rule over retros 38 on (no milestone code, no URL path, at most 78 characters).
  Green on main by nature: it judges the record, which already holds; its fixtures fail B4e's
  goal and a `/crew` goal.
- P12 the replay's keys, the class and the hidden-tab arrival.
- P13 the dot over the chip, red on main at 768 to 1024 on the live fixture's seat 3.0. The test
  turns on pointer events in-page, since the drawing is `pointer-events: none`, and checks a
  control first.

**Edited existing oracle, for Lens:** `e2e/crew.ts`'s expected job word becomes
`<word>, AI agent`, because the job cell's text changed by design (contract, "Live checks"). It
loosens nothing: the cell is compared exactly, as before. No check is retired or skipped.

RESULTS_PLACEHOLDER

## Decisions the owner may overrule after the merge

None waits for him. The key's words name him by first name (decisions 3); he may change them, or
the plain-words rule for goals, at any time.

## Retro proposal (owner's path)

The goals rule (a visitor's words, no milestone code or URL path, at most 78 characters) lives in
`.crew/STATE.md` and P11 for now; its home is the sprint skill's retro step (`.claude/`), which is
the owner's.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvb2keiVkgcEL87Azq2
