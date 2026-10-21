import { inflateSync } from "node:zlib";
import { contrast, type Rgb } from "./helpers";

// Reading screenshots in Node, so a pixel check needs no image library (the repo has none and the
// WebGL checks may read pixels from `page.screenshot` only: `readPixels` and `toDataURL` return
// blank outside the frame that drew; .crew/sprint/9/spike-probe.md, section 3).

/** An 8-bit RGBA image, row by row. */
export type Image = { width: number; height: number; data: Uint8Array };

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Decodes the PNG Playwright takes: 8-bit RGB or RGBA, not interlaced. */
export function decodePng(png: Buffer): Image {
  if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString("latin1", at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colorType, , , interlace] = [
        body[8],
        body[9],
        body[10],
        body[11],
        body[12],
      ];
      if (
        depth !== 8 ||
        interlace !== 0 ||
        (colorType !== 2 && colorType !== 6)
      )
        throw new Error(`unsupported PNG: ${depth}-bit, type ${colorType}`);
      channels = colorType === 2 ? 3 : 4;
    } else if (type === "IDAT") {
      idat.push(body);
    }
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * stride;
    for (let x = 0; x < stride; x++) {
      const byte = raw[y * (stride + 1) + 1 + x] ?? 0;
      const left = x >= channels ? (rows[line + x - channels] ?? 0) : 0;
      const up = y > 0 ? (rows[line - stride + x] ?? 0) : 0;
      const upLeft =
        y > 0 && x >= channels ? (rows[line - stride + x - channels] ?? 0) : 0;
      const predicted =
        filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? (left + up) >> 1
              : filter === 4
                ? paeth(left, up, upLeft)
                : 0;
      rows[line + x] = (byte + predicted) & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) {
      data[i * 4 + c] = rows[i * channels + c] ?? 0;
    }
    data[i * 4 + 3] = channels === 4 ? (rows[i * channels + 3] ?? 255) : 255;
  }
  return { width, height, data };
}

export function pixel(image: Image, x: number, y: number): Rgb {
  const at = (y * image.width + x) * 4;
  return [
    image.data[at] ?? 0,
    image.data[at + 1] ?? 0,
    image.data[at + 2] ?? 0,
  ];
}

/** Lit means more than `threshold` per channel away from the ground (C11 and C13: 8). */
export function litMask(image: Image, ground: Rgb, threshold = 8) {
  const mask = new Uint8Array(image.width * image.height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const p = pixel(image, x, y);
      mask[y * image.width + x] = p.some(
        (channel, i) => Math.abs(channel - (ground[i] ?? 0)) > threshold,
      )
        ? 1
        : 0;
    }
  }
  return mask;
}

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** The first and last lit column and row; null when nothing is lit. */
export function bounds(mask: Uint8Array, width: number): Bounds | null {
  let found: Bounds | null = null;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const [x, y] = [i % width, Math.floor(i / width)];
    found = found
      ? {
          left: Math.min(found.left, x),
          top: Math.min(found.top, y),
          right: Math.max(found.right, x),
          bottom: Math.max(found.bottom, y),
        }
      : { left: x, top: y, right: x, bottom: y };
  }
  return found;
}

/** Lit pixels of `a` with no lit pixel of `b` within a Chebyshev radius of `radius`. */
export function unmatched(
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
  radius = 1,
) {
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!a[y * width + x]) continue;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy++) {
        for (let dx = -radius; dx <= radius && !near; dx++) {
          const [nx, ny] = [x + dx, y + dy];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          near = b[ny * width + nx] === 1;
        }
      }
      if (!near) count++;
    }
  }
  return count;
}

/** Mean absolute channel difference over the pixels lit in both images; null if there are none. */
export function meanDifference(
  a: Image,
  b: Image,
  maskA: Uint8Array,
  maskB: Uint8Array,
) {
  let sum = 0;
  let pixels = 0;
  for (let i = 0; i < maskA.length; i++) {
    if (!(maskA[i] && maskB[i])) continue;
    pixels++;
    for (let c = 0; c < 3; c++) {
      sum += Math.abs((a.data[i * 4 + c] ?? 0) - (b.data[i * 4 + c] ?? 0));
    }
  }
  return pixels === 0 ? null : sum / (pixels * 3);
}

/** The median of each channel over a rectangle (right and bottom exclusive). */
export function medianColor(image: Image, area: Bounds): Rgb {
  const channels: number[][] = [[], [], []];
  for (
    let y = Math.max(0, area.top);
    y < Math.min(image.height, area.bottom);
    y++
  ) {
    for (
      let x = Math.max(0, area.left);
      x < Math.min(image.width, area.right);
      x++
    ) {
      pixel(image, x, y).forEach((v, c) => {
        channels[c]?.push(v);
      });
    }
  }
  const median = (values: number[]) =>
    values.sort((p, q) => p - q)[Math.floor(values.length / 2)] ?? Number.NaN;
  return [
    median(channels[0] ?? []),
    median(channels[1] ?? []),
    median(channels[2] ?? []),
  ];
}

/** The highest contrast against `ground` of any pixel outside `keepOut`, and how many pass `limit`. */
export function loudestOutside(
  image: Image,
  ground: Rgb,
  keepOut: Bounds,
  limit: number,
) {
  let worst = { ratio: 0, x: -1, y: -1 };
  let over = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (
        x >= keepOut.left &&
        x < keepOut.right &&
        y >= keepOut.top &&
        y < keepOut.bottom
      )
        continue;
      const ratio = contrast(pixel(image, x, y), ground);
      if (ratio > limit) over++;
      if (ratio > worst.ratio) worst = { ratio, x, y };
    }
  }
  return { worst, over };
}
