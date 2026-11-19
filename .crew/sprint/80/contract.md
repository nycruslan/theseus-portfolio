# Sprint 80 (S): the trials' side keeps its foot in the window

**Outcome.** A visitor reading /trials at a large default font on a big screen sees the whole of
the side (the frame, its caption, the chart down to its width axis) while it holds still beside
the page; where it can't fit, it scrolls with the page instead of hiding its foot.

Sprint 79's follow-up (Iris, `.crew/sprint/79/retro.json`), on production 2026-11-19 in
`/opt/pw-browsers/chromium`: the side goes sticky at `(width >= 64rem) and (height >= 52.5rem)`
(`app/globals.css`, "Sticky only where it fits"), a threshold in rem, but the side doesn't grow in
step with the font. At a 24 px default font the stuck side's foot sits 17 px below the window at
1536 × 1260 and 1600 × 1300 and 7 px at 1920 × 1400 and 1920 × 1600; at 28 px, 14 px at 1920 ×
1600. The chart's foot is hidden until the page ends: the stand-down's "hides a fact". Iris read
31 to 118 px, likely in the suite's wider-glyph shell, so measure there (`.crew/STATE.md`).

## Checks (T40, `e2e/`, Probe, red on main first)

1. **T40a** On /trials and /trials/1366x595, at 16, 20, 24 and 28 px default fonts, at windows from
   1024 wide (at least 1024 × 768, 1280 × 900, 1440 × 900, 1536 × 1260, 1600 × 1300, 1920 × 1080,
   1920 × 1400, 1920 × 1600 and 2560 × 1440), with the page scrolled to the middle and to just
   before the side's container ends: whenever the side is stuck (`position: sticky` and its top
   at its `top`), every box in it, the chart's axis labels included, ends inside the window.
2. **T40b** At a 16 px default font the side is sticky at every window where it is on main (1280 ×
   900 and up at 52.5rem tall), so nothing moves at the default font.
3. The kept suite stays green, T1 to T39 included; Lens accepts any check this retires, by name.

## Riding along

- Lens's two nits on T39 (Probe, `.crew/sprint/79/retro.json`): T39a reads the mask's reach as
  well as its hole; the tokens invariant records the mask's white and black and rejects named
  colours.

## Budgets

The trials page's script and CSS budgets (T8, T10) hold; nothing on `/`, the Log or /crew moves.
At a 16 px default font nothing on /trials moves (Forge reports a box diff against main at 1280 ×
900, 1440 × 900 and 1920 × 1080).

## Out of scope

The chart's marks, the frame and the drag, the sweep's data, the page's list, the focus ring on
/trials/1366x595 (Forge's follow-up from 79), owner paths and `content/`.
