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
import { firstScreen, insideViewport, textSizes } from "./first-screen";
import {
  horizontalOverflow,
  installRgba,
  MOTION,
  measureLcp,
  motionReady,
  SCHEMES,
  watchLayoutShift,
} from "./helpers";
import { layerFor, pencilSeat } from "./live-layer";
import {
  box,
  canvasFit,
  capAt,
  drawingAt,
  FIRST,
  profile as hullOf,
  modelCoverage,
  note,
  outlineCoverage,
  pause,
  REST,
  SHOWN,
  whole,
} from "./model";
import { deltaE, edges, hausdorff, type Image, pixel } from "./pixels";
import { PLAN } from "./plan";
import { bioParts, MERGED } from "./retros";
import { type ModelRun, openModel, refuseWebGl } from "./webgl";

// Sprint 43, Wa: the sheet fits a laptop window (.crew/sprint/43/contract.md, W1 to W7), written
// before the build. `/`'s first window holds the facts at every window in the set, the drawing
// gives up the height, and 1440 x 900 doesn't move. Each check reads the contract's hooks wherever
// Iris places them: the first screen through B1.1's reads (e2e/first-screen.ts), the feed states
// through B4.22's harness (e2e/crew-feed.ts, the kept sites live-layer.spec.ts names), the model
// through B3.1's measure (e2e/model.ts), CLS through B1.8's read and LCP through B1.9's
// measurement (e2e/helpers.ts). The 2D reads refuse WebGL (sprint 25: the model's data-state
// restyles the drawing from 1024 px); W4, W5, W6 and W7's mode clause run the model.

/** The set, from 1280 wide (the contract's "The windows"), briefed word for word. */
const WINDOWS = [
  [1280, 680],
  [1280, 800],
  [1366, 625],
  [1440, 790],
  [1470, 840],
  [1512, 865],
  [1536, 715],
  [1920, 950],
] as const;
/** The two windows W4, W6 and W7 name: the shortest and the commonest Windows laptop's. */
const SHORT = [
  [1366, 625],
  [1536, 715],
] as const;

/**
 * Iris's floor for the drawing's height, in CSS px (W3): the smallest drawing she accepts on a
 * short window, measured on `[data-plan]`'s box (.crew/sprint/43/placement.md, "The floor": 240 px,
 * a drawing 710 px wide, whose lift still holds an 11 px plank number). W3 asserts it on that box
 * and reports the shown drawing's (`.plan-wide`) height beside it.
 */
const DRAWING_FLOOR_PX = 240;

const BLOCK = "dl[data-particulars]";
const REVISIONS = 'section[aria-labelledby="revisions"]';
/** Item 3: the p after the revision block's h2, the bio's last part (B1.2's caption). */
const CAPTION_P = `${REVISIONS} h2 + p`;
const [, , ...BIO_REST] = bioParts(profile.bio);
const CAPTION = BIO_REST.join(" ");
const KEY = "p[data-crew-key]";
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

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

const at = (width: number, height: number) => `${width} x ${height}`;

/** `/` from `base` at a size, with the web fonts in. */
async function openHome(page: Page, width: number, height: number, base = "") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/`);
  expect(
    response?.status(),
    `status of ${base || "the default server"}/ at ${at(width, height)}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** Items 2 and 3: the dl and the caption, each with its box, and the caption's text. */
