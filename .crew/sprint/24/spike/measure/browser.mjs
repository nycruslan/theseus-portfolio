// Shared by the S2 to S6 scripts: Playwright's Chromium drawing WebGL with SwiftShader (the cloud has
// no GPU), and one prototype page per call.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const require = createRequire(join(repo, "package.json"));
const { chromium } = require("@playwright/test");
/** sharp, from next's own dependencies: for reading and writing the frames. */
export const sharp = createRequire(require.resolve("next/package.json"))("sharp");

export const PROTO = `http://127.0.0.1:${process.env.PROTO_PORT ?? 4524}/`;

/**
 * SwiftShader for WebGL; with webgpu, Dawn's SwiftShader (Vulkan) adapter too, so option B runs on
 * its WebGPU backend rather than its WebGL 2 fallback.
 */
export function launch({ webgpu = false } = {}) {
  return chromium.launch({
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      ...(webgpu ? ["--enable-unsafe-webgpu"] : []),
    ],
  });
}

/** Opens the prototype with the query, waits for its report, returns { page, report }. */
export async function open(browser, { width, height = 900, dpr = 1, query = {}, throttle = 0 }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
  });
  if (throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  }
  const search = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  await page.goto(`${PROTO}?${search}`, { waitUntil: "load" });
  // Poll on a timer: the default polls every animation frame, which would itself be a frame at rest.
  await page.waitForFunction(() => document.documentElement.dataset.ready, null, { timeout: 120000, polling: 250 });
  const report = JSON.parse(await page.evaluate(() => document.documentElement.dataset.ready));
  if (report.error) throw new Error(report.error);
  // Let the compositor present the canvas before a screenshot.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, context, report, errors };
}

/** The canvas's box on the page, in CSS px, for clipping screenshots. */
export const clipOf = (report, pad = 0) => ({
  x: Math.max(0, report.canvas.left - pad),
  y: Math.max(0, report.canvas.top - pad),
  width: report.canvas.width + 2 * pad,
  height: report.canvas.height + 2 * pad,
});
