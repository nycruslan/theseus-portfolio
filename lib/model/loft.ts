// The loft's maths (.crew/sprint/24/spike/scene/loft.js and poses.js, ported), no three.js. The page
// never moves and the camera never turns. The canvas lies exactly over the drawing and its world is
// the sheet in CSS px: x right, y up (a CSS y is −y here), the sheet at z = 0. The camera looks
// straight down from the canvas's centre and only dolly-zooms: its frustum at z = 0 is the canvas
// at every frame, so the sheet, the shadow on it and the page stay registered. The model lifts
// toward the camera and turns to its three-quarter pose, its scale solved so its framed height
// follows (1 + GROW × e) × frame 1's, or (1 + G_NARROW × e²) on the narrow drawing.
//
// The camera's strength is carried as 1/D, the inverse of its distance: 0 is orthographic (frame
// 1), and it runs linearly with the eased progress to the lens's 1/D (contract, "The loft").

import { HEIGHT, LENGTH } from "@/lib/half-model";
import { GHOST, type Layout, NARROW } from "@/lib/hull-layouts";
import {
  CREW_DURATION,
  DURATION,
  G_NARROW,
  GHOST_DURATION,
  GROW,
  HOLD,
  LIFT,
  SETTLE,
  SETTLE_CREW,
  SETTLE_GHOST,
  SETTLE_NARROW,
} from "./calls";
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
/**
 * What a turn in place keeps clear of its canvas's edge, in CSS px, besides half a buffer row: half
 * the outline's 1.4 px, and 0.25 for its sheer standing 0.4 units outboard of the deck's edge that
 * the skeleton frames (0.11 px above it at 1440). Chromium composites the canvas on whole pixels,
 * so its first and last buffer rows are the edge rows, and the outline's ink must cover under half
 * of them (B5.18, where at 390 it covered 54% of the top row).
 */
const EDGE = 0.95;
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
  return {
    height: bottom - top,
    width: right - left,
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
  };
}

/** The canvas the loft plays on: its CSS size, the drawing's width and the viewport's height. */
export type Frame = {
  width: number;
  height: number;
  drawing: number;
  viewport: number;
  /** Buffer pixels per CSS px, where a turn in place needs it (the ghost's room). */
  ratio?: number;
};

/** Where the model settles on one drawing: its offset in the drawing's units, its turn in
 * degrees, how much its framed height grows, and the curve the growth follows in e. */
type Settle = {
  dx: number;
  dy: number;
  yaw: number;
  pitch: number;
  /** How much further off the sheet it stands, in hull units (LIFT on the sheet). */
  lift: number;
  grow: number;
  curve: (e: number) => number;
  /** What the move holds as it grows: the framed height on the sheet, the length on the ghost. */
  hold: "height" | "width";
  /** Whether the framed box keeps its registered centre (the ghost's, on its drawing's box). */
  centre: boolean;
  /** The move's length in ms. */
  duration: number;
};

/** Each drawing's settled pose (lib/model/calls.ts): sprint 17's on the three views, S5's phone
 * pose on the profile and half-breadth plan (.crew/sprint/26/contract.md, "The phone's loft").
 * The phone's growth rides on e², since the turn's foreshortening is flat near 0°: on e, the
 * growth ran ahead of it and swelled the hull 24 px longer than its drawing at u 0.15 at 390
 * (decision 9). */
const sheet = { lift: LIFT, hold: HOLD, centre: false, duration: DURATION };
const settleOn = (layout: Layout): Settle =>
  layout === GHOST
    ? {
        ...SETTLE_GHOST,
        grow: 0,
        curve: (e) => e,
        hold: "width",
        centre: true,
        duration: GHOST_DURATION,
      }
    : layout === NARROW
      ? { ...SETTLE_NARROW, ...sheet, grow: G_NARROW, curve: (e) => e * e }
      : { ...SETTLE, ...sheet, grow: GROW, curve: (e) => e };

/**
 * The registered and settled poses for a drawing shown `drawing` CSS px wide: the registered pose
 * is the drawing's own (lib/hull-layouts.ts, WIDE or NARROW), the settled one its turn and lift,
 * both scaled by the drawing's width (call 7). The lens is 30° over the viewport.
 */
function poses({ drawing, viewport }: Frame, layout: Layout, settle: Settle) {
  const { box, ox, oy, s } = layout;
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
    cx: from.cx + settle.dx * k,
    cy: from.cy + settle.dy * k,
    lift: from.lift + settle.lift * scale,
    yaw: settle.yaw,
    pitch: settle.pitch,
  };
  const lens = viewport / (2 * Math.tan(rad(15)));
  return { from, to, scale, lens };
}

export type Loft = ReturnType<typeof makeLoft>;

/** /crew's move: the point it turns about, in the model's frame, and its settled yaw in degrees. */
export type Crew = { focus: Vec3; yaw: number };

/**
 * The loft for one canvas over `layout`'s drawing: the pose and the camera's 1/D at eased progress
 * e. With `crew`, /crew's move instead: a turn of `yaw` degrees about `focus`, a point in the
 * model's frame.
 */
export function makeLoft(
  frame: Frame,
  points: Vec3[],
  layout: Layout,
  crew?: Crew,
) {
  const { width, height, ratio = 1 } = frame;
  const margin = EDGE + 0.5 / ratio;
  const settle = settleOn(layout);
  const { from, to, scale, lens } = poses(frame, layout, settle);
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
  const registered = framed(
    points,
    worldPose(from, scale, 0),
    width,
    height,
    0,
  );
  const target = registered[settle.hold];

  const solve = (e: number) => {
    const screen: Screen = {
      cx: lerp(from.cx, to.cx, e),
      cy: lerp(from.cy, to.cy, e),
      lift: lerp(from.lift, to.lift, e),
      yaw: lerp(from.yaw, to.yaw, e),
      pitch: lerp(from.pitch, to.pitch, e),
    };
    const invD = e / lens;
    const want = target * (1 + settle.grow * settle.curve(e));
    let s = scale;
    for (let i = 0; i < 4; i++) {
      const box = framed(
        points,
        worldPose(screen, s, invD),
        width,
        height,
        invD,
      );
      s *= want / box[settle.hold];
      // The ghost turns in place inside the box its canvas lies on: never taller than the canvas
      // less a margin on each side, so the outline's ink covers no edge row (0.9% of its length at
      // 1440 × 900 at DPR 1, 0.6% at DPR 2), its framed box keeping the registered centre across
      // and riding to the canvas's centre down, so both margins are kept.
      if (settle.centre) {
        const tall = (box.height * want) / box[settle.hold];
        const room = height - 2 * margin;
        if (tall > room) s *= room / tall;
        screen.cx += registered.cx - box.cx;
        screen.cy += lerp(registered.cy, height / 2, e) - box.cy;
      }
    }
    return worldPose(screen, s, invD);
  };

  // /crew's detail (.crew/sprint/36/contract.md, "Full"; notes-iris.md): the model turns and lifts
  // about the focus point, which keeps its frame-1 screen point through the move, so the plank being
  // drawn stays where the visitor's eye is. Given the scale, the pose is closed form: the focus,
  // turned and scaled, lies at depth z_F = z + s (R F).z; its frame-1 point is unprojected at that
  // depth, and the origin set off it.
  const crewAt = crew
    ? (e: number, s: number): Pose => {
        const yaw = crew.yaw * e;
        const pitch = SETTLE_CREW.pitch * e;
        const invD = e / lens;
        const z = from.lift + SETTLE_CREW.lift * scale * e;
        const r = place(crew.focus, { x: 0, y: 0, z: 0, yaw, pitch, s });
        const k = 1 - (z + r[2]) * invD;
        const [fx, fy] = [
          from.cx + crew.focus[0] * scale,
          from.cy - crew.focus[1] * scale,
        ];
        return {
          x: width / 2 + (fx - width / 2) * k - r[0],
          y: -(height / 2 + (fy - height / 2) * k) - r[1],
          z,
          yaw,
          pitch,
          s,
        };
      }
    : null;
  /** /crew's scale at e: the one that holds frame 1's framed height, the sheet's HOLD with no growth. */
  const crewScale = (e: number) => {
    let s = scale;
    for (let i = 0; i < 4 && crewAt; i++) {
      s *=
        target / framed(points, crewAt(e, s), width, height, e / lens).height;
    }
    return s;
  };

  // Solved once at SAMPLES + 1 points; a frame interpolates instead of solving. On /crew only the
  // scale is tabled: each frame places the model off the focus point exactly, so it holds to the
  // float's precision between samples too.
  const table = crewAt
    ? []
    : Array.from({ length: SAMPLES + 1 }, (_, i) => solve(i / SAMPLES));
  const scales = crewAt
    ? Array.from({ length: SAMPLES + 1 }, (_, i) => crewScale(i / SAMPLES))
    : [];
  const at = (e: number): { pose: Pose; invD: number } => {
    if (crewAt) {
      const u = Math.min(1, Math.max(0, e));
      const f = u * SAMPLES;
      const i = Math.min(SAMPLES - 1, Math.floor(f));
      const s = lerp(scales[i] ?? scale, scales[i + 1] ?? scale, f - i);
      return { pose: crewAt(u, s), invD: u / lens };
    }
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
  };
  return {
    /** The pose and the camera's 1/D at eased progress e. */
    at,
    /** Points in the model's frame on the canvas at eased progress e, in CSS px from its top
     * left: the frame stage.ts draws, without reading the GPU. */
    screen: (points: readonly Vec3[], e: number) => {
      const { pose, invD } = at(e);
      return points.map((p) => project(place(p, pose), width, height, invD));
    },
    /** The move's length in ms. */
    duration: crew ? CREW_DURATION : settle.duration,
    /** The scale of the drawing: what the shadow's texels follow. */
    scale,
    /** The camera's nearest distance D (1/D peaks at 1/lens): the depth range must stay in
     * front of it. */
    lens,
  };
}
