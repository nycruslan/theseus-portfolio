# Sprint 41, Iris: review of PR #100 (Pc, the facts scannable and shared)

**Verdict: changes, 7.2/10 as built (7.5 with must 1), on 7e1eea5.** It's **better** than
production, and every hard gate passes. One must, and it's cheap: set the card's name in the site's
display face, Sofia Sans Extra Condensed 700, as `/` sets it. Today the card says "Ruslan Shulga" in
a voice the site never uses for his name, and LinkedIn and Slack cache the first card anyone shares.
One should rides in the same commit: `.ship figcaption > p { margin-top: 6px; }` on `/read`. Note
the child combinator.

How I judged it: a fresh worktree at 7e1eea5 (`pnpm install --frozen-lockfile`, `next build`),
served with `next start` on port 3341, next to production at 390, 1024, 1440 and 320, light and
dark. I warmed the font before every shot. I rebuilt the card in a node script on next's own
compiled `@vercel/og` with the vendored TTFs. Its "as built" render matched the PR's
`/opengraph-image` byte for byte, so the variants below are fair. Shots and prototypes are in
`/tmp/claude-0/-home-user-theseus-portfolio/0d64e17e-19a0-557c-bab1-c8a62148c7eb/scratchpad/iris/`
(scratch, not committed).

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | Pass. Every word on the card comes from `cardText(profile)`. |
| axe, serious or critical | Pass. 0 on `/` and `/read` at 390 and 1440, light and dark (8 runs, 0 violations of any impact). |
| impeccable detector, error level | Pass. `[]` on `components/facts.tsx`, `app/opengraph-image.tsx`, `lib/card.ts`, `app/layout.tsx`, `app/globals.css`. |
| Reduced motion | Pass. Nothing added moves. |
| 320 reflow | Pass. `scrollWidth` is 320 on `/`. |
| Phone budget | CLS 0 at 390 and 1440, measured on a cold load followed by a scroll. No throttled LCP trace: the first screen is untouched and no script was added. B1.9 is Probe's. |

## Compared with production: better

- **Work on `/`.** Production sets the JPMorgan summary as one block: 7 lines at 1440, 11 at 390.
  The PR sets it as three sentences: 3, 4 and 1 lines at 1440, and 5, 6 and 2 at 390. The 55% now
  closes a sentence of its own, the gateway is its own sentence, and the team of 7 sits alone.
  Work grows 76 px at 1440 and 98 px at 390, all below the fold.
- **The card.** Production's card has the name, "VP Engineering, AI Platform", the city and the
  host. The PR's card has the name, the bio's first sentence and the four particulars ruled as on
  the sheet, so the proof now shows before anyone clicks.
- **`/read`'s key at 390.** The count-to-legend gap goes from 4 to 6 px, as asked in sprint 23.

## Your questions

**Is sentence-to-a-line the right reading of "scannable"? Yes. Keep it as built.** Each sentence
carries one claim, so the eye can stop on a claim without parsing a 90-word paragraph. It still
reads as the schedule's entry, not a list: no markers, same measure, same ink, and the 6 px between
sentences is under a quarter of the 24.8 px line. A wrapped sentence holds together, and the step
between sentences is visible at every width. The 6 px also matches the step the entry already uses
under the role and above `.entry-desc`, so it adds no new interval. `text-wrap: pretty` holds on the
build: at 1440 the gateway sentence ends "sprint-long AI features into a day or two.", and at 390
pretty pulls one word down ("about 55%.", "and platform.") rather than leaving "55%." alone, as
production does. Forge's earlier 1440 render showed "or two." alone. That render isn't what the
build serves. The dark scheme behaves the same way, and 1024 and 320 hold. The measure is 594 px at
1440 and 538 px at 1024, the same as production.

**Is the card worthy of the site?**
- **Hierarchy: right.** Three levels: name, lead, table. The ink head rule over hairline rows is
  the sheet's own ruling.
- **Weights: keep the bold muted terms.** On `/` the terms are regular, but at 30 px on a card that
  is shown at 360 to 552 px wide, bold survives the scaling. Forge's v1, with regular terms, read
  flatter.
- **The empty bottom band: leave it empty.** Both paddings are 72 px, so the band under the last
  row matches the margin over the name. It reads as the sheet's margin, not as a hole. Don't bring
  back the host: every platform prints the domain under the card.
- **The name: yes, the condensed display face** (must 1).

**Should `/read`'s figcaption `p` get `margin-top: 6px`? Yes** (should 1), but scoped to the
child.

