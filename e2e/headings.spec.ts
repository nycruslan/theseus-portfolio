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

/** The categories as app/evals/page.tsx draws them: a Schedule each, with one case under it. */
function categoriesMarkup(labels: string[]) {
  return labels
    .map((label, index) =>
      // Schedule has no hooks, so it is called as the plain function it is.
      renderToStaticMarkup(
        Schedule({
          id: `c${index}`,
          title: label,
          children: createElement(
            "ul",
            { className: "sched-body" },
            createElement(
              "li",
              { className: "entry" },
              createElement("h3", null, "What does Ruslan do and where?"),
              createElement("p", { className: "when" }, "Passed, 10 of 10"),
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
