import type { Page } from "@playwright/test";
import { profile as keel, seamDepth, sheer } from "../lib/half-model";
import { PLANKS } from "../lib/hull-layouts";
import type { CrewState } from "./crew";
import { pencilSeat } from "./live-layer";
import { MERGED, SEAT_OF } from "./retros";

// The oracle for B4d, the detail drawing on /crew (.crew/sprint/36/contract.md, "Data rules": the
// detail drawing, the crop, the lettering and a tick, with Iris's three amendments,
// .crew/sprint/36/decisions.md, 6), in this suite's own lines from the contract's words, never the
// page's code. The hull's shape (lib/half-model.ts) and its plank boxes (PLANKS) are the ground
// every drawing shares; the layouts' numbers, the seat's body, f, the ticks' slots, the number's
// anchor and the focus point are written here. The page readers name no class: the shown drawing
// is the `svg` in `[data-plan]` with a box, and the hooks are the contract's (`data-focus`,
// `data-run`, `[data-mark]`, `[data-tip]`, the pencil's `data-pencil`, `data-sprint`, `data-live`).

export type Run = "live" | "open" | "inked" | "record";

/** A detail layout: its viewBox, its scale (hull units to viewBox units) and its oy. */
export type Detail = {
  name: "CREW_WIDE" | "CREW_NARROW";
  box: readonly [number, number, number, number];
  s: number;
  oy: number;
};

/**
 * From 768 px: 480 hull units across (.crew/sprint/36/notes-iris.md, section 2, which wins over
 * the contract's 320 units and 16:9). The checks read the map off the drawing's own planks
 * (`fitOf`) and hold s, oy and the crop's ox (`cropX`) to these.
 */
const CREW_WIDE: Detail = {
  name: "CREW_WIDE",
  box: [0, 0, 808, 454.5],
  s: 1.68333,
  oy: 109.08,
};
/** Below 768 px: 320 hull units across. */
const CREW_NARROW: Detail = {
  name: "CREW_NARROW",
  box: [0, 0, 390, 243.75],
  s: 1.21875,
  oy: 48.75,
};
export const detailAt = (width: number) =>
  width >= 768 ? CREW_WIDE : CREW_NARROW;

/**
 * Iris's widths for the shown drawing, CSS px, by viewport width (notes-iris.md, section 2: 566.8
 * at 1024; from 768 to 1023 the content width inside 16 px gutters, her early look on Forge's
 * build, which replaced section 2's 600); the height follows from the layout's box, since the
 * drawing keeps its viewBox's shape.
 */
export const DETAIL_SIZES: { width: number; w: number }[] = [
  { width: 1440, w: 808 },
  { width: 1024, w: 566.8 },
  { width: 768, w: 768 - 32 },
  { width: 390, w: 358 },
  { width: 320, w: 288 },
];

/**
 * A tick (amendment 1, MARKS): it hangs from the pencil plank's lower edge, `length` hull units
 * down; slot k (0 nearest the dot) at tip − (first + pitch·k)·f; at most 10.
 */
export const TICK = { length: 4, max: 10, first: 10, pitch: 5 };
/** The focus point in live and open, aft of the tip in units of f: the tally's middle. */
const TALLY_MIDDLE = 27.5;
/** The pencil number's place: min(body middle, tip − 20) (B4b's, amendment 1). */
const NUMBER_AFT = 20;
/** f = min(1, (tip − xs − 2) / 55), xs the sternmost x whose band is at least 2 deep (`deep`). */
const F_SLACK = 2;
const F_LENGTH = 55;
const XS_DEPTH = 2;
/** The crop (notes-iris.md, section 2): the margin's share of the width, and the stern's limit. */
const MARGIN = 0.12;
const MIDSHIP = 312;
const TALLY_AFT = 55;

const LIFT_DEPTH = seamDepth(1) - seamDepth(0);

type Plank = (typeof PLANKS)[number];
const plankOf = (seat: string) => {
  const plank = PLANKS.find((p) => p.id === seat);
  if (!plank) throw new Error(`no plank ${seat}`);
  return plank;
};

