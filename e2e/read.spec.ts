import { type Browser, expect, type Page, test } from "@playwright/test";
import { profile } from "../content/profile";
import { SITE_URL } from "../lib/site";
import {
  composite,
  contrast,
  measureLcp,
  type Rgb,
  SCHEMES,
  watchLayoutShift,
} from "./helpers";
import { PLANK_IDS } from "./retros";
import { refuseWebGl } from "./webgl";

// Sprint 23, B2: /read, the record as one plain, printable column (.crew/sprint/23/contract.md,
// B2.4, B2.6, B2.7, B2.10 and B2.11), written before the build. The ship at its foot is B2.5, in
// plan.spec.ts beside the drawing's own checks; the site-wide invariants on /read are B2.9's, in
// invariants.spec.ts, keyboard.spec.ts and sheet.spec.ts. The oracle is the data rules in this
// file's own lines over content/profile.ts imported. Hooks: the strip is a `<header>` before
// `main`; `main#main` holds `main > header` (the title block, with `#contact`), then the h2s
// `work`, `projects`, `stack`, `education` and `ship`.

const READ = "/read";
const ADDRESS = `${new URL(SITE_URL).host}/read`;
const H2S = [
  { id: "work", text: "Work" },
  { id: "projects", text: "Projects" },
  { id: "stack", text: "Stack" },
  { id: "education", text: "Education" },
  { id: "ship", text: "The ship" },
];
const SIZES = [
  [390, 844],
  [1024, 768],
  [1440, 900],
] as const;
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** What each h2's part of /read should read, the data rules in order. */
const EXPECTED_TEXT: Record<string, string> = {
  work: squash(
    [
      "Work",
      ...profile.experience.map(
        (role) =>
          `${role.company} ${role.title} · ${role.period} ${role.summary}`,
      ),
    ].join(" "),
  ),
  projects: squash(
    [
      "Projects",
      ...profile.projects.map(
        (project) => `${project.name} ${project.description}`,
      ),
    ].join(" "),
  ),
  stack: squash(`Stack ${profile.stack.join(", ")}`),
  education: squash(
    [
      "Education",
      ...profile.education.map(
        (entry) => `${entry.school} ${entry.credential} · ${entry.period}`,
      ),
    ].join(" "),
  ),
};

async function open(page: Page, width: number, height = 900, url = READ) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** A fresh context with scripts off, waiting for fonts from the test (memory: sprints 5 and 9). */
async function withoutScripts(browser: Browser, width = 1440) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  const response = await page.goto(READ);
  for (
    let i = 0;
    i < 50 && (await page.evaluate(() => document.fonts.status)) !== "loaded";
    i++
  ) {
    await new Promise((done) => setTimeout(done, 100));
  }
  return { context, page, status: response?.status() };
}

/**
 * /read as the browser has it (page.evaluate only, so it works with scripts off): the strip, the
 * title block, the h2s and each h2's text. Text nodes join with nothing inside one inline run and
 * with a space across blocks, as a reader sees them; the drawing's lettering is left out.
 */
