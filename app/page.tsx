import type { Metadata } from "next";
import { Sheet } from "@/components/sheet";
import { readCrew } from "@/lib/crew-feed";
import { layerOf } from "@/lib/live-layer";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";

// This page's own address, for search engines and link previews (see app/layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraph, url: "/" },
};

export default async function Home() {
  // Read when the page is rendered, like the Log and /crew, so the sheet and the Log agree. Newest
  // first. The crew's state is the feed's cached read, the one /crew makes: the page stays static
  // and regenerates in the background as the read expires (lib/crew-feed.ts), with no script.
  const entries = readSprintLog();
  const merged = entries.map((entry) => entry.sprint).reverse();
  const layer = layerOf(await readCrew(), merged);
  return <Sheet entries={entries} layer={layer} />;
}
