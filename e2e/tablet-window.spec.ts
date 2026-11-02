import { expect, type Page } from "@playwright/test";
import { crewOf, crewTest as test } from "./crew-feed";
import { firstScreen, insideViewport, textSizes } from "./first-screen";
import { installRgba, measureLcp, SCHEMES, watchLayoutShift } from "./helpers";
import { drawingAt, FIRST, note, pause, SHOWN } from "./model";
import { PLAN } from "./plan";
import { openModel, refuseWebGl } from "./webgl";
import {
  at,
  BLOCK,
  DEFAULT_SERVER,
  drawingReads,
  FIXTURES,
  FIXTURES_NEED_BUILD,
  LETTERING,
  openHome,
  reachHome,
  registration,
  shownOn,
} from "./window";

// Sprint 45, Wc: the sheet fits a tablet window, and the key shows (.crew/sprint/45/contract.md,
// W13 to W17), written before the build. From 1024 to 1279 the first window holds the name, the
// role, the lead, the contact links and the particulars; from 1024 to 1439 the crew key shows under
// the revisions; the drawing stays whole and the model lands; nothing shifts. Each check reads the
// contract's hooks wherever Iris places them, through Wa's and Wb's reads (e2e/window.ts): the first
// screen through B1.1's (e2e/first-screen.ts), the feed states through B4.22's harness (the kept
// `home-*` sites), the model through B3.1's measure, CLS through B1.8's read and LCP through B1.9's
// measurement (e2e/helpers.ts). The 2D reads refuse WebGL (sprint 25: the model's data-state
// restyles the drawing from 1024 px); W16's model clause and W17 run the model.

/** W13's windows: the facts and the particulars held (the contract's "The windows", word for word). */
const FACTS_WINDOWS = [
  [1024, 640],
  [1024, 768],
  [1180, 740],
] as const;
/** W14's windows: the key held in the first window with items 1 and 2. */
const KEY_WINDOWS = [
  [1280, 680],
  [1366, 625],
  [1024, 768],
] as const;
/** W14's widths where the key must show, each read at a short and a tall height ("any height"). */
const KEY_WIDTHS = [1024, 1180, 1280, 1366, 1439] as const;
const KEY_HEIGHTS = [640, 900] as const;
/** And every width between, by this step, resized in one page (the contract's "1024 to 1439"). */
const KEY_SWEEP = { from: 1024, to: 1439, step: 8, height: 900 } as const;

/**
 * The margin (the contract: "W1's, Probe states it"): none. W1 reads B1.1's rule, wholly inside
 * the viewport to half a pixel, and so do W13 and W14.
 */
const MARGIN = 0;

/**
 * Iris's floor for the drawing's height at 1024 to 1279, in CSS px, measured on `[data-plan]`'s box
 * as W3 does. Wa's 240 px (.crew/sprint/43/placement.md, "The floor") until Iris states Wc's
 * (.crew/sprint/45/contract.md, "Placement is Iris's call"); W16 reports the shown drawing's beside it.
 */
const DRAWING_FLOOR_PX = 240;

const KEY = "p[data-crew-key]";
/** This spec's key for the fixtures' first reads (e2e/window.ts, reachHome). */
const SPEC = "tablet-window";

type State = { base: string; where: string };

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

/** Wholly inside the viewport less the margin, B1.1's half pixel of rounding. */
const held = (
  b: { left: number; top: number; right: number; bottom: number } | null,
  viewport: { width: number; height: number },
) =>
  insideViewport(b, {
    width: viewport.width,
    height: viewport.height - MARGIN,
  });

/** A box's edges in the page, or null. */
function boxOf(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el || el.getClientRects().length === 0) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }, selector);
}

/**
 * The contract's list against the first window: item 1 (B1.1's reads), item 2 (the dl, whole), item
 * 3 (the key, whole) where `withKey`, and item 4 (the h1 the largest text).
 */
async function tabletWindow(page: Page, withKey: boolean) {
  const found = await firstScreen(page);
  const items = [
    ...found.items,
    { what: `${BLOCK}, whole`, box: await boxOf(page, BLOCK) },
    ...(withKey
      ? [{ what: `${KEY}, whole`, box: await boxOf(page, KEY) }]
      : []),
  ];
  const sizes = await textSizes(page);
  return {
    outside: items
      .filter(({ box }) => !held(box, found.viewport))
      .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
    lowest: Math.max(...items.map(({ box }) => box?.bottom ?? Infinity)),
    h1: sizes.h1,
    larger: sizes.others.filter(({ size }) => size >= sizes.h1),
  };
}

