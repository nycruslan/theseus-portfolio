import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { copperPaint, expected, readPanel, textContrast } from "./crew";
import { type Crew, crewOf, crewTest as test } from "./crew-feed";
import {
  focusOf,
  readDetail,
  recordPlan,
  serverRun,
  takePlan,
} from "./crew-hull";
import {
  type CrewAnswer,
  FIXTURE_STUDIO,
  feedOf,
  livePage,
  panelAgainst,
  type Reply,
  recordMutations,
  replayOf,
  takeMutations,
  toAnswer,
} from "./crew-live";
import {
  advance,
  cssGlyph,
  ENTRY,
  focusable,
  focusOn,
  KEPT,
  KEY_WORDS,
  listed,
  MERGE_AT,
  momentsPlayed,
  N,
  PAUSE,
  press,
  REPLAY,
  REPLAY_65,
  type ReplayRead,
  type ReplaySite,
  readReplay,
  replayHeading,
  replaySite,
  type SiteName,
  STAMP,
  STEP,
  stepClock,
  toBody,
  untilPlayed,
} from "./crew-replay";
import {
  horizontalOverflow,
  installRgba,
  SCHEMES,
  textStyles,
} from "./helpers";
import { tokenRgba } from "./log";
import { refuseWebGl } from "./webgl";

// Sprint 37, B4e (.crew/sprint/37/contract.md, with amendment 1): the replay of the last merged
// sprint on /crew, in the panel, written before the build. Each page here opens a kept site of the
// replay fixture or a variant (e2e/crew-replay.ts, SITES: resting.json with a `last.replay`) with
// WebGL refused (the Off path) unless a check names a mode, Playwright's clock installed and paused
// before `goto` and `page.route` answering `/api/crew` with the oracle's `toAnswer` (B4c's
// `livePage`), so every step of the replay and every poll is the clock's, never real time. B4.46
// and B4.47 (the drawing) are crew-replay-hull.spec.ts, and B4.49 (`/`) crew-replay-home.spec.ts.

test.describe.configure({ mode: "default" });
test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
const NAMES: SiteName[] = [
  "replay",
  "replay-65",
  "replay-bad",
  "replay-null",
  "replay-999",
  "live",
  "open",
  "resting",
];

// The worker's crew from crewOf(): every site's first wait starts here, together.
test.beforeAll(async () => {
  const crew = await crewOf();
  for (const name of NAMES) void replaySite(crew, name);
});

/** A kept site, asserted to show its state. */
async function siteOf(crew: Crew, name: SiteName) {
  const site = await replaySite(crew, name);
  const want = name === "live" || name === "open" ? name : "resting";
  expect(
    site.seen,
    `/crew's [data-crew-state] on the ${name} site within ${site.ms} ms`,
  ).toBe(want);
  return site;
}

/** The default server: no feed, down. */
const DEFAULT = {
  name: "default",
  base: "",
  body: () => null,
  origin: null,
} as const;
type Where = ReplaySite | typeof DEFAULT;

/** The route's answer for a site, as the oracle gives it. */
const answerOf = (site: Where): CrewAnswer =>
  site.body() === null
    ? { version: 1, state: "down", run: null }
    : toAnswer(site.body(), site.origin ?? "");

type Options = {
  width?: number;
  height?: number;
  scheme?: "light" | "dark";
  forced?: boolean;
  reduced?: boolean;
  /** A stored mode with WebGL allowed; without it, WebGL is refused. */
  stored?: "full" | "calm" | "off";
  first?: Reply;
  hash?: string;
};

function seedMode(mode: string) {
  try {
    localStorage.setItem("theseus:motion", mode);
  } catch {
    // A refused storage fails the check that needs it.
  }
}

/** A page of its own on a site's /crew, on the clock, with the recorders. */
async function opened(browser: Browser, site: Where, options: Options = {}) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    timezoneId: "America/Los_Angeles",
    viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
    colorScheme: options.scheme ?? "light",
    forcedColors: options.forced ? "active" : "none",
    reducedMotion: options.reduced ? "reduce" : "no-preference",
  });
  await context.addInitScript(installRgba);
  if (options.stored) await context.addInitScript(seedMode, options.stored);
  else await context.addInitScript(refuseWebGl);
  await context.addInitScript(recordMutations);
  await context.addInitScript(recordPlan);
  const page = await context.newPage();
  const live = await livePage(
    page,
    `${site.base}/crew${options.hash ?? ""}`,
    options.first ?? { json: answerOf(site) },
  );
  expect(
    live.ready,
    `button[data-pause][data-ready] on the ${site.name} site: the poller started`,
  ).toBe(true);
  return { context, page, live };
}

/** The panel's head, which tells the present: chip, status, rows, and Pause updates. */
async function head(page: Page) {
  const panel = await readPanel(page);
  const pause = await page.evaluate(() => {
    const b = document.querySelector("button[data-pause]");
    return b
      ? `${b.textContent?.trim()} ${b.getAttribute("aria-pressed")}`
      : null;
  });
  return { chip: panel.chip, status: panel.status, rows: panel.rows, pause };
}

const boxOk = (
  box:
    | { left: number; top: number; right: number; bottom: number }
    | null
    | undefined,
  width: number,
  height: number,
) =>
  Boolean(
    box &&
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= width + 0.5 &&
      box.bottom <= height + 0.5,
  );
const tall = (box: { top: number; bottom: number } | null | undefined) =>
  box ? box.bottom - box.top : 0;

/** The entry's target: 44 px tall below 1024, at least 24 from it. */
const entryTall = (h: number, width: number) =>
  width < 1024 ? Math.abs(h - 44) <= 0.5 : h >= 24 - 0.5;
/** The pause: 44 below 1024, 32 from it. */
const pauseTall = (h: number, width: number) =>
  Math.abs(h - (width < 1024 ? 44 : 32)) <= 0.5;

