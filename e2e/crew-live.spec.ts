import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
} from "@playwright/test";
import { readPanel } from "./crew";
import {
  type Crew,
  type Fixture,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import {
  announcement,
  type CrewAnswer,
  FIXTURE_STUDIO,
  feedOf,
  livePage,
  type Patch,
  panelAgainst,
  recordMutations,
  stringsOf,
  takeMutations,
  toAnswer,
  wrongKeys,
} from "./crew-live";
import {
  horizontalOverflow,
  installRgba,
  resolveColors,
  SCHEMES,
} from "./helpers";
import { refuseWebGl } from "./webgl";

// Sprint 35, B4c (.crew/sprint/35/contract.md, B4.25 to B4.31): /crew live in the browser, written
// before the build. B4.25 reads `/api/crew` on B4a's harness (e2e/crew-feed.ts), on the worker's
// kept live, open and resting sites; the rest open the default server's /crew (down, no feed) with
// Playwright's clock installed and paused before `goto`, `page.route` answering `/api/crew` with
// the oracle's answer for a fixture (e2e/crew-live.ts, `toAnswer`), and, where a check hides the
// page, a visibility shim. "A poll" is a request the route sees. No check waits in real time for a
// schedule: the clock runs it. B4.32 folds into live-layer.spec.ts's quiet site (B4.16's).
//
// The browser is in Los Angeles and the harness's servers at UTC+14 (B4.7), as in crew.spec.ts.

test.skip(
  Boolean(process.env.PLAYWRIGHT_BASE_URL),
  "PLAYWRIGHT_BASE_URL is set: these checks need this checkout's build, served without a feed (the down state) and from copies pointed at the fixture server",
);
test.use({ timezoneId: "America/Los_Angeles" });

const SECTION = 'section[aria-labelledby="crew"]';
const KEPT: Fixture[] = ["live", "open", "resting"];
const DOWN: CrewAnswer = { version: 1, state: "down", run: null };
const CACHE = "public, max-age=0, s-maxage=30";

/** A fixture's answer, as the route would give it, with the fixtures' own Studio origin. */
const told = (fixture: Fixture, patch?: Patch) =>
  toAnswer(feedOf(fixture, patch), FIXTURE_STUDIO);

const LIVE = told("live");
const OPEN = told("open");
const RESTING = told("resting");

type Role = { role: string; state: string; line: string | null };
const liveRoles = () =>
  structuredClone(
    (feedOf("live").current as { roles: Role[] }).roles,
  ) as Role[];
const liveMoments = () =>
  structuredClone(
    (feedOf("live").current as { moments: Record<string, unknown>[] }).moments,
  );
/** The live fixture's roles, with `changes` applied to the first entry of each key named. */
function rolesWith(changes: Record<string, Partial<Role>>) {
  const seen = new Set<string>();
  return liveRoles().map((entry) => {
    if (seen.has(entry.role) || !changes[entry.role]) return entry;
    seen.add(entry.role);
    return { ...entry, ...changes[entry.role] };
  });
}
/** A moment newer than the live fixture's newest (01:58:40 UTC on 24 Oct), on the same day. */
const moment = (minute: number, text: string) => ({
  kind: "report",
  at: `2026-10-24T02:${String(minute).padStart(2, "0")}:00.000Z`,
  who: "qa-engineer",
  text,
});

// Sprint 36 (B4d, .crew/sprint/36/contract.md, "The live checks") puts the model on /crew: every
// context here refuses WebGL (the Off path, as sprint 33 did for /log), the test's own page by this
// beforeEach and the rest through freshContext, so no SwiftShader build runs under these checks.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(refuseWebGl);
});

/** A context of its own, as the test's own page has it, for a page with a clock of its own. */
async function freshContext(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0] = {},
): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  await context.addInitScript(refuseWebGl);
  return context;
}

/** The poller's readiness, the first failure a page without it meets. */
function ready(live: { ready: boolean }, where: string) {
  expect(
    live.ready,
    `button[data-pause][data-ready] on ${where} within 5 s: the poller started`,
  ).toBe(true);
}

/** A kept site's /crew showing its fixture's state (the polling rule, at most STATE_WAIT ms). */
function keptSite(crew: Crew, fixture: Fixture) {
  return crew.once(`live-crew ${fixture}`, async () => {
    const site = await crew.site(fixture, { fixture });
    const shown = await untilState(site.baseURL, fixture, STATE_WAIT);
    return { base: site.baseURL, ...shown };
  });
}

/**
 * The panel's textContent without `p[data-tick-key]`: the key follows the drawing's state (shown
 * where the server drew the tally), not the told answer, and B4.50 checks it (.crew/sprint/37/
 * decisions.md, 10). A copy is read, so the page keeps its key.
 */
function panelText(page: Page) {
  return page.evaluate((s) => {
    const panel = document.querySelector(s);
    if (!panel) return "(no panel)";
    const copy = panel.cloneNode(true) as Element;
    for (const key of copy.querySelectorAll("p[data-tick-key]")) key.remove();
    return copy.textContent ?? "";
  }, SECTION);
}

/** The panel's text as the server renders it, scripts off (panelText). */
async function serverText(browser: Browser, url: string) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(url);
  const text = await panelText(page);
  await context.close();
  return text;
}

// ---------------------------------------------------------------------------------------------

test("B4c harness: on a page of its own the paused clock runs a 30 s setTimeout poller's schedule exactly, the visibility shim hides and shows it, and the oracle's answer and announcement hold the contract's worked example", async ({
  page,
}) => {
  // A stand-in poller on the 404 page (which has none): a poll at once, then 30 s after each
  // settles, none while hidden, one at once when shown again; it marks a Pause button ready.
  await page.addInitScript(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      void fetch("/api/crew", { cache: "no-store" })
        .catch(() => undefined)
        .then(() => {
          if (document.visibilityState === "visible")
            timer = setTimeout(poll, 30_000);
        });
    };
    document.addEventListener("visibilitychange", () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") poll();
    });
    document.addEventListener("DOMContentLoaded", () => {
      const button = document.createElement("button");
      button.setAttribute("data-pause", "");
      button.setAttribute("data-ready", "");
      document.body.append(button);
      poll();
    });
  });
  const live = await livePage(page, "/no-such-page", { json: DOWN });
  ready(live, "the stand-in");
  const atLoad = live.polls();
  const schedule = [await live.tick(29_000), await live.tick(1_000)];
  await live.visibility("hidden");
  const hidden = await live.tick(600_000);
  await live.visibility("visible");
  const shown = await live.settle();
  const after = [await live.tick(29_000), await live.tick(1_000)];
  expect
    .soft(
      { atLoad, schedule, hidden, shown, after },
      "the stand-in's polls: 1 at load, none at 29 s and one at 30, none hidden 10 minutes, one when shown, then 30 s again",
    )
    .toEqual({
      atLoad: 1,
      schedule: [0, 1],
      hidden: 0,
      shown: 1,
      after: [0, 1],
    });

  // The oracle against the contract's own words.
  expect.soft(wrongKeys(LIVE), "the oracle's live answer's keys").toEqual([]);
  expect
    .soft(
      wrongKeys({ ...LIVE, asOf: "x" }),
      "an extra key is caught at the top",
    )
    .toEqual(['answer: ["asOf","run","state","version"]']);
  const swapped = told("live", {
    current: {
      roles: rolesWith({
        "code-reviewer": { state: "working" },
        "qa-engineer": { state: "waiting" },
      }),
    },
  });
  expect
    .soft(announcement(LIVE, swapped), "the contract's worked announcement")
    .toBe("Lens started working. Probe stopped working.");
  expect
    .soft(
      [
        announcement(LIVE, RESTING),
        announcement(RESTING, LIVE),
        announcement(LIVE, DOWN),
        announcement(DOWN, LIVE),
        announcement(LIVE, LIVE),
      ],
      "live to resting and back, to and from down, and no change",
    )
    .toEqual([
      "Atlas stopped working. Forge stopped working. Probe stopped working.",
      "Atlas started working. Forge started working. Probe started working.",
      null,
      null,
      null,
    ]);
  expect
    .soft(
      told("open", { current: { goal: " \n\t " } }).run?.goal,
      "a blank goal reads null",
    )
    .toBeNull();
});

