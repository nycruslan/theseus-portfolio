import type { Metadata } from "next";
import { sofiaCondensed } from "@/app/fonts";
import { Bar } from "@/components/bar";
import { CrewLive } from "@/components/crew-live";
import { Foot } from "@/components/foot";
import { CrewPlan } from "@/components/lines-plan";
import { Model, MotionControl } from "@/components/model";
import { SkipLink } from "@/components/skip-link";
import { profile } from "@/content/profile";
import { readCrew } from "@/lib/crew-feed";
import { nextSeat, seatOf, seatPlanks } from "@/lib/lines-plan";
import { layerOf } from "@/lib/live-layer";
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

// The crew at work (.crew/sprint/31/contract.md; crew-1440.webp, crew-390.webp): the detail
// drawing at the left, close on the plank the crew is drawing now, seated from the retros as on /,
// with the card model over it, and the panel at the right, told from the Studio's feed
// (.crew/sprint/36/contract.md). Static, regenerated in the background as the feed's read expires
// (lib/crew-feed.ts); in the browser the panel and the drawing's tally then follow /api/crew
// (.crew/sprint/35/contract.md). The motion control is the one / and the Log carry, in the bar from
// 768 px and at the drawing's foot below it.
export default async function Crew() {
  // Read when the page is rendered, like /, so the drawing and the record agree. Newest first; the
  // planks are seated oldest first. The layer decides the pencil seat as on / (lib/live-layer.ts).
  const entries = readSprintLog();
  const merged = entries.map((entry) => entry.sprint).reverse();
  const seats = seatPlanks(merged);
  const crew = await readCrew();
  const layer = layerOf(crew, merged);
  const pencil = layer.state === "pencil" ? layer.pencil : null;
  const [record] = entries;
  // The detail's focus: the seat in pencil, or the newest retro's (contract, call 2).
  const focus =
    pencil?.seat ?? (record && seatOf(merged, record.sprint)) ?? nextSeat(0);
  // One tick per moment the panel lists, in pencil alone (call 1).
  const marks = pencil && crew.state !== "down" ? crew.run.moments.length : 0;
  // Only what the panel shows from the retros: the browser gets these, not the reader or profile.
  const facts = {
    owner: profile.name,
    record: record
      ? { sprint: record.sprint, goal: record.goal, pr: record.pr ?? null }
      : null,
    retros: entries.map(({ sprint, ownersCall }) => ({ sprint, ownersCall })),
  };

  return (
    <>
      <SkipLink />
      <Bar
        at="crew"
        className={sofiaCondensed.variable}
        control={<MotionControl />}
      />
      {/* tabIndex -1: the skip link's landing spot, never a Tab stop. */}
      <main
        id="main"
        tabIndex={-1}
        className={`crew-page ${sofiaCondensed.variable}`}
      >
        {/* The drawing and the model's layer, which follows it (app/globals.css keys on that), in
          one box: from 1024 px it sticks under the bar while the panel scrolls, and a sticky box
          is a stacking context, so the drawing's numbers and the canvas must share it to paint
          in order. */}
        <div className="crew-drawing">
          <CrewPlan seats={seats} focus={focus} pencil={pencil} marks={marks} />
          <Model seated={[...seats.keys()]} />
        </div>
        <Foot control={<MotionControl />} />
        <CrewLive
          crew={crew}
          facts={facts}
          drawn={
            pencil
              ? {
                  sprint: pencil.sprint,
                  holder: seats.get(pencil.seat) ?? null,
                }
              : null
          }
        />
      </main>
    </>
  );
}
