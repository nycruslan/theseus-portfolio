import { expect, type Page, test } from "@playwright/test";
import {
  EVERY,
  LOG,
  open,
  RECORD,
  ROWS,
  readRecord,
  recordOf,
  squash,
  VALID,
  withoutScripts,
} from "./log";
import {
  dateCell,
  dateWords,
  dayKey,
  GROUPS,
  groupHeader,
  LINES,
  LINES_PHRASE,
  linesLine,
  MERGED,
  NEWEST_DATED_SPRINT,
  NEWEST_MERGE,
  readMergeFile,
  recordDate,
  UNDATED,
} from "./retros";

// Sprint 32, B5b: the merge record on /log (.crew/sprint/32/contract.md, B5.12 to B5.16, with
// decisions.md), written before the build. The Log's Date column, its day groups, the lines figure
// in its header, a record's Date pair, and the records on disk. The oracle is e2e/retros.ts, which
// reads each folder's merge.json with its own lines, never the page's reader; the anchors below pin
// its words to the contract's examples and its dates to git (measured on origin/main, 2026-10-25).
// B5.17 is the B5a suite itself, rewritten in place: log.ts and the specs that count the Log's rows
// read revision rows only (a day group's header row is not one), B5.5 checks seven heads with the
// Date in each row, and B5.6 (C4.2) checks every record's pairs with the Date before Pull request.
//
// Hooks these checks rely on beyond B5a's: one `tbody` per group, opened by a row holding only its
// `th[scope="rowgroup"]`; the Date as the column under the head "Date"; the lines line found by its
// words in the page's text.

const HEADS = [
  "Rev",
  "Description",
  "Drawn",
  "Checked",
  "Tested",
  "Approved",
  "Date",
];

/** Sprint 13's and sprint 27's merges on origin/main (git log, committer dates in UTC). */
const MEASURED = {
  13: {
    mergedAt: "2026-10-20T00:42:46Z",
    commit: "d98bb2555fe1e82bf316cfabef0b353bb4f42299",
  },
  27: {
    mergedAt: "2026-10-24T03:36:27Z",
    commit: "0fcb84fd20d3c50a0dce53746ae03ac115b17e88",
  },
} as const;

/**
 * The Log's table as the DOM has it: its heads, each row's number and Date cell as painted, and the
 * group headers as painted. A box is "hidden" in the sr-only pattern: at most 1 x 1 px, overflow
 * clipped, and `clip: rect(0 0 0 0)` or `clip-path: inset(50%)` (decision 10: below 640 the Date
 * cell is kept for assistive tech and paints nothing).
 */
function readTable(page: Page) {
  return page.evaluate(
    ({ every, rows }) => {
      const squashed = (el: Element | null | undefined) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const srOnly = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width <= 1 &&
          r.height <= 1 &&
          s.overflowX !== "visible" &&
          (/rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(s.clip) ||
            s.clipPath === "inset(50%)")
        );
      };
      /** Whether el or an ancestor up to `top` is in the sr-only pattern. */
      const hiddenWithin = (el: Element | null, top: Element) => {
        for (let at = el; at; at = at.parentElement) {
          if (srOnly(at)) return true;
          if (at === top) break;
        }
        return false;
      };
      /** Text that paints: a text node's box wider and taller than 1 px, outside any sr-only box. */
      const ink = (el: Element) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if ((node.textContent ?? "").trim() === "") continue;
          if (hiddenWithin(node.parentElement, el)) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          if (
            [...range.getClientRects()].some((r) => r.width > 1 && r.height > 1)
          ) {
            return true;
          }
        }
        return false;
      };
      /** Whether the box itself paints: a border, a background or a shadow on an area over 1 px. */
      const paintsBox = (el: Element) => {
        if (srOnly(el)) return false;
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) return false;
        const s = getComputedStyle(el);
        const borders = ["Top", "Right", "Bottom", "Left"].some(
          (side) =>
            Number.parseFloat(
              s.getPropertyValue(`border-${side.toLowerCase()}-width`),
            ) > 0 &&
            s.getPropertyValue(`border-${side.toLowerCase()}-style`) !== "none",
        );
        const ground = !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(
          s.backgroundColor,
        );
        return borders || ground || s.boxShadow !== "none";
      };
      /** In the accessibility tree: not aria-hidden, display none or visibility hidden. */
      const inTree = (el: Element) =>
        !el.closest('[aria-hidden="true"]') &&
        el.checkVisibility({ visibilityProperty: true });
      const shown = (el: Element) =>
        !srOnly(el) &&
        el.getBoundingClientRect().width > 1 &&
        el.getBoundingClientRect().height > 1 &&
        el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      const section = document.querySelector(every);
      const heads = [
        ...(section?.querySelectorAll('thead th[scope="col"]') ?? []),
      ].map((th) => squashed(th));
      const at = heads.indexOf("Date");
      return {
        heads,
        rows: [...document.querySelectorAll(rows)].map((tr) => {
          const href =
            tr
              .querySelector(':scope > th[scope="row"] a')
              ?.getAttribute("href") ?? "";
          const cell =
            at < 0
              ? undefined
              : [...tr.querySelectorAll(":scope > th, :scope > td")][at];
          return {
            number: Number(href.match(/^\/log\/(\d+)$/)?.[1]),
            date: cell ? squashed(cell) : null,
            inTree: cell ? inTree(cell) : false,
            shown: cell
              ? shown(cell) && (squashed(cell) === "" || ink(cell))
              : false,
            paints: cell ? paintsBox(cell) || ink(cell) : false,
          };
        }),
        headers: [
          ...(section?.querySelectorAll('tbody th[scope="rowgroup"]') ?? []),
        ].map((th) => ({
          text: squashed(th),
          shown: shown(th) && ink(th),
        })),
      };
    },
    { every: EVERY, rows: ROWS },
  );
}

