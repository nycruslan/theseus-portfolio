// The Log's yard in 3D (.crew/sprint/55/contract.md; Iris's calls, press-iris.md; Pixel's spike,
// .crew/sprint/53/spike-pixel.md): the Theseus and the ghost in one canvas, under one camera and
// one rig, and the press that moves one plank between them. `/` and /crew keep lib/model/stage.ts.
//
// Draws a frame: the Theseus's card, the ghost's far and near sides, and two fat-line batches, one
// of quads (both ships' seams, the flight's edges) and one with caps (both outlines, the leaders,
// the ink marks): 5 at rest. A press adds the flying plank and the knocking card, each a draw of
// its own plank's index range: 7 at most. Each segment of a batch carries a kind, which picks its
// hull's matrix, weight and colour from uniform arrays (spike, section 1), and the two seats it
// borders, which show it while either does: all 22 ghost seats are built, and a step's gaps are
// hidden by state, so nothing is built mid-press (contract, call 5).

import {
  BackSide,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Euler,
  FrontSide,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  Quaternion,
  Raycaster,
  Scene,
  type Side,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { PLANKS } from "@/lib/hull-layouts";
import {
  byWidth,
  DARK_GAIN,
  DARK_LIGHT,
  GHOST_ALPHA,
  GHOST_DARK_GAIN,
  GHOST_EDGE_PX,
  GHOST_GAIN,
  GHOST_LIT,
  GHOST_OUTLINE_PX,
  INSIDE_DARK,
  INSIDE_LIGHT,
  LIFT_PX,
  MARK_PX,
  OUTLINE_PX,
  PRESS_GROW,
  RISE_PX,
  ROLL,
  SEAM_PX,
  SWAY,
  THESEUS_DARK_GAIN,
  THESEUS_DARK_LIT,
  THESEUS_MARK_PX,
} from "./calls";
import {
  ALWAYS,
  DECK,
  type Hull,
  type Level,
  plankEdges,
  plankOutline,
  type Ship,
  SIDE,
  seatFrame,
} from "./hull";
import type { Loft, Pose } from "./loft";
import { type Beat, beat, type Kind, pressLength } from "./press";
import { LIGHT } from "./shadow";
import {
  cardGeometry,
  FILL,
  GROUND_LIGHT,
  type Palette,
  SKY,
  SUN,
} from "./stage";

/** The state lookup: each plank's near side at its slot, its far side at slot + SIDE, and ALWAYS. */
const STATES = ALWAYS + 1;
/** The kinds a line batch's segments take. */
const KINDS = 6;

/** A step as the hulls show it: the Theseus's seated planks, the ghost's seats, a record's seat. */
export type Step = {
  seated: ReadonlySet<string>;
  ghost: ReadonlySet<string>;
  current?: string;
};

/**
 * One press as the scene plays it, forward: its seat, the step before it (`lo`) and after it
 * (`hi`), how it moves, and the drawing it is on (its width scales Iris's lengths; below 768 px
 * the carry is shorter).
 */
export type Plan = {
  seat: string;
  lo: Step;
  hi: Step;
  kind: Kind;
  narrow: boolean;
  drawing: number;
};

/** Both ships' lofts: each registers on its own drawing, and both settle at the ghost's turn. */
export type Lofts = { theseus: Loft; ghost: Loft };

type Look = "theseus" | "ghost";

/** A card's lit mix, the gain on its lit term, and each slot's colour and alpha. */
const shipUniforms = () => ({
  uLit: { value: 0 },
  uGain: { value: 1 },
  /** The Theseus's inside face, in shadow: what a gap shows. */
  uInside: { value: new Color() },
  uStates: {
    value: Array.from({ length: STATES }, () => new Vector4(1, 1, 1, 1)),
  },
});

/**
 * A ship's card. The Theseus's is opaque and drawn from both faces, so a gap shows the far side's
 * inside face lit as card, never the sheet (Iris, section 6): the hull is closed, so the inside
 * draws nowhere else and costs no triangle. The ghost's sides, the flying plank and the knocking
 * card blend at their state's alpha. Each multiplies its lit term by its own gain, so the rig is
 * the sheet's and the Theseus looks as it does on `/` (Iris, section 2).
 */
function shipMaterial(look: Look, side: Side, uniforms = shipUniforms()) {
  const blends = look === "ghost";
  const material = new MeshStandardMaterial({
    roughness: 1,
    metalness: 0,
    side,
    // The ink lies on the card: the card steps back a hair so a line never loses the depth test.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    ...(blends ? { transparent: true, depthWrite: false } : {}),
  });
  const alpha = blends
    ? "diffuseColor.a *= vState.a;\nif (diffuseColor.a < 0.002) discard;"
    : "if (vState.a < 0.5) discard;";
  // The Theseus is closed, so its inside is in shadow: a gap shows the far side's inside face
  // unlit by the sun and the fill, darker than any plank, and never at rest (Iris, section 7).
  const inside = blends ? "" : "if (!gl_FrontFacing) outgoingLight = uInside;";
  // The two looks' shaders differ in `alpha` and `inside`: the key keeps them apart in the cache.
  material.customProgramCacheKey = () => look;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        `attribute float slot;\nuniform vec4 uStates[${STATES}];\nvarying vec4 vState;\nvoid main() {`,
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvState = uStates[int(slot + 0.5)];",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uLit;\nuniform float uGain;\nuniform vec3 uInside;\nvarying vec4 vState;\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\ndiffuseColor.rgb = vState.rgb;\n${alpha}\nvec3 flatColor = diffuseColor.rgb;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight = mix(flatColor, outgoingLight * uGain, uLit);\n${inside}\n#include <opaque_fragment>`,
      );
  };
  return { material, uniforms };
}

