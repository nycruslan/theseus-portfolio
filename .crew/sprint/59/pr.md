# Sprint 59: the yard in a phone's hand

**Goal:** the roadmap's next sprint, Ha (`ROADMAP.md`, "Now: the yard in hand"): on a phone, the step link sits in the first screen on every step and mode; `/log` invites the visitor to rebuild the ship; a step page says a step can be held; the stop at 45 says why. Chosen from the roadmap.

**Size:** M. Contract: `.crew/sprint/58/first-contract.md` (checks H1 to H7, in `e2e/log-hand.spec.ts`). Iris's placement and words: `.crew/sprint/59/placement.md`. Probe's contract mutant and decisions: `.crew/sprint/59/decisions.md`.

## What a visitor sees

- **On a phone**, below 768, the step row (Previous / Next) sits right under the ghost, at the same height on every step, with scripts on or off. The link to press is at 379–423 px at 390 × 664 (was 639–742, cut or below the fold), 367–411 at 360 × 640 and 351–395 at 320 × 568. In the DOM the links stay in the record's head, so reading and Tab order are unchanged. From 768 up the drawings and step links don't move; inside the record, its h2 and what follows sit 18 px lower for the hint's held line on every step page, and on `/log/45` the chapter line moves the record about 39 px. Nothing on `/` changes.
- **`/log`'s link** reads "Rebuild it yourself" (was "Start again from sprint 1"): same target, place and Tab order.
- **The hint** "Hold to flip through the sprints" shows on step pages only while the yard plays (Full and Calm), keyed by CSS with no script; its line is held in every mode and only `visibility` changes, so CLS stays 0. Hidden with Off, WebGL refused, Save-Data or scripts off. Not focusable, no link.
- **The chapter line** on `/log/45` (every 22nd merge from 44): "Every plank up to sprint 23 is out too.", from `chapterLine(k, merged)` in `lib/count-line.ts`, in `.log-head` after the count line. With the model playing it lands with the plank, as the question does (`lib/model/yard.ts`'s question selector takes `[data-yard-chapter]`).

## Decisions

- **Placement (Iris, option b):** the row under the ghost. The h1's row fails at 320 (234 px free against 247–263 needed); moving the lines figure fails 360 × 640 and 320 × 568; a fixed bottom bar covers 60 of 568 px on every scroll. Under the ghost, everything above the row is identical on every page, so the row never moves between steps.
- **The words (Iris):** "Rebuild it yourself" (the door's words; "from sprint 1" pushed the hand-off to its own row at 1024–1030); the chapter line shortened from Quill's 51 characters to 38, since "up to" states the rule exactly.
- **The chapter line lands with the plank (Atlas):** +21 B decoded, +11 B gzip on the 3D chunk.
- No kept check is rewritten or retired: on a bare mutant of the placement the kept Log suite and its neighbours ran 195 passed, 10 skipped (the usual base-URL skips), 1 red, B5.24's touch drag on `/log` (not a step page), which passed alone and reads as machine load (decisions 2).
- No Owner's pick: nothing here needs the owner.

## Checks

- `e2e/log-hand.spec.ts`: 16 tests; on main 14 red, 2 green (H5 and H7, which pin what must not move and the bytes). On the build: 16 of 16 (1.9 min on 2 workers here).
- Kept: every `e2e/log*.spec.ts`, keyboard, keel-ways, read and invariants on Forge's build: 159 of 159.
- `pnpm verify` passes on the integrated head.
- Budgets: loader 0 B decoded (B2.10 and B5.10 unedited); WebGL-refused `/log/13` 138,635 B of script, −1 B; 3D chunk 167,244 B gzip -9, +11 B (B3.6, B5.23); CSS +160 B gzip. CLS 0 (H3 at 320, 390 and 1440). B5.7's tenth row (`/log/49`) keeps 37.5 px spare at 390 × 844.
- Not verified: Safari, Firefox or a real phone (Chromium at these sizes), landscape phones, a GPU; CI's shards on dc57c5c: 2/4 15 min 35 s, 3/4 16 min 38 s, 1/4 9 min 23 s, 4/4 4 min 45 s, all under 20.

## Review

- **Lens: ship** on dc57c5c, no Important findings, four nits (after one re-run: the first job died installing Bun on 504s). The PR text's overstatement is fixed here; the CSS scope and comment nits ride along with the next sprint that touches the Log CSS.
- **Iris: ship, 8.0/10** (advice, posted on the PR). Follow-ups: lower the phone step row 4 px so a focused Next's ring clears the keel line; keep the step links' numbers in step with the caption during a press and a riffle.

## Files

`components/log.tsx`, `components/log-record.tsx`, `lib/count-line.ts`, `lib/model/yard.ts`, `app/globals.css`; `e2e/log-hand.spec.ts`, `e2e/log.ts`; `.crew/sprint/58/merge.json`, `.crew/sprint/59/`; Iris's, Probe's and Forge's memory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvZG5nceJeVowFntCVz
