import type { Metadata } from "next";
// Relative, not `@/`: lib/trials-card.ts reads these words in Playwright's runner, which doesn't
// map tsconfig's paths, so every value import here is relative (.crew/sprint/64/selectors.md).
import { profile } from "../content/profile";
import { openGraph } from "./metadata";
import { addressOf } from "./trials";
import { headFor, type Trial } from "./trials-answer";

// The trials page's head, for the server (.crew/sprint/63/words.md, 6). What the page says for a
// window is lib/trials-answer.ts, which the client's controller imports too; this module adds what
// reads content/ (the name, the card's tags), so the controller never loads it.

export {
  answerOf,
  depthOf,
  signedOf,
  sweptTrial,
  type Trial,
  VERDICT,
} from "./trials-answer";

/** The window's title and description (words.md, 6). */
const headOf = (trial: Trial) => headFor(trial, profile.name);

/** A card as a page's tags name it (lib/trials-card.ts's trialCardImage). */
type CardImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
  type: string;
};

/**
 * A window page's head: its own title, description and address, and its own card. The page names
 * the card here, with the window's alt, since a card file's `alt` is one string for every window;
 * Next then leaves the file's tags out (memory, sprint 54).
 */
export function trialsMetadata(trial: Trial, card: CardImage): Metadata {
  const { title, description } = headOf(trial);
  const url = addressOf(trial.win);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...openGraph,
      type: "website",
      title,
      description,
      url,
      images: [card],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [card],
    },
  };
}
