// The model's life on the page (.crew/sprint/25/contract.md, the data rules, and
// .crew/sprint/26/contract.md where it changes them): built after load when components/model.tsx
// imports this chunk, then landed, lofting and settled, or settled at once; and from then on still,
// drawing only on a resize or a scheme change. It lies on the drawing the page shows at its width,
// and moves to the other one, settled, when a resize crosses 768 px. Its one hook for tests and CSS
// is `[data-model]`'s data-state; nothing is put on window.

import {
  CREW_NARROW,
  CREW_WIDE,
  GHOST,
  type Layout,
  NARROW,
  ORDER,
  PLANKS,
  WIDE,
} from "@/lib/hull-layouts";
import { DURATION, ease, GHOST_OUTLINE_PX, OUTLINE_PX } from "./calls";
import {
  type CrewState,
  crewMove,
  detailLayout,
  focusLabel,
  isCrew,
  readState,
  sameState,
  tallied,
  tickSegments,
} from "./crew";
import {
  type GhostPage,
  near as nearLine,
  pencilLabel,
  readGhost,
  riderLabel,
  riders,
} from "./ghost";
import {
  buildHull,
  buildShip,
  DESKTOP,
  type Ghost,
  type Hull,
  type Level,
  PHONE,
  PICK,
  type Ship,
  YARD_DESKTOP,
  YARD_PHONE,
} from "./hull";
import { EDGE, type Frame, type Loft, makeLoft } from "./loft";
import { type Pencil, pencilMarks, readPencil } from "./pencil";
import { bakeShadow } from "./shadow";
import { createShips, type Plan, type Ships, type Step } from "./ships";
import { createStage, type Palette, type Stage } from "./stage";
import { type MakePress, startYard } from "./yard";

type State = "landed" | "lofting" | "settled" | "still";
type Rest = "settled" | "still";
/**
 * How the model opens (.crew/sprint/27/contract.md): `auto`, the loft once a visit (Full); `settled`
 * (Calm); `loft`, the loft whatever the visit has seen (a press of Full).
 */
export type Open = "auto" | "settled" | "loft";
type Box = NonNullable<Frame["box"]>;
/**
 * Where the canvas lies on the page and how big its buffer is; on the Log, where it lies over both
 * ships, `box` is the ghost's drawing in it and `theseus` the Theseus's.
 */
type Fit = Frame & {
  left: number;
  top: number;
  buffer: [number, number];
  theseus?: Box & { drawing: number };
};

type Riders = ReturnType<typeof riders>;

/**
 * One of the sheet's two drawings, and what the model is on it: its layout, level and ratio cap;
 * on `/`, the sprint in progress it draws in pencil and that plank's number, riding it
 * (.crew/sprint/34/; the narrow drawing has no numbers).
 */
type Sheet = {
  drawing: Element;
  layout: Layout;
  level: Level;
  cap: number;
  pencil: Pencil | null;
  ride: Riders | null;
};

/**
 * The once-a-visit flag in sessionStorage: the sheet's loft, the Log's camera move, and /crew's
 * lift off its detail drawing (.crew/sprint/36/contract.md, call 6).
 */
const PLAYED = "theseus:model";
const PLAYED_GHOST = "theseus:ghost";
const PLAYED_CREW = "theseus:crew";
/** A style write of ours on a riding number: its offsets, which the observer leaves alone. */
const OFFSETS = /--ghost-[xy]:[^;]*;?\s*/g;
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

/**
 * The Log's two ships at each level, built once a visit (.crew/sprint/55/contract.md): every seat
 * of the ghost is built, and a step's gaps are hidden by state.
 */
type Yard = { theseus: Ship; ghost: Ship; level: Level };
const yards = new Map<Level, Yard>();
const yardAt = (level: Level) => {
  const found = yards.get(level) ?? {
    theseus: buildShip(level, "theseus"),
    ghost: buildShip(level, "ghost"),
    level,
  };
  yards.set(level, found);
  return found;
};
/** The ghost's pick hull has every seat; a pick takes the first plank the step shows. */
const EVERY: Ghost = { seats: new Set(PLANKS.map((plank) => plank.id)) };

/**
 * The hulls after the i-th step, as the server draws /log/<n> (lib/lines-plan.ts, `shipsAt`): the
 * first i + 1 merges have seated ORDER's seats in turn, so both ships hold the same seats, and the
 * record's seat is the step's own. The drawing is the truth at rest; a press flies to this.
 */