test("B4.25 the route: on the kept live, open and resting sites GET /api/crew is 200 application/json with Cache-Control public, max-age=0, s-maxage=30, deep-equals the oracle's answer with exactly the contract's keys, names neither the feed's address nor any URL but run.url and run.pr.url, within 8,192 B; the default server answers down with the same headers; POST is 405", async ({
  crew,
  request,
}) => {
  test.setTimeout(120_000);
  const sites = await Promise.all(
    KEPT.map((fixture) => crew.site(fixture, { fixture })),
  );
  for (const [i, fixture] of KEPT.entries()) {
    const site = sites[i];
    if (!site) continue;
    const response = await request.get(`${site.baseURL}/api/crew`);
    const text = await response.text();
    const headers = response.headers();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = `(not JSON) ${text.slice(0, 80)}`;
    }
    const where = `the kept ${fixture} site`;
    expect
      .soft(
        [
          response.status(),
          (headers["content-type"] ?? "").split(";")[0]?.trim(),
          headers["cache-control"],
        ],
        `status, media type and Cache-Control of /api/crew on ${where}`,
      )
      .toEqual([200, "application/json", CACHE]);
    const answer = toAnswer(crew.feed.body(fixture), crew.feed.origin);
    expect.soft(answer.state, `the oracle's state for ${where}`).toBe(fixture);
    expect
      .soft(body, `/api/crew's body on ${where}, against the oracle`)
      .toEqual(answer);
    expect
      .soft(
        wrongKeys(body),
        `objects with keys outside the contract's, ${where}`,
      )
      .toEqual([]);
    const address = `${crew.feed.origin}/${fixture}/api/crew`;
    const said = [
      ...stringsOf(body),
      ...Object.entries(headers).map(
        ([name, value]) => [`header ${name}`, value] as [string, string],
      ),
    ];
    expect
      .soft(
        said
          .filter(
            ([, value]) =>
              value.includes(address) || value.includes(`/${fixture}/api/crew`),
          )
          .map(([path]) => path),
        `strings naming the feed's address (${address}) on ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        stringsOf(body)
          .filter(([, value]) =>
            /[a-z][a-z\d+.-]*:\/\/|^\/\/|^(?:javascript|data|mailto):|\bwww\./i.test(
              value,
            ),
          )
          .map(([path]) => path)
          .filter(
            (path) => !["answer.run.url", "answer.run.pr.url"].includes(path),
          ),
        `URLs in the body other than run.url and run.pr.url, ${where}`,
      )
      .toEqual([]);
    expect
      .soft(Buffer.byteLength(text), `/api/crew's bytes on ${where}`)
      .toBeLessThanOrEqual(8_192);
  }

  const down = await request.get("/api/crew");
  const downHeaders = down.headers();
  expect
    .soft(
      [
        down.status(),
        (downHeaders["content-type"] ?? "").split(";")[0]?.trim(),
        downHeaders["cache-control"],
        await down.text(),
      ],
      "/api/crew on the default server",
    )
    .toEqual([
      200,
      "application/json",
      CACHE,
      '{"version":1,"state":"down","run":null}',
    ]);
  const post = await request.post("/api/crew", { data: {} });
  expect.soft(post.status(), "POST /api/crew").toBe(405);
});

