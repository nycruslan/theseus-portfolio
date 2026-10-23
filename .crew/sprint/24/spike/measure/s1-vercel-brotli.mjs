// S1, what Vercel puts on the wire: fetch production's largest script with and without brotli, and
// compare the brotli bytes with local compressions of the same file, to find the quality it serves
// at. The 3D chunk will be served the same way.
//
//   node .crew/sprint/24/spike/measure/s1-vercel-brotli.mjs [https://theseus-portfolio.vercel.app]

import { request } from "node:https";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const site = process.argv[2] ?? "https://theseus-portfolio.vercel.app";
const get = (url, encoding) =>
  new Promise((resolve, reject) => {
    request(url, { headers: { "accept-encoding": encoding, "user-agent": "Mozilla/5.0 spike" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
    })
      .on("error", reject)
      .end();
  });

const html = (await get(site, "identity")).body.toString();
const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
const rows = [];
for (const path of new Set(scripts)) {
  const plain = await get(site + path, "identity");
  rows.push({ path, size: plain.body.length, plain: plain.body });
}
rows.sort((a, b) => b.size - a.size);
for (const { path, plain } of rows.slice(0, 3)) {
  const br = await get(site + path, "br");
  const gz = await get(site + path, "gzip");
  const local = Object.fromEntries(
    [4, 5, 6, 9, 11].map((q) => [`br${q}`, brotliCompressSync(plain, { params: { [constants.BROTLI_PARAM_QUALITY]: q } }).length]),
  );
  console.log(
    JSON.stringify({
      path,
      raw: plain.length,
      servedBrotli: br.headers["content-encoding"] === "br" ? br.body.length : `not br: ${br.headers["content-encoding"]}`,
      servedGzip: gz.headers["content-encoding"] === "gzip" ? gz.body.length : `not gzip: ${gz.headers["content-encoding"]}`,
      localGzip9: gzipSync(plain, { level: 9 }).length,
      localGzip6: gzipSync(plain).length,
      ...local,
      cache: br.headers["x-vercel-cache"],
    }),
  );
}
