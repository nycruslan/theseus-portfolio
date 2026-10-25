import { expect, test } from "@playwright/test";
import {
  ghostBox,
  ghostFit,
  NUMBERS_FROM,
  PAGES,
  press,
  twoFrames,
  twoPlanks,
} from "./ghost";
import { FIRST, note, pause, REST, TRIANGLES_AT } from "./model";
import { type ModelRun, openModel, type Script } from "./webgl";

// Sprint 33, B5.23 (.crew/sprint/33/contract.md, "Budgets"): the ghost is cheap and still. Draws and
// triangles are counted as submitted by the harness's context wrapper (e2e/webgl.ts), line quads
// included, over the move and at rest. B3.6's windows run with the pointer kept off the hull
// (Pixel's spike, 5.5: a hover over a plank draws one frame by design), and the off-screen window
// at sizes where the drawing can get a viewport away (5.4: at 1440 x 900 the Log is 2,036 px tall).
// The 3D chunk is S1's method: the scripts a page fetches with the model minus those it fetches with
// WebGL refused, and it must be the very file `/` requests. Every GPU number is SwiftShader's floor.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/** Layout's precision: Chromium keeps lengths in 1/64 CSS px, so a whole buffer's CSS size at 1.5x
 * can't be exact (107 rows ask 71.333 px and get 71.328). */
const LAYOUT = 1 / 64;
/** Each rest window, in real time. */
const WINDOW = 3000;
/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;
/** The pixel-ratio cap at a width (sprint 26): 1.5 below 768 px, 2 from it. */
const capAt = (width: number, dpr: number) =>
  Math.min(dpr, width < NUMBERS_FROM ? 1.5 : 2);

/** Frames drawn over `ms` of real time while `during` runs. */
async function drawnOver(
  run: ModelRun,
  ms: number,
  during?: () => Promise<unknown>,
) {
  const before = (await run.frames()).length;
  const end = Date.now() + ms;
  if (during) await during();
  await pause(Math.max(0, end - Date.now()));
  return (await run.frames()).length - before;
}

