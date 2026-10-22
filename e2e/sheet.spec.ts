import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, type Response, test } from "@playwright/test";
import { profile } from "../content/profile";
import { DARK, LIGHT } from "../lib/site";
import {
  hexToRgb,
  horizontalOverflow,
  installRgba,
  resolveColors,
  rootTokens,
  SCHEMES,
} from "./helpers";
import { bioParts, MERGED, ROWS } from "./retros";

// Sprint 22, B1: the sheet in 2D (.crew/sprint/22/contract.md). The page's checks B1.1 to B1.3,
// B1.5 to B1.7, B1.10 and B1.11, one test per number, written before the build. The drawing's own
// checks (B1.4, B1.8, B1.9) are in plan.spec.ts. Facts are imported from content/profile.ts and
// the retro files are read by e2e/retros.ts, the contract's data rules in this suite's own lines.
//
// Hooks the contract names and these checks rely on: `main > header` (the title block), the bar as
// a `<header>` with a `<nav>` before `main`, `section[aria-labelledby="revisions"]` with its h2
// `#revisions` and a `<table>`, the facts' h2 ids `work` to `contact`. The legend is found by its
// words ("seated", "original"), outside any svg.

const REVISIONS = 'section[aria-labelledby="revisions"]';
const SPRINTS_ENTRIES = "main section ol > li";
const HEADS = ["Rev", "Description", "Drawn", "Checked", "Tested", "Approved"];
const [BIO_1 = "", BIO_2 = "", ...BIO_REST] = bioParts(profile.bio);
const TITLE_BIO = `${BIO_1} ${BIO_2}`;
const CAPTION = BIO_REST.join(" ");
const N = MERGED.length;

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

type Rgba = number[] | null;
type Box = { left: number; top: number; right: number; bottom: number };

test.beforeEach(async ({ context }) => {
  await context.addInitScript(installRgba);
});

async function open(page: Page, width: number, height = 900, url = "/") {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
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

/** A token as [r, g, b, a], through the page's own canvas. */
async function tokenRgba(page: Page, name: string): Promise<Rgba> {
  return page.evaluate((token) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    const rgba = (window as Window & { __rgba?: (c: string) => Rgba }).__rgba;
    return probe.style.color && rgba ? rgba(color) : null;
  }, name);
}

const sameColor = (a: Rgba, b: Rgba) =>
  Boolean(
    a &&
      b &&
      a.every(
        (value, i) => Math.abs(value - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
      ),
  );

// ---------------------------------------------------------------------------------------------

test("B1.1 the first screen says who and what: the name, role, bio, contact and revisions are in the first viewport, and the name is the largest text", async ({
  page,
}) => {
  for (const [width, height, withRows] of [
    [1440, 900, true],
    [390, 844, false],
  ] as const) {
    await open(page, width, height);
    const where = `${width} x ${height}`;
    const found = await page.evaluate(
      ({ texts, links, revisions }) => {
        const squashed = (el: Element) =>
          (el.textContent ?? "").replace(/\s+/g, " ").trim();
        const header = document.querySelector("main > header");
        // The deepest element in the title block that holds the whole phrase.
        const holding = (phrase: string) =>
          [...(header?.querySelectorAll("*") ?? [])]
            .filter((el) => squashed(el).includes(phrase))
            .at(-1) ?? null;
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        };
        return {
          viewport: {
            width: document.documentElement.clientWidth,
            height: innerHeight,
          },
          items: [
            { what: "the h1", box: box(header?.querySelector("h1") ?? null) },
            ...texts.map((text) => ({
              what: `"${text.slice(0, 40)}"`,
              box: box(holding(text)),
            })),
            ...links.map((href) => ({
              what: `the title block's link to ${href}`,
              box: box(header?.querySelector(`a[href="${href}"]`) ?? null),
            })),
          ],
          rows: [
            ...document.querySelectorAll(`${revisions} table tbody tr`),
          ].map((tr, i) => ({ what: `revision row ${i + 1}`, box: box(tr) })),
        };
      },
      {
        texts: [profile.headline, TITLE_BIO],
        links: profile.links.map((link) => link.href),
        revisions: REVISIONS,
      },
    );
    const inside = (b: Box | null) =>
      b !== null &&
      b.left >= -0.5 &&
      b.top >= -0.5 &&
      b.right <= found.viewport.width + 0.5 &&
      b.bottom <= found.viewport.height + 0.5;
    const checked = withRows ? [...found.items, ...found.rows] : found.items;
    if (withRows) {
      expect.soft(found.rows, `revision rows at ${where}`).toHaveLength(5);
    }
    expect
      .soft(
        checked
          .filter(({ box }) => !inside(box))
          .map(({ what, box }) => `${what}: ${JSON.stringify(box)}`),
        `not wholly inside the first viewport at ${where}`,
      )
      .toEqual([]);

    const sizes = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const others = [...document.body.querySelectorAll("*")]
        .filter(
          (el) =>
            el !== h1 &&
            !h1?.contains(el) &&
            el.getClientRects().length > 0 &&
            [...el.childNodes].some(
              (node) =>
                node.nodeType === Node.TEXT_NODE &&
                (node.textContent ?? "").trim() !== "",
            ),
        )
        .map((el) => ({
          el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 30)}"`,
          size: Number.parseFloat(getComputedStyle(el).fontSize),
        }));
      return {
        h1: h1 ? Number.parseFloat(getComputedStyle(h1).fontSize) : 0,
        others,
      };
    });
    expect(sizes.h1, `the h1's font size at ${where}`).toBeGreaterThan(0);
    expect
      .soft(
        sizes.others.filter(({ size }) => size >= sizes.h1),
        `text as large as the h1 (${sizes.h1} px) at ${where}`,
      )
      .toEqual([]);
  }
});

