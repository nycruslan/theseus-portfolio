# Ya: Iris's calls (sprint 53)

Prototyped by injecting this markup and CSS into production's pages (theseus-portfolio.vercel.app,
2026-11-07, CI's Chromium 156 shell, fonts warm, scripts off, then Full and Calm), at 320, 390,
768, 1024, 1280 and 1440, on /log, /log/1, 3, 13, 15, 23, 43 and 52, both schemes. Overflow was 0
everywhere. Scripts: my scratchpad, `iris/proto.js`, `proto.css`, `run-proto.mjs`.

**A step is a flip-book frame:** a step link changes planks, never places. Both drawings keep one
box on `/log` and on every `/log/n` at each width. So nothing above or between them varies by step:
the caption is one line, and every varying line (the count, the question, Start again) sits below
the ghost, or in the head's column from 1024.

## 1. Placement

**DOM order in `main`.** The kept checks pin the first half: the Foot is `.log-head`'s next element,
and the record follows the count line.
- `.log-head`: h1, ghost caption, count line, the question *or* Start again, `.log-lines`.
- Then the Foot, then the record.
- Then **`div.log-theseus`** (the drawing, then its caption), then the ghost, `[data-model]` and
  Every revision.
- The chunk's `host.previousElementSibling` stays the ghost, and the Theseus never matches
  `[data-plan]`, `[data-ghost]` or `:has(+ [data-model])`.

**Below 1024:**
- `.log-theseus`: `order: 2; margin-top: 16px`.
- `.log-theseus-caption`: `margin-top: 6px`, in `.log-head p`'s type (`--step-base`, ink, 1.45).
- `.log-ghost`: `margin-top` from 16 to `14px`, so 6 to its own drawing, 14 to the next.
- At 390 this adds **115 of the 123 px** above the record's h2.
  - /log/43's h2 moves from 595 to 710. B5.7's worst case is 710 + 126 = 836.
  - Sprints 40 to 52, the next tenth rows, are 63 or 95 px tall.
- On `/log` at 390, Start again is at 463 and Every revision at 707. The first row, at 877, is the
  B5.3 red the contract foresaw.

