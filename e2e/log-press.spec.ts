import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  canvasAlone,
  canvasBox,
  DRAWING,
  offHull,
  onEdge,
  pickOf,
  rgbOf,
} from "./ghost";
import { contrast } from "./helpers";
import { LOG, RECORD, recordOf, YARD_WORDS } from "./log";
import {
  type Box,
  FIRST,
  FRAME,
  note,
  pause,
  REST,
  SHOWN,
  TRIANGLES_AT,
  whole,
} from "./model";
import {
  coverage,
  decodePng,
  edges,
  hausdorff,
  type Image,
  pixel,
} from "./pixels";
import {
  NEWEST_STEP,
  neighbours,
  PLANK_IDS,
  QUESTION_STEP,
  SEAT_OF,
  STEPS,
  stepIndex,
} from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";
import {
  changed,
  framesOver,
  goalOf,
  LIVE,
  landedOn,
  linkAt,
  type PressRead,
  readPress,
  readSafe,
  readWords,
  sameLiveNode,
  sameSize,
  shoot,
  sum,
  THESEUS,
  tagDocument,
} from "./yard";

// Sprint 55, Yc: the press in 3D (.crew/sprint/55/contract.md, Y12 to Y18). On /log and /log/n, in
// Full and Calm, the Theseus (`[data-theseus]`) joins the ghost (`[data-ghost]`) in the one canvas
// (`[data-ghost] + [data-model] canvas`), and a press of a step link (or ← and →) moves one plank.
// The hooks are the builders' (Pixel's and Forge's messages to Probe, sprint 55):
// - on `[data-model]`, `data-press="<seat>"` while a press moves a plank and `data-press-kind`
//   ("fly" or "fade") beside it, both gone once it has landed;
// - `[data-yard-live]`, the polite live region, empty in the server HTML;
// - B3's `data-state`, `data-pick` and the harness's frame recorder (e2e/webgl.ts).
// Every motion is held on Playwright's clock, as B3 and B5 hold the loft: the cloud steps the ratio
// down under load and ends a real-time move `still` (STATE.md). The checks read pixels of the canvas
// alone (S4's method), at DPR 1 unless a registration bound needs DPR 2. B = the settled canvas
// before a press, R = a fresh Calm load of the step pressed to, D = where B and R differ: the change
// a press must make, and Calm must make nowhere else. Every GPU number is SwiftShader's floor.

const GHOST_HULL = DRAWING;
const CANVAS_SEL = "[data-model] canvas";
/** The site's fade, ms: Calm's press (the contract, "The outcome"). */
const FADE = 240;
/** Pixel's flight is at most 1.2 s from go to landed; a press not landed within 3 s of clock fails. */
const LANDS_BY = 3000;
/**
 * Y13 to Y15's bounds, tuned on Pixel's first flight (sprint 55, 87fce76 at 0504e60, SwiftShader)
 * against P, the seat's 2D plank area, and D, where B and R differ. Measured: 13 to 14 at 1440
 * (P 5,626) changes at most 1.15 P outside D in a frame and |B - R| + 0.18 P in all; at 390 (P 890)
 * 1.2 P and under |B - R|; 40 to 41 at 1440 (P 6,449) 0.71 P and |B - R| + 0.75 P. Every landed
 * canvas matched R to the pixel (0 of 371,700 and 66,946).
 */
/** It flies: some frame changes at least this many plank areas outside D (measured 0.71 to 1.2). */
const FLIES = 0.25;
/** One plank: no frame changes more than this many plank areas outside D (a second doubles it). */
const ONE_PLANK_AWAY = 1.75;
/** Not a hull: no frame changes more than |B - R| plus this many plank areas, plus 0.2%. */
const ONE_PLANK_TOTAL = 1.5;
/** The step's canvas: at most this share of pixels off R by more than 8 levels (measured 0). */
const OFF_R = 0.0001;
/** One animation frame on the clock: "within one frame". */
const ONE_FRAME = Math.ceil(FRAME);
/** A pixel changed: any channel, alpha included, more than 8 levels (B5.18's fills). */
const LEVELS = 8;
/** The pixel-ratio cap at a width (sprint 26): 1.5 below 768 px, 2 from it. */
const capAt = (width: number, dpr: number) =>
  Math.min(dpr, width < 768 ? 1.5 : 2);
const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/**
 * The 3D chunk's gzip -9 bytes on main before Yc (803bea5, the same 3D code as main at 4a02757),
 * read by Y18 itself there: the delta Y18 reports is against it.
 */
const MAIN_CHUNK = 154_971;

type Size = { width: number; height: number };
const DESKTOP: Size = { width: 1440, height: 900 };
const PHONE: Size = { width: 390, height: 844 };

// ---------------------------------------------------------------------------------------------
// Readers

/** The canvas's box, grown to whole CSS px. */
async function canvasClip(page: Page) {
  const b = await canvasBox(page);
  expect(b, `${CANVAS_SEL}'s box`).not.toBeNull();
  return whole(b as Box);
}

/** A press of a step link with the mouse at its centre, as a visitor clicks it. */
async function clickStep(page: Page, kind: "previous" | "next") {
  const at = await linkAt(page, kind);
  expect(at, `a shown a[data-step="${kind}"] on ${page.url()}`).not.toBeNull();
  await page.mouse.click(at?.x ?? 0, at?.y ?? 0);
}

/**
 * A plank's 2D area in CSS px², from the Theseus's drawing (every seat is drawn there): the
 * plank's fill sampled on a grid of its box. Both drawings share one size, so it is the ghost's too.
 */
function plankArea(page: Page, seat: string) {
  return page.evaluate(
    ({ drawing, seat }) => {
      const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
      const plank = svg?.querySelector<SVGPathElement>(
        `path[data-plank="${seat}"]`,
      );
      const m = svg?.getScreenCTM();
      if (!plank || !m) return Number.NaN;
      const b = plank.getBBox();
      const step = Math.max(b.width, b.height) / 240;
      let n = 0;
      for (let x = b.x + step / 2; x < b.x + b.width; x += step)
        for (let y = b.y + step / 2; y < b.y + b.height; y += step)
          if (plank.isPointInFill(new DOMPoint(x, y))) n++;
      return n * step * step * Math.abs(m.a * m.d);
    },
    { drawing: THESEUS, seat },
  );
}

/** The tab hidden or shown, as a page sees it (B5.23's setHidden). */
function setHidden(page: Page, hidden: boolean) {
  return page.evaluate((value) => {
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

// ---------------------------------------------------------------------------------------------
// Pixels

/** A mask grown (or, with `erode`, shrunk) by r px, a square at a time: max (min) by rows, then columns. */
function morph(m: Uint8Array, w: number, h: number, r: number, erode = false) {
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = erode ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const [u, t] = horizontal ? [x + d, y] : [x, y + d];
          const s =
            u < 0 || t < 0 || u >= w || t >= h ? 0 : (src[t * w + u] ?? 0);
          v = erode ? Math.min(v, s) : Math.max(v, s);
        }
        out[y * w + x] = v;
      }
    return out;
  };
  return pass(pass(m, true), false);
}

/** Pixels set in `m` and not in `mask`. */
const outside = (m: Uint8Array, mask: Uint8Array) =>
  m.reduce((s, v, i) => s + (v && !mask[i] ? 1 : 0), 0);

/**
 * A shot partway between B and R: of the pixels where B and R differ by more than 32 levels in
 * some channel, the share where the shot is more than 8 levels from both in that channel.
 */
function between(shot: Image, b: Image, r: Image) {
  let strong = 0;
  let mid = 0;
  for (let i = 0; i < b.width * b.height; i++) {
    let c = -1;
    let best = 32;
    for (let k = 0; k < 4; k++) {
      const d = Math.abs((b.data[i * 4 + k] ?? 0) - (r.data[i * 4 + k] ?? 0));
      if (d > best) {
        best = d;
        c = k;
      }
    }
    if (c < 0) continue;
    strong++;
    const s = shot.data[i * 4 + c] ?? 0;
    if (
      Math.abs(s - (b.data[i * 4 + c] ?? 0)) > LEVELS &&
      Math.abs(s - (r.data[i * 4 + c] ?? 0)) > LEVELS
    )
      mid++;
  }
  return strong ? mid / strong : 0;
}

