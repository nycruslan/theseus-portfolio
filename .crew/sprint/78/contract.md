# Sprint 78 (S): the trials chart's labels read whole

**Outcome.** A visitor reading the trials chart sees the crew's accepted gap as "−6.2", never
"−6 2", and every axis label reads whole, at any window and default font.

Found by Probe's production sweep (2026-11-19, the stand-down's defect condition): at 1024 × 768
with the default 16 px font, on /trials and every /trials/<window>, the film pad behind the
456 × 465 sounding's "−0.1" paints 9.9 × 5.0 px over the gap label and hides its decimal point
(4.5 × 5 at 1088, gone from 1152). The chart is `aria-hidden` and 6.2 appears nowhere else in the
page's text, so the label is the only way a sighted visitor reads it. Riding along, same component:
at 320 × 568 with a 24 or 28 px default font the width axis reads "768 10241280", and at 28 px the
height axis's "1100" starts 6 px left of the window.

## Checks (T38, `e2e/`, Probe, red on main first)

1. **T38a** On /trials and /trials/320x568, from 1024 to 1440 wide in 16 px steps (768 tall), at a
   16 and a 20 px default font: the gap label's text box (`.trials-gap text`) intersects no
   sounding's pad, ring, dot or number box, and no other chart label; and no sounding's number box
   intersects the gap label's pad.
2. **T38b** On /trials at 320 × 568, 390 × 844 and 1440 × 900, at 16, 20, 24 and 28 px default
   fonts: no two width-axis labels' boxes intersect or sit closer than 2 px, nor two height-axis
   labels'; and every axis label's box lies wholly inside the window horizontally.
3. The kept suite stays green, T1 to T37 included; Lens accepts any check this retires, by name.

## Budgets

The trials page's script and CSS budgets (T8, T10) hold; nothing on `/`, the Log or /crew moves.
At a 16 px default font only the gap label and the soundings near it may move, and only from 1024
to about 1150 wide; Forge reports a box diff of the chart against main at 390, 1024, 1280 and 1440.

## Out of scope

The chart's design beyond these labels; the frame; the sweep's data; owner paths and `content/`.
