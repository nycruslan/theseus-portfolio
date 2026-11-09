# The yard in hand: the milestone's demo (Quill, sprint 61)

**Verdict: the yard is in a visitor's hand, and the crew stands down once sprint 61 merges.** All
five of the plan's questions hold on production at the windows that matter. A visitor sent
`/log/23` on a phone can press on without scrolling, on every step and in every mode. `/log` says
"Rebuild it yourself" in its first screen. The hint sits right under the press wherever a hold
riffles, and a held finger riffles. At 45 the page says why it stopped. From `/` the door sits
beside the Log link, and the hiring executive's first screen hasn't moved.

Nothing I found makes the site say something false or hides a fact, so no defect reopens work
(`ROADMAP.md`'s stand-down conditions). What's left is two narrow seams at 320 × 568, the focus
ring that sprint 61 is already lowering, and one deployed-read guard for Probe (below, "Left open").

## How I measured

- **Where:** https://theseus-portfolio.vercel.app, 2026-11-09. It serves #126: `/`'s revision block
  ends "All 59 revisions in the Log" and `<a href="/log/1">Rebuild it yourself</a>` with the Log
  link's classes, and the newest step is `/log/60` (`/log/61` answers 404). Sprint 61 was live
  during my reads: `/`'s pencil row read "The yard's demo, and a focus ring that clears the keel ·
  drawing now". https://portfolio.ruslanshulga.com answered 403 to CONNECT through this sandbox's
  proxy again, so I didn't read it.
- **With what:** my own scripts in the session's scratchpad, on Playwright 1.64.0's Chromium
  headless shell (1248) with SwiftShader WebGL, sprint 58's method:
  - `fold.js`: the link to press, the question, the chapter line, the hint and both drawings on
    `/log`, 1, 13, 23, 45 and 60, at 390 × 664, 360 × 640, 320 × 568, 390 × 844 and 1440 × 900 with
    scripts off and in Full, and at 390 × 664 and 320 × 568 in Calm and Off stored (84 loads);
  - `hold.js`: a held finger (CDP `Input.dispatchTouchEvent`, a touch context) on Next from 13 and
    from 30 at 390 × 664 and 320 × 568, in Full and Calm, and a held mouse at 1440 × 900;
  - `home.js`: `/`'s title block, Log link, door, legend and count line at nine windows from
    1536 × 715 to 320 × 568, scripts on and off, and `/read`; then the door followed, by a click
    at 1440 and a tap at 390 × 664;
  - `ring.js`: a focused Next's ring (reached by Tab) against the ghost's keel at the three phone
    windows, scripts off and in Full, with 3× crops.

  Screenshots are in the scratchpad's `shots/`, not in git.
- **The specs, unedited, against production:** `PLAYWRIGHT_BASE_URL=https://theseus-portfolio.vercel.app
  pnpm exec playwright test e2e/log-hand.spec.ts e2e/home-door.spec.ts e2e/log-yard.spec.ts
  e2e/log-cards.spec.ts e2e/log-press.spec.ts e2e/log-riffle.spec.ts --workers=2`. The result is
  under "The spec run".

## The five questions

| The plan asks (`.crew/sprint/58/plan.md`, "The demo") | What production showed | Holds? |
|---|---|---|
| Sent `/log/23` on a phone, can they press on without scrolling? | The link to press is wholly in the first screen, at scroll 0, on `/log/1`, 13, 23, 45 and the newest step (previous on 60): 379.3–423.3 at 390 × 664, 367.4–411.4 at 360 × 640 and 351.4–395.4 at 320 × 568. That's the same box on every step, with scripts off and in Full, Calm and Off, and `elementFromPoint` at its centre is the link every time. In sprint 58 it was 639–780, cut or below the fold at all three. The question on 23 is wholly in view at 390 × 664 (564.0–610.8) and 360 × 640 (575.3–622.1). At 320 × 568 it starts 8.7 px above the fold (559.3), as H1 allows. A tap on the door at 390 × 664 lands on `/log/1` with Next at 379.3–423.3, scroll 0. | **Yes** |
| On `/log`, can they tell in five seconds that the ship can be rebuilt? | "Rebuild it yourself" is in the first screen at every window: 519.2–563.2 at 390 × 664, 514.5–558.5 at 320 × 568, and 533.5–559.0 at 1440 × 900, right under the ghost and beside "Watch the crew build the next one on Crew". It's a verb offered to the visitor, where "Start again from sprint 1" assumed a start they never made. It's quiet, an ink link like its neighbour, and that's the sheet's voice: the words do the inviting. | **Yes** |
| Do they find the hold without being told twice? | "Hold to flip through the sprints" sits right under the press on every step: 427.3–441.3 at 390 × 664, 399.4–413.4 at 320 × 568, and 495.2–509.2 at 1440 × 900 on 13. It shows in Full and Calm once the yard plays, and it's hidden in Off stored and with scripts off, where a hold doesn't riffle. A held finger riffles: at 390 × 664 from 13 it reached 23 in 2.7 s in Full and 4.0 s in Calm, and stopped there while held. There was no scroll and no text selected, and `history.length` stayed 2. | **Yes**, told once a page, under the thumb |
| At 45, do they know why it stopped? | A held finger from 30 stops at 45 (3.7 s at 390 × 664, 3.0 s at 320 × 568). It's shown with "Every plank up to sprint 23 is out too." under the count line ("… Since then the crew has replaced 22 planks of its own."). It's in view at 390 × 664 (587.2–610.6), 360 × 640 (598.5–621.9) and 1440 × 900 (329.6–356.9), and visible after a mouse hold stops there too. **At 320 × 568 it's wholly below the fold** (582.5–629.3), so the smallest phone sees the stop but not the reason without a scroll. | **Yes**, but not at 320 × 568 |
| From `/`, do they find the door, while the hiring executive's first screen stays as it is? | The door is the revision block's last line, beside "All 59 revisions in the Log", and the newest row says what it is ("On the first page, a plain link now invites you to rebuild the ship"). At 1440 × 900 it's wholly in view: 842.3–866.3 in the default state, 850.2–874.2 live. It's also in view at 1280 × 800 (773.8–797.8) and 1024 × 768. It sits below the fold with the Log link at 1366 × 768 and 1536 × 715, as before Hb, and about two screens down on a phone (1335.8 at 390 × 664), where the bar's Log link and `/log`'s own "Rebuild it yourself" are the way in. The contact links' bottom is unchanged against Iris's pre-Hb numbers (`.crew/sprint/60/fit.md`). It's 866.31 default and 874.17 live at 1440 × 900, 564.25 at 390 × 844, and 700.2 at 1536 × 715 (`.crew/sprint/46/close.md`: 700). At 320 × 568 it's 587.6, below the fold, as it has been since sprint 44 (reported only, W8). The legend keys "Seated by a sprint" and no "Original" on `/` and `/read`, where the count line reads "22 planks: 22 replaced, 0 original" and no original plank is drawn. Following the door lands on `/log/1` with a 200. | **Yes** at laptop windows; on a phone the way in is the Log |

## The visitor's read

- **The hiring executive on `/`:** the same first screen as before the milestone, with the name,
  role, bio, four particulars and contact links. The door adds no line at 1440 × 900 and reads as
  what it is, a second plain link in the block that already advertises the toy in its rows. It
  doesn't compete with the contact links, which are the executive's goal.
- **The person sent `/log/23` on a phone:** they land on the question, with "Seat sprint 24's
  plank →" under the ghost and "Hold to flip through the sprints" under that. This is the
  milestone's reason, and it's now true at 390, 360 and 320 wide.
- **The second reader on `/log`:** "Rebuild it yourself" is the first link under the ships. One tap
  gives a step page whose press is under the thumb at the same height on every step. That is the
  flip book, and it stays put as they flip.
- **What would make them leave:** at 320 × 568 the riffle's stop at 45 says why only below the fold.
  Nothing else I saw would. The 3D was quiet, with no console error from the site over every load
  in `fold.js`, `hold.js` and `home.js`.

## The focus ring against the keel (production as it stands)

Sprint 61 lowers the phone step row 4 px for this. Production doesn't have that yet. A focused Next
(reached by Tab, `:focus-visible`, a 2 px solid ring at a 2 px offset) starts 4 px above the link,
inside the ghost's box, and its top edge runs along the keel:

| Window | Link top | Ring top | The keel's lowest stroke under the ring | Overlap |
|---|---|---|---|---|
| 390 × 664 | 379.34 | 375.34 | 377.76 | 2.42 px |
| 360 × 640 | 367.38 | 363.38 | 366.01 | 2.64 px |
| 320 × 568 | 351.42 | 347.42 | 350.29 | 2.87 px |

The numbers read the 2D drawing's geometry, which Full keeps under the canvas. The 3× crops
(`shots/ring-*.png`) show the ring's top edge merging with the hull's line in both modes, the 3D
keel's included.
It's cosmetic and seen only by keyboard visitors, within Iris's 2.06–2.87 px from her review of
#125. It isn't a stand-down defect. Once sprint 61 merges, its own checks (H1's guard at 4 px) are
the proof, and I haven't seen that build.

## The spec run

The six specs, unedited, against production with 2 workers: **55 passed and 2 failed, in 15.3
minutes** (57 tests). I re-ran the two reds once: H8 passed and Y10 failed again.

- **Green:**
  - H1 (all four windows' passes, the walk at 390 × 664, and Iris's placement guard);
  - H2, H3 (shown and hidden), H4 (the rule in the server HTML, and the chapter in Full), H5, H6
    and H7;
  - H9 and H10. Under `PLAYWRIGHT_BASE_URL` they read the default state alone, and say so;
  - Y1 to Y9, and Y11 to Y24.
- **H8 red, then green.** The first run read production's legend as "default" while sprint 61 was
  live, and got "Seated by a sprint", pencil, copper. That is H8's own live rule, so the site was
  right and the read was wrong. The re-run passed, likely on a cached build page. My own first load
  of `/` at 1440 also got the default block, and later loads got live. A pass that flips with the
  feed is a guard to name (below), not a defect.
- **Y10 red twice, on `/log/60` alone.** Its og:image:alt reads "Sprint 60: On the first page, a
  plain link now invites you to rebuild the ship", and the oracle wants "Sprint 60 · 9 Nov 2026:
  …". The oracle reads this branch, which carries sprint 60's merge record (b08e66e), and
  production was built before it. That's the newest-step gap sprint 58 named, which closes when
  #127 merges.
- **H7's readout** (reported, not gated):
  - the 3D chunk is 167,244 B gzip -9, +11 B against main's pin, with 82,756 B left of 250,000;
  - the WebGL-refused `/log/13` loads 9 scripts, 140,991 B, which is +2,355 B against the spec's
    pin of 138,636.

  That pin is a local build's, and production's HTML lists 9 Next chunks with no Vercel script. I
  didn't find the cause. B2.10 and B5.10 gate the loader in CI's `check`, which `protect-main`
  requires before #125 and #126 could merge, and I didn't read those runs. So I report it, and
  Atlas can compare it against sprint 61's own CI run.
- **Y24's INP** (reported), at 4x CPU on SwiftShader, 1440 × 900: 912 ms over 5 interactions, and
  a 3 s mouse hold made 7 steps. That's a floor, not a GPU's number, and it's within Yd's 712 to
  1,344 ms.

## Left open

- **320 × 568, two seams.** The question starts 8.7 px above the fold, and the chapter line at 45
  is wholly below it. Both were measured and accepted in Iris's placement
  (`.crew/sprint/59/placement.md`, "Not measured"). 320 × 568 is reported only, everywhere on the
  site, since sprint 44. Neither hides a fact, since one scroll shows it, so neither reopens work.
  Sprint 61's 4 px lower row moves the chapter line 4 px lower there too.
- **The ring against the keel:** sprint 61's rider, above.
- **For Probe: H8's deployed read.** `e2e/home-door.spec.ts`'s `statesFor` keeps "default" under
  `PLAYWRIGHT_BASE_URL`, but a deployment is never in the default state (`.crew/STATE.md`, Specs):
  production was live and its legend read "Seated by a sprint", "In progress", "Drawing now",
  which is H8's own live rule. The pass went red once and green on a re-run. Either read the state
  the deployment shows or skip the deployed pass with its reason. It's the same trap as W2 and P9 in sprint 45. It rides with the next sprint on
  `e2e/`, and it doesn't reopen work.
- **The newest step's date:** Y10 on `/log/60` is the gap sprint 58 named. The oracle reads this
  branch's sprint 60 merge record, which production was built without, and it closes when #127
  merges.
- **Still waiting, unchanged:** the step links' numbers during a press and a riffle (Pixel, sprint
  59's follow-up). The cold-load display face (`display: optional`) is Iris's, parked since sprint
  42. My first Full context's `/log` at 390 × 664 looks like the fallback face in its screenshot,
  though I didn't read it with CDP this time. Yd's INP cuts and Lens's `yard.ts:526` nit also
  wait.

## Does the crew stand down?

**Yes, after sprint 61 merges.** The milestone's outcome holds on production, and no defect makes
the site say something false or hides a fact. Work reopens only on the roadmap's three conditions:

- the owner sets a goal or answers a pick (the yard's direction, the tally at 23, #101);
- a defect on production;
- the owner plays `/log/23` on his own phone and wants more.

The owner's one cheap check is still the one the cloud can't make: Safari on a real phone, a long
press on Next. While the yard plays, the step links carry `-webkit-touch-callout: none`. That's a
Safari property Chromium ignores, so only Safari can show whether a long press riffles or opens the
link's menu.

## Proposed for `ROADMAP.md` (Atlas ticks it)

Rename "## Now: the yard in hand" to "## Finished: the yard in hand", and put this paragraph at its
head, above the outcome:

> Ha and Hb merged by 2026-11-09 (Hb, #126, last). Quill ran the milestone's demo on production in
> sprint 61 (`.crew/sprint/61/demo.md`), and all five of the plan's questions hold:
>
> - On every step, the press is wholly in a phone's first screen at 390 × 664, 360 × 640 and
>   320 × 568, the same box on every step, scripts on and off. A held finger riffles to 23 and 45.
> - `/log` says "Rebuild it yourself" in its first screen.
> - The hint sits under the press wherever a hold riffles.
> - At 45, "Every plank up to sprint 23 is out too."
> - `/`'s door is in the first screen at 1440 × 900, with the contact links where they were.
>
> Left open: at 320 × 568 the chapter line is below the fold, and the question starts 8.7 px above
> it (accepted); H8's deployed read assumes the feed's default state (Probe); the owner's look on
> Safari on his phone.

Then add, after Hb's item:

> - [x] The milestone's demo (sprint 61, PR #127): Quill on production, `.crew/sprint/61/demo.md`.
>   The yard is in hand, so the crew stands down. Sprint 59's Log CSS follow-ups rode along.

The "Then the crew stands down" bullet stays as written. Its three conditions are the ones that
hold.
