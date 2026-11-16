import { type Browser, expect, type Page, test } from "@playwright/test";
import { NEWEST, RECORD, recordOf } from "./log";
import { contextOf, setDefaultFont } from "./reader-font";
import { STEPS } from "./retros";

// Sprint 72 (.crew/sprint/72/contract.md, T33): a record's step links stay in the window at a large
// font. Atlas's sweep of production on 2026-11-16 found /log/23 and /log/45 scrolling sideways 23 px
// at 1536, 1600 and 1792 x 24 and 78 px at 1792 and 1920 x 28, what ran past the window being
// `.record-steps`, its Next link and Next's arrow. On main's build, webfont blocked, every step with
// both links (/log/2 to the one before the newest) did it at 1792 and 1920 x 28 (44 to 69 px, the
// longer the numbers the further) and from /log/9 at 1536 to 1792 x 24 (3 to 14 px); /log/2 to /log/8
// at 24 ran past the record's frame without scrolling the page (Forge's sweep); /log/1 (no
// Previous) and the newest (no Next) did neither.
//
// So every step, at 1536, 1600, 1792 and 1920 x 900 with a 16, 20, 24 and 28 px default font (the
// root's computed font asserted to have taken, T27's pattern), webfont blocked: each step link the
// step has (Previous but on the first, Next but on the newest) leads to its step and shows its words
// and its arrow; its box, its arrow's box and its words are inside the window, its box and arrow
// inside the record's frame, its words within its own box (scrollWidth within clientWidth) and cut
// by no ancestor that hides overflow; and the page doesn't scroll sideways. The links are read, not
// their row: the fix may give `.record-steps` no box (display: contents). Hiding the overflow isn't a
// fix: an `overflow: hidden` on `.record-steps` and an `overflow-x: clip` on the page both stop the
// scroll on main and both stay red, the links' boxes past the window and the frame and cut.
//
// The contract's pages (/log/23, /log/45, /log/1 and the newest) and /log/2 are read as a visitor
// has them, scripts on (WebGL refused, so the yard's links are the record's), one context per font.
// Every step is read as the server sends it, scripts off, in one test: one load a step, one resize a
// width, the font changed in place. Each window costs a relayout (~45 ms here), so the sweep's 1,100
// windows are its time, about 1.5 minutes on one worker; its faults are gathered and asserted once a
// window, since single soft assertions cost more than the reads did.

/** A Node timer: biome bans waitForTimeout, and with scripts off no page timer runs. */
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The contract's pages, and /log/2, whose one-digit links ran past the record but not the window. */
const PAGES = [...new Set([23, 45, 1, NEWEST, 2])];
const WIDTHS = [1536, 1600, 1792, 1920] as const;
const HEIGHT = 900;
/** The default font, Chrome's Large and Very large, and 28 past them. */
const SIZES = [16, 20, 24, 28] as const;

/** Step n's neighbours in the Log's order: its step links' numbers, where it has them. */
function neighbours(n: number) {
  const i = STEPS.indexOf(n);
  return {
    previous: i > 0 ? STEPS[i - 1] : undefined,
    next: i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1] : undefined,
  };
}