function readPage(page: Page) {
  return page.evaluate(() => {
    const squashed = (text: string) => text.replace(/\s+/g, " ").trim();
    const text = (el: Element | null) => squashed(el?.textContent ?? "");
    const main = document.querySelector("main");
    const strip =
      [...document.querySelectorAll("header")].find(
        (h) =>
          !h.closest("main") &&
          main !== null &&
          Boolean(
            h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      ) ?? null;
    const header = main?.querySelector(":scope > header") ?? null;
    // The nearest ancestor that isn't an inline run: its text reads as one line of words.
    const block = (node: Node) => {
      let el = node.parentElement;
      while (el && el !== main) {
        const display = getComputedStyle(el).display;
        if (display !== "inline" && display !== "contents") return el;
        el = el.parentElement;
      }
      return el;
    };
    // Each text node under main, grouped by the h2 it follows.
    const parts: Record<string, string> = {};
    let current = "";
    let last: Element | null = null;
    if (main) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const value = n.textContent ?? "";
        if (!value.trim() || n.parentElement?.closest("[data-plan], script")) {
          continue;
        }
        const h2 = n.parentElement?.closest("h2");
        if (h2 && h2.id !== current) {
          current = h2.id;
          last = null;
        }
        if (header?.contains(n)) continue;
        const b = block(n);
        parts[current] =
          (parts[current] ?? "") + (b === last ? "" : " ") + value;
        last = b;
      }
    }
    const h3sIn = (id: string) => {
      const h2 = document.getElementById(id);
      const next = [...document.querySelectorAll("main h2")].find(
        (h) =>
          h2 !== null &&
          Boolean(
            h2.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      );
      return [...document.querySelectorAll("main h3")]
        .filter(
          (h3) =>
            h2 !== null &&
            Boolean(
              h2.compareDocumentPosition(h3) & Node.DOCUMENT_POSITION_FOLLOWING,
            ) &&
            (!next ||
              Boolean(
                h3.compareDocumentPosition(next) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
              )),
        )
        .map((h3) => ({
          text: text(h3),
          links: [...h3.querySelectorAll("a")].map((a) =>
            a.getAttribute("href"),
          ),
        }));
    };
    const contact = header?.querySelector("#contact") ?? null;
    return {
      strip: strip !== null,
      header: header !== null,
      headerFirst: Boolean(
        header &&
          [...(main?.querySelectorAll("h2") ?? [])].every((h2) =>
            Boolean(
              header.compareDocumentPosition(h2) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          ),
      ),
      mainTabindex: main?.getAttribute("tabindex") ?? null,
      mainId: main?.id ?? null,
      h1: text(header?.querySelector("h1") ?? null),
      h1s: document.querySelectorAll("h1").length,
      headerBlocks: [...(header?.querySelectorAll("*") ?? [])]
        .filter((el) => !el.closest("#contact"))
        .map((el) => text(el)),
      bioParagraph: [...(header?.querySelectorAll("p") ?? [])].map((p) =>
        text(p),
      ),
      headerText: text(header),
      contact: [...(contact?.querySelectorAll("a") ?? [])].map((a) => ({
        label: text(a),
        href: a.getAttribute("href"),
      })),
      h2s: [...(main?.querySelectorAll("h2") ?? [])].map((h) => ({
        id: h.id,
        text: text(h),
      })),
      parts: Object.fromEntries(
        Object.entries(parts).map(([id, value]) => [id, squashed(value)]),
      ),
      h3s: {
        work: h3sIn("work"),
        projects: h3sIn("projects"),
        education: h3sIn("education"),
      },
      stackParagraphs: [...document.querySelectorAll("main p")].map((p) =>
        text(p),
      ),
      levels: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(
        (h) => Number(h.tagName.slice(1)),
      ),
      revisions: document.querySelectorAll(
        'section[aria-labelledby="revisions"], main table',
      ).length,
      detailA: [...document.querySelectorAll("figcaption")].filter((c) =>
        /^\s*Detail A\./.test(c.textContent ?? ""),
      ).length,
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]')
        .length,
      bar: document.querySelectorAll('header nav a[href="#work"]').length,
      plans: document.querySelectorAll("[data-plan]").length,
    };
  });
}

type ReadPage = Awaited<ReturnType<typeof readPage>>;

