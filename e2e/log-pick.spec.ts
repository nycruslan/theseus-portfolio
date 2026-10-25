import { expect, test } from "@playwright/test";
import {
  atRest,
  centreOf,
  cursorOf,
  ghostNumbers,
  landedOn,
  MARKED,
  markedSeat,
  offHull,
  pickOf,
  SEAT_BY_NUMBER,
  SEATS,
  scanSeats,
  twoFrames,
} from "./ghost";
import {
  FIRST,
  FRAME,
  pause,
  REST,
  SHOWN,
  TOUCH_SLOP,
  touchDrag,
} from "./model";
import { GHOST } from "./retros";
import { openModel } from "./webgl";

// Sprint 33, B5.24 (.crew/sprint/33/contract.md, "The pick"): a plank opens its record. With a
// mouse, at rest, the plank under the pointer sets `data-pick="<seat>"` on `[data-model]` and the
// canvas's cursor to pointer; a click is a document navigation to /log/GHOST[seat]. From 768 px the
// aim is each number span's centre (the numbers take no pointer events, so a click on one picks its
// plank; 5.0's sits off the hull at its leader's end, which the pick tests first). Below 768 the
// numbers are hidden and the pose isn't the drawing's, so each seat's point is found by a mouse
// scan on a 2 px grid in a context without touch, then tapped in one with touch.

const TWO_FRAMES = Math.ceil(2 * FRAME);
const DEFAULT_CURSORS = ["auto", "default"];

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
] as const) {
  test(`B5.24 A plank opens its record, with a mouse at ${width} x ${height}: settled on /log, at each of the 22 number spans' centres data-pick is that number's seat, the cursor pointer, and a click lands on /log/<that number> with its record's h2; at a point on no plank no data-pick, the default cursor, and a click leaves the URL; Ctrl-click opens a new page and leaves this one; Back from a picked record returns to /log settled with one live context; on /log/13 a pick on another plank opens that plank's record`, async ({
    browser,
  }) => {
    test.setTimeout(900_000);
    const where = `at ${width} x ${height}`;
    const run = await openModel(browser, { width, height });
    await run.goto("/log");
    await run.waitFor([...REST], FIRST);
    await pause(300);
    const numbers = (await ghostNumbers(run.page)).filter((n) => n.shown);
    expect(
      numbers.map((n) => n.text).sort(),
      `the number spans shown at rest, ${where}`,
    ).toEqual(Object.values(GHOST).map(String).sort());
    const aims = numbers.map((n) => ({
      n: Number(n.text),
      at: centreOf(n.box),
    }));

    const wrong: string[] = [];
    for (const { n, at } of aims) {
      const seat = SEAT_BY_NUMBER.get(n);
      await run.page.mouse.move(at.x, at.y);
      await twoFrames(run.page);
      const [pick, cursor] = [await pickOf(run.page), await cursorOf(run.page)];
      if (pick !== seat || cursor !== "pointer") {
        wrong.push(`${n} (seat ${seat}): data-pick ${pick}, cursor ${cursor}`);
        continue;
      }
      await run.page.mouse.click(at.x, at.y);
      await landedOn(run.page, n);
      await run.page.goBack();
      await run.page.waitForURL((u) => u.pathname === "/log");
      await atRest(run, `after Back from /log/${n}, ${where}`);
      await pause(200);
    }
    expect
      .soft(
        wrong,
        `numbers whose centre doesn't pick their own seat with a pointer cursor, ${where}`,
      )
      .toEqual([]);

    // Back from a picked record: /log, settled, one live context.
    expect
      .soft(await run.state(), `data-state after Back, ${where}`)
      .toBe("settled");
    expect
      .soft(await run.live(), `live WebGL contexts after Back, ${where}`)
      .toBe(1);

    // On no plank.
    const off = await offHull(run.page);
    await run.page.mouse.move(off.x, off.y);
    await twoFrames(run.page);
    expect
      .soft(await pickOf(run.page), `data-pick off the hull, ${where}`)
      .toBeNull();
    expect
      .soft(DEFAULT_CURSORS, `the cursor off the hull, ${where}`)
      .toContain(await cursorOf(run.page));
    await run.page.mouse.click(off.x, off.y);
    await pause(1000);
    expect
      .soft(
        new URL(run.page.url()).pathname,
        `the URL after a click off the hull, ${where}`,
      )
      .toBe("/log");

    // Ctrl-click: a new page, and this one stays.
    const first = aims[0];
    if (first) {
      await run.page.mouse.move(first.at.x, first.at.y);
      await twoFrames(run.page);
      const opened = run.context.waitForEvent("page", { timeout: 15_000 });
      await run.page.keyboard.down("Control");
      await run.page.mouse.click(first.at.x, first.at.y);
      await run.page.keyboard.up("Control");
      const tab = await opened.catch(() => null);
      expect
        .soft(tab, `a new page from a Ctrl-click on ${first.n}, ${where}`)
        .not.toBeNull();
      if (tab) {
        await tab
          .waitForURL((u) => u.pathname === `/log/${first.n}`, {
            timeout: 15_000,
          })
          .catch(() => undefined);
        expect
          .soft(new URL(tab.url()).pathname, `the new page's URL, ${where}`)
          .toBe(`/log/${first.n}`);
        await tab.close();
      }
      await pause(500);
      expect
        .soft(
          new URL(run.page.url()).pathname,
          `this page's URL after the Ctrl-click, ${where}`,
        )
        .toBe("/log");
    }
    expect.soft(run.errors, `console errors, ${where}`).toEqual([]);
    await run.close();

    // On a record, another plank opens its own record.
    const record = await openModel(browser, { width, height });
    await record.goto(`/log/${MARKED}`);
    await record.waitFor([...REST], FIRST);
    await pause(300);
    const other = (await ghostNumbers(record.page)).find(
      (n) =>
        n.shown && SEAT_BY_NUMBER.get(Number(n.text)) !== markedSeat(MARKED),
    );
    expect(
      other,
      `another plank's number on /log/${MARKED}, ${where}`,
    ).toBeDefined();
    if (other) {
      const at = centreOf(other.box);
      await record.page.mouse.move(at.x, at.y);
      await twoFrames(record.page);
      expect
        .soft(
          await pickOf(record.page),
          `data-pick over ${other.text} on /log/${MARKED}, ${where}`,
        )
        .toBe(SEAT_BY_NUMBER.get(Number(other.text)) ?? null);
      await record.page.mouse.click(at.x, at.y);
      await landedOn(record.page, Number(other.text));
    }
    await record.close();
  });
}

