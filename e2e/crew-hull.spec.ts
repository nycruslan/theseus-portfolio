import { type Browser, expect, type Page } from "@playwright/test";
import { expected } from "./crew";
import {
  type Answer,
  type Crew,
  crewOf,
  type Fixture,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import {
  boxToPoint,
  cropX,
  cssLength,
  cssOf,
  DETAIL_SIZES,
  type DetailRead,
  detailAt,
  fitOf,
  focusOf,
  inside,
  momentsShown,
  NEWEST,
  overlaps,
  readDetail,
  recordPlan,
  seatGeometry,
  serverRun,
  TICK,
  takePlan,
} from "./crew-hull";
import {
  FIXTURE_STUDIO,
  feedOf,
  type Live,
  livePage,
  type Patch,
  toAnswer,
} from "./crew-live";
import { installRgba, SCHEMES } from "./helpers";
import { tokenRgba } from "./log";
import { deltaE } from "./pixels";
import { refuseWebGl } from "./webgl";

// Sprint 36, B4d (.crew/sprint/36/contract.md, B4.33 to B4.35, with Iris's three amendments in
// decisions.md, 6): /crew's detail drawing in 2D, one tick per moment, written before the build.
// Every page here refuses WebGL (the Off path: "2D checks run on the Off path"), so the drawing is
// read as the server and the poll leave it, with no model over it. The oracle is e2e/crew-hull.ts
// (the layouts, f, the ticks' slots, the number's anchor, from the contract's words); since the
// crop's xc has no number the checks can hold, every place is read through the drawing's own plank
// boxes (fitOf), with s and oy held to the layout's. The states come from B4a's kept fixture
// sites (e2e/crew-feed.ts) and, for the poll, from `page.route` answering `/api/crew` with the
// oracle's `toAnswer` on Playwright's clock (B4c's `livePage`). Each check reads 1440 x 900 and
// 390 x 844, and B4.33 the five widths of Iris's table.

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

const SIZES: [number, number][] = [
  [1440, 900],
  [390, 844],
];
/** B4.15's sprint 999 site, the same name and answer, so a worker that ran it reuses it. */
const LIVE_999: Partial<Answer> = {
  fixture: "live",
  patch: { current: { sprint: 999 } },
};

type Site = {
  base: string;
  where: string;
  state: "live" | "open" | "resting" | "down";
  n: number | null;
};

const DEFAULT: Site = {
  base: "",
  where: "the default server",
  state: "down",
  n: null,
};

/** A kept site's /crew showing its state (the polling rule, at most STATE_WAIT ms), once a worker. */
function kept(crew: Crew, name: string, answer: Partial<Answer>) {
  return crew.once(`hull ${name}`, async () => {
    const site = await crew.site(name, answer, true);
    const body = crew.feed.body(name);
    const exp = expected(body, crew.feed.origin);
    const shown = await untilState(site.baseURL, exp.state, STATE_WAIT);
    const run = (body.current ?? body.last) as { sprint?: unknown } | null;
    return {
      base: site.baseURL,
      exp,
      n: typeof run?.sprint === "number" ? run.sprint : null,
      ...shown,
    };
  });
}

async function siteOf(
  crew: Crew,
  name: string,
  answer: Partial<Answer>,
): Promise<Site> {
  const { base, exp, n, seen, ms } = await kept(crew, name, answer);
  test.info().annotations.push({
    type: "state-wait",
    description: `${name}: ${seen} after ${ms} ms`,
  });
  expect(
    seen,
    `/crew's [data-crew-state] on the ${name} site within ${STATE_WAIT} ms`,
  ).toBe(exp.state);
  return { base, where: `the ${name} site`, state: exp.state, n };
}

const FIXTURE = (fixture: Fixture): Partial<Answer> => ({ fixture });

// The worker's crew from crewOf(): a beforeAll takes no test-scoped fixture (crew-feed.ts).
test.beforeAll(async () => {
  const crew = await crewOf();
  for (const fixture of ["live", "open", "resting"] as const)
    void kept(crew, fixture, FIXTURE(fixture));
  void kept(crew, "home-999", LIVE_999);
});

const pencilledOf = (site: Site) =>
  (site.state === "live" || site.state === "open") && site.n !== null;

/** Opens a site's /crew at a size. */
async function openCrew(page: Page, site: Site, width: number, height: number) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${site.base}/crew`);
  expect(response?.status(), `status of /crew on ${site.where}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Resizes the page and waits in Node's time (a page on Playwright's paused clock runs no frame or
 * timer); every read after it forces layout, so the shown drawing is the new width's.
 */
