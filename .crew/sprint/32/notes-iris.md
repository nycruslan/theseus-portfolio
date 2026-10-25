# Sprint 32, notes from Iris: the day groups, the Date, the lines figure (B5b)

Measured on production's `/log` (29 merged sprints, the table as B5a shipped it) and on a prototype:
production's own page with this contract's markup and my CSS injected (the groups from git's merge
days, sprint 30 shown Undated as production will always show its newest sprint), at 320, 390, 768,
1024 and 1440, light and dark, beside `log-1440.webp` and `log-390.webp`
(`.crew/sprint/17/design/`). Frames are in my scratchpad,
`/tmp/claude-0/-home-user-theseus-portfolio/14f68e19-2d72-5aea-8d53-6401d05c6afc/scratchpad/`:
`prod/` (production), `proto-b/` and `proto-b768/` (what these notes ask for), `proto-a/` (the
66ch cap and the Date under the number, which I'm advising against).

Today's merge days: 10 (13, 14, 16, 17, 19, 20, 21, 22, 23 and 24 Oct), plus Undated, so 11 header
rows over 29 revisions. Every new rule is scoped to `.rev-log`: `/`'s revision block shares `.rev`
and must not move.

## 1. The day group's header row

One `tbody` per group, its first row holding only the header, across all seven columns:

```
<tbody>
  <tr><th scope="rowgroup" colSpan={7}>Sat 24 Oct<span className="rev-day-n"> · 4 revisions</span></th></tr>
  …rows…
</tbody>
```

The span is for colour only; the cell's text stays the contract's words ("Sat 24 Oct · 4
revisions"). "Undated" has no span.

- **Type, every width:** the table's own size (`--step-sm`, 13 px), the text face, `700` in ink
  (`--foreground`) for the day, `400` in graphite (`--muted`) for " · 4 revisions". No caps, no
  tracking, no display face: it's a heading inside a drawing's table, and the air above it does the
  separating. Both schemes take the tokens as they are; nothing new.
- **Rule:** none of its own. The previous group's last row keeps its hairline, then air, then the
  day, then its rows with no line between the header and the first row, so the day binds to what
  follows. A second ink rule per group (I tried it) is ten more heavy lines than the frame has.
- **Spacing** (padding on the `th`; the row's left edge is the Rev column's, x = 40 from 1024):

| Width | Header padding | First group's | Gap above / below (with the rows' own padding) | Header height |
|---|---|---|---|---|
| ≥ 1024 | `18px 0 4px` | top `12px` | 25 / 11 px | 39 px (33 first) |
| 640 to 1023 | `14px 0 0` | top `8px` | 27 / 13 px | 31 px |
| < 640 (folded) | on the `tr`: `24px 0 0` | top `18px` | 32 / 8 px | 41 px (35 first) |

- **The fold below 640 is the trap:** `.rev tbody tr` is a five-column grid there and `.rev tbody
  th` spans two (three under 384) grid rows, so a header row left alone lands in the 36 px number
  column. The header's `tr` and `th` both take `display: block` (and `padding: 0` on the `th`); no
  `border-bottom` on the `tr`.
- Its `th` is also each row's `:last-child`, so `.rev :is(th, td):last-child`'s zero right padding
  applies: fine. Nothing sticks or moves.

Cost, measured: 11 headers add 427 px at 1440 and 443 px at 390. `/log` goes 1,469 → 2,004 px at
1440 and 3,207 → 3,755 px at 390 with the lines figure. The cadence is the payoff: "Wed 21 Oct · 6
revisions" is read in one glance where 29 dates aren't.

## 2. The Date cell beside a header that names the day

Inside a group every Date repeats its header. That is fine as a column and wrong as a field.

- **From 640, a column:** last, after Approved, as the frame puts it; head "Date" at `w-[52px]`;
  the cell `white-space: nowrap` in **graphite** (`--muted`, 5.9:1 on the film, 7.8:1 at night), so
  the column reads as the group's day restated, not a new fact. In ink (I tried it) it competes with
  the signatures. An Undated row's cell is empty.
- **Below 640, folded: my recommendation is that the cell is read by assistive tech only** (the
  clip the folded heads row already uses: `position: absolute; width: 1px; height: 1px; overflow:
  hidden; clip-path: inset(50%); white-space: nowrap`), because the header right above names the
  day and the fold has no room for a fifth field: a fifth column squeezes the signatures to 52 px
  ("Forge, Pixel" and "Approved" wrap), and the only clean slot, under the number, costs every row
  10 px (89 → 99 px at 390, the number's 44 px target now fills the first line alone) and puts
  "Date 24 Oct" under "Sat 24 Oct" up to six times running (`proto-a/log-390-light.png`). With it
  hidden the rows stay production's 89 px (`proto-b/log-390-light.png`). **This changes the
  contract's words and Probe's B5.12 fold assertion, so it's Atlas's call** (below).
- **If Atlas keeps the words**, the fold puts the Date under the number: `.rev-log` rows
  `grid-template-columns: 2.75rem repeat(4, minmax(0, 1fr))` (`2.75rem repeat(2, …)` under
  384), the row's `th` and the description `grid-row: 1`, the Date `grid-column: 1; grid-row: 2`
  (the signatures then auto-place into row 2's other columns, and at 320 into rows 2 and 3), and
  `td[data-label]:empty::before { content: none }` so an Undated row shows no orphan label.

## 3. The lines figure

The frame's setting, in the header, after the count line: a 1 px ink rule, the figure in the
display face, the rest of the sentence under it in graphite. One `p`, so its text is the contract's
sentence exactly (Probe's reader takes the innermost element holding the whole phrase, by
`textContent` squashed, so the block span is safe):

```
<p data-…="" className="log-lines">
  <span className="log-lines-n">64 of 5,288 lines</span> of the site's code are still original:
  1.2%, by git blame on app, components and lib at <span translate="no">0fcb84f</span>.
</p>
```

- `.log-lines`: `order: 4` below 1024 (the count line is 4 too; DOM order keeps it after);
  `margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--foreground); color:
  var(--muted)`; it inherits `.log-head p`'s 66ch cap, 1.45 and `text-wrap: pretty`.
- `.log-lines-n`: `display: block; margin-bottom: 2px;` the display face (`var(--font-sofia-cond)`,
  as the `h1`), `--step-xl` (24 px at 390, 30 at 1440), `700`, `line-height: 1.1`, ink. It's the
  ship of Theseus in one number, so it's the header's second voice after "Log"; the percentage stays
  in the sentence as the contract words it.
- Measured: at 1440 the block is 334 to 431 px down the first screen; at 1024, 347 to 465 (three
  lines at 312 px); at 390 it sits between the count line and Every revision's 2 px rule, as the
  390 frame has it. The drawing centres on the taller header from 1024, so the hull sits about 57
  px lower; it still reads as one row.
- The hash is text, not a link: a commit link is a fair follow-up, not this sprint's.

## 4. Description's measure at 1440: drop the 66ch cap

My rider on #77 asked for Description near 66ch. Prototyped with the real goals and the groups, it
is worse (`proto-a/log-1440-light.png`): at 66ch (537 px) 12 of the 29 goals wrap to two lines
(revisions 22, 21, 20, 15, 14, 13, 11, 10, 9, 7, 4 and 3), the rows lose their even 32 px rhythm,
and the table stops at x = 918 with a 506 px void beside it under the header column, 1,600 px
deep. Full width (`proto-b/log-1440-light.png`) keeps every goal on one line, none wrapping
(Description 1,019 px, 127ch, the longest goal 137 characters), and the hairlines carry
the eye to the signatures, which is how B5a shipped at 8.2. **So: no cap; the table spans both
columns on `/log` as it does now, and Description stays whole on as many lines as it takes.** A
contract word change, but nothing Probe checks (no assertion reads the measure).

## 5. The record's Date pair

"24 Oct 2026, 03:36 UTC" before Pull request, as the contract says. At 320 the `dd` is 156 px and
the line breaks; let it break after the comma: `<span className="whitespace-nowrap">24 Oct
2026,</span> <span className="whitespace-nowrap">03:36 UTC</span>` (a span, not an NBSP, so the
text keeps its real space). The `h2`'s `text-wrap: pretty` as decided.

## 6. Words for Atlas (Probe checks some of them)

1. **Change, B5.12:** "Below 1024 the cell folds under the row's number like the others, labelled
   'Date'" → "Below 640, where rows fold, the Date cell is read by assistive tech only, as the
   folded heads row is: its group's header names the day." Two facts either way: the fold is below
   640, not 1024 (`.rev`'s `40rem`; my sprint 30 review noted the same of B5a's contract), and
   Probe's assertion at 390 (the cell shown with a "Date" label) would become "the cell's text is
   the oracle's and its group header is above it". As written, a clipped cell would still pass that
   assertion (1 × 1 px rect, the label in `::before`), which is exactly why the words must change
   rather than the build slipping past them.
2. **Drop:** "at 1440 its measure stays near 66ch (Iris's rider on #77)" (section 4).
3. **Keep "Date"** (your question): it's the head a drawing's revision table uses, and on `/log`
   every row is a merged revision, so no reader asks "date of what". "Merged" says it a little more
   exactly for an engineer; not worth the owner's time or C4.4.
4. **Keep "Undated"**, first, with no count: short, the drawing's own word, and the header is set
   exactly like a day's (no colour, no italics), so it reads as a state, not an error. One thing to
   know: since a sprint's record is committed in the next sprint's PR, production will show its
   newest revision as Undated from every merge until the next one, so "Undated" will be the first
   word of the table on production nearly all the time.

## 7. What I'll check at review

The header rows at 320/390/768/1024/1440 in both schemes and in forced colours (they use no
background or shadow, so nothing to lose), the open row's box on `/log/13` with the Date as its
`:last-child`, `/`'s revision block unchanged (pixel diff), axe on `/log` and three records, the
lines block in the first screen at 1440 × 900 and 1024 × 768, CLS 0, and 320 with no sideways
scroll.
