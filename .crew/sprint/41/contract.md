# Sprint 41 contract: Pc, the facts, scannable and shared (M)

Atlas wrote it, from Quill's plan (`.crew/sprint/38/plan.md`, Pc). The milestone's last sprint.

## The outcome

A hiring executive who scrolls to Work on `/` can scan the JPMorgan figures sentence by sentence
instead of digging them out of a 90-word paragraph, and one who is sent the link sees the proof on
the card itself: the owner's role at JPMorgan Chase and his scope and scale, in the site's own
typeface. Every word stays the owner's.

## Data rules (one wording, for Forge and Probe's oracle alike)

- **Sentences.** A summary's sentences are what `splitBio` in `lib/bio.ts` splits on: after each
  `". "` (a full stop followed by a space), trimmed, empty parts dropped. The rule must have one
  implementation in `lib/` that the page uses; Probe's oracle restates it in the spec.
- **The card's lead** is the bio's first sentence by the same rule: today "VP Engineering at
  JPMorgan Chase."
- **The card's rows** are exactly what `particulars()` in `lib/particulars.ts` returns for the
  JPMorgan summary, in its order, term then phrase; when it returns null the card has no rows.

## Checks (Probe writes them red first, in a new `e2e/facts-scan.spec.ts`)

- **P14 Work reads sentence by sentence on `/`.** In every Work entry, each sentence of the
  summary is its own block-level element, in order, verbatim, and each starts on its own line (its
  top is below the previous sentence's bottom) at 1440 × 900 and 390 × 844. The entry's
  `textContent`, squashed, still equals the summary with single spaces between sentences, so B2.1,
  B1.7 and C4's residue checks stay empty **unedited**. No new `ul` or `ol` inside a Work entry
  (B2.1 counts one list per section). Detail A still follows the JPMorgan text. Server HTML, full
  opacity, 0 B of new script.
- **P15 the card carries the proof, in Sofia Sans.** `/`'s `og:image` answers 200, `image/png`,
  1200 × 630. What it draws comes from one module the card imports (for example `lib/card.ts`),
  and the spec checks that module's output against the data rules: the name, the lead, and the
  rows. The face is a font file vendored in the repository (TTF, OTF or WOFF; satori reads no
  woff2), with its OFL licence beside it, loaded by the card. Prove the face with a check that is
  red on main (for example: the card's PNG differs from one drawn with next/og's default face, or
  the module exports the font's path and the file's name table reads Sofia Sans). The card's
  `og:image:alt` reads the name and the lead.
- **P16 the text face's fallback** (the sprint 27 rider): the text face's first paint without the
  web font keeps its lines on systems without Arial. Forge does for `app/layout.tsx`'s Sofia Sans
  what sprint 27 did for the display face (a local `@font-face` over Arial, Liberation Sans, Arimo
  and Roboto with next/font's metrics), or reports why Turbopack won't let him. The check:
  the computed `font-family` of `body` names that local face after the web face.
- **P17 the two gaps** (Iris, `.crew/sprint/23/review-iris.md` 2 and 3): below 1024 the project
  link's row rule sits within 2 px of the gap every other entry has under its text (18 px then);
  `/read`'s figcaption row at 390 has a 6 px row gap.

The 404's first paint in the fallback face: Forge measures whether P16 already settles it (the 404
gets the same local fallback). If it doesn't, it stays open with the reason; no check for it.

## Budgets

- Facts first: B1.9's LCP stays the name at 1440 and the bio at 390; B2.10 unedited (0 B of new
  client script on `/`).
- The first screen: B1.1, B4.22, B4.49 unedited. Nothing in this sprint moves the title block.
- CLS 0 (B1.8), nothing copper (B1.6), axe 0 (B2.9).
- The card renders at build; its font adds no bytes to any page.
- CI: report the new spec's time and the full suite's at CI's worker count.

## Out of scope

- `/read`'s summaries: its head already holds the whole summary in the first viewport.
- Rewording, reordering or adding facts; `content/` is the owner's.
- Detail A's dark-scheme boxes (a look on a real phone first).
- The riders that loosen a live assertion (the legend's "Original", C5.3, the scripts-off 404).
- The key from 1024 to 1439 px and the 3D label over the dot (sprint 40's follow-ups).

Nothing touches an owner path or `content/`, so nothing waits for the owner. He may overrule the
card's content or the sentence layout after the merge.
