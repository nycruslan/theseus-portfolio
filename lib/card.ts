import type { Profile } from "@/content/profile";
// Relative, not `@/`: the e2e checks load this module in Playwright's runner, which doesn't map
// tsconfig's paths, so what it loads at run time (these two, and what they import) is relative.
import { PARTICULARS_COMPANY, particulars } from "./particulars";
import { sentences } from "./sentences";

/**
 * Every font file the social card loads (app/opengraph-image.tsx), as paths from the project's
 * root: Sofia Sans regular and bold, the site's text face, then Sofia Sans Extra Condensed bold,
 * the display face the name is set in on / (.crew/sprint/41/review-iris.md, must 1). Static TTFs,
 * since satori reads TTF, OTF or WOFF and not the site's woff2, from Google Fonts (Sofia Sans v20,
 * Extra Condensed v6), under the SIL Open Font License beside them (assets/fonts/OFL.txt, the
 * Sofia Sans Project's for both widths). Read at build only, so they add no bytes to any page.
 */
export const CARD_FONTS = [
  "assets/fonts/SofiaSans-Regular.ttf",
  "assets/fonts/SofiaSans-Bold.ttf",
  "assets/fonts/SofiaSansExtraCondensed-Bold.ttf",
] as const;

type CardRow = { term: string; phrase: string };

type CardText = { name: string; lead: string; rows: CardRow[] };

/**
 * What the card says, all of it the owner's (.crew/sprint/41/contract.md, data rules): his name,
 * the bio's first sentence by the sheet's rule (lib/sentences.ts), and the particulars the sheet
 * quotes from the JPMorgan summary, in their order (lib/particulars.ts), or no rows when the
 * summary no longer holds them. Plain data, so a check can read it outside Next.
 */
export function cardText(profile: Profile): CardText {
  const summary = profile.experience.find(
    (role) => role.company === PARTICULARS_COMPANY,
  )?.summary;
  return {
    name: profile.name,
    lead: sentences(profile.bio)[0] ?? "",
    rows: (summary ? particulars(summary) : null) ?? [],
  };
}
