import { gzipSync } from "node:zlib";
import type { Browser, BrowserContext, Page } from "@playwright/test";

// The harness for Part B of the hero (the WebGL upgrade): .crew/sprint/9/contract.md, "The harness
// and the gate", standing on .crew/sprint/9/spike-probe.md, section 1. Every init script below is
// self-contained, since Playwright sends its source to the page.
//
// Order matters: init scripts nest, and the one added last is outermost. A script that refuses or
// strips a context request has to be added BEFORE the recorder, or the recorder never sees the
// request. `openRun` does it in that order.

export const BOX = "[data-hero]";
export const CANVAS = "[data-hero] canvas";
export const HULL = "[data-hero-hull]";

/** What the recorder and the watchers leave on `window`. */
export type HarnessWindow = Window & {
  __ctxReqs?: { type: string; attrs: Record<string, unknown> | null }[];
  __draws?: { total: number };
  __cls?: number;
  __canvasAt?: number;
  __rects?: { before: number[] | null; after: number[] | null };
  __anims?: { kind: string; property: string | null; endTime: number | null }[];
  __slow?: boolean;
};

/** getContext returns null for the WebGL types: the device that has none (and Part A's checks). */
export function refuseWebGl() {
  const original = HTMLCanvasElement.prototype.getContext as (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) => unknown;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) {
    if (/webgl/.test(type)) return null;
    return original.call(this, type, attrs);
  } as never;
}

/**
 * Turns `failIfMajorPerformanceCaveat: true` into false before the real call. Some browsers refuse
 * it (a software renderer: the sandbox's Chromium 141), others grant it (CI's 156), so the tests
 * never depend on which: they strip it where they need a context and use `refuseCaveat` where they
 * need the refusal.
 */
function stripCaveat() {
  const original = HTMLCanvasElement.prototype.getContext as (
    this: HTMLCanvasElement,
    type: string,
    attrs?: Record<string, unknown>,
  ) => unknown;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: Record<string, unknown>,
  ) {
    const asked =
      /webgl/.test(type) && attrs?.failIfMajorPerformanceCaveat
        ? { ...attrs, failIfMajorPerformanceCaveat: false }
        : attrs;
    return original.call(this, type, asked);
  } as never;
}

/**
 * The recorder, added last: every WebGL context request's type and attributes as the page made
 * them, and a count of draw calls on both context classes (the instanced forms too).
 */
function recordWebGl() {
  const w = window as Window & {
    __ctxReqs?: { type: string; attrs: Record<string, unknown> | null }[];
    __draws?: { total: number };
  };
  w.__ctxReqs = [];
  w.__draws = { total: 0 };
  const original = HTMLCanvasElement.prototype.getContext as (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) => unknown;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) {
    if (/webgl/.test(type)) {
      w.__ctxReqs?.push({
        type,
        attrs: attrs ? JSON.parse(JSON.stringify(attrs)) : null,
      });
    }
    return original.call(this, type, attrs);
  } as never;
  const classes = window as unknown as Record<
    string,
    { prototype: Record<string, unknown> } | undefined
  >;
  for (const className of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
    const prototype = classes[className]?.prototype;
    if (!prototype) continue;
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const draw = prototype[name] as
        | ((...args: unknown[]) => unknown)
        | undefined;
      if (!draw) continue;
      prototype[name] = function (this: unknown, ...args: unknown[]) {
        if (w.__draws) w.__draws.total++;
        return draw.apply(this, args);
      };
    }
  }
}

/**
 * Simulates a device with no cheap GPU: a WebGL request carrying `failIfMajorPerformanceCaveat: true`
 * gets null, as the browser would answer for a software or blocklisted renderer. Any other request
 * passes through. Added after the strip, so it sees the page's own attributes.
 */
function refuseCaveat() {
  const original = HTMLCanvasElement.prototype.getContext as (
    this: HTMLCanvasElement,
    type: string,
    attrs?: Record<string, unknown>,
  ) => unknown;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: Record<string, unknown>,
  ) {
    if (/webgl/.test(type) && attrs?.failIfMajorPerformanceCaveat) return null;
    return original.call(this, type, attrs);
  } as never;
}

