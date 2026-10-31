import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import { expected, textContrast } from "./crew";
import {
  type Answer,
  type Crew,
  homeStateOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
  untilState,
} from "./crew-feed";
import { firstScreen, insideViewport, textSizes } from "./first-screen";
import {
  horizontalOverflow,
  installRgba,
  resolveColors,
  SCHEMES,
  textStyles,
} from "./helpers";
import {
  copperOnHome,
  DRAWING_NOW,
  hooks,
  type Layer,
  layerFor,
  pencilPaint,
  pencilSeat,
  planksByView,
  REVISIONS,
  ROWS_SHOWN,
  revisionBlock,
  sameColor,
} from "./live-layer";
import {
  type Box,
  drawingAt,
  FIRST,
  modelCoverage,
  note,
  pause,
  SHOWN,
  TRIANGLES_AT,
} from "./model";
import { deltaE, type Image } from "./pixels";
import { PLAN, readPlan } from "./plan";
import { MERGED } from "./retros";
import { type ModelRun, openModel, refuseWebGl } from "./webgl";

// Sprint 34, B4b (.crew/sprint/34/contract.md, B4.15 to B4.24; the plan's B4.2): the live layer
// on `/`, from the feed `/crew` reads, written before the build. On B4a's harness
// (e2e/crew-feed.ts): each check starts a `next start` of its own on the checkout's build with
// CREW_FEED_URL pointed at the fixture server, reads `/crew` until it shows the fixture's state,
// then `/` until it shows the contract's hooks for it (live `tr[data-pencil][data-live]`, open
// `tr[data-pencil]`, resting `p[data-rest]`, down none of them, after first showing live), within
// STATE_WAIT. No check asserts on a first response. The server runs at UTC+14 and the browser in
// Los Angeles. The suite's webServer has no feed URL: `down`, today's sheet, the reference.
//
// The oracle is e2e/live-layer.ts. Iris's calls (.crew/sprint/34/notes-iris.md): no row trade, so
// five rows in every state; the rest line is `/crew`'s resting status line, the revision block's
// first line before the table. The 2D reads open `/` with WebGL refused (sprint 25's lesson: the
// model's data-state restyles the drawing from 1024 px); B4.21 and B4.23 open it with the model.

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

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The fixtures as the contract names them: the live and open fixtures' n is 31, in the retros. */
const LIVE: Partial<Answer> = { fixture: "live" };
const OPEN: Partial<Answer> = { fixture: "open" };
const RESTING: Partial<Answer> = { fixture: "resting" };
const LIVE_999: Partial<Answer> = {
  fixture: "live",
  patch: { current: { sprint: 999 } },
};
const QUIET: Partial<Answer> = {
  fixture: "open",
  patch: {
    current: {
      health: {
        state: "quiet",
        label: "Quiet",
        line: "Nothing new for 12 min.",
        quote: false,
      },
    },
  },
};
/** Kept for the worker: the sites most checks read. */
const KEPT: Record<string, Partial<Answer>> = {
  "home-live": LIVE,
  "home-open": OPEN,
  "home-resting": RESTING,
};

/** The legend's added items' words (Iris's call 3.6). */
const LEGEND_WORDS = { pencil: "In progress", copper: "Drawing now" };

type Shown = { base: string; layer: Layer; where: string; name: string };

/** The suite's webServer: no feed URL, so down. */
const DEFAULT: Shown = {
  base: "",
  layer: layerFor(null, null),
  where: "the default server",
  name: "default",
};

/**
 * A site of its own on channel `name` (kept when KEPT names it), read until `/crew` shows the
 * oracle's state and then `/` shows the layer's: the polling rule, read on `/` itself.
 */
async function homeOn(
  crew: Crew,
  name: string,
  answer: Partial<Answer> = KEPT[name] ?? {},
): Promise<Shown> {
  const site = await crew.site(name, answer, name in KEPT);
  const body = crew.feed.body(name);
  const layer = layerFor(body, crew.feed.origin);
  const crewShown = await untilState(
    site.baseURL,
    expected(body, crew.feed.origin).state,
    STATE_WAIT,
  );
  const shown = await untilHome(site.baseURL, layer.home, STATE_WAIT);
  test.info().annotations.push({
    type: "state-wait",
    description: `${name}: /crew ${crewShown.seen} after ${crewShown.ms} ms, then / ${shown.seen} after ${shown.ms} ms`,
  });
  expect(
    shown.seen,
    `the state / shows on the ${name} site within ${STATE_WAIT} ms of /crew's ${crewShown.seen} (the last seen, from tr[data-pencil], data-live and p[data-rest])`,
  ).toBe(layer.home);
  return { base: site.baseURL, layer, where: `the ${name} site`, name };
}

/**
 * A down variant: its site shows live on `/` first (from `first`), then the channel switches to
 * `answer` and `/` is read until it shows none of the layer's hooks.
 */
async function downFrom(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
  first: Partial<Answer> = LIVE,
): Promise<Shown> {
  const live = await homeOn(crew, name, first);
  crew.feed.set(name, answer);
  const shown = await untilHome(live.base, "down", STATE_WAIT);
  test.info().annotations.push({
    type: "state-wait",
    description: `${name}: / ${shown.seen} ${shown.ms} ms after the switch`,
  });
  expect(
    shown.seen,
    `the state / shows within ${STATE_WAIT} ms of the switch on ${name} (the last seen)`,
  ).toBe("down");
  return { ...live, layer: layerFor(null, null) };
}

async function openHome(page: Page, shown: Shown, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${shown.base}/`);
  expect(response?.status(), `status of / on ${shown.where}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** Waits out clock animations and two frames. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.timeline === document.timeline)
        .map((a) => a.finished),
    );
    for (let frame = 0; frame < 2; frame++)
      await new Promise((done) => requestAnimationFrame(done));
  });
}

/** Each plank's numbers in the shown drawing: on it, or led to it (B1.4's reading). */
async function numbersByPlank(page: Page) {
  const plan = await readPlan(page);
  const numbers: Record<string, string[]> = {};
  for (const plank of plan?.planks ?? []) numbers[plank.id] = [];
  for (const t of plan?.texts ?? []) {
    if (!/^\d+$/.test(t.text)) continue;
    for (const id of new Set([...(t.on ? [t.on] : []), ...t.led]))
      numbers[id]?.push(t.text);
  }
  for (const id of Object.keys(numbers)) numbers[id]?.sort();
  return numbers;
}

