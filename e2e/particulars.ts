import { profile } from "../content/profile";

// The particulars' oracle (.crew/sprint/39/contract.md, "Data rules"), written from the contract's
// words and never from the page's code (lib/), so the two implementations check each other. Pc's
// social card carries the same rule (.crew/sprint/38/plan.md), so it lives here, not in the spec.

/** The role the rows are quoted from: Detail A's source. */
export const SOURCE_COMPANY = "JPMorgan Chase & Co.";

export type Particular = { term: string; phrase: string };

/** The rows, in the contract's order, each a term and the phrase it quotes from the summary. */
export const PARTICULARS: readonly Particular[] = [
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

/** The phrase with its first letter in the other case: "a team" to "A team", "Cut" to "cut". */
export function otherCase(phrase: string) {
  const first = phrase.charAt(0);
  const swapped =
    first === first.toLowerCase() ? first.toUpperCase() : first.toLowerCase();
  return swapped + phrase.slice(1);
}

/**
 * The rule: a row shows only while the summary holds its phrase as written, or with the first
 * letter in the other case; with fewer than two rows there is no block (null).
 */
export function particularsOf(summary: string): Particular[] | null {
  const rows = PARTICULARS.filter(
    ({ phrase }) =>
      summary.includes(phrase) || summary.includes(otherCase(phrase)),
  );
  return rows.length >= 2 ? rows : null;
}

/** A `dd`'s words against its phrase: only the first letter's case is open to choice. */
export const showsPhrase = (shown: string, phrase: string) =>
  shown === phrase || shown === otherCase(phrase);

/** The summary the page quotes from: the role whose company is SOURCE_COMPANY. */
export const SOURCE_SUMMARY =
  profile.experience.find((role) => role.company === SOURCE_COMPANY)?.summary ??
  null;
