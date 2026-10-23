import { expect, test } from "@playwright/test";
import {
  canvasFit,
  FIRST,
  MODEL,
  note,
  pause,
  REST,
  SHOWN,
  stats,
} from "./model";
import { type ModelRun, openModel, type Script } from "./webgl";

// Sprint 25, B3.6 and B3.9 (.crew/sprint/25/contract.md): the model is cheap and still at rest,
// and the first paint is untouched. Draws and triangles are counted as submitted by the harness's
// context wrapper (e2e/webgl.ts), line quads included. The 3D chunk is S1's method against Off:
// the scripts `/` fetches with the model minus those it fetches with WebGL refused. Frame time,
// long tasks and INP are reported, not gated: headless Chromium draws with SwiftShader, so every
// GPU-dependent number here is a floor, and its note says so.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/** Each rest window, in real time. */
const WINDOW = 3000;

/** Frames drawn over `ms` of real time while `during` runs. */
async function drawnOver(
  run: ModelRun,
  ms: number,
  during?: () => Promise<void>,
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

const sum = (list: Script[], key: "gzip9" | "gzip6" | "brotli11" | "brotli5") =>
  list.reduce((total, s) => total + s[key], 0);

test("B3.6 it is cheap, and still at rest: at most 8 draws and 30,000 submitted triangles a frame over the loft and at rest in both schemes, a backing store at most 2x, 0 frames at rest, off-screen and hidden, and a 3D chunk of at most 250,000 B gzip -9 requested after load", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  let modelScripts: { loadEventEnd: number; list: Script[] } | null = null;
  for (const scheme of ["light", "dark"] as const) {
    const run = await openModel(browser, { scheme });
    await run.goto();
    const end = await run.waitFor([...REST], FIRST);
    // Let the last frame's task finish before counting.
    await pause(200);
    const frames = await run.frames();
    const moving = frames.filter(
      (f) => f.state === "landed" || f.state === "lofting",
    );
    const draws = Math.max(...frames.map((f) => f.draws));
    const triangles = Math.max(...frames.map((f) => f.triangles));
    note(
      testInfo,
      "draws",
      `${scheme}: ${frames.length} frames (${moving.length} landed or lofting), ended ${end}; at most ${draws} draws and ${triangles} triangles in a frame (frame 1: ${frames[0]?.draws} draws, ${frames[0]?.triangles} triangles; last: ${frames.at(-1)?.draws}, ${frames.at(-1)?.triangles}). S3 measured 4 at frame 1 and 5 settled. ${SWIFTSHADER}.`,
    );
    expect(
      moving.length,
      `frames drawn over the loft, ${scheme}`,
    ).toBeGreaterThan(0);
    expect
      .soft(draws, `the most draw calls in one frame, ${scheme}`)
      .toBeLessThanOrEqual(8);
    expect
      .soft(
        triangles,
        `the most submitted triangles in one frame, line quads included, ${scheme}`,
      )
      .toBeLessThanOrEqual(30_000);
    const fit = await canvasFit(run.page);
    expect
      .soft(
        (fit.buffer?.[0] ?? Number.POSITIVE_INFINITY) <=
          2 * (fit.css?.[0] ?? 0) + 1e-3 &&
          (fit.buffer?.[1] ?? Number.POSITIVE_INFINITY) <=
            2 * (fit.css?.[1] ?? 0) + 1e-3,
        `the canvas's backing store ${fit.buffer?.join(" x ")} is at most 2x its CSS size ${fit.css?.join(" x ")}, ${scheme}`,
      )
      .toBe(true);

    // At rest: 3 s with the pointer over the drawing and a small scroll that keeps it on screen.
    const atRest = await drawnOver(run, WINDOW, async () => {
      await run.page.mouse.move(400, 300);
      await run.page.mouse.move(700, 350, { steps: 5 });
      await run.page.evaluate(() => scrollTo(0, 40));
      await run.page.evaluate(() => scrollTo(0, 0));
    });
    expect.soft(atRest, `frames drawn in 3 s at rest, ${scheme}`).toBe(0);
    // Off-screen.
    await run.page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await pause(300);
    expect
      .soft(
        await run.page.evaluate(
          (model) =>
            (document.querySelector(model)?.getBoundingClientRect().bottom ??
              0) <= 0,
          MODEL,
        ),
        `[data-model] is off-screen at the bottom of the page, ${scheme}`,
      )
      .toBe(true);
    expect
      .soft(
        await drawnOver(run, WINDOW),
        `frames drawn in 3 s off-screen, ${scheme}`,
      )
      .toBe(0);
    await run.page.evaluate(() => scrollTo(0, 0));
    await pause(300);
    // Hidden.
    await setHidden(run, true);
    expect
      .soft(
        await drawnOver(run, WINDOW),
        `frames drawn in 3 s hidden, ${scheme}`,
      )
      .toBe(0);
    await setHidden(run, false);
    expect.soft(run.errors, `console errors, ${scheme}`).toEqual([]);
    if (scheme === "light") modelScripts = await run.scripts();
    await run.close();
  }

  // The backing store under a DPR above the cap.
  const dense = await openModel(browser, { dpr: 3 });
  await dense.goto();
  await dense.waitFor(SHOWN, FIRST);
  const denseFit = await canvasFit(dense.page);
  await dense.close();
  note(
    testInfo,
    "dpr",
    `DPR 3: buffer ${denseFit.buffer?.join(" x ")}, CSS ${denseFit.css?.join(" x ")}`,
  );
  expect
    .soft(
      (denseFit.buffer?.[0] ?? Number.POSITIVE_INFINITY) /
        (denseFit.css?.[0] ?? 1),
      "the backing store's ratio to its CSS width at DPR 3",
    )
    .toBeLessThanOrEqual(2 + 1e-3);

  // The 3D chunk: the scripts / fetches with the model, minus those it fetches with WebGL refused.
  const off = await openModel(browser, { refuse: true });
  await off.goto();
  await pause(3500);
  const offScripts = new Set(
    (await off.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  await off.close();
  const all = modelScripts?.list ?? [];
  const chunk = all.filter((s) => !offScripts.has(new URL(s.url).pathname));
  const gzip9 = sum(chunk, "gzip9");
  note(
    testInfo,
    "3D chunk",
    `${chunk.length} files: gzip -9 ${gzip9} B, gzip -6 ${sum(chunk, "gzip6")} B, brotli 11 ${sum(chunk, "brotli11")} B, brotli 5 ${sum(chunk, "brotli5")} B (budget 250,000 B gzip -9; S1 measured 178,873 B for A; Vercel's brotli came 1.6% to 4.6% above local gzip -9). ${chunk.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B at ${s.start?.toFixed(0)} ms`).join("; ")}; loadEventEnd ${modelScripts?.loadEventEnd.toFixed(0)} ms.`,
  );
  expect(
    chunk.length,
    "scripts / fetches with the model beyond the Off page's",
  ).toBeGreaterThan(0);
  expect
    .soft(gzip9, "the 3D chunk, gzip -9 bytes")
    .toBeLessThanOrEqual(250_000);
  expect
    .soft(
      chunk
        .filter(
          (s) =>
            s.start === null || s.start < (modelScripts?.loadEventEnd ?? 0),
        )
        .map((s) => `${new URL(s.url).pathname} at ${s.start}`),
      `chunk files requested before loadEventEnd (${modelScripts?.loadEventEnd.toFixed(0)} ms)`,
    )
    .toEqual([]);

  // Frame time at 4x CPU, reported; the draw count under load is C14's rider, gated.
  const slow = await openModel(browser, { cpu: 4, timeFrames: true });
  await slow.goto();
  const slowEnd = await slow.waitFor([...REST], FIRST * 2);
  await pause(200);
  const frameMs = await slow.page.evaluate(
    () => (window as Window & { __frameMs?: number[] }).__frameMs ?? [],
  );
  const slowFrames = await slow.frames();
  await slow.close();
  note(
    testInfo,
    "frame time",
    `4x CPU, 1440 at DPR 1, ended ${slowEnd}: JS per frame ${JSON.stringify(stats(frameMs))} ms over ${frameMs.length} frames, the last (settled) frame ${frameMs.at(-1)?.toFixed(2)} ms; S6's A: 1.1 / 5.7 / 8.8 ms, settled 1.2 / 3.2 ms. ${SWIFTSHADER}.`,
  );
  expect
    .soft(
      Math.max(...slowFrames.map((f) => f.draws)),
      "the most draws in a frame at 4x CPU (C14)",
    )
    .toBeLessThanOrEqual(8);
});