// ---------------------------------------------------------------------------------------------
// Pages

/** A fresh Calm load of `url` at rest: the step's settled canvas (R), with its clip. */
async function settledCanvas(browser: Browser, url: string, size: Size) {
  const run = await openModel(browser, { ...size, stored: "calm" });
  await run.goto(url);
  await run.waitFor([...REST], FIRST);
  await run.page.mouse.move(2, 2);
  await pause(400);
  const clip = await canvasClip(run.page);
  const image = await shoot(run.page, clip);
  const errors = [...run.errors];
  await run.close();
  return { image, clip, errors };
}

/**
 * `url` on the clock, at rest: in Full the loft is landed by a key, as B5.20's inputs land it; in
 * Calm it opens settled. Then the clock runs a second for the neighbours' prefetch, the pointer is
 * off the canvas and focus is on main.
 */
async function atRestOnClock(
  browser: Browser,
  url: string,
  options: ModelOptions,
) {
  const run = await openModel(browser, { ...options, clock: true });
  await run.goto(url);
  const first = await run.until([...SHOWN], 4, FIRST);
  if (first === "landed" || first === "lofting") {
    await run.page.keyboard.press("Tab");
    await pause(150);
    await run.step(2 * ONE_FRAME);
  }
  expect(await run.state(), `${url} at rest on the clock`).toBe("settled");
  await run.page.mouse.move(2, 2);
  await run.page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  });
  await run.step(1000);
  await pause(500);
  await tagDocument(run.page);
  return run;
}

type Flight = {
  /** The page is the one pressed on: the press was no document navigation. */
  sameDocument: boolean;
  started: boolean;
  landed: boolean;
  seats: string[];
  kinds: string[];
  /** Frames drawn from the press to the landing, with their clock times. */
  frames: { t: number; draws: number; triangles: number }[];
  /** Clock ms from the first frame drawn to the landing. */
  took: number;
  shots: { t: number; image: Image }[];
  /** The live region's text at each step while the press was moving. */
  liveWhileMoving: string[];
  reads: PressRead[];
};

/**
 * Runs `act` (a press), then steps the clock a frame at a time until the press has landed
 * (data-press gone, the URL the target's) or LANDS_BY passes. While it moves, the canvas alone over
 * `clip` is shot every `every` steps (0: never). The fetch of the step's words runs in real time,
 * so until the press starts the loop waits in real time too.
 */
async function pressOn(
  run: ModelRun,
  target: string,
  act: () => Promise<unknown>,
  { clip, every = 0 }: { clip?: Box; every?: number } = {},
): Promise<Flight> {
  const before = await readSafe(run.page);
  await act();
  const seats = new Set<string>();
  const kinds = new Set<string>();
  const shots: Flight["shots"] = [];
  const liveWhileMoving: string[] = [];
  const reads: PressRead[] = [];
  let started = false;
  let landed = false;
  let sameDocument = true;
  let t0 = Number.NaN;
  let steps = 0;
  const realEnd = Date.now() + 90_000;
  for (;;) {
    const now = await readSafe(run.page);
    reads.push(now);
    if (now.doc === null) {
      sameDocument = false;
      break;
    }
    if (now.press) {
      seats.add(now.press);
      kinds.add(now.kind ?? "(no data-press-kind)");
      liveWhileMoving.push(now.live ?? "(no live region)");
    }
    if (!started && (now.press || now.frames > before.frames)) {
      started = true;
      t0 = now.t;
    }
    if (
      now.path === target &&
      !now.press &&
      (started || now.path !== before.path)
    ) {
      landed = true;
      break;
    }
    if (started && now.t - t0 > LANDS_BY) break;
    if (Date.now() > realEnd) break;
    if (started && clip && every && steps % every === 0 && now.press)
      shots.push({ t: now.t - t0, image: await shoot(run.page, clip) });
    await run.step(ONE_FRAME);
    if (started) steps++;
    else await pause(25);
  }
  const all = sameDocument ? await run.frames() : [];
  const frames = all.slice(before.frames).map((f) => ({
    t: f.t,
    draws: f.draws,
    triangles: f.triangles,
  }));
  const last = reads.at(-1);
  return {
    sameDocument,
    started,
    landed,
    seats: [...seats],
    kinds: [...kinds],
    frames,
    took: last && started ? last.t - t0 : Number.NaN,
    shots,
    liveWhileMoving,
    reads,
  };
}

/** The flight's story for a note: what it saw and how long it took. */
const told = (f: Flight) =>
  `same document ${f.sameDocument}, started ${f.started}, landed ${f.landed} after ${f.took.toFixed(0)} ms of clock, seats ${JSON.stringify(f.seats)}, kinds ${JSON.stringify(f.kinds)}, ${f.frames.length} frames, ${f.shots.length} shots`;

// ---------------------------------------------------------------------------------------------
// Y12

/** A drawing's 2D silhouette as the 3D draws it: its planks filled and its outline stroked (B5.18). */
async function silhouette(page: Page, drawing: string, clip: Box) {
  const handle = await page.addStyleTag({
    content: `html, body, body * { visibility: hidden !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
${drawing} svg clipPath, ${drawing} svg clipPath * { visibility: visible !important; }
${drawing} .ln-outline { visibility: visible !important; fill: none !important; stroke: #000 !important; opacity: 1 !important; }
${drawing} path[data-plank] { visibility: visible !important; fill: #000 !important; fill-opacity: 1 !important; stroke: #000 !important; opacity: 1 !important; }`,
  });
  const png = await page.screenshot({ clip, omitBackground: true });
  await handle.evaluate((style) => (style as Element).remove());
  const image = decodePng(png);
  return { image, alpha: coverage(image).map((a) => Math.round(a * 4) / 4) };
}

/**
 * A point inside each plank of a drawing, CSS px, 3 units clear of its edges and of the hull's
 * outline, and 3 px clear of the numbers and the leader (B5.18's plankPoints, for either drawing).
 */
function plankPoints(page: Page, drawing: string) {
  return page.evaluate((drawing) => {
    const margin = 3;
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
  }, drawing);
}

/** A drawing's box, CSS px. */
function boxOf(page: Page, selector: string) {
  return page.evaluate((css) => {
    const r = document.querySelector(css)?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  }, selector);
}

const Y12_PAGES = [...new Set([13, QUESTION_STEP ?? 23, 40])].map(recordOf);
const Y12_SHOTS = [
  { ...DESKTOP, dpr: 2, bound: 1.0 },
  { ...PHONE, dpr: 1, bound: 1.5 },
] as const;

