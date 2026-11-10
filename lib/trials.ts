// The trials (.crew/sprint/63/contract.md, "The rules, word for word"): which windows the page
// draws, their addresses, which of the crew's checks hold the contact links in each, and the
// answer's kind. Probe's oracle (e2e/trials.ts) implements the same rules from the same words.
// No imports, so the sweep's script (.crew/sprint/63/trials-sweep.mjs) can read the windows too.

export type Win = readonly [width: number, height: number];

/** The grid: widths 320 to 1920 by 16, heights 460 to 1100 by 5 (13,029 windows). */
export const GRID = {
  width: { from: 320, to: 1920, step: 16 },
  height: { from: 460, to: 1100, step: 5 },
} as const;

type Axis = (typeof GRID)[keyof typeof GRID];

/** The window /trials shows. */
export const HOME: Win = [1440, 900];

/** Iris's near misses off the grid. */
export const NAMED: readonly Win[] = [
  [456, 465],
  [792, 575],
  [1160, 635],
  [1366, 595],
];

/** The one pinned window the crew left out on purpose: W8 reports it and holds nothing. */
export const GAP: Win = [320, 568];

export const keyOf = ([w, h]: Win) => `${w}x${h}`;

/** The size as the page writes it: the width, a space, ×, a space, the height. */
export const sizeOf = ([w, h]: Win) => `${w} × ${h}`;

export const addressOf = (win: Win) =>
  keyOf(win) === keyOf(HOME) ? "/trials" : `/trials/${keyOf(win)}`;

const within = (v: number, axis: Axis) => v >= axis.from && v <= axis.to;
const onAxis = (v: number, axis: Axis) =>
  within(v, axis) && (v - axis.from) % axis.step === 0;
/** Halves round up: Math.round does for the non-negative offsets in the grid's range. */
const snapAxis = (v: number, axis: Axis) =>
  axis.from + axis.step * Math.round((v - axis.from) / axis.step);

const inRange = ([w, h]: Win) =>
  within(w, GRID.width) && within(h, GRID.height);
export const onGrid = ([w, h]: Win) =>
  onAxis(w, GRID.width) && onAxis(h, GRID.height);
/** The grid window a window in the grid's range answers to. */
const snap = ([w, h]: Win): Win => [
  snapAxis(w, GRID.width),
  snapAxis(h, GRID.height),
];

