// S6, a performance trace of the loft (option A, 4x CPU throttle), from Chromium's own timeline: how
// busy the page's main thread and the GPU process are while the loft plays, its long tasks, and
// whether anything runs after it. The chrome-devtools MCP can't start Chrome as root in the cloud,
// so this records the same trace categories through Playwright.
//
//   node .crew/sprint/24/spike/measure/s6-trace.mjs <out dir> <width> <dpr> <duration ms>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { launch, PROTO } from "./browser.mjs";

const [, , out, widthArg = "390", dprArg = "2", durationArg = "2400"] = process.argv;
const [width, dpr, duration] = [Number(widthArg), Number(dprArg), Number(durationArg)];
const browser = await launch();
const context = await browser.newContext({
  viewport: { width, height: width < 768 ? 844 : 900 },
  deviceScaleFactor: dpr,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const path = join(out, `trace-${width}-dpr${dpr}-${duration}.json`);
await browser.startTracing(page, {
  path,
  categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "gpu", "toplevel", "blink.user_timing"],
});
await page.goto(`${PROTO}?option=a&play=${duration}&govern=0`, { waitUntil: "load" });
await page.waitForFunction(() => document.documentElement.dataset.ready, null, { timeout: 120000, polling: 250 });
await browser.stopTracing();
const report = JSON.parse(await page.evaluate(() => document.documentElement.dataset.ready));
await browser.close();

// The loft's window on the trace clock: user timing marks would need code in the scene, so take it
// from the animation frames the page fired.
const { traceEvents } = JSON.parse(readFileSync(path, "utf8"));
const main = traceEvents.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
const frames = traceEvents.filter((e) => e.name === "FireAnimationFrame" && e.pid === main?.pid).sort((a, b) => a.ts - b.ts);
const start = frames[0]?.ts ?? 0;
const end = start + (report.loft.frames.at(-1).at + 50) * 1000;
const tasks = traceEvents.filter(
  (e) => e.ph === "X" && e.name === "RunTask" && e.pid === main?.pid && e.tid === main?.tid && e.ts >= start && e.ts <= end,
);
const busy = tasks.reduce((n, e) => n + e.dur, 0) / 1000;
const gpu = traceEvents.filter((e) => e.ph === "X" && e.cat?.includes("gpu") && e.name === "GPUTask" && e.ts >= start && e.ts <= end);
const after = traceEvents.filter((e) => e.name === "FireAnimationFrame" && e.pid === main?.pid && e.ts > end);
console.log(
  JSON.stringify({
    trace: path,
    loftMs: +((end - start) / 1000).toFixed(0),
    animationFrames: frames.filter((e) => e.ts <= end).length,
    mainThreadBusyMs: +busy.toFixed(0),
    mainThreadBusyShare: +(busy / ((end - start) / 1000)).toFixed(2),
    longTasksOver50ms: tasks.filter((e) => e.dur > 50000).length,
    gpuTasks: gpu.length,
    gpuBusyMs: +(gpu.reduce((n, e) => n + e.dur, 0) / 1000).toFixed(0),
    animationFramesAfterLoft: after.length,
  }),
);
