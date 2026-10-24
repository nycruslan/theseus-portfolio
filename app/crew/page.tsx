import type { Metadata } from "next";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { CrewPanel } from "@/components/crew";
import { Foot } from "@/components/foot";
import { LinesPlan } from "@/components/lines-plan";
import { SkipLink } from "@/components/skip-link";
import { profile } from "@/content/profile";
import { readCrew } from "@/lib/crew-feed";
import { seatPlanks } from "@/lib/lines-plan";
import { openGraph } from "@/lib/metadata";
import { readSprintLog } from "@/lib/sprint-log";

const title = `Crew — ${profile.name}`;
// The shared description is the owner's bio; this page is the crew's, so it says what it is.
const description =
  "A crew of AI agents rebuilds this site in public. This page shows who is working on it now, and who approves the work.";

// Its own address, for search engines and link previews. Next replaces the layout's openGraph and
// twitter objects whole, so each says everything, and the card comes from this segment's own
// opengraph-image.
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/crew" },
  openGraph: {
    ...openGraph,
    type: "website",
    title,
    description,
    url: "/crew",
  },
  twitter: { card: "summary_large_image", title, description },
};

// The crew at work (.crew/sprint/31/contract.md; crew-1440.webp, crew-390.webp): the sheet's
// drawing at the left, seated from the retros as on /, and the panel at the right, told from the
// Studio's feed. Static, regenerated in the background as the feed's read expires
// (lib/crew-feed.ts), with no script of its own: no model and no motion control until B4d, so the
// bar has none either.
export default async function Crew() {
  // Read when the page is rendered, like /, so the two drawings and the record agree. Newest first.
  const entries = readSprintLog();
  const seats = seatPlanks(entries.map((entry) => entry.sprint).reverse());
  const crew = await readCrew();

  return (
    <>
      <SkipLink />
      <Bar at="crew" className={sofiaCondensed.variable} />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`crew-page ${sofiaCondensed.variable}`}
      >
        <LinesPlan seats={seats} />
        <Foot />
        <CrewPanel crew={crew} record={entries[0]} entries={entries} />
      </main>
    </>
  );
}
