import { expect, type Page } from "@playwright/test";
import { LENGTH } from "../lib/half-model";
import { GHOST as LAYOUT } from "../lib/hull-layouts";
import { MOTION } from "./helpers";
import { entryOf, RECORD } from "./log";
import { type Box, CANVAS, MODEL, pause, whole } from "./model";
import { coverage, decodePng, deltaE, type Image, pixel } from "./pixels";
import { GHOST } from "./retros";
import type { ModelRun } from "./webgl";

// What the B5c checks share (.crew/sprint/33/contract.md): the ghost hull in 3D on /log and every
// /log/<n>. The page gives the harness `[data-model]` right after `[data-ghost]` in main, its
// `data-state` and its one canvas (B3's hooks), `data-pick="<seat>"` on `[data-model]` while a
// mouse or pen is over a plank at rest (the contract's one new hook), the canvas's own cursor, and
// the drawing's own `.plan-plank` spans, which ride their planks by a `transform`. Nothing else, and
// nothing on `window`. Every number the checks compare comes from the oracle (e2e/retros.ts's
// GHOST) or the drawing the server rendered, never from the chunk.

export const DRAWING = "[data-ghost]";
const NUMBERS = "[data-ghost] .plan-plank";
/** The Log's two pages the checks run on: the Log, and a record (the contract's sample). */
export const PAGES = ["/log", "/log/13"] as const;
/** The record whose seat the record page marks. */
export const MARKED = 13;
/** The default sizes: a desktop and a phone (the contract, "The checks"). */
export const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;
/** Full's camera move, ms (Iris's call 3). */
export const MOVE = 1800;
/** From this width the numbers show, the desktop mesh draws and the cap is 2. */
export const NUMBERS_FROM = 768;

/** Each seat by the number the ghost gives it: GHOST inverted (each sprint takes one seat). */
export const SEAT_BY_NUMBER: ReadonlyMap<number, string> = new Map(
  Object.entries(GHOST).map(([seat, n]) => [n, seat]),
);
/** The seats in the oracle's order. */
export const SEATS = Object.keys(GHOST);
/** The seat a record's sprint took, which its page marks. */
export const markedSeat = (n: number) => SEAT_BY_NUMBER.get(n);

/** The ghost drawing's box. */
export const ghostBox = (page: Page) => box(page, DRAWING);
/** The model's canvas's box. */
export const canvasBox = (page: Page) => box(page, "[data-model] canvas");

function box(page: Page, selector: string) {
  return page.evaluate((css) => {
    const r = document.querySelector(css)?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  }, selector);
}

/**
 * The canvas against the ghost's box (B3.1's fit on the Log): the buffer, its CSS size and corner,
 * the ghost's box, and the DPR.
 */
export function ghostFit(page: Page) {
  return page.evaluate((drawing) => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "[data-model] canvas",
    );
    const ghost = document.querySelector(drawing)?.getBoundingClientRect();
    const r = canvas?.getBoundingClientRect();
    return {
      dpr: devicePixelRatio,
      buffer: canvas ? [canvas.width, canvas.height] : null,
      css: r ? [r.width, r.height] : null,
      at: r ? [r.left, r.top] : null,
      ghost: ghost ? [ghost.width, ghost.height] : null,
      ghostAt: ghost ? [ghost.left, ghost.top] : null,
    };
  }, DRAWING);
}

/** The 2D hull's box on the page, CSS px: the ghost's clip path through the svg's CTM. */
export function hullBox(page: Page) {
  return page.evaluate((drawing) => {
    const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
    const hull = svg?.querySelector<SVGPathElement>("clipPath path");
    const m = svg?.getScreenCTM();
    if (!svg || !hull || !m) return null;
    const b = hull.getBBox();
    return {
      x: m.a * b.x + m.e,
      y: m.d * b.y + m.f,
      width: m.a * b.width,
      height: m.d * b.height,
    };
  }, DRAWING);
}

/** The hull's length in the drawing at a ghost box's width: LENGTH units at the layout's scale. */
export const drawnLength = (ghostWidth: number) =>
  (LENGTH * LAYOUT.s * ghostWidth) / (LAYOUT.box[2] ?? 1);

