import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import { expected } from "./crew";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilHome,
  untilState,
} from "./crew-feed";
import { FIXTURE_STUDIO, feedOf, livePage, toAnswer } from "./crew-live";
import {
  ENTRY,
  momentsPlayed,
  PAUSE,
  press,
  readReplay,
  replaySite,
  STEP,
  stepClock,
  toBody,
  untilPlayed,
} from "./crew-replay";
import { firstScreen, insideViewport } from "./first-screen";
import { horizontalOverflow, installRgba, SCHEMES } from "./helpers";
import { layerFor, pencilSeat, ROWS_SHOWN } from "./live-layer";
import { decodePng } from "./pixels";
import { refuseWebGl } from "./webgl";

// Sprint 40, Pb: who built it, in plain words (.crew/sprint/40/contract.md, P8 to P13, with
// decisions.md 7's hook and 8's words), written before the build. The oracle is this file's own lines from the
// contract's words: the key's sentence, the job cell's "<word>, AI agent" and the goals rule, never
// the page's code. The feed states come from B4.22's harness (e2e/crew-feed.ts, live-layer.spec.ts's
// kept `home-*` sites, which serve /crew in the same state), the first screen from B1.1's reads
// (e2e/first-screen.ts), the polls from crew-live's harness (e2e/crew-live.ts) and the replay from
// B4e's (e2e/crew-replay.ts). Every page refuses WebGL (the Off path): nothing here reads the 3D.

const KEY = "p[data-crew-key]";
const REVISIONS = 'section[aria-labelledby="revisions"]';
const CREW = 'section[aria-labelledby="crew"]';
/** `{first}`: the first word of profile.name. */
const FIRST = profile.name.trim().split(/\s+/)[0] ?? "";
/** The key, as the contract writes it (decisions.md 8's words, one space where its lines break). */
const KEY_TEXT = `Every name is an AI agent ${FIRST} directs. Approved: Gate is CI, his rules and Lens's review; Owner is his own call.`;
/**
 * Whitespace squashed; a typographic apostrophe read as the contract's straight one, the same
 * word in either glyph (crew.ts's readPanel reads them alike).
 */
const squash = (text: string) =>
  text.replace(/\s+/g, " ").replace(/[‘’]/g, "'").trim();
/** Each roster key's job word, from sprint 31's roster (crew.ts), in roster order. */
const WORDS: Record<string, string> = {
  lead: "Lead",
  "product-owner": "Roadmap",
  engineer: "Code",
  "creative-engineer": "Motion",
  "code-reviewer": "Review",
  "qa-engineer": "Tests",
  "design-director": "Design",
};
const jobOf = (key: string) =>
  `${WORDS[key] ?? `(no word for ${key})`}, AI agent`;
const FIXTURES = ["live", "open", "resting"] as const;
type Fixture = (typeof FIXTURES)[number];
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

/** A context with scripts off, at a size. */
async function bare(browser: Browser, width: number, height: number) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    javaScriptEnabled: false,
    viewport: { width, height },
  });
  return { context, page: await context.newPage() };
}

/** `base`'s `path` at a size, its status asserted, with the web fonts in. */
async function openAt(
  page: Page,
  path: string,
  width: number,
  height: number,
  base = "",
) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}${path}`);
  expect(response?.status(), `status of ${base}${path} at ${width}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

// ---------------------------------------------------------------------------------------------
// The key

/**
 * The key as the DOM has it: how many on the page and in the revisions section, its text, where it
 * sits against the table, the plank count and the legend, anything focusable in it, and its box.
 */
