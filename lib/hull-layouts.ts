// The planks and the drawing's layouts (.crew/sprint/25/contract.md, build note 8): where each plank
// lies on the hull, and where each drawing puts its views. The lines plan (lib/lines-plan.ts) draws
// its SVG from them and the 3D model registers on the same numbers, so they live here, in a module
// that imports only the hull's shape and draws nothing: the model's chunk imports it without
// pulling in the drawing. The comments below cite sprint 22's contract and notes-iris.md
// (.crew/sprint/22/), where these numbers were set.
//
// Hull units, as in lib/half-model.ts: x from the stern (0) to the bow (LENGTH), y down from the bow
// tip. A layout maps them onto its drawing's viewBox.

import { BUTTS, ends, LENGTH, seamDepth } from "./half-model";

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
