import { type Browser, expect, type Page, test } from "@playwright/test";
import { GAP, keyOf, PIN_WINDOWS } from "../lib/trials";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 78 (.crew/sprint/78/contract.md, T38): the trials chart's labels read whole. Probe's sweep
// of production on 2026-11-19 found, at 1024 x 768 with the default 16 px font, on /trials and every
// /trials/<window>, the film pad behind the 456 x 465 sounding's "−0.1" painting 9.9 x 5.0 px over
// the gap's label and hiding its decimal point, so "−6.2" read "−6 2" (4.5 x 5 at 1088, gone from
// 1152). The chart is aria-hidden and 6.2 appears nowhere else in the page's text. Riding along: at
// 320 x 568 with a 24 or 28 px default font the width axis read "768 10241280", and at 28 px the
// height axis's "1100" started 6 px left of the window. Iris's review of the fix (sprint 78) found a
// crew pin's 5 px dot painting into the label's digits from a 20 px default font, since the gap's
// pad stayed 28 x 15 px (247 width and font cases; at 1440 x 900, 28 px, 360 x 560's dot on the
// decimal point read "−6,2"), so T38a also reads every pin's dot against the label on /trials.
//
// Every box is the element's getBoundingClientRect, in the window's px: an SVG text's is its glyph
// cells, a rect's its own, the ring's too while it's hidden (focus shows it); a pin's dot, a near-zero
// circle drawn by a 5 px round stroke, is 5 px square about its point's screen CTM. Two boxes intersect
// when they share more than half a pixel each way, so a subpixel touch at a percentage-placed edge
// isn't a cover; a box is inside the window to the same half pixel. Webfonts load, as a visitor
// has them. One context per route and font, the page resized through the widths, to keep CI's
// shards lean (.crew/STATE.md).
//
// Sprint 79 (.crew/sprint/79/contract.md, T39): every crew pin shows. On production the pins at
// 360 x 560 and 375 x 548 sit wholly under the gap's pad at every width, so the chart shows two of
// the crew's windows fewer than it fitted. T39 doesn't know where the label goes (beside its dot, or
// away with a leader): it reads every dot, pad, text and the ring from the page. A dot is its 5 px
// ink, a disc about its point; a disc is covered where it reaches more than half a pixel into a box.

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
  /** The crew's pins, and those whose dot meets the label's box outside the gap's pad. */
  pins: number;
  dots: string[];
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
    const dots: string[] = [];
    let marks = 0;
    const pins = [...(chart?.querySelectorAll("circle[data-pin]") ?? [])];
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
      // The gap's pad, drawn after the plot, hides what of a dot it covers: a dot is drawn over
      // the label where the part of it on the label's box reaches past the pad. At 16 px the pad
      // holds the label's box, so a dot half under the pad's edge shows only beside the label.
      for (const pin of pins) {
        const ctm = (pin as SVGGraphicsElement).getScreenCTM();
        if (!ctm) continue;
        const at = new DOMPoint(
          Number(pin.getAttribute("cx")),
          Number(pin.getAttribute("cy")),
        ).matrixTransform(ctm);
        const dot = {
          left: at.x - 2.5,
          top: at.y - 2.5,
          right: at.x + 2.5,
          bottom: at.y + 2.5,
        };
        const on = {
          left: Math.max(label.left, dot.left),
          top: Math.max(label.top, dot.top),
          right: Math.min(label.right, dot.right),
          bottom: Math.min(label.bottom, dot.bottom),
        };
        if (!cover(label, dot)) continue;
        // How far the part on the label reaches past the pad, on its widest side.
        const past = Math.max(
          Math.min(on.right, film.left) - on.left,
          on.right - Math.max(on.left, film.right),
          Math.min(on.bottom, film.top) - on.top,
          on.bottom - Math.max(on.top, film.bottom),
        );
        if (past > tol)
          dots.push(
            `${pin.getAttribute("data-windows")}'s dot on the gap's label by ${cover(label, dot)}, ${past.toFixed(1)} px of it past the pad`,
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
      pins: pins.length,
      dots,
    };
  }, TOL);
}

