// B3 spike (sprint 24): where the model registers and where it settles, per drawing. The registered
// pose is the drawing's own: lib/lines-plan.ts's two sheet layouts (WIDE from 768 px, NARROW below),
// copied here because that module doesn't export them. The settled pose keeps sprint 17's approved
// turn (.crew/sprint/17/render/shots.mjs: yaw -30 and pitch 15 on the desktop, -36 and 16 on the
// phone) and lift; its scale is solved by the loft so the framed height holds.

import { HEIGHT, LENGTH } from "@/lib/half-model";

export const LAYOUTS = {
  wide: {
    box: [0, 0, 1408, 476],
    ox: 76,
    oy: 96,
    s: 1.3,
    settle: { dx: -6, dy: 40, yaw: -30, pitch: 15 },
  },
  narrow: {
    box: [0, -15, 390, 260],
    ox: 20,
    oy: 40,
    s: 0.5,
    settle: { dx: 0, dy: 26, yaw: -36, pitch: 16 },
  },
};

/** The deck's greatest half-breadth (lib/half-model.ts's BEAM) and a margin: the model clears the sheet. */
const STANDOFF = 76;
/** Sprint 17's lift from the registered to the settled pose, in hull units (74 px at scale 1.3). */
const LIFT = 57;

/**
 * The loft's inputs for a drawing shown `cssWidth` wide, on a first viewport `viewportHeight` tall.
 * The canvas is the drawing's box; the lens is 30 degrees over the viewport's height.
 */
export function posesFor(name, cssWidth, viewportHeight) {
  const { box, ox, oy, s, settle } = LAYOUTS[name];
  const k = cssWidth / box[2];
  const scale = s * k;
  const from = {
    cx: (ox - box[0] + (LENGTH / 2) * s) * k,
    cy: (oy - box[1] + (HEIGHT / 2) * s) * k,
    lift: STANDOFF * scale,
    yaw: 0,
    pitch: 0,
  };
  const to = {
    cx: from.cx + settle.dx * k,
    cy: from.cy + settle.dy * k,
    lift: from.lift + LIFT * scale,
    yaw: settle.yaw,
    pitch: settle.pitch,
  };
  const lens = viewportHeight / (2 * Math.tan((15 * Math.PI) / 180));
  return { width: cssWidth, height: box[3] * k, from, to, scale, lens };
}
