import { expect, test } from "@playwright/test";
import { note, pause, stats } from "./model";
import { coverage, decodePng } from "./pixels";
import { openModel } from "./webgl";

// Sprint 25, B3.10 (.crew/sprint/25/contract.md): the harness checks itself on a test page of its
// own before any check leans on it, and it runs before the build lands. The page is served by
// route at the site's origin, so the init scripts run on it as they do on "/".

const PAGE = "/__model-harness";

/**
 * A known WebGL 2 scene: a red quad as drawArrays (2 triangles), then an instanced 18-index mesh
 * ten times (6 triangles each, the shape of a fat-line segment's quad with its caps: 60), one
 * frame of 2 draws and 62 triangles. Then, in a second task, one WEBGL_multi_draw call of three
 * 6-index draws: 1 draw and 6 triangles. `window.__scene` reports what the page itself drew.
 */
const SCENE = `<!doctype html><meta charset="utf-8"><title>harness</title>
<body style="margin:0;background:#fff">
<canvas id="c" width="64" height="64" style="display:block;width:64px;height:64px"></canvas>
<script>
const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl2", { premultipliedAlpha: true });
const report = { granted: Boolean(gl), multi: false };
window.__scene = report;
if (gl) {
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, "#version 300 es\\nin vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }"));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, "#version 300 es\\nprecision mediump float; out vec4 o; void main() { o = vec4(1.0, 0.0, 0.0, 1.0); }"));
  gl.linkProgram(program);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1, 0,0, 0.1,0, 0.1,0.1, 0,0.1, 0,0, 0,0, 0,0, 0,0]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([6,7,8, 6,8,9, 6,7,8, 6,8,9, 6,7,8, 6,8,9]), gl.STATIC_DRAW);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.drawElementsInstanced(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0, 10);
  const ext = gl.getExtension("WEBGL_multi_draw");
  if (ext) {
    report.multi = true;
    setTimeout(() => {
      ext.multiDrawElementsWEBGL(gl.TRIANGLES, new Int32Array([6, 6, 6]), 0, gl.UNSIGNED_SHORT, new Int32Array([0, 12, 24]), 0, 3);
      report.second = true;
    }, 0);
  }
}
window.__times = [];
const tick = (t) => { window.__times.push(t); requestAnimationFrame(tick); };
requestAnimationFrame(tick);
</script>`;

test("B3.10 the harness checks itself: it counts a known two-draw scene's draws and triangles (instanced and multi-draw included), refuses WebGL with null, moves requestAnimationFrame's time on the clock, and reads a drawn canvas from a screenshot", async ({
  browser,
}, testInfo) => {
  // The scene, counted: 2 draws and 62 triangles in its first frame, then 1 draw and 6 triangles.
  const run = await openModel(browser, { width: 320, height: 240 });
  await run.page.route(`**${PAGE}`, (route) =>
    route.fulfill({ contentType: "text/html", body: SCENE }),
  );
  await run.page.goto(PAGE);
  await expect
    .poll(() =>
      run.page.evaluate(
        () =>
          (window as Window & { __scene?: { second?: boolean } }).__scene
            ?.second,
      ),
    )
    .toBe(true);
  const scene = await run.page.evaluate(
    () =>
      (window as Window & { __scene?: { granted: boolean; multi: boolean } })
        .__scene,
  );
  expect(scene?.granted, "the test page got a WebGL 2 context").toBe(true);
  expect(scene?.multi, "the browser exposes WEBGL_multi_draw").toBe(true);
  const frames = await run.frames();
  expect
    .soft(
      frames.map(({ draws, triangles }) => ({ draws, triangles })),
      "frames counted: draws and triangles",
    )
    .toEqual([
      { draws: 2, triangles: 62 },
      { draws: 1, triangles: 6 },
    ]);
  expect
    .soft(
      (await run.requests()).map((r) => r.type),
      "context requests recorded",
    )
    .toEqual(["webgl2"]);
  expect.soft(await run.live(), "live contexts").toBe(1);

  // A screenshot of the drawn canvas reads non-zero: red, opaque, where the quad is.
  const shot = decodePng(
    await run.page.locator("#c").screenshot({ omitBackground: true }),
  );
  const alpha = coverage(shot);
  const lit = alpha.filter((a) => a > 0.5).length;
  expect.soft(lit, "covered pixels in the canvas's screenshot").toBe(64 * 64);
  expect
    .soft(
      [shot.data[0], shot.data[1], shot.data[2]],
      "the first pixel's colour (red)",
    )
    .toEqual([255, 0, 0]);
  const info = await run.page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext && gl
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : "";
  });
  testInfo.annotations.push({
    type: "browser",
    description: `Chromium ${browser.version()}; WebGL renderer: ${info}. Every GPU-dependent number in the B3 checks is SwiftShader's, a floor.`,
  });
  await run.close();

  // The refusal: getContext gives null for every WebGL type, 2D still works, and the recorder,
  // outermost, still sees each request.
  const refused = await openModel(browser, {
    width: 320,
    height: 240,
    refuse: true,
  });
  await refused.page.route(`**${PAGE}`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>refused</title>",
    }),
  );
  await refused.page.goto(PAGE);
  const answers = await refused.page.evaluate(() =>
    ["webgl", "webgl2", "experimental-webgl", "2d"].map((type) => {
      const context = document.createElement("canvas").getContext(type);
      const offscreen = new OffscreenCanvas(1, 1).getContext(type as "webgl2");
      return `${type}: ${context === null ? "null" : "granted"}, offscreen ${offscreen === null ? "null" : "granted"}`;
    }),
  );
  expect
    .soft(answers, "getContext with WebGL refused")
    .toEqual([
      "webgl: null, offscreen null",
      "webgl2: null, offscreen null",
      "experimental-webgl: null, offscreen null",
      "2d: granted, offscreen granted",
    ]);
  expect
    .soft(
      (await refused.requests()).map((r) => r.type),
      "refused requests are still recorded",
    )
    .toEqual([
      "webgl",
      "webgl",
      "webgl2",
      "webgl2",
      "experimental-webgl",
      "experimental-webgl",
    ]);
  expect.soft(await refused.live(), "live contexts with WebGL refused").toBe(0);
  await refused.close();

  // The clock: paused, the page's frames wait; 1,000 ms on the clock moves requestAnimationFrame's
  // time and performance.now() by 1,000 ms, in 16 ms frames.
  const timed = await openModel(browser, {
    width: 320,
    height: 240,
    clock: true,
  });
  await timed.page.route(`**${PAGE}`, (route) =>
    route.fulfill({ contentType: "text/html", body: SCENE }),
  );
  await timed.page.goto(PAGE);
  const read = () =>
    timed.page.evaluate(() => ({
      times: [...((window as Window & { __times?: number[] }).__times ?? [])],
      now: performance.now(),
    }));
  const before = await read();
  await timed.step(1000);
  const after = await read();
  const handed = after.times.slice(before.times.length);
  expect
    .soft(after.now - before.now, "performance.now() moved by the clock")
    .toBe(1000);
  expect
    .soft(handed.length, "animation frames in 1,000 ms on the clock")
    .toBeGreaterThanOrEqual(62);
  expect
    .soft(
      (handed.at(-1) ?? 0) - (before.times.at(-1) ?? 0),
      "requestAnimationFrame's time moved by the clock (ms)",
    )
    .toBeGreaterThanOrEqual(984);
  await timed.close();
});

