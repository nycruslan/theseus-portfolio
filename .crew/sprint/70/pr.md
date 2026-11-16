## Sprint 70 (S): the record's labels stay beside their facts at a large font

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on a
Log step's record, "Approved" ran into its value at a 24 px default font and printed over "Owner" at
28 px, and at 28 px on a 320 px phone the record's pull-request link scrolled every step page
sideways. Found by Atlas's sweep of production on 2026-11-16: every route family at 320 to 1440
wide, 16 to 28 px default font.

**Size:** S. Contract: `.crew/sprint/70/contract.md`.

## What changed for a visitor

- **The Log step's record (`.record dl`).** The label column is `minmax(5.5rem, max-content)`: 88 px
  at 16 px, as before, growing with the reader's font. The list is its own query container
  (`record-list`), and below 15rem wide each label stands over its fact, with 12 px between pairs.
- **The pull-request link (`.record-pr`)** drops `nowrap`. It stays one line wherever it fits
  (everywhere up to 36 px at 320) and stays a 24 px target.
- **/crew's Evidence and Approval list (`.crew-facts`),** found by Forge's sweep of the same
  pattern: from 24 px the panel split the labels mid-word ("Eviden / ce"). It gets the same rule,
  stacked below 17rem.
- Only `app/globals.css` changed: no markup, no script. The stylesheet grew 415 B (89 B gzipped).

## Evidence

- **Production, before:** "Approved" ink ended at 137 to 155 against its fact starting at 133
  (24 px from 1024, 28 px everywhere); the link ended at 329 (`/log/23`) and 343 (`/log/69`) at
  320 × 28, and the page scrolled.
- **After (Forge):** from 768 to 1440, "Approved" ends at 132 to 155 against a fact at 177 (24 px)
  or 199 (28 px); at 320 and 390 the labels stack. The link ends at 229 and 243 at 320 × 28, one
  line, and the page is 320 wide.
- **Nothing moves at 16 px:** 0 of 48,420 boxes on `/log/23`, `/log/69`, `/log`, `/` and `/crew`,
  at 320, 390, 768, 1024, 1280 and 1440, webfont and fonts refused (a control diff of the base
  against itself read 0 of 45,120).
- **T30 and T31** (`e2e/log-record-labels.spec.ts`, new; Probe): the labels' ink against their own
  facts on `/log/23` and the newest step, 320 to 1440, 16 to 28 px, webfont and fonts blocked; and
  at 320 × 568 with 24 and 28 px, no sideways scroll and the link whole and unclipped. Red on main
  in 6 of 12 (T30 at 24 and 28 px, T31 at 28 px). Mutants stay red: `.record { overflow: hidden }`,
  `html, body { overflow-x: clip }`, and a clipped `dt`. 12 of 12 pass on the build. The file is
  named `log-record-labels` so shard 2 gets about 14 test-seconds faster, not 22 slower (Probe's
  `--list --shard` diff).
- `pnpm verify` exits 0 on the integrated head. Forge ran 112 tests across the specs the record
  and /crew touch, all passing.

## Decisions

1. Stacking, not only a wider column, on a narrow list: at 320 × 28 a wider column alone left the
   detail too narrow for the link (Forge). Iris weighs the stacked look.
2. The query container is the list, not `.record`, so the step links absolutely placed in `main`
   aren't trapped by containment in an older browser.

## Left open (follow-ups, none a label column)

- The yard's hint (`.record-hint`, a fixed 14 px line) prints over the hand-off link on the newest
  step at 320 and 390 with 24 or 28 px, WebGL on; no check sees it, since checks refuse WebGL.
- /crew scrolls sideways at 320 × 28 from `.crew-table` (328 to 338 px).
- The record's nowrap step links run past the window at 1536 × 24 and 1920 × 28.
- /crew's status word "answering." splits mid-word at 320 and 390 with 24 or 28 px.