export type Number_ = {
  text: string;
  shown: boolean;
  box: Box;
  transform: string;
  weight: number;
  size: number;
  pointer: string;
  current: boolean;
  color: string;
};

/** The drawing's number spans as the visitor sees them: text, box, transform, face and colour. */
export function ghostNumbers(page: Page): Promise<Number_[]> {
  return page.evaluate((numbers) => {
    return [...document.querySelectorAll(numbers)].map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? "").trim(),
        shown:
          el.getClientRects().length > 0 &&
          el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }),
        box: { x: r.left, y: r.top, width: r.width, height: r.height },
        transform: s.transform,
        weight: Number(s.fontWeight),
        size: Number.parseFloat(s.fontSize),
        pointer: s.pointerEvents,
        current: el.classList.contains("plan-current"),
        color: s.color,
      };
    });
  }, NUMBERS);
}

/**
 * The ghost drawing as the Off page has it (B5.22): each plank's fill and its paint alpha, the
 * `svg`'s visibility, the shown numbers, and any number carrying a transform; with `[data-model]`'s
 * state and canvases. Read with page.evaluate alone, so it works with scripts off.
 */
export function ghostDrawing(page: Page) {
  return page.evaluate((drawing) => {
    const seen = (el: Element | null) =>
      Boolean(
        el &&
          el.getClientRects().length > 0 &&
          el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }),
      );
    const alpha = (s: CSSStyleDeclaration) => {
      if (s.fill === "none" || s.fill === "transparent") return 0;
      const parts = s.fill.match(/^rgba?\((.*)\)$/)?.[1]?.split(/[\s,/]+/);
      const a = parts?.length === 4 ? Number(parts[3]) : 1;
      return a * Number(s.fillOpacity) * Number(s.opacity);
    };
    const ghost = document.querySelector(drawing);
    const svg = ghost?.querySelector("svg") ?? null;
    const numbers = [...(ghost?.querySelectorAll(".plan-plank") ?? [])];
    return {
      planks: [...(ghost?.querySelectorAll("[data-plank]") ?? [])].map((p) => {
        const s = getComputedStyle(p);
        return {
          id: p.getAttribute("data-plank") ?? "",
          sprint: p.getAttribute("data-sprint") ?? "",
          fill: s.fill,
          alpha: alpha(s),
        };
      }),
      svg: seen(svg),
      svgOpacity: svg ? Number(getComputedStyle(svg).opacity) : Number.NaN,
      numbers: numbers
        .filter(seen)
        .map((n) => (n.textContent ?? "").trim())
        .sort(),
      transformed: numbers
        .filter((n) => getComputedStyle(n).transform !== "none")
        .map(
          (n) =>
            `${(n.textContent ?? "").trim()} ${getComputedStyle(n).transform}`,
        ),
      state:
        document.querySelector("[data-model]")?.getAttribute("data-state") ??
        null,
      canvases: document.querySelectorAll("[data-model] canvas").length,
    };
  }, DRAWING);
}

export type GhostDrawing = Awaited<ReturnType<typeof ghostDrawing>>;

/** `[data-model]`'s data-pick now, or null. */
export const pickOf = (page: Page) =>
  page.evaluate(
    (model) => document.querySelector(model)?.getAttribute("data-pick") ?? null,
    MODEL,
  );

/** The canvas's computed cursor. */
export const cursorOf = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector("[data-model] canvas");
    return canvas ? getComputedStyle(canvas).cursor : null;
  });

/** Two animation frames in the page, real time: what a hover's frame needs to land. */
export const twoFrames = (page: Page) =>
  page.evaluate(async () => {
    for (let i = 0; i < 2; i++)
      await new Promise((done) => requestAnimationFrame(done));
  });

/** A box's centre. */
export const centreOf = (b: Box) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

/**
 * The record's h2 on the page now, or null, and whether the URL is that record's: what a pick
 * that opened /log/<n> lands on.
 */
