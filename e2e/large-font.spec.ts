import { type Browser, expect, type Page, test } from "@playwright/test";
import { horizontalOverflow, MODES, MOTION, motionReady } from "./helpers";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 68 (.crew/sprint/68/contract.md, T27): a reader's large font keeps Contact whole. Sprint 67
// measured it on main (.crew/sprint/67/pr.md): at 320 x 568, from a 21 px default font the bar's
// Contact pushes every page sideways, and at 24 px it is cut to "Con" (right edge 373); at 24 the
// motion control's Off runs out too (327). Here, on every route T25 visits (/crew, /log), the sheet
// and the trials, at 21 and 24 px, webfont and fonts blocked: no sideways scroll, and each bar link
// the window shows and each of the control's three buttons is whole, its box and its words inside
// the page, its words on one line and clipped by nothing (no ancestor that hides overflow cuts
// them), so hiding the overflow isn't a fix. The bar shows its four links at 320 and keeps them (the
// contract's outcome). Sprint 68's sweep found two more things that scroll a page at 24 px past the
// bar: the sheet's drawing (its DWL and Base figures, to 341) and the trials' Freeboard reading (to
// 340), so the trials, which T25 doesn't visit, are read here too (Atlas's call, sprint 68). Last,
// Lens's finding on the fix: the control's buttons arrive with scripts, and on /crew and /log at 24
// px the foot's row took a second line only then, so the page jumped 44 px after it showed. So on
// each page with the control, the foot's top and height and the top of what follows it are the same
// with scripts off (the page as the server sends it, before the buttons arrive) as after them.

/** Each route, and whether it has a model and so the motion control (the trials have neither). */
const ROUTES = [
  ["/", true],
  ["/crew", true],
  ["/log", true],
  ["/trials", false],
] as const;
/** From 21 px the bar ran out on main; 24 is Chrome's "Very large". */
const SIZES = [21, 24] as const;
/** Each read: fonts blocked or not, and the default font. */
const READS = [false, true].flatMap((blocked) =>
  SIZES.map((size) => [blocked, size] as const),
);
/** The bar's links a 320 window shows: Read as page is hidden below 768 (components/bar.tsx). */
const BAR_LINKS = ["Work", "Crew", "Log", "Contact"];

type Piece = {
  label: string;
  left: number;
  right: number;
  textLeft: number;
  textRight: number;
  lines: number;
  /** The nearest ancestor (or itself) hiding overflow that cuts the words, if any. */
  clippedBy: string | null;
};

/** The bar's shown links and the shown control's buttons, each with its box and its words' edges. */
function readPieces(page: Page) {
  return page.evaluate((motion) => {
    const shown = (el: Element) => el.getClientRects().length > 0;
    // The nearest of el and its ancestors that hides overflow and cuts the words.
    const clipper = (el: Element, text: DOMRect) => {
      for (
        let at: Element | null = el;
        at && at !== document.documentElement;
        at = at.parentElement
      ) {
        const s = getComputedStyle(at);
        const r = at.getBoundingClientRect();
        const cut = text.left < r.left - 0.5 || text.right > r.right + 0.5;
        if (s.overflowX !== "visible" && cut)
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
        textLeft: text.left,
        textRight: text.right,
        lines,
        clippedBy: clipper(el, text),
      };
    };
    const links = [
      ...document.querySelectorAll('header nav[aria-label="Main"] a'),
    ]
      .filter(shown)
      .map(read);
    const slot = [...document.querySelectorAll(motion)].find(shown);
    const buttons = slot
      ? [...slot.querySelectorAll("button")].filter(shown).map(read)
      : [];
    return {
      root: getComputedStyle(document.documentElement).fontSize,
      page: document.documentElement.clientWidth,
      links,
      buttons,
    };
  }, MOTION);
}

/**
 * The foot holding the shown control slot, in the page's coordinates, and what follows it on the
 * page: the box outside the foot that starts nearest under it, found by where it sits, since CSS
 * places the Log's foot under its h1 while the DOM's next sibling is a hidden live region. Given
 * `path`, the CSS path an earlier read found, it reads that element instead, so before and after
 * read one element.
 */
function readFoot(page: Page, path?: string) {
  return page.evaluate(
    ([motion, given]) => {
      const shown = (el: Element) => el.getClientRects().length > 0;
      const top = (el: Element) => el.getBoundingClientRect().top + scrollY;
      const foot = [...document.querySelectorAll("[data-foot]")].find(
        (el) => shown(el) && [...el.querySelectorAll(motion)].some(shown),
      );
      if (!foot) return null;
      const box = foot.getBoundingClientRect();
      const bottom = box.bottom + scrollY;
      const pathOf = (el: Element): string =>
        el.parentElement && el !== document.body
          ? `${pathOf(el.parentElement)} > :nth-child(${[...el.parentElement.children].indexOf(el) + 1})`
          : "body";
      const below = [...document.querySelectorAll("main *")].filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width > 1 &&
          r.height > 1 &&
          !foot.contains(el) &&
          !el.contains(foot) &&
          top(el) >= bottom - 1
        );
      });
      const nearest = below.reduce<Element | null>(
        (best, el) => (!best || top(el) < top(best) ? el : best),
        null,
      );
      const next = given ? document.querySelector(given) : nearest;
      return {
        top: box.top + scrollY,
        height: box.height,
        next: next ? top(next) : null,
        path: given || (nearest ? pathOf(nearest) : null),
      };
    },
    [MOTION, path ?? ""] as const,
  );
}

