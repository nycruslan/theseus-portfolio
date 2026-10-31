import { expect, type Page } from "@playwright/test";
import { expected } from "./crew";
import {
  type Answer,
  type Crew,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import {
  cssOf,
  fitOf,
  focusOf,
  momentsShown,
  NEWEST,
  readDetail,
  seatGeometry,
} from "./crew-hull";
import { FIXTURE_STUDIO, feedOf, type Patch, toAnswer } from "./crew-live";
import {
  type CrewRun,
  canvasOnly,
  capAt,
  crewFit,
  deltaAt,
  differs,
  LAYOUT,
  MOVE,
  marksDrawn,
  openCrewModel,
  plankPoints,
  planksAlone,
  pressMode,
} from "./crew-model";
import { copper, markVisit, sinceMark, token } from "./ghost";
import { installRgba } from "./helpers";
import {
  type Box,
  FIRST,
  FRAME,
  note,
  pause,
  REST,
  runTo,
  SHOWN,
  TRIANGLES_AT,
  whole,
} from "./model";
import {
  decodePng,
  deltaE,
  edges,
  hausdorff,
  type Image,
  pixel,
} from "./pixels";
import type { ModelOptions, Script } from "./webgl";

// Sprint 36, B4d (.crew/sprint/36/contract.md, B4.36 to B4.38 and B4.40, with Iris's amendments,
// decisions.md 6 and notes-iris.md): the card model on /crew's detail drawing, on B3's harness
// (CI's SwiftShader, every GPU number a floor), written before the build. B4.36 and B4.38 run on
// the default server (down: the drawing is `record`, the focus point the focus number's anchor);
// B4.37 and B4.40 on B4a's kept live site, with `page.route` answering `/api/crew` and the clock
// driving the poll, and B4.36's framing on the live (3.0) and sprint 999 (6.1) sites. Pages are
// shared per size where a check allows (sprint 33, decision 12: a WebGL page is 5 to 7 s to rest).

test.describe.configure({ mode: "default" });
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

const SWIFTSHADER =
  "SwiftShader, headless Chromium's software WebGL: a floor, not a GPU's number";
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
/** Two animation frames on the clock: "within 2 frames". */
const TWO_FRAMES = Math.ceil(2 * FRAME);
/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;
const LIVE_999: Partial<Answer> = {
  fixture: "live",
  patch: { current: { sprint: 999 } },
};

type Site = { base: string; where: string; n: number };

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
  const { base, exp, n, seen } = await kept(crew, name, answer);
  expect(
    seen,
    `/crew's [data-crew-state] on the ${name} site within ${STATE_WAIT} ms`,
  ).toBe(exp.state);
  return { base, where: `the ${name} site`, n: n ?? Number.NaN };
}

test.beforeAll(({ crew }) => {
  void kept(crew, "live", { fixture: "live" });
  void kept(crew, "open", { fixture: "open" });
  void kept(crew, "home-999", LIVE_999);
});

const told = (fixture: "live" | "open" | "resting", patch?: Patch) =>
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
/** The live fixture told with `count` moments (made-up newer ones past its 9), plus `extra`. */
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

/**
 * The shown figures in [data-plan] that sit on the hull: over a pixel the canvas covers at half or
 * more (station figures and captions lie off it), in CSS px relative to `clip`.
 */
async function onHull(page: Page, clip: Box) {
  const hull = await canvasOnly(page, clip);
  return (await figures(page))
    .filter((f) => {
      const x = Math.round((f.box.left + f.box.right) / 2 - clip.x);
      const y = Math.round((f.box.top + f.box.bottom) / 2 - clip.y);
      if (x < 0 || y < 0 || x >= hull.image.width || y >= hull.image.height)
        return false;
      return (hull.alpha[y * hull.image.width + x] ?? 0) >= 0.5;
    })
    .map((f) => f.text);
}

async function rested(run: CrewRun, url: string, clock = false) {
  await run.goto(url);
  if (clock) await run.until([...REST], 50, FIRST);
  else await run.waitFor([...REST], FIRST);
  await pause(300);
}

/** The shown svg's box as a Box. */
async function svgBox(page: Page): Promise<Box | null> {
  return (await crewFit(page)).svg;
}

/** The focus number at rest: the shown figures in [data-plan] (B4.37: only the focus plank's). */
const figures = (page: Page) =>
  readDetail(page).then((r) =>
    r.numbers.map((n) => ({ text: n.text, box: n.box })),
  );

