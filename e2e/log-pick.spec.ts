import { expect, test } from "@playwright/test";
import {
  atRest,
  catchRecords,
  centreOf,
  cursorOf,
  ghostNumbers,
  landedOn,
  ledOutSeats,
  MARKED,
  markedSeat,
  offHull,
  pickOf,
  press,
  SEAT_BY_NUMBER,
  SEATS,
  scanSeats,
  servesRecord,
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
// plank; 5.0's and, from 768, 3.0's sit off the hull at their leaders' ends, which the pick
// tests first: .crew/sprint/33/early-look-iris.md, "Decision on must 2"). Below 768 the
// numbers are hidden and the pose isn't the drawing's, so each seat's point is found by a mouse
// scan on a 2 px grid in a context without touch, then tapped in one with touch.

const TWO_FRAMES = Math.ceil(2 * FRAME);
const DEFAULT_CURSORS = ["auto", "default"];

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
] as const) {
  test(`B5.24 A plank opens its record, with a mouse at ${width} x ${height}: settled on /log, at each of the 22 number spans' centres data-pick is that number's seat, the cursor pointer, and a click navigates the document to /log/<that number>, whose document holds its record's h2${width === 1440 ? " (the first landing for real)" : ""}; at a point on no plank no data-pick, the default cursor, and a click leaves the URL; Ctrl-click opens a new page and leaves this one${width === 1440 ? "; Back from a picked record returns to /log settled with one live context" : ""}${width === 1440 ? "; on /log/13 a pick on another plank opens that plank's record" : ""}`, async ({
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

    // Each click's document navigation is caught (answered 204, so /log stays at rest) and the
    // document at its path is fetched for its record's h2: what the click lands on, without a
    // reload and a model build per pick (sprint 33, decision 12). At 1440 the first pick also lands
    // for real, and comes Back.
    const records = await catchRecords(run.page);
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
      const path = await records.after(() => run.page.mouse.click(at.x, at.y));
      if (path !== `/log/${n}`) {
        wrong.push(`${n}: a click navigated to ${path ?? "nothing"}`);
        continue;
      }
      const served = await servesRecord(run.page, path, n);
      if (served) wrong.push(`${n}: ${path} serves ${served}`);
    }
    // One navigation a click: none doubled, none from a hover.
    expect
      .soft(records.count(), `record navigations over the 22 picks, ${where}`)
      .toBe(aims.length - wrong.filter((w) => w.includes("data-pick")).length);
    await records.stop();
    const real = aims[0];
    if (width === 1440 && real) {
      await run.page.mouse.move(real.at.x, real.at.y);
      await twoFrames(run.page);
      await run.page.mouse.click(real.at.x, real.at.y);
      await landedOn(run.page, real.n);
      await run.page.goBack({ waitUntil: "commit" });
      await run.page.waitForURL((u) => u.pathname === "/log", {
        waitUntil: "commit",
      });
      await atRest(run, `after Back from /log/${real.n}, ${where}`);
      await pause(100);
    }
    expect
      .soft(
        wrong,
        `numbers whose centre doesn't pick their own seat with a pointer cursor, or whose click goes elsewhere, ${where}`,
      )
      .toEqual([]);

    // Back from a picked record (at 1440, where the picks land for real): /log, settled, one live
    // context.
    if (width === 1440) {
      expect
        .soft(await run.state(), `data-state after Back, ${where}`)
        .toBe("settled");
      expect
        .soft(await run.live(), `live WebGL contexts after Back, ${where}`)
        .toBe(1);
    }

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

    // On a record, another plank opens its own record: once, at 1440 (the contract names no
    // width for it; the 22 picks above run at all three).
    if (width !== 1440) return;
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

test("B5.24 A plank opens its record, with touch at 390 x 844: for each seat, at a point where a mouse hover without touch reads data-pick as that seat (a 2 px scan), a tap navigates the document to /log/GHOST[seat], whose document holds its record's h2, a 40 px touch drag starting there scrolls the page by its distance and opens nothing, and a tap during the move opens nothing", async ({
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
  const records = await catchRecords(touch.page);
  for (const [seat, at] of scan.points) {
    const n = GHOST[seat] ?? Number.NaN;
    const where = `seat ${seat} (${n}) at (${at.x}, ${at.y})`;
    // A drag from the point scrolls, and opens nothing.
    await touchDrag(touch.page, at.x, at.y, 40);
    await pause(250);
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
    await pause(150);
    // A tap opens the record: its document navigation, answered 204 so /log stays at rest (the
    // landing and its h2 are checked for real at 1440, and every record's h2 by B5.6).
    const path = await records.after(() =>
      touch.page.touchscreen.tap(at.x, at.y),
    );
    expect
      .soft(path, `the navigation a tap at ${where} makes`)
      .toBe(`/log/${n}`);
    if (path)
      expect
        .soft(
          await servesRecord(touch.page, path, n),
          `what ${path} serves, after a tap at ${where}`,
        )
        .toBeNull();
    await pause(100);
  }
  await records.stop();
  expect.soft(touch.errors, "console errors over the taps").toEqual([]);
  await touch.close();

  // A tap during the move opens nothing, at each seat's point: one page on the clock, the move
  // replayed for each seat by Calm then Full (B5.20: Full pressed from Calm replays it from frame 1).
  const run = await openModel(browser, { ...size, touch: true, clock: true });
  await run.goto("/log");
  await run.until(SHOWN, 4, FIRST);
  let first = true;
  for (const [seat, at] of scan.points) {
    const where = `a tap during the move at seat ${seat}'s point`;
    if (!first) {
      await press(run.page, "Calm");
      await run.step(100);
      await press(run.page, "Full");
    }
    first = false;
    await run.until(["lofting"], 4, FIRST);
    await run.page.touchscreen.tap(at.x, at.y);
    await pause(150);
    await run.step(TWO_FRAMES);
    await run.step(500);
    await pause(300);
    expect
      .soft(new URL(run.page.url()).pathname, `the URL after ${where}`)
      .toBe("/log");
    await run.until([...REST], 4, 10_000);
  }
  expect
    .soft(run.errors, "console errors over the taps during the move")
    .toEqual([]);
  await run.close();
});

test("B5.24 A plank opens its record, the press's edges, at 1440 x 900 on /log: a mouse press on a plank, main or middle button, dragged off the canvas and released there opens nothing, and hover lives on: back over a plank, data-pick is its seat and the cursor pointer; a Ctrl-click and a middle-click on a plank each open the record in a new page with no opener, which plays the move", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const run = await openModel(browser, { width: 1440, height: 900 });
  await run.goto("/log");
  await run.waitFor([...REST], FIRST);
  await pause(300);
  // Two numbers on the hull itself, not led out to a leader's end.
  const led = await ledOutSeats(run.page);
  const numbers = (await ghostNumbers(run.page)).filter(
    (n) => n.shown && !led.includes(SEAT_BY_NUMBER.get(Number(n.text)) ?? ""),
  );
  const [first, second] = numbers;
  expect(first && second, "two numbers shown on the hull").toBeTruthy();
  if (!first || !second) return;
  const a = {
    at: centreOf(first.box),
    seat: SEAT_BY_NUMBER.get(Number(first.text)),
  };
  const b = {
    at: centreOf(second.box),
    seat: SEAT_BY_NUMBER.get(Number(second.text)),
  };

  // Lens on #83: a press on a plank, dragged off the canvas and released there, with the main
  // button and the middle one; it opens nothing, and the hover lives on.
  for (const button of ["left", "middle"] as const) {
    const pages = run.context.pages().length;
    await run.page.mouse.move(a.at.x, a.at.y);
    await twoFrames(run.page);
    await run.page.mouse.down({ button });
    await run.page.mouse.move(a.at.x, 20, { steps: 8 });
    await run.page.mouse.up({ button });
    await pause(800);
    expect
      .soft(
        new URL(run.page.url()).pathname,
        `the URL after a ${button} press dragged off the canvas`,
      )
      .toBe("/log");
    expect
      .soft(
        run.context.pages().length,
        `pages after a ${button} press dragged off the canvas`,
      )
      .toBe(pages);
    await run.page.mouse.move(b.at.x, b.at.y, { steps: 4 });
    await twoFrames(run.page);
    await pause(200);
    expect
      .soft(
        await pickOf(run.page),
        `data-pick back over ${second.text} after the ${button} drag`,
      )
      .toBe(b.seat ?? null);
    expect
      .soft(
        await cursorOf(run.page),
        `the cursor back over ${second.text} after the ${button} drag`,
      )
      .toBe("pointer");
    await run.page.mouse.move(a.at.x, a.at.y, { steps: 4 });
    await twoFrames(run.page);
    expect
      .soft(
        await pickOf(run.page),
        `data-pick over ${first.text} after the ${button} drag`,
      )
      .toBe(a.seat ?? null);
  }

  // A new page from a Ctrl-click or a middle-click: no opener, so its own visit, and the move plays.
  for (const how of ["Ctrl-click", "middle-click"] as const) {
    await run.page.mouse.move(a.at.x, a.at.y);
    await twoFrames(run.page);
    const opened = run.context.waitForEvent("page", { timeout: 15_000 });
    if (how === "Ctrl-click") {
      await run.page.keyboard.down("Control");
      await run.page.mouse.click(a.at.x, a.at.y);
      await run.page.keyboard.up("Control");
    } else {
      await run.page.mouse.click(a.at.x, a.at.y, { button: "middle" });
    }
    const tab = await opened.catch(() => null);
    expect
      .soft(tab, `a new page from a ${how} on ${first.text}`)
      .not.toBeNull();
    if (!tab) continue;
    await tab
      .waitForURL((u) => u.pathname === `/log/${first.text}`, {
        timeout: 15_000,
      })
      .catch(() => undefined);
    expect
      .soft(new URL(tab.url()).pathname, `the new page's URL after a ${how}`)
      .toBe(`/log/${first.text}`);
    expect
      .soft(
        await tab.evaluate(() => window.opener === null),
        `the new page has no opener after a ${how}`,
      )
      .toBe(true);
    const end = Date.now() + FIRST;
    let seen: string[] = [];
    while (Date.now() < end && !seen.some((s) => REST.includes(s))) {
      seen = await tab.evaluate(
        () =>
          (window as Window & { __states?: { state: string }[] }).__states?.map(
            (s) => s.state,
          ) ?? [],
      );
      await pause(100);
    }
    expect
      .soft(seen, `the new page from a ${how} plays the move`)
      .toContain("lofting");
    await tab.close();
    expect
      .soft(
        new URL(run.page.url()).pathname,
        `this page's URL after the ${how}`,
      )
      .toBe("/log");
  }
  expect.soft(run.errors, "console errors").toEqual([]);
  await run.close();
});
