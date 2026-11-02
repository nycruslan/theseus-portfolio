import AxeBuilder from "@axe-core/playwright";
import { type Browser, expect, type Page } from "@playwright/test";
import { profile } from "../content/profile";
import {
  type Crew,
  crewOf,
  STATE_WAIT,
  crewTest as test,
  untilState,
} from "./crew-feed";
import { installRgba } from "./helpers";
import { EVERY, ROWS } from "./log";
import { pause } from "./model";
import { MERGED } from "./retros";
import { openModel, refuseWebGl } from "./webgl";

// Sprint 48, Kb: the ways into the keel and the record behind it (.crew/sprint/48/contract.md, K9
// to K12), written before the build. The oracle is the contract's words in this file's own lines:
// the key's sentence around "his rules", Approval's "<owner>'s rules", and K12's line from the
// retros by the Approved column's rule (e2e/retros.ts, the Log's oracle, never lib/sprint-log.ts),
// cross-checked against /log's own Approved cells. The feed states come from B4.22's harness
// (e2e/crew-feed.ts) on its kept live, open and resting sites, under scenario keys of this file's.

const KEY = "p[data-crew-key]";
const KEEL = 'section[aria-labelledby="keel"]';
const PANEL = 'section[aria-labelledby="crew"]';
const DEPLOYED = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** The owner's first name and whole name, from his facts (content/profile.ts). */
const OWNER = profile.name.trim();
const FIRST = OWNER.split(/\s+/)[0] ?? "";

/** K9: the key's words around its one link (P8's sentence, decisions.md 8 of sprint 40). */
const KEY_BEFORE = `Every name is an AI agent ${FIRST} directs. Approved: Gate is CI,`;
const KEY_LINK = "his rules";
const KEY_AFTER = "and Lens's review; Owner is his own call.";
const KEY_HREF = "/crew#keel";

/** K10: Approval's words that link, and where to. */
const APPROVAL_LINK = `${OWNER}'s rules`;
const APPROVAL_HREF = "#keel";

/** K12: the line, from the merged sprints' retros by the Approved column's rule (ownersCall). */
const OWNERS = MERGED.filter((retro) => retro.ownersCall).length;
const GATES = MERGED.length - OWNERS;
const RECORD = `${MERGED.length} sprints merged: ${GATES} on the checks alone, ${OWNERS} on Ruslan's own call.`;

/** Whitespace squashed; a typographic apostrophe read as the contract's straight one. */
const squash = (text: string | null | undefined) =>
  (text ?? "").replace(/\s+/g, " ").replace(/[‘’]/g, "'").trim();

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

/** A context with scripts off or on, WebGL refused, at a size. */
async function contextOf(
  browser: Browser,
  width: number,
  height: number,
  scripts: boolean,
) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    javaScriptEnabled: scripts,
    viewport: { width, height },
  });
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
  return { context, page: await context.newPage() };
}

