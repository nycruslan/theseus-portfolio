import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  type Drawing,
  drawing,
  drawingAt,
  FIRST,
  MODEL,
  pause,
  REST,
} from "./model";
import { type ModelOptions, openModel } from "./webgl";

// Sprint 26, B3.14 and B3.15 (.crew/sprint/26/contract.md, "Riders (code)"): when the model can no
// longer show mid-visit, the drawing comes back whole, as the Off page draws it. Forced colours
// switched on hide `[data-model]` and the hollow rule lets go; a lost WebGL context deletes
// `data-state`, so the planks fill and the numbers return, and a restore brings the model back at
// rest with one frame. At a desktop's width and a phone's: the wide drawing has plank numbers and
// leaders, the narrow one fills alone.

const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

/** The Off page's drawing at a size and in a colour mode: what "whole" means there. */
async function offDrawing(browser: Browser, options: ModelOptions) {
  const off = await openModel(browser, { ...options, refuse: true });
  await off.goto();
  const seen = await drawing(off.page);
  await off.close();
  return seen;
}

/** The drawing against the Off page's: the same planks in the same fills, numbers and leaders. */
function expectWhole(seen: Drawing, off: Drawing, when: string) {
  expect
    .soft(
      off.planks.filter((p) => p.alpha === 0).map((p) => p.id),
      `the Off page's planks with a transparent fill, ${when}`,
    )
    .toEqual([]);
  expect
    .soft(
      seen.planks.filter((p) => p.alpha === 0).map((p) => `${p.id} ${p.fill}`),
      `planks with a transparent fill ${when}`,
    )
    .toEqual([]);
  expect
    .soft(
      Object.fromEntries(seen.planks.map((p) => [p.id, p.fill])),
      `each plank's fill ${when}, against the Off page's`,
    )
    .toEqual(Object.fromEntries(off.planks.map((p) => [p.id, p.fill])));
  expect
    .soft(seen.numbers, `plank numbers shown ${when}, against the Off page's`)
    .toEqual(off.numbers);
  expect
    .soft(seen.leaders, `leaders shown ${when}, against the Off page's`)
    .toBe(off.leaders);
}

/** `[data-model]`'s boxes and whether the drawing's centre hits anything inside it. */
function layer(page: Page) {
  return page.evaluate((model) => {
    const el = document.querySelector(model);
    const plan = document.querySelector("[data-plan]")?.getBoundingClientRect();
    const hit =
      plan &&
      document.elementFromPoint(
        plan.left + plan.width / 2,
        plan.top + plan.height / 2,
      );
    return {
      boxes:
        (el?.getClientRects().length ?? 0) +
        (el?.querySelector("canvas")?.getClientRects().length ?? 0),
      hit: Boolean(hit?.closest(model)),
    };
  }, MODEL);
}