for (const url of Y12_PAGES) {
  test(`Y12 Two hulls, one canvas, on ${url}: in Full, frame 1 registers the Theseus on [data-theseus] and the ghost on [data-ghost] within B3.1's bound (1.0 CSS px at DPR 2 at 1440 x 900, 1.5 at DPR 1 at 390 x 844), each plank's frame-1 fill within 8 levels of the WebGL-refused page's on both drawings; in Calm, whose frame 1 is the settled frame, one canvas holds both drawings' boxes in whole buffer pixels at the cap, nothing on its edge, and each drawing's box holds at least half its 2D silhouette in settled pixels; one canvas on the page, no console errors`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    for (const shot of Y12_SHOTS) {
      const size = `${shot.width} x ${shot.height}, DPR ${shot.dpr}`;
      // The WebGL-refused page: each drawing's box, silhouette and plank points, and the view.
      const off = await openModel(browser, { ...shot, refuse: true });
      await off.goto(url);
      await pause(500);
      const drawings: {
        name: string;
        selector: string;
        box: Box;
        clip: Box;
        alpha: Float32Array;
        points: Awaited<ReturnType<typeof plankPoints>>;
      }[] = [];
      for (const [name, selector] of [
        ["the Theseus", THESEUS],
        ["the ghost", GHOST_HULL],
      ] as const) {
        const b = await boxOf(off.page, selector);
        expect(
          b,
          `${selector} with WebGL refused, ${url} at ${size}`,
        ).not.toBeNull();
        const clip = whole(b as Box);
        const sil = await silhouette(off.page, selector, clip);
        drawings.push({
          name,
          selector,
          box: b as Box,
          clip,
          alpha: sil.alpha,
          points: await plankPoints(off.page, selector),
        });
      }
      const offView = decodePng(await off.page.screenshot());
      await off.close();

      // Full on the clock, frame 1.
      const full = await openModel(browser, { ...shot, clock: true });
      await full.goto(url);
      const first = await full.until([...SHOWN], 4, FIRST);
      expect(first, `frame 1 is landed on the clock, ${url} at ${size}`).toBe(
        "landed",
      );
      expect
        .soft(
          await full.page.evaluate(
            () => document.querySelectorAll("canvas").length,
          ),
          `canvases on the page at frame 1, ${url} at ${size}`,
        )
        .toBe(1);
      const onView = decodePng(await full.page.screenshot());
      for (const d of drawings) {
        const where = `${d.name} on ${url} at ${size}, frame 1`;
        expect
          .soft(
            await boxOf(full.page, d.selector),
            `${d.selector}'s box with the model, ${where}`,
          )
          .toEqual(d.box);
        const model = await canvasAlone(full.page, d.clip);
        const [w, h] = [model.image.width, model.image.height];
        const distance = hausdorff(
          edges(d.alpha, w, h),
          edges(model.alpha, w, h),
          w,
          h,
        );
        const max = distance.max / shot.dpr;
        const fills = d.points.map(({ id, at }) => {
          if (!at) return `${id}: no clear point`;
          const [x, y] = [at.x * shot.dpr, at.y * shot.dpr];
          const [p, q] = [pixel(offView, x, y), pixel(onView, x, y)];
          const delta = Math.max(
            ...[0, 1, 2].map((c) => Math.abs((p[c] ?? 0) - (q[c] ?? 0))),
          );
          return delta <= LEVELS ? null : `${id}: ${delta}`;
        });
        note(
          testInfo,
          "registration",
          `${where}: Hausdorff ${max.toFixed(2)} CSS px against ${shot.bound}; silhouette pixels 2D ${distance.a}, canvas ${distance.b}; ${d.points.length} planks sampled. ${SWIFTSHADER}.`,
        );
        expect
          .soft(distance.a, `the 2D silhouette has pixels, ${where}`)
          .toBeGreaterThan(0);
        expect
          .soft(
            distance.b,
            `the canvas draws a hull over the drawing's box, ${where}`,
          )
          .toBeGreaterThan(0);
        expect
          .soft(
            max,
            `frame 1's outline on the 2D drawing's (Hausdorff, CSS px), ${where}`,
          )
          .toBeLessThanOrEqual(shot.bound);
        expect
          .soft(
            fills.filter((f) => f !== null),
            `planks whose frame-1 fill differs from the refused page's by more than 8 levels, ${where}`,
          )
          .toEqual([]);
      }
      expect
        .soft(full.errors, `console errors, Full, ${url} at ${size}`)
        .toEqual([]);
      await full.close();

      // Calm: the settled frame is frame 1; the fit.
      const calm = await openModel(browser, { ...shot, stored: "calm" });
      await calm.goto(url);
      await calm.waitFor([...REST], FIRST);
      await calm.page.mouse.move(2, 2);
      await pause(400);
      const where = `${url} at ${size}, Calm at rest`;
      const ratio = capAt(shot.width, shot.dpr);
      const fit = await calm.page.evaluate((css) => {
        const canvas = document.querySelector<HTMLCanvasElement>(css);
        const r = canvas?.getBoundingClientRect();
        return {
          canvases: document.querySelectorAll("canvas").length,
          buffer: canvas ? [canvas.width, canvas.height] : [0, 0],
          box: r
            ? { x: r.left, y: r.top, width: r.width, height: r.height }
            : null,
        };
      }, CANVAS_SEL);
      expect.soft(fit.canvases, `canvases on the page, ${where}`).toBe(1);
      expect(fit.box, `${CANVAS_SEL}, ${where}`).not.toBeNull();
      const c = fit.box as Box;
      const [bw = 0, bh = 0] = fit.buffer;
      const slack = 1 / ratio + 1e-3;
      note(
        testInfo,
        "canvas",
        `${where}: canvas ${c.x},${c.y} ${c.width} x ${c.height}, buffer ${bw} x ${bh}, ratio ${ratio}; ${drawings.map((d) => `${d.selector} ${d.box.x},${d.box.y} ${d.box.width} x ${d.box.height}`).join("; ")}`,
      );
      expect
        .soft(
          Number.isInteger(bw) &&
            Number.isInteger(bh) &&
            Math.abs(c.width * ratio - bw) <= ratio / 64 + 1e-3 &&
            Math.abs(c.height * ratio - bh) <= ratio / 64 + 1e-3,
          `whole buffer pixels at the cap: CSS ${c.width} x ${c.height} x ${ratio} against ${bw} x ${bh}, ${where}`,
        )
        .toBe(true);
      for (const d of drawings) {
        expect
          .soft(
            c.x <= d.box.x + slack &&
              c.y <= d.box.y + slack &&
              c.x + c.width >= d.box.x + d.box.width - slack &&
              c.y + c.height >= d.box.y + d.box.height - slack,
            `the canvas holds ${d.selector}'s box, ${where}`,
          )
          .toBe(true);
      }
      const settled = await canvasAlone(calm.page, whole(c));
      expect
        .soft(
          onEdge(settled.alpha, settled.image.width, settled.image.height),
          `settled pixels covered 50% or more on the canvas's edge rows and columns, ${where}`,
        )
        .toBe(0);
      for (const d of drawings) {
        const inBox = await canvasAlone(calm.page, d.clip);
        const drawn = inBox.alpha.reduce((s, a) => s + (a >= 0.5 ? 1 : 0), 0);
        const flat = d.alpha.reduce((s, a) => s + (a >= 0.5 ? 1 : 0), 0);
        note(
          testInfo,
          "settled",
          `${d.name}, ${where}: ${drawn} settled pixels in its box against ${flat} of its 2D silhouette`,
        );
        expect
          .soft(
            drawn,
            `settled pixels in ${d.selector}'s box, against half its 2D silhouette's ${flat}, ${where}`,
          )
          .toBeGreaterThanOrEqual(flat / 2);
      }
      expect.soft(calm.errors, `console errors, ${where}`).toEqual([]);
      await calm.close();
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Y13

const Y13_PRESSES = [
  { from: 13, size: DESKTOP },
  { from: 13, size: PHONE },
  { from: 40, size: DESKTOP },
] as const;

for (const { from, size } of Y13_PRESSES) {
  const to = neighbours(from).next ?? Number.NaN;
  const seat = SEAT_OF.get(to) ?? "(no seat)";
  // Steps 1 to 23 (k up to 22): the original that leaves lands on the ghost's seat.
  const original = stepIndex(to) <= PLANK_IDS.length;
  test(`Y13 Full flies one plank, /log/${from} to /log/${to} at ${size.width} x ${size.height}: a press of Next stays on the page, sets data-press "${seat}" of kind fly, draws 3 frames or more and lands within 3 s of clock; at some frame it changes a quarter of seat ${seat}'s plank area or more outside D (where B and R differ, grown 3 px), at no frame more than 1.75 plank areas outside D, nor more than |B - R| plus 1.5 plank areas plus 0.2% of the canvas in all; once landed the canvas is R's (at most 0.01% of pixels off by 8 levels) and 0 frames are drawn over 2 s${original ? `, and a hover inside the ghost's change picks seat ${seat}` : ""}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const url = recordOf(from);
    const target = recordOf(to);
    const where = `${url} to ${target} at ${size.width} x ${size.height}, Full`;
    const ref = await settledCanvas(browser, target, size);
    const run = await atRestOnClock(browser, url, size);
    const clip = await canvasClip(run.page);
    const b = await shoot(run.page, clip);
    expect(sameSize(b, ref.image), `B and R are one size, ${where}`).toBe(true);
    const area = await plankArea(run.page, seat);
    const n = b.width * b.height;

    const flight = await pressOn(
      run,
      target,
      () => clickStep(run.page, "next"),
      {
        clip,
        every: 3,
      },
    );
    note(testInfo, "flight", `${where}: ${told(flight)}. ${SWIFTSHADER}.`);
    expect(
      flight.sameDocument,
      `the press stays on the page (no document navigation), ${where}`,
    ).toBe(true);
    expect(
      flight.landed,
      `the press lands on ${target} within ${LANDS_BY} ms of clock, ${where}`,
    ).toBe(true);
    expect
      .soft(flight.seats, `data-press while it moves, ${where}`)
      .toEqual([seat]);
    expect
      .soft(flight.kinds, `data-press-kind while it moves, ${where}`)
      .toEqual(["fly"]);
    expect
      .soft(
        flight.frames.length,
        `frames drawn from the press to the landing, ${where}`,
      )
      .toBeGreaterThanOrEqual(3);

    // One plank, and it flies.
    const end = changed(b, ref.image);
    const grown = morph(end, b.width, b.height, 3);
    const base = sum(end);
    const cap = base + ONE_PLANK_TOTAL * area + 0.002 * n;
    const away = ONE_PLANK_AWAY * area;
    const reads = flight.shots.map(({ t, image }) => {
      const m = changed(b, image);
      return { t, total: sum(m), away: outside(m, grown) };
    });
    note(
      testInfo,
      "one plank",
      `${where}: seat ${seat}'s 2D plank ${area.toFixed(0)} px²; |B - R| ${base} px; per shot (clock ms: changed, outside D): ${reads.map((r) => `${r.t.toFixed(0)}: ${r.total}, ${r.away}`).join("; ") || "none"}`,
    );
    expect(
      flight.shots.length,
      `shots while it moves, ${where}`,
    ).toBeGreaterThan(0);
    expect
      .soft(
        Math.max(0, ...reads.map((r) => r.away)),
        `the most pixels a frame changes outside D, against a quarter of the plank (${(FLIES * area).toFixed(0)}): it flies, ${where}`,
      )
      .toBeGreaterThanOrEqual(FLIES * area);
    expect
      .soft(
        reads
          .filter((r) => r.away > away)
          .map((r) => `${r.t.toFixed(0)} ms: ${r.away}`),
        `frames changing more than one plank outside D (${away.toFixed(0)} px, ${ONE_PLANK_AWAY} plank areas), ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        reads
          .filter((r) => r.total > cap)
          .map((r) => `${r.t.toFixed(0)} ms: ${r.total}`),
        `frames changing more than |B - R| and one plank's worth (${cap.toFixed(0)} px), ${where}`,
      )
      .toEqual([]);

    // Landed: R's canvas, and still.
    await run.page.mouse.move(2, 2);
    const idle = await framesOver(run, 2000);
    expect
      .soft(idle, `frames drawn over 2 s of clock once landed, ${where}`)
      .toBe(0);
    const after = await shoot(run.page, clip);
    const off = sum(changed(after, ref.image));
    note(
      testInfo,
      "landed",
      `${where}: ${off} of ${n} pixels differ from R by more than 8 levels`,
    );
    expect
      .soft(off, `pixels off R's canvas once landed, ${where}`)
      .toBeLessThanOrEqual(OFF_R * n);

    if (original) {
      // The ghost's seat: the change's interior, below the Theseus's box, picks the seat.
      const ghost = await boxOf(run.page, GHOST_HULL);
      const top = (ghost?.y ?? 0) - clip.y;
      const core = morph(end, b.width, b.height, 2, true);
      const points: [number, number][] = [];
      for (let y = Math.max(0, Math.floor(top)); y < b.height; y++)
        for (let x = 0; x < b.width; x++)
          if (core[y * b.width + x]) points.push([x, y]);
      const [cx, cy] = [
        points.reduce((s, [x]) => s + x, 0) / (points.length || 1),
        points.reduce((s, [, y]) => s + y, 0) / (points.length || 1),
      ];
      points.sort(
        (p, q) =>
          Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy),
      );
      const picks: string[] = [];
      for (const [x, y] of points.slice(0, 8)) {
        await run.page.mouse.move(clip.x + x + 0.5, clip.y + y + 0.5);
        await pause(100);
        await run.step(2 * ONE_FRAME);
        picks.push((await pickOf(run.page)) ?? "none");
        if (picks.at(-1) === seat) break;
      }
      await run.page.mouse.move(2, 2);
      expect
        .soft(
          points.length,
          `the ghost's changed pixels, eroded 2 px, ${where}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(picks, `data-pick inside the ghost's change, ${where}`)
        .toContain(seat);
    }
    expect
      .soft([...ref.errors, ...run.errors], `console errors, ${where}`)
      .toEqual([]);
    await run.close();
  });
}

// ---------------------------------------------------------------------------------------------
// Y14

const Y14_RUNS: { label: string; options: ModelOptions; size: Size }[] = [
  { label: "Calm stored", options: { stored: "calm" }, size: DESKTOP },
  {
    label: "reduced motion, nothing stored",
    options: { reducedMotion: "reduce" },
    size: PHONE,
  },
];

for (const { label, options, size } of Y14_RUNS) {
  test(`Y14 ${label} never flies, /log/13 to /log/14 at ${size.width} x ${size.height}: a press of Next sets data-press-kind fade only; no frame changes more than specks (8 px or 2% of the plank) outside D, where B and R differ grown 2 px; the frames drawn are 3 or more, all within ${FADE} ms plus a frame, one partway between B and R; once landed the canvas is R's and 0 frames are drawn over 2 s`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const [from, to] = [13, neighbours(13).next ?? 14];
    const [url, target] = [recordOf(from), recordOf(to)];
    const seat = SEAT_OF.get(to) ?? "(no seat)";
    const where = `${url} to ${target} at ${size.width} x ${size.height}, ${label}`;
    const ref = await settledCanvas(browser, target, size);
    const run = await atRestOnClock(browser, url, { ...size, ...options });
    const clip = await canvasClip(run.page);
    const b = await shoot(run.page, clip);
    expect(sameSize(b, ref.image), `B and R are one size, ${where}`).toBe(true);
    const area = await plankArea(run.page, seat);
    const flight = await pressOn(
      run,
      target,
      () => clickStep(run.page, "next"),
      {
        clip,
        every: 1,
      },
    );
    note(testInfo, "fade", `${where}: ${told(flight)}. ${SWIFTSHADER}.`);
    expect(
      flight.sameDocument,
      `the press stays on the page (no document navigation), ${where}`,
    ).toBe(true);
    expect(flight.landed, `the press lands on ${target}, ${where}`).toBe(true);
    expect
      .soft(flight.kinds, `data-press-kind while it moves, ${where}`)
      .toEqual(["fade"]);
    const times = flight.frames.map((f) => f.t);
    const span = times.length ? Math.max(...times) - Math.min(...times) : 0;
    expect
      .soft(flight.frames.length, `frames drawn by the press, ${where}`)
      .toBeGreaterThanOrEqual(3);
    expect
      .soft(
        span,
        `ms of clock from the press's first frame to its last, ${where}`,
      )
      .toBeLessThanOrEqual(FADE + FRAME);

    const grown = morph(changed(b, ref.image), b.width, b.height, 2);
    const specks = Math.max(8, 0.02 * area);
    const reads = flight.shots.map(({ t, image }) => ({
      t,
      away: outside(changed(b, image), grown),
      mid: between(image, b, ref.image),
    }));
    note(
      testInfo,
      "in place",
      `${where}: per shot (clock ms: changed outside D, share partway): ${reads.map((r) => `${r.t.toFixed(0)}: ${r.away}, ${r.mid.toFixed(2)}`).join("; ") || "none"}`,
    );
    expect(
      flight.shots.length,
      `shots while it fades, ${where}`,
    ).toBeGreaterThan(0);
    expect
      .soft(
        reads
          .filter((r) => r.away > specks)
          .map((r) => `${r.t.toFixed(0)} ms: ${r.away} px`),
        `frames that change pixels outside D (a plank left its seat's box), ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        Math.max(0, ...reads.map((r) => r.mid)),
        `the most of D's strong change a frame shows partway between B and R: a fade, not a cut, ${where}`,
      )
      .toBeGreaterThanOrEqual(0.25);

    await run.page.mouse.move(2, 2);
    expect
      .soft(
        await framesOver(run, 2000),
        `frames drawn over 2 s of clock once landed, ${where}`,
      )
      .toBe(0);
    const after = await shoot(run.page, clip);
    expect
      .soft(
        sum(changed(after, ref.image)),
        `pixels off R's canvas once landed, ${where}`,
      )
      .toBeLessThanOrEqual(OFF_R * b.width * b.height);
    expect
      .soft([...ref.errors, ...run.errors], `console errors, ${where}`)
      .toEqual([]);
    await run.close();
  });
}

// ---------------------------------------------------------------------------------------------
// Y15

test("Y15 Any input lands the plank, at 1440 x 900 in Full: during a flight from /log/13 to 14, back to 13 and on to 14, a key (Tab), a mouse press on the canvas off the hull and a scroll each land it within one frame (data-press gone, the URL the step's, at most 1 frame drawn), then 0 frames over 1 s, the canvas the step's fresh Calm load's (at most 0.01% of pixels off by 8 levels), no record opened; B on /log/13 is its Calm load's too", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const size = DESKTOP;
  const [a, z] = [13, neighbours(13).next ?? 14];
  const refs = new Map<number, Image>();
  const errors: string[] = [];
  for (const n of [a, z]) {
    const ref = await settledCanvas(browser, recordOf(n), size);
    refs.set(n, ref.image);
    errors.push(...ref.errors);
  }
  const run = await atRestOnClock(browser, recordOf(a), size);
  const clipAt = () => canvasClip(run.page);
  const b = await shoot(run.page, await clipAt());
  const n = b.width * b.height;
  // The harness's own readout: a Full page landed by a key is the Calm load's canvas.
  const own = sum(changed(b, refs.get(a) as Image));
  note(
    testInfo,
    "harness",
    `B on /log/${a} against its Calm load: ${own} of ${n} pixels off by 8 levels`,
  );
  expect
    .soft(own, `B against /log/${a}'s Calm load, pixels off`)
    .toBeLessThanOrEqual(OFF_R * n);

  const inputs: {
    name: string;
    kind: "next" | "previous";
    to: number;
    act: () => Promise<unknown>;
  }[] = [
    {
      name: "a key (Tab)",
      kind: "next",
      to: z,
      act: () => run.page.keyboard.press("Tab"),
    },
    {
      name: "a mouse press on the canvas, 3 px inside its corner",
      kind: "previous",
      to: a,
      act: async () => {
        const at = await offHull(run.page);
        await run.page.mouse.move(at.x, at.y);
        await run.page.mouse.down();
        await run.page.mouse.up();
      },
    },
    {
      name: "a scroll",
      kind: "next",
      to: z,
      act: () => run.page.evaluate(() => scrollTo(0, 60)),
    },
  ];
  for (const input of inputs) {
    const target = recordOf(input.to);
    const where = `${input.name} during a flight to ${target}`;
    await run.page.evaluate(() => scrollTo(0, 0));
    await run.page.mouse.move(2, 2);
    const pages = run.context.pages().length;
    // Into the flight: the press, then frames until four are drawn while data-press holds.
    const before = await readSafe(run.page);
    await clickStep(run.page, input.kind);
    let now = await readSafe(run.page);
    const realEnd = Date.now() + 30_000;
    while (
      now.doc !== null &&
      !(now.press && now.frames - before.frames >= 4) &&
      now.path !== target &&
      Date.now() < realEnd
    ) {
      await run.step(ONE_FRAME);
      if (!now.press) await pause(25);
      now = await readSafe(run.page);
    }
    expect(now.doc, `the press stays on the page, ${where}`).not.toBeNull();
    expect(
      now.press !== null && now.path !== target,
      `a plank in flight before the input (data-press ${now.press}, at ${now.path}), ${where}`,
    ).toBe(true);
    // The input, delivered in real time with the clock held, then one frame.
    await input.act();
    await pause(150);
    const atInput = (await readPress(run.page)).frames;
    await run.step(ONE_FRAME);
    const one = await readPress(run.page);
    expect
      .soft(
        { press: one.press, path: one.path },
        `one frame after ${where}: data-press gone and the URL the step's`,
      )
      .toEqual({ press: null, path: target });
    expect
      .soft(one.frames - atInput, `frames drawn in that frame, ${where}`)
      .toBeLessThanOrEqual(1);
    await run.page.mouse.move(2, 2);
    expect
      .soft(
        await framesOver(run, 1000),
        `frames over 1 s of clock after it landed, ${where}`,
      )
      .toBe(0);
    const after = await shoot(run.page, await clipAt());
    const ref = refs.get(input.to) as Image;
    expect(
      sameSize(after, ref),
      `the shot and ${target}'s Calm load are one size, ${where}`,
    ).toBe(true);
    const off = sum(changed(after, ref));
    note(
      testInfo,
      "landed",
      `${where}: ${off} of ${n} pixels off ${target}'s Calm load`,
    );
    expect
      .soft(off, `pixels off ${target}'s settled canvas, ${where}`)
      .toBeLessThanOrEqual(OFF_R * n);
    expect
      .soft(run.context.pages().length, `pages open after ${where}`)
      .toBe(pages);
    expect
      .soft(new URL(run.page.url()).pathname, `the page after ${where}`)
      .toBe(target);
  }
  expect.soft([...errors, ...run.errors], "console errors").toEqual([]);
  await run.close();
});

