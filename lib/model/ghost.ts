// The Log's ghost hull in the page (.crew/sprint/33/contract.md, "The numbers" and "The pick";
// notes-iris.md, sections 2 and 4): what the chunk reads off the 2D ghost the server drew, and its
// numbers riding their planks. The drawing is the record: the seats, their numbers, the record's
// own seat and the leaders all come from it, so the 3D can't disagree with the 2D. No three.js.

import { GHOST, type Layout, PLANKS } from "@/lib/hull-layouts";
import { LEAD_GAP, LEAD_OUT, LED_OUT } from "./calls";
import { bandAt, type Ghost, nearSide, plankBody, type Vec3 } from "./hull";
import type { Loft } from "./loft";

/** One of the drawing's numbers: its span, its seat, and where the drawing sets it. */
type Label = {
  span: HTMLElement;
  seat: string | undefined;
  /** Its anchor, as shares of the drawing's box (the span's own left and top). */
  share: [number, number];
  /** The same point in hull units. */
  anchor: [number, number];
  /** The span is right-aligned on its anchor: the 2D leads it out (only 5.0's today). */
  end: boolean;
  /**
   * Led out aft of the hull from 768 px, with a leader into its plank: by the 2D drawing ("2d",
   * 5.0's, already there at frame 1), or by the 3D alone ("3d", LED_OUT's, riding out with e).
   */
  lead: "2d" | "3d" | undefined;
  /** Where a led-out number's right edge stands at rest, in hull units. */
  out: [number, number];
  /** Its leader's inner end, on the plank, in hull units. */
  into: [number, number];
};

/** Hull units from a drawing's own (its viewBox's). */
const toHull = (
  { ox, oy, s }: Layout,
  x: number,
  y: number,
): [number, number] => [(x - ox) / s, (y - oy) / s];

/** A number's span where `layout`'s drawing sets it: its share of the box, and in hull units. */
function placeOf(span: HTMLElement, layout: Layout) {
  const [bx, by, bw, bh] = layout.box;
  const share: [number, number] = [
    Number.parseFloat(span.style.left) / 100,
    Number.parseFloat(span.style.top) / 100,
  ];
  return {
    share,
    anchor: toHull(layout, share[0] * bw + bx, share[1] * bh + by),
  };
}

/**
 * The sheet's pencil number (.crew/sprint/34/): the wide drawing's span on the pencil plank, which
 * rides it on the hull as the Log's numbers ride theirs. A number the 2D leads out (5.0's) stays
 * aft of the hull, with no leader on the lifted hull (notes-iris.md, 3.3 and 4.4).
 */
export function pencilLabel(
  drawing: Element,
  seat: string,
  sprint: string,
  layout: Layout,
): Label | null {
  const spans = [
    ...drawing.querySelectorAll<HTMLElement>(":scope > .plan-plank"),
  ];
  const span =
    spans.find((candidate) => candidate.classList.contains("plan-pencil")) ??
    spans.find((candidate) => candidate.textContent === sprint);
  if (!span) return null;
  const { share, anchor } = placeOf(span, layout);
  return {
    span,
    seat,
    share,
    anchor,
    end: false,
    lead: undefined,
    out: anchor,
    into: anchor,
  };
}

export type GhostPage = ReturnType<typeof readGhost>;