function blockAndCaption(page: Page) {
  return page.evaluate(
    ({ block, caption }) => {
      const edgesOf = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      const p = document.querySelector(caption);
      return {
        dl: edgesOf(document.querySelector(block)),
        caption: edgesOf(p),
        text: (p?.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    },
    { block: BLOCK, caption: CAPTION_P },
  );
}

/** What's in the first window that the contract lists, items 1 to 4, against the viewport. */
async function firstWindow(page: Page) {
  const found = await firstScreen(page);
  const more = await blockAndCaption(page);
  const items = [
    ...found.items,
    { what: BLOCK, box: more.dl },
    { what: `the caption (${CAPTION_P})`, box: more.caption },
  ];
  const sizes = await textSizes(page);
  return {
    viewport: found.viewport,
    captionText: more.text,
    outside: items
      .filter(({ box: b }) => !insideViewport(b, found.viewport))
      .map(({ what, box: b }) => `${what}: ${JSON.stringify(b)}`),
    lowest: Math.max(...items.map(({ box: b }) => b?.bottom ?? Infinity)),
    h1: sizes.h1,
    larger: sizes.others.filter(({ size }) => size >= sizes.h1),
  };
}

// ---------------------------------------------------------------------------------------------
// W1 and W2 read the feed's fixtures: one worker, in order, as the feed specs run (STATE.md).

const FIXTURES = ["live", "open", "resting"] as const;
type FixtureName = (typeof FIXTURES)[number];

/**
 * The fixture's site, as B4.22 reaches it: live-layer.spec.ts's kept site by name and answer, read
 * until `/crew` shows the oracle's state, then `/` until it shows the layer's hooks. Once per
 * worker; it asserts nothing.
 */
function reachHome(crew: Crew, fixture: FixtureName) {
  return crew.once(`window ${fixture}`, async () => {
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

/** A fixture's site, asserted to show its state on `/`. */
async function shownOn(crew: Crew, fixture: FixtureName) {
  const reached = await reachHome(crew, fixture);
  test.info().annotations.push({
    type: "state-wait",
    description: `${fixture}: /crew ${reached.crewShown.seen} after ${reached.crewShown.ms} ms, then / ${reached.home.seen} after ${reached.home.ms} ms`,
  });
  expect(
    reached.home.seen,
    `the state / shows on the home-${fixture} site within ${STATE_WAIT} ms`,
  ).toBe(reached.want);
  return { base: reached.base, where: `the ${fixture} fixture` };
}

/** W2's boxes: [left, top, width, height], CSS px, at 1440 x 900 with WebGL refused. */
type Boxes = Record<string, [number, number, number, number] | null>;

function w2Boxes(page: Page) {
  return page.evaluate(
    ({ block, links, revisions, key, plan }) => {
      const read = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].map(
          (v) => Math.round(v * 1000) / 1000,
        ) as [number, number, number, number];
      };
      const header = document.querySelector("main > header");
      const out: Record<string, [number, number, number, number] | null> = {
        h1: read(header?.querySelector("h1") ?? null),
        dl: read(document.querySelector(block)),
      };
      for (const href of links)
        out[`link ${href}`] = read(
          header?.querySelector(`a[href="${href}"]`) ?? null,
        );
      const rows = [
        ...document.querySelectorAll(`${revisions} table tbody tr`),
      ];
      for (let i = 0; i < 5; i++) out[`row ${i + 1}`] = read(rows[i] ?? null);
      out.key = read(document.querySelector(key));
      out.plan = read(document.querySelector(plan));
      return out;
    },
    {
      block: BLOCK,
      links: profile.links.map((link) => link.href),
      revisions: REVISIONS,
      key: KEY,
      plan: PLAN,
    },
  );
}

/**
 * Main's boxes at 1440 x 900, light, WebGL refused, recorded by this spec's W2 on main's product
 * code at 5643a54 (#98, "One site", which moved the title block's contact row), run from the sprint
 * branch's bfeaaa7. Each is [left, top, width, height] in CSS px. They pin the owner's words as
 * they wrap today: a change to content/profile.ts that rewraps the title block moves them, and is a
 * reason to record them again, said in the PR.
 */
const MAIN_1440_900: Record<"default" | "live", Boxes> = {
  default: {
    h1: [848.563, 567.313, 546.438, 89.438],
    dl: [947.078, 407.578, 447.922, 123.734],
    "link mailto:nycruslan@gmail.com": [1198, 839.969, 39, 26.344],
    "link https://www.linkedin.com/in/nycruslan/": [1259, 839.969, 60, 26.344],
    "link https://github.com/nycruslan": [1341, 839.969, 54, 26.344],
    "row 1": [41, 631.203, 754.563, 31.891],
    "row 2": [41, 663.094, 754.563, 31.891],
    "row 3": [41, 694.984, 754.563, 31.891],
    "row 4": [41, 726.875, 754.563, 31.891],
    "row 5": [41, 758.766, 754.563, 31.891],
    key: [41, 797.156, 754.563, 19.5],
    plan: [16, 72, 1408, 475.313],
  },
  live: {
    h1: [848.563, 567.313, 546.438, 89.438],
    dl: [947.078, 407.578, 447.922, 123.734],
    "link mailto:nycruslan@gmail.com": [1198, 847.828, 39, 26.344],
    "link https://www.linkedin.com/in/nycruslan/": [1259, 847.828, 60, 26.344],
    "link https://github.com/nycruslan": [1341, 847.828, 54, 26.344],
    "row 1": [41, 631.203, 754.563, 31.906],
    "row 2": [41, 663.109, 754.563, 31.891],
    "row 3": [41, 695, 754.563, 31.891],
    "row 4": [41, 726.891, 754.563, 31.891],
    "row 5": [41, 758.781, 754.563, 31.891],
    key: [41, 797.172, 754.563, 19.5],
    plan: [16, 72, 1408, 475.313],
  },
};

/** The keys whose boxes differ from main's by more than 0.5 px, with both. */
function moved(now: Boxes, main: Boxes) {
  const out: string[] = [];
  for (const key of new Set([...Object.keys(main), ...Object.keys(now)])) {
    const [a, b] = [now[key] ?? null, main[key] ?? null];
    const same =
      a !== null &&
      b !== null &&
      a.every((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) <= 0.5);
    if (!same && !(a === null && b === null))
      out.push(`${key}: ${JSON.stringify(a)}, main ${JSON.stringify(b)}`);
  }
  return out;
}

test.describe("on the feed's fixtures", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live, open and resting states need this checkout's build served from copies pointed at the fixture server (B4.22's harness)",
  );
  // The three sites start together, once per worker.
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reachHome(crew, fixture);
  });

  test("W1 the first window holds the facts: at every window in the set, light and dark, on the default server and the live, open and resting fixtures, WebGL refused, the h1, the headline, the bio's lead, the three contact links, the dl and the revisions' caption are wholly inside the viewport, and the h1 is the largest text", async ({
    page,
    crew,
  }) => {
    test.setTimeout(300_000);
    await page.context().addInitScript(refuseWebGl);
    const states = [{ base: "", where: "the default server" }];
    for (const fixture of FIXTURES) states.push(await shownOn(crew, fixture));
    const lowest = new Map<string, number>();
    for (const { base, where: site } of states) {
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const [width, height] of WINDOWS) {
          await openHome(page, width, height, base);
          const where = `on ${site} at ${at(width, height)}, ${scheme}`;
          const found = await firstWindow(page);
          expect
            .soft(found.captionText, `the caption's text ${where}`)
            .toBe(CAPTION);
          expect
            .soft(
              found.outside,
              `items not wholly inside the first window ${where}`,
            )
            .toEqual([]);
          expect(found.h1, `the h1's font size ${where}`).toBeGreaterThan(0);
          expect
            .soft(
              found.larger,
              `text as large as the h1 (${found.h1} px) ${where}`,
            )
            .toEqual([]);
          const k = at(width, height);
          lowest.set(k, Math.max(lowest.get(k) ?? 0, found.lowest));
        }
      }
    }
    note(
      test.info(),
      "lowest item",
      [...lowest].map(([k, bottom]) => `${k}: ${bottom.toFixed(1)}`).join("; "),
    );
  });

  test("W2 nothing moves at 1440 x 900: on the default server and the live fixture, WebGL refused, the boxes of the h1, the dl, the three contact links, the five rows, p[data-crew-key] and [data-plan] equal main's within 0.5 px; 1920 x 1080's are reported", async ({
    page,
    crew,
  }) => {
    test.setTimeout(180_000);
    await page.context().addInitScript(refuseWebGl);
    const live = await shownOn(crew, "live");
    for (const [name, base] of [
      ["default", ""],
      ["live", live.base],
    ] as const) {
      await openHome(page, 1440, 900, base);
      const now = await w2Boxes(page);
      note(test.info(), `boxes ${name} 1440 x 900`, JSON.stringify(now));
      expect
        .soft(
          Object.keys(MAIN_1440_900[name]).length,
          `main's boxes recorded for ${name}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(
          moved(now, MAIN_1440_900[name]),
          `boxes that moved from main's at 1440 x 900 on ${name === "default" ? "the default server" : "the live fixture"}`,
        )
        .toEqual([]);
      await openHome(page, 1920, 1080, base);
      note(
        test.info(),
        `boxes ${name} 1920 x 1080 (reported)`,
        JSON.stringify(await w2Boxes(page)),
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------

/** W3's reads: the drawing's planks and lettering against its box, the viewport and any clip. */
function drawingReads(page: Page, shown: string) {
  return page.evaluate(
    ({ plan, lettering, block, shown }) => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return el.getClientRects().length > 0 && (r.width > 0 || r.height > 0);
      };
      const edgesOf = (el: Element, by = 0) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - by,
          top: r.top - by,
          right: r.right + by,
          bottom: r.bottom + by,
        };
      };
      type E = ReturnType<typeof edgesOf>;
      const inside = (a: E, b: E) =>
        a.left >= b.left - 0.5 &&
        a.top >= b.top - 0.5 &&
        a.right <= b.right + 0.5 &&
        a.bottom <= b.bottom + 0.5;
      const meets = (a: E, b: E) =>
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom;
      const host = document.querySelector(plan);
      const drawing = document.querySelector(shown);
      if (!host || !drawing) return null;
      const box = edgesOf(host);
      const view = {
        left: 0,
        top: 0,
        right: document.documentElement.clientWidth,
        bottom: innerHeight,
      };
      const planks = [...host.querySelectorAll("[data-plank]")].filter(visible);
      const texts = [...document.querySelectorAll(lettering)].filter(visible);
      const name = (el: Element) =>
        el.hasAttribute("data-plank")
          ? `plank ${el.getAttribute("data-plank")}`
          : `lettering "${(el.textContent ?? "").trim()}"`;
      const cut: string[] = [];
      for (const el of [...planks, ...texts]) {
        const e = edgesOf(el);
        if (!inside(e, box)) cut.push(`${name(el)} outside [data-plan]`);
        if (!inside(e, view)) cut.push(`${name(el)} outside the viewport`);
        // Anything that clips (overflow other than visible) between it and the body holds it whole.
        for (
          let a = el.parentElement;
          a && a !== document.body;
          a = a.parentElement
        ) {
          const s = getComputedStyle(a);
          if (s.overflowX === "visible" && s.overflowY === "visible") continue;
          if (!inside(e, edgesOf(a)))
            cut.push(
              `${name(el)} clipped by <${a.tagName.toLowerCase()}> (overflow ${s.overflowX} ${s.overflowY})`,
            );
        }
      }
      const dl = document.querySelector(block);
      const dlBox = dl ? edgesOf(dl) : null;
      const met = dlBox
        ? [
            ...planks
              .filter((p) => meets(dlBox, edgesOf(p, 24)))
              .map((p) => `${name(p)} (+24 px)`),
            ...texts.filter((t) => meets(dlBox, edgesOf(t))).map(name),
          ]
        : [];
      const d = drawing.getBoundingClientRect();
      return {
        planks: planks.length,
        texts: texts.length,
        cut,
        dl: dlBox,
        met,
        height: d.height,
        hostHeight: box.bottom - box.top,
      };
    },
    { plan: PLAN, lettering: LETTERING, block: BLOCK, shown },
  );
}