function readKey(page: Page) {
  return page.evaluate(
    ({ key, revisions }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const section = document.querySelector(revisions);
      const inSection = [...(section?.querySelectorAll(key) ?? [])];
      const p = inSection[0] ?? null;
      const after = (a: Element | null | undefined, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const table = section?.querySelector("table") ?? null;
      // The plank count and the legend, by their words (components/plank-key.tsx).
      const count =
        [...(section?.querySelectorAll("*") ?? [])]
          .filter((el) =>
            /^\d+ planks: \d+ replaced, \d+ original$/.test(squashed(el)),
          )
          .at(-1) ?? null;
      const legend =
        [...(section?.querySelectorAll("ul") ?? [])].find((ul) =>
          squashed(ul).includes("Seated by a sprint"),
        ) ?? null;
      const r = p?.getBoundingClientRect();
      return {
        onPage: document.querySelectorAll(key).length,
        inSection: inSection.length,
        tag: p?.tagName ?? null,
        text: p?.textContent ?? null,
        afterTable: after(table, p),
        beforeCount: after(p, count),
        beforeLegend: after(p, legend),
        found: {
          table: Boolean(table),
          count: Boolean(count),
          legend: Boolean(legend),
        },
        focusable: p
          ? [
              p,
              ...p.querySelectorAll(
                "a, button, input, select, textarea, [tabindex]",
              ),
            ]
              .filter((el) => el !== p || p.matches("[tabindex]"))
              .map(
                (el) =>
                  `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 30)}"`,
              )
          : [],
        box: r
          ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
          : null,
        tableBottom: table ? table.getBoundingClientRect().bottom : null,
      };
    },
    { key: KEY, revisions: REVISIONS },
  );
}

function expectKey(read: Awaited<ReturnType<typeof readKey>>, where: string) {
  expect(read.inSection, `${KEY} in ${REVISIONS} ${where}`).toBe(1);
  expect.soft(read.onPage, `${KEY} on the page ${where}`).toBe(1);
  expect
    .soft(read.found, `the table, plank count and legend ${where}`)
    .toEqual({
      table: true,
      count: true,
      legend: true,
    });
  expect
    .soft(
      {
        afterTable: read.afterTable,
        beforeCount: read.beforeCount,
        beforeLegend: read.beforeLegend,
      },
      `after the table and before the plank count and legend in DOM order ${where}`,
    )
    .toEqual({ afterTable: true, beforeCount: true, beforeLegend: true });
  expect
    .soft(squash(read.text ?? ""), `the key's text ${where}`)
    .toBe(KEY_TEXT);
  expect
    .soft(read.focusable, `a, button or [tabindex] in the key ${where}`)
    .toEqual([]);
}

/** The key's text in raw HTML: the p's markup with its tags stripped and entities decoded. */
function keyInHtml(html: string) {
  const open = html.match(/<p\b[^>]*\sdata-crew-key(?:=|\s|\/?>)[^>]*>/);
  if (!open || open.index === undefined) return null;
  const start = open.index + open[0].length;
  const inner = html.slice(start, html.indexOf("</p>", start));
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

test("P8 the key on /, server-rendered: with scripts on and off at 1440 and 390, exactly one p[data-crew-key] in the revisions section, after its table and before the plank count and legend in DOM order, reading the contract's sentence with Ruslan's first name, with no a, button or [tabindex] in it; its words in GET /'s HTML", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(60_000);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    await openAt(page, "/", width, height);
    expectKey(await readKey(page), `with scripts on at ${width} x ${height}`);
    const off = await bare(browser, width, height);
    const response = await off.page.goto("/");
    expect(response?.status(), `status of / with scripts off at ${width}`).toBe(
      200,
    );
    const read = await readKey(off.page);
    await off.context.close();
    expectKey(read, `with scripts off at ${width} x ${height}`);
  }
  const html = await (await request.get("/")).text();
  const inHtml = keyInHtml(html);
  expect(inHtml, `a <p data-crew-key> in GET /'s HTML`).not.toBeNull();
  expect
    .soft(squash(inHtml ?? ""), "the key's words in GET /'s HTML")
    .toBe(KEY_TEXT);
});

/** Each element in the key with text of its own: its ink over its ground, and copper or not. */
function keyPaint(page: Page) {
  return page.evaluate((key) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba) return { accent: null, texts: [], copper: ["no __rgba"] };
    const probe = document.createElement("div");
    probe.style.color = "var(--accent)";
    document.body.append(probe);
    const accent = rgba(getComputedStyle(probe).color);
    probe.remove();
    const lum = (c: number[]) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * ch(c[0] ?? 0) + 0.7152 * ch(c[1] ?? 0) + 0.0722 * ch(c[2] ?? 0)
      );
    };
    const over = (top: number[], bottom: number[], alpha = top[3] ?? 1) =>
      [0, 1, 2].map(
        (i) => (top[i] ?? 0) * alpha + (bottom[i] ?? 0) * (1 - alpha),
      );
    const page_ = rgba(getComputedStyle(document.body).backgroundColor) ??
      rgba(getComputedStyle(document.documentElement).backgroundColor) ?? [
        255, 255, 255, 1,
      ];
    const groundOf = (el: Element) => {
      const layers: number[][] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        const c = rgba(getComputedStyle(a).backgroundColor);
        if (c) layers.push(c);
        if (c && (c[3] ?? 0) >= 0.99) break;
      }
      let ground = [...page_.slice(0, 3)];
      for (const layer of layers.reverse()) ground = over(layer, ground);
      return ground;
    };
    const opacity = (el: Element) => {
      let o = 1;
      for (let a: Element | null = el; a; a = a.parentElement)
        o *= Number.parseFloat(getComputedStyle(a).opacity);
      return o;
    };
    const near = (c: number[] | null) =>
      Boolean(
        c &&
          accent &&
          (c[3] ?? 0) > 0 &&
          [0, 1, 2].every((i) => Math.abs((c[i] ?? 0) - (accent[i] ?? 0)) <= 2),
      );
    const p = document.querySelector(key);
    const all = p ? [p, ...p.querySelectorAll("*")] : [];
    const label = (el: Element) =>
      `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`;
    const copper: string[] = [];
    for (const el of all) {
      const s = getComputedStyle(el);
      const painted: [string, string][] = [
        ["color", s.color],
        ["background-color", s.backgroundColor],
        [
          "text-decoration-color",
          s.textDecorationLine === "none" ? "" : s.textDecorationColor,
        ],
        ...(["top", "right", "bottom", "left"] as const).map(
          (side): [string, string] => [
            `border-${side}-color`,
            s.getPropertyValue(`border-${side}-style`) === "none"
              ? ""
              : s.getPropertyValue(`border-${side}-color`),
          ],
        ),
      ];
      for (const [prop, value] of painted)
        if (value && near(rgba(value))) copper.push(`${label(el)} ${prop}`);
    }
    const texts = all
      .filter((el) =>
        [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        ),
      )
      .map((el) => {
        const ground = groundOf(el);
        const ink = rgba(getComputedStyle(el).color) ?? [0, 0, 0, 1];
        const painted = over(ink, ground, (ink[3] ?? 1) * opacity(el));
        const [hi, lo] = [lum(painted), lum(ground)].sort((x, y) => y - x);
        return {
          el: label(el),
          ratio: ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05),
        };
      });
    return { accent, texts, copper };
  }, KEY);
}

