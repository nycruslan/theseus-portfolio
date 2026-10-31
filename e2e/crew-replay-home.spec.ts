import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import { copperPaint } from "./crew";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
} from "./crew-feed";
import {
  momentsPlayed,
  N,
  readReplay,
  replaySite,
  untilPlayed,
} from "./crew-replay";
import { firstScreen, insideViewport } from "./first-screen";
import { installRgba, SCHEMES } from "./helpers";
import { layerFor, ROWS_SHOWN } from "./live-layer";
import { tokenRgba } from "./log";
import { refuseWebGl } from "./webgl";

// Sprint 37, B4e (.crew/sprint/37/contract.md, with amendment 1), B4.49: the way in from `/`, the
// rest line's link to /crew#replay, written before the build. Server HTML on `/` (0 B of script),
// read on the kept replay site and the resting site (no replay) once `/` shows resting, with
// WebGL refused; following the link lands on /crew on Playwright's clock.

test.describe.configure({ mode: "default" });
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });
test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

const LINK = 'p[data-rest] a[href="/crew#replay"]';

/** A kept site whose `/` shows resting, once a worker. */
function home(crew: Crew, name: "replay" | "resting") {
  return crew.once(`replay home ${name}`, async () => {
    const site = await replaySite(crew, name);
    const shown = await untilHome(site.base, "resting", STATE_WAIT);
    return { ...site, home: shown };
  });
}

test.beforeAll(async () => {
  const crew = await crewOf();
  void home(crew, "replay");
  void home(crew, "resting");
});

async function homeOf(crew: Crew, name: "replay" | "resting") {
  const site = await home(crew, name);
  expect(
    site.home.seen,
    `the state / shows on the ${name} site within ${STATE_WAIT} ms`,
  ).toBe("resting");
  return site;
}

async function openHome(page: Page, base: string, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/`);
  expect(
    response?.status(),
    `status of / on ${base || "the default server"}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** The rest line: its children, its box, the link's box and the sentence's. */
function restLine(page: Page) {
  return page.evaluate((link) => {
    const squash = (el: Element | null | undefined) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const box = (el: Element | null | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const rest = document.querySelector("p[data-rest]");
    const a = document.querySelector(link);
    const children = [...(rest?.children ?? [])];
    return {
      rests: document.querySelectorAll("p[data-rest]").length,
      links: rest?.querySelectorAll("a").length ?? 0,
      children: children.map((c) => ({
        tag: c.tagName.toLowerCase(),
        href: c.getAttribute("href"),
        text: squash(c),
      })),
      linkText: a?.textContent ?? null,
      rest: box(rest),
      link: box(a),
      sentence: box(children[0]),
    };
  }, LINK);
}

/** Every script `/` fetches with WebGL refused: path and decoded bytes. */
async function scriptsOf(browser: Browser, base: string) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  await context.addInitScript(refuseWebGl);
  const page = await context.newPage();
  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    const path = new URL(response.url()).pathname;
    bodies.push(
      response.body().then(
        (b) => `${path} ${b.length}`,
        () => `${path} ?`,
      ),
    );
  });
  await page.goto(`${base}/`);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const list = (await Promise.all(bodies)).sort();
  await context.close();
  return list;
}