/** The ghost as the server drew it, read off `drawing` (`.plan-ghost`). */
export function readGhost(drawing: Element) {
  /** Each seat's number, the sprint that took its original out. */
  const numbers = new Map<string, number>();
  const seatOf = new Map<string, string>();
  for (const path of drawing.querySelectorAll(
    "path[data-plank][data-sprint]",
  )) {
    const seat = path.getAttribute("data-plank") ?? "";
    const sprint = path.getAttribute("data-sprint") ?? "";
    numbers.set(seat, Number(sprint));
    seatOf.set(sprint, seat);
  }
  const current =
    drawing.querySelector("path[data-current]")?.getAttribute("data-plank") ??
    undefined;
  const labels: Label[] = [
    ...drawing.querySelectorAll<HTMLElement>(":scope > .plan-plank"),
  ].map((span) => {
    const { share, anchor } = placeOf(span, GHOST);
    const seat = seatOf.get(span.textContent ?? "");
    const end = span.classList.contains("plan-end");
    const plank = PLANKS.find((candidate) => candidate.id === seat);
    // The 3D's own: at its lift's mid-depth, LEAD_OUT units aft of the plank, its leader into the
    // plank where the 2D sets its number, so the leader has no length at frame 1.
    const lead: Label["lead"] = end
      ? "2d"
      : seat && plank && LED_OUT.includes(seat)
        ? "3d"
        : undefined;
    const out: [number, number] =
      lead === "3d" && plank
        ? [plank.x0 - LEAD_OUT, (plank.yTop + plank.yBot) / 2]
        : anchor;
    return { span, seat, share, anchor, end, lead, out, into: anchor };
  });
  // The drawing's leaders, "M x y H x" each: each one's y is its number's, so the number names its
  // seat, and its inner end is the leader's into its plank.
  const d = drawing.querySelector(".ln-leader")?.getAttribute("d") ?? "";
  for (const [, , y0, x1] of d.matchAll(
    /M(-?[\d.]+)[ ,](-?[\d.]+)H(-?[\d.]+)/g,
  )) {
    const [bx, by] = toHull(GHOST, Number(x1), Number(y0));
    const label = labels.find(
      (candidate) => candidate.end && Math.abs(candidate.anchor[1] - by) < 0.5,
    );
    if (label) label.into = [bx, by];
  }
  const hull: Ghost = { seats: new Set(numbers.keys()) };
  return { numbers, current, labels, hull };
}

/**
 * A led-out number's leader at eased progress e, as a polyline on the near side in the model's
 * frame: from LEAD_GAP units short of the number into its plank. The 3D's own rides out with its
 * number from the plank, so at frame 1 it has no length.
 */
function leaderAt(label: Label, e: number): Vec3[] {
  const [ox, oy] = [label.out[0] + LEAD_GAP, label.out[1]];
  const [ax, ay] =
    label.lead === "3d"
      ? [
          label.into[0] + (ox - label.into[0]) * e,
          label.into[1] + (oy - label.into[1]) * e,
        ]
      : [ox, oy];
  const [bx, by] = label.into;
  return Array.from({ length: 9 }, (_, i) =>
    nearSide(ax + ((bx - ax) * i) / 8, ay + ((by - ay) * i) / 8),
  );
}

type Box = { l: number; r: number; t: number; b: number };
type Plank = (typeof PLANKS)[number];
type Point = readonly [number, number];

/** A plank's edges on the near side as polylines in the model's frame: top, bottom and butts. */
function edgesOf(plank: Plank) {
  const xs = Array.from(
    { length: 97 },
    (_, i) => plank.x0 + ((plank.x1 - plank.x0) * i) / 96,
  ).filter((x) => bandAt(plank, x));
  const bands: [number, number][] = xs.map((x) => bandAt(plank, x) ?? [0, 0]);
  const butt = (i: number) => {
    const [top, bottom] = bands[i] ?? [0, 0];
    const x = xs[i] ?? 0;
    return Array.from({ length: 7 }, (_, j) =>
      nearSide(x, top + ((bottom - top) * j) / 6),
    );
  };
  return [
    xs.map((x, i) => nearSide(x, bands[i]?.[0] ?? 0)),
    xs.map((x, i) => nearSide(x, bands[i]?.[1] ?? 0)),
    butt(0),
    butt(xs.length - 1),
  ];
}

