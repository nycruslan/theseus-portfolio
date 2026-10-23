// The model's shadow on its own half-breadth plan (.crew/sprint/24/spike/scene/shadow.js, ported),
// baked once on the CPU, no three.js. The card's triangles at the settled pose are cast along the
// light onto the sheet (z = 0), filled into a small coverage grid and blurred: one textured plane,
// one draw a frame, no shadow map and no extra pass. It is right at the settled pose; during the
// loft it fades in under the lifting model. It is the scene's one texture, generated rather than
// downloaded (notes-iris.md, call 4).

import type { Vec3 } from "./hull";
import { type Pose, place } from "./loft";

/** The blur's radius in texels: the soft edge of a shadow on paper. */
const BLUR = 5;

/** Toward the light: up and to the left of the sheet, in front of it (sprint 17's sun). */
export const LIGHT: Vec3 = (() => {
  const [x, y, z] = [-0.38, 0.62, 1.5];
  const n = Math.hypot(x, y, z);
  return [x / n, y / n, z / n];
})();

export type Shadow = ReturnType<typeof bakeShadow>;

/**
 * @param position the card's vertices in the model's frame
 * @param index its triangles
 * @param pose the settled world pose
 * @param texel world units (CSS px) per texel
 */
export function bakeShadow(
  position: Float32Array,
  index: Uint16Array,
  pose: Pose,
  texel: number,
) {
  const [lx, ly, lz] = LIGHT;
  const flat = new Float32Array((position.length / 3) * 2);
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0, j = 0; i < position.length; i += 3, j += 2) {
    const [x, y, z] = place(
      [position[i] ?? 0, position[i + 1] ?? 0, position[i + 2] ?? 0],
      pose,
    );
    const [sx, sy] = [x - (lx * z) / lz, y - (ly * z) / lz];
    flat[j] = sx;
    flat[j + 1] = sy;
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  const pad = (BLUR * 3 + 2) * texel;
  const [x0, y0] = [minX - pad, minY - pad];
  const width = Math.ceil((maxX - minX + 2 * pad) / texel);
  const height = Math.ceil((maxY - minY + 2 * pad) / texel);
  const grid = new Float32Array(width * height);
  const at = (v: number | undefined) => (v ?? 0) * 2;
  const gx = (i: number) => ((flat[i] ?? 0) - x0) / texel;
  const gy = (i: number) => ((flat[i + 1] ?? 0) - y0) / texel;

  // Fill each triangle's texel centres (an edge-function rasteriser): a hard silhouette.
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [at(index[t]), at(index[t + 1]), at(index[t + 2])];
    const [ax, ay, bx, by, cx, cy] = [gx(a), gy(a), gx(b), gy(b), gx(c), gy(c)];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const i1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const j1 = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let j = j0; j <= j1; j++) {
      const py = j + 0.5;
      for (let i = i0; i <= i1; i++) {
        const px = i + 0.5;
        const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area;
        const w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[j * width + i] = 1;
      }
    }
  }

  // Three box blurs approximate a Gaussian.
  const tmp = new Float32Array(grid.length);
  for (let pass = 0; pass < 3; pass++) {
    boxBlur(grid, tmp, width, height, 1, width);
    boxBlur(tmp, grid, height, width, width, 1);
  }

  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < grid.length; i++) {
    const v = Math.round(Math.min(1, grid[i] ?? 0) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  // The grid's rows run up the sheet (y up), as a texture's do: no flip.
  return {
    data,
    width,
    height,
    /** The plane's centre and size on the sheet, in CSS px. */
    x: x0 + (width * texel) / 2,
    y: y0 + (height * texel) / 2,
    worldWidth: width * texel,
    worldHeight: height * texel,
  };
}

/** A running-sum box blur along one axis: lines of `length` texels, `stride` apart in a line. */
function boxBlur(
  src: Float32Array,
  dst: Float32Array,
  length: number,
  lines: number,
  stride: number,
  lineStride: number,
) {
  const n = 2 * BLUR + 1;
  const read = (base: number, i: number) =>
    src[base + Math.min(length - 1, Math.max(0, i)) * stride] ?? 0;
  for (let line = 0; line < lines; line++) {
    const base = line * lineStride;
    let sum = 0;
    for (let i = -BLUR; i <= BLUR; i++) sum += read(base, i);
    for (let i = 0; i < length; i++) {
      dst[base + i * stride] = sum / n;
      sum += read(base, i + BLUR + 1) - read(base, i - BLUR);
    }
  }
}
