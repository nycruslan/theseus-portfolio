import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  lineSpan,
  PROJECTS,
  type Rgb,
  resolveColors,
  SCHEMES,
  VALID,
  withLink,
} from "./helpers";

// Sprint 14, PR B of the build log: the home line, "Build log · N sprints", under the bio on `/`.
// The checks are C14.1 to C14.6 and C15 of .studio/sprint/12/contract.md ("PR B: the way in"), one
// test per number, written before the build. The notes (how each is read, what is not covered) are
// in .studio/sprint/14/specs-probe.md.
//
// The oracle. `n` is never a literal: it is the number of valid retro files in the checkout under
// test, counted by e2e/helpers.ts (the contract's data rules, not the
// reader), and every check also reads the number of entries `/sprints` renders and requires the
// three to agree. So the checks stay true as sprints are added. The floor of 11 and the anchors
// of sprint 12's contract pin the oracle itself.

const HOME_LINK = 'main > header a[href="/sprints"]';
const ENTRIES = "main section ol > li";
const HEIGHT = 900;
/** The measurements below come from layout; one px either way is the contract's tolerance. */
const TOLERANCE = 1;

type Scheme = (typeof SCHEMES)[number];

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

/**
 * The home line as the DOM has it, read in one go. Since sprint 16 (B1.3) it is the third cell of
 * the title band, so the line is whatever holds the link and the span: the link's parent.
 */
async function readLine(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector("main > header");
    const link = header?.querySelector('a[href="/sprints"]') ?? null;
    const last = link?.parentElement ?? null;
    const span = last?.querySelector(":scope > span") ?? null;
    const cells = [...(header?.querySelectorAll("[data-hero-cell]") ?? [])];
    return {
      cellIsThird: last !== null && cells[2]?.contains(last) === true,
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

// ---------------------------------------------------------------------------------------------
// C14. The home line

test.describe("C14. The home line", () => {
  test("C14.1 the band's third cell holds 'Build log' and a span of nbsp, a dot and the count, which the files and /sprints agree on", async ({
    page,
    browser,
  }) => {
    // The anchors: sprints 1 to 11 are history, so the oracle has to see at least those.
    expect(
      VALID,
      "valid retros found in .studio/sprint (at least sprints 1 to 11)",
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
      expect
        .soft(line.cellIsThird, `the line is in the band's third cell (${how})`)
        .toBe(true);
      expect
        .soft(line.children, `the line's children (${how})`)
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

  test("C14.3 the line is in the band, before the bio, and changes nothing else of the owner's text", async ({
    page,
  }) => {
    await openHome(page, 1440);
    const found = await page.evaluate((bioText) => {
      const header = document.querySelector("main > header");
      const h1 = header?.querySelector("h1") ?? null;
      const band = header?.querySelector("[data-hero-band]") ?? null;
      const cells = [...(band?.querySelectorAll("[data-hero-cell]") ?? [])];
      const link = header?.querySelector('a[href="/sprints"]') ?? null;
      const hero = header?.querySelector("[data-hero]") ?? null;
      const bio = [...(header?.querySelectorAll("p") ?? [])].find(
        (p) => p.textContent?.trim() === bioText,
      );
      const follows = (a: Element | null, b: Element | null | undefined) =>
        a !== null &&
        b != null &&
        Boolean(
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      return {
        h1Count: header?.querySelectorAll("h1").length ?? 0,
        name: h1?.textContent ?? null,
        cellTexts: cells.map((el) => el.textContent ?? ""),
        lineInThirdCell: link !== null && cells[2]?.contains(link) === true,
        bandAfterName: follows(h1, band),
        lineBeforeBio: follows(link, bio),
        heroCount: document.querySelectorAll("[data-hero]").length,
        heroInHeader: hero !== null,
        heroAfterBand: follows(band, hero),
        projectHrefs: [
          ...document.querySelectorAll(
            'main section[aria-labelledby="projects"] a',
          ),
        ].map((a) => a.getAttribute("href")),
      };
    }, profile.bio);
    // The owner's text, from content/profile.ts, in the order the band sets it: the name, then three
    // cells, the first two the headline and the city.
    expect(found.h1Count, "h1 elements in the header").toBe(1);
    expect(found.name, "the name").toBe(profile.name);
    expect(found.cellTexts, "the band's three cells").toHaveLength(3);
    expect(
      found.cellTexts.slice(0, 2),
      "the first two cells, from content/profile.ts",
    ).toEqual([profile.headline, profile.location]);
    expect(found.lineInThirdCell, "the home line is in the third cell").toBe(
      true,
    );
    expect(found.bandAfterName, "the band follows the name").toBe(true);
    expect(found.lineBeforeBio, "the home line comes before the bio").toBe(
      true,
    );
    expect(found.heroCount, "[data-hero] elements").toBe(1);
    expect(found.heroInHeader, "[data-hero] is inside the header").toBe(true);
    expect(found.heroAfterBand, "[data-hero] comes after the band").toBe(true);
    expect(found.projectHrefs, "the project cards' links").toEqual(
      withLink.map((project) => project.href),
    );
  });

  test("C14.4 the hull stays above the fold at 390 x 844 and the home line stays one line at 320, 390 and 1440", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    const read = () =>
      page.evaluate(() => {
        const box = (el: Element | null | undefined) => {
          const r = el?.getBoundingClientRect();
          return r ? { top: r.top, bottom: r.bottom, height: r.height } : null;
        };
        const header = document.querySelector("main > header");
        const link = header?.querySelector('a[href="/sprints"]') ?? null;
        const cell = link?.closest("[data-hero-cell]") ?? null;
        // Lines of the cell's text: the vertical centres of its inline boxes, a line apart or more.
        // (A block's height over its line height would count the cell's padding.)
        const lineHeight = cell
          ? Number.parseFloat(getComputedStyle(cell).lineHeight)
          : Number.NaN;
        const range = document.createRange();
        if (cell) range.selectNodeContents(cell);
        const centres = [...range.getClientRects()]
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => (r.top + r.bottom) / 2)
          .sort((a, b) => a - b);
        const lines = centres.filter(
          (c, i) => i === 0 || c - (centres[i - 1] ?? 0) > lineHeight * 0.6,
        ).length;
        return {
          header: box(header),
          line: box(link?.parentElement),
          link: box(link),
          hero: box(document.querySelector("[data-hero]")),
          innerHeight,
          lines,
        };
      });

    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const g = await read();
      const where = `${width} x ${height}`;
      expect(g.link, `the home link exists (${where})`).not.toBeNull();
      expect(g.hero && g.header && g.line, `boxes (${where})`).toBeTruthy();
      if (!g.hero || !g.header || !g.line) continue;
      expect
        .soft(g.header.bottom, `the line is inside the header (${where})`)
        .toBeGreaterThanOrEqual(g.line.bottom - TOLERANCE);
      expect.soft(g.lines, `lines of the home line (${where})`).toBe(1);
      if (width === 390) {
        expect(g.hero.top, `the hull box's top edge, ${where}`).toBeLessThan(
          g.innerHeight,
        );
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
