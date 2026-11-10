// Writes lib/trials-sweep.json, the contact links' freeboard at every swept window
// (.crew/sprint/63/contract.md, "The freeboard" and T4). Run it after a production build, from the
// repository's root, whenever T4 says the sweep is stale (a merge that moves / moves the links):
//
//   pnpm build && node .crew/sprint/63/trials-sweep.mjs
//
// It starts `next start` on a free port, opens the frame's address top-level in the repository's
// own Playwright Chromium (never a global one: .crew/sprint/63/decisions.md, 6), scripts off, fonts
// ready, resizes one page per worker to each window and measures by the rule, then stops the server.
// It lives here, not in scripts/, because knip.json (the owner's) doesn't take scripts/ as an
// entry; it moves when the owner adds one.

import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { profile } from "../../../content/profile.ts";
import { GRID, keyOf, OFF_GRID, tenthOf } from "../../../lib/trials.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const OUT = join(ROOT, "lib", "trials-sweep.json");
const FRAME = "/trials/frame";
const WORKERS = 6;

/** A free port, from the system. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** `next start` in its own process group, so stopping it stops any child it leaves. */
async function startServer(port) {
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    { cwd: ROOT, detached: true, stdio: "ignore" },
  );
  const stop = () => {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  };
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`http://localhost:${port}${FRAME}`);
      if (response.status === 200) return stop;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  stop();
  throw new Error(`next start answered no 200 at ${FRAME} on port ${port}`);
}

/** The rule's measure in the top-level document: Probe's measureTop, word for word. */
function measure(hrefs) {
  const header = document.querySelector("main > header");
  let foot = Number.NEGATIVE_INFINITY;
  let found = 0;
  for (const href of hrefs) {
    const a = header?.querySelector(`a[href="${href}"]`);
    if (!a) continue;
    found++;
    const range = document.createRange();
    range.selectNodeContents(a);
    for (const r of range.getClientRects()) foot = Math.max(foot, r.bottom);
  }
  const root = document.documentElement;
  return {
    found,
    freeboard: innerHeight - foot,
    overflow: root.scrollWidth - root.clientWidth,
  };
}

/** One worker's page: the frame's address, painted with both webfonts rather than fallbacks. */
async function openFrame(browser, base) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  // `display: optional` uses a face only if it is there for the first paint, so the first load
  // fills the cache and the second paints with both faces.
  await page.goto(`${base}${FRAME}`);
  await page.reload();
  const faces = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === "loaded" && !/Local/.test(face.family))
      .map((face) => face.family);
  });
  if (new Set(faces).size < 2)
    throw new Error(`${FRAME} painted without both webfonts: ${faces}`);
  return page;
}

function windows() {
  const out = [];
  for (let w = GRID.width.from; w <= GRID.width.to; w += GRID.width.step)
    for (let h = GRID.height.from; h <= GRID.height.to; h += GRID.height.step)
      out.push([w, h]);
  return [...out, ...OFF_GRID];
}

async function sweep(base) {
  const browser = await chromium.launch();
  const hrefs = profile.links.map((link) => link.href);
  const queue = windows();
  const readings = new Map();
  const workers = await Promise.all(
    Array.from({ length: WORKERS }, () => openFrame(browser, base)),
  );
  await Promise.all(
    workers.map(async (page) => {
      for (let win = queue.shift(); win; win = queue.shift()) {
        await page.setViewportSize({ width: win[0], height: win[1] });
        const m = await page.evaluate(measure, hrefs);
        if (m.found !== hrefs.length)
          throw new Error(`${keyOf(win)}: ${m.found} contact links found`);
        readings.set(keyOf(win), m);
      }
    }),
  );
  const version = browser.version();
  await browser.close();
  return { readings, version };
}

/** A column's tenths as the reader decodes them: the first, then each change, `d*n` for runs. */
function encode(tenths) {
  const parts = [String(tenths[0])];
  let change = null;
  let times = 0;
  const flush = () => {
    if (times > 0) parts.push(times === 1 ? `${change}` : `${change}*${times}`);
  };
  for (let i = 1; i < tenths.length; i++) {
    const d = tenths[i] - tenths[i - 1];
    if (d === change) times++;
    else {
      flush();
      change = d;
      times = 1;
    }
  }
  flush();
  return parts.join(",");
}

const port = await freePort();
const base = `http://localhost:${port}`;
const stop = await startServer(port);
let result;
try {
  result = await sweep(base);
} finally {
  stop();
}

const { readings, version } = result;
const tenthsAt = (key) => Math.round(tenthOf(readings.get(key).freeboard) * 10);
const columns = [];
for (let w = GRID.width.from; w <= GRID.width.to; w += GRID.width.step) {
  const tenths = [];
  for (let h = GRID.height.from; h <= GRID.height.to; h += GRID.height.step)
    tenths.push(tenthsAt(`${w}x${h}`));
  columns.push(encode(tenths));
}
const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();
const json = {
  commit,
  chromium: version,
  widths: [GRID.width.from, GRID.width.to, GRID.width.step],
  heights: [GRID.height.from, GRID.height.to, GRID.height.step],
  columns,
  windows: Object.fromEntries(
    OFF_GRID.map((win) => [keyOf(win), tenthsAt(keyOf(win))]),
  ),
  sideways: [...readings]
    .filter(([, m]) => m.overflow > 0)
    .map(([key]) => key),
};
writeFileSync(OUT, `${JSON.stringify(json, null, 2)}\n`);
// The repository's formatter has the last word on the file's layout, so `biome ci` passes.
execFileSync(
  join(ROOT, "node_modules", ".bin", "biome"),
  ["format", "--write", OUT],
  {
    cwd: ROOT,
    stdio: "ignore",
  },
);

const sunk = [...readings.values()].filter((m) => m.freeboard < 0).length;
console.log(
  `${readings.size} windows in ${OUT} (${sunk} sink, ${json.sideways.length} scroll sideways), commit ${commit}, Chromium ${version}`,
);
