# Sprint 25 brief for Forge: the layouts module, batch E, and the drawing's side of the seams (Atlas)

## What this sprint is for, and for whom

B3's first build sprint: Pixel lands the 3D card model on the inked profile and lifts it off at
1024 px and up. Your piece is what the model needs from the page and what rides along for the
owner: the drawing's layouts in a module the 3D chunk can import without the SVG, and batch E, the
one-line revision descriptions Iris proposed, which the owner approves on this PR. The contract is
`.crew/sprint/25/contract.md` (its header's amendment 1 names your module; its rider table and
check disposition describe batch E).

## What you build, in this order

1. **`lib/hull-layouts.ts`, first, within the hour.** Move `type Plank`, `PLANKS`, `type Layout`,
   `WIDE` and `NARROW` out of `lib/lines-plan.ts` into it, exported and unchanged (today's lines
   25 to 55 and 160 to 215), with the comments they carry. It imports only `lib/half-model.ts`
   and draws no SVG; `lib/lines-plan.ts` imports from it, and `app/page.tsx`'s one import line
   takes `PLANKS` from the new module (`seatPlanks` stays where it is). `PAGE` stays in
   `lib/lines-plan.ts`. Commit this alone and tell Atlas the sha at once: Pixel's 3D chunk imports
   it, and the chunk must not pull the drawing in. Prove that with the build's chunk graph when
   Pixel's code is on the branch, or say you couldn't.
2. **Batch E** (contract, Riders; `.crew/sprint/24/decisions.md` item 7; Iris's sprint 22 notes,
   section 8): from 1024 px, each Description cell of the revision block is one line with an
   ellipsis, with the full goal in the cell's DOM text; phones keep the full text. The table's
   other cells, the fold rule (B1.1) and the names' `translate="no"` are unchanged. The styling
   goes in "The revision table" section of `app/globals.css` (the `.rev` rules) or the component's
   classes; don't touch the file's other sections (Pixel adds "The model" after "The lines plan").
   Probe rewrites B1.5's "truncated cells" assertion to this; run it and see it green.
3. **Only if Iris picks it:** the drawing inks each interior seam once (contract, build note 7),
   in `lib/lines-plan.ts`'s plank paths, so the SVG's seams read as the model's single line. Atlas
   tells you if she does. Until then the drawing is untouched, and B1.4, C6 and B2.5 hold.

Nothing else: no font or facts riders (the contract says they don't ride), no change to
`content/`, no edit to `e2e/`.

## Files you own

`lib/hull-layouts.ts` (new), `lib/lines-plan.ts`, `components/revisions.tsx`, the import line of
`app/page.tsx`, and "The revision table" section of `app/globals.css`. Work in your own worktree
from `sprint/25-the-loft`: `git worktree add -b forge/25 /home/user/wt-forge-25 sprint/25-the-loft`,
then `pnpm install --frozen-lockfile` there. Commit on `forge/25` in small commits; Atlas
cherry-picks them onto the sprint branch. Use your own ports (not 3000, 3352 or 4534). `pnpm verify`
must pass before you stop; run the sheet and plan specs (`PLAYWRIGHT_PORT=<free> pnpm exec
playwright test e2e/sheet.spec.ts e2e/plan.spec.ts` against your own served build, your memory's
method) and say what's red and why (B1.5's rewrite lands from Probe; until then its old assertion
is the one that goes red on batch E, which is expected).

## Report

Outcome first. Then what's built, the commit shas in order (the module's first), the proof that
the module draws no SVG, the revision block at 1440 and 390 in both schemes (screenshots in your
scratchpad or `.crew/screenshots/`, with a line saying what each shows), what you did differently
from the brief and why, and what you couldn't verify. Then at most three memory lines in
`.claude/agent-memory/engineer/MEMORY.md` citing `.crew/sprint/25/`, committed in the worktree,
with the sha.
