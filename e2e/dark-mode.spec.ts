import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Sprint 2 contract (dark mode), one check per id in .studio/sprint/2/contract.md. Where a check
// has a grep half and a browser half they are separate tests with the same id, so a failure says
// which half broke. tokens.spec.ts already covers token names, the 4.5:1 floor, the one dark block
// and "dark differs from light"; none of that is repeated here. The helpers below are copies of
// that file's, since a spec file's helpers can't be imported without importing its tests.

const COLOR_TOKENS = [
  "--background",
  "--foreground",
  "--muted",
  "--accent",
  "--rule",
] as const;
type ColorToken = (typeof COLOR_TOKENS)[number];
type Rgb = [number, number, number];
type Rgba = [number, number, number, number];
type Scheme = "light" | "dark";
const SCHEMES = ["light", "dark"] as const satisfies Scheme[];

function repoRoot(): string {
  return join(test.info().project.testDir, "..");
}

function readSource(rel: string) {
  return readFileSync(join(repoRoot(), rel), "utf8");
}

// Comments may talk about `.dark` or hex values; only real CSS counts.
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Block comments, and line comments that start a line or follow whitespace (so `https://` stays).
function stripCodeComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

// Everything between the braces that open at `openIndex` and their matching close.
function braceBody(css: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) return css.slice(openIndex + 1, i);
  }
  throw new Error("unbalanced braces in globals.css");
}

// The top-level constructs of a stylesheet: statements (`@import ...;`) and blocks.
type TopLevel = { prelude: string; body: string | null; text: string };

function topLevel(css: string): TopLevel[] {
  const out: TopLevel[] = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    const semi = css.indexOf(";", i);
    if (brace === -1 && semi === -1) break;
    if (brace === -1 || (semi !== -1 && semi < brace)) {
      out.push({
        prelude: css.slice(i, semi).trim(),
        body: null,
        text: css.slice(i, semi + 1),
      });
      i = semi + 1;
      continue;
    }
    const body = braceBody(css, brace);
    const end = brace + body.length + 2;
    out.push({
      prelude: css.slice(i, brace).trim(),
      body,
      text: css.slice(i, end),
    });
    i = end;
  }
  return out;
}

function isDarkBlock(rule: TopLevel): boolean {
  return (
    rule.prelude.startsWith("@media") &&
    /prefers-color-scheme\s*:\s*dark/.test(rule.prelude)
  );
}

