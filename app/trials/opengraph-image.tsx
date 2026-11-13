import { HOME } from "@/lib/trials";
import { TRIAL_CARD, trialCardImage } from "@/lib/trials-card";
import { trialCardResponse } from "@/lib/trials-card-art";
import { sweptTrial } from "@/lib/trials-words";

// /trials's card: the 1440 × 900 window's (.crew/sprint/64/contract.md, T15), drawn as every
// window's is (lib/trials-card-art.tsx) and prerendered at build. The page names it with the same
// alt (trialsMetadata), so the tags agree whichever Next reads.

export const alt = trialCardImage(sweptTrial(HOME)).alt;
export const size = { width: TRIAL_CARD.width, height: TRIAL_CARD.height };
export const contentType = TRIAL_CARD.type;

export default function TrialsCardImage() {
  return trialCardResponse(HOME);
}
