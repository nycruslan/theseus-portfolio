import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { profile } from "../content/profile";

// Shared by the specs. Spec files can't import each other's helpers without running their tests,
// so they live here.

/** The Projects section. Its `projects` id sits on the h2, so the section is found by its label. */
export const PROJECTS = 'section[aria-labelledby="projects"]';
/** The Stack and Education sections, found by their label like Projects. */
export const STACK = 'section[aria-labelledby="stack"]';
export const EDUCATION = 'section[aria-labelledby="education"]';

/** The projects that have a link, so their card is one. */
export const withLink = profile.projects.filter((project) => project.href);

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
  "--step-sm",
  "--step-base",
  "--step-lg",
  "--step-xl",
  "--step-2xl",
  // The name's size on `/` (sprint 16, B1.2): 136 px at 1440, 64 px at 390.
  "--step-display",
] as const;
/** Tokens derived from the five (sprint 16): a replaced plank's bronze, and the ledger's rules. */
export const DERIVED_TOKENS = ["--bronze", "--rule-strong"] as const;
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
export async function resolveColors(
  page: Page,
  names: readonly string[] = COLOR_TOKENS,
) {
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
  }, names);
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

// ---------------------------------------------------------------------------------------------
// The build log's oracle (sprint 14, sprint 16): `N` is the number of valid retro files in the
// checkout under test, counted with a few lines of this file's own (sprint 12's data rules, not the
// reader), so nothing here is a literal that a merge can falsify.

const SPRINT_DIR = join(process.cwd(), ".studio", "sprint");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The folders whose `retro.json` the contract's data rules accept (a wrong one fails the build). */
function validSprints(): number[] {
  const found: number[] = [];
  for (const folder of readdirSync(SPRINT_DIR)) {
    const file = join(SPRINT_DIR, folder, "retro.json");
    if (!/^\d+$/.test(folder) || !existsSync(file)) continue;
    let retro: unknown;
    try {
      retro = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!isRecord(retro)) continue;
    const { sprint, goal } = retro;
    const bare =
      typeof goal === "string"
        ? goal.replace(/^\s*roadmap item(?:\s+\d+)?\s*:\s*/i, "")
        : "";
    if (
      typeof sprint === "number" &&
      Number.isInteger(sprint) &&
      sprint >= 1 &&
      sprint === Number(folder) &&
      bare.replaceAll("`", "").trim() !== ""
    ) {
      found.push(sprint);
    }
  }
  return found;
}

export const VALID = validSprints();
/** U+00A0, the no-break space of the data rules: the dot never starts a line. */
const NBSP = "\u00a0";
/** What the span says after the no-break space and the dot, for n entries. */
const countWords = (n: number) => `${n} ${n === 1 ? "sprint" : "sprints"}`;
export const lineSpan = (n: number) => `${NBSP}· ${countWords(n)}`;