/** The foot as the server sends it: the same window, font and fonts, with scripts off. */
async function footBefore(
  browser: Browser,
  name: string,
  size: number,
  blocked: boolean,
) {
  const { context, page } = await contextOf(browser, {
    width: 320,
    height: 568,
    blocked,
    scripts: false,
  });
  try {
    await setDefaultFont(context, page, size);
    await page.goto(name);
    await page.evaluate(() => document.fonts.ready);
    return await readFoot(page);
  } finally {
    await context.close();
  }
}

type Foot = Awaited<ReturnType<typeof readFoot>>;

/** Nothing moves when the buttons arrive: the foot's top and height, and the next thing's top. */
function expectFootHolds(before: Foot, after: Foot, where: string) {
  expect.soft(before, `the foot with scripts off ${where}`).not.toBeNull();
  expect.soft(after, `the foot with its buttons ${where}`).not.toBeNull();
  expect.soft(before?.path, `something under the foot ${where}`).toBeTruthy();
  if (!before || !after) return;
  expect
    .soft(
      after.height,
      `the foot's height with its buttons ${where}, against ${before.height} before`,
    )
    .toBeCloseTo(before.height, 0);
  expect
    .soft(
      after.top,
      `the foot's top with its buttons ${where}, against ${before.top} before`,
    )
    .toBeCloseTo(before.top, 0);
  expect
    .soft(
      after.next,
      `the top of what follows the foot (${before.path}) with its buttons ${where}, against ${before.next} before`,
    )
    .toBeCloseTo(before.next ?? Number.NaN, 0);
}

/** Each piece whole and inside the page: box and words between 0 and the page, one line, unclipped. */
function expectWhole(piece: Piece, page: number, where: string) {
  const name = `${piece.label} ${where}`;
  expect
    .soft(piece.right, `${name}: its right edge against the page's ${page}`)
    .toBeLessThanOrEqual(page);
  expect.soft(piece.left, `${name}: its left edge`).toBeGreaterThanOrEqual(0);
  expect
    .soft(
      piece.textRight,
      `${name}: its words' right edge against the page's ${page}`,
    )
    .toBeLessThanOrEqual(page);
  expect
    .soft(piece.textLeft, `${name}: its words' left edge`)
    .toBeGreaterThanOrEqual(0);
  expect.soft(piece.lines, `${name}: the lines its words take`).toBe(1);
  expect
    .soft(piece.clippedBy, `${name}: what hides part of its words`)
    .toBeNull();
}

const T27 =
  "T27 a large font keeps the bar whole: at 320 x 568 with a 21 or 24 px default font, webfont and fonts blocked, the page has no horizontal scroll, and the bar's four links and, where a page has it, the motion control's three buttons are each whole, their right edges inside the page, and the foot that holds the control keeps its top and height, and what follows it its top, from before its buttons arrive (scripts off) to after";

for (const [name, control] of ROUTES) {
  test(`${T27} (${name})`, async ({ browser }) => {
    test.setTimeout(90_000);
    for (const [blocked, size] of READS) {
      const where = `on ${name} at 320 x 568, ${size} px default font, ${blocked ? "fonts blocked" : "webfont"}`;
      const { context, page } = await contextOf(browser, {
        width: 320,
        height: 568,
        blocked,
      });
      try {
        await setDefaultFont(context, page, size);
        const response = await page.goto(name);
        expect(response?.status(), `status of ${name}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        if (control) await motionReady(page);
        const read = await readPieces(page);
        // The setting took: the root's font is the reader's default.
        expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
        expect
          .soft(await horizontalOverflow(page), `sideways overflow ${where}`)
          .toBeLessThanOrEqual(0);
        expect
          .soft(
            read.links.map((link) => link.label),
            `the bar's shown links ${where}`,
          )
          .toEqual(BAR_LINKS);
        expect
          .soft(
            read.buttons.map((button) => button.label),
            `the motion control's shown buttons ${where}`,
          )
          .toEqual(control ? [...MODES] : []);
        for (const piece of [...read.links, ...read.buttons])
          expectWhole(piece, read.page, where);
        if (control) {
          const before = await footBefore(browser, name, size, blocked);
          const after = await readFoot(page, before?.path ?? undefined);
          expectFootHolds(before, after, where);
        }
      } finally {
        await context.close();
      }
    }
  });
}