/** `/` with scripts off: `main`'s outerHTML and the layer's hooks, as the HTML has them. */
async function withoutScripts(browser: Browser, shown: Shown) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  const response = await page.goto(`${shown.base}/`);
  const read = await page.evaluate(() => ({
    main: document.querySelector("main")?.outerHTML ?? "",
    hooks: Object.fromEntries(
      [
        "tr[data-pencil]",
        "tr[data-live]",
        "path[data-plank][data-pencil]",
        "path[data-plank][data-live]",
        "[data-tip]",
        "[data-drawing]",
        "p[data-rest]",
        "[data-key]",
      ].map((s) => [s, document.querySelectorAll(s).length]),
    ),
  }));
  await context.close();
  return { status: response?.status(), ...read };
}

const accentOf = async (page: Page) =>
  (await resolveColors(page))["--accent"]?.rgba ?? [];

// ---------------------------------------------------------------------------------------------

test("B4b harness: homeStateOf reads tr[data-pencil][data-live] as live, tr[data-pencil] as open, p[data-rest] as resting and none as down; a site of its own on the live fixture answers / with 200, and its state is read (the readout)", async ({
  crew,
}) => {
  test.setTimeout(120_000);
  const row = (attributes: string) =>
    `<table><tbody><tr${attributes}><th scope="row">31</th></tr><tr><th scope="row">33</th></tr></tbody></table>`;
  const cases: [string, string][] = [
    [row(' data-pencil="" data-live=""'), "live"],
    [row(" data-live data-pencil"), "live"],
    [row(' data-pencil=""'), "open"],
    [`${row("")}<p class="x" data-rest="">Crew resting.</p>`, "resting"],
    [row(""), "down"],
    // Hooks on other elements aren't the row's or the line's.
    [
      '<path data-plank="3.0" data-pencil="" data-live=""></path><div data-rest=""></div>',
      "down",
    ],
    [row(' data-pencilled=""'), "down"],
  ];
  for (const [html, state] of cases) {
    expect.soft(homeStateOf(html), html).toBe(state);
  }
  // The oracle's seats against the contract's worked numbers: 31 is in the retros, on 3.0.
  expect.soft(pencilSeat(31), "31's seat").toBe("3.0");
  test.info().annotations.push({
    type: "readout",
    description: `the oracle: k = ${MERGED.length}, 31 on ${pencilSeat(31)}, 999 on ${pencilSeat(999)} (the contract, at k = 32: 3.0 and 4.0)`,
  });

  const site = await crew.site("home-harness", LIVE);
  const crewShown = await untilState(site.baseURL, "live", STATE_WAIT);
  expect(crewShown.seen, "/crew on the live site").toBe("live");
  const home = await untilHome(site.baseURL, "(read once)", 0);
  test.info().annotations.push({
    type: "readout",
    description: `/ on a site of its own pointed at the live fixture reads "${home.seen}" (down until B4b is built)`,
  });
  expect(["live", "open", "resting", "down"], "what / answers").toContain(
    home.seen,
  );
});

test("B4.15 the pencil plank: on the live fixture (31), with sprint 999 and on the open fixture, each drawing has one path[data-plank][data-pencil] on the oracle's seat with data-sprint n, data-live in live only, one [data-tip] in its svg in live only; the wide drawing's number on it is n; every other plank as on the default server; a --pencil dashed edge and a hatch in both schemes, the dash in forced colours; [data-plan] within 32,768 B", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  await openHome(page, DEFAULT);
  const reference = await planksByView(page);
  const referenceNumbers = await numbersByPlank(page);
  const classOf = new Map(
    reference.flatMap(({ view, planks }) =>
      planks.map((p) => [`${view} ${p.id}`, p.className] as const),
    ),
  );
  for (const shown of [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-999", LIVE_999),
    await homeOn(crew, "home-open"),
  ]) {
    const { layer, where } = shown;
    const live = layer.home === "live";
    expect(layer.seat, `the oracle's seat on ${where}`).not.toBeNull();
    await openHome(page, shown);
    const views = await planksByView(page);
    expect
      .soft(
        views.map((v) => v.view).sort(),
        `the drawings in [data-plan] on ${where}`,
      )
      .toEqual(["plan-narrow", "plan-wide"]);
    for (const { view, planks, tips } of views) {
      const at = `${view} on ${where}`;
      expect
        .soft(
          planks.filter((p) => p.pencil).map((p) => `${p.id} ${p.sprint}`),
          `planks with data-pencil (seat and data-sprint) in ${at}`,
        )
        .toEqual([`${layer.seat} ${layer.n}`]);
      expect
        .soft(
          planks.filter((p) => p.live).map((p) => p.id),
          `planks with data-live in ${at}`,
        )
        .toEqual(live ? [layer.seat] : []);
      expect
        .soft(
          tips.map((t) => t.inSvg),
          `[data-tip]s in ${at} (each in the svg)`,
        )
        .toEqual(live ? [true] : []);
      expect
        .soft(
          Object.fromEntries(planks.map((p) => [p.id, p.sprint])),
          `each plank's data-sprint in ${at}`,
        )
        .toEqual(layer.seats);
      expect
        .soft(
          planks
            .filter((p) => p.id !== layer.seat)
            .filter((p) => p.className !== classOf.get(`${view} ${p.id}`))
            .map((p) => `${p.id}: ${p.className}`),
          `planks other than the pencil one whose class differs from the default server's, ${at}`,
        )
        .toEqual([]);
    }
    const numbers = await numbersByPlank(page);
    expect
      .soft(
        numbers[layer.seat ?? ""],
        `the wide drawing's numbers on or led to the pencil plank ${layer.seat}, ${where}`,
      )
      .toEqual([String(layer.n)]);
    expect
      .soft(
        Object.fromEntries(
          Object.entries(numbers).filter(([id]) => id !== layer.seat),
        ),
        `every other plank's numbers in the wide drawing against the default server's, ${where}`,
      )
      .toEqual(
        Object.fromEntries(
          Object.entries(referenceNumbers).filter(([id]) => id !== layer.seat),
        ),
      );
    const bytes = await page.evaluate(
      (selector) =>
        new TextEncoder().encode(
          document.querySelector(selector)?.outerHTML ?? "",
        ).length,
      PLAN,
    );
    expect
      .soft(bytes, `${PLAN} outerHTML in bytes on ${where}`)
      .toBeLessThanOrEqual(32_768);

    // The look, on the shown drawing at 1440 (wide) and 390 (narrow), both schemes.
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [1440, 390]) {
        await openHome(page, shown, width, width === 390 ? 844 : 900);
        const paint = await pencilPaint(page, layer.n ?? 0);
        const at = `${where} at ${width}, ${scheme}`;
        expect(paint.planks.length, `shown pencil planks, ${at}`).toBe(1);
        for (const p of paint.planks) {
          expect
            .soft(
              sameColor(p.stroke, paint.muted),
              `the pencil plank's stroke ${JSON.stringify(p.stroke)} is --muted ${JSON.stringify(paint.muted)}, ${at}`,
            )
            .toBe(true);
          expect
            .soft(p.dash, `the pencil plank's stroke-dasharray, ${at}`)
            .not.toMatch(/^(none|0(px)?)$/);
          expect
            .soft(p.strokeWidth, `the pencil plank's stroke width, ${at}`)
            .toBeGreaterThan(0);
          expect
            .soft(
              p.fill,
              `the pencil plank's fill is a hatch (a pattern), not a flat colour, ${at}`,
            )
            .toMatch(/^url\(/);
        }
        if (width >= 768) {
          expect
            .soft(
              paint.numbers.map(
                (number) =>
                  sameColor(number.color, paint.muted) &&
                  sameColor(number.background, paint.ground),
              ),
              `the wide drawing's ${layer.n}: --muted on a --background chip, ${at}: ${JSON.stringify(paint.numbers)}`,
            )
            .toEqual([true]);
        }
      }
    }
    await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
    await openHome(page, shown);
    const forced = await pencilPaint(page, layer.n ?? 0);
    expect
      .soft(
        forced.planks.map((p) => p.dash),
        `the pencil plank's dash in forced colours, ${where}`,
      )
      .toEqual([expect.not.stringMatching(/^(none|0(px)?)$/)]);
    await page.emulateMedia({ forcedColors: "none" });
  }
});

