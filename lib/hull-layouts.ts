// The planks and the drawing's layouts (.crew/sprint/25/contract.md, build note 8): where each plank
// lies on the hull, and where each drawing puts its views. The lines plan (lib/lines-plan.ts) draws
// its SVG from them and the 3D model registers on the same numbers, so they live here, in a module
// that imports only the hull's shape and draws nothing: the model's chunk imports it without
// pulling in the drawing. The comments below cite sprint 22's contract and notes-iris.md
// (.crew/sprint/22/), where these numbers were set.
//
// Hull units, as in lib/half-model.ts: x from the stern (0) to the bow (LENGTH), y down from the bow
// tip. A layout maps them onto its drawing's viewBox.

import { BUTTS, ends, LENGTH, profile, seamDepth, sheer } from "./half-model";

/** One plank: lift k from the deck (0) to the keel (6), j from the stern (0), and its box. */
export type Plank = {
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

/** Where one drawing puts the three views, in its viewBox's units (notes-iris.md, section 4). */
export type Layout = {
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
export const WIDE: Layout = {
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
export const NARROW: Layout = {
  box: [0, -15, 390, 260],
  ox: 20,
  oy: 40,
  s: 0.5,
  hbY: 190,
  numbers: false,
};

/**
 * The Log's ghost hull at every width: the profile alone, at unit scale, with 4 units of margin for
 * the strokes; the ghost pass draws no half-breadth or body plan, so `hbY` is unused
 * (.crew/sprint/30/notes-iris.md, section 1.1).
 */
export const GHOST: Layout = {
  box: [0, 0, 632, 126],
  ox: 4,
  oy: 4,
  s: 1,
  hbY: 0,
  numbers: true,
};

/**
 * The plank in pencil's marks (B4b; .crew/sprint/34/decisions.md, 4; notes-iris.md, section 3),
 * shared by the 2D drawing and the 3D hull so the two draw the same plank.
 */
export const PENCIL = {
  /**
   * The hatch, in a drawing's viewBox units (a CSS pixel where WIDE is drawn 1408 wide and NARROW
   * 390): one line every `period` units across the lines, `width` thick, at 45° and rising to the
   * bow, tiled from the viewBox's user-space origin (0, 0), a line through it. It scales with the
   * drawing, as a fill does.
   */
  hatch: { period: 6, width: 1.4 },
  /** The edge's dashes, on then off, in CSS px: a line weight, which holds at every width. */
  dash: [4, 3],
  /**
   * The copper tip, while the crew is live: a run on the plank's lower edge (the seam, or the
   * keel's outline on lift 6), `inset` viewBox units inside it, from `from` to `to` of the plank's
   * body (the stretch where it is nearly a whole lift deep, stern to bow), `width` CSS px thick, and
   * a round dot `dot` CSS px across at its forward end. Both are line weights.
   */
  tip: { from: 1 / 2, to: 7 / 8, inset: 0, width: 2, dot: 8 },
} as const;

// --- A plank's depth and body ---------------------------------------------------------------
// Here rather than in the drawing, so /crew's crop and tally (below) and the 3D read one body.

/** A plank's depth at station x, top and bottom, or null where it has none. */
export function bandAt(plank: Plank, x: number): [number, number] | null {
  const top = Math.max(plank.yTop, sheer(x));
  const bottom = Math.min(plank.yBot, profile(x));
  return bottom - top > 0.05 ? [top, bottom] : null;
}

/** A plank's depth at station x, 0 where it has none. */
const depthAt = (plank: Plank, x: number) => {
  const band = bandAt(plank, x);
  return band ? band[1] - band[0] : 0;
};

const LIFT_DEPTH = seamDepth(1) - seamDepth(0);

export type Station = { x: number; depth: number };

/** A plank's depth at 49 stations along it, stern to bow. */
export function depths(plank: Plank): Station[] {
  return Array.from({ length: 49 }, (_, i) => {
    const x = plank.x0 + ((plank.x1 - plank.x0) * i) / 48;
    return { x, depth: depthAt(plank, x) };
  });
}

/** The first and last x where a plank is at least `depth` deep, or null where it never is. */
function stretch(
  stations: readonly Station[],
  depth: number,
): [number, number] | null {
  const deep = stations.filter((station) => station.depth >= depth);
  const [first, last] = [deep[0], deep.at(-1)];
  return first && last ? [first.x, last.x] : null;
}

/**
 * The plank's body, where its number goes: where it is nearly a whole lift deep, or nearly as deep
 * as it ever gets, for one the stem, stern or keel cuts.
 */
export function plankBody(
  stations: readonly Station[],
): [number, number] | null {
  const deepest = Math.max(...stations.map((station) => station.depth));
  return stretch(stations, 0.9 * Math.min(deepest, LIFT_DEPTH));
}

/**
 * A plank is led out when it is not two thirds of a lift deep (about its number's height) for
 * this long: no place on it holds the number clear of the outline and the butts at any width, so
 * the number is set aft of the hull with a leader to the plank (.crew/sprint/22/review-iris.md,
 * Changes 1). Only 5.0, the stern wedge of lift 5, is today.
 */
const LEAD_OUT_UNDER = 24;
const NUMBER_DEPTH = (2 / 3) * LIFT_DEPTH;

export function ledOut(stations: readonly Station[]) {
  const room = stretch(stations, NUMBER_DEPTH);
  return !room || room[1] - room[0] < LEAD_OUT_UNDER;
}

/** A led-out number's anchor, this far aft of its plank's stern end; it is set to end there. */
export const LEAD_OUT = 22;

// --- /crew's detail drawing (.crew/sprint/36/contract.md, "The detail drawing", "A tick"; Iris's
// final numbers, which replace the contract's 320 units, 16:9, and ticks rising into the plank) --

/**
 * The tally on the plank in pencil: one graphite tick per moment the panel lists, aft of the
 * copper pen, hanging from the plank's lower edge. Hull units but `width`; the 2D drawing and the
 * 3D hull both draw from these, through `tallyOf` and `markX`.
 */
export const MARKS = {
  /** Between ticks, along x. */
  pitch: 5,
  /** Slot 0's distance aft of the pen's dot. */
  first: 10,
  /** How far a tick hangs down from the plank's lower edge (the seam, or the keel's outline). */
  length: 4,
  /** A tick's weight, in CSS px: a line weight, which holds at every width. */
  width: 1.4,
  /** The slots: past this many moments the ten stay as they are. */
  max: 10,
  /** f's xs is the plank's sternmost x where it is at least this deep. */
  deep: 2,
} as const;

/** The tally's length at f = 1, the pen's dot to the last slot. */
const TALLY = MARKS.first + (MARKS.max - 1) * MARKS.pitch;
/** The last slot is kept this far forward of xs. */
const TALLY_STERN = 2;
/** The pencil's number stands at least this far aft of the pen, so its chip clears the dot. */
const NUMBER_AFT = 20;

/** A seat's tally: the pen's x (`PENCIL.tip.to` of the plank's body) and its f. */
export type Tally = { tip: number; f: number };

const plankOf = (seat: string) => PLANKS.find((plank) => plank.id === seat);

/**
 * A seat's tally, or null for a seat the hull doesn't have. f shortens the pitch on the short stern
 * seats, so all ten slots fit; it depends on the seat, never on the count.
 */
export function tallyOf(seat: string): Tally | null {
  const plank = plankOf(seat);
  const body = plank && plankBody(depths(plank));
  if (!plank || !body) return null;
  const tip = body[0] + (body[1] - body[0]) * PENCIL.tip.to;
  // xs to a hundredth of a unit, not the body's 49 stations: on the short stern seats f turns on
  // it, and the slots stand a tenth of a pixel apart from where a continuous reading puts them.
  let xs = plank.x0;
  while (xs < tip && depthAt(plank, xs) < MARKS.deep) xs += 0.01;
  return { tip, f: Math.min(1, (tip - xs - TALLY_STERN) / TALLY) };
}

/** Slot k's x on a seat's tally: 0 the newest, nearest the pen; a new moment fills the next aft. */
export const markX = ({ tip, f }: Tally, k: number) =>
  tip - (MARKS.first + MARKS.pitch * k) * f;

/**
 * The x of the focus plank's number: the body's middle, as on /; in pencil, no nearer the pen than
 * NUMBER_AFT, so the chip clears the dot; for a led-out plank, its anchor aft of the hull.
 */
export function numberX(seat: string, pencil: boolean): number {
  const plank = plankOf(seat);
  if (!plank) return LENGTH / 2;
  const stations = depths(plank);
  if (ledOut(stations)) return plank.x0 - LEAD_OUT;
  const body = plankBody(stations);
  const middle = body ? (body[0] + body[1]) / 2 : (plank.x0 + plank.x1) / 2;
  const tally = pencil ? tallyOf(seat) : null;
  return tally ? Math.min(middle, tally.tip - NUMBER_AFT) : middle;
}

/** How far either side of the pencil's number its chip reaches, in hull units, at any width. */
const NUMBER_SPAN = 10;

/**
 * The y of a number set on its plank (not led out), at `numberX`: the band's mid-depth, as on /. In
 * pencil, the middle of the band's top there and the shallowest bottom within NUMBER_SPAN, so on a
 * seat whose lower edge rises under the chip (3.0's counter) the chip stays above the edge the
 * ticks hang from (Iris, .crew/sprint/36/). Null where the plank has no band.
 */
export function numberY(seat: string, pencil: boolean): number | null {
  const plank = plankOf(seat);
  const x = numberX(seat, pencil);
  const band = plank && bandAt(plank, x);
  if (!plank || !band) return null;
  if (!pencil) return (band[0] + band[1]) / 2;
  let bottom = band[1];
  for (let dx = -NUMBER_SPAN; dx <= NUMBER_SPAN; dx += 0.5) {
    bottom = Math.min(bottom, bandAt(plank, x + dx)?.[1] ?? bottom);
  }
  return (band[0] + bottom) / 2;
}

/**
 * What the crop keeps in view, stern to bow: in pencil the tally, its number to just past the pen;
 * otherwise the number, 20 units either side.
 */
function extent(seat: string, pencil: boolean): [number, number] {
  const number = numberX(seat, pencil);
  const tally = pencil ? tallyOf(seat) : null;
  return tally
    ? [Math.min(tally.tip - TALLY * tally.f, number - 6), tally.tip + 2]
    : [number - 20, number + 20];
}

/** A detail drawing: its box, its scale and the profile's top (oy), in its viewBox's units. */
export type Detail = {
  box: readonly [number, number, number, number];
  s: number;
  oy: number;
  /** Whether the planks other than the focus carry their numbers. */
  numbers: boolean;
};

/** From 768 px: 480 hull units across, the profile's top 24% down, numbered as /crew always was. */
export const CREW_WIDE: Detail = {
  box: [0, 0, 808, 454.5],
  s: 808 / 480,
  oy: 0.24 * 454.5,
  numbers: true,
};

/** Below 768 px: 320 units across, the top 20% down, and only the focus plank's number. */
export const CREW_NARROW: Detail = {
  box: [0, 0, 390, 243.75],
  s: 390 / 320,
  oy: 0.2 * 243.75,
  numbers: false,
};

/**
 * The crop's centre in hull units: the end of the hull nearest the plank, moved only as far as
 * keeps the tally (or the number) a margin inside the box; centred on it where it can't be.
 * Fixed at first paint: no poll moves it.
 */
function cropX({ box, s }: Detail, focus: string, pencil: boolean): number {
  const across = box[2] / s;
  const margin = 0.12 * across;
  const plank = plankOf(focus);
  const aft = plank ? (plank.x0 + plank.x1) / 2 < LENGTH / 2 : true;
  const anchored = aft ? across / 2 - 20 : LENGTH + 20 - across / 2;
  const [stern, bow] = extent(focus, pencil);
  const lo = bow + margin - across / 2;
  const hi = stern - margin + across / 2;
  return lo > hi ? (stern + bow) / 2 : Math.min(hi, Math.max(lo, anchored));
}

/**
 * The layout a detail drawing is drawn on, centred on `focus` (`data-focus`); `pencil` when the
 * server drew that seat in pencil (`data-tally`). The profile alone: no half-breadth or body plan,
 * so `hbY` is unused.
 */
export function crewLayout(
  detail: Detail,
  focus: string,
  pencil: boolean,
): Layout {
  const { box, s, oy, numbers } = detail;
  return {
    box,
    ox: box[0] + box[2] / 2 - cropX(detail, focus, pencil) * s,
    oy: box[1] + oy,
    s,
    hbY: 0,
    numbers,
  };
}
