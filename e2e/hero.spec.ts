import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import {
  composite,
  contrast,
  horizontalOverflow,
  type Rgb,
  resolveColors,
  SCHEMES,
} from "./helpers";

// The hero, Part A: a static inline-SVG lift half-model right after the header. The checks are
// C1 to C9 of .studio/sprint/7/contract.md ("Part A"), one test per check, named by number, with
// the sprint 9 contract's settlements of Lens's nits (.studio/sprint/9/contract.md). Part B (the
// WebGL upgrade, C10 to C16) is a draft and has no test here.
//
// The hooks are attributes, so a redraw of the model can't break a check by moving a class:
//   [data-hero]        the box: a div, child of <main>, between the header and the first section
//   [data-hero-hull]   the group of all lifts
//   [data-hero-lift]   each of the seven lift paths, counted in DOM order, first to seventh (the
//                      hull group's source comment says whether the first is the keel or the sheer)
//   [data-hero-copper] the one copper plank, on the third lift
// Every test first requires the box, so a page without a hero fails for that and not for a vacuous
// pass of the rest.

const HERO = "[data-hero]";

const WIDTHS = [320, 390, 600, 767, 768, 1024, 1440] as const;
/** The height of the first viewport at each width, as the contract's own sizes pair them. */
function heightAt(width: number) {
  if (width === 320) return 640;
  if (width === 390) return 844;
  if (width === 768) return 1024;
  if (width === 1024) return 768;
  return 900;
}

// WCAG 2.2 A and AA, and axe's best practices, as invariants.spec.ts runs them.
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The box's size at a viewport: 688 x 172 from 768 up, else the full width at 2.9:1, at most 172. */
function boxSize(clientWidth: number) {
  return clientWidth >= 768
    ? { width: 688, height: 172 }
    : { width: clientWidth, height: Math.min(clientWidth / 2.9, 172) };
}

/** The hull's right edge and width at a viewport (C3), and how far a width may be off. */
function hullTarget(cw: number) {
  const right = cw < 672 ? cw - 24 : (cw + 624) / 2;
  if (cw <= 390) return { right, width: 1.12 * cw, tolerance: 3 };
  // Linear from 437 at 390 to 624 at 768, so the bow never jumps.
  if (cw < 768) {
    return {
      right,
      width: 437 + ((cw - 390) * (624 - 437)) / (768 - 390),
      tolerance: 3,
    };
  }
  return { right, width: 624, tolerance: 2 };
}

async function openAt(page: Page, width: number, height = heightAt(width)) {
  await page.setViewportSize({ width, height });
  await page.goto("/");
  await requireHero(page);
}

async function requireHero(page: Page) {
  await expect(
    page.locator(HERO),
    "exactly one [data-hero] is on the page",
  ).toHaveCount(1);
}

function within(
  actual: number,
  expected: number,
  tolerance: number,
  label: string,
) {
  expect
    .soft(actual, `${label}: ${actual} vs ${expected} +-${tolerance}`)
    .toBeGreaterThanOrEqual(expected - tolerance);
  expect
    .soft(actual, `${label}: ${actual} vs ${expected} +-${tolerance}`)
    .toBeLessThanOrEqual(expected + tolerance);
}

type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

/** Layout geometry in viewport px; a section's reveal `translate` is taken out, as it isn't layout. */
async function layout(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null, unrise = false): Box | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      let dy = 0;
      if (unrise) {
        const style = getComputedStyle(el);
        const t = style.translate.split(" ")[1];
        if (t?.endsWith("px")) dy += Number.parseFloat(t);
        if (style.transform !== "none") dy += new DOMMatrix(style.transform).f;
      }
      return {
        left: r.left,
        top: r.top - dy,
        right: r.right,
        bottom: r.bottom - dy,
        width: r.width,
        height: r.height,
      };
    };
    return {
      clientWidth: document.documentElement.clientWidth,
      hero: box(document.querySelector("[data-hero]")),
      hull: box(document.querySelector("[data-hero-hull]")),
      header: box(document.querySelector("main > header")),
      section: box(document.querySelector("main > section"), true),
      viewportHeight: window.innerHeight,
    };
  });
}