// ---------------------------------------------------------------------------------------------
// Y16 and Y17: the step's words

test("Y16 The step's page, from the server, without a navigation: in Calm at 1440, presses from /log/13 to 14 and back, then from /log/22 to 23 (the question appears) and 24 (it goes), each keep the document and history.length and set location.pathname to the step's; the record, both captions, the count, the question, the step links, the table's open row, the title and both drawings' planks and numbers equal the server's HTML for that step; with Off stored, Next is a document navigation that grows history; when the step's fetch fails, Next navigates to it; in Full on the clock at 390 x 844 and 1440 x 900, Next from /log/22 to 23, its frames played from 700 ms after the click, shifts no layout without recent input from the press to 1 s after it lands (Iris's review, must 1)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const run = await openModel(browser, { ...DESKTOP, stored: "calm" });
  const server = async (path: string) => {
    const response = await run.page.request.get(path);
    expect(response.status(), `status of ${path}`).toBe(200);
    return readWords(run.page, await response.text());
  };
  const chains = [
    {
      start: 13,
      presses: [
        ["next", 14],
        ["previous", 13],
      ],
    },
    {
      start: STEPS[STEPS.indexOf(QUESTION_STEP ?? 23) - 1] ?? 22,
      presses: [
        ["next", QUESTION_STEP ?? 23],
        ["next", neighbours(QUESTION_STEP ?? 23).next ?? 24],
      ],
    },
  ] as const;
  for (const chain of chains) {
    await run.goto(recordOf(chain.start));
    await run.waitFor([...REST], FIRST);
    await pause(1500);
    await tagDocument(run.page);
    const length = await run.page.evaluate(() => history.length);
    for (const [kind, n] of chain.presses) {
      const target = recordOf(n);
      const where = `${kind} to ${target}, Calm at 1440`;
      await clickStep(run.page, kind);
      const now = await landedOn(run.page, target);
      expect(
        now.doc,
        `the press stays on the page (no document navigation), ${where}`,
      ).not.toBeNull();
      expect.soft(now.path, `location.pathname after ${where}`).toBe(target);
      expect
        .soft(
          await run.page.evaluate(() => history.length),
          `history.length after ${where}`,
        )
        .toBe(length);
      const [shown, served] = [await readWords(run.page), await server(target)];
      expect
        .soft(
          shown,
          `the page's words and drawings against the server's ${target}, ${where}`,
        )
        .toEqual(served);
      const asks = n === QUESTION_STEP;
      expect
        .soft(shown.question, `p[data-yard-question] after ${where}`)
        .toEqual(asks ? [YARD_WORDS.question] : []);
      await run.page.mouse.move(2, 2);
      await pause(300);
    }
  }
  expect.soft(run.errors, "console errors, Calm").toEqual([]);
  await run.close();

  // Full: no layout shift without recent input from the press until a second after it lands.
  // The question arrives with the knock, about 760 ms after the click, past Chrome's 500 ms input
  // window (Iris's review, .crew/sprint/55/review-iris.md, must 1: 0.0253 at 390 on 87fce76). In
  // real time a loaded SwiftShader lands the press early by its stall rule, inside the window, and
  // a real-time read at 390 saw none on 87fce76; so the press is held on the clock and its frames
  // stepped only once 700 ms of real time have passed since the click, as on a device that plays
  // it. The entries are the ones recorded after the click (a buffered observer's takeRecords, by
  // index: the clock's performance.now() isn't the entries' clock).
  const asking = QUESTION_STEP ?? 23;
  const before = STEPS[STEPS.indexOf(asking) - 1] ?? 22;
  const shiftsNow = (page: Page) =>
    page.evaluate(() => {
      type Shift = PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources?: { node?: Node | null }[];
      };
      const observer = new PerformanceObserver(() => undefined);
      observer.observe({ type: "layout-shift", buffered: true });
      const list = observer.takeRecords() as Shift[];
      observer.disconnect();
      const name = (node?: Node | null) =>
        node instanceof Element
          ? `${node.tagName.toLowerCase()}${node.classList[0] ? `.${node.classList[0]}` : ""}`
          : String(node?.nodeName ?? "none");
      return list.map((e) => ({
        value: e.value,
        recent: e.hadRecentInput,
        sources: (e.sources ?? []).map((source) => name(source.node)),
      }));
    });
  for (const size of [PHONE, DESKTOP]) {
    const where = `next from /log/${before} to /log/${asking}, Full on the clock at ${size.width} x ${size.height}`;
    const full = await atRestOnClock(browser, recordOf(before), size);
    const seen = (await shiftsNow(full.page)).length;
    const press = await pressOn(full, recordOf(asking), async () => {
      await clickStep(full.page, "next");
      await pause(700);
    });
    expect(
      press.sameDocument,
      `the press stays on the page (no document navigation), ${where}`,
    ).toBe(true);
    expect.soft(press.landed, `the press lands, ${where}`).toBe(true);
    await full.step(1000);
    await pause(300);
    const shifts = (await shiftsNow(full.page))
      .slice(seen)
      .filter((e) => !e.recent);
    note(
      testInfo,
      "layout shift",
      `${where}: ${told(press)}; without recent input: ${shifts.map((e) => `${e.value.toFixed(4)} (${e.sources.join(", ")})`).join("; ") || "none"}`,
    );
    expect
      .soft(
        shifts.reduce((total, e) => total + e.value, 0),
        `layout shift without recent input from the press to 1 s after it lands, ${where}`,
      )
      .toBe(0);
    expect.soft(full.errors, `console errors, ${where}`).toEqual([]);
    await full.close();
  }

  // Off: Ya's page, where Next is a document navigation.
  const off = await openModel(browser, { ...DESKTOP, stored: "off" });
  await off.goto(recordOf(13));
  await pause(1500);
  await tagDocument(off.page);
  const offLength = await off.page.evaluate(() => history.length);
  await Promise.all([
    off.page.waitForURL((u) => u.pathname === recordOf(14)),
    clickStep(off.page, "next"),
  ]);
  await off.page.waitForLoadState("domcontentloaded");
  const offAfter = await off.page.evaluate(() => ({
    doc: (window as Window & { __probeDoc?: number }).__probeDoc ?? null,
    length: history.length,
  }));
  expect
    .soft(
      offAfter,
      "with Off stored, Next from /log/13: a new document, history one longer",
    )
    .toEqual({
      doc: null,
      length: offLength + 1,
    });
  await off.close();

  // A failed fetch: every request for /log/14 but the navigation is aborted, so the press navigates.
  const failing = await openModel(browser, { ...DESKTOP, stored: "calm" });
  const aborted: string[] = [];
  await failing.page.route(
    (u) => u.pathname === recordOf(14),
    async (route) => {
      if (route.request().isNavigationRequest()) return route.continue();
      aborted.push(route.request().url());
      return route.abort();
    },
  );
  await failing.goto(recordOf(13));
  await failing.waitFor([...REST], FIRST);
  await pause(1500);
  await tagDocument(failing.page);
  await clickStep(failing.page, "next");
  await failing.page.waitForURL((u) => u.pathname === recordOf(14), {
    timeout: 20_000,
  });
  await failing.page.waitForLoadState("domcontentloaded");
  note(
    testInfo,
    "failed fetch",
    `requests for /log/14 aborted: ${aborted.length}`,
  );
  expect
    .soft(
      await failing.page.evaluate(
        () => (window as Window & { __probeDoc?: number }).__probeDoc ?? null,
      ),
      "after a failed fetch, Next is a document navigation (a new document)",
    )
    .toBeNull();
  await expect
    .soft(
      failing.page.locator(`${RECORD} h2`),
      "the record landed on after a failed fetch",
    )
    .toHaveText(goalOf(14));
  await failing.close();
});

