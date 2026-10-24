# Sprint 30 review, Iris: `/log` in 2D, the ghost hull, a record per revision

**Verdict: ship, 8.2/10.** Better than production's `/sprints` at 390, 1024 and 1440 in both
schemes; every hard gate passes; my early-look must (the open row's box in forced colours) and the
three cheap changes landed as written in `5eaf329`; no musts and nothing cheap enough to spend a
re-review on. Two notes ride with the next sprint, and the departures from the approved frames are
in one paragraph for the owner below.

Reviewed on `3f442ba` (the final head), built fresh in `/home/user/wt-iris-30` and served on
http://localhost:4720/, in Playwright's Chromium 1.64: 320 × 568, 390 × 844, 768 × 1024, 1024 × 768
and 1440 × 900 at DPR 1 (390 at DPR 2 for the phone budget), light and dark, on `/log` and
`/log/13`, beside production's `/sprints` (https://theseus-portfolio.vercel.app) at 390, 1024 and
1440, against `log-1440.webp` and `log-390.webp` (`.crew/sprint/17/design/`), my calls
(`notes-iris.md`), the contract (`.crew/sprint/29/b5-first-contract.md`), `design/rubric.md` and the
owner's calibration. The chrome-devtools MCP can't start Chrome as root here, so the gates ran
through Playwright, `@axe-core/playwright` and the impeccable detector, as in sprint 27. The early
look on `88c4a39` (`.crew/sprint/30/`, my message to Atlas) covered the same pages before the fix;
its frames are in my scratchpad, the review's in `.crew/screenshots/sprint-30/` (git ignores it).

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | Every word is the contract's, the crew's retros or my key; no `TODO(owner)`, no stand-in. `content/` is untouched (the pages use `profile.name` only). |
| axe, no serious or critical | 0 violations of any impact on `/log` and `/log/13` at 390 and 1440, light and dark (tags wcag2a/aa, 2.1, 2.2aa, best-practice; `review.json`, `axe-*`). |
| impeccable detector, nothing at error | Exit 0, no findings, over `components/log.tsx`, `log-record.tsx`, `bar.tsx`, `lines-plan.tsx`, `app/globals.css`, `app/log/page.tsx` and `app/log/[n]/page.tsx`. |
| Reduced motion | `document.getAnimations()` is 0 at load, after 2 s and after a scroll to the foot and back, at 390 and 1440 (`reduced-*`): nothing on the page moves in any mode. |
| Reflows at 320, no horizontal scroll | `scrollWidth − clientWidth` is 0 on both routes at 320, 390, 768, 1024 and 1440 in both schemes (`overflow-*`). |
| Phone budget | 390 × 844 at DPR 2, 4× CPU, local server (no network throttle; the HTML is one static document, so the wire adds its transfer alone): the last LCP candidate is the count line on `/log` at 200 ms and the record's `h2` on `/log/13` at 256 ms, both text in `main`, none in `[data-ghost]`; 0 layout-shift entries through load + 2.5 s (CLS 0). `/log`, `/log/13` and the 404 request the same 5 script files, 458,882 B decoded (`scripts-*`). |

## Side by side with production

**Better at every width.** Production's `/sprints` (`prod-sprints-{390,1024,1440}-light.png`) is a
centred 624 px column in the text face with a hanging number, every "what went wrong" printed in
full: 11,570 px tall at 390, 9,478 at 1440, with no bar and nothing that says what the crew is. The
Log (`log-*.png`) is the sheet's world: the bar, "Log" in the display face, the ghost hull as the
figure, two lines that state the claim, and a table a board can read in seconds, 3,030 px at 390
and 1,405 at 1440. A record (`record-13-*.png`) is one click deep, beside the table from 1024 and
after the header below it, and Back returns to the row (`early/back-390.png`, `back-1440.png`).

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality (×2) | 8 | One world with the sheet: ink on film, the display heads, the ghost in vellum drawn lighter than the sheet's drawing, the record as a drawn detail box, the night sheet as considered as the day (`record-13-1440-dark.png`). Held under 9 by what B5b fills: the right column under the count line is bare from 1024, and on `/log` at 1440 the table's signatures sit 600 px from the descriptions. |
| Originality (×2) | 8 | The ghost hull is a figure no template has: the original ship reassembled from what the crew took out, numbered by the sprint that took each plank, with the open record's plank edged in ink. The Log as a drawing's revision table (Drawn, Checked, Tested, Approved) is the direction's own idea. A table with a detail box beside it is a known shape, and the 2D ghost is the quiet half of what B5c brings. |
| Craft (×1) | 9 | One text edge at 40 px and one seam at 1004 for the header and the record; the box's top on the rule's y; numbers sized to the lift at every width (13 px to 1280, 11 px at 1024's 13.5 px lifts, 13 again from 768, hidden at 8.5 px); 44 and 24 px targets with no overlap; the open row boxed in both schemes and in forced colours; the widows fixed without changing a word. Two small things below. |
| Functionality (×1) | 8 | Scannable in seconds, the number the one obvious action, every record a URL, Back and Close both work, scripts off shows everything, keyboard rings on every link. The phone's 36 × 44 number is the only tap on a row (the frame's chevron implied the row), and 27 folded rows are 2,400 px of thumb. |

**Weighted: (2 × 8 + 2 × 8 + 9 + 8) / 6 = 8.2.** Calibration: the owner's "Theseus today" (the old
column) is 6.5 and 'kin's editorial restraint 8.7; the sheet with its 3D scored 9.0 in sprint 27.
The archive page sits between them, above the bar of 7 for a sprint that owns its layout.