/** A line of 140 characters, as the Studio's role lines reach. */
const long = (line: string) => {
  const more = ` and ${line.toLowerCase()} again, checked against the contract, the frames and Iris's notes for this sprint`;
  return `${line}${more.repeat(4)}`
    .slice(0, 139)
    .trimEnd()
    .padEnd(139, "s")
    .concat(".");
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Real time's wait for a key's default action (a scroll) to land. */
const SCROLL_WAIT = 400;

// ---------------------------------------------------------------------------------------------

test("B4.43 the offer, and nothing starts (amendment 1): on the replay fixture one a[data-replay][href=\"#replay\"] reading exactly Replay sprint 29, right after p[data-status] (the oracle's resting line), shown after hydration and never with scripts off, 44 px tall below 1024 and at least 24 from it, wholly inside the first viewport at 1440 x 900 and 390 x 844 with the role lines at 140 characters; button[data-replay-pause] Pause replay keeps its box, hidden and not focusable; the Activity block is #replay with the server's 10 newest; 10 fake minutes change nothing in .crew or [data-plan]; Space on the body scrolls and plays nothing; not offered on the live, open, resting and down fixtures, a replay of only bad entries and last.sprint null; the route keeps the 60 newest of 65", async ({
  browser,
  crew,
  request,
}) => {
  test.setTimeout(180_000);
  const replay = await siteOf(crew, "replay");
  const exp = expected(replay.body(), replay.origin);

  // The 60-cap: the oracle's rule, and the route's answer on the 65 variant.
  const s65 = await siteOf(crew, "replay-65");
  const kept65 = replayOf(REPLAY_65);
  expect
    .soft(
      [kept65.length, kept65[0]?.text, kept65.at(-1)?.text],
      "the oracle's replay of the 65 variant: 60 entries, the 6th to the 65th",
    )
    .toEqual([60, "Moment 6 of 65", "Moment 65 of 65"]);
  const answer65 = (await (
    await request.get(`${s65.base}/api/crew`)
  ).json()) as { run?: { replay?: unknown } };
  expect
    .soft(
      answer65.run?.replay,
      "run.replay of /api/crew on the 65 variant: the 60 newest, oldest first",
    )
    .toEqual(kept65);

  // Scripts off: the entry is in the HTML and never shown; #replay holds the server's 10 newest.
  {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${replay.base}/crew`);
    const read = await readReplay(page);
    const panel = await readPanel(page);
    expect
      .soft(
        {
          entries: read.entries,
          entryShown: read.entry?.shown,
          pauseShown: read.pause?.shown ?? false,
          anchorHoldsList: read.anchor?.holdsList ?? false,
          heading: panel.heading,
          moments: panel.moments,
        },
        "scripts off on the replay site: one entry, hidden; the pause not shown; #replay holding the list; the server's heading and 10 newest",
      )
      .toEqual({
        entries: 1,
        entryShown: false,
        pauseShown: false,
        anchorHoldsList: true,
        heading: exp.heading,
        moments: exp.moments,
      });
    await context.close();
  }

  // Scripts on, at each size, the role lines at 140 characters.
  const body = replay.body();
  const roles = (body.last as { roles: { line: string | null }[] }).roles.map(
    (r) => ({ ...r, line: r.line === null ? null : long(r.line) }),
  );
  const longAnswer = toAnswer(
    { ...body, last: { ...(body.last as object), roles } },
    replay.origin,
  );
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const at = `the replay site at ${width} x ${height}, role lines at 140 characters`;
    const { context, page, live } = await opened(browser, replay, {
      width,
      height,
      first: { json: longAnswer },
    });
    const read = await readReplay(page);
    const panel = await readPanel(page);
    expect
      .soft(
        {
          entries: read.entries,
          text: read.entry?.text,
          href: read.entry?.href,
          afterStatus: read.entryAfterStatus,
          status: panel.status,
          shown: read.entry?.shown,
          tall: entryTall(tall(read.entry?.box), width),
          inView: boxOk(read.entry?.box, width, height),
        },
        `the entry on ${at} (its height ${tall(read.entry?.box).toFixed(1)}, its box ${JSON.stringify(read.entry?.box)})`,
      )
      .toEqual({
        entries: 1,
        text: `Replay sprint ${N}`,
        href: "#replay",
        afterStatus: true,
        status: exp.status,
        shown: true,
        tall: true,
        inView: true,
      });
    expect
      .soft(
        {
          pauses: read.pauses,
          text: read.pause?.text,
          reserved: tall(read.pause?.box) > 0,
          shown: read.pause?.shown,
          focusable: await focusable(page, PAUSE),
        },
        `the pause before a press on ${at}: one, its box kept, hidden and not focusable`,
      )
      .toEqual({
        pauses: 1,
        text: "Pause replay",
        reserved: true,
        shown: false,
        focusable: false,
      });
    expect
      .soft(
        {
          anchorHoldsList: read.anchor?.holdsList ?? false,
          replaying: read.replaying,
          moments: panel.moments,
        },
        `#replay holds the list, nothing replays, and the list is the server's 10 newest, on ${at}`,
      )
      .toEqual({ anchorHoldsList: true, replaying: 0, moments: exp.moments });

    if (width === 1440) {
      // Ten fake minutes: the poll's schedule, the same answer, and nothing changes.
      await takeMutations(page);
      await takePlan(page);
      let polls = 0;
      for (let i = 0; i < 10; i++) polls += await live.tick(60_000);
      const panelMoved = await takeMutations(page);
      expect
        .soft(
          {
            polls,
            panel: panelMoved.panel,
            moved: panelMoved.moved,
            plan: (await takePlan(page)).mutations,
            played: momentsPlayed(await readReplay(page)),
          },
          "10 fake minutes after load with the same answer: 10 polls, and no mutation in .crew or [data-plan], nothing moving, nothing played",
        )
        .toEqual({ polls: 10, panel: [], moved: [], plan: [], played: 0 });

      // Space on the body before a press: the page scrolls, and nothing plays.
      await toBody(page);
      const before = (await readReplay(page)).scrollY;
      await page.keyboard.press("Space");
      await sleep(SCROLL_WAIT);
      const after = await readReplay(page);
      expect
        .soft(
          {
            scrolled: after.scrollY > before,
            played: momentsPlayed(after),
            replay: after.plan.replay,
          },
          `Space on the body before a press (scrollY ${before} to ${after.scrollY})`,
        )
        .toEqual({ scrolled: true, played: 0, replay: false });
    }
    await context.close();
  }

  // Not offered: no entry or pause, today's panel and drawing.
  const others: Where[] = [
    await siteOf(crew, "live"),
    await siteOf(crew, "open"),
    await siteOf(crew, "resting"),
    await siteOf(crew, "replay-bad"),
    await siteOf(crew, "replay-null"),
    DEFAULT,
  ];
  for (const site of others) {
    const html = await (await request.get(`${site.base}/crew`)).text();
    const { context, page } = await opened(browser, site);
    const read = await readReplay(page);
    const feed = site.body();
    const panel = await panelAgainst(page, feed, site.origin);
    const state = expected(feed, site.origin).state;
    const run = (feed?.current ?? feed?.last) as { sprint?: unknown } | null;
    const n = typeof run?.sprint === "number" ? run.sprint : null;
    expect
      .soft(
        {
          inHtml: /<a\b[^>]*\sdata-replay[\s=>]/.test(html),
          entries: read.entries,
          pauses: read.pauses,
          replaying: read.replaying,
          plan: read.plan,
          panel: panel.found,
        },
        `not offered on the ${site.name} ${site === DEFAULT ? "server" : "site"}: no entry in the HTML or the page, no pause, today's panel and drawing`,
      )
      .toEqual({
        inHtml: false,
        entries: 0,
        pauses: 0,
        replaying: 0,
        plan: {
          replay: false,
          run: serverRun(state, n),
          focus: focusOf(state, n),
          tally: (state === "live" || state === "open") && n !== null,
        },
        panel: panel.expected,
      });
    await context.close();
  }
});

