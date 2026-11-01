import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type Response, test } from "@playwright/test";
import { profile } from "../content/profile";
import { DARK, LIGHT } from "../lib/site";
import { firstScreen, textSizes } from "./first-screen";
import {
  hexToRgb,
  horizontalOverflow,
  installRgba,
  MODES,
  MOTION,
  motionReady,
  resolveColors,
  rootTokens,
  SCHEMES,
} from "./helpers";
import { bioParts, MERGED, ROWS } from "./retros";

// Sprint 22, B1: the sheet in 2D (.crew/sprint/22/contract.md). The page's checks B1.1 to B1.3,
// B1.5 to B1.7, B1.10 and B1.11, one test per number, written before the build. The drawing's own
// checks (B1.4, B1.8, B1.9) are in plan.spec.ts. Facts are imported from content/profile.ts and
// the retro files are read by e2e/retros.ts, the contract's data rules in this suite's own lines.
//
// Hooks the contract names and these checks rely on: `main > header` (the title block), the bar as
// a `<header>` with a `<nav>` before `main`, `section[aria-labelledby="revisions"]` with its h2
// `#revisions` and a `<table>`, the facts' h2 ids `work` to `contact`. The legend is found by its
// words ("seated", "original"), outside any svg.
//
// Sprint 23 (.crew/sprint/23/contract.md): B1.3's two tests are rewritten as B2.3 (the bar gains
// Read as page, and stays above every fact and Detail A), B1.6 runs on /read and the 404 too, and
// B2.9's two riders (forced-colours plank fills, the folded table's labels) are here.
//
// Sprint 27 (.crew/sprint/27/contract.md, with amendment 1): both B2.3 tests are rewritten with the
// same assertions for the motion control. Its two `[data-motion]` slots are in the HTML; the shown
// one is in the bar's nav after the four links from 768 px, its group right of Read as page at
// 1440, and in main between `[data-model]` and the title block below 768. Its buttons are 44 px
// targets below 1024, and the second test hit-tests their centres too.
//
// Sprint 30 (.crew/sprint/29/b5-first-contract.md, B5a): /log replaces /sprints, so B2.3's Log lands
// on /log's h1 "Log", B1.5 counts /log's rows, B1.6 runs on /log and a record, and B1.10's
// "/sprints: Sofia Sans only" retires with the old column (batch F; B5.10 checks /log's two faces).
//
// Sprint 31 (.crew/sprint/31/contract.md, B4a): both B2.3 tests are rewritten with the same
// assertions over five links, Crew after Work. The nav keeps all five in the DOM at every width;
// below 768 Read as page isn't shown in the bar but in main at the drawing's foot, before the
// control's slot and in its row, a 44 px target (the moved assertion, for the owner).

const REVISIONS = 'section[aria-labelledby="revisions"]';
// The Log's revision rows, not its day groups' header rows (sprint 32, B5.17).
const LOG_ROWS =
  'section[aria-labelledby="every-revision"] table tbody tr:has(> th[scope="row"])';
const HEADS = ["Rev", "Description", "Drawn", "Checked", "Tested", "Approved"];
const [BIO_1 = "", BIO_2 = "", ...BIO_REST] = bioParts(profile.bio);
const TITLE_BIO = `${BIO_1} ${BIO_2}`;
const CAPTION = BIO_REST.join(" ");
const N = MERGED.length;

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

type Rgba = number[] | null;
type Box = { left: number; top: number; right: number; bottom: number };

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

async function open(
  page: Page,
  width: number,
  height = 900,
  url = "/",
  status = 200,
) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(status);
  await page.evaluate(() => document.fonts.ready);
}

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

/** A token as [r, g, b, a], through the page's own canvas. */
async function tokenRgba(page: Page, name: string): Promise<Rgba> {
  return page.evaluate((token) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const rgba = (window as Window & { __rgba?: (c: string) => Rgba }).__rgba;
    return probe.style.color && rgba ? rgba(color) : null;
  }, name);
}