/** The data rules' structure, asserted on one reading of /read. */
function assertStructure(found: ReadPage, where: string) {
  expect
    .soft(found.strip, `a <header> strip before main (${where})`)
    .toBe(true);
  expect.soft(found.mainId, `main's id (${where})`).toBe("main");
  expect.soft(found.mainTabindex, `main's tabindex (${where})`).toBe("-1");
  expect.soft(found.header, `main > header (${where})`).toBe(true);
  expect
    .soft(found.headerFirst, `main > header comes before the h2s (${where})`)
    .toBe(true);
  expect.soft(found.h1, `the h1 (${where})`).toBe(profile.name);
  expect.soft(found.h1s, `h1 elements (${where})`).toBe(1);
  expect
    .soft(
      found.headerBlocks,
      `"${profile.headline} · ${profile.location}" in the title block (${where})`,
    )
    .toContain(`${profile.headline} · ${profile.location}`);
  expect
    .soft(found.bioParagraph, `the whole bio as one paragraph (${where})`)
    .toContain(squash(profile.bio));
  // Nothing in the title block but its facts and the page's separators.
  let rest = found.headerText;
  for (const fact of [
    squash(profile.bio),
    `${profile.headline} · ${profile.location}`,
    profile.name,
    ...profile.links.map((link) => link.label),
  ].sort((a, b) => b.length - a.length)) {
    rest = rest.replace(fact, " ");
  }
  expect
    .soft(
      rest.replace(/[\s·,]/g, ""),
      `other text in the title block (${where})`,
    )
    .toBe("");
  expect
    .soft(found.contact, `#contact's links, in the title block (${where})`)
    .toEqual(profile.links);
  expect.soft(found.h2s, `the h2s, in order (${where})`).toEqual(H2S);
  for (const [id, expected] of Object.entries(EXPECTED_TEXT)) {
    expect
      .soft(found.parts[id], `the ${id} part's text (${where})`)
      .toBe(expected);
  }
  expect
    .soft(
      found.h3s.work.map((h) => h.text),
      `Work's h3s: each company (${where})`,
    )
    .toEqual(profile.experience.map((role) => role.company));
  expect
    .soft(
      found.h3s.projects,
      `Projects' h3s: each name, linked to its href (${where})`,
    )
    .toEqual(
      profile.projects.map((project) => ({
        text: project.name,
        links: project.href ? [project.href] : [],
      })),
    );
  expect
    .soft(
      found.h3s.education.map((h) => h.text),
      `Education's h3s: each school (${where})`,
    )
    .toEqual(profile.education.map((entry) => entry.school));
  expect
    .soft(found.stackParagraphs, `Stack as one paragraph (${where})`)
    .toContain(profile.stack.join(", "));
  let previous = 0;
  const skipped: string[] = [];
  for (const level of found.levels) {
    if (level - previous > 1) skipped.push(`h${level} after h${previous}`);
    previous = level;
  }
  expect.soft(skipped, `skipped heading levels (${where})`).toEqual([]);
  expect.soft(found.revisions, `revision block or table (${where})`).toBe(0);
  expect.soft(found.detailA, `Detail A (${where})`).toBe(0);
  expect.soft(found.jsonLd, `JSON-LD (${where})`).toBe(0);
  expect.soft(found.bar, `the bar (${where})`).toBe(0);
  expect.soft(found.plans, `[data-plan] drawings (${where})`).toBe(1);
}

test("B2.4 /read is the plain page: 200, the data rules' structure with scripts on and off, the skip link first and landing on main, each fragment landing in view at 390 and 1440, and one column at 1440", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await open(page, 1440);
  const on = await readPage(page);
  assertStructure(on, "scripts on");
  const bare = await withoutScripts(browser);
  expect(bare.status, "status of /read without scripts").toBe(200);
  const off = await readPage(bare.page);
  await bare.context.close();
  assertStructure(off, "scripts off");
  const { strip: _strip, ...onMain } = on;
  const { strip: _offStrip, ...offMain } = off;
  expect.soft(offMain, "main without scripts, vs with").toEqual(onMain);

  // The skip link is the first link and lands on main.
  await open(page, 1440);
  expect
    .soft(
      await page.evaluate(() =>
        document.querySelector("a")?.getAttribute("href"),
      ),
      "the first link in DOM order",
    )
    .toBe("#main");
  await page.keyboard.press("Tab");
  expect
    .soft(
      await page.evaluate(
        () => document.activeElement?.getAttribute("href") ?? null,
      ),
      "the first Tab stop",
    )
    .toBe("#main");
  await page.keyboard.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() => document.activeElement?.tagName.toLowerCase()),
    )
    .toBe("main");

  // Each fragment lands with its target's top in the viewport, and clear of a strip that sticks.
  for (const width of [390, 1440]) {
    for (const id of ["work", "projects", "stack", "education", "contact"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("about:blank");
      await page.goto(`${READ}#${id}`);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(
          () =>
            page.evaluate((target) => {
              const el = document.getElementById(target);
              if (!el) return "missing";
              const top = el.getBoundingClientRect().top;
              const main = document.querySelector("main");
              const strip = [...document.querySelectorAll("header")].find(
                (h) =>
                  !h.closest("main") &&
                  main &&
                  h.compareDocumentPosition(main) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
              );
              const position = strip ? getComputedStyle(strip).position : "";
              const under =
                strip && ["sticky", "fixed"].includes(position)
                  ? Math.max(0, strip.getBoundingClientRect().bottom)
                  : 0;
              return top >= under - 1 && top < innerHeight
                ? "in view"
                : `top ${top}, strip ${under}, viewport ${innerHeight}`;
            }, id),
          `/read#${id} at ${width}`,
        )
        .toBe("in view");
    }
  }

  // One column at 1440: the h1, every h2, h3 and paragraph start at the same left edge.
  await open(page, 1440);
  const edges = await page.evaluate(() =>
    [...document.querySelectorAll("main h1, main h2, main h3, main p")]
      .filter(
        (el) => !el.closest("[data-plan]") && el.getClientRects().length > 0,
      )
      .map((el) => ({
        el: `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 24)}"`,
        left: el.getBoundingClientRect().left,
      })),
  );
  const left = edges[0]?.left ?? 0;
  expect(edges.length, "text blocks in main").toBeGreaterThan(0);
  expect
    .soft(
      edges
        .filter((e) => Math.abs(e.left - left) > 1)
        .map((e) => `${e.el} at ${e.left}`),
      `text blocks not on the column's left edge (${left}) at 1440`,
    )
    .toEqual([]);
});