/** What the page's gate reads: cores, memory and Save-Data, set the way a page sees them. */
function setDevice(device: {
  cores: number;
  memory: number;
  saveData: boolean;
}) {
  const define = (name: string, value: unknown) =>
    Object.defineProperty(navigator, name, {
      get: () => value,
      configurable: true,
    });
  define("hardwareConcurrency", device.cores);
  define("deviceMemory", device.memory);
  // The Save-Data request header changes nothing a page can read; this object does.
  if (device.saveData) define("connection", { saveData: true });
}

/**
 * The frame clock. Once `window.__slow` is set, the timestamp `requestAnimationFrame` hands back
 * advances 60 ms a frame, whatever really happened (C14.1).
 */
function slowFrameClock() {
  const w = window as Window & { __slow?: boolean };
  const original = window.requestAnimationFrame.bind(window);
  let handed = 0;
  window.requestAnimationFrame = (callback) =>
    original((timestamp) => {
      handed = w.__slow ? handed + 60 : timestamp;
      callback(handed);
    });
}

/** For C10.5: pushes the box more than a viewport below the fold, on DOMContentLoaded. */
function addSpacer() {
  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "main > header { margin-bottom: 200vh }";
    document.head.append(style);
  });
}

/**
 * What C10 and C11 read over the swap: layout shift, when the canvas appears, the box's rect in
 * document coordinates before and after, and every animation in the box, sampled every 20 ms
 * (a transition lives about 200 ms and starts a frame after the insertion).
 */
function watchSwap() {
  const w = window as Window & {
    __cls?: number;
    __canvasAt?: number;
    __rects?: { before: number[] | null; after: number[] | null };
    __anims?: {
      kind: string;
      property: string | null;
      endTime: number | null;
    }[];
  };
  w.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      if (!shift.hadRecentInput) w.__cls = (w.__cls ?? 0) + shift.value;
    }
  }).observe({ type: "layout-shift", buffered: true });

  new MutationObserver(() => {
    if (
      w.__canvasAt === undefined &&
      document.querySelector("[data-hero] canvas")
    ) {
      w.__canvasAt = performance.now();
    }
  }).observe(document, { childList: true, subtree: true });

  w.__rects = { before: null, after: null };
  const track = () => {
    const box = document.querySelector("[data-hero]");
    if (box && w.__rects) {
      const r = box.getBoundingClientRect();
      const rect = [
        r.left + scrollX,
        r.top + scrollY,
        r.right + scrollX,
        r.bottom + scrollY,
      ];
      if (!box.querySelector("canvas")) w.__rects.before = rect;
      else if (!w.__rects.after) w.__rects.after = rect;
    }
    requestAnimationFrame(track);
  };
  requestAnimationFrame(track);

  w.__anims = [];
  const seen = new WeakSet<Animation>();
  setInterval(() => {
    const box = document.querySelector("[data-hero]");
    if (!box) return;
    for (const animation of box.getAnimations({ subtree: true })) {
      if (seen.has(animation)) continue;
      seen.add(animation);
      const named = animation as Animation & {
        transitionProperty?: string;
        animationName?: string;
      };
      w.__anims?.push({
        kind: animation.constructor.name,
        property: named.transitionProperty ?? named.animationName ?? null,
        endTime: Number(animation.effect?.getComputedTiming().endTime ?? null),
      });
    }
  }, 20);
}

export type RunOptions = {
  width?: number;
  height?: number;
  scheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
  /** `hardwareConcurrency` and `deviceMemory`: the control run has 8 of each. */
  cores?: number;
  memory?: number;
  saveData?: boolean;
  /** getContext returns null for the WebGL types. */
  refuseWebGl?: boolean;
  /** Strip `failIfMajorPerformanceCaveat` (default: yes, or a run might get no context). */
  stripCaveat?: boolean;
  /** Refuse any WebGL request that carries `failIfMajorPerformanceCaveat: true`. */
  refuseCaveat?: boolean;
  slowClock?: boolean;
  spacer?: boolean;
  /** The swap watchers of C10 and C11. */
  watch?: boolean;
  /** CPU slowdown through the protocol, for C10's 4x run. */
  cpu?: number;
};

