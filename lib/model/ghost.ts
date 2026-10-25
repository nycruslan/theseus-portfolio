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

/** A number's point in the model's frame: 1 unit off the near side, or on the transom's breadth. */
const pointOf = (label: Label, [x, y]: readonly [number, number]) =>
  label.led ? nearSide(x, y) : nearSide(x, y, 1);

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

/**
 * The numbers riding their planks: each span's offset from its place in the drawing to its plank's
 * point as the frame draws it, in custom properties that app/globals.css applies only while the
 * model has a state. At rest the stagger holds every box 2 px clear of the others: set in seat order,
 * a number that would come closer slides along its own plank, either way, to the nearest point where
 * the plank is at least 6 units deep and its box is clear (notes-iris.md, section 2). In the move,
 * each rides from its anchor to that point with e.
 */
export function riders({ labels }: GhostPage) {
  let targets: [number, number][] | null = null;

  const stagger = (loft: Loft) => {
    // The clearance holds after each box is rounded to the device's pixels.
    const gap = 2 + 1 / devicePixelRatio;
    const placed: Box[] = [];
    const out = labels.map((label) => label.anchor);
    const order = labels
      .map((label, i) => ({ seat: label.seat ?? "", i }))
      .sort((a, b) => a.seat.localeCompare(b.seat));
    for (const { i } of order) {
      const label = labels[i];
      if (!label) continue;
      const [w, h] = [label.span.offsetWidth, label.span.offsetHeight];
      const boxAt = (p: readonly [number, number]): Box => {
        const [x, y] = loft.screen([pointOf(label, p)], 1)[0] ?? [0, 0];
        return label.led
          ? { l: x - w, r: x, t: y - h / 2, b: y + h / 2 }
          : { l: x - w / 2, r: x + w / 2, t: y - h / 2, b: y + h / 2 };
      };
      const clear = (box: Box) =>
        placed.every(
          (other) =>
            Math.max(box.l, other.l) - Math.min(box.r, other.r) >= gap ||
            Math.max(box.t, other.t) - Math.min(box.b, other.b) >= gap,
        );
      let best = label.anchor;
      const plank = PLANKS.find((candidate) => candidate.id === label.seat);
      if (!label.led && plank && !clear(boxAt(best))) {
        search: for (let d = 2; d < 400; d += 2) {
          for (const x of [label.anchor[0] + d, label.anchor[0] - d]) {
            if (x < plank.x0 + 4 || x > plank.x1 - 4) continue;
            const band = bandAt(plank, x);
            if (!band || band[1] - band[0] < 6) continue;
            const at: [number, number] = [x, (band[0] + band[1]) / 2];
            if (clear(boxAt(at))) {
              best = at;
              break search;
            }
          }
        }
      }
      placed.push(boxAt(best));
      out[i] = best;
    }
    return out;
  };

  return {
    /** A new fit or loft: the stagger is solved again at the next frame. */
    reset() {
      targets = null;
    },
    /**
     * Sets each number at eased progress e on `loft`, whose drawing is `k` CSS px a unit; below
     * 768 px, where the numbers are hidden, it clears them instead.
     */
    place(loft: Loft, k: number, e: number, shown: boolean) {
      if (!shown) return this.clear();
      targets ??= stagger(loft);
      const now = targets;
      const points = labels.map((label, i) => {
        const [ax, ay] = label.anchor;
        const [tx, ty] = now[i] ?? label.anchor;
        return pointOf(label, [ax + (tx - ax) * e, ay + (ty - ay) * e]);
      });
      const step = 1 / devicePixelRatio;
      const snap = (n: number) => `${Math.round(n / step) * step}px`;
      loft.screen(points, e).forEach(([x, y], i) => {
        const label = labels[i];
        if (!label) return;
        // The span's own place on the canvas, which lies on the drawing's box: frame 1's point.
        const [x0, y0] = [label.share[0] * BW * k, label.share[1] * BH * k];
        label.span.style.setProperty("--ghost-x", snap(x - x0));
        label.span.style.setProperty("--ghost-y", snap(y - y0));
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
