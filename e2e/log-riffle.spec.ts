import {
  type Browser,
  type CDPSession,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { canvasBox } from "./ghost";
import { LOG, recordOf, YARD_WORDS } from "./log";
import {
  type Box,
  FIRST,
  FRAME,
  note,
  pause,
  REST,
  SHOWN,
  TRIANGLES_AT,
  whole,
} from "./model";
import { NEWEST_STEP, PLANK_IDS, SEAT_OF, STEPS } from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";
import {
  changed,
  goalOf,
  linkAt,
  readSafe,
  readWords,
  sameSize,
  shoot,
  sum,
  tagDocument,
} from "./yard";

// Sprint 56, Yd: hold to riffle (.crew/sprint/56/contract.md, Y20 to Y24). On /log/n in Full and
// Calm a step link held down (pointer or touch), or ← or → held, riffles the two ships plank by
// plank: one step at once, then, if still held 400 ms later, steps 400 ms easing to 80 ms apart
// (never under 400 in Calm), stopping by itself at a chapter (23, 45, the newest; backward 45, 23,
// the first) or when let go. Home and End on a step link jump to the first and newest steps; the
// newest step and /log carry the hand-off link to /crew.
//
// The hooks are Yc's, read through the recorder below, so the checks don't depend on how the
// controller schedules its steps:
// - a step starts when `[data-model]` takes a `data-press` value (the seat it moves; the mount's
//   `go` sets it on every one-plank move, and a move that lands the one before it removes and sets
//   it in one task, both recorded), and has landed when `data-press` is removed;
// - `[data-yard-live]`, whose every non-empty text is recorded with its clock time;
// - B3's `data-state` and the harness's frame recorder (e2e/webgl.ts).
// Every riffle is held on Playwright's clock (`page.clock`): the clock's time is the page's, so a
// gap is exact whether the controller paces by timers or frames. Each step's words come from the
// server in real time; the hulls never wait on them (the contract's point 5).

const ONE_FRAME = Math.ceil(FRAME);
/** A press held this long starts the riffle; its first gap (the contract's point 1). */
const HOLD = 400;
/** The riffle's fastest gap in Full, and the floor (point 2). */
const FASTEST = 80;
/** Calm's gap, and under reduced motion with no mode stored: never faster (point 2). */
const CALM_GAP = 400;
/** The clock moved between reads while held: two frames, about a key's autorepeat. */
const CHUNK = 2 * ONE_FRAME;
/** A held key's autorepeat starts after this long, as an OS's does. */
const REPEAT_AFTER = 500;
/** How long a press stays held past its last step, to show a stop holds while held. */
const HELD_PAST = 1500;
/** The canvas against a cold Calm load: Y15's tolerance, a share of pixels off by 8 levels. */
const OFF_R = 0.0001;
const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
/** The 3D chunk's gzip -9 bytes on the head before Yd (3f578f9, Yc merged), read by Y24 there. */
const YC_CHUNK = 164_627;

type Size = { width: number; height: number };
const DESKTOP: Size = { width: 1440, height: 900 };
const PHONE: Size = { width: 390, height: 844 };

// ---------------------------------------------------------------------------------------------
// The steps and their stops (the contract's point 3)

/** The chapters: the 22nd merge (23), the 44th (45), and every 22nd after them. */
const CHAPTERS = STEPS.filter((_, i) => (i + 1) % PLANK_IDS.length === 0);
/** Where a riffle stops going forward (a chapter or the newest) or backward (one or the first). */
const STOPS = {
  forward: new Set([...CHAPTERS, NEWEST_STEP]),
  backward: new Set([...CHAPTERS, STEPS[0] ?? 1]),
};

/** The step a riffle from `from` stops on, going `by` (1 or -1). */
function stopFrom(from: number, by: 1 | -1) {
  const stops = by > 0 ? STOPS.forward : STOPS.backward;
  let i = STEPS.indexOf(from) + by;
  while (i > 0 && i < STEPS.length - 1 && !stops.has(STEPS[i] ?? -1)) i += by;
  return STEPS[i] ?? Number.NaN;
}

/**
 * The seats `data-press` names, in order, stepping from `from` to `to`: going forward each step's
 * own seat, going back the seat of the step left (the mount's plan, ORDER[max(i, j) mod 22]).
 */
function seatsBetween(from: number, to: number) {
  const [a, b] = [STEPS.indexOf(from), STEPS.indexOf(to)];
  const seats: string[] = [];
  if (b > a)
    for (let i = a + 1; i <= b; i++)
      seats.push(SEAT_OF.get(STEPS[i] ?? 0) ?? "");
  else for (let i = a; i > b; i--) seats.push(SEAT_OF.get(STEPS[i] ?? 0) ?? "");
  return seats;
}

/** The step `n` steps from `from`. */
const stepsOn = (from: number, n: number) =>
  STEPS[STEPS.indexOf(from) + n] ?? Number.NaN;

const stepOfPath = (path: string) => Number(/^\/log\/(\d+)$/.exec(path)?.[1]);

// ---------------------------------------------------------------------------------------------
// The recorder

type Riffle = {
  steps: { seat: string; t: number }[];
  ends: number[];
  live: { text: string; t: number }[];
  menus: { prevented: boolean; t: number }[];
};

/**
 * An init script: every step's start (data-press taking a value) and landing (data-press removed)
 * on [data-model], every non-empty text of the live region, and every contextmenu event with
 * whether the page cancelled it, each with performance.now() (the clock's, when it is installed).
 */
function recordRiffle() {
  const log: Riffle = { steps: [], ends: [], live: [], menus: [] };
  (window as Window & { __riffle?: Riffle }).__riffle = log;
  addEventListener(
    "contextmenu",
    (event) => {
      // Last in the bubble, on window, so the page's own listeners have run.
      queueMicrotask(() =>
        log.menus.push({
          prevented: event.defaultPrevented,
          t: performance.now(),
        }),
      );
    },
    true,
  );
  const watch = () => {
    const host = document.querySelector("[data-model]");
    if (host) {
      new MutationObserver((records) => {
        const t = performance.now();
        for (let i = 0; i < records.length; i++) {
          const after =
            i + 1 < records.length
              ? (records[i + 1]?.oldValue ?? null)
              : host.getAttribute("data-press");
          if (after === null) log.ends.push(t);
          else log.steps.push({ seat: after, t });
        }
      }).observe(host, {
        attributeFilter: ["data-press"],
        attributeOldValue: true,
      });
    }
    const live = document.querySelector("[data-yard-live]");
    if (live) {
      new MutationObserver(() => {
        const text = (live.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text) log.live.push({ text, t: performance.now() });
      }).observe(live, { childList: true, characterData: true, subtree: true });
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch, { once: true });
  } else watch();
}

function readRiffle(page: Page) {
  return page.evaluate(() => {
    const log = (window as Window & { __riffle?: Riffle }).__riffle;
    return {
      steps: [...(log?.steps ?? [])],
      ends: [...(log?.ends ?? [])],
      live: [...(log?.live ?? [])],
      menus: [...(log?.menus ?? [])],
      press:
        document.querySelector("[data-model]")?.getAttribute("data-press") ??
        null,
      path: location.pathname,
      now: performance.now(),
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Pages

/** A run on the clock with the recorder, at `size` (Full unless `options` store a mode). */
async function riffleRun(browser: Browser, options: ModelOptions) {
  const run = await openModel(browser, { ...options, clock: true });
  await run.context.addInitScript(recordRiffle);
  return run;
}

/**
 * `url` at rest on the clock, as log-press's atRestOnClock: Full's loft landed by a key, Calm
 * opened settled; the clock runs a second for the neighbours' prefetch, the pointer is off the
 * canvas and focus is on main.
 */
async function restOn(run: ModelRun, url: string) {
  await run.goto(url);
  const first = await run.until([...SHOWN], 4, FIRST);
  if (first === "landed" || first === "lofting") {
    await run.page.keyboard.press("Tab");
    await pause(150);
    await run.step(2 * ONE_FRAME);
  }
  expect(await run.state(), `${url} at rest on the clock`).toBe("settled");
  await run.page.mouse.move(2, 2);
  await focusMain(run.page);
  await run.step(1000);
  await pause(500);
  await tagDocument(run.page);
}

function focusMain(page: Page) {
  return page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  });
}

/** The canvas's box, grown to whole CSS px. */
async function clipOf(page: Page) {
  const b = await canvasBox(page);
  expect(b, "[data-model] canvas's box").not.toBeNull();
  return whole(b as Box);
}

/** A fresh Calm load of `url` at rest: the step's settled canvas, with its clip (Y13's R). */
async function coldCanvas(browser: Browser, url: string, size: Size) {
  const run = await openModel(browser, { ...size, stored: "calm" });
  await run.goto(url);
  await run.waitFor([...REST], FIRST);
  await run.page.mouse.move(2, 2);
  await pause(400);
  const clip = await clipOf(run.page);
  const image = await shoot(run.page, clip);
  const errors = [...run.errors];
  await run.close();
  return { image, clip, errors };
}

/** Waits for the press to land on `target` with the clock running a frame at a time. */
async function settleOn(run: ModelRun, target: string, timeout = 20_000) {
  const end = Date.now() + timeout;
  let now = await readSafe(run.page);
  while (Date.now() < end) {
    if (now.path === target && !now.press && (now.live ?? "") !== "") break;
    await run.step(ONE_FRAME);
    await pause(40);
    now = await readSafe(run.page);
  }
  await pause(200);
  return readSafe(run.page);
}

/** The tab hidden or shown, as a page sees it (log-press's setHidden, B5.23's). */
function setHidden(page: Page, hidden: boolean) {
  return page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (value ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

// ---------------------------------------------------------------------------------------------
// Holds

type Hold = {
  name: string;
  down: () => Promise<unknown>;
  up: () => Promise<unknown>;
  /** A held key's autorepeat, sent between the clock's steps. */
  repeat?: () => Promise<unknown>;
};

/** A step link held with the mouse at its centre, as a visitor holds it. */
async function pointerHold(
  page: Page,
  kind: "previous" | "next",
): Promise<Hold> {
  const at = await linkAt(page, kind);
  expect(at, `a shown a[data-step="${kind}"] on ${page.url()}`).not.toBeNull();
  const { x, y } = at ?? { x: 0, y: 0 };
  return {
    name: `holding ${kind === "next" ? "Next" : "Previous"} with the mouse`,
    down: async () => {
      await page.mouse.move(x, y);
      await page.mouse.down();
    },
    up: () => page.mouse.up(),
  };
}

/** A step link held with a finger, through the protocol's touch events (e2e/model.ts's way). */
async function touchHold(
  page: Page,
  kind: "previous" | "next",
): Promise<Hold & { at: { x: number; y: number } }> {
  const at = await linkAt(page, kind);
  expect(at, `a shown a[data-step="${kind}"] on ${page.url()}`).not.toBeNull();
  const point = at ?? { x: 0, y: 0 };
  let cdp: CDPSession | null = null;
  return {
    name: `holding ${kind === "next" ? "Next" : "Previous"} with a finger`,
    at: point,
    down: async () => {
      cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
    },
    up: async () => {
      await cdp?.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp?.detach();
    },
  };
}

/** A key held down, with the OS's autorepeat (Playwright sends a held key's down again as a repeat). */
const keyHold = (page: Page, key: string): Hold => ({
  name: `holding ${key}`,
  down: () => page.keyboard.down(key),
  up: () => page.keyboard.up(key),
  repeat: () => page.keyboard.down(key),
});

type Ride = {
  /** Steps started from the down to the stop action, clock ms from the down. */
  held: { seat: string; t: number }[];
  /** Steps started after the stop action, over `after` ms of clock. */
  after: { seat: string; t: number }[];
  /** Clock ms from the down to the hold's up. */
  stoppedAt: number;
  /** data-press right before the hold's up: a plank in flight, or null. */
  pressAtStop: string | null;
  /** Landings (data-press removed), clock ms from the down. */
  ends: number[];
  /** The live region's non-empty texts from the down on, clock ms from it. */
  live: { text: string; t: number }[];
  menus: { prevented: boolean; t: number }[];
  /** The clock at the down, the page's performance.now(). */
  t0: number;
  /** The frames recorder's count at the down. */
  frames0: number;
};

/**
 * Holds `hold` on the clock, CHUNK ms at a time, until `enough` held steps have started and
 * HELD_PAST more ms have passed with none (a stop that holds while held), or `release` says so
 * after a step (the visitor lets go then), or the clock passes `cap`. Then `stop` (the hold's up
 * unless given), and `after` ms more of clock. With `realPace`, real time never runs ahead of the
 * clock, as on a device: Chrome's input window (500 ms of real time) then sees what a visitor's
 * would.
 */
async function ride(
  run: ModelRun,
  hold: Hold,
  {
    enough = Number.POSITIVE_INFINITY,
    release,
    stop,
    afterUp,
    after = 1500,
    cap,
    realPace = false,
    during,
  }: {
    enough?: number;
    /** Lets go after a chunk once this says so, from the held steps and the clock since the down. */
    release?: (held: number, clock: number) => boolean;
    /** Done before the hold's up (Escape, a frame more), while still held. */
    stop?: () => Promise<unknown>;
    /** Done right after the hold's up, before the `after` ms. */
    afterUp?: () => Promise<unknown>;
    after?: number;
    cap?: number;
    realPace?: boolean;
    /** Runs once after each chunk while held, with the held steps so far. */
    during?: (held: number) => Promise<unknown>;
  },
): Promise<Ride> {
  const page = run.page;
  const before = await readRiffle(page);
  const frames0 = (await run.frames()).length;
  const t0 = before.now;
  const limit =
    cap ?? (Number.isFinite(enough) ? enough * HOLD + 3000 : 10_000);
  const real0 = Date.now();
  await hold.down();
  let now = before;
  for (;;) {
    await run.step(CHUNK);
    now = await readRiffle(page);
    const clock = now.now - t0;
    if (hold.repeat && clock >= REPEAT_AFTER) await hold.repeat();
    const held = now.steps.length - before.steps.length;
    if (during) await during(held);
    if (release?.(held, clock)) break;
    const last = now.steps.at(-1);
    if (held >= enough && last && now.now - last.t >= HELD_PAST && last.t >= t0)
      break;
    if (clock > limit) break;
    if (realPace) {
      const ahead = clock - (Date.now() - real0);
      if (ahead > 0) await pause(ahead);
    }
  }
  if (stop) await stop();
  const atStop = await readRiffle(page);
  await hold.up();
  if (afterUp) await afterUp();
  for (let t = 0; t < after; t += CHUNK) await run.step(CHUNK);
  await pause(200);
  const end = await readRiffle(page);
  const rel = <T extends { t: number }>(list: T[]) =>
    list.filter((e) => e.t >= t0).map((e) => ({ ...e, t: e.t - t0 }));
  const steps = end.steps.slice(before.steps.length);
  const heldCount = atStop.steps.length - before.steps.length;
  return {
    held: rel(steps.slice(0, heldCount)),
    after: rel(steps.slice(heldCount)),
    stoppedAt: atStop.now - t0,
    pressAtStop: atStop.press,
    ends: end.ends.filter((t) => t >= t0).map((t) => t - t0),
    live: rel(end.live),
    menus: rel(end.menus),
    t0,
    frames0,
  };
}

/** The ride's story for a note. */
const story = (r: Ride) =>
  `held steps at ${JSON.stringify(r.held.map((s) => `${s.seat}@${s.t.toFixed(0)}`))}; stopped at ${r.stoppedAt.toFixed(0)} ms; after it ${JSON.stringify(r.after.map((s) => `${s.seat}@${s.t.toFixed(0)}`))}; live ${JSON.stringify(r.live.map((l) => `${l.text.slice(0, 40)}@${l.t.toFixed(0)}`))}`;

/** The gaps between the starts of consecutive steps, ms. */
const gapsOf = (r: Ride) =>
  r.held.slice(1).map((s, i) => s.t - (r.held[i]?.t ?? 0));

/**
 * The pace's rules over one riffle's steps, as a list of what broke (empty when it holds): the first
 * step at once (within a frame of the down; by touch, at 400 ms held, Iris's addition 1 in
 * .crew/sprint/56/riffle-iris.md, which Atlas accepts as "at once" under touch), the second 400 ms
 * after it (plus a frame), every gap at least `floor`, and no gap more than a frame longer than the
 * one before (gaps never grow; a frame's slack for a controller that paces by frames). Iris's curve
 * (section 1) is 400, 290, 210, 152, 111, then 80; the checks hold the contract's rules, not her
 * numbers, so a retuned curve inside them stays green.
 */
function paceBreaks(r: Ride, floor: number, firstAt = 0) {
  const breaks: string[] = [];
  const first = r.held[0];
  if (!first) return ["no step while held"];
  if (first.t < firstAt - 0.5 || first.t > firstAt + ONE_FRAME)
    breaks.push(
      `first step ${first.t.toFixed(1)} ms after the down, not ${firstAt}`,
    );
  const gaps = gapsOf(r);
  const [g0] = gaps;
  if (g0 !== undefined && (g0 < HOLD - 0.5 || g0 > HOLD + ONE_FRAME))
    breaks.push(`first gap ${g0.toFixed(1)} ms, not ${HOLD}`);
  for (const [i, g] of gaps.entries()) {
    if (g < floor - 0.5) breaks.push(`gap ${i + 1} ${g.toFixed(1)} < ${floor}`);
    const before = gaps[i - 1];
    if (before !== undefined && g > before + ONE_FRAME)
      breaks.push(
        `gap ${i + 1} ${g.toFixed(1)} grew from ${before.toFixed(1)}`,
      );
  }
  return breaks;
}

/** Whether a live text names step n: its number and its record's h2 (Y17's rule). */
const names = (text: string | null | undefined, n: number) =>
  new RegExp(`(?<!\\d)${n}(?!\\d)`).test(text ?? "") &&
  (text ?? "").replace(/\s+/g, " ").includes(goalOf(n));

// ---------------------------------------------------------------------------------------------
// Y20: the riffle on the clock

const Y20_RIFFLES = [
  { from: 13, by: 1 },
  { from: 30, by: 1, fastest: true },
  { from: 50, by: 1 },
  { from: 30, by: -1 },
] as const;

const Y20_RUNS: {
  label: string;
  options: ModelOptions;
  floor: number;
  riffles: readonly (typeof Y20_RIFFLES)[number][];
}[] = [
  {
    label: "Full at 1440 x 900",
    options: { ...DESKTOP },
    floor: FASTEST,
    riffles: Y20_RIFFLES,
  },
  {
    label: "Calm stored, at 390 x 844",
    options: { ...PHONE, stored: "calm" },
    floor: CALM_GAP,
    riffles: Y20_RIFFLES,
  },
  {
    label: "reduced motion with no mode stored, at 1440 x 900",
    options: { ...DESKTOP, reducedMotion: "reduce" },
    floor: CALM_GAP,
    riffles: [Y20_RIFFLES[0]],
  },
];

const riffleWords = Y20_RIFFLES.map(
  ({ from, by }) =>
    `${by > 0 ? "Next" : "Previous"} from /log/${from} stops at /log/${stopFrom(from, by)}`,
).join(", ");

for (const { label, options, floor, riffles } of Y20_RUNS) {
  const all = riffles.length === Y20_RIFFLES.length;
  test(`Y20 The riffle on the clock, ${label}: holding a step link steps once at once, then, held past ${HOLD} ms, steps with gaps that start at ${HOLD} ms, never grow (a frame's slack) and never fall below ${floor} ms${floor === FASTEST ? `, reaching ${FASTEST} ms (within a frame) on the riffle from /log/30` : ""}; ${all ? riffleWords : `Next from /log/13 stops at /log/${stopFrom(13, 1)}`}, each still held ${HELD_PAST} ms past its stop with no step more, every step one plank of the merged order (data-press's seats), none after the release; ${all ? "a quick press (100 ms) is exactly one step; " : ""}no console errors`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(all ? 360_000 : 180_000);
    const run = await riffleRun(browser, options);
    for (const { from, by, ...rest } of riffles) {
      const fastest = "fastest" in rest && rest.fastest;
      const to = stopFrom(from, by);
      const want = seatsBetween(from, to);
      const where = `${by > 0 ? "Next" : "Previous"} held from /log/${from}, ${label}`;
      await restOn(run, recordOf(from));
      const hold = await pointerHold(run.page, by > 0 ? "next" : "previous");
      const r = await ride(run, hold, { enough: want.length });
      note(testInfo, "riffle", `${where}: ${story(r)}. ${SWIFTSHADER}.`);
      expect
        .soft(
          r.held.map((s) => s.seat),
          `the steps while held, one plank each in the merged order, stopping at /log/${to}: ${where}`,
        )
        .toEqual(want);
      expect
        .soft(
          r.after.map((s) => s.seat),
          `steps after the release (the click that ends a held press does nothing more), ${where}`,
        )
        .toEqual([]);
      expect
        .soft(paceBreaks(r, floor), `the pace's breaks, ${where}`)
        .toEqual([]);
      if (fastest && floor === FASTEST) {
        expect
          .soft(
            Math.min(...gapsOf(r)),
            `the shortest gap, ms, ${where}: the riffle reaches ${FASTEST} ms`,
          )
          .toBeLessThanOrEqual(FASTEST + ONE_FRAME);
      }
      const landed = await settleOn(run, recordOf(to));
      expect
        .soft(landed.path, `the step the riffle stopped on, ${where}`)
        .toBe(recordOf(to));
    }
    if (all) {
      // A quick press: down, 100 ms of clock, up.
      const at = stepOfPath((await readSafe(run.page)).path);
      const next = stepsOn(at, 1);
      const where = `a quick press of Next on /log/${at}, ${label}`;
      await run.page.mouse.move(2, 2);
      await run.step(1000);
      const hold = await pointerHold(run.page, "next");
      const r = await ride(run, hold, { release: (_, clock) => clock >= 100 });
      note(testInfo, "quick press", `${where}: ${story(r)}`);
      expect
        .soft(
          [...r.held, ...r.after].map((s) => s.seat),
          `the steps of ${where}: exactly one`,
        )
        .toEqual(seatsBetween(at, next));
      const landed = await settleOn(run, recordOf(next));
      expect.soft(landed.path, `the step after ${where}`).toBe(recordOf(next));
    }
    expect.soft(run.errors, `console errors, ${label}`).toEqual([]);
    await run.close();
  });
}

test(`Y20 The riffle by touch, Full at 390 x 844: a finger held still on Next from /log/13 steps once at 400 ms (never at the touch's start: Iris's addition 1, so a scroll from the link steps nothing) and riffles to /log/${stopFrom(13, 1)} with Full's pace, still held ${HELD_PAST} ms past the stop with no step more and none after it lifts; while it plays, a contextmenu at the link is cancelled (no callout or menu), and with Off stored it is not (Off keeps the browser's)`, async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const to = stopFrom(13, 1);
  const where = "a finger on Next from /log/13, Full at 390 x 844";
  const run = await riffleRun(browser, { ...PHONE, touch: true });
  await restOn(run, recordOf(13));
  const hold = await touchHold(run.page, "next");
  let asked = false;
  const r = await ride(run, hold, {
    enough: seatsBetween(13, to).length,
    // Mid-riffle, the menu a long press asks for, at the finger.
    during: async (held) => {
      if (asked || held < 3) return;
      asked = true;
      await run.page.evaluate(({ x, y }) => {
        document.elementFromPoint(x, y)?.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
          }),
        );
      }, hold.at);
    },
  });
  note(
    testInfo,
    "touch",
    `${where}: ${story(r)}; contextmenu events ${JSON.stringify(r.menus)}. ${SWIFTSHADER}.`,
  );
  expect
    .soft(
      r.held.map((s) => s.seat),
      `the steps while held, ${where}`,
    )
    .toEqual(seatsBetween(13, to));
  expect.soft(r.after, `steps after the finger lifts, ${where}`).toEqual([]);
  expect
    .soft(paceBreaks(r, FASTEST, HOLD), `the pace's breaks, ${where}`)
    .toEqual([]);
  expect
    .soft(
      r.menus.length > 0 && r.menus.every((m) => m.prevented),
      `every contextmenu while it plays is cancelled: ${JSON.stringify(r.menus)}, ${where}`,
    )
    .toBe(true);
  expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
  await run.close();

  const off = await openModel(browser, {
    ...PHONE,
    touch: true,
    stored: "off",
  });
  await off.context.addInitScript(recordRiffle);
  await off.goto(recordOf(13));
  await pause(1000);
  const at = await linkAt(off.page, "next");
  expect(at, "Next shown with Off stored").not.toBeNull();
  await off.page.evaluate(({ x, y }) => {
    document.elementFromPoint(x, y)?.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }),
    );
  }, at ?? { x: 0, y: 0 });
  await pause(200);
  expect
    .soft(
      (await readRiffle(off.page)).menus,
      "a contextmenu at Next with Off stored, at 390 x 844: the browser's (not cancelled)",
    )
    .toEqual([expect.objectContaining({ prevented: false })]);
  await off.close();
});

