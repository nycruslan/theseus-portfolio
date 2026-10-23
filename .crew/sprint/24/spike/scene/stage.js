// B3 spike (sprint 24): the scene both options share. It imports nothing from three.js: each option
// hands in its own build's classes and materials (scene-webgl.js, scene-webgpu.js), so neither
// bundle pulls in the other's renderer and the two chunk sizes compare like for like.
//
// Five draws a frame, by design: the planks (one BatchedMesh, a per-plank state colour), the seams
// (one fat-line batch), the outline (one fat-line batch, heavier ink), the deck with the transom,
// and the contact shadow. Rendering is on demand only: `frame(e)` draws one frame and nothing loops.

import { buildHull, PLANKS } from "./hull-mesh.js";
import { makeLoft } from "./loft.js";
import { bakeShadow } from "./shadow.js";

/** The sheet's tokens, light scheme (app/globals.css). */
export const INK = "#111c22";
export const PENCIL = "#878d91";
const FILM = "#eaf1ee";

/**
 * The plank states (.crew/sprint/17/direction-iris.md, "Four states"): rgb is the state's colour and
 * alpha flags the pencil hatch, so one per-instance colour carries the whole state.
 */
export const STATES = {
  card: { color: "#fbfaf7", hatch: false }, // ink and card: merged
  original: { color: "#d9e0dc", hatch: false }, // an original plank
  graphite: { color: FILM, hatch: true }, // the plank in progress, hatched in pencil
  copper: { color: "#9e441d", hatch: false }, // live, this minute
  vellum: { color: "#cfdcdc", hatch: false }, // removed (the ghost hull at /log)
};

