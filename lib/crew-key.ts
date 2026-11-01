import { profile } from "@/content/profile";

// The key to the revision table (.crew/sprint/40/contract.md, "Data rules"): the names in it are AI
// agents, and what the two words under Approved mean, in a stranger's words. / and the Log both
// render this one string, so they can't disagree. It names the owner by his first name, as the
// page's h1 does, since a visitor doesn't know who "the owner" is (decisions.md, 3). One line at
// 1440, so the first screen keeps its contact links (decisions.md, 8).

const [first = profile.name] = profile.name.split(" ");

export const CREW_KEY = `Every name is an AI agent ${first} directs. Approved: Gate is CI, his rules and Lens's review; Owner is his own call.`;
