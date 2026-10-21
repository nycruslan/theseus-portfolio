import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  expect,
  type Page,
  type TestInfo,
  test,
} from "@playwright/test";
import { profile } from "../content/profile";
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
import { readPlanks } from "./hull";
import { refuseWebGl } from "./webgl";

// Sprint 8, Part A of sprint 7's contract (.studio/sprint/7/contract.md, C1 to C9): the hero is a
// static inline SVG hull, placed in the page's header. One test per check, named by its number.
// Sprint 16 (B1, the redesign's hero; .studio/sprint/15/contract.md, "B1 checks") rewrote C1 to C3,
// C7 and C8 for the new hull of 22 planks, cropped at the stern, inside `main > header`: C1 is B1.8,
// C2 and C3 are B1.6 and B1.7, C4 and C5 are B1.9, C7 is B1.4's tones. Hooks: [data-hero] (the box),
// [data-hero-hull] (the hull), [data-hero-plank] (22 shapes) with [data-sprint] on the replaced ones
// and [data-hero-copper] on the newest. What each assertion kept, moved or retired, and why:
// .studio/sprint/16/specs-probe.md.

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
const PLANK = "[data-hero-plank]";
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

// The widths C3 names: 320 and 390, 600 and 767 (a 6-column grid, a 1-column one), 768, 1024 (the
// first 12-column width) and 1440; 1920 is read for the cap only.
const FOOTPRINT_WIDTHS = [320, 390, 600, 767, 768, 1024, 1440] as const;

/** The page margin, from the viewport's width: `clamp(20px, 3.4vw, 48px)` (dir section 2). */
const pageMargin = (vw: number) => Math.min(48, Math.max(20, 0.034 * vw));

/**
 * The hull's length, `min((cw - margin) x 1.048, 1460)` (B1.6): the `svg`'s width. Its viewBox keeps
 * a few units of air round the hull, so the bow tip sits a little inside the svg's right edge, as
 * the prototype draws it (.studio/sprint/15/prototype/index.html, `.hull-hero`).
 */
const expectedHullLength = (cw: number, vw = cw) =>
  Math.min((cw - pageMargin(vw)) * 1.048, 1460);

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
    ({ hero, hull, bioText }) => {
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
      const bio = [...document.querySelectorAll("main > header p")].find(
        (p) => p.textContent?.trim() === bioText,
      );
      return {
        cw: document.documentElement.clientWidth,
        vw: innerWidth,
        box: rect(document.querySelector(hero)),
        // The hull's own box: the svg, its viewBox included.
        svg: rect(document.querySelector(`${hero} svg`)),
        hull: rect(document.querySelector(hull)),
        header: rect(document.querySelector("main > header")),
        band: rect(document.querySelector("main > header [data-hero-band]")),
        bio: rect(bio ?? null),
        bioLine: bio ? Number.parseFloat(getComputedStyle(bio).lineHeight) : 0,
        h1: rect(document.querySelector("main > header h1")),
        cells: [
          ...document.querySelectorAll("main > header [data-hero-cell]"),
        ].map((cell) => rect(cell)),
        section: rect(document.querySelector("main > section")),
      };
    },
    { hero: HERO, hull: HULL, bioText: profile.bio },
  );
}

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
  inHeader: boolean;
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
          inHeader: Boolean(el?.closest("main > header")),
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

