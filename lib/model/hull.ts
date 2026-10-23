// The full hull as plain arrays (.crew/sprint/24/spike/scene/hull-mesh.js, ported): both halves of
// lib/half-model.ts's planks, the deck and the transom, the seams and the outline. No three.js
// here: lib/model/stage.ts wraps the arrays. The planks are the 22 of lib/hull-layouts.ts, which
// draws nothing, so the 3D chunk doesn't pull in the SVG drawing (contract, build note 8).
//
// Hull units as in lib/half-model.ts (x from the stern, y down from the bow tip, z the
// half-breadth), mapped to the model's own frame: centred on the profile's box, y up, z out of the
// page.

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
import { PLANKS, type Plank } from "@/lib/hull-layouts";

export type Vec3 = [number, number, number];

/** A level of detail: stations along the whole length (cosine-spaced) and rows across each lift. */
export type Level = { stations: number; rows: number };

/**
 * S2's two levels (.crew/sprint/26/contract.md, "Quality"): the desktop's from 768 px, about 25,000
 * triangles a frame with the lines; the phone's below, about a quarter of that. The level follows
 * the drawing shown, never the device.
 */
export const DESKTOP: Level = { stations: 120, rows: 8 };
export const PHONE: Level = { stations: 56, rows: 4 };

/** The state lookup's slot for the deck and the transom, after the 22 planks: always card. */
export const DECK = PLANKS.length;

/** The model's frame: centred on the profile's box, y up. */
const toLocal = (x: number, y: number, z: number): Vec3 => [
  x - LENGTH / 2,
  HEIGHT / 2 - y,
  z,
];

const bandAt = (plank: Plank, x: number): [number, number] | null => {
  const top = Math.max(plank.yTop, sheer(x));
  const bottom = Math.min(plank.yBot, profile(x));
  return bottom - top > 0.05 ? [top, bottom] : null;
};

const spaced = (a: number, b: number, n: number) =>
  Array.from(
    { length: n + 1 },
    (_, i) => a + (b - a) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n)),
  );

/** The stations inside (x0, x1), with both ends. */
const stationsIn = (stations: number[], x0: number, x1: number) => [
  x0,
  ...stations.filter((x) => x > x0 + 0.05 && x < x1 - 0.05),
  x1,
];

/** A point on one side of the hull (side 1 or -1) and its outward normal, in the model's frame. */
function surface(x: number, y: number, side: number) {
  const at = (u: number, v: number) => toLocal(u, v, side * halfBreadth(u, v));
  const p = at(x, y);
  const h = 0.02;
  const [xa, xb, ya, yb] = [
    at(x - h, y),
    at(x + h, y),
    at(x, y - h),
    at(x, y + h),
  ];
  const [dx0, dx1, dx2] = [xb[0] - xa[0], xb[1] - xa[1], xb[2] - xa[2]];
  const [dy0, dy1, dy2] = [yb[0] - ya[0], yb[1] - ya[1], yb[2] - ya[2]];
  let n: Vec3 = [
    dx1 * dy2 - dx2 * dy1,
    dx2 * dy0 - dx0 * dy2,
    dx0 * dy1 - dx1 * dy0,
  ];
  const len = Math.hypot(...n) || 1;
  const flip = n[2] * side < 0 ? -1 : 1;
  n = [(flip * n[0]) / len, (flip * n[1]) / len, (flip * n[2]) / len];
  return { p, n };
}

/** The card mesh as it grows: positions, normals, each vertex's state slot, and the indices. */
class Card {
  position: number[] = [];
  normal: number[] = [];
  slot: number[] = [];
  index: number[] = [];

  get count() {
    return this.position.length / 3;
  }

  vertex(p: Vec3, n: Vec3, slot: number) {
    this.position.push(...p);
    this.normal.push(...n);
    this.slot.push(slot);
  }
}

/** One plank, both sides, into the card mesh with its slot. */
function plankMesh(
  card: Card,
  plank: Plank,
  slot: number,
  stations: number[],
  rows: number,
) {
  // Where a lift runs out against the stem, the counter or the keel its band closes to a point:
  // keep that point, or the card stops a station short and leaves a notch in the silhouette (S4).
  const band = (x: number): [number, number] | null => {
    const open = bandAt(plank, x);
    if (open || (x !== plank.x0 && x !== plank.x1)) return open;
    const y = Math.min(Math.max(plank.yTop, sheer(x)), profile(x));
    return [y, y];
  };
  const xs = stationsIn(stations, plank.x0, plank.x1).filter((x) => band(x));
  for (const side of [1, -1]) {
    const base = card.count;
    for (const x of xs) {
      const [top, bottom] = band(x) ?? [0, 0];
      for (let j = 0; j <= rows; j++) {
        const { p, n } = surface(x, top + ((bottom - top) * j) / rows, side);
        card.vertex(p, n, slot);
      }
    }
    // Front faces point out of the hull on either side, so back faces can be culled.
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < rows; j++) {
        const a = base + i * (rows + 1) + j;
        const b = a + rows + 1;
        const [c, d] = [a + 1, b + 1];
        if (side === 1) card.index.push(a, c, b, c, d, b);
        else card.index.push(a, b, c, c, b, d);
      }
    }
  }
}

const deckBreadth = (x: number) =>
  profile(x) - sheer(x) > 0 ? halfBreadth(x, sheer(x)) : 0;