test("B1.2 the title block is the owner's words, verbatim, and the bio's last part is the revisions' caption", async ({
  page,
}) => {
  expect(
    BIO_REST.length,
    "the bio has a part after its first two",
  ).toBeGreaterThan(0);
  await open(page, 1440);
  const found = await page.evaluate((revisions) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const header = document.querySelector("main > header");
    const h1 = header?.querySelector("h1") ?? null;
    const legend =
      [...document.querySelectorAll("body *")]
        .filter(
          (el) =>
            !el.closest("svg") &&
            !["MAIN", "BODY"].includes(el.tagName) &&
            /\bseated\b/i.test(el.textContent ?? "") &&
            /\boriginal\b/i.test(el.textContent ?? ""),
        )
        .at(-1) ?? null;
    const section = document.querySelector(revisions);
    const follows = (el: Element | null) =>
      Boolean(
        h1 &&
          el &&
          h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    return {
      header: header !== null,
      h1: squashed(h1),
      text: squashed(header),
      links: [...(header?.querySelectorAll("a") ?? [])].map((a) => ({
        label: squashed(a),
        href: a.getAttribute("href"),
      })),
      caption: squashed(section),
      legend: legend !== null,
      beforeLegend: follows(legend),
      beforeRevisions: follows(section),
    };
  }, REVISIONS);
  expect(found.header, "main > header").toBe(true);
  expect.soft(found.h1, "the h1").toBe(profile.name);
  for (const [what, text] of [
    ["headline", profile.headline],
    ["location", profile.location],
    ["the bio's first two parts", TITLE_BIO],
  ] as const) {
    expect
      .soft(found.text, `the title block holds the ${what}`)
      .toContain(text);
  }
  expect
    .soft(
      found.text,
      "the title block leaves the bio's last part to the caption",
    )
    .not.toContain(CAPTION);
  expect
    .soft(found.links, "the title block's links, as label and href")
    .toEqual(expect.arrayContaining(profile.links));
  expect.soft(found.caption, "the revision block's caption").toContain(CAPTION);
  expect.soft(found.legend, "the drawing's legend is on the page").toBe(true);
  expect.soft(found.beforeLegend, "the h1 comes before the legend").toBe(true);
  expect
    .soft(found.beforeRevisions, "the h1 comes before the revision block")
    .toBe(true);
});

