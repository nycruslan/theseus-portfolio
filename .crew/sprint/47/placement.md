# Ka: where the keel sits and how it reads (Iris, sprint 47)

Made against production's `/crew` (live feed, 2026-11-02) with the keel's markup and CSS injected
after the panel, at every kept viewport, light and dark. Scripts and shots:
`scratchpad/iris/keel-proto.mjs` (my session's scratchpad). Forge builds from this file; Probe takes
K6's and K7's placement-dependent parts and the six sentences from it.

## The call: (a), with the drawing held through the keel

The keel is its own section under the panel, in the panel's column, from 1024 px; below 1024 it
follows the panel at full width, as everything there is one column. The drawing stays stuck beside
it the whole way down. The hull you're reading about stays in view while you read the rules it's
built under, and the page reads in two halves, Crew and Keel.

- **(b) is out.** A full-width band ends the drawing's sticky range at its top, so the drawing
  scrolls away as the band arrives. K7 says it must still be stuck when the keel's `h2` is at the
  viewport's middle.
- **Rejected (c)s:** the left column under the drawing (the stuck drawing would cover it, and it
  would meet `[data-model]`, against K6), and a band across both columns at ≥ 1440 only (the same
  problem as (b)).

| Window | Keel's box (x, top, width × height) | Drawing, keel's `h2` at mid / at page end |
|---|---|---|
| 1440 × 900 | 824, 1274, 600 × 1107 | top 72 / 72 |
| 1536 × 715 | 920, 1274, 600 × 1107 | 72 / 72 |
| 1024 × 768 | 582.8, 1321, 425.2 × 1334 | 72 / 72 |
| 768 × 1024 | 0, 1583, 768 × 1141 | not sticky (one column) |
| 390 × 844 and 390 × 664 | 0, 1622, 390 × 1420 | not sticky |
| 320 × 568 | 0, 1820, 320 × 1595 | not sticky |

Its top is the panel's foot, so it starts below the fold at every kept window, and the LCP element
doesn't change. The panel's height follows the feed (it ranged from 1156 to 1202 at 1440 in my
runs), so the keel's top moves with it. In the prototype, axe with B4.24's strict tags found
nothing in the keel at all seven windows in both schemes, nothing scrolled sideways, and
`[data-model]`'s right edge equalled the keel's left edge (824 = 824, 582.84 = 582.84): they touch
and don't overlap.

### The grid, from 1024 (`app/globals.css`, the `.crew-page` block)

- A sticky element sticks only inside its grid area. Today the drawing's area is row 1, the
  panel's height. So pin the drawing on both axes, over two rows: `.crew-drawing { grid-area: 1 /
  1 / span 2 / 2; }`. Give the keel `grid-column: 2`, and it lands in row 2. The panel stays
  auto-placed in row 1, column 2. Pin both axes, because a grid item with only a definite row moves
  into new implicit columns (sprint 39).
- The keel carries the panel's 1 px ink left rule, so the column's rule runs unbroken to the end of
  the page. A 2 px ink rule across the column's top opens it, as `.crew`'s top rule opens the panel
  below 1024 and the title block opens on `/`. Padding is the panel's: 24 24 40 from 1024, and 16 16
  40 below.
- Nothing in the panel or the drawing moves: the prototype's panel (824, 72, 600 × 1202.1) and
  drawing (16, 72, 808 × 478.5) at 1440 equal production's.

## The markup (K1's shape, plus the hooks the CSS needs)

```html
<section aria-labelledby="keel" class="keel">
  <h2 id="keel">Keel</h2>
  <p class="keel-lead">{the contract's lead}</p>
  <ol class="keel-rules">
    <li value={n} data-rule={n} data-kind="binds | guidance">
      <p class="keel-sentence">{sentence}</p>
      <p data-enforcer class="keel-enforcer"><span class="keel-verdict">Enforced by GitHub:</span> the protect-main ruleset</p>
      <blockquote cite={href} class="keel-quote">{text}</blockquote>
      <p class="keel-source"><a href={href} class="{the panel's LINK}">{path}, lines {start}–{end}</a></p>
    </li>
  </ol>
</section>
```

- **`value={n}`** keeps each rule's own number in the native marker, so a dropped rule leaves a
  visible gap (1, 2, 4…), as the interface's `n` does.
- **`data-kind`** is `guidance` when the label starts with "Guidance only" (K5's own test), and
  `binds` otherwise. It's derived in the component, so `KeelSpec` doesn't change.
- **The verdict span** is the label up to and including its first colon, or the whole label when it
  has none ("Enforced by the gate check", "Enforced by Lens's review"). The label's `textContent` is
  unchanged.
- **The link text** is `{path}, line {start}` when the quote is on one line, and
  `{path}, lines {start}–{end}` (en dash) otherwise, e.g. "CLAUDE.md, lines 60–61" or
  ".github/CODEOWNERS, line 8". Each one differs, so the six accessible names are unique. Use the
  panel's `LINK` classes (`components/crew.tsx`) as they are: ink, a 1 px underline, 2 px on hover,
  and `.crew-link`'s 44 px target below 1024 and 24 px from it.
- The link sits outside the blockquote, so the blockquote's text is the quote alone.

## The type: existing tokens only, and no code face

The quotes are set in the text face, not a code face. A system monospace stack would be the only
face on the site outside the Sofia family (one family, two widths), and it would render differently
on every OS. The quote reads as quoted prose under its own rule, and the link names the file. Code
words (`protect-main`, `check`, `gate`, `lens`, `merge.mjs`) get no separate face, because the
parentheses in rule 1 already carry them.

| Part | Face and size | Weight, colour | Spacing |
|---|---|---|---|
| `h2#keel` | `var(--font-sofia-cond)`, `--step-entry` (30–36 px), line-height 1.05, −0.01em | 700, `--foreground` | /read's section-head step; a step under the panel's "Crew" |
| Lead | text face, `--step-base`, 1.55 | 400, `--foreground` | `margin-top: 12px`; `max-width: 66ch` |
| `ol` | `list-style: decimal` (preflight removes it) | | `margin-top: 24px`; `padding-left: 24px` |
| `li` | | | `margin-top: 24px` (0 on the first); `padding-left: 8px` (the marker's gap); `max-width: 66ch` |
| `li::marker` | `var(--font-sofia-cond)`, `--step-lg`, tabular numerals | 700, inherits ink | the crew table's name face. Safari may ignore the font and show the text face, which is fine. |
| Sentence | `--step-base`, 1.5 | 600, `--foreground` | |
| Enforcer label | `--step-sm`, 1.5 | see below | `margin-top: 4px` |
| Quote | `--step-sm`, 1.5 | 400, `--foreground` | `margin-top: 8px`; `padding-left: 12px`; the rule below |
| Source | `--step-sm`, 1.5 | link as the panel's | `padding-left: 13px` (on the quote's text edge) |

Add `overflow-wrap: break-word` on `.keel`, never `anywhere`: `anywhere` drops every descendant's
min-content to one character (sprint 31). Add `@media print { .keel-rules > li { break-inside:
avoid; } }`.

## Binds against guidance: ink against pencil

The site's grammar already says it: ink is fixed and pencil can be rubbed out. A rule that binds is
inked; a rule that only guides is pencilled, and a shell command can rub it out.

- **Binds** (rules 1–4): the verdict ("Enforced by GitHub:", "Enforced by the gate check") is set at
  600 in ink, with the rest of the label at 400 in ink. The quote hangs from a **1 px solid
  `--foreground`** rule.
- **Guidance** (rules 5–6): the whole label is at 400 in **`--muted`** (graphite), and the quote
  hangs from a **1 px dashed `--muted`** rule, the pencil plank's edge without its hatch, since the
  hatch means "in progress".
- So down the left edge of the labels a reader sees four bold "Enforced" and two graphite
  "Guidance only", with solid rules beside four quotes and dashed ones beside two. In forced colours
  the weight and the solid against dashed line both survive; I checked at 1440 dark. In print the
  borders print.
- **Not used, on purpose:** boxed numbers (on this site a boxed number is a sprint's plank, so a
  boxed "4" reads as sprint 4), status dots (the table's Working/Waiting/Done grammar), pills or
  badges, icons (no shields or locks), eyebrow labels above the sentence, a side stripe wider than
  1 px, and any tint or fill.

## Nothing copper

`--accent` appears nowhere in the keel, in any state, scheme or mode, and that includes hover and
focus. Focus is the site's ink ring.

## The six sentences (Probe's oracle takes these)

Rules 1 to 4 are unchanged. I tightened 5 and 6.

1. Nothing merges until three checks pass: the tests, the gate and Lens's review.
2. A change to the crew's own rules, or to how its work is judged, waits for Ruslan's approval.
3. Ruslan's facts are his: the crew drafts, he approves.
4. No test is weakened to get a pass unless Lens accepts the reason.
5. The agents who build don't edit the tests they're judged by.
6. Every session acts on GitHub as Ruslan, so a pull request that passed on his approval is left
   for him to merge by hand.

- **Rule 5:** "can't" became "don't". Its own label says "Guidance only: … which a shell command
  can get around", so "can't" contradicted the label in the same item. "Don't" claims what guidance
  can honestly promise. That narrows the draft's wording toward what's true, the way the plan does.
  If Atlas reads it as a changed claim, the draft goes back with no other change.
- **Rule 6:** same claim, plainer words: "reaches GitHub" became "acts on GitHub", "his approval
  let through" became "that passed on his approval", and "by hand" is the quote's own.

## What Forge must measure and report

1. **The sticky drawing (K7):** from 1024, the drawing's top is 72 with the keel's `h2` at the
   viewport's middle and at the page's end, at 1024 × 768, 1440 × 900 and 1536 × 715.
2. **Nothing above moves (K7):** the drawing's, panel's, `h1`'s, table's and `[data-rules]`' boxes
   at 1440 × 900 and 390 × 844 equal main's (dfe9f86) within 0.5 px, on the default server and the
   live fixture.
3. **The hull never covers it (K6):** on Full at rest with WebGL on, `[data-model]`'s and its
   canvas's right edge is at most the keel's left edge at 1024, 1440 and 1536. They abut exactly in
   my prototype, so read the canvas too, not only the layer.
4. **A live poll while the reader is at the keel:** on the live fixture at 1440 × 900 and
   390 × 844, scroll the keel's `h2` to the middle, let a poll add a moment, and read the
   layout-shift entries (`hadRecentInput` false). The panel above grows; scroll anchoring should
   hold the keel still, since the moments are inserted above the viewport. Report the sum. It isn't
   a contract gate, but the rubric says nothing shifts after load.
5. **Line counts at 320 and 390:** rule 1's label takes two lines at 320 and rule 5's at 320 and
   390. Nothing else in the keel should wrap more than the prototype's counts (quotes 4/2/2/3/2/4
   lines at 320).
6. **CLS 0 at load and the LCP element** at 1440 × 900 and 390 × 664: the keel is below the fold
   there, so neither should change.
