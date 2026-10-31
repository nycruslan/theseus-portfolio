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

const LIFT_DEPTH = seamDepth(1) - seamDepth(0);

export type Station = { x: number; depth: number };

/** A plank's depth at 49 stations along it, stern to bow. */
export function depths(plank: Plank): Station[] {
  return Array.from({ length: 49 }, (_, i) => {
    const x = plank.x0 + ((plank.x1 - plank.x0) * i) / 48;
    const band = bandAt(plank, x);
    return { x, depth: band ? band[1] - band[0] : 0 };
  });
}

/** The first and last x where a plank is at least `depth` deep, or null where it never is. */
export function stretch(
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

// --- /crew's detail drawing (.crew/sprint/36/contract.md, "The detail drawing", "A tick") -----

/**
 * The tally on the plank in pencil: the sprint's number, then one graphite tick per moment the
 * panel lists, then the copper pen. Hull units but `width`; shared by the 2D drawing and the 3D.
 */
export const MARKS = {
  /** A tick's height, rising from the plank's lower edge into it. */
  h: 3.5,
  /** Tick i (0 the newest) stands at tip − (first + step·i)·f: by order, never by time. */
  first: 6,
  step: 4,
  /** The slots: past this many moments the ten stay as they are. */
  count: 10,
  /** A tick's weight, in CSS px: a line weight, which holds at every width. */
  width: 1.4,
  /** f = min(1, (tip − xs) / span), xs the sternmost x where the plank is at least `deep` deep. */
  span: 54,
  deep: 6,
  /** The tally's middle, tip − middle·f: the crop's centre and, while live, the 3D's focus point. */
  middle: 26,
  /** The number's anchor, tip − number·f, at the band's mid-depth: the tally's stern end. */
  number: 52,
} as const;

/** A seat's tally: the pen's x (`PENCIL.tip.to` of the plank's body) and its f. */
export type Tally = { tip: number; f: number };

const plankOf = (seat: string) => PLANKS.find((plank) => plank.id === seat);

/** A seat's tally, or null for a seat the hull doesn't have. f depends on the seat, never the count. */
export function tallyOf(seat: string): Tally | null {
  const plank = plankOf(seat);
  const stations = plank && depths(plank);
  const body = stations && plankBody(stations);
  const room = stations && stretch(stations, MARKS.deep);
  if (!body || !room) return null;
  const tip = body[0] + (body[1] - body[0]) * PENCIL.tip.to;
  return { tip, f: Math.min(1, (tip - room[0]) / MARKS.span) };
}

/** Tick i's x on a seat's tally, 0 the newest, the slot nearest the pen. */
export const markX = ({ tip, f }: Tally, i: number) =>
  tip - (MARKS.first + MARKS.step * i) * f;

/** A detail drawing's box and scale: 320 hull units across, in a 16:9 box (Iris). */
export type Detail = {
  box: readonly [number, number, number, number];
  s: number;
  /** Whether the planks other than the focus carry their numbers. */
  numbers: boolean;
};

/** From 768 px, numbered as /read's drawing is. */
export const CREW_WIDE: Detail = {
  box: [0, 0, 808, 454.5],
  s: 2.525,
  numbers: true,
};

/** Below 768 px: only the focus plank's number. */
export const CREW_NARROW: Detail = {
  box: [0, 0, 390, 219.4],
  s: 1.21875,
  numbers: false,
};

/** The crop's centre is held between these, in hull units, and its top 24 above the bow tip. */
const CROP_X = [140, 484] as const;
const CROP_TOP = 24;

/**
 * The focus point's x in hull units: the tally's middle when the server drew `focus` in pencil
 * (live or open, with a number), else the seat's body middle. The crop centres on it, held inside
 * CROP_X; the 3D keeps it on its frame-1 screen point through the move. Fixed at first paint: no
 * poll moves it.
 */
export function focusX(focus: string, pencil: boolean): number {
  const tally = pencil ? tallyOf(focus) : null;
  const plank = plankOf(focus);
  const body = plank && plankBody(depths(plank));
  return tally
    ? tally.tip - MARKS.middle * tally.f
    : body
      ? (body[0] + body[1]) / 2
      : LENGTH / 2;
}

/**
 * The layout a detail drawing is drawn on, centred on `focus` (`data-focus`); `pencil` when the
 * server drew that seat in pencil. The profile alone: no half-breadth or body plan, so `hbY` is
 * unused.
 */
export function crewLayout(
  { box, s, numbers }: Detail,
  focus: string,
  pencil: boolean,
): Layout {
  const xc = Math.min(CROP_X[1], Math.max(CROP_X[0], focusX(focus, pencil)));
  return {
    box,
    ox: box[0] + box[2] / 2 - xc * s,
    oy: box[1] + CROP_TOP * s,
    s,
    hbY: 0,
    numbers,
  };
}
