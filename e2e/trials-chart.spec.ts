import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type BrowserContext,
  expect,
  type Page,
  type Request,
  test,
} from "@playwright/test";
import { sweptAt } from "../lib/trials-sweep";
import { decodePng, pixel } from "./pixels";
import { cellsOf, MERGED, REPO } from "./retros";
import {
  addressOf,
  at,
  frameReady,
  GAP,
  gridWindows,
  type Kind,
  key,
  kindOf,
  measureTop,
  NAMED,
  PIN_WINDOWS,
  PINS,
  type Win,
} from "./trials";
import { crewCells, FITS, fitsAt, matchesAt } from "./trials-fits";

// Sprint 65, Tc: the chart of every window and the crew's seven fits (.crew/sprint/65/contract.md,
// T16 to T21), written before the build as two tests, T16 to T18 and T19 to T21, so the suite's
// shards keep their sets (the contract's "Two tests, one file"). The oracle is e2e/trials-fits.ts
// (the contract's table word for word, and the queries read at a 16 px rem) over Ta's e2e/trials.ts.
//
// The hooks are .crew/sprint/65/decisions.md, 4, read this way (sent to Atlas on 13 Nov):
// - `svg[data-chart]` in a `figure` in main; `g[data-plot]` inside it, whose units are window px
//   (x the width, y the height); its screen CTM neither rotates nor skews, x grows right, y up.
// - `[data-band]` and each `[data-fit-region="<n>"]` are read by `isPointInFill` (a `g`: any
//   geometry inside it) at each grid point, mapped from the plot's units into their own. Every
//   mapping goes through screen CTMs: the soundings sit outside the plot's own svg (Forge).
// - A `[data-pin]` (`data-windows`: "<w>x<h>" keys, space-separated; `data-freeboard`: one value
//   per listed window, one decimal, the same order) is "at its point" when the union of its
//   non-text shapes' boxes, in plot units, is centred on it (a run: the middle of its first and
//   last window) within 0.5 units and covers each listed one. An `a[data-sounding="<w>x<h>"]` is:
//   its dot (its circle) centred on the point within 0.5 units, its hit rect holding the point,
//   which may sit off-centre (decisions.md 5).
// - `circle[data-ring]`: its cx and cy, in plot units, are the shown window.
// - A fit, `[data-fit="<n>"][data-query]`, is stamped when it has no `hidden` and is visible; its
//   links are to `/log/<n>` and to `app/globals.css#L<n>` on GitHub at the build's commit.
//   `[data-found]` is the count line.
// Ta's hooks (`main iframe`, `[data-freeboard]`, `[data-size]`, `[data-kind]`, `a[data-window]`)
// and Tb's (`main [data-corner]`, `[data-trials-live]`, `input[name="w"]`) are their specs'.

const DEPLOYED = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const FRAME = "/trials/frame";
const HOME: Win = [1440, 900];
const CORNER = "main [data-corner]";
const BLOB = `${REPO}/blob`;
const GLOBALS = "app/globals.css";
const SWEEP_COMMAND = "pnpm build && node .crew/sprint/63/trials-sweep.mjs";

/** A window's size as the page writes it, "1440 × 900", and as it is spoken, "1440 by 900". */
const sizeWords = ([w, h]: Win) => `${w} × ${h}`;
const spokenWords = ([w, h]: Win) => `${w} by ${h}`;

/** Iris's verdicts (.crew/sprint/63/words.md). */
const VERDICT: Record<Kind, string> = {
  gap: "The crew's own gap",
  held: "Held by the crew's checks",
  near: "A near miss",
  under: "Sunk",
  afloat: "Afloat",
};
const sinks = (kind: Kind) => kind === "gap" || kind === "under";

/** The freeboard as the page writes it: signed by the kind, one decimal (lib's signedOf). */
function signedAt(win: Win) {
  const swept = sweptAt(win[0], win[1]);
  if (!swept) return null;
  const sign = sinks(kindOf(win, swept.freeboard)) ? "−" : "+";
  return `${sign}${Math.abs(swept.freeboard).toFixed(1)}`;
}

/** The count line (.crew/sprint/65/words.md, 3), its plank's aria-hidden number aside. */
const visitCount = (n: number) =>
  n === FITS.length
    ? `All ${FITS.length} fits found`
    : `${n} of ${FITS.length} fits found`;
const windowCount = (k: number) =>
  `This window is in ${k === 0 ? "none" : k} of the crew's ${FITS.length} fits`;
/** The settle's count sentence (words.md, 5). */
const countSentence = (n: number) => `${visitCount(n)}.`;
/** The caption's first part (words.md, 1). */
const captionWords = (sinking: string, total: string) =>
  `Width across, height up, hatched where the contact links sink: ${sinking} of the ${total} windows swept. Dots are the crew's windows, the ring is the frame's, the numbers are close calls.`;

const CODE = /\b[A-Z]{1,2}\d+(\.\d+)*\b/;
const URL_PATH = /(?:^|[^\w/])\/[A-Za-z0-9_-]/;

const squash = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").trim();

const nodeWait = (ms: number) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

async function until<T>(
  read: () => Promise<T>,
  ok: (value: T) => boolean,
  timeout: number,
) {
  const end = Date.now() + timeout;
  let value = await read();
  while (!ok(value) && Date.now() < end) {
    await nodeWait(50);
    value = await read();
  }
  return value;
}

/** The sweep at every grid window, widths outer, with whether it sinks. */
const GRID = gridWindows().map((win) => {
  const swept = sweptAt(win[0], win[1]);
  return { win, freeboard: swept?.freeboard ?? Number.NaN };
});
const SINKING = GRID.filter((g) => g.freeboard < 0).length;
const count = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------------------------
// The page's instruments, before any of its scripts: the live region's words as they change (and
// whether a drag was on), and layout shifts, in the top document only.

type Spoken = { text: string; dragging: boolean };
type Probe = { spoken: Spoken[]; cls: number; shifts: string[] };
type Instrumented = Window & { __probe?: Probe };

function instrument(target: Page | BrowserContext) {
  return target.addInitScript(() => {
    if (window !== window.top) return;
    const probe: Probe = { spoken: [], cls: 0, shifts: [] };
    (window as Instrumented).__probe = probe;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        probe.cls += shift.value;
        probe.shifts.push(
          `${shift.value.toFixed(4)}${shift.hadRecentInput ? " (input)" : ""}`,
        );
      }
    }).observe({ type: "layout-shift", buffered: true });
    const watch = () => {
      const region = document.querySelector("[data-trials-live]");
      if (!region) return;
      let last = (region.textContent ?? "").replace(/\s+/g, " ").trim();
      new MutationObserver(() => {
        const text = (region.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text === last) return;
        last = text;
        probe.spoken.push({
          text,
          dragging: Boolean(
            document.querySelector("[data-corner][data-dragging]"),
          ),
        });
      }).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", watch);
    else watch();
  });
}

const probeOf = (page: Page) =>
  page.evaluate(() => {
    const p = (window as Instrumented).__probe;
    return p
      ? { spoken: [...p.spoken], cls: p.cls, shifts: [...p.shifts] }
      : null;
  });

/** Two of the page's frames. */
const frames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }),
  );

// ---------------------------------------------------------------------------------------------
// Reads

type Pt = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

/**
 * The chart as drawn, in plot units: the plot's screen matrix, the pins, the soundings, the ring,
 * the band's count and the caption. Assertion-free.
 */
