import { buildHull, type Level } from "../lib/model/hull";
import { extent } from "./pixels";

// B3.2's pose read back from a frame (.crew/sprint/26/contract.md; Iris's tolerance of ±2° in
// .crew/sprint/26/notes-iris.md): the settled frame's silhouette against the hull's, turned by
// each candidate yaw and pitch and seen through the contract's camera, straight down from the
// canvas's centre with a 30° lens over the viewport's height. The hull's scale, place and height
// above the sheet are fitted to the frame's own box, so the read is independent of the growth and
// the offset, which B3.2 checks on their own. The hull's mesh is the page's (its geometry is the
// oracle, as lib/half-model.ts's is for the drawing); the turn is the contract's, done here: pitch
// about x, then yaw about y, as the model's frame has x along the hull, y up and z out of the
// sheet. The perspective is not optional: turned 36°, the bow comes up to 186 px nearer a camera
// 1,575 px away than the stern, 13% larger, and an orthographic read put the pitch 6° out.

type Turn = { yaw: number; pitch: number };

/** The camera, in the frame's pixels: its distance and the point it looks down on. */
export type Camera = { distance: number; centre: [number, number] };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The camera's distance for a viewport `height` CSS px tall: a 30° lens over it. */
export const lensFor = (height: number) => height / (2 * Math.tan(rad(15)));

/** The hull's mesh turned: x right, y down on the sheet, z toward the camera; unscaled. */
function turned(position: Float32Array, { yaw, pitch }: Turn) {
  const [cp, sp] = [Math.cos(rad(pitch)), Math.sin(rad(pitch))];
  const [cy, sy] = [Math.cos(rad(yaw)), Math.sin(rad(yaw))];
  const out = new Float32Array(position.length);
  for (let i = 0; i < position.length / 3; i++) {
    const [x, y, z] = [
      position[i * 3] ?? 0,
      position[i * 3 + 1] ?? 0,
      position[i * 3 + 2] ?? 0,
    ];
    const [y1, z1] = [y * cp - z * sp, y * sp + z * cp];
    out[i * 3] = x * cy + z1 * sy;
    out[i * 3 + 1] = -y1;
    out[i * 3 + 2] = -x * sy + z1 * cy;
  }
  return out;
}

type Box = { left: number; top: number; width: number; height: number };

/**
 * The turned mesh at height `lift` above the sheet, its scale and place solved so its projected
 * box is the frame's `box`: the screen points, two per vertex.
 */
function projected(
  points: Float32Array,
  box: Box,
  lift: number,
  camera: Camera,
) {
  const n = points.length / 3;
  const out = new Float32Array(n * 2);
  const [cx, cy] = camera.centre;
  const want = {
    x: box.left + box.width / 2,
    y: box.top + box.height / 2,
  };
  let [s, x0, y0] = [1, want.x, want.y];
  const bounds = () => {
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      const k =
        1 / (1 - (lift + s * (points[i * 3 + 2] ?? 0)) / camera.distance);
      const px = cx + (x0 + s * (points[i * 3] ?? 0) - cx) * k;
      const py = cy + (y0 + s * (points[i * 3 + 1] ?? 0) - cy) * k;
      out[i * 2] = px;
      out[i * 2 + 1] = py;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    return { minX, minY, maxX, maxY };
  };
  // Start from the orthographic scale, then refine: the scale by the height, the place by the
  // centre, each corrected for the perspective at the model's height.
  let b = bounds();
  s = box.height / (b.maxY - b.minY);
  for (let i = 0; i < 8; i++) {
    b = bounds();
    s *= box.height / (b.maxY - b.minY);
    const k = 1 / (1 - lift / camera.distance);
    x0 += (want.x - (b.minX + b.maxX) / 2) / k;
    y0 += (want.y - (b.minY + b.maxY) / 2) / k;
  }
  bounds();
  return out;
}