/** `base`'s `path`, its status asserted, with the web fonts in. */
async function open(page: Page, path: string, base = "") {
  const response = await page.goto(`${base}${path}`);
  expect(response?.status(), `status of ${base}${path}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** `path`'s HTML as `base` serves it, parsed in a page with no script to move anything. */
async function withServerHtml<T>(
  browser: Browser,
  base: string,
  path: string,
  read: (page: Page) => Promise<T>,
): Promise<T> {
  const url = new URL(path, base || String(test.info().project.use.baseURL));
  const response = await fetch(url);
  expect(response.status, `status of GET ${url}`).toBe(200);
  const html = await response.text();
  const raw = await contextOf(browser, 1440, 900, false);
  try {
    await raw.page.setContent(html, { waitUntil: "domcontentloaded" });
    return await read(raw.page);
  } finally {
    await raw.context.close();
  }
}

const SIZES = [
  [1440, 900],
  [390, 844],
] as const;

// ---------------------------------------------------------------------------------------------
// K9: "his rules" in the key, on / and wherever else the key renders (/log and its records,
// components/log.tsx; /crew repeats only the key's first sentence)

/** The key's links, what else in it takes focus, and its words before and after its first link. */
function readKeyLink(page: Page) {
  return page.evaluate((key) => {
    const squashed = (s: string | null | undefined) =>
      (s ?? "").replace(/\s+/g, " ").trim();
    const keys = [...document.querySelectorAll(key)];
    const p = keys[0];
    if (!p) return { keys: 0, links: [], focusable: [], before: "", after: "" };
    const links = [...p.querySelectorAll("a")];
    const first = links[0];
    let before = "";
    let after = "";
    if (first) {
      const range = document.createRange();
      range.selectNodeContents(p);
      range.setEndBefore(first);
      before = range.toString();
      range.selectNodeContents(p);
      range.setStartAfter(first);
      after = range.toString();
    }
    return {
      keys: keys.length,
      links: links.map((a) => ({
        href: a.getAttribute("href"),
        text: squashed(a.textContent),
      })),
      focusable: [
        ...p.querySelectorAll("button, input, select, textarea, [tabindex]"),
      ].map((el) => `<${el.tagName.toLowerCase()}>`),
      before,
      after,
    };
  }, KEY);
}

function expectKeyLink(
  read: Awaited<ReturnType<typeof readKeyLink>>,
  where: string,
) {
  expect(read.keys, `${KEY} ${where}`).toBe(1);
  expect
    .soft(read.links, `the key's links ${where}`)
    .toEqual([{ href: KEY_HREF, text: KEY_LINK }]);
  expect
    .soft(read.focusable, `buttons, fields or [tabindex] in the key ${where}`)
    .toEqual([]);
  // The link is the second sentence's "his rules", not the "his" of "his own call".
  expect
    .soft(
      { before: squash(read.before), after: squash(read.after) },
      `the key's words around its link ${where}`,
    )
    .toEqual({ before: KEY_BEFORE, after: KEY_AFTER });
}

test("K9 from /, /log and a record (/log/13): in p[data-crew-key]'s second sentence, his rules is the key's one link, a[href=/crew#keel], in GET's HTML and in the DOM with scripts off and on at 1440 x 900 and 390 x 844", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  // A record renders the Log's table and its key (components/log.tsx), so it says the same.
  for (const path of ["/", "/log", "/log/13"]) {
    expectKeyLink(
      await withServerHtml(browser, "", path, readKeyLink),
      `in GET ${path}'s HTML`,
    );
    for (const [width, height] of SIZES) {
      for (const scripts of [false, true]) {
        const { context, page } = await contextOf(
          browser,
          width,
          height,
          scripts,
        );
        try {
          await open(page, path);
          expectKeyLink(
            await readKeyLink(page),
            `on ${path} with scripts ${scripts ? "on" : "off"} at ${width} x ${height}`,
          );
        } finally {
          await context.close();
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------
// K10: Approval's "<owner>'s rules" on /crew

/** Approval's words and links, and the paint of its #keel link and the Studio link beside it. */
function readApproval(page: Page) {
  return page.evaluate(
    ({ panel, href }) => {
      const squashed = (s: string | null | undefined) =>
        (s ?? "").replace(/\s+/g, " ").replace(/[‘’]/g, "'").trim();
      const dd = document.querySelector(`${panel} [data-approval]`);
      const style = (el: Element | null | undefined) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          color: s.color,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          textDecorationLine: s.textDecorationLine,
          textDecorationStyle: s.textDecorationStyle,
          textDecorationColor: s.textDecorationColor,
          textDecorationThickness: s.textDecorationThickness,
          textUnderlineOffset: s.textUnderlineOffset,
        };
      };
      const link = dd?.querySelector(`a[href="${href}"]`);
      return {
        found: Boolean(dd),
        text: squashed(dd?.textContent),
        links: [...(dd?.querySelectorAll("a") ?? [])].map((a) => ({
          href: a.getAttribute("href"),
          text: squashed(a.textContent),
        })),
        link: style(link),
        // The panel's other links: the Studio line's, in every state (components/crew.tsx).
        studio: style(document.querySelector(`${panel} [data-studio] a`)),
      };
    },
    { panel: PANEL, href: APPROVAL_HREF },
  );
}

/** Hovered, the #keel link's decoration against the Studio link's, hovered the same way. */
async function hoveredDecorations(page: Page) {
  const read = (selector: string) =>
    page.locator(selector).evaluate((el) => {
      const s = getComputedStyle(el);
      return `${s.textDecorationLine} ${s.textDecorationThickness} ${s.textDecorationColor}`;
    });
  const link = `${PANEL} [data-approval] a[href="${APPROVAL_HREF}"]`;
  const studio = `${PANEL} [data-studio] a`;
  await page.locator(link).hover();
  const own = await read(link);
  await page.locator(studio).hover();
  const other = await read(studio);
  return { own, other };
}

/** K10's assertions on one state; `says` is whether the contract's rule has it say the words. */
async function k10On(page: Page, says: boolean | null, where: string) {
  const read = await readApproval(page);
  expect(read.found, `[data-approval] in the panel ${where}`).toBe(true);
  const said = read.text.includes(APPROVAL_LINK);
  // The states whose words are known (live's, and the down state's from the newest retro) must say
  // it, or not, as components/crew.tsx's approval does on main: a check that finds no words checks
  // nothing.
  if (says !== null)
    expect
      .soft(said, `Approval says ${APPROVAL_LINK} ${where}: "${read.text}"`)
      .toBe(says);
  if (!said) return;
  expect
    .soft(read.links, `Approval's links ${where}: "${read.text}"`)
    .toEqual([{ href: APPROVAL_HREF, text: APPROVAL_LINK }]);
  if (!read.link) return;
  expect
    .soft(
      read.link,
      `the #keel link's paint against the Studio link's ${where}`,
    )
    .toEqual(read.studio);
  const hovered = await hoveredDecorations(page);
  expect
    .soft(
      hovered.own,
      `the #keel link's decoration hovered, against the Studio link's ${where}`,
    )
    .toBe(hovered.other);
}

/** The down state's Approval names the rules when the newest sprint merged on the checks alone. */
const DOWN_SAYS = MERGED.at(-1) ? !MERGED.at(-1)?.ownersCall : null;

test("K10 from /crew's panel, the default server (down): where Approval says <owner>'s rules (it does when the newest sprint merged on the checks alone), those words are its one link, a[href=#keel], painted as the Studio link is at rest and hovered, at 1440 x 900 and 390 x 844 with scripts on; in GET's HTML and with scripts off too; axe clean on the panel", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const html = await withServerHtml(browser, "", "/crew", readApproval);
  if (html.text.includes(APPROVAL_LINK))
    expect
      .soft(html.links, `Approval's links in GET /crew's HTML: "${html.text}"`)
      .toEqual([{ href: APPROVAL_HREF, text: APPROVAL_LINK }]);
  for (const [width, height] of SIZES) {
    for (const scripts of [false, true]) {
      const { context, page } = await contextOf(
        browser,
        width,
        height,
        scripts,
      );
      try {
        await open(page, "/crew");
        const where = `on the default server with scripts ${scripts ? "on" : "off"} at ${width} x ${height}`;
        if (scripts) {
          await k10On(page, DEPLOYED ? null : DOWN_SAYS, where);
          const axe = await new AxeBuilder({ page })
            .include(`${PANEL} [data-approval]`)
            .withTags(AXE_TAGS)
            .analyze();
          expect
            .soft(
              axe.violations.map((v) => `${v.id}: ${v.nodes.length}`),
              `axe on Approval ${where}`,
            )
            .toEqual([]);
        } else {
          const read = await readApproval(page);
          if (read.text.includes(APPROVAL_LINK))
            expect
              .soft(read.links, `Approval's links ${where}: "${read.text}"`)
              .toEqual([{ href: APPROVAL_HREF, text: APPROVAL_LINK }]);
        }
      } finally {
        await context.close();
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------
// K11: it lands

const LANDING_SIZES = [
  [1440, 900],
  [1536, 715],
  [390, 664],
] as const;

/**
 * Where the keel's h2 sits against the bar and the viewport, and the document's layout shifts: a
 * buffered observer's takeRecords(), which gives them with scripts off too (B1.8's rule skips the
 * ones after input, and every one is reported).
 */
function readLanding(page: Page) {
  return page.evaluate(() => {
    const h2 = document.getElementById("keel");
    const bar = [...document.querySelectorAll("header")].find(
      (el) => getComputedStyle(el).position === "sticky",
    );
    const observer = new PerformanceObserver(() => undefined);
    observer.observe({ type: "layout-shift", buffered: true });
    const shifts = observer.takeRecords().map((entry) => {
      const shift = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      return { value: shift.value, input: shift.hadRecentInput };
    });
    observer.disconnect();
    const r = h2?.getBoundingClientRect();
    return {
      url: location.pathname + location.hash,
      h2: r
        ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
        : null,
      bar: bar ? bar.getBoundingClientRect().bottom : null,
      viewport: {
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      },
      scrollY: window.scrollY,
      cls: shifts.filter((s) => !s.input).reduce((sum, s) => sum + s.value, 0),
      shifts,
    };
  });
}

/**
 * K11's assertions on one landing. Scroll offsets are whole pixels while layout is in 1/64 px, so
 * the h2 can land up to a fraction of a pixel under the bar's edge (55.92 against 56 on main's
 * /crew#keel at 1280 x 720): 0.5 px, K7's tolerance.
 */
function expectLanded(
  read: Awaited<ReturnType<typeof readLanding>>,
  where: string,
) {
  expect.soft(read.url, `the page after the click ${where}`).toBe(KEY_HREF);
  const { h2, bar, viewport } = read;
  expect(h2, `h2#keel ${where}`).not.toBeNull();
  if (!h2) return;
  expect.soft(bar, `the bar ${where}`).not.toBeNull();
  const misses = [
    h2.top < (bar ?? 0) - 0.5 &&
      `its top ${h2.top} above the bar's foot ${bar}`,
    h2.bottom > viewport.height + 0.5 &&
      `its bottom ${h2.bottom} below the viewport's ${viewport.height}`,
    h2.left < -0.5 && `its left ${h2.left} past the viewport`,
    h2.right > viewport.width + 0.5 &&
      `its right ${h2.right} past the viewport's ${viewport.width}`,
  ].filter(Boolean);
  expect
    .soft(
      misses,
      `h2#keel wholly in view below the bar ${where} (scrollY ${read.scrollY})`,
    )
    .toEqual([]);
  expect
    .soft(
      read.cls,
      `layout shift after landing ${where}: ${JSON.stringify(read.shifts)}`,
    )
    .toBe(0);
}

/**
 * Clicks `selector` as a visitor does, with the mouse at its centre after scrolling it into the
 * middle of the view: with scripts off, locator actions hang (sprint 5), page.evaluate doesn't.
 */
async function follow(page: Page, selector: string, url: RegExp) {
  const point = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  expect(point, `${selector} to follow`).not.toBeNull();
  if (!point) return;
  await Promise.all([
    page.waitForURL(url, { timeout: 15_000 }),
    page.mouse.click(point.x, point.y),
  ]);
  // Load, the web fonts and two seconds more: what moves after landing moves inside this.
  await page.waitForLoadState("load");
  await pause(2000);
}

const HOME_LINK = `${KEY} a[href="${KEY_HREF}"]`;

test("K11 it lands: from / (WebGL refused), following his rules to /crew#keel at 1440 x 900, 1536 x 715 and 390 x 664 puts h2#keel wholly in view below the bar, with scripts off and on, with no layout shift; at 1440 x 900 the same with WebGL; and from /crew's Approval link (where it shows) at each size with scripts on", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  for (const [width, height] of LANDING_SIZES) {
    for (const scripts of [false, true]) {
      const { context, page } = await contextOf(
        browser,
        width,
        height,
        scripts,
      );
      try {
        await open(page, "/");
        await follow(page, HOME_LINK, /\/crew#keel$/);
        expectLanded(
          await readLanding(page),
          `from / with scripts ${scripts ? "on" : "off"} at ${width} x ${height}`,
        );
      } finally {
        await context.close();
      }
    }
  }

  // With WebGL, as most visitors have it: the model building on both pages moves nothing.
  const run = await openModel(browser, { width: 1440, height: 900 });
  try {
    await run.goto("/");
    await follow(run.page, HOME_LINK, /\/crew#keel$/);
    expectLanded(
      await readLanding(run.page),
      "from / with WebGL at 1440 x 900",
    );
  } finally {
    await run.close();
  }

  // From the panel: an in-page jump, so the page's own shifts are B1.8's and K7's; this reads the
  // landing and that the jump moved nothing.
  for (const [width, height] of LANDING_SIZES) {
    const { context, page } = await contextOf(browser, width, height, true);
    try {
      await open(page, "/crew");
      const link = `${PANEL} [data-approval] a[href="${APPROVAL_HREF}"]`;
      const shows = (await page.locator(link).count()) > 0;
      const where = `from /crew's Approval link at ${width} x ${height}`;
      if (!DEPLOYED && DOWN_SAYS)
        expect(shows, `Approval's #keel link ${where}`).toBe(true);
      if (!shows) continue;
      await follow(page, link, /\/crew#keel$/);
      expectLanded(await readLanding(page), where);
    } finally {
      await context.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------
// K12: the record behind the rules

/** The keel's record line(s), where they sit, and how they're painted. */
function readRecord(page: Page) {
  return page.evaluate(
    ({ keel }) => {
      const squashed = (s: string | null | undefined) =>
        (s ?? "").replace(/\s+/g, " ").replace(/[‘’]/g, "'").trim();
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      const section = document.querySelector(keel);
      const lines = [...document.querySelectorAll("p[data-keel-record]")];
      const p = lines[0] ?? null;
      const follows = (a: Element | null | undefined, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a !== b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const lead = section?.querySelector(".keel-lead") ?? null;
      const rules = section?.querySelector("ol.keel-rules") ?? null;
      let paint: {
        opacity: number;
        visibility: string;
        rendered: boolean;
        copper: string[];
      } | null = null;
      if (p) {
        let opacity = 1;
        for (let a: Element | null = p; a; a = a.parentElement)
          opacity *= Number.parseFloat(getComputedStyle(a).opacity);
        const copper: string[] = [];
        if (rgba) {
          const probe = document.createElement("div");
          probe.style.color = "var(--accent)";
          document.body.append(probe);
          const accent = rgba(getComputedStyle(probe).color);
          probe.remove();
          const near = (value: string) => {
            const c = rgba(value);
            return Boolean(
              c &&
                accent &&
                (c[3] ?? 0) > 0 &&
                [0, 1, 2].every(
                  (i) => Math.abs((c[i] ?? 0) - (accent[i] ?? 0)) <= 2,
                ),
            );
          };
          for (const el of [p, ...p.querySelectorAll("*")]) {
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
              if (value && near(value))
                copper.push(`<${el.tagName.toLowerCase()}> ${prop}`);
          }
        } else copper.push("no __rgba");
        paint = {
          opacity,
          visibility: getComputedStyle(p).visibility,
          rendered: p.getClientRects().length > 0,
          copper,
        };
      }
      return {
        lines: lines.length,
        inKeel: Boolean(p && section?.contains(p)),
        text: squashed(p?.textContent),
        afterLead: follows(lead, p),
        beforeRules: follows(p, rules),
        found: { lead: Boolean(lead), rules: Boolean(rules) },
        paint,
      };
    },
    { keel: KEEL },
  );
}

function expectRecord(
  read: Awaited<ReturnType<typeof readRecord>>,
  where: string,
  painted: boolean,
) {
  expect(read.lines, `p[data-keel-record] on /crew ${where}`).toBe(1);
  expect.soft(read.inKeel, `the record in the keel ${where}`).toBe(true);
  expect.soft(read.text, `the record's words ${where}`).toBe(RECORD);
  expect
    .soft(read.found, `.keel-lead and ol.keel-rules ${where}`)
    .toEqual({ lead: true, rules: true });
  expect
    .soft(
      { afterLead: read.afterLead, beforeRules: read.beforeRules },
      `after .keel-lead and before ol.keel-rules ${where}`,
    )
    .toEqual({ afterLead: true, beforeRules: true });
  if (!painted) return;
  expect
    .soft(
      read.paint,
      `the record shown at full opacity, nothing copper ${where}`,
    )
    .toEqual({ opacity: 1, visibility: "visible", rendered: true, copper: [] });
}

/** /log's Approved column: its Gate and Owner cells, and its rows. */
function readApproved(page: Page) {
  return page.evaluate(
    ({ every, rows }) => {
      const heads = [
        ...(document.querySelector(every)?.querySelectorAll("thead th") ?? []),
      ].map((th) => (th.textContent ?? "").trim());
      const at = heads.indexOf("Approved");
      const cells = [...document.querySelectorAll(rows)].map((tr) =>
        (tr.children[at]?.textContent ?? "").trim(),
      );
      return {
        at,
        rows: cells.length,
        gate: cells.filter((c) => c === "Gate").length,
        owner: cells.filter((c) => c === "Owner").length,
        other: cells.filter((c) => c !== "Gate" && c !== "Owner"),
      };
    },
    { every: EVERY, rows: ROWS },
  );
}

test("K12 the record behind the rules, on the default server: one p[data-keel-record] in the keel after .keel-lead and before ol.keel-rules reads N sprints merged: G on the checks alone, O on Ruslan's own call., G and O from the retros by the Approved column's rule and equal to /log's Gate and Owner cells; in GET /crew's HTML and with scripts off and on at 1440 x 900 and 390 x 844, at full opacity and nothing copper", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);
  // The oracle against the page that already shows the same counts: /log's Approved column.
  await open(page, "/log");
  const approved = await readApproved(page);
  expect(approved.at, "/log's Approved column").toBeGreaterThan(0);
  expect
    .soft(approved.other, "/log's Approved cells that aren't Gate or Owner")
    .toEqual([]);
  if (!DEPLOYED)
    expect
      .soft(
        { rows: approved.rows, gate: approved.gate, owner: approved.owner },
        "/log's rows, Gate and Owner cells against the retros",
      )
      .toEqual({ rows: MERGED.length, gate: GATES, owner: OWNERS });
  const fromLog = `${approved.rows} sprints merged: ${approved.gate} on the checks alone, ${approved.owner} on Ruslan's own call.`;

  const html = await withServerHtml(browser, "", "/crew", readRecord);
  expectRecord(html, "in GET /crew's HTML", false);
  expect
    .soft(html.text, "the record's words against /log's counts")
    .toBe(fromLog);
  for (const [width, height] of SIZES) {
    for (const scripts of [false, true]) {
      const { context, page: shown } = await contextOf(
        browser,
        width,
        height,
        scripts,
      );
      try {
        await open(shown, "/crew");
        expectRecord(
          await readRecord(shown),
          `with scripts ${scripts ? "on" : "off"} at ${width} x ${height}`,
          true,
        );
      } finally {
        await context.close();
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------
// The feed states: K10 and K12 on the live, open and resting fixtures

const FIXTURES = ["live", "open", "resting"] as const;
type Fixture = (typeof FIXTURES)[number];

function reach(crew: Crew, fixture: Fixture) {
  return crew.once(`keel-ways ${fixture}`, async () => {
    const site = await crew.site(fixture, { fixture });
    const shown = await untilState(site.baseURL, fixture, STATE_WAIT);
    return { base: site.baseURL, shown };
  });
}

test.describe("on this checkout's build and the feed's fixtures", () => {
  test.describe.configure({ mode: "default" });
  test.skip(
    DEPLOYED,
    "PLAYWRIGHT_BASE_URL is set: the feed states need this checkout's build served from a copy pointed at the fixture server (B4.22's harness)",
  );
  test.beforeAll(async () => {
    const crew = await crewOf();
    for (const fixture of FIXTURES) void reach(crew, fixture);
  });

  test("K12 in every feed state: on the live, open and resting fixtures, GET /crew's HTML holds the one record line, after .keel-lead and before ol.keel-rules, with the retros' counts; and K10 there: where Approval says <owner>'s rules (live always does) those words are its one link, a[href=#keel], painted as the Studio link, at 1440 x 900 with scripts on", async ({
    browser,
    crew,
  }) => {
    test.setTimeout(150_000);
    for (const fixture of FIXTURES) {
      const site = await reach(crew, fixture);
      expect(
        site.shown.seen,
        `/crew shows ${fixture} within ${STATE_WAIT} ms`,
      ).toBe(fixture);
      expectRecord(
        await withServerHtml(browser, site.base, "/crew", readRecord),
        `in GET /crew's HTML on the ${fixture} fixture`,
        false,
      );
      const html = await withServerHtml(
        browser,
        site.base,
        "/crew",
        readApproval,
      );
      if (html.text.includes(APPROVAL_LINK))
        expect
          .soft(
            html.links,
            `Approval's links in GET /crew's HTML on the ${fixture} fixture: "${html.text}"`,
          )
          .toEqual([{ href: APPROVAL_HREF, text: APPROVAL_LINK }]);
      const { context, page } = await contextOf(browser, 1440, 900, true);
      try {
        await open(page, "/crew", site.base);
        await k10On(
          page,
          fixture === "live" ? true : null,
          `on the ${fixture} fixture at 1440 x 900`,
        );
      } finally {
        await context.close();
      }
    }
  });
});