/**
 * The middle half of a plank's body, where its number may ride: the 2D's rule for the body
 * (`plankBody` in lib/lines-plan.ts: nearly a whole lift deep, or nearly as deep as the plank ever
 * gets), whose middle is the drawing's place. Searching the whole plank let numbers settle at its
 * ends, clumped at the stern and the bow (.crew/sprint/33/review-iris.md, Must 1).
 */
function middleOf(plank: Plank): Point | null {
  const body = plankBody(plank);
  if (!body) return null;
  const [first, last] = body;
  const [mid, quarter] = [(first + last) / 2, (last - first) / 4];
  return [mid - quarter, mid + quarter];
}

/** One canvas for measuring the digits' ink, made once. */
let measure: CanvasRenderingContext2D | null | undefined;

/**
 * How far a number's ink sits inside its span's box, in CSS px on each side: the glyphs' actual
 * bounds from the canvas's text metrics, against the baseline that a line box as tall as the font
 * (line-height 1) sets. Iris's bar is that no line crosses a digit's ink (early-look-iris.md).
 */
function inkInsets(span: HTMLElement) {
  measure ??= document.createElement("canvas").getContext("2d");
  const style = getComputedStyle(span);
  const [w, h] = [span.offsetWidth, span.offsetHeight];
  if (!measure || !w || !h) return { l: 0, r: 0, t: 0, b: 0 };
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const m = measure.measureText(span.textContent ?? "");
  const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  const baseline = (h - content) / 2 + m.fontBoundingBoxAscent;
  return {
    l: Math.max(0, -m.actualBoundingBoxLeft),
    r: Math.max(0, w - m.actualBoundingBoxRight),
    t: Math.max(0, baseline - m.actualBoundingBoxAscent),
    b: Math.max(0, h - baseline - m.actualBoundingBoxDescent),
  };
}