/**
 * Waits a fixed time in the page. Some checks are about a duration ("load plus 2 s"), which no
 * event stands for.
 */
function pause(page: Page, ms: number) {
  return page.evaluate(
    (wait) => new Promise<void>((resolve) => setTimeout(resolve, wait)),
    ms,
  );
}

/** The page has loaded and its fonts are in, so nothing is left to paint late. */
async function settled(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
}

function need<T>(value: T | null | undefined, what: string): T {
  expect(value, `${what} is measurable`).not.toBeNull();
  return value as T;
}

test.describe("hero, Part A", () => {
  test("C1", async ({ page }) => {
    // C1. Place and role.
    for (const width of [1440, 390]) {
      await openAt(page, width);
      const where = `at ${width} px`;
      const facts = await page.evaluate(() => {
        const heroes = document.querySelectorAll("[data-hero]");
        const hero = heroes[0] as HTMLElement;
        const main = document.querySelector("main");
        const header = document.querySelector("main > header");
        const firstSection = document.querySelector("main > section");
        const all = [hero, ...hero.querySelectorAll("*")];
        const texts: string[] = [];
        const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if ((n.textContent ?? "").trim() !== "")
            texts.push(n.textContent ?? "");
        }
        const focusable = all
          .filter(
            (el) =>
              el.matches(
                "a, button, input, select, textarea, summary, iframe, area, [contenteditable], [tabindex], [focusable]",
              ) || ((el as HTMLElement | SVGElement).tabIndex ?? -1) >= 0,
          )
          .map((el) => el.outerHTML.slice(0, 60));
        return {
          count: heroes.length,
          tag: hero.tagName,
          directChildOfMain: hero.parentElement === main,
          previousIsHeader:
            hero.previousElementSibling === header && header !== null,
          nextIsFirstSection:
            hero.nextElementSibling === firstSection && firstSection !== null,
          ariaHidden: hero.getAttribute("aria-hidden"),
          pointerEvents: getComputedStyle(hero).pointerEvents,
          texts,
          forbidden: [
            ...hero.querySelectorAll(
              "img, image, video, canvas, [tabindex], title, text, foreignObject",
            ),
          ]
            .concat(
              hero.matches("img, image, video, canvas, [tabindex]")
                ? [hero]
                : [],
            )
            .map((el) => el.tagName),
          focusable,
          backgrounds: all
            .filter((el) => getComputedStyle(el).backgroundImage !== "none")
            .map((el) => el.tagName),
        };
      });
      expect.soft(facts.count, `one hero ${where}`).toBe(1);
      expect.soft(facts.tag, `a div ${where}`).toBe("DIV");
      expect
        .soft(facts.directChildOfMain, `a direct child of main ${where}`)
        .toBe(true);
      expect
        .soft(
          facts.previousIsHeader,
          `main > header is the previous sibling ${where}`,
        )
        .toBe(true);
      expect
        .soft(
          facts.nextIsFirstSection,
          `the first main > section is the next sibling ${where}`,
        )
        .toBe(true);
      expect.soft(facts.ariaHidden, `aria-hidden ${where}`).toBe("true");
      expect.soft(facts.pointerEvents, `pointer-events ${where}`).toBe("none");
      expect.soft(facts.texts, `no text node ${where}`).toEqual([]);
      expect
        .soft(
          facts.forbidden,
          `no img, image, video, canvas or [tabindex] ${where}`,
        )
        .toEqual([]);
      expect.soft(facts.focusable, `nothing focusable ${where}`).toEqual([]);
      expect
        .soft(facts.backgrounds, `no background image ${where}`)
        .toEqual([]);
    }
  });

  test("C2", async ({ page }) => {
    // C2. Footprint.
    for (const width of WIDTHS) {
      await openAt(page, width);
      const g = await layout(page);
      const where = `at ${width} px`;
      const hero = need(g.hero, "hero");
      const header = need(g.header, "header");
      const section = need(g.section, "first section");
      const expected = boxSize(g.clientWidth);
      within(hero.width, expected.width, 1, `box width ${where}`);
      within(hero.height, expected.height, 1, `box height ${where}`);
      expect
        .soft(hero.height, `never taller than 172 ${where}`)
        .toBeLessThanOrEqual(172.5);
      within(hero.top - header.bottom, 64, 1, `gap from header ${where}`);
      within(
        section.top - hero.bottom,
        64,
        1,
        `gap to the first section ${where}`,
      );
      if (width === 320) {
        expect
          .soft(
            await horizontalOverflow(page),
            "scrollWidth equals clientWidth at 320",
          )
          .toBe(0);
      }
      // The first viewport, from the page's top, shows at least half of the box.
      if ([390, 1024, 1440].includes(width)) {
        const shown =
          Math.min(hero.bottom, g.viewportHeight) - Math.max(hero.top, 0);
        expect
          .soft(
            shown,
            `at least half the box is in the first viewport ${where}`,
          )
          .toBeGreaterThanOrEqual(hero.height / 2);
      }
    }
    // The contract's own sizes, so the formula above can't drift from its table.
    expect.soft(boxSize(320).height).toBeCloseTo(110, 0);
    expect.soft(boxSize(390).height).toBeCloseTo(134, 0);
  });

  test("C3", async ({ page }) => {
    // C3. The hull's tips.
    const seen: Record<number, { left: number; width: number }> = {};
    for (const width of WIDTHS) {
      await openAt(page, width);
      const g = await layout(page);
      const where = `at ${width} px`;
      const hull = need(g.hull, "hull");
      const header = need(g.header, "header");
      const target = hullTarget(g.clientWidth);
      within(header.right, target.right, 1, `header's right edge ${where}`);
      within(
        hull.right,
        header.right,
        2,
        `bow tip on the header's right edge ${where}`,
      );
      within(
        hull.width,
        target.width,
        target.tolerance,
        `hull length ${where}`,
      );
      if (width >= 768) {
        within(
          hull.left,
          header.left,
          2,
          `stern on the header's left edge ${where}`,
        );
      }
      if (width <= 390) {
        expect
          .soft(hull.left, `stern cropped (left edge negative) ${where}`)
          .toBeLessThan(0);
      }
      seen[width] = { left: hull.left, width: hull.width };
    }
    // Between 390 and 768 the hull grows steadily: no step across the breakpoint.
    const a = seen[767];
    const b = seen[768];
    if (a && b) {
      within(a.left, b.left, 2, "hull left edge, 767 vs 768");
      within(a.width, b.width, 2, "hull width, 767 vs 768");
    }
  });

  test("C4", async ({ page, browser, baseURL }) => {
    // C4. Still and steady.
    test.setTimeout(60_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) w.__cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (const width of [390, 1024, 1440]) {
      await openAt(page, width);
      await page.waitForLoadState("load");
      await pause(page, 2000);
      const cls = await page.evaluate(
        () => (window as unknown as { __cls: number }).__cls,
      );
      expect.soft(cls, `CLS across load plus 2 s at ${width} px`).toBe(0);

      // Scripts on and off: the same box.
      const on = need((await layout(page)).hero, "hero with scripts");
      const noScript = await browser.newContext({
        baseURL,
        javaScriptEnabled: false,
        viewport: { width, height: heightAt(width) },
      });
      try {
        const bare = await noScript.newPage();
        await bare.goto("/");
        await requireHero(bare);
        const off = need((await layout(bare)).hero, "hero without scripts");
        for (const key of ["left", "top", "width", "height"] as const) {
          within(
            off[key],
            on[key],
            0.5,
            `box ${key} with scripts off, ${width} px`,
          );
        }
      } finally {
        await noScript.close();
      }
    }

    // No animation, transition included, on the box or inside it, and a scroll changes nothing.
    await openAt(page, 1440);
    const snapshot = () =>
      page.evaluate(() => {
        const hero = document.querySelector("[data-hero]") as HTMLElement;
        const rect = hero.getBoundingClientRect();
        const styles = [hero, ...hero.querySelectorAll("*")].map((el) => {
          const s = getComputedStyle(el);
          return [
            s.fill,
            s.stroke,
            s.opacity,
            s.transform,
            s.display,
            s.visibility,
          ].join("|");
        });
        return {
          animations: hero.getAnimations({ subtree: true }).length,
          html: hero.outerHTML,
          styles,
          // Page position, so scrolling itself doesn't count as a change.
          pageLeft: rect.left + window.scrollX,
          pageTop: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      });
    const rest = await snapshot();
    expect
      .soft(rest.animations, "no animation on or in the box at rest")
      .toBe(0);
    for (const fraction of [0.5, 1]) {
      await page.evaluate((f) => {
        window.scrollTo(
          0,
          (document.documentElement.scrollHeight - window.innerHeight) * f,
        );
      }, fraction);
      await pause(page, 300);
      const scrolled = await snapshot();
      expect
        .soft(scrolled.animations, `no animation after a scroll to ${fraction}`)
        .toBe(0);
      expect
        .soft(scrolled.html, `markup unchanged after a scroll to ${fraction}`)
        .toBe(rest.html);
      expect
        .soft(scrolled.styles, `paint unchanged after a scroll to ${fraction}`)
        .toEqual(rest.styles);
      within(
        scrolled.pageTop,
        rest.pageTop,
        0.5,
        "page position after a scroll",
      );
      within(
        scrolled.pageLeft,
        rest.pageLeft,
        0.5,
        "page position after a scroll",
      );
      within(scrolled.height, rest.height, 0.5, "box height after a scroll");
    }
  });

  test("C5", async ({ page }, testInfo) => {
    // C5. LCP stays text, with the CPU throttled 4x. The LCP assertions come first and the hero's
    // presence last, so the same check run on a build without a hero shows the throttle's own
    // result (Probe's baseline for the report) and a red is the hero's.
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: unknown };
      w.__lcp = null;
      new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1) as
          | (PerformanceEntry & {
              element: Element | null;
              url: string;
              size: number;
            })
          | undefined;
        if (!entry) return;
        const el = entry.element;
        w.__lcp = {
          time: entry.startTime,
          url: entry.url,
          size: entry.size,
          tag: el ? el.tagName.toLowerCase() : null,
          text: (el?.textContent ?? "").trim().slice(0, 30),
          inMain: Boolean(el?.closest("main")),
          inHero: Boolean(el?.closest("[data-hero]")),
        };
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const times: string[] = [];
    for (const [width, height] of [
      [390, 844],
      [1024, 768],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.waitForFunction(
        () => (window as unknown as { __lcp: unknown }).__lcp !== null,
      );
      await settled(page);
      await pause(page, 800);
      const lcp = await page.evaluate(
        () =>
          (
            window as unknown as {
              __lcp: {
                time: number;
                url: string;
                size: number;
                tag: string | null;
                text: string;
                inMain: boolean;
                inHero: boolean;
              };
            }
          ).__lcp,
      );
      const where = `at ${width} px`;
      times.push(
        `${width}: ${Math.round(lcp.time)} ms <${lcp.tag}> "${lcp.text}"`,
      );
      expect.soft(lcp.tag, `the LCP element exists ${where}`).not.toBeNull();
      expect.soft(lcp.inMain, `the LCP element is in main ${where}`).toBe(true);
      expect
        .soft(lcp.inHero, `the LCP element is not in the hero ${where}`)
        .toBe(false);
      expect.soft(lcp.url, `the LCP entry has no url ${where}`).toBe("");
      expect.soft(lcp.time, `LCP time ${where}`).toBeLessThanOrEqual(2500);
      await expect
        .soft(page.locator(HERO), `exactly one [data-hero] ${where}`)
        .toHaveCount(1);
    }
    testInfo.annotations.push({
      type: "lcp-4x",
      description: times.join("; "),
    });
    console.log(`LCP at 4x CPU throttle: ${times.join("; ")}`);
  });

  test("C6", async ({ page, request }) => {
    // C6. Weight. First-load JS equal to origin/main's can't be read from a browser against a
    // single build: Pixel shows `next build`'s figure, or the `/` page's JS chunk bytes in .next on
    // both builds, and says which. What a test can pin: the box is small, it is in the HTML
    // response, and no client script carries it (a client component would put its markup in a JS
    // chunk).
    const scripts: { url: string; body: string }[] = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() === "script") {
        scripts.push({
          url: response.url(),
          body: await response.text().catch(() => ""),
        });
      }
    });
    await openAt(page, 1440);
    await settled(page);
    const bytes = await page.evaluate(
      () =>
        new TextEncoder().encode(
          (document.querySelector("[data-hero]") as Element).outerHTML,
        ).length,
    );
    expect
      .soft(bytes, "the box's outerHTML, in bytes")
      .toBeLessThanOrEqual(8192);

    const response = await request.get("/");
    expect.soft(response.ok(), "GET / answers").toBe(true);
    const html = await response.text();
    expect
      .soft(html, "the hull is in the HTML response itself")
      .toContain("data-hero-hull");

    expect
      .soft(scripts.length, "the page loaded scripts to look through")
      .toBeGreaterThan(0);
    const carriers = scripts
      .filter((s) => s.body.includes("data-hero"))
      .map((s) => s.url);
    expect
      .soft(carriers, "no script chunk carries the hero's markup")
      .toEqual([]);
  });

  test("C7", async ({ page }) => {
    // C7. Quiet, in tokens, in both schemes.
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openAt(page, 1440);
      const where = `(${scheme})`;
      const token = await resolveColors(page);
      const bgRgba = token["--background"]?.rgba ?? [0, 0, 0, 1];
      const bg: Rgb = [bgRgba[0], bgRgba[1], bgRgba[2]];
      const accentRgba = token["--accent"]?.rgba ?? [0, 0, 0, 1];
      const accent: Rgb = [accentRgba[0], accentRgba[1], accentRgba[2]];

      const read = await page.evaluate(() => {
        const hero = document.querySelector("[data-hero]") as Element;
        const copper = hero.querySelector("[data-hero-copper]");
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d canvas");
        const resolve = (value: string, opacity: number) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "#000";
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(
            0,
            0,
            1,
            1,
          ).data;
          return [r, g, b, (a / 255) * opacity] as [
            number,
            number,
            number,
            number,
          ];
        };
        type Tone = { what: string; rgba: [number, number, number, number] };
        const copperTones: Tone[] = [];
        const otherTones: Tone[] = [];
        const copperStops = new Set<Element>();
        const stopsOf = (gradient: Element | null): Element[] => {
          const seen = new Set<Element>();
          let current = gradient;
          const out: Element[] = [];
          while (current && !seen.has(current)) {
            seen.add(current);
            const own = [...current.children].filter(
              (c) => c.tagName.toLowerCase() === "stop",
            );
            if (own.length > 0) return own;
            const href =
              current.getAttribute("href") ??
              current.getAttribute("xlink:href");
            current = href?.startsWith("#")
              ? hero.ownerDocument.getElementById(href.slice(1))
              : null;
          }
          return out;
        };
        const shapes = hero.querySelectorAll(
          "path, line, rect, polygon, polyline, circle, ellipse",
        );
        for (const shape of shapes) {
          const inCopper =
            copper !== null && (copper === shape || copper.contains(shape));
          const style = getComputedStyle(shape);
          const tag = shape.tagName.toLowerCase();
          for (const prop of ["fill", "stroke"] as const) {
            // A line has no area to fill, and an unstroked or 0-wide stroke paints nothing.
            if (prop === "fill" && tag === "line") continue;
            if (prop === "stroke" && Number.parseFloat(style.strokeWidth) === 0)
              continue;
            const value = style[prop];
            if (value === "none" || value === "") continue;
            if (value.startsWith("url(")) {
              const id = value.match(/#([^")\s]+)/)?.[1];
              const gradient = id
                ? hero.ownerDocument.getElementById(id)
                : null;
              if (inCopper)
                for (const stop of stopsOf(gradient)) copperStops.add(stop);
              continue;
            }
            const opacity =
              Number.parseFloat(style.opacity) *
              Number.parseFloat(
                prop === "fill" ? style.fillOpacity : style.strokeOpacity,
              );
            (inCopper ? copperTones : otherTones).push({
              what: `${tag}${shape.hasAttribute("data-hero-lift") ? "[lift]" : ""} ${prop}`,
              rgba: resolve(value, opacity),
            });
          }
        }
        // Every stop-color, wherever its gradient is used: the copper plank's gradient is held to
        // the copper window, all the others to the quiet one.
        for (const stop of hero.querySelectorAll("stop")) {
          const style = getComputedStyle(stop);
          const tone = {
            what: `stop ${stop.getAttribute("offset") ?? ""}`,
            rgba: resolve(
              style.stopColor,
              Number.parseFloat(style.stopOpacity),
            ),
          };
          (copperStops.has(stop) ? copperTones : otherTones).push(tone);
        }
        const hull = hero
          .querySelector("[data-hero-hull]")
          ?.getBoundingClientRect();
        const copperRect = copper?.getBoundingClientRect();
        const lifts = [...hero.querySelectorAll("[data-hero-lift]")];
        const centre = (el: Element) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        return {
          copperCount: hero.querySelectorAll("[data-hero-copper]").length,
          liftCount: lifts.length,
          liftTags: lifts.map((l) => l.tagName.toLowerCase()),
          copperTones,
          otherTones,
          hullWidth: hull?.width ?? 0,
          copperWidth: copperRect?.width ?? 0,
          // The copper plank is, or is inside, the third lift in DOM order; a separate overlay
          // path counts when its centre is nearest the third lift's.
          copperOnThird:
            copper !== null &&
            lifts[2] !== undefined &&
            (lifts[2] === copper ||
              lifts[2].contains(copper) ||
              lifts.every(
                (l, i) =>
                  i === 2 ||
                  Math.abs(centre(copper) - centre(lifts[2] as Element)) <
                    Math.abs(centre(copper) - centre(l)),
              )),
        };
      });

      expect
        .soft(read.copperCount, `exactly one copper plank ${where}`)
        .toBe(1);
      expect.soft(read.liftCount, `seven lifts ${where}`).toBe(7);
      expect
        .soft(read.liftTags, `the lifts are paths ${where}`)
        .toEqual(Array(7).fill("path"));
      expect
        .soft(
          read.copperOnThird,
          `the copper plank is on the third lift (DOM order) ${where}`,
        )
        .toBe(true);
      expect
        .soft(read.otherTones.length, `non-copper tones were read ${where}`)
        .toBeGreaterThan(0);
      expect
        .soft(read.copperTones.length, `copper tones were read ${where}`)
        .toBeGreaterThan(0);

      const lch = (rgb: Rgb) => oklch(rgb);
      const bgLch = lch(bg);
      for (const tone of read.otherTones) {
        const rgb = composite(tone.rgba, bg).map(Math.round) as Rgb;
        const label = `${tone.what} rgb(${rgb.join(",")}) ${where}`;
        const isBackground = rgb.every((c, i) => c === bg[i]);
        if (!isBackground) {
          const ratio = contrast(rgb, bg);
          expect.soft(ratio, `contrast ${label}`).toBeGreaterThanOrEqual(1.15);
          expect.soft(ratio, `contrast ${label}`).toBeLessThanOrEqual(3.0);
          const tonal = lch(rgb);
          // 8-bit rounding moves the hue of a near-grey by more than the window.
          if (tonal.c >= 0.005) {
            expect
              .soft(hueGap(tonal.h, bgLch.h), `hue vs --background, ${label}`)
              .toBeLessThanOrEqual(10);
          }
        }
      }

      const accentLch = lch(accent);
      for (const tone of read.copperTones) {
        const rgb = composite(tone.rgba, bg).map(Math.round) as Rgb;
        const tonal = lch(rgb);
        const label = `copper ${tone.what} rgb(${rgb.join(",")}) ${where}`;
        expect
          .soft(hueGap(tonal.h, accentLch.h), `hue vs --accent, ${label}`)
          .toBeLessThanOrEqual(3);
        expect
          .soft(Math.abs(tonal.c - accentLch.c), `chroma vs --accent, ${label}`)
          .toBeLessThanOrEqual(0.03);
        expect
          .soft(
            Math.abs(tonal.l - accentLch.l),
            `lightness vs --accent, ${label}`,
          )
          .toBeLessThanOrEqual(0.06);
      }

      const share = read.copperWidth / (read.hullWidth || Number.NaN);
      expect
        .soft(share, `copper plank's share of the hull's width ${where}`)
        .toBeGreaterThanOrEqual(0.2);
      expect
        .soft(share, `copper plank's share of the hull's width ${where}`)
        .toBeLessThanOrEqual(0.4);
    }
  });

  test("C8", async ({ page, browser, baseURL }) => {
    // C8. It degrades to the same object.
    const expectBox = async (target: Page, width: number, how: string) => {
      await requireHero(target);
      const g = await layout(target);
      const hero = need(g.hero, "hero");
      const expected = boxSize(g.clientWidth);
      within(hero.width, expected.width, 1, `box width, ${how} at ${width} px`);
      within(
        hero.height,
        expected.height,
        1,
        `box height, ${how} at ${width} px`,
      );
      await expect
        .soft(target.locator(HERO), `visible, ${how} at ${width} px`)
        .toBeVisible();
    };
    const fresh = async (options: Parameters<Browser["newContext"]>[0]) => {
      const context: BrowserContext = await browser.newContext({
        baseURL,
        ...options,
      });
      return { context, page: await context.newPage() };
    };
    for (const width of [1440, 390]) {
      const viewport = { width, height: heightAt(width) };
      const noScript = await fresh({ javaScriptEnabled: false, viewport });
      try {
        await noScript.page.goto("/");
        await expectBox(noScript.page, width, "scripts off");
      } finally {
        await noScript.context.close();
      }
      const reduced = await fresh({ reducedMotion: "reduce", viewport });
      try {
        await reduced.page.goto("/");
        await expectBox(reduced.page, width, "reduced motion");
      } finally {
        await reduced.context.close();
      }
    }
    // forced-colors: the whole box goes.
    await page.emulateMedia({ forcedColors: "active" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await requireHero(page);
    expect
      .soft(
        await page.locator(HERO).evaluate((el) => getComputedStyle(el).display),
        "display under forced-colors",
      )
      .toBe("none");
  });

  test("C9", async ({ page }) => {
    // C9. Hard gates. (`pnpm verify`, the whole suite and the diff's scope are CI's and the gate's.)
    const problems: string[] = [];
    page.on("pageerror", (error) =>
      problems.push(`pageerror: ${error.message}`),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        problems.push(`console: ${message.text()}`);
    });
    await openAt(page, 1440);
    await settled(page);
    await pause(page, 500);
    expect.soft(problems, "no page or console error on load").toEqual([]);

    for (const width of [1440, 390]) {
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        await openAt(page, width);
        const where = `${width} px, ${scheme}`;
        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .analyze();
        const found = results.violations.map((v) => ({
          rule: v.id,
          impact: v.impact,
          targets: v.nodes.map((node) => node.target.join(" ")),
        }));
        expect.soft(found, `axe violations (${where})`).toEqual([]);

        // A 3 x 3 grid inside the box: nothing at or inside the hero, nothing interactive.
        await page
          .locator(HERO)
          .evaluate((el) => el.scrollIntoView({ block: "center" }));
        const hits = await page.evaluate(() => {
          const hero = document.querySelector("[data-hero]") as Element;
          const r = hero.getBoundingClientRect();
          const out: {
            point: string;
            inHero: boolean;
            interactive: boolean;
            tag: string;
          }[] = [];
          for (const fy of [1 / 6, 1 / 2, 5 / 6]) {
            for (const fx of [1 / 6, 1 / 2, 5 / 6]) {
              const x = r.left + r.width * fx;
              const y = r.top + r.height * fy;
              for (const el of document.elementsFromPoint(x, y)) {
                if (["HTML", "BODY", "MAIN"].includes(el.tagName)) continue;
                out.push({
                  point: `${Math.round(x)},${Math.round(y)}`,
                  inHero: el === hero || hero.contains(el),
                  interactive: el.matches(
                    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
                  ),
                  tag: el.tagName.toLowerCase(),
                });
              }
            }
          }
          return out;
        });
        expect
          .soft(
            hits.filter((h) => h.inHero),
            `nothing at or inside the hero is hit (${where})`,
          )
          .toEqual([]);
        expect
          .soft(
            hits.filter((h) => h.interactive),
            `nothing interactive is hit (${where})`,
          )
          .toEqual([]);
      }
    }
  });
});

/** OKLCH of an sRGB color: lightness 0 to 1, chroma, hue in degrees. */
function oklch([r, g, b]: Rgb) {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: L,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/** The smaller angle between two hues, in degrees. */
function hueGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
