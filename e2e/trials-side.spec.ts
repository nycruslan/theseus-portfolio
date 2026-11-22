import { type Browser, expect, type Page, test } from "@playwright/test";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 80 (.crew/sprint/80/contract.md, T40): the trials' side keeps its foot in the window. From
// 1024 wide the drawing and the chart stand in a side column that goes sticky under
// `(width >= 64rem) and (height >= 52.5rem)` (app/globals.css, "Sticky only where it fits"): a
// threshold in rem, while the side doesn't grow in step with the font. Atlas measured production on
// 2026-11-19: at a 24 px default font the stuck side's foot sat 17 px below the window at 1536 x
// 1260 and 1600 x 1300 and 7 px at 1920 x 1400 and 1920 x 1600; at 28 px, 14 px at 1920 x 1600. The
// chart's width axis is hidden until the page ends, and nothing scrolls it into view.
//
// T40a reads, wherever the side is stuck (computed `position: sticky` and its top at its `top`, to
// half a pixel), every box in it against the window's foot: the side's own, each element's and each
// SVG part's, the chart's axis labels included. Boxes are read whole, never cut by a clipping
// ancestor, so hiding the side's overflow isn't a fix: a `max-height` and `overflow: hidden` mutant
// on the side stays red, its chart 7 to 48 px past the foot. Unshown parts (no box, `visibility:
// hidden`, opacity 0) are skipped. A side that isn't stuck scrolls with the page, which the contract
// allows where it can't fit; T40b holds the default font to main, where the side is sticky from 1024
// x 840. Webfonts load, as a visitor has them, in the suite's own browser. On main there the foot
// (the chart's caption, under its width axis) is 16.9 px past at 1536 x 1260 and 7.0 at 1920 x 1400
// and 1920 x 1600 with a 24 px font, and 47.8 at 1792 x 1470, 13.6 at 1920 x 1600 and 33.6 at 2560 x
// 1600 with 28; 1600 x 1300 at 24 px fits here by 12 px. One context per route and font, the page
// resized through the windows, to keep CI's shards lean (.crew/STATE.md); about 30 test-s in all.

/** A box past the window's foot by this or less is a subpixel touch, not an overrun. */
const TOL = 0.5;
const ROUTES = ["/trials", "/trials/1366x595"] as const;
/** Chrome's Medium, Large and Very large default fonts, and 28 past them. */
const SIZES = [16, 20, 24, 28] as const;
/**
 * The contract's windows, and each font's sticky edge (64rem x 52.5rem: 1024 x 840, 1280 x 1050,
 * 1536 x 1260, 1792 x 1470), where the side has the least room, and 2560 x 1600; the order doesn't
 * matter, since each read waits for the side to settle.
 */
const WINDOWS = [
  [1024, 768],
  [1024, 840],
  [1280, 900],
  [1440, 900],
  [1280, 1050],
  [1536, 1260],
  [1600, 1300],
  [1792, 1470],
  [1920, 1080],
  [1920, 1400],
  [1920, 1600],
  [2560, 1440],
  [2560, 1600],
] as const;
/** T40b: the windows where main's side is sticky at 16 px, 64rem wide and 52.5rem tall or more. */
const STICKY_ON_MAIN = WINDOWS.filter(([w, h]) => w >= 1024 && h >= 840);
/** The side's sticky `top` on main: under the bar. */
const TOP_ON_MAIN = "88px";

type Scroll = "middle" | "end";

type SideRead = {
  root: string;
  found: boolean;
  position: string;
  top: string;
  /** The side's top in the window, and whether it sits at its `top` (sticky and stuck). */
  at: number;
  stuck: boolean;
  /** The window's height the side must end inside (the root's client height). */
  foot: number;
  /** The side's height. */
  height: number;
  /** The chart's axis labels read, so "axis labels included" can't pass on none. */
  axis: number;
  /** The lowest shown box's bottom and the lowest axis label's, in the window's px. */
  lowest: number;
  lowestAxis: number;
  /** Each shown box ending past the window's foot, by what and how far. */
  past: string[];
  /** How far the page is scrolled, and where it was asked to. */
  scrollY: number;
};

