// The model's life on the page (.crew/sprint/25/contract.md, the data rules, and
// .crew/sprint/26/contract.md where it changes them): built after load when components/model.tsx
// imports this chunk, then landed, lofting and settled, or settled at once; and from then on still,
// drawing only on a resize or a scheme change. It lies on the drawing the page shows at its width,
// and moves to the other one, settled, when a resize crosses 768 px. Its one hook for tests and CSS
// is `[data-model]`'s data-state; nothing is put on window.

import { GHOST, type Layout, NARROW, PLANKS, WIDE } from "@/lib/hull-layouts";
import { DURATION, ease } from "./calls";
import { type GhostPage, near as nearLine, readGhost, riders } from "./ghost";
import {
  buildHull,
  DESKTOP,
  type Ghost,
  type Hull,
  type Level,
  PHONE,
  plankEdges,
} from "./hull";
import { type Frame, type Loft, makeLoft } from "./loft";
import { bakeShadow } from "./shadow";
import { createStage, type Palette, type Stage } from "./stage";

type State = "landed" | "lofting" | "settled" | "still";
type Rest = "settled" | "still";
/**
 * How the model opens (.crew/sprint/27/contract.md): `auto`, the loft once a visit (Full); `settled`
 * (Calm); `loft`, the loft whatever the visit has seen (a press of Full).
 */
export type Open = "auto" | "settled" | "loft";
type Fit = Frame & { left: number; top: number; buffer: [number, number] };

/** One of the sheet's two drawings, and what the model is on it: its layout, level and ratio cap. */
type Sheet = { drawing: Element; layout: Layout; level: Level; cap: number };

/** The once-a-visit flag in sessionStorage: the sheet's loft, and the Log's camera move. */
const PLAYED = "theseus:model";
const PLAYED_GHOST = "theseus:ghost";
/** The inputs that end the loft at its settled frame; each still does its own work. */
const INPUTS = ["keydown", "pointerdown", "wheel", "touchstart", "scroll"];
/** Where the page shows the three views rather than the profile (app/globals.css, "The lines plan"). */
const THREE_VIEWS = "(min-width: 48rem)";
/** Quality during the loft (S6): frames slower than these, in a row, step the DPR down or stop. */
const SLOW_MS = 22;
const STALL_MS = 33.4;

/**
 * Each level's hull, built once a visit: a resize back across 768 px or a Back reuses it. A page
 * has one kind, the sheet's card or the Log's ghost (its seats fixed by the page), so the level
 * keys it.
 */
const hulls = new Map<Level, Hull>();
const hullAt = (level: Level, ghost?: Ghost) => {
  const hull = hulls.get(level) ?? buildHull(level, ghost);
  hulls.set(level, hull);
  return hull;
};

const pause = () => new Promise((done) => setTimeout(done, 0));

/** A style read, so a transition has a before-change style to start from (notes-iris.md 8). */
const flush = (element: Element) => getComputedStyle(element).opacity;