/** The canvas's fit on the drawing at rest: one canvas after [data-plan], whole buffer, the box. */
async function fitChecks(
  run: CrewRun,
  width: number,
  dpr: number,
  where: string,
) {
  const ratio = capAt(width, dpr);
  const fit = await crewFit(run.page);
  expect
    .soft(
      [fit.next, fit.models, fit.canvases],
      `[data-model] right after [data-plan], one model, one canvas, ${where}`,
    )
    .toEqual([true, 1, 1]);
  const [bw = 0, bh = 0] = fit.buffer ?? [];
  const c = fit.canvas;
  const s = fit.svg;
  expect
    .soft(
      Boolean(
        c &&
          s &&
          Number.isInteger(bw) &&
          Number.isInteger(bh) &&
          Math.abs(c.width * ratio - bw) <= LAYOUT * ratio + 1e-3 &&
          Math.abs(c.height * ratio - bh) <= LAYOUT * ratio + 1e-3 &&
          Math.abs(c.width - s.width) <= 1 / ratio + 1e-3 &&
          Math.abs(c.height - s.height) <= 1 / ratio + 1e-3 &&
          Math.abs(c.x - s.x) <= 1 / ratio + 1e-3 &&
          Math.abs(c.y - s.y) <= 1 / ratio + 1e-3,
      ),
      `the canvas (${JSON.stringify(c)}, buffer ${bw} x ${bh} at ${ratio}x) on the drawing's box ${JSON.stringify(s)} in whole buffer pixels, ${where}`,
    )
    .toBe(true);
}

/** Copper pixels (within ΔE 10 of --accent over the ground) in an image, with their positions. */
function copperAt(image: Image, accent: number[], ground: number[]) {
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
  return at;
}

// ---------------------------------------------------------------------------------------------