// ---------------------------------------------------------------------------------------------
// W14's read of the key itself.

/**
 * The key as painted: rendered (a box, visible, at full opacity), its text's lines, anything that
 * clips its text (an ancestor or itself with overflow other than visible, or a line clamp), and every
 * other shown text whose line boxes meet its own. Lines are the text's client rects grouped by
 * vertical overlap; boxes meet when they overlap by more than half a pixel each way.
 */
function keyRead(page: Page) {
  return page.evaluate((key) => {
    const p = document.querySelector(key);
    if (!p) return null;
    type R = { left: number; top: number; right: number; bottom: number };
    const edges = (r: DOMRect | DOMRectReadOnly): R => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    });
    const rectsOf = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map(edges);
    };
    const meets = (a: R, b: R) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    const inside = (a: R, b: R) =>
      a.left >= b.left - 0.5 &&
      a.top >= b.top - 0.5 &&
      a.right <= b.right + 0.5 &&
      a.bottom <= b.bottom + 0.5;
    const box = p.getBoundingClientRect();
    let opacity = 1;
    for (let a: Element | null = p; a; a = a.parentElement)
      opacity *= Number.parseFloat(getComputedStyle(a).opacity);
    const rendered =
      p.getClientRects().length > 0 &&
      box.width >= 2 &&
      box.height >= 2 &&
      p.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      opacity >= 0.99;
    const text = (p.textContent ?? "").replace(/\s+/g, " ").trim();
    const own = rectsOf(p);
    const lines: R[] = [];
    for (const r of [...own].sort((a, b) => a.top - b.top)) {
      const mid = (r.top + r.bottom) / 2;
      const line = lines.find((l) => mid >= l.top && mid <= l.bottom);
      if (line) {
        line.left = Math.min(line.left, r.left);
        line.right = Math.max(line.right, r.right);
        line.top = Math.min(line.top, r.top);
        line.bottom = Math.max(line.bottom, r.bottom);
      } else lines.push({ ...r });
    }
    const clipped: string[] = [];
    for (let a: Element | null = p; a; a = a.parentElement) {
      const s = getComputedStyle(a);
      const name = `<${a.tagName.toLowerCase()}${a.className && typeof a.className === "string" ? `.${a.className.split(" ")[0]}` : ""}>`;
      if (s.clipPath !== "none" || (s.clip !== "auto" && s.clip !== ""))
        clipped.push(`${name} has clip ${s.clipPath} ${s.clip}`);
      const lineClamp = s.getPropertyValue("-webkit-line-clamp");
      if (lineClamp && lineClamp !== "none")
        clipped.push(`${name} clamps lines (${lineClamp})`);
      if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const frame = edges(a.getBoundingClientRect());
      const out = own.filter((r) => !inside(r, frame));
      if (out.length > 0)
        clipped.push(
          `${name} (overflow ${s.overflowX} ${s.overflowY}) cuts ${out.length} of the key's text rects`,
        );
      if (
        a === p &&
        (p.scrollWidth > p.clientWidth + 1 ||
          p.scrollHeight > p.clientHeight + 1)
      )
        clipped.push(
          `the key scrolls inside itself (${p.scrollWidth} x ${p.scrollHeight} in ${p.clientWidth} x ${p.clientHeight})`,
        );
    }
    // Every other shown text on the page, by its line boxes cut by what clips them (a visually
    // hidden head's text reports boxes far outside its 1 px clip: STATE.md, sprint 30).
    const cutBy = (el: Element, r: R): R | null => {
      let out = { ...r };
      for (let a: Element | null = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.clip !== "auto" && s.clip !== "") return null;
        if (s.overflowX === "visible" && s.overflowY === "visible") continue;
        const f = a.getBoundingClientRect();
        out = {
          left: Math.max(out.left, f.left),
          top: Math.max(out.top, f.top),
          right: Math.min(out.right, f.right),
          bottom: Math.min(out.bottom, f.bottom),
        };
        if (out.right <= out.left || out.bottom <= out.top) return null;
      }
      return out;
    };
    const met: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || p.contains(n)) continue;
      if ((n.textContent ?? "").trim() === "") continue;
      if (el.closest("script, style, template, noscript")) continue;
      if (
        !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      )
        continue;
      const hit = rectsOf(n)
        .map((r) => cutBy(el, r))
        .find((r) => r !== null && lines.some((l) => meets(r, l)));
      if (hit)
        met.push(
          `<${el.tagName.toLowerCase()}> "${(n.textContent ?? "").trim().slice(0, 30)}" at ${[hit.left, hit.top, hit.right, hit.bottom].map((v) => v.toFixed(1)).join(", ")}`,
        );
    }
    return {
      rendered,
      text,
      lines: lines.length,
      box: edges(box),
      clipped,
      met,
    };
  }, KEY);
}