function readChart(page: Page) {
  return page.evaluate(() => {
    const charts = document.querySelectorAll("main svg[data-chart]");
    const svg = charts[0] as SVGSVGElement | undefined;
    const plot = svg?.querySelector("[data-plot]") as
      | SVGGraphicsElement
      | null
      | undefined;
    const plotCtm = plot?.getScreenCTM() ?? null;
    const toPlot = (el: SVGGraphicsElement) => {
      const m = el.getScreenCTM();
      return plotCtm && m ? plotCtm.inverse().multiply(m) : null;
    };
    const SHAPES = "circle, ellipse, rect, line, path, polyline, polygon, use";
    /** The union of an element's non-text shapes' boxes, in plot units. */
    const shapeBox = (el: Element, only = SHAPES) => {
      const shapes = (
        el.matches(only) ? [el] : [...el.querySelectorAll(only)]
      ) as SVGGraphicsElement[];
      let box: { left: number; top: number; right: number; bottom: number } = {
        left: Number.POSITIVE_INFINITY,
        top: Number.POSITIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY,
        bottom: Number.NEGATIVE_INFINITY,
      };
      for (const shape of shapes) {
        const m = toPlot(shape);
        if (!m) continue;
        const b = shape.getBBox();
        for (const [x, y] of [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x, b.y + b.height],
          [b.x + b.width, b.y + b.height],
        ] as const) {
          const p = new DOMPoint(x, y).matrixTransform(m);
          box = {
            left: Math.min(box.left, p.x),
            top: Math.min(box.top, p.y),
            right: Math.max(box.right, p.x),
            bottom: Math.max(box.bottom, p.y),
          };
        }
      }
      return shapes.length > 0 ? box : null;
    };
    const client = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const screen = plot?.getScreenCTM() ?? null;
    const ring = svg?.querySelector("[data-ring]") as SVGCircleElement | null;
    const ringM = ring ? toPlot(ring) : null;
    const ringAt =
      ring && ringM
        ? new DOMPoint(
            ring.cx.baseVal.value,
            ring.cy.baseVal.value,
          ).matrixTransform(ringM)
        : null;
    const figure = svg?.closest("figure");
    return {
      charts: charts.length,
      plots: svg ? svg.querySelectorAll("[data-plot]").length : 0,
      inFigure: Boolean(figure),
      screen: screen
        ? { a: screen.a, b: screen.b, c: screen.c, d: screen.d }
        : null,
      bands: svg ? svg.querySelectorAll("[data-band]").length : 0,
      caption: (figure?.querySelector("figcaption")?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      figureText: (figure?.textContent ?? "").replace(/\s+/g, " ").trim(),
      pins: [...(svg?.querySelectorAll("[data-pin]") ?? [])].map((el) => ({
        windows: (el.getAttribute("data-windows") ?? "")
          .split(/\s+/)
          .filter(Boolean),
        freeboards: (el.getAttribute("data-freeboard") ?? "")
          .split(/\s+/)
          .filter(Boolean),
        text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
        box: shapeBox(el),
      })),
      soundings: [...document.querySelectorAll("main a[data-sounding]")].map(
        (el) => ({
          key: el.getAttribute("data-sounding") ?? "",
          href: el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "",
          inChart: Boolean(svg?.contains(el)),
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
          dot: shapeBox(el, "circle"),
          hit: shapeBox(el, "rect"),
          client: client(el),
        }),
      ),
      rings: svg ? svg.querySelectorAll("[data-ring]").length : 0,
      ring: ringAt ? { x: ringAt.x, y: ringAt.y } : null,
      windowLinks: [...document.querySelectorAll("a[data-window]")].map(
        (a) => a.getAttribute("data-window") ?? "",
      ),
      windowLinksInChart: svg
        ? svg.querySelectorAll("[data-window]").length
        : 0,
    };
  });
}

/** Whether a box in plot units is centred on the windows' middle and covers each of them. */
function placed(box: Box | null, wins: Win[]) {
  if (!box || wins.length === 0) return "no shapes";
  const ws = wins.map((w) => w[0]);
  const hs = wins.map((w) => w[1]);
  const mid = {
    x: (Math.min(...ws) + Math.max(...ws)) / 2,
    y: (Math.min(...hs) + Math.max(...hs)) / 2,
  };
  const centre = {
    x: (box.left + box.right) / 2,
    y: (box.top + box.bottom) / 2,
  };
  const off = Math.max(Math.abs(centre.x - mid.x), Math.abs(centre.y - mid.y));
  const uncovered = wins.filter(
    ([w, h]) =>
      w < box.left - 0.5 ||
      w > box.right + 0.5 ||
      h < box.top - 0.5 ||
      h > box.bottom + 0.5,
  );
  if (off > 0.5)
    return `centred at ${centre.x.toFixed(1)}, ${centre.y.toFixed(1)}, ${off.toFixed(1)} units off ${mid.x}, ${mid.y}`;
  if (uncovered.length > 0)
    return `doesn't cover ${uncovered.map(key).join(", ")}`;
  return null;
}

const parseKey = (k: string): Win | null => {
  const m = k.match(/^(\d+)x(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/**
 * Where an element's fill holds each point, `points` in plot units: the misses, the first 12 of
 * them listed. A `g` holds a point when any geometry inside it does. Assertion-free.
 */
function fillMisses(
  page: Page,
  selector: string,
  points: [number, number, boolean][],
) {
  return page.evaluate(
    ({ selector, points }) => {
      const svg = document.querySelector("main svg[data-chart]");
      const plot = svg?.querySelector(
        "[data-plot]",
      ) as SVGGraphicsElement | null;
      const el = svg?.querySelector(selector) as SVGGraphicsElement | null;
      if (!plot || !el)
        return { found: false, misses: points.length, list: [] };
      const plotCtm = plot.getScreenCTM();
      const shapes = (
        el instanceof SVGGeometryElement
          ? [el]
          : [...el.querySelectorAll("*")].filter(
              (s) => s instanceof SVGGeometryElement,
            )
      ) as SVGGeometryElement[];
      const maps = shapes.map((s) => {
        const m = s.getScreenCTM();
        return plotCtm && m ? m.inverse().multiply(plotCtm) : null;
      });
      let misses = 0;
      const list: string[] = [];
      for (const [x, y, want] of points) {
        const got = shapes.some((s, i) => {
          const m = maps[i];
          if (!m) return false;
          const p = new DOMPoint(x, y).matrixTransform(m);
          return s.isPointInFill(p);
        });
        if (got !== want) {
          misses++;
          if (list.length < 12) list.push(`${x}x${y} ${got ? "in" : "out"}`);
        }
      }
      return { found: true, misses, list };
    },
    { selector, points },
  );
}

/** A window's point on the screen: the plot's screen matrix at (w, h), the chart scrolled in. */
function screenPointOf(page: Page, win: Win) {
  return page.evaluate(([w, h]) => {
    const svg = document.querySelector("main svg[data-chart]");
    const plot = svg?.querySelector("[data-plot]") as SVGGraphicsElement | null;
    if (!svg || !plot) return null;
    svg.scrollIntoView({ block: "center" });
    const m = plot.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(w, h).matrixTransform(m);
    const el = document.elementFromPoint(p.x, p.y);
    return {
      x: p.x,
      y: p.y,
      under: el
        ? `<${el.tagName.toLowerCase()}${el.closest("[data-sounding]") ? ` in sounding ${el.closest("[data-sounding]")?.getAttribute("data-sounding")}` : ""}>`
        : "nothing",
    };
  }, win);
}

/** A sounding's centre on the screen, scrolled in. */
function soundingPoint(page: Page, k: string) {
  return page.evaluate((k) => {
    const a = document.querySelector(`main a[data-sounding="${k}"]`);
    if (!a || a.getClientRects().length === 0) return null;
    a.scrollIntoView({ block: "center" });
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, k);
}

/** The trials page's state at one moment: the frame's document, the readout, the ring, the fits. */
function readNow(page: Page) {
  return page.evaluate(
    (queries) => {
      const iframe = document.querySelector(
        "main iframe",
      ) as HTMLIFrameElement | null;
      const win = iframe?.contentWindow;
      const root = iframe?.contentDocument?.documentElement;
      const fb = document.querySelector("[data-freeboard]");
      const svg = document.querySelector("main svg[data-chart]");
      const plot = svg?.querySelector(
        "[data-plot]",
      ) as SVGGraphicsElement | null;
      const ring = svg?.querySelector("[data-ring]") as SVGCircleElement | null;
      let ringAt: { x: number; y: number } | null = null;
      const plotCtm = plot?.getScreenCTM();
      const ringCtm = ring?.getScreenCTM();
      if (ring && plotCtm && ringCtm) {
        const p = new DOMPoint(
          ring.cx.baseVal.value,
          ring.cy.baseVal.value,
        ).matrixTransform(plotCtm.inverse().multiply(ringCtm));
        ringAt = { x: p.x, y: p.y };
      }
      const shown = (el: Element | null) =>
        Boolean(
          el &&
            !el.closest("[hidden]") &&
            el.checkVisibility({ visibilityProperty: true }),
        );
      const stamped: number[] = [];
      const regions: number[] = [];
      for (let n = 1; n <= queries.length; n++) {
        if (shown(document.querySelector(`[data-fit="${n}"]`))) stamped.push(n);
        if (shown(document.querySelector(`[data-fit-region="${n}"]`)))
          regions.push(n);
      }
      const corner = document.querySelector("main [data-corner]");
      return {
        w: root?.clientWidth ?? null,
        h: win?.innerHeight ?? null,
        matches: win
          ? queries.flatMap((q, i) =>
              win.matchMedia(q).matches ? [i + 1] : [],
            )
          : [],
        freeboard: fb?.getAttribute("data-freeboard") ?? null,
        measure: fb?.getAttribute("data-measure") ?? null,
        size: (document.querySelector("[data-size]")?.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim(),
        path: location.pathname,
        history: history.length,
        ring: ringAt,
        stamped,
        regions,
        found: (() => {
          const line = document.querySelector("[data-found]");
          if (!line) return "";
          const copy = line.cloneNode(true) as Element;
          for (const el of copy.querySelectorAll('[aria-hidden="true"]'))
            el.remove();
          return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
        })(),
        dragging: Boolean(corner?.hasAttribute("data-dragging")),
        marker: (window as Window & { __marker?: number }).__marker ?? null,
      };
    },
    FITS.map((f) => f.query),
  );
}
type Now = Awaited<ReturnType<typeof readNow>>;

/** Waits until no drag is on and the frame is `win` and named so. */
function settled(page: Page, win: Win, timeout = 8000) {
  return until(
    () => readNow(page),
    (r) =>
      !r.dragging &&
      r.measure !== "live" &&
      r.w === win[0] &&
      r.h === win[1] &&
      r.size === sizeWords(win),
    timeout,
  );
}

/** The ring's distance from a window, in plot units, or Infinity with no ring. */
const ringOff = (r: { ring: Pt | null }, win: Win) =>
  r.ring
    ? Math.max(Math.abs(r.ring.x - win[0]), Math.abs(r.ring.y - win[1]))
    : Number.POSITIVE_INFINITY;

/** What the live region said since the `from`th change, read 1.8 s on (two settles' worth). */
async function spokenSince(page: Page, from: number, win: Win) {
  const read = async () => ((await probeOf(page))?.spoken ?? []).slice(from);
  await until(
    read,
    (s) => s.some((x) => x.text.includes(spokenWords(win))),
    1500,
  );
  await nodeWait(300);
  return read();
}

/** Every visible text node in the parent document. */
function visibleTexts(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, template, noscript"))
        continue;
      if (
        !parent.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        })
      )
        continue;
      const t = (node.textContent ?? "").trim();
      if (t) out.push(t);
    }
    return out;
  });
}