test(`Y17 ← and →, and the live region: the server HTML of /log, /log/1, /log/13 and the newest step's /log/n holds one empty ${LIVE} with aria-live polite; in Calm on the clock on /log/13, → steps to 14 and ← back to 13, the region not naming the step while it moves and naming it (its number and record's h2) once landed, the same node throughout; Enter on the focused Next steps, and again; → in an input or a textarea, Alt+→ and Meta+→ step nothing; ← on /log/1, → on the newest step, either on /log, and → with Off stored step nothing`, async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const run = await atRestOnClock(browser, recordOf(13), {
    ...DESKTOP,
    stored: "calm",
  });
  // The region in the server's HTML.
  for (const path of [
    LOG,
    recordOf(STEPS[0] ?? 1),
    recordOf(13),
    recordOf(NEWEST_STEP),
  ]) {
    const html = await (await run.page.request.get(path)).text();
    const regions = await run.page.evaluate(
      ({ html, live }) =>
        [
          ...new DOMParser()
            .parseFromString(html, "text/html")
            .querySelectorAll(live),
        ].map((el) => ({
          polite: el.getAttribute("aria-live"),
          text: el.textContent ?? "",
        })),
      { html, live: LIVE },
    );
    expect
      .soft(regions, `${LIVE} in the server HTML of ${path}`)
      .toEqual([{ polite: "polite", text: "" }]);
  }
  const atLoad = await readPress(run.page);
  expect.soft(atLoad.live, `${LIVE} at load on /log/13`).toBe("");

  const squashed = (text: string | null) =>
    (text ?? "").replace(/\s+/g, " ").trim();
  const names = (text: string | null, n: number) =>
    new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text ?? "") &&
    squashed(text).includes(goalOf(n));
  const focusMain = () =>
    run.page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document
        .querySelector<HTMLElement>("main")
        ?.focus({ preventScroll: true });
    });

  // → and ←.
  for (const [key, n] of [
    ["ArrowRight", neighbours(13).next ?? 14],
    ["ArrowLeft", 13],
  ] as const) {
    const target = recordOf(n);
    const where = `${key} to ${target}, Calm on the clock`;
    await focusMain();
    const press = await pressOn(run, target, () =>
      run.page.keyboard.press(key),
    );
    expect(press.sameDocument, `the key stays on the page, ${where}`).toBe(
      true,
    );
    expect(press.landed, `${where} lands`).toBe(true);
    expect
      .soft(press.liveWhileMoving.length, `steps read while it moves, ${where}`)
      .toBeGreaterThan(0);
    expect
      .soft(
        press.liveWhileMoving.filter((text) => names(text, n)),
        `${LIVE} naming the step before it lands, ${where}`,
      )
      .toEqual([]);
    const now = await readPress(run.page);
    expect
      .soft(
        names(now.live, n),
        `${LIVE} "${now.live}" names step ${n} once landed, ${where}`,
      )
      .toBe(true);
    expect
      .soft(
        await sameLiveNode(run.page),
        `${LIVE} is the node from load, ${where}`,
      )
      .toBe(true);
  }

  // Enter on the focused Next, twice: the press keeps focus on a step link.
  await run.page.evaluate(() =>
    document.querySelector<HTMLElement>('a[data-step="next"]')?.focus(),
  );
  const fourteen = neighbours(13).next ?? 14;
  for (const n of [fourteen, neighbours(fourteen).next ?? 15]) {
    const target = recordOf(n);
    const press = await pressOn(run, target, () =>
      run.page.keyboard.press("Enter"),
    );
    expect
      .soft(
        {
          same: press.sameDocument,
          landed: press.landed,
          path: press.reads.at(-1)?.path,
        },
        `Enter on the focused Next to ${target}`,
      )
      .toEqual({ same: true, landed: true, path: target });
  }

  // Keys that step nothing.
  const still = async (where: string, act: () => Promise<unknown>) => {
    const before = await readSafe(run.page);
    await act();
    await pause(300);
    const pressed: (string | null)[] = [];
    for (let i = 0; i < 10; i++) {
      await run.step(100);
      pressed.push((await readPress(run.page)).press);
    }
    await pause(300);
    const after = await readPress(run.page);
    expect
      .soft(
        {
          path: after.path,
          frames: after.frames - before.frames,
          pressed: pressed.filter(Boolean),
        },
        `nothing steps: ${where}`,
      )
      .toEqual({ path: before.path, frames: 0, pressed: [] });
  };
  for (const tag of ["input", "textarea"] as const) {
    await run.page.evaluate((tag) => {
      const field = document.createElement(tag);
      field.setAttribute("data-probe-field", "");
      document.querySelector("main")?.prepend(field);
      field.focus({ preventScroll: true });
    }, tag);
    await still(`→ in an ${tag} on ${new URL(run.page.url()).pathname}`, () =>
      run.page.keyboard.press("ArrowRight"),
    );
    await run.page.evaluate(() =>
      document.querySelector("[data-probe-field]")?.remove(),
    );
  }
  for (const chord of ["Alt+ArrowRight", "Meta+ArrowRight"]) {
    await focusMain();
    await still(`${chord} on ${new URL(run.page.url()).pathname}`, () =>
      run.page.keyboard.press(chord),
    );
  }
  for (const [path, keys] of [
    [recordOf(STEPS[0] ?? 1), ["ArrowLeft"]],
    [recordOf(NEWEST_STEP), ["ArrowRight"]],
    [LOG, ["ArrowRight", "ArrowLeft"]],
  ] as const) {
    await run.goto(path);
    await run.until([...REST], 4, FIRST);
    await run.step(1000);
    await pause(500);
    await tagDocument(run.page);
    for (const key of keys) {
      await focusMain();
      await still(`${key} on ${path}`, () => run.page.keyboard.press(key));
      expect
        .soft(
          (await readPress(run.page)).doc,
          `${key} on ${path} keeps the document`,
        )
        .not.toBeNull();
    }
  }
  expect.soft(run.errors, "console errors, Calm").toEqual([]);
  await run.close();

  // Off: Ya's page, where → is nothing.
  const off = await openModel(browser, { ...DESKTOP, stored: "off" });
  await off.goto(recordOf(13));
  await pause(1500);
  await tagDocument(off.page);
  await off.page.evaluate(() =>
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true }),
  );
  await off.page.keyboard.press("ArrowRight");
  await pause(1500);
  expect
    .soft(
      await off.page.evaluate(() => ({
        doc: (window as Window & { __probeDoc?: number }).__probeDoc ?? null,
        path: location.pathname,
      })),
      "→ with Off stored on /log/13",
    )
    .toEqual({ doc: 1, path: recordOf(13) });
  await off.close();
});

