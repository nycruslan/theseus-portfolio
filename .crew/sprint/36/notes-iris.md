# Sprint 36 (B4d): Iris's calls for the hull on `/crew`

Iris, 2026-10-31, for Quill's contract (B4.33 to B4.42), Forge's 2D, Pixel's 3D and Probe's checks.
Accepted as decision 6. Where these numbers differ from the contract's text at 626e126, they win.

**How I judged.** I looked at production's `/crew`, `/` and `/log` at 1440, 1024 and 390, in Off
and Calm, while sprint 36 was live on them. Then I built a prototype and injected it into
production's `/crew` with Playwright:
- the real drawing code (`draw()` in `lib/lines-plan.ts`) at the new layouts;
- the real stage (`lib/model/stage.ts`, `pencilMarks`, `bakeShadow`) on SwiftShader, at DPR 1.

I ran it on the seats 6.1 (sprint 36, now), 2.1 (37, next), 3.0 (the fixtures' 31), 0.2 (35, at
rest) and 5.0 (the worst case, due at 42), in both schemes. The frames and the code are in
`.crew/screenshots/36-iris/` (`f-*` final, `r4-*`, `r5-*`; `proto.js`), which git ignores.

## 1. One mark: a tick hanging from the pencil plank's lower edge

- **One form for every kind.** Kind is told by the list's words. A glyph per kind would need a
  legend and can't be read on a 3D sliver. The research's "each event type gets one mark" means
  one form per channel: on the plank, a pencil stroke. `crew-390.webp` already draws the ticks on
  the copper run.
- **Hanging, not rising.** Under the turn, the 3D hatch on lift 6 goes near-vertical, and ticks
  rising into the plank vanished into it (6.1, this sprint's own seat; `w440-y35.png`). Hanging
  below the edge, they sit on white card, or on the film under the keel, and read in both 2D and 3D.
  They can't meet the number, which sits mid-band above the edge.
- **`MARKS` in `lib/hull-layouts.ts`** (hull units, shared by 2D and 3D):

  | Field | Value | Meaning |
  |---|---|---|
  | `pitch` | 5 | between ticks, along x |
  | `first` | 10 | slot 0's distance aft of the dot (PENCIL.tip.to's x), two pitches |
  | `length` | 4 | hanging down from the lower edge (`bandAt`'s bottom: the seam, or the keel's outline) |
  | `width` | 1.4 | CSS px, non-scaling, butt caps, `--muted` (forced colours: `CanvasText`) |
  | `max` | 10 | the panel's moments |
  | `deep` | 2 | for f |

- **Slots, not moments.** Slot k (0 to n − 1) sits at x = tip − (10 + 5k)·f, and slot 0 is nearest
  the dot. A new moment fills the next slot aft, and no tick ever moves. At 10, nothing changes.
- **Short seats:** f = min(1, (tip − xs − 2) / 55), where xs is the plank's sternmost x whose band
  is at least 2 deep.

  | Seat | f |
  |---|---|
  | 6.1, 2.1 and every long seat | 1 |
  | 3.0 | about 0.82 |
  | 5.0 | about 0.33 (a 2.8 px comb; accepted, one sprint in 22) |

- **Paint order in 2D:** the plank, its edge, the ticks, then `[data-tip]`.
- **In 3D:** the stage's idle `marks` batch, recoloured `--muted` (1 draw, so live is 7 of 8).
  - Each tick runs from nearSide(x, bottom) to nearSide(x, bottom + 4).
  - Below the keel it lies on the centre plane (z 0).
  - The tip's uLift depth trick is welcome, so the bilge never hides a tick.
- **Sizes measured:**

  | Where | Tick length | Pitch | Newest tick to dot's centre |
  |---|---|---|---|
  | 2D, 1440 | 6.7 px | 8.4 px | 16.8 px |
  | 2D, 390 | 4.9 px | 6.1 px | 12.2 px |
  | 2D, 320 | | | 10 px |
  | 3D settled, 1440, 6.1 | | 6.1 px | 12.8 px |
  | 3D settled, 390, 6.1 | | 4.5 px | 9.4 px |

- **Probe:** each tick's top lies on the plank's lower edge within 1 px, its x inside the plank's
  x0..x1, and it hangs down. No tick's box comes within 4 px of the dot's centre.

## 2. The drawing: a detail, server-drawn, the same in every mode

`/crew`'s 2D becomes a detail of the hull, so Off, no-JS, print and frame 1 share the settled
view's framing. Calm then cuts from flat to turned, as on `/`, never from the whole ship to a
close-up. Two layouts, one shown per width, as on `/`:

| Layout | Shown | Box (viewBox) | s (px a unit) | oy | Drawn |
|---|---|---|---|---|---|
| `CREW_WIDE` | from 768 | 808 × 454.5 | 808/480 = 1.68333 | 109.08 (24%) | 808 at 1440; 566.8 × 318.8 at 1024 (no CSS change); 600 × 337.5 from 768 to 1023 |
| `CREW_NARROW` | below 768 | 390 × 243.75 | 390/320 = 1.21875 | 48.75 (20%) | full width |

