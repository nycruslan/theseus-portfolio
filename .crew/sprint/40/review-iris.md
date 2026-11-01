# Sprint 40, Iris: the early look at Forge's build (Pb)

**Verdict: changes, 8.2/10, on 9fcfb96 (forge/40), with decision 9 read.** It's **better** than
production. Every hard gate passes. Two cheap musts: on a phone, `/crew` in a told state still says
"AI agent" nowhere, which misses the sprint's own outcome; and `/`'s key is set as the faintest line
in the block, so it reads as fine print rather than as the table's key. Each is a few lines of
markup and CSS, and their numbers are below. One should: widen `/crew`'s fold to `< 90rem`, because
the longer job cells squeeze the live role lines to 185 px at 1280.

How I judged it: the build served with node, plus four `next start` sites (live, open, resting, and
live on seat 41 with a plain goal), each on a copy of `.next` with a plain http feed serving
`e2e/fixtures/crew` with a fresh `asOf`. `/crew` on production's real feed was also checked with the
job cells rewritten in place. Screenshots are at 2× in
`/tmp/claude-0/-home-user-theseus-portfolio/82af141e-dc09-5954-b385-684f5c888d3a/scratchpad/iris/`
(scratch, not committed). The 3D was refused for these shots: the key, the job cells and P13 are
HTML or Off-path 2D. The resting fold read 15.8 px, the same as Forge's figure.

## Hard gates

| Gate | Result |
|---|---|
| No new placeholder | Pass. The key, the job cells and the pen add no stand-in. |
| axe, serious or critical | Pass. 0 on `/`, `/crew` and `/log`, live (seat 41), resting and down, 1440 and 390, light and dark (36 runs). |
| impeccable detector, error level | Pass. No findings on the changed files, and 0 anti-patterns on the three URLs. One advisory, `repeating-stripes-gradient`, is the pencil hatch, which is on production and in the brief. |
| Reduced motion | Pass. Nothing added moves. |
| 320 reflow | Pass. `scrollWidth` 320 on `/` (live) and `/crew` (live). The key is three lines there. |
| Phone budget | Not traced. The change adds about 120 B of text to `/` and no script. B2.10, B1.8 and B1.9 stay unedited. |

## Compared with production: better

- **`/` at 1440 and 390.** Production's block has no key. The rows sit where they were (the last
  row's foot is at 790.7 px on both). The key takes 18 px of the resting fold's slack, leaving
  15.8 px (33.7 px without it).
- **`/crew` at 1440.** Production says "AI agent" 0 times. The build says it 7 times, once in each
  job cell. At 390 in told states it's still 0 times (item 3).
- **`/log`.** "Under Approved, … the owner's …" becomes the same key as `/`'s.
- **P13.** On main the number's chip covers the copper dot. Now the dot paints over it.

## 1. `/`'s key: weight, colour, place (must 1)

As built: 13 px, weight 400, `--muted` (5.93:1 light, 7.79:1 dark), one line 754.6 px wide at
1440. It sits 10.5 px under the last row's rule and 10 px above the count and legend. The words do
their job: "Every name is an AI agent Ruslan directs." is the plainest sentence on the page, and
Gate and Owner are now explained. The setting doesn't do its job:
- It's the same grey as the column heads and the caption beside Revisions, and lighter than the
  count line under it. So the eye files it with the legend as fine print, not as the table's key.
- In live and resting the gaps are equal (10.5 above, 10 below), so it reads as part of the foot
  group rather than as the table's own note.

**Change.** Set the first sentence in ink at 600, the way the rest line's "Crew resting." is set,
and move the key 4 px closer to the rows. The weight costs no width: the first sentence measured
236.0 px at 400 and at 600, so it stays one line at 1440. The move gives 4 px of fold back, so
resting goes from 15.8 to 19.8 and live from 21.8 to 25.8 at 1440 × 900, with 6.5 px under the
rule. I tried ink at 400, at 500 and at 600 (`proto-v1`, `-v3`, `-v2-*.png`). At 600 the sentence
reads as a key and doesn't shout. At 400 it still looks like a caption.

`lib/crew-key.ts`: split the string; the words don't change.
```ts
/** The key's first sentence: who the names are. /crew repeats it where its job column folds. */
export const CREW_WHO = `Every name is an AI agent ${first} directs.`;
/** The rest: what the two words under Approved mean. */
export const CREW_APPROVED = "Approved: Gate is CI, his rules and Lens's review; Owner is his own call.";
```
(Drop `CREW_KEY` if nothing reads it, for knip.)

`components/revisions.tsx`, `CrewKey`:
```tsx
<p data-crew-key="" className={className}>
  <span className="crew-key-who">{CREW_WHO}</span>
  {` ${CREW_APPROVED}`}
</p>
```
On `/`: `<CrewKey className="rev-key text-step-sm text-muted" />`. Leave `/log`'s call as it is.

`app/globals.css`:
```css
/* /'s key (Iris, .crew/sprint/40/review-iris.md, must 1): tucked to the rows it explains, its
   first sentence, the sprint's claim, in ink at 600 as the rest line's "Crew resting." is. The
   weight costs no width (236 px either way), so it stays one line at 1440. /log's key keeps the
   lede's voice. */
.rev-key {
  margin-top: -4px;
}

.rev-key > .crew-key-who {
  color: var(--foreground);
  font-weight: 600;
}
```
Probe's P8 already reads this markup: `keyInHtml` strips tags, and the contrast and copper reads
walk the descendants. The text squashes to the contract's sentence.

