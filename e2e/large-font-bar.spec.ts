import { expect, type Page, test } from "@playwright/test";
import { MODES, MOTION, motionReady } from "./helpers";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 71 (.crew/sprint/71/contract.md, T32): the bar's motion control stays clear of Read as page
// at a large font. Atlas's sweep of production on 2026-11-16 found the control's slot a fixed 142 px
// from 1024 (`nav > [data-motion]` in app/globals.css) while its buttons are in rem, so at a large
// default font the group runs out of the slot's left edge and over Read as page, the link before it:
// touching at 1024 and 1180 x 20 px, 22 px over at 1180 to 1440 x 24 (952 against 930), 43 over at
// 1440 x 28 (1208 against 1165), on /, /log, /log/23 and /crew alike.
//
// Each page at each window and font, webfont blocked, once the buttons are in: where the group's
// first button shares a line with Read as page, its left edge is at or right of the link's right
// edge; each button and the link have their box and words inside the window; the page doesn't
// scroll sideways. Hiding the group's overflow isn't a fix, so each button's box and words are cut
// by no ancestor that hides overflow, and its words fit its own box (scrollWidth within
// clientWidth). One test per page, one context per font, the page resized through the widths, to
// keep CI's shards lean (.crew/STATE.md).
//
// The bar's breakpoints are in rem, and a media query's rem is the reader's default font, so the bar
// holds Read as page and the control only where the window is 48rem or wider: not at 1024 x 24, nor
// at 1024 or 1180 x 28, where the control is the foot's (T27 reads that row) and its buttons are
// read there for the window clause alone. Where the window is 48rem wide, the bar must show both, so
// hiding either isn't a fix. The sideways read is the whole page's: sprint 71 left out the record's
// step links (`.record-steps`), which scrolled /log/23 at 1920 x 28, until sprint 72 kept them in the
// window (.crew/sprint/72/contract.md, T33 in large-font-steps.spec.ts).

const ROUTES = ["/", "/log", "/log/23", "/crew"] as const;
const WIDTHS = [1024, 1180, 1440, 1920] as const;
const HEIGHT = 900;
/** The default font, Chrome's Large and Very large, and 28 past them. */
const SIZES = [16, 20, 24, 28] as const;

type Piece = {
  label: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  textLeft: number;
  textRight: number;
  lines: number;
  /** Its words wider than its own box (scrollWidth over clientWidth), in px. */
  spill: number;
  /** The nearest ancestor (or itself) hiding overflow that cuts its box or its words, if any. */
  clippedBy: string | null;
};

/** Read as page in the bar and the shown control's buttons, each with its box, words and cuts. */
function readBar(page: Page) {
  return page.evaluate((motion) => {
    const shown = (el: Element) => el.getClientRects().length > 0;
    type Edges = { left: number; right: number };
    const outside = (e: Edges, r: DOMRect) =>
      e.left < r.left - 0.5 || e.right > r.right + 0.5;
    const clipper = (el: Element, edges: Edges[]) => {
      for (
        let at: Element | null = el;
        at && at !== document.documentElement;
        at = at.parentElement
      ) {
        const s = getComputedStyle(at);
        const r = at.getBoundingClientRect();
        // An element's own overflow cuts only its contents (its words), not its box.
        const mine = edges.slice(at === el ? 1 : 0);
        if (s.overflowX !== "visible" && mine.some((e) => outside(e, r)))
          return `${at.tagName.toLowerCase()}.${String(at.className).trim().split(/\s+/).join(".")} (overflow-x ${s.overflowX}, ${r.left}..${r.right})`;
      }
      return null;
    };
    const read = (el: Element) => {
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      const lines = new Set(
        [...range.getClientRects()]
          .filter((r) => r.width > 0)
          .map((r) => Math.round(r.top)),
      ).size;
      return {
        label: (el.textContent ?? "").trim(),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        textLeft: text.left,
        textRight: text.right,
        lines,
        spill: el.scrollWidth - el.clientWidth,
        clippedBy: clipper(el, [box, text]),
      };
    };
    const nav = document.querySelector('header nav[aria-label="Main"]');
    const link = [...(nav?.querySelectorAll('a[href="/read"]') ?? [])].find(
      shown,
    );
    const slot = [...document.querySelectorAll(motion)].find(shown);
    const root = document.documentElement;
    const overflow = root.scrollWidth - root.clientWidth;
    return {
      root: getComputedStyle(root).fontSize,
      page: root.clientWidth,
      overflow,
      wide: matchMedia("(width >= 48rem)").matches,
      inBar: Boolean(slot && nav?.contains(slot)),
      link: link ? read(link) : null,
      buttons: slot ? [...slot.querySelectorAll("button")].map(read) : [],
    };
  }, MOTION);
}

