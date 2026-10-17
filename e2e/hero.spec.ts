import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import {
  composite,
  contrast,
  horizontalOverflow,
  parseColor,
  type Rgb,
  resolveColors,
  resolvedBackground,
  SCHEMES,
} from "./helpers";
import { refuseWebGl } from "./webgl";

// Sprint 8, Part A of sprint 7's contract (.studio/sprint/7/contract.md, C1 to C9): the hero is a
// static inline SVG, a lift half-model of seven planks and one copper one, placed right after the
// header. One test per check, named by its number. Hooks: [data-hero] (the box), [data-hero-hull]
// (the group of all lifts), [data-hero-lift] (seven paths), [data-hero-copper] (one plank, on the
// third lift). How each check was read, and what the builder can rely on:
// .studio/sprint/8/probe-checks.md.

test.use({ viewport: { width: 1440, height: 900 } });

// Part B (sprint 10) swaps the SVG for a WebGL canvas on a device that can take it. These checks
// are about the SVG, so every context they open gets a getContext that returns null for the WebGL
// types: they keep testing the SVG on a machine with a GPU, where the caveat flag would not
// refuse. (hero-3d.spec.ts tests the canvas.) It adds a precondition and removes nothing.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(refuseWebGl);
});

const HERO = "[data-hero]";
const HULL = "[data-hero-hull]";
const LIFT = "[data-hero-lift]";
const COPPER = "[data-hero-copper]";

// WCAG 2.2 A and AA, and axe's best practices (the same tags as invariants.spec.ts).
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

// The widths C2 and C3 name: 320 and 390, 600 and 767 (heights from the formula below), 768 (the
// first desktop width), and 1024 and 1440.
const FOOTPRINT_WIDTHS = [320, 390, 600, 767, 768, 1024, 1440] as const;

/**
 * The box the contract wants at a viewport's `clientWidth`: 688 x 138 from 768, else full-bleed and
 * 8 + 130 s tall, s the hull's width over 624 (the turn's envelope plus 4 px each side;
 * .studio/sprint/9/contract.md, "C2 trim").
 */
function expectedBox(cw: number) {
  return cw >= 768
    ? { width: 688, height: 138 }
    : { width: cw, height: 8 + (130 * expectedHullWidth(cw)) / 624 };
}

/** Where the hull's bow tip sits: the header's right edge, `cw - 24` below 672. */
function expectedHullRight(cw: number) {
  return cw < 672 ? cw - 24 : (cw + 624) / 2;
}

/** The hull's length: 1.12 x cw up to 390, linear to 624 at 768, 624 from there up. */
function expectedHullWidth(cw: number) {
  if (cw <= 390) return 1.12 * cw;
  if (cw >= 768) return 624;
  return 1.12 * 390 + ((cw - 390) * (624 - 1.12 * 390)) / (768 - 390);
}

type Rect = { left: number; top: number; right: number; bottom: number };

/** Loads the page at a size and waits for the web fonts, which change the header's height. */
async function open(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
}

/** The page's layout, in document coordinates, at scroll 0. */
async function geometry(page: Page) {
  return page.evaluate(
    ({ hero, hull }) => {
      const rect = (el: Element | null): Rect | null => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left + scrollX,
          top: r.top + scrollY,
          right: r.right + scrollX,
          bottom: r.bottom + scrollY,
        };
      };
      return {
        cw: document.documentElement.clientWidth,
        box: rect(document.querySelector(hero)),
        hull: rect(document.querySelector(hull)),
        header: rect(document.querySelector("main > header")),
        section: rect(document.querySelector("main > section")),
      };
    },
    { hero: HERO, hull: HULL },
  );
}

type Tone = { r: number; g: number; b: number; a: number };

