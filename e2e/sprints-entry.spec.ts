import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { resolveColors, SCHEMES } from "./helpers";

// The way in to the build log from `/`. Sprint 14 built it as the home line, "Build log · N
// sprints" (.crew/sprint/12/contract.md, C14 and C15); sprint 22 (B1) moves it into the sheet's
// revision block as "All N revisions in the Log" (.crew/sprint/22/contract.md, the disposition
// table): C14.1, C14.2 and C15 are rewritten onto that link, and C14.3 to C14.6 retire with the
// line. The count still has to agree three ways: the retro files, the link and /sprints.
//
// The oracle. `n` is never a literal: it is the number of valid retro files in the checkout under
// test, counted here with a few lines of this spec's own (the contract's data rules, not the
// reader). The floor of 11 and the anchors of sprint 12's contract pin the oracle itself.

const LOG_LINK = 'section[aria-labelledby="revisions"] a[href="/sprints"]';
const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");
const ENTRIES = "main section ol > li";
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

/** The number of entries `/sprints` renders: what the link has to say. */
async function entriesOnSprints(page: Page) {
  const response = await page.goto("/sprints");
  expect(response?.status(), "status of /sprints").toBe(200);
  return page.locator(ENTRIES).count();
}

/** The revision block's links to /sprints, as text. */
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
  test("C14.1 the revision block's link says 'All N revisions in the Log', and the files and /sprints agree on N", async ({
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

    // Both ends: the files, /sprints and the link say the same number.
    const onSprints = await entriesOnSprints(page);
    expect(
      onSprints,
      "entries /sprints renders, against valid retro files",
    ).toBe(n);

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
    test(`C14.2 the link is --foreground and underlined, 24 px tall at 320 and 390 (${scheme})`, async ({
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
    test(`C15 the revision block's link leads to /sprints, its back link leads home, and the count is the entries (${width} px)`, async ({
      page,
    }) => {
      await openHome(page, width);
      const link = page.locator(LOG_LINK);
      await expect(link, "the revision block's link").toHaveCount(1);
      const said = ((await link.textContent()) ?? "")
        .replace(/\s+/g, " ")
        .trim();

      await link.click();
      await page.waitForURL("**/sprints");
      await expect(page.locator("h1"), "the page after the click").toHaveText(
        "Build log",
      );
      const entries = await page.locator(ENTRIES).count();
      expect(entries, "entries on /sprints").toBeGreaterThanOrEqual(
        VALID.length,
      );
      expect(said, "the count on /, against the entries on /sprints").toBe(
        linkWords(entries),
      );
      expect(said, "the count on /, against the valid retro files").toBe(
        linkWords(VALID.length),
      );

      const back = page.locator('main > header a[href="/"]');
      await expect(back, "the back link").toHaveCount(1);
      await back.click();
      await page.waitForURL((url) => url.pathname === "/");
      await expect(page.locator("h1"), "the page after going back").toHaveText(
        profile.name,
      );
    });
  }
});