// ---------------------------------------------------------------------------------------------
// Y21: keys

test(`Y21 Keys, Full at 1440 x 900 on the clock: holding → from /log/13 (with autorepeat) riffles as holding Next does, stopping at /log/${stopFrom(13, 1)} while held; holding ← riffles back as Previous does; keyup, a pointer release and Escape (with the pointer or the key still down), and (Iris's addition 2) the mouse leaving the held link, a pointercancel, the window's blur and the page going hidden each stop a riffle with no step after; a held Enter on Next steps once; Home and End on a focused step link go to the first (/log/${STEPS[0]}) and newest (/log/${NEWEST_STEP}) steps as one jump (no data-press), the URL replaced, history.length unchanged, the live region naming the step and the words the server's; Home and End with focus on main scroll the page and step nothing; in an input, held →, Home and End step nothing`, async ({
  browser,
}, testInfo) => {
  test.setTimeout(360_000);
  const run = await riffleRun(browser, { ...DESKTOP });
  const page = run.page;
  await restOn(run, recordOf(13));
  const length = await page.evaluate(() => history.length);
  const here = async () => stepOfPath((await readSafe(page)).path);

  // Holding → from /log/13: the riffle, to the stop.
  {
    const to = stopFrom(13, 1);
    const where = "holding → from /log/13";
    await focusMain(page);
    const r = await ride(run, keyHold(page, "ArrowRight"), {
      enough: seatsBetween(13, to).length,
    });
    note(testInfo, "→", `${where}: ${story(r)}`);
    expect
      .soft(
        r.held.map((s) => s.seat),
        `the steps while → is held, ${where}`,
      )
      .toEqual(seatsBetween(13, to));
    expect.soft(r.after, `steps after the keyup, ${where}`).toEqual([]);
    expect
      .soft(paceBreaks(r, FASTEST), `the pace's breaks, ${where}`)
      .toEqual([]);
    await settleOn(run, recordOf(to));
  }

  // Each way to stop a riffle partway, from where the last one left the page.
  const stops: {
    name: string;
    by: 1 | -1;
    hold: () => Promise<Hold>;
    stop?: () => Promise<unknown>;
    afterUp?: () => Promise<unknown>;
  }[] = [
    {
      name: "← held, then keyup",
      by: -1,
      hold: async () => keyHold(page, "ArrowLeft"),
    },
    {
      name: "Previous held with the mouse, then Escape, the button still down",
      by: -1,
      hold: () => pointerHold(page, "previous"),
      stop: () => page.keyboard.press("Escape"),
    },
    {
      name: "Previous held with the mouse, then released",
      by: -1,
      hold: () => pointerHold(page, "previous"),
    },
    {
      name: "→ held, then Escape, → still down",
      by: 1,
      hold: async () => keyHold(page, "ArrowRight"),
      stop: () => page.keyboard.press("Escape"),
    },
    // Iris's addition 2 (.crew/sprint/56/riffle-iris.md, section 5): the pointer leaving the
    // held link, pointercancel, the window's blur and the page going hidden end it too.
    {
      name: "Previous held with the mouse, then the mouse moved off the link",
      by: -1,
      hold: () => pointerHold(page, "previous"),
      stop: () => page.mouse.move(2, 2, { steps: 4 }),
    },
    {
      name: "→ held, then the window blurs",
      by: 1,
      hold: async () => keyHold(page, "ArrowRight"),
      stop: () => page.evaluate(() => dispatchEvent(new FocusEvent("blur"))),
    },
    {
      name: "Previous held with the mouse, then the page goes hidden (shown again after the release)",
      by: -1,
      hold: () => pointerHold(page, "previous"),
      stop: () => setHidden(page, true),
      afterUp: () => setHidden(page, false),
    },
    {
      name: "Previous held with the mouse, then a pointercancel at it",
      by: -1,
      hold: () => pointerHold(page, "previous"),
      stop: () =>
        page.evaluate(() => {
          const link = document.querySelector(
            '.record a[data-step="previous"]',
          );
          (link ?? document).dispatchEvent(
            new PointerEvent("pointercancel", {
              bubbles: true,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
            }),
          );
        }),
    },
  ];
  const PARTWAY = 3;
  for (const s of stops) {
    const from = await here();
    const where = `${s.name}, from /log/${from}`;
    await page.mouse.move(2, 2);
    await focusMain(page);
    const hold = await s.hold();
    const r = await ride(run, hold, {
      release: (held) => held >= PARTWAY,
      cap: PARTWAY * HOLD + 2000,
      stop: s.stop,
      afterUp: s.afterUp,
      after: 2000,
    });
    note(testInfo, "stop", `${where}: ${story(r)}`);
    expect
      .soft(
        r.held.map((x) => x.seat),
        `the steps until the stop, ${where}`,
      )
      .toEqual(seatsBetween(from, stepsOn(from, s.by * PARTWAY)));
    expect
      .soft(
        r.after,
        `steps after the stop (and the release after it), ${where}`,
      )
      .toEqual([]);
    await settleOn(run, recordOf(stepsOn(from, s.by * PARTWAY)));
  }

  // A held Enter on a focused Next steps once: its repeats are ignored (Iris's addition 3).
  {
    const from = await here();
    const where = `Enter held on the focused Next, from /log/${from}`;
    await page.mouse.move(2, 2);
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement>('.record a[data-step="next"]')
        ?.focus(),
    );
    const r = await ride(run, keyHold(page, "Enter"), { cap: 1500 });
    note(testInfo, "Enter", `${where}: ${story(r)}`);
    expect
      .soft(
        [...r.held, ...r.after].map((x) => x.seat),
        `the steps of ${where}: exactly one`,
      )
      .toEqual(seatsBetween(from, stepsOn(from, 1)));
    await settleOn(run, recordOf(stepsOn(from, 1)));
  }

  // Home and End on a focused step link: one jump each.
  for (const [key, to] of [
    ["End", NEWEST_STEP],
    ["Home", STEPS[0] ?? 1],
  ] as const) {
    const from = await here();
    const where = `${key} on a focused step link, from /log/${from}`;
    await page.mouse.move(2, 2);
    await page.evaluate(() =>
      document.querySelector<HTMLElement>(".record a[data-step]")?.focus(),
    );
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute("data-step") ?? null,
    );
    expect.soft(focused, `a step link focused before ${where}`).not.toBeNull();
    const before = await readRiffle(page);
    const scrolled = await page.evaluate(() => window.scrollY);
    await page.keyboard.press(key);
    const landed = await settleOn(run, recordOf(to));
    const after = await readRiffle(page);
    const shown = await readWords(page);
    const served = await readWords(
      page,
      await (await page.request.get(recordOf(to))).text(),
    );
    note(
      testInfo,
      key,
      `${where}: at ${landed.path}, live "${landed.live}", data-press values ${JSON.stringify(after.steps.slice(before.steps.length))}`,
    );
    expect
      .soft(
        {
          path: landed.path,
          same: landed.doc,
          length: await page.evaluate(() => history.length),
          names: names(landed.live, to),
          jumps: after.steps.length - before.steps.length,
        },
        `${where}: the URL replaced on the same document, history unchanged, the live region naming it, no one-plank move`,
      )
      .toEqual({ path: recordOf(to), same: 1, length, names: true, jumps: 0 });
    expect
      .soft(shown, `the words and drawings against the server's, ${where}`)
      .toEqual(served);
    expect
      .soft(
        await page.evaluate(() => scrollY),
        `the page's scroll after ${where}`,
      )
      .toBe(scrolled);
  }

  // Home and End elsewhere: the page scrolls, as before.
  {
    const from = (await readSafe(page)).path;
    await page.evaluate(() => scrollTo(0, 0));
    await focusMain(page);
    const before = await readRiffle(page);
    // Keyboard scrolling may be smooth, in real time: read it once it has come to rest.
    const rested = async () => {
      let y = Number.NaN;
      for (let i = 0; i < 30; i++) {
        await pause(150);
        const now = await page.evaluate(() => scrollY);
        if (now === y) break;
        y = now;
      }
      return y;
    };
    await page.keyboard.press("End");
    const atEnd = {
      y: await rested(),
      max: await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight,
      ),
    };
    await page.keyboard.press("Home");
    const atHome = await rested();
    await run.step(1000);
    const after = await readRiffle(page);
    expect
      .soft(
        {
          end: atEnd.y > 0 && Math.abs(atEnd.y - atEnd.max) <= 2,
          home: atHome,
          path: after.path,
          steps: after.steps.length - before.steps.length,
        },
        `End then Home with focus on main, on ${from}: the page's foot, then its top, no step (End read ${atEnd.y} of ${atEnd.max})`,
      )
      .toEqual({ end: true, home: 0, path: from, steps: 0 });
  }

  // In a form field: nothing steps.
  {
    const from = (await readSafe(page)).path;
    await page.evaluate(() => {
      const field = document.createElement("input");
      field.value = "Riffle";
      field.setAttribute("data-probe-field", "");
      document.querySelector("main")?.prepend(field);
      field.focus({ preventScroll: true });
    });
    const before = await readRiffle(page);
    const r = await ride(run, keyHold(page, "ArrowRight"), { cap: 1500 });
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    await run.step(1000);
    await pause(500);
    const after = await readRiffle(page);
    expect
      .soft(
        {
          held: r.held.length,
          steps: after.steps.length - before.steps.length,
          path: after.path,
        },
        `→ held, End and Home in an input on ${from}: nothing steps`,
      )
      .toEqual({ held: 0, steps: 0, path: from });
    await page.evaluate(() =>
      document.querySelector("[data-probe-field]")?.remove(),
    );
  }
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});

