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
  /** What the live region says when a visit finds it (words.md). */
  said: string;
  /** The media query, verbatim as the stylesheet holds it. */
  query: string;
  sprint: 43 | 44 | 45;
  pr: number;
};

const ROWS: readonly FitRow[] = [
  {
    n: 1,
    said: "Found fit 1: the drawing gives way, and the contact links follow the bio.",
    words: "The drawing gives way, and the contact links follow the bio",
    query:
      "(width >= 80rem) and (height < 56.25rem), (width >= 80rem) and (aspect-ratio >= 13 / 8)",
    sprint: 43,
    pr: 102,
  },
  {
    n: 2,
    said: "Found fit 2: the facts stand beside the drawing.",
    words: "The facts stand beside the drawing",
    query: "(width >= 80rem) and (height < 44.5rem)",
    sprint: 43,
    pr: 102,
  },
  {
    n: 3,
    said: "Found fit 3: a phone's drawing shrinks with the window.",
    words:
      "A phone's drawing shrinks with the window, and its controls go to the top",
    query: "screen and (width < 48rem)",
    sprint: 44,
    pr: 107,
  },
  {
    n: 4,
    said: "Found fit 4: on the narrowest phones the drawing drops clear of the controls.",
    words: "On the narrowest phones the drawing drops clear of the controls",
    query: "screen and (width < 20.6875rem)",
    sprint: 44,
    pr: 107,
  },
  {
    n: 5,
    said: "Found fit 5: a tablet's drawing gives way.",
    words: "A tablet's drawing gives way, and the facts stand beside it",
    query: "screen and (64rem <= width < 80rem) and (height < 60rem)",
    sprint: 45,
    pr: 108,
  },
  {
    n: 6,
    said: "Found fit 6: the contact links and the key break into two lines.",
    words: "The contact links and the key break into two lines where they read",
    query: "(64rem <= width < 78rem)",
    sprint: 45,
    pr: 108,
  },
  {
    n: 7,
    said: "Found fit 7: a tall tablet keeps the whole sheet.",
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

// The server's reading of a query: the frame is a screen whose viewport is the window, and a rem
// is 16 px, the browser's default (contract, "When a fit is entered"). It reads only the syntax
// the seven use and throws on anything else, so a fit it can't judge fails the build rather than
// stamping wrongly. Each query is read once into a test, since the chart asks it at every grid
// window. T19 holds it to the frame's own matchMedia.

type Test = (win: Win) => boolean;

const REM = 16;
const OPS: Record<string, (a: number, b: number) => boolean> = {
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
};

const opOf = (text: string) => {
  const op = OPS[text];
  if (!op) throw new Error(`"${text}" isn't a comparison`);
  return op;
};

/** A length in px: `80rem`, `331px`. */
function lengthOf(text: string) {
  const match = /^(\d+(?:\.\d+)?)(rem|px)$/.exec(text);
  if (!match)
    throw new Error(`"${text}" isn't a length lib/trials-fits.ts reads`);
  return Number(match[1]) * (match[2] === "rem" ? REM : 1);
}

const sideOf = (name: string): ((win: Win) => number) | undefined =>
  name === "width" ? ([w]) => w : name === "height" ? ([, h]) => h : undefined;

/** `a op b`, either side the feature: `width >= 80rem`, `64rem <= width`, `aspect-ratio >= 13 / 8`. */
function comparison(left: string, opText: string, right: string): Test {
  const op = opOf(opText);
  const leftSide = sideOf(left);
  if (leftSide) {
    const px = lengthOf(right);
    return (win) => op(leftSide(win), px);
  }
  const rightSide = sideOf(right);
  if (rightSide) {
    const px = lengthOf(left);
    return (win) => op(px, rightSide(win));
  }
  const ratio = /^(\d+)\s*\/\s*(\d+)$/.exec(right);
  if (left === "aspect-ratio" && ratio) {
    // Width over height against a ratio, cross-multiplied so no division rounds a boundary.
    const [across, up] = [Number(ratio[1]), Number(ratio[2])];
    return ([w, h]) => op(w * up, across * h);
  }
  throw new Error(
    `"${left} ${opText} ${right}" isn't a feature lib/trials-fits.ts reads`,
  );
}

/** One parenthesised feature: a comparison, or a range with the feature between two lengths. */
function feature(text: string): Test {
  const inner = /^\((.+)\)$/.exec(text.trim())?.[1];
  const parts = (inner ?? "").split(/\s*(<=|>=|<|>)\s*/).map((p) => p.trim());
  const [a = "", op1 = "", b = "", op2 = "", c = ""] = parts;
  if (parts.length === 3) return comparison(a, op1, b);
  if (parts.length === 5) {
    const [low, high] = [comparison(a, op1, b), comparison(b, op2, c)];
    return (win) => low(win) && high(win);
  }
  throw new Error(`"${text}" isn't a feature lib/trials-fits.ts reads`);
}

/** One query of a list: an optional media type, then features joined by `and`. */
function query(text: string): Test {
  const [first = "", ...rest] = text.trim().split(/\s+and\s+/);
  const type = /^(screen|print|all)$/.exec(first)?.[1];
  const tests = (type ? rest : [first, ...rest]).map(feature);
  // The frame is a screen: a print query is read, so the build checks it, and never entered.
  if (type === "print") return () => false;
  return (win) => tests.every((test) => test(win));
}

/** A query list's test: a window enters it when it enters any of its queries. */
function compile(list: string): Test {
  const tests = list.split(",").map(query);
  return (win) => tests.some((test) => test(win));
}

/** A fit as the page stamps it. */
export type Fit = FitRow & {
  /** Whether a window enters the fit's query, as a screen's document at 16 px a rem would. */
  enters: Test;
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
    enters: compile(row.query),
    href: `${REPO_URL}/blob/${process.env.KEEL_REF || "main"}/app/globals.css#L${lineOf(row.query)}`,
    entry,
    wentWrong,
  };
});

/** The fits a window enters, in order. */
export const fitsAt = (win: Win) => FITS.filter((fit) => fit.enters(win));
