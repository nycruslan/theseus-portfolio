// The model's life on the page (.crew/sprint/25/contract.md, the data rules, and
// .crew/sprint/26/contract.md where it changes them): built after load when components/model.tsx
// imports this chunk, then landed, lofting and settled, or settled at once; and from then on still,
// drawing only on a resize or a scheme change. It lies on the drawing the page shows at its width,
// and moves to the other one, settled, when a resize crosses 768 px. Its one hook for tests and CSS
// is `[data-model]`'s data-state; nothing is put on window.

import { type Layout, NARROW, WIDE } from "@/lib/hull-layouts";
import { DURATION, ease } from "./calls";
import { buildHull, DESKTOP, type Hull, type Level, PHONE } from "./hull";
import { type Frame, type Loft, makeLoft } from "./loft";
import { bakeShadow } from "./shadow";
import { createStage, type Palette, type Stage } from "./stage";

type State = "landed" | "lofting" | "settled" | "still";
type Rest = "settled" | "still";
type Fit = Frame & { left: number; top: number; buffer: [number, number] };

/** One of the sheet's two drawings, and what the model is on it: its layout, level and ratio cap. */
type Sheet = { drawing: Element; layout: Layout; level: Level; cap: number };

/** The once-a-visit flag in sessionStorage. */
const PLAYED = "theseus:model";
/** The inputs that end the loft at its settled frame; each still does its own work. */
const INPUTS = ["keydown", "pointerdown", "wheel", "touchstart", "scroll"];
/** Where the page shows the three views rather than the profile (app/globals.css, "The lines plan"). */
const THREE_VIEWS = "(min-width: 48rem)";
/** Quality during the loft (S6): frames slower than these, in a row, step the DPR down or stop. */
const SLOW_MS = 22;
const STALL_MS = 33.4;

/** Each level's hull, built once a visit: a resize back across 768 px or a Back reuses it. */
const hulls = new Map<Level, Hull>();
const hullAt = (level: Level) => {
  const hull = hulls.get(level) ?? buildHull(level);
  hulls.set(level, hull);
  return hull;
};

const pause = () => new Promise((done) => setTimeout(done, 0));

/** A style read, so a transition has a before-change style to start from (notes-iris.md 8). */
const flush = (element: Element) => getComputedStyle(element).opacity;

const played = () => {
  try {
    return sessionStorage.getItem(PLAYED) === "1";
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    sessionStorage.setItem(PLAYED, "1");
  } catch {
    // Storage is blocked: the loft plays again on the next load, and nothing errors.
  }
};

/** The sheet's tokens as the page computes them now (contract, "Colours come from the tokens"). */
function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return {
    card: token("--card"),
    old: token("--card-old"),
    ink: token("--foreground"),
    ground: token("--background"),
    pencil: token("--pencil"),
    dark: matchMedia("(prefers-color-scheme: dark)").matches,
  };
}

/** The shadow at the loft's settled pose; its texels follow the drawing's scale. */
const shadowFor = (hull: Hull, loft: Loft) =>
  bakeShadow(
    hull.position,
    hull.index,
    loft.at(1).pose,
    Math.max(1, 2.5 * loft.scale),
  );

/** The DPR ladder, 2, 1.5, 1: a ratio between rungs steps to the rung below it (1.75 → 1.5). */
const below = (ratio: number) => (ratio > 1.5 ? 1.5 : 1);

/**
 * Mounts the model in `host`, `[data-model]`, over the drawing beside it, with the planks the
 * record seats. Returns the teardown. A page put in the back/forward cache is torn down on
 * pagehide and built again, settled, when it is shown, at whatever width it is shown at.
 */
export function mount(host: HTMLElement, seated: readonly string[]) {
  const seats = new Set(seated);
  let stop = start(host, seats, false);
  const hide = () => stop();
  const show = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    stop();
    stop = start(host, seats, true);
  };
  addEventListener("pagehide", hide);
  addEventListener("pageshow", show);
  return () => {
    removeEventListener("pagehide", hide);
    removeEventListener("pageshow", show);
    stop();
  };
}

