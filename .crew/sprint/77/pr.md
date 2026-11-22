## Sprint 77 (S): a Log record opens with its heading on a short screen

**Goal** (from the roadmap's stand-down and sprint 76's follow-up, chosen by Atlas): a visitor who
opens a Log record on a short screen sees the sprint's goal, the record's heading, without
scrolling.

On production (2026-11-19), every one of the 75 records opened with its heading below the fold at
320 × 568, 360 × 640, 375 × 667 (iPhone SE and 8), 900 × 700 and 1023 × 768. At 1023 × 768 the
first screen was the h1 and two full-width drawings. Taller phones, tablets and desktops held.

**Size:** S. **Contract:** `.crew/sprint/77/contract.md` (T37). **Placement:** Iris's
`.crew/sprint/77/placement.md`. **Decisions:** `.crew/sprint/77/decisions.md`.

### What changed (`app/globals.css` only; no DOM or Tab-order change)

On a record (`.log-open`), below 1024 wide and under 60rem tall:
- the ghost's caption and the count line follow the record, ahead of the lines figure, which gets
  its rule back; the question or chapter line stays under the drawings;
- from 768 to 1023 the two drawings cap their width to the window's height (800 px at 1023 × 768,
  736 at 900 × 700, never under 46rem);
- below 22.5rem the goal is `--step-xl` (24 px, from 30), and below 768 the rev line's
  line-height is 1.

Tall windows (60rem and up), `/log` without a record, and everything from 1024 wide are unchanged.

### Results

- **T37** (`e2e/log-fold.spec.ts`, Probe): red on main at the five short windows (75 of 75 records
  each), green at 390 × 844, 1024 × 768 and 1440 × 900; on this head 8 of 8 pass. Least spare
  under the goal: 5.1 px at 360 × 640 (/log/4), 5.9 at 320 × 568, 26.4 at 375 × 667, 30.5 at
  900 × 700, 69.8 at 1023 × 768.
- **Exceptions in the contract** (decisions 2 and 3): at 320 × 568 the question's step (/log/23)
  and the chapter steps (/log/45, /log/67), whose question or chapter line H1 keeps above the
  record, need their goal only to start in view; it starts at 524 px.
- **Nothing else moves** (Forge's box diff against the base): 0 boxes on /log/40, /log/76 and /log
  at 1024 × 768, 1440 × 900, 768 × 1024, 390 × 1000, 1023 × 960 and 820 × 1180, and on /log at every
  short window; scripts on and off. CLS 0 in Full, load to rest and on a press of Next.
- **Kept suite:** Forge's full run, 474 of 476 passed: T37's old spec (since amended) and T29 on
  /evals (passed on rerun on base and change; this CSS can't reach /evals). Atlas, on this head:
  `pnpm verify` exit 0; T37 with H1 to H5, 24 of 24.
- **Iris:** Verdict ship, 7.9/10, no changes. Her optional `100vh` fallback isn't taken (decision
  4: biome's duplicate-property rule, and every browser Next 16 supports reads `svh`).

No check retired, no owner path, nothing in `content/`, no Owner's pick.

**Not verified:** Safari, Firefox and real phones, including the height gate under iPadOS's
toolbar.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvbReZ7oo11XpT1e6Sr