/** The plank's band at station x: its top and bottom (the hull's sheer and keel cut it). */
function band(plank: Plank, x: number): [number, number] | null {
  const top = Math.max(plank.yTop, sheer(x));
  const bottom = Math.min(plank.yBot, keel(x));
  return bottom - top > 0.05 ? [top, bottom] : null;
}

type Point = [number, number];

/**
 * A seat's geometry in hull units: its body (where it is nearly a whole lift deep, or nearly as
 * deep as it ever gets: B4b's body, the stretch the tip runs 1/2 to 7/8 of), the tip (the dot's x,
 * PENCIL.tip.to of the body), xs, f, the slots, the numbers' anchors and the focus point.
 */
export function seatGeometry(seat: string) {
  const plank = plankOf(seat);
  const stations = Array.from({ length: 49 }, (_, i) => {
    const x = plank.x0 + ((plank.x1 - plank.x0) * i) / 48;
    const b = band(plank, x);
    return { x, depth: b ? b[1] - b[0] : 0 };
  });
  const deepest = Math.max(...stations.map((s) => s.depth));
  const deep = stations.filter(
    (s) => s.depth >= 0.9 * Math.min(deepest, LIFT_DEPTH),
  );
  const body: Point = [deep[0]?.x ?? NaN, deep.at(-1)?.x ?? NaN];
  const tip = body[0] + (body[1] - body[0]) * (7 / 8);
  let xs = Number.NaN;
  for (let x = plank.x0; x <= plank.x1; x += 0.01) {
    const b = band(plank, x);
    if (b && b[1] - b[0] >= XS_DEPTH) {
      xs = x;
      break;
    }
  }
  const f = Math.min(1, (tip - xs - F_SLACK) / F_LENGTH);
  /** The plank's lower edge at x: the seam, or the keel's outline where the keel cuts it. */
  const bottom = (x: number) => Math.min(plank.yBot, keel(x));
  const mid = (x: number) => {
    const b = band(plank, x);
    return b ? (b[0] + b[1]) / 2 : bottom(x);
  };
  const middle = (body[0] + body[1]) / 2;
  const numberX = Math.min(middle, tip - NUMBER_AFT);
  const focusX = tip - TALLY_MIDDLE * f;
  return {
    plank,
    body,
    tip,
    xs,
    f,
    bottom,
    /** Slot k's x (0 nearest the dot). */
    slot: (k: number) => tip - (TICK.first + TICK.pitch * k) * f,
    /** The pencil number's anchor, in live and open. */
    number: [numberX, mid(numberX)] as Point,
    /** A seated plank's number anchor: the body middle, at the band's mid-depth. */
    seated: [middle, mid(middle)] as Point,
    /** The focus point in live and open: on the lower edge at the tally's middle. */
    focus: [focusX, bottom(focusX)] as Point,
    dot: [tip, bottom(tip)] as Point,
  };
}

/** The newest retro's sprint: the revision block's top (readSprintLog()[0]). */
export const NEWEST = MERGED.at(-1)?.sprint ?? Number.NaN;

/**
 * Call 2's focus: in live and open with a sprint number, the pencil seat (B4b's rule); otherwise
 * the newest retro's seat.
 */
export function focusOf(state: CrewState, n: number | null) {
  if ((state === "live" || state === "open") && n !== null)
    return pencilSeat(n);
  return SEAT_OF.get(NEWEST) ?? "";
}

/** The server's `data-run` for the page's state (call 3): live, open, or record. */
export const serverRun = (state: CrewState, n: number | null): Run =>
  (state === "live" || state === "open") && n !== null ? state : "record";

/**
 * The crop's centre xc and the ox it gives on a layout (notes-iris.md, section 2): the hull's end
 * nearest the focus plank, clamped so the tally keeps a margin of 0.12 of the width; `pencilled`
 * when the server drew the seat in pencil (the tally is L to R), else the number's ± 20.
 */
export function cropX(detail: Detail, seat: string, pencilled: boolean) {
  const g = seatGeometry(seat);
  const across = detail.box[2] / detail.s;
  const margin = MARGIN * across;
  const centre = (g.plank.x0 + g.plank.x1) / 2;
  const anchored =
    centre < MIDSHIP ? across / 2 - 20 : 2 * MIDSHIP + 20 - across / 2;
  const [left, right] = pencilled
    ? [Math.min(g.tip - TALLY_AFT * g.f, g.number[0] - 6), g.tip + 2]
    : [g.seated[0] - 20, g.seated[0] + 20];
  const lo = right + margin - across / 2;
  const hi = left - margin + across / 2;
  const xc =
    lo > hi ? (left + right) / 2 : Math.min(hi, Math.max(lo, anchored));
  return { xc, ox: detail.box[0] + detail.box[2] / 2 - xc * detail.s };
}

