import { type Browser, expect, type Page, test } from "@playwright/test";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 78 (.crew/sprint/78/contract.md, T38): the trials chart's labels read whole. Probe's sweep
// of production on 2026-11-19 found, at 1024 x 768 with the default 16 px font, on /trials and every
// /trials/<window>, the film pad behind the 456 x 465 sounding's "−0.1" painting 9.9 x 5.0 px over
// the gap's label and hiding its decimal point, so "−6.2" read "−6 2" (4.5 x 5 at 1088, gone from
// 1152). The chart is aria-hidden and 6.2 appears nowhere else in the page's text. Riding along: at
// 320 x 568 with a 24 or 28 px default font the width axis read "768 10241280", and at 28 px the
// height axis's "1100" started 6 px left of the window.
//
// Every box is the element's getBoundingClientRect, in the window's px: an SVG text's is its glyph
// cells, a rect's its own, the ring's too while it's hidden (focus shows it). Two boxes intersect
// when they share more than half a pixel each way, so a subpixel touch at a percentage-placed edge
// isn't a cover; a box is inside the window to the same half pixel. Webfonts load, as a visitor
// has them. One context per route and font, the page resized through the widths, to keep CI's
// shards lean (.crew/STATE.md).

/** Overlap, or a box past the window's edge, under this is a subpixel touch, not a cover. */
const TOL = 0.5;
/** T38b's least clearance between two labels on one axis. */
const CLEAR = 2;

const GAP_TEXT = "−6.2";

type Box = { left: number; top: number; right: number; bottom: number };

/** Each width in steps of `step` from `from` to `to`. */
const stepsOf = (from: number, to: number, step: number) =>
  Array.from({ length: (to - from) / step + 1 }, (_, i) => from + i * step);

