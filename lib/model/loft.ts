// The loft's maths (.crew/sprint/24/spike/scene/loft.js and poses.js, ported), no three.js. The page
// never moves and the camera never turns. The canvas lies exactly over the drawing and its world is
// the sheet in CSS px: x right, y up (a CSS y is −y here), the sheet at z = 0. The camera looks
// straight down from the canvas's centre and only dolly-zooms: its frustum at z = 0 is the canvas
// at every frame, so the sheet, the shadow on it and the page stay registered. The model lifts
// toward the camera and turns to its three-quarter pose, its scale solved so its framed height
// follows (1 + GROW × e) × frame 1's.
//
// The camera's strength is carried as 1/D, the inverse of its distance: 0 is orthographic (frame
// 1), and it runs linearly with the eased progress to the lens's 1/D (contract, "The loft").

import { HEIGHT, LENGTH } from "@/lib/half-model";
import { WIDE } from "@/lib/hull-layouts";
import { GROW, HOLD, LIFT, SETTLE } from "./calls";
import type { Vec3 } from "./hull";

/** Where the model stands on the canvas: its centre (CSS px from the top left), lift and turn. */
type Screen = {
  cx: number;
  cy: number;
  lift: number;
  yaw: number;
  pitch: number;
};
/** The model's world transform: position, turn in degrees, scale. */
export type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  s: number;
};

/** The deck's greatest half-breadth and a margin, in hull units: the model clears the sheet. */
const STANDOFF = 76;
/** Samples of the solved loft; the frame loop interpolates between them. */
const SAMPLES = 48;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The model's transform on one point: pitch about x, then yaw about y, scale, then place. */
export function place([x, y, z]: Vec3, pose: Pose): Vec3 {
  const [cp, sp] = [Math.cos(rad(pose.pitch)), Math.sin(rad(pose.pitch))];
  const [cy, sy] = [Math.cos(rad(pose.yaw)), Math.sin(rad(pose.yaw))];
  const [y1, z1] = [y * cp - z * sp, y * sp + z * cp];
  const [x2, z2] = [x * cy + z1 * sy, -x * sy + z1 * cy];
  return [pose.x + pose.s * x2, pose.y + pose.s * y1, pose.z + pose.s * z2];
}

/** A world point on the canvas, in CSS px from its top left, with the camera at 1/D = invD. */
function project([x, y, z]: Vec3, width: number, height: number, invD: number) {
  const k = 1 / (1 - z * invD);
  return [
    width / 2 + (x - width / 2) * k,
    height / 2 - (y + height / 2) * k,
  ] as const;
}

function framed(
  points: Vec3[],
  pose: Pose,
  width: number,
  height: number,
  invD: number,
) {
  let [top, bottom, left, right] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const p of points) {
    const [sx, sy] = project(place(p, pose), width, height, invD);
    top = Math.min(top, sy);
    bottom = Math.max(bottom, sy);
    left = Math.min(left, sx);
    right = Math.max(right, sx);
  }
  return { height: bottom - top, width: right - left };
}

/** The canvas the loft plays on: its CSS size, the drawing's width and the viewport's height. */
export type Frame = {
  width: number;
  height: number;
  drawing: number;
  viewport: number;
};

/**
 * The registered and settled poses for the wide drawing shown `drawing` CSS px wide: the
 * registered pose is the drawing's own (lib/hull-layouts.ts WIDE), the settled one sprint 17's
 * turn and lift, both scaled by the drawing's width (call 7). The lens is 30° over the viewport.
 */
function poses({ drawing, viewport }: Frame) {
  const { box, ox, oy, s } = WIDE;
  const k = drawing / box[2];
  const scale = s * k;
  const from: Screen = {
    cx: (ox - box[0] + (LENGTH / 2) * s) * k,
    cy: (oy - box[1] + (HEIGHT / 2) * s) * k,
    lift: STANDOFF * scale,
    yaw: 0,
    pitch: 0,
  };
  const to: Screen = {
    cx: from.cx + SETTLE.dx * k,
    cy: from.cy + SETTLE.dy * k,
    lift: from.lift + LIFT * scale,
    yaw: SETTLE.yaw,
    pitch: SETTLE.pitch,
  };
  const lens = viewport / (2 * Math.tan(rad(15)));
  return { from, to, scale, lens };
}

export type Loft = ReturnType<typeof makeLoft>;

/** The loft for one canvas: the pose and the camera's 1/D at eased progress e. */
export function makeLoft(frame: Frame, points: Vec3[]) {
  const { width, height } = frame;
  const { from, to, scale, lens } = poses(frame);
  const lerp = (a: number, b: number, e: number) => a + (b - a) * e;

  // Unproject the wanted screen centre at the model's lift, so it appears where it was asked to.
  const worldPose = (screen: Screen, s: number, invD: number): Pose => {
    const k = 1 - screen.lift * invD;
    return {
      x: width / 2 + (screen.cx - width / 2) * k,
      y: -(height / 2 + (screen.cy - height / 2) * k),
      z: screen.lift,
      yaw: screen.yaw,
      pitch: screen.pitch,
      s,
    };
  };
  const target = framed(points, worldPose(from, scale, 0), width, height, 0)[
    HOLD
  ];

  const solve = (e: number) => {
    const screen: Screen = {
      cx: lerp(from.cx, to.cx, e),
      cy: lerp(from.cy, to.cy, e),
      lift: lerp(from.lift, to.lift, e),
      yaw: lerp(from.yaw, to.yaw, e),
      pitch: lerp(from.pitch, to.pitch, e),
    };
    const invD = e / lens;
    const want = target * (1 + GROW * e);
    let s = scale;
    for (let i = 0; i < 4; i++) {
      s *=
        want /
        framed(points, worldPose(screen, s, invD), width, height, invD)[HOLD];
    }
    return worldPose(screen, s, invD);
  };

  // Solved once at SAMPLES + 1 points; a frame interpolates instead of solving.
  const table = Array.from({ length: SAMPLES + 1 }, (_, i) =>
    solve(i / SAMPLES),
  );
  return {
    /** The pose and the camera's 1/D at eased progress e. */
    at(e: number): { pose: Pose; invD: number } {
      const f = Math.min(1, Math.max(0, e)) * SAMPLES;
      const i = Math.min(SAMPLES - 1, Math.floor(f));
      const a = table[i] as Pose;
      const b = table[i + 1] as Pose;
      const u = f - i;
      const pose: Pose = {
        x: lerp(a.x, b.x, u),
        y: lerp(a.y, b.y, u),
        z: lerp(a.z, b.z, u),
        yaw: lerp(a.yaw, b.yaw, u),
        pitch: lerp(a.pitch, b.pitch, u),
        s: lerp(a.s, b.s, u),
      };
      return { pose, invD: Math.min(1, Math.max(0, e)) / lens };
    },
    /** The scale of the drawing: what the shadow's texels follow. */
    scale,
    /** The camera's nearest distance D (1/D peaks at 1/lens): the depth range must stay in
     * front of it. */
    lens,
  };
}
