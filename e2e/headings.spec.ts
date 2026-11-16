import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schedule } from "../components/schedule";
import { caseStudies } from "../content/work";
import { horizontalOverflow } from "./helpers";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 69 (.crew/sprint/69/contract.md, T28): a long word in a heading stays inside the window.
// Atlas's sweep of production on 2026-11-16 found, at 320 wide, the case study's h1 "Multi-agent
// orchestration platform" running to 324 at a 20 px default font and 386 at 24 ("orchestration"
// cut at the window's edge, the page scrolling sideways), and /evals's h2 "Groundedness" to 348 at
// 24. So on /evals and every case study in content/work.ts, at 320 x 568 and 390 x 664, with
// Chrome's Large (20) and Very large (24) default fonts, webfont and fonts blocked: the page has no
// sideways scroll, and each shown h1 and h2 has its words inside the page and cut by no ancestor
// that hides overflow, so hiding the overflow isn't a fix. One context per window, size and fonts
// visits all six routes, to keep CI's shards lean (.crew/STATE.md).
//
// /evals draws its categories only from the weekly report in Vercel Blob, which a local or CI build
// can't read, so there it shows no h2. Where the page has none, the check draws the four
// categories into it as the page does (Schedule, with lib/evals.ts's labels) before it reads, so
// the page's own CSS sets "Groundedness" here too; on production the real report is read.

const ROUTES = ["/evals", ...caseStudies.map((study) => `/work/${study.slug}`)];
const WINDOWS = [
  [320, 568],
  [390, 664],
] as const;
/** Chrome's "Large" and "Very large" default fonts. */
const SIZES = [20, 24] as const;

/** lib/evals.ts's category labels, read from its source: it loads the server's blob client. */
function categoryLabels() {
  const source = readFileSync(join(__dirname, "../lib/evals.ts"), "utf8");
  const block = source.match(/const CATEGORIES = \{([\s\S]*?)\} as const/)?.[1];
  return [...(block ?? "").matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1] ?? "");
}

/**
 * The categories as app/evals/page.tsx draws them: a Schedule each, with one case under it, its
 * prompt, its result line and its grader's note, so the result line sits where the real report's
 * does (from 1024, in the column beside the h2's, where T29 reads the overlap). Each section carries
 * the page's own class for its categories, `sched-scores` (sprint 69, Iris's direction), so the
 * page's rules for them apply to the drawn ones too.
 */
function categoriesMarkup(labels: string[]) {
  return labels
    .map((label, index) =>
      // Schedule has no hooks, so it is called as the plain function it is.
      renderToStaticMarkup(
        Schedule({
          id: `c${index}`,
          title: label,
          className: "sched-scores",
          children: createElement(
            "ul",
            { className: "sched-body" },
            createElement(
              "li",
              { className: "entry" },
              createElement("h3", null, "What does Ruslan do and where?"),
              createElement("p", { className: "when" }, "Failed, 6 of 10"),
              createElement(
                "p",
                { className: "score-note" },
                "Title, employer, location and team match the record.",
              ),
            ),
          ),
        }),
      ),
    )
    .join("");
}

/** Draw the categories on /evals when the build has no report to; true if it drew them. */
function drawCategories(page: Page, html: string) {
  return page.evaluate((markup) => {
    if (document.querySelector("main section.sched h2")) return false;
    document
      .querySelector("main > header.doc-head")
      ?.insertAdjacentHTML("afterend", markup);
    return true;
  }, html);
}

type Heading = {
  label: string;
  textLeft: number;
  textRight: number;
  /** The nearest ancestor (or itself) hiding overflow that cuts the words, if any. */
  clippedBy: string | null;
};

/** Each shown h1 and h2 in main, with its words' edges and what cuts them. */
function readHeadings(page: Page) {
  return page.evaluate(() => {
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
    const headings = [...document.querySelectorAll("h1, h2")]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        return {
          label: (el.textContent ?? "").trim(),
          textLeft: text.left,
          textRight: text.right,
          clippedBy: clipper(el, text),
        };
      });
    return {
      root: getComputedStyle(document.documentElement).fontSize,
      page: document.documentElement.clientWidth,
      headings,
    };
  });
}

