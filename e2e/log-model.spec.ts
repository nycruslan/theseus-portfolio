import {
  type Browser,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  aPlank,
  bareView,
  canvasAlone,
  canvasBox,
  centreOf,
  copper,
  DRAWING,
  drawnLength,
  ghostBox,
  ghostDrawing,
  ghostFit,
  ghostNumbers,
  hullBox,
  landedOn,
  ledOutSeats,
  MARKED,
  MOVE,
  markedSeat,
  markVisit,
  medianAt,
  medianIn,
  NUMBERS_FROM,
  oklab,
  onEdge,
  PAGES,
  pickOf,
  plankCells,
  press,
  rgbOf,
  SEAT_BY_NUMBER,
  SEATS,
  SIZES,
  scanSeats,
  sinceMark,
  token,
  twoFrames,
} from "./ghost";
import { contrast } from "./helpers";
import {
  attach,
  type Box,
  CANVAS,
  ease,
  FIRST,
  FRAME,
  MODEL,
  note,
  pause,
  REST,
  runTo,
  SHOWN,
  whole,
} from "./model";
import {
  channelDelta,
  coverage,
  crop,
  decodePng,
  edges,
  extent,
  hausdorff,
  type Image,
  pixel,
} from "./pixels";
import { GHOST } from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";

// Sprint 33, B5c (.crew/sprint/33/contract.md): the ghost hull in 3D on /log and /log/13. B5.18 is
// where it stands and how it lands, B5.19 its look and its numbers, B5.20 Full's one camera move,
// B5.21 Calm and reduced motion. The hooks are B3's (`[data-model]` after `[data-ghost]`, its
// `data-state`, its canvas) and the contract's one new one, `data-pick` (e2e/ghost.ts). Moving
// frames are held on Playwright's clock, as B3's checks hold them: on SwiftShader at 1440 the
// quality net ends a real-time move `still` (Pixel's spike, 5.8). Every GPU number is a floor.

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/** Layout's precision: Chromium keeps lengths in 1/64 CSS px. */
const LAYOUT = 1 / 64;
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);
/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;
/** The scan's grid per width: a lift is 25 px deep at 1440, 16 at 1024, 10 at 390. */
const stepAt = (width: number) => (width >= 1280 ? 6 : width >= 768 ? 4 : 2);
/** The pixel-ratio cap at a width (sprint 26): 1.5 below 768 px, 2 from it. */
const capAt = (width: number, dpr: number) =>
  Math.min(dpr, width < NUMBERS_FROM ? 1.5 : 2);

/** Opens `url` with the harness and waits for the web fonts. */
async function openOn(browser: Browser, url: string, options: ModelOptions) {
  const run = await openModel(browser, options);
  await run.goto(url);
  return run;
}

/** Opens `url` and waits for the model at rest, in real time. */
async function settledOn(browser: Browser, url: string, options: ModelOptions) {
  const run = await openOn(browser, url, options);
  await run.waitFor([...REST], FIRST);
  // The rest frame's task, and any font swap's refit, finish before anything is read.
  await pause(300);
  return run;
}

/**
 * A point inside each 2D ghost plank, CSS px, `margin` units clear of its edges and of the hull's
 * outline, and 3 px clear of the numbers and the leader: where its fill reads alone.
 */
function plankPoints(page: Page, margin = 3) {
  return page.evaluate(
    ({ drawing, margin }) => {
      const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
      const hull = svg?.querySelector<SVGPathElement>("clipPath path");
      const leader = svg?.querySelector<SVGPathElement>(".ln-leader");
      const m = svg?.getScreenCTM();
      if (!svg || !hull || !m) return [];
      const numbers = [
        ...document.querySelectorAll(`${drawing} .plan-plank`),
      ].map((n) => n.getBoundingClientRect());
      const css = (x: number, y: number) => ({
        x: m.a * x + m.e,
        y: m.d * y + m.f,
      });
      const ring = [
        [0, 0],
        [-margin, 0],
        [margin, 0],
        [0, -margin],
        [0, margin],
      ] as const;
      return [...svg.querySelectorAll<SVGPathElement>("[data-plank]")].map(
        (plank) => {
          const b = plank.getBBox();
          const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
          let best: { x: number; y: number; d: number } | null = null;
          for (let x = b.x; x <= b.x + b.width; x += 1)
            for (let y = b.y; y <= b.y + b.height; y += 0.5) {
              const d = Math.hypot(x - cx, y - cy);
              if (best && d >= best.d) continue;
              const inside = ring.every(([dx, dy]) => {
                const p = new DOMPoint(x + dx, y + dy);
                return (
                  plank.isPointInFill(p) &&
                  hull.isPointInFill(p) &&
                  !leader?.isPointInStroke(p)
                );
              });
              if (!inside) continue;
              const c = css(x, y);
              if (
                numbers.some(
                  (r) =>
                    c.x > r.left - 3 &&
                    c.x < r.right + 3 &&
                    c.y > r.top - 3 &&
                    c.y < r.bottom + 3,
                )
              )
                continue;
              best = { x, y, d };
            }
          return {
            id: plank.getAttribute("data-plank") ?? "",
            at: best ? css(best.x, best.y) : null,
          };
        },
      );
    },
    { drawing: DRAWING, margin },
  );
}

/** `[data-ghost] .ln-outline` alone, filled: the 2D hull's silhouette, as B3.1 reads `/`'s. */
async function outlineAlone(page: Page, clip: Box) {
  const handle = await page.addStyleTag({
    content: `html, body, body * { visibility: hidden !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
${DRAWING} .ln-outline { visibility: visible !important; fill: #000 !important; stroke: #000 !important; opacity: 1 !important; }`,
  });
  const png = await page.screenshot({ clip, omitBackground: true });
  await handle.evaluate((style) => (style as Element).remove());
  const image = decodePng(png);
  return { image, alpha: coverage(image) };
}

