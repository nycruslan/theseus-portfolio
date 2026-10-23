// S2 and S3: the hull's triangles at each quality level and the draws per frame, registered (u = 0,
// the shadow not yet shown) and settled (u = 1), for A, for B on its WebGL 2 fallback, and for B on
// WebGPU (SwiftShader's Vulkan adapter). Draws are renderer.info's count for the whole frame
// (autoReset off, reset before each frame): WebGL's render.calls, WebGPU's render.drawCalls.
//
//   node .crew/sprint/24/spike/measure/s2s3-count.mjs <out.json>

import { writeFileSync } from "node:fs";
import { launch, open } from "./browser.mjs";

const results = [];
for (const webgpu of [false, true]) {
  const browser = await launch({ webgpu });
  for (const option of webgpu ? ["b"] : ["a", "b"]) {
    for (const [width, height, dpr] of [
      [1440, 900, 1],
      [390, 844, 2],
    ]) {
      const { context, report } = await open(browser, { width, height, dpr, query: { option, u: 1 } });
      const row = {
        option,
        backend: report.backend,
        width,
        level: width < 768 ? "phone" : "desktop",
        geometry: report.geometry,
        meshTriangles: report.triangles + 2,
        drawsRegistered: report.first.draws,
        drawsSettled: report.frame.draws,
        infoTriangles: report.frame.triangles,
      };
      results.push(row);
      console.log(JSON.stringify(row));
      await context.close();
    }
  }
  await browser.close();
}
writeFileSync(process.argv[2], JSON.stringify(results, null, 1));
