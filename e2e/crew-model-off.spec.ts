import { type Browser, expect, type Page } from "@playwright/test";
import { expected } from "./crew";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import { type CrewRun, openCrewModel, pressMode } from "./crew-model";
import { FIRST, FRAME, pause, REST, SHOWN } from "./model";
import type { ModelOptions } from "./webgl";

// Sprint 36, B4.39 (.crew/sprint/36/contract.md, "Off", call 5): on every Off path /crew is the
// detail drawing as the server and the poll leave it, and no 3D downloads. The baseline is the page
// with WebGL refused (the contract's definition of Off), read in the same media as each case. The
// checks run on B4a's kept live site, so the drawing has a pencil, a tip and ticks to compare.

test.describe.configure({ mode: "default" });
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build and copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;
const TWO_FRAMES = Math.ceil(2 * FRAME);
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

function liveSite(crew: Crew) {
  return crew.once("hull live", async () => {
    const site = await crew.site("live", { fixture: "live" }, true);
    const body = crew.feed.body("live");
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

// The worker's crew from crewOf(): a beforeAll takes no test-scoped fixture (crew-feed.ts).
test.beforeAll(async () => {
  const crew = await crewOf();
  void liveSite(crew);
});

/** The detail as shown: the planks' class and fill, the pencil, the tip and the ticks' boxes. */
function detail(page: Page) {
  return page.evaluate(() => {
    const svg = [...document.querySelectorAll("[data-plan] svg")].find(
      (s) => !s.closest("defs, pattern") && s.getClientRects().length > 0,
    );
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom]
        .map((v) => Math.round(v * 10) / 10)
        .join(" ");
    };
    return {
      svg: Boolean(svg),
      planks: [...(svg?.querySelectorAll("path[data-plank]") ?? [])].map(
        (p) =>
          `${p.getAttribute("data-plank")} ${p.getAttribute("class")} ${getComputedStyle(p).fill}${p.hasAttribute("data-pencil") ? " pencil" : ""}${p.hasAttribute("data-live") ? " live" : ""}`,
      ),
      tips: [...(svg?.querySelectorAll("[data-tip]") ?? [])].map(box),
      marks: [...(svg?.querySelectorAll("[data-mark]") ?? [])]
        .filter((m) => m.checkVisibility({ visibilityProperty: true }))
        .map(box),
      canvases: document.querySelectorAll("[data-model] canvas").length,
      state:
        document.querySelector("[data-model]")?.getAttribute("data-state") ??
        null,
    };
  });
}
type Detail = Awaited<ReturnType<typeof detail>>;

function expectOff(seen: Detail, off: Detail, where: string) {
  expect
    .soft(
      {
        svg: seen.svg,
        planks: seen.planks,
        tips: seen.tips,
        marks: seen.marks,
      },
      `the detail's svg, planks (class, fill, pencil), tip and ticks against the Off page's, ${where}`,
    )
    .toEqual({
      svg: off.svg,
      planks: off.planks,
      tips: off.tips,
      marks: off.marks,
    });
  expect
    .soft(
      [seen.canvases, seen.state],
      `canvases and [data-model]'s data-state, ${where}`,
    )
    .toEqual([0, null]);
}

async function baseline(
  browser: Browser,
  url: string,
  size: { width: number; height: number },
) {
  const run = await openCrewModel(browser, { ...size, refuse: true });
  await run.goto(url);
  await pause(IDLE);
  const drawing = await detail(run.page);
  await run.page.emulateMedia({ forcedColors: "active" });
  await pause(300);
  const forced = await detail(run.page);
  await run.page.emulateMedia({ forcedColors: "none", media: "print" });
  await pause(300);
  const print = await detail(run.page);
  const scripts = new Set(
    (await run.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  const requests = (await run.requests()).map((r) => r.type);
  await run.close();
  return { scripts, requests, drawing, forced, print };
}

/** Animation frames, counted in the page, until `[data-model]` has no data-state (up to 10). */
function framesUntilGone(page: Page) {
  return page.evaluate(async () => {
    const host = document.querySelector("[data-model]");
    for (let frame = 0; frame <= 10; frame++) {
      if (!host?.hasAttribute("data-state")) return frame;
      await new Promise((done) => requestAnimationFrame(done));
    }
    return -1;
  });
}

test("B4.39 Off downloads nothing on /crew: on the live site at 1440 and 390, with off stored, WebGL refused, forced colours, Save-Data, print and scripts off, no script beyond the WebGL-refused page's, no context but the one probe (none with off stored), no canvas, and the detail's pencil, tip and ticks as the Off page has them; Off pressed at rest and mid-move leaves within 2 frames no data-state and 0 live contexts; one key: Off pressed on / opens /crew in Off with no chunk, and Calm pressed on /crew opens /log in Calm", async ({
  browser,
  crew,
}) => {
  test.setTimeout(360_000);
  const site = await liveSite(crew);
  expect(
    site.seen,
    `/crew's state on the live site within ${STATE_WAIT} ms`,
  ).toBe("live");
  const url = `${site.base}/crew`;
  for (const size of SIZES) {
    const at = `the live site at ${size.width} x ${size.height}`;
    const cases: { name: string; options: ModelOptions; print?: boolean }[] = [
      { name: "off stored before load", options: { stored: "off" } },
      { name: "forced colours", options: { forcedColors: "active" } },
      { name: "Save-Data", options: { saveData: true } },
      { name: "print media at load", options: {}, print: true },
      { name: "scripts off", options: { noScript: true } },
    ];
    // The baseline and the five Off paths load side by side, each in a context of its own (none
    // loads WebGL, and each waits out the idle import): read first, asserted in order below.
    const [plain, ...visits] = await Promise.all([
      baseline(browser, url, size),
      ...cases.map(async ({ options, print }) => {
        const run = await openCrewModel(browser, { ...size, ...options });
        if (print) await run.page.emulateMedia({ media: "print" });
        if (options.noScript) await run.page.goto(url);
        else await run.goto(url);
        await pause(IDLE);
        const seen = await detail(run.page);
        const requests = (await run.requests()).map((r) => r.type);
        const scripts = (await run.scripts()).list.map(
          (s) => new URL(s.url).pathname,
        );
        await run.close();
        return { seen, requests, scripts };
      }),
    ]);
    expect(
      plain.drawing.marks.length,
      `ticks on the WebGL-refused page, ${at}`,
    ).toBeGreaterThan(0);
    expect
      .soft(
        [
          plain.requests.filter((r) => r !== "webgl2"),
          plain.requests.length <= 1,
        ],
        `context requests but the probe's webgl2, and at most one, WebGL refused, ${at}`,
      )
      .toEqual([[], true]);
    for (const [i, { name, options, print }] of cases.entries()) {
      const where = `${name}, ${at}`;
      const base = options.forcedColors
        ? plain.forced
        : print
          ? plain.print
          : plain.drawing;
      const visit = visits[i];
      if (!visit) throw new Error(`no visit read for ${where}`);
      const { seen, requests, scripts } = visit;
      expect
        .soft(
          scripts.filter((s) => !plain.scripts.has(s)),
          `scripts beyond the WebGL-refused page's, ${where}`,
        )
        .toEqual([]);
      if (options.stored === "off")
        expect
          .soft(requests, `WebGL or WebGPU context requests, ${where}`)
          .toEqual([]);
      else
        expect
          .soft(
            [requests.filter((r) => r !== "webgl2"), requests.length <= 1],
            `context requests but the probe's, and at most one, ${where}`,
          )
          .toEqual([[], true]);
      expectOff(seen, base, where);
    }

    for (const when of ["at rest", "mid-move"] as const) {
      const where = `Off pressed ${when}, ${at}`;
      const run: CrewRun = await openCrewModel(browser, {
        ...size,
        clock: when === "mid-move",
      });
      await run.goto(url);
      if (when === "mid-move") {
        await run.until(SHOWN, 4, FIRST);
        await run.until(["lofting"], 4, 20_000);
      } else {
        await run.waitFor([...REST], FIRST);
        await pause(300);
      }
      const scriptsBefore = (await run.scripts()).list.length;
      await pressMode(run.page, "Off");
      let frames: number;
      if (when === "mid-move") {
        await pause(150);
        await run.step(TWO_FRAMES);
        frames = (await run.state()) === null ? 2 : -1;
      } else {
        frames = await framesUntilGone(run.page);
      }
      expect
        .soft(
          frames >= 0 && frames <= 2,
          `frames until data-state is gone (${frames}), ${where}`,
        )
        .toBe(true);
      expect.soft(await run.live(), `live WebGL contexts, ${where}`).toBe(0);
      if (when === "mid-move") await run.step(1000);
      await pause(800);
      expect
        .soft(
          (await run.scripts()).list.length - scriptsBefore,
          `scripts requested after the press, ${where}`,
        )
        .toBe(0);
      expectOff(await detail(run.page), plain.drawing, where);
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();
    }
  }

  // One key, theseus:motion, across the routes.
  {
    const run = await openCrewModel(browser, { width: 1440, height: 900 });
    await run.goto("/");
    await run.waitFor([...REST], FIRST);
    await pressMode(run.page, "Off");
    await pause(300);
    const plain = (await run.scripts()).list.length;
    await run.goto("/crew");
    await pause(IDLE);
    const off = await detail(run.page);
    const crewScripts = (await run.scripts()).list
      .slice(plain)
      .map((s) => new URL(s.url).pathname);
    const refused = await openCrewModel(browser, {
      width: 1440,
      height: 900,
      refuse: true,
    });
    await refused.goto("/crew");
    await pause(IDLE);
    const refusedPaths = new Set(
      (await refused.scripts()).list.map((s) => new URL(s.url).pathname),
    );
    await refused.close();
    expect
      .soft(
        {
          stored: await run.page.evaluate(() =>
            localStorage.getItem("theseus:motion"),
          ),
          canvases: off.canvases,
          beyond: crewScripts.filter((p) => !refusedPaths.has(p)),
        },
        "Off pressed on / then /crew: off stored, no canvas, and no script beyond /crew's WebGL-refused page's",
      )
      .toEqual({ stored: "off", canvases: 0, beyond: [] });
    await run.close();
  }
  {
    const run = await openCrewModel(browser, { width: 1440, height: 900 });
    await run.goto("/crew");
    await run.waitFor([...REST], FIRST);
    await pressMode(run.page, "Calm");
    await pause(300);
    await run.goto("/log");
    await run.waitFor([...REST], FIRST);
    await pause(300);
    const states = await run.page.evaluate(
      () =>
        (window as Window & { __states?: { state: string }[] }).__states?.map(
          (s) => s.state,
        ) ?? [],
    );
    expect
      .soft(
        {
          stored: await run.page.evaluate(() =>
            localStorage.getItem("theseus:motion"),
          ),
          moving: states.filter((s) => s === "landed" || s === "lofting"),
          state: await run.state(),
        },
        "Calm pressed on /crew then /log: calm stored, and /log opens settled with no landed or moving state",
      )
      .toEqual({ stored: "calm", moving: [], state: "settled" });
    expect.soft(run.errors, "console errors across /crew and /log").toEqual([]);
    await run.close();
  }
});