test("B1.3 the labelled bar: the wordmark, then Work, Log and Contact, each a 24 px target that lands on its target", async ({
  page,
}) => {
  const readBar = () =>
    page.evaluate(() => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const main = document.querySelector("main");
      const header = [...document.querySelectorAll("header")].find(
        (h) =>
          !h.closest("main") &&
          main !== null &&
          Boolean(
            h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
          ) &&
          h.querySelector("nav") !== null,
      );
      const nav = header?.querySelector("nav") ?? null;
      const labelledBy = (nav?.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .map((id) => squashed(document.getElementById(id)))
        .join(" ");
      const controls = [
        ...(header?.querySelectorAll(
          'a, button, input, select, [role="button"], [role="link"]',
        ) ?? []),
      ].filter((el) => el.getAttribute("href") !== "#main");
      const wordmark = [...(header?.querySelectorAll("*") ?? [])].find(
        (el) => squashed(el) === "Theseus",
      );
      const first = nav?.querySelector("a") ?? null;
      const cw = document.documentElement.clientWidth;
      return {
        header: header !== undefined,
        name: (nav?.getAttribute("aria-label") ?? labelledBy).trim(),
        controls: controls.map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: squashed(el),
          href: el.getAttribute("href"),
          inNav: nav?.contains(el) ?? false,
        })),
        wordmark: wordmark !== undefined,
        wordmarkLinked: Boolean(wordmark?.closest("a")),
        wordmarkFirst: Boolean(
          wordmark &&
            first &&
            wordmark.compareDocumentPosition(first) &
              Node.DOCUMENT_POSITION_FOLLOWING,
        ),
        targets: [...(nav?.querySelectorAll("a") ?? [])].map((a) => {
          const r = a.getBoundingClientRect();
          return { text: squashed(a), width: r.width, height: r.height };
        }),
        sticking: [...(header?.querySelectorAll("*") ?? [])]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.left < -0.5 || r.right > cw + 0.5);
          })
          .map(
            (el) =>
              `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 20)}"`,
          ),
        headerOverflow: header ? header.scrollWidth - header.clientWidth : -1,
        targetsExist: ["work", "contact"].map((id) => ({
          id,
          exists: document.getElementById(id) !== null,
        })),
      };
    });

  await open(page, 390);
  const bar = await readBar();
  expect(bar.header, "a <header> with a <nav>, before main").toBe(true);
  expect.soft(bar.name, "the nav's accessible name").not.toBe("");
  expect.soft(bar.controls, "the bar's links and buttons, in order").toEqual([
    { tag: "a", text: "Work", href: "#work", inNav: true },
    { tag: "a", text: "Log", href: "/sprints", inNav: true },
    { tag: "a", text: "Contact", href: "#contact", inNav: true },
  ]);
  expect.soft(bar.wordmark, 'the wordmark "Theseus"').toBe(true);
  expect.soft(bar.wordmarkLinked, "the wordmark is a link").toBe(false);
  expect
    .soft(bar.wordmarkFirst, "the wordmark comes before the links")
    .toBe(true);
  expect.soft(bar.targetsExist, "the fragment targets").toEqual([
    { id: "work", exists: true },
    { id: "contact", exists: true },
  ]);
  expect
    .soft(
      bar.targets.filter(
        ({ width, height }) => width < 24 - 0.05 || height < 24 - 0.05,
      ),
      "bar links smaller than 24 x 24 px at 390",
    )
    .toEqual([]);

  await open(page, 320);
  const narrow = await readBar();
  expect.soft(await horizontalOverflow(page), "page overflow at 320").toBe(0);
  expect
    .soft(narrow.headerOverflow, "the bar's own overflow at 320")
    .toBeLessThanOrEqual(0);
  expect
    .soft(narrow.sticking, "bar elements past the viewport at 320")
    .toEqual([]);

  // Following each link lands on its target, not under the bar.
  for (const width of [390, 1440]) {
    for (const [text, id] of [
      ["Work", "work"],
      ["Contact", "contact"],
    ] as const) {
      await open(page, width);
      await page.locator("header nav a", { hasText: text }).first().click();
      await expect
        .poll(() => new URL(page.url()).hash, `hash after ${text} at ${width}`)
        .toBe(`#${id}`);
      await expect
        .poll(
          () =>
            page.evaluate((target) => {
              const el = document.getElementById(target);
              const bar = document.querySelector("header:has(nav)");
              if (!el) return "missing";
              const r = el.getBoundingClientRect();
              const under = bar
                ? Math.max(0, bar.getBoundingClientRect().bottom)
                : 0;
              return r.top >= under - 1 && r.top < innerHeight
                ? "in view"
                : `top ${r.top}, bar ${under}`;
            }, id),
          `#${id} in view and clear of the bar after ${text} at ${width}`,
        )
        .toBe("in view");
    }
    await open(page, width);
    await page.locator("header nav a", { hasText: "Log" }).first().click();
    await page.waitForURL("**/sprints");
    await expect(page.locator("h1"), `after Log at ${width}`).toHaveText(
      "Build log",
    );
  }
});

test("B1.5 the revision block: Revisions, the caption, the six columns, five rows from the retros and one link to the Log, at every width", async ({
  page,
}) => {
  const entries = async () => {
    await open(page, 1440, 900, "/sprints");
    return page.locator(SPRINTS_ENTRIES).count();
  };
  expect(
    await entries(),
    "entries /sprints renders, against valid retros",
  ).toBe(N);

  const read = () =>
    page.evaluate((selector) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const section = document.querySelector(selector);
      const cw = document.documentElement.clientWidth;
      return {
        section: section !== null,
        h2: [...(section?.querySelectorAll("h2") ?? [])].map((h) => ({
          id: h.id,
          text: squashed(h),
        })),
        text: squashed(section),
        heads: [
          ...(section?.querySelectorAll('table th[scope="col"]') ?? []),
        ].map((th) => squashed(th)),
        rows: [...(section?.querySelectorAll("table tbody tr") ?? [])].map(
          (tr) => ({
            cells: [...tr.querySelectorAll(":scope > th, :scope > td")].map(
              (c) => squashed(c),
            ),
            seen: tr.checkVisibility({
              opacityProperty: true,
              visibilityProperty: true,
            }),
            clipped: [...tr.querySelectorAll("*")]
              .filter((el) => {
                const s = getComputedStyle(el);
                return (
                  (s.overflowX !== "visible" &&
                    el.scrollWidth > el.clientWidth + 1) ||
                  (s.webkitLineClamp !== "none" &&
                    el.scrollHeight > el.clientHeight + 1)
                );
              })
              .map(
                (el) =>
                  `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 30)}"`,
              ),
            outside: [...tr.querySelectorAll(":scope > th, :scope > td")].some(
              (c) => {
                const r = c.getBoundingClientRect();
                return r.left < -0.5 || r.right > cw + 0.5;
              },
            ),
          }),
        ),
        links: [...(section?.querySelectorAll("a") ?? [])].map((a) => ({
          text: squashed(a),
          href: a.getAttribute("href"),
        })),
      };
    }, REVISIONS);

  const expected = ROWS.map((row) => [
    row.rev,
    row.description,
    row.drawn,
    row.checked,
    row.tested,
    row.approved,
  ]);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await open(page, width);
    const found = await read();
    const where = `${width} px`;
    expect(found.section, `${REVISIONS} at ${where}`).toBe(true);
    expect
      .soft(found.h2, `its h2 at ${where}`)
      .toEqual([{ id: "revisions", text: "Revisions" }]);
    expect.soft(found.text, `its caption at ${where}`).toContain(CAPTION);
    expect.soft(found.heads, `its column heads at ${where}`).toEqual(HEADS);
    expect
      .soft(
        found.rows.map((r) => r.cells),
        `its rows at ${where}`,
      )
      .toEqual(expected);
    expect
      .soft(found.rows.filter((r) => !r.seen).length, `rows hidden at ${where}`)
      .toBe(0);
    expect
      .soft(
        found.rows.flatMap((r) => r.clipped),
        `truncated cells at ${where}`,
      )
      .toEqual([]);
    expect
      .soft(found.links, `its links at ${where}`)
      .toEqual([{ text: `All ${N} revisions in the Log`, href: "/sprints" }]);
    if (width === 320) {
      expect
        .soft(await horizontalOverflow(page), "page overflow at 320")
        .toBe(0);
      expect
        .soft(
          found.rows.filter((r) => r.outside).length,
          "rows with a cell past the viewport at 320",
        )
        .toBe(0);
    }
  }
});