/** Each step's read against the oracle, as one line for a step list. */
function stepLine(read: ReplayRead) {
  return `${momentsPlayed(read)}`;
}

test("B4.44 it plays in order, on the clock: a press of the entry gives k = 1 at once, then k + 1 at each 1,500 ms and not before (read at 1,499 and 1,500); it jumps at once to #replay, the Activity head under the bar and inside the viewport, and the scroll never moves after; each li the oracle's kind, time and text, newest on top, every played one kept; the h2 Replay, 23 Oct (UTC) and data-replaying; after the 12th the pause hides and 10 fake minutes change nothing; no now line, nothing copper, [data-announce] empty; the chip, status, table and Pause updates the resting panel's throughout; the same timings in Full, Calm, Off, reduced motion and WebGL refused", async ({
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const replay = await siteOf(crew, "replay");
  const exp = expected(replay.body(), replay.origin);
  const { context, page, live } = await opened(browser, replay);
  const accent = (await tokenRgba(page, "--accent")) ?? [0, 0, 0, 0];
  const resting = await head(page);
  expect
    .soft(resting.status, "the resting status before a press")
    .toBe(exp.status);

  const pressed = await press(page, ENTRY);
  expect(pressed, "the entry has a box to press").toBe(true);
  const first = await untilPlayed(page, 1);
  await sleep(SCROLL_WAIT);
  const landed = await page.evaluate(() => {
    const bar = document
      .querySelector("header:has(nav)")
      ?.getBoundingClientRect();
    const h2 = document.querySelector("#replay h2")?.getBoundingClientRect();
    return {
      y: scrollY,
      bar: bar ? bar.bottom : Number.NaN,
      top: h2 ? h2.top : Number.NaN,
      bottom: h2 ? h2.bottom : Number.NaN,
      height: innerHeight,
    };
  });
  expect
    .soft(
      {
        k: momentsPlayed(first),
        instant: first.scrollY === landed.y,
        under: landed.top >= landed.bar - 0.5,
        inView: landed.bottom <= landed.height + 0.5,
      },
      `a press of the entry: k = 1 at once, and the jump to #replay instant (scrollY ${first.scrollY} at once, ${landed.y} ${SCROLL_WAIT} ms later) with the Activity head from ${landed.top.toFixed(1)} to ${landed.bottom.toFixed(1)}, under the bar's ${landed.bar.toFixed(1)} and inside ${landed.height}`,
    )
    .toEqual({ k: 1, instant: true, under: true, inView: true });

  const lists: string[] = [];
  const timings: string[] = [];
  const wrong: string[] = [];
  const heads: string[] = [];
  const copper: string[] = [];
  let read = first;
  for (let k = 1; k <= KEPT.length; k++) {
    const at = `at k = ${k}`;
    if (JSON.stringify(read.moments) !== JSON.stringify(listed(KEPT, k)))
      lists.push(`${at}: ${JSON.stringify(read.moments.map((m) => m.shown))}`);
    if (
      read.heading !== replayHeading(KEPT) ||
      read.replaying !== 1 ||
      !read.replayingHoldsList ||
      read.nows !== 0 ||
      read.announce !== "" ||
      read.scrollY !== landed.y
    )
      wrong.push(
        `${at}: heading ${read.heading}, data-replaying ${read.replaying} (holding the list ${read.replayingHoldsList}), now lines ${read.nows}, announced "${read.announce}", scrollY ${read.scrollY}`,
      );
    if (k === 1 || k === 6 || k === KEPT.length) {
      const now = await head(page);
      if (JSON.stringify(now) !== JSON.stringify(resting))
        heads.push(`${at}: ${JSON.stringify(now)}`);
      const hits = await copperPaint(page, accent);
      copper.push(...hits.map((h) => `${at}: ${h.where} ${h.property}`));
    }
    if (k === KEPT.length) break;
    const early = await stepClock(page, STEP - 1);
    read = await (async () => {
      await page.clock.runFor(1);
      return untilPlayed(page, k + 1);
    })();
    timings.push(`${stepLine(early)}>${stepLine(read)}`);
  }
  expect
    .soft(
      timings,
      "k at 1,499 ms and at 1,500 ms after each step, from k = 1 to 12",
    )
    .toEqual(
      Array.from({ length: KEPT.length - 1 }, (_, i) => `${i + 1}>${i + 2}`),
    );
  expect.soft(lists, "steps whose list isn't the oracle's").toEqual([]);
  expect
    .soft(
      wrong,
      `steps whose heading isn't ${replayHeading(KEPT)}, without data-replaying on the block, with a now line, an announcement or a scroll`,
    )
    .toEqual([]);
  expect
    .soft(
      heads,
      "steps whose chip, status, table or Pause updates differ from the resting panel's",
    )
    .toEqual([]);
  expect.soft(copper, "--accent painted while replaying").toEqual([]);

  // The end: the pause hides, and ten fake minutes change nothing.
  const end = await stepClock(page, STEP);
  expect
    .soft(
      {
        k: momentsPlayed(end),
        list:
          JSON.stringify(end.moments) ===
          JSON.stringify(listed(KEPT, KEPT.length)),
        pause: end.pause?.shown,
      },
      "1,500 ms after the 12th moment: all 12 listed, the pause hidden",
    )
    .toEqual({ k: KEPT.length, list: true, pause: false });
  await takeMutations(page);
  await takePlan(page);
  for (let i = 0; i < 10; i++) await live.tick(60_000);
  expect
    .soft(
      {
        panel: (await takeMutations(page)).panel,
        plan: (await takePlan(page)).mutations,
        k: momentsPlayed(await readReplay(page)),
      },
      "10 fake minutes after the end: no mutation in .crew or [data-plan]",
    )
    .toEqual({ panel: [], plan: [], k: KEPT.length });
  await context.close();

  // The same timings in each mode (WebGL refused above).
  const modes: [string, Options][] = [
    ["Full", { stored: "full" }],
    ["Calm", { stored: "calm" }],
    ["Off", { stored: "off" }],
    ["reduced motion", { stored: "full", reduced: true }],
  ];
  const byMode: string[] = [];
  for (const [mode, options] of modes) {
    const opened_ = await opened(browser, replay, options);
    await press(opened_.page, ENTRY);
    const reads = [momentsPlayed(await untilPlayed(opened_.page, 1))];
    for (let i = 0; i < 2; i++) {
      reads.push(momentsPlayed(await stepClock(opened_.page, STEP - 1)));
      await opened_.page.clock.runFor(1);
      reads.push(momentsPlayed(await untilPlayed(opened_.page, i + 2)));
    }
    byMode.push(`${mode}: ${reads.join(" ")}`);
    await opened_.context.close();
  }
  expect
    .soft(
      byMode,
      "k at a press, then at 1,499 and 1,500 ms, twice, in each mode",
    )
    .toEqual(modes.map(([mode]) => `${mode}: 1 1 2 2 3`));
});

test("B4.45 pause, Space, and again (amendment 1): button[data-replay-pause] reads exactly Pause replay with a CSS glyph, 32 px tall from 1024 and 44 below, visible from k = 1 to the end in the same box; a press mid-play pauses (aria-pressed true, 10 fake minutes change nothing) and a press resumes 1,500 ms on; Space on the body or on the pause toggles it, does nothing to the replay before a press or at the end (the page scrolls), and on Pause updates presses Pause updates alone; at the end the pause is hidden and unfocusable, its focus on the entry; the entry restarts at k = 1 mid-play, paused and at the end; the next Tab after the entry reaches Pause replay, and the panel's Tab order is the resting one's plus the entry and the pause", async ({
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const replay = await siteOf(crew, "replay");
  const resting = await siteOf(crew, "resting");

  // The panel's Tab stops on the resting site (no replay): today's order.
  const tabStops = async (page: Page) => {
    await toBody(page);
    await page.evaluate(() => scrollTo(0, 0));
    const stops: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(
        ({ ENTRY, PAUSE }) => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          if (!el.closest('section[aria-labelledby="crew"]')) return "outside";
          if (el.matches(ENTRY)) return "entry";
          if (el.matches(PAUSE)) return "pause";
          if (el.matches("button[data-pause]")) return "Pause updates";
          return `<${el.tagName.toLowerCase()}> ${(el.textContent ?? "").trim().slice(0, 30)}`;
        },
        { ENTRY, PAUSE },
      );
      if (at === null) break;
      if (at !== "outside") stops.push(at);
    }
    return stops;
  };
  const today = await (async () => {
    const { context, page } = await opened(browser, resting);
    const stops = await tabStops(page);
    await context.close();
    return stops;
  })();

  const { context, page, live } = await opened(browser, replay);
  const before = await readReplay(page);
  const box0 = before.pause?.box ?? null;
  const unplayed = await tabStops(page);
  expect
    .soft(
      unplayed,
      "the panel's Tab stops before a press: the resting panel's, with the entry before Pause updates",
    )
    .toEqual(
      today.flatMap((s) => (s === "Pause updates" ? ["entry", s] : [s])),
    );

  // Play: the next Tab after the entry's press is the pause.
  await press(page, ENTRY);
  await untilPlayed(page, 1);
  await page.keyboard.press("Tab");
  const playing = await readReplay(page);
  const glyph = await cssGlyph(page, PAUSE);
  expect
    .soft(
      {
        active: playing.active,
        shown: playing.pause?.shown,
        pressed: playing.pause?.pressed,
        text: glyph?.text.trim(),
        glyph: glyph?.glyph,
        tall: pauseTall(tall(playing.pause?.box), 1440),
        same: JSON.stringify(playing.pause?.box) === JSON.stringify(box0),
      },
      `the pause at k = 1, after a Tab from the entry's press (its box ${JSON.stringify(playing.pause?.box)}, before ${JSON.stringify(box0)})`,
    )
    .toEqual({
      active: "<button pause>",
      shown: true,
      pressed: "false",
      text: "Pause replay",
      glyph: true,
      tall: true,
      same: true,
    });
  const playingStops = await tabStops(page);
  expect
    .soft(
      playingStops,
      "the panel's Tab stops while playing: the resting panel's, the entry before Pause updates and the pause after it",
    )
    .toEqual(
      today.flatMap((s) =>
        s === "Pause updates" ? ["entry", s, "pause"] : [s],
      ),
    );

  // A press pauses: 10 fake minutes change nothing. A press resumes, 1,500 ms on.
  await stepClock(page, STEP);
  const k = momentsPlayed(await untilPlayed(page, 2));
  await press(page, PAUSE);
  const paused = await readReplay(page);
  await takeMutations(page);
  await takePlan(page);
  for (let i = 0; i < 10; i++) await live.tick(60_000);
  const still = {
    panel: (await takeMutations(page)).panel,
    plan: (await takePlan(page)).mutations,
    k: momentsPlayed(await readReplay(page)),
  };
  await press(page, PAUSE);
  const resumed = await readReplay(page);
  const early = momentsPlayed(await stepClock(page, STEP - 1));
  await page.clock.runFor(1);
  const next = momentsPlayed(await untilPlayed(page, k + 1));
  expect
    .soft(
      {
        pressed: paused.pause?.pressed,
        still,
        unpressed: resumed.pause?.pressed,
        early,
        next,
      },
      "a press at k = 2 pauses for 10 fake minutes (no mutation in .crew or [data-plan]), a press resumes: k at 1,499 and 1,500 ms",
    )
    .toEqual({
      pressed: "true",
      still: { panel: [], plan: [], k },
      unpressed: "false",
      early: k,
      next: k + 1,
    });

  // Space on the pause (focused by the press), then on the body.
  const spaces: string[] = [];
  const space = async (what: string) => {
    const y = (await readReplay(page)).scrollY;
    await page.keyboard.press("Space");
    await sleep(SCROLL_WAIT);
    const r = await readReplay(page);
    spaces.push(
      `${what}: ${r.pause?.pressed} ${r.scrollY === y ? "still" : "scrolled"}`,
    );
  };
  await focusOn(page, PAUSE);
  await space("on the pause");
  await space("on the pause again");
  await toBody(page);
  await space("on the body");
  await space("on the body again");
  const kSpace = momentsPlayed(await readReplay(page));
  const spaceEarly = momentsPlayed(await stepClock(page, STEP - 1));
  await page.clock.runFor(1);
  const spaceNext = momentsPlayed(await untilPlayed(page, kSpace + 1));
  // Space on Pause updates presses it alone.
  await focusOn(page, "button[data-pause]");
  await page.keyboard.press("Space");
  await sleep(150);
  const onUpdates = await page.evaluate(
    (s) => [
      document
        .querySelector("button[data-pause]")
        ?.getAttribute("aria-pressed"),
      document.querySelector(s)?.getAttribute("aria-pressed"),
    ],
    PAUSE,
  );
  await page.keyboard.press("Space");
  await sleep(150);
  expect
    .soft(
      { spaces, timing: [spaceEarly, spaceNext], onUpdates },
      "Space toggles the pause on it and on the body, without scrolling; the replay then steps at 1,500 ms; Space on Pause updates presses it alone",
    )
    .toEqual({
      spaces: [
        "on the pause: true still",
        "on the pause again: false still",
        "on the body: true still",
        "on the body again: false still",
      ],
      timing: [kSpace, kSpace + 1],
      onUpdates: ["true", "false"],
    });

  // The entry restarts at k = 1: mid-play, then paused.
  const restarts: string[] = [];
  await advance(page, 1);
  await press(page, ENTRY);
  let r = await untilPlayed(page, 1);
  restarts.push(`mid-play: ${momentsPlayed(r)} ${r.pause?.pressed}`);
  await advance(page, 1);
  await press(page, PAUSE);
  await press(page, ENTRY);
  r = await untilPlayed(page, 1);
  restarts.push(`paused: ${momentsPlayed(r)} ${r.pause?.pressed}`);
  r = await (async () => {
    await page.clock.runFor(STEP);
    return untilPlayed(page, 2);
  })();
  restarts.push(`then: ${momentsPlayed(r)}`);

  // To the end with the focus on the pause.
  await focusOn(page, PAUSE);
  const ended = await advance(page, KEPT.length);
  const endFocusable = await focusable(page, PAUSE);
  await toBody(page);
  const endY = ended.scrollY;
  await page.keyboard.press("Space");
  await sleep(SCROLL_WAIT);
  const afterSpace = await readReplay(page);
  await press(page, ENTRY);
  r = await untilPlayed(page, 1);
  restarts.push(`at the end: ${momentsPlayed(r)} ${r.pause?.pressed}`);
  expect
    .soft(
      {
        k: momentsPlayed(ended),
        shown: ended.pause?.shown,
        focusable: endFocusable,
        active: ended.active,
        same: JSON.stringify(ended.pause?.box ?? null) === JSON.stringify(box0),
        space: {
          scrolled: afterSpace.scrollY !== endY,
          k: momentsPlayed(afterSpace),
          shown: afterSpace.pause?.shown,
        },
      },
      "at the end: 12 played, the pause hidden and unfocusable in its box, the focus it had on the entry; Space on the body scrolls and changes nothing",
    )
    .toEqual({
      k: KEPT.length,
      shown: false,
      focusable: false,
      active: "<a entry>",
      same: true,
      space: { scrolled: true, k: KEPT.length, shown: false },
    });
  expect
    .soft(restarts, "the entry's press restarts at k = 1, playing")
    .toEqual([
      "mid-play: 1 false",
      "paused: 1 false",
      "then: 2",
      "at the end: 1 false",
    ]);

  // The pause's height below 1024.
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(100);
  const narrow = await readReplay(page);
  expect
    .soft(
      pauseTall(tall(narrow.pause?.box), 390),
      `the pause 44 px tall at 390 (${tall(narrow.pause?.box).toFixed(1)})`,
    )
    .toBe(true);
  await context.close();
});

