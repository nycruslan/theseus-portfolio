import { expect, type Page, test } from "@playwright/test";
import { horizontalOverflow } from "./helpers";
import { NEWEST, RECORD, recordOf } from "./log";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 70 (.crew/sprint/70/contract.md, T30 and T31): the record's labels stay beside their facts
// at a large font. Atlas's sweep of production on 2026-11-16 found the step record's list (a fixed
// 88 px label column) holding "Pull request" at 16 px and not growing with the reader's font: at 24
// px "Approved" ends where its detail starts ("ApprovedOwner", 768 to 1440 wide), at 28 it prints
// over "Owner", and at 320 x 568 and 28 px the pull request's link (nowrap) runs to 329 to 343, so
// every step page scrolls sideways. Approved is the record's approval fact, so this hides it.
//
// T30 reads each label's ink (a Range over the dt's contents, which overflow doesn't clip) against
// its own detail's text on the same line, and inside the record, cut by no ancestor that hides
// overflow, so hiding a label's overflow isn't a fix. T31 reads the page's sideways scroll and the
// pull request's link, its box and words inside the page and cut by nothing, so `overflow: hidden`
// on the record isn't one either. One context per font and fonts, each page resized through the
// widths, to keep CI's shards lean (.crew/STATE.md). Named to sort among the Log's specs: shards
// split by test count over sorted files, and a name past them (the contract's record-labels.spec.ts)
// moved 10 of log.spec.ts's tests into shard 2, which has no time to spare, for 3 leaving it.

/** Sprint 23's record, the contract's sample, and the newest step from the retros the Log reads. */
const PAGES = [recordOf(23), recordOf(NEWEST)];
const WINDOWS = [
  [320, 568],
  [390, 664],
  [1024, 900],
  [1440, 900],
] as const;
/** Chrome's Medium, Large and Very large default fonts, and 28 past them. */
const SIZES = [16, 20, 24, 28] as const;
/** Each read: the default font, and fonts blocked or not. */
const READS = SIZES.flatMap((size) =>
  [false, true].map((blocked) => [size, blocked] as const),
);
/** The terms every record carries: the approval fact and the longest label. */
const TERMS = ["Checked", "Approved", "Pull request"];

type Ink = { left: number; right: number; top: number; bottom: number };

/** Each of the record's labels: its ink's lines, its detail's lines, and what cuts the label. */
function readLabels(page: Page) {
  return page.evaluate((record) => {
    const section = document.querySelector(record);
    const lines = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        }));
    };
    // The nearest of el and its ancestors that hides overflow and cuts the ink.
    const clipper = (el: Element, ink: Ink) => {
      for (
        let at: Element | null = el;
        at && at !== document.documentElement;
        at = at.parentElement
      ) {
        const s = getComputedStyle(at);
        const r = at.getBoundingClientRect();
        const cutX = ink.left < r.left - 0.5 || ink.right > r.right + 0.5;
        const cutY = ink.top < r.top - 0.5 || ink.bottom > r.bottom + 0.5;
        if (
          (s.overflowX !== "visible" && cutX) ||
          (s.overflowY !== "visible" && cutY)
        )
          return `${at.tagName.toLowerCase()}.${String(at.className).trim().split(/\s+/).join(".")} (overflow ${s.overflowX} ${s.overflowY}, ${r.left}..${r.right})`;
      }
      return null;
    };
    const box = section?.getBoundingClientRect();
    const labels = [...(section?.querySelectorAll("dl dt") ?? [])].map((dt) => {
      const ink = lines(dt);
      const whole = {
        left: Math.min(...ink.map((r) => r.left)),
        right: Math.max(...ink.map((r) => r.right)),
        top: Math.min(...ink.map((r) => r.top)),
        bottom: Math.max(...ink.map((r) => r.bottom)),
      };
      // Its own detail: the dd that follows it.
      let dd = dt.nextElementSibling;
      while (dd && dd.tagName !== "DD") dd = dd.nextElementSibling;
      return {
        term: (dt.textContent ?? "").trim(),
        ink,
        detail: dd ? lines(dd) : [],
        detailText: (dd?.textContent ?? "").trim().slice(0, 24),
        clippedBy: ink.length > 0 ? clipper(dt, whole) : null,
      };
    });
    return {
      root: getComputedStyle(document.documentElement).fontSize,
      record: box
        ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom }
        : null,
      labels,
    };
  }, RECORD);
}

/** The record's pull-request link: its box, its words' lines, and what cuts them. */
function readLink(page: Page) {
  return page.evaluate((record) => {
    const link = document.querySelector(`${record} dl dd a[href*="/pull/"]`);
    if (!link) return null;
    const box = link.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(link);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const text = {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
    };
    let clippedBy: string | null = null;
    for (
      let at: Element | null = link;
      at && at !== document.documentElement && !clippedBy;
      at = at.parentElement
    ) {
      const s = getComputedStyle(at);
      const r = at.getBoundingClientRect();
      const cut = text.left < r.left - 0.5 || text.right > r.right + 0.5;
      if (s.overflowX !== "visible" && cut)
        clippedBy = `${at.tagName.toLowerCase()}.${String(at.className).trim().split(/\s+/).join(".")} (overflow-x ${s.overflowX}, ${r.left}..${r.right})`;
    }
    // Each word's lines: a word broken across two is cut too.
    const broken: string[] = [];
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      for (const word of (node.textContent ?? "").matchAll(/\S+/g)) {
        const part = document.createRange();
        part.setStart(node, word.index);
        part.setEnd(node, word.index + word[0].length);
        const tops = new Set(
          [...part.getClientRects()]
            .filter((r) => r.width > 0)
            .map((r) => Math.round(r.top)),
        );
        if (tops.size > 1) broken.push(word[0]);
      }
    return {
      label: (link.textContent ?? "").trim(),
      broken,
      left: box.left,
      right: box.right,
      textLeft: text.left,
      textRight: text.right,
      clippedBy,
      page: document.documentElement.clientWidth,
      root: getComputedStyle(document.documentElement).fontSize,
    };
  }, RECORD);
}

