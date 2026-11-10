import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { profile } from "../content/profile";
import { SITE_URL } from "../lib/site";
import {
  COLOR_TOKENS,
  horizontalOverflow,
  parseColor,
  resolveColors,
  SCHEMES,
  STEP_TOKENS,
  textStyles,
} from "./helpers";
import { decodePng, pixel } from "./pixels";
import { MERGED } from "./retros";
import {
  addressOf,
  at,
  CHECKS,
  CORNERS,
  frameReady,
  GAP,
  gridWindows,
  isSwept,
  type Kind,
  key,
  kindOf,
  lineOf,
  measureInFrame,
  measureTop,
  NAMED,
  PIN_WINDOWS,
  PINS,
  seeded,
  snap,
  type Win,
} from "./trials";

// Sprint 63, Ta: any window, as a page (.crew/sprint/63/contract.md, T1 to T9), written before the
// build. The frame's address is /trials/frame (.crew/sprint/63/decisions.md, 2). The oracle is
// e2e/trials.ts: the contract's rules, and PINS read from the kept checks themselves.
//
// The page's hooks, agreed with Forge by message on 10 Nov:
// - `main iframe`: exactly one, src "/trials/frame", sandbox "allow-same-origin", inert, its title
//   naming the window, width and height attributes w and h in the server HTML. The frame's own
//   document computes `overflow: hidden` on its root and is w wide with no scrollbar.
// - `[data-freeboard]`: the sweep's value to 0.1 in the attribute ("-6.2"); its text signed, to
//   one decimal ("+29.2", "−6.2", U+2212 or "-").
// - `[data-size]`: the shown window's size, "1440 × 900" (U+00D7). `[data-verdict]`: the verdict.
// - `[data-answer][data-kind]`, kind one of gap | held | near | under | afloat.
// - `[data-waterline]`, the line at the frame's foot; `[data-dimension]`, the box from the links'
//   foot as scaled to the waterline (top the higher of the two, bottom the lower).
// - `[data-rule][data-check="W1"]`, one per check claiming the window: Iris's sentence, its sprint,
//   one `a` to https://github.com/nycruslan/theseus-portfolio/blob/<ref>/e2e/<spec>#L<n>, n the
//   line holding the check's title string. `[data-unclaimed]` for a window no check claims.
// - `a[data-window="<w>x<h>"]` per PINS window, to its address, aria-current="page" when shown.
// - `form[action="/trials/go"]`, method get, number inputs w and h labelled Width and Height.
// - The sweep: lib/trials-sweep.ts, `sweptAt(w, h)` ({ freeboard, sideways } | undefined, the
//   freeboard unrounded) and `SWEEP_META` ({ commit, chromium }), over lib/trials-sweep.json.

const DEPLOYED = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const FRAME = "/trials/frame";
const SWEEP_JSON = "lib/trials-sweep.json";
const SWEEP_COMMAND = "pnpm build && node scripts/trials-sweep.mjs";
const BLOB = "https://github.com/nycruslan/theseus-portfolio/blob";
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

/** A window's size as the page writes it (Forge, Iris): "1440 × 900". */
const sizeWords = ([w, h]: Win) => `${w} × ${h}`;

/** Iris's words (.crew/sprint/63/words.md, 10 Nov), quoted where the checks quote them. */
const VERDICT: Record<Kind, string> = {
  gap: "The crew's own gap",
  held: "Held by the crew's checks",
  near: "A near miss",
  under: "Sunk",
  afloat: "Afloat",
};
const UNCLAIMED = "None of the crew's checks claims this window.";
const NUMBER_WORDS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
/** PINS less the window W8 only reports (words.md's `{held}`). */
const HELD_WINDOWS = PINS.size - 1;

/** `{f}`: the freeboard's absolute value to one decimal. */
const fOf = (freeboard: number) =>
  (Math.round(Math.abs(freeboard) * 10) / 10).toFixed(1);

/** The answer's words for a window, its kind and its unrounded freeboard (words.md, 3). */
function answerWords(win: Win, kind: Kind, freeboard: number) {
  const f = fOf(freeboard);
  const n = PINS.get(key(win))?.codes.length ?? 0;
  switch (kind) {
    case "gap":
      return `The contact links end ${f} px under the waterline, and the crew knew. When it fitted phones in sprint 44, this window was outside the set, and Atlas, the crew's lead, ruled that its check would report where the links land here rather than hold them. Every phone window the crew checks keeps them at least 8 px clear.`;
    case "held":
      return `The contact links stand ${f} px above the waterline, and ${NUMBER_WORDS[n]} of the crew's checks ${n === 1 ? "holds" : "hold"} them there. If a change sank them in this window, the tests would fail and it couldn't merge.`;
    case "near":
      return `The contact links clear the waterline by ${f} px, less than a pixel. With no check holding them here, a change could sink them, and this page would say so.`;
    case "under":
      return `You sank them. The contact links end ${f} px under the waterline, in a window the crew's checks leave alone: they hold the links up in ${HELD_WINDOWS} others.`;
    case "afloat":
      return `The contact links stand ${f} px above the waterline. They float here on the page's own layout.`;
  }
}

const sinks = (kind: Kind) => kind === "gap" || kind === "under";

/** A window's title and description (words.md, 6). */
function headWords(win: Win, kind: Kind, freeboard: number) {
  const f = fOf(freeboard);
  return {
    title: `${sizeWords(win)}: ${VERDICT[kind]}, ${f} px ${sinks(kind) ? "under" : "clear"} — Sea trials — ${profile.name}`,
    description: `${sizeWords(win)}: ${VERDICT[kind]}. ${profile.name}'s contact links end ${f} px ${sinks(kind) ? "below" : "above"} the foot of the first screen. Try to sink them in any window.`,
  };
}

/** Each check's sentence, keyed by code (words.md, 5); W8 has its own at 320 × 568. */
const SENTENCE: Record<string, string> = {
  "B1.1":
    "The first screen says who and what: his name, role, summary and contact links are all in view, and his name is the largest text on the page.",
  W1: "On each laptop window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.",
  W5: "Shrink a 1440-wide window to 700 tall and back: at 700 his name, role, summary, facts and contact links still fit the first screen; at 900 all return to place.",
  W8: "On each phone window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary and contact links fit the first screen with 8 px to spare.",
  W13: "On each tablet window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.",
  W14: "The key that says every name is an AI agent he directs shows whole from 1024 to 1439 wide, and at three windows the crew names it fits the first screen with his name, facts and contact links.",
  P3: "Whatever the crew is doing, in light and dark, the four facts fit the first screen whole with his name, role, summary and contact links, none of them as large as his name.",
  P8: "The key that says every name is an AI agent he directs fits the first screen with the five newest revisions and his name, role and contact links, whatever the crew is doing.",
  "B4.22":
    "While the crew works, waits or rests, the first screen keeps his name, role, summary and contact links, and at 1440 × 900 the line for what the crew is doing now.",
  H10: "The link to rebuild the ship moved nothing down: from 1380 to 1440 wide at 900 tall, in every state and font, the contact links sit no lower than before, in view.",
};
const W8_REPORTED =
  "Reports where his contact links land in this window and doesn't hold them: Atlas ruled it outside the phone windows the crew fitted.";
const sentenceFor = (code: string, win: Win) =>
  code === "W8" && key(win) === key(GAP) ? W8_REPORTED : SENTENCE[code];

// ---------------------------------------------------------------------------------------------
// The sweep, loaded at run time so a missing module fails the checks that read it, not the file.