**From 1024** (the drawings start on the h1's top line):
- `.log`: `grid-template-rows: auto 1fr`. `.log-head`: `grid-row: 1 / span 2`.
- `.log-theseus`: `grid-column: 1; grid-row: 1; margin: 32px 0 0 24px`.
- `.log-ghost`: `grid-row: 2; align-self: start; margin: 24px 0 0 24px`.
- `.record, .log-revs`: `grid-row: 3`.
- The `1fr` puts a taller head's extra (1024: 393 px) below the ghost. Auto rows would open it
  between the caption and the ghost.
- **Pixel:** `.log-ghost + [data-model] { grid-area: 1 / 1 / 3 / -1 }`. The layer's
  `overflow: clip` hides the canvas in row 2 without it. With it, the canvas followed the ghost in
  Full.
- 1440 × 900, /log/13:
  - The Theseus is at 104 to 283, its caption at 289, the ghost at 338 to 517.
  - The record and Every revision start at 557, the step links at 578 and the h2 at 610.
  - /log's first row is at 737.
- **The record moves down 86 px at 1440, my call against "doesn't move".** It keeps the record's
  frame and Every revision's rule on one line, as today. A still record leaves a hole beside the
  drawings or needs the ghost wrapped. At 1024 the record stays at 505.

**The Theseus drawing:**
- The ghost's profile, box and scale. `class="plan log-theseus-drawing"` around
  `.plan-view.plan-theseus`.
- `.plank-seated` and `.plank-original` fills as on `/`, and the default ink `.ln-outline`.
- Lettering exactly as the ghost's per width, hidden below 768. A leader shows only with its number.
- The current plank: a 2 px ink edge, drawn last, its number at 700. In forced colours, 2.5 px
  CanvasText.

**The record's head row:**
- `Rev n` stays at the left. **The step links take Close's place at the right**:
  `div.record-steps { display: flex; gap: 16px; margin-left: auto }`.
- Each link copies `.record-close`: inline-flex, 44 px (24 from 1024), `--step-sm`, 600, nowrap,
  `.record a`'s underline.
- Arrows are `aria-hidden` `inline-block` spans, so the underline skips them, set 4 px off.
- It fits at 0 px: 41 + 16 + 70 + 16 + 146 = 289 px, against 324 at 390, 310 at 1024 and 394 at
  1440.
- Below `22.5rem`: `.record-top { flex-wrap: wrap; row-gap: 0 }` and
  `.record-steps { flex-basis: 100%; justify-content: space-between }`, with `[data-step=next]`
  `margin-left: auto`. At 320 that adds 20 px, where no fold check runs.
- **Close moves to `.record-foot`'s right**, with its row, its rule and its name. All four links
  don't fit one row at 390, and a row of their own breaks the 123.

**Start again and the question** go in `.log-head`, right after the count line, with `order: 4`.
- **Start again:** `p.log-start` at `margin-top: 2px` (8 from 1024). Its link looks like "Read as
  page": `--step-base`, 600, ink, a 1 px underline at a 6 px offset, 2 px on hover, inline-flex 44
  px (24 from 1024).
- **The question:** `.log-head .log-question { margin-top: 12px; font-size: var(--step-lg);
  font-weight: 600; line-height: 1.3; text-wrap: balance }`, in ink.
  - Body face: the display face stacked three condensed blocks and fought the lines figure.
  - It sets 2 lines. On /log/23 at 390 the next link is at 703.

## 2. The words (Probe quotes these)

| Hook | Visible | Accessible name |
|---|---|---|
| `a[data-step="previous"]` | `← Sprint p` | `Back to sprint p` (in an sr-only span, the visible text `aria-hidden`) |
| `a[data-step="next"]` | `Seat sprint q's plank →` | `Seat sprint q's plank` |
| `a[data-step="start"]` | `Start again from sprint 1` (1 is `MERGED[0]`) | the same |
| `p[data-theseus-caption]` | `The Theseus after sprint n`; on `/log`, `The Theseus today, after sprint N` (the newest) | text |
| `p[data-yard-question]` | `The ghost hull is whole again. Which one is the Theseus?` | text |

- Straight apostrophes. "sprint n" goes in a `whitespace-nowrap` span. The question is one string,
  since `{" "}` puts `<!-- -->` in the SSR HTML.
- **The question is reworded.** On /log/23 the count line has just said "All 22 original planks are
  out", and the default's "No original plank is left" said it again. "Whole again" adds the ghost's
  side: the original ship reassembled from what the crew removed.
- B5.6's rewrite is the two names. The hrefs stay, and Close keeps "Close revision n".

## 3. Full and Calm until Yc: one yard, and the drawing changes nothing

I checked the prototype over the real 3D ghost on /log/23, whose ghost is `GHOST_AT(23)`, at 1440
and 390.
- The canvas sits exactly on the moved ghost.
- Both hulls share one text edge, one length and the same numbers seat for seat. The ends agree
  within about 4 px at 1440 and 8 px at 390.
- It reads as the yard's two halves: the ship as drawn, in ink, over its lofted ghost, which
  recedes. That's the right order.

**The Theseus is the Off drawing in every mode.** Nothing keys it to `[data-model]` or
`[data-state]`; nothing fades, hollows or moves, and there's no fake shading. So Y6 holds by
construction.

**Dark scheme, seen and accepted:** the night card and the vellum read alike. There the pair reads
as numbered against unnumbered, not as card against grey. I keep the site's `.plank-original`.

**For Yc:** both hulls take one rest pose. The phone's turned ghost is the one place the
silhouettes disagree.

**Not settled:**
- The 3D ghost with gaps, which is Pixel's.
- The feel on a real phone.
- Whether a 13 px "Seat" link is press enough. It is for Ya's link floor, and Yc's press should own
  a stronger control.

## Addendum: the phone row at the band's head (B5.25 at 320 × 568)

The red Probe's mutant found is real: B5.25 holds Full, Calm and Off wholly in 320 × 568 on /log
and /log/13, which leaves 29 px today (the row ends at 539).
- B5.1's header-end check needs every `.log-head` line above the row.
- Those lines alone end at 483 at 320.
- So no Theseus fits above a row at the header's end. The Theseus is 57 px tall at 320 before its
  caption.

**The call: below 768 the row moves from the header's end to the drawing band's head, under the h1.**
This is `/`'s rule since Wb, where the row hangs at the band's head. It also keeps sprint 31's
reason for the old place: the row never parts the ghost from its caption, and Tab still meets it
where the eye does.

**This replaces the order below 1024 and Start again's place in section 1.**

- **DOM:** `.log-head` [h1, ghost caption, count, the question, `.log-lines`] → Foot →
  **`p.log-start`** (on `/log` only, the Foot's next sibling, no longer in `.log-head`) → record →
  `.log-theseus` → ghost → `[data-model]` → Every revision.
  - Start again had to leave `.log-head`. Inside it, Tab from Contact reaches Start again before
    Read as page, which breaks B5.1's Tab clause, and B5.1 was red in my first spec too.
  - The question stays in `.log-head`: it holds no link.
- **Orders below 1024** (`.log-head` is `display: contents`): h1 1; Foot 2 (`.log > .foot`, below
  768, `margin: 12px 0 0`); `.log-theseus`, `.log-ghost` and `.log-ghost + [data-model]` 3; ghost
  caption 4; count line and question 5; `.log-start` 6; `.log-lines` 7; `.record` 8; `.log-revs` 9.
  - Margins as in section 1: the Theseus 16, its caption 6, the ghost 14.
- **From 1024:**
  - `.log-start { grid-column: 1; grid-row: 3; margin: 16px 0 0 24px }`, under the ghost, the
    yard's control where the canvas drew it.
  - `.log:not(.log-open) .log-revs { grid-row: 4 }`. Records are unchanged.
- **Measured on production with the markup injected**, overflow 0 everywhere:

| Where | What |
|---|---|
| 320 × 568, scripts on, /log and /log/13 | the row 133–177, Off 133–177 (391 px of room); the Theseus 193–250, the ghost 294–351; the canvas on the ghost |
| 390 × 844, /log | the row 133–177; the Theseus 193–264; the ghost 308–379; Start again at 519; Every revision at 707 |
| 390 × 844, records | next at 639 (/log/13) and 698 (/log/23); previous at 662 (/log/52) |
| 390 × 844, B5.7 | the h2 at 710 on /log/43, unchanged (+115 of 123) |
| 1440 × 900 and 1024, records | unchanged |
| 1440 × 900, /log | Start again at 533; Every revision at 619; the first row near 779 |

- **The flip book gets better.** Above the drawings there's now only the h1 and the row, the same
  on every page. On phones the motion control stands right above the 3D it controls.
- **Kept checks:**
  - One clause turns red: B5.1's `expectHeaderEndRow`, "the row (top) under the header's last line"
    (`e2e/log.spec.ts`, about line 396). The rewrite I ask Probe for: below 768 the row is still
    `.log-head`'s next element in the DOM, set under the h1's bottom and above `[data-theseus]`'s
    top, in one band.
  - The rest of that check stays green: one band, DOM order, 44 × 44, inside the viewport, and Tab
    from Contact to Read as page, Off, then out of the row.
  - B5.25 is green, its Tab clause rewritten as the contract already plans. B5.26 and phone-window
    (which reads `/` only) are untouched.
- **For the owner, undoable, nothing waits:** this moves the Log's phone row from the place he
  accepted with #78 (the drawing's foot) to `/`'s band head. The PR's retro should say so.
