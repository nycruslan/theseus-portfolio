// The sheet's lines plan (.crew/sprint/22/notes-iris.md, sections 4 and 5): the hull's profile with
// every plank drawn, its half-breadth plan and its body plan, as a draughtsman lays them out. The
// maths is sprint 17's render (.crew/sprint/17/render/hull.mjs and drawing.mjs) on this repo's own
// hull (lib/half-model.ts). It runs once, on the server, at build time: the page receives finished
// path strings and the lettering's places, and no script.
//
// Hull units throughout, as in lib/half-model.ts: x from the stern (0) to the bow (LENGTH), y down
// from the bow tip, z the half-breadth. Each layout maps them onto its own viewBox.

import {
  BUTTS,
  clamp,
  ends,
  HEIGHT,
  halfBreadth,
  LENGTH,
  profile,
  seamDepth,
  sheer,
} from "./half-model";

type Point = readonly [number, number];

/** One plank: lift k from the deck (0) to the keel (6), j from the stern (0), and its box. */
type Plank = {
  id: string;
  x0: number;
  x1: number;
  yTop: number;
  yBot: number;
};

/** The 22 planks, `"k.j"`. A lift has one more plank than it has butts. */
export const PLANKS: readonly Plank[] = BUTTS.flatMap((butts, k) => {
  // The deck lift's top is the sheer, so its box starts above the whole hull and the outline cuts it.
  const yTop = k === 0 ? -20 : seamDepth(k);
  const yBot = seamDepth(k + 1);
  // A lift reaches as far as the profile stays below its top.
  const [a, b] = ends(k === 0 ? 0.001 : seamDepth(k));
  const cuts = [
    a,
    ...butts.map((share) => share * LENGTH).filter((x) => x > a && x < b),
    b,
  ];
  return cuts.slice(1).map((x1, j) => ({
    id: `${k}.${j}`,
    x0: cuts[j] ?? a,
    x1,
    yTop,
    yBot,
  }));
});

/**
 * The shipwright's order (.crew/sprint/15/direction-iris.md): the k-th merged sprint seats plank
 * ORDER[(k - 1) mod 22], so a new plank always lands away from the last one.
 */
const ORDER =
  "5.1 3.2 1.1 6.0 4.2 0.1 2.0 3.0 5.2 1.3 4.0 0.2 6.1 2.1 1.2 3.1 4.1 2.2 5.0 3.3 0.0 1.0".split(
    " ",
  );

/**
 * Each plank's label: the last sprint to seat it, from the merged sprints in ascending order. A
 * plank missing from the map is original.
 */
export function seatPlanks(merged: readonly number[]): Map<string, number> {
  const seats = new Map<string, number>();
  for (const [i, sprint] of merged.entries()) {
    const id = ORDER[i % ORDER.length];
    if (id) seats.set(id, sprint);
  }
  return seats;
}

/** A plank's depth at station x, top and bottom, or null where it has none. */
function bandAt(plank: Plank, x: number): Point | null {
  const top = Math.max(plank.yTop, sheer(x));
  const bottom = Math.min(plank.yBot, profile(x));
  return bottom - top > 0.05 ? [top, bottom] : null;
}

const LIFT_DEPTH = seamDepth(1) - seamDepth(0);

/**
 * Where a plank's number sits: in the middle of its depth, halfway along the stretch where the
 * plank is nearly a whole lift deep. For most planks that is mid-length; for one the stem, stern or
 * keel cuts, it is the middle of what's left, so the number stays on the plank's body and clear of
 * its neighbours' numbers at 768 px.
 */
function numberAt(plank: Plank): Point | null {
  const xs = Array.from(
    { length: 49 },
    (_, i) => plank.x0 + ((plank.x1 - plank.x0) * i) / 48,
  );
  const depth = (x: number) => {
    const band = bandAt(plank, x);
    return band ? band[1] - band[0] : 0;
  };
  const deepest = Math.max(...xs.map(depth));
  const deep = xs.filter(
    (x) => depth(x) >= 0.9 * Math.min(deepest, LIFT_DEPTH),
  );
  const [first, last] = [deep[0], deep.at(-1)];
  if (first === undefined || last === undefined) return null;
  const x = (first + last) / 2;
  const band = bandAt(plank, x);
  return band ? [x, (band[0] + band[1]) / 2] : null;
}

// --- Path strings ---------------------------------------------------------------------------

/** One decimal and no leading zero: a tenth of a unit is under a pixel at every width. */
const num = (v: number) =>
  (Math.round(v * 10) / 10).toString().replace(/^(-?)0\./, "$1.");
const pt = ([x, y]: Point) => `${num(x)} ${num(y)}`;

/**
 * A smooth run through the points, starting where the path already is (the first point): a
 * Catmull-Rom spline as cubic Béziers. Its tangents are symmetric at each joint, so every segment
 * after the first is an `S`, which keeps the markup small.
 */
