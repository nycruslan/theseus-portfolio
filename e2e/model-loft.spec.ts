import { expect, type Page, test } from "@playwright/test";
import { PHONE } from "../lib/model/hull";
import {
  attach,
  BAR,
  type Box,
  box,
  CANVAS,
  DURATION,
  drawingAt,
  ease,
  FIRST,
  FRAME,
  growth,
  growthLaw,
  modelCoverage,
  note,
  POSE_NARROW,
  POSE_TOLERANCE,
  pause,
  REST,
  REVISIONS,
  runTo,
  SHOWN,
  TITLE,
  touchDrag,
  view,
  whole,
} from "./model";
import { channelDelta, crop, extent, type Image } from "./pixels";
import { lensFor, readPose } from "./pose";
import { type ModelRun, openModel } from "./webgl";

// Sprint 25, B3 (.crew/sprint/25/contract.md): the loft. B3.2 holds the hull's framed height as it
// lifts, B3.3 plays it once a visit and ends it on any input, B3.4 opens settled under reduced
// motion. The loft's time is Playwright's clock: a paused clock holds any state and `runTo` moves
// it to a share u of the duration. The framed height follows decision 7: within 2% of
// (1 + GROW × e(u)) × frame 1's, e from notes-iris.md 2 (`ease` in e2e/model.ts); on the narrow
// drawing (sprint 26, decision 9) within 2% of (1 + G_NARROW × e(u)²) × frame 1's (`growth`). The
// `sessionStorage` flag's key is the page's own: these checks go through reloads and tabs.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);

/** Opens `/` on the clock and holds it at the first `lofting` frame; returns that frame's time. */
async function atLofting(run: ModelRun, where: string) {
  await run.goto();
  const first = await run.until(SHOWN, 4, FIRST);
  expect(first, `the model shows first at landed, ${where}`).toBe("landed");
  await run.until(["lofting"], 4, 20_000);
  const states = await run.states();
  return states.find((s) => s.state === "lofting")?.t ?? Number.NaN;
}

/** The pixels of `region` (CSS px) that differ between two views of the viewport at `dpr`. */
function changedIn(a: Image, b: Image, region: Box | null, dpr = 1) {
  if (!region) return Number.NaN;
  const c = whole(region);
  const d = channelDelta(
    crop(a, c.x * dpr, c.y * dpr, c.width * dpr, c.height * dpr),
    crop(b, c.x * dpr, c.y * dpr, c.width * dpr, c.height * dpr),
  );
  return d.filter((v) => v > 0).length;
}

/** Coverage on a mask's outermost rows and columns: the frame runs into the canvas's edge. */
function onEdge(alpha: Float32Array, w: number, h: number) {
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        (y === 0 || x === 0 || y === h - 1 || x === w - 1) &&
        (alpha[y * w + x] ?? 0) > 0
      )
        n++;
  return n;
}

/** The model's heights above the sheet the pose read tries, CSS px (it settles about 83 up at 390). */
const LIFTS = [0, 40, 80, 120, 160, 200];
/** Half the outline's line weight, CSS px: its quads lie across the silhouette's edge. */
const HALF_STROKE = 0.8;

/**
 * The contract's camera in a shot of `clip` at `dpr`: straight down from the canvas's centre, a
 * 30° lens over the viewport's `height`.
 */
async function cameraOf(page: Page, clip: Box, height: number, dpr: number) {
  const canvas = await box(page, CANVAS);
  expect(canvas, "the canvas's box, for the camera").not.toBeNull();
  const c = canvas as Box;
  return {
    distance: lensFor(height) * dpr,
    centre: [
      (c.x + c.width / 2 - clip.x) * dpr,
      (c.y + c.height / 2 - clip.y) * dpr,
    ] as [number, number],
  };
}

type Loft = {
  width: number;
  height: number;
  dpr: number;
  drawing: string;
};

