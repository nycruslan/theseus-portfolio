import { expect, type Page, test } from "@playwright/test";
import { FIXTURE_STUDIO, feedOf, toAnswer } from "./crew-live";
import { openCrewModel } from "./crew-model";
import { MODES, MOTION, motionReady } from "./helpers";
import { pause } from "./model";

// Sprint 36, B4.41 (.crew/sprint/36/contract.md, "The page"; notes-iris.md, section 4): the motion
// control on /crew, the same choice as on `/` and `/log`. From 768 px it is the bar's, right of
// Read as page; below 768 it is in the foot (`main > [data-foot]`, after the drawing), right of
// Read as page, in one 44 px row. B2.3's sizes hold, B4.12's first screen holds at 390 x 844, and
// with scripts off the shown slot is empty at the group's size. Read with WebGL refused: the
// control's place and sizes don't depend on the model, and a refused page loads no 3D.

const WIDTHS = [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
] as const;

function readControl(page: Page) {
  return page.evaluate((slot) => {
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
    const one = slots.find((s) => s.getClientRects().length > 0) ?? null;
    const shownRead = [...document.querySelectorAll("a[href='/read']")].find(
      (a) =>
        a.getClientRects().length > 0 &&
        (a.textContent ?? "").trim() === "Read as page",
    );
    const foot = one?.closest("[data-foot]") ?? null;
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    return {
      shown: slots.filter((s) => s.getClientRects().length > 0).length,
      inNav: Boolean(one?.closest("header nav")),
      inFoot: Boolean(foot?.parentElement?.matches("main")),
      readInFoot: Boolean(shownRead && foot?.contains(shownRead)),
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
          top: r.top,
          inside:
            r.left >= -0.5 &&
            r.top >= -0.5 &&
            r.right <= cw + 0.5 &&
            r.bottom <= ch + 0.5,
        };
      }),
      slot: rect(one),
      read: rect(shownRead),
      foot: rect(foot),
    };
  }, MOTION);
}

/** The bar's labels share one line: each label one line, one band. */
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

test("B4.41 the control on /crew: with scripts on the group Motion holds Full, Calm and Off in order, one slot shown; from 768 in the bar right of Read as page, below 768 in the foot right of Read as page in one 44 px row; targets 44 x 44 below 1024 and 24 x 24 from it, inside the viewport at 320, 390, 768, 1024 and 1440, the bar one line; at 390 x 844 B4.12's first screen holds on a live panel; without scripts the slot is empty at the group's size", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  for (const [width, height] of WIDTHS) {
    const where = `/crew at ${width} x ${height}`;
    // A live panel from the hydration poll, as the live fixture tells it.
    const run = await openCrewModel(
      browser,
      { width, height, refuse: true },
      { json: toAnswer(feedOf("live"), FIXTURE_STUDIO) },
    );
    await run.goto("/crew");
    await motionReady(run.page);
    await pause(400);
    const c = await readControl(run.page);
    expect
      .soft(
        {
          shown: c.shown,
          group: c.group,
          buttons: c.buttons.map((b) => b.text),
        },
        `slots shown, the group's name and its buttons in order, ${where}`,
      )
      .toEqual({ shown: 1, group: "Motion", buttons: [...MODES] });
    expect
      .soft(
        (c.slot?.x ?? 0) >= (c.read?.right ?? Number.POSITIVE_INFINITY) - 0.5,
        `the control (left ${c.slot?.x}) right of the shown Read as page (right ${c.read?.right}), ${where}`,
      )
      .toBe(true);
    if (width >= 768) {
      expect
        .soft(c.inNav, `the shown slot in the bar's nav, ${where}`)
        .toBe(true);
      const line = await barLine(run.page);
      expect
        .soft(
          [line.wrapped, line.oneBand],
          `bar labels on more than one line, and one band, ${where}`,
        )
        .toEqual([[], true]);
    } else {
      expect
        .soft(
          { inFoot: c.inFoot, readInFoot: c.readInFoot, inNav: c.inNav },
          `the shown slot and Read as page in main's [data-foot], not the bar, ${where}`,
        )
        .toEqual({ inFoot: true, readInFoot: true, inNav: false });
      const tops = [c.read?.y ?? Number.NaN, ...c.buttons.map((b) => b.top)];
      expect
        .soft(
          {
            row: Math.round(c.foot?.height ?? 0),
            oneRow:
              Math.max(...tops) - Math.min(...tops) <=
              44 - (c.buttons[0]?.height ?? 0) + 0.5,
          },
          `the foot one 44 px row (${JSON.stringify(c.foot)}), Read as page and the buttons in it, ${where}`,
        )
        .toEqual({ row: 44, oneRow: true });
    }
    const [tall, wide] = width < 1024 ? [44, 44] : [24, 24];
    expect
      .soft(
        {
          small: c.buttons
            .filter((b) => b.width < wide - 0.05 || b.height < tall - 0.05)
            .map((b) => `${b.text}: ${b.width} x ${b.height}`),
          outside: c.buttons.filter((b) => !b.inside).map((b) => b.text),
        },
        `buttons under ${wide} x ${tall} px, and not wholly inside the viewport, ${where}`,
      )
      .toEqual({ small: [], outside: [] });
    if (width === 390) {
      const tops = await run.page.evaluate(() => {
        const top = (el: Element | null | undefined) =>
          el && el.getClientRects().length > 0
            ? el.getBoundingClientRect().top
            : null;
        const row = [
          ...document.querySelectorAll(
            'section[aria-labelledby="crew"] table tr',
          ),
        ].find((tr) => tr.querySelector('th[scope="row"]'));
        return {
          state: document
            .querySelector("[data-crew-state]")
            ?.getAttribute("data-crew-state"),
          h1: top(document.querySelector("h1#crew")),
          status: top(document.querySelector("[data-status]")),
          row: top(row),
        };
      });
      expect
        .soft(
          [
            tops.state,
            [tops.h1, tops.status, tops.row].every(
              (t) => t !== null && t >= 0 && t < height,
            ),
          ],
          `the panel live, and its h1, status and first row starting in the first screen (${JSON.stringify(tops)}), ${where}`,
        )
        .toEqual(["live", true]);
    }
    const group = c.slot;
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();

    const bare = await openCrewModel(browser, {
      width,
      height,
      noScript: true,
    });
    await bare.page.goto("/crew");
    const empty = await bare.page.evaluate((slot) => {
      const shown = [...document.querySelectorAll(slot)].find(
        (s) => s.getClientRects().length > 0,
      );
      const r = shown?.getBoundingClientRect();
      return {
        children: shown?.children.length ?? -1,
        box: r
          ? { x: r.left, y: r.top, width: r.width, height: r.height }
          : null,
      };
    }, MOTION);
    await bare.close();
    expect
      .soft(
        {
          children: empty.children,
          off:
            empty.box && group
              ? Math.max(
                  Math.abs(empty.box.width - group.width),
                  Math.abs(empty.box.height - group.height),
                  Math.abs(empty.box.x - group.x),
                  Math.abs(empty.box.y - group.y),
                ) <= 0.5
              : false,
        },
        `with scripts off, the shown slot's children, and its box on the group's within 0.5 px (${JSON.stringify(empty.box)} against ${JSON.stringify(group)}), ${where}`,
      )
      .toEqual({ children: 0, off: true });
  }
});
