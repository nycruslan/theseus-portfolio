import { expect, test } from "@playwright/test";
import { horizontalOverflow } from "./helpers";
import {
  BAR,
  CANVAS,
  canvasFit,
  capAt,
  drawingAt,
  FIRST,
  MODEL,
  pause,
  REST,
  TRIANGLES_AT,
} from "./model";
import { type ModelRun, openModel } from "./webgl";

// Sprint 25, B3.8 (.crew/sprint/25/contract.md), widened by sprint 26 (.crew/sprint/26/contract.md):
// the model cleans up, and the page around it holds. C9 runs unedited in plan.spec.ts with the model
// loading; this adds what's new: nothing in `[data-model]` is hit, Read as page and Back leave one
// context and a settled model, at 1440 and at 390, and a resize refits the canvas within a drawing
// and re-registers the model, settled, on the other drawing across 768 px, with no layout shift.

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

/**
 * The whole-pixel rule and the fit to the drawing shown at `width`, as a list of what breaks it:
 * the buffer is the CSS size times the cap, the CSS size the drawing's box.
 */
async function misfit(run: ModelRun, width: number) {
  const fit = await canvasFit(run.page);
  const drawing = drawingAt(width);
  if (!fit.buffer || !fit.css || !fit.plan)
    return [`no canvas or no ${drawing}`];
  const out: string[] = [];
  if (fit.drawing !== drawing)
    out.push(`the page shows ${fit.drawing}, not ${drawing}`);
  const ratio = capAt(width, fit.dpr);
  const [bw = 0, bh = 0] = fit.buffer;
  const [cw = 0, ch = 0] = fit.css;
  const [pw = 0, ph = 0] = fit.plan;
  if (Math.abs(cw * ratio - bw) > 1e-3 || Math.abs(ch * ratio - bh) > 1e-3)
    out.push(`buffer ${bw} x ${bh} isn't CSS ${cw} x ${ch} x ${ratio}`);
  if (Math.max(Math.abs(cw - pw), Math.abs(ch - ph)) > 1 / ratio + 1e-3)
    out.push(`CSS ${cw} x ${ch} is off ${fit.drawing}'s ${pw} x ${ph}`);
  return out;
}

const cls = (run: ModelRun) =>
  run.page.evaluate(
    () => (window as Window & { __cls?: number }).__cls ?? Number.NaN,
  );