/**
 * Whether an element paints anything a visitor sees: its box shot as it is and with the element
 * set to `visibility: hidden` differ somewhere by more than 48 (summed channels). Works without
 * script, where `page.evaluate` still runs and `addStyleTag` hangs.
 */
async function paints(page: Page, selector: string) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as SVGElement | HTMLElement | null;
    if (!el || el.getClientRects().length === 0) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.left - 1),
      y: Math.max(0, r.top - 1),
      width: Math.max(1, r.width + 2),
      height: Math.max(1, r.height + 2),
    };
  }, selector);
  if (!box) return false;
  const shown = decodePng(await page.screenshot({ clip: box }));
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as SVGElement | HTMLElement | null;
    if (el) el.style.visibility = "hidden";
  }, selector);
  const gone = decodePng(await page.screenshot({ clip: box }));
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as SVGElement | HTMLElement | null;
    if (el) el.style.visibility = "";
  }, selector);
  for (let y = 0; y < Math.min(shown.height, gone.height); y++)
    for (let x = 0; x < Math.min(shown.width, gone.width); x++) {
      const [r1 = 0, g1 = 0, b1 = 0] = pixel(shown, x, y);
      const [r2 = 0, g2 = 0, b2 = 0] = pixel(gone, x, y);
      if (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) > 48)
        return true;
    }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Hands: the mouse on the corner, steered by what the frame reports (Tb's dragTo).

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

async function cornerAt(page: Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.getClientRects().length === 0) return null;
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, CORNER);
}

/**
 * Takes the corner with the mouse and moves it until the frame is within `tol` of `target`,
 * without releasing; `each` runs after every move with the button down. Assertion-free.
 */
async function dragTo(
  page: Page,
  target: Win,
  tol: { w: number; h: number },
  each?: (read: Now) => Promise<void>,
  step = 60,
) {
  const start = await cornerAt(page);
  if (!start) return { taken: false, reached: false, read: null, moves: 0 };
  let p = start;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  let read = await until(
    () => readNow(page),
    (r) => r.dragging,
    8000,
  );
  if (!read.dragging) {
    await page.mouse.up();
    return { taken: false, reached: false, read, moves: 0 };
  }
  let gx = 1;
  let gy = 1;
  let moves = 0;
  const near = (r: Now) =>
    r.w !== null &&
    r.h !== null &&
    Math.abs(target[0] - r.w) <= tol.w &&
    Math.abs(target[1] - r.h) <= tol.h;
  for (let i = 0; i < 60 && !near(read); i++) {
    const dx = clamp((target[0] - (read.w ?? target[0])) / gx, -step, step);
    const dy = clamp((target[1] - (read.h ?? target[1])) / gy, -step, step);
    const next = { x: p.x + dx, y: p.y + dy };
    await page.mouse.move(next.x, next.y, { steps: 2 });
    await frames(page);
    const now = await readNow(page);
    moves++;
    if (
      Math.abs(dx) > 2 &&
      now.w !== null &&
      read.w !== null &&
      now.w !== read.w
    )
      gx = clamp((now.w - read.w) / dx, 0.2, 20);
    if (
      Math.abs(dy) > 2 &&
      now.h !== null &&
      read.h !== null &&
      now.h !== read.h
    )
      gy = clamp((now.h - read.h) / dy, 0.2, 20);
    p = next;
    read = now;
    if (each) await each(now);
  }
  return { taken: true, reached: near(read), read, moves };
}
const TIGHT = { w: 4, h: 1 };

type RingFrame = { w: number; h: number; x: number; y: number } | null;
type Recorded = Window & { __rings?: RingFrame[]; __ringsOn?: boolean };

/**
 * Records, at every frame the page paints, the frame's window and the ring in plot units: read in
 * a task queued from requestAnimationFrame, so after that frame's own callbacks and paint, as a
 * visitor sees it. Assertion-free.
 */
