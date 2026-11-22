import { type Browser, expect, type Page, test } from "@playwright/test";
import { FIXTURE_STUDIO, feedOf, livePage, toAnswer } from "./crew-live";
import { ENTRY, press, REPLAY, untilPlayed } from "./crew-replay";
import { contextOf, setDefaultFont } from "./reader-font";

// Sprint 81 (.crew/sprint/81/contract.md, T41): the bar clears what it jumps to. From 64rem wide
// the bar is 3.5rem tall (components/bar.tsx, `lg:h-14`), but app/globals.css set html's
// scroll-padding-top to 56 px there, so at a reader's large default font a fragment's target and a
// focused link landed under the bar. Atlas measured `/#work` on production on 2026-11-20 landing
// at 56 with the bar ending at 70 (1440 x 900 and 1920 x 1200 at 20 px), 84 (24) and 98 (28).
//
// T41a: each fragment link's target lands with its top at or below the bar's bottom (and inside the
// window), loaded from the address and followed by a click. The contract's targets, plus the
// keel's link to /log#every-revision, the one other fragment link the site has. /read has no bar,
// so there its bar's bottom is the window's top. /crew#replay is there only at rest with a replay
// offered, so its two reads run on the default server's /crew with `/api/crew` answering the
// resting fixture with crew-replay.ts's REPLAY (crew-live.ts's livePage), the entry pressed or the
// page arriving at the address, as the visitor's press on / does.
//
// T41b: on /, /crew and /log, from main's focus, Tab through every stop to the page's end, then
// Shift+Tab back up to the bar. Each stop outside the bar that wasn't in the first screen at load
// (its box below the first window) has its box, its focus ring included (the outline's width and
// offset), starting at or below the bar's bottom. Every stop counts, buttons too: a button under
// the bar is the same defect as a link. Atlas's call (sprint 81): the ring is the contract's, so
// this is red at 16 px on main too, by the ring's 4 px, where Shift+Tab aligns a box to 56.
//
// T41c: at a 16 px default font nothing moves: html's computed scroll-padding-top is main's 56px
// at every window (all are 64rem wide or more at 16 px), and every target lands where it does on
// main, its top at LANDED below the window's top, or, where the page can't scroll that far (at
// its top or its end), at least that far down with the scroll at that limit, as on main.
//
// Sampled, to keep the spec near five test-minutes: T41a reads the contract's six windows (1024 x
// 768 to 2560 x 1440) at 16, 20, 24 and 28 px, every target both ways. T41b walks every Tab stop
// at four of them, which still meet each font on both sides of the 64rem bound (1024 is under it
// from 20 px, 1536 is on it at 24 and under it at 28, 1920 and 2560 are over it from 20): /log's 93
// stops each way are most of its time. T41c reads the budget's three (1024 x 768, 1440 x 900 and
// 1920 x 1080). One test per check and font, one context per font, a fresh load (from
// about:blank) per address. 1 px of slack is sub-pixel rounding (main reads 55.5 to 56.4 against
// a 56 px bar), never a visible overlap.

const WINDOWS = [
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
] as const;
const WALKED = [WINDOWS[0], WINDOWS[3], WINDOWS[4], WINDOWS[5]] as const;
const PINNED = [WINDOWS[0], WINDOWS[2], WINDOWS[4]] as const;
/** The default font, Chrome's Large and Very large, and 28 past them; 16 first, the baseline. */
const SIZES = [16, 20, 24, 28] as const;
const BAR = 'header:has(nav[aria-label="Main"])';
const SLACK = 1;
const RESTING = toAnswer(
  feedOf("resting", { last: { replay: REPLAY } }),
  FIXTURE_STUDIO,
);

/** Each target's top below the window's top on main at 16 px, recorded at commit 3e02757. */
const LANDED: Record<string, number> = {
  "/#work": 56,
  "/#contact": 56,
  "/#case-studies": 56,
  "/#main": 56,
  // The keel's h2 adds its rule, padding and 16 px (scroll-margin-top 42 from 1024).
  "/crew#keel": 98,
  // The Activity block adds 16 px (scroll-margin-top).
  "/crew#replay": 72,
  "/log#every-revision": 56,
  "/read#main": 56,
  "/read#work": 56,
  "/read#case-studies": 56,
};

