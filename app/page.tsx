import type { Metadata } from "next";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { Facts } from "@/components/facts";
import { LinesPlan } from "@/components/lines-plan";
import { Model } from "@/components/model";
import { Revisions } from "@/components/revisions";
import { SkipLink } from "@/components/skip-link";
import { TitleBlock } from "@/components/title-block";
import { profile } from "@/content/profile";
import { splitBio } from "@/lib/bio";
import { PLANKS } from "@/lib/hull-layouts";
import { seatPlanks } from "@/lib/lines-plan";
import { openGraph } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { readSprintLog } from "@/lib/sprint-log";

// This page's own address, for search engines and link previews (see app/layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...openGraph, url: "/" },
};

// Who this page is about, for search engines: the owner's facts from content/profile.ts as they
// appear on the page, and nothing more.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.headline,
  description: profile.bio,
  url: SITE_URL,
  sameAs: profile.links.map((link) => link.href),
};

export default function Home() {
  // Read when the site is built, like the log page itself, so the sheet and the Log agree. Newest
  // first; the planks are seated oldest first.
  const entries = readSprintLog();
  const seats = seatPlanks(entries.map((entry) => entry.sprint).reverse());
  const replaced = Math.min(entries.length, PLANKS.length);

  return (
    <>
      <SkipLink />
      <Bar className={sofiaCondensed.variable} />
      {/* The sheet (.crew/sprint/22/contract.md): the drawing, then the title block and the revision
        block side by side from 1024 px inside a frame 16 px in, stacked below it with the title
        block first. The title block leads in the DOM at every width, so the name is read first. The
        facts follow below the sheet. tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)] lg:px-4 ${sofiaCondensed.variable}`}
      >
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be the script's raw text (React would escape it as HTML), and escaping "<" keeps the data from closing the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(person).replace(/</g, "\\u003c"),
          }}
        />
        <LinesPlan
          seats={seats}
          className="lg:col-span-2 lg:border-x lg:border-foreground"
        />
        <Model seated={[...seats.keys()]} />
        <TitleBlock className="lg:col-start-2 lg:row-start-2" />
        <Revisions
          entries={entries}
          caption={splitBio(profile.bio).rest}
          planks={PLANKS.length}
          replaced={replaced}
          className="lg:col-start-1 lg:row-start-2"
        />

        {/* The facts below the sheet, edge to edge inside its frame, 40 px of film under it from
          1024 px (components/facts.tsx). */}
        <Facts className="lg:col-span-2 lg:mt-10" />
      </main>
    </>
  );
}
