import { type Browser, expect, type Page } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { profile } from "../content/profile";
import { caseStudies } from "../content/work";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
} from "./crew-feed";
import { replaySite } from "./crew-replay";
import { installRgba, SCHEMES } from "./helpers";
import { type Rgba, tokenRgba } from "./log";
import { MERGED, ORIGINAL, STEPS } from "./retros";
import { refuseWebGl } from "./webgl";
import { at, type FixtureName, reachHome } from "./window";

// Sprint 60, Hb (.crew/sprint/60/contract.md, H8 to H10): the door on `/`, written before the
// build. The legend keys "Original" only while an original plank is drawn (`planks - replaced >
// 0`), which today is never on `/` or `/read`; the room it leaves takes one link, "Rebuild it
// yourself", after the revision block's Log link, to the yard's first step; and `/`'s first screen
// doesn't move for it. H11, the named rewrites, are in place in their own specs.
//
// No fixture draws an original plank beside a legend (every state of `/` and `/read` has all 22
// replaced), so H8's other half is a unit read of the rule: PlankLegend rendered on the server
// with the count line's own props, `planks` and `replaced` (.crew/sprint/60/decisions.md, 2).
// The feed's states are B4.22's kept sites (live-layer.spec.ts's names) and the replay fixture's
// (crew-replay-home.spec.ts's), read with WebGL refused as the window checks read them.

test.describe.configure({ mode: "default" });
test.use({ timezoneId: "America/Los_Angeles" });
test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

const FIXTURES_NEED_BUILD =
  "PLAYWRIGHT_BASE_URL is set: the live, open, resting and replay states need this checkout's build served from copies pointed at the fixture server";
const DEPLOYED = Boolean(process.env.PLAYWRIGHT_BASE_URL);

const REVISIONS = 'section[aria-labelledby="revisions"]';
const DOOR_WORDS = "Rebuild it yourself";
const LOG_LINK = `${REVISIONS} a[href="/log"]`;
const SPEC = "home-door";
/** The yard's first step: the first merged sprint's record (components/log.tsx). */
const FIRST_STEP = `/log/${STEPS[0]}`;
const FIRST_STUDY = `/work/${caseStudies[0]?.slug}`;

type StateName = "default" | FixtureName | "replay";
type State = { name: StateName; base: string; keys: string[] };

/** The legend's added items in each state (.crew/sprint/34/contract.md, "The legend"). */
const KEYS: Record<StateName, string[]> = {
  default: [],
  live: ["pencil", "copper"],
  open: ["pencil"],
  resting: [],
  replay: [],
};

/** The replay fixture's site once `/` shows resting, once a worker (crew-replay-home.spec.ts). */
function replayHome(crew: Crew) {
  return crew.once(`${SPEC} replay`, async () => {
    const site = await replaySite(crew, "replay");
    const shown = await untilHome(site.base, "resting", STATE_WAIT);
    return { base: site.base, seen: shown.seen };
  });
}

if (!DEPLOYED) {
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of ["live", "open", "resting"] as const)
      void reachHome(crew, fixture, SPEC);
    void replayHome(crew);
  });
}

/** The states a check reads: the default server's alone under PLAYWRIGHT_BASE_URL, said so. */
function statesFor<T extends StateName>(wanted: readonly T[]): T[] {
  if (!DEPLOYED) return [...wanted];
  test.info().annotations.push({
    type: "unchecked",
    description: FIXTURES_NEED_BUILD,
  });
  return wanted.filter((name) => name === "default");
}

/** `state`'s site, asserted to show its state on `/`. */
async function stateOf(crew: Crew, name: StateName): Promise<State> {
  if (name === "default") return { name, base: "", keys: KEYS[name] };
  if (name === "replay") {
    const home = await replayHome(crew);
    expect(home.seen, `the state / shows on the replay site`).toBe("resting");
    return { name, base: home.base, keys: KEYS[name] };
  }
  const reached = await reachHome(crew, name, SPEC);
  expect(reached.home.seen, `the state / shows on the home-${name} site`).toBe(
    reached.want,
  );
  return { name, base: reached.base, keys: KEYS[name] };
}

