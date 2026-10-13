import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";

// Sprint 1 contract (.studio/sprint/1/contract.md): design tokens. One test per numbered check,
// titled with its number. The tests after check 6 guard the contract's scope lines (contrast
// floors, fonts, no motion) that no numbered check covers.

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
    },
  );
}

// The files the page is built from, which must carry no colors or sizes of their own.
const markupFiles = [
  "app/page.tsx",
  "app/layout.tsx",
  ...sourceFiles("components"),
];

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

/** The bodies of every `@theme` block (`@theme`, `@theme inline`, ...) in a stylesheet. */
function themeBodies(css: string): string[] {
  const source = stripComments(css);
  const bodies: string[] = [];
  for (const open of source.matchAll(/@theme\b[^{]*\{/g)) {
    let depth = 1;
    let i = (open.index ?? 0) + open[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      if (source[i] === "}") depth--;
      i++;
    }
    bodies.push(source.slice(start, i - 1));
  }
  return bodies;
}

/** Custom properties declared in `@theme`, by name. A name declared twice counts once. */
function themeTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const body of themeBodies(css)) {
    for (const [, name = "", value = ""] of body.matchAll(
      /(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g,
    )) {
      tokens.set(name, value);
    }
  }
  return tokens;
}

const globalsCss = () => read("app/globals.css");

// ---- 1 ---------------------------------------------------------------------------------------

test("1 palette tokens exist and are capped", () => {
  const colors = [...themeTokens(globalsCss()).keys()].filter((name) =>
    name.startsWith("--color-"),
  );

  expect(
    colors.length,
    `--color-* tokens in @theme: ${colors.join(", ") || "none"}`,
  ).toBeGreaterThanOrEqual(4);
  expect(
    colors.length,
    `--color-* tokens in @theme: ${colors.join(", ")}`,
  ).toBeLessThanOrEqual(8);

  // Role names are pinned so the contrast check below can find them: Tailwind's own
  // background/foreground pair, a muted-text role and an accent (or link) role.
  expect(colors, "page background role").toContain("--color-background");
  expect(colors, "text role").toContain("--color-foreground");
  expect(
    colors.some((name) => /muted/.test(name)),
    "a --color-muted* role for secondary text",
  ).toBe(true);
  expect(
    colors.some((name) => /accent|link/.test(name)),
    "a --color-accent* (or --color-link*) role for links",
  ).toBe(true);
});

// ---- 2 ---------------------------------------------------------------------------------------

test("2 fluid type scale exists and is capped", () => {
  const steps = [...themeTokens(globalsCss())].filter(
    // `--text-lg--line-height` style companions are not scale steps.
    ([name]) => name.startsWith("--text-") && !name.slice(2).includes("--"),
  );

  expect(
    steps.length,
    `--text-* steps in @theme: ${steps.map(([n]) => n).join(", ") || "none"}`,
  ).toBeGreaterThanOrEqual(4);
  expect(
    steps.length,
    `--text-* steps in @theme: ${steps.map(([n]) => n).join(", ")}`,
  ).toBeLessThanOrEqual(6);

  for (const [name, value] of steps) {
    expect(value, `${name} is a clamp()`).toMatch(/^clamp\(/);
    expect(value, `${name} has a rem bound`).toMatch(/[\d.]rem\b/);
    expect(value, `${name} has a vw term`).toMatch(/[\d.]vw\b/);
  }
});

// ---- 3 ---------------------------------------------------------------------------------------

test("3 the page uses the tokens, with no leftovers", () => {
  // Utilities that set a color; the prefix list is what Tailwind v4 colors can hang off.
  const colorUtility =
    "(?:text|bg|border|border-[xytblrse]|divide|ring|outline|decoration|fill|stroke|shadow|accent|caret|placeholder|from|via|to)";
  const leftovers: [string, RegExp][] = [
    ["hex color literal", /#[0-9a-fA-F]{3,8}\b/],
    [
      "rgb/hsl/oklch/... color literal",
      /\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\(/,
    ],
    [
      "arbitrary color value",
      new RegExp(
        `\\b${colorUtility}-\\[[^\\]]*(?:#|rgb|hsl|hwb|oklch|oklab|lab|lch|color|var\\(--(?!color-))`,
      ),
    ],
    [
      "opacity-modified color (text-foreground/60)",
      new RegExp(`\\b${colorUtility}-[a-z][\\w-]*\\/\\d+`),
    ],
    [
      "stock Tailwind palette color (text-zinc-500, bg-white, ...)",
      new RegExp(
        `\\b${colorUtility}-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\\d{2,3})?)\\b`,
      ),
    ],
    [
      "stock size utility (text-sm, text-xl, text-4xl, ...)",
      /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/,
    ],
    ["arbitrary font size (text-[...px])", /\btext-\[\d/],
  ];

  const found: string[] = [];
  for (const file of markupFiles) {
    const lines = stripComments(read(file)).split("\n");
    lines.forEach((line, index) => {
      for (const [label, pattern] of leftovers) {
        if (pattern.test(line)) {
          found.push(`${file}:${index + 1} ${label}: ${line.trim()}`);
        }
      }
    });
  }
  expect(found).toEqual([]);
});

// ---- 4 ---------------------------------------------------------------------------------------

async function fontSizes(page: Page) {
  return page.evaluate(
    async ({ bodyTexts }) => {
      // Web fonts change text widths, not sizes, but measure the settled page all the same.
      await document.fonts.ready;
      const size = (element: Element | null) =>
        element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
      const byText = (text: string) =>
        [...document.querySelectorAll("main p")].find(
          (p) => p.textContent?.trim() === text,
        ) ?? null;
      return {
        h1: size(document.querySelector("h1")),
        h2: size(document.querySelector("h2")),
        body: bodyTexts.map((text) => ({ text, size: size(byText(text)) })),
      };
    },
    {
      bodyTexts: [
        profile.bio,
        ...profile.experience.map((role) => role.summary),
        ...profile.projects.map((project) => project.description),
      ],
    },
  );
}

test("4 the heading hierarchy scales with the viewport", async ({ page }) => {
  await page.goto("/");
  const measure = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    return fontSizes(page);
  };
  const at = {
    320: await measure(320),
    390: await measure(390),
    1440: await measure(1440),
  };

  expect.soft(at[1440].h1, "h1 at 1440 px").not.toBeNull();
  expect
    .soft(
      at[1440].h1,
      `h1 is larger at 1440 px (${at[1440].h1}px) than at 390 px (${at[390].h1}px)`,
    )
    .toBeGreaterThan(at[390].h1 ?? Number.POSITIVE_INFINITY);

  for (const width of [390, 1440] as const) {
    const { h1, h2, body } = at[width];
    expect.soft(h2, `an h2 exists at ${width} px`).not.toBeNull();
    expect
      .soft(h1, `h1 (${h1}px) > h2 (${h2}px) at ${width} px`)
      .toBeGreaterThan(h2 ?? Number.POSITIVE_INFINITY);
    expect.soft(body.length, "body paragraphs measured").toBeGreaterThan(0);
    for (const { text, size } of body) {
      expect
        .soft(
          h1,
          `h1 (${h1}px) > body paragraph (${size}px) at ${width} px: ${text}`,
        )
        .toBeGreaterThan(size ?? Number.POSITIVE_INFINITY);
    }
  }

  for (const { text, size } of at[320].body) {
    expect
      .soft(size, `body paragraph is at least 16px at 320 px: ${text}`)
      .toBeGreaterThanOrEqual(16);
  }
});

// ---- 5 ---------------------------------------------------------------------------------------

test("5 the site is light-only and the dark block is gone", async ({
  page,
}) => {
  const css = stripComments(globalsCss());
  expect
    .soft(css, "no prefers-color-scheme in globals.css")
    .not.toMatch(/prefers-color-scheme/);
  expect
    .soft(css, "globals.css declares color-scheme: light")
    .toMatch(/color-scheme\s*:\s*light\b/);

  await page.goto("/");
  const colors = async (colorScheme: "light" | "dark") => {
    await page.emulateMedia({ colorScheme });
    return page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return { background: body.backgroundColor, color: body.color };
    });
  };
  const light = await colors("light");
  const dark = await colors("dark");
  expect(dark, "body colors under a dark system theme").toEqual(light);
  // The existing axe tests in smoke.spec.ts cover both schemes and must stay green.
});

// ---- 6 ---------------------------------------------------------------------------------------

test.describe("on a 320 px wide phone", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("6 the page reflows without horizontal scroll or a clipped name", async ({
    page,
  }) => {
    await page.goto("/");
    const measured = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = document.documentElement;
      const h1 = document.querySelector("h1");
      if (!h1) return null;
      const range = document.createRange();
      range.selectNodeContents(h1);
      const text = range.getBoundingClientRect();
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        h1Text: h1.textContent,
        h1ScrollWidth: h1.scrollWidth,
        h1ClientWidth: h1.clientWidth,
        textLeft: text.left,
        textRight: text.right,
      };
    });

    expect(measured, "the page has an h1").not.toBeNull();
    if (!measured) return;
    expect(
      measured.scrollWidth,
      "page scrollWidth <= clientWidth",
    ).toBeLessThanOrEqual(measured.clientWidth);
    expect(measured.h1Text).toBe(profile.name);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Fully visible: the text sits inside the viewport and is not cut off by its own box.
    expect(
      measured.textLeft,
      "h1 text starts inside the viewport",
    ).toBeGreaterThanOrEqual(0);
    expect(
      measured.textRight,
      "h1 text ends inside the viewport",
    ).toBeLessThanOrEqual(measured.clientWidth);
    expect(
      measured.h1ScrollWidth,
      "h1 content is not clipped by its box",
    ).toBeLessThanOrEqual(measured.h1ClientWidth);
  });
});