test("B4.26 it polls, and the panel follows: at 1440 one poll at hydration before the clock moves; live polls at 30 s, open, resting and down at 60 s; a run that ends turns resting after one 30 s poll; each fixture's told panel's text equals the kept site's server-rendered panel and holds the oracle's B4.3 to B4.5; quiet reads Between sessions; the default server's down turns live; no other origin", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const origin = crew.feed.origin;
  const answers = Object.fromEntries(
    KEPT.map((fixture) => {
      crew.feed.set(`answer-${fixture}`, { fixture });
      return [fixture, crew.feed.body(`answer-${fixture}`)];
    }),
  ) as Record<Fixture, Record<string, unknown>>;
  const answerOf = (fixture: Fixture) => toAnswer(answers[fixture], origin);
  const own = new URL(test.info().project.use.baseURL ?? "").origin;
  const others = new Set<string>();
  const noteOrigins = (seen: Set<string>) => {
    for (const o of seen) if (o.startsWith("http") && o !== own) others.add(o);
  };

  // From the default server's down first paint, each fixture told by the hydration poll.
  const sites = await Promise.all(KEPT.map((f) => keptSite(crew, f)));
  for (const [i, fixture] of KEPT.entries()) {
    const site = sites[i];
    if (!site) continue;
    expect(
      site.seen,
      `the kept ${fixture} site's /crew within ${STATE_WAIT} ms (the last state seen)`,
    ).toBe(fixture);
    const server = await serverText(browser, `${site.base}/crew`);
    const context = await freshContext(browser);
    const p = await context.newPage();
    const live = await livePage(p, "/crew", { json: answerOf(fixture) });
    ready(live, `the default server, told ${fixture}`);
    expect
      .soft(
        live.polls(),
        `polls at hydration, told ${fixture}, before the clock moves`,
      )
      .toBe(1);
    expect
      .soft(
        await panelText(p),
        `the panel's text told ${fixture}, against the kept ${fixture} site's server-rendered panel`,
      )
      .toBe(server);
    const panel = await panelAgainst(p, answers[fixture], origin);
    expect
      .soft(panel.found, `the panel told ${fixture}, against the oracle`)
      .toEqual(panel.expected);
    if (fixture === "open") {
      live.answer({
        json: toAnswer(
          {
            ...answers.open,
            current: {
              ...(answers.open.current as object),
              health: {
                state: "quiet",
                label: "Quiet",
                line: "Nothing new for 12 min.",
                quote: false,
              },
            },
          },
          origin,
        ),
      });
      await live.tick(60_000);
      expect
        .soft(
          (await readPanel(p)).status,
          "the status on the open fixture switched to quiet",
        )
        .toBe("Between sessions");
    }
    noteOrigins(live.origins);
    await context.close();
  }

  // The schedule, on one page: live, a run that ends, then at rest.
  const live = await livePage(page, "/crew", { json: answerOf("live") });
  ready(live, "the default server");
  expect
    .soft(
      [live.polls(), await live.state()],
      "polls at hydration and the panel after it, from the default server's down to a live answer",
    )
    .toEqual([1, "live"]);
  expect
    .soft(
      [await live.tick(29_000), await live.tick(1_000)],
      "polls in the 29 s after a live answer, then in the 30th",
    )
    .toEqual([0, 1]);
  live.answer({ json: answerOf("resting") });
  expect
    .soft(
      [await live.tick(29_000), await live.tick(1_000), await live.state()],
      "a run that ends: polls at 29 s and 30 s, then the panel",
    )
    .toEqual([0, 1, "resting"]);
  live.answer({ json: answerOf("open") });
  expect
    .soft(
      [await live.tick(59_000), await live.tick(1_000), await live.state()],
      "polls in the 59 s after a resting answer, then in the 60th, and the panel",
    )
    .toEqual([0, 1, "open"]);
  live.answer({ json: DOWN });
  expect
    .soft(
      [await live.tick(59_000), await live.tick(1_000), await live.state()],
      "polls in the 59 s after an open answer, then in the 60th (a down answer), and the panel kept",
    )
    .toEqual([0, 1, "open"]);
  expect
    .soft(
      [await live.tick(59_000), await live.tick(1_000)],
      "polls in the 59 s after a down answer kept the open panel, then in the 60th",
    )
    .toEqual([0, 1]);
  noteOrigins(live.origins);

  const context = await freshContext(browser);
  const p = await context.newPage();
  const downPage = await livePage(p, "/crew", { json: DOWN });
  ready(downPage, "the default server, told down");
  expect
    .soft(
      [
        downPage.polls(),
        await downPage.state(),
        await downPage.tick(59_000),
        await downPage.tick(1_000),
      ],
      "from down, a down answer: polls at hydration, the panel, then at 59 s and 60 s",
    )
    .toEqual([1, "down", 0, 1]);
  noteOrigins(downPage.origins);
  await context.close();

  expect
    .soft([...others], `origins requested other than the page's own (${own})`)
    .toEqual([]);
});

test("B4.27 hidden and paused, nothing polls: hidden 10 minutes no poll, shown one at once; paused 10 minutes no poll, an answer held in flight then resting leaves the live panel; unpaused one at once then 30 s; a reload starts unpressed", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const live = await livePage(page, "/crew", { json: LIVE });
  ready(live, "the default server");
  expect.soft(live.polls(), "polls at hydration").toBe(1);

  await live.visibility("hidden");
  const hidden = await live.tick(600_000);
  await live.visibility("visible");
  const shown = await live.settle();
  const schedule = [await live.tick(29_000), await live.tick(1_000)];
  expect
    .soft(
      { hidden, shown, schedule },
      "polls hidden 10 minutes, when shown again (no clock), then at 29 s and 30 s",
    )
    .toEqual({ hidden: 0, shown: 1, schedule: [0, 1] });

  const pressed = await live.press();
  const paused = await live.tick(600_000);
  expect
    .soft(
      { pressed, paused },
      "aria-pressed after Pause, and polls in 10 minutes paused",
    )
    .toEqual({ pressed: "true", paused: 0 });
  const unpressed = await live.press();
  const atOnce = await live.settle();
  const after = [await live.tick(29_000), await live.tick(1_000)];
  expect
    .soft(
      { unpressed, atOnce, after },
      "aria-pressed after pressing again, its poll (no clock), then at 29 s and 30 s",
    )
    .toEqual({ unpressed: "false", atOnce: 1, after: [0, 1] });

  const before = await live.text();
  live.answer({ hold: true });
  const inFlight = await live.tick(30_000);
  const pressedInFlight = await live.press();
  await live.release({ json: RESTING });
  expect
    .soft(
      {
        inFlight,
        pressed: pressedInFlight,
        state: await live.state(),
        unchanged: (await live.text()) === before,
      },
      "a poll held in flight, Pause pressed, then answered resting",
    )
    .toEqual({ inFlight: 1, pressed: "true", state: "live", unchanged: true });

  live.answer({ json: LIVE });
  await page.reload();
  const reloaded = await page
    .locator("button[data-pause][data-ready]")
    .getAttribute("aria-pressed", { timeout: 5_000 })
    .catch(() => "(not ready)");
  expect.soft(reloaded, "aria-pressed after a reload").toBe("false");
});

