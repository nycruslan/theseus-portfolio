// Relative, not `@/`: lib/trials-card.ts draws the dare in Playwright's runner, which doesn't map
// tsconfig's paths, so every value import here is relative (.crew/sprint/64/selectors.md).
import { profile } from "../content/profile";

/** The owner's first name, as the dare calls him. */
const [FIRST_NAME = profile.name] = profile.name.split(" ");

/**
 * The trials' dare, written once so its four places can't drift (.crew/sprint/67/): /trials's
 * head and a window's card close it with a full stop; the doors into the trials on /crew and the
 * Log take it bare, so a visitor who follows one lands on the sentence they clicked.
 */
export const DARE = `Try to sink ${FIRST_NAME}'s contact links`;