## Musts

None.

## Rides with the next sprint (not worth a re-review now)

1. The record's `h2` uses `text-wrap: balance`, which at 390 sets sprint 13's goal on four short
   lines where three fit ("retro at build time (PR A / of the sprint 12 contract)",
   `record-13-390-light.png`). `pretty` suits a head that runs past two lines; B5b touches the
   record anyway.
2. On `/log` at 1440 the Description column is 1,070 px wide and Drawn starts at 1,145; B5b's
   Merged column makes it one wider. When the dates land, consider capping Description at about
   66ch so the signature columns sit nearer the goals when no record is open, or keep the table in
   the left column and let the lines figure and the day groups own the right.

## For the owner: what departs from the approved frames

The contract's departures first: no lines figure and no Merged column yet (both wait on the merge
record, B5b), the ghost in 2D (the 3D ghost is B5c), the caption reworded for a hull with no gaps
(all 22 originals are out since sprint 23, so "15 of 22 … the gaps are the 6 still sailing" became
"All 22 original planks are out: the last went with sprint 23. Since then the crew has replaced 5
planks of its own."), and no "Revisions 7 to 1" foot link on the phone (every row is in the HTML).
Then my calls: the ghost is the profile alone, drawn without stations, waterlines or captions and in
graphite and pencil rather than ink, so the numbers are its only ink; the drawing stands on the
page's text edge and centres on the header column rather than floating, and its numbers are hidden
below 768 px where a lift is 8.5 px deep; the lede sits under "Every revision" as two sentences plus a
one-line key to Approved ("Under Approved, Gate is CI, the owner's rules and Lens's review; Owner is
the owner's own decision."), not the frame's single line on the heading row; Close and "Rev 12" /
"Rev 14" are plain underlined words, not boxed buttons with an ×; the record box and the open row sit
on the film with a 1 px ink rule, not on the white card, because the card fails graphite text on the
night sheet; and the phone folds each row as the home page does, the four signatures under their
heads, rather than the frame's one muted line with a chevron.

## Frames (`.crew/screenshots/sprint-30/`)

- `log-{320,390,768,1024,1440}-{light,dark}.png`: `/log`'s first screen at each width; `-full`
  at 390 and 1440 is the whole page (3,030 and 1,405 px).
- `record-13-{320,390,768,1024,1440}-{light,dark}.png`: `/log/13` with the record open; beside the
  table from 1024, after the header below; `-full` at 390 and 1440 shows the boxed row 13.
- `record-13-{390,1440}-{light,dark}-forced.png` and `-forced-table.png`: forced colours; every
  plank edge in CanvasText, the current plank at 2.5 px, row 13 boxed by its cells' borders at
  1440 and its outline at 390.
- `prod-sprints-{390,1024,1440}-light.png`: production's `/sprints` for the side by side.
- `review.json`: the gates' numbers (overflow, axe, reduced motion, LCP, CLS, scripts).
- My scratchpad's `early/` (61 frames, `early.json`) is the early look on `88c4a39`, including
  `ghost-1024-light.png` (the 1024 squeeze), `record-320-light.png`, `back-390.png` and
  `opened-390.png`.

## Notes

- Production merged sprint 29 while the contract was being written, so k is 27 and the count line
  reads "replaced 5 planks"; the data rule covers it and Probe's oracle agrees (157 of 157).
- `/`'s `.rev` folds below 640 px, not 1024 as the contract says; the Log folds there too, with 44 px
  rows from 640 to 1023 for touch, so the two tables stay one thing.
- An unknown record with scripts off gets Next's blank error shell rather than the 404 page
  (Atlas's note on the PR); with scripts on it is the site's 404. Not a design matter, noted so
  the owner isn't surprised.
