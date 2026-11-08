import type { Page } from "@playwright/test";
import { canvasAlone, DRAWING } from "./ghost";
import { RECORD } from "./log";
import { type Box, pause } from "./model";
import type { Image } from "./pixels";
import { MERGED } from "./retros";
import type { ModelRun } from "./webgl";

// The yard's reads (the Log's step pages in Full and Calm, sprints 55 and 56), shared by
// e2e/log-press.spec.ts (Yc's press, Y12 to Y19) and e2e/log-riffle.spec.ts (Yd's hold, Y20 to
// Y24). Moved here from log-press.spec.ts unchanged at sprint 56. Only assertion-free reads live
// here (STATE.md, Lens's gate counts each spec's `expect(`): the specs keep every check.

export const THESEUS = "[data-theseus]";
export const LIVE = "[data-yard-live]";

/** What the press loop reads each step, in one round trip; doc is null on a new document. */
export function readPress(page: Page) {
  return page.evaluate((live) => {
    const w = window as Window & {
      __probeDoc?: number;
      __gl?: { frames: unknown[] };
    };
    const model = document.querySelector("[data-model]");
    return {
      doc: w.__probeDoc ?? null,
      press: model?.getAttribute("data-press") ?? null,
      kind: model?.getAttribute("data-press-kind") ?? null,
      state: model?.getAttribute("data-state") ?? null,
      path: location.pathname,
      frames: w.__gl?.frames.length ?? 0,
      t: performance.now(),
      live: document.querySelector(live)?.textContent ?? null,
    };
  }, LIVE);
}
export type PressRead = Awaited<ReturnType<typeof readPress>>;

/** readPress, retried while a navigation tears the page's context down mid-read. */
export async function readSafe(page: Page): Promise<PressRead> {
  for (let i = 0; ; i++) {
    try {
      return await readPress(page);
    } catch (error) {
      if (i >= 50) throw error;
      await pause(200);
    }
  }
}

/** Tags this document and its live region, so a navigation or a swapped-out region shows. */
export function tagDocument(page: Page) {
  return page.evaluate((live) => {
    (window as Window & { __probeDoc?: number }).__probeDoc = 1;
    const region = document.querySelector(live) as
      | (Element & { __probeLive?: number })
      | null;
    if (region) region.__probeLive = 1;
  }, LIVE);
}

/** Whether the live region now is the node tagged before the presses. */
export function sameLiveNode(page: Page) {
  return page.evaluate(
    (live) =>
      (
        document.querySelector(live) as
          | (Element & { __probeLive?: number })
          | null
      )?.__probeLive === 1,
    LIVE,
  );
}

/** The canvas alone over `clip`, with the pointer kept off it. */
export async function shoot(page: Page, clip: Box) {
  return (await canvasAlone(page, clip)).image;
}

/** A shown step link's centre. */
export function linkAt(page: Page, kind: string) {
  return page.evaluate((css) => {
    const a = [...document.querySelectorAll(css)].find(
      (el) => el.getClientRects().length > 0,
    );
    const r = a?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }, `a[data-step="${kind}"]`);
}

/** A pixel changed: any channel, alpha included, more than 8 levels (B5.18's fills). */
const LEVELS = 8;

/** Where two images of one size differ by more than LEVELS in any channel: 1, else 0. */
export function changed(a: Image, b: Image) {
  const n = a.width * a.height;
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 4; c++)
      if (
        Math.abs((a.data[i * 4 + c] ?? 0) - (b.data[i * 4 + c] ?? 0)) > LEVELS
      ) {
        m[i] = 1;
        break;
      }
  return m;
}

export const sum = (m: Uint8Array) => m.reduce((s, v) => s + v, 0);

export const sameSize = (a: Image, b: Image) =>
  a.width === b.width && a.height === b.height;

/** Frames drawn while the clock runs `ms`, with `during` done first. */
export async function framesOver(
  run: ModelRun,
  ms: number,
  during?: () => Promise<unknown>,
) {
  const before = (await run.frames()).length;
  if (during) await during();
  // The page's own observers (intersection, visibility) answer in real time, then the clock runs.
  await pause(200);
  await run.step(ms);
  await pause(200);
  return (await run.frames()).length - before;
}

/**
 * The step's words and drawings as a document has them: the record, the captions, the count, the
 * question, the step links, the table's open row, the title, and both drawings' planks and numbers.
 * Runs on the page's own document, or on `html` parsed in it (the server's).
 */
export function readWords(page: Page, html?: string) {
  return page.evaluate(
    ({ html, record, theseus, ghost }) => {
      const doc = html
        ? new DOMParser().parseFromString(html, "text/html")
        : document;
      const squash = (el: Element | null | undefined) =>
        (el?.textContent ?? "").replace(/\s+/g, " ").trim();
      const nameOf = (a: Element) => {
        const label = a.getAttribute("aria-label");
        if (label) return label.replace(/\s+/g, " ").trim();
        const copy = a.cloneNode(true) as Element;
        for (const hidden of copy.querySelectorAll('[aria-hidden="true"]'))
          hidden.remove();
        return squash(copy);
      };
      const section = doc.querySelector(record);
      const planks = (css: string) =>
        [...doc.querySelectorAll(`${css} path[data-plank]`)].map((p) =>
          [
            p.getAttribute("data-plank"),
            p.getAttribute("data-sprint"),
            p.getAttribute("class"),
            p.hasAttribute("data-current") ? "current" : "",
          ].join(" "),
        );
      const numbers = (css: string) =>
        [...doc.querySelectorAll(`${css} .plan-plank`)].map(
          (s) =>
            `${squash(s)}${s.classList.contains("plan-current") ? " current" : ""}`,
        );
      return {
        title: doc.title,
        record: {
          count: doc.querySelectorAll(record).length,
          h2: squash(section?.querySelector("h2")),
          text: squash(section),
          links: [...(section?.querySelectorAll("a") ?? [])].map(
            (a) => `${a.getAttribute("href")} ${nameOf(a)}`,
          ),
        },
        ghostCaption: squash(doc.querySelector("[data-ghost-caption]")),
        count: squash(doc.querySelector("[data-ghost-count]")),
        theseusCaption: squash(doc.querySelector("[data-theseus-caption]")),
        question: [...doc.querySelectorAll("p[data-yard-question]")].map(
          squash,
        ),
        steps: [...doc.querySelectorAll("a[data-step]")].map(
          (a) =>
            `${a.getAttribute("data-step")} ${a.getAttribute("href")} ${nameOf(a)}`,
        ),
        open: [
          ...doc.querySelectorAll(
            'section[aria-labelledby="every-revision"] a[aria-current]',
          ),
        ].map(
          (a) => `${a.getAttribute("href")} ${a.getAttribute("aria-current")}`,
        ),
        theseus: { planks: planks(theseus), numbers: numbers(theseus) },
        ghost: { planks: planks(ghost), numbers: numbers(ghost) },
      };
    },
    { html, record: RECORD, theseus: THESEUS, ghost: DRAWING },
  );
}

/** Waits in real time for a press to land on `target`: the URL, data-press gone, the region written. */
export async function landedOn(page: Page, target: string, timeout = 20_000) {
  const end = Date.now() + timeout;
  let now = await readSafe(page);
  while (Date.now() < end) {
    if (now.doc === null) return now;
    if (now.path === target && !now.press && (now.live ?? "") !== "")
      return now;
    await pause(50);
    now = await readSafe(page);
  }
  return now;
}

export const goalOf = (n: number) =>
  MERGED.find((e) => e.sprint === n)?.goal ?? `(no goal for ${n})`;
