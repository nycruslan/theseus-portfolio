import type { Page } from "@playwright/test";

// What the B1 checks read from the hull, whichever way the SVG is drawn (sprint 16,
// .studio/sprint/16/specs-probe.md): the planks' real shapes, not their elements' boxes. A plank
// may be a clipped rect (the prototype's) or a path of its own; a bounding box would then be the
// unclipped rect, which says nothing about what is painted. So each plank's shape is rebuilt from
// its geometry and the clip paths on it and its ancestors, and sampled on a grid in the SVG's own
// units, then mapped to the page through the element's screen matrix.

const BOX = "[data-hero]";
const PLANK = "[data-hero-plank]";

/** Planks per lift, deck first, as the prototype draws them (22 in all). */
export const PLANKS_PER_LIFT = [3, 4, 3, 4, 3, 3, 2] as const;

/** The shipwright's order, copied from .studio/sprint/15/direction-iris.md, section 4. */
export const ORDER = [
  "5.1",
  "3.2",
  "1.1",
  "6.0",
  "4.2",
  "0.1",
  "2.0",
  "3.0",
  "5.2",
  "1.3",
  "4.0",
  "0.2",
  "6.1",
  "2.1",
  "1.2",
  "3.1",
  "4.1",
  "2.2",
  "5.0",
  "3.3",
  "0.0",
  "1.0",
] as const;

/** DOM index of the plank `lift.plank` names, the planks being listed deck first, stern to bow. */
function domIndex(place: string) {
  const [lift = 0, plank = 0] = place.split(".").map(Number);
  return (
    PLANKS_PER_LIFT.slice(0, lift).reduce((sum, count) => sum + count, 0) +
    plank
  );
}

/** The `lift.plank` name of the plank at a DOM index, for messages. */
export const placeOf = (index: number) =>
  ORDER.find((place) => domIndex(place) === index) ?? "?";

/** Where sprint n's plank sits, in DOM order. */
export const plankOfSprint = (n: number) =>
  domIndex(ORDER[(n - 1) % ORDER.length] ?? "0.0");

export type Tone = [number, number, number, number];

export type PlankReading = {
  index: number;
  tag: string;
  sprint: string | null;
  copper: boolean;
  /** The computed `fill`, as the page states it. */
  fill: string;
  /** That fill as sRGB with alpha 0 to 1, or null if it is not a plain colour the canvas can parse. */
  tone: Tone | null;
  /** Sampled share of the shape inside the viewport and the hero's box, at the current scroll. */
  visible: number;
  samples: number;
  centroid: { x: number; y: number };
  /** Points well inside the shape, in client px (only when asked for). */
  heart: [number, number][];
};

/** Every `[data-hero-plank]`, in document order. Scroll to where it is to be read first. */
export async function readPlanks(
  page: Page,
  options: { heart?: boolean; step?: number } = {},
) {
  return page.evaluate(
    ({ plank, box, heart, step }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no 2d canvas");
      const read = (css: string, sentinel: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = sentinel;
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      // Two sentinels: a colour the canvas cannot parse comes back as each of them.
      const resolve = (
        css: string,
      ): [number, number, number, number] | null => {
        const [a, b] = [read(css, "#000000"), read(css, "#ffffff")];
        if (a.join() !== b.join()) return null;
        const [r = 0, g = 0, bl = 0, al = 0] = a;
        return [r, g, bl, al / 255];
      };

      type Shape = {
        inside: (x: number, y: number) => boolean;
        bbox: DOMRect;
      };
      const shapeOf = (node: Element): Shape | null => {
        if (node instanceof SVGRectElement) {
          const [x, y, w, h] = [
            node.x.baseVal.value,
            node.y.baseVal.value,
            node.width.baseVal.value,
            node.height.baseVal.value,
          ];
          return {
            inside: (px, py) =>
              px >= x && px <= x + w && py >= y && py <= y + h,
            bbox: node.getBBox(),
          };
        }
        if (node instanceof SVGPathElement) {
          const path = new Path2D(node.getAttribute("d") ?? "");
          return {
            inside: (px, py) => ctx.isPointInPath(path, px, py),
            bbox: node.getBBox(),
          };
        }
        return null;
      };

      const hero = document.querySelector(box);
      const boxRect = hero?.getBoundingClientRect();
      const [vw, vh] = [document.documentElement.clientWidth, innerHeight];

      return [...document.querySelectorAll(plank)].map((el, index) => {
        const own = shapeOf(el);
        const clips: Shape[] = [];
        const svg = (el as SVGElement).ownerSVGElement;
        for (let n: Element | null = el; n; n = n.parentElement) {
          const ref = /url\(["']?#([^"')]+)/.exec(
            getComputedStyle(n).clipPath,
          )?.[1];
          const children = ref
            ? [...(document.getElementById(ref)?.children ?? [])]
                .map(shapeOf)
                .filter((s): s is Shape => s !== null)
            : [];
          if (children.length > 0) {
            const left = Math.min(...children.map((s) => s.bbox.x));
            const top = Math.min(...children.map((s) => s.bbox.y));
            const right = Math.max(
              ...children.map((s) => s.bbox.x + s.bbox.width),
            );
            const bottom = Math.max(
              ...children.map((s) => s.bbox.y + s.bbox.height),
            );
            clips.push({
              inside: (x, y) => children.some((s) => s.inside(x, y)),
              bbox: new DOMRect(left, top, right - left, bottom - top),
            });
          }
          if (n === svg) break;
        }
        const style = getComputedStyle(el);
        const base = {
          index,
          tag: el.tagName.toLowerCase(),
          sprint: el.getAttribute("data-sprint"),
          copper: el.hasAttribute("data-hero-copper"),
          fill: style.fill,
          tone: style.fill.startsWith("url(") ? null : resolve(style.fill),
        };
        const matrix = (el as SVGGraphicsElement).getScreenCTM();
        if (!(own && matrix)) {
          return {
            ...base,
            visible: Number.NaN,
            samples: 0,
            centroid: { x: Number.NaN, y: Number.NaN },
            heart: [] as [number, number][],
          };
        }
        const shapes = [own, ...clips];
        const x0 = Math.max(...shapes.map((s) => s.bbox.x));
        const y0 = Math.max(...shapes.map((s) => s.bbox.y));
        const x1 = Math.min(...shapes.map((s) => s.bbox.x + s.bbox.width));
        const y1 = Math.min(...shapes.map((s) => s.bbox.y + s.bbox.height));
        const inShape = (x: number, y: number) =>
          shapes.every((s) => s.inside(x, y));
        const reach = 3 / Math.max(matrix.a, 1e-6);
        let samples = 0;
        let seen = 0;
        let sumX = 0;
        let sumY = 0;
        const points: [number, number][] = [];
        for (let y = y0 + step / 2; y < y1; y += step) {
          for (let x = x0 + step / 2; x < x1; x += step) {
            if (!inShape(x, y)) continue;
            samples++;
            sumX += x;
            sumY += y;
            const at = new DOMPoint(x, y).matrixTransform(matrix);
            if (
              at.x >= 0 &&
              at.x <= vw &&
              at.y >= 0 &&
              at.y <= vh &&
              boxRect &&
              at.x >= boxRect.left &&
              at.x <= boxRect.right &&
              at.y >= boxRect.top &&
              at.y <= boxRect.bottom
            ) {
              seen++;
            }
            if (
              heart &&
              samples % 7 === 0 &&
              inShape(x - reach, y) &&
              inShape(x + reach, y) &&
              inShape(x, y - reach) &&
              inShape(x, y + reach)
            ) {
              points.push([at.x, at.y]);
            }
          }
        }
        return {
          ...base,
          visible: samples > 0 ? seen / samples : 0,
          samples,
          centroid: { x: sumX / samples, y: sumY / samples },
          heart: points,
        };
      });
    },
    {
      plank: PLANK,
      box: BOX,
      heart: options.heart ?? false,
      step: options.step ?? 1,
    },
  ) as Promise<PlankReading[]>;
}