// ---------------------------------------------------------------------------------------------
// The page

export type Box = { left: number; top: number; right: number; bottom: number };
type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type DetailRead = {
  plans: number;
  focus: string | null;
  run: string | null;
  /** The shown svgs in [data-plan] (one, when the page is right), and the first one's reads. */
  svgs: number;
  svg: Box | null;
  viewBox: string | null;
  /** The shown svg's user space to CSS px. */
  ctm: Matrix | null;
  planks: {
    id: string;
    sprint: string | null;
    className: string;
    pencil: boolean;
    live: boolean;
    d: string;
    /** Its geometry's box in user units. */
    bbox: { x: number; y: number; width: number; height: number } | null;
  }[];
  /** The shown pencil plank: its box (CSS px) and paint. */
  pencil: {
    id: string;
    box: Box;
    fill: string;
    stroke: number[] | null;
    dash: string;
    strokeWidth: number;
  }[];
  /** The shown ticks, in DOM order: each one's geometry box and its stroke box, paint and motion. */
  marks: {
    line: Box;
    box: Box;
    cx: number;
    stroke: number[] | null;
    strokeRaw: string;
    width: string;
    motion: string[];
  }[];
  /** The [data-tip]s in the shown svg, and the dot's centre (CSS px): the run's forward end. */
  tips: number;
  dot: { x: number; y: number } | null;
  /** Shown figures in [data-plan] (its own text all digits), with where they sit. */
  numbers: {
    text: string;
    box: Box;
    onFocus: boolean;
    color: number[] | null;
    weight: number;
    /** Its own background, null when transparent: a chip. */
    chip: number[] | null;
    /** The planks a `path.ln-leader` subpath joins it to: starting within 6 px of its box. */
    ledTo: string[];
    /** No plank's fill under its box's corners or centre: it stands on the film, off the hull. */
    onFilm: boolean;
    /** The first painted background from its parent up: what it stands on without a chip. */
    ground: number[] | null;
  }[];
};

