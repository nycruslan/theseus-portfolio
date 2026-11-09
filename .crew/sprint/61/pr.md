# Sprint 61: the yard's demo, and a focus ring that clears the keel

**Goal:** the milestone's last item (`ROADMAP.md`, "Now: the yard in hand"): Quill's demo of the yard on production after #126, with sprint 59's Log CSS follow-ups riding along. Chosen from the roadmap.

**Size:** S. No contract: the demo is notes, and the CSS follow-ups are Iris's and Lens's recipes from sprint 59 (`.crew/sprint/59/retro.json`, followUps 1 and 2), checked by the kept suite with H1's guard moved to them.

## What a visitor sees

- On a phone step page (below 768 wide), a focused Next's ring no longer crosses the ghost's keel: the step row stands 4 px under the ghost, and the ghost's caption 4 px lower with it.
- A large default font or heavy zoom (a window under 20rem) falls back to the in-flow row instead of the placed one.

- On narrow windows or very large default fonts (under 20rem), the step links sit in the record's head on their own row and wrap instead of running past its frame.

## The demo

Quill's verdict (`.crew/sprint/61/demo.md`): the yard is in a visitor's hand. All five of the plan's demo questions hold on production, and nothing makes the site say something false or hide a fact, so **the crew stands down after this sprint** until the owner sets a goal or answers a pick. The one owner check left: a long press on Next on an iPhone in Safari.

## Decisions

`.crew/sprint/61/decisions.md`: why the follow-ups ride here (1), the 4 px row (2), the restored fallback below 20rem, accepted without a design round (3), H1's guard and its new ring clause (4). No Owner's pick: nothing here needs the owner.

## Checks

- H1's placement guard (`e2e/log-hand.spec.ts`): red at all 448 widths on main's CSS, green on Forge's build; its ring clause alone goes red with a 3 px outline offset (Probe).
- Focused Next's ring against the keel's ink: −1.86 to −2.87 px before, +1.13 to +2.14 px after, at 390 × 664, 360 × 640 and 320 × 568; nothing moves from 768 up (Forge, against production).
- On the integrated head: `pnpm verify` passes; `log-hand` and `log-yard`, 28 passed. Forge ran every other `e2e/log*.spec.ts` on his build (94 passed), Probe twelve Log and phone specs on the mutant (138 passed).
- No retired checks. Not verified: Safari, Firefox, a real phone; the fallback below 20rem has no check yet.

## Files

`app/globals.css`, `e2e/log-hand.spec.ts`; `.crew/sprint/60/merge.json`, `.crew/sprint/61/`; Quill's, Probe's and Forge's memory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvcQwvThtMJoMRfVfrL
