// B3 spike (sprint 24): the loft's maths, no three.js. The page never moves; the camera never turns.
// The canvas lies exactly over the drawing, and its world is the sheet in CSS pixels: x right, y up
// (a CSS y is -y here), the sheet at z = 0. The camera looks straight down at the sheet from the
// canvas's centre and only dolly-zooms: its frustum at z = 0 is the canvas at every frame, so the
// sheet, the shadow on it and the page stay registered. The model lifts off the sheet toward the
// camera and turns to its three-quarter pose, and its scale is solved so its framed height holds.

/** The direction's ease: exponential out (.crew/sprint/17/direction-iris.md). */
export const ease = (u) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u));

const rad = (deg) => (deg * Math.PI) / 180;

/** The model's transform: pitch about x, then yaw about y (sprint 17's renders), scale, then place. */
export function place(p, pose) {
  const [x, y, z] = p;
  const [cp, sp, cy, sy] = [
    Math.cos(rad(pose.pitch)),
    Math.sin(rad(pose.pitch)),
    Math.cos(rad(pose.yaw)),
    Math.sin(rad(pose.yaw)),
  ];
  const [y1, z1] = [y * cp - z * sp, y * sp + z * cp];
  const [x2, z2] = [x * cy + z1 * sy, -x * sy + z1 * cy];
  return [pose.x + pose.s * x2, pose.y + pose.s * y1, pose.z + pose.s * z2];
}

/** A world point on the canvas, in CSS pixels from its top left; D is the camera's distance. */
export function project([x, y, z], width, height, D) {
  const k = Number.isFinite(D) ? D / (D - z) : 1;
  return [width / 2 + (x - width / 2) * k, height / 2 - (y + height / 2) * k];
}

function framed(points, pose, width, height, D) {
  let [top, bottom, left, right] = [
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  for (const p of points) {
    const [sx, sy] = project(place(p, pose), width, height, D);
    top = Math.min(top, sy);
    bottom = Math.max(bottom, sy);
    left = Math.min(left, sx);
    right = Math.max(right, sx);
  }
  return { height: bottom - top, width: right - left, top, left };
}

/**
 * The loft between two poses given in screen terms: where the model's centre appears on the canvas
 * (cx, cy, CSS px from the top left), how far it stands off the sheet (lift, CSS px), and its turn.
 * `scale` is the registered scale, the drawing's own; the settled scale is solved. `lens` is the
 * camera's final distance in CSS px: 30 degrees over the first viewport's height.
 */
export function makeLoft({ width, height, from, to, scale, lens, points }) {
  const D0 = Number.POSITIVE_INFINITY;
  // The lens widens steadily: 1/D, the perspective's strength, runs linearly with the eased progress.
  const distance = (e) => (e <= 0 ? D0 : 1 / (e / lens));
  const lerp = (a, b, e) => a + (b - a) * e;
  const target = framed(points, { ...worldPose(from, scale, D0, width, height) }, width, height, D0).height;

  function worldPose(screen, s, D, w, h) {
    // Unproject the wanted screen centre at the model's lift, so it appears where it was asked to.
    const k = Number.isFinite(D) ? (D - screen.lift) / D : 1;
    return {
      x: w / 2 + (screen.cx - w / 2) * k,
      y: -(h / 2 + (screen.cy - h / 2) * k),
      z: screen.lift,
      yaw: screen.yaw,
      pitch: screen.pitch,
      s,
    };
  }

  /** The pose and camera at eased progress e, with the scale that holds the framed height. */
  function at(e) {
    const screen = {
      cx: lerp(from.cx, to.cx, e),
      cy: lerp(from.cy, to.cy, e),
      lift: lerp(from.lift, to.lift, e),
      yaw: lerp(from.yaw, to.yaw, e),
      pitch: lerp(from.pitch, to.pitch, e),
    };
    const D = distance(e);
    let s = scale;
    for (let i = 0; i < 4; i++) {
      const h = framed(points, worldPose(screen, s, D, width, height), width, height, D).height;
      s *= target / h;
    }
    return { pose: worldPose(screen, s, D, width, height), D };
  }

  // Solved once, sampled: the frame loop interpolates instead of solving.
  const SAMPLES = 48;
  const table = Array.from({ length: SAMPLES + 1 }, (_, i) => at(i / SAMPLES));
  function sample(e) {
    if (e <= 0) return table[0];
    if (e >= 1) return table[SAMPLES];
    const f = e * SAMPLES;
    const i = Math.floor(f);
    const [a, b] = [table[i], table[i + 1]];
    const u = f - i;
    const pose = {};
    for (const key of Object.keys(a.pose)) pose[key] = lerp(a.pose[key], b.pose[key], u);
    return { pose, D: distance(e) };
  }

  return {
    target,
    at: sample,
    exact: at,
    /** The framed box at e, from the model's skeleton: what S5 checks the frames against. */
    framedAt: (e) => {
      const { pose, D } = sample(e);
      return framed(points, pose, width, height, D);
    },
  };
}

/**
 * Plays the loft on demand: a frame per animation frame for the duration, then one settled frame,
 * then nothing (0 frames at rest). Any input skips to the end. The quality step is the scene's: it
 * gets "down" when frames run slow, and the loft gives up for the still frame when even the lowest
 * step can't hold 30 fps.
 */
export function playLoft({ duration, render, step, signal, govern = true }) {
  return new Promise((resolve) => {
    const frames = [];
    let start = -1;
    let last = -1;
    let stopped = false;
    let slow = 0;
    const finish = (reason, now = performance.now()) => {
      if (stopped) return;
      stopped = true;
      for (const type of INPUTS) window.removeEventListener(type, skip, true);
      const t0 = performance.now();
      render(1);
      frames.push({
        at: start < 0 ? 0 : now - start,
        e: 1,
        cpu: performance.now() - t0,
        interval: last < 0 ? 0 : now - last,
        final: true,
      });
      resolve({ frames, reason });
    };
    const skip = () => finish("input");
    for (const type of INPUTS) window.addEventListener(type, skip, { capture: true, passive: true });
    signal?.addEventListener("abort", () => finish("abort"));

    const tick = (now) => {
      if (stopped) return;
      if (start < 0) start = now;
      const u = (now - start) / duration;
      if (u >= 1) return finish("done", now);
      if (document.hidden) return finish("hidden", now);
      const interval = last < 0 ? 0 : now - last;
      last = now;
      const e = ease(u);
      const t0 = performance.now();
      render(e);
      frames.push({ at: now - start, e, cpu: performance.now() - t0, interval });
      // Quality stepping: three slow frames in a row step down; once at the lowest step, six
      // frames under 30 fps give up the move for the settled still.
      if (!govern) {
        requestAnimationFrame(tick);
        return;
      }
      if (interval > 22) slow++;
      else slow = 0;
      if (slow >= 3) {
        slow = 0;
        if (!step("down") && frames.slice(-6).every((f) => f.interval > 33.4)) {
          return finish("still");
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

const INPUTS = ["pointerdown", "keydown", "wheel", "touchstart"];