/**
 * The hog's test page: `[data-model]` with no state, landed at 300 ms, lofting at 600 ms, settled at
 * 1,100 ms; `window.__ticks` holds every animation frame's timestamp, the real time its callback ran
 * and the state it saw. A frame's timestamp is its vsync-aligned start, so under a 40 ms spin the
 * timestamps step 33.4 and 50 ms apart while the callbacks run at least 40 ms apart: the hog's
 * promise is in real time, and the timestamps keep it on average.
 */
const HOG = `<!doctype html><meta charset="utf-8"><title>hog</title>
<div data-model></div>
<script>
const model = document.querySelector("[data-model]");
window.__ticks = [];
const tick = (t) => {
  window.__ticks.push({ t, now: performance.now(), state: model.dataset.state ?? "" });
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
setTimeout(() => { model.dataset.state = "landed"; }, 300);
setTimeout(() => { model.dataset.state = "lofting"; }, 600);
setTimeout(() => { model.dataset.state = "settled"; window.__settledAt = performance.now(); }, 1100);
</script>`;

test("B3.10 the frame hog checks itself: on a test page it holds every animation frame callback at least 40 ms apart in real time, 40 ms apart on average by their timestamps, from the first landed state through lofting, and stops at rest", async ({
  browser,
}, testInfo) => {
  const run = await openModel(browser, { width: 320, height: 240, hog: 40 });
  await run.page.route(`**${PAGE}`, (route) =>
    route.fulfill({ contentType: "text/html", body: HOG }),
  );
  await run.page.goto(PAGE);
  await pause(2000);
  const { ticks, settledAt } = await run.page.evaluate(() => {
    const w = window as Window & {
      __ticks?: { t: number; now: number; state: string }[];
      __settledAt?: number;
    };
    return { ticks: w.__ticks ?? [], settledAt: w.__settledAt ?? Number.NaN };
  });
  const spins = await run.hogged();
  await run.close();
  const gaps = (from: number, to: number, key: "t" | "now") =>
    ticks
      .filter((k) => k.now > from && k.now <= to)
      .map((k, i, list) => k[key] - (list[i - 1]?.[key] ?? Number.NaN))
      .slice(1);
  const start = spins[0] ?? Number.POSITIVE_INFINITY;
  const hoggedGaps = gaps(start, settledAt, "now");
  const stamped = gaps(start, settledAt, "t");
  const mean = stamped.reduce((a, b) => a + b, 0) / (stamped.length || 1);
  const restGaps = gaps(settledAt + 200, Number.POSITIVE_INFINITY, "t");
  note(
    testInfo,
    "hog",
    `${spins.length} spins, the first at ${spins[0]?.toFixed(0)} ms, settled at ${settledAt.toFixed(0)} ms; real gaps between callbacks while hogged ${JSON.stringify(stats(hoggedGaps))} ms, timestamp gaps ${JSON.stringify(stats(stamped))} (mean ${mean.toFixed(1)}) ms, timestamp gaps at rest ${JSON.stringify(stats(restGaps))} ms.`,
  );
  expect(spins.length, "the hog's spins").toBeGreaterThan(0);
  expect
    .soft(
      ticks.find((k) => k.now >= (spins[0] ?? 0))?.state,
      "the state the hog's first spin saw",
    )
    .toBe("landed");
  expect
    .soft(hoggedGaps.length, "frames while hogged")
    .toBeGreaterThanOrEqual(5);
  expect
    .soft(
      Math.min(...hoggedGaps),
      "the shortest real gap between frame callbacks while hogged (ms)",
    )
    .toBeGreaterThanOrEqual(39);
  expect
    .soft(mean, "the mean timestamp gap while hogged (ms)")
    .toBeGreaterThanOrEqual(39);
  expect
    .soft(
      spins.filter((t) => t > settledAt + 20).length,
      "spins after the page settled",
    )
    .toBe(0);
  expect
    .soft(stats(restGaps).median, "the median frame gap at rest (ms)")
    .toBeLessThan(25);
});
