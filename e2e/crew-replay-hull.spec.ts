import { type Browser, expect, type Page } from "@playwright/test";
import { type Crew, crewOf, crewTest as test } from "./crew-feed";
import {
  type Box,
  cropX,
  cssOf,
  DETAIL_SIZES,
  type DetailRead,
  detailAt,
  fitOf,
  inside,
  readDetail,
  recordPlan,
  seatGeometry,
  TICK,
  takePlan,
} from "./crew-hull";
import { livePage, toAnswer } from "./crew-live";
import {
  canvasOnly,
  crewFit,
  differs,
  marksDrawn,
  openCrewModel,
  rested,
} from "./crew-model";
import {
  advance,
  ENTRY,
  FAR,
  KEPT,
  MERGE_AT,
  momentsPlayed,
  N,
  PAUSE,
  press,
  type ReplaySite,
  readReplay,
  replaySite,
  type SiteName,
  STAMP,
  STEP,
  untilPlayed,
} from "./crew-replay";
import { copper, token } from "./ghost";
import { installRgba } from "./helpers";
import { tokenRgba } from "./log";
import { type Box as ModelBox, pause, whole } from "./model";
import { SEAT_OF } from "./retros";
import { refuseWebGl } from "./webgl";

// Sprint 37, B4e (.crew/sprint/37/contract.md, with amendment 1): the drawing replays the plank,
// B4.46 in 2D on the Off path (WebGL refused) and B4.47 in 3D on B3's harness (CI's SwiftShader,
// every GPU number a floor), written before the build. The places come from B4d's oracle
// (e2e/crew-hull.ts): the tally's crop, its slots and its number's anchor; the states from the
// kept replay sites (e2e/crew-replay.ts), with `page.route` answering `/api/crew` with the
// oracle's answer on Playwright's clock.

test.describe.configure({ mode: "default" });
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

const NAMES: SiteName[] = ["replay", "replay-far", "replay-999"];

test.beforeAll(async () => {
  const crew = await crewOf();
  for (const name of NAMES) void replaySite(crew, name);
});

async function siteOf(crew: Crew, name: SiteName) {
  const site = await replaySite(crew, name);
  expect(
    site.seen,
    `/crew's [data-crew-state] on the ${name} site within ${site.ms} ms`,
  ).toBe("resting");
  return site;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A page of its own on a site's /crew at 1440 x 900, WebGL refused, on the clock. */
async function opened(
  browser: Browser,
  site: ReplaySite | { name: string; base: string },
  options: { forced?: boolean; scheme?: "light" | "dark" } = {},
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1440, height: 900 },
    colorScheme: options.scheme ?? "light",
    forcedColors: options.forced ? "active" : "none",
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  await context.addInitScript(recordPlan);
  const page = await context.newPage();
  const answer =
    "body" in site
      ? toAnswer(site.body(), site.origin)
      : { version: 1, state: "down", run: null };
  const live = await livePage(page, `${site.base}/crew`, { json: answer });
  expect(
    live.ready,
    `button[data-pause][data-ready] on the ${site.name} site: the poller started`,
  ).toBe(true);
  return { context, page, live };
}

async function resize(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
  await sleep(100);
}

/** The tally's slots in the shown svg (`data-slots`, "|"-separated), and the pencil's look. */
function tallyOf(page: Page, seat: string) {
  return page.evaluate((id) => {
    const svg = [...document.querySelectorAll("[data-plan] svg")].find(
      (s) => !s.closest("defs, pattern") && s.getClientRects().length > 0,
    );
    const slots = svg
      ?.querySelector("[data-slots]")
      ?.getAttribute("data-slots");
    const plank = svg?.querySelector(`path[data-plank="${id}"]`);
    const s = plank ? getComputedStyle(plank) : null;
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    return {
      slots: slots ? slots.split("|").filter(Boolean).length : 0,
      plank: plank
        ? {
            sprint: plank.getAttribute("data-sprint"),
            pencil: plank.hasAttribute("data-pencil"),
            live: plank.hasAttribute("data-live"),
            hatch: (s?.fill ?? "").startsWith("url("),
            dash: s?.strokeDasharray ?? "",
            stroke: rgba?.(s?.stroke ?? "") ?? null,
          }
        : null,
    };
  }, seat);
}

