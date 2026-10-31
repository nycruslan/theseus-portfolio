# Sprint 34 (B4b): Iris's calls on the fold, the rest line, the pencil and the copper

Iris, 2026-10-31, for Quill's contract and Forge's and Pixel's build. Measured on production
(https://theseus-portfolio.vercel.app, main at `0c033a8`), fonts warm, by injecting the markup
below into the live page with Playwright (scripts and screenshots in my scratchpad, not git).
Production today: 32 merged sprints, every one of the 22 planks seated ("22 planks: 22 replaced,
0 original"), so sprint 34's pencil plank is `ORDER[32 mod 22]` = **4.0**, a seat sprint 11
holds today: the pencil plank is a plank being replaced a second time.

## 1. The fold at 1440 × 900: no trade. The rest line goes above the table, five rows stand

**The call.** At rest the rest line is the revision block's first line under the heading and
caption, before the table, as `rest-1440.webp` places it; the block keeps five rows in every
state; nothing goes in the footer row. B1.5 stands as written, and B1.1 holds in the rest fixture
at 1440 × 900 with no rewrite.

**Why it costs nothing at 1440 × 900.** The plan's premise ("the rest line does cost height") misses
sprint 25's `.sheet-row` minimum height: from 1024 px the bottom row is held at
`min(21rem, 100svh − 88px − (100vw − 34px) × 0.3381)`, 336 px at 1440 × 900, and the revision block's
own content is 295 px of it. The table ends at 791 and the foot (count, legend, Log link) is pushed
to 842 by `mt-auto`: **41 px of slack**. The rest line is one 13 px line (19.5 px) plus the block's
10 px gap: 29.5 px, inside the slack.

Measured, production with the rest line injected above the table:

| Viewport | Contact links' bottom, before → after | Fifth row's bottom, after | Row height |
|---|---|---|---|
| **1440 × 900** | **866.3 → 866.3** (33.7 px above the fold) | **820.2** | 336 → 336 |
| 1920 × 1080 | 1028.6 → 1028.6 | 982.4 | 336 → 336 |
| 1024 × 768 | 728.6 → 758.1 (9.9 px inside) | 700.1 | 339 → 368.5 |
| 1280 × 800 | 776.9 → 799.6 (0.4 px inside) | 765.1 | 300.7 → 323.3 |
| 1366 × 768, 1440 × 800, 1536 × 864 | already below the fold today (809.8, 838.5, 871.0); +16 to +19 px | inside | content-tall |

Where the block is content-tall (shorter windows, and 1024) the row grows by the line; where the
viewport sets the row (1440 × 900 and taller) nothing moves. The windows already failing are
production's, not this sprint's: the drawing is 475 to 508 px tall there.

**Why not trade a row.** Trading one row at rest would buy 2.4 px everywhere, and the rest state is
the one most visitors see: they'd lose a fifth of the record to gain margin only at window sizes
the contract doesn't name. The row is the sheet's evidence; the line is one fact. Keep both.

**Below 768.** The same place, in the DOM and on screen: the revision block's first line after the
caption, before the folded rows. At 390 × 844 it sits at 750 to 770 px, inside the first viewport
(the title block's links don't move: they're above it). At 320 it wraps to two lines, which is
fine with the nowrap spans in call 2.

**Its look.** `p[data-rest]` at `--step-sm` (13 px, the table's size), line-height 1.5, ink; "Crew
resting." at weight 600, the rest at 400. No rule, no box, no icon, nothing copper (resting is not
live). Not a link: the line's action is B4e's Replay, and the bar's Crew is one glance up.

**Riders for later sprints.** B4e's Replay beside this line must stay a 24 px target on the same
line (a 32 px button, as the frame draws it, takes the last 11.6 px of slack and 1 px more).

## 2. The rest line's copy: state the merge, word for word as `/crew` does

**The call.** B4a's wording, not the plan's "Last plank seated": the feed's `last` is the newest
merge, and the newest seat on the drawing is the highest-numbered retro; the two can name different
sprints (#75, sprint 28, merged after #76, sprint 29), and a preview behind main has no seat for
`last` at all. "Merged" is true in every one of those cases; "seated" isn't. One fact, one
sentence on both pages: `/`'s rest line is `/crew`'s `[data-status]` text exactly.

Exact copy (B4a's contract, "The status line", `resting`):
- "Crew resting. Sprint {last.sprint} merged {d Mon}, {HH:MM} UTC." — today "Crew resting. Sprint
  33 merged 31 Oct, 01:50 UTC."
- `mergedAt` null or unparseable: "Crew resting. Sprint {last.sprint} merged."
- `last.sprint` null: "Crew resting."

`{d Mon}` and `{HH:MM}` as `/crew` formats them (UTC, no leading zero on the day, 24-hour, zero
padded). Two `white-space: nowrap` spans keep the pairs whole when the line wraps at 320:
"Sprint {n}" and "{d Mon}, {HH:MM} UTC" (spans, not NBSPs, so the textContent keeps real spaces).
The `time` element is welcome on the date and time (`datetime` = `mergedAt` as `toISOString()`),
if Forge wants it; the visible text is the same.
