import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type Browser,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { DARK, LIGHT } from "../lib/site";
import {
  COLOR_TOKENS,
  composite,
  contrast,
  hexToRgb,
  horizontalOverflow,
  type Rgb,
  ROUTES,
  resolveColors,
  resolvedBackground,
  resolveSteps,
  rootTokens,
  SCHEMES,
  STATUS,
  STEP_TOKENS,
  textStyles,
} from "./helpers";

// What stays true of the site whatever a sprint changes: it is built from its design tokens,
// follows the system's light or dark preference without JavaScript, and stays readable and
// accessible in both. Sprint contracts land here as lasting properties once they merge, never as
// one sprint's exact values, so a later sprint can retune the palette or add a token without
// deleting checks. Sprints 1 to 4 are folded in: tokens, dark mode, and the page-wide parts of the
// project cards and the accessibility pass; the cards' own checks are in cards.spec.ts and the
// keyboard's in keyboard.spec.ts. The one place exact colors appear is the check that
// lib/site.ts, which feeds the meta tags, the social card and the icons, still agrees with the CSS
// tokens: a consistency check, so a new palette changes both. Sprint 23 (B2.9) holds the page-wide
// checks on /read and the 404 as on / (.crew/sprint/23/contract.md), and sprint 31 (B4.13) on
// /crew, through ROUTES.

type Scheme = (typeof SCHEMES)[number];
type ColorToken = (typeof COLOR_TOKENS)[number];

const WIDTHS = [320, 1440] as const;
// WCAG 2.2 A and AA, and axe's best practices.
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The code and CSS files under `dir` (from the repo root, where Playwright runs), without comments. */
function sources(dir: string) {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(tsx?|css)$/.test(file))
    .map((file) => ({
      file: `${dir}/${file}`,
      // A line comment after a ":" stays, so "https://" survives.
      code: readFileSync(join(dir, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1"),
    }));
}

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

    test("B2.9 every text color and size comes from a token, and body text is at least 16 px, on /, /read, /crew and the 404", async ({
      page,
    }) => {
      for (const route of ROUTES) await textFromTokens(page, scheme, route);
    });

    test("text meets its contrast thresholds", ({ page }) =>
      meetsContrast(page, scheme));

    test("B2.9 axe finds no violation of any impact, with the strict tags, with or without the skip link showing, on /, /read, /crew and the 404", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      for (const route of ROUTES) await axeClean(page, route);
    });

    test("B2.9 with JavaScript off, the first paint already has this scheme's background, on /, /read, /crew and the 404", async ({
      browser,
      baseURL,
      page,
    }) => {
      for (const route of ROUTES) {
        await paintsWithoutScript(browser, `${baseURL}${route}`, page, scheme);
      }
    });

    test("the browser's address bar takes the page's background", ({ page }) =>
      themeColorIsBackground(page));

    test("the colors outside CSS (lib/site.ts and the icon) match the tokens", ({
      page,
      request,
    }) => paletteMatchesTokens(page, request, scheme));
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

test("the type scale is fluid: no step shrinks from 320 to 1440 px, and the largest grows", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 900 });
  const narrow = await resolveSteps(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const wide = await resolveSteps(page);
  for (const token of STEP_TOKENS) {
    expect
      .soft(wide[token] ?? 0, `${token} at 1440 vs 320 px`)
      .toBeGreaterThanOrEqual(narrow[token] ?? Number.POSITIVE_INFINITY);
  }
  const largest = (sizes: Record<string, number>) =>
    Math.max(...Object.values(sizes));
  expect(largest(wide), "the largest step at 1440 vs 320 px").toBeGreaterThan(
    largest(narrow),
  );
});

test.describe("on a 320 px wide phone", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("B2.9 nothing overflows horizontally, on /, /read, /crew and the 404", async ({
    page,
  }) => {
    for (const route of ROUTES) {
      const response = await page.goto(route);
      expect(response?.status(), `status of ${route}`).toBe(STATUS[route]);
      expect
        .soft(await horizontalOverflow(page), `overflow on ${route}`)
        .toBeLessThanOrEqual(0);
    }
  });
});