/** The record's step links, each with its shown words, its box, its arrow's box, its words' edges and cuts. */
function readSteps(page: Page) {
  return page.evaluate((frame) => {
    type Edges = { left: number; right: number };
    const outside = (e: Edges, r: DOMRect) =>
      e.left < r.left - 0.5 || e.right > r.right + 0.5;
    const named = (at: Element, s: CSSStyleDeclaration, r: DOMRect) =>
      `${at.tagName.toLowerCase()}.${String(at.className).trim().split(/\s+/).join(".")} (overflow-x ${s.overflowX}, ${r.left}..${r.right})`;
    // A box-less ancestor (display: contents, as the fix makes `.record-steps` from 64rem) clips
    // nothing, whatever its overflow reads.
    const clips = (s: CSSStyleDeclaration) =>
      s.display !== "contents" && s.overflowX !== "visible";
    const clipper = (el: Element, edges: Edges[]) => {
      for (
        let at: Element | null = el;
        at && at !== document.documentElement;
        at = at.parentElement
      ) {
        const s = getComputedStyle(at);
        const r = at.getBoundingClientRect();
        // An element's own overflow cuts only its contents (its words and arrow), not its box.
        const mine = edges.slice(at === el ? 1 : 0);
        if (clips(s) && mine.some((e) => outside(e, r))) return named(at, s, r);
      }
      return null;
    };
    const edges = (r: DOMRect) => ({ left: r.left, right: r.right });
    const root = document.documentElement;
    // The record's frame: inside its 1 px border.
    const record = document.querySelector(frame);
    const framed = record?.getBoundingClientRect();
    const links = [
      ...document.querySelectorAll(".record-steps a[data-step]"),
    ].map((a) => {
      const box = a.getBoundingClientRect();
      // The shown words: the link's first span (the second, on Previous, is for screen readers).
      const words = a.querySelector(":scope > span:not(.sr-only)");
      const range = document.createRange();
      range.selectNodeContents(words ?? a);
      const text = range.getBoundingClientRect();
      const arrow = a.querySelector(".step-arrow");
      const arrowBox = arrow?.getBoundingClientRect();
      return {
        step: a.getAttribute("data-step"),
        href: a.getAttribute("href"),
        words: (words?.textContent ?? "").replace(/\s+/g, " ").trim(),
        arrow: (arrow?.textContent ?? "").trim(),
        arrowShown: arrow
          ? arrow.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }) && arrow.getClientRects().length > 0
          : false,
        box: edges(box),
        arrowBox: arrowBox ? edges(arrowBox) : null,
        text: edges(text),
        spill: a.scrollWidth - a.clientWidth,
        clippedBy: clipper(a, [box, text, ...(arrowBox ? [arrowBox] : [])]),
      };
    });
    return {
      root: getComputedStyle(root).fontSize,
      page: root.clientWidth,
      overflow: root.scrollWidth - root.clientWidth,
      frame:
        record && framed
          ? {
              left: framed.left + record.clientLeft,
              right: framed.left + record.clientLeft + record.clientWidth,
            }
          : null,
      links,
    };
  }, RECORD);
}

type Read = Awaited<ReturnType<typeof readSteps>>;

type Span = { left: number; right: number } | null;

/**
 * One window's read of step n against T33, as the faults it finds (none when it holds): no sideways
 * scroll, the step links the step has, each with its target, words and shown arrow, its box, arrow
 * and words inside the window, its box and arrow inside the record's frame, its words within its
 * own box and cut by nothing. Faults are gathered and asserted once a window: over 71 steps, 16
 * windows each, single soft assertions cost more than the reads (Probe's profile, sprint 72).
 */
function faults(read: Read, n: number) {
  const found: string[] = [];
  const fault = (ok: boolean, what: string) => {
    if (!ok) found.push(what);
  };
  fault(read.overflow <= 0, `the page scrolls sideways ${read.overflow} px`);
  const { previous, next } = neighbours(n);
  const want = [
    ...(previous === undefined
      ? []
      : [["previous", previous, `←Sprint ${previous}`, "←"] as const]),
    ...(next === undefined
      ? []
      : [["next", next, `Seat sprint ${next}'s plank→`, "→"] as const]),
  ];
  const steps = read.links.map((link) => link.step).join(", ");
  fault(
    steps === want.map(([step]) => step).join(", "),
    `the step links are [${steps}]`,
  );
  const inside = (e: Span, what: string) =>
    fault(
      e !== null && e.left >= 0 && e.right <= read.page,
      `${what} at ${e?.left}..${e?.right}, past the window's 0..${read.page}`,
    );
  // The record's frame: a link out past its border reads as cut loose even where the page doesn't
  // scroll (/log/2 to /log/8 at 24 px on main, 34 px past it, Forge's sweep).
  const { frame } = read;
  fault(frame !== null, "no record's frame");
  const framed = (e: Span, what: string) =>
    fault(
      !frame ||
        (e !== null &&
          e.left >= frame.left - 0.5 &&
          e.right <= frame.right + 0.5),
      `${what} at ${e?.left}..${e?.right}, past the record's frame ${frame?.left}..${frame?.right}`,
    );
  for (const [step, number, words, arrow] of want) {
    const link = read.links.find((l) => l.step === step);
    const name = `${step === "previous" ? "Previous" : "Next"} ("${words}")`;
    if (!link) continue;
    fault(link.href === recordOf(number), `${name} leads to ${link.href}`);
    fault(link.words === words, `${name} shows "${link.words}"`);
    fault(
      link.arrow === arrow && link.arrowShown,
      `${name}'s arrow is "${link.arrow}", shown ${link.arrowShown}`,
    );
    inside(link.box, `${name}'s box`);
    inside(link.arrowBox, `${name}'s arrow`);
    inside(link.text, `${name}'s words`);
    framed(link.box, `${name}'s box`);
    framed(link.arrowBox, `${name}'s arrow`);
    fault(
      link.spill <= 0,
      `${name}'s words run ${link.spill} px past its own box (scrollWidth - clientWidth)`,
    );
    fault(link.clippedBy === null, `${name} is cut by ${link.clippedBy}`);
  }
  return found;
}

