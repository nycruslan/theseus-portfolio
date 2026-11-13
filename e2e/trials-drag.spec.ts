import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  type APIRequestContext,
  type Browser,
  type CDPSession,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { SITE_URL } from "../lib/site";
import { trialCard } from "../lib/trials-card";
import { sweptAt } from "../lib/trials-sweep";
import {
  addressOf,
  at,
  CORNERS,
  frameReady,
  GAP,
  type Kind,
  key,
  kindOf,
  measureInFrame,
  measureTop,
  NAMED,
  PIN_WINDOWS,
  seeded,
  type Win,
} from "./trials";

// Sprint 64, Tb: drag the trials page's frame, and send it (.crew/sprint/64/contract.md, T10 to
// T15), written before the build. The hooks are .crew/sprint/64/selectors.md: the corner
// `main [data-corner]` (a button, `[data-dragging]` on it mid-drag), `[data-freeboard]`'s
// `data-measure="live"` mid-drag, `[data-trials-live]`, Copy link `main [data-copy]`, Ta's
// `input[name="w"]` and `input[name="h"]`, and the card's words in lib/trials-card.ts. Ta's hooks
// and oracle are e2e/trials.spec.ts's and e2e/trials.ts's.

const FRAME = "/trials/frame";
const CORNER = "main [data-corner]";
const COPY = "main [data-copy]";
const LIVE = "[data-trials-live]";
const HOME: Win = [1440, 900];

/** A window's size as the page writes it: "1440 × 900" (U+00D7). */
const sizeWords = ([w, h]: Win) => `${w} × ${h}`;
/**
 * A window's size as it is spoken, in the corner's name and the live region: "1440 by 900", since
 * screen readers say × as "times" (Iris's words.md, 1 and 4; Atlas's ruling, sprint 64).
 */
const spokenWords = ([w, h]: Win) => `${w} by ${h}`;
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Iris's verdicts (.crew/sprint/63/words.md), as `[data-verdict]` writes them. */
const VERDICT: Record<Kind, string> = {
  gap: "The crew's own gap",
  held: "Held by the crew's checks",
  near: "A near miss",
  under: "Sunk",
  afloat: "Afloat",
};
const sinks = (kind: Kind) => kind === "gap" || kind === "under";
/** `{f}`: the freeboard's size to one decimal. */
const fOf = (freeboard: number) =>
  (Math.round(Math.abs(freeboard) * 10) / 10).toFixed(1);

/** The sweep's reading and the answer's kind at a swept window. */
function trialAt(win: Win) {
  const swept = sweptAt(win[0], win[1]);
  return swept
    ? { freeboard: swept.freeboard, kind: kindOf(win, swept.freeboard) }
    : undefined;
}

const nodeWait = (ms: number) =>
  new Promise((done) => {
    setTimeout(done, ms);
  });

/** Polls `read` from Node until `ok` holds or `timeout` passes; the last read either way. */
async function until<T>(
  read: () => Promise<T>,
  ok: (value: T) => boolean,
  timeout: number,
) {
  const end = Date.now() + timeout;
  let value = await read();
  while (!ok(value) && Date.now() < end) {
    await nodeWait(50);
    value = await read();
  }
  return value;
}

// ---------------------------------------------------------------------------------------------
// The page's own instruments, added before any of its scripts: requestAnimationFrame counted, the
// live region's texts as they change (and whether a drag was on), Event Timing and long animation
// frames. The test's own frame waits use the real requestAnimationFrame, uncounted.

type Spoken = { text: string; dragging: boolean; t: number };
type Timed = { name: string; duration: number; startTime: number };
type Instruments = {
  raf: number;
  real: (callback: FrameRequestCallback) => number;
  spoken: Spoken[];
  events: Timed[];
  loafs: Timed[];
};
type Instrumented = Window & { __probe?: Instruments };

function instrument(page: Page) {
  return page.addInitScript(() => {
    if (window !== window.top) return;
    const real = window.requestAnimationFrame.bind(window);
    const probe: Instruments = {
      raf: 0,
      real,
      spoken: [],
      events: [],
      loafs: [],
    };
    (window as Instrumented).__probe = probe;
    window.requestAnimationFrame = (callback) => {
      probe.raf++;
      return real(callback);
    };
    const observe = (type: string, into: Timed[], threshold?: number) => {
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            into.push({
              name: e.name,
              duration: e.duration,
              startTime: e.startTime,
            });
        }).observe({
          type,
          buffered: true,
          ...(threshold ? { durationThreshold: threshold } : {}),
        } as PerformanceObserverInit);
      } catch {
        // An entry type this Chromium doesn't know: its list stays empty, and the check says so.
      }
    };
    observe("event", probe.events, 16);
    observe("long-animation-frame", probe.loafs);
    const watch = () => {
      const region = document.querySelector("[data-trials-live]");
      if (!region) return;
      let last = (region.textContent ?? "").replace(/\s+/g, " ").trim();
      new MutationObserver(() => {
        const text = (region.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text === last) return;
        last = text;
        probe.spoken.push({
          text,
          dragging: Boolean(
            document.querySelector("[data-corner][data-dragging]"),
          ),
          t: performance.now(),
        });
      }).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", watch);
    else watch();
  });
}

const instruments = (page: Page) =>
  page.evaluate(() => {
    const p = (window as Instrumented).__probe;
    return p
      ? {
          raf: p.raf,
          spoken: [...p.spoken],
          events: [...p.events],
          loafs: [...p.loafs],
        }
      : null;
  });

/** Two of the page's frames, waited on with the real requestAnimationFrame. */
const frames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) => {
        const raf =
          (window as Instrumented).__probe?.real ??
          window.requestAnimationFrame.bind(window);
        raf(() => raf(() => done()));
      }),
  );

// ---------------------------------------------------------------------------------------------
// Reads

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

/** Everything a drag check reads at one moment, in the parent document and the frame's. */
function readNow(page: Page) {
  return page.evaluate(() => {
    const rect = (el: Element | null | undefined): Rect | null => {
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
    const squash = (el: Element | null) =>
      el ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : null;
    const iframe = document.querySelector(
      "main iframe",
    ) as HTMLIFrameElement | null;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    const root = doc?.documentElement;
    const style = root && win ? win.getComputedStyle(root) : null;
    const fb = document.querySelector("[data-freeboard]");
    const corner = document.querySelector("main [data-corner]");
    const input = (name: string) =>
      (
        document.querySelector(
          `main input[name="${name}"]`,
        ) as HTMLInputElement | null
      )?.value ?? null;
    return {
      w: root?.clientWidth ?? null,
      h: win?.innerHeight ?? null,
      scroll: win ? [win.scrollX, win.scrollY] : null,
      overflow: style ? [style.overflowX, style.overflowY] : null,
      freeboard: fb?.getAttribute("data-freeboard") ?? null,
      measure: fb?.getAttribute("data-measure") ?? null,
      size: squash(document.querySelector("[data-size]")),
      verdict: squash(document.querySelector("[data-verdict]")),
      inputs: [input("w"), input("h")],
      dragging: Boolean(corner?.hasAttribute("data-dragging")),
      focused: corner !== null && document.activeElement === corner,
      frame: rect(iframe),
      figure: rect(iframe?.closest("figure")),
      waterline: rect(document.querySelector("[data-waterline]")),
      viewport: document.documentElement.clientWidth,
      path: location.pathname,
      title: document.title,
      canonical: [
        ...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
      ].map((l) => l.getAttribute("href") ?? ""),
      history: history.length,
    };
  });
}
type Now = Awaited<ReturnType<typeof readNow>>;

/** Where the drawing breaks the contract at this moment: w:h, its column, the waterline. */
function drawnProblems(r: Now) {
  const out: string[] = [];
  if (!r.frame || r.w === null || r.h === null) return ["no drawn frame"];
  const ratio = Math.abs(r.frame.height - (r.frame.width * r.h) / r.w);
  if (!(ratio <= 1)) out.push(`w:h off by ${ratio.toFixed(2)} px`);
  const inside =
    r.figure !== null &&
    r.frame.left >= r.figure.left - 0.5 &&
    r.frame.right <= r.figure.right + 0.5 &&
    r.frame.left >= -0.5 &&
    r.frame.right <= r.viewport + 0.5;
  if (!inside)
    out.push(
      `outside its column (frame ${r.frame.left.toFixed(1)} to ${r.frame.right.toFixed(1)}, figure ${r.figure?.left.toFixed(1)} to ${r.figure?.right.toFixed(1)}, viewport ${r.viewport})`,
    );
  const atFoot =
    r.waterline !== null &&
    r.frame.bottom >= r.waterline.top - 1 &&
    r.frame.bottom <= r.waterline.bottom + 1;
  if (!atFoot)
    out.push(
      `waterline ${r.waterline?.top.toFixed(1)} to ${r.waterline?.bottom.toFixed(1)} off the frame's foot ${r.frame.bottom.toFixed(1)}`,
    );
  return out;
}

/** The corner's centre, or null when it isn't shown. */
function cornerAt(page: Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.getClientRects().length === 0) return null;
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, CORNER);
}

// ---------------------------------------------------------------------------------------------
// Hands: the mouse, or a finger through CDP touch events.

type Hand = {
  name: string;
  down: (x: number, y: number) => Promise<void>;
  move: (x: number, y: number) => Promise<void>;
  up: () => Promise<void>;
};

function mouseHand(page: Page): Hand {
  return {
    name: "the mouse",
    down: async (x, y) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
    },
    move: async (x, y) => {
      await page.mouse.move(x, y, { steps: 2 });
    },
    up: async () => {
      await page.mouse.up();
    },
  };
}

function fingerHand(cdp: CDPSession): Hand {
  let last = { x: 0, y: 0 };
  const touch = (type: string, x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type: type as "touchStart",
      touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
    });
  return {
    name: "a finger",
    down: async (x, y) => {
      last = { x, y };
      await touch("touchStart", x, y);
    },
    move: async (x, y) => {
      const from = last;
      for (const f of [0.5, 1])
        await touch(
          "touchMove",
          from.x + (x - from.x) * f,
          from.y + (y - from.y) * f,
        );
      last = { x, y };
    },
    up: async () => {
      await touch("touchEnd", last.x, last.y);
    },
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * Takes the corner with `hand` and moves it until the frame's document is within `tolerance` of
 * `target`, steering by what the frame reports (so any pointer-to-window mapping works), without
 * releasing. `each` runs after every move with the hand still down. Assertion-free: the caller
 * checks `shown`, `taken` and `reached`.
 */
async function dragTo(
  page: Page,
  hand: Hand,
  target: Win,
  tolerance: { w: number; h: number },
  each?: (read: Now) => Promise<void>,
) {
  const start = await cornerAt(page);
  if (!start)
    return { shown: false, taken: false, reached: false, read: null, moves: 0 };
  let p = start;
  await hand.down(p.x, p.y);
  // The controller may load on this touch (T10): wait for the drag to be taken.
  let read = await until(
    () => readNow(page),
    (r) => r.dragging,
    8000,
  );
  if (!read.dragging) {
    await hand.up();
    return { shown: true, taken: false, reached: false, read, moves: 0 };
  }
  const scale = read.frame && read.w ? read.frame.width / read.w : 1;
  let gx = 1 / scale;
  let gy = 1 / scale;
  let moves = 0;
  const near = (r: Now) =>
    r.w !== null &&
    r.h !== null &&
    Math.abs(target[0] - r.w) <= tolerance.w &&
    Math.abs(target[1] - r.h) <= tolerance.h;
  for (let i = 0; i < 60 && !near(read); i++) {
    const ew = target[0] - (read.w ?? target[0]);
    const eh = target[1] - (read.h ?? target[1]);
    const dx = clamp(ew / gx, -80, 80);
    const dy = clamp(eh / gy, -80, 80);
    const next = { x: p.x + dx, y: p.y + dy };
    await hand.move(next.x, next.y);
    await frames(page);
    const now = await readNow(page);
    moves++;
    if (
      Math.abs(dx) > 2 &&
      now.w !== null &&
      read.w !== null &&
      now.w !== read.w
    )
      gx = clamp((now.w - read.w) / dx, 0.2, 20);
    if (
      Math.abs(dy) > 2 &&
      now.h !== null &&
      read.h !== null &&
      now.h !== read.h
    )
      gy = clamp((now.h - read.h) / dy, 0.2, 20);
    p = next;
    read = now;
    if (each) await each(now);
  }
  return { shown: true, taken: true, reached: near(read), read, moves };
}

/** After a release or a key: waits until no drag is on and the frame is `win` (or anything). */
function settled(page: Page, win?: Win, timeout = 3000) {
  return until(
    () => readNow(page),
    (r) =>
      !r.dragging &&
      r.measure !== "live" &&
      (win ? r.w === win[0] && r.h === win[1] : r.w !== null) &&
      r.size === (win ? sizeWords(win) : r.size),
    timeout,
  );
}

/** Within the release's pinned or named window's half step (contract, call 1), with margin. */
const TIGHT = { w: 4, h: 1 };

/**
 * What the live region said since the `from`th change: waits up to 1.5 s for words holding `win`'s
 * size, then 300 ms more, so a second announcement for the same settle is counted too.
 */
async function spokenSince(page: Page, from: number, win: Win) {
  const read = async () =>
    ((await instruments(page))?.spoken ?? []).slice(from);
  await until(
    read,
    (spoken) => spoken.some((s) => s.text.includes(spokenWords(win))),
    1500,
  );
  await nodeWait(300);
  return read();
}

/** The server's head for an address: title and canonical, as T1 reads them. */
async function serverHead(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
  const attr = (tag: string, name: string) =>
    tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const meta = (name: string) =>
    metas
      .filter((m) => attr(m, "property") === name || attr(m, "name") === name)
      .map((m) => decode(attr(m, "content") ?? ""));
  return {
    html,
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
    canonical: [...html.matchAll(/<link\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((l) => /rel="canonical"/.test(l))
      .map((l) => attr(l, "href") ?? ""),
    ogImage: meta("og:image"),
    ogImageAlt: meta("og:image:alt"),
    twitterImage: meta("twitter:image"),
  };
}

/** B2.10's method, gzipped: the script bodies the page's own frame fetches, each gzip -9. */
function watchScripts(page: Page) {
  const seen: { url: string; at: number }[] = [];
  const bodies: Promise<number>[] = [];
  page.on("request", (req) => {
    if (
      req.frame() === page.mainFrame() &&
      (req.resourceType() === "script" ||
        /\.m?js(?:\?|$)/.test(new URL(req.url()).pathname))
    )
      seen.push({ url: new URL(req.url()).pathname, at: Date.now() });
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" &&
      response.frame() === page.mainFrame()
    )
      bodies.push(
        response
          .body()
          .then((b) => gzipSync(b, { level: 9 }).length)
          .catch(() => Number.NaN),
      );
  });
  return {
    seen,
    gzip: async () => (await Promise.all(bodies)).reduce((a, b) => a + b, 0),
  };
}

async function notFoundGzip(browser: Browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const scripts = watchScripts(page);
  const status = (await page.goto("/no-such-page"))?.status();
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const gzip = await scripts.gzip();
  await ctx.close();
  return { status, gzip, files: scripts.seen.length };
}

// ---------------------------------------------------------------------------------------------

test("T10 the controller loads on the first touch, and not before: with script, at load the trials page's script beyond the 404's is at most 1,024 B gzip; no script is requested until the first pointerdown on the corner or focus on a size input; after the touch, at most 10,240 B gzip beyond the 404's in all; 0 animation frames requested at rest", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const notFound = await notFoundGzip(browser);
  expect(notFound.status, "status of the 404").toBe(404);

  for (const touch of ["pointerdown on the corner", "focus on Width"]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await instrument(page);
    const scripts = watchScripts(page);
    expect
      .soft((await page.goto("/trials"))?.status(), "status of /trials")
      .toBe(200);
    expect(await frameReady(page), "/trials's frame parsed").toBe(true);
    await nodeWait(1500);
    const atLoad = await scripts.gzip();
    const loaded = scripts.seen.length;
    test.info().annotations.push({
      type: "script at load",
      description: `${touch}: /trials ${atLoad} B gzip -9 in ${loaded} files; the 404's ${notFound.gzip} B in ${notFound.files}; beyond: ${atLoad - notFound.gzip} B`,
    });
    expect
      .soft(
        atLoad - notFound.gzip,
        `/trials's script beyond the 404's at load, B gzip -9 (${touch})`,
      )
      .toBeLessThanOrEqual(1024);

    // At rest: no animation frame requested over 2 s.
    const rest0 = (await instruments(page))?.raf ?? Number.NaN;
    await nodeWait(2000);
    const rest1 = (await instruments(page))?.raf ?? Number.NaN;
    expect
      .soft(
        rest1 - rest0,
        `requestAnimationFrame calls over 2 s at rest on /trials (${touch})`,
      )
      .toBe(0);

    // Neither a pointer passing over the page nor a scroll is a touch.
    for (const sel of ["h1", "[data-verdict]", "[data-answer]"]) {
      const box = await page.locator(sel).first().boundingBox();
      if (box) await page.mouse.move(box.x + 4, box.y + box.height / 2);
    }
    await page.mouse.wheel(0, 600);
    await nodeWait(300);
    await page.mouse.wheel(0, -600);
    await nodeWait(700);
    expect
      .soft(
        scripts.seen.slice(loaded).map((s) => s.url),
        `scripts requested after load before a touch (${touch})`,
      )
      .toEqual([]);

    // The touch.
    const before = scripts.seen.length;
    if (touch === "pointerdown on the corner") {
      const corner = await cornerAt(page);
      expect(corner, `a shown ${CORNER} to take`).not.toBeNull();
      if (corner) {
        await page.mouse.move(corner.x, corner.y);
        await page.mouse.down();
        await nodeWait(2000);
        await page.mouse.up();
      }
    } else {
      await page.locator('main input[name="w"]').focus();
      await nodeWait(2000);
    }
    await nodeWait(500);
    const after = await scripts.gzip();
    expect
      .soft(
        scripts.seen.length - before,
        `scripts requested on the first touch (${touch}): the controller loads then`,
      )
      .toBeGreaterThan(0);
    test.info().annotations.push({
      type: "script after the touch",
      description: `${touch}: ${after} B gzip -9 in ${scripts.seen.length} files, ${scripts.seen
        .slice(before)
        .map((s) => s.url)
        .join(", ")}; beyond the 404's: ${after - notFound.gzip} B`,
    });
    expect
      .soft(
        after - notFound.gzip,
        `/trials's script beyond the 404's after the first touch, B gzip -9 (${touch})`,
      )
      .toBeLessThanOrEqual(10240);
    await ctx.close();
  }
});

test("T11 a drag lands where it says: a mouse drag of the corner from /trials at 1440x900 to near 390x664, released, leaves the frame's document exactly 390x664, never scrolled, and [data-freeboard] the sweep's value and a direct measure by Ta's rule within 0.5 px; mid-drag, before release, the shown freeboard is marked live and equals a direct measure of the frame's document within 0.5 px; the drawn frame keeps w:h within 1 px inside its column and the waterline at its foot within 1 px, mid-drag and at rest", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const target: Win = [390, 664];
  const swept = trialAt(target);
  expect(swept, `the sweep holds ${at(target)}`).toBeDefined();

  // The direct measure: the frame's address top-level at 390 x 664, scripts off, fonts ready.
  const top = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: target[0], height: target[1] },
  });
  const direct = await top.newPage();
  expect((await direct.goto(FRAME))?.status(), `status of ${FRAME}`).toBe(200);
  await direct.evaluate(() => document.fonts.ready);
  const directMeasure = await measureTop(direct);
  expect(directMeasure.found, "contact links in the direct measure").toBe(3);
  await top.close();

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(200);
  expect(await frameReady(page), "/trials's frame parsed").toBe(true);

  const midProblems: string[] = [];
  let midReads = 0;
  const hand = mouseHand(page);
  const drag = await dragTo(page, hand, target, TIGHT, async (r) => {
    midReads++;
    const m = await measureInFrame(page);
    const where = `mid-drag at ${r.w} x ${r.h}`;
    if (!r.dragging) midProblems.push(`${where}: [data-dragging] gone`);
    if (r.measure !== "live")
      midProblems.push(`${where}: data-measure "${r.measure}", not "live"`);
    const shown = Number(r.freeboard);
    if (
      m?.found !== 3 ||
      !(Math.abs(shown - m.freeboard) <= 0.5) ||
      m.height !== r.h
    )
      midProblems.push(
        `${where}: [data-freeboard] ${r.freeboard} against the frame's own measure ${m?.freeboard.toFixed(2)} (links ${m?.found})`,
      );
    for (const problem of drawnProblems(r))
      midProblems.push(`${where}: ${problem}`);
  });
  expect(drag.shown, `a shown ${CORNER} at 1440 x 900`).toBe(true);
  expect(
    drag.taken,
    `the drag taken: [data-dragging] on the corner after pointerdown`,
  ).toBe(true);
  expect
    .soft(
      drag.reached,
      `the hand brought the frame within ${TIGHT.w} x ${TIGHT.h} px of ${at(target)} in ${drag.moves} moves (at ${drag.read?.w} x ${drag.read?.h})`,
    )
    .toBe(true);
  expect.soft(midReads, "mid-drag reads").toBeGreaterThan(2);
  expect.soft(midProblems, "mid-drag, before release").toEqual([]);

  await hand.up();
  const rest = await settled(page, target);
  const inFrame = await measureInFrame(page);
  expect
    .soft(
      {
        w: rest.w,
        h: rest.h,
        scroll: rest.scroll,
        overflow: rest.overflow,
        size: rest.size,
        dragging: rest.dragging,
      },
      "the frame's document once released",
    )
    .toEqual({
      w: target[0],
      h: target[1],
      scroll: [0, 0],
      overflow: ["hidden", "hidden"],
      size: sizeWords(target),
      dragging: false,
    });
  const shown = Number(rest.freeboard);
  expect
    .soft(rest.measure, "data-measure at rest: the sweep's, not live")
    .not.toBe("live");
  if (swept)
    expect
      .soft(shown, `[data-freeboard] ${rest.freeboard} against the sweep's`)
      .toBeCloseTo(swept.freeboard, 1);
  expect
    .soft(
      Math.abs(shown - directMeasure.freeboard),
      `[data-freeboard] ${rest.freeboard} against the direct measure ${directMeasure.freeboard.toFixed(2)}`,
    )
    .toBeLessThanOrEqual(0.5);
  expect
    .soft(
      Math.abs((inFrame?.freeboard ?? Number.NaN) - directMeasure.freeboard),
      `the frame's own measure ${inFrame?.freeboard} against the direct one`,
    )
    .toBeLessThanOrEqual(0.5);
  expect.soft(drawnProblems(rest), "the drawing at rest").toEqual([]);
  await ctx.close();
});

test("T12 keys and a finger: the corner is a button named with the window, at least 44 x 44; arrows step the grid, Page Up and Down ten height steps, Home and End the grid's corners, each settling at once with focus kept on it; a held finger drags it as the mouse does; touch-action none on the handle only and the page still scrolls by touch elsewhere; Width and Height follow the frame live and, edited, move it; a polite live region speaks once per settle, never during a drag; scripts off, no corner or Copy link shows", async ({
  browser,
  request,
}) => {
  test.setTimeout(150_000);

  // The live region is in the server HTML, polite.
  const html = (await serverHead(request, "/trials")).html;
  const region = html.match(/<[a-z]+\b[^>]*\bdata-trials-live\b[^>]*>/)?.[0];
  expect.soft(region, `${LIVE} in /trials's server HTML`).toBeDefined();
  expect
    .soft(
      /aria-live="polite"|role="status"/.test(region ?? ""),
      `${LIVE} is polite: ${region}`,
    )
    .toBe(true);

  // Scripts off: Ta's page, no corner or Copy link shown.
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/trials");
    const shown = await page.evaluate(
      (sels) =>
        sels.filter((sel) =>
          [...document.querySelectorAll(sel)].some((el) =>
            el.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
          ),
        ),
      [CORNER, COPY],
    );
    expect.soft(shown, "controls shown with scripts off").toEqual([]);
    await ctx.close();
  }

  // The corner, the keys, the inputs and a mouse drag, at 1440 x 900.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await instrument(page);
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    const corner = page.locator(CORNER);
    expect(await corner.count(), `one ${CORNER}`).toBe(1);
    expect
      .soft(
        await corner.evaluate((el) => el.tagName.toLowerCase()),
        "the corner is a button",
      )
      .toBe("button");
    await expect
      .soft(corner, "the corner's name holds the window")
      .toHaveAccessibleName(new RegExp(escapeRegExp(spokenWords(HOME))));
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await corner.boundingBox();
      expect
        .soft(
          box && box.width >= 44 && box.height >= 44,
          `the corner's box at ${width} wide: ${box?.width} x ${box?.height}`,
        )
        .toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    const touchActions = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((el) => getComputedStyle(el).touchAction === "none")
        .map(
          (el) =>
            `<${el.tagName.toLowerCase()}${el.hasAttribute("data-corner") ? " data-corner" : ""}>`,
        ),
    );
    expect
      .soft(touchActions, "elements with touch-action: none")
      .toEqual(["<button data-corner>"]);

    // Keys: focus, give the controller its first touch, then step.
    await corner.focus();
    await nodeWait(1000);
    const steps: [string, Win][] = [
      ["ArrowLeft", [1424, 900]],
      ["ArrowUp", [1424, 895]],
      ["PageUp", [1424, 845]],
      ["PageDown", [1424, 895]],
      ["ArrowRight", [1440, 895]],
      ["ArrowDown", [1440, 900]],
      ["End", [1920, 1100]],
      ["Home", [320, 460]],
    ];
    for (const [press, win] of steps) {
      const spokenBefore = (await instruments(page))?.spoken.length ?? 0;
      await page.keyboard.press(press);
      const r = await settled(page, win, 1000);
      const where = `${press} to ${at(win)}`;
      expect
        .soft(
          { w: r.w, h: r.h, size: r.size, path: r.path, focused: r.focused },
          `settled at once, focus kept on the corner, after ${where}`,
        )
        .toEqual({
          w: win[0],
          h: win[1],
          size: sizeWords(win),
          path: addressOf(win),
          focused: true,
        });
      await expect
        .soft(corner, `the corner's name after ${where}`)
        .toHaveAccessibleName(new RegExp(escapeRegExp(spokenWords(win))), {
          timeout: 1000,
        });
      const spoken = await spokenSince(page, spokenBefore, win);
      const said = spoken.filter((s) => s.text !== "");
      const trial = trialAt(win);
      expect
        .soft(
          said.length === 1 &&
            (said[0]?.text.includes(spokenWords(win)) ?? false) &&
            (said[0]?.text.includes(trial ? VERDICT[trial.kind] : "?") ??
              false),
          `the live region spoke once, with the window and "${trial ? VERDICT[trial.kind] : "?"}", after ${where}: ${JSON.stringify(said.map((s) => s.text))}`,
        )
        .toBe(true);
    }

    // The inputs, edited, move it: 1024 then 640.
    const w = page.locator('main input[name="w"]');
    const h = page.locator('main input[name="h"]');
    await w.fill("1024");
    await page.keyboard.press("Tab");
    await settled(page, [1024, 460], 2000);
    const spokenAtEdit = (await instruments(page))?.spoken.length ?? 0;
    await h.fill("640");
    await page.keyboard.press("Tab");
    const edited = await settled(page, [1024, 640], 2000);
    // Its words land before the drag starts, so the drag's count holds only the drag's.
    await spokenSince(page, spokenAtEdit, [1024, 640]);
    expect
      .soft(
        { w: edited.w, h: edited.h, path: edited.path },
        "the frame after typing 1024 and 640",
      )
      .toEqual({ w: 1024, h: 640, path: "/trials/1024x640" });

    // A mouse drag: nothing spoken during it, once on release.
    const spokenBefore = (await instruments(page))?.spoken.length ?? 0;
    const hand = mouseHand(page);
    const target: Win = [792, 575];
    const follow: string[] = [];
    const drag = await dragTo(page, hand, target, TIGHT, async (r) => {
      if (r.inputs[0] !== String(r.w) || r.inputs[1] !== String(r.h))
        follow.push(`frame ${r.w} x ${r.h}, inputs ${r.inputs.join(" x ")}`);
    });
    expect.soft(drag.taken, "a mouse drag taken from 1024 x 640").toBe(true);
    expect.soft(follow, "the inputs following a mouse drag live").toEqual([]);
    await hand.up();
    const rest = await settled(page, target);
    const spoken = await spokenSince(page, spokenBefore, target);
    expect
      .soft(
        spoken.filter((s) => s.dragging).map((s) => s.text),
        "the live region during a mouse drag",
      )
      .toEqual([]);
    expect
      .soft(
        spoken.filter((s) => !s.dragging && s.text !== "").length,
        `the live region's words once released at ${rest.w} x ${rest.h}: ${JSON.stringify(spoken.map((s) => s.text))}`,
      )
      .toBe(1);
    expect
      .soft(
        { w: rest.w, h: rest.h, inputs: rest.inputs },
        "the frame and the inputs once released",
      )
      .toEqual({ w: target[0], h: target[1], inputs: ["792", "575"] });
    await ctx.close();
  }

  // An edit 1 px from the shown window that is itself swept settles on it, as the form without
  // script does: 1439 x 900 is in H10's run, prerendered at /trials/1439x900. A grid step from
  // 1440 would land on 1424 (Lens on e4eeb33, lib/trials-live.ts typed()).
  {
    const exact: Win = [1439, 900];
    const swept = trialAt(exact);
    expect(swept, `${at(exact)} is in the sweep`).toBeDefined();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    const w = page.locator('main input[name="w"]');
    // Give the controller its first touch before typing.
    await w.focus();
    await nodeWait(1000);
    await w.fill(String(exact[0]));
    await page.keyboard.press("Tab");
    const r = await settled(page, exact, 2000);
    expect
      .soft(
        { path: r.path, w: r.w, h: r.h, size: r.size },
        `the frame after typing ${exact[0]} in Width at ${at(HOME)}`,
      )
      .toEqual({
        path: addressOf(exact),
        w: exact[0],
        h: exact[1],
        size: sizeWords(exact),
      });
    expect
      .soft(
        Number(r.freeboard),
        `[data-freeboard] ${r.freeboard} at ${r.w} x ${r.h} against the sweep's for ${at(exact)}`,
      )
      .toBeCloseTo(swept?.freeboard ?? Number.NaN, 1);
    await ctx.close();
  }

  // A finger, at 390 x 844: the page scrolls by touch off the handle, and the handle drags.
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await instrument(page);
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    const cdp = await ctx.newCDPSession(page);
    const finger = fingerHand(cdp);

    const start = await page.evaluate(() => {
      const el = document.elementFromPoint(195, 600);
      return {
        what: el ? `<${el.tagName.toLowerCase()}>` : "nothing",
        handle: Boolean(el?.closest("[data-corner]")),
      };
    });
    expect
      .soft(start.handle, "the swipe's start is off the handle")
      .toBe(false);
    await finger.down(195, 600);
    for (let y = 560; y >= 200; y -= 40) await finger.move(195, y);
    await finger.up();
    await nodeWait(800);
    const scrolled = await page.evaluate(() => scrollY);
    expect
      .soft(
        scrolled,
        `scrollY after a finger swipe up from (195, 600) over ${start.what}`,
      )
      .toBeGreaterThan(100);
    await page.evaluate(() => scrollTo(0, 0));
    await nodeWait(200);

    const spokenBefore = (await instruments(page))?.spoken.length ?? 0;
    const follow: string[] = [];
    const drag = await dragTo(page, finger, GAP, { w: 6, h: 2 }, async (r) => {
      if (r.inputs[0] !== String(r.w) || r.inputs[1] !== String(r.h))
        follow.push(`frame ${r.w} x ${r.h}, inputs ${r.inputs.join(" x ")}`);
    });
    expect(drag.shown, `a shown ${CORNER} at 390 x 844`).toBe(true);
    expect(drag.taken, "a finger's drag taken: [data-dragging] on touch").toBe(
      true,
    );
    expect
      .soft(
        drag.reached,
        `the finger brought the frame near ${at(GAP)} in ${drag.moves} moves (at ${drag.read?.w} x ${drag.read?.h})`,
      )
      .toBe(true);
    expect.soft(follow, "the inputs following a finger live").toEqual([]);
    await finger.up();
    const rest = await settled(page, GAP);
    expect
      .soft(
        { w: rest.w, h: rest.h, size: rest.size, path: rest.path },
        "the frame once the finger lifts",
      )
      .toEqual({
        w: GAP[0],
        h: GAP[1],
        size: sizeWords(GAP),
        path: addressOf(GAP),
      });
    const spoken = await spokenSince(page, spokenBefore, GAP);
    expect
      .soft(
        spoken.filter((s) => s.dragging).map((s) => s.text),
        "the live region during a finger's drag",
      )
      .toEqual([]);
    const said = spoken.filter((s) => !s.dragging && s.text !== "");
    expect
      .soft(
        said.length === 1 &&
          (said[0]?.text.includes(spokenWords(GAP)) ?? false) &&
          (said[0]?.text.includes(VERDICT.gap) ?? false),
        `the live region spoke once with ${at(GAP)} and "${VERDICT.gap}": ${JSON.stringify(said.map((s) => s.text))}`,
      )
      .toBe(true);
    await cdp.detach();
    await ctx.close();
  }
});

test("T13 the address is replaced, never pushed: after a key settle and a drag, location.pathname is the settled window's address (/trials for 1440x900), the title and canonical are its own and history.length is unchanged; Back leaves the page as before; a reload of the replaced address with scripts off shows the same window, verdict and number; Copy link writes the settled window's absolute URL and says so in the live region", async ({
  browser,
  request,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();
  await instrument(page);
  await page.goto(addressOf(GAP));
  expect(
    (await page.goto("/trials/1424x900"))?.status(),
    "status of /trials/1424x900",
  ).toBe(200);
  await frameReady(page);
  const length = await page.evaluate(() => history.length);

  const checkAddress = async (win: Win, after: string) => {
    const head = await serverHead(request, addressOf(win));
    await settled(page, win);
    const r = await until(
      () => readNow(page),
      (now) =>
        now.title === head.title &&
        now.canonical.join() === `${SITE_URL}${addressOf(win)}`,
      2000,
    );
    expect
      .soft(
        {
          w: r.w,
          h: r.h,
          path: r.path,
          title: r.title,
          canonical: r.canonical,
          history: r.history,
        },
        `the address after ${after}`,
      )
      .toEqual({
        w: win[0],
        h: win[1],
        path: addressOf(win),
        title: head.title,
        canonical: [`${SITE_URL}${addressOf(win)}`],
        history: length,
      });
    return r;
  };

  // A key settle onto 1440 x 900: the address is /trials.
  const corner = page.locator(CORNER);
  expect(await corner.count(), `one ${CORNER}`).toBe(1);
  await corner.focus();
  await nodeWait(1000);
  await page.keyboard.press("ArrowRight");
  await checkAddress(HOME, "ArrowRight from 1424 x 900");

  // A drag to 390 x 664.
  const target: Win = [390, 664];
  const hand = mouseHand(page);
  const drag = await dragTo(page, hand, target, TIGHT);
  expect(drag.taken, "a mouse drag taken").toBe(true);
  await hand.up();
  const rest = await checkAddress(target, "a drag to 390 x 664");

  // Copy link.
  const spokenBefore = (await instruments(page))?.spoken.length ?? 0;
  const copy = page.locator(COPY);
  expect(await copy.count(), `one ${COPY}`).toBe(1);
  expect
    .soft(
      await copy.evaluate((el) => el.tagName.toLowerCase()),
      "Copy link is a button",
    )
    .toBe("button");
  await copy.click();
  await nodeWait(500);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const absolute = [
    new URL(addressOf(target), baseURL).href,
    `${SITE_URL}${addressOf(target)}`,
  ];
  expect
    .soft(
      absolute.includes(copied),
      `the clipboard "${copied}" is one of ${absolute.join(", ")}`,
    )
    .toBe(true);
  const spoken = (await instruments(page))?.spoken.slice(spokenBefore) ?? [];
  expect
    .soft(
      spoken.some((s) => /copied/i.test(s.text)),
      `the live region says the link was copied: ${JSON.stringify(spoken.map((s) => s.text))}`,
    )
    .toBe(true);

  // Back leaves the page: to 320 x 568, the page before 1424 x 900.
  await page.goBack();
  const back = await until(
    () => readNow(page),
    (r) => r.size === sizeWords(GAP),
    5000,
  );
  expect
    .soft(
      { path: back.path, size: back.size },
      "Back from the replaced address",
    )
    .toEqual({ path: addressOf(GAP), size: sizeWords(GAP) });
  await ctx.close();

  // The replaced address, reloaded without script.
  const off = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const plain = await off.newPage();
  expect
    .soft(
      (await plain.goto(rest.path))?.status(),
      `status of ${rest.path}, scripts off`,
    )
    .toBe(200);
  const again = await readNow(plain);
  expect
    .soft(
      { size: again.size, verdict: again.verdict, freeboard: again.freeboard },
      `${rest.path} reloaded with scripts off`,
    )
    .toEqual({
      size: rest.size,
      verdict: rest.verdict,
      freeboard: rest.freeboard,
    });
  await off.close();

  // Back within the page: the skip link pushes /trials#main, a key settle replaces that entry, and
  // Back returns to /trials in the same document. The address, the readout, the frame and Copy
  // link then name one window (Lens on cc5d690: popstate went unheard).
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await ctx.newPage();
    expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(
      200,
    );
    await frameReady(page);
    await page.locator('a[href="#main"]').focus();
    await page.keyboard.press("Enter");
    expect(
      await until(
        () => page.evaluate(() => location.hash),
        (hash) => hash === "#main",
        2000,
      ),
      "the skip link followed",
    ).toBe("#main");
    const corner = page.locator(CORNER);
    await corner.focus();
    await nodeWait(1000);
    const stepped: Win = [1424, 900];
    await page.keyboard.press("ArrowLeft");
    const keyed = await settled(page, stepped, 1000);
    expect
      .soft(
        { path: keyed.path, size: keyed.size },
        "after ArrowLeft from the skip link's /trials#main",
      )
      .toEqual({ path: addressOf(stepped), size: sizeWords(stepped) });

    await page.goBack();
    await nodeWait(1000);
    const named = (path: string): Win | null => {
      if (path === "/trials") return HOME;
      const m = path.match(/^\/trials\/(\d+)x(\d+)$/);
      return m ? [Number(m[1]), Number(m[2])] : null;
    };
    const agree = (r: Now) => {
      const win = named(r.path);
      return (
        win !== null &&
        r.size === sizeWords(win) &&
        r.w === win[0] &&
        r.h === win[1]
      );
    };
    const back = await until(() => readNow(page), agree, 3000);
    const win = named(back.path);
    expect
      .soft(
        { path: back.path, size: back.size, w: back.w, h: back.h },
        `Back from ${addressOf(stepped)} to the skip link's entry: the address, [data-size] and the frame name one window`,
      )
      .toEqual({
        path: back.path,
        size: win ? sizeWords(win) : "a window the address names",
        w: win?.[0],
        h: win?.[1],
      });
    await page.locator(COPY).click();
    await nodeWait(500);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // The link hands over the window the visitor sees, whatever the address says.
    const sizeMatch = back.size?.match(/^(\d+) × (\d+)$/);
    const shown: Win | null = sizeMatch
      ? [Number(sizeMatch[1]), Number(sizeMatch[2])]
      : null;
    const absolute = shown
      ? [
          new URL(addressOf(shown), baseURL).href,
          `${SITE_URL}${addressOf(shown)}`,
        ]
      : [];
    expect
      .soft(
        absolute.includes(copied),
        `after Back, showing ${back.size}, the clipboard "${copied}" is one of ${absolute.join(", ")}`,
      )
      .toBe(true);
    await ctx.close();
  }
});

test("T14 quick under the hand: at 4x CPU, a 40-step mouse drag across the corner's range: every Event Timing entry for pointer events during it within 200 ms, gated; its long animation frames reported (pointermove has no Event Timing entry); once settled, no animation frame requested from rest + 1 s", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await instrument(page);
  expect((await page.goto("/trials"))?.status(), "status of /trials").toBe(200);
  await frameReady(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const corner = await cornerAt(page);
  expect(corner, `a shown ${CORNER}`).not.toBeNull();
  const frame = (await readNow(page)).frame;
  expect(frame, "the drawn frame").not.toBeNull();
  if (!corner || !frame) return;
  const t0 = await page.evaluate(() => performance.now());
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down();
  const taken = await until(
    () => readNow(page),
    (r) => r.dragging,
    10_000,
  );
  expect(taken.dragging, "the drag taken at 4x CPU").toBe(true);
  // Across the range: toward the drawn frame's top left, 40 moves.
  const to = {
    x: frame.left + frame.width * 0.1,
    y: frame.top + frame.height * 0.1,
  };
  for (let i = 1; i <= 40; i++)
    await page.mouse.move(
      corner.x + ((to.x - corner.x) * i) / 40,
      corner.y + ((to.y - corner.y) * i) / 40,
    );
  const t1 = await page.evaluate(() => performance.now());
  await page.mouse.up();
  const rest = await settled(page, undefined, 10_000);
  expect
    .soft(
      rest.dragging === false &&
        rest.w !== null &&
        rest.w < HOME[0] &&
        rest.size === `${rest.w} × ${rest.h}`,
      `the drag moved the frame and settled (${rest.w} x ${rest.h}, shown ${rest.size})`,
    )
    .toBe(true);
  await nodeWait(500);
  const timed = await instruments(page);
  const pointer = (timed?.events ?? []).filter(
    (e) =>
      e.startTime >= t0 &&
      /^(pointer|mouse|click|auxclick|contextmenu|gotpointercapture|lostpointercapture|touch)/.test(
        e.name,
      ),
  );
  const loafs = (timed?.loafs ?? []).filter(
    (e) => e.startTime >= t0 && e.startTime <= t1 + 200,
  );
  test.info().annotations.push({
    type: "event timing",
    description: `${pointer.length} pointer entries of 16 ms or more (${[...new Set(pointer.map((e) => e.name))].join(", ")}), longest ${Math.max(0, ...pointer.map((e) => e.duration)).toFixed(0)} ms`,
  });
  expect
    .soft(
      pointer
        .filter((e) => e.duration > 200)
        .map((e) => `${e.name} ${e.duration.toFixed(0)} ms`),
      "pointer events over 200 ms during the drag at 4x CPU",
    )
    .toEqual([]);
  // Reported, not gated (Atlas's ruling, sprint 64): the contract gates the drag's INP, and the
  // long frames are the framed /'s own relayout on each resize, which a loaded box stretches.
  test.info().annotations.push({
    type: "long animation frames, reported",
    description: `${loafs.length} long animation frames during the drag at 4x CPU, ${loafs.filter((e) => e.duration > 200).length} over 200 ms, longest ${Math.max(0, ...loafs.map((e) => e.duration)).toFixed(0)} ms`,
  });

  await nodeWait(1000);
  const r0 = (await instruments(page))?.raf ?? Number.NaN;
  await nodeWait(2000);
  const r1 = (await instruments(page))?.raf ?? Number.NaN;
  expect
    .soft(r1 - r0, "requestAnimationFrame calls from rest + 1 s, over 2 s")
    .toBe(0);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
});

// The card's words (selectors.md), imported statically: a dynamic import() hands the module's own
// requires to Node's CJS loader, which resolves lib/trials-words.ts's `./trials-sweep` to the
// .json twin and throws (Forge, sprint 64). Until forge/64 lands, this file fails to load.
type TrialCard = { lines: readonly string[]; alt: string };
type CardModule = {
  trialCard?: (win: readonly [number, number]) => TrialCard | undefined;
};

const T15_WINDOWS: readonly Win[] = (() => {
  const run = PIN_WINDOWS.filter((w) => w[1] === 900 && w[0] >= 1380);
  const listed = PIN_WINDOWS.filter((w) => !run.includes(w));
  const picked = [run[0], run[Math.floor(run.length / 2)], run.at(-1)].filter(
    (w): w is Win => w !== undefined,
  );
  const except = new Set([...PIN_WINDOWS, ...NAMED, ...CORNERS].map(key));
  return [
    ...listed,
    ...picked,
    ...NAMED,
    ...CORNERS,
    ...seeded(6415, 3, except),
  ];
})();

test("T15 a card per window: each swept window's address has one og:image and one twitter:image of its own, image/png 1200x630, whose alt and drawn words (lib/trials-card.ts) carry the window's size, its signed freeboard from the sweep and its verdict in Iris's words (320x568: \"Under by 6.2 px. The crew's own gap.\"); /trials's card is 1440x900's; a window off the sweep never gets a card", async ({
  request,
}) => {
  test.setTimeout(180_000);
  const card: CardModule = { trialCard };
  expect
    .soft(typeof card.trialCard, "lib/trials-card.ts's trialCard")
    .toBe("function");

  const fetchImage = async (tag: string) => {
    const url = new URL(tag);
    const response = await request.get(url.pathname + url.search, {
      maxRedirects: 0,
    });
    const png = await response.body();
    return {
      path: url.pathname,
      status: response.status(),
      type: response.headers()["content-type"],
      size:
        png.length >= 24 ? [png.readUInt32BE(16), png.readUInt32BE(20)] : [],
      signature: png.subarray(1, 4).toString("latin1"),
      hash: createHash("sha256").update(png).digest("hex"),
    };
  };
  const root = await serverHead(request, "/");
  const rootCard = await fetchImage(root.ogImage[0] ?? `${SITE_URL}/`);

  /**
   * What an alt or a card's drawn words must hold for a window (contract, T15): the size, `{f} px`
   * and the verdict; the alt also the signed value (Iris's "freeboard −6.2 px", U+2212 or +), the
   * drawn words "Under by {f} px" when it sinks (Atlas's ruling on the alt, sprint 64).
   */
  const wordsProblems = (text: string, win: Win, what: "alt" | "drawn") => {
    const trial = trialAt(win);
    if (!trial) return ["no sweep reading"];
    const f = fOf(trial.freeboard);
    const signed = `${sinks(trial.kind) ? "−" : "+"}${f}`;
    const out: string[] = [];
    if (!text.includes(sizeWords(win))) out.push(`no "${sizeWords(win)}"`);
    if (!text.includes(`${f} px`)) out.push(`no "${f} px"`);
    if (what === "alt" && !text.includes(signed)) out.push(`no "${signed}"`);
    if (
      what === "drawn" &&
      sinks(trial.kind) &&
      !text.includes(`Under by ${f} px`)
    )
      out.push(`no "Under by ${f} px"`);
    if (!text.includes(VERDICT[trial.kind]))
      out.push(`no "${VERDICT[trial.kind]}"`);
    return out;
  };

  const problems: string[] = [];
  const hashes = new Map<string, string>();
  let gapPath = "";
  const windows = [HOME, ...T15_WINDOWS].filter(
    (win, i, all) => all.findIndex((w) => key(w) === key(win)) === i,
  );
  for (const win of windows) {
    const address = addressOf(win);
    const head = await serverHead(request, address);
    const where = `${address} (${at(win)})`;
    if (head.ogImage.length !== 1 || head.twitterImage.length !== 1) {
      problems.push(
        `${where}: ${head.ogImage.length} og:image, ${head.twitterImage.length} twitter:image`,
      );
      continue;
    }
    for (const [name, tag] of [
      ["og:image", head.ogImage[0] ?? ""],
      ["twitter:image", head.twitterImage[0] ?? ""],
    ] as const) {
      const image = await fetchImage(tag);
      const own =
        address === "/trials"
          ? image.path.startsWith("/trials/") &&
            !/^\/trials\/\d+x\d+\//.test(image.path)
          : image.path.startsWith(`${address}/`);
      if (!own) problems.push(`${where}: ${name} ${image.path} isn't its own`);
      if (
        image.status !== 200 ||
        image.type !== "image/png" ||
        image.signature !== "PNG" ||
        image.size.join("x") !== "1200x630"
      )
        problems.push(
          `${where}: ${name} ${image.status} ${image.type} ${image.signature} ${image.size.join("x")}`,
        );
      if (image.hash === rootCard.hash)
        problems.push(`${where}: ${name} is /'s card`);
      if (name === "og:image") hashes.set(address, image.hash);
      if (name === "og:image" && key(win) === key(GAP)) gapPath = image.path;
    }
    const alt = head.ogImageAlt.length === 1 ? (head.ogImageAlt[0] ?? "") : "";
    if (head.ogImageAlt.length !== 1)
      problems.push(`${where}: ${head.ogImageAlt.length} og:image:alt`);
    for (const p of wordsProblems(alt, win, "alt"))
      problems.push(`${where}: og:image:alt "${alt}" has ${p}`);
    const words = card.trialCard?.(win);
    if (card.trialCard && !words)
      problems.push(`${where}: trialCard gives nothing`);
    if (words) {
      if (words.alt !== alt)
        problems.push(
          `${where}: trialCard's alt "${words.alt}" isn't the tag's`,
        );
      for (const p of wordsProblems(words.lines.join(" "), win, "drawn"))
        problems.push(`${where}: the card's drawn words have ${p}`);
    }
    if (key(win) === key(GAP)) {
      // The contract's quote is the drawn lines' (Atlas's ruling): the alt carries its parts.
      const quote = "Under by 6.2 px. The crew's own gap.";
      if (words && !words.lines.join(" ").includes(quote))
        problems.push(`${where}: the card's words lack "${quote}"`);
    }
  }
  expect.soft(problems, "the windows' cards").toEqual([]);
  expect
    .soft(
      hashes.get("/trials") !== undefined &&
        hashes.get("/trials") !== hashes.get(addressOf(GAP)),
      "/trials's card differs from 320 x 568's",
    )
    .toBe(true);

  // Off the sweep: no card, and the module gives none.
  expect.soft(gapPath, "320 x 568's card path").not.toBe("");
  const own = `/trials/${key(GAP)}/`;
  for (const off of ["330x560", "1921x900"]) {
    // 320 x 568's card path with the window replaced; Next's file name when it has none of its own.
    const path = gapPath.startsWith(own)
      ? gapPath.replace(own, `/trials/${off}/`)
      : `/trials/${off}/opengraph-image`;
    const response = await request.get(path, { maxRedirects: 0 });
    expect
      .soft(
        response.status() === 200 &&
          response.headers()["content-type"] === "image/png",
        `${path} answers ${response.status()} ${response.headers()["content-type"]}: no card off the sweep`,
      )
      .toBe(false);
  }
  if (card.trialCard)
    expect
      .soft(card.trialCard([330, 560]), "trialCard off the sweep")
      .toBeUndefined();

  // The images draw the module's words.
  for (const file of [
    "app/trials/opengraph-image.tsx",
    "app/trials/[window]/opengraph-image.tsx",
  ]) {
    let source = "";
    try {
      source = readFileSync(join(process.cwd(), file), "utf8");
    } catch {
      // Missing: the import check below says so.
    }
    expect
      .soft(
        /from\s+["'](?:@\/lib|(?:\.\.\/)+lib)\/trials-card["']/.test(source),
        `${file} imports lib/trials-card`,
      )
      .toBe(true);
  }
});
