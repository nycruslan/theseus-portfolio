// The model's scene on WebGLRenderer (.crew/sprint/24/spike/scene/stage.js and scene-webgl.js,
// ported; contract, "Stack"). Three draws a frame at most four: the card (every plank, the deck
// and the transom, one merged mesh), the seams and the outline (two fat-line batches), and the
// shadow once the model lifts. Nothing loops here: `draw` draws one frame.

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  SrcAlphaFactor,
  Vector4,
  WebGLRenderer,
} from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { PLANKS } from "@/lib/hull-layouts";
import {
  DARK_GAIN,
  DARK_LIGHT,
  OUTLINE_PX,
  SEAM_PX,
  SHADOW_DARK,
  SHADOW_LIGHT,
} from "./calls";
import { DECK, type Hull } from "./hull";
import type { Loft } from "./loft";
import { LIGHT, type Shadow } from "./shadow";

/** The sheet's tokens as the page computes them, and the scheme they belong to. */
export type Palette = {
  card: string;
  old: string;
  ink: string;
  ground: string;
  pencil: string;
  dark: boolean;
};

/** One slot per plank and one for the deck: the state lookup (contract, build note 1). */
const SLOTS = PLANKS.length + 1;
/** The light scheme's sky bounce under the hull: the spike's rig, kept (notes-iris.md, call 6). */
const GROUND_LIGHT = "#9fb2ad";
/** The rig, light scheme: a soft sky, a frontal fill so the lit card stays card, and a sun. */
const SKY = 1.6;
const FILL = 0.9;
const SUN = 1.4;

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * The card: a lit standard material whose colour is each vertex's slot in the state lookup, mixed
 * back to that flat colour while the model lies on the drawing (uLit 0 is the drawing's own fills,
 * exactly: S4), with the pencil hatch where a state's alpha flags it (B4's graphite; unused in B3).
 */
function cardMaterial() {
  const uniforms = {
    uLit: { value: 0 },
    uPencil: { value: new Color() },
    uStates: {
      value: Array.from({ length: SLOTS }, () => new Vector4(1, 1, 1, 1)),
    },
  };
  const material = new MeshStandardMaterial({
    roughness: 1,
    metalness: 0,
    // The ink lies on the card: the card steps back a hair so a line never loses the depth test,
    // where an offset in the geometry would show in the side view (S4, rule 3; build note 4).
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        `attribute float slot;\nuniform vec4 uStates[${SLOTS}];\nvarying vec4 vState;\nvarying vec2 vHull;\nvoid main() {`,
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvState = uStates[int(slot + 0.5)];\nvHull = position.xy;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uLit;\nuniform vec3 uPencil;\nvarying vec4 vState;\nvarying vec2 vHull;\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = vState.rgb;
        // Alpha below 1 flags the pencil hatch: 45° strokes 7 hull units apart, on the card.
        float hatch = step(vState.a, 0.75);
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
  return { material, uniforms };
}

/** A batch of fat lines; `fit` sets their weight. */
/** The card's buffers at one level: every plank, the deck and the transom, with their slots. */
function cardGeometry(hull: Hull) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(hull.position, 3));
  geometry.setAttribute("normal", new BufferAttribute(hull.normal, 3));
  geometry.setAttribute("slot", new BufferAttribute(hull.slot, 1));
  geometry.setIndex(new BufferAttribute(hull.index, 1));
  return geometry;
}

/** A batch of fat lines' segments at one level. */
function lineGeometry(positions: Float32Array, quads: boolean) {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  // S2's fix for the triangle budget: the seams are smooth polylines, so each segment is drawn as
  // its middle quad, two triangles, without the round caps' four. The outline keeps its caps,
  // since it turns corners at the stem, the counter and the transom.
  if (quads) geometry.setIndex([2, 4, 3, 4, 5, 3]);
  return geometry;
}

/** A batch of fat lines; `fit` sets their weight. */
function lines(positions: Float32Array, quads: boolean) {
  const material = new LineMaterial();
  const line = new LineSegments2(lineGeometry(positions, quads), material);
  line.frustumCulled = false;
  return { line, material };
}

export type Stage = ReturnType<typeof createStage>;

