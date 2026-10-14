# Calibration: the owner's scored examples

AI design judges agree with professional designers only moderately, and they tend to be generous.
A few examples scored by the owner fix that. Iris compares her own scores with these before her
verdicts count (see `../rubric.md`).

**For the owner (about an hour, once, then occasionally):**
1. Collect 4–6 screenshots at 1440 px: a few sites you love, a few you find generic, and the
   current portfolio. Name them `NN-short-name.png`.
2. For each one, add `NN-short-name.md` with your four rubric scores (design quality,
   originality, craft, functionality), the weighted score, and one or two sentences on why.
3. Commit them in a PR. This folder is yours: the team can read it but not change it.

Until then Iris's verdict is advice: the merge gate (`.studio/gate.mjs`) reports it and merges
anyway. The gate treats her as calibrated, and her verdict as binding, as soon as main has one
scored example here: any `.md` file besides this README. So add the examples when you're ready for
her verdicts to hold merges, ideally once her scores land within one point of yours on them. When
you disagree with one of her verdicts later, add that case here too.
