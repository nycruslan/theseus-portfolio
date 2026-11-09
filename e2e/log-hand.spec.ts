import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  type Browser,
  expect,
  type Page,
  test,
} from "@playwright/test";
import { atRest } from "./ghost";
import {
  composite,
  contrast,
  horizontalOverflow,
  installRgba,
  MOTION,
  parseColor,
  type Rgb,
  SCHEMES,
  textStyles,
} from "./helpers";
import { LOG, RECORD, recordOf, YARD_WORDS } from "./log";
import { BAR, note, pause } from "./model";
import {
  NEWEST_STEP,
  PLANK_IDS,
  QUESTION_STEP,
  STEPS,
  stepIndex,
} from "./retros";
import { type ModelOptions, type ModelRun, openModel } from "./webgl";
import { landedOn, linkAt, readSafe, tagDocument } from "./yard";

// Sprint 59, Ha: the yard plays in a phone's window, and says how (.crew/sprint/58/
// first-contract.md, H1 to H7). Someone sent /log/23 presses on without scrolling: the step link is
// wholly in the first screen of a phone's window on every sampled step, scripts on and off. /log's
// Start again invites a rebuild; a step page says how to play it (`[data-yard-hint]`, shown only
// while the yard plays: `.log:has(> [data-model][data-yard])`); the first chapter step says why a
// riffle stops there (`p[data-yard-chapter]`). The checks hold where the link is, never how it got
// there, so they stand whatever Iris places (.crew/sprint/59/placement.md), but for one guard of
// her placement she asked for (the row's place is a sum). Every word is YARD_WORDS's (e2e/log.ts);
// every step and sprint comes from e2e/retros.ts.
//
// Lean on purpose: the Log specs share CI's shard 2 (18 min 56 s of 20 on sprint 56), so each window
// opens one page per mode and walks the steps in it, and every rule over every step reads the
// server's HTML by request.

const HINT = "[data-yard-hint]";
const CHAPTER = "p[data-yard-chapter]";
const QUESTION = "p[data-yard-question]";
const THESEUS = "[data-theseus]";
const GHOST_HULL = "[data-ghost]";
const COUNT = "[data-ghost-count]";
/** The yard playing the step links, as CSS reads it (the contract's hook). */
const PLAYING = ".log:has(> [data-model][data-yard])";
const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';
/** checkVisibility as a visitor meets it: an element at opacity 0 or visibility hidden isn't shown. */
const VISIBLE = { opacityProperty: true, visibilityProperty: true };
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

type Size = { width: number; height: number };
type Window_ = Size & { scheme: "light" | "dark" };
const at = ({ width, height }: Size) => `${width} x ${height}`;

/** H1's windows: the three phones in light, and the middle one in dark. */
const PHONES: Window_[] = [
  { width: 390, height: 664, scheme: "light" },
  { width: 390, height: 664, scheme: "dark" },
  { width: 360, height: 640, scheme: "light" },
  { width: 320, height: 568, scheme: "light" },
];
const PHONE: Size = { width: 390, height: 664 };
const DESKTOP: Size = { width: 1440, height: 900 };

/** The first chapter step, where k = 44 (/log/45 today). */
const CHAPTER_STEP = STEPS[2 * PLANK_IDS.length - 1] ?? Number.NaN;
const FIRST_STEP = STEPS[0] ?? 1;
/** H1's steps: the first, 13, the question's, the first chapter's and the newest. */
const H1_STEPS = [
  ...new Set([FIRST_STEP, 13, QUESTION_STEP ?? 23, CHAPTER_STEP, NEWEST_STEP]),
];
/** H3's steps. */
const H3_STEPS = [...new Set([13, NEWEST_STEP])];

/**
 * The chapter rule, word for word: "For a step whose merge count k is a multiple of 22 with k ≥ 44,
 * … S = the (k − 22)th merged sprint (`merged[k − 23]`, oldest first)". Undefined on every other k.
 */
function chapterSprint(k: number, merged: readonly number[]) {
  const all = PLANK_IDS.length;
  return k % all === 0 && k >= 2 * all ? merged[k - all - 1] : undefined;
}

/** The step link to press on step n: next, previous on the newest. */
const pressedOn = (n: number) => (n === NEWEST_STEP ? "previous" : "next");

/** From 1024 up, the drawings' boxes (left, page top, width, height) read on 3b3f211, main's code at 19f675e. */
const WIDE_BOXES: Record<
  string,
  { theseus: [number, number, number, number]; ghost: number[] }
> = {
  "1024 x 768": {
    theseus: [40, 104, 568, 113.234],
    ghost: [40, 271.313, 568, 113.234],
  },
  "1440 x 900": {
    theseus: [40, 104, 900, 179.422],
    ghost: [40, 338.063, 900, 179.422],
  },
};

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

// ---------------------------------------------------------------------------------------------
// Readers (assertion-free)

type Rect = { left: number; top: number; right: number; bottom: number };

/** What a first screen shows, from the DOM alone (page.evaluate: it works with scripts off). */
function readScreen(page: Page) {
  return page.evaluate(
    ({
      bar,
      hint,
      chapter,
      question,
      theseus,
      ghost,
      playing,
      focusable,
      visible,
    }) => {
      const squash = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const rect = (el: Element | null | undefined) => {
        if (!el || el.getClientRects().length === 0) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      const shownOne = (css: string) =>
        [...document.querySelectorAll(css)].find(
          (el) => el.getClientRects().length > 0,
        ) ?? null;
      const said = (css: string) =>
        [...document.querySelectorAll(css)].map((el) => ({
          text: squash(el),
          shown: el.checkVisibility(visible),
          box: rect(el),
          focusable:
            (el.matches(focusable) ? 1 : 0) +
            el.querySelectorAll(focusable).length,
        }));
      return {
        width: document.documentElement.clientWidth,
        height: innerHeight,
        scrollY,
        bar: rect(document.querySelector(bar)),
        playing: Boolean(document.querySelector(playing)),
        previous: rect(shownOne('a[data-step="previous"]')),
        next: rect(shownOne('a[data-step="next"]')),
        start: rect(shownOne('a[data-step="start"]')),
        theseus: rect(document.querySelector(theseus)),
        ghost: rect(document.querySelector(ghost)),
        question: rect(document.querySelector(question)),
        hints: said(hint),
        chapters: said(chapter),
      };
    },
    {
      bar: BAR,
      hint: HINT,
      chapter: CHAPTER,
      question: QUESTION,
      theseus: THESEUS,
      ghost: GHOST_HULL,
      playing: PLAYING,
      focusable: FOCUSABLE,
      visible: VISIBLE,
    },
  );
}
type Screen = Awaited<ReturnType<typeof readScreen>>;

/** Wholly in the first screen: scroll 0, top at or below the bar's bottom, bottom at or above innerHeight. */
const wholly = (b: Rect | null, s: Screen) =>
  b !== null &&
  s.scrollY === 0 &&
  b.top >= (s.bar?.bottom ?? 0) - 0.5 &&
  b.bottom <= s.height + 0.5 &&
  b.left >= -0.5 &&
  b.right <= s.width + 0.5;
/** Starts in the first screen (Y5's clause): its top inside it, at scroll 0. */
const starts = (b: Rect | null, s: Screen) =>
  b !== null && s.scrollY === 0 && b.top >= -0.5 && b.top < s.height;
const where = (b: Rect | null, s: Screen) =>
  b
    ? `${b.top.toFixed(1)} to ${b.bottom.toFixed(1)} (x ${b.left.toFixed(1)} to ${b.right.toFixed(1)}), bar to ${s.bar?.bottom ?? "none"}, window ${s.width} x ${s.height}, scroll ${s.scrollY}`
    : "not shown";

/** A page with scripts off, its fonts awaited from the test (memory: sprints 5 and 9). */
async function scriptsOff(
  browser: Browser,
  size: Window_ | Size,
  forced = false,
) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: size.width, height: size.height },
    colorScheme: "scheme" in size ? size.scheme : "light",
    forcedColors: forced ? "active" : "none",
  });
  const page = await context.newPage();
  const go = async (url: string) => {
    const response = await page.goto(url);
    for (
      let i = 0;
      i < 50 && (await page.evaluate(() => document.fonts.status)) !== "loaded";
      i++
    ) {
      await pause(100);
    }
    return response?.status();
  };
  return { context, page, go };
}

