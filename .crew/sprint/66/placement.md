# Sprint 66 placement (Iris): the two doors into the trials

**Call: both doors fit.** Nothing above either door moves (0.00 px for every element in `main`, 1 px
sweep 320–1600 on both faces), nothing scrolls sideways, each door is one line at every width with
at least 59 px to spare, and each is a 44 px target below 1024 and at least 24 from it. What moves
is what comes after: /crew's rules 2–6 drop 44 px below 1024 and 32 from it; /log grows 68 px below
1024 and 48–50 from it. /log's first screen never changes; /crew's changes only in windows taller
than about 1,160 px (section 2).

**How I measured.** Production (https://theseus-portfolio.vercel.app at 530a8e6, sprint 65: /log 64
revisions, /crew served `live`, one `down` load) on 13 Nov 2026, in CI's `@playwright/test` 1.64.0
Chromium, scripts off unless said, light. Two faces: the webfont warm (loaded, then reloaded) and
every font request aborted (the fitted fallback). The doors are injected into the served DOM as
section 1 specifies; each read compares the page with the door and with it `display: none`. Scripts
in my scratchpad `iris66/` (`lib.mjs` the injection, `measure.mjs` 21 pins, `sweep.mjs` 1 px
320–1600 at 900 tall, `tops.mjs` tall windows, `tab.mjs`, `axe.mjs`). Shots in
`.crew/screenshots/66-iris/`: `crew-rule1-*` and `log-foot-*` (today, door, focused; light and
dark at 1440), `tab-*` (the door focused by Tab, scripts off and on).

## 1. The doors

| | /crew | /log |
|---|---|---|
| Place | Last child of `li[data-rule="1"]` in `section[aria-labelledby="keel"] ol.keel-rules`, right after `p.keel-source`. Keyed on `rule.n === 1`, so if rule 1 drops (K3) its door drops with it, never moving under rule 2 | Last child of `section.log-revs` (Every revision), right after `table.rev-log`. /log only: `record ? null : …`, as `.log-start` is |
| Markup | `<p data-trials-door="" className="keel-door"><a href="/trials" className={LINK}>…</a></p>` | `<p data-trials-door="" className="log-door"><a href="/trials">…</a></p>` |
| Words | `` {`Try to sink ${FIRST_NAME}'s contact links`} `` (`lib/crew-key.ts`), one string so the HTML holds it whole | The same string |
| href | `/trials` | `/trials` |
| Link classes | `LINK` from `components/crew-link.ts`, word for word: the string rule 1's own source link carries (`crew-link text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2`). Ink, 1 px underline 3 px off, 2 px hovered, 44 px tall below 1024, 24 from it | None. `.log-door a` joins the selector lists of `.log-start a`'s three rules in `app/globals.css` (base, `(hover: hover)`, `(width >= 64rem)`): "Rebuild it yourself"'s rules word for word, which are Read as page's look (600, ink, 1 px underline 6 px off, 2 px hovered, 44 px below 1024, 24 from it). Copy no declaration |
| New CSS | `.keel-door { font-size: var(--step-sm); line-height: 1.5; }`, and `margin-top: 8px` from 64rem (0 below): `.keel-source`'s type without its 13 px indent | `.log-door { margin-top: 24px; }` |
| Edge | The rule's text edge (its sentence's), not the quote's | The table's left edge (16 px below 1024, 40 from) |

**The words** are the trials' own dare (`components/trials.tsx`, `p.trials-dare`: "Try to sink
Ruslan's contact links.") without its full stop, so the visitor lands on the sentence they clicked,
as "Rebuild it yourself" lands on the yard's first step. **No window in the words or the href.**
Naming 320 × 568 on the door gives the answer away before anyone has tried, and under a rule that
says nothing merges unchecked it reads as an apology. On `/trials` the gap is stamped with its sprint
and reads as the call the crew wrote down. `/trials` is where you try; `/trials/320x568` is where
you send a result.

**The crew door inside rule 1.** An `ol` holds only `li`, so "under rule 1" means inside its `li`,
after the source. On the rule's text edge, 16 px of text gap under the source from 1024 (28 below),
it reads as the rule's coda, not a second citation: the quote and its source stay one unit, and
rule 2's sentence stays farther off (34–36 px from 1024, 43–44 below). Reading order: sentence,
enforcer, quote, source, door.

