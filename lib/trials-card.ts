// Relative, not `@/`: the e2e checks load this module in Playwright's runner, which doesn't map
// tsconfig's paths, so every value import it reaches is relative (.crew/sprint/64/selectors.md).
import { profile } from "../content/profile";
import { addressOf, isSwept, sizeOf, type Win } from "./trials";
import { DARE } from "./trials-dare";
import {
  depthOf,
  signedOf,
  sweptTrial,
  type Trial,
  VERDICT,
} from "./trials-words";

// What a window's card says when its address is shared (.crew/sprint/64/contract.md, T15), in
// Iris's words (.crew/sprint/64/words.md, 6): the page, the window, the answer as a sentence a
// link preview can carry ("Under by 6.2 px."), the verdict, and the page's dare, so the link itself
// says the answer and asks for another try. The drawing is lib/trials-card-art.tsx; the tags that
// name the card are trialsMetadata's.

/** The card's size and type, which the image draws and the page's tags give. */
export const TRIAL_CARD = {
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

/** The drawn words, top to bottom. */
type CardLines = readonly [
  /** "Sea trials", the page's h1. */
  head: string,
  /** "320 × 568". */
  size: string,
  /** "Under by 6.2 px." when the links sink, "Clear by 37.0 px." when they float. */
  answer: string,
  /** The verdict as the page's readout words it, closed as a sentence. */
  verdict: string,
  /** The page's dare. */
  dare: string,
];

export type TrialCardWords = { lines: CardLines; alt: string };

/** Whether the links end under the waterline: the kind says, as signedOf's sign does. */
const sinks = ({ kind }: Trial) => kind === "gap" || kind === "under";

function wordsOf(trial: Trial): TrialCardWords {
  const size = sizeOf(trial.win);
  const f = depthOf(trial);
  const side = sinks(trial) ? "under" : "clear";
  const verdict = `${VERDICT[trial.kind]}.`;
  return {
    lines: [
      "Sea trials",
      size,
      `${sinks(trial) ? "Under" : "Clear"} by ${f} px.`,
      verdict,
      `${DARE}.`,
    ],
    alt: `Sea trials: a ${size} window drawn to its waterline, ${profile.name}'s contact links ${side} by ${f} px (freeboard ${signedOf(trial)} px). ${verdict}`,
  };
}

/** A swept window's card words; undefined off the sweep, whose address never gets a card. */
export function trialCard(win: Win): TrialCardWords | undefined {
  return isSwept(win) ? wordsOf(sweptTrial(win)) : undefined;
}

/** The window's card as its page's tags name it, under the window's own address. */
export function trialCardImage(trial: Trial) {
  return {
    url: `${addressOf(trial.win)}/opengraph-image`,
    alt: wordsOf(trial).alt,
    ...TRIAL_CARD,
  };
}
