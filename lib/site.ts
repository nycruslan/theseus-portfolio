// Facts about the site itself, not the owner: where it lives, and the token colors for the places
// CSS can't reach (meta tags, the generated social image and icon).

/** The production URL. Social cards, the sitemap and canonical links point here. */
export const SITE_URL = "https://theseus-portfolio.vercel.app";

/**
 * Each scheme's colors, repeated from the tokens in app/globals.css because meta tags and generated
 * images can't read CSS variables. Change them together; the e2e invariants check that the
 * address-bar color still matches each scheme's --background.
 */
export const LIGHT = {
  background: "#e6f3f1",
  foreground: "#0f2220",
  muted: "#455e5a",
  accent: "#944126",
  rule: "#c5d5d2",
} as const;

export const DARK = {
  background: "#091413",
} as const;
