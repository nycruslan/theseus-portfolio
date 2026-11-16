import { expect, type Page, test } from "@playwright/test";
import { recordOf } from "./log";
import { contextOf, setDefaultFont } from "./reader-font";
import { NEWEST_STEP } from "./retros";

// Sprint 73 (.crew/sprint/73/contract.md, T34): the yard's hint stays clear of the step links at a
// large font. Atlas's sweep of production on 2026-11-16 (WebGL on, the hint shows only while the
// yard plays) found `.record-hint`'s line a fixed 14 px under type of `--step-sm`: at 320 x 24 and
// 28 it wraps to two lines 14 px apart whose text is 24 and 27 px tall, "Hold to flip through"
// printed over "the sprints" on every record; on the newest record its text runs into the hand-off
// ("Watch the crew build the next one on Crew") and ← Sprint p from 20 px at 320, at 390 x 24 and
// 28, and at 1440 and 1920; on /log/70 at 1920 x 24 and 28 it runs into Next.
//
// Each record at each window and font, webfont blocked, the hint shown by setting data-yard on the
// model by hand as H3 does (checks refuse WebGL): the hint's lines (its text's client rects) don't
// print over one another; its text overlaps the text of a step link, the hand-off, or any other
// words on the page by no more than it does at 16 px at the same width (measured here: at 16 px a
// 14 px line under a 16 px text box already touches by a pixel or two, which reads clean); the page
// doesn't scroll sideways; the hint is whole inside the window. One test per record, one context
// per font, the page resized through the windows, to keep CI's shards lean (.crew/STATE.md); named
// to sort with the other large-font specs in shard 1.

/** A middle record with both steps, and the newest, with ← Sprint p and the hand-off. */
const PAGES = [
  { route: recordOf(70), steps: ["previous", "next"], handOff: false },
  { route: recordOf(NEWEST_STEP), steps: ["previous"], handOff: true },
] as const;
const WINDOWS = [
  { width: 320, height: 568 },
  { width: 390, height: 664 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;
/** Chrome's Medium, Large and Very large default fonts, and 28 past them; 16 first, the baseline. */
const SIZES = [16, 20, 24, 28] as const;
const HINT = "[data-yard-hint]";
/** The yard playing the step links, as CSS reads it (H3's hook). */
const PLAYING = ".log:has(> [data-model][data-yard])";

type Box = { left: number; right: number; top: number; bottom: number };

/** The hint's text, and how deep it runs into each other piece of words the page shows. */
function readHint(page: Page) {
  return page.evaluate(
    ([hint, playing]) => {
      const edges = (r: DOMRect): Box => ({
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      });
      // How far two boxes would have to move apart to stop overlapping; 0 where they don't.
      const depth = (a: Box, b: Box) =>
        Math.max(
          0,
          Math.min(
            Math.min(a.right, b.right) - Math.max(a.left, b.left),
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
          ),
        );
      const rectsOf = (node: Node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((r) => r.width > 0);
      };
      const root = document.documentElement;
      const el = [...document.querySelectorAll(hint)].find(
        (h) => h.getClientRects().length > 0,
      );
      const lines = el ? [...el.childNodes].flatMap(rectsOf).map(edges) : [];
      // Every other run of words a visitor sees, named by its link where it's a step or the
      // hand-off, else by its element and words. The screen reader's names (`.sr-only`, a 1 px box
      // its words run past) and what never paints are left out.
      const neighbours: Record<string, number> = {};
      const walk = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        const parent = node.parentElement;
        if (!parent || !el || el.contains(parent)) continue;
        if (parent.closest(".sr-only, script, style, template, noscript"))
          continue;
        const words = (node.textContent ?? "").replace(/\s+/g, " ").trim();
        if (!words) continue;
        if (
          !parent.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        )
          continue;
        const link = parent.closest("a[data-step], a[data-hand-off]");
        const name = link
          ? link.hasAttribute("data-hand-off")
            ? "the hand-off"
            : `the ${link.getAttribute("data-step")} step`
          : `${parent.tagName.toLowerCase()} "${words.slice(0, 40)}"`;
        const deepest = Math.max(
          0,
          ...rectsOf(node).flatMap((r) => lines.map((l) => depth(l, edges(r)))),
        );
        neighbours[name] = Math.max(neighbours[name] ?? 0, deepest);
      }
      return {
        root: getComputedStyle(root).fontSize,
        page: root.clientWidth,
        overflow: root.scrollWidth - root.clientWidth,
        playing: document.querySelector(playing) !== null,
        shown:
          el?.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }) ?? false,
        box: el ? edges(el.getBoundingClientRect()) : null,
        lines,
        steps: [...document.querySelectorAll(".record-steps a[data-step]")]
          .filter((a) => a.getClientRects().length > 0)
          .map((a) => a.getAttribute("data-step")),
        handOff: [...document.querySelectorAll("a[data-hand-off]")].some(
          (a) => a.closest(".record") && a.getClientRects().length > 0,
        ),
        neighbours,
      };
    },
    [HINT, PLAYING] as const,
  );
}