const played = (key: string) => {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const remember = (key: string) => {
  try {
    sessionStorage.setItem(key, "1");
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
    vellum: token("--vellum"),
    muted: token("--muted"),
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
 * record seats, opening as `open` says. Returns the teardown and `settle`, which ends a loft at its
 * settled frame (Calm pressed, or reduced motion asked for with no mode stored). A page put in the
 * back/forward cache is torn down on pagehide and built again, settled, when it is shown, at
 * whatever width it is shown at.
 */
export function mount(
  host: HTMLElement,
  seated: readonly string[],
  open: Open,
) {
  const seats = new Set(seated);
  let model = start(host, seats, open, false);
  const hide = () => model.stop();
  const show = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    model.stop();
    model = start(host, seats, open, true);
  };
  addEventListener("pagehide", hide);
  addEventListener("pageshow", show);
  return {
    stop() {
      removeEventListener("pagehide", hide);
      removeEventListener("pageshow", show);
      model.stop();
    },
    settle: () => model.settle(),
  };
}

function start(
  host: HTMLElement,
  seated: ReadonlySet<string>,
  open: Open,
  back: boolean,
) {
  const plan = host.previousElementSibling;
  // The Log's ghost (.crew/sprint/33/): one drawing at every width, the profile alone. Its seats and
  // numbers are the drawing's own, as the server drew them from the data rules.
  const ghostDrawing = plan?.matches("[data-ghost]")
    ? plan.querySelector(".plan-ghost")
    : null;
  const wide = ghostDrawing ?? plan?.querySelector(".plan-wide");
  const narrow = ghostDrawing ?? plan?.querySelector(".plan-narrow");
  if (!wide || !narrow) return { stop() {}, settle() {} };
  const ghost: GhostPage | undefined = ghostDrawing
    ? readGhost(ghostDrawing)
    : undefined;
  const key = ghost ? PLAYED_GHOST : PLAYED;
  // The level and the cap follow the drawing, not the device (.crew/sprint/26/contract.md, "The
  // calls I made"): the three views from 768 px, the profile and half-breadth plan below. The
  // ghost's one drawing takes the desktop's level and cap from 768 px, the phone's below.
  const sheets: Record<"wide" | "narrow", Sheet> = {
    wide: {
      drawing: wide,
      layout: ghost ? GHOST : WIDE,
      level: DESKTOP,
      cap: 2,
    },
    narrow: {
      drawing: narrow,
      layout: ghost ? GHOST : NARROW,
      level: PHONE,
      cap: 1.5,
    },
  };
  const shownSheet = () =>
    matchMedia(THREE_VIEWS).matches ? sheets.wide : sheets.narrow;
  const canvas = document.createElement("canvas");
  host.append(canvas);
  const numbers = ghost ? riders(ghost) : null;
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
  /**
   * What must be on screen: the layer, which is the drawing's row on the sheet; on the Log, whose
   * main is a flex column below 1024 px, the layer is all of main, so the drawing (spike, sprint 33).
   */
  const shownBox = () =>
    box().width > 0 ? (ghost ? wide : host).getBoundingClientRect() : box();
  /** On screen now: the loft plays only to someone who can see it. */
  const visible = () => {
    const r = shownBox();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  /** Within a viewport of the screen, as the observer's margin is: a redraw waiting for that is
   * drawn before the model scrolls into view (Lens's nit on #72). */
  const near = () => {
    const r = shownBox();
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
    // Chromium lays a box out in 1/64 px, flooring: the ghost's CSS size is rounded up to it, so the
    // buffer is never more than the ratio times the size the page lays out (107 / 1.5 = 71.333
    // reads back 71.328 at 390, over the 1.5 cap: B5.23).
    const css = (n: number) =>
      ghost ? Math.ceil((n / ratio) * 64) / 64 : n / ratio;
    return {
      left: p.left - h.left,
      top: p.top - h.top,
      drawing: p.width,
      width: css(buffer[0]),
      height: css(buffer[1]),
      viewport: innerHeight,
      buffer,
      ratio,
    };
  };

  /**
   * Lays the canvas on the drawing and solves the loft for it, at that drawing's level; the
   * shadow too unless `keep` (a step of the ratio mid-move, on the same drawing).
   */
  const apply = (next: Fit, keep = false) => {
    if (!stage) return;
    const level = hullAt(sheet.level, ghost?.hull);
    const reshade = !ghost && (!keep || level !== hull);
    const changed = level !== hull;
    if (changed) stage.load(level);
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
    numbers?.reset();
    if (changed) remark();
  };

  /** Puts the model on the drawing shown: that drawing's level, ratio cap, loft and shadow. */
  const register = () => {
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
    apply(measure());
  };

  /** Every line the settled frame draws but the leaders: the numbers clear them all. */
  const drawn = () => {
    const record = ghost?.current
      ? plankEdges(sheet.level, ghost.current, 1)
      : new Float32Array(0);
    const parts = [hull?.seams, hull?.outline, record];
    const all = new Float32Array(
      parts.reduce((n, part) => n + (part?.length ?? 0), 0),
    );
    let at = 0;
    for (const part of parts) {
      if (!part) continue;
      all.set(part, at);
      at += part.length;
    }
    return all;
  };

  const draw = (e: number) => {
    if (!stage || !loft) return;
    // The leaders ride with their numbers, so they are laid before the frame is drawn.
    if (numbers) {
      const lines = numbers.leaders(e, matchMedia(THREE_VIEWS).matches);
      const all: number[] = [];
      for (const { points } of lines) {
        for (let i = 1; i < points.length; i++) {
          all.push(...(points[i - 1] ?? []), ...(points[i] ?? []));
        }
      }
      stage.lead(new Float32Array(all));
    }
    stage.draw(e, loft);
    if (fit && numbers) {
      numbers.place(
        loft,
        fit.drawing / GHOST.box[2],
        e,
        matchMedia(THREE_VIEWS).matches,
        drawn,
      );
    }
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
    const u = (now - begin) / (loft?.duration ?? DURATION);
    if (skip || u >= 1) return rest("settled");
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

  /** Frame 1, or the settled frame: Calm, a second load, a Back, or nobody to see it. */
  const first = (now: number) => {
    raf = 0;
    if (!alive || blank) return;
    // The page may have crossed 768 px while the chunk downloaded or the scene built.
    if (on !== sheet) register();
    flush(canvas);
    // A press of Full asked for the loft: it counts as this visit's, shown or not.
    if (open === "loft") remember(key);
    if (
      open === "settled" ||
      back ||
      (open === "auto" && played(key)) ||
      !visible() ||
      document.hidden
    ) {
      return rest("settled");
    }
    remember(key);
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
    // Mid-build, frame 1 registers on it; with the context lost, the restore does. The cap is the
    // new drawing's now, so the build's own fit doesn't lay the old one's on it (Lens, #73).
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
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

  /** Ends a loft at its settled frame within 2 frames, or opens the model settled (Calm). */
  const settle = () => {
    open = "settled";
    skip = true;
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
    unpick();
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
  seen.observe(ghost ? wide : host);
  // The ghost's pick (.crew/sprint/33/contract.md, "The pick"): at rest the canvas takes the
  // pointer (app/globals.css). A mouse or pen over a plank inks its edges, sets data-pick and the
  // hand cursor, with one frame per plank crossed; a click, a tap that lifts within 10 px, opens the
  // record of the sprint that took it out. A record's own plank keeps its mark.
  type Target = { seat: string; side: number };
  /** The plank under the mouse or pen, and the press in progress, with what it landed on. */
  let hovered: Target | null = null;
  let press: {
    id: number;
    x: number;
    y: number;
    button: number;
    touch: boolean;
    target: Target | null;
  } | null = null;
  const marks = new Map<string, Float32Array>();
  const edges = ({ seat, side }: Target) => {
    const key = `${sheet.level.stations}:${seat}:${side}`;
    const found = marks.get(key) ?? plankEdges(sheet.level, seat, side);
    marks.set(key, found);
    return found;
  };
  const same = (a: Target | null | undefined, b: Target | null | undefined) =>
    a?.seat === b?.seat && a?.side === b?.side;
  /** The ink marks: the record's plank, and the one under the pointer or the finger. */
  function remark() {
    if (!stage || !ghost) return;
    const record = ghost.current ? { seat: ghost.current, side: 1 } : undefined;
    const lit = press?.touch ? press.target : hovered;
    const parts = [record, same(lit, record) ? undefined : lit]
      .filter((target): target is Target => Boolean(target))
      .map(edges);
    const all = new Float32Array(parts.reduce((n, part) => n + part.length, 0));
    let at = 0;
    for (const part of parts) {
      all.set(part, at);
      at += part.length;
    }
    stage.mark(all);
  }
  const resting = () => state === "settled" || state === "still";
  /** The plank under a point of the viewport, as the settled frame draws it. */
  const pickAt = (x: number, y: number): Target | null => {
    if (!ghost || !stage || !loft || !resting()) return null;
    const r = canvas.getBoundingClientRect();
    // A number set aft of the hull picks its plank: its box, and 4 px round its leader, from
    // 768 px, where they show (both led-out numbers: 5.0's, and 3.0's by Iris's decision).
    for (const leader of numbers?.leaders(1, sheet === sheets.wide) ?? []) {
      const box = ghost.labels
        .find((label) => label.seat === leader.seat)
        ?.span.getBoundingClientRect();
      const on =
        box?.width &&
        x >= box.left &&
        x <= box.right &&
        y >= box.top &&
        y <= box.bottom;
      const line = loft
        .screen(leader.points, 1)
        .map(([px, py]) => [px + r.left, py + r.top] as const);
      if (on || nearLine(line, x, y, 4)) return { seat: leader.seat, side: 1 };
    }
    const hit = stage.pick(x - r.left, y - r.top);
    const seat = hit ? PLANKS[hit.slot]?.id : undefined;
    return hit && seat && ghost.numbers.has(seat)
      ? { seat, side: hit.side }
      : null;
  };
  // The cursor is the canvas's, written only when it changes: a style write on main restyles its
  // whole table (spike-pixel.md, section 3).
  const hover = (next: Target | null) => {
    if (same(next, hovered)) return;
    hovered = next;
    if (next) host.dataset.pick = next.seat;
    else delete host.dataset.pick;
    canvas.style.cursor = next ? "pointer" : "";
    remark();
    redraw();
  };
  /** Back to no hover and no press: the state went, or the model did. */
  function unpick() {
    press = null;
    hovered = null;
    delete host.dataset.pick;
    canvas.style.cursor = "";
    numbers?.clear();
  }
  const moved = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && !press) {
      hover(pickAt(event.clientX, event.clientY));
    }
  };
  const left = (event: PointerEvent) => {
    if (event.pointerType !== "touch") hover(null);
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    const touch = event.pointerType === "touch";
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      touch,
      target: pickAt(event.clientX, event.clientY),
    };
    // The finger's plank shows its ink edges from the press, until the navigation or a cancel.
    if (touch && press.target) {
      remark();
      redraw();
    }
  };
  const up = (event: PointerEvent) => {
    const done = press;
    press = null;
    if (!done || done.id !== event.pointerId) return;
    if (done.touch && done.target) {
      remark();
      redraw();
    }
    const travel = Math.hypot(event.clientX - done.x, event.clientY - done.y);
    if (!ghost || !done.target || travel > 10) return;
    const href = `/log/${ghost.numbers.get(done.target.seat)}`;
    // As the table's links: the middle button, Cmd and Ctrl open the record in a new tab.
    if (done.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey) {
      window.open(href, "_blank");
    } else location.assign(href);
  };
  const cancel = () => {
    const had = press?.touch && press.target;
    press = null;
    if (had) {
      remark();
      redraw();
    }
  };
  if (ghost) {
    canvas.addEventListener("pointermove", moved);
    canvas.addEventListener("pointerleave", left);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
  }
  const sized = new ResizeObserver(refit);
  for (const element of [wide, narrow, host]) sized.observe(element);
  addEventListener("resize", refit);
  scheme.addEventListener("change", recolour);
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
    forced.removeEventListener("change", unforced);
    document.removeEventListener("visibilitychange", shown);
    unpick();
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
    hull = hullAt(sheet.level, ghost?.hull);
    await pause();
    if (!alive) return;
    stage = createStage(
      canvas,
      hull,
      Boolean(ghost),
      // The pick's hull, never drawn: the phone's level, whose plank edges are exact (every level's
      // stations hold each plank's ends) and whose stem departs from the desktop's by half a pixel
      // at 1440; the coarser 24 x 2 was up to a pixel off the drawn hull, so a sample it named a
      // plank could fall on the plank's lines or off the hull (B5.19).
      ghost ? buildHull(PHONE, ghost.hull) : undefined,
    );
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    await pause();
    if (!alive || !stage) return;
    stage.paint(palette(), seated);
    apply(measure(), true);
    remark();
    await pause();
    if (!alive || !stage || !loft) return;
    if (!ghost) stage.shade(shadowFor(hull, loft));
    await pause();
    if (!alive || !stage || !loft) return;
    compiling = stage.compile(loft);
    await compiling;
    compiling = null;
    built = true;
    if (alive && !blank) raf = requestAnimationFrame(first);
  };
  build().catch(() => {
    // No WebGL after all, or the build failed: the drawing is the page, as with the model Off.
    compiling = null;
    stop();
  });

  return { stop, settle };
}