test("B4.49 the way in from /: on the replay fixture p[data-rest] holds the oracle's line in one element then exactly one a[href=\"/crew#replay\"] reading exactly Replay sprint 29, its right edge the block's at 1440 and on a line of its own at the left at 390 and 320; never copper hovered or focused, at least 24 x 24, one 2 px ink ring 2 px out; Tab reaches it after the Contact links and before the Log link; B4.22's first screen holds; from 1024 the rest line no taller than without the link (1024 x 768, 1280 x 800, 1440 x 900), Contact in view at 1280 x 800; /'s scripts the default server's; following it lands on /crew with the Activity head under the bar, Pause replay shown and unpressed, k = 1, no hash, and a reload plays nothing; no link on the resting fixture", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const replay = await homeOf(crew, "replay");
  const resting = await homeOf(crew, "resting");
  const line = layerFor(replay.body(), replay.origin).rest;

  // The line and its link, at 1440, 390 and 320.
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 844],
  ] as const) {
    await openHome(page, replay.base, width, height);
    const r = await restLine(page);
    const at = `the replay site at ${width}`;
    expect
      .soft(
        {
          rests: r.rests,
          links: r.links,
          children: r.children,
          linkText: r.linkText,
        },
        `p[data-rest] on ${at}: the line in one element, then the one link`,
      )
      .toEqual({
        rests: 1,
        links: 1,
        children: [
          { tag: expect.any(String), href: null, text: line },
          { tag: "a", href: "/crew#replay", text: `Replay sprint ${N}` },
        ],
        linkText: `Replay sprint ${N}`,
      });
    if (width === 1440)
      expect
        .soft(
          Math.abs((r.link?.right ?? 0) - (r.rest?.right ?? -9)) <= 1,
          `the link's right edge ${r.link?.right} on the block's ${r.rest?.right}, ${at}`,
        )
        .toBe(true);
    else
      expect
        .soft(
          Boolean(
            r.link &&
              r.rest &&
              r.sentence &&
              Math.abs(r.link.left - r.rest.left) <= 1 &&
              r.link.top >= r.sentence.bottom - 4,
          ),
          `the link on a line of its own at the block's left, ${at}: ${JSON.stringify(r)}`,
        )
        .toBe(true);
  }

  // Copper, the target and the ring, at 1440 in both schemes; then Tab's order.
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await openHome(page, replay.base);
    const accent = (await tokenRgba(page, "--accent")) ?? [0, 0, 0, 0];
    const ink = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--foreground)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    // Hovered: a missing link fails the copper and target reads below, not a hover's timeout.
    await page
      .locator(LINK)
      .hover({ timeout: 2_000 })
      .catch(() => undefined);
    const hovered = await copperPaint(page, accent);
    await page.mouse.move(0, 0);
    const stops: string[] = [];
    let ring: string | null = null;
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate((link) => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const rings = [el, ...el.querySelectorAll("*")].filter((c) => {
          const cs = getComputedStyle(c);
          return (
            cs.outlineStyle !== "none" && Number.parseFloat(cs.outlineWidth) > 0
          );
        }).length;
        return {
          href: el.getAttribute("href") ?? `<${el.tagName.toLowerCase()}>`,
          replay: el.matches(link),
          ring: `${rings} ${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
        };
      }, LINK);
      if (!at) break;
      stops.push(at.href);
      if (at.replay) {
        ring = at.ring;
        const focused = await copperPaint(page, accent);
        hovered.push(...focused);
      }
    }
    const box = await page.locator(LINK).boundingBox();
    const contact = profile.links.map((l) => l.href);
    const lastContact = Math.max(...contact.map((h) => stops.indexOf(h)));
    const linkAt = stops.indexOf("/crew#replay");
    const logAt = stops.indexOf("/log", lastContact);
    expect
      .soft(
        {
          copper: hovered.map((h) => `${h.where} ${h.property}`),
          target: Boolean(box && box.width >= 24 && box.height >= 24),
          ring,
          order: [linkAt - lastContact, logAt - linkAt],
        },
        `the link on the replay site, ${scheme}: copper hovered or focused, its box ${JSON.stringify(box)}, its ring, and its Tab place in ${stops.join(" ")}`,
      )
      .toEqual({
        copper: [],
        target: true,
        ring: `1 solid 2px ${ink} 2px`,
        order: [1, 1],
      });

    // B4.22's first screen, the rest line included.
    for (const [width, height, withRows] of [
      [1440, 900, true],
      [390, 844, false],
    ] as const) {
      await openHome(page, replay.base, width, height);
      const found = await firstScreen(page);
      const rest = (await restLine(page)).rest;
      const checked = [
        ...found.items,
        ...(withRows ? found.rows : []),
        ...(withRows ? [{ what: "the rest line", box: rest }] : []),
      ];
      expect
        .soft(
          {
            rows: withRows ? found.rows.length : ROWS_SHOWN,
            outside: checked
              .filter(({ box }) => !insideViewport(box, found.viewport))
              .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
          },
          `B4.22's first screen on the replay site at ${width} x ${height}, ${scheme}`,
        )
        .toEqual({ rows: ROWS_SHOWN, outside: [] });
    }
  }
  await page.emulateMedia({ colorScheme: "light" });

  // From 1024: no taller than without the link; Contact in view at 1280 x 800.
  const heights: string[] = [];
  for (const [width, height] of [
    [1024, 768],
    [1280, 800],
    [1440, 900],
  ] as const) {
    await openHome(page, resting.base, width, height);
    const without = (await restLine(page)).rest;
    await openHome(page, replay.base, width, height);
    const withLink = (await restLine(page)).rest;
    const h = (b: typeof without) => (b ? b.bottom - b.top : Number.NaN);
    if (!(Math.abs(h(withLink) - h(without)) <= 0.5))
      heights.push(
        `${width} x ${height}: ${h(withLink)} against ${h(without)}`,
      );
    if (width === 1280) {
      const found = await firstScreen(page);
      const out = found.items
        .filter((item) => item.what.startsWith("the title block's link"))
        .filter(({ box }) => !insideViewport(box, found.viewport))
        .map(({ what }) => what);
      if (out.length > 0)
        heights.push(`1280 x 800: ${out.join(", ")} out of view`);
    }
  }
  expect
    .soft(
      heights,
      "p[data-rest]'s height with the link against the resting fixture's without it, within 0.5 px, and Contact in view at 1280 x 800",
    )
    .toEqual([]);

  // No link on the resting fixture.
  await openHome(page, resting.base);
  expect
    .soft(
      (await restLine(page)).links,
      "links in p[data-rest] on the resting site",
    )
    .toBe(0);

  // /'s scripts: the default server's files and bytes.
  expect
    .soft(
      await scriptsOf(browser, replay.base),
      "/'s scripts on the replay site (path and bytes), WebGL refused, against the default server's",
    )
    .toEqual(await scriptsOf(browser, ""));

  // Following it, on the clock.
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(installRgba);
    await context.addInitScript(refuseWebGl);
    const page = await context.newPage();
    const now = Date.now();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now + 1_000);
    await page.goto(`${replay.base}/`);
    const at = await page.evaluate((link) => {
      const a = document.querySelector(link);
      if (!a) return null;
      a.scrollIntoView({ block: "center", behavior: "instant" });
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, LINK);
    if (at) await page.mouse.click(at.x, at.y);
    await page.waitForURL(/\/crew/, { timeout: 10_000 }).catch(() => undefined);
    await page
      .locator("button[data-pause][data-ready]")
      .waitFor({ state: "attached", timeout: 5_000 })
      .catch(() => undefined);
    const read = await untilPlayed(page, 1);
    const landed = await page.evaluate(() => {
      const bar = document
        .querySelector("header:has(nav)")
        ?.getBoundingClientRect();
      const h2 = document.querySelector("#replay h2")?.getBoundingClientRect();
      return {
        path: location.pathname,
        hash: location.hash,
        under: Boolean(bar && h2 && h2.top >= bar.bottom - 0.5),
        inView: Boolean(h2 && h2.bottom <= innerHeight + 0.5),
      };
    });
    expect
      .soft(
        {
          ...landed,
          pause: [read.pause?.text, read.pause?.shown, read.pause?.pressed],
          k: momentsPlayed(read),
        },
        "following the link: /crew, no hash, the Activity head under the bar and in view, Pause replay shown and unpressed, k = 1",
      )
      .toEqual({
        path: "/crew",
        hash: "",
        under: true,
        inView: true,
        pause: ["Pause replay", true, "false"],
        k: 1,
      });
    await page.reload();
    await page
      .locator("button[data-pause][data-ready]")
      .waitFor({ state: "attached", timeout: 5_000 })
      .catch(() => undefined);
    await page.clock.runFor(3_000);
    await new Promise((done) => setTimeout(done, 300));
    const reloaded = await readReplay(page);
    expect
      .soft(
        { k: momentsPlayed(reloaded), pause: reloaded.pause?.shown ?? false },
        "a reload of /crew after the landing, 3 s of the clock on: nothing plays",
      )
      .toEqual({ k: 0, pause: false });
    await context.close();
  }
});
