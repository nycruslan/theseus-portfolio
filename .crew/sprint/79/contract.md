# Sprint 79 (S): every crew pin on the trials chart shows

**Outcome.** A visitor reading the trials chart sees every one of the crew's windows as a pin,
the two beside the accepted gap included, and still reads the gap as "−6.2", at any window and
default font.

Sprint 78's follow-up (Iris, `.crew/sprint/78/retro.json`; decisions 5): the crew pins at
360 × 560 and 375 × 548 sit hidden under the film pad of the gap's label "−6.2" at every width, on
production. The chart is how a sighted visitor sees which windows the crew fitted and taps to try
one, so two of the crew's windows are missing from it: the stand-down's "hides a fact". Both stay
links in the page's list, which this sprint doesn't change.

## Checks (T39, `e2e/`, Probe, red on main first)

1. **T39a** On /trials and /trials/320x568, at 320 × 568, 390 × 844, 1024 × 768, 1280 × 800 and
   1440 × 900, and from 1024 to 1440 wide in 16 px steps at 768 tall, at 16, 20, 24 and 28 px
   default fonts: every crew pin's dot (its 5 px ink) is wholly uncovered by the gap label's pad
   and text, every sounding's pad and number, and the ring's film when the ring isn't on that pin.
2. **T39b** At the same windows and fonts, T38a's clauses still hold: "−6.2"'s text box meets no
   sounding's pad, ring, dot or number, no pin's dot, and no other label; and the gap label stays
   tied to the 320 × 568 dot (it sits beside the dot, or a leader joins them).
3. The kept suite stays green, T1 to T38 included; Lens accepts any check this retires, by name.

## Riding along, same component

- The soundings' pads are px-sized, so at 24 to 28 px their digits outgrow them (Lens's nit, 78):
  they grow in em as the gap's pad did.
- Probe's memory line on T38a names `trials-labels.spec.ts`; it's `chart-labels.spec.ts`.

## Budgets

The trials page's script and CSS budgets (T8, T10) hold; nothing on `/`, the Log or /crew moves.
At a 16 px default font only the gap's label (and its leader, if one) and the soundings near it
may move; Forge reports a box diff of the chart against main at 390, 1024, 1280 and 1440.

## Out of scope

The chart's design beyond these marks; the frame; the sweep's data; the page's list; owner paths
and `content/`.