/** Nothing in `[data-model]` is hit; Read as page from a settled /, then Back. */
async function visitAndBack(run: ModelRun, where: string) {
  await run.goto();
  const during = await run.waitFor(["lofting", ...REST], FIRST);
  expect
    .soft(
      await hitsInModel(run),
      `hit points inside [data-model] while ${during}, ${where}`,
    )
    .toEqual([]);
  await run.waitFor([...REST], 30_000);
  expect
    .soft(
      await hitsInModel(run),
      `hit points inside [data-model] at rest, ${where}`,
    )
    .toEqual([]);

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
      `context requests on /read, ${where}`,
    )
    .toEqual([]);
  expect
    .soft(
      (await run.frames()).length - since(framesBefore),
      `frames drawn on /read, ${where}`,
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
  expect.soft(back, `/ after Back, ${where}`).toBe("settled");
  expect
    .soft(
      statesBack.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states after Back (${statesBack.join(" > ")}), ${where}`,
    )
    .toEqual([]);
  expect
    .soft(
      await run.page.locator(CANVAS).count(),
      `canvases after Back, ${where}`,
    )
    .toBe(1);
  expect
    .soft(await run.live(), `WebGL contexts alive after Back, ${where}`)
    .toBe(1);
}

/**
 * A resize to `width` after settling, and what it drew: the states and frames since, the level
 * each frame drew at (its triangles) and the layout shift it caused.
 */
async function resizeTo(run: ModelRun, width: number) {
  const [frames, states, shift] = [
    (await run.frames()).length,
    (await run.states()).length,
    await cls(run),
  ];
  await run.page.setViewportSize({ width, height: 900 });
  await pause(800);
  return {
    state: await run.state(),
    states: (await run.states()).slice(states).map((s) => s.state),
    frames: (await run.frames()).slice(frames),
    shift: (await cls(run)) - shift,
    misfit: await misfit(run, width),
  };
}

test("B3.8 it cleans up, and the page around it holds: at 1440 and at 390 nothing in [data-model] is hit, and Read as page then Back draws nothing on /read and reopens / settled with one live context; resizing refits the wide drawing from 1440 to 1000, re-registers the model settled on .plan-narrow at the phone level from 1000 to 700 and back on .plan-wide from 700 to 1000, with no loft and no layout shift, and nothing overflows from 320 to 1920", async ({
  browser,
}) => {
  test.setTimeout(360_000);
  const phone = await openModel(browser, {
    width: 390,
    height: 844,
    touch: true,
  });
  await visitAndBack(phone, "at 390 x 844");
  expect.soft(phone.errors, "console errors at 390").toEqual([]);
  await phone.close();

  const run = await openModel(browser);
  await visitAndBack(run, "at 1440");

  // Resizing after settling, within the wide drawing: the canvas refits, nothing overflows, and
  // nothing shifts.
  const shiftBefore = await cls(run);
  await run.page.setViewportSize({ width: 1100, height: 900 });
  await pause(800);
  expect
    .soft(
      await misfit(run, 1100),
      "the canvas after a resize from 1440 to 1100",
    )
    .toEqual([]);
  for (const width of [1024, 1100, 1280, 1366, 1440, 1600, 1920]) {
    await run.page.setViewportSize({ width, height: 900 });
    await pause(500);
    expect
      .soft(await horizontalOverflow(run.page), `page overflow at ${width}`)
      .toBe(0);
    expect.soft(await misfit(run, width), `the canvas at ${width}`).toEqual([]);
  }
  expect
    .soft(
      (await cls(run)) - shiftBefore,
      "layout shift over the resizes from 1024 to 1920",
    )
    .toBe(0);

  // 1440 to 1000: still the wide drawing, refitted.
  await run.page.setViewportSize({ width: 1440, height: 900 });
  await pause(800);
  const wide = await resizeTo(run, 1000);
  expect
    .soft(wide.misfit, "the canvas on .plan-wide after 1440 to 1000")
    .toEqual([]);
  expect.soft(wide.shift, "layout shift on 1440 to 1000").toBe(0);
  expect
    .soft(
      await run.page.locator(CANVAS).count(),
      "canvases at 1000 px (the model runs at every width)",
    )
    .toBe(1);

  // 1000 to 700: across 768 px, onto the narrow drawing at its level, settled, with no loft.
  const narrow = await resizeTo(run, 700);
  expect
    .soft(narrow.misfit, "the canvas on .plan-narrow after 1000 to 700")
    .toEqual([]);
  expect.soft(narrow.state, "data-state after 1000 to 700").toBe("settled");
  expect
    .soft(
      narrow.states.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states on 1000 to 700 (${narrow.states.join(" > ")})`,
    )
    .toEqual([]);
  expect
    .soft(narrow.frames.length, "frames drawn on 1000 to 700")
    .toBeGreaterThan(0);
  expect
    .soft(
      narrow.frames.filter((f) => f.triangles > TRIANGLES_AT(700)).length,
      `frames on 1000 to 700 above the phone level's ${TRIANGLES_AT(700)} triangles (${narrow.frames.map((f) => f.triangles).join(", ")})`,
    )
    .toBe(0);
  expect.soft(narrow.shift, "layout shift on 1000 to 700").toBe(0);

  // 700 to 1000: back onto the wide drawing at the desktop level.
  const back = await resizeTo(run, 1000);
  expect
    .soft(back.misfit, "the canvas on .plan-wide after 700 to 1000")
    .toEqual([]);
  expect.soft(back.state, "data-state after 700 to 1000").toBe("settled");
  expect
    .soft(
      back.states.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states on 700 to 1000 (${back.states.join(" > ")})`,
    )
    .toEqual([]);
  expect
    .soft(
      back.frames.length > 0 &&
        back.frames.every((f) => f.triangles > TRIANGLES_AT(700)),
      `frames on 700 to 1000 at the desktop level, above ${TRIANGLES_AT(700)} triangles (${back.frames.map((f) => f.triangles).join(", ")})`,
    )
    .toBe(true);
  expect.soft(back.shift, "layout shift on 700 to 1000").toBe(0);

  // Nothing overflows at any width, on either drawing, and the canvas fits each.
  for (const width of [320, 390, 700, 767, 768, 820, 1000, 1024, 1920]) {
    await run.page.setViewportSize({ width, height: 900 });
    await pause(600);
    expect
      .soft(await horizontalOverflow(run.page), `page overflow at ${width}`)
      .toBe(0);
    expect.soft(await misfit(run, width), `the canvas at ${width}`).toEqual([]);
  }
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
