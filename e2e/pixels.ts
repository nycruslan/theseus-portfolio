import { crc32, deflateSync, inflateSync } from "node:zlib";

// Reading screenshots in Node, so a pixel check needs no image library (the repo has none). The
// WebGL checks read pixels from `page.screenshot` only: `readPixels` and `toDataURL` return blank
// outside the frame that drew (.crew/STATE.md). Coverage is a screenshot's alpha with the rest of
// the page hidden, as the spike's S4 method takes it.

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
  let [width, height, channels] = [0, 0, 0];
  const idat: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString("latin1", at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colorType, interlace] = [body[8], body[9], body[12]];
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
    for (let c = 0; c < 3; c++) data[i * 4 + c] = rows[i * channels + c] ?? 0;
    data[i * 4 + 3] = channels === 4 ? (rows[i * channels + 3] ?? 255) : 255;
  }
  return { width, height, data };
}

/** Coverage from alpha, 0 to 1, as S4 reads it. */
export function coverage(image: Image) {
  const a = new Float32Array(image.width * image.height);
  for (let i = 0; i < a.length; i++) a[i] = (image.data[i * 4 + 3] ?? 0) / 255;
  return a;
}

/** Encodes an RGBA image as a PNG, for the diff images the checks attach. */
export function encodePng({ width, height, data }: Image): Buffer {
  const chunk = (type: string, body: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw.set(
      data.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A coverage mask's pixels at or above 50% that touch one below it: the silhouette's edge. */
export function edges(a: Float32Array, width: number, height: number) {
  const on = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    (a[y * width + x] ?? 0) >= 0.5;
  const e = new Float32Array(a.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        on(x, y) &&
        !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))
      )
        e[y * width + x] = 1;
    }
  }
  return e;
}

/**
 * S4's measure (.crew/sprint/24/spike/measure/s4-register.mjs): both ways, the farthest pixel at or
 * above 50% in one mask from the nearest such pixel in the other, in device pixels, over the
 * columns left of `limit`. A distance past the 12 px search reads 12.
 */
export function hausdorff(
  a: Float32Array,
  b: Float32Array,
  width: number,
  height: number,
  limit = width,
) {
  const R = 12;
  const points = (m: Float32Array) => {
    const p: [number, number][] = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < Math.min(width, limit); x++)
        if ((m[y * width + x] ?? 0) >= 0.5) p.push([x, y]);
    return p;
  };
  const near = (m: Float32Array, x: number, y: number) => {
    let best = R;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const [u, v] = [x + dx, y + dy];
        if (u < 0 || v < 0 || u >= width || v >= height || u >= limit) continue;
        if ((m[v * width + u] ?? 0) >= 0.5)
          best = Math.min(best, Math.hypot(dx, dy));
      }
    return best;
  };
  const [pa, pb] = [points(a), points(b)];
  const d = [
    ...pa.map(([x, y]) => near(b, x, y)),
    ...pb.map(([x, y]) => near(a, x, y)),
  ].sort((p, q) => p - q);
  return {
    max: d.at(-1) ?? Number.NaN,
    p99: d[Math.floor(d.length * 0.99)] ?? Number.NaN,
    a: pa.length,
    b: pb.length,
  };
}

/**
 * S4's sub-pixel offset (.crew/sprint/24/spike/measure/s4-centroid.mjs), on silhouettes: along
 * each scan line from outside, the edge sits where the coverage summed so far reaches the run of
 * full pixels, so the edge's position is the count of pixels before the run minus the coverage in
 * them. Returns `b`'s edge minus `a`'s, in device pixels, per line that meets both.
 */
export function edgeOffsets(
  a: Float32Array,
  b: Float32Array,
  width: number,
  lines: { x: number; y: number }[][],
) {
  const edge = (m: Float32Array, line: { x: number; y: number }[]) => {
    let sum = 0;
    for (const [i, { x, y }] of line.entries()) {
      const v = m[y * width + x] ?? 0;
      if (v >= 0.98) return i - sum;
      sum += v;
    }
    return null;
  };
  return lines.flatMap((line) => {
    const [ea, eb] = [edge(a, line), edge(b, line)];
    return ea === null || eb === null ? [] : [eb - ea];
  });
}

/** The rows and columns a coverage mask covers at or above `threshold`. */
export function extent(
  a: Float32Array,
  width: number,
  height: number,
  threshold = 0.5,
) {
  let [top, bottom, left, right] = [
    Number.POSITIVE_INFINITY,
    -1,
    Number.POSITIVE_INFINITY,
    -1,
  ];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if ((a[y * width + x] ?? 0) >= threshold) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  return bottom < 0
    ? { top: 0, bottom: -1, left: 0, right: -1, height: 0, width: 0 }
    : {
        top,
        bottom,
        left,
        right,
        height: bottom - top + 1,
        width: right - left + 1,
      };
}

/** The pixel at (x, y), as [r, g, b, a] with a from 0 to 255. */
export function pixel(image: Image, x: number, y: number) {
  const i = (Math.round(y) * image.width + Math.round(x)) * 4;
  return [...image.data.subarray(i, i + 4)];
}

/** The largest per-channel difference between two images of one size, per pixel. */
export function channelDelta(a: Image, b: Image) {
  const d = new Uint8Array(a.width * a.height);
  for (let i = 0; i < d.length; i++) {
    let max = 0;
    for (let c = 0; c < 3; c++)
      max = Math.max(
        max,
        Math.abs((a.data[i * 4 + c] ?? 0) - (b.data[i * 4 + c] ?? 0)),
      );
    d[i] = max;
  }
  return d;
}

/** A crop of an image, in its own pixels. */
export function crop(
  image: Image,
  x: number,
  y: number,
  width: number,
  height: number,
): Image {
  const [x0, y0] = [Math.max(0, Math.round(x)), Math.max(0, Math.round(y))];
  const w = Math.max(0, Math.min(image.width - x0, Math.round(width)));
  const h = Math.max(0, Math.min(image.height - y0, Math.round(height)));
  const data = new Uint8Array(w * h * 4);
  for (let row = 0; row < h; row++) {
    data.set(
      image.data.subarray(
        ((y0 + row) * image.width + x0) * 4,
        ((y0 + row) * image.width + x0 + w) * 4,
      ),
      row * w * 4,
    );
  }
  return { width: w, height: h, data };
}

/** CIE76 ΔE between two sRGB colours, through CIELAB (D65). */
export function deltaE(a: readonly number[], b: readonly number[]) {
  const lab = (rgb: readonly number[]) => {
    const [r, g, bl] = [0, 1, 2].map((i) => {
      const s = (rgb[i] ?? 0) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    const f = (t: number) =>
      t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * bl);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(
    (p[0] ?? 0) - (q[0] ?? 0),
    (p[1] ?? 0) - (q[1] ?? 0),
    (p[2] ?? 0) - (q[2] ?? 0),
  );
}
