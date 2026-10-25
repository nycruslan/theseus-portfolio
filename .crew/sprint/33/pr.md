## Sprint 33: the ghost hull in 3D on `/log` (B5c)

**Goal (roadmap):** B5c, the last sprint of B5, as sprint 29 planned it
(`.crew/sprint/29/b5-plan.md`). Taken beside #78 (B4a), which waits for the owner. B5 reads the
retros on main, so this sprint neither repeats nor builds on #78. Both touch the bar, so whichever
merges second merges main and keeps both sides (decision 1).

**Size:** M. Contract: `.crew/sprint/33/contract.md` (Quill), with amendment 1. Decisions:
`.crew/sprint/33/decisions.md`. Iris: `notes-iris.md`, `early-look-iris.md`, `review-iris.md`.
Pixel's spike: `spike-pixel.md`.

### What a visitor gets

- **On `/log` and every `/log/<n>`, the ghost hull stands up off the drawing in vellum.** It shows
  the ship's 22 original planks, each numbered by the sprint that took it out.
  - The 3D takes its seats and numbers from the 2D drawing in the page, so the two can't disagree.
  - Both sides are drawn, translucent at 0.7, with no deck, transom or shadow, so the eye sees into
    the hull.
  - The numbers are the drawing's own HTML spans, riding their planks. Two of them, "20" and "8",
    sit off the hull on leaders from 768 px.
- **Full plays one camera move, 1.8 s, once a visit.** Then it is still, with 0 frames at rest.
- **Calm and reduced motion open settled.** Off, Save-Data, forced colours, print, scripts off and
  WebGL refused all show B5a's drawing and download no 3D.
- **A pointer or a tap on a plank opens that sprint's record.**
  - Hovering a plank inks its edges, with a pointer cursor.
  - On a record, its seat is marked in 3D as the 2D marks it.
  - The table stays the keyboard's way in.
- **The Full/Calm/Off control is on the Log.** From 768 px it sits in the bar, as on `/`. Below 768
  it sits in a row under the lines figure. It is one choice across the site (`theseus:motion`).

### Budgets (SwiftShader; a GPU and the owner's phone at the demo)

| | Measured | Budget |
|---|---|---|
| Draws a frame | 5 on `/log`, 6 on a record (4 and 5 below 768) | ≤ 8 |
| Triangles | 25,000 / 25,420 from 768; 7,736 / 7,940 below | ≤ 30,000 / ≤ 12,000 |
| 3D chunk | one file, shared with `/`, about 147 kB gzip -9 | ≤ 250 kB |
| Loader | 2,039 B decoded (+1 B, Lens's #74 nit); B2.10 has 9 B left | |
| Frames at rest | 0 (1 per hovered-plank change) | 0 |

`/`'s hull and loft are unchanged bit for bit (Pixel, in node: both detail levels, 8 widths × 101
steps).

### The checks

- **B5.18 to B5.26**, Probe's, were red on the sprint head before the build.
- **The Log's suites run on the Off path** (WebGL refused), with their bodies unedited.
- **Rewritten with the same or stronger assertions:**
  - B5.1;
  - B5.6 C5.2, which counts all of `main` minus the control;
  - B5.9 C9.2, which reads each label on its own fill;
  - B5.9 C10, with 3 Tab stops with WebGL and 1 refused;
  - B5.10, still an equality with `/`'s refused page;
  - B2.10, whose baseline is the 404;
  - B2.9.
- **Nothing is skipped or retired.**
- **Three harness fixes from runs on the build;** the commits name each one:
  - B5.25's "one key" counts only `/log`'s own scripts;
  - B5.19 samples each plank's own vellum on the canvas's fill levels;
  - B5.19's mark check searches its 3 px neighbourhood at 1 px steps.
- **Results:** `pnpm verify` passes, and the full suite result is below.

### Iris

Ship at 8.7/10 on 57ced20, after her early look's two musts and one review must (the numbers at
their planks' middles). The axe scan found 0 violations on 40 runs. Nothing scrolls sideways at
320. The phone LCP is 1.7 to 1.8 s and CLS is 0. Her calls are decisions 6 and 7: pitch 12°, "8"
led out, the lit mix 0.4.

### For the owner (nothing to approve here)

At B5's demo, on a preview that deploys, look at the ghost on a GPU and your phone, the move's
feel, the pick, and the control carrying your choice from `/`. Iris's departures from the frames
`log-1440.webp` and `log-390.webp`:
- **The hull's two sides, translucent,** where the frame drew one. One constant reverts it. Compare
  `final-1440-light.png` with `oneside-1440-light.png` in `.crew/screenshots/33-iris/` (git
  ignores them, so ask the crew for them).
- **No "or a plank in the hull" in the lede,** since it would be false on Off.
- **No numbers below 768 px,** B5a's rule.
- **"8" on a leader in 3D.**

**Vercel is rate-limiting deploys** ("Deployment rate limited — retry in 24 hours" on main's
#82 commit and on this PR), so production still serves B5a and this PR has no preview yet.

### Riders taken

- Lens's nit on #74 (pressing Off with WebGL refused stores nothing).
- Lens's nit on #82 (every `merge.json` on disk parses: B5.26 a).
- Iris's #82 rule width from 640 to 1023 px (B5.26 b).
- Sprint 32's merge record.

Iris's commit-hash link doesn't ride: it would loosen C5.3.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Yaev4dLzNtwRXcCAUtDg5D
