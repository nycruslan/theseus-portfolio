# Sprint 60: the door on the first page

**Goal:** the roadmap's next sprint, Hb (`ROADMAP.md`, "Now: the yard in hand"): `/` opens the yard with one plain link, "Rebuild it yourself", in room made by dropping the legend item that keys nothing on its drawing. Chosen from the roadmap.

**Size:** M. Contract: `.crew/sprint/60/contract.md` (checks H8 to H11, in `e2e/home-door.spec.ts` and the named rewrites). Iris's fit on production: `.crew/sprint/60/fit.md`. Probe's contract mutant and decisions: `.crew/sprint/60/decisions.md`.

## What a visitor sees

- **On `/`**, the revision block's foot row reads "All N revisions in the Log" then **"Rebuild it yourself"**, to `/log/1`, the same address as `/log`'s own link. Same ink, weight, underline and focus ring as the Log link; no arrow, no copper. Tab goes his rules, the Log link, the door, then the case studies.
- **The legend** on `/` and `/read` no longer keys "Original", because neither drawing has an original plank ("22 planks: 22 replaced, 0 original"). It comes back on its own if a drawing ever has one (`planks - replaced > 0`). "Seated by a sprint" always shows; the pencil and copper items are unchanged.
- **The first screen holds.** Contact's links don't move at any window the W checks pin, except the open state at 1410 to 1440 × 900, which drops 7.2 to 7.9 px to exactly the live state's place (874.2 at 1440), as the plan said it would. At 1024 × 1000, 1180 × 1000 and 1280 × 900/1000, live and open rise 23.5 px, since the freed line goes. Off the pins, at 1205 to 1272 wide and 960 tall or more, default, resting and replay drop 23.5 px and stay at least 94 px clear of the fold (accepted, `fit.md` 4.2). "All 58 revisions in the Log" and the door are inside the first screen at 1440 × 900 in every state.

## Decisions

- **It fits (Iris, `fit.md`):** measured on production after #125 in CI's renderer, webfont and fonts blocked, every W pin and a 1 px sweep. The waits-rule in the plan is met.
- **H10's ceiling is the lowest of today's states at each width (Atlas)**, so open may move to live's place and no lower (decisions 6).
- **Two reds the contract didn't name, both contract changes (decisions 4 and 7):** `keyboard.spec.ts`'s forced-colours ring test gave up Tabbing at 25 stops (Contact is now the 26th, so its bound follows B2.3's count), and P17 read `/read`'s wrapping figcaption at 390, which now fits one line, so it reads the same row at 320 × 568.
- **H8's original-plank half is a unit render** of `PlankLegend`, since no fixture draws an original plank beside a legend (decisions 2).
- **Retired, for Lens:** the B2.9 forced-colours rider's swatch half (the Original swatch vs the seated swatch and Canvas on `/` and `/read`). That swatch no longer exists on those pages, because no original plank is drawn there. The rider now reads an original plank's paint on `/log/13` against a seated plank and Canvas, keeps the seated swatch on `/` and `/read`, and checks that neither draws an original plank (decisions 3).
- No Owner's pick: nothing here needs the owner.

## Checks

RESULTS

## Files

`components/plank-key.tsx`, `components/revisions.tsx`, `app/read/page.tsx`; `e2e/home-door.spec.ts` (new), `e2e/keyboard.spec.ts`, `e2e/sheet.spec.ts`, `e2e/live-layer.spec.ts`, `e2e/live-layer.ts`, `e2e/plan.spec.ts`, `e2e/facts-scan.spec.ts`; `.crew/sprint/59/merge.json`, `.crew/sprint/60/`; Iris's, Probe's and Forge's memory (Iris's also brings back two lessons from sprint 59 whose commit was lost with that run's container).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdfsNrnq8xmCj88nBY
