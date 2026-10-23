// S5, the feel in numbers: for each duration, when the move is half, 90% and 99% done, how far the
// hull's skeleton travels on screen in the first frame and at its fastest (CSS px per 60 fps frame),
// and how long the last 1% creeps. From the loft's own maths in the page, not from pixels.
//
//   node .crew/sprint/24/spike/measure/s5-motion.mjs <out.json>

import { writeFileSync } from "node:fs";
import { launch, open } from "./browser.mjs";

const browser = await launch();
const results = [];
for (const [width, height, dpr] of [
  [1440, 900, 1],
  [390, 844, 2],
]) {
  const { page, context } = await open(browser, { width, height, dpr, query: { option: "a", u: 0 } });
  const rows = await page.evaluate(async () => {
    const { ease, place, project } = await import("/spike/scene/loft.js");
    const { stage } = window.__spike;
    const { width: w, height: h } = stage.renderer.domElement.getBoundingClientRect();
    const points = stage.hull.points;
    const at = (e) => {
      const { pose, D } = stage.loft.at(e);
      return points.map((p) => project(place(p, pose), w, h, D));
    };
    const travel = (a, b) => Math.max(...a.map(([x, y], i) => Math.hypot(b[i][0] - x, b[i][1] - y)));
    const total = travel(at(0), at(1));
    const when = (e) => -Math.log2(1 - e) / 10;
    return [2400, 1800, 1500, 1200].map((duration) => {
      const step = 1000 / 60 / duration;
      let [peak, first] = [0, 0];
      let previous = at(0);
      for (let u = step; u <= 1 + 1e-9; u += step) {
        const now = at(ease(Math.min(1, u)));
        const d = travel(previous, now);
        if (u === step) first = d;
        peak = Math.max(peak, d);
        previous = now;
      }
      return {
        duration,
        halfMs: Math.round(when(0.5) * duration),
        ninetyMs: Math.round(when(0.9) * duration),
        ninetyNineMs: Math.round(when(0.99) * duration),
        lastPercentMs: Math.round((1 - when(0.99)) * duration),
        totalTravelPx: +total.toFixed(1),
        firstFramePx: +first.toFixed(1),
        peakFramePx: +peak.toFixed(1),
      };
    });
  });
  for (const row of rows) {
    results.push({ width, ...row });
    console.log(JSON.stringify({ width, ...row }));
  }
  await context.close();
}
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
await browser.close();
