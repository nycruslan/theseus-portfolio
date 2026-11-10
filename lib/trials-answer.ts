import {
  GAP,
  HELD_WINDOWS,
  type Kind,
  keyOf,
  kindOf,
  type Rule,
  rulesAt,
  sizeOf,
  type Win,
} from "./trials";
import { SWEEP_META, sweptAt } from "./trials-sweep";

// What the trials page says for a window, in Iris's words (.crew/sprint/63/words.md and
// .crew/sprint/64/words.md), from the committed sweep and the crew's record (lib/trials.ts). One
// module for the server's page and the client's controller (.crew/sprint/64/contract.md, call 3),
// so it imports nothing but the rules and the sweep, both relative: Probe's runner reads it too.

/** A swept window's reading and what the record answers for it. */
export type Trial = {
  win: Win;
  /** The sweep's freeboard, in px to 0.1, its sign the kind's. */
  freeboard: number;
  kind: Kind;
  rules: readonly Rule[];
};

/**
 * The trial at a swept window; undefined for a window the sweep doesn't hold. The controller
 * reads this one, so the build's message below stays out of its chunk.
 */
export function trialAt(win: Win): Trial | undefined {
  const swept = sweptAt(win[0], win[1]);
  if (!swept) return undefined;
  const kind = kindOf(win, swept.freeboard);
  // The gap's words are 320 × 568's own (Atlas's sprint 44 ruling): if another pinned window ever
  // sinks, fail the build rather than print them under it (words.md, 3).
  if (kind === "gap" && keyOf(win) !== keyOf(GAP))
    throw new Error(
      `${sizeOf(win)} is pinned and sinks: the crew's own gap is only ${sizeOf(GAP)}`,
    );
  return { win, freeboard: swept.freeboard, kind, rules: rulesAt(win) };
}

/** The trial at a window the sweep must hold: a stale sweep fails the build, naming its command. */
export function sweptTrial(win: Win): Trial {
  const trial = trialAt(win);
  if (!trial)
    throw new Error(
      `lib/trials-sweep.json (taken on ${SWEEP_META.commit} in Chromium ${SWEEP_META.chromium}) has no reading at ${sizeOf(win)}: rewrite it with \`pnpm build && node .crew/sprint/63/trials-sweep.mjs\``,
    );
  return trial;
}

export const VERDICT: Record<Kind, string> = {
  gap: "The crew's own gap",
  held: "Held by the crew's checks",
  near: "A near miss",
  under: "Sunk",
  afloat: "Afloat",
};

const sinks = ({ kind }: Pick<Trial, "kind">) =>
  kind === "gap" || kind === "under";

/** `{f}`: the freeboard's size to one decimal. */
export const depthOf = ({ freeboard }: Pick<Trial, "freeboard">) =>
  Math.abs(freeboard).toFixed(1);

/** The freeboard signed as the kind reads: + when it floats, − (U+2212) when it sinks. */
export const signedOf = (trial: Pick<Trial, "freeboard" | "kind">) =>
  `${sinks(trial) ? "−" : "+"}${depthOf(trial)}`;

const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** The answer's words around its depth, `{f} px`, which the page sets unbroken (words.md, 3). */
export function answerOf(trial: Trial): {
  before: string;
  after: string;
  /** The gap's own "8 px", unbroken too. */
  margin?: { before: string; after: string };
} {
  const n = trial.rules.length;
  switch (trial.kind) {
    case "gap":
      return {
        before: "The contact links end ",
        after:
          " under the waterline, and the crew knew. When it fitted phones in sprint 44, this window was outside the set, and Atlas, the crew's lead, ruled that its check would report where the links land here rather than hold them. Every phone window the crew checks keeps them at least ",
        margin: { before: "8 px", after: " clear." },
      };
    case "held":
      return {
        before: "The contact links stand ",
        after: ` above the waterline, and ${NUMBER_WORDS[n] ?? n} of the crew's checks ${n === 1 ? "holds" : "hold"} them there. If a change sank them in this window, the tests would fail and it couldn't merge.`,
      };
    case "near":
      return {
        before: "The contact links clear the waterline by ",
        after:
          ", less than a pixel. With no check holding them here, a change could sink them, and this page would say so.",
      };
    case "under":
      return {
        before: "You sank them. The contact links end ",
        after: ` under the waterline, in a window the crew's checks leave alone: they hold the links up in ${HELD_WINDOWS} others.`,
      };
    case "afloat":
      return {
        before: "The contact links stand ",
        after:
          " above the waterline. They float here on the page's own layout.",
      };
  }
}

/** The window's title (words.md, 6), with the name the server reads from content/. */
export const titleFor = (trial: Trial, name: string) =>
  `${sizeOf(trial.win)}: ${VERDICT[trial.kind]}, ${depthOf(trial)} px ${sinks(trial) ? "under" : "clear"} — Sea trials — ${name}`;

/** The window's title and description (words.md, 6); the controller writes only the title. */
export function headFor(trial: Trial, name: string) {
  const size = sizeOf(trial.win);
  return {
    title: titleFor(trial, name),
    description: `${size}: ${VERDICT[trial.kind]}. ${name}'s contact links end ${depthOf(trial)} px ${sinks(trial) ? "below" : "above"} the foot of the first screen. Try to sink them in any window.`,
  };
}

/** The frame's title: the page in it, at the window. */
export const frameTitleOf = (win: Win, name: string) =>
  `${name}'s first page in a ${sizeOf(win)} window`;

/** The record's line over its rules, and the one line when no check claims the window. */
export const RECORD = {
  note: "Each of the crew's checks at this window, linked to its test.",
  unclaimed: "None of the crew's checks claims this window.",
};

// Tb's words (.crew/sprint/64/words.md). What is heard says "by" and "pixels", since screen readers
// read × as "times" and px as "p x"; what is seen keeps Ta's × and px.

/** The window as it is heard: `1440 by 900`. */
const heard = ([w, h]: Win) => `${w} by ${h}`;

/** The corner's name, at rest and after every settle (words.md, 1). */
export const cornerOf = (win: Win) => `Window corner, ${heard(win)}`;

/** The corner's description, a hidden element its aria-describedby names (words.md, 1). */
export const CORNER_KEYS =
  "Drag it, or use the arrow keys: left and right change the width by 16 pixels, up and down move the foot by 5 pixels, Page Up and Page Down by 50 pixels, Home goes to the smallest window and End to the largest.";

/** The caption's second sentence, shown with script only (words.md, 2). */
export const CAPTION_DRAG =
  "Drag the frame's corner to try another window; it takes the arrow keys too.";

/** The verdict's and the answer's slots while a hand holds the corner (words.md, 3). */
export const MEASURING = {
  verdict: "Measured live in your browser",
  answer:
    "Let go and it settles on the nearest window the crew measured, with its answer.",
};

/** What the live region says once a window settles (words.md, 4). */
export const settledOf = (trial: Trial) =>
  `${heard(trial.win)}: ${VERDICT[trial.kind]}, ${depthOf(trial)} pixels ${sinks(trial) ? "under" : "above"} the waterline.`;

/**
 * Copy link's words (words.md, 4 and 5): what the live region says and the line beside the button
 * shows, when the copy worked and when it didn't, `{w}` and `{h}` the window. The corner's listener
 * says them before the controller loads, so the server hands it these.
 */
export const COPY = {
  done: [
    "Link to {w} by {h} copied.",
    "Copied. It opens at {w} × {h}, with this answer.",
  ],
  failed: [
    "Couldn't copy the link. It's in the address bar.",
    "Couldn't copy. The address bar has the link.",
  ],
} as const;
