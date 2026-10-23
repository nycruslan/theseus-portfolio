// S4's frames: the outline diff (magenta = the SVG's ink alone, cyan = the model's alone, blue =
// both) across the whole profile, with three insets at 4x from the DPR 2 render: the transom, the
// keel amidships and the stem. One webp per width.
//
//   node .crew/sprint/24/spike/measure/s4-frames.mjs <s4 dir> <frames dir>

import { statSync } from "node:fs";
import { join } from "node:path";
import { sharp } from "./browser.mjs";

const [, , dir, framesDir] = process.argv;

const label = (text, w) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22"><rect width="100%" height="22" fill="#111c22"/><text x="8" y="15" font-family="sans-serif" font-size="12" fill="#eaf1ee">${text}</text></svg>`,
  );

async function sheet({ name, full, fullBox, zoomFrom, insets, title, out }) {
  const overview = await sharp(join(dir, full)).extract(fullBox).toBuffer();
  const tiles = [];
  for (const box of insets) {
    tiles.push(await sharp(join(dir, zoomFrom)).extract(box).resize({ width: box.width * 4, kernel: "nearest" }).toBuffer());
  }
  const insetMeta = await Promise.all(tiles.map((t) => sharp(t).metadata()));
  const width = Math.max(fullBox.width, insetMeta.reduce((n, m) => n + m.width + 8, 0));
  const insetH = Math.max(...insetMeta.map((m) => m.height));
  const height = 22 + fullBox.height + 22 + insetH;
  const parts = [
    { input: label(title, width), left: 0, top: 0 },
    { input: overview, left: 0, top: 22 },
    { input: label(`${name}: 4x insets from the DPR 2 render (stern, keel amidships, stem)`, width), left: 0, top: 22 + fullBox.height },
  ];
  let x = 0;
  for (const [i, t] of tiles.entries()) {
    parts.push({ input: t, left: x, top: 44 + fullBox.height });
    x += insetMeta[i].width + 8;
  }
  await sharp({ create: { width, height, channels: 3, background: "#ffffff" } }).composite(parts).webp({ quality: 80 }).toFile(out);
  console.log(out, statSync(out).size, "bytes");
}

await sheet({
  name: "1440",
  full: "a-1440-dpr1-diff.png",
  fullBox: { left: 60, top: 85, width: 850, height: 180 },
  zoomFrom: "a-1440-dpr2-diff.png",
  insets: [
    { left: 140, top: 190, width: 70, height: 110 },
    { left: 900, top: 440, width: 70, height: 60 },
    { left: 1690, top: 180, width: 80, height: 130 },
  ],
  title: "S4 at 1440: the SVG's outline (magenta) and the model's first frame (cyan); blue where they agree",
  out: join(framesDir, "s4-register-1440.webp"),
});
await sheet({
  name: "390",
  full: "a-390-dpr2-diff.png",
  fullBox: { left: 20, top: 90, width: 700, height: 150 },
  zoomFrom: "a-390-dpr2-diff.png",
  insets: [
    { left: 30, top: 100, width: 50, height: 70 },
    { left: 330, top: 190, width: 60, height: 50 },
    { left: 600, top: 100, width: 70, height: 90 },
  ],
  title: "S4 at 390 (DPR 2, canvas at 1.5): magenta the SVG alone, cyan the model alone, blue both",
  out: join(framesDir, "s4-register-390.webp"),
});