// ---------------------------------------------------------------------------------------------
// Y18

for (const size of [DESKTOP, PHONE]) {
  test(`Y18 Budgets while pressing, at ${size.width} x ${size.height} in Full: a flight from /log/13 to 14 draws at most 8 calls and ${TRIANGLES_AT(size.width).toLocaleString("en-US")} triangles a frame; once landed 0 frames over 3 s, and 0 over 3 s hidden with a scheme switch inside, then 1 once shown${size === PHONE ? "; a → pressed with the drawings more than a viewport off-screen lands on /log/15 with 0 frames, and scrolling back draws exactly 1" : "; the 3D chunk is one file of at most 250,000 B gzip -9, its delta against main's reported (the plan's 4 to 7 KB); the loader's 0 B is B2.10's and B5.10's, unedited"}`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);
    const where = `/log/13 at ${size.width} x ${size.height}, Full`;
    const budget = TRIANGLES_AT(size.width);
    const run = await atRestOnClock(browser, recordOf(13), size);
    if (size === DESKTOP) {
      // The 3D chunk: the scripts with the model beyond the refused page's (B5.23's method).
      const refused = await openModel(browser, { ...size, refuse: true });
      await refused.goto(recordOf(13));
      await pause(3500);
      const offPaths = (await refused.scripts()).list.map(
        (s) => new URL(s.url).pathname,
      );
      await refused.close();
      const chunk = (await run.scripts()).list.filter(
        (s) => !offPaths.includes(new URL(s.url).pathname),
      );
      const gzip9 = chunk.reduce((s, f) => s + f.gzip9, 0);
      note(
        testInfo,
        "3D chunk",
        `${chunk.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B`).join("; ")}: ${gzip9} B gzip -9, ${gzip9 - MAIN_CHUNK >= 0 ? "+" : ""}${gzip9 - MAIN_CHUNK} B against main's ${MAIN_CHUNK} (the plan's estimate: 4,000 to 7,000)`,
      );
      expect.soft(chunk.length, "scripts beyond the refused page's").toBe(1);
      expect
        .soft(gzip9, "the 3D chunk, gzip -9 bytes")
        .toBeLessThanOrEqual(250_000);
    }
    const flight = await pressOn(run, recordOf(14), () =>
      clickStep(run.page, "next"),
    );
    note(testInfo, "flight", `${where}: ${told(flight)}`);
    expect(flight.sameDocument, `the press stays on the page, ${where}`).toBe(
      true,
    );
    expect(
      flight.frames.length,
      `frames drawn by the flight, ${where}`,
    ).toBeGreaterThan(0);
    const draws = Math.max(...flight.frames.map((f) => f.draws));
    const triangles = Math.max(...flight.frames.map((f) => f.triangles));
    note(
      testInfo,
      "draws",
      `${where}: ${flight.frames.length} frames in flight; at most ${draws} draws and ${triangles} triangles in a frame; budget 8 and ${budget}. ${SWIFTSHADER}.`,
    );
    expect
      .soft(draws, `the most draw calls in a flying frame, ${where}`)
      .toBeLessThanOrEqual(8);
    expect
      .soft(
        triangles,
        `the most triangles in a flying frame, line quads included, ${where}`,
      )
      .toBeLessThanOrEqual(budget);
    await run.page.mouse.move(2, 2);
    expect
      .soft(
        await framesOver(run, 3000),
        `frames over 3 s once landed, ${where}`,
      )
      .toBe(0);
    await setHidden(run.page, true);
    const scheme = (await run.page.evaluate(
      () => matchMedia("(prefers-color-scheme: dark)").matches,
    ))
      ? "light"
      : "dark";
    expect
      .soft(
        await framesOver(run, 3000, () =>
          run.page.emulateMedia({ colorScheme: scheme }),
        ),
        `frames over 3 s hidden, a switch to ${scheme} inside, ${where}`,
      )
      .toBe(0);
    expect
      .soft(
        await framesOver(run, 1000, () => setHidden(run.page, false)),
        `frames once shown, ${where}`,
      )
      .toBe(1);

    if (size === PHONE) {
      // Off-screen: → at the page's foot.
      await run.page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await pause(300);
      const ghost = await boxOf(run.page, GHOST_HULL);
      expect
        .soft(
          (ghost?.y ?? 0) + (ghost?.height ?? 0) <= -size.height,
          `[data-ghost] more than a viewport off-screen (its bottom at ${(ghost?.y ?? 0) + (ghost?.height ?? 0)}), ${where}`,
        )
        .toBe(true);
      await run.page.evaluate(() =>
        document
          .querySelector<HTMLElement>("main")
          ?.focus({ preventScroll: true }),
      );
      const target = recordOf(neighbours(14).next ?? 15);
      const away = await pressOn(run, target, () =>
        run.page.keyboard.press("ArrowRight"),
      );
      note(testInfo, "off-screen", `${where}: ${told(away)}`);
      expect
        .soft(away.landed, `→ off-screen lands on ${target}, ${where}`)
        .toBe(true);
      expect
        .soft(away.frames.length, `frames drawn by → off-screen, ${where}`)
        .toBe(0);
      expect
        .soft(
          await framesOver(run, 1000, () =>
            run.page.evaluate(() => scrollTo(0, 0)),
          ),
          `frames once back on screen, ${where}`,
        )
        .toBe(1);
    }
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();
  });
}

// ---------------------------------------------------------------------------------------------
// Y19 (Iris's review of the press, .crew/sprint/55/review-iris.md, must 2)

const Y19_PAGES = [...new Set([13, QUESTION_STEP ?? 23, 40])].map(recordOf);
const Y19_SIZES: Size[] = [DESKTOP, { width: 1024, height: 768 }];

/** The Theseus's numbers a visitor sees: text, ink and box, read with the page as it is. */
function theseusNumbers(page: Page) {
  return page.evaluate(
    (css) =>
      [...document.querySelectorAll(css)]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            el.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
        )
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: (el.textContent ?? "").trim(),
            color: getComputedStyle(el).color,
            box: { x: r.left, y: r.top, width: r.width, height: r.height },
          };
        }),
    `${THESEUS} .plan-plank`,
  );
}

/** WCAG's relative luminance of an sRGB [0, 255] colour, as `contrast` reads it. */
function luminance([r = 0, g = 0, b = 0]: readonly number[]) {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * The plank's fill under a number (Atlas's decision on Y19, .crew/sprint/55/decisions.md): the
 * view's pixels in the number's box, less the drawn lines crossing it, the record's ink mark and
 * the seams, which are ink as the 2D's own strokes are. A line splits the box's luminances in two
 * groups 1.5:1 or more apart (ink against the card); then the fill is the group farther from the
 * number's ink, and its median is the ground. With no such split, the whole box's median, as
 * B5.19 reads the ghost's. The record's 13 on /log/13 at 1024 sits half on its 2 px mark, where
 * the box's median read the mark's anti-aliased edge (4.45:1 on a card of about 8.6:1).
 */
function plankFill(image: Image, b: Box, ink: readonly number[]) {
  const c = whole(b);
  const px: number[][] = [];
  for (let y = c.y; y < c.y + c.height; y++)
    for (let x = c.x; x < c.x + c.width; x++)
      if (x >= 0 && y >= 0 && x < image.width && y < image.height)
        px.push(pixel(image, x, y).slice(0, 3));
  const median = (list: number[][]) =>
    [0, 1, 2].map((k) => {
      const v = list.map((p) => p[k] ?? 0).sort((p, q) => p - q);
      return v[Math.floor(v.length / 2)] ?? Number.NaN;
    });
  const ys = px.map(luminance);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  for (let i = 0; i < 20; i++) {
    const low = ys.filter((y) => Math.abs(y - lo) <= Math.abs(y - hi));
    const high = ys.filter((y) => Math.abs(y - lo) > Math.abs(y - hi));
    if (!low.length || !high.length) break;
    lo = low.reduce((sum, y) => sum + y, 0) / low.length;
    hi = high.reduce((sum, y) => sum + y, 0) / high.length;
  }
  if ((hi + 0.05) / (lo + 0.05) < 1.5) return { rgb: median(px), lines: 0 };
  const inkY = luminance(ink);
  const fillLow = Math.abs(lo - inkY) >= Math.abs(hi - inkY);
  const fill = px.filter(
    (_, i) =>
      Math.abs((ys[i] ?? 0) - lo) <= Math.abs((ys[i] ?? 0) - hi) === fillLow,
  );
  return { rgb: median(fill), lines: px.length - fill.length };
}

test(`Y19 The Theseus's numbers read in dark: settled in Full, dark, at 1440 x 900 and 1024 x 768 on ${Y19_PAGES.join(", ")}, the Theseus shows numbers and each sits at least 4.5:1 on what it sits on, its ink against the plank's fill under its box with the numbers hidden: the box's median, leaving out the drawn lines crossing it (the record's mark and the seams, ink as the 2D's strokes are) when they split its luminances 1.5:1 or more`, async ({
  browser,
}, testInfo) => {
  test.setTimeout(300_000);
  for (const url of Y19_PAGES) {
    for (const size of Y19_SIZES) {
      const where = `${url} at ${size.width} x ${size.height}, Full, dark`;
      const run = await openModel(browser, { ...size, scheme: "dark" });
      await run.goto(url);
      await run.waitFor([...REST], FIRST);
      await run.page.mouse.move(2, 2);
      await pause(600);
      const numbers = await theseusNumbers(run.page);
      const bare = await run.page.addStyleTag({
        content: `${THESEUS} .plan-plank { visibility: hidden !important; }`,
      });
      const image = decodePng(await run.page.screenshot());
      await bare.evaluate((style) => (style as Element).remove());
      const reads: string[] = [];
      const faint: string[] = [];
      for (const n of numbers) {
        const ink = await rgbOf(run.page, n.color);
        const ground = plankFill(image, n.box, ink);
        const ratio = contrast(
          ink as [number, number, number],
          ground.rgb as [number, number, number],
        );
        reads.push(
          `${n.text} ${ratio.toFixed(2)}:1${ground.lines ? ` (${ground.lines} line px left out)` : ""}`,
        );
        if (ratio < 4.5) faint.push(`${n.text} ${ratio.toFixed(2)}:1`);
      }
      note(testInfo, "contrast", `${where}: ${reads.join(", ") || "none"}`);
      expect
        .soft(numbers.length, `the Theseus's numbers shown, ${where}`)
        .toBeGreaterThan(0);
      expect
        .soft(
          faint,
          `the Theseus's numbers under 4.5:1 on what they sit on, ${where}`,
        )
        .toEqual([]);
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }
  }
});