/** The tab hidden or shown, as a page sees it: visibilityState, hidden and the event. */
function setHidden(run: ModelRun, hidden: boolean) {
  return run.page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (value ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

/** The scripts a fresh visit to `url` fetches past idle, by path, with the model or refused. */
async function fetched(
  browser: Parameters<typeof openModel>[0],
  url: string,
  size: { width: number; height: number },
  refuse: boolean,
) {
  const run = await openModel(browser, { ...size, refuse });
  await run.goto(url);
  if (refuse) await pause(IDLE);
  else await run.waitFor([...REST], FIRST);
  await pause(300);
  const scripts = await run.scripts();
  await run.close();
  return scripts;
}

const paths = (files: Script[]) =>
  files.map((s) => new URL(s.url).pathname).sort();

for (const url of PAGES) {
  test(`B5.23 Cheap and still, on ${url}: at 1440 and 390, DPR 2 and 3, at most 8 draws a frame and 30,000 triangles from 768 px (12,000 below) over the move and at rest in both schemes, a backing store at most the cap (2x, 1.5x below 768); 0 frames at rest, off-screen (at 1440 x 600, 1024 and 390) and hidden with the pointer off the hull, a scheme switch inside each window and 1 frame once back; the pointer within one plank draws 0 frames and crossing to another exactly 1; one 3D chunk of at most 250,000 B gzip -9 requested after load, the same file / requests`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(600_000);
    // One page per size and DPR (sprint 33, decision 12): the move in light from the load, then in
    // dark replayed by Calm then Full (B5.20), each counted; at DPR 2 the rest, hidden, pointer and,
    // at 390 x 844, off-screen windows on the same page; its scripts give the chunk.
    const chunks = new Map<number, { files: Script[]; loadEventEnd: number }>();
    for (const base of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ])
      for (const dpr of [2, 3]) {
        const where = `${url} at ${base.width} x ${base.height}, DPR ${dpr}`;
        const budget = TRIANGLES_AT(base.width);
        const cap = capAt(base.width, dpr);
        const run = await openModel(browser, { ...base, dpr, scheme: "light" });
        await run.goto(url);
        for (const scheme of ["light", "dark"] as const) {
          const at = `${where}, ${scheme}`;
          // Light counts every frame since the load; dark, those from its replay on.
          const from = scheme === "light" ? 0 : (await run.frames()).length;
          if (scheme === "dark") {
            await run.page.emulateMedia({ colorScheme: "dark" });
            await pause(300);
            await press(run.page, "Calm");
            await pause(200);
            await press(run.page, "Full");
          }
          const end = await run.waitFor([...REST], FIRST);
          await pause(300);
          expect(
            await run.page.evaluate(
              () => matchMedia("(prefers-color-scheme: dark)").matches,
            ),
            `the page is in ${scheme}, ${at}`,
          ).toBe(scheme === "dark");
          const frames = (await run.frames()).slice(from);
          const moving = frames.filter(
            (f) => f.state === "landed" || f.state === "lofting",
          );
          const draws = Math.max(...frames.map((f) => f.draws));
          const triangles = Math.max(...frames.map((f) => f.triangles));
          note(
            testInfo,
            "draws",
            `${at}: ${frames.length} frames (${moving.length} moving), ended ${end}; at most ${draws} draws and ${triangles} triangles in a frame; budget 8 and ${budget}. Iris's ghost: 5 draws, 26,288 and 8,432 triangles (Pixel). ${SWIFTSHADER}.`,
          );
          expect(
            moving.length,
            `frames drawn over the move, ${at}`,
          ).toBeGreaterThan(0);
          expect
            .soft(draws, `the most draw calls in one frame, ${at}`)
            .toBeLessThanOrEqual(8);
          expect
            .soft(
              triangles,
              `the most submitted triangles in one frame, line quads included, ${at}`,
            )
            .toBeLessThanOrEqual(budget);
          const fit = await ghostFit(run.page);
          expect
            .soft(
              (fit.buffer?.[0] ?? Number.POSITIVE_INFINITY) <=
                cap * (fit.css?.[0] ?? 0) + cap * LAYOUT + 1e-3 &&
                (fit.buffer?.[1] ?? Number.POSITIVE_INFINITY) <=
                  cap * (fit.css?.[1] ?? 0) + cap * LAYOUT + 1e-3,
              `the backing store ${fit.buffer?.join(" x ")} is at most ${cap}x its CSS size ${fit.css?.join(" x ")}, ${at}`,
            )
            .toBe(true);
        }
        if (dpr === 2) {
          await stillWindows(run, base, where);
          chunks.set(base.width, {
            files: (await run.scripts()).list,
            loadEventEnd: (await run.scripts()).loadEventEnd,
          });
        }
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
        await run.close();
      }

    // Off-screen at the two sizes the DPR runs don't have.
    for (const size of [
      { width: 1440, height: 600 },
      { width: 1024, height: 768 },
    ]) {
      const run = await openModel(browser, size);
      await run.goto(url);
      await run.waitFor([...REST], FIRST);
      await offScreen(run, size, `${url} at ${size.width} x ${size.height}`);
      expect
        .soft(
          run.errors,
          `console errors, ${url} at ${size.width} x ${size.height}`,
        )
        .toEqual([]);
      await run.close();
    }

    // The 3D chunk: the scripts with the model beyond the refused page's, one file, after load, the
    // one / requests, the same at both widths.
    const off = paths(
      (await fetched(browser, url, { width: 1440, height: 900 }, true)).list,
    );
    const beyond = (files: Script[]) =>
      files.filter((s) => !off.includes(new URL(s.url).pathname));
    const wide = {
      ...chunks.get(1440),
      files: beyond(chunks.get(1440)?.files ?? []),
    };
    const narrow = beyond(chunks.get(390)?.files ?? []);
    const homeOff = paths(
      (await fetched(browser, "/", { width: 1440, height: 900 }, true)).list,
    );
    const homeOn = (
      await fetched(browser, "/", { width: 1440, height: 900 }, false)
    ).list.filter((s) => !homeOff.includes(new URL(s.url).pathname));
    const loadEventEnd = wide.loadEventEnd ?? 0;
    const gzip9 = wide.files.reduce((sum, s) => sum + s.gzip9, 0);
    note(
      testInfo,
      "3D chunk",
      `${url}: ${wide.files.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B gzip -9 at ${s.start?.toFixed(0)} ms`).join("; ")}; loadEventEnd ${loadEventEnd.toFixed(0)} ms; /'s: ${paths(homeOn).join(", ")}. Main's built file: 144,549 B (Quill); the spike's: 147,126 B (Pixel).`,
    );
    expect(
      wide.files.length,
      `scripts ${url} fetches with the model beyond the Off page's`,
    ).toBe(1);
    expect
      .soft(gzip9, `the 3D chunk, gzip -9 bytes, ${url}`)
      .toBeLessThanOrEqual(250_000);
    expect
      .soft(
        wide.files
          .filter((s) => s.start === null || s.start < loadEventEnd)
          .map((s) => `${new URL(s.url).pathname} at ${s.start}`),
        `chunk files requested before loadEventEnd (${loadEventEnd.toFixed(0)} ms), ${url}`,
      )
      .toEqual([]);
    expect
      .soft(paths(wide.files), `the 3D chunk on ${url}, against /'s`)
      .toEqual(paths(homeOn));
    expect
      .soft(paths(narrow), `the 3D chunk on ${url} at 390, against 1440's`)
      .toEqual(paths(wide.files));
  });
}