test("B2.9 every link and button is a target of at least 24 x 24 px on a phone, the skip link and the project links included, on /, /read, /crew and the 404", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ROUTES) {
    const response = await page.goto(route);
    expect(response?.status(), `status of ${route}`).toBe(STATUS[route]);
    // Focused, so the skip link shows. Since sprint 23 a project's target is its own link.
    await page.keyboard.press("Tab");
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button")]
        .filter((el) => el.getClientRects().length > 0)
        .flatMap((el) => {
          const r = el.getBoundingClientRect();
          return r.width >= 24 && r.height >= 24
            ? []
            : [
                `${el.getAttribute("href") ?? `<${el.tagName.toLowerCase()}> ${el.textContent}`}: ${r.width} x ${r.height}`,
              ];
        }),
    );
    expect
      .soft(small, `links and buttons smaller than 24 x 24 px on ${route}`)
      .toEqual([]);
  }
});

test("B2.9 one main, each section a region named by its heading, and no skipped heading level, on /, /read, /crew and the 404", async ({
  page,
}) => {
  for (const route of ROUTES) {
    const response = await page.goto(route);
    expect(response?.status(), `status of ${route}`).toBe(STATUS[route]);
    await expect(
      page.getByRole("main"),
      `main landmarks on ${route}`,
    ).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect((await page.title()).trim(), `document.title on ${route}`).not.toBe(
      "",
    );

    const sections = page.locator("main section");
    // The home page is made of sections; the other routes may have none.
    if (route === "/") {
      expect(await sections.count(), "sections in main").toBeGreaterThan(0);
    }
    for (const section of await sections.all()) {
      // textContent, not innerText: CSS may upper-case the h2, and the accessible name isn't.
      const heading = (
        (await section.locator("h2").first().textContent()) ?? ""
      ).trim();
      await expect(section, `the ${heading} section on ${route}`).toHaveRole(
        "region",
      );
      await expect(
        section,
        `the ${heading} section on ${route}`,
      ).toHaveAccessibleName(heading);
    }

    await expect(page.locator("h1"), `h1 elements on ${route}`).toHaveCount(1);
    const headings = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => ({
        level: Number(h.tagName.slice(1)),
        text: (h.textContent ?? "").trim().slice(0, 30),
      })),
    );
    let previous = 0;
    for (const { level, text } of headings) {
      expect(
        level - previous,
        `h${level} "${text}" follows an h${previous} on ${route}`,
      ).toBeLessThanOrEqual(1);
      previous = level;
    }
  }
});

test("B2.9 nothing animates on /read, /crew or the 404: no animation at load, 2 s later, or after a scroll to the bottom and back", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const route of ROUTES.filter((r) => r !== "/")) {
    const response = await page.goto(route);
    expect(response?.status(), `status of ${route}`).toBe(STATUS[route]);
    const animations = () =>
      page.evaluate(() => document.getAnimations().length);
    expect.soft(await animations(), `animations at load on ${route}`).toBe(0);
    await page.evaluate(() => new Promise((done) => setTimeout(done, 2000)));
    expect.soft(await animations(), `animations 2 s later on ${route}`).toBe(0);
    for (const to of ["bottom", "top"] as const) {
      await page.evaluate((where) => {
        scrollTo(
          0,
          where === "top" ? 0 : document.documentElement.scrollHeight,
        );
        return new Promise((done) => requestAnimationFrame(() => done(null)));
      }, to);
      expect
        .soft(await animations(), `animations at the ${to} on ${route}`)
        .toBe(0);
    }
  }
});

