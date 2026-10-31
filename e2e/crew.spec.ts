import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import { SITE_URL } from "../lib/site";
import {
  copperPaint,
  type Expected,
  expected,
  RULES,
  readPanel,
  textContrast,
} from "./crew";
import {
  type Answer,
  type Crew,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import {
  composite,
  contrast,
  installRgba,
  measureLcp,
  resolveColors,
  SCHEMES,
  textStyles,
} from "./helpers";
import { refuseWebGl } from "./webgl";

// Sprint 31, B4a (.crew/sprint/31/contract.md): `/crew` from the Studio's feed. The feed can't be
// reached from CI or the cloud, so these checks serve fixtures of its shape (e2e/fixtures/crew,
// .crew/sprint/28/feed-contract.md) from e2e/crew-feed.ts and start a `next start` of their own on
// the checkout's build with CREW_FEED_URL pointed at them. The suite's webServer has no feed URL,
// so the down state is checked there.
//
// The wait: CI builds once without CREW_FEED_URL, so a site serves the build's prerender (down)
// until the cached read revalidates; each check reads `/crew` until it shows the state it expects,
// at most STATE_WAIT ms, and reports how long it took. A variant whose state is a fixture's (a
// quoted now line, quiet, sprint 999, no merge time) gets a site of its own, so its first state
// after the build's is the variant's; a down variant first shows live on its own site, then the
// channel switches and the check waits for down, so a page that never read the variant can't pass
// on the build's prerender.
//
// The site's server runs at UTC+14 and the browser in Los Angeles (B4.7), for every check here.

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const SKIP = 'a[href="#main"]';

// One test at a time, in order, on one worker, as the contract's harness says ("The spec runs
// serially"): the worker's fixture server and sites serve every check in the file, so the file
// starts its sites once. "default", not "serial": a failed check doesn't skip the ones after it.
test.describe.configure({ mode: "default" });
// Against a deployed site (PLAYWRIGHT_BASE_URL) no build is served without a feed, and the sites
// would copy a `.next` that isn't what's deployed: neither the down state nor the fixtures apply.
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

// The variants' answers, shared by their checks and the beforeAll that starts them.
const QUOTED: Partial<Answer> = {
  fixture: "live",
  patch: {
    current: {
      health: {
        state: "working",
        label: "Working",
        line: "Briefing Probe on the fixtures, then the harness.",
        quote: true,
      },
    },
  },
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
const RESTING_VARIANTS = [
  ["resting", undefined],
  ["resting-999", { last: { sprint: 999 } }],
  ["resting-no-merge", { last: { mergedAt: null } }],
] as const;

// Every site's wait starts here, together, so a worker waits out the regenerations once: the
// fixtures' first states, the down variants' switches and the kept reads' windows overlap. Each
// check then awaits its own scenario and asserts on what it saw, as before.
test.beforeAll(({ crew }) => {
  for (const fixture of ["live", "open"] as const)
    void reach(crew, fixture, { fixture });
  for (const [name, patch] of RESTING_VARIANTS)
    void reach(crew, name, { fixture: "resting", patch });
  void reach(crew, "live-quote", QUOTED);
  void reach(crew, "open-quiet", QUIET);
  for (const [name, answer, , first] of DOWNS)
    void downScenario(crew, name, answer, first);
  for (const [kind, answer] of FAILED_READS)
    void keptScenario(crew, kind, answer);
});
// Sprint 36 (B4d, .crew/sprint/36/contract.md, "The live checks") puts the model on /crew, and it
// restyles the drawing these checks read. So every context here refuses WebGL (the Off path, as
// sprint 33 did for /log): this beforeEach for `page`, and `refuseWebGl` in each context a test
// opens itself. The model's own checks are crew-model.spec.ts and its siblings.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

test("B4 harness: the fixture server answers each fixture with the Studio's headers and a fresh asOf, a 503 with no-store, a stale asOf and a late answer as set; a site of its own pointed at the live fixture shows live on /crew", async ({
  crew,
  request,
}, testInfo) => {
  test.setTimeout(120_000);
  const { feed } = crew;
  // The Playwright request context trusts no test CA, so it reads the feed without checking it.
  const read = async (url: string) => {
    const started = Date.now();
    const response = await request.get(url, { ignoreHTTPSErrors: true });
    return {
      status: response.status(),
      cache: response.headers()["cache-control"],
      type: response.headers()["content-type"],
      json: (await response.json()) as Record<string, unknown>,
      ms: Date.now() - started,
    };
  };
  for (const fixture of ["live", "open", "resting"] as const) {
    const answer = await read(feed.set(`check-${fixture}`, { fixture }));
    expect.soft(answer.status, `status of the ${fixture} fixture`).toBe(200);
    expect
      .soft(answer.cache, `cache-control of the ${fixture} fixture`)
      .toBe("public, max-age=0, s-maxage=15, stale-while-revalidate=45");
    expect
      .soft(answer.type, `content-type of the ${fixture} fixture`)
      .toBe("application/json");
    expect.soft(answer.json.version, `version of ${fixture}`).toBe(1);
    expect
      .soft(
        Math.abs(Date.now() - Date.parse(String(answer.json.asOf))),
        `asOf of ${fixture}, ms from now`,
      )
      .toBeLessThan(5_000);
    expect
      .soft(
        JSON.stringify(answer.json).includes(feed.origin),
        `${fixture}'s Studio links on the server's own origin`,
      )
      .toBe(true);
  }
  const failed = await read(feed.set("check-503", { status: 503 }));
  expect
    .soft([failed.status, failed.cache], "a 503")
    .toEqual([503, "no-store"]);
  const stale = await read(feed.set("check-stale", { ageMs: 11 * 60_000 }));
  expect
    .soft(
      Date.now() - Date.parse(String(stale.json.asOf)),
      "a stale asOf, ms old",
    )
    .toBeGreaterThan(600_000);
  const late = await read(feed.set("check-late", { delayMs: 2_500 }));
  expect.soft(late.ms, "a late answer, ms").toBeGreaterThanOrEqual(2_500);

  const site = await crew.site("live", { fixture: "live" });
  const shown = await untilState(site.baseURL, "live", STATE_WAIT);
  testInfo.annotations.push({
    type: "state-wait",
    description: `live showed on a site of its own after ${shown.ms} ms (${feed.reads("live")} feed reads)`,
  });
  expect(
    shown.seen,
    `/crew's [data-crew-state] on a site pointed at the live fixture, after ${shown.ms} ms`,
  ).toBe("live");
  expect(feed.reads("live"), "reads of the live fixture").toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------------------------

type Shown = { base: string; exp: Expected; where: string };

/** The suite's webServer: no feed URL, so `down`. */
const DEFAULT: Shown = {
  base: "",
  exp: expected(null, null),
  where: "the default server",
};

type Reached = { base: string; exp: Expected; seen: string; ms: number };

/**
 * The scenario behind onFixture: a site of its own on channel `name`, set to `answer`, read until
 * `/crew` shows the oracle's state for what the channel serves (at most STATE_WAIT ms), once per
 * worker. It asserts nothing: onFixture does.
 */
function reach(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
): Promise<Reached> {
  return crew.once(`reach ${name}`, async () => {
    const site = await crew.site(name, answer, true);
    const exp = expected(crew.feed.body(name), crew.feed.origin);
    const shown = await untilState(site.baseURL, exp.state, STATE_WAIT);
    return { base: site.baseURL, exp, ...shown };
  });
}

/**
 * A site of its own on channel `name`, set to `answer`, read until it shows the oracle's state
 * for what the channel serves (at most STATE_WAIT ms): the polling rule.
 */
async function onFixture(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
): Promise<Shown> {
  const { base, exp, seen, ms } = await reach(crew, name, answer);
  test.info().annotations.push({
    type: "state-wait",
    description: `${name}: ${seen} after ${ms} ms`,
  });
  expect(
    seen,
    `/crew's [data-crew-state] on the ${name} site within ${STATE_WAIT} ms (the last state seen)`,
  ).toBe(exp.state);
  return { base, exp, where: `the ${name} fixture` };
}

/** The scenario behind downFrom: live first, then the switch, then down, once per worker. */
function downScenario(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
  first: Partial<Answer> = {},
) {
  return crew.once(`down ${name}`, async () => {
    const live = await reach(crew, name, { fixture: "live", ...first });
    if (live.seen !== live.exp.state) return { live, down: null };
    crew.feed.set(name, answer);
    return { live, down: await untilState(live.base, "down", STATE_WAIT) };
  });
}

/**
 * A down variant: its site shows live first (from `first`), then the channel switches to `answer`
 * and the check waits for down, so the down it reads came from the variant, not the build's
 * prerender.
 */
async function downFrom(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
  first: Partial<Answer> = {},
) {
  const { live, down } = await downScenario(crew, name, answer, first);
  test.info().annotations.push({
    type: "state-wait",
    description: `${name}: ${live.seen} after ${live.ms} ms; ${down?.seen ?? "no switch"} ${down?.ms ?? "-"} ms after the switch`,
  });
  expect(
    live.seen,
    `/crew's [data-crew-state] on the ${name} site within ${STATE_WAIT} ms (the last state seen)`,
  ).toBe(live.exp.state);
  expect(
    down?.seen,
    `/crew's [data-crew-state] within ${STATE_WAIT} ms of the switch to ${name} (the last state seen)`,
  ).toBe("down");
  return { base: live.base, exp: expected(null, null), where: name };
}

async function openCrew(page: Page, shown: Shown, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${shown.base}/crew`);
  expect(response?.status(), `status of /crew on ${shown.where}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

const bare = (text: string) => text.replace(/\s+/g, "");

/** The panel against the oracle, field by field. */
async function panelIs(page: Page, shown: Shown) {
  const { exp, where } = shown;
  const found = await readPanel(page);
  expect.soft(found.panels, `crew panels on ${where}`).toBe(1);
  expect.soft(found.state, `[data-crew-state] on ${where}`).toBe(exp.state);
  expect.soft(found.h1, `the h1 on ${where}`).toBe("Crew");
  expect.soft(found.statuses, `[data-status] on ${where}`).toBe(1);
  expect.soft(found.status, `the status line on ${where}`).toBe(exp.status);
  // The number and the goal may sit in elements of their own: compared without spaces.
  expect.soft(bare(found.chip), `the chip on ${where}`).toBe(bare(exp.chip));
  expect
    .soft(found.rows, `the crew table's rows on ${where}`)
    .toEqual(exp.rows);
  expect
    .soft(
      found.now
        ? {
            text: bare(found.now.text),
            quotes: found.now.quotes,
            beforeList: found.now.beforeList,
          }
        : null,
      `[data-now] on ${where}`,
    )
    .toEqual(
      exp.now
        ? {
            text: bare(exp.now.text),
            quotes: exp.now.quoted ? [exp.now.quoted] : [],
            beforeList: true,
          }
        : null,
    );
  expect
    .soft(found.nows, `[data-now] elements on ${where}`)
    .toBe(exp.now ? 1 : 0);
  expect
    .soft(found.heading, `the activity heading on ${where}`)
    .toBe(exp.heading);
  expect
    .soft(found.lists, `ol[data-moments] on ${where}`)
    .toBe(exp.moments.length > 0 ? 1 : 0);
  expect.soft(found.moments, `the moments on ${where}`).toEqual(exp.moments);
  expect
    .soft([...found.links].sort(), `Evidence's links on ${where}`)
    .toEqual([...exp.links].sort());
  for (const words of exp.evidenceText) {
    expect.soft(found.evidence, `Evidence on ${where}`).toContain(words);
  }
  expect.soft(found.approval, `Approval on ${where}`).toBe(exp.approval);
  expect.soft(found.rules, `Rules on ${where}`).toBe(exp.rules);
  return found;
}

// ---------------------------------------------------------------------------------------------

test("B4.1 the route: /crew is 200 with scripts on and off, the skip link first landing on main#main, one main and one h1 Crew, the drawing aria-hidden and seated as on / with nothing hatched, no canvas with WebGL refused or scripts off (sprint 36: the model and the control are B4.36's and B4.41's), the panel's parts in order, its title, description, canonical, og:url and one og:image and twitter:image as PNG, and in the sitemap", async ({
  page,
  browser,
  request,
}) => {
  await openCrew(page, DEFAULT);
  // Each plank once, with its seat: / draws the plan twice (the wide and the narrow drawing).
  const plankList = () =>
    page.evaluate(() =>
      [
        ...new Set(
          [...document.querySelectorAll("[data-plan] path[data-plank]")].map(
            (p) =>
              `${p.getAttribute("data-plank")} ${p.getAttribute("data-sprint") ?? "original"}`,
          ),
        ),
      ].sort(),
    );
  const crew = await page.evaluate(() => {
    const squashed = (el: Element | null | undefined) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const panel = document.querySelector('section[aria-labelledby="crew"]');
    const parts = [
      "h1#crew",
      'a[data-close][href="/"]',
      "[data-chip]",
      "[data-status]",
      "table",
      "ol[data-moments]",
      "dl",
      "[data-evidence]",
      "[data-approval]",
      "[data-rules]",
    ].map((selector) => ({ selector, el: panel?.querySelector(selector) }));
    const present = parts.filter((p) => p.el);
    const ordered = present.every((p, i) => {
      const before = present[i - 1]?.el;
      return (
        !before ||
        Boolean(
          before.compareDocumentPosition(p.el as Element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    });
    const plan = document.querySelector("[data-plan]");
    const dl = panel?.querySelector("dl");
    return {
      firstLink: document.querySelector("a")?.getAttribute("href") ?? null,
      mains: document.querySelectorAll("main").length,
      mainId: document.querySelector("main")?.id ?? null,
      mainTabindex: document.querySelector("main")?.getAttribute("tabindex"),
      h1s: [...document.querySelectorAll("h1")].map((h) => squashed(h)),
      planHidden: plan?.getAttribute("aria-hidden") ?? null,
      planInMain: Boolean(plan?.closest("main")),
      hatched:
        (plan?.querySelectorAll("pattern").length ?? 0) +
        [...(plan?.querySelectorAll("*") ?? [])].filter((el) =>
          /url\(/.test(
            `${getComputedStyle(el).fill} ${getComputedStyle(el).stroke}`,
          ),
        ).length,
      model: document.querySelectorAll("canvas").length,
      panel: Boolean(panel?.closest("main")),
      state: panel?.getAttribute("data-crew-state") ?? null,
      missing: parts
        .filter((p) => !p.el && p.selector !== "ol[data-moments]")
        .map((p) => p.selector),
      ordered,
      inDl: ["[data-evidence]", "[data-approval]", "[data-rules]"].map((s) =>
        Boolean(dl?.querySelector(s)),
      ),
      meta: {
        title: document.title,
        description: [
          ...document.querySelectorAll<HTMLMetaElement>(
            'meta[name="description"]',
          ),
        ].map((m) => m.content),
        canonical: [
          ...document.querySelectorAll<HTMLLinkElement>(
            'link[rel="canonical"]',
          ),
        ].map((l) => l.href),
        ogUrl: [
          ...document.querySelectorAll<HTMLMetaElement>(
            'meta[property="og:url"]',
          ),
        ].map((m) => m.content),
        og: [
          ...document.querySelectorAll<HTMLMetaElement>(
            'meta[property="og:image"]',
          ),
        ].map((m) => m.content),
        twitter: [
          ...document.querySelectorAll<HTMLMetaElement>(
            'meta[name="twitter:image"]',
          ),
        ].map((m) => m.content),
      },
    };
  });
  const crewPlanks = await plankList();
  expect.soft(crew.firstLink, "the first link on /crew").toBe("#main");
  expect.soft(crew.mains, "main elements").toBe(1);
  expect
    .soft([crew.mainId, crew.mainTabindex], "main's id and tabindex")
    .toEqual(["main", "-1"]);
  expect.soft(crew.h1s, "h1s on /crew").toEqual(["Crew"]);
  expect.soft(crew.planHidden, "[data-plan] aria-hidden").toBe("true");
  expect.soft(crew.planInMain, "[data-plan] in main").toBe(true);
  expect.soft(crew.hatched, "hatched parts of the drawing").toBe(0);
  expect.soft(crew.model, "canvas on /crew, WebGL refused").toBe(0);
  expect.soft(crew.panel, "the panel in main").toBe(true);
  expect
    .soft(crew.state, "[data-crew-state] on the default server")
    .toBe("down");
  expect.soft(crew.missing, "the panel's parts missing").toEqual([]);
  expect
    .soft(crew.ordered, "the panel's parts in the data rules' order")
    .toBe(true);
  expect
    .soft(crew.inDl, "Evidence, Approval and Rules in the panel's dl")
    .toEqual([true, true, true]);
  await expect
    .soft(
      page.getByRole("link", { name: "Close", exact: true }),
      "one link named Close",
    )
    .toHaveCount(1);
  expect
    .soft(
      await page
        .getByRole("link", { name: "Close", exact: true })
        .evaluate((a) => a.matches('a[data-close][href="/"]'))
        .catch(() => false),
      "Close is a[data-close] to /",
    )
    .toBe(true);

  // The skip link first, landing on main.
  await page.keyboard.press("Tab");
  expect
    .soft(
      await page.evaluate(() => document.activeElement?.getAttribute("href")),
      "the first Tab stop",
    )
    .toBe("#main");
  await page.keyboard.press("Enter");
  await expect.soft
    .poll(() => page.evaluate(() => document.activeElement?.id ?? ""), {
      message: "focus after the skip link",
    })
    .toBe("main");

  // Seated as on /.
  await page.goto("/");
  expect.soft(crewPlanks.length, "planks drawn on /crew").toBeGreaterThan(0);
  expect
    .soft(crewPlanks, "/crew's planks, ids and seats against /'s")
    .toEqual(await plankList());

  // Metadata.
  const url = `${SITE_URL}/crew`;
  expect.soft(crew.meta.title, "the title").toBe(`Crew — ${profile.name}`);
  expect
    .soft(crew.meta.description, "the description")
    .toEqual([
      "A crew of AI agents rebuilds this site in public. This page shows who is working on it now, and who approves the work.",
    ]);
  expect.soft(crew.meta.canonical, "canonical").toEqual([url]);
  expect.soft(crew.meta.ogUrl, "og:url").toEqual([url]);
  for (const [name, urls] of [
    ["og:image", crew.meta.og],
    ["twitter:image", crew.meta.twitter],
  ] as const) {
    expect.soft(urls, name).toHaveLength(1);
    if (urls.length !== 1) continue;
    const image = await request.get(new URL(urls[0] ?? "").pathname);
    expect.soft(image.status(), `status of the ${name}`).toBe(200);
    expect
      .soft(image.headers()["content-type"], `${name} type`)
      .toBe("image/png");
  }
  const sitemap = await request.get("/sitemap.xml");
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  expect.soft(locs, "URLs in the sitemap").toContain(url);

  // Scripts off: 200, and the same panel.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noScript = await context.newPage();
  const response = await noScript.goto("/crew");
  expect.soft(response?.status(), "status of /crew with scripts off").toBe(200);
  const off = await readPanel(noScript);
  const canvases = await noScript.evaluate(
    () => document.querySelectorAll("canvas").length,
  );
  await context.close();
  expect
    .soft(
      { state: off.state, h1: off.h1, rows: off.rows.length, canvases },
      "/crew with scripts off, and its canvases",
    )
    .toEqual({ state: "down", h1: "Crew", rows: 7, canvases: 0 });
});

test("B4.2 down, honestly, on the default server: down, the down line, the record's chip, seven roles in roster order with no state or line, no activity, now line or Studio link, the record's PR linked, Approval and Rules", async ({
  page,
}) => {
  await openCrew(page, DEFAULT);
  await panelIs(page, DEFAULT);
});

// The reads that bring no answer back: a status other than 200, past the 2,000 ms timeout, or a
// body that isn't JSON. Since the owner's measurement on #78 (2026-10-25, 17:48: an uncached read
// of a cold Studio takes up to 8.4 s), such a read keeps the last good answer while that answer's
// asOf is within the 10 minutes of the down rule, and only then reads down. An answer that fails
// the data rules (version 2, a stale asOf) is still down at once.
const FAILED_READS = [
  ["503", { status: 503 }, "answers 503"],
  [
    "json",
    { raw: "<!doctype html><p>Not JSON" },
    "answers a body that isn't JSON",
  ],
  ["late", { delayMs: 2_500 }, "answers after 2,500 ms"],
] as const;
/** A live answer at 9 min 50 s: the next read, 30 s or more later, finds it past the window. */
const EDGE_OF_WINDOW = 590_000;

const DOWNS = [
  ...FAILED_READS.map(
    ([kind, answer, what]) =>
      [
        `down-${kind}`,
        answer,
        `${what}, its last good answer's asOf then past 10 minutes`,
        { ageMs: EDGE_OF_WINDOW },
      ] as const,
  ),
  [
    "down-stale",
    { ageMs: 11 * 60_000 },
    "answers with asOf 11 minutes old",
    {},
  ] as const,
  [
    "down-v2",
    { patch: { top: { version: 2 } } },
    "answers version 2",
    {},
  ] as const,
] as const;

for (const [name, answer, what, first] of DOWNS) {
  test(`B4.2 down, honestly, when the feed ${what}: after showing live, /crew turns down and reads as on the default server`, async ({
    page,
    crew,
  }) => {
    test.setTimeout(150_000);
    const shown = await downFrom(crew, name, answer, first);
    await openCrew(page, shown);
    await panelIs(page, shown);
  });
}

/**
 * The kept read's scenario, once per worker: live first, then the failed read switched in, and
 * /crew's state each second until the feed counts a read past the switch, then 4 s, then five
 * reads a second apart.
 */
function keptScenario(crew: Crew, kind: string, answer: Partial<Answer>) {
  const name = `kept-${kind}`;
  return crew.once(`kept ${name}`, async () => {
    const live = await reach(crew, name, { fixture: "live" });
    const before = crew.feed.reads(name);
    const seen: string[] = [];
    if (live.seen !== live.exp.state)
      return { before, after: before, seen, ms: 0 };
    crew.feed.set(name, answer);
    // Each request may start the regeneration; the feed counts the read when it arrives.
    const started = Date.now();
    while (
      crew.feed.reads(name) === before &&
      Date.now() - started < STATE_WAIT
    ) {
      seen.push((await untilState(live.base, "live", 0)).seen);
      await new Promise((done) => setTimeout(done, 1000));
    }
    const after = crew.feed.reads(name);
    // The failed read settles within the 2,000 ms timeout; then the regenerated page is served.
    await new Promise((done) => setTimeout(done, 4000));
    for (let i = 0; i < 5; i++) {
      seen.push((await untilState(live.base, "live", 0)).seen);
      await new Promise((done) => setTimeout(done, 1000));
    }
    return { before, after, seen, ms: Date.now() - started };
  });
}

for (const [kind, answer, what] of FAILED_READS) {
  test(`B4.2 kept, when the feed ${what} within 10 minutes of a good answer: after showing live, /crew still shows live, as the oracle reads the live fixture, once the failed read is in and the page regenerated after it`, async ({
    page,
    crew,
  }) => {
    test.setTimeout(150_000);
    const name = `kept-${kind}`;
    const live = await onFixture(crew, name, { fixture: "live" });
    const kept = await keptScenario(crew, kind, answer);
    test.info().annotations.push({
      type: "state-wait",
      description: `${name}: read ${kept.ms} ms after the switch, seen ${kept.seen.join(", ")}`,
    });
    expect(
      kept.after,
      `reads of the ${name} channel within ${STATE_WAIT} ms of the switch`,
    ).toBeGreaterThan(kept.before);
    expect
      .soft(
        kept.seen.filter((state) => state !== "live"),
        `/crew's states other than live from the switch to ${what} to 5 s past the failed read and its regeneration`,
      )
      .toEqual([]);
    await openCrew(page, live);
    await panelIs(page, live);
  });
}

test("B4.3 live, from the live fixture: the status, chip, rows, now line, activity, Evidence and Approval as the oracle says; quoted, the now line holds Atlas: and one q; and / on the same server is the sheet, with only the pencil row's goal, and copper only on the layer", async ({
  page,
  crew,
}) => {
  test.setTimeout(150_000);
  const live = await onFixture(crew, "live", { fixture: "live" });
  await openCrew(page, live);
  await panelIs(page, live);

  const quoted = await onFixture(crew, "live-quote", QUOTED);
  expect
    .soft(quoted.exp.now?.quoted, "the oracle quotes the now line")
    .toBeTruthy();
  await openCrew(page, quoted);
  await panelIs(page, quoted);

  // / on the live site: the sheet as on the default server, with B4b's layer (sprint 34's contract,
  // "keep, rewrite, retire"): the pencil row shows the goal, so the list drops it, and copper may
  // paint only the layer's parts.
  const words = [
    "Briefing Probe on the fixtures",
    "Probe pushed the fixtures and the harness",
    "Building the feed reader",
  ];
  const response = await page.goto(`${live.base}/`);
  expect(response?.status(), "status of / on the live site").toBe(200);
  const home = await page.evaluate(
    (list) => ({
      states: document.querySelectorAll("[data-crew-state]").length,
      found: list.filter((w) => (document.body.textContent ?? "").includes(w)),
    }),
    words,
  );
  expect.soft(home.states, "[data-crew-state] on / of the live site").toBe(0);
  expect.soft(home.found, "the feed's words on / of the live site").toEqual([]);
  const accent = (await resolveColors(page))["--accent"]?.rgba ?? [];
  expect
    .soft(
      (await copperPaint(page, accent))
        .filter((h) => !h.layer)
        .map((h) => `${h.where} ${h.property}`),
      "copper on / of the live site, but on [data-drawing], its dot, a [data-tip] or the copper swatch",
    )
    .toEqual([]);
});

test("B4.4 open, from the open fixture: Waiting on the owner, no now line, a working role reads Waiting, Approval on the pull request not given yet; switched to quiet, Between sessions (Iris, sprint 35) and the live Approval", async ({
  page,
  crew,
}) => {
  test.setTimeout(150_000);
  const open = await onFixture(crew, "open", { fixture: "open" });
  expect
    .soft(open.exp.status, "the oracle's status")
    .toBe("Waiting on the owner");
  await openCrew(page, open);
  await panelIs(page, open);

  const quiet = await onFixture(crew, "open-quiet", QUIET);
  expect.soft(quiet.exp.status, "the oracle's status").toBe("Between sessions");
  await openCrew(page, quiet);
  await panelIs(page, quiet);
});

test("B4.5 resting, from the resting fixture: Crew resting with the merge's day and UTC time, every called role Done, last's chip, rows, activity and Evidence, Approval from sprint 29's retro; sprint 999 reads Merged.; with no mergedAt the status drops the time", async ({
  page,
  crew,
}) => {
  test.setTimeout(200_000);
  for (const [name, patch] of RESTING_VARIANTS) {
    const resting = await onFixture(crew, name, { fixture: "resting", patch });
    await openCrew(page, resting);
    await panelIs(page, resting);
  }
});

/**
 * Every copper paint not allowed, at rest, with each link hovered and with each stop focused. With
 * `tip` (live, since sprint 36: .crew/sprint/36/contract.md, B4.6's rewrite) the drawing's
 * `[data-tip]` is allowed too.
 */
async function copperSweep(
  page: Page,
  shown: Shown,
  scheme: string,
  tip = false,
) {
  const accent = (await resolveColors(page))["--accent"]?.rgba ?? [];
  const where = `${shown.where}, ${scheme}`;
  const stray = new Set<string>();
  const allowed = new Set<string>();
  const note = (hits: Awaited<ReturnType<typeof copperPaint>>, how: string) => {
    for (const hit of hits) {
      const ok = hit.allowed || (tip && hit.inTip);
      (ok ? allowed : stray).add(
        `${hit.where} ${hit.property}${ok ? "" : ` (${how})`}`,
      );
    }
  };
  note(await copperPaint(page, accent), "at rest");
  const links = page.locator(`a[href]:not(${SKIP})`);
  for (let i = 0; i < (await links.count()); i++) {
    const link = links.nth(i);
    if (!(await link.isVisible())) continue;
    await link.hover();
    note(
      await copperPaint(page, accent),
      `hovering ${await link.getAttribute("href")}`,
    );
  }
  await page.mouse.move(0, 0);
  for (let stop = 0; stop < 30; stop++) {
    await page.keyboard.press("Tab");
    const at = await page.evaluate(
      () =>
        document.activeElement?.getAttribute("href") ??
        document.activeElement?.tagName ??
        "",
    );
    if (at === "BODY") break;
    note(await copperPaint(page, accent), `${at} focused`);
  }
  expect
    .soft([...stray], `copper outside Working and the now line on ${where}`)
    .toEqual([]);
  return [...allowed];
}

for (const state of ["live", "open", "resting", "down"] as const) {
  test(`B4.6 state words and copper, ${state}: only a Working row's dot and word, the now line and, in live, the drawing's [data-tip] (sprint 36) resolve to --accent, at rest, hovered and focused, in both schemes; ${state === "live" ? "a Working word and the now line are copper, and copper text meets 4.5:1" : "nothing is copper"}; the state words are the four`, async ({
    page,
    crew,
  }) => {
    test.setTimeout(240_000);
    const shown =
      state === "down"
        ? DEFAULT
        : await onFixture(crew, state, { fixture: state });
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openCrew(page, shown);
      const words = await page.evaluate(() =>
        [...document.querySelectorAll("td[data-state]")].map((td) =>
          (td.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
      );
      expect
        .soft(
          words.filter(
            (w) =>
              !(
                state === "down"
                  ? [""]
                  : ["Working", "Waiting", "Done", "Not on this sprint"]
              ).includes(w),
          ),
          `state words outside the four on ${shown.where}, ${scheme}`,
        )
        .toEqual([]);
      const copper = await copperSweep(page, shown, scheme, state === "live");
      if (state === "live") {
        expect
          .soft(
            copper.some((c) => c.includes("Working") && c.endsWith(" color")),
            `a copper Working word on ${shown.where}, ${scheme} (${copper.join("; ")})`,
          )
          .toBe(true);
        const nowInk = await page.evaluate(() => {
          const now = document.querySelector("[data-now]");
          const probe = document.createElement("span");
          probe.style.color = "var(--accent)";
          document.body.append(probe);
          const accent = getComputedStyle(probe).color;
          probe.remove();
          return now ? [getComputedStyle(now).color, accent] : null;
        });
        expect
          .soft(nowInk?.[0], `[data-now]'s colour, ${scheme}`)
          .toBe(nowInk?.[1]);
        const colors = await resolveColors(page);
        const [r = 0, g = 0, b = 0] = colors["--background"]?.rgba ?? [];
        const ground: [number, number, number] = [r, g, b];
        const accent = colors["--accent"]?.rgba;
        expect
          .soft(
            accent ? contrast(composite(accent, ground), ground) : 0,
            `--accent on --background, ${scheme}`,
          )
          .toBeGreaterThanOrEqual(4.5);
      } else {
        expect.soft(copper, `copper on ${shown.where}, ${scheme}`).toEqual([]);
      }
    }
  });
}

test("B4.7 UTC: with the server at UTC+14 and the browser in Los Angeles, every shown time is the oracle's UTC HH:MM, the heading's day the newest moment's UTC day, the previous day's moment shows its day, each datetime the fixture's instant, and the resting line's time UTC", async ({
  page,
  crew,
}) => {
  test.setTimeout(150_000);
  expect(
    await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    "the browser's zone",
  ).toBe("America/Los_Angeles");
  const live = await onFixture(crew, "live", { fixture: "live" });
  await openCrew(page, live);
  const found = await readPanel(page);
  expect.soft(found.heading, "the activity heading").toBe(live.exp.heading);
  expect
    .soft(
      found.moments.map((m) => [m.datetime, m.shown]),
      "each moment's datetime and shown time",
    )
    .toEqual(live.exp.moments.map((m) => [m.datetime, m.shown]));
  const fixture = crew.feed.body("live");
  const instants = new Set(
    ((fixture.current as { moments: { at: string }[] }).moments ?? []).map(
      (m) => Date.parse(m.at),
    ),
  );
  expect
    .soft(
      found.moments
        .filter((m) => !instants.has(Date.parse(m.datetime)))
        .map((m) => m.datetime),
      "datetimes that aren't a fixture moment's instant",
    )
    .toEqual([]);
  expect
    .soft(
      found.moments
        .filter((m) => /^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/.test(m.shown))
        .map((m) => m.text),
      "moments shown with their day",
    )
    .toEqual(["Sprint started"]);
  const resting = await onFixture(crew, "resting", { fixture: "resting" });
  await openCrew(page, resting);
  expect
    .soft((await readPanel(page)).status, "the resting line")
    .toBe(resting.exp.status);
});

test("B4.8 the feed's text is only text: the markup moment shows its 22 characters and no b, unknown kinds, roles and states are dropped, an unknown who keeps its moment, another repository's PR and another origin's run aren't linked, and no href but the site's, this repository's PRs and the feed's run pages", async ({
  page,
  crew,
}) => {
  test.setTimeout(150_000);
  const live = await onFixture(crew, "live", { fixture: "live" });
  await openCrew(page, live);
  const found = await readPanel(page);
  const markup = "<b>bold</b> &amp; more";
  expect.soft(markup.length, "the markup's characters").toBe(22);
  expect
    .soft(
      found.moments.filter((m) => m.text === markup).length,
      "the markup moment, as text",
    )
    .toBe(1);
  const made = await page.evaluate(() => {
    const panel = document.querySelector('section[aria-labelledby="crew"]');
    return {
      tags: [
        ...(panel?.querySelectorAll(
          "b, i, em, strong, img, script, iframe, object, embed, u, mark",
        ) ?? []),
      ].map((el) => el.tagName.toLowerCase()),
      links: [...(panel?.querySelectorAll("a") ?? [])]
        .filter(
          (a) => !a.matches("[data-close]") && !a.closest("[data-evidence]"),
        )
        .map((a) => a.getAttribute("href")),
    };
  });
  expect
    .soft(made.tags, "elements the feed's strings could have made")
    .toEqual([]);
  expect
    .soft(made.links, "links in the panel outside Close and Evidence")
    .toEqual([]);
  expect
    .soft(found.moments.length, "moments shown: the valid ones")
    .toBe(live.exp.moments.length);
  expect
    .soft(
      found.moments.filter((m) =>
        [
          "A meeting the page drops",
          "A decision with no time the page drops",
        ].includes(m.text),
      ),
      "dropped moments shown",
    )
    .toEqual([]);
  expect
    .soft(
      found.moments.some((m) => m.text === "Lens: changes on the bar"),
      "the moment with an unknown who",
    )
    .toBe(true);
  expect
    .soft(found.rows.length, "rows with an unknown role in the feed")
    .toBe(7);
  expect
    .soft(
      (await page.locator("body").textContent())?.match(
        /page drops|A guest|second entry/g,
      ) ?? [],
      "dropped roles' lines shown",
    )
    .toEqual([]);
  expect
    .soft(found.evidence, "the other repository's PR, as words")
    .toContain("Pull request #76");
  expect
    .soft(
      found.links.filter(([text]) => text === "Pull request #76"),
      "the other repository's PR linked",
    )
    .toEqual([]);

  const open = await onFixture(crew, "open", { fixture: "open" });
  const allowed = (href: string) =>
    href.startsWith("/") && !href.startsWith("//")
      ? true
      : href.startsWith("#") ||
        href.startsWith(`${SITE_URL}/`) ||
        /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/pull\/\d+$/.test(
          href,
        ) ||
        (href.startsWith(`${crew.feed.origin}/studio/runs/`) &&
          !href.includes(".."));
  for (const shown of [live, open, DEFAULT]) {
    await openCrew(page, shown);
    // Every href, the head's links included: the canonical names the site's own production URL.
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll("[href]")].map(
        (a) => a.getAttribute("href") ?? "",
      ),
    );
    expect
      .soft(
        hrefs.filter((h) => !allowed(h)),
        `hrefs on /crew on ${shown.where}`,
      )
      .toEqual([]);
    if (shown === open) {
      const panel = await readPanel(page);
      expect
        .soft(
          panel.links.filter(([text]) => text === "This run on the Studio"),
          "another origin's run linked",
        )
        .toEqual([]);
    }
  }
});

test("B4.12 the first screen, on the live fixture: at 1440 x 900 the h1, the status, all seven rows and the now line start inside the viewport; at 390 x 844 the h1, the status and the first row; both schemes", async ({
  page,
  crew,
}) => {
  test.setTimeout(150_000);
  const live = await onFixture(crew, "live", { fixture: "live" });
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await openCrew(page, live, width, height);
      const tops = await page.evaluate(() => {
        const top = (el: Element | null | undefined) =>
          el && el.getClientRects().length > 0
            ? el.getBoundingClientRect().top
            : null;
        const rows = [
          ...document.querySelectorAll(
            'section[aria-labelledby="crew"] table tr',
          ),
        ].filter((tr) => tr.querySelector('th[scope="row"]'));
        return {
          h1: top(document.querySelector("h1#crew")),
          status: top(document.querySelector("[data-status]")),
          rows: rows.map((tr) => top(tr)),
          now: top(document.querySelector("[data-now]")),
          height: innerHeight,
        };
      });
      const items: [string, number | null][] =
        width === 1440
          ? [
              ["the h1", tops.h1],
              ["the status", tops.status],
              ...tops.rows.map(
                (t, i) => [`row ${i + 1}`, t] as [string, number | null],
              ),
              ["the now line", tops.now],
            ]
          : [
              ["the h1", tops.h1],
              ["the status", tops.status],
              ["row 1", tops.rows[0] ?? null],
            ];
      expect
        .soft(
          items
            .filter(([, t]) => t === null || t < 0 || t >= tops.height)
            .map(([name, t]) => `${name} at ${t}`),
          `items outside the first ${width} x ${height} screen, ${scheme}`,
        )
        .toEqual([]);
      if (width === 1440) {
        expect.soft(tops.rows.length, "rows at 1440").toBe(7);
      }
    }
  }
});

test("B4.13 /crew's own sweeps: text contrast in both schemes on the default server and the live fixture; with scripts off the panel's state, rows and Rules as with them on; Tab visits the skip link, the wordmark, the shown bar links, Off (the control with WebGL refused, sprint 36), Close, Pause updates (sprint 35) and Evidence's links in DOM order, each with one 2 px ink ring 2 px out; on the live fixture axe with the strict tags and every text in a token", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const live = await onFixture(crew, "live", { fixture: "live" });
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const shown of [DEFAULT, live]) {
      for (const width of [390, 1440]) {
        await openCrew(page, shown, width);
        expect
          .soft(
            (await textContrast(page))
              .filter((t) => t.ratio < t.floor - 0.005)
              .map(
                (t) => `${t.text}: ${t.ratio.toFixed(2)}:1 (floor ${t.floor})`,
              ),
            `text under its contrast floor on ${shown.where} at ${width}, ${scheme}`,
          )
          .toEqual([]);
      }
    }

    // On the live fixture: axe and the tokens.
    for (const width of [390, 1440]) {
      for (const skipShowing of [false, true]) {
        await openCrew(page, live, width);
        if (skipShowing) await page.keyboard.press("Tab");
        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .analyze();
        expect
          .soft(
            results.violations.map((v) => ({
              rule: v.id,
              impact: v.impact,
              targets: v.nodes.map((n) => n.target.join(" ")),
            })),
            `axe on the live fixture at ${width}, ${skipShowing ? "skip link showing" : "nothing focused"}, ${scheme}`,
          )
          .toEqual([]);
      }
      await openCrew(page, live, width);
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
          `text not in a token on the live fixture at ${width}, ${scheme}`,
        )
        .toEqual([]);
    }

    // The Tab order and the ring, on the default server at 1440. Pause updates takes focus once the
    // poller marks it ready (.crew/sprint/35/contract.md, "Pause updates"): waited for, not asserted,
    // so a page without it fails on the stops below.
    await openCrew(page, DEFAULT, 1440);
    await page
      .locator("button[data-pause][data-ready]")
      .waitFor({ timeout: 5_000 })
      .catch(() => undefined);
    const order = await page.evaluate(() => {
      const shown = (el: Element) => el.getClientRects().length > 0;
      const header = document.querySelector("header:has(nav)");
      return [
        "#main",
        header?.querySelector('a[href="/"]:not(nav a)')?.getAttribute("href") ??
          "(no wordmark link)",
        ...[...(header?.querySelectorAll("nav a") ?? [])]
          .filter(shown)
          .map((a) => a.getAttribute("href") ?? ""),
        // Sprint 36 (.crew/sprint/36/contract.md, B4.13's rewrite): the control's enabled buttons
        // after Read as page, in the bar at 1440; with WebGL refused, Off alone (sprint 33,
        // amendment 1: Full and Calm are disabled).
        "<button> Off",
        document.querySelector("a[data-close]")?.getAttribute("href") ??
          "(no Close)",
        "<button>",
        ...[...document.querySelectorAll("[data-evidence] a")]
          .filter(shown)
          .map((a) => a.getAttribute("href") ?? ""),
      ];
    });
    const ink = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--foreground)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    const stops: string[] = [];
    const rings: string[] = [];
    for (let i = 0; i < order.length; i++) {
      await page.keyboard.press("Tab");
      await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done)),
          ),
      );
      const at = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const s = getComputedStyle(el);
        const ringed = [el, ...el.querySelectorAll("*")].filter((c) => {
          const cs = getComputedStyle(c);
          return (
            cs.outlineStyle !== "none" && Number.parseFloat(cs.outlineWidth) > 0
          );
        });
        const control = el.closest("[data-motion]")
          ? ` ${(el.textContent ?? "").trim()}`
          : "";
        return {
          href:
            el.getAttribute("href") ??
            `<${el.tagName.toLowerCase()}>${control}`,
          ring: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
          count: ringed.length,
        };
      });
      stops.push(at?.href ?? "(none)");
      if (at && (at.count !== 1 || at.ring !== `solid 2px ${ink} 2px`)) {
        rings.push(`${at.href}: ${at.count} rings, ${at.ring}`);
      }
    }
    expect
      .soft(stops, `the Tab stops on /crew at 1440, ${scheme}`)
      .toEqual(order);
    expect
      .soft(
        rings,
        `stops without one 2 px ink ring 2 px out, ${scheme} (ink ${ink})`,
      )
      .toEqual([]);
  }

  // Scripts off, against scripts on, on the default server and the live fixture.
  for (const shown of [DEFAULT, live]) {
    await openCrew(page, shown);
    const on = await readPanel(page);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const noScript = await context.newPage();
    await noScript.goto(`${shown.base}/crew`);
    const off = await readPanel(noScript);
    await context.close();
    expect
      .soft(
        { state: off.state, rows: off.rows, rules: off.rules },
        `the panel with scripts off on ${shown.where}`,
      )
      .toEqual({ state: on.state, rows: on.rows, rules: on.rules });
  }
  expect.soft(RULES.length, "the Rules copy").toBeGreaterThan(0);
});

