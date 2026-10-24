import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { horizontalOverflow, MOTION, motionReady } from "./helpers";

// Sprint 31, B4a (.crew/sprint/31/contract.md, "The bar" and B4.9 to B4.11): the bar on /crew, the
// bar on / from 768 to 1023 px with Crew in it, and the way back from /crew. These run on the
// suite's webServer, which has no feed URL: nothing here depends on the feed's state.

const LABELS = ["Work", "Crew", "Log", "Contact", "Read as page"];

async function open(page: Page, url: string, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url} at ${width}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
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

/** Whether the first element matching `selector` starts inside the viewport. */
function inView(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    return r.top >= -0.5 && r.top < innerHeight && r.bottom > 0
      ? "in view"
      : `top ${r.top}`;
  }, selector);
}

/** The bar as a visitor meets it: the header before main with its nav. */
function readBar(page: Page) {
  return page.evaluate((slot) => {
    const squashed = (el: Element | null | undefined) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const header = document.querySelector("header:has(nav)");
    const nav = header?.querySelector('nav[aria-label="Main"]') ?? null;
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        inside:
          r.left >= -0.5 &&
          r.top >= -0.5 &&
          r.right <= cw + 0.5 &&
          r.bottom <= ch + 0.5,
      };
    };
    const wordmark = [...(header?.querySelectorAll("*") ?? [])]
      .filter((el) => squashed(el) === "Theseus")
      .at(-1);
    const links = [...(nav?.querySelectorAll("a") ?? [])];
    const buttons = [...document.querySelectorAll(`${slot} button`)].filter(
      (b) => b.getClientRects().length > 0 && header?.contains(b),
    );
    return {
      header: Boolean(header),
      nav: Boolean(nav),
      wordmarkHref: wordmark?.closest("a")?.getAttribute("href") ?? null,
      links: links.map((a) => ({
        text: squashed(a),
        href: a.getAttribute("href"),
        current: a.getAttribute("aria-current"),
        shown: a.getClientRects().length > 0,
        ...box(a),
      })),
      buttons: buttons.map((b) => ({ text: squashed(b), ...box(b) })),
      currents: [...document.querySelectorAll("[aria-current]")].map(
        (el) => `${squashed(el)} ${el.getAttribute("aria-current")}`,
      ),
      headerControls:
        header?.querySelectorAll("button, [data-motion]").length ?? -1,
      headerOverflow: header ? header.scrollWidth - header.clientWidth : -1,
      readShown: [...document.querySelectorAll('a[href="/read"]')].filter(
        (a) => a.getClientRects().length > 0,
      ).length,
    };
  }, MOTION);
}

