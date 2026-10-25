import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { installRgba, SCHEMES } from "./helpers";
import {
  BAR,
  EVERY,
  entryOf,
  ITEMS,
  LOG,
  open,
  prHref,
  RECORD,
  ROWS,
  readRecord,
  readRows,
  recordOf,
  SAMPLES,
  sameColor,
  shown,
  squash,
  tokenRgba,
  VALID,
  WRONG,
} from "./log";
import {
  MERGED,
  neighbours,
  plankWords,
  REPO,
  recordPairs,
  SEATS_PER_LIFT,
} from "./retros";
import { refuseWebGl } from "./webgl";

// Sprint 30, B5a: a record per revision at /log/<n>, and Back from it
// (.crew/sprint/29/b5-first-contract.md, B5.6 and B5.7), written before the build; the rest of the
// Log's checks are in log.spec.ts. B5.6 rewrites sprint 13's C4.2 to C4.4, C5.1 to C5.3 and C8.2
// from sprints.spec.ts, each keeping its C-number in its title, onto the records. The oracle is
// e2e/retros.ts; the contract's three plank examples are typed in below as anchors on it. Sprint 33
// (.crew/sprint/33/contract.md, "The live checks"): every context refuses WebGL, since the ghost in
// 3D restyles the drawing these checks read; C5.2 counts main without the motion control
// (amendment 1).

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
  await context.addInitScript(refuseWebGl);
});

// ---------------------------------------------------------------------------------------------
// B5.6 A record per revision