type Read = Awaited<ReturnType<typeof readHint>>;

/** Pairs of the hint's lines that print over each other (both ways more than half a pixel). */
function crossed(lines: Box[]) {
  const pairs: string[] = [];
  for (const [i, a] of lines.entries())
    for (const b of lines.slice(i + 1)) {
      if (Math.abs(a.top - b.top) <= 0.5) continue;
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 0.5 && y > 0.5)
        pairs.push(
          `${a.top.toFixed(1)}..${a.bottom.toFixed(1)} over ${b.top.toFixed(1)}..${b.bottom.toFixed(1)} by ${y.toFixed(1)} px`,
        );
    }
  return pairs;
}

/** A piece of the hint between 0 and the window's width. */
function expectInside(
  name: string,
  box: Box | null,
  page: number,
  where: string,
) {
  expect.soft(box, `the hint's ${name} ${where}`).not.toBeNull();
  if (!box) return;
  expect
    .soft(box.left, `the hint's ${name}: its left edge ${where}`)
    .toBeGreaterThanOrEqual(-0.5);
  expect
    .soft(
      box.right,
      `the hint's ${name}: its right edge against the window's ${page} ${where}`,
    )
    .toBeLessThanOrEqual(page + 0.5);
}

/**
 * One window's read: the yard's hook and the record's links as the contract has them, the hint's
 * lines clear of each other, its text no deeper into any other words than `base` (the 16 px read
 * at this width), whole inside the window, and no sideways scroll.
 */
function expectHint(
  read: Read,
  record: (typeof PAGES)[number],
  base: Read["neighbours"],
  where: string,
) {
  expect.soft(read.playing, `${PLAYING} ${where}`).toBe(true);
  expect.soft(read.shown, `the hint shown ${where}`).toBe(true);
  expect
    .soft(read.steps, `the record's shown step links ${where}`)
    .toEqual([...record.steps]);
  expect
    .soft(read.handOff, `the record's hand-off shown ${where}`)
    .toBe(record.handOff);
  expect
    .soft(read.lines.length, `the hint's lines ${where}`)
    .toBeGreaterThan(0);
  expect
    .soft(crossed(read.lines), `the hint's lines over each other ${where}`)
    .toEqual([]);
  const allowed = (name: string) => (base[name] ?? 0) + 0.5;
  const named = [
    ...read.steps.map((step) => `the ${step} step`),
    ...(read.handOff ? ["the hand-off"] : []),
  ];
  for (const name of named)
    expect
      .soft(
        read.neighbours[name] ?? Number.NaN,
        `the hint's text into ${name}'s, in px (${(base[name] ?? 0).toFixed(1)} at 16 px) ${where}`,
      )
      .toBeLessThanOrEqual(allowed(name));
  // The goal's h2 under the hint, the ghost's caption under the placed row: any words at all.
  const others = Object.entries(read.neighbours)
    .filter(([name, d]) => !named.includes(name) && d > allowed(name))
    .map(
      ([name, d]) =>
        `${name}: ${d.toFixed(1)} px (${(base[name] ?? 0).toFixed(1)} at 16 px)`,
    );
  expect
    .soft(others, `other words the hint's text runs into ${where}`)
    .toEqual([]);
  expect
    .soft(read.overflow, `sideways overflow ${where}`)
    .toBeLessThanOrEqual(0);
  expectInside("box", read.box, read.page, where);
  for (const [i, line] of read.lines.entries())
    expectInside(`line ${i + 1}`, line, read.page, where);
}

const T34 =
  "T34 the yard's hint stays clear at a large font: at 320, 390, 768, 1440 and 1920 wide with a 16, 20, 24 or 28 px default font, webfont blocked, the hint shown by data-yard set by hand, its lines don't print over one another, its text runs into the step links, the hand-off and every other word no deeper than at 16 px at the same width, it is whole inside the window, and the page doesn't scroll sideways";

for (const record of PAGES)
  test(`${T34} (${record.route})`, async ({ browser }) => {
    test.setTimeout(90_000);
    const { route } = record;
    /** The 16 px depths, by window width: the baseline every larger font is held to. */
    const baseline = new Map<number, Read["neighbours"]>();
    for (const size of SIZES) {
      const { context, page, aborted } = await contextOf(browser, {
        ...WINDOWS[0],
        blocked: true,
      });
      try {
        await setDefaultFont(context, page, size);
        const response = await page.goto(route);
        expect(response?.status(), `status of ${route}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        // The yard plays only with WebGL, which checks refuse: its hook set by hand, as H3 does.
        await page.evaluate(() =>
          document.querySelector("[data-model]")?.setAttribute("data-yard", ""),
        );
        for (const win of WINDOWS) {
          await page.setViewportSize(win);
          const where = `on ${route} at ${win.width} x ${win.height}, ${size} px default font, fonts blocked`;
          const read = await readHint(page);
          // The setting took: the root's font is the reader's default.
          expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
          if (size === SIZES[0]) baseline.set(win.width, read.neighbours);
          expectHint(read, record, baseline.get(win.width) ?? {}, where);
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