// ---------------------------------------------------------------------------------------------
// Y22: the hand-off

const HAND_OFF = YARD_WORDS.handOff;

/** The links named HAND_OFF in a document (the page's, or `html` parsed), their hrefs and shown. */
function handOffs(page: Page, html?: string) {
  return page.evaluate(
    ({ html, words }) => {
      const doc = html
        ? new DOMParser().parseFromString(html, "text/html")
        : document;
      const squash = (s: string | null) =>
        (s ?? "").replace(/\s+/g, " ").trim();
      return [...doc.querySelectorAll("a")]
        .filter(
          (a) =>
            squash(a.getAttribute("aria-label") ?? a.textContent) === words,
        )
        .map((a) => ({
          path: new URL(a.getAttribute("href") ?? "", location.href).pathname,
          shown: html ? null : a.getClientRects().length > 0,
        }));
    },
    { html, words: HAND_OFF },
  );
}

test(`Y22 The hand-off: on /log and the newest step's /log/${NEWEST_STEP}, with Off stored, with no script, in Full and in Calm, one link "${HAND_OFF}" goes to /crew, shown; no other step's server HTML has it; a press of Next from the step before the newest, in Calm and in Full, brings it as the server's words`, async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const pages = [LOG, recordOf(NEWEST_STEP)];
  const modes: { label: string; options: ModelOptions }[] = [
    { label: "Off stored", options: { stored: "off" } },
    { label: "no script", options: { noScript: true } },
    { label: "Full", options: {} },
    { label: "Calm stored", options: { stored: "calm" } },
  ];
  for (const { label, options } of modes) {
    const run = await openModel(browser, { ...DESKTOP, ...options });
    for (const path of pages) {
      await run.goto(path);
      if (!options.noScript) await pause(1000);
      // With scripts off page.evaluate still reads the DOM.
      const found = await handOffs(run.page);
      expect
        .soft(found, `links named "${HAND_OFF}" on ${path}, ${label}`)
        .toEqual([{ path: "/crew", shown: true }]);
    }
    expect.soft(run.errors, `console errors, ${label}`).toEqual([]);
    await run.close();
  }

  // Every other step's server HTML: none.
  const run = await openModel(browser, { ...DESKTOP, stored: "off" });
  await run.goto(LOG);
  const crew = await run.page.request.get("/crew");
  expect.soft(crew.status(), "status of /crew").toBe(200);
  const carrying: string[] = [];
  for (const n of STEPS) {
    if (n === NEWEST_STEP) continue;
    const response = await run.page.request.get(recordOf(n));
    expect.soft(response.status(), `status of ${recordOf(n)}`).toBe(200);
    if ((await handOffs(run.page, await response.text())).length > 0)
      carrying.push(recordOf(n));
  }
  expect
    .soft(carrying, `steps before the newest whose server HTML has the link`)
    .toEqual([]);
  await run.close();

  // A press from the step before the newest brings it.
  const before = STEPS.at(-2) ?? NEWEST_STEP - 1;
  for (const { label, options } of modes.slice(2)) {
    const where = `Next from /log/${before}, ${label}`;
    const press = await openModel(browser, { ...DESKTOP, ...options });
    await press.goto(recordOf(before));
    await press.waitFor([...REST], FIRST);
    await pause(1500);
    await tagDocument(press.page);
    expect
      .soft(await handOffs(press.page), `the link before the press, ${where}`)
      .toEqual([]);
    const at = await linkAt(press.page, "next");
    expect(at, `Next shown, ${where}`).not.toBeNull();
    await press.page.mouse.click(at?.x ?? 0, at?.y ?? 0);
    const end = Date.now() + 20_000;
    let now = await readSafe(press.page);
    while (
      Date.now() < end &&
      !(now.path === recordOf(NEWEST_STEP) && !now.press && now.live)
    ) {
      await pause(100);
      now = await readSafe(press.page);
    }
    expect
      .soft(
        { doc: now.doc, path: now.path },
        `the press keeps the page and lands, ${where}`,
      )
      .toEqual({ doc: 1, path: recordOf(NEWEST_STEP) });
    expect
      .soft(await handOffs(press.page), `the link after the press, ${where}`)
      .toEqual([{ path: "/crew", shown: true }]);
    expect.soft(press.errors, `console errors, ${where}`).toEqual([]);
    await press.close();
  }
});