export async function landedOn(page: Page, n: number) {
  // The URL as the navigation commits; the h2 is in the server's HTML, so the locator finds it
  // without waiting for the record page's load event.
  await page.waitForURL((url) => url.pathname === `/log/${n}`, {
    timeout: 15_000,
    waitUntil: "commit",
  });
  const h2 = page.locator(`${RECORD} h2`);
  await expect(h2, `the record's h2 on /log/${n}`).toHaveText(
    entryOf(n)?.goal ?? `(no entry for ${n})`,
  );
}

/**
 * The pointer's records over a scan (installed once per page): every pointermove's point, and
 * each `data-pick` change with the newest pointermove at the moment it changed. The pick may be set
 * in the handler or a frame later, so a scan's points are verified one by one after it.
 */
function recordPicks() {
  const w = window as Window & {
    __moves?: [number, number][];
    __picks?: { at: number; pick: string | null }[];
  };
  const moves: [number, number][] = [];
  const picks: { at: number; pick: string | null }[] = [];
  w.__moves = moves;
  w.__picks = picks;
  addEventListener(
    "pointermove",
    (event) => {
      moves.push([event.clientX, event.clientY]);
    },
    { capture: true },
  );
  new MutationObserver(() => {
    const pick =
      document.querySelector("[data-model]")?.getAttribute("data-pick") ?? null;
    if (picks.at(-1)?.pick !== pick) picks.push({ at: moves.length - 1, pick });
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-pick"],
  });
}

export type SeatPoints = Map<string, { x: number; y: number }>;

/** A scan: each seat's verified point, and the seat every grid point read, by its CSS px. */
export type Scan = {
  points: SeatPoints;
  /** Each grid point that read a seat: [x, y, seat]. */
  grid: [number, number, string][];
};

/**
 * Each seat's point on the settled hull, found as B5.24 says: a mouse scan of the canvas on a
 * `step` px grid, reading `data-pick` (dispatched pointer moves, then a real hover on each point). Of each seat's points, the one taken is in the seat's lowest
 * run on screen (the near side: the far side's inside shows above the near sheer), with a
 * neighbour of the same seat on all four sides, nearest that run's centre; each is then checked on
 * its own with a hover. A seat with no such point is missing from the map, and the caller asserts
 * all 22. The pointer ends off the canvas.
 */
