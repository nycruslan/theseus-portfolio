import { type Browser, expect, test } from "@playwright/test";
import {
  canvasFit,
  capAt,
  drawingAt,
  FIRST,
  note,
  pause,
  RATIO_EPSILON,
  REST,
  ratioOf,
} from "./model";
import { openModel } from "./webgl";

// Sprint 26, B3.11 and B3.12 (.crew/sprint/26/contract.md, "Quality"): the model's quality follows
// the drawing the page shows, not the device. Below 768 px the phone mesh and a 1.5 pixel-ratio
// cap, from 768 px the desktop mesh and a cap of 2; during the move, slow frames step the ratio
// down the ladder 2, 1.5, 1 and, at 1, give the move up for a still frame drawn at the cap. The
// level shows in the triangles each frame submits and the ratio in the canvas's buffer against its
// CSS size, both read by the harness's context wrapper (e2e/webgl.ts): the contract adds no hook.
// Every number here is SwiftShader's, headless Chromium's software WebGL: a floor, not a phone's.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";

test("B3.11 the level and the cap follow the drawing: at 390 x 844, DPR 2, the phone mesh (at most 12,000 triangles in any frame) drawn at ratio 1.5; at 768 x 1024, DPR 2, the desktop mesh (over 12,000 and at most 30,000) at ratio 2", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  for (const { width, height, phone } of [
    { width: 390, height: 844, phone: true },
    { width: 768, height: 1024, phone: false },
  ]) {
    const where = `${width} x ${height} at DPR 2`;
    const cap = capAt(width, 2);
    const run = await openModel(browser, { width, height, dpr: 2 });
    await run.goto();
    const end = await run.waitFor([...REST], FIRST);
    // Let the rest frame's task finish before counting.
    await pause(200);
    const frames = await run.frames();
    const fit = await canvasFit(run.page);
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();

    const most = Math.max(...frames.map((f) => f.triangles));
    const [first, last] = [frames[0], frames.at(-1)];
    note(
      testInfo,
      "level",
      `${where}: ${frames.length} frames, ended ${end}; the most triangles in a frame ${most} (frame 1: ${first?.triangles}, rest: ${last?.triangles}); ratio at frame 1 ${first && ratioOf(first).toFixed(3)}, at rest ${last && ratioOf(last).toFixed(3)} (buffer ${last?.buffer.join(" x ")}, CSS ${last?.css.map((v) => v.toFixed(2)).join(" x ")}); S2's phone level is 5,355 mesh triangles + 828 line segments, its desktop level 20,299 + 1,628, sprint 25 drew 25,267. ${SWIFTSHADER}.`,
    );
    expect(frames.length, `frames drawn, ${where}`).toBeGreaterThan(0);
    expect
      .soft(fit.drawing, `the drawing shown, ${where}`)
      .toBe(drawingAt(width));
    if (phone) {
      expect
        .soft(most, `the most triangles in a frame, the phone mesh, ${where}`)
        .toBeLessThanOrEqual(12_000);
    } else {
      expect
        .soft(
          most,
          `the most triangles in a frame, the desktop mesh (over the phone's 12,000), ${where}`,
        )
        .toBeGreaterThan(12_000);
      expect
        .soft(most, `the most triangles in a frame, ${where}`)
        .toBeLessThanOrEqual(30_000);
    }
    // Frame 1 comes before any stepping, and the rest frame returns to the cap.
    expect
      .soft(
        Math.abs((first ? ratioOf(first) : 0) - cap),
        `frame 1's ratio against the cap ${cap}, ${where}`,
      )
      .toBeLessThanOrEqual(RATIO_EPSILON);
    expect
      .soft(
        Math.abs((last ? ratioOf(last) : 0) - cap),
        `the rest frame's ratio against the cap ${cap}, ${where}`,
      )
      .toBeLessThanOrEqual(RATIO_EPSILON);
    expect
      .soft(
        Math.abs((fit.buffer?.[0] ?? 0) / (fit.css?.[0] || 1) - cap) +
          Math.abs((fit.buffer?.[1] ?? 0) / (fit.css?.[1] || 1) - cap),
        `the canvas's buffer over its CSS size (${fit.buffer?.join(" x ")} over ${fit.css?.join(" x ")}) against ${cap}, ${where}`,
      )
      .toBeLessThanOrEqual(2 * RATIO_EPSILON);
  }
});

