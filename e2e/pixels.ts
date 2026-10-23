import { inflateSync } from "node:zlib";

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