test("B5.24 A plank opens its record, with touch at 390 x 844: for each seat, at a point where a mouse hover without touch reads data-pick as that seat (a 2 px scan), a tap opens /log/GHOST[seat], a 40 px touch drag starting there scrolls the page by its distance and opens nothing, and a tap during the move opens nothing", async ({
  browser,
}) => {
  test.setTimeout(1_200_000);
  const size = { width: 390, height: 844 };
  const mouse = await openModel(browser, size);
  await mouse.goto("/log");
  await mouse.waitFor([...REST], FIRST);
  await pause(300);
  const scan = await scanSeats(mouse, 2);
  await mouse.close();
  expect
    .soft(
      SEATS.filter((s) => !scan.points.has(s)),
      "seats a mouse scan at 390 found no point on",
    )
    .toEqual([]);

  const touch = await openModel(browser, { ...size, touch: true });
  await touch.goto("/log");
  await touch.waitFor([...REST], FIRST);
  await pause(300);
  for (const [seat, at] of scan.points) {
    const n = GHOST[seat] ?? Number.NaN;
    const where = `seat ${seat} (${n}) at (${at.x}, ${at.y})`;
    // A drag from the point scrolls, and opens nothing.
    await touchDrag(touch.page, at.x, at.y, 40);
    await pause(400);
    const scrolled = await touch.page.evaluate(() => scrollY);
    expect
      .soft(
        Math.abs(scrolled - 40),
        `scroll after a 40 px drag from ${where} (${scrolled} px)`,
      )
      .toBeLessThanOrEqual(TOUCH_SLOP);
    expect
      .soft(
        new URL(touch.page.url()).pathname,
        `the URL after a drag from ${where}`,
      )
      .toBe("/log");
    await touch.page.evaluate(() => scrollTo(0, 0));
    await pause(300);
    // A tap opens the record.
    await touch.page.touchscreen.tap(at.x, at.y);
    const landed = await landedOn(touch.page, n).then(
      () => true,
      () => false,
    );
    expect.soft(landed, `a tap at ${where} opens /log/${n}`).toBe(true);
    if (landed) {
      await touch.page.goBack();
      await touch.page.waitForURL((u) => u.pathname === "/log");
    } else {
      await touch.goto("/log");
    }
    await atRest(touch, `back on /log after ${where}`);
    await touch.page.evaluate(() => scrollTo(0, 0));
    await pause(300);
  }
  expect.soft(touch.errors, "console errors over the taps").toEqual([]);
  await touch.close();

  // A tap during the move opens nothing, at each seat's point.
  for (const [seat, at] of scan.points) {
    const where = `a tap during the move at seat ${seat}'s point`;
    const run = await openModel(browser, { ...size, touch: true, clock: true });
    await run.goto("/log");
    await run.until(SHOWN, 4, FIRST);
    await run.until(["lofting"], 4, 20_000);
    await run.page.touchscreen.tap(at.x, at.y);
    await pause(150);
    await run.step(TWO_FRAMES);
    await run.step(500);
    await pause(500);
    expect
      .soft(new URL(run.page.url()).pathname, `the URL after ${where}`)
      .toBe("/log");
    await run.close();
  }
});