async function openAt(
  page: Page,
  path: string,
  width: number,
  height: number,
  base = "",
) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}${path}`);
  expect(
    response?.status(),
    `status of ${base || "the default server"}${path}`,
  ).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** Waits out clock transitions (a hover's underline, a ring), then two frames. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    );
    for (let frame = 0; frame < 2; frame++)
      await new Promise((done) => requestAnimationFrame(done));
  });
}

// ---------------------------------------------------------------------------------------------
// H8 The legend keys only what's drawn

/** The legend beside the count line: its items, the count line's original number, the drawing. */
function legendRead(page: Page) {
  return page.evaluate(() => {
    const squash = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    // The list that holds "Seated by a sprint", outside any svg, and the count line beside it.
    const lists = [...document.querySelectorAll("ul")].filter(
      (ul) =>
        !ul.closest("svg") &&
        [...ul.querySelectorAll(":scope > li")].some(
          (li) => squash(li) === "Seated by a sprint",
        ),
    );
    const list = lists[0] ?? null;
    let count: string | null = null;
    for (
      let el: Element | null = list?.parentElement ?? null;
      el && count === null;
      el = el.parentElement
    ) {
      const line = [...el.querySelectorAll("p")].find((p) =>
        /^\d+ planks: \d+ replaced, \d+ original$/.test(squash(p)),
      );
      if (line) count = squash(line);
    }
    return {
      lists: lists.length,
      items: [...(list?.querySelectorAll(":scope > li") ?? [])].map((li) => ({
        text: squash(li),
        key: li.getAttribute("data-key"),
      })),
      // Read anywhere on the page: in any state, the words "Original" as a legend item.
      originalItems: [...document.querySelectorAll("li")].filter(
        (li) => !li.closest("svg") && squash(li) === "Original",
      ).length,
      count,
      drawnOriginal: document.querySelectorAll(".plank-original").length,
    };
  });
}

type LegendModule = {
  PlankLegend?: (props: Record<string, unknown>) => unknown;
};

test("H8 The legend keys only what's drawn: on / (default, live, open, resting) and /read, light and dark, no legend item reads Original while the count line reads 0 original and no .plank-original is drawn; Seated by a sprint first, live adding pencil and copper after it, open pencil only; and PlankLegend keys Original exactly when planks - replaced > 0", async ({
  page,
  crew,
}) => {
  test.setTimeout(240_000);
  // The rule itself, where no fixture draws an original plank: rendered on the server with the
  // count line's props (decisions.md, 2).
  const legend = (await import("../components/plank-key")) as LegendModule;
  expect(
    legend.PlankLegend,
    "PlankLegend in components/plank-key.tsx",
  ).toBeTruthy();
  const render = (props: Record<string, unknown>) => {
    const Legend = legend.PlankLegend as (p: Record<string, unknown>) => null;
    const html = renderToStaticMarkup(createElement(Legend, props));
    return [...html.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) =>
      (m[1] ?? "").replace(/<[^>]+>/g, "").trim(),
    );
  };
  for (const [planks, replaced, want] of [
    [22, 21, ["Seated by a sprint", "Original"]],
    [22, 0, ["Seated by a sprint", "Original"]],
    [22, 22, ["Seated by a sprint"]],
  ] as const) {
    expect
      .soft(
        render({ planks, replaced }),
        `PlankLegend's items at planks ${planks}, replaced ${replaced}`,
      )
      .toEqual(want);
  }
  expect
    .soft(
      render({ planks: 22, replaced: 21, pencil: true, copper: true }),
      "PlankLegend's items with an original plank, pencil and copper",
    )
    .toEqual(["Seated by a sprint", "Original", "In progress", "Drawing now"]);

  // Today: the oracle's count says 0 original, so neither page keys it.
  expect(ORIGINAL, "original planks by the retros (e2e/retros.ts)").toBe(0);
  const pages: { where: string; base: string; path: string; keys: string[] }[] =
    [{ where: "/read", base: "", path: "/read", keys: [] }];
  for (const name of statesFor([
    "default",
    "live",
    "open",
    "resting",
  ] as const)) {
    const state = await stateOf(crew, name);
    pages.push({
      where: `/ (${name})`,
      base: state.base,
      path: "/",
      keys: state.keys,
    });
  }
  for (const shown of pages) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openAt(page, shown.path, 1440, 900, shown.base);
      const where = `${shown.where}, ${scheme}`;
      const found = await legendRead(page);
      expect.soft(found.lists, `legends on ${where}`).toBe(1);
      expect
        .soft(found.count, `the count line beside the legend on ${where}`)
        .toBe(`22 planks: 22 replaced, ${ORIGINAL} original`);
      expect
        .soft(found.drawnOriginal, `.plank-original drawn on ${where}`)
        .toBe(0);
      expect
        .soft(found.originalItems, `legend items reading Original on ${where}`)
        .toBe(0);
      expect
        .soft(
          found.items.map((item) => item.key ?? item.text),
          `the legend's items on ${where}`,
        )
        .toEqual(["Seated by a sprint", ...shown.keys]);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
});

