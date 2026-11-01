# Sprint 39: where the particulars go (Iris)

**Call: (b), the band's empty corner under the body plan, from 1280 px.** Below 1280 the table
leaves the band (a strip row of the frame from 1024, a table after the title block below that).

Why (b), not (a):

1. **It fits, with room, and nothing moves.** At 1440 × 900 the table sits at x 947 to 1395, y 408
   to 531: 67 px under the nearest lettering ("Base"), and 44 px right of the planks' boxes, which
   leaves 20 px of clearance after P4 grows them by 24 px. The hull and its shadow paint 0 px of the corner in every loft frame I sampled (0 to 4 s,
   at 1440, 1280 and 1024), and P4's pixel test, run as the contract words it, matched 100.000% at
   1440 and 1280 in both schemes. B1.1's items don't move a pixel.
2. **(a) shrinks the drawing to make room for text.** That's the trade the owner rejected (the 3D
   stays the hero; get clarity by hierarchy, never by demoting it), and it pulls Pixel and every
   3D suite in for 80 px.
3. **It reads as what it is**: the drawing's own table of particulars, at the drawing's lettering
   size, its left edge on the DWL and Base lettering, its right on the title block's text, standing
   on the title block, which is where a draughtsman puts it.

Why not the corner below 1280: it scales with the drawing and the text doesn't. At 1024 it is
335 × 139 px, and four rows at 13 px need 159 px or more there.

## What I measured

Production, 2026-11-01, Playwright Chromium at DPR 1, warm font, WebGL refused unless I say
otherwise. Light and dark gave the same geometry everywhere. "Corner" means the largest clear
rectangle anchored at the band's bottom-right, from the drawing's painted pixels.

| Size | Band (y) | Clear corner | Planks' union | Title block links (y) | Hull and shadow, Full (whole loft) | The table, this spec |
|---|---|---|---|---|---|---|
| 1440 × 900 | 72–547 | x 942–1420, y 343–544 (478 × 201) | x 93–903, y 142–321 | 840–866 | x 75–912, y 179–476; 0 px in corner | x 947–1395, y 408–531 |
| 1280 × 800 | 72–493 | x 834–1260, y 312–490 (426 × 178) | x 84–802, y 134–293 | 791–817 (already 17 px below 800 on production) | x 69–810, y 168–430; 0 px | x 841–1235, y 336–477; 25 px under "Base" |
| 1024 × 900 | 72–407 | x 669–1004, y 264–403 (335 × 139) | x 71–641, y 121–247 | 726–752 | x 54–656, y 148–360; 0 px | strip x 16–1008, y 769–849 |
| 768 × 900 | 52–312 | x 506–765, y 199–308 (259 × 109) | x 42–484, y 90–188 | 534–578 | — | x 0–768, y 602–708; revisions 602 → 732 |
| 390 × 844 | 52–312 | none (the narrow drawing fills its width) | x 20–332, y 97–166 | 585–629 | — | y 653–812 (32 px to spare; 834 with the fallback face); revisions 653 → 836 |
| 360 × 640 | 52–292 | none | x 19–307, y 94–157 | 588–632 | — | y 656–815, below the fold, like the revisions today (not a P3 size) |

- The h1 is 104 px at 1440 and 60 px at 390. The table's text is 13 px at every width.
- Without the web font (every `.woff2` blocked), the fallback face kept the same geometry at 1280
  and fewer wraps at 1440. At 390 the bio gains a line and the table ends at 834.
- **`[data-plan] text` matches 0 elements at every width.** The drawing's lettering is HTML
  (`.plan-view > span`), so P4's text clause can't fail. My spec keeps the table clear of every
  lettering span as well. Needs decision (Quill, Probe): aim the clause at
  `[data-plan] .plan-view > span` if it's meant to bite.

## The spec

### Markup: `components/particulars.tsx`, a server component

```tsx
<dl data-particulars="" className="particulars">
  <div>
    <dt>Leads</dt>
    <dd>a team of 7 across AI research, backend and platform</dd>
  </div>
  {/* Reach, Gateway, Impact, the same way, as the rule returns them */}
</dl>
```

- In `app/page.tsx`, after `<TitleBlock …/>` and before `<Revisions …/>`. Never between
  `<LinesPlan>` and `<Model>`, because `[data-plan] + [data-model]` keys the hollow drawing and the
  plank numbers' z-index.
- **Each `dd` is one string, one text node.** No spans, and no `{" "}` joins: React writes
  `<!-- -->` between adjacent text children, which would break P1's "phrases in `GET /`'s HTML".
  The hyphenated words stay whole through `text-wrap: balance` alone. I scanned every 4 px from 320
  to 1920, with the real face and the fallback: no line ever breaks at a hyphen, no overlap with
  the drawing's lettering, no horizontal scroll.
- **First letter in lower case, as in the source.** The rule lowers it when the owner capitalises
  ("Cut manual processing…" shows as "cut manual processing…"). Do it in JS on the string, not
  with `text-transform` or `::first-letter`. Why lower case: these are quotes lifted from his
  sentence, and each reads as its term's value ("Leads a team of 7…"). Capitals would make four
  fragments pose as sentences.
- No heading, caption, `aria-label` or class names beyond `particulars`. The terms say what the
  rows are, and a heading would change B2.9's and C1's outline.

### `app/page.tsx`: pin the drawing in both axes

