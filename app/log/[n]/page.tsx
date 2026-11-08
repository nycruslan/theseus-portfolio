import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Log } from "@/components/log";
import { profile } from "@/content/profile";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";
import { STEP_CARD, stepCard } from "@/lib/step-card";

// A record per merged sprint, /log/<n> (.crew/sprint/29/b5-first-contract.md): the Log with that
// revision's record open. Every merged sprint is prerendered at build. Any other address, a closed
// sprint, one in progress, 0, 013 or a word, answers 404 with the site's not-found page:
// `dynamicParams` isn't available under cacheComponents, so the route's request-time fallback
// calls notFound(). Next 16.4 sends a page's notFound() as its error shell, an empty body whose
// not-found page the browser draws from the flight data, so without scripts that page is blank
// (.crew/sprint/30/); only an address no route matches gets it server-rendered.

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
  // So an unknown address takes the not-found page's title, not the site's.
  if (!found) notFound();
  const { sprint, goal } = found.entry;
  const url = `/log/${sprint}`;
  // The step's own card and its words (lib/step-card.ts). Next names a segment's card file with
  // the file's one `alt`, so the step names its card here, with its own: Next then leaves the
  // file's tags out, and twitter takes the image and its alt from openGraph.
  const card = stepCard(found.entries, sprint);
  const image = { url: `${url}/opengraph-image`, alt: card.alt, ...STEP_CARD };
  return {
    title: `Revision ${sprint} — Log — ${profile.name}`,
    description: goal,
    alternates: { canonical: url },
    // Whole objects, as on /log.
    openGraph: {
      ...openGraph,
      type: "website",
      title: card.title,
      description: goal,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: card.title,
      description: goal,
    },
  };
}

export default async function Record({ params }: PageProps<"/log/[n]">) {
  const found = find((await params).n);
  if (!found) notFound();
  return <Log entries={found.entries} open={found.entry.sprint} />;
}
