import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  PROJECTS,
  type Rgb,
  resolveColors,
  SCHEMES,
  withLink,
} from "./helpers";

// Sprint 14, PR B of the build log: the home line, "Build log · N sprints", under the bio on `/`.
// The checks are C14.1 to C14.6 and C15 of .crew/sprint/12/contract.md ("PR B: the way in"), one
// test per number, written before the build. The notes (how each is read, what is not covered) are
// in .crew/sprint/14/specs-probe.md.
//
// The oracle. `n` is never a literal: it is the number of valid retro files in the checkout under
// test, counted here with a few lines of this spec's own (the contract's data rules, not the
// reader), and every check also reads the number of entries `/sprints` renders and requires the
// three to agree. So the checks stay true as sprints are added. The floor of 11 and the anchors
// of sprint 12's contract pin the oracle itself.

const HOME_LINK = 'main > header a[href="/sprints"]';
const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");
const ENTRIES = "main section ol > li";
const HEIGHT = 900;
/** The measurements below come from layout; one px either way is the contract's tolerance. */
const TOLERANCE = 1;
/** U+00A0, the no-break space of the data rules: the dot never starts a line. */
const NBSP = "\u00a0";

type Scheme = (typeof SCHEMES)[number];

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
/** What the span says after the no-break space and the dot, for n entries. */
const countWords = (n: number) => `${n} ${n === 1 ? "sprint" : "sprints"}`;
const lineSpan = (n: number) => `${NBSP}· ${countWords(n)}`;

// ---------------------------------------------------------------------------------------------
// Shared helpers

async function openHome(page: Page, width: number, scheme?: Scheme) {
  if (scheme) await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width, height: HEIGHT });
  const response = await page.goto("/");
  expect(response?.status(), "status of /").toBe(200);
}

/** The number of entries `/sprints` renders: what the home line has to say. */
async function entriesOnSprints(page: Page) {
  const response = await page.goto("/sprints");
  expect(response?.status(), "status of /sprints").toBe(200);
  return page.locator(ENTRIES).count();
}

/** The home line as the DOM has it, read in one go. */
async function readLine(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("main > header");
    const last = header?.lastElementChild ?? null;
    const link = last?.querySelector(':scope > a[href="/sprints"]') ?? null;
    const span = last?.querySelector(":scope > span") ?? null;
    return {
      tag: last?.tagName ?? null,
      hasStep: last?.classList.contains("text-step-base") ?? false,
      children: [...(last?.children ?? [])].map((el) => el.tagName),
      linkText: link?.textContent ?? null,
      linkIsFirst: link !== null && last?.firstElementChild === link,
      spanText: span?.textContent ?? null,
      spanIsLast: span !== null && last?.lastElementChild === span,
      lineText: last?.textContent ?? null,
    };
  });
}