/** Loaded from the address, each a fresh document. /crew#replay is read on its own page. */
const ADDRESSES = [
  "/#work",
  "/#contact",
  "/#case-studies",
  "/#main",
  "/crew#keel",
  "/log#every-revision",
  "/read#main",
  "/read#work",
  "/read#case-studies",
] as const;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

type Landing = {
  /** The address and how it was reached. */
  how: string;
  /** The landing's key in LANDED. */
  key: string;
  found: boolean;
  top: number;
  /** The bar's bottom, or 0 where the page has no bar. */
  bar: number;
  hasBar: boolean;
  y: number;
  end: number;
  height: number;
  root: string;
  pad: string;
};

/** Where `target` lies now, against the bar, once the fonts are in and the page has settled. */
async function landing(
  page: Page,
  key: string,
  how: string,
  clocked = false,
): Promise<Landing> {
  await page.evaluate(() => document.fonts.ready);
  // A paused clock (livePage) gives no frames, so settle in real time there.
  if (clocked) await sleep(400);
  else
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
  const target = `#${key.split("#")[1]}`;
  const read = await page.evaluate(
    ([target, bar]) => {
      const t = document.querySelector(target);
      const b = document.querySelector(bar);
      const root = document.documentElement;
      return {
        found: Boolean(t),
        top: t ? t.getBoundingClientRect().top : Number.NaN,
        bar: b ? b.getBoundingClientRect().bottom : 0,
        hasBar: Boolean(b),
        y: scrollY,
        end: root.scrollHeight - innerHeight,
        height: innerHeight,
        root: getComputedStyle(root).fontSize,
        pad: getComputedStyle(root).scrollPaddingTop,
      };
    },
    [target, BAR] as const,
  );
  return { how, key, ...read };
}

/** A fresh document at `url`. */
async function load(page: Page, url: string) {
  await page.goto("about:blank");
  const response = await page.goto(url);
  return response?.status();
}