test("W3 the drawing stays whole and clear: at every window in the set, WebGL refused, every shown [data-plan] [data-plank] and lettering span lies inside [data-plan]'s box and the viewport, clipped by no overflow; the dl meets no plank box grown by 24 px and no lettering box; [data-plan]'s box is at least Iris's floor (240 px) tall, each window's height reported", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.context().addInitScript(refuseWebGl);
  const heights: string[] = [];
  for (const [width, height] of WINDOWS) {
    await openHome(page, width, height);
    const where = `at ${at(width, height)}, WebGL refused`;
    const shown = drawingAt(width);
    const read = await drawingReads(page, shown);
    expect(read, `[data-plan] and ${shown} ${where}`).not.toBeNull();
    if (!read) continue;
    // Without planks or lettering on the page, "inside" and "meets none" are true of anything.
    expect.soft(read.planks, `shown planks ${where}`).toBeGreaterThan(0);
    expect.soft(read.texts, `shown ${LETTERING} ${where}`).toBeGreaterThan(0);
    expect.soft(read.dl, `${BLOCK} ${where}`).not.toBeNull();
    expect
      .soft(read.cut, `the drawing's parts cut or outside ${where}`)
      .toEqual([]);
    expect.soft(read.met, `what the dl's box meets ${where}`).toEqual([]);
    expect
      .soft(
        read.hostHeight,
        `${PLAN}'s height (px) ${where}, Iris's floor ${DRAWING_FLOOR_PX}`,
      )
      .toBeGreaterThanOrEqual(DRAWING_FLOOR_PX);
    heights.push(
      `${at(width, height)}: ${PLAN} ${read.hostHeight.toFixed(1)} (${shown} ${read.height.toFixed(1)})`,
    );
  }
  note(test.info(), "drawing height", heights.join("; "));
});

