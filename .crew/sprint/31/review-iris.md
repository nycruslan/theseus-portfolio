# Sprint 31 review, Iris: `/crew` from the feed, and the Crew link

**Verdict: changes, 7.0/10.** Better than production. Every hard gate passes. Two musts, both a few
lines of CSS in `app/globals.css`. First, the crew table splits words in the middle: "Revie / w",
"Road / map", "Motio / n" and "Desig / n" in every state at 768 and 1440, and in the down state at
every width; "Forg / e" and "Prob / e" at 1024. Second, on phones and tablets the Evidence link's
44 px target overlaps the Approval line, and its focus ring strikes through that text. With the two
musts in, I score it 7.9 and would say ship. I proved both fixes by injecting the CSS on this build
(see "Proof" below).

I reviewed `origin/sprint/31-b4a-crew` at `6c749db`, built in `/home/user/wt-iris-31`. Each state
ran on its own `next start` from a copy of `.next`, fed by Probe's fixture server
(`e2e/crew-feed.ts`, `startFeed()`): down on :4720 with no `CREW_FEED_URL`, live :4721, open :4722,
resting :4723, live with `health.quote` :4724 and open with `health.state: "quiet"` :4725. I looked
in Playwright's Chromium 1.64 at 320 × 568, 390 × 844 and 768 × 1024 (DPR 2), and 1024 × 768 and
1440 × 900 (DPR 1). I covered both schemes, forced colours, scripts off, and production's `/` at
the same widths. The references were `crew-1440.webp`, `crew-390.webp` and `rest-390.webp`
(`.crew/sprint/17/design/`), the contract, `design/rubric.md` and the owner's calibration. For the
Log foot call I used `74dd3fd`, the local merge commit in `/home/user/wt-merge-31` (built in
`/home/user/wt-iris-31-log`, served on :4726), because `origin/merge/31` wasn't pushed yet.

My Part 1 notes never reached git, as the brief says. Forge built to them (`680d11c`), and the calls
are restated under "The contract's calls for Iris" below so the record has them.

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | No `TODO(owner)` in `/crew`'s HTML in any of the four states. The page's words are the contract's and the feed's. |
| axe, no serious or critical | 0 violations of any impact in 24 runs: six feed states × 390 and 1440 × light and dark. Tags: wcag2a/aa, 21a/aa, 22aa, best-practice. axe left only `color-contrast` incompletes (15 to 38) (`gates/gates.json`). |
| impeccable detector, nothing at error | `[]` over `app/crew/page.tsx`, `components/crew.tsx`, `crew-table.tsx`, `foot.tsx`, `bar.tsx` and `app/globals.css`. Over the served page: `[]` for down and resting. For live and open, one *advisory* "repeating-gradient stripes": the chip's pencil hatch, the frame's own hatched 17, drawn to the sheet's convention. I accept it. |
| Reduced motion | `document.getAnimations()` is 0 at load, after 2 s, and after a scroll to the bottom, in all four states with and without `reduce`. Nothing moves or pulses. |
| Reflows at 320 | `scrollWidth` is 320 in all six feed states (`states/report.json`). |
| Phone budget | 390 × 844, 4× CPU, 400 kbps, 150 ms latency. LCP is text in the panel: 1,568 to 1,604 ms (down, `p.crew-status`) and 1,628 to 1,632 ms (live, `span.crew-goal`). CLS is 0 (`gates/gates.json`). |

No console errors and no page errors in any gate load.

## First verdict: better than production

Production answers `/crew` with a 404. This page gives PRODUCT.md's second claim, "he can run an
AI org", a page of its own that shows who is working on the site now, who approves it and the rules
it runs under. It is told honestly in four states and reads with scripts off. On `/`, the only
change is in the bar:

- **From 1024** Crew sits after Work (216 to 253 at 1024, 222 to 260 at 1440). Read as page and the
  control haven't moved: Read as page is at 722 to 818 and 1136 to 1234, the control at 842 to 984
  and 1258 to 1400.
- **At 768** the five links run 234 to 548 and the control 566 to 752, on one line with no overflow.
- **At 390 and 320** the bar holds Work, Crew, Log and Contact (175 to 380 and 135 to 310).
  Read as page is at the drawing's foot at the left (16 to 108 at y 300, 44 px tall), beside the
  control, as `rest-390.webp` draws it. The control's buttons haven't moved: the slot now fills
  the row (108 to 374) and the group stays right-aligned at 374 (`gates/home-branch-390.png`
  against `home-prod-390.png`).

