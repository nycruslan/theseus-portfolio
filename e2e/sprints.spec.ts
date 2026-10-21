import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import {
  composite,
  contrast,
  horizontalOverflow,
  parseColor,
  type Rgb,
  resolveColors,
  resolveSteps,
  SCHEMES,
  textStyles,
} from "./helpers";

// Sprint 13, PR A of the build log: the /sprints route and the reader behind it. The checks are
// C1 to C12 of .crew/sprint/12/contract.md ("PR A: the route"), one describe per number, written
// before the build. The reader's interface, which C12 holds Forge to, is in
// .crew/sprint/13/probe-checks.md.
//
// The oracle. Every expected value comes from the retro files in the checkout under test, read
// and judged by `readOracle` below with a few lines of this spec's own, never by importing the
// reader. So the checks stay true as sprints are added, and a preview that carries its own sprint's
// retro passes like production. No check holds the number of entries; the floor is 11 and the
// anchors (sprints 1 to 11, whose retros are history) pin the oracle itself.

const SPRINTS = "/sprints";
// A fixed fact of the team, not the owner's: the repository the pull requests live in.
const REPO = "https://github.com/nycruslan/theseus-portfolio";
const SPRINT_DIR = join(process.cwd(), ".crew", "sprint");
/** The entries: the `ol`'s own items, never the `li` of an entry's list. */
const ENTRIES = "main section ol > li";
const WIDTHS = [320, 390, 768, 1024, 1440] as const;
const HEIGHT = 900;
// WCAG 2.2 A and AA, and axe's best practices (the same set as invariants.spec.ts).
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];
/** The measurements below are in px from layout; one px either way is the contract's tolerance. */
const TOLERANCE = 1;

type Scheme = (typeof SCHEMES)[number];

// ---------------------------------------------------------------------------------------------
// The oracle: the retro files, judged by the contract's data rules

type Expected = {
  sprint: number;
  /** The goal as the page shows it: prefix and trailing size tag removed, backticks dropped, first letter capitalised. */
  goal: string;
  size?: "S" | "M" | "L";
  pr?: number;
  ownersCall: boolean;
  /** Every kept item, as shown: backticks dropped, whitespace normalised. The page shows three. */
  items: string[];
  outcome?: string;
  /** Every `evidence` string in the file, for the "never rendered" scan. */
  evidence: string[];
};

const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const noTicks = (text: string) => text.replaceAll("`", "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Contract, "Order and presentation": prefix off, backticks off, a trailing size tag off (a final
 * parenthetical holding only S, M or L, with the whitespace before it; any other parenthetical
 * stays), first letter capitalised.
 */
function presentGoal(goal: string) {
  const bare = noTicks(goal.replace(/^\s*roadmap item(?:\s+\d+)?\s*:\s*/i, ""))
    .trim()
    .replace(/\s*\(\s*[SML]\s*\)$/i, "")
    .trim();
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** The `what` of each item the page may show: a string, or an object with a string `what`. */
function itemTexts(retro: Record<string, unknown>) {
  const list = Array.isArray(retro.wentWrong)
    ? retro.wentWrong
    : Array.isArray(retro.went_wrong)
      ? retro.went_wrong
      : [];
  return list.flatMap((item: unknown) => {
    if (typeof item === "string") return [item];
    return isRecord(item) && typeof item.what === "string" ? [item.what] : [];
  });
}

function evidenceStrings(retro: Record<string, unknown>) {
  const list = Array.isArray(retro.wentWrong)
    ? retro.wentWrong
    : Array.isArray(retro.went_wrong)
      ? retro.went_wrong
      : [];
  const strings = list.flatMap((item: unknown) =>
    isRecord(item) && typeof item.evidence === "string" ? [item.evidence] : [],
  );
  return typeof retro.evidence === "string"
    ? [...strings, retro.evidence]
    : strings;
}

/** Newest first. A file that is wrong is left out here; the build fails on it (C12 shows that). */
function readOracle(): Expected[] {
  const found: Expected[] = [];
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
    const { sprint, goal, size, pr, outcome } = retro;
    if (
      typeof sprint !== "number" ||
      !Number.isInteger(sprint) ||
      sprint < 1 ||
      sprint !== Number(folder) ||
      typeof goal !== "string" ||
      presentGoal(goal) === ""
    ) {
      continue;
    }
    found.push({
      sprint,
      goal: presentGoal(goal),
      size: size === "S" || size === "M" || size === "L" ? size : undefined,
      pr:
        typeof pr === "number" && Number.isInteger(pr) && pr > 0
          ? pr
          : undefined,
      ownersCall:
        typeof outcome === "string" && /\bneeds-owner\b/i.test(outcome),
      items: itemTexts(retro)
        .map((text) => squash(noTicks(text)))
        .filter((text) => text !== ""),
      outcome: typeof outcome === "string" ? outcome : undefined,
      evidence: evidenceStrings(retro),
    });
  }
  return found.sort((a, b) => b.sprint - a.sprint);
}

const VALID = readOracle();
const SIZE_WORD = { S: "Small sprint", M: "Medium sprint", L: "Large sprint" };
const OWNERS_CALL = "Owner's call";
/** What `main` is meant to show of an entry's items: the first three kept. */
const shown = (entry: Expected) => entry.items.slice(0, 3);
/** The words of the meta line, in the order the contract fixes. */
function metaParts(entry: Expected) {
  return [
    ...(entry.size ? [SIZE_WORD[entry.size]] : []),
    ...(entry.ownersCall ? [OWNERS_CALL] : []),
    ...(entry.pr ? [`Pull request #${entry.pr}`] : []),
  ];
}
const prHref = (n: number) => `${REPO}/pull/${n}`;
const entryOf = (n: number) => VALID.find((entry) => entry.sprint === n);

// ---------------------------------------------------------------------------------------------
// Shared page helpers

async function open(page: Page, width: number, scheme?: Scheme) {
  if (scheme) await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width, height: HEIGHT });
  const response = await page.goto(SPRINTS);
  expect(response?.status(), `status of ${SPRINTS}`).toBe(200);
}

type Dom = {
  /** The sprint number read from the h3's text ("Sprint N ..."), NaN when unreadable. */
  number: number;
  h3: string;
  inner: string;
  /** Everything in the h3 except the number span. */
  goal: string;
  meta: string | null;
  links: { text: string; href: string | null }[];
  labels: string[];
  lists: number;
  items: string[];
  text: string;
};

/** Each entry as the DOM has it, in DOM order. */
async function readEntries(page: Page) {
  return page.evaluate(
    (entries) =>
      [...document.querySelectorAll(entries)].map((li): Dom => {
        const h3 = li.querySelector("h3");
        const number = h3?.querySelector(":scope > span") ?? null;
        const next = h3?.nextElementSibling ?? null;
        return {
          number: Number(h3?.textContent?.match(/^\s*Sprint\s+(\d+)/)?.[1]),
          h3: h3?.textContent ?? "",
          inner: (h3 as HTMLElement | null)?.innerText ?? "",
          goal: [...(h3?.childNodes ?? [])]
            .filter((node) => node !== number)
            .map((node) => node.textContent ?? "")
            .join(""),
          meta: next?.tagName === "P" ? (next.textContent ?? "") : null,
          links: [...li.querySelectorAll("a")].map((a) => ({
            text: (a.textContent ?? "").trim(),
            href: a.getAttribute("href"),
          })),
          labels: [...li.querySelectorAll("h4")].map(
            (h) => h.textContent ?? "",
          ),
          lists: li.querySelectorAll("ul").length,
          items: [...li.querySelectorAll("ul > li")].map(
            (item) => item.textContent ?? "",
          ),
          text: li.textContent ?? "",
        };
      }),
    ENTRIES,
  );
}

/** Presses Tab until the focused element matches `sel`, at most `max` times. */
async function tabTo(page: Page, sel: string, max = 40) {
  for (let presses = 0; presses < max; presses++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((s) => document.activeElement?.matches(s), sel)) {
      return true;
    }
  }
  return false;
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

/** The tolerance of the contract's measurements, reported with both numbers. */
function near(actual: number, expected: number, what: string) {
  expect
    .soft(Math.abs(actual - expected), `${what}: ${actual} vs ${expected}`)
    .toBeLessThanOrEqual(TOLERANCE);
}

// ---------------------------------------------------------------------------------------------
// C1. The route and its skeleton

type Skeleton = Awaited<ReturnType<typeof skeleton>>;

async function skeleton(page: Page) {
  return page.evaluate(() => {
    const sections = [...document.querySelectorAll("main section")];
    const first = document.querySelector("main > header")?.firstElementChild;
    return {
      mains: document.querySelectorAll("main").length,
      mainWithId: document.querySelectorAll('main#main[tabindex="-1"]').length,
      firstLink: document.querySelector("a")?.getAttribute("href") ?? null,
      h1s: [...document.querySelectorAll("h1")].map((h) =>
        (h.textContent ?? "").trim(),
      ),
      sections: sections.length,
      labelledBy: sections[0]?.getAttribute("aria-labelledby") ?? null,
      h2Id: sections[0]?.querySelector("h2")?.id ?? null,
      headerFirst: first?.tagName ?? null,
      headerFirstLinks: [...(first?.querySelectorAll("a") ?? [])].map((a) => ({
        href: a.getAttribute("href"),
        text: (a.textContent ?? "").trim(),
      })),
    };
  });
}

