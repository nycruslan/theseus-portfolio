import type { Metadata } from "next";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { Facts } from "@/components/facts";
import { Foot } from "@/components/foot";
import { LinesPlan } from "@/components/lines-plan";
import { Model, MotionControl } from "@/components/model";
import { Particulars } from "@/components/particulars";
import { Revisions } from "@/components/revisions";
import { SkipLink } from "@/components/skip-link";
import { TitleBlock } from "@/components/title-block";
import { profile } from "@/content/profile";
import { splitBio } from "@/lib/bio";
import { readCrew } from "@/lib/crew-feed";
import { PLANKS } from "@/lib/hull-layouts";
import { seatPlanks } from "@/lib/lines-plan";
import { layerOf } from "@/lib/live-layer";
import { openGraph } from "@/lib/metadata";
import { OWNER_EMAIL } from "@/lib/portfolio";
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
  email: OWNER_EMAIL,
  sameAs: profile.links
    .map((link) => link.href)
    .filter((href) => !href.startsWith("mailto:")),
};

export default async function Home() {
  // Read when the page is rendered, like the Log and /crew, so the sheet and the Log agree. Newest
  // first; the planks are seated oldest first. The crew's state is the feed's cached read, the one
  // /crew makes: the page stays static and regenerates in the background as the read expires
  // (lib/crew-feed.ts), with no script. The layer decides only pencil, copper and the rest line.
  const entries = readSprintLog();
  const merged = entries.map((entry) => entry.sprint).reverse();
  const seats = seatPlanks(merged);
  const replaced = Math.min(entries.length, PLANKS.length);
  const layer = layerOf(await readCrew(), merged);
  const pencil = layer.state === "pencil" ? layer.pencil : null;

  return (
    <>
      <SkipLink />
      <Bar className={sofiaCondensed.variable} control={<MotionControl />} />
      {/* The sheet (.crew/sprint/22/contract.md): the drawing, then the title block and the revision
        block side by side from 1024 px inside a frame 16 px in, stacked below it with the title
        block first. The title block leads in the DOM at every width, so the name is read first, then
        the particulars. The facts follow below the sheet. tabIndex -1: the skip link's landing spot, never a Tab stop. */}
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
        {/* Placed on both axes: from 1280 px the particulars take row 1 too, and a drawing placed
          by span alone would be moved into new implicit columns (.crew/sprint/39/placement.md). */}
        <LinesPlan
          seats={seats}
          pencil={pencil}
          className="lg:col-[1/-1] lg:row-start-1 lg:border-x lg:border-foreground"
        />
        <Model seated={[...seats.keys()]} />
        {/* Below 768 px Read as page and the motion control sit here, at the drawing's foot: after
          the model, whose adjacency to the drawing app/globals.css keys the planks on, and before
          the title block. */}
        <Foot control={<MotionControl />} />
        <TitleBlock className="lg:col-start-2 lg:row-start-2" />
        {/* After the title block, so it is read after the name, the role and the bio: below it
          under 1024 px, a strip row of the frame to 1279, and the drawing's empty corner from 1280
          (app/globals.css, "The particulars"). Never between the drawing and the model. */}
        <Particulars />
        <Revisions
          entries={entries}
          caption={splitBio(profile.bio).rest}
          planks={PLANKS.length}
          replaced={replaced}
          pencil={pencil}
          rest={layer.state === "resting" ? layer.run : null}
          className="lg:col-start-1 lg:row-start-2"
        />

        {/* The facts below the sheet, edge to edge inside its frame, 40 px of film under it from
          1024 px (components/facts.tsx). */}
        <Facts className="lg:col-span-2 lg:mt-10" />
      </main>
    </>
  );
}
