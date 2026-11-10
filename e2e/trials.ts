import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { profile } from "../content/profile";

// Probe's oracle for Ta, the trials page (.crew/sprint/63/contract.md, T1 to T9): the windows, the
// addresses, the freeboard and the answer's kind, from the contract's rules word for word, and
// PINS derived from the kept checks themselves, never imported from the page's table. Reads
// only: every assertion is in e2e/trials.spec.ts (Lens's gate counts a spec's `expect(`).

export type Win = readonly [width: number, height: number];
export const key = ([w, h]: Win) => `${w}x${h}`;
export const at = ([w, h]: Win) => `${w} x ${h}`;

// ---------------------------------------------------------------------------------------------
// The windows ("The windows", the contract's rules).

const GRID = {
  widths: { from: 320, to: 1920, step: 16 },
  heights: { from: 460, to: 1100, step: 5 },
} as const;

const onAxis = (v: number, axis: { from: number; to: number; step: number }) =>
  v >= axis.from && v <= axis.to && (v - axis.from) % axis.step === 0;

const onGrid = ([w, h]: Win) =>
  onAxis(w, GRID.widths) && onAxis(h, GRID.heights);

/** Every grid window, widths outer: 101 × 129 = 13,029. */
export function gridWindows(): Win[] {
  const out: Win[] = [];
  for (let w = GRID.widths.from; w <= GRID.widths.to; w += GRID.widths.step)
    for (
      let h = GRID.heights.from;
      h <= GRID.heights.to;
      h += GRID.heights.step
    )
      out.push([w, h]);
  return out;
}

/** Iris's near misses off the grid. */
export const NAMED: readonly Win[] = [
  [456, 465],
  [792, 575],
  [1160, 635],
  [1366, 595],
];

/** The grid's four corners. */
export const CORNERS: readonly Win[] = [
  [320, 460],
  [1920, 460],
  [320, 1100],
  [1920, 1100],
];

/**
 * The grid window a window in the grid's range answers to: `w' = 320 + 16·round((w − 320) / 16)`,
 * `h' = 460 + 5·round((h − 460) / 5)`, halves rounding up (Math.round does for non-negatives).
 */
export const snap = ([w, h]: Win): Win => [
  GRID.widths.from +
    GRID.widths.step * Math.round((w - GRID.widths.from) / GRID.widths.step),
  GRID.heights.from +
    GRID.heights.step * Math.round((h - GRID.heights.from) / GRID.heights.step),
];

/** A window's address: `/trials` is 1440 × 900. */
export const addressOf = (win: Win) =>
  key(win) === "1440x900" ? "/trials" : `/trials/${key(win)}`;

