// S5: the loft at five moments (u, the share of the duration: 0, 0.25, 0.5, 0.75, 1) at 1440 and 390.
// For each, the whole drawing's box as the visitor sees it, and the canvas alone (rest of the page
// hidden, PNG alpha = the model's coverage) to measure the hull's framed height in CSS px. Writes
// one contact sheet per width as webp, and s5.json. The frames are the same for every duration:
// the pose is a function of the eased progress; the duration only sets when each frame comes.
//
//   node .crew/sprint/24/spike/measure/s5-loft.mjs <scratch dir> <frames dir>

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clipOf, launch, open, sharp } from "./browser.mjs";

const [, , scratch, framesDir] = process.argv;
mkdirSync(scratch, { recursive: true });
const US = [0, 0.25, 0.5, 0.75, 1];
const DURATIONS = [2400, 1800, 1500, 1200];
const ease = (u) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u));

const browser = await launch();
const results = [];
for (const { width, dpr, scale } of [
  { width: 1440, dpr: 1, scale: 0.5 },
  { width: 390, dpr: 2, scale: 0.5 },
]) {
  const height = width < 768 ? 844 : 900;
  const tiles = [];
  for (const u of US) {
    const shown = await open(browser, { width, height, dpr, query: { option: "a", u, live: 1 } });
    const png = await shown.page.screenshot({ clip: clipOf(shown.report) });
    writeFileSync(join(scratch, `loft-${width}-u${u}.png`), png);
    await shown.context.close();

    const solo = await open(browser, {
      width,
      height,
      dpr,
      query: { option: "a", u, live: 1, solo: 1, show: "canvas" },
    });
    const alpha = await solo.page.screenshot({ clip: clipOf(solo.report), omitBackground: true });
    await solo.context.close();
    const measured = await extent(alpha, dpr);
    const { report } = solo;
    const row = {
      width,
      dpr,
      u,
      e: report.e,
      target: report.target,
      predicted: report.framed.height,
      measured: measured.height,
      measuredWidth: measured.width,
      // The heavier outline's half-width sits outside the silhouette at top and bottom.
      drift: measured.height / results.find((r) => r.width === width && r.u === 0)?.measured || 1,
      at: Object.fromEntries(DURATIONS.map((d) => [`${d}ms`, Math.round(u * d)])),
    };
    if (u === 0) row.drift = 1;
    results.push(row);
    console.log(JSON.stringify(row));
    tiles.push({ png, u, e: report.e });
  }
  await contactSheet(tiles, width, dpr, scale, join(framesDir, `s5-loft-${width}.webp`));
}
writeFileSync(join(scratch, "s5.json"), JSON.stringify(results, null, 1));
await browser.close();

/** The covered rows and columns of a canvas-only screenshot (alpha >= 0.5), in CSS px. */
async function extent(png, dpr) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let [top, bottom, left, right] = [Infinity, -1, Infinity, -1];
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] >= 128) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  return { height: (bottom - top + 1) / dpr, width: (right - left + 1) / dpr };
}

/** Five frames stacked, each labelled with u, e and when it comes at 2.4 s and 1.5 s. */
async function contactSheet(tiles, width, dpr, scale, path) {
  const first = await sharp(tiles[0].png).metadata();
  const w = Math.round(first.width * scale);
  const h = Math.round(first.height * scale);
  const label = (u, e) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22"><rect width="100%" height="22" fill="#111c22"/><text x="8" y="15" font-family="sans-serif" font-size="12" fill="#eaf1ee">u ${u}  e ${e.toFixed(3)}  at ${Math.round(u * 2400)} ms of 2.4 s, ${Math.round(u * 1500)} ms of 1.5 s</text></svg>`,
    );
  const parts = [];
  for (const [i, { png, u, e }] of tiles.entries()) {
    parts.push({ input: await sharp(png).resize(w, h).toBuffer(), left: 0, top: i * (h + 22) + 22 });
    parts.push({ input: label(u, e), left: 0, top: i * (h + 22) });
  }
  await sharp({ create: { width: w, height: tiles.length * (h + 22), channels: 3, background: "#ffffff" } })
    .composite(parts)
    .webp({ quality: 72 })
    .toFile(path);
  const { size } = await sharp(path).metadata().then(() => import("node:fs").then((fs) => fs.statSync(path)));
  console.log(path, size, "bytes");
}
