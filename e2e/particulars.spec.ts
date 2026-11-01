import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import { expected } from "./crew";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
  untilState,
} from "./crew-feed";
import { firstScreen, insideViewport } from "./first-screen";
import {
  horizontalOverflow,
  installRgba,
  MOTION,
  measureLcp,
  motionReady,
  SCHEMES,
} from "./helpers";
import { layerFor, ROWS_SHOWN } from "./live-layer";
import { FIRST, pause, REST, whole } from "./model";
import {
  otherCase,
  PARTICULARS,
  particularsOf,
  SOURCE_COMPANY,
  SOURCE_SUMMARY,
  showsPhrase,
} from "./particulars";
import { decodePng } from "./pixels";
import { bioParts } from "./retros";
import { openModel, refuseWebGl } from "./webgl";

// Sprint 39, Pa: the table of principal particulars on `/`'s first screen (.crew/sprint/39/
// contract.md, P1 to P7), written before the build and before Iris's placement call, so no check
// depends on where the block sits: each reads `dl[data-particulars]` wherever it is. The oracle is
// e2e/particulars.ts, the contract's data rules in its own lines over content/profile.ts. The feed
// states come from B4.22's harness (e2e/crew-feed.ts), the first screen from B1.1's reads
// (e2e/first-screen.ts), the settle from B3's wait (e2e/model.ts) and LCP from B1.9's measurement
// (e2e/helpers.ts). The 2D reads refuse WebGL (sprint 25: the model's data-state restyles the
// drawing from 1024 px); P4's second half, P5's motion and P6 run the model.

const BLOCK = "dl[data-particulars]";
const REVISIONS = 'section[aria-labelledby="revisions"]';
/** The drawing's lettering, HTML spans over its SVG (.crew/sprint/39/decisions.md, 5). */
const LETTERING = "[data-plan] .plan-view > span";
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const SIZES = [
  [1440, 900],
  [390, 844],
] as const;
/** What the rule gives for the owner's summary: the rows P1 expects on the page. */
const WANT = particularsOf(SOURCE_SUMMARY ?? "");
const [BIO_1 = "", BIO_2 = ""] = bioParts(profile.bio);
const TITLE_BIO = `${BIO_1} ${BIO_2}`;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

/** `/` (or `base`'s) at a size, WebGL refused unless `webgl`, with the web fonts in. */
async function openHome(page: Page, width: number, height: number, base = "") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/`);
  expect(response?.status(), `status of ${base}/ at ${width}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** A context with scripts off, at a size. */
async function bare(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    javaScriptEnabled: false,
    viewport: { width, height },
  });
  return { context, page: await context.newPage() };
}

/**
 * The block as the DOM has it: how many, where it sits against the markup rule, its rows (each
 * dt's words, its dd's words and the dd's words as shown, text-transform applied), anything
 * focusable inside, and its outerHTML's bytes.
 */
function readBlock(page: Page) {
  return page.evaluate(
    ({ block, revisions }) => {
      const squash = (text: string) => text.replace(/\s+/g, " ").trim();
      const all = [...document.querySelectorAll(block)];
      const dl = all[0] ?? null;
      const h1 = document.querySelector("main h1");
      const rev = document.querySelector(revisions);
      const problems: string[] = [];
      const rows: { term: string; phrase: string; shown: string }[] = [];
      const row = (dt: Element, dd: Element) =>
        rows.push({
          term: squash(dt.textContent ?? ""),
          phrase: squash(dd.textContent ?? ""),
          shown: squash((dd as HTMLElement).innerText ?? ""),
        });
      const kids = [...(dl?.children ?? [])];
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i] as Element;
        if (kid.tagName === "DIV") {
          const inner = [...kid.children].map((c) => c.tagName);
          if (inner.join(" ") === "DT DD")
            row(kid.children[0] as Element, kid.children[1] as Element);
          else problems.push(`a div holding ${inner.join(" ") || "nothing"}`);
        } else if (kid.tagName === "DT" && kids[i + 1]?.tagName === "DD") {
          row(kid, kids[i + 1] as Element);
          i++;
        } else problems.push(`a ${kid.tagName.toLowerCase()} out of turn`);
      }
      const focusable = dl
        ? [
            dl,
            ...dl.querySelectorAll(
              "a, button, input, select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable='false'])",
            ),
          ]
            .filter(
              (el) =>
                el !== dl ||
                dl.matches(
                  "[tabindex], [contenteditable]:not([contenteditable='false'])",
                ),
            )
            .map(
              (el) =>
                `<${el.tagName.toLowerCase()}> "${squash(el.textContent ?? "").slice(0, 30)}"`,
            )
        : [];
      return {
        count: all.length,
        inMain: all.filter((el) => el.closest("main")).length,
        afterH1: Boolean(
          dl &&
            h1 &&
            !h1.contains(dl) &&
            h1.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        beforeRevisions: Boolean(
          dl &&
            rev &&
            rev.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_PRECEDING,
        ),
        inPlan: Boolean(dl?.closest("[data-plan]")),
        hiddenBy:
          dl?.closest('[aria-hidden]:not([aria-hidden="false"])')?.tagName ??
          null,
        inSection: Boolean(dl?.closest("section")),
        problems,
        rows,
        focusable,
        bytes: dl ? new TextEncoder().encode(dl.outerHTML).length : 0,
      };
    },
    { block: BLOCK, revisions: REVISIONS },
  );
}

