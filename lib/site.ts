// Facts about the site itself, not the owner: where it lives, and the token colors for the places
// CSS can't reach (meta tags, the generated social card and icons).

/** The production URL. Social cards, the sitemap and canonical links point here. */
export const SITE_URL = "https://ruslanshulga.com";

/** The Studio: the separate app where anyone can watch the crew build this site, live. */
export const STUDIO_URL = "https://studio.ruslanshulga.com";

/** The team's repository, where every sprint's pull request lives. Not the owner's content. */
export const REPO_URL = "https://github.com/nycruslan/theseus-portfolio";

/**
 * Each scheme's token colors, the source for everything outside CSS: the address-bar colors, the
 * social card, /favicon.ico and app/icon.svg (an SVG file can't import them, so it repeats them).
 * app/globals.css declares the same tokens for the page. The e2e invariants check that the CSS
 * tokens and icon.svg match these in both schemes, so change them together.
 */
export const LIGHT = {
  background: "#eaf1ee",
  foreground: "#111c22",
  muted: "#555c61",
  accent: "#9e441d",
  rule: "#bfcac7",
} as const;

export const DARK = {
  background: "#10191c",
  foreground: "#e2eae9",
  muted: "#a3adb1",
  accent: "#ee8f63",
  rule: "#323d40",
} as const;