test("B4.16 the pencil row: on the live and open fixtures at 1440 and 390 the first row is tr[data-pencil] with Rev n, one link to /crew in Description holding the goal whole, the oracle's signatures, then the four newest retros without n; one line from 1024, folded with labels at 390; the link lands on /crew; drawing now whole, uncut and within the viewport's width in live only; Waiting for owner in open, — when quiet; none of the feed's other words on /", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  const live = await homeOn(crew, "home-live");
  const open = await homeOn(crew, "home-open");
  for (const shown of [live, open, await homeOn(crew, "home-quiet", QUIET)]) {
    const { layer, where } = shown;
    const isLive = layer.home === "live";
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await openHome(page, shown, width, height);
      const at = `${where} at ${width}`;
      const block = await revisionBlock(page);
      expect
        .soft(
          block.rows.map((r) => r.cells),
          `the revision rows, ${at}`,
        )
        .toEqual(layer.rows);
      expect.soft(block.rows.length, `rows, ${at}`).toBe(ROWS_SHOWN);
      expect
        .soft(
          block.rows.map((r) => [r.pencil, r.live]),
          `data-pencil and data-live on each row, ${at}`,
        )
        .toEqual(block.rows.map((_, i) => [i === 0, i === 0 && isLive]));
      const first = block.rows[0];
      expect
        .soft(first?.rowHeader, `the pencil row's th[scope=row], ${at}`)
        .toBe(true);
      expect
        .soft(first?.labels, `the pencil row's labelled cells, ${at}`)
        .toEqual([
          { label: "Drawn", translate: "no" },
          { label: "Checked", translate: "no" },
          { label: "Tested", translate: "no" },
          { label: "Approved", translate: null },
        ]);
      expect
        .soft(
          first?.links.map((l) => [l.href, l.text, l.inDescription]),
          `the pencil row's links, ${at}`,
        )
        .toEqual([["/crew", layer.pencilRow?.link, true]]);
      expect
        .soft(first?.links[0]?.height ?? 0, `the /crew link's height, ${at}`)
        .toBeGreaterThanOrEqual(24);
      if (isLive) {
        const d = first?.drawing;
        expect.soft(d?.text, `[data-drawing]'s text, ${at}`).toBe(DRAWING_NOW);
        expect
          .soft(
            d?.inDescription,
            `[data-drawing] in the Description cell, ${at}`,
          )
          .toBe(true);
        expect.soft(d?.clipped ?? null, `[data-drawing] cut, ${at}`).toBeNull();
        await page
          .locator("tr[data-pencil] [data-drawing]")
          .first()
          .evaluate((el) => el.scrollIntoView({ block: "center" }));
        const box = await page
          .locator("tr[data-pencil] [data-drawing]")
          .first()
          .evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
              vw: document.documentElement.clientWidth,
              vh: innerHeight,
            };
          })
          .catch(() => null);
        expect
          .soft(
            box !== null &&
              box.left >= -0.5 &&
              box.right <= box.vw + 0.5 &&
              box.right - box.left > 0,
            `"drawing now" within the viewport's width, ${at}: ${JSON.stringify(box)}`,
          )
          .toBe(true);
      } else {
        expect.soft(first?.drawing ?? null, `[data-drawing], ${at}`).toBeNull();
      }
      const lines = await page.evaluate((selector) => {
        const cell = document.querySelector(
          `${selector} tbody tr[data-pencil] > :nth-child(2)`,
        );
        if (!cell) return null;
        const range = document.createRange();
        range.selectNodeContents(cell);
        const s = getComputedStyle(cell);
        return {
          lines: new Set(
            [...range.getClientRects()]
              .filter((r) => r.width > 0)
              .map((r) => Math.round(r.top)),
          ).size,
          cut: cell.scrollWidth > cell.clientWidth + 1,
          ellipsis: s.textOverflow === "ellipsis" && s.overflowX !== "visible",
          labels: [
            ...document.querySelectorAll(
              `${selector} tbody tr[data-pencil] td[data-label]`,
            ),
          ].map((td) => {
            const before = getComputedStyle(td, "::before");
            return (
              td.getClientRects().length > 0 &&
              !["none", "normal"].includes(before.content) &&
              before.display !== "none" &&
              before.visibility !== "hidden"
            );
          }),
        };
      }, REVISIONS);
      if (width >= 1024) {
        expect
          .soft(lines?.lines, `the pencil row's Description lines, ${at}`)
          .toBe(1);
        expect
          .soft(
            Boolean(lines?.cut && !lines.ellipsis),
            `the pencil row's Description cut without an ellipsis, ${at}`,
          )
          .toBe(false);
      } else {
        expect
          .soft(lines?.labels, `the pencil row's folded labels shown, ${at}`)
          .toEqual([true, true, true, true]);
      }
    }
  }

  // The link lands on /crew.
  await openHome(page, live);
  await page.locator("tr[data-pencil] a[href='/crew']").first().click();
  await page.waitForURL(/\/crew$/);
  await expect(page.locator("h1")).toHaveText("Crew");

  // On the live site's /, none of the feed's now line, role lines, health line or moments.
  const body = crew.feed.body("home-live");
  const current = body.current as Record<string, unknown>;
  const words = [
    current.now,
    (current.health as Record<string, unknown>).line,
    ...(current.roles as Record<string, unknown>[]).map((r) => r.line),
    ...(current.moments as Record<string, unknown>[]).map((m) => m.text),
  ].filter((w): w is string => typeof w === "string" && w !== "");
  await openHome(page, live);
  const text = await page.evaluate(() => document.body.innerText);
  expect
    .soft(
      words.filter((w) => text.includes(w)),
      "the feed's now line, role lines, health line and moments on / of the live site",
    )
    .toEqual([]);
});