async function resize(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await new Promise((done) => setTimeout(done, 100));
}

/**
 * The drawing read with the oracle's places for the seat in CSS px, through the drawing's own map
 * (fitOf): each slot's x and the lower edge there, the tick's length, the plank's ends, the
 * number's anchor and the dot.
 */
async function readAt(page: Page, seat: string, pencilled: boolean) {
  const read = await readDetail(page);
  const fit = fitOf(read);
  const g = seatGeometry(seat);
  const at = (p: [number, number]) => cssOf(read, fit, p);
  const slots = Array.from({ length: TICK.max }, (_, k) => {
    const x = g.slot(k);
    return at([x, g.bottom(x)]);
  });
  return {
    read,
    fit,
    seat,
    pencilled,
    slots,
    tickLength: cssLength(read, fit, TICK.length),
    ends: [at([g.plank.x0, 0])[0], at([g.plank.x1, 0])[0]] as const,
    anchor: at(pencilled ? g.number : g.seated),
    dot: at(g.dot),
  };
}
type Read = Awaited<ReturnType<typeof readAt>>;

const readSite = (page: Page, site: Site) =>
  readAt(page, focusOf(site.state, site.n), pencilledOf(site));

const colours = async (page: Page) => ({
  muted: await tokenRgba(page, "--muted"),
  ink: await tokenRgba(page, "--foreground"),
  ground: await tokenRgba(page, "--background"),
  accent: await tokenRgba(page, "--accent"),
});

const same = (a: number[] | null | undefined, b: number[] | null | undefined) =>
  Boolean(
    a &&
      b &&
      a.slice(0, 3).every((v, i) => Math.abs(v - (b[i] ?? -9)) <= 1) &&
      Math.abs((a[3] ?? 1) - (b[3] ?? 1)) <= 0.02,
  );

/** The focus plank's numbers: the ones whose centre lies on it, inside the hull. */
const onFocus = (read: DetailRead) => read.numbers.filter((n) => n.onFocus);

/**
 * B4.34's places for the shown ticks: matched to slots by x (stern-most last), so the shown ticks
 * must fill slots 0 to k−1 whatever their DOM order. Each: x within 1 px of its slot, its top on
 * the lower edge there within 1 px, hanging down the tick's length within 1 px, and inside the
 * plank's ends. The list of failures.
 */
function tickPlaces(r: Read) {
  const ticks = [...r.read.marks].sort((a, b) => b.cx - a.cx);
  return ticks.flatMap((m, k) => {
    const [x, y] = r.slots[k] ?? [Number.NaN, Number.NaN];
    const wrong: string[] = [];
    if (!(Math.abs(m.cx - x) <= 1))
      wrong.push(`x ${m.cx.toFixed(1)} not ${x.toFixed(1)}`);
    if (!(Math.abs(m.line.top - y) <= 1))
      wrong.push(`top ${m.line.top.toFixed(1)} not the edge's ${y.toFixed(1)}`);
    const length = m.line.bottom - m.line.top;
    if (!(Math.abs(length - r.tickLength) <= 1))
      wrong.push(
        `length ${length.toFixed(1)} not ${r.tickLength.toFixed(1)} down`,
      );
    if (!(m.cx >= r.ends[0] && m.cx <= r.ends[1]))
      wrong.push(
        `outside the plank's ${r.ends.map((e) => e.toFixed(1)).join(" to ")}`,
      );
    return wrong.length > 0 ? [`slot ${k}: ${wrong.join(", ")}`] : [];
  });
}

// ---------------------------------------------------------------------------------------------