/**
 * One ship's buffers, uploaded once, and views of them over a run of its indices: the ghost's far
 * and near sides, and the one plank a press draws alone.
 */
function shipGeometry(ship: Ship) {
  const whole = cardGeometry(ship);
  const part = (start: number, count: number) => {
    const geometry = new BufferGeometry();
    for (const name of ["position", "normal", "slot"]) {
      geometry.setAttribute(name, whole.getAttribute(name));
    }
    geometry.setIndex(whole.getIndex());
    geometry.setDrawRange(start, count);
    return geometry;
  };
  return { whole, part };
}

/** Each mesh's buffers at a level: the Theseus whole, the ghost's sides, the press's planks. */
function geometries({ theseus, ghost }: { theseus: Ship; ghost: Ship }) {
  const [t, g] = [shipGeometry(theseus), shipGeometry(ghost)];
  return {
    hull: t.whole,
    into: t.part(0, 0),
    back: g.part(0, ghost.far),
    front: g.part(ghost.far, ghost.index.length - ghost.far),
    flier: g.part(0, 0),
  };
}

/**
 * A fat-line batch of segments of many kinds. LineMaterial's one weight and colour become arrays
 * indexed by each segment's kind, its points go through its kind's matrix (so the batch lies at the
 * scene's root), and a segment whose seats are both hidden is put outside the clip volume.
 */