/** Waits for the yard to play the step links ([data-model][data-yard]); asserts nothing. */
async function yardPlaying(page: Page, timeout = 20_000) {
  await page
    .waitForFunction((css) => Boolean(document.querySelector(css)), PLAYING, {
      timeout,
    })
    .catch(() => undefined);
}

/** The chapter lines and the Theseus's numbers in `html`, parsed in the page (no load). */
function readChapters(page: Page, html: string) {
  return page.evaluate(
    ({ html, chapter, count, record, theseus, hint, focusable }) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const squash = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const follows = (a: Element | null, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const countLine = doc.querySelector(count);
      const recordEl = doc.querySelector(record);
      return {
        chapters: [...doc.querySelectorAll(chapter)].map((p) => ({
          text: squash(p),
          inHead: Boolean(p.closest(".log-head")),
          afterCount: follows(countLine, p),
          beforeRecord: recordEl ? follows(p, recordEl) : false,
        })),
        hints: [...doc.querySelectorAll(hint)].map((h) => ({
          text: squash(h),
          focusable:
            (h.matches(focusable) ? 1 : 0) +
            h.querySelectorAll(focusable).length,
        })),
        sprints: [...doc.querySelectorAll(`${theseus} path[data-plank]`)]
          .map((p) => p.getAttribute("data-sprint"))
          .filter((s): s is string => s !== null)
          .map(Number),
      };
    },
    {
      html,
      chapter: CHAPTER,
      count: COUNT,
      record: RECORD,
      theseus: THESEUS,
      hint: HINT,
      focusable: FOCUSABLE,
    },
  );
}

/** Every page's server HTML read by `readChapters`, through one blank page. */
async function serverReads(
  browser: Browser,
  request: APIRequestContext,
  urls: readonly string[],
) {
  const context = await browser.newContext({ javaScriptEnabled: true });
  const page = await context.newPage();
  const reads = new Map<string, Awaited<ReturnType<typeof readChapters>>>();
  for (const url of urls) {
    const response = await request.get(url);
    expect.soft(response.status(), `status of ${url}`).toBe(200);
    reads.set(url, await readChapters(page, await response.text()));
  }
  await context.close();
  return reads;
}

/** Records the largest scrollY the page reaches from now on. */
function watchScroll(page: Page) {
  return page.evaluate(() => {
    const w = window as Window & { __maxScroll?: number };
    w.__maxScroll = 0;
    addEventListener(
      "scroll",
      () => {
        w.__maxScroll = Math.max(w.__maxScroll ?? 0, scrollY);
      },
      { passive: true },
    );
  });
}
const maxScroll = (page: Page) =>
  page.evaluate(
    () => (window as Window & { __maxScroll?: number }).__maxScroll ?? -1,
  );

/**
 * A press of the step link as a visitor taps it: the mouse at its centre when that's in the window,
 * else (a link below the first screen) the keyboard on it with no scroll, so the walk goes on and
 * every later step is still read.
 */
async function pressStep(page: Page, kind: "previous" | "next") {
  const centre = await linkAt(page, kind);
  const inside = await page.evaluate(
    (c) => c !== null && c.y > 0 && c.y < innerHeight,
    centre,
  );
  if (centre && inside) {
    await page.mouse.click(centre.x, centre.y);
    return;
  }
  await page.evaluate((css) => {
    const a = [...document.querySelectorAll<HTMLElement>(css)].find(
      (el) => el.getClientRects().length > 0,
    );
    a?.focus({ preventScroll: true });
  }, `a[data-step="${kind}"]`);
  await page.keyboard.press("Enter");
}

/** Every shown element in main with a box, by a path of its own (for "moves nothing"). */
function mainBoxes(page: Page, except: string) {
  return page.evaluate((skip) => {
    const out: Record<string, number[]> = {};
    const walk = (el: Element, path: string) => {
      [...el.children].forEach((child, i) => {
        const here = `${path}>${child.tagName.toLowerCase()}:${i}`;
        if (child.closest(skip)) return;
        if (child.getClientRects().length > 0) {
          const r = child.getBoundingClientRect();
          out[here] = [r.left, r.top + scrollY, r.width, r.height];
        }
        walk(child, here);
      });
    };
    const main = document.querySelector("main");
    if (main) walk(main, "main");
    return out;
  }, except);
}

// ---------------------------------------------------------------------------------------------
// H1 The press in a phone's window