test("B4.17 copper only while live: on the live, open and resting fixtures and after a switch to down, in both schemes, at rest, hovering each link and focusing each stop, --accent paints only [data-drawing] and its dot, a [data-tip] or the copper swatch, and only in live; in live the shown drawing's tip, drawing now and the swatch are copper, and drawing now meets 4.5:1", async ({
  page,
  crew,
}) => {
  test.setTimeout(300_000);
  const sites = [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-open"),
    await homeOn(crew, "home-resting"),
    await downFrom(crew, "home-copper-down", { ageMs: 11 * 60_000 }),
  ];
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const shown of sites) {
      const isLive = shown.layer.home === "live";
      const at = `${shown.where}, ${scheme}`;
      await openHome(page, shown);
      const accent = await accentOf(page);
      expect(accent.length, "--accent resolves").toBe(4);
      await page.mouse.move(0, 0);
      await settled(page);
      const atRest = await copperOnHome(page, accent);
      const wrong: string[] = [];
      const note_ = (state: string, hits: typeof atRest) => {
        for (const h of hits)
          if (h.zone !== "layer" || !isLive)
            wrong.push(`${state}: ${h.where} ${h.property}`);
      };
      note_("at rest", atRest);
      if (isLive) {
        const shownTip = await page.evaluate(() =>
          [...document.querySelectorAll("[data-plan] [data-tip]")].some(
            (t) => t.getClientRects().length > 0,
          ),
        );
        expect.soft(shownTip, `a shown [data-tip], ${at}`).toBe(true);
        const parts = new Set<string | null>(atRest.map((h) => h.part));
        expect
          .soft(
            ["tip", "drawing", "swatch"].filter((part) => !parts.has(part)),
            `layer parts not painted copper at rest, ${at}`,
          )
          .toEqual([]);
        expect
          .soft(
            atRest.some(
              (h) =>
                h.part === "drawing" &&
                h.property === "color" &&
                h.text.includes(DRAWING_NOW),
            ),
            `"drawing now"'s text in copper, ${at}`,
          )
          .toBe(true);
        const ratios = (await textContrast(page)).filter((t) =>
          t.text.includes(DRAWING_NOW),
        );
        expect
          .soft(ratios.length, `"drawing now" read for contrast, ${at}`)
          .toBeGreaterThan(0);
        expect
          .soft(
            ratios
              .filter((t) => t.ratio < 4.5 - 0.005)
              .map((t) => `${t.text}: ${t.ratio.toFixed(2)}`),
            `"drawing now" under 4.5:1, ${at}`,
          )
          .toEqual([]);
      }
      const count = await page.locator("a[href]").count();
      for (let i = 0; i < count; i++) {
        const link = page.locator("a[href]").nth(i);
        const href = (await link.getAttribute("href")) ?? "";
        if (href === "#main" || !(await link.isVisible())) continue;
        await link.hover();
        await settled(page);
        note_(`hovering ${href}`, await copperOnHome(page, accent));
      }
      await page.mouse.move(0, 0);
      await openHome(page, shown);
      const stops = await page.locator("a[href], button").count();
      for (let press = 0; press < stops + 1; press++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const focused = await page.evaluate(
          () =>
            document.activeElement?.getAttribute("href") ??
            document.activeElement?.tagName ??
            "",
        );
        if (!focused || focused === "BODY") break;
        note_(`focused ${focused}`, await copperOnHome(page, accent));
      }
      expect
        .soft(
          [...new Set(wrong)],
          isLive
            ? `copper outside [data-drawing], its dot, [data-tip] and the copper swatch, ${at}`
            : `anything copper on /, ${at}`,
        )
        .toEqual([]);
    }
  }
});

test("B4.18 the rest line: on the resting fixture p[data-rest], the revision block's first element after the heading and caption and before the table, with no link or copper, reads the oracle's line with the merge's UTC day and time; with mergedAt null it drops the time, with last.sprint null it reads Crew resting., with 999 the same pattern; no pencil, tip or drawing now; the drawing, rows and legend as on the default server", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  await openHome(page, DEFAULT);
  const referenceBlock = await revisionBlock(page);
  const referencePlanks = await planksByView(page);
  // The oracle's lines, as the contract words them; a variant's site lasts until the next starts,
  // so each is read before the next.
  const variants: [string, Partial<Answer>, string][] = [
    [
      "home-resting",
      RESTING,
      "Crew resting. Sprint 29 merged 24 Oct, 02:47 UTC.",
    ],
    [
      "home-rest-nomerge",
      { fixture: "resting", patch: { last: { mergedAt: null } } },
      "Crew resting. Sprint 29 merged.",
    ],
    [
      "home-rest-nosprint",
      { fixture: "resting", patch: { last: { sprint: null } } },
      "Crew resting.",
    ],
    [
      "home-rest-999",
      { fixture: "resting", patch: { last: { sprint: 999 } } },
      "Crew resting. Sprint 999 merged 24 Oct, 02:47 UTC.",
    ],
  ];
  for (const [name, answer, line] of variants) {
    const shown = await homeOn(crew, name, answer);
    expect
      .soft(shown.layer.rest, `the oracle's rest line on ${name}`)
      .toBe(line);
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await openHome(page, shown, width, height);
      const at = `${shown.where} at ${width}`;
      const block = await revisionBlock(page);
      expect
        .soft(
          block.rest.map((r) => [
            r.tag,
            r.text,
            r.inBlock,
            r.afterCaption,
            r.beforeTable,
            r.links,
          ]),
          `[data-rest] on ${at}: tag, text, in the block, right after the heading and caption, before the table, links in it`,
        )
        .toEqual([["p", shown.layer.rest, true, true, true, 0]]);
      const accent = await accentOf(page);
      expect
        .soft(
          (await copperOnHome(page, accent)).map(
            (h) => `${h.where} ${h.property}`,
          ),
          `anything copper on / (the rest line included) on ${at}`,
        )
        .toEqual([]);
      const found = await hooks(page);
      expect
        .soft(
          [
            found["data-pencil"],
            found["data-live"],
            found["data-tip"],
            found["data-drawing"],
            found["data-key"],
          ],
          `data-pencil, data-live, data-tip, data-drawing and data-key on ${at}`,
        )
        .toEqual([0, 0, 0, 0, 0]);
      expect
        .soft(
          block.rows.map((r) => r.cells),
          `the rows on ${at}`,
        )
        .toEqual(referenceBlock.rows.map((r) => r.cells));
      expect
        .soft(block.legend, `the legend on ${at}`)
        .toEqual(referenceBlock.legend);
    }
    expect
      .soft(await planksByView(page), `the drawings on ${shown.where}`)
      .toEqual(referencePlanks);
  }
});