test("app/ and components/ use the tokens: no color literal or palette utility", () => {
  const palette =
    "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
  const rules: [string, RegExp][] = [
    ["a hex color", /(?<![\w&])#[0-9a-fA-F]{3,8}\b/],
    ["rgb()", /\brgba?\(/],
    ["hsl()", /\bhsla?\(/],
    ["oklch()", /\b(?:oklch|oklab)\(/],
    [
      "a Tailwind palette utility",
      new RegExp(
        `(?<![\\w])(?:[\\w-]+:)*[a-z]+(?:-[a-z]+)*-(?:black|white|(?:${palette})-\\d{2,3})(?![\\w-])`,
      ),
    ],
  ];
  // The color tokens' own declarations in app/globals.css are the one place literals live; code
  // that needs a color outside CSS takes it from lib/site.ts. Sprint 22 adds the line and fill
  // tokens --pencil, --card and --card-old.
  const declaration =
    /--(?:background|foreground|muted|accent|rule|pencil|card|card-old)\s*:[^;]*;/g;
  const hits = [...sources("app"), ...sources("components")].flatMap(
    ({ file, code }) =>
      rules
        .filter(([, pattern]) => pattern.test(code.replace(declaration, "")))
        .map(([name]) => `${file}: ${name}`),
  );
  expect(hits).toEqual([]);
});

async function textFromTokens(page: Page, scheme: Scheme, route: string) {
  const response = await page.goto(route);
  expect(response?.status(), `status of ${route}`).toBe(
    STATUS[route as keyof typeof STATUS],
  );
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
      .soft(
        off,
        `text not set in a token on ${route} at ${width} px (${scheme})`,
      )
      .toEqual([]);
    const body = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.body).fontSize),
    );
    expect
      .soft(body, `body font size on ${route} at ${width} px`)
      .toBeGreaterThanOrEqual(16);
  }
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { color: style.color, background: style.backgroundColor };
  });
  const colors = await resolveColors(page);
  expect
    .soft(body.color, `body color is --foreground on ${route}`)
    .toBe(colors["--foreground"]?.computed);
  expect
    .soft(body.background, `body background is --background on ${route}`)
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

async function axeClean(page: Page, route: string) {
  for (const width of [390, 1440]) {
    for (const skipShowing of [false, true]) {
      const where = `${route}, ${width} px, ${skipShowing ? "skip link showing" : "nothing focused"}`;
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route);
      // A missing route's 404 page is axe-clean too, so each route answers with its own status.
      expect
        .soft(response?.status(), `status of ${where}`)
        .toBe(STATUS[route as keyof typeof STATUS]);
      if (skipShowing) await page.keyboard.press("Tab");
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();
      const found = results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        targets: v.nodes.map((node) => node.target.join(" ")),
      }));
      expect.soft(found, `axe violations (${where})`).toEqual([]);
      // These rules ran and passed, rather than being skipped.
      const passed = results.passes.map((p) => p.id);
      for (const rule of ["color-contrast", "landmark-one-main", "region"]) {
        expect.soft(passed, `axe passed ${rule} (${where})`).toContain(rule);
      }
    }
  }
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
  const response = await noScript.goto(url);
  // Each route at its own status: a missing route's 404 page would paint the scheme too.
  const route = new URL(url).pathname as keyof typeof STATUS;
  expect
    .soft(response?.status(), `status of ${route} with scripts off`)
    .toBe(STATUS[route]);
  const seen = await noScript.evaluate(() => ({
    // Next's bootstrap defines this when the page's scripts run.
    scriptsRan: typeof (self as { __next_f?: unknown }).__next_f,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  await context.close();
  expect.soft(seen.scriptsRan, `page scripts ran on ${url}`).toBe("undefined");
  expect.soft(seen.background, `background on ${url}`).toBe(expected);
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

async function paletteMatchesTokens(
  page: Page,
  request: APIRequestContext,
  scheme: Scheme,
) {
  const palette = scheme === "light" ? LIGHT : DARK;
  await page.goto("/");
  const colors = await resolveColors(page);
  for (const [role, hex] of Object.entries(palette)) {
    expect
      .soft(
        colors[`--${role}`]?.computed,
        `--${role} vs lib/site.ts (${scheme})`,
      )
      .toBe(hexToRgb(hex));
  }
  const icon = (await (await request.get("/icon.svg")).text()).toLowerCase();
  // Ink, not copper, since sprint 23: copper means live (.crew/sprint/23/, Atlas's ruling).
  for (const hex of [palette.background, palette.foreground]) {
    expect.soft(icon, `icon.svg uses ${hex} (${scheme})`).toContain(hex);
  }
}