/** Back to the page's top, then a click on the first shown `selector`, as a visitor's. */
async function follow(page: Page, selector: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const link = page.locator(selector).filter({ visible: true }).first();
  return link
    .click({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
}

/** The skip link reached by the first Tab of a fresh load, then Enter. */
async function skip(page: Page) {
  await page.keyboard.press("Tab");
  const on = await page.evaluate(
    () => document.activeElement?.getAttribute("href") ?? null,
  );
  if (on !== "#main") return false;
  await page.keyboard.press("Enter");
  return true;
}

/** Every landing at one window and font: each address loaded, then each link followed. */
async function landings(browser: Browser, size: number, w: number, h: number) {
  const { context, page } = await contextOf(browser, { width: w, height: h });
  const read: Landing[] = [];
  const missed: string[] = [];
  try {
    await setDefaultFont(context, page, size);
    for (const url of ADDRESSES) {
      const status = await load(page, url);
      if (status !== 200) missed.push(`${url} answered ${status}`);
      read.push(await landing(page, url, `${url} loaded from the address`));
    }
    // Followed: the skip link first, from a fresh load's first Tab, then the page's own links.
    const clicks: [string, string, string][] = [
      ["/", 'header nav a[href="#work"]', "/#work"],
      ["/", 'header nav a[href="#contact"]', "/#contact"],
      ["/", 'main a[href="#case-studies"]', "/#case-studies"],
      ["/crew", 'main a[href="#keel"]', "/crew#keel"],
    ];
    for (const route of ["/", "/read"]) {
      await load(page, route);
      if (await skip(page))
        read.push(
          await landing(
            page,
            route === "/" ? "/#main" : "/read#main",
            `${route}'s skip link followed`,
          ),
        );
      else missed.push(`${route}: the first Tab isn't the skip link`);
      if (route === "/")
        for (const [, selector, target] of clicks.filter(([r]) => r === "/"))
          if (await follow(page, selector))
            read.push(await landing(page, target, `${selector} on / followed`));
          else missed.push(`${selector} on /: no shown link to click`);
    }
    await load(page, "/crew");
    for (const [, selector, target] of clicks.filter(([r]) => r === "/crew"))
      if (await follow(page, selector))
        read.push(await landing(page, target, `${selector} on /crew followed`));
      else missed.push(`${selector} on /crew: no shown link to click`);

    // /crew#replay, at rest with a replay offered: the entry pressed, then the address arrived at.
    for (const arrive of [false, true]) {
      const live = await context.newPage();
      await setDefaultFont(context, live, size);
      await livePage(live, arrive ? "/crew#replay" : "/crew", {
        json: RESTING,
      });
      if (!arrive && !(await press(live, ENTRY)))
        missed.push("/crew: no entry to press on the resting fixture");
      await untilPlayed(live, 1);
      read.push(
        await landing(
          live,
          "/crew#replay",
          arrive
            ? "/crew#replay loaded from the address (resting with a replay)"
            : "/crew's entry Replay sprint pressed (resting with a replay)",
          true,
        ),
      );
      await live.close();
    }
  } finally {
    await context.close();
  }
  return { read, missed };
}

const T41A =
  "T41a each fragment link's target clears the bar: at 1024 x 768, 1280 x 800, 1440 x 900, 1536 x 864, 1920 x 1080 and 2560 x 1440 with a 16, 20, 24 or 28 px default font, /#work, /#contact, /#case-studies, the skip link's #main (on / and /read), /crew#keel, /crew#replay, /log#every-revision and /read's #work and #case-studies land with their top at or below the bar's bottom and inside the window, loaded from the address and followed by a click";

for (const size of SIZES)
  test(`${T41A} (${size} px)`, async ({ browser }) => {
    test.setTimeout(150_000);
    for (const [w, h] of WINDOWS) {
      const where = `at ${w} x ${h}, ${size} px default font`;
      const { read, missed } = await landings(browser, size, w, h);
      expect
        .soft(missed, `links and addresses not reached ${where}`)
        .toEqual([]);
      for (const r of read) {
        expect(r.root, `the root's font, ${r.how} ${where}`).toBe(`${size}px`);
        expect.soft(r.found, `the target of ${r.how} ${where}`).toBe(true);
        expect
          .soft(
            r.top,
            `${r.how} ${where}: its target's top against the ${r.hasBar ? "bar's bottom" : "window's top (no bar)"} ${r.bar.toFixed(1)} (scrollY ${r.y} of ${r.end}, scroll-padding-top ${r.pad})`,
          )
          .toBeGreaterThanOrEqual(r.bar - SLACK);
        expect
          .soft(r.top, `${r.how} ${where}: its target's top inside the window`)
          .toBeLessThan(r.height);
      }
    }
  });

/** Each Tab stop that fails, and how many stops below the first screen each way were read. */
type Walk = { under: string[]; forward: number; back: number };

/** Tab from main to the page's end, then Shift+Tab back to the bar, reading each stop. */
async function walk(page: Page): Promise<Walk> {
  // The stops in the first screen at load, which the check leaves out.
  await page.evaluate(() => {
    const first = new Set<Element>();
    for (const el of document.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]",
    )) {
      const r = el.getBoundingClientRect();
      if (el.getClientRects().length > 0 && r.top < innerHeight) first.add(el);
    }
    (window as Window & { __t41First?: Set<Element> }).__t41First = first;
    document
      .getElementById("main")
      ?.focus({ preventScroll: true } as FocusOptions);
  });
  const result: Walk = { under: [], forward: 0, back: 0 };
  for (const key of ["Tab", "Shift+Tab"] as const) {
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press(key);
      const stop = await page.evaluate((bar) => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const b = document.querySelector(bar);
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const ring =
          s.outlineStyle === "none"
            ? 0
            : Math.max(
                0,
                Number.parseFloat(s.outlineWidth) +
                  Number.parseFloat(s.outlineOffset),
              );
        const first = (window as Window & { __t41First?: Set<Element> })
          .__t41First;
        return {
          name: `${el.tagName.toLowerCase()}${el.getAttribute("href") ? `[href="${el.getAttribute("href")}"]` : ""} "${(el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40)}"`,
          inBar: Boolean(b?.contains(el)),
          skip: el.getAttribute("href") === "#main",
          first: Boolean(first?.has(el)),
          top: r.top,
          ring,
          bar: b ? b.getBoundingClientRect().bottom : 0,
          y: scrollY,
        };
      }, BAR);
      // Past the page's end the focus leaves the document; back up, the bar ends the walk.
      if (!stop) break;
      if (stop.inBar || stop.skip) {
        if (key === "Shift+Tab" || i > 0) break;
        continue;
      }
      if (stop.first) continue;
      if (key === "Tab") result.forward += 1;
      else result.back += 1;
      if (stop.top - stop.ring < stop.bar - SLACK)
        result.under.push(
          `${key} onto ${stop.name}: its ring's top ${(stop.top - stop.ring).toFixed(1)} (box ${stop.top.toFixed(1)}, ring ${stop.ring} px) against the bar's bottom ${stop.bar.toFixed(1)}, scrollY ${stop.y}`,
        );
    }
  }
  return result;
}