function spline(points: readonly Point[]) {
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

const curve = (points: readonly Point[]) =>
  points[0] ? `M${pt(points[0])}${spline(points)}` : "";

/** n + 1 values from a to b, closer together toward both ends, where the hull's lines bend. */
const spaced = (a: number, b: number, n: number) =>
  Array.from(
    { length: n + 1 },
    (_, i) => a + (b - a) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n)),
  );

// --- Layouts --------------------------------------------------------------------------------

/** Where one drawing puts the three views, in its viewBox's units (notes-iris.md, section 4). */
type Layout = {
  /** The viewBox: left, top, width, height. */
  box: readonly [number, number, number, number];
  /** The profile's origin and scale; the half-breadth plan shares them. */
  ox: number;
  oy: number;
  s: number;
  /** The half-breadth plan's centreline. */
  hbY: number;
  /** The body plan's centre and scale, where it is drawn. */
  body?: { bx: number; by: number; bs: number };
  /** Whether each seated plank carries its sprint's number. */
  numbers: boolean;
};

/** From 768 px: the three views, at 1440 exactly where the canvas places them (Main.html). */
const WIDE: Layout = {
  box: [0, 0, 1408, 476],
  ox: 76,
  oy: 96,
  s: 1.3,
  hbY: 406,
  body: { bx: 1180, by: 96, bs: 1.3 },
  numbers: true,
};

/**
 * Below 768 px: the profile and the half-breadth plan, the planks shown by their fills alone. A
 * plank is about 8 px deep at this scale, too shallow for a number (contract, "The calls I made").
 */
const NARROW: Layout = {
  box: [0, -15, 390, 260],
  ox: 20,
  oy: 40,
  s: 0.5,
  hbY: 190,
  numbers: false,
};

// --- The drawing ----------------------------------------------------------------------------

/** The kinds of line, one path each, styled in app/globals.css ("The lines plan"). */
type Lines = {
  /** Stations and the half-breadth plan's waterlines: pencil, 0.6. */
  construction: string;
  /** The profile's and the body plan's waterlines: pencil, 0.5. */
  waterlines: string;
  /** Base lines: graphite, 0.75. */
  base: string;
  /** The designed waterline and centrelines: graphite, 0.75, dash-dot. */
  centrelines: string;
  /** Body plan sections: ink, 0.9. */
  sections: string;
  /** The half-breadth plan's deck line and transom: ink, 1.4. */
  deck: string;
  /** The hull's outline and the midship section: ink, 1.6. */
  outline: string;
};

/** A word or figure on the drawing, set in HTML over the SVG (notes-iris.md, section 4). */
export type Lettering = {
  text: string;
  /** The anchor, in % of the drawing's box. */
  left: number;
  top: number;
  /** Which part of the text sits on the anchor; it is always centred on it vertically. */
  align: "start" | "middle" | "end";
  /** Captions in ink, figures in graphite, plank numbers in ink. */
  kind: "caption" | "figure" | "plank";
  /** Shown only where the drawing is wide enough to keep it clear of its neighbours. */
  wideOnly?: boolean;
};

/** Sets one piece of lettering at a point of the drawing, in its viewBox's units. */
type Letter = (
  text: string,
  at: Point,
  align: Lettering["align"],
  kind: Lettering["kind"],
  wideOnly?: boolean,
) => void;

type PlankShape = { id: string; d: string; sprint?: number };

export type LinesPlan = {
  viewBox: string;
  /** The hull's outline as a closed shape: the planks are clipped to it. */
  hull: string;
  planks: PlankShape[];
  lines: Lines;
  lettering: Lettering[];
};

const BASE = HEIGHT + 10;
const DWL = seamDepth(3) + 7;
/** The seams between lifts, as depths: the waterlines the drawing carries. */
const SEAMS = Array.from({ length: BUTTS.length - 1 }, (_, i) =>
  seamDepth(i + 1),
);

