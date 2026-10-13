import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";

// Sprint 1 contract (design tokens), one check per id in .studio/sprint/1/contract.md.
// Where a check has a grep half and a browser half they are two tests with the same id, so a
// failure says which half broke.

const COLOR_TOKENS = [
  "--background",
  "--foreground",
  "--muted",
  "--accent",
  "--rule",
] as const;
const STEP_TOKENS = [
  "--step-sm",
  "--step-base",
  "--step-lg",
  "--step-xl",
  "--step-2xl",
] as const;
const WIDTHS = [320, 768, 1440] as const;

type Scheme = "light" | "dark";

function repoRoot(): string {
  return join(test.info().project.testDir, "..");
}

function readSource(rel: string) {
  return readFileSync(join(repoRoot(), rel), "utf8");
}

// Comments may talk about `.dark` or `clamp(`; only real CSS counts.
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
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

// The raw value of each custom property on :root, as the cascade leaves it.
async function rootTokens(page: Page, names: readonly string[]) {
  return page.evaluate((list) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      list.map((name) => [name, style.getPropertyValue(name).trim()]),
    );
  }, names);
}

// Each color token as the browser resolves it: the computed `color` of a probe element that uses
// `var(--token)`, as a string, and converted to sRGB 0-255 through a canvas (so oklch(), hsl()
// and friends all work).
async function resolveColors(page: Page) {
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

// A probe element at the current viewport, so clamp() and vw resolve the way they do on the page.
async function resolveSteps(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const resolve = (token: string) => {
      probe.style.fontSize = "";
      probe.style.fontSize = `var(${token})`;
      return getComputedStyle(probe).fontSize;
    };
    const out = {
      step2xl: resolve("--step-2xl"),
      stepSm: resolve("--step-sm"),
    };
    probe.remove();
    return out;
  });
}

async function resolveThemeColors(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const resolve = (cssProperty: "color" | "backgroundColor", v: string) => {
      probe.style[cssProperty] = "";
      probe.style[cssProperty] = `var(${v})`;
      return getComputedStyle(probe)[cssProperty];
    };
    const out = {
      foreground: resolve("color", "--foreground"),
      background: resolve("backgroundColor", "--background"),
      accent: resolve("color", "--accent"),
    };
    probe.remove();
    return out;
  });
}

function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

// Lays a possibly translucent color over an opaque background.
function composite(
  [r, g, b, a]: [number, number, number, number],
  bg: [number, number, number],
): [number, number, number] {
  return [
    r * a + bg[0] * (1 - a),
    g * a + bg[1] * (1 - a),
    b * a + bg[2] * (1 - a),
  ];
}

