// S4, the geometry behind the pixels: how far the SVG's outline (lib/lines-plan.ts draws the sheer
// and the profile as Catmull-Rom splines through 9 and 29 cosine-spaced points) strays from the
// hull's true functions (lib/half-model.ts), which the 3D model is built from. In hull units and in
// CSS px at the two sheet scales (1.3 from 768 px, 0.5 below).
//
//   node .crew/sprint/24/spike/measure/s4-curves.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const tmp = join(process.env.TMPDIR ?? "/tmp", `half-model-${process.pid}.mjs`);
writeFileSync(tmp, stripTypeScriptTypes(readFileSync(join(repo, "lib/half-model.ts"), "utf8")));
const { LENGTH, sheer, profile } = await import(pathToFileURL(tmp));

const spaced = (a, b, n) =>
  Array.from({ length: n + 1 }, (_, i) => a + (b - a) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n)));

/** lib/lines-plan.ts's spline(): Catmull-Rom as cubic Béziers, sampled densely. */
function spline(points) {
  const at = (i) => points[Math.min(points.length - 1, Math.max(0, i))];
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 0; k <= 200; k++) {
      const t = k / 200;
      const m = 1 - t;
      out.push([
        m ** 3 * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t ** 3 * p2[0],
        m ** 3 * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t ** 3 * p2[1],
      ]);
    }
  }
  return out;
}

/** The farthest any spline point lies from the true curve (nearest point on a dense sampling). */
function stray(curve, f, n) {
  const truth = Array.from({ length: 20001 }, (_, i) => [(LENGTH * i) / 20000, f((LENGTH * i) / 20000)]);
  let worst = { d: 0, x: 0 };
  for (const [x, y] of spline(spaced(0, LENGTH, n).map((v) => [v, f(v)]))) {
    let best = Number.POSITIVE_INFINITY;
    const i0 = Math.round((x / LENGTH) * 20000);
    for (let i = Math.max(0, i0 - 400); i <= Math.min(20000, i0 + 400); i++) {
      best = Math.min(best, Math.hypot(truth[i][0] - x, truth[i][1] - y));
    }
    if (best > worst.d) worst = { d: best, x };
  }
  return { curve, points: n + 1, hullUnits: worst.d, atX: worst.x, px1440: worst.d * 1.3 * (1406 / 1408), px390: worst.d * 0.5 };
}

const result = [stray("sheer", sheer, 8), stray("profile", profile, 28), stray("sheer, 24 points", sheer, 24)];
console.log(JSON.stringify(result, null, 1));
