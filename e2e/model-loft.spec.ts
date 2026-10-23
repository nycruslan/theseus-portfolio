import { expect, test } from "@playwright/test";
import {
  attach,
  BAR,
  type Box,
  box,
  DURATION,
  ease,
  FIRST,
  FRAME,
  GROW,
  modelCoverage,
  note,
  pause,
  REST,
  REVISIONS,
  runTo,
  SHOWN,
  TITLE,
  view,
  whole,
} from "./model";
import { channelDelta, crop, extent, type Image } from "./pixels";
import { type ModelRun, openModel } from "./webgl";

// Sprint 25, B3 (.crew/sprint/25/contract.md): the loft. B3.2 holds the hull's framed height as it
// lifts, B3.3 plays it once a visit and ends it on any input, B3.4 opens settled under reduced
// motion. The loft's time is Playwright's clock: a paused clock holds any state and `runTo` moves
// it to a share u of the duration. The framed height follows decision 7: within 2% of
// (1 + GROW × e(u)) × frame 1's, e from notes-iris.md 2 (`ease` in e2e/model.ts). The
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

/** The pixels of `region` that differ between two views of the viewport. */
function changedIn(a: Image, b: Image, region: Box | null) {
  if (!region) return Number.NaN;
  const c = whole(region);
  const d = channelDelta(
    crop(a, c.x, c.y, c.width, c.height),
    crop(b, c.x, c.y, c.width, c.height),
  );
  return d.filter((v) => v > 0).length;
}

test("B3.2 the loft holds the hull's size and ends settled: at u = 0, 0.25, 0.5, 0.75 and 1 the framed height is within 2% of (1 + 0.10 e(u)) x frame 1's at 1440 and 1024, settled at u = 1 after the duration +/- one frame, and the title block, revisions and bar never change", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ] as const) {
    const where = `${width} x ${height}`;
    const run = await openModel(browser, { width, height, clock: true });
    await run.goto();
    const first = await run.until(SHOWN, 4, FIRST);
    expect(first, `frame 1 is landed, ${where}`).toBe("landed");
    const planBox = await box(run.page, ".plan-wide");
    expect(planBox, `.plan-wide, ${where}`).not.toBeNull();
    const clip = whole(planBox as Box);
    const regions = {
      "the title block": await box(run.page, TITLE),
      "the revision block": await box(run.page, REVISIONS),
      "the bar": await box(run.page, BAR),
    };
    const measure = async () => {
      const { alpha, image } = await modelCoverage(run.page, clip);
      return { height: extent(alpha, image.width, image.height).height, image };
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
    const rows = [`u 0: ${frame1.height} px (frame 1)`];
    const frames: Image[] = [
      crop(before, clip.x, clip.y, clip.width, clip.height),
    ];
    for (const u of [0.25, 0.5, 0.75, 1]) {
      if (u < 1) {
        await runTo(run, t0 + u * DURATION);
      } else {
        // u = 1: the frame due at the duration, then frame by frame to settled.
        await runTo(run, t0 + DURATION - FRAME);
        await run.until([...REST], 4, 10_000);
      }
      const shot = await measure();
      const page = await view(run.page);
      frames.push(crop(page, clip.x, clip.y, clip.width, clip.height));
      const target = (1 + GROW * ease(u)) * frame1.height;
      const drift = shot.height / target - 1;
      rows.push(
        `u ${u}: ${shot.height} px against ${target.toFixed(1)} (${(drift * 100).toFixed(2)}%)`,
      );
      expect
        .soft(
          Math.abs(drift),
          `framed height at u = ${u} against (1 + ${GROW} e) x frame 1's, ${where}`,
        )
        .toBeLessThanOrEqual(0.02);
      for (const [label, region] of Object.entries(regions)) {
        expect
          .soft(
            changedIn(before, page, region),
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
      `${where}: ${rows.join("; ")}. First lofting frame to settled: ${(settledAt - t0).toFixed(1)} ms on the clock, duration ${DURATION}. S5 measured 155 px at every step at 1440 (with no grow). ${SWIFTSHADER}.`,
    );
    expect
      .soft(
        Math.abs(settledAt - t0 - DURATION),
        `ms from the first moving frame to settled, against ${DURATION} +/- one frame, ${where}`,
      )
      .toBeLessThanOrEqual(FRAME + 0.5);
    if (width === 1440) {
      for (const [i, frame] of frames.entries()) {
        await attach(
          testInfo,
          `loft 1440 u ${[0, 0.25, 0.5, 0.75, 1][i]}.png`,
          frame,
        );
      }
    }
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();
  }
});

test("B3.3 once a visit, and any input ends it: a reload or a second goto opens settled with no lofting frame, a new tab plays again; a key, a click, a wheel, a tap and a scroll each settle the loft within 2 frames and still do their own work; with sessionStorage throwing the loft plays without an error", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);

  // Once a visit, in real time.
  const visit = await openModel(browser);
  await visit.goto();
  await visit.waitFor(["lofting", ...REST], FIRST);
  const firstEnd = await visit.waitFor([...REST], 30_000);
  note(testInfo, "first visit", `the loft ended ${firstEnd}`);
  const opened = async (label: string) => {
    const end = await visit.waitFor([...REST], FIRST);
    const states = (await visit.states()).map((s) => s.state);
    const moving = (await visit.frames()).filter(
      (f) => f.state === "lofting" || f.state === "landed",
    ).length;
    expect.soft(end, `${label} opens settled`).toBe("settled");
    expect
      .soft(
        states.filter((s) => s === "landed" || s === "lofting"),
        `landed or lofting states after ${label}`,
      )
      .toEqual([]);
    expect
      .soft(moving, `frames drawn landed or lofting after ${label}`)
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
          (window as Window & { __states?: { state: string }[] }).__states?.map(
            (s) => s.state,
          ) ?? [],
      )),
    );
    await pause(100);
  }
  expect.soft(tabStates, "a new tab plays the loft").toContain("lofting");
  expect.soft(visit.errors, "console errors over the visit").toEqual([]);
  await visit.close();

  // Each input during lofting settles it within 2 frames, and still does its own work.
  type Input = {
    name: string;
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
  const inputs: Input[] = [
    {
      name: "a key press (Tab)",
      act: (run) => run.page.keyboard.press("Tab"),
      after: async (run) => {
        expect
          .soft(
            await run.page.evaluate(() =>
              document.activeElement?.getAttribute("href"),
            ),
            "Tab during the loft focuses the skip link",
          )
          .toBe("#main");
      },
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
      after: async (run) => {
        await expect
          .poll(() => run.page.evaluate(() => scrollY), {
            message: "the wheel scrolls the page",
          })
          .toBeGreaterThan(0);
      },
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
      after: async (run) => {
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
              message:
                "a click on a bar link during the loft lands on its target",
            },
          )
          .toBe(true);
      },
    },
  ];
  for (const input of inputs) {
    const run = await openModel(browser, { clock: true, touch: input.touch });
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
    if (input.name.startsWith("a key")) {
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
  const blocked = await openModel(browser, { throwingStorage: true });
  await blocked.goto();
  await blocked.waitFor([...REST], FIRST);
  expect
    .soft(
      (await blocked.states()).map((s) => s.state),
      "the loft plays with sessionStorage throwing",
    )
    .toContain("lofting");
  expect
    .soft(blocked.errors, "console errors with sessionStorage throwing")
    .toEqual([]);
  await blocked.close();
});

