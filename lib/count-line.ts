// Relative, not `@/`: lib/step-card.ts loads this in Playwright's runner, which doesn't map
// tsconfig's paths.
import { PLANKS } from "./hull-layouts";

/**
 * The count line under the Log's caption, after `k` merges, as plain text
 * (.crew/sprint/52/first-contract.md, "The rule, word for word"): the page sets it under the
 * caption (components/log.tsx) and a step's card under its headline (lib/step-card.ts).
 * `merged` is the merged sprints, oldest first.
 */
export function countLine(k: number, merged: readonly number[]): string {
  const all = PLANKS.length;
  if (k < all) {
    const sailing = all - k;
    return `${k} of ${all} original planks ${k === 1 ? "is" : "are"} out. ${
      sailing === 1
        ? "The gap is the 1 still sailing."
        : `The gaps are the ${sailing} still sailing.`
    }`;
  }
  const own = k - all;
  const since =
    own > 0
      ? ` Since then the crew has replaced ${own} ${own === 1 ? "plank" : "planks"} of its own.`
      : "";
  return `All ${all} original planks are out: the last went with sprint ${merged[all - 1]}.${since}`;
}