Production is now ahead by sprint 30 (#77: the Log at `/log`, Revisions from 30). That difference
belongs to the merge, not to this sprint.

## Musts

**1. The table breaks words mid-word** (`app/globals.css`, "The crew"). `.crew` sets
`overflow-wrap: anywhere` so that a long token from the feed can't widen the page. That also drops
every cell's minimum width to one character, so the auto-layout table squeezes the name and
role-word columns to their `width` (68 and 60 px; 48 in the fold) and splits the words. Seen in
`states/live-1440-light.png` (Revie/w, Road/map, Motio/n, Desig/n), `live-1024-light-full.png`
(Forg/e, Prob/e), `down-390-dark-full.png` and `down-320-light-full.png` (Roadm/ap). The rows grow
from 47 to 70 px, which pushes the now line from 610 to 702 at 1440. The fix:

```css
.crew-name,
.crew-word {
  white-space: nowrap;
}
```

Keep `overflow-wrap: anywhere` on `.crew` for the free text (lines, moments, goal, facts). Measured
with the fix: every row is 45 to 47 px at 390, 768, 1024, 1280 and 1440 in every state (66 px only
where a 320 line wraps). The columns land at 849 / 917 / 996 / 1088 to 1111 at 1440, against the
frame's 873 / 953 / 1024 / 1147 with its 8 px wider gutter. `scrollWidth` holds at 320, and all
seven rows and the now line start inside 1440 × 900 (now at y 610).

**2. Below 1024 the Evidence target overlaps Approval, and its ring strikes the text**
(`app/globals.css`, `.crew-link` and `.crew-facts`). The link is 44 px tall on a 19.5 px line box,
pulled back by `margin-block: -12px`, and the grid row gap is 8 px. So the box overlaps
Approval's first line by about 4 px, and the 2 px ring, drawn 2 px out, crosses "Not given yet"
(`gates/focus-evidence-390-dark.png`). A tap on the top of that line can land on the link. Give the
link row its own height instead:

```css
.crew-facts {
  align-items: baseline; /* "Evidence" sits on the link's baseline */
}

@media (width < 64rem) {
  .crew-link {
    margin-block: 0;
  }
}
```

Measured at 390: the link is at 1210 to 1254 and Approval starts at 1262, which leaves 8 px clear
of the box and 4 px clear of the ring. The ring's top stays clear of the facts' rule too. From 1024
nothing changes: the link is 24 px with no margin.

## Cheap changes (worth it; none blocks)

1. **The chip's number sits on the goal's first line** (`app/globals.css`, `.crew-chip-number`):
   `align-self: auto` in place of `center`. When the goal wraps (always with the record's goal at
   320 and 390, and with the live goal at 320) the box floats between the lines
   (`details/live-chip-320.png`, `states/down-320-light-full.png`). With the change it boxes the
   first line, as the frame's 17 does (`fix/fixed-down-320.png`).
2. **Cap the facts' measure:** `.crew-facts dd { max-width: 66ch; }`. From 768 to 1023 the panel is
   full width and Rules runs about 105 characters a line at 13 px (`states/open-768-light-full.png`).
   At 1440 and at 390 the cap doesn't bind.
3. **Two sentences a board member stumbles on** (the contract's call 4; Atlas relays these to Probe
   and Forge together):
   - "The pull request opens at the close-out." becomes "The pull request opens at the end of the
     sprint." "Close-out" is the crew's word, not the visitor's.
   - The live Approval sentence becomes "Not given yet. The pull request merges only after the
     checks, Lens's review and Ruslan Shulga's rules pass; what his rules leave to him waits for
     him." As written, "anything they reserve" can be read as the checks, the review or the rules,
     and "reserve" is opaque.

I leave the stacked day stamp in the moments ("23 Oct" over "23:55" in the 3rem time column) as
it is: it reads as a date stamp, and it is the only row that carries a day.

## Proof of the fixes

I injected the musts and the first two cheap changes as one style tag on this build, in all four
states at 320, 390, 768, 1024, 1280 and 1440 (`fix/fix.json`, `fix/fixed-*.png`). `scrollWidth`
equalled the viewport everywhere. Row heights, column edges and the Evidence and Approval numbers
are the ones quoted above. `fix/fixed-live-1440.png` reads as `crew-1440.webp`'s panel: the role
words on one line, every row one line, and Activity, the now line and at least eight moments inside
the first screen.

## The states, as built

- **Live:** the status reads "Live". Working rows have a copper dot and word, and the now line is
  copper. Nothing else is copper: the chip, the links, the Close box and the facts are ink or
  graphite. The quoted now line reads "now Atlas: “…”", with "Atlas:" at 600, the quote at 400 and
  curly marks (`details/quote-now-1440-light.png`). That is how a quote should be marked.
- **Open:** "Waiting on the owner" (or "Paused" when the run stopped). Working reads as an open-ring
  Waiting. No copper and no now line.
- **Resting:** "Crew resting. Sprint 29 merged 24 Oct, 02:47 UTC.", every called role Done with an
  ink dot, and the chip seated (ink on card). It states a fact and doesn't apologise.
- **Down:** "The live feed isn't answering. Here is the latest revision on record." The chip is the
  record's (29, boxed and seated), and the table is the roster: name and role word, no state, no
  line. Evidence links PR #76. The panel still reads as designed, as a roster with its facts.
- **Forced colours** (`gates/forced-*.png`): the dots are borders, so they paint (Working and Done
  filled, Waiting open), the in-progress chip is dashed, Close and the links are LinkText, and the
  focused Close has one ring. **Scripts off:** the same state, the same rows and the same page height
  at 390 and 1440 (`gates/noscript-*.png`). **Tab:** skip link, wordmark, Work, Crew, Log, Contact,
  Read as page (the bar from 768, the foot below), Close, then Evidence. Each focused link has one
  2 px ring in the scheme's ink, 2 px out.

## The contract's calls for Iris

1. **The panel's layout, and the fold.** I confirm what was built (Forge's `680d11c` took my numbers).
   - **From 1024:** the drawing and the panel sit side by side, 16 px in. The panel is
     `min(600px, 42.86%)` behind a 1 px ink rule, with 24 px padding. The drawing is sticky under
     the bar (`top: 72px`).
   - **Below 1024:** the drawing, then its foot, then the panel under the 2 px ink rule that opens
     the title block on `/`, with 16 px gutters. From 768 to 1023 the drawing is centred at 600 px.
   - **The fold:** the "Not on this sprint" rows fold into `p[data-absent]` ("Pixel and Iris are
     not on this sprint."), and the role word drops, wherever the panel is under about 500 px:
     below 768, and from 1024 to 1279. In down the table is the roster, so the role words stay.
     With must 1 in, the fold holds at 1024 (`fix/fixed-live-1024.png`).
2. **Read as page on `/crew` below 768:** at the drawing's foot, alone, at the left: the same 44 px
   row, underline and 16 px edge as on `/`, where the control sits on the right. Keep it there, so
   the link has one home below 768 on every route with a drawing.
3. **The moments' words for a non-engineer.** Don't add a kind label per moment, now or later. A
   column of "verdict", "gate" and "ticket" adds the crew's jargon without adding meaning, and the
   fixture's sentences ("Lens: ship", "PR #78 opened", "Briefed Forge, Probe, Quill and Iris")
   already say who did what. Where a text means nothing to a board member ("Roll call: GO · 5/5"),
   the fix is the sentence the Studio writes into `text`, not a label on this site. That is the
   owner's call, since the crew doesn't work on the Studio. Leaving kinds out of the panel isn't
   worth a sprint either: ten moments is already a short record.
4. **The words.** Keep "Paused", "This run on the Studio" and the down line's second sentence.
   Tighten "The pull request opens at the close-out." and the live Approval sentence as in cheap
   change 3.

**The Log's foot below 768** (Forge's question, after the merge). Keep it where `74dd3fd` puts it:
at the end of `.log-head`, after the count line, at the left on the 16 px edge, 44 px tall and
underlined, before the 2 px rule that opens "Every revision" (`log/merge-_log-390-light.png`,
`merge-_log_13-390-light.png`, `merge-_log-320-dark.png`). The ghost hull's caption and count belong
to the drawing, so the end of that block is the Log's "drawing foot". That makes one rule for every
route: below 768 Read as page sits at the left of the drawing's foot. It measures 16 to 108 at
y 351 on 390, with no overflow at 320, 390 or 767, and on `/log/13` it sits 24 px above the
record's frame. `log-390.webp` predates the move, so the owner sees it as part of the moved
assertion.

