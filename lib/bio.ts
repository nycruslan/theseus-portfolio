import { sentences } from "@/lib/sentences";

/**
 * The owner's bio in two places on the sheet (.crew/sprint/22/contract.md, B1.2): split into its
 * sentences (lib/sentences.ts), its first two lead the title block and the rest is the revision
 * block's caption. The words stay the owner's; a bio of two sentences or fewer leaves the caption
 * empty.
 */
export function splitBio(bio: string) {
  const parts = sentences(bio);
  return { lead: parts.slice(0, 2).join(" "), rest: parts.slice(2).join(" ") };
}