/** Toward the light: up and to the left of the sheet, in front of it (sprint 17's sun). */
const LIGHT = (() => {
  const v = [-0.38, 0.62, 1.5];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

/**
 * @param kit the option's three.js classes and materials
 * @param canvas the canvas lying over the drawing
 * @param options { width, height, dpr, level, states: Map<plankId, stateName>, from, to, scale, lens }
 */
export async function createStage(kit, canvas, options) {
  const T = kit.THREE;
  const { level } = options;
  let dpr = options.dpr;
  // The canvas in whole drawing-buffer pixels. three.js floors the buffer but rounds the viewport,
  // so a fractional size (the sheet's drawing is 475.31 px tall at 1440) stretches the frame by a
  // row and lifts the top of the model 0.4 CSS px at DPR 2 (S4).
  const fit = (css, pr) => Math.round(css * pr) / pr;
  const [width, height] = [fit(options.width, dpr), fit(options.height, dpr)];
  const renderer = await kit.renderer(canvas);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);

  const hull = buildHull(level);
  const loft = makeLoft({ ...options, width, height, points: hull.points });

  const scene = new T.Scene();
  const model = new T.Group();
  scene.add(model);

  const geometry = ({ position, normal, index }) => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(position, 3));
    g.setAttribute("normal", new T.BufferAttribute(normal, 3));
    g.setIndex(new T.BufferAttribute(index, 1));
    return g;
  };

  // The planks: one BatchedMesh, one instance per plank, its state in the instance colour.
  const vertices = hull.planks.reduce((n, p) => n + p.position.length / 3, 0);
  const indices = hull.planks.reduce((n, p) => n + p.index.length, 0);
  const planks = new T.BatchedMesh(PLANKS.length, vertices, indices, kit.plankMaterial());
  const instance = new Map();
  for (const plank of hull.planks) {
    instance.set(plank.id, planks.addInstance(planks.addGeometry(geometry(plank))));
  }
  const tint = new T.Color();
  const setState = (id, name) => {
    const state = STATES[name] ?? STATES.original;
    tint.set(state.color);
    planks.setColorAt(instance.get(id), new T.Vector4(tint.r, tint.g, tint.b, state.hatch ? 0.5 : 1));
  };
  for (const { id } of hull.planks) setState(id, options.states.get(id) ?? "original");
  model.add(planks);

  const deck = new T.Mesh(geometry(hull.deck), kit.cardMaterial(STATES.card.color));
  model.add(deck);

  // Line widths are the drawing's (app/globals.css): plank edges 0.9 px, the outline 1.6 px.
  const lines = (positions, px) => {
    const g = new kit.LineSegmentsGeometry();
    g.setPositions(positions);
    const line = new kit.LineSegments2(g, kit.lineMaterial(INK, px, width, height));
    return line;
  };
  const seams = lines(hull.seams, 0.9);
  const outline = lines(hull.outline, 1.6);
  model.add(seams, outline);

  // Lights for white card: a soft sky, a frontal fill so the registered frame reads flat, a sun.
  scene.add(new T.HemisphereLight(0xffffff, new T.Color("#9fb2ad"), 1.6));
  const fill = new T.DirectionalLight(0xffffff, 0.9);
  fill.position.set(0, 0, 1);
  scene.add(fill);
  const sun = new T.DirectionalLight(0xffffff, 1.4);
  sun.position.set(...LIGHT);
  scene.add(sun);

  // The contact shadow: baked once at the settled pose, a plane on the sheet.
  const settled = loft.at(1).pose;
  // Texels follow the model's scale, so the penumbra is the same share of the hull at every width.
  const baked = bakeShadow({
    meshes: [...hull.planks, hull.deck],
    pose: settled,
    light: LIGHT,
    texel: Math.max(1, 2.5 * options.scale),
  });
  const shadowMap = new T.DataTexture(baked.data, baked.width, baked.height, T.RGBAFormat);
  shadowMap.magFilter = T.LinearFilter;
  shadowMap.minFilter = T.LinearFilter;
  shadowMap.needsUpdate = true;
  const shadowMaterial = kit.shadowMaterial(INK, shadowMap);
  const shadow = new T.Mesh(new T.PlaneGeometry(baked.worldWidth, baked.worldHeight), shadowMaterial);
  shadow.position.set(baked.x + baked.worldWidth / 2, baked.y + baked.worldHeight / 2, 0);
  shadow.renderOrder = -1;
  scene.add(shadow);

  // Cameras: orthographic for the registered frame, then a perspective dolly-zoom whose frustum at
  // z = 0 is always the canvas.
  const ortho = new T.OrthographicCamera(0, width, 0, -height, 1, 4000);
  ortho.position.set(0, 0, 2000);
  const lens = new T.PerspectiveCamera(30, width / height, 1, 4000);

  const pose = (e) => {
    const { pose: p, D } = loft.at(e);
    model.position.set(p.x, p.y, p.z);
    model.rotation.set((p.pitch * Math.PI) / 180, (p.yaw * Math.PI) / 180, 0, "YXZ");
    model.scale.setScalar(p.s);
    kit.setLit(Math.min(1, e * 1.25));
    shadowMaterial.opacity = 0.16 * Math.min(1, e * 1.4);
    shadow.visible = e > 0 && shadow.userData.on !== false;
    if (!Number.isFinite(D)) return ortho;
    lens.fov = (2 * Math.atan(height / 2 / D) * 180) / Math.PI;
    lens.near = Math.max(1, D - 1200);
    lens.far = D + 1200;
    lens.position.set(width / 2, -height / 2, D);
    lens.updateProjectionMatrix();
    return lens;
  };

  // Compile every program before the registered frame, the shadow's too (it is hidden until the
  // model lifts): otherwise its first loft frame compiles it, a hitch mid-move.
  shadow.visible = true;
  await renderer.compileAsync(scene, lens);

  /** Draws one frame at eased progress e and returns its draws and triangles. */
  const frame = (e) => {
    const camera = pose(e);
    kit.resetInfo(renderer);
    renderer.render(scene, camera);
    return kit.readInfo(renderer);
  };

  return {
    renderer,
    /** The five draws, for the registration check to show one at a time. */
    parts: { planks, deck, seams, outline, shadow },
    loft,
    hull,
    frame,
    setState,
    /** One step of quality down: the device pixel ratio first (2, 1.5, 1). False at the floor. */
    step(direction) {
      const steps = [1, 1.5, 2];
      const i = steps.indexOf(dpr);
      const next = direction === "down" ? steps[i - 1] : steps[i + 1];
      if (!next || next > options.dpr) return false;
      dpr = next;
      renderer.setPixelRatio(dpr);
      renderer.setSize(fit(options.width, dpr), fit(options.height, dpr));
      return true;
    },
    get dpr() {
      return dpr;
    },
  };
}