/** The block's box, from the viewport's top left; null without one. */
function blockBox(page: Page) {
  return page.evaluate((block) => {
    const el = document.querySelector(block);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }, BLOCK);
}

/** Asserts the markup rule and the rows on one read, `where` naming it. */
function expectBlock(
  read: Awaited<ReturnType<typeof readBlock>>,
  where: string,
) {
  expect(read.count, `${BLOCK} on / ${where}`).toBe(1);
  expect.soft(read.inMain, `${BLOCK} inside main ${where}`).toBe(1);
  expect.soft(read.afterH1, `after the h1 in DOM order ${where}`).toBe(true);
  expect
    .soft(read.beforeRevisions, `before ${REVISIONS} in DOM order ${where}`)
    .toBe(true);
  expect.soft(read.inPlan, `inside [data-plan] ${where}`).toBe(false);
  expect
    .soft(read.hiddenBy, `inside an aria-hidden subtree ${where}`)
    .toBeNull();
  expect.soft(read.inSection, `inside a section ${where}`).toBe(false);
  expect
    .soft(read.problems, `children that aren't a dt then its dd ${where}`)
    .toEqual([]);
  expect.soft(read.focusable, `focusable inside ${where}`).toEqual([]);
  expect
    .soft(
      read.rows.map((r) => r.term),
      `the terms, in order ${where}`,
    )
    .toEqual((WANT ?? []).map((r) => r.term));
  for (const [i, want] of (WANT ?? []).entries()) {
    const got = read.rows[i];
    expect
      .soft(
        Boolean(got && showsPhrase(got.phrase, want.phrase)),
        `${want.term}'s dd reads "${want.phrase}", only its first letter's case open: "${got?.phrase}" ${where}`,
      )
      .toBe(true);
    expect
      .soft(
        Boolean(got && showsPhrase(got.shown, want.phrase)),
        `${want.term}'s dd shows "${want.phrase}" as rendered (text-transform applied): "${got?.shown}" ${where}`,
      )
      .toBe(true);
  }
  expect
    .soft(read.bytes, `the block's outerHTML in bytes ${where}`)
    .toBeLessThanOrEqual(2_048);
}

test("P1 server-rendered, verbatim: with scripts on and off at 1440 and 390, / has one dl[data-particulars] in main after the h1 and before the revision block, outside [data-plan], aria-hidden and any section, each row a dt then its dd, nothing focusable; its rows the rule's four for the real profile, terms exact and phrases verbatim; the phrases inside it in GET /'s HTML; its outerHTML at most 2,048 B", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);
  expect(
    SOURCE_SUMMARY,
    `the summary of the role at ${SOURCE_COMPANY}`,
  ).not.toBeNull();
  await page.context().addInitScript(refuseWebGl);
  for (const [width, height] of SIZES) {
    await openHome(page, width, height);
    const on = await readBlock(page);
    const off = await bare(browser, width, height);
    const response = await off.page.goto("/");
    expect(response?.status(), `status of / with scripts off at ${width}`).toBe(
      200,
    );
    const read = await readBlock(off.page);
    await off.context.close();
    if (WANT === null) {
      // The summary holds fewer than two phrases: no block at all.
      expect.soft(on.count, `${BLOCK} with fewer than two phrases`).toBe(0);
      expect
        .soft(read.count, `${BLOCK} with fewer than two phrases, scripts off`)
        .toBe(0);
      continue;
    }
    expectBlock(on, `with scripts on at ${width} x ${height}`);
    expectBlock(read, `with scripts off at ${width} x ${height}`);
  }
  const html = await (await request.get("/")).text();
  const open = html.match(/<dl\b[^>]*\sdata-particulars(?:=|\s|\/?>)[^>]*>/);
  const start = open?.index ?? -1;
  const blockHtml =
    start === -1 ? "" : html.slice(start, html.indexOf("</dl>", start));
  expect(blockHtml, `a <dl data-particulars> in GET /'s HTML`).not.toBe("");
  for (const { term, phrase } of WANT ?? []) {
    expect
      .soft(
        blockHtml.includes(phrase) || blockHtml.includes(otherCase(phrase)),
        `${term}'s "${phrase}" inside the dl in GET /'s HTML`,
      )
      .toBe(true);
  }
});