/** The strip's controls and text (page.evaluate only). */
function readStrip(page: Page) {
  return page.evaluate(() => {
    const squashed = (text: string) => text.replace(/\s+/g, " ").trim();
    const main = document.querySelector("main");
    const strip =
      [...document.querySelectorAll("header")].find(
        (h) =>
          !h.closest("main") &&
          main !== null &&
          Boolean(
            h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      ) ?? null;
    const bare = strip?.cloneNode(true) as Element | undefined;
    for (const skip of bare?.querySelectorAll('a[href="#main"]') ?? []) {
      skip.remove();
    }
    return {
      found: strip !== null,
      controls: [
        ...(strip?.querySelectorAll(
          'a, button, input, select, [role="button"], [role="link"]',
        ) ?? []),
      ]
        .filter((el) => el.getAttribute("href") !== "#main")
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: squashed(el.textContent ?? ""),
          href: el.getAttribute("href"),
        })),
      text: squashed(bare?.textContent ?? ""),
      buttons: document.querySelectorAll("button").length,
      printText: [...document.body.querySelectorAll("*")].filter(
        (el) => squashed(el.textContent ?? "") === "Print",
      ).length,
    };
  });
}

/** Whether `text` is `parts` in order with nothing but whitespace around and between them. */
function readsAs(text: string, parts: string[]) {
  let rest = text;
  for (const part of parts) {
    const at = rest.indexOf(part);
    if (at === -1 || rest.slice(0, at).trim() !== "") return false;
    rest = rest.slice(at + part.length);
  }
  return rest.trim() === "";
}

test("B2.6 the strip and Print: a <header> before main with Back to the ship, the address and Print alone; no Print or button without scripts; with scripts a 24 px Print button that calls window.print once; CLS 0; Tab order skip, Back, Print, main", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  // With scripts off: the strip holds the link and the address, and there is no button at all.
  const bare = await withoutScripts(browser, 390);
  expect(bare.status, "status of /read without scripts").toBe(200);
  const off = await readStrip(bare.page);
  await bare.context.close();
  expect(off.found, "the strip without scripts").toBe(true);
  expect
    .soft(off.controls, "the strip's controls without scripts")
    .toEqual([{ tag: "a", text: "Back to the ship", href: "/" }]);
  expect
    .soft(
      readsAs(off.text, ["Back to the ship", ADDRESS]),
      `the strip reads "Back to the ship ${ADDRESS}" without scripts: "${off.text}"`,
    )
    .toBe(true);
  expect.soft(off.buttons, "buttons without scripts").toBe(0);
  expect.soft(off.printText, "a Print element without scripts").toBe(0);

  // With scripts on: Print is a button named Print, 24 px or more, that calls window.print once.
  await page.addInitScript(() => {
    const win = window as Window & { __prints?: number };
    win.__prints = 0;
    window.print = () => {
      win.__prints = (win.__prints ?? 0) + 1;
    };
  });
  await open(page, 390, 844);
  const print = page.getByRole("button", { name: "Print", exact: true });
  await expect(print, "the Print button").toHaveCount(1);
  const on = await readStrip(page);
  expect.soft(on.controls, "the strip's controls with scripts").toEqual([
    { tag: "a", text: "Back to the ship", href: "/" },
    { tag: "button", text: "Print", href: null },
  ]);
  expect
    .soft(
      readsAs(on.text, ["Back to the ship", ADDRESS, "Print"]),
      `the strip reads "Back to the ship ${ADDRESS} Print": "${on.text}"`,
    )
    .toBe(true);
  const box = await print.boundingBox();
  expect
    .soft(box?.width ?? 0, "Print's width at 390")
    .toBeGreaterThanOrEqual(24);
  expect
    .soft(box?.height ?? 0, "Print's height at 390")
    .toBeGreaterThanOrEqual(24);
  await print.click();
  expect
    .soft(
      await page.evaluate(
        () => (window as Window & { __prints?: number }).__prints,
      ),
      "window.print calls after one click",
    )
    .toBe(1);

  // Tab order: skip, Back to the ship, Print, then into main.
  await open(page, 1440);
  const stops: string[] = [];
  for (let press = 0; press < 4; press++) {
    await page.keyboard.press("Tab");
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "(none)";
        if (el.closest("main") && el.tagName !== "MAIN") return "in main";
        return el.getAttribute("href") ?? (el.textContent ?? "").trim();
      }),
    );
  }
  expect
    .soft(stops, "the first four Tab stops")
    .toEqual(["#main", "/", "Print", "in main"]);

  // Nothing moves over load plus 2 s, with Print appearing.
  for (const [width, height] of SIZES) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    await watchLayoutShift(fresh);
    await fresh.goto(READ);
    await fresh.evaluate(() => document.fonts.ready);
    await fresh.evaluate(() => new Promise((done) => setTimeout(done, 2000)));
    await expect(
      fresh.getByRole("button", { name: "Print", exact: true }),
      `Print at ${width}`,
    ).toHaveCount(1);
    expect
      .soft(
        await fresh.evaluate(
          () => (window as Window & { __cls?: number }).__cls,
        ),
        `layout shift over load plus 2 s at ${width}`,
      )
      .toBe(0);
    await fresh.close();
  }
});

