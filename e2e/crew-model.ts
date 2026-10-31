import type { Browser, Page, Route } from "@playwright/test";
import { MOTION } from "./helpers";
import { type Box, pause } from "./model";
import { coverage, decodePng, type Image, pixel } from "./pixels";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";

// What /crew's 3D checks share (.crew/sprint/36/contract.md, B4.36 to B4.40): B3's harness
// (e2e/webgl.ts) pointed at /crew, with `page.route` answering `/api/crew` where a check drives the
// poll. The hooks are the contract's: `[data-model]` right after `[data-plan]`, its `data-state`
// and `data-marks`, its one canvas; the drawing is the svg in `[data-plan]` that has a box.

const SHOWN_SVG = "[data-plan] svg";
/** Below 768 the phone's level and the 1.5x cap, from 768 the desktop's and 2x. */
export const capAt = (width: number, dpr: number) =>
  Math.min(dpr, width < 768 ? 1.5 : 2);
/** Layout's precision: Chromium keeps lengths in 1/64 CSS px. */
export const LAYOUT = 1 / 64;
/** Full's one move (Iris: 1,800 ms on ease(), once a visit). */
export const MOVE = 1800;

export type Reply = { json: unknown } | { status: number } | { hold: true };

export type CrewRun = ModelRun & {
  /** Polls the route has seen. */
  polls(): number;
  /** What the route answers from now on. */
  answer(reply: Reply): void;
  /** Answers every held poll with `reply`. */
  release(reply: Reply): Promise<void>;
  /**
   * On the clock: runs it `ms`, waits for a poll that fires to reach the route and settle, then
   * runs one more frame for the redraw it asks for. The new polls.
   */
  tick(ms: number): Promise<number>;
};

async function fulfil(route: Route, reply: Reply) {
  if ("hold" in reply) return;
  await route
    .fulfill({
      status: "status" in reply ? reply.status : 200,
      contentType: "application/json",
      headers: { "cache-control": "public, max-age=0, s-maxage=30" },
      body:
        "json" in reply
          ? JSON.stringify(reply.json)
          : '{"error":"Not answering"}',
    })
    .catch(() => undefined);
}

/**
 * B3's harness on a page whose `/api/crew` the route answers with `first` (none: the site answers
 * itself). Nothing is opened: `goto` does that, as with openModel.
 */
export async function openCrewModel(
  browser: Browser,
  options: ModelOptions,
  first?: Reply,
): Promise<CrewRun> {
  const run = await openModel(browser, options);
  let next = first;
  let seen = 0;
  const held: Route[] = [];
  const answering: Promise<void>[] = [];
  if (first) {
    await run.page.route("**/api/crew", (route) => {
      if (route.request().method() !== "GET") return route.continue();
      seen += 1;
      if (!next || "hold" in next) {
        held.push(route);
        return;
      }
      const done = fulfil(route, next);
      answering.push(done);
      return done;
    });
  }
  return {
    ...run,
    polls: () => seen,
    answer(reply) {
      next = reply;
    },
    async release(reply) {
      await Promise.all(held.splice(0).map((route) => fulfil(route, reply)));
      await pause(250);
    },
    async tick(ms) {
      await Promise.all(answering);
      const before = seen;
      await run.page.clock.runFor(ms);
      const end = Date.now() + 800;
      while (seen === before && Date.now() < end) await pause(25);
      await Promise.all(answering);
      await pause(250);
      await run.page.clock.runFor(17);
      await pause(150);
      return seen - before;
    },
  };
}

/** The shown drawing's svg box and the canvas: B4.36's fit. */
export function crewFit(page: Page) {
  return page.evaluate((selector) => {
    const svg = [...document.querySelectorAll(selector)].find(
      (s) => !s.closest("defs, pattern") && s.getClientRects().length > 0,
    );
    const canvas = document.querySelector<HTMLCanvasElement>(
      "[data-model] canvas",
    );
    const s = svg?.getBoundingClientRect();
    const c = canvas?.getBoundingClientRect();
    const plan = document.querySelector("[data-plan]");
    return {
      svg: s ? { x: s.left, y: s.top, width: s.width, height: s.height } : null,
      canvas: c
        ? { x: c.left, y: c.top, width: c.width, height: c.height }
        : null,
      buffer: canvas ? [canvas.width, canvas.height] : null,
      canvases: document.querySelectorAll("[data-model] canvas").length,
      next: Boolean(plan?.nextElementSibling?.matches("[data-model]")),
      models: document.querySelectorAll("[data-model]").length,
    };
  }, SHOWN_SVG);
}

