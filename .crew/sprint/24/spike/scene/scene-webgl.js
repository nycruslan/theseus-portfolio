// B3 spike (sprint 24), option A: WebGLRenderer, MeshStandardMaterial extended in GLSL, BatchedMesh,
// fat lines, the custom tween in loft.js. The scene itself is stage.js, shared with option B.

import {
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
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  Vector4,
  WebGLRenderer,
} from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { createStage, INK, PENCIL } from "./stage.js";

const lit = { value: 0 };
const pencil = { value: new Color(PENCIL) };

/**
 * The card: lit standard material, mixed back to its flat fill while the model still lies on the
 * drawing (lit 0 is the drawing's own colours, exactly), with the pencil hatch on flagged planks.
 */
function card(color) {
  const material = new MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    // The ink lines sit on the card: push the card back a hair so a line never loses the depth test.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLit = lit;
    shader.uniforms.uPencil = pencil;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec2 vHull;\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHull = position.xy;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uLit;\nuniform vec3 uPencil;\nvarying vec2 vHull;\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Alpha below 1 flags the pencil hatch: 45 degree strokes 7 units apart, on the card.
        float hatch = step(diffuseColor.a, 0.75);
        float d = (vHull.x + vHull.y) / 7.0;
        float w = fwidth(d);
        float stroke = 1.0 - smoothstep(0.12 - w, 0.12 + w, abs(fract(d) - 0.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, uPencil, hatch * stroke);
        vec3 flatColor = diffuseColor.rgb;`,
      )
      .replace(
        "#include <opaque_fragment>",
        "outgoingLight = mix(flatColor, outgoingLight, uLit);\n#include <opaque_fragment>",
      );
  };
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
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    // Count every draw of a frame, not only the last render() call's.
    renderer.info.autoReset = false;
    return renderer;
  },
  plankMaterial: () => card(0xffffff),
  cardMaterial: (color) => card(color),
  lineMaterial(color, px, width, height) {
    const material = new LineMaterial({ color: new Color(color), linewidth: px });
    // Widths in CSS pixels: the resolution is the canvas's CSS size.
    material.resolution.set(width, height);
    return material;
  },
  shadowMaterial(color, alphaMap) {
    return new MeshBasicMaterial({
      color: new Color(color),
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
    const { calls, triangles } = renderer.info.render;
    return { draws: calls, triangles };
  },
};

/** Mounts option A on the canvas. */
export function mount(canvas, options) {
  return createStage(kit, canvas, options);
}

export const option = "A";