**The Log's foot** is the end of /log's record: after the last revision, inside Every revision, the
last thing in `main` and the page's last Tab stop. The trials are for the second reader, the one who
went through the record. The Log's head already has its two ways out (Rebuild it yourself, then the
hand-off to Crew), and a third there would change /log's first screen and compete with the yard's
invitation. Inside the section, not after it: from 1024 `main` is a grid that places each child by
row (`.log-revs` is row 4), so a sibling would need a placement of its own; inside, it takes the
section's padding and the table's edge with no new layout. Not on the records (/log/N): they are the
yard's steps, and the Log's other doors are on /log only.

## 2. The fit on production

Warm / blocked face where they differ. "Room" is the space left on the door's line; "ring" is the
site's (2 px ink, 2 px out) measured with the link focused.

| Window | /crew door | Rules 2–6 | Ring to rule 1's source text / rule 2's sentence | /log door | /log grows | Ring to the table's last rule / the page's foot |
|---|---|---|---|---|---|---|
| 320 × 568 | 190 × 44 / 193 × 44, room 66 / 63 | +44 | 10.75 / 25 | 229 × 44 / 215 × 44, room 59 / 73 | +68 | 20 / 28 |
| 390 × 844, 390 × 664 | 190 × 44 / 193 × 44, room 136 / 133 | +44 | 10.75 / 25 | 229 × 44 / 215 × 44, room 129 / 143 | +68 | 20 / 28 |
| 768 × 1024 | room 396 / 393 | +44 | 10.75 / 24 | 235 × 44 / 230 × 44 | +68 | 20 / 28 |
| 1023 × 768 | room 396 / 393 | +44 | 10.75 / 25 | 237 × 44 / 230 × 44 | +68 | 20 / 28 |
| 1024 × 768, 1024 × 640 | 190 × 24 / 193 × 24, room 154 / 151 | +32 | 8.75 / 25 | 237 × 24.9 / 230 × 24.9 | +49 | 20 / 36 |
| 1280 × 800 | room 264 / 261 | +32 | 8.75 / 26 | 237 × 25.3 / 230 × 25.3 | +49 | 20 / 36 |
| 1440 × 900, 1536 × 864, 1920 × 1080, 2560 × 1440 | room 329 / 326 | +32 | 8.75 / 27 | 244 × 25.5 / 230 × 25.5 | +49–50 | 20 / 36 |

**The 1 px sweep, 320–1600 × 900, both faces.** Every element before either door: 0.00 px moved.
Sideways overflow: 0 with the door, as today. Lines: 1 at every width. Least room: 63 px (/crew,
320, fallback) and 59 px (/log, 320, webfont). Least ring clearance: 8.75 px to rule 1's source
text (1024 on), 24.00 px to rule 2's sentence (506–857 fallback, 516–857 webfont), 20.00 px to the
table's last rule at every width. No ring leaves the viewport. /log's growth flickers 48–50 from 1024
by its fluid line's rounding. The other pins I ran (360 × 640, 375 × 667, 414 × 896, 430 × 932,
640 × 900, 767 × 1024, 1180 × 820, 1279 × 800, 1366 × 768) agree.

