// Probe's oracle for Tc's seven fits (.crew/sprint/65/contract.md, "The seven fits"): the
// contract's table word for word, and a reader of the seven queries as a browser reads them at a
// screen window with a rem of 16 px. Reads only: every assertion is in e2e/trials-chart.spec.ts
// (Lens's gate counts a spec's `expect(`).

export type Fit = {
  /** The table's #, and the page's `data-fit`. */
  n: number;
  /** The fit, the table's working words (Iris's `words.md` decides what the page says). */
  words: string;
  /** Iris's words for it (.crew/sprint/65/words.md, 4): the link to its query's line. */
  stamp: string;
  /** Where: its range, the line under its words. */
  where: string;
  /** `data-said`: what the settle speaks when it is found. */
  said: string;
  /** Its query, verbatim. */
  query: string;
  /** The line the table gives at d6b9fbf, for the record: the checks read the build's own file. */
  lineAtContract: number;
  /** "Windows it covers (grid windows, sinking)", as the table writes it on the sweep 10e9409. */
  covers: string;
  sprint: number;
  pr: number;
  /** "Drawn / Checked / Tested", as the table writes it ("the same" spelled out). */
  crew: string;
  /** `wentWrong[0].what`, verbatim ("the same" spelled out). */
  wentWrong: string;
};

const WA_WRONG =
  "Three changes to the same title block landed on main while this sprint built, and one put the contact links back under the fold";
const WB_WRONG =
  "The first layout was measured in a different browser build than the tests use, and one phone size didn't fit there";
const WC_WRONG =
  "The plan asked two checks to run against a deployed site, but they only hold without a live feed";

export const FITS: readonly Fit[] = [
  {
    n: 1,
    words: "The drawing gives way, and the contact links follow the bio",
    stamp: "The drawing gives way, and the contact links follow his summary.",
    where: "From 1280 px wide, under 900 tall or wider than 13:8.",
    said: "Found a fit from sprint 43: the drawing gives way, and the contact links follow his summary.",
    query:
      "(width >= 80rem) and (height < 56.25rem), (width >= 80rem) and (aspect-ratio >= 13 / 8)",
    lineAtContract: 1512,
    covers:
      "1280 wide and up, under 900 tall or wider than 13:8 (4,383; 1,141)",
    sprint: 43,
    pr: 102,
    crew: "Forge, Pixel / Lens / Probe",
    wentWrong: WA_WRONG,
  },
  {
    n: 2,
    words: "The facts stand beside the drawing",
    stamp: "The four facts stand beside the drawing.",
    where: "From 1280 px wide, under 712 tall.",
    said: "Found a fit from sprint 43: the four facts stand beside the drawing.",
    query: "(width >= 80rem) and (height < 44.5rem)",
    lineAtContract: 1528,
    covers: "1280 and up, under 712 tall (2,091; 1,141)",
    sprint: 43,
    pr: 102,
    crew: "Forge, Pixel / Lens / Probe",
    wentWrong: WA_WRONG,
  },
  {
    n: 3,
    words:
      "A phone's drawing shrinks with the window, and its controls go to the top",
    stamp:
      "The drawing shrinks to the window's height, with Read as page above it.",
    where: "Under 768 px wide.",
    said: "Found a fit from sprint 44: the drawing shrinks to the window's height, with Read as page above it.",
    query: "screen and (width < 48rem)",
    lineAtContract: 1699,
    covers: "under 768 wide (3,612; 61)",
    sprint: 44,
    pr: 107,
    crew: "Forge, Pixel / Lens / Probe",
    wentWrong: WB_WRONG,
  },
  {
    n: 4,
    words: "On the narrowest phones the drawing drops clear of the controls",
    stamp:
      "The drawing drops a few pixels more, so its Profile label clears the row above.",
    where: "Under 331 px wide.",
    said: "Found a fit from sprint 44: the drawing drops a few pixels more, so its Profile label clears the row above.",
    query: "screen and (width < 20.6875rem)",
    lineAtContract: 1820,
    covers: "under 331 wide (129, the 320 column; 23, 320 × 568 among them)",
    sprint: 44,
    pr: 107,
    crew: "Forge, Pixel / Lens / Probe",
    wentWrong: WB_WRONG,
  },
  {
    n: 5,
    words: "A tablet's drawing gives way, and the facts stand beside it",
    stamp: "The drawing gives way, and the four facts stand beside it.",
    where: "From 1024 to 1279 px wide, under 960 tall.",
    said: "Found a fit from sprint 45: the drawing gives way, and the four facts stand beside it.",
    query: "screen and (64rem <= width < 80rem) and (height < 60rem)",
    lineAtContract: 1574,
    covers: "1024 to 1279, under 960 tall (1,600; 554)",
    sprint: 45,
    pr: 108,
    crew: "Forge / Lens / Probe",
    wentWrong: WC_WRONG,
  },
  {
    n: 6,
    words: "The contact links and the key break into two lines where they read",
    stamp:
      "His contact links take their own line under the site's three, and the key breaks after its first sentence.",
    where: "From 1024 to 1247 px wide.",
    said: "Found a fit from sprint 45: his contact links take their own line under the site's three, and the key breaks after its first sentence.",
    query: "(64rem <= width < 78rem)",
    lineAtContract: 1646,
    covers: "1024 to 1247 (1,806; 492)",
    sprint: 45,
    pr: 108,
    crew: "Forge / Lens / Probe",
    wentWrong: WC_WRONG,
  },
  {
    n: 7,
    words:
      "A tall tablet keeps the whole sheet, with the facts in a row of four",
    stamp:
      "The drawing keeps its full width, and the four facts stand in a row under it.",
    where: "From 1024 to 1279 px wide, 960 tall or more.",
    said: "Found a fit from sprint 45: the drawing keeps its full width, and the four facts stand in a row under it.",
    query:
      "(64rem <= width < 80rem) and (height >= 60rem), print and (64rem <= width < 80rem)",
    lineAtContract: 1427,
    covers: "1024 to 1279, 960 tall and up (464; 0)",
    sprint: 45,
    pr: 108,
    crew: "Forge / Lens / Probe",
    wentWrong: WC_WRONG,
  },
];