for (const phone of PHONES) {
  const size = `${at(phone)}, ${phone.scheme}`;
  test(`H1 The press in a phone's window, ${size}: with scripts off and in Full once [data-model] has data-yard (on /log, which plays no steps, at rest), on ${H1_STEPS.map(recordOf).join(", ")} the step link to press (next; previous on the newest) is wholly in the first screen (top at or below the bar's bottom, bottom at or above innerHeight, scroll 0) and the tops of both drawings start in it; on /log/${QUESTION_STEP} the question ${phone.width === 320 ? "starts" : "is wholly"} in it; on /log, Start again is wholly in it`, async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const urls = [LOG, ...H1_STEPS.map(recordOf)];
    const check = (url: string, s: Screen, mode: string) => {
      const here = `${url} at ${size}, ${mode}`;
      if (url === LOG) {
        expect
          .soft(
            wholly(s.start, s),
            `Start again wholly in the first screen on ${here}: ${where(s.start, s)}`,
          )
          .toBe(true);
      } else {
        const n = Number(url.slice(LOG.length + 1));
        const kind = pressedOn(n);
        expect
          .soft(
            wholly(s[kind], s),
            `${kind} wholly in the first screen on ${here}: ${where(s[kind], s)}`,
          )
          .toBe(true);
        if (n === QUESTION_STEP) {
          const placed = phone.width === 320 ? starts : wholly;
          expect
            .soft(
              placed(s.question, s),
              `the question ${phone.width === 320 ? "starts" : "wholly"} in the first screen on ${here}: ${where(s.question, s)}`,
            )
            .toBe(true);
        }
      }
      for (const [name, b] of [
        ["the Theseus", s.theseus],
        ["the ghost", s.ghost],
      ] as const) {
        expect
          .soft(
            starts(b, s),
            `${name}'s top in the first screen on ${here}: ${where(b, s)}`,
          )
          .toBe(true);
      }
    };

    const off = await scriptsOff(browser, phone);
    for (const url of urls) {
      expect.soft(await off.go(url), `status of ${url}, scripts off`).toBe(200);
      check(url, await readScreen(off.page), "scripts off");
    }
    await off.context.close();

    const run = await openModel(browser, phone);
    for (const url of urls) {
      await run.goto(url);
      // /log has no step links to play: there, Full is the model at rest.
      if (url === LOG) await atRest(run, `on /log in Full at ${size}`);
      else await yardPlaying(run.page);
      const s = await readScreen(run.page);
      if (url !== LOG)
        expect(s.playing, `${PLAYING} on ${url} in Full at ${size}`).toBe(true);
      check(url, s, url === LOG ? "Full at rest" : "Full, the yard playing");
    }
    expect.soft(run.errors, `console errors at ${size}`).toEqual([]);
    await run.close();
  });
}

const WALK = STEPS.slice(
  STEPS.indexOf(13),
  STEPS.indexOf(QUESTION_STEP ?? 23) + 1,
);

test(`H1 The walk at 390 x 664: with scripts off, from /log/13 each press until /log/${QUESTION_STEP} (${WALK.join(", ")}) finds next wholly in view at scroll 0 before it's pressed; in Full, from /log/13, after each press until /log/${QUESTION_STEP} next is still wholly in view, with no scroll in between`, async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const off = await scriptsOff(browser, PHONE);
  expect(await off.go(recordOf(13)), "status of /log/13, scripts off").toBe(
    200,
  );
  const visited = [13];
  for (const to of WALK.slice(1)) {
    const s = await readScreen(off.page);
    expect
      .soft(
        wholly(s.next, s),
        `next before the press to /log/${to}, scripts off: ${where(s.next, s)}`,
      )
      .toBe(true);
    const from = off.page.url();
    await Promise.all([
      off.page.waitForURL((u) => u.href !== from, { waitUntil: "commit" }),
      pressStep(off.page, "next"),
    ]);
    await off.go(off.page.url());
    visited.push(
      Number(new URL(off.page.url()).pathname.slice(LOG.length + 1)),
    );
  }
  expect.soft(visited, "the steps the scripts-off walk lands on").toEqual(WALK);
  await off.context.close();

  const run = await openModel(browser, PHONE);
  await run.goto(recordOf(13));
  await yardPlaying(run.page);
  await atRest(run, "on /log/13 in Full at 390 x 664");
  expect(
    (await readScreen(run.page)).playing,
    `${PLAYING} on /log/13 in Full`,
  ).toBe(true);
  await run.page.mouse.move(2, 2);
  await tagDocument(run.page);
  await watchScroll(run.page);
  for (const to of WALK.slice(1)) {
    await pressStep(run.page, "next");
    const landed = await landedOn(run.page, recordOf(to));
    expect(
      landed.doc,
      `the press to /log/${to} kept the document (a press, not a navigation)`,
    ).toBe(1);
    expect(landed.path, `the press landed on /log/${to}`).toBe(recordOf(to));
    const s = await readScreen(run.page);
    expect
      .soft(
        wholly(s.next, s),
        `next after the press to /log/${to}, in Full: ${where(s.next, s)}`,
      )
      .toBe(true);
  }
  expect
    .soft(await maxScroll(run.page), "the most the Full walk scrolled, px")
    .toBe(0);
  expect.soft(run.errors, "console errors on the Full walk").toEqual([]);
  await run.close();
});

/** The phone step row's gap under the ghost: a focused link's ring (2 px, set 2 px off) clears the keel (sprint 59's follow-up 1, .crew/sprint/59/retro.json). */
const ROW_GAP = 4;