export function createStage(canvas: HTMLCanvasElement, hull: Hull) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  // Buffer pixels are set exactly by `fit`, never as css × ratio, which three floors.
  renderer.setPixelRatio(1);

  const scene = new Scene();
  const model = new Group();
  scene.add(model);

  const card = cardMaterial();
  const mesh = new Mesh(cardGeometry(hull), card.material);
  mesh.frustumCulled = false;

  const seams = lines(hull.seams, true);
  const outline = lines(hull.outline, false);
  model.add(mesh, seams.line, outline.line);

  const sky = new HemisphereLight(0xffffff, GROUND_LIGHT, SKY);
  const fill = new DirectionalLight(0xffffff, FILL);
  fill.position.set(0, 0, 1);
  const sun = new DirectionalLight(0xffffff, SUN);
  sun.position.set(...LIGHT);
  scene.add(sky, fill, sun);

  // The shadow blends as a transparent plane would, but in the opaque pass and before the card
  // (renderOrder only sorts within a pass), so the card always paints over it: no part of the
  // model is ever tinted by the sheet's shadow, wherever the pose puts it.
  const shadowMaterial = new MeshBasicMaterial({
    blending: CustomBlending,
    blendSrc: SrcAlphaFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
    depthWrite: false,
  });
  const shadow = new Mesh(new PlaneGeometry(1, 1), shadowMaterial);
  shadow.renderOrder = -1;
  shadow.frustumCulled = false;
  scene.add(shadow);
  let darkness = SHADOW_LIGHT;

  // One camera for every frame, at the world's origin so the view is the identity. Its projection
  // is set per frame: orthographic at 1/D = 0, a dolly-zoom whose frustum at z = 0 is the canvas
  // after. A perspective camera at distance D would put 10^6 px of translation into float32 in the
  // first frames (D = lens / e), and the seams would fight the card for depth. An orthographic
  // camera's flag keeps the lighting's view direction straight down at the sheet.
  const camera = new OrthographicCamera();
  let [width, height] = [1, 1];

  return {
    /** Sizes the buffer in whole pixels and the scene in the canvas's CSS px. */
    fit(buffer: readonly [number, number], css: readonly [number, number]) {
      renderer.setSize(buffer[0], buffer[1], false);
      [width, height] = css;
      // LineSegments2 sets each line's resolution to the viewport before it draws, and the
      // viewport is in buffer pixels here, so the weights are too: the drawing's CSS px × ratio.
      const ratio = buffer[0] / width;
      seams.material.linewidth = SEAM_PX * ratio;
      outline.material.linewidth = OUTLINE_PX * ratio;
    },

    /**
     * Swaps the hull for another level's when the page crosses 768 px: the buffers change, the
     * materials and so the compiled programs stay (.crew/sprint/26/contract.md, "Which drawing").
     */
    load(next: Hull) {
      const hull = mesh.geometry;
      mesh.geometry = cardGeometry(next);
      hull.dispose();
      for (const [part, positions, quads] of [
        [seams, next.seams, true],
        [outline, next.outline, false],
      ] as const) {
        const old = part.line.geometry;
        part.line.geometry = lineGeometry(positions, quads);
        old.dispose();
      }
    },

    /** Lays the baked shadow on the sheet. */
    shade(baked: Shadow) {
      const old = shadowMaterial.alphaMap;
      const map = new DataTexture(
        baked.data,
        baked.width,
        baked.height,
        RGBAFormat,
      );
      map.magFilter = LinearFilter;
      map.minFilter = LinearFilter;
      map.needsUpdate = true;
      shadowMaterial.alphaMap = map;
      old?.dispose();
      shadow.geometry.dispose();
      shadow.geometry = new PlaneGeometry(baked.worldWidth, baked.worldHeight);
      shadow.position.set(baked.x, baked.y, 0);
    },

    /** The tokens and the record: each plank's state, the ink, the rig and the shadow's darkness. */
    paint(palette: Palette, seated: ReadonlySet<string>) {
      const tint = new Color();
      card.uniforms.uStates.value.forEach((state, i) => {
        const id = PLANKS[i]?.id ?? "";
        tint.set(i === DECK || seated.has(id) ? palette.card : palette.old);
        state.set(tint.r, tint.g, tint.b, 1);
      });
      card.uniforms.uPencil.value.set(palette.pencil);
      seams.material.color.set(palette.ink);
      outline.material.color.set(palette.ink);
      const gain = palette.dark ? DARK_GAIN : 1;
      for (const light of [sky, fill, sun]) {
        light.color.set(palette.dark ? DARK_LIGHT : 0xffffff);
      }
      sky.intensity = SKY * gain;
      sky.groundColor.set(palette.dark ? palette.ground : GROUND_LIGHT);
      fill.intensity = FILL * gain;
      sun.intensity = SUN * gain;
      shadowMaterial.color.set(palette.dark ? 0x000000 : palette.ink);
      darkness = palette.dark ? SHADOW_DARK : SHADOW_LIGHT;
    },

    /** Compiles every program, the shadow's too, before frame 1 (S6; build note 5). */
    async compile(loft: Loft) {
      project(loft, 1);
      shadow.visible = true;
      await renderer.compileAsync(scene, camera);
    },

    /** Draws one frame at eased progress e. */
    draw(e: number, loft: Loft) {
      const pose = project(loft, e);
      model.position.set(pose.x, pose.y, pose.z);
      model.rotation.set(rad(pose.pitch), rad(pose.yaw), 0, "YXZ");
      model.scale.setScalar(pose.s);
      card.uniforms.uLit.value = Math.min(1, e * 1.25);
      shadowMaterial.opacity = darkness * Math.min(1, e * 1.4);
      shadow.visible = e > 0;
      renderer.render(scene, camera);
    },

    dispose() {
      mesh.geometry.dispose();
      card.material.dispose();
      for (const part of [seams, outline]) {
        part.line.geometry.dispose();
        part.material.dispose();
      }
      shadow.geometry.dispose();
      shadowMaterial.alphaMap?.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
      // Free the context now, not when the canvas is collected: one context alive after Back.
      renderer.forceContextLoss();
    },
  };

  /** Sets the camera for eased progress e and returns the model's pose. */
  function project(loft: Loft, e: number) {
    const { pose, invD } = loft.at(e);
    // Depth runs over ±0.9 of the nearest camera distance, so every point stays in front of it.
    const zHi = 0.9 * loft.lens;
    // x_c = 2x/W − 1, y_c = 2y/H + 1, w_c = 1 − z/D: the canvas at z = 0 for every D, and an
    // orthographic frame at 1/D = 0. z maps zHi to −1 and −zHi to 1.
    camera.projectionMatrix.set(
      2 / width,
      0,
      0,
      -1,
      0,
      2 / height,
      0,
      1,
      0,
      0,
      -1 / zHi,
      zHi * invD,
      0,
      0,
      -invD,
      1,
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    return pose;
  }
}