/** How the key overflows: past the viewport's right edge, or its own box. */
function keyOverflow(page: Page) {
  return page.evaluate((key) => {
    const p = document.querySelector(key);
    if (!p) return null;
    const width = document.documentElement.clientWidth;
    const past = [p, ...p.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          el.getClientRects().length > 0 &&
          (r.right > width + 0.5 || r.left < -0.5)
        );
      })
      .map(
        (el) =>
          `<${el.tagName.toLowerCase()}> ${JSON.stringify(el.getBoundingClientRect())}`,
      );
    return { past, scroll: p.scrollWidth - p.clientWidth };
  }, KEY);
}

test("P8 the key reads and holds: 4.5:1 for each of its texts in light and dark, nothing in it painted copper (on the default server and the live fixture), and at 320 nothing overflows (the page, the key's box and its own scroll width)", async ({
  page,
  crew,
}) => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live fixture needs this checkout's build (B4.22's harness)",
  );
  test.setTimeout(120_000);
  const live = await reachHome(crew, "live");
  expect(
    live.home.seen,
    `the state / shows on the home-live site within ${STATE_WAIT} ms`,
  ).toBe("live");
  for (const [base, site] of [
    ["", "the default server"],
    [live.base, "the live fixture"],
  ] as const) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      await openAt(page, "/", 1440, 900, base);
      const where = `on ${site} at 1440, ${scheme}`;
      const paint = await keyPaint(page);
      expect(paint.accent, `--accent resolved ${where}`).not.toBeNull();
      expect(paint.texts.length, `texts in ${KEY} ${where}`).toBeGreaterThan(0);
      expect
        .soft(
          paint.texts
            .filter((t) => t.ratio < 4.5)
            .map((t) => `${t.el}: ${t.ratio.toFixed(2)}`),
          `the key's texts under 4.5:1 ${where}`,
        )
        .toEqual([]);
      expect.soft(paint.copper, `copper paint in the key ${where}`).toEqual([]);
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await openAt(page, "/", 320, 800);
  const over = await keyOverflow(page);
  expect(over, `${KEY} at 320`).not.toBeNull();
  expect
    .soft(await horizontalOverflow(page), "the page's overflow at 320")
    .toBe(0);
  expect
    .soft(over?.past, "the key or its parts past the viewport at 320")
    .toEqual([]);
  expect
    .soft(over?.scroll, "the key's scrollWidth past its clientWidth at 320")
    .toBe(0);
});

// ---------------------------------------------------------------------------------------------
// The feed's states: live-layer.spec.ts's kept `home-*` sites by name and answer (a worker that ran
// B4b reuses them), reached as B4.22 reaches them: /crew in the oracle's state, then / in the
// layer's. They serve /crew too, so P9 reads the same three.

function reachHome(crew: Crew, fixture: Fixture) {
  return crew.once(`plain-words ${fixture}`, async () => {
    const name = `home-${fixture}`;
    const site = await crew.site(name, { fixture }, true);
    const body = crew.feed.body(name);
    const want = layerFor(body, crew.feed.origin).home;
    const crewShown = await untilState(
      site.baseURL,
      expected(body, crew.feed.origin).state,
      STATE_WAIT,
    );
    const home = await untilHome(site.baseURL, want, STATE_WAIT);
    return { base: site.baseURL, body, want, crewShown, home };
  });
}

/** Reached, with the wait annotated and the state asserted. */
async function reached(crew: Crew, fixture: Fixture) {
  const r = await reachHome(crew, fixture);
  test.info().annotations.push({
    type: "state-wait",
    description: `${fixture}: /crew ${r.crewShown.seen} after ${r.crewShown.ms} ms, then / ${r.home.seen} after ${r.home.ms} ms`,
  });
  expect(
    r.crewShown.seen,
    `/crew's state on the home-${fixture} site within ${STATE_WAIT} ms`,
  ).toBe(fixture);
  expect(
    r.home.seen,
    `/'s state on the home-${fixture} site within ${STATE_WAIT} ms`,
  ).toBe(r.want);
  return r;
}

