// B3 spike (sprint 24), option B: three/webgpu's WebGPURenderer (WebGL 2 fallback built in), node
// materials in TSL, BatchedMesh, fat lines, the same custom tween. The scene is stage.js, as in A.

import {
  BatchedMesh,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Line2NodeMaterial,
  LinearFilter,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  Vector4,
  WebGPURenderer,
} from "three/webgpu";
import { LineSegments2 } from "three/addons/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import {
  abs,
  batchColor,
  color,
  diffuseColor,
  float,
  fract,
  fwidth,
  mix,
  output,
  positionGeometry,
  smoothstep,
  step,
  uniform,
  vec4,
} from "three/tsl";
import { createStage, PENCIL } from "./stage.js";

const lit = uniform(0);
const pencil = color(PENCIL);

/** The card, as in option A: lit, mixed back to its flat fill at lit 0, hatched where flagged. */
function card(fill, batched) {
  const material = new MeshStandardNodeMaterial({
    color: new Color(fill),
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  if (batched) {
    // The node material multiplies the instance colour in itself; this adds the hatch on top of it
    // by dividing it back out where a stroke falls.
    const hatch = step(batchColor.a, float(0.75));
    const d = positionGeometry.x.add(positionGeometry.y).div(7);
    const w = fwidth(d);
    const stroke = float(1).sub(smoothstep(w.negate().add(0.12), w.add(0.12), abs(fract(d).sub(0.5))));
    const toPencil = pencil.div(batchColor.rgb.max(0.001));
    material.colorNode = vec4(mix(color(1, 1, 1), toPencil, hatch.mul(stroke)), 1);
  }
  material.outputNode = mix(vec4(diffuseColor.rgb, 1), output, lit);
  return material;
}

const kit = {
  THREE: {
    BatchedMesh,
    BufferAttribute,
    BufferGeometry,
    Color,
    DataTexture,
    DirectionalLight,
    Group,
    HemisphereLight,
    LinearFilter,
    Mesh,
    OrthographicCamera,
    PerspectiveCamera,
    PlaneGeometry,
    RGBAFormat,
    Scene,
    Vector4,
  },
  LineSegments2,
  LineSegmentsGeometry,
  async renderer(canvas) {
    const forceWebGL = new URLSearchParams(location.search).get("backend") === "webgl";
    const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL });
    await renderer.init();
    renderer.setClearColor(0x000000, 0);
    renderer.info.autoReset = false;
    return renderer;
  },
  plankMaterial: () => card(0xffffff, true),
  cardMaterial: (fill) => card(fill, false),
  // Line2NodeMaterial reads the viewport itself: widths are CSS pixels.
  lineMaterial: (fill, px) => new Line2NodeMaterial({ color: new Color(fill), linewidth: px }),
  shadowMaterial(fill, alphaMap) {
    return new MeshBasicNodeMaterial({
      color: new Color(fill),
      alphaMap,
      transparent: true,
      depthWrite: false,
    });
  },
  setLit(value) {
    lit.value = value;
  },
  resetInfo(renderer) {
    renderer.info.reset();
  },
  readInfo(renderer) {
    const { drawCalls, triangles } = renderer.info.render;
    return {
      draws: drawCalls,
      triangles,
      backend: renderer.backend.isWebGPUBackend ? "webgpu" : "webgl2",
    };
  },
};

/** Mounts option B on the canvas. */
export function mount(canvas, options) {
  return createStage(kit, canvas, options);
}

export const option = "B";
