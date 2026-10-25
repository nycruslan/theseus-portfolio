import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { SITE_URL } from "../lib/site";
import {
  composite,
  contrast,
  horizontalOverflow,
  installRgba,
  measureLcp,
  parseColor,
  type Rgb,
  resolveColors,
  rootTokens,
  SCHEMES,
  textStyles,
} from "./helpers";
import {
  BAR,
  EVERY,
  entryOf,
  ITEMS,
  LOG,
  NEWEST,
  open,
  prHref,
  RECORD,
  type Rgba,
  ROWS,
  readRecord,
  readRows,
  recordOf,
  sameColor,
  shown,
  squash,
  tokenRgba,
  VALID,
  WRONG,
  withoutScripts,
} from "./log";
import {
  cellsOf,
  dateCell,
  GHOST,
  GHOST_CAPTION,
  GHOST_COUNT,
  LEDE,
  MERGED,
  neighbours,
  PLANK_IDS,
  SEAT_OF,
} from "./retros";

// Sprint 30, B5a: /log, the ghost hull in 2D, and a record per revision at /log/<n>, replacing
// /sprints (.crew/sprint/29/b5-first-contract.md). Checks B5.1 to B5.5 and B5.8 to B5.11, one
// describe per number, written before the build; the records' own checks, B5.6 and B5.7, are in
// log-record.spec.ts, and what both use is in log.ts. This file was sprints.spec.ts (sprint 13's C1
// to C13 for the build log): it moved with the route (.crew/sprint/30/decisions.md, 5), each
// rewritten test keeps its C-number in its title beside its B5 number, C12's seven tests run
// unedited, and the contract's batch F (C1.2, C6.1 to C6.4, C7.1 to C7.3, C11.2 "only the h2s
// rise") retired with the old column, for the owner to approve. Sprint 32 (B5b, B5.17) rewrites
// B5.5's six heads into seven, Date last after Approved, and each row's cells gain the Date; the dates'
// own checks, B5.12 to B5.16, are in log-dates.spec.ts.
//
// The oracle is e2e/retros.ts: the contract's data rules in this suite's own lines over the retro
// files in the checkout under test, never the page's reader. No check holds the number of
// revisions; the anchors (sprints 1 to 11, whose retros are history) pin the oracle itself.
//
// Hooks the contract names and these checks rely on, and no others: `[data-ghost]` holding
// `path[data-plank][data-sprint].plank-ghost` and `.plan-plank` lettering, `[data-current]` on a
// record's plank, `p[data-ghost-caption]`, `p[data-ghost-count]`, the two sections by their
// `aria-labelledby` (`every-revision`, `record`), `th[scope="row"] a[href="/log/<n>"]`, the bar as a
// `header` before `main` with `a[href="/"]` and `nav[aria-label="Main"]`, and `--vellum` on :root.
// A led-out number is read as on / (plan.spec.ts): a `path.ln-leader` from the number into its plank.

const GHOST_HULL = "[data-ghost]";
const HEADS = [
  "Rev",
  "Description",
  "Drawn",
  "Checked",
  "Tested",
  "Approved",
  "Date",
];
const DESCRIPTION =
  "A crew of AI agents rebuilds this site one sprint at a time. The Log keeps every revision: who drew, checked, tested and approved it, and what went wrong.";
const WIDTHS = [320, 390, 768, 1024, 1440] as const;
// WCAG 2.2 A and AA, and axe's best practices (the same set as invariants.spec.ts).
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

// ---------------------------------------------------------------------------------------------
// Shared page helpers

/** Waits out clock animations (a ring may fade in), and two frames for a scroll Tab caused. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    );
    for (let frame = 0; frame < 2; frame++) {
      await new Promise((done) => requestAnimationFrame(done));
    }
  });
}

/** The page's own canvas colour of `css` (installRgba), as [r, g, b, a]. */
function painted(page: Page, css: string): Promise<Rgba> {
  return page.evaluate((selector) => {
    const rgba = (window as Window & { __rgba?: (c: string) => Rgba }).__rgba;
    const el = document.querySelector(selector) ?? document.body;
    return rgba ? rgba(getComputedStyle(el).backgroundColor) : null;
  }, css);
}

const rgbOf = (c: Rgba): Rgb => [c?.[0] ?? 0, c?.[1] ?? 0, c?.[2] ?? 0];
const over = (c: Rgba, ground: Rgb): Rgb =>
  composite([c?.[0] ?? 0, c?.[1] ?? 0, c?.[2] ?? 0, c?.[3] ?? 1], ground);

// ---------------------------------------------------------------------------------------------
// B5.1 The route and the bar

type Skeleton = Awaited<ReturnType<typeof skeleton>>;

async function skeleton(page: Page) {
  return page.evaluate((every) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const main = document.querySelector("main");
    const header = [...document.querySelectorAll("header")].find(
      (h) =>
        !h.closest("main") &&
        main !== null &&
        Boolean(
          h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    const nav = header?.querySelector('nav[aria-label="Main"]') ?? null;
    return {
      mains: document.querySelectorAll("main").length,
      mainWithId: document.querySelectorAll('main#main[tabindex="-1"]').length,
      firstLink: document.querySelector("a")?.getAttribute("href") ?? null,
      h1s: [...document.querySelectorAll("h1")].map((h) => squashed(h)),
      sections: [...(main?.querySelectorAll("section") ?? [])].map((s) =>
        s.getAttribute("aria-labelledby"),
      ),
      every: document.querySelector(every) !== null,
      header: header !== undefined,
      nav: nav !== null,
      controls: [
        ...(header?.querySelectorAll(
          'a, button, input, select, [role="button"], [role="link"]',
        ) ?? []),
      ]
        .filter((el) => el.getAttribute("href") !== "#main")
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: squashed(el),
          href: el.getAttribute("href"),
          inNav: nav?.contains(el) ?? false,
          current: el.getAttribute("aria-current"),
        })),
      buttons: header?.querySelectorAll("button").length ?? -1,
      motion: header?.querySelectorAll("[data-motion]").length ?? -1,
      crew: /\bcrew\b/i.test(squashed(header ?? null)),
    };
  }, EVERY);
}

function expectSkeleton(found: Skeleton, how: string, current: string) {
  expect.soft(found.mains, `main elements (${how})`).toBe(1);
  expect.soft(found.mainWithId, `main#main[tabindex="-1"] (${how})`).toBe(1);
  expect.soft(found.firstLink, `the first a in the DOM (${how})`).toBe("#main");
  expect.soft(found.h1s, `h1 elements (${how})`).toEqual(["Log"]);
  expect.soft(found.every, `the Every revision section (${how})`).toBe(true);
  expect.soft(found.header, `a <header> before main (${how})`).toBe(true);
  expect.soft(found.nav, `nav[aria-label="Main"] in it (${how})`).toBe(true);
  // C1.1's back link is the bar's wordmark now; Log is the current page, or a record's parent.
  expect
    .soft(found.controls, `the bar's wordmark and links, in order (${how})`)
    .toEqual([
      { tag: "a", text: "Theseus", href: "/", inNav: false, current: null },
      ...BAR.map((link) => ({
        tag: "a",
        ...link,
        inNav: true,
        current: link.href === LOG ? current : null,
      })),
    ]);
  expect.soft(found.buttons, `buttons in the bar (${how})`).toBe(0);
  expect.soft(found.motion, `[data-motion] in the bar (${how})`).toBe(0);
  expect.soft(found.crew, `"Crew" in the bar (${how})`).toBe(false);
}

/** The bar's five targets at the current width: boxes, and each label's lines of text. */
function readBarTargets(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const header = [...document.querySelectorAll("header")].find(
      (h) =>
        !h.closest("main") &&
        main !== null &&
        Boolean(
          h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    const targets = [
      ...(header?.querySelectorAll('a[href]:not([href="#main"])') ?? []),
    ];
    return targets.map((a) => {
      const r = a.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(a);
      const rects = [...range.getClientRects()].filter((x) => x.width > 0);
      return {
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
        width: r.width,
        height: r.height,
        inside:
          r.left >= -0.5 &&
          r.top >= -0.5 &&
          r.right <= cw + 0.5 &&
          r.bottom <= ch + 0.5,
        lines: new Set(rects.map((x) => Math.round(x.top))).size,
        top: Math.min(...rects.map((x) => x.top)),
        bottom: Math.max(...rects.map((x) => x.bottom)),
      };
    });
  });
}

/** "in view" when the element's top is below the bar's bottom edge and inside the viewport. */
function clearOfTheBar(page: Page, id: string) {
  return page.evaluate((target) => {
    const el = document.getElementById(target);
    const bar = document.querySelector("header:has(nav)");
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    const under = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
    return r.top >= under - 1 && r.top < innerHeight
      ? "in view"
      : `top ${r.top}, bar ${under}`;
  }, id);
}