export async function scanSeats(run: ModelRun, step: number): Promise<Scan> {
  const { page } = run;
  const canvas = await box(page, "[data-model] canvas");
  expect(canvas, "the canvas's box, for the scan").not.toBeNull();
  const c = canvas as Box;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let x = c.x + step / 2; x < c.x + c.width; x += step) xs.push(x);
  for (let y = c.y + step / 2; y < c.y + c.height; y += step) ys.push(y);
  const key = (i: number, j: number) => `${i},${j}`;
  // Each grid point's pick, first by pointermove events dispatched in the page at the element
  // under the point, reading data-pick after each: a second for the canvas where real moves take
  // over 90 s (sprint 33, decision 12). Only the seats' chosen points need the real mouse, and they
  // get it below; if the page sets data-pick only a frame later, the scan falls back to real moves.
  const grid = new Map<string, string>(
    await page.evaluate(
      ({ xs, ys }) => {
        const host = document.querySelector("[data-model]");
        const out: [string, string][] = [];
        for (const [j, y] of ys.entries())
          for (const [i, x] of xs.entries()) {
            const target = document.elementFromPoint(x, y) ?? document.body;
            target.dispatchEvent(
              new PointerEvent("pointermove", {
                clientX: x,
                clientY: y,
                pointerType: "mouse",
                isPrimary: true,
                bubbles: true,
                composed: true,
              }),
            );
            const pick = host?.getAttribute("data-pick");
            if (pick) out.push([`${i},${j}`, pick]);
          }
        // The dispatched pointer leaves as a real one would.
        document.querySelector("[data-model] canvas")?.dispatchEvent(
          new PointerEvent("pointerleave", {
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
        return out;
      },
      { xs, ys },
    ),
  );
  if (grid.size === 0) {
    await page.evaluate(recordPicks);
    await page.mouse.move(c.x - 20, c.y - 20);
    for (const y of ys) for (const x of xs) await page.mouse.move(x, y);
    await page.mouse.move(c.x - 20, c.y - 20);
    await twoFrames(page);
    const { moves, picks } = await page.evaluate(() => {
      const w = window as Window & {
        __moves?: [number, number][];
        __picks?: { at: number; pick: string | null }[];
      };
      return { moves: w.__moves ?? [], picks: w.__picks ?? [] };
    });
    // Each grid point's pick: the newest change at or before its move.
    let p = 0;
    let current: string | null = null;
    // A move's grid cell by rounding: the event's coordinates may be fractional or coalesced.
    const [x0, y0] = [xs[0] ?? 0, ys[0] ?? 0];
    for (const [m, [x, y]] of moves.entries()) {
      while (p < picks.length && (picks[p]?.at ?? 0) <= m) {
        current = picks[p]?.pick ?? null;
        p++;
      }
      const [i, j] = [Math.round((x - x0) / step), Math.round((y - y0) / step)];
      const onGrid =
        i >= 0 &&
        j >= 0 &&
        i < xs.length &&
        j < ys.length &&
        Math.abs(x - (xs[i] ?? 0)) < 0.75 &&
        Math.abs(y - (ys[j] ?? 0)) < 0.75;
      if (onGrid && current) grid.set(key(i, j), current);
    }
  }
  // The real pointer comes in from off the canvas, so the dispatched moves leave no hover behind.
  await page.mouse.move(c.x - 20, c.y - 20);
  await twoFrames(page);
  const found: SeatPoints = new Map();
  for (const seat of SEATS) {
    const cells = [...grid.entries()]
      .filter(([, s]) => s === seat)
      .map(([k]) => k.split(",").map(Number) as [number, number]);
    if (cells.length === 0) continue;
    // Runs: 4-connected groups of the seat's cells; the lowest on screen is the near side.
    const left = new Set(cells.map(([i, j]) => key(i, j)));
    const runs: [number, number][][] = [];
    for (const [i, j] of cells) {
      if (!left.has(key(i, j))) continue;
      const run: [number, number][] = [];
      const queue: [number, number][] = [[i, j]];
      left.delete(key(i, j));
      while (queue.length) {
        const [a, b] = queue.pop() as [number, number];
        run.push([a, b]);
        for (const [da, db] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const k = key(a + da, b + db);
          if (left.has(k)) {
            left.delete(k);
            queue.push([a + da, b + db]);
          }
        }
      }
      runs.push(run);
    }
    const mean = (r: [number, number][]) =>
      r.reduce((s, [, b]) => s + b, 0) / r.length;
    runs.sort((a, b) => b.length - a.length);
    const big = runs.filter(
      (r) => r.length >= Math.min(3, runs[0]?.length ?? 0),
    );
    const near = big.sort((a, b) => mean(b) - mean(a))[0] ?? [];
    const [ci, cj] = [
      near.reduce((s, [a]) => s + a, 0) / near.length,
      mean(near),
    ];
    const inside = near.filter(([a, b]) =>
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].every(([da = 0, db = 0]) => grid.get(key(a + da, b + db)) === seat),
    );
    const ranked = (inside.length ? inside : near).sort(
      (a, b) =>
        Math.hypot(a[0] - ci, a[1] - cj) - Math.hypot(b[0] - ci, b[1] - cj),
    );
    for (const [a, b] of ranked.slice(0, 6)) {
      const point = { x: xs[a] ?? 0, y: ys[b] ?? 0 };
      await page.mouse.move(point.x, point.y);
      await twoFrames(page);
      if ((await pickOf(page)) === seat) {
        found.set(seat, point);
        break;
      }
    }
  }
  await page.mouse.move(c.x - 20, c.y - 20);
  await twoFrames(page);
  return {
    points: found,
    grid: [...grid.entries()].map(([k, seat]) => {
      const [i = 0, j = 0] = k.split(",").map(Number);
      return [xs[i] ?? 0, ys[j] ?? 0, seat];
    }),
  };
}

/** A point on the canvas's box but on no plank: 3 px inside its top left corner. */
export async function offHull(page: Page) {
  const c = await box(page, "[data-model] canvas");
  return { x: (c?.x ?? 0) + 3, y: (c?.y ?? 0) + 3 };
}

/** sRGB [0, 255] to OKLab. */
export function oklab([r = 0, g = 0, b = 0]: readonly number[]) {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** A token as the page paints it, [r, g, b], through a 2D canvas. */
export function token(page: Page, name: string) {
  return page.evaluate((prop) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${prop})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return [0, 0, 0];
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, name);
}

/** A CSS colour as [r, g, b], through a 2D canvas in the page. */
export function rgbOf(page: Page, color: string) {
  return page.evaluate((value) => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return [0, 0, 0];
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, color);
}

/** The viewport with the drawing's numbers hidden: the canvas over the film, as the visitor sees it. */
export async function bareView(page: Page): Promise<Image> {
  const handle = await page.addStyleTag({
    content: `${NUMBERS} { visibility: hidden !important; }`,
  });
  const png = await page.screenshot();
  await handle.evaluate((style) => (style as Element).remove());
  return decodePng(png);
}

/** The canvas alone over a transparent page (S4's method), and its coverage. */
export async function canvasAlone(page: Page, clip: Box) {
  const handle = await page.addStyleTag({
    content: `html, body, body * { visibility: hidden !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
[data-model] canvas { visibility: visible !important; }`,
  });
  const image = decodePng(
    await page.screenshot({ clip, omitBackground: true }),
  );
  await handle.evaluate((style) => (style as Element).remove());
  return { image, alpha: coverage(image) };
}

/** The median colour of an image's pixels in a CSS px box at `dpr`. */
export function medianIn(image: Image, b: Box, dpr = 1) {
  const c = whole({
    x: b.x * dpr,
    y: b.y * dpr,
    width: b.width * dpr,
    height: b.height * dpr,
  });
  const channels: number[][] = [[], [], []];
  for (let y = c.y; y < c.y + c.height; y++)
    for (let x = c.x; x < c.x + c.width; x++) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const px = pixel(image, x, y);
      for (let i = 0; i < 3; i++) channels[i]?.push(px[i] ?? 0);
    }
  return channels.map((list) => {
    const s = [...list].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? Number.NaN;
  });
}

