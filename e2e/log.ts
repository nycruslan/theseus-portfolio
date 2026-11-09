import { type Browser, expect, type Page } from "@playwright/test";
import type { SCHEMES } from "./helpers";
import { MERGED, REPO, type Retro } from "./retros";

// What log.spec.ts and log-record.spec.ts share (sprint 30, B5a; .crew/sprint/29/b5-first-contract.md):
// the Log's selectors, the records the contract names, and the readers of the table and the record.
// Spec files can't import each other's helpers without running their tests, so they live here.

export const LOG = "/log";
export const RECORD = 'section[aria-labelledby="record"]';
export const EVERY = 'section[aria-labelledby="every-revision"]';
/** The revision rows: a day group's header row (sprint 32, B5.13) is not one. */
export const ROWS = `${EVERY} table tbody tr:has(> th[scope="row"])`;
/** The record's items: its lists without a link (the record's own links may sit in a list). */
export const ITEMS = `${RECORD} ul:not(:has(a)) > li`;
export const WRONG = "What went wrong, in the crew's words";
const HEIGHT = 900;
export type Scheme = (typeof SCHEMES)[number];
export type Rgba = number[] | null;

/** Newest first, as the table lists them. */
export const VALID = [...MERGED].reverse();
export const NEWEST = VALID[0]?.sprint ?? Number.NaN;
/** The records the contract names: the newest, 13, 1 (the old retro shape) and 24 (a second holder). */
export const SAMPLES = [...new Set([NEWEST, 13, 1, 24])];
export const squash = (text: string) => text.replace(/\s+/g, " ").trim();
/** What a record shows of an entry's items: the reader's first three. */
export const shown = (entry: Retro) => entry.wentWrong.map(squash);
export const prHref = (n: number) => `${REPO}/pull/${n}`;
export const recordOf = (n: number) => `${LOG}/${n}`;
export const entryOf = (n: number) =>
  MERGED.find((entry) => entry.sprint === n);
/**
 * The bar's links after the wordmark, in the data rules' order; Crew after Work since sprint 31
 * (.crew/sprint/31/contract.md, "The bar"). Below 768 px the bar's Read as page is hidden and the
 * one shown is the page's foot (`main [data-foot]`), which follows the header in the DOM, so the
 * shown links keep this order at every width.
 */
export const BAR = [
  { text: "Work", href: "/#work" },
  { text: "Crew", href: "/crew" },
  { text: "Log", href: LOG },
  { text: "Contact", href: "/#contact" },
  { text: "Read as page", href: "/read" },
];

export async function open(
  page: Page,
  url: string,
  width: number,
  scheme?: Scheme,
  height = HEIGHT,
) {
  if (scheme) await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width, height });
  const response = await page.goto(url);
  expect(response?.status(), `status of ${url}`).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

/** A fresh context with scripts off; fonts are awaited from the test (memory: sprints 5 and 9). */
export async function withoutScripts(
  browser: Browser,
  url: string,
  width = 1440,
) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width, height: HEIGHT },
  });
  const page = await context.newPage();
  const response = await page.goto(url);
  for (
    let i = 0;
    i < 50 && (await page.evaluate(() => document.fonts.status)) !== "loaded";
    i++
  ) {
    await new Promise((done) => setTimeout(done, 100));
  }
  return { context, page, status: response?.status() };
}

/** Each row of Every revision, as the DOM has it, in DOM order. */
export function readRows(page: Page) {
  return page.evaluate((rows) => {
    const squashed = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll(rows)].map((tr) => {
      const th = tr.querySelector(':scope > th[scope="row"]');
      const links = [...(th?.querySelectorAll("a") ?? [])];
      const href = links[0]?.getAttribute("href") ?? null;
      return {
        number: Number(href?.match(/^\/log\/(\d+)$/)?.[1]),
        links: links.length,
        href,
        text: links[0]?.textContent ?? "",
        current: links[0]?.getAttribute("aria-current") ?? null,
        cells: [...tr.querySelectorAll(":scope > td")].map((td) =>
          squashed(td),
        ),
      };
    });
  }, ROWS);
}

/** The record section as the DOM has it (page.evaluate only, so it works with scripts off). */
export function readRecord(page: Page) {
  return page.evaluate(
    ({ record, items }) => {
      const squashed = (el: Element | null) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const section = document.querySelector(record);
      const pairs: [string, string[]][] = [];
      const dl = section?.querySelector("dl");
      for (const el of dl?.querySelectorAll("dt, dd") ?? []) {
        if (el.tagName === "DT") pairs.push([squashed(el), []]);
        else pairs.at(-1)?.[1].push(squashed(el));
      }
      return {
        sections: document.querySelectorAll(record).length,
        ps: [...(section?.querySelectorAll("p") ?? [])].map((p) => squashed(p)),
        h2s: [...(section?.querySelectorAll("h2") ?? [])].map((h) => ({
          id: h.id,
          text: squashed(h),
        })),
        pairs: pairs.map(([dt, dds]) => [dt, dds.join(" ")]),
        h3s: [...(section?.querySelectorAll("h3") ?? [])].map((h) =>
          squashed(h),
        ),
        lists: section?.querySelectorAll("ul:not(:has(a))").length ?? 0,
        items: [...document.querySelectorAll(items)].map((li) => squashed(li)),
        links: [...(section?.querySelectorAll("a") ?? [])].map((a) => ({
          text: squashed(a),
          href: a.getAttribute("href"),
        })),
      };
    },
    { record: RECORD, items: ITEMS },
  );
}

/** A token as [r, g, b, a], through the page's own canvas (installRgba). */
export function tokenRgba(page: Page, name: string): Promise<Rgba> {
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

export const sameColor = (a: Rgba, b: Rgba) =>
  Boolean(
    a &&
      b &&
      a.every(
        (value, i) => Math.abs(value - (b[i] ?? -9)) <= (i < 3 ? 1 : 0.02),
      ),
  );

/**
 * Ya's words, Iris's (.crew/sprint/53/placement.md): each link's accessible name, the Theseus's
 * caption and the question. Each is one line here. The caption has no contract hook: the checks
 * find it by its opening words and read it whole. Since Ha (sprint 59, .crew/sprint/58/
 * first-contract.md, H2 to H4) `/log`'s first link invites a rebuild, a step page says how to play
 * it (the hint) and the first chapter step says why a riffle stops there (the chapter line): the
 * contract's proposals until Iris's words land in .crew/sprint/59/placement.md.
 */
export const YARD_WORDS = {
  previous: (p: number) => `Back to sprint ${p}`,
  next: (q: number) => `Seat sprint ${q}'s plank`,
  start: (first: number) => `Rebuild it yourself from sprint ${first}`,
  /** `[data-yard-hint]`, shown while the yard plays the step links. */
  hint: "Hold to flip through the sprints",
  /** `p[data-yard-chapter]` on a chapter step, S the (k − 22)th merged sprint. */
  chapter: (s: number) =>
    `Every plank the crew laid by sprint ${s} is gone too.`,
  caption: "The Theseus",
  captionAt: (n: number, today: boolean) =>
    today
      ? `The Theseus today, after sprint ${n}`
      : `The Theseus after sprint ${n}`,
  question: "The ghost hull is whole again. Which one is the Theseus?",
  /** Yd's hand-off, on /log and the newest record, to /crew (.crew/sprint/56/contract.md, point 6). */
  handOff: "Watch the crew build the next one on Crew",
};
