# Sprint 65: the contract mutant (Probe)

**The mutant.** I made a scratch copy of the tree at b97da11, the head of sprint/65-chart-fits when
the build began, using `git archive`. Its only change is `components/trials-bare.tsx`, rendered in
the trials page's `main` (`components/trials.tsx`) after the live region and before "Try any
window". It holds a bare chart: a `figure` with an `svg[data-chart]` 240 × 60 px, a `g[data-plot]`,
and four 44 × 44 px `a[data-sounding]` (456x465, 792x575, 1160x635, 1366x595). Each sounding links
to its window and has an `aria-label` of its size. After the chart come seven bare stamps,
`li[data-fit][data-query]`, each holding the contract's working words. A stamp is `hidden` unless
the shown window enters its query at 16 px a rem.

I built it, then ran the unedited suite against it (b97da11's `e2e/`, with neither
trials-chart.spec.ts nor T10's rewrite):
`PLAYWRIGHT_PREBUILT=1 PLAYWRIGHT_PORT=3365 node node_modules/@playwright/test/cli.js test --workers=3`.

**Result:** all 418 tests passed, in 40.3 minutes. No red, so no named rewrite comes from the
mutant.

Among the green: T5's no check code or URL path, with the stamps shown at 320 × 568, 1366 × 595
and 1024 × 640; T6's `a[data-window]` set; and T7's first screen. T8 also passed: axe, targets
(`main a` includes the SVG links), Tab, `--accent`, the 1,024 B at load, LCP and CLS. So did
B2.10 and B4.14 (script on the other routes), B2.9's route loops and the Tab bounds.

**What it doesn't prove.** The mutant placed the chart before the form and the stamps after it.
Iris's final placement (`placement.md`, 3336619) puts the stamps last on the page and the chart
head inside the chart's own section, and gives the frame a new size at 1440 × 900 (decision 7).
T7 and T8 read the real placement only on the build. The bare chart has no band, pins, ring, words
or found count, so axe, the token checks and CLS have not yet met those.