/** P2's fixtures, from the contract's words: each a summary and the terms the rule shows for it. */
function ruleCases(): [string, string, string[] | null][] {
  const real = SOURCE_SUMMARY ?? "";
  const without = (summary: string, ...terms: string[]) =>
    PARTICULARS.filter((r) => terms.includes(r.term)).reduce(
      (s, r) => s.replace(r.phrase, "something else"),
      summary,
    );
  const ALL = ["Leads", "Reach", "Gateway", "Impact"];
  return [
    ["the owner's summary", real, ALL],
    ...ALL.map((term): [string, string, string[]] => [
      `${term}'s phrase removed`,
      without(real, term),
      ALL.filter((t) => t !== term),
    ]),
    [
      '"Cut manual processing…" capitalised',
      real.replace("cut manual processing", "Cut manual processing"),
      ALL,
    ],
    [
      '"A team of 7…" capitalised',
      real.replace("a team of 7", "A team of 7"),
      ALL,
    ],
    [
      "a letter past the first in the other case",
      real.replace("around 8 product teams", "around 8 Product teams"),
      ["Leads", "Reach", "Impact"],
    ],
    [
      "two removed: two rows still make a block",
      without(real, "Reach", "Gateway"),
      ["Leads", "Impact"],
    ],
    ...ALL.map((kept): [string, string, null] => [
      `three removed, ${kept} kept`,
      without(real, ...ALL.filter((t) => t !== kept)),
      null,
    ]),
    ["an empty summary", "", null],
  ];
}

test("P2 the rule on fixtures: the real summary gives the four rows; each phrase removed gives the other three; Cut capitalised still shows Impact; three removed, or none held, gives no block; the oracle's terms hold no digit", () => {
  const real = SOURCE_SUMMARY ?? "";
  expect(real, `the summary of the role at ${SOURCE_COMPANY}`).not.toBe("");
  const rule = (summary: string) =>
    particularsOf(summary)?.map((r) => r.term) ?? null;
  const cases = ruleCases();
  for (const [name, summary, want] of cases) {
    expect.soft(rule(summary), name).toEqual(want);
  }
  expect(
    particularsOf(real),
    "the owner's summary, as terms and phrases",
  ).toEqual(PARTICULARS);
  expect
    .soft(
      PARTICULARS.filter((r) => /\d/.test(r.term)).map((r) => r.term),
      "terms with a digit",
    )
    .toEqual([]);
});

// The rule's interface (decisions.md 6): lib/particulars.ts exports `particulars(summary)`, the rows
// as term and the phrase the dd shows (its first letter as the source has it), or null with fewer
// than two. Loaded at run time, so a missing module fails here alone.
const PARTICULARS_MODULE = "../lib/particulars";

test("P2 the product's rule on the same fixtures: lib/particulars.ts's particulars gives the oracle's terms for each, in order, each phrase as the source holds it, and null for no block", async () => {
  const loaded = (await import(PARTICULARS_MODULE)) as {
    particulars?: unknown;
  };
  expect(
    typeof loaded.particulars,
    "lib/particulars.ts exports particulars",
  ).toBe("function");
  const particulars = loaded.particulars as (
    summary: string,
  ) => { term: string; phrase: string }[] | null;
  for (const [name, summary, terms] of ruleCases()) {
    const want =
      terms === null
        ? null
        : PARTICULARS.filter((r) => terms.includes(r.term)).map((r) => ({
            term: r.term,
            phrase: summary.includes(r.phrase) ? r.phrase : otherCase(r.phrase),
          }));
    expect.soft(particulars(summary), name).toEqual(want);
  }
});