test("B4.28 a failed poll keeps the panel: a 503, an abort, not JSON, version 2, live with run null and a 200 down each leave the live panel's text and the 30 s schedule; failing on, it turns to B4.2's down panel at the first poll past 10 minutes and not before, and a told answer brings it back; a javascript: or http: run URL isn't linked; the markup moment is text", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const live = await livePage(page, "/crew", { json: LIVE });
  ready(live, "the default server");
  const before = await live.text();
  expect
    .soft(
      [live.polls(), await live.state()],
      "polls at hydration and the panel",
    )
    .toEqual([1, "live"]);
  const panel = await readPanel(page);
  expect
    .soft(
      [
        panel.moments.filter((m) => m.text === "<b>bold</b> &amp; more").length,
        panel.bold,
      ],
      "the feed's markup moment as text, and b elements in the panel",
    )
    .toEqual([1, 0]);

  const failures: [string, Parameters<typeof live.answer>[0]][] = [
    ["a 503", { status: 503 }],
    ["an aborted request", { abort: true }],
    ["a body that isn't JSON", { raw: "<!doctype html><p>Not JSON" }],
    ["version 2", { json: { ...LIVE, version: 2 } }],
    [
      'state "live" with run null',
      { json: { version: 1, state: "live", run: null } },
    ],
    ["a 200 down answer", { json: DOWN }],
  ];
  const kept: { what: string; polls: number[]; unchanged: boolean }[] = [];
  for (const [i, [what, reply]] of failures.entries()) {
    live.answer(reply);
    // The first failure comes at the live schedule's 30 s; each after it proves the one before
    // kept that schedule.
    const polls =
      i === 0
        ? [await live.tick(30_000)]
        : [await live.tick(29_000), await live.tick(1_000)];
    kept.push({ what, polls, unchanged: (await live.text()) === before });
  }
  live.answer({ status: 503 });
  const next = [await live.tick(29_000), await live.tick(1_000)];
  expect
    .soft(
      { kept, next },
      "each failure's polls (29 s, 30 s) and whether the panel's text is unchanged, then the poll after the last",
    )
    .toEqual({
      kept: failures.map(([what], i) => ({
        what,
        polls: i === 0 ? [1] : [0, 1],
        unchanged: true,
      })),
      next: [0, 1],
    });

  // Failing on: polls 8 to 21 come every 30 s; poll 20 is 600,000 ms after the told answer, kept;
  // poll 21 is past it.
  const states: string[] = [];
  for (let poll = 8; poll <= 21; poll++) {
    await live.tick(30_000);
    states.push(`${poll}: ${await live.state()}`);
  }
  expect
    .soft(
      states,
      "the panel after each failed poll, 30 s apart, numbered from the told answer at 0 ms",
    )
    .toEqual(
      Array.from(
        { length: 14 },
        (_, i) => `${i + 8}: ${i + 8 <= 20 ? "live" : "down"}`,
      ),
    );
  const down = await panelAgainst(page, null, null);
  expect
    .soft(down.found, "the panel past 10 minutes, against B4.2's down panel")
    .toEqual(down.expected);
  live.answer({ json: LIVE });
  expect
    .soft(
      [await live.tick(60_000), await live.state()],
      "a told answer after down: its poll at 60 s and the panel",
    )
    .toEqual([1, "live"]);

  // The run's link: the fixture's own is shown, a javascript: or an http: one isn't.
  const context = await freshContext(browser);
  const p = await context.newPage();
  const studioLinks = () =>
    p.evaluate(
      () =>
        [...document.querySelectorAll("[data-evidence] a")]
          .filter((a) => /This run on the Studio/.test(a.textContent ?? ""))
          .map((a) => a.getAttribute("href")).length,
    );
  const linked = await livePage(p, "/crew", { json: LIVE });
  ready(linked, "the default server");
  const shownLinks = [await studioLinks()];
  for (const url of [
    "javascript:alert(1)",
    "http://theseus-studio.vercel.app/studio/runs/run-31",
  ]) {
    linked.answer({
      json: { ...LIVE, run: { ...(LIVE.run as object), url } },
    });
    await linked.tick(30_000);
    shownLinks.push(await studioLinks());
  }
  await context.close();
  expect
    .soft(
      shownLinks,
      "This run on the Studio links for the fixture's https URL, then javascript:alert(1), then an http: run page",
    )
    .toEqual([1, 0, 0]);
});

test("B4.42 a poll that never settles is aborted (Lens on #90): held unanswered, it is aborted 30,000 ms after it starts on the clock and counts as failed, the next poll 30 s later while live; with every poll held after the told answer, the live panel turns into B4.2's down panel at the first abort more than 10 minutes after it, and not before", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  // Sprint 36 (.crew/sprint/36/contract.md, B4.42): extends B4.28, which it loosens nowhere.
  const aborted = (p: Page) => {
    const failed: string[] = [];
    p.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname === "/api/crew")
        failed.push(request.failure()?.errorText ?? "failed");
    });
    return failed;
  };
  const failed = aborted(page);
  const live = await livePage(page, "/crew", { json: LIVE });
  ready(live, "the default server");
  live.answer({ hold: true });
  const held = await live.tick(30_000);
  const early = await live.tick(29_999);
  const failedEarly = failed.length;
  await live.tick(1);
  // In Node's time: the page's timers are on the paused clock.
  await new Promise((done) => setTimeout(done, 300));
  const failedAt30 = failed.length;
  live.answer({ json: LIVE });
  const next = [await live.tick(29_000), await live.tick(1_000)];
  expect
    .soft(
      { held, early, failedEarly, failedAt30, next, state: await live.state() },
      "the held poll at 30 s, polls and aborted requests 29,999 ms into it, aborted requests at 30,000 ms, the polls 29 s and 30 s after the abort, and the panel",
    )
    .toEqual({
      held: 1,
      early: 0,
      failedEarly: 0,
      failedAt30: 1,
      next: [0, 1],
      state: "live",
    });

  // Every poll held from the told answer on: a poll at 30 s, aborted at 60 s, the next at 90 s,
  // aborted at 120 s, and so on; abort k is 60·k s after the answer, the 10th exactly 10 minutes.
  const context = await freshContext(browser);
  const p = await context.newPage();
  const failedHeld = aborted(p);
  const holding = await livePage(p, "/crew", { json: LIVE });
  ready(holding, "the default server");
  holding.answer({ hold: true });
  const cycles: string[] = [];
  for (let k = 1; k <= 11; k++) {
    const polls = await holding.tick(30_000);
    await holding.tick(30_000);
    await new Promise((done) => setTimeout(done, 200));
    cycles.push(`${k}: ${polls} ${failedHeld.length} ${await holding.state()}`);
  }
  expect
    .soft(
      cycles,
      "each cycle k: polls in its first 30 s, aborted requests so far, and the panel after abort k (60·k s after the told answer)",
    )
    .toEqual(
      Array.from(
        { length: 11 },
        (_, i) => `${i + 1}: 1 ${i + 1} ${i + 1 <= 10 ? "live" : "down"}`,
      ),
    );
  const down = await panelAgainst(p, null, null);
  expect
    .soft(
      down.found,
      "the panel after the 11th abort, against B4.2's down panel",
    )
    .toEqual(down.expected);
  await context.close();
});