// ---------------------------------------------------------------------------------------------
// H9 The door

const H9_WINDOWS = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
] as const;

const LOOK = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "color",
  "textDecorationLine",
  "textDecorationStyle",
  "textDecorationThickness",
  "textDecorationColor",
  "textUnderlineOffset",
] as const;

/** The block's links, the door's and the Log link's boxes and looks, and any --accent in the door. */
function doorRead(page: Page, accent: Rgba) {
  return page.evaluate(
    ({ block, words, look, accent }) => {
      const squash = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const section = document.querySelector(block);
      const links = [...(section?.querySelectorAll("a") ?? [])];
      const doors = links.filter((a) => /rebuild/i.test(squash(a)));
      const door = doors[0] ?? null;
      const log = section?.querySelector('a[href="/log"]') ?? null;
      const box = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      };
      const lookOf = (el: Element | null) => {
        if (!el) return null;
        const s = getComputedStyle(el) as unknown as Record<string, string>;
        return Object.fromEntries(look.map((p) => [p, s[p]]));
      };
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const isAccent = (value: string) => {
        const c = rgba?.(value);
        return Boolean(
          c?.every(
            (v, i) => Math.abs(v - (accent?.[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
          ),
        );
      };
      // Every paint in the door, its children and their pseudo-elements, in --accent.
      const copper = door
        ? [door, ...door.querySelectorAll("*")].flatMap((el) =>
            ([null, "::before", "::after"] as const).flatMap((pseudo) => {
              const s = getComputedStyle(el, pseudo);
              if (pseudo && (s.content === "none" || s.content === "normal"))
                return [];
              const paints: [string, string][] = [
                ["color", s.color],
                ["text-decoration-color", s.textDecorationColor],
                ["background-color", s.backgroundColor],
                ["fill", s.fill],
                ["stroke", s.stroke],
                [
                  "outline-color",
                  s.outlineStyle === "none" ? "" : s.outlineColor,
                ],
                ...(["Top", "Right", "Bottom", "Left"] as const).map(
                  (side) =>
                    [
                      `border-${side.toLowerCase()}-color`,
                      Number.parseFloat(s[`border${side}Width`]) > 0
                        ? s[`border${side}Color`]
                        : "",
                    ] as [string, string],
                ),
              ];
              return paints
                .filter(([, value]) => value && isAccent(value))
                .map(
                  ([property]) =>
                    `${el.tagName.toLowerCase()}${pseudo ?? ""} ${property}`,
                );
            }),
          )
        : [];
      return {
        doors: doors.map((a) => ({
          text: squash(a),
          href: a.getAttribute("href"),
        })),
        exact: links.filter((a) => squash(a) === words).length,
        afterLog: Boolean(
          log &&
            door &&
            log.compareDocumentPosition(door) &
              Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        log: box(log),
        door: box(door),
        logLook: lookOf(log),
        doorLook: lookOf(door),
        copper,
      };
    },
    { block: REVISIONS, words: DOOR_WORDS, look: LOOK, accent },
  );
}

/** The focused element's href and its ring: its outline, and how many outlined elements it holds. */
function focusRead(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      href: el.getAttribute("href"),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      ring: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`,
      color: s.outlineColor,
      rings: [el, ...el.querySelectorAll("*")].filter((c) => {
        const cs = getComputedStyle(c);
        return (
          cs.outlineStyle !== "none" && Number.parseFloat(cs.outlineWidth) > 0
        );
      }).length,
    };
  });
}

/** The href `/log`'s own "Rebuild it yourself" goes to (components/log.tsx, data-step="start"). */
async function startOfLog(page: Page) {
  await openAt(page, "/log", 1440, 900);
  return page.evaluate(
    () =>
      document.querySelector('a[data-step="start"]')?.getAttribute("href") ??
      null,
  );
}

/** A CSS colour as the page paints it, [r, g, b, a] (installRgba). */
function rgbaOf(page: Page, color: string) {
  return page.evaluate(
    (c) =>
      (window as Window & { __rgba?: (c: string) => number[] | null }).__rgba?.(
        c,
      ) ?? null,
    color,
  );
}

const same = (a: Rgba, b: Rgba) =>
  Boolean(
    a &&
      b &&
      a.every((v, i) => Math.abs(v - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02)),
  );

/** The door at the window as it stands: its place, its look, its size, its hover. */
async function doorShown(
  page: Page,
  where: string,
  start: string | null,
  accent: Rgba,
) {
  const found = await doorRead(page, accent);
  expect
    .soft(
      found.doors,
      `links in the revision block reading "rebuild" on ${where}`,
    )
    .toEqual([{ text: DOOR_WORDS, href: start }]);
  expect
    .soft(found.exact, `links reading exactly "${DOOR_WORDS}" on ${where}`)
    .toBe(1);
  if (!found.door || !found.log) return false;
  expect
    .soft(found.afterLog, `the door after the Log link in the DOM on ${where}`)
    .toBe(true);
  const sameLine =
    Math.abs(found.door.top - found.log.top) <= 1 &&
    found.door.left >= found.log.right;
  const nextLine =
    found.door.top >= found.log.bottom - 1 &&
    found.door.top <= found.log.bottom + 12;
  expect
    .soft(
      sameLine || nextLine,
      `the door on the Log link's line or the next on ${where}: Log ${JSON.stringify(found.log)}, door ${JSON.stringify(found.door)}`,
    )
    .toBe(true);
  expect
    .soft(found.doorLook, `the door's look against the Log link's on ${where}`)
    .toEqual(found.logLook);
  expect
    .soft(
      found.door.width >= 24 && found.door.height >= 24,
      `the door at least 24 x 24 on ${where}: ${found.door.width} x ${found.door.height}`,
    )
    .toBe(true);
  expect
    .soft(found.copper, `--accent in the door at rest on ${where}`)
    .toEqual([]);

  // Hovered: the underline thickens as the Log link's does.
  await page.locator(LOG_LINK).hover();
  await settled(page);
  const logHovered = (await doorRead(page, accent)).logLook;
  await page
    .locator(REVISIONS)
    .getByRole("link", { name: DOOR_WORDS, exact: true })
    .hover();
  await settled(page);
  const hovered = await doorRead(page, accent);
  expect
    .soft(
      hovered.doorLook,
      `the door's look hovered against the Log link's hovered on ${where}`,
    )
    .toEqual(logHovered);
  expect
    .soft(hovered.copper, `--accent in the door hovered on ${where}`)
    .toEqual([]);
  await page.mouse.move(0, 0);
  return true;
}

/** Tab from the Log link: the door, then the first case study; the door's ring by keyboard. */
async function doorTabbed(
  page: Page,
  where: string,
  start: string | null,
  ink: Rgba,
  accent: Rgba,
) {
  await page.evaluate(
    (sel) => (document.querySelector(sel) as HTMLElement | null)?.focus(),
    LOG_LINK,
  );
  await page.keyboard.press("Tab");
  await settled(page);
  const onDoor = await focusRead(page);
  const focused = await doorRead(page, accent);
  await page.keyboard.press("Shift+Tab");
  await settled(page);
  const onLog = await focusRead(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const after = await focusRead(page);
  expect
    .soft(
      [onLog?.href, onDoor?.text, onDoor?.href, after?.href],
      `Tab: the Log link, the door, then the first case study on ${where}`,
    )
    .toEqual(["/log", DOOR_WORDS, start, FIRST_STUDY]);
  expect
    .soft(
      onDoor ? [onDoor.rings, onDoor.ring] : null,
      `the door's ring, against the Log link's (${onLog?.ring}) on ${where}`,
    )
    .toEqual([1, onLog?.ring]);
  expect
    .soft(
      onDoor?.ring.split(" ").slice(0, 2),
      `the door's ring style and width on ${where}`,
    )
    .toEqual(["solid", "2px"]);
  const ring = await rgbaOf(page, onDoor?.color ?? "");
  expect
    .soft(
      same(ring, ink),
      `the door's ring in ink (${JSON.stringify(ink)}) on ${where}: ${JSON.stringify(ring)}`,
    )
    .toBe(true);
  expect
    .soft(focused.copper, `--accent in the door focused on ${where}`)
    .toEqual([]);
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
}

test(`H9 The door: on / at 320, 390, 768, 1024, 1280 and 1440 wide, default, live, open, resting and replay, exactly one link in the revision block reading exactly "${DOOR_WORDS}", after the Log link in the DOM and on its line or the next; its href /log's start link's, landing on that step with a 200; its font, weight, colour, underline and offset the Log link's, at rest and hovered; at least 24 x 24; one 2 px ink ring as the Log link's; never --accent; Tab reaches it right after the Log link and right before the first case study`, async ({
  page,
  crew,
}) => {
  test.setTimeout(300_000);
  const start = await startOfLog(page);
  expect(start, "/log's start link's href").toBe(FIRST_STEP);

  for (const name of statesFor([
    "default",
    "live",
    "open",
    "resting",
    "replay",
  ] as const)) {
    const state = await stateOf(crew, name);
    // Both schemes on the default server; the fixtures in light.
    for (const scheme of name === "default" ? SCHEMES : (["light"] as const)) {
      await page.emulateMedia({ colorScheme: scheme });
      await openAt(page, "/", 1440, 900, state.base);
      const ink = await tokenRgba(page, "--foreground");
      const accent = await tokenRgba(page, "--accent");
      expect(accent, `--accent on ${name}`).not.toBeNull();
      for (const [width, height] of H9_WINDOWS) {
        await page.setViewportSize({ width, height });
        await page.mouse.move(0, 0);
        await settled(page);
        const where = `${name} at ${at(width, height)}, ${scheme}`;
        if (await doorShown(page, where, start, accent))
          await doorTabbed(page, where, start, ink, accent);
      }
    }
  }

  // Following it, on the default server at 1440 x 900: the yard's first step, with a 200.
  await page.emulateMedia({ colorScheme: "light" });
  await openAt(page, "/", 1440, 900);
  const door = page
    .locator(REVISIONS)
    .getByRole("link", { name: DOOR_WORDS, exact: true });
  await expect(door, "the door on the default server").toHaveCount(1);
  const [landing] = await Promise.all([
    page.waitForEvent(
      "response",
      (r) =>
        r.request().isNavigationRequest() &&
        new URL(r.url()).pathname === FIRST_STEP,
    ),
    door.click(),
  ]);
  expect
    .soft(landing.status(), `status of ${FIRST_STEP}, followed from /`)
    .toBe(200);
  await page.waitForURL((url) => url.pathname === FIRST_STEP);
  expect
    .soft(
      await page.evaluate(() =>
        Boolean(document.querySelector('section[aria-labelledby="record"]')),
      ),
      `${FIRST_STEP} shows its record`,
    )
    .toBe(true);
});

// ---------------------------------------------------------------------------------------------
// H10 `/`'s first screen

/**
 * Today's Contact-link bottom (the lowest of the title block's three links, `main > header`) at each
 * window width from 1380 to 1440 at 900 tall, by state and fonts, in px to a tenth, one figure a
 * width from 1380. Measured on main's build (the code at ff9a3d9) (decisions.md, 5); the test's
 * "contact bottoms" annotation prints what it read in this shape, so a re-record is a paste.
 */
type Runs = number[];
type Fonts = "webfont" | "blocked";
type Sweepable = "default" | "live" | "open" | "resting" | "replay";
const BASELINE: Record<Sweepable, Record<Fonts, Runs>> = {
  default: {
    webfont: [
      846, 846.4, 846.7, 847, 847.4, 847.7, 848.1, 848.4, 848.7, 849.1, 849.4,
      849.8, 850.1, 850.4, 850.8, 851.1, 851.4, 851.8, 852.1, 852.5, 852.8,
      853.1, 853.5, 853.8, 854.1, 854.5, 854.8, 855.2, 855.5, 855.8, 856.2,
      856.5, 856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.2, 859.6,
      859.9, 860.2, 860.6, 860.9, 861.3, 861.6, 861.9, 862.3, 862.6, 862.9,
      863.3, 863.6, 864, 864.3, 864.6, 865, 865.3, 865.6, 866, 866.3,
    ],
    blocked: [
      846, 846.4, 846.7, 847, 847.4, 847.7, 848.1, 848.4, 848.7, 849.1, 849.4,
      849.8, 850.1, 850.4, 850.8, 851.1, 851.4, 851.8, 852.1, 852.5, 852.8,
      853.1, 853.5, 853.8, 854.1, 854.5, 854.8, 855.2, 855.5, 855.8, 856.2,
      856.5, 856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.2, 859.6,
      859.9, 860.2, 860.6, 860.9, 861.3, 861.6, 861.9, 862.3, 862.6, 862.9,
      863.3, 863.6, 864, 864.3, 864.6, 865, 865.3, 865.6, 866, 866.3,
    ],
  },
  live: {
    webfont: [
      853, 853.4, 853.7, 854.1, 854.4, 854.8, 855.1, 855.5, 855.8, 856.1, 856.5,
      856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.3, 859.6, 859.9,
      860.3, 860.6, 861, 861.3, 861.6, 862, 862.3, 862.7, 863, 863.4, 863.7,
      864, 864.4, 864.7, 865.1, 865.4, 865.8, 866.1, 866.5, 866.8, 867.1, 867.5,
      867.8, 868.2, 868.5, 868.9, 869.2, 869.6, 869.9, 870.2, 870.6, 870.9,
      871.3, 871.6, 872, 872.3, 873.2, 873.5, 873.8, 874.2,
    ],
    blocked: [
      853, 853.4, 853.7, 854.1, 854.4, 854.8, 855.1, 855.5, 855.8, 856.1, 856.5,
      856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.3, 859.6, 859.9,
      860.3, 860.6, 861, 861.3, 861.6, 862, 862.3, 862.7, 863, 863.4, 863.7,
      864, 864.4, 864.7, 865.1, 865.4, 865.8, 866.1, 866.5, 866.8, 867.1, 867.5,
      867.8, 868.2, 868.5, 868.9, 869.2, 869.6, 869.9, 870.2, 870.6, 870.9,
      871.3, 871.6, 872, 872.3, 873.2, 873.5, 873.8, 874.2,
    ],
  },
  open: {
    webfont: [
      853, 853.4, 853.7, 854.1, 854.4, 854.8, 855.1, 855.5, 855.8, 856.1, 856.5,
      856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.3, 859.6, 859.9,
      860.3, 860.6, 861, 861.3, 861.6, 862, 862.3, 862.7, 863, 856.2, 856.5,
      856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.2, 859.6, 859.9,
      860.2, 860.6, 860.9, 861.3, 861.6, 861.9, 862.3, 862.6, 862.9, 863.3,
      863.6, 864, 864.3, 864.6, 865, 865.3, 865.6, 866, 866.3,
    ],
    blocked: [
      853, 853.4, 853.7, 854.1, 854.4, 854.8, 855.1, 855.5, 855.8, 856.1, 856.5,
      856.8, 857.2, 857.5, 857.9, 858.2, 858.5, 858.9, 859.3, 859.6, 859.9,
      860.3, 860.6, 861, 861.3, 861.6, 862, 862.3, 862.7, 863, 863.4, 863.7,
      864, 864.4, 864.7, 865.1, 865.4, 865.8, 866.1, 866.5, 866.8, 867.1, 860.2,
      860.6, 860.9, 861.3, 861.6, 861.9, 862.3, 862.6, 862.9, 863.3, 863.6, 864,
      864.3, 864.6, 865, 865.3, 865.6, 866, 866.3,
    ],
  },
  resting: {
    webfont: [
      859, 859.4, 859.7, 860.1, 860.4, 860.8, 861.1, 861.5, 861.8, 862.1, 862.5,
      862.8, 863.2, 863.5, 863.8, 864.2, 864.5, 864.9, 865.2, 865.6, 865.9,
      866.3, 866.6, 866.9, 867.3, 867.6, 868, 868.3, 868.7, 869, 869.3, 869.7,
      870, 870.4, 870.7, 871.1, 871.4, 871.8, 872.1, 872.4, 872.8, 873.1, 873.5,
      873.8, 874.2, 874.5, 874.8, 875.2, 875.5, 875.9, 876.2, 876.6, 876.9,
      877.3, 877.6, 877.9, 878.3, 879.1, 879.5, 879.8, 880.2,
    ],
    blocked: [
      859, 859.4, 859.7, 860.1, 860.4, 860.8, 861.1, 861.5, 861.8, 862.1, 862.5,
      862.8, 863.2, 863.5, 863.8, 864.2, 864.5, 864.9, 865.2, 865.6, 865.9,
      866.3, 866.6, 866.9, 867.3, 867.6, 868, 868.3, 868.7, 869, 869.3, 869.7,
      870, 870.4, 870.7, 871.1, 871.4, 871.8, 872.1, 872.4, 872.8, 873.1, 873.5,
      873.8, 874.2, 874.5, 874.8, 875.2, 875.5, 875.9, 876.2, 876.6, 876.9,
      877.3, 877.6, 877.9, 878.3, 879.1, 879.5, 879.8, 880.2,
    ],
  },
  replay: {
    webfont: [
      859.3, 859.6, 860, 860.3, 860.7, 861, 861.3, 861.7, 862, 862.4, 862.7,
      863.1, 863.4, 863.8, 864.1, 864.4, 864.8, 865.1, 865.5, 865.8, 866.2,
      866.5, 866.8, 867.2, 867.5, 867.9, 868.2, 868.6, 868.9, 869.3, 869.6,
      869.9, 870.3, 870.6, 871, 871.3, 871.7, 872, 872.3, 872.7, 873, 873.4,
      873.7, 874.1, 874.4, 874.8, 875.1, 875.4, 875.8, 876.1, 876.5, 876.8,
      877.2, 877.5, 877.8, 878.2, 878.5, 879.4, 879.7, 880.1, 880.4,
    ],
    blocked: [
      859.3, 859.6, 860, 860.3, 860.7, 861, 861.3, 861.7, 862, 862.4, 862.7,
      863.1, 863.4, 863.8, 864.1, 864.4, 864.8, 865.1, 865.5, 865.8, 866.2,
      866.5, 866.8, 867.2, 867.5, 867.9, 868.2, 868.6, 868.9, 869.3, 869.6,
      869.9, 870.3, 870.6, 871, 871.3, 871.7, 872, 872.3, 872.7, 873, 873.4,
      873.7, 874.1, 874.4, 874.8, 875.1, 875.4, 875.8, 876.1, 876.5, 876.8,
      877.2, 877.5, 877.8, 878.2, 878.5, 879.4, 879.7, 880.1, 880.4,
    ],
  },
};

/**
 * The ceiling at a width: the lowest of today's states there, on that face. Any state may drop to
 * it (open does, to live's place at 1410 to 1440) and none lower (the contract's H10, from Iris's
 * fit.md 4.1; decisions.md, 6).
 */
const lowestToday = (width: number, fonts: Fonts) =>
  Math.max(
    ...Object.values(BASELINE).map(
      (state) => state[fonts][width - (SWEEP[0] ?? 0)] ?? Number.NaN,
    ),
  );

const SWEEP = Array.from({ length: 61 }, (_, i) => 1380 + i);

/** The Contact links' lowest bottom, and the Log link's and the door's boxes, as the page stands. */
function contactRead(page: Page) {
  return page.evaluate(
    ({ hrefs, log, block, words }) => {
      const header = document.querySelector("main > header");
      const bottoms = hrefs.map(
        (href) =>
          header?.querySelector(`a[href="${href}"]`)?.getBoundingClientRect()
            .bottom ?? Number.NaN,
      );
      const edges = (el: Element | null | undefined) => {
        const r = el?.getBoundingClientRect();
        return r ? { top: r.top, bottom: r.bottom } : null;
      };
      const door = [
        ...(document.querySelector(block)?.querySelectorAll("a") ?? []),
      ].find(
        (a) => (a.textContent ?? "").replace(/\s+/g, " ").trim() === words,
      );
      return {
        contact: Math.max(...bottoms),
        found: bottoms.filter((b) => !Number.isNaN(b)).length,
        height: innerHeight,
        log: edges(document.querySelector(log)),
        door: edges(door),
      };
    },
    {
      hrefs: profile.links.map((link) => link.href),
      log: LOG_LINK,
      block: REVISIONS,
      words: DOOR_WORDS,
    },
  );
}

/** A fresh context for `base`, its web fonts loaded or refused. */
async function fontsPage(browser: Browser, blocked: boolean) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  const aborted = { count: 0 };
  if (blocked)
    await context.route(/\.woff2(\?|$)/, (route) => {
      aborted.count += 1;
      return route.abort();
    });
  return { context, page: await context.newPage(), aborted };
}

/** One state's sweep in one font mode, on a context of its own; returns its runs. */
async function sweep(
  browser: Browser,
  name: Sweepable,
  base: string,
  fonts: Fonts,
) {
  const { context, page, aborted } = await fontsPage(
    browser,
    fonts === "blocked",
  );
  await openAt(page, "/", 1440, 900, base);
  // The local() faces ("Sofia Sans Local", "... Extra Condensed Local") load without a request,
  // so only the web faces count.
  const loaded = await page.evaluate(
    () =>
      [...document.fonts].filter(
        (face) =>
          face.status === "loaded" &&
          !/\b(local|fallback)\b/i.test(face.family),
      ).length,
  );
  expect(
    [loaded > 0, aborted.count > 0],
    `web faces loaded (${loaded}) and woff2 requests aborted (${aborted.count}) on ${name}, ${fonts}`,
  ).toEqual(fonts === "webfont" ? [true, false] : [false, true]);
  const where = (width: number) => `${name}, ${fonts}, at ${at(width, 900)}`;
  const runs: Runs = [];
  for (const width of SWEEP) {
    await page.setViewportSize({ width, height: 900 });
    const found = await contactRead(page);
    expect(
      found.found,
      `Contact links in the title block, ${where(width)}`,
    ).toBe(profile.links.length);
    const bottom = Math.round(found.contact * 10) / 10;
    runs.push(bottom);
    expect
      .soft(
        bottom,
        `the Contact links' bottom inside the first screen, ${where(width)}`,
      )
      .toBeLessThanOrEqual(found.height);
    const today = lowestToday(width, fonts);
    expect
      .soft(
        bottom,
        `the Contact links' bottom against today's lowest state, ${today} px, ${where(width)}`,
      )
      .toBeLessThanOrEqual(today + 0.5);
    if (width === 1440) {
      for (const [what, box] of [
        [`All ${MERGED.length} revisions in the Log`, found.log],
        [`the door, ${DOOR_WORDS}`, found.door],
      ] as const) {
        expect
          .soft(
            Boolean(box && box.top >= 0 && box.bottom <= found.height),
            `${what} wholly in the first screen, ${where(width)}: ${JSON.stringify(box)}`,
          )
          .toBe(true);
      }
    }
  }
  await context.close();
  return runs;
}

test(`H10 /'s first screen: from 1380 to 1440 wide at 900 tall, 1 px apart, default, live, open, resting and replay, with the webfont and with fonts blocked, the Contact links' bottom never lower than the lowest of today's states at that width and inside the first screen; at 1440 x 900 All ${MERGED.length} revisions in the Log and the door wholly in the first screen`, async ({
  browser,
  crew,
}) => {
  test.setTimeout(300_000);
  const measured: Record<string, Runs> = {};
  // Live is swept too: the 1440 x 900 clause holds in every state, and the sweep is the read.
  for (const name of statesFor([
    "default",
    "live",
    "open",
    "resting",
    "replay",
  ] as const)) {
    const state = await stateOf(crew, name);
    for (const fonts of ["webfont", "blocked"] as const)
      measured[`${name} ${fonts}`] = await sweep(
        browser,
        name,
        state.base,
        fonts,
      );
  }
  // The runs as read, in BASELINE's shape, so a re-record is a paste (memory: sprint 43, W2).
  test.info().annotations.push({
    type: "contact bottoms",
    description: JSON.stringify(measured),
  });
});
