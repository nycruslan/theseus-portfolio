// S6: frame time with the renderer's main thread throttled 4x (CDP Emulation.setCPUThrottlingRate),
// in Playwright's headless Chromium, where the GPU is SwiftShader: rasterising runs on the CPU in
// the GPU process, which the throttle doesn't slow. So `cpu` (the JS time of one frame: pose, scene
// walk, draw submission) is the throttled number, and `interval` (time between animation frames)
// also carries software rasterisation. Neither is a phone's; both are floors for the design.
//
// Each run plays the loft once with quality stepping off (raw cost), once with it on, then benches
// the settled frame alone (a crew event's redraw), and counts frames drawn in the 2 s after the loft.
//
//   node .crew/sprint/24/spike/measure/s6-frames.mjs <out.json> [webgpu]

import { writeFileSync } from "node:fs";
import { launch, open } from "./browser.mjs";

const [, , out, mode] = process.argv;
const webgpu = mode === "webgpu";
const browser = await launch({ webgpu });

const RUNS = webgpu
  ? [
      { option: "b", width: 1440, dpr: 1, duration: 2400 },
      { option: "b", width: 390, dpr: 2, duration: 2400 },
    ]
  : [
      { option: "a", width: 1440, dpr: 1, duration: 2400 },
      { option: "a", width: 1440, dpr: 2, duration: 2400 },
      { option: "a", width: 390, dpr: 2, duration: 2400 },
      { option: "a", width: 390, dpr: 2, duration: 1500 },
      { option: "b", width: 1440, dpr: 1, duration: 2400 },
      { option: "b", width: 390, dpr: 2, duration: 2400 },
    ];

const stats = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, median: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +v.at(-1).toFixed(2) };
};

const results = [];
for (const run of RUNS) {
  const { option, width, dpr, duration } = run;
  const height = width < 768 ? 844 : 900;
  for (const govern of [0, 1]) {
    const { context, report, errors } = await open(browser, {
      width,
      height,
      dpr,
      throttle: 4,
      query: { option, play: duration, govern, bench: govern ? 0 : 30 },
    });
    const frames = report.loft.frames.filter((f) => !f.final);
    const end = report.loft.frames.at(-1);
    const row = {
      ...run,
      govern: Boolean(govern),
      backend: report.backend,
      canvasDpr: report.dpr,
      dprAfter: report.loft.dprAfter,
      reason: report.loft.reason,
      triangles: report.first.triangles,
      draws: report.first.draws,
      mountMs: +report.ready.toFixed(1),
      firstFrameMs: +report.firstFrame.toFixed(1),
      frames: frames.length,
      // Frames drawn per second of the move: SwiftShader lets animation frames run ahead of its
      // rasteriser and then stalls, so per-frame intervals understate the cost; the rate doesn't.
      fps: +((frames.length / Math.max(1, end.at)) * 1000).toFixed(1),
      longestGapMs: +Math.max(...report.loft.frames.map((f) => f.interval)).toFixed(0),
      endMs: +end.at.toFixed(0),
      cpu: stats(frames.map((f) => f.cpu)),
      interval: stats(frames.slice(1).map((f) => f.interval)),
      over22: frames.slice(1).filter((f) => f.interval > 22).length,
      drawnAtRest: report.loft.drawnAtRest,
      ...(report.bench?.length ? { settledFrameCpu: stats(report.bench) } : {}),
      errors: errors.filter((e) => !e.includes("WebGPU is not available") && !e.includes("No available adapters")),
    };
    results.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
}
writeFileSync(out, JSON.stringify(results, null, 1));
await browser.close();