/** The detail drawing as the browser has it. Needs installRgba for the colours (null without). */
export function readDetail(page: Page): Promise<DetailRead> {
  return page.evaluate(() => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const colour = (c: string) => (rgba ? rgba(c) : null);
    const rect = (r: Box) => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    });
    const shown = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const plans = document.querySelectorAll("[data-plan]");
    const plan = plans[0];
    const svgs = plan
      ? [...plan.querySelectorAll("svg")].filter(
          (s) => !s.closest("defs, pattern") && shown(s),
        )
      : [];
    const svg = svgs[0] ?? null;
    const m = svg?.getScreenCTM() ?? null;
    const toCss = (x: number, y: number): [number, number] =>
      m ? [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f] : [NaN, NaN];
    const inv = m?.inverse() ?? null;
    const toUser = (x: number, y: number) =>
      inv
        ? new DOMPoint(
            inv.a * x + inv.c * y + inv.e,
            inv.b * x + inv.d * y + inv.f,
          )
        : new DOMPoint(NaN, NaN);
    // An element's box in CSS px through its own transform inside the svg, outset by `outset`.
    const userBox = (el: SVGGraphicsElement, outset = 0) => {
      const b = el.getBBox();
      const own = el.getCTM();
      const svgCtm = svg?.getCTM();
      const local =
        own && svgCtm ? svgCtm.inverse().multiply(own) : new DOMMatrix();
      const corners = [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x = 0, y = 0]) => {
        const p = new DOMPoint(x, y).matrixTransform(local);
        return toCss(p.x, p.y);
      });
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      return {
        left: Math.min(...xs) - outset,
        top: Math.min(...ys) - outset,
        right: Math.max(...xs) + outset,
        bottom: Math.max(...ys) + outset,
      };
    };
    const planks = svg
      ? [...svg.querySelectorAll<SVGPathElement>("path[data-plank]")]
      : [];
    const focus = plan?.getAttribute("data-focus") ?? null;
    const focusPlank = planks.find(
      (p) => p.getAttribute("data-plank") === focus,
    );
    // The hull's clip on the planks, so a point is on a plank only inside the outline too.
    const clipId = focusPlank
      ?.closest("[clip-path]")
      ?.getAttribute("clip-path")
      ?.match(/url\(["']?#([^"')]+)/)?.[1];
    const hull = clipId
      ? svg?.querySelector(`[id="${clipId}"] path, [id="${clipId}"] *`)
      : null;
    const onFocus = (x: number, y: number) => {
      if (!focusPlank) return false;
      const p = toUser(x, y);
      return (
        focusPlank.isPointInFill(p) &&
        (!(hull instanceof SVGGeometryElement) || hull.isPointInFill(p))
      );
    };
    const marks = svg
      ? [...svg.querySelectorAll<SVGGraphicsElement>("[data-mark]")].filter(
          (el) => el.checkVisibility({ visibilityProperty: true }),
        )
      : [];
    const dotOf = () => {
      const tip = svg?.querySelector("[data-tip]");
      if (!tip) return null;
      const geo = [
        ...(tip instanceof SVGGeometryElement ? [tip] : []),
        ...tip.querySelectorAll<SVGGeometryElement>(
          "path, line, circle, polyline",
        ),
      ];
      let best: [number, number] | null = null;
      for (const g of geo) {
        if (g instanceof SVGCircleElement) {
          best = [g.cx.baseVal.value, g.cy.baseVal.value];
          break;
        }
        const length = g.getTotalLength();
        for (const at of [0, length]) {
          const p = g.getPointAtLength(at);
          if (!best || p.x > best[0]) best = [p.x, p.y];
        }
      }
      if (!best) return null;
      const [x, y] = toCss(best[0], best[1]);
      return { x, y };
    };
    const ownDigits = (el: Element) => {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      return /^\d+$/.test(own) ? own : null;
    };
    // Leaders (plan.ts's reading on /): each subpath of the shown svg's path.ln-leader, its start
    // on screen and the plank whose fill holds its far end.
    const leaders = [
      ...(svg?.querySelectorAll<SVGPathElement>("path.ln-leader") ?? []),
    ]
      .filter((el) => shown(el))
      .flatMap((leader) => {
        const lm = leader.getScreenCTM();
        if (!lm) return [];
        return (leader.getAttribute("d") ?? "")
          .split(/(?=M)/)
          .filter((d) => d.trim() !== "")
          .map((d) => {
            const probe = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            probe.setAttribute("d", d);
            leader.parentNode?.append(probe);
            const a = probe.getPointAtLength(0);
            const b = probe.getPointAtLength(probe.getTotalLength());
            probe.remove();
            const start = new DOMPoint(a.x, a.y).matrixTransform(lm);
            const end = new DOMPoint(b.x, b.y).matrixTransform(lm);
            const into = planks.find((p) => {
              const pm = p.getScreenCTM()?.inverse();
              return pm ? p.isPointInFill(end.matrixTransform(pm)) : false;
            });
            return {
              x: start.x,
              y: start.y,
              into: into?.getAttribute("data-plank") ?? null,
            };
          });
      });
    const LEADER_GAP = 6;
    const onAnyPlank = (x: number, y: number) => {
      const p = toUser(x, y);
      return planks.some((plank) => plank.isPointInFill(p));
    };
    const numbers = plan
      ? [...plan.querySelectorAll("*")]
          .filter(
            (el) =>
              !el.closest("defs") &&
              ownDigits(el) !== null &&
              shown(el) &&
              // In the shown drawing: lettering of a hidden drawing has no box.
              (!el.closest("svg") || el.closest("svg") === svg),
          )
          .map((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            let ground: number[] | null = null;
            for (let a = el.parentElement; a && !ground; a = a.parentElement) {
              const c = colour(getComputedStyle(a).backgroundColor);
              if (c) ground = c;
            }
            return {
              text: ownDigits(el) ?? "",
              box: rect(r),
              onFocus: onFocus(r.left + r.width / 2, r.top + r.height / 2),
              color: colour(el instanceof SVGElement ? s.fill : s.color),
              weight: Number.parseInt(s.fontWeight, 10),
              chip: colour(s.backgroundColor),
              ledTo: leaders
                .filter(
                  ({ x, y }) =>
                    Math.max(r.left - x, 0, x - r.right) ** 2 +
                      Math.max(r.top - y, 0, y - r.bottom) ** 2 <=
                    LEADER_GAP ** 2,
                )
                .flatMap(({ into }) => (into ? [into] : [])),
              onFilm: [
                [r.left, r.top],
                [r.right, r.top],
                [r.left, r.bottom],
                [r.right, r.bottom],
                [r.left + r.width / 2, r.top + r.height / 2],
              ].every(([x = 0, y = 0]) => !onAnyPlank(x, y)),
              ground,
            };
          })
      : [];
    return {
      plans: plans.length,
      focus,
      run: plan?.getAttribute("data-run") ?? null,
      svgs: svgs.length,
      svg: svg ? rect(svg.getBoundingClientRect()) : null,
      viewBox: svg?.getAttribute("viewBox") ?? null,
      ctm: m ? { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f } : null,
      planks: planks.map((p) => {
        const b = p.getBBox();
        return {
          id: p.getAttribute("data-plank") ?? "",
          sprint: p.getAttribute("data-sprint"),
          className: p.getAttribute("class") ?? "",
          pencil: p.hasAttribute("data-pencil"),
          live: p.hasAttribute("data-live"),
          d: p.getAttribute("d") ?? "",
          bbox: { x: b.x, y: b.y, width: b.width, height: b.height },
        };
      }),
      pencil: planks
        .filter((p) => p.hasAttribute("data-pencil"))
        .map((p) => {
          const s = getComputedStyle(p);
          return {
            id: p.getAttribute("data-plank") ?? "",
            box: userBox(p),
            fill: s.fill,
            stroke: colour(s.stroke),
            dash: s.strokeDasharray,
            strokeWidth: Number.parseFloat(s.strokeWidth),
          };
        }),
      marks: marks.map((el) => {
        const s = getComputedStyle(el);
        const half = Number.parseFloat(s.strokeWidth) / 2 || 0;
        const line = userBox(el);
        // The stroke box: half the stroke either side; past the ends only with round or square
        // caps (MARKS has butt caps, which end where the line does).
        const ends = s.strokeLinecap === "butt" ? 0 : half;
        return {
          line,
          box: {
            left: line.left - half,
            right: line.right + half,
            top: line.top - ends,
            bottom: line.bottom + ends,
          },
          cx: (line.left + line.right) / 2,
          stroke: colour(s.stroke),
          strokeRaw: s.stroke,
          width: s.strokeWidth,
          motion: [
            ...el.getAnimations().map((a) => a.constructor.name),
            ...(s.transitionDuration
              .split(",")
              .some((d) => Number.parseFloat(d) > 0)
              ? [`transition ${s.transitionProperty} ${s.transitionDuration}`]
              : []),
            ...(s.animationName !== "none"
              ? [`animation ${s.animationName}`]
              : []),
          ],
        };
      }),
      tips: svg?.querySelectorAll("[data-tip]").length ?? 0,
      dot: dotOf(),
      numbers,
    };
  });
}