function expectSkeleton(found: Skeleton, how: string) {
  expect.soft(found.mains, `main elements (${how})`).toBe(1);
  expect.soft(found.mainWithId, `main#main[tabindex="-1"] (${how})`).toBe(1);
  expect.soft(found.firstLink, `the first a in the DOM (${how})`).toBe("#main");
  expect.soft(found.h1s, `h1 elements (${how})`).toEqual(["Build log"]);
  expect.soft(found.sections, `sections in main (${how})`).toBe(1);
  expect.soft(found.h2Id, `the section's h2 id (${how})`).toBe("sprints");
  expect
    .soft(found.labelledBy, `the section's aria-labelledby (${how})`)
    .toBe("sprints");
  expect.soft(found.headerFirst, `the header's first child (${how})`).toBe("P");
  expect
    .soft(found.headerFirstLinks, `the links in that p (${how})`)
    .toEqual([{ href: "/", text: profile.name }]);
}

test.describe("C1. The route and its skeleton", () => {
  test("C1.1 /sprints is 200 with scripts on and off, with the home page's skeleton", async ({
    page,
    browser,
  }) => {
    await open(page, 1440);
    expectSkeleton(await skeleton(page), "scripts on");
    const section = page.locator("main section");
    await expect(section, "the Sprints section").toHaveRole("region");
    await expect(section, "the Sprints section").toHaveAccessibleName(
      "Sprints",
    );

    const context = await browser.newContext({ javaScriptEnabled: false });
    const bare = await context.newPage();
    const response = await bare.goto(SPRINTS);
    expect(response?.status(), "status with scripts off").toBe(200);
    const ran = await bare.evaluate(
      () => typeof (self as { __next_f?: unknown }).__next_f,
    );
    expect(ran, "page scripts ran").toBe("undefined");
    expectSkeleton(await skeleton(bare), "scripts off");
    await context.close();
  });

  test("C1.2 no hero, canvas, svg, img, table, button, details or input, and nothing expands", async ({
    page,
  }) => {
    await open(page, 1440);
    const found = await page.evaluate(() => {
      const main = document.querySelector("main");
      const forbidden =
        "canvas, svg, img, table, button, details, input, [aria-expanded]";
      return {
        inMain: [...(main?.querySelectorAll(forbidden) ?? [])].map((el) =>
          el.tagName.toLowerCase(),
        ),
        hero: document.querySelectorAll("[data-hero]").length,
      };
    });
    expect(found.inMain, "forbidden elements in main").toEqual([]);
    expect(found.hero, "[data-hero] elements").toBe(0);
  });

  test("C1.3 main opens the way the home page's main does", async ({
    page,
  }) => {
    const mainBox = () =>
      page.evaluate(() => {
        const style = getComputedStyle(
          document.querySelector("main") ?? document.body,
        );
        return {
          display: style.display,
          flexDirection: style.flexDirection,
          width: style.width,
          maxWidth: style.maxWidth,
          paddingTop: style.paddingTop,
          paddingRight: style.paddingRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          rowGap: style.rowGap,
          columnGap: style.columnGap,
        };
      });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto("/");
      const home = await mainBox();
      const response = await page.goto(SPRINTS);
      expect(response?.status(), `status of ${SPRINTS}`).toBe(200);
      expect(await mainBox(), `main's box at ${width} px`).toEqual(home);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// C2. Metadata

test.describe("C2. Metadata", () => {
  test("C2.1 its own title, canonical, og:url and descriptions", async ({
    page,
  }) => {
    await page.goto("/");
    const homeTitle = await page.title();
    const response = await page.goto(SPRINTS);
    expect(response?.status(), `status of ${SPRINTS}`).toBe(200);
    const title = await page.title();
    expect(title, "document.title").toContain("Build log");
    expect(title, "the home page's title").not.toBe(homeTitle);

    const tags = await page.evaluate(() => {
      const content = (css: string) =>
        [...document.querySelectorAll<HTMLMetaElement>(css)].map(
          (meta) => meta.content,
        );
      return {
        canonical: [
          ...document.querySelectorAll<HTMLLinkElement>(
            'link[rel="canonical"]',
          ),
        ].map((link) => link.href),
        ogUrl: content('meta[property="og:url"]'),
        description: content('meta[name="description"]'),
        ogDescription: content('meta[property="og:description"]'),
        twitterDescription: content('meta[name="twitter:description"]'),
      };
    });
    const url = "https://theseus-portfolio.vercel.app/sprints";
    expect(tags.canonical, "canonical").toEqual([url]);
    expect(tags.ogUrl, "og:url").toEqual([url]);
    // The layout's description is the owner's bio; a page that spreads the shared openGraph or
    // leaves twitter alone would claim it as the build log's.
    for (const key of [
      "description",
      "ogDescription",
      "twitterDescription",
    ] as const) {
      expect(tags[key], key).toHaveLength(1);
      expect(tags[key][0]?.trim(), `${key} is set`).not.toBe("");
      expect(tags[key][0], `${key} is not the bio`).not.toBe(profile.bio);
    }
  });

  test("C2.2 the sitemap lists / and /sprints, and robots.txt does not disallow /sprints", async ({
    request,
  }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status(), "status of /sitemap.xml").toBe(200);
    const locs = [
      ...(await sitemap.text()).matchAll(/<loc>([^<]*)<\/loc>/g),
    ].map((match) => match[1]);
    expect(locs, "URLs in the sitemap").toEqual(
      expect.arrayContaining([
        "https://theseus-portfolio.vercel.app/",
        "https://theseus-portfolio.vercel.app/sprints",
      ]),
    );

    const robots = await (await request.get("/robots.txt")).text();
    const disallowed = robots
      .split("\n")
      .map((line) => line.split("#")[0]?.trim() ?? "")
      .flatMap((line) => {
        const rule = line.match(/^disallow\s*:\s*(\S+)/i)?.[1];
        return rule ? [rule.replace(/\*$/, "")] : [];
      })
      .filter((rule) => "/sprints".startsWith(rule));
    expect(disallowed, "robots.txt rules that cover /sprints").toEqual([]);
  });

  test("C2.3 one og:image and one twitter:image, each served as image/png", async ({
    page,
    request,
  }) => {
    const response = await page.goto(SPRINTS);
    expect(response?.status(), `status of ${SPRINTS}`).toBe(200);
    // A page that sets its own openGraph or twitter replaces the layout's whole, and takes the
    // inherited image with it; /sprints once shared a card with the large-image type and no image.
    const images = await page.evaluate(() => {
      const content = (css: string) =>
        [...document.querySelectorAll<HTMLMetaElement>(css)].map(
          (meta) => meta.content,
        );
      return {
        og: content('meta[property="og:image"]'),
        twitter: content('meta[name="twitter:image"]'),
      };
    });
    expect(images.og, "og:image").toHaveLength(1);
    expect(images.twitter, "twitter:image").toHaveLength(1);
    // The tags name the production host; the same paths are served here.
    for (const [name, urls] of Object.entries(images)) {
      const url = urls[0] ?? "";
      const image = await request.get(new URL(url).pathname);
      expect(image.status(), `status of the ${name} image`).toBe(200);
      expect(image.headers()["content-type"], `${name} image type`).toBe(
        "image/png",
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------
// C3. Order and count

test.describe("C3. Order and count", () => {
  test("C3.1 one entry per valid retro, newest first by the number in the file", async ({
    page,
  }) => {
    await open(page, 1440);
    const wanted = VALID.map((entry) => entry.sprint);
    // The anchors: sprints 1 to 11 are history, so they must be there whatever the oracle saw.
    expect(
      wanted,
      "valid retros found in .crew/sprint (at least sprints 1 to 11)",
    ).toEqual(
      expect.arrayContaining(Array.from({ length: 11 }, (_, i) => i + 1)),
    );
    await expect(page.locator("main section ol"), "lists").toHaveCount(1);
    await expect(page.locator(ENTRIES), "entries").toHaveCount(wanted.length);
    const rendered = (await readEntries(page)).map((entry) => entry.number);
    expect(rendered, "sprint numbers, top to bottom").toEqual(wanted);
  });

  test("C3.2 anchors: 10 before 9, 2 before 1 (not a sort by folder name), and 1 last", async ({
    page,
  }) => {
    await open(page, 1440);
    const rendered = (await readEntries(page)).map((entry) => entry.number);
    const at = (n: number) => rendered.indexOf(n);
    expect(at(10), "sprint 10 is listed").toBeGreaterThanOrEqual(0);
    expect(at(9), "sprint 9 is listed").toBeGreaterThanOrEqual(0);
    expect(at(10), "sprint 10 comes before 9").toBeLessThan(at(9));
    expect(at(2), "sprint 2 comes before 1").toBeLessThan(at(1));
    expect(rendered.at(-1), "the last entry").toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// C4. One entry's words

test.describe("C4. One entry's words", () => {
  test("C4.1 the heading reads 'Sprint N ' and the goal, with a real space, at every width", async ({
    page,
  }) => {
    // Word for word, from the contract: the prefix, the backticks and the capital applied.
    const anchors: [number, string][] = [
      [
        1,
        "Design tokens (5 colors, 5 fluid type steps in app/globals.css, used across the page)",
      ],
      [
        8,
        "The subtle 3D hero, Part A of the sprint 7 contract (static SVG lift half-model, C1-C9)",
      ],
      [
        11,
        "Stack separators: a drawn middle dot between the tools in the Stack section (Iris's sprint 6 item 2)",
      ],
      // A parenthetical that says more than the size stays; a bare size tag goes.
      [12, "Watch the team build: the build log's contract (L, contract step)"],
      [
        15,
        "Redesign, direction step: the concept, key screens, motion storyboard and budgets, with the contract for the build",
      ],
    ];
    for (const [n, goal] of anchors) {
      expect(entryOf(n)?.goal, `the oracle's goal for sprint ${n}`).toBe(goal);
    }

    for (const width of WIDTHS) {
      await open(page, width);
      const dom = await readEntries(page);
      expect(dom.length, `entries at ${width} px`).toBe(VALID.length);
      for (const [i, entry] of VALID.entries()) {
        const name = `Sprint ${entry.sprint} ${entry.goal}`;
        const found = dom[i];
        const where = `sprint ${entry.sprint} at ${width} px`;
        await expect
          .soft(
            page.locator(ENTRIES).nth(i).locator("h3"),
            `accessible name, ${where}`,
          )
          .toHaveAccessibleName(name);
        // textContent has no layout in it: "Sprint 11Stack" can't hide behind a block.
        expect.soft(squash(found?.h3 ?? ""), `h3 text, ${where}`).toBe(name);
        expect
          .soft(
            squash(found?.inner ?? "").replace(/^Sprint (?=\d)/, ""),
            `visible text: the number, then the goal, ${where}`,
          )
          .toBe(`${entry.sprint} ${entry.goal}`);
        expect
          .soft(squash(found?.goal ?? ""), `goal text, ${where}`)
          .toBe(entry.goal);
      }
    }
  });

  test("C4.2 the meta line: size in words and Owner's call, joined by dots", async ({
    page,
  }) => {
    await open(page, 1440);
    const dom = await readEntries(page);
    for (const [i, entry] of VALID.entries()) {
      const meta = dom[i]?.meta ?? null;
      const parts = metaParts(entry);
      const where = `the meta line of sprint ${entry.sprint}`;
      if (parts.length === 0) {
        expect.soft(meta, `${where} is left out`).toBeNull();
        continue;
      }
      const text = squash((meta ?? "").replaceAll("\u00a0", " "));
      expect.soft(text, where).toBe(parts.join(" · "));
      expect
        .soft(text.startsWith("·"), `${where} starts with a dot`)
        .toBe(false);
      // Direction §3.3: a no-break space before each dot, so a dot never starts a line.
      expect
        .soft(
          [...(meta ?? "")].every(
            (char, at, all) => char !== "·" || all[at - 1] === "\u00a0",
          ),
          `${where}: a no-break space before every dot`,
        )
        .toBe(true);
    }

    // Anchors, from history: the owner decided 1, 2, 7, 9 and 10 among sprints 1 to 11.
    const marked = VALID.flatMap((entry, i) =>
      entry.sprint <= 11 && dom[i]?.meta?.includes(OWNERS_CALL)
        ? [entry.sprint]
        : [],
    );
    expect(
      marked.sort((a, b) => a - b),
      "Owner's call on sprints 1 to 11",
    ).toEqual([1, 2, 7, 9, 10]);
    const words = (n: number) =>
      dom[VALID.findIndex((e) => e.sprint === n)]?.meta;
    expect(words(11), "sprint 11 (S)").toMatch(/^Small sprint/);
    expect(words(1), "sprint 1 (M)").toMatch(/^Medium sprint/);
    expect(words(7), "sprint 7 (L)").toMatch(/^Large sprint/);
  });

  test("C4.3 the pull request link: text, href, 24 px tall, in --accent", async ({
    page,
  }) => {
    expect(entryOf(11)?.pr, "the oracle's pull request for sprint 11").toBe(36);
    for (const scheme of SCHEMES) {
      for (const width of [320, 390, 1440]) {
        await open(page, width, scheme);
        const accent = (await resolveColors(page))["--accent"]?.computed;
        const dom = await readEntries(page);
        const boxes = await page.evaluate(
          (selector) =>
            [...document.querySelectorAll(selector)].map((li) =>
              [...li.querySelectorAll("a")].map((a) => ({
                height: a.getBoundingClientRect().height,
                color: getComputedStyle(a).color,
              })),
            ),
          ENTRIES,
        );
        for (const [i, entry] of VALID.entries()) {
          const where = `sprint ${entry.sprint}, ${width} px, ${scheme}`;
          const links = dom[i]?.links ?? [];
          const expected = entry.pr
            ? [{ text: `Pull request #${entry.pr}`, href: prHref(entry.pr) }]
            : [];
          expect.soft(links, `links, ${where}`).toEqual(expected);
          for (const box of boxes[i] ?? []) {
            expect
              .soft(box.height, `link height, ${where}`)
              .toBeGreaterThanOrEqual(24 - 0.05);
            expect.soft(box.color, `link color, ${where}`).toBe(accent);
          }
        }
        const eleven = dom[VALID.findIndex((e) => e.sprint === 11)];
        expect
          .soft(eleven?.links, `sprint 11's link, ${width} px, ${scheme}`)
          .toEqual([
            {
              text: "Pull request #36",
              href: "https://github.com/nycruslan/theseus-portfolio/pull/36",
            },
          ]);
      }
    }
  });

  test("C4.4 no status label: not 'Merged', 'Shipped' or 'Failed' outside the team's own words", async ({
    page,
  }) => {
    await open(page, 1440);
    const dom = await readEntries(page);
    for (const [i, entry] of VALID.entries()) {
      const found = dom[i];
      // What is left once the rendered goal and items are taken out is the page's own words.
      let rest = found?.text ?? "";
      for (const own of [found?.goal ?? "", ...(found?.items ?? [])]) {
        rest = rest.replace(own, " ");
      }
      expect
        .soft(
          rest.match(/\b(?:merged|shipped|failed)\b/gi) ?? [],
          `status words in sprint ${entry.sprint}'s own words: "${squash(rest)}"`,
        )
        .toEqual([]);
    }
  });
});

test.describe("C4b. The goal carries no size tag", () => {
  test("C4.5 no goal on the page ends in a bare size tag, and sprint 15 still shows its words", async ({
    page,
  }) => {
    await open(page, 1280);
    const dom = await readEntries(page);
    expect(dom.length, "entries").toBe(VALID.length);
    for (const found of dom) {
      expect(
        squash(found.goal),
        `the goal of sprint ${found.number} does not end in (S), (M) or (L)`,
      ).not.toMatch(/\(\s*[SML]\s*\)$/i);
    }
    const fifteen = dom.find((found) => found.number === 15);
    expect(squash(fifteen?.goal ?? ""), "sprint 15's goal").toBe(
      "Redesign, direction step: the concept, key screens, motion storyboard and budgets, with the contract for the build",
    );
    // The meta line already says the size in words.
    expect(squash(fifteen?.meta ?? ""), "sprint 15's meta line").toContain(
      "Large",
    );
  });
});

// ---------------------------------------------------------------------------------------------
// C5. What went wrong, all of it

test.describe("C5. What went wrong, all of it", () => {
  test("C5.1 an h4 and a list exactly when there are items; up to three, in the file's order", async ({
    page,
  }) => {
    await open(page, 1440);
    const dom = await readEntries(page);
    for (const [i, entry] of VALID.entries()) {
      const found = dom[i];
      const where = `sprint ${entry.sprint}`;
      const wanted = shown(entry);
      if (entry.items.length === 0) {
        expect.soft(found?.labels, `h4 of ${where}`).toEqual([]);
        expect.soft(found?.lists, `lists of ${where}`).toBe(0);
        continue;
      }
      expect
        .soft(found?.labels.map(squash), `h4 of ${where}`)
        .toEqual(["What went wrong"]);
      expect.soft(found?.lists, `lists of ${where}`).toBe(1);
      expect
        .soft(
          found?.items.map(squash),
          `items of ${where} (min(3, ${entry.items.length}))`,
        )
        .toEqual(wanted);
    }

    // Anchors, from history: sprint 11 has two items, and every sprint from 1 to 11 has 1 to 3.
    const count = (n: number) =>
      dom[VALID.findIndex((e) => e.sprint === n)]?.items.length;
    expect(count(11), "items shown for sprint 11").toBe(2);
    for (let n = 1; n <= 11; n++) {
      expect(count(n), `items shown for sprint ${n}`).toBeGreaterThanOrEqual(1);
      expect(count(n), `items shown for sprint ${n}`).toBeLessThanOrEqual(3);
    }
  });

  test("C5.2 nothing is truncated, collapsed or hidden", async ({ page }) => {
    for (const width of [320, 1440]) {
      await open(page, width);
      const found = await page.evaluate((selector) => {
        const main = document.querySelector("main") ?? document.body;
        const own = new Set(["SCRIPT", "TEMPLATE", "STYLE"]);
        const all = [...main.querySelectorAll("*")].filter(
          (el) => !own.has(el.tagName),
        );
        const name = (el: Element) =>
          `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`;
        const lis = [...document.querySelectorAll(selector)].flatMap(
          (entry) => [entry, ...entry.querySelectorAll("li")],
        );
        return {
          controls: main.querySelectorAll(
            "details, summary, button, [aria-expanded]",
          ).length,
          hidden: all
            .filter(
              (el) =>
                el.hasAttribute("hidden") ||
                getComputedStyle(el).display === "none",
            )
            .map(name),
          clipped: all
            .filter((el) => {
              const style = getComputedStyle(el);
              return (
                style.textOverflow === "ellipsis" ||
                (style.getPropertyValue("-webkit-line-clamp") !== "none" &&
                  style.getPropertyValue("-webkit-line-clamp") !== "")
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
          endings: [...main.querySelectorAll("h3, ul > li")]
            .map((el) => (el.textContent ?? "").trim())
            .filter((text) => /(…|\.\.\.)$/.test(text)),
        };
      }, ENTRIES);
      const at = `at ${width} px`;
      expect(
        found.controls,
        `details, summary, button, [aria-expanded] ${at}`,
      ).toBe(0);
      expect(found.hidden, `hidden elements in main ${at}`).toEqual([]);
      expect(found.clipped, `ellipsis or line-clamp ${at}`).toEqual([]);
      expect(found.notVisible, `li that are not visible ${at}`).toEqual([]);
      expect(
        found.scrolls,
        `li whose scrollHeight differs from clientHeight ${at}`,
      ).toEqual([]);
      const sourceEllipses = VALID.flatMap((entry) => [
        entry.goal,
        ...shown(entry),
      ]).filter((text) => /(…|\.\.\.)$/.test(text));
      expect(
        found.endings.map(squash),
        `text ending in an ellipsis ${at} (the source's own: ${sourceEllipses.length})`,
      ).toEqual(sourceEllipses.map(squash));
    }
  });

  test("C5.3 the outcome and the evidence are not rendered, no backtick, only the contract's links", async ({
    page,
  }) => {
    await open(page, 1440);
    const found = await page.evaluate(() => ({
      text: document.querySelector("main")?.textContent ?? "",
      hrefs: [...document.querySelectorAll("main a")].map((a) =>
        a.getAttribute("href"),
      ),
    }));
    const text = squash(found.text);
    const own = VALID.flatMap((entry) => [entry.goal, ...shown(entry)]);
    // Only more than two words: a one-word outcome ("merged") would match any goal that has it.
    const hidden = VALID.flatMap((entry) => [
      ...(entry.outcome ? [entry.outcome] : []),
      ...entry.evidence,
    ])
      .flatMap((raw) => [squash(raw), squash(noTicks(raw))])
      .filter((string) => string.split(" ").length > 2);
    const leaked = hidden.filter(
      (string) =>
        text.includes(string) &&
        !own.some((shownText) => shownText.includes(string)),
    );
    expect(leaked, "outcome or evidence strings found in main's text").toEqual(
      [],
    );
    expect(found.text.includes("`"), "a backtick in main").toBe(false);

    const allowed = new Set([
      "/",
      ...VALID.flatMap((e) => (e.pr ? [prHref(e.pr)] : [])),
    ]);
    const stray = found.hrefs.filter((href) => !href || !allowed.has(href));
    expect(
      stray,
      "links in main other than the back link and the PR links",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// C6. Spacing and the hang

type Box = { top: number; bottom: number; left: number; right: number };
type Geometry = Awaited<ReturnType<typeof measure>>;

/** Every box the spacing checks need, in px, read in one go. */
async function measure(page: Page) {
  return page.evaluate((selector) => {
    const box = (el: Element | null | undefined) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    };
    // The first character that is not white space, outside `skip`: its rect is the first line.
    const firstChar = (root: Element, skip: Element | null): Box | null => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (skip?.contains(node)) continue;
        const at = (node.textContent ?? "").search(/\S/);
        if (at < 0) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + 1);
        const r = range.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }
      return null;
    };
    const main = document.querySelector("main");
    const mainBox = main?.getBoundingClientRect();
    const columnLeft =
      (mainBox?.left ?? 0) +
      Number.parseFloat(getComputedStyle(main ?? document.body).paddingLeft);
    const px = (value: string) => Number.parseFloat(value);
    return {
      columnLeft,
      header: box(document.querySelector("main > header")),
      section: box(document.querySelector("main > section")),
      h2: box(document.querySelector("main > section > h2")),
      entries: [...document.querySelectorAll(selector)].map((li) => {
        const h3 = li.querySelector("h3");
        const number = h3?.querySelector(":scope > span") ?? null;
        const next = h3?.nextElementSibling ?? null;
        const style = getComputedStyle(li);
        return {
          n: Number(h3?.textContent?.match(/^\s*Sprint\s+(\d+)/)?.[1]),
          li: box(li),
          clientTop: li.clientTop,
          border: {
            width: style.borderTopWidth,
            style: style.borderTopStyle,
            color: style.borderTopColor,
          },
          h3: box(h3),
          goal: h3 ? firstChar(h3, number) : null,
          number: box(number),
          meta: next?.tagName === "P" ? box(next) : null,
          label: box(li.querySelector("h4")),
          items: [...li.querySelectorAll("ul > li")].map((item) => {
            const dot = getComputedStyle(item, "::before");
            return {
              box: box(item),
              clientLeft: item.clientLeft,
              clientTop: item.clientTop,
              position: getComputedStyle(item).position,
              text: firstChar(item, null),
              dot: {
                content: dot.content,
                position: dot.position,
                width: px(dot.width),
                height: px(dot.height),
                radius: dot.borderTopLeftRadius,
                background: dot.backgroundColor,
                left: px(dot.left),
                top: px(dot.top),
                marginLeft: Number.isNaN(px(dot.marginLeft))
                  ? 0
                  : px(dot.marginLeft),
                marginTop: Number.isNaN(px(dot.marginTop))
                  ? 0
                  : px(dot.marginTop),
              },
            };
          }),
        };
      }),
    };
  }, ENTRIES);
}

/** The contract's rounded-full test: 50% or more, or a radius of at least half the 3 px dot. */
function isRound(radius: string) {
  const value = Number.parseFloat(radius);
  return radius.endsWith("%") ? value >= 50 : value >= 1.5;
}

function checkHang(g: Geometry, width: number) {
  const hung = width >= 768;
  for (const e of g.entries) {
    const where = `sprint ${e.n}, ${width} px`;
    if (!e.number || !e.goal || !e.h3) {
      expect.soft(false, `a number and a goal in the h3 (${where})`).toBe(true);
      continue;
    }
    if (hung) {
      near(
        e.goal.left - e.number.right,
        16,
        `number's right edge to the text (${where})`,
      );
      near(
        (e.number.top + e.number.bottom) / 2,
        (e.goal.top + e.goal.bottom) / 2,
        `number's centre to the first line's centre (${where})`,
      );
      expect
        .soft(
          (e.number.top + e.number.bottom) / 2,
          `number's centre is inside the first line (${where})`,
        )
        .toBeGreaterThanOrEqual(e.goal.top - TOLERANCE);
      expect
        .soft(
          (e.number.top + e.number.bottom) / 2,
          `number's centre inside the first line (${where})`,
        )
        .toBeLessThanOrEqual(e.goal.bottom + TOLERANCE);
      near(
        e.goal.left,
        g.columnLeft,
        `goal text's left edge to the column's (${where})`,
      );
    } else {
      near(
        e.number.left,
        g.columnLeft,
        `inline number's left edge to the column's (${where})`,
      );
    }
  }
  if (hung) {
    const right = (n: number) =>
      g.entries.find((e) => e.n === n)?.number?.right;
    const [nine, eleven] = [right(9), right(11)];
    expect.soft(nine, "sprint 9 has a number").toBeDefined();
    expect.soft(eleven, "sprint 11 has a number").toBeDefined();
    near(
      nine ?? Number.NaN,
      eleven ?? Number.NaN,
      `right edges of 9 and 11 (${width} px)`,
    );
  }
}

function checkDots(g: Geometry, muted: string | undefined, width: number) {
  for (const e of g.entries) {
    for (const [at, item] of e.items.entries()) {
      const where = `sprint ${e.n}, item ${at + 1}, ${width} px`;
      const { dot } = item;
      if (!item.box || !item.text) {
        expect.soft(false, `a box and text (${where})`).toBe(true);
        continue;
      }
      expect
        .soft(
          item.position,
          `the item is the dot's containing block (${where})`,
        )
        .not.toBe("static");
      expect
        .soft(dot.position, `the dot is positioned (${where})`)
        .toBe("absolute");
      expect.soft(dot.content, `the dot is generated (${where})`).toBe('""');
      near(dot.width, 3, `dot width (${where})`);
      near(dot.height, 3, `dot height (${where})`);
      expect
        .soft(
          isRound(dot.radius),
          `dot radius ${dot.radius} is round (${where})`,
        )
        .toBe(true);
      expect.soft(dot.background, `dot colour (${where})`).toBe(muted);
      const left = item.box.left + item.clientLeft + dot.left + dot.marginLeft;
      const top = item.box.top + item.clientTop + dot.top + dot.marginTop;
      near(item.box.left - left, 12, `dot's left, left of the item (${where})`);
      near(
        item.text.left - (left + dot.width),
        9,
        `clear air between dot and text (${where})`,
      );
      near(
        top + dot.height / 2,
        (item.text.top + item.text.bottom) / 2,
        `dot's centre to the first line's centre (${where})`,
      );
      near(
        item.text.left,
        g.columnLeft,
        `item text's left edge to the column's (${where})`,
      );
    }
  }
}

function checkSpacing(g: Geometry, rule: string | undefined, width: number) {
  expect.soft(g.header && g.section, "a header and a section").toBeTruthy();
  near(
    (g.section?.top ?? 0) - (g.header?.bottom ?? 0),
    64,
    `header to section (${width} px)`,
  );
  if (g.entries[0]?.li && g.h2) {
    near(
      g.entries[0].li.top - g.h2.bottom,
      24,
      `section label to the first rule (${width} px)`,
    );
  }
  for (const [i, e] of g.entries.entries()) {
    const where = `sprint ${e.n}, ${width} px`;
    expect.soft(e.border.width, `rule width (${where})`).toBe("1px");
    expect.soft(e.border.style, `rule style (${where})`).toBe("solid");
    expect.soft(e.border.color, `rule colour is --rule (${where})`).toBe(rule);
    if (!e.li || !e.h3) continue;
    near(e.h3.top - (e.li.top + e.clientTop), 24, `rule to h3 (${where})`);
    let last = e.h3.bottom;
    if (e.meta) {
      near(e.meta.top - e.h3.bottom, 0, `h3 to meta line (${where})`);
      last = e.meta.bottom;
    }
    if (e.label) {
      near(
        e.label.top - (e.meta?.bottom ?? e.h3.bottom),
        16,
        `meta line to the label (${where})`,
      );
      last = e.label.bottom;
    }
    for (const [at, item] of e.items.entries()) {
      if (!item.box) continue;
      const above = at === 0 ? e.label?.bottom : e.items[at - 1]?.box?.bottom;
      near(
        item.box.top - (above ?? Number.NaN),
        at === 0 ? 4 : 8,
        `${at === 0 ? "label to first item" : "item to item"} (${where}, item ${at + 1})`,
      );
      last = item.box.bottom;
    }
    const next = g.entries[i + 1]?.li;
    if (next)
      near(next.top - last, 32, `last line to the next rule (${where})`);
  }
}

for (const width of WIDTHS) {
  test.describe(`C6. Spacing and the hang, ${width} px`, () => {
    // Reduced motion: the heading's rise would otherwise move the label while it is measured.
    test.use({ reducedMotion: "reduce" });

    test(`C6.1 the number hangs 16 px left of the text from 768, inline below (${width} px)`, async ({
      page,
    }) => {
      await open(page, width);
      checkHang(await measure(page), width);
    });

    test(`C6.2 the list dot: 3 x 3, round, --muted, 12 px left, on the first line (${width} px)`, async ({
      page,
    }) => {
      await open(page, width);
      const muted = (await resolveColors(page))["--muted"]?.computed;
      const g = await measure(page);
      expect(g.entries.length, "entries").toBe(VALID.length);
      checkDots(g, muted, width);
    });

    test(`C6.3 and C6.4 the vertical rhythm, and every entry on a 1 px --rule (${width} px)`, async ({
      page,
    }) => {
      await open(page, width);
      const rule = (await resolveColors(page))["--rule"]?.computed;
      const g = await measure(page);
      expect(g.entries.length, "entries").toBe(VALID.length);
      checkSpacing(g, rule, width);
    });
  });
}

// ---------------------------------------------------------------------------------------------
// C7. Colour and type, in tokens only

for (const scheme of SCHEMES) {
  test.describe(`C7. Colour and type, ${scheme}`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    test(`C7.1 text is in the five colours and the sm, base, lg and 2xl steps; weights 400, 500, 600; one font (${scheme})`, async ({
      page,
    }) => {
      for (const width of [320, 1440]) {
        await open(page, width);
        const { tokenColors, texts } = await textStyles(page);
        const steps = await resolveSteps(page);
        const allowed = [
          "--step-sm",
          "--step-base",
          "--step-lg",
          "--step-2xl",
        ].map((name) => steps[name] ?? Number.NaN);
        expect(texts.length, "elements with text").toBeGreaterThan(0);
        const off = texts
          .filter(
            ({ color, fontSize }) =>
              !tokenColors.includes(color) ||
              !allowed.some(
                (size) => Math.abs(size - Number.parseFloat(fontSize)) < 0.02,
              ),
          )
          .map(
            ({ element, color, fontSize }) =>
              `${element}: ${color}, ${fontSize}`,
          );
        expect
          .soft(off, `text outside the tokens or the four steps at ${width} px`)
          .toEqual([]);

        const faces = await page.evaluate(() => {
          const els = [...document.body.querySelectorAll("*")].filter(
            (el) =>
              el.getClientRects().length > 0 &&
              [...el.childNodes].some(
                (node) =>
                  node.nodeType === Node.TEXT_NODE &&
                  (node.textContent ?? "").trim() !== "",
              ),
          );
          return {
            weights: [
              ...new Set(els.map((el) => getComputedStyle(el).fontWeight)),
            ],
            families: [
              ...new Set(els.map((el) => getComputedStyle(el).fontFamily)),
            ],
          };
        });
        expect
          .soft(
            faces.weights.filter((w) => !["400", "500", "600"].includes(w)),
            `font weights other than 400, 500, 600 at ${width} px`,
          )
          .toEqual([]);
        expect
          .soft(faces.families, `font families at ${width} px`)
          .toHaveLength(1);
        expect
          .soft(
            faces.families.filter((f) => /mono|courier|consolas/i.test(f)),
            "monospace families",
          )
          .toEqual([]);
      }
    });

    test(`C7.2 the accent colour is on links only (${scheme})`, async ({
      page,
    }) => {
      await open(page, 1440);
      const accent = (await resolveColors(page))["--accent"]?.computed;
      expect(accent, "--accent resolves").toBeTruthy();
      const found = await page.evaluate((color) => {
        const links = document.querySelectorAll("main a").length;
        const off = [...document.body.querySelectorAll("*")]
          .filter(
            (el) => getComputedStyle(el).color === color && !el.closest("a"),
          )
          .map(
            (el) =>
              `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
          );
        return { links, off };
      }, accent);
      expect(
        found.links,
        "links in main (the back link and the PR links)",
      ).toBeGreaterThan(1);
      expect(found.off, "elements in --accent that are not links").toEqual([]);
    });

    test(`C7.3 no background, radius, shadow, outline, rail or transform in the log, but the dots (${scheme})`, async ({
      page,
    }) => {
      for (const width of [390, 1440]) {
        await open(page, width);
        const found = await page.evaluate(
          ({ selector }) => {
            const main = document.querySelector("main") ?? document.body;
            const name = (el: Element) =>
              `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
            const paint = (style: CSSStyleDeclaration) => {
              const flags: string[] = [];
              const bg = style.backgroundColor.replace(/\s/g, "");
              if (bg !== "rgba(0,0,0,0)" && bg !== "transparent")
                flags.push(`background ${style.backgroundColor}`);
              if (style.backgroundImage !== "none")
                flags.push("background-image");
              if (style.borderTopLeftRadius !== "0px")
                flags.push(`radius ${style.borderTopLeftRadius}`);
              if (style.boxShadow !== "none") flags.push("box-shadow");
              return flags;
            };
            const rested: string[] = [];
            const lists: string[] = [];
            for (const el of [main, ...main.querySelectorAll("*")]) {
              const style = getComputedStyle(el);
              const flags = paint(style);
              if (
                style.outlineStyle !== "none" &&
                Number.parseFloat(style.outlineWidth) > 0
              )
                flags.push("outline");
              if (flags.length) rested.push(`${name(el)}: ${flags.join(", ")}`);
              for (const pseudo of ["::before", "::after"]) {
                const made = getComputedStyle(el, pseudo);
                if (made.content === "none" || made.content === "normal")
                  continue;
                const isDot =
                  pseudo === "::before" && el.matches(`${selector} ul > li`);
                const wrong = paint(made);
                if (!isDot && wrong.length)
                  rested.push(`${name(el)}${pseudo}: ${wrong.join(", ")}`);
              }
            }
            for (const el of document.querySelectorAll(
              `${selector}, ${selector} *`,
            )) {
              const style = getComputedStyle(el);
              const sides = (["Left", "Right", "Bottom"] as const).filter(
                (side) =>
                  style[`border${side}Style`] !== "none" &&
                  Number.parseFloat(style[`border${side}Width`]) > 0,
              );
              if (sides.length)
                lists.push(`${name(el)}: border ${sides.join(", ")}`);
              if (style.transform !== "none")
                lists.push(`${name(el)}: transform`);
              if (style.translate !== "none")
                lists.push(`${name(el)}: translate`);
            }
            return { rested, lists };
          },
          { selector: ENTRIES },
        );
        expect
          .soft(found.rested, `painted boxes at rest at ${width} px`)
          .toEqual([]);
        expect
          .soft(found.lists, `rails and transforms in the list at ${width} px`)
          .toEqual([]);
      }
    });
  });
}

// ---------------------------------------------------------------------------------------------
// C8. Phones and widths

for (const scheme of SCHEMES) {
  test.describe(`C8. Phones and widths, ${scheme}`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce" });

    test(`C8.1 nothing overflows and nothing sticks out past the right, 320 to 1440 px (${scheme})`, async ({
      page,
    }) => {
      for (const width of WIDTHS) {
        await open(page, width);
        expect
          .soft(
            await horizontalOverflow(page),
            `horizontal overflow at ${width} px`,
          )
          .toBeLessThanOrEqual(0);
        const out = await page.evaluate(() => {
          const view = document.documentElement.clientWidth;
          return [...document.body.querySelectorAll("*")].flatMap((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return [];
            // The left edge is checked in main, where a number hung into the gutter could leave.
            const left = el.closest("main") && r.left < -1.5;
            return r.right > view + 0.5 || left
              ? [
                  `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}": ${r.left} to ${r.right} of ${view}`,
                ]
              : [];
          });
        });
        expect
          .soft(out, `elements outside the viewport at ${width} px`)
          .toEqual([]);
      }
    });

    test(`C8.2 at 320 the meta line never wraps before a dot, and a PR link stays on one line (${scheme})`, async ({
      page,
    }) => {
      await open(page, 320);
      const found = await page.evaluate(
        (selector) =>
          [...document.querySelectorAll(selector)].map((li) => {
            const h3 = li.querySelector("h3");
            const meta = h3?.nextElementSibling;
            if (meta?.tagName !== "P")
              return {
                n: Number.NaN,
                startsLine: [] as string[],
                lineCounts: [] as number[],
              };
            const startsLine: string[] = [];
            let lineTop = Number.NEGATIVE_INFINITY;
            const walker = document.createTreeWalker(
              meta,
              NodeFilter.SHOW_TEXT,
            );
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const text = node.textContent ?? "";
              for (let at = 0; at < text.length; at++) {
                if (/\s/.test(text.charAt(at))) continue;
                const range = document.createRange();
                range.setStart(node, at);
                range.setEnd(node, at + 1);
                const r = range.getBoundingClientRect();
                if (r.top > lineTop + 2) {
                  lineTop = r.top;
                  if (text.charAt(at) === "·")
                    startsLine.push(text.slice(at, at + 12));
                }
              }
            }
            const lineCounts = [...meta.querySelectorAll("a")].map((a) => {
              const range = document.createRange();
              range.selectNodeContents(a);
              return new Set(
                [...range.getClientRects()].map((r) => Math.round(r.top)),
              ).size;
            });
            return {
              n: Number(h3?.textContent?.match(/^\s*Sprint\s+(\d+)/)?.[1]),
              startsLine,
              lineCounts,
            };
          }),
        ENTRIES,
      );
      expect(found.length, "entries").toBe(VALID.length);
      for (const entry of found) {
        expect
          .soft(
            entry.startsLine,
            `lines of sprint ${entry.n}'s meta that start with a dot`,
          )
          .toEqual([]);
        for (const lines of entry.lineCounts) {
          expect.soft(lines, `lines of sprint ${entry.n}'s PR link`).toBe(1);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------------------------
// C9. Accessibility

test.describe("C9. Accessibility", () => {
  for (const scheme of SCHEMES) {
    test(`C9.1 axe finds nothing at 390 and 1440, with or without the skip link showing (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [390, 1440]) {
        for (const skipShowing of [false, true]) {
          const where = `${width} px, ${scheme}, ${skipShowing ? "skip link showing" : "nothing focused"}`;
          await open(page, width);
          if (skipShowing) await page.keyboard.press("Tab");
          const results = await new AxeBuilder({ page })
            .withTags(AXE_TAGS)
            .analyze();
          const found = results.violations.map((v) => ({
            rule: v.id,
            impact: v.impact,
            help: v.help,
            targets: v.nodes.map((node) => node.target.join(" ")),
          }));
          expect.soft(found, `axe violations (${where})`).toEqual([]);
          const passed = results.passes.map((p) => p.id);
          for (const rule of [
            "color-contrast",
            "landmark-one-main",
            "region",
          ]) {
            expect
              .soft(passed, `axe passed ${rule} (${where})`)
              .toContain(rule);
          }
        }
      }
    });

    test(`C9.2 text meets its contrast thresholds (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, 390);
      const colors = await resolveColors(page);
      const rgba = (token: string) => {
        const value = colors[token]?.rgba;
        if (!value) throw new Error(`${token} did not resolve`);
        return value;
      };
      const [r, g, b] = rgba("--background");
      const background: Rgb = [r, g, b];
      const on = (token: string) =>
        contrast(composite(rgba(token), background), background);
      expect
        .soft(on("--foreground"), `--foreground (${scheme})`)
        .toBeGreaterThanOrEqual(7);
      for (const token of ["--muted", "--accent"]) {
        expect
          .soft(on(token), `${token} (${scheme})`)
          .toBeGreaterThanOrEqual(4.5);
      }
      // And the colours this route's text really has, not only the tokens.
      const { texts } = await textStyles(page);
      for (const { element, color } of texts) {
        const parsed = parseColor(color);
        const ratio = parsed
          ? contrast(composite(parsed, background), background)
          : 0;
        expect
          .soft(ratio, `contrast of ${element} (${scheme})`)
          .toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test("C9.3 one h1, then the Sprints h2, then each entry's h3, an h4 only under an h3, no level skipped", async ({
    page,
  }) => {
    await open(page, 1440);
    const headings = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => ({
        level: Number(h.tagName.slice(1)),
        text: (h.textContent ?? "").trim().slice(0, 30),
      })),
    );
    expect(
      headings.slice(0, 2).map((h) => `h${h.level} ${h.text}`),
      "the first two headings",
    ).toEqual(["h1 Build log", "h2 Sprints"]);
    expect(
      headings.filter((h) => h.level === 1),
      "h1 elements",
    ).toHaveLength(1);
    expect(
      headings.filter((h) => h.level === 2),
      "h2 elements",
    ).toHaveLength(1);
    expect(
      headings.filter((h) => h.level === 3),
      "h3 elements, one per entry",
    ).toHaveLength(VALID.length);
    let previous = 0;
    for (const { level, text } of headings) {
      expect(
        level - previous,
        `h${level} "${text}" follows an h${previous}`,
      ).toBeLessThanOrEqual(1);
      if (level === 4)
        expect(previous, `the h4 "${text}" follows an h3`).toBe(3);
      previous = level;
    }
  });

  test("C9.4 every link but the skip link is at least 24 x 24 px at 390", async ({
    page,
  }) => {
    await open(page, 390);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a")]
        .filter((a) => a.getAttribute("href") !== "#main")
        .flatMap((a) => {
          const r = a.getBoundingClientRect();
          return r.width >= 24 - 0.05 && r.height >= 24 - 0.05
            ? []
            : [`${a.getAttribute("href")}: ${r.width} x ${r.height}`];
        }),
    );
    expect(small, "links smaller than 24 x 24 px").toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// C10. Keyboard

test.describe("C10. Keyboard", () => {
  for (const scheme of SCHEMES) {
    test(`C10 skip link first, Enter lands on main, Tab visits the back link and each PR link, each with one clear ring (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, 1440);

      // The stops: the DOM's links, skip link first, then the back link, then newest first.
      const expected = [
        "#main",
        "/",
        ...VALID.flatMap((e) => (e.pr ? [prHref(e.pr)] : [])),
      ];
      const stops = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")]
          .filter((a) => a.checkVisibility())
          .map((a) => a.getAttribute("href") ?? ""),
      );
      expect(stops, "the visible links in DOM order").toEqual(expected);

      const skip = page.locator('a[href="#main"]');
      const before = await skip.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      });
      expect(
        (before.width <= 1 && before.height <= 1) ||
          before.right <= 0 ||
          before.bottom <= 0,
        `skip link hidden before focus: ${JSON.stringify(before)}`,
      ).toBe(true);

      const colors = await resolveColors(page);
      const tokenRgba = new Map(
        Object.values(colors).map((c) => [c.computed, c.rgba] as const),
      );
      const [r = 0, g = 0, b = 0] = colors["--background"]?.rgba ?? [];
      const background: Rgb = [r, g, b];

      const visited: string[] = [];
      const problems: string[] = [];
      for (let presses = 0; presses < expected.length + 2; presses++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (el?.tagName !== "A") return null;
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            href: el.getAttribute("href") ?? "",
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
          };
        });
        if (!stop) break;
        visited.push(stop.href);
        const rgba = tokenRgba.get(stop.color);
        const why = [
          stop.seen ? "" : "can't be seen when focused",
          stop.width >= 2 ? "" : `ring width ${stop.width}`,
          ["none", "hidden"].includes(stop.style)
            ? `ring style ${stop.style}`
            : "",
          rgba ? "" : `ring colour ${stop.color} isn't a token`,
          !rgba || contrast(composite(rgba, background), background) >= 3
            ? ""
            : "ring contrast under 3",
          stop.offset >= 0 ? "" : `ring offset ${stop.offset}`,
        ].filter(Boolean);
        if (why.length) problems.push(`${stop.href}: ${why.join("; ")}`);
      }
      expect(visited, `Tab order (${scheme})`).toEqual(expected);
      expect(
        problems,
        `stops that are not seen or lack a clear ring (${scheme})`,
      ).toEqual([]);

      const tabindexes = await page.evaluate(() =>
        [...document.querySelectorAll("[tabindex]")].map(
          (el) =>
            `<${el.tagName.toLowerCase()}> tabindex="${el.getAttribute("tabindex")}"`,
        ),
      );
      expect(tabindexes, `tabindex attributes (${scheme})`).toEqual([
        '<main> tabindex="-1"',
      ]);

      // Enter on the skip link lands on main, which shows no ring; the next Tab is the back link.
      await open(page, 1440);
      expect(
        await tabTo(page, 'a[href="#main"]', 1),
        "the first Tab focuses the skip link",
      ).toBe(true);
      await page.keyboard.press("Enter");
      await expect
        .poll(() => new URL(page.url()).hash, "hash after Enter")
        .toBe("#main");
      const focus = await page.locator("main").evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          focused: el === document.activeElement,
          ringless:
            style.outlineStyle === "none" || style.outlineWidth === "0px",
        };
      });
      expect(focus.focused, "main is focused").toBe(true);
      expect(focus.ringless, "main shows no ring").toBe(true);
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.getAttribute("href")),
        "the Tab after the skip link's jump",
      ).toBe("/");
      if (VALID[0]?.pr) {
        await page.keyboard.press("Tab");
        expect(
          await page.evaluate(() =>
            document.activeElement?.getAttribute("href"),
          ),
          "then the newest entry's PR link",
        ).toBe(prHref(VALID[0].pr));
      }
    });
  }
});

// ---------------------------------------------------------------------------------------------
// C11. Nothing moves, nothing needs scripts

test.describe("C11. Nothing moves, nothing needs scripts", () => {
  test("C11.1 with scripts off, the server HTML already holds every entry", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(SPRINTS);
    expect(response?.status(), "status with scripts off").toBe(200);
    const found = await page.evaluate(
      (selector) => ({
        scriptsRan: typeof (self as { __next_f?: unknown }).__next_f,
        entries: document.querySelectorAll(selector).length,
        numbers: [...document.querySelectorAll(`${selector} h3`)].map((h) =>
          Number(h.textContent?.match(/^\s*Sprint\s+(\d+)/)?.[1]),
        ),
      }),
      ENTRIES,
    );
    await context.close();
    expect(found.scriptsRan, "page scripts ran").toBe("undefined");
    expect(found.entries, "entries in the server HTML").toBe(VALID.length);
    expect(found.numbers, "their numbers").toEqual(VALID.map((e) => e.sprint));
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("C11.2 with reduced motion nothing animates", async ({ page }) => {
      await open(page, 390);
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(done)),
      );
      const animations = await page.evaluate(() =>
        document
          .getAnimations()
          .map(
            (a) => (a.effect as KeyframeEffect | null)?.target?.tagName ?? "?",
          ),
      );
      expect(animations, "document.getAnimations()").toEqual([]);
    });
  });

  test("C11.2 with motion allowed only the h2s rise, and nothing in the list moves but a link's colour", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const width of [390, 1440]) {
      await open(page, width);
      const found = await page.evaluate((selector) => {
        const list = [
          ...document.querySelectorAll(`${selector}, ${selector} *`),
        ];
        const colourOnly = /color|^fill$|^stroke$|^--tw-gradient/;
        return {
          targets: document.getAnimations().map((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target;
            return target ? target.tagName : "?";
          }),
          inList: list.flatMap((el) => {
            const style = getComputedStyle(el);
            const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
            const problems: string[] = [];
            if (style.animationName !== "none")
              problems.push(`animation ${style.animationName}`);
            if (el.getAnimations().length > 0)
              problems.push("running animation");
            const moving = style.transitionDuration
              .split(",")
              .some((d) => Number.parseFloat(d) > 0);
            const properties = style.transitionProperty
              .split(",")
              .map((p) => p.trim());
            if (
              moving &&
              !(
                el.tagName === "A" &&
                properties.every((p) => colourOnly.test(p))
              )
            ) {
              problems.push(`transition ${style.transitionProperty}`);
            }
            return problems.length ? [`${name}: ${problems.join(", ")}`] : [];
          }),
        };
      }, ENTRIES);
      expect(
        found.targets.filter((tag) => tag !== "H2"),
        `animations whose target is not an h2 at ${width} px`,
      ).toEqual([]);
      expect(
        found.inList,
        `animation or transition under the entry list at ${width} px`,
      ).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// C12. The reader on bad data (no page: the reader is called on folders this test writes)

type ReaderEntry = {
  sprint: number;
  goal: string;
  size?: string;
  pr?: number;
  ownersCall: boolean;
  wentWrong: string[];
};
type Reader = (dir?: string) => ReaderEntry[];

// The reader is loaded when a test runs, from a path held in a variable: before the build, a plain
// import would fail typecheck and, worse, fail loading this whole file, so C1 to C11 would report
// an error instead of the missing route. This way C12 fails alone, naming the missing module.
const READER_MODULE = "../lib/sprint-log";

async function loadReader(): Promise<Reader> {
  const loaded = (await import(READER_MODULE)) as { readSprintLog?: unknown };
  if (typeof loaded.readSprintLog !== "function") {
    throw new Error("lib/sprint-log.ts must export the function readSprintLog");
  }
  return loaded.readSprintLog as Reader;
}

const made: string[] = [];
test.afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A sprint folder per key; an object is its retro.json, a string is its raw text, null has none. */
function folders(files: Record<string, unknown>) {
  const dir = mkdtempSync(join(tmpdir(), "sprint-log-"));
  made.push(dir);
  for (const [name, retro] of Object.entries(files)) {
    mkdirSync(join(dir, name));
    if (retro === null) continue;
    writeFileSync(
      join(dir, name, "retro.json"),
      typeof retro === "string" ? retro : JSON.stringify(retro),
    );
  }
  return dir;
}
const retroPath = (dir: string, folder: string) =>
  join(dir, folder, "retro.json");

/** Only the fields the interface fixes. `toEqual` treats an undefined field as a missing one. */
const view = (entry: ReaderEntry | undefined) =>
  entry && {
    sprint: entry.sprint,
    goal: entry.goal,
    size: entry.size,
    pr: entry.pr,
    ownersCall: entry.ownersCall,
    wentWrong: entry.wentWrong,
  };

/** The message of what `fn` throws, or null when it does not throw. */
function thrown(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return null;
}

/** A retro that is right in every part, with `change` laid over it; undefined removes a key. */
function retro(change: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    sprint: 1,
    goal: "A goal",
    size: "M",
    pr: 5,
    outcome: "merged",
    wentWrong: ["x"],
    ...change,
  };
  return Object.fromEntries(
    Object.entries(base).filter(([, value]) => value !== undefined),
  );
}
const right = {
  sprint: 1,
  goal: "A goal",
  size: "M",
  pr: 5,
  ownersCall: false,
  wentWrong: ["x"],
};

test.describe("C12. The reader on bad data", () => {
  test("C12.1 both retro shapes give an entry, camelCase wins when both are there, and folders sort by number", async () => {
    const read = await loadReader();
    const items = [{ what: "a", evidence: "e1" }, { what: "b" }];
    const dir = folders({
      "2": {
        sprint: 2,
        goal: "Roadmap item 2: snake",
        size: "M",
        pr: 12,
        outcome: "merged",
        went_wrong: items,
        fix_rounds: 1,
      },
      "10": {
        sprint: 10,
        goal: "Roadmap item: camel",
        size: "M",
        pr: 35,
        outcome: "merged",
        wentWrong: items,
        fixRounds: 1,
      },
      "9": { sprint: 9, goal: "both", wentWrong: ["new"], went_wrong: ["old"] },
    });
    const entries = read(dir);
    expect(
      entries.map((e) => e.sprint),
      "sprint numbers, folders 2, 10 and 9",
    ).toEqual([10, 9, 2]);
    const [camel, both, snake] = entries.map(view);
    expect(both?.wentWrong, "a retro with both fields").toEqual(["new"]);
    expect(camel?.wentWrong, "camelCase items").toEqual(["a", "b"]);
    expect(snake?.wentWrong, "snake_case items").toEqual(["a", "b"]);
    // The same content in the two shapes reads the same.
    expect({ ...camel, sprint: 0, goal: "", pr: 0 }).toEqual({
      ...snake,
      sprint: 0,
      goal: "",
      pr: 0,
    });
    expect(snake?.goal).toBe("Snake");
    expect(camel?.goal).toBe("Camel");
    expect(snake).toMatchObject({ size: "M", pr: 12, ownersCall: false });
    // An array wins even when empty; a value that is not an array falls through to the other key.
    const arrays = read(
      folders({ "1": retro({ wentWrong: [], went_wrong: ["old"] }) }),
    );
    expect(arrays[0]?.wentWrong, "wentWrong: [] over went_wrong").toEqual([]);
    const fallback = read(
      folders({ "1": retro({ wentWrong: "text", went_wrong: ["old"] }) }),
    );
    expect(
      fallback[0]?.wentWrong,
      "wentWrong a string, went_wrong an array",
    ).toEqual(["old"]);
  });

  test("C12.2 a missing or wrong optional part leaves the entry in with that part undefined", async () => {
    const read = await loadReader();
    const cases: [string, Record<string, unknown>, Partial<typeof right>][] = [
      ["no size", { size: undefined }, { size: undefined }],
      ['size "XL"', { size: "XL" }, { size: undefined }],
      ["size a number", { size: 3 }, { size: undefined }],
      ["no pr", { pr: undefined }, { pr: undefined }],
      ['pr "36"', { pr: "36" }, { pr: undefined }],
      ["pr -1", { pr: -1 }, { pr: undefined }],
      ["pr 0", { pr: 0 }, { pr: undefined }],
      ["pr 2.5", { pr: 2.5 }, { pr: undefined }],
      ["no outcome", { outcome: undefined }, { ownersCall: false }],
      ["outcome a number", { outcome: 7 }, { ownersCall: false }],
      ["no went wrong at all", { wentWrong: undefined }, { wentWrong: [] }],
      ["wentWrong a string", { wentWrong: "it broke" }, { wentWrong: [] }],
      [
        "wentWrong an object",
        { wentWrong: { what: "it broke" } },
        { wentWrong: [] },
      ],
      [
        "items that are a number, null, an object with no what, a blank what, a what that is a number and blank text",
        {
          wentWrong: [5, null, {}, { what: "  " }, { what: 3 }, "   ", "keep"],
        },
        { wentWrong: ["keep"] },
      ],
      [
        "four items: three kept",
        { wentWrong: ["a", "b", "c", "d"] },
        { wentWrong: ["a", "b", "c"] },
      ],
      [
        "a skipped item does not use up one of the three",
        { wentWrong: ["a", 5, { what: "b" }, null, "c", "d"] },
        { wentWrong: ["a", "b", "c"] },
      ],
    ];
    for (const [name, change, expected] of cases) {
      const entries = read(folders({ "1": retro(change) }));
      expect(entries, `${name}: the entry is still there`).toHaveLength(1);
      expect(view(entries[0]), name).toEqual({ ...right, ...expected });
    }
    // The snake_case shape gives the same result for the same items.
    for (const [name, change, expected] of cases.filter(
      ([, change]) => "wentWrong" in change,
    )) {
      const { wentWrong, ...rest } = change;
      const entries = read(
        folders({
          "1": retro({ ...rest, wentWrong: undefined, went_wrong: wentWrong }),
        }),
      );
      expect(view(entries[0]), `snake_case: ${name}`).toEqual({
        ...right,
        ...expected,
      });
    }
  });

  test("C12.3 a required part that is wrong throws, naming the file; no retro.json is skipped", async () => {
    const read = await loadReader();
    const bad: [string, Record<string, unknown>, string][] = [
      ["invalid JSON", { "3": "{ not json" }, "3"],
      ["no sprint", { "3": retro({ sprint: undefined }) }, "3"],
      ['sprint: "7"', { "7": retro({ sprint: "7" }) }, "7"],
      ["sprint: 0", { "3": retro({ sprint: 0 }) }, "3"],
      ["sprint: 1.5", { "3": retro({ sprint: 1.5 }) }, "3"],
      ["no goal", { "3": retro({ sprint: 3, goal: undefined }) }, "3"],
      ["a blank goal", { "3": retro({ sprint: 3, goal: "  \n" }) }, "3"],
      ["a goal that is a number", { "3": retro({ sprint: 3, goal: 4 }) }, "3"],
      ["folder 5 holding sprint 6", { "5": retro({ sprint: 6 }) }, "5"],
      // Two folders cannot share a number, so this one breaks both the repeat and the folder rule;
      // either way it must throw, naming one of the two files.
      [
        "two folders with the same sprint",
        { "4": retro({ sprint: 4 }), "5": retro({ sprint: 4 }) },
        "5",
      ],
    ];
    for (const [name, files, culprit] of bad) {
      const dir = folders(files);
      const message = thrown(() => read(dir));
      expect(message, `${name}: the reader throws`).not.toBeNull();
      const paths = Object.keys(files).map((folder) => retroPath(dir, folder));
      if (name.startsWith("two folders")) {
        expect(
          paths.some((path) => message?.includes(path)),
          `${name}: the message names a file (${message})`,
        ).toBe(true);
      } else {
        expect(message, `${name}: the message names the file`).toContain(
          retroPath(dir, culprit),
        );
      }
    }

    const none = read(folders({}));
    expect(none, "an empty folder").toEqual([]);
    const skipped = folders({ "3": null, "4": retro({ sprint: 4 }) });
    expect(
      read(skipped).map((e) => e.sprint),
      "a folder with no retro.json is skipped",
    ).toEqual([4]);
    expect(
      read(folders({ "1": null })),
      "only a folder with no retro.json",
    ).toEqual([]);
  });

  test("C12.4 Owner's call comes from needs-owner in outcome, with a word boundary", async () => {
    const read = await loadReader();
    const outcomes: [string | number | undefined, boolean][] = [
      ["needs-owner", true],
      ["Not merged: left open with needs-owner", true],
      ["OPEN, NEEDS-OWNER", true],
      ["merged", false],
      ["shipped once the gate lands", false],
      [undefined, false],
      [7, false],
      ["needs-owners", false],
    ];
    const files = Object.fromEntries(
      outcomes.map(([outcome], i) => [
        String(i + 1),
        retro({ sprint: i + 1, outcome }),
      ]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(entries, "all eight entries").toHaveLength(outcomes.length);
    for (const [i, [outcome, wanted]] of outcomes.entries()) {
      expect(entries[i]?.ownersCall, `outcome ${JSON.stringify(outcome)}`).toBe(
        wanted,
      );
    }
  });

  test("C12.5 the goal loses its Roadmap item prefix and gains a capital; backticks go; a blank goal throws", async () => {
    const read = await loadReader();
    const goals: [string, string][] = [
      ["Roadmap item 4: section reveal", "Section reveal"],
      ["roadmap item: a subtle 3D", "A subtle 3D"],
      ["ROADMAP ITEM 12: shout", "Shout"],
      ["plain goal", "Plain goal"],
      [
        "Use `pnpm verify` before the Roadmap item: ends",
        "Use pnpm verify before the Roadmap item: ends",
      ],
    ];
    const files = Object.fromEntries(
      goals.map(([goal], i) => [
        String(i + 1),
        retro({
          sprint: i + 1,
          goal,
          wentWrong: ["Run `pnpm test` twice", { what: "`x` broke" }],
        }),
      ]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(
      entries.map((e) => e.goal),
      "goals as presented",
    ).toEqual(goals.map(([, wanted]) => wanted));
    for (const entry of entries) {
      expect(
        entry.wentWrong,
        `backticks in the items of sprint ${entry.sprint}`,
      ).toEqual(["Run pnpm test twice", "x broke"]);
    }

    const dir = folders({ "3": retro({ sprint: 3, goal: "Roadmap item:" }) });
    const message = thrown(() => read(dir));
    expect(
      message,
      "a goal that is only the prefix is blank, so the reader throws",
    ).not.toBeNull();
    expect(message, "and names the file").toContain(retroPath(dir, "3"));
  });

  test("C12.7 a trailing size tag leaves the goal; any other parenthetical stays; a goal of only a tag throws", async () => {
    const read = await loadReader();
    const goals: [string, string][] = [
      ["Goal (M)", "Goal"],
      ["Goal (S)", "Goal"],
      ["Goal (L)", "Goal"],
      ["goal (l)", "Goal"],
      ["Goal ( m )", "Goal"],
      ["Goal   (S)  ", "Goal"],
      ["Goal\t(M)", "Goal"],
      ["Roadmap item 3: the thing (M)", "The thing"],
      ["Goal (M, x)", "Goal (M, x)"],
      ["Goal (L, contract step)", "Goal (L, contract step)"],
      ["Goal (MS)", "Goal (MS)"],
      ["Goal (XL)", "Goal (XL)"],
      ["Goal (M) and more", "Goal (M) and more"],
      ["Goal (a thing (M))", "Goal (a thing (M))"],
      ["Goal (5 colors) (L)", "Goal (5 colors)"],
    ];
    const files = Object.fromEntries(
      goals.map(([goal], i) => [String(i + 1), retro({ sprint: i + 1, goal })]),
    );
    const entries = read(folders(files)).sort((a, b) => a.sprint - b.sprint);
    expect(
      entries.map((e) => e.goal),
      "goals as presented",
    ).toEqual(goals.map(([, wanted]) => wanted));

    for (const only of ["(L)", " (m) ", "Roadmap item 2: (S)"]) {
      const dir = folders({ "3": retro({ sprint: 3, goal: only }) });
      const message = thrown(() => read(dir));
      expect(
        message,
        `a goal of only ${JSON.stringify(only)} is blank, so the reader throws`,
      ).not.toBeNull();
      expect(message, "and names the file").toContain(retroPath(dir, "3"));
    }
  });

  test("C12.6 the default folder is .crew/sprint, and reads the same as the oracle", async () => {
    const read = await loadReader();
    const entries = read();
    expect(
      entries.map((e) => e.sprint),
      "sprint numbers",
    ).toEqual(VALID.map((e) => e.sprint));
    for (const [i, expected] of VALID.entries()) {
      expect(view(entries[i]), `sprint ${expected.sprint}`).toEqual({
        sprint: expected.sprint,
        goal: expected.goal,
        size: expected.size,
        pr: expected.pr,
        ownersCall: expected.ownersCall,
        wentWrong: expect.anything(),
      });
      expect(
        entries[i]?.wentWrong.map(squash),
        `items of sprint ${expected.sprint}`,
      ).toEqual(shown(expected));
    }
  });
});

// ---------------------------------------------------------------------------------------------
// C13.1 (the contract puts it in this spec): the route reads only the team's files

test("C13.1 the reader and app/sprints/ name no content/ path and use only profile.name of the owner's facts", () => {
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
      // The one import the contract allows, for the back link's text.
      .replace(/["']@\/content\/profile["']/g, "");
  const route = existsSync("app/sprints")
    ? readdirSync("app/sprints", { recursive: true, encoding: "utf8" })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => join("app/sprints", file))
    : [];
  const files = ["lib/sprint-log.ts", ...route];
  expect(
    files.filter((file) => existsSync(file)),
    "the reader and the route exist",
  ).toEqual(expect.arrayContaining(["lib/sprint-log.ts"]));
  expect(route, "files under app/sprints/").not.toEqual([]);
  const hits = files
    .filter((file) => existsSync(file))
    .flatMap((file) => {
      const source = code(file);
      return [
        ...(/\bcontent\//.test(source)
          ? [`${file}: names a content/ path`]
          : []),
        ...(/\bprofile\.(?!name\b)\w+/.test(source)
          ? [`${file}: uses a profile field other than name`]
          : []),
      ];
    });
  expect(hits).toEqual([]);
});