test(`H1 Iris's placement guard (.crew/sprint/59/placement.md, "For Probe", moved to ${ROW_GAP} px by sprint 59's follow-up 1): on /log/${QUESTION_STEP} with scripts off, at every width from 320 to 767 (1 px steps, 664 tall), the step row's top is within 0.5 px of ${ROW_GAP} px below the ghost's bottom, a focused next's ring (its outline's width and offset, as computed) starts at or below the ghost's bottom, and the hint's bottom is at or above the ghost's caption's top; a redesign that moves the row retires this guard, not H1`, async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const off = await scriptsOff(browser, PHONE);
  expect(await off.go(recordOf(QUESTION_STEP ?? 23)), "status").toBe(200);
  // Focused before the sweep, and held through it: the ring is the computed outline on :focus-visible.
  await off.page.locator('.record-steps a[data-step="next"]').focus();
  const away: string[] = [];
  for (let width = 320; width <= 767; width++) {
    await off.page.setViewportSize({ width, height: PHONE.height });
    const r = await off.page.evaluate(
      ({ hint, ghost }) => {
        const box = (css: string) =>
          document.querySelector(css)?.getBoundingClientRect() ?? null;
        const next = document.querySelector<HTMLElement>(
          '.record-steps a[data-step="next"]',
        );
        const style = next ? getComputedStyle(next) : null;
        const shown = next?.matches(":focus-visible") === true;
        // The ring's reach beyond the box: nothing when no outline is drawn.
        const reach =
          style && shown && style.outlineStyle !== "none"
            ? Number.parseFloat(style.outlineWidth) +
              Number.parseFloat(style.outlineOffset)
            : Number.NaN;
        return {
          row: box(".record-steps")?.top ?? Number.NaN,
          ghost: box(ghost)?.bottom ?? Number.NaN,
          ring: (next?.getBoundingClientRect().top ?? Number.NaN) - reach,
          hint: box(hint)?.bottom ?? Number.NaN,
          caption: box("[data-ghost-caption]")?.top ?? Number.NaN,
        };
      },
      { hint: HINT, ghost: GHOST_HULL },
    );
    if (
      !(Math.abs(r.row - (r.ghost + ROW_GAP)) <= 0.5) ||
      !(r.ring >= r.ghost - 0.5) ||
      !(r.hint <= r.caption + 0.5)
    )
      away.push(
        `${width}: row ${r.row.toFixed(2)} against the ghost's foot ${r.ghost.toFixed(2)} + ${ROW_GAP}; focused next's ring from ${r.ring.toFixed(2)}; hint to ${r.hint.toFixed(2)}, caption from ${r.caption.toFixed(2)}`,
      );
  }
  await off.context.close();
  expect
    .soft(
      away,
      `widths where the row isn't ${ROW_GAP} px under the ghost's foot, the ring crosses it, or the hint meets the caption`,
    )
    .toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// H2 The invitation

test(`H2 The invitation: /log's one a[data-step="start"] reads "${YARD_WORDS.start(FIRST_STEP)}" (at most 40 characters, its name and its words) to ${recordOf(FIRST_STEP)}, in today's place (after the foot row and its control, before the hand-off to /crew and the Theseus) and Tab order (the control's last stop, then it) at 390 x 844 and 1440 x 900`, async ({
  browser,
  request,
}) => {
  test.setTimeout(60_000);
  const words = YARD_WORDS.start(FIRST_STEP);
  expect.soft(words.length, `"${words}" in characters`).toBeLessThanOrEqual(40);
  const html = await (await request.get(LOG)).text();
  const context = await browser.newContext({ javaScriptEnabled: true });
  const reader = await context.newPage();
  const found = await reader.evaluate(
    ({ html, theseus }) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const follows = (a: Element | null, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      const starts = [...doc.querySelectorAll('a[data-step="start"]')];
      const a = starts[0] ?? null;
      const foot = doc.querySelector("main [data-foot]");
      const footLast =
        [...(foot?.querySelectorAll("a[href], [data-motion]") ?? [])].at(-1) ??
        null;
      return {
        count: starts.length,
        href: a?.getAttribute("href") ?? null,
        text: (a?.textContent ?? "").replace(/\s+/g, " ").trim(),
        label: a?.getAttribute("aria-label") ?? null,
        afterFoot: follows(footLast, a),
        beforeHandOff: follows(a, doc.querySelector('main a[href="/crew"]')),
        beforeTheseus: follows(a, doc.querySelector(theseus)),
      };
    },
    { html, theseus: THESEUS },
  );
  await context.close();
  expect.soft(found.count, 'a[data-step="start"] on /log').toBe(1);
  expect.soft(found.href, "its target").toBe(recordOf(FIRST_STEP));
  expect.soft(found.text, "its words").toBe(words);
  expect.soft(found.label, "no aria-label over its words").toBeNull();
  expect.soft(found.afterFoot, "after the foot row and its control").toBe(true);
  expect.soft(found.beforeHandOff, "before the hand-off to /crew").toBe(true);
  expect.soft(found.beforeTheseus, "before the Theseus").toBe(true);

  for (const size of [{ width: 390, height: 844 }, DESKTOP]) {
    const run = await openModel(browser, { ...size, refuse: true });
    await run.goto(LOG);
    const here = `/log at ${at(size)}, WebGL refused`;
    await expect
      .soft(run.page.locator('a[data-step="start"]'), `its name on ${here}`)
      .toHaveAccessibleName(words);
    // From the shown control's last stop (Off: Full and Calm are disabled with WebGL refused).
    const focused = await run.page.evaluate((slot) => {
      const shown = [...document.querySelectorAll(slot)].find(
        (s) => s.getClientRects().length > 0,
      );
      const last = [...(shown?.querySelectorAll("button") ?? [])].at(-1);
      last?.focus();
      return Boolean(last && document.activeElement === last);
    }, MOTION);
    expect(
      focused,
      `the shown control's last button takes focus on ${here}`,
    ).toBe(true);
    await run.page.keyboard.press("Tab");
    expect
      .soft(
        await run.page.evaluate(
          () => document.activeElement?.getAttribute("data-step") ?? null,
        ),
        `the Tab stop after the control on ${here}`,
      )
      .toBe("start");
    await run.close();
  }
});

// ---------------------------------------------------------------------------------------------
// H3 The hint says itself, only where true

/** CLS from load to rest + 2 s, read on a run opened by openModel (its recorder). */
async function clsAtRest(run: ModelRun, here: string) {
  await atRest(run, here);
  await pause(2000);
  expect
    .soft(
      await run.page.evaluate(
        () => (window as Window & { __cls?: number }).__cls ?? Number.NaN,
      ),
      `layout shift from load to rest + 2 s, ${here}`,
    )
    .toBe(0);
}

const SHOWN_MODES: { label: string; options: ModelOptions }[] = [
  { label: "Full", options: {} },
  { label: "Calm stored", options: { stored: "calm" } },
  {
    label: "reduced motion, nothing stored",
    options: { reducedMotion: "reduce" },
  },
];

test(`H3 The hint is shown where the yard plays: on ${H3_STEPS.map(recordOf).join(" and ")}, in Full, Calm stored and reduced motion with nothing stored, at 390 x 664 and 1440 x 900, once ${PLAYING} matches, one [data-yard-hint] is shown reading "${YARD_WORDS.hint}" (at most 40 characters), wholly in the first screen, with nothing focusable in it; CLS 0 from load to rest + 2 s on /log/13 in Full at 320 x 568, 390 x 664 and 1440 x 900`, async ({
  browser,
}) => {
  test.setTimeout(180_000);
  expect
    .soft(YARD_WORDS.hint.length, `"${YARD_WORDS.hint}" in characters`)
    .toBeLessThanOrEqual(40);
  for (const { label, options } of SHOWN_MODES) {
    for (const size of [PHONE, DESKTOP]) {
      const run = await openModel(browser, { ...options, ...size });
      for (const url of H3_STEPS.map(recordOf)) {
        const here = `${url}, ${label}, ${at(size)}`;
        await run.goto(url);
        await yardPlaying(run.page);
        const s = await readScreen(run.page);
        expect(s.playing, `${PLAYING} on ${here}`).toBe(true);
        expect
          .soft(
            s.hints.map((h) => [h.text, h.shown, h.focusable]),
            `[data-yard-hint] on ${here}: [words, shown, focusable inside]`,
          )
          .toEqual([[YARD_WORDS.hint, true, 0]]);
        const hint = s.hints[0]?.box ?? null;
        expect
          .soft(
            wholly(hint, s),
            `the hint wholly in the first screen on ${here}: ${where(hint, s)}`,
          )
          .toBe(true);
        // CLS on /log/13 in Full, read on this very load (320 x 568's below).
        if (label === "Full" && url === recordOf(13))
          await clsAtRest(run, here);
      }
      expect
        .soft(run.errors, `console errors, ${label}, ${at(size)}`)
        .toEqual([]);
      await run.close();
    }
  }
  const small = { width: 320, height: 568 };
  const run = await openModel(browser, small);
  await run.goto(recordOf(13));
  await clsAtRest(run, `/log/13, Full, ${at(small)}`);
  await run.close();
});

test(`H3 The hint is hidden where the yard doesn't play: every step page's server HTML holds one [data-yard-hint] with no link or focusable element, /log's none; on ${H3_STEPS.map(recordOf).join(" and ")} at 390 x 664 it isn't shown with Off stored, WebGL refused, Save-Data or scripts off; CSS keys it with no script (data-yard set by hand shows it, removed hides it) and its showing moves nothing in main at 390 x 664, 1024 x 768 and 1440 x 900`, async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const reads = await serverReads(browser, request, [
    LOG,
    ...STEPS.map(recordOf),
  ]);
  expect
    .soft(
      [...reads].flatMap(([url, read]) => {
        const want = url === LOG ? "[]" : "[0]";
        const got = JSON.stringify(read.hints.map((h) => h.focusable));
        return got === want ? [] : [`${url}: ${got}, not ${want}`];
      }),
      "pages whose server HTML breaks the rule: [data-yard-hint]'s focusable elements, one hint a step page, none on /log",
    )
    .toEqual([]);

  // The modes that keep the plain links, side by side, then read past the idle callback.
  const hidden: { label: string; options: ModelOptions }[] = [
    { label: "Off stored", options: { stored: "off" } },
    { label: "WebGL refused", options: { refuse: true } },
    { label: "Save-Data", options: { saveData: true } },
  ];
  for (const url of H3_STEPS.map(recordOf)) {
    const runs = await Promise.all(
      hidden.map(async ({ options }) => {
        const run = await openModel(browser, { ...options, ...PHONE });
        await run.goto(url);
        return run;
      }),
    );
    await pause(3500);
    for (const [i, run] of runs.entries()) {
      const here = `${url}, ${hidden[i]?.label}, 390 x 664`;
      const s = await readScreen(run.page);
      expect.soft(s.playing, `${PLAYING} on ${here}`).toBe(false);
      expect
        .soft(
          s.hints.map((h) => h.shown),
          `[data-yard-hint] shown on ${here}`,
        )
        .toEqual([false]);
      await run.close();
    }
    const off = await scriptsOff(browser, PHONE);
    await off.go(url);
    expect
      .soft(
        (await readScreen(off.page)).hints.map((h) => h.shown),
        `[data-yard-hint] shown on ${url}, scripts off`,
      )
      .toEqual([false]);
    await off.context.close();
  }

  // CSS keys it: the hook set by hand on a page with no script, and its showing moves nothing.
  for (const size of [PHONE, { width: 1024, height: 768 }, DESKTOP]) {
    const off = await scriptsOff(browser, size);
    await off.go(recordOf(13));
    const here = `/log/13 at ${at(size)}, scripts off`;
    const before = await mainBoxes(off.page, HINT);
    const yard = (on: boolean) =>
      off.page.evaluate((set) => {
        const model = document.querySelector("[data-model]");
        if (set) model?.setAttribute("data-yard", "");
        else model?.removeAttribute("data-yard");
      }, on);
    await yard(true);
    const on = await readScreen(off.page);
    const during = await mainBoxes(off.page, HINT);
    await yard(false);
    const after = await readScreen(off.page);
    expect
      .soft(on.playing, `${PLAYING} with data-yard set by hand, ${here}`)
      .toBe(true);
    expect
      .soft(
        on.hints.map((h) => h.shown),
        `the hint with data-yard set by hand, ${here}`,
      )
      .toEqual([true]);
    expect
      .soft(
        after.hints.map((h) => h.shown),
        `the hint with data-yard removed, ${here}`,
      )
      .toEqual([false]);
    const moved = Object.entries(before).flatMap(([path, b]) => {
      const d = during[path];
      return d?.every((v, i) => Math.abs(v - (b[i] ?? Number.NaN)) <= 0.5)
        ? []
        : [`${path}: ${JSON.stringify(b)} to ${JSON.stringify(d ?? null)}`];
    });
    expect
      .soft(moved, `boxes in main the hint's showing moved, ${here}`)
      .toEqual([]);
    await off.context.close();
  }
});