## Scores

Design quality ×2, Originality ×2, Craft ×1, Functionality ×1.

| | As built | With the musts |
|---|---|---|
| Design quality | 7: one sheet with `/`, with the same faces, rules and tokens, and copper kept for what is live. The split words break the table's columns, which is the panel's main structure. | 8 |
| Originality | 7: the crew shown as a draughtsman's title block, live from a real feed, with the pencil plank as its chip, is this site's own idea. The 2D drawing is `/`'s, though, and the frame's spectacle (the hull and the copper tip) waits for B4b and B4d. | 7 |
| Craft | 6: words broken mid-word in every state, the Evidence ring over Approval on phones, and the chip floating on a wrapped goal. | 8.5 |
| Functionality | 8: server-rendered, the same with scripts off, a correct Tab order, 44 px targets and honest states. The Evidence target overlaps the next line on phones. | 9 |
| **Weighted** | **7.0** | **7.9** |

## For the owner: what departs from the approved frames

`/crew` follows `crew-1440.webp` and `crew-390.webp` with these departures. The drawing is the
sheet's 2D lines plan (profile and half-breadth plan, with plank numbers from 768), not the frame's
3D hull, and the hatched pencil plank with its copper tip isn't drawn yet. Those come with B4b
(the pencil and the rest line on `/`) and B4d (the hull and the motion control). So `/crew` has no
Full, Calm, Off control, and its bar ends with Read as page. At 390 the drawing is the same profile
sheet as `/`'s phone sheet, not the frame's body plan.