/** A colour as [r, g, b, a] through a canvas (computed colours may be oklch or color-mix). */
function inkOnPaper(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = (color: string) => {
      if (!ctx) return [0, 0, 0, 0];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const squashed = (el: Element) =>
      (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const texts = [...document.body.querySelectorAll("*")].filter(
      (el) =>
        el.getClientRects().length > 0 &&
        !el.closest("[data-plan]") &&
        el.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }) &&
        [...el.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent ?? "").trim() !== "",
        ),
    );
    return {
      body: rgba(getComputedStyle(document.body).color),
      texts: texts.map((el) => {
        // The backgrounds under the text, innermost first (an inverted box prints its fill).
        const grounds: number[][] = [];
        for (let a: Element | null = el; a; a = a.parentElement) {
          const bg = rgba(getComputedStyle(a).backgroundColor);
          if ((bg[3] ?? 0) > 0) grounds.push(bg);
        }
        return {
          el: `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 30)}"`,
          text: squashed(el),
          color: rgba(getComputedStyle(el).color),
          grounds,
        };
      }),
    };
  });
}

/** What print shows of each route: hidden facts, the drawing, the strip's and bar's controls. */
function printView(page: Page) {
  return page.evaluate((address) => {
    const seen = (el: Element | null | undefined) =>
      Boolean(
        el?.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
        }) && el.getClientRects().length > 0,
      );
    const squashed = (el: Element) =>
      (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const main = document.querySelector("main");
    const plan = document.querySelector("[data-plan]");
    const strip = [...document.querySelectorAll("header")].find(
      (h) =>
        !h.closest("main") &&
        main !== null &&
        Boolean(
          h.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    );
    return {
      plan: seen(plan),
      planks: [...(plan?.querySelectorAll("[data-plank]") ?? [])].filter(seen)
        .length,
      header: seen(document.querySelector("main > header")),
      hidden: [
        ...(main?.querySelectorAll("h1, h2, h3, p, li, tr, figure") ?? []),
      ]
        .filter((el) => !el.closest("[data-plan]") && !seen(el))
        .map(
          (el) =>
            `<${el.tagName.toLowerCase()}> "${squashed(el).slice(0, 24)}"`,
        ),
      shownControls: [
        ...(strip?.querySelectorAll("a, button") ?? []),
        ...document.querySelectorAll("header nav a"),
      ]
        .filter((el) => el.getAttribute("href") !== "#main" && seen(el))
        .map((el) => squashed(el)),
      address: [...(strip?.querySelectorAll("*") ?? [])].some(
        (el) => squashed(el) === address && seen(el),
      ),
    };
  }, ADDRESS);
}

