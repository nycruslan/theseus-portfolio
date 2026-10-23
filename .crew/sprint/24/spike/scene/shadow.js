// B3 spike (sprint 24): the contact shadow, baked once on the CPU, no three.js. The model's triangles
// in its settled pose are cast along the light onto the sheet (z = 0), filled into a small coverage
// grid and blurred: one textured plane, one draw a frame, and no shadow map or extra render pass.
// It is right at the settled pose; during the loft it fades in under the lifting model.

import { place } from "./loft.js";

/**
 * @param meshes [{ position: Float32Array, index: Uint16Array }] in the model's frame
 * @param pose the settled world pose (loft.at(1).pose)
 * @param light the direction toward the light, in world space
 * @param texel world units (CSS px) per texel
 * @param blur the blur radius in texels
 */
export function bakeShadow({ meshes, pose, light, texel = 4, blur = 5 }) {
  const cast = ([x, y, z]) => [x - (light[0] * z) / light[2], y - (light[1] * z) / light[2]];
  const triangles = [];
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { position, index } of meshes) {
    const flat = [];
    for (let i = 0; i < position.length; i += 3) {
      const [x, y] = cast(place([position[i], position[i + 1], position[i + 2]], pose));
      flat.push(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    triangles.push({ flat, index });
  }
  const pad = (blur * 3 + 2) * texel;
  const [x0, y0] = [minX - pad, minY - pad];
  const width = Math.ceil((maxX - minX + 2 * pad) / texel);
  const height = Math.ceil((maxY - minY + 2 * pad) / texel);
  const grid = new Float32Array(width * height);

  // Fill each triangle's texel centres (an edge-function rasteriser): a hard silhouette.
  for (const { flat, index } of triangles) {
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = [index[t] * 2, index[t + 1] * 2, index[t + 2] * 2];
      const ax = (flat[a] - x0) / texel;
      const ay = (flat[a + 1] - y0) / texel;
      const bx = (flat[b] - x0) / texel;
      const by = (flat[b + 1] - y0) / texel;
      const cx = (flat[c] - x0) / texel;
      const cy = (flat[c + 1] - y0) / texel;
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
  }

  // Three box blurs approximate a Gaussian: the soft edge of a shadow on paper.
  const tmp = new Float32Array(grid.length);
  for (let pass = 0; pass < 3; pass++) {
    boxBlur(grid, tmp, width, height, blur, 1, width);
    boxBlur(tmp, grid, height, width, blur, width, 1);
  }

  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < grid.length; i++) {
    const v = Math.round(Math.min(1, grid[i]) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  // The grid's rows run up the sheet (y up), as a texture's do: no flip.
  return { data, width, height, x: x0, y: y0, worldWidth: width * texel, worldHeight: height * texel };
}

/** A running-sum box blur along one axis: lines of `length` texels, `stride` apart within a line. */
function boxBlur(src, dst, length, lines, r, stride, lineStride) {
  const n = 2 * r + 1;
  for (let line = 0; line < lines; line++) {
    const base = line * lineStride;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[base + Math.min(length - 1, Math.max(0, i)) * stride];
    for (let i = 0; i < length; i++) {
      dst[base + i * stride] = sum / n;
      const add = Math.min(length - 1, i + r + 1);
      const drop = Math.max(0, i - r);
      sum += src[base + add * stride] - src[base + drop * stride];
    }
  }
}