/** The Date cell of the i-th revision row, for its accessible name. */
const dateCellOf = (page: Page, i: number) =>
  page
    .locator(ROWS)
    .nth(i)
    .locator(":scope > th, :scope > td")
    .nth(HEADS.indexOf("Date"));

// ---------------------------------------------------------------------------------------------
// B5.12 The Date column

test("B5.12 the Date column: at 390, 1024 and 1440 with scripts on and off, the heads are Rev, Description, Drawn, Checked, Tested, Approved, Date; each row's Date is its record's day or empty, never a dash; at 1024 and 1440 it shows, and at 390 it is kept for assistive tech and paints nothing under a group header that shows", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  // The contract's words: "24 Oct", the year only when it isn't the newest record's.
  expect(dateWords("2026-10-24T03:36:27Z", 2026), "the oracle's day").toBe(
    "24 Oct",
  );
  expect(dateWords("2025-12-31T23:59:59Z", 2026), "another year's day").toBe(
    "31 Dec 2025",
  );
  expect(
    MERGED.filter((entry) => entry.merge).length,
    "merged sprints with a valid merge.json",
  ).toBeGreaterThan(0);

  for (const width of [390, 1024, 1440]) {
    // Rows fold below 640 (decision 10): there the group header names the day, and the cell is
    // the assistive tech's alone.
    const folded = width < 640;
    for (const scripts of ["on", "off"] as const) {
      const where = `at ${width} px, scripts ${scripts}`;
      const bare =
        scripts === "off" ? await withoutScripts(browser, LOG, width) : null;
      if (bare) expect(bare.status, `status of /log ${where}`).toBe(200);
      else await open(page, LOG, width);
      const tab = bare?.page ?? page;
      const table = await readTable(tab);
      expect.soft(table.heads, `the column heads ${where}`).toEqual(HEADS);
      expect(
        table.rows.map((row) => row.number),
        `the revision rows ${where}`,
      ).toEqual(VALID.map((entry) => entry.sprint));
      for (const [i, entry] of VALID.entries()) {
        const row = table.rows[i];
        const name = `revision ${entry.sprint}'s Date ${where}`;
        expect.soft(row?.date, name).toBe(dateCell(entry));
        await expect
          .soft(dateCellOf(tab, i), `${name}, as assistive tech reads it`)
          // The page is static by now: no retries, so a broken table fails fast, not by timeout.
          .toHaveAccessibleName(dateCell(entry), { timeout: 100 });
        expect
          .soft(row?.inTree, `${name} is in the accessibility tree`)
          .toBe(true);
        if (folded) {
          expect
            .soft(
              row?.paints,
              `${name} paints nothing (its box, if any, in the sr-only pattern)`,
            )
            .toBe(false);
        } else {
          expect.soft(row?.shown, `${name} shows`).toBe(true);
        }
      }
      expect
        .soft(
          table.rows
            .filter((row) => /^[—–-]$/.test(row.date ?? ""))
            .map((row) => row.number),
          `rows whose Date reads a dash ${where}`,
        )
        .toEqual([]);
      if (folded) {
        expect(table.headers.length, `group headers ${where}`).toBeGreaterThan(
          0,
        );
        expect
          .soft(
            table.headers.filter((h) => !h.shown).map((h) => h.text),
            `group headers that don't show ${where}`,
          )
          .toEqual([]);
      }
      await bare?.context.close();
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B5.13 The day groups

test("B5.13 the day groups: the rows in table order, cut into runs that share a UTC day or share no record, each run one tbody opened by its rowgroup header with the oracle's weekday, day (or Undated) and count; every row's Date its group's day", async ({
  page,
}) => {
  // The contract's words.
  expect(
    groupHeader("2026-10-24T03:36:27Z", 4, 2026),
    "the contract's header",
  ).toBe("Sat 24 Oct · 4 revisions");
  expect(groupHeader("2026-10-20T00:42:46Z", 1, 2026), "the singular").toBe(
    "Tue 20 Oct · 1 revision",
  );
  // The oracle's runs, read back against the rule: table order kept, one key per run, and
  // neighbouring runs on different keys (decision 11).
  const keyOf = (n: number) => {
    const merge = MERGED.find((entry) => entry.sprint === n)?.merge;
    return merge ? dayKey(merge.mergedAt) : UNDATED;
  };
  expect(
    GROUPS.flatMap((group) => group.sprints),
    "the oracle's groups hold the rows in table order",
  ).toEqual(VALID.map((entry) => entry.sprint));
  const keys = GROUPS.map((group) => [...new Set(group.sprints.map(keyOf))]);
  expect(
    keys.filter((runKeys) => runKeys.length !== 1),
    "oracle groups mixing days",
  ).toEqual([]);
  expect(
    keys.filter((runKeys, i) => i > 0 && runKeys[0] === keys[i - 1]?.[0]),
    "oracle groups on the same key as the group above",
  ).toEqual([]);
  expect(
    GROUPS.filter((group) => group.day !== undefined).length,
    "day groups in the oracle",
  ).toBeGreaterThan(0);
  if (!GROUPS.some((group) => group.header === UNDATED)) {
    test.info().annotations.push({
      type: "unchecked",
      description:
        "every merged sprint has a record, so no Undated group is drawn to check",
    });
  }

  for (const width of [390, 1440]) {
    await open(page, LOG, width);
    const found = await page.evaluate((every) => {
      const squashed = (el: Element | null | undefined) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const table = document.querySelector<HTMLTableElement>(`${every} table`);
      const heads = [
        ...(table?.querySelectorAll('thead th[scope="col"]') ?? []),
      ].map((th) => squashed(th));
      const at = heads.indexOf("Date");
      return {
        columns: heads.length,
        groups: [...(table?.tBodies ?? [])].map((tbody) => {
          const headers = [
            ...tbody.querySelectorAll('th[scope="rowgroup"]'),
          ].filter(
            (th): th is HTMLTableCellElement =>
              th instanceof HTMLTableCellElement,
          );
          const first = tbody.rows[0];
          return {
            headers: headers.map((th) => squashed(th)),
            // One row header, opening the group: alone in the first row and across it.
            opens:
              headers.length === 1 &&
              headers[0]?.parentElement === first &&
              first?.cells.length === 1,
            span: headers[0]?.colSpan ?? 0,
            others: [...tbody.rows].filter(
              (tr) =>
                tr !== first && !tr.querySelector(':scope > th[scope="row"]'),
            ).length,
            rows: [...tbody.rows]
              .filter((tr) => tr.querySelector(':scope > th[scope="row"]'))
              .map((tr) => ({
                number: Number(
                  tr
                    .querySelector(':scope > th[scope="row"] a')
                    ?.getAttribute("href")
                    ?.match(/^\/log\/(\d+)$/)?.[1],
                ),
                date:
                  at < 0
                    ? null
                    : squashed(
                        [...tr.querySelectorAll(":scope > th, :scope > td")][
                          at
                        ],
                      ),
              })),
          };
        }),
      };
    }, EVERY);
    const where = `at ${width} px`;
    const numbers = found.groups.flatMap((group) =>
      group.rows.map((row) => row.number),
    );
    // In the page's own terms, whatever the oracle says: the groups keep the table's order, each
    // group's rows share one Date, and no group shares its Date with the group above.
    expect
      .soft(
        numbers,
        `every revision in exactly one group, in table order ${where}`,
      )
      .toEqual(VALID.map((entry) => entry.sprint));
    const dates = found.groups.map((group) => [
      ...new Set(group.rows.map((row) => row.date)),
    ]);
    expect
      .soft(
        dates.filter((groupDates) => groupDates.length !== 1),
        `groups whose rows differ in Date ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        dates.filter(
          (groupDates, i) => i > 0 && groupDates[0] === dates[i - 1]?.[0],
        ),
        `groups on the same Date as the group above ${where}`,
      )
      .toEqual([]);
    expect
      .soft(
        found.groups.map((group) => group.headers),
        `the groups' headers, top to bottom ${where}`,
      )
      .toEqual(GROUPS.map((group) => [group.header]));
    for (const [i, group] of GROUPS.entries()) {
      const shown = found.groups[i];
      const name = `the group "${group.header}" ${where}`;
      expect
        .soft(
          { opens: shown?.opens, span: shown?.span, others: shown?.others },
          `${name}: its header alone in its first row, across the ${found.columns} columns, and no other row without a number`,
        )
        .toEqual({ opens: true, span: found.columns, others: 0 });
      expect
        .soft(
          shown?.rows.map((row) => row.number),
          `${name}: its revisions, by number, descending`,
        )
        .toEqual(group.sprints);
      expect
        .soft(
          shown?.rows.filter((row) => row.date !== (group.day ?? "")),
          `${name}: rows whose Date isn't the group's day ("${group.day ?? ""}")`,
        )
        .toEqual([]);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B5.14 The lines figure

/** Every element whose own text holds the lines line's words, innermost, outside scripts. */
function readLines(page: Page) {
  return page.evaluate(
    ({ phrase, every }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const skip = "script, style, template, noscript";
      const holds = (el: Element) =>
        !el.matches(skip) && squashed(el).includes(phrase);
      const found = [...document.body.querySelectorAll("*")].filter(
        (el) => holds(el) && ![...el.children].some((child) => holds(child)),
      );
      const count = document.querySelector("main p[data-ghost-count]");
      const section = document.querySelector(every);
      const follows = (a: Element | null, b: Element | null) =>
        Boolean(
          a &&
            b &&
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      return found.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: squashed(el),
          inMain: Boolean(el.closest("main")),
          afterCount: follows(count, el),
          beforeTable: follows(el, section),
          top: r.top,
          bottom: r.bottom,
          height: innerHeight,
        };
      });
    },
    { phrase: LINES_PHRASE, every: EVERY },
  );
}

test("B5.14 the lines figure: one line in the Log's header after the count line, worded from the record merged last, in the first screen at 1440 x 900", async ({
  page,
}) => {
  // The contract's words, against Quill's measurement at 0fcb84f.
  expect(
    linesLine({
      commit: MEASURED[27].commit,
      lines: { original: 64, total: 5288 },
    }),
    "the oracle's line for 64 of 5,288 at 0fcb84f",
  ).toBe(
    "64 of 5,288 lines of the site's code are still original: 1.2%, by git blame on app, components and lib at 0fcb84f.",
  );
  expect(LINES, "a merged sprint with a record to word the line from").toEqual(
    expect.any(String),
  );

  for (const url of [LOG, recordOf(13)]) {
    await open(page, url, 1440, undefined, 900);
    const found = await readLines(page);
    expect
      .soft(
        found.map((line) => line.text),
        `the lines line on ${url}, and only one`,
      )
      .toEqual([LINES]);
    expect
      .soft(
        found.map((line) => ({
          inMain: line.inMain,
          afterCount: line.afterCount,
          beforeTable: line.beforeTable,
        })),
        `on ${url} the line is in main, after the count line and before Every revision`,
      )
      .toEqual([{ inMain: true, afterCount: true, beforeTable: true }]);
    if (url === LOG) {
      for (const line of found) {
        expect
          .soft(
            line.top >= 0 && line.bottom <= line.height,
            `the lines line spans ${line.top} to ${line.bottom} px in a ${line.height} px first screen at 1440`,
          )
          .toBe(true);
      }
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B5.15 The record's date

test("B5.15 the record's date: on the record merged last, /log/13, /log/1 and /log/24 the Date pair reads the merge's day, time and year in UTC, right before Pull request; a sprint without a record has no Date pair", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(recordDate(MEASURED[27].mergedAt), "the contract's words").toBe(
    "24 Oct 2026, 03:36 UTC",
  );
  expect(recordDate(MEASURED[13].mergedAt), "sprint 13's").toBe(
    "20 Oct 2026, 00:42 UTC",
  );
  // The newest record is the one merged last (decision 11, as the lines line's): on this PR's own
  // preview, and on main until the next run writes its record, the newest sprint has none.
  for (const n of [
    ...new Set([NEWEST_DATED_SPRINT ?? Number.NaN, 13, 1, 24]),
  ]) {
    const entry = MERGED.find((retro) => retro.sprint === n);
    const merge = entry?.merge;
    expect.soft(merge, `revision ${n}'s merge record`).toBeDefined();
    if (!merge) continue;
    await open(page, recordOf(n), 1440);
    const record = await readRecord(page);
    const heads = record.pairs.map(([dt]) => dt);
    expect
      .soft(
        record.pairs.filter(([dt]) => dt === "Date"),
        `/log/${n}'s Date pair`,
      )
      .toEqual([["Date", recordDate(merge.mergedAt)]]);
    expect
      .soft(
        heads.indexOf("Date") >= 0 &&
          heads.indexOf("Date") + 1 === heads.indexOf("Pull request"),
        `on /log/${n} Date comes right before Pull request: ${heads.join(", ")}`,
      )
      .toBe(true);
  }
  const undated = MERGED.filter((retro) => !retro.merge);
  if (undated.length === 0) {
    test.info().annotations.push({
      type: "unchecked",
      description:
        "every merged sprint has a record, so no record without a Date pair to check",
    });
  }
  for (const entry of undated) {
    await open(page, recordOf(entry.sprint), 1440);
    const record = await readRecord(page);
    expect
      .soft(
        record.pairs.map(([dt]) => dt),
        `/log/${entry.sprint} has no record, so no Date pair`,
      )
      .not.toContain("Date");
    expect
      .soft(
        squash(
          await page.locator(RECORD).evaluate((el) => el.textContent ?? ""),
        ),
        `/log/${entry.sprint}'s record names no day`,
      )
      .not.toMatch(/\bUTC\b/);
  }
});

// ---------------------------------------------------------------------------------------------
// B5.16 The records themselves

test("B5.16 every merged sprint from 1 to 30 has a merge.json: its retro's pr, mergedAt an ISO UTC instant from 2026-10-13, a 40-hex commit, original lines at most the total; sprint 13's and 27's as git measured", () => {
  const backfilled = MERGED.filter((retro) => retro.sprint <= 30);
  expect(
    backfilled.map((retro) => retro.sprint),
    "the merged sprints from 1 to 30 (no 16)",
  ).toEqual([
    ...Array.from({ length: 15 }, (_, i) => i + 1),
    ...Array.from({ length: 14 }, (_, i) => i + 17),
  ]);
  const floor = Date.parse("2026-10-13T00:00:00Z");
  for (const retro of backfilled) {
    const n = retro.sprint;
    const raw = readMergeFile(n) as
      | {
          pr?: unknown;
          mergedAt?: unknown;
          commit?: unknown;
          lines?: { original?: unknown; total?: unknown };
        }
      | undefined;
    const file = `.crew/sprint/${n}/merge.json`;
    expect.soft(raw, `${file} exists and is JSON`).toBeDefined();
    if (!raw) continue;
    expect.soft(raw.pr, `${file}'s pr, against its retro's`).toBe(retro.pr);
    const at = typeof raw.mergedAt === "string" ? raw.mergedAt : "";
    expect
      .soft(at, `${file}'s mergedAt is an ISO UTC instant ending in Z`)
      .toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/);
    expect
      .soft(
        Date.parse(at) >= floor,
        `${file}'s mergedAt (${at}) is on or after 2026-10-13`,
      )
      .toBe(true);
    expect
      .soft(raw.commit, `${file}'s commit is 40 hex characters`)
      .toMatch(/^[0-9a-f]{40}$/);
    const { original, total } = raw.lines ?? {};
    expect
      .soft(
        Number.isInteger(original) &&
          Number.isInteger(total) &&
          (original as number) >= 0 &&
          (original as number) <= (total as number),
        `${file}'s lines: ${original} original of ${total}`,
      )
      .toBe(true);
    expect
      .soft(retro.merge, `${file} is a record the oracle accepts`)
      .toBeDefined();
  }
  for (const [n, measured] of Object.entries(MEASURED)) {
    const raw = readMergeFile(Number(n)) as
      | { mergedAt?: unknown; commit?: unknown }
      | undefined;
    expect
      .soft(
        { mergedAt: raw?.mergedAt, commit: raw?.commit },
        `sprint ${n}'s record, as git has its merge`,
      )
      .toEqual(measured);
  }
  // Quill's measurement at 0fcb84f, sprint 27's merge, which the writer must reproduce.
  expect
    .soft(
      (readMergeFile(27) as { lines?: unknown } | undefined)?.lines,
      "sprint 27's lines at 0fcb84f",
    )
    .toEqual({ original: 64, total: 5288 });
  expect(NEWEST_MERGE, "the newest record").toBeDefined();
});