test("B3.14 forced colours switched on mid-visit, at 1440 and at 390 x 844, settled: [data-model] has no box and takes no hit, and the drawing is whole, every plank filled as the Off page fills it in forced colours, the wide drawing's numbers and leaders shown; switched back, the model shows again with no loft", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const size of SIZES) {
    const at = `at ${size.width} x ${size.height}`;
    const drawn = drawingAt(size.width);
    const off = await offDrawing(browser, { ...size, forcedColors: "active" });
    expect(
      off.planks.length,
      `planks on the Off page in forced colours, ${at}`,
    ).toBe(22);
    if (drawn === ".plan-wide") {
      expect(
        off.numbers.length,
        `plank numbers on the Off page in forced colours, ${at}`,
      ).toBeGreaterThan(0);
      expect(
        off.leaders,
        `leaders on the Off page in forced colours, ${at}`,
      ).toBeGreaterThan(0);
    }

    const run = await openModel(browser, size);
    await run.goto();
    await run.waitFor([...REST], FIRST);
    await pause(300);
    expect
      .soft(
        (await layer(run.page)).boxes,
        `[data-model]'s boxes settled, ${at}`,
      )
      .toBeGreaterThan(0);
    const statesBefore = (await run.states()).length;
    const framesBefore = (await run.frames()).length;

    await run.page.emulateMedia({ forcedColors: "active" });
    await pause(500);
    const forced = await layer(run.page);
    expect
      .soft(
        forced.boxes,
        `boxes of [data-model] and its canvas in forced colours, ${at}`,
      )
      .toBe(0);
    expect
      .soft(
        forced.hit,
        `the drawing's centre hits [data-model] in forced colours, ${at}`,
      )
      .toBe(false);
    expectWhole(
      await drawing(run.page),
      off,
      `in forced colours mid-visit ${at}`,
    );

    await run.page.emulateMedia({ forcedColors: "none" });
    await pause(800);
    const back = await layer(run.page);
    const states = (await run.states()).slice(statesBefore).map((s) => s.state);
    const frames = (await run.frames()).length - framesBefore;
    testInfo.annotations.push({
      type: "forced colours",
      description: `${at}: states after the switch on and back ${states.join(" > ") || "none"}; ${frames} frames drawn over both switches.`,
    });
    expect
      .soft(back.boxes, `[data-model]'s boxes after forced colours go, ${at}`)
      .toBeGreaterThan(0);
    expect
      .soft(await run.state(), `data-state after forced colours go, ${at}`)
      .toMatch(/^(settled|still)$/);
    expect
      .soft(
        states.filter((s) => s === "landed" || s === "lofting"),
        `landed or lofting states over the switches, ${at}`,
      )
      .toEqual([]);
    expect.soft(run.errors, `console errors, ${at}`).toEqual([]);
    await run.close();
  }
});

test("B3.15 a lost context, at 1440 and at 390 x 844, settled: loseContext() on the model's own context removes data-state within 2 frames, so the drawing is the Off page's, planks filled and numbers shown; restoreContext() returns the state at rest with 1 frame drawn and the drawing hollow again", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const size of SIZES) {
    const at = `at ${size.width} x ${size.height}`;
    const off = await offDrawing(browser, size);
    expect(off.planks.length, `planks on the Off page, ${at}`).toBe(22);

    const run = await openModel(browser, size);
    await run.goto();
    const rest = await run.waitFor([...REST], FIRST);
    await pause(300);
    const hollow = await drawing(run.page);
    expect
      .soft(
        hollow.planks.filter((p) => p.alpha > 0).map((p) => p.id),
        `planks filled under the model at rest before the loss, ${at}`,
      )
      .toEqual([]);

    const frames = await run.loseCounted();
    testInfo.annotations.push({
      type: "lost context",
      description: `${at}: data-state went ${frames} animation frames after loseContext().`,
    });
    expect(frames, `a context to lose, ${at}`).not.toBeNaN();
    expect
      .soft(
        frames,
        `animation frames from loseContext() to no data-state (-1: never), ${at}`,
      )
      .toBeGreaterThanOrEqual(0);
    expect
      .soft(
        frames,
        `animation frames from loseContext() to no data-state, ${at}`,
      )
      .toBeLessThanOrEqual(2);
    await pause(300);
    expectWhole(await drawing(run.page), off, `with the context lost ${at}`);

    const before = (await run.frames()).length;
    expect(await run.restore(), `a lost context to restore, ${at}`).toBe(true);
    await run.waitFor([...REST], 10_000);
    await pause(1000);
    expect
      .soft(await run.state(), `data-state after restoreContext(), ${at}`)
      .toBe(rest);
    expect
      .soft(
        (await run.frames()).length - before,
        `frames drawn after restoreContext(), ${at}`,
      )
      .toBe(1);
    const again = await drawing(run.page);
    expect
      .soft(
        again.planks.filter((p) => p.alpha > 0).map((p) => p.id),
        `planks filled under the model after the restore, ${at}`,
      )
      .toEqual([]);
    expect
      .soft(again.numbers, `plank numbers shown after the restore, ${at}`)
      .toEqual([]);
    expect.soft(run.errors, `console errors, ${at}`).toEqual([]);
    await run.close();
  }
});
