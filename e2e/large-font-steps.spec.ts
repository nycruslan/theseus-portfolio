import { expect, type Page, test } from "@playwright/test";
import { recordOf } from "./log";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 72 (.crew/sprint/72/contract.md, T33): a Log record's step links stay inside the window at a
// large font. Atlas's sweep of production on 2026-11-16 found `.record-steps`' right edge, and the
// next link's arrow with it, past the window on every record with a next step: 23 px at 1536, 1600
// and 1792 x 24 px, 69 to 78 px at 1792 and 1920 x 28. The page scrolls sideways and "Seat sprint
// n's plank →" ends out of sight until it does; the step links are how a visitor walks the yard.
//
// Each record at each window and font, webfont blocked: both step links are shown, each one's box,
// words and arrow inside the window and cut by no ancestor that hides overflow, its words within its
// own box (scrollWidth within clientWidth); neither overlaps the other or the record's Rev line; the
// page doesn't scroll sideways. Hiding the row's overflow isn't a fix, so the cut is read from the
// boxes, not only the scroll. One test per record, one context per font, the page resized through
// the widths, to keep CI's shards lean (.crew/STATE.md). Named to sort in shard 1, beside the other
// large-font specs: its tests push shard 2's tail (Y8, B5.1 to B5.5) to shard 3 for three cheap
// log-entry tests, about 74 test-s out for 5 in (.crew/sprint/72/).

/** Records with both steps: the contract's three, early, middle and late in the yard. */
const PAGES = [recordOf(23), recordOf(45), recordOf(70)];
const WIDTHS = [1280, 1536, 1600, 1792, 1920] as const;
const HEIGHT = 900;
/** Chrome's Medium, Large and Very large default fonts, and 28 past them. */
const SIZES = [16, 20, 24, 28] as const;
const STEPS = ".record-steps a[data-step]";
const REV = ".record-rev";

type Box = { left: number; right: number; top: number; bottom: number };

/** The record's Rev line and its step links, each with its box, words, arrow and cuts. */
function readSteps(page: Page) {
  return page.evaluate(
    ([steps, rev]) => {
      const shown = (el: Element) => el.getClientRects().length > 0;
      const edges = (r: DOMRect) => ({
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      });
      const outside = (e: Box, r: DOMRect) =>
        e.left < r.left - 0.5 || e.right > r.right + 0.5;
      // The nearest of el and its ancestors that hides overflow and cuts a piece: an element's own
      // overflow cuts only its contents (words and arrow), never its box.
      const clipper = (el: Element, box: Box, inner: Box[]) => {
        for (
          let at: Element | null = el;
          at && at !== document.documentElement;
          at = at.parentElement
        ) {
          const s = getComputedStyle(at);
          const r = at.getBoundingClientRect();
          const mine = at === el ? inner : [box, ...inner];
          if (s.overflowX !== "visible" && mine.some((e) => outside(e, r)))
            return `${at.tagName.toLowerCase()}.${String(at.className).trim().split(/\s+/).join(".")} (overflow-x ${s.overflowX}, ${r.left}..${r.right})`;
        }
        return null;
      };
      // The words a visitor sees: each text node's ink, the screen reader's name (`.sr-only`, a
      // 1 px box whose text runs past it) left out.
      const ink = (el: Element) => {
        const rects: DOMRect[] = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walk.nextNode(); node; node = walk.nextNode()) {
          if (node.parentElement?.closest(".sr-only")) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
        }
        return rects;
      };
      // Lines by vertical overlap, not by top: the arrow is an inline-block, its glyph's box a few
      // px off the words' on the one line.
      const linesOf = (rects: DOMRect[]) => {
        const sorted = [...rects].sort((a, b) => a.top - b.top);
        let lines = 0;
        let bottom = Number.NEGATIVE_INFINITY;
        for (const r of sorted) {
          if (r.top >= bottom - 1) lines += 1;
          bottom = Math.max(bottom, r.bottom);
        }
        return lines;
      };
      const read = (el: Element) => {
        const box = edges(el.getBoundingClientRect());
        const rects = ink(el);
        const words = {
          left: Math.min(...rects.map((r) => r.left)),
          right: Math.max(...rects.map((r) => r.right)),
          top: Math.min(...rects.map((r) => r.top)),
          bottom: Math.max(...rects.map((r) => r.bottom)),
        };
        const lines = linesOf(rects);
        const mark = el.querySelector(".step-arrow");
        const arrow = mark ? edges(mark.getBoundingClientRect()) : null;
        return {
          step: el.getAttribute("data-step") ?? "",
          label: (el.textContent ?? "").trim(),
          box,
          words,
          arrow,
          lines,
          spill: el.scrollWidth - el.clientWidth,
          clippedBy: clipper(el, box, arrow ? [words, arrow] : [words]),
        };
      };
      const root = document.documentElement;
      const line = [...document.querySelectorAll(rev)].find(shown);
      return {
        root: getComputedStyle(root).fontSize,
        page: root.clientWidth,
        overflow: root.scrollWidth - root.clientWidth,
        rev: line ? edges(line.getBoundingClientRect()) : null,
        links: [...document.querySelectorAll(steps)].filter(shown).map(read),
      };
    },
    [STEPS, REV] as const,
  );
}