test("B2.7 it prints as a document: on /read and /, light and dark, body text 7:1 on white, every fact and the drawing shown, the strip's link and Print and the bar hidden, the address shown; entries don't break; the PDF page count reported", async ({
  page,
}, testInfo) => {
  test.setTimeout(150_000);
  const white: Rgb = [255, 255, 255];
  const running = [
    squash(profile.bio),
    ...profile.experience.map((role) => squash(role.summary)),
    ...profile.projects.map((project) => squash(project.description)),
  ];
  for (const route of [READ, "/"]) {
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ media: "print", colorScheme: scheme });
      await open(page, 1440, 900, route);
      const where = `${route}, print, ${scheme}`;
      const ink = await inkOnPaper(page);
      const ratio = (c: number[]) =>
        contrast(
          composite([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 1], white),
          white,
        );
      expect
        .soft(ratio(ink.body), `body text on white (${where})`)
        .toBeGreaterThanOrEqual(7);
      expect
        .soft(
          ink.texts
            .filter((t) => running.includes(t.text) && ratio(t.color) < 7)
            .map((t) => `${t.el}: ${ratio(t.color).toFixed(2)}`),
          `running text under 7:1 on white (${where})`,
        )
        .toEqual([]);
      // Nothing printed is too pale to read on paper, on its own ground laid over white.
      const onGround = (t: (typeof ink.texts)[number]) => {
        let ground = white;
        for (const g of [...t.grounds].reverse()) {
          ground = composite(
            [g[0] ?? 0, g[1] ?? 0, g[2] ?? 0, g[3] ?? 1],
            ground,
          );
        }
        const c = t.color;
        return contrast(
          composite([c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 1], ground),
          ground,
        );
      };
      expect
        .soft(
          ink.texts
            .filter((t) => onGround(t) < 4.5)
            .map((t) => `${t.el}: ${onGround(t).toFixed(2)}`),
          `text under 4.5:1 on its ground on paper (${where})`,
        )
        .toEqual([]);
      const view = await printView(page);
      expect.soft(view.plan, `the drawing (${where})`).toBe(true);
      expect
        .soft(view.planks, `planks shown (${where})`)
        .toBe(PLANK_IDS.length);
      expect.soft(view.header, `the title block (${where})`).toBe(true);
      expect.soft(view.hidden, `facts hidden (${where})`).toEqual([]);
      expect
        .soft(
          view.shownControls,
          `the strip's link, Print or the bar shown (${where})`,
        )
        .toEqual([]);
      if (route === READ) {
        expect
          .soft(view.address, `the strip's address shown (${where})`)
          .toBe(true);
      }
    }
  }

  // Each entry on /read keeps together.
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  await open(page, 1440);
  const breaking = await page.evaluate(
    (companions) =>
      [...document.querySelectorAll("main h3")].flatMap((h3, i) => {
        const name = (h3.textContent ?? "").replace(/\s+/g, " ").trim();
        // The h3s come in the data rules' order, so the i-th one's entry holds the i-th companion.
        const companion = companions[i] ?? "\u0000";
        let entry: Element | null = h3.parentElement;
        while (
          entry &&
          entry.tagName !== "MAIN" &&
          !(entry.textContent ?? "").replace(/\s+/g, " ").includes(companion)
        ) {
          entry = entry.parentElement;
        }
        if (
          !entry ||
          entry.tagName === "MAIN" ||
          entry.querySelectorAll("h3").length > 1
        ) {
          return [`"${name}": no element holding just its entry`];
        }
        const value = getComputedStyle(entry).breakInside;
        return ["avoid", "avoid-page"].includes(value)
          ? []
          : [
              `"${name}": <${entry.tagName.toLowerCase()}> break-inside ${value}`,
            ];
      }),
    [
      ...profile.experience.map((role) => squash(role.summary)),
      ...profile.projects.map((project) => squash(project.description)),
      ...profile.education.map((entry) => squash(entry.credential)),
    ],
  );
  expect
    .soft(breaking, "entries on /read that may break across pages")
    .toEqual([]);

  // Reported, not gated: how many pages /read prints to.
  for (const format of ["Letter", "A4"] as const) {
    const pdf = await page.pdf({ format });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? [])
      .length;
    testInfo.annotations.push({
      type: "pdf-pages",
      description: `/read prints to ${pages} ${format} pages`,
    });
  }
  await page.emulateMedia({ media: "screen" });
});

