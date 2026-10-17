import {
  BUTTS,
  COPPER_LIFT,
  clamp,
  ends,
  halfBreadth,
  LENGTH,
  LIFTS,
  profile,
  SHEAR,
  seamDepth,
  sheer,
} from "@/lib/half-model";

// The hero's WebGL upgrade (.studio/sprint/9/contract.md, C10 to C14): the same half-model as the
// SVG, built from the same functions (lib/half-model.ts), turned by the scroll. Only the gate in
// components/hero-upgrade.tsx imports this, after load, so it ships as a chunk of its own.
//
// The turn is the SVG's own oblique projection with the shear as a variable: a point of the hull
// that stands z out of the board is drawn shear x z further down the page. The rest pose (the
// SVG's, SHEAR) is +0.24, seen from a little above; scrolled past, it turns to -0.24, seen from a
// little below. Nothing else changes: the tones are the SVG's, read from its computed colours, so
// they follow the theme with it.

/** A frame more than this after the one before it is slow; three in a row freeze the drawing. */
const SLOW_MS = 50;
const SLOW_RUN = 3;
/** Frames with nothing new to draw before the loop rests until the next scroll. */
const IDLE_FRAMES = 30;
/** Columns along each band, closer together toward its ends, where its edges turn fastest. */
const COLUMNS = 96;
/** Floats per vertex: x, board depth, z; v across the band, e along it; r, g, b. */
const STRIDE = 8;

type Rgb = [number, number, number];

// m: the hull's origin in the canvas and its scale (CSS px), r: the canvas's size (CSS px).
const VERTEX = `
attribute vec3 p;
attribute vec2 q;
attribute vec3 c;
uniform float k;
uniform vec3 m;
uniform vec2 r;
varying vec2 w;
varying vec3 o;
void main() {
  vec2 a = (m.xy + vec2(p.x, p.y + k * p.z) * m.z) / r;
  gl_Position = vec4(a.x * 2.0 - 1.0, 1.0 - a.y * 2.0, 0.0, 1.0);
  w = q;
  o = c;
}`;

