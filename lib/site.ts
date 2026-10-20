// Facts about the site itself, not the owner: where it lives, and the token colors for the places
// CSS can't reach (meta tags, the generated social card and icons).

/** The production URL. Social cards, the sitemap and canonical links point here. */
export const SITE_URL = "https://theseus-portfolio.vercel.app";

/** The team's repository, where every sprint's pull request lives. Not the owner's content. */
export const REPO_URL = "https://github.com/nycruslan/theseus-portfolio";

/**
 * Each scheme's token colors, the source for everything outside CSS: the address-bar colors, the
 * social card, /favicon.ico and app/icon.svg (an SVG file can't import them, so it repeats them).
 * app/globals.css declares the same tokens for the page. The e2e invariants check that the CSS
 * tokens and icon.svg match these in both schemes, so change them together.
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
  foreground: "#e1eae9",
  muted: "#96a9a6",
  accent: "#eb8a64",
  rule: "#2d4543",
} as const;
