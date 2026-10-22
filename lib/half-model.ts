// The hull (.crew/sprint/7/direction-iris.md): one small parametric shape rather than a drawing, so
// the lines stay fair and every view of it comes from the same numbers. The sheet's lines plan
// (lib/lines-plan.ts, sprint 22) draws its profile, half-breadth plan and body plan from it, on the
// server at build time; B3's 3D model is meant to build from it too. So this file holds the hull's
// shape and nothing only one drawing needs.
//
// Units: the hull is LENGTH long, stern at x = 0, bow at x = LENGTH, y down from the bow tip. z is
// the half-breadth, how far the side stands out from the centreline.

export const LENGTH = 624;
export const HEIGHT = 118;

const BEAM = 70; // the greatest half-breadth, at the deck: a narrow yacht, as Herreshoff's were
const LIFTS = 7;
const SHEER_LOW = 13; // the sheer's lowest point, a little aft of midships
const SHEER_LOW_AT = 0.4;

export const clamp = (v: number, lo = 0, hi = 1) =>
  Math.min(hi, Math.max(lo, v));

/** The sheer: high at the bow, lowest a little aft of midships, rising again to the stern. */
export function sheer(x: number) {
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

export const profile = (x: number) => HEIGHT * profileAt(x / LENGTH);

/** Where a waterline at depth y meets the profile, aft and forward (the profile is a valley). */
export function ends(y: number): [number, number] {
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

/** The half-breadth at (x, y): the deck's full breadth at the sheer, nothing at the profile. */
export function halfBreadth(x: number, y: number) {
  const top = sheer(x);
  const depth = profile(x) - top;
  // At the bow tip the sheer meets the stem: no depth, nothing standing out.
  if (depth <= 0) return 0;
  const u = clamp((y - top) / depth);
  return BEAM * waterplane(x) * (1 - u * u);
}

/** The depth of each lift's top: the sheer cuts the first, the keel the last. */
export const seamDepth = (k: number) =>
  SHEER_LOW + (k * (HEIGHT - SHEER_LOW)) / LIFTS;

// Where each lift's planks butt, as shares of the length: staggered, as a shipwright lays them.
export const BUTTS = [
  [0.27, 0.7],
  [0.14, 0.5, 0.86],
  [0.33, 0.63],
  [0.2, 0.47, 0.8],
  [0.37, 0.69],
  [0.26, 0.58],
  [0.45],
];
