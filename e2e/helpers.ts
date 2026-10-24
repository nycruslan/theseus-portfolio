import type { Page } from "@playwright/test";
import { profile } from "../content/profile";

// Shared by the specs. Spec files can't import each other's helpers without running their tests,
// so they live here.

/** The Projects section. Its `projects` id sits on the h2, so the section is found by its label. */
export const PROJECTS = 'section[aria-labelledby="projects"]';
/** The Stack and Education sections, found by their label like Projects. */
export const STACK = 'section[aria-labelledby="stack"]';
export const EDUCATION = 'section[aria-labelledby="education"]';

/** The projects that have a link. */
export const withLink = profile.projects.filter((project) => project.href);

/**
 * A project link's label (.crew/sprint/23/contract.md, data rules): the label of the
 * `profile.links` entry whose URL has the same host as the project's href; if none matches, that
 * host without "www.".
 */
export function projectLinkLabel(href: string) {
  const host = new URL(href).host;
  const entry = profile.links.find((link) => new URL(link.href).host === host);
  return entry ? entry.label : host.replace(/^www\./, "");
}

/**
 * The routes a visitor reads the owner on, and a mistyped address (sprint 23, B2.9); since sprint 30
 * the Log and one of its records (.crew/sprint/29/b5-first-contract.md, B5.9).
 */
export const ROUTES = [
  "/",
  "/read",
  "/log",
  "/log/13",
  "/no-such-page",
] as const;
/** The status each of ROUTES answers with. */
export const STATUS: Record<(typeof ROUTES)[number], number> = {
  "/": 200,
  "/read": 200,
  "/log": 200,
  "/log/13": 200,
  "/no-such-page": 404,
};

/** The design system's color roles, as custom properties on :root. */
export const COLOR_TOKENS = [
  "--background",
  "--foreground",
  "--muted",
  "--accent",
  "--rule",
] as const;
/** The type scale's steps, as custom properties on :root. */
export const STEP_TOKENS = [
  "--step-xs",
  "--step-sm",
  "--step-base",
  "--step-lg",
  "--step-xl",
  "--step-2xl",
  "--step-3xl",
  // Sprint 23 (.crew/sprint/23/notes-iris.md): the entries' company and school, and the facts' heads.
  "--step-entry",
  "--step-display",
] as const;
export const SCHEMES = ["light", "dark"] as const;

export type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

/** The raw value of each custom property on :root, as the cascade leaves it ("" when unset). */
export async function rootTokens(page: Page, names: readonly string[]) {
  return page.evaluate((list) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      list.map((name) => [name, style.getPropertyValue(name).trim()]),
    );
  }, names);
}

/**
 * Each color token as the browser resolves it in the scheme the page is in: the computed `color`
 * of a probe that uses `var(--token)`, and its sRGB channels through a canvas, so oklch(), hsl()
 * and the rest all work.
 */
export async function resolveColors(page: Page) {
  return page.evaluate((names) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d canvas");
    const probe = document.createElement("div");
    document.body.append(probe);
    const out: Record<
      string,
      { computed: string; rgba: [number, number, number, number] }
    > = {};
    for (const name of names) {
      probe.style.color = "";
      probe.style.color = `var(${name})`;
      const computed = getComputedStyle(probe).color;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
      out[name] = { computed, rgba: [r, g, b, a / 255] };
    }
    probe.remove();
    return out;
  }, COLOR_TOKENS);
}

/** `--background` as a computed background-color, in the scheme the page is in. */
export async function resolvedBackground(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--background)";
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
}

/**
 * Every visible element that holds text of its own, with its computed color and font size, set
 * against the colors and sizes the tokens resolve to at the current viewport and scheme.
 */
export async function textStyles(page: Page) {
  return page.evaluate(
    ({ colors, steps }) => {
      const probe = document.createElement("div");
      document.body.append(probe);
      const tokenColors = colors.map((name) => {
        probe.style.color = `var(${name})`;
        return getComputedStyle(probe).color;
      });
      const tokenSizes = steps.map((name) => {
        probe.style.fontSize = `var(${name})`;
        return getComputedStyle(probe).fontSize;
      });
      probe.remove();
      const texts = [...document.body.querySelectorAll("*")]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            [...el.childNodes].some(
              (node) =>
                node.nodeType === Node.TEXT_NODE &&
                (node.textContent ?? "").trim() !== "",
            ),
        )
        .map((el) => {
          const style = getComputedStyle(el);
          return {
            element: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 40)}"`,
            color: style.color,
            fontSize: style.fontSize,
          };
        });
      return { tokenColors, tokenSizes, texts };
    },
    { colors: [...COLOR_TOKENS], steps: [...STEP_TOKENS] },
  );
}

/** Each type step in px, as it resolves at the current viewport. */
export async function resolveSteps(page: Page) {
  return page.evaluate((names) => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const sizes = Object.fromEntries(
      names.map((name) => {
        probe.style.fontSize = `var(${name})`;
        return [name, Number.parseFloat(getComputedStyle(probe).fontSize)];
      }),
    );
    probe.remove();
    return sizes;
  }, STEP_TOKENS);
}