// P3's feed states: live-layer.spec.ts's kept sites by name and answer, so a worker that ran B4b
// reuses them. Each is reached as B4.22 reaches it: /crew until it shows the oracle's state, then /
// until it shows the layer's hooks.
const FIXTURES = ["live", "open", "resting"] as const;

function reachHome(crew: Crew, fixture: (typeof FIXTURES)[number]) {
  return crew.once(`particulars ${fixture}`, async () => {
    const name = `home-${fixture}`;
    const site = await crew.site(name, { fixture }, true);
    const body = crew.feed.body(name);
    const want = layerFor(body, crew.feed.origin).home;
    const crewShown = await untilState(
      site.baseURL,
      expected(body, crew.feed.origin).state,
      STATE_WAIT,
    );
    const home = await untilHome(site.baseURL, want, STATE_WAIT);
    return { base: site.baseURL, want, crewShown, home };
  });
}

/** Each element in the block with text of its own, and its font size; and the h1's. */
function blockSizes(page: Page) {
  return page.evaluate((block) => {
    const h1 = document.querySelector("h1");
    const dl = document.querySelector(block);
    return {
      h1: h1 ? Number.parseFloat(getComputedStyle(h1).fontSize) : 0,
      texts: [...(dl ? [dl, ...dl.querySelectorAll("*")] : [])]
        .filter((el) =>
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
        )
        .map((el) => ({
          el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
          size: Number.parseFloat(getComputedStyle(el).fontSize),
        })),
    };
  }, BLOCK);
}

test.describe("on the feed's fixtures", () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live, open and resting states need this checkout's build served from copies pointed at the fixture server (B4.22's harness)",
  );
  // The three sites start together, once per worker (STATE.md: servers in a per-worker beforeAll).
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reachHome(crew, fixture);
  });

  test("P3 on the first screen in every state: at 1440 x 900 and 390 x 844, light and dark, on the default server and the live, open and resting fixtures, the dl wholly inside the viewport, every item B1.1 lists (and at 1440 its five rows) inside it too, and no text in the dl as large as the h1", async ({
    page,
    crew,
  }) => {
    test.setTimeout(240_000);
    await page.context().addInitScript(refuseWebGl);
    const states = [{ base: "", where: "the default server" }];
    for (const fixture of FIXTURES) {
      const reached = await reachHome(crew, fixture);
      test.info().annotations.push({
        type: "state-wait",
        description: `${fixture}: /crew ${reached.crewShown.seen} after ${reached.crewShown.ms} ms, then / ${reached.home.seen} after ${reached.home.ms} ms`,
      });
      expect(
        reached.home.seen,
        `the state / shows on the home-${fixture} site within ${STATE_WAIT} ms`,
      ).toBe(reached.want);
      states.push({ base: reached.base, where: `the ${fixture} fixture` });
    }
    for (const { base, where: site } of states) {
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const [width, height] of SIZES) {
          await openHome(page, width, height, base);
          const where = `on ${site} at ${width} x ${height}, ${scheme}`;
          const dl = await blockBox(page);
          const found = await firstScreen(page);
          expect.soft(dl, `${BLOCK} ${where}`).not.toBeNull();
          expect
            .soft(
              insideViewport(dl, found.viewport),
              `the dl wholly inside the first viewport ${where}: ${JSON.stringify(dl)}`,
            )
            .toBe(true);
          const withRows = width === 1440;
          if (withRows)
            expect
              .soft(found.rows, `revision rows ${where}`)
              .toHaveLength(ROWS_SHOWN);
          expect
            .soft(
              [...found.items, ...(withRows ? found.rows : [])]
                .filter(({ box }) => !insideViewport(box, found.viewport))
                .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
              `B1.1's items not wholly inside the first viewport ${where}`,
            )
            .toEqual([]);
          const sizes = await blockSizes(page);
          expect(sizes.h1, `the h1's font size ${where}`).toBeGreaterThan(0);
          expect
            .soft(
              sizes.texts.filter(({ size }) => size >= sizes.h1),
              `text in the dl as large as the h1 (${sizes.h1} px) ${where}`,
            )
            .toEqual([]);
        }
      }
    }
  });
});

/**
 * The shown drawing's planks, grown by `grow` px, and its lettering's boxes (HTML spans over the SVG,
 * `LETTERING`), against the block's box.
 */