type Read = Awaited<ReturnType<typeof readSteps>>;
type Link = Read["links"][number];

/** How far two boxes overlap, in px each way; both positive is an overlap. */
const overlap = (a: Box, b: Box) => ({
  x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
  y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
});
const overlaps = (a: Box, b: Box) => {
  const o = overlap(a, b);
  return o.x > 0.5 && o.y > 0.5;
};

/** A piece between 0 and the window's width. */
function expectInside(box: Box, page: number, name: string) {
  expect.soft(box.left, `${name}: its left edge`).toBeGreaterThanOrEqual(0);
  expect
    .soft(box.right, `${name}: its right edge against the window's ${page}`)
    .toBeLessThanOrEqual(page);
}

/** A step link whole: box, words and arrow inside the window, one line, within its box, uncut. */
function expectWhole(link: Link, page: number, where: string) {
  const name = `"${link.label}" ${where}`;
  expectInside(link.box, page, `${name}, its box`);
  expectInside(link.words, page, `${name}, its words`);
  expect.soft(link.arrow, `${name}: its arrow`).not.toBeNull();
  if (link.arrow) expectInside(link.arrow, page, `${name}, its arrow`);
  expect.soft(link.lines, `${name}: the lines its words take`).toBe(1);
  expect
    .soft(
      link.spill,
      `${name}: its words past its own box (scrollWidth - clientWidth)`,
    )
    .toBeLessThanOrEqual(0);
  expect
    .soft(link.clippedBy, `${name}: what hides part of its box or words`)
    .toBeNull();
}

/** One window's read: the font took, no sideways scroll, both links whole, clear of each other. */
function expectSteps(read: Read, size: number, where: string) {
  // The setting took: the root's font is the reader's default.
  expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
  expect
    .soft(read.overflow, `sideways overflow ${where}`)
    .toBeLessThanOrEqual(0);
  expect
    .soft(
      read.links.map((link) => link.step),
      `the record's shown step links ${where}`,
    )
    .toEqual(["previous", "next"]);
  expect.soft(read.rev, `the record's Rev line ${where}`).not.toBeNull();
  for (const link of read.links) {
    expectWhole(link, read.page, where);
    if (read.rev)
      expect
        .soft(
          overlaps(link.box, read.rev),
          `"${link.label}" over the Rev line (overlap ${JSON.stringify(overlap(link.box, read.rev))}) ${where}`,
        )
        .toBe(false);
  }
  const [previous, next] = read.links;
  if (previous && next)
    expect
      .soft(
        overlaps(previous.box, next.box),
        `"${previous.label}" over "${next.label}" (overlap ${JSON.stringify(overlap(previous.box, next.box))}) ${where}`,
      )
      .toBe(false);
}

const T33 =
  "T33 a Log record's step links stay inside the window: at 1280, 1536, 1600, 1792 and 1920 x 900 with a 16, 20, 24 or 28 px default font, webfont blocked, both step links' boxes, words and arrows are inside the window, cut by nothing, their words within their boxes, clear of each other and the Rev line, and the page doesn't scroll sideways";

