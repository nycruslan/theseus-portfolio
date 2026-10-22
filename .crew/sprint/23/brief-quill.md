# Sprint 23, brief for Quill: the contract for B2

Atlas, 2026-10-22. Sprint 23 is B2 of the redesign (`ROADMAP.md`): the facts laid out as the
approved Work frames show, with Detail A; `/read` ("Read as page"); and a not-found page in the
site's style. Size M. B1 merged this morning as PR #62, so the sheet on `origin/main` is the ground.
Branch `sprint/23-the-facts-and-read`, checked out here.

## Who it's for

A hiring executive who scrolls past the sheet, and the engineer who wants the plain page. Today the
facts are sprint 22's seam (Iris's review, "What waits for later sprints"): the template column
under the sheet. B2 makes them part of the drawing sheet and gives the site its read view and a
404 that wears its clothes. Still the Off sheet: nothing live, 3D, copper or in motion.

## Read first, in this order

1. `.crew/sprint/23/notes-iris.md`: Iris's build notes, written before this contract on purpose
   (sprint 22's retro: notes and contract written in parallel left Probe twelve conflicts). Your
   contract is the checks; her notes are the source for every value the contract leaves open. Where
   you disagree with a note, say so in the contract and the contract wins, but keep the list short
   and name each one, so Atlas can record it in `decisions.md`.
2. `.crew/sprint/22/contract.md` (the shape that worked, and the data rules B2 inherits),
   `decisions.md`, `review-iris.md`, `retro.json` (the follow-ups B2 takes).
3. `.crew/sprint/17/direction-iris.md` and the frames `work-1440.webp`, `work-390.webp`,
   `read-1440.webp`, `read-390.webp` in `.crew/sprint/17/design/`.
4. The live specs, every one: `e2e/*.spec.ts` and `e2e/helpers.ts`. Almost all load `/`; B2
   changes the Work, Projects, Stack, Education and Contact sections, adds a bar link, and adds two
   routes. Your memory says what that means.
5. `PRODUCT.md`, `design/brief.md` (the wayfinding guardrail: "Read as page", a URL for every
   view), `.crew/STATE.md`, and your memory.

## Write `.crew/sprint/23/contract.md`

One page where it can be, as sprint 22's: the outcome in a sentence or two; the calls you made; the
data rules the page and Probe's oracle both implement word for word (B2 has few: which words Detail
A shows, from `profile.experience[0].summary` and nothing else; the deep-link ids on `/read`); then
the numbered checks (B2.1 …), each one a visitor would notice, with "shown by"; the budgets; the
riders; the check disposition; out of scope; needs owner decision; needs decision (Iris).

What the checks must cover:
- **The facts on `/`**: the five sections in the new layout at 1440, 1024, 390 and 320, nothing
  overflowing, every fact verbatim (B1.7 stays green: it uses `toContain`), ids unchanged.
- **Projects without cards**: what the row is, where its link is, its 24 px target, its
  accessible name. The cards' tests retire or are rewritten (below).
- **Detail A**: the words it shows and where they come from; what it is to a screen reader; both
  layouts; dark; forced colours (compare with the page's background, sprint 20's lesson); print;
  nothing interactive; no motion; drawn in tokens.
- **`/read`**: the semantic page with every fact (`content/profile.ts` verbatim), heading order, the
  deep links, the back link, the bar or header line as Iris's notes decide, the Print control's
  behaviour with and without script (a control that does nothing is a stand-in), the drawing's
  count line, print media, scripts off, 320 px, 24 px targets, axe in both schemes, the keyboard,
  the tokens, no copper (B1.6's set of checks runs per route: say whether its template takes
  `/read` by adding the route to its list, a one-line edit for Probe), metadata (title, canonical,
  og:url for `/read` only; the layout's note on why the layout can't set them).
- **The not-found page**: status 404 at a missing path, the site's tokens and type (Lens's memory:
  Next's fallback inlines black on white), what it says, where it links, no canonical or og:url
  (smoke's last test), axe.
- **The bar**: "Read as page" → `/read` after Contact, right-aligned as the canvas draws it;
  B1.3's list of links and `tabUntil`'s 12 in `keyboard.spec.ts`: count the Tab stops to Contact's
  first link with the new bar link and the new Projects rows and say whether 12 still holds (a
  raised bound is a harness change, not a weaker test: say so).
- **Nothing moves, nothing is copper, LCP stays text, CLS 0**: B1.8, B1.9 and B1.6 hold on `/`
  unedited; say which of them `/read` needs its own run of.
- **The riders**: `.plank-original` and its swatch GrayText in forced colours; the folded table's
  plain `content: attr(data-label)` fallback; `app/opengraph-image.tsx`'s Geist comment. Each either
  gets a check or is named as "no check, Lens reads it".

**Check disposition** as sprint 22's table: every test in `e2e/`, keep / rewrite (same assertions on
the new object) / retire (owner's approval in this PR, batched and lettered). Expect at least:
`cards.spec.ts` (5), `keyboard.spec.ts`'s "a card shows keyboard focus as it shows hover",
`profile-sections.spec.ts` C1 to C8 (most keep), `sheet.spec.ts` B1.3 "the bar stays above a hovered
card" (it needs a card: rewrite on the new row, or retire), `sprints-entry.spec.ts`, `smoke.spec.ts`,
`invariants.spec.ts` (the `PROJECTS` and `withLink` helpers, the "links outside the cards" test's
name). A retirement needs the owner, which holds the PR at `gate`: keep the owner's list as short
as honesty allows, and prefer a rewrite that keeps the assertion where one exists.

**Budgets**: inherit B1's table (LCP text ≤ 2,500 ms at 4× CPU, CLS 0 with fonts, 0 KB JS to read
the facts, fonts unchanged, `[data-plan]` ≤ 32,768 B); add `/read`'s (it reuses the drawing, so its
own markup budget; its script bytes within 2,048 B of `/sprints`' unless the Print control ships,
then say its cost). Every number cites where it came from.

## Decisions already made (Atlas)

- No view transition between `/` and `/read` (the research's proposal): B1 and B2 have no motion
  and ship no client code for the facts. It can come with B3's motion control.
- The 3D, the loft, the control, `/crew`, `/log`, the ghost hull and anything copper are out.
- The Date column stays out (sprint 22, decision 2).
- The social cards' typeface and the favicon's mark follow Iris's notes: in only if she calls them
  cheap, else follow-ups.

## Report

The path to the contract, the conflicts with Iris's notes (each with your call), the owner's batch
list, the Tab-stop count, and anything you could not ground in a spec, a frame or a measurement.
Don't commit: Atlas commits the sprint folder. Your memory lines (at most three, citing
`.crew/sprint/23/`) go in `.claude/agent-memory/product-owner/MEMORY.md` now, since you don't
return later in the sprint.
