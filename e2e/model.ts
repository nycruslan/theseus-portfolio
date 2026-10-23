import type { Page, TestInfo } from "@playwright/test";
import { LENGTH } from "../lib/half-model";
import { type Layout, NARROW, WIDE } from "../lib/hull-layouts";
import { coverage, decodePng, encodePng, type Image } from "./pixels";
import type { ModelRun } from "./webgl";

// What the B3 checks share beyond the harness (.crew/sprint/25/contract.md, B3.1 to B3.9): the
// loft's constants as decision 7 states them, the selectors the contract names, and the
// screenshots with the rest of the page hidden that S4 and S5 measure on. Sprint 26
// (.crew/sprint/26/contract.md) runs the model at every width, on the drawing the page shows:
// `.plan-wide` from 768 px, `.plan-narrow` below it, each with its own cap and growth.

/** The loft's duration (notes-iris.md 1; decision 7 keeps it). */
export const DURATION = 2400;
/** The framed height follows (1 + GROW × e) × frame 1's (notes-iris.md 3; decision 7). */
const GROW = 0.1;
/**
 * The narrow drawing's growth: the framed height follows (1 + G_NARROW × e²) × frame 1's below
 * 768 px (sprint 26's contract, "The phone's loft"; Iris's call, .crew/sprint/26/notes-iris.md, 1;
 * on e², decision 9 of .crew/sprint/26/decisions.md, so the hull doesn't swell early and shrink).
 */
const G_NARROW = 0.25;
/**
 * The phone's settled turn, in degrees (spike S5's pose; notes-iris.md, 2), and how far a pose read
 * back from a frame may sit from it: Iris's tolerance for B3.2.
 */
export const POSE_NARROW = { yaw: -36, pitch: 16 };
export const POSE_TOLERANCE = 2;
/** Below this width the page shows `.plan-narrow`, from it `.plan-wide` (48rem). */
const BREAK = 768;
/** The drawing shown at a viewport width, and its layout in lib/hull-layouts.ts. */
export const drawingAt = (width: number) =>
  width < BREAK ? ".plan-narrow" : ".plan-wide";
export const layoutOf = (drawing: string): Layout =>
  drawing === ".plan-narrow" ? NARROW : WIDE;
/** The pixel-ratio cap at a width (sprint 26, "Quality"): 1.5 below 768 px, 2 from it. */
export const capAt = (width: number, dpr: number) =>
  Math.min(dpr, width < BREAK ? 1.5 : 2);
/** The most triangles a frame may submit at a width, line quads included: the level's budget. */
export const TRIANGLES_AT = (width: number) =>
  width < BREAK ? 12_000 : 30_000;
/**
 * The framed height at eased progress e as a multiple of frame 1's, on a drawing: (1 + GROW × e)
 * on the wide one, (1 + G_NARROW × e²) on the narrow one (decision 9).
 */
export const growth = (drawing: string, e: number) =>
  drawing === ".plan-narrow" ? 1 + G_NARROW * e * e : 1 + GROW * e;
/** The growth law as the checks' messages print it. */
export const growthLaw = (drawing: string) =>
  drawing === ".plan-narrow" ? `(1 + ${G_NARROW} e²)` : `(1 + ${GROW} e)`;
/** One frame at 60 fps, the clock's animation-frame step. */
export const FRAME = 1000 / 60;
const EASE_K = 7;
const EASE_IN = 0.05;

/** The eased progress, word for word from decision 7 (notes-iris.md 2). */
export function ease(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const t = Math.min(1, u / EASE_IN);
  return ((1 - 2 ** (-EASE_K * u)) / (1 - 2 ** -EASE_K)) * t * t * (3 - 2 * t);
}

export const MODEL = "[data-model]";
export const CANVAS = "[data-model] canvas";
export const TITLE = "main > header";
export const REVISIONS = 'section[aria-labelledby="revisions"]';
export const BAR = "header:has(nav)";
/** Every state with the canvas showing. */
export const SHOWN = ["landed", "lofting", "settled", "still"];
/** States at rest. */
export const REST = ["settled", "still"];
/** The first wait for the model: the chunk downloads and compiles on SwiftShader. */
export const FIRST = 45_000;

export type Box = { x: number; y: number; width: number; height: number };