test("B4.9 the bar on /crew: at 320, 390, 768, 1024 and 1440 the wordmark links home; Work /#work, Crew /crew current, Log, Contact /#contact, Read as page /read in order and no other current; no button or control in the header; the shown links targets inside the viewport (24 px from 1024, 44 px tall below) on one line with no overflow; five shown from 768, four below with Read as page shown and reachable on the page; at 390 and 1440 each lands", async ({
  page,
}) => {
  test.setTimeout(180_000);
  for (const width of [320, 390, 768, 1024, 1440]) {
    const where = `on /crew at ${width}`;
    await open(page, "/crew", width);
    const bar = await readBar(page);
    expect(
      bar.header && bar.nav,
      `the bar and nav[aria-label="Main"] ${where}`,
    ).toBe(true);
    expect.soft(bar.wordmarkHref, `the wordmark's link ${where}`).toBe("/");
    expect
      .soft(
        bar.links.map(({ text, href, current }) => ({ text, href, current })),
        `the nav's links ${where}`,
      )
      .toEqual([
        { text: "Work", href: "/#work", current: null },
        { text: "Crew", href: "/crew", current: "page" },
        { text: "Log", href: "/log", current: null },
        { text: "Contact", href: "/#contact", current: null },
        { text: "Read as page", href: "/read", current: null },
      ]);
    expect
      .soft(bar.currents, `aria-current on the page ${where}`)
      .toEqual(["Crew page"]);
    expect
      .soft(
        bar.headerControls,
        `buttons or [data-motion] in the header ${where}`,
      )
      .toBe(0);
    const shown = bar.links.filter((l) => l.shown);
    expect
      .soft(
        shown.map((l) => l.text),
        `the bar's shown links ${where}`,
      )
      .toEqual(width >= 768 ? LABELS : LABELS.slice(0, 4));
    const floor = width >= 1024 ? 24 : 44;
    expect
      .soft(
        shown
          .filter(
            (l) => l.height < floor - 0.05 || l.width < 24 - 0.05 || !l.inside,
          )
          .map(
            (l) =>
              `${l.text}: ${l.width} x ${l.height}${l.inside ? "" : ", outside"}`,
          ),
        `shown links under ${width >= 1024 ? "24 x 24" : "44 px tall"} or outside the viewport ${where}`,
      )
      .toEqual([]);
    const tops = shown.map((l) => l.top);
    expect
      .soft(
        Math.max(...tops) - Math.min(...tops),
        `the spread of the shown links' tops (${tops.join(", ")}) ${where}`,
      )
      .toBeLessThanOrEqual(0.5);
    expect
      .soft(bar.headerOverflow, `the bar's overflow ${where}`)
      .toBeLessThanOrEqual(0);
    expect
      .soft(await horizontalOverflow(page), `page overflow ${where}`)
      .toBe(0);
    expect.soft(bar.readShown, `Read as page links shown ${where}`).toBe(1);
    // Reachable: Tab gets to it.
    let reached = false;
    for (let press = 0; press < 30 && !reached; press++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(
        () => document.activeElement?.getAttribute("href") === "/read",
      );
    }
    expect.soft(reached, `Tab reaches Read as page ${where}`).toBe(true);
  }

  // Each link lands.
  for (const width of [390, 1440]) {
    for (const [text, id] of [
      ["Work", "work"],
      ["Contact", "contact"],
    ] as const) {
      await open(page, "/crew", width);
      await page.locator("header nav a", { hasText: text }).first().click();
      await expect
        .poll(
          () => new URL(page.url()).pathname,
          `the page after ${text} at ${width}`,
        )
        .toBe("/");
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
    await open(page, "/crew", width);
    await page.locator("header nav a", { hasText: "Crew" }).first().click();
    await expect
      .poll(() => new URL(page.url()).pathname, `after Crew at ${width}`)
      .toBe("/crew");
    await expect(page.locator("h1"), `after Crew at ${width}`).toHaveText(
      "Crew",
    );
    await open(page, "/crew", width);
    await page.locator("header nav a", { hasText: "Log" }).first().click();
    await page.waitForURL((url) => url.pathname === "/log");
    await expect(page.locator("h1"), `after Log at ${width}`).toHaveText("Log");
    await open(page, "/crew", width);
    await page.locator('a[href="/read"]:visible').first().click();
    await page.waitForURL((url) => url.pathname === "/read");
    await expect(
      page.locator("h1"),
      `after Read as page at ${width}`,
    ).toHaveText(profile.name);
  }
});

test("B4.10 the bar on / from 768 to 1023: at 768 and 1023 the five links and Full, Calm, Off are shown in the bar on one line, inside the viewport, with no overflow; Read as page is the right-most link and the control right of it", async ({
  page,
}) => {
  for (const width of [768, 1023]) {
    const where = `on / at ${width}`;
    await open(page, "/", width);
    await motionReady(page);
    const bar = await readBar(page);
    const shown = bar.links.filter((l) => l.shown);
    expect
      .soft(
        shown.map((l) => [l.text, l.href]),
        `the bar's shown links ${where}`,
      )
      .toEqual([
        ["Work", "#work"],
        ["Crew", "/crew"],
        ["Log", "/log"],
        ["Contact", "#contact"],
        ["Read as page", "/read"],
      ]);
    expect
      .soft(
        bar.buttons.map((b) => b.text),
        `the control's buttons in the bar ${where}`,
      )
      .toEqual(["Full", "Calm", "Off"]);
    const items = [...shown, ...bar.buttons];
    const tops = (list: { top: number }[]) => list.map((i) => i.top);
    for (const [name, list] of [
      ["links", shown],
      ["buttons", bar.buttons],
    ] as const) {
      const t = tops(list);
      expect
        .soft(
          Math.max(...t) - Math.min(...t),
          `the spread of the ${name}' tops (${t.join(", ")}) ${where}`,
        )
        .toBeLessThanOrEqual(0.5);
    }
    // One line: every link's and button's box shares the bar's row with every other.
    const row = {
      top: Math.max(...items.map((i) => i.top)),
      bottom: Math.min(...items.map((i) => i.bottom)),
    };
    expect
      .soft(
        row.bottom - row.top,
        `the links and buttons share one row ${where}`,
      )
      .toBeGreaterThan(0);
    expect
      .soft(
        items.filter((i) => !i.inside).map((i) => i.text),
        `links and buttons outside the viewport ${where}`,
      )
      .toEqual([]);
    expect
      .soft(bar.headerOverflow, `the bar's overflow ${where}`)
      .toBeLessThanOrEqual(0);
    expect
      .soft(await horizontalOverflow(page), `page overflow ${where}`)
      .toBe(0);
    const read = shown.find((l) => l.text === "Read as page");
    expect
      .soft(
        shown
          .filter((l) => l !== read && l.right > (read?.right ?? 0) + 0.5)
          .map((l) => l.text),
        `links right of Read as page ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        Math.min(...bar.buttons.map((b) => b.left)) -
          (read?.right ?? Number.POSITIVE_INFINITY),
        `the control's left past Read as page's right ${where}`,
      )
      .toBeGreaterThanOrEqual(-0.5);
  }
});

test("B4.11 Close and Back: at 390 x 844 and 1440 x 900, Crew from / lands on /crew with its h1 in view; Close, a target of 44 px below 1024 and 24 from it, lands on / with the owner's name in view; Crew then Back lands on / with the name in view", async ({
  page,
}) => {
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
  ] as const) {
    const where = `at ${width} x ${height}`;
    await open(page, "/", width, height);
    await page.locator('header nav a[href="/crew"]').click();
    await page.waitForURL((url) => url.pathname === "/crew");
    await expect
      .poll(() => inView(page, "h1"), `/crew's h1 ${where}`)
      .toBe("in view");
    await expect(page.locator("h1"), `the h1 after Crew ${where}`).toHaveText(
      "Crew",
    );

    const close = page.locator("a[data-close]");
    await expect(close, `a[data-close] ${where}`).toHaveCount(1);
    await expect
      .soft(
        page.getByRole("link", { name: "Close", exact: true }),
        `the link named Close ${where}`,
      )
      .toHaveCount(1);
    const box = await close.boundingBox();
    const floor = width >= 1024 ? 24 : 44;
    expect
      .soft(
        box && box.width >= floor - 0.05 && box.height >= floor - 0.05,
        `Close's target (${box?.width} x ${box?.height}) at least ${floor} px ${where}`,
      )
      .toBe(true);
    await close.click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("h1"), `the h1 after Close ${where}`).toHaveText(
      profile.name,
    );
    await expect
      .poll(
        () => inView(page, "main h1"),
        `the owner's name after Close ${where}`,
      )
      .toBe("in view");

    await page.locator('header nav a[href="/crew"]').click();
    await page.waitForURL((url) => url.pathname === "/crew");
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.locator("h1"), `the h1 after Back ${where}`).toHaveText(
      profile.name,
    );
    await expect
      .poll(
        () => inView(page, "main h1"),
        `the owner's name after Back ${where}`,
      )
      .toBe("in view");
  }
});