const same = (a: number[] | null | undefined, b: number[] | null | undefined) =>
  Boolean(
    a &&
      b &&
      a.slice(0, 3).every((v, i) => Math.abs(v - (b[i] ?? -9)) <= 1) &&
      Math.abs((a[3] ?? 1) - (b[3] ?? 1)) <= 0.02,
  );

/** What holds still through a replay: the svg's box, the viewBox and every plank's d. */
const frame = (read: DetailRead) =>
  JSON.stringify({
    svg: read.svg,
    viewBox: read.viewBox,
    d: read.planks.map((p) => p.d),
  });

/** The shown ticks against the slots, as B4.34 places them: x within 1 px, stern-most last. */
function tickPlaces(read: DetailRead, seat: string) {
  const fit = fitOf(read);
  const g = seatGeometry(seat);
  return [...read.marks]
    .sort((a, b) => b.cx - a.cx)
    .flatMap((m, k) => {
      const [x] = cssOf(read, fit, [g.slot(k), g.bottom(g.slot(k))]);
      return Math.abs(m.cx - x) <= 1
        ? []
        : [`slot ${k}: x ${m.cx.toFixed(1)} not ${x.toFixed(1)}`];
    });
}

/** The stamp as shown: its box, words, look, and the plank numbers near it. */
function stampOf(page: Page) {
  return page.evaluate((selector) => {
    const stamp = document.querySelector(selector);
    if (!stamp) return null;
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const s = getComputedStyle(stamp);
    const r = stamp.getBoundingClientRect();
    const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    const plan = document.querySelector("[data-plan]");
    const near = [...(plan?.querySelectorAll("*") ?? [])]
      .filter((el) => {
        if (el.closest("defs") || el.getClientRects().length === 0)
          return false;
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent ?? "")
          .join("")
          .trim();
        return /^\d+$/.test(own);
      })
      .filter((el) => {
        const b = el.getBoundingClientRect();
        return (
          b.left < box.right + 4 &&
          b.right > box.left - 4 &&
          b.top < box.bottom + 4 &&
          b.bottom > box.top - 4
        );
      })
      .map((el) => (el.textContent ?? "").trim());
    return {
      shown:
        stamp.getClientRects().length > 0 &&
        stamp.checkVisibility({
          visibilityProperty: true,
          opacityProperty: true,
        }),
      text: (stamp.textContent ?? "").trim(),
      upper: s.textTransform,
      size: Number.parseFloat(s.fontSize),
      color: rgba?.(s.color) ?? null,
      background: rgba?.(s.backgroundColor) ?? null,
      box,
      inDrawing: Boolean(stamp.closest(".crew-drawing")),
      near,
    };
  }, STAMP);
}

// ---------------------------------------------------------------------------------------------