/** An element's box in CSS px, from the viewport's top left (the checks shoot at scroll 0). */
export function box(page: Page, selector: string) {
  return page.evaluate((css) => {
    const el = document.querySelector(css);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, selector);
}

/** A box grown outward to whole CSS px, so two shots of it line up pixel for pixel. */
export function whole({ x, y, width, height }: Box): Box {
  const [left, top] = [Math.floor(x), Math.floor(y)];
  return {
    x: left,
    y: top,
    width: Math.ceil(x + width) - left,
    height: Math.ceil(y + height) - top,
  };
}

/**
 * A screenshot of `clip` with the whole page hidden but `keep` and what's inside it, every
 * background transparent: its alpha is `keep`'s coverage (S4's method). `extra` is more CSS for
 * the shot. The style goes again after it, so the page is as it was.
 */
async function solo(
  page: Page,
  keep: string,
  clip: Box,
  extra = "",
): Promise<Image> {
  const handle = await page.addStyleTag({
    content: `html, body, body * { visibility: hidden !important; background: transparent !important; box-shadow: none !important; text-shadow: none !important; }
${keep}, ${keep} * { visibility: visible !important; }
${extra}`,
  });
  const png = await page.screenshot({ clip, omitBackground: true });
  await handle.evaluate((style) => (style as Element).remove());
  return decodePng(png);
}

/** The model's coverage: the canvas alone. */
export function modelCoverage(page: Page, clip: Box) {
  return solo(page, CANVAS, clip).then((image) => ({
    image,
    alpha: coverage(image),
  }));
}

/**
 * The drawing's silhouette as the model's must lie on it: `.ln-outline` alone, filled, so the
 * hull's closed outline and its stroke cover what the model's card and outline cover.
 */
export function outlineCoverage(page: Page, clip: Box, drawing = ".plan-wide") {
  return solo(
    page,
    `${drawing} .ln-outline`,
    clip,
    `${drawing} .ln-outline { fill: #000 !important; stroke: #000 !important; opacity: 1 !important; }`,
  ).then((image) => ({ image, alpha: coverage(image) }));
}

/** The whole viewport as a visitor sees it. */
export async function view(page: Page) {
  return decodePng(await page.screenshot());
}

/**
 * The profile's columns in a drawing (the wide one unless named), in CSS px from the viewport's
 * left: up to the bow plus S4's 40-unit margin, so the body plan's midship section, also in the
 * wide drawing's `.ln-outline`, is left out. And the hull's box, the closed outline's.
 */
export function profile(page: Page, drawing = ".plan-wide") {
  const layout = layoutOf(drawing);
  return page.evaluate(
    ({ right, drawing }) => {
      const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
      const hull = document.querySelector<SVGPathElement>(
        `${drawing} clipPath path`,
      );
      const m = svg?.getScreenCTM();
      if (!svg || !hull || !m) return null;
      const b = hull.getBBox();
      return {
        limit: m.a * right + m.e,
        ctm: { a: m.a, d: m.d, e: m.e, f: m.f },
        hull: {
          x: m.a * b.x + m.e,
          y: m.d * b.y + m.f,
          width: m.a * b.width,
          height: m.d * b.height,
        },
      };
    },
    { right: layout.ox + LENGTH * layout.s + 40, drawing },
  );
}

/**
 * The drawing as a visitor sees it (B3.5, B3.14, B3.15): each shown plank's fill and alpha, the shown plank numbers and
 * the shown leaders. The hollow rule (notes-iris.md call 5) makes the fills transparent and hides
 * the numbers and leaders, so a leak of it shows in all three.
 */
export function drawing(page: Page) {
  return page.evaluate(() => {
    const seen = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const plan = document.querySelector("[data-plan]");
    const geometry = (el: Element) =>
      el instanceof SVGGeometryElement
        ? el
        : el.querySelector("path, polygon, rect, polyline, ellipse, circle");
    // A fill paints nothing when it is none, or its colour or opacities make it transparent.
    const alpha = (s: CSSStyleDeclaration) => {
      if (s.fill === "none" || s.fill === "transparent") return 0;
      const parts = s.fill.match(/^rgba?\((.*)\)$/)?.[1]?.split(/[\s,/]+/);
      const a = parts?.length === 4 ? Number(parts[3]) : 1;
      return a * Number(s.fillOpacity) * Number(s.opacity);
    };
    const planks = [...(plan?.querySelectorAll("[data-plank]") ?? [])]
      .filter(seen)
      .map((p) => {
        const g = geometry(p);
        const s = g ? getComputedStyle(g) : null;
        return {
          id: p.getAttribute("data-plank") ?? "",
          fill: s?.fill ?? "",
          alpha: s ? alpha(s) : 0,
        };
      });
    return {
      planks,
      numbers: [...(plan?.querySelectorAll(".plan-plank") ?? [])]
        .filter(seen)
        .map((n) => (n.textContent ?? "").trim())
        .sort(),
      leaders: [...(plan?.querySelectorAll(".ln-leader") ?? [])].filter(seen)
        .length,
    };
  });
}

export type Drawing = Awaited<ReturnType<typeof drawing>>;

/** Every text node's boxes in the document, as strings rounded to 0.01 px. */
export function textBoxes(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      if (node.parentElement?.closest("script, style, noscript, template"))
        continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        out.push(
          `"${node.textContent.trim().slice(0, 16)}" ${[r.left, r.top, r.width, r.height].map((v) => v.toFixed(2)).join(" ")}`,
        );
      }
    }
    return out;
  });
}

