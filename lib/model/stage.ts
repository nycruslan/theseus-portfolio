// The model's scene on WebGLRenderer (.crew/sprint/24/spike/scene/stage.js and scene-webgl.js,
// ported; contract, "Stack"). Three draws a frame at most four: the card (every plank, the deck
// and the transom, one merged mesh), the seams and the outline (two fat-line batches), and the
// shadow once the model lifts; while the crew is live, two more, the pencil plank's copper tip
// (.crew/sprint/34/notes-iris.md, 4.3). On /crew, one more while a tick is shown: the tally's ticks
// in the marks batch (.crew/sprint/36/), so 7 while live. Nothing loops here: `draw` draws one
// frame. The Log's ghost hull (.crew/sprint/33/contract.md, "How it's built") draws at most five:
// the card's far and near sides, each its own index range once, translucent; the seams, the
// outline, and the ink marks.

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  FrontSide,
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
  Raycaster,
  RGBAFormat,
  Scene,
  type Side,
  SrcAlphaFactor,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { PENCIL, PLANKS } from "@/lib/hull-layouts";
import {
  DARK_GAIN,
  DARK_LIGHT,
  GHOST_ALPHA,
  GHOST_DARK_GAIN,
  GHOST_EDGE_PX,
  GHOST_GAIN,
  GHOST_LIT,
  GHOST_OUTLINE_PX,
  MARK_PX,
  OUTLINE_PX,
  SEAM_PX,
  SHADOW_DARK,
  SHADOW_FADE,
  SHADOW_LIGHT,
} from "./calls";
import { DECK, type Hull } from "./hull";
import type { Loft } from "./loft";
import type { PencilMarks } from "./pencil";
import { LIGHT, type Shadow } from "./shadow";

