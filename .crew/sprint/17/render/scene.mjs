import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import {
  LENGTH, HEIGHT, LIFTS, sheer, profile, halfBreadth, deckBreadth, seamDepth, planks, bandAt, ORDER,
} from "./hull.mjs";
import { linesPlan, plankStates, THEMES } from "./drawing.mjs";

const P = JSON.parse(decodeURIComponent(location.hash.slice(1) || "{}"));
const W = P.w ?? 1440, Hh = P.h ?? 900, DPR = P.dpr ?? 2;
const theme = P.theme ?? "light";
const T = THEMES[theme];
const stage = document.getElementById("stage");
stage.style.width = `${W}px`;
stage.style.height = `${Hh}px`;
document.body.style.background = P.transparent ? "transparent" : T.film;

const merged = P.merged ?? [];
const states = plankStates(ORDER, merged, P.pencil);

// ---- the drawing (DOM, as the build would have it) ----
const svg = document.getElementById("drawing");
svg.setAttribute("width", W);
svg.setAttribute("height", Hh);
svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
if (P.drawing !== false) {
  svg.innerHTML = linesPlan({ theme, ...P.plan, planksOn: P.planks2d ? { ...states, ghost: P.ghost2d } : null, live: P.live, pencilLabel: P.planks2d && P.pencil ? String(P.pencilSprint) : null });
  if (P.drawingOpacity != null) svg.style.opacity = P.drawingOpacity;
}

const done = () => { document.body.dataset.ready = "1"; };
if (P.webgl === false) {
  document.fonts.ready.then(done);
} else {
  build();
}