const sameColor = (a: Rgba, b: Rgba) =>
  Boolean(
    a &&
      b &&
      a.every(
        (value, i) => Math.abs(value - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
      ),
  );

// ---------------------------------------------------------------------------------------------

test("B1.1 the first screen says who and what: the name, role, bio, contact and revisions are in the first viewport, and the name is the largest text", async ({
  page,
}) => {
  for (const [width, height, withRows] of [
    [1440, 900, true],
    [390, 844, false],
  ] as const) {
    await open(page, width, height);
    const where = `${width} x ${height}`;
    const found = await firstScreen(page);
    const inside = (b: Box | null) =>
      b !== null &&
      b.left >= -0.5 &&
      b.top >= -0.5 &&
      b.right <= found.viewport.width + 0.5 &&
      b.bottom <= found.viewport.height + 0.5;
    const checked = withRows ? [...found.items, ...found.rows] : found.items;
    if (withRows) {
      expect.soft(found.rows, `revision rows at ${where}`).toHaveLength(5);
    }
    expect
      .soft(
        checked
          .filter(({ box }) => !inside(box))
          .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
        `not wholly inside the first viewport at ${where}`,
      )
      .toEqual([]);

    const sizes = await textSizes(page);
    expect(sizes.h1, `the h1's font size at ${where}`).toBeGreaterThan(0);
    expect
      .soft(
        sizes.others.filter(({ size }) => size >= sizes.h1),
        `text as large as the h1 (${sizes.h1} px) at ${where}`,
      )
      .toEqual([]);
  }
});

test("B1.2 the title block is the owner's words, verbatim, and the bio's last part is the revisions' caption", async ({
  page,
}) => {
  expect(
    BIO_REST.length,
    "the bio has a part after its first two",
  ).toBeGreaterThan(0);
  await open(page, 1440);
  const found = await page.evaluate((revisions) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const header = document.querySelector("main > header");
    const h1 = header?.querySelector("h1") ?? null;
    const legend =
      [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            !el.closest("svg") &&
            !["MAIN", "BODY"].includes(el.tagName) &&
            /\bseated\b/i.test(el.textContent ?? "") &&
            /\boriginal\b/i.test(el.textContent ?? ""),
        )
        .at(-1) ?? null;
    const section = document.querySelector(revisions);
    const follows = (el: Element | null) =>
      Boolean(
        h1 &&
          el &&
          h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    return {
      header: header !== null,
      h1: squashed(h1),
      text: squashed(header),
      links: [...(header?.querySelectorAll("a") ?? [])].map((a) => ({
        label: squashed(a),
        href: a.getAttribute("href"),
      })),
      caption: squashed(section),
      legend: legend !== null,
      beforeLegend: follows(legend),
      beforeRevisions: follows(section),
    };
  }, REVISIONS);
  expect(found.header, "main > header").toBe(true);
  expect.soft(found.h1, "the h1").toBe(profile.name);
  for (const [what, text] of [
    ["headline", profile.headline],
    ["location", profile.location],
    ["the bio's first two parts", TITLE_BIO],
  ] as const) {
    expect
      .soft(found.text, `the title block holds the ${what}`)
      .toContain(text);
  }
  expect
    .soft(
      found.text,
      "the title block leaves the bio's last part to the caption",
    )
    .not.toContain(CAPTION);
  expect
    .soft(found.links, "the title block's links, as label and href")
    .toEqual(expect.arrayContaining(profile.links));
  expect.soft(found.caption, "the revision block's caption").toContain(CAPTION);
  expect.soft(found.legend, "the drawing's legend is on the page").toBe(true);
  expect.soft(found.beforeLegend, "the h1 comes before the legend").toBe(true);
  expect
    .soft(found.beforeRevisions, "the h1 comes before the revision block")
    .toBe(true);
});

test("B2.3 the labelled bar (B1.3, sprints 27 and 31): the wordmark, then Work, Crew, Log, Contact and Read as page, then at 1440 the buttons Full, Calm and Off right of Read as page, at 320 and 390 Work, Crew, Log and Contact alone with Read as page and the group in main between the drawing and the title block, Read as page before the group's slot, in its row and a 44 px target; each a target inside the viewport at 320, 390 and 1440 (24 px; 44 px for the buttons below 1024), Read as page the right-most link at 1440, each link landing on its target", async ({
  page,
}) => {
  const readBar = () =>
    page.evaluate((slot) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const main = document.querySelector("main");
      const header = [...document.querySelectorAll("header")].find(
        (h) =>
          !h.closest("main") &&
          main !== null &&
          Boolean(
            h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          h.querySelector("nav") !== null,
      );
      const nav = header?.querySelector("nav") ?? null;
      const labelledBy = (nav?.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .map((id) => squashed(document.getElementById(id)))
        .join(" ");
      // What the visitor sees: a slot hidden at this width (display: none) holds no control.
      const controls = [
        ...(header?.querySelectorAll(
          'a, button, input, select, [role="button"], [role="link"]',
        ) ?? []),
      ].filter(
        (el) =>
          el.getAttribute("href") !== "#main" && el.getClientRects().length > 0,
      );
      // The shown slot, the one with a box: in the bar from 768 px, in main below (amendment 1).
      const shown = [...document.querySelectorAll(slot)].find(
        (el) => el.getClientRects().length > 0,
      );
      const model = document.querySelector("main [data-model]");
      const title = document.querySelector("main > header");
      const follows = (a: Element | null | undefined, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const wordmark = [...(header?.querySelectorAll("*") ?? [])].find(
        (el) => squashed(el) === "Theseus",
      );
      const first = nav?.querySelector("a") ?? null;
      const cw = document.documentElement.clientWidth;
      const ch = document.documentElement.clientHeight;
      const group = shown?.getBoundingClientRect();
      return {
        header: header !== undefined,
        name: (nav?.getAttribute("aria-label") ?? labelledBy).trim(),
        controls: controls.map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: squashed(el),
          href: el.getAttribute("href"),
          inNav: nav?.contains(el) ?? false,
        })),
        wordmark: wordmark !== undefined,
        wordmarkLinked: Boolean(wordmark?.closest("a")),
        wordmarkFirst: Boolean(
          wordmark &&
            first &&
            wordmark.compareDocumentPosition(first) &
              Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        place: {
          slots: document.querySelectorAll(slot).length,
          shown: [...document.querySelectorAll(slot)].filter(
            (el) => el.getClientRects().length > 0,
          ).length,
          inNav: Boolean(shown && nav?.contains(shown)),
          inMain: Boolean(shown?.closest("main")),
          afterModel: follows(model, shown ?? null),
          beforeTitle: follows(shown, title),
        },
        // The shown links only, as `controls` reads them: the bar's hidden Read as page has no box.
        targets: [
          ...[...(nav?.querySelectorAll("a") ?? [])].filter(
            (a) => a.getClientRects().length > 0,
          ),
          ...(shown?.querySelectorAll("button") ?? []),
        ].map((a) => {
          const r = a.getBoundingClientRect();
          return {
            text: squashed(a),
            button: a.tagName === "BUTTON",
            width: r.width,
            height: r.height,
            inside:
              r.left >= -0.5 &&
              r.top >= -0.5 &&
              r.right <= cw + 0.5 &&
              r.bottom <= ch + 0.5,
          };
        }),
        group: group
          ? { left: group.left, right: group.right, width: group.width }
          : null,
        sticking: [...(header?.querySelectorAll("*") ?? [])]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5);
          })
          .map(
            (el) =>
              `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 20)}"`,
          ),
        headerOverflow: header ? header.scrollWidth - header.clientWidth : -1,
        rights: [...(header?.querySelectorAll("*") ?? [])]
          .filter(
            (el) =>
              el.getClientRects().length > 0 &&
              el.getAttribute("href") !== "#main" &&
              // The motion group sits right of Read as page by design; it is checked on its own.
              !el.closest(slot) &&
              [...el.childNodes].some(
                (n) =>
                  n.nodeType === Node.TEXT_NODE &&
                  (n.textContent ?? "").trim() !== "",
              ),
          )
          .map((el) => ({
            text: squashed(el),
            right: el.getBoundingClientRect().right,
          })),
        targetsExist: ["work", "contact"].map((id) => ({
          id,
          exists: document.getElementById(id) !== null,
        })),
        // Read as page at the drawing's foot, below 768: in main, before the shown slot, in its row.
        foot: [...document.querySelectorAll('main a[href="/read"]')]
          .filter((a) => a.getClientRects().length > 0)
          .map((a) => {
            const r = a.getBoundingClientRect();
            return {
              text: squashed(a),
              beforeSlot: follows(a, shown ?? null),
              inRow: Boolean(
                group && r.top < group.bottom && r.bottom > group.top,
              ),
              leftOfGroup: Boolean(group && r.right <= group.left + 0.5),
              underlined:
                getComputedStyle(a).textDecorationLine.includes("underline"),
              width: r.width,
              height: r.height,
              inside:
                r.left >= -0.5 &&
                r.top >= -0.5 &&
                r.right <= cw + 0.5 &&
                r.bottom <= ch + 0.5,
            };
          }),
      };
    }, MOTION);

  const LINKS = [
    { tag: "a", text: "Work", href: "#work", inNav: true },
    { tag: "a", text: "Crew", href: "/crew", inNav: true },
    { tag: "a", text: "Log", href: "/log", inNav: true },
    { tag: "a", text: "Contact", href: "#contact", inNav: true },
    { tag: "a", text: "Read as page", href: "/read", inNav: true },
  ];
  const BUTTONS = MODES.map((text) => ({
    tag: "button",
    text,
    href: null,
    inNav: true,
  }));
  await open(page, 390);
  await motionReady(page);
  const bar = await readBar();
  expect(bar.header, "a <header> with a <nav>, before main").toBe(true);
  expect.soft(bar.name, "the nav's accessible name").not.toBe("");
  expect.soft(bar.wordmark, 'the wordmark "Theseus"').toBe(true);
  expect.soft(bar.wordmarkLinked, "the wordmark is a link").toBe(false);
  expect
    .soft(bar.wordmarkFirst, "the wordmark comes before the links")
    .toBe(true);
  expect.soft(bar.targetsExist, "the fragment targets").toEqual([
    { id: "work", exists: true },
    { id: "contact", exists: true },
  ]);
  for (const width of [320, 390, 1440]) {
    await open(page, width);
    await motionReady(page);
    const at = await readBar();
    // From 768 px the group is the bar's; below it, main's, between the drawing and the title block.
    const inBar = width >= 768;
    expect
      .soft(at.controls, `the bar's links and buttons, in order, at ${width}`)
      .toEqual(inBar ? [...LINKS, ...BUTTONS] : LINKS.slice(0, 4));
    // Below 768 Read as page is main's, at the drawing's foot (the moved assertion, sprint 31).
    expect.soft(at.foot, `Read as page shown in main at ${width}`).toEqual(
      inBar
        ? []
        : [
            expect.objectContaining({
              text: "Read as page",
              beforeSlot: true,
              inRow: true,
              leftOfGroup: true,
              underlined: true,
              inside: true,
            }),
          ],
    );
    expect
      .soft(
        at.foot.filter(
          ({ width, height }) => width < 44 - 0.05 || height < 44 - 0.05,
        ),
        `Read as page in main smaller than 44 x 44 px at ${width}`,
      )
      .toEqual([]);
    expect
      .soft(at.place, `the motion slots and the shown one's place at ${width}`)
      .toEqual({
        slots: 2,
        shown: 1,
        inNav: inBar,
        inMain: !inBar,
        // The bar comes before main, so either slot precedes the title block.
        afterModel: !inBar,
        beforeTitle: true,
      });
    expect
      .soft(
        at.targets.filter(
          ({ width, height }) => width < 24 - 0.05 || height < 24 - 0.05,
        ),
        `bar links and buttons smaller than 24 x 24 px at ${width}`,
      )
      .toEqual([]);
    // Below 1024 px the buttons are a phone's: 44 x 44 px (the contract's targets).
    const floor = width < 1024 ? 44 : 24;
    expect
      .soft(
        at.targets
          .filter(({ button }) => button)
          .map(({ text, width, height }) => ({ text, width, height })),
        `the motion buttons at ${width}`,
      )
      .toHaveLength(MODES.length);
    expect
      .soft(
        at.targets.filter(
          ({ button, width, height }) =>
            button && (width < floor - 0.05 || height < floor - 0.05),
        ),
        `motion buttons smaller than ${floor} x ${floor} px at ${width}`,
      )
      .toEqual([]);
    expect
      .soft(
        at.targets.filter(({ inside }) => !inside).map(({ text }) => text),
        `bar links and motion buttons not wholly inside the viewport at ${width}`,
      )
      .toEqual([]);
    expect
      .soft(await horizontalOverflow(page), `page overflow at ${width}`)
      .toBe(0);
    expect
      .soft(at.headerOverflow, `the bar's own overflow at ${width}`)
      .toBeLessThanOrEqual(0);
    expect
      .soft(at.sticking, `bar elements past the viewport at ${width}`)
      .toEqual([]);
    if (width === 1440) {
      const read = at.rights.find((r) => r.text === "Read as page");
      expect.soft(read, "Read as page in the bar at 1440").toBeDefined();
      expect
        .soft(
          at.rights
            .filter((r) => r !== read && r.right > (read?.right ?? 0) + 0.5)
            .map((r) => `"${r.text}" ends at ${r.right}`),
          `bar items right of Read as page (ending at ${read?.right}) at 1440`,
        )
        .toEqual([]);
      expect.soft(at.group, "the motion group's box at 1440").not.toBeNull();
      expect
        .soft(
          (at.group?.left ?? Number.NEGATIVE_INFINITY) -
            (read?.right ?? Number.POSITIVE_INFINITY),
          `the motion group's left edge (${at.group?.left}) past Read as page's right (${read?.right}) at 1440`,
        )
        .toBeGreaterThanOrEqual(-0.5);
    }
  }

  // Following each link lands on its target, not under the bar.
  for (const width of [390, 1440]) {
    for (const [text, id] of [
      ["Work", "work"],
      ["Contact", "contact"],
    ] as const) {
      await open(page, width);
      await page.locator("header nav a", { hasText: text }).first().click();
      await expect
        .poll(() => new URL(page.url()).hash, `hash after ${text} at ${width}`)
        .toBe(`#${id}`);
      await expect
        .poll(
          () => clearOfTheBar(page, id),
          `#${id} in view and clear of the bar after ${text} at ${width}`,
        )
        .toBe("in view");
    }
    await open(page, width);
    await page.locator("header nav a", { hasText: "Crew" }).first().click();
    await page.waitForURL((url) => url.pathname === "/crew");
    await expect(page.locator("h1"), `after Crew at ${width}`).toHaveText(
      "Crew",
    );
    await open(page, width);
    await page.locator("header nav a", { hasText: "Log" }).first().click();
    await page.waitForURL((url) => url.pathname === "/log");
    await expect(page.locator("h1"), `after Log at ${width}`).toHaveText("Log");
    await open(page, width);
    // From the bar at 1440, from the drawing's foot at 390: the one shown.
    const read = page.locator(
      width >= 768
        ? 'header nav a:visible:has-text("Read as page")'
        : 'main a[href="/read"]:visible',
    );
    await expect(
      read,
      `Read as page ${width >= 768 ? "in the bar" : "in main"} at ${width}`,
    ).toHaveCount(1);
    await read.click();
    await page.waitForURL("**/read");
    await expect(
      page.locator("h1"),
      `after Read as page at ${width}`,
    ).toHaveText(profile.name);
  }
});