/** The sheet's tokens as the page computes them, and the scheme they belong to. */
export type Palette = {
  card: string;
  old: string;
  ink: string;
  ground: string;
  pencil: string;
  /** Live now (.crew/sprint/34/): the copper tip on the pencil plank, and nothing else. */
  copper: string;
  /** The ghost's tokens (.crew/sprint/33/): the planks' vellum and the outline's graphite. */
  vellum: string;
  muted: string;
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

/** A state's alpha for the pencil plank: below 0.75, the card shader hatches it. */
const HATCHED = 0.5;

/**
 * The card: a lit standard material whose colour is each vertex's slot in the state lookup, mixed
 * back to that flat colour while the model lies on the drawing (uLit 0 is the drawing's own fills,
 * exactly: S4), with the pencil hatch where a state's alpha flags it (.crew/sprint/34/), in the
 * card's own pass: the hatch adds no draw and no triangle.
 */
const cardUniforms = () => ({
  uLit: { value: 0 },
  uPencil: { value: new Color() },
  uStates: {
    value: Array.from({ length: SLOTS }, () => new Vector4(1, 1, 1, 1)),
  },
  /** The hatch: scale, phase and half a stroke, in periods (lib/model/pencil.ts). */
  uHatch: { value: new Vector3() },
});

/**
 * With `side`, the ghost's: one side of the card, translucent, writing no depth, so the far side
 * shows through the near one as vellum shows what lies under it (notes-iris.md, section 1).
 */
function cardMaterial(uniforms = cardUniforms(), side?: Side) {
  const material = new MeshStandardMaterial({
    roughness: 1,
    metalness: 0,
    // The ink lies on the card: the card steps back a hair so a line never loses the depth test,
    // where an offset in the geometry would show in the side view (S4, rule 3; build note 4).
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    ...(side === undefined
      ? {}
      : { side, transparent: true, depthWrite: false }),
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
        "uniform float uLit;\nuniform vec3 uPencil;\nuniform vec3 uHatch;\nvarying vec4 vState;\nvarying vec2 vHull;\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb = vState.rgb;
        // Alpha below 0.75 flags the pencil hatch: the 2D's 45° strokes, tiled from the drawing's
        // origin, rising to the bow; each stroke's cover is filtered over a pixel.
        float d = (vHull.x - vHull.y) * uHatch.x + uHatch.y;
        float w = max(length(vec2(dFdx(d), dFdy(d))), 1e-4);
        float off = abs(fract(d + 0.5) - 0.5);
        float stroke = clamp((uHatch.z - off) / w + 0.5, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uPencil, step(vState.a, 0.75) * stroke);
        vec3 flatColor = diffuseColor.rgb;`,
      )
      .replace(
        "#include <opaque_fragment>",
        "outgoingLight = mix(flatColor, outgoingLight, uLit);\n#include <opaque_fragment>",
      );
  };
  return { material, uniforms };
}

/** The card's buffers at one level: every plank, the deck and the transom, with their slots. */
function cardGeometry(hull: Hull) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(hull.position, 3));
  geometry.setAttribute("normal", new BufferAttribute(hull.normal, 3));
  geometry.setAttribute("slot", new BufferAttribute(hull.slot, 1));
  geometry.setIndex(new BufferAttribute(hull.index, 1));
  return geometry;
}

/**
 * The ghost's two sides over one set of buffers: the far side's index range and the near side's,
 * so each pass draws its own triangles once (three's two-pass `DoubleSide` would draw every
 * triangle twice: 46,288 a frame, over the 30,000 budget; spike-pixel.md, section 2).
 */
function sideGeometries(hull: Hull) {
  const near = cardGeometry(hull);
  const far = new BufferGeometry();
  for (const name of ["position", "normal", "slot"]) {
    far.setAttribute(name, near.getAttribute(name));
  }
  far.setIndex(near.getIndex());
  far.setDrawRange(0, hull.far);
  near.setDrawRange(hull.far, hull.index.length - hull.far);
  return { near, far };
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

/**
 * The sheet's seams with the pencil plank's edges in graphite (notes-iris.md, 4.2): its seams and
 * butts, solid, since a dash doesn't hold under the turn's foreshortening. Each fragment knows where
 * on the hull it is (its segment's end, interpolated), and the edges are whole seams at one depth
 * and butts at one station, so the colour starts and stops exactly at the plank's ends, in the
 * batch's own draw.
 */
function pencilSeams(material: LineMaterial) {
  const uniforms = {
    uGraphite: { value: new Color() },
    /** The plank's stern and bow ends and its top and bottom seams; inside out, it shows none. */
    uEdge: { value: new Vector4(1e6, -1e6, -1e6, 1e6) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "varying vec2 vSeam;\nvoid main() {\nvSeam = (position.y < 0.5 ? instanceStart : instanceEnd).xy;",
    );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "varying vec2 vSeam;\nuniform vec3 uGraphite;\nuniform vec4 uEdge;\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // The top and bottom seams between the plank's ends, and the butts between its seams.
        float e = 0.01;
        bool along = vSeam.x >= uEdge.x - e && vSeam.x <= uEdge.y + e;
        bool down = vSeam.y <= uEdge.z + e && vSeam.y >= uEdge.w - e;
        bool seam = along && (abs(vSeam.y - uEdge.z) < e || abs(vSeam.y - uEdge.w) < e);
        bool butt = down && (abs(vSeam.x - uEdge.x) < e || abs(vSeam.x - uEdge.y) < e);
        if (seam || butt) diffuseColor.rgb = uGraphite;`,
      );
  };
  return uniforms;
}

export type Stage = ReturnType<typeof createStage>;

/**
 * The scene on `canvas`: the sheet's white card model, or with `ghost` the Log's ghost hull
 * (.crew/sprint/33/): the same card, lines and rig, in vellum, with no shadow. With `tally`, /crew's
 * card model (.crew/sprint/36/): the sheet's, whose ink marks batch is the pencil plank's ticks.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  hull: Hull,
  ghost = false,
  /** A coarse hull to pick against: a ray costs 0.1 ms on it, 0.5 to 0.7 on the drawn one. */
  pickHull?: Hull,
  tally = false,
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  // Buffer pixels are set exactly by `fit`, never as css × ratio, which three floors.
  renderer.setPixelRatio(1);

  const scene = new Scene();
  const model = new Group();
  scene.add(model);

  const card = cardMaterial(cardUniforms(), ghost ? FrontSide : undefined);
  const sides = ghost ? sideGeometries(hull) : null;
  const mesh = new Mesh(sides?.near ?? cardGeometry(hull), card.material);
  mesh.frustumCulled = false;
  // The ghost's far side, drawn before the near (renderOrder sorts the transparent pass).
  const back = sides
    ? new Mesh(sides.far, cardMaterial(card.uniforms, BackSide).material)
    : null;
  if (back) {
    back.frustumCulled = false;
    back.renderOrder = 1;
    mesh.renderOrder = 2;
    model.add(back);
  }

  const seams = lines(hull.seams, true);
  const outline = lines(hull.outline, false);
  model.add(mesh, seams.line, outline.line);
  // The ghost's ink marks: a record's plank and the one under the pointer, drawn after the seams
  // they lie on, so at an equal depth the mark wins.
  const marks = lines(new Float32Array(6), false);
  marks.line.visible = false;
  marks.line.renderOrder = 1;
  // The led-out numbers' leaders, graphite at the seams' weight, laid each frame.
  const leads = lines(new Float32Array(6), true);
  leads.line.visible = false;
  model.add(marks.line, leads.line);
  /** The ghost's colours: the token and the translucent colour that composites to it. */
  const vellum = new Color();
  const solved = new Color();
  const tint = new Color();

  // The sprint in progress, on the sheet only (the Log's ghost shows no pencil): its plank's slot,
  // its edge in the seams' batch, and while live its copper tip (notes-iris.md, 4.3): the 2D's run
  // and dot in the same CSS px, unlit, exactly the token, drawn after the seams they lie on. A
  // batch's lines share one weight, so the run and the dot are a batch each: two draws, while live.
  const edges = ghost ? null : pencilSeams(seams.material);
  const tip = ghost
    ? null
    : {
        run: lines(new Float32Array(6), false),
        dot: lines(new Float32Array(6), false),
      };
  /**
   * How far the tip is drawn toward the camera, in clip space: its run and dot lie flat to the
   * screen at the seam's depth, and the card around a seam bulges toward the camera above it (the
   * hull is wider there), which would hide the dot's upper half and thin the run. A dot's width of
   * depth clears that, while the rest of the hull still hides a tip turned away.
   */
  const lift = { value: 0 };
  for (const part of tip ? [tip.run, tip.dot] : []) {
    part.line.visible = false;
    part.line.renderOrder = 1;
    part.material.onBeforeCompile = (shader) => {
      shader.uniforms.uLift = lift;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "uniform float uLift;\nvoid main() {")
        .replace(
          "#include <logdepthbuf_vertex>",
          "gl_Position.z -= uLift * gl_Position.w;\n#include <logdepthbuf_vertex>",
        );
    };
    model.add(part.line);
  }
  // The dot's round caps are the material's discard: alpha to coverage smooths their edge under
  // MSAA. Not the run's: where its spans' caps overlap at a joint, partial coverage lightens it.
  if (tip) tip.dot.material.alphaToCoverage = true;
  // /crew's ticks (.crew/sprint/36/contract.md, "A tick"): the marks batch, one draw, graphite at
  // 1.4 px, each a chord 3.5 units up the near side from the lower edge, which the card bulges past
  // as it does past the tip: they take the tip's lift. Paint order is plank, edge, ticks, then the
  // tip, so the copper covers the ticks' feet on the edge and nothing covers the copper.
  if (tally && tip) {
    marks.material.onBeforeCompile = tip.run.material.onBeforeCompile;
    tip.run.line.renderOrder = 2;
    tip.dot.line.renderOrder = 2;
  }
  let pencilled: PencilMarks | null = null;
  let painted: { palette: Palette; seated: ReadonlySet<string> } | null = null;
  /**
   * Each plank's state: card where the record seats it, a greyer card where it is original, and the
   * pencil's hatch on the film where the sprint in progress is drawn, as the 2D fills it.
   */
  const fillStates = () => {
    if (!painted) return;
    const { palette, seated } = painted;
    card.uniforms.uStates.value.forEach((state, i) => {
      const id = PLANKS[i]?.id ?? "";
      const pencil = i === pencilled?.slot;
      tint.set(
        pencil
          ? palette.ground
          : i === DECK || seated.has(id)
            ? palette.card
            : palette.old,
      );
      state.set(tint.r, tint.g, tint.b, pencil ? HATCHED : 1);
    });
  };

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
  // On /crew the canvas is a detail's box and the shadow falls past it: it fades out over the last
  // SHADOW_FADE px inside each edge, so it never ends in a ruled line where the box cuts it. The
  // buffer's size and the fade, in buffer px, set by `fit`.
  const frame = { value: new Vector3(1, 1, 1) };
  if (tally) {
    shadowMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uFrame = frame;
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 uFrame;\nvoid main() {")
        .replace(
          "#include <alphamap_fragment>",
          `#include <alphamap_fragment>
          vec2 inside = min(gl_FragCoord.xy, uFrame.xy - gl_FragCoord.xy);
          diffuseColor.a *= smoothstep(0.0, uFrame.z, min(inside.x, inside.y));`,
        );
    };
  }

  // One camera for every frame, at the world's origin so the view is the identity. Its projection
  // is set per frame: orthographic at 1/D = 0, a dolly-zoom whose frustum at z = 0 is the canvas
  // after. A perspective camera at distance D would put 10^6 px of translation into float32 in the
  // first frames (D = lens / e), and the seams would fight the card for depth. An orthographic
  // camera's flag keeps the lighting's view direction straight down at the sheet.
  const camera = new OrthographicCamera();
  let [width, height] = [1, 1];
  const ray = new Raycaster();
  // Both of its faces: a pointer above the near sheer finds the far side's inside.
  const proxy = pickHull
    ? new Mesh(
        cardGeometry(pickHull),
        new MeshBasicMaterial({ side: DoubleSide }),
      )
    : null;
  if (proxy) {
    proxy.visible = false;
    model.add(proxy);
  }
  const hits: ReturnType<Raycaster["intersectObject"]> = [];

  return {
    /** Sizes the buffer in whole pixels and the scene in the canvas's CSS px. */
    fit(buffer: readonly [number, number], css: readonly [number, number]) {
      renderer.setSize(buffer[0], buffer[1], false);
      [width, height] = css;
      // LineSegments2 sets each line's resolution to the viewport before it draws, and the
      // viewport is in buffer pixels here, so the weights are too: the drawing's CSS px × ratio.
      const ratio = buffer[0] / width;
      frame.value.set(buffer[0], buffer[1], SHADOW_FADE * ratio);
      if (tip) {
        tip.run.material.linewidth = PENCIL.tip.width * ratio;
        tip.dot.material.linewidth = PENCIL.tip.dot * ratio;
      }
      seams.material.linewidth = (ghost ? GHOST_EDGE_PX : SEAM_PX) * ratio;
      outline.material.linewidth =
        (ghost ? GHOST_OUTLINE_PX : OUTLINE_PX) * ratio;
      marks.material.linewidth = MARK_PX * ratio;
      leads.material.linewidth = GHOST_EDGE_PX * ratio;
    },

    /**
     * Swaps the hull for another level's when the page crosses 768 px: the buffers change, the
     * materials and so the compiled programs stay (.crew/sprint/26/contract.md, "Which drawing").
     */
    load(next: Hull) {
      const old = [mesh.geometry, back?.geometry];
      if (back) {
        const fresh = sideGeometries(next);
        mesh.geometry = fresh.near;
        back.geometry = fresh.far;
      } else mesh.geometry = cardGeometry(next);
      for (const geometry of old) geometry?.dispose();
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
      painted = { palette, seated };
      fillStates();
      card.uniforms.uPencil.value.set(palette.pencil);
      // The edge in graphite and the tip in copper, as the 2D's: tokens, never lit.
      edges?.uGraphite.value.set(palette.muted);
      tip?.run.material.color.set(palette.copper);
      tip?.dot.material.color.set(palette.copper);
      seams.material.color.set(palette.ink);
      outline.material.color.set(palette.ink);
      marks.material.color.set(tally ? palette.muted : palette.ink);
      let gain = palette.dark ? DARK_GAIN : 1;
      if (ghost) {
        // The vellum (call 1): the colour that composites to the token over the film at α, solved
        // per sRGB channel, C = (V − (1 − α) B) / α, from the tokens the page computes.
        vellum.set(palette.vellum);
        const [v, b] = [palette.vellum, palette.ground].map((token) =>
          new Color(token).getRGB(new Color(), "srgb"),
        );
        const channel = (key: "r" | "g" | "b") =>
          Math.min(
            1,
            Math.max(
              0,
              ((v?.[key] ?? 0) - (1 - GHOST_ALPHA) * (b?.[key] ?? 0)) /
                GHOST_ALPHA,
            ),
          );
        solved.setRGB(channel("r"), channel("g"), channel("b"), "srgb");
        seams.material.color.set(palette.dark ? palette.muted : palette.pencil);
        outline.material.color.set(palette.muted);
        leads.material.color.set(palette.muted);
        gain = palette.dark ? GHOST_DARK_GAIN : GHOST_GAIN;
      }
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

    /**
     * The sprint in progress on the sheet (.crew/sprint/34/): its plank hatched on the film and its
     * edge in graphite (uniforms in the card's and the seams' own draws), and while live its copper
     * tip (two draws), as `marks` lays them on the drawing shown; null leaves the hull as the record
     * has it.
     */
    pencil(marks: PencilMarks | null) {
      pencilled = edges ? marks : null;
      const { hatch, edge } = pencilled ?? {};
      card.uniforms.uHatch.value.set(
        hatch?.scale ?? 0,
        hatch?.phase ?? 0,
        hatch?.half ?? 0,
      );
      fillStates();
      if (edge) edges?.uEdge.value.set(edge.x0, edge.x1, edge.top, edge.bottom);
      else edges?.uEdge.value.set(1e6, -1e6, -1e6, 1e6);
      for (const [part, positions] of tip
        ? ([
            [tip.run, pencilled?.tip?.run],
            [tip.dot, pencilled?.tip?.dot],
          ] as const)
        : []) {
        part.line.visible = Boolean(positions);
        if (!positions) continue;
        const old = part.line.geometry;
        part.line.geometry = lineGeometry(positions, false);
        old.dispose();
      }
    },

    /** Compiles every program, the shadow's too, before frame 1 (S6; build note 5). */
    async compile(loft: Loft) {
      project(loft, 1);
      shadow.visible = !ghost;
      await renderer.compileAsync(scene, camera);
    },

    /** Draws one frame at eased progress e. */
    draw(e: number, loft: Loft) {
      const pose = project(loft, e);
      model.position.set(pose.x, pose.y, pose.z);
      model.rotation.set(rad(pose.pitch), rad(pose.yaw), 0, "YXZ");
      model.scale.setScalar(pose.s);
      card.uniforms.uLit.value =
        Math.min(1, e * 1.25) * (ghost ? GHOST_LIT : 1);
      if (ghost) {
        // Frame 1 is the 2D fill, opaque and unlit; the vellum turns translucent with the move.
        tint.lerpColors(vellum, solved, e);
        for (const state of card.uniforms.uStates.value) {
          state.set(tint.r, tint.g, tint.b, 1);
        }
        const alpha = 1 + (GHOST_ALPHA - 1) * e;
        card.material.opacity = alpha;
        if (back) (back.material as MeshStandardMaterial).opacity = alpha;
      }
      shadowMaterial.opacity = darkness * Math.min(1, e * 1.4);
      shadow.visible = !ghost && e > 0;
      renderer.render(scene, camera);
    },

    /** The led-out numbers' leaders, as segment pairs in the model's frame; none hides them. */
    lead(positions: Float32Array) {
      leads.line.visible = positions.length > 0;
      if (!positions.length) return;
      const old = leads.line.geometry;
      leads.line.geometry = lineGeometry(positions, true);
      old.dispose();
    },

    /**
     * The ghost's ink marks, or /crew's ticks, as segment pairs in the model's frame; none hides
     * them. A tick ends square, as the 2D's stroke: its quad alone, two triangles.
     */
    mark(positions: Float32Array) {
      marks.line.visible = positions.length > 0;
      if (!positions.length) return;
      const old = marks.line.geometry;
      marks.line.geometry = lineGeometry(positions, tally);
      old.dispose();
    },

    /**
     * The plank under a point of the canvas, in CSS px from its top left, as the last frame drew
     * it: its slot and side (1 near, −1 far), or null. A ray from the camera through the point,
     * built by unprojecting it (`setFromCamera` would take the hand-set projection for
     * orthographic), against the pick hull's faces, both of them.
     */
    pick(x: number, y: number) {
      const at = (z: number) =>
        new Vector3(2 * (x / width) - 1, 1 - 2 * (y / height), z).applyMatrix4(
          camera.projectionMatrixInverse,
        );
      const near = at(-1);
      ray.ray.origin.copy(near);
      ray.ray.direction.copy(at(1).sub(near).normalize());
      hits.length = 0;
      const target = proxy ?? mesh;
      ray.intersectObject(target, false, hits);
      const hit = hits[0];
      if (!hit?.face) return null;
      const slot = target.geometry.getAttribute("slot");
      // The hull is symmetric about z = 0: the hit's side is its sign in the model's frame.
      const side = target.worldToLocal(hit.point.clone()).z < 0 ? -1 : 1;
      return { slot: Math.round(slot.getX(hit.face.a)), side };
    },

    dispose() {
      mesh.geometry.dispose();
      back?.geometry.dispose();
      (back?.material as MeshStandardMaterial | undefined)?.dispose();
      proxy?.geometry.dispose();
      (proxy?.material as MeshBasicMaterial | undefined)?.dispose();
      card.material.dispose();
      for (const part of [
        seams,
        outline,
        marks,
        leads,
        ...(tip ? [tip.run, tip.dot] : []),
      ]) {
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
    // z maps to clip depth as −z / zHi: the tip's lift is a dot's width of it (CSS px).
    lift.value = PENCIL.tip.dot / zHi;
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