/** Canvas pixels within ΔE 10 of `accent`, each composited over the page's background (B3.7). */
export function copper(image: Image, accent: number[], ground: number[]) {
  let n = 0;
  for (let i = 0; i < image.width * image.height; i++) {
    const a = (image.data[i * 4 + 3] ?? 0) / 255;
    if (a < 0.02) continue;
    const rgb = [0, 1, 2].map(
      (c) => (image.data[i * 4 + c] ?? 0) * a + (ground[c] ?? 0) * (1 - a),
    );
    if (deltaE(rgb, accent) < 10) n++;
  }
  return n;
}

/**
 * Pixels on a mask's outermost rows and columns covered at `threshold` or more: the frame runs into
 * the canvas's edge. At 50%, the silhouette as B3.1 reads it: the settled ghost has under half a
 * pixel to spare at the top and bottom at 320 and 390 (Iris's table), where its outline's
 * anti-aliasing may tint an edge row without the hull being cut.
 */
export function onEdge(
  alpha: Float32Array,
  w: number,
  h: number,
  threshold = 0.5,
) {
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        (y === 0 || x === 0 || y === h - 1 || x === w - 1) &&
        (alpha[y * w + x] ?? 0) >= threshold
      )
        n++;
  return n;
}

/**
 * The model's state history and frame count now, kept on the page's window so a Back that
 * restores the page from the bfcache can tell its new states and frames from the first visit's.
 */
export function markVisit(page: Page) {
  return page.evaluate(() => {
    const w = window as Window & {
      __mark?: { states: number; frames: number };
      __states?: unknown[];
      __gl?: { frames: unknown[] };
    };
    w.__mark = {
      states: w.__states?.length ?? 0,
      frames: w.__gl?.frames.length ?? 0,
    };
  });
}

/** The states and frames since `markVisit` (all of them on a fresh document). */
export function sinceMark(page: Page) {
  return page.evaluate(() => {
    const w = window as Window & {
      __mark?: { states: number; frames: number };
      __states?: { state: string }[];
      __gl?: { frames: { state: string | null }[] };
    };
    const mark = w.__mark ?? { states: 0, frames: 0 };
    return {
      restored: Boolean(w.__mark),
      states: (w.__states ?? []).slice(mark.states).map((s) => s.state),
      frames: (w.__gl?.frames ?? []).slice(mark.frames).map((f) => f.state),
    };
  });
}