async function openAt(
  browser: Browser,
  route: string,
  size: number,
  viewport: { width: number; height: number },
) {
  const { context, page } = await contextOf(browser, viewport);
  await setDefaultFont(context, page, size);
  await page.goto(route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

type GapRead = {
  root: string;
  gap: string | null;
  soundings: number;
  /** The marks found on each sounding, so a missing one can't pass. */
  marks: number;
  axis: number;
  /** What covers the gap's label, and the gap's pad a sounding's number: which, and by how much. */
  hits: string[];
};

/** The gap's label and pad against every sounding's marks and the chart's other labels. */
function readGap(page: Page): Promise<GapRead> {
  return page.evaluate((tol) => {
    const boxOf = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const cover = (a: Box, b: Box) => {
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return x > tol && y > tol ? `${x.toFixed(1)} x ${y.toFixed(1)} px` : null;
    };
    const chart = document.querySelector("main svg[data-chart]");
    const text = chart?.querySelector(".trials-gap text");
    const pad = chart?.querySelector(".trials-gap rect");
    const hits: string[] = [];
    let marks = 0;
    const soundings = [...(chart?.querySelectorAll("a[data-sounding]") ?? [])];
    if (text && pad) {
      const label = boxOf(text);
      const film = boxOf(pad);
      for (const sounding of soundings) {
        const name = sounding.getAttribute("data-sounding");
        for (const part of ["pad", "ring", "dot", "number"]) {
          const el = sounding.querySelector(`.trials-sounding-${part}`);
          if (!el) continue;
          marks += 1;
          const on = cover(label, boxOf(el));
          if (on) hits.push(`${name}'s ${part} over the gap's label by ${on}`);
        }
        const number = sounding.querySelector(".trials-sounding-number");
        const on = number && cover(boxOf(number), film);
        if (on) hits.push(`${name}'s number under the gap's pad by ${on}`);
      }
      for (const other of chart?.querySelectorAll(".trials-axis text") ?? []) {
        const on = cover(label, boxOf(other));
        if (on)
          hits.push(
            `the axis's "${other.textContent?.trim()}" on the gap's label by ${on}`,
          );
      }
    }
    return {
      root: getComputedStyle(document.documentElement).fontSize,
      gap: text?.textContent?.trim() ?? null,
      soundings: soundings.length,
      marks,
      axis: chart?.querySelectorAll(".trials-axis text").length ?? 0,
      hits,
    };
  }, TOL);
}

const T38A_ROUTES = ["/trials", "/trials/320x568"] as const;
const T38A_WIDTHS = stepsOf(1024, 1440, 16);
const T38A_HEIGHT = 768;
const T38A_SIZES = [16, 20] as const;

const T38A =
  "T38a the gap's label reads whole: on /trials and /trials/320x568, from 1024 to 1440 wide in 16 px steps at 768 tall, with a 16 and a 20 px default font, the gap's label (\"−6.2\", .trials-gap text) intersects no sounding's pad, ring, dot or number box and no axis label, and no sounding's number box intersects the gap's pad";

test(T38A, async ({ browser }) => {
  test.setTimeout(120_000);
  for (const route of T38A_ROUTES)
    for (const size of T38A_SIZES) {
      const { context, page } = await openAt(browser, route, size, {
        width: T38A_WIDTHS[0] ?? 1024,
        height: T38A_HEIGHT,
      });
      try {
        for (const width of T38A_WIDTHS) {
          await page.setViewportSize({ width, height: T38A_HEIGHT });
          const where = `${route} at ${width} x ${T38A_HEIGHT}, ${size} px default font`;
          const read = await readGap(page);
          // The setting took, and every mark is there to read.
          expect(read.root, `the root's font, ${where}`).toBe(`${size}px`);
          expect(read.gap, `the gap's label, ${where}`).toBe(GAP_TEXT);
          expect(
            [read.soundings, read.marks, read.axis],
            `soundings, their marks and the axis labels, ${where}`,
          ).toEqual([4, 16, 8]);
          expect.soft(read.hits, `covers, ${where}`).toEqual([]);
        }
      } finally {
        await context.close();
      }
    }
});

type AxisRead = {
  root: string;
  window: number;
  widths: string[];
  heights: string[];
  /** Two labels on one axis closer than CLEAR, and labels past the window's sides. */
  close: string[];
  out: string[];
};

/** The axes' labels: each pair on an axis apart, each inside the window across. */
function readAxes(page: Page): Promise<AxisRead> {
  return page.evaluate(
    ([tol, clear]) => {
      const chart = document.querySelector("main svg[data-chart]");
      const labelsOf = (selector: string) =>
        [...(chart?.querySelectorAll(selector) ?? [])].map((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent?.trim() ?? "", r };
        });
      const widths = labelsOf(".trials-axis svg text");
      const heights = labelsOf(".trials-axis > text");
      const close: string[] = [];
      for (const [axis, labels] of [
        ["width", widths],
        ["height", heights],
      ] as const)
        labels.forEach((a, i) => {
          for (const b of labels.slice(i + 1)) {
            const x = Math.max(b.r.left - a.r.right, a.r.left - b.r.right);
            const y = Math.max(b.r.top - a.r.bottom, a.r.top - b.r.bottom);
            const apart = Math.max(x, y);
            if (apart < clear)
              close.push(
                `the ${axis} axis's "${a.text}" and "${b.text}" ${apart < 0 ? `overlap by ${(-apart).toFixed(1)}` : `are ${apart.toFixed(1)}`} px`,
              );
          }
        });
      const window = document.documentElement.clientWidth;
      const out: string[] = [];
      for (const { text, r } of [...widths, ...heights]) {
        if (r.left < -tol)
          out.push(
            `"${text}" starts ${(-r.left).toFixed(1)} px left of the window`,
          );
        if (r.right > window + tol)
          out.push(
            `"${text}" ends ${(r.right - window).toFixed(1)} px past the window`,
          );
      }
      return {
        root: getComputedStyle(document.documentElement).fontSize,
        window,
        widths: widths.map((l) => l.text),
        heights: heights.map((l) => l.text),
        close,
        out,
      };
    },
    [TOL, CLEAR] as const,
  );
}

const T38B_WINDOWS = [
  [320, 568],
  [390, 844],
  [1440, 900],
] as const;
const T38B_SIZES = [16, 20, 24, 28] as const;

const T38B =
  "T38b the axes' labels read whole: on /trials at 320 x 568, 390 x 844 and 1440 x 900, with a 16, 20, 24 and 28 px default font, no two width-axis labels' boxes intersect or sit closer than 2 px, nor two height-axis labels', and every axis label's box lies wholly inside the window across";

test(T38B, async ({ browser }) => {
  test.setTimeout(90_000);
  for (const size of T38B_SIZES) {
    const [first] = T38B_WINDOWS;
    const { context, page } = await openAt(browser, "/trials", size, {
      width: first[0],
      height: first[1],
    });
    try {
      for (const [width, height] of T38B_WINDOWS) {
        await page.setViewportSize({ width, height });
        const where = `/trials at ${width} x ${height}, ${size} px default font`;
        const read = await readAxes(page);
        expect(read.root, `the root's font, ${where}`).toBe(`${size}px`);
        expect(
          [read.widths, read.heights],
          `the axes' labels, ${where}`,
        ).toEqual([
          ["320", "768", "1024", "1280", "1920"],
          ["460", "780", "1100"],
        ]);
        expect.soft(read.close, `labels too close, ${where}`).toEqual([]);
        expect.soft(read.out, `labels past the window, ${where}`).toEqual([]);
      }
    } finally {
      await context.close();
    }
  }
});
