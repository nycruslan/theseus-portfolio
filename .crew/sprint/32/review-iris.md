# Sprint 32 review, Iris: the merge record on `/log` (B5b)

**Verdict: ship, 8.2/10.** Better than production at 390, 1024 and 1440 in both schemes: the
cadence and the ship of Theseus are now two facts an executive reads in seconds, and the table is
no noisier than the approved frame. Every hard gate passes, the early-look fix (the phone's first
group gap) landed, and nothing is left that's cheap enough to spend a round on. Four follow-ups and
the departures from the frames are below.

Reviewed on the sprint head `141a1f8` (same tree as `forge/32` at `433b900`), built fresh in
`/home/user/wt-iris-32` and served on http://localhost:4820/, in Playwright's Chromium at 320 × 640,
390 × 844, 768 × 1024, 1024 × 768 and 1440 × 900, light and dark, on `/log`, `/log/13`, `/log/27`
and `/log/1`. Beside it: production (https://theseus-portfolio.vercel.app, main at `23e50bc`) at
390, 1024 and 1440, `log-1440.webp` and `log-390.webp` (`.crew/sprint/17/design/`), my notes
(`notes-iris.md`), the contract with decisions 1 to 10, `design/rubric.md` and the calibration. For
the Undated group, a scratch worktree of the same commit with `.crew/sprint/30/merge.json` deleted,
built and served on :4821. The chrome-devtools MCP can't start Chrome as root here, so the gates ran
through Playwright, `@axe-core/playwright` and the impeccable detector, as in sprints 27 and 30.

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | Every new word is the contract's or the merge records'; no `TODO(owner)`, no stand-in. `content/` is untouched. |
| axe, no serious or critical | 0 violations of any impact (wcag2a/aa, 2.1, 2.2aa, best-practice): `/log` at 320, 390, 768, 1024 and 1440; `/log/13` at 390, 768, 1024 and 1440; `/log/27` at 320 and 1440; `/log/1` at 320; and the Undated build's `/log`, `/log/30` and `/log/29` at 320, 390, 1024 and 1440; every one in light and dark (`gates.json`, `report.json`). |
| impeccable detector, nothing at error | `impeccable detect --json` over `components/log.tsx`, `components/log-record.tsx`, `app/globals.css` and `app/log/page.tsx`: `[]`, exit 0. |
| Reduced motion | `document.getAnimations()` is 0 at load and 0 after 2 s and a 4,000 px scroll, at 390 and 1440, with reduced motion and without: nothing on the page moves in any mode. |
| Reflows at 320, no horizontal scroll | `scrollWidth − clientWidth` is 0 on every route above at every width, both schemes, both builds. The folded Date's 1 × 1 clip adds nothing sideways. |
| Phone budget | 390 × 844 at DPR 2, 4× CPU, 400 kbps and 150 ms latency: LCP is text in `main` (`/log` the count line at 1,580 ms, `/log/13` the record's `h2` at 1,592 ms), one candidate each; 0 layout-shift entries through load + 2.5 s, CLS 0. Production on the same profile: 1,080 and 1,356 ms. The page explains little of that gap: the HTML grew 1,227 B gzipped (10,553 → 11,780; about 25 ms at 400 kbps), so most of it is most likely the server (a local `next start` serves gzip over HTTP/1.1, Vercel's edge brotli); I didn't serve main locally to prove it. Scripts: 5 files, 458,882 B decoded, byte for byte what sprint 30 measured: the framework's script alone, no client code (B5.10). |

## Side by side with production

**Better at every width.** Production's `/log` (`prod-log-{390,1024,1440}-light.png`) is the B5a
page: the hull, the count, and 29 undated rows. The head (`log-*-first.png`, `log-1440-light.png`)
adds what the frame always had and the record couldn't yet supply:

- **The lines figure** in the header, the frame's own setting: a 1 px ink rule under the count line,
  "44 of 6,170 lines" in the display face (30 px at 1440, 24 at 390), the rest of the sentence in
  graphite. In the first screen at 1440 × 900 (334 to 431 px) and at 1024 × 768 (347 to 465), and
  between the count line and Every revision on the phone, as `log-390.webp` places it. It is the
  ship of Theseus as a measured fact, which is the brand commitment the hull only draws.
- **The day groups**: "Sat 24 Oct · 4 revisions" in 13 px ink and graphite, no rule of its own,
  the air above parting the groups. Ten days read as a cadence at a glance, weekend included, which
  29 dates in a column never did. From 1024 a header is 39 px (33 for the first), 31 px at 768, 41
  px folded, and the phone's first group now sits 32 px under the lede (the early-look fix,
  `6d76970`), against 24 px from a hairline to each later day.
- **The Date** as the frame's last column, graphite and unbroken, restating its group's day; on the
  phone it is read by assistive tech only (decision 10), so the folded rows stay production's 89 px
  at 390 and 126 px at 320.
- The record's Date pair ("20 Oct 2026, 00:42 UTC") sits before Pull request and breaks after the
  comma at 320 (`/log/27`, `/log/1`: 46 px, two lines); the `h2` is `text-wrap: pretty`.

The cost is length: `/log` is 1,469 → 1,965 px at 1440, 1,531 → 2,115 at 1024 and 3,207 → 3,714 at
390, almost all of it the eleven header rows' air. It buys the cadence, and the rows themselves are
exactly as dense as before.

## The things I listed as unchecked at the early look

