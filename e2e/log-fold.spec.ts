import { expect, type Page, test } from "@playwright/test";
import { open, RECORD, recordOf } from "./log";
import { MERGED } from "./retros";

// Sprint 77: a Log record opens with its heading on a short screen (.crew/sprint/77/contract.md,
// T37), written before the build. A visitor who opens /log/<n> directly sees the sprint's goal, the
// record's h2, without scrolling. On main (and production, measured 2026-11-19) every record fails
// at 320 x 568, 360 x 640, 375 x 667, 900 x 700 and 1023 x 768, and every one holds at 390 x 844,
// 1024 x 768 and 1440 x 900, where the three hold the fix to what it shouldn't break.
//
// One page per window walks every merged record, so the check costs eight tests, not six hundred
// (shard 2 has no margin, .crew/STATE.md), and a red names every record that fails in one message.
// Scripts on, as a visitor loads it: on main a record's h2 sits where it does with scripts off and
// stays there 1.5 s after the fonts (Probe's read, sprint 77), so a load reads it at fonts.ready.

const WINDOWS = [
  [320, 568],
  [360, 640],
  [375, 667],
  [390, 844],
  [900, 700],
  [1023, 768],
  [1024, 768],
  [1440, 900],
] as const;

/**
 * B5.7's rule (e2e/log-record.spec.ts, `inView`), copied so that kept check stays unedited: "in
 * view" when the element is wholly inside the window and clear of the sticky bar.
 */
function inView(page: Page, selector: string) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return "missing";
    const r = el.getBoundingClientRect();
    const bar = document.querySelector("header:has(nav)");
    const under = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
    return r.top >= under - 1 && r.bottom <= innerHeight + 1
      ? "in view"
      : `${r.top} to ${r.bottom}, bar ${under}, viewport ${innerHeight}`;
  }, selector);
}

for (const [width, height] of WINDOWS) {
  test(`T37 a record opens with its heading on a short screen: every merged record's h2, loaded directly, lies wholly in the window and clear of the bar (${width} x ${height})`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(MERGED.length, "merged records").toBeGreaterThan(0);
    const out: string[] = [];
    for (const { sprint } of MERGED) {
      await open(page, recordOf(sprint), width, undefined, height);
      const where = await inView(page, `${RECORD} h2`);
      if (where !== "in view") out.push(`${recordOf(sprint)}: ${where}`);
    }
    expect(
      out,
      `${out.length} of ${MERGED.length} records open with the h2 out of view at ${width} x ${height}`,
    ).toEqual([]);
  });
}