type Shot = {
  width: number;
  height: number;
  dpr: number;
  scheme: "light" | "dark";
};

/** One registration of frame 1 on the refused page's ghost, with the planks' fills at both. */
async function register(
  browser: Browser,
  url: string,
  shot: Shot,
  atRest?: (run: ModelRun) => Promise<void>,
) {
  const off = await openOn(browser, url, { ...shot, refuse: true });
  const offBox = await ghostBox(off.page);
  expect(offBox, `[data-ghost] with WebGL refused, ${url}`).not.toBeNull();
  const clip = whole(offBox as Box);
  const svg = await outlineAlone(off.page, clip);
  const points = await plankPoints(off.page);
  const offView = await off.page.screenshot();
  await off.close();

  const on = await openOn(browser, url, { ...shot, clock: true });
  const first = await on.until(SHOWN, 4, FIRST);
  expect(first, `frame 1 is landed on the clock, ${url}`).toBe("landed");
  expect(
    await ghostBox(on.page),
    `[data-ghost]'s box with the model, ${url}`,
  ).toEqual(offBox);
  const model = await canvasAlone(on.page, clip);
  const onView = await on.page.screenshot();
  if (atRest) {
    // To rest by Calm, which settles the move at once: on the clock a whole move is ~110 frames of
    // SwiftShader, where real time ends it still after 6.
    await press(on.page, "Calm");
    await on.until([...REST], 4, 10_000);
    await on.step(300);
    await atRest(on);
  }
  const errors = [...on.errors];
  await on.close();

  const [a, b] = [decodePng(offView), decodePng(onView)];
  const [w, h] = [model.image.width, model.image.height];
  const distance = hausdorff(
    edges(svg.alpha, w, h),
    edges(model.alpha, w, h),
    w,
    h,
  );
  const fills = points.map(({ id, at }) => {
    if (!at) return { id, delta: Number.NaN };
    const [x, y] = [at.x * shot.dpr, at.y * shot.dpr];
    const [p, q] = [pixel(a, x, y), pixel(b, x, y)];
    return {
      id,
      delta: Math.max(
        ...[0, 1, 2].map((c) => Math.abs((p[c] ?? 0) - (q[c] ?? 0))),
      ),
    };
  });
  return {
    max: distance.max / shot.dpr,
    covered: [distance.a, distance.b],
    fills,
    planks: points.length,
    errors,
  };
}

/**
 * B5.18's fit on a page at rest: where the layer mounts, one canvas, a whole buffer at the cap on
 * [data-ghost]'s box, and the settled hull inside it.
 */
async function fitAt(
  run: ModelRun,
  where: string,
  width: number,
  dpr: number,
  url: string,
  testInfo: TestInfo,
) {
  const ratio = capAt(width, dpr);
  const placed = await run.page.evaluate(
    ({ drawing, model }) => {
      const ghost = document.querySelector(drawing);
      return {
        next: ghost?.nextElementSibling?.matches(model) ?? false,
        inMain: Boolean(ghost?.closest("main")),
        models: document.querySelectorAll(model).length,
      };
    },
    { drawing: DRAWING, model: MODEL },
  );
  expect
    .soft(
      placed,
      `[data-model] is the element right after [data-ghost] in main, ${where}`,
    )
    .toEqual({ next: true, inMain: true, models: 1 });
  expect(await run.page.locator(CANVAS).count(), `one canvas, ${where}`).toBe(
    1,
  );
  const fit = await ghostFit(run.page);
  const [bw = 0, bh = 0] = fit.buffer ?? [];
  const [cw = 0, ch = 0] = fit.css ?? [];
  const [gw = 0, gh = 0] = fit.ghost ?? [];
  note(
    testInfo,
    "canvas",
    `${where}: buffer ${bw} x ${bh}, CSS ${cw} x ${ch}, [data-ghost] ${gw} x ${gh}, ratio ${ratio}`,
  );
  expect
    .soft(
      Number.isInteger(bw) && Number.isInteger(bh),
      `whole buffer, ${where}`,
    )
    .toBe(true);
  expect
    .soft(
      [Math.abs(cw * ratio - bw), Math.abs(ch * ratio - bh)].every(
        (d) => d <= LAYOUT * ratio + 1e-3,
      ),
      `the canvas's CSS size x ${ratio} equals its buffer (${cw} x ${ch} against ${bw} x ${bh}), ${where}`,
    )
    .toBe(true);
  expect
    .soft(
      Math.max(Math.abs(cw - gw), Math.abs(ch - gh)),
      `the canvas's CSS size against [data-ghost]'s box (px), ${where}`,
    )
    .toBeLessThanOrEqual(1 / ratio + 1e-3);
  expect
    .soft(
      Math.max(
        Math.abs((fit.at?.[0] ?? 0) - (fit.ghostAt?.[0] ?? -99)),
        Math.abs((fit.at?.[1] ?? 0) - (fit.ghostAt?.[1] ?? -99)),
      ),
      `the canvas's corner on [data-ghost]'s (px), ${where}`,
    )
    .toBeLessThanOrEqual(1 / ratio + 1e-3);
  const box = await canvasBox(run.page);
  if (box) {
    const shot = await canvasAlone(run.page, whole(box));
    const [w, h] = [shot.image.width, shot.image.height];
    expect
      .soft(
        extent(shot.alpha, w, h).width,
        `the settled hull covers pixels, ${where}`,
      )
      .toBeGreaterThan(0);
    expect
      .soft(
        onEdge(shot.alpha, w, h),
        `settled pixels covered 50% or more on the canvas's edge rows and columns, ${where}`,
      )
      .toBe(0);
    if (width === 1440 && dpr === 1)
      await attach(testInfo, `settled ${url} 1440.png`, shot.image);
  }
  expect.soft(run.errors, `console errors at rest, ${where}`).toEqual([]);
}

