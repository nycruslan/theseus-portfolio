---
name: Sprint 2 review (PR #12, dark mode)
description: My scores and verdict on sprint 2 at 2a33b48, what I accepted, what I'd watch, and the open owner questions.
type: project
---
Verdict: changes 6.8/10 (DQ 7, Orig 6, Craft 7, Func 8). Better than prod (main 03cff89 stood in).
The only reasons are outside the sprint: the placeholder gate (owner content) and the 7.0 bar while
layout is out of scope. I asked for no code change.

Accepted: my own direction values as built. Light was 0 differing pixels vs main at 320, 390, 1024 and
1440. Dark changed only the copper glyphs. axe found 0 violations of any impact in both schemes, and
the detector found nothing.

Watch:
- At step-lg (the project title), #eb8a64 leans coral. In item 3, judge it at card-title size, and
  prefer titles in foreground with a copper underline over changing the token (7.45:1 is the least
  margin of any pair).
- The dark native scrollbar is neutral grey (44/159). Suggest
  `scrollbar-color: var(--muted) var(--background)` for item 6.
- The " · Company" break at 390 is still unfixed (it's from sprint 1, and the fix is a nbsp).

Owner hasn't answered: the placeholder gate, and the 7.0 bar for scoped sprints (the second sprint
in a row at 6.8).

**How to apply:** if the owner rules on either question, record it here and re-score.
Tooling that worked:
- To draw scrollbars, launch with `ignoreDefaultArgs: ["--hide-scrollbars"]`.
- Section ids are on the h2, not the section, so select through `document.querySelectorAll("section")`.