/**
 * B3.9's recorder: long tasks, Event Timing entries, and the key press, sent through the
 * `__pressShift` binding the moment the page first shows landed or lofting, with the state its
 * keydown reached the page in.
 */
function recordPress() {
  const w = window as Window & {
    __long?: { start: number; duration: number }[];
    __events?: {
      name: string;
      start: number;
      duration: number;
      id: number;
    }[];
    __key?: { state: string | null; t: number };
    __pressShift?: (state: string) => Promise<void>;
  };
  w.__long = [];
  w.__events = [];
  let sent = false;
  new MutationObserver(() => {
    const state = document
      .querySelector("[data-model]")
      ?.getAttribute("data-state");
    if (sent || (state !== "landed" && state !== "lofting")) return;
    sent = true;
    void w.__pressShift?.(state);
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });
  // Where the press landed, read in its own keydown before the page's listeners run, and its
  // timestamp, which its Event Timing entries start at.
  addEventListener(
    "keydown",
    (event) => {
      w.__key ??= {
        state:
          document.querySelector("[data-model]")?.getAttribute("data-state") ??
          null,
        t: event.timeStamp,
      };
    },
    { capture: true },
  );
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      w.__long?.push({ start: e.startTime, duration: e.duration });
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const event = e as PerformanceEntry & { interactionId?: number };
      w.__events?.push({
        name: e.name,
        start: e.startTime,
        duration: e.duration,
        id: event.interactionId ?? 0,
      });
    }
  }).observe({
    type: "event",
    buffered: true,
    durationThreshold: 16,
  } as PerformanceObserverInit);
}