function clearance(page: Page, grow: number) {
  return page.evaluate(
    ({ block, grow, lettering }) => {
      const shown = (el: Element) => {
        const r = el.getBoundingClientRect();
        return el.getClientRects().length > 0 && (r.width > 0 || r.height > 0);
      };
      const boxOf = (el: Element, by = 0) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - by,
          top: r.top - by,
          right: r.right + by,
          bottom: r.bottom + by,
        };
      };
      type B = ReturnType<typeof boxOf>;
      const meets = (a: B, b: B) =>
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom;
      const dl = document.querySelector(block);
      const planks = [
        ...document.querySelectorAll("[data-plan] [data-plank]"),
      ].filter(shown);
      const texts = [...document.querySelectorAll(lettering)].filter(shown);
      if (!dl)
        return {
          dl: null,
          planks: planks.length,
          texts: texts.length,
          met: [],
        };
      const box = boxOf(dl);
      return {
        dl: box,
        planks: planks.length,
        texts: texts.length,
        met: [
          ...planks
            .filter((p) => meets(box, boxOf(p, grow)))
            .map((p) => `plank ${p.getAttribute("data-plank")} (+${grow} px)`),
          ...texts
            .filter((t) => meets(box, boxOf(t)))
            .map((t) => `lettering "${(t.textContent ?? "").trim()}"`),
        ],
      };
    },
    { block: BLOCK, grow, lettering: LETTERING },
  );
}

test("P4 clear of the hull: with WebGL refused at 768, 1024, 1280 and 1440 x 900 the dl's box meets no [data-plan] [data-plank] box grown by 24 px and no box of the drawing's lettering ([data-plan] .plan-view > span), which matches at every width; on Full at 1440 x 900 at rest, with the dl hidden, its box's pixels with and without [data-model] canvas match (99.5% within 8 a channel)", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  await page.context().addInitScript(refuseWebGl);
  for (const width of [768, 1024, 1280, 1440]) {
    await openHome(page, width, 900);
    const where = `at ${width} x 900, WebGL refused`;
    const read = await clearance(page, 24);
    expect.soft(read.dl, `${BLOCK} ${where}`).not.toBeNull();
    // Without planks on the page, "meets none" would be true of any block.
    expect
      .soft(read.planks, `shown planks in the drawing ${where}`)
      .toBeGreaterThan(0);
    // The contract's first selector, [data-plan] text, matched nothing (decisions.md 5): this one
    // must match, or the clause is vacuous again.
    expect
      .soft(read.texts, `shown ${LETTERING} in the drawing ${where}`)
      .toBeGreaterThan(0);
    expect.soft(read.met, `what the dl's box meets ${where}`).toEqual([]);
  }

  const run = await openModel(browser, { width: 1440, height: 900 });
  try {
    await run.goto();
    const state = await run.waitFor([...REST], FIRST);
    await pause(300);
    const dl = await blockBox(run.page);
    expect(
      dl,
      `${BLOCK} on Full at 1440 x 900, the model ${state}`,
    ).not.toBeNull();
    if (!dl) return;
    const clip = whole({
      x: dl.left,
      y: dl.top,
      width: dl.right - dl.left,
      height: dl.bottom - dl.top,
    });
    await run.page.addStyleTag({
      content: `${BLOCK} { visibility: hidden !important; }`,
    });
    const withHull = decodePng(await run.page.screenshot({ clip }));
    await run.page.addStyleTag({
      content: "[data-model] canvas { visibility: hidden !important; }",
    });
    const without = decodePng(await run.page.screenshot({ clip }));
    let same = 0;
    const pixels = withHull.width * withHull.height;
    for (let i = 0; i < pixels; i++) {
      let close = true;
      for (let c = 0; c < 3; c++) {
        const a = withHull.data[i * 4 + c] ?? 0;
        const b = without.data[i * 4 + c] ?? 0;
        if (Math.abs(a - b) > 8) close = false;
      }
      if (close) same++;
    }
    const share = pixels > 0 ? same / pixels : 0;
    test.info().annotations.push({
      type: "hull",
      description: `${(share * 100).toFixed(2)}% of ${pixels} px in the dl's box ${JSON.stringify(clip)} match with and without the canvas, the model ${state}`,
    });
    expect
      .soft(
        share,
        `share of the dl's box unchanged by the canvas at 1440 x 900, ${state}`,
      )
      .toBeGreaterThanOrEqual(0.995);
  } finally {
    await run.close();
  }
});

