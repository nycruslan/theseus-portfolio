// S1, the control: the same entries (each option's scene and poses.js) bundled with esbuild, as the
// research measured three.js (design/research/2026-ui-ux-and-3d.md, section D), so Turbopack's own
// overhead separates from what the scene adds. esbuild isn't a dependency: install it in a scratch
// folder and pass that folder.
//
//   node .crew/sprint/24/spike/measure/s1-esbuild.mjs <folder with node_modules/esbuild> <app checkout with three> <out.json>

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const spike = join(here, "..");
const repo = join(spike, "../../../..");
const [, , esbuildHome, app, out] = process.argv;
const esbuild = createRequire(join(esbuildHome, "package.json"))("esbuild");

const halfModel = stripTypeScriptTypes(readFileSync(join(repo, "lib/half-model.ts"), "utf8"));
const results = {};
for (const [name, scene] of [
  ["A", "scene-webgl.js"],
  ["B", "scene-webgpu.js"],
]) {
  const built = await esbuild.build({
    stdin: {
      contents: `export * from "./scene/${scene}"; export { posesFor } from "./scene/poses.js";`,
      resolveDir: spike,
    },
    bundle: true,
    minify: true,
    format: "esm",
    target: "es2022",
    write: false,
    nodePaths: [join(app, "node_modules")],
    plugins: [
      {
        name: "half-model",
        setup(build) {
          build.onResolve({ filter: /^@\/lib\/half-model$/ }, () => ({ path: "half-model", namespace: "lib" }));
          build.onLoad({ filter: /.*/, namespace: "lib" }, () => ({ contents: halfModel, loader: "js" }));
        },
      },
    ],
  });
  const body = Buffer.from(built.outputFiles[0].contents);
  results[name] = {
    min: body.length,
    gzip: gzipSync(body, { level: 9 }).length,
    brotli: brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
  console.log(name, JSON.stringify(results[name]));
}
writeFileSync(out, JSON.stringify(results, null, 1));
