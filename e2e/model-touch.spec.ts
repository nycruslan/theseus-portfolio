import { expect, test } from "@playwright/test";
import {
  box,
  CANVAS,
  FIRST,
  FRAME,
  MODEL,
  note,
  pause,
  REST,
  SHOWN,
  TOUCH_SLOP,
  touchDrag,
} from "./model";
import { type ModelRun, openModel } from "./webgl";

// Sprint 26, B3.13 (.crew/sprint/26/contract.md, "The calls I made"): on a phone the page scrolls
// through the canvas, because nothing in `[data-model]` is hit. A real touch drag over the canvas
// (the protocol's touch events, as a finger sends them) scrolls the page by its distance less
// Chromium's touch slop, and as a scroll it settles the loft. The loft's time is Playwright's
// clock; the drag and the scroll run in real time, as the compositor does.

const DRAG = 150;
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);

/** The canvas's centre, and whether it hits anything inside `[data-model]`. */
async function centre(run: ModelRun) {
  const b = await box(run.page, CANVAS);
  expect(b, "the canvas's box").not.toBeNull();
  const x = (b?.x ?? 0) + (b?.width ?? 0) / 2;
  const y = (b?.y ?? 0) + (b?.height ?? 0) / 2;
  const hit = await run.page.evaluate(
    ({ x, y, model }) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest(model)
        ? `<${el.tagName.toLowerCase()}> in the model`
        : `<${el?.tagName.toLowerCase()}>`;
    },
    { x, y, model: MODEL },
  );
  return { x, y, hit };
}

/** A drag up over the canvas's centre: how far the page scrolled. */
async function dragOver(run: ModelRun, x: number, y: number) {
  const before = await run.page.evaluate(() => scrollY);
  await touchDrag(run.page, x, y, DRAG);
  // The scroll lands a frame or two after the finger lifts.
  await pause(300);
  return (await run.page.evaluate(() => scrollY)) - before;
}

test("B3.13 the page scrolls through the canvas: at 390 x 844 with touch, a touch drag over the canvas during lofting scrolls the page by its distance and settles the loft within 2 frames, a second drag after settling scrolls it again, and the canvas's centre never hits anything in [data-model]", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const run = await openModel(browser, {
    width: 390,
    height: 844,
    dpr: 2,
    touch: true,
    clock: true,
  });
  await run.goto();
  expect(await run.until(SHOWN, 4, FIRST), "frame 1 is landed").toBe("landed");
  await run.until(["lofting"], 4, 20_000);

  const lofting = await centre(run);
  expect
    .soft(lofting.hit, "what the canvas's centre hits during lofting")
    .not.toContain("in the model");
  const first = await dragOver(run, lofting.x, lofting.y);
  await run.step(TWO_FRAMES);
  expect
    .soft(
      await run.state(),
      "a touch drag during lofting settles it within 2 frames",
    )
    .toBe("settled");
  expect
    .soft(
      Math.abs(first - DRAG),
      `px the page scrolled for a ${DRAG} px drag over the canvas during lofting (${first}), against the drag less Chromium's touch slop`,
    )
    .toBeLessThanOrEqual(TOUCH_SLOP);

  // At rest: back to the top, then the same drag again.
  await run.page.evaluate(() => scrollTo(0, 0));
  await pause(200);
  await run.step(TWO_FRAMES);
  expect(REST, "the model is at rest").toContain(await run.state());
  const settled = await centre(run);
  expect
    .soft(settled.hit, "what the canvas's centre hits at rest")
    .not.toContain("in the model");
  const second = await dragOver(run, settled.x, settled.y);
  expect
    .soft(
      Math.abs(second - DRAG),
      `px the page scrolled for a ${DRAG} px drag over the canvas at rest (${second}), against the drag less Chromium's touch slop`,
    )
    .toBeLessThanOrEqual(TOUCH_SLOP);
  note(
    testInfo,
    "touch scroll",
    `a ${DRAG} px drag over the canvas scrolled ${first} px during lofting and ${second} px at rest; the canvas's centre hit ${lofting.hit} and ${settled.hit}.`,
  );
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