/** The canvas alone over a transparent page, clipped to `clip`. */
export async function canvasOnly(page: Page, clip: Box) {
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

/**
 * The 2D hull's silhouette, as B3.1 reads `/`'s: the hull's outline filled black, with its own
 * stroke, everything else hidden. The outline is the drawn path whose `d` is the hull clip's (the
 * path the planks are clipped to), found by geometry, not class; it is marked `data-probe-hull`,
 * on a WebGL-refused page only, where no model reads the drawing. Without one, the planks filled
 * (their union is the hull, but without the outline's stroke). The clip paths stay visible: a
 * hidden clipPath child clips everything away.
 */
export async function planksAlone(page: Page, clip: Box) {
  const outlined = await page.evaluate(() => {
    const svg = [...document.querySelectorAll("[data-plan] svg")].find(
      (s) => !s.closest("defs, pattern") && s.getClientRects().length > 0,
    );
    const id = svg
      ?.querySelector("[data-plank]")
      ?.closest("[clip-path]")
      ?.getAttribute("clip-path")
      ?.match(/url\(["']?#([^"')]+)/)?.[1];
    const hull = id ? svg?.querySelector(`[id="${id}"] path`) : null;
    const d = hull?.getAttribute("d");
    const drawn = d
      ? [...(svg?.querySelectorAll("path") ?? [])].find(
          (p) => !p.closest("defs, clipPath") && p.getAttribute("d") === d,
        )
      : null;
    drawn?.setAttribute("data-probe-hull", "");
    return Boolean(drawn);
  });
  const handle = await page.addStyleTag({
    content: `html, body, body * { visibility: hidden !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
[data-plan] svg clipPath, [data-plan] svg clipPath * { visibility: visible !important; }
${
  outlined
    ? "[data-probe-hull] { visibility: visible !important; fill: #000 !important; stroke: #000 !important; stroke-dasharray: none !important; opacity: 1 !important; }"
    : "[data-plan] svg path[data-plank] { visibility: visible !important; fill: #000 !important; stroke: #000 !important; stroke-width: 2px !important; stroke-dasharray: none !important; opacity: 1 !important; }"
}`,
  });
  const image = decodePng(
    await page.screenshot({ clip, omitBackground: true }),
  );
  await handle.evaluate((style) => (style as Element).remove());
  return { image, alpha: coverage(image), outlined };
}

/**
 * A point inside each shown plank, CSS px, 3 units clear of its edges and the hull's outline and
 * 3 px clear of the lettering, the ticks and the tip: where its fill reads alone.
 */
export function plankPoints(page: Page) {
  return page.evaluate((selector) => {
    const svg = [...document.querySelectorAll<SVGSVGElement>(selector)].find(
      (s) => !s.closest("defs, pattern") && s.getClientRects().length > 0,
    );
    const m = svg?.getScreenCTM();
    if (!svg || !m) return [];
    const planks = [
      ...svg.querySelectorAll<SVGPathElement>("path[data-plank]"),
    ];
    const clipId = planks[0]
      ?.closest("[clip-path]")
      ?.getAttribute("clip-path")
      ?.match(/url\(["']?#([^"')]+)/)?.[1];
    const hull = clipId
      ? svg.querySelector(`[id="${clipId}"] path, [id="${clipId}"] *`)
      : null;
    const avoid = [
      ...document.querySelectorAll("[data-plan] span, [data-plan] text"),
      ...svg.querySelectorAll("[data-mark], [data-tip]"),
    ].map((n) => n.getBoundingClientRect());
    const svgBox = svg.getBoundingClientRect();
    const css = (x: number, y: number) => ({
      x: m.a * x + m.e,
      y: m.d * y + m.f,
    });
    const margin = 3;
    const ring = [
      [0, 0],
      [-margin, 0],
      [margin, 0],
      [0, -margin],
      [0, margin],
    ] as const;
    return planks.map((plank) => {
      const b = plank.getBBox();
      const [cx, cy] = [b.x + b.width / 2, b.y + b.height / 2];
      let best: { x: number; y: number; d: number } | null = null;
      for (let x = b.x; x <= b.x + b.width; x += 2)
        for (let y = b.y; y <= b.y + b.height; y += 1) {
          const d = Math.hypot(x - cx, y - cy);
          if (best && d >= best.d) continue;
          const ok = ring.every(([dx, dy]) => {
            const p = new DOMPoint(x + dx, y + dy);
            return (
              plank.isPointInFill(p) &&
              (!(hull instanceof SVGGeometryElement) || hull.isPointInFill(p))
            );
          });
          if (!ok) continue;
          const c = css(x, y);
          if (
            c.x < svgBox.left + 3 ||
            c.x > svgBox.right - 3 ||
            c.y < svgBox.top + 3 ||
            c.y > svgBox.bottom - 3
          )
            continue;
          if (
            avoid.some(
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
    });
  }, SHOWN_SVG);
}

/** The largest channel difference between two images at a CSS point. */
export function deltaAt(a: Image, b: Image, x: number, y: number, dpr = 1) {
  const [p, q] = [pixel(a, x * dpr, y * dpr), pixel(b, x * dpr, y * dpr)];
  return Math.max(...[0, 1, 2].map((c) => Math.abs((p[c] ?? 0) - (q[c] ?? 0))));
}

/**
 * The box (CSS px, relative to the image) of the pixels where two images of the same size differ
 * by more than `threshold` in any channel, or null when none do.
 */
export function differs(a: Image, b: Image, threshold = 12) {
  let box: { left: number; top: number; right: number; bottom: number } | null =
    null;
  let count = 0;
  for (let y = 0; y < Math.min(a.height, b.height); y++)
    for (let x = 0; x < Math.min(a.width, b.width); x++) {
      const i = (y * a.width + x) * 4;
      const j = (y * b.width + x) * 4;
      let d = 0;
      for (let c = 0; c < 4; c++)
        d = Math.max(d, Math.abs((a.data[i + c] ?? 0) - (b.data[j + c] ?? 0)));
      if (d <= threshold) continue;
      count++;
      box = box
        ? {
            left: Math.min(box.left, x),
            top: Math.min(box.top, y),
            right: Math.max(box.right, x + 1),
            bottom: Math.max(box.bottom, y + 1),
          }
        : { left: x, top: y, right: x + 1, bottom: y + 1 };
    }
  return { box, count };
}

/** `data-marks` on `[data-model]`, as a number (NaN without it). */
export const marksDrawn = (page: Page) =>
  page.evaluate(() =>
    Number(document.querySelector("[data-model]")?.getAttribute("data-marks")),
  );

/** The shown slot's button named `label`, pressed with the mouse at its centre (clock-safe). */
export async function pressMode(page: Page, label: string) {
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
  if (at) await page.mouse.click(at.x, at.y);
  return at !== null;
}