test.describe("B5.1 The route and the bar", () => {
  test("B5.1 (C1.1) /log is 200 with scripts on and off: one main#main, the skip link first, one h1 Log, and the bar's wordmark and four links with Log current and no button; a record's bar the same with Log its parent", async ({
    page,
    browser,
  }) => {
    await open(page, LOG, 1440);
    expectSkeleton(await skeleton(page), "/log, scripts on", "page");
    const section = page.locator(EVERY);
    await expect(section, "the Every revision section").toHaveRole("region");
    await expect(section, "the Every revision section").toHaveAccessibleName(
      "Every revision",
    );
    expect
      .soft((await skeleton(page)).sections, "sections in main on /log")
      .toEqual(["every-revision"]);

    await open(page, recordOf(13), 1440);
    expectSkeleton(await skeleton(page), "/log/13, scripts on", "true");
    expect
      .soft((await skeleton(page)).sections, "sections in main on /log/13")
      .toEqual(["record", "every-revision"]);

    for (const url of [LOG, recordOf(13)]) {
      const bare = await withoutScripts(browser, url);
      expect(bare.status, `status of ${url} with scripts off`).toBe(200);
      const ran = await bare.page.evaluate(
        () => typeof (self as { __next_f?: unknown }).__next_f,
      );
      expect(ran, `page scripts ran on ${url}`).toBe("undefined");
      expectSkeleton(
        await skeleton(bare.page),
        `${url}, scripts off`,
        url === LOG ? "page" : "true",
      );
      await bare.context.close();
    }
  });

  test("B5.1 at 320, 390, 768, 1024 and 1440 the bar is one line of targets inside the viewport (44 px tall below 1024, 24 from it), and the wordmark, Work, Contact and Read as page land", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    for (const width of WIDTHS) {
      await open(page, LOG, width);
      const targets = await readBarTargets(page);
      const at = `at ${width} px`;
      expect
        .soft(
          targets.map((t) => t.text),
          `the bar's targets ${at}`,
        )
        .toEqual(["Theseus", ...BAR.map((link) => link.text)]);
      const tall = width < 1024 ? 44 : 24;
      expect
        .soft(
          targets
            .filter((t) => t.width < 24 - 0.05 || t.height < tall - 0.05)
            .map((t) => `${t.text}: ${t.width} x ${t.height}`),
          `bar targets under 24 px wide or ${tall} px tall ${at}`,
        )
        .toEqual([]);
      expect
        .soft(
          targets.filter((t) => !t.inside).map((t) => t.text),
          `bar targets not wholly inside the viewport ${at}`,
        )
        .toEqual([]);
      // A wrapped label still passes "equal tops" in a flex row (sprint 27), so each label is one
      // line, and the five share one band: every label's text overlaps every other's vertically.
      expect
        .soft(
          targets
            .filter((t) => t.lines !== 1)
            .map((t) => `${t.text}: ${t.lines}`),
          `bar labels on more than one line ${at}`,
        )
        .toEqual([]);
      expect
        .soft(
          Math.max(...targets.map((t) => t.top)) <
            Math.min(...targets.map((t) => t.bottom)),
          `the bar's labels share one line ${at}: ${JSON.stringify(targets.map((t) => [t.text, Math.round(t.top), Math.round(t.bottom)]))}`,
        )
        .toBe(true);
      expect
        .soft(await horizontalOverflow(page), `page overflow ${at}`)
        .toBe(0);

      // From the bar: the wordmark and Read as page land on their pages, Work and Contact on /'s
      // sections, in view and clear of /'s bar.
      for (const href of ["/", "/read"]) {
        await open(page, LOG, width);
        await page.locator(`header a[href="${href}"]`).first().click();
        await page.waitForURL((url) => url.pathname === href);
        await expect(
          page.locator("h1"),
          `after ${href} from /log ${at}`,
        ).toHaveText(profile.name);
      }
      for (const id of ["work", "contact"]) {
        await open(page, LOG, width);
        await page.locator(`header a[href="/#${id}"]`).click();
        await page.waitForURL((url) => url.pathname === "/");
        await expect
          .poll(() => new URL(page.url()).hash, `hash after /#${id} ${at}`)
          .toBe(`#${id}`);
        await expect
          .poll(
            () => clearOfTheBar(page, id),
            `#${id} in view and clear of the bar after /#${id} ${at}`,
          )
          .toBe("in view");
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// B5.2 /sprints is gone, and nothing points at it

test("B5.2 (C2.2) /sprints answers 308 to /log; no page links to /sprints; the sitemap lists /log and every record, not /sprints; robots.txt disallows neither", async ({
  page,
  request,
}) => {
  const moved = await request.get("/sprints", { maxRedirects: 0 });
  expect(moved.status(), "status of /sprints, not followed").toBe(308);
  expect(moved.headers().location ?? "", "its Location").toMatch(/\/log$/);
  await page.goto("/sprints");
  expect(new URL(page.url()).pathname, "where /sprints lands").toBe(LOG);
  await expect(page.locator("h1"), "the h1 after /sprints").toHaveText("Log");

  for (const route of ["/", "/read", LOG, recordOf(13), "/no-such-page"]) {
    const html = await (await request.get(route)).text();
    expect
      .soft(
        html.match(/href="(?:https?:\/\/[^"/]+)?\/sprints(?=["/?#])/g) ?? [],
        `links to /sprints in the server HTML of ${route}`,
      )
      .toEqual([]);
  }

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status(), "status of /sitemap.xml").toBe(200);
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (match) => match[1] ?? "",
  );
  expect(locs, "URLs in the sitemap").toEqual(
    expect.arrayContaining([
      `${SITE_URL}/`,
      `${SITE_URL}/read`,
      `${SITE_URL}${LOG}`,
    ]),
  );
  expect(
    locs.filter((loc) => /\/log\/[^/]+$/.test(loc)).sort(),
    "the records in the sitemap: every merged revision, and no other",
  ).toEqual(MERGED.map((e) => `${SITE_URL}${recordOf(e.sprint)}`).sort());
  expect(
    locs.filter((loc) => /\/sprints\/?$/.test(loc)),
    "/sprints in the sitemap",
  ).toEqual([]);

  const robots = await (await request.get("/robots.txt")).text();
  const disallowed = robots
    .split("\n")
    .map((line) => line.split("#")[0]?.trim() ?? "")
    .flatMap((line) => {
      const rule = line.match(/^disallow\s*:\s*(\S+)/i)?.[1];
      return rule ? [rule.replace(/\*$/, "")] : [];
    })
    .filter((rule) => LOG.startsWith(rule) || recordOf(13).startsWith(rule));
  expect(disallowed, "robots.txt rules that cover /log or a record").toEqual(
    [],
  );
});

// ---------------------------------------------------------------------------------------------
// B5.3 The first screen

test("B5.3 at 1440 x 900 and 390 x 844, both schemes: on /log the h1, the count line and the first row start in the viewport; on /log/13 and the newest record, the record's h2", async ({
  page,
}) => {
  const starts = (selectors: string[]) =>
    page.evaluate(
      (list) =>
        list.map((selector) => {
          const el = document.querySelector(selector);
          const top = el ? el.getBoundingClientRect().top : Number.NaN;
          return { selector, top, inside: top >= 0 && top < innerHeight };
        }),
      selectors,
    );
  for (const scheme of SCHEMES) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      const where = `${width} x ${height}, ${scheme}`;
      await open(page, LOG, width, scheme, height);
      for (const found of await starts([
        "main h1",
        "p[data-ghost-count]",
        ROWS,
      ])) {
        expect
          .soft(
            found.inside,
            `${found.selector} starts at ${found.top} on /log, ${where}`,
          )
          .toBe(true);
      }
      for (const n of [...new Set([13, NEWEST])]) {
        await open(page, recordOf(n), width, scheme, height);
        for (const found of await starts([`${RECORD} h2`])) {
          expect
            .soft(
              found.inside,
              `the record's h2 starts at ${found.top} on /log/${n}, ${where}`,
            )
            .toBe(true);
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B5.4 The ghost hull

type Rect = { left: number; top: number; right: number; bottom: number };

/** The ghost hull as a visitor's browser has it: its planks, lettering, leaders and rect. */
async function readGhost(page: Page) {
  return page.evaluate((selector) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const box = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const ghosts = document.querySelectorAll(selector);
    const ghost = ghosts[0];
    if (!ghost) return null;
    const shown = (el: Element) =>
      el.getClientRects().length > 0 &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const geometry = (el: Element) =>
      el instanceof SVGGeometryElement
        ? [el]
        : [
            ...el.querySelectorAll(
              "path, polygon, rect, polyline, ellipse, circle",
            ),
          ].filter(
            (g): g is SVGGeometryElement => g instanceof SVGGeometryElement,
          );
    // Whether a screen point is in a plank's painted fill, inside every clipPath an ancestor applies.
    const inPlank = (plank: Element, x: number, y: number) =>
      geometry(plank).some((g) => {
        const m = g.getScreenCTM();
        if (
          !m ||
          !g.isPointInFill(new DOMPoint(x, y).matrixTransform(m.inverse()))
        ) {
          return false;
        }
        for (
          let el: Element | null = g;
          el && el !== ghost;
          el = el.parentElement
        ) {
          const ref = getComputedStyle(el).clipPath.match(
            /url\(["']?#([^"')]+)["']?\)/,
          )?.[1];
          if (!ref) continue;
          const clip = document.getElementById(ref);
          const owner =
            el instanceof SVGGraphicsElement ? el.getScreenCTM() : null;
          if (!clip || !owner) return false;
          const local = new DOMPoint(x, y).matrixTransform(owner.inverse());
          if (!geometry(clip).some((c) => c.isPointInFill(local))) return false;
        }
        return true;
      });
    const all = [...ghost.querySelectorAll("[data-plank]")];
    const shownPlanks = all.filter(shown);
    const planks = all.map((el) => {
      const svg = el.closest("svg");
      const s = getComputedStyle(el);
      const fill = rgba ? rgba(s.fill) : null;
      const alpha = Number(s.fillOpacity) * Number(s.opacity);
      return {
        id: el.getAttribute("data-plank") ?? "",
        sprint: el.getAttribute("data-sprint"),
        tag: el.tagName.toLowerCase(),
        ghostClass: el.classList.contains("plank-ghost"),
        shown: shown(el),
        box: box(el),
        svg: svg ? box(svg) : null,
        fillValue: s.fill,
        fill: fill
          ? [fill[0] ?? 0, fill[1] ?? 0, fill[2] ?? 0, (fill[3] ?? 1) * alpha]
          : null,
        stroke: rgba ? rgba(s.stroke) : null,
        strokeWidth: Number.parseFloat(s.strokeWidth),
      };
    });
    const leaders = [...ghost.querySelectorAll("path.ln-leader")]
      .filter(
        (el): el is SVGPathElement => el instanceof SVGPathElement && shown(el),
      )
      .flatMap((leader) => {
        const m = leader.getScreenCTM();
        const svg = leader.ownerSVGElement;
        if (!m || !svg) return [];
        return (leader.getAttribute("d") ?? "")
          .split(/(?=M)/)
          .filter((d) => d.trim() !== "")
          .map((d) => {
            const probe = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            probe.setAttribute("d", d);
            svg.append(probe);
            const length = probe.getTotalLength();
            const [a, b] = [
              probe.getPointAtLength(0),
              probe.getPointAtLength(length),
            ];
            probe.remove();
            const start = new DOMPoint(a.x, a.y).matrixTransform(m);
            const end = new DOMPoint(b.x, b.y).matrixTransform(m);
            const into = shownPlanks.find((p) => inPlank(p, end.x, end.y));
            return { start, into: into?.getAttribute("data-plank") ?? null };
          });
      });
    const LEADER_GAP = 6;
    const texts = [...ghost.querySelectorAll("*")]
      .filter(
        (el) =>
          shown(el) &&
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      )
      .map((el) => {
        const s = getComputedStyle(el);
        const svg = el instanceof SVGGraphicsElement;
        const ctm = svg ? el.getScreenCTM() : null;
        const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const on = shownPlanks.find((p) => inPlank(p, cx, cy));
        const led = leaders
          .filter(
            ({ start }) =>
              Math.max(r.left - start.x, 0, start.x - r.right) ** 2 +
                Math.max(r.top - start.y, 0, start.y - r.bottom) ** 2 <=
              LEADER_GAP ** 2,
          )
          .flatMap(({ into }) => (into ? [into] : []));
        return {
          text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
          color: rgba ? rgba(svg ? s.fill : s.color) : null,
          opacity: Number(svg ? s.fillOpacity : 1) * Number(s.opacity),
          size: Number.parseFloat(s.fontSize) * scale,
          on: on?.getAttribute("data-plank") ?? null,
          led,
        };
      });
    return {
      count: ghosts.length,
      ariaHidden: ghost.getAttribute("aria-hidden"),
      focusable: ghost.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]',
      ).length,
      seatedOrOriginal: ghost.querySelectorAll(".plank-seated, .plank-original")
        .length,
      patterns: ghost.querySelectorAll("pattern").length,
      hatched: [...ghost.querySelectorAll("*")].flatMap((el) => {
        const s = getComputedStyle(el);
        return [s.fill, s.stroke]
          .filter((paint) => paint.startsWith("url("))
          .map((paint) => `<${el.tagName.toLowerCase()}> ${paint}`);
      }),
      planks,
      texts,
      rect: box(ghost),
      cw: document.documentElement.clientWidth,
      bytes: new TextEncoder().encode(ghost.outerHTML).length,
    };
  }, GHOST_HULL);
}

/** The ghost's planks as the oracle's map: seat to number. */
const ghostMap = (planks: { id: string; sprint: string | null }[]) =>
  Object.fromEntries(planks.map((p) => [p.id, Number(p.sprint)]));

/** The Log's header lines and their order in main. */
function headerLines(page: Page) {
  return page.evaluate(() => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const main = document.querySelector("main");
    const h1 = main?.querySelector("h1") ?? null;
    const caption = main?.querySelector("p[data-ghost-caption]") ?? null;
    const count = main?.querySelector("p[data-ghost-count]") ?? null;
    const before = (a: Element | null, b: Element | null) =>
      Boolean(
        a &&
          b &&
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    return {
      captions: document.querySelectorAll("p[data-ghost-caption]").length,
      counts: document.querySelectorAll("p[data-ghost-count]").length,
      caption: squashed(caption),
      count: squashed(count),
      ordered: before(h1, caption) && before(caption, count),
    };
  });
}

test.describe("B5.4 The ghost hull", () => {
  test("B5.4 the ghost hull is in the HTML, hidden from assistive tech and inert, with exactly the data rules' planks, none seated, original, hatched or copper, at most 32,768 B, under its caption and count line, with scripts on and off", async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const html = await (await request.get(LOG)).text();
    const at = html.search(/data-ghost(?:=|[\s>])/);
    expect(at, "[data-ghost] is in the HTML response of /log").toBeGreaterThan(
      -1,
    );
    expect
      .soft(html.slice(at), "ghost planks in the HTML")
      .toContain('data-plank="');
    // The oracle's ghost: every seat with a holder, numbered by its first; gaps only below 22.
    expect
      .soft(Object.keys(GHOST).length, "seats with a holder, by the oracle")
      .toBe(Math.min(MERGED.length, PLANK_IDS.length));

    const bare = await withoutScripts(browser, LOG);
    expect(bare.status, "status of /log with scripts off").toBe(200);
    const off = await readGhost(bare.page);
    const words = await headerLines(bare.page);
    await bare.context.close();
    await open(page, LOG, 1440);
    for (const [how, ghost, lines] of [
      ["scripts off", off, words],
      ["scripts on", await readGhost(page), await headerLines(page)],
    ] as const) {
      expect(ghost, `${GHOST_HULL} (${how})`).not.toBeNull();
      if (!ghost) continue;
      expect.soft(ghost.count, `${GHOST_HULL} elements (${how})`).toBe(1);
      expect.soft(ghost.ariaHidden, `aria-hidden (${how})`).toBe("true");
      expect.soft(ghost.focusable, `focusable elements in it (${how})`).toBe(0);
      expect
        .soft(
          ghost.planks.map((p) => p.id).sort(),
          `its planks' seats, once each (${how})`,
        )
        .toEqual(Object.keys(GHOST).sort());
      expect
        .soft(ghostMap(ghost.planks), `each ghost plank's data-sprint (${how})`)
        .toEqual(GHOST);
      expect
        .soft(
          ghost.planks
            .filter((p) => p.tag !== "path" || !p.ghostClass)
            .map((p) => `${p.id}: <${p.tag}>, plank-ghost ${p.ghostClass}`),
          `ghost planks that aren't path.plank-ghost (${how})`,
        )
        .toEqual([]);
      expect
        .soft(
          ghost.seatedOrOriginal,
          `.plank-seated or .plank-original in it (${how})`,
        )
        .toBe(0);
      expect.soft(ghost.patterns, `<pattern> in it (${how})`).toBe(0);
      expect.soft(ghost.hatched, `pattern paints in it (${how})`).toEqual([]);
      expect
        .soft(ghost.bytes, `${GHOST_HULL} outerHTML in bytes (${how})`)
        .toBeLessThanOrEqual(32_768);
      expect.soft(lines.captions, `p[data-ghost-caption] (${how})`).toBe(1);
      expect.soft(lines.counts, `p[data-ghost-count] (${how})`).toBe(1);
      expect.soft(lines.caption, `the caption (${how})`).toBe(GHOST_CAPTION);
      expect.soft(lines.count, `the count line (${how})`).toBe(GHOST_COUNT);
      expect
        .soft(
          lines.ordered,
          `h1, then the caption, then the count line (${how})`,
        )
        .toBe(true);
    }

    for (const scheme of SCHEMES) {
      await open(page, LOG, 1440, scheme);
      const accent = await tokenRgba(page, "--accent");
      const copper = await page.evaluate(
        ({ selector, accent }) => {
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          const near = (c: number[] | null) =>
            Boolean(
              c &&
                accent &&
                c
                  .slice(0, 3)
                  .every((v, i) => Math.abs(v - (accent[i] ?? -9)) <= 1),
            );
          const ghost = document.querySelector(selector);
          return [...(ghost?.querySelectorAll("*") ?? [])].flatMap((el) => {
            const s = getComputedStyle(el);
            return [s.fill, s.stroke, s.color]
              .filter((paint) => near(rgba ? rgba(paint) : null))
              .map((paint) => `<${el.tagName.toLowerCase()}> ${paint}`);
          });
        },
        { selector: GHOST_HULL, accent },
      );
      expect
        .soft(copper, `copper (--accent) in the ghost hull (${scheme})`)
        .toEqual([]);
    }

    // Nothing in it is the element at any of its points: a 3 x 3 grid and every plank's centre.
    for (const width of [390, 1440]) {
      await open(page, LOG, width);
      const hits = await page.evaluate((selector) => {
        const ghost = document.querySelector(selector);
        if (!ghost) return null;
        ghost.scrollIntoView({ block: "center" });
        const r = ghost.getBoundingClientRect();
        const points = [1 / 6, 1 / 2, 5 / 6].flatMap((fy) =>
          [1 / 6, 1 / 2, 5 / 6].map(
            (fx) => [r.left + r.width * fx, r.top + r.height * fy] as const,
          ),
        );
        for (const plank of ghost.querySelectorAll("[data-plank]")) {
          const p = plank.getBoundingClientRect();
          if (p.width > 0) {
            points.push([p.left + p.width / 2, p.top + p.height / 2]);
          }
        }
        return points.flatMap(([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return el && ghost.contains(el)
            ? [
                `<${el.tagName.toLowerCase()}> at ${Math.round(x)},${Math.round(y)}`,
              ]
            : [];
        });
      }, GHOST_HULL);
      expect(hits, `the ghost hull at ${width}`).not.toBeNull();
      expect
        .soft(hits, `ghost elements hit by elementFromPoint at ${width}`)
        .toEqual([]);
    }
  });

  test("B5.4 from 768 px each ghost plank's number shows, at least 10 px, on its plank or led out to it; from 320 to 1440 px the drawing is inside the viewport's width and uncropped", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    for (const width of WIDTHS) {
      await open(page, LOG, width);
      const ghost = await readGhost(page);
      const where = `${width} px`;
      expect(ghost, `${GHOST_HULL} at ${where}`).not.toBeNull();
      if (!ghost) continue;
      expect
        .soft(
          ghost.rect.left >= -0.5 && ghost.rect.right <= ghost.cw + 0.5,
          `the ghost hull (${ghost.rect.left} to ${ghost.rect.right}) inside the viewport's ${ghost.cw} px at ${where}`,
        )
        .toBe(true);
      expect
        .soft(
          ghost.planks
            .filter(
              (p) =>
                !p.shown ||
                !p.svg ||
                p.box.left < -0.5 ||
                p.box.right > ghost.cw + 0.5 ||
                p.box.left < p.svg.left - 0.5 ||
                p.box.right > p.svg.right + 0.5 ||
                p.box.top < p.svg.top - 0.5 ||
                p.box.bottom > p.svg.bottom + 0.5,
            )
            .map((p) => p.id),
          `ghost planks hidden, cropped or outside the viewport at ${where}`,
        )
        .toEqual([]);
      if (width < 768) continue;
      expect
        .soft(
          ghost.planks
            .filter(
              (p) =>
                !ghost.texts.some(
                  (t) =>
                    t.text === p.sprint &&
                    (t.on === p.id || t.led.includes(p.id)),
                ),
            )
            .map((p) => `${p.id} (sprint ${p.sprint})`),
          `ghost planks without their number on them, or led to them, at ${where}`,
        )
        .toEqual([]);
      expect
        .soft(
          ghost.texts
            .filter((t) => /^\d+$/.test(t.text) && t.size < 10 - 0.01)
            .map((t) => `"${t.text}": ${t.size.toFixed(2)} px`),
          `ghost numbers under 10 px at ${where}`,
        )
        .toEqual([]);
    }
  });

  test("B5.4 the ghost is vellum: --vellum on :root in both schemes, unlike --card, --card-old and --background, every plank filled with it and its numbers at least 4.5:1 on it; in forced colours each plank's edge shows", async ({
    page,
  }) => {
    for (const scheme of SCHEMES) {
      await open(page, LOG, 1440, scheme);
      const raw = await rootTokens(page, ["--vellum"]);
      expect
        .soft(raw["--vellum"], `--vellum on :root (${scheme})`)
        .not.toBe("");
      const vellum = await tokenRgba(page, "--vellum");
      expect(vellum, `--vellum resolves (${scheme})`).not.toBeNull();
      for (const other of ["--card", "--card-old", "--background"]) {
        expect
          .soft(
            sameColor(vellum, await tokenRgba(page, other)),
            `--vellum ${JSON.stringify(vellum)} is the same as ${other} (${scheme})`,
          )
          .toBe(false);
      }
      const ghost = await readGhost(page);
      expect(ghost, `${GHOST_HULL} (${scheme})`).not.toBeNull();
      if (!ghost) continue;
      expect
        .soft(
          ghost.planks
            .filter(
              (p) =>
                !p.fill ||
                !sameColor(p.fill.slice(0, 3), (vellum ?? []).slice(0, 3)),
            )
            .map((p) => `${p.id}: ${p.fillValue}`),
          `ghost planks not filled with --vellum (${scheme})`,
        )
        .toEqual([]);
      // The ground under the drawing: the nearest opaque background, the page's by default.
      const ground = rgbOf(
        await page.evaluate((selector) => {
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          for (
            let el = document.querySelector(selector);
            el;
            el = el.parentElement
          ) {
            const c = rgba ? rgba(getComputedStyle(el).backgroundColor) : null;
            if (c && (c[3] ?? 0) > 0.99) return c;
          }
          return rgba
            ? rgba(getComputedStyle(document.body).backgroundColor)
            : null;
        }, GHOST_HULL),
      );
      const numbers = ghost.texts.filter((t) => /^\d+$/.test(t.text));
      expect(
        numbers.length,
        `ghost numbers at 1440 (${scheme})`,
      ).toBeGreaterThan(0);
      for (const number of numbers) {
        const plank = ghost.planks.find((p) => p.id === number.on);
        const under = plank?.fill ? over(plank.fill, ground) : ground;
        const ink = number.color
          ? [
              number.color[0] ?? 0,
              number.color[1] ?? 0,
              number.color[2] ?? 0,
              (number.color[3] ?? 1) * number.opacity,
            ]
          : null;
        expect
          .soft(
            ink ? contrast(over(ink, under), under) : 0,
            `number ${number.text} ${number.on ? `on plank ${number.on}` : "led out"} (${scheme})`,
          )
          .toBeGreaterThanOrEqual(4.5);
      }
    }

    await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
    for (const width of [390, 1440]) {
      await open(page, LOG, width);
      const canvas = await painted(page, "body");
      const ghost = await readGhost(page);
      expect(
        ghost,
        `${GHOST_HULL} in forced colours at ${width}`,
      ).not.toBeNull();
      expect
        .soft(
          (ghost?.planks ?? [])
            .filter(
              (p) =>
                !p.stroke ||
                !(p.strokeWidth > 0) ||
                sameColor(p.stroke.slice(0, 3), (canvas ?? []).slice(0, 3)),
            )
            .map(
              (p) => `${p.id}: ${JSON.stringify(p.stroke)} ${p.strokeWidth} px`,
            ),
          `ghost planks whose edge doesn't show in forced colours at ${width} (Canvas ${JSON.stringify(canvas)})`,
        )
        .toEqual([]);
    }
  });

  test("B5.4 on each record exactly one ghost plank carries data-current, at its sprint's seat; on /log none does", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await open(page, LOG, 1440);
    expect
      .soft(
        await page.locator(`${GHOST_HULL} [data-current]`).count(),
        "[data-current] in the ghost on /log",
      )
      .toBe(0);
    for (const entry of VALID) {
      await open(page, recordOf(entry.sprint), 1440);
      const current = await page.evaluate(
        (selector) =>
          [...document.querySelectorAll(`${selector} [data-current]`)].map(
            (el) => el.getAttribute("data-plank"),
          ),
        GHOST_HULL,
      );
      expect
        .soft(current, `the ghost's [data-current] on /log/${entry.sprint}`)
        .toEqual([SEAT_OF.get(entry.sprint)]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// B5.5 Every revision

test.describe("B5.5 Every revision", () => {
  test("B5.5 (C3.1) one row per merged sprint, newest first, each row's cells as the oracle's, under the h2 Every revision, its lede and the seven heads", async ({
    page,
  }) => {
    // The anchors: sprints 1 to 11 are history, so they must be there whatever the oracle saw.
    expect(
      VALID.map((entry) => entry.sprint),
      "valid retros found in .crew/sprint (at least sprints 1 to 11)",
    ).toEqual(
      expect.arrayContaining(Array.from({ length: 11 }, (_, i) => i + 1)),
    );
    await open(page, LOG, 1440);
    await expect(page.locator(`${EVERY} table`), "tables").toHaveCount(1);
    await expect(page.locator(ROWS), "rows").toHaveCount(VALID.length);
    const rows = await readRows(page);
    expect(
      rows.map((row) => row.number),
      "revision numbers, top to bottom",
    ).toEqual(VALID.map((entry) => entry.sprint));
    for (const [i, entry] of VALID.entries()) {
      const cells = cellsOf(entry);
      expect
        .soft(rows[i]?.cells, `the cells of revision ${entry.sprint}`)
        .toEqual([
          cells.description,
          cells.drawn,
          cells.checked,
          cells.tested,
          cells.approved,
          dateCell(entry),
        ]);
      expect
        .soft(rows[i]?.links, `links in revision ${entry.sprint}'s th`)
        .toBe(1);
    }
    const head = await page.evaluate((every) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const section = document.querySelector(every);
      const h2 = section?.querySelector("h2");
      return {
        h2: h2 ? { id: h2.id, text: squashed(h2) } : null,
        lede: squashed(section?.querySelector("p") ?? null),
        heads: [
          ...(section?.querySelectorAll('thead th[scope="col"]') ?? []),
        ].map((th) => squashed(th)),
      };
    }, EVERY);
    expect
      .soft(head.h2, "its h2")
      .toEqual({ id: "every-revision", text: "Every revision" });
    expect.soft(head.lede, "its lede").toBe(LEDE);
    expect.soft(head.heads, "its column heads").toEqual(HEADS);
  });

  test("B5.5 (C3.2) anchors: 10 before 9, 2 before 1 (not a sort by folder name), and 1 last", async ({
    page,
  }) => {
    await open(page, LOG, 1440);
    const rendered = (await readRows(page)).map((row) => row.number);
    const at = (n: number) => rendered.indexOf(n);
    expect(at(10), "revision 10 is listed").toBeGreaterThanOrEqual(0);
    expect(at(9), "revision 9 is listed").toBeGreaterThanOrEqual(0);
    expect(at(10), "revision 10 comes before 9").toBeLessThan(at(9));
    expect(at(2), "revision 2 comes before 1").toBeLessThan(at(1));
    expect(rendered.at(-1), "the last row").toBe(1);
  });

  test("B5.5 (C4.1) each Rev link is named 'Revision N' with a real space, shows the number alone and points at /log/N, and each row's Description is its goal, at every width", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Word for word, from sprint 12's contract: the prefix, the backticks and the capital applied.
    const anchors: [number, string][] = [
      [
        1,
        "Design tokens (5 colors, 5 fluid type steps in app/globals.css, used across the page)",
      ],
      [
        8,
        "The subtle 3D hero, Part A of the sprint 7 contract (static SVG lift half-model, C1-C9)",
      ],
      [
        11,
        "Stack separators: a drawn middle dot between the tools in the Stack section (Iris's sprint 6 item 2)",
      ],
      // A parenthetical that says more than the size stays; a bare size tag goes.
      [12, "Watch the team build: the build log's contract (L, contract step)"],
      [
        15,
        "Redesign, direction step: the concept, key screens, motion storyboard and budgets, with the contract for the build",
      ],
    ];
    for (const [n, goal] of anchors) {
      expect(entryOf(n)?.goal, `the oracle's goal for sprint ${n}`).toBe(goal);
    }

    for (const width of WIDTHS) {
      await open(page, LOG, width);
      const rows = await readRows(page);
      expect(rows.length, `rows at ${width} px`).toBe(VALID.length);
      // What the eyes get: "Revision " visually hidden (a box of at most 1 px, or clipped), the
      // number in sight.
      const sight = await page.evaluate((selector) => {
        const hiddenBox = (el: Element) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return (
            (r.width <= 1 && r.height <= 1) ||
            s.clipPath === "inset(50%)" ||
            /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(s.clip)
          );
        };
        return [...document.querySelectorAll(selector)].map((tr) => {
          const a = tr.querySelector('th[scope="row"] a');
          if (!a) return { word: false, number: false };
          const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
          let word = false;
          let number = false;
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? "";
            const holder = node.parentElement ?? a;
            if (/Revision/.test(text)) word = hiddenBox(holder);
            const digits = text.search(/\d/);
            if (digits >= 0) {
              const range = document.createRange();
              range.setStart(node, digits);
              range.setEnd(node, text.length);
              const r = range.getBoundingClientRect();
              number = r.width > 1 && r.height > 1 && !hiddenBox(holder);
            }
          }
          return { word, number };
        });
      }, ROWS);
      for (const [i, entry] of VALID.entries()) {
        const where = `revision ${entry.sprint} at ${width} px`;
        const row = rows[i];
        await expect
          .soft(
            page.locator(ROWS).nth(i).locator('th[scope="row"] a'),
            `the Rev link's accessible name, ${where}`,
          )
          .toHaveAccessibleName(`Revision ${entry.sprint}`);
        // textContent has no layout in it, and one U+0020: "Revision13" or a no-break space fail.
        expect
          .soft(row?.text.trim(), `the Rev link's text, ${where}`)
          .toBe(`Revision ${entry.sprint}`);
        expect
          .soft(row?.href, `the Rev link's href, ${where}`)
          .toBe(recordOf(entry.sprint));
        expect
          .soft(
            sight[i],
            `"Revision " hidden and the number in sight, ${where}`,
          )
          .toEqual({ word: true, number: true });
        expect
          .soft(row?.cells[0], `the Description, ${where}`)
          .toBe(entry.goal);
      }
    }
  });

  test("B5.5 (C4.5) each Description is the whole goal on as many lines as it takes: no size tag, no ellipsis, nothing clipped, and sprint 15 keeps its words, at every width", async ({
    page,
  }) => {
    for (const width of WIDTHS) {
      await open(page, LOG, width);
      const cells = await page.evaluate((selector) => {
        const squashed = (el: Element | null) =>
          (el?.textContent ?? "").replace(/\s+/g, " ").trim();
        return [...document.querySelectorAll(selector)].map((tr) => {
          const cell = tr.querySelector(":scope > td");
          const s = cell ? getComputedStyle(cell) : null;
          const clamp = s?.getPropertyValue("-webkit-line-clamp") ?? "none";
          return {
            text: squashed(cell),
            cut: {
              // An ellipsis shows only where the cell clips its overflow; text-overflow alone is inert.
              ellipsis:
                s?.textOverflow === "ellipsis" && s.overflowX !== "visible",
              clamped: clamp !== "none" && clamp !== "",
              wide: cell ? cell.scrollWidth > cell.clientWidth + 1 : true,
              tall: cell ? cell.scrollHeight > cell.clientHeight + 1 : true,
              hidden: cell
                ? !cell.checkVisibility({
                    opacityProperty: true,
                    visibilityProperty: true,
                  })
                : true,
            },
          };
        });
      }, ROWS);
      const at = `at ${width} px`;
      expect(cells.length, `rows ${at}`).toBe(VALID.length);
      for (const [i, entry] of VALID.entries()) {
        const cell = cells[i];
        const where = `revision ${entry.sprint}'s Description ${at}`;
        expect.soft(cell?.text, where).toBe(entry.goal);
        expect
          .soft(cell?.text, `${where} does not end in (S), (M) or (L)`)
          .not.toMatch(/\(\s*[SML]\s*\)$/i);
        expect.soft(cell?.cut, `${where}: cut, clamped or hidden`).toEqual({
          ellipsis: false,
          clamped: false,
          wide: false,
          tall: false,
          hidden: false,
        });
      }
      const fifteen = cells[VALID.findIndex((entry) => entry.sprint === 15)];
      expect(fifteen?.text, `revision 15's Description ${at}`).toBe(
        "Redesign, direction step: the concept, key screens, motion storyboard and budgets, with the contract for the build",
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------
// B5.8 Metadata

test.describe("B5.8 Metadata", () => {
  test("B5.8 (C2.1) /log and /log/13 carry their own title, description, canonical and og:url", async ({
    page,
  }) => {
    await page.goto("/");
    const homeTitle = await page.title();
    const pages = [
      [LOG, `Log — ${profile.name}`, DESCRIPTION],
      [recordOf(13), `Revision 13 — Log — ${profile.name}`, entryOf(13)?.goal],
    ] as const;
    for (const [url, title, description] of pages) {
      const response = await page.goto(url);
      expect(response?.status(), `status of ${url}`).toBe(200);
      expect.soft(await page.title(), `document.title of ${url}`).toBe(title);
      expect(await page.title(), "the home page's title").not.toBe(homeTitle);
      const tags = await page.evaluate(() => {
        const content = (css: string) =>
          [...document.querySelectorAll<HTMLMetaElement>(css)].map(
            (meta) => meta.content,
          );
        return {
          canonical: [
            ...document.querySelectorAll<HTMLLinkElement>(
              'link[rel="canonical"]',
            ),
          ].map((link) => link.href),
          ogUrl: content('meta[property="og:url"]'),
          description: content('meta[name="description"]'),
          ogDescription: content('meta[property="og:description"]'),
          twitterDescription: content('meta[name="twitter:description"]'),
        };
      });
      expect
        .soft(tags.canonical, `canonical of ${url}`)
        .toEqual([`${SITE_URL}${url}`]);
      expect
        .soft(tags.ogUrl, `og:url of ${url}`)
        .toEqual([`${SITE_URL}${url}`]);
      expect
        .soft(tags.description, `description of ${url}`)
        .toEqual([description]);
      // The layout's description is the owner's bio; a page that spreads the shared openGraph or
      // leaves twitter alone would claim it as the Log's.
      for (const key of ["ogDescription", "twitterDescription"] as const) {
        expect(tags[key], `${key} of ${url}`).toHaveLength(1);
        expect(tags[key][0]?.trim(), `${key} of ${url} is set`).not.toBe("");
        expect(tags[key][0], `${key} of ${url} is not the bio`).not.toBe(
          profile.bio,
        );
      }
    }
  });

  test("B5.8 (C2.3) /log and /log/13 each carry one og:image and one twitter:image, each served as image/png", async ({
    page,
    request,
  }) => {
    for (const url of [LOG, recordOf(13)]) {
      const response = await page.goto(url);
      expect(response?.status(), `status of ${url}`).toBe(200);
      // A page that sets its own openGraph or twitter replaces the layout's whole, and takes the
      // inherited image with it; /sprints once shared a card with the large-image type and no image.
      const images = await page.evaluate(() => {
        const content = (css: string) =>
          [...document.querySelectorAll<HTMLMetaElement>(css)].map(
            (meta) => meta.content,
          );
        return {
          og: content('meta[property="og:image"]'),
          twitter: content('meta[name="twitter:image"]'),
        };
      });
      expect(images.og, `og:image on ${url}`).toHaveLength(1);
      expect(images.twitter, `twitter:image on ${url}`).toHaveLength(1);
      // The tags name the production host; the same paths are served here.
      for (const [name, urls] of Object.entries(images)) {
        const image = await request.get(new URL(urls[0] ?? "").pathname);
        expect(image.status(), `status of ${url}'s ${name} image`).toBe(200);
        expect(
          image.headers()["content-type"],
          `${url}'s ${name} image type`,
        ).toBe("image/png");
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
// B5.9 The route sweeps on /log and a record (ROUTES in helpers.ts carries the site-wide ones)

const SWEPT = [LOG, recordOf(13)] as const;

for (const scheme of SCHEMES) {
  test.describe(`B5.9 Widths, ${scheme}`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    test(`B5.9 (C8.1) nothing overflows and nothing sticks out past the right, 320 to 1440 px, on /log and /log/13 (${scheme})`, async ({
      page,
    }) => {
      for (const url of SWEPT) {
        for (const width of WIDTHS) {
          await open(page, url, width);
          expect
            .soft(
              await horizontalOverflow(page),
              `horizontal overflow on ${url} at ${width} px`,
            )
            .toBeLessThanOrEqual(0);
          const out = await page.evaluate(() => {
            const view = document.documentElement.clientWidth;
            return [...document.body.querySelectorAll("*")].flatMap((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) return [];
              // What is painted: an ancestor that clips (overflow or clip-path, as a visually
              // hidden table head does) cuts the box to its own.
              let [from, to] = [r.left, r.right];
              for (let a = el.parentElement; a; a = a.parentElement) {
                const s = getComputedStyle(a);
                if (s.overflowX !== "visible" || s.clipPath !== "none") {
                  const c = a.getBoundingClientRect();
                  [from, to] = [Math.max(from, c.left), Math.min(to, c.right)];
                }
              }
              const left = el.closest("main") && from < -1.5;
              return to > view + 0.5 || left
                ? [
                    `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}": ${r.left} to ${r.right} of ${view}`,
                  ]
                : [];
            });
          });
          expect
            .soft(out, `elements outside the viewport on ${url} at ${width} px`)
            .toEqual([]);
        }
      }
    });
  });
}

test.describe("B5.9 Accessibility", () => {
  for (const scheme of SCHEMES) {
    test(`B5.9 (C9.1) axe finds nothing at 390 and 1440, with or without the skip link showing, on /log and /log/13 (${scheme})`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of SWEPT) {
        for (const width of [390, 1440]) {
          for (const skipShowing of [false, true]) {
            const where = `${url}, ${width} px, ${scheme}, ${skipShowing ? "skip link showing" : "nothing focused"}`;
            await open(page, url, width);
            if (skipShowing) await page.keyboard.press("Tab");
            const results = await new AxeBuilder({ page })
              .withTags(AXE_TAGS)
              .analyze();
            const found = results.violations.map((v) => ({
              rule: v.id,
              impact: v.impact,
              help: v.help,
              targets: v.nodes.map((node) => node.target.join(" ")),
            }));
            expect.soft(found, `axe violations (${where})`).toEqual([]);
            const passed = results.passes.map((p) => p.id);
            for (const rule of [
              "color-contrast",
              "landmark-one-main",
              "region",
            ]) {
              expect
                .soft(passed, `axe passed ${rule} (${where})`)
                .toContain(rule);
            }
          }
        }
      }
    });

    test(`B5.9 (C9.2) text meets its contrast thresholds on /log and /log/13 (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const url of SWEPT) {
        await open(page, url, 390);
        const colors = await resolveColors(page);
        const rgba = (token: string) => {
          const value = colors[token]?.rgba;
          if (!value) throw new Error(`${token} did not resolve`);
          return value;
        };
        const [r, g, b] = rgba("--background");
        const background: Rgb = [r, g, b];
        const on = (token: string) =>
          contrast(composite(rgba(token), background), background);
        expect
          .soft(on("--foreground"), `--foreground on ${url} (${scheme})`)
          .toBeGreaterThanOrEqual(7);
        for (const token of ["--muted", "--accent"]) {
          expect
            .soft(on(token), `${token} on ${url} (${scheme})`)
            .toBeGreaterThanOrEqual(4.5);
        }
        // And the colours this route's text really has, not only the tokens.
        const { texts } = await textStyles(page);
        for (const { element, color } of texts) {
          const parsed = parseColor(color);
          const ratio = parsed
            ? contrast(composite(parsed, background), background)
            : 0;
          expect
            .soft(ratio, `contrast of ${element} on ${url} (${scheme})`)
            .toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  test("B5.9 (C9.3) headings: one h1 Log, the record's h2 and its h3, then Every revision, no level skipped", async ({
    page,
  }) => {
    for (const url of SWEPT) {
      await open(page, url, 1440);
      const headings = await page.evaluate(() =>
        [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => ({
          level: Number(h.tagName.slice(1)),
          text: (h.textContent ?? "").replace(/\s+/g, " ").trim(),
        })),
      );
      const entry = url === LOG ? undefined : entryOf(13);
      expect(
        headings.map((h) => `h${h.level} ${h.text}`),
        `the headings on ${url}`,
      ).toEqual([
        "h1 Log",
        ...(entry
          ? [
              `h2 ${entry.goal}`,
              ...(entry.wentWrong.length > 0 ? [`h3 ${WRONG}`] : []),
            ]
          : []),
        "h2 Every revision",
      ]);
      let previous = 0;
      for (const { level, text } of headings) {
        expect(
          level - previous,
          `h${level} "${text.slice(0, 30)}" follows an h${previous} on ${url}`,
        ).toBeLessThanOrEqual(1);
        previous = level;
      }
    }
  });

  test("B5.9 (C9.4) every link but the skip link is at least 24 x 24 px at 390, on /log and /log/13", async ({
    page,
  }) => {
    for (const url of SWEPT) {
      await open(page, url, 390);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("a")]
          .filter((a) => a.getAttribute("href") !== "#main")
          .flatMap((a) => {
            const r = a.getBoundingClientRect();
            return r.width >= 24 - 0.05 && r.height >= 24 - 0.05
              ? []
              : [`${a.getAttribute("href")}: ${r.width} x ${r.height}`];
          }),
      );
      expect(small, `links smaller than 24 x 24 px on ${url}`).toEqual([]);
    }
  });

  test("B5.9 (C9.5) forced colors: each of the record's list dots still shows, at 390 and 1440", async ({
    page,
  }) => {
    // Windows High Contrast resets a background-only dot to Canvas, the page's own colour, so it
    // vanishes: a drawn dot must differ from the page; a list marker is text, and shows.
    await page.emulateMedia({ forcedColors: "active" });
    const n = 13;
    expect(entryOf(n)?.wentWrong.length ?? 0, `items of ${n}`).toBeGreaterThan(
      0,
    );
    for (const width of [390, 1440]) {
      await open(page, recordOf(n), width);
      const seen = await page.evaluate(
        (items) => ({
          page: getComputedStyle(document.body).backgroundColor,
          dots: [...document.querySelectorAll(items)].map((li) => {
            const dot = getComputedStyle(li, "::before");
            const s = getComputedStyle(li);
            return {
              text: (li.textContent ?? "").trim().slice(0, 24),
              drawn: dot.content !== "none" && dot.content !== "normal",
              background: dot.backgroundColor,
              marker: s.display === "list-item" && s.listStyleType !== "none",
            };
          }),
        }),
        ITEMS,
      );
      const where = `/log/${n} at ${width} px`;
      expect(seen.dots.length, `list items on ${where}`).toBeGreaterThan(0);
      expect(
        seen.dots.filter(
          (dot) =>
            !dot.marker &&
            (!dot.drawn ||
              dot.background === "transparent" ||
              dot.background === "rgba(0, 0, 0, 0)" ||
              dot.background === seen.page),
        ),
        `items with no dot, or a dot the colour of the page, in forced colors on ${where}`,
      ).toEqual([]);
    }
  });
});

test.describe("B5.9 Keyboard", () => {
  for (const scheme of SCHEMES) {
    test(`B5.9 (C10) on /log/13: the skip link first, Enter lands on main; Tab visits the bar's five links, the record's links, then each Rev link, each with one ring of 2 px ink, 2 px out (${scheme})`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await open(page, recordOf(13), 1440, scheme);
      const order = await page.evaluate(
        ({ record, rows }) => {
          const hrefs = (selector: string) =>
            [...document.querySelectorAll(selector)]
              .filter((a) => a.checkVisibility())
              .map((a) => a.getAttribute("href") ?? "");
          return {
            all: hrefs("a[href]"),
            record: hrefs(`${record} a[href]`),
            revs: hrefs(`${rows} th a[href]`),
          };
        },
        { record: RECORD, rows: ROWS },
      );
      const { previous, next } = neighbours(13);
      const pr = entryOf(13)?.pr;
      expect
        .soft([...order.record].sort(), "the record's links")
        .toEqual(
          [
            LOG,
            ...(pr ? [prHref(pr)] : []),
            ...[previous, next].flatMap((m) => (m ? [recordOf(m)] : [])),
          ].sort(),
        );
      expect
        .soft(order.revs, "the Rev links")
        .toEqual(VALID.map((entry) => recordOf(entry.sprint)));
      const expected = [
        "#main",
        "/",
        ...BAR.map((link) => link.href),
        ...order.record,
        ...order.revs,
      ];
      expect(order.all, "the visible links in DOM order").toEqual(expected);

      const skip = page.locator('a[href="#main"]');
      const before = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      });
      expect(
        (before.width <= 1 && before.height <= 1) ||
          before.right <= 0 ||
          before.bottom <= 0,
        `skip link hidden before focus: ${JSON.stringify(before)}`,
      ).toBe(true);

      const ink = await tokenRgba(page, "--foreground");
      const visited: string[] = [];
      const problems: string[] = [];
      for (let presses = 0; presses < expected.length + 2; presses++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (el?.tagName !== "A") return null;
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            href: el.getAttribute("href") ?? "",
            seen:
              el.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) &&
              box.width > 1 &&
              box.height > 1 &&
              box.right > 0 &&
              box.bottom > 0 &&
              box.left < innerWidth &&
              box.top < innerHeight,
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
            color: rgba ? rgba(style.outlineColor) : null,
            offset: Number.parseFloat(style.outlineOffset),
          };
        });
        if (!stop) break;
        visited.push(stop.href);
        const why = [
          stop.seen ? "" : "can't be seen when focused",
          stop.style === "solid" ? "" : `ring style ${stop.style}`,
          Math.abs(stop.width - 2) <= 0.05 ? "" : `ring width ${stop.width}`,
          Math.abs(stop.offset - 2) <= 0.05 ? "" : `ring offset ${stop.offset}`,
          sameColor(stop.color, ink)
            ? ""
            : `ring colour ${JSON.stringify(stop.color)}`,
        ].filter(Boolean);
        if (why.length) problems.push(`${stop.href}: ${why.join("; ")}`);
      }
      expect(visited, `Tab order (${scheme})`).toEqual(expected);
      expect(
        problems,
        `stops that are not seen or lack a ring of 2 px ink, 2 px out (${scheme})`,
      ).toEqual([]);

      const tabindexes = await page.evaluate(() =>
        [...document.querySelectorAll("[tabindex]")].map(
          (el) =>
            `<${el.tagName.toLowerCase()}> tabindex="${el.getAttribute("tabindex")}"`,
        ),
      );
      expect(tabindexes, `tabindex attributes (${scheme})`).toEqual([
        '<main> tabindex="-1"',
      ]);

      // Enter on the skip link lands on main, which shows no ring; the next Tab is main's first link.
      await open(page, recordOf(13), 1440);
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.getAttribute("href")),
        "the first Tab focuses the skip link",
      ).toBe("#main");
      await page.keyboard.press("Enter");
      await expect
        .poll(() => new URL(page.url()).hash, "hash after Enter")
        .toBe("#main");
      const focus = await page.locator("main").evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          focused: el === document.activeElement,
          ringless:
            style.outlineStyle === "none" || style.outlineWidth === "0px",
        };
      });
      expect(focus.focused, "main is focused").toBe(true);
      expect(focus.ringless, "main shows no ring").toBe(true);
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.getAttribute("href")),
        "the Tab after the skip link's jump: main's first link",
      ).toBe(order.record[0]);
    });
  }
});

test.describe("B5.9 Nothing moves, nothing needs scripts", () => {
  test("B5.9 (C11.1) with scripts off, the server HTML already holds every row, and a record's items", async ({
    browser,
  }) => {
    for (const url of SWEPT) {
      const bare = await withoutScripts(browser, url);
      expect(bare.status, `status of ${url} with scripts off`).toBe(200);
      const found = await bare.page.evaluate(
        (rows) => ({
          scriptsRan: typeof (self as { __next_f?: unknown }).__next_f,
          numbers: [...document.querySelectorAll(`${rows} th a`)].map((a) =>
            Number(a.getAttribute("href")?.match(/^\/log\/(\d+)$/)?.[1]),
          ),
        }),
        ROWS,
      );
      const record = await readRecord(bare.page);
      await bare.context.close();
      expect(found.scriptsRan, `page scripts ran on ${url}`).toBe("undefined");
      expect(found.numbers, `the rows in the server HTML of ${url}`).toEqual(
        VALID.map((entry) => entry.sprint),
      );
      const entry = url === LOG ? undefined : entryOf(13);
      expect(
        record.items,
        `the record's items in the server HTML of ${url}`,
      ).toEqual(entry ? shown(entry) : []);
    }
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("B5.9 (C11.2) with reduced motion nothing animates on /log and /log/13", async ({
      page,
    }) => {
      for (const url of SWEPT) {
        await open(page, url, 390);
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(done)),
        );
        const animations = await page.evaluate(() =>
          document
            .getAnimations()
            .map(
              (a) =>
                (a.effect as KeyframeEffect | null)?.target?.tagName ?? "?",
            ),
        );
        expect(animations, `document.getAnimations() on ${url}`).toEqual([]);
      }
    });
  });
});

// ---------------------------------------------------------------------------------------------
// B5.10 Text first, the framework's script alone

/** The script files a fresh visit to `url` fetches, by path, and their decoded bytes. */
async function scripts(browser: Browser, url: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const bodies: Promise<{ path: string; bytes: number }>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      const path = new URL(response.url()).pathname;
      bodies.push(
        response
          .body()
          .then((body) => body.length)
          .catch(() => Number.NaN)
          .then((bytes) => ({ path, bytes })),
      );
    }
  });
  await page.goto(url);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const files = await Promise.all(bodies);
  await context.close();
  return {
    paths: files.map((f) => f.path).sort(),
    bytes: files.reduce((sum, f) => sum + f.bytes, 0),
  };
}

test.describe("B5.10 Text first, the framework's script alone", () => {
  test("B5.10 the LCP on /log and /log/13 is text in main, outside the ghost hull, with no url, within 2,500 ms at 4x CPU", async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    for (const url of SWEPT) {
      for (const [width, height] of [
        [390, 844],
        [1440, 900],
      ] as const) {
        const fresh = await page.context().newPage();
        await fresh.setViewportSize({ width, height });
        await fresh.addInitScript((ghost) => {
          const win = window as Window & {
            __lcpWhere?: { main: boolean; ghost: boolean }[];
          };
          win.__lcpWhere = [];
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const el = (
                entry as PerformanceEntry & { element: Element | null }
              ).element;
              win.__lcpWhere?.push({
                main: Boolean(el?.closest("main")),
                ghost: Boolean(el?.closest(ghost)),
              });
            }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }, GHOST_HULL);
        const lcp = await measureLcp(fresh, url);
        // Without the page and its drawing, "text, not in the drawing" holds on the 404 too.
        await expect(
          fresh.locator("main h1"),
          `the h1 on ${url} at ${width} x ${height}`,
        ).toHaveText("Log");
        await expect(
          fresh.locator(GHOST_HULL),
          `the ghost hull on ${url} at ${width} x ${height}`,
        ).toHaveCount(1);
        const placed = await fresh.evaluate(
          () =>
            (
              window as Window & {
                __lcpWhere?: { main: boolean; ghost: boolean }[];
              }
            ).__lcpWhere?.at(-1) ?? null,
        );
        await fresh.close();
        const where = `on ${url} at ${width} x ${height}`;
        expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
        if (!lcp) continue;
        expect
          .soft(
            placed,
            `LCP <${lcp.tag}> "${lcp.text}" in main, not in the ghost, ${where}`,
          )
          .toEqual({ main: true, ghost: false });
        expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
        expect
          .soft(lcp.tag, `LCP is text, not an image or drawing, ${where}`)
          .not.toMatch(/^(?:img|image|video|svg|canvas|path)$/);
        expect
          .soft(lcp.time, `LCP time (ms) ${where}`)
          .toBeLessThanOrEqual(2500);
        testInfo.annotations.push({
          type: "lcp",
          description: `${where}: <${lcp.tag}> "${lcp.text}" at ${lcp.time.toFixed(0)} ms`,
        });
      }
    }
  });

  test("B5.10 (B1.10's /sprints block) /log, /log/13 and the newest record load the 404's script files and bytes; /log loads two woff2 within 86,016 B, the display face preloaded, its text in Sofia Sans and Sofia Sans Extra Condensed only", async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const missing = await scripts(browser, "/no-such-page");
    expect(
      missing.paths.length,
      "script files the 404 requests",
    ).toBeGreaterThan(0);
    for (const url of [...new Set([LOG, recordOf(13), recordOf(NEWEST)])]) {
      const found = await scripts(browser, url);
      testInfo.annotations.push({
        type: "script-bytes",
        description: `${url}: ${found.bytes} B in ${found.paths.length} files; the 404: ${missing.bytes} B in ${missing.paths.length}`,
      });
      expect
        .soft(found.paths, `script files ${url} requests, by path`)
        .toEqual(missing.paths);
      expect
        .soft(found.bytes, `script bytes on ${url}, decoded`)
        .toBe(missing.bytes);
    }

    // Fonts on /log, in a fresh context so every response has a body.
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const fonts: Promise<{ url: string; bytes: number }>[] = [];
    page.on("response", (response) => {
      if (new URL(response.url()).pathname.endsWith(".woff2")) {
        fonts.push(
          response
            .body()
            .then((body) => ({ url: response.url(), bytes: body.length })),
        );
      }
    });
    const response = await page.goto(LOG);
    expect(response?.status(), "status of /log").toBe(200);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((done) => setTimeout(done, 500)));
    const files = await Promise.all(fonts);
    const faces = await page.evaluate(() => {
      const primary = (el: Element) =>
        (getComputedStyle(el).fontFamily.split(",")[0] ?? "")
          .trim()
          .replace(/^["']|["']$/g, "");
      const display: string[] = [];
      for (const sheet of document.styleSheets) {
        let list: CSSRuleList;
        try {
          list = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of list) {
          if (!(rule instanceof CSSFontFaceRule)) continue;
          const family = rule.style
            .getPropertyValue("font-family")
            .replace(/["']/g, "")
            .trim();
          if (family !== "Sofia Sans Extra Condensed") continue;
          for (const m of rule.style
            .getPropertyValue("src")
            .matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            display.push(new URL(m[1] ?? "", sheet.href ?? location.href).href);
          }
        }
      }
      const texts = [...document.body.querySelectorAll("*")].filter(
        (el) =>
          el.getClientRects().length > 0 &&
          [...el.childNodes].some(
            (n) =>
              n.nodeType === Node.TEXT_NODE &&
              (n.textContent ?? "").trim() !== "",
          ),
      );
      return {
        display,
        preloads: [
          ...document.querySelectorAll<HTMLLinkElement>(
            'link[rel="preload"][as="font"]',
          ),
        ].map((l) => l.href),
        families: [...new Set(texts.map(primary))].sort(),
      };
    });
    await context.close();
    expect
      .soft(
        files.map((f) => new URL(f.url).pathname),
        "woff2 files /log loads",
      )
      .toHaveLength(2);
    expect
      .soft(
        files.reduce((sum, f) => sum + f.bytes, 0),
        "the woff2 files together, in bytes",
      )
      .toBeLessThanOrEqual(86_016);
    expect
      .soft(faces.display.length, "the display face's file on /log")
      .toBeGreaterThan(0);
    expect
      .soft(
        faces.preloads.filter((href) => faces.display.includes(href)),
        "the display face is preloaded on /log",
      )
      .not.toEqual([]);
    expect
      .soft(faces.families, "the faces of the text on /log")
      .toEqual(["Sofia Sans", "Sofia Sans Extra Condensed"]);
  });
});

// ---------------------------------------------------------------------------------------------
// B5.11 The reader keeps its rules: C12 runs unedited (no page: the reader is called on folders
// this test writes), and C13.1 at the foot holds the route to the team's files

type ReaderEntry = {
  sprint: number;
  goal: string;
  size?: string;
  pr?: number;
  ownersCall: boolean;
  wentWrong: string[];
};
type Reader = (dir?: string) => ReaderEntry[];

// The reader is loaded when a test runs, from a path held in a variable: before the build, a plain
// import would fail typecheck and, worse, fail loading this whole file, so the route's checks would
// report an error instead of the missing route. This way C12 fails alone, naming the missing module.
const READER_MODULE = "../lib/sprint-log";

async function loadReader(): Promise<Reader> {
  const loaded = (await import(READER_MODULE)) as { readSprintLog?: unknown };
  if (typeof loaded.readSprintLog !== "function") {
    throw new Error("lib/sprint-log.ts must export the function readSprintLog");
  }
  return loaded.readSprintLog as Reader;
}

const made: string[] = [];
test.afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A sprint folder per key; an object is its retro.json, a string is its raw text, null has none. */
function folders(files: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), "sprint-log-"));
  made.push(dir);
  for (const [name, retro] of Object.entries(files)) {
    mkdirSync(join(dir, name));
    if (retro === null) continue;
    writeFileSync(
      join(dir, name, "retro.json"),
      typeof retro === "string" ? retro : JSON.stringify(retro),
    );
  }
  return dir;
}
const retroPath = (dir: string, folder: string) =>
  join(dir, folder, "retro.json");

/** Only the fields the interface fixes. `toEqual` treats an undefined field as a missing one. */
const view = (entry: ReaderEntry | undefined) =>
  entry && {
    sprint: entry.sprint,
    goal: entry.goal,
    size: entry.size,
    pr: entry.pr,
    ownersCall: entry.ownersCall,
    wentWrong: entry.wentWrong,
  };

/** The message of what `fn` throws, or null when it does not throw. */
function thrown(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return null;
}

/** A retro that is right in every part, with `change` laid over it; undefined removes a key. */
function retro(change: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    sprint: 1,
    goal: "A goal",
    size: "M",
    pr: 5,
    outcome: "merged",
    wentWrong: ["x"],
    ...change,
  };
  return Object.fromEntries(
    Object.entries(base).filter(([, value]) => value !== undefined),
  );
}
const right = {
  sprint: 1,
  goal: "A goal",
  size: "M",
  pr: 5,
  ownersCall: false,
  wentWrong: ["x"],
};

test.describe("C12. The reader on bad data", () => {
  test("C12.1 both retro shapes give an entry, camelCase wins when both are there, and folders sort by number", async () => {
    const read = await loadReader();
    const items = [{ what: "a", evidence: "e1" }, { what: "b" }];
    const dir = folders({
      "2": {
        sprint: 2,
        goal: "Roadmap item 2: snake",
        size: "M",
        pr: 12,
        outcome: "merged",
        went_wrong: items,
        fix_rounds: 1,
      },
      "10": {
        sprint: 10,
        goal: "Roadmap item: camel",
        size: "M",
        pr: 35,
        outcome: "merged",
        wentWrong: items,
        fixRounds: 1,
      },
      "9": { sprint: 9, goal: "both", wentWrong: ["new"], went_wrong: ["old"] },
    });
    const entries = read(dir);
    expect(
      entries.map((e) => e.sprint),
      "sprint numbers, folders 2, 10 and 9",
    ).toEqual([10, 9, 2]);
    const [camel, both, snake] = entries.map(view);
    expect(both?.wentWrong, "a retro with both fields").toEqual(["new"]);
    expect(camel?.wentWrong, "camelCase items").toEqual(["a", "b"]);
    expect(snake?.wentWrong, "snake_case items").toEqual(["a", "b"]);
    // The same content in the two shapes reads the same.
    expect({ ...camel, sprint: 0, goal: "", pr: 0 }).toEqual({
      ...snake,
      sprint: 0,
      goal: "",
      pr: 0,
    });
    expect(snake?.goal).toBe("Snake");
    expect(camel?.goal).toBe("Camel");
    expect(snake).toMatchObject({ size: "M", pr: 12, ownersCall: false });
    // An array wins even when empty; a value that is not an array falls through to the other key.
    const arrays = read(
      folders({ "1": retro({ wentWrong: [], went_wrong: ["old"] }) }),
    );
    expect(arrays[0]?.wentWrong, "wentWrong: [] over went_wrong").toEqual([]);
    const fallback = read(
      folders({ "1": retro({ wentWrong: "text", went_wrong: ["old"] }) }),
    );
    expect(
      fallback[0]?.wentWrong,
      "wentWrong a string, went_wrong an array",
    ).toEqual(["old"]);
  });

  test("C12.2 a missing or wrong optional part leaves the entry in with that part undefined", async () => {
    const read = await loadReader();
    const cases: [string, Record<string, unknown>, Partial<typeof right>][] = [
      ["no size", { size: undefined }, { size: undefined }],
      ['size "XL"', { size: "XL" }, { size: undefined }],
      ["size a number", { size: 3 }, { size: undefined }],
      ["no pr", { pr: undefined }, { pr: undefined }],
      ['pr "36"', { pr: "36" }, { pr: undefined }],
      ["pr -1", { pr: -1 }, { pr: undefined }],
      ["pr 0", { pr: 0 }, { pr: undefined }],
      ["pr 2.5", { pr: 2.5 }, { pr: undefined }],
      ["no outcome", { outcome: undefined }, { ownersCall: false }],
      ["outcome a number", { outcome: 7 }, { ownersCall: false }],
      ["no went wrong at all", { wentWrong: undefined }, { wentWrong: [] }],
      ["wentWrong a string", { wentWrong: "it broke" }, { wentWrong: [] }],
      [
        "wentWrong an object",
        { wentWrong: { what: "it broke" } },
        { wentWrong: [] },
      ],
      [
        "items that are a number, null, an object with no what, a blank what, a what that is a number and blank text",
        {
          wentWrong: [5, null, {}, { what: "  " }, { what: 3 }, "   ", "keep"],
        },
        { wentWrong: ["keep"] },
      ],
      [
        "four items: three kept",
        { wentWrong: ["a", "b", "c", "d"] },
        { wentWrong: ["a", "b", "c"] },
      ],
      [
        "a skipped item does not use up one of the three",
        { wentWrong: ["a", 5, { what: "b" }, null, "c", "d"] },
        { wentWrong: ["a", "b", "c"] },
      ],
    ];
    for (const [name, change, expected] of cases) {
      const entries = read(folders({ "1": retro(change) }));
      expect(entries, `${name}: the entry is still there`).toHaveLength(1);
      expect(view(entries[0]), name).toEqual({ ...right, ...expected });
    }
    // The snake_case shape gives the same result for the same items.
    for (const [name, change, expected] of cases.filter(
      ([, change]) => "wentWrong" in change,
    )) {
      const { wentWrong, ...rest } = change;
      const entries = read(
        folders({
          "1": retro({ ...rest, wentWrong: undefined, went_wrong: wentWrong }),
        }),
      );
      expect(view(entries[0]), `snake_case: ${name}`).toEqual({
        ...right,
        ...expected,
      });
    }
  });

  test("C12.3 a required part that is wrong throws, naming the file; no retro.json is skipped", async () => {
    const read = await loadReader();
    const bad: [string, Record<string, unknown>, string][] = [
      ["invalid JSON", { "3": "{ not json" }, "3"],
      ["no sprint", { "3": retro({ sprint: undefined }) }, "3"],
      ['sprint: "7"', { "7": retro({ sprint: "7" }) }, "7"],
      ["sprint: 0", { "3": retro({ sprint: 0 }) }, "3"],
      ["sprint: 1.5", { "3": retro({ sprint: 1.5 }) }, "3"],
      ["no goal", { "3": retro({ sprint: 3, goal: undefined }) }, "3"],
      ["a blank goal", { "3": retro({ sprint: 3, goal: "  \n" }) }, "3"],
      ["a goal that is a number", { "3": retro({ sprint: 3, goal: 4 }) }, "3"],
      ["folder 5 holding sprint 6", { "5": retro({ sprint: 6 }) }, "5"],
      // Two folders cannot share a number, so this one breaks both the repeat and the folder rule;
      // either way it must throw, naming one of the two files.
      [
        "two folders with the same sprint",
        { "4": retro({ sprint: 4 }), "5": retro({ sprint: 4 }) },
        "5",
      ],
    ];
    for (const [name, files, culprit] of bad) {
      const dir = folders(files);
      const message = thrown(() => read(dir));
      expect(message, `${name}: the reader throws`).not.toBeNull();
      const paths = Object.keys(files).map((folder) => retroPath(dir, folder));
      if (name.startsWith("two folders")) {
        expect(
          paths.some((path) => message?.includes(path)),
          `${name}: the message names a file (${message})`,
        ).toBe(true);
      } else {
        expect(message, `${name}: the message names the file`).toContain(
          retroPath(dir, culprit),
        );
      }
    }

    const none = read(folders({}));
    expect(none, "an empty folder").toEqual([]);
    const skipped = folders({ "3": null, "4": retro({ sprint: 4 }) });
    expect(
      read(skipped).map((e) => e.sprint),
      "a folder with no retro.json is skipped",
    ).toEqual([4]);
    expect(
      read(folders({ "1": null })),
      "only a folder with no retro.json",
    ).toEqual([]);
  });

  test("C12.4 Owner's call comes from needs-owner in outcome, with a word boundary", async () => {
    const read = await loadReader();
    const outcomes: [string | number | undefined, boolean][] = [
      ["needs-owner", true],
      ["Not merged: left open with needs-owner", true],
      ["OPEN, NEEDS-OWNER", true],
      ["merged", false],
      ["shipped once the gate lands", false],
      [undefined, false],
      [7, false],
      ["needs-owners", false],
    ];
    const files = Object.fromEntries(
      outcomes.map(([outcome], i) => [
        String(i + 1),
        retro({ sprint: i + 1, outcome }),
      ]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(entries, "all eight entries").toHaveLength(outcomes.length);
    for (const [i, [outcome, wanted]] of outcomes.entries()) {
      expect(entries[i]?.ownersCall, `outcome ${JSON.stringify(outcome)}`).toBe(
        wanted,
      );
    }
  });

  test("C12.5 the goal loses its Roadmap item prefix and gains a capital; backticks go; a blank goal throws", async () => {
    const read = await loadReader();
    const goals: [string, string][] = [
      ["Roadmap item 4: section reveal", "Section reveal"],
      ["roadmap item: a subtle 3D", "A subtle 3D"],
      ["ROADMAP ITEM 12: shout", "Shout"],
      ["plain goal", "Plain goal"],
      [
        "Use `pnpm verify` before the Roadmap item: ends",
        "Use pnpm verify before the Roadmap item: ends",
      ],
    ];
    const files = Object.fromEntries(
      goals.map(([goal], i) => [
        String(i + 1),
        retro({
          sprint: i + 1,
          goal,
          wentWrong: ["Run `pnpm test` twice", { what: "`x` broke" }],
        }),
      ]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(
      entries.map((e) => e.goal),
      "goals as presented",
    ).toEqual(goals.map(([, wanted]) => wanted));
    for (const entry of entries) {
      expect(
        entry.wentWrong,
        `backticks in the items of sprint ${entry.sprint}`,
      ).toEqual(["Run pnpm test twice", "x broke"]);
    }

    const dir = folders({ "3": retro({ sprint: 3, goal: "Roadmap item:" }) });
    const message = thrown(() => read(dir));
    expect(
      message,
      "a goal that is only the prefix is blank, so the reader throws",
    ).not.toBeNull();
    expect(message, "and names the file").toContain(retroPath(dir, "3"));
  });

  test("C12.7 a trailing size tag leaves the goal; any other parenthetical stays; a goal of only a tag throws", async () => {
    const read = await loadReader();
    const goals: [string, string][] = [
      ["Goal (M)", "Goal"],
      ["Goal (S)", "Goal"],
      ["Goal (L)", "Goal"],
      ["goal (l)", "Goal"],
      ["Goal ( m )", "Goal"],
      ["Goal   (S)  ", "Goal"],
      ["Goal\t(M)", "Goal"],
      ["Roadmap item 3: the thing (M)", "The thing"],
      ["Goal (M, x)", "Goal (M, x)"],
      ["Goal (L, contract step)", "Goal (L, contract step)"],
      ["Goal (MS)", "Goal (MS)"],
      ["Goal (XL)", "Goal (XL)"],
      ["Goal (M) and more", "Goal (M) and more"],
      ["Goal (a thing (M))", "Goal (a thing (M))"],
      ["Goal (5 colors) (L)", "Goal (5 colors)"],
    ];
    const files = Object.fromEntries(
      goals.map(([goal], i) => [String(i + 1), retro({ sprint: i + 1, goal })]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(
      entries.map((e) => e.goal),
      "goals as presented",
    ).toEqual(goals.map(([, wanted]) => wanted));

    for (const only of ["(L)", " (m) ", "Roadmap item 2: (S)"]) {
      const dir = folders({ "3": retro({ sprint: 3, goal: only }) });
      const message = thrown(() => read(dir));
      expect(
        message,
        `a goal of only ${JSON.stringify(only)} is blank, so the reader throws`,
      ).not.toBeNull();
      expect(message, "and names the file").toContain(retroPath(dir, "3"));
    }
  });

  test("C12.6 the default folder is .crew/sprint, and reads the same as the oracle", async () => {
    const read = await loadReader();
    const entries = read();
    expect(
      entries.map((e) => e.sprint),
      "sprint numbers",
    ).toEqual(VALID.map((e) => e.sprint));
    for (const [i, expected] of VALID.entries()) {
      expect(view(entries[i]), `sprint ${expected.sprint}`).toEqual({
        sprint: expected.sprint,
        goal: expected.goal,
        size: expected.size,
        pr: expected.pr,
        ownersCall: expected.ownersCall,
        wentWrong: expect.anything(),
      });
      expect(
        entries[i]?.wentWrong.map(squash),
        `items of sprint ${expected.sprint}`,
      ).toEqual(shown(expected));
    }
  });
});

// ---------------------------------------------------------------------------------------------
// C13.1, rewritten for the Log (B5.11): the route reads only the team's files

test("B5.11 (C13.1) the reader and app/log/ name no content/ path and use only profile.name of the owner's facts", () => {
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
      // The one import the contract allows, for the title's name.
      .replace(/["']@\/content\/profile["']/g, "");
  const route = existsSync("app/log")
    ? readdirSync("app/log", { recursive: true, encoding: "utf8" })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => join("app/log", file))
    : [];
  const files = ["lib/sprint-log.ts", ...route];
  expect(
    files.filter((file) => existsSync(file)),
    "the reader and the route exist",
  ).toEqual(expect.arrayContaining(["lib/sprint-log.ts"]));
  expect(route, "files under app/log/").not.toEqual([]);
  const hits = files
    .filter((file) => existsSync(file))
    .flatMap((file) => {
      const source = code(file);
      return [
        ...(/\bcontent\//.test(source)
          ? [`${file}: names a content/ path`]
          : []),
        ...(/\bprofile\.(?!name\b)\w+/.test(source)
          ? [`${file}: uses a profile field other than name`]
          : []),
      ];
    });
  expect(hits).toEqual([]);
});