**Decision 9 (hide it from 1024 to 1279): accepted, and I found no better home.** No line in the
block has room at those widths. The caption wraps under the heading, the count and legend take two
lines, and the rest line (resting only) has about 225 px spare where the key's first sentence alone needs
236 px.
The title block's empty band sits beside the bio, where the key would read as a bio line rather than
as the table's key. The caption above the table still says "a team of AI agents" there. Measured
spare at the contact links, key hidden (main's layout), then with the key tucked:

| Seat | Resting | Live |
|---|---|---|
| 1024 × 768 | 9.9 / −35.1 | 15.8 / −29.2 |
| 1280 × 800 | 0.4 / −25.1 | −17.1 / −42.6 |
| 1366 × 768 | −60.7 / −86.2 | −54.7 / −80.2 |
| 1440 × 900 | 33.7 / 19.8 | 33.7 / 25.8 |

From 1280 the key costs the first screen its contact links only at 1280 × 800 resting. At the other
common laptop seats (1366 × 768, 1536 × 864, 1280 × 720) the links were already below the fold on
main. I accept the trade: the key is the sprint's outcome.

## 2. `/log`'s key: ship as built

It has the same words, `.log-lede`'s 13 px muted text, and sits as the lede's second line above
the table. It's one line at 1440 and two at 390, with no overflow, in both schemes. Keep it at 400
and muted. The lede's first sentence already says "A crew of AI agents rebuilds this site", so a
600 lead there would compete with the lede. P10 compares text, not style.

## 3. `/crew` on a phone and from 1024 to 1279 (Forge's Needs decision): fix it

Confirmed: in live, open and resting at 390, 320 and 1024 the visible text says "AI agent" 0 times.
The fold hides `.crew-word`. Down keeps the column, 7 times. Most hiring visitors arrive on a phone,
so the outcome "/crew says the same of every member" isn't met there.

**Decision.** Where the job column folds, add the key's first sentence after the table and the
not-on-this-sprint sentence, in that sentence's voice. The words are the lead's own, `CREW_WHO`, so
`/`, `/log` and `/crew` say it in one sentence from one source. It shows only where the job cells
hide, so 1440 still counts 7 (P9). It isn't rendered in down, where the cells show.

`components/crew-table.tsx`, after the `[data-absent]` line:
```tsx
{/* Where the job column folds away, the roster's key in /'s words, so a phone still reads that
  every name is an AI agent (Iris, .crew/sprint/40/review-iris.md, must 2). Down keeps the job
  column, so it has none. */}
{crew.state === "down" ? null : <p data-crew-who="">{CREW_WHO}</p>}
```
`app/globals.css`: `[data-crew-who] { display: none; }` beside `[data-absent]`'s, and inside the
existing fold query (`(width < 48rem), (64rem <= width < 80rem)`, or `90rem` with should 1):
```css
  [data-crew-who] {
    display: block;
    margin-top: 10px;
    color: var(--muted);
    font-size: var(--step-base);
    line-height: 1.5;
  }

  /* Under the not-on-this-sprint sentence, one note about the roster, not two. */
  [data-absent] + [data-crew-who] {
    margin-top: 0;
  }
```
Why muted at the body size rather than `/`'s ink at 600: it stands in for the job cells, which are
muted. At 600 in ink it read as a second heading over "Activity, 24 Oct (UTC)" (`cproto-f3-*.png`
against `cproto-f1-*.png`). It costs 24 px at 390 and 1024. Activity moves down the same.
The not-on-this-sprint sentence stays unchanged and stays next to the table.

## Should 1: `/crew`'s fold to `< 90rem`

`", AI agent"` widens the job column from about 78 px to 146 px. The column it takes from is the
live one, the role lines. Measured on production's real feed with the cells rewritten:

| Width | Production | Build | Fold to < 90rem |
|---|---|---|---|
| 1280 | 253 px | 185 px | 312 px |
| 1366 | — | 220 px | 338 px |
| 1440 | 316 px | 247 px | 247 px (job column shown) |

At 185 px Atlas's real line runs 7 lines of about 24 characters (`real-agent-1280.png`). The fold's
own comment puts it "where the panel is under about 500 px wide", and the table is 486 px at 1280.
Change `(64rem <= width < 80rem)` to `(64rem <= width < 90rem)` in the fold block, and in the new
rule's query with it. From 1280 to 1439 the job cells hide and `[data-crew-who]` carries "AI agent".
1440 keeps the column and the count of 7. No kept check pins the fold at 1280 (I searched `e2e/crew*`).
P9 reads the job cells at 1440 and the absent sentence at 390. At 1440 the job cells still cost the
role lines 69 px (316 to 247). That's the price of decision 4, and I accept it there.

## 4. P13: ship

On the live fixture's seat 31, Off path, at 1440, 1024 and 800 in both schemes, the dot's box meets
chip "31". With hit-testing on, the topmost element at the dot's centre is a path inside
`[data-tip]`. The close-ups (`p13-light-1024.png`, `p13-dark-800.png`, `p13-light-1440.png`) show
the dot whole over the chip's dashed edge. The copper run also crosses the chip's lower edge but
stays clear of the digits' ink. At 390 the dot doesn't meet the chip.

## Score (as built)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 8.5 | The sheet holds. The key is a drawing's note under its revision table, in the world. |
| Originality ×2 | 8.5 | No template move. The claim is made in the drawing's own grammar. |
| Craft ×1 | 7.5 | The key's tone and gaps file it with the legend, and the role lines are squeezed at 1280. |
| Functionality ×1 | 7.5 | The claim is in the first screen at 1440 and after the rows at 390, but `/crew` on a phone never says it. |

**Weighted:** (2 × 8.5 + 2 × 8.5 + 7.5 + 7.5) / 6 = **8.2/10**. With musts 1 and 2 and should 1,
I'd expect craft 8 and functionality 8.5, about 8.4.