test.describe("on the feed's fixtures", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live, open and resting states need this checkout's build served from copies pointed at the fixture server (B4.22's harness)",
  );
  // Every site's first wait starts here, together, once a worker (STATE.md).
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reachHome(crew, fixture);
    void replaySite(crew, "replay");
  });

  test("P8 the key in the first screen: at 1440 x 900, light and dark, on the default server and the live, open and resting fixtures, the key wholly inside the viewport with every item B1.1 lists and the five rows; at 390 x 844 it follows the rows", async ({
    page,
    crew,
  }) => {
    test.setTimeout(150_000);
    const states = [{ base: "", where: "the default server" }];
    for (const fixture of FIXTURES)
      states.push({
        base: (await reached(crew, fixture)).base,
        where: `the ${fixture} fixture`,
      });
    for (const { base, where: site } of states) {
      for (const scheme of SCHEMES) {
        await page.emulateMedia({ colorScheme: scheme });
        await openAt(page, "/", 1440, 900, base);
        let where = `on ${site} at 1440 x 900, ${scheme}`;
        const key = await readKey(page);
        const found = await firstScreen(page);
        expect.soft(key.box, `${KEY} ${where}`).not.toBeNull();
        expect
          .soft(
            insideViewport(key.box, found.viewport),
            `the key wholly inside the first viewport ${where}: ${JSON.stringify(key.box)}`,
          )
          .toBe(true);
        expect
          .soft(found.rows, `revision rows ${where}`)
          .toHaveLength(ROWS_SHOWN);
        expect
          .soft(
            [...found.items, ...found.rows]
              .filter(({ box }) => !insideViewport(box, found.viewport))
              .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
            `B1.1's items and the rows not wholly inside the first viewport ${where}`,
          )
          .toEqual([]);

        await openAt(page, "/", 390, 844, base);
        where = `on ${site} at 390 x 844, ${scheme}`;
        const narrow = await readKey(page);
        expect.soft(narrow.box, `${KEY} ${where}`).not.toBeNull();
        expect
          .soft(
            (narrow.box?.top ?? Number.NaN) >=
              (narrow.tableBottom ?? Number.NaN) - 0.5,
            `the key's top (${narrow.box?.top}) at or below the rows' table's bottom (${narrow.tableBottom}) ${where}`,
          )
          .toBe(true);
      }
    }
  });

  test("P9 /crew labels each of the seven an AI agent: scripts off, on the default server (down) and the live, open and resting fixtures, every tr[data-role]'s first td reads <word>, AI agent, its AI agent in visible text (no box under 2 px from its text to the cell); at 390 the not-on-this-sprint sentence is unchanged; with scripts on at 1440 the visible text holds AI agent seven times", async ({
    browser,
    page,
    crew,
  }) => {
    test.setTimeout(150_000);
    const states: {
      base: string;
      where: string;
      body: unknown;
      origin: string | null;
    }[] = [
      {
        base: "",
        where: "the default server (down)",
        body: null,
        origin: null,
      },
    ];
    for (const fixture of FIXTURES) {
      const r = await reached(crew, fixture);
      states.push({
        base: r.base,
        where: `the ${fixture} fixture`,
        body: r.body,
        origin: crew.feed.origin,
      });
    }
    for (const { base, where, body, origin } of states) {
      const off = await bare(browser, 1440, 900);
      const response = await off.page.goto(`${base}/crew`);
      expect(
        response?.status(),
        `status of /crew on ${where}, scripts off`,
      ).toBe(200);
      expectJobs(await readJobs(off.page), `on ${where}, scripts off, at 1440`);
      // Below 768 px the absent rows fold into one sentence, which keeps its words.
      await off.page.setViewportSize({ width: 390, height: 844 });
      const absent = expected(body, origin)
        .rows.filter((r) => r.state === "Not on this sprint")
        .map((r) => r.name);
      expect
        .soft(
          squash(
            await off.page.evaluate(
              () => document.querySelector("p[data-absent]")?.textContent ?? "",
            ),
          ),
          `p[data-absent] on ${where}, scripts off, at 390`,
        )
        .toBe(absentSentence(absent));
      await off.context.close();
    }
    for (const { base, where } of states.slice(0, 2)) {
      await openAt(page, "/crew", 1440, 900, base);
      expect
        .soft(
          await visibleAgents(page),
          `"AI agent" in the visible text on ${where} at 1440`,
        )
        .toBe(7);
    }
  });
});

/** "Forge, Pixel and Probe are not on this sprint.", as /crew has said it since sprint 31. */
function absentSentence(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is not on this sprint.`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are not on this sprint.`;
}

/**
 * Each tr[data-role]: its key, its first td's text, and where "AI agent" sits in that cell: the
 * elements from its text node up to the cell that are hidden or under 2 px either way (a
 * screen-reader-only box).
 */