/** W14's render clause on a read, soft. */
function expectKeyShows(
  read: Awaited<ReturnType<typeof keyRead>>,
  where: string,
) {
  expect.soft(read, `${KEY} in the page ${where}`).not.toBeNull();
  if (!read) return;
  expect
    .soft(read.rendered, `${KEY} rendered, visible at full opacity ${where}`)
    .toBe(true);
  expect.soft(read.text.length, `${KEY}'s text ${where}`).toBeGreaterThan(0);
  expect
    .soft(
      read.lines >= 1 && read.lines <= 2,
      `${KEY} on one or two lines ${where}: ${read.lines}`,
    )
    .toBe(true);
  expect.soft(read.clipped, `what clips ${KEY}'s text ${where}`).toEqual([]);
  expect.soft(read.met, `text boxes ${KEY} meets ${where}`).toEqual([]);
}

// ---------------------------------------------------------------------------------------------
// W13 and W14 read the feed's fixtures: one worker, in order, as the feed specs run (STATE.md). The
// default server's passes run wherever the suite does, a deployment under PLAYWRIGHT_BASE_URL
// included; only the fixtures' passes need this checkout's build (W15).

const W13 =
  "W13 the tablet window holds the facts: at 1024 x 640, 1024 x 768 and 1180 x 740, light and dark, on the default server and the live, open and resting fixtures, WebGL refused, the h1, the headline, the bio's lead, the three contact links and dl[data-particulars] are wholly inside the viewport (W1's margin, none), and the h1 is the largest text";

async function w13(page: Page, states: State[]) {
  await page.context().addInitScript(refuseWebGl);
  const lowest = new Map<string, number>();
  for (const { base, where: site } of states) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const [width, height] of FACTS_WINDOWS) {
        await openHome(page, width, height, base);
        const k = at(width, height);
        const where = `on ${site} at ${k}, ${scheme}`;
        const found = await tabletWindow(page, false);
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
        lowest.set(k, Math.max(lowest.get(k) ?? 0, found.lowest));
      }
    }
  }
  note(
    test.info(),
    "lowest item",
    [...lowest].map(([k, bottom]) => `${k}: ${bottom.toFixed(1)}`).join("; "),
  );
}

const W14 =
  "W14 the key shows: at 1024, 1180, 1280, 1366 and 1439 wide (640 and 900 tall, and every 8 px from 1024 to 1439 resized), p[data-crew-key] is rendered, its text on one or two lines, clipped by no overflow, and meeting no other text box; at 1280 x 680, 1366 x 625 and 1024 x 768, on the default server and the live, open and resting fixtures, WebGL refused, it is wholly inside the viewport with the h1, the headline, the bio's lead, the three contact links and dl[data-particulars]";

/** W14's first-window clause, and the render clause, at its windows on each of `states`. */
async function w14Windows(page: Page, states: State[]) {
  const lowest = new Map<string, number>();
  for (const { base, where: site } of states) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const [width, height] of KEY_WINDOWS) {
        await openHome(page, width, height, base);
        const k = at(width, height);
        const where = `on ${site} at ${k}, ${scheme}`;
        const found = await tabletWindow(page, true);
        expect
          .soft(
            found.outside,
            `items not wholly inside the first window ${where}`,
          )
          .toEqual([]);
        expectKeyShows(await keyRead(page), where);
        lowest.set(k, Math.max(lowest.get(k) ?? 0, found.lowest));
      }
    }
  }
  note(
    test.info(),
    "lowest item",
    [...lowest].map(([k, bottom]) => `${k}: ${bottom.toFixed(1)}`).join("; "),
  );
}