/** One phone visit with the frame hog: the frames drawn, the hog's spins and how the move ended. */
async function hogged(browser: Browser, ms: number) {
  const run = await openModel(browser, {
    width: 390,
    height: 844,
    dpr: 2,
    hog: ms,
  });
  await run.goto();
  const end = await run.waitFor([...REST], FIRST);
  await pause(300);
  const frames = await run.frames();
  const spins = await run.hogged();
  const errors = [...run.errors];
  await run.close();
  // The moving frames drawn after the hog's first spin: every one comes at least `ms` late.
  const moving = frames.filter(
    (f) =>
      (f.state === "landed" || f.state === "lofting") &&
      f.t > (spins[0] ?? Number.POSITIVE_INFINITY),
  );
  return { end, frames, spins, moving, errors };
}

const near = (ratio: number, rung: number) =>
  Math.abs(ratio - rung) <= RATIO_EPSILON;

test("B3.12 the stepping rule, driven: at 390 x 844, DPR 2, a frame hog spinning 40 ms a frame from the first landed frame steps the canvas's buffer from 1.5x to 1x its CSS size within 3 moving frames, ends the move still within 12, and draws the still frame at the cap of 1.5x; a 26 ms hog is reported", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const run = await hogged(browser, 40);
  const ratios = run.moving.map(ratioOf);
  const first = run.frames[0];
  const still = run.frames.find((f) => f.state === "still");
  const stepped = ratios.findIndex((r) => near(r, 1));
  note(
    testInfo,
    "stepping, 40 ms",
    `ended ${run.end}; ${run.spins.length} spins; frame 1 at ${first && ratioOf(first).toFixed(3)}; the moving frames after the first spin at ${ratios.map((r) => r.toFixed(2)).join(", ")}; the still frame at ${still ? ratioOf(still).toFixed(3) : "none"}. ${SWIFTSHADER}.`,
  );
  expect(run.spins.length, "the hog's spins").toBeGreaterThan(0);
  expect.soft(run.errors, "console errors, 40 ms hog").toEqual([]);
  expect
    .soft(
      first && ratioOf(first),
      "frame 1's ratio, before any slow frame (the cap)",
    )
    .toBeCloseTo(1.5, 3);
  expect
    .soft(
      stepped,
      `the first moving frame at 1x, counted from the hog's first spin (0-based; ratios ${ratios.map((r) => r.toFixed(2)).join(", ")})`,
    )
    .toBeGreaterThanOrEqual(0);
  expect
    .soft(stepped, "the first moving frame at 1x, within 3 (0-based)")
    .toBeLessThanOrEqual(2);
  expect
    .soft(
      ratios.slice(Math.max(0, stepped)).filter((r) => !near(r, 1)),
      "moving frames after the step not at 1x (nothing steps up mid-move)",
    )
    .toEqual([]);
  expect.soft(run.end, "how the hogged move ended").toBe("still");
  expect
    .soft(run.moving.length, "moving frames after the hog's first spin")
    .toBeLessThanOrEqual(12);
  expect(still, "a frame drawn still").toBeDefined();
  expect
    .soft(still && ratioOf(still), "the still frame's ratio (the cap)")
    .toBeCloseTo(1.5, 3);

  // 26 ms a frame: past the 22 ms step, under the 33.4 ms stall, so the move should step to 1x and
  // end settled; reported, since SwiftShader's own frame cost can turn it into a stall.
  const mild = await hogged(browser, 26);
  note(
    testInfo,
    "stepping, 26 ms",
    `ended ${mild.end}; ${mild.spins.length} spins; the moving frames after the first spin at ${mild.moving.map((f) => ratioOf(f).toFixed(2)).join(", ")}; the rest frame at ${mild.frames.at(-1) && ratioOf(mild.frames.at(-1) as (typeof mild.frames)[number]).toFixed(3)}. Reported, not asserted. ${SWIFTSHADER}.`,
  );
  expect.soft(mild.errors, "console errors, 26 ms hog").toEqual([]);
});
