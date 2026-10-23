// S4, sub-pixel: the systematic offset between the SVG's outline stroke and the model's, from the
// coverage-weighted centre of each stroke. Columns across the sheer (a near-horizontal run) give the
// vertical offset; rows across the transom (a vertical run) the horizontal one. CSS px, + is down/right.
//
//   node .crew/sprint/24/spike/measure/s4-centroid.mjs <s4 dir> <name> <dpr>

import { join } from "node:path";
import { sharp } from "./browser.mjs";

const [, , dir, name, dprArg] = process.argv;
const dpr = Number(dprArg);
const load = async (key) => {
  const { data, info } = await sharp(join(dir, `${name}-${key}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { at: (x, y) => data[(y * info.width + x) * 4 + 3] / 255, w: info.width, h: info.height };
};
const [A, B] = [await load("svgLine"), await load("glLine")];

// Centre of the first stroke met scanning from `from` along a line of pixels.
function centre(M, coords) {
  let [sum, weight, started] = [0, 0, false];
  for (const [i, x, y] of coords) {
    const a = M.at(x, y);
    if (a > 0.02) {
      started = true;
      sum += a * i;
      weight += a;
    } else if (started) break;
  }
  return weight ? sum / weight : null;
}

const report = (label, picks) => {
  const d = picks.filter((v) => v !== null);
  d.sort((p, q) => p - q);
  const mean = d.reduce((s, v) => s + v, 0) / d.length;
  console.log(label, JSON.stringify({ samples: d.length, mean: +(mean / dpr).toFixed(3), min: +(d[0] / dpr).toFixed(3), max: +(d.at(-1) / dpr).toFixed(3) }));
};

// The sheer: columns from 15% to 85% of the profile, scanning down from the canvas top.
const x0 = Math.round(0.2 * A.w * 0.6);
const x1 = Math.round(0.55 * A.w);
const sheer = [];
const keel = [];
for (let x = x0; x < x1; x += 3) {
  const down = Array.from({ length: A.h }, (_, i) => [i, x, i]);
  const up = Array.from({ length: A.h }, (_, i) => [A.h - 1 - i, x, A.h - 1 - i]);
  const [a, b] = [centre(A, down), centre(B, down)];
  sheer.push(a !== null && b !== null ? b - a : null);
  const [c, d] = [centre(A, up), centre(B, up)];
  keel.push(c !== null && d !== null ? d - c : null);
}
report(`${name} sheer, model minus SVG, vertical`, sheer);
report(`${name} keel, model minus SVG, vertical`, keel);

// The transom: rows through its middle, scanning right from the canvas's left edge.
const transom = [];
for (let y = Math.round(A.h * 0.24); y < Math.round(A.h * 0.3); y++) {
  const right = Array.from({ length: Math.round(A.w * 0.3) }, (_, i) => [i, i, y]);
  const [a, b] = [centre(A, right), centre(B, right)];
  transom.push(a !== null && b !== null ? b - a : null);
}
report(`${name} transom, model minus SVG, horizontal`, transom);