test("B3.2 the loft holds the hull's size and ends settled: at u = 0, 0.25, 0.5, 0.75 and 1 the framed height is within 2% of (1 + 0.10 e(u)) x frame 1's at 1440 and 1024 and of (1 + 0.25 e(u)^2) x frame 1's at 390 x 844 (decision 9), settled at u = 1 after the duration +/- one frame, the title block, revisions and bar never change, and at 390 the settled turn is within 2 degrees of yaw -36 pitch 16 and the frame lies wholly inside the canvas", async ({
  browser,
}, testInfo) => {
  test.setTimeout(360_000);
  const cases: Loft[] = [
    { width: 1440, height: 900, dpr: 1, drawing: ".plan-wide" },
    { width: 1024, height: 768, dpr: 1, drawing: ".plan-wide" },
    {
      width: 390,
      height: 844,
      dpr: 2,
      drawing: drawingAt(390),
    },
  ];
  for (const { width, height, dpr, drawing } of cases) {
    const where = `${width} x ${height} at DPR ${dpr}`;
    const phone = drawing === ".plan-narrow";
    const run = await openModel(browser, { width, height, dpr, clock: true });
    await run.goto();
    const first = await run.until(SHOWN, 4, FIRST);
    expect(first, `frame 1 is landed, ${where}`).toBe("landed");
    const planBox = await box(run.page, drawing);
    expect(planBox, `${drawing}, ${where}`).not.toBeNull();
    const clip = whole(planBox as Box);
    const regions = {
      "the title block": await box(run.page, TITLE),
      "the revision block": await box(run.page, REVISIONS),
      "the bar": await box(run.page, BAR),
    };
    const measure = async () => {
      const { alpha, image } = await modelCoverage(run.page, clip);
      return {
        height: extent(alpha, image.width, image.height).height,
        image,
        alpha,
      };
    };
    const frame1 = await measure();
    const before = await view(run.page);
    expect(frame1.height, `frame 1's framed height, ${where}`).toBeGreaterThan(
      0,
    );

    await run.until(["lofting"], 4, 20_000);
    const t0 =
      (await run.states()).find((s) => s.state === "lofting")?.t ?? Number.NaN;
    expect(t0, `the first lofting frame's time, ${where}`).not.toBeNaN();
    const rows = [`u 0: ${frame1.height / dpr} CSS px (frame 1)`];
    const frames: Image[] = [
      crop(
        before,
        clip.x * dpr,
        clip.y * dpr,
        clip.width * dpr,
        clip.height * dpr,
      ),
    ];
    let last = frame1;
    for (const u of [0.25, 0.5, 0.75, 1]) {
      if (u < 1) {
        await runTo(run, t0 + u * DURATION);
      } else {
        // u = 1: the frame due at the duration, then frame by frame to settled.
        await runTo(run, t0 + DURATION - FRAME);
        await run.until([...REST], 4, 10_000);
      }
      const shot = await measure();
      last = shot;
      const page = await view(run.page);
      frames.push(
        crop(
          page,
          clip.x * dpr,
          clip.y * dpr,
          clip.width * dpr,
          clip.height * dpr,
        ),
      );
      const target = growth(drawing, ease(u)) * frame1.height;
      const drift = shot.height / target - 1;
      rows.push(
        `u ${u}: ${(shot.height / dpr).toFixed(1)} CSS px against ${(target / dpr).toFixed(1)} (${(drift * 100).toFixed(2)}%)`,
      );
      expect
        .soft(
          Math.abs(drift),
          `framed height at u = ${u} against ${growthLaw(drawing)} x frame 1's, ${where}`,
        )
        .toBeLessThanOrEqual(0.02);
      for (const [label, region] of Object.entries(regions)) {
        expect
          .soft(
            changedIn(before, page, region, dpr),
            `pixels of ${label} that changed by u = ${u}, ${where}`,
          )
          .toBe(0);
      }
    }
    expect
      .soft(await run.state(), `data-state at u = 1, ${where}`)
      .toBe("settled");
    const states = await run.states();
    const settledAt =
      states.find((s) => s.state === "settled")?.t ?? Number.NaN;
    note(
      testInfo,
      "loft",
      `${where}: ${rows.join("; ")}. First lofting frame to settled: ${(settledAt - t0).toFixed(1)} ms on the clock, duration ${DURATION}. S5 measured 155 px at every step at 1440 (with no grow); Iris's solve at 390 gives 59.0 px at frame 1 and 73.7 settled, before the screenshot's 1.6 px of outline. ${SWIFTSHADER}.`,
    );
    expect
      .soft(
        Math.abs(settledAt - t0 - DURATION),
        `ms from the first moving frame to settled, against ${DURATION} +/- one frame, ${where}`,
      )
      .toBeLessThanOrEqual(FRAME + 0.5);
    if (phone) {
      // The settled turn, read back from the frame, and the frame inside the canvas.
      const [w, h] = [last.image.width, last.image.height];
      const pose = readPose(
        last.alpha,
        w,
        h,
        PHONE,
        POSE_NARROW,
        await cameraOf(run.page, clip, height, dpr),
        LIFTS.map((l) => l * dpr),
        HALF_STROKE * dpr,
      );
      const settledBox = extent(last.alpha, w, h);
      note(
        testInfo,
        "pose",
        `${where}: the settled silhouette best matches yaw ${pose.yaw} pitch ${pose.pitch} (intersection over union ${pose.iou.toFixed(3)}; at the constants' -36 / 16: ${pose.at(POSE_NARROW).toFixed(3)}); its box x ${(settledBox.left / dpr).toFixed(1)} to ${((settledBox.right + 1) / dpr).toFixed(1)}, rows ${(settledBox.top / dpr).toFixed(1)} to ${((settledBox.bottom + 1) / dpr).toFixed(1)} CSS px of the canvas, against Iris's x 20.3 to 330.2, rows 70.3 to 144.1. ${SWIFTSHADER}.`,
      );
      expect
        .soft(
          Math.abs(pose.yaw - POSE_NARROW.yaw),
          `the settled yaw read back (${pose.yaw}) against ${POSE_NARROW.yaw}, ${where}`,
        )
        .toBeLessThanOrEqual(POSE_TOLERANCE);
      expect
        .soft(
          Math.abs(pose.pitch - POSE_NARROW.pitch),
          `the settled pitch read back (${pose.pitch}) against ${POSE_NARROW.pitch}, ${where}`,
        )
        .toBeLessThanOrEqual(POSE_TOLERANCE);
      const canvas = await box(run.page, CANVAS);
      expect(canvas, `the canvas's box, ${where}`).not.toBeNull();
      const inside = await modelCoverage(run.page, canvas as Box);
      expect
        .soft(
          onEdge(inside.alpha, inside.image.width, inside.image.height),
          `covered pixels on the canvas's edge rows and columns when settled, ${where}`,
        )
        .toBe(0);
      await attach(testInfo, `settled ${where}.png`, inside.image);
    }
    if (width === 1440 || phone) {
      for (const [i, frame] of frames.entries()) {
        await attach(
          testInfo,
          `loft ${width} u ${[0, 0.25, 0.5, 0.75, 1][i]}.png`,
          frame,
        );
      }
    }
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();
  }

  // 320 x 568, reported against Iris's table: settled at once under reduced motion, the same pose.
  const small = await openModel(browser, {
    width: 320,
    height: 568,
    dpr: 2,
    reducedMotion: "reduce",
  });
  await small.goto();
  await small.waitFor(["settled"], FIRST);
  await pause(600);
  const smallCanvas = await box(small.page, CANVAS);
  if (smallCanvas) {
    const shot = await modelCoverage(small.page, whole(smallCanvas));
    const [w, h] = [shot.image.width, shot.image.height];
    const b = extent(shot.alpha, w, h);
    const pose = readPose(
      shot.alpha,
      w,
      h,
      PHONE,
      POSE_NARROW,
      await cameraOf(small.page, whole(smallCanvas), 568, 2),
      LIFTS.map((l) => l * 2),
      HALF_STROKE * 2,
    );
    note(
      testInfo,
      "settled at 320",
      `320 x 568 at DPR 2: framed height ${(b.height / 2).toFixed(1)} CSS px, box x ${(b.left / 2).toFixed(1)} to ${((b.right + 1) / 2).toFixed(1)}, rows ${(b.top / 2).toFixed(1)} to ${((b.bottom + 1) / 2).toFixed(1)} (Iris: 60.5 px, x 16.6 to 271, rows 57.5 to 118, before the outline); turn read back yaw ${pose.yaw} pitch ${pose.pitch} (IoU ${pose.iou.toFixed(3)}); covered pixels on the canvas's edge ${onEdge(shot.alpha, w, h)}. ${SWIFTSHADER}.`,
    );
  }
  await small.close();
});