/** n distinct grid windows from a fixed seed (mulberry32), none of them `except`. */
export function seeded(
  seed: number,
  n: number,
  except: ReadonlySet<string> = new Set(),
) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const columns = (GRID.widths.to - GRID.widths.from) / GRID.widths.step + 1;
  const rows = (GRID.heights.to - GRID.heights.from) / GRID.heights.step + 1;
  const out: Win[] = [];
  const seen = new Set(except);
  while (out.length < n) {
    const win: Win = [
      GRID.widths.from + GRID.widths.step * Math.floor(next() * columns),
      GRID.heights.from + GRID.heights.step * Math.floor(next() * rows),
    ];
    if (seen.has(key(win))) continue;
    seen.add(key(win));
    out.push(win);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// PINS: every window of `/` at which a kept check asserts the title block's contact links inside
// the viewport (B1.1, W1 to W17, P3, P8, B4.22, H9 to H11, as each reads them), plus 320 × 568,
// which W8 reports and doesn't assert. Read from each check's body on 10 Nov (sprint 63):
//
// - B1.1 (sheet.spec.ts): 1440 × 900 and 390 × 844, firstScreen's items, the links among them.
// - W1 (window.spec.ts): WINDOWS, its eight, the same items.
// - W2 pins the links' boxes to main's at 1440 × 900, equal, not inside: no window of its own.
// - W3, W4, W6, W7 read the drawing, the model, CLS and LCP, axe: no contact-links clause.
// - W5: "at 700 the first window holds items 1 to 4", resized from 1440 × 900 to 1440 × 700.
// - W8 (phone-window.spec.ts): PARTICULARS_HELD and FACTS_HELD's six and 390 × 844, inside less
//   8 px; 320 × 568 is REPORTED_ONLY (Atlas's ruling, sprint 44).
// - W9 to W12 read the narrow drawing, the control, CLS and the copper dot: none.
// - W13 (tablet-window.spec.ts): 1024 × 640, 1024 × 768, 1180 × 740.
// - W14: KEY_WINDOWS' 1280 × 680, 1366 × 625, 1024 × 768 (its widths sweep reads only the key).
// - W15 is a rider (the default-server passes under PLAYWRIGHT_BASE_URL), W16 the drawing, W17
//   CLS and LCP: none.
// - P3 (particulars.spec.ts): 1440 × 900 and 390 × 844, B1.1's items.
// - P8 (plain-words.spec.ts): its first-screen check, B1.1's items at 1440 × 900 only (at 390 ×
//   844 it reads only the key after the rows).
// - B4.22 (live-layer.spec.ts): 1440 × 900, 390 × 844, and the resting fixture's contact links at
//   1024 × 768.
// - H9 (home-door.spec.ts) reads the door: none. H10: 1380 to 1440 wide at 900 tall, 1 px apart,
//   the links' bottom inside the first screen. H11 is the named rewrites, none of which reads the
//   contact links.

export type Check = {
  code: string;
  spec: string; // the file under e2e/
  title: string; // the words its title starts with, which find its line
  sprint: number; // the sprint whose contract wrote it
  windows: readonly Win[];
};

const H10_WINDOWS: Win[] = [];
for (let w = 1380; w <= 1440; w++) H10_WINDOWS.push([w, 900]);

export const CHECKS: readonly Check[] = [
  {
    code: "B1.1",
    spec: "sheet.spec.ts",
    title: "B1.1 the first screen says who and what",
    sprint: 22,
    windows: [
      [1440, 900],
      [390, 844],
    ],
  },
  {
    code: "W1",
    spec: "window.spec.ts",
    title: "W1 the first window holds the facts",
    sprint: 43,
    windows: [
      [1280, 680],
      [1280, 800],
      [1366, 625],
      [1440, 790],
      [1470, 840],
      [1512, 865],
      [1536, 715],
      [1920, 950],
    ],
  },
  {
    code: "W5",
    spec: "window.spec.ts",
    title: "W5 a resize refits it",
    sprint: 43,
    windows: [[1440, 700]],
  },
  {
    code: "W8",
    spec: "phone-window.spec.ts",
    title: "W8 the phone window holds the facts",
    sprint: 44,
    windows: [
      [390, 664],
      [393, 659],
      [412, 780],
      [430, 746],
      [375, 548],
      [360, 560],
      [390, 844],
      [320, 568],
    ],
  },
  {
    code: "W13",
    spec: "tablet-window.spec.ts",
    title: "W13 the tablet window holds the facts",
    sprint: 45,
    windows: [
      [1024, 640],
      [1024, 768],
      [1180, 740],
    ],
  },
  {
    code: "W14",
    spec: "tablet-window.spec.ts",
    title: "W14 the key shows",
    sprint: 45,
    windows: [
      [1280, 680],
      [1366, 625],
      [1024, 768],
    ],
  },
  {
    code: "P3",
    spec: "particulars.spec.ts",
    title: "P3 on the first screen in every state",
    sprint: 39,
    windows: [
      [1440, 900],
      [390, 844],
    ],
  },
  {
    code: "P8",
    spec: "plain-words.spec.ts",
    title: "P8 the key in the first screen",
    sprint: 40,
    windows: [[1440, 900]],
  },
  {
    code: "B4.22",
    spec: "live-layer.spec.ts",
    title: "B4.22 the first screen in every state",
    sprint: 34,
    windows: [
      [1440, 900],
      [390, 844],
      [1024, 768],
    ],
  },
  {
    code: "H10",
    spec: "home-door.spec.ts",
    title: "H10 /'s first screen",
    sprint: 60,
    windows: H10_WINDOWS,
  },
];

/** The window the crew owns as its gap: reported by W8, asserted by none. */
export const GAP: Win = [320, 568];

/** PINS: each window once, with the codes of the checks that claim it, in CHECKS's order. */
export const PINS: ReadonlyMap<string, { win: Win; codes: string[] }> = (() => {
  const out = new Map<string, { win: Win; codes: string[] }>();
  for (const check of CHECKS)
    for (const win of check.windows) {
      const entry = out.get(key(win)) ?? { win, codes: [] };
      if (!entry.codes.includes(check.code)) entry.codes.push(check.code);
      out.set(key(win), entry);
    }
  return out;
})();
export const PIN_WINDOWS: readonly Win[] = [...PINS.values()].map((p) => p.win);

const isPinned = (win: Win) => PINS.has(key(win));

/** The swept windows: the grid, PINS and the named windows. */
export const isSwept = (win: Win) =>
  onGrid(win) || isPinned(win) || NAMED.some((n) => key(n) === key(win));

/** The 1-based line of a check's title in its spec, in this checkout; 0 when it isn't there. */
export function lineOf(check: Check) {
  const text = readFileSync(join(process.cwd(), "e2e", check.spec), "utf8");
  const i = text.split("\n").findIndex((line) => line.includes(check.title));
  return i + 1;
}

// ---------------------------------------------------------------------------------------------
// The freeboard and the answer's kind.

export type Kind = "gap" | "held" | "near" | "under" | "afloat";

/** The answer's kind, the first that applies, from the unrounded freeboard. */
export function kindOf(win: Win, freeboard: number): Kind {
  if (isPinned(win) && freeboard < 0) return "gap";
  if (isPinned(win)) return "held";
  if (freeboard >= 0 && freeboard < 1) return "near";
  if (freeboard < 0) return "under";
  return "afloat";
}

const LINK_HREFS = profile.links.map((link) => link.href);

/**
 * The rule's measure, in the document `doc` reads (the page's own, or a frame's): the largest
 * `bottom` of the client rects of a Range over each title-block link's contents, the links found
 * as B1.1 finds them, and h − that foot. Assertion-free; the caller checks `found`.
 */
export type Measure = {
  found: number;
  foot: number;
  height: number;
  freeboard: number;
  overflow: number;
};

/** The measure of the page's top-level document (the frame's address loaded at w × h). */
export function measureTop(page: Page): Promise<Measure> {
  return page.evaluate((hrefs) => {
    const header = document.querySelector("main > header");
    let foot = Number.NEGATIVE_INFINITY;
    let found = 0;
    for (const href of hrefs) {
      const a = header?.querySelector(`a[href="${href}"]`);
      if (!a) continue;
      found++;
      const range = document.createRange();
      range.selectNodeContents(a);
      for (const r of range.getClientRects()) foot = Math.max(foot, r.bottom);
    }
    const root = document.documentElement;
    return {
      found,
      foot,
      height: innerHeight,
      freeboard: innerHeight - foot,
      overflow: root.scrollWidth - root.clientWidth,
    };
  }, LINK_HREFS);
}

/** The same measure through the trials page's frame (`main iframe`'s contentDocument). */
export function measureInFrame(page: Page): Promise<Measure | null> {
  return page.evaluate((hrefs) => {
    const frame = document.querySelector(
      "main iframe",
    ) as HTMLIFrameElement | null;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return null;
    const header = doc.querySelector("main > header");
    let foot = Number.NEGATIVE_INFINITY;
    let found = 0;
    for (const href of hrefs) {
      const a = header?.querySelector(`a[href="${href}"]`);
      if (!a) continue;
      found++;
      const range = doc.createRange();
      range.selectNodeContents(a);
      for (const r of range.getClientRects()) foot = Math.max(foot, r.bottom);
    }
    const root = doc.documentElement;
    return {
      found,
      foot,
      height: win.innerHeight,
      freeboard: win.innerHeight - foot,
      overflow: root.scrollWidth - root.clientWidth,
    };
  }, LINK_HREFS);
}

/** Waits, from Node, until the trials page's frame has a parsed main (scripts off can't rAF). */
export async function frameReady(page: Page, timeout = 10_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ready = await page.evaluate(() => {
      const frame = document.querySelector(
        "main iframe",
      ) as HTMLIFrameElement | null;
      // A page with no frame at all (a 404) won't grow one: stop waiting.
      if (!frame) return null;
      const doc = frame.contentDocument;
      return Boolean(
        doc?.readyState === "complete" && doc.querySelector("main"),
      );
    });
    if (ready === null) return false;
    if (ready) {
      await page.evaluate(() => {
        const frame = document.querySelector(
          "main iframe",
        ) as HTMLIFrameElement | null;
        return frame?.contentDocument?.fonts.ready.then(() => true);
      });
      return true;
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  return false;
}