/** Sets the layout-shift counter going before the page's own scripts, so nothing is missed. */
async function watchLayoutShift(page: Page) {
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

type LcpEntry = {
  time: number;
  url: string;
  inMain: boolean;
  inHero: boolean;
  tag: string;
  text: string;
};

/** Loads `url` at 4x CPU slowdown and returns the last largest-contentful-paint candidate. */
async function measureLcp(page: Page, url: string) {
  await page.addInitScript(() => {
    const win = window as Window & { __lcp?: LcpEntry[] };
    win.__lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const lcp = entry as PerformanceEntry & {
          element: Element | null;
          url: string;
        };
        const el = lcp.element;
        win.__lcp?.push({
          time: lcp.startTime,
          url: lcp.url,
          inMain: Boolean(el?.closest("main")),
          inHero: Boolean(el?.closest("[data-hero]")),
          tag: el?.tagName.toLowerCase() ?? "(removed)",
          text: (el?.textContent ?? "").trim().slice(0, 40),
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(url);
  // Let late candidates arrive; the last one is the page's LCP.
  await page.evaluate(
    () => new Promise((resolve) => setTimeout(resolve, 1500)),
  );
  const entries = await page.evaluate(
    () => (window as Window & { __lcp?: LcpEntry[] }).__lcp ?? [],
  );
  return entries.at(-1) ?? null;
}

// sRGB to OKLCH, to judge hue, chroma and lightness the way the contract does.
function oklch([r, g, b]: Rgb) {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)] as const;
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    lightness,
    chroma: Math.hypot(a, bb),
    hue: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/** The shortest way round the hue circle, in degrees. */
function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// ---------------------------------------------------------------------------------------------

test("C1. Place and role: one aria-hidden, inert div in main, between the header and the first section", async ({
  page,
}) => {
  await open(page, 1440);
  await expect(page.locator(HERO), "exactly one [data-hero]").toHaveCount(1);
  const found = await page.evaluate(
    ({ hero, focusables }) => {
      const box = document.querySelector(hero);
      if (!box) return null;
      const main = document.querySelector("main");
      const everything = [box, ...box.querySelectorAll("*")];
      const text: string[] = [];
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if ((n.textContent ?? "").trim() !== "") text.push(n.textContent ?? "");
      }
      // Nothing may take focus, even by a script: ask each element.
      const takesFocus: string[] = [];
      for (const el of everything) {
        (el as HTMLElement | SVGElement).focus?.();
        if (box.contains(document.activeElement)) {
          takesFocus.push(el.tagName.toLowerCase());
          (document.activeElement as HTMLElement).blur();
        }
      }
      const withBackground: string[] = [];
      for (const el of everything) {
        for (const pseudo of [null, "::before", "::after"] as const) {
          const image = getComputedStyle(el, pseudo).backgroundImage;
          if (image !== "none") {
            withBackground.push(`${el.tagName.toLowerCase()}${pseudo ?? ""}`);
          }
        }
      }
      return {
        tag: box.tagName,
        parentIsMain: box.parentElement === main && main?.tagName === "MAIN",
        previousIsHeader: Boolean(
          box.previousElementSibling?.matches("main > header"),
        ),
        nextIsFirstSection:
          box.nextElementSibling === document.querySelector("main > section") &&
          Boolean(box.nextElementSibling?.matches("main > section")),
        ariaHidden: box.getAttribute("aria-hidden"),
        pointerEvents: getComputedStyle(box).pointerEvents,
        // A child that turned pointer events back on would be hit through the box.
        pointerEventsOn: everything
          .filter((el) => getComputedStyle(el).pointerEvents !== "none")
          .map((el) => el.tagName.toLowerCase()),
        textNodes: text,
        banned: box.matches("[tabindex]")
          ? ["the box itself has tabindex"]
          : [
              ...box.querySelectorAll("img, image, video, canvas, [tabindex]"),
            ].map((el) => el.tagName.toLowerCase()),
        focusable: [...box.querySelectorAll(focusables)].map((el) =>
          el.tagName.toLowerCase(),
        ),
        takesFocus,
        withBackground,
      };
    },
    {
      hero: HERO,
      focusables:
        "a, area, button, input, select, textarea, summary, iframe, audio, video, object, embed, [contenteditable], [tabindex], [focusable=true]",
    },
  );
  expect(found, "[data-hero] is in the page").not.toBeNull();
  if (!found) return;
  expect.soft(found.tag, "it is a div, not a section").toBe("DIV");
  expect.soft(found.parentIsMain, "a direct child of main").toBe(true);
  expect.soft(found.previousIsHeader, "main > header is before it").toBe(true);
  expect
    .soft(found.nextIsFirstSection, "the first main > section is after it")
    .toBe(true);
  expect.soft(found.ariaHidden).toBe("true");
  expect.soft(found.pointerEvents).toBe("none");
  expect
    .soft(found.pointerEventsOn, "elements inside with pointer events on")
    .toEqual([]);
  expect.soft(found.textNodes, "text nodes inside").toEqual([]);
  expect
    .soft(found.banned, "img, image, video, canvas or [tabindex] inside")
    .toEqual([]);
  expect.soft(found.focusable, "focusable elements inside").toEqual([]);
  expect.soft(found.takesFocus, "elements that took focus").toEqual([]);
  expect.soft(found.withBackground, "computed background images").toEqual([]);
});

test("C2. Footprint: 688 x 138 from 768, full-bleed below, 64 px from the header and the first section", async ({
  page,
}) => {
  for (const cw of FOOTPRINT_WIDTHS) {
    await open(page, cw);
    const g = await geometry(page);
    const where = `at ${cw}`;
    expect(g.box, `the box exists ${where}`).not.toBeNull();
    if (!(g.box && g.header && g.section)) continue;
    const want = expectedBox(g.cw);
    expect
      .soft(
        Math.abs(g.box.right - g.box.left - want.width),
        `box width ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(g.box.bottom - g.box.top - want.height),
        `box height ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(g.box.top - g.header.bottom - 64),
        `gap below the header ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(g.section.top - g.box.bottom - 64),
        `gap above the first section ${where}`,
      )
      .toBeLessThanOrEqual(1);
  }

  // Never taller than 138, at any width (the contract names these four; the rest are extra).
  for (const cw of [360, 480, 500, 700, 1920]) {
    await open(page, cw);
    const g = await geometry(page);
    if (!g.box) continue;
    expect
      .soft(g.box.bottom - g.box.top, `box height at ${cw}`)
      .toBeLessThanOrEqual(138.5);
  }

  // The hull sits centred in the box at rest: the same air above and below.
  for (const cw of FOOTPRINT_WIDTHS) {
    await open(page, cw);
    const g = await geometry(page);
    expect(g.hull, `[data-hero-hull] exists at ${cw}`).not.toBeNull();
    if (!(g.box && g.hull)) continue;
    const [above, below] = [
      g.hull.top - g.box.top,
      g.box.bottom - g.hull.bottom,
    ];
    expect
      .soft(
        Math.abs(above - below),
        `air above the hull ${above.toFixed(1)} px and below ${below.toFixed(1)} px at ${cw}`,
      )
      .toBeLessThanOrEqual(1.5);
  }

  await open(page, 320, 640);
  expect(
    await horizontalOverflow(page),
    "scrollWidth - clientWidth at 320",
  ).toBe(0);

  // At least half of the box is inside the first viewport.
  for (const [width, height] of [
    [390, 844],
    [1024, 768],
    [1440, 900],
  ] as const) {
    await open(page, width, height);
    const g = await geometry(page);
    if (!g.box) continue;
    const inside = Math.min(g.box.bottom, height) - Math.max(g.box.top, 0);
    expect
      .soft(
        inside,
        `px of the box inside the first viewport at ${width} x ${height}`,
      )
      .toBeGreaterThanOrEqual((g.box.bottom - g.box.top) / 2);
  }
});

test("C3. The hull's tips: the bow on the header's right edge, a length that never steps", async ({
  page,
}) => {
  const seen = new Map<number, { left: number; width: number }>();
  for (const cw of FOOTPRINT_WIDTHS) {
    await open(page, cw);
    const g = await geometry(page);
    const where = `at ${cw}`;
    expect(g.hull, `[data-hero-hull] exists ${where}`).not.toBeNull();
    if (!(g.hull && g.header)) continue;
    const width = g.hull.right - g.hull.left;
    seen.set(cw, { left: g.hull.left, width });
    expect
      .soft(
        Math.abs(g.hull.right - g.header.right),
        `bow vs the header's right edge ${where}`,
      )
      .toBeLessThanOrEqual(2);
    expect
      .soft(
        Math.abs(g.hull.right - expectedHullRight(g.cw)),
        `bow vs its formula ${where}`,
      )
      .toBeLessThanOrEqual(2);
    const tolerance = cw >= 768 ? 2 : 3;
    expect
      .soft(Math.abs(width - expectedHullWidth(g.cw)), `hull width ${where}`)
      .toBeLessThanOrEqual(tolerance);
    if (cw >= 768) {
      expect
        .soft(
          Math.abs(g.hull.left - g.header.left),
          `stern vs the header's left edge ${where}`,
        )
        .toBeLessThanOrEqual(2);
    }
    if (cw <= 390) {
      expect.soft(g.hull.left, `the stern is cropped ${where}`).toBeLessThan(0);
    }
  }
  const [at767, at768] = [seen.get(767), seen.get(768)];
  if (at767 && at768) {
    expect
      .soft(Math.abs(at767.left - at768.left), "hull left edge, 767 vs 768")
      .toBeLessThanOrEqual(2);
    expect
      .soft(Math.abs(at767.width - at768.width), "hull width, 767 vs 768")
      .toBeLessThanOrEqual(2);
  }
});

test("C4. Still and steady: no layout shift, the same rect without scripts, nothing animates or changes on scroll", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  for (const [width, height] of [
    [390, 844],
    [1024, 768],
    [1440, 900],
  ] as const) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    await watchLayoutShift(fresh);
    await fresh.goto("/");
    await expect(
      fresh.locator(HERO),
      `the hero is there at ${width}`,
    ).toHaveCount(1);
    await fresh.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 2000)),
    );
    const cls = await fresh.evaluate(
      () => (window as Window & { __cls?: number }).__cls,
    );
    expect.soft(cls, `layout shift over load plus 2 s at ${width}`).toBe(0);
    await fresh.close();
  }

  for (const width of [390, 1440]) {
    await open(page, width);
    const withScripts = await geometry(page);
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    });
    await context.addInitScript(refuseWebGl);
    const bare = await context.newPage();
    await bare.goto("/");
    const withoutScripts = await geometry(bare);
    await context.close();
    expect(withScripts.box, `box with scripts at ${width}`).not.toBeNull();
    expect(
      withoutScripts.box,
      `box without scripts at ${width}`,
    ).not.toBeNull();
    for (const edge of ["left", "top", "right", "bottom"] as const) {
      expect
        .soft(
          Math.abs(
            (withScripts.box?.[edge] ?? 0) - (withoutScripts.box?.[edge] ?? 0),
          ),
          `box ${edge} with vs without scripts at ${width}`,
        )
        .toBeLessThanOrEqual(0.5);
    }
  }

  // Nothing animates in the box, and scrolling past it changes nothing about it. The events catch
  // an animation or transition too short to be running when the test looks.
  await page.addInitScript(() => {
    const win = window as Window & { __heroMotion?: string[] };
    win.__heroMotion = [];
    for (const type of ["animationstart", "transitionrun", "transitionstart"]) {
      window.addEventListener(
        type,
        (event) => {
          const target = event.target as Element | null;
          if (target?.closest?.("[data-hero]")) win.__heroMotion?.push(type);
        },
        true,
      );
    }
  });
  await open(page, 1440);
  const animations = () =>
    page.evaluate((hero) => {
      const box = document.querySelector(hero);
      return box
        ? [
            ...document.getAnimations().filter((a) => {
              const target = (a.effect as KeyframeEffect | null)?.target;
              return target && (target === box || box.contains(target));
            }),
            ...box.getAnimations({ subtree: true }),
          ].length
        : -1;
    }, HERO);
  expect.soft(await animations(), "animations in the box at load").toBe(0);
  const box = page.locator(HERO);
  const snapshot = async () => ({
    html: await box.evaluate((el) => el.outerHTML),
    rect: await box.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.top + scrollY, r.width, r.height];
    }),
    pixels: (await box.screenshot()).toString("base64"),
  });
  await page.evaluate(() => scrollTo(0, 0));
  const before = await snapshot();
  const downBy = async (y: number) => {
    await page.evaluate((to) => scrollTo(0, to), y);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
  };
  for (const y of [120, 400]) {
    await downBy(y);
    expect
      .soft(await animations(), `animations in the box at scroll ${y}`)
      .toBe(0);
    const during = await snapshot();
    expect.soft(during.html, `markup at scroll ${y}`).toBe(before.html);
    expect.soft(during.rect, `rect at scroll ${y}`).toEqual(before.rect);
    expect
      .soft(during.pixels === before.pixels, `pixels at scroll ${y}`)
      .toBe(true);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await downBy(0);
  expect
    .soft(
      await page.evaluate(
        () => (window as Window & { __heroMotion?: string[] }).__heroMotion,
      ),
      "animation or transition events on the box, at load and on scroll",
    )
    .toEqual([]);
  const after = await snapshot();
  expect
    .soft(after.html, "markup after a full scroll and back")
    .toBe(before.html);
  expect
    .soft(after.pixels === before.pixels, "pixels after a full scroll and back")
    .toBe(true);
});