// ---------------------------------------------------------------------------------------------
// B4.48: the poll and the replay

const told = (
  fixture: "live" | "open" | "resting",
  patch?: Parameters<typeof feedOf>[1],
) => toAnswer(feedOf(fixture, patch), FIXTURE_STUDIO);

test("B4.48 the poll and the replay: /api/crew on the replay fixture deep-equals the oracle's, run.replay the 12 kept entries oldest first, each exactly { at, kind, text }, and no replay key on the bad and null variants; the default server routed to the replay answer turns resting at the first poll, offers Replay sprint 29 and plays in the panel alone (no change in [data-plan], no stamp); mid-replay polls keep 60 s and a resting answer for 29 changes no node; live, open, resting for 30 and down past 10 minutes each close it in that poll (no entry, pause, data-replaying or data-replay, the told list, data-run record, no stamp or key); resting for 30 with a replay offers Replay sprint 30; /crew#replay on the live fixture plays nothing", async ({
  browser,
  crew,
  request,
}) => {
  test.setTimeout(240_000);
  const replay = await siteOf(crew, "replay");

  // The route.
  const routes: Record<string, unknown> = {};
  for (const name of [
    "replay",
    "replay-999",
    "replay-bad",
    "replay-null",
  ] as const) {
    const site = await siteOf(crew, name);
    const body = (await (
      await request.get(`${site.base}/api/crew`)
    ).json()) as {
      run?: Record<string, unknown> | null;
    };
    const oracle = toAnswer(site.body(), site.origin);
    expect
      .soft(body, `/api/crew on the ${name} site, against the oracle`)
      .toEqual(oracle);
    routes[name] =
      body.run && "replay" in body.run ? body.run.replay : "(no key)";
  }
  expect
    .soft(
      {
        replay: routes.replay,
        keys: Array.isArray(routes.replay)
          ? routes.replay.map((e) =>
              Object.keys(e as object)
                .sort()
                .join(),
            )
          : [],
        bad: routes["replay-bad"],
        none: routes["replay-null"],
      },
      "run.replay: the 12 kept, oldest first, each exactly at, kind, text; no key on the bad and null variants",
    )
    .toEqual({
      replay: KEPT,
      keys: KEPT.map(() => "at,kind,text"),
      bad: "(no key)",
      none: "(no key)",
    });

  const REPLAY_ANSWER = told("resting", { last: { replay: REPLAY } });
  // The default server: offered by the poll, played in the panel alone.
  {
    const { context, page, live } = await opened(browser, DEFAULT, {
      first: { json: REPLAY_ANSWER },
    });
    const offered = await readReplay(page);
    await takePlan(page);
    await press(page, ENTRY);
    const one = await untilPlayed(page, 1);
    await advance(page, 1);
    const two = await untilPlayed(page, 2);
    expect
      .soft(
        {
          state: await live.state(),
          entry: [offered.entry?.text, offered.entry?.shown],
          played: [momentsPlayed(one), momentsPlayed(two)],
          plan: (await takePlan(page)).mutations,
          replay: two.plan.replay,
          stamp: two.stamp?.shown ?? false,
        },
        "the default server, its first poll told the replay fixture: resting, the entry shown, k 1 then 2, no mutation in [data-plan] and no stamp",
      )
      .toEqual({
        state: "resting",
        entry: [`Replay sprint ${N}`, true],
        played: [1, 2],
        plan: [],
        replay: false,
        stamp: false,
      });
    await context.close();
  }

  // Mid-replay: the 60 s schedule, and a resting answer for 29 changes nothing.
  {
    const { context, page, live } = await opened(browser, replay);
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    await advance(page, 1);
    await untilPlayed(page, 2);
    await press(page, PAUSE);
    const held = await readReplay(page);
    await takeMutations(page);
    await takePlan(page);
    // The hydration poll was at load, 1.5 s of the clock ago: the next is due at 60 s.
    const early = await live.tick(60_000 - STEP - 1_000);
    const due = await live.tick(1_000);
    const mutations = (await takeMutations(page)).panel.filter(
      (m) => !m.includes("data-replay-pause"),
    );
    expect
      .soft(
        {
          early,
          due,
          block: mutations,
          plan: (await takePlan(page)).mutations,
        },
        "mid-replay (paused at k = 2): no poll before 60 s, one at 60 s, and its resting answer for 29 changes no node in .crew or [data-plan]",
      )
      .toEqual({
        held: [2, "true"],
        early: 0,
        due: 1,
        block: [],
        plan: [],
      });
    await context.close();
  }

  // Each answer that closes it, in its poll.
  const closers: [string, Reply | "down", unknown][] = [
    ["live", { json: told("live") }, feedOf("live")],
    ["open", { json: told("open") }, feedOf("open")],
    [
      "resting for sprint 30",
      { json: told("resting", { last: { sprint: 30 } }) },
      feedOf("resting", { last: { sprint: 30 } }),
    ],
    ["down past 10 minutes", "down", null],
  ];
  for (const [what, reply, feed] of closers) {
    const { context, page, live } = await opened(browser, replay);
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    await advance(page, 1);
    const playing = momentsPlayed(await untilPlayed(page, 2));
    if (reply === "down") {
      live.answer({ status: 503 });
      // A failing poll may keep B4c's 30 s schedule: step at it, past 10 minutes.
      for (let i = 0; i < 22; i++) await live.tick(30_000);
    } else {
      live.answer(reply);
      // The first 60 s step may land on the step's own poll; the told answer applies in it.
      await live.tick(60_000);
    }
    const read = await readReplay(page);
    const panel = await readPanel(page);
    const exp = expected(feed, feed ? FIXTURE_STUDIO : null);
    expect
      .soft(
        {
          playing,
          entries: read.entries,
          pauses: read.pauses,
          replaying: read.replaying,
          replay: read.plan.replay,
          heading: panel.heading,
          moments: panel.moments,
          run: read.plan.run,
          stamp: read.stamp?.shown ?? false,
          key: read.key?.shown ?? false,
        },
        `a replay at k = 2 meeting ${what}: closed in that poll`,
      )
      .toEqual({
        playing: 2,
        entries: 0,
        pauses: 0,
        replaying: 0,
        replay: false,
        heading: exp.heading,
        moments: exp.moments,
        run: "record",
        stamp: false,
        key: false,
      });
    await context.close();
  }

  // Resting for 30 with a replay of its own: 29's closes, and 30's is offered.
  {
    const { context, page, live } = await opened(browser, replay);
    await press(page, ENTRY);
    const playing = momentsPlayed(await untilPlayed(page, 1));
    const thirty = feedOf("resting", { last: { sprint: 30, replay: REPLAY } });
    live.answer({ json: toAnswer(thirty, FIXTURE_STUDIO) });
    await live.tick(60_000);
    const read = await readReplay(page);
    const panel = await readPanel(page);
    expect
      .soft(
        {
          playing,
          entry: [read.entries, read.entry?.text, read.entry?.shown],
          replaying: read.replaying,
          replay: read.plan.replay,
          moments: panel.moments,
          status: panel.status,
        },
        "29's replay meeting resting for 30 with a replay: closed, Replay sprint 30 offered, not playing, the told list",
      )
      .toEqual({
        playing: 1,
        entry: [1, "Replay sprint 30", true],
        replaying: 0,
        replay: false,
        moments: expected(thirty, FIXTURE_STUDIO).moments,
        status: expected(thirty, FIXTURE_STUDIO).status,
      });
    await context.close();
  }

  // /crew#replay on the live fixture plays nothing.
  {
    const live = await siteOf(crew, "live");
    const { context, page } = await opened(browser, live, { hash: "#replay" });
    const read = await advance(page, 3);
    expect
      .soft(
        {
          entries: read.entries,
          replaying: read.replaying,
          replay: read.plan.replay,
          moments: (await readPanel(page)).moments,
        },
        "/crew#replay on the live site, 4.5 s of the clock on",
      )
      .toEqual({
        entries: 0,
        replaying: 0,
        replay: false,
        moments: expected(live.body(), live.origin).moments,
      });
    await context.close();
  }
});

