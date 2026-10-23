import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import type { Browser, BrowserContext, Page } from "@playwright/test";

// The harness for B3, the model over the drawing (.crew/sprint/25/contract.md, "The harness" and
// B3.10), standing on sprint 9's retired one (git 7b4b48b^, e2e/webgl.ts) and the spike's methods
// (.crew/sprint/24/spike/measure/). Every init script below is self-contained, since Playwright
// sends its source to the page.
//
// Order matters: init scripts nest, and the one added last is outermost. The refusal goes in
// before the recorder, so the recorder still sees the request the refusal answers with null.
// `openModel` adds them in that order.
//
// What the page gives the harness, and nothing more: `[data-model]` as `[data-plan]`'s next
// sibling, its `data-state` (landed, lofting, settled, still) and its one canvas. The loft's time
// comes from requestAnimationFrame's timestamp or performance.now(), both of which Playwright's
// clock drives, so a paused clock holds any state and `step` moves it one frame at a time.

/** A frame the scene drew: the draw calls one task submitted, and the triangles they drew. */
export type Frame = {
  t: number;
  draws: number;
  triangles: number;
  state: string | null;
};
type Recorded = {
  requests: { type: string; t: number }[];
  frames: Frame[];
  /** Granted contexts not lost that drew or sit in the document; a throwaway probe doesn't count. */
  live: () => number;
};
type HarnessWindow = Window & {
  __gl?: Recorded;
  __states?: { state: string; t: number }[];
  __motion?: string[];
  __cls?: number;
  __frameMs?: number[];
};

/** getContext returns null for the WebGL types: a device or browser with no WebGL. */
function refuseWebGl() {
  for (const host of [HTMLCanvasElement, globalThis.OffscreenCanvas]) {
    if (!host) continue;
    const original = host.prototype.getContext as (
      this: unknown,
      type: string,
      attrs?: unknown,
    ) => unknown;
    host.prototype.getContext = function (
      this: unknown,
      type: string,
      attrs?: unknown,
    ) {
      if (/webgl/i.test(type)) return null;
      return original.call(this, type, attrs);
    } as never;
  }
}

/**
 * The recorder, added last: every context request for WebGL or WebGPU, as the page made it, and
 * every draw call on both WebGL classes and their draw extensions, grouped into frames (the calls
 * one task submits) with the triangles each submits: TRIANGLES count / 3, strips and fans count
 * - 2, times the instances, so instanced line quads count as drawn. A multi-draw is one call with
 * all its triangles. A draw method the harness doesn't know counts as a call with NaN triangles,
 * so a check on it fails rather than passing blind.
 */
