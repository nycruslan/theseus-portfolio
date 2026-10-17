// The hero's lift half-model (.studio/sprint/7/direction-iris.md), drawn from one small
// parametric hull rather than by hand, so the lines stay fair and a later renderer (sprint 7's
// Part B, WebGL) can build the same object from the same numbers. Everything here runs once, on
// the server, at build time: the page receives only the finished path strings.
//
// Units are the SVG's own: the hull is LENGTH long, stern at x = 0, bow at x = LENGTH, y down. The
// model is a solid on a backboard (the page): z is how far the hull stands out of the board. The
// rest pose looks at it from about 13 degrees above, an oblique projection that moves a point down
// the page by SHEAR x z, so the board plane itself never moves.

export const LENGTH = 624;
export const HEIGHT = 118;

const SHEAR = 0.24;
const BEAM = 70; // the greatest half-breadth, at the deck: a narrow yacht, as Herreshoff's were
const LIFTS = 7;
const SHEER_LOW = 13; // the sheer's lowest point, a little aft of midships
const SHEER_LOW_AT = 0.4;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** The sheer: high at the bow, lowest a little aft of midships, rising again to the stern. */
function sheer(x: number) {
  const t = x / LENGTH;
  const rise = SHEER_LOW / (1 - SHEER_LOW_AT) ** 2;
  return SHEER_LOW - rise * (t - SHEER_LOW_AT) ** 2;
}

// The profile's underside, as [share of the length, share of the height], stern to bow: the
// transom's foot, the counter running down into the run, a keel with a little rocker, a round
// forefoot and a stem raked about 25 degrees up to the bow tip.
const PROFILE: [number, number][] = [
  [0, 0.3],
  [0.08, 0.42],
  [0.18, 0.66],
  [0.28, 0.86],
  [0.38, 0.96],
  [0.5, 1],
  [0.66, 0.98],
  [0.78, 0.92],
  [0.87, 0.8],
  [0.93, 0.62],
  [0.97, 0.36],
  [1, 0],
];
const DEEPEST_AT = 0.5;

/**
 * A monotone cubic through PROFILE (Fritsch and Carlson): smooth, and it never overshoots a control
 * point, so the profile falls to the keel and rises to the stem with no wobble.
 */
const profileAt = (() => {
  const xs = PROFILE.map(([t]) => t);
  const ys = PROFILE.map(([, y]) => y);
  const n = xs.length;
  const secant = xs
    .slice(1)
    .map((x, i) => ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) / (x - (xs[i] ?? 0)));
  const slope = xs.map((_, i) => {
    if (i === 0) return secant[0] ?? 0;
    if (i === n - 1) return secant[n - 2] ?? 0;
    const [a, b] = [secant[i - 1] ?? 0, secant[i] ?? 0];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  return (t: number) => {
    let i = 0;
    while (i < n - 2 && t > (xs[i + 1] ?? 1)) i++;
    const [x0, x1, y0, y1] = [
      xs[i] ?? 0,
      xs[i + 1] ?? 1,
      ys[i] ?? 0,
      ys[i + 1] ?? 0,
    ];
    const h = x1 - x0;
    const u = clamp((t - x0) / h);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return (
      h00 * y0 +
      h10 * h * (slope[i] ?? 0) +
      h01 * y1 +
      h11 * h * (slope[i + 1] ?? 0)
    );
  };
})();

const profile = (x: number) => HEIGHT * profileAt(x / LENGTH);

/** Where a waterline at depth y meets the profile, aft and forward (the profile is a valley). */
function ends(y: number): [number, number] {
  const deepest = DEEPEST_AT * LENGTH;
  const solve = (lo: number, hi: number, rising: boolean) => {
    let [a, b] = [lo, hi];
    for (let i = 0; i < 40; i++) {
      const mid = (a + b) / 2;
      if (profile(mid) < y === rising) a = mid;
      else b = mid;
    }
    return (a + b) / 2;
  };
  const aft = profile(0) >= y ? 0 : solve(0, deepest, true);
  return [aft, solve(deepest, LENGTH, false)];
}

/** The deck's half-breadth along the hull: a fine bow, a full quarter and a transom with breadth. */
function waterplane(x: number) {
  const t = x / LENGTH;
  const widest = 0.55;
  if (t >= widest) return clamp(1 - ((t - widest) / (1 - widest)) ** 2) ** 0.75;
  return 1 - 0.55 * ((widest - t) / widest) ** 2;
}

/** How far the hull stands out of the board at (x, y): full at the deck, nothing at the profile. */
function halfBreadth(x: number, y: number) {
  const top = sheer(x);
  const depth = profile(x) - top;
  // At the bow tip the sheer meets the stem: no depth, nothing standing out.
  if (depth <= 0) return 0;
  const u = clamp((y - top) / depth);
  return BEAM * waterplane(x) * (1 - u * u);
}

/** Where the rest pose draws a point of the hull's surface. */
const projected = (x: number, y: number) => y + SHEAR * halfBreadth(x, y);

/** The board depth of each lift's top: the sheer cuts the first, the keel the last. */
const seamDepth = (k: number) => SHEER_LOW + (k * (HEIGHT - SHEER_LOW)) / LIFTS;

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

// Where each lift's planks butt, as shares of the length: staggered, as a shipwright lays them.
// The third lift's pair is the copper plank, a little aft of midships.
const BUTTS = [
  [0.27, 0.7],
  [0.14, 0.5, 0.86],
  [0.33, 0.63],
  [0.2, 0.47, 0.8],
  [0.37, 0.69],
  [0.26, 0.58],
  [0.45],
];
const COPPER_LIFT = 2; // the third, counted from the deck

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