export type ScriptReport = {
  url: string;
  /** gzip of the decoded body, as the spike measured it. */
  gz: number;
  hasShader: boolean;
  /** Resource timing `startTime`, or null if the browser kept no entry. */
  start: number | null;
  /** Requested at or after the load event ended. */
  afterLoad: boolean;
};

export type Run = {
  context: BrowserContext;
  page: Page;
  /** Every URL the page requested, in order. */
  requests: string[];
  /** Goes to "/" and waits for the load event. */
  load(): Promise<void>;
  /** Every script the browser fetched, with its size and when it was requested. */
  scripts(): Promise<{ loadEventEnd: number; list: ScriptReport[] }>;
  close(): Promise<void>;
};

/**
 * A fresh browser context with the harness in the right order, at devicePixelRatio 1 (the checks
 * read pixels). The context is closed by `close`.
 */
export async function openRun(
  browser: Browser,
  options: RunOptions = {},
): Promise<Run> {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
    deviceScaleFactor: 1,
    ...(options.scheme ? { colorScheme: options.scheme } : {}),
    ...(options.reducedMotion ? { reducedMotion: options.reducedMotion } : {}),
  });
  await context.addInitScript(setDevice, {
    cores: options.cores ?? 8,
    memory: options.memory ?? 8,
    saveData: options.saveData ?? false,
  });
  if (options.refuseWebGl) await context.addInitScript(refuseWebGl);
  if (options.stripCaveat ?? true) await context.addInitScript(stripCaveat);
  if (options.refuseCaveat) await context.addInitScript(refuseCaveat);
  if (options.slowClock) await context.addInitScript(slowFrameClock);
  if (options.spacer) await context.addInitScript(addSpacer);
  if (options.watch) await context.addInitScript(watchSwap);
  await context.addInitScript(recordWebGl);

  const page = await context.newPage();
  const requests: string[] = [];
  const bodies: Promise<
    { url: string; gz: number; hasShader: boolean } | undefined
  >[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    bodies.push(
      response.body().then(
        (body) => ({
          url: response.url(),
          gz: gzipSync(body).length,
          // Case-sensitive, as the contract says.
          hasShader: body.toString("utf8").includes("createShader"),
        }),
        () => undefined,
      ),
    );
  });
  if (options.cpu) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
  }

  return {
    context,
    page,
    requests,
    async load() {
      await page.goto("/");
    },
    async scripts() {
      const fetched = (await Promise.all(bodies)).filter(
        (body) => body !== undefined,
      );
      const timing = await page.evaluate(() => {
        const [navigation] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[];
        return {
          loadEventEnd: navigation?.loadEventEnd ?? 0,
          starts: performance
            .getEntriesByType("resource")
            .map((entry) => [entry.name, entry.startTime] as const),
        };
      });
      const starts = new Map(timing.starts);
      return {
        loadEventEnd: timing.loadEventEnd,
        list: fetched.map((body) => {
          const start = starts.get(body.url) ?? null;
          return {
            ...body,
            start,
            afterLoad: start !== null && start >= timing.loadEventEnd,
          };
        }),
      };
    },
    close: () => context.close(),
  };
}

/** A pause in the test, not in the page (the page may be running the clock a test slows). */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function drawCount(page: Page) {
  return page.evaluate(
    () => (window as HarnessWindow).__draws?.total ?? Number.NaN,
  );
}

/** The box's rect in document coordinates, once the web fonts (which move it) have loaded. */
export async function boxRect(page: Page) {
  return page.evaluate(async (box) => {
    await document.fonts.ready;
    const el = document.querySelector(box);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left + scrollX,
      top: r.top + scrollY,
      right: r.right + scrollX,
      bottom: r.bottom + scrollY,
    };
  }, BOX);
}