test("C5. LCP stays text: in main, not in the hero, no url, within 2500 ms at 4x CPU", async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(120_000);
  for (const [width, height] of [
    [390, 844],
    [1024, 768],
    [1440, 900],
  ] as const) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    const lcp = await measureLcp(fresh, "/");
    const where = `at ${width} x ${height}`;
    // Without the hero, "LCP is not in it" would be true of any page.
    await expect(
      fresh.locator(HERO),
      `the hero is in the page ${where}`,
    ).toHaveCount(1);
    expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
    if (lcp) {
      expect
        .soft(lcp.inMain, `LCP <${lcp.tag}> "${lcp.text}" is in main ${where}`)
        .toBe(true);
      expect.soft(lcp.inHero, `LCP is inside the hero ${where}`).toBe(false);
      expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
      expect.soft(lcp.time, `LCP time (ms) ${where}`).toBeLessThanOrEqual(2500);
    }
    // Report-only, not a gate: against a build of origin/main under the same throttle.
    const baseline = process.env.PLAYWRIGHT_BASELINE_URL;
    if (lcp && baseline) {
      const other = await page.context().newPage();
      await other.setViewportSize({ width, height });
      const base = await measureLcp(other, baseline);
      await other.close();
      testInfo.annotations.push({
        type: "lcp-vs-origin-main",
        description: `${where}: ${lcp.time.toFixed(0)} ms vs ${base?.time.toFixed(0)} ms (<${lcp.tag}> vs <${base?.tag}>)`,
      });
    }
    await fresh.close();
  }
});

