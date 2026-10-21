// A scratch port of lib/half-model.ts (read-only reference, nothing in lib/ is edited), mirrored
// into a full hull for the canvas's renders. Units: x stern (0) to bow (LENGTH), y down from the
// bow tip, z the half-breadth.
export const LENGTH = 624;
export const HEIGHT = 118;
const BEAM = 70;
export const LIFTS = 7;
const SHEER_LOW = 13;
const SHEER_LOW_AT = 0.4;
export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function sheer(x) {
  const t = x / LENGTH;
  const rise = SHEER_LOW / (1 - SHEER_LOW_AT) ** 2;
  return SHEER_LOW - rise * (t - SHEER_LOW_AT) ** 2;
}

const PROFILE = [
  [0, 0.3], [0.08, 0.42], [0.18, 0.66], [0.28, 0.86], [0.38, 0.96], [0.5, 1],
  [0.66, 0.98], [0.78, 0.92], [0.87, 0.8], [0.93, 0.62], [0.97, 0.36], [1, 0],
];
const DEEPEST_AT = 0.5;
const profileAt = (() => {
  const xs = PROFILE.map(([t]) => t);
  const ys = PROFILE.map(([, y]) => y);
  const n = xs.length;
  const secant = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const slope = xs.map((_, i) => {
    if (i === 0) return secant[0];
    if (i === n - 1) return secant[n - 2];
    const [a, b] = [secant[i - 1], secant[i]];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  return (t) => {
    let i = 0;
    while (i < n - 2 && t > xs[i + 1]) i++;
    const [x0, x1, y0, y1] = [xs[i], xs[i + 1], ys[i], ys[i + 1]];
    const h = x1 - x0;
    const u = clamp((t - x0) / h);
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return h00 * y0 + h10 * h * slope[i] + h01 * y1 + h11 * h * slope[i + 1];
  };
})();
export const profile = (x) => HEIGHT * profileAt(x / LENGTH);

export function ends(y) {
  const deepest = DEEPEST_AT * LENGTH;
  const solve = (lo, hi, rising) => {
    let [a, b] = [lo, hi];
    for (let i = 0; i < 40; i++) {
      const mid = (a + b) / 2;
      if ((profile(mid) < y) === rising) a = mid;
      else b = mid;
    }
    return (a + b) / 2;
  };
  const aft = profile(0) >= y ? 0 : solve(0, deepest, true);
  return [aft, solve(deepest, LENGTH, false)];
}

function waterplane(x) {
  const t = x / LENGTH;
  const widest = 0.55;
  if (t >= widest) return clamp(1 - ((t - widest) / (1 - widest)) ** 2) ** 0.75;
  return 1 - 0.55 * ((widest - t) / widest) ** 2;
}

export function halfBreadth(x, y) {
  const top = sheer(x);
  const depth = profile(x) - top;
  if (depth <= 0) return 0;
  const u = clamp((y - top) / depth);
  return BEAM * waterplane(x) * (1 - u * u);
}
export const deckBreadth = (x) => BEAM * waterplane(x);

export const seamDepth = (k) => SHEER_LOW + (k * (HEIGHT - SHEER_LOW)) / LIFTS;

export const BUTTS = [
  [0.27, 0.7],
  [0.14, 0.5, 0.86],
  [0.33, 0.63],
  [0.2, 0.47, 0.8],
  [0.37, 0.69],
  [0.26, 0.58],
  [0.45],
];

/** Each plank: lift k, index j, its x range and y band. */
export function planks() {
  const out = [];
  for (let k = 0; k < LIFTS; k++) {
    const yTop = k === 0 ? -20 : seamDepth(k);
    const yBot = seamDepth(k + 1);
    // A lift reaches as far as the profile stays below its top.
    const [a, b] = ends(k === 0 ? seamDepth(0) * 0 + 0.001 : seamDepth(k));
    const cuts = [a, ...BUTTS[k].map((s) => s * LENGTH).filter((x) => x > a && x < b), b];
    for (let j = 0; j < cuts.length - 1; j++) {
      out.push({ id: `${k}.${j}`, k, j, x0: cuts[j], x1: cuts[j + 1], yTop, yBot });
    }
  }
  return out;
}

/** The band of a plank at station x: [top y, bottom y], or null where it has no depth. */
export function bandAt(p, x) {
  const top = Math.max(p.yTop, sheer(x));
  const bot = Math.min(p.yBot, profile(x));
  return bot - top > 0.05 ? [top, bot] : null;
}

// The shipwright's order (sprint 15, .crew/sprint/15/direction-iris.md): the k-th merged sprint
// replaces ORDER[(k - 1) mod 22].
export const ORDER = "5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.2 3.1 4.1 2.2 5.0 3.3 0.0 1.0".split(" ");