// ---------------------------------------------------------------------------------------------
// Y23: frames, stops and words

/** Layout shifts recorded so far, from a buffered observer (log-press Y16's read). */
function shifts(page: Page) {
  return page.evaluate(() => {
    type Shift = PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      sources?: { node?: Node | null }[];
    };
    const observer = new PerformanceObserver(() => undefined);
    observer.observe({ type: "layout-shift", buffered: true });
    const list = observer.takeRecords() as Shift[];
    observer.disconnect();
    const name = (node?: Node | null) =>
      node instanceof Element
        ? `${node.tagName.toLowerCase()}${node.classList[0] ? `.${node.classList[0]}` : ""}`
        : String(node?.nodeName ?? "none");
    return list.map((e) => ({
      value: e.value,
      recent: e.hadRecentInput,
      sources: (e.sources ?? []).map((source) => name(source.node)),
    }));
  });
}

const Y23_RUNS = [
  {
    label: `Next held from /log/13 to its stop at /log/${stopFrom(13, 1)}`,
    size: DESKTOP,
    from: 13,
    partway: 0,
  },
  {
    label: "Next held from /log/30 and released partway, a plank in flight",
    size: PHONE,
    from: 30,
    partway: 4,
  },
] as const;

for (const { label, size, from, partway } of Y23_RUNS) {
  test(`Y23 Frames, stops and words, Full at ${size.width} x ${size.height}, ${label}: frames are drawn while it riffles, at most 8 draws and ${TRIANGLES_AT(size.width).toLocaleString("en-US")} triangles a frame; ${partway ? "within one frame of the release the plank has landed and no frame is drawn after it" : "within one frame of the stop's landing no frame is drawn"}, and 0 over 2 s at rest; no step starts ${partway ? "after the release" : "past the stop"}; the live region speaks once, after it, naming the step; the record, captions, count, question, step links, open row, title and drawings equal the server's for that step; the settled canvas matches a cold load of it (0.01% of pixels); no layout shift without recent input from the press on (real time kept to the clock's); no console errors`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(300_000);
    const where = `${label}, Full at ${size.width} x ${size.height}`;
    const run = await riffleRun(browser, { ...size });
    await restOn(run, recordOf(from));
    const clip = await clipOf(run.page);
    const seen = (await shifts(run.page)).length;
    const hold = await pointerHold(run.page, "next");
    const stopAt = stopFrom(from, 1);
    let releasedFrames = 0;
    let pressAfter: string | null = null;
    const r = await ride(run, hold, {
      enough: partway
        ? Number.POSITIVE_INFINITY
        : seatsBetween(from, stopAt).length,
      release: partway ? (held) => held >= partway : undefined,
      realPace: true,
      // Released partway: a frame into the step's flight, the release, then one frame.
      stop: partway ? () => run.step(ONE_FRAME) : undefined,
      afterUp: partway
        ? async () => {
            await pause(150);
            releasedFrames = (await run.frames()).length;
            await run.step(ONE_FRAME);
            pressAfter = (await readRiffle(run.page)).press;
          }
        : undefined,
      after: 2000,
    });
    note(testInfo, "riffle", `${where}: ${story(r)}. ${SWIFTSHADER}.`);
    const frames = (await run.frames()).slice(r.frames0);
    const rel = frames.map((f) => ({ ...f, t: f.t - r.t0 }));
    const lastStep = r.held.at(-1);
    const reached = partway ? stepsOn(from, r.held.length) : stopAt;
    expect
      .soft(
        r.held.map((s) => s.seat),
        partway
          ? `the steps until the release, ${where}`
          : `the steps to the stop, none past it, ${where}`,
      )
      .toEqual(
        partway
          ? seatsBetween(from, stepsOn(from, r.held.length))
          : seatsBetween(from, stopAt),
      );
    if (partway)
      expect
        .soft(r.held.length, `steps before the release, ${where}`)
        .toBeGreaterThanOrEqual(partway);
    expect
      .soft(
        r.after,
        `steps after the ${partway ? "release" : "stop"}, ${where}`,
      )
      .toEqual([]);

    // Frames.
    const riffling = rel.filter((f) => lastStep && f.t <= lastStep.t + HOLD);
    const draws = Math.max(0, ...riffling.map((f) => f.draws));
    const triangles = Math.max(0, ...riffling.map((f) => f.triangles));
    note(
      testInfo,
      "frames",
      `${where}: ${rel.length} frames from the down; at most ${draws} draws and ${triangles} triangles a frame while riffling; landings at ${JSON.stringify(r.ends.map((t) => t.toFixed(0)))}`,
    );
    expect
      .soft(riffling.length, `frames drawn while it riffles, ${where}`)
      .toBeGreaterThan(0);
    expect
      .soft(draws, `the most draws in a frame, ${where}`)
      .toBeLessThanOrEqual(8);
    expect
      .soft(triangles, `the most triangles in a frame, ${where}`)
      .toBeLessThanOrEqual(TRIANGLES_AT(size.width));
    if (partway) {
      expect
        .soft(
          r.pressAtStop,
          `a plank in flight at the release (data-press), ${where}`,
        )
        .not.toBeNull();
      expect
        .soft(
          pressAfter,
          `data-press one frame after the release (the plank landed), ${where}`,
        )
        .toBeNull();
      expect
        .soft(
          (await run.frames()).length - releasedFrames,
          `frames drawn from the release to 2 s after it: the landing's at most, ${where}`,
        )
        .toBeLessThanOrEqual(1);
    } else {
      // The stop's own landing: the first after its start. The step before it lands in the same
      // task the stop starts (land, then go), at the stop's start time.
      const landing = r.ends.filter((t) => lastStep && t > lastStep.t).at(0);
      expect
        .soft(landing, `the stop's step landed while held, ${where}`)
        .toBeDefined();
      expect
        .soft(
          rel
            .filter((f) => f.t > (landing ?? 0) + ONE_FRAME)
            .map((f) => f.t.toFixed(0)),
          `frames drawn more than a frame after the stop's landing (clock ms from the down), ${where}`,
        )
        .toEqual([]);
    }
    await run.page.mouse.move(2, 2);
    const idleFrom = (await run.frames()).length;
    await pause(200);
    await run.step(2000);
    await pause(200);
    expect
      .soft(
        (await run.frames()).length - idleFrom,
        `frames over 2 s at rest after it, ${where}`,
      )
      .toBe(0);

    // Words: the server's for the step, and the live region once.
    const target = recordOf(reached);
    const landed = await settleOn(run, target);
    expect
      .soft(
        landed.path,
        `the step it ${partway ? "was released on" : "stopped on"}, ${where}`,
      )
      .toBe(target);
    const live = (await readRiffle(run.page)).live.filter((l) => l.t >= r.t0);
    const quiet = partway ? r.stoppedAt : (r.ends.at(-1) ?? 0);
    expect
      .soft(
        live.map((l) => ({
          names: names(l.text, reached),
          after: l.t - r.t0 >= quiet - 0.5,
        })),
        `the live region's words from the press on (${JSON.stringify(live.map((l) => `${l.text.slice(0, 30)}@${(l.t - r.t0).toFixed(0)}`))}): once, after the ${partway ? "release" : "stop"}, naming /log/${reached}, ${where}`,
      )
      .toEqual([{ names: true, after: true }]);
    const [shown, served] = [
      await readWords(run.page),
      await readWords(
        run.page,
        await (await run.page.request.get(target)).text(),
      ),
    ];
    expect
      .soft(
        shown,
        `the words and drawings against the server's ${target}, ${where}`,
      )
      .toEqual(served);

    // The canvas against a cold load.
    const cold = await coldCanvas(browser, target, size);
    const after = await shoot(run.page, clip);
    expect(
      sameSize(after, cold.image),
      `the shot and ${target}'s cold load are one size, ${where}`,
    ).toBe(true);
    const off = sum(changed(after, cold.image));
    note(
      testInfo,
      "canvas",
      `${where}: ${off} of ${after.width * after.height} pixels off ${target}'s cold Calm load`,
    );
    expect
      .soft(off, `pixels off ${target}'s cold load, ${where}`)
      .toBeLessThanOrEqual(OFF_R * after.width * after.height);

    // Layout shift. Chromium buffers the shifts made while a pointer is held and reports them at
    // the release, credited to the input (Iris's measure, .crew/sprint/56/riffle-iris.md, section
    // 3): so the entries are read here, 2 s after the release, never during the hold.
    const moved = (await shifts(run.page)).slice(seen).filter((e) => !e.recent);
    note(
      testInfo,
      "layout shift",
      `${where}: without recent input ${moved.map((e) => `${e.value.toFixed(4)} (${e.sources.join(", ")})`).join("; ") || "none"}`,
    );
    expect
      .soft(
        moved.reduce((total, e) => total + e.value, 0),
        `layout shift without recent input from the press on, ${where}`,
      )
      .toBe(0);
    expect
      .soft([...run.errors, ...cold.errors], `console errors, ${where}`)
      .toEqual([]);
    await run.close();
  });
}