const T38A_ROUTES = ["/trials", "/trials/320x568"] as const;
const T38A_WIDTHS = stepsOf(1024, 1440, 16);
const T38A_HEIGHT = 768;
const T38A_SIZES = [16, 20] as const;
/** The pins' clause, on /trials: two phones and every 16 px from 1024 to 2560, at four fonts. */
const PIN_WIDTHS = [320, 390, ...stepsOf(1024, 2560, 16)];
const PIN_SIZES = [16, 20, 24, 28] as const;

/** Each route and font, the widths it's read at, and which clauses each width reads. */
const T38A_PLAN = [
  ...T38A_ROUTES.flatMap((route) =>
    T38A_SIZES.map((size) => ({ route, size, pins: route === "/trials" })),
  ),
  ...PIN_SIZES.filter(
    (size) => !(T38A_SIZES as readonly number[]).includes(size),
  ).map((size) => ({ route: "/trials", size, pins: true })),
].map(({ route, size, pins }) => {
  const marks = (T38A_SIZES as readonly number[]).includes(size);
  const widths = new Set([
    ...(marks ? T38A_WIDTHS : []),
    ...(pins ? PIN_WIDTHS : []),
  ]);
  return {
    route,
    size,
    widths: [...widths].toSorted((a, b) => a - b),
    marksAt: (w: number) => marks && T38A_WIDTHS.includes(w),
    pins,
  };
});

const T38A =
  "T38a the gap's label reads whole: on /trials and /trials/320x568, from 1024 to 1440 wide in 16 px steps at 768 tall, with a 16 and a 20 px default font, the gap's label (\"−6.2\", .trials-gap text) intersects no sounding's pad, ring, dot or number box and no axis label, and no sounding's number box intersects the gap's pad; and on /trials at 320, 390 and every 16 px from 1024 to 2560 wide, with a 16, 20, 24 and 28 px default font, no crew pin's dot is drawn over the gap's label: what of a dot's box lies on the label's box, the gap's pad covers whole";