/**
 * The canvas's buffer, CSS size and DPR, and the shown drawing's box (`.plan-wide` from 768 px,
 * `.plan-narrow` below; `drawing` names it): the whole-pixel rule's inputs.
 */
export function canvasFit(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "[data-model] canvas",
    );
    const shown = [".plan-wide", ".plan-narrow"].find(
      (s) => (document.querySelector(s)?.getClientRects().length ?? 0) > 0,
    );
    const plan = shown
      ? document.querySelector(shown)?.getBoundingClientRect()
      : undefined;
    const r = canvas?.getBoundingClientRect();
    return {
      dpr: devicePixelRatio,
      buffer: canvas ? [canvas.width, canvas.height] : null,
      css: r ? [r.width, r.height] : null,
      at: r ? [r.left, r.top] : null,
      drawing: shown ?? null,
      plan: plan ? [plan.width, plan.height] : null,
      planAt: plan ? [plan.left, plan.top] : null,
    };
  });
}

/**
 * How far a ratio read as buffer / CSS may sit from the cap: the buffer is whole pixels and the CSS
 * size the buffer over the ratio, so the two agree to rounding.
 */
export const RATIO_EPSILON = 1e-3;

/** A frame's pixel ratio, its buffer's width over its CSS width. */
export const ratioOf = (frame: { buffer: number[]; css: number[] }) =>
  (frame.buffer[0] ?? 0) / (frame.css[0] || Number.NaN);

/** The page's clock time, performance.now(), which Playwright's clock drives. */
function now(page: Page) {
  return page.evaluate(() => performance.now());
}

/** With the clock: runs it to `t`, firing every timer and frame on the way. */
export async function runTo(run: ModelRun, t: number) {
  const at = await now(run.page);
  if (t > at) await run.step(Math.ceil(t - at));
}

/** Waits in real time, from the test: the page's own timers may be on the clock. */
export const pause = (ms: number) =>
  new Promise((done) => setTimeout(done, ms));

/**
 * Chromium's touch slop, CSS px: a drag scrolls only once the finger has moved this far, so a
 * drag of d px scrolls d less about 15 (measured: 150 px dragged, 135 scrolled).
 */
export const TOUCH_SLOP = 16;

/**
 * A finger dragged up the screen from (x, y) by `distance` CSS px in 10 moves a frame apart, then
 * held still before it lifts, so the page scrolls by the drag and doesn't fling on. Needs a
 * context with touch. Real input through the protocol: Playwright's touchscreen only taps.
 */
export async function touchDrag(
  page: Page,
  x: number,
  y: number,
  distance: number,
) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", at: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y: at }],
    });
  await touch("touchStart", y);
  for (let i = 1; i <= 10; i++) {
    await touch("touchMove", y - (distance * i) / 10);
    await pause(16);
  }
  for (let i = 0; i < 6; i++) {
    await pause(50);
    await touch("touchMove", y - distance);
  }
  await touch("touchEnd", y - distance);
  await cdp.detach();
}

/** Attaches an image to the test's report. */
export async function attach(testInfo: TestInfo, name: string, image: Image) {
  await testInfo.attach(name, {
    body: encodePng(image),
    contentType: "image/png",
  });
}

/** A number for the report, beside its floor note. */
export function note(testInfo: TestInfo, type: string, description: string) {
  testInfo.annotations.push({ type, description });
  console.log(`[${type}] ${description}`);
}

/** Median, p95 and max of a list. */
export function stats(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  const q = (p: number) =>
    v[Math.min(v.length - 1, Math.floor(p * v.length))] ?? Number.NaN;
  return {
    n: v.length,
    median: +q(0.5).toFixed(2),
    p95: +q(0.95).toFixed(2),
    max: +(v.at(-1) ?? Number.NaN).toFixed(2),
  };
}
