// The sprint in progress on the sheet's hull (.crew/sprint/34/contract.md, "The hull"; decisions 4;
// notes-iris.md, call 4): the pencil plank, read off the 2D drawing the server drew, so the 3D can't
// disagree with the 2D. The drawing's `path[data-plank][data-pencil]` names the seat and carries
// `data-sprint`, and `data-live` while the crew is working this minute (the copper tip). Its marks
// are PENCIL's (lib/hull-layouts.ts), which the 2D draws from too; here they are laid on the hull in
// the model's frame, as the stage takes them (lib/model/stage.ts). No three.js.

import { HEIGHT, LENGTH } from "@/lib/half-model";
import { type Layout, PENCIL, PLANKS } from "@/lib/hull-layouts";
import {
  bandAt,
  type Level,
  nearSide,
  plankBody,
  stationsAt,
  type Vec3,
} from "./hull";

export type Pencil = {
  seat: string;
  /** The seat's slot in the state lookup. */
  slot: number;
  sprint: string;
  live: boolean;
};

/** The pencil plank `drawing` shows, or null: none in progress, or a seat the hull doesn't have. */
export function readPencil(drawing: Element): Pencil | null {
  const path = drawing.querySelector("path[data-plank][data-pencil]");
  const seat = path?.getAttribute("data-plank") ?? "";
  const slot = PLANKS.findIndex((plank) => plank.id === seat);
  if (!path || slot < 0) return null;
  return {
    seat,
    slot,
    sprint: path.getAttribute("data-sprint") ?? "",
    live: path.hasAttribute("data-live"),
  };
}

/** The pencil's marks on one drawing, as the stage takes them. */
export type PencilMarks = {
  slot: number;
  /**
   * The hatch's strokes are where d = (x − y) × scale + phase is a whole number, x and y in the
   * model's frame; `half` is half a stroke's width in periods.
   */
  hatch: { scale: number; phase: number; half: number };
  /** The plank's box in the model's frame: its stern and bow ends, its top and bottom seams. */
  edge: { x0: number; x1: number; top: number; bottom: number };
  /**
   * The copper tip while live, as segment pairs on the near side in the model's frame: its run,
   * and its dot, a segment too short to see, whose round caps make the dot. Null unless live.
   */
  tip: { run: Float32Array; dot: Float32Array } | null;
};

/** A point in hull units in the model's frame (lib/model/hull.ts's `toLocal`, without z). */
const local = (x: number, y: number): [number, number] => [
  x - LENGTH / 2,
  HEIGHT / 2 - y,
];

/** How far past the run's end the dot's segment reaches, in hull units: under a tenth of a px. */
const DOT_STEP = 0.05;

/**
 * The copper tip's run as the 2D draws it (`tipOf` in lib/lines-plan.ts): on the plank's lower
 * edge (the seam, or the keel's outline), `inset` of the drawing's units inside it, from `from` to
 * `to` of its body. On the hull it bends through the level's own stations between its ends, where
 * the card's facets and the seams turn, so no span cuts inside the card and loses the depth test.
 */
function tipOf(
  plank: (typeof PLANKS)[number],
  s: number,
  level: Level,
): PencilMarks["tip"] {
  const body = plankBody(plank);
  if (!body) return null;
  const { from, to, inset } = PENCIL.tip;
  const length = body[1] - body[0];
  const [a, b] = [body[0] + length * from, body[0] + length * to];
  const on = (x: number): Vec3 | null => {
    const band = bandAt(plank, x);
    return band ? nearSide(x, band[1] - inset / s) : null;
  };
  const xs = [
    a,
    ...stationsAt(level.stations).filter((x) => x > a && x < b),
    b,
  ];
  const points = xs.flatMap((x) => {
    const point = on(x);
    return point ? [point] : [];
  });
  const end = on(b);
  const past = on(b + DOT_STEP) ?? on(b - DOT_STEP);
  if (points.length < 2 || !end || !past) return null;
  const run: number[] = [];
  for (let i = 1; i < points.length; i++) {
    run.push(...(points[i - 1] ?? []), ...(points[i] ?? []));
  }
  return {
    run: new Float32Array(run),
    dot: new Float32Array([...end, ...past]),
  };
}

/**
 * The pencil's marks on `layout`'s drawing, at `level`: its hatch tiled from the drawing's origin
 * (it scales with the drawing, as the 2D's fill does), its edge, and while live its tip, all where
 * the 2D draws them, so frame 1 lies on the drawing.
 */
export function pencilMarks(
  pencil: Pencil,
  layout: Layout,
  level: Level,
): PencilMarks {
  const plank = PLANKS[pencil.slot] ?? PLANKS[0];
  const { ox, oy, s } = layout;
  const { period, width } = PENCIL.hatch;
  // The pattern turned 45°: a point's offset across the strokes is (x + y) / √2 in the drawing's
  // units, with y down; in the model's frame, y is up and the origin the profile's centre.
  const across = Math.SQRT2 * period;
  const [x0, x1] = [plank?.x0 ?? 0, plank?.x1 ?? 0];
  return {
    slot: pencil.slot,
    hatch: {
      scale: s / across,
      phase: (ox + oy + (s * (LENGTH + HEIGHT)) / 2) / across,
      half: width / (2 * period),
    },
    edge: {
      x0: local(x0, 0)[0],
      x1: local(x1, 0)[0],
      top: local(0, plank?.yTop ?? 0)[1],
      bottom: local(0, plank?.yBot ?? 0)[1],
    },
    tip: pencil.live && plank ? tipOf(plank, s, level) : null,
  };
}
