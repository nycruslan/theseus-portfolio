## Sprint 44, Wb (M): the sheet fits a phone window

**Goal** (from the roadmap, milestone "the proof in the first window"): on a phone browser with
its toolbars showing, the first window holds Ruslan's name, role, lead, contact links and the four
particulars. Before this PR, at 390 × 664 (an iPhone in Safari) the particulars ended at 812, below
the fold, and at 375 × 548 the contact links ended at 642.

**Contract:** `.crew/sprint/44/contract.md` (W8 to W12, Atlas from Quill's plan).
**Placement (Iris):** `.crew/sprint/44/placement.md`, with its amendment.
**Decisions:** `.crew/sprint/44/decisions.md` (1 to 10).

## What changed (on `/` below 768 px only)

- The Read-as-page and Motion row moves from the drawing's foot to hang from the bar at the top
  right of the drawing's area, where the bar holds the same pair from 768. DOM order unchanged,
  so B3.16's place clause and B2.3 hold as written; no kept check is rewritten.
- The narrow drawing scales with `100svh` from its left edge, down to a floor of 224 × 149.3
  (`--phone-foot: 28rem` at every phone width; decision 8).
- Small tightenings: the particulars' term column as wide as its longest term, the contact row
  8 px under the bio, the title block's bottom padding 12 px, the contact links' gap ramping from
  18 px at 390 to 12 px at 360 so "GitHub" keeps to the row.
- **Rider W12 (Pixel):** from 1024 down to 768, the 3D pencil number's chip covered the copper
  dot (at 768 the dot's centre painted film). The chip now carries a mask hole at the dot, so the
  dot paints over it as the 2D pen does on Off (`lib/model/ghost.ts`, `app/globals.css`).
- **Lens's nits on #102:** the led-out chip rule is scoped to `/` (`main > [data-plan]…`), and
  `ghost.ts`'s comment says 712 px.

## Contract results (integrated head)

| Check | Result |
|---|---|
| W8 the facts in the phone window | pass, 7 windows × 4 states × 2 schemes |
| W9 the drawing whole, floor 149, frame 1 registers | pass; `.plan-narrow` 149.3 at the floor; Hausdorff 1.00 (DPR 1, bound 1.5), 0.67 (DPR 3, bound 1.0) |
| W10 the control | pass; the row's targets clear the drawing's ink (Read as page's visible ink 4 px; decision 9) |
| W11 still | pass; CLS 0 at load and through 664 → 844 → 664; only `svh` in the narrow rules |
| W12 the 3D label leaves the dot showing | pass; 0 differing points at 1024, 960, 900, 800, 768 |

Room left inside W8's 8 px margin (CI's Chromium 156 / Chrome 153): 390 × 664 9.6 / 3.9;
393 × 659 4.4 / 22.0; 412 × 780 43.4; 430 × 746 29.8; 375 × 548 and 360 × 560 41.2 (links);
390 × 844 100.9 / 95.3. At 390 × 664 the drawing is at its floor, so a renderer that set both a
five-line bio and a two-line Leads would end the particulars past the margin; Iris accepted that
rather than go under the floor (`placement.md`, amendment).

**390 × 844 moves** (decision 5): one phone layout at every height. The h1 rises from 372 to 317 and
the particulars end at 735 instead of 835 (they had 0.7 px to spare). Every kept check there passes.
Nothing from 768 up moves: W1 to W7 and C9 pass on the integrated head.

**Skip guard named for Lens:** `e2e/phone-window.spec.ts:243` skips the describe holding W8 when
`PLAYWRIGHT_BASE_URL` is set, because its live, open and resting states need this checkout's build
served against the fixture server (B4.22's harness, the same guard as `window.spec.ts`'s W1).
Splitting the default-server pass out under that guard is Wc's rider (W15).

No check is retired or rewritten.

## Evidence

- Atlas, on the integrated head (9498c56, after merging main's #106): `pnpm verify` green;
  `phone-window`, `window` and `plan` specs 19 of 19 (2.6 min, 2 workers).
- Forge: the kept set plus `phone-window`, 14 files, 115 of 115 (11.3 min, 2 workers); C9, W8 to
  W12, B3.1, B3.7, B3.16 and the keyboard checks 12 of 12 on an untouched build.
- Probe: W8 to W12 red on the sprint head before the build (particulars 812 at 390 × 664), green on
  Forge's build (68.6 s). The full suite at 2 workers took 30.9 min locally on the red head, close to
  `check`'s 35-minute cap: CI's own time is the measure.
- Pixel: registration through a resize, the clipped foot holds only film, and no loft frame inks
  above frame 1, over 151 clock frames at 8 windows.
- Screenshots (git-ignored, in the crew's worktrees): Iris's `.crew/screenshots/44-iris/final/`
  (every window, both schemes, Full settled, focus rings); Forge's `.crew/screenshots/44-forge/`
  (390 × 664, 375 × 548, 390 × 844, both schemes).

## Iris's review (advice): ship, 7.8 of 10

On the integrated head in CI's renderer (Chromium 156), cross-checked in Chrome 153: better than
production on phones, and 0 px differ from main at 1440 × 900, 1536 × 715, 1024 × 768 and
768 × 1024 in both schemes, and on `/crew`, `/log` and `/read` at the phone sizes. axe clean at
390 × 664, 375 × 548, 390 × 844, 320 × 568 and 1440 × 900, both schemes, with and without reduced
motion. LCP the bio's text at 4× CPU, CLS 0 while the model loads. No fixes asked. Two craft notes
with no cheap fix inside the fit: Read as page's text sits about 7 px off the Profile caption's
line, and its focus ring crosses the hull's top at the floor windows (accepted). Her screenshots
are git-ignored in the crew's worktree (`.crew/screenshots/44-iris-review/`).

## Not verified

Safari and a real phone (none installed; Chromium can't emulate Safari's toolbar), a real GPU.

## For the retro (owner paths, proposals only)

The builders' stop hook (`.crew/verify-stop.mjs`) rebuilt `.next` under Forge's own running e2e
suite four times when he ended turns to wait; seven checks failed falsely until rerun.
