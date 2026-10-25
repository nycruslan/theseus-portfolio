# Sprint 33 review, Iris: the ghost hull in 3D on `/log` (B5c)

**Verdict: ship, 8.7/10, on 57ced20.** The must below is in; see "Decision on the lit mix" at the
end. On 937be40 it was changes, at 8.4, and the rest of this review is that review. It's better than
production at 390, 1024 and 1440 in both schemes, and every hard gate passes. **One must:** the last placement change pulled the numbers to the ends
of their planks, so at 1440 they clump at the stern and the bow, and they slide along the hull
during the move. It is a cheap revert inside `riders()`. With it fixed I'd say ship, at about 8.7.

**What I reviewed.** The sprint head is 937be40 (Pixel's ghost with "8" led out, Forge's control on
`/log` and the records). I built it fresh in `/home/user/wt-iris-33` and served it on 4823, then
looked in Playwright's Chromium (SwiftShader):
- at 320 × 640, 390 × 844, 768, 1024 and 1440 × 900, light and dark, on `/log` and `/log/13`;
- with the model in Full, in Calm and Off;
- the move on Playwright's clock.

I compared it with production (still B5a: Vercel refused #82's deploy, and refused this PR's
preview too, "Deployment rate limited"), `log-1440.webp`, `log-390.webp`, `notes-iris.md`, my early
look and its decision, and `design/rubric.md`. The frames and `gates.json` are in
`.crew/screenshots/33-iris/review/`.

## Hard gates

| Gate | Result |
|---|---|
| No placeholder added | It adds no copy beyond the button labels `/` already has. No `TODO(owner)`, no stand-in, `content/` untouched. |
| axe, no serious or critical | 0 violations of any impact (wcag2a/aa, 2.1, 2.2aa, best-practice). Checked on `/log` and `/log/13` at 320, 390, 768, 1024 and 1440, light and dark, with the model at rest and with Off stored: 40 runs (`gates.json`). |
| impeccable detector, nothing at error | `impeccable detect --json` over `components/log.tsx`, `components/bar.tsx`, `components/model.tsx` and `app/globals.css`: `[]`, exit 0. |
| Reduced motion | It opens settled with no moving state. Only the svg's 240 ms opacity fade runs, which is not motion. Picking and the control work the same. |
| Reflows at 320 | `scrollWidth − clientWidth` is 0 on all 40 runs. |
| Phone budget | 390 at DPR 2, 4× CPU, 400 kbps and 150 ms. LCP is text in `main`: the count line at 1,700 and 1,756 ms on `/log` (Calm and Full), and the record's `h2` at 1,728 and 1,812 ms on `/log/13`. 0 layout shifts through load + 6 s, so CLS 0. On that profile Full gives up to the still frame (the quality net), as designed. |

## Side by side with production

**Better.** Production's `/log` (`prod-log-{390,1024,1440}-light.png`) is the flat B5a page. Here:
- the ghost stands up as a translucent vellum hull, open and shadowless. The far side's seams show
  faintly through the near planks, and its inside shows above the near sheer;
- the numbers ride their planks;
- a pointer on a plank inks its edges and opens its record, and the table stays the keyboard's way
  in;
- the control sits where the rest of the site taught the visitor to look.

It is the archive moment the direction promised: the same ship as `/`, made of what was taken out.
It reads in a second at 1440 and on a phone.

## Must

1. **Put the numbers back at their planks' middles.**
   - **What changed:** 937be40's "numbers clear of every line" lets the clearance search run the
     whole plank, so numbers settle where the projected band is deepest, which is often a plank's
     end.
   - **At 1440 (`cmp-937b-1440.png` against `cmp-0352-1440.png`, same crop, CSS px):**
     - moved aft: "6" by 169, "14" by 112 and "1" by 96;
     - moved toward the bow: "15" by 127 and "9" by 96;
     - so a cluster of eleven numbers fills the stern quarter, seven bunch at the bow, and the
       middle of the hull holds three;
     - "6" now sits against its butt beside "22" and "3", and "15" against "10". Which plank a number
       belongs to gets ambiguous: that's the thing the numbers are for.
   - **During the move** each number slides along its plank as it rides (`zmv-0304.png`: "6" is
     already 127 px aft of its frame-1 place). That reads as numbers swimming, not riding.
   - **The fix:**
     - Search for clearance only within the middle half of each plank's 2D body stretch (the
       `plankBody` stretch the 2D centres on), nearest the 2D anchor's x first.
     - Keep 83f321d's vertical centring in the projected band, the stagger and "8"'s lead-out.
     - Where nothing in that window clears, take the anchor's x and accept the touch (decision
       below).
   - **Done when:** at 1440 every number is within the middle half of its plank, the hull shows the
     2D's even rhythm, and no two numbers on adjacent planks of one lift read as a pair across their
     butt. 83f321d already looked like this (`r2-z-1440.png` in `../early/`).

## Decision on the remaining touches (the coordinator's question 1)

**Accept them; lead out no more numbers.**
- With the middles back, the touches are 83f321d's: at 1440 only "23" passes its butt about 1 px
  clear; at 768 and 1024 "23", "11", "1", "4" and "13" may touch their plank's seams, butts or the
  keel, the record mark included.
