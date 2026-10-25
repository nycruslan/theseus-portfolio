// The Log's ghost hull in the page (.crew/sprint/33/contract.md, "The numbers" and "The pick";
// notes-iris.md, sections 2 and 4): what the chunk reads off the 2D ghost the server drew, and its
// numbers riding their planks. The drawing is the record: the seats, their numbers, the record's
// own seat and the leaders all come from it, so the 3D can't disagree with the 2D. No three.js.

import { GHOST, PLANKS } from "@/lib/hull-layouts";
import { bandAt, type Ghost, nearSide, type Vec3 } from "./hull";
import type { Loft } from "./loft";

/** One of the drawing's numbers: its span, its seat, and where the drawing sets it. */
type Label = {
  span: HTMLElement;
  seat: string | undefined;
  /** Its anchor, as shares of the drawing's box (the span's own left and top). */
  share: [number, number];
  /** The same point in hull units. */
  anchor: [number, number];
  /** Set aft of the hull at its leader's end, right-aligned (only 5.0's today). */
  led: boolean;
};

/** A leader from a number set aft of the hull to its plank, in the model's frame. */
type Leader = { seat: string; points: Vec3[] };

const [BX, BY, BW, BH] = GHOST.box;

/** Hull units from the ghost drawing's own (its viewBox's). */
const toHull = (x: number, y: number): [number, number] => [
  (x - GHOST.ox) / GHOST.s,
  (y - GHOST.oy) / GHOST.s,
];

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
    const share: [number, number] = [
      Number.parseFloat(span.style.left) / 100,
      Number.parseFloat(span.style.top) / 100,
    ];
    return {
      span,
      seat: seatOf.get(span.textContent ?? ""),
      share,
      anchor: toHull(share[0] * BW + BX, share[1] * BH + BY),
      led: span.classList.contains("plan-end"),
    };
  });
  // The drawing's leaders, "M x y H x" each, lifted onto the near side: each one's y is its
  // number's, so the number names its seat.
  const leaders: Leader[] = [];
  const d = drawing.querySelector(".ln-leader")?.getAttribute("d") ?? "";
  for (const [, x0, y0, x1] of d.matchAll(
    /M(-?[\d.]+)[ ,](-?[\d.]+)H(-?[\d.]+)/g,
  )) {
    const [ax, ay] = toHull(Number(x0), Number(y0));
    const [bx] = toHull(Number(x1), Number(y0));
    const label = labels.find(
      (candidate) => candidate.led && Math.abs(candidate.anchor[1] - ay) < 0.5,
    );
    if (!label?.seat) continue;
    leaders.push({
      seat: label.seat,
      points: Array.from({ length: 9 }, (_, i) =>
        nearSide(ax + ((bx - ax) * i) / 8, ay),
      ),
    });
  }
  const hull: Ghost = {
    seats: new Set(numbers.keys()),
    leaders: leaders.map((leader) => leader.points),
  };
  return { numbers, current, labels, leaders, hull };
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
 * (.crew/sprint/33/early-look-iris.md, must 2). At rest it stands where that projected depth is
 * greatest within the 2D's body stretch; set in seat order, one whose box would come within 2 px of
 * another number, or within 1 px of its plank's edges or the outline, slides along its own plank,
 * either way, to the nearest place that clears both (the band at least 6 units deep), else the
 * nearest that clears the numbers, else stays. In the move it rides from the 2D's place to that x
 * with e: at e 0 the midpoint is the 2D's anchor, so frame 1 is the drawing.
 */