/** Whether the block and each dt and dd show: rendered, visible and opaque, with a box. */
function blockShows(page: Page) {
  return page.evaluate((block) => {
    const dl = document.querySelector(block);
    const seen = (el: Element) =>
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      el.getBoundingClientRect().width > 0 &&
      el.getBoundingClientRect().height > 0;
    return {
      dl: dl ? seen(dl) : null,
      hidden: [...(dl?.querySelectorAll("dt, dd") ?? [])]
        .filter((el) => !seen(el))
        .map(
          (el) =>
            `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
        ),
      cells: dl?.querySelectorAll("dt, dd").length ?? 0,
    };
  }, BLOCK);
}

/** Each dt's and dd's colour against its own background's (the first painted one up the tree). */
function forcedInk(page: Page) {
  return page.evaluate((block) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const groundOf = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement) {
        const c = rgba?.(getComputedStyle(a).backgroundColor);
        if (c && (c[3] ?? 0) > 0) return c;
      }
      const probe = document.createElement("div");
      probe.style.backgroundColor = "Canvas";
      document.body.append(probe);
      const canvas = rgba?.(getComputedStyle(probe).backgroundColor) ?? null;
      probe.remove();
      return canvas;
    };
    return {
      active: matchMedia("(forced-colors: active)").matches,
      cells: [
        ...(document.querySelector(block)?.querySelectorAll("dt, dd") ?? []),
      ].map((el) => ({
        el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
        ink: rgba?.(getComputedStyle(el).color)?.slice(0, 3) ?? null,
        ground: groundOf(el)?.slice(0, 3) ?? null,
      })),
    };
  }, BLOCK);
}

type Still = {
  /** The block's box in page coordinates each frame from 100 ms after load to 3 s. */
  samples: { t: number; x: number; y: number; w: number; h: number }[];
  /** The block's animations at the load event and 2 s after it; null before then, or no block. */
  atLoad: string[] | null;
  atTwo: string[] | null;
  done: boolean;
};

/**
 * An init script: from the load event, the block's animations then and 2 s later, and its box
 * every frame from 100 ms to 3 s. Read in the page, since a loaded runner delays the test's own
 * reads by seconds while the model builds (its first read landed 3 to 5 s after load).
 */
function watchStill(block: string) {
  const still: Still = { samples: [], atLoad: null, atTwo: null, done: false };
  (window as Window & { __still?: Still }).__still = still;
  const animations = () => {
    const dl = document.querySelector(block);
    return dl
      ? dl
          .getAnimations({ subtree: true })
          .map(
            (a) =>
              `${a.constructor.name} ${(a as CSSAnimation).animationName ?? ""}`,
          )
      : null;
  };
  addEventListener("load", () => {
    const load = performance.now();
    still.atLoad = animations() ?? ["(no block)"];
    setTimeout(() => {
      still.atTwo = animations() ?? ["(no block)"];
    }, 2000);
    const frame = () => {
      const t = performance.now() - load;
      const r = document.querySelector(block)?.getBoundingClientRect();
      if (t >= 100 && r)
        still.samples.push({
          t,
          x: r.left + scrollX,
          y: r.top + scrollY,
          w: r.width,
          h: r.height,
        });
      if (t < 3000) requestAnimationFrame(frame);
      else still.done = true;
    };
    requestAnimationFrame(frame);
  });
}

test("P5 readable in every mode, still: it shows with scripts off, in print and in forced colours (each dt's and dd's colour unlike its background's); on Full with no reduced motion and under reduced motion, no animation in its subtree at load or 2 s later, and its box doesn't move between 100 ms and 3 s after load", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  for (const [width, height] of SIZES) {
    const off = await bare(browser, width, height);
    await off.page.goto("/");
    const shows = await blockShows(off.page);
    await off.context.close();
    expect
      .soft(shows.dl, `the dl shows with scripts off at ${width}`)
      .toBe(true);
    expect
      .soft(shows.cells, `dt and dd with scripts off at ${width}`)
      .toBeGreaterThan(0);
    expect
      .soft(shows.hidden, `dt or dd hidden with scripts off at ${width}`)
      .toEqual([]);
  }

  await page.context().addInitScript(refuseWebGl);
  for (const [width, height] of SIZES) {
    await openHome(page, width, height);
    await page.emulateMedia({ media: "print" });
    const printed = await blockShows(page);
    await page.emulateMedia({ media: "screen" });
    expect.soft(printed.dl, `the dl shows in print at ${width}`).toBe(true);
    expect
      .soft(printed.cells, `dt and dd in print at ${width}`)
      .toBeGreaterThan(0);
    expect
      .soft(printed.hidden, `dt or dd hidden in print at ${width}`)
      .toEqual([]);
  }

  await page.emulateMedia({ forcedColors: "active" });
  for (const [width, height] of SIZES) {
    await openHome(page, width, height);
    const shows = await blockShows(page);
    const forced = await forcedInk(page);
    const where = `in forced colours at ${width}`;
    expect(forced.active, "forced colours are on").toBe(true);
    expect.soft(shows.dl, `the dl shows ${where}`).toBe(true);
    expect.soft(forced.cells.length, `dt and dd ${where}`).toBeGreaterThan(0);
    expect
      .soft(
        forced.cells
          .filter(
            (c) =>
              !c.ink || !c.ground || c.ink.every((v, i) => v === c.ground?.[i]),
          )
          .map((c) => `${c.el}: ink ${c.ink} on ${c.ground}`),
        `dt or dd painted in its background's colour ${where}`,
      )
      .toEqual([]);
  }
  await page.emulateMedia({ forcedColors: "none" });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    for (const [width, height] of SIZES) {
      const run = await openModel(browser, { width, height, reducedMotion });
      try {
        await run.context.addInitScript(watchStill, BLOCK);
        await run.goto();
        const where = `at ${width} x ${height}, reduced motion ${reducedMotion}`;
        await motionReady(run.page);
        const mode = await run.page.evaluate(
          (slot) =>
            [...document.querySelectorAll(slot)]
              .find((el) => el.getClientRects().length > 0)
              ?.querySelector('button[aria-pressed="true"]')
              ?.textContent?.trim() ?? null,
          MOTION,
        );
        if (reducedMotion === "no-preference")
          expect
            .soft(mode, `the motion control's pressed mode ${where}`)
            .toBe("Full");
        const end = Date.now() + 20_000;
        let still: Still | null = null;
        for (;;) {
          still = await run.page.evaluate(
            () => (window as Window & { __still?: Still }).__still ?? null,
          );
          if ((still?.done && still.atTwo !== null) || Date.now() > end) break;
          await pause(250);
        }
        const samples = still?.samples ?? [];
        const [first] = samples;
        const last = samples.at(-1);
        test.info().annotations.push({
          type: "still",
          description: `${where}, mode ${mode}: ${samples.length} frames read from ${first?.t.toFixed(0)} to ${last?.t.toFixed(0)} ms after load, the model ${await run.state()}`,
        });
        expect(
          still?.done,
          `the frames to 3 s after load were read ${where}`,
        ).toBe(true);
        expect(
          first,
          `${BLOCK}'s box from 100 ms after load ${where}`,
        ).toBeDefined();
        expect
          .soft(still?.atLoad, `animations in the dl at load ${where}`)
          .toEqual([]);
        expect
          .soft(still?.atTwo, `animations in the dl 2 s after load ${where}`)
          .toEqual([]);
        const moved = samples.filter((s) =>
          (["x", "y", "w", "h"] as const).some(
            (k) => Math.abs(s[k] - (first?.[k] ?? 0)) > 0.5,
          ),
        );
        expect
          .soft(
            moved
              .slice(0, 3)
              .map((s) => `at ${s.t.toFixed(0)} ms: ${JSON.stringify(s)}`),
            `frames where the dl's box differs from ${JSON.stringify(first)} between 100 ms and 3 s after load ${where}`,
          )
          .toEqual([]);
      } finally {
        await run.close();
      }
    }
  }
});