// ---------------------------------------------------------------------------------------------
// The rider (.crew/sprint/43/placement.md, "Rider"): the 3D pencil number on seat 5.0, the one seat
// whose 2D number is led out. A merged sprint's retro never leaves its seat (STATE.md, sprint 41),
// so the live fixture told as the newest merged sprint seated on 5.0 puts the pencil there at any
// count of retros, where the fixtures' 999 walks the hull one seat a merge.

/** The seat the rider check pins, and the newest merged sprint the build seats on it. */
const RIDER_SEAT = "5.0";
const RIDER_SPRINT = MERGED.filter(
  (r) => pencilSeat(r.sprint) === RIDER_SEAT,
).at(-1)?.sprint;
const RIDER_WINDOWS = [
  [1440, 900],
  [1536, 715],
  [1366, 625],
] as const;

/** The pencil number in the shown wide drawing: its box, its chip and what lettering it meets. */
function riderRead(page: Page) {
  return page.evaluate(
    ({ lettering }) => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const seen = (el: Element) =>
        el.getClientRects().length > 0 &&
        el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      const span = document.querySelector(
        "[data-plan] .plan-wide > .plan-pencil",
      );
      if (!span) return null;
      const r = span.getBoundingClientRect();
      const box = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      };
      const probe = document.createElement("div");
      document.body.append(probe);
      const token = (name: string) => {
        probe.style.color = `var(${name})`;
        return rgba?.(getComputedStyle(probe).color) ?? null;
      };
      const film = token("--background");
      const accent = token("--accent");
      probe.remove();
      const met = [...document.querySelectorAll(lettering)]
        .filter((el) => el !== span && seen(el))
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return (
            b.left < box.right &&
            box.left < b.right &&
            b.top < box.bottom &&
            box.top < b.bottom
          );
        })
        .map((el) => `"${(el.textContent ?? "").trim()}"`);
      return {
        text: (span.textContent ?? "").trim(),
        shown: seen(span),
        box,
        background: rgba?.(getComputedStyle(span).backgroundColor) ?? null,
        film,
        accent,
        met,
      };
    },
    { lettering: LETTERING },
  );
}

/** The copper pixels a canvas-only image paints, composited over the film, and their centre. */
function copperDot(image: Image, accent: number[], ground: number[]) {
  const at: [number, number][] = [];
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const p = pixel(image, x, y);
      const a = (p[3] ?? 0) / 255;
      if (a < 0.02) continue;
      const rgb = [0, 1, 2].map(
        (c) => (p[c] ?? 0) * a + (ground[c] ?? 0) * (1 - a),
      );
      if (deltaE(rgb, accent) < 10) at.push([x, y]);
    }
  const centre = at.length
    ? at.reduce(
        (s, [x, y]) => [s[0] + x / at.length, s[1] + y / at.length],
        [0, 0],
      )
    : null;
  return { count: at.length, centre };
}