const stepAt = (i: number): Step => {
  const seats = new Set(ORDER.slice(0, Math.min(i + 1, ORDER.length)));
  return { seated: seats, ghost: seats, current: ORDER[i % ORDER.length] };
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
    copper: token("--accent"),
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
  // The Log's other ship (.crew/sprint/55/contract.md): the Theseus, drawn on the same profile above
  // the ghost, in the same canvas. A press swaps both drawings' markup for the step's (`swapped`).
  const shipyard = ghostDrawing
    ? (host.parentElement?.querySelector("[data-theseus]") ?? null)
    : null;
  let theseusDrawing = shipyard?.querySelector(".plan-theseus") ?? null;
  let wide = ghostDrawing ?? plan?.querySelector(".plan-wide");
  let narrow = ghostDrawing ?? plan?.querySelector(".plan-narrow");
  if (!wide || !narrow || (ghostDrawing && !theseusDrawing)) {
    return { stop() {}, settle() {} };
  }
  let ghost: GhostPage | undefined = ghostDrawing
    ? readGhost(ghostDrawing)
    : undefined;
  let theseus: GhostPage | undefined = theseusDrawing
    ? readGhost(theseusDrawing)
    : undefined;
  // /crew's detail drawings (.crew/sprint/36/contract.md, "The hull on /crew"): `.plan-wide` and
  // `.plan-narrow` too, told apart by the plan's `data-focus`. What they show changes with each
  // told answer, so it is read again whenever the drawing changes (`sync`).
  const crew = isCrew(plan) ? plan : null;
  const key = crew ? PLAYED_CREW : ghost ? PLAYED_GHOST : PLAYED;
  /** What /crew's drawing shows now, the last time it was read. */
  let told: CrewState | null = crew ? readState(crew, wide) : null;
  /**
   * A drawing's pencil plank and its number, read off the drawing: the Log's ghost shows no pencil
   * (.crew/sprint/34/). On /crew the pencil is the run's while it is live or open, its tip only
   * while live, and the number riding the hull is the focus plank's, in every state.
   */
  const pencilled = (drawing: Element, layout: Layout) => {
    if (crew) {
      const run = told?.run;
      const found =
        run === "live" || run === "open" ? readPencil(drawing) : null;
      const label = focusLabel(drawing);
      // At its anchor's own point on the hull, which at rest is the point the move holds, so it
      // keeps its frame-1 place: centred between the plank's projected edges, as `/`'s number is,
      // it strayed up to 0.55 px under the turn (B4.36's bound is 1 px).
      return {
        pencil: found && { ...found, live: found.live && run === "live" },
        ride: label
          ? riders(
              { labels: [riderLabel(label, undefined, layout)] },
              layout,
              true,
            )
          : null,
      };
    }
    const pencil = ghost ? null : readPencil(drawing);
    const label = pencil && pencilLabel(drawing, pencil, layout);
    return {
      pencil,
      ride: label ? riders({ labels: [label] }, layout, true) : null,
    };
  };
  // The level and the cap follow the drawing, not the device (.crew/sprint/26/contract.md, "The
  // calls I made"): the three views from 768 px, the profile and half-breadth plan below. The
  // ghost's one drawing takes the desktop's level and cap from 768 px, the phone's below, and so do
  // /crew's two details (its contract, "The levels").
  const layouts = crew
    ? {
        wide: detailLayout(crew, CREW_WIDE),
        narrow: detailLayout(crew, CREW_NARROW),
      }
    : ghost
      ? { wide: GHOST, narrow: GHOST }
      : { wide: WIDE, narrow: NARROW };
  const sheets: Record<"wide" | "narrow", Sheet> = {
    wide: {
      drawing: wide,
      layout: layouts.wide,
      // The Log's two ships take the lower levels (.crew/sprint/55/contract.md, call 2).
      level: ghost ? YARD_DESKTOP : DESKTOP,
      cap: 2,
      ...pencilled(wide, crew ? layouts.wide : WIDE),
    },
    narrow: {
      drawing: narrow,
      layout: layouts.narrow,
      level: ghost ? YARD_PHONE : PHONE,
      cap: 1.5,
      ...pencilled(narrow, crew ? layouts.narrow : NARROW),
    },
  };
  /**
   * /crew's move turns about the plank being drawn, fixed at first paint: the tally's middle on its
   * lower edge if the server drew one, else the focus number's anchor (its contract, "Full").
   */
  const move = crew
    ? crewMove(crew.dataset.focus ?? "", tallied(crew))
    : undefined;
  const shownSheet = () =>
    matchMedia(THREE_VIEWS).matches ? sheets.wide : sheets.narrow;
  const canvas = document.createElement("canvas");
  host.append(canvas);
  let numbers = ghost ? riders(ghost) : null;
  /** The Theseus's numbers, riding its planks as the ghost's ride theirs. */
  let theseusNumbers = theseus ? riders(theseus) : null;
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
  /** The Log's scene, its two ships at the level shown, and the Theseus's loft (the ghost's is `loft`). */
  let ships: Ships | null = null;
  let yard: Yard | null = null;
  let theseusLoft: Loft | null = null;
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
  /** On the Log, the box over both ships: the Theseus's drawing's top to the ghost's bottom. */
  const shipsBox = () => {
    const g = sheet.drawing.getBoundingClientRect();
    const t = theseusDrawing?.getBoundingClientRect() ?? g;
    const [left, top] = [Math.min(g.left, t.left), Math.min(g.top, t.top)];
    const right = Math.max(g.right, t.right);
    const bottom = Math.max(g.bottom, t.bottom);
    return new DOMRect(left, top, right - left, bottom - top);
  };
  const shownBox = () =>
    box().width > 0
      ? ghost
        ? shipsBox()
        : (crew ? sheet.drawing : host).getBoundingClientRect()
      : box();
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
    const p = ghost ? shipsBox() : sheet.drawing.getBoundingClientRect();
    const h = box();
    // Whole buffer pixels, and the CSS size they make: round(css × dpr) / dpr (S4, rule 1).
    const buffer: [number, number] = [
      Math.round(p.width * ratio),
      Math.round(p.height * ratio),
    ];
    // Chromium lays a box out in 1/64 px, flooring: the ghost's CSS size and /crew's are rounded up
    // to it, so the buffer is never more than the ratio times the size the page lays out (107 / 1.5
    // = 71.333 reads back 71.328 at 390, over the 1.5 cap: B5.23).
    const css = (n: number) =>
      ghost || crew ? Math.ceil((n / ratio) * 64) / 64 : n / ratio;
    // On the Log each ship registers on its own drawing in the canvas, and turns inside it. Chromium
    // composites a canvas on whole device pixels, and a ship lies where it would have put a canvas
    // of its own on that drawing, so frame 1 registers as the ghost's own canvas did: drawn at its
    // drawing's fractional place, the ghost on /log/13 read 1.12 px off its 2D at 1440 (Y12).
    const g = sheet.drawing.getBoundingClientRect();
    const t = theseusDrawing?.getBoundingClientRect();
    const device = (n: number) => Math.round(n * devicePixelRatio);
    // A ship turns inside the part of its drawing the canvas holds: whole buffer rows can stop the
    // canvas up to half a row short of the lower drawing's bottom, and the ghost's keel then inked
    // the last row (0.67 at 1440 × 900, DPR 1: B5.18's edge clause). Frame 1 reads only the top.
    const within = (r: DOMRect) => {
      const top = (device(r.top) - device(p.top)) / devicePixelRatio;
      return {
        left: (device(r.left) - device(p.left)) / devicePixelRatio,
        top,
        height: Math.min(r.height, css(buffer[1]) - top),
      };
    };
    return {
      left: p.left - h.left,
      top: p.top - h.top,
      drawing: ghost ? g.width : p.width,
      width: css(buffer[0]),
      height: css(buffer[1]),
      viewport: innerHeight,
      buffer,
      ratio,
      ...(ghost && t
        ? { box: within(g), theseus: { ...within(t), drawing: t.width } }
        : {}),
    };
  };

  /**
   * Lays the canvas on the drawing and solves the loft for it, at that drawing's level; the
   * shadow too unless `keep` (a step of the ratio mid-move, on the same drawing).
   */
  const apply = (next: Fit, keep = false) => {
    if (ships) return applyShips(next);
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
    loft = makeLoft(next, hull.points, sheet.layout, move);
    if (reshade) stage.shade(shadowFor(hull, loft));
    stage.pencil(
      sheet.pencil && pencilMarks(sheet.pencil, sheet.layout, sheet.level),
    );
    if (crew) tally();
    numbers?.reset();
    // The other drawing is hidden: its number goes back to its place, and this one's is placed anew.
    for (const other of [sheets.wide, sheets.narrow]) {
      if (other === sheet) other.ride?.reset();
      else other.ride?.clear();
    }
    if (changed) remark();
  };

  /**
   * The Log's canvas over both ships (.crew/sprint/55/contract.md): each loft registers its ship
   * on its own drawing, and both settle at the ghost's turn (Iris, section 0).
   */
  function applyShips(next: Fit) {
    if (!ships) return;
    const level = yardAt(sheet.level);
    const changed = level !== yard;
    if (changed) ships.load(level);
    yard = level;
    fit = next;
    on = sheet;
    Object.assign(canvas.style, {
      left: `${next.left}px`,
      top: `${next.top}px`,
      width: `${next.width}px`,
      height: `${next.height}px`,
    });
    ships.fit(next.buffer, [next.width, next.height]);
    loft = makeLoft(next, level.ghost.points, GHOST);
    theseusLoft = makeLoft(
      {
        ...next,
        drawing: next.theseus?.drawing ?? next.drawing,
        box: next.theseus,
        // Its outline is the sheet's 1.6 px, heavier than the ghost's 1.4 that EDGE allows for:
        // held at its drawing's length, its bow's ink took half the canvas's top row (Y12).
        edge: EDGE + (OUTLINE_PX - GHOST_OUTLINE_PX) / 2,
      },
      level.theseus.points,
      GHOST,
    );
    led = "";
    numbers?.reset();
    theseusNumbers?.reset();
    if (changed) remark();
  }

  /** The ticks the stage holds: what the next frame draws, and `data-marks` once it has. */
  let marked = 0;
  /** /crew's ticks on the pencil plank, as the drawing shows them now (its contract, "A tick"). */
  function tally() {
    const pencil = (on ?? sheet).pencil;
    const ticks =
      told && pencil
        ? tickSegments(pencil.seat, told.marks)
        : new Float32Array(0);
    stage?.mark(ticks);
    marked = ticks.length / 6;
  }

  /** The planks the stage fills as seated card: on /crew, the drawing's now (call 3). */
  const seats = () => told?.seated ?? seated;

  /**
   * /crew's drawing changed: a told answer set `data-run`, added or took ticks, or seated planks
   * anew (call 3). Read again, and if the frame would differ, the stage takes it and draws 1 frame
   * at rest, or the move's next frame does; a change that draws the same frame draws none.
   */
  const sync = () => {
    if (!crew || !alive) return;
    const next = readState(crew, sheet.drawing);
    if (sameState(told, next)) return;
    told = next;
    for (const each of [sheets.wide, sheets.narrow]) {
      each.ride?.clear();
      Object.assign(each, pencilled(each.drawing, each.layout));
    }
    if (!stage || !on) return;
    stage.paint(palette(), seats());
    stage.pencil(on.pencil && pencilMarks(on.pencil, on.layout, on.level));
    tally();
    redraw();
  };

  /** Puts the model on the drawing shown: that drawing's level, ratio cap, loft and shadow. */
  const register = () => {
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
    apply(measure());
  };

  /**
   * The lines a ship's numbers clear at rest on the Log: all its seams, whichever seats the step
   * fills, and its outline; not the record's mark, which moves each step and lies on seams anyway.
   * A number's place then depends only on its own plank and the pose (Iris, press-iris.md 7).
   */
  const linesOf = (ship: Ship | undefined) => {
    if (!ship) return new Float32Array(0);
    const all = new Float32Array(ship.seams.length + ship.outline.length);
    all.set(ship.seams);
    all.set(ship.outline, ship.seams.length);
    return all;
  };

  /** The leaders laid last, as "e:shown", so a frame that keeps them rebuilds no batch. */
  let led = "";

  /** Each led-out number's leader as segment pairs in its ship's frame. */
  const pairs = (lines: { points: number[][] }[]) => {
    const all: number[] = [];
    for (const { points } of lines) {
      for (let i = 1; i < points.length; i++) {
        all.push(...(points[i - 1] ?? []), ...(points[i] ?? []));
      }
    }
    return new Float32Array(all);
  };

  /** Sets both ships' numbers on the frame at e, each on its own drawing in the canvas. */
  const placeNumbers = (e: number) => {
    if (!fit || !loft || !theseusLoft) return;
    const shown = matchMedia(THREE_VIEWS).matches;
    const at = (box?: Box): [number, number] => [box?.left ?? 0, box?.top ?? 0];
    numbers?.place(
      loft,
      fit.drawing / GHOST.box[2],
      e,
      shown,
      () => linesOf(yard?.ghost),
      at(fit.box),
    );
    theseusNumbers?.place(
      theseusLoft,
      (fit.theseus?.drawing ?? fit.drawing) / GHOST.box[2],
      e,
      shown,
      () => linesOf(yard?.theseus),
      at(fit.theseus),
    );
  };

  /** One frame of the Log's two ships at e, and, at rest, their numbers riding them. */
  const drawShips = (e: number) => {
    if (!ships || !loft || !theseusLoft) return;
    const shown = matchMedia(THREE_VIEWS).matches;
    const key = `${e}:${shown}`;
    if (key !== led) {
      led = key;
      ships.lead({
        ghost: pairs(numbers?.leaders(e, shown) ?? []),
        theseus: pairs(theseusNumbers?.leaders(e, shown) ?? []),
      });
    }
    ships.draw(e, { theseus: theseusLoft, ghost: loft });
    if (pressing) ride();
    else placeNumbers(e);
  };

  const draw = (e: number) => {
    if (ships) return drawShips(e);
    if (!stage || !loft) return;
    stage.draw(e, loft);
    // /crew's one test hook beside data-state: the ticks this frame drew (its contract, "At rest").
    if (crew) host.dataset.marks = String(marked);
    if (fit && on?.ride) {
      on.ride.place(
        loft,
        fit.drawing / on.layout.box[2],
        e,
        true,
        () => new Float32Array(0),
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
    if ((!stage && !ships) || !state || moving() || pressing) return;
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
    // A press in flight lands at once, on the drawing it flew over.
    finish(false);
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
    if ((!stage && !ships) || !box().width) return;
    // A refit is at rest or ends the move, so it is at the cap; a zoom may have moved the cap.
    cap = Math.min(devicePixelRatio, sheet.cap);
    ratio = cap;
    const next = measure();
    if (!next.buffer[0] || !next.buffer[1]) return;
    // Where the canvas lies, and on the Log where each ship lies in it.
    const where = (f: Fit) =>
      [
        f.buffer.join(),
        f.left,
        f.top,
        f.drawing,
        f.viewport,
        f.box?.left,
        f.box?.top,
        f.theseus?.left,
        f.theseus?.top,
      ].join();
    if (fit && on === sheet && where(fit) === where(next)) return;
    finish(false);
    apply(next);
    if (moving()) rest("settled");
    else redraw();
  };

  const recolour = () => {
    if (ships) {
      finish(false);
      ships.paint(palette());
      return redraw();
    }
    if (!stage) return;
    stage.paint(palette(), seats());
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
      // A press lands, to be drawn once the tab is back.
      finish(false);
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
    finish(false);
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
    // The marks go with the hover now, so the restored frame inks no plank the pointer has left
    // (Lens's nit on 9b8743a).
    remark();
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
  seen.observe(ghost ? wide : (crew ?? host));
  // /crew's drawing follows the poll (call 4: the interface between Forge's drawing and this
  // chunk). Every change to it but our own riding offsets is read again (`sync`); a told answer
  // that changes nothing changes no node, so it draws nothing.
  const ours = (record: MutationRecord) =>
    record.type === "attributes" &&
    record.attributeName === "style" &&
    record.target instanceof Element &&
    (record.oldValue ?? "").replace(OFFSETS, "").trim() ===
      (record.target.getAttribute("style") ?? "").replace(OFFSETS, "").trim();
  const watched = crew
    ? new MutationObserver((records) => {
        if (!records.every(ours)) sync();
      })
    : null;
  if (crew) {
    watched?.observe(crew, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true,
    });
  }
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
  const same = (a: Target | null | undefined, b: Target | null | undefined) =>
    a?.seat === b?.seat && a?.side === b?.side;
  /** The ink marks: the record's plank, and the one under the pointer or the finger. */
  function remark() {
    const record = ghost?.current
      ? { seat: ghost.current, side: 1 }
      : undefined;
    const lit = press?.touch ? press.target : hovered;
    // The scene inks the step's record seat itself, on both ships (`show`).
    ships?.hover(same(lit, record) ? null : lit);
  }
  const resting = () => state === "settled" || state === "still";
  /** The plank under a point of the viewport, as the settled frame draws it. */
  const pickAt = (x: number, y: number): Target | null => {
    // Hover is off while a press moves a plank (Iris, section 6).
    if (!ghost || (!stage && !ships) || !loft || !resting() || pressing) {
      return null;
    }
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
    const page = ghost;
    // The Log's pick hull has every seat: the first hit the step shows is the plank.
    const hit = ships?.pick(x - r.left, y - r.top, (slot) =>
      page.numbers.has(PLANKS[slot]?.id ?? ""),
    );
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
    theseusNumbers?.clear();
    sheets.wide.ride?.clear();
    sheets.narrow.ride?.clear();
  }
  const moved = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && !press) {
      hover(pickAt(event.clientX, event.clientY));
    }
  };
  const left = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    // A mouse or pen press dragged off the canvas is a cancelled click: its release lands off the
    // canvas, and a press left set would stop every hover until the next press here.
    if (press?.id === event.pointerId) press = null;
    hover(null);
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
    const travel = Math.hypot(event.clientX - done.x, event.clientY - done.y);
    const opens = Boolean(ghost && done.target && travel <= 10);
    // As the table's links: the middle button, Cmd and Ctrl open the record in a new tab.
    const tab =
      done.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey;
    // A tap that opens its record here keeps its plank inked until the page goes; one that
    // scrolled, or opened a tab, leaves this page as it was (Lens's nit on 9b8743a).
    if (done.touch && done.target && !(opens && !tab)) {
      remark();
      redraw();
    }
    if (!ghost || !done.target || !opens) return;
    const href = `/log/${ghost.numbers.get(done.target.seat)}`;
    if (tab) {
      // No opener, so the tab starts its own session and plays the move (B5.20).
      window.open(href, "_blank", "noopener");
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
  for (const element of [wide, narrow, host, crew, theseusDrawing]) {
    if (element) sized.observe(element);
  }
  if (theseusDrawing) seen.observe(theseusDrawing);
  addEventListener("resize", refit);
  scheme.addEventListener("change", recolour);
  forced.addEventListener("change", unforced);
  document.addEventListener("visibilitychange", shown);

  // The press (.crew/sprint/55/contract.md; Iris's calls, press-iris.md): Forge's controller
  // (lib/model/yard.ts) takes the Log's step links and keys, and asks this for one plank's move
  // between two steps. Full flies it in beats, Calm fades it, and a jump, an unseen page or a model
  // not yet drawn takes the step at once. The scene is the truth for the canvas; the drawings,
  // swapped once the plank lands, are the truth for the numbers, and at rest for both.
  /** The merged sprints, ascending: the steps the controller indexes. */
  let steps: readonly number[] = [];
  /** The step the hulls show at rest, read off the drawings or flown to. */
  let showing: Step | null = null;
  /** The press in progress: its plan, which way it plays, and how it ends. */
  let pressing: {
    plan: Plan;
    back: boolean;
    to: Step;
    begin: number;
    length: number;
    /** The beat drawn last, in ms into the press played forward. */
    at: number;
    done: () => void;
    /** The leaving number on steps 24 to 51: a card plank's, riding it and fading with it. */
    rider: { span: HTMLElement; x: string; y: string; clone: boolean } | null;
    /** Scroll lands it only from its first frame: the words' swap may scroll the page itself. */
    scrolls: boolean;
    /** The numbers the flying plank can pass over: their middles on the canvas, and if hidden. */
    under: { span: HTMLElement; x: number; y: number; hidden: boolean }[];
  } | null = null;

  /** Whether (x, y) is inside a polygon (even-odd). */
  const inside = (shape: readonly [number, number][], x: number, y: number) => {
    let found = false;
    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
      const [xi = 0, yi = 0] = shape[i] ?? [];
      const [xj = 0, yj = 0] = shape[j] ?? [];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        found = !found;
      }
    }
    return found;
  };

  /**
   * The numbers a press's flight can hide, both drawings' but its seat's and the one riding it:
   * each one's middle on the canvas, read once at the start, since at rest no number moves.
   */
  const underFlight = (rider: HTMLElement | undefined) => {
    const r = canvas.getBoundingClientRect();
    return [...(ghost?.labels ?? []), ...(theseus?.labels ?? [])]
      .map(({ span }) => ({ span, box: span.getBoundingClientRect() }))
      .filter(
        ({ span, box }) =>
          span !== rider && box.width > 0 && span.style.visibility !== "hidden",
      )
      .map(({ span, box }) => ({
        span,
        x: box.left + box.width / 2 - r.left,
        y: box.top + box.height / 2 - r.top,
        hidden: false,
      }));
  };

  /**
   * A number whose middle is inside the flying plank's outline is under it, and hidden, a hard cut
   * as occlusion is (Iris, section 7): the numbers paint above the canvas.
   */
  const occlude = () => {
    const p = pressing;
    if (!p || !ships) return;
    const shape = ships.over();
    for (const each of p.under) {
      const under = Boolean(shape && inside(shape, each.x, each.y));
      if (under === each.hidden) continue;
      each.hidden = under;
      each.span.style.visibility = under ? "hidden" : "";
    }
  };

  /** The step the drawings show: the Theseus's seated planks, the ghost's seats, the record's. */
  const readStep = (): Step => ({
    seated: theseus?.hull.seats ?? new Set(),
    ghost: ghost?.hull.seats ?? new Set(),
    current: ghost?.current,
  });
  const sameStep = (a: Step | null, b: Step) =>
    Boolean(a) &&
    a?.current === b.current &&
    [...PLANKS].every(
      ({ id }) =>
        a?.seated.has(id) === b.seated.has(id) &&
        a?.ghost.has(id) === b.ghost.has(id),
    );

  /**
   * Frames left in which a scroll is the page's own: the controller swaps the step's words, and
   * scroll anchoring may then move the page, its scroll event a frame after the layout.
   */
  let quiet = 0;
  const reworded = ghost
    ? new MutationObserver((records) => {
        const words = records.some((record) => {
          const at =
            record.target instanceof Element
              ? record.target
              : record.target.parentElement;
          return !at?.closest("[data-ghost], [data-theseus], [data-model]");
        });
        if (words) quiet = 2;
      })
    : null;
  if (host.parentElement) {
    reworded?.observe(host.parentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  /** Any input lands a moving plank at once (the contract; Iris, section 6). */
  const pressInput = (event: Event) => {
    if (event.type === "scroll" && (!pressing?.scrolls || quiet > 0)) return;
    finish();
  };
  const pressListen = (active: boolean) => {
    for (const type of INPUTS) {
      if (active) {
        addEventListener(type, pressInput, { capture: true, passive: true });
      } else removeEventListener(type, pressInput, { capture: true });
    }
  };

  /**
   * The numbers at the press's seat that leave at its start (Iris, section 6): the Theseus's, and
   * the ghost's where the press changes the ghost (steps 1 to 23); from 24 its number stays.
   */
  const atSeat = (plan: Plan) =>
    [
      ...(plan.lo.ghost.has(plan.seat) === plan.hi.ghost.has(plan.seat)
        ? []
        : (ghost?.labels ?? [])),
      ...(theseus?.labels ?? []),
    ]
      .filter((label) => label.seat === plan.seat)
      .map((label) => label.span);

  /**
   * The press's numbers: every one at its seat hidden, but on steps 24 to 51 the card plank's that
   * leaves, which rides it and fades (Iris, section 1). Played back, that number is the plank's
   * coming home, which the drawing doesn't hold yet: a copy of the seat's span, renumbered.
   */
  const hideNumbers = (plan: Plan, back: boolean, hi: number) => {
    const own = theseus?.labels.find((label) => label.seat === plan.seat)?.span;
    for (const span of atSeat(plan)) span.style.visibility = "hidden";
    // The plank that leaves forward is the step before's: an original has no number.
    const holder = steps[hi - ORDER.length];
    if (!own || !plan.lo.seated.has(plan.seat) || holder === undefined) {
      return null;
    }
    const span = back ? (own.cloneNode(true) as HTMLElement) : own;
    if (back) {
      span.textContent = String(holder);
      own.after(span);
    }
    span.style.visibility = "";
    return {
      span,
      x: own.style.getPropertyValue("--ghost-x"),
      y: own.style.getPropertyValue("--ghost-y"),
      clone: back,
    };
  };

  /**
   * The leaving number at the press's beat `ms` (played forward): riding its plank's lift and
   * fading with it in Full, fading in place in Calm, gone once the new plank is in.
   */
  function ride(ms = pressing?.at ?? 0) {
    const p = pressing;
    const rider = p?.rider;
    if (!p || !rider || !ships) return;
    const { style } = rider.span;
    const shift = (base: string, by: number) =>
      `${(Number.parseFloat(base) || 0) + by}px`;
    const flown = p.plan.kind === "fade" ? null : ships.flown();
    style.setProperty("--ghost-x", shift(rider.x, flown?.dx ?? 0));
    style.setProperty("--ghost-y", shift(rider.y, flown?.dy ?? 0));
    const alpha =
      ms <= 0
        ? 1
        : ms >= p.length
          ? 0
          : p.plan.kind === "fade"
            ? 1 - ms / p.length
            : (flown?.alpha ?? 0);
    style.opacity = String(alpha);
  }

  /** One frame of the press at `ms` into it played forward. */
  const pressFrame = (ms: number) => {
    if (!pressing || !ships) return;
    pressing.at = ms;
    ships.beat(ms);
    drawShips(1);
    occlude();
  };

  /**
   * Lands the press at once (`land`), or at its end: the step's frame, a cold load's, drawn once,
   * or left for the next redraw when nobody can see it (`draw` false, or a hidden page). Then
   * `go` resolves. Idempotent, and nothing at rest.
   */
  function finish(draw = true) {
    const p = pressing;
    if (!p || !ships) return;
    cancelAnimationFrame(raf);
    raf = 0;
    pressListen(false);
    const end = p.back ? 0 : p.length;
    p.at = end;
    ships.beat(end, true);
    // The frame is the step's at the cap, as a still frame is (`rest`).
    if (ratio < cap) step(cap);
    if (draw && !document.hidden && near()) {
      pending = false;
      drawShips(1);
    } else pending = true;
    pressing = null;
    ships.press(null);
    ships.show(p.to);
    showing = p.to;
    if (p.rider && !p.rider.clone) p.rider.span.style.opacity = "0";
    for (const each of p.under) {
      if (each.hidden) each.span.style.visibility = "";
    }
    delete host.dataset.press;
    delete host.dataset.pressKind;
    p.done();
  }

  const pressTick = (now: number) => {
    raf = 0;
    const p = pressing;
    if (!p || !alive) return;
    // From its first frame a scroll lands it too, but for a scroll the words' swap made.
    p.scrolls = true;
    if (quiet > 0) quiet--;
    const t = Math.max(0, now - p.begin);
    if (t >= p.length) return finish();
    // The loft's quality rule: three frames over 22 ms step the ratio down a rung; at 1, six over
    // 33.4 ms land the plank, the frame then still.
    const interval = now - last;
    last = now;
    slow = interval > SLOW_MS ? slow + 1 : 0;
    stall = interval > STALL_MS ? stall + 1 : 0;
    if (ratio > 1 && slow >= 3) {
      slow = 0;
      stall = 0;
      step(below(ratio));
      if (loft && theseusLoft) {
        ships?.press(p.plan, { theseus: theseusLoft, ghost: loft });
      }
    } else if (ratio <= 1 && stall >= 6) {
      finish(false);
      return rest("still");
    }
    pressFrame(p.back ? p.length - t : t);
    raf = requestAnimationFrame(pressTick);
  };

  /**
   * The controller's press (lib/model/yard.ts): `go` moves the hulls from one step to the next,
   * `land` lands a moving plank at once.
   */
  const makePress: MakePress = (list) => {
    steps = list;
    return {
      go(from, to) {
        finish();
        const target = stepAt(to);
        if (!alive) return Promise.resolve();
        // Not drawn yet: frame 1 reads the drawing the controller swaps in once this resolves.
        if (
          !ships ||
          !built ||
          blank ||
          !state ||
          !loft ||
          !theseusLoft ||
          !fit
        ) {
          return Promise.resolve();
        }
        // A moving loft lands first: play starts only from rest (B3.1).
        if (moving()) rest("settled");
        showing = target;
        // A jump, or a page nobody sees: the step at once, drawn when it can be seen.
        if (Math.abs(to - from) !== 1 || document.hidden || !near()) {
          ships.show(target);
          redraw();
          return Promise.resolve();
        }
        const hi = Math.max(from, to);
        const back = to < from;
        const plan: Plan = {
          seat: ORDER[hi % ORDER.length] ?? "",
          lo: stepAt(hi - 1),
          hi: stepAt(hi),
          kind:
            open === "settled" ? "fade" : hi < ORDER.length ? "carry" : "crew",
          narrow: sheet === sheets.narrow,
          drawing: fit.drawing,
        };
        // Hover is off, and the record's marks leave both ships, at the press's start: its first
        // frame draws that, so nothing is drawn now.
        hovered = null;
        press = null;
        delete host.dataset.pick;
        canvas.style.cursor = "";
        ships.press(plan, { theseus: theseusLoft, ghost: loft });
        host.dataset.press = plan.seat;
        host.dataset.pressKind = plan.kind === "fade" ? "fade" : "fly";
        const length = ships.length(plan);
        return new Promise<void>((done) => {
          const now = performance.now();
          pressing = {
            plan,
            back,
            to: target,
            begin: now,
            length,
            at: back ? length : 0,
            done,
            rider: null,
            scrolls: false,
            under: [],
          };
          const p = pressing;
          p.rider = hideNumbers(plan, back, hi);
          p.under = underFlight(p.rider?.span);
          last = now;
          slow = 0;
          stall = 0;
          pressListen(true);
          raf = requestAnimationFrame(pressTick);
        });
      },
      land: () => finish(),
    };
  };

  /**
   * The controller swapped a drawing's markup for the step's (lib/model/yard.ts): read both again.
   * Their numbers are new nodes, placed on the hulls before the next paint. At rest, a drawing that
   * shows another step than the hulls do (a slow page, a jump) is the truth, and draws a frame.
   */
  const swapped = () => {
    if (!alive || !ghost) return;
    const g = plan?.querySelector(".plan-ghost");
    const t = shipyard?.querySelector(".plan-theseus");
    if (!g || !t || (g === wide && t === theseusDrawing)) return;
    const before = leadsNow();
    for (const old of [wide, theseusDrawing]) {
      if (old) {
        sized.unobserve(old);
        seen.unobserve(old);
      }
    }
    numbers?.clear();
    theseusNumbers?.clear();
    wide = g;
    narrow = g;
    theseusDrawing = t;
    sheets.wide.drawing = g;
    sheets.narrow.drawing = g;
    for (const element of [g, t]) {
      sized.observe(element);
      seen.observe(element);
    }
    ghost = readGhost(g);
    theseus = readGhost(t);
    numbers = riders(ghost);
    theseusNumbers = riders(theseus);
    if (pressing) {
      // Mid-press, the drawing is a step behind the hulls: its seat's numbers leave too.
      for (const span of atSeat(pressing.plan)) {
        span.style.visibility = "hidden";
      }
      return;
    }
    if (!ships) return;
    const drawn = readStep();
    const changed = !sameStep(showing, drawn) || before !== leadsNow();
    showing = drawn;
    if (changed) {
      ships.show(drawn);
      led = "";
    }
    if (!state) return;
    if (changed) redraw();
    else placeNumbers(1);
  };
  /** Both ships' leaders at rest, as text, so a swap that keeps them draws no frame. */
  function leadsNow() {
    const shown = matchMedia(THREE_VIEWS).matches;
    return [numbers, theseusNumbers]
      .map((each) => pairs(each?.leaders(1, shown) ?? []).join())
      .join("|");
  }
  const swaps = ghost ? new MutationObserver(swapped) : null;
  for (const element of [plan, shipyard]) {
    if (element && swaps) swaps.observe(element, { childList: true });
  }
  /** The controller's teardown, once it has taken the Log's step links. */
  const unyard = ghost ? startYard(document, makePress) : null;

  function stop() {
    // The controller first: torn down mid-flight it puts the step's page up at once; then the
    // plank lands, unseen, and `go` resolves.
    unyard?.();
    finish(false);
    swaps?.disconnect();
    reworded?.disconnect();
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(crossing);
    listen(false);
    seen.disconnect();
    sized.disconnect();
    watched?.disconnect();
    removeEventListener("resize", refit);
    scheme.removeEventListener("change", recolour);
    forced.removeEventListener("change", unforced);
    document.removeEventListener("visibilitychange", shown);
    unpick();
    canvas.removeEventListener("webglcontextlost", lost);
    canvas.removeEventListener("webglcontextrestored", restored);
    // three's compile polls the programs on a timer: disposing under it is left until it settles.
    const done = stage ?? ships;
    const dispose = () => done?.dispose();
    if (compiling !== null) compiling.then(dispose, dispose);
    else dispose();
    stage = null;
    ships = null;
    canvas.remove();
    delete host.dataset.state;
    delete host.dataset.marks;
  }

  // The build, in steps with a yield between them, so a key press isn't held behind one long
  // task (build note 9): the geometry, the renderer and scene, the loft, the shadow, the programs.
  const build = async () => {
    await pause();
    if (!alive) return;
    if (ghost) return buildShips();
    hull = hullAt(sheet.level);
    await pause();
    if (!alive) return;
    stage = createStage(canvas, hull, Boolean(crew));
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    await pause();
    if (!alive || !stage) return;
    stage.paint(palette(), seats());
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
  /** The Log's build: both ships at the drawing's level, the scene, the lofts, the programs. */
  async function buildShips() {
    yard = yardAt(sheet.level);
    await pause();
    if (!alive) return;
    ships = createShips(canvas, yard, buildHull(PICK, EVERY));
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    await pause();
    if (!alive || !ships) return;
    ships.paint(palette());
    showing = readStep();
    ships.show(showing);
    apply(measure(), true);
    remark();
    await pause();
    if (!alive || !ships || !loft || !theseusLoft) return;
    compiling = ships.compile({ theseus: theseusLoft, ghost: loft });
    await compiling;
    compiling = null;
    built = true;
    if (alive && !blank) raf = requestAnimationFrame(first);
  }
  build().catch(() => {
    // No WebGL after all, or the build failed: the drawing is the page, as with the model Off.
    compiling = null;
    stop();
  });

  return { stop, settle };
}
