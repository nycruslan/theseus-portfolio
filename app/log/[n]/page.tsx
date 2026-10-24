import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Log } from "@/components/log";
import { profile } from "@/content/profile";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";

// A record per merged sprint, /log/<n> (.crew/sprint/29/b5-first-contract.md): the Log with that
// revision's record open. Every merged sprint is prerendered at build. Any other address, a closed
// sprint, one in progress, 0, 013 or a word, renders the site's not-found page: `dynamicParams`
// isn't available under cacheComponents, so the route's request-time fallback answers it.

/** The merged sprint whose number is exactly `n` written plainly, so /log/013 is not /log/13. */
function find(n: string) {
  // A number with no leading zero, before the sprint folders are read at all.
  if (!/^[1-9]\d*$/.test(n)) return undefined;
  const entries = readSprintLog();
  const entry = entries.find((candidate) => String(candidate.sprint) === n);
  return entry ? { entries, entry } : undefined;
}

export function generateStaticParams() {
  return readSprintLog().map((entry) => ({ n: String(entry.sprint) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/log/[n]">): Promise<Metadata> {
  const found = find((await params).n);
  // The page answers an unknown address with notFound(), and the not-found page brings its title.
  if (!found) return {};
  const { sprint, goal } = found.entry;
  const title = `Revision ${sprint} — Log — ${profile.name}`;
  const url = `/log/${sprint}`;
  return {
    title,
    description: goal,
    alternates: { canonical: url },
    // Whole objects, as on /log; the card comes from this segment's own opengraph-image.
    openGraph: { ...openGraph, type: "website", title, description: goal, url },
    twitter: { card: "summary_large_image", title, description: goal },
  };
}

export default async function Record({ params }: PageProps<"/log/[n]">) {
  const found = find((await params).n);
  if (!found) notFound();
  return <Log entries={found.entries} open={found.entry.sprint} />;
}