test.describe("the rider on seat 5.0", () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the pencil on 5.0 needs this checkout's build served from a copy pointed at the fixture server (B4.22's harness)",
  );

  test("Wa rider: with the live pencil on seat 5.0, on Full at rest at 1440 x 900, 1536 x 715 and 1366 x 625, the 3D pencil number sits on the film chip, meets no [data-plan] .plan-view > span lettering box, doesn't contain the copper dot's centre, and its centre lies on the hull the canvas draws", async ({
    browser,
    crew,
  }) => {
    test.setTimeout(240_000);
    expect(
      RIDER_SPRINT,
      `a merged sprint seated on ${RIDER_SEAT} in the build's retros`,
    ).toBeDefined();
    const name = "seat-50";
    const site = await crew.site(
      name,
      { fixture: "live", patch: { current: { sprint: RIDER_SPRINT } } },
      true,
    );
    const body = crew.feed.body(name);
    const layer = layerFor(body, crew.feed.origin);
    expect(layer.seat, `the oracle's pencil seat for ${RIDER_SPRINT}`).toBe(
      RIDER_SEAT,
    );
    await untilState(
      site.baseURL,
      expected(body, crew.feed.origin).state,
      STATE_WAIT,
    );
    const home = await untilHome(site.baseURL, layer.home, STATE_WAIT);
    expect(home.seen, `the state / shows on the ${name} site`).toBe("live");

    for (const [width, height] of RIDER_WINDOWS) {
      const where = `at ${at(width, height)}, sprint ${RIDER_SPRINT} in pencil on ${RIDER_SEAT}`;
      const run = await openModel(browser, { width, height });
      try {
        await run.context.addInitScript(installRgba);
        await run.goto(`${site.baseURL}/`);
        await run.waitFor([...REST], FIRST);
        await pause(300);
        const read = await riderRead(run.page);
        expect(
          read,
          `the wide drawing's pencil number ${where}`,
        ).not.toBeNull();
        if (!read) continue;
        expect
          .soft(read.text, `the pencil number's text ${where}`)
          .toBe(String(RIDER_SPRINT));
        expect.soft(read.shown, `the pencil number shows ${where}`).toBe(true);

        // The canvas alone over the viewport (the chip, HTML above it, hides the dot on screen).
        const model = await modelCoverage(run.page, {
          x: 0,
          y: 0,
          width,
          height,
        });
        const dot = copperDot(model.image, read.accent ?? [], read.film ?? []);
        const { box: b } = read;
        const [cx, cy] = [(b.left + b.right) / 2, (b.top + b.bottom) / 2];
        const onHull =
          model.alpha[Math.floor(cy) * model.image.width + Math.floor(cx)] ?? 0;
        note(
          test.info(),
          "rider",
          `${where}: the number "${read.text}" at ${[b.left, b.top, b.right, b.bottom].map((v) => v.toFixed(1)).join(", ")}, background ${JSON.stringify(read.background)} (film ${JSON.stringify(read.film)}), meets ${read.met.join(", ") || "no lettering"}; ${dot.count} copper px, their centre ${dot.centre?.map((v) => v.toFixed(1)).join(", ") ?? "none"}; the canvas's coverage at the number's centre ${onHull.toFixed(2)}. SwiftShader.`,
        );
        const film = read.film ?? [];
        expect
          .soft(
            Boolean(
              read.background?.every(
                (v, i) =>
                  Math.abs(v - (film[i] ?? Number.NaN)) <= (i < 3 ? 1 : 0.02),
              ),
            ),
            `the pencil number's background is the film, its chip, ${where}: ${JSON.stringify(read.background)}`,
          )
          .toBe(true);
        expect
          .soft(read.met, `lettering the pencil number's box meets ${where}`)
          .toEqual([]);
        expect(
          dot.centre,
          `the copper dot in the canvas ${where}`,
        ).not.toBeNull();
        if (dot.centre) {
          const [dx = 0, dy = 0] = dot.centre;
          expect
            .soft(
              dx >= b.left && dx <= b.right && dy >= b.top && dy <= b.bottom,
              `the pencil number's box holds the copper dot's centre (${dx.toFixed(1)}, ${dy.toFixed(1)}) ${where}`,
            )
            .toBe(false);
          // The control: the dot is on the plank, so the hull's coverage reads there, or "on the
          // hull" below would read nothing.
          const dotHull =
            model.alpha[Math.floor(dy) * model.image.width + Math.floor(dx)] ??
            0;
          expect
            .soft(
              dotHull,
              `the canvas's coverage at the copper dot's centre (the hull read's control) ${where}`,
            )
            .toBeGreaterThanOrEqual(0.5);
        }
        expect
          .soft(
            onHull,
            `the canvas's coverage at the pencil number's centre, on the hull at 0.5 or more, ${where}`,
          )
          .toBeGreaterThanOrEqual(0.5);
        expect.soft(run.errors, `console errors ${where}`).toEqual([]);
      } finally {
        await run.close();
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------

/** Presses a motion button in the shown slot with the real mouse. */
async function press(page: Page, label: "Full" | "Calm" | "Off") {
  const centre = await page.evaluate(
    ({ slot, label }) => {
      const b = [...document.querySelectorAll(`${slot} button`)].find(
        (el) =>
          (el.textContent ?? "").trim() === label &&
          el.getClientRects().length > 0,
      );
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    { slot: MOTION, label },
  );
  expect(centre, `the ${label} button to press`).not.toBeNull();
  if (centre) await page.mouse.click(centre.x, centre.y);
}

/**
 * B3.1's measure on a page held at `landed`: the canvas's silhouette against `.ln-outline` filled,
 * on the shown drawing, both read in the same page (B3.17's way), in CSS px.
 */
async function registration(page: Page, width: number, dpr: number) {
  const drawing = drawingAt(width);
  const planBox = await box(page, drawing);
  const geometry = await hullOf(page, drawing);
  if (!planBox || !geometry) return null;
  const clip = whole(planBox);
  const svg = await outlineCoverage(page, clip, drawing);
  const model = await modelCoverage(page, clip);
  const [w, h] = [model.image.width, model.image.height];
  const cut = Math.round((geometry.limit - clip.x) * dpr);
  const d = hausdorff(
    edges(svg.alpha, w, h),
    edges(model.alpha, w, h),
    w,
    h,
    cut,
  );
  return { max: d.max / dpr, p99: d.p99 / dpr, a: d.a, b: d.b, clip };
}

/** The canvas against the shown drawing's box, as B3.1 reads it: what's off, or nothing. */
async function misfit(page: Page, width: number) {
  const fit = await canvasFit(page);
  const drawing = drawingAt(width);
  if (!fit.buffer || !fit.css || !fit.plan || !fit.at || !fit.planAt)
    return [`no canvas or no ${drawing}`];
  const out: string[] = [];
  if (fit.drawing !== drawing)
    out.push(`the page shows ${fit.drawing}, not ${drawing}`);
  const ratio = capAt(width, fit.dpr);
  // Layout keeps lengths in 1/64 CSS px (B3.1).
  const layout = (1 / 64) * ratio + 1e-3;
  const [bw = 0, bh = 0] = fit.buffer;
  const [cw = 0, ch = 0] = fit.css;
  const [pw = 0, ph = 0] = fit.plan;
  if (!Number.isInteger(bw) || !Number.isInteger(bh))
    out.push(`buffer ${bw} x ${bh} isn't whole`);
  if (Math.abs(cw * ratio - bw) > layout || Math.abs(ch * ratio - bh) > layout)
    out.push(`buffer ${bw} x ${bh} isn't CSS ${cw} x ${ch} x ${ratio}`);
  if (Math.max(Math.abs(cw - pw), Math.abs(ch - ph)) > 1 / ratio + 1e-3)
    out.push(`CSS ${cw} x ${ch} is off ${fit.drawing}'s ${pw} x ${ph}`);
  const corner = Math.max(
    Math.abs((fit.at[0] ?? 0) - (fit.planAt[0] ?? 0)),
    Math.abs((fit.at[1] ?? 0) - (fit.planAt[1] ?? 0)),
  );
  if (corner > 1 / ratio + 1e-3)
    out.push(
      `the canvas's corner is ${corner.toFixed(3)} px off ${fit.drawing}'s`,
    );
  return out;
}

test("W4 the model lands on it: on Full at 1366 x 625 and 1536 x 715, at DPR 1 and 2, frame 1 registers on the shown drawing within B3.1's bounds (1.5 CSS px at DPR 1, 1.0 at DPR 2), and at rest the canvas is whole-pixel on the shown drawing's box", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const [width, height] of SHORT) {
    for (const dpr of [1, 2]) {
      const where = `${at(width, height)} at DPR ${dpr}`;
      const bound = dpr === 2 ? 1.0 : 1.5;
      const run = await openModel(browser, { width, height, dpr, clock: true });
      try {
        await run.goto();
        const state = await run.until(SHOWN, 4, FIRST);
        expect(
          state,
          `[data-model] held at landed on the clock, ${where}`,
        ).toBe("landed");
        const r = await registration(run.page, width, dpr);
        expect(r, `the shown drawing and its profile, ${where}`).not.toBeNull();
        if (r) {
          note(
            test.info(),
            "registration",
            `${where} on ${drawingAt(width)} ${JSON.stringify(r.clip)}: Hausdorff ${r.max.toFixed(2)} CSS px (p99 ${r.p99.toFixed(2)}), bound ${bound}. SwiftShader.`,
          );
          expect
            .soft(r.a, `the drawing's silhouette edge, ${where}`)
            .toBeGreaterThan(0);
          expect
            .soft(r.b, `the model's silhouette edge, ${where}`)
            .toBeGreaterThan(0);
          expect
            .soft(r.max, `frame 1 on .ln-outline (Hausdorff, CSS px), ${where}`)
            .toBeLessThanOrEqual(bound);
        }
        // At rest, as B3.1 reads the canvas: the loft runs out in real time.
        await run.page.clock.resume();
        await run.waitFor([...REST], 30_000);
        expect
          .soft(await misfit(run.page, width), `the canvas at rest, ${where}`)
          .toEqual([]);
        expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      } finally {
        await run.close();
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------

/** The model's silhouette at rest over the shown drawing's box, for comparing two rest frames. */
async function restSilhouette(page: Page, width: number) {
  const planBox = await box(page, drawingAt(width));
  if (!planBox) return null;
  const clip = whole(planBox);
  const model = await modelCoverage(page, clip);
  return {
    clip,
    alpha: model.alpha,
    w: model.image.width,
    h: model.image.height,
  };
}

/** Two rest frames' silhouettes, edge to edge (CSS px at DPR 1); NaN when the clips differ. */
function restDistance(
  a: Awaited<ReturnType<typeof restSilhouette>>,
  b: Awaited<ReturnType<typeof restSilhouette>>,
) {
  if (!a || !b || JSON.stringify(a.clip) !== JSON.stringify(b.clip))
    return Number.NaN;
  return hausdorff(edges(a.alpha, a.w, a.h), edges(b.alpha, b.w, b.h), a.w, a.h)
    .max;
}

/**
 * On the clock at rest: Calm, then Full, which replays the loft from frame 1 (B3.17), held at
 * landed for B3.1's measure, then run to rest. Returns the registration and the rest frame.
 */
async function replay(run: ModelRun, width: number) {
  await press(run.page, "Calm");
  await pause(150);
  await run.step(200);
  await press(run.page, "Full");
  await pause(150);
  const first = await run.until(
    SHOWN.filter((s) => s !== "settled"),
    4,
    20_000,
  );
  const r = first === "landed" ? await registration(run.page, width, 1) : null;
  await run.until([...REST], 50, 60_000);
  return { first, r, rest: await restSilhouette(run.page, width) };
}

test("W5 a resize refits it: on Full, loaded at 1440 x 900, resized to 1440 x 700 and back, with no reload; at 700 the first window holds items 1 to 4; at 900 W2's boxes are main's again within 0.5 px; after each step the canvas fits the shown drawing, the rest frame matches the one a replay settles on, and a replay's frame 1 registers within B3.1's bound; no layout shift without input", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const run = await openModel(browser, {
    width: 1440,
    height: 900,
    clock: true,
  });
  try {
    await run.goto();
    await motionReady(run.page);
    await run.until([...REST], 50, FIRST + 30_000);
    // A mark on this document: a reload or a navigation drops it.
    await run.page.evaluate(() => {
      (window as Window & { __w5?: number }).__w5 = 1;
    });
    const loaded = await run.page.evaluate(() => performance.timeOrigin);

    for (const height of [700, 900]) {
      const where = `after the resize to 1440 x ${height}`;
      await run.page.setViewportSize({ width: 1440, height });
      // The ResizeObserver fires in real time; the redraw waits for a frame on the clock.
      await pause(400);
      await run.step(100);
      await pause(200);
      expect
        .soft(await misfit(run.page, 1440), `the canvas ${where}`)
        .toEqual([]);
      const refit = await restSilhouette(run.page, 1440);

      if (height === 700) {
        const found = await firstWindow(run.page);
        expect
          .soft(
            found.outside,
            `items not wholly inside the first window ${where}`,
          )
          .toEqual([]);
        expect
          .soft(found.larger, `text as large as the h1 ${where}`)
          .toEqual([]);
      } else {
        // W2's boxes are read with WebGL refused; the model draws over them and moves none (B3.1).
        expect
          .soft(
            moved(await w2Boxes(run.page), MAIN_1440_900.default),
            `boxes that differ from main's at 1440 x 900 ${where} from 700`,
          )
          .toEqual([]);
      }

      const again = await replay(run, 1440);
      expect
        .soft(again.first, `the first state after Full ${where}`)
        .toBe("landed");
      expect(again.r, `frame 1's registration ${where}`).not.toBeNull();
      if (again.r) {
        note(
          test.info(),
          "registration",
          `${where}: frame 1 after Full, Hausdorff ${again.r.max.toFixed(2)} CSS px (p99 ${again.r.p99.toFixed(2)}), bound 1.5 at DPR 1. SwiftShader.`,
        );
        expect
          .soft(
            again.r.max,
            `frame 1 after Full on .ln-outline (CSS px) ${where}`,
          )
          .toBeLessThanOrEqual(1.5);
      }
      const drift = restDistance(refit, again.rest);
      note(
        test.info(),
        "refit",
        `${where}: the refitted rest frame against the replay's, ${drift.toFixed(2)} CSS px`,
      );
      expect
        .soft(
          drift,
          `the rest frame the resize refits to against the one a replay settles on (Hausdorff, CSS px) ${where}`,
        )
        .toBeLessThanOrEqual(1.5);
    }

    const still = await run.page.evaluate(() => ({
      mark: (window as Window & { __w5?: number }).__w5,
      origin: performance.timeOrigin,
      cls: (window as Window & { __cls?: number }).__cls,
    }));
    expect
      .soft(still.mark, "the document's mark after the resizes (no reload)")
      .toBe(1);
    expect
      .soft(still.origin, "the document's time origin (no reload)")
      .toBe(loaded);
    expect
      .soft(
        still.cls,
        "layout shift without input over the load and the resizes",
      )
      .toBe(0);
    expect.soft(run.errors, "console errors").toEqual([]);
  } finally {
    await run.close();
  }
});

// ---------------------------------------------------------------------------------------------

type Still = {
  atLoad: string[] | null;
  atTwo: string[] | null;
  events: string[];
};

/**
 * An init script: from the load event, the animations in the document outside `[data-model]` then
 * and 2 s later, and every animationstart and transitionrun outside it. Read in the page, since
 * the test's own reads land seconds late while the model builds (P5).
 */
function watchSheet() {
  const still: Still = { atLoad: null, atTwo: null, events: [] };
  (window as Window & { __sheet?: Still }).__sheet = still;
  const outside = (el: Element | null) => !el?.closest("[data-model]");
  const name = (el: Element | null) =>
    `<${el?.tagName.toLowerCase()}${el?.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}>`;
  const running = () =>
    document
      .getAnimations()
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target ?? null;
        return outside(target);
      })
      .map(
        (a) =>
          `${a.constructor.name} ${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? ""} on ${name((a.effect as KeyframeEffect | null)?.target ?? null)}`,
      );
  for (const type of ["animationstart", "transitionrun"])
    addEventListener(
      type,
      (event) => {
        const target = event.target as Element | null;
        if (outside(target)) still.events.push(`${type} on ${name(target)}`);
      },
      true,
    );
  addEventListener("load", () => {
    still.atLoad = running();
    setTimeout(() => {
      still.atTwo = running();
    }, 2000);
  });
}

test("W6 still, and the name first: at 1366 x 625 and 1536 x 715, B1.8's CLS read is 0 over load plus 2 s, nothing in the sheet outside [data-model] animates at load or 2 s later, and by B1.9's measurement at 4x CPU the LCP element is the h1", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  for (const [width, height] of SHORT) {
    const where = `at ${at(width, height)}`;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      await watchLayoutShift(page);
      await page.addInitScript(watchSheet);
      const response = await page.goto("/");
      expect(response?.status(), `status of / ${where}`).toBe(200);
      await expect(page.locator(PLAN), `the drawing ${where}`).toHaveCount(1);
      await page.waitForFunction(
        () => (window as Window & { __sheet?: Still }).__sheet?.atTwo !== null,
        undefined,
        { timeout: 20_000 },
      );
      await page.evaluate(() => document.fonts.ready);
      const read = await page.evaluate(() => ({
        cls: (window as Window & { __cls?: number }).__cls,
        sheet: (window as Window & { __sheet?: Still }).__sheet,
      }));
      expect.soft(read.cls, `layout shift over load plus 2 s ${where}`).toBe(0);
      expect
        .soft(read.sheet?.atLoad, `animations at load ${where}`)
        .toEqual([]);
      expect
        .soft(read.sheet?.atTwo, `animations 2 s after load ${where}`)
        .toEqual([]);
      expect
        .soft(read.sheet?.events, `animation or transition events ${where}`)
        .toEqual([]);

      const fresh = await context.newPage();
      const lcp = await measureLcp(fresh, "/");
      expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
      if (lcp) {
        note(
          test.info(),
          "lcp",
          `${where} at 4x CPU: <${lcp.tag}> "${lcp.text}" (${lcp.size} px²) at ${lcp.time.toFixed(0)} ms`,
        );
        expect
          .soft(
            lcp.tag === "h1" && lcp.inHeader,
            `LCP <${lcp.tag}> "${lcp.text}" is the h1 ${where}`,
          )
          .toBe(true);
      }
    } finally {
      await context.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------

/** B1.8's print and forced-colours reads: the drawing, its strokes, and every fact shown. */
function keeps(page: Page) {
  return page.evaluate(
    ({ plan, block, caption }) => {
      const seen = (el: Element | null) =>
        Boolean(
          el?.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          }) && el.getClientRects().length > 0,
        );
      const drawing = document.querySelector(plan);
      const facts = [
        "revisions",
        "work",
        "projects",
        "stack",
        "education",
        "contact",
      ].map((id) => document.querySelector(`section[aria-labelledby="${id}"]`));
      const header = document.querySelector("main > header");
      const label = (el: Element) =>
        `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      const strokes = [
        ...(drawing?.querySelectorAll(
          "path, line, polyline, polygon, rect, circle, ellipse",
        ) ?? []),
      ]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => getComputedStyle(el))
        .filter(
          (s) => s.stroke !== "none" && Number.parseFloat(s.strokeWidth) > 0,
        )
        .map((s) => s.stroke);
      return {
        plan: seen(drawing),
        planks: [...(drawing?.querySelectorAll("[data-plank]") ?? [])].filter(
          seen,
        ).length,
        page: getComputedStyle(document.body).backgroundColor,
        strokes,
        hidden: [
          ...(seen(header) ? [] : ["main > header"]),
          ...[...(header?.querySelectorAll("h1, p, a") ?? [])]
            .filter((el) => !seen(el))
            .map(label),
          ...[document.querySelector(block), document.querySelector(caption)]
            .filter((el) => !seen(el))
            .map((el) => (el ? label(el) : "(missing dl or caption)")),
          ...[
            ...(document.querySelector(block)?.querySelectorAll("dt, dd") ??
              []),
          ]
            .filter((el) => !seen(el))
            .map(label),
          ...facts.flatMap((s, i) => (seen(s) ? [] : [`section ${i}`])),
          ...facts.flatMap((s) =>
            [...(s?.querySelectorAll("li, tr, p, h3") ?? [])]
              .filter((el) => !seen(el))
              .map(label),
          ),
        ],
      };
    },
    { plan: PLAN, block: BLOCK, caption: CAPTION_P },
  );
}

/** Every shown element's box outside `[data-model]`, in document order, as the page lays it out. */
function layout(page: Page) {
  return page.evaluate(() =>
    [...document.body.querySelectorAll("*")]
      .filter(
        (el) =>
          !el.closest("[data-model], script, style, template, noscript") &&
          el.getClientRects().length > 0,
      )
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 20)}"`,
          box: [r.left, r.top + scrollY, r.width, r.height],
        };
      }),
  );
}

/** Where two layouts differ by more than 0.5 px, or in what they hold. */
function layoutDiff(
  a: Awaited<ReturnType<typeof layout>>,
  b: Awaited<ReturnType<typeof layout>>,
) {
  if (a.length !== b.length)
    return [`${a.length} shown elements against ${b.length}`];
  const out: string[] = [];
  for (const [i, x] of a.entries()) {
    const y = b[i];
    if (
      !y ||
      x.el !== y.el ||
      x.box.some((v, k) => Math.abs(v - (y.box[k] ?? Number.NaN)) > 0.5)
    )
      out.push(
        `${x.el} ${JSON.stringify(x.box)} against ${y?.el} ${JSON.stringify(y?.box)}`,
      );
  }
  return out.slice(0, 12);
}

/** A page of the given mode at a size, at rest (or, on Off, with its control in). */
async function inMode(
  browser: Browser,
  width: number,
  height: number,
  mode: "full" | "calm" | "off",
) {
  const run = await openModel(browser, { width, height, stored: mode });
  await run.goto();
  await motionReady(run.page);
  if (mode !== "off") await run.waitFor([...REST], FIRST);
  await pause(300);
  return run;
}

test("W7 the sweeps at the new windows: at 1366 x 625 and 1536 x 715, light and dark, axe with B4.24's strict tags is clean and nothing overflows sideways (WebGL refused); in forced colours and in print the sheet keeps the drawing and every fact; Calm and Off lay the sheet out as Full does, within 0.5 px, the canvas aside", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const [width, height] of SHORT) {
    const size = at(width, height);
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({ colorScheme: scheme });
      await context.addInitScript(installRgba);
      await context.addInitScript(refuseWebGl);
      const page = await context.newPage();
      try {
        const where = `at ${size}, ${scheme}`;
        await openHome(page, width, height);
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
        expect
          .soft(await horizontalOverflow(page), `page overflow ${where}`)
          .toBe(0);
      } finally {
        await context.close();
      }

      // Print and forced colours as B1.8 reads them: with the model loading, as a visitor's page.
      const shown = await browser.newContext({
        colorScheme: scheme,
        viewport: { width, height },
      });
      const sheet = await shown.newPage();
      try {
        // "Keeps" against the screen at the same window: what it shows, print and forced colours
        // show too (below 1440 the screen hides p[data-crew-key], Wc's to show).
        await openHome(sheet, width, height);
        const onScreen = new Set((await keeps(sheet)).hidden);
        const lost = (hidden: string[]) =>
          hidden.filter((h) => !onScreen.has(h));
        await sheet.emulateMedia({ media: "print" });
        await openHome(sheet, width, height);
        const printed = await keeps(sheet);
        const inPrint = `in print at ${size}, ${scheme}`;
        expect.soft(printed.plan, `the drawing ${inPrint}`).toBe(true);
        expect.soft(printed.planks, `planks ${inPrint}`).toBeGreaterThan(0);
        expect
          .soft(
            lost(printed.hidden),
            `facts the screen shows, hidden ${inPrint}`,
          )
          .toEqual([]);

        await sheet.emulateMedia({ media: "screen", forcedColors: "active" });
        await openHome(sheet, width, height);
        const forced = await keeps(sheet);
        const inForced = `in forced colours at ${size}, ${scheme}`;
        expect.soft(forced.plan, `the drawing ${inForced}`).toBe(true);
        expect.soft(forced.planks, `planks ${inForced}`).toBeGreaterThan(0);
        expect
          .soft(forced.strokes.length, `stroked lines ${inForced}`)
          .toBeGreaterThan(0);
        expect
          .soft(
            [
              ...new Set(
                forced.strokes.filter(
                  (s) =>
                    s === forced.page ||
                    s === "transparent" ||
                    s === "rgba(0, 0, 0, 0)",
                ),
              ),
            ],
            `strokes that vanish into the page (${forced.page}) ${inForced}`,
          )
          .toEqual([]);
        expect
          .soft(
            lost(forced.hidden),
            `facts the screen shows, hidden ${inForced}`,
          )
          .toEqual([]);
      } finally {
        await shown.close();
      }
    }

    // The modes: one page each, read in both schemes (a scheme moves no box).
    const runs = {
      full: await inMode(browser, width, height, "full"),
      calm: await inMode(browser, width, height, "calm"),
      off: await inMode(browser, width, height, "off"),
    };
    try {
      for (const scheme of SCHEMES) {
        const read: Record<string, Awaited<ReturnType<typeof layout>>> = {};
        for (const [mode, run] of Object.entries(runs)) {
          await run.page.emulateMedia({ colorScheme: scheme });
          read[mode] = await layout(run.page);
        }
        expect
          .soft(read.full?.length ?? 0, `shown elements on Full at ${size}`)
          .toBeGreaterThan(0);
        for (const mode of ["calm", "off"])
          expect
            .soft(
              layoutDiff(read[mode] ?? [], read.full ?? []),
              `${mode === "calm" ? "Calm" : "Off"}'s layout against Full's at ${size}, ${scheme}`,
            )
            .toEqual([]);
      }
    } finally {
      for (const run of Object.values(runs)) await run.close();
    }
  }
});
