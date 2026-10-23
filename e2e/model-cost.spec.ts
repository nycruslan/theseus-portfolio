import { type Browser, expect, test } from "@playwright/test";
import {
  box,
  canvasFit,
  capAt,
  FIRST,
  MODEL,
  note,
  pause,
  REST,
  SHOWN,
  stats,
  TITLE,
  TRIANGLES_AT,
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

type Size = { width: number; height: number; dpr: number };

test("B3.6 it is cheap, and still at rest: at 1440 and at 390 x 844, at most 8 draws a frame and the level's triangles (30,000 from 768 px, 12,000 below) over the loft and at rest in both schemes, a backing store at most the cap (2x, 1.5x below 768 px) at DPR 2 and 3, 0 frames at rest, off-screen and hidden with a scheme switch inside each window drawing 1 frame once back, and one 3D chunk, the same file at both widths, of at most 250,000 B gzip -9 requested after load", async ({
  browser,
}, testInfo) => {
  test.setTimeout(900_000);
  const chunks = new Map<number, string[]>();
  for (const size of [
    { width: 1440, height: 900, dpr: 1 },
    { width: 390, height: 844, dpr: 2 },
  ] satisfies Size[]) {
    const where = `${size.width} x ${size.height} at DPR ${size.dpr}`;
    const budget = TRIANGLES_AT(size.width);
    let modelScripts: { loadEventEnd: number; list: Script[] } | null = null;
    for (const scheme of ["light", "dark"] as const) {
      const other = scheme === "light" ? "dark" : "light";
      const at = `${scheme}, ${where}`;
      const run = await openModel(browser, { ...size, scheme });
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
        `${at}: ${frames.length} frames (${moving.length} landed or lofting), ended ${end}; at most ${draws} draws and ${triangles} triangles in a frame (frame 1: ${frames[0]?.draws} draws, ${frames[0]?.triangles} triangles; last: ${frames.at(-1)?.draws}, ${frames.at(-1)?.triangles}); budget ${budget}. S3 measured 4 at frame 1 and 5 settled; S2's phone level 5,355 mesh triangles + 828 segments. ${SWIFTSHADER}.`,
      );
      expect(
        moving.length,
        `frames drawn over the loft, ${at}`,
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
      const fit = await canvasFit(run.page);
      const ratioCap = capAt(size.width, size.dpr);
      expect
        .soft(
          (fit.buffer?.[0] ?? Number.POSITIVE_INFINITY) <=
            ratioCap * (fit.css?.[0] ?? 0) + 1e-3 &&
            (fit.buffer?.[1] ?? Number.POSITIVE_INFINITY) <=
              ratioCap * (fit.css?.[1] ?? 0) + 1e-3,
          `the canvas's backing store ${fit.buffer?.join(" x ")} is at most ${ratioCap}x its CSS size ${fit.css?.join(" x ")}, ${at}`,
        )
        .toBe(true);

      // At rest: 3 s with the pointer over the drawing and a small scroll that keeps it on screen.
      const atRest = await drawnOver(run, WINDOW, async () => {
        await run.page.mouse.move(size.width / 4, 150);
        await run.page.mouse.move(size.width / 2, 200, { steps: 5 });
        await run.page.evaluate(() => scrollTo(0, 40));
        await run.page.evaluate(() => scrollTo(0, 0));
      });
      expect.soft(atRest, `frames drawn in 3 s at rest, ${at}`).toBe(0);
      // Off-screen, far past the observer's margin: a scheme switch there draws nothing until the
      // model comes back, then exactly one frame (Lens's nit on #72: at rest alone, a window draws
      // nothing whether or not the gate exists).
      await run.page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await pause(300);
      expect
        .soft(
          await run.page.evaluate(
            (model) =>
              (document.querySelector(model)?.getBoundingClientRect().bottom ??
                0) <= -innerHeight,
            MODEL,
          ),
          `[data-model] is more than a viewport off-screen at the bottom of the page, ${at}`,
        )
        .toBe(true);
      expect
        .soft(
          await drawnOver(run, WINDOW, () =>
            run.page.emulateMedia({ colorScheme: other }),
          ),
          `frames drawn in 3 s off-screen, a switch to ${other} inside, ${at}`,
        )
        .toBe(0);
      expect
        .soft(
          await drawnOver(run, 1000, () =>
            run.page.evaluate(() => scrollTo(0, 0)),
          ),
          `frames drawn once back on screen after the switch to ${other}, ${at}`,
        )
        .toBe(1);
      // Hidden: the same, with the tab hidden and shown.
      await setHidden(run, true);
      expect
        .soft(
          await drawnOver(run, WINDOW, () =>
            run.page.emulateMedia({ colorScheme: scheme }),
          ),
          `frames drawn in 3 s hidden, a switch to ${scheme} inside, ${at}`,
        )
        .toBe(0);
      expect
        .soft(
          await drawnOver(run, 1000, () => setHidden(run, false)),
          `frames drawn once shown after the switch to ${scheme}, ${at}`,
        )
        .toBe(1);
      expect.soft(run.errors, `console errors, ${at}`).toEqual([]);
      if (scheme === "light") modelScripts = await run.scripts();
      await run.close();
    }

    // The backing store under a DPR above the cap: DPR 3, and DPR 2 below 768 px.
    for (const dpr of size.width < 768 ? [2, 3] : [3]) {
      const dense = await openModel(browser, { ...size, dpr });
      await dense.goto();
      await dense.waitFor(SHOWN, FIRST);
      const denseFit = await canvasFit(dense.page);
      await dense.close();
      const ratio = capAt(size.width, dpr);
      note(
        testInfo,
        "dpr",
        `${size.width} x ${size.height} at DPR ${dpr}: buffer ${denseFit.buffer?.join(" x ")}, CSS ${denseFit.css?.join(" x ")}, cap ${ratio}`,
      );
      expect
        .soft(
          (denseFit.buffer?.[0] ?? Number.POSITIVE_INFINITY) /
            (denseFit.css?.[0] ?? 1),
          `the backing store's ratio to its CSS width at DPR ${dpr}, ${size.width} x ${size.height}`,
        )
        .toBeLessThanOrEqual(ratio + 1e-3);
    }

    // The 3D chunk: the scripts / fetches with the model, minus those it fetches with WebGL refused.
    const off = await openModel(browser, { ...size, refuse: true });
    await off.goto();
    await pause(3500);
    const offScripts = new Set(
      (await off.scripts()).list.map((s) => new URL(s.url).pathname),
    );
    await off.close();
    const all = modelScripts?.list ?? [];
    const chunk = all.filter((s) => !offScripts.has(new URL(s.url).pathname));
    chunks.set(
      size.width,
      chunk.map((s) => new URL(s.url).pathname),
    );
    const gzip9 = sum(chunk, "gzip9");
    note(
      testInfo,
      "3D chunk",
      `${where}: ${chunk.length} files: gzip -9 ${gzip9} B, gzip -6 ${sum(chunk, "gzip6")} B, brotli 11 ${sum(chunk, "brotli11")} B, brotli 5 ${sum(chunk, "brotli5")} B (budget 250,000 B gzip -9; S1 measured 178,873 B for A; Vercel's brotli came 1.6% to 4.6% above local gzip -9). ${chunk.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B at ${s.start?.toFixed(0)} ms`).join("; ")}; loadEventEnd ${modelScripts?.loadEventEnd.toFixed(0)} ms.`,
    );
    expect(
      chunk.length,
      `scripts / fetches with the model beyond the Off page's, ${where}`,
    ).toBeGreaterThan(0);
    expect
      .soft(gzip9, `the 3D chunk, gzip -9 bytes, ${where}`)
      .toBeLessThanOrEqual(250_000);
    expect
      .soft(
        chunk
          .filter(
            (s) =>
              s.start === null || s.start < (modelScripts?.loadEventEnd ?? 0),
          )
          .map((s) => `${new URL(s.url).pathname} at ${s.start}`),
        `chunk files requested before loadEventEnd (${modelScripts?.loadEventEnd.toFixed(0)} ms), ${where}`,
      )
      .toEqual([]);

    // Frame time at 4x CPU, reported; the draw count under load is C14's rider, gated.
    const slow = await openModel(browser, {
      ...size,
      cpu: 4,
      timeFrames: true,
    });
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
      `4x CPU, ${where}, ended ${slowEnd}: JS per frame ${JSON.stringify(stats(frameMs))} ms over ${frameMs.length} frames, the last (settled) frame ${frameMs.at(-1)?.toFixed(2)} ms; S6's A at 1440: 1.1 / 5.7 / 8.8 ms, settled 1.2 / 3.2 ms; at 390: 0.9 / 3.0 / 12.6 ms. ${SWIFTSHADER}.`,
    );
    expect
      .soft(
        Math.max(...slowFrames.map((f) => f.draws)),
        `the most draws in a frame at 4x CPU (C14), ${where}`,
      )
      .toBeLessThanOrEqual(8);
  }
  // One chunk carries both levels: the phone fetches the very file the desktop does.
  expect
    .soft(
      [...(chunks.get(390) ?? [])].sort(),
      "the 3D chunk's files at 390, against 1440's",
    )
    .toEqual([...(chunks.get(1440) ?? [])].sort());
});

