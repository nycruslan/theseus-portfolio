// The hero's SVG (components/hero.tsx), drawn from the half-model in lib/half-model.ts. Everything
// here runs once, on the server, at build time: the page receives only the finished path strings,
// and each lift's light, which CSS turns into a tone of the page's own colours.

import {
  BUTTS,
  COPPER_LIFT,
  clamp,
  ends,
  halfBreadth,
  LENGTH,
  LIFTS,
  profile,
  SHEAR,
  seamDepth,
  sheer,
} from "@/lib/half-model";

/** Where the rest pose draws a point of the hull's surface. */
const projected = (x: number, y: number) => y + SHEAR * halfBreadth(x, y);

// Matte light from the upper left and in front. Shading moves lightness only; the tones are mixed
// from the page's tokens in CSS, so this only says how lit each place is, from 0 to 1.
const LIGHT = (() => {
  const v = [-0.45, 0.3, 0.84];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

/** How lit the surface is at (x, y), from 0 (turned away) to 1 (facing the light). */
function lit(x: number, y: number) {
  const h = 0.5;
  const dx = (halfBreadth(x + h, y) - halfBreadth(x - h, y)) / (2 * h);
  const dy = (halfBreadth(x, y + h) - halfBreadth(x, y - h)) / (2 * h);
  // The surface's normal, with the board's up as +y.
  const normal = [-dx, dy, 1];
  const n = Math.hypot(...normal);
  const lambert = normal.reduce(
    (sum, c, i) => sum + (c / n) * (LIGHT[i] ?? 0),
    0,
  );
  return clamp((lambert - 0.25) / 0.6);
}

type Point = [number, number];

const num = (v: number) => {
  const s = (Math.round(v * 10) / 10).toString();
  return s.replace(/^(-?)0\./, "$1.");
};
const pt = ([x, y]: Point) => `${num(x)} ${num(y)}`;

/**
 * A smooth run through the points, starting where the path already is (the first point). A
 * Catmull-Rom spline as cubic Béziers: its tangents are symmetric at each joint, so every segment
 * after the first is an `S`, which keeps the markup small.
 */
function spline(points: Point[]) {
  const at = (i: number) => points[clamp(i, 0, points.length - 1)] as Point;
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
    ];
    const c2: Point = [
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
    ];
    d += i === 0 ? `C${pt(c1)} ${pt(c2)} ${pt(p2)}` : `S${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/** Points along a curve y(x) from x0 to x1, closer together toward both ends, where it bends. */
function sample(x0: number, x1: number, y: (x: number) => number, n: number) {
  return Array.from({ length: n + 1 }, (_, i): Point => {
    const x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n));
    return [x, y(x)];
  });
}

/** A seam: the top of lift k (k from 1), across the hull and as the rest pose draws it. */
function seam(k: number): {
  from: number;
  to: number;
  y: (x: number) => number;
} {
  if (k === 0) {
    // The gunwale, where the deck meets the side.
    return { from: 0, to: LENGTH, y: (x) => projected(x, sheer(x)) };
  }
  if (k === LIFTS) {
    const [from, to] = ends(seamDepth(k - 1));
    return { from, to, y: profile };
  }
  const depth = seamDepth(k);
  const [from, to] = ends(depth);
  return { from, to, y: (x) => projected(x, depth) };
}

/** The region of one lift between x0 and x1 (both within it), its ends cut square. */
function band(k: number, x0: number, x1: number) {
  const [top, bottom] = [seam(k), seam(k + 1)];
  const upper = sample(x0, x1, top.y, 6);
  const lower = sample(x1, x0, bottom.y, 6);
  return `M${pt(upper[0] as Point)}${spline(upper)}L${pt(lower[0] as Point)}${spline(lower)}Z`;
}

/** One whole lift, with its ends following the stem and the stern. */
function liftPath(k: number) {
  const [top, bottom] = [seam(k), seam(k + 1)];
  const upper = sample(top.from, top.to, top.y, 6);
  // The keel lift's top and bottom meet at the profile, so it has no stem or stern face.
  const bow = top.to === bottom.to ? [] : sample(top.to, bottom.to, profile, 2);
  const lower = sample(bottom.to, bottom.from, bottom.y, 6);
  const stern =
    top.from === bottom.from ? [] : sample(bottom.from, top.from, profile, 2);
  // The transom: the stern's flat face, seen edge on, closes the top lift.
  const transom = k === 0 ? `V${num(top.y(0))}` : "";
  return `M${pt(upper[0] as Point)}${spline(upper)}${spline(bow)}${spline(lower)}${spline(stern)}${transom}Z`;
}

/** The deck: the strip of the hull's top that the view from above shows, sheer to gunwale. */
function deckPath() {
  const back = sample(0, LENGTH, sheer, 6);
  const front = sample(LENGTH, 0, (x) => projected(x, sheer(x)), 6);
  return `M${pt(back[0] as Point)}${spline(back)}${spline(front)}Z`;
}

function buttsPath() {
  return BUTTS.flatMap((shares, k) => {
    const [top, bottom] = [seam(k), seam(k + 1)];
    return shares.map((share) => {
      const x = share * LENGTH;
      return `M${num(x)} ${num(top.y(x))}V${num(bottom.y(x))}`;
    });
  }).join("");
}

// Stations along each lift for its light, as shares of its own length: closer together toward
// the ends, where the surface turns. A lift's box spans exactly its top seam (its stem and stern
// faces run inward from there), so these are also its gradient's offsets in bounding-box units,
// the same for every lift.
const STATIONS = [0, 0.1, 0.3, 0.55, 0.75, 0.9, 1];

/**
 * How lit lift k is along its length, read a little above its middle (the upper part of a lift is
 * what the eye takes as its tone), with alternate lifts a shade apart, as lift models alternate
 * woods.
 */
function liftLight(k: number) {
  const wood = k % 2 === 0 ? 0.04 : -0.04;
  const top = seam(k);
  return STATIONS.map((share) => {
    const x = clamp(top.from + share * (top.to - top.from), 1, LENGTH - 1);
    const upper = k === 0 ? sheer(x) : seamDepth(k);
    const lower = Math.min(seamDepth(k + 1), profile(x));
    const y = upper + 0.4 * Math.max(0, lower - upper);
    return { offset: share, light: clamp(lit(x, y) + wood) };
  });
}

/** The deck faces straight up, so it takes the same light all along. */
const DECK_LIGHT = clamp(((LIGHT[1] ?? 0) - 0.25) / 0.6);

type Stop = { offset: number; light: number };

export type HalfModel = {
  deck: { d: string; light: number };
  lifts: { id: string; d: string; stops: Stop[] }[];
  copper: string;
  butts: string;
};

export const halfModel: HalfModel = {
  deck: { d: deckPath(), light: DECK_LIGHT },
  lifts: Array.from({ length: LIFTS }, (_, k) => ({
    // Prefixed, so a reference like url(#hero-lift-1) never reads as a color literal.
    id: `hero-lift-${k + 1}`,
    d: liftPath(k),
    stops: liftLight(k),
  })),
  copper: band(
    COPPER_LIFT,
    (BUTTS[COPPER_LIFT]?.[0] ?? 0) * LENGTH,
    (BUTTS[COPPER_LIFT]?.[1] ?? 0) * LENGTH,
  ),
  butts: buttsPath(),
};
