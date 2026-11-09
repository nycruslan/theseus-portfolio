# Hb: the door's fit, re-measured (Iris, sprint 60)

**Call: it fits.** With "Original" gone, at no W1–W17 pin do the contact links sit lower than today's lowest state, and from 1380 to 1440 × 900 they never leave the first screen on either face.

They do move at seven pins, in two ways only. Open drops 7.86 px to the live state's place at 1439 × 900, 1439 × 1000 and 1440 × 900, the move the plan names. Live or open rise 23.5 px at 1024 × 1000, 1180 × 1000, 1280 × 900 and 1280 × 1000. W2's two states don't move. Read "moves" as any move in any state and Hb waits; I read it as the plan's own Hb text does.

## How I measured

- **Where and how:** production on 2026-11-09 (Ha merged as #125; "All 58 revisions in the Log"), in CI's `@playwright/test` 1.64.0 headless shell 156.0.8078.4, Desktop Chrome, WebGL refused. Two faces: the webfont warm (Log link 145 px) and the webfonts blocked (fallback, 150 px). A fresh load at each window, plus 1 px resize sweeps at 320–1023 × 900, 1024–1470 × 900 and 1024–1630 × 1000.
- **States:** production served replay, then live on sprint 60 within minutes, so I reset whatever it served to the default block (rows 59–55, no rest line, two legend items) and built each state as `components/revisions.tsx` renders it: live with sprint 60's real pencil row; open without copper and with Approved "Waiting for owner"; resting and replay with "Sprint 59 merged 9 Nov, 08:29 UTC" (plus "Replay sprint 59").
- **The change:** the "Original" `<li>` removed; the Log link and `<a href="/log/1">Rebuild it yourself</a>` in a `flex flex-wrap items-center gap-x-6 gap-y-1` group, the door with the Log link's classes word for word.
- **The target:** `/log/1` is the first step: 200, "Revision 1", Next `/log/2`, no Previous, `/log/0` 404, and `/log`'s "Rebuild it yourself" goes there. Scripts: my scratchpad `iris60/`; screenshots: `.crew/screenshots/60-iris/` (`foot-*`, today against the door).

## The table

Each cell gives the count line's lines today → with both changes, and the block's growth where it isn't 0. Both faces match unless the row says otherwise. "Contact" means the three contact links.

| Window | live | open | default · resting · replay | First screen |
|---|---|---|---|---|
| 320×568, 360×560, 375×548 | 4 → 4 | 4 → 3, −23.5 | 3 → 3 | Nothing in it moves (the contact links are in the title block, above) |
| 390×664, 390×844, 393×659, 412×780 | 4 → 4 | 3 → 3 | 3 → 2, −23.5 | Nothing moves; contact at 564.25 at 390×844 |
| 430×746 | 4 → 3, −23.5 | 3 → 3 | 3 → 2, −23.5 | Nothing moves |
| 768×1024 | 2 → 2 | 2 → 2 | 1 → 1 | Unchanged (sprint 57's 1 → 2 is gone) |
| 1024×640, 1024×768, 1024×900 | 3 → 3 | 3 → 2, −23.5 | 2 → 2 | Contact unmoved |
| 1024×1000 | 3 → 3 | 3 → 2, −23.5 | 2 → 2 | **Open: contact and dl rise 23.5** (797.2 → 773.7) |
| 1180×640, 1180×740, 1180×900 | 3 → 2, −23.5 | 2 → 2 | 2 → 2 | Contact unmoved |
| 1180×1000 | 3 → 2, −23.5 | 2 → 2 | 2 → 2 | **Live: contact and dl rise 23.5** (827.3 → 803.8) |
| 1280×640, 1280×680, 1280×800 | 3 → 2, −23.5 | 2 → 2 | 1 → 1 | Contact unmoved |
| 1280×900, 1280×1000 | 3 → 2, −23.5 | 2 → 2 | 1 → 1 | **Live: contact rises 23.5** (842.6 → 819.1; fallback 862.1 → 838.6) |
| 1366×625, 1366×640, 1366×900, 1366×1000 | 2 → 2 | 2 → 2 | 1 → 1 | Unchanged |
| 1439×640, 1440×700, 1440×790 | 2 → 2 | 1 → 2, +23.5 | 1 → 1 | Contact unmoved (it follows the bio); open's Log link leaves the first screen (789.3 → 812.8 at 790), as live's, resting's and replay's already have; default's stays inside |
| 1439×900, 1439×1000, 1440×900 | 2 → 2 | 1 → 2, +7.86 | 1 → 1 | **Open: contact drops 7.86 to live's place** (866.31 → 874.17). W2's default and live unmoved |
| 1470×840 | 2 → 2 | 1 → 1 (fallback 1 → 2, +23.5) | 1 → 1 | Contact unmoved |
| 1512×865, 1536×715, 1920×950, 1920×1080 | 2 → 2 (1 at 1920) | 1 → 1 | 1 → 1 | Unchanged |

Nothing overflows sideways at any window, on either face.

## The fold sweep: 1380–1440 × 900, 1 px, every state, both faces

| Contact bottom | live | open | default | resting | replay |
|---|---|---|---|---|---|
| Today's lowest | 874.17 | 866.31 (fallback 867.14) | 866.31 | 880.16 | 880.41 |
| Lowest with the change | 874.17 | 874.17 | 866.31 | 880.16 | 880.41 |

- **Open is the only state that moves:** down 7.19–7.86 px at 1410–1440, or 7.25–7.86 px at 1422–1440 on the fallback face, and never past the live state's bottom.
- **The lowest anywhere is unchanged:** 880.41 (replay at 1440), which leaves 19.6 px to the fold.
- **The Log link and the door stay inside** at every width, in every state. The door's lowest is 880.41, level with the Log link.

## Beyond the pins

None of these is a pin, so none triggers the waits-rule.

- **900 tall, 1024–1470:** at every width the lowest state with the change is no lower than today's lowest; open keeps dropping only to live's place (14.67 px at 1462). Below 1024 the contact links never move.
- **≥960 tall, 1205–1263 (fallback 1217–1272):** default, resting and replay take a second line and the contact links drop 23.5 px (6.3–15.7 in default) while live rises 23.5. The worst state ends 6.2 px below today's worst (854.2 against 847.9 at 1240 × 960), still at least 94 px above the fold (865.6 at 1272 × 960, fallback).
- **The door still adds a line** at 652–685 (default, resting, replay), 769–802 and 1410–1468 (open) and 893–926 (live); about 7 px wider on the fallback face. Everywhere else it keeps or removes one.

## What the contract should pin

1. **"Never lower than today's" (H10) means today's lowest of the five states at that width.** Read per state, open fails it at 1410–1468 (fallback 1422–1477) wherever the links wait at the block's foot. Name the 1205–1272 × ≥960 band as accepted and reported: 6.2 px under today's worst, at least 94 px clear of the fold.
2. **"58 revisions" in the first screen.** At 1440 × 900 the Log link and the door are wholly inside in every state, on both faces, so pin that. At 1440 × 790, 1440 × 700 and 1439 × 640, open's Log link drops out, as live's, resting's and replay's already do; default's stays in. Today open's sits only 0.7 px inside.
3. **768 has no growth in any state, but open starts growing at 769.** Pin that by the sweep, not by the window, since the revision count moves these bands.
4. **Rewrites H11 doesn't name:**
   - B2.5's "the legend's states on /" `toHaveLength(2)` (`e2e/plan.spec.ts:1012`) becomes 1.
   - B1.4's "an HTML legend naming seated and original" (`plan.spec.ts:302`) and B1.2's legend finder (`sheet.spec.ts:187`) would still pass, but only through the count line's "0 original" in their shared parent. Name them, so they pass by intent.
5. **Where the Log link and the door share a line, the Log link moves 129 px left.** No check pins its box. B4.49's Tab order ("then the Log link") holds, and the door is the next stop.
6. **`/read` reads right too.** It says "22 planks: 22 replaced, 0 original", draws 0 `path.plank-original` (22 seated), and still keys "Original" today. H8 can key the item on that count on both routes, and the count line keeps the fact in words.