/** A window's address segment, `<w>x<h>` written plainly (no leading zero), or undefined. */
export function parseWindow(segment: string): Win | undefined {
  const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(segment);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

/**
 * One of the crew's checks that asserts the title block's contact links inside the window, keyed
 * by its code (never shown: plan.md, call 7). `title` is the start of its test's title, which
 * finds its line in `spec`; `sentence` is Iris's words for what it holds (words.md, 5).
 */
export type TrialCheck = {
  code: string;
  spec: string;
  title: string;
  sprint: number;
  sentence: string;
  windows: readonly Win[];
  /** A run of one-pixel steps, listed apart from the crew's other windows (words.md, 9). */
  run?: boolean;
};

const H10_RUN: Win[] = [];
for (let w = 1380; w <= 1440; w++) H10_RUN.push([w, 900]);

// Read from each check's body (e2e/trials.ts names why each other W, B and H check claims no
// window): every window at which a kept check asserts the links inside the viewport, plus 320 ×
// 568, which W8 reports and doesn't assert.
const CHECKS: readonly TrialCheck[] = [
  {
    code: "B1.1",
    spec: "sheet.spec.ts",
    title: "B1.1 the first screen says who and what",
    sprint: 22,
    sentence:
      "The first screen says who and what: his name, role, summary and contact links are all in view, and his name is the largest text on the page.",
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
    sentence:
      "On each laptop window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.",
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
    sentence:
      "Shrink a 1440-wide window to 700 tall and back: at 700 his name, role, summary, facts and contact links still fit the first screen; at 900 all return to place.",
    windows: [[1440, 700]],
  },
  {
    code: "W8",
    spec: "phone-window.spec.ts",
    title: "W8 the phone window holds the facts",
    sprint: 44,
    sentence:
      "On each phone window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary and contact links fit the first screen with 8 px to spare.",
    windows: [
      [390, 664],
      [393, 659],
      [412, 780],
      [430, 746],
      [375, 548],
      [360, 560],
      [390, 844],
      GAP,
    ],
  },
  {
    code: "W13",
    spec: "tablet-window.spec.ts",
    title: "W13 the tablet window holds the facts",
    sprint: 45,
    sentence:
      "On each tablet window the crew checks, in light and dark and whatever the crew is doing, his name, role, summary, four facts and contact links fit the first screen.",
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
    sentence:
      "The key that says every name is an AI agent he directs shows whole from 1024 to 1439 wide, and at three windows the crew names it fits the first screen with his name, facts and contact links.",
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
    sentence:
      "Whatever the crew is doing, in light and dark, the four facts fit the first screen whole with his name, role, summary and contact links, none of them as large as his name.",
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
    sentence:
      "The key that says every name is an AI agent he directs fits the first screen with the five newest revisions and his name, role and contact links, whatever the crew is doing.",
    windows: [[1440, 900]],
  },
  {
    code: "B4.22",
    spec: "live-layer.spec.ts",
    title: "B4.22 the first screen in every state",
    sprint: 34,
    sentence:
      "While the crew works, waits or rests, the first screen keeps his name, role, summary and contact links, and at 1440 × 900 the line for what the crew is doing now.",
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
    sentence:
      "The link to rebuild the ship moved nothing down: from 1380 to 1440 wide at 900 tall, in every state and font, the contact links sit no lower than before, in view.",
    windows: H10_RUN,
    run: true,
  },
];

/** W8's sentence at the gap, where it reports and holds nothing (words.md, 5). */
const GAP_SENTENCE =
  "Reports where his contact links land in this window and doesn't hold them: Atlas ruled it outside the phone windows the crew fitted.";

/** A check as it stands at one window: W8 says something else at the gap. */
export type Rule = Pick<TrialCheck, "code" | "spec" | "title" | "sprint"> & {
  sentence: string;
};

type Pin = { win: Win; rules: Rule[] };

/** PINS: each window once, its rules by sprint, oldest first, then by code (words.md, 4). */
const PINS: ReadonlyMap<string, Pin> = (() => {
  const pins = new Map<string, Pin>();
  for (const check of CHECKS)
    for (const win of check.windows) {
      const pin = pins.get(keyOf(win)) ?? { win, rules: [] };
      const sentence =
        check.code === "W8" && keyOf(win) === keyOf(GAP)
          ? GAP_SENTENCE
          : check.sentence;
      pin.rules.push({ ...check, sentence });
      pins.set(keyOf(win), pin);
    }
  for (const pin of pins.values())
    pin.rules.sort(
      (a, b) => a.sprint - b.sprint || a.code.localeCompare(b.code),
    );
  return pins;
})();

export const PIN_WINDOWS: readonly Win[] = [...PINS.values()].map(
  (pin) => pin.win,
);

/** The rules that hold a window, none when no check claims it. */
export const rulesAt = (win: Win): readonly Rule[] =>
  PINS.get(keyOf(win))?.rules ?? [];

/** How many windows the crew's checks hold: PINS less the gap (words.md's `{held}`). */
export const HELD_WINDOWS = PINS.size - 1;

/** The windows the sweep measures besides the grid: PINS and the named windows. */
export const OFF_GRID: readonly Win[] = [...PIN_WINDOWS, ...NAMED].filter(
  (win) => !onGrid(win),
);

export const isSwept = (win: Win) =>
  onGrid(win) || OFF_GRID.some((other) => keyOf(other) === keyOf(win));

/**
 * The window the page draws for a window someone asks for: a swept window itself, any other in
 * the grid's range its grid window, and none for the rest, whose address is the site's 404.
 */
export const drawnFor = (win: Win): Win | undefined =>
  isSwept(win) ? win : inRange(win) ? snap(win) : undefined;

/**
 * Where the form's GET lands (`/trials/go?w=&h=`): the address of the window drawn for the one
 * typed, /trials when either side is missing or not a number, and the typed window's own address,
 * the 404, when it is outside the grid's range.
 */
export function goTo(width: string | null, height: string | null) {
  const number = (text: string | null) =>
    text !== null && text.trim() !== "" && Number.isFinite(Number(text))
      ? Math.round(Number(text))
      : undefined;
  const [w, h] = [number(width), number(height)];
  if (w === undefined || h === undefined) return "/trials";
  const drawn = drawnFor([w, h]);
  return drawn ? addressOf(drawn) : `/trials/${w}x${h}`;
}

/** The windows a run lists apart, by checks whose windows are a run: H10's 1380 to 1439. */
export const RUN_WINDOWS: readonly Win[] = PIN_WINDOWS.filter((win) =>
  rulesAt(win).every((rule) => CHECKS.find((c) => c.code === rule.code)?.run),
);

export type Kind = "gap" | "held" | "near" | "under" | "afloat";

/** The answer's kind, the first that applies, from the freeboard (the rules, word for word). */
export function kindOf(win: Win, freeboard: number): Kind {
  const pinned = PINS.has(keyOf(win));
  if (pinned && freeboard < 0) return "gap";
  if (pinned) return "held";
  if (freeboard >= 0 && freeboard < 1) return "near";
  if (freeboard < 0) return "under";
  return "afloat";
}