/**
 * B3.9's recorder: long tasks, Event Timing entries, the largest contentful paints, and the input,
 * sent through the `__pressShift` binding the moment the page first shows landed or lofting (a key
 * at 1440, a tap at 390), with the state its keydown or pointerdown reached the page in.
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
    __lcp?: { time: number; url: string; header: boolean; plan: boolean }[];
    __key?: { state: string | null; t: number };
    __pressShift?: (state: string) => Promise<void>;
  };
  w.__long = [];
  w.__events = [];
  w.__lcp = [];
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
  // Where the input landed, read in its own event before the page's listeners run, and its
  // timestamp, which its Event Timing entries start at.
  for (const type of ["keydown", "pointerdown"])
    addEventListener(
      type,
      (event) => {
        w.__key ??= {
          state:
            document
              .querySelector("[data-model]")
              ?.getAttribute("data-state") ?? null,
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
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const lcp = e as PerformanceEntry & {
        element: Element | null;
        url: string;
      };
      w.__lcp?.push({
        time: e.startTime,
        url: lcp.url,
        header: Boolean(lcp.element?.closest("main > header")),
        plan: Boolean(lcp.element?.closest("[data-plan]")),
      });
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
}

type Case = {
  size: { width: number; height: number; dpr: number; touch?: boolean };
  input: string;
  press: (run: ModelRun) => Promise<void>;
};

/** One B3.9 run: the model loading at 4x CPU, the input sent mid-loft, everything read back. */
async function underLoad({ size, press }: Case, browser: Browser) {
  const run = await openModel(browser, { ...size, cpu: 4 });
  // The input goes out the moment the page first shows landed or lofting, from its own mutation
  // through a binding: the test's 50 ms polls never land while SwiftShader blocks the loft's
  // frames, so a polled input comes at rest. Event Timing skips untrusted events, so the input
  // itself must still come from Playwright.
  let sentAt: string | undefined;
  let pressing: Promise<void> | undefined;
  let sent = false;
  await run.context.exposeBinding("__pressShift", (_source, state: string) => {
    if (sent) return;
    sent = true;
    sentAt = state;
    pressing = press(run);
  });
  await run.context.addInitScript(recordPress);
  await run.goto();
  await run.waitFor(SHOWN, FIRST * 2);
  // A model that opened at rest never sent the input: send it now, so where it came is still told.
  if (!sent) {
    sent = true;
    sentAt = `${await run.state()} (no landed or lofting seen)`;
    pressing = press(run);
  }
  await pressing;
  await run.waitFor([...REST], 30_000);
  // B1.8's window: past rest, 2 s more for any late shift.
  await pause(2000);
  const { long, events, key, lcp, cls } = await run.page.evaluate(() => {
    const w = window as Window & {
      __long?: { start: number; duration: number }[];
      __events?: {
        name: string;
        start: number;
        duration: number;
        id: number;
      }[];
      __lcp?: { time: number; url: string; header: boolean; plan: boolean }[];
      __key?: { state: string | null; t: number };
      __cls?: number;
    };
    return {
      long: w.__long ?? [],
      events: w.__events ?? [],
      key: w.__key,
      lcp: w.__lcp ?? [],
      cls: w.__cls ?? Number.NaN,
    };
  });
  const scripts = await run.scripts();
  const states = await run.states();
  const errors = [...run.errors];
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
  const pressed = events.filter((e) => key && e.start >= key.t - 1 && e.id > 0);
  const inp = Math.max(0, ...pressed.map((e) => e.duration));
  return {
    errors,
    sentAt,
    key,
    states,
    chunkStart,
    shown,
    build,
    longest,
    pressed,
    inp,
    lcp: lcp.at(-1) ?? null,
    cls,
  };
}

