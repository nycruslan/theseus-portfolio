## Sprint 68 (S): a reader's large font keeps Contact whole

**Goal** (from the roadmap's stand-down conditions: a defect on production that hides a fact): on
a 320 px wide window with a large default font, the bar's Contact link was cut to "Con" and every
page scrolled sideways (found in sprint 67). This sprint keeps every page inside the window at
Chrome's "Large" and "Very large" fonts, and nothing moves at the default font.

**Size:** S. Contract: `.crew/sprint/68/contract.md`. During the build, Probe found two more
overflows: the plan drawing's DWL and Base labels on `/`, and the Freeboard reading on `/trials`.
The contract was widened to include them.

## What changed for a visitor

At 320 × 568 with a 21 or 24 px default font, these elements used to run off the page and now
stay inside it:

- **The bar.** Its links wrap onto their own row, right-aligned, and Contact stays whole.
- **The motion control** on `/log` and `/crew`. Its row wraps.
- **The sheet's foot on `/`.** The control takes its own row, and the drawing moves down by that
  row.
- **The drawing's floor.** DWL and Base stay inside.
- **The Freeboard reading on `/trials`.** It wraps.

The sticky bar is now two rows (133 px at 24 px), so the scroll padding grows with it. That way a
link to `#work` doesn't land under the bar.

## Evidence

All numbers are at 320 px wide.

| What | Before | After |
|---|---|---|
| Contact's right edge, 24 px font | 373 | 305 |
| Off's right edge, 24 px font | 327 | 304 |
| DWL's right edge, 24 px font | 341 | 312 |
| Base's right edge, 24 px font | 342 | 313 |
| Freeboard's right edge, 24 px font | 340 | 304 |
| Page width, every route | 373 | 320 |

- **T27** (`e2e/large-font.spec.ts`, new; Probe) covers `/`, `/crew`, `/log` and `/trials` at
  21 and 24 px, with the webfont and with fonts blocked. It checks for no sideways scroll, and
  that each of the bar's four links and the control's three buttons is whole and on one line, with
  `overflow: hidden` refused as a fix. On main it is red: Contact reaches 373, Off 327, the
  drawing's labels 346, and Freeboard 340.
- **T25** now also checks the page's scroll at 24 px (`PAGE_HOLDS` grew to {16, 20, 24}). This
  makes the check stronger; nothing is retired. `contextOf` moved to `e2e/reader-font.ts`
  unchanged.
- **Nothing moves at 16 px:** 0 of 9,144 boxes changed on `/`, `/crew`, `/log` and `/trials` at
  320, 390, 1024 and 1440 (Forge). The before and after screenshots of `/` and `/log` at 320 are
  byte-identical.
- **Tests:** Forge's full run, `pnpm test:e2e`, passed 433 tests. `pnpm verify` passes on the
  integrated tree (Atlas).

## Not verified

- Safari, iOS, Firefox, and Android's text scaling on a real device.
- Forced colours, and print at a large font.
- Beyond the contract: at a 28 px font, `/crew`'s table overflows below 330 px wide and `/evals`
  below 300 (follow-up).
