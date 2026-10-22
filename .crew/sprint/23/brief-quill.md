# Sprint 23 brief for Quill: the contract for B2, the facts and `/read` (Atlas)

## What this sprint is for

B2 of the redesign (`ROADMAP.md`): the facts below the sheet laid out as the approved frames show,
with Detail A; "Read as page" at `/read`; and a not-found page in the site's style. It's for the
hiring executive who scrolls past the sheet to the record, and for the one who wants the plain page
to read or print. It's an M: the visual language is approved, so the contract is yours and the
checks are Probe's. One PR, `sprint/23-the-facts`, from `main` at 7b4b48b (B1 merged this
afternoon, PR #62).

## What the owner decided at the B1 demo

They merged PR #62 without a comment. So: the retirements are approved; the Date column stays off;
nothing is stubbed. The direction's calls hold (ROADMAP.md lines 12 to 15): Detail A stays.

## Read these, in this order

1. `.crew/sprint/17/direction-iris.md` (the direction; B2 is "the facts and `/read`").
2. The frames: `.crew/sprint/17/design/work-1440.webp`, `work-390.webp`, `read-1440.webp`,
   `read-390.webp` (titles in `frames.json`). Note they show the Full state with Crew and the motion
   control in the bar: those are B3 and B4, not B2.
3. `.crew/sprint/22/notes-iris.md` section 10 (the facts: Iris's values, already written against
   these frames) and section 13; `.crew/sprint/22/contract.md` ("Out of scope: B2", and the check
   disposition, so you know which checks exist and how they were sorted); `.crew/sprint/22/decisions.md`.
4. `design/research/2026-ui-ux-and-3d.md` section B2 (input to weigh, not a spec).
5. The page as shipped: `app/page.tsx`, `components/section.tsx`, `components/project-card.tsx`,
   `components/bar.tsx`, `components/lines-plan.tsx`, `app/globals.css`, `content/profile.ts`.
6. The specs: every `e2e/*.spec.ts` (titles with `grep -n "^test(\|  test(" e2e/*.spec.ts`), and
   `e2e/helpers.ts`, `e2e/retros.ts`.
7. Your memory, `.claude/agent-memory/product-owner/MEMORY.md`, and `.crew/STATE.md`.

## Calls I've made (write the contract on them; say if one is wrong and why)

1. **One sprint, one PR, for all three pieces.** The projects stop being cards (the frames show
   rows, the link in the date column), so `cards.spec.ts` is retired or rewritten and that needs the
   owner. Everything B2 needs from the owner goes in this one PR.
2. **No client JavaScript and no motion in B2.** The research proposes a view transition between
   `/` and `/read`; B2 has no motion control yet (B3), so no. `/read` reads with scripts off, like `/`.
   A Print control that does nothing without scripts is a broken promise (sprint 22's lesson), so
   either it's a real control that works with scripts and is absent without, within a script budget
   you set, or it's left out: your call, stated in the contract.
3. **`/read` has its own header strip** (Back to the ship, Print if kept), as the frames show, not
   the bar. The bar on `/` gains **Read as page** → `/read`, at the right end as in `work-1440.webp`.
   Count the Tab stops: `keyboard.spec.ts`'s `tabUntil` bound is 12 (your memory).
4. **Deep links.** The facts' ids on `/` stay `work, projects, stack, education, contact`; `/read`
   uses the same ids, so `/read#work` lands. `/read` also shows "The ship" (the profile and
   half-breadth plan, the same `[data-plan]` drawing component, no pencil plank, the B1 count line)
   and the title block's facts, as the frames show.
5. **Detail A** is drawn from the JPMorgan summary's own words, verbatim: "around 8 product teams",
   "model-agnostic AI gateway", "AWS Bedrock", "Azure OpenAI", "Anthropic API". It's inline SVG or
   HTML boxes, server-rendered, with the words as real text, and a caption. Where it appears (on `/`
   under the summary; on `/read` too or not) is your call from the frames: `read-1440.webp` shows no
   Detail A.
6. **Not-found** is in the site's style (type, tokens, a link home). `smoke.spec.ts`'s "a missing
   page doesn't claim to be the home page" stays unedited.
7. **Riders** that touch code B2 touches, to carry in the contract's rider table: Lens's two nits
   from PR #62 (in `.crew/sprint/22/retro.json` follow-ups: the forced-colours fills of seated and
   original planks and the legend swatches; the folded revision table's `content: attr()` fallback),
   and the stale Geist comment in `app/opengraph-image.tsx`. The B1.1 contact-below-the-fold
   follow-up rides only if the revision block is touched. The social card's typeface and the favicon
   stay follow-ups unless Iris says they're cheap.

## What the contract holds (one page, as `.crew/sprint/22/contract.md` did)

- The outcome in a sentence or two, and the calls you made.
- Data rules, word for word, for anything two places implement (the page, `/read` and Probe's
  oracle): which `content/profile.ts` fields appear where, in what order; Detail A's words.
- Numbered checks a visitor would notice, B2.1 onward, each with what shows it. For `/read` and
  the not-found page, the invariants that today load `/` only (your memory: axe, tokens, 24 px
  targets, 320 overflow, keyboard, no-JS, print, forced colours, both schemes). LCP stays text on
  both routes; CLS 0; the drawing budget from B1 applies on `/read`.
- Budgets that apply, each with its ground.
- The check disposition: every live test as keep, rewrite (same assertions on the new object) or
  retire (owner), in batches for the owner, as B1's did. `profile-sections.spec.ts`, `cards.spec.ts`,
  `keyboard.spec.ts` and `sheet.spec.ts` B1.3 and B1.7 are the ones most likely to move.
- Out of scope: B3 (3D, the control), B4 (Crew), B5 (`/log`, the ghost hull).
- "Needs owner decision" (the retirements only, if you can) and "Needs decision (Iris)" for values
  the frames leave open. Iris writes her build notes after your contract, so name what you need
  from her rather than guessing values.

Write it to `.crew/sprint/23/contract.md` and commit it on `sprint/23-the-facts` in this checkout
(don't push; Atlas pushes). Then at most three memory lines, each citing `.crew/sprint/23/`. Report:
the outcome, the calls, what needs the owner, what you need from Iris, and what you couldn't check.