- **Forced colours** (`forced-log-*.png`, `forced-log-13-*.png`, `row13-*-forced.png`): the headers,
  the counts and the Dates take CanvasText as everything else does (they use no background or
  shadow, so there's nothing to lose); the lines figure's rule draws; the open row on `/log/13` is
  boxed by its cells' borders at 1440, its right edge now on the Date cell, and by its outline at
  390.
- **Scripts off**: `/log` and `/log/13` at 390 and 1440 answer 200 and `main`'s text is identical
  to scripts on (`noscript-*.png`).
- **Undated on a real page** (`undated-table-*.png`, sprint 30's record removed): "Undated" heads
  the table above "Sat 24 Oct · 3 revisions", set exactly as a day (no colour, no italics), and
  reads as a state, not a fault; revision 30's Date cell is empty with no "Date" label at any width;
  `/log/30` has no Date pair while `/log/29` has one; the lines figure falls back to sprint 29's
  record ("64 of 5,288 … at 55139a5"); axe 0 throughout.
- **`/`'s revision block**: its screenshot is byte-identical to production's at 390 and 1440 with
  reduced motion, so the shared `.rev` didn't move.

## Scores

| Criterion | Score | Why |
|---|---|---|
| Design quality (×2) | 8 | One world with the sheet and the frame: the header gains its second voice in the display face, the table reads as a ship's log by day, and the night sheet is as considered as the day (`log-1024-dark-first.png`). Held under 9 by the same thing as in sprint 30: at 1440 the signatures still sit 600 px from short goals (my call, for one-line rows over a void), and by a page a third longer. |
| Originality (×2) | 8 | "44 of 6,170 lines are still original, by git blame" is a figure no other site can truthfully print: the ship of Theseus measured, not illustrated. The day groups are a ledger's familiar shape, deliberately, so the novelty stays in the figure and the ghost. |
| Craft (×1) | 9 | Header spacing set per width and measured as asked; the fold opt-out right at 320 and 390; the Date restated in graphite with `<time>` behind every date; the record's line breaking at the comma; CLS 0; scripts and `/` byte-identical to before; forced colours and both schemes clean. |
| Functionality (×1) | 8 | The cadence and the figure read in seconds, every record still a URL, scripts off loses nothing, axe 0. The phone's long scroll (3,714 px) remains, and a phone reader who opens a record mid-group comes back to a row whose day is up to five rows above. |

**Weighted: (2 × 8 + 2 × 8 + 9 + 8) / 6 = 8.2.** Calibration: the owner's "Theseus today" is 6.5
and By Kin's editorial restraint 8.7; sprint 30's `/log` scored 8.2 and the sheet with its 3D 9.0
in sprint 27. This sprint fills what B5a left open without changing the page's shape, so it holds
8.2 rather than climbing: the next step up on this page is B5c's ghost in 3D, not more rows.

## Musts

None.

## Follow-ups (not worth a round now)

1. **The Undated gap.** Records land with the next sprint's PR, so production will lead its table
   with "Undated" from every merge until the next. Decision 10 already routes a post-merge writer to
   the retro as the owner's (`.github/`); I'd rank it first among the retro's proposals, because
   that header is the first word of the table nearly all the time.
2. **The hash as a link.** `d7367ca` could open the commit on GitHub, so an engineer can check the
   figure in one click. A tab stop and an underline in the header: worth it with B5c, when the
   header is touched again.
3. **The rule at 768.** The figure's 1 px rule stops at the header text's 66ch (x = 610) while
   Every revision's 2 px rule below runs edge to edge. It matches the text above it, so it's right,
   but between 640 and 1023 it reads as cut short; if B5c moves the header, let the rule take the
   column's width there.
4. **Phone budget against a like server.** The 500 ms LCP gap to production is most likely the
   local server (the page grew 1.2 KB gzipped); the PR's Vercel preview on the same profile would
   settle it, if anyone can reach it. Both figures are well inside 2.5 s either way.

## For the owner: what departs from the approved frames

The column is headed "Date", not the frame's "Merged" (decision 2), and its dates are graphite,
since each one restates its group's day. The day groups and their "Undated" first group aren't in
either frame: they come from Quill's plan (sprint 29) for a table past about 30 rows, and they carry
the cadence the frame's single date column only implied. On the phone the date isn't in the row, as
`log-390.webp` has it ("Owner, 21 Oct"), because the group header right above names the day
(decision 10); the folded rows keep the signatures under their heads as B5a built them. At 1440 the
table spans both columns on `/log` with every goal on one line; the frame only drew the table beside
an open record, which is how `/log/13` still sets it. The lines figure is the frame's, word for word
apart from the numbers, which now come from git.

## Frames (`.crew/screenshots/sprint-32/`, git ignores it)

- `log-{320,390,768,1024,1440}-{light,dark}-first.png`: each width's first screen;
  `log-390-light.png` and `log-1440-light.png` are the whole page (3,714 and 1,965 px).
- `log-13-*`, `log-27-*`, `log-1-*`: records, the Date pair at 320 included.
- `prod-log-{390,1024,1440}-light.png`: production, for the side by side.
- `undated-table-{320,390,1024,1440}-{light,dark}.png`: the Undated group on the scratch build.
- `forced-*.png`, `row13-*.png`: forced colours and the open row in each scheme.
- `noscript-*.png`; `gates.json` and `report.json`: the numbers above.
