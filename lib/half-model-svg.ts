// The hero's SVG (components/hero.tsx), drawn from the half-model in lib/half-model.ts. Everything
// here runs once, on the server, at build time: the page receives only the finished path strings,
// each lift's shading, and where its planks butt. Tones are CSS's (app/globals.css, "The tones"):
// the shapes here say where the metal goes, never what colour it is.

import {
  BUTTS,
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
import { ORDER, PLANKS_PER_LIFT } from "@/lib/hull-planks";

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

// Samples along a seam. The gunwale and the keel are the hull's silhouette, so they get the most;
// the seams between lifts are lines inside it, drawn a few hundredths of a unit off at their ends
// for 18 bytes fewer a sample (the box has a byte budget, hero C6).
const SILHOUETTE_SAMPLES = 6;
const SEAM_SAMPLES = 5;
const samplesOf = (k: number) =>
  k === 0 || k === LIFTS ? SILHOUETTE_SAMPLES : SEAM_SAMPLES;

/** One whole lift, with its ends following the stem and the stern. */
function liftPath(k: number) {
  const [top, bottom] = [seam(k), seam(k + 1)];
  const upper = sample(top.from, top.to, top.y, samplesOf(k));
  // The keel lift's top and bottom meet at the profile, so it has no stem or stern face.
  const bow = top.to === bottom.to ? [] : sample(top.to, bottom.to, profile, 2);
  const lower = sample(bottom.to, bottom.from, bottom.y, samplesOf(k + 1));
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

// Stations along each lift for its light, as shares of its own length: closer together toward
// the ends, where the surface turns. A lift's box spans exactly its top seam (its stem and stern
// faces run inward from there), so these are also its gradient's offsets in bounding-box units.
const STATIONS = [0, 0.1, 0.3, 0.55, 0.75, 0.9, 1];
// A stop goes when the line through its neighbours already passes within this much of it (as the
// share of black laid over): three hundredths is too little to see, and the box has a byte budget
// (hero C6). Never fewer than three stops.
const SHADE_TOLERANCE = 0.03;
const MIN_STOPS = 3;

type Stop = { offset: number; opacity: number };

/**
 * How lit lift k is along its length, read a little above its middle (the upper part of a lift is
 * what the eye takes as its tone), with alternate lifts a shade apart, as lift models alternate
 * woods. As the black laid over the planks: half of the darkness, so no lift goes past half black.
 */
function liftShade(k: number): Stop[] {
  const wood = k % 2 === 0 ? 0.04 : -0.04;
  const top = seam(k);
  const stops = STATIONS.map((share) => {
    const x = clamp(top.from + share * (top.to - top.from), 1, LENGTH - 1);
    const upper = k === 0 ? sheer(x) : seamDepth(k);
    const lower = Math.min(seamDepth(k + 1), profile(x));
    const y = upper + 0.4 * Math.max(0, lower - upper);
    return {
      offset: share,
      opacity: Math.round((100 * (1 - clamp(lit(x, y) + wood))) / 2) / 100,
    };
  });
  // Drop, one at a time, the interior stop its neighbours' line passes closest to.
  while (stops.length > MIN_STOPS) {
    let drop = 1;
    let least = Number.POSITIVE_INFINITY;
    for (let i = 1; i < stops.length - 1; i++) {
      const [a, b, c] = [stops[i - 1], stops[i], stops[i + 1]] as [
        Stop,
        Stop,
        Stop,
      ];
      const t = (b.offset - a.offset) / (c.offset - a.offset);
      const off = Math.abs(
        b.opacity - (a.opacity + t * (c.opacity - a.opacity)),
      );
      if (off < least) [drop, least] = [i, off];
    }
    if (least > SHADE_TOLERANCE) break;
    stops.splice(drop, 1);
  }
  return stops;
}

type Lift = {
  /** The lift's number from the deck, which names its clip, gradient and outline in the SVG. */
  id: string;
  d: string;
  /** The black laid over the lift's planks, along its length. */
  shade: Stop[];
  /** Where its planks start and end, stern to bow: the butts, with a little to spare at each end. */
  cuts: number[];
};

export type HalfModel = {
  deck: string;
  lifts: Lift[];
};

// The planks run a few units past the model at both ends, so the lift's own outline is what cuts them.
const SPARE = 4;

function build(): HalfModel {
  const lifts = Array.from({ length: LIFTS }, (_, k): Lift => {
    return {
      id: String(k),
      d: liftPath(k),
      shade: liftShade(k),
      cuts: [
        -SPARE,
        ...(BUTTS[k] ?? []).map((share) => share * LENGTH),
        LENGTH + SPARE,
      ],
    };
  });
  // ORDER and the butts are two tables by two hands: fail the build if they stop naming the same
  // 22 planks, rather than tone the wrong ones.
  const sizes = lifts.map((lift) => lift.cuts.length - 1);
  const named = ORDER.every((place) => {
    const [lift = -1, plank = -1] = place.split(".").map(Number);
    return plank >= 0 && plank < (sizes[lift] ?? 0);
  });
  if (
    !named ||
    new Set(ORDER).size !== ORDER.length ||
    sizes.join() !== PLANKS_PER_LIFT.join()
  ) {
    throw new Error(
      `lib/hull-planks.ts names ${PLANKS_PER_LIFT.join(",")} planks per lift, BUTTS draws ${sizes.join(",")}`,
    );
  }
  return { deck: deckPath(), lifts };
}

export const halfModel = build();
