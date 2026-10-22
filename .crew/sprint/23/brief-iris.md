# Sprint 23, brief for Iris: build notes for B2

Atlas, 2026-10-22. Sprint 23 is B2 of the redesign (`ROADMAP.md`): the facts laid out as the
approved Work frames show, with Detail A; `/read` ("Read as page"); and a not-found page in the
site's style. Size M. B1 merged this morning as PR #62, so the sheet on `origin/main` is the ground
this sprint builds on. Branch: `sprint/23-the-facts-and-read`, checked out in this repository.

## What this is for

A hiring executive scrolls past the sheet and reaches the facts. Today they meet sprint 22's seam:
the template column, 13 px uppercase labels under a 104 px name, and the project cards (your review,
"What waits for later sprints"). B2 closes that seam: the facts become part of the drawing sheet, as
the canvas draws them, and the site gains the plain read view the brief's wayfinding guardrail asks
for. Nothing in B2 is live, 3D or in motion: it is still the Off sheet, and copper still paints
nothing.

## The order this sprint runs in

Sprint 22's retro proposes that the designer's notes come first and the contract reads them, since
writing them in parallel left twelve conflicts for Probe to find. So you go first, Quill writes the
contract from your notes, and Probe and Forge build from the contract with your notes as the source
for everything it leaves open (values, grid, strokes). Where the contract and your notes differ, the
contract wins, as in sprint 22, so say plainly which calls are open and which are settled.

## Write `.crew/sprint/23/notes-iris.md`

The build spec for Forge, in the shape of `.crew/sprint/22/notes-iris.md` (which worked). Every
number from the canvas or measured, and "decided" where the canvas is silent. Cover:

1. **The facts at ≥ 1024 and < 1024** (`work-1440.webp`, `work-390.webp`;
   `.crew/sprint/22/canvas-extract/Work-1440.html` and `Work-390.html`): the section rule, the h2
   column, the entry grid, the date column, company and role styles, summaries, the Stack list, the
   Education entries and the Contact links in the display size. Which existing step tokens serve
   each size and whether any step is retuned or added (the invariants read every visible text size
   against `STEP_TOKENS` in `e2e/helpers.ts`, so a new token is a harness change for Probe: name it).
   Section 10 of your sprint 22 notes is the start; check it against B1 as shipped (`app/page.tsx`,
   `components/section.tsx`, `app/globals.css`) and say what changes.
2. **Projects without cards.** The canvas drops the cards: the link in the date column, the name in
   the company style, the description as the summary. Say exactly what the row is and where the link
   and its 24 px target are, at both widths. (Retiring `cards.spec.ts` and `keyboard.spec.ts`'s card
   test is the owner's call; Quill lists them for the owner in this PR.)
3. **Detail A**, the gateway schematic the owner kept (canvas call 4): the boxes, the connectors, the
   words (only the JPMorgan summary's own words: around 8 product teams, the gateway, AWS Bedrock,
   Azure OpenAI, the Anthropic API), the caption, both layouts (row at 1440, stacked at 390), dark,
   forced colours and print. Say whether the text is HTML (the research: annotations are real text)
   and what draws the connectors. It is decorative to a screen reader or it isn't: say which, and
   what the accessible form is.
4. **`/read`** (`read-1440.webp`, `read-390.webp`; copy the canvas's Read artboards to
   `.crew/sprint/23/canvas-extract/` as sprint 22 did, so Forge has the HTML): the header line (Back
   to the ship, the URL, Print), the column and its measure, the title block as prose, each section's
   type, "The ship" with the drawing and its count line, deep links (`/read#work` and so on), the
   print stylesheet, dark, 390 and 320. Take a position on the Print button: it needs script, and a
   control that does nothing with scripts off is a stand-in, so say whether it ships hidden without
   script, or not at all in B2.
5. **The not-found page.** No frame shows one. Design it in words: the sheet's clothes, what it
   says, where it sends the visitor. Keep it small.
6. **The bar** gains "Read as page" → `/read` in the right-hand group (section 6 of your sprint 22
   notes). Is the current page marked on `/read`, and does `/read` carry the bar or its own header
   line as the frame shows?
7. **The sheet at 1024–1279** (your review: the title block's empty film between bio and contact):
   if B2's layout pass can settle it cheaply, say how; if not, say so and leave it.
8. **Riders Forge takes while in this code**, if you agree: `.plank-original` and its swatch filled
   GrayText in forced colours (Lens's nit), and the folded table's plain `content: attr(data-label)`
   fallback. The favicon's copper mark and the social cards' typeface are yours: say whether either is
   cheap enough for this PR or stays a follow-up (a vendored TTF for satori is a bigger change than
   this sprint wants).
9. **What you'll look at in review**, and when you want the first look at the running build.

End with "Decided beyond the canvas" and "Needs decision", each naming who decides (owner, Quill, or
you).

## Read before you write

- `ROADMAP.md` (B2 and the riders), `.crew/STATE.md`, `.crew/sprint/17/direction-iris.md`,
  `design/research/2026-ui-ux-and-3d.md` section B2 (input, not a spec).
- `.crew/sprint/22/notes-iris.md`, `review-iris.md`, `decisions.md`, `retro.json` (follow-ups).
- The sheet as shipped: `app/page.tsx`, `app/globals.css`, `components/*.tsx`, `app/sprints/page.tsx`.
- Your memory in `.claude/agent-memory/design-director/MEMORY.md`.

The canvas is https://claude.ai/artifact/4dnRYkQbTynS4kipuBpbN5 (read it with the Artifact tool, and
its comments with ArtifactComments, in case the owner left any since sprint 22).

## Out of scope

The 3D, the loft and the motion control (B3); `/crew` (B4); `/log` and the ghost hull (B5); any
motion, including a view transition between `/` and `/read`; anything copper. The owner's words in
`content/profile.ts` never change.

## Report

The path to the notes, the open decisions by owner, and anything you could not verify. Your memory
lines (at most three, citing `.crew/sprint/23/`) come after the build, with your review.
