// Renders the canvas's frames: node shoot.mjs <shots.json> <outdir> [only-name]
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/home/user/theseus-portfolio/package.json");
const { chromium } = require("@playwright/test");

const [, , shotsFile, outDir, only] = process.argv;
const shots = JSON.parse(readFileSync(shotsFile, "utf8"));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const shot of shots) {
  if (only && shot.name !== only) continue;
  const p = shot.params;
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: p.dpr ?? 2 });
  page.on("pageerror", (e) => console.error(shot.name, "pageerror", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.error(shot.name, m.text()); });
  await page.goto(`http://127.0.0.1:4517/r3d/render.html#${encodeURIComponent(JSON.stringify(p))}`);
  await page.waitForSelector("body[data-ready='1']", { timeout: 60000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}/${shot.name}.png`, omitBackground: !!p.transparent });
  console.log("shot", shot.name);
  await page.close();
}
await browser.close();