test("B2.3 the bar stays above the facts (B1.3, sprints 27 and 31): at 1024, with each fact section or Detail A under the bar and hovered, the element at every bar link's and motion button's centre is in the bar, and each link lands", async ({
  page,
  baseURL,
}) => {
  // Lens on aa9fcd9 (.crew/sprint/22/fix-round-2.md): a hovered card lifted itself to the bar's own
  // z-index and, later in the DOM, painted over the bar and took its clicks. Sprint 23 generalises
  // it to every fact section and Detail A. Off-site requests are refused, so a click a fact
  // steals fails here instead of leaving the site.
  test.setTimeout(240_000);
  const origin = new URL(baseURL ?? "http://localhost").origin;
  await page.route(
    (url) => url.origin !== origin,
    (route) => route.abort(),
  );
  const TARGETS = [
    ...["work", "projects", "stack", "education", "contact"].map((id) => ({
      what: `the ${id} section`,
      selector: `section[aria-labelledby="${id}"]`,
    })),
    {
      what: "Detail A",
      selector: 'section[aria-labelledby="work"] li figure',
    },
  ];
  const LANDINGS: Record<string, string> = {
    Work: "#work",
    Crew: "/crew",
    Log: "/log",
    Contact: "#contact",
    "Read as page": "/read",
  };

  /** Opens /, slides the target up under the whole bar as far as the page scrolls, and hovers it. */
  const hoverUnderTheBar = async (selector: string) => {
    await open(page, 1024, 768);
    await motionReady(page);
    const at = await page.evaluate((target) => {
      const el = document.querySelector(target);
      const bar = document.querySelector("header:has(nav)");
      if (!el || !bar) return null;
      // Room below the page's end, so the last sections can scroll up under the bar too, as they
      // would on a longer page. It changes no stacking: it is an empty block after everything.
      const spacer = document.createElement("div");
      spacer.style.height = "100vh";
      document.body.append(spacer);
      // Twice: the bar has a top margin from lg, so it sticks only once the page has scrolled.
      for (let pass = 0; pass < 2; pass++) {
        window.scrollBy({
          top:
            el.getBoundingClientRect().top -
            (bar.getBoundingClientRect().top - 8),
          behavior: "instant",
        });
      }
      const b = bar.getBoundingClientRect();
      const t = el.getBoundingClientRect();
      return {
        barBottom: b.bottom,
        box: { top: t.top, bottom: t.bottom, left: t.left, right: t.right },
        // The motion buttons' centres are hit-tested too (sprint 27); only links have landings.
        links: [...bar.querySelectorAll("nav a, nav button")]
          .filter((a) => a.getClientRects().length > 0)
          .map((a) => {
            const r = a.getBoundingClientRect();
            return {
              text: (a.textContent ?? "").trim(),
              link: a.tagName === "A",
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
            };
          }),
      };
    }, selector);
    if (!at) return null;
    const under = at.links.filter(
      ({ x, y }) =>
        x >= at.box.left &&
        x <= at.box.right &&
        y >= at.box.top &&
        y <= at.box.bottom,
    );
    if (under.length > 0) {
      const x = under[0]?.x ?? 0;
      await page.mouse.move(
        x,
        (at.barBottom + Math.min(at.box.bottom, 768)) / 2,
      );
    }
    const hovered = await page
      .locator(selector)
      .first()
      .evaluate((el) => el.matches(":hover"));
    return { ...at, under, hovered };
  };

  for (const target of TARGETS) {
    const at = await hoverUnderTheBar(target.selector);
    expect(at, `${target.what} and the bar`).not.toBeNull();
    if (!at) continue;
    expect
      .soft(
        at.links.filter(({ link }) => !link).map(({ text }) => text),
        `the motion buttons hit-tested with ${target.what} under the bar`,
      )
      .toEqual([...MODES]);
    const reachable = at.box.top <= Math.max(...at.links.map((l) => l.y));
    if (!reachable) {
      // The page ends before this target can reach the bar, so it can never cover a link.
      test.info().annotations.push({
        type: "unreachable",
        description: `${target.what}: its top stops at ${at.box.top}, below the bar's links`,
      });
      continue;
    }
    // Otherwise the check has nothing under the links and passes whatever the z-index. A section
    // spans the page's width; Detail A sits in the entries' column, which may miss every link.
    if (target.what === "Detail A" && at.under.length === 0) {
      test.info().annotations.push({
        type: "unreachable",
        description: "Detail A: no bar link's centre is over it at 1024",
      });
    } else {
      expect
        .soft(
          at.under.map((l) => l.text),
          `bar links whose centre ${target.what} sits under`,
        )
        .not.toEqual([]);
    }
    expect.soft(at.hovered, `${target.what} is hovered`).toBe(true);
    for (const link of at.links) {
      expect
        .soft(
          await page.evaluate(({ x, y }) => {
            const hit = document.elementFromPoint(x, y);
            const a = hit?.closest("a");
            return hit?.closest("header nav")
              ? "the bar's nav"
              : `<${hit?.tagName.toLowerCase()}> in ${a ? `a link to ${a.getAttribute("href")}` : "no link"}`;
          }, link),
          `the element at ${link.text}'s centre with ${target.what} hovered under the bar`,
        )
        .toBe("the bar's nav");
    }

    // Each link over the target lands: the pointer travels from the target up into the bar.
    for (const { text } of at.under.filter(({ link }) => link)) {
      const again = await hoverUnderTheBar(target.selector);
      const link = again?.links.find((l) => l.text === text);
      if (!link) continue;
      await page.mouse.move(link.x, link.y, { steps: 4 });
      await page.mouse.down();
      await page.mouse.up();
      const landing = LANDINGS[text] ?? "";
      if (landing.startsWith("#")) {
        const id = landing.slice(1);
        await expect
          .poll(
            () => new URL(page.url()).hash,
            `the hash after ${text} over ${target.what}`,
          )
          .toBe(landing);
        await expect
          .poll(
            () => clearOfTheBar(page, id),
            `#${id} in view after ${text} over ${target.what}`,
          )
          .toBe("in view");
      } else {
        await expect
          .poll(() => page.url(), `the URL after ${text} over ${target.what}`)
          .toBe(`${origin}${landing}`);
      }
    }
  }
});