test("B4.19 the legend follows the drawing: live adds the pencil and copper items after Seated and Original, open the pencil item only, resting and down the two items as on the default server; the pencil swatch hatched with a dashed edge, the copper swatch painting --accent; their words In progress and Drawing now", async ({
  page,
  crew,
}) => {
  test.setTimeout(180_000);
  await openHome(page, DEFAULT);
  const reference = (await revisionBlock(page)).legend;
  expect(
    reference.map((item) => item.key),
    "the default server's legend: two items without data-key",
  ).toEqual([null, null]);
  for (const shown of [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-open"),
    await homeOn(crew, "home-resting"),
  ]) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openHome(page, shown);
      const at = `${shown.where}, ${scheme}`;
      const accent = await accentOf(page);
      const legend = (await revisionBlock(page)).legend;
      expect
        .soft(
          legend.map((item) => item.key),
          `the legend's items on ${at}`,
        )
        .toEqual([null, null, ...shown.layer.keys]);
      if (scheme === "light")
        expect
          .soft(legend.slice(0, 2), `Seated and Original on ${at}`)
          .toEqual(reference);
      const pencil = legend.find((item) => item.key === "pencil");
      if (shown.layer.keys.includes("pencil")) {
        expect
          .soft(
            pencil?.swatch?.image ?? "none",
            `the pencil swatch's hatch on ${at}`,
          )
          .not.toBe("none");
        expect
          .soft(pencil?.swatch?.border, `the pencil swatch's edge on ${at}`)
          .toBe("dashed");
      }
      if (shown.layer.keys.includes("copper")) {
        const swatch = (await copperOnHome(page, accent)).filter(
          (h) => h.part === "swatch",
        );
        expect
          .soft(
            swatch.length,
            `paints in --accent inside the copper item's swatch on ${at}`,
          )
          .toBeGreaterThan(0);
      }
      expect
        .soft(
          legend.slice(2).map((item) => item.text),
          `the added items' words on ${at}`,
        )
        .toEqual(
          shown.layer.keys.map(
            (key) => LEGEND_WORDS[key as keyof typeof LEGEND_WORDS],
          ),
        );
    }
  }
});

test("B4.20 down is today's sheet: after showing live, switched to 503 from an answer 9 min 50 s old, on its own site to an asOf 11 minutes old, and on the live fixture with sprint null: no hook of the layer, nothing copper, and main's outerHTML with scripts off equal to the default server's /", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(300_000);
  const reference = await withoutScripts(browser, DEFAULT);
  expect(reference.status, "status of / on the default server").toBe(200);
  for (const [name, answer, first] of [
    ["home-down-503", { status: 503 }, { ...LIVE, ageMs: 9 * 60_000 + 50_000 }],
    ["home-down-stale", { ageMs: 11 * 60_000 }, LIVE],
    ["home-down-nosprint", { patch: { current: { sprint: null } } }, LIVE],
  ] as const) {
    const shown = await downFrom(crew, name, answer, first);
    const off = await withoutScripts(browser, shown);
    expect.soft(off.status, `status of / on ${name}`).toBe(200);
    expect
      .soft(
        Object.values(off.hooks).every((n) => n === 0),
        `the layer's hooks in / on ${name}: ${JSON.stringify(off.hooks)}`,
      )
      .toBe(true);
    expect
      .soft(
        off.main === reference.main,
        `main's outerHTML on ${name} equals the default server's (${off.main.length} and ${reference.main.length} characters${firstDifference(off.main, reference.main)})`,
      )
      .toBe(true);
    await openHome(page, shown);
    const accent = await accentOf(page);
    expect
      .soft(
        (await copperOnHome(page, accent)).map(
          (h) => `${h.where} ${h.property}`,
        ),
        `anything copper on / on ${name}`,
      )
      .toEqual([]);
  }
});

/** Where two strings first differ, for a failure's message. */
function firstDifference(a: string, b: string) {
  if (a === b) return "";
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `; first difference at ${i}: "${a.slice(Math.max(0, i - 40), i + 60)}" against "${b.slice(Math.max(0, i - 40), i + 60)}"`;
}

// ---------------------------------------------------------------------------------------------
// B4.21: the hull, on the B3 harness.

/**
 * CSS px from the pencil plank's painted fill the canvas may differ in: the contract's band, at
 * least 5 px (amendment 1: the tip's 8 px dot sits past the seam by design).
 */
const BAND = 5;
/**
 * Triangles the tip may add while live: the contract's "plus the tip's segments", its run and dot
 * as fat lines, 6 triangles a segment in three's LineSegmentsGeometry. Pixel's a90b12d measured
 * 18 (3 segments) at 1440 and 390 on SwiftShader; 8 segments leave room for the run's shape and
 * fail on anything more, such as a mesh.
 */
const TIP_TRIANGLES = 6 * 8;
/** At rest the pencil seat is a sliver (Iris: about 80 x 8 px at 1440): one plank's share at most. */
const REST_SHARE = 0.05;
/** A channel difference that counts as a differing pixel (B3.7's 8 levels). */
const LEVELS = 8;

/**
 * The pencil plank's painted fill in the shown drawing, as a mask over `clip` (CSS px), tested
 * only inside the plank's box grown by 12 px.
 */
function plankMask(page: Page, drawing: string, seat: string, clip: Box) {
  return page.evaluate(
    ({ drawing, seat, clip }) => {
      const svg = document.querySelector<SVGSVGElement>(`${drawing} svg`);
      const plank = svg?.querySelector<SVGPathElement>(
        `path[data-plank="${seat}"]`,
      );
      const hull = svg?.querySelector<SVGPathElement>("clipPath path");
      const m = svg?.getScreenCTM();
      const mask = new Array<number>(clip.width * clip.height).fill(0);
      if (!svg || !plank || !hull || !m) return mask;
      const inverse = m.inverse();
      const r = plank.getBoundingClientRect();
      const x0 = Math.max(0, Math.floor(r.left - clip.x - 12));
      const x1 = Math.min(clip.width, Math.ceil(r.right - clip.x + 12));
      const y0 = Math.max(0, Math.floor(r.top - clip.y - 12));
      const y1 = Math.min(clip.height, Math.ceil(r.bottom - clip.y + 12));
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const p = new DOMPoint(
            clip.x + x + 0.5,
            clip.y + y + 0.5,
          ).matrixTransform(inverse);
          if (plank.isPointInFill(p) && hull.isPointInFill(p))
            mask[y * clip.width + x] = 1;
        }
      return mask;
    },
    { drawing, seat, clip },
  );
}