type Swept = { freeboard: number; sideways: boolean };
type SweepModule = {
  sweptAt?: (w: number, h: number) => Swept | undefined;
  SWEEP_META?: { commit?: unknown; chromium?: unknown };
};
// A variable specifier: the module lands with Forge's build, and tsc mustn't fail until then.
const SWEEP_MODULE = "../lib/trials-sweep";
async function loadSweep(): Promise<SweepModule> {
  try {
    return (await import(SWEEP_MODULE)) as SweepModule;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------------------------
// Reads

async function context(
  browser: Browser,
  scripts: boolean,
  width = 1440,
  height = 900,
) {
  return browser.newContext({
    javaScriptEnabled: scripts,
    viewport: { width, height },
  });
}

/** A window's trials page at the visitor's current viewport, its frame parsed. */
async function openWindow(page: Page, win: Win) {
  const response = await page.goto(addressOf(win));
  const ready = await frameReady(page);
  return { status: response?.status(), ready };
}

/** The head's words, from server HTML. */
function headOf(html: string) {
  const attr = (tag: string, name: string) =>
    tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
  const decode = (s: string | null) =>
    s === null
      ? null
      : s
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;|&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
  return {
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null),
    description: decode(
      attr(metas.find((m) => /name="description"/.test(m)) ?? "", "content"),
    ),
    robots: attr(metas.find((m) => /name="robots"/.test(m)) ?? "", "content"),
    canonical: links
      .filter((l) => /rel="canonical"/.test(l))
      .map((l) => attr(l, "href")),
    iframes: [...html.matchAll(/<iframe\b[^>]*>/g)].map((m) => m[0]),
  };
}

/** What the trials page shows for its window, read in the parent document. */
function readout(page: Page) {
  return page.evaluate(() => {
    const text = (sel: string) => {
      const el = document.querySelector(sel);
      return el ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : null;
    };
    const answer = document.querySelector("[data-answer]");
    return {
      freeboard:
        document
          .querySelector("[data-freeboard]")
          ?.getAttribute("data-freeboard") ?? null,
      freeboardText: text("[data-freeboard]"),
      size: text("[data-size]"),
      verdict: text("[data-verdict]"),
      answers: document.querySelectorAll("[data-answer]").length,
      kind: answer?.getAttribute("data-kind") ?? null,
      answer: text("[data-answer]"),
      rules: [...document.querySelectorAll("[data-rule]")].map((li) => ({
        check: li.getAttribute("data-check"),
        text: (li.textContent ?? "").replace(/\s+/g, " ").trim(),
        links: [...li.querySelectorAll("a")].map((a) => a.href),
        linkTexts: [...li.querySelectorAll("a")].map((a) =>
          (a.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
      })),
      unclaimed: [...document.querySelectorAll("[data-unclaimed]")].map((el) =>
        (el.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    };
  });
}

/** Every visible text node in the parent document (the frame is another document). */
function visibleTexts(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, template, noscript"))
        continue;
      if (
        !parent.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        })
      )
        continue;
      const t = (node.textContent ?? "").trim();
      if (t) out.push(t);
    }
    return out;
  });
}

const CODE = /\b[A-Z]{1,2}\d+(\.\d+)*\b/;
/** A URL path: a slash that starts a token, followed by a path character. */
const URL_PATH = /(?:^|[^\w/])\/[A-Za-z0-9_-]/;

/** The boxes T3 and T7 read, in the parent's viewport. */
function boxes(page: Page) {
  return page.evaluate(() => {
    const edges = (el: Element | null) => {
      if (!el || el.getClientRects().length === 0) return null;
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
    const answer = document.querySelector("[data-answer]");
    let firstLine = null;
    if (answer) {
      const range = document.createRange();
      range.selectNodeContents(answer);
      const r = [...range.getClientRects()].find(
        (b) => b.width > 0 && b.height > 0,
      );
      if (r)
        firstLine = {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
    }
    const iframe = document.querySelector("main iframe");
    return {
      viewport: {
        width: document.documentElement.clientWidth,
        height: innerHeight,
      },
      frame: edges(iframe),
      column: edges(iframe?.parentElement ?? null),
      waterline: edges(document.querySelector("[data-waterline]")),
      dimension: edges(document.querySelector("[data-dimension]")),
      h1: edges(document.querySelector("h1")),
      size: edges(document.querySelector("[data-size]")),
      freeboard: edges(document.querySelector("[data-freeboard]")),
      verdict: edges(document.querySelector("[data-verdict]")),
      answerFirstLine: firstLine,
    };
  });
}

type Box = { left: number; top: number; right: number; bottom: number };
const whollyIn = (b: Box | null, v: { width: number; height: number }) =>
  b !== null &&
  b.left >= -0.5 &&
  b.top >= -0.5 &&
  b.right <= v.width + 0.5 &&
  b.bottom <= v.height + 0.5;

/** A page that records CSP refusals: console lines and securitypolicyviolation events. */
async function watchCsp(ctx: BrowserContext, page: Page) {
  const refused: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text()))
      refused.push(message.text());
  });
  await ctx.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(
        `Content Security Policy refusal: ${e.violatedDirective} ${e.blockedURI}`,
      );
    });
  });
  return refused;
}

// ---------------------------------------------------------------------------------------------

const T1_GRID = seeded(
  6301,
  50,
  new Set([...PIN_WINDOWS, ...NAMED, ...CORNERS].map(key)),
);

test("T1 every window is an address: /trials and the swept windows (PINS, the named windows, the grid's corners and 50 seeded grid windows) are 200 with scripts on and off; 330x560 307s to /trials/336x560, /trials/1440x900 308s to /trials, 319x568, 1921x900, 320x1101, 0320x568 and 320x568x2 are 404; /trials/go 303s by the same rules and to /trials without numbers; each window's title and description carry its size and verdict and its canonical is its own address; the sitemap lists /trials and no window page nor the frame's address, and robots disallows neither", async ({
  request,
  browser,
}) => {
  test.setTimeout(240_000);
  const sweep = await loadSweep();
  const windows: Win[] = [...PIN_WINDOWS, ...NAMED, ...CORNERS, ...T1_GRID];
  expect(windows.length, "T1's windows").toBe(PINS.size + 4 + 4 + 50);
  expect(windows.every(isSwept), "T1's windows are all swept").toBe(true);

  // Statuses, scripts on and off, in one page each.
  const wrong: string[] = [];
  for (const scripts of [true, false]) {
    const ctx = await context(browser, scripts);
    const page = await ctx.newPage();
    for (const path of ["/trials", ...windows.map(addressOf)]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      if (response?.status() !== 200 || new URL(page.url()).pathname !== path)
        wrong.push(
          `${path} scripts ${scripts ? "on" : "off"}: ${response?.status()} at ${new URL(page.url()).pathname}`,
        );
    }
    await ctx.close();
  }
  expect.soft(wrong, "swept windows not 200 at their own address").toEqual([]);

  // The redirects and the 404s.
  const answer = async (path: string) => {
    const r = await request.get(path, { maxRedirects: 0 });
    const location = r.headers().location;
    return {
      status: r.status(),
      to: location
        ? new URL(location, "http://x").pathname +
          new URL(location, "http://x").search
        : null,
    };
  };
  expect
    .soft(snap([330, 560]), "the oracle's grid window for 330 x 560")
    .toEqual([336, 560]);
  for (const [path, status, to] of [
    ["/trials/330x560", 307, "/trials/336x560"],
    ["/trials/1440x900", 308, "/trials"],
    ["/trials/319x568", 404, null],
    ["/trials/1921x900", 404, null],
    ["/trials/320x1101", 404, null],
    ["/trials/0320x568", 404, null],
    ["/trials/320x568x2", 404, null],
    ["/trials/go?w=1366&h=595", 303, "/trials/1366x595"],
    ["/trials/go?w=330&h=560", 303, "/trials/336x560"],
    ["/trials/go?w=abc", 303, "/trials"],
  ] as const) {
    expect.soft(await answer(path), path).toEqual({ status, to });
  }
  // A 404 is the site's 404 page.
  const notFound = await request.get("/no-such-page");
  const unknown = await request.get("/trials/319x568");
  expect
    .soft(
      headOf(await unknown.text()).title,
      "/trials/319x568's title, the 404's",
    )
    .toBe(headOf(await notFound.text()).title);

  // Each window's head: its size, its verdict, its own canonical.
  const heads: string[] = [];
  for (const win of windows) {
    const html = await (await request.get(addressOf(win))).text();
    const head = headOf(html);
    const swept = sweep.sweptAt?.(win[0], win[1]);
    const kind = swept ? kindOf(win, swept.freeboard) : null;
    const want = swept && kind ? headWords(win, kind, swept.freeboard) : null;
    const problems = [
      !head.title?.includes(sizeWords(win)) && "title lacks its size",
      !head.description?.includes(sizeWords(win)) &&
        "description lacks its size",
      kind === null && "no sweep value to take the verdict from",
      want && head.title !== want.title && `title, want "${want.title}"`,
      want &&
        head.description !== want.description &&
        `description, want "${want.description}"`,
      JSON.stringify(head.canonical) !==
        JSON.stringify([`${SITE_URL}${addressOf(win)}`]) &&
        `canonical ${JSON.stringify(head.canonical)}`,
    ].filter(Boolean);
    if (problems.length > 0)
      heads.push(
        `${at(win)} ("${head.title}" / "${head.description}"): ${problems.join(", ")}`,
      );
  }
  expect
    .soft(heads, "windows whose head misses its size, verdict or canonical")
    .toEqual([]);

  // The sitemap and robots.
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (m) => m[1] ?? "",
  );
  expect
    .soft(locs, "the sitemap lists /trials")
    .toContain(`${SITE_URL}/trials`);
  expect
    .soft(
      locs.filter((loc) => loc.startsWith(`${SITE_URL}/trials/`)),
      "window pages or the frame's address in the sitemap",
    )
    .toEqual([]);
  const robots = await (await request.get("/robots.txt")).text();
  const disallowed = [...robots.matchAll(/^\s*Disallow:\s*(\S*)/gim)]
    .map((m) => m[1] ?? "")
    .filter((rule) => rule !== "")
    .filter((rule) =>
      ["/trials", "/trials/1366x595", FRAME].some((p) => p.startsWith(rule)),
    );
  expect.soft(disallowed, "robots rules that disallow the trials").toEqual([]);
});