/** The transom's rows, from the sheer to the keel at the stern. */
const transomRows = (rows: number) => {
  const [top, bottom] = [sheer(0), profile(0)];
  return Array.from(
    { length: rows * 2 + 1 },
    (_, i) => top + ((bottom - top) * i) / (rows * 2),
  );
};

/** The deck and the transom into the card mesh: they close the model's top and stern. */
function deckMesh(card: Card, stations: number[], rows: number) {
  const base = card.count;
  stations.forEach((x, i) => {
    const y = sheer(x);
    const z = deckBreadth(x);
    // The deck follows the sheer: its normal leans with the sheer's slope.
    const slope = sheer(x + 0.5) - sheer(x - 0.5);
    const len = Math.hypot(slope, 1);
    const n: Vec3 = [slope / len, 1 / len, 0];
    card.vertex(toLocal(x, y, -z), n, DECK);
    card.vertex(toLocal(x, y, z), n, DECK);
    if (i > 0) {
      const a = base + (i - 1) * 2;
      card.index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const ys = transomRows(rows);
  const ring = [
    ...ys.map((y) => toLocal(0, y, halfBreadth(0, y))),
    ...ys
      .slice(0, -1)
      .reverse()
      .map((y) => toLocal(0, y, -halfBreadth(0, y))),
  ];
  const aft: Vec3 = [-1, 0, 0];
  const centre = card.count;
  card.vertex(toLocal(0, (sheer(0) + profile(0)) / 2, 0), aft, DECK);
  for (const p of ring) card.vertex(p, aft, DECK);
  for (let i = 1; i < ring.length; i++)
    card.index.push(centre, centre + i + 1, centre + i);
  card.index.push(centre, centre + 1, centre + ring.length);
}

/** A polyline as segment pairs, for one batch of fat lines. */
const segments = (points: Vec3[], out: number[]) => {
  for (let i = 0; i < points.length - 1; i++) {
    out.push(...(points[i] as Vec3), ...(points[i + 1] as Vec3));
  }
};

/** A plank's lift, k in "k.j". */
const lift = (plank: Plank) => Number(plank.id.split(".")[0]);

/**
 * The seams between lifts and the butts between planks, both sides: the ink the drawing gives
 * every plank's edge. On the surface itself: the card's polygon offset lets them win the depth
 * test, where a lift along the normal would move the lower seams down in the side view (S4).
 */
function seamLines(stations: number[], rows: number) {
  const out: number[] = [];
  const on = (x: number, y: number, side: number) => surface(x, y, side).p;
  for (let k = 1; k < BUTTS.length; k++) {
    const y = seamDepth(k);
    const [a, b] = ends(y);
    const xs = stationsIn(stations, a, b);
    for (const side of [1, -1])
      segments(
        xs.map((x) => on(x, y, side)),
        out,
      );
  }
  PLANKS.forEach((plank, i) => {
    const previous = PLANKS[i - 1];
    if (!previous || lift(previous) !== lift(plank)) return;
    const band = bandAt(plank, plank.x0);
    if (!band) return;
    const ys = Array.from(
      { length: rows + 1 },
      (_, j) => band[0] + ((band[1] - band[0]) * j) / rows,
    );
    for (const side of [1, -1])
      segments(
        ys.map((y) => on(plank.x0, y, side)),
        out,
      );
  });
  return new Float32Array(out);
}

/** The outline in heavier ink: the sheer on both sides, the stem and keel, the transom. */
function outlineLines(stations: number[], rows: number) {
  const out: number[] = [];
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
  const ys = transomRows(rows);
  for (const side of [1, -1]) {
    segments(
      ys.map((y) => toLocal(0, y, side * halfBreadth(0, y))),
      out,
    );
  }
  return new Float32Array(out);
}

/** The silhouette's skeleton: what framing the model needs, without reading the GPU. */
function skeleton() {
  const out: Vec3[] = [];
  for (const x of spaced(0, LENGTH, 48)) {
    const z = deckBreadth(x);
    out.push(toLocal(x, sheer(x), z), toLocal(x, sheer(x), -z));
    out.push(toLocal(x, profile(x), 0));
    // The turn of the bilge, where the side stands out furthest below the sheer at three-quarters.
    const mid = (sheer(x) + profile(x)) / 2;
    out.push(
      toLocal(x, mid, halfBreadth(x, mid)),
      toLocal(x, mid, -halfBreadth(x, mid)),
    );
  }
  return out;
}

export type Hull = ReturnType<typeof buildHull>;

/**
 * Everything the scene draws. The card is one mesh, every plank, the deck and the transom, with
 * a per-vertex slot into the state lookup (contract, build note 1), so the planks are one draw on
 * every stack (S3), at either level.
 */
export function buildHull({ stations: count, rows }: Level) {
  // Every lift's ends join the stations, so the card and the outline turn the stem and the counter
  // at the same points (S4, rule 2; build note 3).
  const liftEnds = Array.from({ length: BUTTS.length - 1 }, (_, k) =>
    ends(seamDepth(k + 1)),
  ).flat();
  const stations = [...spaced(0, LENGTH, count), ...liftEnds].sort(
    (a, b) => a - b,
  );
  const card = new Card();
  PLANKS.forEach((plank, slot) => {
    plankMesh(card, plank, slot, stations, rows);
  });
  deckMesh(card, stations, rows);
  return {
    position: new Float32Array(card.position),
    normal: new Float32Array(card.normal),
    slot: new Float32Array(card.slot),
    index: new Uint16Array(card.index),
    seams: seamLines(stations, rows),
    outline: outlineLines(stations, rows),
    points: skeleton(),
  };
}