- **The crop** shows the end of the hull nearest the focus plank, so the hull reads as a ship. A
  mid-hull crop at 320 units read as a wall of planks.
  - A = 480 (wide) or 320 (narrow); M = 0.12·A; ox = boxW/2 − xc·s.
  - anchored = A/2 − 20 if the plank's centre (x0 + x1)/2 < 312, else 644 − A/2.
  - The tally is L = min(tip − 55·f, numberX − 6) to R = tip + 2. At rest and in down it is
    numberX ± 20.
  - xc = clamp(anchored, R + M − A/2, L − M + A/2), or (L + R)/2 if the clamp is empty.
  - Today: 6.1 gives 404 (wide) and 441 (narrow); 2.1 gives 220; 3.0 gives 220 and 140.
- **Clip the drawing to its box:** `.plan svg` is `overflow: visible`. Drop any lettering whose
  anchor falls outside the box.
- **Numbers:**
  - The focus plank's number shows at every width (a lift is 16 px or more on the narrow detail).
  - The others show from 768, as today.
  - The pencil's sits at min(body middle, tip − 20) on the band's mid-depth, with B4b's chip. That
    is B4b's place except on 3.0 and 6.0. 5.0 stays led out.
  - At rest and in down, the focus number is ink, weight 700, with no chip.

## 3. The camera: the plank's end swings toward the visitor

- **Settled pose:**
  - Yaw −35° (bow toward, as on `/`) when the plank's centre is at or forward of 312; +35° (stern
    toward) when it's aft. At −35, the stern seats receded: 3.0 was a sliver with the dot under
    its chip. At +35 it is 20 px deep, and the dot is 21 px from the number (`r5-30-*`).
  - Pitch 6°: at `/`'s 15, keel planks foreshorten from above.
  - Lift `LIFT` (90). The lens is 30° over the viewport.
- **What the move holds:**
  - the framed height (the skeleton, grow 0), which settles at 0.75 to 0.85 of frame 1's scale;
  - the focus point on its frame-1 screen point, within 1 px. The focus point is on the lower
    edge at x = tip − 27.5·f (live and open), or the focus number's anchor (rest and down).
- **Modes:**
  - Full: one move, 1,800 ms on `ease()`, once a visit (`theseus:crew`).
  - Calm: settled at once.
  - Reduced motion: `/`'s 240 ms fade.
  - The 2D goes hollow as on `/`: the lines stay, and the focus number rides.
  - No move on any poll.
- **Settled sizes measured:**

  | Seat | Width | Plank depth at the tally |
  |---|---|---|
  | 6.1 | 1440 | 26.5 px |
  | 6.1 | 390 | 20.0 px |
  | 2.1, +35 | 1440 | 25.2 px |
  | 3.0, +35 | 1024 | 20.4 px |
  | 3.0, +35 | 390 | 22.3 px |
  | 5.0 | 1440 | 12.6 px (exempt) |

- **Probe (B4.36):**
  - The dot and the focus number's centre are at least 8% of the canvas's width from each side.
  - The depth at the tally's middle is at least 18 px at 1440 and 1024, and at least 16 px at 390.
  - 5.0 is exempt.

## 4. The control

As on `/`:
- from 768, the bar's slot after Read as page (186 × 44 from 768 to 1023, 142 × 32 from 1024);
- below 768, `<Foot control={<MotionControl />} />` at the drawing's foot, with Read as page at the
  left and the group at the right, in one 44 px row (sprint 27, decision 8).

I'll measure 390 and 320 on Forge's build.

## 5. Copper, the marks, and my #87 chip

- **They don't interact.** Copper stays the pen alone, its run and dot exactly as `/` draws them,
  live only. The ticks are graphite and never copper.
  - In live, the newest ticks hang under the run's aft half. Hanging is what `crew-390.webp`
    draws.
  - In open they hang from the dashed graphite edge.
  - The dot paints last.
- **The chip over the dot on a short seat:**
  - Fixed on `/crew` by the number's place, min(body middle, tip − 20). That keeps a 3-digit 11 px
    chip 2 px or more clear of the 8 px dot at 1024 and at 320.
  - On `/` it stays open, since B4d doesn't touch `/`'s layer. It rides the next sprint that does.

## Defaults I steered away from

- A fly-in from the whole ship to the plank: it breaks Calm's cut and makes Off a different
  picture.
- A glyph per kind.
- Copper marks.
- Marks laid by time (4 tickets landed within 3 s).
- A hover link between a row and its tick.

## For the owner (on the preview; nothing blocks)

1. `/crew`'s hull turns its stern to the visitor when the plank is aft of midship. Sprint 37's 2.1
   will be the first. `/` always shows the bow.
2. `/crew`'s 2D is a detail, half to three-quarters of the ship. `crew-1440.webp` drew a close
   model over the whole sheet.

## Not verified

- SwiftShader at DPR 1 only. The move's feel, and the ticks on a GPU at DPR 2 and 3, wait for
  Pixel's build and the owner's phone.
- The prototype's stage had no uLift on the ticks.
- I checked the dark scheme on 2.1 at 1440 only (`f-21-1440-dark*`).