/** Two lines of ink share a line where they overlap by more than a pixel top to bottom. */
const sameLine = (a: Ink, b: Ink) =>
  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

const T30 =
  "T30 the record's labels stay beside their facts: on /log/23 and the newest step, at 320 x 568, 390 x 664, 1024 x 900 and 1440 x 900, with a 16, 20, 24 or 28 px default font, webfont and fonts blocked, each record label's ink ends at or before its own detail's text starts on the same line, stays inside the record, and is cut by no ancestor that hides overflow";

for (const [size, blocked] of READS)
  test(`${T30} (${size} px, ${blocked ? "fonts blocked" : "webfont"})`, async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const [width, height] = WINDOWS[0];
    const { context, page, aborted } = await contextOf(browser, {
      width,
      height,
      blocked,
    });
    try {
      await setDefaultFont(context, page, size);
      for (const route of PAGES) {
        await page.setViewportSize({ width, height });
        const response = await page.goto(route);
        expect(response?.status(), `status of ${route}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        for (const [w, h] of WINDOWS) {
          await page.setViewportSize({ width: w, height: h });
          const where = `on ${route} at ${w} x ${h}, ${size} px default font, ${blocked ? "fonts blocked" : "webfont"}`;
          const read = await readLabels(page);
          // The setting took: the root's font is the reader's default.
          expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
          expect(read.record, `the record ${where}`).not.toBeNull();
          expect
            .soft(
              read.labels.map((label) => label.term),
              `the record's labels ${where}`,
            )
            .toEqual(expect.arrayContaining(TERMS));
          const record = read.record;
          if (!record) continue;
          for (const label of read.labels) {
            const name = `"${label.term}" ${where}`;
            expect
              .soft(label.ink.length, `${name}: its ink`)
              .toBeGreaterThan(0);
            expect
              .soft(label.detail.length, `${name}: its detail's text`)
              .toBeGreaterThan(0);
            // Each line of the label against the detail's text on that line, if any.
            for (const line of label.ink)
              for (const fact of label.detail.filter((d) => sameLine(d, line)))
                expect
                  .soft(
                    line.right,
                    `${name}: its ink's right edge against its detail "${label.detailText}" starting at ${fact.left} on the same line`,
                  )
                  .toBeLessThanOrEqual(fact.left);
            for (const line of label.ink) {
              expect
                .soft(
                  line.right,
                  `${name}: its ink's right edge against the record's ${record.right}`,
                )
                .toBeLessThanOrEqual(record.right);
              expect
                .soft(
                  line.left,
                  `${name}: its ink's left edge against the record's ${record.left}`,
                )
                .toBeGreaterThanOrEqual(record.left);
            }
            expect
              .soft(label.clippedBy, `${name}: what hides part of its ink`)
              .toBeNull();
          }
        }
      }
      if (blocked)
        expect
          .soft(aborted.count, "web font requests refused")
          .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

const T31 =
  "T31 the pull request's link keeps the step page still: on /log/23 and the newest step at 320 x 568, with a 24 or 28 px default font, webfont and fonts blocked, the page has no horizontal scroll, and the record's pull-request link has its box and its words inside the page, each word on one line, and cut by no ancestor that hides overflow";

for (const [size, blocked] of READS.filter(([size]) => size >= 24))
  test(`${T31} (${size} px, ${blocked ? "fonts blocked" : "webfont"})`, async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, page, aborted } = await contextOf(browser, {
      width: 320,
      height: 568,
      blocked,
    });
    try {
      await setDefaultFont(context, page, size);
      for (const route of PAGES) {
        const where = `on ${route} at 320 x 568, ${size} px default font, ${blocked ? "fonts blocked" : "webfont"}`;
        const response = await page.goto(route);
        expect(response?.status(), `status of ${route}`).toBe(200);
        await page.evaluate(() => document.fonts.ready);
        const link = await readLink(page);
        expect(link, `the record's pull-request link ${where}`).not.toBeNull();
        if (!link) continue;
        // The setting took: the root's font is the reader's default.
        expect(link.root, `the root's font ${where}`).toBe(`${size}px`);
        expect
          .soft(await horizontalOverflow(page), `sideways overflow ${where}`)
          .toBeLessThanOrEqual(0);
        const name = `"${link.label}" ${where}`;
        expect
          .soft(
            link.right,
            `${name}: its right edge against the page's ${link.page}`,
          )
          .toBeLessThanOrEqual(link.page);
        expect
          .soft(link.left, `${name}: its left edge`)
          .toBeGreaterThanOrEqual(0);
        expect
          .soft(
            link.textRight,
            `${name}: its words' right edge against the page's ${link.page}`,
          )
          .toBeLessThanOrEqual(link.page);
        expect
          .soft(link.textLeft, `${name}: its words' left edge`)
          .toBeGreaterThanOrEqual(0);
        expect
          .soft(link.clippedBy, `${name}: what hides part of its words`)
          .toBeNull();
        expect
          .soft(link.broken, `${name}: its words broken across lines`)
          .toEqual([]);
      }
      if (blocked)
        expect
          .soft(aborted.count, "web font requests refused")
          .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });
