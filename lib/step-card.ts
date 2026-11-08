// Relative, not `@/`: the e2e checks load this module in Playwright's runner, which doesn't map
// tsconfig's paths, so what it loads at run time (these, and what they import) is relative.
import { countLine } from "./count-line";
import { PLANKS } from "./hull-layouts";
import { shipsAt } from "./lines-plan";
import { instantWords } from "./log-dates";
import type { SprintEntry } from "./sprint-log";

/** A step's card: its size, which the image draws and the page's tags give, and its type. */
export const STEP_CARD = {
  width: 1200,
  height: 630,
  type: "image/png",
} as const;

/** What a step's card says, and the tags that name it (.crew/sprint/54/contract.md). */
type StepCard = {
  /** "Sprint 23 · 22 Oct 2026", or "Sprint n" alone before the sprint has a merge record. */
  head: string;
  /** The sprint's goal, or the question at the step where the last original leaves. */
  headline: string;
  /** The page's count line for the step. */
  body: string;
  /** The image's alt: the head and the headline in one sentence. */
  alt: string;
  /** og:title and twitter:title: "Sprint 23: Which one is the Theseus?". */
  title: string;
};

/**
 * The words on step `n`'s card, every one from the record or the page's rules: the head names the
 * sprint and the UTC day it merged, the year always, since a network keeps the card it fetched
 * long after the Log's newest year moves on; the headline is the goal the page's description
 * already gives, except at the step where k = PLANKS.length (the step that asks the question on
 * the page), and the body is the page's count line. `entries` is the Log's, newest first
 * (lib/sprint-log.ts). Plain data, so a check can read it outside Next.
 */
export function stepCard(entries: readonly SprintEntry[], n: number): StepCard {
  const entry = entries.find((candidate) => candidate.sprint === n);
  if (!entry) throw new RangeError(`No merged sprint ${n} in the Log`);
  // The planks are seated oldest first, as on the page.
  const merged = entries.map((candidate) => candidate.sprint).reverse();
  const { k } = shipsAt(merged, n);
  const head = entry.merge
    ? `Sprint ${n} · ${instantWords(entry.merge.mergedAt).day}`
    : `Sprint ${n}`;
  const headline =
    k === PLANKS.length ? "Which one is the Theseus?" : entry.goal;
  return {
    head,
    headline,
    body: countLine(k, merged),
    alt: `${head}: ${headline}`,
    title: `Sprint ${n}: ${headline}`,
  };
}