/** The heading's words inside the page, and cut by nothing. */
function expectInside(heading: Heading, page: number, where: string) {
  const name = `"${heading.label}" ${where}`;
  expect
    .soft(
      heading.textRight,
      `${name}: its words' right edge against the page's ${page}`,
    )
    .toBeLessThanOrEqual(page);
  expect
    .soft(heading.textLeft, `${name}: its words' left edge`)
    .toBeGreaterThanOrEqual(0);
  expect
    .soft(heading.clippedBy, `${name}: what hides part of its words`)
    .toBeNull();
}

const T28 =
  "T28 a long word in a heading stays inside the window: on /evals and every case study, with a 20 or 24 px default font, webfont and fonts blocked, the page has no horizontal scroll, and each h1 and h2 has its words inside the page and cut by no ancestor that hides overflow";

for (const [width, height] of WINDOWS)
  for (const size of SIZES)
    for (const blocked of [false, true])
      test(`${T28} (${width} x ${height}, ${size} px, ${blocked ? "fonts blocked" : "webfont"})`, async ({
        browser,
      }) => {
        test.setTimeout(90_000);
        const labels = categoryLabels();
        expect(labels, "lib/evals.ts's category labels").toContain(
          "Groundedness",
        );
        const markup = categoriesMarkup(labels);
        const { context, page, aborted } = await contextOf(browser, {
          width,
          height,
          blocked,
        });
        try {
          await setDefaultFont(context, page, size);
          for (const route of ROUTES) {
            const where = `on ${route} at ${width} x ${height}, ${size} px default font, ${blocked ? "fonts blocked" : "webfont"}`;
            const response = await page.goto(route);
            expect(response?.status(), `status of ${route}`).toBe(200);
            await page.evaluate(() => document.fonts.ready);
            if (route === "/evals" && (await drawCategories(page, markup)))
              test.info().annotations.push({
                type: "drawn",
                description: `/evals had no report, so its ${labels.length} categories were drawn as the page draws them`,
              });
            const read = await readHeadings(page);
            // The setting took: the root's font is the reader's default.
            expect(read.root, `the root's font ${where}`).toBe(`${size}px`);
            expect
              .soft(
                await horizontalOverflow(page),
                `sideways overflow ${where}`,
              )
              .toBeLessThanOrEqual(0);
            const levels = read.headings.map((h) => h.label);
            expect
              .soft(levels.length, `the shown h1 and h2 ${where}`)
              .toBeGreaterThan(route === "/evals" ? labels.length : 1);
            if (route === "/evals")
              expect
                .soft(levels, `the categories ${where}`)
                .toEqual(expect.arrayContaining(labels));
            for (const heading of read.headings)
              expectInside(heading, read.page, where);
          }
          if (blocked)
            expect
              .soft(aborted.count, "web font requests refused")
              .toBeGreaterThan(0);
        } finally {
          await context.close();
        }
      });

// T29, the contract's change during the build (.crew/sprint/69/contract.md, "Contract change"):
// at the default font, from 1024 the schedule's h2 sits in columns 1 to 3 of its section's grid,
// and Forge found production's /evals printing "Groundedness" (to 311) over its own result line,
// "Failed, 6 of 10" (from 282), its grid area ending at 258. So on /evals (the report drawn as T28
// draws it) and the case studies, at 768, 900, 1024, 1180, 1280 and 1440 wide, each `.sched` h2's
// words sit inside its own grid area (its section's content box where the section isn't a grid),
// and overlap no other text in its section. One page a route, resized through the widths.

/** Widths either side of the grid's 1024 and on to the widest window the sheet is drawn for. */
const WIDTHS = [768, 900, 1024, 1180, 1280, 1440] as const;