function build() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, Hh);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // The sheet: world units are CSS px, x right, y up (screen y is -Y), the sheet at z = 0.
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 4, Hh * 4),
    new THREE.ShadowMaterial({ color: new THREE.Color(theme === "dark" ? "#000000" : "#0c2a2a"), opacity: (theme === "dark" ? 0.45 : 0.16) * (P.shadow ?? 1) }),
  );
  shadowPlane.position.set(W / 2, -Hh / 2, 0);
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const hemi = new THREE.HemisphereLight(0xffffff, new THREE.Color(T.deep), theme === "dark" ? 1.2 : 2.0);
  const fill = new THREE.DirectionalLight(0xffffff, theme === "dark" ? 0.35 : 0.55);
  fill.position.set(0, 0, 1);
  scene.add(fill);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(theme === "dark" ? 0xf2f6f6 : 0xffffff, theme === "dark" ? 1.6 : 1.1);
  scene.add(sun);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 9;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0005;

  // ---- the model ----
  const model = new THREE.Group();
  const inner = new THREE.Group(); // hull-local units, centred
  model.add(inner);
  scene.add(model);

  const toLocal = (x, y, z) => new THREE.Vector3(x - LENGTH / 2, -(y - HEIGHT / 2), z);
  const cardNew = new THREE.MeshLambertMaterial({ color: new THREE.Color(theme === "dark" ? "#dfe4e2" : T.card), side: THREE.DoubleSide });
  const cardOld = new THREE.MeshLambertMaterial({ color: new THREE.Color(theme === "dark" ? "#a9b2b0" : "#d9e0dc"), side: THREE.DoubleSide });
  const ghostMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(theme === "dark" ? "#7d8f93" : "#cfdcdc"), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const hatchTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = T.film;
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = T.pencil;
    g.lineWidth = 2.2;
    for (let i = -64; i < 128; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const pencilMat = new THREE.MeshBasicMaterial({ map: hatchTex, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });

  const lineMats = [];
  const lmat = (color, width, dashed = false, opacity = 1) => {
    const m = new LineMaterial({ color: new THREE.Color(color), linewidth: width * DPR, dashed, dashSize: 5, gapSize: 3, transparent: opacity < 1, opacity });
    m.resolution.set(W * DPR, Hh * DPR);
    lineMats.push(m);
    return m;
  };
  const addLine = (pts, mat) => {
    if (pts.length < 2) return;
    const g = new LineGeometry();
    g.setPositions(pts.flatMap((v) => [v.x, v.y, v.z]));
    const l = new Line2(g, mat);
    l.computeLineDistances();
    inner.add(l);
  };

  const inkW = P.inkW ?? 1;
  const inkSeam = lmat(T.ink, 0.85 * inkW);
  const inkOutline = lmat(T.ink, 1.5 * inkW);
  const pencilLine = lmat(T.graphite, 1.1, true);
  const copperLine = lmat(T.copper, 2.6);
  const ghostLine = lmat(theme === "dark" ? "#8a9aa0" : "#7d898e", 0.8, false, 0.9);

  const NX = 40, NY = 12;
  const surfacePoint = (x, y, side, lift = 0) => {
    const z = halfBreadth(x, y);
    return toLocal(x, y, side * (z + lift));
  };

  const ghostMode = P.ghostHull === true;
  const plankCenters = {};
  for (const p of planks()) {
    const sprint = states.bySprint[p.id];
    const isPencil = p.id === states.pencilId;
    if (ghostMode && !sprint) continue; // the ghost hull holds only what the crew took out
    const xsP = Array.from({ length: NX + 1 }, (_, i) => p.x0 + ((p.x1 - p.x0) * i) / NX).filter((x) => bandAt(p, x));
    for (const side of ghostMode ? [1] : [1, -1]) {
      const pos = [], uv = [], idx = [];
      xsP.forEach((x, i) => {
        const [a, b] = bandAt(p, x);
        for (let j = 0; j <= NY; j++) {
          const y = a + ((b - a) * j) / NY;
          const v = surfacePoint(x, y, side);
          pos.push(v.x, v.y, v.z);
          uv.push((x - p.x0) / 18, (y - a) / 18);
        }
      });
      for (let i = 0; i < xsP.length - 1; i++) for (let j = 0; j < NY; j++) {
        const a = i * (NY + 1) + j, b = a + NY + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mat = ghostMode ? ghostMat : isPencil ? pencilMat : sprint ? cardNew : cardOld;
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = !ghostMode;
      inner.add(mesh);

      // Edges: seams top and bottom, and the butts.
      const edgeMat = ghostMode ? ghostLine : isPencil ? pencilLine : inkSeam;
      const lift = 0.35;
      const topPts = xsP.map((x) => surfacePoint(x, bandAt(p, x)[0], side, lift));
      const botPts = xsP.map((x) => surfacePoint(x, bandAt(p, x)[1], side, lift));
      addLine(topPts, edgeMat);
      addLine(botPts, edgeMat);
      for (const x of [xsP[0], xsP[xsP.length - 1]]) {
        const [a, b] = bandAt(p, x);
        addLine(Array.from({ length: 9 }, (_, j) => surfacePoint(x, a + ((b - a) * j) / 8, side, lift)), edgeMat);
      }
      if (isPencil && side === 1 && P.live) {
        // The stroke being drawn now: the copper tip of the bottom seam.
        const n = botPts.length;
        const from = Math.floor(n * 0.42), to = Math.floor(n * 0.66);
        addLine(botPts.slice(from, to), copperLine);
        const tip = botPts[to - 1];
        const dot = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.copper) }));
        dot.position.copy(tip);
        inner.add(dot);
      }
      if (side === 1) {
        const cx = (p.x0 + p.x1) / 2;
        const band = bandAt(p, cx) ?? bandAt(p, xsP[Math.floor(xsP.length / 2)]);
        if (band) plankCenters[p.id] = surfacePoint(cx, (band[0] + band[1]) / 2, 1, 1);
      }
    }
  }

  if (!ghostMode) {
    // Deck and transom close the model.
    const xs = Array.from({ length: 121 }, (_, i) => (LENGTH * i) / 120);
    const pos = [], idx = [];
    xs.forEach((x) => {
      const z = deckBreadth(x) * (profile(x) - sheer(x) > 0 ? 1 : 0);
      const a = toLocal(x, sheer(x), -z), b = toLocal(x, sheer(x), z);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    });
    for (let i = 0; i < xs.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const deck = new THREE.BufferGeometry();
    deck.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    deck.setIndex(idx);
    deck.computeVertexNormals();
    const deckMesh = new THREE.Mesh(deck, cardNew);
    deckMesh.castShadow = true;
    inner.add(deckMesh);
    // Transom: a fan from the centre of the stern section.
    const tpos = [], tidx = [];
    const top = sheer(0), bot = profile(0);
    const ys = Array.from({ length: 25 }, (_, i) => top + ((bot - top) * i) / 24);
    const c = toLocal(0, (top + bot) / 2, 0);
    tpos.push(c.x, c.y, c.z);
    const ring = [...ys.map((y) => toLocal(0, y, halfBreadth(0, y))), ...ys.slice().reverse().map((y) => toLocal(0, y, -halfBreadth(0, y)))];
    ring.forEach((v) => tpos.push(v.x, v.y, v.z));
    for (let i = 1; i < ring.length; i++) tidx.push(0, i, i + 1);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.Float32BufferAttribute(tpos, 3));
    tg.setIndex(tidx);
    tg.computeVertexNormals();
    inner.add(new THREE.Mesh(tg, cardNew));
    // Outline in heavier ink: the sheer both sides, the stem and keel, the transom.
    for (const side of [1, -1]) addLine(xs.map((x) => toLocal(x, sheer(x), side * (deckBreadth(x) * (profile(x) - sheer(x) > 0 ? 1 : 0) + 0.4))), inkOutline);
    addLine(xs.map((x) => toLocal(x, profile(x) + 0.3, 0)), inkOutline);
    addLine(ring.map((v) => new THREE.Vector3(v.x - 0.4, v.y, v.z)), inkOutline);
  } else {
    // The ghost keeps a faint keel and sheer so its shape reads.
    const xs = Array.from({ length: 121 }, (_, i) => (LENGTH * i) / 120);
    for (const side of [1, -1]) addLine(xs.map((x) => toLocal(x, sheer(x), side * deckBreadth(x) * (profile(x) - sheer(x) > 0 ? 1 : 0))), ghostLine);
    addLine(xs.map((x) => toLocal(x, profile(x), 0)), ghostLine);
  }

  // ---- pose ----
  const t = P.t ?? 1;
  const ease = (u) => (u >= 1 ? 1 : 1 - 2 ** (-10 * u)); // exponential ease-out
  const e = P.linear ? t : ease(t);
  const A = P.from, B = P.to; // { cx, cy, s, yaw, pitch, z }
  const lerp = (a, b) => a + (b - a) * e;
  const pose = { cx: lerp(A.cx, B.cx), cy: lerp(A.cy, B.cy), s: lerp(A.s, B.s), yaw: lerp(A.yaw, B.yaw), pitch: lerp(A.pitch, B.pitch), z: lerp(A.z, B.z) };
  inner.scale.setScalar(pose.s);
  model.position.set(pose.cx, -pose.cy, pose.z);
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (pose.pitch * Math.PI) / 180);
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (pose.yaw * Math.PI) / 180);
  model.quaternion.copy(qy.multiply(qx));

  // Camera: a dolly-zoom from near-orthographic (the drawing) to a 30 degree lens, holding the
  // sheet's size, so the page never moves and only the model gains depth.
  const D0 = 90000, D1 = P.lens ?? 1700;
  const D = Math.exp(Math.log(D0) + (Math.log(D1) - Math.log(D0)) * e);
  const cam = new THREE.PerspectiveCamera((2 * Math.atan(Hh / 2 / D) * 180) / Math.PI, W / Hh, D * 0.5, D * 2);
  cam.position.set(W / 2, -Hh / 2, D);
  cam.lookAt(W / 2, -Hh / 2, 0);

  sun.position.set(pose.cx - 380, -pose.cy + 620, 1500);
  shadowPlane.material.opacity *= Math.min(1, e * 1.4);
  sun.target.position.set(pose.cx, -pose.cy, 0);
  const sc = sun.shadow.camera;
  sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900; sc.near = 10; sc.far = 5000;
  sc.updateProjectionMatrix();

  renderer.render(scene, cam);

  // Labels: DOM twins at each numbered plank's projected centre.
  if (P.numbers) {
    const labels = document.getElementById("labels");
    model.updateMatrixWorld(true);
    for (const [id, v] of Object.entries(plankCenters)) {
      const sprint = states.bySprint[id];
      const show = P.numbers === "all" ? sprint || id === states.pencilId : (P.numbers.includes?.(sprint) || (id === states.pencilId && P.numbers.includes?.("pencil")));
      if (!show) continue;
      const w = v.clone().applyMatrix4(inner.matrixWorld).project(cam);
      const x = ((w.x + 1) / 2) * W, y = ((1 - w.y) / 2) * Hh;
      const el = document.createElement("div");
      el.className = "lab";
      el.style.left = `${x}px`;
      el.style.top = `${y + (id === states.pencilId ? -14 : 0)}px`;
      el.style.background = T.film;
      el.style.padding = '2px 3px';
      if (ghostMode) el.style.background = 'transparent';
      el.style.color = id === states.pencilId ? T.copper : ghostMode ? T.graphite : T.ink;
      el.textContent = id === states.pencilId ? String(P.pencilSprint ?? "") : String(sprint);
      labels.appendChild(el);
    }
  }
  document.fonts.ready.then(done);
}