test("T2 the frame is the page, at the window: in main one iframe, sandbox exactly allow-same-origin, inert, titled with the window, its box sized in the server HTML; through contentDocument, scripts on and off, its document is w x h, never scrolls and draws no scrollbar, and its main equals /'s main in the down state from the same server; it runs no script (no canvas, no 3D chunk, no /api/crew); drawn, its box keeps w:h within 1 px and stays inside its column at every viewport from 320 to 1920", async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const windows: Win[] = [
    [1440, 900],
    GAP,
    [390, 664],
    [1366, 595],
    [1920, 1100],
    [320, 460],
  ];

  // /'s main as the server renders it, read with scripts off; React's generated ids aside.
  const ids = (html: string) =>
    html
      .replace(/_R_[A-Za-z0-9_]*_/g, "«id»")
      .replace(/«[^»]*»/g, "«id»")
      .replace(/:r[0-9a-z]+:/g, "«id»");
  let homeMain = "";
  const homeHtml = await (await request.get("/")).text();
  const homeScripts = new Set(
    [...homeHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(
      (m) => new URL(m[1] ?? "", "http://x").pathname,
    ),
  );
  expect(homeScripts.size, "scripts /'s HTML names").toBeGreaterThan(0);
  {
    const ctx = await context(browser, false);
    const page = await ctx.newPage();
    expect((await page.goto("/"))?.status(), "status of /").toBe(200);
    homeMain = ids(
      await page.evaluate(
        () => document.querySelector("main")?.outerHTML ?? "",
      ),
    );
    await ctx.close();
  }
  expect(homeMain.length, "/'s main").toBeGreaterThan(0);

  for (const win of windows) {
    const [w, h] = win;
    const head = headOf(await (await request.get(addressOf(win))).text());
    expect
      .soft(head.iframes, `iframes in ${addressOf(win)}'s server HTML`)
      .toHaveLength(1);
    const tag = head.iframes[0] ?? "";
    expect
      .soft(
        {
          width: tag.match(/\bwidth="(\d+)"/)?.[1],
          height: tag.match(/\bheight="(\d+)"/)?.[1],
        },
        `the iframe's size in ${addressOf(win)}'s server HTML: ${tag}`,
      )
      .toEqual({ width: String(w), height: String(h) });

    for (const scripts of [true, false]) {
      const where = `${at(win)}, scripts ${scripts ? "on" : "off"}`;
      const ctx = await context(browser, scripts);
      const page = await ctx.newPage();
      const fromFrame: string[] = [];
      const crewApi: string[] = [];
      page.on("request", (req) => {
        if (req.frame() !== page.mainFrame()) {
          if (req.resourceType() === "script") fromFrame.push(req.url());
        }
        if (new URL(req.url()).pathname.startsWith("/api/crew"))
          crewApi.push(req.url());
      });
      const opened = await openWindow(page, win);
      expect
        .soft(opened, `${addressOf(win)} opened and its frame parsed, ${where}`)
        .toEqual({ status: 200, ready: true });
      const read = await page.evaluate(() => {
        const frames = document.querySelectorAll("main iframe");
        const f = frames[0] as HTMLIFrameElement | undefined;
        const doc = f?.contentDocument;
        const win = f?.contentWindow;
        const root = doc?.documentElement;
        const style = root ? win?.getComputedStyle(root) : undefined;
        return {
          iframes: document.querySelectorAll("iframe").length,
          inMain: frames.length,
          src: f?.getAttribute("src") ?? null,
          sandbox: f?.getAttribute("sandbox") ?? null,
          inert: f?.inert ?? null,
          title: f?.getAttribute("title") ?? null,
          clientWidth: root?.clientWidth ?? null,
          innerWidth: win?.innerWidth ?? null,
          innerHeight: win?.innerHeight ?? null,
          overflow: style ? [style.overflowX, style.overflowY] : null,
          scrollY: win?.scrollY ?? null,
          canvases: doc?.querySelectorAll("canvas").length ?? null,
          // Next's bootstrap defines this when the page's scripts run.
          ran: typeof (win as (Window & { __next_f?: unknown }) | null)
            ?.__next_f,
          main: doc?.querySelector("main")?.outerHTML ?? "",
        };
      });
      expect
        .soft(
          {
            iframes: read.iframes,
            inMain: read.inMain,
            src: read.src,
            sandbox: read.sandbox,
            inert: read.inert,
            title: read.title,
          },
          `the iframe, ${where} (title "${read.title}")`,
        )
        .toEqual({
          iframes: 1,
          inMain: 1,
          src: FRAME,
          sandbox: "allow-same-origin",
          inert: true,
          title: `${profile.name}'s first page in a ${sizeWords(win)} window`,
        });
      expect
        .soft(
          {
            clientWidth: read.clientWidth,
            innerWidth: read.innerWidth,
            innerHeight: read.innerHeight,
            overflow: read.overflow,
            scrollY: read.scrollY,
            canvases: read.canvases,
            ran: read.ran,
          },
          `the frame's document, ${where}`,
        )
        .toEqual({
          clientWidth: w,
          innerWidth: w,
          innerHeight: h,
          overflow: ["hidden", "hidden"],
          scrollY: 0,
          canvases: 0,
          ran: "undefined",
        });
      // Wheel over the frame: it doesn't scroll.
      const box = await page.evaluate(() => {
        const r = document
          .querySelector("main iframe")
          ?.getBoundingClientRect();
        return r
          ? { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 100) }
          : null;
      });
      if (box) {
        await page.mouse.move(box.x, box.y);
        await page.mouse.wheel(0, 400);
        await new Promise((done) => setTimeout(done, 200));
        expect
          .soft(
            await page.evaluate(
              () =>
                (
                  document.querySelector(
                    "main iframe",
                  ) as HTMLIFrameElement | null
                )?.contentWindow?.scrollY ?? null,
            ),
            `the frame's scrollY after a wheel over it, ${where}`,
          )
          .toBe(0);
      }
      if (DEPLOYED) {
        test.info().annotations.push({
          type: "skipped clause",
          description:
            "PLAYWRIGHT_BASE_URL is set: a deployment's / renders the live feed, so the frame's main isn't compared with it (Lens's nit on #129)",
        });
      } else {
        expect
          .soft(
            ids(read.main) === homeMain,
            `the frame's main equals /'s, character for character, ${where} (frame ${read.main.length} chars, / ${homeMain.length})`,
          )
          .toBe(true);
      }
      await new Promise((done) => setTimeout(done, 300));
      // Decision 4: a frame sandboxed without allow-scripts still fetches the scripts in /'s
      // HTML and runs none, so it may request only what /'s HTML names (no 3D chunk, which only a
      // running page imports).
      expect
        .soft(
          fromFrame.filter((url) => !homeScripts.has(new URL(url).pathname)),
          `script requests from inside the frame that /'s HTML doesn't name, ${where}`,
        )
        .toEqual([]);
      expect.soft(crewApi, `requests for /api/crew, ${where}`).toEqual([]);
      await ctx.close();
    }
  }

  // Drawn: w:h within 1 px and inside its column, every 16 px from 320 to 1920, resized.
  const ctx = await context(browser, false, 320, 900);
  const page = await ctx.newPage();
  const off: string[] = [];
  for (const win of [
    [1440, 900],
    [320, 1100],
    [1920, 460],
  ] as Win[]) {
    await openWindow(page, win);
    for (let width = 320; width <= 1920; width += 16) {
      for (const height of [568, 900]) {
        await page.setViewportSize({ width, height });
        const b = await boxes(page);
        const ratio = b.frame
          ? Math.abs(b.frame.height - (b.frame.width * win[1]) / win[0])
          : Number.NaN;
        const inside =
          b.frame !== null &&
          b.column !== null &&
          b.frame.left >= b.column.left - 0.5 &&
          b.frame.right <= b.column.right + 0.5 &&
          b.frame.left >= -0.5 &&
          b.frame.right <= b.viewport.width + 0.5;
        if (!(ratio <= 1) || !inside)
          off.push(
            `${at(win)} at ${width} x ${height}: ratio off ${ratio.toFixed(2)} px, frame ${JSON.stringify(b.frame)}, column ${JSON.stringify(b.column)}`,
          );
      }
    }
  }
  await ctx.close();
  expect
    .soft(off, "viewports where the drawn frame loses w:h or leaves its column")
    .toEqual([]);
});