/** Waits in real time until `[data-model]` is at rest, with a clear message. */
export async function atRest(run: ModelRun, where: string, timeout = 45_000) {
  const end = Date.now() + timeout;
  for (;;) {
    const state = await run.state();
    if (state === "settled" || state === "still") return state;
    if (Date.now() > end) {
      throw new Error(
        `[data-model] never came to rest ${where}: it is ${state}; states ${(await run.states()).map((s) => s.state).join(" > ") || "none"}`,
      );
    }
    await pause(50);
  }
}

/** The shown slot's button named `label`, pressed with the mouse at its centre. */
export async function press(page: Page, label: string) {
  const at = await page.evaluate(
    ({ slot, label }) => {
      const shown = [...document.querySelectorAll(slot)].find(
        (s) => s.getClientRects().length > 0,
      );
      const button = [...(shown?.querySelectorAll("button") ?? [])].find(
        (b) => (b.textContent ?? "").trim() === label,
      );
      const r = button?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    },
    { slot: MOTION, label },
  );
  expect(at, `the shown slot's ${label} button`).not.toBeNull();
  await page.mouse.click(at?.x ?? 0, at?.y ?? 0);
}

/** A point on a plank, by hover: the canvas's centre, else the first along its middle row. */
export async function aPlank(run: ModelRun) {
  const c = await run.page.evaluate((canvas) => {
    const r = document.querySelector(canvas)?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  }, CANVAS);
  expect(c, "the canvas's box").not.toBeNull();
  const b = c as Box;
  for (const dy of [0, 4, -4, 8, -8])
    for (let x = b.x + b.width / 2; x < b.x + b.width - 2; x += 6) {
      const y = b.y + b.height / 2 + dy;
      await run.page.mouse.move(x, y);
      await pause(30);
      const seat = await pickOf(run.page);
      if (seat) return { x, y, seat };
    }
  return null;
}

/**
 * Two neighbouring planks along the canvas's middle row, by hover on a `step` px walk: a point in
 * the first run of one seat at least three steps long, a point one step further in the same run,
 * and a point in the next run of another seat. The pointer ends off the canvas.
 */
export async function twoPlanks(run: ModelRun, step = 2) {
  const c = await canvasBox(run.page);
  expect(c, "the canvas's box").not.toBeNull();
  const b = c as Box;
  const y = b.y + b.height / 2;
  const walk: { x: number; seat: string | null }[] = [];
  for (let x = b.x + 2; x < b.x + b.width - 2; x += step) {
    await run.page.mouse.move(x, y);
    walk.push({ x, seat: await pickOf(run.page) });
  }
  await run.page.mouse.move(b.x - 20, b.y - 20);
  await twoFrames(run.page);
  const runs: { seat: string; xs: number[] }[] = [];
  for (const { x, seat } of walk) {
    if (!seat) continue;
    const last = runs.at(-1);
    if (last && last.seat === seat && (last.xs.at(-1) ?? 0) === x - step)
      last.xs.push(x);
    else runs.push({ seat, xs: [x] });
  }
  const first = runs.findIndex((r) => r.xs.length >= 3);
  const one = runs[first];
  const other = runs.slice(first + 1).find((r) => r.seat !== one?.seat);
  if (!one || !other) return null;
  const mid = Math.floor(one.xs.length / 2) - 1;
  return {
    a: { x: one.xs[mid] ?? 0, y, seat: one.seat },
    within: { x: one.xs[mid + 1] ?? 0, y },
    b: {
      x: other.xs[Math.floor(other.xs.length / 2)] ?? 0,
      y,
      seat: other.seat,
    },
  };
}

/**
 * The seats whose number is led out at rest from 768 px, so it sits off the hull at its leader's
 * end: those the 2D drawing leads out, read off `[data-ghost] .ln-leader` (each subpath runs from the
 * number, `M x y`, into its plank, `H x`; the plank holding that inner end is the seat), and those
 * the 3D alone leads out, which the page draws in the canvas and doesn't expose.
 */