test.describe("B5.6 A record per revision", () => {
  test("B5.6 every merged revision answers 200 at /log/N; /log/16, 0, 999, abc, 013 and a folder without a retro answer 404 with the site's not-found page", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    for (const entry of VALID) {
      const response = await request.get(recordOf(entry.sprint));
      expect
        .soft(response.status(), `status of /log/${entry.sprint}`)
        .toBe(200);
    }
    // On a sprint's own preview its folder has no retro yet: its number isn't a revision.
    const merged = new Set(MERGED.map((entry) => entry.sprint));
    const unmerged = readdirSync(join(process.cwd(), ".crew", "sprint"))
      .filter((folder) => /^\d+$/.test(folder) && !merged.has(Number(folder)))
      .map((folder) => recordOf(Number(folder)));
    for (const url of [
      ...["16", "0", "999", "abc", "013"].map((n) => `${LOG}/${n}`),
      ...unmerged,
    ]) {
      const response = await page.goto(url);
      expect.soft(response?.status(), `status of ${url}`).toBe(404);
      const found = await page.evaluate(() => ({
        h1: [...document.querySelectorAll("h1")].map((h) =>
          (h.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
        robots: [...document.querySelectorAll('meta[name="robots"]')].map(
          (m) => m.getAttribute("content") ?? "",
        ),
      }));
      expect.soft(found.h1, `the h1 of ${url}`).toEqual(["Page not found"]);
      expect
        .soft(
          found.robots.some((content) => /\bnoindex\b/i.test(content)),
          `${url} says noindex: ${JSON.stringify(found.robots)}`,
        )
        .toBe(true);
    }
  });

  test("B5.6 (C4.2) each record: Rev N, the goal as its h2, the dl's pairs in the data rules' order (Size in words, Approved Owner exactly for needs-owner, the plank's words), after the Log's header and before Every revision", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Anchors the oracle has to meet: the lifts' seats, and the contract's three plank examples.
    expect(SEATS_PER_LIFT, "seats per lift, deck to keel").toEqual([
      3, 4, 3, 4, 3, 3, 2,
    ]);
    expect(plankWords(1), "sprint 1's plank").toBe(
      "Lift 6 of 7 from the deck, plank 2 of 3 from the stern. It replaced an original plank, now in the ghost hull. Sprint 24 has since replaced it.",
    );
    expect(plankWords(13), "sprint 13's plank").toBe(
      "Lift 7 of 7 from the deck, plank 2 of 2 from the stern. It replaced an original plank, now in the ghost hull.",
    );
    expect(plankWords(24), "sprint 24's plank").toBe(
      "Lift 6 of 7 from the deck, plank 2 of 3 from the stern. It replaced sprint 1's plank. The original is in the ghost hull, numbered 1.",
    );
    const approved: Record<number, string | undefined> = {};
    const sized: Record<number, string | undefined> = {};
    for (const entry of VALID) {
      const n = entry.sprint;
      await open(page, recordOf(n), 1440);
      const record = await readRecord(page);
      const where = `/log/${n}`;
      expect.soft(record.sections, `record sections on ${where}`).toBe(1);
      expect
        .soft(record.ps, `the record's "Rev ${n}" on ${where}`)
        .toContain(`Rev ${n}`);
      expect
        .soft(record.h2s, `the record's h2 on ${where}`)
        .toEqual([{ id: "record", text: entry.goal }]);
      expect
        .soft(record.pairs, `the record's dl on ${where}`)
        .toEqual(recordPairs(entry));
      const placed = await page.evaluate(
        ({ record, every }) => {
          const section = document.querySelector(record);
          const count = document.querySelector("main p[data-ghost-count]");
          const table = document.querySelector(every);
          const follows = (a: Element | null, b: Element | null) =>
            Boolean(
              a &&
                b &&
                a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
            );
          return follows(count, section) && follows(section, table);
        },
        { record: RECORD, every: EVERY },
      );
      expect
        .soft(
          placed,
          `on ${where} the record follows the count line and precedes Every revision`,
        )
        .toBe(true);
      const pairs = Object.fromEntries(record.pairs);
      approved[n] = pairs.Approved;
      sized[n] = pairs.Size;
    }
    // Anchors, from history: the owner decided 1, 2, 7, 9 and 10 among sprints 1 to 11.
    expect(
      Object.entries(approved)
        .filter(([n, cell]) => Number(n) <= 11 && cell === "Owner")
        .map(([n]) => Number(n))
        .sort((a, b) => a - b),
      "Approved Owner on revisions 1 to 11",
    ).toEqual([1, 2, 7, 9, 10]);
    expect(sized[11], "revision 11's size (S)").toBe("Small");
    expect(sized[1], "revision 1's size (M)").toBe("Medium");
    expect(sized[7], "revision 7's size (L)").toBe("Large");
  });

  test("B5.6 (C4.3) a record's pull request link: its words, the repository's pull, 24 px tall, in --foreground, at 320, 390 and 1440 in both schemes", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(entryOf(11)?.pr, "the oracle's pull request for sprint 11").toBe(36);
    for (const scheme of SCHEMES) {
      for (const width of [320, 390, 1440]) {
        for (const n of [...SAMPLES, 11]) {
          await open(page, recordOf(n), width, scheme);
          const ink = await tokenRgba(page, "--foreground");
          const links = await page.evaluate((record) => {
            const rgba = (
              window as Window & { __rgba?: (c: string) => number[] | null }
            ).__rgba;
            return [...document.querySelectorAll(`${record} dl a`)].map(
              (a) => ({
                text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
                href: a.getAttribute("href"),
                height: a.getBoundingClientRect().height,
                color: rgba ? rgba(getComputedStyle(a).color) : null,
              }),
            );
          }, RECORD);
          const pr = entryOf(n)?.pr;
          const where = `/log/${n}, ${width} px, ${scheme}`;
          expect
            .soft(
              links.map(({ text, href }) => ({ text, href })),
              `the links in the record's dl, ${where}`,
            )
            .toEqual(
              pr ? [{ text: `Pull request #${pr}`, href: prHref(pr) }] : [],
            );
          for (const link of links) {
            expect
              .soft(link.height, `the PR link's height, ${where}`)
              .toBeGreaterThanOrEqual(24 - 0.05);
            expect
              .soft(
                sameColor(link.color, ink),
                `the PR link's colour is --foreground, ${where}`,
              )
              .toBe(true);
          }
        }
      }
    }
    await open(page, recordOf(11), 1440);
    expect(
      (await readRecord(page)).links.filter((link) =>
        link.href?.startsWith(REPO),
      ),
      "sprint 11's pull request link",
    ).toEqual([
      {
        text: "Pull request #36",
        href: "https://github.com/nycruslan/theseus-portfolio/pull/36",
      },
    ]);
  });

  test("B5.6 (C4.4) no status label: not 'Merged', 'Shipped' or 'Failed' outside the crew's own words, on /log and every record", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const goals = VALID.map((entry) => entry.goal);
    const pages: [string, string[]][] = [
      [LOG, goals],
      ...VALID.map((entry): [string, string[]] => [
        recordOf(entry.sprint),
        [...goals, ...shown(entry)],
      ]),
    ];
    for (const [url, own] of pages) {
      await open(page, url, 1440);
      // What is left once the goals and the items are taken out is the page's own words.
      let rest = squash(await page.locator("body").innerText());
      for (const words of [...own].sort((a, b) => b.length - a.length)) {
        rest = rest.replaceAll(squash(words), " ");
      }
      expect
        .soft(
          rest.match(/\b(?:merged|shipped|failed)\b/gi) ?? [],
          `status words in ${url}'s own words`,
        )
        .toEqual([]);
    }
  });

  test("B5.6 (C5.1) what went wrong: an h3 and its list exactly when the entry has items, up to three, in the file's order, whole", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const counts: Record<number, number> = {};
    for (const entry of VALID) {
      await open(page, recordOf(entry.sprint), 1440);
      const record = await readRecord(page);
      const where = `/log/${entry.sprint}`;
      const wanted = shown(entry);
      counts[entry.sprint] = record.items.length;
      if (wanted.length === 0) {
        expect.soft(record.h3s, `h3 of ${where}`).toEqual([]);
        expect.soft(record.lists, `lists of ${where}`).toBe(0);
        continue;
      }
      expect.soft(record.h3s, `h3 of ${where}`).toEqual([WRONG]);
      expect.soft(record.lists, `lists of ${where}`).toBe(1);
      expect
        .soft(record.items, `items of ${where} (min(3, the file's))`)
        .toEqual(wanted);
    }
    // Anchors, from history: sprint 11 has two items, and every sprint from 1 to 11 has 1 to 3.
    expect(counts[11], "items shown for sprint 11").toBe(2);
    for (let n = 1; n <= 11; n++) {
      expect(counts[n], `items shown for sprint ${n}`).toBeGreaterThanOrEqual(
        1,
      );
      expect(counts[n], `items shown for sprint ${n}`).toBeLessThanOrEqual(3);
    }
  });

  test("B5.6 (C5.2) nothing in a record or the table is truncated, collapsed or hidden, at 320 and 1440", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    for (const width of [320, 1440]) {
      for (const n of SAMPLES) {
        await open(page, recordOf(n), width);
        const found = await page.evaluate(
          ({ record, items, rows }) => {
            const main = document.querySelector("main") ?? document.body;
            const section = document.querySelector(record);
            const own = new Set(["SCRIPT", "TEMPLATE", "STYLE"]);
            const inRecord = [...(section?.querySelectorAll("*") ?? [])].filter(
              (el) => !own.has(el.tagName),
            );
            const inTable = [...document.querySelectorAll(`${rows} *`)];
            const name = (el: Element) =>
              `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`;
            const lis = [...document.querySelectorAll(items)];
            return {
              // Sprint 33's amendment 1: the motion control's buttons are in main below 768 px,
              // and a button group is no disclosure, so main is counted without [data-motion].
              controls: [
                ...main.querySelectorAll(
                  "details, summary, button, [aria-expanded]",
                ),
              ].filter((el) => !el.closest("[data-motion]")).length,
              hidden: inRecord
                .filter(
                  (el) =>
                    el.hasAttribute("hidden") ||
                    getComputedStyle(el).display === "none",
                )
                .map(name),
              clipped: [...inRecord, ...inTable]
                .filter((el) => {
                  const style = getComputedStyle(el);
                  const clamp = style.getPropertyValue("-webkit-line-clamp");
                  return (
                    // An ellipsis shows only where the box clips its overflow.
                    (style.textOverflow === "ellipsis" &&
                      style.overflowX !== "visible") ||
                    (clamp !== "none" && clamp !== "")
                  );
                })
                .map(name),
              notVisible: lis
                .filter(
                  (li) =>
                    !li.checkVisibility({
                      opacityProperty: true,
                      visibilityProperty: true,
                      contentVisibilityAuto: true,
                    }),
                )
                .map(name),
              scrolls: lis
                .filter((li) => li.scrollHeight !== li.clientHeight)
                .map(name),
              endings: [
                ...(section?.querySelectorAll("h2, li") ?? []),
                ...document.querySelectorAll(`${rows} > td:first-of-type`),
              ]
                .map((el) => (el.textContent ?? "").trim())
                .filter((text) => /(…|\.\.\.)$/.test(text)),
            };
          },
          { record: RECORD, items: ITEMS, rows: ROWS },
        );
        const at = `on /log/${n} at ${width} px`;
        expect(
          found.controls,
          `details, summary, button, [aria-expanded] in main ${at}`,
        ).toBe(0);
        expect(found.hidden, `hidden elements in the record ${at}`).toEqual([]);
        expect(found.clipped, `ellipsis or line-clamp ${at}`).toEqual([]);
        expect(found.notVisible, `items that are not visible ${at}`).toEqual(
          [],
        );
        expect(
          found.scrolls,
          `items whose scrollHeight differs from clientHeight ${at}`,
        ).toEqual([]);
        const entry = entryOf(n);
        const sourceEllipses = [
          ...(entry ? [entry.goal, ...shown(entry)] : []),
          ...VALID.map((e) => e.goal),
        ].filter((text) => /(…|\.\.\.)$/.test(text));
        expect(
          found.endings.map(squash),
          `text ending in an ellipsis ${at} (the source's own: ${sourceEllipses.length})`,
        ).toEqual(sourceEllipses.map(squash));
      }
    }
  });

  test("B5.6 (C5.3) no outcome, no evidence and no backtick on /log or a record, and no link but the bar's, the record's and the table's", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const table = MERGED.map((entry) => recordOf(entry.sprint));
    const bar = ["#main", "/", ...BAR.map((link) => link.href)];
    for (const entry of [undefined, ...VALID]) {
      const url = entry ? recordOf(entry.sprint) : LOG;
      await open(page, url, 1440);
      const found = await page.evaluate(() => ({
        text: document.querySelector("main")?.textContent ?? "",
        hrefs: [...document.querySelectorAll("a")].map((a) =>
          a.getAttribute("href"),
        ),
      }));
      const text = squash(found.text);
      const own = [...VALID.map((e) => e.goal), ...(entry ? shown(entry) : [])];
      // Only more than two words: a one-word outcome ("merged") would match any goal that has it.
      const leaked = (entry ? entry.unshown : MERGED.flatMap((e) => e.unshown))
        .flatMap((raw) => [squash(raw), squash(raw.replaceAll("`", ""))])
        .filter((string) => string.split(" ").length > 2)
        .filter(
          (string) =>
            text.includes(string) &&
            !own.some((shownText) => shownText.includes(string)),
        );
      expect
        .soft(leaked, `outcome or evidence strings in main on ${url}`)
        .toEqual([]);
      expect
        .soft(found.text.includes("`"), `a backtick in main on ${url}`)
        .toBe(false);
      const allowed = new Set([
        ...bar,
        ...table,
        ...(entry ? [LOG] : []),
        ...(entry?.pr ? [prHref(entry.pr)] : []),
      ]);
      expect
        .soft(
          found.hrefs.filter((href) => !href || !allowed.has(href)),
          `links on ${url} other than the bar's, the record's and the table's`,
        )
        .toEqual([]);
    }
  });

  test("B5.6 each record's Close, previous and next follow the data rules, and its row's link is the current page", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await open(page, LOG, 1440);
    expect
      .soft(
        (await readRows(page))
          .filter((row) => row.current !== null)
          .map((row) => row.number),
        "rows marked aria-current on /log",
      )
      .toEqual([]);
    for (const entry of VALID) {
      const n = entry.sprint;
      const { previous, next } = neighbours(n);
      await open(page, recordOf(n), 1440);
      const where = `/log/${n}`;
      const wanted = [
        { href: LOG, name: `Close revision ${n}` },
        ...(previous
          ? [{ href: recordOf(previous), name: `Rev ${previous}` }]
          : []),
        ...(next ? [{ href: recordOf(next), name: `Rev ${next}` }] : []),
      ];
      const links = (await readRecord(page)).links
        .map((link) => link.href)
        .filter((href) => !href?.startsWith(REPO));
      expect
        .soft(
          [...links].sort(),
          `the record's links but its pull request, on ${where}`,
        )
        .toEqual(wanted.map((link) => link.href).sort());
      for (const link of wanted) {
        const found = page.locator(`${RECORD} a[href="${link.href}"]`);
        await expect.soft(found, `${link.name} on ${where}`).toHaveCount(1);
        await expect
          .soft(
            found.first(),
            `the name of the link to ${link.href} on ${where}`,
          )
          .toHaveAccessibleName(link.name);
      }
      expect
        .soft(
          (await readRows(page))
            .filter((row) => row.current !== null)
            .map((row) => [row.number, row.current]),
          `rows marked aria-current on ${where}`,
        )
        .toEqual([[n, "page"]]);
    }
  });

  for (const scheme of SCHEMES) {
    test(`B5.6 (C8.2) at 320 a record's pull request link stays on one line (${scheme})`, async ({
      page,
    }) => {
      for (const n of SAMPLES) {
        await open(page, recordOf(n), 320, scheme);
        const lines = await page.evaluate(
          (record) =>
            [...document.querySelectorAll(`${record} dl a`)].map((a) => {
              const range = document.createRange();
              range.selectNodeContents(a);
              return new Set(
                [...range.getClientRects()].map((r) => Math.round(r.top)),
              ).size;
            }),
          RECORD,
        );
        expect
          .soft(lines.length, `PR links on /log/${n}`)
          .toBe(entryOf(n)?.pr ? 1 : 0);
        for (const count of lines) {
          expect
            .soft(count, `lines of /log/${n}'s PR link at 320 (${scheme})`)
            .toBe(1);
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------
// B5.7 Back closes what opened

/** "in view" when the element is wholly inside the viewport and clear of a sticky bar. */
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

for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  test(`B5.7 Back closes what opened: the tenth row's record opens with its h2 in view, Back returns to /log with that row in view, and Close lands on /log (${width} x ${height})`, async ({
    page,
  }) => {
    await open(page, LOG, width, undefined, height);
    const n = (await readRows(page))[9]?.number ?? Number.NaN;
    expect(n, "the tenth row's revision").toBe(VALID[9]?.sprint);
    const row = page.locator(ROWS).nth(9);
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await row.locator('th[scope="row"] a').click();
    await page.waitForURL((url) => url.pathname === recordOf(n));
    await expect
      .poll(() => inView(page, `${RECORD} h2`), `the record's h2 on /log/${n}`)
      .toBe("in view");

    await page.goBack();
    await page.waitForURL((url) => url.pathname === LOG);
    await expect
      .poll(
        () => inView(page, `${EVERY} tbody tr:has(a[href="${recordOf(n)}"])`),
        `revision ${n}'s row after Back`,
      )
      .toBe("in view");

    await page.goForward();
    await page.waitForURL((url) => url.pathname === recordOf(n));
    await page.locator(`${RECORD} a[href="${LOG}"]`).click();
    await page.waitForURL((url) => url.pathname === LOG);
    await expect(page.locator("h1"), "the page after Close").toHaveText("Log");
  });
}
