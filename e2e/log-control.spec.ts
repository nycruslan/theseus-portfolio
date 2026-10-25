import { type Browser, expect, type Page, test } from "@playwright/test";
import { DRAWING, PAGES, press } from "./ghost";
import { MODES, MOTION, motionReady } from "./helpers";
import { BAR, EVERY, RECORD } from "./log";
import { FIRST, MODEL, pause, REST } from "./model";
import { openModel } from "./webgl";

// Sprint 33, B5.25 (.crew/sprint/33/contract.md, calls 2 and 7): the motion control on the Log, the
// same choice as on `/`. From 768 px it is the bar's, after Read as page, as on `/`; below 768 it is
// a row in main right after `.log-head` (in a wrapper once #78's Foot holds it), before the record
// and the drawing. One key, `theseus:motion`, is shared with `/`. B2.3's sizes hold, and with
// scripts off the shown slot is empty at the group's size. The Tab order is the eye's: the bar, the
// control, then the record (amendment 1: 3 stops with WebGL, Off alone with it refused).

const WIDTHS = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const;
/** Past load, the idle callback's 2,000 ms timeout and a margin. */
const IDLE = 3500;

/** The control as the page lays it out: the shown slot, its group and buttons, and its place. */
function readControl(page: Page) {
  return page.evaluate(
    ({ slot, record, drawing, every }) => {
      const rect = (el: Element | null | undefined) => {
        const r = el?.getBoundingClientRect();
        return r
          ? {
              x: r.left,
              y: r.top,
              width: r.width,
              height: r.height,
              right: r.right,
              bottom: r.bottom,
            }
          : null;
      };
      const slots = [...document.querySelectorAll(slot)];
      const shown = slots.filter((s) => s.getClientRects().length > 0);
      const one = shown[0] ?? null;
      const head = document.querySelector(".log-head");
      const after = head?.nextElementSibling ?? null;
      const precedes = (other: Element | null) =>
        !one || !other
          ? null
          : Boolean(
              one.compareDocumentPosition(other) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            );
      const read = [...document.querySelectorAll("header nav a")].find(
        (a) => (a.textContent ?? "").trim() === "Read as page",
      );
      const cw = document.documentElement.clientWidth;
      const ch = document.documentElement.clientHeight;
      return {
        slots: slots.length,
        shown: shown.length,
        inNav: Boolean(one?.closest("header nav")),
        inMain: Boolean(one?.closest("main")),
        afterHead: Boolean(
          one && after && (after === one || after.contains(one)),
        ),
        beforeRecord: precedes(document.querySelector(record)),
        beforeGhost: precedes(document.querySelector(drawing)),
        group:
          one
            ?.querySelector("fieldset, [role='group']")
            ?.getAttribute("aria-label") ?? null,
        buttons: [...(one?.querySelectorAll("button") ?? [])].map((b) => {
          const r = b.getBoundingClientRect();
          return {
            text: (b.textContent ?? "").trim(),
            width: r.width,
            height: r.height,
            inside:
              r.left >= -0.5 &&
              r.top >= -0.5 &&
              r.right <= cw + 0.5 &&
              r.bottom <= ch + 0.5,
          };
        }),
        hiddenFocusable: slots
          .filter((s) => s !== one)
          .flatMap((s) => [...s.querySelectorAll("button")])
          .filter((b) => {
            (b as HTMLElement).focus();
            const focused = document.activeElement === b;
            (b as HTMLElement).blur();
            return focused;
          }).length,
        slot: rect(one),
        read: rect(read),
        h2: rect(document.querySelector(`${every} h2`)),
      };
    },
    { slot: MOTION, record: RECORD, drawing: DRAWING, every: EVERY },
  );
}

/** The bar's labels (links, and buttons in the bar) share one line: each label one line, one band. */
function barLine(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("header:has(nav)");
    const labels = [
      ...(header?.querySelectorAll(
        'a[href]:not([href="#main"]), [data-motion] button',
      ) ?? []),
    ].filter((el) => el.getClientRects().length > 0);
    const bands = labels.map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      return {
        text: (el.textContent ?? "").trim(),
        lines: new Set(rects.map((r) => Math.round(r.top))).size,
        top: Math.min(...rects.map((r) => r.top)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      };
    });
    return {
      wrapped: bands.filter((b) => b.lines !== 1).map((b) => b.text),
      oneBand:
        Math.max(...bands.map((b) => b.top)) <
        Math.min(...bands.map((b) => b.bottom)),
    };
  });
}

const pressedOf = (page: Page) =>
  page.evaluate((slot) => {
    const shown = [...document.querySelectorAll(slot)].find(
      (s) => s.getClientRects().length > 0,
    );
    return [
      ...(shown?.querySelectorAll('button[aria-pressed="true"]') ?? []),
    ].map((b) => (b.textContent ?? "").trim());
  }, MOTION);

