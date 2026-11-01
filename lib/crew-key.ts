import { profile } from "@/content/profile";

// The key to the revision table (.crew/sprint/40/contract.md, "Data rules"): the names in it are AI
// agents, and what the two words under Approved mean, in a stranger's words. / and the Log render
// both parts, and /crew the first where its job column folds, so the three can't disagree. It names
// the owner by his first name, as the page's h1 does, since a visitor doesn't know who "the owner"
// is (decisions.md, 3). One line at 1440, so the first screen keeps its contact links
// (decisions.md, 8).

const [first = profile.name] = profile.name.split(" ");

/** The key's first sentence: who the names are. /crew repeats it where its job column folds. */
export const CREW_WHO = `Every name is an AI agent ${first} directs.`;

/** The rest: what the two words under Approved mean. */
export const CREW_APPROVED =
  "Approved: Gate is CI, his rules and Lens's review; Owner is his own call.";