// ---- Scope guards (contract "Scope and caps", "Rubric hard gates") ------------------------------

test("scope: body text is 7:1 and muted and accent text 4.5:1 on the background", async ({
  page,
}) => {
  const tokens = themeTokens(globalsCss());
  const names = [...tokens.keys()].filter((name) =>
    name.startsWith("--color-"),
  );
  const muted = names.find((name) => /muted/.test(name));
  const accent = names.find((name) => /accent|link/.test(name));
  expect(muted, "a --color-muted* token").toBeDefined();
  expect(accent, "a --color-accent* (or --color-link*) token").toBeDefined();

  await page.goto("/");
  const ratios = await page.evaluate(
    ({ muted, accent }) => {
      // A canvas turns any CSS color (oklch included) into 8-bit sRGB.
      const context = document.createElement("canvas").getContext("2d", {
        willReadFrequently: true,
      });
      const rgb = (color: string): [number, number, number] => {
        if (!context) throw new Error("no canvas");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "#000";
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b];
      };
      const luminance = ([r, g, b]: [number, number, number]) => {
        const channel = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const contrast = (a: string, b: string) => {
        const [la, lb] = [luminance(rgb(a)), luminance(rgb(b))];
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      // Resolve a token the way the page does, by letting a probe element use it.
      const resolve = (name: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${name})`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      const body = getComputedStyle(document.body);
      const firstParagraph = document.querySelector("main p");
      return {
        body: contrast(
          firstParagraph ? getComputedStyle(firstParagraph).color : body.color,
          body.backgroundColor,
        ),
        muted: contrast(resolve(muted), body.backgroundColor),
        accent: contrast(resolve(accent), body.backgroundColor),
      };
    },
    { muted: muted ?? "", accent: accent ?? "" },
  );

  expect.soft(ratios.body, "body text on background").toBeGreaterThanOrEqual(7);
  expect
    .soft(ratios.muted, `${muted} on background`)
    .toBeGreaterThanOrEqual(4.5);
  expect
    .soft(ratios.accent, `${accent} on background`)
    .toBeGreaterThanOrEqual(4.5);
});

test("scope: fonts come from next/font, at most two families", () => {
  const layout = stripComments(read("app/layout.tsx"));
  const families = [
    ...layout.matchAll(
      /import\s*\{([^}]*)\}\s*from\s*["']next\/font\/(?:google|local)["']/g,
    ),
  ].flatMap(([, names = ""]) => names.split(",").filter((name) => name.trim()));
  const localFonts = [...layout.matchAll(/\blocalFont\(/g)].length;

  expect(
    families.length + localFonts,
    "font families in layout.tsx",
  ).toBeGreaterThan(0);
  expect(
    families.length + localFonts,
    "font families in layout.tsx",
  ).toBeLessThanOrEqual(2);
  for (const file of [...markupFiles, "app/globals.css"]) {
    const source = stripComments(read(file));
    expect(source, `${file} loads no fonts by URL`).not.toMatch(
      /fonts\.(?:googleapis|gstatic)\.com|@font-face|@import\s+url\(/,
    );
  }
});

test("scope: the sprint adds no motion", () => {
  for (const file of [...markupFiles, "app/globals.css"]) {
    expect(
      stripComments(read(file)),
      `${file} has no transitions or animations`,
    ).not.toMatch(
      /@keyframes|\banimation\s*:|\btransition\s*:|\b(?:animate|transition|duration|delay)-/,
    );
  }
});