// ---------------------------------------------------------------------------------------------
// Y24: INP and budgets, reported

/** An init script: each Event Timing entry of an interaction (trusted input only). */
function recordEvents() {
  const list: { name: string; duration: number; id: number }[] = [];
  (window as Window & { __events?: typeof list }).__events = list;
  new PerformanceObserver((entries) => {
    for (const e of entries.getEntries() as (PerformanceEntry & {
      interactionId?: number;
    })[]) {
      if (e.interactionId)
        list.push({ name: e.name, duration: e.duration, id: e.interactionId });
    }
  }).observe({
    type: "event",
    durationThreshold: 16,
    buffered: true,
  } as PerformanceObserverInit);
}

test(`Y24 INP and budgets, reported (not gated, as B3.9's isn't), Full at 1440 x 900 at 4x CPU in real time: Next held 3 s from /log/13, then → held 2 s with autorepeat; the riffle's INP (the longest interaction) and each input's are reported; a riffle must have happened (two steps or more while held) for the number to mean anything; the 3D chunk is one file of at most 250,000 B gzip -9, its delta reported against Yc's; the loader's 0 B is B2.10's and B5.10's, unedited`, async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const where = "/log/13, Full at 1440 x 900, 4x CPU, real time";
  const run = await openModel(browser, { ...DESKTOP, cpu: 4 });
  await run.context.addInitScript(recordRiffle);
  await run.context.addInitScript(recordEvents);
  await run.goto(recordOf(13));
  await run.waitFor([...REST], FIRST);
  await run.page.mouse.move(2, 2);
  await focusMain(run.page);
  await pause(1500);

  const holds: { name: string; held: number; steps: number }[] = [];
  const timed = async (hold: Hold, ms: number) => {
    const before = await readRiffle(run.page);
    await hold.down();
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await pause(33);
      if (hold.repeat) await hold.repeat();
    }
    const atUp = await readRiffle(run.page);
    await hold.up();
    await pause(2500);
    holds.push({
      name: hold.name,
      held: ms,
      steps: atUp.steps.length - before.steps.length,
    });
  };
  await timed(await pointerHold(run.page, "next"), 3000);
  await run.page.mouse.move(2, 2);
  await focusMain(run.page);
  await timed(keyHold(run.page, "ArrowRight"), 2000);

  const events = await run.page.evaluate(
    () =>
      (
        window as Window & {
          __events?: { name: string; duration: number; id: number }[];
        }
      ).__events ?? [],
  );
  const byId = new Map<number, { names: string[]; duration: number }>();
  for (const e of events) {
    const kept = byId.get(e.id) ?? { names: [], duration: 0 };
    kept.names.push(e.name);
    kept.duration = Math.max(kept.duration, e.duration);
    byId.set(e.id, kept);
  }
  const interactions = [...byId.values()];
  const inp = Math.max(0, ...interactions.map((i) => i.duration));
  note(
    testInfo,
    "INP",
    `${where}: ${interactions.length} interactions, INP (longest) ${inp} ms; each: ${interactions.map((i) => `${[...new Set(i.names)].join("+")} ${i.duration}`).join(", ") || "none"}; holds ${JSON.stringify(holds)}. Not gated. ${SWIFTSHADER}.`,
  );
  expect
    .soft(
      holds.map((h) => ({ name: h.name, riffled: h.steps >= 2 })),
      `a riffle while each was held (steps while held: ${holds.map((h) => h.steps).join(", ")}), ${where}`,
    )
    .toEqual(holds.map((h) => ({ name: h.name, riffled: true })));

  // The 3D chunk: the scripts with the model beyond the refused page's (Y18's method).
  const refused = await openModel(browser, { ...DESKTOP, refuse: true });
  await refused.goto(recordOf(13));
  await pause(3500);
  const offPaths = (await refused.scripts()).list.map(
    (s) => new URL(s.url).pathname,
  );
  await refused.close();
  const chunk = (await run.scripts()).list.filter(
    (s) => !offPaths.includes(new URL(s.url).pathname),
  );
  const gzip9 = chunk.reduce((s, f) => s + f.gzip9, 0);
  note(
    testInfo,
    "3D chunk",
    `${chunk.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B`).join("; ")}: ${gzip9} B gzip -9, ${gzip9 - YC_CHUNK >= 0 ? "+" : ""}${gzip9 - YC_CHUNK} B against Yc's ${YC_CHUNK}; ${250_000 - gzip9} B left of 250,000`,
  );
  expect.soft(chunk.length, "scripts beyond the refused page's").toBe(1);
  expect
    .soft(gzip9, "the 3D chunk, gzip -9 bytes")
    .toBeLessThanOrEqual(250_000);
  expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
  await run.close();
});
