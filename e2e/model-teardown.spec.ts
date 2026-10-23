import { expect, test } from "@playwright/test";
import { horizontalOverflow } from "./helpers";
import { BAR, CANVAS, canvasFit, FIRST, MODEL, pause, REST } from "./model";
import { type ModelRun, openModel } from "./webgl";

// Sprint 25, B3.8 (.crew/sprint/25/contract.md): the model cleans up, and the page around it
// holds. C9 runs unedited in plan.spec.ts with the model loading; this adds what's new: nothing
// in `[data-model]` is hit, Read as page and Back leave one context and a settled model, and
// resizing re-fits the canvas in whole pixels or removes it below 1024 px, with no layout shift.

/** Points over `[data-model]`'s box, inside the viewport, whose hit element is inside it. */
function hitsInModel(run: ModelRun) {
  return run.page.evaluate((model) => {
    const el = document.querySelector(model);
    if (!el) return ["no [data-model]"];
    const r = el.getBoundingClientRect();
    const hits: string[] = [];
    for (let i = 0; i <= 24; i++)
      for (let j = 0; j <= 12; j++) {
        const x = r.left + (r.width * i) / 24;
        const y = r.top + (r.height * j) / 12;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest(model))
          hits.push(
            `${hit.tagName.toLowerCase()} at ${x.toFixed(0)},${y.toFixed(0)}`,
          );
      }
    return hits;
  }, MODEL);
}

/** The whole-pixel rule and the fit to `.plan-wide`, as a list of what breaks it. */
async function misfit(run: ModelRun) {
  const fit = await canvasFit(run.page);
  if (!fit.buffer || !fit.css || !fit.plan)
    return ["no canvas or no .plan-wide"];
  const out: string[] = [];
  const [bw = 0, bh = 0] = fit.buffer;
  const [cw = 0, ch = 0] = fit.css;
  const [pw = 0, ph = 0] = fit.plan;
  if (Math.abs(cw * fit.dpr - bw) > 1e-3 || Math.abs(ch * fit.dpr - bh) > 1e-3)
    out.push(`buffer ${bw} x ${bh} isn't CSS ${cw} x ${ch} x DPR ${fit.dpr}`);
  if (Math.max(Math.abs(cw - pw), Math.abs(ch - ph)) > 1 / fit.dpr + 1e-3)
    out.push(`CSS ${cw} x ${ch} is off .plan-wide's ${pw} x ${ph}`);
  return out;
}

const cls = (run: ModelRun) =>
  run.page.evaluate(
    () => (window as Window & { __cls?: number }).__cls ?? Number.NaN,
  );

test("B3.8 it cleans up, and the page around it holds: nothing in [data-model] is hit; Read as page then Back draws nothing on /read, reopens / settled with one live context; resizing re-fits the canvas in whole pixels with no overflow from 1024 to 1920 and no layout shift, and below 1024 removes it", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const run = await openModel(browser);
  await run.goto();
  const during = await run.waitFor(["lofting", ...REST], FIRST);
  expect
    .soft(
      await hitsInModel(run),
      `hit points inside [data-model] while ${during}`,
    )
    .toEqual([]);
  await run.waitFor([...REST], 30_000);
  expect
    .soft(await hitsInModel(run), "hit points inside [data-model] at rest")
    .toEqual([]);

  // Read as page from a settled /, then Back.
  await run.page.evaluate(() => {
    (window as Window & { __sameDocument?: boolean }).__sameDocument = true;
  });
  const requestsBefore = (await run.requests()).length;
  const framesBefore = (await run.frames()).length;
  const statesBefore = (await run.states()).length;
  await run.page.locator(`${BAR} a[href="/read"]`).click();
  await run.page.waitForURL("**/read");
  await pause(2000);
  const same = await run.page.evaluate(
    () =>
      (window as Window & { __sameDocument?: boolean }).__sameDocument === true,
  );
  const since = (n: number) => (same ? n : 0);
  expect
    .soft(
      (await run.requests()).slice(since(requestsBefore)),
      "context requests on /read",
    )
    .toEqual([]);
  expect
    .soft(
      (await run.frames()).length - since(framesBefore),
      "frames drawn on /read",
    )
    .toBe(0);
  await run.page.goBack();
  await run.page.waitForURL((url) => url.pathname === "/");
  const back = await run.waitFor([...REST], FIRST);
  const restored = await run.page.evaluate(
    () =>
      (window as Window & { __sameDocument?: boolean }).__sameDocument === true,
  );
  const statesBack = (await run.states())
    .slice(restored ? statesBefore : 0)
    .map((s) => s.state);
  expect.soft(back, "/ after Back").toBe("settled");
  expect
    .soft(
      statesBack.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states after Back (${statesBack.join(" > ")})`,
    )
    .toEqual([]);
  expect
    .soft(await run.page.locator(CANVAS).count(), "canvases after Back")
    .toBe(1);
  expect.soft(await run.live(), "WebGL contexts alive after Back").toBe(1);

  // Resizing after settling: the canvas re-fits, nothing overflows, and nothing shifts.
  const shiftBefore = await cls(run);
  await run.page.setViewportSize({ width: 1100, height: 900 });
  await pause(800);
  expect
    .soft(await misfit(run), "the canvas after a resize from 1440 to 1100")
    .toEqual([]);
  for (const width of [1024, 1100, 1280, 1366, 1440, 1600, 1920]) {
    await run.page.setViewportSize({ width, height: 900 });
    await pause(500);
    expect
      .soft(await horizontalOverflow(run.page), `page overflow at ${width}`)
      .toBe(0);
    expect.soft(await misfit(run), `the canvas at ${width}`).toEqual([]);
  }
  expect
    .soft(
      (await cls(run)) - shiftBefore,
      "layout shift over the resizes from 1024 to 1920",
    )
    .toBe(0);
  await run.page.setViewportSize({ width: 1000, height: 900 });
  await pause(800);
  expect
    .soft(await run.page.locator(CANVAS).count(), "canvases at 1000 px")
    .toBe(0);
  expect
    .soft((await cls(run)) - shiftBefore, "layout shift on the resize to 1000")
    .toBe(0);
  // Off for the rest of the visit.
  await run.page.setViewportSize({ width: 1440, height: 900 });
  await pause(3500);
  expect
    .soft(
      await run.page.locator(CANVAS).count(),
      "canvases back at 1440 after 1000",
    )
    .toBe(0);
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