- **"23" can't be led out:** 22 units aft of its plank is past the transom, outside the drawing's box
  and the canvas at every width (about x = 9 at 1440).
- **"11", "1", "4" and "13"** would add three or four more leaders around the stern and keel.
- A digit grazing its own plank's edge reads as the plank. Clumped numbers and a fan of leaders read
  as noise.
- **The bar, final:** no line crosses a digit at 1440, except "23"'s graze. From 768 to 1279 the
  stern's and keel's five may touch. `LED_OUT` stays 3.0 and 5.0.

## Everything else (no change asked)

- **Material and colour,** against my notes and early look: both sides, α 0.7, pencil seams in light
  and graphite at night, no shadow. The early look's composites hold, and the recheck passes (dark
  1024 under "15" at L 0.475, light 1440 under "23" at 0.865).
- **Canvas** on `[data-ghost]`'s box at every width, the svg hidden once the model is up. Frame 1 is
  the 2D exactly (`zmv-0000.png`), and the move settles at 1.8 s on the clock.
- **"8" led out** aft from 768: its leader grows from the plank as it rides, it reads as the same
  callout as "20", and a pick on its number opens `/log/8`.
- **The pick:** all 22 numbers' centres give their own seat with a `pointer` cursor at 768 and 1440;
  off the hull there is no seat and the cursor is `auto`.
- **The control's place:**
  - in the bar after Read as page: 186 × 44 at 768 (568 to 752), 142 × 32 at 1024 and 1440, one
    line, on `/log` and every record;
  - below 768, its row under the lines figure, as I asked: 462 to 506 at 390 and 495 to 539 at 320,
    the group at the right end, everything through Every revision's head in the first screen;
  - Off stored shows Off pressed, and the WebGL-refused nit rides (Forge).
- **The lines figure's rule** takes the header's column from 640 to 1023 (my #82 rider), and reads
  right at 768 (`full-log-768-light.png`).

## Scores

| Criterion | Now | After the must | Why |
|---|---|---|---|
| Design quality ×2 | 8 | 8.5 | One coherent sheet: vellum on film, ink only for links and marks, the hull as the page's figure. The clumped numbers break the drawing's rhythm at 1440. |
| Originality ×2 | 9 | 9 | A translucent vellum ghost whose far seams show through, its numbers riding as callouts. Not a template; nothing in the calibration set does it. |
| Craft ×1 | 7.5 | 8.5 | The canvas, frame 1, the control's row and the lines figure's rule are exact. The swimming numbers and the cluster at the stern cost a point, and the 768 to 1279 touches half of one. |
| Functionality ×1 | 9 | 9 | Pick, tap, drag-to-scroll, the table for the keyboard, Calm, reduced motion and Off; LCP 1.7 s, CLS 0. |
| **Weighted** | **8.4** | **8.7** | (2·8 + 2·9 + 7.5 + 9) / 6, then (2·8.5 + 2·9 + 8.5 + 9) / 6 |

## The frames' departures, for the owner (to list on the PR)

1. Both sides of the hull, translucent; `log-1440.webp` drew the near side only.
2. No "or a plank in the hull" in the table's lede (untrue on Off).
3. No numbers below 768, B5a's rule.
4. In 3D, "8" is set out on a leader, as "20" already is; the Off drawing keeps it on its plank.

## Not verified

- Everything is SwiftShader in headless Chromium. The move's feel at 30 fps, and the phone's frame
  rate, wait for a GPU and the owner's phone.
- Neither production nor this PR's preview deploys while Vercel's rate limit holds, so the owner
  has nothing to demo on until one does.
- Pixel's full suite was running in parallel; I didn't rerun it.

## Decision on the lit mix (Iris, after Pixel's db4ab8e, built at 57ced20)

**`GHOST_LIT` 0.4 is accepted, and the bands don't change.**

- **What I looked at:** 57ced20 on 4823, Calm, at 390, 1024 and 1440 in both schemes
  (`.crew/screenshots/33-iris/review/lit04-*.png`).
- **The form still reads at 0.4,** against 937be40 at 0.5. The 3D comes mostly from the open
  inside, the far sheer and the seams' curve, not from the depth of the shading. The bilge still
  darkens toward the keel.
- **0.4 keeps the hull's inside off the paper.** At 0.5 the inside above the sheer reached the film's
  0.952, so the hull's inside read as the page. On 57ced20 at 1440 light, sampled clear of lines:
  - the inside is `#dfebea` to `#e1edec`, about OKLab L 0.93 to 0.94, under the film's `#eaf1ee`;
  - the keel planks are `#c6d4d2` to `#c9d7d5`, about L 0.86.
- **The bands stay as B5.18 has them.** One clean cell at 0.844 is a cell, not a seat: every seat's
  median is 0.854 or more and B5.18 passes. Dark reads 0.429 to 0.482, inside its band and under
  `--card`.
- **The must is in:** the numbers are back at their planks' middles with the 2D's rhythm at 1440,
  1024 and 390, none closer than 2 px.
- **My verdict stands at ship, 8.7,** on the review's "after the must" scores, assuming the full
  suite on the final head is green (I didn't rerun it).