test("B3.9 the first paint is untouched: at 4x CPU the longest task the scene build causes and INP for an input during the loft are reported against the 200 ms budget, a key at 1440 and a tap at 390 x 844, where B1.9's LCP (text in the title block, no url, within 2,500 ms) and B1.8's layout shift of 0 hold with the model loading", async ({
  browser,
}, testInfo) => {
  test.setTimeout(360_000);
  const cases: Case[] = [
    {
      size: { width: 1440, height: 900, dpr: 1 },
      input: "key press",
      press: (run) => run.page.keyboard.press("Shift"),
    },
    {
      size: { width: 390, height: 844, dpr: 2, touch: true },
      input: "tap on the title block's text",
      press: async (run) => {
        const b = await box(run.page, `${TITLE} h1`);
        await run.page.touchscreen.tap(
          (b?.x ?? 0) + (b?.width ?? 0) / 2,
          (b?.y ?? 0) + (b?.height ?? 0) / 2,
        );
      },
    },
  ];
  for (const c of cases) {
    const where = `${c.size.width} x ${c.size.height} at DPR ${c.size.dpr}`;
    const r = await underLoad(c, browser);
    expect.soft(r.errors, `console errors, ${where}`).toEqual([]);
    note(
      testInfo,
      "INP",
      `4x CPU, ${where}: the longest task from the chunk's request (${r.chunkStart.toFixed(0)} ms) to frame 1 (${r.shown.toFixed(0)} ms) is ${r.longest.toFixed(0)} ms over ${r.build.length} long tasks (${r.build.map((t) => t.duration.toFixed(0)).join(", ")}); the spike's whole build was 258 to 338 ms. The ${c.input} was sent at ${r.sentAt} and reached the page during ${r.key?.state ?? "no keydown or pointerdown"} at ${r.key?.t.toFixed(0) ?? "-"} ms (states ${r.states.map((s) => `${s.state}@${s.t.toFixed(0)}`).join(" > ")}); its interaction lasted ${r.inp.toFixed(0)} ms (${r.pressed.map((e) => `${e.name} ${e.duration.toFixed(0)}`).join(", ") || "no entry over 16 ms"}), against the 200 ms INP budget. LCP ${r.lcp ? `${r.lcp.time.toFixed(0)} ms, in the title block ${r.lcp.header}` : "none"}; layout shift ${r.cls}. ${SWIFTSHADER}.`,
    );
    expect(
      Number.isFinite(r.shown),
      `the model showed a frame at 4x CPU, ${where}`,
    ).toBe(true);
    // Where the input lands is reported, not gated: where the contract's quality net fires, the
    // move gives up for still before an input can reach the page.
    expect(
      SHOWN.includes(r.key?.state ?? ""),
      `the ${c.input} reached the page in one of the model's states (it came during ${r.key?.state}), ${where}`,
    ).toBe(true);
    if (c.size.width < 768) {
      // B1.9 and B1.8 with the model loading on a phone: the visit to rest and 2 s more.
      expect(r.lcp, `an LCP candidate, ${where}`).not.toBeNull();
      expect
        .soft(r.lcp?.header, `LCP is in main > header, ${where}`)
        .toBe(true);
      expect.soft(r.lcp?.plan, `LCP is in the drawing, ${where}`).toBe(false);
      expect.soft(r.lcp?.url, `LCP has a url, ${where}`).toBe("");
      expect
        .soft(r.lcp?.time, `LCP time (ms) at 4x CPU, ${where}`)
        .toBeLessThanOrEqual(2500);
      expect
        .soft(
          r.cls,
          `layout shift from load to the model at rest plus 2 s, ${where}`,
        )
        .toBe(0);
    }
  }
});
