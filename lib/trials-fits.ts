import wa from "../.crew/sprint/43/retro.json";
import wb from "../.crew/sprint/44/retro.json";
import wc from "../.crew/sprint/45/retro.json";
import { REPO_URL } from "./site";
import { entryOf, type SprintEntry } from "./sprint-log";
import type { Win } from "./trials";

// The crew's seven fits (.crew/sprint/65/contract.md, "The seven fits"): the media queries the
// window-fit sprints (Wa 43, Wb 44, Wc 45) wrote into app/globals.css to lay out /'s first screen
// for a range of windows. The page stamps a fit when the frame's window enters its whole query.
//
// The three retros and the stylesheet's lines are fixed in the server's bundle when the site is
// built, never read at render: a window page renders on demand, on a server without the
// repository's files (memory, sprint 46). The retros are imported and go through the Log's own
// rules (lib/sprint-log.ts, entryOf), so a stamp names who the sprint's revision row names and
// quotes what its record prints. The stylesheet's `@media` lines come from next.config.ts's
// STYLESHEET_MEDIA, since a Server Component can't import a .css file as text. This module reads
// node:fs through the Log's rules, so it is the server's alone: the client's controller reads each
// fit from its stamp (contract, call 3).

/** A fit's number, in the contract's order. */
export type FitNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type FitRow = {
  n: FitNumber;
  /** What the fit does, in Iris's words (words.md). */
  words: string;
  /** The media query, verbatim as the stylesheet holds it. */
  query: string;
  sprint: 43 | 44 | 45;
  pr: number;
};

const ROWS: readonly FitRow[] = [
  {
    n: 1,
    words: "The drawing gives way, and the contact links follow the bio",
    query:
      "(width >= 80rem) and (height < 56.25rem), (width >= 80rem) and (aspect-ratio >= 13 / 8)",
    sprint: 43,
    pr: 102,
  },
  {
    n: 2,
    words: "The facts stand beside the drawing",
    query: "(width >= 80rem) and (height < 44.5rem)",
    sprint: 43,
    pr: 102,
  },
  {
    n: 3,
    words:
      "A phone's drawing shrinks with the window, and its controls go to the top",
    query: "screen and (width < 48rem)",
    sprint: 44,
    pr: 107,
  },
  {
    n: 4,
    words: "On the narrowest phones the drawing drops clear of the controls",
    query: "screen and (width < 20.6875rem)",
    sprint: 44,
    pr: 107,
  },
  {
    n: 5,
    words: "A tablet's drawing gives way, and the facts stand beside it",
    query: "screen and (64rem <= width < 80rem) and (height < 60rem)",
    sprint: 45,
    pr: 108,
  },
  {
    n: 6,
    words: "The contact links and the key break into two lines where they read",
    query: "(64rem <= width < 78rem)",
    sprint: 45,
    pr: 108,
  },
  {
    n: 7,
    words:
      "A tall tablet keeps the whole sheet, with the facts in a row of four",
    query:
      "(64rem <= width < 80rem) and (height >= 60rem), print and (64rem <= width < 80rem)",
    sprint: 45,
    pr: 108,
  },
];

/** The three retros, by sprint, as the Log reads them. */
const RETROS: Record<FitRow["sprint"], SprintEntry> = {
  43: entryOf(wa, ".crew/sprint/43/retro.json", "43"),
  44: entryOf(wb, ".crew/sprint/44/retro.json", "44"),
  45: entryOf(wc, ".crew/sprint/45/retro.json", "45"),
};

/** Every `@media` rule's query in app/globals.css, whitespace squashed, and the lines it opens on. */
const MEDIA: Readonly<Record<string, readonly number[]>> = JSON.parse(
  process.env.STYLESHEET_MEDIA ?? "{}",
);

/**
 * The stylesheet's line that opens the fit's `@media` rule, whitespace aside. A query the file no
 * longer holds, or holds twice, would stamp a fit nothing builds: fail the build instead.
 */
function lineOf(query: string) {
  const lines = MEDIA[query.replace(/\s+/g, " ").trim()] ?? [];
  const [line] = lines;
  if (line === undefined || lines.length !== 1)
    throw new Error(
      `app/globals.css holds "@media ${query}" ${lines.length} times, not once: lib/trials-fits.ts's fit is the stylesheet's`,
    );
  return line;
}