/** "rgb(r, g, b)" or "rgba(r, g, b, a)" as the browser computes it; null for any other syntax. */
export function parseColor(value: string): Rgba | null {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!match) return null;
  const [, r = "0", g = "0", b = "0", a] = match;
  const alpha =
    a === undefined
      ? 1
      : a.endsWith("%")
        ? Number.parseFloat(a) / 100
        : Number.parseFloat(a);
  return [Number(r), Number(g), Number(b), alpha];
}

/** A #rrggbb color as the browser computes it: rgb(r, g, b). */
export function hexToRgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** How far the page is wider than the viewport, once web fonts (which change widths) have loaded. */
export async function horizontalOverflow(page: Page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** Lays a possibly translucent color over an opaque background. */
export function composite([r, g, b, a]: Rgba, bg: Rgb): Rgb {
  return [
    r * a + bg[0] * (1 - a),
    g * a + bg[1] * (1 - a),
    b * a + bg[2] * (1 - a),
  ];
}

/** The WCAG contrast ratio of two opaque colors. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/**
 * An init script: defines `window.__rgba(color)`, any CSS color as the browser paints it, as
 * [r, g, b, a] with a from 0 to 1, read through a canvas so oklch(), color-mix() and the rest
 * compare by value. "none", "transparent" and an unparsable value give null.
 */
export function installRgba() {
  let ctx: CanvasRenderingContext2D | null = null;
  const cache = new Map<string, number[] | null>();
  (window as Window & { __rgba?: (c: string) => number[] | null }).__rgba = (
    color: string,
  ) => {
    const known = cache.get(color);
    if (known !== undefined) return known;
    let out: number[] | null = null;
    if (color && color !== "none" && !color.startsWith("url(")) {
      if (!ctx) {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext("2d", { willReadFrequently: true });
      }
      if (ctx) {
        // Two different fallbacks: a value the canvas can't parse leaves each in place.
        const read = (fallback: string) => {
          if (!ctx) return [];
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = fallback;
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data];
        };
        const [a, b] = [read("#010203"), read("#fdfcfb")];
        if (a.join() === b.join()) {
          const [r = 0, g = 0, bl = 0, al = 0] = a;
          out = al === 0 ? null : [r, g, bl, al / 255];
        }
      }
    }
    cache.set(color, out);
    return out;
  };
}

type LcpEntry = {
  time: number;
  url: string;
  inHeader: boolean;
  inPlan: boolean;
  tag: string;
  text: string;
  size: number;
};

/** Loads `url` at 4x CPU slowdown and returns the last largest-contentful-paint candidate. */
export async function measureLcp(page: Page, url: string) {
  await page.addInitScript(() => {
    const win = window as Window & { __lcp?: LcpEntry[] };
    win.__lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const lcp = entry as PerformanceEntry & {
          element: Element | null;
          url: string;
          size: number;
        };
        const el = lcp.element;
        win.__lcp?.push({
          time: lcp.startTime,
          url: lcp.url,
          inHeader: Boolean(el?.closest("main > header")),
          inPlan: Boolean(el?.closest("[data-plan]")),
          tag: el?.tagName.toLowerCase() ?? "(removed)",
          text: (el?.textContent ?? "").trim().slice(0, 40),
          size: lcp.size,
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(url);
  // Let late candidates arrive; the last one is the page's LCP.
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const entries = await page.evaluate(
    () => (window as Window & { __lcp?: LcpEntry[] }).__lcp ?? [],
  );
  return entries.at(-1) ?? null;
}

/**
 * Sets a layout-shift counter going before the page's own scripts, so nothing is missed: read it
 * as `window.__cls`.
 */
export async function watchLayoutShift(page: Page) {
  await page.addInitScript(() => {
    const win = window as Window & { __cls?: number };
    win.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) win.__cls = (win.__cls ?? 0) + shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

/**
 * The motion control's slots (.crew/sprint/27/contract.md, "The control", amendment 1): one in the
 * bar's nav, shown from 768 px, one in main before the title block, shown below it. The shown one
 * is the slot with a box; only it holds the group a visitor sees.
 */
export const MOTION = "[data-motion]";
/** Its buttons, in the order the contract fixes. */
export const MODES = ["Full", "Calm", "Off"] as const;

/**
 * Waits up to `timeout` for the shown slot's three buttons, which arrive with scripts. It asserts
 * nothing: a page without them fails the assertions that follow, not this wait.
 */
export async function motionReady(page: Page, timeout = 5000) {
  await page
    .waitForFunction(
      (slot) =>
        [...document.querySelectorAll(slot)].some(
          (el) =>
            el.getClientRects().length > 0 &&
            el.querySelectorAll("button").length === 3,
        ),
      MOTION,
      { timeout },
    )
    .catch(() => undefined);
}