/** The script paths a refused visit to `url` fetches past idle: the Off page's. */
async function offScripts(browser: Browser, url: string) {
  const run = await openModel(browser, { refuse: true });
  await run.goto(url);
  await pause(IDLE);
  const list = new Set(
    (await run.scripts()).list.map((s) => new URL(s.url).pathname),
  );
  await run.close();
  return list;
}

for (const url of PAGES) {
  test(`B5.25 The control on the Log, the same choice as on /, on ${url}: the group Motion holds Full, Calm and Off in order, exactly one slot shown; from 768 in the bar's nav right of Read as page, below 768 in main right after .log-head and before the record and [data-ghost]; targets 44 x 44 below 1024 and 24 x 24 from it, inside the viewport at 320, 390, 768, 1024 and 1440, the bar one line; at 390 x 844 the row ends above Every revision's h2, in the first screen; with scripts off the slot is empty at the group's size, CLS 0; Tab goes the bar, Full, Calm, Off, then the record`, async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    for (const [width, height] of WIDTHS) {
      const where = `${url} at ${width} x ${height}`;
      const run = await openModel(browser, { width, height });
      await run.goto(url);
      await motionReady(run.page);
      const c = await readControl(run.page);
      expect.soft(c.shown, `[data-motion] slots shown, ${where}`).toBe(1);
      expect
        .soft(c.group, `the shown slot's group name, ${where}`)
        .toBe("Motion");
      expect
        .soft(
          c.buttons.map((b) => b.text),
          `its buttons, in order, ${where}`,
        )
        .toEqual([...MODES]);
      expect
        .soft(
          c.hiddenFocusable,
          `focusable buttons in the hidden slot, ${where}`,
        )
        .toBe(0);
      if (width >= 768) {
        expect
          .soft(c.inNav, `the shown slot is in the bar's nav, ${where}`)
          .toBe(true);
        expect
          .soft(
            (c.slot?.x ?? 0) >=
              (c.read?.right ?? Number.POSITIVE_INFINITY) - 0.5,
            `the control (left ${c.slot?.x}) is right of Read as page (right ${c.read?.right}), ${where}`,
          )
          .toBe(true);
      } else {
        expect
          .soft(c.inMain && !c.inNav, `the shown slot is in main, ${where}`)
          .toBe(true);
        expect
          .soft(
            c.afterHead,
            `the shown slot is right after .log-head, ${where}`,
          )
          .toBe(true);
        expect
          .soft(
            c.beforeGhost,
            `the shown slot comes before [data-ghost] in the DOM, ${where}`,
          )
          .toBe(true);
        if (url !== PAGES[0])
          expect
            .soft(
              c.beforeRecord,
              `the shown slot comes before the record in the DOM, ${where}`,
            )
            .toBe(true);
      }
      const [tall, wide] = width < 1024 ? [44, 44] : [24, 24];
      expect
        .soft(
          c.buttons
            .filter((b) => b.width < wide - 0.05 || b.height < tall - 0.05)
            .map((b) => `${b.text}: ${b.width} x ${b.height}`),
          `buttons under ${wide} x ${tall} px, ${where}`,
        )
        .toEqual([]);
      expect
        .soft(
          c.buttons.filter((b) => !b.inside).map((b) => b.text),
          `buttons not wholly inside the viewport, ${where}`,
        )
        .toEqual([]);
      const line = await barLine(run.page);
      expect
        .soft(line.wrapped, `bar labels on more than one line, ${where}`)
        .toEqual([]);
      expect
        .soft(line.oneBand, `the bar's labels share one line, ${where}`)
        .toBe(true);
      if (width === 390) {
        expect
          .soft(
            (c.slot?.bottom ?? Number.POSITIVE_INFINITY) <=
              (c.h2?.y ?? 0) + 0.5,
            `the control's row (bottom ${c.slot?.bottom}) ends above Every revision's h2 (top ${c.h2?.y}), ${where}`,
          )
          .toBe(true);
        expect
          .soft(
            (c.slot?.bottom ?? Number.POSITIVE_INFINITY) <= height,
            `the control's row ends in the first screen, ${where}`,
          )
          .toBe(true);
      }
      // No layout shift over load and 2 s, with the model loading.
      await pause(2000);
      expect
        .soft(
          await run.page.evaluate(
            () => (window as Window & { __cls?: number }).__cls ?? Number.NaN,
          ),
          `layout shift over load + 2 s, ${where}`,
        )
        .toBe(0);
      const group = c.slot;
      expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
      await run.close();

      // Without scripts: the same slot, empty, at the group's size.
      const bare = await openModel(browser, { width, height, noScript: true });
      await bare.page.goto(url);
      const empty = await bare.page.evaluate((slot) => {
        const shown = [...document.querySelectorAll(slot)].find(
          (s) => s.getClientRects().length > 0,
        );
        const r = shown?.getBoundingClientRect();
        return {
          children: shown?.children.length ?? -1,
          buttons: document.querySelectorAll("button").length,
          box: r
            ? { x: r.left, y: r.top, width: r.width, height: r.height }
            : null,
        };
      }, MOTION);
      await bare.close();
      expect
        .soft(
          empty.children,
          `children of the shown slot with scripts off, ${where}`,
        )
        .toBe(0);
      expect.soft(empty.buttons, `buttons with scripts off, ${where}`).toBe(0);
      expect
        .soft(
          empty.box && group
            ? Math.max(
                Math.abs(empty.box.width - group.width),
                Math.abs(empty.box.height - group.height),
                Math.abs(empty.box.x - group.x),
                Math.abs(empty.box.y - group.y),
              )
            : Number.NaN,
          `the empty slot's box against the group's (px), ${where}`,
        )
        .toBeLessThanOrEqual(0.5);
    }

    // The Tab order with WebGL: the skip link, the wordmark, the bar's links, Full, Calm, Off, then
    // main's first link (the record's on a record, the first Rev link on /log).
    const run = await openModel(browser, {});
    await run.goto(url);
    await motionReady(run.page);
    const first = await run.page.evaluate(
      (record) =>
        (
          document.querySelector(`${record} a[href]`) ??
          document.querySelector('main th[scope="row"] a[href]')
        )?.getAttribute("href") ?? "",
      RECORD,
    );
    const expected = [
      "#main",
      "/",
      ...BAR.map((l) => l.href),
      ...MODES.map((m) => `<button> ${m}`),
      first,
    ];
    const stops: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      await run.page.keyboard.press("Tab");
      stops.push(
        await run.page.evaluate(() => {
          const el = document.activeElement;
          if (el?.tagName === "BUTTON")
            return `<button> ${(el.textContent ?? "").trim()}`;
          return el?.getAttribute("href") ?? `<${el?.tagName.toLowerCase()}>`;
        }),
      );
    }
    expect
      .soft(stops, `the first Tab stops on ${url} at 1440 with WebGL`)
      .toEqual(expected);
    await run.close();
  });
}

