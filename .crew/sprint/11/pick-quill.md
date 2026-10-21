# Sprint 11: Quill's pick

**Goal:** Stack separators. Draw a middle dot between the tools in the Stack section, so multi-word
tools read as single units. Lane: **S**. Slug: `stack-dots`.

## Why this one

- Every item on the original roadmap is ticked and the page is whole, so the question is what a
  visitor still notices. Stack is on every visit, and Iris scored it Craft 7 for the reason this fixes:
  "LangChain Claude Agent SDK" parses only by 24 px gaps against 4 to 5 px word spaces, and the row
  looks like the Contact row without the copper (`.crew/sprint/6/review-iris.md` item 2). Sprint 6
  skipped it to save a re-review; nothing else has changed it since.
- It is S: one component's classes in `app/page.tsx`, no new section, no contract. Iris wrote the
  recipe and prototyped it by injection. It stays inside sprint 6's checks (empty generated content,
  `li` boxes don't move, a token colour, nothing focusable).
- Checks for Probe, each observable in a browser: each row's first tool has no dot before it (at 390,
  1024, 1440); every other tool has one; the list text is unchanged (`innerText` equals the tools
  joined as before); axe stays at zero in both schemes; 320 px still doesn't scroll sideways.

## What I did not pick, and why

- **Watch the team build** (a page of sprints from `retro.json`) is the item that would matter most to
  visitors, but it is L with no direction yet. It needs Iris's direction and a contract sprint first,
  as the hero did. It is second on the roadmap, and I'd start that sprint next.
- **Hero lifecycle** (`mountHull` teardown): correct, but a one-page site never remounts, so a visitor
  sees nothing. Next in line after this.
- **Retina ticks:** M, only visible at dpr 2 within 5 px, with no spec to prove it.
- **Skip link:** the roadmap's open question has an answer. Nothing focusable sits before the first
  card, so no cut of `main` can save a Tab. Keep it as convention. Removing it would weaken a test, which
  is the owner's.
- **768 breakpoint as a container query:** already done in #35 (`@container (width >= 48rem)`), so it
  came off the list. Print and the shader dither (Iris's sprint 10 items 1 and 2) are also done.

## Rider

Probe may turn `e2e/content.spec.ts`'s `test.fixme` back into `test` in the same PR: no `TODO(owner)` or
"Company name" is left in `content/`, `app/`, `components/` or `lib/`. Spec-only, a tightening. If it
fails for any reason, drop it and report; it is not part of the goal.

## Out of scope

Tool order, wording, grouping, any change to `content/profile.ts`; any other section's look.