// ---------------------------------------------------------------------------------------------
// H4 The chapter says why it stopped

test(`H4 The chapter rule, in the server HTML: on every step whose merge count k is a multiple of 22 with k >= 44 (today /log/${CHAPTER_STEP}, k = 44, S = ${chapterSprint(44, STEPS)}) one p[data-yard-chapter] in .log-head after the count line and before the record, reading YARD_WORDS.chapter(S) with "sprint S"; on no other step and not on /log; true of the drawing (no Theseus plank numbered S or lower on the step, exactly one on the step before); shown with scripts off at 390 x 664; lib/count-line.ts's chapterLine gives the page's words on every step and, swept over k = 1 to 130 on a synthetic merged list, the rule's line at k = 44, 66, 88 and 110 (never "undefined", no figure but S) and none elsewhere`, async ({
  browser,
  request,
}) => {
  test.setTimeout(90_000);
  const reads = await serverReads(browser, request, [
    LOG,
    ...STEPS.map(recordOf),
  ]);
  for (const [url, read] of reads) {
    const n = url === LOG ? NEWEST_STEP : Number(url.slice(LOG.length + 1));
    const k = stepIndex(n);
    const s = url === LOG ? undefined : chapterSprint(k, STEPS);
    const here = `${url} (k = ${k}), server HTML`;
    expect
      .soft(
        read.chapters.map((c) => [
          c.text,
          c.inHead,
          c.afterCount,
          c.beforeRecord,
        ]),
        `p[data-yard-chapter] on ${here}: [words, in .log-head, after the count line, before the record]`,
      )
      .toEqual(
        s === undefined ? [] : [[YARD_WORDS.chapter(s), true, true, true]],
      );
    if (s !== undefined) {
      expect
        .soft(
          new RegExp(`\\bsprint ${s}(?!\\d)`).test(
            read.chapters[0]?.text ?? "",
          ),
          `the chapter line on ${here} holds "sprint ${s}"`,
        )
        .toBe(true);
      // The truth it states: every plank laid by S is gone on this step, one still in on the step before.
      const before = reads.get(recordOf(STEPS[k - 2] ?? 0));
      expect
        .soft(
          read.sprints.filter((x) => x <= s),
          `Theseus planks numbered ${s} or lower on ${here}`,
        )
        .toEqual([]);
      expect
        .soft(
          before?.sprints.filter((x) => x <= s).length,
          `Theseus planks numbered ${s} or lower on the step before, /log/${STEPS[k - 2]}`,
        )
        .toBe(1);
    }
  }

  const off = await scriptsOff(browser, PHONE);
  await off.go(recordOf(CHAPTER_STEP));
  expect
    .soft(
      (await readScreen(off.page)).chapters.map((c) => [c.text, c.shown]),
      `p[data-yard-chapter] on /log/${CHAPTER_STEP}, scripts off at 390 x 664: [words, shown]`,
    )
    .toEqual([[YARD_WORDS.chapter(chapterSprint(44, STEPS) ?? 0), true]]);
  await off.context.close();

  // The page's own sentence, loaded at run time: a missing export fails here, not the file.
  let loaded: { countLine?: unknown; chapterLine?: unknown } = {};
  try {
    loaded = await import("../lib/count-line");
  } catch (error) {
    expect(String(error), "lib/count-line.ts loads").toBe("");
  }
  expect(
    typeof loaded.chapterLine,
    "lib/count-line.ts exports chapterLine",
  ).toBe("function");
  const chapterLine = loaded.chapterLine as (
    k: number,
    merged: readonly number[],
  ) => string | null | undefined;
  for (const [url, read] of reads) {
    if (url === LOG) continue;
    const k = stepIndex(Number(url.slice(LOG.length + 1)));
    expect
      .soft(
        chapterLine(k, STEPS) ?? null,
        `chapterLine(${k}, the merged sprints) against ${url}'s server HTML`,
      )
      .toBe(read.chapters[0]?.text ?? null);
  }
  // Gaps where a sprint never merged, so S is never k - 21 or any other count.
  const synthetic = Array.from({ length: 140 }, (_, i) => i + 1).filter(
    (n) => ![3, 16, 40, 41, 67, 90, 111].includes(n),
  );
  for (let k = 1; k <= 130; k++) {
    const s = chapterSprint(k, synthetic);
    const line = chapterLine(k, synthetic) ?? null;
    const here = `chapterLine(${k}) on the synthetic list`;
    if (s === undefined) {
      expect.soft(line || null, here).toBeNull();
      continue;
    }
    expect.soft(line, here).toBe(YARD_WORDS.chapter(s));
    expect.soft(line?.length, `${here}: characters`).toBeLessThanOrEqual(40);
    expect
      .soft(/undefined|NaN|null/.test(line ?? ""), `${here}: "${line}"`)
      .toBe(false);
    expect
      .soft(
        [...(line ?? "").matchAll(/\d+/g)].map((m) => Number(m[0])),
        `${here}: the figures in "${line}"`,
      )
      .toEqual([s]);
  }
});