test(`${W13} (the default server's pass)`, async ({ page }) => {
  test.setTimeout(90_000);
  await w13(page, [DEFAULT_SERVER]);
});

test(`${W14} (the default server's pass)`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.context().addInitScript(refuseWebGl);
  const lines: string[] = [];
  for (const width of KEY_WIDTHS)
    for (const height of KEY_HEIGHTS) {
      await openHome(page, width, height);
      const where = `on the default server at ${at(width, height)}`;
      const read = await keyRead(page);
      expectKeyShows(read, where);
      if (read) lines.push(`${at(width, height)}: ${read.lines}`);
    }
  note(test.info(), "key lines", lines.join("; "));

  // Every width between, in one page resized as a visitor drags the window's edge.
  await openHome(page, KEY_SWEEP.from, KEY_SWEEP.height);
  const swept: string[] = [];
  for (
    let width = KEY_SWEEP.from;
    width <= KEY_SWEEP.to;
    width += KEY_SWEEP.step
  ) {
    await page.setViewportSize({ width, height: KEY_SWEEP.height });
    const read = await keyRead(page);
    const ok =
      read?.rendered &&
      read.lines >= 1 &&
      read.lines <= 2 &&
      read.clipped.length === 0 &&
      read.met.length === 0;
    if (!ok)
      swept.push(
        `${width}: ${read ? JSON.stringify({ rendered: read.rendered, lines: read.lines, clipped: read.clipped, met: read.met }) : "no key"}`,
      );
  }
  expect
    .soft(
      swept,
      `widths from ${KEY_SWEEP.from} to ${KEY_SWEEP.to} (every ${KEY_SWEEP.step} px, ${KEY_SWEEP.height} tall, resized) where ${KEY} isn't rendered whole on one or two lines, clear of other text`,
    )
    .toEqual([]);

  await w14Windows(page, [DEFAULT_SERVER]);
});

test.describe("on the feed's fixtures", () => {
  test.describe.configure({ mode: "default" });
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), FIXTURES_NEED_BUILD);
  // The three sites start together, once per worker.
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reachHome(crew, fixture, SPEC);
  });

  test(`${W13} (the fixtures' pass)`, async ({ page, crew }) => {
    test.setTimeout(240_000);
    const states: State[] = [];
    for (const fixture of FIXTURES)
      states.push(await shownOn(crew, fixture, SPEC));
    await w13(page, states);
  });

  test(`${W14} (the fixtures' pass)`, async ({ page, crew }) => {
    test.setTimeout(240_000);
    await page.context().addInitScript(refuseWebGl);
    const states: State[] = [];
    for (const fixture of FIXTURES)
      states.push(await shownOn(crew, fixture, SPEC));
    await w14Windows(page, states);
  });
});

// ---------------------------------------------------------------------------------------------

