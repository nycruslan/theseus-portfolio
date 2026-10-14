import type { Metadata } from "next";
import { profile } from "@/content/profile";

// Metadata the layout and the home page share. Next merges a page's metadata over its layout's one
// key at a time, so a page that sets `openGraph` replaces the layout's whole object: the page spreads
// this one and adds what belongs to it alone, such as its URL.

export const title = `${profile.name} — ${profile.headline}`;

export const openGraph = {
  type: "profile",
  title,
  description: profile.bio,
  siteName: profile.name,
  locale: "en_US",
} satisfies Metadata["openGraph"];