/** Waits out clock animations (a ring may fade in), and two frames for a scroll Tab caused. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.timeline === document.timeline)
        .map((animation) => animation.finished),
    );
    for (let frame = 0; frame < 2; frame++) {
      await new Promise((done) => requestAnimationFrame(done));
    }
  });
}

function near(actual: number, expected: number, what: string) {
  expect
    .soft(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`)
    .toBeLessThanOrEqual(TOLERANCE);
}

// ---------------------------------------------------------------------------------------------
// C14. The home line

test.describe("C14. The home line", () => {
  test("C14.1 the header ends with a p holding 'Build log' and a span of nbsp, a dot and the count, which the files and /sprints agree on", async ({
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

    // Both ends: the files, /sprints and the home line say the same number.
    const onSprints = await entriesOnSprints(page);
    expect(
      onSprints,
      "entries /sprints renders, against valid retro files",
    ).toBe(n);

    const checkLine = async (how: string, target: Page) => {
      const line = await readLine(target);
      expect.soft(line.tag, `the header's last child (${how})`).toBe("P");
      expect
        .soft(line.hasStep, `that p has class text-step-base (${how})`)
        .toBe(true);
      expect
        .soft(line.children, `that p's children (${how})`)
        .toEqual(["A", "SPAN"]);
      expect.soft(line.linkIsFirst, `the link comes first (${how})`).toBe(true);
      expect.soft(line.spanIsLast, `the span comes last (${how})`).toBe(true);
      expect.soft(line.linkText, `the link's text (${how})`).toBe("Build log");
      // The escape matters: an ordinary space would let the dot start a line.
      expect
        .soft(line.spanText, `the span's text (${how}), n = ${n}`)
        .toBe(lineSpan(n));
      expect
        .soft(line.spanText?.charCodeAt(0), `first character (${how})`)
        .toBe(0xa0);
      expect
        .soft(line.lineText, `the whole line (${how})`)
        .toBe(`Build log${lineSpan(n)}`);
    };

    await openHome(page, 1440);
    await checkLine("scripts on", page);

    // With scripts off the server HTML already holds the line.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const bare = await context.newPage();
    const response = await bare.goto("/");
    expect(response?.status(), "status of / with scripts off").toBe(200);
    await checkLine("scripts off", bare);
    await context.close();
  });

  for (const scheme of SCHEMES) {
    test(`C14.2 the link is accent and underlined like the Contact links, the span is muted, 24 px tall at 320 and 390 (${scheme})`, async ({
      page,
    }) => {
      for (const width of [320, 390]) {
        await openHome(page, width, scheme);
        const colors = await resolveColors(page);
        const found = await page.evaluate(
          ({ home, contact }) => {
            const style = (el: Element | null) => {
              if (!el) return null;
              const s = getComputedStyle(el);
              return {
                color: s.color,
                textDecorationLine: s.textDecorationLine,
                textUnderlineOffset: s.textUnderlineOffset,
                display: s.display,
                height: el.getBoundingClientRect().height,
              };
            };
            const link = document.querySelector(home);
            return {
              link: style(link),
              span: style(link?.nextElementSibling ?? null),
              contact: style(document.querySelector(contact)),
            };
          },
          {
            home: HOME_LINK,
            contact: 'main section[aria-labelledby="contact"] a',
          },
        );
        const where = `${width} px, ${scheme}`;
        expect(found.link, `the home link exists (${where})`).not.toBeNull();
        expect(
          found.contact,
          `a Contact link exists (${where})`,
        ).not.toBeNull();
        expect(found.link?.color, `link colour is --accent (${where})`).toBe(
          colors["--accent"]?.computed,
        );
        expect(
          found.link?.textDecorationLine,
          `link is underlined (${where})`,
        ).toContain("underline");
        expect(found.span?.color, `span colour is --muted (${where})`).toBe(
          colors["--muted"]?.computed,
        );
        expect(
          found.link?.height ?? 0,
          `link height (${where})`,
        ).toBeGreaterThanOrEqual(24 - 0.05);
        // The Contact links' classes, compared by what they compute.
        for (const key of [
          "color",
          "textDecorationLine",
          "textUnderlineOffset",
          "display",
        ] as const) {
          expect(
            found.link?.[key],
            `${key} of the home link against a Contact link (${where})`,
          ).toBe(found.contact?.[key]);
        }
      }
    });
  }

  test("C14.3 the line follows the bio and changes nothing above it", async ({
    page,
  }) => {
    await openHome(page, 1440);
    const found = await page.evaluate(() => {
      const header = document.querySelector("main > header");
      const children = [...(header?.children ?? [])];
      return {
        tags: children.map((el) => el.tagName),
        texts: children.map((el) => el.textContent ?? ""),
        heroIsNext: header?.nextElementSibling?.matches("[data-hero]") ?? false,
        heroCount: document.querySelectorAll("[data-hero]").length,
        projectHrefs: [
          ...document.querySelectorAll(
            'main section[aria-labelledby="projects"] a',
          ),
        ].map((a) => a.getAttribute("href")),
      };
    });
    // The owner's four, then the new line, nothing in between and nothing after.
    expect(found.tags, "the header's children").toEqual([
      "H1",
      "P",
      "P",
      "P",
      "P",
    ]);
    expect(
      found.texts.slice(0, 4),
      "the owner's text, from content/profile.ts",
    ).toEqual([profile.name, profile.headline, profile.location, profile.bio]);
    expect(found.heroCount, "[data-hero] elements").toBe(1);
    expect(found.heroIsNext, "[data-hero] is the header's next sibling").toBe(
      true,
    );
    expect(found.projectHrefs, "the project cards' links").toEqual(
      withLink.map((project) => project.href),
    );
  });

  test("C14.4 the hull stays above the fold at 390 x 844 and stands 64 px below the header at 320, 390 and 1440", async ({
    page,
  }) => {
    // Measured on the build before this sprint (no home line), headless Chromium 141 in the cloud
    // (CI's is 156, so text may wrap a px differently): at 390 x 844 the header ends at 473.98 and
    // the [data-hero] box's top is 537.98, 99 px tall. The line adds its own height (27 px) and
    // the header's 16 px gap, so the top is expected near 538 + 43 = 581, whatever the fold, and
    // never a second line more.
    const BEFORE_TOP = 537.98;
    const ADDED = 27 + 16;
    await page.emulateMedia({ reducedMotion: "reduce" });

    const read = () =>
      page.evaluate(() => {
        const box = (el: Element | null | undefined) => {
          const r = el?.getBoundingClientRect();
          return r ? { top: r.top, bottom: r.bottom, height: r.height } : null;
        };
        const header = document.querySelector("main > header");
        return {
          header: box(header),
          bio: box(header?.children[3]),
          line: box(header?.lastElementChild),
          link: box(document.querySelector('main > header a[href="/sprints"]')),
          hero: box(document.querySelector("[data-hero]")),
          innerHeight,
          // The p's height over its own line height: how many lines the text took.
          lines: header?.lastElementChild
            ? Math.round(
                header.lastElementChild.getBoundingClientRect().height /
                  Number.parseFloat(
                    getComputedStyle(header.lastElementChild).lineHeight,
                  ),
              )
            : 0,
        };
      });

    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const g = await read();
      const where = `${width} x ${height}`;
      expect(g.link, `the home link exists (${where})`).not.toBeNull();
      expect(g.hero && g.header && g.line, `boxes (${where})`).toBeTruthy();
      if (!g.hero || !g.header || !g.line || !g.bio) continue;
      near(g.hero.top - g.header.bottom, 64, `header to the hull (${where})`);
      // Inside the header, one gap below the bio, so nothing above it moved apart.
      near(g.line.top - g.bio.bottom, 16, `bio to the home line (${where})`);
      expect
        .soft(g.header.bottom, `the line is inside the header (${where})`)
        .toBeGreaterThanOrEqual(g.line.bottom - TOLERANCE);
      expect.soft(g.lines, `lines of the home line (${where})`).toBe(1);
      if (width === 390) {
        expect(
          g.hero.top,
          `the hull box's top edge, ${where} (before the line: ${BEFORE_TOP})`,
        ).toBeLessThan(g.innerHeight);
        expect(
          g.hero.top,
          `the hull box's top only moves by the line and its gap, ${where} (before the line: ${BEFORE_TOP})`,
        ).toBeLessThanOrEqual(BEFORE_TOP + ADDED + 3);
        expect(
          g.hero.top,
          `the hull box's top is below where it was, ${where} (before the line: ${BEFORE_TOP})`,
        ).toBeGreaterThan(BEFORE_TOP + 16);
      }
    }
  });

  for (const scheme of SCHEMES) {
    test(`C14.5 Tab visits the skip link, then the home link, then the first project link, one ring each (${scheme})`, async ({
      page,
    }) => {
      await openHome(page, 1440, scheme);
      const colors = await resolveColors(page);
      const tokenRgba = new Map(
        Object.values(colors).map((c) => [c.computed, c.rgba] as const),
      );
      const [r = 0, g = 0, b = 0] = colors["--background"]?.rgba ?? [];
      const background: Rgb = [r, g, b];

      const firstProject = await page
        .locator(`${PROJECTS} a`)
        .first()
        .getAttribute("href");
      expect(firstProject, "the first project link").toBe(withLink[0]?.href);
      const wanted = ["#main", "/sprints", firstProject];

      const stops: (string | null)[] = [];
      for (let presses = 0; presses < wanted.length; presses++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (el?.tagName !== "A") return null;
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          // Every element that draws an outline: a stop has exactly one ring, on itself or on its card.
          const rings = [...document.querySelectorAll("body *")]
            .filter((node) => {
              const s = getComputedStyle(node);
              return (
                s.outlineStyle !== "none" &&
                Number.parseFloat(s.outlineWidth) > 0
              );
            })
            .map((node) => node.tagName.toLowerCase());
          return {
            href: el.getAttribute("href"),
            seen:
              el.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) &&
              box.width > 1 &&
              box.height > 1 &&
              box.right > 0 &&
              box.bottom > 0 &&
              box.left < innerWidth &&
              box.top < innerHeight,
            style: style.outlineStyle,
            width: Number.parseFloat(style.outlineWidth),
            color: style.outlineColor,
            offset: Number.parseFloat(style.outlineOffset),
            rings,
          };
        });
        stops.push(stop?.href ?? null);
        if (!stop) continue;
        expect
          .soft(stop.seen, `${stop.href} can be seen when focused`)
          .toBe(true);
        expect
          .soft(
            stop.rings,
            `elements with a ring while ${stop.href} is focused`,
          )
          .toHaveLength(1);
        // The home link draws its own ring; a project card draws it on the plank.
        if (stop.href === "/sprints") {
          const rgba = tokenRgba.get(stop.color);
          expect
            .soft(
              ["none", "hidden"].includes(stop.style),
              `the home link's ring style ${stop.style}`,
            )
            .toBe(false);
          expect
            .soft(stop.width, "the home link's ring width")
            .toBeGreaterThanOrEqual(2);
          expect
            .soft(rgba, `the home link's ring colour ${stop.color} is a token`)
            .toBeTruthy();
          expect
            .soft(stop.offset, "the home link's ring offset")
            .toBeGreaterThanOrEqual(0);
          if (rgba) {
            expect
              .soft(
                contrast(composite(rgba, background), background),
                "the home link's ring contrast",
              )
              .toBeGreaterThanOrEqual(3);
          }
        }
      }
      expect(
        stops,
        `Tab order: skip link, home link, first project (${scheme})`,
      ).toEqual(wanted);
    });
  }

  test("C14.6 the page still has its five sections in order, and no other link to /sprints", async ({
    page,
  }) => {
    await openHome(page, 1440);
    const found = await page.evaluate(() => ({
      sections: [...document.querySelectorAll("main section")].map(
        (s) => s.getAttribute("aria-labelledby") ?? "",
      ),
      directChildren: [...(document.querySelector("main")?.children ?? [])].map(
        (el) => el.tagName,
      ),
      links: [...document.querySelectorAll("a")]
        .filter((a) =>
          /^\/sprints(?:[/?#]|$)/.test(a.getAttribute("href") ?? ""),
        )
        .map((a) => ({
          href: a.getAttribute("href"),
          inHeader: Boolean(a.closest("main > header")),
        })),
    }));
    // The order the existing specs require (reveal.spec.ts' sectionIds, profile-sections.spec.ts).
    expect(found.sections, "sections of /").toEqual([
      "experience",
      "projects",
      "stack",
      "education",
      "contact",
    ]);
    expect(
      found.links,
      "links to /sprints on /: one, in the header, nowhere else",
    ).toEqual([{ href: "/sprints", inHeader: true }]);
  });
});

// ---------------------------------------------------------------------------------------------
// C15. Both ends agree

test.describe("C15. Both ends agree", () => {
  for (const width of [390, 1440]) {
    test(`C15 the home line leads to /sprints, its back link leads home, and the count is the entries (${width} px)`, async ({
      page,
    }) => {
      await openHome(page, width);
      const link = page.locator(HOME_LINK);
      await expect(link, "the home link").toHaveCount(1);
      const said = await page.evaluate(
        (selector) =>
          document.querySelector(selector)?.nextElementSibling?.textContent ??
          "",
        HOME_LINK,
      );

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
        lineSpan(entries),
      );
      expect(said, "the count on /, against the valid retro files").toBe(
        lineSpan(VALID.length),
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
