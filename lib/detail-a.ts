/** The one role Detail A is drawn from (.crew/sprint/23/contract.md, data rules). */
export const DETAIL_A_COMPANY = "JPMorgan Chase & Co.";

/**
 * Detail A's labels, in reading order (.crew/sprint/23/contract.md, data rules): who routes
 * through the gateway, the gateway, and the three providers it sits over.
 */
const LABELS = [
  "Around 8 product teams",
  "Model-agnostic AI gateway",
  "AWS Bedrock",
  "Azure OpenAI",
  "Anthropic API",
] as const;

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/**
 * The detail is drawn from the summary's own words, so it is drawn only while the summary holds
 * every one of them, as written or with its first letter lower-cased as it reads mid-sentence.
 * Otherwise null, and the page draws no figure: it never shows words the owner has taken out.
 */
export function detailA(summary: string): string[] | null {
  const held = LABELS.every(
    (label) => summary.includes(label) || summary.includes(lowerFirst(label)),
  );
  return held ? [...LABELS] : null;
}