function listFiles(dir: string): string[] {
  return readdirSync(join(repoRoot(), dir), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((file) => !file.split("/").includes("node_modules"))
    .map((file) => `${dir}/${file}`)
    .filter((rel) => {
      try {
        readFileSync(join(repoRoot(), rel), "utf8");
        return true;
      } catch {
        return false; // a directory
      }
    });
}

// Each color token as the browser resolves it: the computed `color` of a probe element that uses
// `var(--token)`, and converted to sRGB 0-255 through a canvas.
async function resolveColors(page: Page) {
  return page.evaluate((names) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d canvas");
    const probe = document.createElement("div");
    document.body.append(probe);
    const out: Record<string, { computed: string; rgba: Rgba }> = {};
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

async function resolvedColors(page: Page) {
  const colors = await resolveColors(page);
  const get = (token: ColorToken): Rgba => {
    const rgba = colors[token]?.rgba;
    if (!rgba) throw new Error(`${token} did not resolve`);
    return rgba;
  };
  return {
    background: get("--background"),
    foreground: get("--foreground"),
    muted: get("--muted"),
    accent: get("--accent"),
    rule: get("--rule"),
    computed: (token: ColorToken) => colors[token]?.computed ?? "",
  };
}

// `--background` as the computed background-color of a probe, in the scheme the page is emulating.
async function resolvedBackground(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--background)";
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
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

// Lays a possibly translucent color over an opaque background.
function composite([r, g, b, a]: Rgba, bg: Rgb): Rgb {
  return [
    r * a + bg[0] * (1 - a),
    g * a + bg[1] * (1 - a),
    b * a + bg[2] * (1 - a),
  ];
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

function rgbOf([r, g, b]: Rgba): Rgb {
  return [r, g, b];
}

function hexToRgbString(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

test.describe("C1 the browser knows the page has two themes", () => {
  test("C1 color-scheme, its meta tag and native controls follow the scheme", async ({
    page,
  }) => {
    await page.goto("/");
    const inputBackground: Partial<Record<Scheme, string>> = {};
    const canvasColor: Partial<Record<Scheme, string>> = {};
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      const seen = await page.evaluate(() => {
        // Tailwind's preflight sets every form control's background to transparent, so a bare
        // <input> reads rgba(0, 0, 0, 0) in both schemes. `revert` rolls that back to the browser's
        // own control style, which is what follows `color-scheme`. `Canvas` is the page color.
        const input = document.createElement("input");
        input.style.backgroundColor = "revert";
        const canvas = document.createElement("div");
        canvas.style.backgroundColor = "Canvas";
        document.body.append(input, canvas);
        const background = getComputedStyle(input).backgroundColor;
        const canvasColor = getComputedStyle(canvas).backgroundColor;
        input.remove();
        canvas.remove();
        return {
          colorScheme: getComputedStyle(document.documentElement).colorScheme,
          metas: [
            ...document.querySelectorAll('meta[name="color-scheme"]'),
          ].map((meta) => meta.getAttribute("content")),
          background,
          canvasColor,
        };
      });
      inputBackground[scheme] = seen.background;
      canvasColor[scheme] = seen.canvasColor;
      expect
        .soft(seen.colorScheme, `:root color-scheme (${scheme})`)
        .toMatch(/\blight\b/);
      expect
        .soft(seen.colorScheme, `:root color-scheme (${scheme})`)
        .toMatch(/\bdark\b/);
      expect
        .soft(seen.metas, `<meta name="color-scheme"> content (${scheme})`)
        .toEqual(["light dark"]);
    }
    expect
      .soft(
        inputBackground.dark,
        `native <input> background in dark vs light (${inputBackground.light})`,
      )
      .not.toBe(inputBackground.light);
    expect
      .soft(
        canvasColor.dark,
        `Canvas system color in dark vs light (${canvasColor.light})`,
      )
      .not.toBe(canvasColor.light);
  });

  test("C1 (grep) color-scheme is declared in the base :root rule, outside the dark block", () => {
    const rules = topLevel(stripCssComments(readSource("app/globals.css")));
    const dark = rules.filter(isDarkBlock);
    const base = rules.find((rule) => rule.prelude === ":root");
    const declares = /(^|[;\s{])color-scheme\s*:\s*([^;}]*)/;

    expect(base, "a top-level :root rule").toBeDefined();
    const value = declares.exec(base?.body ?? "")?.[2] ?? "";
    expect
      .soft(value, "color-scheme in the base :root rule")
      .toMatch(/\blight\b/);
    expect
      .soft(value, "color-scheme in the base :root rule")
      .toMatch(/\bdark\b/);
    for (const block of dark) {
      expect
        .soft(
          block.body ?? "",
          "color-scheme inside the prefers-color-scheme: dark block",
        )
        .not.toMatch(/color-scheme\s*:/);
    }
  });
});

test("C2 theme-color: one tag per scheme, each equal to its --background", async ({
  page,
}) => {
  await page.goto("/");
  const tags = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((metas) =>
      metas.map((meta) => ({
        content: meta.getAttribute("content") ?? "",
        media: meta.getAttribute("media"),
      })),
    );
  expect(tags, "number of <meta name=theme-color> tags").toHaveLength(2);
  const media = tags.map((tag) => tag.media).sort();
  expect(media, "media attribute of the two tags").toEqual([
    "(prefers-color-scheme: dark)",
    "(prefers-color-scheme: light)",
  ]);

  for (const scheme of SCHEMES) {
    const tag = tags.find(
      (t) => t.media === `(prefers-color-scheme: ${scheme})`,
    );
    await page.emulateMedia({ colorScheme: scheme });
    const background = await resolvedBackground(page);
    const themeColor = await page.evaluate((content) => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = content;
      document.body.append(probe);
      const value = probe.style.backgroundColor
        ? getComputedStyle(probe).backgroundColor
        : "(not a color)";
      probe.remove();
      return value;
    }, tag?.content ?? "");
    expect
      .soft(themeColor, `theme-color (${scheme}) resolved vs --background`)
      .toBe(background);
  }
});

for (const scheme of SCHEMES) {
  test.describe(`C3 contrast thresholds in the ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    test(`C3 foreground, accent and selection text meet their thresholds (${scheme})`, async ({
      page,
    }) => {
      await page.goto("/");
      const colors = await resolvedColors(page);
      const background = rgbOf(colors.background);
      const rule = composite(colors.rule, background);

      // Body text at AAA in both schemes.
      expect
        .soft(
          contrast(composite(colors.foreground, background), background),
          `--foreground on --background (${scheme}), at least 7`,
        )
        .toBeGreaterThanOrEqual(7);
      // Links are 16 to 18 px text; the light accent only has to hold the 4.5 floor (tokens C4).
      if (scheme === "dark") {
        expect
          .soft(
            contrast(composite(colors.accent, background), background),
            "--accent on --background (dark), at least 7",
          )
          .toBeGreaterThanOrEqual(7);
      }
      // ::selection draws --foreground text on a --rule background.
      expect
        .soft(
          contrast(composite(colors.foreground, rule), rule),
          `--foreground on --rule (${scheme}), at least 4.5`,
        )
        .toBeGreaterThanOrEqual(4.5);
    });
  });

  test.describe(`C4 axe in the ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    test(`C4 axe reports no violation of any impact (${scheme})`, async ({
      page,
    }) => {
      await page.goto("/");
      const results = await new AxeBuilder({ page }).analyze();
      const found = results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        targets: v.nodes.map((node) => node.target.join(" ")),
      }));
      expect(found).toEqual([]);
      // "With color-contrast included" means the rule ran, not that it was switched off.
      expect(
        results.passes.map((p) => p.id),
        "axe rules that passed",
      ).toContain("color-contrast");
    });
  });

  test.describe(`C5 no flash in the ${scheme} scheme`, () => {
    test(`C5 with JavaScript off, the first paint already uses the ${scheme} --background`, async ({
      browser,
      baseURL,
    }) => {
      // The expected value comes from a normal page in the same scheme.
      const reference = await browser.newContext({ colorScheme: scheme });
      const referencePage = await reference.newPage();
      await referencePage.goto(`${baseURL}/`);
      const expected = await resolvedBackground(referencePage);
      await reference.close();

      const context = await browser.newContext({
        colorScheme: scheme,
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto(`${baseURL}/`);
      const seen = await page.evaluate(() => ({
        // Next's own bootstrap defines this when the page's scripts run.
        scriptsRan: typeof (self as { __next_f?: unknown }).__next_f,
        background: getComputedStyle(document.body).backgroundColor,
      }));
      await context.close();

      expect(seen.scriptsRan, "page scripts ran").toBe("undefined");
      expect(seen.background, `body background-color (${scheme}, no JS)`).toBe(
        expected,
      );
    });
  });
}

test.describe("C5 no flash of the wrong theme, and no toggle", () => {
  test("C5 the two schemes paint different backgrounds with JavaScript off", async ({
    browser,
    baseURL,
  }) => {
    // Guards the equality tests above against passing because both schemes look the same.
    const seen: Partial<Record<Scheme, string>> = {};
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({
        colorScheme: scheme,
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto(`${baseURL}/`);
      seen[scheme] = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      );
      await context.close();
    }
    expect(seen.dark, "no-JS body background, dark vs light").not.toBe(
      seen.light,
    );
  });

  test("C5 (served HTML) no script in the page implements a theme", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);
    const html = await response.text();
    const scripts = [
      ...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),
    ].map((m) => m[1] ?? "");
    // Next streams the React tree as `self.__next_f.push(...)` data. That is a description of
    // elements, not code that runs a theme: it carries the <meta media="(prefers-color-scheme:
    // ...)"> tags C2 asks for, and the framework's own 404 boundary CSS. So `prefers-color-scheme`
    // is judged on the scripts that execute; `localStorage` and `data-theme` are judged everywhere.
    const isFlightData = (text: string) => /^\s*\(?self\.__next_f/.test(text);
    const executable = scripts.filter((text) => !isFlightData(text));

    const hits: string[] = [];
    for (const text of scripts) {
      for (const word of ["localStorage", "data-theme"]) {
        if (text.includes(word)) hits.push(`${word} in: ${text.slice(0, 80)}`);
      }
    }
    for (const text of executable) {
      if (text.includes("prefers-color-scheme"))
        hits.push(`prefers-color-scheme in: ${text.slice(0, 80)}`);
    }
    expect(hits, "theme code in served <script> text").toEqual([]);
  });

  test("C5 (grep) no client-side theme code in app/, components/ or package.json", () => {
    const banned: [string, RegExp][] = [
      ["localStorage", /localStorage/],
      ["sessionStorage", /sessionStorage/],
      ["data-theme", /data-theme/],
      ["dangerouslySetInnerHTML", /dangerouslySetInnerHTML/],
      ["next-themes", /next-themes/],
      ["matchMedia", /matchMedia/],
      // A `dark:` utility compiles to a second dark media rule that tokens C5 cannot see.
      ["Tailwind dark: variant", /(?<![\w-])dark:(?=[!\w[(-])/],
      [
        "Tailwind @variant / @custom-variant dark",
        /@(custom-)?variant\s+dark\b/,
      ],
    ];
    const hits: string[] = [];
    for (const rel of [
      ...listFiles("app"),
      ...listFiles("components"),
      "package.json",
    ]) {
      readSource(rel)
        .split("\n")
        .forEach((line, index) => {
          for (const [name, pattern] of banned) {
            if (pattern.test(line))
              hits.push(`${rel}:${index + 1}: ${name}: ${line.trim()}`);
          }
        });
    }
    expect(hits).toEqual([]);
  });
});

test("C6 (grep) colors come from the tokens, not literals", () => {
  const literal = [
    ["hex color", /#[0-9a-fA-F]{3,8}\b/],
    ["rgb(", /\brgba?\(/],
    ["hsl(", /\bhsla?\(/],
    ["oklch(", /\boklch\(/],
    [
      "Tailwind palette color utility",
      /\b(?:bg|text|border|ring|fill|stroke)-(?:black|white|(?:slate|gray|zinc|neutral|stone)-\d+)\b/,
    ],
  ] as const;
  const scan = (rel: string, code: string, hits: string[]) => {
    code.split("\n").forEach((line, index) => {
      for (const [name, pattern] of literal) {
        if (pattern.test(line))
          hits.push(`${rel}:${index + 1}: ${name}: ${line.trim()}`);
      }
    });
  };

  const hits: string[] = [];
  // app/layout.tsx holds the two theme-color literals that C2 pins to the tokens.
  for (const rel of [...listFiles("app"), ...listFiles("components")]) {
    if (rel === "app/layout.tsx" || rel === "app/globals.css") continue;
    if (!/\.(tsx?|jsx?|mdx?|css)$/.test(rel)) continue;
    const source = readSource(rel);
    scan(
      rel,
      rel.endsWith(".css")
        ? stripCssComments(source)
        : stripCodeComments(source),
      hits,
    );
  }
  // globals.css: everything except the base :root block and the dark block must use var().
  const outside = topLevel(stripCssComments(readSource("app/globals.css")))
    .filter((rule) => rule.prelude !== ":root" && !isDarkBlock(rule))
    .map((rule) => rule.text)
    .join("\n");
  scan("app/globals.css", outside, hits);
  expect(hits).toEqual([]);
});

// Sprint 1's light values and fluid-type declarations, held as literals so this check does not
// depend on the code it judges.
const LIGHT: Record<ColorToken, string> = {
  "--background": "#e6f3f1",
  "--foreground": "#0f2220",
  "--muted": "#455e5a",
  "--accent": "#944126",
  "--rule": "#c5d5d2",
};
const STEP_DECLARATIONS = [
  "--step-sm: clamp(0.8333rem, 0.8304rem + 0.0149vw, 0.8438rem);",
  "--step-base: clamp(1rem, 0.9643rem + 0.1786vw, 1.125rem);",
  "--step-lg: clamp(1.2rem, 1.1143rem + 0.4286vw, 1.5rem);",
  "--step-xl: clamp(1.44rem, 1.28rem + 0.8vw, 2rem);",
  "--step-2xl: clamp(3rem, 2.5rem + 2.5vw, 4.75rem);",
];

function stepDeclarations(css: string): string[] {
  return [...css.matchAll(/--step-[a-z0-9]+\s*:[^;]*;/g)].map((m) => m[0]);
}

test.describe("C7 light is unchanged", () => {
  test.use({ colorScheme: "light" });

  test("C7 light token values, type-step declarations and body colors are sprint 1's", async ({
    page,
  }) => {
    await page.goto("/");
    const colors = await resolvedColors(page);
    for (const token of COLOR_TOKENS) {
      expect
        .soft(colors.computed(token), `${token} (light)`)
        .toBe(hexToRgbString(LIGHT[token]));
    }

    const body = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { color: style.color, backgroundColor: style.backgroundColor };
    });
    expect
      .soft(body.color, "body color equals --foreground")
      .toBe(colors.computed("--foreground"));
    expect
      .soft(body.backgroundColor, "body background equals --background")
      .toBe(colors.computed("--background"));

    const css = readSource("app/globals.css");
    expect
      .soft(stepDeclarations(css), "--step-* declarations in globals.css")
      .toEqual(STEP_DECLARATIONS);
    // And against main itself when the clone has it (a shallow CI checkout may not). The local
    // `main` can lag behind the remote, so only origin/main counts.
    let main: string | undefined;
    try {
      main = execFileSync("git", ["show", "origin/main:app/globals.css"], {
        cwd: repoRoot(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      main = undefined;
    }
    if (main !== undefined) {
      expect
        .soft(stepDeclarations(css), "--step-* declarations vs origin/main")
        .toEqual(stepDeclarations(main));
    }
  });
});