// The seams. The SVG strokes every outline with a 1 px hairline of the ground, centred on the
// edge, so each band fades out within half a CSS pixel of its edges (h widens that for a denser
// canvas). v runs 0 to 1 across a band, e is the distance to its nearest butt or transom, both in
// board units, so their screen gradients turn them into pixels. The fade is alpha: the page shows
// through, whatever its colour. Half a level of screen-space noise (interleaved gradient noise)
// dithers the long, low-contrast gradients as Chromium dithers the SVG's, so they don't band.
const FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float h;
varying vec2 w;
varying vec3 o;
void main() {
  float across = min(w.x, 1.0 - w.x) / length(vec2(dFdx(w.x), dFdy(w.x)));
  float along = w.y / length(vec2(dFdx(w.y), dFdy(w.y)));
  float a = clamp(min(across, along) - h, 0.0, 1.0);
  float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor = vec4(clamp(o + (n - 0.5) / 255.0, 0.0, 1.0) * a, a);
}`;

/** One region of the model drawn as a strip of quads: a lift, or the deck. */
type Band = {
  from: number;
  to: number;
  /** Board x positions the columns must include: stations, butts, corners. */
  stops: number[];
  /** Vertical edges the hairline follows: butts, and the transom at x = 0. */
  edges: number[];
  /** The model point at x, a share v of the way across the band. */
  at(x: number, v: number): [number, number, number];
  tone(x: number): Rgb;
  /** A stretch drawn in another colour: the copper plank. */
  patch?: { from: number; to: number; tone: Rgb };
};

function columns(band: Band) {
  const xs = [...band.stops, ...band.edges];
  for (let i = 0; i <= COLUMNS; i++) {
    const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / COLUMNS);
    xs.push(band.from + (band.to - band.from) * t);
  }
  return xs
    .filter((x) => x >= band.from && x <= band.to)
    .sort((a, b) => a - b)
    .filter((x, i, all) => i === 0 || x - (all[i - 1] ?? 0) > 1e-3);
}

/** Two triangles per column pair, each vertex carrying where it is, how far from an edge, its tone. */
function strip(band: Band, out: number[]) {
  const xs = columns(band);
  for (let i = 0; i < xs.length - 1; i++) {
    const [x0, x1] = [xs[i] ?? 0, xs[i + 1] ?? 0];
    const mid = (x0 + x1) / 2;
    // The nearest vertical edge, measured positive into this column; none: a distance never reached.
    const edge = band.edges.reduce<number | undefined>(
      (best, b) =>
        best === undefined || Math.abs(mid - b) < Math.abs(mid - best)
          ? b
          : best,
      undefined,
    );
    const along = (x: number) =>
      edge === undefined ? x + 1e4 : mid >= edge ? x - edge : edge - x;
    const patch =
      band.patch && mid > band.patch.from && mid < band.patch.to
        ? band.patch.tone
        : undefined;
    const vertex = (x: number, v: number) =>
      out.push(...band.at(x, v), v, along(x), ...(patch ?? band.tone(x)));
    vertex(x0, 0);
    vertex(x1, 0);
    vertex(x0, 1);
    vertex(x1, 0);
    vertex(x1, 1);
    vertex(x0, 1);
  }
}

/**
 * The SVG's colours as the browser resolved them, in sRGB, through a 1 px 2D canvas. A colour the
 * canvas can't parse leaves its fill style unchanged, so each colour is read over two different
 * sentinels: if the reads differ (or aren't opaque), it didn't take, and the answer is null.
 */
function colourReader() {
  const ink = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  const read = (css: string, sentinel: string) => {
    if (!ink) return null;
    ink.clearRect(0, 0, 1, 1);
    ink.fillStyle = sentinel;
    ink.fillStyle = css;
    ink.fillRect(0, 0, 1, 1);
    return [...ink.getImageData(0, 0, 1, 1).data];
  };
  return (css: string): Rgb | null => {
    const [first, second] = [read(css, "black"), read(css, "white")];
    if (!(first && second) || first.join() !== second.join()) return null;
    const [r = 0, g = 0, b = 0, alpha = 0] = first;
    return alpha === 255 ? [r / 255, g / 255, b / 255] : null;
  };
}

/**
 * A lift's tone along its length: the SVG's own gradient, its stops as the theme resolves them and
 * its span the path's bounding box, interpolated in sRGB as SVG gradients are.
 */
function gradient(
  path: SVGGraphicsElement,
  stops: Element[],
  resolve: (css: string) => Rgb | null,
) {
  const box = path.getBBox();
  const points: { x: number; tone: Rgb }[] = [];
  for (const stop of stops) {
    const tone = resolve(getComputedStyle(stop).stopColor);
    if (!tone) return null;
    points.push({
      x: box.x + Number(stop.getAttribute("offset")) * box.width,
      tone,
    });
  }
  const tone = (x: number): Rgb => {
    const after = points.findIndex((p) => p.x >= x);
    const [a, b] =
      after <= 0 ? [points[0], points[0]] : [points[after - 1], points[after]];
    if (!(a && b)) return points.at(-1)?.tone ?? [0, 0, 0];
    const t = b.x > a.x ? clamp((x - a.x) / (b.x - a.x)) : 0;
    return [0, 1, 2].map(
      (i) => (a.tone[i] ?? 0) + t * ((b.tone[i] ?? 0) - (a.tone[i] ?? 0)),
    ) as Rgb;
  };
  return { tone, stations: points.map((p) => p.x) };
}

/** Lift k (0 is the top) between its seams, ends following the stem and the stern, as the SVG's. */
function liftBand(
  k: number,
  shade: { tone: (x: number) => Rgb; stations: number[] },
  copper: Rgb,
): Band {
  const top = (x: number) => (k === 0 ? sheer(x) : seamDepth(k));
  const bottom = (x: number) =>
    k === LIFTS - 1 ? profile(x) : Math.min(seamDepth(k + 1), profile(x));
  const [from, to] = k === 0 ? [0, LENGTH] : ends(seamDepth(k));
  // Where the seam below meets the profile: a corner of the outline.
  const corners = k === LIFTS - 1 ? [] : ends(seamDepth(k + 1));
  const butts = (BUTTS[k] ?? []).map((share) => share * LENGTH);
  const [aft = 0, fore = 0] = BUTTS[COPPER_LIFT] ?? [];
  return {
    from,
    to,
    stops: [...shade.stations, ...corners],
    // The top two lifts reach the stern, where the transom's edge is outlined too.
    edges: from === 0 ? [0, ...butts] : butts,
    at(x, v) {
      const d = top(x) + v * (bottom(x) - top(x));
      return [x, d, halfBreadth(x, d)];
    },
    tone: shade.tone,
    ...(k === COPPER_LIFT
      ? { patch: { from: aft * LENGTH, to: fore * LENGTH, tone: copper } }
      : {}),
  };
}

/** The deck: the strip of the top seen from above, from the board (z = 0) out to the gunwale. */
const deckBand = (tone: Rgb): Band => ({
  from: 0,
  to: LENGTH,
  stops: [],
  edges: [0],
  at: (x, v) => [x, sheer(x), v * halfBreadth(x, sheer(x))],
  tone: () => tone,
});

/**
 * The model's vertices, deck last (it only shows while the hull is seen from above), with the
 * tones of the SVG in `svg` as it is drawn now.
 */
function buildMesh(svg: SVGSVGElement) {
  const resolve = colourReader();
  const paths = [
    ...svg.querySelectorAll<SVGGraphicsElement>("[data-hero-lift]"),
  ];
  const gradients = [...svg.querySelectorAll("linearGradient")];
  const copper = svg.querySelector("[data-hero-copper]");
  const deck = svg.querySelector(".hero-deck");
  if (!(copper && deck) || paths.length !== LIFTS) return null;
  // A colour that didn't resolve keeps the SVG: no guessed tone is drawn.
  const copperTone = resolve(getComputedStyle(copper).fill);
  const deckTone = resolve(getComputedStyle(deck).fill);
  if (!(copperTone && deckTone)) return null;

  const out: number[] = [];
  for (const [k, path] of paths.entries()) {
    const stops = [...(gradients[k]?.querySelectorAll("stop") ?? [])];
    const shade = stops.length > 0 ? gradient(path, stops, resolve) : null;
    if (!shade) return null;
    strip(liftBand(k, shade, copperTone), out);
  }
  const lifts = out.length / STRIDE;
  strip(deckBand(deckTone), out);
  return { data: new Float32Array(out), lifts, all: out.length / STRIDE };
}

function program(gl: WebGLRenderingContext) {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vertex = shader(gl.VERTEX_SHADER, VERTEX);
  const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const linked = gl.createProgram();
  if (!(vertex && fragment && linked)) return null;
  gl.attachShader(linked, vertex);
  gl.attachShader(linked, fragment);
  gl.linkProgram(linked);
  return gl.getProgramParameter(linked, gl.LINK_STATUS) ? linked : null;
}

/** Makes the program current with the mesh's buffer and attributes, and finds its uniforms. */
function bind(
  gl: WebGLRenderingContext,
  linked: WebGLProgram,
  data: Float32Array,
) {
  // Through call(): the linter takes any call named use* for a React hook, which this is not.
  gl.useProgram.call(gl, linked);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  for (const [name, size, offset] of [
    ["p", 3, 0],
    ["q", 2, 3],
    ["c", 3, 5],
  ] as const) {
    const at = gl.getAttribLocation(linked, name);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, gl.FLOAT, false, STRIDE * 4, offset * 4);
  }
  const uniform = (name: string) => gl.getUniformLocation(linked, name);
  return {
    shear: uniform("k"),
    place: uniform("m"),
    size: uniform("r"),
    hair: uniform("h"),
  };
}

type Mesh = NonNullable<ReturnType<typeof buildMesh>>;

/**
 * Draws the pose the scroll asks for into `canvas`, sized to the box and placed on the SVG, if
 * anything about it changed since the last time. Returns whether it drew.
 */
function painter(
  gl: WebGLRenderingContext,
  uniforms: ReturnType<typeof bind>,
  box: HTMLElement,
  svg: SVGSVGElement,
) {
  let drawn = "";
  return {
    forget: () => {
      drawn = "";
    },
    paint(mesh: Mesh) {
      const outer = box.getBoundingClientRect();
      const model = svg.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      // The turn runs from the top of the page until the box's bottom edge reaches the viewport's
      // top, and stops there.
      const end = outer.bottom + scrollY;
      const shear = SHEAR - 2 * SHEAR * clamp(end > 0 ? scrollY / end : 1);
      const [width, height] = [outer.width, outer.height].map((v) =>
        Math.round(v * dpr),
      ) as [number, number];
      const place = [
        model.left - outer.left,
        model.top - outer.top,
        model.width / LENGTH,
      ] as const;
      const key = [shear, width, height, ...place].join();
      if (key === drawn) return false;
      drawn = key;
      const canvas = gl.canvas as HTMLCanvasElement;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      // Rounded first, so the middle of the turn reads 0.000, never -0.000.
      box.setAttribute(
        "data-hero-shear",
        (Math.round(shear * 1000) / 1000).toFixed(3),
      );
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.shear, shear);
      gl.uniform3f(uniforms.place, ...place);
      gl.uniform2f(uniforms.size, outer.width, outer.height);
      gl.uniform1f(uniforms.hair, 0.5 * dpr - 0.5);
      // From below (shear 0 or less) the deck is behind the hull: the lifts alone.
      gl.drawArrays(gl.TRIANGLES, 0, shear > 0 ? mesh.all : mesh.lifts);
      return true;
    },
  };
}

/**
 * Runs `paint` once a frame while the scroll keeps changing the pose, then rests until the next
 * scroll. Only back-to-back frames of a running loop are timed, so a rest is never a slow frame;
 * three slow ones in a row stop it for the life of the page (the contract's "slow frame").
 */
function turnLoop(paint: () => boolean) {
  let frame = 0;
  let last = -1;
  let slow = 0;
  let idle = 0;
  let frozen = false;
  const tick = (now: number) => {
    frame = 0;
    if (last >= 0) {
      slow = now - last > SLOW_MS ? slow + 1 : 0;
      if (slow >= SLOW_RUN) {
        // This device can't keep up: the hull stays where it is.
        frozen = true;
        removeEventListener("scroll", wake);
        return;
      }
    }
    last = now;
    idle = paint() ? 0 : idle + 1;
    if (idle >= IDLE_FRAMES) {
      last = -1;
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (frame || frozen) return;
    idle = 0;
    frame = requestAnimationFrame(tick);
  };
  addEventListener("scroll", wake, { passive: true });
  return {
    frozen: () => frozen,
    stop() {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", wake);
    },
  };
}

/**
 * Draws the hull in WebGL over the SVG in `box`, and keeps it turned to the scroll. Leaves the SVG
 * alone if anything is missing; puts it back if the context is lost.
 */
export function mountHull(box: HTMLElement) {
  const svg = box.querySelector("svg");
  if (!svg || box.querySelector("canvas")) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  // The same flag the gate's probe passed: a device that only has a slow GPU keeps the SVG.
  const gl = canvas.getContext("webgl", {
    failIfMajorPerformanceCaveat: true,
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl?.getExtension("OES_standard_derivatives")) return;
  const linked = program(gl);
  let mesh = buildMesh(svg);
  if (!(linked && mesh)) return;
  const { paint, forget } = painter(gl, bind(gl, linked, mesh.data), box, svg);
  const draw = () => (mesh ? paint(mesh) : false);
  const loop = turnLoop(draw);

  // A frozen canvas can't be redrawn, so a new size or scheme brings the SVG back instead.
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const recolour = () => {
    mesh = loop.frozen() ? null : buildMesh(svg);
    if (!mesh) return restore();
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
    forget();
    draw();
  };
  const resized = new ResizeObserver(() =>
    loop.frozen() ? restore() : draw(),
  );
  const hideSvg = () => {
    svg.classList.add("hero-covered");
  };
  const fade = window.setTimeout(hideSvg, 400);
  const restore = () => {
    loop.stop();
    clearTimeout(fade);
    scheme.removeEventListener("change", recolour);
    resized.disconnect();
    canvas.remove();
    box.removeAttribute("data-hero-shear");
    svg.classList.remove("hero-covered");
  };

  // The canvas fades in over the SVG (CSS: .hero canvas), drawn before its first paint; the SVG
  // under it hides once the fade is done, so a turned pose never shows the rest pose behind it.
  box.append(canvas);
  draw();
  canvas.addEventListener("transitionend", hideSvg, { once: true });
  canvas.addEventListener("webglcontextlost", restore, { once: true });
  scheme.addEventListener("change", recolour);
  resized.observe(box);
}
