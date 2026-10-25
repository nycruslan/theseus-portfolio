import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { resolveColors, SCHEMES } from "./helpers";

// The way in to the Log from `/`. Sprint 14 built it as the home line, "Build log · N sprints"
// (.crew/sprint/12/contract.md, C14 and C15); sprint 22 (B1) moves it into the sheet's revision
// block as "All N revisions in the Log" (.crew/sprint/22/contract.md, the disposition table), and
// sprint 30 (B5a, .crew/sprint/29/b5-first-contract.md, B5.5) points it at /log, which replaces
// /sprints: this file was sprints-entry.spec.ts, and C14.1, C14.2 and C15 are rewritten onto /log,
// home by the bar's wordmark. The count still has to agree three ways: the retro files, the link
// and /log's rows.
//
// The oracle. `n` is never a literal: it is the number of valid retro files in the checkout under
// test, counted here with a few lines of this spec's own (the contract's data rules, not the
// reader). The floor of 11 and the anchors of sprint 12's contract pin the oracle itself.

const LOG_LINK = 'section[aria-labelledby="revisions"] a[href="/log"]';
const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");
// The revision rows, not the day groups' header rows (sprint 32, B5.17).
const ROWS =
  'section[aria-labelledby="every-revision"] table tbody tr:has(> th[scope="row"])';
const HEIGHT = 900;

// ---------------------------------------------------------------------------------------------
// The oracle: how many retro files are valid

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The folders whose `retro.json` the contract's data rules accept (a wrong one fails the build). */
function validSprints(): number[] {
  const found: number[] = [];
  for (const folder of readdirSync(SPRINT_DIR)) {
    const file = join(SPRINT_DIR, folder, "retro.json");
    if (!/^\d+$/.test(folder) || !existsSync(file)) continue;
    let retro: unknown;
    try {
      retro = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!isRecord(retro)) continue;
    const { sprint, goal } = retro;
    const bare =
      typeof goal === "string"
        ? goal.replace(/^\s*roadmap item(?:\s+\d+)?\s*:\s*/i, "")
        : "";
    if (
      typeof sprint === "number" &&
      Number.isInteger(sprint) &&
      sprint >= 1 &&
      sprint === Number(folder) &&
      bare.replaceAll("`", "").trim() !== ""
    ) {
      found.push(sprint);
    }
  }
  return found;
}

const VALID = validSprints();
/** The link's words for n entries. */
const linkWords = (n: number) => `All ${n} revisions in the Log`;

// ---------------------------------------------------------------------------------------------
// Shared helpers

async function openHome(
  page: Page,
  width: number,
  scheme?: (typeof SCHEMES)[number],
) {
  if (scheme) await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width, height: HEIGHT });
  const response = await page.goto("/");
  expect(response?.status(), "status of /").toBe(200);
}

/** The number of rows `/log` renders: what the link has to say. */
async function rowsOnLog(page: Page) {
  const response = await page.goto("/log");
  expect(response?.status(), "status of /log").toBe(200);
  return page.locator(ROWS).count();
}

/** The revision block's links to /log, as text. */
function readLinks(page: Page) {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].map((a) =>
        (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    LOG_LINK,
  );
}

// ---------------------------------------------------------------------------------------------
// C14. The way in

test.describe("C14. The way in", () => {
  test("B5.5 (C14.1) the revision block's link says 'All N revisions in the Log', and the files and /log agree on N", async ({
    page,
    browser,
  }) => {
    // The anchors: sprints 1 to 11 are history, so the oracle has to see at least those.
    expect(
      VALID,
      "valid retros found in .crew/sprint (at least sprints 1 to 11)",
    ).toEqual(
      expect.arrayContaining(Array.from({ length: 11 }, (_, i) => i + 1)),
    );
    const n = VALID.length;

    // Both ends: the files, /log and the link say the same number.
    const onLog = await rowsOnLog(page);
    expect(onLog, "rows /log renders, against valid retro files").toBe(n);

    await openHome(page, 1440);
    expect
      .soft(await readLinks(page), "the link, scripts on")
      .toEqual([linkWords(n)]);

    // With scripts off the server HTML already holds the link.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const bare = await context.newPage();
    const response = await bare.goto("/");
    expect(response?.status(), "status of / with scripts off").toBe(200);
    expect
      .soft(await readLinks(bare), "the link, scripts off")
      .toEqual([linkWords(n)]);
    await context.close();
  });

  for (const scheme of SCHEMES) {
    test(`B5.5 (C14.2) the link to /log is --foreground and underlined, 24 px tall at 320 and 390 (${scheme})`, async ({
      page,
    }) => {
      for (const width of [320, 390]) {
        await openHome(page, width, scheme);
        const colors = await resolveColors(page);
        const found = await page.evaluate((selector) => {
          const link = document.querySelector(selector);
          if (!link) return null;
          const s = getComputedStyle(link);
          return {
            color: s.color,
            textDecorationLine: s.textDecorationLine,
            height: link.getBoundingClientRect().height,
          };
        }, LOG_LINK);
        const where = `${width} px, ${scheme}`;
        expect(found, `the link exists (${where})`).not.toBeNull();
        expect(found?.color, `link colour is --foreground (${where})`).toBe(
          colors["--foreground"]?.computed,
        );
        expect(
          found?.textDecorationLine,
          `link is underlined (${where})`,
        ).toContain("underline");
        expect(
          found?.height ?? 0,
          `link height (${where})`,
        ).toBeGreaterThanOrEqual(24 - 0.05);
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------
// C15. Both ends agree

test.describe("C15. Both ends agree", () => {
  for (const width of [390, 1440]) {
    test(`B5.5 (C15) the revision block's link leads to /log, the bar's wordmark leads home, and the count is /log's rows (${width} px)`, async ({
      page,
    }) => {
      await openHome(page, width);
      const link = page.locator(LOG_LINK);
      await expect(link, "the revision block's link").toHaveCount(1);
      const said = ((await link.textContent()) ?? "")
        .replace(/\s+/g, " ")
        .trim();

      await link.click();
      await page.waitForURL((url) => url.pathname === "/log");
      await expect(page.locator("h1"), "the page after the click").toHaveText(
        "Log",
      );
      const rows = await page.locator(ROWS).count();
      expect(rows, "rows on /log").toBeGreaterThanOrEqual(VALID.length);
      expect(said, "the count on /, against the rows on /log").toBe(
        linkWords(rows),
      );
      expect(said, "the count on /, against the valid retro files").toBe(
        linkWords(VALID.length),
      );

      const back = page.locator('header:has(nav) a[href="/"]');
      await expect(back, "the bar's wordmark").toHaveCount(1);
      await back.click();
      await page.waitForURL((url) => url.pathname === "/");
      await expect(page.locator("h1"), "the page after going back").toHaveText(
        profile.name,
      );
    });
  }
});