test("B4.36 it stands on /crew: [data-model] follows [data-plan] and comes to rest; frame 1 registered on the shown detail within B3.1's bound with the planks' fills the Off page's within 8 levels; the canvas on the drawing's box in whole buffer pixels at 320, 390, 768, 1024 and 1440; settled on seats 3.0 and 6.1 the dot and the focus number's centre 8% or more of the canvas's width from each side and the plank painted 15 px deep at the tally's middle at 1440 and 1024 (13 at 390; decision 8); through the move the focus point within 1 px of its frame-1 point; with WebGL on /crew requests the 3D chunk file / requests", async ({
  browser,
  crew,
}, testInfo) => {
  test.setTimeout(420_000);
  // Registration and the move, on the default server (record: the focus point is the focus
  // number's anchor, which the number rides).
  const chunks: string[][] = [];
  for (const size of SIZES) {
    const where = `the default server at ${size.width} x ${size.height}`;
    const off = await openCrewModel(browser, { ...size, refuse: true });
    await off.goto("/crew");
    const offBox = await svgBox(off.page);
    expect(
      offBox,
      `the shown drawing with WebGL refused, ${where}`,
    ).not.toBeNull();
    const clip = whole(offBox as Box);
    const silhouette = await planksAlone(off.page, clip);
    const points = await plankPoints(off.page);
    const offView = decodePng(await off.page.screenshot());
    const offScripts = (await off.scripts()).list;
    await off.close();

    const on = await openCrewModel(browser, { ...size, clock: true });
    await on.goto("/crew");
    expect(
      await on.until(SHOWN, 4, FIRST),
      `frame 1 is landed on the clock, ${where}`,
    ).toBe("landed");
    expect
      .soft(await svgBox(on.page), `the drawing's box with the model, ${where}`)
      .toEqual(offBox);
    const model = await canvasOnly(on.page, clip);
    const onView = decodePng(await on.page.screenshot());
    const [w, h] = [model.image.width, model.image.height];
    const distance = hausdorff(
      edges(silhouette.alpha, w, h),
      edges(model.alpha, w, h),
      w,
      h,
    );
    expect
      .soft(
        distance.max,
        `frame 1's silhouette against the 2D hull's (${silhouette.outlined ? "its outline filled" : "its planks filled"}; px, B3.1's 1.5 at DPR 1), ${where}`,
      )
      .toBeLessThanOrEqual(1.5);
    const fills = points
      .filter((p) => p.at)
      .map((p) => ({
        id: p.id,
        delta: deltaAt(offView, onView, p.at?.x ?? 0, p.at?.y ?? 0),
      }))
      .filter((f) => !(f.delta <= 8));
    expect
      .soft(
        [points.filter((p) => p.at).length > 0, fills],
        `planks sampled, and those whose frame-1 fill is more than 8 levels off the Off page's, ${where}`,
      )
      .toEqual([true, []]);

    // The focus point: the focus number's anchor, which the number rides, through the move.
    const focus = await on.page.evaluate((n) => {
      const el = [...document.querySelectorAll("[data-plan] *")].find(
        (e) =>
          e.getClientRects().length > 0 &&
          [...e.childNodes].some(
            (c) =>
              c.nodeType === Node.TEXT_NODE &&
              (c.textContent ?? "").trim() === n,
          ),
      );
      (window as Window & { __focusNumber?: Element }).__focusNumber = el;
      const r = el?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, String(NEWEST));
    expect(
      focus,
      `the focus number ${NEWEST} shown at frame 1, ${where}`,
    ).not.toBeNull();
    await on.until(["lofting"], 4, 20_000);
    const drift: number[] = [];
    for (let i = 0; i < 40; i++) {
      const state = await on.state();
      const at = await on.page.evaluate(() => {
        const r = (
          window as Window & { __focusNumber?: Element }
        ).__focusNumber?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      });
      drift.push(
        at && focus ? Math.hypot(at.x - focus.x, at.y - focus.y) : Number.NaN,
      );
      if (state && REST.includes(state)) break;
      await on.step(100);
    }
    note(
      testInfo,
      "focus",
      `${where}: the focus number's drift from frame 1 through the move, px: ${drift.map((d) => d.toFixed(2)).join(" ")}`,
    );
    expect
      .soft(
        Math.max(...drift.map((d) => (Number.isNaN(d) ? 99 : d))),
        `the focus point's greatest drift from its frame-1 point through the move (px), ${where}`,
      )
      .toBeLessThanOrEqual(1);
    expect.soft(on.errors, `console errors, ${where}`).toEqual([]);
    const onScripts = (await on.scripts()).list;
    await on.close();
    if (size.width === 1440) {
      const offPaths = new Set(offScripts.map((s) => new URL(s.url).pathname));
      chunks.push(
        onScripts
          .map((s) => new URL(s.url).pathname)
          .filter((p) => !offPaths.has(p))
          .sort(),
      );
    }
  }

  // The chunk / requests with WebGL on, beyond its refused page's.
  const homeOff = await openCrewModel(browser, { refuse: true });
  await homeOff.goto("/");
  await pause(IDLE);
  const homeOffPaths = new Set(
    (await homeOff.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  await homeOff.close();
  const homeOn = await openCrewModel(browser, {});
  await rested(homeOn, "/");
  const home = (await homeOn.scripts()).list
    .map((s) => new URL(s.url).pathname)
    .filter((p) => !homeOffPaths.has(p))
    .sort();
  await homeOn.close();
  expect
    .soft(
      { crew: chunks[0], home: home.length > 0 },
      "the scripts /crew fetches with WebGL on beyond its refused page's, against /'s 3D chunk",
    )
    .toEqual({ crew: home, home: true });

  // The fit at five widths, and the framing on 3.0 (the live site) and 6.1 (sprint 999).
  const live = await siteOf(crew, "live", { fixture: "live" });
  const s999 = await siteOf(crew, "home-999", LIVE_999);
  for (const site of [live, s999]) {
    const seat = focusOf("live", site.n);
    const widths =
      site === live ? [1440, 1024, 768, 390, 320] : [1440, 1024, 390];
    for (const width of widths) {
      const height = width < 768 ? 844 : 900;
      const where = `${site.where} (${seat}) at ${width} x ${height}`;
      // The hydration poll held, so the page stays as the server drew it until it's released.
      const run = await openCrewModel(
        browser,
        { width, height, stored: "calm" },
        { hold: true },
      );
      await run.context.addInitScript(installRgba);
      await rested(run, `${site.base}/crew`);
      await fitChecks(run, width, 1, where);
      if (![1440, 1024, 390].includes(width)) {
        await run.close();
        continue;
      }
      const c = (await crewFit(run.page)).canvas;
      const clip = whole(c as Box);
      const live2d = await readDetail(run.page);
      const fit = fitOf(live2d);
      const g = seatGeometry(seat);
      const focusPoint = cssOf(live2d, fit, g.focus);
      const accent = await token(run.page, "--accent");
      const ground = await token(run.page, "--background");
      const pencilShot = await canvasOnly(run.page, clip);
      const coppers = copperAt(pencilShot.image, accent, ground);
      const maxX = Math.max(...coppers.map(([x]) => x));
      const near = coppers.filter(([x]) => x >= maxX - 6);
      const dot = near.length
        ? near.reduce(
            (a, [x, y]) => [a[0] + x / near.length, a[1] + y / near.length],
            [0, 0],
          )
        : null;
      const number = (await figures(run.page)).find(
        (f) => f.text === String(site.n),
      );
      const numberX = number
        ? (number.box.left + number.box.right) / 2 - clip.x
        : Number.NaN;
      const cw = clip.width;
      const sides = (x: number) => x >= 0.08 * cw && x <= 0.92 * cw;
      // The plank's depth at the tally's middle: the pencil plank's pixels (the settled frame's
      // difference from the same pose with the run turned record) in the focus point's column.
      await run.release({
        json: told("live", { current: { sprint: site.n + 1 } }),
      });
      await run.waitFor(["settled", "still"], 5_000);
      await pause(400);
      const recordShot = await canvasOnly(run.page, clip);
      // The focus point is on the lower edge, held on its 2D place: the plank is the changed rows
      // above it (the ticks hang below it, so rows past it are left out), top to bottom.
      const column = Math.round(focusPoint[0] - clip.x);
      const edge = Math.round(focusPoint[1] - clip.y);
      const depths: number[] = [];
      for (const dx of [-2, -1, 0, 1, 2]) {
        const x = column + dx;
        const rows: number[] = [];
        for (let y = Math.max(0, edge - 60); y <= edge + 1; y++) {
          const p = pixel(pencilShot.image, x, y);
          const q = pixel(recordShot.image, x, y);
          const d = Math.max(
            ...[0, 1, 2].map((i) => Math.abs((p[i] ?? 0) - (q[i] ?? 0))),
          );
          if (d > 6) rows.push(y);
        }
        depths.push(
          rows.length ? Math.max(...rows) - Math.min(...rows) + 1 : 0,
        );
      }
      const depth = [...depths].sort((a, b) => a - b)[2] ?? 0;
      // Decision 8 (Iris): painted depth, the lines' ink between, at least 15 px from 1024 and 13
      // at 390 (her geometric 18 and 16, less the 3.0 to 3.4 px the ink takes).
      const floor = width >= 1024 ? 15 : 13;
      note(
        testInfo,
        "framing",
        `${where}: the dot at ${dot?.map((v) => v.toFixed(1)).join(", ")}, the number's centre at ${numberX.toFixed(1)} of ${cw} px; the plank ${depth} px deep at the tally's middle (column ${column}).`,
      );
      expect
        .soft(
          {
            dot: Boolean(dot && sides(dot[0])),
            number: sides(numberX),
            depth: depth >= floor,
          },
          `settled: the dot (${dot?.[0]?.toFixed(1)}) and the focus number's centre (${numberX.toFixed(1)}) 8% or more of ${cw} px from each side, and the plank ${depth} px deep at the tally's middle, at least ${floor}, ${where}`,
        )
        .toEqual({ dot: true, number: true, depth: true });
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }
  }
});

test("B4.37 the ticks in 3D, and copper only while live: on the live and open sites data-marks is the moments shown at rest; a poll that changes the ticks draws exactly 1 frame and data-marks follows (up to 10), one that changes nothing draws 0; the canvas changes only inside the pencil plank's projected box and a 5 px band; copper only in live, only there, gone within a frame of open or resting; inked and record draw 0 marks; the only number on the hull is the focus plank's", async ({
  browser,
  crew,
}) => {
  test.setTimeout(300_000);
  const live = await siteOf(crew, "live", { fixture: "live" });
  const open = await siteOf(crew, "open", { fixture: "open" });
  for (const size of SIZES) {
    const where = `at ${size.width} x ${size.height}`;
    // The open site, at rest.
    {
      const run = await openCrewModel(browser, { ...size, stored: "calm" });
      await rested(run, `${open.base}/crew`);
      expect
        .soft(
          [await marksDrawn(run.page), await momentsShown(run.page)],
          `data-marks and the moments shown on ${open.where}, ${where}`,
        )
        .toEqual([6, 6]);
      await run.close();
    }
    const run = await openCrewModel(
      browser,
      { ...size, stored: "calm", clock: true },
      { json: told("live") },
    );
    await run.context.addInitScript(installRgba);
    await rested(run, `${live.base}/crew`, true);
    const count = async () => (await run.frames()).length;
    const accent = await token(run.page, "--accent");
    const ground = await token(run.page, "--background");
    const clip = whole(
      ((await crewFit(run.page)).canvas ?? {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      }) as Box,
    );
    const shot = async () => (await canvasOnly(run.page, clip)).image;
    const shownMoments = await momentsShown(run.page);
    expect
      .soft(
        [shownMoments > 0, await marksDrawn(run.page)],
        `moments shown on ${live.where} (more than 0), and data-marks at rest against them, ${where}`,
      )
      .toEqual([true, shownMoments]);
    expect
      .soft(
        await onHull(run.page, clip),
        `the shown numbers on the hull, ${where}`,
      )
      .toEqual([String(live.n)]);
    const steps: { what: string; frames: number; marks: number }[] = [];
    // Each poll at its schedule (B4.26): 30 s while live, 60 s once open or resting. A longer step
    // would run past a poll in flight into B4.42's 30 s abort.
    const step = async (what: string, json: unknown, every = 30_000) => {
      run.answer({ json });
      const before = await count();
      await run.tick(every);
      steps.push({
        what,
        frames: (await count()) - before,
        marks: await marksDrawn(run.page),
      });
    };
    await step("10 moments", liveWith(10));
    await step("an 11th", liveWith(10, [moment(50, "An 11th.")]));
    await step("5 moments", liveWith(5));
    const five = await shot();
    await step("a sixth", liveWith(5, [moment(10, "A sixth.")]));
    const six = await shot();
    await step("the same again", liveWith(5, [moment(10, "A sixth.")]));
    const liveCopper = copperAt(six, accent, ground);
    await step(
      "open, the same sprint",
      told("live", {
        current: {
          live: false,
          moments: (
            liveWith(5, [moment(10, "A sixth.")]).run as { moments: unknown[] }
          ).moments,
        },
      }),
    );
    const openCopper = copper(await shot(), accent, ground);
    await step(
      "resting, the same sprint",
      told("resting", {
        last: {
          sprint: live.n,
          goal: (feedOf("live").current as { goal?: unknown }).goal,
        },
      }),
      60_000,
    );
    await step(
      "another sprint",
      told("live", { current: { sprint: live.n + 1 } }),
      60_000,
    );
    const record = await shot();
    expect
      .soft(steps, `frames drawn and data-marks after each poll, ${where}`)
      .toEqual([
        { what: "10 moments", frames: 1, marks: 10 },
        { what: "an 11th", frames: 0, marks: 10 },
        { what: "5 moments", frames: 1, marks: 5 },
        { what: "a sixth", frames: 1, marks: 6 },
        { what: "the same again", frames: 0, marks: 6 },
        { what: "open, the same sprint", frames: 1, marks: 6 },
        { what: "resting, the same sprint", frames: 1, marks: 0 },
        { what: "another sprint", frames: 1, marks: 0 },
      ]);
    // The pencil plank's projected box: where the live frame differs from the record frame.
    const pencil = differs(six, record).box;
    expect(
      pencil,
      `the pencil plank's pixels (live against record at the same pose), ${where}`,
    ).not.toBeNull();
    const band = pencil
      ? {
          left: pencil.left - 5,
          top: pencil.top - 5,
          right: pencil.right + 5,
          bottom: pencil.bottom + 5,
        }
      : null;
    const tick = differs(five, six).box;
    expect
      .soft(
        Boolean(
          tick &&
            band &&
            tick.left >= band.left &&
            tick.right <= band.right &&
            tick.top >= band.top &&
            tick.bottom <= band.bottom,
        ),
        `the sixth tick changed pixels ${JSON.stringify(tick)} only inside the pencil plank's box and a 5 px band ${JSON.stringify(band)}, ${where}`,
      )
      .toBe(true);
    expect
      .soft(
        {
          live: liveCopper.length > 0,
          outside: liveCopper.filter(
            ([x, y]) =>
              !band ||
              x < band.left ||
              x >= band.right ||
              y < band.top ||
              y >= band.bottom,
          ).length,
          open: openCopper,
          record: copper(record, accent, ground),
        },
        `copper pixels: some in live, none outside the pencil plank's box, none a frame after open, none in record, ${where}`,
      )
      .toEqual({ live: true, outside: 0, open: 0, record: 0 });
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();
  }
});

test("B4.38 Full, Calm and reduced motion, once a visit: Full moves from frame 1 and settles 1.8 s +/- one frame on the clock; a reload and a Back from / open settled with one live context, a new tab plays the move; a key, a click, a wheel, a tap and a scroll each settle it within 2 frames; Full from Calm or Off replays it; Calm stored or reduce with nothing stored never set landed or moving; Calm mid-move settles within 2 frames and stores calm; under reduce the fade is /'s, opacity, fill and visibility with nothing moving (decision 7), ending within 300 ms", async ({
  browser,
}, testInfo) => {
  test.setTimeout(420_000);
  for (const size of SIZES) {
    const where = `/crew at ${size.width} x ${size.height}`;
    // The move on the clock, then each input in a replay.
    const run = await openCrewModel(browser, {
      ...size,
      touch: true,
      clock: true,
    });
    await run.goto("/crew");
    expect(
      await run.until(SHOWN, 4, FIRST),
      `frame 1 is landed, ${where}`,
    ).toBe("landed");
    await run.until(["lofting"], 4, 20_000);
    const t0 =
      (await run.states()).find((s) => s.state === "lofting")?.t ?? Number.NaN;
    await runTo(run, t0 + MOVE - FRAME);
    await run.until([...REST], 4, 10_000);
    const settledAt =
      (await run.states()).find((s) => s.state === "settled")?.t ?? Number.NaN;
    const moving = (await run.frames()).filter(
      (f) => f.state === "landed" || f.state === "lofting",
    );
    note(
      testInfo,
      "move",
      `${where}: settled ${(settledAt - t0).toFixed(1)} ms after the first lofting frame, ${moving.length} moving frames. ${SWIFTSHADER}.`,
    );
    expect.soft(moving.length, `moving frames, ${where}`).toBeGreaterThan(1);
    expect
      .soft(
        Math.abs(settledAt - t0 - MOVE),
        `ms from the first moving frame to settled, against ${MOVE} +/- one frame, ${where}`,
      )
      .toBeLessThanOrEqual(FRAME + 0.5);
    const middle = async () => {
      const b = await svgBox(run.page);
      return {
        x: (b?.x ?? 0) + (b?.width ?? 0) / 2,
        y: (b?.y ?? 0) + (b?.height ?? 0) / 2,
      };
    };
    const replay = async (from: "Calm" | "Off") => {
      await run.page.evaluate(() => {
        scrollTo(0, 0);
        (document.activeElement as HTMLElement | null)?.blur();
      });
      await pressMode(run.page, from);
      await run.step(from === "Off" ? 500 : 100);
      const drawn = (await run.frames()).length;
      await pressMode(run.page, "Full");
      await run.until(["lofting"], 4, FIRST);
      expect
        .soft(
          (await run.frames())[drawn]?.state,
          `the first frame after Full pressed from ${from}, ${where}`,
        )
        .toBe("landed");
    };
    const inputs: [string, () => Promise<unknown>][] = [
      ["a key (Tab)", () => run.page.keyboard.press("Tab")],
      [
        "a click on the hull",
        async () => {
          const at = await middle();
          await run.page.mouse.click(at.x, at.y);
        },
      ],
      [
        "a wheel over the hull",
        async () => {
          const at = await middle();
          await run.page.mouse.move(at.x, at.y);
          await run.page.mouse.wheel(0, 120);
        },
      ],
      [
        "a tap on the hull",
        async () => {
          const at = await middle();
          await run.page.touchscreen.tap(at.x, at.y);
        },
      ],
      [
        "a scroll",
        // /crew can fit a 1440 x 900 screen: a spacer after main gives it room to scroll, as a
        // longer panel would.
        () =>
          run.page.evaluate(() => {
            if (document.documentElement.scrollHeight <= innerHeight + 60) {
              const spacer = document.createElement("div");
              spacer.style.height = "200px";
              document.body.append(spacer);
            }
            scrollTo(0, 60);
          }),
      ],
    ];
    for (const [name, act] of inputs) {
      await replay("Calm");
      await act();
      await pause(150);
      await run.step(TWO_FRAMES);
      expect
        .soft(
          await run.state(),
          `${name} during the move settles it within 2 frames, ${where}`,
        )
        .toBe("settled");
      await run.step(300);
    }
    await replay("Off");
    // Calm pressed mid-move.
    await pressMode(run.page, "Calm");
    await pause(150);
    await run.step(TWO_FRAMES);
    expect
      .soft(
        [
          await run.state(),
          await run.page.evaluate(() => localStorage.getItem("theseus:motion")),
        ],
        `Calm pressed mid-move: settled within 2 frames, and calm stored, ${where}`,
      )
      .toEqual(["settled", "calm"]);
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();

    // Once a visit, in real time.
    const visit = await openCrewModel(browser, size);
    await rested(visit, "/crew");
    expect
      .soft(
        (await visit.states()).map((s) => s.state),
        `the first visit plays the move, ${where}`,
      )
      .toContain("lofting");
    for (const [label, go] of [
      ["a reload", () => visit.page.reload()],
      [
        "Back from /",
        async () => {
          await visit.page.goto("/");
          await visit.waitFor([...REST], FIRST);
          await markVisit(visit.page);
          await visit.page.goBack();
          await visit.page.waitForURL((u) => u.pathname === "/crew");
        },
      ],
    ] as const) {
      await markVisit(visit.page);
      await go();
      await visit.waitFor([...REST], FIRST);
      await pause(300);
      const since = await sinceMark(visit.page);
      expect
        .soft(
          {
            state: await visit.state(),
            moving: since.states.filter(
              (s) => s === "landed" || s === "lofting",
            ),
            live: await visit.live(),
          },
          `${label} opens settled, with no moving state and one live context, ${where}`,
        )
        .toEqual({ state: "settled", moving: [], live: 1 });
    }
    const tab = await visit.context.newPage();
    await tab.goto("/crew");
    const end = Date.now() + FIRST;
    let seen: string[] = [];
    while (Date.now() < end && !seen.some((s) => REST.includes(s))) {
      seen = await tab.evaluate(
        () =>
          (window as Window & { __states?: { state: string }[] }).__states?.map(
            (s) => s.state,
          ) ?? [],
      );
      await pause(100);
    }
    expect
      .soft(seen, `a new tab plays the move again, ${where}`)
      .toContain("lofting");
    expect
      .soft(visit.errors, `console errors over the visit, ${where}`)
      .toEqual([]);
    await visit.close();

    // Calm stored, and reduce with nothing stored.
    for (const [label, options] of [
      ["Calm stored", { stored: "calm" }],
      ["reduce with nothing stored", { reducedMotion: "reduce" }],
    ] as [string, ModelOptions][]) {
      const at = `${label}, ${where}`;
      const quiet = await openCrewModel(browser, { ...size, ...options });
      await quiet.context.addInitScript(() => {
        // The fade: transitions in the drawing and the model layer (the panel's own, a dot's or a
        // button's, aren't the model's fade).
        const list: { property: string; end: number; target: string }[] = [];
        (window as Window & { __runs?: typeof list }).__runs = list;
        addEventListener(
          "transitionrun",
          (event) => {
            const e = event as TransitionEvent;
            const el = e.target as Element | null;
            if (!el?.closest?.("[data-plan], [data-model]")) return;
            const own = (el.getAnimations?.() ?? []).find(
              (a) =>
                (a as Animation & { transitionProperty?: string })
                  .transitionProperty === e.propertyName,
            );
            list.push({
              property: e.propertyName,
              end: Number(
                own?.effect?.getComputedTiming().endTime ?? Number.NaN,
              ),
              target: `<${el.tagName.toLowerCase()} ${el.getAttribute("class") ?? ""}>`,
            });
          },
          true,
        );
      });
      await rested(quiet, "/crew");
      await pause(600);
      const states = (await quiet.states()).map((s) => s.state);
      expect
        .soft(
          {
            settled: states.includes("settled"),
            moving: states.filter((s) => s === "landed" || s === "lofting"),
          },
          `the states, ${at}`,
        )
        .toEqual({ settled: true, moving: [] });
      if (options.reducedMotion) {
        const runs = await quiet.page.evaluate(
          () =>
            (
              window as Window & {
                __runs?: { property: string; end: number; target: string }[];
              }
            ).__runs ?? [],
        );
        expect
          .soft(
            {
              any: runs.length > 0,
              other: [
                ...new Set(
                  runs
                    // Decision 7: /'s fade, opacity, fill and visibility; nothing that moves.
                    .filter(
                      (r) =>
                        !["opacity", "fill", "visibility"].includes(r.property),
                    )
                    .map((r) => `${r.property} on ${r.target}`),
                ),
              ],
              late: runs
                .filter((r) => !(r.end <= 300))
                .map((r) => `${r.property} ${r.end}`),
            },
            `the fade under reduce: transitions run, none but opacity, fill and visibility (decision 7: no transform, position or size), all ending within 300 ms, ${at}`,
          )
          .toEqual({ any: true, other: [], late: [] });
      }
      expect.soft(quiet.errors, `console errors, ${at}`).toEqual([]);
      await quiet.close();
    }
  }
});

test("B4.40 cheap and still: on the live site with 10 ticks, at 1440 and 390, DPR 2 and 3, both schemes, over the move and at rest at most 8 draws a frame and 30,000 triangles from 768 px (12,000 below), a backing store at most the cap; 0 frames at rest, off-screen and hidden, a scheme switch inside a window and 1 frame once back; after a tick 1 frame then 0 over 2 s; one 3D chunk of at most 250,000 B gzip -9, requested after load", async ({
  browser,
  crew,
}, testInfo) => {
  test.setTimeout(420_000);
  const live = await siteOf(crew, "live", { fixture: "live" });
  const url = `${live.base}/crew`;
  let chunk: { list: Script[]; loadEventEnd: number } | null = null;
  const offPaths = await (async () => {
    const off = await openCrewModel(browser, { refuse: true });
    await off.goto(url);
    await pause(IDLE);
    const paths = new Set(
      (await off.scripts()).list.map((s) => new URL(s.url).pathname),
    );
    await off.close();
    return paths;
  })();
  for (const size of SIZES)
    for (const [dpr, scheme] of [
      [2, "light"],
      [3, "dark"],
    ] as const) {
      const where = `${live.where} at ${size.width} x ${size.height}, DPR ${dpr}, ${scheme}`;
      const run = await openCrewModel(
        browser,
        { ...size, dpr, scheme },
        // The live run with 10 moments: the contract's "with 10 ticks shown".
        { json: liveWith(10) },
      );
      await rested(run, url);
      expect(await marksDrawn(run.page), `data-marks, ${where}`).toBe(10);
      const frames = await run.frames();
      const draws = Math.max(...frames.map((f) => f.draws));
      const triangles = Math.max(...frames.map((f) => f.triangles));
      const budget = TRIANGLES_AT(size.width);
      note(
        testInfo,
        "draws",
        `${where}: ${frames.length} frames; at most ${draws} draws and ${triangles} triangles a frame (budget 8 and ${budget}). ${SWIFTSHADER}.`,
      );
      expect
        .soft(
          frames.filter((f) => f.state === "landed" || f.state === "lofting")
            .length,
          `frames over the move, ${where}`,
        )
        .toBeGreaterThan(0);
      expect
        .soft(draws, `the most draw calls in a frame, ${where}`)
        .toBeLessThanOrEqual(8);
      expect
        .soft(triangles, `the most triangles in a frame, ${where}`)
        .toBeLessThanOrEqual(budget);
      const fit = await crewFit(run.page);
      const cap = capAt(size.width, dpr);
      expect
        .soft(
          (fit.buffer?.[0] ?? Number.POSITIVE_INFINITY) <=
            cap * (fit.canvas?.width ?? 0) + cap * LAYOUT + 1e-3 &&
            (fit.buffer?.[1] ?? Number.POSITIVE_INFINITY) <=
              cap * (fit.canvas?.height ?? 0) + cap * LAYOUT + 1e-3,
          `the backing store ${fit.buffer?.join(" x ")} at most ${cap}x the canvas's CSS size, ${where}`,
        )
        .toBe(true);
      if (dpr === 2) {
        await stillWindows(run, size, where);
        if (size.width === 1440) chunk = await run.scripts();
      }
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }
  const files = (chunk?.list ?? []).filter(
    (s) => !offPaths.has(new URL(s.url).pathname),
  );
  const loadEventEnd = chunk?.loadEventEnd ?? 0;
  note(
    testInfo,
    "3D chunk",
    files
      .map(
        (s) =>
          `${new URL(s.url).pathname} ${s.gzip9} B gzip -9 at ${s.start?.toFixed(0)} ms`,
      )
      .join("; ") || "none",
  );
  expect(
    files.length,
    "scripts /crew fetches with the model beyond its WebGL-refused page's",
  ).toBe(1);
  expect
    .soft(
      files.reduce((a, s) => a + s.gzip9, 0),
      "the 3D chunk, gzip -9 bytes",
    )
    .toBeLessThanOrEqual(250_000);
  expect
    .soft(
      files
        .filter((s) => s.start === null || s.start < loadEventEnd)
        .map((s) => new URL(s.url).pathname),
      `chunk files requested before loadEventEnd (${loadEventEnd.toFixed(0)} ms)`,
    )
    .toEqual([]);
});

/** Frames drawn over `ms` of real time while `during` runs. */
async function drawnOver(
  run: CrewRun,
  ms: number,
  during?: () => Promise<unknown>,
) {
  const before = (await run.frames()).length;
  const end = Date.now() + ms;
  if (during) await during();
  await pause(Math.max(0, end - Date.now()));
  return (await run.frames()).length - before;
}

function setHidden(run: CrewRun, hidden: boolean) {
  return run.page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (value ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => value,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

/** B3.6's windows at rest (3 s each), and a tick: 1 frame then 0 over 2 s. */
async function stillWindows(
  run: CrewRun,
  size: { width: number; height: number },
  where: string,
) {
  await run.page.mouse.move(2, 2);
  expect
    .soft(await drawnOver(run, 3000), `frames in 3 s at rest, ${where}`)
    .toBe(0);
  const scheme = (await run.page.evaluate(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  ))
    ? "light"
    : "dark";
  await setHidden(run, true);
  expect
    .soft(
      await drawnOver(run, 3000, () =>
        run.page.emulateMedia({ colorScheme: scheme }),
      ),
      `frames in 3 s hidden, a switch to ${scheme} inside, ${where}`,
    )
    .toBe(0);
  expect
    .soft(
      await drawnOver(run, 1000, () => setHidden(run, false)),
      `frames once shown after the switch, ${where}`,
    )
    .toBe(1);
  // Off-screen: the drawing scrolled more than a viewport away (a spacer makes room for it).
  await run.page.evaluate((h) => {
    const spacer = document.createElement("div");
    spacer.style.height = `${3 * h}px`;
    document.body.append(spacer);
    scrollTo(0, document.documentElement.scrollHeight);
  }, size.height);
  await pause(300);
  const back = scheme === "dark" ? "light" : "dark";
  const svg = await svgBox(run.page);
  expect
    .soft(
      (svg?.y ?? 0) + (svg?.height ?? 0) <= -size.height,
      `the drawing more than a viewport off-screen, ${where}`,
    )
    .toBe(true);
  expect
    .soft(
      await drawnOver(run, 3000, () =>
        run.page.emulateMedia({ colorScheme: back }),
      ),
      `frames in 3 s off-screen, a switch inside, ${where}`,
    )
    .toBe(0);
  expect
    .soft(
      await drawnOver(run, 1000, () => run.page.evaluate(() => scrollTo(0, 0))),
      `frames once back on screen, ${where}`,
    )
    .toBe(1);
  // A tick: a told answer with one moment fewer than shown changes the ticks; 1 frame, then 0.
  run.answer({ json: liveWith(9) });
  const before = (await run.frames()).length;
  await run.page.evaluate(() => {
    // The poll's next schedule is 30 s of real time away: hide and show, which polls at once (B4.27).
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await pause(1500);
  const afterTick = (await run.frames()).length - before;
  expect
    .soft(
      [afterTick, await marksDrawn(run.page)],
      `frames after a tick (9 moments told), and data-marks, ${where}`,
    )
    .toEqual([1, 9]);
  expect
    .soft(
      await drawnOver(run, 2000),
      `frames over 2 s after the tick, ${where}`,
    )
    .toBe(0);
}
