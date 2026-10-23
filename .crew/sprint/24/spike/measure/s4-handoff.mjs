// S4, the hand-off as a visitor sees it: the sheet before the canvas shows and with the registered
// frame on it (u = 0), both whole (fills, seams, outline, lettering). Reports how many pixels of the
// drawing's box change and by how much, and writes the change as an image (black = unchanged).
//
//   node .crew/sprint/24/spike/measure/s4-handoff.mjs <out dir>

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clipOf, launch, open, sharp } from "./browser.mjs";

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const browser = await launch();
const results = [];
for (const { width, dpr, option } of [
  { width: 1440, dpr: 1, option: "a" },
  { width: 1440, dpr: 2, option: "a" },
  { width: 390, dpr: 2, option: "a" },
  { width: 390, dpr: 2, option: "b" },
]) {
  const height = width < 768 ? 844 : 900;
  const name = `${option}-${width}-dpr${dpr}`;
  const raw = {};
  for (const show of ["svg", "both"]) {
    const { page, context, report } = await open(browser, { width, height, dpr, query: { option, u: 0, show } });
    const png = await page.screenshot({ clip: clipOf(report) });
    writeFileSync(join(out, `${name}-handoff-${show}.png`), png);
    raw[show] = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    await context.close();
  }
  const { data: a, info } = raw.svg;
  const { data: b } = raw.both;
  const px = Buffer.alloc(info.width * info.height * 3);
  let [changed, strong, max] = [0, 0, 0];
  for (let i = 0; i < info.width * info.height; i++) {
    const d = Math.max(Math.abs(a[i * 3] - b[i * 3]), Math.abs(a[i * 3 + 1] - b[i * 3 + 1]), Math.abs(a[i * 3 + 2] - b[i * 3 + 2]));
    if (d > 8) changed++;
    if (d > 48) strong++;
    max = Math.max(max, d);
    px.fill(Math.min(255, d * 4), i * 3, i * 3 + 3);
  }
  await sharp(px, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(join(out, `${name}-handoff-diff.png`));
  const result = { name, changedOver8: changed, changedOver48: strong, maxChannelDelta: max, pixels: info.width * info.height };
  results.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(join(out, "s4-handoff.json"), JSON.stringify(results, null, 1));
await browser.close();