/** Scroll the page to the middle, or to just before the side's container ends, and read the side. */
function readSide(page: Page, scroll: Scroll): Promise<SideRead> {
  return page.evaluate(
    async ([to, tol]) => {
      const frame = () =>
        new Promise((done) => requestAnimationFrame(() => done(null)));
      const side = document.querySelector(".trials > .trials-side");
      const root = getComputedStyle(document.documentElement).fontSize;
      if (!side)
        return {
          root,
          found: false,
          position: "",
          top: "",
          at: 0,
          stuck: false,
          foot: 0,
          height: 0,
          axis: 0,
          lowest: 0,
          lowestAxis: 0,
          past: [],
          scrollY,
        };
      const style = getComputedStyle(side);
      const max = document.documentElement.scrollHeight - innerHeight;
      let target = max / 2;
      if (to === "end") {
        // The sticky side is held inside its container's content box: it is stuck while the
        // scroll is at most the content's foot less the side's height and its `top`.
        const box = side.parentElement as HTMLElement;
        const cs = getComputedStyle(box);
        const foot =
          box.getBoundingClientRect().bottom +
          scrollY -
          Number.parseFloat(cs.paddingBottom) -
          Number.parseFloat(cs.borderBottomWidth);
        const top = Number.parseFloat(style.top) || 0;
        target =
          Math.floor(foot - side.getBoundingClientRect().height - top) - 1;
      }
      scrollTo(0, Math.max(0, Math.min(max, target)));
      await frame();
      await frame();

      const foot = document.documentElement.clientHeight;
      const sideBox = side.getBoundingClientRect();
      const at = sideBox.top;
      const stuck =
        style.position === "sticky" &&
        Math.abs(at - (Number.parseFloat(style.top) || 0)) <= tol;

      const nameOf = (el: Element) => {
        const cls =
          typeof el.className === "string"
            ? el.className
            : el.getAttribute("class");
        const words = (el.textContent ?? "").trim().replace(/\s+/g, " ");
        return `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).join(".")}` : ""}${words && el.children.length === 0 ? ` "${words.slice(0, 24)}"` : ""}`;
      };
      const past: string[] = [];
      let lowest = Number.NEGATIVE_INFINITY;
      let lowestAxis = Number.NEGATIVE_INFINITY;
      const axisLabels = new Set(side.querySelectorAll(".trials-axis text"));
      for (const el of [side, ...side.querySelectorAll("*")]) {
        if (
          !el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        )
          continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const { bottom } = r;
        lowest = Math.max(lowest, bottom);
        if (axisLabels.has(el)) lowestAxis = Math.max(lowestAxis, bottom);
        if (bottom - foot > tol)
          past.push(
            `${nameOf(el)} ends ${(bottom - foot).toFixed(1)} px past the window's foot`,
          );
      }
      return {
        root,
        found: true,
        position: style.position,
        top: style.top,
        at: Number(at.toFixed(1)),
        stuck,
        foot,
        height: Number(sideBox.height.toFixed(1)),
        axis: axisLabels.size,
        lowest: Number(lowest.toFixed(1)),
        lowestAxis: Number(lowestAxis.toFixed(1)),
        past,
        scrollY,
      };
    },
    [scroll, TOL] as const,
  );
}

/** Until the side's height holds between two frames: the frame's iframe and drag settle a beat late. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const frame = () =>
      new Promise((done) => requestAnimationFrame(() => done(null)));
    const side = document.querySelector(".trials > .trials-side");
    let last = -1;
    for (let i = 0; i < 20; i += 1) {
      await frame();
      await frame();
      const now = side?.getBoundingClientRect().height ?? 0;
      if (now === last) return;
      last = now;
    }
  });
}

/** Each route and font in a context of its own, resized through `windows`; `check` reads each. */
async function sweep(
  browser: Browser,
  sizes: readonly number[],
  windows: readonly (readonly [number, number])[],
  check: (page: Page, where: string, size: number) => Promise<void>,
) {
  for (const route of ROUTES)
    for (const size of sizes) {
      const [first] = windows;
      if (!first) throw new Error("no windows to sweep");
      const { context, page } = await contextOf(browser, {
        width: first[0],
        height: first[1],
      });
      try {
        await setDefaultFont(context, page, size);
        await page.goto(route, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        for (const [width, height] of windows) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => scrollTo(0, 0));
          await settle(page);
          await check(
            page,
            `${route} at ${width} x ${height}, ${size} px default font`,
            size,
          );
        }
      } finally {
        await context.close();
      }
    }
}

const T40A =
  "T40a the stuck side keeps its foot in the window: on /trials and /trials/1366x595, at 16, 20, 24 and 28 px default fonts, at 1024 x 768, 1280 x 900, 1440 x 900, 1536 x 1260, 1600 x 1300, 1920 x 1080, 1920 x 1400, 1920 x 1600 and 2560 x 1440 and each font's sticky edge (1024 x 840, 1280 x 1050, 1792 x 1470, and 2560 x 1600), with the page scrolled to the middle and to just before the side's container ends: whenever the side is stuck (position: sticky and its top at its top), every box in it, the chart's axis labels included, ends inside the window";

test(T40A, async ({ browser }) => {
  test.setTimeout(120_000);
  const stuckAt: string[] = [];
  await sweep(browser, SIZES, WINDOWS, async (page, where, size) => {
    for (const scroll of ["middle", "end"] as const) {
      const read = await readSide(page, scroll);
      const at = `${where}, scrolled to the ${scroll}`;
      expect(read.root, `the root's font, ${at}`).toBe(`${size}px`);
      expect(
        [read.found, read.axis > 0],
        `the side and the chart's axis labels, ${at}`,
      ).toEqual([true, true]);
      if (!read.stuck) continue;
      stuckAt.push(
        `${at} (scrollY ${read.scrollY}): foot ${read.foot}, side ${read.at} + ${read.height}, lowest box ${read.lowest}, lowest axis label ${read.lowestAxis}`,
      );
      expect.soft(read.past, `boxes past the window's foot, ${at}`).toEqual([]);
    }
  });
  test.info().annotations.push({
    type: "stuck",
    description: stuckAt.join("\n"),
  });
  // A sweep that never found the side stuck would pass on nothing: the default font is sticky on
  // main from 1024 x 840 (T40b holds it there).
  expect(stuckAt.length, "reads with the side stuck").toBeGreaterThan(0);
});

const T40B =
  "T40b at a 16 px default font the side is sticky where it is on main: on /trials and /trials/1366x595, at every T40a window 1024 wide or more and 840 tall or more (1024 x 840, 1280 x 900, 1440 x 900, 1280 x 1050 and up), the side is position: sticky with top 88px, and stuck at its top with the page scrolled to the middle";

test(T40B, async ({ browser }) => {
  test.setTimeout(60_000);
  await sweep(browser, [16], STICKY_ON_MAIN, async (page, where) => {
    const read = await readSide(page, "middle");
    expect(read.root, `the root's font, ${where}`).toBe("16px");
    expect
      .soft(
        { position: read.position, top: read.top, stuck: read.stuck },
        `the side, ${where}, scrolled to the middle (its top at ${read.at})`,
      )
      .toEqual({ position: "sticky", top: TOP_ON_MAIN, stuck: true });
  });
});