test("P6 LCP stays the name: by B1.9's measurement at 4x CPU, with the dl on the page, the LCP element is the h1 at 1440 x 900, and the h1 or the bio's paragraph at 390 x 844", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const [width, height] of SIZES) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    const lcp = await measureLcp(fresh, "/");
    const where = `at ${width} x ${height}`;
    // Without the block, "LCP stays the name" would be true of today's page.
    await expect(
      fresh.locator(BLOCK),
      `${BLOCK} on the page ${where}`,
    ).toHaveCount(1);
    expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
    await fresh.close();
    if (!lcp) continue;
    test.info().annotations.push({
      type: "lcp",
      description: `${where}: <${lcp.tag}> "${lcp.text}" (${lcp.size} px²) at ${lcp.time.toFixed(0)} ms`,
    });
    const isName = lcp.tag === "h1" && lcp.inHeader;
    const isBio =
      lcp.tag === "p" &&
      lcp.inHeader &&
      lcp.text.length >= 30 &&
      TITLE_BIO.startsWith(lcp.text);
    expect
      .soft(
        width === 1440 ? isName : isName || isBio,
        `LCP <${lcp.tag}> "${lcp.text}" is ${width === 1440 ? "the h1" : "the h1 or the bio's paragraph"} ${where}`,
      )
      .toBe(true);
  }
});