test("B3.3 once a visit, and any input ends it: at 1440 and at 390 x 844 with touch, a reload or a second goto opens settled with no lofting frame and a new tab plays again; a key, a click, a wheel, a tap and a scroll at 1440, and a tap, a touch scroll and a key at 390, each settle the loft within 2 frames and still do their own work; with sessionStorage throwing the loft plays without an error", async ({
  browser,
}, testInfo) => {
  test.setTimeout(600_000);
  const PHONE_SIZE = { width: 390, height: 844, touch: true };

  // Once a visit, in real time.
  for (const size of [{}, PHONE_SIZE]) {
    const at = "width" in size ? "at 390 x 844 with touch" : "at 1440";
    const visit = await openModel(browser, size);
    await visit.goto();
    await visit.waitFor(["lofting", ...REST], FIRST);
    const firstEnd = await visit.waitFor([...REST], 30_000);
    note(testInfo, "first visit", `${at}: the loft ended ${firstEnd}`);
    const opened = async (label: string) => {
      const end = await visit.waitFor([...REST], FIRST);
      const states = (await visit.states()).map((s) => s.state);
      const moving = (await visit.frames()).filter(
        (f) => f.state === "lofting" || f.state === "landed",
      ).length;
      expect.soft(end, `${label} opens settled, ${at}`).toBe("settled");
      expect
        .soft(
          states.filter((s) => s === "landed" || s === "lofting"),
          `landed or lofting states after ${label}, ${at}`,
        )
        .toEqual([]);
      expect
        .soft(moving, `frames drawn landed or lofting after ${label}, ${at}`)
        .toBe(0);
    };
    await visit.page.reload();
    await opened("a reload");
    await visit.goto("/");
    await opened("a second goto in the same tab");
    // A new tab has its own empty sessionStorage, so it plays the loft again.
    const tab = await visit.context.newPage();
    await tab.goto("/");
    const tabStates: string[] = [];
    const end = Date.now() + FIRST;
    while (Date.now() < end && !tabStates.includes("settled")) {
      tabStates.splice(
        0,
        tabStates.length,
        ...(await tab.evaluate(
          () =>
            (
              window as Window & { __states?: { state: string }[] }
            ).__states?.map((s) => s.state) ?? [],
        )),
      );
      await pause(100);
    }
    expect
      .soft(tabStates, `a new tab plays the loft, ${at}`)
      .toContain("lofting");
    expect
      .soft(visit.errors, `console errors over the visit, ${at}`)
      .toEqual([]);
    await visit.close();
  }

  // Each input during lofting settles it within 2 frames, and still does its own work.
  type Input = {
    name: string;
    size?: { width: number; height: number; touch: boolean };
    touch?: boolean;
    act: (run: ModelRun) => Promise<void>;
    after?: (run: ModelRun) => Promise<void>;
  };
  const centre = async (run: ModelRun, selector: string) => {
    const b = await box(run.page, selector);
    expect(b, `${selector}'s box`).not.toBeNull();
    return {
      x: (b?.x ?? 0) + (b?.width ?? 0) / 2,
      y: (b?.y ?? 0) + (b?.height ?? 0) / 2,
    };
  };
  const focusesSkipLink = async (run: ModelRun) => {
    expect
      .soft(
        await run.page.evaluate(() =>
          document.activeElement?.getAttribute("href"),
        ),
        "Tab during the loft focuses the skip link",
      )
      .toBe("#main");
  };
  const landsOnWork = async (run: ModelRun) => {
    await expect
      .poll(
        () =>
          run.page.evaluate(() => {
            const top = document
              .getElementById("work")
              ?.getBoundingClientRect().top;
            return (
              location.hash === "#work" &&
              top !== undefined &&
              top >= 0 &&
              top < innerHeight
            );
          }),
        {
          message: "a click on a bar link during the loft lands on its target",
        },
      )
      .toBe(true);
  };
  const scrolled = async (run: ModelRun) => {
    await expect
      .poll(() => run.page.evaluate(() => scrollY), {
        message: "the input scrolls the page",
      })
      .toBeGreaterThan(0);
  };
  const inputs: Input[] = [
    {
      name: "a key press (Tab)",
      act: (run) => run.page.keyboard.press("Tab"),
      after: focusesSkipLink,
    },
    {
      name: "a click on the title block's text",
      act: async (run) => {
        const at = await centre(run, `${TITLE} h1`);
        await run.page.mouse.click(at.x, at.y);
      },
    },
    {
      name: "a wheel",
      act: async (run) => {
        const at = await centre(run, `${TITLE} h1`);
        await run.page.mouse.move(at.x, at.y);
        await run.page.mouse.wheel(0, 240);
      },
      after: scrolled,
    },
    {
      name: "a tap",
      touch: true,
      act: async (run) => {
        const at = await centre(run, `${TITLE} h1`);
        await run.page.touchscreen.tap(at.x, at.y);
      },
    },
    {
      name: "a scroll",
      act: async (run) => {
        await run.page.evaluate(() => scrollTo(0, 120));
      },
    },
    {
      name: "a click on the bar's Work link",
      act: async (run) => {
        const at = await centre(run, `${BAR} a[href="#work"]`);
        await run.page.mouse.click(at.x, at.y);
      },
      after: landsOnWork,
    },
    {
      name: "a tap on the bar's Work link at 390",
      size: PHONE_SIZE,
      act: async (run) => {
        const at = await centre(run, `${BAR} a[href="#work"]`);
        await run.page.touchscreen.tap(at.x, at.y);
      },
      after: landsOnWork,
    },
    {
      name: "a touch scroll over the title block at 390",
      size: PHONE_SIZE,
      act: async (run) => {
        const at = await centre(run, `${TITLE} h1`);
        await touchDrag(run.page, at.x, at.y, 120);
      },
      after: scrolled,
    },
    {
      name: "a key press (Tab) at 390",
      size: PHONE_SIZE,
      act: (run) => run.page.keyboard.press("Tab"),
      after: focusesSkipLink,
    },
  ];
  for (const input of inputs) {
    const run = await openModel(browser, {
      clock: true,
      touch: input.touch,
      ...input.size,
    });
    await atLofting(run, input.name);
    await input.act(run);
    // The event reaches the page in real time; then two frames on the clock.
    await pause(150);
    await run.step(TWO_FRAMES);
    expect
      .soft(
        await run.state(),
        `${input.name} during lofting sets settled within 2 frames`,
      )
      .toBe("settled");
    if (input.after) await input.after(run);
    if (input.name === "a key press (Tab)") {
      await attach(
        testInfo,
        "a key press at mid-loft, 2 frames after.png",
        await view(run.page),
      );
    }
    expect.soft(run.errors, `console errors, ${input.name}`).toEqual([]);
    await run.close();
  }

  // Storage that throws: the loft still plays, and nothing errors.
  for (const size of [{}, PHONE_SIZE]) {
    const at = "width" in size ? "at 390 x 844" : "at 1440";
    const blocked = await openModel(browser, {
      throwingStorage: true,
      ...size,
    });
    await blocked.goto();
    await blocked.waitFor([...REST], FIRST);
    expect
      .soft(
        (await blocked.states()).map((s) => s.state),
        `the loft plays with sessionStorage throwing, ${at}`,
      )
      .toContain("lofting");
    expect
      .soft(
        blocked.errors,
        `console errors with sessionStorage throwing, ${at}`,
      )
      .toEqual([]);
    await blocked.close();
  }
});

