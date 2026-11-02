// The crew's links, in a module of their own (Lens's nit on #110): the panel (components/crew.tsx),
// which the browser renders too, and the keel (components/keel.tsx), which only the server does,
// both use them without the keel importing the panel.

/** A link of its own: ink, underlined, a target 44 px tall below 1024 and 24 from it (app/globals.css, ".crew-link"). */
export const LINK =
  "crew-link text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";

/**
 * A link inside a sentence, which must keep the sentence's lines (.crew/sprint/48/contract.md, K9
 * and K10): LINK's ink and underline without `.crew-link`'s box, whose inline-flex would make it
 * unbreakable and its 44 px line-tall. 4 px of padding above and below, which an inline box paints
 * and hit-tests but doesn't lay out, make it a 24 px target (B2.9), as the pencil row's goal link is.
 * It never splits across lines (Iris), so it stays one target with one ring at every width.
 */
export const INLINE_LINK =
  "whitespace-nowrap py-1 text-foreground underline decoration-1 underline-offset-[3px] hover:decoration-2";