/** A fit as the page stamps it. */
export type Fit = FitRow & {
  /** The query's line at the build's commit, as the record's rules link their tests. */
  href: string;
  /** The sprint's entry on the Log: its revision row's names and what went wrong first. */
  entry: SprintEntry;
  wentWrong: string;
};

export const FITS: readonly Fit[] = ROWS.map((row) => {
  const entry = RETROS[row.sprint];
  // The stamp names its pull request: a retro that says another would cite the wrong one.
  if (entry.pr !== row.pr)
    throw new Error(
      `.crew/sprint/${row.sprint}/retro.json's pr is ${entry.pr}, not #${row.pr}: lib/trials-fits.ts's fit ${row.n} cites the wrong pull request`,
    );
  const wentWrong = entry.wentWrong[0];
  if (wentWrong === undefined)
    throw new Error(
      `.crew/sprint/${row.sprint}/retro.json has no wentWrong for fit ${row.n} to quote`,
    );
  return {
    ...row,
    href: `${REPO_URL}/blob/${process.env.KEEL_REF || "main"}/app/globals.css#L${lineOf(row.query)}`,
    entry,
    wentWrong,
  };
});

// The server's reading of a query at a window: the frame is a screen whose viewport is the
// window, and a rem is 16 px, the browser's default (contract, "When a fit is entered"). It reads
// only the syntax the seven use, and throws on anything else, so a fit it can't judge fails the
// build rather than stamping wrongly. T19 holds it to the frame's own matchMedia.

const REM = 16;
const COMPARE = /^(<=|>=|<|>)$/;

type Size = { width: number; height: number };

function compare(a: number, op: string, b: number) {
  switch (op) {
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
  }
  throw new Error(`"${op}" isn't a comparison`);
}

/** A length in px: `80rem`, `331px`. */
function lengthOf(text: string) {
  const match = /^(\d+(?:\.\d+)?)(rem|px)$/.exec(text);
  if (!match)
    throw new Error(`"${text}" isn't a length lib/trials-fits.ts reads`);
  return Number(match[1]) * (match[2] === "rem" ? REM : 1);
}

/** `a op b`, either side the feature: `width >= 80rem`, `64rem <= width`. */
function holds(left: string, op: string, right: string, size: Size): boolean {
  if (left === "width" || left === "height")
    return compare(size[left], op, lengthOf(right));
  if (right === "width" || right === "height")
    return compare(lengthOf(left), op, size[right]);
  if (left === "aspect-ratio") {
    // Width over height against a ratio, cross-multiplied so no division rounds a boundary.
    const ratio = /^(\d+)\s*\/\s*(\d+)$/.exec(right);
    if (!ratio) throw new Error(`"${right}" isn't a ratio`);
    return compare(
      size.width * Number(ratio[2]),
      op,
      Number(ratio[1]) * size.height,
    );
  }
  throw new Error(
    `"${left} ${op} ${right}" isn't a feature lib/trials-fits.ts reads`,
  );
}

/** One parenthesised feature: a comparison, or a range with the feature between two lengths. */
function featureHolds(text: string, size: Size) {
  const parts = text.split(/\s*(<=|>=|<|>)\s*/).map((part) => part.trim());
  const [a = "", op1 = "", b = "", op2, c] = parts;
  if (parts.length === 3 && COMPARE.test(op1)) return holds(a, op1, b, size);
  if (parts.length === 5 && op2 !== undefined && c !== undefined)
    return holds(a, op1, b, size) && holds(b, op2, c, size);
  throw new Error(`"(${text})" isn't a feature lib/trials-fits.ts reads`);
}

/** One query of a list: an optional media type, then features joined by `and`. */
function queryHolds(query: string, size: Size) {
  const [first = "", ...rest] = query.split(/\s+and\s+/);
  const type = /^(screen|print|all)$/.exec(first.trim())?.[1];
  const features = type ? rest : [first, ...rest];
  if (type === "print") return false;
  return features.every((feature) => {
    const inner = /^\((.+)\)$/.exec(feature.trim())?.[1];
    if (inner === undefined)
      throw new Error(`"${feature}" isn't a feature lib/trials-fits.ts reads`);
    return featureHolds(inner, size);
  });
}

/** Whether a window enters a query, as a screen's document at 16 px a rem would match it. */
export function enters(query: string, [width, height]: Win) {
  return query
    .split(",")
    .some((one) => queryHolds(one.trim(), { width, height }));
}

/** The fits a window enters, in order. */
export const fitsAt = (win: Win) =>
  FITS.filter((fit) => enters(fit.query, win));