export function ledOutSeats(page: Page) {
  return page
    .evaluate((drawing) => {
      const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
      const d = svg?.querySelector(".ln-leader")?.getAttribute("d") ?? "";
      const planks = [
        ...(svg?.querySelectorAll<SVGPathElement>("[data-plank]") ?? []),
      ];
      const seats: string[] = [];
      for (const m of d.matchAll(
        /M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*H\s*(-?[\d.]+)/g,
      )) {
        const inner = new DOMPoint(Number(m[3]), Number(m[2]));
        const plank = planks.find((p) => p.isPointInFill(inner));
        seats.push(
          plank?.getAttribute("data-plank") ?? `(no plank at ${m[3]} ${m[2]})`,
        );
      }
      return seats;
    }, DRAWING)
    .then((seats) => [...new Set([...seats, ...LED_OUT_IN_3D])].sort());
}

/**
 * Led out in 3D only: seat 3.0's "8", aft of the stern from 768 px, where the turned stern leaves
 * its plank no place to clear the outline (.crew/sprint/33/early-look-iris.md, "Decision on must
 * 2"). The 2D drawing keeps it on its plank.
 */
const LED_OUT_IN_3D = ["3.0"];

/**
 * Each seat's own vellum, as points of a scan's grid (B5.19's band read), from the canvas's coverage
 * alone (`alpha`, over `clip` at DPR 1). The vellum is translucent, so its coverage has a few fill
 * levels (Pixel measured 0.70 for one layer and 0.91 for the near side over the far), and every line
 * moves a pixel off them: the near seams, the outline and the far side's seams showing through.
 * - The fill levels are the canvas's own: its two most common coverages over covered pixels.
 * - A point counts only where its pixel is on a fill level, so a led-out number's box and leader
 *   (3.0 and 5.0 from 768), which read a seat off the hull, and every line, read nothing.
 * - Points join where the pixels between them stay on that level, so a line parts them: the near
 *   sheer parts the near top strake from the far side's inside above it, both one layer.
 * - The sample is the part on the highest level, lowest on screen: the near side.
 * - A seat with no such point (a stern sliver at 390, its 2 px cells all on lines) takes the pixels
 *   of its cells' blocks that are on a fill level; the method says which.
 * A seat with neither is missing, and the caller fails it.
 */
export function plankCells(
  grid: Scan["grid"],
  alpha: Float32Array,
  clip: Box,
  step: number,
) {
  const w = clip.width;
  const at = (x: number, y: number) =>
    alpha[(Math.floor(y) - clip.y) * w + (Math.floor(x) - clip.x)] ?? 0;
  const bins = new Map<number, number>();
  let covered = 0;
  for (const a of alpha) {
    if (a < 0.5) continue;
    covered++;
    const bin = Math.round(a * 100);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }
  const levels = [...bins.entries()]
    .filter(([, n]) => n >= 0.05 * covered)
    .sort((p, q) => q[1] - p[1])
    .slice(0, 2)
    .map(([bin]) => bin / 100);
  const levelOf = (a: number) =>
    levels.find((level) => Math.abs(a - level) <= 0.015);
  const between = (a: [number, number], b: [number, number]) => {
    const level = levelOf(at(a[0], a[1]));
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let i = 1; i < n; i++) {
      const [x, y] = [
        a[0] + ((b[0] - a[0]) * i) / n,
        a[1] + ((b[1] - a[1]) * i) / n,
      ];
      if (levelOf(at(x, y)) !== level) return false;
    }
    return true;
  };
  const out = new Map<
    string,
    { cells: [number, number][]; method: "near side" | "sliver pixels" }
  >();
  for (const seat of new Set(grid.map(([, , s]) => s))) {
    const own = grid
      .filter(([, , s]) => s === seat)
      .map(([x, y]) => [x, y] as [number, number]);
    const clean = own.filter(([x, y]) => levelOf(at(x, y)) !== undefined);
    if (clean.length === 0) {
      const pixels: [number, number][] = [];
      const seen = new Set<string>();
      for (const [cx, cy] of own)
        for (let y = Math.floor(cy - step / 2); y < cy + step / 2; y++)
          for (let x = Math.floor(cx - step / 2); x < cx + step / 2; x++) {
            const k = `${x},${y}`;
            if (seen.has(k)) continue;
            seen.add(k);
            if (levelOf(at(x + 0.5, y + 0.5)) !== undefined)
              pixels.push([x + 0.5, y + 0.5]);
          }
      if (pixels.length)
        out.set(seat, { cells: pixels, method: "sliver pixels" });
      continue;
    }
    const key = ([x, y]: [number, number]) =>
      `${Math.round(x / step)},${Math.round(y / step)}`;
    const byKey = new Map(clean.map((c) => [key(c), c]));
    const left = new Set(byKey.keys());
    const parts: { level: number; cells: [number, number][] }[] = [];
    for (const start of clean) {
      if (!left.has(key(start))) continue;
      left.delete(key(start));
      const cells: [number, number][] = [];
      const queue = [start];
      while (queue.length) {
        const c = queue.pop() as [number, number];
        cells.push(c);
        for (const [dx, dy] of [
          [step, 0],
          [-step, 0],
          [0, step],
          [0, -step],
        ] as const) {
          const k = key([c[0] + dx, c[1] + dy]);
          const next = byKey.get(k);
          if (next && left.has(k) && between(c, next)) {
            left.delete(k);
            queue.push(next);
          }
        }
      }
      parts.push({ level: levelOf(at(start[0], start[1])) ?? 0, cells });
    }
    const meanY = (p: [number, number][]) =>
      p.reduce((sum, [, y]) => sum + y, 0) / p.length;
    const near = parts.sort(
      (p, q) => q.level - p.level || meanY(q.cells) - meanY(p.cells),
    )[0];
    if (near) out.set(seat, { cells: near.cells, method: "near side" });
  }
  return out;
}