test("B3.4 reduced motion opens settled: under reduce no landed or lofting state is ever set and no moving frame drawn, and switching to reduce during lofting settles within 2 frames, at 1440 and at 390 x 844", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const at = `at ${size.width} x ${size.height}`;
    const calm = await openModel(browser, { ...size, reducedMotion: "reduce" });
    await calm.goto();
    await calm.waitFor(["settled"], FIRST);
    // Past the 240 ms fade (notes-iris.md 8), and a beat more for any late state.
    await pause(1000);
    const calmStates = (await calm.states()).map((s) => s.state);
    expect
      .soft(
        calmStates[0],
        `the first data-state under reduce (a MutationObserver's record), ${at}`,
      )
      .toBe("settled");
    expect
      .soft(
        calmStates.filter((s) => s === "landed" || s === "lofting"),
        `landed or lofting states under reduce (all: ${calmStates.join(" > ")}), ${at}`,
      )
      .toEqual([]);
    expect
      .soft(
        (await calm.frames()).filter(
          (f) => f.state === "landed" || f.state === "lofting",
        ).length,
        `frames drawn landed or lofting under reduce, ${at}`,
      )
      .toBe(0);
    expect.soft(calm.errors, `console errors under reduce, ${at}`).toEqual([]);
    await calm.close();

    const run = await openModel(browser, { ...size, clock: true });
    await atLofting(run, `before the switch to reduce, ${at}`);
    await run.page.emulateMedia({ reducedMotion: "reduce" });
    await pause(150);
    await run.step(TWO_FRAMES);
    expect
      .soft(
        await run.state(),
        `switching to reduce during lofting sets settled within 2 frames, ${at}`,
      )
      .toBe("settled");
    expect.soft(run.errors, `console errors on the switch, ${at}`).toEqual([]);
    await run.close();
  }
});