test("C6. Weight: the box is at most 8192 bytes, and the hull is in the HTML response", async ({
  page,
  request,
}) => {
  await open(page, 1440);
  const bytes = await page.evaluate(
    (hero) =>
      new TextEncoder().encode(document.querySelector(hero)?.outerHTML ?? "")
        .length,
    HERO,
  );
  expect(bytes, "[data-hero] outerHTML in bytes").toBeGreaterThan(0);
  expect(bytes, "[data-hero] outerHTML in bytes").toBeLessThanOrEqual(8192);
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  expect(await response.text(), "the HTML response holds the hull").toContain(
    "data-hero-hull",
  );
});

/** Every painted tone in the hero in the page's current scheme, read the way the contract says. */
async function readTones(page: Page) {
  return page.evaluate(
    ({ hero, copper }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no 2d canvas");
      const read = (css: string, sentinel: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = sentinel;
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return ctx.getImageData(0, 0, 1, 1).data;
      };
      // Two different fallbacks: a color the canvas can't parse would come back as each of them.
      const resolve = (css: string) => {
        const a = read(css, "#000000");
        const b = read(css, "#ffffff");
        if (a.join() !== b.join()) throw new Error(`unparsable color ${css}`);
        const [r = 0, g = 0, bl = 0, al = 0] = a;
        return { r, g, b: bl, a: al / 255 };
      };
      const box = document.querySelector(hero);
      if (!box) return null;
      // A shape's own opacity, and every ancestor's up to the box, scale what it paints.
      const opacity = (el: Element) => {
        let o = 1;
        for (let n: Element | null = el; n; n = n.parentElement) {
          o *= Number.parseFloat(getComputedStyle(n).opacity);
          if (n === box) break;
        }
        return o;
      };
      const reference = (value: string) =>
        /url\(["']?[^#]*#([^"')]+)/.exec(value)?.[1] ?? null;
      const insideCopper = (el: Element) => Boolean(el.closest(copper));
      const shapes = [
        ...box.querySelectorAll(
          "path, line, rect, polygon, polyline, circle, ellipse",
        ),
      ].flatMap((el) => {
        const style = getComputedStyle(el);
        const out: {
          what: string;
          copper: boolean;
          tone: ReturnType<typeof resolve> | null;
          gradient: string | null;
        }[] = [];
        for (const [what, value, own] of [
          ["fill", style.fill, style.fillOpacity],
          ["stroke", style.stroke, style.strokeOpacity],
        ] as const) {
          if (value === "none") continue;
          const id = reference(value);
          if (value.startsWith("url(")) {
            out.push({
              what: `${what} of ${el.tagName}`,
              copper: insideCopper(el),
              tone: null,
              gradient: id,
            });
            continue;
          }
          const tone = resolve(value);
          tone.a *= opacity(el) * Number.parseFloat(own);
          out.push({
            what: `${what} of ${el.tagName}`,
            copper: insideCopper(el),
            tone,
            gradient: null,
          });
        }
        return out;
      });
      const stops = [...box.querySelectorAll("stop")].map((el) => {
        const style = getComputedStyle(el);
        const tone = resolve(style.stopColor);
        tone.a *= Number.parseFloat(style.stopOpacity);
        return {
          tone,
          gradient: el.parentElement?.id ?? "",
        };
      });
      return { shapes, stops };
    },
    { hero: HERO, copper: COPPER },
  );
}

const asRgb = (tone: Tone, background: Rgb): Rgb =>
  composite([tone.r, tone.g, tone.b, tone.a], background).map(
    Math.round,
  ) as Rgb;

test("C7. Quiet, in tokens, in both schemes", async ({ page }) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const where = `(${scheme})`;

    // The structure first: one hull, seven lift paths, one copper plank on the third.
    await expect(page.locator(HULL), `one hull ${where}`).toHaveCount(1);
    await expect(page.locator(LIFT), `seven lifts ${where}`).toHaveCount(7);
    await expect(page.locator(COPPER), `one copper plank ${where}`).toHaveCount(
      1,
    );
    const layout = await page.evaluate(
      ({ hull, lift, copper }) => {
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        const hullEl = document.querySelector(hull);
        const lifts = [...document.querySelectorAll(lift)];
        const plank = document.querySelector(copper);
        return {
          allPaths: lifts.every((el) => el.tagName.toLowerCase() === "path"),
          liftsInHull: lifts.every((el) => hullEl?.contains(el)),
          lifts: lifts.map(box),
          copper: plank ? box(plank) : null,
          hull: hullEl ? box(hullEl) : null,
        };
      },
      { hull: HULL, lift: LIFT, copper: COPPER },
    );
    expect.soft(layout.allPaths, `every lift is a path ${where}`).toBe(true);
    expect
      .soft(layout.liftsInHull, `every lift is in the hull ${where}`)
      .toBe(true);
    // "The third" has to mean one thing: the lifts run in DOM order up (or down) the hull.
    const centers = layout.lifts.map((r) => (r.top + r.bottom) / 2);
    const steps = centers.slice(1).map((c, i) => c - (centers[i] ?? 0));
    expect
      .soft(
        steps.every((s) => s > 0) || steps.every((s) => s < 0),
        `the lifts are stacked in DOM order, one above the next ${where}: centers ${centers.map((c) => c.toFixed(1)).join(", ")}`,
      )
      .toBe(true);
    const third = layout.lifts[2];
    if (layout.copper && third) {
      const slack = 1.5;
      expect
        .soft(
          layout.copper.left >= third.left - slack &&
            layout.copper.right <= third.right + slack &&
            layout.copper.top >= third.top - slack &&
            layout.copper.bottom <= third.bottom + slack,
          `the copper plank lies within the third lift ${where}: ${JSON.stringify(layout.copper)} vs ${JSON.stringify(third)}`,
        )
        .toBe(true);
    }
    if (layout.copper && layout.hull) {
      const share =
        (layout.copper.right - layout.copper.left) /
        (layout.hull.right - layout.hull.left);
      expect
        .soft(share, `copper width / hull width ${where}`)
        .toBeGreaterThanOrEqual(0.2);
      expect
        .soft(share, `copper width / hull width ${where}`)
        .toBeLessThanOrEqual(0.4);
    }

    // The tones.
    const colors = await resolveColors(page);
    const bg = parseColor(await resolvedBackground(page));
    const accent = colors["--accent"]?.rgba;
    expect(bg, "--background resolves").not.toBeNull();
    expect(accent, "--accent resolves").toBeDefined();
    if (!(bg && accent)) continue;
    const background: Rgb = [bg[0], bg[1], bg[2]];
    const bgLch = oklch(background);
    const accentLch = oklch([accent[0], accent[1], accent[2]]);
    const found = await readTones(page);
    expect(found, `the hero is there ${where}`).not.toBeNull();
    if (!found) continue;

    // A gradient is copper when a copper shape paints with it and no other shape does.
    const used = (copper: boolean) =>
      new Set(
        found.shapes
          .filter((s) => s.copper === copper && s.gradient)
          .map((s) => s.gradient),
      );
    const copperGradients = used(true);
    const otherGradients = used(false);
    const painted = [
      ...found.shapes.flatMap((s) =>
        s.tone ? [{ what: s.what, copper: s.copper, tone: s.tone }] : [],
      ),
      ...found.stops.map((s) => ({
        what: `stop of ${s.gradient || "(no id)"}`,
        copper:
          copperGradients.has(s.gradient) && !otherGradients.has(s.gradient),
        tone: s.tone,
      })),
    ];
    expect(painted.length, `painted tones found ${where}`).toBeGreaterThan(0);

    const copperTones: string[] = [];
    for (const { what, copper, tone } of painted) {
      const rgb = asRgb(tone, background);
      const label = `${what} rgb(${rgb.join(",")}) ${where}`;
      const isBackground = rgb.every((c, i) => c === background[i]);
      const lch = oklch(rgb);
      if (copper) {
        // A seam in --background may sit on the copper plank too; everything else there is copper.
        if (isBackground) continue;
        copperTones.push(label);
        expect
          .soft(hueDistance(lch.hue, accentLch.hue), `copper hue, ${label}`)
          .toBeLessThanOrEqual(3);
        expect
          .soft(
            Math.abs(lch.chroma - accentLch.chroma),
            `copper chroma, ${label}`,
          )
          .toBeLessThanOrEqual(0.03);
        expect
          .soft(
            Math.abs(lch.lightness - accentLch.lightness),
            `copper lightness, ${label}`,
          )
          .toBeLessThanOrEqual(0.06);
        continue;
      }
      if (isBackground) continue;
      const ratio = contrast(rgb, background);
      expect
        .soft(ratio, `contrast against --background, ${label}`)
        .toBeGreaterThanOrEqual(1.15);
      expect
        .soft(ratio, `contrast against --background, ${label}`)
        .toBeLessThanOrEqual(3.0);
      // 8-bit rounding moves the hue of a near-gray by more than the window; skip those.
      if (lch.chroma >= 0.005) {
        expect
          .soft(
            hueDistance(lch.hue, bgLch.hue),
            `hue within 10 degrees of --background, ${label}`,
          )
          .toBeLessThanOrEqual(10);
      }
    }
    expect(
      copperTones.length,
      `the copper plank has a copper tone ${where}`,
    ).toBeGreaterThan(0);
  }
});