/** Two boxes share a line where they overlap by more than a pixel top to bottom. */
const sameLine = (a: Piece, b: Piece) =>
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

/** A piece whole and inside the window: box and words between 0 and the page, one line, uncut. */
function expectWhole(piece: Piece, page: number, where: string) {
  const name = `"${piece.label}" ${where}`;
  expect.soft(piece.left, `${name}: its left edge`).toBeGreaterThanOrEqual(0);
  expect
    .soft(piece.right, `${name}: its right edge against the window's ${page}`)
    .toBeLessThanOrEqual(page);
  expect
    .soft(piece.textLeft, `${name}: its words' left edge`)
    .toBeGreaterThanOrEqual(0);
  expect
    .soft(
      piece.textRight,
      `${name}: its words' right edge against the window's ${page}`,
    )
    .toBeLessThanOrEqual(page);
  expect.soft(piece.lines, `${name}: the lines its words take`).toBe(1);
  expect
    .soft(
      piece.spill,
      `${name}: its words past its own box (scrollWidth - clientWidth)`,
    )
    .toBeLessThanOrEqual(0);
  expect
    .soft(piece.clippedBy, `${name}: what hides part of its box or words`)
    .toBeNull();
}

type Bar = Awaited<ReturnType<typeof readBar>>;

/** One window's read: the font took, no sideways scroll, the bar's pieces, the gap, each whole. */
function expectBar(read: Bar, size: number, where: string) {
  // The setting took: the root's font is the reader's default.
  expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
  expect
    .soft(read.overflow, `sideways overflow ${where}`)
    .toBeLessThanOrEqual(0);
  expect
    .soft(
      read.buttons.map((button) => button.label),
      `the control's shown buttons ${where}`,
    )
    .toEqual([...MODES]);
  if (read.wide) {
    expect
      .soft(read.link, `Read as page shown in the bar ${where}`)
      .not.toBeNull();
    expect.soft(read.inBar, `the control shown in the bar ${where}`).toBe(true);
  }
  const { link } = read;
  const first = read.buttons[0];
  if (link && first && read.inBar && sameLine(link, first))
    expect
      .soft(
        first.left,
        `"${first.label}"'s left edge against Read as page's right edge ${link.right} on the same line ${where}`,
      )
      .toBeGreaterThanOrEqual(link.right);
  for (const piece of [...(link ? [link] : []), ...read.buttons])
    expectWhole(piece, read.page, where);
}

const T32 =
  "T32 the bar's motion control stays clear of Read as page: at 1024, 1180, 1440 and 1920 x 900 with a 16, 20, 24 or 28 px default font, webfont blocked, once the control's buttons are in, its first button's left edge is at or right of Read as page's right edge wherever the two share a line, each button and the link have their box and words inside the window, whole and cut by nothing, and the page doesn't scroll sideways";

for (const route of ROUTES)
  test(`${T32} (${route})`, async ({ browser }) => {
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
        await motionReady(page);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          const where = `on ${route} at ${width} x ${HEIGHT}, ${size} px default font, fonts blocked`;
          expectBar(await readBar(page), size, where);
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