From 1280 px the table takes main's grid row 1 explicitly. The drawing must be placed explicitly
on both axes too. Otherwise auto-placement moves it into two new implicit columns. I hit this in
the prototype: main's `grid-template-columns` became `0px 0px 704px 704px` and the title block
shrank to 57 px. Give `<LinesPlan>` `lg:col-[1/-1] lg:row-start-1` in place of `lg:col-span-2`,
keeping its borders. Check in the browser that main's computed `grid-template-columns` still has
two tracks at 1024, 1280 and 1440.

### `app/globals.css`, after the revision table's block

```css
/*
 * The particulars (components/particulars.tsx; .crew/sprint/39/placement.md): the owner's scope
 * and scale in four ruled rows, lettered like the drawing and the revision table. Below 1024 px a
 * table of its own after the title block, inset like it; 1024 to 1279 a strip row of the frame
 * under the title block and the revisions; from 1280 the band's empty corner under the body plan.
 * Positioned so it paints above the model's layer where it lies on the drawing's box; it has no
 * fill and no box, so it never reads as a plank.
 */
.particulars {
  position: relative;
  margin: 0 0 24px;
  padding: 0 16px;
  font-size: var(--step-sm);
  line-height: 1.35;
}

.particulars > div {
  display: grid;
  grid-template-columns: 3.75rem minmax(0, 1fr);
  column-gap: 12px;
  padding: 4px 0;
  border-top: 1px solid var(--rule);
}

/* The head rule in ink, as the revision table's. */
.particulars > div:first-child {
  border-top-color: var(--foreground);
}

.particulars dt {
  color: var(--muted);
  font-weight: 600;
}

/* Balanced lines keep "multi-agent" and "firm-wide" whole at every width (320 to 1920 scanned). */
.particulars dd {
  margin: 0;
  text-wrap: balance;
}

/* 1024 to 1279: the corner is too shallow for the four rows, so they become a row of the frame,
   four across, each term above its phrase; row 2's bottom borders are its top. */
@media (64rem <= width < 80rem) {
  .particulars {
    grid-column: 1 / -1;
    grid-row: 3;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    column-gap: 24px;
    margin: 0;
    padding: 12px 24px 14px;
    border-inline: 1px solid var(--foreground);
    border-bottom: 1px solid var(--foreground);
  }

  .particulars > div,
  .particulars > div:first-child {
    display: block;
    padding: 0;
    border: 0;
  }
}

/* From 1280: in the drawing's row, at its foot, 16 px above the frame's line (the frame's bottom
   padding). Its left edge is on the DWL and Base lettering, 931.4 of the drawing's 1408 units
   across the 1 px frame; its right edge is on the title block's text, 28 px in from the frame's
   1 px border. */
@media (width >= 80rem) {
  .particulars {
    grid-column: 1 / -1;
    grid-row: 1;
    align-self: end;
    margin: 0 29px 16px calc(1px + (100% - 2px) * 0.66151);
    padding: 0;
  }
}
```

### Type and colour, all existing tokens

| | Size | Weight | Case, tracking | Colour | Contrast on the film (light / dark) |
|---|---|---|---|---|---|
| `dt` | `--step-sm` (13 px), line-height 1.35 | 600 | sentence case, none | `--muted` | 5.93:1 / 7.79:1 |
| `dd` | `--step-sm` (13 px), line-height 1.35 | 400 | as quoted, first letter lower | `--foreground` (inherited) | 15.10:1 / 14.59:1 |
| Rules | 1 px | | | first row's top `--foreground`; between rows `--rule`; none under the last (from 1280 the frame's line 16 px below closes it) | decorative |

These are the revision table's head style and the drawing's lettering size. 13 px is the largest
size that fits the corner at 1280. The bio keeps 16 to 17 px, so the order of reading stays name,
role, bio, particulars.

With the table injected into production, axe with B4.24's strict tags reported no violations on `/`
at 1440, 1024 and 390 in both schemes. At 1440 it listed the table's `color-contrast` as
*incomplete*, not a violation, because the table overlaps the drawing's box and the model's layer.
Compute P7's 4.5:1 against `--background`.

### It must not

- Move: no transition, animation, reveal, scroll-tied fade or `will-change` (P5). Its box is fixed
  at first paint. In the band, `align-self: end` sits on the drawing's own height, which comes from
  its viewBox, and the fonts are `display: optional`.
- Read as a plank: no fill, no ink box, no vertical rules in the band. Only the horizontal rules
  above.
- Use copper, bold or emphasis anywhere, or any size above `--step-sm`. The figures are the
  owner's words, set plain.
- Take a `z-index`. `position: relative` and its place after the model in the DOM already put it
  above the canvas.
- Grow past the corner from 1280: no `max-width` or `width` overrides that pull its left edge off
  the lettering line.
- Change `TitleBlock` or `Revisions`. Both are untouched at every width.

### Forge's browser check (beside P1 to P7)

- At 1440 × 900 and 1280 × 800: the table's box is within 1 px of the table above, and at least
  20 px under the nearest lettering above it.
- At 1279 and 1024: one 1 px line between row 2 and the strip, not two.
- At 390 × 844: the table's bottom is at or above 820 px.
- At 320: no horizontal scroll.
- Main's `grid-template-columns` has two tracks at every width from 1024.

Prototype and screenshots, not in git: the scratch scripts injected this CSS and markup into
production's `/`.