function recordRing(page: Page) {
  return page.evaluate(() => {
    const w = window as Recorded;
    w.__rings = [];
    w.__ringsOn = true;
    const read = (): RingFrame => {
      const iframe = document.querySelector(
        "main iframe",
      ) as HTMLIFrameElement | null;
      const root = iframe?.contentDocument?.documentElement;
      const svg = document.querySelector("main svg[data-chart]");
      const plot = svg?.querySelector(
        "[data-plot]",
      ) as SVGGraphicsElement | null;
      const ring = svg?.querySelector("[data-ring]") as SVGCircleElement | null;
      const pm = plot?.getScreenCTM();
      const rm = ring?.getScreenCTM();
      if (!root || !iframe?.contentWindow || !ring || !pm || !rm) return null;
      const at = new DOMPoint(
        ring.cx.baseVal.value,
        ring.cy.baseVal.value,
      ).matrixTransform(pm.inverse().multiply(rm));
      return {
        w: root.clientWidth,
        h: iframe.contentWindow.innerHeight,
        x: at.x,
        y: at.y,
      };
    };
    const tick = () => {
      if (!w.__ringsOn) return;
      setTimeout(() => w.__rings?.push(read()), 0);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const recordedRing = (page: Page) =>
  page.evaluate(() => {
    const w = window as Recorded;
    w.__ringsOn = false;
    return w.__rings ?? [];
  });

/** The requests a context makes, and the JSON responses its pages' own frames receive. */
function watchContext(ctx: BrowserContext) {
  const requests: Request[] = [];
  const json: string[] = [];
  ctx.on("request", (r) => requests.push(r));
  ctx.on("response", (r) => {
    let frame: ReturnType<typeof r.frame>;
    try {
      frame = r.frame();
    } catch {
      return;
    }
    if (frame !== frame.page().mainFrame()) return;
    const type = r.headers()["content-type"] ?? "";
    if (/json/i.test(type)) json.push(`${new URL(r.url()).pathname} (${type})`);
  });
  return { requests, json };
}

// =============================================================================================

test("T16 T17 T18 the chart is the sweep; pins, soundings and the ring without script; tap to try: scripts off on /trials and /trials/320x568 main holds one svg[data-chart] whose [data-plot] is in window px, [data-band] fills exactly the sinking grid windows at all 13,029 points, its words give the sinking count and the total, the edge at each of the 101 widths equals a fresh measure within 0.5 px, the band and the ring show in forced colours; with script no JSON reaches the page from load through a tap and a drag; each PINS window marked once at its point with its freeboard, each sounding at its point linking to its window with its signed number and named in words, the four named windows among them, the ring at the shown window, no two sounding targets overlapping at 320, 390, 1024 and 1440, T6's links unchanged, and the walk from /trials to the 1366x595 sounding at 390x844; the first tap on the plot at 1024x640's point, by mouse at 1440x900 and by touch at 390x844, settles the frame there with the sweep's number, the address replaced, history unchanged, one message and the ring there; a sounding's tap tries it in place, a Ctrl- or Meta-click opens it; the ring follows a corner drag within 1 unit", async ({
  browser,
  request,
}) => {
  test.setTimeout(300_000);

  // ---- T16 and T17, scripts off at 1440 x 900, on /trials and /trials/320x568.
  const off = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await off.newPage();
  const points: [number, number, boolean][] = GRID.map((g) => [
    g.win[0],
    g.win[1],
    g.freeboard < 0,
  ]);
  for (const shownWin of [HOME, GAP]) {
    const route = addressOf(shownWin);
    expect
      .soft((await page.goto(route))?.status(), `status of ${route}`)
      .toBe(200);
    const c = await readChart(page);
    expect
      .soft(
        {
          charts: c.charts,
          plots: c.plots,
          inFigure: c.inFigure,
          bands: c.bands,
        },
        `T16: on ${route}, main's svg[data-chart] (in a figure), its [data-plot] and its [data-band]`,
      )
      .toEqual({ charts: 1, plots: 1, inFigure: true, bands: 1 });
    const s = c.screen;
    expect
      .soft(
        s !== null &&
          Math.abs(s.b) < 1e-6 &&
          Math.abs(s.c) < 1e-6 &&
          s.a > 0 &&
          s.d < 0,
        `T16: on ${route}, [data-plot]'s screen matrix scales and flips only, width across and height up: ${JSON.stringify(s)}`,
      )
      .toBe(true);
    const band = await fillMisses(page, "[data-band]", points);
    expect
      .soft(
        { found: band.found, misses: band.misses, first: band.list },
        `T16: on ${route}, grid points where [data-band]'s fill differs from "the swept freeboard is under 0" (of 13,029, ${count(SINKING)} sinking)`,
      )
      .toEqual({ found: true, misses: 0, first: [] });
    expect
      .soft(
        c.caption.startsWith(captionWords(count(SINKING), count(GRID.length))),
        `T16: on ${route}, the chart's words give ${count(SINKING)} sinking of ${count(GRID.length)} (words.md, 1): "${c.caption}"`,
      )
      .toBe(true);

    // T17: the pins.
    const pinProblems: string[] = [];
    const marked = new Map<string, number>();
    for (const pin of c.pins) {
      const wins: Win[] = [];
      for (const k of pin.windows) {
        marked.set(k, (marked.get(k) ?? 0) + 1);
        const win = parseKey(k);
        if (!win || !PINS.has(k))
          pinProblems.push(`a pin lists ${k}, not a PINS window`);
        else wins.push(win);
      }
      const where = `the pin for ${pin.windows.slice(0, 3).join(" ")}${pin.windows.length > 3 ? ` (${pin.windows.length})` : ""}`;
      const miss = placed(pin.box, wins);
      if (miss) pinProblems.push(`${where}: ${miss}`);
      const want = wins.map(
        (w) => sweptAt(w[0], w[1])?.freeboard.toFixed(1) ?? "?",
      );
      const got = pin.freeboards.map((f) => Number(f).toFixed(1));
      if (JSON.stringify(got) !== JSON.stringify(want))
        pinProblems.push(
          `${where}: data-freeboard ${pin.freeboards.join(" ")}, the sweep's ${want.join(" ")}`,
        );
      if (pin.text !== "" && wins.length === 1) {
        const signed = signedAt(wins[0] as Win);
        if (
          signed &&
          !pin.text.replace("-", "−").includes(signed.replace("-", "−"))
        )
          pinProblems.push(`${where}: its label "${pin.text}" lacks ${signed}`);
      }
    }
    for (const k of PINS.keys())
      if (marked.get(k) !== 1)
        pinProblems.push(`${k} marked ${marked.get(k) ?? 0} times`);
    expect
      .soft(
        pinProblems,
        `T17: on ${route}, the [data-pin] marks against PINS and the sweep`,
      )
      .toEqual([]);

    // T17: the soundings.
    const soundProblems: string[] = [];
    const seen = new Set<string>();
    for (const sounding of c.soundings) {
      const win = parseKey(sounding.key);
      const where = `sounding ${sounding.key}`;
      if (seen.has(sounding.key)) soundProblems.push(`${where} twice`);
      seen.add(sounding.key);
      if (!win || !sweptAt(win[0], win[1])) {
        soundProblems.push(`${where}: not a swept window`);
        continue;
      }
      if (!sounding.inChart) soundProblems.push(`${where}: outside the chart`);
      if (sounding.href !== addressOf(win))
        soundProblems.push(
          `${where}: href ${sounding.href}, want ${addressOf(win)}`,
        );
      // decisions.md 5: the dot is centred on the point; the hit rect holds it, off-centre or not.
      const miss = placed(sounding.dot, [win]);
      if (miss) soundProblems.push(`${where}: its dot ${miss}`);
      const hit = sounding.hit;
      if (
        !hit ||
        win[0] < hit.left - 0.5 ||
        win[0] > hit.right + 0.5 ||
        win[1] < hit.top - 0.5 ||
        win[1] > hit.bottom + 0.5
      )
        soundProblems.push(
          `${where}: its hit rect ${hit ? `${hit.left.toFixed(1)} to ${hit.right.toFixed(1)}, ${hit.top.toFixed(1)} to ${hit.bottom.toFixed(1)}` : "missing"} doesn't hold its point`,
        );
      const signed = signedAt(win) ?? "?";
      if (!sounding.text.replace(/-/g, "−").includes(signed.replace(/-/g, "−")))
        soundProblems.push(
          `${where}: its visible number "${sounding.text}", want ${signed}`,
        );
    }
    for (const named of NAMED)
      if (!seen.has(key(named)))
        soundProblems.push(`the named window ${key(named)} isn't a sounding`);
    expect.soft(soundProblems, `T17: on ${route}, the soundings`).toEqual([]);
    if (shownWin === HOME) {
      for (const sounding of c.soundings) {
        const win = parseKey(sounding.key);
        if (!win) continue;
        const status = (await request.get(addressOf(win))).status();
        expect
          .soft(status, `T17: status of sounding ${sounding.key}'s address`)
          .toBe(200);
        // The name gives the number and the size, as heard (words.md, 2).
        const name = `${signedAt(win)} pixels at ${spokenWords(win)}`;
        await expect
          .soft(
            page.locator(`main a[data-sounding="${sounding.key}"]`),
            `T17: sounding ${sounding.key}'s accessible name`,
          )
          .toHaveAccessibleName(name, { timeout: 1000 });
      }
    }

    // T17: the ring at the shown window, and T6's links.
    expect
      .soft(
        { rings: c.rings, within: ringOff(c, shownWin) <= 0.5 },
        `T17: on ${route}, one [data-ring] at ${at(shownWin)} within 0.5 units: ${JSON.stringify(c.ring)}`,
      )
      .toEqual({ rings: 1, within: true });
    expect
      .soft(
        { links: [...c.windowLinks].sort(), inChart: c.windowLinksInChart },
        `T17: on ${route}, T6's a[data-window] set, none in the chart`,
      )
      .toEqual({ links: [...PINS.keys()].sort(), inChart: 0 });
  }

  // T16: the edge is current. At each width, the highest sinking window and the one a step above
  // (or 460 where nothing sinks), measured fresh by T4's rule on one scripts-off page resized.
  {
    const edge: Win[] = [];
    for (let w = 320; w <= 1920; w += 16) {
      const column = GRID.filter((g) => g.win[0] === w);
      const sunk = column.filter((g) => g.freeboard < 0).map((g) => g.win[1]);
      if (sunk.length === 0) edge.push([w, 460]);
      else {
        const top = Math.max(...sunk);
        edge.push([w, top]);
        if (top + 5 <= 1100) edge.push([w, top + 5]);
      }
    }
    expect((await page.goto(FRAME))?.status(), `status of ${FRAME}`).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const stale: string[] = [];
    for (const win of edge) {
      await page.setViewportSize({ width: win[0], height: win[1] });
      const m = await measureTop(page);
      const s = sweptAt(win[0], win[1]);
      if (m.found !== 3 || !s || !(Math.abs(m.freeboard - s.freeboard) <= 0.5))
        stale.push(
          `${at(win)}: measured ${m.freeboard.toFixed(2)} (${m.found} links), swept ${s?.freeboard}`,
        );
    }
    test.info().annotations.push({
      type: "T16 edge",
      description: `${edge.length} windows measured at the band's edge`,
    });
    expect
      .soft(
        stale,
        `T16: edge windows where the sweep differs from a fresh measure by more than 0.5 px; rewrite it with \`${SWEEP_COMMAND}\``,
      )
      .toEqual([]);
  }

  // T17: no two sounding targets overlap, at 320, 390, 1024 and 1440.
  expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(200);
  for (const [w, h] of [
    [320, 568],
    [390, 844],
    [1024, 768],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    const c = await readChart(page);
    const overlaps: string[] = [];
    c.soundings.forEach((a, i) => {
      for (const b of c.soundings.slice(i + 1)) {
        const x =
          Math.min(a.client.right, b.client.right) -
          Math.max(a.client.left, b.client.left);
        const y =
          Math.min(a.client.bottom, b.client.bottom) -
          Math.max(a.client.top, b.client.top);
        if (x > 0.5 && y > 0.5)
          overlaps.push(
            `${a.key} and ${b.key} by ${x.toFixed(1)} x ${y.toFixed(1)} px`,
          );
      }
    });
    expect
      .soft(c.soundings.length, `T17: soundings at ${w} wide`)
      .toBeGreaterThanOrEqual(NAMED.length);
    expect
      .soft(overlaps, `T17: sounding targets overlapping at ${w} x ${h}`)
      .toEqual([]);
  }

  // T17: the walk, scripts off at 390 x 844.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/trials");
  const near = page.locator('main a[data-sounding="1366x595"]');
  const nears = await near.count();
  expect.soft(nears, "T17: the 1366 x 595 sounding on /trials").toBe(1);
  // Without it the walk can't start; its red is the one above and the path below.
  if (nears === 1) await near.click();
  await page
    .waitForURL("**/trials/1366x595", { timeout: 10_000 })
    .catch(() => undefined);
  const walked = await readChart(page);
  expect
    .soft(
      {
        path: new URL(page.url()).pathname,
        ...(await page.evaluate(() => ({
          kind:
            document.querySelector("[data-kind]")?.getAttribute("data-kind") ??
            null,
          verdict: (
            document.querySelector("[data-verdict]")?.textContent ?? ""
          ).trim(),
        }))),
        ring: ringOff(walked, [1366, 595]) <= 0.5,
      },
      `T17: the walk from /trials by the 1366 x 595 sounding, scripts off at 390 x 844 (ring at ${JSON.stringify(walked.ring)})`,
    )
    .toEqual({
      path: "/trials/1366x595",
      kind: "near",
      verdict: VERDICT.near,
      ring: true,
    });
  await off.close();

  // T16: in forced colours the band and the ring show.
  {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
      forcedColors: "active",
    });
    const fc = await ctx.newPage();
    await fc.goto("/trials");
    for (const sel of [
      "main svg[data-chart] [data-band]",
      "main svg[data-chart] [data-ring]",
    ])
      expect
        .soft(await paints(fc, sel), `T16: ${sel} shows in forced colours`)
        .toBe(true);
    await ctx.close();
  }

  // ---- T18 by mouse at 1440 x 900 (and T16's no JSON, T18's ring in a drag).
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const watched = watchContext(ctx);
    const page = await ctx.newPage();
    await instrument(page);
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    const length = await page.evaluate(() => history.length);
    const target: Win = [1024, 640];
    const p = await screenPointOf(page, target);
    expect
      .soft(p, `T18: ${at(target)}'s point on the plot at 1440 x 900`)
      .not.toBeNull();
    if (p) {
      const before = (await probeOf(page))?.spoken.length ?? 0;
      await page.mouse.click(p.x, p.y);
      const r = await settled(page, target);
      const spoken = await spokenSince(page, before, target);
      const said = spoken.filter((s) => s.text !== "");
      const swept = sweptAt(target[0], target[1]);
      expect
        .soft(
          {
            w: r.w,
            h: r.h,
            freeboard: Number(r.freeboard).toFixed(1),
            path: r.path,
            history: r.history,
            spoken: said.length,
            named: said[0]?.text.includes(spokenWords(target)) ?? false,
            ring: ringOff(r, target) <= 0.5,
          },
          `T18: the first click on the plot at ${at(target)}'s point (over ${p.under}), by mouse at 1440 x 900: ${JSON.stringify(said.map((s) => s.text))}`,
        )
        .toEqual({
          w: target[0],
          h: target[1],
          freeboard: swept?.freeboard.toFixed(1),
          path: addressOf(target),
          history: length,
          spoken: 1,
          named: true,
          ring: true,
        });
    }

    // A sounding's click tries it in place; Ctrl and Meta open it as a link.
    await page.evaluate(() => {
      (window as Window & { __marker?: number }).__marker = 1;
    });
    const sounding: Win = [1366, 595];
    const sp = await soundingPoint(page, key(sounding));
    expect.soft(sp, `T18: the ${at(sounding)} sounding shown`).not.toBeNull();
    if (sp) {
      await page.mouse.click(sp.x, sp.y);
      const r = await settled(page, sounding);
      expect
        .soft(
          {
            w: r.w,
            h: r.h,
            path: r.path,
            history: r.history,
            marker: r.marker,
            ring: ringOff(r, sounding) <= 0.5,
          },
          `T18: a click on the ${at(sounding)} sounding tries it in place`,
        )
        .toEqual({
          w: sounding[0],
          h: sounding[1],
          path: addressOf(sounding),
          history: length,
          marker: 1,
          ring: true,
        });
    }
    const other: Win = [792, 575];
    // A Ctrl-click opens it as a link, in a new tab, and this page stays as it was.
    {
      const link = page.locator(`main a[data-sounding="${key(other)}"]`);
      const opened = ctx
        .waitForEvent("page", { timeout: 5000 })
        .catch(() => null);
      await link
        .click({ modifiers: ["Control"], timeout: 5000 })
        .catch(() => undefined);
      const popup = await opened;
      await nodeWait(500);
      const r = await readNow(page);
      if (popup)
        await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      expect
        .soft(
          {
            opened: popup ? new URL(popup.url()).pathname : null,
            w: r.w,
            h: r.h,
            path: r.path,
            marker: r.marker,
          },
          `T18: a Ctrl-click on the ${at(other)} sounding opens it in a new tab and leaves this page at ${at(sounding)}`,
        )
        .toEqual({
          opened: addressOf(other),
          w: sounding[0],
          h: sounding[1],
          path: addressOf(sounding),
          marker: 1,
        });
      await popup?.close();
    }

    // The ring through a corner drag, 574 px of width in small moves, read at every painted frame.
    const toward: Win = [792, 575];
    await recordRing(page);
    const drag = await dragTo(page, toward, TIGHT, undefined, 12);
    expect
      .soft(drag.taken, "T18: a corner drag taken from 1366 x 595")
      .toBe(true);
    const painted = (await recordedRing(page)).filter(
      (f): f is NonNullable<RingFrame> => f !== null,
    );
    await page.mouse.up();
    const rest = await settled(page, toward);
    const moving = new Set(painted.map((f) => `${f.w}x${f.h}`)).size;
    const far = painted
      .filter((f) => Math.max(Math.abs(f.x - f.w), Math.abs(f.y - f.h)) > 1)
      .map(
        (f) =>
          `frame ${f.w} x ${f.h}, ring ${f.x.toFixed(1)}, ${f.y.toFixed(1)}`,
      );
    test.info().annotations.push({
      type: "T18 ring",
      description: `${painted.length} painted frames in ${drag.moves} moves, ${moving} distinct windows`,
    });
    expect
      .soft(
        moving,
        `T18: distinct windows among the ${painted.length} painted frames of the drag (${drag.moves} moves)`,
      )
      .toBeGreaterThan(10);
    expect
      .soft(
        far.slice(0, 8),
        `T18: painted frames where the ring is over 1 unit from the frame's window (${far.length} of ${painted.length})`,
      )
      .toEqual([]);
    expect
      .soft(
        ringOff(rest, toward) <= 0.5,
        `T18: the ring at rest with the frame at ${at(toward)}: ${JSON.stringify(rest.ring)}`,
      )
      .toBe(true);
    expect
      .soft(
        watched.json,
        "T16: JSON responses the page's frame received from load through a tap and a drag",
      )
      .toEqual([]);
    await ctx.close();
  }

  // ---- T18 by touch at 390 x 844.
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    await instrument(page);
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    const length = await page.evaluate(() => history.length);
    const target: Win = [1024, 640];
    const p = await screenPointOf(page, target);
    expect
      .soft(p, `T18: ${at(target)}'s point on the plot at 390 x 844`)
      .not.toBeNull();
    if (p) {
      const before = (await probeOf(page))?.spoken.length ?? 0;
      await page.touchscreen.tap(p.x, p.y);
      const r = await settled(page, target);
      const said = (await spokenSince(page, before, target)).filter(
        (s) => s.text !== "",
      );
      expect
        .soft(
          {
            w: r.w,
            h: r.h,
            freeboard: Number(r.freeboard).toFixed(1),
            path: r.path,
            history: r.history,
            spoken: said.length,
            named: said[0]?.text.includes(spokenWords(target)) ?? false,
            ring: ringOff(r, target) <= 0.5,
          },
          `T18: the first tap on the plot at ${at(target)}'s point (over ${p.under}), by touch at 390 x 844: ${JSON.stringify(said.map((s) => s.text))}`,
        )
        .toEqual({
          w: target[0],
          h: target[1],
          freeboard: sweptAt(target[0], target[1])?.freeboard.toFixed(1),
          path: addressOf(target),
          history: length,
          spoken: 1,
          named: true,
          ring: true,
        });
    }
    const sounding: Win = [792, 575];
    const sp = await soundingPoint(page, key(sounding));
    expect
      .soft(sp, `T18: the ${at(sounding)} sounding shown at 390 x 844`)
      .not.toBeNull();
    if (sp) {
      await page.touchscreen.tap(sp.x, sp.y);
      const r = await settled(page, sounding);
      expect
        .soft(
          { w: r.w, h: r.h, path: r.path, history: r.history },
          `T18: a tap on the ${at(sounding)} sounding tries it in place at 390 x 844`,
        )
        .toEqual({
          w: sounding[0],
          h: sounding[1],
          path: addressOf(sounding),
          history: length,
        });
    }
    await ctx.close();
  }

  // ---- T18: a sounding's tap is tried in place on the first touch too.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto("/trials");
    await frameReady(page);
    await page.evaluate(() => {
      (window as Window & { __marker?: number }).__marker = 1;
    });
    const length = await page.evaluate(() => history.length);
    const sounding: Win = [1366, 595];
    const sp = await soundingPoint(page, key(sounding));
    expect
      .soft(sp, `T18: the ${at(sounding)} sounding on a fresh /trials`)
      .not.toBeNull();
    if (sp) {
      await page.mouse.click(sp.x, sp.y);
      const r = await settled(page, sounding);
      expect
        .soft(
          {
            w: r.w,
            h: r.h,
            path: r.path,
            history: r.history,
            marker: r.marker,
          },
          `T18: the first touch, a click on the ${at(sounding)} sounding, tries it in place`,
        )
        .toEqual({
          w: sounding[0],
          h: sounding[1],
          path: addressOf(sounding),
          history: length,
          marker: 1,
        });
    }
    // A Meta-click opens it as a link: the page leaves it to the browser, which on Linux follows
    // it in this tab and on a Mac opens a new one; either way the link's own address loads.
    {
      const other: Win = [792, 575];
      const opened = ctx
        .waitForEvent("page", { timeout: 3000 })
        .catch(() => null);
      await page
        .locator(`main a[data-sounding="${key(other)}"]`)
        .click({ modifiers: ["Meta"], timeout: 5000 })
        .catch(() => undefined);
      const popup = await opened;
      if (popup)
        await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
      else
        await page
          .waitForURL(`**${addressOf(other)}`, { timeout: 5000 })
          .catch(() => undefined);
      const r = await readNow(page);
      const followed = popup
        ? new URL(popup.url()).pathname === addressOf(other) && r.marker === 1
        : r.path === addressOf(other) && r.marker === null;
      expect
        .soft(
          followed,
          `T18: a Meta-click on the ${at(other)} sounding opens it as a link (${popup ? `a new tab at ${new URL(popup.url()).pathname}` : `this tab at ${r.path}, ${r.marker === null ? "a new document" : "the same document, tried in place"}`})`,
        )
        .toBe(true);
    }
    await ctx.close();
  }
});

