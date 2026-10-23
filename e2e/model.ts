import type { Page, TestInfo } from "@playwright/test";
import { LENGTH } from "../lib/half-model";
import { WIDE } from "../lib/hull-layouts";
import { coverage, decodePng, encodePng, type Image } from "./pixels";
import type { ModelRun } from "./webgl";

// What the B3 checks share beyond the harness (.crew/sprint/25/contract.md, B3.1 to B3.9): the
// loft's constants as decision 7 states them, the selectors the contract names, and the
// screenshots with the rest of the page hidden that S4 and S5 measure on.

/** The loft's duration (notes-iris.md 1; decision 7 keeps it). */
export const DURATION = 2400;
/** The framed height follows (1 + GROW × e) × frame 1's (notes-iris.md 3; decision 7). */
export const GROW = 0.1;
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
export function outlineCoverage(page: Page, clip: Box) {
  return solo(
    page,
    ".plan-wide .ln-outline",
    clip,
    ".plan-wide .ln-outline { fill: #000 !important; stroke: #000 !important; opacity: 1 !important; }",
  ).then((image) => ({ image, alpha: coverage(image) }));
}

/** The whole viewport as a visitor sees it. */
export async function view(page: Page) {
  return decodePng(await page.screenshot());
}

/**
 * The profile's columns in the wide drawing, in CSS px from the viewport's left: up to the bow
 * plus S4's 40-unit margin, so the body plan's midship section, also in `.ln-outline`, is left
 * out. And the hull's box, the closed outline's.
 */
export function profile(page: Page) {
  return page.evaluate(
    ({ right }) => {
      const svg = document.querySelector<SVGSVGElement>(".plan-wide svg");
      const hull = document.querySelector<SVGPathElement>(
        ".plan-wide clipPath path",
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
    { right: WIDE.ox + LENGTH * WIDE.s + 40 },
  );
}

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

/** The canvas's buffer, CSS size and DPR, and `.plan-wide`'s box: the whole-pixel rule's inputs. */
export function canvasFit(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "[data-model] canvas",
    );
    const plan = document.querySelector(".plan-wide")?.getBoundingClientRect();
    const r = canvas?.getBoundingClientRect();
    return {
      dpr: devicePixelRatio,
      buffer: canvas ? [canvas.width, canvas.height] : null,
      css: r ? [r.width, r.height] : null,
      at: r ? [r.left, r.top] : null,
      plan: plan ? [plan.width, plan.height] : null,
      planAt: plan ? [plan.left, plan.top] : null,
    };
  });
}

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