## Must 1: the card's name in the display face

On `/`, the name is Sofia Sans Extra Condensed 700 at 104 px, −1.04 px (−0.01em). That face also
sets the wordmark and every section head, and it's what makes the sheet recognisable. The card sets
the name in the text face's bold. That is the one element that makes the card read as any
well-made OG card instead of this site's title block. The contract's outcome says "in the site's
own typeface", and for his name that face is the condensed one. I rendered 120, 128 and 136 px.
128 has the presence of `/`'s name and leaves about 50 px between the lead and the table (136
leaves 44, which crowds the table). At a 360 px thumbnail it's as legible as the built bold.

- `assets/fonts/SofiaSansExtraCondensed-Bold.ttf`: the Google Fonts static instance, already in
  Forge's scratchpad as `fontdl/cond-700.ttf` (109,764 B, name table "Sofia Sans Extra Condensed
  Bold", v4.101). Its copyright line is the one `assets/fonts/OFL.txt` already carries ("The Sofia
  Sans Project Authors"), so the same licence covers it.
- `lib/card.ts`: append it to `CARD_FONTS` (regular, bold, then the display face's bold) and
  update the doc comment.
- `app/opengraph-image.tsx`: give `face()` a family argument. Load the third file as
  `{ name: "Sofia Sans Extra Condensed", weight: 700, style: "normal" }`. On the name's div set
  `fontFamily: "Sofia Sans Extra Condensed"`, `fontSize: 128`, `fontWeight: 700`, `lineHeight: 1`,
  `letterSpacing: -1.28`. Change the head group's `gap: 18` to `gap: 14`. Leave everything else as
  is: the lead at 44 px, the table, the padding and the alt.
- Checks: none to edit. P15's `SOFIA` pattern already accepts `Sofia Sans Extra Condensed`, the
  fonts stay under the traced `assets/fonts`, and nothing reaches a page.

Prototype: `.../scratchpad/iris/proto-cond-128.png`. Built card: `.../iris/card-pr.png`. Side by
side with 360 px thumbnails: `.../iris/proto-128-sheet.png`.

## Should 1: `/read`'s sentence under the key

```css
.ship figcaption > p {
  margin-top: 6px;
}
```

Use `>`, not `.ship figcaption p`: `PlankCount` is a `<p>` inside `.ship-key`, so the descendant
selector also pushes the count line down. I measured +12 px on the caption that way, not +6. With
the child selector at 390, the sentence moves from 0 to 6 px under the legend, so the caption reads
count, legend, sentence at an even 6 px. At 1440 it adds 6 px under the one-line key, and the
caption grows from 44 to 50 px. That's fine on a printable page, with no fold to protect. No check
reads it, and P17b measures `.ship-key`'s row gap, which doesn't change. Shots:
`.../iris/shots/fig-cmp.png` (top: 390 before and after; below: 1440 before and after).

## Checked and fine

- **P16 fallback.** `body` computes `"Sofia Sans", "Sofia Sans Local", sans-serif`. With every
  woff2 blocked at 1440, Work's eight sentence heights, the facts' height (2,022 px) and the page
  height (2,945 px) equal the web face's. At 390 the bio holds (93 px both), and two Work sentences
  run a line shorter in Liberation Sans (2,741 against 2,791 px). That's a different first paint
  on a cold phone, not a shift, because `optional` never swaps.
- **The alt** reads "Ruslan Shulga, VP Engineering at JPMorgan Chase.", and `twitter:image`
  carries the same card.

## Scores (`design/rubric.md`)

| Criterion | As built | With must 1 | Why |
|---|---|---|---|
| Design quality ×2 | 7 | 7 | Work reads as the same sheet, only easier to scan. The card belongs to the sheet's family by its ruling, and not yet by its type. |
| Originality ×2 | 6 | 7 | The card in the text face's bold looks like a library OG card. In the condensed face it's this site's title block. |
| Craft ×1 | 8 | 8 | The 6 px rhythm, pretty wrapping, measured fallback metrics, and the figcaption gap if should 1 lands. |
| Functionality ×1 | 9 | 9 | Scannable, server HTML, 0 B of script, axe clean, CLS 0. |
| **Weighted** | **7.2** | **7.5** | |

## Follow-ups (not this PR)

- The card as a drawing sheet: a 1 px ink frame inset like `/`'s frame, with the name over the
  title block's rule. Worth a look when a later sprint touches the card. It's not a fix.