/** The bodies of every script file a route requests, summed, in a fresh context. */
/**
 * The script bytes a fresh visit to `url` fetches. `/` is measured with WebGL refused (sprint 25,
 * .crew/sprint/25/contract.md, the check disposition), so the model's idle import isn't counted:
 * the 3D chunk has its own budget in B3.6, and the loader stays within the same 2,048 B.
 */
async function scriptBytes(browser: Browser, url: string, refuse = false) {
  const context = await browser.newContext();
  if (refuse) await context.addInitScript(refuseWebGl);
  const page = await context.newPage();
  const bodies: Promise<number>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      bodies.push(
        response
          .body()
          .then((body) => body.length)
          .catch(() => Number.NaN),
      );
    }
  });
  const response = await page.goto(url);
  await page.evaluate(() => new Promise((done) => setTimeout(done, 1500)));
  const sizes = await Promise.all(bodies);
  await context.close();
  return {
    status: response?.status(),
    files: sizes.length,
    bytes: sizes.reduce((a, b) => a + b, 0),
  };
}

test("B2.10 LCP, fonts and script: /read's LCP is text in main, outside the drawing, within 2,500 ms at 4x CPU; two woff2 within 86,016 B with the display face preloaded; script bytes on /, /log and /log/13 (WebGL refused), /read and /crew within 2,048 B of the 404's", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  for (const [width, height] of SIZES) {
    const fresh = await page.context().newPage();
    await fresh.setViewportSize({ width, height });
    // Atlas's amendment (.crew/sprint/23/): on /read the LCP may be any text in main, since the
    // JPMorgan summary outsizes the title block on the first screen; / keeps main > header (B1.9).
    await fresh.addInitScript(() => {
      const win = window as Window & { __lcpInMain?: boolean[] };
      win.__lcpInMain = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const el = (entry as PerformanceEntry & { element: Element | null })
            .element;
          win.__lcpInMain?.push(Boolean(el?.closest("main")));
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    const lcp = await measureLcp(fresh, READ);
    const inMain = await fresh.evaluate(
      () =>
        (window as Window & { __lcpInMain?: boolean[] }).__lcpInMain?.at(-1) ??
        false,
    );
    const where = `on /read at ${width} x ${height}`;
    expect(lcp, `an LCP candidate ${where}`).not.toBeNull();
    if (lcp) {
      expect
        .soft(inMain, `LCP <${lcp.tag}> "${lcp.text}" is in main ${where}`)
        .toBe(true);
      expect.soft(lcp.inPlan, `LCP is in the drawing ${where}`).toBe(false);
      expect.soft(lcp.url, `LCP has a url ${where}`).toBe("");
      expect
        .soft(lcp.tag, `LCP is text, not an image or drawing, ${where}`)
        .not.toMatch(/^(?:img|image|video|svg|canvas)$/);
      expect.soft(lcp.time, `LCP time (ms) ${where}`).toBeLessThanOrEqual(2500);
      testInfo.annotations.push({
        type: "lcp",
        description: `/read ${where}: <${lcp.tag}> "${lcp.text}" at ${lcp.time.toFixed(0)} ms, target 1500 ms ${lcp.time <= 1500 ? "met" : "missed"}`,
      });
    }
    await fresh.close();
  }

  // Fonts on /read, in a fresh context so every response has a body.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const fresh = await context.newPage();
  const fonts: Promise<{ url: string; bytes: number }>[] = [];
  fresh.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith(".woff2")) {
      fonts.push(
        response
          .body()
          .then((body) => ({ url: response.url(), bytes: body.length })),
      );
    }
  });
  const response = await fresh.goto(READ);
  expect(response?.status(), "status of /read").toBe(200);
  await fresh.evaluate(() => document.fonts.ready);
  await fresh.evaluate(() => new Promise((done) => setTimeout(done, 500)));
  const files = await Promise.all(fonts);
  const faces = await fresh.evaluate(() => {
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
        rules.push({
          family: rule.style
            .getPropertyValue("font-family")
            .replace(/["']/g, "")
            .trim(),
          urls: [
            ...rule.style
              .getPropertyValue("src")
              .matchAll(/url\(["']?([^"')]+)["']?\)/g),
          ].map((m) => new URL(m[1] ?? "", sheet.href ?? location.href).href),
        });
      }
    }
    return {
      display: rules
        .filter((r) => r.family === "Sofia Sans Extra Condensed")
        .flatMap((r) => r.urls),
      preloads: [
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][as="font"]',
        ),
      ].map((l) => l.href),
    };
  });
  await context.close();
  expect
    .soft(
      files.map((f) => new URL(f.url).pathname),
      "woff2 files /read loads",
    )
    .toHaveLength(2);
  expect
    .soft(
      files.reduce((sum, f) => sum + f.bytes, 0),
      "the woff2 files together, in bytes",
    )
    .toBeLessThanOrEqual(86_016);
  expect
    .soft(faces.display.length, "the display face's file on /read")
    .toBeGreaterThan(0);
  expect
    .soft(
      faces.preloads.filter((href) => faces.display.includes(href)),
      "the display face is preloaded on /read",
    )
    .not.toEqual([]);

  // Script bytes against the 404's in the same run: the framework's alone. Sprint 30 (B5.10) moved
  // the baseline from /sprints to /log; sprint 33 (B5c) moves it to the 404, since /log now loads
  // the model's loader, and /log and /log/13 join / with WebGL refused. Sprint 31
  // (.crew/sprint/31/contract.md, B4.14) adds /crew, which has no model and ships no client code of
  // its own: B4.14 in crew.spec.ts holds it to the 404's files and bytes exactly.
  const missing = await scriptBytes(browser, "/no-such-page");
  expect(missing.status, "status of the 404").toBe(404);
  expect(missing.files, "script files the 404 requests").toBeGreaterThan(0);
  for (const route of ["/", "/log", "/log/13", READ, "/crew"]) {
    const refused = route !== READ && route !== "/crew";
    const route_ = await scriptBytes(browser, route, refused);
    testInfo.annotations.push({
      type: "script-bytes",
      description: `${route}${refused ? " (WebGL refused)" : ""}: ${route_.bytes} B in ${route_.files} files; the 404: ${missing.bytes} B in ${missing.files}`,
    });
    expect.soft(route_.status, `status of ${route}`).toBe(200);
    expect
      .soft(route_.bytes, `script bytes on ${route} are a number`)
      .not.toBeNaN();
    expect
      .soft(
        route_.bytes - missing.bytes,
        `script bytes on ${route} beyond the 404's (${missing.bytes} B)`,
      )
      .toBeLessThanOrEqual(2_048);
  }
});