/** Each dt and dd, and each element inside them with text of its own, and its text contrast. */
function blockContrast(page: Page) {
  return page.evaluate((block) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba) return [{ text: "no __rgba", ratio: 0 }];
    const lum = (c: number[]) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * ch(c[0] ?? 0) + 0.7152 * ch(c[1] ?? 0) + 0.0722 * ch(c[2] ?? 0)
      );
    };
    const over = (top: number[], bottom: number[]) => {
      const a = top[3] ?? 1;
      return [0, 1, 2].map(
        (i) => (top[i] ?? 0) * a + (bottom[i] ?? 0) * (1 - a),
      );
    };
    const root = rgba(getComputedStyle(document.body).backgroundColor) ??
      rgba(getComputedStyle(document.documentElement).backgroundColor) ?? [
        255, 255, 255, 1,
      ];
    const groundOf = (el: Element) => {
      const layers: number[][] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        const c = rgba(getComputedStyle(a).backgroundColor);
        if (c) layers.push(c);
        if (c && (c[3] ?? 0) >= 0.99) break;
      }
      let ground = [...root.slice(0, 3)];
      for (const layer of layers.reverse()) ground = over(layer, ground);
      return ground;
    };
    const dl = document.querySelector(block);
    const cells = [...(dl?.querySelectorAll("dt, dd") ?? [])];
    return [
      ...new Set(
        cells.flatMap((cell) => [cell, ...cell.querySelectorAll("*")]),
      ),
    ]
      .filter(
        (el) =>
          el.getClientRects().length > 0 &&
          (el.textContent ?? "").trim() !== "",
      )
      .map((el) => {
        const ground = groundOf(el);
        const ink = over(
          rgba(getComputedStyle(el).color) ?? [0, 0, 0, 1],
          ground,
        );
        const [hi, lo] = [lum(ink), lum(ground)].sort((x, y) => y - x);
        return {
          text: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
          ratio: ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05),
        };
      });
  }, BLOCK);
}

/** The block's elements past the viewport's left or right edge, or cut by their own overflow. */
function blockOverflow(page: Page) {
  return page.evaluate((block) => {
    const cw = document.documentElement.clientWidth;
    const dl = document.querySelector(block);
    return [...(dl ? [dl, ...dl.querySelectorAll("*")] : [])]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cut =
          getComputedStyle(el).overflowX !== "visible" &&
          el.scrollWidth > el.clientWidth + 1;
        return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5 || cut);
      })
      .map(
        (el) =>
          `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
  }, BLOCK);
}

test("P7 inert, and in the sweeps: no a, button or [tabindex] in the dl; at 1440 and 390 in both schemes axe with the strict tags is clean on / with the block present and every dt and dd has 4.5:1 text contrast; nothing overflows at 320", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.context().addInitScript(refuseWebGl);
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [width, height] of SIZES) {
      await openHome(page, width, height);
      const where = `at ${width}, ${scheme}`;
      await expect(page.locator(BLOCK), `${BLOCK} ${where}`).toHaveCount(1);
      expect
        .soft(
          await page
            .locator(`${BLOCK} :is(a, button, [tabindex]), ${BLOCK}[tabindex]`)
            .count(),
          `a, button or [tabindex] in the dl ${where}`,
        )
        .toBe(0);
      const results = await new AxeBuilder({ page })
        .withTags(AXE_TAGS)
        .analyze();
      expect
        .soft(
          results.violations.map((v) => ({
            rule: v.id,
            targets: v.nodes.map((n) => n.target.join(" ")),
          })),
          `axe on / ${where}`,
        )
        .toEqual([]);
      const contrast = await blockContrast(page);
      expect
        .soft(contrast.length, `dt and dd text ${where}`)
        .toBeGreaterThan(0);
      expect
        .soft(
          contrast
            .filter((t) => t.ratio < 4.5 - 0.005)
            .map((t) => `${t.text}: ${t.ratio.toFixed(2)}:1`),
          `dt or dd under 4.5:1 ${where}`,
        )
        .toEqual([]);
    }
    await openHome(page, 320, 844);
    expect
      .soft(await horizontalOverflow(page), `page overflow at 320, ${scheme}`)
      .toBe(0);
    expect
      .soft(await blockOverflow(page), `the dl's overflow at 320, ${scheme}`)
      .toEqual([]);
  }
});