/** The table's "Drawn / Checked / Tested" split into the revision row's three cells. */
export function crewCells(fit: Fit) {
  const [drawn = "", checked = "", tested = ""] = fit.crew.split(" / ");
  return { drawn, checked, tested };
}

// ---------------------------------------------------------------------------------------------
// The queries, read as a screen at a w × h window with a 16 px rem: a comma is "or", `and` joins
// a media type and conditions, `print` never matches a screen, and a condition is a plain or a
// two-sided range of width, height or aspect-ratio. Proven against the browser's own matchMedia
// at every window T19 reads.

type Feature = "width" | "height" | "aspect-ratio";
const amountOf = (text: string): number => {
  const t = text.trim();
  const ratio = t.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  const rem = t.match(/^(\d+(?:\.\d+)?)rem$/);
  if (rem) return Number(rem[1]) * 16;
  const px = t.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);
  return Number.NaN;
};
const compare = (a: number, op: string, b: number) =>
  op === "<"
    ? a < b
    : op === "<="
      ? a <= b
      : op === ">"
        ? a > b
        : op === ">="
          ? a >= b
          : op === "="
            ? a === b
            : false;

function condition(text: string, w: number, h: number): boolean {
  const of = (f: Feature) => (f === "width" ? w : f === "height" ? h : w / h);
  const two = text.match(
    /^\s*([^<>=]+?)\s*(<=|<|>=|>)\s*(width|height|aspect-ratio)\s*(<=|<|>=|>)\s*([^<>=]+?)\s*$/,
  );
  if (two) {
    const [, lo = "", op1 = "", f, op2 = "", hi = ""] = two;
    const v = of(f as Feature);
    return compare(amountOf(lo), op1, v) && compare(v, op2, amountOf(hi));
  }
  const one = text.match(
    /^\s*(width|height|aspect-ratio)\s*(<=|<|>=|>|=)\s*([^<>=]+?)\s*$/,
  );
  if (one) {
    const [, f, op = "", value = ""] = one;
    return compare(of(f as Feature), op, amountOf(value));
  }
  throw new Error(`a condition the oracle can't read: (${text})`);
}

/** Whether `query` matches a screen at w × h with a 16 px rem. */
export function matchesAt(query: string, w: number, h: number): boolean {
  return query.split(",").some((part) => {
    let rest = part.trim();
    const type = rest.match(/^(screen|print|all)\s+and\s+/);
    if (type) {
      if (type[1] === "print") return false;
      rest = rest.slice(type[0].length);
    } else if (/^(screen|all)$/.test(rest)) return true;
    else if (rest === "print") return false;
    const conditions = [...rest.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
    return conditions.every((c) => condition(c ?? "", w, h));
  });
}

/** The fits a screen at w × h enters, in the table's order. */
export const fitsAt = (w: number, h: number) =>
  FITS.filter((fit) => matchesAt(fit.query, w, h)).map((fit) => fit.n);