// The reader's interface for the revision cells (Forge implements it in lib/sprint-log.ts, beside
// `ownersCall`): each entry gains `drawn` (the names, in the contract's order, [] for none),
// `checked` (Lens) and `tested` (Probe), both booleans. Loaded at run time, as C12 loads it, so a
// reader without them fails here alone.
type RevisionEntry = {
  sprint: number;
  ownersCall: boolean;
  drawn?: unknown;
  checked?: unknown;
  tested?: unknown;
};
const READER_MODULE = "../lib/sprint-log";

test("B1.5 the reader: the role rule, Lens and Probe on fixtures, and the Owner set on the retros", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import(
    "node:fs"
  );
  const { tmpdir } = await import("node:os");
  const loaded = (await import(READER_MODULE)) as { readSprintLog?: unknown };
  expect(
    typeof loaded.readSprintLog,
    "lib/sprint-log.ts exports readSprintLog",
  ).toBe("function");
  const read = loaded.readSprintLog as (dir?: string) => RevisionEntry[];

  const roles = (...list: unknown[]) => list.map((role) => ({ role }));
  const cases: [
    string,
    Record<string, unknown>,
    { drawn: string[]; checked: boolean; tested: boolean },
  ][] = [
    [
      "Forge, Pixel and Iris",
      {
        agents: roles("design-director", "creative-engineer", "engineer"),
        lens: { runs: 2 },
      },
      { drawn: ["Forge", "Pixel"], checked: true, tested: false },
    ],
    [
      "Pixel alone of the builders",
      {
        agents: roles("creative-engineer", "qa-engineer", "design-director"),
        lens: { runs: 1 },
      },
      { drawn: ["Pixel"], checked: true, tested: true },
    ],
    [
      "Quill and Iris, no builder",
      { agents: roles("qa-engineer", "product-owner", "design-director") },
      { drawn: ["Iris", "Quill"], checked: false, tested: true },
    ],
    [
      "Quill twice",
      { agents: roles("product-owner", "product-owner") },
      { drawn: ["Quill"], checked: false, tested: false },
    ],
    [
      "Probe alone",
      { agents: roles("qa-engineer"), lens: { runs: 1 } },
      { drawn: [], checked: true, tested: true },
    ],
    [
      "the old shape",
      { lens_important_findings: 0 },
      { drawn: [], checked: true, tested: false },
    ],
    [
      "no lens runs",
      { agents: roles("engineer"), lens: { runs: 0 } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "runs not an integer",
      { agents: roles("engineer"), lens: { runs: 1.5 } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "runs a string",
      { agents: roles("engineer"), lens: { runs: "2" } },
      { drawn: ["Forge"], checked: false, tested: false },
    ],
    [
      "agents not a list",
      { agents: "engineer", lens: "yes" },
      { drawn: [], checked: false, tested: false },
    ],
    [
      "malformed agents",
      {
        agents: [null, "engineer", { role: 5 }, { name: "x" }],
        lens_important_findings: "1",
      },
      { drawn: [], checked: false, tested: false },
    ],
  ];
  const dir = mkdtempSync(join(tmpdir(), "revisions-"));
  try {
    for (const [i, [, change]] of cases.entries()) {
      const sprint = i + 1;
      mkdirSync(join(dir, String(sprint)));
      writeFileSync(
        join(dir, String(sprint), "retro.json"),
        JSON.stringify({
          sprint,
          goal: "A goal",
          outcome: "merged",
          ...change,
        }),
      );
    }
    let entries: RevisionEntry[] = [];
    expect(() => {
      entries = read(dir);
    }, "the reader never throws on a missing or malformed role field").not.toThrow();
    for (const [i, [what, , wanted]] of cases.entries()) {
      const entry = entries.find((e) => e.sprint === i + 1);
      expect
        .soft(
          entry && {
            drawn: entry.drawn,
            checked: entry.checked,
            tested: entry.tested,
          },
          what,
        )
        .toEqual(wanted);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // The retros on record: the owner's call 3, and the same cells as this suite's oracle.
  const record = read();
  expect(
    record
      .filter((e) => e.sprint <= 21 && e.ownersCall)
      .map((e) => e.sprint)
      .sort((a, b) => a - b),
    "sprints up to 21 the owner approved",
  ).toEqual([1, 2, 7, 9, 10, 12, 15]);
  for (const retro of MERGED) {
    const entry = record.find((e) => e.sprint === retro.sprint);
    expect
      .soft(
        entry && {
          drawn: entry.drawn,
          checked: entry.checked,
          tested: entry.tested,
        },
        `sprint ${retro.sprint}`,
      )
      .toEqual({
        drawn: retro.drawn,
        checked: retro.checked,
        tested: retro.tested,
      });
  }
});

// B1.6: one test per page and scheme, a template counted once.
type Paint = { where: string; property: string };

/** Everything painted in the accent: text, grounds, borders, rings, underlines and SVG paint. */
function accentPaint(page: Page, accent: Rgba) {
  return page.evaluate((target) => {
    const rgba = (
      window as Window & { __rgba?: (c: string) => number[] | null }
    ).__rgba;
    if (!rgba || !target)
      return [{ where: "page", property: "no __rgba or accent" }];
    const same = (value: string) => {
      const c = rgba(value);
      return Boolean(
        c?.every(
          (v, i) => Math.abs(v - (target[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
        ),
      );
    };
    const hits: { where: string; property: string }[] = [];
    const ownText = (el: Element) =>
      [...el.childNodes].some(
        (n) =>
          n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
    for (const el of [
      document.documentElement,
      ...document.body.querySelectorAll("*"),
    ]) {
      if (el.getClientRects().length === 0 && el !== document.documentElement)
        continue;
      const name = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`;
      for (const pseudo of [null, "::before", "::after"] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && ["none", "normal"].includes(s.content)) continue;
        const where = `${name}${pseudo ?? ""}`;
        const check = (property: string, value: string, painted = true) => {
          if (painted && same(value)) hits.push({ where, property });
        };
        check(
          "color",
          s.color,
          pseudo !== null || ownText(el) || el.tagName === "A",
        );
        check("background-color", s.backgroundColor);
        for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
          check(
            `border-${side.toLowerCase()}-color`,
            s[`border${side}Color`],
            s[`border${side}Style`] !== "none" &&
              Number.parseFloat(s[`border${side}Width`]) > 0,
          );
        }
        check(
          "outline-color",
          s.outlineColor,
          s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0,
        );
        check(
          "text-decoration-color",
          s.textDecorationColor,
          s.textDecorationLine !== "none",
        );
        if (el instanceof SVGElement && !pseudo) {
          check("fill", s.fill, s.fill !== "none");
          check("stroke", s.stroke, s.stroke !== "none");
        }
      }
    }
    return hits;
  }, accent);
}

for (const scheme of SCHEMES) {
  for (const route of ["/", "/sprints"]) {
    test(`B1.6 nothing is copper: no --accent at rest, hovered or focused; links are ink and underlined; the ring is 2 px of ink, 2 px out (${route}, ${scheme})`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({
        colorScheme: scheme,
        reducedMotion: "no-preference",
      });
      await open(page, 1440, 900, route);
      const accent = await tokenRgba(page, "--accent");
      const ink = await tokenRgba(page, "--foreground");
      expect(accent, "--accent resolves").not.toBeNull();
      expect(ink, "--foreground resolves").not.toBeNull();
      const hits: Paint[] = [];
      const note = (state: string, found: Paint[]) => {
        for (const hit of found)
          hits.push({
            where: `${state}: ${hit.where}`,
            property: hit.property,
          });
      };
      await page.mouse.move(0, 0);
      await settled(page);
      note("at rest", await accentPaint(page, accent));

      // Links: ink, and underlined but for the bar's navigation (the frames draw it bare).
      const links = await page.evaluate(() => {
        const rgba = (
          window as Window & { __rgba?: (c: string) => number[] | null }
        ).__rgba;
        return [...document.querySelectorAll("a[href]")]
          .filter(
            (a) =>
              a.getAttribute("href") !== "#main" &&
              a.getClientRects().length > 0,
          )
          .map((a) => {
            const s = getComputedStyle(a);
            return {
              href: a.getAttribute("href") ?? "",
              color: rgba ? rgba(s.color) : null,
              underlined: s.textDecorationLine.includes("underline"),
              inBar: a.closest("header nav") !== null && !a.closest("main"),
            };
          });
      });
      expect(links.length, "links on the page").toBeGreaterThan(0);
      expect
        .soft(
          links
            .filter((link) => !sameColor(link.color, ink))
            .map((link) => link.href),
          "links not in --foreground",
        )
        .toEqual([]);
      expect
        .soft(
          links
            .filter((link) => !link.inBar && !link.underlined)
            .map((link) => link.href),
          "links outside the bar that aren't underlined",
        )
        .toEqual([]);

      // Hover each link.
      const count = await page.locator("a[href]").count();
      for (let i = 0; i < count; i++) {
        const link = page.locator("a[href]").nth(i);
        const href = (await link.getAttribute("href")) ?? "";
        // The skip link is a 1 px box until focused; the Tab walk below covers it.
        if (href === "#main" || !(await link.isVisible())) continue;
        await link.hover();
        await settled(page);
        note(`hovering ${href}`, await accentPaint(page, accent));
      }
      await page.mouse.move(0, 0);

      // Tab through every stop: the ring, and no copper anywhere while it shows.
      await open(page, 1440, 900, route);
      const stops = await page.locator("a[href], button").count();
      const rings: string[] = [];
      for (let press = 0; press < stops + 1; press++) {
        await page.keyboard.press("Tab");
        await settled(page);
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const rgba = (
            window as Window & { __rgba?: (c: string) => number[] | null }
          ).__rgba;
          // A card may wear its link's ring.
          const holder = [el, el.closest("li")].find(
            (c) => c && getComputedStyle(c).outlineStyle !== "none",
          );
          const s = holder ? getComputedStyle(holder) : null;
          return {
            href: el.getAttribute("href") ?? el.tagName.toLowerCase(),
            style: s?.outlineStyle ?? "none",
            width: s ? Number.parseFloat(s.outlineWidth) : 0,
            offset: s ? Number.parseFloat(s.outlineOffset) : 0,
            color: s && rgba ? rgba(s.outlineColor) : null,
          };
        });
        if (!ring) break;
        note(`focused ${ring.href}`, await accentPaint(page, accent));
        if (
          ring.style !== "solid" ||
          Math.abs(ring.width - 2) > 0.05 ||
          Math.abs(ring.offset - 2) > 0.05 ||
          !sameColor(ring.color, ink)
        ) {
          rings.push(
            `${ring.href}: ${ring.style} ${ring.width} px, ${ring.offset} px out, ${JSON.stringify(ring.color)}`,
          );
        }
      }
      expect
        .soft(rings, "focus rings that aren't 2 px of --foreground, 2 px out")
        .toEqual([]);
      expect(hits, "anything painted in --accent").toEqual([]);
    });
  }
}

test("B1.7 nothing today's page says is lost: the facts below the sheet, verbatim, and the JSON-LD Person", async ({
  page,
}) => {
  await open(page, 1440);
  const found = await page.evaluate(() => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const of = (id: string) =>
      document.querySelector(`section[aria-labelledby="${id}"]`);
    const revisions = document.querySelector(
      'section[aria-labelledby="revisions"]',
    );
    const work = of("work");
    return {
      ids: [...document.querySelectorAll("main h2")]
        .map((h) => h.id)
        .filter((id) => id !== "revisions"),
      first: squashed(document.querySelector("main h2#work")),
      below: Boolean(
        revisions &&
          work &&
          revisions.compareDocumentPosition(work) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      text: Object.fromEntries(
        ["work", "projects", "stack", "education", "contact"].map((id) => [
          id,
          squashed(of(id)),
        ]),
      ),
      stack: [...(of("stack")?.querySelectorAll("li") ?? [])].map((li) =>
        squashed(li),
      ),
      contact: [...(of("contact")?.querySelectorAll("a") ?? [])].map((a) => ({
        label: squashed(a),
        href: a.getAttribute("href"),
      })),
      ld: [
        ...document.querySelectorAll('script[type="application/ld+json"]'),
      ].map((s) => s.textContent ?? ""),
    };
  });
  expect
    .soft(found.ids, "the facts' h2 ids, in order")
    .toEqual(["work", "projects", "stack", "education", "contact"]);
  expect.soft(found.first, "the first reads").toBe("Work");
  expect
    .soft(found.below, "the facts come after the revision block")
    .toBe(true);
  const has = (section: string, fact: string, what: string) =>
    expect.soft(found.text[section] ?? "", what).toContain(squash(fact));
  for (const role of profile.experience) {
    for (const key of ["title", "company", "period", "summary"] as const) {
      has("work", role[key], `Work: ${role.company}'s ${key}`);
    }
  }
  for (const project of profile.projects) {
    has("projects", project.name, `Projects: ${project.name}`);
    has(
      "projects",
      project.description,
      `Projects: ${project.name}'s description`,
    );
  }
  expect.soft(found.stack, "Stack, in order").toEqual(profile.stack);
  for (const entry of profile.education) {
    for (const key of ["school", "credential", "period"] as const) {
      has("education", entry[key], `Education: ${entry.school}'s ${key}`);
    }
  }
  expect.soft(found.contact, "Contact's links").toEqual(profile.links);
  const people = found.ld
    .map((text) => JSON.parse(text) as Record<string, unknown>)
    .filter((data) => data["@type"] === "Person");
  expect(people, "JSON-LD Person").toHaveLength(1);
  expect.soft(people[0]).toMatchObject({
    name: profile.name,
    jobTitle: profile.headline,
    description: profile.bio,
    sameAs: profile.links.map((link) => link.href),
  });
});

test("B1.10 one type family: Sofia Sans and its Extra Condensed name, two self-hosted woff2 within 86,016 B, the display face preloaded, no Geist", async ({
  page,
}) => {
  // Through next/font/google, in the layout's source.
  const imports = readdirSync("app", { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .flatMap((file) =>
      [
        ...readFileSync(join("app", file), "utf8").matchAll(
          /import\s*\{([^}]*)\}\s*from\s*"next\/font\/google"/g,
        ),
      ].flatMap((match) =>
        (match[1] ?? "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );
  expect
    .soft(imports.sort(), "next/font/google imports in app/")
    .toEqual(["Sofia_Sans", "Sofia_Sans_Extra_Condensed"]);

  // Bodies are read on / only: the listener comes off before /sprints, where a font served from
  // Chrome's memory cache has no body over CDP and an unawaited read would reject.
  const fonts: Promise<{ url: string; bytes: number }>[] = [];
  const onResponse = (response: Response) => {
    if (new URL(response.url()).pathname.endsWith(".woff2")) {
      fonts.push(
        response
          .body()
          .then((body) => ({ url: response.url(), bytes: body.length })),
      );
    }
  };
  page.on("response", onResponse);
  await open(page, 1440);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 500)));
  page.off("response", onResponse);
  const files = await Promise.all(fonts);
  expect
    .soft(
      files.map((f) => new URL(f.url).pathname),
      "woff2 files / loads",
    )
    .toHaveLength(2);
  for (const file of files) {
    expect
      .soft(new URL(file.url).origin, `${file.url} is self-hosted`)
      .toBe(new URL(page.url()).origin);
  }
  expect
    .soft(
      files.reduce((sum, f) => sum + f.bytes, 0),
      "the woff2 files together, in bytes",
    )
    .toBeLessThanOrEqual(86_016);

  const faces = await page.evaluate(() => {
    const primary = (el: Element | null) =>
      el
        ? (getComputedStyle(el).fontFamily.split(",")[0] ?? "")
            .trim()
            .replace(/^["']|["']$/g, "")
        : "";
    const rules: { family: string; urls: string[] }[] = [];
    for (const sheet of document.styleSheets) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of list) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const src = rule.style.getPropertyValue("src");
        rules.push({
          family: rule.style
            .getPropertyValue("font-family")
            .replace(/["']/g, "")
            .trim(),
          urls: [...src.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(
            (m) => new URL(m[1] ?? "", sheet.href ?? location.href).href,
          ),
        });
      }
    }
    const texts = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        el.getClientRects().length > 0 &&
        [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        ),
    );
    return {
      rules: rules.filter((rule) => rule.urls.length > 0),
      preloads: [
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][as="font"]',
        ),
      ].map((l) => l.href),
      h1: primary(document.querySelector("h1")),
      families: [
        ...new Set(texts.filter((el) => el.tagName !== "H1").map(primary)),
      ],
      geist: [
        ...new Set(texts.map((el) => getComputedStyle(el).fontFamily)),
      ].filter((f) => /geist/i.test(f)),
    };
  });
  expect
    .soft(
      [...new Set(faces.rules.map((rule) => rule.family))].sort(),
      "@font-face families with a file",
    )
    .toEqual(["Sofia Sans", "Sofia Sans Extra Condensed"]);
  expect.soft(faces.h1, "the h1's face").toBe("Sofia Sans Extra Condensed");
  expect
    .soft(faces.families, "the faces of every other text")
    .toContain("Sofia Sans");
  expect.soft(faces.geist, "text set in Geist").toEqual([]);
  const display = faces.rules
    .filter((rule) => rule.family === "Sofia Sans Extra Condensed")
    .flatMap((rule) => rule.urls);
  expect(display.length, "the display face's file").toBeGreaterThan(0);
  expect
    .soft(
      faces.preloads.filter((href) => display.includes(href)),
      "the display face is preloaded",
    )
    .not.toEqual([]);

  // /sprints: Sofia Sans only.
  await open(page, 1440, 900, "/sprints");
  const sprints = await page.evaluate(() => {
    const primary = (el: Element) =>
      (getComputedStyle(el).fontFamily.split(",")[0] ?? "")
        .trim()
        .replace(/^["']|["']$/g, "");
    const texts = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        el.getClientRects().length > 0 &&
        [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        ),
    );
    return {
      families: [...new Set(texts.map(primary))],
      loaded: [
        ...new Set(
          [...document.fonts]
            .filter((f) => f.status === "loaded")
            .map((f) => f.family.replace(/["']/g, "")),
        ),
      ],
    };
  });
  expect
    .soft(sprints.families, "faces of the text on /sprints")
    .toEqual(["Sofia Sans"]);
  expect
    .soft(sprints.loaded, "faces loaded on /sprints")
    .toEqual(["Sofia Sans"]);
});

// The direction's values (.crew/sprint/17/design/tokens.webp, canvas-extract/Tokens.html, and Iris's
// notes section 1). Iris owns them: a retune in her notes changes this table, nothing else.
const DIRECTION = {
  light: {
    background: "#eaf1ee",
    foreground: "#111c22",
    muted: "#555c61",
    accent: "#9e441d",
    rule: "#bfcac7",
  },
  dark: {
    background: "#10191c",
    foreground: "#e2eae9",
    muted: "#a3adb1",
    accent: "#ee8f63",
    rule: "#323d40",
  },
} as const;
const LINE_TOKENS = ["--pencil", "--card", "--card-old"] as const;

test("B1.11 the tokens carry the new palette: the five keep their names, three new ones for lines and fills, and the name's own step", async ({
  page,
}) => {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1440);
    const colors = await resolveColors(page);
    for (const [role, hex] of Object.entries(DIRECTION[scheme])) {
      expect
        .soft(colors[`--${role}`]?.computed, `--${role} (${scheme})`)
        .toBe(hexToRgb(hex));
    }
    const site = scheme === "light" ? LIGHT : DARK;
    expect
      .soft({ ...site }, `lib/site.ts (${scheme})`)
      .toEqual(DIRECTION[scheme]);

    const raw = await rootTokens(page, [...LINE_TOKENS]);
    const values: Record<string, Rgba> = {};
    for (const token of LINE_TOKENS) {
      expect
        .soft(raw[token], `${token} is set on :root (${scheme})`)
        .not.toBe("");
      values[token] = await tokenRgba(page, token);
      expect
        .soft(values[token], `${token} resolves to a color (${scheme})`)
        .not.toBeNull();
    }
    // Never text: no text is painted in a line or fill token (unless it equals ink or graphite).
    const textTokens = [
      await tokenRgba(page, "--foreground"),
      await tokenRgba(page, "--muted"),
    ];
    const textColors = await page.evaluate(() => {
      const rgba = (
        window as Window & { __rgba?: (c: string) => number[] | null }
      ).__rgba;
      return [...document.body.querySelectorAll("*")]
        .filter(
          (el) =>
            el.getClientRects().length > 0 &&
            [...el.childNodes].some(
              (n) =>
                n.nodeType === Node.TEXT_NODE &&
                (n.textContent ?? "").trim() !== "",
            ),
        )
        .map((el) => {
          const s = getComputedStyle(el);
          return {
            el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`,
            color: rgba
              ? rgba(el instanceof SVGElement ? s.fill : s.color)
              : null,
          };
        });
    });
    for (const token of LINE_TOKENS) {
      const value = values[token] ?? null;
      if (!value || textTokens.some((t) => sameColor(t, value))) continue;
      expect
        .soft(
          textColors.filter((t) => sameColor(t.color, value)).map((t) => t.el),
          `text in ${token} (${scheme})`,
        )
        .toEqual([]);
    }
  }

  // The name's step: about 60 px at 390, 104 px at 1440, growing between.
  await page.emulateMedia({ colorScheme: "light" });
  const sizes: Record<number, { step: number; h1: number; raw: string }> = {};
  for (const width of [390, 768, 1440]) {
    await open(page, width);
    sizes[width] = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.fontSize = "var(--step-3xl)";
      document.body.append(probe);
      const step = Number.parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const h1 = document.querySelector("h1");
      return {
        step,
        h1: h1 ? Number.parseFloat(getComputedStyle(h1).fontSize) : 0,
        raw: getComputedStyle(document.documentElement)
          .getPropertyValue("--step-3xl")
          .trim(),
      };
    });
  }
  expect.soft(sizes[1440]?.raw, "--step-3xl is set on :root").not.toBe("");
  for (const [width, about] of [
    [390, 60],
    [1440, 104],
  ] as const) {
    const size = sizes[width];
    expect
      .soft(size?.h1, `the h1 is set in --step-3xl at ${width}`)
      .toBeCloseTo(size?.step ?? -1, 1);
    expect
      .soft(
        Math.abs((size?.step ?? 0) - about) / about,
        `--step-3xl at ${width}: ${size?.step} px, about ${about}`,
      )
      .toBeLessThanOrEqual(0.06);
  }
  expect
    .soft(sizes[768]?.step ?? 0, "--step-3xl at 768 grows past 390's")
    .toBeGreaterThan(sizes[390]?.step ?? 0);
  expect
    .soft(sizes[768]?.step ?? 0, "--step-3xl at 768 is below 1440's")
    .toBeLessThan(sizes[1440]?.step ?? 0);
});
