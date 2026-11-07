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