function recordGl() {
  type Gl = WebGLRenderingContext | WebGL2RenderingContext;
  type Fn = (...args: unknown[]) => unknown;
  const w = window as Window & { __gl?: unknown };
  const requests: { type: string; t: number }[] = [];
  const frames: {
    t: number;
    draws: number;
    triangles: number;
    state: string | null;
  }[] = [];
  const granted: { gl: Gl; drew: boolean }[] = [];
  w.__gl = {
    requests,
    frames,
    live: () =>
      granted.filter(
        (c) =>
          !c.gl.isContextLost() &&
          (c.drew ||
            (c.gl.canvas instanceof HTMLCanvasElement &&
              c.gl.canvas.isConnected)),
      ).length,
  };

  let open: (typeof frames)[number] | null = null;
  const note = (gl: Gl, triangles: number) => {
    if (!open) {
      open = {
        t: performance.now(),
        draws: 0,
        triangles: 0,
        state:
          document.querySelector("[data-model]")?.getAttribute("data-state") ??
          null,
      };
      frames.push(open);
      queueMicrotask(() => {
        open = null;
      });
    }
    open.draws++;
    open.triangles += triangles;
    const entry = granted.find((c) => c.gl === gl);
    if (entry) entry.drew = true;
  };
  const per = (mode: number, count: number) =>
    mode === 4
      ? Math.floor(count / 3)
      : mode === 5 || mode === 6
        ? Math.max(0, count - 2)
        : 0;
  const sum = (
    mode: number,
    counts: ArrayLike<number>,
    countsOffset: number,
    instances: ArrayLike<number> | null,
    instancesOffset: number,
    drawcount: number,
  ) => {
    let total = 0;
    for (let i = 0; i < drawcount; i++) {
      total +=
        per(mode, counts[countsOffset + i] ?? 0) *
        (instances ? (instances[instancesOffset + i] ?? 0) : 1);
    }
    return total;
  };
  /** Each known draw method's triangles, from its arguments. */
  const COUNT: Record<string, (a: unknown[]) => number> = {
    drawArrays: ([m, , c]) => per(m as number, c as number),
    drawElements: ([m, c]) => per(m as number, c as number),
    drawRangeElements: ([m, , , c]) => per(m as number, c as number),
    drawArraysInstanced: ([m, , c, n]) =>
      per(m as number, c as number) * (n as number),
    drawElementsInstanced: ([m, c, , , n]) =>
      per(m as number, c as number) * (n as number),
    drawArraysInstancedANGLE: ([m, , c, n]) =>
      per(m as number, c as number) * (n as number),
    drawElementsInstancedANGLE: ([m, c, , , n]) =>
      per(m as number, c as number) * (n as number),
    multiDrawArraysWEBGL: ([m, , , c, co, d]) =>
      sum(m as number, c as number[], co as number, null, 0, d as number),
    multiDrawElementsWEBGL: ([m, c, co, , , , d]) =>
      sum(m as number, c as number[], co as number, null, 0, d as number),
    multiDrawArraysInstancedWEBGL: ([m, , , c, co, n, no, d]) =>
      sum(
        m as number,
        c as number[],
        co as number,
        n as number[],
        no as number,
        d as number,
      ),
    multiDrawElementsInstancedWEBGL: ([m, c, co, , , , n, no, d]) =>
      sum(
        m as number,
        c as number[],
        co as number,
        n as number[],
        no as number,
        d as number,
      ),
  };
  const wrap = (
    target: Record<string, unknown>,
    name: string,
    gl: (self: unknown) => Gl,
  ) => {
    const draw = target[name];
    if (typeof draw !== "function") return;
    const count = COUNT[name] ?? (() => Number.NaN);
    target[name] = function (this: unknown, ...args: unknown[]) {
      note(gl(this), count(args));
      return (draw as Fn).apply(this, args);
    };
  };
  // drawBuffers and drawingBufferStorage set state; they draw nothing.
  const isDraw = (name: string) =>
    /^(multiD|d)raw(Arrays|Elements|RangeElements)/.test(name);

  const patched = new WeakSet<object>();
  const classes = window as unknown as Record<
    string,
    { prototype: Record<string, unknown> } | undefined
  >;
  for (const className of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
    const prototype = classes[className]?.prototype;
    if (!prototype) continue;
    for (const name of Object.getOwnPropertyNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (descriptor && "value" in descriptor && isDraw(name)) {
        wrap(prototype, name, (self) => self as Gl);
      }
    }
    const getExtension = prototype.getExtension as Fn;
    prototype.getExtension = function (this: Gl, ...args: unknown[]) {
      const ext = getExtension.apply(this, args) as Record<
        string,
        unknown
      > | null;
      if (ext && !patched.has(ext)) {
        patched.add(ext);
        let proto: object | null = ext;
        const names = new Set<string>();
        while (proto && proto !== Object.prototype) {
          for (const name of Object.getOwnPropertyNames(proto)) names.add(name);
          proto = Object.getPrototypeOf(proto);
        }
        for (const name of names) {
          if (isDraw(name) && typeof ext[name] === "function") {
            const bound = (ext[name] as Fn).bind(ext);
            const count = COUNT[name] ?? (() => Number.NaN);
            ext[name] = (...a: unknown[]) => {
              note(this, count(a));
              return bound(...a);
            };
          }
        }
      }
      return ext;
    };
  }

  for (const host of [HTMLCanvasElement, globalThis.OffscreenCanvas]) {
    if (!host) continue;
    const getContext = host.prototype.getContext as Fn;
    host.prototype.getContext = function (this: unknown, ...args: unknown[]) {
      const type = String(args[0]);
      const context = getContext.apply(this, args);
      if (/webgl|webgpu/i.test(type)) {
        requests.push({ type, t: performance.now() });
        if (context && /webgl/i.test(type)) {
          granted.push({ gl: context as Gl, drew: false });
        }
      }
      return context;
    } as never;
  }
}