function readJobs(page: Page) {
  return page.evaluate((section) => {
    const rows = [...document.querySelectorAll(`${section} tr[data-role]`)];
    return rows.map((tr) => {
      const td = tr.querySelector("td");
      let hidden: string[] | null = null;
      if (td) {
        const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!(n.textContent ?? "").includes("AI agent")) continue;
          hidden = [];
          for (let el = n.parentElement; el; el = el.parentElement) {
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (
              r.width < 2 ||
              r.height < 2 ||
              style.visibility !== "visible" ||
              Number.parseFloat(style.opacity) === 0 ||
              (style.clipPath !== "none" && style.clipPath !== "") ||
              (style.clip !== "auto" && style.clip !== "")
            )
              hidden.push(
                `<${el.tagName.toLowerCase()}> ${Math.round(r.width)}x${Math.round(r.height)} ${style.visibility} ${style.clipPath} ${style.clip}`,
              );
            if (el === td) break;
          }
          break;
        }
      }
      return {
        key: tr.getAttribute("data-role") ?? "",
        job: td?.textContent ?? null,
        hidden,
      };
    });
  }, CREW);
}

function expectJobs(rows: Awaited<ReturnType<typeof readJobs>>, where: string) {
  expect
    .soft(rows.map((r) => r.key).sort(), `tr[data-role]'s keys ${where}`)
    .toEqual(Object.keys(WORDS).sort());
  expect
    .soft(
      rows.map((r) => [r.key, squash(r.job ?? "")]),
      `each row's job cell ${where}`,
    )
    .toEqual(rows.map((r) => [r.key, jobOf(r.key)]));
  expect
    .soft(
      rows
        .filter((r) => r.hidden === null || r.hidden.length > 0)
        .map((r) => `${r.key}: ${JSON.stringify(r.hidden)}`),
      `job cells whose "AI agent" isn't visible text ${where} (null: no text node holds it)`,
    )
    .toEqual([]);
}

/**
 * "AI agent" (not "AI agents") in the visible text: text nodes, script, style and template
 * skipped, whose parent shows (checkVisibility) with a box at least 2 px each way.
 */
function visibleAgents(page: Page) {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let count = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest("script, style, template, noscript")) continue;
      const matches = (n.textContent ?? "").match(/\bAI agent(?![A-Za-z])/g);
      if (!matches) continue;
      const r = el.getBoundingClientRect();
      if (
        !el.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }) ||
        r.width < 2 ||
        r.height < 2
      )
        continue;
      count += matches.length;
    }
    return count;
  });
}

test("P9 after a poll swaps the panel: from the default server's down /crew, told live at hydration, then open at 30 s and resting at 60 s (crew-live's harness), each panel's seven job cells read <word>, AI agent in visible text", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the down state needs this checkout's build served without a feed",
  );
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const told = (fixture: Fixture) => ({
    json: toAnswer(feedOf(fixture), FIXTURE_STUDIO),
  });
  const live = await livePage(page, "/crew", told("live"));
  expect(live.ready, "button[data-pause][data-ready]: the poller started").toBe(
    true,
  );
  expect
    .soft(await live.state(), "the panel's state after the hydration poll")
    .toBe("live");
  expectJobs(await readJobs(page), "told live at hydration");
  live.answer(told("open"));
  expect.soft(await live.tick(30_000), "polls at 30 s, live").toBe(1);
  expect.soft(await live.state(), "the panel's state told open").toBe("open");
  expectJobs(await readJobs(page), "told open at 30 s");
  live.answer(told("resting"));
  expect.soft(await live.tick(60_000), "polls at 60 s, open").toBe(1);
  expect
    .soft(await live.state(), "the panel's state told resting")
    .toBe("resting");
  expectJobs(await readJobs(page), "told resting at 60 s");
});

// ---------------------------------------------------------------------------------------------
// The Log