test("B3.4 reduced motion opens settled: under reduce no landed or lofting state is ever set and no moving frame drawn, and switching to reduce during lofting settles within 2 frames", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const calm = await openModel(browser, { reducedMotion: "reduce" });
  await calm.goto();
  await calm.waitFor(["settled"], FIRST);
  // Past the 240 ms fade (notes-iris.md 8), and a beat more for any late state.
  await pause(1000);
  const calmStates = (await calm.states()).map((s) => s.state);
  expect
    .soft(
      calmStates[0],
      "the first data-state under reduce (a MutationObserver's record)",
    )
    .toBe("settled");
  expect
    .soft(
      calmStates.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states under reduce (all: ${calmStates.join(" > ")})`,
    )
    .toEqual([]);
  expect
    .soft(
      (await calm.frames()).filter(
        (f) => f.state === "landed" || f.state === "lofting",
      ).length,
      "frames drawn landed or lofting under reduce",
    )
    .toBe(0);
  expect.soft(calm.errors, "console errors under reduce").toEqual([]);
  await calm.close();

  const run = await openModel(browser, { clock: true });
  await atLofting(run, "before the switch to reduce");
  await run.page.emulateMedia({ reducedMotion: "reduce" });
  await pause(150);
  await run.step(TWO_FRAMES);
  expect
    .soft(
      await run.state(),
      "switching to reduce during lofting sets settled within 2 frames",
    )
    .toBe("settled");
  expect.soft(run.errors, "console errors on the switch").toEqual([]);
  await run.close();
});