test("B4.50 the tick key: one p[data-tick-key] right after ol[data-moments], reading exactly One tick on the plank in pencil for each moment above, up to ten., with one aria-hidden svg, on the live and open fixtures and in a replay before its merge; none at rest unplayed, from the replay's merge on, in down or on the 999 variant; at least 4.5:1 in both schemes (B4.12's first screen on live is B4.12's own check)", async ({
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const replay = await siteOf(crew, "replay");
  const shownKey = (r: ReplayRead) =>
    r.key?.shown
      ? `${r.keys} ${r.key.afterList} ${r.key.text === KEY_WORDS} ${r.key.svgs} ${r.key.hiddenSvgs}`
      : "none";
  const WITH = "1 true true 1 1";
  const seen: Record<string, string> = {};
  for (const name of ["live", "open"] as const) {
    const site = await siteOf(crew, name);
    const { context, page } = await opened(browser, site);
    seen[name] = shownKey(await readReplay(page));
    await context.close();
  }
  {
    const { context, page } = await opened(browser, replay);
    seen["at rest, unplayed"] = shownKey(await readReplay(page));
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    await advance(page, 2);
    seen["replaying, k = 3"] = shownKey(await untilPlayed(page, 3));
    await advance(page, MERGE_AT - 3);
    seen["at the merge"] = shownKey(await untilPlayed(page, MERGE_AT));
    await advance(page, KEPT.length - MERGE_AT);
    seen["at the end"] = shownKey(await untilPlayed(page, KEPT.length));
    await context.close();
  }
  {
    const s999 = await siteOf(crew, "replay-999");
    const { context, page } = await opened(browser, s999);
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    await advance(page, 2);
    seen["the 999 variant, k = 3"] = shownKey(await untilPlayed(page, 3));
    await context.close();
  }
  {
    const { context, page } = await opened(browser, DEFAULT);
    seen.down = shownKey(await readReplay(page));
    await context.close();
  }
  expect
    .soft(
      seen,
      "the key shown (count, right after the list, the exact words, svgs, aria-hidden svgs), or none",
    )
    .toEqual({
      live: WITH,
      open: WITH,
      "at rest, unplayed": "none",
      "replaying, k = 3": WITH,
      "at the merge": "none",
      "at the end": "none",
      "the 999 variant, k = 3": "none",
      down: "none",
    });

  // Contrast, in both schemes, on the live site, with no clock.
  const live = await siteOf(crew, "live");
  for (const scheme of SCHEMES) {
    const context = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(installRgba);
    await context.addInitScript(refuseWebGl);
    const page = await context.newPage();
    await page.goto(`${live.base}/crew`);
    await page.evaluate(() => document.fonts.ready);
    const key = (await textContrast(page)).filter((t) =>
      t.text.includes("One tick"),
    );
    expect
      .soft(
        key.length > 0 && key.every((t) => t.ratio >= 4.5),
        `the key's contrast on the live site, ${scheme}: ${JSON.stringify(key)}`,
      )
      .toBe(true);
    await context.close();
  }
});

/** Every script the page fetches with WebGL refused: paths and decoded bytes. */
async function scripts(browser: Browser, url: string) {
  const context = await browser.newContext();
  await context.addInitScript(refuseWebGl);
  const page = await context.newPage();
  const bodies: Promise<[string, number]>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    const path = new URL(response.url()).pathname;
    bodies.push(
      response
        .body()
        .then((body) => [path, body.length] as [string, number])
        .catch(() => [path, Number.NaN] as [string, number]),
    );
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

/**
 * Runs `sweep` with the clock running: axe waits on timers, which a paused clock never fires. The
 * replay is at rest, paused or ended, so nothing steps; the clock pauses again after.
 */
async function running<T>(page: Page, sweep: () => Promise<T>) {
  await page.clock.resume();
  try {
    return await sweep();
  } finally {
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 50);
  }
}

test("B4.51 the sweeps, replaying: on the replay fixture at rest, mid-replay (paused at k = 5) and at the end, in both schemes, axe with the strict tags at 1440 and 390, every text in a token, no overflow at 320 or 390, the entry and the pause 44 px targets below 1024 and 24 from it; in forced colours the entry's and the pause's rings, the pause pressed in Highlight, the stamp and the ticks CanvasText; /crew's script on the replay fixture the 404's and at most 20,480 B more, and within 18,432 B of /log's, WebGL refused", async ({
  browser,
  crew,
}) => {
  test.setTimeout(240_000);
  const replay = await siteOf(crew, "replay");
  for (const scheme of SCHEMES) {
    const { context, page } = await opened(browser, replay, { scheme });
    const states: [string, () => Promise<void>][] = [
      ["at rest", async () => {}],
      [
        "mid-replay",
        async () => {
          await press(page, ENTRY);
          await untilPlayed(page, 1);
          await advance(page, 4);
          await untilPlayed(page, 5);
          await press(page, PAUSE);
        },
      ],
      [
        "at the end",
        async () => {
          await press(page, PAUSE);
          await advance(page, KEPT.length);
        },
      ],
    ];
    for (const [state, reach] of states) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await reach();
      for (const width of [1440, 390, 320]) {
        const at = `${state}, ${scheme}, at ${width}`;
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await sleep(100);
        if (width !== 320) {
          const violations = await running(
            page,
            async () =>
              (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
                .violations,
          );
          expect
            .soft(
              violations.map((v) => ({
                rule: v.id,
                targets: v.nodes.map((n) => n.target.join(" ")),
              })),
              `axe, ${at}`,
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
              `text not in a token, ${at}`,
            )
            .toEqual([]);
        }
        if (width !== 1440)
          expect
            .soft(await horizontalOverflow(page), `overflow, ${at}`)
            .toBe(0);
        const read = await readReplay(page);
        const targets = [read.entry, ...(read.pause?.shown ? [read.pause] : [])]
          .filter((c) => c?.shown)
          .map((c) => {
            const b = c?.box;
            const w = b ? b.right - b.left : 0;
            const h = b ? b.bottom - b.top : 0;
            const min = width < 1024 ? 44 : 24;
            return `${c?.text}: ${w >= min - 0.5 && h >= min - 0.5 ? "ok" : `${w.toFixed(1)} x ${h.toFixed(1)}`}`;
          });
        expect
          .soft(targets, `the entry's and the pause's targets, ${at}`)
          .toEqual(
            [
              `Replay sprint ${N}`,
              ...(state === "mid-replay" ? ["Pause replay"] : []),
            ].map((t) => `${t}: ok`),
          );
      }
    }
    await context.close();
  }

  // Forced colours, mid-replay.
  {
    const { context, page } = await opened(browser, replay, { forced: true });
    await press(page, ENTRY);
    await untilPlayed(page, 1);
    await advance(page, 2);
    await untilPlayed(page, 3);
    const colours = await page.evaluate(() => {
      // As B4.31 reads Highlight: a background, so the pressed fill compares like for like.
      const of = (
        value: string,
        property: "color" | "background-color" = "color",
      ) => {
        const probe = document.createElement("span");
        probe.style.cssText = `forced-color-adjust: none; ${property}: ${value}`;
        document.body.append(probe);
        const c =
          property === "color"
            ? getComputedStyle(probe).color
            : getComputedStyle(probe).backgroundColor;
        probe.remove();
        return c;
      };
      return {
        text: of("CanvasText"),
        canvas: of("Canvas"),
        highlight: of("Highlight", "background-color"),
      };
    });
    // The rings: reached by Tab from the top, read while focused.
    const rings: Record<string, string> = {};
    await toBody(page);
    await page.evaluate(() => scrollTo(0, 0));
    for (let i = 0; i < 60 && Object.keys(rings).length < 2; i++) {
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(
        ({ ENTRY, PAUSE }) => {
          const el = document.activeElement;
          if (!el) return null;
          const which = el.matches(ENTRY)
            ? "entry"
            : el.matches(PAUSE)
              ? "pause"
              : null;
          if (!which) return null;
          const s = getComputedStyle(el);
          return [
            which,
            `${s.outlineStyle} ${Number.parseFloat(s.outlineWidth) >= 2}`,
          ];
        },
        { ENTRY, PAUSE },
      );
      if (ring?.[0] && ring[1]) rings[ring[0]] = ring[1];
    }
    await press(page, PAUSE);
    const look = await page.evaluate(
      ({ PAUSE, STAMP }) => {
        const pause = document.querySelector(PAUSE);
        const stamp = document.querySelector(STAMP);
        const s = stamp ? getComputedStyle(stamp) : null;
        return {
          pressed: pause ? getComputedStyle(pause).backgroundColor : null,
          stamp: s
            ? {
                color: s.color,
                border: s.borderTopColor,
                background: s.backgroundColor,
              }
            : null,
        };
      },
      { PAUSE, STAMP },
    );
    const marks = (await readDetail(page)).marks.map((m) => m.strokeRaw);
    expect
      .soft(
        {
          rings,
          pressed: look.pressed === colours.highlight,
          stamp: look.stamp
            ? [
                look.stamp.color === colours.text,
                look.stamp.border === colours.text,
                look.stamp.background === colours.canvas,
              ]
            : null,
          marks: marks.length > 0 && marks.every((m) => m === colours.text),
        },
        `forced colours mid-replay: the entry's and the pause's rings (solid, 2 px or more), the pause pressed in Highlight ${colours.highlight}, the stamp CanvasText ${colours.text} on Canvas ${colours.canvas} (${JSON.stringify(look.stamp)}), the ticks CanvasText (${JSON.stringify(marks)})`,
      )
      .toEqual({
        rings: { entry: "solid true", pause: "solid true" },
        pressed: true,
        stamp: [true, true, true],
        marks: true,
      });
    await context.close();
  }

  // B4.14 and B4.31's budget at the new figures, read on the replay fixture.
  const crewScripts = await scripts(browser, `${replay.base}/crew`);
  const missing = await scripts(browser, `${replay.base}/no-such-page`);
  const log = await scripts(browser, `${replay.base}/log`);
  test.info().annotations.push({
    type: "script-bytes",
    description: `the replay site: /crew ${crewScripts.bytes} B in ${crewScripts.paths.length}; the 404 ${missing.bytes} B; /log ${log.bytes} B`,
  });
  expect
    .soft(
      {
        status: [crewScripts.status, missing.status, log.status],
        notInCrew: missing.paths.filter((p) => !crewScripts.paths.includes(p)),
        beyond404: crewScripts.bytes - missing.bytes <= 20_480,
        beyondLog: crewScripts.bytes - log.bytes <= 18_432,
      },
      `/crew's script on the replay site, WebGL refused: ${crewScripts.bytes - missing.bytes} B beyond the 404's, ${crewScripts.bytes - log.bytes} B beyond /log's`,
    )
    .toEqual({
      status: [200, 404, 200],
      notInCrew: [],
      beyond404: true,
      beyondLog: true,
    });
});