test("P10 /log's key is /'s: /log has one p[data-crew-key] with the same text as /'s (the contract's sentence), and no .log-key element with other words", async ({
  page,
}) => {
  await openAt(page, "/", 1440, 900);
  const home = await readKey(page);
  await openAt(page, "/log", 1440, 900);
  const log = await page.evaluate((key) => {
    const ps = [...document.querySelectorAll(key)];
    return {
      count: ps.length,
      text: ps[0]?.textContent ?? null,
      logKeys: [...document.querySelectorAll(".log-key")].map(
        (el) => el.textContent ?? "",
      ),
    };
  }, KEY);
  expect(log.count, `${KEY} on /log`).toBe(1);
  expect
    .soft(squash(log.text ?? ""), "/log's key, against /'s")
    .toBe(squash(home.text ?? ""));
  expect
    .soft(squash(log.text ?? ""), "/log's key, against the contract's")
    .toBe(KEY_TEXT);
  expect
    .soft(
      log.logKeys.map(squash).filter((t) => t !== KEY_TEXT),
      ".log-key elements with other words",
    )
    .toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// The goals rule

/** Sprints from this one on have a goal written for a visitor. */
const RULE_FROM = 38;

/** What breaks the goals rule in `goal`: a milestone code, a URL path, or more than 78 characters. */
function goalBreaks(goal: string) {
  const breaks: string[] = [];
  const code = goal.match(/\b(?:[A-Z]\d+[a-z]?|P[a-z])\b/);
  if (code) breaks.push(`a milestone code, "${code[0]}"`);
  const path = goal.match(/(^|\s)\/[a-z]/);
  if (path)
    breaks.push(
      `a URL path at "${goal
        .slice(path.index ?? 0)
        .trim()
        .slice(0, 12)}"`,
    );
  if (goal.length > 78) breaks.push(`${goal.length} characters`);
  return breaks;
}

/** Every `.crew/sprint/<n>/retro.json` with n ≥ 38 in the checkout: its sprint and raw goal. */
function ruledRetros() {
  const dir = join(process.cwd(), ".crew", "sprint");
  return readdirSync(dir)
    .filter((folder) => /^\d+$/.test(folder) && Number(folder) >= RULE_FROM)
    .filter((folder) => existsSync(join(dir, folder, "retro.json")))
    .map((folder) => {
      const raw = JSON.parse(
        readFileSync(join(dir, folder, "retro.json"), "utf8"),
      ) as {
        goal?: unknown;
      };
      return { sprint: Number(folder), goal: raw.goal };
    })
    .sort((a, b) => a.sprint - b.sprint);
}

test("P11 the goals rule: every retro from sprint 38 on has a goal with no milestone code, no URL path and at most 78 characters; on fixtures, B4e's goal and a goal naming /crew fail, sprint 39's passes, and 78 characters pass where 79 fail", () => {
  const retros = ruledRetros();
  expect(
    retros.map((r) => r.sprint),
    "retros from sprint 38 on in the checkout",
  ).toContain(39);
  expect
    .soft(
      retros.flatMap(({ sprint, goal }) =>
        typeof goal !== "string"
          ? [`${sprint}: no goal string`]
          : goalBreaks(goal).map((b) => `${sprint} "${goal}": ${b}`),
      ),
      "goals that break the rule",
    )
    .toEqual([]);
  const thirtyNine = retros.find((r) => r.sprint === 39)?.goal;
  expect(typeof thirtyNine, "sprint 39's goal").toBe("string");
  const cases: [string, string, boolean][] = [
    [
      "B4e's goal",
      "B4e: replay the last merged sprint on /crew, never mistaken for live",
      false,
    ],
    ["a goal naming /crew", "Say who built it on /crew in plain words", false],
    ["a goal naming /log first", "/log reads the key", false],
    ["Pa as a code", "Pa: the owner's scale", false],
    ["C5 as a code", "Start C5", false],
    ["sprint 39's goal", String(thirtyNine), true],
    ["78 characters", "x".repeat(78), true],
    ["79 characters", "x".repeat(79), false],
    [
      "a fraction and a slash in a word",
      "Rebuild 1 of 22 planks and/or more",
      true,
    ],
  ];
  for (const [name, goal, passes] of cases)
    expect
      .soft(goalBreaks(goal).length === 0, `${name} passes the rule: "${goal}"`)
      .toBe(passes);
});

// ---------------------------------------------------------------------------------------------
// /crew's riders (Lens's nits on #95)

test("P12 the unused crew-block class is gone from components/crew.tsx", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "crew.tsx"),
    "utf8",
  );
  expect(
    source.match(/\bcrew-block\b/g) ?? [],
    "crew-block in components/crew.tsx",
  ).toEqual([]);
});