/** The distance from a segment to a box, 0 where they meet. */
function reach(box: Box, [ax, ay]: Point, [bx, by]: Point) {
  const inside = (x: number, y: number) =>
    x >= box.l && x <= box.r && y >= box.t && y <= box.b;
  if (inside(ax, ay) || inside(bx, by)) return 0;
  // Sampled along the segment: the segments are a pixel or two long.
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= 4; i++) {
    const [x, y] = [ax + ((bx - ax) * i) / 4, ay + ((by - ay) * i) / 4];
    const dx = Math.max(box.l - x, 0, x - box.r);
    const dy = Math.max(box.t - y, 0, y - box.b);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/**
 * The numbers riding their planks: each span's offset from its place in the drawing to its point as
 * the frame draws it, in custom properties that app/globals.css applies only while the model has a
 * state. A number's point is the screen midpoint between its plank's projected top and bottom edges,
 * since on the turned hull a band's projected middle isn't its middle's projection
 * (.crew/sprint/33/early-look-iris.md, must 2). At rest each takes the place in the middle half of
 * its plank's body 2 px clear of the other numbers and 1 px clear of every line drawn (both sides'
 * seams through the vellum, the outline, the record's mark, the leaders), nearest the 2D's place;
 * where none is, the 2D's place, the hardest planks placed first. A led-out number (5.0's in the
 * 2D, LED_OUT's in the 3D alone) stands aft at its leader's end. In the move each rides from the
 * 2D's place with e, so frame 1 is the drawing. `layout` is the drawing the spans are set on: the
 * Log's ghost, or on `/` the sheet's wide drawing, whose one number, the pencil plank's, is `fixed`
 * at its 2D anchor, centred on its plank wherever the turn leaves it (.crew/sprint/34/notes-iris.md,
 * 4.4): the hull's only label, it clears nothing.
 */
export function riders(
  { labels }: { labels: readonly Label[] },
  layout: Layout = GHOST,
  fixed = false,
) {
  const [, , BW, BH] = layout.box;
  const planks = labels.map((label) =>
    PLANKS.find((plank) => plank.id === label.seat),
  );
  const edges = planks.map((plank) => (plank ? edgesOf(plank) : []));
  /** Each label's settled x in hull units; a led-out one rides out instead. */
  let targets: number[] | null = null;

  /** Each span's width, read with the places: a 3D-led number's right edge goes on its point. */
  let widths: number[] = [];

  /** A number's point (its box's anchor) and its plank's projected depth there, at x and e. */
  const pointAt = (i: number, loft: Loft, x: number, e: number) => {
    const label = labels[i];
    const plank = planks[i];
    if (label?.lead === "3d") {
      const [ax, ay] = label.anchor;
      const [ox, oy] = label.out;
      const [px, py] = loft.screen(
        [nearSide(ax + (ox - ax) * e, ay + (oy - ay) * e)],
        e,
      )[0] ?? [0, 0];
      // Centred in the 2D, right-aligned on its leader's end once out.
      return { at: [px - ((widths[i] ?? 0) / 2) * e, py] as const, depth: 0 };
    }
    if (!label || !plank || label.lead) {
      return {
        at: loft.screen([nearSide(...(label?.anchor ?? [0, 0]))], e)[0] ?? [
          0, 0,
        ],
        depth: 0,
      };
    }
    const band = bandAt(plank, x) ?? [label.anchor[1], label.anchor[1]];
    const [top, bottom] = loft.screen(
      [nearSide(x, band[0]), nearSide(x, band[1])],
      e,
    );
    const [tx, ty] = top ?? [0, 0];
    const [bx, by] = bottom ?? [0, 0];
    return {
      at: [(tx + bx) / 2, (ty + by) / 2] as const,
      depth: Math.hypot(bx - tx, by - ty),
    };
  };

  const settle = (loft: Loft, drawn: Float32Array) => {
    // The clearances hold after each box is rounded to the device's pixels; a line's ink is
    // measured from its centre, so 1 px past the widest line's half (the outline's, 1.4 px).
    const round = 1 / devicePixelRatio;
    const gap = 2 + round;
    const ink = 1 + 0.7;
    // Every line the settled frame draws, on screen, in 24 px cells: the far side's seams show
    // through the near side's vellum, so a number clears them too; and the leaders.
    const CELL = 24;
    const cells = new Map<string, [Point, Point][]>();
    const add = (a: Point, b: Point) => {
      for (
        let cx = Math.floor(Math.min(a[0], b[0]) / CELL);
        cx <= Math.floor(Math.max(a[0], b[0]) / CELL);
        cx++
      ) {
        for (
          let cy = Math.floor(Math.min(a[1], b[1]) / CELL);
          cy <= Math.floor(Math.max(a[1], b[1]) / CELL);
          cy++
        ) {
          const key = `${cx}:${cy}`;
          const list = cells.get(key) ?? [];
          list.push([a, b]);
          cells.set(key, list);
        }
      }
    };
    const pairs: Vec3[] = [];
    for (let i = 0; i + 5 < drawn.length; i += 3) {
      if ((i / 3) % 2 === 0) {
        pairs.push(
          [drawn[i] ?? 0, drawn[i + 1] ?? 0, drawn[i + 2] ?? 0],
          [drawn[i + 3] ?? 0, drawn[i + 4] ?? 0, drawn[i + 5] ?? 0],
        );
      }
    }
    const flat = loft.screen(pairs, 1);
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const [a, b] = [flat[i], flat[i + 1]];
      if (a && b) add(a, b);
    }
    for (const label of labels) {
      if (!label.lead) continue;
      const line = loft.screen(leaderAt(label, 1), 1);
      for (let j = 1; j < line.length; j++) {
        const [a, b] = [line[j - 1], line[j]];
        if (a && b) add(a, b);
      }
    }
    /** The lines whose cells a box, grown by `ink`, touches. */
    const nearBox = (box: Box) => {
      const found = new Set<[Point, Point]>();
      for (
        let cx = Math.floor((box.l - ink) / CELL);
        cx <= Math.floor((box.r + ink) / CELL);
        cx++
      ) {
        for (
          let cy = Math.floor((box.t - ink) / CELL);
          cy <= Math.floor((box.b + ink) / CELL);
          cy++
        ) {
          for (const segment of cells.get(`${cx}:${cy}`) ?? [])
            found.add(segment);
        }
      }
      return found;
    };
    type Place = { x: number; box: Box; score: number; d: number };
    widths = labels.map(({ span }) => span.offsetWidth);
    const insets = labels.map(({ span }) => inkInsets(span));
    /** Each number's places along its plank, with how clear each is of the plank's lines. */
    const places = labels.map((label, i): Place[] => {
      const plank = planks[i];
      const [w, h] = [label.span.offsetWidth, label.span.offsetHeight];
      const boxAt = ([x, y]: Point): Box =>
        label.end
          ? { l: x - w, r: x, t: y - h / 2, b: y + h / 2 }
          : { l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 };
      if (label.lead || !plank) {
        const x = label.anchor[0];
        return [{ x, box: boxAt(pointAt(i, loft, x, 1).at), score: ink, d: 0 }];
      }
      const [top, bottom, ...butts] = (edges[i] ?? []).map((line) =>
        loft.screen(line, 1),
      );
      /**
       * How clear a number's digits are of the lines, in px: their slack to the plank's projected
       * top and bottom edges over their width (negative where a seam crosses them), and their
       * distance from its butts and every other line drawn. At least `ink` is clear.
       */
      const inset = insets[i] ?? { l: 0, r: 0, t: 0, b: 0 };
      const clearance = (outer: Box) => {
        // The digits' ink, not the span's box: a line through its margin doesn't show.
        const box: Box = {
          l: outer.l + inset.l,
          r: outer.r - inset.r,
          t: outer.t + inset.t,
          b: outer.b - inset.b,
        };
        const ys = (line: readonly Point[] | undefined) => {
          const found: number[] = [];
          (line ?? []).forEach(([x, y], j) => {
            if (x >= box.l && x <= box.r) found.push(y);
            const [px, py] = line?.[j - 1] ?? [x, y];
            for (const edge of [box.l, box.r]) {
              if ((px - edge) * (x - edge) < 0) {
                found.push(py + ((y - py) * (edge - px)) / (x - px));
              }
            }
          });
          return found;
        };
        const above = ys(top);
        const below = ys(bottom);
        let score = Math.min(
          above.length ? box.t - Math.max(...above) : Number.POSITIVE_INFINITY,
          below.length ? Math.min(...below) - box.b : Number.POSITIVE_INFINITY,
        );
        for (const line of butts) {
          for (let j = 1; j < line.length; j++) {
            score = Math.min(
              score,
              reach(box, line[j - 1] ?? [0, 0], line[j] ?? [0, 0]),
            );
          }
        }
        for (const [a, b] of nearBox(box)) {
          score = Math.min(score, reach(box, a, b));
        }
        return score;
      };
      // The 2D's place, then every place a unit apart in the middle half of the plank's body.
      const [lo, hi] = middleOf(plank) ?? [label.anchor[0], label.anchor[0]];
      const xs = [label.anchor[0]];
      for (let x = Math.ceil(lo); x <= hi; x += 1) xs.push(x);
      const found: Place[] = [];
      for (const x of xs) {
        const box = boxAt(pointAt(i, loft, x, 1).at);
        found.push({
          x,
          box,
          score: clearance(box),
          d: Math.abs(x - label.anchor[0]),
        });
      }
      return found;
    });
    const apart = (box: Box, other: Box) =>
      Math.max(box.l, other.l) - Math.min(box.r, other.r) >= gap ||
      Math.max(box.t, other.t) - Math.min(box.b, other.b) >= gap;
    /**
     * Of a number's places 2 px clear of the others, nearest the 2D's place: the first clear of the
     * lines; where none is, the first, so the number keeps its plank's middle and touches a line
     * (Iris accepts the stern's and keel's touches; review-iris.md, the decision on the touches).
     */
    const choose = (i: number, others: readonly Box[]) => {
      const open = (places[i] ?? [])
        .filter((place) => others.every((other) => apart(place.box, other)))
        .sort((a, b) => a.d - b.d);
      return open.find((place) => place.score >= ink) ?? open[0];
    };
    // The hardest first, the planks whose clearest place is least clear (the keel's and the
    // stern's), so the roomier ones make way; then each again with all the others set.
    const hardest = (i: number) =>
      Math.max(...(places[i] ?? []).map((place) => place.score));
    const order = labels
      .map((_, i) => i)
      .sort((a, b) => hardest(a) - hardest(b));
    const chosen: (Place | undefined)[] = labels.map(() => undefined);
    const boxes = () =>
      chosen
        .filter((place): place is Place => Boolean(place))
        .map((place) => place.box);
    for (const i of order) chosen[i] = choose(i, boxes());
    for (let pass = 0; pass < 2; pass++) {
      for (const i of order) {
        const mine = chosen[i];
        chosen[i] = undefined;
        chosen[i] = choose(i, boxes()) ?? mine;
      }
    }
    return labels.map((label, i) => chosen[i]?.x ?? label.anchor[0]);
  };

  return {
    /** A new fit or loft: the places are solved again at the next frame. */
    reset() {
      targets = null;
    },
    /**
     * Sets each number at eased progress e on `loft`, whose drawing is `k` CSS px a unit, clear of
     * the lines `drawn` gives (segment pairs in the model's frame, read when the places are solved);
     * below 768 px, where the numbers are hidden, it clears them instead.
     */
    place(
      loft: Loft,
      k: number,
      e: number,
      shown: boolean,
      drawn: () => Float32Array,
    ) {
      if (!shown) return this.clear();
      targets ??= fixed
        ? labels.map((label) => label.anchor[0])
        : settle(loft, drawn());
      const now = targets;
      // Each offset is a whole number of device pixels, in the move (so frame 1 moves nothing) and
      // at rest, so a span's translate never carries a fraction that a composited span would draw
      // its digits between pixels by (Iris's review of sprint 34). The places' clearances allow
      // the device pixel this can move a box (settle's `round`).
      const step = 1 / devicePixelRatio;
      const snap = (n: number) => `${Math.round(n / step) * step}px`;
      labels.forEach((label, i) => {
        const x =
          label.anchor[0] + ((now[i] ?? label.anchor[0]) - label.anchor[0]) * e;
        const [px, py] = pointAt(i, loft, x, e).at;
        // The span's own place on the canvas, which lies on the drawing's box: frame 1's point.
        const [x0, y0] = [label.share[0] * BW * k, label.share[1] * BH * k];
        label.span.style.setProperty("--ghost-x", snap(px - x0));
        label.span.style.setProperty("--ghost-y", snap(py - y0));
      });
    },
    /**
     * The led-out numbers' leaders at eased progress e, each with its seat, as polylines in the
     * model's frame: none at frame 1, since the 2D draws its own, and none below 768 px.
     */
    leaders(e: number, shown: boolean) {
      if (!shown || e <= 0) return [];
      return labels
        .filter((label) => label.lead && label.seat)
        .map((label) => ({
          seat: label.seat ?? "",
          points: leaderAt(label, e),
        }));
    },
    /** Every number back at its place in the drawing. */
    clear() {
      for (const { span } of labels) {
        span.style.removeProperty("--ghost-x");
        span.style.removeProperty("--ghost-y");
      }
    },
  };
}

/** Whether (x, y) is within `reach` of a polyline. */
export function near(
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
  reach: number,
) {
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i] ?? [0, 0];
    const [bx, by] = points[i + 1] ?? [0, 0];
    const [dx, dy] = [bx - ax, by - ay];
    const t = Math.min(
      1,
      Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
    );
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= reach) return true;
  }
  return false;
}