test("B4.33 the detail and the pencil: on the live, open and resting fixtures, sprint 999 and the default server, data-focus is the oracle's seat (3.0 for 31, 6.1 for 999, the newest retro's at rest and down) and data-run live, open or record; the shown drawing's box is Iris's size within 1 px at 320, 390, 768, 1024 and 1440 at the layout's s and oy; the focus number wholly inside it, the only number on the focus plank; in live and open one path[data-plank][data-pencil] on the seat with data-sprint n, data-live in live only, a hatch and a dashed --muted edge in both schemes, n on its film chip at B4b's place, one [data-tip] in live alone; every plank's data-plank, data-sprint and class the default server's, the pencil aside", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  await openCrew(page, DEFAULT, 1440, 900);
  const reference = new Map(
    (await readDetail(page)).planks.map((p) => [p.id, p] as const),
  );
  const sites = [
    DEFAULT,
    await siteOf(crew, "live", FIXTURE("live")),
    await siteOf(crew, "open", FIXTURE("open")),
    await siteOf(crew, "resting", FIXTURE("resting")),
    await siteOf(crew, "home-999", LIVE_999),
  ];
  for (const site of sites) {
    const seat = focusOf(site.state, site.n);
    const run = serverRun(site.state, site.n);
    const pencilled = pencilledOf(site);
    const want = String(pencilled ? site.n : NEWEST);
    // The five widths on the default server and the live site; 1440 and 390 on the rest.
    const widths =
      site === DEFAULT || site.where === "the live site"
        ? DETAIL_SIZES.map((s) => s.width)
        : [1440, 390];
    await openCrew(page, site, 1440, 900);
    for (const width of widths) {
      await resize(page, width, width < 768 ? 844 : 900);
      const at = `${site.where} at ${width}`;
      const r = await readSite(page, site);
      const { read } = r;
      expect
        .soft(
          [read.plans, read.svgs],
          `[data-plan]s and shown svgs in it, ${at}`,
        )
        .toEqual([1, 1]);
      expect.soft(read.focus, `data-focus, ${at}`).toBe(seat);
      expect.soft(read.run, `data-run, ${at}`).toBe(run);

      // Iris's size, at the layout's scale and oy.
      const detail = detailAt(width);
      const ratio = detail.box[3] / detail.box[2];
      const size = DETAIL_SIZES.find((s) => s.width === width);
      const w = read.svg ? read.svg.right - read.svg.left : 0;
      const h = read.svg ? read.svg.bottom - read.svg.top : 0;
      const wantW = size?.w ?? Number.NaN;
      expect
        .soft(
          Math.abs(w - wantW) <= 1 && Math.abs(h - wantW * ratio) <= 1,
          `the shown drawing's box ${w.toFixed(1)} x ${h.toFixed(1)} against ${wantW} x ${(wantW * ratio).toFixed(1)} (Iris's, ${detail.name}'s shape, within 1 px), ${at}`,
        )
        .toBe(true);
      const crop = cropX(detail, seat, pencilled);
      expect
        .soft(
          {
            viewBox: read.viewBox?.split(/[\s,]+/).map(Number),
            s: Math.abs((r.fit?.s ?? 0) / detail.s - 1) <= 0.005,
            oy: Math.abs((r.fit?.oy ?? 0) - detail.oy) <= 0.5,
            ox: Math.abs((r.fit?.ox ?? 0) - crop.ox) <= 0.5,
          },
          `the viewBox, and read off the planks (${JSON.stringify(r.fit)}) s within 0.5% of ${detail.s}, oy within 0.5 of ${detail.oy} and ox within 0.5 of ${crop.ox.toFixed(2)} (xc ${crop.xc.toFixed(1)}), ${at}`,
        )
        .toEqual({ viewBox: [...detail.box], s: true, oy: true, ox: true });

      // The focus number.
      const numbers = onFocus(read);
      expect
        .soft(
          numbers.map((n) => n.text),
          `the numbers lettered on the focus plank ${seat}, ${at}`,
        )
        .toEqual([want]);
      const number = numbers.find((n) => n.text === want);
      expect
        .soft(
          Boolean(number && read.svg && inside(number.box, read.svg)),
          `the focus number ${want} wholly inside the drawing's box, ${at}: ${JSON.stringify(number?.box)} in ${JSON.stringify(read.svg)}`,
        )
        .toBe(true);
      if (pencilled && number) {
        const b = number.box;
        const [x, y] = r.anchor;
        expect
          .soft(
            x >= b.left - 2 &&
              x <= b.right + 2 &&
              y >= b.top - 2 &&
              y <= b.bottom + 2,
            `n at B4b's place: the anchor (${x.toFixed(1)}, ${y.toFixed(1)}) within 2 px of n's box ${JSON.stringify(b)}, ${at}`,
          )
          .toBe(true);
      }

      // Every plank but the pencil as the default server has it.
      const differs = read.planks
        .filter((p) => !(pencilled && p.id === seat))
        .filter((p) => {
          const ref = reference.get(p.id);
          return (
            !ref || ref.sprint !== p.sprint || ref.className !== p.className
          );
        })
        .map((p) => `${p.id} ${p.sprint} ${p.className}`);
      expect
        .soft(
          [read.planks.length, differs],
          `the drawing's planks and those whose data-sprint or class differ from the default server's, the pencil aside, ${at}`,
        )
        .toEqual([reference.size, []]);

      // The pencil.
      expect
        .soft(
          read.planks
            .filter((p) => p.pencil)
            .map((p) => `${p.id} ${p.sprint}${p.live ? " live" : ""}`),
          `path[data-plank][data-pencil] (seat, data-sprint, data-live), ${at}`,
        )
        .toEqual(
          pencilled
            ? [`${seat} ${site.n}${run === "live" ? " live" : ""}`]
            : [],
        );
      expect
        .soft(read.tips, `[data-tip]s in the shown svg, ${at}`)
        .toBe(run === "live" ? 1 : 0);
    }

    // The look, at 1440 and 390: both schemes in live and open, light at rest.
    for (const scheme of pencilled ? SCHEMES : (["light"] as const)) {
      await page.emulateMedia({ colorScheme: scheme });
      await openCrew(page, site, 1440, 900);
      for (const [width, height] of SIZES) {
        await resize(page, width, height);
        const at = `${site.where} at ${width}, ${scheme}`;
        const { read } = await readSite(page, site);
        const paint = await colours(page);
        const number = onFocus(read).find((n) => n.text === want);
        if (pencilled) {
          expect(read.pencil.length, `shown pencil planks, ${at}`).toBe(1);
          for (const p of read.pencil) {
            expect
              .soft(
                [p.fill.startsWith("url("), same(p.stroke, paint.muted)],
                `the pencil plank's fill a hatch (a pattern) and its stroke ${JSON.stringify(p.stroke)} --muted ${JSON.stringify(paint.muted)}, ${at}`,
              )
              .toEqual([true, true]);
            expect
              .soft(p.dash, `the pencil plank's stroke-dasharray, ${at}`)
              .not.toMatch(/^(none|0(px)?)$/);
          }
          expect
            .soft(
              [
                same(number?.color, paint.muted),
                number?.weight,
                same(number?.chip, paint.ground),
              ],
              `n in graphite (--muted) at 600 on a film chip (--background), ${at}: ${JSON.stringify(number)}`,
            )
            .toEqual([true, 600, true]);
        } else {
          expect
            .soft(
              [
                same(number?.color, paint.ink),
                number?.weight,
                number?.chip ?? null,
              ],
              `the holder's number in ink (--foreground) at 700 with no chip, ${at}: ${JSON.stringify(number)}`,
            )
            .toEqual([true, 700, null]);
        }
      }
    }
    await page.emulateMedia({ colorScheme: "light" });
  }
});