test("B4.29 who started or stopped working: one [aria-live] in main, [data-announce], polite, atomic, sr-only, the panel's last child, empty in the HTML and after hydration; the contract's swap reads Lens started working. Probe stopped working.; moments, the now line, a line or Waiting to Done change nothing; live to resting and back by the oracle; down and a paused answer change nothing; [data-now] and [data-status] aren't live", async ({
  page,
  request,
}) => {
  test.setTimeout(150_000);
  const html = await (await request.get("/crew")).text();
  const tag = [
    ...html.matchAll(/<(\w+)\b([^>]*\bdata-announce\b[^>]*)>([\s\S]*?)<\/\1>/g),
  ];
  expect
    .soft(
      tag.map((m) => m[3]),
      "[data-announce]'s content in the server's HTML",
    )
    .toEqual([""]);

  const live = await livePage(page, "/crew", { json: LIVE });
  ready(live, "the default server");
  const regions = await page.evaluate((section) => {
    const probe = document.createElement("span");
    probe.className = "sr-only";
    document.body.append(probe);
    const box = (el: Element) => {
      const s = getComputedStyle(el);
      return [
        s.position,
        s.width,
        s.height,
        s.overflow,
        s.clip,
        s.clipPath,
        s.whiteSpace,
      ].join(" ");
    };
    const srOnly = box(probe);
    probe.remove();
    const panel = document.querySelector(section);
    return [...document.querySelectorAll("main [aria-live]")].map((el) => ({
      announce: el.hasAttribute("data-announce"),
      live: el.getAttribute("aria-live"),
      atomic: el.getAttribute("aria-atomic"),
      text: el.textContent,
      lastChild: el === panel?.lastElementChild,
      srOnly: box(el) === srOnly,
      shown: getComputedStyle(el).display !== "none",
    }));
  }, SECTION);
  expect
    .soft(regions, "the [aria-live] elements in main after hydration")
    .toEqual([
      {
        announce: true,
        live: "polite",
        atomic: "true",
        text: "",
        lastChild: true,
        srOnly: true,
        shown: true,
      },
    ]);
  expect
    .soft(
      await page.evaluate(() =>
        ["[data-now]", "[data-status]"].map((s) => {
          const el = document.querySelector(s);
          return el ? el.getAttribute("aria-live") : "(missing)";
        }),
      ),
      "aria-live on [data-now] and [data-status]",
    )
    .toEqual([null, null]);

  const said = () =>
    page.evaluate(
      () => document.querySelector("[data-announce]")?.textContent ?? null,
    );
  const swap = {
    "code-reviewer": { state: "working" },
    "qa-engineer": { state: "waiting" },
  };
  const steps: [string, CrewAnswer, number][] = [
    [
      "Lens to working, Probe to waiting",
      told("live", { current: { roles: rolesWith(swap) } }),
      30_000,
    ],
    [
      "a new moment",
      told("live", {
        current: {
          roles: rolesWith(swap),
          moments: [moment(5, "Probe wrote B4.29"), ...liveMoments()],
        },
      }),
      30_000,
    ],
    [
      "a new now line",
      told("live", {
        current: {
          roles: rolesWith(swap),
          moments: [moment(5, "Probe wrote B4.29"), ...liveMoments()],
          now: "Reading the announcements.",
        },
      }),
      30_000,
    ],
    [
      "a role's new line",
      told("live", {
        current: {
          roles: rolesWith({
            ...swap,
            engineer: { line: "Building the poller" },
          }),
          moments: [moment(5, "Probe wrote B4.29"), ...liveMoments()],
          now: "Reading the announcements.",
        },
      }),
      30_000,
    ],
    [
      "Probe from Waiting to Done",
      told("live", {
        current: {
          roles: rolesWith({
            ...swap,
            "qa-engineer": { state: "done" },
            engineer: { line: "Building the poller" },
          }),
          moments: [moment(5, "Probe wrote B4.29"), ...liveMoments()],
          now: "Reading the announcements.",
        },
      }),
      30_000,
    ],
    ["live to resting", RESTING, 30_000],
    ["resting to live", LIVE, 60_000],
  ];
  let shown: CrewAnswer = LIVE;
  let expectedText = "";
  const heard: { what: string; text: string | null }[] = [];
  const meant: { what: string; text: string | null }[] = [];
  for (const [what, answer, ms] of steps) {
    live.answer({ json: answer });
    await live.tick(ms);
    expectedText = announcement(shown, answer) ?? expectedText;
    shown = answer;
    heard.push({ what, text: await said() });
    meant.push({ what, text: expectedText });
  }
  expect
    .soft(
      meant[0]?.text,
      "the oracle on the contract's swap, against the contract's words",
    )
    .toBe("Lens started working. Probe stopped working.");
  expect.soft(heard, "[data-announce]'s text after each poll").toEqual(meant);

  // Live to down past 10 minutes: 21 down answers 30 s apart; then down to live.
  live.answer({ json: DOWN });
  const downStates: string[] = [];
  for (let poll = 1; poll <= 21; poll++) {
    await live.tick(30_000);
    downStates.push(`${await live.state()}`);
  }
  const atDown = await said();
  // Each answer below would read differently from the region's text if it were announced: back
  // from down with Lens working instead of Probe, then a held answer swapping them back.
  live.answer({ json: told("live", { current: { roles: rolesWith(swap) } }) });
  await live.tick(60_000);
  const backLive = [await live.state(), await said()];
  live.answer({ hold: true });
  await live.tick(30_000);
  await live.press();
  await live.release({ json: LIVE });
  const underPause = await said();
  expect
    .soft(
      {
        lastDown: downStates.at(-1),
        atDown,
        backLive,
        underPause,
      },
      "the panel at the 21st down answer and the region's text; then live again; then an answer held under Pause",
    )
    .toEqual({
      lastDown: "down",
      atDown: expectedText,
      backLive: ["live", expectedText],
      underPause: expectedText,
    });
});