/** T3's windows and production's readings on 10 Nov; below 1024 they hold in every state. */
const T3: readonly [Win, number][] = [
  [[320, 568], -6.2],
  [[390, 664], 201.8],
  [[1024, 640], 11.7],
  [[1056, 630], 0.2],
  [[1366, 595], 0.7],
  [[1366, 625], 21.7],
  // Decision 5: +37.0 since sprint 62's revision block; from 1024 the build's sweep governs.
  [[1440, 900], 37.0],
];

test("T3 the freeboard and the waterline: [data-freeboard] shows the sweep's value for the window and equals a direct measure by the rule within 0.5 px at 320x568, 390x664, 1024x640, 1056x630, 1366x595, 1366x625 and 1440x900 (production's readings below 1024 held); the waterline at the frame's foot and the dimension from the links' foot, as scaled, to the waterline, within 1 px; the measure inside the frame equals the top-level one within 0.5 px", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const sweep = await loadSweep();
  expect
    .soft(
      typeof sweep.sweptAt,
      `lib/trials-sweep.ts's sweptAt (${SWEEP_COMMAND} writes the sweep)`,
    )
    .toBe("function");

  // The direct measure: the frame's address top-level at w x h, scripts off, fonts ready.
  const top = await context(browser, false);
  const direct = await top.newPage();
  expect((await direct.goto(FRAME))?.status(), `status of ${FRAME}`).toBe(200);
  await direct.evaluate(() => document.fonts.ready);
  const measured = new Map<string, number>();
  const lines: string[] = [];
  for (const [win, production] of T3) {
    await direct.setViewportSize({ width: win[0], height: win[1] });
    const m = await measureTop(direct);
    expect
      .soft(m.found, `contact links in ${FRAME}'s title block at ${at(win)}`)
      .toBe(3);
    measured.set(key(win), m.freeboard);
    lines.push(
      `${at(win)}: ${m.freeboard.toFixed(2)} (production ${production})`,
    );
    if (win[0] < 1024)
      expect
        .soft(
          Math.abs(m.freeboard - production),
          `the direct measure at ${at(win)}, ${m.freeboard.toFixed(2)}, against production's ${production}`,
        )
        .toBeLessThanOrEqual(0.5);
  }
  test.info().annotations.push({
    type: "direct measure",
    description: lines.join("; "),
  });
  await top.close();

  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ] as const) {
    const ctx = await context(browser, false, width, height);
    const page = await ctx.newPage();
    for (const [win] of T3) {
      const where = `${addressOf(win)} at ${width} x ${height}`;
      const opened = await openWindow(page, win);
      expect
        .soft(opened, `${where} opened, its frame parsed`)
        .toEqual({ status: 200, ready: true });
      const r = await readout(page);
      const direct = measured.get(key(win)) ?? Number.NaN;
      const swept = sweep.sweptAt?.(win[0], win[1]);
      const value = Number(r.freeboard);
      expect.soft(r.freeboard, `[data-freeboard] on ${where}`).not.toBeNull();
      if (swept)
        expect
          .soft(
            value,
            `[data-freeboard] against the sweep's ${swept.freeboard} on ${where}`,
          )
          .toBeCloseTo(swept.freeboard, 1);
      expect
        .soft(
          Math.abs(value - direct),
          `[data-freeboard] ${r.freeboard} against the direct measure ${direct.toFixed(2)} on ${where}`,
        )
        .toBeLessThanOrEqual(0.5);
      // Iris's words, 2: the signed value then " px", U+2212 for minus, the sign the kind's.
      const sinking = swept ? swept.freeboard < 0 : value < 0;
      expect
        .soft(
          r.freeboardText,
          `[data-freeboard]'s text, signed to one decimal, on ${where}`,
        )
        .toBe(`${sinking ? "\u2212" : "+"}${Math.abs(value).toFixed(1)} px`);

      const inFrame = await measureInFrame(page);
      expect
        .soft(
          Math.abs((inFrame?.freeboard ?? Number.NaN) - direct),
          `the measure inside the frame (${inFrame?.freeboard}) against the top-level one (${direct}) on ${where}`,
        )
        .toBeLessThanOrEqual(0.5);

      const b = await boxes(page);
      if (!b.frame || !inFrame) {
        expect.soft(b.frame, `the frame's box on ${where}`).not.toBeNull();
        continue;
      }
      const scale = b.frame.height / win[1];
      const foot = b.frame.top + inFrame.foot * scale;
      const waterline = b.waterline;
      expect
        .soft(
          waterline !== null &&
            b.frame.bottom >= waterline.top - 1 &&
            b.frame.bottom <= waterline.bottom + 1,
          `the waterline ${JSON.stringify(waterline)} at the frame's foot ${b.frame.bottom.toFixed(2)} on ${where}`,
        )
        .toBe(true);
      const dim = b.dimension;
      const [upper, lower] = [
        Math.min(foot, b.frame.bottom),
        Math.max(foot, b.frame.bottom),
      ];
      expect
        .soft(
          dim !== null &&
            Math.abs(dim.top - upper) <= 1 &&
            Math.abs(dim.bottom - lower) <= 1,
          `the dimension ${JSON.stringify(dim)} from ${upper.toFixed(2)} to ${lower.toFixed(2)} (links' foot ${foot.toFixed(2)} as scaled, frame's foot ${b.frame.bottom.toFixed(2)}) on ${where}`,
        )
        .toBe(true);
    }
    await ctx.close();
  }
});

const T4_GRID = seeded(6304, 100, new Set([...PIN_WINDOWS, ...NAMED].map(key)));

test("T4 the sweep is current: the committed sweep holds every swept window (its freeboard and whether anything scrolls sideways), with its commit and Chromium; it is imported, never read at render, at most 64 KB and in the server bundle only; a fresh measure at every PINS window, the named windows and 100 seeded grid windows equals it within 0.5 px, and nothing scrolls sideways", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const rewrite = `rewrite it with \`${SWEEP_COMMAND}\``;
  const sweep = await loadSweep();
  expect(
    typeof sweep.sweptAt,
    `lib/trials-sweep.ts exports sweptAt; ${rewrite}`,
  ).toBe("function");
  const sweptAt = sweep.sweptAt ?? (() => undefined);
  const meta = sweep.SWEEP_META;
  expect
    .soft(
      {
        commit: /^[0-9a-f]{7,40}$/.test(String(meta?.commit)),
        chromium: /^\d+\.\d+\.\d+\.\d+$/.test(String(meta?.chromium)),
      },
      `SWEEP_META's commit (${meta?.commit}) and Chromium (${meta?.chromium})`,
    )
    .toEqual({ commit: true, chromium: true });
  test.info().annotations.push({
    type: "chromium",
    description: `the sweep's ${meta?.chromium}, this run's ${browser.version()}`,
  });

  // Every swept window is in it.
  const missing: string[] = [];
  for (const win of [...gridWindows(), ...PIN_WINDOWS, ...NAMED]) {
    const s = sweptAt(win[0], win[1]);
    if (!s || !Number.isFinite(s.freeboard) || typeof s.sideways !== "boolean")
      missing.push(at(win));
  }
  expect
    .soft(
      missing.length,
      `swept windows the sweep lacks (first: ${missing.slice(0, 5).join(", ")}); ${rewrite}`,
    )
    .toBe(0);
  expect
    .soft(
      sweptAt(319, 568),
      "the sweep holds no window off the swept set (319 x 568)",
    )
    .toBeUndefined();

  // Imported, never read at render; at most 64 KB; in the server bundle only.
  if (!DEPLOYED) {
    const raw = readFileSync(join(process.cwd(), SWEEP_JSON));
    test.info().annotations.push({
      type: "sweep size",
      description: `${raw.length} B raw`,
    });
    expect
      .soft(raw.length, `${SWEEP_JSON}'s raw bytes`)
      .toBeLessThanOrEqual(64 * 1024);
    const code = ["app", "components", "lib"].flatMap((dir) =>
      readdirSync(join(process.cwd(), dir), {
        recursive: true,
        encoding: "utf8",
      })
        .filter((f) => /\.(tsx?|mjs)$/.test(f))
        .map((f) => ({
          file: `${dir}/${f}`,
          text: readFileSync(join(process.cwd(), dir, f), "utf8"),
        })),
    );
    expect
      .soft(
        code
          .filter(
            ({ text }) =>
              /trials-sweep\.json/.test(text) &&
              /\b(readFileSync|readFile|createReadStream)\b/.test(text),
          )
          .map((c) => c.file),
        "files that read the sweep with fs",
      )
      .toEqual([]);
    expect
      .soft(
        code.some(({ text }) =>
          /import[^;]*["'][^"']*trials-sweep\.json["']/.test(text),
        ),
        "a module imports the sweep",
      )
      .toBe(true);
    const sample = raw
      .toString("utf8")
      .slice(Math.floor(raw.length / 2), Math.floor(raw.length / 2) + 48);
    const staticDir = join(process.cwd(), ".next", "static");
    const leaked = readdirSync(staticDir, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".js") && statSync(join(staticDir, f)).isFile())
      .filter((f) => readFileSync(join(staticDir, f), "utf8").includes(sample));
    expect.soft(leaked, "client chunks holding the sweep").toEqual([]);
  }

  // The fresh measure, one scripts-off page resized window to window.
  const ctx = await context(browser, false);
  const page = await ctx.newPage();
  expect((await page.goto(FRAME))?.status(), `status of ${FRAME}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const stale: string[] = [];
  const sideways: string[] = [];
  const windows = [...PIN_WINDOWS, ...NAMED, ...T4_GRID];
  for (const win of windows) {
    await page.setViewportSize({ width: win[0], height: win[1] });
    const m = await measureTop(page);
    const s = sweptAt(win[0], win[1]);
    if (m.found !== 3 || !s || !(Math.abs(m.freeboard - s.freeboard) <= 0.5))
      stale.push(
        `${at(win)}: measured ${m.freeboard.toFixed(2)} (${m.found} links), swept ${s?.freeboard}`,
      );
    if (m.overflow > 0 || s?.sideways !== false)
      sideways.push(
        `${at(win)}: measured ${m.overflow} px, swept ${s?.sideways}`,
      );
  }
  await ctx.close();
  expect
    .soft(
      stale,
      `windows where the sweep differs from a fresh measure by more than 0.5 px; ${rewrite}`,
    )
    .toEqual([]);
  expect
    .soft(
      sideways,
      `windows where something scrolls sideways, measured or swept; ${rewrite}`,
    )
    .toEqual([]);
});

const ANSWERS: readonly [Win, Kind][] = [
  [GAP, "gap"],
  [[1440, 900], "held"],
  [[1366, 595], "near"],
  [[320, 460], "under"],
  [[1920, 1100], "afloat"],
];

test("T5 the rules and the answer: for a PINS window one rule per check, Iris's sentence, its sprint (a merged retro) and a link to its spec file and line at the build's commit; for any other window one line saying no check claims it; the answer is the rule's kind in Iris's words (320x568 the gap, 1440x900 held, 1366x595 a near miss, 320x460 under, 1920x1100 afloat); no visible text has a check code or a URL path", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const sweep = await loadSweep();
  const refs = DEPLOYED
    ? /^(main|[0-9a-f]{40})$/
    : new RegExp(`^${process.env.VERCEL_GIT_COMMIT_SHA || "main"}$`);
  const merged = new Set(MERGED.map((r) => r.sprint));
  const lines = new Map(CHECKS.map((c) => [c.code, lineOf(c)]));
  expect
    .soft(
      [...lines].filter(([, n]) => n === 0).map(([c]) => c),
      "checks whose title the oracle can't find in its spec",
    )
    .toEqual([]);

  const ctx = await context(browser, false);
  const page = await ctx.newPage();
  const ruleProblems: string[] = [];
  const words: string[] = [];
  const unclaimed = [...NAMED, ...CORNERS, ...T1_GRID.slice(0, 5)];
  for (const win of [...PIN_WINDOWS, ...unclaimed]) {
    const response = await page.goto(addressOf(win));
    if (response?.status() !== 200) {
      ruleProblems.push(`${addressOf(win)}: ${response?.status()}`);
      continue;
    }
    const r = await readout(page);
    const swept = sweep.sweptAt?.(win[0], win[1]);
    if (!swept || r.kind !== kindOf(win, swept.freeboard))
      ruleProblems.push(
        `${at(win)}: the answer's kind ${r.kind}, the sweep's ${swept ? kindOf(win, swept.freeboard) : "missing"}`,
      );
    const pin = PINS.get(key(win));
    if (pin) {
      const got = r.rules.map((rule) => rule.check);
      // Iris's order (words.md, 4): by sprint, oldest first, then by code.
      const sprintOf = (code: string | null) =>
        CHECKS.find((c) => c.code === code)?.sprint ?? 0;
      const inOrder = [...got].sort(
        (a, b) =>
          sprintOf(a) - sprintOf(b) || String(a).localeCompare(String(b)),
      );
      if (JSON.stringify(got) !== JSON.stringify(inOrder))
        ruleProblems.push(
          `${at(win)}: rules in the order ${JSON.stringify(got)}, want ${JSON.stringify(inOrder)}`,
        );
      if (
        JSON.stringify([...got].sort()) !==
          JSON.stringify([...pin.codes].sort()) ||
        r.unclaimed.length > 0
      )
        ruleProblems.push(
          `${at(win)}: rules ${JSON.stringify(got)}, want ${JSON.stringify(pin.codes)}; unclaimed lines ${r.unclaimed.length}`,
        );
      for (const rule of r.rules) {
        const check = CHECKS.find((c) => c.code === rule.check);
        if (!check) continue;
        const sentence = sentenceFor(check.code, win);
        const href = rule.links[0] ?? "";
        const m = href.match(
          /^https:\/\/github\.com\/nycruslan\/theseus-portfolio\/blob\/([^/]+)\/(.+)#L(\d+)$/,
        );
        const problems = [
          rule.links.length !== 1 && `${rule.links.length} links`,
          !m && `link ${href} not ${BLOB}/<ref>/e2e/<spec>#L<n>`,
          m && !refs.test(m[1] ?? "") && `ref ${m[1]}`,
          m &&
            m[2] !== `e2e/${check.spec}` &&
            `path ${m[2]}, want e2e/${check.spec}`,
          m &&
            Number(m[3]) !== lines.get(check.code) &&
            `line ${m[3]}, want ${lines.get(check.code)}`,
          !merged.has(check.sprint) &&
            `sprint ${check.sprint} has no merged retro`,
          !rule.text.includes(`Sprint ${check.sprint}`) &&
            `no "Sprint ${check.sprint}" in "${rule.text}"`,
          rule.linkTexts[0] !== sentence &&
            `link text "${rule.linkTexts[0]}", want Iris's sentence "${sentence}"`,
        ].filter(Boolean);
        if (problems.length > 0)
          ruleProblems.push(`${at(win)} ${check.code}: ${problems.join(", ")}`);
      }
    } else if (
      r.rules.length !== 0 ||
      r.unclaimed.length !== 1 ||
      r.unclaimed[0] !== UNCLAIMED
    ) {
      ruleProblems.push(
        `${at(win)}: ${r.rules.length} rules, unclaimed lines ${JSON.stringify(r.unclaimed)}`,
      );
    }
    for (const t of await visibleTexts(page)) {
      if (CODE.test(t) || URL_PATH.test(t))
        words.push(`${at(win)}: "${t.slice(0, 80)}"`);
    }
  }
  expect
    .soft(ruleProblems, "the rules against PINS and the checks")
    .toEqual([]);
  expect
    .soft([...new Set(words)], "visible text with a check code or a URL path")
    .toEqual([]);

  for (const [win, kind] of ANSWERS) {
    await page.goto(addressOf(win));
    const r = await readout(page);
    expect.soft(r.answers, `answers on ${addressOf(win)}`).toBe(1);
    expect.soft(r.kind, `the answer's kind on ${addressOf(win)}`).toBe(kind);
    const swept = sweep.sweptAt?.(win[0], win[1]);
    expect
      .soft(
        r.answer,
        `the answer's words on ${addressOf(win)}, by the sweep's ${swept?.freeboard}`,
      )
      .toBe(swept ? answerWords(win, kind, swept.freeboard) : "(no sweep)");
    expect
      .soft(r.verdict, `the verdict on ${addressOf(win)}`)
      .toBe(VERDICT[kind]);
  }
  await ctx.close();
});

test("T6 choose a window, without script: a form with labelled number inputs Width and Height (the grid's limits, required) and a submit button; each PINS window one a[data-window] to its address, the shown one aria-current=page; scripts off at 390x844, /trials, then 320x568's link (the gap), then 1366 and 595 submitted (the near miss at /trials/1366x595 through /trials/go's 303), then Back lands on 320x568", async ({
  browser,
}) => {
  const ctx = await context(browser, false, 390, 844);
  const page = await ctx.newPage();
  expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(200);

  const form = page.locator('form[action="/trials/go"]');
  await expect(form, "the form to /trials/go").toHaveCount(1);
  expect
    .soft(
      (await form.getAttribute("method"))?.toLowerCase() ?? "get",
      "the form's method",
    )
    .toBe("get");
  for (const [label, name, min, max] of [
    ["Width", "w", "320", "1920"],
    ["Height", "h", "460", "1100"],
  ] as const) {
    const input = form.getByLabel(label, { exact: true });
    await expect.soft(input, `the ${label} input`).toHaveCount(1);
    expect
      .soft(
        await input
          .evaluate((el) => {
            const i = el as HTMLInputElement;
            return {
              type: i.type,
              name: i.name,
              min: i.min,
              max: i.max,
              required: i.required,
            };
          })
          .catch(() => null),
        `the ${label} input's attributes`,
      )
      .toEqual({ type: "number", name, min, max, required: true });
  }
  await expect
    .soft(
      form.locator(
        'button[type="submit"], button:not([type]), input[type="submit"]',
      ),
      "the form's submit button",
    )
    .toHaveCount(1);
  await expect
    .soft(
      form.getByRole("button", { name: "Try it", exact: true }),
      "the button, Try it",
    )
    .toHaveCount(1);

  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a[data-window]")].map((a) => ({
      window: a.getAttribute("data-window"),
      href: new URL((a as HTMLAnchorElement).href).pathname,
      current: a.getAttribute("aria-current"),
      name:
        a.getAttribute("aria-label") ??
        (a.textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
  );
  // Iris's words, 9: each link is named by its size ("1380" reads "1380 × 900" in H10's run).
  expect
    .soft(
      links
        .filter((l) => {
          const [w, h] = (l.window ?? "").split("x").map(Number);
          return l.name !== sizeWords([w ?? 0, h ?? 0]);
        })
        .map((l) => `${l.window}: "${l.name}"`),
      "a[data-window] links not named by their size",
    )
    .toEqual([]);
  expect
    .soft(
      links.map((l) => [l.window, l.href]).sort(),
      "a[data-window] per PINS window, to its address",
    )
    .toEqual(PIN_WINDOWS.map((win) => [key(win), addressOf(win)]).sort());
  expect
    .soft(
      links
        .filter((l) => l.current !== null)
        .map(({ window, href, current }) => ({ window, href, current })),
      "aria-current on /trials",
    )
    .toEqual([{ window: "1440x900", href: "/trials", current: "page" }]);

  // The walk.
  const answers: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.request().isNavigationRequest())
      answers.push({
        url: new URL(r.url()).pathname + new URL(r.url()).search,
        status: r.status(),
      });
  });
  await page.locator('a[data-window="320x568"]').click();
  await page.waitForURL("**/trials/320x568");
  expect
    .soft((await readout(page)).kind, "the answer after 320 x 568's link")
    .toBe("gap");
  expect
    .soft(
      await page
        .locator('a[data-window="320x568"]')
        .getAttribute("aria-current"),
      "320 x 568's link is current",
    )
    .toBe("page");

  await page.getByLabel("Width", { exact: true }).fill("1366");
  await page.getByLabel("Height", { exact: true }).fill("595");
  await page
    .locator(
      'form[action="/trials/go"] button, form[action="/trials/go"] input[type="submit"]',
    )
    .first()
    .click();
  await page.waitForURL("**/trials/1366x595");
  expect
    .soft((await readout(page)).kind, "the answer after 1366 and 595 submitted")
    .toBe("near");
  expect
    .soft(
      answers.filter((a) => a.url.startsWith("/trials/go")),
      "/trials/go's answer",
    )
    .toEqual([{ url: "/trials/go?w=1366&h=595", status: 303 }]);

  await page.goBack();
  await page.waitForURL("**/trials/320x568");
  expect.soft((await readout(page)).kind, "the answer after Back").toBe("gap");
  await ctx.close();
});

/**
 * T7's viewports, with what each holds in the first screen beyond the h1, the size, the freeboard
 * and the verdict: the contract's floor (1440 × 900, 390 × 664, 320 × 568; the waterline and the
 * answer's first line at 1440 × 900 and 390 × 844), and Iris's pins on top of it, for any window
 * (.crew/sprint/63/placement.md, 5): from 1024 and at 390 × 844 the whole frame, the waterline and
 * the answer's first line; at 390 × 664 the waterline. What isn't pinned is reported.
 */
const T7_VIEWPORTS: readonly {
  viewport: Win;
  frame: "whole" | "top";
  waterline: boolean;
  answer: boolean;
}[] = [
  { viewport: [1440, 900], frame: "whole", waterline: true, answer: true },
  { viewport: [1366, 595], frame: "whole", waterline: true, answer: true },
  { viewport: [1024, 768], frame: "whole", waterline: true, answer: true },
  { viewport: [390, 844], frame: "whole", waterline: true, answer: true },
  { viewport: [390, 664], frame: "top", waterline: true, answer: false },
  { viewport: [320, 568], frame: "top", waterline: false, answer: false },
];

test("T7 in the first screen: at 1440x900, 390x664 and 320x568 (and Iris's 1366x595, 1024x768 and 390x844), light and dark, scripts off, on /trials and /trials/320x568, the h1, the window's size and the freeboard with its verdict wholly in the viewport and the frame's top in it; at 1440x900 and 390x844 (Iris: from 1024 too) the whole frame, the waterline and the answer's first line; at 390x664 the waterline (Iris); the answer's place at 390x664 and 320x568 reported", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const reported: string[] = [];
  for (const scheme of SCHEMES) {
    for (const { viewport, frame, waterline, answer } of T7_VIEWPORTS) {
      const [width, height] = viewport;
      const ctx = await browser.newContext({
        javaScriptEnabled: false,
        colorScheme: scheme,
        viewport: { width, height },
      });
      const page = await ctx.newPage();
      for (const win of [[1440, 900], GAP] as Win[]) {
        const where = `${addressOf(win)} at ${width} x ${height}, ${scheme}`;
        const opened = await openWindow(page, win);
        expect
          .soft(opened, `${where} opened`)
          .toEqual({ status: 200, ready: true });
        const b = await boxes(page);
        const items: [string, Box | null][] = [
          ["the h1", b.h1],
          ["the window's size", b.size],
          ["the freeboard", b.freeboard],
          ["the verdict", b.verdict],
        ];
        if (frame === "whole") items.push(["the whole frame", b.frame]);
        if (waterline) items.push(["the waterline", b.waterline]);
        if (answer) items.push(["the answer's first line", b.answerFirstLine]);
        expect
          .soft(
            items
              .filter(([, box]) => !whollyIn(box, b.viewport))
              .map(([what, box]) => `${what}: ${JSON.stringify(box)}`),
            `not wholly in the first screen on ${where}`,
          )
          .toEqual([]);
        expect
          .soft(
            b.frame !== null &&
              b.frame.top >= -0.5 &&
              b.frame.top < b.viewport.height,
            `the frame's top (${b.frame?.top}) in the first screen on ${where}`,
          )
          .toBe(true);
        if (!answer || !waterline)
          reported.push(
            `${where}: answer's first line ${b.answerFirstLine ? `${b.answerFirstLine.top.toFixed(1)} to ${b.answerFirstLine.bottom.toFixed(1)}` : "none"}, waterline ${b.waterline ? b.waterline.top.toFixed(1) : "none"}`,
          );
      }
      await ctx.close();
    }
  }
  test.info().annotations.push({
    type: "the answer's place",
    description: reported.join("; "),
  });
});

const T8_ROUTES = ["/trials", "/trials/320x568"] as const;

test("T8 accessible, still and cheap: on /trials and /trials/320x568, axe clean of serious and critical, text in the tokens, no overflow from 320 to 1440, targets 44 px below 1024 and 24 x 24 from it, one main, no skipped heading, nothing animating; Tab never focuses inside the frame; in forced colours the waterline and the dimension show; nothing paints --accent; script beyond the 404's 0 B; LCP text in main outside the frame within 2,500 ms at 4x CPU at 1440x900 and 390x844; CLS 0 from load to rest + 2 s at 320, 390 and 1440", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  for (const route of T8_ROUTES) {
    // axe, the tokens, --accent, one main and the headings, light and dark, at 390 and 1440.
    for (const scheme of SCHEMES) {
      for (const width of [390, 1440]) {
        const where = `${route} at ${width}, ${scheme}`;
        const ctx = await browser.newContext({
          colorScheme: scheme,
          viewport: { width, height: 900 },
        });
        const page = await ctx.newPage();
        expect
          .soft((await page.goto(route))?.status(), `status of ${where}`)
          .toBe(200);
        await frameReady(page);
        const results = await new AxeBuilder({ page })
          .withTags(AXE_TAGS)
          .analyze();
        expect
          .soft(
            results.violations
              .filter((v) => v.impact === "serious" || v.impact === "critical")
              .map((v) => ({
                rule: v.id,
                impact: v.impact,
                targets: v.nodes.map((n) => n.target.join(" ")),
              })),
            `serious or critical axe violations on ${where}`,
          )
          .toEqual([]);
        const { tokenColors, tokenSizes, texts } = await textStyles(page);
        expect
          .soft(
            texts
              .filter(
                ({ color, fontSize }) =>
                  !tokenColors.includes(color) ||
                  !tokenSizes.includes(fontSize),
              )
              .map((t) => `${t.element}: ${t.color}, ${t.fontSize}`),
            `text not set in a token on ${where} (${COLOR_TOKENS.length} colours, ${STEP_TOKENS.length} steps)`,
          )
          .toEqual([]);
        const accent = (await resolveColors(page))["--accent"]?.computed ?? "";
        expect(parseColor(accent), `--accent on ${where}`).not.toBeNull();
        expect
          .soft(
            await paintsColor(page, accent),
            `elements painting --accent (${accent}) on ${where}`,
          )
          .toEqual([]);
        const structure = await page.evaluate(() => {
          const levels = [
            ...document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
          ].map((h) => Number(h.tagName.slice(1)));
          const skipped = levels.filter((l, i) => l - (levels[i - 1] ?? 0) > 1);
          return {
            mains: document.querySelectorAll("main").length,
            h1s: levels.filter((l) => l === 1).length,
            skipped,
          };
        });
        expect
          .soft(structure, `one main, one h1, no skipped heading on ${where}`)
          .toEqual({ mains: 1, h1s: 1, skipped: [] });
        await ctx.close();
      }
    }

    // No overflow from 320 to 1440; targets; nothing animating; Tab stays out of the frame.
    const ctx = await browser.newContext({
      viewport: { width: 320, height: 640 },
    });
    const page = await ctx.newPage();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    expect
      .soft((await page.goto(route))?.status(), `status of ${route}`)
      .toBe(200);
    await frameReady(page);
    const wide: string[] = [];
    for (let width = 320; width <= 1440; width += 16) {
      await page.setViewportSize({ width, height: 800 });
      const over = await horizontalOverflow(page);
      if (over > 0) wide.push(`${width}: ${over} px`);
    }
    expect.soft(wide, `overflow on ${route} from 320 to 1440`).toEqual([]);

    for (const [width, min] of [
      [320, 44],
      [390, 44],
      [1024, 24],
      [1440, 24],
    ] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(route);
      await page.keyboard.press("Tab"); // the skip link shows, as B2.9 reads it
      const small = await page.evaluate(
        (min) =>
          [
            ...document.querySelectorAll(
              "a, button, input, select, textarea, summary",
            ),
          ]
            .filter((el) => el.getClientRects().length > 0)
            .flatMap((el) => {
              const r = el.getBoundingClientRect();
              return r.width >= min && r.height >= min
                ? []
                : [
                    `${el.getAttribute("href") ?? el.getAttribute("name") ?? `<${el.tagName.toLowerCase()}> ${(el.textContent ?? "").trim().slice(0, 20)}`}: ${r.width.toFixed(1)} x ${r.height.toFixed(1)}`,
                  ];
            }),
        min,
      );
      expect
        .soft(small, `targets under ${min} x ${min} on ${route} at ${width}`)
        .toEqual([]);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await frameReady(page);
    const animations = () =>
      page.evaluate(() => document.getAnimations().length);
    expect.soft(await animations(), `animations at load on ${route}`).toBe(0);
    await page.evaluate(() => new Promise((done) => setTimeout(done, 2000)));
    expect.soft(await animations(), `animations 2 s later on ${route}`).toBe(0);
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await new Promise((done) => setTimeout(done, 100));
    expect
      .soft(await animations(), `animations at the bottom on ${route}`)
      .toBe(0);
    await page.evaluate(() => scrollTo(0, 0));

    const intoFrame: string[] = [];
    let stops = 0;
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(() => {
        const f = document.querySelector(
          "main iframe",
        ) as HTMLIFrameElement | null;
        const inner = f?.contentDocument?.activeElement;
        return {
          frameFocused: document.activeElement === f,
          inside: Boolean(inner && inner !== f?.contentDocument?.body),
          body: document.activeElement === document.body,
          what: document.activeElement?.outerHTML.slice(0, 60) ?? "",
        };
      });
      if (at.frameFocused || at.inside)
        intoFrame.push(`stop ${i + 1}: ${at.what}`);
      if (at.body && i > 0) break;
      stops = i + 1;
    }
    expect
      .soft(
        intoFrame,
        `Tab stops in the frame on ${route} (${stops} stops walked)`,
      )
      .toEqual([]);
    await ctx.close();

    // Forced colours: the waterline and the dimension show.
    {
      const fc = await browser.newContext({
        forcedColors: "active",
        viewport: { width: 1440, height: 900 },
      });
      const p = await fc.newPage();
      await p.goto(route);
      await frameReady(p);
      for (const sel of ["[data-waterline]", "[data-dimension]"]) {
        const shows = await inkOf(p, sel);
        expect
          .soft(shows, `${sel} shows in forced colours on ${route}`)
          .toBe(true);
      }
      await fc.close();
    }
  }

  // Script beyond the 404's: 0 B on both.
  const notFound = await scriptBytes(browser, "/no-such-page");
  expect(notFound.status, "status of the 404").toBe(404);
  for (const route of T8_ROUTES) {
    const bytes = await scriptBytes(browser, route);
    expect.soft(bytes.status, `status of ${route}`).toBe(200);
    test.info().annotations.push({
      type: "script",
      description: `${route}: ${bytes.bytes} B in ${bytes.files} files; the 404's ${notFound.bytes} B in ${notFound.files}`,
    });
    expect
      .soft(
        bytes.bytes - notFound.bytes,
        `script bytes on ${route} beyond the 404's`,
      )
      .toBeLessThanOrEqual(0);
  }

  // LCP and CLS.
  for (const route of T8_ROUTES) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      const where = `${route} at ${width} x ${height}`;
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      const lcp = await lcpOf(page, route);
      expect.soft(lcp, `an LCP candidate on ${where}`).not.toBeNull();
      if (lcp) {
        test.info().annotations.push({
          type: "lcp",
          description: `${where}: <${lcp.tag}> "${lcp.text}" at ${lcp.time.toFixed(0)} ms`,
        });
        expect
          .soft(
            {
              inMain: lcp.inMain,
              url: lcp.url,
              text: !/^(img|image|video|svg|canvas|iframe)$/.test(lcp.tag),
            },
            `LCP <${lcp.tag}> on ${where}`,
          )
          .toEqual({ inMain: true, url: "", text: true });
        expect
          .soft(lcp.time, `LCP time (ms) on ${where}`)
          .toBeLessThanOrEqual(2500);
      }
      await ctx.close();
    }
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [1440, 900],
    ] as const) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        const win = window as Window & { __shifts?: string[]; __cls?: number };
        win.__cls = 0;
        win.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            };
            win.__cls = (win.__cls ?? 0) + shift.value;
            win.__shifts?.push(
              `${shift.value.toFixed(4)}${shift.hadRecentInput ? " (input)" : ""}`,
            );
          }
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(route, { waitUntil: "load" });
      await frameReady(page);
      await page.evaluate(() => new Promise((done) => setTimeout(done, 2000)));
      const cls = await page.evaluate(() => {
        const win = window as Window & { __shifts?: string[]; __cls?: number };
        return { cls: win.__cls ?? Number.NaN, shifts: win.__shifts ?? [] };
      });
      expect
        .soft(
          cls,
          `CLS from load to rest + 2 s on ${route} at ${width} x ${height}`,
        )
        .toEqual({ cls: 0, shifts: [] });
      await ctx.close();
    }
  }
});

/** Elements in the page (and its frame's document) whose painted colours include `color`. */
function paintsColor(page: Page, color: string) {
  return page.evaluate((target) => {
    const out: string[] = [];
    const docs: Document[] = [document];
    const frame = (
      document.querySelector("main iframe") as HTMLIFrameElement | null
    )?.contentDocument;
    if (frame) docs.push(frame);
    for (const doc of docs) {
      const view = doc.defaultView;
      if (!view) continue;
      for (const el of doc.querySelectorAll("*")) {
        if (el.getClientRects().length === 0) continue;
        const s = view.getComputedStyle(el);
        if (s.visibility === "hidden") continue;
        const hasText = [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        );
        const painted: [string, string][] = [];
        if (hasText) painted.push(["color", s.color]);
        painted.push(["background-color", s.backgroundColor]);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const)
          if (
            Number.parseFloat(
              s.getPropertyValue(`border-${side.toLowerCase()}-width`),
            ) > 0 &&
            s.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none"
          )
            painted.push([
              `border-${side.toLowerCase()}`,
              s.getPropertyValue(`border-${side.toLowerCase()}-color`),
            ]);
        if (s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0)
          painted.push(["outline", s.outlineColor]);
        if (s.textDecorationLine !== "none" && hasText)
          painted.push(["text-decoration", s.textDecorationColor]);
        if (el instanceof view.SVGElement) {
          if (s.fill !== "none") painted.push(["fill", s.fill]);
          if (s.stroke !== "none") painted.push(["stroke", s.stroke]);
        }
        for (const [what, value] of painted)
          if (value === target)
            out.push(
              `${doc === document ? "" : "frame: "}<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? ` .${el.className.split(" ")[0]}` : ""}> ${what}`,
            );
      }
    }
    return out;
  }, color);
}

/** Whether an element's box paints any pixel unlike the page's background (forced colours). */
async function inkOf(page: Page, selector: string) {
  const read = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.getClientRects().length === 0) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return {
      x: r.left - 1,
      y: r.top - 1,
      width: r.width + 2,
      height: r.height + 2,
      background: getComputedStyle(document.body).backgroundColor,
    };
  }, selector);
  if (!read) return false;
  const png = await page.screenshot({
    clip: {
      x: Math.max(0, read.x),
      y: Math.max(0, read.y),
      width: Math.max(1, read.width),
      height: Math.max(1, read.height),
    },
  });
  const image = decodePng(png);
  const bg = parseColor(read.background);
  if (!bg) return false;
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const [r = 0, g = 0, b = 0] = pixel(image, x, y);
      if (Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > 48)
        return true;
    }
  return false;
}

/** B2.10's method: the script bodies a fresh visit fetches, summed. */
async function scriptBytes(browser: Browser, url: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const bodies: Promise<number>[] = [];
  page.on("response", (response) => {
    // Decision 4: the page's own frame; the sandboxed frame's fetches are T2's.
    if (
      response.request().resourceType() === "script" &&
      response.frame() === page.mainFrame()
    )
      bodies.push(
        response
          .body()
          .then((b) => b.length)
          .catch(() => Number.NaN),
      );
  });
  const response = await page.goto(url);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const sizes = await Promise.all(bodies);
  await ctx.close();
  return {
    status: response?.status(),
    files: sizes.length,
    bytes: sizes.reduce((a, b) => a + b, 0),
  };
}

type Lcp = {
  time: number;
  url: string;
  tag: string;
  text: string;
  inMain: boolean;
};

/** B1.9's measurement at 4x CPU, the candidate's place read against main. */
async function lcpOf(page: Page, url: string): Promise<Lcp | null> {
  await page.addInitScript(() => {
    const win = window as Window & { __lcp?: Lcp[] };
    win.__lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & {
          element: Element | null;
          url: string;
        };
        win.__lcp?.push({
          time: e.startTime,
          url: e.url,
          tag: e.element?.tagName.toLowerCase() ?? "(removed)",
          text: (e.element?.textContent ?? "").trim().slice(0, 40),
          inMain: Boolean(e.element?.closest("main")),
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(url);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  return page.evaluate(
    () => (window as Window & { __lcp?: Lcp[] }).__lcp?.at(-1) ?? null,
  );
}

test("T9 the header: the frame's address sends the site's CSP with frame-ancestors 'self' and nothing else changed; /, /trials, a window page, /log, /crew, /read and a 404 still send frame-ancestors 'none'; a page on another origin can't frame the frame's address; it is noindex, canonical to /; no page of the trials logs a CSP refusal", async ({
  browser,
  request,
  baseURL,
}) => {
  const directives = (csp: string | undefined) =>
    (csp ?? "")
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);
  const home = await request.get("/");
  const frame = await request.get(FRAME);
  expect(frame.status(), `status of ${FRAME}`).toBe(200);
  const homeCsp = directives(home.headers()["content-security-policy"]);
  expect(homeCsp, "/'s CSP").toContain("frame-ancestors 'none'");
  expect
    .soft(
      directives(frame.headers()["content-security-policy"]),
      `${FRAME}'s CSP: /'s, frame-ancestors 'self'`,
    )
    .toEqual(
      homeCsp.map((d) =>
        d.startsWith("frame-ancestors") ? "frame-ancestors 'self'" : d,
      ),
    );
  for (const header of [
    "referrer-policy",
    "x-content-type-options",
    "permissions-policy",
    "x-frame-options",
  ])
    expect
      .soft(frame.headers()[header], `${FRAME}'s ${header}, as /'s`)
      .toBe(home.headers()[header]);

  for (const path of [
    "/",
    "/trials",
    "/trials/320x568",
    "/log",
    "/crew",
    "/read",
    "/no-such-page",
  ]) {
    const r = await request.get(path);
    expect
      .soft(r.status(), `status of ${path}`)
      .toBe(path === "/no-such-page" ? 404 : 200);
    expect
      .soft(
        directives(r.headers()["content-security-policy"]).filter((d) =>
          d.startsWith("frame-ancestors"),
        ),
        `${path}'s frame-ancestors`,
      )
      .toEqual(["frame-ancestors 'none'"]);
  }

  // noindex, canonical to /.
  const head = headOf(await frame.text());
  expect
    .soft(
      /\bnoindex\b/.test(
        `${head.robots ?? ""} ${frame.headers()["x-robots-tag"] ?? ""}`,
      ),
      `${FRAME} is noindex (meta robots "${head.robots}")`,
    )
    .toBe(true);
  expect
    .soft(head.canonical, `${FRAME}'s canonical`)
    .toEqual(headOf(await home.text()).canonical);

  // Another origin can't frame it; the trials page can (the control).
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const target = new URL(FRAME, baseURL).href;
  await page.route("https://elsewhere.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><title>elsewhere</title><iframe src="${target}" width="400" height="300"></iframe>`,
    }),
  );
  await page.goto("https://elsewhere.example/");
  await new Promise((done) => setTimeout(done, 1500));
  const child = page.frames().find((f) => f !== page.mainFrame());
  const framed = child
    ? await child
        .evaluate(() => Boolean(document.querySelector("main > header")))
        .catch(() => false)
    : false;
  expect
    .soft(
      framed,
      `${FRAME} rendered inside a page on another origin (frame at ${child?.url()})`,
    )
    .toBe(false);
  await ctx.close();

  // No refusal on the trials' pages.
  const csp = await browser.newContext();
  const p = await csp.newPage();
  const refused = await watchCsp(csp, p);
  let control = false;
  for (const path of [
    "/trials",
    "/trials/320x568",
    "/trials/1366x595",
    FRAME,
  ]) {
    await p.goto(path, { waitUntil: "load" });
    if (path === "/trials") control = await frameReady(p);
  }
  expect
    .soft(control, "the trials page frames its own frame (the control)")
    .toBe(true);
  await new Promise((done) => setTimeout(done, 500));
  expect.soft(refused, "CSP refusals on the trials").toEqual([]);
  await csp.close();
});