/** The script files a fresh visit requests: their paths and decoded bytes, with the status. */
async function scripts(
  browser: import("@playwright/test").Browser,
  url: string,
) {
  const context = await browser.newContext();
  await context.addInitScript(refuseWebGl);
  const page = await context.newPage();
  const bodies: Promise<[string, number]>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      bodies.push(
        response
          .body()
          .then(
            (body) =>
              [new URL(response.url()).pathname, body.length] as [
                string,
                number,
              ],
          )
          .catch(
            () =>
              [new URL(response.url()).pathname, Number.NaN] as [
                string,
                number,
              ],
          ),
      );
    }
  });
  const response = await page.goto(url);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const files = await Promise.all(bodies);
  await context.close();
  return {
    status: response?.status(),
    paths: files.map(([path]) => path).sort(),
    bytes: files.reduce((sum, [, bytes]) => sum + bytes, 0),
  };
}

test("B4.14 text first, and the script within its budget: at 4x CPU /crew's LCP is text in main outside the drawing with no url within 2,500 ms at 1440 x 900 and 390 x 844; /crew, WebGL refused, requests every script file the 404 does and at most 18,432 B more (its poller, sprint 35, and the model's loader, sprint 36), within 16,384 B of /log's; two woff2 within 86,016 B", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    await fresh.addInitScript(() => {
      const win = window as Window & { __lcpInMain?: boolean[] };
      win.__lcpInMain = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = (entry as PerformanceEntry & { element: Element | null })
            .element;
          win.__lcpInMain?.push(Boolean(el?.closest("main")));
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const lcp = await measureLcp(fresh, "/crew");
    const inMain = await fresh.evaluate(
      () =>
        (window as Window & { __lcpInMain?: boolean[] }).__lcpInMain?.at(-1) ??
        false,
    );
    const where = `on /crew at ${width} x ${height}`;
    expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
    if (lcp) {
      expect
        .soft(inMain, `LCP <${lcp.tag}> "${lcp.text}" is in main ${where}`)
        .toBe(true);
      expect.soft(lcp.inPlan, `LCP is in the drawing ${where}`).toBe(false);
      expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
      expect
        .soft(lcp.tag, `LCP is text ${where}`)
        .not.toMatch(/^(?:img|image|video|svg|canvas)$/);
      expect.soft(lcp.time, `LCP time (ms) ${where}`).toBeLessThanOrEqual(2500);
      testInfo.annotations.push({
        type: "lcp",
        description: `/crew ${where}: <${lcp.tag}> "${lcp.text}" at ${lcp.time.toFixed(0)} ms`,
      });
    }
    await fresh.close();
  }

  const crew = await scripts(browser, "/crew");
  const missing = await scripts(browser, "/no-such-page");
  // Sprint 30 moved the baseline from /sprints to /log with the route (.crew/sprint/31/decisions.md, 7).
  const log = await scripts(browser, "/log");
  testInfo.annotations.push({
    type: "script-bytes",
    description: `/crew ${crew.bytes} B in ${crew.paths.length}; the 404 ${missing.bytes} B in ${missing.paths.length}; /log ${log.bytes} B in ${log.paths.length}`,
  });
  expect.soft(crew.status, "status of /crew").toBe(200);
  expect.soft(missing.status, "status of the 404").toBe(404);
  // A missing /log is the 404, whose files are /crew's: the baseline must be the page.
  expect.soft(log.status, "status of /log").toBe(200);
  // Sprint 35 gives /crew its poller (.crew/sprint/35/contract.md, B4.14's rewrite; the plan's
  // B4.3 sets /crew's own budget): the 404's files all included, and 16,384 B beyond its bytes.
  // Sprint 36 adds the model's loader and the control, read with WebGL refused on every page
  // (.crew/sprint/36/contract.md, call 7): 18,432 B beyond the 404's, the poller's allowance plus
  // B2.10's loader's; and 16,384 B beyond /log's, which was vacuous while /log loaded its chunk.
  expect
    .soft(
      missing.paths.filter((path) => !crew.paths.includes(path)),
      "the 404's script files not among /crew's",
    )
    .toEqual([]);
  expect
    .soft(
      crew.bytes - missing.bytes,
      `/crew's script bytes beyond the 404's (${missing.bytes} B), WebGL refused`,
    )
    .toBeLessThanOrEqual(18_432);
  expect
    .soft(
      crew.bytes - log.bytes,
      `script bytes on /crew beyond /log's (${log.bytes} B), both WebGL refused`,
    )
    .toBeLessThanOrEqual(16_384);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(refuseWebGl);
  const fresh = await context.newPage();
  const fonts: Promise<number>[] = [];
  fresh.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith(".woff2")) {
      fonts.push(response.body().then((b) => b.length));
    }
  });
  await fresh.goto("/crew");
  await fresh.evaluate(() => document.fonts.ready);
  await fresh.evaluate(() => new Promise((done) => setTimeout(done, 500)));
  const sizes = await Promise.all(fonts);
  await context.close();
  expect.soft(sizes, "woff2 files /crew loads").toHaveLength(2);
  expect
    .soft(
      sizes.reduce((a, b) => a + b, 0),
      "the woff2 files together, in bytes",
    )
    .toBeLessThanOrEqual(86_016);
});
