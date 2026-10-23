// S4: does the first frame land on the inked profile? For each width and DPR, four screenshots of
// the drawing's box, each with the rest of the page hidden so the PNG's alpha is coverage:
//   the SVG's outline stroke alone and the model's outline lines alone (u = 0, orthographic);
//   the SVG's hull as a solid silhouette and the model's card alone (planks, deck; no lines).
// Then the largest distance from any covered pixel of one to the nearest of the other (Hausdorff),
// in CSS px, for the strokes and for the silhouettes' edges, and a diff image of the strokes.
//
//   node .crew/sprint/24/spike/measure/s4-register.mjs <out dir>   (prototype served on PROTO_PORT)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clipOf, launch, open, sharp } from "./browser.mjs";

const out = process.argv[2];
mkdirSync(out, { recursive: true });

const CONFIGS = [
  { width: 1440, dpr: 1, option: "a" },
  { width: 1440, dpr: 2, option: "a" },
  { width: 390, dpr: 1, option: "a" },
  { width: 390, dpr: 2, option: "a" },
  { width: 390, dpr: 2, option: "a", cap: 2 },
  { width: 1440, dpr: 1, option: "b" },
  { width: 390, dpr: 2, option: "b" },
];

const browser = await launch();
const results = [];
for (const config of CONFIGS) {
  const { width, dpr, option, cap } = config;
  const height = width < 768 ? 844 : 900;
  const name = `${option}-${width}-dpr${dpr}${cap ? `-cap${cap}` : ""}`;
  const shots = {};
  let report;
  for (const [key, query] of [
    ["svgLine", { outline: 1, show: "svg" }],
    ["glLine", { parts: "outline", show: "canvas" }],
    ["svgFill", { sil: 1, show: "svg" }],
    ["glFill", { parts: "hull", show: "canvas" }],
  ]) {
    const opened = await open(browser, {
      width,
      height,
      dpr,
      query: { option, u: 0, solo: 1, ...(cap ? { dpr: cap } : {}), ...query },
    });
    report = opened.report;
    const png = await opened.page.screenshot({ clip: clipOf(report), omitBackground: true });
    writeFileSync(join(out, `${name}-${key}.png`), png);
    shots[key] = await alpha(png);
    if (opened.errors.length) console.log(name, key, opened.errors);
    await opened.context.close();
  }
  // The wide drawing's outline path also carries the body plan's midship section: compare the
  // profile only, everything left of the profile's bow plus a margin.
  const { s, ox } = { s: report.poses.scale, ox: report.poses.from.cx - (624 / 2) * report.poses.scale };
  const limit = Math.round((ox + 624 * s + 40) * dpr);
  const line = hausdorff(shots.svgLine, shots.glLine, limit);
  const edge = hausdorff(edges(shots.svgFill), edges(shots.glFill), limit);
  const result = {
    name,
    ...config,
    canvasDpr: report.dpr,
    outline: { max: line.max / dpr, p99: line.p99 / dpr, pixels: line.n },
    silhouette: { max: edge.max / dpr, p99: edge.p99 / dpr, pixels: edge.n },
  };
  results.push(result);
  console.log(JSON.stringify(result));
  await diffImage(shots.svgLine, shots.glLine, limit, join(out, `${name}-diff.png`));
}
writeFileSync(join(out, "s4.json"), JSON.stringify(results, null, 1));
await browser.close();

/** A PNG's alpha channel as coverage 0..1. */
async function alpha(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = new Float32Array(info.width * info.height);
  for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3] / 255;
  return { a, w: info.width, h: info.height };
}

/** The pixels of a coverage mask (>= 0.5) that touch an uncovered pixel. */
function edges({ a, w, h }) {
  const e = new Float32Array(a.length);
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[y * w + x] >= 0.5;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))) e[y * w + x] = 1;
  return { a: e, w, h };
}

/** Both ways: the farthest covered pixel of one mask from the nearest covered pixel of the other. */
function hausdorff(A, B, limit) {
  const R = 12;
  const pts = (M) => {
    const p = [];
    for (let y = 0; y < M.h; y++) for (let x = 0; x < Math.min(M.w, limit); x++) if (M.a[y * M.w + x] >= 0.5) p.push([x, y]);
    return p;
  };
  const near = (M, x, y) => {
    let best = R;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const [u, v] = [x + dx, y + dy];
        if (u < 0 || v < 0 || u >= M.w || v >= M.h || u >= limit) continue;
        if (M.a[v * M.w + u] >= 0.5) best = Math.min(best, Math.hypot(dx, dy));
      }
    return best;
  };
  const d = [...pts(A).map(([x, y]) => near(B, x, y)), ...pts(B).map(([x, y]) => near(A, x, y))].sort((p, q) => p - q);
  return { max: d.at(-1) ?? 0, p99: d[Math.floor(d.length * 0.99)] ?? 0, n: d.length };
}

/** Magenta where only the SVG inks, cyan where only the model does, blue where both do. */
async function diffImage(A, B, limit, path) {
  const { w, h } = A;
  const px = Buffer.alloc(w * h * 3, 255);
  for (let i = 0; i < w * h; i++) {
    if (i % w >= limit) continue;
    px[i * 3] = Math.round(255 * (1 - B.a[i]));
    px[i * 3 + 1] = Math.round(255 * (1 - A.a[i]));
  }
  await sharp(px, { raw: { width: w, height: h, channels: 3 } }).png().toFile(path);
}