test("B4.30 the first paint stays, and updates arrive in place: on the kept live site and the default server at 1440 and 390, /api/crew held, no mutation in .crew for 3 s after load but Pause's attributes, no layout shift in the panel, the same text scripts on and off, Pause hidden scripts off in the same row box; then the same answer makes no mutation, a new moment inserts one li keeping every node, focus stays, paused and failed polls change nothing, nothing animates", async ({
  page,
  browser,
  crew,
}) => {
  test.setTimeout(180_000);
  const site = await keptSite(crew, "live");
  expect(
    site.seen,
    `the kept live site's /crew within ${STATE_WAIT} ms (the last state seen)`,
  ).toBe("live");
  const rowBox = (p: Page) =>
    p.evaluate(() => {
      const row = document.querySelector("[data-status]")?.parentElement;
      if (!row) return null;
      const r = row.getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
  const panelText = (p: Page) =>
    p.evaluate(
      (s) => document.querySelector(s)?.textContent ?? "(no panel)",
      SECTION,
    );

  for (const [where, base] of [
    ["the kept live site", site.base],
    ["the default server", ""],
  ] as const) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      const at = `${where} at ${width}`;
      const on = await freshContext(browser, { viewport: { width, height } });
      const p = await on.newPage();
      await p.addInitScript(recordMutations);
      await p.addInitScript(() => {
        const win = window as Window & { __shifts?: string[] };
        win.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const sources =
              (
                entry as PerformanceEntry & {
                  sources?: { node: Node | null }[];
                }
              ).sources ?? [];
            for (const source of sources) {
              const el =
                source.node instanceof Element
                  ? source.node
                  : (source.node?.parentElement ?? null);
              if (el?.closest(".crew"))
                win.__shifts?.push(
                  `<${el.tagName.toLowerCase()}> ${(entry as PerformanceEntry & { value: number }).value}`,
                );
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      // Held: never answered, so nothing but hydration can change the panel.
      await p.route("**/api/crew", () => undefined);
      const response = await p.goto(`${base}/crew`);
      expect(response?.status(), `status of /crew on ${at}`).toBe(200);
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(() => new Promise((done) => setTimeout(done, 3_000)));
      const mutations = await takeMutations(p);
      const shifts = await p.evaluate(
        () => (window as Window & { __shifts?: string[] }).__shifts ?? [],
      );
      const textOn = await panelText(p);
      const boxOn = await rowBox(p);
      await on.close();

      const off = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width, height },
        baseURL: test.info().project.use.baseURL,
      });
      const q = await off.newPage();
      await q.goto(`${base}/crew`);
      const textOff = await panelText(q);
      const boxOff = await rowBox(q);
      const button = await q.evaluate(() => {
        const b =
          document.querySelector<HTMLButtonElement>("button[data-pause]");
        if (!b) return null;
        b.focus();
        const s = getComputedStyle(b);
        return {
          visible: s.visibility === "visible" && b.getClientRects().length > 0,
          focusable: document.activeElement === b,
        };
      });
      const inTree = await q
        .getByRole("button", { name: "Pause updates" })
        .count();
      await off.close();

      expect
        .soft(
          mutations.panel,
          `mutations in .crew in the 3 s after load (but Pause's attributes), ${at}`,
        )
        .toEqual([]);
      expect
        .soft(shifts, `layout shifts with a source in the panel, ${at}`)
        .toEqual([]);
      expect
        .soft(textOn, `the panel's text scripts on, against scripts off, ${at}`)
        .toBe(textOff);
      expect
        .soft(
          { button, inTree },
          `button[data-pause] with scripts off, ${at}: in the HTML, not visible, not focusable, not in the accessibility tree`,
        )
        .toEqual({ button: { visible: false, focusable: false }, inTree: 0 });
      expect
        .soft(
          boxOn !== null &&
            boxOff !== null &&
            boxOn.every(
              (v, i) => Math.abs(v - (boxOff[i] ?? Number.NaN)) <= 0.5,
            ),
          `the status row's box scripts on ${JSON.stringify(boxOn)} and off ${JSON.stringify(boxOff)}, ${at}`,
        )
        .toBe(true);
    }
  }

  // Scripts on, at 1440: the same answer, a new moment, focus, paused, failed, still.
  const own = toAnswer(crew.feed.body("live"), crew.feed.origin);
  const ownMoments = (
    crew.feed.body("live").current as {
      moments: unknown[];
    }
  ).moments;
  const ownRoles = (crew.feed.body("live").current as { roles: Role[] }).roles;
  const ownWith = (moments: unknown[], roles: Role[] = ownRoles) =>
    toAnswer(
      {
        ...crew.feed.body("live"),
        current: {
          ...(crew.feed.body("live").current as object),
          moments: [...moments, ...ownMoments],
          roles,
        },
      },
      crew.feed.origin,
    );
  await page.addInitScript(recordMutations);
  const live = await livePage(page, `${site.base}/crew`, { json: own });
  ready(live, "the kept live site");
  const moved: string[] = [];
  const same = await takeMutations(page);
  moved.push(...same.moved);

  const def = await freshContext(browser);
  const d = await def.newPage();
  await d.addInitScript(recordMutations);
  const downLive = await livePage(d, "/crew", { json: DOWN });
  ready(downLive, "the default server");
  const sameDown = await takeMutations(d);
  await def.close();
  expect
    .soft(
      {
        kept: same.panel,
        down: sameDown.panel,
        polls: [live.polls(), downLive.polls()],
      },
      "mutations in .crew after the first poll answers the page's own state, on the kept live site and the default server",
    )
    .toEqual({ kept: [], down: [], polls: [1, 1] });

  // A new moment, then another: one li at the top each time, every shown moment's node kept.
  const nodes = () =>
    page.evaluate(() => {
      const win = window as Window & { __lis?: Element[] };
      const lis = [...document.querySelectorAll("ol[data-moments] > li")];
      const before = win.__lis ?? [];
      win.__lis = lis;
      return lis.map((li) => before.indexOf(li));
    });
  await nodes();
  const shownBefore = own.run?.moments.length ?? 0;
  const one = [moment(2, "Probe tagged the moments")];
  live.answer({ json: ownWith(one) });
  await live.tick(30_000);
  const first = await nodes();
  moved.push(...(await takeMutations(page)).moved);
  const two = [moment(3, "Probe tagged them again"), ...one];
  live.answer({ json: ownWith(two) });
  await live.tick(30_000);
  const second = await nodes();
  moved.push(...(await takeMutations(page)).moved);
  const kept = (count: number, total: number) =>
    [-1, ...Array.from({ length: count }, (_, i) => i)].slice(0, total);
  expect
    .soft(
      { first, second },
      `each moment li's index before the poll (-1: new), after one moment is added to the ${shownBefore} shown, then another`,
    )
    .toEqual({
      first: kept(shownBefore, Math.min(shownBefore + 1, 10)),
      second: kept(Math.min(shownBefore + 1, 10), 10),
    });

  // Focus: on Pause, then on an Evidence link, through an update that changes a role and adds a
  // moment.
  const focusStays: Record<string, boolean | string> = {};
  for (const [name, selector, extra, roles] of [
    [
      "button[data-pause]",
      "button[data-pause]",
      [moment(4, "Probe moved focus"), ...two],
      ownRoles.map((r) =>
        r.role === "qa-engineer" ? { ...r, state: "waiting" } : r,
      ),
    ],
    [
      "an Evidence link",
      "[data-evidence] a",
      [
        moment(6, "Probe moved focus again"),
        moment(4, "Probe moved focus"),
        ...two,
      ],
      ownRoles,
    ],
  ] as const) {
    const focused = await page.evaluate((s) => {
      const el = document.querySelector<HTMLElement>(s);
      el?.focus();
      (window as Window & { __focused?: Element | null }).__focused =
        document.activeElement;
      return el !== null && document.activeElement === el;
    }, selector);
    live.answer({ json: ownWith([...extra], [...roles]) });
    await live.tick(30_000);
    focusStays[name] = focused
      ? await page.evaluate(
          () =>
            document.activeElement ===
              (window as Window & { __focused?: Element | null }).__focused &&
            document.activeElement !== document.body,
        )
      : "(couldn't focus it)";
    moved.push(...(await takeMutations(page)).moved);
  }
  expect
    .soft(focusStays, "focus on the same node after an update")
    .toEqual({ "button[data-pause]": true, "an Evidence link": true });

  // Paused: 10 minutes, nothing but the button's aria-pressed.
  await live.press();
  await takeMutations(page);
  await live.tick(600_000);
  const paused = await takeMutations(page);
  await live.press();
  await live.settle();
  moved.push(...paused.moved, ...(await takeMutations(page)).moved);

  // Failed: a 503 changes nothing and says nothing.
  const textBefore = await live.text();
  const bodyBefore = await page.evaluate(() => document.body.innerText);
  live.answer({ status: 503 });
  await live.tick(30_000);
  const failed = await takeMutations(page);
  moved.push(...failed.moved);
  expect
    .soft(
      {
        paused: paused.panel,
        failed: failed.panel,
        textKept: (await live.text()) === textBefore,
        bodyKept:
          (await page.evaluate(() => document.body.innerText)) === bodyBefore,
      },
      "mutations in .crew over 10 minutes paused and after a failed poll, and the page's words after it",
    )
    .toEqual({ paused: [], failed: [], textKept: true, bodyKept: true });
  expect
    .soft(moved, "transitions and animations started in .crew by any update")
    .toEqual([]);
});