**First screens.** /log's door is at least 3,595 px down (1280 × 800), so /log's first screen never
changes. /crew's door top follows the live panel above the keel: 1,407–2,248 px in the `live` state
I was served (1,583 to 1,654 at 1440 wide as the feed moved; the same at 1920 and 2560, where the
keel's column has stopped growing), and 1,156 px at the least (1383 × 900, in a shorter state my
sweep was served and didn't record). So at every pin up to 1920 × 1080 it's below the fold. In
windows taller than about 1,160 px it can be in the first screen, with the rules after it 32 px lower
than today. I measured that at 1080 × 1920 and 1440 × 2560 in the live state, and infer it at
2560 × 1440 in the shorter one, from 1,165 px at 1440–1600. It's server HTML, so it's there at first
paint and isn't a layout shift. `/` has no door and doesn't change.

**axe** with the suite's strict tags (wcag2a to wcag22aa, best-practice), scripts on, WebGL refused:
both pages clean today and with the door, light and dark, at 390 × 844 and 1440 × 900.

## 3. Tab order

Both doors are reached by Tab at 320 × 568, 390 × 844, 768 × 1024, 1023 × 768, 1024 × 768 and
1440 × 900, with scripts off and on (WebGL refused), each focused in view with the site's ring
(solid 2 px ink, 2 px out):

- **/crew:** right after rule 1's source (`CLAUDE.md, lines 61–62`) and right before rule 2's
  (`.github/CODEOWNERS, line 1`). It's stop 14 with scripts off and 16 with them on.
- **/log:** right after the last Rev link (`Revision 1`, `/log/1`), and the page's last stop: Tab
  leaves the page after it. It's stop 75 with scripts off and 76 with them on.

No Tab check today reaches either door. B4.13 stops at Evidence's links, B5.25 and H2 at the first
Rev link, and H6 at Every revision. B5.9 runs on /log/13, which has no door. `keyboard.spec.ts`'s
DOM-order walk is on `/`.

## 4. What the contract should pin

**T22, the doors.**
1. /crew: exactly one `a[href="/trials"]`, the only `a` in `li[data-rule="1"] > p[data-trials-door]`,
   the `li`'s last child, after `p.keel-source`. Its words are exactly `Try to sink ${FIRST_NAME}'s
   contact links`, which equals `/trials`'s `p.trials-dare` without its full stop. Its `className`
   equals rule 1's source link's. It's in GET's HTML with its words whole, and in the DOM with
   scripts off and on, at 1440 × 900 and 390 × 844. No other rule has a door.
2. /log: exactly one `a[href="/trials"]`, the only `a` in `section.log-revs > p[data-trials-door]`,
   the section's last child, after `table.rev-log`, with the same words and in the same places. None
   on any record, on `/`, on `/read`, or in the bar.
3. Each lands on `/trials`: 200, h1 "Sea trials". Both are ink at rest, hovered and focused, never
   copper, and focus shows one ring, 2 px ink, 2 px out.

**T23, the fit,** read against the page with the door `display: none`, as my sweep does.
1. The box is at least 24 wide, 44 tall below 1024 and at least 24 from it. The text sits on one
   line at 320, 390, 768, 1023, 1024 and 1440 on both faces, with no sideways overflow.
2. No element before the door in `main` changes its left, top or width by more than 0.5 px, at
   390 × 844 and 1440 × 900 (the door's ancestors grow taller, by design).
3. /crew: the door's left edge is rule 1's `.keel-sentence`'s (±0.5). The focused ring clears rule
   1's source text by at least 8 px and rule 2's sentence by at least 20. Rule 2 moves exactly 44
   below 1024 and 32 from it.
4. /log: the door's left edge is the table's. The focused ring clears the table's last rule by at
   least 16 and stays at least 16 above the document's foot.
5. At 320 × 568, 390 × 844 and 1440 × 900 neither door is in the first screen.
6. axe with B4.24's strict tags is clean in both schemes at 390 and 1440. Forced colours and print
   are K6's and B2.9's as they stand; I didn't run those.

**T24, rewrites and budgets.**
1. **K1** (`keel.spec.ts`, `li.links.length` is 1): rule 1 holds two links, its source then the door.
   Rules 2–6 hold one. K2 reads `links[0]`, which is still the source; name it as kept.
2. **K6's `KEEL_LINKS`**: add the door as its own entry (`the trials door: /trials`, found by
   `[data-trials-door]`), since `keelLinks` would count it as a second "rule 1".
3. **B5.6 (C5.3)** (`log-record.spec.ts`): allow `/trials` on /log only, exactly once, inside
   `p[data-trials-door]`. The records keep today's allowlist, so a door on a record fails.
4. **B4.8 is kept, not rewritten.** It allows any site path, and it counts the six source links by
   their GitHub pattern. The plan lists it as a rewrite; say in the contract that it isn't one.
5. **New Tab bounds:** on /crew the door is the stop right after rule 1's source and right before
   rule 2's. On /log it's the stop right after `/log/1` and the last one in `main`.
6. **Script bytes:** /crew's and /log's scripts are the base's, byte for byte, with no new client
   component.
7. **The mutant should fail** each of these: a door on rule 2, a door on a record, `/trials/320x568`
   as the href, the dare's full stop kept, the door before the source.

**What I'd accept and report.** Everything after each door moves: /crew's rules 2–6 by 44 / 32,
and /log's foot by 68 / 48–50. /crew's first screen changes in windows over about 1,160 px tall, as
section 2 says. /log's box from 1024 is 24.9–25.5 px tall, its fluid line, not exactly 24. Neither
door can wrap (an inline-flex box, and `nowrap` on the Log), but the least room is 59 px at 320.

## Needs decision (Atlas), neither blocking

1. **The Log door's look.** "Rebuild it yourself" has no classes, so "word for word" there means
   joining `.log-start a`'s selector lists. I recommend that, so the Log's ways out look alike. The
   literal alternative is `LINK` on /log too: a 400-weight ink link in the table's voice.
2. **/log only, not the records.** If Atlas wants the door on every /log/N, B5.6 (C5.3) allows
   `/trials` on all of them, and 64 more pages change.