/** B3.6's windows at rest on a page at `base`: at rest, hidden, the pointer, and off-screen at 390. */
async function stillWindows(
  run: ModelRun,
  base: { width: number; height: number },
  where: string,
) {
  // At rest, the pointer kept off the hull: in the page's corner, and a small scroll.
  expect
    .soft(
      await drawnOver(run, WINDOW, async () => {
        await run.page.mouse.move(2, 2);
        await run.page.mouse.move(12, 6, { steps: 5 });
        await run.page.evaluate(() => scrollTo(0, 40));
        await run.page.evaluate(() => scrollTo(0, 0));
      }),
      `frames drawn in 3 s at rest, ${where}`,
    )
    .toBe(0);
  // Hidden, with a scheme switch inside, then shown.
  await setHidden(run, true);
  expect
    .soft(
      await drawnOver(run, WINDOW, () =>
        run.page.emulateMedia({ colorScheme: "light" }),
      ),
      `frames drawn in 3 s hidden, a switch to light inside, ${where}`,
    )
    .toBe(0);
  expect
    .soft(
      await drawnOver(run, 1000, () => setHidden(run, false)),
      `frames drawn once shown after the switch to light, ${where}`,
    )
    .toBe(1);
  // The pointer within one plank, and across to another.
  const planks = await twoPlanks(run, base.width < NUMBERS_FROM ? 2 : 4);
  expect(
    planks,
    `two neighbouring planks on the middle row, ${where}`,
  ).not.toBeNull();
  if (planks) {
    await run.page.mouse.move(planks.a.x, planks.a.y);
    await twoFrames(run.page);
    await pause(300);
    expect
      .soft(
        await drawnOver(run, 1000, () =>
          run.page.mouse.move(planks.within.x, planks.within.y),
        ),
        `frames drawn moving within plank ${planks.a.seat}, ${where}`,
      )
      .toBe(0);
    expect
      .soft(
        await drawnOver(run, 1000, () =>
          run.page.mouse.move(planks.b.x, planks.b.y),
        ),
        `frames drawn crossing from plank ${planks.a.seat} to ${planks.b.seat}, ${where}`,
      )
      .toBe(1);
    await run.page.mouse.move(2, 2);
    await pause(300);
  }
  if (base.width === 390 && base.height === 844)
    await offScreen(run, base, where);
}

/** B3.6's off-screen window: the drawing more than a viewport away, a switch inside, 1 frame back. */
async function offScreen(
  run: ModelRun,
  size: { width: number; height: number },
  where: string,
) {
  await run.page.mouse.move(2, 2);
  await pause(300);
  await run.page.evaluate(() =>
    scrollTo(0, document.documentElement.scrollHeight),
  );
  await pause(300);
  const ghost = await ghostBox(run.page);
  expect
    .soft(
      (ghost?.y ?? 0) + (ghost?.height ?? 0) <= -size.height,
      `[data-ghost] is more than a viewport off-screen at the bottom of the page (its bottom at ${(ghost?.y ?? 0) + (ghost?.height ?? 0)}), ${where}`,
    )
    .toBe(true);
  const dark = await run.page.evaluate(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const other = dark ? "light" : "dark";
  expect
    .soft(
      await drawnOver(run, WINDOW, () =>
        run.page.emulateMedia({ colorScheme: other }),
      ),
      `frames drawn in 3 s off-screen, a switch to ${other} inside, ${where}`,
    )
    .toBe(0);
  expect
    .soft(
      await drawnOver(run, 1000, () => run.page.evaluate(() => scrollTo(0, 0))),
      `frames drawn once back on screen after the switch, ${where}`,
    )
    .toBe(1);
}