/** Pause's box, its row and its neighbours, at the current size. */
function pauseGeometry(page: Page) {
  return page.evaluate(() => {
    const button = document.querySelector("button[data-pause]");
    const status = document.querySelector("[data-status]");
    const table = document.querySelector(
      'section[aria-labelledby="crew"] table',
    );
    const close = document.querySelector("a[data-close]");
    if (!button || !status || !table || !close) return null;
    const after = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const r = button.getBoundingClientRect();
    return {
      order: after(status, button) && after(button, table),
      row:
        button.parentElement === status.parentElement &&
        button.parentElement?.tagName === "DIV",
      right: r.right,
      closeRight: close.getBoundingClientRect().right,
      top: r.top + scrollY,
      atRowTop:
        Math.abs(
          r.top -
            (button.parentElement?.getBoundingClientRect().top ?? Number.NaN),
        ) <= 0.5,
      height: r.height,
      width: r.width,
      inside:
        r.left >= 0 &&
        r.right <= document.documentElement.clientWidth &&
        r.width > 0,
    };
  });
}

/** Whether any painted property of Pause (and its pseudo-elements) resolves to `accent`. */
function pauseInAccent(page: Page, accent: number[]) {
  return page.evaluate((target) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    const button = document.querySelector("button[data-pause]");
    if (!rgba || !button) return ["(no __rgba or no button)"];
    const same = (value: string) => {
      const c = rgba(value);
      return Boolean(
        c?.every(
          (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
        ),
      );
    };
    const hits: string[] = [];
    for (const el of [button, ...button.querySelectorAll("*")]) {
      for (const pseudo of [null, "::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && ["none", "normal"].includes(s.content)) continue;
        for (const [property, value] of [
          ["color", s.color],
          ["background-color", s.backgroundColor],
          ["border-top-color", s.borderTopColor],
          ["border-right-color", s.borderRightColor],
          ["border-bottom-color", s.borderBottomColor],
          ["border-left-color", s.borderLeftColor],
          ["outline-color", s.outlineStyle === "none" ? "" : s.outlineColor],
          ["text-decoration-color", s.textDecorationColor],
        ] as const) {
          if (value && same(value))
            hits.push(
              `<${el.tagName.toLowerCase()}>${pseudo ?? ""} ${property}`,
            );
        }
      }
    }
    return hits;
  }, accent);
}

/** The script files a fresh visit requests, with their decoded bytes (B2.10's method). */
async function scripts(browser: Browser, url: string) {
  const context = await freshContext(browser);
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

test("B4.31 Pause, and the budget: in the four states, both schemes, at 1440 and 390 Pause follows the status and precedes the table, named Pause updates pressed and not; its right edge on Close's at 1440, 1024 and 390, its top the row's and still from live to resting (the chip unchanged); 32 px tall from 1024, 44 below, 24 wide, inside the viewport, no overflow at 320; Space and Enter toggle it; one 2 px ink ring; pressed ink with film text, Highlight in forced colours; never --accent; /crew's script the 404's and at most 20,480 B more (sprint 37), WebGL refused; / polls nothing in 5 minutes", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240_000);
  const named = async (page: Page, pressed: boolean) =>
    page
      .getByRole("button", { name: "Pause updates", exact: true, pressed })
      .count();
  for (const scheme of SCHEMES) {
    const context = await freshContext(browser, { colorScheme: scheme });
    const page = await context.newPage();
    await page.addInitScript(installRgba);
    const live = await livePage(page, "/crew", { json: DOWN });
    ready(live, `the default server, ${scheme}`);
    const states: [string, CrewAnswer, number][] = [
      ["down", DOWN, 0],
      ["live", LIVE, 60_000],
      ["open", OPEN, 30_000],
      // The live run ended: the resting answer keeps its sprint and goal, as a run that ends while
      // a visitor watches does, so the chip keeps its lines and only the status changes (Atlas,
      // on Forge's finding: the fixtures are two runs with goals of different lengths).
      [
        "resting",
        told("resting", {
          last: {
            sprint: (feedOf("live").current as { sprint: number }).sprint,
            goal: (feedOf("live").current as { goal: string }).goal,
          },
        }),
        60_000,
      ],
    ];
    const found: Record<string, unknown>[] = [];
    const wanted: Record<string, unknown>[] = [];
    const tops: Record<string, number[]> = {};
    for (const [state, answer, ms] of states) {
      live.answer({ json: answer });
      if (ms > 0) await live.tick(ms);
      const shown = await live.state();
      for (const width of [1440, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const at = `${state}, ${scheme}, ${width}`;
        const g = await pauseGeometry(page);
        const names =
          width === 1440 || width === 390
            ? {
                unpressed: await named(page, false),
                pressed: [await live.press(), await named(page, true)],
                again: [await live.press(), await named(page, false)],
              }
            : null;
        if (width === 1440 || width === 390) await live.settle();
        if (state === "live" || state === "resting")
          tops[width] = [...(tops[width] ?? []), g?.top ?? Number.NaN];
        found.push({
          at,
          shown,
          order: g?.order,
          row: g?.row,
          atRowTop: g?.atRowTop,
          rightOnClose:
            width === 320 || !g
              ? null
              : Math.abs(g.right - g.closeRight) <= 0.5,
          height: g ? Math.round(g.height * 100) / 100 : null,
          wide: (g?.width ?? 0) >= 24,
          inside: g?.inside,
          overflow: width === 320 ? await horizontalOverflow(page) : 0,
          names,
        });
        wanted.push({
          at,
          shown: state,
          order: true,
          row: true,
          atRowTop: true,
          rightOnClose: width === 320 ? null : true,
          height: width >= 1024 ? 32 : 44,
          wide: true,
          inside: true,
          overflow: 0,
          names:
            width === 1440 || width === 390
              ? { unpressed: 1, pressed: ["true", 1], again: ["false", 1] }
              : null,
        });
        if (!g)
          testInfo.annotations.push({
            type: "pause",
            description: `${at}: no button[data-pause], [data-status], table or a[data-close]`,
          });
      }
    }
    expect
      .soft(
        found,
        `Pause in each state and size, ${scheme}: DOM order (status, button, table), the row, its top the row's, the right edge on Close's within 0.5 px, height, 24 px wide, inside the viewport, overflow at 320, named Pause updates unpressed, pressed and again`,
      )
      .toEqual(wanted);
    expect
      .soft(
        Object.entries(tops)
          .filter(
            ([, [a, b]]) =>
              a === undefined || b === undefined || Math.abs(a - b) > 0.5,
          )
          .map(([w, t]) => `${w}: ${t.join(" then ")}`),
        `Pause's top moving from live to resting, ${scheme}`,
      )
      .toEqual([]);

    // Pressed: ink with film text; never copper, at rest, hovered, focused or pressed.
    await page.setViewportSize({ width: 1440, height: 900 });
    const colors = await resolveColors(page);
    const accent = colors["--accent"]?.rgba ?? [];
    const copper: Record<string, string[]> = {};
    copper.rest = await pauseInAccent(page, accent);
    const box = await page.evaluate(() => {
      const r = document
        .querySelector("button[data-pause]")
        ?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    });
    if (box) await page.mouse.move(box.x, box.y);
    copper.hovered = await pauseInAccent(page, accent);
    await page.mouse.move(0, 0);
    await page.evaluate(() =>
      document.querySelector<HTMLElement>("a[data-close]")?.focus(),
    );
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el?.matches("button[data-pause]"))
        return `focus on <${el?.tagName.toLowerCase()}>`;
      const probe = document.createElement("span");
      probe.style.color = "var(--foreground)";
      document.body.append(probe);
      const ink = getComputedStyle(probe).color;
      probe.remove();
      const ringed = [el, ...el.querySelectorAll("*")].filter((c) => {
        const cs = getComputedStyle(c);
        return (
          cs.outlineStyle !== "none" && Number.parseFloat(cs.outlineWidth) > 0
        );
      });
      const s = getComputedStyle(el);
      const ring = `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`;
      return ringed.length === 1 && ring === `solid 2px ${ink} 2px`
        ? "one 2 px ink ring 2 px out"
        : `${ringed.length} rings: ${ring} (ink ${ink})`;
    });
    copper.focused = await pauseInAccent(page, accent);
    const pressedPaint = await page.evaluate(() => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const b = document.querySelector("button[data-pause]");
      if (!b || !rgba) return null;
      const s = getComputedStyle(b);
      return { bg: rgba(s.backgroundColor), ink: rgba(s.color) };
    });
    const keys: (string | null)[] = [];
    await page.keyboard.press("Space");
    keys.push(
      await page.locator("button[data-pause]").getAttribute("aria-pressed"),
    );
    const pressed = await page.evaluate(() => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const b = document.querySelector("button[data-pause]");
      if (!b || !rgba) return null;
      const s = getComputedStyle(b);
      return { bg: rgba(s.backgroundColor), ink: rgba(s.color) };
    });
    copper.pressed = await pauseInAccent(page, accent);
    live.mark();
    await page.keyboard.press("Enter");
    keys.push(
      await page.locator("button[data-pause]").getAttribute("aria-pressed"),
    );
    await live.settle();
    const close = (a: number[] | null | undefined, b: number[] | undefined) =>
      Boolean(
        a &&
          b &&
          a.every((v, i) => Math.abs(v - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02)),
      );
    expect
      .soft(
        {
          ring,
          keys,
          pressedBg: close(pressed?.bg, colors["--foreground"]?.rgba),
          pressedInk: close(pressed?.ink, colors["--background"]?.rgba),
          unpressedBgIsInk: close(
            pressedPaint?.bg,
            colors["--foreground"]?.rgba,
          ),
          copper,
        },
        `Pause focused by Tab from Close, Space then Enter, its pressed colours against --foreground and --background, and copper on it, ${scheme} (pressed ${JSON.stringify(pressed)})`,
      )
      .toEqual({
        ring: "one 2 px ink ring 2 px out",
        keys: ["true", "false"],
        pressedBg: true,
        pressedInk: true,
        unpressedBgIsInk: false,
        copper: { rest: [], hovered: [], focused: [], pressed: [] },
      });

    if (scheme === "light") {
      await page.emulateMedia({ forcedColors: "active" });
      await live.press();
      const forced = await page.evaluate(() => {
        const b = document.querySelector("button[data-pause]");
        const probe = document.createElement("span");
        probe.style.cssText =
          "forced-color-adjust: none; background-color: Highlight";
        document.body.append(probe);
        const highlight = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return b
          ? { bg: getComputedStyle(b).backgroundColor, highlight }
          : null;
      });
      await live.press();
      await live.settle();
      await page.emulateMedia({ forcedColors: "none" });
      expect
        .soft(
          forced ? forced.bg === forced.highlight : "(no button)",
          `Pause pressed in forced colours paints Highlight (${JSON.stringify(forced)})`,
        )
        .toBe(true);
    }
    await context.close();
  }

  // The script: the 404's files all in /crew's, and at most 20,480 B beyond its bytes, both read
  // with WebGL refused (freshContext): the poller's 16,384 B, since sprint 36 B2.10's model
  // loader's 2,048 B (.crew/sprint/36/contract.md, call 7), and since sprint 37 the replay's
  // measured 2,048 B (.crew/sprint/37/contract.md, call 8).
  const crew = await scripts(browser, "/crew");
  const missing = await scripts(browser, "/no-such-page");
  testInfo.annotations.push({
    type: "script-bytes",
    description: `/crew ${crew.bytes} B in ${crew.paths.length}; the 404 ${missing.bytes} B in ${missing.paths.length}`,
  });
  expect
    .soft(
      {
        status: [crew.status, missing.status],
        notInCrew: missing.paths.filter((p) => !crew.paths.includes(p)),
        beyond: crew.bytes - missing.bytes <= 20_480,
      },
      `/crew's script against the 404's: /crew ${crew.bytes} B, the 404 ${missing.bytes} B (${crew.bytes - missing.bytes} B beyond)`,
    )
    .toEqual({ status: [200, 404], notInCrew: [], beyond: true });

  // `/` on the clock for 5 minutes: no /api/crew.
  const context = await freshContext(browser);
  await context.addInitScript(refuseWebGl);
  const home = await context.newPage();
  let polls = 0;
  home.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/crew") polls += 1;
  });
  const now = Date.now();
  await home.clock.install({ time: now });
  const response = await home.goto("/");
  await home.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 10; i++) {
    await home.clock.runFor(30_000);
  }
  await new Promise((done) => setTimeout(done, 500));
  await context.close();
  expect
    .soft(
      [response?.status(), polls],
      "/'s status and its requests to /api/crew in 5 minutes on the clock",
    )
    .toEqual([200, 0]);
});