test("B5.25 one key, theseus:motion: Off pressed on / opens /log in Off with no chunk and no context; Calm pressed on /log opens / in Calm, settled with no move; with the WebGL probe refused, pressing the already-pressed Off stores nothing, on / and on /log", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const base = await offScripts(browser, "/log");

  // Off on /, then /log.
  const a = await openModel(browser, {});
  await a.goto("/");
  await motionReady(a.page);
  await press(a.page, "Off");
  expect
    .soft(
      await a.page.evaluate(() => localStorage.getItem("theseus:motion")),
      "the mode stored after Off on /",
    )
    .toBe("off");
  const onHome = (await a.scripts()).list.length;
  await a.goto("/log");
  await motionReady(a.page);
  await pause(IDLE);
  expect
    .soft(await pressedOf(a.page), "the pressed button on /log after Off on /")
    .toEqual(["Off"]);
  expect
    .soft(await a.requests(), "WebGL context requests on /log after Off on /")
    .toEqual([]);
  expect
    .soft(
      await a.page.locator(`${MODEL} canvas`).count(),
      "canvases on /log after Off on /",
    )
    .toBe(0);
  expect
    .soft(
      (await a.scripts()).list
        .slice(onHome)
        .map((s) => new URL(s.url).pathname)
        .filter((p) => !base.has(p)),
      "scripts /log fetches beyond its Off page's (the chunk)",
    )
    .toEqual([]);
  await a.close();

  // Calm on /log, then /.
  const b = await openModel(browser, {});
  await b.goto("/log");
  await motionReady(b.page);
  await press(b.page, "Calm");
  expect
    .soft(
      await b.page.evaluate(() => localStorage.getItem("theseus:motion")),
      "the mode stored after Calm on /log",
    )
    .toBe("calm");
  await b.goto("/");
  await motionReady(b.page);
  expect
    .soft(await pressedOf(b.page), "the pressed button on / after Calm on /log")
    .toEqual(["Calm"]);
  await b.waitFor([...REST], FIRST);
  expect
    .soft(
      (await b.states())
        .map((s) => s.state)
        .filter((s) => s === "landed" || s === "lofting"),
      "landed or lofting states on / after Calm on /log",
    )
    .toEqual([]);
  await b.close();

  // Lens on #74: the probe refused, Off already pressed; pressing it stores nothing.
  for (const url of ["/", "/log"]) {
    const run = await openModel(browser, { refuse: true });
    await run.goto(url);
    await motionReady(run.page);
    await run.page.waitForFunction(
      (slot) =>
        [...document.querySelectorAll(`${slot} button`)].filter(
          (b) => b.getClientRects().length > 0 && b.matches(":disabled"),
        ).length === 2,
      MOTION,
      { timeout: 10_000 },
    );
    expect
      .soft(
        await pressedOf(run.page),
        `the pressed button on ${url} with WebGL refused`,
      )
      .toEqual(["Off"]);
    await press(run.page, "Off");
    await pause(300);
    expect
      .soft(
        await run.page.evaluate(() => localStorage.getItem("theseus:motion")),
        `the mode stored after pressing the pressed Off on ${url}, WebGL refused`,
      )
      .toBeNull();
    await run.close();
  }
});
