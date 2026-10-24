import type { Metadata } from "next";
import { Log } from "@/components/log";
import { profile } from "@/content/profile";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";

const title = `Log — ${profile.name}`;
// The shared description is the owner's bio; this page is the crew's, so it says what it is.
const description =
  "A crew of AI agents rebuilds this site one sprint at a time. The Log keeps every revision: who drew, checked, tested and approved it, and what went wrong.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/log" },
  // Next replaces the layout's openGraph and twitter objects whole, so each says everything, and
  // the card comes from this segment's own opengraph-image.
  openGraph: { ...openGraph, type: "website", title, description, url: "/log" },
  twitter: { card: "summary_large_image", title, description },
};

export default function LogPage() {
  // Read at build time (the route is static): the deployed site never touches .crew.
  return <Log entries={readSprintLog()} />;
}