test(`W16 the drawing stays whole, and the model lands: at 1024 x 640, 1024 x 768 and 1180 x 740, WebGL refused, every shown [data-plan] [data-plank] and lettering span lies inside [data-plan]'s box and the viewport, clipped by no overflow; the dl meets no plank box grown by 24 px and no lettering box; [data-plan]'s box is at least Iris's floor (${DRAWING_FLOOR_PX} px) tall, each window's height reported; on Full at 1024 x 640, DPR 1 and 2, frame 1 registers on the shown drawing within B3.1's bounds (1.5 CSS px at DPR 1, 1.0 at DPR 2)`, async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  await page.context().addInitScript(refuseWebGl);
  const heights: string[] = [];
  for (const [width, height] of FACTS_WINDOWS) {
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

  for (const dpr of [1, 2]) {
    const where = `1024 x 640 at DPR ${dpr}`;
    const bound = dpr === 2 ? 1.0 : 1.5;
    const run = await openModel(browser, {
      width: 1024,
      height: 640,
      dpr,
      clock: true,
    });
    try {
      await run.goto();
      const state = await run.until(SHOWN, 4, FIRST);
      expect(state, `[data-model] held at landed on the clock, ${where}`).toBe(
        "landed",
      );
      const r = await registration(run.page, 1024, dpr);
      expect(r, `the shown drawing and its profile, ${where}`).not.toBeNull();
      if (r) {
        note(
          test.info(),
          "registration",
          `${where} on ${drawingAt(1024)} ${JSON.stringify(r.clip)}: Hausdorff ${r.max.toFixed(2)} CSS px (p99 ${r.p99.toFixed(2)}), bound ${bound}. SwiftShader.`,
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
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    } finally {
      await run.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------

/**
 * Every layout-shift entry, raw: the ones B1.8's read counts (no recent input) and the ones it can't
 * see (flagged hadRecentInput, which Chromium sets on the shifts a viewport resize causes,
 * .crew/sprint/44/placement.md, "Still"). Reported beside B1.8's read, never asserted: a resize's
 * own relayout is the window changing, not the page shifting under the reader.
 */
function recordRawShifts() {
  const w = window as Window & {
    __raw?: { value: number; input: boolean; at: number }[];
  };
  w.__raw = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      w.__raw?.push({
        value: shift.value,
        input: shift.hadRecentInput,
        at: shift.startTime,
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
}

test("W17 still, and the name first: by B1.8's read, CLS 0 over load plus 2 s at 1024 x 640 and 1180 x 740 with the model loading, and through a resize from 1024 x 768 to 1024 x 640 and back with no input (a read that can't see a shift flagged hadRecentInput, as Chromium flags a resize's; the raw entries are reported); by B1.9's measurement at 4x CPU the LCP element is the h1 at 1024 x 640", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const raw: string[] = [];
  const rawOf = async (page: Page) => {
    const entries = await page.evaluate(
      () =>
        (
          window as Window & {
            __raw?: { value: number; input: boolean; at: number }[];
          }
        ).__raw ?? [],
    );
    const sum = (input: boolean) =>
      entries
        .filter((e) => e.input === input)
        .reduce((s, e) => s + e.value, 0)
        .toFixed(4);
    return `${entries.length} entries, ${sum(false)} without recent input, ${sum(true)} flagged hadRecentInput`;
  };
  for (const [width, height] of [
    [1024, 640],
    [1180, 740],
    [1024, 768],
  ] as const) {
    const where = `at ${at(width, height)}`;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "no-preference",
    });
    try {
      const page = await context.newPage();
      await watchLayoutShift(page);
      await page.addInitScript(recordRawShifts);
      const response = await page.goto("/");
      expect(response?.status(), `status of / ${where}`).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await pause(2000);
      const cls = () =>
        page.evaluate(() => (window as Window & { __cls?: number }).__cls);
      expect
        .soft(await cls(), `layout shift over load plus 2 s ${where}`)
        .toBe(0);
      raw.push(`load ${where}: ${await rawOf(page)}`);

      if (height === 768) {
        // A window dragged shorter and back, no input: B1.8's read counts what the page does after.
        for (const h of [640, 768]) {
          await page.setViewportSize({ width, height: h });
          await pause(1000);
        }
        expect
          .soft(
            await cls(),
            "layout shift not flagged hadRecentInput through the resize from 1024 x 768 to 1024 x 640 and back",
          )
          .toBe(0);
        raw.push(`through the resize: ${await rawOf(page)}`);
      }
    } finally {
      await context.close();
    }
  }
  note(test.info(), "raw shifts (reported)", raw.join("; "));

  const context = await browser.newContext({
    viewport: { width: 1024, height: 640 },
    reducedMotion: "no-preference",
  });
  try {
    const lcp = await measureLcp(await context.newPage(), "/");
    expect(lcp, "an LCP candidate at 1024 x 640").not.toBeNull();
    if (lcp) {
      note(
        test.info(),
        "lcp",
        `1024 x 640 at 4x CPU: <${lcp.tag}> "${lcp.text}" (${lcp.size} px²) at ${lcp.time.toFixed(0)} ms`,
      );
      expect
        .soft(
          lcp.tag === "h1" && lcp.inHeader,
          `LCP <${lcp.tag}> "${lcp.text}" is the h1 at 1024 x 640`,
        )
        .toBe(true);
    }
  } finally {
    await context.close();
  }
});