function start(host: HTMLElement, seated: ReadonlySet<string>, back: boolean) {
  const plan = host.previousElementSibling;
  const wide = plan?.querySelector(".plan-wide");
  const narrow = plan?.querySelector(".plan-narrow");
  if (!wide || !narrow) return () => {};
  // The level and the cap follow the drawing, not the device (.crew/sprint/26/contract.md, "The
  // calls I made"): the three views from 768 px, the profile and half-breadth plan below.
  const sheets: Record<"wide" | "narrow", Sheet> = {
    wide: { drawing: wide, layout: WIDE, level: DESKTOP, cap: 2 },
    narrow: { drawing: narrow, layout: NARROW, level: PHONE, cap: 1.5 },
  };
  const shownSheet = () =>
    matchMedia(THREE_VIEWS).matches ? sheets.wide : sheets.narrow;
  const canvas = document.createElement("canvas");
  host.append(canvas);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const forced = matchMedia("(forced-colors: active)");
  let sheet = shownSheet();
  let cap = Math.min(devicePixelRatio, sheet.cap);
  let ratio = cap;
  let alive = true;
  let state: State | null = null;
  let raf = 0;
  let stage: Stage | null = null;
  let hull: Hull | null = null;
  let loft: Loft | null = null;
  let fit: Fit | null = null;
  /** The drawing the stage is laid on: behind `sheet` while a crossing waits for the build. */
  let on: Sheet | null = null;
  /** The programs' compile, while it runs: a teardown waits for it before disposing (Lens). */
  let compiling: Promise<unknown> | null = null;
  /** Frame 1 can be drawn: the build is done. */
  let built = false;
  // The loft's clock and its quality counters.
  let begin = 0;
  let last = 0;
  let slow = 0;
  let stall = 0;
  let skip = false;
  // A redraw waits for the tab to be shown and the model to be near the screen.
  let pending = false;
  // A crossing of 768 px waits two frames for its reading to hold (sprint 25's decision 13).
  let crossing = 0;
  // A lost context: nothing can be drawn, and the state to come back to once it is restored.
  let blank = false;
  let resume: Rest = "settled";

  const moving = () => state === "landed" || state === "lofting";

  const set = (next: State) => {
    state = next;
    host.dataset.state = next;
  };

  /** The layer's box against the viewport. Under forced colours the layer has none. */
  const box = () => host.getBoundingClientRect();
  /** On screen now: the loft plays only to someone who can see it. */
  const visible = () => {
    const r = box();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  /** Within a viewport of the screen, as the observer's margin is: a redraw waiting for that is
   * drawn before the model scrolls into view (Lens's nit on #72). */
  const near = () => {
    const r = box();
    return r.width > 0 && r.bottom > -innerHeight && r.top < 2 * innerHeight;
  };

  const measure = (): Fit => {
    const p = sheet.drawing.getBoundingClientRect();
    const h = box();
    // Whole buffer pixels, and the CSS size they make: round(css × dpr) / dpr (S4, rule 1).
    const buffer: [number, number] = [
      Math.round(p.width * ratio),
      Math.round(p.height * ratio),
    ];
    return {
      left: p.left - h.left,
      top: p.top - h.top,
      drawing: p.width,
      width: buffer[0] / ratio,
      height: buffer[1] / ratio,
      viewport: innerHeight,
      buffer,
    };
  };

  /**
   * Lays the canvas on the drawing and solves the loft for it, at that drawing's level; the
   * shadow too unless `keep` (a step of the ratio mid-move, on the same drawing).
   */
  const apply = (next: Fit, keep = false) => {
    if (!stage) return;
    const level = hullAt(sheet.level);
    const reshade = !keep || level !== hull;
    if (level !== hull) stage.load(level);
    hull = level;
    fit = next;
    on = sheet;
    Object.assign(canvas.style, {
      left: `${next.left}px`,
      top: `${next.top}px`,
      width: `${next.width}px`,
      height: `${next.height}px`,
    });
    stage.fit(next.buffer, [next.width, next.height]);
    loft = makeLoft(next, hull.points, sheet.layout);
    if (reshade) stage.shade(shadowFor(hull, loft));
  };

  /** Puts the model on the drawing shown: that drawing's level, ratio cap, loft and shadow. */
  const register = () => {
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
    apply(measure());
  };

  const draw = (e: number) => {
    if (stage && loft) stage.draw(e, loft);
  };

  const listen = (active: boolean) => {
    for (const type of INPUTS) {
      if (active) {
        addEventListener(type, input, { capture: true, passive: true });
      } else {
        removeEventListener(type, input, { capture: true });
      }
    }
  };

  const step = (next: number) => {
    ratio = next;
    apply(measure(), true);
  };

  /**
   * The settled frame, at rest: drawn once, then nothing. A still frame has no frame rate to
   * keep, so it is drawn at the cap whatever the move stepped down to.
   */
  const rest = (kind: Rest) => {
    listen(false);
    cancelAnimationFrame(raf);
    raf = 0;
    if (ratio < cap) step(cap);
    set(kind);
    draw(1);
  };

  const tick = (now: number) => {
    raf = 0;
    if (!alive) return;
    const interval = now - last;
    last = now;
    const u = (now - begin) / DURATION;
    if (skip || u >= 1 || reduce.matches) return rest("settled");
    // Three frames in a row above 22 ms step the DPR down a rung; at DPR 1, six above 33.4 ms
    // give up the move for the settled frame. Nothing steps up mid-move; rest does.
    slow = interval > SLOW_MS ? slow + 1 : 0;
    stall = interval > STALL_MS ? stall + 1 : 0;
    if (ratio > 1 && slow >= 3) {
      slow = 0;
      stall = 0;
      step(below(ratio));
    } else if (ratio <= 1 && stall >= 6) {
      return rest("still");
    }
    if (state === "landed") set("lofting");
    draw(ease(u));
    raf = requestAnimationFrame(tick);
  };

  /** Frame 1, or the settled frame: reduced motion, a second load, a Back, or nobody to see it. */
  const open = (now: number) => {
    raf = 0;
    if (!alive || blank) return;
    // The page may have crossed 768 px while the chunk downloaded or the scene built.
    if (on !== sheet) register();
    flush(canvas);
    if (back || reduce.matches || played() || !visible() || document.hidden) {
      return rest("settled");
    }
    remember();
    set("landed");
    draw(0);
    begin = now;
    last = now;
    listen(true);
    raf = requestAnimationFrame(tick);
  };

  const input = () => {
    skip = true;
  };

  /** A redraw at rest, for a new size or scheme: now if it can be seen soon, or once it can. */
  const redraw = () => {
    if (!stage || !state || moving()) return;
    if (document.hidden || !near()) {
      pending = true;
      return;
    }
    pending = false;
    draw(1);
  };

  /**
   * The page shows the other drawing: re-registered on it, settled, no loft and no frame until the
   * rebuild is ready, all in one task. Only a reading that still holds two frames on counts: a
   * full-page capture gives the page a 1 × 1 viewport for about 14 ms (sprint 25's decision 13).
   */
  const cross = () => {
    crossing = 0;
    if (!alive) return;
    const next = shownSheet();
    if (next === sheet) return refit();
    sheet = next;
    // Mid-build, frame 1 registers on it; with the context lost, the restore does.
    if (!state) return;
    register();
    rest("settled");
  };

  /** Re-fits the canvas to the drawing's box, within one drawing; a crossing waits (cross). */
  const refit = () => {
    if (!alive) return;
    if (shownSheet() !== sheet) {
      crossing ||= requestAnimationFrame(() => {
        crossing = requestAnimationFrame(cross);
      });
      return;
    }
    // Nothing is laid out to fit: the layer under forced colours, or a drawing with no box.
    if (!stage || !box().width) return;
    // A refit is at rest or ends the move, so it is at the cap; a zoom may have moved the cap.
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
    const next = measure();
    if (!next.buffer[0] || !next.buffer[1]) return;
    const same =
      fit &&
      on === sheet &&
      fit.buffer.join() === next.buffer.join() &&
      (["left", "top", "drawing", "viewport"] as const).every(
        (key) => fit?.[key] === next[key],
      );
    if (same) return;
    apply(next);
    if (moving()) rest("settled");
    else redraw();
  };

  const recolour = () => {
    if (!stage) return;
    stage.paint(palette(), seated);
    redraw();
  };

  const reduced = () => {
    if (reduce.matches) skip = true;
  };

  /** Forced colours hide the layer (app/globals.css); turned off again, the frame is drawn anew. */
  const unforced = () => {
    if (!forced.matches) redraw();
  };

  const shown = () => {
    if (document.hidden) {
      // The tab went away mid-move: stop asking for frames, and settle when it's back.
      if (moving() && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        skip = true;
      }
      return;
    }
    if (moving() && !raf) rest("settled");
    else if (pending) redraw();
  };

  /**
   * A lost context leaves a blank canvas over a hollow drawing, and the browser may never give it
   * back: the state goes, so the whole drawing returns, as with the model Off (Lens's nit on #72).
   */
  const lost = () => {
    blank = true;
    // A move cut short comes back settled; a still frame stays still.
    if (state) resume = state === "still" ? "still" : "settled";
    cancelAnimationFrame(raf);
    raf = 0;
    listen(false);
    pending = false;
    state = null;
    delete host.dataset.state;
  };

  /** three rebuilds its state first (its listener was added before this one); the settled frame
   * is drawn again and the state comes back with it. */
  const restored = () => {
    blank = false;
    if (!alive || !built) return;
    if (on !== sheet) register();
    rest(resume);
  };

  const seen = new IntersectionObserver(
    (entries) => {
      if (pending && entries.some((entry) => entry.isIntersecting)) redraw();
    },
    { rootMargin: "100% 0px" },
  );
  seen.observe(host);
  const sized = new ResizeObserver(refit);
  for (const element of [wide, narrow, host]) sized.observe(element);
  addEventListener("resize", refit);
  scheme.addEventListener("change", recolour);
  reduce.addEventListener("change", reduced);
  forced.addEventListener("change", unforced);
  document.addEventListener("visibilitychange", shown);

  function stop() {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(crossing);
    listen(false);
    seen.disconnect();
    sized.disconnect();
    removeEventListener("resize", refit);
    scheme.removeEventListener("change", recolour);
    reduce.removeEventListener("change", reduced);
    forced.removeEventListener("change", unforced);
    document.removeEventListener("visibilitychange", shown);
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    // three's compile polls the programs on a timer: disposing under it is left until it settles.
    const done = stage;
    const dispose = () => done?.dispose();
    if (compiling !== null) compiling.then(dispose, dispose);
    else dispose();
    stage = null;
    canvas.remove();
    delete host.dataset.state;
  }

  // The build, in steps with a yield between them, so a key press isn't held behind one long
  // task (build note 9): the geometry, the renderer and scene, the loft, the shadow, the programs.
  const build = async () => {
    await pause();
    if (!alive) return;
    hull = hullAt(sheet.level);
    await pause();
    if (!alive) return;
    stage = createStage(canvas, hull);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    await pause();
    if (!alive || !stage) return;
    stage.paint(palette(), seated);
    apply(measure(), true);
    await pause();
    if (!alive || !stage || !loft) return;
    stage.shade(shadowFor(hull, loft));
    await pause();
    if (!alive || !stage || !loft) return;
    compiling = stage.compile(loft);
    await compiling;
    compiling = null;
    built = true;
    if (alive && !blank) raf = requestAnimationFrame(open);
  };
  build().catch(() => {
    // No WebGL after all, or the build failed: the drawing is the page, as with the model Off.
    compiling = null;
    stop();
  });

  return stop;
}