test(`H4 The chapter in Full at 1440 x 900: Next held from /log/30 riffles to /log/${CHAPTER_STEP} and stops there with the chapter line shown, the server's words; Previous to /log/${STEPS[2 * PLANK_IDS.length - 2]} removes it, Next back to /log/${CHAPTER_STEP} shows it (the server's words), and Next to /log/${STEPS[2 * PLANK_IDS.length]} removes it, in one document`, async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const k = 2 * PLANK_IDS.length;
  const [before, after] = [STEPS[k - 2] ?? 0, STEPS[k] ?? 0];
  const html = new Map<number, string>();
  for (const n of [before, CHAPTER_STEP, after])
    html.set(n, await (await request.get(recordOf(n))).text());
  const server = async (page: Page, n: number) =>
    (await readChapters(page, html.get(n) ?? "")).chapters.map((c) => c.text);

  const run = await openModel(browser, DESKTOP);
  const page = run.page;
  await run.goto(recordOf(30));
  await yardPlaying(page);
  await atRest(run, "on /log/30 in Full at 1440 x 900");
  await page.mouse.move(2, 2);
  await tagDocument(page);
  const shownChapters = async () =>
    (await readScreen(page)).chapters.map((c) => [c.text, c.shown]);

  // The hold: down on Next until the riffle has stopped and landed, held 1.5 s more, then up.
  const centre = await linkAt(page, "next");
  expect(centre, "a shown Next on /log/30").not.toBeNull();
  await page.mouse.move(centre?.x ?? 0, centre?.y ?? 0);
  await page.mouse.down();
  const end = Date.now() + 20_000;
  let now = await readSafe(page);
  while (
    Date.now() < end &&
    !(
      now.path === recordOf(CHAPTER_STEP) &&
      !now.press &&
      (now.live ?? "") !== ""
    )
  ) {
    await pause(50);
    now = await readSafe(page);
  }
  await pause(1500);
  const held = await readSafe(page);
  await page.mouse.up();
  await page.mouse.move(2, 2);
  await pause(500);
  expect(held.doc, "the riffle kept the document").toBe(1);
  expect(held.path, "where the held riffle stopped, 1.5 s on").toBe(
    recordOf(CHAPTER_STEP),
  );
  const chapterWords = await server(page, CHAPTER_STEP);
  // The line lands with the plank, as the question does (Atlas's call on Iris's placement), so
  // each read waits up to 3 s for the landed page's words.
  await expect
    .poll(shownChapters, {
      message: "the chapter line where the riffle stopped",
      timeout: 3000,
    })
    .toEqual(chapterWords.map((t) => [t, true]));
  expect.soft(chapterWords, "the server's chapter line").toHaveLength(1);

  for (const [kind, to] of [
    ["previous", before],
    ["next", CHAPTER_STEP],
    ["next", after],
  ] as const) {
    await pressStep(page, kind);
    const landed = await landedOn(page, recordOf(to));
    expect(landed.doc, `the press to /log/${to} kept the document`).toBe(1);
    expect(landed.path, `the press landed on /log/${to}`).toBe(recordOf(to));
    const want = (await server(page, to)).map((t) => [t, true]);
    await expect
      .poll(shownChapters, {
        message: `the chapter line after the press to /log/${to}: the server's`,
        timeout: 3000,
      })
      .toEqual(want);
  }
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});

// ---------------------------------------------------------------------------------------------
// H5 What stays where it is

