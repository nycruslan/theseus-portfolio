import type { Page } from "@playwright/test";
import { profile } from "../content/profile";
import { bioParts } from "./retros";

// B1.1's reads (.crew/sprint/22/contract.md), moved here from sheet.spec.ts unchanged so B4.22
// (.crew/sprint/34/contract.md) holds the same first screen on the feed's fixtures.

const REVISIONS = 'section[aria-labelledby="revisions"]';
const [BIO_1 = "", BIO_2 = ""] = bioParts(profile.bio);
const TITLE_BIO = `${BIO_1} ${BIO_2}`;

export type Box = { left: number; top: number; right: number; bottom: number };

/** The title block's parts and the revision rows, each with its box. */
export function firstScreen(page: Page) {
  return page.evaluate(
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
        rows: [...document.querySelectorAll(`${revisions} table tbody tr`)].map(
          (tr, i) => ({ what: `revision row ${i + 1}`, box: box(tr) }),
        ),
      };
    },
    {
      texts: [profile.headline, TITLE_BIO],
      links: profile.links.map((link) => link.href),
      revisions: REVISIONS,
    },
  );
}

/** The h1's font size, and every other shown element's with text of its own. */
export function textSizes(page: Page) {
  return page.evaluate(() => {
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
}

/** B1.1's rule: wholly inside the viewport, to half a pixel. */
export const insideViewport = (
  b: Box | null,
  viewport: { width: number; height: number },
) =>
  b !== null &&
  b.left >= -0.5 &&
  b.top >= -0.5 &&
  b.right <= viewport.width + 0.5 &&
  b.bottom <= viewport.height + 0.5;