/** The mask grown by `r` px (a square neighbourhood). */
function grown(mask: number[], width: number, height: number, r: number) {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const [u, v] = [x + dx, y + dy];
          if (u >= 0 && v >= 0 && u < width && v < height)
            out[v * width + u] = 1;
        }
    }
  return out;
}

const differs = (a: Image, b: Image, i: number) =>
  [0, 1, 2, 3].some(
    (c) =>
      Math.abs((a.data[i * 4 + c] ?? 0) - (b.data[i * 4 + c] ?? 0)) > LEVELS,
  );

/** Canvas pixels within ΔE 10 of `accent` over `ground` (B3.7's test), by index. */
function copperAt(image: Image, accent: number[], ground: number[]) {
  const at: number[] = [];
  for (let i = 0; i < image.width * image.height; i++) {
    const a = (image.data[i * 4 + 3] ?? 0) / 255;
    if (a < 0.02) continue;
    const rgb = [0, 1, 2].map(
      (c) => (image.data[i * 4 + c] ?? 0) * a + (ground[c] ?? 0) * (1 - a),
    );
    if (deltaE(rgb, accent) < 10) at.push(i);
  }
  return at;
}

type HullRead = {
  first: Image;
  rest: Image;
  draws: number;
  triangles: number;
  firstTriangles: number;
  frames: number;
  atRest: number;
  /** The wide drawing's pencil number at rest, its box's centre in CSS px, when shown. */
  chip: { x: number; y: number } | null;
  errors: string[];
};

/** One clocked visit: frame 1 (landed on the drawing), then settled, then 2 s more. */
async function readHull(
  browser: Browser,
  base: string,
  size: { width: number; height: number },
  clip: Box,
): Promise<HullRead> {
  const run: ModelRun = await openModel(browser, { ...size, clock: true });
  await run.goto(`${base}/`);
  expect(
    await run.until(SHOWN, 4, FIRST),
    `frame 1 is landed on ${base || "the default server"}`,
  ).toBe("landed");
  const first = (await modelCoverage(run.page, clip)).image;
  expect(
    await run.until(["settled"], 50, 90_000),
    `settled on the clock on ${base || "the default server"}`,
  ).toBe("settled");
  await pause(200);
  const rest = (await modelCoverage(run.page, clip)).image;
  const chip = await run.page.evaluate(() => {
    const el = [...document.querySelectorAll(".plan-wide .plan-pencil")].find(
      (n) =>
        n.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    );
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  });
  const frames = await run.frames();
  const before = frames.length;
  await run.step(2000);
  await pause(300);
  const after = (await run.frames()).length;
  await run.close();
  return {
    first,
    rest,
    draws: Math.max(...frames.map((f) => f.draws)),
    triangles: Math.max(...frames.map((f) => f.triangles)),
    firstTriangles: frames[0]?.triangles ?? -1,
    frames: before,
    atRest: after - before,
    chip,
    errors: run.errors,
  };
}

test("B4.21 the hull agrees, and stays cheap and still: at 1440 x 900 and 390 x 844 on the live and open fixtures, at frame 1 on the drawing the canvas differs from the default server's only within 5 px of the pencil seat's plank and does differ there, copper only there in live and nowhere in open; settled it differs within one plank's share, copper shows in live only, and from 768 the pencil number's chip is centred in the differing box; at most 8 draws, triangles at most the default server's plus the tip's segments within the level, 0 frames in the 2 s after rest", async ({
  page,
  browser,
  crew,
}, testInfo) => {
  test.setTimeout(600_000);
  const sites = [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-open"),
  ];
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const drawing = drawingAt(size.width);
    // The drawing's box and tokens, read on the refused page.
    await openHome(page, DEFAULT, size.width, size.height);
    // The whole first viewport: the settled hull may leave the drawing's box.
    const clip: Box = { x: 0, y: 0, width: size.width, height: size.height };
    const colors = await resolveColors(page);
    const accent = colors["--accent"]?.rgba ?? [];
    const ground = colors["--background"]?.rgba ?? [];
    const reference = await readHull(browser, "", size, clip);
    for (const shown of sites) {
      const at = `${shown.where} at ${size.width}`;
      const seat = shown.layer.seat ?? "";
      await openHome(page, shown, size.width, size.height);
      const mask = await plankMask(page, drawing, seat, clip);
      const inside = mask.filter(Boolean).length;
      expect(
        inside,
        `pixels of ${seat}'s plank in ${drawing}, ${at}`,
      ).toBeGreaterThan(0);
      const band = grown(mask, clip.width, clip.height, BAND);
      const read = await readHull(browser, shown.base, size, clip);
      let outside = 0;
      let within = 0;
      for (let i = 0; i < clip.width * clip.height; i++) {
        if (!differs(read.first, reference.first, i)) continue;
        if (band[i]) within++;
        else outside++;
      }
      const copperFirst = copperAt(read.first, accent, ground);
      const copperRest = copperAt(read.rest, accent, ground);
      let restDiffer = 0;
      let covered = 0;
      const box = {
        left: Infinity,
        top: Infinity,
        right: -Infinity,
        bottom: -Infinity,
      };
      for (let i = 0; i < clip.width * clip.height; i++) {
        if ((reference.rest.data[i * 4 + 3] ?? 0) > 5) covered++;
        if (!differs(read.rest, reference.rest, i)) continue;
        restDiffer++;
        const [x, y] = [i % clip.width, Math.floor(i / clip.width)];
        box.left = Math.min(box.left, x);
        box.right = Math.max(box.right, x + 1);
        box.top = Math.min(box.top, y);
        box.bottom = Math.max(box.bottom, y + 1);
      }
      note(
        testInfo,
        "hull",
        `${at}: frame 1 differs from the default server's in ${within} px within ${BAND} px of ${seat}'s plank (${inside} px) and ${outside} px outside; copper ${copperFirst.length} px at frame 1 (${copperFirst.filter((i) => !band[i]).length} outside), ${copperRest.length} settled; settled differs in ${restDiffer} px of the hull's ${covered} (box ${JSON.stringify(box)}, the chip's centre ${JSON.stringify(read.chip)}); ${read.draws} draws, ${read.triangles} triangles (default ${reference.triangles}), ${read.frames} frames, ${read.atRest} in the 2 s after rest. SwiftShader.`,
      );
      expect
        .soft(
          outside,
          `frame-1 pixels differing from the default server's more than ${BAND} px from ${seat}'s plank, ${at}`,
        )
        .toBe(0);
      expect
        .soft(
          within / inside,
          `share of ${seat}'s plank differing at frame 1 (the hatch), ${at}`,
        )
        .toBeGreaterThan(0.05);
      expect
        .soft(
          restDiffer,
          `settled pixels differing from the default server's, ${at}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(
          restDiffer / Math.max(1, covered),
          `share of the settled hull differing from the default server's (one plank's at most), ${at}`,
        )
        .toBeLessThanOrEqual(REST_SHARE);
      if (size.width >= 768) {
        const c = read.chip;
        expect
          .soft(
            Boolean(
              c &&
                c.x >= box.left &&
                c.x <= box.right &&
                c.y >= box.top &&
                c.y <= box.bottom,
            ),
            `the pencil number's chip centre ${JSON.stringify(c)} inside the settled plank's box ${JSON.stringify(box)}, ${at}`,
          )
          .toBe(true);
      }
      if (shown.layer.home === "live") {
        expect
          .soft(copperFirst.length, `copper pixels at frame 1, ${at}`)
          .toBeGreaterThan(0);
        expect
          .soft(
            copperFirst.filter((i) => !band[i]).length,
            `copper pixels at frame 1 away from ${seat}'s plank, ${at}`,
          )
          .toBe(0);
        expect
          .soft(copperRest.length, `copper pixels settled, ${at}`)
          .toBeGreaterThan(0);
      } else {
        expect
          .soft(
            copperFirst.length + copperRest.length,
            `copper pixels at frame 1 and settled, ${at}`,
          )
          .toBe(0);
      }
      expect
        .soft(read.draws, `the most draws in a frame, ${at}`)
        .toBeLessThanOrEqual(8);
      const tip = shown.layer.home === "live" ? TIP_TRIANGLES : 0;
      expect
        .soft(
          read.triangles,
          `the most triangles in a frame, against the default server's ${reference.triangles} plus ${tip} for the tip, ${at}`,
        )
        .toBeLessThanOrEqual(reference.triangles + tip);
      expect
        .soft(
          read.firstTriangles,
          `frame 1's triangles, against the default server's ${reference.firstTriangles} plus ${tip} for the tip, ${at}`,
        )
        .toBeLessThanOrEqual(reference.firstTriangles + tip);
      expect
        .soft(read.triangles, `triangles within the level, ${at}`)
        .toBeLessThanOrEqual(TRIANGLES_AT(size.width));
      expect.soft(read.atRest, `frames in the 2 s after rest, ${at}`).toBe(0);
      expect.soft(read.errors, `console errors, ${at}`).toEqual([]);
    }
    expect
      .soft(
        reference.atRest,
        `frames in the 2 s after rest on the default server at ${size.width}`,
      )
      .toBe(0);
  }
});