test("B4.34 one tick per moment, in 2D: the shown [data-mark]s number the panel's ol[data-moments] li in live and open, scripts on and off, and 0 at rest and in down; each at its slot's x within 1 px (slot k at tip − (10 + 5k)·f), its top on the pencil plank's lower edge within 1 px, hanging 4 units down, inside the plank's ends; --muted in both schemes, never within ΔE 10 of --accent, CanvasText in forced colours; no tick's stroke box within 4 px of the dot's centre, none under the number's chip", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const live = await siteOf(crew, "live", FIXTURE("live"));
  const open = await siteOf(crew, "open", FIXTURE("open"));
  const resting = await siteOf(crew, "resting", FIXTURE("resting"));

  for (const site of [live, open]) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openCrew(page, site, 1440, 900);
      const shown = await momentsShown(page);
      const paint = await colours(page);
      for (const [width, height] of SIZES) {
        await resize(page, width, height);
        const at = `${site.where} at ${width}, ${scheme}`;
        const r = await readSite(page, site);
        const { read } = r;
        expect
          .soft(
            [shown > 0, read.marks.length],
            `moments shown (more than 0) and shown [data-mark]s in the shown svg, ${at}`,
          )
          .toEqual([true, shown]);
        expect.soft(tickPlaces(r), `ticks off their places, ${at}`).toEqual([]);
        expect
          .soft(
            read.marks.map(
              (m) =>
                `${same(m.stroke, paint.muted)} ${m.stroke ? deltaE(m.stroke, paint.accent ?? [0, 0, 0]) >= 10 : false}`,
            ),
            `each tick --muted ${JSON.stringify(paint.muted)}, and ΔE 10 or more from --accent, ${at}: ${JSON.stringify(read.marks.map((m) => m.strokeRaw))}`,
          )
          .toEqual(read.marks.map(() => "true true"));
        expect
          .soft(
            read.marks.flatMap((m) => m.motion),
            `transitions or animations on a tick, ${at}`,
          )
          .toEqual([]);
        // Clear of the dot (live), and of the number's chip.
        if (site.state === "live") {
          const d = read.dot ?? { x: r.dot[0], y: r.dot[1] };
          expect
            .soft(
              read.marks
                .filter((m) => boxToPoint(m.box, d.x, d.y) < 4)
                .map((m) => m.cx.toFixed(1)),
              `ticks whose stroke box comes within 4 px of the dot's centre (${d.x.toFixed(1)}, ${d.y.toFixed(1)}), ${at}`,
            )
            .toEqual([]);
        }
        const chip = onFocus(read).find((n) => n.text === String(site.n));
        expect
          .soft(
            read.marks
              .filter((m) => chip && overlaps(m.box, chip.box, 0.5))
              .map((m) => m.cx.toFixed(1)),
            `ticks under n's chip ${JSON.stringify(chip?.box)}, ${at}`,
          )
          .toEqual([]);
      }
    }
    await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
    await openCrew(page, site, 1440, 900);
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "CanvasText";
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba?.(c);
    });
    for (const [width, height] of SIZES) {
      await resize(page, width, height);
      const at = `${site.where} at ${width}, forced colours`;
      const { read } = await readSite(page, site);
      expect
        .soft(
          [
            read.marks.length > 0,
            read.marks.every((m) => same(m.stroke, canvasText)),
          ],
          `ticks shown, each CanvasText ${JSON.stringify(canvasText)}, ${at}: ${JSON.stringify(read.marks.map((m) => m.strokeRaw))}`,
        )
        .toEqual([true, true]);
    }
    await page.emulateMedia({ forcedColors: "none" });

    // Scripts off: the server's ticks, the same count and places.
    const context = await browser.newContext({ javaScriptEnabled: false });
    await context.addInitScript(installRgba);
    const noScript = await context.newPage();
    await noScript.goto(`${site.base}/crew`);
    const shown = await momentsShown(noScript);
    for (const [width, height] of SIZES) {
      await noScript.setViewportSize({ width, height });
      const at = `${site.where} at ${width}, scripts off`;
      const r = await readSite(noScript, site);
      expect
        .soft(
          { marks: r.read.marks.length, off: tickPlaces(r) },
          `shown [data-mark]s against the panel's ${shown} moments, and ticks off their places, ${at}`,
        )
        .toEqual({ marks: shown, off: [] });
    }
    await context.close();
  }

  // At rest and in down: none.
  for (const site of [resting, DEFAULT]) {
    await openCrew(page, site, 1440, 900);
    for (const [width, height] of SIZES) {
      await resize(page, width, height);
      expect
        .soft(
          (await readDetail(page)).marks.length,
          `shown [data-mark]s on ${site.where} at ${width}`,
        )
        .toBe(0);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B4.35: the poll

const told = (fixture: Fixture, patch?: Patch) =>
  toAnswer(feedOf(fixture, patch), FIXTURE_STUDIO);
type MomentIn = { kind: string; at: string; who?: string; text: string };
/** The live fixture's moments as the route tells them: valid, newest first (9 of its 12). */
const LIVE_MOMENTS = (told("live").run as { moments: MomentIn[] }).moments;
/** A moment newer than the live fixture's newest (01:58:40 UTC on 24 Oct), on the same day. */
const moment = (minute: number, text: string): MomentIn => ({
  kind: "report",
  at: `2026-10-24T02:${String(minute).padStart(2, "0")}:00.000Z`,
  who: "qa-engineer",
  text,
});
/**
 * The live fixture told with `count` moments (its own newest, then newer ones made up to reach a
 * count past its 9), plus `extra` newer ones.
 */
function liveWith(count: number, extra: MomentIn[] = []) {
  const made = Array.from(
    { length: Math.max(0, count - LIVE_MOMENTS.length) },
    (_, i) => moment(20 + i, `Moment ${i + 1} made up for the count.`),
  );
  return told("live", {
    current: {
      moments: [...extra, ...made, ...LIVE_MOMENTS.slice(0, count)],
    },
  });
}
/** The live fixture with 10 moments: the drawing's whole tally. */
const LIVE = liveWith(10);

/** What B4.35 holds fixed across a poll: the box and the crop (the viewBox and every plank's d). */
const frame = (read: DetailRead) =>
  JSON.stringify({
    svg: read.svg,
    viewBox: read.viewBox,
    d: read.planks.map((p) => p.d),
  });
const marksOf = (read: DetailRead) =>
  read.marks.map((m) => JSON.stringify(m.box)).sort();

/** A page of its own on a site's /crew at 1440 x 900, with the plan recorder and the clock. */
async function polled(
  browser: Browser,
  site: Site,
  first: Parameters<typeof livePage>[2],
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  await context.addInitScript(recordPlan);
  const page = await context.newPage();
  const live = await livePage(page, `${site.base}/crew`, first);
  expect(
    live.ready,
    `button[data-pause][data-ready] on ${site.where}: the poller started`,
  ).toBe(true);
  return { context, page, live };
}

/** Running animations on any element in [data-plan]. */
const planAnimations = (page: Page) =>
  page.evaluate(
    () =>
      document.getAnimations().filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return Boolean(target?.closest?.("[data-plan]"));
      }).length,
  );