Below 768, Read as page leaves the bar for the drawing's foot on every route that has a drawing:
on `/` beside the control, as `rest-390.webp` draws it; alone on `/crew`; and on `/log` after the
count line. The bar keeps four links: Work, Crew, Log and Contact.

The Rules line is new and true of the Studio: "Only real events from the crew's sessions, as they
happen. Its briefs and words are public; credentials are masked before anything is stored.
Visitors watch: they can't start or steer the crew." It replaces the frame's "filtered at the
source … Never prompts", which the Studio doesn't do.

Additions the frames don't draw:
- a status line under the chip, in one of five forms ("Live", "Waiting on the owner", "Paused",
  "Crew resting. Sprint n merged …", "The live feed isn't answering …");
- the state word Done, with an ink dot;
- the sprint number boxed as a plank: hatched in pencil while the sprint runs, seated on the card
  once it has merged;
- up to ten moments, under a dated "Activity, 24 Oct (UTC)";
- Evidence, Approval and Rules on phones too, where `crew-390.webp` shows only Approval;
- "This run on the Studio" in place of "This canvas".

The quoted now line marks Atlas's own words as "Atlas: “…”".

## Screenshots

All are in `/home/user/wt-iris-31/.crew/screenshots/sprint-31/`, which git ignores.

- `states/{down,live,open,resting,quote,quiet}-{320,390,768,1024,1440}-{light,dark}.png`: the
  first screen of each state, width and scheme. `…-full.png` is the whole page. `report.json`
  holds every part's box.
- `states/live-1440-light.png`, `live-1024-light-full.png`, `down-390-dark-full.png`,
  `down-320-light-full.png`: must 1, the split words.
- `gates/focus-evidence-390-dark.png`: must 2, the ring across Approval.
- `gates/focus-close-*.png`, `gates/hover-close-*.png`: Close focused and hovered.
- `gates/forced-{live,open,down}-{390,1440}-{light,dark}.png` (plus `-close-focus`): forced
  colours.
- `gates/noscript-{live,down}-{390,1440}.png`: scripts off.
- `gates/home-{branch,prod}-{320,390,768,1024,1440}.png`: `/`'s bar beside production's.
  `gates/gates.json` holds the axe, LCP, CLS, Tab-order and bar measurements.
- `details/*.png`: close-ups of the quoted now line, the chip at 320 and 1440, and the tables in
  each state.
- `fix/fixed-{live,down}-{320,390,768,1024,1280,1440}.png`, `fix/fixed-{open,resting}-1440.png`,
  `fix/fix.json`: the musts and cheap changes 1 and 2, injected and measured.
- `log/merge-_log{,_13}-{320,390,767}-{light,dark}.png`, `log/prod-…`: the Log's foot after the
  merge, beside production's bar.

## Not verified here

- Close and Back landing on `/` with the name in view (B4.11). I only read the hrefs; that is
  Probe's check.
- The real feed on the preview (contract decision 6, the owner's).
- `origin/merge/31` itself, because it wasn't pushed when I looked. The Log foot call is on
  `74dd3fd`, the merge commit in `/home/user/wt-merge-31`; I didn't diff it against the head that
  gets pushed.
- A GPU and a real phone. SwiftShader's colours are exact, and nothing on `/crew` moves.