test("B4.22 the first screen in every state: B1.1's assertions on the live, open and resting fixtures at 1440 x 900 (with the five rows) and 390 x 844, both schemes; the resting fixture's contact links inside at 1024 x 768; at 1440 x 900 the pencil row in live and open and the rest line in resting wholly inside the viewport", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  for (const shown of [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-open"),
    await homeOn(crew, "home-resting"),
  ]) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      if (shown.layer.home === "resting") {
        // Iris measured 9.9 px to spare at 1024 x 768 with the rest line.
        await openHome(page, shown, 1024, 768);
        const found = await firstScreen(page);
        expect
          .soft(
            found.items
              .filter((item) => item.what.startsWith("the title block's link"))
              .filter(({ box }) => !insideViewport(box, found.viewport))
              .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
            `contact links not wholly inside the first viewport on ${shown.where} at 1024 x 768, ${scheme}`,
          )
          .toEqual([]);
      }
      for (const [width, height, withRows] of [
        [1440, 900, true],
        [390, 844, false],
      ] as const) {
        await openHome(page, shown, width, height);
        const where = `${shown.where} at ${width} x ${height}, ${scheme}`;
        const found = await firstScreen(page);
        const checked = withRows
          ? [...found.items, ...found.rows]
          : found.items;
        if (withRows)
          expect
            .soft(found.rows, `revision rows on ${where}`)
            .toHaveLength(ROWS_SHOWN);
        expect
          .soft(
            checked
              .filter(({ box }) => !insideViewport(box, found.viewport))
              .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
            `not wholly inside the first viewport on ${where}`,
          )
          .toEqual([]);
        const sizes = await textSizes(page);
        expect(sizes.h1, `the h1's font size on ${where}`).toBeGreaterThan(0);
        expect
          .soft(
            sizes.others.filter(({ size }) => size >= sizes.h1),
            `text as large as the h1 (${sizes.h1} px) on ${where}`,
          )
          .toEqual([]);
        if (withRows) {
          const block = await revisionBlock(page);
          const layerBox =
            shown.layer.home === "resting"
              ? block.restBox
              : (block.rows.find((r) => r.pencil)?.box ?? null);
          expect
            .soft(
              insideViewport(layerBox, found.viewport),
              `${shown.layer.home === "resting" ? "the rest line" : "the pencil row"} wholly inside the first viewport on ${where}: ${JSON.stringify(layerBox)}`,
            )
            .toBe(true);
        }
      }
    }
  }
});

/** Every script `/` fetches (path and decoded bytes), with WebGL refused or on. */
async function scriptsOf(browser: Browser, base: string, refuse: boolean) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  if (refuse) await context.addInitScript(refuseWebGl);
  const page = await context.newPage();
  const bodies: Promise<[string, number]>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    bodies.push(
      response.body().then(
        (b) => [new URL(response.url()).pathname, b.length] as [string, number],
        () =>
          [new URL(response.url()).pathname, Number.NaN] as [string, number],
      ),
    );
  });
  const response = await page.goto(`${base}/`);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const list = (await Promise.all(bodies)).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  await context.close();
  return { status: response?.status(), list };
}

test("B4.23 server-rendered, no new client code: on the live fixture with scripts off the HTML holds the pencil row, the pencil planks and the tips as with them on, and the rest line on the resting fixture; with WebGL refused / requests the default server's script files by path with the same bytes, and with WebGL on the same 3D chunk", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const live = await homeOn(crew, "home-live");
  const resting = await homeOn(crew, "home-resting");
  for (const shown of [live, resting]) {
    const off = await withoutScripts(browser, shown);
    await openHome(page, shown);
    const on = await page.evaluate(
      (selectors) =>
        Object.fromEntries(
          selectors.map((s) => [s, document.querySelectorAll(s).length]),
        ),
      Object.keys(off.hooks),
    );
    expect
      .soft(
        off.hooks,
        `the layer's hooks with scripts off against on, ${shown.where}`,
      )
      .toEqual(on);
    const want =
      shown.layer.home === "live"
        ? {
            "tr[data-pencil]": 1,
            "tr[data-live]": 1,
            "path[data-plank][data-pencil]": 2,
            "path[data-plank][data-live]": 2,
            "[data-tip]": 2,
          }
        : { "p[data-rest]": 1 };
    expect
      .soft(off.hooks, `the layer in the HTML with scripts off, ${shown.where}`)
      .toEqual(expect.objectContaining(want));
  }
  for (const refuse of [true, false]) {
    const reference = await scriptsOf(browser, "", refuse);
    const fixture = await scriptsOf(browser, live.base, refuse);
    expect(reference.status, "status of / on the default server").toBe(200);
    expect
      .soft(
        fixture.list,
        `script files and decoded bytes on / of the live site against the default server's, WebGL ${refuse ? "refused" : "on"}`,
      )
      .toEqual(reference.list);
  }
});

