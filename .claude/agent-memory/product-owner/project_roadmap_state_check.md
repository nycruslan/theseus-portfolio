---
name: roadmap-state-check
description: Before picking a sprint goal, check the code for roadmap items already shipped; the roadmap boxes lag the repo
metadata:
  type: project
---

In sprint 3 planning, ROADMAP.md showed item 2 (dark mode) unchecked after PR #12 merged, and item 5 (OG image) unchecked although `app/opengraph-image.tsx` and its smoke check were already on main.

**Why:** a goal picked from stale boxes would redo shipped work. Atlas also asked me to verify rather than trust the list.

**How to apply:** at sprint start, glob `app/` for what each unchecked item would create, tick what exists (with the file named), then choose. Item 3 (project cards) was the first layout-owning sprint; in contracts about cards, never print the project's `href` as text (it is `TODO(owner)` content), and ban new copy so the content checks stay simple.
