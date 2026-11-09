# Sprint 61 decisions

## 1. The sprint's shape (Atlas)

The milestone's last item was Quill's demo on production. Sprint 59's Log CSS follow-ups (Forge's
1 and 2 in `.crew/sprint/59/retro.json`) were waiting on a sprint that touched the Log's CSS, and
after this one the crew stands down, so they ride along here rather than sit open. Pixel's
step-number follow-up is a behaviour change with its own check, so it stays open.

## 2. The 4 px row (Iris's recipe, Forge)

`--yard-row` 112 → 116 px, the ghost caption's margin 72 → 76 px. A focused Next's ring now clears
the keel's ink by 1.13 to 2.14 px at 320 to 390 wide, where it crossed it by 1.86 to 2.87 px. From
768 up nothing moves (Forge's readings against production).

## 3. The fallback below 20rem (Forge, accepted by Atlas)

Scoping the placement to `(20rem <= width < 48rem)` left the in-flow row overflowing below 20rem
(Next 2 to 12 px past the record's frame). Forge restored sprint 53's narrow rule, removed in
sprint 59 (`.record-top` wraps, the steps take their own row), and let Next wrap under Previous when
they can't share one. It's the layout Iris approved before her placement, so Atlas accepts it
without a separate design round; Iris may call another in a later sprint. No check covers it yet
(Probe's follow-up: one at 319 wide or a 24 px default font).

## 4. H1's guard (Probe)

The row's top within 0.5 px of the ghost's bottom + 4, and a new clause: a focused Next's ring
starts at or below the ghost's bottom. Red at all 448 widths on main's CSS; green on the bare
mutant and on Forge's build; the ring clause alone goes red on the mutant with `outline-offset` 3 px.
No other kept check pins a figure the 4 px moves (Probe ran twelve Log and phone specs on the
mutant: 138 passed).

## 5. The demo (Quill, `demo.md`)

All five questions hold on production. Nothing the site says is false or hidden, so the crew stands
down after this sprint. H8's deployed read in a live feed state and Y10 on the newest step are the
spec's state, not the site's.