/** Each shown `.sched` h2, its words' edges, its grid area, and the texts its words overlap. */
function readSchedHeads(page: Page) {
  return page.evaluate(() => {
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    // The line a grid item ends on: "span n", a line number (negative from the end), or auto.
    const endLine = (value: string, start: number, count: number) => {
      const spanned = value.match(/^span (\d+)$/);
      if (spanned) return start + Number(spanned[1]);
      const line = Number.parseInt(value, 10);
      if (!Number.isFinite(line)) return start + 1;
      return line < 0 ? count + 2 + line : line;
    };
    // The h2's grid area, from its section's resolved tracks and its own placement.
    const areaOf = (h2: Element) => {
      const parent = h2.parentElement as Element;
      const ps = getComputedStyle(parent);
      const pr = parent.getBoundingClientRect();
      const left0 =
        pr.left +
        Number.parseFloat(ps.borderLeftWidth) +
        Number.parseFloat(ps.paddingLeft);
      const right0 =
        pr.right -
        Number.parseFloat(ps.borderRightWidth) -
        Number.parseFloat(ps.paddingRight);
      if (!ps.display.includes("grid"))
        return { left: left0, right: right0, how: "its section's content box" };
      const tracks = ps.gridTemplateColumns
        .split(/\s+/)
        .filter((token) => token.endsWith("px"))
        .map(Number.parseFloat);
      const gap = Number.parseFloat(ps.columnGap) || 0;
      const s = getComputedStyle(h2);
      const start = Number.parseInt(s.gridColumnStart, 10);
      if (!Number.isFinite(start)) {
        // Placed by name or auto: its own box, which a stretched grid item fills.
        const box = h2.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          how: `its own box (grid-column ${s.gridColumnStart} / ${s.gridColumnEnd})`,
        };
      }
      const end = endLine(s.gridColumnEnd, start, tracks.length);
      const left = left0 + sum(tracks.slice(0, start - 1)) + gap * (start - 1);
      const right =
        left + sum(tracks.slice(start - 1, end - 1)) + gap * (end - start - 1);
      return { left, right, how: `columns ${start} to ${end}` };
    };
    const overlap = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    return [...document.querySelectorAll("main .sched > h2")]
      .filter((h2) => h2.getClientRects().length > 0)
      .map((h2) => {
        const range = document.createRange();
        range.selectNodeContents(h2);
        const text = range.getBoundingClientRect();
        const lines = [...range.getClientRects()].filter((r) => r.width > 0);
        const section = h2.parentElement as Element;
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
        const overlaps: string[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const holder = node.parentElement;
          if (
            !holder ||
            h2.contains(node) ||
            !(node.textContent ?? "").trim() ||
            !holder.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            })
          )
            continue;
          const other = document.createRange();
          other.selectNodeContents(node);
          const rects = [...other.getClientRects()].filter((r) => r.width > 0);
          const hit = rects.find((r) => lines.some((line) => overlap(line, r)));
          if (hit)
            overlaps.push(
              `"${(node.textContent ?? "").trim().slice(0, 40)}" (${holder.tagName.toLowerCase()}, ${Math.round(hit.left)}..${Math.round(hit.right)})`,
            );
        }
        return {
          label: (h2.textContent ?? "").trim(),
          textLeft: text.left,
          textRight: text.right,
          area: areaOf(h2),
          overlaps,
        };
      });
  });
}

const T29 =
  "T29 a schedule's heading keeps to its column: on /evals and every case study, at the default font, 768 to 1440 wide, each .sched h2's words sit inside its own grid area and overlap no other text in its section";

test(T29, async ({ browser }) => {
  test.setTimeout(90_000);
  const labels = categoryLabels();
  const markup = categoriesMarkup(labels);
  const { context, page } = await contextOf(browser, {
    width: WIDTHS[0],
    height: 900,
  });
  try {
    for (const route of ROUTES) {
      await page.setViewportSize({ width: WIDTHS[0], height: 900 });
      const response = await page.goto(route);
      expect(response?.status(), `status of ${route}`).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      if (route === "/evals") await drawCategories(page, markup);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const where = `on ${route} at ${width} wide, the default font`;
        const heads = await readSchedHeads(page);
        expect
          .soft(
            heads.map((head) => head.label),
            `the schedule's h2s ${where}`,
          )
          .toEqual(
            route === "/evals"
              ? expect.arrayContaining(labels)
              : expect.arrayContaining(["The system"]),
          );
        for (const head of heads) {
          const name = `"${head.label}" ${where}`;
          expect
            .soft(
              head.textRight,
              `${name}: its words' right edge against its grid area's ${head.area.right} (${head.area.how})`,
            )
            .toBeLessThanOrEqual(head.area.right + 0.5);
          expect
            .soft(
              head.textLeft,
              `${name}: its words' left edge against its grid area's ${head.area.left} (${head.area.how})`,
            )
            .toBeGreaterThanOrEqual(head.area.left - 0.5);
          expect
            .soft(head.overlaps, `${name}: the text its words print over`)
            .toEqual([]);
        }
      }
    }
  } finally {
    await context.close();
  }
});