test(`H5 What stays where it is: from 1024 up, the drawings' boxes on /log, /log/13, /log/${QUESTION_STEP} and /log/${CHAPTER_STEP} equal production's within 1 px at 1024 x 768 and 1440 x 900; at 390 x 844 every step's link to press (next; previous on the newest) starts in the first screen, as Y5 wants it`, async ({
  browser,
}) => {
  test.setTimeout(120_000);
  for (const [size, expected] of [
    [{ width: 1024, height: 768 }, WIDE_BOXES["1024 x 768"]],
    [DESKTOP, WIDE_BOXES["1440 x 900"]],
  ] as const) {
    const off = await scriptsOff(browser, size);
    for (const url of [
      LOG,
      ...[13, QUESTION_STEP ?? 23, CHAPTER_STEP].map(recordOf),
    ]) {
      await off.go(url);
      const boxes = await off.page.evaluate(
        (list) =>
          list.map((css) => {
            const r = document.querySelector(css)?.getBoundingClientRect();
            return r ? [r.left, r.top + scrollY, r.width, r.height] : [];
          }),
        [THESEUS, GHOST_HULL],
      );
      for (const [i, name] of ["theseus", "ghost"].entries()) {
        const want = expected?.[name as "theseus" | "ghost"] ?? [];
        const got = boxes[i] ?? [];
        expect
          .soft(
            got.length === 4 &&
              want.every((v, j) => Math.abs(v - (got[j] ?? Number.NaN)) <= 1),
            `the ${name}'s box on ${url} at ${at(size)}: ${JSON.stringify(got)} against production's ${JSON.stringify(want)}`,
          )
          .toBe(true);
      }
    }
    await off.context.close();
  }

  const off = await scriptsOff(browser, { width: 390, height: 844 });
  const outside: string[] = [];
  for (const n of STEPS) {
    await off.go(recordOf(n));
    const s = await readScreen(off.page);
    const kind = pressedOn(n);
    if (!starts(s[kind], s))
      outside.push(`/log/${n}'s ${kind}: ${where(s[kind], s)}`);
  }
  await off.context.close();
  expect
    .soft(
      outside,
      "steps whose link to press doesn't start in the first screen at 390 x 844, scripts off",
    )
    .toEqual([]);
});

// ---------------------------------------------------------------------------------------------
// H6 Accessible, at the new windows

/** The Tab stops in main from its start, with each one's box (page px) and step kind. */
async function tabStops(page: Page, limit = 30) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  });
  const stops: {
    name: string;
    step: string | null;
    top: number;
    bottom: number;
  }[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el?.closest("main")) return null;
      const r = el.getBoundingClientRect();
      return {
        name: `<${el.tagName.toLowerCase()}> ${el.getAttribute("href") ?? (el.textContent ?? "").trim().slice(0, 30)}`,
        step: el.getAttribute("data-step"),
        top: r.top + scrollY,
        bottom: r.bottom + scrollY,
        rev: Boolean(el.closest('section[aria-labelledby="every-revision"]')),
      };
    });
    if (!stop || stop.rev) break;
    stops.push(stop);
  }
  return stops;
}

for (const n of [...new Set([CHAPTER_STEP, NEWEST_STEP])]) {
  const url = recordOf(n);
  test(`H6 Accessible on ${url} at 390 x 664 and 320 x 568: with WebGL refused, axe clean in both schemes, and with the skip link showing in light, text from tokens, no overflow, links and buttons 24 x 24 and the step links, the hand-off and the control 44 px tall, nothing animating at load or 2 s later; Tab follows what's seen (no stop below the step links comes before them, none above after them); in Full at 390 x 664, at rest with the hint shown, axe clean`, async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    for (const size of [PHONE, { width: 320, height: 568 }]) {
      for (const scheme of SCHEMES) {
        const run = await openModel(browser, { ...size, scheme, refuse: true });
        await run.goto(url);
        const page = run.page;
        // The skip link's own paint is the same in both schemes' tokens: read it shown in light.
        for (const skipShowing of scheme === "light"
          ? [false, true]
          : [false]) {
          const here = `${url} at ${at(size)}, ${scheme}, ${skipShowing ? "skip link showing" : "nothing focused"}`;
          if (skipShowing) await page.keyboard.press("Tab");
          const results = await new AxeBuilder({ page })
            .withTags(AXE_TAGS)
            .analyze();
          expect
            .soft(
              results.violations.map((v) => ({
                rule: v.id,
                targets: v.nodes.map((node) => node.target.join(" ")),
              })),
              `axe violations (${here})`,
            )
            .toEqual([]);
          expect
            .soft(
              results.passes.map((p) => p.id),
              `axe passed color-contrast (${here})`,
            )
            .toContain("color-contrast");
        }
        const here = `${url} at ${at(size)}, ${scheme}`;
        const { tokenColors, tokenSizes, texts } = await textStyles(page);
        expect
          .soft(
            texts
              .filter(
                ({ color, fontSize }) =>
                  !tokenColors.includes(color) ||
                  !tokenSizes.includes(fontSize),
              )
              .map(
                ({ element, color, fontSize }) =>
                  `${element}: ${color}, ${fontSize}`,
              ),
            `text not set in a token on ${here}`,
          )
          .toEqual([]);
        if (scheme === "light") {
          expect
            .soft(await horizontalOverflow(page), `overflow on ${here}`)
            .toBeLessThanOrEqual(0);
          const small = await page.evaluate(() =>
            [...document.querySelectorAll("a, button")]
              .filter((el) => el.getClientRects().length > 0)
              .flatMap((el) => {
                const r = el.getBoundingClientRect();
                const tall = el.matches(
                  "a[data-step], a[data-hand-off], main [data-motion] button",
                )
                  ? 44
                  : 24;
                return r.width >= 24 - 0.05 && r.height >= tall - 0.05
                  ? []
                  : [
                      `${el.getAttribute("href") ?? el.tagName}: ${r.width} x ${r.height}, under 24 x ${tall}`,
                    ];
              }),
          );
          expect.soft(small, `targets too small on ${here}`).toEqual([]);
          const animations = () =>
            page.evaluate(() => document.getAnimations().length);
          expect
            .soft(await animations(), `animations at load on ${here}`)
            .toBe(0);
          await pause(2000);
          expect
            .soft(await animations(), `animations 2 s later on ${here}`)
            .toBe(0);

          const stops = await tabStops(page);
          const steps = stops.filter(
            (s) => s.step === "previous" || s.step === "next",
          );
          expect
            .soft(
              steps.map((s) => s.step),
              `the step links in main's Tab order on ${here}`,
            )
            .toEqual(n === NEWEST_STEP ? ["previous"] : ["previous", "next"]);
          if (steps.length > 0) {
            const rowTop = Math.min(...steps.map((s) => s.top));
            const rowBottom = Math.max(...steps.map((s) => s.bottom));
            const first = stops.indexOf(steps[0] as (typeof stops)[number]);
            const last = stops.indexOf(steps.at(-1) as (typeof stops)[number]);
            const out = stops.flatMap((s, i) =>
              s.step === "previous" || s.step === "next"
                ? []
                : i < last && s.top >= rowBottom - 0.5
                  ? [`${s.name} (below the step links) before them`]
                  : i > first && s.bottom <= rowTop + 0.5
                    ? [`${s.name} (above the step links) after them`]
                    : [],
            );
            expect
              .soft(
                out,
                `Tab stops out of the seen order on ${here}: ${stops.map((s) => `${s.name}@${Math.round(s.top)}`).join(", ")}`,
              )
              .toEqual([]);
          }
        }
        await run.close();
      }
    }

    // In Full at rest, where the hint shows: axe sees it.
    const run = await openModel(browser, PHONE);
    await run.goto(url);
    await yardPlaying(run.page);
    await atRest(run, `${url} in Full at 390 x 664`);
    await run.page.mouse.move(2, 2);
    const s = await readScreen(run.page);
    expect
      .soft(
        s.hints.map((h) => h.shown),
        `the hint shown on ${url} in Full at 390 x 664`,
      )
      .toEqual([true]);
    const results = await new AxeBuilder({ page: run.page })
      .withTags(AXE_TAGS)
      .analyze();
    expect
      .soft(
        results.violations.map((v) => ({
          rule: v.id,
          targets: v.nodes.map((node) => node.target.join(" ")),
        })),
        `axe violations on ${url} in Full at rest, 390 x 664`,
      )
      .toEqual([]);
    await run.close();
  });
}

