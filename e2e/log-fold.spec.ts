import { expect, type Page, test } from "@playwright/test";
import { open, RECORD, recordOf } from "./log";
import { MERGED, QUESTION_STEP } from "./retros";

// Sprint 77: a Log record opens with its heading on a short screen (.crew/sprint/77/contract.md,
// T37), written before the build. A visitor who opens /log/<n> directly sees the sprint's goal, the
// record's h2, without scrolling. On main (and production, measured 2026-11-19) every record fails
// at 320 x 568, 360 x 640, 375 x 667, 900 x 700 and 1023 x 768, and every one holds at 390 x 844,
// 1024 x 768 and 1440 x 900, where the three hold the fix to what it shouldn't break.
//
// One exception, the contract's own (decisions.md 2, made before the build): at 320 x 568 the
// question's step needs its h2 only to start in view. H1 keeps that step's question above the
// record in the first screen at 320, so the goal under it starts near 524 and ends near 600, past
// the fold, with nothing left to move (Iris measured); H1 asks the question to start in view
// there, and T37 asks the same of the heading under it, so the visitor sees the goal begin. The
// step is H1's QUESTION_STEP (the 22nd merged sprint, /log/23 today), never a number written here.
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

/** The one window and record that read "starts in view" (decisions.md 2). */
const STARTS_ONLY = { width: 320, height: 568, sprint: QUESTION_STEP };

/**
 * B5.7's rule (e2e/log-record.spec.ts, `inView`), copied so that kept check stays unedited: "in
 * view" when the element is wholly inside the window and clear of the sticky bar. With `starts`,
 * only its top need be: at or below the bar's bottom and above the window's foot.
 */
function inView(page: Page, selector: string, starts = false) {
  return page.evaluate(
    ({ s, starts }) => {
      const el = document.querySelector(s);
      if (!el) return "missing";
      const r = el.getBoundingClientRect();
      const bar = document.querySelector("header:has(nav)");
      const under = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
      const foot = starts ? r.top < innerHeight : r.bottom <= innerHeight + 1;
      return r.top >= under - 1 && foot
        ? "in view"
        : `${r.top} to ${r.bottom}, bar ${under}, viewport ${innerHeight}${starts ? " (needs only to start in view)" : ""}`;
    },
    { s: selector, starts },
  );
}

for (const [width, height] of WINDOWS) {
  test(`T37 a record opens with its heading on a short screen: every merged record's h2, loaded directly, lies wholly in the window and clear of the bar; at 320 x 568 the question's step's h2 starts in it (${width} x ${height})`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    expect(MERGED.length, "merged records").toBeGreaterThan(0);
    expect(
      MERGED.some(({ sprint }) => sprint === STARTS_ONLY.sprint),
      `the question's step, /log/${STARTS_ONLY.sprint}, is a merged record`,
    ).toBe(true);
    const out: string[] = [];
    for (const { sprint } of MERGED) {
      await open(page, recordOf(sprint), width, undefined, height);
      const starts =
        width === STARTS_ONLY.width &&
        height === STARTS_ONLY.height &&
        sprint === STARTS_ONLY.sprint;
      const where = await inView(page, `${RECORD} h2`, starts);
      if (where !== "in view") out.push(`${recordOf(sprint)}: ${where}`);
    }
    expect(
      out,
      `${out.length} of ${MERGED.length} records open with the h2 out of view at ${width} x ${height}`,
    ).toEqual([]);
  });
}