/** One window's read: the font took (T27's pattern), then T33's faults, none. */
function expectSteps(read: Read, n: number, size: number, where: string) {
  expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
  expect.soft(faults(read, n), `T33's faults ${where}`).toEqual([]);
}

/** A context at the reader's default font with the webfont refused, scripts on or off. */
async function atFont(browser: Browser, size: number, scripts: boolean) {
  const opened = await contextOf(browser, {
    width: WIDTHS[0],
    height: HEIGHT,
    scripts,
    blocked: true,
  });
  await setDefaultFont(opened.context, opened.page, size);
  return opened;
}

/** Load step n and wait for its fonts to settle (polled: with scripts off no promise resolves). */
async function go(page: Page, n: number) {
  const response = await page.goto(recordOf(n));
  for (
    let i = 0;
    i < 50 && (await page.evaluate(() => document.fonts.status)) !== "loaded";
    i++
  )
    await pause(100);
  return response?.status();
}

const T33 =
  "T33 a record's step links stay in the window: at 1536, 1600, 1792 and 1920 x 900 with a 16, 20, 24 or 28 px default font, webfont blocked, each step link the step has shows its words and its arrow, its box, its arrow and its words inside the window, its words within its own box and cut by nothing, and the page doesn't scroll sideways";

test(`${T33} (/log/23, /log/45, /log/1 and the newest step, scripts on)`, async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const size of SIZES) {
    const { context, page, aborted } = await atFont(browser, size, true);
    try {
      for (const n of PAGES) {
        expect(await go(page, n), `status of ${recordOf(n)}`).toBe(200);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: HEIGHT });
          const where = `on ${recordOf(n)} at ${width} x ${HEIGHT}, ${size} px default font, fonts blocked, scripts on`;
          expectSteps(await readSteps(page), n, size, where);
        }
      }
      expect
        .soft(aborted.count, `web font requests refused at ${size} px`)
        .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  }
});

test(`${T33} (every step, scripts off)`, async ({ browser }) => {
  test.setTimeout(300_000);
  expect(STEPS.length, "the Log's steps").toBeGreaterThan(1);
  const { context, page, aborted } = await contextOf(browser, {
    width: WIDTHS[0],
    height: HEIGHT,
    scripts: false,
    blocked: true,
  });
  try {
    const cdp = await context.newCDPSession(page);
    for (const n of STEPS) {
      expect.soft(await go(page, n), `status of ${recordOf(n)}`).toBe(200);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        for (const size of SIZES) {
          // The font changed on the loaded page: with scripts off the layout is the CSS's alone,
          // and it lays out as a fresh load at that font does (Probe's read of main: 8 steps, 128
          // windows, no box apart), for one load a step and one resize a width (~45 ms each).
          await cdp.send("Page.setFontSizes", {
            fontSizes: { standard: size },
          });
          const where = `on ${recordOf(n)} at ${width} x ${HEIGHT}, ${size} px default font, fonts blocked, scripts off`;
          expectSteps(await readSteps(page), n, size, where);
        }
      }
    }
    expect.soft(aborted.count, "web font requests refused").toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