function contrast(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

test("C1 the 5 color tokens and 5 type-step tokens exist on :root", async ({
  page,
}) => {
  await page.goto("/");
  const values = await rootTokens(page, [...COLOR_TOKENS, ...STEP_TOKENS]);
  const empty = Object.entries(values)
    .filter(([, value]) => value === "")
    .map(([name]) => name);
  expect(empty, "tokens with no value on :root").toEqual([]);
});

test.describe("C2 the type scale is fluid", () => {
  test("C2 h1 grows with the viewport and the bio stays readable", async ({
    page,
  }) => {
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    const bio = page.getByText(profile.bio, { exact: true });
    const sizes: Record<number, { h1: number; bio: number }> = {};
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      sizes[width] = {
        h1: await h1.evaluate((el) =>
          Number.parseFloat(getComputedStyle(el).fontSize),
        ),
        bio: await bio.evaluate((el) =>
          Number.parseFloat(getComputedStyle(el).fontSize),
        ),
      };
    }
    const h1At = (w: number) => sizes[w]?.h1 ?? 0;
    expect.soft(h1At(768), "h1 at 768 > h1 at 320").toBeGreaterThan(h1At(320));
    expect
      .soft(h1At(1440), "h1 at 1440 > h1 at 768")
      .toBeGreaterThan(h1At(768));
    expect
      .soft(h1At(1440), "h1 at 1440 >= 1.4 x h1 at 320")
      .toBeGreaterThanOrEqual(h1At(320) * 1.4);
    expect
      .soft(sizes[320]?.bio ?? 0, "bio at 320 px is at least 16 px")
      .toBeGreaterThanOrEqual(16);
  });

  test("C2 (grep) every step token is a clamp() of rem with a vw term", () => {
    const css = stripCssComments(readSource("app/globals.css"));
    for (const token of STEP_TOKENS) {
      const declaration = new RegExp(`${token}\\s*:\\s*([^;]*);`).exec(css);
      expect
        .soft(declaration?.[1] ?? "", `${token} declaration`)
        .toMatch(/^\s*clamp\(/);
      // Token budget in the contract: a rem minimum and maximum with a vw term.
      expect.soft(declaration?.[1] ?? "", `${token} uses rem`).toMatch(/rem/);
      expect.soft(declaration?.[1] ?? "", `${token} uses vw`).toMatch(/vw/);
    }
  });
});

test.describe("C3 the page uses the tokens", () => {
  test("C3 headings, body and links resolve to the tokens", async ({
    page,
  }) => {
    await page.goto("/");
    const missing = Object.entries(
      await rootTokens(page, [
        "--step-sm",
        "--step-2xl",
        "--foreground",
        "--background",
        "--accent",
      ]),
    )
      .filter(([, value]) => value === "")
      .map(([name]) => name);
    expect(missing, "tokens the page should use but are missing").toEqual([]);

    const h1 = page.getByRole("heading", { level: 1 });
    const h2s = page.getByRole("heading", { level: 2 });
    const links = page.locator("section:has(h2#contact) a");
    expect(await links.count(), "contact links").toBeGreaterThan(0);

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      // A probe at the same viewport, so clamp()/vw resolve the way they do on the element.
      const resolved = await resolveSteps(page);

      const h1Size = await h1.evaluate((el) => getComputedStyle(el).fontSize);
      expect
        .soft(h1Size, `h1 font-size at ${width}px equals --step-2xl`)
        .toBe(resolved.step2xl);
      for (const size of await h2s.evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).fontSize),
      )) {
        expect
          .soft(size, `h2 font-size at ${width}px equals --step-sm`)
          .toBe(resolved.stepSm);
      }
    }

    const colors = await resolveThemeColors(page);
    const body = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { color: style.color, backgroundColor: style.backgroundColor };
    });
    expect
      .soft(body.color, "body color equals --foreground")
      .toBe(colors.foreground);
    expect
      .soft(body.backgroundColor, "body background-color equals --background")
      .toBe(colors.background);
    for (const color of await links.evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).color),
    )) {
      expect
        .soft(color, "Contact link color equals --accent")
        .toBe(colors.accent);
    }
  });

  test("C3 (grep) no Tailwind size or foreground-opacity utility is left in app/ or components/", () => {
    const root = repoRoot();
    const hits: string[] = [];
    for (const dir of ["app", "components"]) {
      const files = readdirSync(join(root, dir), {
        recursive: true,
        encoding: "utf8",
      }).filter((file) => /\.(tsx?|jsx?|css|mdx?)$/.test(file));
      for (const file of files) {
        readFileSync(join(root, dir, file), "utf8")
          .split("\n")
          .forEach((line, index) => {
            if (
              /text-(xs|sm|base|lg|xl|[2-9]xl)\b|foreground\/[0-9]/.test(line)
            )
              hits.push(`${dir}/${file}:${index + 1}: ${line.trim()}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });
});

for (const scheme of ["light", "dark"] as const satisfies Scheme[]) {
  test.describe(`C4 contrast in the ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    test(`C4 foreground, muted and accent reach 4.5:1 on the background (${scheme})`, async ({
      page,
    }) => {
      await page.goto("/");
      const empty = Object.entries(await rootTokens(page, COLOR_TOKENS))
        .filter(([, value]) => value === "")
        .map(([name]) => name);
      expect(empty, "color tokens with no value").toEqual([]);

      const colors = await resolveColors(page);
      const bg = colors["--background"]?.rgba;
      expect(bg, "--background resolves").toBeDefined();
      if (!bg) return;
      const background: [number, number, number] = [bg[0], bg[1], bg[2]];
      const ratios: Record<string, number> = {};
      for (const token of ["--foreground", "--muted", "--accent"]) {
        const rgba = colors[token]?.rgba;
        if (rgba)
          ratios[token] = contrast(composite(rgba, background), background);
      }
      for (const [token, ratio] of Object.entries(ratios)) {
        expect
          .soft(ratio, `${token} on --background (${scheme})`)
          .toBeGreaterThanOrEqual(4.5);
      }
    });
  });
}

test.describe("C5 the dark block stays parity-only", () => {
  test("C5 (grep) one dark block that sets the 5 color tokens and nothing else, no .dark class", () => {
    const css = stripCssComments(readSource("app/globals.css"));
    const blocks = [
      ...css.matchAll(/@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/g),
    ];
    expect(blocks, "prefers-color-scheme: dark blocks").toHaveLength(1);
    expect(
      css.match(/prefers-color-scheme\s*:\s*dark/g) ?? [],
      "mentions of prefers-color-scheme: dark",
    ).toHaveLength(1);

    const open = (blocks[0]?.index ?? 0) + (blocks[0]?.[0].length ?? 1) - 1;
    const media = braceBody(css, open);
    // Exactly one rule, on :root.
    const rules = [...media.matchAll(/([^{}]+)\{/g)].map((m) => m[1]?.trim());
    expect(rules, "rules inside the dark block").toEqual([":root"]);
    const declarations = media
      .slice(media.indexOf("{") + 1, media.lastIndexOf("}"))
      .split(";")
      .map((d) => d.split(":")[0]?.trim() ?? "")
      .filter((name) => name !== "");
    expect
      .soft([...declarations].sort(), "properties the dark block sets")
      .toEqual([...COLOR_TOKENS].sort());

    expect.soft(css, "a .dark class selector").not.toMatch(/\.dark\b/);
  });

  test("C5 dark values differ from light and the body follows --background", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const light = await rootTokens(page, ["--background", "--foreground"]);
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await rootTokens(page, ["--background", "--foreground"]);
    expect(dark["--background"], "--background has a dark value").not.toBe("");
    expect
      .soft(dark["--background"], "--background, dark vs light")
      .not.toBe(light["--background"]);
    expect
      .soft(dark["--foreground"], "--foreground, dark vs light")
      .not.toBe(light["--foreground"]);

    const { body, token } = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--background)";
      document.body.append(probe);
      const token = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { body: getComputedStyle(document.body).backgroundColor, token };
    });
    expect(body, "body background-color in dark equals dark --background").toBe(
      token,
    );
  });
});

test.describe("C6 nothing regressed", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("C6 nothing overflows horizontally at 320 px", async ({ page }) => {
    await page.goto("/");
    const { scrollWidth, clientWidth } = await page.evaluate(async () => {
      // Web fonts change text widths, so measure after they load.
      await document.fonts.ready;
      const root = document.documentElement;
      return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
    });
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
