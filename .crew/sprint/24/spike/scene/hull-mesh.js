// B3 spike (sprint 24): the full hull as plain arrays, from lib/half-model.ts's numbers and nothing
// else, so the WebGL scene (A) and the WebGPU scene (B) build the same model and the sizes compare.
// No three.js import here: each scene wraps these arrays in its own build's BufferGeometry.
//
// Hull units as in lib/half-model.ts (x from the stern, y down from the bow tip, z the half-breadth),
// mapped to the model's own frame: centred on the profile's box, y up, z out of the page.
//
// Plain JavaScript on purpose: tsconfig includes every .ts in the repository, and this folder imports
// three.js, which the app doesn't install.

import {
  BUTTS,
  ends,
  HEIGHT,
  halfBreadth,
  LENGTH,
  profile,
  seamDepth,
  sheer,
} from "@/lib/half-model";

/**
 * Tessellation per quality level: stations along the whole length (cosine-spaced, closer at the
 * stern and the stem where the lines bend) and rows across each lift.
 */
export const LEVELS = {
  desktop: { stations: 120, rows: 8 },
  phone: { stations: 56, rows: 4 },
};

/** The model's frame: centred on the profile's box, y up. */
export const toLocal = (x, y, z) => [x - LENGTH / 2, HEIGHT / 2 - y, z];

/** The 22 planks, "k.j", exactly as lib/lines-plan.ts cuts them (copied: that module draws SVG). */
export const PLANKS = BUTTS.flatMap((butts, k) => {
  const yTop = k === 0 ? -20 : seamDepth(k);
  const yBot = seamDepth(k + 1);
  const [a, b] = ends(k === 0 ? 0.001 : seamDepth(k));
  const cuts = [
    a,
    ...butts.map((share) => share * LENGTH).filter((x) => x > a && x < b),
    b,
  ];
  return cuts
    .slice(1)
    .map((x1, j) => ({ id: `${k}.${j}`, k, x0: cuts[j], x1, yTop, yBot }));
});

const bandAt = (plank, x) => {
  const top = Math.max(plank.yTop, sheer(x));
  const bottom = Math.min(plank.yBot, profile(x));
  return bottom - top > 0.05 ? [top, bottom] : null;
};

const spaced = (a, b, n) =>
  Array.from(
    { length: n + 1 },
    (_, i) => a + (b - a) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n)),
  );

/** The level's stations inside (x0, x1), with both ends. */
const stationsIn = (stations, x0, x1) => [
  x0,
  ...stations.filter((x) => x > x0 + 0.05 && x < x1 - 0.05),
  x1,
];

/** A point on one side of the hull (side 1 or -1), and its outward normal, in the model's frame. */
function surface(x, y, side) {
  const at = (u, v) => toLocal(u, v, side * halfBreadth(u, v));
  const p = at(x, y);
  const h = 0.02;
  const [xa, xb, ya, yb] = [at(x - h, y), at(x + h, y), at(x, y - h), at(x, y + h)];
  const dx = xb.map((v, i) => v - xa[i]);
  const dy = yb.map((v, i) => v - ya[i]);
  let n = [
    dx[1] * dy[2] - dx[2] * dy[1],
    dx[2] * dy[0] - dx[0] * dy[2],
    dx[0] * dy[1] - dx[1] * dy[0],
  ];
  const len = Math.hypot(...n) || 1;
  n = n.map((v) => v / len);
  if (n[2] * side < 0) n = n.map((v) => -v);
  return { p, n };
}

/** One plank, both sides, as one indexed mesh. */
function plankMesh(plank, stations, rows) {
  // Where a lift runs out against the stem, the counter or the keel its band closes to a point: keep
  // that point, or the card stops a station short and leaves a notch in the silhouette (S4 found
  // 2 to 3 px at 1440 on the counter).
  const band = (x) => {
    const open = bandAt(plank, x);
    if (open || (x !== plank.x0 && x !== plank.x1)) return open;
    const y = Math.min(Math.max(plank.yTop, sheer(x)), profile(x));
    return [y, y];
  };
  const xs = stationsIn(stations, plank.x0, plank.x1).filter((x) => band(x));
  const position = [];
  const normal = [];
  const index = [];
  for (const side of [1, -1]) {
    const base = position.length / 3;
    for (const x of xs) {
      const [top, bottom] = band(x);
      for (let j = 0; j <= rows; j++) {
        const { p, n } = surface(x, top + ((bottom - top) * j) / rows, side);
        position.push(...p);
        normal.push(...n);
      }
    }
    // Front faces point out of the hull on either side, so back faces can be culled.
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < rows; j++) {
        const a = base + i * (rows + 1) + j;
        const b = a + rows + 1;
        const [c, d] = [a + 1, b + 1];
        if (side === 1) index.push(a, c, b, c, d, b);
        else index.push(a, b, c, c, b, d);
      }
    }
  }
  return pack(position, normal, index);
}

const pack = (position, normal, index) => ({
  position: new Float32Array(position),
  normal: new Float32Array(normal),
  index: new Uint16Array(index),
});

const deckBreadth = (x) =>
  profile(x) - sheer(x) > 0 ? halfBreadth(x, sheer(x)) : 0;