test("C8. It degrades to the same object: scripts off, reduced motion, and gone under forced colors", async ({
  browser,
}) => {
  const variants: {
    name: string;
    options: Parameters<Browser["newContext"]>[0];
  }[] = [
    { name: "scripts off", options: { javaScriptEnabled: false } },
    { name: "reduced motion", options: { reducedMotion: "reduce" } },
    {
      name: "scripts off and reduced motion",
      options: { javaScriptEnabled: false, reducedMotion: "reduce" },
    },
  ];
  for (const variant of variants) {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        ...variant.options,
        viewport: { width, height: 900 },
      });
      await context.addInitScript(refuseWebGl);
      const page = await context.newPage();
      await page.goto("/");
      const where = `with ${variant.name} at ${width}`;
      const g = await geometry(page);
      expect(g.box, `the box is present ${where}`).not.toBeNull();
      const state = await page.evaluate((hero) => {
        const el = document.querySelector(hero);
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
        };
      }, HERO);
      expect.soft(state?.display, `display ${where}`).not.toBe("none");
      expect.soft(state?.visibility, `visibility ${where}`).toBe("visible");
      expect.soft(state?.opacity, `opacity ${where}`).toBe("1");
      await expect(page.locator(HERO), `visible ${where}`).toBeVisible();
      await expect(page.locator(HULL), `hull visible ${where}`).toBeVisible();
      if (g.box) {
        const want = expectedBox(g.cw);
        expect
          .soft(
            Math.abs(g.box.right - g.box.left - want.width),
            `width ${where}`,
          )
          .toBeLessThanOrEqual(1);
        expect
          .soft(
            Math.abs(g.box.bottom - g.box.top - want.height),
            `height ${where}`,
          )
          .toBeLessThanOrEqual(1);
      }
      await context.close();
    }
  }

  // Save-Data and a weak device change nothing in Part A, which has no upgrade.
  const weak = await browser.newContext({
    extraHTTPHeaders: { "Save-Data": "on" },
    viewport: { width: 1440, height: 900 },
  });
  await weak.addInitScript(refuseWebGl);
  await weak.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
  });
  const weakPage = await weak.newPage();
  await weakPage.goto("/");
  const weakBox = (await geometry(weakPage)).box;
  expect(weakBox, "the box with Save-Data on a weak device").not.toBeNull();
  expect
    .soft(
      Math.abs((weakBox?.right ?? 0) - (weakBox?.left ?? 0) - 688),
      "width with Save-Data",
    )
    .toBeLessThanOrEqual(1);
  await weak.close();

  // Forced colors would repaint the tones in system colors, so the box is not rendered at all.
  const forced = await browser.newContext({
    forcedColors: "active",
    viewport: { width: 1440, height: 900 },
  });
  await forced.addInitScript(refuseWebGl);
  const forcedPage = await forced.newPage();
  await forcedPage.goto("/");
  expect(
    await forcedPage.evaluate(
      () => matchMedia("(forced-colors: active)").matches,
    ),
    "forced colors are on",
  ).toBe(true);
  await expect(forcedPage.locator(HERO)).toHaveCount(1);
  expect(
    await forcedPage.evaluate((hero) => {
      const el = document.querySelector(hero);
      return el ? getComputedStyle(el).display : null;
    }, HERO),
    "display of the box under forced-colors: active",
  ).toBe("none");
  await forced.close();
});