test("B4.46 the plank replays, in 2D: at rest on the replay fixture at 320, 390, 768, 1024 and 1440 data-focus is 29's seat, data-run inked and data-tally set, the box B4.33's, the crop the tally's, 29 in ink 700 with no chip inside the box, the dot's and the number's centres at least 8% of the width from each side, 10 slots, no [data-mark] or [data-tip], the stamp hidden; playing, data-replay, open with the pencil (hatch, dashed --muted edge, data-pencil, no data-live) and min(k, 10) ticks at B4.34's x, no tick moving; from the merge inked with 0 ticks; the stamp Replay shown from Play to the merge, paused or not, ink on --background, 11 px (13 from 1280), inside the box and 4 px clear of every plank number, at 1440, 1024, 390 and 320 on 29's crop and the far crop; the box, crop and focus never move and nothing animates; on the 999 variant the drawing is the default server's and doesn't change", async ({
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const replay = await siteOf(crew, "replay");
  const seat = SEAT_OF.get(N) ?? "";
  const g = seatGeometry(seat);

  // At rest, at the five widths.
  const { context, page } = await opened(browser, replay);
  const paint = {
    ink: await tokenRgba(page, "--foreground"),
    muted: await tokenRgba(page, "--muted"),
    ground: await tokenRgba(page, "--background"),
  };
  for (const { width, w } of DETAIL_SIZES) {
    await resize(page, width);
    const at = `at rest on the replay site at ${width}`;
    const read = await readDetail(page);
    const fit = fitOf(read);
    const detail = detailAt(width);
    const crop = cropX(detail, seat, true);
    const tally = await tallyOf(page, seat);
    const replayRead = await readReplay(page);
    const numbers = read.numbers.filter((n) => n.onFocus);
    const number = numbers.find((n) => n.text === String(N));
    const svg = read.svg;
    const sw = svg ? svg.right - svg.left : 0;
    const sh = svg ? svg.bottom - svg.top : 0;
    const [dx] = cssOf(read, fit, g.dot);
    const nx = number ? (number.box.left + number.box.right) / 2 : Number.NaN;
    const margin = (x: number) =>
      svg ? Math.min(x - svg.left, svg.right - x) / sw : Number.NaN;
    expect
      .soft(
        {
          focus: read.focus,
          run: read.run,
          tally: replayRead.plan.tally,
          box:
            Math.abs(sw - w) <= 1 &&
            Math.abs(sh - (w * detail.box[3]) / detail.box[2]) <= 1,
          crop: {
            s: Math.abs((fit?.s ?? 0) / detail.s - 1) <= 0.005,
            oy: Math.abs((fit?.oy ?? 0) - detail.oy) <= 0.5,
            ox: Math.abs((fit?.ox ?? 0) - crop.ox) <= 0.5,
          },
          lettered: numbers.map((n) => n.text),
          number: [
            same(number?.color, paint.ink),
            number?.weight,
            number?.chip ?? null,
            Boolean(number && svg && inside(number.box, svg)),
          ],
          margins: [margin(dx) >= 0.08, margin(nx) >= 0.08],
          slots: tally.slots,
          marks: read.marks.length,
          tips: read.tips,
          stamp: [replayRead.stamps, replayRead.stamp?.shown ?? null],
        },
        `${at}: the fit ${JSON.stringify(fit)} against the tally's crop ox ${crop.ox.toFixed(2)}, the dot's margin ${margin(dx).toFixed(3)} and the number's ${margin(nx).toFixed(3)} of the width, the number ${JSON.stringify(number)}`,
      )
      .toEqual({
        focus: seat,
        run: "inked",
        tally: true,
        box: true,
        crop: { s: true, oy: true, ox: true },
        lettered: [String(N)],
        number: [true, 700, null, true],
        margins: [true, true],
        slots: TICK.max,
        marks: 0,
        tips: 0,
        stamp: [1, false],
      });
  }

  // Playing, at 1440 and 390: each step's drawing.
  await resize(page, 1440);
  const rest: Record<number, DetailRead> = { 1440: await readDetail(page) };
  await resize(page, 390);
  rest[390] = await readDetail(page);
  await resize(page, 1440);
  await takePlan(page);
  await press(page, ENTRY);
  await untilPlayed(page, 1);
  const wrong: string[] = [];
  const last: Record<number, string[]> = { 1440: [], 390: [] };
  for (let k = 1; k <= KEPT.length; k++) {
    for (const width of [1440, 390] as const) {
      await resize(page, width);
      const read = await readDetail(page);
      const r = await readReplay(page);
      const t = await tallyOf(page, seat);
      const at = `k = ${k} at ${width}`;
      const inked = k >= MERGE_AT;
      const shown = Math.min(k, TICK.max);
      const boxes = read.marks.map((m) => JSON.stringify(m.box));
      const problems = [
        r.plan.replay ? null : "no data-replay",
        read.run === (inked ? "inked" : "open") ? null : `data-run ${read.run}`,
        read.focus === seat ? null : `data-focus ${read.focus}`,
        rest[width] && frame(read) === frame(rest[width])
          ? null
          : "the box or crop moved",
        read.tips === 0 ? null : `${read.tips} [data-tip]`,
        read.marks.length === (inked ? 0 : shown)
          ? null
          : `${read.marks.length} ticks`,
        inked
          ? t.plank?.pencil
            ? "still pencil"
            : null
          : t.plank?.pencil &&
              !t.plank.live &&
              t.plank.hatch &&
              !/^(none|0(px)?)$/.test(t.plank.dash) &&
              same(t.plank.stroke, paint.muted)
            ? null
            : `not the pencil: ${JSON.stringify(t.plank)}`,
        ...(inked ? [] : tickPlaces(read, seat)),
        inked || last[width]?.every((b) => boxes.includes(b))
          ? null
          : "an earlier tick moved",
        (r.stamp?.shown ?? false) === !inked
          ? null
          : `the stamp ${r.stamp?.shown ? "shown" : "hidden"}`,
      ].filter((p): p is string => p !== null);
      if (problems.length > 0) wrong.push(`${at}: ${problems.join("; ")}`);
      last[width] = boxes;
    }
    await resize(page, 1440);
    if (k === 3) {
      // Paused, the stamp stays.
      await press(page, PAUSE);
      const paused = await readReplay(page);
      if (!paused.stamp?.shown) wrong.push("paused at k = 3: the stamp hidden");
      await press(page, PAUSE);
    }
    if (k < KEPT.length) {
      await page.clock.runFor(STEP);
      await untilPlayed(page, k + 1);
    }
  }
  const moved = await takePlan(page);
  const animations = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) =>
          (a.effect as KeyframeEffect | null)?.target?.closest?.("[data-plan]"),
        ).length,
  );
  expect
    .soft(
      { wrong, moved: moved.moved, animations },
      "each step of the replay at 1440 and 390 against the contract, and transitions or animations in [data-plan]",
    )
    .toEqual({ wrong: [], moved: [], animations: 0 });
  await context.close();

  // The stamp, playing, on 29's crop and the far crop.
  const far = await siteOf(crew, "replay-far");
  expect(
    SEAT_OF.has(FAR),
    `the oracle's far sprint ${FAR} has a seat (the crop's other end)`,
  ).toBe(true);
  test.info().annotations.push({
    type: "far crop",
    description: `sprint ${FAR} on seat ${SEAT_OF.get(FAR)}, against ${N} on ${seat}`,
  });
  const stamps: string[] = [];
  for (const site of [replay, far]) {
    const { context, page } = await opened(browser, site);
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    const ink = await tokenRgba(page, "--foreground");
    const ground = await tokenRgba(page, "--background");
    for (const width of [1440, 1024, 390, 320]) {
      await resize(page, width);
      const s = await stampOf(page);
      const read = await readDetail(page);
      const problems = !s
        ? ["no stamp"]
        : [
            s.shown ? null : "hidden",
            s.text === "Replay" && s.upper === "uppercase"
              ? null
              : `"${s.text}" ${s.upper}`,
            same(s.color, ink) && same(s.background, ground)
              ? null
              : `${JSON.stringify(s.color)} on ${JSON.stringify(s.background)}`,
            s.size === (width >= 1280 ? 13 : 11) ? null : `${s.size} px`,
            s.inDrawing ? null : "outside .crew-drawing",
            read.svg && inside(s.box as Box, read.svg)
              ? null
              : `its box ${JSON.stringify(s.box)} outside ${JSON.stringify(read.svg)}`,
            s.near.length === 0
              ? null
              : `numbers within 4 px: ${s.near.join(" ")}`,
          ].filter((p): p is string => p !== null);
      if (problems.length > 0)
        stamps.push(`${site.name} at ${width}: ${problems.join("; ")}`);
    }
    await context.close();
  }
  // Forced colours: CanvasText.
  {
    const { context, page } = await opened(browser, replay, { forced: true });
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    const look = await page.evaluate((selector) => {
      const probe = document.createElement("span");
      probe.style.cssText = "forced-color-adjust: none; color: CanvasText";
      document.body.append(probe);
      const text = getComputedStyle(probe).color;
      probe.remove();
      const s = document.querySelector(selector);
      return s
        ? [
            getComputedStyle(s).color === text,
            getComputedStyle(s).borderTopColor === text,
          ]
        : null;
    }, STAMP);
    if (JSON.stringify(look) !== "[true,true]")
      stamps.push(
        `forced colours: text and border CanvasText ${JSON.stringify(look)}`,
      );
    await context.close();
  }
  expect
    .soft(stamps, "the stamp, playing, where it isn't the contract's")
    .toEqual([]);

  // The 999 variant: the default server's drawing, unchanged by the replay.
  const s999 = await siteOf(crew, "replay-999");
  const reference = await (async () => {
    const { context, page } = await opened(browser, {
      name: "default",
      base: "",
    });
    const read = await readDetail(page);
    await context.close();
    return read;
  })();
  {
    const { context, page } = await opened(browser, s999);
    const read = await readDetail(page);
    const drawing = (r: DetailRead) =>
      JSON.stringify({
        focus: r.focus,
        run: r.run,
        viewBox: r.viewBox,
        planks: r.planks.map(
          (p) => `${p.id} ${p.sprint} ${p.className} ${p.pencil}`,
        ),
        marks: r.marks.length,
        tips: r.tips,
      });
    await takePlan(page);
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    const r3 = await advance(page, 2);
    expect
      .soft(
        {
          same: drawing(read) === drawing(reference),
          played: momentsPlayed(r3),
          mutations: (await takePlan(page)).mutations,
          stamp: r3.stamp?.shown ?? false,
        },
        `the 999 variant: at rest the default server's drawing (${drawing(read)} against ${drawing(reference)}), and k = 3 with no mutation in [data-plan] and no stamp shown`,
      )
      .toEqual({ same: true, played: 3, mutations: [], stamp: false });
    await context.close();
  }
});