test.describe("on the replay fixture", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the replay fixture needs this checkout's build served from a copy pointed at the fixture server (B4e's harness)",
  );
  test.use({ timezoneId: "America/Los_Angeles" });
  test.beforeAll(async () => {
    void replaySite(await crewOf(), "replay");
  });

  test("P12 Space alone toggles the replay's pause: mid-replay with the focus on the body, Shift+Space and Meta+Space leave Pause replay and Pause updates unpressed, and Space then presses Pause replay alone", async ({
    page,
    crew,
  }) => {
    test.setTimeout(90_000);
    const site = await replaySite(crew, "replay");
    expect(
      site.seen,
      `/crew's state on the replay site within ${site.ms} ms`,
    ).toBe("resting");
    await page.setViewportSize({ width: 1440, height: 900 });
    const live = await livePage(page, `${site.base}/crew`, {
      json: toAnswer(site.body(), site.origin),
    });
    expect(
      live.ready,
      "button[data-pause][data-ready]: the poller started",
    ).toBe(true);
    await press(page, ENTRY);
    const started = await untilPlayed(page, 1);
    expect(
      momentsPlayed(started),
      "moments played after the entry's press",
    ).toBe(1);
    const pressed = () =>
      page.evaluate(
        (pause) => ({
          replay:
            document.querySelector(pause)?.getAttribute("aria-pressed") ?? null,
          updates:
            document
              .querySelector("button[data-pause]")
              ?.getAttribute("aria-pressed") ?? null,
        }),
        PAUSE,
      );
    // Each press read against the state just before it, so one toggle can't hide another.
    const seen: Record<string, string> = {};
    for (const keys of ["Shift+Space", "Meta+Space", "Space"]) {
      await toBody(page);
      const before = await pressed();
      await page.keyboard.press(keys);
      await sleep(150);
      const after = await pressed();
      seen[keys] =
        `Pause replay ${before.replay} to ${after.replay}, Pause updates ${before.updates} to ${after.updates}`;
    }
    expect
      .soft(
        seen,
        "Pause replay and Pause updates before and after each press, the focus on the body",
      )
      .toEqual({
        "Shift+Space":
          "Pause replay false to false, Pause updates false to false",
        "Meta+Space":
          "Pause replay false to false, Pause updates false to false",
        Space: "Pause replay false to true, Pause updates false to false",
      });
  });

  test("P12 a #replay arrival in a hidden tab waits: /crew#replay on the replay fixture with the tab hidden plays no moment through 3 steps of the clock; shown, it plays the first, and the next a step later", async ({
    page,
    crew,
  }) => {
    test.setTimeout(90_000);
    const site = await replaySite(crew, "replay");
    expect(
      site.seen,
      `/crew's state on the replay site within ${site.ms} ms`,
    ).toBe("resting");
    await page.setViewportSize({ width: 1440, height: 900 });
    // The tab hidden from the first script on: crew-live's shim, starting hidden.
    await page.addInitScript(() => {
      let state: DocumentVisibilityState = "hidden";
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => state,
      });
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => state !== "visible",
      });
      (window as Window & { __show?: () => void }).__show = () => {
        state = "visible";
        document.dispatchEvent(new Event("visibilitychange"));
      };
    });
    const answer = toAnswer(site.body(), site.origin);
    await page.route("**/api/crew", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(answer),
          })
        : route.continue(),
    );
    const now = Date.now();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now + 1_000);
    await page.goto(`${site.base}/crew#replay`);
    await page.evaluate(() => document.fonts.ready);
    const ready = await page
      .locator("button[data-pause][data-ready]")
      .waitFor({ state: "attached", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    expect(ready, "button[data-pause][data-ready]: the page hydrated").toBe(
      true,
    );
    await sleep(300);
    const atLoad = momentsPlayed(await readReplay(page));
    const hidden = momentsPlayed(await stepClock(page, 3 * STEP));
    await page.evaluate(() =>
      (window as Window & { __show?: () => void }).__show?.(),
    );
    const shown = momentsPlayed(await untilPlayed(page, 1));
    await page.clock.runFor(STEP);
    const next = momentsPlayed(await untilPlayed(page, 2));
    expect
      .soft(
        { atLoad, hidden, shown, next },
        "moments played: hidden at load, hidden after 3 steps, once shown, a step later",
      )
      .toEqual({ atLoad: 0, hidden: 0, shown: 1, next: 2 });
  });
});

// ---------------------------------------------------------------------------------------------
// /'s rider (Iris, sprint 34): the pen above the number's chip

/**
 * At the shown drawing on the page now: the copper dot (the zero-length path in `[data-tip]`, its
 * centre and radius in viewport px), the pencil's number's chip box, and whether they meet. Scrolls
 * the dot to the viewport's middle first, instantly.
 */
function dotAndChip(page: Page) {
  return page.evaluate(() => {
    const shown = (el: Element) => el.getClientRects().length > 0;
    const dots = [
      ...document.querySelectorAll("[data-plan] [data-tip] path"),
    ].filter((p): p is SVGPathElement => {
      if (!(p instanceof SVGPathElement) || !shown(p)) return false;
      const b = p.getBBox();
      return b.width === 0 && b.height === 0;
    });
    const chips = [
      ...document.querySelectorAll("[data-plan] .plan-pencil"),
    ].filter(shown);
    const dot = dots[0];
    const chip = chips[0];
    if (!dot || !chip)
      return { dots: dots.length, chips: chips.length, at: null };
    const centre = () => {
      const b = dot.getBBox();
      const m = dot.getScreenCTM();
      const pt = new DOMPoint(b.x, b.y).matrixTransform(m ?? undefined);
      return { x: pt.x, y: pt.y };
    };
    scrollTo({
      top: scrollY + centre().y - innerHeight / 2,
      behavior: "instant",
    });
    const c = centre();
    const r = Number.parseFloat(getComputedStyle(dot).strokeWidth) / 2;
    const k = chip.getBoundingClientRect();
    const meets =
      c.x - r < k.right &&
      k.left < c.x + r &&
      c.y - r < k.bottom &&
      k.top < c.y + r;
    return {
      dots: dots.length,
      chips: chips.length,
      at: {
        x: c.x,
        y: c.y,
        r,
        chip: { left: k.left, top: k.top, right: k.right, bottom: k.bottom },
        number: (chip.textContent ?? "").trim(),
        meets,
      },
    };
  });
}

/**
 * What tops each point: at the dot's centre and at each whole-pixel point within its radius less
 * 1.5 px that lies in the chip's box, whether `elementFromPoint` gives an element in `[data-tip]`.
 * The drawing is inert (`pointer-events: none`, so a tap goes to the page behind it), which hit
 * testing skips: it is made hittable here, so the hit order is the paint order.
 */
