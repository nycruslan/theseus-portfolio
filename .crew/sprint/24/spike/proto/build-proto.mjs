// Builds the prototype page into a scratch folder: the home page exactly as `next build` renders it,
// its CSS and fonts, with Next's scripts taken out and the spike's driver put in.
//
//   node .crew/sprint/24/spike/proto/build-proto.mjs <app checkout with .next and three> <port of its next start> <out>
//
// The app checkout is S1's worktree (it has three@0.186.1 installed and a fresh `next build`).

import { cpSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const spike = join(here, "..");
const repo = join(spike, "../../../..");
const [, , app, port, outArg] = process.argv;
const out = resolve(outArg);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "lib"), { recursive: true });

// The page as the site serves it, minus every script: the sheet is server-rendered and needs none.
let html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<link[^>]+rel="(?:modulepreload|preload)"[^>]+as="script"[^>]*>/g, "");
const importmap = {
  imports: {
    three: "/three/build/three.module.js",
    "three/webgpu": "/three/build/three.webgpu.js",
    "three/tsl": "/three/build/three.tsl.js",
    "three/addons/": "/three/examples/jsm/",
    "@/lib/half-model": "/lib/half-model.js",
  },
};
html = html.replace(
  "</head>",
  `<script type="importmap">${JSON.stringify(importmap)}</script><script type="module" src="/spike/proto/proto.js"></script></head>`,
);
writeFileSync(join(out, "index.html"), html);

cpSync(join(app, ".next/static"), join(out, "_next/static"), { recursive: true });
symlinkSync(join(app, "node_modules/three"), join(out, "three"));

// lib/half-model.ts as the browser can load it: types stripped, nothing else changed.
const source = readFileSync(join(repo, "lib/half-model.ts"), "utf8");
writeFileSync(join(out, "lib/half-model.js"), stripTypeScriptTypes(source));

cpSync(join(spike, "scene"), join(out, "spike/scene"), { recursive: true });
cpSync(join(spike, "proto"), join(out, "spike/proto"), { recursive: true });
console.log("prototype in", out);