test("B3.9 the first paint is untouched: the longest task the scene build causes at 4x CPU and INP for a key press during the loft are reported against the 200 ms budget", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const run = await openModel(browser, { cpu: 4 });
  // The press goes out the moment the page first shows landed or lofting, from its own mutation
  // through a binding: the test's 50 ms polls never land while SwiftShader blocks the loft's
  // frames, so a polled press comes at rest. Event Timing skips untrusted events, so the press
  // itself must still come from Playwright.
  let sentAt: string | undefined;
  let pressing: Promise<void> | undefined;
  await run.context.exposeBinding("__pressShift", (_source, state: string) => {
    if (pressing) return;
    sentAt = state;
    pressing = run.page.keyboard.press("Shift");
  });
  await run.context.addInitScript(recordPress);
  await run.goto();
  await run.waitFor(SHOWN, FIRST * 2);
  // A model that opened at rest never sent the press: send it now, so where it came is still told.
  if (!pressing) {
    sentAt = `${await run.state()} (no landed or lofting seen)`;
    pressing = run.page.keyboard.press("Shift");
  }
  await pressing;
  await run.waitFor([...REST], 30_000);
  await pause(500);
  const { long, events, key } = await run.page.evaluate(() => {
    const w = window as Window & {
      __long?: { start: number; duration: number }[];
      __events?: {
        name: string;
        start: number;
        duration: number;
        id: number;
      }[];
      __key?: { state: string | null; t: number };
    };
    return { long: w.__long ?? [], events: w.__events ?? [], key: w.__key };
  });
  const scripts = await run.scripts();
  const states = await run.states();
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();

  const chunkStart = Math.min(
    ...scripts.list
      .map((s) => s.start ?? Number.POSITIVE_INFINITY)
      .filter((t) => t >= scripts.loadEventEnd),
  );
  const shown =
    states.find((s) => SHOWN.includes(s.state))?.t ?? Number.POSITIVE_INFINITY;
  const build = long.filter((t) => t.start >= chunkStart && t.start <= shown);
  const longest = Math.max(0, ...build.map((t) => t.duration));
  const press = events.filter((e) => key && e.start >= key.t - 1 && e.id > 0);
  const inp = Math.max(0, ...press.map((e) => e.duration));
  note(
    testInfo,
    "INP",
    `4x CPU, 1440: the longest task from the chunk's request (${chunkStart.toFixed(0)} ms) to frame 1 (${shown.toFixed(0)} ms) is ${longest.toFixed(0)} ms over ${build.length} long tasks (${build.map((t) => t.duration.toFixed(0)).join(", ")}); the spike's whole build was 258 to 338 ms. The key press was sent at ${sentAt} and reached the page during ${key?.state ?? "no keydown"} at ${key?.t.toFixed(0) ?? "-"} ms (states ${states.map((s) => `${s.state}@${s.t.toFixed(0)}`).join(" > ")}); its interaction lasted ${inp.toFixed(0)} ms (${press.map((e) => `${e.name} ${e.duration.toFixed(0)}`).join(", ") || "no entry over 16 ms"}), against the 200 ms INP budget. ${SWIFTSHADER}.`,
  );
  expect(Number.isFinite(shown), "the model showed a frame at 4x CPU").toBe(
    true,
  );
  // Where the press lands is reported, not gated: where the contract's quality net fires, the
  // move gives up for still before a press can reach the page.
  expect(
    SHOWN.includes(key?.state ?? ""),
    `the key press reached the page in one of the model's states (it came during ${key?.state})`,
  ).toBe(true);
});
