## Sprint 69 (S): a long word in a heading stays inside the window

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): at
Chrome's "Large" font on a 320 px phone, the case study "Multi-agent orchestration platform" scrolls
sideways and cuts "orchestration" at the window's edge, and at "Very large" `/evals` cuts
"Groundedness". Found by Atlas's sweep of production on 2026-11-16 across every route family at
320 and 390 wide, 20, 24 and 28 px. During the build Forge found a second defect in the same rule,
this one at the default font: at 1024 to 1180 wide, `/evals` prints "Groundedness" over its own
result, "Failed, 6 of 10". The contract took it in (`contract.md`, Contract change).

**Size:** S. Contract: `.crew/sprint/69/contract.md`.

## What changed for a visitor

- **Case study titles and schedule heads (large font, small window).** `.doc-head h1` and
  `.sched h2` are capped at their column's width divided by their longest word's width in em:
  `min(step, (100vw - 32px) / 4.45)` and `/ 5.135`. "orchestration" and "Groundedness" now fit
  whole, with no hyphen and nothing hidden. At 16 px the cap is always above the step, so it never
  applies. The cap is shared, so `/`'s and `/ask`'s schedule heads also stop growing past their
  column at a large font on a small window (at 320 × 24 px, 78 → 56 px). Iris chose to keep it
  shared.
- **`/evals` from 1024 wide (default font).** The four category heads (`.sched-scores`, the
  `className` `Schedule` already takes) are sized to fit their three-column rail:
  `min(step, ((100vw - 344px) / 4 + 48px) / 4.45)`. That gives about 49 px at 1024, 58 at 1180,
  63 at 1280 and the step's 72 at 1440. "Groundedness" no longer prints over its result.
- **Backstop.** `overflow-wrap: break-word` on both rules, for a future title word wider than the
  cap allows. Today it moves nothing.

## Evidence

Right edges at 320 wide, before → after (the column ends at 304):

| Heading | 20 px | 24 px | 24 px, fonts blocked |
|---|---|---|---|
| "Multi-agent orchestration platform" | 321 → 280 | 386 → 280 | 336 → 245 |
| "Groundedness" | holds | 346 → 255 | 333 → 239 |

`/evals` at the default font: "Groundedness" ran to 311 against an area ending at 258 at 1024,
over "Failed" at 282. It now fits, with at least 5.2 px to spare even with a 15 px classic
scrollbar.

- **T28** (`e2e/headings.spec.ts`, new; Probe): `/evals` and the five case studies, at
  320 × 568 and 390 × 664, with a 20 and a 24 px default font, webfont and fonts blocked. No
  sideways scroll, and every h1 and h2 is inside the page and clipped by nothing (an
  `overflow: hidden` mutant stays red). Red on main in 3 of 8 tests, and the same on production.
- **T29** (same file): `/evals` and the case studies at the default font, 768 to 1440 wide. Each
  schedule h2 stays inside its grid area and overlaps no text in its section. Red on main and
  production at 1024, 1180 and 1280.
- Locally, `/evals`' category heads come only from the weekly report in Blob, which local and CI
  builds can't read. So both checks draw the categories with the real `Schedule` component, using
  the labels from `lib/evals.ts` and the report's result line. On production the real report
  shows instead, and the measures agree (346 at 320 × 24 px).
- **What moves at 16 px:** at 320, 390, 768, 900, 1024, 1180, 1280 and 1440, webfont and fonts
  blocked, on `/evals` (bare and with production's report), the five case studies, `/ask` and `/`,
  48 of 31,056 boxes changed (Forge). All 48 are `/evals`' four h2s (font size only) and their text
  lines, at 1024, 1180 and 1280. The h2 boxes themselves keep their size, so nothing below them
  moves. Round 1 alone moved 0 of 15,528.
- `pnpm verify` exits 0 on the integrated head. T27, T28 and T29 pass, 13 of 13. Forge also ran
  85 tests across the specs these pages touch (headings, large-font, trials-doors, one-site,
  invariants, content, read, keyboard), and all passed.
- Shard time: T28 and T29 add about 9 s, in shard 1. Shard 2 loses 4 of log-riffle's tests to
  shard 3.

## Iris

Verdict: ship (7.8). Scale the heading so the longest word fits instead of hyphenating it: a
display word split at 60 px or more reads as a defect. The /evals case titles' ratio to their head
at 320 × 24 px drops to 1.25 (1.73 at 16 px). That's acceptable, and she'd rather not shrink the
reader's text to win it back. She gave the direction for the rail fix at 1024 (above).

## Decisions

1. **The overprint at 1024 rides along** (Atlas). It's a fact hidden at the default font, in this
   sprint's rule. The contract's "nothing moves at 16 px" narrowed to `/evals`' four heads from
   1024 to about 1430.
2. **Fit the heads to the rail, don't widen the columns** (Iris). Forge had a working alternative:
   `1fr` tracks with the h2 at `min-width: min-content`, so only an overrunning head's rail grows.
   It moved Groundedness's rail from 258 to 311 at 1024 and nothing else. Iris kept every
   schedule's text edge on column 4. The alternative is in Forge's memory.
3. **No hyphens.** Neither local browser hyphenates, so `hyphens: auto` couldn't be tested here.
   It could also re-break other headings on Mac and Android at 16 px.

## Not verified

Safari, Firefox, Android's own text scaling on a real phone, a real classic scrollbar (emulated in
Chrome) and print. The full `pnpm test:e2e` wasn't run locally (CI runs it).

## Left open

Rail heads at 1024 with a 24 px font elsewhere ("Education" on `/`, "Key decisions", "Questions")
may overrun their 218 px rail (Iris's arithmetic, unmeasured). `/work/document-ai` at 28 px is now
inside (the cap is independent of the font). The Log's step pages' tables scroll inside their own
box at 24 px, by design.
