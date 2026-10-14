---
name: Sprint 2 dark-theme direction
description: Dark values I set for item 2 (dark mode), what I tried and rejected, and the computed ratios. Use it when reviewing sprint 2 and any later dark work.
type: project
---
Dark: bg #091413, fg #e1eae9, muted #96a9a6 (all unchanged), accent #eb8a64 oklch(73% 0.13 42)
(was #e79d73 h50), rule #2d4543 oklch(37% 0.03 189) (was #283635). Light unchanged.
Computed: fg 15.30, muted 7.60, accent 7.45 (lowest margin vs the 7:1 floor), fg/rule 8.39, rule/bg 1.82.
Also: `color-scheme: light dark` in base :root plus viewport colorScheme, and theme-color per scheme
equal to --background (#e6f3f1 / #091413). No dark-specific ::selection; the raised rule does it.

Rejected:
- Accent h40 (#e78c6d): goes salmon-pink. h42 L74 (#ef8d67): looks the same as L73, so take the lower L
  (more metal, less fruit).
- fg at oklch 91% (#dae4e2) for less glare: no visible difference at 390 or 1440, so no change.
- Old dark rule (1.49:1) for selection: a dull grey band. 1.82 reads as verdigris.

**Why:** "tune the hull, not replace it". Only change values a render showed were wrong.
**How to apply:** in review, check the accent at 16 px reads copper and not peach, selection is visible
across a link, the scrollbar is dark, and light shows no pixel change (contract C7). Owner hasn't
reacted to any of this yet.
Tooling: Quill's contract (sprint 2) pins C1-C8. The guard blocks `node $VAR/script` and
`kill $(cat pidfile)`, so use literal paths and a literal PID.