test(`H6 The hint and the chapter line, on /log/${CHAPTER_STEP} at 390 x 664 with no script (data-yard set by hand to show the hint): each text in a token colour in both schemes, readable in forced colours (shown, 4.5:1 or more on the page's ground), and neither focusable nor holding a focusable element`, async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const url = recordOf(CHAPTER_STEP);
  const read = (page: Page) =>
    page.evaluate(
      ({ list, focusable, visible }) => {
        document.querySelector("[data-model]")?.setAttribute("data-yard", "");
        const probe = document.createElement("div");
        document.body.append(probe);
        const tokens = [
          "--background",
          "--foreground",
          "--muted",
          "--accent",
          "--rule",
        ].map((name) => {
          probe.style.color = `var(${name})`;
          return getComputedStyle(probe).color;
        });
        probe.remove();
        return {
          tokens,
          ground: getComputedStyle(document.body).backgroundColor,
          found: list.map((css) =>
            [...document.querySelectorAll(css)].map((el) => {
              const texts = [el, ...el.querySelectorAll("*")].filter((e) =>
                [...e.childNodes].some(
                  (node) =>
                    node.nodeType === Node.TEXT_NODE &&
                    (node.textContent ?? "").trim() !== "",
                ),
              );
              (el as HTMLElement).focus?.();
              return {
                css,
                shown: el.checkVisibility(visible),
                colors: texts.map((e) => getComputedStyle(e).color),
                focused: document.activeElement === el,
                tabindex: el.getAttribute("tabindex"),
                inside: el.querySelectorAll(focusable).length,
              };
            }),
          ),
        };
      },
      { list: [HINT, CHAPTER], focusable: FOCUSABLE, visible: VISIBLE },
    );
  for (const scheme of SCHEMES) {
    const off = await scriptsOff(browser, { ...PHONE, scheme });
    await off.go(url);
    const { tokens, found } = await read(off.page);
    for (const [i, css] of [HINT, CHAPTER].entries()) {
      const here = `${css} on ${url}, ${scheme}`;
      const els = found[i] ?? [];
      expect.soft(els.length, `${here}: how many`).toBe(1);
      for (const el of els) {
        expect.soft(el.shown, `${here} shown`).toBe(true);
        expect
          .soft(
            el.colors.filter((c) => !tokens.includes(c)),
            `${here}: text colours not a token's (${JSON.stringify(tokens)})`,
          )
          .toEqual([]);
        expect.soft(el.colors.length, `${here}: its text`).toBeGreaterThan(0);
        expect
          .soft(
            [el.focused, el.tabindex, el.inside],
            `${here}: [takes focus, tabindex, focusable inside]`,
          )
          .toEqual([false, null, 0]);
      }
    }
    await off.context.close();
  }
  const forced = await scriptsOff(browser, PHONE, true);
  await forced.go(url);
  const { ground, found } = await read(forced.page);
  const bg = parseColor(ground);
  for (const [i, css] of [HINT, CHAPTER].entries()) {
    const here = `${css} on ${url} in forced colours`;
    const els = found[i] ?? [];
    expect.soft(els.length, `${here}: how many`).toBe(1);
    for (const el of els) {
      expect.soft(el.shown, `${here} shown`).toBe(true);
      for (const color of el.colors) {
        const fg = parseColor(color);
        const ratio =
          fg && bg
            ? contrast(
                composite(fg, bg.slice(0, 3) as Rgb),
                bg.slice(0, 3) as Rgb,
              )
            : 0;
        expect
          .soft(ratio, `${here}: ${color} on ${ground}`)
          .toBeGreaterThanOrEqual(4.5);
      }
    }
  }
  await forced.context.close();
});

// ---------------------------------------------------------------------------------------------
// H7 Budgets

/**
 * The 3D chunk's gzip -9 bytes and the WebGL-refused /log/13's script bytes (8 files), read by H7
 * itself on 3b3f211, main's code at 19f675e (sprint 58): the deltas it reports are against these.
 */
const MAIN_BYTES = { chunk: 167_233, loader: 138_636 };

test("H7 Budgets, reported: on /log/13 at 1440 x 900 the WebGL-refused page's script bytes (the loader's 0 B is B2.10's and B5.10's, unedited) and the 3D chunk, one file of at most 250,000 B gzip -9, each with its delta against main's", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const refused = await openModel(browser, { ...DESKTOP, refuse: true });
  await refused.goto(recordOf(13));
  await pause(3500);
  const offList = (await refused.scripts()).list;
  await refused.close();
  const offPaths = offList.map((s) => new URL(s.url).pathname);
  const loader = offList.reduce((s, f) => s + f.gzip9, 0);

  const run = await openModel(browser, DESKTOP);
  await run.goto(recordOf(13));
  await atRest(run, "on /log/13 in Full at 1440 x 900");
  const chunk = (await run.scripts()).list.filter(
    (s) => !offPaths.includes(new URL(s.url).pathname),
  );
  const gzip9 = chunk.reduce((s, f) => s + f.gzip9, 0);
  const delta = (now: number, was: number) =>
    was > 0
      ? `${now - was >= 0 ? "+" : ""}${now - was} B against main's ${was}`
      : "main's not pinned";
  note(
    testInfo,
    "loader",
    `the WebGL-refused /log/13: ${offList.length} scripts, ${loader} B gzip -9, ${delta(loader, MAIN_BYTES.loader)}`,
  );
  note(
    testInfo,
    "3D chunk",
    `${chunk.map((s) => `${new URL(s.url).pathname} ${s.gzip9} B`).join("; ")}: ${gzip9} B gzip -9, ${delta(gzip9, MAIN_BYTES.chunk)}; ${250_000 - gzip9} B left of 250,000`,
  );
  expect.soft(chunk.length, "scripts beyond the refused page's").toBe(1);
  expect
    .soft(gzip9, "the 3D chunk, gzip -9 bytes")
    .toBeLessThanOrEqual(250_000);
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
