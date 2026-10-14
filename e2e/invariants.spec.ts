import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  COLOR_TOKENS,
  composite,
  contrast,
  horizontalOverflow,
  type Rgb,
  resolveColors,
  resolvedBackground,
  rootTokens,
  SCHEMES,
  STEP_TOKENS,
  textStyles,
} from "./helpers";

// What stays true of the site whatever a sprint changes: it is built from its design tokens,
// follows the system's light or dark preference without JavaScript, and stays readable and
// accessible in both. Sprint contracts land here as lasting properties once they merge, never as
// one sprint's exact values, so a later sprint can retune the palette or add a token without
// deleting checks. Sprint 1 (tokens) and sprint 2 (dark mode) are folded in.

type Scheme = (typeof SCHEMES)[number];
type ColorToken = (typeof COLOR_TOKENS)[number];

const WIDTHS = [320, 1440] as const;

test("the color and type-step tokens are set on :root", async ({ page }) => {
  await page.goto("/");
  const values = await rootTokens(page, [...COLOR_TOKENS, ...STEP_TOKENS]);
  const unset = Object.entries(values)
    .filter(([, value]) => value === "")
    .map(([name]) => name);
  expect(unset, "tokens with no value on :root").toEqual([]);
});

for (const scheme of SCHEMES) {
  test.describe(`in the ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    test("every text color and size comes from a token, and body text is at least 16 px", ({
      page,
    }) => textFromTokens(page, scheme));

    test("text meets its contrast thresholds", ({ page }) =>
      meetsContrast(page, scheme));

    test("axe finds no violation of any impact", ({ page }) => axeClean(page));

    test("with JavaScript off, the first paint already has this scheme's background", ({
      browser,
      baseURL,
      page,
    }) => paintsWithoutScript(browser, `${baseURL}/`, page, scheme));

    test("the browser's address bar takes the page's background", ({ page }) =>
      themeColorIsBackground(page));
  });
}

test("light and dark differ, and the page tells the browser it supports both", async ({
  page,
}) => {
  const seen: Partial<Record<Scheme, Record<string, string>>> = {};
  await page.goto("/");
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    seen[scheme] = await rootTokens(page, ["--background", "--foreground"]);
    // Native scrollbars and form controls follow the system only when both schemes are declared.
    const colorScheme = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );
    expect.soft(colorScheme, `:root color-scheme (${scheme})`).toMatch(/light/);
    expect.soft(colorScheme, `:root color-scheme (${scheme})`).toMatch(/dark/);
  }
  for (const token of ["--background", "--foreground"]) {
    expect
      .soft(seen.dark?.[token], `${token}, dark vs light`)
      .not.toBe(seen.light?.[token]);
  }
});

test.describe("on a 320 px wide phone", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("nothing overflows horizontally", async ({ page }) => {
    await page.goto("/");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

async function textFromTokens(page: Page, scheme: Scheme) {
  await page.goto("/");
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const { tokenColors, tokenSizes, texts } = await textStyles(page);
    expect(texts.length, "elements with text").toBeGreaterThan(0);
    const off = texts
      .filter(
        ({ color, fontSize }) =>
          !tokenColors.includes(color) || !tokenSizes.includes(fontSize),
      )
      .map(
        ({ element, color, fontSize }) => `${element}: ${color}, ${fontSize}`,
      );
    expect
      .soft(off, `text not set in a token at ${width} px (${scheme})`)
      .toEqual([]);
    const body = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.body).fontSize),
    );
    expect
      .soft(body, `body font size at ${width} px`)
      .toBeGreaterThanOrEqual(16);
  }
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { color: style.color, background: style.backgroundColor };
  });
  const colors = await resolveColors(page);
  expect
    .soft(body.color, "body color is --foreground")
    .toBe(colors["--foreground"]?.computed);
  expect
    .soft(body.background, "body background is --background")
    .toBe(await resolvedBackground(page));
}

async function meetsContrast(page: Page, scheme: Scheme) {
  await page.goto("/");
  const colors = await resolveColors(page);
  const rgba = (token: ColorToken) => {
    const value = colors[token]?.rgba;
    if (!value) throw new Error(`${token} did not resolve`);
    return value;
  };
  const [r, g, b] = rgba("--background");
  const background: Rgb = [r, g, b];
  const on = (token: ColorToken, ground: Rgb) =>
    contrast(composite(rgba(token), ground), ground);
  // Body text at AAA; secondary text and links at least AA.
  expect
    .soft(on("--foreground", background), `--foreground (${scheme})`)
    .toBeGreaterThanOrEqual(7);
  for (const token of ["--muted", "--accent"] as const) {
    expect
      .soft(on(token, background), `${token} (${scheme})`)
      .toBeGreaterThanOrEqual(4.5);
  }
  // ::selection draws --foreground text on --rule.
  const rule = composite(rgba("--rule"), background);
  expect
    .soft(on("--foreground", rule), `selected text on --rule (${scheme})`)
    .toBeGreaterThanOrEqual(4.5);
}

async function axeClean(page: Page) {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const found = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((node) => node.target.join(" ")),
  }));
  expect(found).toEqual([]);
  // The contrast rule ran, rather than being skipped.
  expect(results.passes.map((p) => p.id)).toContain("color-contrast");
}

async function paintsWithoutScript(
  browser: Browser,
  url: string,
  page: Page,
  scheme: Scheme,
) {
  await page.goto(url);
  const expected = await resolvedBackground(page);
  const context = await browser.newContext({
    colorScheme: scheme,
    javaScriptEnabled: false,
  });
  const noScript = await context.newPage();
  await noScript.goto(url);
  const seen = await noScript.evaluate(() => ({
    // Next's bootstrap defines this when the page's scripts run.
    scriptsRan: typeof (self as { __next_f?: unknown }).__next_f,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  await context.close();
  expect(seen.scriptsRan, "page scripts ran").toBe("undefined");
  expect(seen.background).toBe(expected);
}

async function themeColorIsBackground(page: Page) {
  await page.goto("/");
  // Browsers use the first theme-color whose media matches.
  const themeColor = await page.evaluate(() => {
    const meta = [
      ...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    ].find((tag) => !tag.media || matchMedia(tag.media).matches);
    if (!meta) return "(none)";
    const probe = document.createElement("div");
    probe.style.backgroundColor = meta.content;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  expect(themeColor).toBe(await resolvedBackground(page));
}