const T41B =
  "T41b a focused link clears the bar: on /, /crew and /log at 1024 x 768, 1536 x 864, 1920 x 1080 and 2560 x 1440 with a 16, 20, 24 or 28 px default font, Tab from main through every stop to the page's end, then Shift+Tab back up: each stop outside the bar and below the first screen has its box, its 2 px ring 2 px out included, starting at or below the bar's bottom";

for (const size of SIZES)
  test(`${T41B} (${size} px)`, async ({ browser }) => {
    test.setTimeout(150_000);
    const { context, page } = await contextOf(browser, {
      width: WALKED[0][0],
      height: WALKED[0][1],
    });
    try {
      await setDefaultFont(context, page, size);
      for (const [w, h] of WALKED) {
        await page.setViewportSize({ width: w, height: h });
        for (const route of ["/", "/crew", "/log"]) {
          const where = `on ${route} at ${w} x ${h}, ${size} px default font`;
          expect(await load(page, route), `status of ${route}`).toBe(200);
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(
              () => getComputedStyle(document.documentElement).fontSize,
            ),
            `the root's font ${where}`,
          ).toBe(`${size}px`);
          const read = await walk(page);
          expect
            .soft(
              read.forward,
              `Tab stops below the first screen read ${where}`,
            )
            .toBeGreaterThan(0);
          expect
            .soft(
              read.back,
              `Shift+Tab stops below the first screen read ${where}`,
            )
            .toBeGreaterThan(0);
          expect.soft(read.under, `stops under the bar ${where}`).toEqual([]);
        }
      }
    } finally {
      await context.close();
    }
  });

const T41C =
  "T41c nothing moves at the default font: at a 16 px default font, at 1024 x 768, 1440 x 900 and 1920 x 1080, html's computed scroll-padding-top is main's 56px and every T41a landing, loaded or followed, is main's: the target's top 56 px below the window's top (98 for /crew#keel, 72 for /crew#replay), or, where the page's top or end stops the scroll, at least that far down with the scroll at that limit";

test(T41C, async ({ browser }) => {
  test.setTimeout(90_000);
  for (const [w, h] of PINNED) {
    const where = `at ${w} x ${h}, 16 px default font`;
    const { read, missed } = await landings(browser, 16, w, h);
    expect.soft(missed, `links and addresses not reached ${where}`).toEqual([]);
    for (const r of read) {
      expect(r.root, `the root's font, ${r.how} ${where}`).toBe("16px");
      expect
        .soft(r.pad, `html's scroll-padding-top, ${r.how} ${where}`)
        .toBe("56px");
      const pinned = LANDED[r.key] ?? Number.NaN;
      const limited = r.y <= 0 || r.y >= r.end - 1;
      const name = `${r.how} ${where}: its target's top ${r.top.toFixed(1)} (scrollY ${r.y} of ${r.end}) against main's ${pinned}`;
      if (limited)
        expect
          .soft(r.top, `${name}, the scroll at its limit`)
          .toBeGreaterThanOrEqual(pinned - SLACK);
      else
        expect.soft(Math.abs(r.top - pinned), name).toBeLessThanOrEqual(SLACK);
    }
  }
});