for (const url of PAGES) {
  test(`B5.18 It stands on the Log, on ${url}: [data-model] follows [data-ghost] and comes to rest; frame 1 is registered on the 2D ghost within B3.1's bound (1.0 CSS px at DPR 2, 1.5 at DPR 1) with its planks' fills the Off page's within 8 levels; the canvas lies on the ghost's box in whole buffer pixels at 320, 390, 768, 1024 and 1440, and the settled hull is inside it; /read and the 404 have no [data-model] and request no WebGL context`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(900_000);
    // Frame 1 on the 2D ghost: registration and fills, at DPR 1 and 2 in light, DPR 1 in dark.
    for (const size of SIZES)
      for (const [dpr, scheme] of [
        [1, "light"],
        [2, "light"],
        [1, "dark"],
      ] as const) {
        const shot = { ...size, dpr, scheme };
        const name = `${url} at ${size.width} x ${size.height}, DPR ${dpr}, ${scheme}`;
        const r = await register(
          browser,
          url,
          shot,
          scheme === "light"
            ? (run) =>
                fitAt(run, `${name}, at rest`, size.width, dpr, url, testInfo)
            : undefined,
        );
        const bound = dpr === 2 ? 1.0 : 1.5;
        note(
          testInfo,
          "registration",
          `${name}: Hausdorff ${r.max.toFixed(2)} CSS px against ${bound}; fills' largest channel difference ${Math.max(...r.fills.map((f) => f.delta))} over ${r.planks} planks. ${SWIFTSHADER}.`,
        );
        expect
          .soft(r.covered[0], `the 2D ghost's silhouette has pixels, ${name}`)
          .toBeGreaterThan(0);
        expect
          .soft(r.covered[1], `frame 1's silhouette has pixels, ${name}`)
          .toBeGreaterThan(0);
        expect
          .soft(
            r.max,
            `frame 1's outline on the 2D ghost's (Hausdorff, CSS px), ${name}`,
          )
          .toBeLessThanOrEqual(bound);
        expect
          .soft(r.planks, `ghost planks sampled, ${name}`)
          .toBe(SEATS.length);
        expect
          .soft(
            r.fills
              .filter((f) => !(f.delta <= 8))
              .map((f) => `${f.id}: ${f.delta}`),
            `planks whose frame-1 fill differs from the Off page's by more than 8 levels, ${name}`,
          )
          .toEqual([]);
        expect.soft(r.errors, `console errors, ${name}`).toEqual([]);
      }

    // The canvas on the ghost's box in whole buffer pixels, and the settled hull inside it; at
    // 1440 x 900 and 390 x 844 on the registration's pages, brought to rest by Calm.
    for (const [width, height] of [
      [320, 568],
      [768, 1024],
      [1024, 768],
    ] as const)
      for (const dpr of [1, 2]) {
        const where = `${url} at ${width} x ${height}, DPR ${dpr}`;
        const run = await settledOn(browser, url, { width, height, dpr });
        await fitAt(run, where, width, dpr, url, testInfo);
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
        await run.close();
      }

    // No model off the Log.
    if (url === PAGES[0]) {
      for (const [route, status] of [
        ["/read", 200],
        ["/no-such-page", 404],
      ] as const) {
        const run = await openModel(browser, {});
        const response = await run.page.goto(route);
        expect(response?.status(), `status of ${route}`).toBe(status);
        await pause(IDLE);
        expect
          .soft(
            await run.page.locator(MODEL).count(),
            `[data-model] on ${route}`,
          )
          .toBe(0);
        expect
          .soft(
            await run.requests(),
            `WebGL or WebGPU context requests on ${route}`,
          )
          .toEqual([]);
        await run.close();
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// B5.19

/** Whether two boxes come within `gap` px of each other. */
const near = (a: Box, b: Box, gap: number) =>
  Math.max(
    b.x - (a.x + a.width),
    a.x - (b.x + b.width),
    b.y - (a.y + a.height),
    a.y - (b.y + b.height),
  ) <
  gap - 0.01;

/**
 * B5.19's numbers at rest on a settled page at `width`: GHOST, each on its plank with a transform,
 * at least 10 px, no pointer events, 2 px clear, 4.5:1 on what it sits on, 600 (the record's 700);
 * hidden below 768.
 */
async function numbersAt(
  page: Page,
  where: string,
  width: number,
  record: boolean,
  expected: string[],
  testInfo: TestInfo,
) {
  const numbers = await ghostNumbers(page);
  if (width < NUMBERS_FROM) {
    expect
      .soft(
        numbers.filter((n) => n.shown).map((n) => n.text),
        `numbers shown below 768 px, ${where}`,
      )
      .toEqual([]);
    return;
  }
  const shown = numbers.filter((n) => n.shown);
  expect
    .soft(
      shown.map((n) => n.text).sort(),
      `the numbers shown at rest, against GHOST, ${where}`,
    )
    .toEqual(expected);
  expect
    .soft(
      shown
        .filter((n) => !/^matrix|^translate/.test(n.transform))
        .map((n) => `${n.text} ${n.transform}`),
      `numbers at rest without a transform onto their planks, ${where}`,
    )
    .toEqual([]);
  expect
    .soft(
      shown.filter((n) => n.size < 10 - 0.01).map((n) => `${n.text} ${n.size}`),
      `numbers under 10 px, ${where}`,
    )
    .toEqual([]);
  expect
    .soft(
      shown.filter((n) => n.pointer !== "none").map((n) => n.text),
      `numbers that take pointer events, ${where}`,
    )
    .toEqual([]);
  const clashes: string[] = [];
  for (const [i, a] of shown.entries())
    for (const b of shown.slice(i + 1))
      if (near(a.box, b.box, 2)) clashes.push(`${a.text}/${b.text}`);
  expect
    .soft(clashes, `number pairs within 2 px of each other, ${where}`)
    .toEqual([]);
  // On its plank: each number's centre is on the settled hull, but a led-out number's, which
  // sits at its leader's end (5.0's, and 3.0's from 768 by Iris's decision).
  const led = await ledOutSeats(page);
  note(testInfo, "led out", `${where}: seats ${led.join(", ")}`);
  const canvasBox = await page.evaluate((c) => {
    const r = document.querySelector(c)?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  }, CANVAS);
  const image = await bareView(page);
  if (canvasBox) {
    const clip = whole(canvasBox);
    const alone = await canvasAlone(page, clip);
    const leftOff = shown
      .filter((n) => !led.includes(SEAT_BY_NUMBER.get(Number(n.text)) ?? ""))
      .filter((n) => {
        const c = centreOf(n.box);
        const v =
          alone.alpha[
            Math.round(c.y - clip.y) * alone.image.width +
              Math.round(c.x - clip.x)
          ] ?? 0;
        return v < 0.5;
      })
      .map((n) => n.text);
    expect
      .soft(leftOff, `numbers whose centre is off the settled hull, ${where}`)
      .toEqual([]);
  }
  const faint: string[] = [];
  for (const n of shown) {
    const ink = await rgbOf(page, n.color);
    const ground = medianIn(image, n.box);
    const ratio = contrast(
      ink as [number, number, number],
      ground as [number, number, number],
    );
    if (ratio < 4.5) faint.push(`${n.text} ${ratio.toFixed(2)}:1`);
  }
  expect
    .soft(faint, `numbers under 4.5:1 on what they sit on, ${where}`)
    .toEqual([]);
  const weights = shown.map((n) => `${n.text} ${n.weight}`).sort();
  expect
    .soft(
      weights,
      `the numbers' weights: 600, ${record ? `and ${MARKED}'s 700` : "every one"}, ${where}`,
    )
    .toEqual(
      shown
        .map(
          (n) => `${n.text} ${record && n.text === String(MARKED) ? 700 : 600}`,
        )
        .sort(),
    );
  if (record) {
    expect
      .soft(
        shown.filter((n) => n.current).map((n) => n.text),
        `the record's number, ${where}`,
      )
      .toEqual([String(MARKED)]);
  }
}

for (const url of PAGES) {
  test(`B5.19 Vellum, numbered by the 2D rule, nothing copper, on ${url}: settled, each plank sampled clear of its lines and number reads Iris's band (light OKLab L 0.85 to 0.935 and under the film's; dark 0.42 to 0.50 and at most --card's + 0.005; a and b within 0.01 of --vellum's); the 22 number spans at rest read GHOST, each on its plank with a transform, at least 10 px from 768, 4.5:1 on what it sits on and 2 px clear of every other at 768, 1024, 1280 and 1440, hidden below 768; no canvas pixel within ΔE 10 of --accent at frame 1, mid-move, settled, hovered or on the record's mark; on /log/13 one seat marked, sprint 13's, its number 700`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(900_000);
    const record = url !== PAGES[0];
    const expected = Object.values(GHOST).map(String).sort();

    // The bands, settled, in both schemes, at 1440 and 390: one scan per size (the pose is the
    // same in both schemes), read in light and again after a switch to dark. On a record, the same
    // scan places the mark: the canvas against /log's at that size.
    for (const size of SIZES) {
      const at = `${url} at ${size.width} x ${size.height}`;
      let plain: Image | null = null;
      if (record) {
        const log = await settledOn(browser, PAGES[0], size);
        await log.page.mouse.move(1, 1);
        await pause(200);
        plain = (
          await canvasAlone(log.page, whole((await canvasBox(log.page)) as Box))
        ).image;
        await log.close();
      }
      const run = await settledOn(browser, url, size);
      const scan = await scanSeats(run, stepAt(size.width));
      expect
        .soft(
          SEATS.filter((s) => !scan.points.has(s)),
          `seats a mouse scan found no point on, ${at}`,
        )
        .toEqual([]);
      const box = whole((await canvasBox(run.page)) as Box);
      // Each plank's own vellum, from the canvas's coverage (geometry, the same in both schemes).
      const lit = await canvasAlone(run.page, box);
      const vellumCells = plankCells(
        scan.grid,
        lit.alpha,
        box,
        stepAt(size.width),
      );
      for (const scheme of ["light", "dark"] as const) {
        const where = `${at}, ${scheme}`;
        await run.page.emulateMedia({ colorScheme: scheme });
        await pause(600);
        const image = await bareView(run.page);
        const [vellum, film, card] = [
          oklab(await token(run.page, "--vellum")),
          oklab(await token(run.page, "--background")),
          oklab(await token(run.page, "--card")),
        ];
        const off: string[] = [];
        const reads: string[] = [];
        for (const seat of SEATS) {
          const sample = vellumCells.get(seat);
          if (!sample) {
            off.push(`${seat}: no cell of the scan on the canvas's coverage`);
            continue;
          }
          const p = sample.cells[0] ?? [0, 0];
          const lab = oklab(medianAt(image, sample.cells));
          reads.push(
            `${seat} L ${lab.L.toFixed(3)} (${sample.cells.length} ${sample.method} cells)`,
          );
          const why = [
            scheme === "light"
              ? lab.L >= 0.85 && lab.L <= 0.935 && lab.L < film.L
                ? ""
                : `L ${lab.L.toFixed(3)} outside 0.85 to 0.935 or not under the film's ${film.L.toFixed(3)}`
              : lab.L >= 0.42 && lab.L <= 0.5 && lab.L <= card.L + 0.005
                ? ""
                : `L ${lab.L.toFixed(3)} outside 0.42 to 0.50 or over --card's ${card.L.toFixed(3)} + 0.005`,
            Math.abs(lab.a - vellum.a) <= 0.01
              ? ""
              : `a ${lab.a.toFixed(4)} against ${vellum.a.toFixed(4)}`,
            Math.abs(lab.b - vellum.b) <= 0.01
              ? ""
              : `b ${lab.b.toFixed(4)} against ${vellum.b.toFixed(4)}`,
          ].filter(Boolean);
          if (why.length)
            off.push(
              `${seat} (${sample.method} cells from (${p[0]}, ${p[1]})): ${why.join("; ")}`,
            );
        }
        note(testInfo, "vellum", `${where}: ${reads.join(", ")}`);
        expect.soft(off, `planks outside Iris's band, ${where}`).toEqual([]);

        // Nothing copper: settled (on a record, its mark), and hovered.
        const accent = await token(run.page, "--accent");
        const ground = await token(run.page, "--background");
        const settled = await canvasAlone(run.page, box);
        expect
          .soft(
            copper(settled.image, accent, ground),
            `canvas pixels within ΔE 10 of --accent, settled${record ? ", the record's mark showing" : ""}, ${where}`,
          )
          .toBe(0);
        const hovered = scan.points.get(SEATS[0] ?? "");
        if (hovered) {
          await run.page.mouse.move(hovered.x, hovered.y);
          await pause(300);
          const shot = await canvasAlone(run.page, box);
          expect
            .soft(
              copper(shot.image, accent, ground),
              `canvas pixels within ΔE 10 of --accent, hovered, ${where}`,
            )
            .toBe(0);
          await run.page.mouse.move(1, 1);
          await pause(300);
        }
        if (plain && scheme === "light") {
          // One seat marked: what the record's canvas changes from /log's is on its seat alone.
          const seat = markedSeat(MARKED);
          const own = scan.grid.filter(([, , s]) => s === seat);
          const w = Math.min(plain.width, settled.image.width);
          const h = Math.min(plain.height, settled.image.height);
          expect
            .soft(
              [settled.image.width, settled.image.height],
              `the canvas's size against /log's, ${where}`,
            )
            .toEqual([plain.width, plain.height]);
          const d = channelDelta(
            crop(plain, 0, 0, w, h),
            crop(settled.image, 0, 0, w, h),
          );
          const reach = stepAt(size.width) + 4;
          let changed = 0;
          let stray = 0;
          const strays: [number, number][] = [];
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              if ((d[y * w + x] ?? 0) <= 24) continue;
              changed++;
              const [px, py] = [box.x + x, box.y + y];
              if (
                !own.some(
                  ([gx, gy]) =>
                    Math.abs(gx - px) <= reach && Math.abs(gy - py) <= reach,
                )
              ) {
                stray++;
                strays.push([px, py]);
              }
            }
          // The grid is coarser than a plank where it tapers (6 px at 1440), so a pixel the grid
          // puts away from the seat is checked by hover: the mark's edges lie on the plank's own
          // boundary, so a hover within 3 px of an edge pixel reads the seat, searched at 1 px steps
          // (a plank tapers to 1 px). Up to 80 places.
          const places = [
            ...new Map(
              strays.map(([x, y]) => [
                `${Math.round(x / 2)},${Math.round(y / 2)}`,
                [x, y] as [number, number],
              ]),
            ).values(),
          ];
          const onEdge = new Set<string>();
          for (const [x, y] of places.slice(0, 80)) {
            let found = false;
            for (const dy of [0, -1, 1, -2, 2, -3, 3]) {
              for (const dx of [0, -1, 1, -2, 2, -3, 3]) {
                await run.page.mouse.move(x + 0.5 + dx, y + 0.5 + dy);
                await twoFrames(run.page);
                if ((await pickOf(run.page)) === seat) found = true;
                if (found) break;
              }
              if (found) break;
            }
            if (found) onEdge.add(`${Math.round(x / 2)},${Math.round(y / 2)}`);
          }
          await run.page.mouse.move(1, 1);
          await pause(300);
          const away = strays.filter(
            ([x, y]) =>
              !onEdge.has(`${Math.round(x / 2)},${Math.round(y / 2)}`),
          );
          stray = away.length;
          const xs = away.map(([x]) => x);
          const ys = away.map(([, y]) => y);
          // Where the strays lie, and which seat a hover reads nearest each, for whoever fixes it.
          const nearest = [
            ...new Set(
              away.map(([x, y]) => {
                let best: [number, string] = [Number.POSITIVE_INFINITY, "none"];
                for (const [gx, gy, s] of scan.grid) {
                  const dist = Math.hypot(gx - x, gy - y);
                  if (dist < best[0]) best = [dist, s];
                }
                return best[1];
              }),
            ),
          ];
          note(
            testInfo,
            "mark",
            `${where}: ${changed} canvas pixels differ from /log's by more than 24 levels, ${stray} of them away from seat ${seat}${stray ? ` (x ${Math.min(...xs)} to ${Math.max(...xs)}, y ${Math.min(...ys)} to ${Math.max(...ys)}; nearest seats ${nearest.join(", ")})` : ""}`,
          );
          expect
            .soft(changed, `canvas pixels the record's mark changes, ${where}`)
            .toBeGreaterThan(0);
          expect
            .soft(
              stray,
              `pixels the record's canvas changes away from seat ${seat} (sprint ${MARKED}'s), ${where}`,
            )
            .toBe(0);
        }
      }
      for (const scheme of ["light", "dark"] as const) {
        await run.page.emulateMedia({ colorScheme: scheme });
        await pause(600);
        await numbersAt(
          run.page,
          `${at}, ${scheme}`,
          size.width,
          record,
          expected,
          testInfo,
        );
      }
      expect.soft(run.errors, `console errors, ${at}`).toEqual([]);
      await run.close();
    }
    // The numbers at rest at 768, 1024 and 1280 (at 1440 and 390 on the band pages above), one
    // page per width, the scheme switched in place (sprint 33, decision 12).
    for (const [width, height] of [
      [768, 1024],
      [1024, 768],
      [1280, 800],
    ] as const) {
      const run = await settledOn(browser, url, { width, height });
      for (const scheme of width === 1024
        ? (["light", "dark"] as const)
        : (["light"] as const)) {
        await run.page.emulateMedia({ colorScheme: scheme });
        await pause(600);
        await numbersAt(
          run.page,
          `${url} at ${width} x ${height}, ${scheme}`,
          width,
          record,
          expected,
          testInfo,
        );
      }
      await run.close();
    }

    // Nothing copper at frame 1 and mid-move, on the clock: light from the load, then dark in the
    // move replayed by Calm then Full after the switch (one page per size; decision 12).
    for (const size of SIZES) {
      const run = await openOn(browser, url, { ...size, clock: true });
      for (const scheme of ["light", "dark"] as const) {
        const where = `${url} at ${size.width} x ${size.height}, ${scheme}`;
        if (scheme === "dark") {
          await run.page.emulateMedia({ colorScheme: "dark" });
          await press(run.page, "Calm");
          await run.step(100);
          await press(run.page, "Full");
        }
        expect(await run.until(SHOWN, 4, FIRST), `frame 1, ${where}`).toBe(
          "landed",
        );
        const accent = await token(run.page, "--accent");
        const ground = await token(run.page, "--background");
        const clip = whole((await ghostBox(run.page)) as Box);
        const frame1 = await canvasAlone(run.page, clip);
        expect
          .soft(
            copper(frame1.image, accent, ground),
            `canvas pixels within ΔE 10 of --accent at frame 1, ${where}`,
          )
          .toBe(0);
        const before = (await run.states()).length;
        await run.until(["lofting"], 4, 20_000);
        const t0 =
          (await run.states()).slice(before).find((s) => s.state === "lofting")
            ?.t ??
          (await run.states()).findLast((s) => s.state === "lofting")?.t ??
          0;
        // Mid-move: where the eased progress is half way (the move's colour is half lit there).
        await runTo(run, t0 + uFor(0.5) * MOVE);
        const mid = await canvasAlone(run.page, clip);
        expect
          .soft(
            copper(mid.image, accent, ground),
            `canvas pixels within ΔE 10 of --accent mid-move, ${where}`,
          )
          .toBe(0);
        // A key settles it, for the replay.
        await run.page.keyboard.press("Tab");
        await pause(150);
        await run.step(100);
      }
      await run.close();
    }
  });
}

// ---------------------------------------------------------------------------------------------
// B5.20

/** The u at which the loft's ease reaches e: bisection on ease(), which is monotonic. */
function uFor(e: number) {
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < e) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The states and moving frames on this document, for "opens settled with no moving frame". */
async function opensSettled(run: ModelRun, label: string) {
  await run.waitFor([...REST], FIRST);
  await pause(300);
  const since = await sinceMark(run.page);
  expect.soft(await run.state(), `${label} opens settled`).toBe("settled");
  expect
    .soft(
      since.states.filter((s) => s === "landed" || s === "lofting"),
      `landed or lofting states after ${label}`,
    )
    .toEqual([]);
  expect
    .soft(
      since.frames.filter((s) => s === "landed" || s === "lofting").length,
      `frames drawn landed or lofting after ${label}`,
    )
    .toBe(0);
}

for (const url of PAGES) {
  test(`B5.20 Full: one camera move, once a visit, on ${url}: moving frames from frame 1, then settled after 1.8 s +/- one frame on the clock, and at 1440 the framed length within 1% of the drawing's at e = 0, 0.4 and 1; a reload, a record opened by a pick and Back each open settled with no moving frame, and a new tab plays the move again; a key, a click, a wheel, a tap and a scroll each settle it within 2 frames and open no record; Full pressed from Calm or from Off replays it from frame 1`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(900_000);
    // Each input during the move settles it within 2 frames, and opens nothing.
    type Input = {
      name: string;
      touch?: boolean;
      act: (run: ModelRun) => Promise<void>;
    };
    const middle = async (run: ModelRun) =>
      centreOf((await ghostBox(run.page)) as Box);
    const inputs: Input[] = [
      { name: "a key (Tab)", act: (run) => run.page.keyboard.press("Tab") },
      {
        name: "a click on the hull",
        act: async (run) => {
          const at = await middle(run);
          await run.page.mouse.click(at.x, at.y);
        },
      },
      {
        name: "a wheel over the hull",
        act: async (run) => {
          const at = await middle(run);
          await run.page.mouse.move(at.x, at.y);
          await run.page.mouse.wheel(0, 120);
        },
      },
      {
        name: "a tap on the hull",
        touch: true,
        act: async (run) => {
          const at = await middle(run);
          await run.page.touchscreen.tap(at.x, at.y);
        },
      },
      {
        name: "a scroll",
        act: (run) => run.page.evaluate(() => scrollTo(0, 60)),
      },
    ];
    // After the first move, on the same page: each input lands in the move replayed by Calm then
    // Full, and each replay is itself the check that Full pressed from Calm replays the move from
    // frame 1; the page ends with Off then Full. The page has touch, so the tap needs no page of its
    // own (sprint 33, decision 12: 14 pages a page became 2).
    const inputsOn = async (run: ModelRun, at: string) => {
      const replay = async (from: "Calm" | "Off") => {
        const where = `Full pressed from ${from}, ${at}`;
        await run.page.evaluate(() => {
          scrollTo(0, 0);
          (document.activeElement as HTMLElement | null)?.blur();
        });
        await press(run.page, from);
        await run.step(from === "Off" ? 500 : 100);
        const before = (await run.states()).length;
        const drawn = (await run.frames()).length;
        await press(run.page, "Full");
        await run.until(["lofting"], 4, FIRST);
        const after = (await run.states()).slice(before).map((s) => s.state);
        expect.soft(after[0], `the first state after ${where}`).toBe("landed");
        expect.soft(after, `the states after ${where}`).toContain("lofting");
        // From frame 1: the first frame drawn after the press is the landed one.
        expect
          .soft(
            (await run.frames())[drawn]?.state,
            `the first frame drawn after ${where}`,
          )
          .toBe("landed");
      };
      for (const input of inputs) {
        const where = `${input.name} during the move, ${at}`;
        await replay("Calm");
        const pages = run.context.pages().length;
        await input.act(run);
        await pause(150);
        await run.step(TWO_FRAMES);
        expect
          .soft(await run.state(), `${where} sets settled within 2 frames`)
          .toBe("settled");
        await run.step(500);
        await pause(300);
        expect
          .soft(new URL(run.page.url()).pathname, `the page after ${where}`)
          .toBe(url);
        expect
          .soft(run.context.pages().length, `pages open after ${where}`)
          .toBe(pages);
      }
      // Full from Off: the move again from frame 1; a key ends it settled (a whole move on the
      // clock is ~110 SwiftShader frames, and the first move already ran to the duration).
      await replay("Off");
      await run.page.keyboard.press("Tab");
      await pause(150);
      await run.step(TWO_FRAMES);
      expect
        .soft(
          await run.state(),
          `a key during the move after Full pressed from Off settles it, ${at}`,
        )
        .toBe("settled");
    };

    // The move, on the clock.
    for (const size of SIZES) {
      const where = `${url} at ${size.width} x ${size.height}`;
      const run = await openOn(browser, url, {
        ...size,
        touch: true,
        clock: true,
      });
      expect(
        await run.until(SHOWN, 4, FIRST),
        `frame 1 is landed, ${where}`,
      ).toBe("landed");
      const clip = whole((await ghostBox(run.page)) as Box);
      const hull = await hullBox(run.page);
      const ghost = await ghostBox(run.page);
      const length = hull?.width ?? drawnLength(ghost?.width ?? 0);
      const framed = async () => {
        const shot = await canvasAlone(run.page, clip);
        return extent(shot.alpha, shot.image.width, shot.image.height).width;
      };
      const rows: string[] = [];
      const lengths: [number, number][] = [[0, await framed()]];
      await run.until(["lofting"], 4, 20_000);
      const t0 =
        (await run.states()).find((s) => s.state === "lofting")?.t ??
        Number.NaN;
      expect(t0, `the first lofting frame's time, ${where}`).not.toBeNaN();
      expect
        .soft(
          (await ghostDrawing(run.page)).svg,
          `the 2D svg shows at the first lofting frame, ${where}`,
        )
        .toBe(false);
      const u = uFor(0.4);
      await runTo(run, t0 + u * MOVE);
      lengths.push([0.4, await framed()]);
      await runTo(run, t0 + MOVE - FRAME);
      await run.until([...REST], 4, 10_000);
      lengths.push([1, await framed()]);
      const states = await run.states();
      const settledAt =
        states.find((s) => s.state === "settled")?.t ?? Number.NaN;
      const moving = (await run.frames()).filter(
        (f) => f.state === "landed" || f.state === "lofting",
      );
      expect
        .soft(moving.length, `frames drawn landed or lofting, ${where}`)
        .toBeGreaterThan(1);
      expect
        .soft(await run.state(), `data-state after the move, ${where}`)
        .toBe("settled");
      expect
        .soft(
          Math.abs(settledAt - t0 - MOVE),
          `ms from the first moving frame to settled, against ${MOVE} +/- one frame, ${where}`,
        )
        .toBeLessThanOrEqual(FRAME + 0.5);
      for (const [e, w] of lengths)
        rows.push(`e ${e}: ${w} px against ${length.toFixed(1)}`);
      note(
        testInfo,
        "move",
        `${where}: ${rows.join("; ")}; settled ${(settledAt - t0).toFixed(1)} ms after the first lofting frame. ${SWIFTSHADER}.`,
      );
      if (size.width === 1440) {
        for (const [e, w] of lengths)
          expect
            .soft(
              Math.abs(w / length - 1),
              `the framed length at e = ${e} (${w} px) against the drawing's ${length.toFixed(1)} px, ${where}`,
            )
            .toBeLessThanOrEqual(0.01);
      }
      await inputsOn(run, where);
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }

    // Once a visit, in real time.
    for (const size of SIZES) {
      const where = `${url} at ${size.width} x ${size.height}`;
      const visit = await openOn(browser, url, size);
      await visit.waitFor([...REST], FIRST);
      expect
        .soft(
          (await visit.states()).map((s) => s.state),
          `the first visit plays the move, ${where}`,
        )
        .toContain("lofting");
      await visit.page.reload();
      await visit.page.evaluate(() => document.fonts.ready);
      await opensSettled(visit, `a reload, ${where}`);
      // A record opened by a pick, then Back.
      const plank = await aPlank(visit);
      expect(plank, `a point on a plank, ${where}`).not.toBeNull();
      if (plank) {
        const n = GHOST[plank.seat] ?? Number.NaN;
        await markVisit(visit.page);
        await visit.page.mouse.click(plank.x, plank.y);
        await landedOn(visit.page, n);
        await opensSettled(
          visit,
          `the record a pick opened (/log/${n}), ${where}`,
        );
        await markVisit(visit.page);
        await visit.page.goBack();
        await visit.page.waitForURL((u) => u.pathname === url);
        await opensSettled(visit, `Back to ${url}, ${where}`);
      }
      const tab = await visit.context.newPage();
      await tab.goto(url);
      const end = Date.now() + FIRST;
      let seen: string[] = [];
      while (Date.now() < end && !seen.some((s) => REST.includes(s))) {
        seen = await tab.evaluate(
          () =>
            (
              window as Window & { __states?: { state: string }[] }
            ).__states?.map((s) => s.state) ?? [],
        );
        await pause(100);
      }
      expect
        .soft(seen, `a new tab plays the move again, ${where}`)
        .toContain("lofting");
      expect
        .soft(visit.errors, `console errors over the visit, ${where}`)
        .toEqual([]);
      await visit.close();
    }
  });
}

// ---------------------------------------------------------------------------------------------
// B5.21

/** Every transition's run and end in the page, with its property, target and timestamp. */
function recordTransitions() {
  const w = window as Window & {
    __transitions?: {
      type: string;
      end: number;
      property: string;
      target: string;
      t: number;
    }[];
  };
  const list: {
    type: string;
    end: number;
    property: string;
    target: string;
    t: number;
  }[] = [];
  w.__transitions = list;
  for (const type of ["transitionrun", "transitionend", "transitioncancel"])
    addEventListener(
      type,
      (event) => {
        const e = event as TransitionEvent;
        const el = e.target as Element | null;
        // The transition's own end, delay and duration included, as the page declared it: a busy
        // main thread (SwiftShader building the scene) delivers transitionend late.
        const own =
          type === "transitionrun"
            ? (el?.getAnimations?.() ?? []).find(
                (a) =>
                  (a as Animation & { transitionProperty?: string })
                    .transitionProperty === e.propertyName,
              )
            : undefined;
        list.push({
          type,
          end: Number(own?.effect?.getComputedTiming().endTime ?? Number.NaN),
          property: e.propertyName,
          target: `<${el?.tagName?.toLowerCase()}${el?.className && typeof el.className === "string" ? ` .${el.className.split(" ")[0]}` : ""}>${el?.closest?.("[data-model], [data-ghost]") ? " in the ghost" : ""}`,
          t: e.timeStamp,
        });
      },
      true,
    );
}

for (const url of PAGES) {
  test(`B5.21 Calm and reduced motion, on ${url}: with Calm stored, or reduce on with nothing stored, no landed or moving state is ever set; at rest 0 frames over 2 s and 1 on a scheme switch; Calm pressed mid-move settles within 2 frames and stores calm; under reduce the fade's transitions are opacity only and all end within 300 ms`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(600_000);
    for (const size of SIZES) {
      for (const [label, options] of [
        ["Calm stored", { stored: "calm" }],
        ["reduce with nothing stored", { reducedMotion: "reduce" }],
      ] as const) {
        const where = `${label}, ${url} at ${size.width} x ${size.height}`;
        const run = await openModel(browser, { ...size, ...options });
        await run.context.addInitScript(recordTransitions);
        await run.goto(url);
        await run.waitFor([...REST], FIRST);
        await pause(600);
        const states = (await run.states()).map((s) => s.state);
        expect.soft(states, `the states, ${where}`).toContain("settled");
        expect
          .soft(
            states.filter((s) => s === "landed" || s === "lofting"),
            `landed or lofting states, ${where}`,
          )
          .toEqual([]);
        // At rest: 0 frames over 2 s, with the pointer kept off the hull; 1 on a scheme switch.
        await run.page.mouse.move(2, 2);
        const before = (await run.frames()).length;
        await pause(2000);
        expect
          .soft(
            (await run.frames()).length - before,
            `frames drawn over 2 s at rest, ${where}`,
          )
          .toBe(0);
        const scheme = (await run.page.evaluate(
          () => matchMedia("(prefers-color-scheme: dark)").matches,
        ))
          ? "light"
          : "dark";
        const atSwitch = (await run.frames()).length;
        await run.page.emulateMedia({ colorScheme: scheme });
        await pause(1000);
        expect
          .soft(
            (await run.frames()).length - atSwitch,
            `frames drawn on a switch to ${scheme}, ${where}`,
          )
          .toBe(1);
        if ("reducedMotion" in options) {
          const list = await run.page.evaluate(
            () =>
              (
                window as Window & {
                  __transitions?: {
                    type: string;
                    end: number;
                    property: string;
                    target: string;
                    t: number;
                  }[];
                }
              ).__transitions ?? [],
          );
          const runs = list.filter((t) => t.type === "transitionrun");
          note(
            testInfo,
            "fade",
            `${where}: ${list.map((t) => `${t.type} ${t.property} on ${t.target} at ${t.t.toFixed(0)}`).join("; ") || "none"}`,
          );
          expect
            .soft(
              runs.length,
              `transitions run under reduce (the 240 ms fade), ${where}`,
            )
            .toBeGreaterThan(0);
          expect
            .soft(
              runs
                .filter((t) => t.property !== "opacity")
                .map((t) => `${t.property} on ${t.target}`),
              `transitions of anything but opacity, ${where}`,
            )
            .toEqual([]);
          const late = runs.filter((r) => !(r.end <= 300));
          expect
            .soft(
              late.map(
                (t) => `${t.property} on ${t.target}: ends at ${t.end} ms`,
              ),
              `transitions that don't end within 300 ms of their start, as declared, ${where}`,
            )
            .toEqual([]);
        }
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
        await run.close();
      }

      // Calm pressed mid-move.
      const where = `Calm pressed mid-move, ${url} at ${size.width} x ${size.height}`;
      const run = await openOn(browser, url, { ...size, clock: true });
      expect(await run.until(SHOWN, 4, FIRST), `frame 1, ${where}`).toBe(
        "landed",
      );
      await run.until(["lofting"], 4, 20_000);
      await press(run.page, "Calm");
      await pause(150);
      await run.step(TWO_FRAMES);
      expect
        .soft(await run.state(), `${where}: settled within 2 frames`)
        .toBe("settled");
      expect
        .soft(
          await run.page.evaluate(() => localStorage.getItem("theseus:motion")),
          `the mode stored, ${where}`,
        )
        .toBe("calm");
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }
  });
}