// =============================================================================================

/** T19's windows: PINS, the named windows and the grid windows either side of each boundary. */
const T19_WINDOWS: Win[] = (() => {
  const out = new Map<string, Win>();
  const add = (win: Win) => out.set(key(win), win);
  for (const win of [...PIN_WINDOWS, ...NAMED]) add(win);
  for (const w of [320, 336, 752, 768, 1008, 1024, 1232, 1248, 1264, 1280])
    for (const h of [640, 900]) add([w, h]);
  for (const h of [710, 715]) add([1280, h]);
  for (const h of [895, 900]) add([1440, h]);
  for (const h of [955, 960]) add([1024, h]);
  for (const h of [980, 985]) add([1600, h]);
  return [...out.values()];
})();

/** The `@media` preludes in a stylesheet's text: each squashed, with its 1-based line. */
function mediaPreludes(css: string) {
  const out: { prelude: string; line: number }[] = [];
  for (const m of css.matchAll(/@media\b([^{]*)\{/g)) {
    out.push({
      prelude: squash(m[1]),
      line: css.slice(0, m.index).split("\n").length,
    });
  }
  return out;
}

const decode = (s: string) =>
  s
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** The server HTML's stamps: each `[data-fit]` tag's number, query and whether it is hidden. */
function stampsIn(html: string) {
  return [...html.matchAll(/<[a-z]+\b[^>]*\bdata-fit="(\d+)"[^>]*>/g)].map(
    (m) => ({
      n: Number(m[1]),
      query: decode(m[0].match(/\bdata-query="([^"]*)"/)?.[1] ?? ""),
      hidden: /\shidden(=""|\s|>|\/)/.test(m[0]),
    }),
  );
}

/**
 * What the scripts-off page shows of each fit: shown or not, its text, its links. A stamp is its
 * `[data-fit]` plus the shared lines of its sprint's group, `[data-sprint]` (Iris groups the
 * stamps by sprint so each sprint's line reads once; Forge's markup, by Atlas).
 */
function readStamps(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-fit]")].map((el) => {
      const group = el.parentElement?.closest("[data-sprint]") ?? null;
      const shared: Node[] = [];
      if (group) {
        const copy = group.cloneNode(true) as Element;
        for (const fit of copy.querySelectorAll("[data-fit]")) fit.remove();
        shared.push(copy);
      }
      const links = [
        ...el.querySelectorAll("a"),
        ...(group
          ? [...group.querySelectorAll("a")].filter(
              (a) => !a.closest("[data-fit]"),
            )
          : []),
      ];
      return {
        n: Number(el.getAttribute("data-fit")),
        query: el.getAttribute("data-query") ?? "",
        group: group?.getAttribute("data-sprint") ?? null,
        shown:
          !el.closest("[hidden]") &&
          el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }),
        text: [el, ...shared]
          .map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim())
          .join(" "),
        links: links.map((a) => ({
          href: a.href,
          text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
        })),
      };
    }),
  );
}

