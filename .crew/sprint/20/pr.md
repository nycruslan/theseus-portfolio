## Sprint 20: the drawn dots survive forced colors (S)

**Goal** (roadmap, "Small follow-ups", Lens's nits from sprint 11): the Stack's separator dots and the build log's "What went wrong" bullets show in forced colors (Windows High Contrast), and the Stack list clips only sideways. The redesign, the top item, waits: its canvas (https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5) has no owner comments yet.

**Size:** S. Brief: `.crew/sprint/20/brief.md`.

### What changed
- Forge: `forced-colors:before:bg-[CanvasText]` on both drawn dots (`app/page.tsx`, `components/sprint-entry.tsx`); the Stack `ul`'s `overflow-hidden` becomes `overflow-x-clip`, so y stays visible. The comment says why.
- Probe: C8 in `e2e/profile-sections.spec.ts`, which emulates forced colors at 390 and 1440 px and asks that each Stack dot after a row's first differs from the page's background, and that the list's `overflow-y` is `visible`. Red on main: Chromium paints the dot Canvas (white on white), and `overflow-hidden` computes y as `hidden`. Riders: C4b moved above the C5 banner in `e2e/sprints.spec.ts`; raw U+00A0 written as ` ` escapes (3 places).

### Evidence
- `pnpm verify` exit 0; `pnpm test:e2e` 135 passed, on the integrated branch.
- Forge at 320 px in Chromium: no sideways scroll (scrollWidth 320 = clientWidth), no leading dot on any of 7 rows; in forced colors the dot computes `rgb(0, 0, 0)`. Screenshots kept out of git: stack-active.png (forced colors, dots shown) and stack-none.png (normal colours).

### Decisions
- Probe's check compares the dot to the page's background, not to transparent: a "not transparent" check passes on main, since forced colors repaint the dot opaque Canvas.

### Not verified
- The "What went wrong" dots in forced colors in a browser (same class, no e2e check); real Windows High Contrast; retina.