export function riders({ labels }: GhostPage) {
  const planks = labels.map((label) =>
    PLANKS.find((plank) => plank.id === label.seat),
  );
  const edges = planks.map((plank) => (plank ? edgesOf(plank) : []));
  /** Each label's settled x in hull units; a led-out one keeps its anchor. */
  let targets: number[] | null = null;
  /** Each span's box corner on the page with no offset: where its device pixels fall. */
  let bases: [number, number][] | null = null;
  const offset = (span: HTMLElement, name: string) =>
    Number.parseFloat(span.style.getPropertyValue(name)) || 0;

  /** A number's point and its plank's projected depth there, at x and eased progress e. */
  const pointAt = (i: number, loft: Loft, x: number, e: number) => {
    const label = labels[i];
    const plank = planks[i];
    if (!label || !plank || label.led) {
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

  const settle = (loft: Loft, outline: Float32Array) => {
    // The clearances hold after each box is rounded to the device's pixels; a line's ink is
    // measured from its centre, so 1 px past the widest line's half (the outline's, 1.4 px).
    const round = 1 / devicePixelRatio;
    const gap = 2 + round;
    const ink = 1 + 0.7;
    const outlined: [Point, Point][] = [];
    for (let i = 0; i < outline.length; i += 6) {
      const [a, b] = loft.screen(
        [
          [outline[i] ?? 0, outline[i + 1] ?? 0, outline[i + 2] ?? 0],
          [outline[i + 3] ?? 0, outline[i + 4] ?? 0, outline[i + 5] ?? 0],
        ],
        1,
      );
      if (a && b) outlined.push([a, b]);
    }
    type Place = { x: number; box: Box; score: number; d: number };
    /** Each number's places along its plank, with how clear each is of the plank's lines. */
    const places = labels.map((label, i): Place[] => {
      const plank = planks[i];
      const [w, h] = [label.span.offsetWidth, label.span.offsetHeight];
      const boxAt = ([x, y]: Point): Box =>
        label.led
          ? { l: x - w, r: x, t: y - h / 2, b: y + h / 2 }
          : { l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 };
      if (label.led || !plank) {
        const x = label.anchor[0];
        return [{ x, box: boxAt(pointAt(i, loft, x, 1).at), score: ink, d: 0 }];
      }
      const [top, bottom, ...butts] = (edges[i] ?? []).map((line) =>
        loft.screen(line, 1),
      );
      // The outline's segments near this plank: the rest can't come within a box of it.
      const xs = [...(top ?? []), ...(bottom ?? [])].map(([x]) => x);
      const [left, right] = [Math.min(...xs) - 40, Math.max(...xs) + 40];
      const near = outlined.filter(
        ([a, b]) =>
          Math.max(a[0], b[0]) >= left && Math.min(a[0], b[0]) <= right,
      );
      /**
       * How clear a box is of its plank's lines, in px: its slack to the projected top and bottom
       * edges over its width (negative where a seam crosses it), and its distance from the butts and
       * the outline. At least `ink` is clear.
       */
      const clearance = (box: Box) => {
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
        for (const [a, b] of near) score = Math.min(score, reach(box, a, b));
        return score;
      };
      // Every place along the plank where it is at least 6 units deep, a unit apart.
      const found: Place[] = [];
      for (let x = Math.ceil(plank.x0 + 2); x <= plank.x1 - 2; x += 1) {
        const band = bandAt(plank, x);
        if (!band || band[1] - band[0] < 6) continue;
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
     * Of a number's places 2 px clear of the others: the clear one nearest the 2D's place; else the
     * clearest, where the plank's projected depth is greatest and the box is centred in it, nearest
     * the 2D's place of those within a quarter pixel of it.
     */
    const choose = (i: number, others: readonly Box[]) => {
      const open = (places[i] ?? []).filter((place) =>
        others.every((other) => apart(place.box, other)),
      );
      const clear = open
        .filter((place) => place.score >= ink)
        .sort((a, b) => a.d - b.d)[0];
      if (clear) return clear;
      const most = Math.max(...open.map((place) => place.score));
      return open
        .filter((place) => place.score >= most - 0.25)
        .sort((a, b) => a.d - b.d)[0];
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
      bases = null;
    },
    /**
     * Sets each number at eased progress e on `loft`, whose drawing is `k` CSS px a unit, clear of
     * `outline` (the hull's, in the model's frame); below 768 px, where the numbers are hidden, it
     * clears them instead.
     */
    place(
      loft: Loft,
      k: number,
      e: number,
      shown: boolean,
      outline: Float32Array,
    ) {
      if (!shown) return this.clear();
      targets ??= settle(loft, outline);
      bases ??= labels.map(({ span }) => {
        const r = span.getBoundingClientRect();
        return [
          r.left - offset(span, "--ghost-x"),
          r.top - offset(span, "--ghost-y"),
        ];
      });
      const [now, from] = [targets, bases];
      const step = 1 / devicePixelRatio;
      // At rest each box lands on the device's pixels, so a lift's seams stay outside its rows; in
      // the move each offset is rounded, so frame 1 moves nothing.
      const snap = (n: number, base: number) =>
        `${e < 1 ? Math.round(n / step) * step : Math.round((base + n) / step) * step - base}px`;
      labels.forEach((label, i) => {
        const x =
          label.anchor[0] + ((now[i] ?? label.anchor[0]) - label.anchor[0]) * e;
        const [px, py] = pointAt(i, loft, x, e).at;
        // The span's own place on the canvas, which lies on the drawing's box: frame 1's point.
        const [x0, y0] = [label.share[0] * BW * k, label.share[1] * BH * k];
        const [bx, by] = from[i] ?? [0, 0];
        label.span.style.setProperty("--ghost-x", snap(px - x0, bx));
        label.span.style.setProperty("--ghost-y", snap(py - y0, by));
      });
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