/**
 * Reads the drawing at both sizes on one page, resizing between them (a resize polls nothing):
 * 1440 x 900, then 390 x 844, and back to 1440.
 */
async function bothSizes(page: Page, site: Site) {
  const reads: Read[] = [];
  for (const [width, height] of SIZES) {
    await resize(page, width, height);
    reads.push(await readSite(page, site));
  }
  await resize(page, 1440, 900);
  return reads;
}

test("B4.35 the drawing follows the poll: on the kept live site a told answer adding one moment shows exactly one more tick in the next slot and every earlier tick keeps its box, at 10 a new moment changes no tick's box, the same answer makes no mutation in [data-plan]; live to open keeps the ticks and drops the tip; live to resting with last.sprint n is inked (no hatch or dash, a solid ink edge, n in ink 700 with no chip, no tip or tick); live to another sprint, to no number and to down past 10 minutes is record (the default server's data-sprint and class, no pencil, tip or tick); the box and crop never move, paused nothing changes, nothing animates; the default server stays record", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const site = await siteOf(crew, "live", FIXTURE("live"));
  const n = site.n ?? 31;
  const seat = focusOf("live", n);
  await openCrew(page, DEFAULT, 1440, 900);
  const reference = new Map(
    (await readDetail(page)).planks.map((p) => [p.id, p] as const),
  );

  // 1. The same answer, a moment past 10, then Pause.
  {
    const { context, page, live } = await polled(browser, site, { json: LIVE });
    await takePlan(page);
    const before = await bothSizes(page, site);
    expect
      .soft(
        [
          before.map((r) => [r.read.run, r.read.marks.length]),
          await momentsShown(page),
        ],
        "data-run and ticks at 1440 and 390, and moments shown, after the hydration poll told the live run with 10 moments",
      )
      .toEqual([
        [
          ["live", TICK.max],
          ["live", TICK.max],
        ],
        TICK.max,
      ]);
    await takePlan(page);
    await live.tick(30_000);
    expect
      .soft(
        (await takePlan(page)).mutations,
        "mutations in [data-plan] after the same answer",
      )
      .toEqual([]);
    live.answer({
      json: liveWith(TICK.max, [moment(50, "One more, past ten.")]),
    });
    await live.tick(30_000);
    const mutations = (await takePlan(page)).mutations;
    const after = await bothSizes(page, site);
    expect
      .soft(
        {
          moments: await momentsShown(page),
          mutations,
          sizes: after.map((r) => ({
            marks: marksOf(r.read),
            frame: frame(r.read),
          })),
        },
        "a new moment once 10 are shown: 10 moments, no mutation in [data-plan], and at 1440 and 390 every tick's box, the box and the crop as before",
      )
      .toEqual({
        moments: TICK.max,
        mutations: [],
        sizes: before.map((r) => ({
          marks: marksOf(r.read),
          frame: frame(r.read),
        })),
      });
    await takePlan(page);
    // Paused: nothing polls and nothing changes.
    await live.press();
    live.answer({ json: liveWith(3) });
    const polls = await live.tick(60_000);
    expect
      .soft(
        { polls, mutations: (await takePlan(page)).mutations },
        "paused 60 s with a different answer waiting: polls and mutations in [data-plan]",
      )
      .toEqual({ polls: 0, mutations: [] });
    await context.close();
  }

  // 2. Five moments, then a sixth: one more tick in the next slot, the earlier ones in place.
  {
    const { context, page, live } = await polled(browser, site, {
      json: liveWith(5),
    });
    const five = await bothSizes(page, site);
    expect
      .soft(
        [five.map((r) => r.read.marks.length), await momentsShown(page)],
        "ticks at 1440 and 390, and moments shown, on an answer with 5 moments",
      )
      .toEqual([[5, 5], 5]);
    await takePlan(page);
    live.answer({ json: liveWith(5, [moment(10, "A sixth moment.")]) });
    await live.tick(30_000);
    const moved = (await takePlan(page)).moved;
    const six = await bothSizes(page, site);
    for (const [i, [width]] of SIZES.entries()) {
      const was = five[i];
      const now = six[i];
      if (!was || !now) continue;
      expect
        .soft(
          {
            marks: now.read.marks.length,
            kept: marksOf(was.read).every((b) => marksOf(now.read).includes(b)),
            frame: frame(now.read),
            off: tickPlaces(now),
          },
          `one moment added, at ${width}: 6 ticks, the 5 earlier boxes kept, the box and crop unmoved, and ticks off slots 0 to 5`,
        )
        .toEqual({ marks: 6, kept: true, frame: frame(was.read), off: [] });
    }
    expect
      .soft(
        {
          moments: await momentsShown(page),
          moved,
          animations: await planAnimations(page),
        },
        "moments shown, and transitions or animations in [data-plan], after the sixth moment",
      )
      .toEqual({ moments: 6, moved: [], animations: 0 });
    await context.close();
  }

  // 3. Each change of state from live, on a page of its own.
  const goal = (feedOf("live").current as { goal?: unknown }).goal;
  const changes: [string, Parameters<Live["answer"]>[0] | "down", string][] = [
    [
      "live to open of the same sprint",
      {
        json: told("live", {
          current: {
            live: false,
            moments: (LIVE.run as { moments: MomentIn[] }).moments,
          },
        }),
      },
      "open",
    ],
    [
      `live to resting with last.sprint ${n}`,
      { json: told("resting", { last: { sprint: n, goal } }) },
      "inked",
    ],
    [
      "live to another sprint",
      { json: told("live", { current: { sprint: n + 1 } }) },
      "record",
    ],
    [
      "live to a run with no number",
      { json: told("live", { current: { sprint: null } }) },
      "record",
    ],
    ["live to down past 10 minutes", "down", "record"],
  ];
  for (const [what, reply, run] of changes) {
    const { context, page, live } = await polled(browser, site, { json: LIVE });
    const before = await bothSizes(page, site);
    await takePlan(page);
    if (reply === "down") {
      live.answer({ status: 503 });
      for (let i = 0; i < 21; i++) await live.tick(30_000);
    } else {
      live.answer(reply);
      await live.tick(30_000);
    }
    const moved = (await takePlan(page)).moved;
    const after = await bothSizes(page, site);
    const paint = await colours(page);
    expect
      .soft(
        { moved, animations: await planAnimations(page) },
        `transitions or animations in [data-plan], ${what}`,
      )
      .toEqual({ moved: [], animations: 0 });
    for (const [i, [width]] of SIZES.entries()) {
      const was = before[i];
      const now = after[i];
      if (!was || !now) continue;
      const at = `${what}, at ${width}`;
      expect.soft(now.read.run, `data-run, ${at}`).toBe(run);
      expect
        .soft(
          frame(now.read),
          `the box and the crop (viewBox, every plank's d), ${at}`,
        )
        .toBe(frame(was.read));
      if (run === "open") {
        expect
          .soft(
            { tips: now.read.tips, marks: marksOf(now.read) },
            `the tip gone and the ticks kept, ${at}`,
          )
          .toEqual({ tips: 0, marks: marksOf(was.read) });
        continue;
      }
      expect
        .soft(
          { tips: now.read.tips, marks: now.read.marks.length },
          `[data-tip]s and shown ticks, ${at}`,
        )
        .toEqual({ tips: 0, marks: 0 });
      if (run === "inked") {
        const look = await page.evaluate((id) => {
          const svg = [...document.querySelectorAll("[data-plan] svg")].find(
            (s) => s.getClientRects().length > 0,
          );
          const p = svg?.querySelector(`path[data-plank="${id}"]`);
          if (!p) return null;
          const s = getComputedStyle(p);
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          return {
            fill: s.fill,
            dash: s.strokeDasharray,
            stroke: rgba?.(s.stroke) ?? null,
          };
        }, seat);
        const number = onFocus(now.read).find((x) => x.text === String(n));
        expect
          .soft(
            {
              hatch: look?.fill.startsWith("url(") ?? true,
              dash: look?.dash ?? "?",
              ink: same(look?.stroke, paint.ink),
              number: [
                same(number?.color, paint.ink),
                number?.weight,
                number?.chip ?? null,
              ],
              lettered: onFocus(now.read).map((x) => x.text),
            },
            `the plank seated: no hatch, no dash, a solid ink edge, ${n} in ink 700 with no chip and the only number on it, ${at}: ${JSON.stringify(look)}`,
          )
          .toEqual({
            hatch: false,
            dash: "none",
            ink: true,
            number: [true, 700, null],
            lettered: [String(n)],
          });
      } else {
        const differs = now.read.planks
          .filter((p) => {
            const ref = reference.get(p.id);
            return (
              !ref || ref.sprint !== p.sprint || ref.className !== p.className
            );
          })
          .map((p) => `${p.id} ${p.sprint} ${p.className}`);
        expect
          .soft(
            {
              differs,
              pencil: now.read.planks
                .filter((p) => p.pencil || p.live)
                .map((p) => p.id),
              holder: onFocus(now.read).map((x) => x.text),
            },
            `every plank's data-sprint and class as the default server's, no pencil, and the focus plank's number its holder's, ${at}`,
          )
          .toEqual({
            differs: [],
            pencil: [],
            holder: [reference.get(seat)?.sprint ?? "?"],
          });
      }
    }
    await context.close();
  }

  // 4. The default server: record, whatever the poll tells.
  {
    const { context, page, live } = await polled(browser, DEFAULT, {
      json: LIVE,
    });
    const steps: string[] = [];
    for (const reply of [
      { json: liveWith(TICK.max, [moment(12, "Another.")]) },
      { json: told("live", { current: { live: false } }) },
      { json: told("resting") },
    ]) {
      live.answer(reply);
      await live.tick(60_000);
      const read = await readDetail(page);
      steps.push(`${read.run} ${read.marks.length} ${read.tips}`);
    }
    expect
      .soft(
        { steps, mutations: (await takePlan(page)).mutations },
        "the default server's drawing after live, a new moment, open and resting (data-run, ticks, tips), and mutations in [data-plan] from the hydration poll on",
      )
      .toEqual({
        steps: ["record 0 0", "record 0 0", "record 0 0"],
        mutations: [],
      });
    await context.close();
  }
});
