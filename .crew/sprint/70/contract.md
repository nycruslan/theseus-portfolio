# Sprint 70 (S): the record's labels stay beside their facts at a large font

**Goal:** On a Log step's record, "Approved" no longer prints over "Owner" at a large font.

**Why it earns a sprint.** The roadmap has the crew standing down until a defect on production
makes the site say something false or hides a fact. Atlas swept production on 2026-11-16, every
route family at 320, 390, 768, 1024, 1180, 1280 and 1440 wide, with a 16, 20, 24 and 28 px default
font (CDP `Page.setFontSizes`, as T27 does). Two defects, both in the step record's list
(`components/log-record.tsx`, `.record dl` in `app/globals.css`, a fixed `88px` label column):

1. **The labels run into their facts.** The column holds "Pull request" at 16 px and doesn't grow
   with the reader's font. At 24 px "Approved" ends at about 133 against the detail's start at 133
   ("ApprovedOwner", every width from 768 to 1440); at 28 px it prints over the detail
   ("Approve" + "Owner" overlapping). "Checked" is 3 to 5 px past its column at 24 px too.
   "Approved" is the record's approval fact, the one "the record you can check" was built to make
   true, so this hides it.
2. **The pull request's link scrolls the page.** At 320 × 568 and 28 px, "Pull request #67"
   (`.record-pr`, `white-space: nowrap`) runs to 329 to 343, and every step page scrolls sideways.

False hits, not taken: the revision table's column heads past a phone's edge are its visually
hidden `thead` (`.rev thead` under 40rem), and the Log's "Revision N" heads carry sr-only text.

## Checks (Probe, `e2e/record-labels.spec.ts`, T30 and T31)

- **T30.** On `/log/23` and `/log/<newest>` at 320 × 568, 390 × 664, 1024 × 900 and 1440 × 900,
  with a 16, 20, 24 and 28 px default font, webfont and fonts blocked: every `.record dt`'s text
  (its ink, a Range over its contents) ends at or before its own `dd`'s text starts on the same
  line, and stays inside the record. Red on main from 24 px.
- **T31.** On the same pages at 320 × 568 with a 24 and 28 px default font: no sideways scroll, and
  the record's pull-request link is inside the page and whole (a `nowrap` or `overflow: hidden`
  mutant stays red). Red on main at 28 px.
- Each check asserts the root's computed font took (T27's pattern), and is proven red against main.

## Budgets

- **Nothing moves at 16 px.** At 320, 390, 768, 1024, 1280 and 1440 with the default font, webfont
  and fonts blocked, every box on `/log/23`, `/log/<newest>`, `/log` and `/` is where it was on main
  (Forge's box diff, as sprints 68 and 69 measured).
- The link stays a 24 px target, on one line wherever it fits.
- No script. No change outside the record's CSS (and its markup only if CSS can't do it).

## Out of scope

The record's words, the revision table, any other page, owner paths and `content/`. Fix the same
pattern anywhere else only if Forge finds one in a sweep (a px label column beside text), and say so.