test("B1.5 the revision block: Revisions, the caption, the six columns, five rows from the retros and one link to the Log, at every width; from 1024 px each description is one line with an ellipsis, the whole goal in its text", async ({
  page,
}) => {
  const rows = async () => {
    await open(page, 1440, 900, "/log");
    return page.locator(LOG_ROWS).count();
  };
  expect(await rows(), "rows /log renders, against valid retros").toBe(N);

  const read = (cutsDescription: boolean) =>
    page.evaluate(
      ({ selector, cutsDescription }) => {
        const squashed = (el: Element | null) =>
          (el?.textContent ?? "").replace(/\s+/g, " ").trim();
        const section = document.querySelector(selector);
        const cw = document.documentElement.clientWidth;
        return {
          section: section !== null,
          h2: [...(section?.querySelectorAll("h2") ?? [])].map((h) => ({
            id: h.id,
            text: squashed(h),
          })),
          text: squashed(section),
          heads: [
            ...(section?.querySelectorAll('table th[scope="col"]') ?? []),
          ].map((th) => squashed(th)),
          rows: [...(section?.querySelectorAll("table tbody tr") ?? [])].map(
            (tr) => ({
              cells: [...tr.querySelectorAll(":scope > th, :scope > td")].map(
                (c) => squashed(c),
              ),
              seen: tr.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }),
              // From 1024 px the Description cell is cut to one line on purpose (batch E); it is
              // read as `description` below, and every other element still mustn't clip.
              clipped: [...tr.querySelectorAll("*")]
                .filter((el) => !(cutsDescription && el === tr.children[1]))
                .filter((el) => {
                  const s = getComputedStyle(el);
                  return (
                    (s.overflowX !== "visible" &&
                      el.scrollWidth > el.clientWidth + 1) ||
                    (s.webkitLineClamp !== "none" &&
                      el.scrollHeight > el.clientHeight + 1)
                  );
                })
                .map(
                  (el) =>
                    `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 30)}"`,
                ),
              description: (() => {
                const cell = tr.children[1];
                if (!cell) return null;
                const range = document.createRange();
                range.selectNodeContents(cell);
                const tops = new Set(
                  [...range.getClientRects()]
                    .filter((r) => r.width > 0)
                    .map((r) => Math.round(r.top)),
                );
                const s = getComputedStyle(cell);
                return {
                  lines: tops.size,
                  cut: cell.scrollWidth > cell.clientWidth + 1,
                  ellipsis:
                    s.textOverflow === "ellipsis" && s.overflowX !== "visible",
                };
              })(),
              outside: [
                ...tr.querySelectorAll(":scope > th, :scope > td"),
              ].some((c) => {
                const r = c.getBoundingClientRect();
                return r.left < -0.5 || r.right > cw + 0.5;
              }),
            }),
          ),
          links: [...(section?.querySelectorAll("a") ?? [])].map((a) => ({
            text: squashed(a),
            href: a.getAttribute("href"),
          })),
        };
      },
      { selector: REVISIONS, cutsDescription },
    );

  const expected = ROWS.map((row) => [
    row.rev,
    row.description,
    row.drawn,
    row.checked,
    row.tested,
    row.approved,
  ]);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await open(page, width);
    // Batch E (sprint 25, .crew/sprint/25/contract.md, Riders): from 1024 px each Description cell
    // is one line with an ellipsis, its DOM text still the whole goal; below it, the full text.
    const oneLine = width >= 1024;
    const found = await read(oneLine);
    const where = `${width} px`;
    expect(found.section, `${REVISIONS} at ${where}`).toBe(true);
    expect
      .soft(found.h2, `its h2 at ${where}`)
      .toEqual([{ id: "revisions", text: "Revisions" }]);
    expect.soft(found.text, `its caption at ${where}`).toContain(CAPTION);
    expect.soft(found.heads, `its column heads at ${where}`).toEqual(HEADS);
    expect
      .soft(
        found.rows.map((r) => r.cells),
        `its rows at ${where}`,
      )
      .toEqual(expected);
    expect
      .soft(found.rows.filter((r) => !r.seen).length, `rows hidden at ${where}`)
      .toBe(0);
    expect
      .soft(
        found.rows.flatMap((r) => r.clipped),
        oneLine
          ? `truncated cells other than Description at ${where}`
          : `truncated cells at ${where}`,
      )
      .toEqual([]);
    if (oneLine) {
      expect
        .soft(
          found.rows.map((r) => r.description?.lines),
          `lines in each Description cell at ${where}`,
        )
        .toEqual(found.rows.map(() => 1));
      expect
        .soft(
          found.rows
            .filter((r) => r.description?.cut && !r.description.ellipsis)
            .map((r) => r.cells[1]?.slice(0, 30)),
          `Description cells cut without an ellipsis at ${where}`,
        )
        .toEqual([]);
    }
    expect
      .soft(found.links, `its links at ${where}`)
      .toEqual([{ text: `All ${N} revisions in the Log`, href: "/log" }]);
    if (width === 320) {
      expect
        .soft(await horizontalOverflow(page), "page overflow at 320")
        .toBe(0);
      expect
        .soft(
          found.rows.filter((r) => r.outside).length,
          "rows with a cell past the viewport at 320",
        )
        .toBe(0);
    }
  }
});