test("B2.11 /read is findable and shareable: its canonical and og:url, one og:image and one twitter:image as PNG, a description, in the sitemap, and not disallowed", async ({
  page,
  request,
}) => {
  await open(page, 1440);
  const tags = await page.evaluate(() => {
    const content = (css: string) =>
      [...document.querySelectorAll<HTMLMetaElement>(css)].map(
        (meta) => meta.content,
      );
    return {
      canonical: [
        ...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
      ].map((link) => link.href),
      ogUrl: content('meta[property="og:url"]'),
      og: content('meta[property="og:image"]'),
      twitter: content('meta[name="twitter:image"]'),
      description: content('meta[name="description"]'),
    };
  });
  const url = `${SITE_URL}/read`;
  expect.soft(tags.canonical, "canonical").toEqual([url]);
  expect.soft(tags.ogUrl, "og:url").toEqual([url]);
  expect.soft(tags.description, "description").toHaveLength(1);
  expect
    .soft(tags.description[0]?.trim() ?? "", "description is set")
    .not.toBe("");
  for (const [name, urls] of [
    ["og:image", tags.og],
    ["twitter:image", tags.twitter],
  ] as const) {
    expect.soft(urls, name).toHaveLength(1);
    if (urls.length !== 1) continue;
    // The tags name the production host; the same paths are served here.
    const image = await request.get(new URL(urls[0] ?? "").pathname);
    expect.soft(image.status(), `status of the ${name}`).toBe(200);
    expect
      .soft(image.headers()["content-type"], `${name} type`)
      .toBe("image/png");
  }

  const sitemap = await request.get("/sitemap.xml");
  const locs = [...(await sitemap.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  expect.soft(locs, "URLs in the sitemap").toContain(url);
  const robots = await (await request.get("/robots.txt")).text();
  const disallowed = robots
    .split("\n")
    .map((line) => line.split("#")[0]?.trim() ?? "")
    .flatMap((line) => {
      const rule = line.match(/^disallow\s*:\s*(\S+)/i)?.[1];
      return rule ? [rule.replace(/\*$/, "")] : [];
    })
    .filter((rule) => READ.startsWith(rule));
  expect.soft(disallowed, "robots.txt rules that cover /read").toEqual([]);
});