function topsAt(
  page: Page,
  at: {
    x: number;
    y: number;
    r: number;
    chip: { left: number; top: number; right: number; bottom: number };
  },
) {
  return page.evaluate((a) => {
    const style = document.createElement("style");
    style.textContent =
      "[data-plan], [data-plan] * { pointer-events: auto !important; }";
    document.head.append(style);
    const name = (el: Element | null) =>
      el
        ? `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? ` .${el.className.split(" ").join(".")}` : ""}> "${(el.textContent ?? "").trim().slice(0, 10)}"`
        : "nothing";
    const top = (x: number, y: number) => document.elementFromPoint(x, y);
    const centre = top(a.x, a.y);
    const covered: string[] = [];
    let points = 0;
    const inner = a.r - 1.5;
    for (let dx = -Math.floor(inner); dx <= inner; dx++)
      for (let dy = -Math.floor(inner); dy <= inner; dy++) {
        if (dx * dx + dy * dy > inner * inner) continue;
        const [x, y] = [a.x + dx, a.y + dy];
        if (
          x < a.chip.left ||
          x > a.chip.right ||
          y < a.chip.top ||
          y > a.chip.bottom
        )
          continue;
        points++;
        const el = top(x, y);
        if (!el?.closest("[data-tip]"))
          covered.push(`(${dx}, ${dy}) ${name(el)}`);
      }
    style.remove();
    return {
      centre: centre?.closest("[data-tip]") ? "[data-tip]" : name(centre),
      points,
      covered,
    };
  }, at);
}

/** The painted pixel at (x, y), as [r, g, b]. */
async function pixelAt(page: Page, x: number, y: number) {
  const image = decodePng(
    await page.screenshot({
      clip: { x: Math.round(x) - 1, y: Math.round(y) - 1, width: 3, height: 3 },
    }),
  );
  const i = (1 * image.width + 1) * 4;
  return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
}

test.describe("on the live fixture's /", () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    "PLAYWRIGHT_BASE_URL is set: the live fixture needs this checkout's build (B4.22's harness)",
  );
  test.beforeAll(async () => {
    void reachHome(await crewOf(), "live");
  });

  test("P13 the pen above the number's chip: on the live fixture's short seat, the Off path (WebGL refused), at 1024 and every width below it where the chip's box meets the copper dot's (1024 must be one), the topmost element at the dot's centre, and at each point of the dot the chip covers, is in [data-tip], and the centre paints as it does with the lettering hidden", async ({
    page,
    crew,
  }) => {
    test.setTimeout(120_000);
    const live = await reached(crew, "live");
    const n =
      (live.body.current as { sprint?: number } | undefined)?.sprint ??
      Number.NaN;
    const seat = pencilSeat(n);
    test.info().annotations.push({
      type: "seat",
      description: `sprint ${n} in pencil on seat ${seat}`,
    });
    const met: string[] = [];
    // Below 768 px the sheet's narrow drawing letters no plank numbers, so there is no chip to
    // meet; the copper dot is drawn at every width.
    for (const width of [1024, 960, 900, 800, 768, 600, 390]) {
      await openAt(page, "/", width, 900, live.base);
      const where = `at ${width} x 900 on the live fixture (sprint ${n}, seat ${seat}), WebGL refused`;
      const read = await dotAndChip(page);
      expect.soft(read.dots, `shown copper dots ${where}`).toBe(1);
      if (width >= 768)
        expect.soft(read.chips, `shown pencil chips ${where}`).toBe(1);
      const at = read.at;
      if (!at) continue;
      if (width === 1024)
        expect
          .soft(
            at.meets,
            `the chip "${at.number}" ${JSON.stringify(at.chip)} meets the dot at (${at.x.toFixed(1)}, ${at.y.toFixed(1)}) r ${at.r} ${where}: the seat the check needs`,
          )
          .toBe(true);
      if (!at.meets) continue;
      met.push(String(width));
      const tops = await topsAt(page, at);
      const withChip = await pixelAt(page, at.x, at.y);
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "p13-no-lettering";
        style.textContent =
          "[data-plan] .plan-view > span { visibility: hidden !important; }";
        document.head.append(style);
      });
      // The control: with the lettering hidden, the dot is hit and painted, so a miss above is the chip.
      const bare = await topsAt(page, at);
      const withoutChip = await pixelAt(page, at.x, at.y);
      await page.evaluate(() =>
        document.getElementById("p13-no-lettering")?.remove(),
      );
      expect(
        bare.centre,
        `the control: the dot's centre hits [data-tip] with the lettering hidden ${where}`,
      ).toBe("[data-tip]");
      expect
        .soft(tops.centre, `the topmost element at the dot's centre ${where}`)
        .toBe("[data-tip]");
      expect
        .soft(
          tops.covered,
          `points of the dot (of ${tops.points} in the chip's box) where something else is on top ${where}`,
        )
        .toEqual([]);
      expect
        .soft(
          withChip.every((v, i) => Math.abs(v - (withoutChip[i] ?? 0)) <= 16),
          `the dot's centre paints ${JSON.stringify(withChip)}, as with the lettering hidden ${JSON.stringify(withoutChip)}, ${where}`,
        )
        .toBe(true);
    }
    test.info().annotations.push({
      type: "met",
      description: `the chip meets the dot at ${met.join(", ")}`,
    });
  });
});
