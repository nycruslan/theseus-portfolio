# Sprint 19: the build log's goals as copy (S)

**Goal (roadmap):** the build log reads as copy, not shorthand. The redesign, the top item, still
waits for the owner on sprint 17's canvas (no comments on 2026-10-21, sprint 19's start), so this
sprint takes the next item that neither repeats nor builds on it. The not-found page waits for the
redesign's type (B1), so it is skipped too.

**The defect:** `/sprints` prints sprint 15's goal as "Redesign, direction step: … for the build
(L)", and the meta line under it already says "Large". The size tag repeats the size.

## Contract change (amends sprint 12's "Order and presentation")

After the prefix is removed, a **trailing size tag** is removed too: a final parenthetical that
holds only one size letter, `(S)`, `(M)` or `(L)` (case-insensitive, inner spaces allowed), with
the whitespace before it. Whatever else is in parentheses stays: sprint 12's
"(L, contract step)" says more than the size, and history isn't rewritten. A goal that is nothing
but a tag is blank, which the reader already rejects. Future goals are written for visitors (the
sprint skill's Close), so no past retro is edited.

## Pieces (parallel, disjoint files)

1. **Probe** (`e2e/` only): in `e2e/sprints.spec.ts`, make the oracle's `presentGoal` follow the
   amended rule, and add a check, red on main, that no rendered goal on `/sprints` ends in a bare
   size tag while sprint 15's entry still shows its words (or, if cleaner, a fixture case through
   the reader-module tests near `READER_MODULE`: `"Goal (M)"` → `"Goal"`, `"Goal (M, x)"` kept,
   `"(L)"` alone throws). Keep the existing checks; this is a tightening.
2. **Forge** (`lib/sprint-log.ts`, `app/layout.tsx`): strip the trailing size tag in
   `presentGoal`, with the doc comments on `SprintEntry.goal` updated. Rider (sprint 18's Lens
   nit): `app/layout.tsx`'s comment says every route gets the social image; a page that sets its
   own `openGraph` replaces the layout's whole object and drops it (as `/sprints` did, fixed by
   `app/sprints/opengraph-image.tsx`). Make the comment true.

**Out of scope:** rewriting past retros' goals; contract numbers or file paths inside goals
(none of today's goals would change except by hand); the not-found page; the redesign.