/** The median colour of an image's pixels at a list of CSS px points, at DPR 1. */
export function medianAt(image: Image, points: [number, number][]) {
  const channels: number[][] = [[], [], []];
  for (const [x, y] of points) {
    const px = pixel(image, Math.floor(x), Math.floor(y));
    for (let i = 0; i < 3; i++) channels[i]?.push(px[i] ?? 0);
  }
  return channels.map((list) => {
    const s = [...list].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? Number.NaN;
  });
}

/**
 * Document navigations to a record, answered 204 No Content so the page stays where it is, at rest
 * (sprint 33, decision 12: a real landing reloads /log and rebuilds the model, 4 s a pick). Each is
 * recorded with whether it was a navigation of the main frame. A record's landing and h2 are checked
 * for real where the check names one width (1440), and every record's h2 by B5.6; elsewhere the
 * pick's work is the navigation's URL.
 */
export async function catchRecords(page: Page) {
  const seen: { path: string; navigation: boolean }[] = [];
  await page.route(/\/log\/\d+$/, async (route) => {
    const request = route.request();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      seen.push({ path: new URL(request.url()).pathname, navigation: true });
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });
  return {
    /** Runs `act`, then waits up to 5 s for a navigation to a record it caused: its path, or null. */
    async after(act: () => Promise<unknown>) {
      const before = seen.length;
      await act();
      const end = Date.now() + 5000;
      while (seen.length === before && Date.now() < end) await pause(25);
      return seen[before]?.path ?? null;
    },
    /** Navigations to a record caught so far. */
    count: () => seen.length,
    /** Takes the route away, so later navigations go through. */
    stop: () => page.unroute(/\/log\/\d+$/),
  };
}

/**
 * Whether the document at a record's path, fetched from the same server, holds that record's h2:
 * what a caught navigation would have landed on, read without leaving the page at rest.
 */
export async function servesRecord(page: Page, path: string, n: number) {
  const response = await page.request.get(path);
  if (response.status() !== 200) return `status ${response.status()}`;
  const html = await response.text();
  const h2 = await page.evaluate(
    ({ html, record }) =>
      new DOMParser()
        .parseFromString(html, "text/html")
        .querySelector(`${record} h2`)
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    { html, record: RECORD },
  );
  const goal = entryOf(n)?.goal ?? null;
  return h2 === goal ? null : `h2 "${h2}" against "${goal}"`;
}
