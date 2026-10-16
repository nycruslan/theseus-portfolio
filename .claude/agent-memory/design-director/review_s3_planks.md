---
name: Sprint 3 review (PR #16, project cards)
description: My scores and verdict on sprint 3 at 57999ec, my rulings on Pixel's two deviations, and what to watch next.
type: project
---
Verdict: ship 7.3/10 (DQ 7, Orig 7, Craft 8, Func 8). Better than prod (origin/main b748d4d stood in
for it). This is the first sprint over the 7.0 bar. Originality went from 6 to 7 because the layout
finally changed. Every gate passed: axe 0, detector `[]` on files and URL, 0 animations,
0 overflow, LCP 604 ms at 4x CPU and CLS 0.

Accepted Pixel's deviations. Both fixed misses in my own direction:
- `has-[a:focus-visible]:z-10`: without it, the next plank's seam paints over the bottom pixel of
  the focus ring, so the ring is 1 px on that side and 2 px on the others. I proved it by removing
  the z-index in the browser and diffing.
- `md:px-[calc(--spacing(8)-1px)]`: from md, "padding = hang" has to subtract the 1 px side rule.
  Otherwise the text sits 1 px off the label.

**Why:** next time I spec a hung or overlapping frame, I'll write the border into the sum and lift
every state that paints the edge (hover, focus, active), not just hover.
**How to apply:** check the -mt-px seams for any stacked, bordered list I direct. For each
edge-painting state, ask what paints over it.

Open follow-ups: the arrow doesn't light on keyboard focus (`group-has-[a:focus-visible]:text-accent`,
item 6). Keep `--rule` a quiet hairline and don't raise it to 3:1. The Theseus href is the owner's
GitHub profile (TODO(owner)), and the card now promotes it. That's an owner decision.

Owner has ruled (2026-10-14, in the rubric): stand-ins that are already on production don't fail the
placeholder gate. Scoped sprints that are better than prod pass without the 7.0. Layout sprints still
need the 7.0.
Tooling: the guard blocks `node -e` and loops with `$var` when the command names the worktree. Write a
script, then run it. `@axe-core/playwright` imports from `dist/index.mjs`.