/** The screen points' triangles filled into a w × h mask, at each pixel's centre. */
function silhouette(
  points: Float32Array,
  index: Uint16Array,
  w: number,
  h: number,
) {
  const mask = new Uint8Array(w * h);
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t] ?? 0, index[t + 1] ?? 0, index[t + 2] ?? 0];
    const [ax, ay] = [points[a * 2] ?? 0, points[a * 2 + 1] ?? 0];
    const [bx, by] = [points[b * 2] ?? 0, points[b * 2 + 1] ?? 0];
    const [cx, cy] = [points[c * 2] ?? 0, points[c * 2 + 1] ?? 0];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const [px, py] = [x + 0.5, y + 0.5];
        const e0 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        const e1 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
        const e2 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
        if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0))
          mask[y * w + x] = 1;
      }
  }
  return mask;
}

/** A mask shrunk by `r` pixels: a pixel stays if the disc around it is wholly covered. */
function shrunk(mask: Uint8Array, w: number, h: number, r: number) {
  if (r <= 0) return mask;
  const out = new Uint8Array(mask.length);
  const reach = Math.ceil(r);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      let whole = true;
      for (let dy = -reach; whole && dy <= reach; dy++)
        for (let dx = -reach; dx <= reach; dx++) {
          const [nx, ny] = [x + dx, y + dy];
          if (dx * dx + dy * dy > r * r) continue;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !mask[ny * w + nx]) {
            whole = false;
            break;
          }
        }
      if (whole) out[y * w + x] = 1;
    }
  return out;
}

/**
 * The turn whose silhouette best matches the frame's coverage (`alpha`, w × h, read at 50%, so
 * the light shadow at 0.18 is left out): the best intersection over union, over the model's height
 * above the sheet, on a 1° grid `span` degrees around `near`, then a 0.25° grid around the best.
 * `lifts` are the heights tried and `stroke` the outline's half-width (its line quads lie across
 * the silhouette's edge, so the frame's mask is read less it), all in the frame's pixels. Returns the turn, its match, and `at` to
 * score any other turn.
 */
export function readPose(
  alpha: Float32Array,
  w: number,
  h: number,
  level: Level,
  near: Turn,
  camera: Camera,
  lifts: number[],
  stroke: number,
  span = 6,
) {
  const hull = buildHull(level);
  // The hull's own coverage: the frame's, less the outline's half-stroke along its edge.
  const shown = shrunk(
    Uint8Array.from(alpha, (a) => (a >= 0.5 ? 1 : 0)),
    w,
    h,
    stroke,
  );
  // The hull's own box: the frame's, less the outline's half-stroke on every side.
  const outer = extent(alpha, w, h);
  const box = {
    left: outer.left + stroke,
    top: outer.top + stroke,
    width: outer.width - 2 * stroke,
    height: outer.height - 2 * stroke,
  };
  const match = (turn: Turn, lift: number) => {
    const mask = silhouette(
      projected(turned(hull.position, turn), box, lift, camera),
      hull.index,
      w,
      h,
    );
    let [both, either] = [0, 0];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] && shown[i]) both++;
      if (mask[i] || shown[i]) either++;
    }
    return either ? both / either : 0;
  };
  const score = (turn: Turn) => Math.max(...lifts.map((l) => match(turn, l)));
  let best = { ...near, iou: score(near) };
  const search = (centre: Turn, reach: number, step: number) => {
    for (let yaw = centre.yaw - reach; yaw <= centre.yaw + reach; yaw += step)
      for (
        let pitch = centre.pitch - reach;
        pitch <= centre.pitch + reach;
        pitch += step
      ) {
        const iou = score({ yaw, pitch });
        if (iou > best.iou) best = { yaw, pitch, iou };
      }
  };
  search(near, span, 1);
  search({ yaw: best.yaw, pitch: best.pitch }, 1, 0.25);
  return { ...best, at: score };
}
