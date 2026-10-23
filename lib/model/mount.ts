// The model's life on the page (.crew/sprint/25/contract.md, the data rules): built after load
// when components/model.tsx imports this chunk, then landed, lofting and settled, or settled at
// once; and from then on still, drawing only on a resize or a scheme change. Its one hook for
// tests and CSS is `[data-model]`'s data-state; nothing is put on window.

import { WIDE as WIDE_LAYOUT } from "@/lib/hull-layouts";
import { DURATION, ease } from "./calls";
import { buildHull, DESKTOP, type Hull } from "./hull";
import { type Frame, type Loft, makeLoft } from "./loft";
import { bakeShadow } from "./shadow";
import { createStage, type Palette, type Stage } from "./stage";

type State = "landed" | "lofting" | "settled" | "still";
type Fit = Frame & { left: number; top: number; buffer: [number, number] };

/** The once-a-visit flag in sessionStorage. */
const PLAYED = "theseus:model";
/** The inputs that end the loft at its settled frame; each still does its own work. */
const INPUTS = ["keydown", "pointerdown", "wheel", "touchstart", "scroll"];
/** Where the model runs at all: the three-view sheet, as the CSS lays it out from lg. */
const WIDE = "(min-width: 64rem)";
/** Quality during the loft (S6): frames slower than these, in a row, step the DPR down or stop. */
const SLOW_MS = 22;
const STALL_MS = 33.4;

/** Off for the rest of the visit once a resize took the page below 1024 px. */
let narrowed = false;

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
 * pagehide and built again, settled, when it is shown.
 */
export function mount(host: HTMLElement, seated: readonly string[]) {
  const seats = new Set(seated);
  let stop = start(host, seats);
  const hide = () => stop();
  const show = (event: PageTransitionEvent) => {
    if (!event.persisted || narrowed) return;
    stop();
    // Restored at a width the model doesn't run at: Off for the rest of the visit, as a resize is.
    if (!matchMedia(WIDE).matches) {
      narrowed = true;
      return;
    }
    stop = start(host, seats);
  };
  addEventListener("pagehide", hide);
  addEventListener("pageshow", show);
  return () => {
    removeEventListener("pagehide", hide);
    removeEventListener("pageshow", show);
    stop();
  };
}

function start(host: HTMLElement, seated: ReadonlySet<string>) {
  const plan = host.previousElementSibling?.querySelector(".plan-wide");
  if (!plan) return () => {};
  const canvas = document.createElement("canvas");
  host.append(canvas);

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  let cap = Math.min(devicePixelRatio, 2);
  let ratio = cap;
  let alive = true;
  let state: State | null = null;
  let raf = 0;
  let stage: Stage | null = null;
  let hull: Hull | null = null;
  let loft: Loft | null = null;
  let fit: Fit | null = null;
  // The loft's clock and its quality counters.
  let begin = 0;
  let last = 0;
  let slow = 0;
  let stall = 0;
  let skip = false;
  // The gates: drawn only on screen and with the tab shown; a redraw waits for both.
  let onScreen = true;
  let pending = false;

  const moving = () => state === "landed" || state === "lofting";

  const set = (next: State) => {
    state = next;
    host.dataset.state = next;
  };

  const measure = (): Fit => {
    const p = plan.getBoundingClientRect();
    const h = host.getBoundingClientRect();
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

  /** Lays the canvas on the drawing and solves the loft for it; the shadow too unless `keep`. */
  const apply = (next: Fit, keep = false) => {
    if (!stage || !hull) return;
    fit = next;
    Object.assign(canvas.style, {
      left: `${next.left}px`,
      top: `${next.top}px`,
      width: `${next.width}px`,
      height: `${next.height}px`,
    });
    stage.fit(next.buffer, [next.width, next.height]);
    loft = makeLoft(next, hull.points, WIDE_LAYOUT);
    if (!keep) stage.shade(shadowFor(hull, loft));
  };

  const draw = (e: number) => {
    if (stage && loft) stage.draw(e, loft);
  };

  const listen = (on: boolean) => {
    for (const type of INPUTS) {
      if (on) {
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
   * keep, so it is drawn at min(devicePixelRatio, 2) whatever the move stepped down to.
   */
  const rest = (kind: "settled" | "still") => {
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

  /** Frame 1, or the settled frame: reduced motion, a second load, or nobody to see the move. */
  const open = (now: number) => {
    raf = 0;
    if (!alive) return;
    // The width may have gone below 1024 px while the chunk downloaded or the scene built.
    if (!matchMedia(WIDE).matches) {
      narrowed = true;
      stop();
      return;
    }
    flush(canvas);
    if (reduce.matches || played() || !onScreen || document.hidden) {
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

  /** A redraw at rest, for a new size or scheme: now if it can be seen, or once it can. */
  const redraw = () => {
    if (!stage || !state || moving()) return;
    if (document.hidden || !onScreen) {
      pending = true;
      return;
    }
    pending = false;
    draw(1);
  };

  /** Re-fits the canvas to the drawing's box; below 1024 px the model goes for the visit. */
  const refit = () => {
    if (!alive) return;
    // Checked before the stage exists too: a resize below 1024 px during the download or the build
    // ends it there, and stop() takes a part-built stage down.
    if (!matchMedia(WIDE).matches) {
      narrowed = true;
      stop();
      return;
    }
    if (!stage) return;
    // A refit is at rest or ends the move, so it is at the cap; a zoom may have moved the cap.
    cap = Math.min(devicePixelRatio, 2);
    ratio = cap;
    const next = measure();
    const same =
      fit &&
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

  // A lost context comes back blank: three rebuilds its state, and the still frame is drawn again.
  const restored = () => redraw();
  canvas.addEventListener("webglcontextrestored", restored);

  const seen = new IntersectionObserver((entries) => {
    onScreen = entries.some((entry) => entry.isIntersecting);
    if (onScreen && pending) redraw();
  });
  seen.observe(host);
  const sized = new ResizeObserver(refit);
  sized.observe(plan);
  addEventListener("resize", refit);
  scheme.addEventListener("change", recolour);
  reduce.addEventListener("change", reduced);
  document.addEventListener("visibilitychange", shown);

  function stop() {
    alive = false;
    cancelAnimationFrame(raf);
    listen(false);
    seen.disconnect();
    sized.disconnect();
    removeEventListener("resize", refit);
    scheme.removeEventListener("change", recolour);
    reduce.removeEventListener("change", reduced);
    document.removeEventListener("visibilitychange", shown);
    stage?.dispose();
    stage = null;
    canvas.remove();
    delete host.dataset.state;
  }

  // The build, in steps with a yield between them, so a key press isn't held behind one long
  // task (build note 9): the geometry, the renderer and scene, the loft, the shadow, the programs.
  const build = async () => {
    await pause();
    if (!alive) return;
    hull = buildHull(DESKTOP);
    await pause();
    if (!alive) return;
    stage = createStage(canvas, hull);
    await pause();
    if (!alive || !stage) return;
    stage.paint(palette(), seated);
    apply(measure(), true);
    await pause();
    if (!alive || !stage || !loft) return;
    stage.shade(shadowFor(hull, loft));
    await pause();
    if (!alive || !stage || !loft) return;
    await stage.compile(loft);
    if (alive) raf = requestAnimationFrame(open);
  };
  build().catch(() => {
    // No WebGL after all, or the build failed: the drawing is the page, as with the model Off.
    stop();
  });

  return stop;
}