test("C9. Hard gates: axe is clean, nothing in the box is hit or focused, no console error", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // No page error or console error on load, with and without motion.
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await open(page, 1440);
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 300)),
    );
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(problems, "errors on load").toEqual([]);

  // axe, as invariants.spec.ts runs it, with the hero on the page.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [390, 1440]) {
      await open(page, width);
      await expect(page.locator(HERO), "the hero is on the page").toHaveCount(
        1,
      );
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();
      const found = results.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        targets: v.nodes.map((node) => node.target.join(" ")),
      }));
      expect.soft(found, `axe violations (${scheme}, ${width} px)`).toEqual([]);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // A 3 x 3 grid inside the box: nothing of the hero, nothing interactive.
  for (const width of [390, 1440]) {
    await open(page, width);
    await page
      .locator(HERO)
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    const hits = await page.evaluate(
      ({ hero, interactive }) => {
        const box = document.querySelector(hero);
        if (!box) return null;
        const r = box.getBoundingClientRect();
        const out: {
          point: string;
          inHero: string[];
          interactive: string[];
          other: string[];
        }[] = [];
        for (const fy of [1 / 6, 1 / 2, 5 / 6]) {
          for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
            const x = r.left + r.width * fx;
            const y = r.top + r.height * fy;
            const stack = document
              .elementsFromPoint(x, y)
              .filter(
                (el) =>
                  el !== document.documentElement &&
                  el !== document.body &&
                  el.tagName !== "MAIN",
              );
            out.push({
              point: `${Math.round(x)},${Math.round(y)}`,
              inHero: stack
                .filter((el) => box === el || box.contains(el))
                .map((el) => el.tagName.toLowerCase()),
              interactive: stack
                .filter((el) => el.matches(interactive))
                .map((el) => el.tagName.toLowerCase()),
              other: stack.map((el) => el.tagName.toLowerCase()),
            });
          }
        }
        return {
          onScreen: r.top >= 0 && r.bottom <= innerHeight,
          points: out,
        };
      },
      {
        hero: HERO,
        interactive:
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      },
    );
    expect(hits, `the hero is there at ${width}`).not.toBeNull();
    expect(
      hits?.onScreen,
      `the box is on screen to be hit-tested at ${width}`,
    ).toBe(true);
    for (const point of hits?.points ?? []) {
      expect
        .soft(point.inHero, `hero elements hit at ${point.point}, ${width} px`)
        .toEqual([]);
      expect
        .soft(
          point.interactive,
          `interactive elements at ${point.point}, ${width} px`,
        )
        .toEqual([]);
    }
  }

  // No Tab stop lands in the box: walk the whole page's stops.
  await open(page, 1440);
  const stops: boolean[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(
        (hero) => Boolean(document.activeElement?.closest(hero)),
        HERO,
      ),
    );
  }
  expect(stops.includes(true), "a Tab stop inside the hero").toBe(false);
});