// The reader's interface for the revision cells (Forge implements it in lib/sprint-log.ts, beside
// `ownersCall`): each entry gains `drawn` (the names, in the contract's order, [] for none),
// `checked` (Lens) and `tested` (Probe), both booleans. Loaded at run time, as C12 loads it, so a
// reader without them fails here alone.
type RevisionEntry = {
  sprint: number;
  ownersCall: boolean;
  drawn?: unknown;
  checked?: unknown;
  tested?: unknown;
};
const READER_MODULE = "../lib/sprint-log";

test("B1.5 the reader: the role rule, Lens and Probe on fixtures, and the Owner set on the retros", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import(
    "node:fs"
  );
  const { tmpdir } = await import("node:os");
  const loaded = (await import(READER_MODULE)) as { readSprintLog?: unknown };
  expect(
    typeof loaded.readSprintLog,
    "lib/sprint-log.ts exports readSprintLog",
  ).toBe("function");
  const read = loaded.readSprintLog as (dir?: string) => RevisionEntry[];

  const roles = (...list: unknown[]) => list.map((role) => ({ role }));
  const cases: [
    string,
    Record<string, unknown>,
    { drawn: string[]; checked: boolean; tested: boolean },
  ][] = [
    [
      "Forge, Pixel and Iris",
      {
        agents: roles("design-director", "creative-engineer", "engineer"),
        lens: { runs: 2 },
      },
      { drawn: ["Forge", "Pixel"], checked: true, tested: false },
    ],
    [
      "Pixel alone of the builders",
      {
        agents: roles("creative-engineer", "qa-engineer", "design-director"),
        lens: { runs: 1 },
      },
      { drawn: ["Pixel"], checked: true, tested: true },
    ],
    [
      "Quill and Iris, no builder",
      { agents: roles("qa-engineer", "product-owner", "design-director") },
      { drawn: ["Iris", "Quill"], checked: false, tested: true },
    ],
    [
      "Quill twice",
      { agents: roles("product-owner", "product-owner") },
      { drawn: ["Quill"], checked: false, tested: false },
    ],
    [
      "Probe alone",
      { agents: roles("qa-engineer"), lens: { runs: 1 } },
      { drawn: [], checked: true, tested: true },
    ],
    [
      "the old shape",
      { lens_important_findings: 0 },
      { drawn: [], checked: true, tested: false },
    ],
    [
      "no lens runs",
      { agents: roles("engineer"), lens: { runs: 0 } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "runs not an integer",
      { agents: roles("engineer"), lens: { runs: 1.5 } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "runs a string",
      { agents: roles("engineer"), lens: { runs: "2" } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "agents not a list",
      { agents: "engineer", lens: "yes" },
      { drawn: [], checked: false, tested: false },
    ],
    [
      "malformed agents",
      {
        agents: [null, "engineer", { role: 5 }, { name: "x" }],
        lens_important_findings: "1",
      },
      { drawn: [], checked: false, tested: false },
    ],
  ];
  const dir = mkdtempSync(join(tmpdir(), "revisions-"));
  try {
    for (const [i, [, change]] of cases.entries()) {
      const sprint = i + 1;
      mkdirSync(join(dir, String(sprint)));
      writeFileSync(
        join(dir, String(sprint), "retro.json"),
        JSON.stringify({
          sprint,
          goal: "A goal",
          outcome: "merged",
          ...change,
        }),
      );
    }
    let entries: RevisionEntry[] = [];
    expect(() => {
      entries = read(dir);
    }, "the reader never throws on a missing or malformed role field").not.toThrow();
    for (const [i, [what, , wanted]] of cases.entries()) {
      const entry = entries.find((e) => e.sprint === i + 1);
      expect
        .soft(
          entry && {
            drawn: entry.drawn,
            checked: entry.checked,
            tested: entry.tested,
          },
          what,
        )
        .toEqual(wanted);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // The retros on record: the owner's call 3, and the same cells as this suite's oracle.
  const record = read();
  expect(
    record
      .filter((e) => e.sprint <= 21 && e.ownersCall)
      .map((e) => e.sprint)
      .sort((a, b) => a - b),
    "sprints up to 21 the owner approved",
  ).toEqual([1, 2, 7, 9, 10, 12, 15]);
  for (const retro of MERGED) {
    const entry = record.find((e) => e.sprint === retro.sprint);
    expect
      .soft(
        entry && {
          drawn: entry.drawn,
          checked: entry.checked,
          tested: entry.tested,
        },
        `sprint ${retro.sprint}`,
      )
      .toEqual({
        drawn: retro.drawn,
        checked: retro.checked,
        tested: retro.tested,
      });
  }
});

// B1.6: one test per page and scheme, a template counted once.
type Paint = { where: string; property: string };

/** Everything painted in the accent: text, grounds, borders, rings, underlines and SVG paint. */
function accentPaint(page: Page, accent: Rgba) {
  return page.evaluate((target) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba || !target)
      return [{ where: "page", property: "no __rgba or accent" }];
    const same = (value: string) => {
      const c = rgba(value);
      return Boolean(
        c?.every(
          (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
        ),
      );
    };
    const hits: { where: string; property: string }[] = [];
    const ownText = (el: Element) =>
      [...el.childNodes].some(
        (n) =>
          n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
    for (const el of [
      document.documentElement,
      ...document.body.querySelectorAll("*"),
    ]) {
      if (el.getClientRects().length === 0 && el !== document.documentElement)
        continue;
      const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      for (const pseudo of [null, "::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && ["none", "normal"].includes(s.content)) continue;
        const where = `${name}${pseudo ?? ""}`;
        const check = (property: string, value: string, painted = true) => {
          if (painted && same(value)) hits.push({ where, property });
        };
        check(
          "color",
          s.color,
          pseudo !== null || ownText(el) || el.tagName === "A",
        );
        check("background-color", s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          check(
            `border-${side.toLowerCase()}-color`,
            s[`border${side}Color`],
            s[`border${side}Style`] !== "none" &&
              Number.parseFloat(s[`border${side}Width`]) > 0,
          );
        }
        check(
          "outline-color",
          s.outlineColor,
          s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0,
        );
        check(
          "text-decoration-color",
          s.textDecorationColor,
          s.textDecorationLine !== "none",
        );
        if (el instanceof SVGElement && !pseudo) {
          check("fill", s.fill, s.fill !== "none");
          check("stroke", s.stroke, s.stroke !== "none");
        }
      }
    }
    return hits;
  }, accent);
}

for (const scheme of SCHEMES) {
  for (const [route, status] of [
    ["/", 200],
    ["/log", 200],
    ["/log/13", 200],
    ["/read", 200],
    ["/no-such-page", 404],
  ] as const) {
    test(`B1.6 nothing is copper: no --accent at rest, hovered or focused; links are ink and underlined; the ring is 2 px of ink, 2 px out (${route}, ${scheme})`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({
        colorScheme: scheme,
        reducedMotion: "no-preference",
      });
      await open(page, 1440, 900, route, status);
      const accent = await tokenRgba(page, "--accent");
      const ink = await tokenRgba(page, "--foreground");
      expect(accent, "--accent resolves").not.toBeNull();
      expect(ink, "--foreground resolves").not.toBeNull();
      const hits: Paint[] = [];
      const note = (state: string, found: Paint[]) => {
        for (const hit of found)
          hits.push({
            where: `${state}: ${hit.where}`,
            property: hit.property,
          });
      };
      await page.mouse.move(0, 0);
      await settled(page);
      note("at rest", await accentPaint(page, accent));

      // Links: ink, and underlined but for the bar's (the frames draw it bare): its nav, and on
      // /log its wordmark, the bar being the header with the nav.
      const links = await page.evaluate(() => {
        const rgba = (
          window as Window & { __rgba?: (c: string) => number[] | null }
        ).__rgba;
        return [...document.querySelectorAll("a[href]")]
          .filter(
            (a) =>
              a.getAttribute("href") !== "#main" &&
              a.getClientRects().length > 0,
          )
          .map((a) => {
            const s = getComputedStyle(a);
            return {
              href: a.getAttribute("href") ?? "",
              color: rgba ? rgba(s.color) : null,
              underlined: s.textDecorationLine.includes("underline"),
              inBar:
                a.closest("header:has(nav)") !== null && !a.closest("main"),
            };
          });
      });
      expect(links.length, "links on the page").toBeGreaterThan(0);
      expect
        .soft(
          links
            .filter((link) => !sameColor(link.color, ink))
            .map((link) => link.href),
          "links not in --foreground",
        )
        .toEqual([]);
      expect
        .soft(
          links
            .filter((link) => !link.inBar && !link.underlined)
            .map((link) => link.href),
          "links outside the bar that aren't underlined",
        )
        .toEqual([]);

      // Hover each link.
      const count = await page.locator("a[href]").count();
      for (let i = 0; i < count; i++) {
        const link = page.locator("a[href]").nth(i);
        const href = (await link.getAttribute("href")) ?? "";
        // The skip link is a 1 px box until focused; the Tab walk below covers it.
        if (href === "#main" || !(await link.isVisible())) continue;
        await link.hover();
        await settled(page);
        note(`hovering ${href}`, await accentPaint(page, accent));
      }
      await page.mouse.move(0, 0);

      // Tab through every stop: the ring, and no copper anywhere while it shows.
      await open(page, 1440, 900, route, status);
      const stops = await page.locator("a[href], button").count();
      const rings: string[] = [];
      for (let press = 0; press < stops + 1; press++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          // A card may wear its link's ring.
          const holder = [el, el.closest("li")].find(
            (c) => c && getComputedStyle(c).outlineStyle !== "none",
          );
          const s = holder ? getComputedStyle(holder) : null;
          return {
            href: el.getAttribute("href") ?? el.tagName.toLowerCase(),
            style: s?.outlineStyle ?? "none",
            width: s ? Number.parseFloat(s.outlineWidth) : 0,
            offset: s ? Number.parseFloat(s.outlineOffset) : 0,
            color: s && rgba ? rgba(s.outlineColor) : null,
          };
        });
        if (!ring) break;
        note(`focused ${ring.href}`, await accentPaint(page, accent));
        if (
          ring.style !== "solid" ||
          Math.abs(ring.width - 2) > 0.05 ||
          Math.abs(ring.offset - 2) > 0.05 ||
          !sameColor(ring.color, ink)
        ) {
          rings.push(
            `${ring.href}: ${ring.style} ${ring.width} px, ${ring.offset} px out, ${JSON.stringify(ring.color)}`,
          );
        }
      }
      expect
        .soft(rings, "focus rings that aren't 2 px of --foreground, 2 px out")
        .toEqual([]);
      expect(hits, "anything painted in --accent").toEqual([]);
    });
  }
}

test("B1.7 nothing today's page says is lost: the facts below the sheet, verbatim, and the JSON-LD Person", async ({
  page,
}) => {
  await open(page, 1440);
  const found = await page.evaluate(() => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const of = (id: string) =>
      document.querySelector(`section[aria-labelledby="${id}"]`);
    const revisions = document.querySelector(
      'section[aria-labelledby="revisions"]',
    );
    const work = of("work");
    return {
      ids: [...document.querySelectorAll("main h2")]
        .map((h) => h.id)
        .filter((id) => id !== "revisions"),
      first: squashed(document.querySelector("main h2#work")),
      below: Boolean(
        revisions &&
          work &&
          revisions.compareDocumentPosition(work) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      text: Object.fromEntries(
        ["work", "projects", "stack", "education", "contact"].map((id) => [
          id,
          squashed(of(id)),
        ]),
      ),
      stack: [...(of("stack")?.querySelectorAll("li") ?? [])].map((li) =>
        squashed(li),
      ),
      contact: [...(of("contact")?.querySelectorAll("a") ?? [])].map((a) => ({
        label: squashed(a),
        href: a.getAttribute("href"),
      })),
      ld: [
        ...document.querySelectorAll('script[type="application/ld+json"]'),
      ].map((s) => s.textContent ?? ""),
    };
  });
  expect
    .soft(found.ids, "the facts' h2 ids, in order")
    .toEqual([
      "work",
      "case-studies",
      "projects",
      "stack",
      "education",
      "contact",
    ]);
  expect.soft(found.first, "the first reads").toBe("Work");
  expect
    .soft(found.below, "the facts come after the revision block")
    .toBe(true);
  const has = (section: string, fact: string, what: string) =>
    expect.soft(found.text[section] ?? "", what).toContain(squash(fact));
  for (const role of profile.experience) {
    for (const key of ["title", "company", "period", "summary"] as const) {
      has("work", role[key], `Work: ${role.company}'s ${key}`);
    }
  }
  for (const project of profile.projects) {
    has("projects", project.name, `Projects: ${project.name}`);
    has(
      "projects",
      project.description,
      `Projects: ${project.name}'s description`,
    );
  }
  expect.soft(found.stack, "Stack, in order").toEqual(profile.stack);
  for (const entry of profile.education) {
    for (const key of ["school", "credential", "period"] as const) {
      has("education", entry[key], `Education: ${entry.school}'s ${key}`);
    }
  }
  expect.soft(found.contact, "Contact's links").toEqual(profile.links);
  const people = found.ld
    .map((text) => JSON.parse(text) as Record<string, unknown>)
    .filter((data) => data["@type"] === "Person");
  expect(people, "JSON-LD Person").toHaveLength(1);
  expect.soft(people[0]).toMatchObject({
    name: profile.name,
    jobTitle: profile.headline,
    description: profile.bio,
    email: profile.links
      .find((link) => link.href.startsWith("mailto:"))
      ?.href.replace("mailto:", ""),
    sameAs: profile.links
      .map((link) => link.href)
      .filter((href) => !href.startsWith("mailto:")),
  });
});

test("B1.10 one type family: Sofia Sans and its Extra Condensed name, two self-hosted woff2 within 86,016 B, the display face preloaded, no Geist", async ({
  page,
}) => {
  // Through next/font/google, in the layout's source.
  const imports = readdirSync("app", { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .flatMap((file) =>
      [
        ...readFileSync(join("app", file), "utf8").matchAll(
          /import\s*\{([^}]*)\}\s*from\s*"next\/font\/google"/g,
        ),
      ].flatMap((match) =>
        (match[1] ?? "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );
  expect
    .soft(imports.sort(), "next/font/google imports in app/")
    .toEqual(["Sofia_Sans", "Sofia_Sans_Extra_Condensed"]);

  // Bodies are read on / only: the listener comes off before another page is opened, where a font
  // served from Chrome's memory cache has no body over CDP and an unawaited read would reject.
  const fonts: Promise<{ url: string; bytes: number }>[] = [];
  const onResponse = (response: Response) => {
    if (new URL(response.url()).pathname.endsWith(".woff2")) {
      fonts.push(
        response
          .body()
          .then((body) => ({ url: response.url(), bytes: body.length })),
      );
    }
  };
  page.on("response", onResponse);
  await open(page, 1440);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 500)));
  page.off("response", onResponse);
  const files = await Promise.all(fonts);
  expect
    .soft(
      files.map((f) => new URL(f.url).pathname),
      "woff2 files / loads",
    )
    .toHaveLength(2);
  for (const file of files) {
    expect
      .soft(new URL(file.url).origin, `${file.url} is self-hosted`)
      .toBe(new URL(page.url()).origin);
  }
  expect
    .soft(
      files.reduce((sum, f) => sum + f.bytes, 0),
      "the woff2 files together, in bytes",
    )
    .toBeLessThanOrEqual(86_016);

  const faces = await page.evaluate(() => {
    const primary = (el: Element | null) =>
      el
        ? (getComputedStyle(el).fontFamily.split(",")[0] ?? "")
            .trim()
            .replace(/^["']|["']$/g, "")
        : "";
    const rules: { family: string; urls: string[] }[] = [];
    for (const sheet of document.styleSheets) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of list) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const src = rule.style.getPropertyValue("src");
        rules.push({
          family: rule.style
            .getPropertyValue("font-family")
            .replace(/["']/g, "")
            .trim(),
          urls: [...src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(
            (m) => new URL(m[1] ?? "", sheet.href ?? location.href).href,
          ),
        });
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
      rules: rules.filter((rule) => rule.urls.length > 0),
      preloads: [
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][as="font"]',
        ),
      ].map((l) => l.href),
      h1: primary(document.querySelector("h1")),
      families: [
        ...new Set(texts.filter((el) => el.tagName !== "H1").map(primary)),
      ],
      geist: [
        ...new Set(texts.map((el) => getComputedStyle(el).fontFamily)),
      ].filter((f) => /geist/i.test(f)),
    };
  });
  expect
    .soft(
      [...new Set(faces.rules.map((rule) => rule.family))].sort(),
      "@font-face families with a file",
    )
    .toEqual(["Sofia Sans", "Sofia Sans Extra Condensed"]);
  expect.soft(faces.h1, "the h1's face").toBe("Sofia Sans Extra Condensed");
  expect
    .soft(faces.families, "the faces of every other text")
    .toContain("Sofia Sans");
  expect.soft(faces.geist, "text set in Geist").toEqual([]);
  const display = faces.rules
    .filter((rule) => rule.family === "Sofia Sans Extra Condensed")
    .flatMap((rule) => rule.urls);
  expect(display.length, "the display face's file").toBeGreaterThan(0);
  expect
    .soft(
      faces.preloads.filter((href) => display.includes(href)),
      "the display face is preloaded",
    )
    .not.toEqual([]);
});

// The direction's values (.crew/sprint/17/design/tokens.webp, canvas-extract/Tokens.html, and Iris's
// notes section 1). Iris owns them: a retune in her notes changes this table, nothing else.
const DIRECTION = {
  light: {
    background: "#eaf1ee",
    foreground: "#111c22",
    muted: "#555c61",
    accent: "#9e441d",
    rule: "#bfcac7",
  },
  dark: {
    background: "#10191c",
    foreground: "#e2eae9",
    muted: "#a3adb1",
    accent: "#ee8f63",
    rule: "#323d40",
  },
} as const;
const LINE_TOKENS = ["--pencil", "--card", "--card-old"] as const;

test("B1.11 the tokens carry the new palette: the five keep their names, three new ones for lines and fills, and the name's own step", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const colors = await resolveColors(page);
    for (const [role, hex] of Object.entries(DIRECTION[scheme])) {
      expect
        .soft(colors[`--${role}`]?.computed, `--${role} (${scheme})`)
        .toBe(hexToRgb(hex));
    }
    const site = scheme === "light" ? LIGHT : DARK;
    expect
      .soft({ ...site }, `lib/site.ts (${scheme})`)
      .toEqual(DIRECTION[scheme]);

    const raw = await rootTokens(page, [...LINE_TOKENS]);
    const values: Record<string, Rgba> = {};
    for (const token of LINE_TOKENS) {
      expect
        .soft(raw[token], `${token} is set on :root (${scheme})`)
        .not.toBe("");
      values[token] = await tokenRgba(page, token);
      expect
        .soft(values[token], `${token} resolves to a color (${scheme})`)
        .not.toBeNull();
    }
    // Never text: no text is painted in a line or fill token (unless it equals ink or graphite).
    const textTokens = [
      await tokenRgba(page, "--foreground"),
      await tokenRgba(page, "--muted"),
    ];
    const textColors = await page.evaluate(() => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      return [...document.body.querySelectorAll("*")]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            [...el.childNodes].some(
              (n) =>
                n.nodeType === Node.TEXT_NODE &&
                (n.textContent ?? "").trim() !== "",
            ),
        )
        .map((el) => {
          const s = getComputedStyle(el);
          return {
            el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`,
            color: rgba
              ? rgba(el instanceof SVGElement ? s.fill : s.color)
              : null,
          };
        });
    });
    for (const token of LINE_TOKENS) {
      const value = values[token] ?? null;
      if (!value || textTokens.some((t) => sameColor(t, value))) continue;
      expect
        .soft(
          textColors.filter((t) => sameColor(t.color, value)).map((t) => t.el),
          `text in ${token} (${scheme})`,
        )
        .toEqual([]);
    }
  }

  // The name's step: about 60 px at 390, 104 px at 1440, growing between.
  await page.emulateMedia({ colorScheme: "light" });
  const sizes: Record<number, { step: number; h1: number; raw: string }> = {};
  for (const width of [390, 768, 1440]) {
    await open(page, width);
    sizes[width] = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.fontSize = "var(--step-3xl)";
      document.body.append(probe);
      const step = Number.parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const h1 = document.querySelector("h1");
      return {
        step,
        h1: h1 ? Number.parseFloat(getComputedStyle(h1).fontSize) : 0,
        raw: getComputedStyle(document.documentElement)
          .getPropertyValue("--step-3xl")
          .trim(),
      };
    });
  }
  expect.soft(sizes[1440]?.raw, "--step-3xl is set on :root").not.toBe("");
  for (const [width, about] of [
    [390, 60],
    [1440, 104],
  ] as const) {
    const size = sizes[width];
    expect
      .soft(size?.h1, `the h1 is set in --step-3xl at ${width}`)
      .toBeCloseTo(size?.step ?? -1, 1);
    expect
      .soft(
        Math.abs((size?.step ?? 0) - about) / about,
        `--step-3xl at ${width}: ${size?.step} px, about ${about}`,
      )
      .toBeLessThanOrEqual(0.06);
  }
  expect
    .soft(sizes[768]?.step ?? 0, "--step-3xl at 768 grows past 390's")
    .toBeGreaterThan(sizes[390]?.step ?? 0);
  expect
    .soft(sizes[768]?.step ?? 0, "--step-3xl at 768 is below 1440's")
    .toBeLessThan(sizes[1440]?.step ?? 0);
});

test("B2.9 riders: in forced colours an original plank and its swatch fill unlike a seated plank and its swatch, each unlike Canvas, on / and /read; and the folded revision table's labels show at 390", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  for (const route of ["/", "/read"]) {
    await open(page, 1440, 900, route);
    const seen = await page.evaluate(() => {
      const canvas = getComputedStyle(document.body).backgroundColor;
      const geometry = (plank: Element | null) =>
        plank instanceof SVGGeometryElement
          ? plank
          : (plank?.querySelector(
              "path, polygon, rect, polyline, ellipse, circle",
            ) ?? null);
      const plankPaint = (plank: Element | null) => {
        const g = geometry(plank);
        if (!g) return null;
        const s = getComputedStyle(g);
        return {
          fill: s.fill,
          edge:
            s.stroke !== "none" && Number.parseFloat(s.strokeWidth) > 0
              ? s.stroke
              : null,
        };
      };
      const legend = [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            !el.closest("svg") &&
            el.querySelectorAll("li").length > 0 &&
            /\bseated\b/i.test(el.textContent ?? "") &&
            /\boriginal\b/i.test(el.textContent ?? ""),
        )
        .at(-1);
      const swatchPaint = (word: RegExp) => {
        const li = [...(legend?.querySelectorAll("li") ?? [])].find((item) =>
          word.test(item.textContent ?? ""),
        );
        const swatch = li?.querySelector('[aria-hidden="true"]') ?? null;
        if (!swatch) return null;
        const s = getComputedStyle(swatch);
        return {
          fill: s.backgroundColor,
          edge:
            s.borderTopStyle !== "none" &&
            Number.parseFloat(s.borderTopWidth) > 0
              ? s.borderTopColor
              : null,
        };
      };
      return {
        active: matchMedia("(forced-colors: active)").matches,
        canvas,
        seatedPlank: plankPaint(
          document.querySelector("[data-plan] [data-plank][data-sprint]"),
        ),
        originalPlank: plankPaint(
          document.querySelector("[data-plan] [data-plank]:not([data-sprint])"),
        ),
        seatedSwatch: swatchPaint(/\bseated\b/i),
        originalSwatch: swatchPaint(/\boriginal\b/i),
      };
    });
    expect(seen.active, "forced colours are on").toBe(true);
    expect
      .soft(seen.seatedSwatch, `the seated swatch on ${route}`)
      .not.toBeNull();
    expect
      .soft(seen.originalSwatch, `the original swatch on ${route}`)
      .not.toBeNull();
    expect.soft(seen.seatedPlank, `a seated plank on ${route}`).not.toBeNull();
    expect
      .soft(
        seen.originalSwatch?.fill,
        `the original swatch's fill vs the seated swatch's, on ${route}`,
      )
      .not.toBe(seen.seatedSwatch?.fill);
    const shows = (paint: { fill: string; edge: string | null } | null) =>
      paint !== null &&
      (paint.fill !== seen.canvas ||
        (paint.edge !== null && paint.edge !== seen.canvas));
    for (const [what, paint] of [
      ["the seated swatch", seen.seatedSwatch],
      ["the original swatch", seen.originalSwatch],
      ["a seated plank", seen.seatedPlank],
      ...(seen.originalPlank
        ? [["an original plank", seen.originalPlank] as const]
        : []),
    ] as const) {
      expect
        .soft(
          shows(paint),
          `${what} differs from Canvas in border or fill, on ${route}: ${JSON.stringify(paint)}`,
        )
        .toBe(true);
    }
    if (seen.originalPlank) {
      expect
        .soft(
          seen.originalPlank.fill,
          `an original plank's fill vs a seated plank's, on ${route}`,
        )
        .not.toBe(seen.seatedPlank?.fill);
    } else {
      // Every plank is seated once 22 sprints have merged: only the swatches are left to compare.
      test.info().annotations.push({
        type: "unchecked",
        description: `${route}: no original plank to compare with a seated one`,
      });
    }
  }
  await page.emulateMedia({ forcedColors: "none" });

  // The folded table: each signature cell still shows its column's head at 390.
  await open(page, 390, 844);
  const cells = await page.evaluate(
    (revisions) =>
      [...document.querySelectorAll(`${revisions} tbody td[data-label]`)].map(
        (td) => {
          const before = getComputedStyle(td, "::before");
          return {
            label: td.getAttribute("data-label") ?? "",
            shown:
              td.getClientRects().length > 0 &&
              !["none", "normal"].includes(before.content) &&
              before.display !== "none" &&
              before.visibility !== "hidden",
            content: before.content,
          };
        },
      ),
    REVISIONS,
  );
  expect(cells.length, "labelled cells in the revision table").toBeGreaterThan(
    0,
  );
  expect
    .soft(
      cells.filter((c) => !c.shown).map((c) => `${c.label}: ${c.content}`),
      "folded cells whose label doesn't show at 390",
    )
    .toEqual([]);
});
