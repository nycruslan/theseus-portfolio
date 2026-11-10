// Relative, not `@/`: the e2e checks load this module in Playwright's runner, which doesn't map
// tsconfig's paths, so every value import it reaches is relative (.crew/sprint/64/selectors.md).
import { profile } from "../content/profile";
import { addressOf, isSwept, sizeOf, type Win } from "./trials";
import { depthOf, sweptTrial, type Trial, VERDICT } from "./trials-words";

// What a window's card says when its address is shared (.crew/sprint/64/contract.md, T15): the
// window, the answer as a sentence a link preview can carry ("Under by 6.2 px."), the verdict in
// the page's words, and the page's dare, so the link itself says the answer and asks for another
// try. The drawing is lib/trials-card-art.tsx; the tags that name the card are trialsMetadata's.

/** The card's size and type, which the image draws and the page's tags give. */
export const TRIAL_CARD = {
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

/** The owner's first name, as the page's dare calls him (components/trials.tsx). */
const [FIRST_NAME = profile.name] = profile.name.split(" ");

type CardLines = readonly [
  /** "Sea trials · 320 × 568": the page's h1 and the window, as a step card's head names its sprint. */
  head: string,
  /** "Under by 6.2 px." when the links sink, "Clear by 29.2 px." when they float. */
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
  const lines: CardLines = [
    `Sea trials · ${sizeOf(trial.win)}`,
    `${sinks(trial) ? "Under" : "Clear"} by ${depthOf(trial)} px.`,
    `${VERDICT[trial.kind]}.`,
    `Try to sink ${FIRST_NAME}'s contact links.`,
  ];
  const [, answer, verdict] = lines;
  return {
    lines,
    alt: `${profile.name}'s contact links in a ${sizeOf(trial.win)} window: ${answer} ${verdict}`,
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
