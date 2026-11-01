import { profile } from "@/content/profile";
import { PARTICULARS_COMPANY, particulars } from "@/lib/particulars";

// The table of principal particulars (.crew/sprint/39/contract.md; placement.md): the owner's
// scope and scale in his own words, quoted from the JPMorgan summary by lib/particulars.ts, as a
// lines plan carries them beside its title block. Server HTML and nothing focusable, laid out by
// app/globals.css ("The particulars"). Each dd is one text node: React writes `<!-- -->` between
// adjacent text children, which would split a phrase in the page's HTML.
export function Particulars() {
  const summary = profile.experience.find(
    (role) => role.company === PARTICULARS_COMPANY,
  )?.summary;
  const rows = summary ? particulars(summary) : null;
  if (!rows) return null;
  return (
    <dl data-particulars="" className="particulars">
      {rows.map(({ term, phrase }) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{phrase}</dd>
        </div>
      ))}
    </dl>
  );
}