/**
 * The drawing's own map from hull units to viewBox units, x' = ox + x·s and y' = oy + y·s, fitted
 * by least squares to its planks' boxes: x on every plank end the box doesn't cut (an end at the
 * box's side may be clipped in its coordinates), y on every plank's lower side. Null with fewer
 * than two of either.
 */
export function fitOf(read: Pick<DetailRead, "planks" | "viewBox">) {
  const [bx = 0, , bw = 0] = (read.viewBox ?? "").split(/[\s,]+/).map(Number);
  const xs: Point[] = [];
  const ys: Point[] = [];
  for (const p of read.planks) {
    const plank = PLANKS.find((q) => q.id === p.id);
    if (!plank || !p.bbox) continue;
    const [left, right] = [p.bbox.x, p.bbox.x + p.bbox.width];
    const cut = (v: number) => v <= bx + 0.5 || v >= bx + bw - 0.5;
    if (!cut(left)) xs.push([plank.x0, left]);
    if (!cut(right)) xs.push([plank.x1, right]);
    ys.push([plank.yBot, p.bbox.y + p.bbox.height]);
  }
  const line = (pairs: Point[]) => {
    const n = pairs.length;
    if (n < 2) return null;
    const mx = pairs.reduce((a, [x]) => a + x, 0) / n;
    const my = pairs.reduce((a, [, y]) => a + y, 0) / n;
    const sxx = pairs.reduce((a, [x]) => a + (x - mx) ** 2, 0);
    const sxy = pairs.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    return { slope, at0: my - slope * mx };
  };
  const fx = line(xs);
  const fy = line(ys);
  if (!fx || !fy) return null;
  return { s: fx.slope, ox: fx.at0, sy: fy.slope, oy: fy.at0 };
}
export type Fit = ReturnType<typeof fitOf>;

