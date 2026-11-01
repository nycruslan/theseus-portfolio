/** The one role the particulars are quoted from: Detail A's (.crew/sprint/39/contract.md). */
export const PARTICULARS_COMPANY = "JPMorgan Chase & Co.";

type Particular = { term: string; phrase: string };

/**
 * The rows, in the contract's order (.crew/sprint/39/contract.md, data rules), each a term and the
 * phrase it quotes. The phrases start lower case, as the owner's sentence has them and as the page
 * shows them (Iris's pick, .crew/sprint/39/placement.md): each reads as its term's value. Terms
 * carry no digits, so the block's only figures are the owner's.
 */
const ROWS: readonly Particular[] = [
  {
    term: "Leads",
    phrase: "a team of 7 across AI research, backend and platform",
  },
  {
    term: "Reach",
    phrase: "multi-agent workflows several thousand employees use firm-wide",
  },
  { term: "Gateway", phrase: "around 8 product teams route through" },
  {
    term: "Impact",
    phrase: "cut manual processing on the flagship workflow by about 55%",
  },
];

/** The text with its first letter in the other case: "cut" to "Cut", "Cut" to "cut". */
const otherCase = (text: string) => {
  const first = text.charAt(0);
  const swapped =
    first === first.toLowerCase() ? first.toUpperCase() : first.toLowerCase();
  return swapped + text.slice(1);
};

/**
 * The particulars are quoted from the summary, so a row shows only while the summary holds its
 * phrase as written or with the first letter in the other case (the owner may start a sentence
 * with it). Each phrase is returned as the page shows it, lower case first whichever case the
 * summary uses. With fewer than two rows it is null, and the page sets no table: one row isn't a
 * table of particulars, and it never shows words the owner has taken out.
 */
export function particulars(summary: string): Particular[] | null {
  const rows = ROWS.filter(
    ({ phrase }) =>
      summary.includes(phrase) || summary.includes(otherCase(phrase)),
  ).map((row) => ({ ...row }));
  return rows.length >= 2 ? rows : null;
}
