/**
 * The owner's text as its sentences, the one rule everything that splits his words uses: the bio
 * on the sheet (.crew/sprint/22/contract.md, B1.2), Work's summaries and the social card's lead
 * (.crew/sprint/41/contract.md, data rules). It splits after each ". " (a full stop, then a space),
 * trims each part and drops empty ones, so every word stays his and in his order.
 */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=\.) /)
    .map((part) => part.trim())
    .filter(Boolean);
}