test(T38A, async ({ browser }) => {
  test.setTimeout(120_000);
  for (const { route, size, widths, marksAt, pins } of T38A_PLAN) {
    const { context, page } = await openAt(browser, route, size, {
      width: widths[0] ?? 1024,
      height: T38A_HEIGHT,
    });
    try {
      for (const width of widths) {
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
        if (marksAt(width))
          expect.soft(read.hits, `covers, ${where}`).toEqual([]);
        if (pins) {
          expect(read.pins, `the crew's pins, ${where}`).toBeGreaterThan(0);
          expect.soft(read.dots, `pins' dots, ${where}`).toEqual([]);
        }
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

/** T39's windows: two phones, 1024 to 1440 wide at 768, two laptops; each once, narrow first. */
const T39_WINDOWS = [
  [320, 568],
  [390, 844],
  ...stepsOf(1024, 1440, 16).map((width) => [width, 768] as const),
  [1280, 800],
  [1440, 900],
] as const;
const T39_SIZES = [16, 20, 24, 28] as const;
/** Every crew window the chart marks, from the list it reads: a dot each, H10's run one bar. */
const CREW_WINDOWS = PIN_WINDOWS.map(keyOf).toSorted();
/** The gap's window, 320 x 568, whose dot the label stays tied to. */
const GAP_WINDOWS = keyOf(GAP);
/** T39b: a label beside its dot comes within this of the dot's edge; a leader, within REACH. */
const BESIDE = 8;
const REACH = 3;

type SeatRead = {
  /** The marks read, so a missing one can't pass: the windows the pins mark, the dots, the gap's
   * pad, the ring's film radius. */
  marked: string[];
  pins: number;
  pad: boolean;
  film: number;
  /** T39a: the ring's mask over the dots' copy, its reach and its hole (half their strokes). */
  mask: { reach: number; hole: number };
  /** T39a: each dot something covers, by what and how far. */
  covered: string[];
  /** T39b: each dot the label's text meets. */
  onText: string[];
  /** T39b: how far the label is from its dot, and its leader, and whether either ties them. */
  tie: { beside: number | null; leader: string | null; tied: boolean };
};

/**
 * Every crew pin's dot against what can hide it, and the gap's label against its own dot. The
 * label's box is its text's and its pad's together (the pad is `.trials-gap rect`, a leader aside);
 * a leader is every shown `.trials-gap-leader` in the chart, their boxes together.
 */
function readSeat(page: Page): Promise<SeatRead> {
  return page.evaluate(
    ([tol, gapWindows, beside, reach]) => {
      const boxOf = (el: Element): Box => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      const union = (boxes: Box[]): Box | null =>
        boxes.length === 0
          ? null
          : {
              left: Math.min(...boxes.map((b) => b.left)),
              top: Math.min(...boxes.map((b) => b.top)),
              right: Math.max(...boxes.map((b) => b.right)),
              bottom: Math.max(...boxes.map((b) => b.bottom)),
            };
      /** From a point to a box, 0 inside it. */
      const toBox = (x: number, y: number, b: Box) =>
        Math.hypot(
          Math.max(b.left - x, 0, x - b.right),
          Math.max(b.top - y, 0, y - b.bottom),
        );
      const between = (a: Box, b: Box) =>
        Math.hypot(
          Math.max(b.left - a.right, 0, a.left - b.right),
          Math.max(b.top - a.bottom, 0, a.top - b.bottom),
        );
      const pointOf = (el: Element) => {
        const ctm = (el as SVGGraphicsElement).getScreenCTM();
        return ctm
          ? new DOMPoint(
              Number(el.getAttribute("cx")),
              Number(el.getAttribute("cy")),
            ).matrixTransform(ctm)
          : null;
      };
      /** A non-scaling round stroke's width, the painted dot's or ring's diameter. */
      const strokeOf = (el: Element | null | undefined) =>
        el ? Number.parseFloat(getComputedStyle(el).strokeWidth) || 0 : 0;

      const chart = document.querySelector("main svg[data-chart]");
      const text = chart?.querySelector(".trials-gap text");
      const pad = chart?.querySelector(
        ".trials-gap rect:not(.trials-gap-leader)",
      );
      const ring = chart?.querySelector("circle[data-ring]");
      const ringAt = ring ? pointOf(ring) : null;
      const ringOn = `${ring?.getAttribute("cx")}x${ring?.getAttribute("cy")}`;
      const filmEl = chart?.querySelector(".trials-ring-film");
      const film = strokeOf(filmEl) / 2;
      // A copy of the dots drawn above the ring's film (Iris's seat, .crew/sprint/79/seat.md, 4):
      // a shown `use` after the film in paint order, of the dot or a group holding it, in the dot's
      // own ink and at least its width. Such a dot is hidden only where the ring's hole, the mask
      // that keeps the copy off the ring's centre, reaches it (decisions.md, 5), or where the film
      // covers it past the mask's reach, outside which the copy isn't drawn (Lens, sprint 79's
      // retro).
      const copies = [...(chart?.querySelectorAll("use") ?? [])].filter(
        (use) =>
          filmEl &&
          filmEl.compareDocumentPosition(use) &
            Node.DOCUMENT_POSITION_FOLLOWING &&
          use.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }),
      );
      const copyOf = (pin: Element) =>
        copies.find((use) => {
          const id = use.getAttribute("href")?.replace(/^#/, "");
          const of = id ? document.getElementById(id) : null;
          return (
            of?.contains(pin) &&
            getComputedStyle(use).stroke === getComputedStyle(pin).stroke &&
            strokeOf(use) >= strokeOf(pin)
          );
        });
      // The mask a copy is drawn under, read by its luminance, not its class (Lens on sprint 79):
      // its white parts are the reach the copy shows within, its black the hole it hides, each a
      // disc about the ring, half its stroke. A copy under no mask shows everywhere, a mask with no
      // white nowhere. The lookup starts at the copy itself, so a mask set on the `use` counts as
      // one on a group around it (Lens's nit, .crew/sprint/80/retro.json).
      const WHITE = "rgb(255, 255, 255)";
      const BLACK = "rgb(0, 0, 0)";
      const maskOf = (use: Element) => {
        let reach = Number.POSITIVE_INFINITY;
        let hole = 0;
        for (let up: Element | null = use; up; up = up.parentElement) {
          const ref = (
            up.getAttribute("mask") ?? getComputedStyle(up).maskImage
          ).match(/url\(["']?#([^"')]+)["']?\)/);
          const mask = ref?.[1] ? document.getElementById(ref[1]) : null;
          if (!mask) continue;
          const parts = [...mask.querySelectorAll("*")];
          const widest = (ink: string) =>
            Math.max(
              0,
              ...parts
                .filter((el) => getComputedStyle(el).stroke === ink)
                .map((el) => strokeOf(el) / 2),
            );
          reach = Math.min(reach, widest(WHITE));
          hole = Math.max(hole, widest(BLACK));
        }
        return { reach, hole };
      };
      const firstCopy = copies[0];
      const masked = firstCopy ? maskOf(firstCopy) : { reach: 0, hole: 0 };
      // What can hide a dot: the gap's pad and text, and each sounding's pad and number.
      const covers: { what: string; box: Box }[] = [];
      if (pad) covers.push({ what: "the gap's pad", box: boxOf(pad) });
      if (text) covers.push({ what: "the gap's text", box: boxOf(text) });
      for (const sounding of chart?.querySelectorAll("a[data-sounding]") ?? [])
        for (const part of ["pad", "number"]) {
          const el = sounding.querySelector(`.trials-sounding-${part}`);
          if (el)
            covers.push({
              what: `${sounding.getAttribute("data-sounding")}'s ${part}`,
              box: boxOf(el),
            });
        }

      const pins = [...(chart?.querySelectorAll("circle[data-pin]") ?? [])];
      const covered: string[] = [];
      const onText: string[] = [];
      let gapDot: { x: number; y: number; r: number } | null = null;
      for (const pin of pins) {
        const name = pin.getAttribute("data-windows") ?? "";
        const at = pointOf(pin);
        const r = strokeOf(pin) / 2;
        if (!at || r === 0) {
          covered.push(`${name}'s dot has no point or no ink`);
          continue;
        }
        if (name === gapWindows) gapDot = { x: at.x, y: at.y, r };
        // How far the dot's disc reaches into a box: its radius less its centre's distance.
        for (const { what, box } of covers) {
          const into = r - toBox(at.x, at.y, box);
          if (into > tol)
            covered.push(
              `${name}'s dot under ${what} by ${into.toFixed(1)} px`,
            );
        }
        const on = `${pin.getAttribute("cx")}x${pin.getAttribute("cy")}`;
        if (ringAt && on !== ringOn) {
          const copy = copyOf(pin);
          const d = Math.hypot(at.x - ringAt.x, at.y - ringAt.y);
          const ring = `(the ring at ${ringOn})`;
          if (!copy) {
            const into = r + film - d;
            if (into > tol)
              covered.push(
                `${name}'s dot under the ring's film ${ring} by ${into.toFixed(1)} px`,
              );
          } else {
            // The copy hides where the mask's hole reaches the dot, and shows the dot under the
            // film only within the mask's reach: along the line to the ring, the dot runs from
            // d − r to d + r, the film to `film`, the reach to `reach`.
            const { reach: shows, hole: hides } = maskOf(copy);
            const inHole = hides + r - d;
            if (inHole > tol)
              covered.push(
                `${name}'s dot under the ring's hole ${ring} by ${inHole.toFixed(1)} px`,
              );
            const beyond = Math.min(d + r, film) - Math.max(d - r, shows);
            if (beyond > tol)
              covered.push(
                `${name}'s dot under the ring's film past the mask's reach (${shows.toFixed(1)} px) ${ring} by ${beyond.toFixed(1)} px`,
              );
          }
        }
        if (text) {
          const into = r - toBox(at.x, at.y, boxOf(text));
          if (into > tol)
            onText.push(
              `${name}'s dot on the gap's label by ${into.toFixed(1)} px`,
            );
        }
      }

      // The tie: the label's box beside the dot's edge, or a shown leader reaching both.
      const label = union([text, pad].flatMap((el) => (el ? [boxOf(el)] : [])));
      const leader = union(
        [...(chart?.querySelectorAll(".trials-gap-leader") ?? [])]
          .filter((el) =>
            el.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
          )
          .map(boxOf),
      );
      let tie: SeatRead["tie"] = { beside: null, leader: null, tied: false };
      if (gapDot && label) {
        const apart = toBox(gapDot.x, gapDot.y, label) - gapDot.r;
        const toDot = leader && toBox(gapDot.x, gapDot.y, leader) - gapDot.r;
        const toLabel = leader && between(leader, label);
        const joins =
          toDot !== null &&
          toLabel !== null &&
          toDot <= reach &&
          toLabel <= reach;
        tie = {
          beside: Number(apart.toFixed(1)),
          leader:
            toDot === null || toLabel === null
              ? null
              : `${toDot.toFixed(1)} px from the dot's edge, ${toLabel.toFixed(1)} px from the label`,
          tied: apart <= beside || joins,
        };
      }
      return {
        marked: [...(chart?.querySelectorAll("[data-pin]") ?? [])]
          .flatMap((el) => el.getAttribute("data-windows")?.split(" ") ?? [])
          .toSorted(),
        pins: pins.length,
        pad: Boolean(pad),
        film,
        mask: masked,
        covered,
        onText,
        tie,
      };
    },
    [TOL, GAP_WINDOWS, BESIDE, REACH] as const,
  );
}

/** Each route and font in a context of its own, resized through T39's windows; `check` reads each. */
async function sweepT39(
  browser: Browser,
  check: (page: Page, where: string, size: number) => Promise<void>,
) {
  for (const route of T38A_ROUTES)
    for (const size of T39_SIZES) {
      const [first] = T39_WINDOWS;
      const { context, page } = await openAt(browser, route, size, {
        width: first[0],
        height: first[1],
      });
      try {
        for (const [width, height] of T39_WINDOWS) {
          await page.setViewportSize({ width, height });
          const where = `${route} at ${width} x ${height}, ${size} px default font`;
          await check(page, where, size);
        }
      } finally {
        await context.close();
      }
    }
}

const T39A =
  "T39a every crew pin shows: on /trials and /trials/320x568, at 320 x 568, 390 x 844, 1024 x 768, 1280 x 800 and 1440 x 900 and from 1024 to 1440 wide in 16 px steps at 768 tall, with a 16, 20, 24 and 28 px default font, every crew pin's dot (circle[data-pin], its 5 px ink) is wholly uncovered by the gap label's pad and text, every sounding's pad and number, and the ring's film where the ring isn't on that pin; a dot with a copy in its own ink drawn above the film (a shown use after .trials-ring-film) counts covered only where the copy's mask's hole (its black, half its stroke) reaches it, or where the film reaches it past the mask's reach (its white, half its stroke)";

test(T39A, async ({ browser }) => {
  test.setTimeout(150_000);
  await sweepT39(browser, async (page, where, size) => {
    const gap = await readGap(page);
    const seat = await readSeat(page);
    // The setting took, and every mark that could cover a dot is there to read.
    expect(gap.root, `the root's font, ${where}`).toBe(`${size}px`);
    expect(gap.gap, `the gap's label, ${where}`).toBe(GAP_TEXT);
    expect(
      [gap.soundings, gap.marks, seat.pad, seat.film > 0, seat.pins > 0],
      `soundings, their marks, the gap's pad, the ring's film and the dots, ${where}`,
    ).toEqual([4, 16, true, true, true]);
    expect(seat.marked, `the crew's windows marked, ${where}`).toEqual(
      CREW_WINDOWS,
    );
    expect
      .soft(
        seat.covered,
        `pins' dots covered, ${where} (the ring's film ${seat.film} px, the mask's reach ${seat.mask.reach} px and hole ${seat.mask.hole} px)`,
      )
      .toEqual([]);
  });
});

const T39B =
  "T39b the gap's label reads whole and stays with its dot: at T39a's routes, windows and fonts, \"−6.2\"'s text box (.trials-gap text) meets no sounding's pad, ring, dot or number, no crew pin's dot and no axis label, no sounding's number meets the gap's pad, and the label is tied to the 320 x 568 dot: its box (text and pad) comes within 8 px of the dot's edge, or a shown .trials-gap-leader comes within 3 px of both the dot's edge and the label's box";

test(T39B, async ({ browser }) => {
  test.setTimeout(150_000);
  await sweepT39(browser, async (page, where, size) => {
    const gap = await readGap(page);
    const seat = await readSeat(page);
    expect(gap.root, `the root's font, ${where}`).toBe(`${size}px`);
    expect(gap.gap, `the gap's label, ${where}`).toBe(GAP_TEXT);
    expect(
      [gap.soundings, gap.marks, gap.axis, seat.marked],
      `soundings, their marks, the axis labels and the crew's windows, ${where}`,
    ).toEqual([4, 16, 8, CREW_WINDOWS]);
    expect
      .soft(gap.hits, `the label against the soundings and axes, ${where}`)
      .toEqual([]);
    expect.soft(seat.onText, `pins' dots on the label, ${where}`).toEqual([]);
    expect
      .soft(seat.tie, `the label's tie to the 320 x 568 dot, ${where}`)
      .toMatchObject({ tied: true });
  });
});