test("B4.24 the sweeps, on the layer: on the live and resting fixtures in both schemes, axe with the strict tags at 1440 and 390, every text in a token, text contrast, no overflow at 320 or 390, the /crew link at least 24 x 24 and reached by Tab after the title block's Contact links and before the Log link with one 2 px ink ring 2 px out, and nothing animating at load, 2 s later or after a scroll to the bottom and back", async ({
  page,
  crew,
}) => {
  test.setTimeout(300_000);
  await openHome(page, DEFAULT);
  const animationsToday = await page.evaluate(
    () => document.getAnimations().length,
  );
  for (const shown of [
    await homeOn(crew, "home-live"),
    await homeOn(crew, "home-resting"),
  ]) {
    const isLive = shown.layer.home === "live";
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [1440, 390]) {
        const at = `${shown.where} at ${width}, ${scheme}`;
        await openHome(page, shown, width);
        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .analyze();
        expect
          .soft(
            results.violations.map((v) => ({
              rule: v.id,
              targets: v.nodes.map((n) => n.target.join(" ")),
            })),
            `axe on ${at}`,
          )
          .toEqual([]);
        const { tokenColors, tokenSizes, texts } = await textStyles(page);
        expect
          .soft(
            texts
              .filter(
                (t) =>
                  !tokenColors.includes(t.color) ||
                  !tokenSizes.includes(t.fontSize),
              )
              .map((t) => `${t.element}: ${t.color}, ${t.fontSize}`),
            `text not in a token on ${at}`,
          )
          .toEqual([]);
        expect
          .soft(
            (await textContrast(page))
              .filter((t) => t.ratio < t.floor - 0.005)
              .map(
                (t) => `${t.text}: ${t.ratio.toFixed(2)}:1 (floor ${t.floor})`,
              ),
            `text under its contrast floor on ${at}`,
          )
          .toEqual([]);
        if (isLive) {
          const target = await page.evaluate(() => {
            const a = document.querySelector("tr[data-pencil] a[href='/crew']");
            const r = a?.getBoundingClientRect();
            return r ? { width: r.width, height: r.height } : null;
          });
          expect
            .soft(
              Boolean(target && target.width >= 24 && target.height >= 24),
              `the /crew link's box ${JSON.stringify(target)} at least 24 x 24 on ${at}`,
            )
            .toBe(true);
        }
      }
      for (const width of [320, 390]) {
        await openHome(page, shown, width, 844);
        // The innermost elements past the viewport's right edge, for the failure's message.
        const past = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          return [...document.body.querySelectorAll("*")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width > 0 &&
                r.right > cw + 0.5 &&
                ![...el.children].some(
                  (c) => c.getBoundingClientRect().right > cw + 0.5,
                )
              );
            })
            .slice(0, 6)
            .map(
              (el) =>
                `<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}"> "${(el.textContent ?? "").trim().slice(0, 30)}" to ${el.getBoundingClientRect().right.toFixed(1)}`,
            );
        });
        expect
          .soft(
            await horizontalOverflow(page),
            `overflow on ${shown.where} at ${width}, ${scheme}: ${past.join("; ")}`,
          )
          .toBe(0);
      }

      // Tab: the title block's Contact links, then the /crew link, then the Log link.
      await openHome(page, shown);
      const ink = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--foreground)";
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      });
      const stops: { href: string; ring: string; rings: number }[] = [];
      const total = await page.locator("a[href], button").count();
      for (let i = 0; i < total + 1; i++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const at = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const s = getComputedStyle(el);
          return {
            href: el.getAttribute("href") ?? `<${el.tagName.toLowerCase()}>`,
            ring: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
            rings: [el, ...el.querySelectorAll("*")].filter((c) => {
              const cs = getComputedStyle(c);
              return (
                cs.outlineStyle !== "none" &&
                Number.parseFloat(cs.outlineWidth) > 0
              );
            }).length,
          };
        });
        if (!at) break;
        stops.push(at);
      }
      const hrefs = stops.map((s) => s.href);
      const contact = profile.links.map((l) => l.href);
      const lastContact = Math.max(...contact.map((h) => hrefs.indexOf(h)));
      // The revision block's Log link: the first /log after the title block's links (the bar has one).
      const log = hrefs.indexOf("/log", lastContact);
      if (isLive) {
        const crewAt = hrefs.indexOf("/crew", lastContact);
        expect
          .soft(
            [crewAt - lastContact, log - crewAt],
            `the /crew link's place in the Tab order on ${shown.where}, ${scheme}: ${hrefs.join(" ")}`,
          )
          .toEqual([1, 1]);
        const stop = stops[crewAt];
        expect
          .soft(
            stop ? [stop.rings, stop.ring] : null,
            `the /crew link's ring on ${shown.where}, ${scheme}`,
          )
          .toEqual([1, `solid 2px ${ink} 2px`]);
      } else {
        expect
          .soft(
            log - lastContact,
            `the Log link right after the Contact links on ${shown.where}, ${scheme}: ${hrefs.join(" ")}`,
          )
          .toBe(1);
      }

      // Nothing animates: at load, 2 s later, and after a scroll to the bottom and back.
      await openHome(page, shown);
      const running = () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .filter((a) => a.playState === "running")
            .map((a) => {
              const target = (a.effect as KeyframeEffect | null)?.target;
              return `${a.constructor.name} on <${target?.tagName.toLowerCase() ?? "?"}${target?.getAttribute("class") ? ` class="${target.getAttribute("class")}"` : ""}>`;
            }),
        );
      const atLoad = await running();
      await page.evaluate(() => new Promise((done) => setTimeout(done, 2000)));
      const later = await running();
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      await page.evaluate(() => new Promise((done) => setTimeout(done, 300)));
      await page.evaluate(() => scrollTo(0, 0));
      await page.evaluate(() => new Promise((done) => setTimeout(done, 300)));
      const scrolled = await running();
      expect
        .soft(
          { atLoad, later, scrolled },
          `running animations on ${shown.where}, ${scheme} (the default server has ${animationsToday} animations at load)`,
        )
        .toEqual({ atLoad: [], later: [], scrolled: [] });
    }
  }
});