test("T19 T20 T21 the seven fits are the stylesheet's; each stamp is its retro; found, for this visit only: the oracle holds the contract's table and each [data-fit] its query, found once as a media query in the build's app/globals.css and linked at its line at the build's commit, its sprint a merged retro with the table's pull request; scripts off, the stamped fits are the ones the frame's document matches at PINS, the named windows and either side of every boundary (1440x900 none, 320x568 3 and 4, 1366x595 1 and 2, 1024x640 5 and 6); a stamp shows its words, pull request, sprint linked to its record, the revision row's names and its retro's first wrong turn, with no check code or URL path, and an unentered fit shows none of its words; with script arriving finds the window's fits and the count reads n of 7, a drag stamps a fit the moment the frame matches it and shows its region, which equals the query at every grid point, nothing is spoken mid-drag and the settle names what it found; a reload and a crew window's link keep the count with CLS 0 at 390 and 1440, a new context starts afresh, found lives in one sessionStorage key and nowhere else; under reduced motion no stamp moves and at rest + 1 s nothing animates; without script the window's own fits and how many of the seven, no visit count", async ({
  browser,
  request,
}) => {
  test.setTimeout(300_000);
  const refs = DEPLOYED
    ? /^(main|[0-9a-f]{40})$/
    : new RegExp(`^${process.env.VERCEL_GIT_COMMIT_SHA || "main"}$`);

  // ---- T19: the oracle, the stylesheet and the retros.
  expect
    .soft(
      FITS.map((f) => f.n),
      "T19: the oracle holds seven fits, in the table's order",
    )
    .toEqual([1, 2, 3, 4, 5, 6, 7]);
  const css = readFileSync(join(process.cwd(), GLOBALS), "utf8");
  const preludes = mediaPreludes(css);
  const lineOf = new Map<number, number>();
  const cssProblems: string[] = [];
  for (const fit of FITS) {
    const hits = preludes.filter((p) => p.prelude === squash(fit.query));
    if (hits.length !== 1)
      cssProblems.push(
        `fit ${fit.n}: ${hits.length} @media rules hold "${fit.query}"`,
      );
    else lineOf.set(fit.n, hits[0]?.line ?? 0);
    const retro = MERGED.find((r) => r.sprint === fit.sprint);
    if (!retro || retro.pr !== fit.pr)
      cssProblems.push(
        `fit ${fit.n}: sprint ${fit.sprint}'s merged retro has pr ${retro?.pr}, the table ${fit.pr}`,
      );
  }
  test.info().annotations.push({
    type: "T19 lines",
    description: FITS.map(
      (f) => `${f.n}: L${lineOf.get(f.n)} (L${f.lineAtContract} at d6b9fbf)`,
    ).join(", "),
  });
  expect
    .soft(cssProblems, `T19: the seven queries in ${GLOBALS} and the retros`)
    .toEqual([]);

  // ---- T19: each [data-fit] carries its query and links to its line, scripts off on /trials.
  const off = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await off.newPage();
  expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(200);
  {
    const stamps = await readStamps(page);
    const problems: string[] = [];
    if (JSON.stringify(stamps.map((s) => s.n)) !== "[1,2,3,4,5,6,7]")
      problems.push(
        `[data-fit] ${JSON.stringify(stamps.map((s) => s.n))}, want 1 to 7 in order`,
      );
    for (const fit of FITS) {
      const stamp = stamps.find((s) => s.n === fit.n);
      if (!stamp) continue;
      if (stamp.query !== fit.query)
        problems.push(
          `fit ${fit.n}: data-query "${stamp.query}", want "${fit.query}"`,
        );
      const links = stamp.links.filter((l) => l.href.includes(GLOBALS));
      const m = links[0]?.href.match(
        /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/blob\/([^/]+)\/app\/globals\.css#L(\d+)$/,
      );
      if (links.length !== 1 || !m)
        problems.push(
          `fit ${fit.n}: links to ${GLOBALS} ${JSON.stringify(links.map((l) => l.href))}, want one to ${BLOB}/<ref>/${GLOBALS}#L<n>`,
        );
      else {
        if (!refs.test(m[1] ?? "")) problems.push(`fit ${fit.n}: ref ${m[1]}`);
        if (Number(m[2]) !== lineOf.get(fit.n))
          problems.push(
            `fit ${fit.n}: line ${m[2]}, want ${lineOf.get(fit.n)}`,
          );
      }
    }
    expect
      .soft(
        problems,
        "T19: the [data-fit] stamps, their queries and their links",
      )
      .toEqual([]);
  }

  // ---- T19: the stamped fits are the frame's matches, at every window T19 reads.
  {
    expect((await page.goto(FRAME))?.status(), `status of ${FRAME}`).toBe(200);
    const wrong: string[] = [];
    const oracle: string[] = [];
    for (const win of T19_WINDOWS) {
      await page.setViewportSize({ width: win[0], height: win[1] });
      const matched = await page.evaluate(
        (queries) =>
          queries.flatMap((q, i) => (matchMedia(q).matches ? [i + 1] : [])),
        FITS.map((f) => f.query),
      );
      const response = await request.get(addressOf(win));
      const stamps = stampsIn(await response.text());
      const stamped = stamps.filter((s) => !s.hidden).map((s) => s.n);
      if (
        response.status() !== 200 ||
        stamps.length !== 7 ||
        JSON.stringify(stamped) !== JSON.stringify(matched)
      )
        wrong.push(
          `${at(win)}: ${response.status()}, ${stamps.length} stamps, stamped ${JSON.stringify(stamped)}, the frame matches ${JSON.stringify(matched)}`,
        );
      if (JSON.stringify(fitsAt(win[0], win[1])) !== JSON.stringify(matched))
        oracle.push(
          `${at(win)}: the oracle reads ${JSON.stringify(fitsAt(win[0], win[1]))}, the frame ${JSON.stringify(matched)}`,
        );
    }
    test.info().annotations.push({
      type: "T19 windows",
      description: `${T19_WINDOWS.length} windows read by request and on ${FRAME}`,
    });
    expect
      .soft(
        oracle,
        "T19: the oracle's reading of the queries against the browser's",
      )
      .toEqual([]);
    expect
      .soft(
        wrong,
        "T19: windows whose server-stamped fits differ from the frame's matches",
      )
      .toEqual([]);
    for (const [win, want] of [
      [HOME, []],
      [GAP, [3, 4]],
      [
        [1366, 595],
        [1, 2],
      ],
      [
        [1024, 640],
        [5, 6],
      ],
    ] as [Win, number[]][]) {
      const stamps = stampsIn(await (await request.get(addressOf(win))).text());
      expect
        .soft(
          stamps.filter((s) => !s.hidden).map((s) => s.n),
          `T19: the fits ${addressOf(win)} stamps`,
        )
        .toEqual(want);
    }
  }

  // ---- T20: each stamp is its retro, scripts off.
  {
    const words: string[] = [];
    const problems: string[] = [];
    for (const win of [GAP, [1366, 595], [1024, 640], [1024, 960]] as Win[]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      expect
        .soft(
          (await page.goto(addressOf(win)))?.status(),
          `status of ${addressOf(win)}`,
        )
        .toBe(200);
      const stamps = await readStamps(page);
      const entered = fitsAt(win[0], win[1]);
      const texts = (await visibleTexts(page)).join("\n");
      for (const fit of FITS) {
        const stamp = stamps.find((s) => s.n === fit.n);
        const where = `${at(win)} fit ${fit.n}`;
        if (!entered.includes(fit.n)) {
          if (stamp?.shown)
            problems.push(`${where}: shown, and the window doesn't enter it`);
          if (texts.includes(fit.stamp) || texts.includes(fit.where))
            problems.push(
              `${where}: its words show, and the window doesn't enter it`,
            );
          continue;
        }
        if (!stamp?.shown) {
          problems.push(`${where}: not shown`);
          continue;
        }
        const retro = MERGED.find((r) => r.sprint === fit.sprint);
        const cells = retro ? cellsOf(retro) : null;
        const table = crewCells(fit);
        if (!retro || !cells) {
          problems.push(`${where}: no merged retro for sprint ${fit.sprint}`);
          continue;
        }
        // The table is the retro's: its revision row's names and its first wrong turn.
        if (
          cells.drawn !== table.drawn ||
          cells.checked !== table.checked ||
          cells.tested !== table.tested
        )
          problems.push(
            `${where}: the revision row reads ${cells.drawn} / ${cells.checked} / ${cells.tested}, the table ${fit.crew}`,
          );
        if (retro.wentWrong[0] !== fit.wentWrong)
          problems.push(
            `${where}: the retro's first wrong turn is "${retro.wentWrong[0]}", the table's "${fit.wentWrong}"`,
          );
        const missing = [
          fit.stamp,
          fit.where,
          `Sprint ${fit.sprint}: ${retro.goal}`,
          `Pull request #${fit.pr}`,
          ...cells.drawn.split(", "),
          ...(retro.checked ? ["Lens"] : []),
          ...(retro.tested ? ["Probe"] : []),
          retro.wentWrong[0] ?? "(none)",
        ].filter((w) => !stamp.text.includes(w));
        if (missing.length > 0)
          problems.push(
            `${where}: lacks ${JSON.stringify(missing)} in "${stamp.text}"`,
          );
        const record = stamp.links.filter(
          (l) => new URL(l.href).pathname === `/log/${fit.sprint}`,
        );
        if (
          record.length !== 1 ||
          !record[0]?.text.includes(String(fit.sprint))
        )
          problems.push(
            `${where}: links to its record ${JSON.stringify(record)}, want one to /log/${fit.sprint} naming the sprint`,
          );
      }
      for (const t of await visibleTexts(page))
        if (CODE.test(t) || URL_PATH.test(t))
          words.push(`${at(win)}: "${t.slice(0, 80)}"`);
    }
    for (const sprint of [...new Set(FITS.map((f) => f.sprint))])
      expect
        .soft(
          (await request.get(`/log/${sprint}`)).status(),
          `T20: status of /log/${sprint}`,
        )
        .toBe(200);
    expect.soft(problems, "T20: the stamps against their retros").toEqual([]);
    expect
      .soft(
        [...new Set(words)],
        "T20: visible text with a check code or a URL path",
      )
      .toEqual([]);
  }

  // ---- T21 without script: the window's own fits and how many of the seven, no visit count.
  {
    const win: Win = [1366, 595];
    await page.goto(addressOf(win));
    const found = await page.evaluate(() =>
      (document.querySelector("[data-found]")?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    );
    expect
      .soft(
        found,
        `T21: without script, ${addressOf(win)}'s count line, with no visit count`,
      )
      .toBe(windowCount(2));
    await page.goto("/trials");
    expect
      .soft(
        await page.evaluate(() =>
          (document.querySelector("[data-found]")?.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim(),
        ),
        "T21: without script, /trials's count line",
      )
      .toBe(windowCount(0));
  }
  await off.close();

  // ---- T21 with script, at 1440 x 900: arrive, drag, settle, type; then regions, storage, reload.
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const watched = watchContext(ctx);
  await instrument(ctx);
  const live = await ctx.newPage();
  expect((await live.goto("/trials"))?.status(), "status of /trials").toBe(200);
  await frameReady(live);
  // What a settle says for each fit it finds: each stamp's `data-said` (Pixel, by Atlas).
  const saidFor: Record<number, string> = await live.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll("[data-fit]")].map((el) => [
        Number(el.getAttribute("data-fit")),
        (el.getAttribute("data-said") ?? "").replace(/\s+/g, " ").trim(),
      ]),
    ),
  );
  expect
    .soft(
      FITS.filter((f) => saidFor[f.n] !== f.said).map(
        (f) => `${f.n}: "${saidFor[f.n]}"`,
      ),
      "T21: fits whose data-said isn't Iris's sentence (words.md, 4)",
    )
    .toEqual([]);
  const names = (text: string | undefined) =>
    FITS.filter(
      (f) => saidFor[f.n] && (text ?? "").includes(saidFor[f.n] ?? ""),
    ).map((f) => f.n);
  {
    const r = await until(
      () => readNow(live),
      (now) => now.found === visitCount(0),
      2000,
    );
    expect
      .soft(
        { stamped: r.stamped, count: r.found === visitCount(0) },
        `T21: arriving at /trials, no fit found: "${r.found}"`,
      )
      .toEqual({ stamped: [], count: true });
  }

  // A drag from 1440 x 900 to 1440 x 640: fit 1 at once, fit 2 under 712.
  const ever = new Set<number>();
  const lagging: string[] = [];
  let minWidth = Number.POSITIVE_INFINITY;
  const spoken0 = (await probeOf(live))?.spoken.length ?? 0;
  const down: Win = [1440, 640];
  const drag = await dragTo(live, down, TIGHT, async (r) => {
    if (r.w !== null) minWidth = Math.min(minWidth, r.w);
    for (const n of r.matches) ever.add(n);
    const unstamped = r.matches.filter((n) => !r.stamped.includes(n));
    const unshown = r.matches.filter((n) => !r.regions.includes(n));
    if (unstamped.length > 0 || unshown.length > 0)
      lagging.push(
        `at ${r.w} x ${r.h} the frame matches ${JSON.stringify(r.matches)}: unstamped ${JSON.stringify(unstamped)}, regions unshown ${JSON.stringify(unshown)}`,
      );
  });
  expect.soft(drag.taken, "T21: a corner drag taken at /trials").toBe(true);
  expect
    .soft(
      lagging.slice(0, 8),
      "T21: sampled frames where a matched fit isn't stamped, or its region not shown",
    )
    .toEqual([]);
  expect
    .soft([...ever].sort(), "T21: the fits the drag's sampled frames matched")
    .toEqual([1, 2]);
  await live.mouse.up();
  {
    const r = await settled(live, down);
    if (minWidth >= 1280)
      expect
        .soft(r.stamped, `T21: stamped after the drag to ${at(down)}`)
        .toEqual([1, 2]);
    expect
      .soft(
        r.found === visitCount(2),
        `T21: the count after the drag: "${r.found}"`,
      )
      .toBe(true);
    const spoken = ((await probeOf(live))?.spoken ?? []).slice(spoken0);
    const said = (await spokenSince(live, spoken0, down)).filter(
      (s) => !s.dragging && s.text !== "",
    );
    expect
      .soft(
        spoken.filter((s) => s.dragging).map((s) => s.text),
        "T21: spoken during the drag",
      )
      .toEqual([]);
    expect
      .soft(
        said.length === 1 &&
          JSON.stringify(names(said[0]?.text)) === "[1,2]" &&
          (said[0]?.text.endsWith(countSentence(2)) ?? false),
        `T21: the settle's one message names fits 1 and 2, then "${countSentence(2)}": ${JSON.stringify(said.map((s) => s.text))}`,
      )
      .toBe(true);
    // At rest + 1 s nothing animates.
    await nodeWait(1000);
    expect
      .soft(
        await live.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  a.playState === "running" && a.timeline === document.timeline,
              ).length,
        ),
        "T21: animations running at rest + 1 s after the drag",
      )
      .toBe(0);
  }

  // Typed settles: 1024 (fits 5, 6), 320 (3, 4), 960 tall then 1024 (7).
  for (const [field, value, win, fresh, total] of [
    ["w", "1024", [1024, 640], [5, 6], 4],
    ["w", "320", [320, 640], [3, 4], 6],
    ["h", "960", [320, 960], [], 6],
    ["w", "1024", [1024, 960], [7], 7],
  ] as [string, string, Win, number[], number][]) {
    const before = (await probeOf(live))?.spoken.length ?? 0;
    await live.locator(`main input[name="${field}"]`).fill(value);
    await live.keyboard.press("Tab");
    const r = await settled(live, win);
    const said = (await spokenSince(live, before, win)).filter(
      (s) => s.text !== "",
    );
    const named = names(said[0]?.text);
    // A find ends on the count (words.md, 5); a settle that finds nothing is Tb's sentence alone.
    const counted = said[0]?.text.endsWith(countSentence(total)) ?? false;
    expect
      .soft(
        { spoken: said.length, named, counted },
        `T21: the settle at ${at(win)} speaks once, naming the fits it found${fresh.length > 0 ? `, then "${countSentence(total)}"` : ""}: ${JSON.stringify(said.map((s) => s.text))}`,
      )
      .toEqual({ spoken: 1, named: fresh, counted: fresh.length > 0 });
    expect
      .soft(r.w === win[0] && r.h === win[1], `T21: settled at ${at(win)}`)
      .toBe(true);
  }
  {
    const r = await readNow(live);
    expect
      .soft(
        { regions: r.regions, count: r.found === visitCount(7) },
        `T21: every region shown and the count at 7: "${r.found}"`,
      )
      .toEqual({ regions: [1, 2, 3, 4, 5, 6, 7], count: true });
    const regionProblems: string[] = [];
    for (const fit of FITS) {
      const pts: [number, number, boolean][] = GRID.map((g) => [
        g.win[0],
        g.win[1],
        matchesAt(fit.query, g.win[0], g.win[1]),
      ]);
      const got = await fillMisses(live, `[data-fit-region="${fit.n}"]`, pts);
      if (!got.found || got.misses > 0)
        regionProblems.push(
          `fit ${fit.n}: ${got.found ? `${got.misses} grid points differ from the query, ${got.list.join(", ")}` : "no region"}`,
        );
    }
    expect
      .soft(
        regionProblems,
        "T21: the regions against their queries at the 13,029 grid points",
      )
      .toEqual([]);
  }

  // Found lives in one sessionStorage key, and nowhere else.
  {
    const stores = await live.evaluate(async () => ({
      session: Object.fromEntries(
        Array.from({ length: sessionStorage.length }, (_, i) => {
          const k = sessionStorage.key(i) ?? "";
          return [k, sessionStorage.getItem(k) ?? ""];
        }),
      ),
      local: localStorage.length,
      cookie: document.cookie,
      idb: (await indexedDB.databases()).map((d) => d.name),
    }));
    const keys = Object.keys(stores.session);
    expect
      .soft(
        {
          session: keys.length,
          local: stores.local,
          cookie: stores.cookie,
          idb: stores.idb,
          cookies: (await ctx.cookies()).length,
        },
        `T21: where found lives: sessionStorage ${JSON.stringify(stores.session)}`,
      )
      .toEqual({ session: 1, local: 0, cookie: "", idb: [], cookies: 0 });
    const [k = "\u0000", v = "\u0000"] =
      Object.entries(stores.session)[0] ?? [];
    const carried: string[] = [];
    for (const r of watched.requests) {
      const url = new URL(r.url());
      const body = r.postData() ?? "";
      const headers = JSON.stringify(r.headers());
      if (
        url.href.includes(k) ||
        headers.includes(k) ||
        body.includes(k) ||
        (v.length > 0 && (url.search.includes(v) || body.includes(v)))
      )
        carried.push(`${r.method()} ${url.pathname}${url.search}`);
    }
    expect
      .soft(carried, `T21: requests carrying the found key "${k}" or its value`)
      .toEqual([]);
  }

  // A reload and a crew window's link keep the count, with no layout shift; at 1440 then 390.
  for (const [how, go] of [
    ["a reload at 1440 x 900", () => live.reload()],
    [
      "the 390 x 844 link at 1440 x 900",
      () => live.locator('a[data-window="390x844"]').click(),
    ],
    [
      "a reload at 390 x 844",
      async () => {
        await live.setViewportSize({ width: 390, height: 844 });
        return live.reload();
      },
    ],
  ] as [string, () => Promise<unknown>][]) {
    await go();
    await live.waitForLoadState("load");
    await frameReady(live);
    await nodeWait(2000);
    const r = await readNow(live);
    const probe = await probeOf(live);
    expect
      .soft(
        {
          count: r.found === visitCount(7),
          cls: probe?.cls,
          shifts: probe?.shifts,
        },
        `T21: after ${how} (at ${r.path}), the count at 7 and CLS from load to rest + 2 s: "${r.found}"`,
      )
      .toEqual({ count: true, cls: 0, shifts: [] });
  }
  await ctx.close();

  // A new context starts with only the window's own fits.
  {
    const fresh = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const p = await fresh.newPage();
    await p.goto("/trials/1366x595");
    await frameReady(p);
    const r = await until(
      () => readNow(p),
      (now) => now.found === visitCount(2),
      2000,
    );
    expect
      .soft(
        { stamped: r.stamped, count: r.found === visitCount(2) },
        `T21: a new context at /trials/1366x595: "${r.found}"`,
      )
      .toEqual({ stamped: [1, 2], count: true });
    await fresh.close();
  }

  // Under reduced motion no stamp moves, and at rest + 1 s nothing animates.
  {
    const still = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const p = await still.newPage();
    await p.goto("/trials");
    await frameReady(p);
    const moved: string[] = [];
    let stampedReads = 0;
    const drag = await dragTo(p, [1440, 820], TIGHT, async (r) => {
      if (!r.stamped.includes(1)) return;
      stampedReads++;
      const read = () =>
        p.evaluate(() => {
          const el = document.querySelector('[data-fit="1"]');
          const region = document.querySelector('[data-fit-region="1"]');
          const r = el?.getBoundingClientRect();
          const anims = [el, region].flatMap(
            (x) => x?.getAnimations({ subtree: true }) ?? [],
          );
          return {
            box: r
              ? [r.left, r.top + scrollY, r.width, r.height].map(
                  (v) => Math.round(v * 10) / 10,
                )
              : null,
            anims: anims.filter((a) => a.playState === "running").length,
          };
        });
      const first = await read();
      await nodeWait(150);
      const second = await read();
      if (
        JSON.stringify(first.box) !== JSON.stringify(second.box) ||
        first.anims + second.anims > 0
      )
        moved.push(
          `at ${r.w} x ${r.h}: ${JSON.stringify(first)} then ${JSON.stringify(second)}`,
        );
    });
    expect
      .soft(drag.taken, "T21: a drag taken under reduced motion")
      .toBe(true);
    await p.mouse.up();
    await settled(p, [1440, 820]);
    expect
      .soft(
        stampedReads,
        "T21: reads of fit 1 stamped mid-drag under reduced motion",
      )
      .toBeGreaterThan(0);
    expect
      .soft(
        moved.slice(0, 4),
        "T21: fit 1's stamp and region moving or animating under reduced motion",
      )
      .toEqual([]);
    await nodeWait(1000);
    expect
      .soft(
        await p.evaluate(
          () =>
            document
              .getAnimations()
              .filter(
                (a) =>
                  a.playState === "running" && a.timeline === document.timeline,
              ).length,
        ),
        "T21: animations running at rest + 1 s under reduced motion",
      )
      .toBe(0);
    await still.close();
  }
});
