import { expect, type Page, test } from "@playwright/test";
import {
  EVERY,
  LOG,
  open,
  RECORD,
  ROWS,
  readRecord,
  recordOf,
  SAMPLES,
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

/** The Log's table as the DOM has it: its heads, and each row's number and Date cell, with its label. */
function readTable(page: Page) {
  return page.evaluate(
    ({ every, rows }) => {
      const squashed = (el: Element | null | undefined) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
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
          const before = cell ? getComputedStyle(cell, "::before") : null;
          return {
            number: Number(href.match(/^\/log\/(\d+)$/)?.[1]),
            date: cell ? squashed(cell) : null,
            shown: cell ? cell.getClientRects().length > 0 : false,
            label:
              before &&
              !["none", "normal"].includes(before.content) &&
              before.display !== "none" &&
              before.visibility !== "hidden"
                ? before.content
                : "",
          };
        }),
      };
    },
    { every: EVERY, rows: ROWS },
  );
}

// ---------------------------------------------------------------------------------------------
// B5.12 The Date column

test("B5.12 the Date column: at 390, 1024 and 1440 with scripts on and off, the heads are Rev, Description, Drawn, Checked, Tested, Approved, Date; each row's Date is its record's day or empty, never a dash; below 1024 it folds labelled Date", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
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
    for (const scripts of ["on", "off"] as const) {
      const where = `at ${width} px, scripts ${scripts}`;
      let table: Awaited<ReturnType<typeof readTable>>;
      if (scripts === "on") {
        await open(page, LOG, width);
        table = await readTable(page);
      } else {
        const bare = await withoutScripts(browser, LOG, width);
        expect(bare.status, `status of /log ${where}`).toBe(200);
        table = await readTable(bare.page);
        await bare.context.close();
      }
      expect.soft(table.heads, `the column heads ${where}`).toEqual(HEADS);
      expect(
        table.rows.map((row) => row.number),
        `the revision rows ${where}`,
      ).toEqual(VALID.map((entry) => entry.sprint));
      for (const [i, entry] of VALID.entries()) {
        const row = table.rows[i];
        expect
          .soft(row?.date, `revision ${entry.sprint}'s Date ${where}`)
          .toBe(dateCell(entry));
        if (width < 1024 && entry.merge) {
          // The fold sets each cell under the number with its head; the Date's reads "Date".
          expect
            .soft(
              row?.shown && row.label.includes('"Date"'),
              `revision ${entry.sprint}'s Date shows its label "Date" ${where} (::before ${row?.label || "none"})`,
            )
            .toBe(true);
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
    }
  }
});

// ---------------------------------------------------------------------------------------------
// B5.13 The day groups

test("B5.13 the day groups: every row in exactly one tbody opened by its rowgroup header; Undated first, then the days newest first; each header's weekday, day and count as the oracle's; every row's Date its group's day", async ({
  page,
}) => {
  // The contract's words, and the oracle's order: Undated first, then days strictly descending.
  expect(
    groupHeader("2026-10-24T03:36:27Z", 4, 2026),
    "the contract's header",
  ).toBe("Sat 24 Oct · 4 revisions");
  expect(groupHeader("2026-10-20T00:42:46Z", 1, 2026), "the singular").toBe(
    "Tue 20 Oct · 1 revision",
  );
  const days = GROUPS.flatMap((group) =>
    group.day === undefined
      ? []
      : [
          dayKey(
            MERGED.find((entry) => entry.sprint === group.sprints[0])?.merge
              ?.mergedAt ?? "",
          ),
        ],
  );
  expect(days, "the oracle's days, newest first, each once").toEqual(
    [...new Set(days)].sort().reverse(),
  );
  expect(
    GROUPS.findIndex((group) => group.header === UNDATED),
    "the oracle's Undated group: first or absent",
  ).toBeLessThanOrEqual(0);
  expect(days.length, "day groups in the oracle").toBeGreaterThan(0);
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
    expect
      .soft(
        [...numbers].sort((a, b) => a - b),
        `every revision in exactly one group ${where}`,
      )
      .toEqual(VALID.map((entry) => entry.sprint).sort((a, b) => a - b));
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

test("B5.14 the lines figure: one line in the Log's header after the count line, worded from the newest record, in the first screen at 1440 x 900", async ({
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

test("B5.15 the record's date: on the newest record, /log/13, /log/1 and /log/24 the Date pair reads the merge's day, time and year in UTC, right before Pull request; a sprint without a record has no Date pair", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(recordDate(MEASURED[27].mergedAt), "the contract's words").toBe(
    "24 Oct 2026, 03:36 UTC",
  );
  expect(recordDate(MEASURED[13].mergedAt), "sprint 13's").toBe(
    "20 Oct 2026, 00:42 UTC",
  );
  for (const n of SAMPLES) {
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