/** The deck and the transom, one mesh: they close the model's top and stern. */
function deckMesh(stations, rows) {
  const position = [];
  const normal = [];
  const index = [];
  stations.forEach((x, i) => {
    const y = sheer(x);
    const z = deckBreadth(x);
    // The deck follows the sheer: its normal leans with the sheer's slope.
    const slope = (sheer(x + 0.5) - sheer(x - 0.5)) / 1;
    const len = Math.hypot(slope, 1);
    position.push(...toLocal(x, y, -z), ...toLocal(x, y, z));
    normal.push(slope / len, 1 / len, 0, slope / len, 1 / len, 0);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const [top, bottom] = [sheer(0), profile(0)];
  const ys = Array.from(
    { length: rows * 2 + 1 },
    (_, i) => top + ((bottom - top) * i) / (rows * 2),
  );
  const ring = [
    ...ys.map((y) => toLocal(0, y, halfBreadth(0, y))),
    ...ys
      .slice(0, -1)
      .reverse()
      .map((y) => toLocal(0, y, -halfBreadth(0, y))),
  ];
  const centre = position.length / 3;
  position.push(...toLocal(0, (top + bottom) / 2, 0));
  normal.push(-1, 0, 0);
  for (const p of ring) {
    position.push(...p);
    normal.push(-1, 0, 0);
  }
  for (let i = 1; i < ring.length; i++) index.push(centre, centre + i + 1, centre + i);
  index.push(centre, centre + 1, centre + ring.length);
  return pack(position, normal, index);
}

/** A polyline as segment pairs, for one LineSegments2. */
const segments = (points, out) => {
  for (let i = 0; i < points.length - 1; i++) out.push(...points[i], ...points[i + 1]);
};

/**
 * The seams between lifts and the butts between planks, both sides: the ink the drawing gives every
 * plank's edge. On the surface itself: the card's polygon offset lets them win the depth test, and a
 * lift off the surface along the normal would move the lower seams down in the side view (S4).
 */
function seamLines(stations, rows) {
  const out = [];
  const on = (x, y, side) => surface(x, y, side).p;
  for (let k = 1; k < BUTTS.length; k++) {
    const y = seamDepth(k);
    const [a, b] = ends(y);
    const xs = stationsIn(stations, a, b);
    for (const side of [1, -1]) segments(xs.map((x) => on(x, y, side)), out);
  }
  PLANKS.forEach((plank, i) => {
    const previous = PLANKS[i - 1];
    if (!previous || previous.k !== plank.k) return;
    const band = bandAt(plank, plank.x0);
    if (!band) return;
    const ys = Array.from(
      { length: rows + 1 },
      (_, j) => band[0] + ((band[1] - band[0]) * j) / rows,
    );
    for (const side of [1, -1]) segments(ys.map((y) => on(plank.x0, y, side)), out);
  });
  return new Float32Array(out);
}

/** The outline in heavier ink: the sheer on both sides, the stem and keel, the transom. */
function outlineLines(stations, rows) {
  const out = [];
  const deck = stations.filter((x) => deckBreadth(x) > 0 || x >= LENGTH);
  for (const side of [1, -1]) {
    segments(
      deck.map((x) => toLocal(x, sheer(x), side * (deckBreadth(x) + 0.4))),
      out,
    );
  }
  segments(
    stations.map((x) => toLocal(x, profile(x), 0)),
    out,
  );
  const [top, bottom] = [sheer(0), profile(0)];
  const ys = Array.from(
    { length: rows * 2 + 1 },
    (_, i) => top + ((bottom - top) * i) / (rows * 2),
  );
  for (const side of [1, -1]) {
    segments(
      ys.map((y) => toLocal(0, y, side * halfBreadth(0, y))),
      out,
    );
  }
  return new Float32Array(out);
}

/**
 * Everything the scene draws, at one quality level. `points` is the silhouette's skeleton (the
 * sheer both sides, the keel, the transom), for framing the model without reading the GPU.
 */
export function buildHull(level) {
  const { stations: n, rows } = LEVELS[level];
  // Every lift's ends join the stations, so the card and the outline turn the stem and the counter
  // at the same points: without them the card's corner strays 1.4 px from the ink at 390 (S4).
  const liftEnds = Array.from({ length: BUTTS.length - 1 }, (_, k) => ends(seamDepth(k + 1))).flat();
  const stations = [...spaced(0, LENGTH, n), ...liftEnds].sort((a, b) => a - b);
  const planks = PLANKS.map((plank) => ({
    id: plank.id,
    ...plankMesh(plank, stations, rows),
  }));
  const deck = deckMesh(stations, rows);
  const seams = seamLines(stations, rows);
  const outline = outlineLines(stations, rows);
  const triangles =
    planks.reduce((sum, plank) => sum + plank.index.length / 3, 0) +
    deck.index.length / 3;
  return { planks, deck, seams, outline, triangles, points: outlinePoints() };
}

/** The silhouette's skeleton: what framing and the shadow need, independent of the level. */
function outlinePoints() {
  const xs = spaced(0, LENGTH, 48);
  const out = [];
  for (const x of xs) {
    const z = deckBreadth(x);
    out.push(toLocal(x, sheer(x), z), toLocal(x, sheer(x), -z));
    out.push(toLocal(x, profile(x), 0));
    // The turn of the bilge, where the side stands out furthest below the sheer in a three-quarter view.
    const mid = (sheer(x) + profile(x)) / 2;
    out.push(toLocal(x, mid, halfBreadth(x, mid)), toLocal(x, mid, -halfBreadth(x, mid)));
  }
  return out;
}