for (const route of PAGES)
  test(`${T33} (${route})`, async ({ browser }) => {
    test.setTimeout(90_000);
    for (const size of SIZES) {
      const { context, page, aborted } = await contextOf(browser, {
        width: WIDTHS[0],
        height: HEIGHT,
        blocked: true,
      });
      try {
        await setDefaultFont(context, page, size);
        const response = await page.goto(route);
        expect(response?.status(), `status of ${route}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          const where = `on ${route} at ${width} x ${HEIGHT}, ${size} px default font, fonts blocked`;
          expectSteps(await readSteps(page), size, where);
        }
        expect
          .soft(
            aborted.count,
            `web font requests refused on ${route} at ${size} px`,
          )
          .toBeGreaterThan(0);
      } finally {
        await context.close();
      }
    }
  });

// T33b, Iris's finding on the fix's first round (.crew/sprint/72/): a visitor walks the yard by
// clicking Next where it was, again and again. Where the steps stack at a large font and the stack
// lines up at its end, Next on one record and ← Sprint p on the next sit at one point once the
// numbers grow a place or the words a line (/log/9 to /log/10 webfont blocked, /log/10 to /log/11
// with the face, at 1536 x 24), so the second click goes back a record. On consecutive records that
// straddle that wrap, and one pair past it, the centre of Next's box and its arrow's point on record
// n must not hit ← Sprint p on record n + 1 (Next there, or nothing, is fine), each page scrolled as
// far as a visitor scrolls to see Next whole on record n (at 1792 x 28 it starts under the fold).
// Both with the face and without it, since each moves the wrap; one test, one context per window
// and face.

/** Consecutive records, each walked from the one before: the wrap's boundary, then a later pair. */
const WALKS = [
  [8, 9, 10, 11],
  [23, 24],
] as const;
/** The windows and fonts where the steps stack: Very large at 1536, 28 px at 1792. */
const STACKED = [
  [1536, 24],
  [1792, 28],
] as const;

type Point = { name: string; x: number; y: number };
/** Where a visitor clicks: points in the window with the page scrolled to `scroll`. */
type Clicks = { scroll: number; points: Point[] };

/** The step link (its data-step) each point hits with the page at `scroll`, null where none. */
function stepsAt(page: Page, clicks: Clicks) {
  return page.evaluate(({ scroll, points }) => {
    window.scrollTo({ top: scroll, behavior: "instant" });
    return {
      scroll: window.scrollY,
      hits: points.map(
        (p) =>
          document
            .elementFromPoint(p.x, p.y)
            ?.closest("a[data-step]")
            ?.getAttribute("data-step") ?? null,
      ),
    };
  }, clicks);
}

/**
 * Next's centre and its arrow's point, with the page scrolled as a visitor would to see Next whole
 * (at 1792 x 28 it starts under the fold), or null where there is no Next.
 */
function nextClicks(page: Page): Promise<Clicks | null> {
  return page.evaluate(() => {
    const next = document.querySelector('.record-steps a[data-step="next"]');
    const arrow = next?.querySelector(".step-arrow");
    if (!next || !arrow) return null;
    const below = next.getBoundingClientRect().bottom + 16 - innerHeight;
    if (below > 0)
      window.scrollTo({ top: scrollY + below, behavior: "instant" });
    const box = next.getBoundingClientRect();
    const tip = arrow.getBoundingClientRect();
    return {
      scroll: scrollY,
      points: [
        {
          name: "Next's centre",
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        },
        {
          name: "its arrow's point",
          x: tip.right - 1,
          y: tip.top + tip.height / 2,
        },
      ],
    };
  });
}

const T33B =
  "T33b a repeated click on Next walks on: at 1536 x 900 with a 24 px and 1792 x 900 with a 28 px default font, with the webfont and without it, on /log/8 to /log/11 and /log/23 to /log/24, the centre of Next's box and its arrow's point on record n hit Next there, and on record n + 1 never ← Sprint p";

test(T33B, async ({ browser }) => {
  test.setTimeout(90_000);
  for (const [width, size] of STACKED)
    for (const blocked of [true, false]) {
      const { context, page } = await contextOf(browser, {
        width,
        height: HEIGHT,
        blocked,
      });
      const where = `at ${width} x ${HEIGHT}, ${size} px default font, ${blocked ? "fonts blocked" : "with the webfont"}`;
      try {
        await setDefaultFont(context, page, size);
        for (const walk of WALKS) {
          let clicks: Clicks | null = null;
          let from = 0;
          for (const n of walk) {
            const route = recordOf(n);
            const response = await page.goto(route);
            expect(response?.status(), `status of ${route}`).toBe(200);
            await page.evaluate(() => document.fonts.ready);
            expect(
              await page.evaluate(
                () => getComputedStyle(document.documentElement).fontSize,
              ),
              `the root's font on ${route} ${where}`,
            ).toBe(`${size}px`);
            if (clicks) {
              const again = await stepsAt(page, clicks);
              expect
                .soft(
                  again.scroll,
                  `${route} scrolled where ${recordOf(from)} was ${where}`,
                )
                .toBe(clicks.scroll);
              for (const [i, p] of clicks.points.entries())
                expect
                  .soft(
                    again.hits[i],
                    `${p.name} on ${recordOf(from)} (${Math.round(p.x)}, ${Math.round(p.y)}, scrolled ${Math.round(clicks.scroll)}), clicked again on ${route} ${where}`,
                  )
                  .not.toBe("previous");
            }
            if (n === walk[walk.length - 1]) break;
            // The points a visitor clicks here, each proved on Next before it is tried on the next.
            clicks = await nextClicks(page);
            expect
              .soft(clicks, `Next and its arrow on ${route} ${where}`)
              .not.toBeNull();
            if (clicks)
              expect
                .soft(
                  (await stepsAt(page, clicks)).hits,
                  `what Next's centre and its arrow's point hit on ${route} ${where}`,
                )
                .toEqual(["next", "next"]);
            from = n;
          }
        }
      } finally {
        await context.close();
      }
    }
});
