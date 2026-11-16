# Sprint 71 (S): the bar's motion control stays clear of Read as page at a large font

**Goal:** From 1024 px wide, the bar's Full/Calm/Off control no longer prints over "Read as page" at
a large default font, on any page that has the control.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production
hides a fact or makes the site say something false; sprint 70 named this one as the next candidate
(Iris, `.crew/sprint/70/retro.json`). Atlas swept production on 2026-11-16 (`/`, `/log`, `/log/23`,
`/crew`; 768, 1024, 1180, 1280, 1440 and 1920 wide; 16, 20, 24 and 28 px default font through CDP
`Page.setFontSizes`). On all four pages the same defect:

- From 1024 px the control's slot is a fixed `142px` (`nav > [data-motion]` in `app/globals.css`),
  its buttons right-aligned in it. Its labels are in rem and grow with the reader's font, the slot
  doesn't, so the group runs out of the slot's left edge and over "Read as page", the link just
  before it in the bar.
- Read as page's right edge against the group's left edge: 1024 and 1180 at 20 px, 800 against
  799 and 956 against 954 (touching); 1180, 1280 and 1440 at 24 px, 22 px over (952 against 930);
  1440 at 28 px, 43 px over (1208 against 1165); 1920 at 28 px, 8 px over on the bar's second row.
- Read as page is the way to the site as one plain document, and the control is how a reader turns
  the motion off. Covered, the link's words can't be read and part of it can't be clicked.
- Nothing is wrong at 16 px, nor at 768 (whose slot is 186 px).

## Checks (Probe, T32, in a new spec of its own or `e2e/large-font.spec.ts`, Probe's call by shard time)

- **T32.** On `/`, `/log`, `/log/23` and `/crew` at 1024 × 900, 1180 × 900, 1440 × 900 and
  1920 × 900, with a 16, 20, 24 and 28 px default font (the root's computed font asserted to have
  taken, T27's pattern), webfont blocked: once the control's buttons are in, the group's left edge
  (its first button's box) is at or right of Read as page's right edge wherever the two share a
  line, every button and the link are inside the window, and the page doesn't scroll sideways. Red
  on main from 20 or 24 px. Keep the test count small (one test per page or per width, looping
  inside) so shard 2 doesn't grow: read its time with `--list --shard`.
- Proven red on main. A mutant that hides the overflow (`nav > [data-motion] { overflow: hidden }`)
  must stay red: a clipped button isn't a fix, so assert the buttons' own boxes are whole and
  their text isn't clipped (scrollWidth within clientWidth).

## Budgets

- **Nothing moves at 16 px.** At 768, 1024, 1280, 1440 and 1920 with the default font, webfont
  blocked, every box on `/`, `/log`, `/log/23` and `/crew` is where it was on main (Forge's box
  diff, as sprints 68 to 70 measured).
- The buttons stay 32 px tall from 1024 and 44 px targets below; the bar's height at 16 px is
  unchanged.
- No script. CSS only (`app/globals.css`, and the bar's classes in `components/bar.tsx` only if CSS
  alone can't do it).

## Out of scope

The control's behaviour and words, the bar's links and their order, the foot's row below 768,
the trials page, the other large-font follow-ups sprint 70 left open (the yard's hint, /crew's
table at 320 × 28, the record's step links past 1536, "answering."), owner paths and `content/`.