test("C1. Place and role: one aria-hidden, inert div inside main > header after the band, with the first section after the header", async ({
  page,
}) => {
  await open(page, 1440);
  await expect(page.locator(HERO), "exactly one [data-hero]").toHaveCount(1);
  const found = await page.evaluate(
    ({ hero, focusables }) => {
      const box = document.querySelector(hero);
      if (!box) return null;
      const header = document.querySelector("main > header");
      const band = header?.querySelector("[data-hero-band]") ?? null;
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
        inHeader: header?.contains(box) === true,
        // The band comes first in the document, then the hull (B1.8).
        afterBand:
          band !== null &&
          Boolean(
            band.compareDocumentPosition(box) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        nextIsFirstSection:
          header?.nextElementSibling ===
            document.querySelector("main > section") &&
          Boolean(header?.nextElementSibling?.matches("main > section")),
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
  expect.soft(found.inHeader, "inside main > header").toBe(true);
  expect
    .soft(found.afterBand, "after [data-hero-band] in the document")
    .toBe(true);
  expect
    .soft(
      found.nextIsFirstSection,
      "the first main > section follows the header",
    )
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

test("C2. Reach and order: nothing overflows, half the box is on the first screen, and the page reads in B1.7's order", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [1440, 900],
  ] as const) {
    await open(page, width, height);
    expect(
      await horizontalOverflow(page),
      `scrollWidth - clientWidth at ${width}`,
    ).toBe(0);
  }

  // At least half of the box is inside the first viewport.
  for (const [width, height] of [
    [390, 844],
    [1024, 768],
    [1440, 900],
  ] as const) {
    await open(page, width, height);
    const g = await geometry(page);
    expect(g.box, `the box exists at ${width}`).not.toBeNull();
    if (!g.box) continue;
    const inside = Math.min(g.box.bottom, height) - Math.max(g.box.top, 0);
    expect
      .soft(
        inside,
        `px of the box inside the first viewport at ${width} x ${height}`,
      )
      .toBeGreaterThanOrEqual((g.box.bottom - g.box.top) / 2);
  }

  // On a phone the hull comes before the bio, and the bio still starts on the first screen.
  await open(page, 390, 844);
  const phone = await geometry(page);
  expect(phone.box && phone.bio, "the box and the bio at 390").toBeTruthy();
  if (phone.box && phone.bio) {
    expect
      .soft(
        phone.box.top,
        `the hull's top ${phone.box.top} against the bio's top ${phone.bio.top} at 390`,
      )
      .toBeLessThan(phone.bio.top);
    expect.soft(phone.bio.top, "the bio's top at 390 x 844").toBeLessThan(844);
  }

  // From 1024 the bio starts in column 7 of the 12 and ends above the hull.
  for (const [width, height] of [
    [1024, 768],
    [1440, 900],
  ] as const) {
    await open(page, width, height);
    const g = await geometry(page);
    expect(g.box && g.bio, `the box and the bio at ${width}`).toBeTruthy();
    if (!(g.box && g.bio)) continue;
    const margin = pageMargin(g.vw);
    const gutter = Math.min(24, Math.max(16, 0.017 * g.vw));
    const column = (g.cw - 2 * margin - 11 * gutter) / 12;
    expect
      .soft(
        Math.abs(g.bio.left - (margin + 6 * (column + gutter))),
        `the bio's left edge ${g.bio.left} against column 7 at ${width}`,
      )
      .toBeLessThanOrEqual(2);
    expect
      .soft(
        g.bio.bottom,
        `the bio's bottom against the hull's top ${g.box.top} at ${width}`,
      )
      .toBeLessThanOrEqual(g.box.top + 1);
  }

  // At 1440 x 900 the name, the headline and the start of the bio are all on the first screen.
  await open(page, 1440, 900);
  const wide = await geometry(page);
  expect(
    wide.h1 && wide.bio && wide.cells[0],
    "name, headline, bio",
  ).toBeTruthy();
  if (wide.h1 && wide.bio && wide.cells[0]) {
    expect
      .soft(wide.h1.bottom, "the name's bottom at 1440 x 900")
      .toBeLessThanOrEqual(900);
    expect
      .soft(wide.cells[0].bottom, "the headline cell's bottom at 1440 x 900")
      .toBeLessThanOrEqual(900);
    expect
      .soft(
        wide.bio.top + wide.bioLine,
        "the bio's first line ends at 1440 x 900",
      )
      .toBeLessThanOrEqual(900);
  }
});

test("C3. The hull's tips: the bow on the content edge, a length that never steps, the stern cropped, 1460 at most", async ({
  page,
}) => {
  const seen = new Map<number, { left: number; width: number }>();
  for (const cw of [...FOOTPRINT_WIDTHS, 1920]) {
    await open(page, cw);
    const g = await geometry(page);
    const where = `at ${cw}`;
    expect(g.svg, `the hull's svg exists ${where}`).not.toBeNull();
    expect(g.band, `[data-hero-band] exists ${where}`).not.toBeNull();
    if (!(g.svg && g.band)) continue;
    const width = g.svg.right - g.svg.left;
    seen.set(cw, { left: g.svg.left, width });
    // The band is the header's content, so its right edge is the header's right content edge.
    expect
      .soft(
        Math.abs(g.svg.right - g.band.right),
        `bow vs the header's right content edge ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(g.band.right - (g.cw - pageMargin(g.vw))),
        `the content edge against clientWidth less the margin ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(width - expectedHullLength(g.cw, g.vw)),
        `hull length ${width} against min((cw - margin) x 1.048, 1460) ${where}`,
      )
      .toBeLessThanOrEqual(3);
    // The stern is cropped by the viewport where the formula puts it there: 320 and 390 (kept from
    // the old C3), 1024 and 1440 (above about 1441 the 1460 cap shows the whole hull; owner
    // decision 11).
    if ([320, 390, 1024, 1440].includes(cw)) {
      expect.soft(g.svg.left, `the stern is cropped ${where}`).toBeLessThan(0);
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

test("C5. LCP stays text: the name or the bio, in the header, not in the hero, no url, within 2500 ms at 4x CPU", async ({
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
      // B1.9: the h1 or the bio's p, in the header, never the hull.
      expect
        .soft(lcp.inHeader, `LCP <${lcp.tag}> is in main > header ${where}`)
        .toBe(true);
      expect
        .soft(
          ["h1", "p"],
          `LCP <${lcp.tag}> is the name or a paragraph ${where}`,
        )
        .toContain(lcp.tag);
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

test("C7. Quiet, in tokens, in both schemes: the newest plank is copper, every other plank is a quiet tone of the hull", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const where = `(${scheme})`;

    // The structure first: one hull, 22 planks, one copper plank among them.
    await expect(page.locator(HULL), `one hull ${where}`).toHaveCount(1);
    await expect(page.locator(PLANK), `22 planks ${where}`).toHaveCount(22);
    await expect(page.locator(COPPER), `one copper plank ${where}`).toHaveCount(
      1,
    );
    expect(
      await page
        .locator(COPPER)
        .evaluate((el) => el.matches("[data-hero-plank]")),
      `the copper one is a plank ${where}`,
    ).toBe(true);

    // The tones. A plank's tone is its own fill; any shading is a separate shape over it (the
    // prototype's multiply layer), which paints the plank darker than its tone in dark mode by
    // more than copper's lightness window, so the fill is what is read, as the old checks did.
    const colors = await resolveColors(page);
    const bg = parseColor(await resolvedBackground(page));
    const accent = colors["--accent"]?.rgba;
    expect(bg, "--background resolves").not.toBeNull();
    expect(accent, "--accent resolves").toBeDefined();
    if (!(bg && accent)) continue;
    const background: Rgb = [bg[0], bg[1], bg[2]];
    const accentLch = oklch([accent[0], accent[1], accent[2]]);
    const planks = await readPlanks(page, { step: 8 });
    expect(planks.length, `planks read ${where}`).toBe(22);

    let copperTones = 0;
    for (const plank of planks) {
      const label = `plank ${plank.index} (sprint ${plank.sprint ?? "none"}) fill ${plank.fill} ${where}`;
      expect(plank.tone, `a plain colour for ${label}`).not.toBeNull();
      if (!plank.tone) continue;
      const rgb = composite(plank.tone, background).map(Math.round) as Rgb;
      if (plank.copper) {
        copperTones++;
        const lch = oklch(rgb);
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
      // Present against the ground, never invisible (the ceiling is B1.4's 1.5 x rule).
      expect
        .soft(
          contrast(rgb, background),
          `contrast against --background, ${label}`,
        )
        .toBeGreaterThanOrEqual(1.15);
    }
    expect(copperTones, `the copper plank has a copper tone ${where}`).toBe(1);
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
      // The same hull at the same length as with every script and effect on (B1.6's formula), in a
      // box that holds it. The old box's own size formula went with the old box.
      expect(g.svg, `the hull's svg is present ${where}`).not.toBeNull();
      if (g.box && g.svg) {
        expect
          .soft(
            Math.abs(g.svg.right - g.svg.left - expectedHullLength(g.cw, g.vw)),
            `hull length ${where}`,
          )
          .toBeLessThanOrEqual(3);
        expect
          .soft(
            g.box.top <= g.svg.top + 1 && g.box.bottom >= g.svg.bottom - 1,
            `the box holds the hull ${where}`,
          )
          .toBe(true);
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
  const weakGeometry = await geometry(weakPage);
  const weakSvg = weakGeometry.svg;
  expect(weakSvg, "the hull with Save-Data on a weak device").not.toBeNull();
  expect
    .soft(
      Math.abs(
        (weakSvg?.right ?? 0) -
          (weakSvg?.left ?? 0) -
          expectedHullLength(weakGeometry.cw, weakGeometry.vw),
      ),
      "hull length with Save-Data",
    )
    .toBeLessThanOrEqual(3);
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
