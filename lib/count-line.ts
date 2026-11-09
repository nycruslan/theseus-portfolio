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

/**
 * The chapter line after `k` merges, or null on a step that isn't a chapter
 * (.crew/sprint/58/first-contract.md, "The chapter step"; Iris's words, .crew/sprint/59/
 * placement.md, section 2): from the 44th merge, every 22nd, where the riffle stops, it says the
 * crew's own first planks are all out, up to sprint S, the (k - 22)th merged. The 22nd merge asks
 * the question instead, so it is no chapter here. `merged` is the merged sprints, oldest first.
 */
export function chapterLine(
  k: number,
  merged: readonly number[],
): string | null {
  const all = PLANKS.length;
  if (k < 2 * all || k % all !== 0) return null;
  const s = merged[k - all - 1];
  return s === undefined ? null : `Every plank up to sprint ${s} is out too.`;
}