function shipLines() {
  const uniforms = {
    uMats: { value: Array.from({ length: KINDS }, () => new Matrix4()) },
    uWidths: { value: Array.from({ length: KINDS }, () => 1) },
    uColors: { value: Array.from({ length: KINDS }, () => new Color()) },
    uShown: { value: Array.from({ length: STATES }, () => 1) },
    uGround: { value: new Color() },
  };
  const material = new LineMaterial();
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "uniform float linewidth;",
        `uniform float linewidth;\nuniform mat4 uMats[${KINDS}];\nuniform float uWidths[${KINDS}];\nuniform float uShown[${STATES}];\nattribute float instanceKind;\nattribute vec2 instanceSeats;\nvarying float vKind;\nvarying float vShown;`,
      )
      .replace(
        "void main() {",
        "void main() {\nint kind = int(instanceKind + 0.5);\nvKind = instanceKind;\nvShown = max(uShown[int(instanceSeats.x + 0.5)], uShown[int(instanceSeats.y + 0.5)]);",
      )
      .replace(
        "vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );",
        "vec4 start = modelViewMatrix * (uMats[kind] * vec4( instanceStart, 1.0 ));",
      )
      .replace(
        "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
        "vec4 end = modelViewMatrix * (uMats[kind] * vec4( instanceEnd, 1.0 ));",
      )
      .replace("offset *= linewidth;", "offset *= uWidths[kind];")
      .replace(
        "gl_Position = clip;",
        "gl_Position = vShown > 0.0 && uWidths[kind] > 0.0 ? clip : vec4(0.0, 0.0, 2.0, 1.0);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "uniform vec3 diffuse;",
        `uniform vec3 uColors[${KINDS}];\nuniform vec3 uGround;\nvarying float vKind;\nvarying float vShown;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, alpha );",
        "vec4 diffuseColor = vec4( mix( uGround, uColors[int(vKind + 0.5)], vShown ), alpha );",
      );
  };
  const line = new LineSegments2(new LineSegmentsGeometry(), material);
  line.frustumCulled = false;
  return { line, material, uniforms };
}

/** Segments of one kind for a batch, with the seats each borders (ALWAYS if none). */
type Run = {
  positions: Float32Array;
  kind: number;
  tags?: Float32Array | null;
};

/** A batch's buffers: quads only (seams) or with round caps (the outline turns corners). */
function batchGeometry(runs: readonly Run[], quads: boolean) {
  const count = runs.reduce((n, run) => n + run.positions.length / 6, 0);
  const positions = new Float32Array(count * 6);
  const kinds = new Float32Array(count);
  const seats = new Float32Array(count * 2).fill(ALWAYS);
  let at = 0;
  for (const { positions: part, kind, tags } of runs) {
    const n = part.length / 6;
    positions.set(part, at * 6);
    kinds.fill(kind, at, at + n);
    if (tags) seats.set(tags, at * 2);
    at += n;
  }
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  geometry.setAttribute("instanceKind", new InstancedBufferAttribute(kinds, 1));
  geometry.setAttribute(
    "instanceSeats",
    new InstancedBufferAttribute(seats, 2),
  );
  // S2's quads: a smooth polyline's segment is its middle quad, two triangles, without caps.
  if (quads) geometry.setIndex([2, 4, 3, 4, 5, 3]);
  return geometry;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const slotOf = (seat: string) => PLANKS.findIndex((plank) => plank.id === seat);

/** The flight's fixed geometry, solved once at a press's start from the settled hulls. */
type Path = {
  plan: Plan;
  slot: number;
  /** The seat's middle in the model's frame and in the world, on each ship. */
  centre: Vector3;
  from: Vector3;
  to: Vector3;
  /** The cubic carry, its first point the lift's top. */
  bezier: [Vector3, Vector3, Vector3, Vector3];
  /** The carry's sway toward the bow at its middle, world px along x, on a sin envelope. */
  sway: number;
  /** The outward normal in the world and in the model's frame; the lift's length L, world px. */
  normal: Vector3;
  local: Vector3;
  lift: number;
  /** Each ship's turn and scale; the roll's axis and sign. */
  turns: [Quaternion, Quaternion];
  scales: [number, number];
  /** Each ship's shear (`place`): the flight goes from the Theseus's to the ghost's. */
  shears: [[number, number], [number, number]];
  axis: Vector3;
  roll: number;
  /** The seat's edges in the model's frame: the ghost's own seams around it. */
  edges: Float32Array;
  /** Its outline on the near side in the model's frame, for the numbers it hides. */
  shape: Vector3[];
};

export type Ships = ReturnType<typeof createShips>;

/**
 * The yard on `canvas`, at the level `ships` were built at, with `pickHull` (never drawn) to pick
 * the ghost's planks against.
 */
export function createShips(
  canvas: HTMLCanvasElement,
  ships: { theseus: Ship; ghost: Ship; level: Level },
  pickHull: Hull,
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  // Buffer pixels are set exactly by `fit`, never as css × ratio, which three floors.
  renderer.setPixelRatio(1);
  const scene = new Scene();
  const theseus = new Group();
  const ghost = new Group();
  scene.add(theseus, ghost);
  let built = ships;

  const card = shipMaterial("theseus", DoubleSide);
  // The ghost's two sides share one lookup, far drawn before near (renderOrder sorts the pass).
  const near = shipMaterial("ghost", FrontSide);
  const far = shipMaterial("ghost", BackSide, near.uniforms);
  // The press's two planks: the leaving one and the knocking one, each its own draw, in front.
  const fly = shipMaterial("ghost", FrontSide);
  const knock = shipMaterial("ghost", FrontSide);
  const laid = geometries(ships);
  const hull = new Mesh(laid.hull, card.material);
  const back = new Mesh(laid.back, far.material);
  const front = new Mesh(laid.front, near.material);
  const flier = new Mesh(laid.flier, fly.material);
  const into = new Mesh(laid.into, knock.material);
  const meshes = { hull, into, back, front, flier };
  for (const mesh of Object.values(meshes)) mesh.frustumCulled = false;
  back.renderOrder = 1;
  front.renderOrder = 2;
  flier.renderOrder = 3;
  into.renderOrder = 3;
  flier.matrixAutoUpdate = false;
  into.matrixAutoUpdate = false;
  flier.visible = false;
  into.visible = false;
  theseus.add(hull, into);
  ghost.add(back, front);
  scene.add(flier);
  /** Each side's range by slot, for the plank a press draws alone. */
  const ghostRange = (slot: number) =>
    built.ghost.ranges.get(slot) ?? ([0, 0] as const);
  const theseusRange = (slot: number) =>
    built.theseus.ranges.get(slot) ?? ([0, 0] as const);

  // The lines: quads (0 the Theseus's seams, 1 the ghost's, 2 the leaving plank's edges, 3 the
  // knocking card's) and capped (0 and 1 the outlines, 2 the Theseus's mark, 3 the ghost's marks,
  // 4 and 5 the leaders), the capped batch drawn after, so at an equal depth a mark wins.
  const seams = shipLines();
  const caps = shipLines();
  caps.line.renderOrder = 1;
  scene.add(seams.line, caps.line);
  /** Each kind's weight in CSS px; `fit` puts them in buffer px. */
  const seamPx = [SEAM_PX, GHOST_EDGE_PX, SEAM_PX, SEAM_PX];
  const capPx = [
    OUTLINE_PX,
    GHOST_OUTLINE_PX,
    THESEUS_MARK_PX,
    MARK_PX,
    GHOST_EDGE_PX,
    GHOST_EDGE_PX,
  ];
  let ratio = 1;
  let leaders: { theseus: Float32Array; ghost: Float32Array } = {
    theseus: new Float32Array(0),
    ghost: new Float32Array(0),
  };
  /** The ink marks: a record's seat on both ships, and the ghost's plank under the pointer. */
  let marked: { current?: string; hover?: { seat: string; side: number } } = {};
  const edgeCache = new Map<string, Float32Array>();
  const edgesOf = (seat: string, side: number) => {
    const key = `${built.level.stations}:${seat}:${side}`;
    const found = edgeCache.get(key) ?? plankEdges(built.level, seat, side);
    edgeCache.set(key, found);
    return found;
  };
  /** The quads batch, with a press's two planks' edges while one is on. */
  const reseam = (edges?: Float32Array) => {
    const old = seams.line.geometry;
    seams.line.geometry = batchGeometry(
      [
        { positions: built.theseus.seams, kind: 0 },
        { positions: built.ghost.seams, kind: 1, tags: built.ghost.tags },
        ...(edges
          ? [
              { positions: edges, kind: 2 },
              { positions: edges, kind: 3 },
            ]
          : []),
      ],
      true,
    );
    old.dispose();
  };
  /** The capped batch: the outlines, then the leaders, then the marks over them. */
  const recap = () => {
    const { current, hover } = marked;
    const ghostMarks = [
      current ? edgesOf(current, 1) : null,
      hover && hover.seat !== current ? edgesOf(hover.seat, hover.side) : null,
    ].filter((part): part is Float32Array => Boolean(part));
    const old = caps.line.geometry;
    caps.line.geometry = batchGeometry(
      [
        { positions: built.theseus.outline, kind: 0 },
        { positions: built.ghost.outline, kind: 1 },
        { positions: leaders.theseus, kind: 4 },
        { positions: leaders.ghost, kind: 5 },
        ...(current ? [{ positions: edgesOf(current, 1), kind: 2 }] : []),
        ...ghostMarks.map((positions) => ({ positions, kind: 3 })),
      ],
      false,
    );
    old.dispose();
  };
  reseam();
  recap();

  // The rig at the sheet's values (Iris, section 2): the ghost's gain is its material's.
  const sky = new HemisphereLight(0xffffff, GROUND_LIGHT, SKY);
  const fill = new DirectionalLight(0xffffff, FILL);
  fill.position.set(0, 0, 1);
  const sun = new DirectionalLight(0xffffff, SUN);
  sun.position.set(...LIGHT);
  scene.add(sky, fill, sun);

  // The tokens, as the page computes them: the ghost's vellum and the colour that composites to it.
  const tokens = {
    card: new Color(),
    old: new Color(),
    ink: new Color(),
    seam: new Color(),
    muted: new Color(),
    vellum: new Color(),
    solved: new Color(),
    ghostGain: GHOST_GAIN,
    /** The Theseus's lit mix and gain: `/`'s in light, its numbers' in dark (THESEUS_DARK_GAIN). */
    theseusLit: 1,
    theseusGain: 1,
  };
  const tint = new Color();
  const mixed = new Color();

  // One camera for every frame at the world's origin, its projection set per frame as the sheet's
  // (lib/model/stage.ts): the canvas at z = 0 at every 1/D.
  const camera = new OrthographicCamera();
  let [width, height] = [1, 1];
  let invD = 0;

  /** What the hulls show at rest, and the press in progress with its beat. */
  let step: Step = { seated: new Set(), ghost: new Set() };
  let path: Path | null = null;
  let now: Beat | null = null;
  /** The press's frame is the step before or after it at rest: 0 or its length. */
  let rest: "lo" | "hi" | null = null;

  /** Each state at rest for `at`: the Theseus's fills, the ghost's seats, the lines' seats. */
  const states = (at: Step) => {
    card.uniforms.uStates.value.forEach((state, i) => {
      const slot = i >= SIDE ? i - SIDE : i;
      const id = PLANKS[slot]?.id ?? "";
      const shown = slot < PLANKS.length || slot === DECK;
      const colour =
        slot === DECK || at.seated.has(id) ? tokens.card : tokens.old;
      state.set(colour.r, colour.g, colour.b, shown ? 1 : 0);
    });
    const shown = seams.uniforms.uShown.value;
    for (let i = 0; i < STATES; i++) {
      const slot = i >= SIDE ? i - SIDE : i;
      const id = PLANKS[slot]?.id;
      shown[i] = i === ALWAYS ? 1 : id && at.ghost.has(id) ? 1 : 0;
    }
    caps.uniforms.uShown.value.fill(1);
  };

  /** The ghost's fills at the move's progress e: frame 1 is the 2D's flat vellum, then vellum. */
  const ghostStates = (e: number) => {
    tint.lerpColors(tokens.vellum, tokens.solved, e);
    const shown = seams.uniforms.uShown.value;
    for (const [i, state] of near.uniforms.uStates.value.entries()) {
      state.set(tint.r, tint.g, tint.b, shown[i] ?? 0);
    }
  };

  /**
   * Each ship's pose without its shear, and the shear: the camera looks from the canvas's centre,
   * but each ship is seen from its own drawing's (makeLoft's centre), as the ghost was on a canvas
   * of its own, so the twins match (Iris, section 0). That view is the one camera's with the ship's
   * points moved by x += a z and y += b z, an affine shear that is 0 at frame 1.
   */
  const bare = { theseus: new Matrix4(), ghost: new Matrix4() };
  const shears = {
    theseus: [0, 0] as [number, number],
    ghost: [0, 0] as [number, number],
  };
  const shear = new Matrix4();
  const euler = new Euler();
  const place = (group: Group, pose: Pose, loft: Loft, ship: Look) => {
    const [cx, cy] = loft.centre;
    const [a, b] = [-(cx - width / 2) * invD, (cy - height / 2) * invD];
    shears[ship] = [a, b];
    bare[ship].compose(
      work.c.set(pose.x, pose.y, pose.z),
      work.q.setFromEuler(euler.set(rad(pose.pitch), rad(pose.yaw), 0, "YXZ")),
      work.scale.setScalar(pose.s),
    );
    shear.set(1, 0, a, 0, 0, 1, b, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    group.matrixAutoUpdate = false;
    group.matrix.multiplyMatrices(shear, bare[ship]);
    group.updateMatrixWorld(true);
  };

  /** A point moved by a shear, in place. */
  const sheared = (p: Vector3, [a, b]: readonly [number, number]) =>
    p.set(p.x + a * p.z, p.y + b * p.z, p.z);

  /** Sets the camera for eased progress e, as the sheet's (lib/model/stage.ts, `project`). */
  const project = (loft: Loft, e: number) => {
    const { invD: d } = loft.at(e);
    invD = d;
    const zHi = 0.9 * loft.lens;
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
      zHi * d,
      0,
      0,
      -d,
      1,
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  };

  /** A world point on the canvas, in CSS px from its top left, at the camera's 1/D now. */
  const screen = (p: Vector3) => {
    const k = 1 / (1 - p.z * invD);
    return [
      width / 2 + (p.x - width / 2) * k,
      height / 2 - (p.y + height / 2) * k,
    ];
  };

  /** Copies each ship's matrix into the kinds that ride it. */
  const ride = () => {
    const [s, c] = [seams.uniforms.uMats.value, caps.uniforms.uMats.value];
    s[0]?.copy(theseus.matrixWorld);
    s[1]?.copy(ghost.matrixWorld);
    for (const i of [0, 2, 4]) c[i]?.copy(theseus.matrixWorld);
    for (const i of [1, 3, 5]) c[i]?.copy(ghost.matrixWorld);
  };

  const weights = () => {
    seamPx.forEach((px, i) => {
      seams.uniforms.uWidths.value[i] = px * ratio;
    });
    capPx.forEach((px, i) => {
      caps.uniforms.uWidths.value[i] = px * ratio;
    });
  };

  // The flight's working values, kept to spare the frame loop its garbage.
  const work = {
    c: new Vector3(),
    q: new Quaternion(),
    roll: new Quaternion(),
    m: new Matrix4(),
    shift: new Matrix4(),
    back: new Matrix4(),
    scale: new Vector3(),
    a: new Vector3(),
  };

  /** The cubic carry at s. */
  const bezier = (
    [p0, p1, p2, p3]: Path["bezier"],
    s: number,
    out: Vector3,
  ) => {
    const r = 1 - s;
    return out
      .copy(p0)
      .multiplyScalar(r * r * r)
      .addScaledVector(p1, 3 * r * r * s)
      .addScaledVector(p2, 3 * r * s * s)
      .addScaledVector(p3, s * s * s);
  };

  /** The leaving plank's world matrix at a beat: on its lift, on the carry, rolled. */
  const flierMatrix = (at: Path, flight: NonNullable<Beat["flier"]>) => {
    const { c, q, roll, m, shift, back: undo, scale } = work;
    if (at.plan.kind === "carry") {
      bezier(at.bezier, flight.carry, c).addScaledVector(
        at.normal,
        -at.lift * (1 - flight.lift),
      );
      c.x += at.sway * Math.sin(Math.PI * flight.carry);
      q.slerpQuaternions(at.turns[0], at.turns[1], flight.carry);
      roll.setFromAxisAngle(at.axis, rad(ROLL) * at.roll * flight.roll);
      q.premultiply(roll);
    } else {
      c.copy(at.from).addScaledVector(at.normal, at.lift * flight.lift);
      q.copy(at.turns[0]);
    }
    const s = at.scales[0] + (at.scales[1] - at.scales[0]) * flight.carry;
    m.compose(c, q, scale.setScalar(s));
    undo.makeTranslation(-at.centre.x, -at.centre.y, -at.centre.z);
    // Seen from the Theseus's line of sight at lift-off and the ghost's at touchdown.
    const [a, b] = shearAt(at, flight.carry);
    shear.set(1, 0, a, 0, 0, 1, b, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    return shift.multiplyMatrices(m, undo).premultiply(shear);
  };

  /** The flight's shear at carry s, between the two ships'. */
  const shearAt = (at: Path, s: number): [number, number] => {
    const [[a0, b0], [a1, b1]] = at.shears;
    return [a0 + (a1 - a0) * s, b0 + (b1 - b0) * s];
  };

  /** Solves the flight once the hulls are settled (Iris, section 4, "Arc"). */
  const solve = (plan: Plan): Path => {
    const slot = slotOf(plan.seat);
    const frame = seatFrame(plan.seat);
    const centre = new Vector3(...frame.centre);
    const local = new Vector3(...frame.normal);
    const [pT, pG] = [new Vector3(), new Vector3()];
    const [qT, qG] = [new Quaternion(), new Quaternion()];
    const [sT, sG] = [new Vector3(), new Vector3()];
    // The path runs in the ships' world before their shears: the flight shears itself.
    bare.theseus.decompose(pT, qT, sT);
    bare.ghost.decompose(pG, qG, sG);
    const from = centre.clone().applyMatrix4(bare.theseus);
    const to = centre.clone().applyMatrix4(bare.ghost);
    const normal = local.clone().applyQuaternion(qT).normalize();
    const lift = byWidth(LIFT_PX, plan.drawing);
    const top = from.clone().addScaledVector(normal, lift);
    const axis = new Vector3(1, 0, 0).applyQuaternion(qT).normalize();
    // The roll turns the outer face up to the light: the sign that raises the normal.
    const roll = new Vector3().crossVectors(axis, normal).y >= 0 ? 1 : -1;
    const edges = ghostEdges(slot);
    const at: Path = {
      plan,
      slot,
      centre,
      from,
      to,
      bezier: [
        top,
        top.clone(),
        to.clone().addScaledVector(normal, lift),
        to.clone(),
      ],
      sway: 0,
      normal,
      local,
      lift,
      turns: [qT, qG],
      scales: [sT.x, sG.x],
      shears: [[...shears.theseus], [...shears.ghost]],
      axis,
      roll,
      edges,
      shape: plankOutline(built.level, plan.seat).map(
        (point) => new Vector3(...point),
      ),
    };
    if (plan.kind !== "carry") return at;
    // The carry's shape on screen (Iris, sections 4 and 7): it bows toward the camera, growing to
    // at most PRESS_GROW × its seated length; it sways toward the bow by SWAY × the drawing's width; it
    // rises at most RISE over the lift point. Each is solved in turn, by bisection on its largest
    // that keeps the plank inside the canvas, its top under the Theseus's box's.
    const corners: Vector3[] = [];
    for (let i = 0; i + 2 < edges.length; i += 6) {
      corners.push(new Vector3(edges[i], edges[i + 1], edges[i + 2]));
    }
    const p = new Vector3();
    /** The plank's screen extent at carry s; s < 0 is its seat on the Theseus, unlifted. */
    const extent = (s: number) => {
      const m = flierMatrix(at, {
        lift: s < 0 ? 0 : 1,
        carry: Math.max(0, s),
        roll: s < 0 ? 0 : Math.sin(Math.PI * s),
        morph: 0,
        alpha: 1,
      });
      let [l, r, t] = [Infinity, -Infinity, Infinity];
      for (const corner of corners) {
        const [x = 0, y = 0] = screen(p.copy(corner).applyMatrix4(m));
        [l, r, t] = [Math.min(l, x), Math.max(r, x), Math.min(t, y)];
      }
      return { l, r, t };
    };
    // The plank's seated length on each ship: its growth is measured against their blend.
    const [start, end] = [extent(-1), extent(1)];
    const seated = (s: number) =>
      start.r - start.l + (end.r - end.l - (start.r - start.l)) * s;
    const y0 = screen(sheared(top.clone(), at.shears[0]))[1] ?? 0;
    const rise = byWidth(RISE_PX, plan.drawing);
    /** Whether the carry, as it stands, keeps every bound. */
    const fits = () => {
      for (let i = 0; i <= 24; i++) {
        const s = i / 24;
        const { l, r, t } = extent(s);
        const [, y = 0] = screen(
          sheared(bezier(at.bezier, s, p), shearAt(at, s)),
        );
        if (
          r - l > PRESS_GROW * seated(s) ||
          l < 1 ||
          r > width - 1 ||
          t < 1 ||
          y0 - y > rise
        ) {
          return false;
        }
      }
      return true;
    };
    /** The largest of a shape's settings up to `most` that fits, set by `apply`. */
    const largest = (most: number, apply: (v: number) => void) => {
      let [lo, hi] = [0, most];
      apply(0);
      if (!fits()) hi = 0;
      for (let i = 0; i < 14 && hi > 0; i++) {
        const mid = (lo + hi) / 2;
        apply(mid);
        if (fits()) lo = mid;
        else hi = mid;
      }
      apply(lo);
    };
    const [b1, b2] = [at.bezier[1], at.bezier[2]];
    const bowed = (z: number) => {
      b1.z = top.z + z;
      b2.z = to.z + normal.z * lift + z;
    };
    // The sway first, bounded by the canvas alone: SWAY of the drawing on screen at mid-carry,
    // where the plank's depth scales it by 1 / (1 − z / D) and the bow by about PRESS_GROW. Solved
    // after the bow, which spends the growth to its last hundredth of a pixel, the sway found none
    // left: moving a plank whose ends stand at different depths changes its length on screen.
    const middle = () => {
      const { l, r } = extent(0.5);
      return (l + r) / 2;
    };
    const straight = middle();
    at.sway = 1;
    const perPx = middle() - straight;
    at.sway = 0;
    largest(perPx > 0 ? (SWAY * plan.drawing) / perPx / PRESS_GROW : 0, (v) => {
      at.sway = v;
    });
    // The bow: a plank lifted z toward the camera grows by 1 / (1 − z / D).
    largest(invD > 0 ? 0.25 / invD : 0, bowed);
    largest(4 * rise, (v) => {
      b1.y = top.y + v;
    });
    return at;
  };

  /** The ghost's own seams around a seat's near side: its plank's edges, as the ghost draws them. */
  function ghostEdges(slot: number) {
    const { seams: all, tags } = built.ghost;
    const out: number[] = [];
    for (let i = 0; tags && i < tags.length / 2; i++) {
      if (tags[2 * i] === slot || tags[2 * i + 1] === slot) {
        for (let j = 0; j < 6; j++) out.push(all[6 * i + j] ?? 0);
      }
    }
    return new Float32Array(out);
  }

  /**
   * The frame of the press at its beat, over the step before it: the seat's two sides, the ghost's
   * twin, the two planks the press draws alone, and their edges.
   */
  const pressFrame = (at: Path, b: Beat) => {
    const { plan, slot } = at;
    const cards = card.uniforms.uStates.value;
    const shown = seams.uniforms.uShown.value;
    const [nearT, farT] = [cards[slot], cards[slot + SIDE]];
    const ink = seams.uniforms.uColors.value;
    const widths = seams.uniforms.uWidths.value;
    const lo = plan.lo.seated.has(plan.seat) ? tokens.card : tokens.old;
    const hi = plan.hi.seated.has(plan.seat) ? tokens.card : tokens.old;
    if (plan.kind === "fade") {
      // Calm: the seat cross-fades in place, the ghost's twin planks and seams fade in.
      mixed.lerpColors(lo, hi, b.fade);
      nearT?.set(mixed.r, mixed.g, mixed.b, 1);
      farT?.set(mixed.r, mixed.g, mixed.b, 1);
      const a = plan.lo.ghost.has(plan.seat) ? 1 : 0;
      const z = plan.hi.ghost.has(plan.seat) ? 1 : 0;
      shown[slot] = a + (z - a) * b.fade;
      shown[slot + SIDE] = shown[slot] ?? 0;
      ghostStates(1);
      return;
    }
    // The gap: the flight and the knock draw the seat's near side.
    nearT?.setW(0);
    if (plan.kind === "carry") {
      shown[slot] = b.down ? 1 : 0;
      shown[slot + SIDE] = b.far;
    }
    ghostStates(1);
    const flight = b.flier;
    flier.visible = Boolean(flight);
    widths[2] = 0;
    if (flight) {
      flier.matrix.copy(flierMatrix(at, flight));
      flier.matrixWorldNeedsUpdate = true;
      // The look: the Theseus's own original under its own light, morphing to vellum.
      const m = flight.morph;
      mixed.lerpColors(lo, tokens.solved, m);
      fly.uniforms.uStates.value[slot]?.set(mixed.r, mixed.g, mixed.b, 1);
      fly.material.opacity = (1 + (GHOST_ALPHA - 1) * m) * flight.alpha;
      fly.uniforms.uLit.value =
        tokens.theseusLit + (GHOST_LIT - tokens.theseusLit) * m;
      fly.uniforms.uGain.value =
        tokens.theseusGain + (tokens.ghostGain - tokens.theseusGain) * m;
      seams.uniforms.uMats.value[2]?.copy(flier.matrix);
      ink[2]?.lerpColors(tokens.ink, tokens.seam, m);
      widths[2] =
        flight.alpha >= 0.5
          ? (SEAM_PX + (GHOST_EDGE_PX - SEAM_PX) * m) * ratio
          : 0;
    }
    const knocking = b.card;
    into.visible = Boolean(knocking);
    widths[3] = 0;
    if (knocking) {
      const d = (at.lift / (at.scales[0] || 1)) * knocking.proud;
      into.matrix.makeTranslation(
        at.local.x * d,
        at.local.y * d,
        at.local.z * d,
      );
      into.matrixWorldNeedsUpdate = true;
      knock.uniforms.uStates.value[slot]?.set(hi.r, hi.g, hi.b, 1);
      knock.material.opacity = knocking.alpha;
      knock.uniforms.uLit.value = tokens.theseusLit;
      knock.uniforms.uGain.value = tokens.theseusGain;
      into.updateMatrixWorld();
      seams.uniforms.uMats.value[3]?.copy(into.matrixWorld);
      widths[3] = knocking.alpha >= 0.5 ? SEAM_PX * ratio : 0;
    }
  };

  const hits: ReturnType<Raycaster["intersectObject"]> = [];
  const ray = new Raycaster();
  const proxy = new Mesh(
    cardGeometry(pickHull),
    new MeshBasicMaterial({ side: DoubleSide }),
  );
  proxy.visible = false;
  ghost.add(proxy);

  return {
    /** Sizes the buffer in whole pixels and the scene in the canvas's CSS px. */
    fit(buffer: readonly [number, number], css: readonly [number, number]) {
      renderer.setSize(buffer[0], buffer[1], false);
      [width, height] = css;
      ratio = buffer[0] / width;
      weights();
    },

    /** The other level's ships, when the page crosses 768 px; the programs stay. */
    load(next: typeof ships) {
      built = next;
      const fresh = geometries(next);
      for (const key of Object.keys(meshes) as (keyof typeof meshes)[]) {
        const old = meshes[key].geometry;
        meshes[key].geometry = fresh[key];
        old.dispose();
      }
      reseam();
      recap();
    },

    /** The tokens: each ship's colours, the rig, and the ghost's gain on its own lit term. */
    paint(palette: Palette) {
      tokens.card.set(palette.card);
      tokens.old.set(palette.old);
      tokens.ink.set(palette.ink);
      tokens.muted.set(palette.muted);
      tokens.seam.set(palette.dark ? palette.muted : palette.pencil);
      tokens.vellum.set(palette.vellum);
      // The vellum (sprint 33's call 1): the colour that composites to the token over the film at
      // α, solved per sRGB channel, C = (V − (1 − α) B) / α.
      const [v, g] = [palette.vellum, palette.ground].map((token) =>
        new Color(token).getRGB(new Color(), "srgb"),
      );
      const channel = (key: "r" | "g" | "b") =>
        Math.min(
          1,
          Math.max(
            0,
            ((v?.[key] ?? 0) - (1 - GHOST_ALPHA) * (g?.[key] ?? 0)) /
              GHOST_ALPHA,
          ),
        );
      tokens.solved.setRGB(channel("r"), channel("g"), channel("b"), "srgb");
      tokens.ghostGain = palette.dark
        ? GHOST_DARK_GAIN / DARK_GAIN
        : GHOST_GAIN;
      near.uniforms.uGain.value = tokens.ghostGain;
      // The Log's Theseus carries numbers, so in dark its lamp is set by them, not by `/`'s look.
      tokens.theseusLit = palette.dark ? THESEUS_DARK_LIT : 1;
      tokens.theseusGain = palette.dark ? THESEUS_DARK_GAIN / DARK_GAIN : 1;
      card.uniforms.uGain.value = tokens.theseusGain;
      const s = seams.uniforms.uColors.value;
      const c = caps.uniforms.uColors.value;
      s[0]?.copy(tokens.ink);
      s[1]?.copy(tokens.seam);
      s[3]?.copy(tokens.ink);
      c[0]?.copy(tokens.ink);
      c[1]?.copy(tokens.muted);
      c[2]?.copy(tokens.ink);
      c[3]?.copy(tokens.ink);
      c[4]?.copy(tokens.muted);
      c[5]?.copy(tokens.muted);
      seams.uniforms.uGround.value.set(palette.ground);
      caps.uniforms.uGround.value.set(palette.ground);
      const gain = palette.dark ? DARK_GAIN : 1;
      for (const light of [sky, fill, sun]) {
        light.color.set(palette.dark ? DARK_LIGHT : 0xffffff);
      }
      sky.intensity = SKY * gain;
      sky.groundColor.set(palette.dark ? palette.ground : GROUND_LIGHT);
      fill.intensity = FILL * gain;
      sun.intensity = SUN * gain;
      const inside = card.uniforms.uInside.value;
      if (palette.dark) {
        inside.set(palette.ground).lerp(tokens.old, INSIDE_DARK);
      } else inside.set(INSIDE_LIGHT);
      states(step);
    },

    /**
     * The step the hulls show at rest, and its record's mark on both ships, unless `mark` is false:
     * a riffle's paced step lands without it, which comes back at the stop (Iris, riffle-iris.md,
     * section 2, "Marks and copper").
     */
    show(next: Step, mark = true) {
      step = next;
      states(next);
      marked = { ...marked, current: mark ? next.current : undefined };
      recap();
    },

    /** The ghost's plank under the pointer, inked; null for none. */
    hover(target: { seat: string; side: number } | null) {
      marked = { ...marked, hover: target ?? undefined };
      recap();
    },

    /** The led-out numbers' leaders on each ship, as segment pairs in its model's frame. */
    lead(next: { theseus: Float32Array; ghost: Float32Array }) {
      leaders = next;
      recap();
    },

    /**
     * A press starts, over the settled hulls: its flight is solved, its seat's planks are given
     * their draws, the marks and the hover leave both ships (Iris, section 6). Null ends it.
     */
    press(plan: Plan | null, lofts?: Lofts) {
      if (!plan || !lofts) {
        path = null;
        now = null;
        rest = null;
        flier.visible = false;
        into.visible = false;
        reseam();
        return;
      }
      // The flight is solved on the settled hulls, under the settled camera.
      project(lofts.ghost, 1);
      place(theseus, lofts.theseus.at(1).pose, lofts.theseus, "theseus");
      place(ghost, lofts.ghost.at(1).pose, lofts.ghost, "ghost");
      path = solve(plan);
      rest = null;
      now = null;
      const slot = path.slot;
      flier.geometry.setDrawRange(...ghostRange(slot));
      into.geometry.setDrawRange(...theseusRange(slot));
      marked = {};
      recap();
      reseam(path.edges);
    },

    /**
     * The press `ms` into it played forward. Landed (`landed`, at 0 or its length), the hulls are
     * that step at rest, as a cold load of it draws them: its marks land, the press's edges go. A
     * frame in flight is never at rest, its first at 0 included, so the marks that left at the
     * press's start stay gone on it (Iris's could, review-iris.md). A riffle's paced step lands
     * with no mark (`mark` false).
     */
    beat(ms: number, landed = false, mark = true) {
      if (!path) return;
      const length = pressLength(path.plan.kind, path.plan.narrow);
      const was = rest;
      rest = landed ? (ms <= 0 ? "lo" : "hi") : null;
      now = rest
        ? null
        : beat(path.plan.kind, path.plan.narrow, Math.min(length, ms));
      if (rest === was) return;
      marked = rest && mark ? { current: path.plan[rest].current } : {};
      recap();
      reseam(rest ? undefined : path.edges);
    },

    /** The press's own length in ms, for the plan. */
    length: (plan: Plan) => pressLength(plan.kind, plan.narrow),

    /**
     * The leaving plank's middle on screen against its seat's, in CSS px, so its number can ride it
     * and fade with it; null when the flight doesn't draw it.
     */
    flown() {
      const flight = now?.flier;
      if (!path || !flight) return null;
      const [x0 = 0, y0 = 0] = screen(
        sheared(work.a.copy(path.from), path.shears[0]),
      );
      const at = work.a
        .copy(path.centre)
        .applyMatrix4(flierMatrix(path, flight));
      const [x1 = 0, y1 = 0] = screen(at);
      return { dx: x1 - x0, dy: y1 - y0, alpha: flight.alpha };
    },

    /**
     * The leaving plank's outline on screen at the beat, in CSS px from the canvas's top left, or
     * null when the flight doesn't draw it: what it hides of the numbers under it.
     */
    over() {
      const flight = now?.flier;
      if (!path || !flight) return null;
      const m = flierMatrix(path, flight);
      return path.shape.map(
        (point) =>
          screen(work.a.copy(point).applyMatrix4(m)) as [number, number],
      );
    },

    /** Compiles every program before frame 1, the press's planks' too. */
    async compile(lofts: Lofts) {
      project(lofts.ghost, 1);
      flier.visible = true;
      into.visible = true;
      await renderer.compileAsync(scene, camera);
      flier.visible = false;
      into.visible = false;
    },

    /** Draws one frame at eased progress e of the open move; a press draws at e = 1. */
    draw(e: number, lofts: Lofts) {
      project(lofts.ghost, e);
      place(theseus, lofts.theseus.at(e).pose, lofts.theseus, "theseus");
      place(ghost, lofts.ghost.at(e).pose, lofts.ghost, "ghost");
      const lit = Math.min(1, e * 1.25);
      card.uniforms.uLit.value = lit * tokens.theseusLit;
      near.uniforms.uLit.value = lit * GHOST_LIT;
      const alpha = 1 + (GHOST_ALPHA - 1) * e;
      near.material.opacity = alpha;
      far.material.opacity = alpha;
      ride();
      weights();
      if (path && rest) {
        states(rest === "lo" ? path.plan.lo : path.plan.hi);
        flier.visible = false;
        into.visible = false;
        ghostStates(e);
      } else if (path && now) {
        states(path.plan.lo);
        pressFrame(path, now);
      } else {
        states(step);
        ghostStates(e);
      }
      renderer.render(scene, camera);
    },

    /**
     * The ghost's plank under a point of the canvas, in CSS px from its top left, as the last frame
     * drew it: its slot and side (1 near, −1 far), the first hit whose seat `has` says is shown.
     */
    pick(x: number, y: number, has: (slot: number) => boolean) {
      const at = (z: number) =>
        new Vector3(2 * (x / width) - 1, 1 - 2 * (y / height), z).applyMatrix4(
          camera.projectionMatrixInverse,
        );
      const start = at(-1);
      ray.ray.origin.copy(start);
      ray.ray.direction.copy(at(1).sub(start).normalize());
      hits.length = 0;
      ray.intersectObject(proxy, false, hits);
      const slots = proxy.geometry.getAttribute("slot");
      for (const hit of hits) {
        if (!hit.face) continue;
        const slot = Math.round(slots.getX(hit.face.a));
        if (!has(slot)) continue;
        const side = proxy.worldToLocal(hit.point.clone()).z < 0 ? -1 : 1;
        return { slot, side };
      }
      return null;
    },

    dispose() {
      for (const mesh of [hull, back, front, flier, into, proxy]) {
        mesh.geometry.dispose();
      }
      for (const material of [
        card.material,
        far.material,
        near.material,
        fly.material,
        knock.material,
        proxy.material,
        seams.material,
        caps.material,
      ]) {
        material.dispose();
      }
      seams.line.geometry.dispose();
      caps.line.geometry.dispose();
      renderer.dispose();
      // Free the context now, not when the canvas is collected: one context alive after Back.
      renderer.forceContextLoss();
    },
  };
}