function draw(layout: Layout, seats: ReadonlyMap<string, number>): LinesPlan {
  const { box, ox, oy, s, hbY, body } = layout;
  const P = (x: number, y: number): Point => [ox + x * s, oy + y * s];
  const H = (x: number, z: number): Point => [ox + x * s, hbY - z * s];
  const X = (x: number) => num(ox + x * s);
  const lettering: Lettering[] = [];
  const letter: Letter = (text, [x, y], align, kind, wideOnly) =>
    lettering.push({
      text,
      left: Math.round(((x - box[0]) / box[2]) * 10000) / 100,
      top: Math.round(((y - box[1]) / box[3]) * 10000) / 100,
      align,
      kind,
      ...(wideOnly ? { wideOnly } : {}),
    });

  const lines: Lines = {
    construction: "",
    waterlines: "",
    base: "",
    centrelines: "",
    sections: "",
    deck: "",
    outline: "",
  };

  // The profile. Stations 0 to 10 run down through the half-breadth plan too.
  for (let i = 0; i <= 10; i++) {
    const [x] = P((LENGTH * i) / 10, 0);
    lines.construction += `M${num(x)} ${num(oy - 14)}V${num(hbY + 6)}`;
    letter(String(i), [x, oy + BASE * s + 12], "middle", "figure");
  }
  for (const y of SEAMS) {
    const [a, b] = ends(y);
    lines.waterlines += `M${pt(P(a - 18, y))}H${X(b + 18)}`;
  }
  lines.base += `M${pt(P(-30, BASE))}H${X(LENGTH + 30)}`;
  lines.centrelines += `M${pt(P(-30, DWL))}H${X(LENGTH + 30)}`;
  letter("DWL", P(LENGTH + 34, DWL), "start", "figure");
  letter("Base", P(LENGTH + 34, BASE), "start", "figure");
  letter("Profile", [ox, oy - 30], "start", "caption");

  // The outline: the sheer from the transom to the bow tip, then the stem and keel back, and the
  // transom closes it.
  const hull = `${curve(spaced(0, LENGTH, 8).map((x) => P(x, sheer(x))))}${spline(
    spaced(LENGTH, 0, 28).map((x) => P(x, profile(x))),
  )}Z`;
  lines.outline += hull;

  // Each plank is its lift's box between two butts, cut by the outline; the seated ones carry
  // their sprint's number.
  const planks = PLANKS.map((plank): PlankShape => {
    const [x0, y0] = P(plank.x0, plank.yTop);
    const [x1, y1] = P(plank.x1, plank.yBot);
    const sprint = seats.get(plank.id);
    const at = layout.numbers && sprint !== undefined ? numberAt(plank) : null;
    if (at) letter(String(sprint), P(...at), "middle", "plank");
    return {
      id: plank.id,
      d: `M${num(x0)} ${num(y0)}H${num(x1)}V${num(y1)}H${num(x0)}Z`,
      ...(sprint === undefined ? {} : { sprint }),
    };
  });

  // The half-breadth plan: each seam's breadth along the hull, the deck line and the transom.
  lines.centrelines += `M${pt(H(-30, 0))}H${X(LENGTH + 30)}`;
  for (const y of SEAMS) {
    const [a, b] = ends(y);
    lines.construction += curve(
      spaced(a, b, 16).map((x) => H(x, halfBreadth(x, y))),
    );
  }
  const deck = (x: number) => halfBreadth(x, sheer(x));
  lines.deck += `${curve(spaced(0, LENGTH, 20).map((x) => H(x, deck(x))))}M${pt(
    H(0, 0),
  )}V${num(H(0, deck(0))[1])}`;
  letter("Half-breadth plan", [ox, hbY + 16], "start", "caption");

  if (body) drawBody(body, lines, letter);

  return {
    viewBox: box.join(" "),
    hull,
    planks,
    lines,
    lettering,
  };
}

/**
 * The body plan: a section at each station, the aft half to the left of the centreline and the
 * forward half to the right, as the convention draws them; the midship section both sides.
 */
function drawBody(
  { bx, by, bs }: NonNullable<Layout["body"]>,
  lines: Lines,
  letter: Letter,
) {
  const B = (z: number, y: number): Point => [bx + z * bs, by + y * bs];
  const across = (half: number, y: number) =>
    `M${pt(B(-half, y))}H${num(B(half, y)[0])}`;
  lines.centrelines += `M${pt(B(0, -12))}V${num(B(0, BASE + 8)[1])}${across(84, DWL)}`;
  lines.base += across(80, BASE);
  for (const y of SEAMS) lines.waterlines += across(76, y);
  for (let i = 0; i <= 10; i++) {
    const x = Math.min(LENGTH - 0.5, (LENGTH * i) / 10);
    const [top, bottom] = [sheer(x), profile(x)];
    if (bottom - top < 0.5) continue;
    const depths = spaced(top, bottom, 8);
    const side = (sign: number) =>
      curve(depths.map((y) => B(sign * halfBreadth(x, y), y)));
    const sign = i <= 5 ? -1 : 1;
    if (i === 5) {
      lines.outline += side(-1) + side(1);
      continue;
    }
    lines.sections += side(sign);
    // Every other station is numbered: at 13 px the odd ones would touch their neighbours.
    if (i % 2 === 0) {
      const [px, py] = B(sign * halfBreadth(x, top), top);
      letter(
        String(i),
        [px + sign * 6, py - 8],
        sign < 0 ? "end" : "start",
        "figure",
        true,
      );
    }
  }
  letter("Body plan", [bx, by - 30], "middle", "caption");
}

/** The two drawings the sheet carries, one shown per width (app/globals.css, "The lines plan"). */
export function linesPlans(seats: ReadonlyMap<string, number>) {
  return { wide: draw(WIDE, seats), narrow: draw(NARROW, seats) };
}
