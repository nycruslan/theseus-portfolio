// S1: the 3D chunk as Turbopack emits it. Copies the spike's pages and scene into a worktree that has
// three@0.186.1 installed, builds it with `next build`, serves it with `next start`, and records the
// scripts the browser fetches on each spike page once the scene has drawn. The 3D chunk is what
// /spike-a or /spike-b fetches beyond /spike-0 (the same loader, no import).
//
//   node .crew/sprint/24/spike/measure/s1-chunks.mjs <worktree> <port> <out.json> [--no-build]

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const spike = join(here, "..");
const [, , worktree, port = "3341", out = "s1.json", flag] = process.argv;
const require = createRequire(join(worktree, "package.json"));
const { chromium } = require("@playwright/test");

// The spike's files go in as a private folder and three routes; nothing else in the app changes.
cpSync(join(spike, "next/app"), join(worktree, "app"), { recursive: true });
mkdirSync(join(worktree, "app/_spike/scene"), { recursive: true });
cpSync(join(spike, "scene"), join(worktree, "app/_spike/scene"), { recursive: true });

const run = (args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: worktree, stdio: "inherit", ...opts });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });

const next = join(worktree, "node_modules/next/dist/bin/next");
if (flag !== "--no-build") await run([next, "build"]);
const server = spawn(process.execPath, [next, "start", "--port", port], { cwd: worktree, stdio: "ignore" });
console.log("next start pid", server.pid);
await new Promise((resolve) => setTimeout(resolve, 2500));

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function visit(path) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const scripts = new Map();
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try {
      scripts.set(new URL(response.url()).pathname, await response.body());
    } catch {}
  });
  await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.scene, null, { timeout: 60000 });
  const scene = JSON.parse(await page.evaluate(() => document.documentElement.dataset.scene));
  await page.waitForTimeout(500);
  await page.close();
  return { scripts, scene };
}

const sizes = (bodies) => {
  const all = Buffer.concat(bodies);
  // Each file is compressed on its own, as a server sends it.
  return {
    files: bodies.length,
    min: all.length,
    gzip: bodies.reduce((n, b) => n + gzipSync(b, { level: 9 }).length, 0),
    gzip6: bodies.reduce((n, b) => n + gzipSync(b).length, 0),
    brotli: bodies.reduce(
      (n, b) => n + brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
      0,
    ),
    brotli5: bodies.reduce(
      (n, b) => n + brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length,
      0,
    ),
  };
};

const results = {};
const base = await visit("/spike-0");
results.baseline = { ...sizes([...base.scripts.values()]), scene: base.scene };
for (const [name, path] of [
  ["A", "/spike-a"],
  ["B", "/spike-b"],
  ["B-forced-webgl2", "/spike-b?backend=webgl"],
]) {
  const { scripts, scene } = await visit(path);
  const extra = [...scripts].filter(([url]) => !base.scripts.has(url));
  results[name] = {
    page: sizes([...scripts.values()]),
    chunk: sizes(extra.map(([, body]) => body)),
    files: extra.map(([url, body]) => ({
      url,
      min: body.length,
      gzip: gzipSync(body, { level: 9 }).length,
      // Which three.js builds ended up in the file, by strings only each build carries.
      webglRenderer: body.includes("WebGLRenderer: A WebGL context could not be created"),
      webgpuBackend: body.includes("GPUShaderStage"),
      webglFallback: body.includes("WebGLBackend"),
    })),
    scene,
  };
  console.log(name, JSON.stringify(results[name].chunk), JSON.stringify(scene));
}
console.log("baseline", JSON.stringify(results.baseline));
writeFileSync(out, JSON.stringify(results, null, 1));
await browser.close();
server.kill();