/**
 * Every `data-state` `[data-model]` takes, in order, with performance.now() (the clock's time when
 * it's installed). A state set and replaced within one task is still recorded, from the mutation
 * records' old values. "(removed)" marks the element leaving the document.
 */
function recordStates() {
  const w = window as Window & { __states?: { state: string; t: number }[] };
  const states: { state: string; t: number }[] = [];
  w.__states = states;
  const push = (state: string | null | undefined) => {
    if (state && states.at(-1)?.state !== state) {
      states.push({ state, t: performance.now() });
    }
  };
  let seen = false;
  new MutationObserver((records) => {
    for (const record of records) {
      if (
        record.type === "attributes" &&
        record.target instanceof Element &&
        record.target.matches("[data-model]")
      ) {
        push(record.oldValue);
      }
    }
    const model = document.querySelector("[data-model]");
    if (model) {
      seen = true;
      push(model.getAttribute("data-state"));
    } else if (seen) {
      push("(removed)");
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
    attributeOldValue: true,
  });
}

/** Every animationstart and transitionrun in the page, by its target. */
function recordMotion() {
  const w = window as Window & { __motion?: string[] };
  w.__motion = [];
  for (const type of ["animationstart", "transitionrun"]) {
    window.addEventListener(
      type,
      (event) => {
        const target = event.target as Element | null;
        const where = target?.closest?.("[data-model]") ? " in the model" : "";
        w.__motion?.push(
          `${type} on <${target?.tagName?.toLowerCase()}>${where}`,
        );
      },
      true,
    );
  }
}

/** Layout shift without recent input, as `window.__cls`. */
function recordShift() {
  const w = window as Window & { __cls?: number };
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
}

/**
 * The JS time of each animation-frame callback that drew, in ms (`window.__frameMs`): the pose,
 * the scene walk and the draw submission, as S6 measured it. Real time, so never with the clock.
 */
function timeFrames() {
  const w = window as Window & {
    __frameMs?: number[];
    __gl?: { frames: unknown[] };
  };
  w.__frameMs = [];
  const original = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    original((timestamp) => {
      const drawn = w.__gl?.frames.length ?? 0;
      const start = performance.now();
      callback(timestamp);
      if ((w.__gl?.frames.length ?? 0) > drawn) {
        w.__frameMs?.push(performance.now() - start);
      }
    });
}

/** sessionStorage throws on access, as it does with storage blocked. */
function throwingStorage() {
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
}

/** Save-Data as a page reads it: the request header changes nothing a page can see; this does. */
function saveData() {
  Object.defineProperty(navigator, "connection", {
    configurable: true,
    get: () => ({
      saveData: true,
      effectiveType: "4g",
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

export type ModelOptions = {
  width?: number;
  height?: number;
  dpr?: number;
  scheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
  forcedColors?: "active" | "none";
  /** getContext returns null for the WebGL types. */
  refuse?: boolean;
  saveData?: boolean;
  throwingStorage?: boolean;
  /** Scripts off. */
  noScript?: boolean;
  /** Emulated touch, for a tap. */
  touch?: boolean;
  /** Playwright's clock, installed and paused before the page loads: nothing moves until `step`. */
  clock?: boolean;
  /** The JS time of each frame that drew (real time; not with the clock). */
  timeFrames?: boolean;
  /** CPU slowdown through the protocol. */
  cpu?: number;
};

export type Script = {
  url: string;
  /** Each file's own body, compressed as the contract says. */
  gzip9: number;
  gzip6: number;
  brotli11: number;
  brotli5: number;
  /** Resource timing's startTime, or null when the browser kept no entry. */
  start: number | null;
};

export type ModelRun = {
  context: BrowserContext;
  page: Page;
  /** Page errors and console errors, as they came. */
  errors: string[];
  /** Goes to the URL (default "/") and waits for the load event and the web fonts. */
  goto(url?: string): Promise<void>;
  /** `[data-model]`'s data-state now: null when it has none, "(none)" with no element. */
  state(): Promise<string | null>;
  /** Every data-state the element took in this document, in order. */
  states(): Promise<{ state: string; t: number }[]>;
  frames(): Promise<Frame[]>;
  /** Every WebGL or WebGPU context request in this document. */
  requests(): Promise<{ type: string; t: number }[]>;
  /** WebGL contexts alive in this document (see recordGl). */
  live(): Promise<number>;
  /** Waits in real time until the state is one of `wanted`; throws with the states seen if not. */
  waitFor(wanted: string[], timeout?: number): Promise<string>;
  /**
   * With the clock: moves its time in `step` ms ticks until the state is one of `wanted`, so it
   * stops on the first tick that reaches one. Real time bounds it, since the chunk downloads in
   * real time.
   */
  until(wanted: string[], step?: number, timeout?: number): Promise<string>;
  /** With the clock: moves its time by `ms`, firing every timer and frame due on the way. */
  step(ms: number): Promise<void>;
  /** Every script the page fetched, with its compressed sizes and when it was requested. */
  scripts(): Promise<{ loadEventEnd: number; list: Script[] }>;
  close(): Promise<void>;
};

/** A fresh browser context with the harness in order, and one page in it. */
export async function openModel(
  browser: Browser,
  options: ModelOptions = {},
): Promise<ModelRun> {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
    deviceScaleFactor: options.dpr ?? 1,
    colorScheme: options.scheme ?? "light",
    reducedMotion: options.reducedMotion ?? "no-preference",
    forcedColors: options.forcedColors ?? "none",
    javaScriptEnabled: !options.noScript,
    hasTouch: Boolean(options.touch),
  });
  if (options.saveData) await context.addInitScript(saveData);
  if (options.throwingStorage) await context.addInitScript(throwingStorage);
  if (options.refuse) await context.addInitScript(refuseWebGl);
  await context.addInitScript(recordStates);
  await context.addInitScript(recordMotion);
  await context.addInitScript(recordShift);
  await context.addInitScript(recordGl);
  if (options.timeFrames) await context.addInitScript(timeFrames);

  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  const bodies: Promise<Omit<Script, "start"> | undefined>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    bodies.push(
      response.body().then(
        (body) => ({
          url: response.url(),
          gzip9: gzipSync(body, { level: 9 }).length,
          gzip6: gzipSync(body, { level: 6 }).length,
          brotli11: brotliCompressSync(body, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
          }).length,
          brotli5: brotliCompressSync(body, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
          }).length,
        }),
        () => undefined,
      ),
    );
  });
  if (options.cpu) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
  }
  if (options.clock) {
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 1000);
  }

  const state = () =>
    page.evaluate(() => {
      const model = document.querySelector("[data-model]");
      return model ? model.getAttribute("data-state") : "(none)";
    });
  const states = () =>
    page.evaluate(
      () => (window as HarnessWindow).__states?.map((s) => ({ ...s })) ?? [],
    );
  const history = async () =>
    (await states()).map((s) => `${s.state}@${s.t.toFixed(0)}`).join(" > ") ||
    "none";

  return {
    context,
    page,
    errors,
    async goto(url = "/") {
      await page.goto(url);
      if (!options.noScript) await page.evaluate(() => document.fonts.ready);
    },
    state,
    states,
    frames: () =>
      page.evaluate(
        () =>
          (window as HarnessWindow).__gl?.frames.map((f) => ({ ...f })) ?? [],
      ),
    requests: () =>
      page.evaluate(
        () =>
          (window as HarnessWindow).__gl?.requests.map((r) => ({ ...r })) ?? [],
      ),
    live: () =>
      page.evaluate(() => (window as HarnessWindow).__gl?.live() ?? 0),
    async waitFor(wanted, timeout = 60_000) {
      const end = Date.now() + timeout;
      for (;;) {
        const now = await state();
        if (now && wanted.includes(now)) return now;
        if (Date.now() > end) {
          throw new Error(
            `[data-model] never reached ${wanted.join(" or ")} in ${timeout} ms: it is ${now}; states ${await history()}`,
          );
        }
        await new Promise((done) => setTimeout(done, 50));
      }
    },
    async until(wanted, step = 1, timeout = 60_000) {
      const end = Date.now() + timeout;
      for (;;) {
        const now = await state();
        if (now && wanted.includes(now)) return now;
        if (Date.now() > end) {
          throw new Error(
            `[data-model] never reached ${wanted.join(" or ")} on the clock in ${timeout} ms: it is ${now}; states ${await history()}`,
          );
        }
        await page.clock.runFor(step);
      }
    },
    step: (ms) => page.clock.runFor(ms),
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
        list: fetched.map((body) => ({
          ...body,
          start: starts.get(body.url) ?? null,
        })),
      };
    },
    close: () => context.close(),
  };
}