// ---------------------------------------------------------------------------------------------

test("B4.47 the hull follows the replay: at 1440 on B3's harness, at rest data-marks 0 and nothing pencil; each step that changes the ticks draws exactly 1 frame and data-marks follows to 10, then 0 at the merge, 0 frames between steps; no pixel within ΔE 10 of --accent; the canvas changes only inside the focus plank's box and a 5 px band, and at the merge it is the rest frame (the camera unmoved); on B4.39's Off paths no chunk is requested on the replay fixture", async ({
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const replay = await siteOf(crew, "replay");
  const answer = toAnswer(replay.body(), replay.origin);
  const run = await openCrewModel(
    browser,
    { width: 1440, height: 900, stored: "calm", clock: true },
    { json: answer },
  );
  await run.context.addInitScript(installRgba);
  await rested(run, `${replay.base}/crew`, true);
  const page = run.page;
  const accent = await token(page, "--accent");
  const ground = await token(page, "--background");
  const clip = whole(
    ((await crewFit(page)).canvas ?? {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }) as ModelBox,
  );
  const shot = async () => (await canvasOnly(page, clip)).image;
  const count = async () => (await run.frames()).length;
  const atRest = {
    marks: await marksDrawn(page),
    pencil: await page.evaluate(
      () => document.querySelectorAll("[data-plan] [data-pencil]").length,
    ),
    run: (await readReplay(page)).plan.run,
  };
  expect
    .soft(
      atRest,
      "at rest on the replay site: data-marks, pencil planks and data-run",
    )
    .toEqual({ marks: 0, pencil: 0, run: "inked" });
  const restShot = await shot();

  // Each step: the frames before it (between steps) and the frames it draws.
  const steps: string[] = [];
  const shots: Awaited<ReturnType<typeof shot>>[] = [];
  const before = await count();
  await press(page, ENTRY);
  await pause(300);
  await page.clock.runFor(17);
  await pause(200);
  steps.push(
    `k 1: ${(await count()) - before} frames, marks ${await marksDrawn(page)}`,
  );
  shots.push(await shot());
  for (let k = 2; k <= KEPT.length + 1; k++) {
    const c0 = await count();
    await page.clock.runFor(STEP - 17 - 1);
    await pause(200);
    const c1 = await count();
    await page.clock.runFor(1);
    await pause(300);
    await page.clock.runFor(17);
    await pause(200);
    const c2 = await count();
    const what = k > KEPT.length ? "the end" : `k ${k}`;
    steps.push(
      `${what}: ${c1 - c0} between, ${c2 - c1} frames, marks ${await marksDrawn(page)}`,
    );
    shots.push(await shot());
  }
  const want = [
    "k 1: 1 frames, marks 1",
    ...Array.from({ length: KEPT.length - 1 }, (_, i) => {
      const k = i + 2;
      const marks = k >= MERGE_AT ? 0 : Math.min(k, TICK.max);
      const changes = k <= TICK.max || k === MERGE_AT;
      return `k ${k}: 0 between, ${changes ? 1 : 0} frames, marks ${marks}`;
    }),
    "the end: 0 between, 0 frames, marks 0",
  ];
  expect
    .soft(steps, "frames between steps, frames each step draws, and data-marks")
    .toEqual(want);

  // Copper: none at any point.
  expect
    .soft(
      shots.map((image, i) => `${i + 1}: ${copper(image, accent, ground)}`),
      "copper pixels in the canvas at each step",
    )
    .toEqual(shots.map((_, i) => `${i + 1}: 0`));

  // Where the canvas changes: the plank's box (rest against 10 ticks) and its band.
  const tenth = shots[TICK.max - 1];
  const plank = tenth ? differs(restShot, tenth).box : null;
  const band = plank
    ? {
        left: plank.left - 5,
        top: plank.top - 5,
        right: plank.right + 5,
        bottom: plank.bottom + 5,
      }
    : null;
  const outside = shots.flatMap((image, i) => {
    const d = differs(restShot, image).box;
    if (!d || !band) return [];
    return d.left >= band.left &&
      d.right <= band.right &&
      d.top >= band.top &&
      d.bottom <= band.bottom
      ? []
      : [`step ${i + 1}: ${JSON.stringify(d)}`];
  });
  const merged = shots[MERGE_AT - 1];
  expect
    .soft(
      {
        plank: Boolean(
          plank &&
            (plank.right - plank.left) * (plank.bottom - plank.top) <
              (clip.width * clip.height) / 4,
        ),
        outside,
        merge: merged ? differs(restShot, merged).count : -1,
      },
      `the plank's changed box ${JSON.stringify(plank)} (rest against 10 ticks) a plank's, not the canvas (${clip.width} x ${clip.height}); steps changing pixels outside it and a 5 px band; pixels at the merge that differ from rest`,
    )
    .toEqual({ plank: true, outside: [], merge: 0 });
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();

  // B4.39's Off paths: no chunk, replaying.
  const baseline = await openCrewModel(browser, { refuse: true });
  await baseline.goto(`${replay.base}/crew`);
  await pause(3500);
  const allowed = new Set(
    (await baseline.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  await baseline.close();
  const paths: [string, Parameters<typeof openCrewModel>[1], boolean][] = [
    ["Off stored", { stored: "off" }, false],
    ["WebGL refused", { refuse: true }, false],
    ["forced colours", { forcedColors: "active" }, false],
    ["Save-Data", { saveData: true }, false],
    ["print", {}, true],
  ];
  const chunks: string[] = [];
  for (const [what, options, print] of paths) {
    const off = await openCrewModel(browser, { ...options, clock: true });
    if (print) await off.page.emulateMedia({ media: "print" });
    await off.goto(`${replay.base}/crew`);
    await press(off.page, ENTRY);
    const played = momentsPlayed(await advance(off.page, 3));
    await pause(500);
    const extra = (await off.scripts()).list
      .map((s) => new URL(s.url).pathname)
      .filter((p) => !allowed.has(p));
    chunks.push(
      `${what}: played ${played}, more scripts ${JSON.stringify(extra)}`,
    );
    await off.close();
  }
  expect
    .soft(chunks, "B4.39's Off paths on the replay site, 3 steps played")
    .toEqual(paths.map(([what]) => `${what}: played 4, more scripts []`));
});
