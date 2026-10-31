# Sprint 36 (B4d) review: the hull on `/crew` (Iris)

**Verdict: ship, 8.3/10, on f9fbbc6.** It's **better** than production, and every hard gate passes.
I have no musts. The calls in `notes-iris.md` were built as called, and the early look's two CSS
changes (036d34e) and the number fix on 3.0 (7b69f55) are in. The follow-ups below are for later
sprints or the owner's eye.

## How I looked

- **The build.** f9fbbc6, built in a fresh scratch worktree (`pnpm install --offline`,
  `next build`) and served with `next start` on port 3393.
- **The feed.** `CREW_FEED_URL` pointed at a fixture feed of my own on port 4797: e2e's
  `live.json`, `open.json` and `resting.json` with a fresh `asOf`. The live fixture is sprint 31 on
  seat 3.0, with 9 moments shown. Patched to sprint 36 it sits on 6.1.
- **Browser.** Playwright's Chromium on SwiftShader. Fonts were warmed by a reload before every
  read.
- **Production** (`/crew` and `/`, live sprint 36) side by side at 390, 1024 and 1440.
- **Shots** are in my scratchpad's `iris-review/` (the paths are in my report to Atlas):
  - `box-*`: every width and scheme;
  - `chip-*`: 3.0's number against its ticks;
  - `home-*`: `/` against production;
  - `side-*`: `/crew` against production;
  - `move-*`: Full's frames on Playwright's clock;
  - `state-*`: open and resting.

## Hard gates

| Gate | Result |
|---|---|
| Placeholders | None added (the diff over `app`, `components`, `lib` and `content`) |
| axe | 0 violations on `/crew` at 1440 and 390, light and dark. Tags: wcag2a, 2aa, 21a, 21aa, 22aa and best-practice |
| impeccable | `detect --json` over the six changed UI files: `[]` |
| Reduced motion | Opens settled, nothing stored, 0 running animations after load. The fade is `/`'s (Atlas's B4.38 ruling). I didn't time it; that's Probe's check |
| 320 | Overflow 0 in both schemes |
| Phone budget | 390 at DPR 2, 4× CPU, 1.6 Mbps and 150 ms, three runs each: LCP 812 to 856 ms in Calm and in Off. The element is text (`.crew-goal`, `.crew-text`), CLS 0.0000, and the model settles in Calm |

## Compared with production: better

- **Production's `/crew`** has the whole-ship drawing in 2D: no model, no pencil (even while sprint
  36 is live) and no control.
- **The build** stands the card model up off a detail drawing:
  - the plank in progress is hatched, with its number and the copper pen while live;
  - one graphite tick per moment hangs from the plank's edge;
  - Full, Calm and Off are in `/crew`'s bar, as on `/` and the Log.
- **The panel** is unchanged.

The page now carries the site's signature on its own terms. `/` shows the whole ship. `/crew` comes
close on the plank being drawn, and the end of the hull it lies in swings toward the visitor.

## What I checked, as promised

- **The boxes,** in Calm, light and dark. The canvas lies on each drawing in whole pixels.

  | Width | Drawing | Foot | h1 |
  |---|---|---|---|
  | 768 | 736 × 414, gutter to gutter | | 485.5 |
  | 1023 | 991 × 557.4 | | 627.4 |
  | 390 | 358 × 223.8 | 275.8, the drawing's foot, no overlap | 353.7 |
  | 320 | 288 × 180 | 232 | |
  | 1024 | 566.8 × 318.8 | | |
  | 1440 | 808 × 454.5 | | |

  Ticks drawn equal moments shown equal `data-marks` (9) everywhere.
- **The chip against the ticks on 3.0** (Off, 10 moments fed, 9 shown). Each figure is the chip's
  foot against the top of the nearest tick under it; negative means clear.

  | Width | Gap | Dot's edge from the chip |
  |---|---|---|
  | 1440 | −6.6 px | |
  | 1024 | −3.7 px | |
  | 390 | −3.2 px | 9.3 px |
  | 320 | +0.3 px on one tick (the case I accepted) | 5 px |

  In 3D the riding chip is clear at both widths (`chip-sheet.png`).
- **`/` unchanged.** I diffed the drawing's box against production at 1440 and 390 in Calm (threshold
  24 levels). The only differing pixels are the pencil plank: production's cached page told no
  pencil while the build's feed did. The pose, shadow, lines and tip geometry are identical, and
  `/` shows no ticks.
- **Full** (Playwright's clock, 1440 and 390): `lofting` until 1,800 ms, then `settled`. The number
  and the dot hold their screen points through the move.
- **Open:** no copper, and ticks on the dashed edge (`data-marks` 6).
- **Resting** on another sprint: `record`. The camera is on the newest seat (0.2), and "35" rides in
  ink, bold.

## Score (`design/rubric.md`)

| Criterion | Score | Why |
|---|---|---|
| Design quality ×2 | 8.5 | The detail drawing, the turned card, its shadow fading inside the box and the hanging tally read as one sheet with `/` and the Log, in both schemes. It loses a little to the flat 2D bow showing beside the turned bow at this scale |
| Originality ×2 | 8.5 | A tally of real moments as pencil ticks on the plank they build, and a camera that turns the plank's end toward the visitor. Nothing here is a template or a library default |
| Craft ×1 | 8 | Boxes exact at six widths, the focus point held exactly, the chip clear where checked. Three small debts: 320's 0.3 px on 3.0 and 6.0, 5.0's dense comb, and the ticks short on the stern seats in 3D |
| Functionality ×1 | 8 | The control is where it is on every other page, Off and reduced motion each have a composed still, and LCP is text. The ticks carry no key: a visitor links them to the list only by count |

**Weighted:** (2 × 8.5 + 2 × 8.5 + 8 + 8) / 6 = **8.3/10**.

## Follow-ups (none blocks)

1. **A key for the ticks.** A few words, for example in Activity's heading or a caption under the
   drawing ("one mark on the plank for each moment"). Without it the tally reads as ornament to a
   board member. It's copy, so Quill and the owner word it in a later sprint.
2. **Seat 5.0** (due at sprint 42): f is 0.33, so the comb's pitch is 2.8 px. Look at it when it
   comes up. Leading the number out, as the 2D already does, would let the ticks use the whole
   plank.
3. **The second bow.** `/crew` keeps `/`'s hollow rule, so the flat outline shows beside the turned
   bow. At the detail's scale it is more present than on `/`. If the owner finds it busy, one CSS
   rule on `/crew` can drop the outline under the settled model.
4. **For the owner on the preview:**
   - the stern swings toward the visitor on seats aft of midship (sprint 37's 2.1 is the first);
   - `/crew`'s drawing is a detail, not the whole sheet.

## Not verified

- The move's feel at 30 fps, on a GPU, at DPR 3 and on a real phone: all of this is SwiftShader.
- The 400 kbps profile: I measured at 1.6 Mbps.
- Forced colours on f9fbbc6: I checked them on Pixel's 68e13f5, where they were clean (no canvas,
  ticks in CanvasText, the dot in Highlight). The later commits touched neither.
- The reduced-motion fade's timing (Probe's B4.38).
- A screen reader.