/** A hull point in CSS px on a read drawing, through its fitted map and its matrix. */
export function cssOf(read: DetailRead, fit: Fit, [x, y]: Point): Point {
  const m = read.ctm;
  if (!fit || !m) return [Number.NaN, Number.NaN];
  const [u, v] = [fit.ox + x * fit.s, fit.oy + y * fit.s];
  return [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f];
}

/** A length in hull units, in CSS px, on a read drawing. */
export const cssLength = (read: DetailRead, fit: Fit, units: number) =>
  units * (fit?.s ?? Number.NaN) * (read.ctm?.a ?? Number.NaN);

/** A box's distance to a point (0 inside). */
export const boxToPoint = (b: Box, x: number, y: number) =>
  Math.hypot(
    Math.max(b.left - x, 0, x - b.right),
    Math.max(b.top - y, 0, y - b.bottom),
  );

/** Two boxes overlap by more than `slack` px across and down (0.5: under half a pixel at DPR 1 is antialiasing). */
export const overlaps = (a: Box, b: Box, slack = 0) =>
  a.left < b.right - slack &&
  b.left < a.right - slack &&
  a.top < b.bottom - slack &&
  b.top < a.bottom - slack;

export const inside = (a: Box, b: Box, slack = 0) =>
  a.left >= b.left - slack &&
  a.right <= b.right + slack &&
  a.top >= b.top - slack &&
  a.bottom <= b.bottom + slack;

/** The panel's moments shown: `ol[data-moments] li`. */
export const momentsShown = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelectorAll(
        'section[aria-labelledby="crew"] ol[data-moments] > li',
      ).length,
  );

/**
 * An init script: from DOMContentLoaded every mutation inside `[data-plan]` in
 * `window.__planMutations`, and every transition or animation that starts in it in
 * `window.__planMoved`.
 */
export function recordPlan() {
  const win = window as Window & {
    __planMutations?: string[];
    __planMoved?: string[];
  };
  win.__planMutations = [];
  win.__planMoved = [];
  for (const type of ["transitionrun", "animationstart"]) {
    document.addEventListener(
      type,
      (event) => {
        const target = event.target as Element | null;
        if (target?.closest?.("[data-plan]"))
          win.__planMoved?.push(`${type} on <${target.tagName.toLowerCase()}>`);
      },
      true,
    );
  }
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const plan = document.querySelector("[data-plan]");
      if (!plan) return;
      new MutationObserver((records) => {
        for (const r of records) {
          const t = r.target;
          const name =
            t instanceof Element
              ? `<${t.tagName.toLowerCase()}${t.hasAttribute("data-mark") ? " data-mark" : ""}>`
              : "#text";
          const detail =
            r.type === "attributes"
              ? ` ${r.attributeName}`
              : r.type === "childList"
                ? ` +${r.addedNodes.length} -${r.removedNodes.length}`
                : "";
          win.__planMutations?.push(`${r.type} on ${name}${detail}`);
        }
      }).observe(plan, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    },
    { once: true },
  );
}

/** What recordPlan saw since the last call, and clears it. */
export function takePlan(page: Page) {
  return page.evaluate(() => {
    const win = window as Window & {
      __planMutations?: string[];
      __planMoved?: string[];
    };
    const out = {
      mutations: win.__planMutations ?? ["(no recorder)"],
      moved: win.__planMoved ?? [],
    };
    win.__planMutations = [];
    win.__planMoved = [];
    return out;
  });
}
