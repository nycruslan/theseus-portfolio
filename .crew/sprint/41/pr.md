# Sprint 41: the facts, scannable and shared (Pc)

**Goal** (from the roadmap, milestone "the proof in five seconds", sprint Pc, its last): Work's
summaries on `/` read sentence by sentence, and a shared link's card carries the owner's role and
his scope and scale, in the site's own typefaces.

**Size:** M. Contract: `.crew/sprint/41/contract.md` (P14 to P17). Decisions:
`.crew/sprint/41/decisions.md` (1 to 8). Iris's review: `.crew/sprint/41/review-iris.md`.

## What a visitor sees

- **Work on `/`:** each summary is set a sentence to a line, 6 px apart, with `text-wrap: pretty`,
  still one paragraph of the owner's words (`<span data-sentence>` children of `p.entry-text`, a
  space between them). The JPMorgan summary was 7 lines in one block at 1440 and 11 at 390; it now
  reads as three sentences. Work grows 76 px at 1440 and 98 px at 390, all below the fold. One
  splitting rule, `lib/sentences.ts`, which `splitBio` now uses too.
- **The shared card (`/opengraph-image`):** the name in Sofia Sans Extra Condensed 700 (as `/` sets
  it, Iris's must), the bio's first sentence ("VP Engineering at JPMorgan Chase.") and the four
  particulars as a ruled table in Sofia Sans, every word from `lib/card.ts` (`cardText`), which
  reads `content/profile.ts` through `lib/particulars.ts`. Its alt reads "Ruslan Shulga, VP
  Engineering at JPMorgan Chase." The faces are vendored TTFs in `assets/fonts/` with the SIL Open
  Font License; they're read at build and by `/log/[n]`'s card on request, and add no bytes to any
  page. The read path is scoped to `assets/fonts`, so each card route traces 146 files rather than
  the whole project (314).
- **The text face's fallback:** "Sofia Sans Local" over Arial, Liberation Sans, Arimo and Roboto
  with next/font's metrics, as the display face has had since sprint 27. On a machine without Arial
  the 404's first paint now holds Sofia Sans's lines to 1 to 3.5% (main's fell to Liberation Sans at
  full size, 8 to 11% wider). The 404 still gets no font preload, so its first visit paints in the
  fallback: left open.
- **`/read`:** the figcaption's count line, legend and sentence sit 6 px apart at 390 (row gap
  4 → 6 px, and Iris's should: the sentence's `<p>` gets the class `ship-note` with
  `margin-top: 6px`, since Biome's `noDescendingSpecificity` refuses her `.ship figcaption > p`
  ahead of `.lost p`).

## Checks

`e2e/facts-scan.spec.ts` (Probe), written red first on the contract's head e9bb761:
- P14 the sentences: block-level, in order, verbatim, one shared parent whose text is the whole
  summary, each below the last at 1440 × 900 and 390 × 844, scripts off too, Detail A after.
- P15 the card: `cardText` against the data rules (and three fixture profiles), each face's name
  table reads Sofia Sans, the OFL beside them, the card imports `lib/card`, og:image 200 PNG
  1200 × 630, the alt.
- P16 body's family is `"Sofia Sans", "Sofia Sans Local", sans-serif`, and the local face's
  sources and metrics.
- P17 the project link's rule gap below 1024 (green on main by nature: sprint 23's fix had
  already landed, decisions 6) and `/read`'s figcaption row gap.

Red on e9bb761 for the right reasons: no `[data-sentence]`; no `lib/card`, alt without the lead;
`Sofia Sans Fallback` in place of the local face; a 4 px row gap. P15 doesn't prove the PNG's
pixels are Sofia Sans: `app/opengraph-image.tsx` passes the `CARD_FONTS` files to
`ImageResponse`'s `fonts:` (read it there).

No existing check is edited, skipped or retired. B2.1, B2.2 and C4's residue checks read the
sentence markup unedited.

## Results

- Build (Forge, 2 workers): `pnpm verify` green; `facts-scan` 4 passed (P14 2.0 s, P15 1.2 s,
  P16 0.6 s, P17 1.8 s, about 6 test-seconds); with `facts`, `profile-sections`, `smoke`, `read`,
  `invariants`, `sheet`, `plan` (B1.8, B1.9), `not-found`, `particulars` and `crew-replay-home`
  (B4.49): 79 passed, 5.2 min; `live-layer` B4.22: passed.
- Fix round 1 (Forge): `pnpm verify` green; `facts-scan`, `read` and `smoke`: 13 passed. On a
  production server, `/opengraph-image` and `/log/13/opengraph-image` (rendered on request) return
  byte-identical PNGs, so the fonts ship to the run-time route.
- Iris on 7e1eea5: `changes` at 7.2 (7.5 with her must), every hard gate passing (axe 0 on `/` and
  `/read` at 390 and 1440 in both schemes, 320 without overflow, CLS 0); her must and should are
  built in d02f8da.
- CI's `check` on 4cc8c52: success; the full suite (`pnpm test:e2e`) took 27.3 min and the job
  28.8 min, against the 35-minute cap. The new spec adds about 6 test-seconds.
- Lens: ship on 4cc8c52, three nits, which ride with the next sprint that touches this code: the
  `CARD_FONTS` comment says build only though `/log/[n]` reads the fonts on request, the card would
  draw its table rule with no rows, and this full-suite time (now reported).

## Decisions the owner may overrule after the merge

None waits for him: the card's content and the sentence layout present his facts without changing
them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QrjXvdKQp2KdoSsJFruzze
