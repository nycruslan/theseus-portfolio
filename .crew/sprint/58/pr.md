# Sprint 58: the yard's demo, and the next milestone's plan

**Goal:** the roadmap's next job: Quill judges the yard on production as a visitor at its demo, and plans the next milestone from what it shows (`ROADMAP.md`, "Finished: the yard, then stand down"). Chosen from the roadmap.

**Size:** S, notes only. No product code, spec, owner path or `content/` changes.

## What the demo showed

Quill played the yard on https://theseus-portfolio.vercel.app on 2026-11-09 (`.crew/sprint/58/close.md`). The custom domain refused the sandbox, so it wasn't read.

- **It tells the truth and plays as built:** the count lines, captions and the question on 23 match the rule on every step read; press, Calm, Off, hold-to-riffle (stops at 23, 45, 57), Home, End and the no-script walk work; the six cards fetched answer 200; `/` is unchanged; no console errors. The yard's specs against production: 37 of 38 passed; the one red (Y10 on `/log/57`, the image alt's date) needs sprint 57's merge record, which this PR carries.
- **It isn't yet in a visitor's hand:** on a phone the step link is cut or below the fold (390 × 664 on every step read, 360 × 640 and 320 × 568 on every step, with scripts on and off), so a shared link opens on the question with nothing to press; Y5 only pinned 390 × 844. `/log` doesn't say it can be played, nothing says a step can be held, and the riffle's stop at 45 says nothing.
- Nothing the site says is false.

## Decisions

- **The next milestone is "the yard in hand"** (`.crew/sprint/58/plan.md`): Ha (M), the step link in a phone's first screen on every step and mode, an invitation on `/log`, a hold hint keyed by CSS, and a line at 45 (contract `first-contract.md`, H1 to H7, 0 B of loader, CLS 0, nothing on `/`); then Hb (M), the door on `/`, in room made by showing the legend's "Original" item only while an original plank is drawn, its contract written after Ha merges and dropped if the contact links move. Then the crew stands down.
- Left out, with reasons in `close.md`: the fleet at 45, fix rounds as bounces, sound.
- No Owner's pick: nothing here needs the owner. His open calls (the direction, the tally at 23, #101's pick) are unchanged.

## Checks

- `pnpm verify` on the head (the retro is read at build).
- Not verified: Safari, Firefox or a real phone (Chromium at those sizes), a GPU, the custom domain.

## Files

`.crew/sprint/57/merge.json` (the merge record), `.crew/sprint/58/` (close, plan, contract, retro, this body), `ROADMAP.md`, and Quill's memory.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvaWuYVFGa5QMkAgP4d
